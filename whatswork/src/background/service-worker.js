/*
 * Service worker: relógio da extensão.
 *
 * O content script não pode ser um cronômetro confiável (o WhatsApp pode estar
 * fechado, a aba dormindo, o script recarregado a cada navegação). Então quem
 * decide "está na hora" é aqui, via chrome.alarms; o content script só executa.
 */
importScripts('/src/lib/store.js');

var ALARM = 'whatswork:tick';

chrome.runtime.onInstalled.addListener(function () {
  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(function () {
  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
});

chrome.runtime.onMessage.addListener(function (msg) {
  if (msg && msg.type === 'whatswork:reschedule') tick();
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === ALARM) tick();
});

function tick() {
  return Promise.all([markDueMessages(), fireDueReminders()]);
}

/** Promove agendamentos vencidos para "due" e acorda o content script. */
function markDueMessages() {
  return WhatsWorkStore.listScheduled().then(function (list) {
    var now = Date.now();
    var changed = false;
    list.forEach(function (item) {
      if (item.status === 'pending' && item.sendAt <= now) {
        item.status = 'due';
        changed = true;
      }
    });
    if (!changed) return null;
    return WhatsWorkStore.put(WhatsWorkStore.KEYS.SCHEDULED, list).then(notifyTabs);
  });
}

function notifyTabs() {
  return chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }).then(function (tabs) {
    if (!tabs.length) {
      return notify('whatswork:no-tab', 'WhatsWork', 'Há mensagem agendada para agora, mas o WhatsApp Web não está aberto.');
    }
    tabs.forEach(function (tab) {
      chrome.tabs.sendMessage(tab.id, { type: 'whatswork:process-queue' }).catch(function () { /* aba sem content script */ });
    });
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
