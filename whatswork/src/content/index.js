/*
 * Ponto de entrada do content script: espera o WhatsApp Web carregar, monta o
 * painel e cuida da fila de mensagens agendadas.
 */
(function (root) {
  'use strict';

  var WhatsWorkStore = root.WhatsWorkStore;
  var WhatsWorkDom = root.WhatsWorkDom;

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

    return WhatsWorkStore.listScheduled().then(function (list) {
      var due = list.filter(function (s) { return s.status === 'due'; })
                    .sort(function (a, b) { return a.sendAt - b.sendAt; })[0];
      if (!due) return null;

      if ((due.attempts || 0) >= MAX_ATTEMPTS) {
        return WhatsWorkStore.updateScheduled(due.id, {
          status: 'failed',
          error: 'não foi possível abrir a conversa após ' + MAX_ATTEMPTS + ' tentativas'
        });
      }

      var chat = WhatsWorkDom.getActiveChat();
      if (!chat || !chat.phone || chat.phone !== due.phone) {
        return WhatsWorkStore.updateScheduled(due.id, { attempts: (due.attempts || 0) + 1 })
          .then(function () { WhatsWorkDom.openChatByPhone(due.phone); });
      }

      // Nunca sobrescrever o que a pessoa está escrevendo. O envio programado
      // limpa o campo antes de digitar, então se há rascunho ali o envio
      // espera — e o motivo aparece no painel, para não sumir em silêncio.
      var composer = WhatsWorkDom.getComposer();
      if (composer && composer.innerText.trim()) {
        return WhatsWorkStore.updateScheduled(due.id, {
          waitingReason: 'há um rascunho no campo de mensagem'
        });
      }

      return WhatsWorkDom.waitForComposer(20000)
        .then(function () { return WhatsWorkDom.sendText(due.body); })
        .then(function (sent) {
          return WhatsWorkStore.updateScheduled(due.id, {
            status: sent ? 'sent' : 'failed',
            error: sent ? '' : 'botão de enviar não encontrado',
            waitingReason: '',
            sentAt: Date.now()
          });
        })
        .catch(function (err) {
          return WhatsWorkStore.updateScheduled(due.id, { status: 'failed', error: String(err && err.message || err) });
        });
    }).then(function () {
      busy = false;
    }, function () {
      busy = false;
    });
  }

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.type === 'whatswork:process-queue') processQueue();
    if (msg && msg.type === 'whatswork:open-panel') root.WhatsWorkPanel.setOpen(true);
  });

  waitForApp().then(function () {
    root.WhatsWorkPanel.init();
    processQueue();
    setInterval(processQueue, 30000);
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
