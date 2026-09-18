import { paraCsv, baixar } from '../src/lib/csv.js';
import { lerExport } from '../src/lib/parse-export.js';

const $ = (sel) => document.querySelector(sel);
const PASSO = 50;

const FASES = {
  resolvendo: 'Identificando a conta…',
  seguidores: 'Lendo seus seguidores…',
  seguindo: 'Lendo quem você segue…',
  concluido: 'Pronto!',
};

const ABAS = {
  'nao-seguem': {
    placar: 'não te seguem de volta',
    vazio: 'Todo mundo que você segue te segue de volta. 🎉',
  },
  'nao-sigo': {
    placar: 'te seguem e você não segue',
    vazio: 'Você segue todo mundo que te segue.',
  },
  mutuos: {
    placar: 'seguem você e são seguidos por você',
    vazio: 'Nenhum seguidor mútuo por aqui.',
  },
  saidas: {
    placar: 'deixaram de te seguir desde a última análise',
    vazio: 'Ninguém deixou de te seguir desde a última análise.',
  },
  ignorados: {
    placar: 'perfis escondidos das outras listas',
    vazio: 'Ninguém na lista de ignorados. Use o ✕ ao lado de um perfil para escondê-lo das outras abas.',
  },
};

let resultado = null;
let previo = null;
let estado = null;
let ignorados = new Set();
let prefs = { pace: 'normal', ordem: 'ig' };
let aba = 'nao-seguem';
let busca = '';
let limite = PASSO;
let cache = null;

iniciar();

async function iniciar() {
  if (new URLSearchParams(location.search).has('full')) document.body.classList.add('full');

  const dados = await chrome.storage.local.get(['lastResult', 'previousResult', 'ignorados', 'prefs']);
  resultado = dados.lastResult || null;
  previo = dados.previousResult || null;
  ignorados = new Set(dados.ignorados || []);
  prefs = { ...prefs, ...(dados.prefs || {}) };
  $('#pace').value = prefs.pace;
  $('#ordem').value = prefs.ordem;

  const resposta = await chrome.runtime.sendMessage({ type: 'GET_STATE' }).catch(() => null);
  estado = (resposta && resposta.state) || null;

  ligarEventos();

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'UI_STATE') {
      estado = msg.state;
      pintar();
    }
  });

  chrome.storage.onChanged.addListener((mudancas, area) => {
    if (area !== 'local') return;
    if (mudancas.previousResult) previo = mudancas.previousResult.newValue || null;
    if (mudancas.lastResult) {
      resultado = mudancas.lastResult.newValue || null;
      cache = null;
      limite = PASSO;
      pintar();
    }
  });

  pintar();
}

/* ─────────────────────────── eventos ─────────────────────────── */

function ligarEventos() {
  $('#btn-analisar').addEventListener('click', analisar);
  $('#btn-reanalisar').addEventListener('click', analisar);

  $('#btn-cancelar').addEventListener('click', async () => {
    $('#btn-cancelar').disabled = true;
    await chrome.runtime.sendMessage({ type: 'CANCEL_SCAN' }).catch(() => {});
  });

  $('#btn-expandir').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html?full=1') });
    window.close();
  });

  $('#pace').addEventListener('change', (e) => salvarPrefs({ pace: e.target.value }));

  $('#ordem').addEventListener('change', (e) => {
    salvarPrefs({ ordem: e.target.value });
    cache = null;
    limite = PASSO;
    pintarResultado();
  });

  $('#arquivo').addEventListener('change', importar);

  $('#abas').addEventListener('click', (e) => {
    const botao = e.target.closest('.aba');
    if (!botao) return;
    aba = botao.dataset.aba;
    limite = PASSO;
    pintarResultado();
  });

  let debounce;
  $('#busca').addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      busca = e.target.value.trim().toLowerCase();
      limite = PASSO;
      pintarResultado();
    }, 120);
  });

  $('#btn-mais').addEventListener('click', () => {
    limite += PASSO * 3;
    pintarResultado();
  });

  $('#btn-csv').addEventListener('click', () => {
    const lista = listaVisivel();
    if (!lista.length) return toast('Nada para exportar.');
    const conta = (resultado.target && resultado.target.username) || 'instagram';
    baixar(`${conta}-${aba}.csv`, paraCsv(lista));
    toast(`${lista.length} perfis exportados.`);
  });

  $('#btn-copiar').addEventListener('click', async () => {
    const lista = listaVisivel();
    if (!lista.length) return toast('Nada para copiar.');
    try {
      await navigator.clipboard.writeText(lista.map((u) => '@' + u.username).join('\n'));
      toast(`${lista.length} @ copiados.`);
    } catch {
      toast('Não consegui copiar.');
    }
  });

  $('#btn-saidas').addEventListener('click', () => {
    aba = 'saidas';
    limite = PASSO;
    pintarResultado();
  });

  $('#erro-fechar').addEventListener('click', () => $('#erro').classList.add('oculto'));
}

