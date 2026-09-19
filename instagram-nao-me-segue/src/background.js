/**
 * Service worker: orquestra a varredura e mantém o estado em chrome.storage,
 * para que o progresso sobreviva ao fechamento do popup.
 */

const STATE_KEY = 'scanState';

const ESTADO_INICIAL = {
  running: false,
  phase: 'ocioso',
  counts: { followers: 0, following: 0 },
  target: null,
  error: null,
  esperandoAte: null,
  tabId: null,
  startedAt: null,
  finishedAt: null,
  ultimoProgresso: null,
  options: null,
  retomadas: 0,
};

// Vigia: sem sinal de vida por este tempo, a coleta é considerada morta.
const SEM_SINAL_MS = 45000;
// Teto absoluto sem nenhum avanço, mesmo com o script respondendo.
const TRAVADO_MS = 5 * 60 * 1000;
const MAX_RETOMADAS = 3;

async function getState() {
  const { [STATE_KEY]: s } = await chrome.storage.local.get(STATE_KEY);
  return { ...ESTADO_INICIAL, ...(s || {}) };
}

async function setState(patch) {
  const state = { ...(await getState()), ...patch };
  await chrome.storage.local.set({ [STATE_KEY]: state });
  chrome.runtime.sendMessage({ type: 'UI_STATE', state }).catch(() => {});
  return state;
}

/** Acha uma aba do Instagram já aberta ou abre uma nova e espera carregar. */
async function ensureInstagramTab() {
  const abas = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
  const pronta = abas.find((t) => t.status === 'complete') || abas[0];
  if (pronta) {
    if (pronta.status !== 'complete') await esperarCarregar(pronta.id);
    return pronta;
  }
  const nova = await chrome.tabs.create({ url: 'https://www.instagram.com/', active: false });
  await esperarCarregar(nova.id);
  return nova;
}

function esperarCarregar(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const limite = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(ouvinte);
      reject(new Error('A aba do Instagram demorou demais para carregar.'));
    }, timeout);

    function ouvinte(id, info) {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(limite);
        chrome.tabs.onUpdated.removeListener(ouvinte);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(ouvinte);

    chrome.tabs.get(tabId).then((t) => {
      if (t && t.status === 'complete') {
        clearTimeout(limite);
        chrome.tabs.onUpdated.removeListener(ouvinte);
        resolve();
      }
    }).catch(() => {});
  });
}

async function startScan(options = {}) {
  const aba = await ensureInstagramTab();

  await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['src/content.js'] });

  await chrome.storage.local.remove('scanProgress'); // análise nova começa limpa

  await setState({
    running: true,
    phase: 'resolvendo',
    counts: { followers: 0, following: 0 },
    target: null,
    error: null,
    esperandoAte: null,
    tabId: aba.id,
    startedAt: Date.now(),
    finishedAt: null,
    ultimoProgresso: Date.now(),
    options,
    retomadas: 0,
  });

  chrome.alarms.create('vigia', { periodInMinutes: 0.5 });

  const resposta = await chrome.tabs.sendMessage(aba.id, { type: 'RUN_SCAN', options });
  if (resposta && resposta.ok === false) {
    await setState({ running: false, phase: 'erro', error: { code: resposta.error, message: 'Já existe uma varredura em andamento nesta aba.' } });
  }
  return { ok: true, tabId: aba.id };
}

async function cancelScan() {
  const { tabId } = await getState();
  if (tabId != null) {
    await chrome.tabs.sendMessage(tabId, { type: 'CANCEL' }).catch(() => {});
  }
  await setState({ running: false, phase: 'cancelado', esperandoAte: null });
  return { ok: true };
}

/** Roda as checagens de diagnóstico e devolve uma lista de linhas ok/falha. */
async function diagnosticar() {
  const linhas = [];
  const add = (ok, texto) => linhas.push({ ok, texto });

  add(true, 'Extensão carregada (versão ' + chrome.runtime.getManifest().version + ')');

  let abas;
  try {
    abas = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
  } catch (e) {
    add(false, 'Não consegui listar as abas: ' + (e.message || e));
    return linhas;
  }

  add(abas.length > 0, abas.length ? 'Aba do Instagram aberta' : 'Nenhuma aba do instagram.com aberta — abra o site e tente de novo');
  const aba = abas.find((t) => t.status === 'complete') || abas[0];
  if (!aba) return linhas;

  try {
    await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['src/content.js'] });
    add(true, 'Script injetado na aba do Instagram');
  } catch (e) {
    add(false, 'Não consegui injetar o script: ' + (e.message || e));
    return linhas;
  }

  try {
    const r = await chrome.tabs.sendMessage(aba.id, { type: 'DIAGNOSTICO' });
    for (const l of (r && r.linhas) || []) add(l.ok, l.texto);
  } catch (e) {
    add(false, 'O script não respondeu: ' + (e.message || e));
  }
  return linhas;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;

  switch (msg.type) {
    case 'GET_STATE':
      getState().then((state) => sendResponse({ ok: true, state }));
      return true;

    case 'START_SCAN':
      startScan(msg.options || {}).then(
        (r) => sendResponse(r),
        async (e) => {
          await setState({ running: false, phase: 'erro', error: { code: 'FALHA_INICIO', message: e.message || String(e) } });
          sendResponse({ ok: false, error: e.message || String(e) });
        }
      );
      return true;

    case 'CANCEL_SCAN':
      cancelScan().then(sendResponse);
      return true;

    case 'DEIXAR_DE_SEGUIR':
    case 'SEGUIR_DE_NOVO':
      (async () => {
        const abas = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
        const aba = abas.find((t) => t.status === 'complete') || abas[0];
        if (!aba) return { ok: false, erro: 'Abra o instagram.com em uma aba e tente de novo.' };
        await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['src/content.js'] });
        return await chrome.tabs.sendMessage(aba.id, { type: msg.type, userId: msg.userId });
      })().then(sendResponse, (e) => sendResponse({ ok: false, erro: (e && e.message) || String(e) }));
      return true;

    case 'DIAGNOSTICO':
      diagnosticar().then(
        (linhas) => sendResponse({ ok: true, linhas }),
        (e) => sendResponse({ ok: false, linhas: [{ ok: false, texto: 'Falha no diagnóstico: ' + (e.message || e) }] })
      );
      return true;

    // Vindas do content script
    case 'SCAN_PROGRESS':
      setState({ running: true, esperandoAte: null, ultimoProgresso: Date.now(), ...(msg.patch || {}) });
      return;

    case 'SCAN_DONE':
      chrome.alarms.clear('vigia');
      setState({ running: false, phase: 'concluido', esperandoAte: null, finishedAt: Date.now(), counts: msg.counts || undefined });
      atualizarBadge();
      return;

    case 'SCAN_CANCELLED':
      chrome.alarms.clear('vigia');
      setState({ running: false, phase: 'cancelado', esperandoAte: null });
      return;

    case 'SCAN_ERROR':
      chrome.alarms.clear('vigia');
      setState({ running: false, phase: 'erro', esperandoAte: null, error: { code: msg.code, message: msg.message } });
      return;

    case 'IMPORT_DONE':
      setState({
        running: false,
        phase: 'concluido',
        error: null,
        esperandoAte: null,
        finishedAt: Date.now(),
        target: msg.target || null,
        counts: msg.counts || { followers: 0, following: 0 },
      });
      atualizarBadge();
      return;

    default:
      return;
  }
});

