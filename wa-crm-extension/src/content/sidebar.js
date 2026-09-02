/*
 * Painel lateral de CRM. Vive dentro de um shadow root para que as regras de
 * estilo do WhatsApp não vazem para cá (nem as nossas para lá).
 */
(function (root) {
  'use strict';

  var WACRM = root.WACRM;
  var WADom = root.WADom;

  var state = {
    chat: null,
    contact: null,
    tags: [],
    tab: 'contato',
    open: false
  };

  var ui = {};

  /* -------------------------------------------------------------- helpers */

  function h(tag, props, children) {
    var el = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      if (key === 'class') el.className = props[key];
      else if (key === 'text') el.textContent = props[key];
      else if (key.slice(0, 2) === 'on') el.addEventListener(key.slice(2).toLowerCase(), props[key]);
      else if (props[key] !== null && props[key] !== undefined) el.setAttribute(key, props[key]);
    });
    (children || []).forEach(function (child) {
      if (child) el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return el;
  }

  function fmtDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  /** "2026-09-02T14:30" (valor de datetime-local) -> epoch ms */
  function localInputToTs(value) {
    if (!value) return 0;
    var t = new Date(value).getTime();
    return isNaN(t) ? 0 : t;
  }

  function tsToLocalInput(ts) {
    var d = new Date(ts);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /**
   * Expande as variáveis suportadas nos modelos de resposta.
   * Hoje: {{nome}} e {{primeiro_nome}}.
   */
  function renderTemplate(body, chat) {
    var name = (chat && chat.name) || '';
    return String(body || '')
      .replace(/\{\{\s*nome\s*\}\}/gi, name)
      .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, name.split(' ')[0] || name);
  }

  /* ------------------------------------------------------------- montagem */

  function mount() {
    var host = document.createElement('div');
    host.id = 'wa-crm-lite-host';
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'open' });
    fetch(chrome.runtime.getURL('src/content/sidebar.css'))
      .then(function (r) { return r.text(); })
      .then(function (css) { shadow.appendChild(h('style', { text: css })); });

    ui.toggle = h('button', {
      class: 'wacrm-toggle',
      title: 'WA CRM Lite',
      onclick: function () { setOpen(!state.open); }
    }, ['CRM']);

    ui.tabs = h('div', { class: 'wacrm-tabs' }, [
      tabButton('contato', 'Contato'),
      tabButton('modelos', 'Modelos'),
      tabButton('agenda', 'Agenda'),
      tabButton('lembretes', 'Lembretes')
    ]);

    ui.body = h('div', { class: 'wacrm-body' });
    ui.subtitle = h('div', { class: 'wacrm-subtitle', text: 'Nenhuma conversa aberta' });

    ui.panel = h('aside', { class: 'wacrm-panel' }, [
      h('header', { class: 'wacrm-header' }, [
        h('div', { class: 'wacrm-title', text: 'WA CRM Lite' }),
        ui.subtitle,
        h('button', { class: 'wacrm-close', title: 'Fechar', onclick: function () { setOpen(false); } }, ['×'])
      ]),
      ui.tabs,
      ui.body
    ]);

    shadow.appendChild(ui.toggle);
    shadow.appendChild(ui.panel);
  }

  function tabButton(id, label) {
    return h('button', {
      class: 'wacrm-tab',
      'data-tab': id,
      onclick: function () { state.tab = id; render(); }
    }, [label]);
  }

  function setOpen(open) {
    state.open = open;
    ui.panel.classList.toggle('is-open', open);
    ui.toggle.classList.toggle('is-open', open);
    if (open) render();
  }

  /* ----------------------------------------------------------- renderização */

  function render() {
    if (!ui.body) return;

    Array.prototype.forEach.call(ui.tabs.children, function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === state.tab);
    });

    ui.subtitle.textContent = state.chat
      ? (state.chat.name || state.chat.phone || 'Conversa sem nome')
      : 'Nenhuma conversa aberta';

    ui.body.textContent = '';
    if (state.tab === 'contato') renderContato();
    else if (state.tab === 'modelos') renderModelos();
    else if (state.tab === 'agenda') renderAgenda();
    else renderLembretes();
  }

  function emptyState(msg) {
    return h('p', { class: 'wacrm-empty', text: msg });
  }

  function renderContato() {
    if (!state.chat) {
      ui.body.appendChild(emptyState('Abra uma conversa para ver e editar as informações do contato.'));
      return;
    }

    var c = state.contact || { tags: [], notes: [] };

    /* etiquetas */
    var chips = h('div', { class: 'wacrm-chips' }, state.tags.map(function (tag) {
      var active = (c.tags || []).indexOf(tag.id) !== -1;
      var chip = h('button', {
        class: 'wacrm-chip' + (active ? ' is-active' : ''),
        onclick: function () {
          WACRM.toggleTag(state.chat.jid, tag.id).then(reloadContact);
        }
      }, [tag.name]);
      chip.style.setProperty('--chip', tag.color);
      return chip;
    }));

    /* nota nova */
    var input = h('textarea', { class: 'wacrm-textarea', rows: '3', placeholder: 'Nova anotação sobre este contato…' });
    var saveBtn = h('button', {
      class: 'wacrm-btn wacrm-btn-primary',
      onclick: function () {
        var text = input.value;
        if (!text.trim()) return;
        WACRM.addNote(state.chat.jid, text).then(function () {
          input.value = '';
          reloadContact();
        });
      }
    }, ['Salvar anotação']);

    var notes = (c.notes || []).map(function (note) {
      return h('li', { class: 'wacrm-note' }, [
        h('div', { class: 'wacrm-note-text', text: note.text }),
        h('div', { class: 'wacrm-note-meta' }, [
          h('span', { text: fmtDate(note.ts) }),
          h('button', {
            class: 'wacrm-link',
            onclick: function () { WACRM.removeNote(state.chat.jid, note.id).then(reloadContact); }
          }, ['excluir'])
        ])
      ]);
    });

    ui.body.appendChild(section('Etiquetas', [chips]));
    ui.body.appendChild(section('Anotações', [
      input,
      saveBtn,
      notes.length ? h('ul', { class: 'wacrm-notes' }, notes) : emptyState('Nenhuma anotação ainda.')
    ]));

    if (!state.chat.resolved) {
      ui.body.appendChild(h('p', { class: 'wacrm-warn', text:
        'Esta conversa ainda não tem mensagens carregadas, então os dados estão salvos pelo nome. ' +
        'Eles serão migrados quando o número for identificado.' }));
    }
  }

  function renderModelos() {
    var title = h('input', { class: 'wacrm-input', placeholder: 'Título (ex.: Boas-vindas)' });
    var body = h('textarea', { class: 'wacrm-textarea', rows: '4', placeholder: 'Mensagem. Use {{nome}} ou {{primeiro_nome}}.' });
    var add = h('button', {
      class: 'wacrm-btn wacrm-btn-primary',
      onclick: function () {
        if (!title.value.trim() || !body.value.trim()) return;
        WACRM.saveTemplate({ title: title.value.trim(), body: body.value }).then(function () {
          title.value = ''; body.value = ''; render();
        });
      }
    }, ['Adicionar modelo']);

    ui.body.appendChild(section('Novo modelo', [title, body, add]));

    var listWrap = h('div');
    ui.body.appendChild(section('Meus modelos', [listWrap]));

    WACRM.listTemplates().then(function (list) {
      if (!list.length) { listWrap.appendChild(emptyState('Nenhum modelo cadastrado.')); return; }
      list.forEach(function (tpl) {
        listWrap.appendChild(h('div', { class: 'wacrm-card' }, [
          h('div', { class: 'wacrm-card-title', text: tpl.title }),
          h('div', { class: 'wacrm-card-body', text: tpl.body }),
          h('div', { class: 'wacrm-card-actions' }, [
            h('button', {
              class: 'wacrm-btn',
              onclick: function () { WADom.setComposerText(renderTemplate(tpl.body, state.chat)); }
            }, ['Inserir']),
            h('button', {
              class: 'wacrm-btn',
              onclick: function () { WADom.sendText(renderTemplate(tpl.body, state.chat)); }
            }, ['Enviar']),
            h('button', {
              class: 'wacrm-link',
              onclick: function () { WACRM.removeTemplate(tpl.id).then(render); }
            }, ['excluir'])
          ])
        ]));
      });
    });
  }

  function renderAgenda() {
    if (state.chat) {
      var body = h('textarea', { class: 'wacrm-textarea', rows: '3', placeholder: 'Mensagem a enviar…' });
      var when = h('input', { class: 'wacrm-input', type: 'datetime-local', value: tsToLocalInput(Date.now() + 3600000) });
      var add = h('button', {
        class: 'wacrm-btn wacrm-btn-primary',
        onclick: function () {
          var ts = localInputToTs(when.value);
          if (!body.value.trim() || !ts) return;
          if (!state.chat.phone) {
            alert('Só é possível agendar para conversas individuais com número identificado.');
            return;
          }
          WACRM.addScheduled({
            jid: state.chat.jid,
            phone: state.chat.phone,
            name: state.chat.name,
            body: body.value,
            sendAt: ts
          }).then(function () {
            chrome.runtime.sendMessage({ type: 'wacrm:reschedule' });
            body.value = '';
            render();
          });
        }
      }, ['Agendar envio']);
      ui.body.appendChild(section('Agendar para ' + (state.chat.name || state.chat.phone), [body, when, add]));
    } else {
      ui.body.appendChild(emptyState('Abra uma conversa para agendar uma mensagem.'));
    }

    var listWrap = h('div');
    ui.body.appendChild(section('Fila de envios', [listWrap]));

    WACRM.listScheduled().then(function (list) {
      if (!list.length) { listWrap.appendChild(emptyState('Nada agendado.')); return; }
      list.sort(function (a, b) { return a.sendAt - b.sendAt; }).forEach(function (item) {
        listWrap.appendChild(h('div', { class: 'wacrm-card' }, [
          h('div', { class: 'wacrm-card-title', text: (item.name || item.phone) + ' — ' + fmtDate(item.sendAt) }),
          h('div', { class: 'wacrm-card-body', text: item.body }),
          h('div', { class: 'wacrm-card-actions' }, [
            h('span', { class: 'wacrm-status wacrm-status-' + item.status, text: statusLabel(item.status) }),
            h('button', {
              class: 'wacrm-link',
              onclick: function () { WACRM.removeScheduled(item.id).then(render); }
            }, ['remover'])
          ])
        ]));
      });
    });
  }

  function statusLabel(status) {
    return { pending: 'aguardando', due: 'enviando', sent: 'enviada', failed: 'falhou' }[status] || status;
  }

  function renderLembretes() {
    var text = h('input', { class: 'wacrm-input', placeholder: 'Do que preciso lembrar?' });
    var when = h('input', { class: 'wacrm-input', type: 'datetime-local', value: tsToLocalInput(Date.now() + 86400000) });
    var add = h('button', {
      class: 'wacrm-btn wacrm-btn-primary',
      onclick: function () {
        var ts = localInputToTs(when.value);
        if (!text.value.trim() || !ts) return;
        WACRM.addReminder({
          jid: state.chat ? state.chat.jid : '',
          name: state.chat ? state.chat.name : '',
          text: text.value.trim(),
          dueAt: ts
        }).then(function () {
          chrome.runtime.sendMessage({ type: 'wacrm:reschedule' });
          text.value = '';
          render();
        });
      }
    }, ['Criar lembrete']);

    ui.body.appendChild(section('Novo lembrete', [text, when, add]));

    var listWrap = h('div');
    ui.body.appendChild(section('Follow-ups', [listWrap]));

    WACRM.listReminders().then(function (list) {
      var pending = list.filter(function (r) { return !r.done; });
      if (!pending.length) { listWrap.appendChild(emptyState('Nenhum follow-up pendente.')); return; }
      pending.sort(function (a, b) { return a.dueAt - b.dueAt; }).forEach(function (rem) {
        listWrap.appendChild(h('div', { class: 'wacrm-card' }, [
          h('div', { class: 'wacrm-card-title', text: fmtDate(rem.dueAt) + (rem.name ? ' — ' + rem.name : '') }),
          h('div', { class: 'wacrm-card-body', text: rem.text }),
          h('div', { class: 'wacrm-card-actions' }, [
            h('button', {
              class: 'wacrm-btn',
              onclick: function () { WACRM.updateReminder(rem.id, { done: true }).then(render); }
            }, ['Concluir']),
            h('button', {
              class: 'wacrm-link',
              onclick: function () { WACRM.removeReminder(rem.id).then(render); }
            }, ['remover'])
          ])
        ]));
      });
    });
  }

  function section(title, children) {
    return h('section', { class: 'wacrm-section' },
      [h('h3', { class: 'wacrm-section-title', text: title })].concat(children));
  }

  /* --------------------------------------------------------------- estado */

  function reloadContact() {
    if (!state.chat) { state.contact = null; render(); return Promise.resolve(); }
    return WACRM.getContact(state.chat.jid).then(function (c) {
      state.contact = c;
      render();
    });
  }

  function setChat(chat) {
    state.chat = chat;
    if (!chat) { state.contact = null; render(); return; }
    WACRM.upsertContact(chat.jid, { name: chat.name, phone: chat.phone, isGroup: chat.isGroup })
      .then(function (c) {
        state.contact = c;
        render();
      });
  }

  function init() {
    mount();
    WACRM.listTags().then(function (tags) { state.tags = tags; render(); });
    WADom.onChatChange(setChat);
    setChat(WADom.getActiveChat());
  }

  root.WASidebar = { init: init, render: render, setOpen: setOpen, renderTemplate: renderTemplate };
})(typeof globalThis !== 'undefined' ? globalThis : window);