async function salvarPrefs(patch) {
  prefs = { ...prefs, ...patch };
  await chrome.storage.local.set({ prefs });
}

async function analisar() {
  $('#btn-analisar').disabled = true;
  $('#erro').classList.add('oculto');
  const options = { pace: $('#pace').value, username: $('#username').value.trim() };
  const r = await chrome.runtime.sendMessage({ type: 'START_SCAN', options }).catch((e) => ({ ok: false, error: String(e) }));
  $('#btn-analisar').disabled = false;
  if (r && r.ok === false) mostrarErro('Não consegui começar', r.error);
}

async function importar(e) {
  const arquivos = [...e.target.files];
  e.target.value = '';
  if (!arquivos.length) return;

  $('#import-status').textContent = 'Lendo arquivos…';
  try {
    const { followers, following, usados } = await lerExport(arquivos);
    const novo = {
      version: 1,
      source: 'import',
      target: { id: '', username: '', full_name: '', pic: '' },
      scannedAt: Date.now(),
      followers,
      following,
    };
    await chrome.storage.local.set({ lastResult: novo });
    resultado = novo;
    cache = null;
    limite = PASSO;
    await chrome.runtime.sendMessage({
      type: 'IMPORT_DONE',
      counts: { followers: followers.length, following: following.length },
    }).catch(() => {});
    $('#import-status').textContent = `Importado: ${usados.join(', ')}`;
    pintar();
  } catch (erro) {
    $('#import-status').textContent = '';
    mostrarErro('Não consegui ler o arquivo', erro.message || String(erro));
  }
}

/* ─────────────────────────── cálculo ─────────────────────────── */

function chave(u) {
  return String(u.username || '').toLowerCase();
}

function calcular() {
  if (cache) return cache;
  if (!resultado) return { 'nao-seguem': [], 'nao-sigo': [], mutuos: [], saidas: [], ignorados: [], novos: 0 };

  const seguidores = resultado.followers || [];
  const seguindo = resultado.following || [];
  const setSeguidores = new Set(seguidores.map(chave));
  const setSeguindo = new Set(seguindo.map(chave));

  const naoSeguem = seguindo.filter((u) => !setSeguidores.has(chave(u)));
  const naoSigo = seguidores.filter((u) => !setSeguindo.has(chave(u)));
  const mutuos = seguindo.filter((u) => setSeguidores.has(chave(u)));

  const escondidos = [...seguindo, ...seguidores].filter((u) => ignorados.has(chave(u)));
  const unicos = new Map();
  for (const u of escondidos) unicos.set(chave(u), u);

  // Comparação com a análise anterior: quem te seguia e não te segue mais.
  let saidas = [];
  let novos = 0;
  if (previo && Array.isArray(previo.followers)) {
    const antes = new Set(previo.followers.map(chave));
    saidas = previo.followers.filter((u) => !setSeguidores.has(chave(u)));
    novos = seguidores.filter((u) => !antes.has(chave(u))).length;
  }

  cache = {
    'nao-seguem': naoSeguem.filter((u) => !ignorados.has(chave(u))),
    'nao-sigo': naoSigo.filter((u) => !ignorados.has(chave(u))),
    mutuos: mutuos.filter((u) => !ignorados.has(chave(u))),
    saidas: saidas.filter((u) => !ignorados.has(chave(u))),
    ignorados: [...unicos.values()],
    novos,
  };
  return cache;
}

function listaVisivel() {
  let lista = calcular()[aba] || [];

  if (busca) {
    lista = lista.filter(
      (u) => chave(u).includes(busca) || (u.full_name || '').toLowerCase().includes(busca)
    );
  }

  const ordem = $('#ordem').value;
  if (ordem === 'az' || ordem === 'za') {
    lista = [...lista].sort((a, b) => chave(a).localeCompare(chave(b), 'pt-BR'));
    if (ordem === 'za') lista.reverse();
  }
  return lista;
}

async function alternarIgnorado(username) {
  const k = username.toLowerCase();
  if (ignorados.has(k)) ignorados.delete(k);
  else ignorados.add(k);
  await chrome.storage.local.set({ ignorados: [...ignorados] });
  cache = null;
  pintarResultado();
}

