import { paraCsv, baixar } from '../src/lib/csv.js';
import { lerExport } from '../src/lib/parse-export.js';

const $ = (sel) => document.querySelector(sel);
const PASSO = 50;

const FASES = {
  resolvendo: 'Identificando a conta…',
  coletando: 'Lendo suas listas…',
  conferindo: 'Conferindo quem retribui…',
  seguidores: 'Lendo seus seguidores…',
  seguindo: 'Lendo quem você segue…',
  concluido: 'Pronto!',
};

// Cada falha possível vira uma explicação em português e uma lista do que fazer.
const FALHAS = {
  SEM_ESTRATEGIA: {
    titulo: 'O Instagram não está entregando as listas',
    motivo:
      'Testei as três formas conhecidas de ler seguidores e nenhuma devolveu dados — o site respondeu com a própria página no lugar. Isso costuma ser sessão a renovar, verificação de segurança pendente na conta, ou limite temporário depois de muitas leituras.',
    passos: [
      'Abra o instagram.com em uma aba e confirme que você entra normalmente.',
      'Resolva qualquer aviso de segurança, confirmação de identidade ou "atividade incomum".',
      'Recarregue a aba do Instagram e clique em Tentar de novo.',
      'Se continuar, espere umas horas: o limite por conta some sozinho.',
    ],
  },
  LISTAS_VAZIAS: {
    titulo: 'O Instagram respondeu, mas mandou listas vazias',
    motivo:
      'O seu perfil foi identificado e tem conexões, porém todas as formas de leitura devolveram zero perfis. É o jeito silencioso do Instagram de recusar a leitura — acontece com conta em verificação pendente, sessão antiga, ou depois de muitas leituras seguidas.',
    passos: [
      'Abra o instagram.com, saia da conta e entre de novo (isso renova a sessão).',
      'Resolva qualquer aviso de segurança ou confirmação de identidade.',
      'Recarregue a aba e clique em Tentar de novo.',
      'Se continuar em zero, use a importação do arquivo abaixo: ela não passa pela API.',
    ],
  },
  RESPOSTA_INVALIDA: {
    titulo: 'O Instagram devolveu a página do site, não os dados',
    motivo:
      'A resposta veio como página HTML em vez da lista de perfis. Na prática, o Instagram não reconheceu a leitura como legítima nesta sessão.',
    passos: [
      'Abra o instagram.com e confirme que entra normalmente.',
      'Resolva qualquer verificação pendente na conta.',
      'Recarregue a aba e tente de novo.',
    ],
  },
  NAO_AUTENTICADO: {
    titulo: 'A sessão do Instagram não foi aceita',
    motivo: 'Os cookies da aba não autorizam a leitura. Normalmente é login expirado ou a aba estar deslogada.',
    passos: ['Abra o instagram.com nessa aba.', 'Faça login (ou saia e entre de novo).', 'Volte aqui e tente de novo.'],
  },
  RATE_LIMIT: {
    titulo: 'O Instagram pediu para parar por um tempo',
    motivo: 'Foram feitas leituras demais em pouco tempo e a conta entrou em limite temporário. Não há nada quebrado: é uma pausa imposta pelo serviço.',
    passos: [
      'Espere de 15 minutos a algumas horas.',
      'Na volta, abra Opções e escolha o ritmo "Devagar".',
      'Enquanto isso, a importação do arquivo funciona normalmente.',
    ],
  },
  PERFIL_PRIVADO: {
    titulo: 'Esse perfil é privado',
    motivo: 'Só dá para ler as listas de contas públicas ou que você já segue.',
    passos: ['Deixe o campo de usuário vazio para analisar a sua própria conta.'],
  },
  NAO_ENCONTRADO: {
    titulo: 'Perfil não encontrado',
    motivo: 'O nome de usuário informado não existe ou foi digitado errado.',
    passos: ['Confira o @ digitado, ou deixe o campo vazio para analisar a sua conta.'],
  },
  INTERROMPIDA: {
    titulo: 'A análise foi interrompida',
    motivo: 'A aba do Instagram recarregou várias vezes durante a leitura, e a coleta morre junto com ela.',
    passos: ['Deixe a aba do Instagram parada durante a análise.', 'Clique em Tentar de novo — a leitura continua de onde parou.'],
  },
  ABA_PERDIDA: {
    titulo: 'Perdi a aba do Instagram',
    motivo: 'A aba usada para a leitura foi fechada ou trocou de endereço no meio do caminho.',
    passos: ['Abra o instagram.com em uma aba.', 'Clique em Tentar de novo — a leitura continua de onde parou.'],
  },
  SEM_RESPOSTA: {
    titulo: 'O Instagram parou de responder',
    motivo: 'As requisições deixaram de voltar no meio da análise.',
    passos: ['Verifique sua conexão.', 'Recarregue a aba do Instagram.', 'Tente de novo em alguns minutos.'],
  },
  FORMATO_INESPERADO: {
    titulo: 'O Instagram mudou o formato da resposta',
    motivo: 'A leitura começou bem, mas em algum momento a resposta veio com uma estrutura diferente da esperada.',
    passos: ['Tente de novo: a extensão vai redetectar a forma de leitura.', 'Se persistir, use a importação do arquivo.'],
  },
};

