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
  const IG_ASBD_ID = '129477';
  const MAX_PAGES_ABSOLUTO = 4000;

  // Ritmos de coleta: intervalo entre requisicoes e tamanho da pagina.
  // O intervalo e respeitado globalmente (ver criarAgendador), entao a taxa de
  // requisicoes ao Instagram e exatamente esta, mesmo com as duas listas em
  // paralelo. Paginas maiores reduzem o numero de requisicoes.
  //
  // "minuto" nao tem intervalo fixo: ele e calculado em calibrar(), a partir do
  // tamanho real da conta, para a coleta caber no tempo alvo.
  const PACE = {
    minuto: { alvoSegundos: 60, piso: 200, teto: 1500, count: 200 },
    normal: { min: 600, max: 1200, count: 200 },
    seguro: { min: 1500, max: 2600, count: 100 },
  };

  // Folga para resolver o perfil, montar e gravar o resultado.
  const MARGEM_MS = 5000;

  /**
   * Divide o tempo alvo pelo numero de paginas que a conta exige, dentro de um
   * piso e um teto de seguranca. Devolve tambem a estimativa real, que pode
   * passar do alvo quando a conta e grande demais para o piso.
   */
  function calibrar(base, target) {
    if (!base.alvoSegundos) {
      const medio = (base.min + base.max) / 2;
      return { ritmo: base, paginas: null, estimativaMs: null, medio };
    }

    const seguidores = target.totalSeguidores || 0;
    const seguindo = target.totalSeguindo || 0;
    const paginas = Math.ceil(seguidores / base.count) + Math.ceil(seguindo / base.count);

    if (!paginas) {
      return { ritmo: { ...base, min: 350, max: 500 }, paginas: 0, estimativaMs: 0, medio: 425 };
    }

    const disponivel = base.alvoSegundos * 1000 - MARGEM_MS;
    const ideal = Math.floor(disponivel / paginas);
    const intervalo = Math.max(base.piso, Math.min(base.teto, ideal));

    return {
      ritmo: { ...base, min: Math.round(intervalo * 0.8), max: Math.round(intervalo * 1.2) },
      paginas,
      estimativaMs: paginas * intervalo + MARGEM_MS,
      medio: intervalo,
    };
  }

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

    linhas.push({
      ok: true,
      texto: 'Cookies: csrftoken ' + (getCookie('csrftoken') ? 'ok' : 'ausente') +
        ', sessionid ' + (getCookie('sessionid') ? 'ok' : 'ausente') +
        ', www-claim ' + (lerClaim() ? 'ok' : 'ausente'),
    });

    let algumaFuncionou = false;
    for (const est of ESTRATEGIAS) {
      try {
        const d = await igFetch(est.url('followers', id, 1, null));
        const r = est.extrair(d, 'followers');
        if (r && Array.isArray(r.users)) {
          algumaFuncionou = true;
          linhas.push({ ok: true, texto: 'Leitura "' + est.nome + '": funcionou (' + r.users.length + ' perfil de teste)' });
        } else {
          linhas.push({ ok: false, texto: 'Leitura "' + est.nome + '": respondeu sem lista de perfis' });
        }
      } catch (e) {
        linhas.push({ ok: false, texto: 'Leitura "' + est.nome + '": ' + (e.message || e) });
        if (e.detalhe) {
          linhas.push({
            ok: false,
            texto: '   ↳ HTTP ' + e.detalhe.status + ' · ' + e.detalhe.tipo + ' · ' + e.detalhe.tamanho +
              ' bytes · ' + (e.detalhe.inicio || '(vazio)'),
          });
        }
      }
    }

    linhas.push({
      ok: algumaFuncionou,
      texto: algumaFuncionou
        ? 'Pelo menos uma forma de leitura funciona: a análise deve rodar'
        : 'Nenhuma forma de leitura funcionou nesta conta',
    });
    return linhas;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function jitter(pace) {
    return Math.round(pace.min + Math.random() * (pace.max - pace.min));
  }

  /**
   * Distribui as requisicoes no tempo respeitando o intervalo do ritmo.
   * Como as duas listas compartilham o mesmo agendador, rodar em paralelo nao
   * aumenta a taxa de requisicoes — so aproveita o tempo que antes era gasto
   * esperando a resposta chegar para so entao comecar a dormir.
   */
  function criarAgendador(pace) {
    let proximoLivre = 0;
    return {
      async vez() {
        const agora = Date.now();
        const alvo = Math.max(agora, proximoLivre);
        proximoLivre = alvo + jitter(pace);
        if (alvo > agora) await sleep(alvo - agora);
      },
      /** Segura todas as requisicoes por um tempo (usado no backoff de 429). */
      pausar(ms) {
        proximoLivre = Math.max(proximoLivre, Date.now() + ms);
      },
    };
  }

  function getCookie(name) {
    const hit = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(name + '='));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
  }

  function fail(code, message, detalhe) {
    const e = new Error(message);
    e.code = code;
    if (detalhe) e.detalhe = detalhe;
    return e;
  }

  /**
   * O app web do Instagram manda um "www-claim" junto das chamadas de API e o
   * renova a cada resposta. Ele fica no sessionStorage da propria pagina, que o
   * content script enxerga por ser a mesma origem.
   */
  function lerClaim() {
    try {
      return sessionStorage.getItem('www-claim-v2') || '';
    } catch {
      return '';
    }
  }

  function guardarClaim(res) {
    try {
      const novo = res.headers.get('x-ig-set-www-claim');
      if (novo) sessionStorage.setItem('www-claim-v2', novo);
    } catch {
      /* sessionStorage pode estar bloqueado; seguir sem o claim */
    }
  }

  function report(patch) {
    chrome.runtime.sendMessage({ type: 'SCAN_PROGRESS', patch }).catch(() => {});
  }

  async function igFetch(path) {
    const headers = {
      'x-ig-app-id': IG_APP_ID,
      'x-asbd-id': IG_ASBD_ID,
      'x-csrftoken': getCookie('csrftoken') || '',
      'x-requested-with': 'XMLHttpRequest',
    };
    const claim = lerClaim();
    if (claim) headers['x-ig-www-claim'] = claim;

    const res = await fetch('https://www.instagram.com' + path, { credentials: 'include', headers });
    guardarClaim(res);

    if (res.status === 429) throw fail('RATE_LIMIT', 'O Instagram pediu para diminuir o ritmo (429).');
    if (res.status === 401 || res.status === 403) {
      throw fail('NAO_AUTENTICADO', 'Sessão não autorizada. Faça login no instagram.com e tente de novo.');
    }
    if (res.status === 404) throw fail('NAO_ENCONTRADO', 'Perfil não encontrado.');
    if (!res.ok) throw fail('HTTP_' + res.status, 'O Instagram respondeu com erro ' + res.status + '.');

    const texto = await res.text();
    let data;
    try {
      data = JSON.parse(texto);
    } catch {
      // Resposta 200 que não é JSON: quase sempre é a página HTML de login ou
      // de verificação servida no lugar dos dados.
      const tipo = res.headers.get('content-type') || 'sem content-type';
      const ehPagina = /text\/html/i.test(tipo) || /^\s*<(!doctype|html)/i.test(texto);
      const detalhe = {
        status: res.status,
        tipo,
        url: res.url,
        tamanho: texto.length,
        inicio: texto.slice(0, 120).replace(/\s+/g, ' ').trim(),
      };
      throw fail(
        'RESPOSTA_INVALIDA',
        ehPagina
          ? 'O Instagram devolveu a página do site em vez dos dados. Isso costuma ser sessão a renovar ou verificação pendente na conta: abra o instagram.com, confirme que entra normalmente e resolva qualquer aviso de segurança.'
          : 'Resposta inesperada do Instagram (' + tipo + ').',
        detalhe
      );
    }

    if (data && data.status === 'fail') {
      throw fail('IG_FAIL', data.message || 'O Instagram recusou a requisição.');
    }
    if (data && data.require_login) {
      throw fail('NAO_AUTENTICADO', 'O Instagram pediu login novamente. Entre no site e repita.');
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

  /**
   * Formas conhecidas de ler seguidores/seguindo na web do Instagram. Elas mudam
   * com o tempo e nem toda conta responde às mesmas, entao a extensao testa cada
   * uma no comeco e fica com a primeira que devolver dados de verdade.
   */
  const ESTRATEGIAS = [
    {
      nome: 'api-v1',
      url(kind, id, count, cursor) {
        const qs = new URLSearchParams({ count: String(count), search_surface: 'follow_list_page' });
        if (cursor) qs.set('max_id', String(cursor));
        return '/api/v1/friendships/' + id + '/' + kind + '/?' + qs.toString();
      },
      extrair(d) {
        if (!d || !Array.isArray(d.users)) return null;
        const prox = d.next_max_id;
        return {
          users: d.users,
          proximo: prox == null || prox === '' ? null : String(prox),
        };
      },
    },
    {
      nome: 'api-v1-basica',
      url(kind, id, count, cursor) {
        const qs = new URLSearchParams({ count: String(Math.min(count, 50)) });
        if (cursor) qs.set('max_id', String(cursor));
        return '/api/v1/friendships/' + id + '/' + kind + '/?' + qs.toString();
      },
      extrair(d) {
        if (!d || !Array.isArray(d.users)) return null;
        const prox = d.next_max_id;
        return { users: d.users, proximo: prox == null || prox === '' ? null : String(prox) };
      },
    },
    {
      nome: 'graphql',
      url(kind, id, count, cursor) {
        const hash =
          kind === 'followers'
            ? 'c76146de99bb02f6415203be841dd25a'
            : 'd04b0a864b4b54837c0d870b0e77e076';
        const variables = {
          id: String(id),
          include_reel: false,
          fetch_mutual: false,
          first: Math.min(count, 50),
        };
        if (cursor) variables.after = String(cursor);
        return '/graphql/query/?query_hash=' + hash + '&variables=' + encodeURIComponent(JSON.stringify(variables));
      },
      extrair(d, kind) {
        const user = d && d.data && d.data.user;
        const bloco = user && (kind === 'followers' ? user.edge_followed_by : user.edge_follow);
        if (!bloco || !Array.isArray(bloco.edges)) return null;
        const pagina = bloco.page_info || {};
        return {
          users: bloco.edges.map((e) => e && e.node).filter(Boolean),
          proximo: pagina.has_next_page ? pagina.end_cursor : null,
        };
      },
    },
  ];

  /** Descobre qual estratégia funciona nesta conta, com uma chamada leve. */
  async function detectarEstrategia(userId) {
    const falhas = [];
    for (const est of ESTRATEGIAS) {
      try {
        const d = await igFetch(est.url('followers', userId, 1, null));
        const r = est.extrair(d, 'followers');
        if (r && Array.isArray(r.users)) return { estrategia: est, falhas };
        falhas.push(est.nome + ': resposta sem lista de perfis');
      } catch (e) {
        falhas.push(est.nome + ': ' + (e.code || 'erro'));
        // 429 e sessão inválida não melhoram trocando de estratégia
        if (e.code === 'RATE_LIMIT' || e.code === 'NAO_AUTENTICADO') throw e;
      }
    }
    throw fail(
      'SEM_ESTRATEGIA',
      'Nenhuma das formas de leitura funcionou nesta conta (' + falhas.join(' · ') + ').'
    );
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
  async function fetchList(kind, userId, pace, agendador, esperado, estadoLista, estrategia, onProgress) {
    const out = estadoLista.itens;
    const vistos = new Set(out.map((u) => String(u.username).toLowerCase()));
    let maxId = estadoLista.maxId;
    let anterior = null;
    let paginasSemNovidade = 0;

    if (estadoLista.completo) {
      onProgress(out.length, {});
      return out;
    }

    // Teto proporcional ao tamanho da lista: protege contra um cursor que nunca
    // termina, sem cortar uma coleta legítima.
    const limite = esperado
      ? Math.min(MAX_PAGES_ABSOLUTO, Math.ceil(esperado / pace.count) * 2 + 20)
      : MAX_PAGES_ABSOLUTO;

    for (let page = 0; page < limite; page++) {
      if (cancelled) throw fail('CANCELADO', 'Cancelado.');

      await agendador.vez();

      const data = await igFetchRetry(estrategia.url(kind, userId, pace.count, maxId), (espera) => {
        agendador.pausar(espera);
        onProgress(out.length, { esperandoAte: Date.now() + espera });
      });

      const extraido = estrategia.extrair(data, kind);
      if (!extraido) throw fail('FORMATO_INESPERADO', 'O Instagram mudou o formato da resposta no meio da leitura.');
      const users = extraido.users;
      const antes = out.length;
      for (const u of users) {
        if (!u || !u.username) continue;
        const chave = u.username.toLowerCase();
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        out.push(pick(u));
      }
      onProgress(out.length, {});

      // Páginas seguidas só com perfis repetidos significam cursor girando em
      // falso: melhor parar do que ficar rodando para sempre.
      paginasSemNovidade = out.length > antes ? 0 : paginasSemNovidade + 1;
      if (paginasSemNovidade >= 3) break;

      const proximo = extraido.proximo;
      if (!users.length || proximo == null || proximo === '' || String(proximo) === String(anterior)) break;
      anterior = proximo;
      maxId = proximo;
      estadoLista.maxId = maxId; // ponto de retomada, caso a aba morra aqui
    }

    estadoLista.completo = true;
    return out;
  }

  /* ───────── progresso retomável ───────── */

  const CHAVE_PROGRESSO = 'scanProgress';
  const VALIDADE_PROGRESSO = 15 * 60 * 1000;

  async function lerProgresso(target) {
    try {
      const { [CHAVE_PROGRESSO]: p } = await chrome.storage.local.get(CHAVE_PROGRESSO);
      if (!p || p.targetId !== target.id) return null;
      if (Date.now() - (p.atualizadoEm || 0) > VALIDADE_PROGRESSO) return null;
      return p;
    } catch {
      return null;
    }
  }

  function novaLista() {
    return { itens: [], maxId: null, completo: false };
  }

  async function limparProgresso() {
    try {
      await chrome.storage.local.remove(CHAVE_PROGRESSO);
    } catch {
      /* sem problema: o progresso vence sozinho */
    }
  }

  async function run(options) {
    const base = PACE[options.pace] || PACE.minuto;
    try {
      report({ phase: 'resolvendo', counts: { followers: 0, following: 0 } });
      const target = await resolveTarget(options.username);

      // Com os totais do perfil em mãos, o ritmo é ajustado ao tamanho da conta.
      const { ritmo: pace, paginas, estimativaMs } = calibrar(base, target);

      // Retoma de onde parou quando a coleta anterior morreu no meio (aba
      // recarregada, por exemplo), em vez de recomeçar do zero.
      // Descobre a forma de leitura que funciona nesta conta antes de começar.
      const { estrategia } = await detectarEstrategia(target.id);

      const salvo = options.retomar ? await lerProgresso(target) : null;
      const listas = {
        followers: (salvo && salvo.followers) || novaLista(),
        following: (salvo && salvo.following) || novaLista(),
      };

      report({
        phase: 'coletando',
        target,
        counts: { followers: listas.followers.itens.length, following: listas.following.itens.length },
        pace: { ...pace, nome: options.pace || 'minuto' },
        plano: { paginas, estimativaMs, alvoSegundos: base.alvoSegundos || null },
        retomado: !!salvo,
        estrategia: estrategia.nome,
      });

      // As duas listas são lidas ao mesmo tempo, dividindo o mesmo agendador:
      // a taxa de requisições continua a do ritmo escolhido, mas o tempo total
      // cai porque a latência de uma requisição cobre a espera da outra.
      const agendador = criarAgendador(pace);
      const contagens = {
        followers: listas.followers.itens.length,
        following: listas.following.itens.length,
      };

      let ultimoSalvamento = 0;
      const salvarProgresso = async () => {
        if (Date.now() - ultimoSalvamento < 3000) return;
        ultimoSalvamento = Date.now();
        try {
          await chrome.storage.local.set({
            [CHAVE_PROGRESSO]: {
              targetId: target.id,
              atualizadoEm: Date.now(),
              followers: listas.followers,
              following: listas.following,
            },
          });
        } catch {
          /* se o storage encher, seguimos sem ponto de retomada */
        }
      };

      const avisar = (extra) => {
        report({ phase: 'coletando', counts: { ...contagens }, ...extra });
        salvarProgresso();
      };

      const [followers, following] = await Promise.all([
        fetchList('followers', target.id, pace, agendador, target.totalSeguidores, listas.followers, estrategia, (n, extra) => {
          contagens.followers = n;
          avisar(extra);
        }),
        fetchList('following', target.id, pace, agendador, target.totalSeguindo, listas.following, estrategia, (n, extra) => {
          contagens.following = n;
          avisar(extra);
        }),
      ]);

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
      await limparProgresso();
      chrome.runtime.sendMessage({ type: 'SCAN_DONE', counts: { followers: followers.length, following: following.length } }).catch(() => {});
    } catch (e) {
      if (e && e.code === 'CANCELADO') {
        await limparProgresso();
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
