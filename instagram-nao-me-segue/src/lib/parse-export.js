/**
 * Lê os arquivos de "Baixar suas informações" do Instagram
 * (connections/followers_and_following/*.json ou *.html) e devolve listas
 * normalizadas de seguidores e de quem você segue.
 */
import { listarEntradas, lerEntradaComoTexto } from './unzip.js';

// Ancorados no início do nome: sem o ^, um "followers_and_following.json"
// casaria com o padrão de "following" e a lista inteira iria para o lado errado.
const RE_FOLLOWERS = /^followers(_\d+)?\.(json|html)$/i;
const RE_FOLLOWING = /^following(_\d+)?\.(json|html)$/i;

function normalizar(username, timestamp) {
  const limpo = String(username || '').trim().replace(/^@/, '');
  if (!limpo || limpo.includes('/') || limpo.includes(' ')) return null;
  return { id: '', username: limpo, full_name: '', is_verified: false, is_private: false, pic: '', ts: timestamp || 0 };
}

/** Varre qualquer forma do JSON do export atrás de string_list_data. */
function extrairDeJson(texto) {
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    return [];
  }

  const encontrados = [];
  const visitar = (no, profundidade) => {
    if (!no || profundidade > 8) return;
    if (Array.isArray(no)) {
      for (const item of no) visitar(item, profundidade + 1);
      return;
    }
    if (typeof no !== 'object') return;

    if (Array.isArray(no.string_list_data)) {
      for (const s of no.string_list_data) {
        const valor = s && (s.value || (s.href ? String(s.href).replace(/\/+$/, '').split('/').pop() : ''));
        const u = normalizar(valor, s && s.timestamp);
        if (u) encontrados.push(u);
      }
      return;
    }
    for (const chave of Object.keys(no)) visitar(no[chave], profundidade + 1);
  };

  visitar(dados, 0);
  return encontrados;
}

/** Fallback para a versão HTML do export. */
function extrairDeHtml(texto) {
  const encontrados = [];
  const re = /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?/g;
  let m;
  while ((m = re.exec(texto))) {
    const u = normalizar(m[1], 0);
    if (u) encontrados.push(u);
  }
  return encontrados;
}

function extrair(nome, texto) {
  return /\.json$/i.test(nome) ? extrairDeJson(texto) : extrairDeHtml(texto);
}

function dedup(lista) {
  const mapa = new Map();
  for (const u of lista) {
    const chave = u.username.toLowerCase();
    if (!mapa.has(chave)) mapa.set(chave, u);
  }
  return [...mapa.values()];
}

/**
 * @param {File[]} arquivos  .zip do export, ou os .json/.html soltos
 * @returns {Promise<{followers: object[], following: object[], usados: string[]}>}
 */
export async function lerExport(arquivos) {
  const followers = [];
  const following = [];
  const usados = [];

  const consumir = (nome, texto) => {
    const base = nome.split('/').pop();
    if (RE_FOLLOWERS.test(base)) {
      followers.push(...extrair(base, texto));
      usados.push(base);
    } else if (RE_FOLLOWING.test(base)) {
      following.push(...extrair(base, texto));
      usados.push(base);
    }
  };

  for (const arquivo of arquivos) {
    if (/\.zip$/i.test(arquivo.name)) {
      const buffer = await arquivo.arrayBuffer();
      const entradas = listarEntradas(buffer).filter((e) => {
        const base = e.nome.split('/').pop();
        return RE_FOLLOWERS.test(base) || RE_FOLLOWING.test(base);
      });
      for (const entrada of entradas) {
        consumir(entrada.nome, await lerEntradaComoTexto(buffer, entrada));
      }
    } else {
      consumir(arquivo.name, await arquivo.text());
    }
  }

  // Só o following: sem a lista de seguidores, todo mundo pareceria não
  // retribuir. Melhor recusar do que produzir uma lista inteira errada.
  if (following.length && !followers.length) {
    throw new Error(
      'O arquivo tem a lista de quem você segue, mas não a de seguidores (followers_1.json). ' +
      'Sem as duas não dá para saber quem retribui — selecione também os arquivos de seguidores.'
    );
  }

  if (!followers.length && !following.length) {
    throw new Error(
      'Não achei os arquivos de conexões. Procure por followers_1.json e following.json ' +
      'dentro de connections/followers_and_following no export do Instagram.'
    );
  }

  return { followers: dedup(followers), following: dedup(following), usados };
}