const FALHA_PADRAO = {
  titulo: 'Não consegui concluir a análise',
  motivo: '',
  passos: ['Recarregue a aba do Instagram e tente de novo.', 'Se continuar, use a importação do arquivo oficial.'],
};

const ABAS = {
  'nao-seguem': {
    placar: 'você segue · eles não te seguem de volta',
    vazio: 'Todo mundo que você segue te segue de volta. 🎉',
  },
  'nao-sigo': {
    placar: 'te seguem · você não segue de volta',
    vazio: 'Você segue todo mundo que te segue.',
    vazioSemDados: 'Esta lista precisa da lista completa de seguidores, que não foi lida para a análise ser rápida.',
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
let prefs = { pace: 'minuto', ordem: 'ig' };
let aba = 'nao-seguem';
let busca = '';
let limite = PASSO;
let cache = null;
let unfollows = { data: '', total: 0 };

// O Instagram limita ações de deixar de seguir. Estes números são
// conservadores de propósito: passar deles é o caminho mais curto para a
// conta ser restringida.
const AVISO_DIARIO = 50;
const TETO_DIARIO = 150;
const hojeStr = () => new Date().toISOString().slice(0, 10);

// Qualquer erro solto vira mensagem na tela, em vez de deixar a janela muda.
window.addEventListener('error', (e) => mostrarErro('Erro na extensão', e.message || 'erro desconhecido'));
window.addEventListener('unhandledrejection', (e) =>
  mostrarErro('Erro na extensão', String((e.reason && e.reason.message) || e.reason || 'erro desconhecido'))
);

iniciar().catch((e) => mostrarErro('Falha ao abrir a extensão', String((e && e.message) || e)));

async function iniciar() {
  if (new URLSearchParams(location.search).has('full')) document.body.classList.add('full');

  // Antes de qualquer await: se a leitura do storage falhar, os botões ainda respondem.
  ligarEventos();

  const dados = await chrome.storage.local.get(['lastResult', 'previousResult', 'ignorados', 'prefs', 'unfollows']);
  unfollows = dados.unfollows && dados.unfollows.data === hojeStr() ? dados.unfollows : { data: hojeStr(), total: 0 };
  resultado = dados.lastResult || null;
  previo = dados.previousResult || null;
  ignorados = new Set(dados.ignorados || []);
  prefs = { ...prefs, ...(dados.prefs || {}) };
  $('#pace').value = prefs.pace;
  $('#ordem').value = prefs.ordem;

  const resposta = await chrome.runtime.sendMessage({ type: 'GET_STATE' }).catch(() => null);
  estado = (resposta && resposta.state) || null;

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

  $('#btn-diagnostico').addEventListener('click', diagnosticar);

  $('#falha-tentar').addEventListener('click', analisar);
  $('#arquivo-falha').addEventListener('change', importar);

  $('#falha-ultima').addEventListener('click', () => {
    estado = { ...(estado || {}), phase: 'ocioso', error: null };
    pintar();
  });

  $('#falha-detalhes-btn').addEventListener('click', () => {
    const lista = $('#falha-detalhes');
    const escondido = lista.classList.toggle('oculto');
    $('#falha-detalhes-btn').textContent = escondido ? 'Ver detalhes técnicos' : 'Esconder detalhes';
    $('#falha-copiar').classList.toggle('oculto', escondido);
  });

  $('#falha-copiar').addEventListener('click', async () => {
    const texto = [...document.querySelectorAll('#falha-detalhes li')]
      .map((li) => (li.classList.contains('ok') ? '[ok]    ' : '[falha] ') + li.textContent)
      .join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      toast('Detalhes copiados.');
    } catch {
      toast('Não consegui copiar.');
    }
  });

  $('#btn-copiar-diag').addEventListener('click', async () => {
    const texto = [...document.querySelectorAll('#diagnostico li')]
      .map((li) => (li.classList.contains('ok') ? '[ok]    ' : '[falha] ') + li.textContent)
      .join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      toast('Diagnóstico copiado.');
    } catch {
      toast('Não consegui copiar.');
    }
  });

  $('#erro-fechar').addEventListener('click', () => $('#erro').classList.add('oculto'));
}

