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

  /* Texto de ajuda por provedor. O aviso do Claude existe porque a confusão
     entre a assinatura do claude.ai e os créditos do Console é constante. */
  var PROVIDER_INFO = {
    claude: {
      placeholder: 'sk-ant-…',
      note: 'A chave vem de platform.claude.com (o Console), não do chat em claude.ai. ' +
        'Uma assinatura Claude Pro ou Max NÃO paga o uso da API — são cobranças separadas.',
      where: 'Onde pegar: platform.claude.com/settings/keys · créditos em Settings → Billing.',
      fallback: [
        { id: 'claude-opus-5', label: 'Claude Opus 5' },
        { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
        { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' }
      ]
    },
    gemini: {
      placeholder: 'AIza…',
      note: 'A chave vem do Google AI Studio e tem um plano gratuito com limite por minuto e por ' +
        'dia — dá para usar sem cartão de crédito.',
      where: 'Onde pegar: aistudio.google.com → Get API key.',
      fallback: [
        { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
      ]
    }
  };

  var MODELS_KEY = 'whatswork:models';
  var providerAtual = 'claude';

  function modelField(p) { return p === 'gemini' ? 'aiModelGemini' : 'aiModelClaude'; }

  /**
   * Preenche o select de modelos com a lista que a API devolveu da última vez,
   * caindo para a lista embutida quando ainda não houve consulta. O modelo
   * salvo é acrescentado mesmo se não estiver na lista, para não sumir sozinho.
   */
  function renderModels(p, salvo, vindoDaApi) {
    return WhatsWorkStore.get(MODELS_KEY, {}).then(function (cache) {
      var lista = (cache && cache[p] && cache[p].length) ? cache[p] : PROVIDER_INFO[p].fallback;
      var conhecido = lista.some(function (m) { return m.id === salvo; });

      // Antes de consultar a API não dá para saber se o modelo salvo existe —
      // então ele é mantido na lista. Depois de uma consulta bem-sucedida, um
      // modelo ausente é um modelo que não existe mais: trocamos pelo primeiro
      // disponível, senão o usuário ficaria preso num 404 permanente.
      var trocou = false;
      if (salvo && !conhecido) {
        if (vindoDaApi) {
          salvo = lista[0].id;
          trocou = true;
        } else {
          lista = [{ id: salvo, label: salvo }].concat(lista);
        }
      }

      var sel = $('set-model');
      sel.textContent = '';
      lista.forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        sel.appendChild(opt);
      });
      if (salvo) sel.value = salvo;

      if (!trocou) return { trocou: false, modelo: salvo };
      var patch = {};
      patch[modelField(p)] = salvo;
      return WhatsWorkStore.saveSettings(patch).then(function () {
        return { trocou: true, modelo: salvo };
      });
    });
  }

  function applyProvider(p, settings) {
    providerAtual = p;
    var info = PROVIDER_INFO[p];
    $('set-key').placeholder = info.placeholder;
    $('provider-note').textContent = info.note;
    $('key-where').textContent = info.where;
    $('ai-test-result').textContent = '';
    return Promise.all([
      WhatsWorkStore.getApiKey(p).then(function (k) { $('set-key').value = k || ''; }),
      renderModels(p, settings[modelField(p)])
    ]);
  }

  function loadSettings() {
    return WhatsWorkStore.getSettings().then(function (s) {
      $('set-confirm').checked = !!s.requireConfirmation;
      $('set-ai').checked = !!s.aiEnabled;
      $('set-provider').value = s.aiProvider;
      $('set-business').value = s.businessContext || '';
      $('set-voice').value = s.voiceStyle || '';
      Object.keys(NUMERIC).forEach(function (id) { $(id).value = s[NUMERIC[id]]; });
      return applyProvider(s.aiProvider, s);
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

    $('set-provider').addEventListener('change', function () {
      var p = this.value;
      WhatsWorkStore.saveSettings({ aiProvider: p })
        .then(function () { return WhatsWorkStore.getSettings(); })
        .then(function (s) { return applyProvider(p, s); })
        .then(function () {
          flash('Provedor alterado para ' + (p === 'gemini' ? 'Gemini.' : 'Claude.'));
        });
    });

    $('set-model').addEventListener('change', function () {
      var patch = {};
      patch[modelField(providerAtual)] = this.value;
      WhatsWorkStore.saveSettings(patch).then(function () { flash('Modelo salvo.'); });
    });

    $('model-refresh').addEventListener('click', function () {
      var alvo = $('ai-test-result');
      alvo.className = 'muted';
      alvo.textContent = 'Buscando modelos…';
      WhatsWorkStore.setApiKey(providerAtual, $('set-key').value)
        .then(function () { return chrome.runtime.sendMessage({ type: 'whatswork:ai-models' }); })
        .then(function (res) {
          if (!res || !res.ok) {
            alvo.className = 'notice';
            alvo.textContent = '✗ ' + ((res && res.error) || 'Sem resposta da extensão.');
            return;
          }
          return WhatsWorkStore.get(MODELS_KEY, {}).then(function (cache) {
            cache[providerAtual] = res.models;
            return WhatsWorkStore.put(MODELS_KEY, cache);
          }).then(function () {
            return WhatsWorkStore.getSettings();
          }).then(function (s) {
            return renderModels(providerAtual, s[modelField(providerAtual)], true);
          }).then(function (r) {
            alvo.className = 'muted ok';
            alvo.textContent = '✓ ' + res.models.length + ' modelo(s) disponível(is).' +
              (r.trocou ? ' O modelo anterior não existe mais; troquei para ' + r.modelo + '.' : '');
          });
        });
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
      WhatsWorkStore.setApiKey(providerAtual, this.value).then(function () { flash('Chave salva.'); });
    });

    $('ai-test').addEventListener('click', function () {
      var alvo = $('ai-test-result');
      alvo.className = 'muted';
      alvo.textContent = 'Testando…';
      // Salva a chave digitada antes de testar, para não testar a versão antiga.
      WhatsWorkStore.setApiKey(providerAtual, $('set-key').value)
        .then(function () { return chrome.runtime.sendMessage({ type: 'whatswork:ai-test' }); })
        .then(function (res) {
          var ok = res && res.ok;
          alvo.className = ok ? 'muted ok' : 'notice';
          alvo.textContent = ok ? '✓ ' + res.text : '✗ ' + ((res && res.error) || 'Sem resposta da extensão.');
        }, function (err) {
          alvo.className = 'notice';
          alvo.textContent = '✗ ' + String((err && err.message) || err);
        });
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

  /*
   * Tom de voz derivado de "Como Fazer Amigos e Influenciar Pessoas", de Dale
   * Carnegie. Os princípios do livro viraram regras de ESCRITA — o modelo não
   * consegue seguir "desperte no outro um forte desejo", mas consegue seguir
   * "comece a mensagem pelo que a pessoa disse". A leitura aqui é a honesta,
   * não a manipuladora: interesse de verdade, não bajulação.
   */
  var VOZ_CARNEGIE = [
    'Tom baseado em "Como Fazer Amigos e Influenciar Pessoas", de Dale Carnegie.',
    '',
    'Como escrever:',
    '- Comece pelo outro, não pelo produto. A primeira frase responde ao que ELE disse ou precisa.',
    '- Use o nome da pessoa uma vez, no começo. Nunca repetido em toda frase.',
    '- Faça mais perguntas do que afirmações. Termine quase toda mensagem com uma pergunta fácil de responder.',
    '- Reconheça o ponto do cliente antes de responder: "faz sentido", "entendo", "você tem razão em querer isso".',
    '- Nunca diga que ele está errado nem corrija de frente. Se houver engano, traga a informação certa como novidade, não como correção.',
    '- Elogie só o que for verdade e específico (a escolha, o cuidado, a pergunta). Nada de bajulação genérica.',
    '- Fale do que ELE ganha, não das qualidades do produto: o resultado nele, o tempo que poupa, o quanto rende.',
    '- Deixe a decisão com ele. Ofereça opções ("prefere A ou B?") em vez de empurrar uma.',
    '- Se você errou algo, admita rápido e sem rodeio, e diga o que vai fazer a respeito.',
    '- Nunca discuta, nunca insista depois de um "não", nunca crie urgência falsa.',
    '',
    'Forma: frases curtas, no máximo um emoji, sem "prezado", sem jargão de marketing,',
    'sem CAPS LOCK e sem gatilho de escassez.'
  ].join('\n');

  $('voice-carnegie').addEventListener('click', function () {
    $('set-business').focus();   // tira o foco do textarea antes de sobrescrever
    $('set-voice').value = VOZ_CARNEGIE;
    WhatsWorkStore.saveSettings({ voiceStyle: VOZ_CARNEGIE })
      .then(function () { flash('Tom de voz carregado. Edite à vontade.'); });
  });

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