/* ─────────────────────────── telas ─────────────────────────── */

function mostrarTela(nome) {
  for (const id of ['inicio', 'progresso', 'resultado']) {
    $('#tela-' + id).classList.toggle('oculto', id !== nome);
  }
}

function pintar() {
  const rodando = !!(estado && estado.running);
  if (rodando) mostrarTela('progresso');
  else if (resultado) mostrarTela('resultado');
  else mostrarTela('inicio');

  if (rodando) pintarProgresso();
  else if (resultado) pintarResultado();

  if (estado && estado.phase === 'erro' && estado.error) {
    mostrarErro('Não deu certo', mensagemAmigavel(estado.error));
  } else if (estado && estado.phase === 'cancelado') {
    mostrarErro('Coleta cancelada', 'Nada foi salvo: uma lista incompleta acusaria gente que na verdade te segue.');
  }
}

function pintarProgresso() {
  const contagens = estado.counts || { followers: 0, following: 0 };
  const alvo = estado.target || {};

  $('#progresso-fase').textContent = FASES[estado.phase] || 'Coletando…';
  $('#p-seguidores').textContent = contagens.followers.toLocaleString('pt-BR');
  $('#p-seguindo').textContent = contagens.following.toLocaleString('pt-BR');
  $('#btn-cancelar').disabled = false;

  const totalEsperado = (alvo.totalSeguidores || 0) + (alvo.totalSeguindo || 0);
  const feitos = contagens.followers + contagens.following;
  const barra = $('.barra-progresso');

  if (totalEsperado > 0) {
    const pct = Math.min(99, Math.round((feitos / totalEsperado) * 100));
    barra.classList.remove('indeterminada');
    $('#progresso-preenchido').style.width = pct + '%';
    $('#progresso-eta').textContent =
      `${feitos.toLocaleString('pt-BR')} de ~${totalEsperado.toLocaleString('pt-BR')} · ${restante(alvo, contagens)}`;
  } else {
    barra.classList.add('indeterminada');
    $('#progresso-preenchido').style.width = '35%';
    $('#progresso-eta').textContent = '';
  }

  if (estado.esperandoAte && estado.esperandoAte > Date.now()) {
    const seg = Math.ceil((estado.esperandoAte - Date.now()) / 1000);
    $('#progresso-aviso').textContent = `O Instagram pediu uma pausa. Retomando em ~${seg}s.`;
  } else {
    $('#progresso-aviso').textContent = '';
  }
}

function restante(alvo, contagens) {
  const ritmo = (estado && estado.pace) || { min: 1200, max: 2400, count: 50 };
  const faltam =
    Math.max(0, (alvo.totalSeguidores || 0) - contagens.followers) +
    Math.max(0, (alvo.totalSeguindo || 0) - contagens.following);
  if (!faltam) return 'quase lá';

  const paginas = Math.ceil(faltam / (ritmo.count || 50));
  const ms = paginas * ((ritmo.min + ritmo.max) / 2 + 350);
  const min = Math.round(ms / 60000);
  if (ms < 45000) return 'menos de 1 min';
  return `~${min} min restante${min > 1 ? 's' : ''}`;
}