async function diagnosticar() {
  const botao = $('#btn-diagnostico');
  const lista = $('#diagnostico');
  botao.disabled = true;
  botao.textContent = 'Verificando…';
  lista.classList.remove('oculto');
  lista.textContent = '';

  let linhas;
  try {
    const r = await chrome.runtime.sendMessage({ type: 'DIAGNOSTICO' });
    linhas = (r && r.linhas) || [{ ok: false, texto: 'O serviço da extensão não respondeu.' }];
  } catch (e) {
    linhas = [{ ok: false, texto: 'Não consegui falar com o serviço da extensão: ' + ((e && e.message) || e) }];
  }

  for (const linha of linhas) {
    const li = document.createElement('li');
    li.className = linha.ok ? 'ok' : 'falha';
    li.textContent = linha.texto;
    lista.appendChild(li);
  }

  botao.disabled = false;
  botao.textContent = 'Verificar de novo';
  $('#btn-copiar-diag').classList.remove('oculto');
}

async function salvarPrefs(patch) {
  prefs = { ...prefs, ...patch };
  await chrome.storage.local.set({ prefs });
}

async function analisar(opcoes) {
  // detalhes técnicos são recalculados a cada tentativa
  const detalhes = $('#falha-detalhes');
  delete detalhes.dataset.carregado;
  detalhes.textContent = '';

  $('#btn-analisar').disabled = true;
  $('#erro').classList.add('oculto');
  const options = {
    pace: $('#pace').value,
    username: $('#username').value.trim(),
    completo: !!(opcoes && opcoes.completo),
  };
  const r = await chrome.runtime.sendMessage({ type: 'START_SCAN', options }).catch((e) => ({ ok: false, error: String(e) }));
  $('#btn-analisar').disabled = false;
  if (r && r.ok === false) mostrarErro('Não consegui começar', r.error);
}

async function importar(e) {
  const arquivos = [...e.target.files];
  const campoStatus = e.target.id === 'arquivo-falha' ? $('#import-status-falha') : $('#import-status');
  e.target.value = '';
  if (!arquivos.length) return;

  campoStatus.textContent = 'Lendo arquivos…';
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
    campoStatus.textContent = `Importado: ${usados.join(', ')}`;
    estado = { ...(estado || {}), phase: 'concluido', error: null, running: false };
    pintar();
  } catch (erro) {
    campoStatus.textContent = '';
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

  // me_segue vem da conferência conta a conta e vale mais que a comparação de
  // listas, que erra quando o Instagram entrega os seguidores pela metade.
  const retribui = (u) =>
    typeof u.me_segue === 'boolean' ? u.me_segue : setSeguidores.has(chave(u));

  const naoSeguem = seguindo.filter((u) => !retribui(u));
  const mutuos = seguindo.filter((u) => retribui(u));
  const naoSigo = seguidores.filter((u) => !setSeguindo.has(chave(u)));

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
  for (const id of ['inicio', 'progresso', 'resultado', 'falha']) {
    $('#tela-' + id).classList.toggle('oculto', id !== nome);
  }
}

function pintar() {
  const rodando = !!(estado && estado.running);
  const falhou = !rodando && estado && estado.phase === 'erro' && estado.error;

  if (rodando) {
    mostrarTela('progresso');
    pintarProgresso();
    return;
  }

  if (falhou) {
    mostrarTela('falha');
    pintarFalha(estado.error);
    return;
  }

  if (resultado) {
    mostrarTela('resultado');
    pintarResultado();
  } else {
    mostrarTela('inicio');
  }

  if (estado && estado.phase === 'cancelado') {
    mostrarErro('Coleta cancelada', 'Nada foi salvo: uma lista incompleta acusaria gente que na verdade te segue.');
  }
}

