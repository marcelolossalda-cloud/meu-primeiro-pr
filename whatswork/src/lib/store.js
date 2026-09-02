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
    aiEnabled: false,            // IA desligada até você colocar a chave
    aiModel: 'claude-opus-5',
    aiContextMessages: 12,       // quantas mensagens vão como contexto para a IA
    businessContext: '',         // o que você vende, preços, prazos — a IA se apoia nisso
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

  /* ---------------------------------------------------------------- tags */

  function listTags() {
    return get(K.TAGS, null).then(function (tags) {
      if (tags) return tags;
      return put(K.TAGS, DEFAULT_TAGS.slice());
    });
  }

  function addTag(name, color) {
    return listTags().then(function (tags) {
      var tag = { id: uid('tag'), name: name, color: color || '#6b7280' };
      tags.push(tag);
      return put(K.TAGS, tags).then(function () { return tag; });
    });
  }

  function removeTag(tagId) {
    return listTags().then(function (tags) {
      return put(K.TAGS, tags.filter(function (t) { return t.id !== tagId; }));
    }).then(function () {
      return get(K.CONTACTS, {});
    }).then(function (contacts) {
      Object.keys(contacts).forEach(function (jid) {
        contacts[jid].tags = (contacts[jid].tags || []).filter(function (id) { return id !== tagId; });
      });
      return put(K.CONTACTS, contacts);
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
    return listContacts().then(function (all) {
      var now = Date.now();
      var current = all[jid] || {
        jid: jid,
        name: '',
        phone: jidToPhone(jid),
        tags: [],
        notes: [],
        createdAt: now
      };
      var next = Object.assign({}, current, patch || {}, { jid: jid, updatedAt: now });
      all[jid] = next;
      return put(K.CONTACTS, all).then(function () { return next; });
    });
  }

  function addNote(jid, text) {
    if (!text || !text.trim()) return Promise.resolve(null);
    return getContact(jid).then(function (c) {
      var notes = (c && c.notes ? c.notes.slice() : []);
      notes.unshift({ id: uid('note'), text: text.trim(), ts: Date.now() });
      return upsertContact(jid, { notes: notes });
    });
  }

  function removeNote(jid, noteId) {
    return getContact(jid).then(function (c) {
      if (!c) return null;
      return upsertContact(jid, {
        notes: (c.notes || []).filter(function (n) { return n.id !== noteId; })
      });
    });
  }

  function toggleTag(jid, tagId) {
    return getContact(jid).then(function (c) {
      var tags = (c && c.tags ? c.tags.slice() : []);
      var i = tags.indexOf(tagId);
      if (i === -1) tags.push(tagId); else tags.splice(i, 1);
      return upsertContact(jid, { tags: tags });
    });
  }

  /* ------------------------------------------------------------- modelos */

  function listTemplates() {
    return get(K.TEMPLATES, []);
  }

  function saveTemplate(tpl) {
    return listTemplates().then(function (list) {
      if (tpl.id) {
        var i = list.findIndex(function (t) { return t.id === tpl.id; });
        if (i !== -1) list[i] = Object.assign({}, list[i], tpl);
      } else {
        tpl.id = uid('tpl');
        list.push(tpl);
      }
      return put(K.TEMPLATES, list).then(function () { return tpl; });
    });
  }

  function removeTemplate(id) {
    return listTemplates().then(function (list) {
      return put(K.TEMPLATES, list.filter(function (t) { return t.id !== id; }));
    });
  }

  /* ----------------------------------------------------------- agendados */

  /* status: pending -> due -> sent | failed */
  function listScheduled() {
    return get(K.SCHEDULED, []);
  }

  function addScheduled(item) {
    return listScheduled().then(function (list) {
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
      return put(K.SCHEDULED, list).then(function () { return record; });
    });
  }

  function updateScheduled(id, patch) {
    return listScheduled().then(function (list) {
      var i = list.findIndex(function (s) { return s.id === id; });
      if (i === -1) return null;
      list[i] = Object.assign({}, list[i], patch);
      return put(K.SCHEDULED, list).then(function () { return list[i]; });
    });
  }

  function removeScheduled(id) {
    return listScheduled().then(function (list) {
      return put(K.SCHEDULED, list.filter(function (s) { return s.id !== id; }));
    });
  }

  /* ----------------------------------------------------------- lembretes */

  function listReminders() {
    return get(K.REMINDERS, []);
  }

  function addReminder(item) {
    return listReminders().then(function (list) {
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
      return put(K.REMINDERS, list).then(function () { return record; });
    });
  }

  function updateReminder(id, patch) {
    return listReminders().then(function (list) {
      var i = list.findIndex(function (r) { return r.id === id; });
      if (i === -1) return null;
      list[i] = Object.assign({}, list[i], patch);
      return put(K.REMINDERS, list).then(function () { return list[i]; });
    });
  }

  function removeReminder(id) {
    return listReminders().then(function (list) {
      return put(K.REMINDERS, list.filter(function (r) { return r.id !== id; }));
    });
  }

  /* ------------------------------------------------------------- ajustes */

  function getSettings() {
    return get(K.SETTINGS, {}).then(function (saved) {
      return Object.assign({}, DEFAULT_SETTINGS, saved || {});
    });
  }

  function saveSettings(patch) {
    return getSettings().then(function (current) {
      return put(K.SETTINGS, Object.assign({}, current, patch || {}));
    });
  }

  /* A chave da API fica separada do resto para nunca sair junto num export. */
  function getApiKey() { return get(K.APIKEY, ''); }
  function setApiKey(key) { return put(K.APIKEY, String(key || '').trim()); }

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
    return Promise.all([getSettings(), getSendState()]).then(function (r) {
      var s = r[0], state = r[1];
      var log = (state.log || []).filter(function (t) { return now - t < 86400000; });
      log.push(now);
      var espera = (s.minIntervalSeconds * 1000) + Math.floor(Math.random() * (s.jitterSeconds * 1000));
      return put(K.SENDSTATE, { log: log, nextAllowedAt: now + espera });
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
    getSendState: getSendState,
    checkSendAllowance: checkSendAllowance,
    recordSend: recordSend,
    jidToPhone: jidToPhone,
    phoneToJid: phoneToJid
  });
})(typeof globalThis !== 'undefined' ? globalThis : self);
