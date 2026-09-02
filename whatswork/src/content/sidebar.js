/*
 * Painel lateral de CRM. Vive dentro de um shadow root para que as regras de
 * estilo do WhatsApp não vazem para cá (nem as nossas para lá).
 */
(function (root) {
  'use strict';

  var WhatsWorkStore = root.WhatsWorkStore;
  var WhatsWorkDom = root.WhatsWorkDom;

  var state = {
    chat: null,
    contact: null,
    tags: [],
    settings: null,
    tab: 'contato',
    open: false,
    ai: { loading: false, error: '', text: '' }
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

  function mount(openShadow) {
    var host = document.createElement('div');
    host.id = 'whatswork-host';
    document.body.appendChild(host);

    /*
     * Shadow root FECHADO: com 'open', qualquer script rodando na página do
     * WhatsApp poderia fazer host.shadowRoot e ler as suas anotações ou clicar
     * nos botões do painel. Fechado, o painel fica inalcançável pela página.
     * O modo aberto só é ligado por uma chave de storage usada no teste
     * automatizado, que precisa enxergar o painel de fora.
     */
    var shadow = host.attachShadow({ mode: openShadow ? 'open' : 'closed' });
    fetch(chrome.runtime.getURL('src/content/sidebar.css'))
      .then(function (r) { return r.text(); })
      .then(function (css) { shadow.appendChild(h('style', { text: css })); });

    ui.toggle = h('button', {
      class: 'ww-toggle',
      title: 'WhatsWork',
      onclick: function () { setOpen(!state.open); }
    }, ['WHATSWORK']);

    ui.tabs = h('div', { class: 'ww-tabs' }, [
      tabButton('contato', 'Contato'),
      tabButton('modelos', 'Modelos'),
      tabButton('agenda', 'Agenda'),
      tabButton('lembretes', 'Follow-up'),
      tabButton('ia', 'IA')
    ]);

    ui.body = h('div', { class: 'ww-body' });
    ui.subtitle = h('div', { class: 'ww-subtitle', text: 'Nenhuma conversa aberta' });

    ui.panel = h('aside', { class: 'ww-panel' }, [
      h('header', { class: 'ww-header' }, [
        h('div', { class: 'ww-title', text: 'WhatsWork' }),
        ui.subtitle,
        h('button', { class: 'ww-close', title: 'Fechar', onclick: function () { setOpen(false); } }, ['×'])
      ]),
      ui.tabs,
      ui.body
    ]);

    shadow.appendChild(ui.toggle);
    shadow.appendChild(ui.panel);
  }

  function tabButton(id, label) {
    return h('button', {
      class: 'ww-tab',
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
    else if (state.tab === 'lembretes') renderLembretes();
    else renderIA();
  }

  function emptyState(msg) {
    return h('p', { class: 'ww-empty', text: msg });
  }

  function renderContato() {
    if (!state.chat) {
      ui.body.appendChild(emptyState('Abra uma conversa para ver e editar as informações do contato.'));
      return;
    }

    var c = state.contact || { tags: [], notes: [] };

    /* etiquetas */
    var chips = h('div', { class: 'ww-chips' }, state.tags.map(function (tag) {
      var active = (c.tags || []).indexOf(tag.id) !== -1;
      var chip = h('button', {
        class: 'ww-chip' + (active ? ' is-active' : ''),
        onclick: function () {
          WhatsWorkStore.toggleTag(state.chat.jid, tag.id).then(reloadContact);
        }
      }, [tag.name]);
      chip.style.setProperty('--chip', tag.color);
      return chip;
    }));

    /* nota nova */
    var input = h('textarea', { class: 'ww-textarea', rows: '3', placeholder: 'Nova anotação sobre este contato…' });
    var saveBtn = h('button', {
      class: 'ww-btn ww-btn-primary',
      onclick: function () {
        var text = input.value;
        if (!text.trim()) return;
        WhatsWorkStore.addNote(state.chat.jid, text).then(function () {
          input.value = '';
          reloadContact();
        });
      }
    }, ['Salvar anotação']);

    var notes = (c.notes || []).map(function (note) {
      return h('li', { class: 'ww-note' }, [
        h('div', { class: 'ww-note-text', text: note.text }),
        h('div', { class: 'ww-note-meta' }, [
          h('span', { text: fmtDate(note.ts) }),
          h('button', {
            class: 'ww-link',
            onclick: function () { WhatsWorkStore.removeNote(state.chat.jid, note.id).then(reloadContact); }
          }, ['excluir'])
        ])
      ]);
    });

    var dias = WhatsWorkStore.diasSem(c, Date.now());
    if (dias !== null) {
      var limite = (state.settings && state.settings.staleDays) || 60;
      ui.body.appendChild(h('p', {
        class: dias >= limite ? 'ww-warn' : 'ww-empty',
        text: dias === 0 ? 'Último contato: hoje.' :
          'Último contato há ' + dias + ' dia' + (dias > 1 ? 's' : '') + '.' +
          (dias >= limite ? ' Passou do seu limite de ' + limite + ' dias.' : '')
      }));
    }

    ui.body.appendChild(section('Etiquetas', [chips]));
    ui.body.appendChild(section('Anotações', [
      input,
      saveBtn,
      notes.length ? h('ul', { class: 'ww-notes' }, notes) : emptyState('Nenhuma anotação ainda.')
    ]));

    if (!state.chat.resolved) {
      ui.body.appendChild(h('p', { class: 'ww-warn', text:
        'Esta conversa ainda não tem mensagens carregadas, então os dados estão salvos pelo nome. ' +
        'Eles serão migrados quando o número for identificado.' }));
    }
  }

  function renderModelos() {
    var title = h('input', { class: 'ww-input', placeholder: 'Título (ex.: Boas-vindas)' });
    var body = h('textarea', { class: 'ww-textarea', rows: '4', placeholder: 'Mensagem. Use {{nome}} ou {{primeiro_nome}}.' });
    var add = h('button', {
      class: 'ww-btn ww-btn-primary',
      onclick: function () {
        if (!title.value.trim() || !body.value.trim()) return;
        WhatsWorkStore.saveTemplate({ title: title.value.trim(), body: body.value }).then(function () {
          title.value = ''; body.value = ''; render();
        });
      }
    }, ['Adicionar modelo']);

    ui.body.appendChild(section('Novo modelo', [title, body, add]));

    var listWrap = h('div');
    ui.body.appendChild(section('Meus modelos', [listWrap]));

    WhatsWorkStore.listTemplates().then(function (list) {
      if (!list.length) { listWrap.appendChild(emptyState('Nenhum modelo cadastrado.')); return; }
      list.forEach(function (tpl) {
        listWrap.appendChild(h('div', { class: 'ww-card' }, [
          h('div', { class: 'ww-card-title', text: tpl.title }),
          h('div', { class: 'ww-card-body', text: tpl.body }),
          h('div', { class: 'ww-card-actions' }, [
            h('button', {
              class: 'ww-btn',
              onclick: function () { WhatsWorkDom.setComposerText(renderTemplate(tpl.body, state.chat)); }
            }, ['Inserir']),
            h('button', {
              class: 'ww-btn',
              onclick: function () { WhatsWorkDom.sendText(renderTemplate(tpl.body, state.chat)); }
            }, ['Enviar']),
            h('button', {
              class: 'ww-link',
              onclick: function () { WhatsWorkStore.removeTemplate(tpl.id).then(render); }
            }, ['excluir'])
          ])
        ]));
      });
    });
  }

  function renderAgenda() {
    if (state.chat) {
      var body = h('textarea', { class: 'ww-textarea', rows: '3', placeholder: 'Mensagem a enviar…' });
      var when = h('input', { class: 'ww-input', type: 'datetime-local', value: tsToLocalInput(Date.now() + 3600000) });
      var add = h('button', {
        class: 'ww-btn ww-btn-primary',
        onclick: function () {
          var ts = localInputToTs(when.value);
          if (!body.value.trim() || !ts) return;
          if (!state.chat.phone) {
            alert('Só é possível agendar para conversas individuais com número identificado.');
            return;
          }
          WhatsWorkStore.addScheduled({
            jid: state.chat.jid,
            phone: state.chat.phone,
            name: state.chat.name,
            body: body.value,
            sendAt: ts
          }).then(function () {
            chrome.runtime.sendMessage({ type: 'whatswork:reschedule' });
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

    WhatsWorkStore.listScheduled().then(function (list) {
      if (!list.length) { listWrap.appendChild(emptyState('Nada agendado.')); return; }
      list.sort(function (a, b) { return a.sendAt - b.sendAt; }).forEach(function (item) {
        listWrap.appendChild(h('div', { class: 'ww-card' }, [
          h('div', { class: 'ww-card-title', text: (item.name || item.phone) + ' — ' + fmtDate(item.sendAt) }),
          h('div', { class: 'ww-card-body', text: item.body }),
          item.waitingReason ? h('div', { class: 'ww-warn', text: 'Adiado: ' + item.waitingReason }) : null,
          h('div', { class: 'ww-card-actions' }, [
            h('span', { class: 'ww-status ww-status-' + item.status, text: statusLabel(item.status) }),
            item.status === 'due' ? h('button', {
              class: 'ww-btn ww-btn-primary',
              onclick: function () {
                // Confirmação humana: libera este envio das travas automáticas.
                WhatsWorkStore.updateScheduled(item.id, { confirmed: true, waitingReason: '' })
                  .then(function () {
                    chrome.runtime.sendMessage({ type: 'whatswork:reschedule' });
                    return processNow();
                  })
                  .then(render);
              }
            }, ['Enviar agora']) : null,
            h('button', {
              class: 'ww-link',
              onclick: function () { WhatsWorkStore.removeScheduled(item.id).then(render); }
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
    var limite = (state.settings && state.settings.staleDays) || 60;
    var wrapParados = h('div');
    ui.body.appendChild(section('Sem contato há mais de ' + limite + ' dias', [wrapParados]));

    WhatsWorkStore.listStaleContacts(Date.now(), limite).then(function (lista) {
      if (!lista.length) {
        wrapParados.appendChild(emptyState('Nenhum cliente esquecido. 👍'));
        return;
      }
      lista.slice(0, 30).forEach(function (c) {
        wrapParados.appendChild(h('div', { class: 'ww-card' }, [
          h('div', { class: 'ww-card-title', text: c.name || c.phone }),
          h('div', { class: 'ww-card-body', text: 'Último contato há ' + c.dias + ' dias.' }),
          h('div', { class: 'ww-card-actions' }, [
            h('button', {
              class: 'ww-btn ww-btn-primary',
              onclick: function () { WhatsWorkDom.openChatByPhone(c.phone); }
            }, ['Abrir conversa'])
          ])
        ]));
      });
      if (lista.length > 30) {
        wrapParados.appendChild(emptyState('… e mais ' + (lista.length - 30) + '.'));
      }
    });

    var text = h('input', { class: 'ww-input', placeholder: 'Do que preciso lembrar?' });
    var when = h('input', { class: 'ww-input', type: 'datetime-local', value: tsToLocalInput(Date.now() + 86400000) });
    var add = h('button', {
      class: 'ww-btn ww-btn-primary',
      onclick: function () {
        var ts = localInputToTs(when.value);
        if (!text.value.trim() || !ts) return;
        WhatsWorkStore.addReminder({
          jid: state.chat ? state.chat.jid : '',
          name: state.chat ? state.chat.name : '',
          text: text.value.trim(),
          dueAt: ts
        }).then(function () {
          chrome.runtime.sendMessage({ type: 'whatswork:reschedule' });
          text.value = '';
          render();
        });
      }
    }, ['Criar lembrete']);

    ui.body.appendChild(section('Novo lembrete', [text, when, add]));

    var listWrap = h('div');
    ui.body.appendChild(section('Follow-ups', [listWrap]));

    WhatsWorkStore.listReminders().then(function (list) {
      var pending = list.filter(function (r) { return !r.done; });
      if (!pending.length) { listWrap.appendChild(emptyState('Nenhum follow-up pendente.')); return; }
      pending.sort(function (a, b) { return a.dueAt - b.dueAt; }).forEach(function (rem) {
        listWrap.appendChild(h('div', { class: 'ww-card' }, [
          h('div', { class: 'ww-card-title', text: fmtDate(rem.dueAt) + (rem.name ? ' — ' + rem.name : '') }),
          h('div', { class: 'ww-card-body', text: rem.text }),
          h('div', { class: 'ww-card-actions' }, [
            h('button', {
              class: 'ww-btn',
              onclick: function () { WhatsWorkStore.updateReminder(rem.id, { done: true }).then(render); }
            }, ['Concluir']),
            h('button', {
              class: 'ww-link',
              onclick: function () { WhatsWorkStore.removeReminder(rem.id).then(render); }
            }, ['remover'])
          ])
        ]));
      });
    });
  }

  /* ------------------------------------------------------------------ IA */

  function renderIA() {
    var s = state.settings || {};

    if (!s.aiEnabled) {
      ui.body.appendChild(emptyState(
        'A IA está desligada. Abra o ícone da extensão na barra do Chrome, ' +
        'cole sua chave da API da Anthropic em Ajustes e ligue a opção.'));
      return;
    }

    ui.body.appendChild(section('Responder', [
      h('div', { class: 'ww-actions-grid' }, [
        aiButton('sugerir', 'Sugerir resposta'),
        aiButton('melhorar', 'Melhorar meu texto')
      ])
    ]));

    ui.body.appendChild(section('Vender', [
      h('div', { class: 'ww-actions-grid' }, [
        aiButton('objecao', 'Contornar objeção'),
        aiButton('fechar', 'Fechar a venda'),
        aiButton('followup', 'Retomar contato'),
        aiButton('resumir', 'Resumir conversa')
      ])
    ]));

    if (state.ai.loading) {
      ui.body.appendChild(emptyState('Consultando a IA…'));
      return;
    }
    if (state.ai.error) {
      ui.body.appendChild(h('div', { class: 'ww-warn', text: state.ai.error }));
      return;
    }
    if (state.ai.text) {
      ui.body.appendChild(section('Resultado', [
        h('div', { class: 'ww-ai-output', text: state.ai.text }),
        h('div', { class: 'ww-card-actions' }, [
          h('button', {
            class: 'ww-btn',
            onclick: function () { WhatsWorkDom.setComposerText(state.ai.text); }
          }, ['Inserir no campo']),
          h('button', {
            class: 'ww-link',
            onclick: function () { state.ai.text = ''; render(); }
          }, ['limpar'])
        ]),
        // A IA nunca envia: ela escreve no campo e a decisão continua sua.
        h('p', { class: 'ww-empty', text:
          'O texto é apenas inserido no campo de mensagem. Revise antes de enviar.' })
      ]));
    }

    if (!String(s.businessContext || '').trim()) {
      ui.body.appendChild(h('p', { class: 'ww-warn', text:
        'Você ainda não descreveu o que vende. Sem isso a IA não cita preço nem produto — ela deixa ' +
        '[preencher] no lugar. Abra o popup da extensão e preencha "O que você vende".' }));
    }

    ui.body.appendChild(h('p', { class: 'ww-warn', text:
      'Ao usar estas ações, o texto das últimas ' + (s.aiContextMessages || 12) +
      ' mensagens desta conversa é enviado para a API da Anthropic com a sua chave. ' +
      'Nenhuma outra parte da extensão manda dados para fora.' }));
  }

  function aiButton(task, label) {
    return h('button', {
      class: 'ww-btn',
      onclick: function () {
        state.ai = { loading: true, error: '', text: '' };
        render();
        var s = state.settings || {};
        chrome.runtime.sendMessage({
          type: 'whatswork:ai',
          task: task,
          messages: WhatsWorkDom.getRecentMessages(s.aiContextMessages || 12),
          draft: task === 'melhorar' ? WhatsWorkDom.getComposerText() : ''
        }).then(function (res) {
          state.ai = res && res.ok
            ? { loading: false, error: '', text: res.text }
            : { loading: false, error: (res && res.error) || 'Falha ao falar com a extensão.', text: '' };
          render();
        }, function (err) {
          state.ai = { loading: false, error: String((err && err.message) || err), text: '' };
          render();
        });
      }
    }, [label]);
  }

  /** Pede ao content script que processe a fila agora (definido em index.js). */
  function processNow() {
    return root.WhatsWorkQueue && root.WhatsWorkQueue.process
      ? root.WhatsWorkQueue.process()
      : Promise.resolve();
  }

  function section(title, children) {
    return h('section', { class: 'ww-section' },
      [h('h3', { class: 'ww-section-title', text: title })].concat(children));
  }

  /* --------------------------------------------------------------- estado */

  function reloadContact() {
    if (!state.chat) { state.contact = null; render(); return Promise.resolve(); }
    return WhatsWorkStore.getContact(state.chat.jid).then(function (c) {
      state.contact = c;
      render();
    });
  }

  function setChat(chat) {
    state.chat = chat;
    if (!chat) { state.contact = null; render(); return; }

    var patch = { name: chat.name, phone: chat.phone, isGroup: chat.isGroup };

    // A data da última mensagem é lida do próprio WhatsApp, então o "sem
    // contato há X dias" vale também para conversas anteriores à extensão.
    var ultima = WhatsWorkDom.getLastMessageTime();
    if (ultima) patch.lastContactAt = ultima;

    WhatsWorkStore.upsertContact(chat.jid, patch).then(function (c) {
      state.contact = c;
      render();
    });
  }

  function init() {
    return Promise.all([
      WhatsWorkStore.get('whatswork:openShadowForTests', false),
      WhatsWorkStore.getSettings(),
      WhatsWorkStore.listTags()
    ]).then(function (r) {
      state.settings = r[1];
      state.tags = r[2];
      mount(r[0] === true);
      render();
      WhatsWorkDom.onChatChange(setChat);
      setChat(WhatsWorkDom.getActiveChat());

      // Ajustes mudam no popup; o painel acompanha sem precisar recarregar.
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'local' && changes[WhatsWorkStore.KEYS.SETTINGS]) {
          WhatsWorkStore.getSettings().then(function (s) { state.settings = s; render(); });
        }
      });
    });
  }

  root.WhatsWorkPanel = { init: init, render: render, setOpen: setOpen, renderTemplate: renderTemplate };
})(typeof globalThis !== 'undefined' ? globalThis : window);