/** Explica a falha dentro da própria extensão, com o que fazer a seguir. */
function pintarFalha(erro) {
  const info = FALHAS[erro.code] || { ...FALHA_PADRAO, motivo: erro.message || '' };

  $('#falha-titulo').textContent = info.titulo;
  $('#falha-motivo').textContent = info.motivo || erro.message || '';

  const lista = $('#falha-passos');
  lista.textContent = '';
  for (const passo of info.passos) {
    const li = document.createElement('li');
    li.textContent = passo;
    lista.appendChild(li);
  }

  $('#falha-ultima').classList.toggle('oculto', !resultado);

  // Os detalhes técnicos ficam prontos sem o usuário precisar pedir.
  const detalhes = $('#falha-detalhes');
  if (!detalhes.dataset.carregado) {
    detalhes.dataset.carregado = '1';
    const tecnico = [{ ok: false, texto: 'Código: ' + erro.code + ' — ' + (erro.message || '') }];
    chrome.runtime
      .sendMessage({ type: 'DIAGNOSTICO' })
      .then((r) => preencherDiagnostico(detalhes, tecnico.concat((r && r.linhas) || [])))
      .catch(() => preencherDiagnostico(detalhes, tecnico));
  }
}

function preencherDiagnostico(lista, linhas) {
  lista.textContent = '';
  for (const linha of linhas) {
    const li = document.createElement('li');
    li.className = linha.ok ? 'ok' : 'falha';
    li.textContent = linha.texto;
    lista.appendChild(li);
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

  // Quando a conta é grande demais para caber no tempo alvo mesmo no intervalo
  // mínimo seguro, é melhor dizer isso do que fingir que cabe.
  const plano = estado.plano;
  const campoPlano = $('#progresso-plano');
  if (plano && plano.alvoSegundos && plano.estimativaMs > plano.alvoSegundos * 1000 * 1.15) {
    const min = Math.max(1, Math.round(plano.estimativaMs / 60000));
    campoPlano.textContent =
      `Sua conta é grande (${plano.paginas} páginas): no ritmo máximo seguro isso leva cerca de ${min} min.`;
  } else {
    campoPlano.textContent = '';
  }

  const conf = $('#progresso-conferindo');
  conf.textContent =
    estado.phase === 'conferindo' && estado.aConferir
      ? `Conferindo quem retribui: ${(estado.conferidos || 0).toLocaleString('pt-BR')} de ${estado.aConferir.toLocaleString('pt-BR')}`
      : '';

  if (estado.esperandoAte && estado.esperandoAte > Date.now()) {
    const seg = Math.ceil((estado.esperandoAte - Date.now()) / 1000);
    $('#progresso-aviso').textContent = `O Instagram pediu uma pausa. Retomando em ~${seg}s.`;
  } else {
    $('#progresso-aviso').textContent = estado.retomado ? 'Retomando de onde parou…' : '';
  }
}

function restante(alvo, contagens) {
  const ritmo = (estado && estado.pace) || { min: 600, max: 1200, count: 200 };
  const faltam =
    Math.max(0, (alvo.totalSeguidores || 0) - contagens.followers) +
    Math.max(0, (alvo.totalSeguindo || 0) - contagens.following);
  if (!faltam) return 'quase lá';

  // As duas listas dividem o mesmo agendador, então o tempo é o número de
  // páginas que faltam vezes o intervalo entre requisições.
  const paginas = Math.ceil(faltam / (ritmo.count || 200));
  const ms = paginas * ((ritmo.min + ritmo.max) / 2);
  if (ms < 20000) return `~${Math.max(5, Math.round(ms / 1000))}s restantes`;
  if (ms < 75000) return 'menos de 1 min';
  const min = Math.round(ms / 60000);
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
  const nSeg = (resultado.followers || []).length;
  const nSig = (resultado.following || []).length;
  const oficial = resultado.oficial || {};
  const parte = (lido, total, rotulo) =>
    total > 0 && total !== lido
      ? `${lido.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} ${rotulo}`
      : `${lido.toLocaleString('pt-BR')} ${rotulo}`;

  $('#r-quando').textContent =
    (resultado.source === 'import' ? 'Importado ' : 'Analisado ') +
    quando(resultado.scannedAt) +
    (resultado.semSeguidores
      ? ` · ${parte(nSig, oficial.seguindo, 'seguindo')} · conferido conta a conta`
      : ` · ${parte(nSeg, oficial.seguidores, 'seguidores')} · ${parte(nSig, oficial.seguindo, 'seguindo')}`);

  for (const botao of document.querySelectorAll('.aba')) {
    const nome = botao.dataset.aba;
    botao.querySelector('b').textContent = (grupos[nome] || []).length.toLocaleString('pt-BR');
    botao.classList.toggle('ativa', nome === aba);
  }

  // O número que interessa vem primeiro: é ele que ancora a leitura da tela.
  const atual = grupos[aba] || [];
  const listaConfiavel = !!resultado.verificado && (aba === 'nao-seguem' || aba === 'mutuos');
  $('#placar-numero').textContent = atual.length.toLocaleString('pt-BR');
  $('#placar-texto').textContent =
    ABAS[aba].placar + (listaConfiavel ? ' · conferido conta a conta' : '');

  $('#aviso-parcial').classList.toggle('oculto', !resultado.parcial || listaConfiavel);
  if (resultado.parcial) {
    const faltamSeg = Math.max(0, (oficial.seguidores || 0) - nSeg);
    const faltamSig = Math.max(0, (oficial.seguindo || 0) - nSig);
    const buraco = [];
    if (faltamSeg) buraco.push(`${faltamSeg.toLocaleString('pt-BR')} seguidores`);
    if (faltamSig) buraco.push(`${faltamSig.toLocaleString('pt-BR')} de quem você segue`);

    if (resultado.semSeguidores) {
      $('#aviso-parcial').textContent =
        `O Instagram entregou ${nSig.toLocaleString('pt-BR')} de ${(oficial.seguindo || 0).toLocaleString('pt-BR')} ` +
        'contas que você segue. Analise de novo para completar.';
    } else if (resultado.verificado) {
      // A lista principal não depende da lista de seguidores neste caso.
      $('#aviso-parcial').textContent =
        `"Não me seguem" e "Mútuos" foram conferidos conta a conta e estão corretos. ` +
        `Só a aba "Não sigo" fica incompleta: o Instagram entregou ${nSeg.toLocaleString('pt-BR')} ` +
        `dos ${(oficial.seguidores || 0).toLocaleString('pt-BR')} seguidores.`;
    } else {
      $('#aviso-parcial').textContent = buraco.length
        ? `O Instagram não entregou tudo: faltaram ${buraco.join(' e ')}. ` +
          'Enquanto faltar gente, esta lista acusa como "não te segue" quem na verdade te segue. ' +
          'Clique em Atualizar para tentar completar.'
        : 'Coleta incompleta: a lista pode acusar quem na verdade te segue. Analise de novo.';
    }
  }

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

  // Aviso de ritmo na aba onde a ação existe.
  const avisoAcao = $('#aviso-acao');
  const podeAgir = aba === 'nao-seguem' && resultado.verificado;
  avisoAcao.classList.toggle('oculto', !podeAgir);
  if (podeAgir) {
    avisoAcao.textContent =
      unfollows.total > 0
        ? `Você deixou de seguir ${unfollows.total} hoje. O Instagram restringe contas que passam de ~100–150 por dia, então vá aos poucos.`
        : 'Deixar de seguir é feito um por vez, com confirmação. Evite passar de ~100 por dia para não ter a conta restringida.';
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
  const faltaLista = resultado.semSeguidores && (aba === 'nao-sigo' || aba === 'saidas');

  if (lista.length && !faltaLista) {
    vazio.classList.add('oculto');
  } else {
    vazio.classList.remove('oculto');
    vazio.textContent = busca
      ? 'Nenhum perfil com esse texto.'
      : faltaLista
      ? ABAS[aba].vazioSemDados || 'Esta lista precisa da lista completa de seguidores.'
      : ABAS[aba].vazio;

    if (faltaLista && !busca) {
      const botao = document.createElement('button');
      botao.className = 'secundario largo';
      botao.style.marginTop = '10px';
      botao.textContent = 'Ler também a lista de seguidores';
      botao.addEventListener('click', () => analisar({ completo: true }));
      vazio.appendChild(document.createElement('br'));
      vazio.appendChild(botao);
    }
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

  // Deixar de seguir só aparece onde faz sentido: contas que você segue e que
  // não retribuem, e apenas quando a lista foi conferida conta a conta.
  if (aba === 'nao-seguem' && usuario.id && resultado && resultado.verificado) {
    li.appendChild(botaoDeixarDeSeguir(usuario));
  }

  const botao = document.createElement('button');
  botao.className = 'icone';
  const oculto = ignorados.has(chave(usuario));
  botao.textContent = oculto ? '↺' : '✕';
  botao.title = oculto ? 'Tirar da lista de ignorados' : 'Ignorar este perfil';
  botao.addEventListener('click', () => alternarIgnorado(usuario.username));
  li.appendChild(botao);

  return li;
}

/**
 * Botão de deixar de seguir. Um único tratador de clique com três estados,
 * para o mesmo botão nunca disparar duas ações no mesmo toque.
 */
function botaoDeixarDeSeguir(usuario) {
  const botao = document.createElement('button');
  botao.className = 'secundario pequeno acao-seguir';
  botao.textContent = 'Deixar de seguir';
  botao.title = 'Deixar de seguir @' + usuario.username;

  let estadoBotao = 'normal'; // normal → armado → saiu
  let expira;

  const pintarNormal = () => {
    estadoBotao = 'normal';
    botao.textContent = 'Deixar de seguir';
    botao.className = 'secundario pequeno acao-seguir';
    const item = botao.closest('li');
    if (item) item.classList.remove('saiu');
  };

  const pintarSaiu = () => {
    estadoBotao = 'saiu';
    botao.textContent = 'Desfazer';
    botao.title = 'Voltar a seguir @' + usuario.username;
    botao.className = 'secundario pequeno acao-seguir desfazer';
    const item = botao.closest('li');
    if (item) item.classList.add('saiu');
  };

  async function registrar(delta) {
    unfollows = { data: hojeStr(), total: Math.max(0, unfollows.total + delta) };
    await chrome.storage.local.set({ unfollows });
  }

  botao.addEventListener('click', async () => {
    clearTimeout(expira);

    if (estadoBotao === 'normal') {
      estadoBotao = 'armado';
      botao.textContent = 'Confirmar?';
      botao.classList.add('confirmar');
      expira = setTimeout(pintarNormal, 4000);
      return;
    }

    if (estadoBotao === 'armado') {
      if (unfollows.total >= TETO_DIARIO) {
        pintarNormal();
        toast(`Limite do dia (${TETO_DIARIO}) atingido. Continue amanhã.`);
        return;
      }

      botao.disabled = true;
      botao.textContent = 'Saindo…';
      const r = await chrome.runtime
        .sendMessage({ type: 'DEIXAR_DE_SEGUIR', userId: usuario.id })
        .catch((e) => ({ ok: false, erro: (e && e.message) || String(e) }));
      botao.disabled = false;

      if (!r || !r.ok) {
        pintarNormal();
        mostrarErro('Não consegui deixar de seguir', (r && r.erro) || 'Erro desconhecido.');
        return;
      }

      await registrar(+1);
      pintarSaiu();
      toast(
        unfollows.total === AVISO_DIARIO
          ? `${AVISO_DIARIO} hoje. Vá com calma: o Instagram restringe quem exagera.`
          : 'Deixou de seguir @' + usuario.username
      );
      return;
    }

    // estadoBotao === 'saiu' → desfazer
    botao.disabled = true;
    botao.textContent = 'Voltando…';
    const v = await chrome.runtime
      .sendMessage({ type: 'SEGUIR_DE_NOVO', userId: usuario.id })
      .catch((e) => ({ ok: false, erro: (e && e.message) || String(e) }));
    botao.disabled = false;

    if (v && v.ok) {
      await registrar(-1);
      pintarNormal();
      toast('Voltou a seguir @' + usuario.username);
    } else {
      pintarSaiu();
      mostrarErro('Não consegui voltar a seguir', (v && v.erro) || 'Erro desconhecido.');
    }
  });

  return botao;
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
    INTERROMPIDA: 'A análise foi interrompida porque a aba do Instagram recarregou. Deixe a aba parada e tente de novo.',
    ABA_PERDIDA: 'Perdi a aba do Instagram no meio da análise. Abra o instagram.com e clique em Analisar de novo — a leitura continua de onde parou.',
    SEM_RESPOSTA: 'O Instagram parou de responder no meio da análise. Espere alguns minutos e tente de novo.',
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
