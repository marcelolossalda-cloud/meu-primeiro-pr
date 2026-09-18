/**
 * Content script injetado sob demanda em www.instagram.com.
 *
 * Roda na mesma origem da página, entao os fetches para a API web do Instagram
 * saem autenticados com os cookies da sessao do proprio usuario. Nada sai do
 * navegador: o resultado e gravado direto em chrome.storage.local.
 */
(() => {
  if (window.__QNMS_CONTENT__) return;
  window.__QNMS_CONTENT__ = true;

  const IG_APP_ID = '936619743392459';
  const MAX_PAGES = 4000;

  // Ritmos de coleta. Quanto mais devagar, menor a chance de bater no limite
  // de requisicoes do Instagram.
  const PACE = {
    seguro: { min: 2400, max: 4200, count: 50 },
    normal: { min: 1200, max: 2400, count: 50 },
    rapido: { min: 500, max: 1100, count: 100 },
  };

  let cancelled = false;
  let running = false;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'PING') {
      sendResponse({ ok: true, running });
      return;
    }
    if (msg.type === 'CANCEL') {
      cancelled = true;
      sendResponse({ ok: true });
      return;
    }
    if (msg.type === 'DIAGNOSTICO') {
      diagnosticar().then((linhas) => sendResponse({ linhas }));
      return true; // resposta assíncrona
    }
    if (msg.type === 'RUN_SCAN') {
      if (running) {
        sendResponse({ ok: false, error: 'JA_RODANDO' });
        return;
      }
      cancelled = false;
      running = true;
      run(msg.options || {}).finally(() => { running = false; });
      sendResponse({ ok: true });
    }
  });

  /** Checagens de "por que não funciona", rodadas na aba do Instagram. */
  async function diagnosticar() {
    const linhas = [];
    linhas.push({ ok: true, texto: 'Script de leitura rodando em ' + location.host });

    const id = getCookie('ds_user_id');
    linhas.push({
      ok: !!id,
      texto: id ? 'Sessão do Instagram encontrada nesta aba' : 'Você não está logado no instagram.com nesta aba',
    });
    if (!id) return linhas;

    try {
      const d = await igFetch('/api/v1/friendships/' + id + '/followers/?count=1');
      const n = Array.isArray(d && d.users) ? d.users.length : 0;
      linhas.push({
        ok: n > 0,
        texto: n > 0 ? 'A API do Instagram respondeu normalmente' : 'A API respondeu, mas não devolveu perfis',
      });
    } catch (e) {
      linhas.push({ ok: false, texto: 'A API recusou a leitura: ' + (e.message || e) });
    }
    return linhas;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function jitter(pace) {
    return Math.round(pace.min + Math.random() * (pace.max - pace.min));
  }

  function getCookie(name) {
    const hit = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(name + '='));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
  }

  function fail(code, message) {
    const e = new Error(message);
    e.code = code;
    return e;
  }

  function report(patch) {
    chrome.runtime.sendMessage({ type: 'SCAN_PROGRESS', patch }).catch(() => {});
  }

  async function igFetch(path) {
    const res = await fetch('https://www.instagram.com' + path, {
      credentials: 'include',
      headers: {
        'x-ig-app-id': IG_APP_ID,
        'x-csrftoken': getCookie('csrftoken') || '',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    if (res.status === 429) throw fail('RATE_LIMIT', 'O Instagram pediu para diminuir o ritmo (429).');
    if (res.status === 401 || res.status === 403) {
      throw fail('NAO_AUTENTICADO', 'Sessão não autorizada. Faça login no instagram.com e tente de novo.');
    }
    if (res.status === 404) throw fail('NAO_ENCONTRADO', 'Perfil não encontrado.');
    if (!res.ok) throw fail('HTTP_' + res.status, 'O Instagram respondeu com erro ' + res.status + '.');

    let data;
    try {
      data = await res.json();
    } catch {
      throw fail('RESPOSTA_INVALIDA', 'Resposta inesperada do Instagram. Recarregue a aba e tente de novo.');
    }
    if (data && data.status === 'fail') {
      throw fail('IG_FAIL', data.message || 'O Instagram recusou a requisição.');
    }
    return data;
  }

  /** Repete a requisição com espera crescente quando bate no limite de taxa. */
  async function igFetchRetry(path, onWait) {
    const esperas = [30000, 75000, 150000];
    for (let tentativa = 0; ; tentativa++) {
      try {
        return await igFetch(path);
      } catch (e) {
        const recuperavel = e.code === 'RATE_LIMIT' || e.code === 'RESPOSTA_INVALIDA' || String(e.code).startsWith('HTTP_5');
        if (!recuperavel || tentativa >= esperas.length) throw e;
        const espera = esperas[tentativa];
        if (onWait) onWait(espera, e);
        const fim = Date.now() + espera;
        while (Date.now() < fim) {
          if (cancelled) throw fail('CANCELADO', 'Cancelado.');
          await sleep(500);
        }
      }
    }
  }

  function pick(u) {
    return {
      id: String(u.pk || u.pk_id || u.id || ''),
      username: u.username,
      full_name: u.full_name || '',
      is_verified: !!u.is_verified,
      is_private: !!u.is_private,
      pic: u.profile_pic_url || '',
    };
  }

  /** Descobre de quem vamos ler seguidores/seguindo. */
  async function resolveTarget(username) {
    if (username) {
      const limpo = String(username).trim().replace(/^@/, '').toLowerCase();
      const d = await igFetch('/api/v1/users/web_profile_info/?username=' + encodeURIComponent(limpo));
      const u = d && d.data && d.data.user;
      if (!u) throw fail('NAO_ENCONTRADO', 'Perfil @' + limpo + ' não encontrado.');
      if (u.is_private && !u.followed_by_viewer) {
        throw fail('PERFIL_PRIVADO', '@' + limpo + ' é privado e você não segue essa conta.');
      }
      return {
        id: String(u.id),
        username: u.username,
        full_name: u.full_name || '',
        pic: u.profile_pic_url || '',
        totalSeguidores: (u.edge_followed_by && u.edge_followed_by.count) || 0,
        totalSeguindo: (u.edge_follow && u.edge_follow.count) || 0,
      };
    }

    const id = getCookie('ds_user_id');
    if (!id) {
      throw fail('NAO_AUTENTICADO', 'Você não está logado no instagram.com nesta aba.');
    }
    try {
      const d = await igFetch('/api/v1/users/' + id + '/info/');
      const u = (d && d.user) || {};
      return {
        id,
        username: u.username || '',
        full_name: u.full_name || '',
        pic: u.profile_pic_url || '',
        totalSeguidores: u.follower_count || 0,
        totalSeguindo: u.following_count || 0,
      };
    } catch {
      return { id, username: '', full_name: '', pic: '', totalSeguidores: 0, totalSeguindo: 0 };
    }
  }

  /** Percorre todas as páginas de followers/following. */
  async function fetchList(kind, userId, pace, onProgress) {
    const out = [];
    const vistos = new Set();
    let maxId = null;
    let anterior = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      if (cancelled) throw fail('CANCELADO', 'Cancelado.');

      const qs = new URLSearchParams({ count: String(pace.count) });
      if (maxId != null) qs.set('max_id', String(maxId));

      const data = await igFetchRetry(
        '/api/v1/friendships/' + userId + '/' + kind + '/?' + qs.toString(),
        (espera) => onProgress(out.length, { esperandoAte: Date.now() + espera })
      );

      const users = Array.isArray(data && data.users) ? data.users : [];
      for (const u of users) {
        if (!u || !u.username) continue;
        const chave = u.username.toLowerCase();
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        out.push(pick(u));
      }
      onProgress(out.length, {});

      const proximo = data && data.next_max_id;
      if (!users.length || proximo == null || proximo === '' || String(proximo) === String(anterior)) break;
      anterior = proximo;
      maxId = proximo;

      await sleep(jitter(pace));
    }

    return out;
  }

  async function run(options) {
    const pace = PACE[options.pace] || PACE.normal;
    try {
      report({ phase: 'resolvendo', counts: { followers: 0, following: 0 }, pace: { ...pace, nome: options.pace || 'normal' } });
      const target = await resolveTarget(options.username);

      report({ phase: 'seguidores', target, counts: { followers: 0, following: 0 } });
      let seguidores = 0;
      const followers = await fetchList('followers', target.id, pace, (n, extra) => {
        seguidores = n;
        report({ phase: 'seguidores', counts: { followers: n, following: 0 }, ...extra });
      });

      report({ phase: 'seguindo', counts: { followers: seguidores, following: 0 } });
      const following = await fetchList('following', target.id, pace, (n, extra) => {
        report({ phase: 'seguindo', counts: { followers: seguidores, following: n }, ...extra });
      });

      // Aviso de coleta incompleta: uma lista parcial acusaria como "não te
      // segue" gente que na verdade segue. Comparamos com o total do perfil.
      const esperado = (target.totalSeguidores || 0) + (target.totalSeguindo || 0);
      const obtido = followers.length + following.length;

      const resultado = {
        version: 1,
        source: 'live',
        target,
        scannedAt: Date.now(),
        followers,
        following,
        parcial: esperado > 0 && obtido < esperado * 0.9,
      };
      await salvar(resultado);
      chrome.runtime.sendMessage({ type: 'SCAN_DONE', counts: { followers: followers.length, following: following.length } }).catch(() => {});
    } catch (e) {
      if (e && e.code === 'CANCELADO') {
        chrome.runtime.sendMessage({ type: 'SCAN_CANCELLED' }).catch(() => {});
        return;
      }
      chrome.runtime
        .sendMessage({ type: 'SCAN_ERROR', code: (e && e.code) || 'ERRO', message: (e && e.message) || String(e) })
        .catch(() => {});
    }
  }

  /**
   * Grava o resultado e guarda o anterior para a comparação "o que mudou".
   * Se estourar a cota do storage, regrava sem as fotos de perfil.
   */
  async function salvar(resultado) {
    const dados = { lastResult: resultado };

    const { lastResult: anterior } = await chrome.storage.local.get('lastResult');
    const mesmaConta =
      anterior &&
      !anterior.parcial &&
      (anterior.target || {}).username === (resultado.target || {}).username;

    if (mesmaConta) {
      const enxuto = (u) => ({ username: u.username, full_name: u.full_name || '' });
      dados.previousResult = {
        scannedAt: anterior.scannedAt,
        followers: (anterior.followers || []).map(enxuto),
        following: (anterior.following || []).map(enxuto),
      };
    }

    try {
      await chrome.storage.local.set(dados);
    } catch {
      const semFoto = (l) => l.map((u) => ({ ...u, pic: '' }));
      await chrome.storage.local.set({
        ...dados,
        lastResult: { ...resultado, followers: semFoto(resultado.followers), following: semFoto(resultado.following) },
      });
    }
  }
})();
