(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

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
      // Baixado via <a download> em vez de chrome.downloads: evita pedir a
      // permissão "downloads" só para salvar um CSV que o usuário já pediu.
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
        alert('O CSV precisa de uma coluna "telefone".');
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
          alert('Importação concluída.');
        });
      });
    });
  });

  refreshStats();
  refreshTags();
})();
