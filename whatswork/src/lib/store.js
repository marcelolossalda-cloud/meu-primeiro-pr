/*
 * Camada de persistência da extensão.
 *
 * Escrito como script clássico (sem `export`) porque o mesmo arquivo é
 * carregado de três lugares diferentes: content script, service worker
 * (via importScripts) e popup (via <script src>).
 */
(function (root) {
  'use strict';

  var K = {
    CONTACTS: 'whatswork:contacts',
    TAGS: 'whatswork:tags',
    TEMPLATES: 'whatswork:templates',
    SCHEDULED: 'whatswork:scheduled',
    REMINDERS: 'whatswork:reminders',
    SETTINGS: 'whatswork:settings',
    SENDSTATE: 'whatswork:sendstate',
    APIKEY: 'whatswork:apikey'
  };

  /*
   * Contexto do negócio que a IA usa para não falar genérico.
   *
   * O que não está aqui, o modelo é instruído a marcar como [preencher] em vez
   * de inventar — por isso preço fica em aberto até que o dono preencha. Tudo
   * é editável no popup da extensão.
   */
  var NEGOCIO = [
    'Distribuidora de cosméticos profissionais.',
    '',
    'Marcas trabalhadas: Southliss, Ghoodess, Aella.',
    '',
    'São DOIS públicos, com condições diferentes — a conversa diz qual é:',
    '',
    '1) SALÃO DE BELEZA (atacado): revenda e uso profissional.',
    '   Regiões atendidas: São Borja/RS, Itaqui/RS, São Luiz Gonzaga/RS e Santiago/RS.',
    '   Pedido mínimo: R$ 500,00.',
    '',
    '2) CONSUMIDOR FINAL (home care): linha de cuidado em casa, das mesmas marcas.',
    '   Sem pedido mínimo.',
    '',
    'Se não estiver claro de qual público a pessoa é, PERGUNTE antes de falar de preço',
    'ou de pedido mínimo — as condições não são as mesmas.',
    '',
    'Pagamento: dinheiro, Pix, cartão de crédito, cartão de débito e boleto.',
    'Entrega: nas cidades listadas acima. Prazo: [preencher].',
    'Preços: [preencher] — nunca cite valor que não esteja escrito aqui.'
  ].join('\n');

  /*
   * Padrões pensados para proteger o número, não para produtividade máxima.
   * Quem quiser afrouxar faz isso conscientemente, no popup.
   */
  var DEFAULT_SETTINGS = {
    requireConfirmation: true,   // nada sai sozinho: você clica em "Enviar agora"
    minIntervalSeconds: 90,      // respiro mínimo entre dois envios automáticos
    jitterSeconds: 60,           // atraso aleatório extra, para não virar metrônomo
    maxPerHour: 6,
    maxPerDay: 30,
    quietStartHour: 21,          // nada de mensagem automática de madrugada
    quietEndHour: 8,
    staleDays: 60,               // acima disso o cliente entra na lista de reativação
    aiEnabled: false,            // IA desligada até você colocar a chave
    aiProvider: 'claude',        // 'claude' ou 'gemini'
    aiModelClaude: 'claude-opus-5',
    aiModelGemini: 'gemini-3.6-flash',
    aiContextMessages: 12,       // quantas mensagens vão como contexto para a IA
    businessContext: NEGOCIO,    // o que você vende — a IA se apoia só nisso
    voiceStyle: ''               // como VOCÊ escreve: tom, ritmo, o que nunca diria
  };

  var DEFAULT_TAGS = [
    { id: 'lead', name: 'Lead', color: '#2563eb' },
    { id: 'negociando', name: 'Negociando', color: '#d97706' },
    { id: 'cliente', name: 'Cliente', color: '#16a34a' },
    { id: 'perdido', name: 'Perdido', color: '#dc2626' }
  ];

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function get(key, fallback) {
    return chrome.storage.local.get(key).then(function (out) {
      return out[key] === undefined ? fallback : out[key];
    });
  }

  function put(key, value) {
    var patch = {};
    patch[key] = value;
    return chrome.storage.local.set(patch).then(function () { return value; });
  }

  /* ------------------------------------------------- escrita serializada

     Toda alteração aqui é ler-alterar-gravar sobre uma única chave. Duas
     dessas em paralelo se atropelam: a segunda lê o estado anterior à
     primeira e grava por cima, e a alteração do meio desaparece sem erro
     nenhum. Num CRM isso é anotação de cliente sumindo em silêncio.

     A fila abaixo garante que uma alteração só comece depois que a anterior
     terminou. As leituras continuam livres — só a escrita é serializada. */

  var fila = Promise.resolve();

  function naFila(fn) {
    var proximo = fila.then(fn, fn);
    // A fila não pode travar por causa de uma falha isolada.
    fila = proximo.then(function () {}, function () {});
    return proximo;
  }

  /**
   * Lê `chave`, deixa `fn` alterar o valor no lugar e grava de volta,
   * tudo dentro da fila. `fn` devolve o que a chamada deve resolver.
   */
  function atualizar(chave, padrao, fn) {
    return naFila(function () {
      return get(chave, padrao).then(function (dados) {
        var retorno = fn(dados);
        return put(chave, dados).then(function () {
          return retorno === undefined ? dados : retorno;
        });
      });
    });
  }

  /* ---------------------------------------------------------------- tags */

  function listTags() {
    return get(K.TAGS, null).then(function (tags) {
      if (tags) return tags;
      return put(K.TAGS, DEFAULT_TAGS.slice());
    });
  }

  function addTag(name, color) {
    return listTags().then(function () {
      return atualizar(K.TAGS, DEFAULT_TAGS.slice(), function (tags) {
        var tag = { id: uid('tag'), name: name, color: color || '#6b7280' };
        tags.push(tag);
        return tag;
      });
    });
  }

  function removeTag(tagId) {
    return atualizar(K.TAGS, DEFAULT_TAGS.slice(), function (tags) {
      var i = tags.findIndex(function (t) { return t.id === tagId; });
      if (i !== -1) tags.splice(i, 1);
    }).then(function () {
      return atualizar(K.CONTACTS, {}, function (contacts) {
        Object.keys(contacts).forEach(function (jid) {
          contacts[jid].tags = (contacts[jid].tags || []).filter(function (id) { return id !== tagId; });
        });
      });
    });
  }

  /* ------------------------------------------------------------ contatos */

  function listContacts() {
    return get(K.CONTACTS, {});
  }

  function getContact(jid) {
    return listContacts().then(function (all) {
      return all[jid] || null;
    });
  }

  /** Cria o contato se ainda não existir e aplica `patch` por cima. */
  function upsertContact(jid, patch) {
    if (!jid) return Promise.resolve(null);
    return atualizar(K.CONTACTS, {}, function (all) {
      var now = Date.now();
      var current = all[jid] || {
        jid: jid,
        name: '',
        phone: jidToPhone(jid),
        tags: [],
        notes: [],
        createdAt: now
      };
      all[jid] = Object.assign({}, current, patch || {}, { jid: jid, updatedAt: now });
      return all[jid];
    });
  }

  function addNote(jid, text) {
    if (!text || !text.trim()) return Promise.resolve(null);
    return atualizar(K.CONTACTS, {}, function (all) {
      var c = all[jid];
      if (!c) return null;
      c.notes = c.notes || [];
      c.notes.unshift({ id: uid('note'), text: text.trim(), ts: Date.now() });
      c.updatedAt = Date.now();
      return c;
    });
  }

  function removeNote(jid, noteId) {
    return atualizar(K.CONTACTS, {}, function (all) {
      var c = all[jid];
      if (!c) return null;
      c.notes = (c.notes || []).filter(function (n) { return n.id !== noteId; });
      c.updatedAt = Date.now();
      return c;
    });
  }

  function toggleTag(jid, tagId) {
    return atualizar(K.CONTACTS, {}, function (all) {
      var c = all[jid];
      if (!c) return null;
      c.tags = c.tags || [];
      var i = c.tags.indexOf(tagId);
      if (i === -1) c.tags.push(tagId); else c.tags.splice(i, 1);
      c.updatedAt = Date.now();
      return c;
    });
  }

  /* ------------------------------------------------------------- modelos */

  function listTemplates() {
    return get(K.TEMPLATES, []);
  }

  function saveTemplate(tpl) {
    return atualizar(K.TEMPLATES, [], function (list) {
      if (tpl.id) {
        var i = list.findIndex(function (t) { return t.id === tpl.id; });
        if (i !== -1) list[i] = Object.assign({}, list[i], tpl);
      } else {
        tpl.id = uid('tpl');
        list.push(tpl);
      }
      return tpl;
    });
  }

  function removeTemplate(id) {
    return atualizar(K.TEMPLATES, [], function (list) {
      var i = list.findIndex(function (t) { return t.id === id; });
      if (i !== -1) list.splice(i, 1);
    });
  }

  /* ----------------------------------------------------------- agendados */

  /* status: pending -> due -> sent | failed */
  function listScheduled() {
    return get(K.SCHEDULED, []);
  }

  function addScheduled(item) {
    return atualizar(K.SCHEDULED, [], function (list) {
      var record = {
        id: uid('sch'),
        jid: item.jid || '',
        phone: item.phone || '',
        name: item.name || '',
        body: item.body,
        sendAt: item.sendAt,
        status: 'pending',
        createdAt: Date.now()
      };
      list.push(record);
      return record;
    });
  }

  function updateScheduled(id, patch) {
    return atualizar(K.SCHEDULED, [], function (list) {
      var i = list.findIndex(function (s) { return s.id === id; });
      if (i === -1) return null;
      list[i] = Object.assign({}, list[i], patch);
      return list[i];
    });
  }

  function removeScheduled(id) {
    return atualizar(K.SCHEDULED, [], function (list) {
      var i = list.findIndex(function (s) { return s.id === id; });
      if (i !== -1) list.splice(i, 1);
    });
  }

  /* ----------------------------------------------------------- lembretes */

  function listReminders() {
    return get(K.REMINDERS, []);
  }

  function addReminder(item) {
    return atualizar(K.REMINDERS, [], function (list) {
      var record = {
        id: uid('rem'),
        jid: item.jid || '',
        name: item.name || '',
        text: item.text,
        dueAt: item.dueAt,
        done: false,
        createdAt: Date.now()
      };
      list.push(record);
      return record;
    });
  }

  function updateReminder(id, patch) {
    return atualizar(K.REMINDERS, [], function (list) {
      var i = list.findIndex(function (r) { return r.id === id; });
      if (i === -1) return null;
      list[i] = Object.assign({}, list[i], patch);
      return list[i];
    });
  }

  function removeReminder(id) {
    return atualizar(K.REMINDERS, [], function (list) {
      var i = list.findIndex(function (r) { return r.id === id; });
      if (i !== -1) list.splice(i, 1);
    });
  }

  /* ------------------------------------------------------------- ajustes */

  function getSettings() {
    return get(K.SETTINGS, {}).then(function (saved) {
      return Object.assign({}, DEFAULT_SETTINGS, saved || {});
    });
  }

  function saveSettings(patch) {
    return atualizar(K.SETTINGS, {}, function (saved) {
      Object.assign(saved, patch || {});
    });
  }

  /* Modelo escolhido para o provedor em uso. */
  function modelFor(settings, providerName) {
    return providerName === 'gemini'
      ? (settings.aiModelGemini || DEFAULT_SETTINGS.aiModelGemini)
      : (settings.aiModelClaude || DEFAULT_SETTINGS.aiModelClaude);
  }

  function saveModelFor(providerName, model) {
    var patch = {};
    patch[providerName === 'gemini' ? 'aiModelGemini' : 'aiModelClaude'] = model;
    return saveSettings(patch);
  }

  /*
   * As chaves ficam separadas do resto dos ajustes para nunca saírem junto num
   * export, e são guardadas por provedor: trocar de provedor não apaga a chave
   * do outro. Versões antigas guardavam uma string única — daí a migração.
   */
  function readKeys() {
    return get(K.APIKEY, {}).then(function (v) {
      if (typeof v === 'string') return { claude: v };   // formato antigo
      return v || {};
    });
  }

  function getApiKey(providerName) {
    return readKeys().then(function (keys) {
      return keys[providerName || 'claude'] || '';
    });
  }

  function setApiKey(providerName, key) {
    return naFila(function () {
      return readKeys().then(function (keys) {
        keys[providerName || 'claude'] = String(key || '').trim();
        return put(K.APIKEY, keys);
      });
    });
  }

  /* ---------------------------------------------- proteção contra bloqueio

     O que faz o WhatsApp bloquear um número é padrão de comportamento:
     volume, cadência robótica, mensagem para quem não esperava e, sobretudo,
     denúncia de quem recebeu. Nada aqui é garantia — mas estes limites tiram
     do caminho tudo que é ritmo de robô. */

  function getSendState() {
    return get(K.SENDSTATE, { log: [], nextAllowedAt: 0 });
  }

  function inQuietHours(hour, s) {
    if (s.quietStartHour === s.quietEndHour) return false;   // janela desligada
    if (s.quietStartHour > s.quietEndHour) {                 // atravessa a meia-noite
      return hour >= s.quietStartHour || hour < s.quietEndHour;
    }
    return hour >= s.quietStartHour && hour < s.quietEndHour;
  }

  /**
   * Diz se um envio AUTOMÁTICO pode acontecer agora.
   * Envio que a pessoa confirmou no painel não passa por aqui — clicar é uma
   * decisão humana, e não é isso que caracteriza comportamento de robô.
   */
  function checkSendAllowance(now) {
    now = now || Date.now();
    return Promise.all([getSettings(), getSendState()]).then(function (r) {
      var s = r[0], state = r[1];
      var log = (state.log || []).filter(function (t) { return now - t < 86400000; });

      if (inQuietHours(new Date(now).getHours(), s)) {
        return { allowed: false, reason: 'fora do horário de envio (' + s.quietEndHour + 'h às ' + s.quietStartHour + 'h)' };
      }
      if (now < (state.nextAllowedAt || 0)) {
        var faltam = Math.ceil((state.nextAllowedAt - now) / 1000);
        return { allowed: false, reason: 'intervalo mínimo entre envios (faltam ' + faltam + 's)' };
      }
      var naHora = log.filter(function (t) { return now - t < 3600000; });
      if (naHora.length >= s.maxPerHour) {
        return { allowed: false, reason: 'limite de ' + s.maxPerHour + ' envios por hora atingido' };
      }
      if (log.length >= s.maxPerDay) {
        return { allowed: false, reason: 'limite de ' + s.maxPerDay + ' envios por dia atingido' };
      }
      return { allowed: true, reason: '' };
    });
  }

  /** Registra um envio (automático ou confirmado) e agenda o próximo respiro. */
  function recordSend(now) {
    now = now || Date.now();
    return getSettings().then(function (s) {
      return atualizar(K.SENDSTATE, { log: [], nextAllowedAt: 0 }, function (state) {
        state.log = (state.log || []).filter(function (t) { return now - t < 86400000; });
        state.log.push(now);
        var espera = (s.minIntervalSeconds * 1000) +
          Math.floor(Math.random() * (s.jitterSeconds * 1000));
        state.nextAllowedAt = now + espera;
      });
    });
  }

  /* ------------------------------------------------- clientes parados ---

     A régua é simples: quantos dias desde a última mensagem trocada. O dado
     vem do próprio WhatsApp (a data da última bolha da conversa), então vale
     mesmo para conversas que aconteceram antes de a extensão existir. */

  function diasSem(contato, agora) {
    if (!contato || !contato.lastContactAt) return null;
    return Math.floor((agora - contato.lastContactAt) / 86400000);
  }

  /** Contatos individuais parados há mais de `dias`, do mais esquecido para o menos. */
  function listStaleContacts(agora, dias) {
    agora = agora || Date.now();
    return Promise.all([listContacts(), getSettings()]).then(function (r) {
      var todos = r[0];
      var limite = dias || r[1].staleDays;
      return Object.keys(todos)
        .map(function (jid) { return todos[jid]; })
        .filter(function (c) {
          if (c.isGroup || !c.phone) return false;   // grupo não é cliente
          var d = diasSem(c, agora);
          return d !== null && d >= limite;
        })
        .map(function (c) {
          return {
            jid: c.jid, name: c.name, phone: c.phone,
            tags: c.tags || [], dias: diasSem(c, agora)
          };
        })
        .sort(function (a, b) { return b.dias - a.dias; });
    });
  }

  /* --------------------------------------------------------------- utils */

  /** "5511999998888@c.us" -> "5511999998888" */
  function jidToPhone(jid) {
    if (!jid || jid.indexOf('@c.us') === -1) return '';
    return jid.split('@')[0].replace(/\D/g, '');
  }

  function phoneToJid(phone) {
    var digits = String(phone || '').replace(/\D/g, '');
    return digits ? digits + '@c.us' : '';
  }

  return (root.WhatsWorkStore = {
    KEYS: K,
    uid: uid,
    get: get,
    put: put,
    listTags: listTags,
    addTag: addTag,
    removeTag: removeTag,
    listContacts: listContacts,
    getContact: getContact,
    upsertContact: upsertContact,
    addNote: addNote,
    removeNote: removeNote,
    toggleTag: toggleTag,
    listTemplates: listTemplates,
    saveTemplate: saveTemplate,
    removeTemplate: removeTemplate,
    listScheduled: listScheduled,
    addScheduled: addScheduled,
    updateScheduled: updateScheduled,
    removeScheduled: removeScheduled,
    listReminders: listReminders,
    addReminder: addReminder,
    updateReminder: updateReminder,
    removeReminder: removeReminder,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getApiKey: getApiKey,
    setApiKey: setApiKey,
    modelFor: modelFor,
    diasSem: diasSem,
    listStaleContacts: listStaleContacts,
    saveModelFor: saveModelFor,
    getSendState: getSendState,
    checkSendAllowance: checkSendAllowance,
    recordSend: recordSend,
    jidToPhone: jidToPhone,
    phoneToJid: phoneToJid
  });
})(typeof globalThis !== 'undefined' ? globalThis : self);
