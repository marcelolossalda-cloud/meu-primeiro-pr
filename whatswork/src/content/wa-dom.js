/*
 * Adaptador para o DOM do WhatsApp Web.
 *
 * O WhatsApp não expõe API pública nem classes estáveis: as classes CSS são
 * ofuscadas e mudam a cada deploy. Todos os seletores daqui usam apenas
 * atributos semânticos (`data-id`, `contenteditable`, `role`, `aria-label`,
 * `data-icon`), que são bem mais duráveis — mas ainda assim podem quebrar.
 * Por isso tudo está isolado neste arquivo: quando o WhatsApp mudar, só ele
 * precisa de conserto.
 */
(function (root) {
  'use strict';

  var SEL = {
    main: '#main',
    header: '#main header',
    composer: '#main footer div[contenteditable="true"][role="textbox"], #main footer div[contenteditable="true"][data-tab]',
    sendIcon: '#main footer span[data-icon="send"], #main footer span[data-icon="wds-ic-send-filled"]',
    messageRow: '#main div[data-id]'
  };

  /**
   * JID do chat aberto, ex.: "5511999998888@c.us" ou "1203...@g.us".
   * Extraído do atributo data-id das mensagens ("false_<jid>_<msgid>").
   * Retorna null em conversa sem nenhuma mensagem carregada.
   */
  function getActiveChatJid() {
    var rows = document.querySelectorAll(SEL.messageRow);
    for (var i = 0; i < rows.length; i++) {
      var raw = rows[i].getAttribute('data-id') || '';
      var parts = raw.split('_');
      for (var j = 0; j < parts.length; j++) {
        if (parts[j].indexOf('@') !== -1) return parts[j];
      }
    }
    return null;
  }

  /**
   * Data e hora da última mensagem da conversa, em epoch ms.
   *
   * Sai do atributo data-pre-plain-text das bolhas, que o WhatsApp preenche
   * com "[09:10, 02/09/2026] Fulano: ". É a fonte mais confiável de "quando
   * falamos pela última vez" — melhor que registrar quando a conversa foi
   * aberta, porque abrir não é falar.
   */
  function getLastMessageTime() {
    var rows = document.querySelectorAll(SEL.messageRow);
    for (var i = rows.length - 1; i >= 0; i--) {
      var bolha = rows[i].querySelector('[data-pre-plain-text]');
      if (!bolha) continue;
      var t = parsePrePlainText(bolha.getAttribute('data-pre-plain-text'));
      if (t) return t;
    }
    return 0;
  }

  /** "[09:10, 02/09/2026] Fulano: " -> epoch ms. Aceita ano de 2 ou 4 dígitos. */
  function parsePrePlainText(texto) {
    var m = String(texto || '').match(/\[(\d{1,2}):(\d{2}),\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]/);
    if (!m) return 0;
    var ano = parseInt(m[5], 10);
    if (ano < 100) ano += 2000;
    var d = new Date(ano, parseInt(m[4], 10) - 1, parseInt(m[3], 10),
      parseInt(m[1], 10), parseInt(m[2], 10));
    var t = d.getTime();
    // Data futura significa formato diferente do esperado; melhor ignorar do
    // que gravar um "último contato" que nunca vai vencer.
    return (isNaN(t) || t > Date.now() + 86400000) ? 0 : t;
  }

  /** Nome exibido no cabeçalho do chat aberto. */
  function getActiveChatName() {
    var header = document.querySelector(SEL.header);
    if (!header) return null;
    var titled = header.querySelector('span[dir="auto"][title]') || header.querySelector('[title]');
    if (titled) {
      var t = titled.getAttribute('title');
      if (t && t.trim()) return t.trim();
      if (titled.textContent && titled.textContent.trim()) return titled.textContent.trim();
    }
    return null;
  }

  /**
   * Identidade do chat aberto. Quando não há mensagens (chat novo) caímos
   * para uma chave derivada do nome, para não perder as notas já escritas.
   */
  function getActiveChat() {
    if (!document.querySelector(SEL.main)) return null;
    var name = getActiveChatName();
    var jid = getActiveChatJid();
    if (!jid && !name) return null;
    return {
      jid: jid || 'name:' + name,
      name: name || '',
      phone: jid ? root.WhatsWorkStore.jidToPhone(jid) : '',
      isGroup: !!jid && jid.indexOf('@g.us') !== -1,
      resolved: !!jid
    };
  }

  function getComposer() {
    return document.querySelector(SEL.composer);
  }

  function getComposerText() {
    var box = getComposer();
    return box ? (box.innerText || '').trim() : '';
  }

  /**
   * Texto das últimas mensagens da conversa aberta, para as ações de IA.
   *
   * Só é chamada quando a pessoa clica num botão da aba IA — a extensão não
   * lê conteúdo de mensagem em nenhum outro momento. O remetente sai do
   * data-id ("true_<jid>_<id>" quando a mensagem é minha).
   */
  function getRecentMessages(limit) {
    var rows = document.querySelectorAll(SEL.messageRow);
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var raw = rows[i].getAttribute('data-id') || '';
      var bolha = rows[i].querySelector('[data-pre-plain-text]') || rows[i];
      var texto = (bolha.innerText || '').replace(/\s+$/, '').trim();
      if (!texto) continue;
      out.push({ fromMe: raw.indexOf('true_') === 0, text: texto });
    }
    return limit ? out.slice(-limit) : out;
  }

  /**
   * Substitui o conteúdo do campo de mensagem pelo texto dado.
   *
   * `execCommand('insertText')` é usado de propósito: o editor do WhatsApp
   * ignora atribuições diretas a textContent/innerText porque escuta eventos
   * de composição do próprio navegador. Está deprecado, mas é o único caminho
   * que o editor aceita sem depender das internas do React.
   */
  function setComposerText(text) {
    var box = getComposer();
    if (!box) return false;
    box.focus();
    var range = document.createRange();
    range.selectNodeContents(box);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('insertText', false, text);
    box.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
    return true;
  }

  function getSendButton() {
    var icon = document.querySelector(SEL.sendIcon);
    if (icon && icon.closest('button')) return icon.closest('button');
    var buttons = document.querySelectorAll('#main footer button[aria-label]');
    for (var i = 0; i < buttons.length; i++) {
      var label = (buttons[i].getAttribute('aria-label') || '').toLowerCase();
      if (label.indexOf('enviar') !== -1 || label.indexOf('send') !== -1) return buttons[i];
    }
    return null;
  }

  function clickSend() {
    var btn = getSendButton();
    if (!btn) return false;
    btn.click();
    return true;
  }

  /** Escreve e envia. Resolve com true se o botão de envio foi acionado. */
  function sendText(text) {
    if (!setComposerText(text)) return Promise.resolve(false);
    // O botão só troca de "microfone" para "enviar" depois que o React
    // processa o input; um tick de macrotask basta.
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(clickSend()); }, 250);
    });
  }

  /** Abre a conversa de um número. Provoca navegação (o SPA recarrega). */
  function openChatByPhone(phone) {
    var digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return false;
    window.location.href = 'https://web.whatsapp.com/send?phone=' + digits;
    return true;
  }

  /** Espera o campo de mensagem existir (após abrir uma conversa). */
  function waitForComposer(timeoutMs) {
    var limit = Date.now() + (timeoutMs || 20000);
    return new Promise(function (resolve, reject) {
      (function poll() {
        if (getComposer()) return resolve(true);
        if (Date.now() > limit) return reject(new Error('campo de mensagem não apareceu'));
        setTimeout(poll, 400);
      })();
    });
  }

  /** Notifica sempre que o chat aberto muda (inclusive para nenhum). */
  function onChatChange(callback) {
    var last = '';
    setInterval(function () {
      var chat = getActiveChat();
      var key = chat ? chat.jid + '|' + chat.name : '';
      if (key !== last) {
        last = key;
        callback(chat);
      }
    }, 800);
  }

  root.WhatsWorkDom = {
    SEL: SEL,
    getActiveChat: getActiveChat,
    getActiveChatJid: getActiveChatJid,
    getActiveChatName: getActiveChatName,
    getComposer: getComposer,
    getComposerText: getComposerText,
    getLastMessageTime: getLastMessageTime,
    parsePrePlainText: parsePrePlainText,
    getRecentMessages: getRecentMessages,
    setComposerText: setComposerText,
    clickSend: clickSend,
    sendText: sendText,
    openChatByPhone: openChatByPhone,
    waitForComposer: waitForComposer,
    onChatChange: onChatChange
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
