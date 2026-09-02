/*
 * Ponto de entrada do content script: espera o WhatsApp Web carregar, monta o
 * painel e cuida da fila de mensagens agendadas.
 */
(function (root) {
  'use strict';

  var WACRM = root.WACRM;
  var WADom = root.WADom;

  var MAX_ATTEMPTS = 3;
  var busy = false;

  function waitForApp() {
    return new Promise(function (resolve) {
      (function poll() {
        if (document.querySelector('#app') || document.querySelector('#main')) return resolve();
        setTimeout(poll, 500);
      })();
    });
  }

  /**
   * Envia a primeira mensagem marcada como "due" pelo service worker.
   *
   * Abrir uma conversa recarrega o SPA e mata este script, então o fluxo é
   * deliberadamente reentrante: a cada carregamento da página verificamos de
   * novo a fila; se a conversa certa já está aberta, enviamos; se não, só
   * navegamos e deixamos a próxima execução concluir.
   */
  function processQueue() {
    if (busy) return Promise.resolve();
    busy = true;

    return WACRM.listScheduled().then(function (list) {
      var due = list.filter(function (s) { return s.status === 'due'; })
                    .sort(function (a, b) { return a.sendAt - b.sendAt; })[0];
      if (!due) return null;

      if ((due.attempts || 0) >= MAX_ATTEMPTS) {
        return WACRM.updateScheduled(due.id, {
          status: 'failed',
          error: 'não foi possível abrir a conversa após ' + MAX_ATTEMPTS + ' tentativas'
        });
      }

      var chat = WADom.getActiveChat();
      if (!chat || !chat.phone || chat.phone !== due.phone) {
        return WACRM.updateScheduled(due.id, { attempts: (due.attempts || 0) + 1 })
          .then(function () { WADom.openChatByPhone(due.phone); });
      }

      return WADom.waitForComposer(20000)
        .then(function () { return WADom.sendText(due.body); })
        .then(function (sent) {
          return WACRM.updateScheduled(due.id, {
            status: sent ? 'sent' : 'failed',
            error: sent ? '' : 'botão de enviar não encontrado',
            sentAt: Date.now()
          });
        })
        .catch(function (err) {
          return WACRM.updateScheduled(due.id, { status: 'failed', error: String(err && err.message || err) });
        });
    }).then(function () {
      busy = false;
    }, function () {
      busy = false;
    });
  }

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.type === 'wacrm:process-queue') processQueue();
    if (msg && msg.type === 'wacrm:open-panel') root.WASidebar.setOpen(true);
  });

  waitForApp().then(function () {
    root.WASidebar.init();
    processQueue();
    setInterval(processQueue, 30000);
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
