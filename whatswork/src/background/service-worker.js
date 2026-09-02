/*
 * Service worker: relógio da extensão e única porta de saída para a rede.
 *
 * Duas responsabilidades que não podem morar na página:
 *  - contar o tempo (chrome.alarms) — o content script morre a cada navegação;
 *  - falar com a API da Anthropic — é aqui, e só aqui, que a chave é lida.
 */
importScripts('/src/lib/store.js', '/src/background/ai.js');

var ALARM = 'whatswork:tick';
var WHATSAPP_ORIGIN = 'https://web.whatsapp.com/';

chrome.runtime.onInstalled.addListener(function () {
  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(function () {
  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === ALARM) tick();
});

/* ------------------------------------------------- entrada de mensagens

   Toda mensagem que chega aqui é tratada como não confiável até provar
   procedência. A extensão não declara externally_connectable, então páginas
   web não conseguem falar com ela; ainda assim conferimos remetente e formato,
   porque esta é a porta que dá acesso à chave da API. */

function senderIsTrusted(sender) {
  if (!sender || sender.id !== chrome.runtime.id) return false;
  var url = typeof sender.url === 'string' ? sender.url : '';

  // A decisão é pela URL, não pela presença de sender.tab: uma página da
  // própria extensão pode estar numa aba (popup aberto em aba, página de
  // opções), e checar sender.tab primeiro a classificava como página web.
  if (url.indexOf(chrome.runtime.getURL('')) === 0) return true;

  // Content script: só o do WhatsApp Web.
  return url.indexOf(WHATSAPP_ORIGIN) === 0;
}

var HANDLERS = {
  'whatswork:reschedule': function () {
    return tick().then(function () { return { ok: true }; });
  },
  'whatswork:ai-test': function () {
    return WhatsWorkAI.test();
  },
  'whatswork:ai': function (msg) {
    if (typeof msg.task !== 'string') return Promise.resolve({ ok: false, error: 'Tarefa inválida.' });
    var messages = Array.isArray(msg.messages) ? msg.messages.slice(0, 100).map(function (m) {
      return { fromMe: !!(m && m.fromMe), text: String((m && m.text) || '') };
    }) : [];
    return WhatsWorkAI.run(msg.task, { messages: messages, draft: String(msg.draft || '') });
  }
};

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!senderIsTrusted(sender)) return false;
  if (!msg || typeof msg.type !== 'string') return false;

  var handler = HANDLERS[msg.type];
  if (!handler) return false;

  handler(msg).then(sendResponse, function (err) {
    sendResponse({ ok: false, error: String((err && err.message) || err) });
  });
  return true;   // resposta assíncrona
});

/* ------------------------------------------------------------- relógio */

function tick() {
  return Promise.all([markDueMessages(), fireDueReminders()]);
}

/** Promove agendamentos vencidos para "due" e acorda o content script. */
function markDueMessages() {
  return Promise.all([WhatsWorkStore.listScheduled(), WhatsWorkStore.getSettings()])
    .then(function (r) {
      var list = r[0], settings = r[1];
      var now = Date.now();
      var venceram = [];

      list.forEach(function (item) {
        if (item.status === 'pending' && item.sendAt <= now) {
          item.status = 'due';
          venceram.push(item);
        }
      });
      if (!venceram.length) return null;

      return WhatsWorkStore.put(WhatsWorkStore.KEYS.SCHEDULED, list).then(function () {
        if (settings.requireConfirmation) {
          // Nada é enviado sozinho. Ainda assim cutucamos o painel na hora,
          // para o item já aparecer como "aguardando confirmação" em vez de
          // ficar mudo até a próxima varredura do content script.
          var quem = venceram.map(function (i) { return i.name || i.phone; }).join(', ');
          notify('whatswork:confirm', 'Mensagem pronta para enviar',
            'Abra o painel WhatsWork e confirme o envio para ' + quem + '.');
          return pokeTabs();
        }
        return notifyTabs();
      });
    });
}

/** Pede a cada aba do WhatsApp que reavalie a fila. Resolve com quantas havia. */
function pokeTabs() {
  return chrome.tabs.query({ url: WHATSAPP_ORIGIN + '*' }).then(function (tabs) {
    tabs.forEach(function (tab) {
      chrome.tabs.sendMessage(tab.id, { type: 'whatswork:process-queue' })
        .catch(function () { /* aba sem content script */ });
    });
    return tabs.length;
  });
}

function notifyTabs() {
  return pokeTabs().then(function (quantas) {
    if (!quantas) {
      return notify('whatswork:no-tab', 'WhatsWork',
        'Há mensagem agendada para agora, mas o WhatsApp Web não está aberto.');
    }
  });
}

function fireDueReminders() {
  return WhatsWorkStore.listReminders().then(function (list) {
    var now = Date.now();
    var due = list.filter(function (r) { return !r.done && !r.notified && r.dueAt <= now; });
    if (!due.length) return null;
    due.forEach(function (rem) {
      rem.notified = true;
      notify('whatswork:rem:' + rem.id, 'Follow-up' + (rem.name ? ' — ' + rem.name : ''), rem.text);
    });
    return WhatsWorkStore.put(WhatsWorkStore.KEYS.REMINDERS, list);
  });
}

function notify(id, title, message) {
  return chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: title,
    message: message
  }).catch(function () { /* notificações podem estar bloqueadas */ });
}
