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
};

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
  });

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

    // Vindas do content script
    case 'SCAN_PROGRESS':
      setState({ running: true, esperandoAte: null, ...(msg.patch || {}) });
      return;

    case 'SCAN_DONE':
      setState({ running: false, phase: 'concluido', esperandoAte: null, finishedAt: Date.now(), counts: msg.counts || undefined });
      return;

    case 'SCAN_CANCELLED':
      setState({ running: false, phase: 'cancelado', esperandoAte: null });
      return;

    case 'SCAN_ERROR':
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
      return;

    default:
      return;
  }
});

// Se a aba que estava coletando some, a varredura morreu junto.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getState();
  if (state.running && state.tabId === tabId) {
    await setState({
      running: false,
      phase: 'erro',
      error: { code: 'ABA_FECHADA', message: 'A aba do Instagram foi fechada antes de terminar a coleta.' },
    });
  }
});
