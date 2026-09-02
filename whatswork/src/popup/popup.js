(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var savedTimer = null;

  function flash(msg) {
    $('saved').textContent = msg;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () { $('saved').textContent = ''; }, 2000);
  }

  /* --------------------------------------------------------------- stats */

  function refreshStats() {
    Promise.all([
      WhatsWorkStore.listContacts(),
      WhatsWorkStore.listScheduled(),
      WhatsWorkStore.listReminders()
    ]).then(function (res) {
      var contacts = Object.keys(res[0]).map(function (k) { return res[0][k]; });
      $('stat-contacts').textContent = contacts.length;
      $('stat-notes').textContent = contacts.reduce(function (sum, c) {
        return sum + ((c.notes || []).length);
      }, 0);
      $('stat-scheduled').textContent = res[1].filter(function (s) {
        return s.status === 'pending' || s.status === 'due';
      }).length;
      $('stat-reminders').textContent = res[2].filter(function (r) { return !r.done; }).length;
    });
  }

  /* -------------------------------------------------------------- ajustes */

  var NUMERIC = {
    'set-hour': 'maxPerHour',
    'set-day': 'maxPerDay',
    'set-interval': 'minIntervalSeconds',
    'set-quiet-start': 'quietStartHour',
    'set-quiet-end': 'quietEndHour'
  };

  function loadSettings() {
    return WhatsWorkStore.getSettings().then(function (s) {
      $('set-confirm').checked = !!s.requireConfirmation;
      $('set-ai').checked = !!s.aiEnabled;
      $('set-model').value = s.aiModel;
      $('set-business').value = s.businessContext || '';
      $('set-voice').value = s.voiceStyle || '';
      Object.keys(NUMERIC).forEach(function (id) { $(id).value = s[NUMERIC[id]]; });
      return WhatsWorkStore.getApiKey();
    }).then(function (key) {
      $('set-key').value = key || '';
    });
  }

  /** Lê um campo numérico respeitando os limites declarados no HTML. */
  function readNumber(el, fallback) {
    var n = parseInt(el.value, 10);
    if (isNaN(n)) return fallback;
    return Math.min(Math.max(n, Number(el.min)), Number(el.max));
  }

  function wireSettings() {
    $('set-confirm').addEventListener('change', function () {
      WhatsWorkStore.saveSettings({ requireConfirmation: this.checked })
        .then(function () { flash('Ajuste salvo.'); });
    });

    $('set-ai').addEventListener('change', function () {
      WhatsWorkStore.saveSettings({ aiEnabled: this.checked })
        .then(function () { flash('Ajuste salvo.'); });
    });

    $('set-model').addEventListener('change', function () {
      WhatsWorkStore.saveSettings({ aiModel: this.value })
        .then(function () { flash('Modelo salvo.'); });
    });

    Object.keys(NUMERIC).forEach(function (id) {
      $(id).addEventListener('change', function () {
        var patch = {};
        patch[NUMERIC[id]] = readNumber(this, WhatsWorkStore.DEFAULT_SETTINGS[NUMERIC[id]]);
        this.value = patch[NUMERIC[id]];
        WhatsWorkStore.saveSettings(patch).then(function () { flash('Ajuste salvo.'); });
      });
    });

    $('set-business').addEventListener('change', function () {
      WhatsWorkStore.saveSettings({ businessContext: this.value })
        .then(function () { flash('Contexto do negócio salvo.'); });
    });

    $('set-voice').addEventListener('change', function () {
      WhatsWorkStore.saveSettings({ voiceStyle: this.value })
        .then(function () { flash('Tom de voz salvo.'); });
    });

    $('set-key').addEventListener('change', function () {
      WhatsWorkStore.setApiKey(this.value).then(function () { flash('Chave salva.'); });
    });

    $('key-toggle').addEventListener('click', function () {
      var input = $('set-key');
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  }

  /* ------------------------------------------------------------ etiquetas */

  function refreshTags() {
    WhatsWorkStore.listTags().then(function (tags) {
      var ul = $('tag-list');
      ul.textContent = '';
      tags.forEach(function (tag) {
        var li = document.createElement('li');
        li.style.background = tag.color;
        li.appendChild(document.createTextNode(tag.name));
        var btn = document.createElement('button');
        btn.textContent = '×';
        btn.title = 'Remover etiqueta';
        btn.addEventListener('click', function () {
          WhatsWorkStore.removeTag(tag.id).then(refreshTags);
        });
        li.appendChild(btn);
        ul.appendChild(li);
      });
    });
  }

  $('tag-add').addEventListener('click', function () {
    var name = $('tag-name').value.trim();
    if (!name) return;
    WhatsWorkStore.addTag(name, $('tag-color').value).then(function () {
      $('tag-name').value = '';
      refreshTags();
    });
  });

  /* ------------------------------------------------------- kit de vendas */

  /*
   * Ponto de partida para quem vende cosméticos no WhatsApp. Cada modelo é um
   * esqueleto com [colchetes] no lugar do que só o dono do negócio sabe —
   * assim ninguém sai mandando mensagem com preço errado por descuido.
   */
  var KIT_COSMETICOS = [
    { title: 'Abordagem — primeiro contato', body:
      'Oi {{primeiro_nome}}! Aqui é a [seu nome], da [sua loja] 💄\n' +
      'Vi que você se interessou por [produto]. Posso te mandar as opções e os valores?' },
    { title: 'Catálogo', body:
      'Te mando o catálogo completo aqui, {{primeiro_nome}}: [link]\n' +
      'Se preferir, me diz o que você procura (pele, cabelo, maquiagem) que eu já separo o que combina.' },
    { title: 'Dúvida — qual produto escolher', body:
      'Pra eu te indicar certo: seu [cabelo/pele] é mais [oleoso/seco/misto]?\n' +
      'Com isso eu já te falo qual da linha [marca] funciona melhor pra você.' },
    { title: 'Objeção — está caro', body:
      'Entendo, {{primeiro_nome}}. Esse é o [produto] de [tamanho], que rende cerca de [duração].\n' +
      'Se preferir começar com algo mais em conta, tenho o [alternativa] por [valor]. Quer ver?' },
    { title: 'Fechamento', body:
      'Perfeito! Então fecho [produto] por [valor].\n' +
      'Você prefere pagar por Pix ou cartão?' },
    { title: 'Pós-venda', body:
      'Oi {{primeiro_nome}}! Seu pedido saiu hoje 📦\n' +
      'Uma dica de uso: [dica]. Qualquer dúvida me chama, tá?' },
    { title: 'Recompra (30 dias)', body:
      'Oi {{primeiro_nome}}, tudo bem? Faz mais ou menos um mês que você levou o [produto].\n' +
      'Como está sendo o resultado? Se já estiver acabando, eu separo a reposição.' }
  ];

  var KIT_ETIQUETAS = [
    { name: 'Aguardando pagamento', color: '#7c3aed' },
    { name: 'Recompra', color: '#0891b2' }
  ];

  $('seed-kit').addEventListener('click', function () {
    WhatsWorkStore.listTemplates().then(function (existentes) {
      var titulos = existentes.map(function (t) { return t.title; });
      // Idempotente: clicar duas vezes não duplica nada.
      var novos = KIT_COSMETICOS.filter(function (t) { return titulos.indexOf(t.title) === -1; });
      var chain = Promise.resolve();
      novos.forEach(function (tpl) {
        chain = chain.then(function () { return WhatsWorkStore.saveTemplate({ title: tpl.title, body: tpl.body }); });
      });
      return chain.then(function () { return novos.length; });
    }).then(function (quantos) {
      return WhatsWorkStore.listTags().then(function (tags) {
        var nomes = tags.map(function (t) { return t.name; });
        var chain = Promise.resolve();
        KIT_ETIQUETAS.forEach(function (tag) {
          if (nomes.indexOf(tag.name) === -1) {
            chain = chain.then(function () { return WhatsWorkStore.addTag(tag.name, tag.color); });
          }
        });
        return chain.then(function () { return quantos; });
      });
    }).then(function (quantos) {
      refreshTags();
      flash(quantos ? quantos + ' modelo(s) adicionado(s).' : 'Os modelos já estavam carregados.');
    });
  });

  /* ------------------------------------------------------------------ CSV */

  /**
   * Células que começam com = + - @ recebem um apóstrofo na frente: sem isso
   * o Excel/Sheets interpretaria o conteúdo como fórmula ao abrir o arquivo.
   */
  function csvCell(value) {
    var s = String(value == null ? '' : value);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var quoted = false;

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else quoted = false;
        } else cell += ch;
        continue;
      }
      if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch !== '\r') cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ''; }); });
  }

  $('export').addEventListener('click', function () {
    Promise.all([WhatsWorkStore.listContacts(), WhatsWorkStore.listTags()]).then(function (res) {
      var contacts = res[0];
      var tagsById = {};
      res[1].forEach(function (t) { tagsById[t.id] = t.name; });

      // Só contatos: a chave da API e os ajustes ficam de fora do arquivo.
      var lines = ['telefone,nome,etiquetas,anotacoes'];
      Object.keys(contacts).forEach(function (jid) {
        var c = contacts[jid];
        lines.push([
          csvCell(c.phone || ''),
          csvCell(c.name || ''),
          csvCell((c.tags || []).map(function (id) { return tagsById[id] || id; }).join('|')),
          csvCell((c.notes || []).map(function (n) { return n.text; }).join(' || '))
        ].join(','));
      });

      var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'whatswork-contatos.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    });
  });

  $('import-btn').addEventListener('click', function () { $('import').click(); });

  $('import').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    file.text().then(function (text) {
      var rows = parseCsv(text.replace(/^﻿/, ''));
      if (!rows.length) return;

      var header = rows[0].map(function (c) { return c.trim().toLowerCase(); });
      var idx = {
        phone: header.indexOf('telefone'),
        name: header.indexOf('nome'),
        tags: header.indexOf('etiquetas'),
        notes: header.indexOf('anotacoes')
      };
      if (idx.phone === -1) {
        flash('O CSV precisa de uma coluna "telefone".');
        return;
      }

      WhatsWorkStore.listTags().then(function (tags) {
        var byName = {};
        tags.forEach(function (t) { byName[t.name.toLowerCase()] = t.id; });

        var chain = Promise.resolve();
        rows.slice(1).forEach(function (row) {
          var phone = (row[idx.phone] || '').replace(/\D/g, '');
          if (!phone) return;
          var jid = WhatsWorkStore.phoneToJid(phone);
          var tagIds = idx.tags === -1 ? [] : (row[idx.tags] || '')
            .split('|')
            .map(function (n) { return byName[n.trim().toLowerCase()]; })
            .filter(Boolean);

          chain = chain
            .then(function () {
              return WhatsWorkStore.upsertContact(jid, {
                name: idx.name === -1 ? '' : (row[idx.name] || '').trim(),
                phone: phone,
                tags: tagIds
              });
            })
            .then(function () {
              var note = idx.notes === -1 ? '' : (row[idx.notes] || '').trim();
              return note ? WhatsWorkStore.addNote(jid, note) : null;
            });
        });

        chain.then(function () {
          refreshStats();
          flash('Importação concluída.');
        });
      });
    });
  });

  wireSettings();
  loadSettings();
  refreshStats();
  refreshTags();
})();