/**
 * Vigia da coleta: garante que ela sempre termina — concluindo, retomando
 * sozinha quando a aba morre no meio, ou falhando com um motivo na tela.
 * Nunca deixa a extensão "analisando" para sempre.
 */
async function vigiar() {
  const s = await getState();
  if (!s.running) {
    await chrome.alarms.clear('vigia');
    return;
  }

  // Pausa pedida pelo próprio Instagram (429) não é travamento.
  if (s.esperandoAte && s.esperandoAte > Date.now()) return;

  const parado = Date.now() - (s.ultimoProgresso || s.startedAt || Date.now());
  if (parado < SEM_SINAL_MS) return;

  let vivo = false;
  try {
    const r = await chrome.tabs.sendMessage(s.tabId, { type: 'PING' });
    vivo = !!(r && r.running);
  } catch {
    vivo = false;
  }

  if (vivo) {
    if (parado > TRAVADO_MS) {
      await encerrarComErro('SEM_RESPOSTA', 'O Instagram parou de responder no meio da análise.');
    }
    return;
  }

  // O script morreu (aba recarregada, navegada ou descartada): retoma.
  if ((s.retomadas || 0) >= MAX_RETOMADAS) {
    await encerrarComErro(
      'INTERROMPIDA',
      'A análise foi interrompida várias vezes porque a aba do Instagram recarregou.'
    );
    return;
  }

  await setState({ retomadas: (s.retomadas || 0) + 1, ultimoProgresso: Date.now() });

  // Duas tentativas: uma aba recém-criada às vezes ainda não aceita injeção.
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const aba = await ensureInstagramTab();
      await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['src/content.js'] });
      await chrome.tabs.sendMessage(aba.id, { type: 'RUN_SCAN', options: { ...(s.options || {}), retomar: true } });
      await setState({ tabId: aba.id });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  await encerrarComErro(
    'ABA_PERDIDA',
    'Perdi a aba do Instagram no meio da análise. Abra o instagram.com e clique em Analisar de novo — a leitura continua de onde parou.'
  );
}

async function encerrarComErro(code, message) {
  await chrome.alarms.clear('vigia');
  await setState({ running: false, phase: 'erro', esperandoAte: null, error: { code, message } });
}

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'vigia') vigiar();
});

/**
 * Mostra no ícone quantas contas não te seguem de volta, para o resultado
 * chegar sem a pessoa precisar ficar de olho na janelinha.
 */
async function atualizarBadge() {
  try {
    const { lastResult } = await chrome.storage.local.get('lastResult');
    if (!lastResult || !Array.isArray(lastResult.followers)) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }
    const seguidores = new Set(lastResult.followers.map((u) => String(u.username).toLowerCase()));
    const n = lastResult.following.filter((u) => !seguidores.has(String(u.username).toLowerCase())).length;
    await chrome.action.setBadgeBackgroundColor({ color: '#4f46e5' });
    await chrome.action.setBadgeText({ text: n > 999 ? '999+' : String(n) });
  } catch {
    /* badge é só conveniência: falhar aqui não pode quebrar a coleta */
  }
}

// A aba que coletava foi fechada: segue em outra, do ponto onde parou.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getState();
  if (state.running && state.tabId === tabId) {
    await setState({ ultimoProgresso: Date.now() - SEM_SINAL_MS - 1 });
    await vigiar();
  }
});

// A aba recarregou durante a coleta: o script morreu junto, então retoma sem
// esperar o próximo alarme.
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return;
  const state = await getState();
  if (state.running && state.tabId === tabId) {
    await setState({ ultimoProgresso: Date.now() - SEM_SINAL_MS - 1 });
    await vigiar();
  }
});

// Qualquer caminho que grave um resultado (coleta ou importação) reflete no ícone.
chrome.storage.onChanged.addListener((mudancas, area) => {
  if (area === 'local' && mudancas.lastResult) atualizarBadge();
});

// Ao iniciar o service worker, reflete o último resultado no ícone.
atualizarBadge();
