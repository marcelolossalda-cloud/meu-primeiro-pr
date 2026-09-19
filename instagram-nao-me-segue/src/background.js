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

// O Instagram fecha a porta por um tempo quando julga que houve leitura demais.
// Não é erro: é espera. A análise pausa, guarda o que já tem e volta sozinha.
const ERROS_DE_PAUSA = new Set([
  'RATE_LIMIT', 'RESPOSTA_INVALIDA', 'LISTAS_VAZIAS', 'SEM_ESTRATEGIA', 'IG_FAIL',
  'CONFERENCIA_FALHOU', 'SEM_RESPOSTA', 'FORMATO_INESPERADO',
]);
const ESPERAS_RETOMADA = [3, 8, 15, 30, 30, 45, 60, 60]; // minutos
const MAX_PAUSAS = ESPERAS_RETOMADA.length;

async function getState() {
  const { [STATE_KEY]: s } = await chrome.storage.local.get(STATE_KEY);
  return { ...ESTADO_INICIAL, ...(s || {}) };
}

// Gravações de estado são serializadas: sem fila, um SCAN_PROGRESS atrasado lê
// o estado velho e regrava running:true por cima de um SCAN_DONE já aplicado,
// deixando a extensão "analisando" para sempre.
let filaEstado = Promise.resolve();

function setState(patch) {
  filaEstado = filaEstado.then(async () => {
    const atual = await getState();

    // Progresso que chega depois do fim não reabre a análise.
    if (patch.running === true && !atual.running && atual.finishedAt) return atual;

    const state = { ...atual, ...patch };
    await chrome.storage.local.set({ [STATE_KEY]: state });
    chrome.runtime.sendMessage({ type: 'UI_STATE', state }).catch(() => {});
    return state;
  });
  return filaEstado;
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
    pausas: 0,
    retomaEm: null,
  });

  chrome.alarms.create('vigia', { periodInMinutes: 0.5 });

  const resposta = await chrome.tabs.sendMessage(aba.id, { type: 'RUN_SCAN', options });
  if (resposta && resposta.ok === false) {
    await setState({ running: false, phase: 'erro', error: { code: resposta.error, message: 'Já existe uma varredura em andamento nesta aba.' } });
  }
  return { ok: true, tabId: aba.id };
}

async function cancelScan() {
  await chrome.alarms.clear('retomar');
  await chrome.alarms.clear('vigia');
  const { tabId } = await getState();
  if (tabId != null) {
    await chrome.tabs.sendMessage(tabId, { type: 'CANCEL' }).catch(() => {});
  }
  await setState({
    running: false,
    phase: 'cancelado',
    esperandoAte: null,
    retomaEm: null,
    finishedAt: Date.now(), // impede que progresso em voo reabra a análise
  });
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

  // Relatos de coleta só são aceitos da aba que está coletando.
  const DA_COLETA = new Set(['SCAN_PROGRESS', 'SCAN_DONE', 'SCAN_ERROR', 'SCAN_CANCELLED']);
  if (DA_COLETA.has(msg.type) && sender && sender.tab) {
    getState().then((s) => {
      if (s.tabId == null || s.tabId === sender.tab.id) despachar(msg);
    });
    return;
  }

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

    case 'RETOMAR_AGORA':
      chrome.alarms.clear('retomar').then(() => retomarPausa()).then(
        () => sendResponse({ ok: true }),
        (e) => sendResponse({ ok: false, erro: (e && e.message) || String(e) })
      );
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

    case 'LER_PELA_TELA_COMPLETO':
      lerPelaTelaCompleto(msg.username).then(sendResponse, (e) =>
        sendResponse({ ok: false, erro: (e && e.message) || String(e) })
      );
      return true;

    case 'DIAGNOSTICO':
      diagnosticar().then(
        (linhas) => sendResponse({ ok: true, linhas }),
        (e) => sendResponse({ ok: false, linhas: [{ ok: false, texto: 'Falha no diagnóstico: ' + (e.message || e) }] })
      );
      return true;

    default:
      return;
  }
});

