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

  // Referer usado nas chamadas de lista. O Instagram trata o parametro
  // search_surface=follow_list_page como vindo da pagina do perfil; mandando do
  // feed, algumas contas recebem 200 com lista vazia.
  let referrerPerfil = null;

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
    if (msg.type === 'DEIXAR_DE_SEGUIR' || msg.type === 'SEGUIR_DE_NOVO') {
      acaoDeSeguir(msg.userId, msg.type === 'SEGUIR_DE_NOVO').then(
        (r) => sendResponse(r),
        (e) => sendResponse({ ok: false, erro: (e && e.message) || String(e) })
      );
      return true; // resposta assíncrona
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

    // Reproduz o mesmo preparo da análise, para o diagnóstico valer de verdade.
    try {
      const d = await igFetch('/api/v1/users/' + id + '/info/');
      const nome = d && d.user && d.user.username;
      if (nome) {
        referrerPerfil = 'https://www.instagram.com/' + nome + '/';
        linhas.push({ ok: true, texto: 'Perfil identificado: @' + nome + ' · ' + (d.user.follower_count || 0) + ' seguidores' });
        try {
          await igFetch('/api/v1/users/web_profile_info/?username=' + encodeURIComponent(nome));
          linhas.push({ ok: true, texto: 'Aquecimento da sessão: ok' });
        } catch (e) {
          linhas.push({ ok: false, texto: 'Aquecimento da sessão falhou: ' + (e.code || e.message) });
        }
      }
    } catch (e) {
      linhas.push({ ok: false, texto: 'Não consegui ler os dados do seu perfil: ' + (e.message || e) });
    }

    linhas.push({
      ok: true,
      texto: 'Cookies: csrftoken ' + (getCookie('csrftoken') ? 'ok' : 'ausente') +
        ', sessionid ' + (getCookie('sessionid') ? 'ok' : 'ausente') +
        ', www-claim ' + (lerClaim() ? 'ok' : 'ausente'),
    });

    let algumaFuncionou = false;
    for (const est of ESTRATEGIAS) {
      try {
        const d = await igFetch(est.url('followers', id, 12, null));
        const r = est.extrair(d, 'followers');
        if (r && Array.isArray(r.users) && r.users.length > 0) {
          algumaFuncionou = true;
          linhas.push({ ok: true, texto: 'Leitura "' + est.nome + '": funcionou (' + r.users.length + ' perfis de teste)' });
        } else if (r && Array.isArray(r.users)) {
          linhas.push({ ok: false, texto: 'Leitura "' + est.nome + '": respondeu 200 mas com lista VAZIA' });
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
  function criarAgendador(pace, prazo, paginasRestantes) {
    let proximoLivre = 0;

    // Com prazo definido, o intervalo é recalculado a cada requisição: se a
    // leitura precisar de uma segunda via para completar, o ritmo aperta
    // sozinho para ainda caber no tempo — sempre acima do piso de segurança.
    const intervaloAtual = () => {
      if (!prazo || !paginasRestantes) return jitter(pace);
      const sobra = prazo - Date.now();
      const faltam = Math.max(1, paginasRestantes());
      const piso = pace.piso || 200;
      const teto = pace.teto || 1500;
      if (sobra <= 0) return piso;
      const ideal = Math.floor(sobra / faltam);
      const base = Math.max(piso, Math.min(teto, ideal));
      return Math.round(base * (0.85 + Math.random() * 0.3));
    };

    return {
      async vez() {
        const agora = Date.now();
        const alvo = Math.max(agora, proximoLivre);
        proximoLivre = alvo + intervaloAtual();
        if (alvo > agora) await sleep(alvo - agora);
      },
      /** Segura todas as requisicoes por um tempo (usado no backoff de 429). */
      pausar(ms) {
        proximoLivre = Math.max(proximoLivre, Date.now() + ms);
      },
      /** Quanto ainda cabe no prazo, em ms (Infinity quando não há prazo). */
      sobraTempo() {
        return prazo ? prazo - Date.now() : Infinity;
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

    const init = { credentials: 'include', headers };
    if (referrerPerfil) {
      init.referrer = referrerPerfil;
      init.referrerPolicy = 'strict-origin-when-cross-origin';
    }

    const res = await fetch('https://www.instagram.com' + path, init);
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

  /**
   * Descobre qual estrategia funciona nesta conta, com uma chamada leve.
   * Uma estrategia que responde 200 com lista VAZIA numa conta que tem
   * seguidores nao serve: seria aceita e devolveria zero perfis no fim.
   */
  async function detectarEstrategia(userId, esperado, kind) {
    const falhas = [];
    const alvo = kind || 'following';
    for (const est of ESTRATEGIAS) {
      try {
        const d = await igFetch(est.url(alvo, userId, 12, null));
        const r = est.extrair(d, alvo);

        if (!r || !Array.isArray(r.users)) {
          falhas.push(est.nome + ': resposta sem lista de perfis');
          continue;
        }
        if (esperado > 0 && r.users.length === 0) {
          falhas.push(est.nome + ': devolveu lista vazia');
          continue;
        }
        return { estrategia: est, falhas };
      } catch (e) {
        falhas.push(est.nome + ': ' + (e.code || 'erro'));
        // 429 e sessão inválida não melhoram trocando de estratégia
        if (e.code === 'RATE_LIMIT' || e.code === 'NAO_AUTENTICADO') throw e;
      }
    }

    throw fail(
      esperado > 0 ? 'LISTAS_VAZIAS' : 'SEM_ESTRATEGIA',
      'Nenhuma das formas de leitura devolveu perfis (' + falhas.join(' · ') + ').'
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

  /**
   * Le a lista inteira. Se a estrategia escolhida parar antes do total que o
   * perfil informa — o Instagram corta a paginacao de listas grandes —, tenta
   * as outras estrategias e fica com a leitura mais completa. Lista truncada e
   * pior que lista nenhuma: quem te segue e nao foi lido aparece como se nao
   * seguisse.
   */
  async function coletarCompleto(kind, userId, pace, agendador, esperado, estadoLista, estrategia, onProgress) {
    const reunidos = new Map();
    const juntar = (lista) => {
      for (const u of lista) {
        const k = String(u.username).toLowerCase();
        if (!reunidos.has(k)) reunidos.set(k, u);
      }
      return reunidos.size;
    };

    juntar(await fetchList(kind, userId, pace, agendador, esperado, estadoLista, estrategia, onProgress));
    if (!esperado || reunidos.size >= esperado * 0.98) return [...reunidos.values()];

    // Faltou gente. Cada via corta em um ponto diferente, então o que elas
    // trazem é UNIDO — nunca substituído — para não perder ninguém.
    for (const alt of ESTRATEGIAS) {
      if (alt.nome === estrategia.nome || cancelled) continue;
      // Sem folga no prazo, não adianta insistir: o corte é do Instagram e a
      // conferência conta a conta já assegura a lista principal.
      if (agendador.sobraTempo() < 20000) break;

      try {
        const parcial = await fetchList(kind, userId, pace, agendador, esperado, novaLista(), alt, (n, extra) =>
          onProgress(reunidos.size + n, extra)
        );
        onProgress(juntar(parcial), {});
        if (reunidos.size >= esperado * 0.98) break;
      } catch {
        /* esta via não serviu: tenta a próxima */
      }
    }

    return [...reunidos.values()];
  }

  /**
   * Pergunta ao Instagram, para cada conta que voce segue, se ela te segue de
   * volta. E a fonte precisa da lista principal: nao depende de paginar a lista
   * inteira de seguidores, que o Instagram corta em contas grandes.
   * Responde em lotes de 100, entao 800 perfis custam 8 requisicoes.
   */
  async function verificarRelacoes(ids, agendador, onProgress) {
    const mapa = new Map();
    const LOTE = 100;

    for (let i = 0; i < ids.length; i += LOTE) {
      if (cancelled) throw fail('CANCELADO', 'Cancelado.');
      const lote = ids.slice(i, i + LOTE);

      await agendador.vez();

      const init = {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-ig-app-id': IG_APP_ID,
          'x-asbd-id': IG_ASBD_ID,
          'x-csrftoken': getCookie('csrftoken') || '',
          'x-requested-with': 'XMLHttpRequest',
        },
        body: 'user_ids=' + lote.join(','),
      };
      const claim = lerClaim();
      if (claim) init.headers['x-ig-www-claim'] = claim;
      if (referrerPerfil) {
        init.referrer = referrerPerfil;
        init.referrerPolicy = 'strict-origin-when-cross-origin';
      }

      const res = await fetch('https://www.instagram.com/api/v1/friendships/show_many/', init);
      guardarClaim(res);
      if (!res.ok) throw fail('SHOW_MANY_HTTP_' + res.status, 'show_many respondeu ' + res.status);

      const texto = await res.text();
      let d;
      try {
        d = JSON.parse(texto);
      } catch {
        throw fail('SHOW_MANY_INVALIDO', 'show_many não respondeu em JSON');
      }

      const status = d && d.friendship_statuses;
      if (!status || typeof status !== 'object') throw fail('SHOW_MANY_VAZIO', 'show_many não trouxe as relações');

      for (const [idUsuario, info] of Object.entries(status)) {
        if (info && typeof info.followed_by === 'boolean') mapa.set(String(idUsuario), info.followed_by);
      }
      if (onProgress) onProgress(mapa.size);
    }

    return mapa;
  }

  /**
   * Deixa de seguir (ou volta a seguir) uma conta. E a unica funcao da extensao
   * que altera algo: so roda a pedido explicito, um perfil por vez.
   */
  async function acaoDeSeguir(userId, voltarASeguir) {
    const id = String(userId || '').trim();
    if (!/^\d+$/.test(id)) throw fail('ID_INVALIDO', 'Não sei o identificador dessa conta. Analise de novo.');

    const init = {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-ig-app-id': IG_APP_ID,
        'x-asbd-id': IG_ASBD_ID,
        'x-csrftoken': getCookie('csrftoken') || '',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: '',
    };
    const claim = lerClaim();
    if (claim) init.headers['x-ig-www-claim'] = claim;
    if (referrerPerfil) {
      init.referrer = referrerPerfil;
      init.referrerPolicy = 'strict-origin-when-cross-origin';
    }

    const caminho = '/api/v1/friendships/' + (voltarASeguir ? 'create' : 'destroy') + '/' + id + '/';
    const res = await fetch('https://www.instagram.com' + caminho, init);
    guardarClaim(res);

    if (res.status === 429) throw fail('RATE_LIMIT', 'O Instagram pediu uma pausa. Espere um pouco antes de continuar.');
    if (res.status === 401 || res.status === 403) throw fail('NAO_AUTENTICADO', 'Sessão recusada. Faça login no instagram.com.');
    if (!res.ok) throw fail('HTTP_' + res.status, 'O Instagram respondeu ' + res.status + '.');

    const texto = await res.text();
    let d;
    try {
      d = JSON.parse(texto);
    } catch {
      throw fail('RESPOSTA_INVALIDA', 'O Instagram não confirmou a ação. Confira no site antes de repetir.');
    }
    if (d && d.status !== 'ok') throw fail('IG_FAIL', d.message || 'O Instagram recusou a ação.');

    return { ok: true, seguindo: !!(d && d.friendship_status && d.friendship_status.following) };
  }

  /**
   * Confere uma relacao isolada. Este endpoint e a fonte confiavel de
   * followed_by; o show_many em lote nem sempre preenche esse campo.
   */
  async function relacaoIndividual(userId) {
    const d = await igFetch('/api/v1/friendships/show/' + userId + '/');
    if (!d || typeof d.followed_by !== 'boolean') return null;
    return { meSegue: d.followed_by, euSigo: !!d.following };
  }

  /**
   * Nao basta o show_many responder: e preciso que a resposta faca sentido.
   * Numa conta com seguidores, e impossivel que NINGUEM dos seguidos retribua,
   * e uma amostra conferida uma a uma denuncia respostas de fachada.
   */
  async function conferenciaConfiavel(following, relacoes, temSeguidores, agendador, aviso) {
    const valores = following
      .map((u) => relacoes.get(String(u.id)))
      .filter((v) => typeof v === 'boolean');
    if (!valores.length) return { ok: false, motivo: 'nenhuma relação veio preenchida' };

    const retribuem = valores.filter(Boolean).length;
    if (temSeguidores && retribuem === 0) {
      return { ok: false, motivo: 'a resposta diz que ninguém retribui, o que é impossível nesta conta' };
    }

    // Amostra: pega perfis que a resposta em lote deu como "não retribui" e
    // confere um a um. Uma divergência já invalida o lote inteiro.
    const negados = following.filter((u) => relacoes.get(String(u.id)) === false);
    const amostra = [];
    const passo = Math.max(1, Math.floor(negados.length / 6));
    for (let i = 0; i < negados.length && amostra.length < 6; i += passo) amostra.push(negados[i]);

    let divergencias = 0;
    for (const u of amostra) {
      if (cancelled) break;
      try {
        await agendador.vez();
        if (aviso) aviso();
        const r = await relacaoIndividual(u.id);
        if (r && r.meSegue === true) divergencias++;
      } catch {
        /* falha na amostragem não condena o lote */
      }
    }

    if (divergencias > 0) {
      return { ok: false, motivo: `${divergencias} de ${amostra.length} perfis conferidos na verdade te seguem` };
    }
    return { ok: true };
  }

  /**
   * Confere uma a uma quem retribui. E a fonte mais cara e a mais confiavel:
   * usada quando a resposta em lote nao passa na prova. Quem ja aparece na
   * lista de seguidores lida nao precisa de requisicao.
   */
  async function conferirUmAUm(following, seguidoresLidos, onProgress, aoAvancar) {
    const jaConfirmados = new Set(seguidoresLidos.map((u) => String(u.username).toLowerCase()));
    const agendaConferencia = criarAgendador({ min: 100, max: 200, count: 1 });

    let feitos = 0;
    let falhasSeguidas = 0;

    for (const u of following) {
      if (cancelled) throw fail('CANCELADO', 'Cancelado.');

      if (jaConfirmados.has(String(u.username).toLowerCase())) {
        u.me_segue = true;
        onProgress(++feitos, following.length);
        continue;
      }

      try {
        await agendaConferencia.vez();
        const r = await relacaoIndividual(u.id);
        if (r) {
          u.me_segue = r.meSegue;
          falhasSeguidas = 0;
        } else {
          falhasSeguidas++;
        }
      } catch (e) {
        if (e.code === 'RATE_LIMIT') throw e;
        falhasSeguidas++;
        // Muitas falhas seguidas significam que esta via também fechou.
        if (falhasSeguidas >= 10) throw fail('CONFERENCIA_FALHOU', 'O Instagram parou de responder à conferência.');
      }

      onProgress(++feitos, following.length);

      // Resultado parcial a cada 40 perfis: a lista vai aparecendo na tela
      // enquanto a conferência continua, em vez de uma barra por minutos.
      if (aoAvancar && feitos % 40 === 0) await aoAvancar(feitos);
    }

    return following.filter((u) => typeof u.me_segue === 'boolean').length;
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
      // Faz as chamadas saírem como se viessem da página do perfil.
      if (target.username) referrerPerfil = 'https://www.instagram.com/' + target.username + '/';

      // Aquecimento: esta chamada devolve o cabeçalho x-ig-set-www-claim, que
      // o app web manda em toda leitura de lista. Sem ele, parte das contas
      // recebe resposta vazia.
      if (target.username) {
        try {
          await igFetch('/api/v1/users/web_profile_info/?username=' + encodeURIComponent(target.username));
        } catch {
          /* o aquecimento é um bônus: se falhar, a leitura ainda é tentada */
        }
      }

      // Descobre a forma de leitura que funciona nesta conta antes de começar.
      const { estrategia } = await detectarEstrategia(target.id, target.totalSeguindo || 0, 'following');

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
      const prazo = base.alvoSegundos ? Date.now() + base.alvoSegundos * 1000 - MARGEM_MS : null;
      const paginasRestantes = () => {
        const fSeg = Math.max(0, (target.totalSeguidores || 0) - contagens.followers);
        const fSig = Math.max(0, (target.totalSeguindo || 0) - contagens.following);
        return Math.ceil(fSeg / pace.count) + Math.ceil(fSig / pace.count);
      };

      const agendador = criarAgendador({ ...pace, piso: base.piso || 200, teto: base.teto || 1500 }, prazo, paginasRestantes);
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

      // Por padrão lemos só "quem você segue": a lista de seguidores custa
      // muitas requisições, vem cortada em contas grandes e não é necessária
      // para a resposta principal, que sai da conferência conta a conta.
      const lerSeguidores = options.completo === true;

      const tarefas = [
        coletarCompleto('following', target.id, pace, agendador, target.totalSeguindo, listas.following, estrategia, (n, extra) => {
          contagens.following = n;
          avisar(extra);
        }),
      ];
      if (lerSeguidores) {
        tarefas.push(
          coletarCompleto('followers', target.id, pace, agendador, target.totalSeguidores, listas.followers, estrategia, (n, extra) => {
            contagens.followers = n;
            avisar(extra);
          })
        );
      }

      const resultados = await Promise.all(tarefas);
      let following = resultados[0];
      let followers = lerSeguidores ? resultados[1] : [];

      // Fonte precisa da lista principal: pergunta conta a conta quem retribui.
      // Não depende da lista de seguidores, que vem cortada em perfis grandes.
      const eSeguidores = target.totalSeguidores || 0;
      const eSeguindo = target.totalSeguindo || 0;
      let verificado = false;
      let motivoSemConferencia = null;
      try {
        const ids = following.map((u) => String(u.id || '')).filter((x) => x && /^\d+$/.test(x));
        if (ids.length && ids.length >= following.length * 0.9) {
          report({ phase: 'conferindo', counts: { ...contagens } });
          const relacoes = await verificarRelacoes(ids, agendador, (n) =>
            report({ phase: 'conferindo', counts: { ...contagens }, conferidos: n, aConferir: ids.length })
          );
          if (relacoes.size >= ids.length * 0.95) {
            const prova = await conferenciaConfiavel(
              following,
              relacoes,
              (target.totalSeguidores || 0) > 0,
              agendador,
              () => report({ phase: 'conferindo', counts: { ...contagens }, validando: true })
            );

            if (prova.ok) {
              for (const u of following) {
                const v = relacoes.get(String(u.id));
                if (typeof v === 'boolean') u.me_segue = v;
              }
              verificado = true;
            } else {
              motivoSemConferencia = prova.motivo;
            }
          }
        }
      } catch {
        /* sem show_many, a comparação por conjuntos continua valendo */
      }

      // Lote reprovado: primeiro lê a lista de seguidores. Se ela vier
      // completa, a comparação entre as duas listas já é exata e não custa
      // mais nenhuma requisição. Só o que sobrar precisa de conferência
      // individual — que é confiável, porém cara.
      let fonte = verificado ? 'lote' : null;

      if (!verificado) {
        if (!lerSeguidores) {
          report({ phase: 'coletando', counts: { ...contagens }, recuperando: true });
          followers = await coletarCompleto(
            'followers', target.id, pace, agendador, target.totalSeguidores,
            listas.followers, estrategia,
            (n, extra) => { contagens.followers = n; avisar(extra); }
          );
        }

        const seguidoresCompletos =
          (target.totalSeguidores || 0) > 0 && followers.length >= (target.totalSeguidores || 0) * 0.98;

        if (seguidoresCompletos) {
          // Listas completas dos dois lados: a comparação direta é exata.
          verificado = true;
          fonte = 'listas';
          motivoSemConferencia = null;
        } else {
          try {
            const publicarParcial = async (feitos) => {
              const prontos = following.filter((u) => typeof u.me_segue === 'boolean');
              await salvar({
                version: 1,
                source: 'live',
                target,
                scannedAt: Date.now(),
                followers,
                following: prontos,
                parcial: true,
                emAndamento: { feitos, total: following.length },
                oficial: { seguidores: eSeguidores, seguindo: eSeguindo },
                verificado: true,
                fonte: 'individual',
                estrategia: estrategia.nome,
              });
            };

            const conferidos = await conferirUmAUm(
              following,
              followers,
              (n, total) => report({ phase: 'conferindo', counts: { ...contagens }, conferidos: n, aConferir: total, umAUm: true }),
              publicarParcial
            );
            if (conferidos >= following.length * 0.95) {
              verificado = true;
              fonte = 'individual';
              motivoSemConferencia = null;
            }
          } catch (e) {
            if (!motivoSemConferencia) motivoSemConferencia = (e && e.message) || 'conferência interrompida';
          }
        }
      }

      // Conferência contra os números oficiais do perfil: se as listas vierem
      // trocadas (seguidores no lugar de seguindo), tudo apareceria invertido.
      // Os totais do perfil permitem detectar e corrigir isso.
      let trocadas = false;

      const perto = (a, b) => b > 0 && Math.abs(a - b) <= Math.max(3, b * 0.1);
      const totaisDistintos = lerSeguidores && eSeguidores > 0 && eSeguindo > 0 &&
        Math.abs(eSeguidores - eSeguindo) > Math.max(5, Math.max(eSeguidores, eSeguindo) * 0.1);

      if (totaisDistintos) {
        const naOrdem = perto(followers.length, eSeguidores) && perto(following.length, eSeguindo);
        const aoContrario = perto(followers.length, eSeguindo) && perto(following.length, eSeguidores);
        if (aoContrario && !naOrdem) {
          const tmp = followers;
          followers = following;
          following = tmp;
          trocadas = true;
        }
      }

      // Aviso de coleta incompleta: uma lista parcial acusaria como "não te
      // segue" gente que na verdade segue. Comparamos com o total do perfil.
      const esperado = eSeguidores + eSeguindo;
      const obtido = followers.length + following.length;

      // Zero perfis numa conta que tem conexões não é "resultado parcial": é
      // falha. Salvar isso mostraria uma tela de zeros como se fosse resposta.
      if (!lerSeguidores && following.length === 0 && eSeguindo > 0) {
        throw fail('LISTAS_VAZIAS', 'O Instagram devolveu vazia a lista de quem você segue.');
      }
      if (lerSeguidores && esperado > 0 && obtido === 0) {
        throw fail(
          'LISTAS_VAZIAS',
          'O Instagram respondeu, mas devolveu as listas vazias, embora o perfil tenha ' +
            esperado.toLocaleString('pt-BR') + ' conexões.'
        );
      }

      const resultado = {
        version: 1,
        source: 'live',
        target,
        scannedAt: Date.now(),
        followers,
        following,
        parcial:
          (!verificado && eSeguidores > 0 && followers.length < eSeguidores * 0.95) ||
          (lerSeguidores && eSeguidores > 0 && followers.length < eSeguidores * 0.95) ||
          (eSeguindo > 0 && following.length < eSeguindo * 0.95),
        semSeguidores: !lerSeguidores && verificado,
        motivoSemConferencia,
        // guardados para a tela poder mostrar coletado x oficial
        oficial: { seguidores: eSeguidores, seguindo: eSeguindo },
        verificado,
        fonte,
        trocadas,
        estrategia: estrategia.nome,
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