function pintarResultado() {
  if (!resultado) return;
  const grupos = calcular();

  const alvo = resultado.target || {};
  const avatar = $('#r-avatar');
  if (alvo.pic) {
    avatar.src = alvo.pic;
    avatar.hidden = false;
  } else {
    avatar.hidden = true;
  }
  $('#r-conta').textContent = alvo.username ? '@' + alvo.username : 'Sua conta';
  $('#r-quando').textContent =
    (resultado.source === 'import' ? 'Importado ' : 'Analisado ') +
    quando(resultado.scannedAt) +
    ` · ${(resultado.followers || []).length.toLocaleString('pt-BR')} seguidores · ` +
    `${(resultado.following || []).length.toLocaleString('pt-BR')} seguindo`;

  for (const botao of document.querySelectorAll('.aba')) {
    const nome = botao.dataset.aba;
    botao.querySelector('b').textContent = (grupos[nome] || []).length.toLocaleString('pt-BR');
    botao.classList.toggle('ativa', nome === aba);
  }

  // O número que interessa vem primeiro: é ele que ancora a leitura da tela.
  const atual = grupos[aba] || [];
  $('#placar-numero').textContent = atual.length.toLocaleString('pt-BR');
  $('#placar-texto').textContent = ABAS[aba].placar;

  $('#aviso-parcial').classList.toggle('oculto', !resultado.parcial);

  const faixa = $('#novidades');
  const temHistorico = !!previo && (grupos.saidas.length > 0 || grupos.novos > 0);
  faixa.classList.toggle('oculto', !temHistorico);
  if (temHistorico) {
    const partes = [];
    if (grupos.saidas.length) partes.push(`<b>${grupos.saidas.length}</b> deixaram de te seguir`);
    if (grupos.novos) partes.push(`<b>${grupos.novos}</b> novos seguidores`);
    $('#novidades-texto').innerHTML = `Última análise ${quando(previo.scannedAt)}: ` + partes.join(' · ');
    $('#btn-saidas').classList.toggle('oculto', !grupos.saidas.length);
  }

  const lista = listaVisivel();
  const ul = $('#lista');
  ul.textContent = '';

  const fragmento = document.createDocumentFragment();
  for (const usuario of lista.slice(0, limite)) fragmento.appendChild(item(usuario));
  ul.appendChild(fragmento);

  const sobra = lista.length - limite;
  $('#btn-mais').classList.toggle('oculto', sobra <= 0);
  if (sobra > 0) $('#btn-mais').textContent = `Mostrar mais ${Math.min(sobra, PASSO * 3)} (de ${sobra.toLocaleString('pt-BR')})`;

  const vazio = $('#vazio');
  if (lista.length) {
    vazio.classList.add('oculto');
  } else {
    vazio.classList.remove('oculto');
    vazio.textContent = busca ? 'Nenhum perfil com esse texto.' : ABAS[aba].vazio;
  }
}

function item(usuario) {
  const li = document.createElement('li');
  li.className = 'item';

  if (usuario.pic) {
    const img = document.createElement('img');
    img.className = 'avatar';
    img.src = usuario.pic;
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => img.replaceWith(iniciais(usuario.username)), { once: true });
    li.appendChild(img);
  } else {
    li.appendChild(iniciais(usuario.username));
  }

  const texto = document.createElement('div');
  texto.className = 'item-texto';

  const link = document.createElement('a');
  link.href = 'https://www.instagram.com/' + encodeURIComponent(usuario.username) + '/';
  link.target = '_blank';
  link.rel = 'noreferrer noopener';
  link.textContent = '@' + usuario.username;
  if (usuario.is_verified) link.appendChild(selo('✓', 'verificado'));
  if (usuario.is_private) link.appendChild(selo('privado'));
  texto.appendChild(link);

  if (usuario.full_name) {
    const nome = document.createElement('small');
    nome.textContent = usuario.full_name;
    texto.appendChild(nome);
  }
  li.appendChild(texto);

  const botao = document.createElement('button');
  botao.className = 'icone';
  const oculto = ignorados.has(chave(usuario));
  botao.textContent = oculto ? '↺' : '✕';
  botao.title = oculto ? 'Tirar da lista de ignorados' : 'Ignorar este perfil';
  botao.addEventListener('click', () => alternarIgnorado(usuario.username));
  li.appendChild(botao);

  return li;
}

function iniciais(username) {
  const span = document.createElement('span');
  span.className = 'iniciais';
  span.textContent = (username || '?').slice(0, 2).toUpperCase();
  return span;
}

function selo(texto, classe) {
  const span = document.createElement('span');
  span.className = 'selo' + (classe ? ' ' + classe : '');
  span.textContent = texto;
  return span;
}

/* ─────────────────────────── auxiliares ─────────────────────────── */

function quando(ts) {
  if (!ts) return 'agora';
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `há ${horas}h`;
  return 'em ' + new Date(ts).toLocaleDateString('pt-BR');
}

function mensagemAmigavel(erro) {
  const mapa = {
    NAO_AUTENTICADO: 'Você não está logado no instagram.com. Abra o site, faça login e tente de novo.',
    RATE_LIMIT: 'O Instagram limitou as requisições. Espere alguns minutos e use o ritmo "Devagar".',
    PERFIL_PRIVADO: 'Esse perfil é privado e você não o segue.',
    NAO_ENCONTRADO: 'Perfil não encontrado. Confira o nome de usuário.',
    ABA_FECHADA: 'A aba do Instagram foi fechada antes de terminar. Tente de novo.',
  };
  return mapa[erro.code] || erro.message || 'Erro inesperado.';
}

function mostrarErro(titulo, mensagem) {
  $('#erro-titulo').textContent = titulo;
  $('#erro-msg').textContent = mensagem;
  $('#erro').classList.remove('oculto');
}

let toastTimer;
function toast(texto) {
  const el = $('#aviso-toast');
  el.textContent = texto;
  el.classList.remove('oculto');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('oculto'), 2200);
}