/** Mensagens vindas da aba que está coletando. */
function despachar(msg) {
  switch (msg.type) {
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
      tratarErro(msg);
      return;

    default:
      return;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;
  switch (msg.type) {
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
 * Le as duas listas pela propria interface do Instagram, abrindo a janela de
 * seguidores e a de seguindo e rolando cada uma. Nao usa API: e o caminho que
 * funciona quando o Instagram fecha a API para a conta.
 */
async function lerPelaTelaCompleto(username) {
  const alvo = String(username || '').replace(/^@/, '').trim();
  if (!alvo) return { ok: false, erro: 'Preciso do seu nome de usuário para abrir as listas.' };

  const ler = async (secao) => {
    const abas = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
    let aba = abas.find((t) => t.status === 'complete') || abas[0];
    const url = `https://www.instagram.com/${alvo}/${secao}/`;

    if (aba) await chrome.tabs.update(aba.id, { url, active: true });
    else aba = await chrome.tabs.create({ url, active: true });

    await esperarCarregar(aba.id, 45000);
    await new Promise((r) => setTimeout(r, 3500)); // a janela leva um tempo para montar

    await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['src/content.js'] });
    const r = await chrome.tabs.sendMessage(aba.id, { type: 'LER_PELA_TELA', esperado: 0 });
    if (!r || !r.ok) throw new Error((r && r.erro) || 'Não consegui ler a janela de ' + secao);
    return r.lista || [];
  };

  await setState({ running: true, phase: 'tela', esperandoAte: null, error: null, startedAt: Date.now() });

  try {
    const following = await ler('following');
    await setState({ phase: 'tela', counts: { followers: 0, following: following.length } });

    const followers = await ler('followers');

    const resultado = {
      version: 1,
      source: 'tela',
      target: { id: '', username: alvo, full_name: '', pic: '' },
      scannedAt: Date.now(),
      followers,
      following,
      parcial: false,
      verificado: true,
      fonte: 'tela',
      seguidoresCompletos: true,
      semSeguidores: followers.length === 0,
      souEu: true,
      oficial: { seguidores: followers.length, seguindo: following.length },
    };

    await chrome.storage.local.set({ lastResult: resultado });
    await setState({
      running: false, phase: 'concluido', finishedAt: Date.now(),
      counts: { followers: followers.length, following: following.length },
    });
    atualizarBadge();
    return { ok: true, followers: followers.length, following: following.length };
  } catch (e) {
    await setState({
      running: false, phase: 'erro',
      error: { code: 'TELA_FALHOU', message: (e && e.message) || String(e) },
    });
    return { ok: false, erro: (e && e.message) || String(e) };
  }
}

/**
 * Vigia da coleta: garante que ela sempre termina — concluindo, retomando
 * sozinha quando a aba morre no meio, ou falhando com um motivo na tela.
 * Nunca deixa a extensão "analisando" para sempre.
 */
let vigiaOcupado = false;

async function vigiar() {
  if (vigiaOcupado) return; // alarme, onRemoved e onUpdated podem coincidir
  vigiaOcupado = true;
  try {
    await vigiarInterno();
  } finally {
    vigiaOcupado = false;
  }
}

async function vigiarInterno() {
  const s = await getState();
  if (!s.running || s.phase === 'pausado') {
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

/**
 * Erro que na verdade é uma porta fechada por tempo determinado vira pausa com
 * retomada agendada, em vez de jogar fora o que já foi lido.
 */
async function tratarErro(msg) {
  const s = await getState();
  const pausas = s.pausas || 0;

  if (ERROS_DE_PAUSA.has(msg.code) && pausas < MAX_PAUSAS) {
    const minutos = ESPERAS_RETOMADA[pausas];
    const retomaEm = Date.now() + minutos * 60 * 1000;

    await chrome.alarms.clear('vigia');
    await chrome.alarms.create('retomar', { when: retomaEm });
    await setState({
      running: true,
      phase: 'pausado',
      esperandoAte: null,
      retomaEm,
      pausas: pausas + 1,
      ultimoProgresso: Date.now(),
      error: { code: msg.code, message: msg.message },
    });
    return;
  }

  await chrome.alarms.clear('vigia');
  await chrome.alarms.clear('retomar');
  await setState({
    running: false,
    phase: 'erro',
    esperandoAte: null,
    retomaEm: null,
    error: { code: msg.code, message: msg.message },
  });
}

/** Volta do ponto onde parou, usando o progresso guardado. */
async function retomarPausa() {
  const s = await getState();
  if (!s.running || s.phase !== 'pausado') return;

  try {
    const aba = await ensureInstagramTab();
    await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['src/content.js'] });
    await chrome.tabs.sendMessage(aba.id, {
      type: 'RUN_SCAN',
      options: { ...(s.options || {}), retomar: true },
    });
    await setState({ phase: 'resolvendo', retomaEm: null, tabId: aba.id, ultimoProgresso: Date.now() });
    chrome.alarms.create('vigia', { periodInMinutes: 0.5 });
  } catch (e) {
    // Não conseguiu agora: tenta de novo no próximo intervalo.
    await tratarErro({ code: 'RATE_LIMIT', message: (e && e.message) || String(e) });
  }
}

async function encerrarComErro(code, message) {
  await chrome.alarms.clear('vigia');
  await setState({ running: false, phase: 'erro', esperandoAte: null, error: { code, message } });
}

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'vigia') vigiar();
  if (a.name === 'retomar') retomarPausa();
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
    // Mesma regra da tela: me_segue manda, e sem dado ninguém é acusado.
    const seguidores = new Set(lastResult.followers.map((u) => String(u.username).toLowerCase()));
    const listaUtil = lastResult.followers.length > 0 && !lastResult.semSeguidores;
    const n = lastResult.following.filter((u) => {
      if (typeof u.me_segue === 'boolean') return !u.me_segue;
      return listaUtil ? !seguidores.has(String(u.username).toLowerCase()) : false;
    }).length;
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
