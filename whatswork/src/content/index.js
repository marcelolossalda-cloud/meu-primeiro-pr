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
   * Envia a primeira mensagem vencida da fila, se — e só se — todas as travas
   * permitirem.
   *
   * Abrir uma conversa recarrega o SPA e mata este script, então o fluxo é
   * deliberadamente reentrante: a cada carregamento verificamos a fila de novo;
   * se a conversa certa já está aberta, enviamos; se não, apenas navegamos e
   * deixamos a próxima execução concluir. Por isso todas as travas são
   * checadas ANTES de navegar — para o navegador não sair do lugar por um
   * envio que nem vai acontecer.
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

      return WhatsWorkStore.getSettings().then(function (settings) {
        // 1. Confirmação humana. Enquanto você não clicar, nada sai.
        if (settings.requireConfirmation && !due.confirmed) {
          return WhatsWorkStore.updateScheduled(due.id, {
            waitingReason: 'aguardando sua confirmação no painel'
          });
        }

        // 2. Limites anti-bloqueio. Um envio que VOCÊ confirmou é decisão
        //    humana e não passa por aqui; automático, sim.
        var allowance = due.confirmed
          ? Promise.resolve({ allowed: true, reason: '' })
          : WhatsWorkStore.checkSendAllowance(Date.now());

        return allowance.then(function (verdict) {
          if (!verdict.allowed) {
            return WhatsWorkStore.updateScheduled(due.id, { waitingReason: verdict.reason });
          }
          return deliver(due);
        });
      });
    }).then(function () {
      busy = false;
    }, function () {
      busy = false;
    });
  }

  function deliver(due) {
    var chat = WhatsWorkDom.getActiveChat();
    if (!chat || !chat.phone || chat.phone !== due.phone) {
      return WhatsWorkStore.updateScheduled(due.id, { attempts: (due.attempts || 0) + 1 })
        .then(function () { WhatsWorkDom.openChatByPhone(due.phone); });
    }

    // Nunca sobrescrever o que a pessoa está escrevendo. O envio limpa o campo
    // antes de digitar, então se há rascunho ali o envio espera — e o motivo
    // aparece no painel, para não sumir em silêncio.
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
        }).then(function () {
          return sent ? WhatsWorkStore.recordSend(Date.now()) : null;
        });
      })
      .catch(function (err) {
        return WhatsWorkStore.updateScheduled(due.id, {
          status: 'failed',
          error: String((err && err.message) || err)
        });
      });
  }

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.type === 'whatswork:process-queue') processQueue();
    if (msg && msg.type === 'whatswork:open-panel') root.WhatsWorkPanel.setOpen(true);
  });

  root.WhatsWorkQueue = { process: processQueue };

  waitForApp().then(function () {
    return root.WhatsWorkPanel.init();
  }).then(function () {
    processQueue();
    setInterval(processQueue, 30000);
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
