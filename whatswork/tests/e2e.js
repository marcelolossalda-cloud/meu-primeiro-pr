#!/usr/bin/env node
/*
 * Teste ponta a ponta: carrega a extensão num Chromium real e exercita o
 * painel contra uma réplica do DOM do WhatsApp Web.
 *
 * O truque está no page.route: as requisições para https://web.whatsapp.com/
 * são respondidas com o fixture local. Como a URL continua sendo a real, o
 * Chrome injeta os content scripts normalmente e tudo roda com as APIs de
 * extensão de verdade (chrome.storage, chrome.runtime, service worker) —
 * nada de mock das APIs.
 *
 * Uso: node whatswork/tests/e2e.js
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const EXT = path.resolve(__dirname, '..');
const MOCK = fs.readFileSync(path.join(__dirname, 'fixtures/whatsapp-mock.html'), 'utf8');
const CHAT_PHONE = '5511999998888';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(['ok', name]);
    console.log('  ok   ' + name);
  } catch (err) {
    results.push(['FALHOU', name, err]);
    console.log('  FALHOU ' + name + '\n         ' + (err && err.message));
  }
}

/** Repete `read` até `ok` aceitar o valor, ou estoura com `message`. */
async function waitFor(read, ok, timeoutMs, message) {
  const limit = Date.now() + timeoutMs;
  let last;
  while (Date.now() < limit) {
    last = await read();
    if (ok(last)) return last;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new assert.AssertionError({ message: `${message} (último valor: ${JSON.stringify(last)})` });
}

(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'whatswork-profile-'));
  // A versão do Chromium instalada aqui pode não ser a que o pacote playwright
  // espera; apontar o executável evita o "npx playwright install".
  const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    executablePath: fs.existsSync(executablePath) ? executablePath : undefined,
    args: [
      '--no-sandbox',
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`
    ]
  });

  const pageErrors = [];
  context.on('weberror', (e) => pageErrors.push(String(e.error())));

  // Qualquer requisição que não seja para o próprio WhatsApp ou para arquivos
  // internos da extensão é vazamento de dados — o fixture não carrega nada de
  // fora, então a lista tem de terminar vazia.
  const externalRequests = [];
  context.on('request', (req) => {
    const url = req.url();
    const local = url.startsWith('chrome-extension://') ||
      url.startsWith('https://web.whatsapp.com/') ||
      url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('devtools://');
    if (!local) externalRequests.push(url);
  });

  console.log('\nWhatsWork — teste ponta a ponta\n');

  let sw;
  let page;

  const settings = (patch) =>
    sw.evaluate((p) => WhatsWorkStore.saveSettings(p), patch);
  const scheduled = () =>
    sw.evaluate(() => WhatsWorkStore.listScheduled().then((l) => l[l.length - 1]));

  /** Cria um agendamento já vencido e roda o relógio, como o alarme faria. */
  const scheduleOverdue = (body) =>
    sw.evaluate(([phone, texto]) =>
      WhatsWorkStore.addScheduled({
        jid: phone + '@c.us', phone, name: 'Contato Teste',
        body: texto, sendAt: Date.now() - 60000
      }).then(() => tick()),
    [CHAT_PHONE, body]);

  async function openPanel(tab) {
    if (!(await page.locator('.ww-panel.is-open').count())) await page.locator('.ww-toggle').click();
    await page.locator('.ww-panel.is-open').waitFor({ timeout: 5000 });
    if (tab) {
      await page.locator(`.ww-tab[data-tab="${tab}"]`).click();
      await page.locator(`.ww-tab[data-tab="${tab}"].is-active`).waitFor({ timeout: 5000 });
    }
  }

  await step('a extensão carrega e registra o service worker', async () => {
    sw = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
    assert.ok(sw.url().includes('service-worker.js'), 'service worker não subiu');
  });

  await step('o painel é injetado no WhatsApp Web', async () => {
    // O painel usa shadow root fechado em produção; esta chave o abre para o
    // teste conseguir enxergá-lo de fora. Nada mais depende dela.
    await sw.evaluate(() => chrome.storage.local.set({ 'whatswork:openShadowForTests': true }));

    page = await context.newPage();
    await page.route('https://web.whatsapp.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: MOCK }));
    await page.goto('https://web.whatsapp.com/');
    await page.waitForSelector('#whatswork-host', { state: 'attached', timeout: 15000 });
    assert.strictEqual(await page.locator('.ww-toggle').count(), 1);
  });

  await step('a página não enxerga o código nem os dados da extensão', async () => {
    const vazou = await page.evaluate(() => ({
      store: typeof window.WhatsWorkStore,
      dom: typeof window.WhatsWorkDom,
      chrome: typeof (window.chrome && window.chrome.storage)
    }));
    assert.deepStrictEqual(vazou, { store: 'undefined', dom: 'undefined', chrome: 'undefined' });
  });

  await step('o painel identifica a conversa aberta', async () => {
    await openPanel('contato');
    assert.strictEqual((await page.locator('.ww-subtitle').first().textContent()).trim(), 'Contato Teste');
  });

  await step('uma anotação é salva e sobrevive ao reload', async () => {
    await page.locator('.ww-textarea').first().fill('Pediu orçamento de 3 unidades');
    await page.getByText('Salvar anotação').click();
    await page.locator('.ww-note-text').waitFor({ timeout: 5000 });

    await page.reload();
    await page.waitForSelector('#whatswork-host', { state: 'attached' });
    await openPanel('contato');
    assert.strictEqual(
      (await page.locator('.ww-note-text').first().textContent()).trim(),
      'Pediu orçamento de 3 unidades');
  });

  await step('uma etiqueta é aplicada e sobrevive ao reload', async () => {
    await page.locator('.ww-chip', { hasText: 'Cliente' }).click();
    await page.locator('.ww-chip.is-active', { hasText: 'Cliente' }).waitFor({ timeout: 5000 });

    await page.reload();
    await page.waitForSelector('#whatswork-host', { state: 'attached' });
    await openPanel('contato');
    await page.locator('.ww-chip.is-active', { hasText: 'Cliente' }).waitFor({ timeout: 5000 });
  });

  await step('um modelo com {{primeiro_nome}} é inserido já preenchido', async () => {
    await openPanel('modelos');
    await page.locator('.ww-input').first().fill('Boas-vindas');
    await page.locator('.ww-textarea').first().fill('Olá {{primeiro_nome}}, tudo bem?');
    await page.getByText('Adicionar modelo').click();
    await page.locator('.ww-card-title').waitFor({ timeout: 5000 });

    await page.getByText('Inserir', { exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector('#main [contenteditable]').innerText.length > 0,
      null, { timeout: 5000 });
    assert.strictEqual(
      (await page.locator('#main [contenteditable]').innerText()).trim(),
      'Olá Contato, tudo bem?');
  });

  await step('o botão Enviar do modelo dispara o envio', async () => {
    await page.evaluate(() => { window.__sent = []; });
    await page.getByText('Enviar', { exact: true }).click();
    await page.waitForFunction(() => window.__sent.length > 0, null, { timeout: 5000 });
    assert.strictEqual((await page.evaluate(() => window.__sent))[0].trim(), 'Olá Contato, tudo bem?');
  });

  /* ---------------------------------------------- proteção do número --- */

  await step('por padrão, mensagem agendada NÃO é enviada sozinha', async () => {
    await page.evaluate(() => { window.__sent = []; });
    await scheduleOverdue('NÃO DEVE SAIR SEM CONFIRMAÇÃO');

    const item = await waitFor(scheduled, (r) => !!r && !!r.waitingReason, 10000,
      'a extensão não registrou a espera por confirmação');

    assert.strictEqual(item.status, 'due');
    assert.strictEqual(item.waitingReason, 'aguardando sua confirmação no painel');
    assert.deepStrictEqual(await page.evaluate(() => window.__sent), [], 'enviou sem confirmação');
  });

  await step('o botão "Enviar agora" confirma e envia', async () => {
    await openPanel('agenda');
    await page.getByText('Enviar agora', { exact: true }).first().click();
    await page.waitForFunction(() => window.__sent.length > 0, null, { timeout: 15000 });
    assert.strictEqual((await page.evaluate(() => window.__sent))[0].trim(), 'NÃO DEVE SAIR SEM CONFIRMAÇÃO');

    const item = await waitFor(scheduled, (r) => r && r.status === 'sent', 8000, 'não marcou como enviada');
    assert.strictEqual(item.status, 'sent');
  });

  await step('sem confirmação obrigatória, o envio agendado acontece sozinho', async () => {
    // Janela de silêncio desligada para o teste não depender da hora do relógio.
    await settings({
      requireConfirmation: false, minIntervalSeconds: 0, jitterSeconds: 0,
      maxPerHour: 60, maxPerDay: 500, quietStartHour: 0, quietEndHour: 0
    });
    await sw.evaluate(() => WhatsWorkStore.put(WhatsWorkStore.KEYS.SENDSTATE, { log: [], nextAllowedAt: 0 }));

    await page.evaluate(() => { window.__sent = []; });
    await scheduleOverdue('Follow-up automático');

    await page.waitForFunction(() => window.__sent.length > 0, null, { timeout: 20000 });
    assert.strictEqual((await page.evaluate(() => window.__sent))[0].trim(), 'Follow-up automático');
    assert.strictEqual((await scheduled()).status, 'sent');
  });

  await step('o limite por hora barra o envio automático', async () => {
    await settings({ maxPerHour: 1 });
    await sw.evaluate(() => WhatsWorkStore.put(WhatsWorkStore.KEYS.SENDSTATE,
      { log: [Date.now()], nextAllowedAt: 0 }));

    await page.evaluate(() => { window.__sent = []; });
    await scheduleOverdue('ACIMA DO LIMITE');

    const item = await waitFor(scheduled, (r) => !!r && !!r.waitingReason, 10000,
      'o limite por hora não foi registrado');
    assert.match(item.waitingReason, /limite de 1 envios por hora/);
    assert.deepStrictEqual(await page.evaluate(() => window.__sent), [], 'enviou acima do limite');

    await settings({ maxPerHour: 60 });
    await sw.evaluate(() => WhatsWorkStore.put(WhatsWorkStore.KEYS.SENDSTATE, { log: [], nextAllowedAt: 0 }));
    await sw.evaluate(() => WhatsWorkStore.listScheduled().then((l) =>
      WhatsWorkStore.removeScheduled(l[l.length - 1].id)));
  });

  await step('envio agendado não sobrescreve um rascunho em digitação', async () => {
    await page.evaluate(() => {
      window.__sent = [];
      document.querySelector('#main [contenteditable]').textContent = 'rascunho que eu estava escrevendo';
    });
    await scheduleOverdue('NÃO DEVE SER ENVIADA AGORA');

    const item = await waitFor(scheduled, (r) => !!r && !!r.waitingReason, 10000,
      'a extensão não registrou o adiamento');

    assert.strictEqual(item.status, 'due');
    assert.strictEqual(item.waitingReason, 'há um rascunho no campo de mensagem');
    assert.ok((await page.locator('#main [contenteditable]').innerText()).includes('rascunho'),
      'o rascunho foi sobrescrito');
    assert.deepStrictEqual(await page.evaluate(() => window.__sent), [], 'enviou por cima do rascunho');

    await page.evaluate(() => { document.querySelector('#main [contenteditable]').textContent = ''; });
    await sw.evaluate(() => WhatsWorkStore.listScheduled().then((l) =>
      WhatsWorkStore.removeScheduled(l[l.length - 1].id)));
  });

  /* --------------------------------------------------------------- IA --- */

  await step('a aba IA fica bloqueada enquanto a IA está desligada', async () => {
    await openPanel('ia');
    const texto = await page.locator('.ww-empty').first().textContent();
    assert.match(texto, /IA está desligada/);
    assert.strictEqual(await page.getByText('Resumir conversa').count(), 0);
  });

  await step('a IA responde e o texto vai para o campo, sem enviar', async () => {
    // fetch é substituído DENTRO do service worker: nenhum byte sai da máquina
    // e dá para inspecionar exatamente o que teria sido enviado à API.
    await sw.evaluate(() => {
      globalThis.__apiCalls = [];
      globalThis.fetch = function (url, init) {
        globalThis.__apiCalls.push({ url: String(url), headers: init.headers, body: init.body });
        return Promise.resolve(new Response(
          JSON.stringify({ content: [{ type: 'text', text: 'Claro! O plano anual sai por R$ 1.200.' }] }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        ));
      };
    });

    await sw.evaluate(() => WhatsWorkStore.setApiKey('claude', 'sk-ant-chave-de-teste'));
    await settings({
      aiEnabled: true,
      businessContext: 'Distribuidora de cosméticos. Sérum facial R$ 89.',
      voiceStyle: 'Falo próximo, frases curtas, no máximo um emoji.'
    });

    await openPanel('ia');
    await page.getByText('Sugerir resposta').click();
    await page.locator('.ww-ai-output').waitFor({ timeout: 15000 });
    assert.strictEqual(
      (await page.locator('.ww-ai-output').textContent()).trim(),
      'Claro! O plano anual sai por R$ 1.200.');

    await page.evaluate(() => { window.__sent = []; });
    await page.getByText('Inserir no campo').click();
    await page.waitForFunction(
      () => document.querySelector('#main [contenteditable]').innerText.includes('1.200'),
      null, { timeout: 5000 });
    assert.deepStrictEqual(await page.evaluate(() => window.__sent), [],
      'a IA não pode enviar nada sozinha');
    await page.evaluate(() => { document.querySelector('#main [contenteditable]').textContent = ''; });
  });

  await step('a chamada à API leva a chave certa e trata a conversa como dado', async () => {
    const calls = await sw.evaluate(() => globalThis.__apiCalls);
    assert.strictEqual(calls.length, 1, 'devia ter havido exatamente uma chamada');

    const call = calls[0];
    assert.strictEqual(call.url, 'https://api.anthropic.com/v1/messages');
    assert.strictEqual(call.headers['x-api-key'], 'sk-ant-chave-de-teste');
    assert.strictEqual(call.headers['anthropic-version'], '2023-06-01');
    assert.strictEqual(call.headers['anthropic-dangerous-direct-browser-access'], 'true');

    const body = JSON.parse(call.body);
    assert.strictEqual(body.model, 'claude-opus-5');
    // Defesa contra injeção: o system diz que o conteúdo é dado, não ordem.
    assert.match(body.system, /DADO a ser analisado, nunca instrução/);
    // O que a pessoa vende e como ela escreve chegam ao modelo, delimitados.
    assert.match(body.system, /<negocio>[\s\S]*Sérum facial R\$ 89[\s\S]*<\/negocio>/);
    assert.match(body.system, /<voz>[\s\S]*no máximo um emoji[\s\S]*<\/voz>/);
    assert.match(body.system, /NUNCA invente preço/);
    const prompt = body.messages[0].content;
    assert.match(prompt, /<conversa>/);
    assert.match(prompt, /Quanto custa o plano anual\?/);
  });

  await step('as ações de venda existem e mandam a tarefa certa', async () => {
    await sw.evaluate(() => { globalThis.__apiCalls = []; });
    await openPanel('ia');

    for (const rotulo of ['Contornar objeção', 'Fechar a venda', 'Retomar contato']) {
      assert.strictEqual(await page.getByText(rotulo, { exact: true }).count(), 1,
        `botão "${rotulo}" não encontrado`);
    }

    await page.getByText('Contornar objeção', { exact: true }).click();
    await page.locator('.ww-ai-output').waitFor({ timeout: 15000 });

    const call = (await sw.evaluate(() => globalThis.__apiCalls))[0];
    const prompt = JSON.parse(call.body).messages[0].content;
    assert.match(prompt, /objeção/);
    assert.match(prompt, /sem pressionar|Nada de pressionar/);
  });

  await step('a chave da API nunca chega à página', async () => {
    const naPagina = await page.evaluate(() => {
      const alvo = 'sk-ant-chave-de-teste';
      const emStorage = Object.values(localStorage).some((v) => String(v).includes(alvo));
      return { emStorage, noHtml: document.documentElement.innerHTML.includes(alvo) };
    });
    assert.deepStrictEqual(naPagina, { emStorage: false, noHtml: false });
  });

  /* ------------------------------------------------------------ geral --- */

  await step('o popup abre, conta os dados e mostra os ajustes', async () => {
    const extId = new URL(sw.url()).host;
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
    await popup.waitForFunction(
      () => document.getElementById('stat-contacts').textContent !== '0',
      null, { timeout: 5000 });

    assert.strictEqual(await popup.locator('#stat-notes').textContent(), '1');
    assert.ok((await popup.locator('.tags li').count()) >= 4, 'etiquetas padrão não apareceram');
    assert.strictEqual(await popup.locator('#set-key').getAttribute('type'), 'password',
      'o campo da chave precisa nascer mascarado');
    assert.strictEqual(await popup.locator('#set-model').inputValue(), 'claude-opus-5');
    assert.match(await popup.locator('#version').textContent(), /^versão \d+\.\d+\.\d+$/);

    // O botão do tom de voz preenche o campo e persiste o ajuste.
    await popup.locator('#voice-carnegie').click();
    await popup.waitForFunction(
      () => document.getElementById('set-voice').value.includes('Carnegie'),
      null, { timeout: 5000 });
    await popup.close();

    const voz = await sw.evaluate(() => WhatsWorkStore.getSettings().then((s) => s.voiceStyle));
    assert.match(voz, /Comece pelo outro, não pelo produto/);
    assert.match(voz, /nunca crie urgência falsa/);
  });

  await step('o "Testar conexão" reporta sucesso e erro corretamente', async () => {
    const extId = new URL(sw.url()).host;
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
    // A chave é carregada de forma assíncrona; clicar antes disso testaria vazio.
    await popup.waitForFunction(
      () => document.getElementById('set-key').value.startsWith('sk-ant-'),
      null, { timeout: 5000 });
    assert.strictEqual(await popup.locator('#set-provider').inputValue(), 'claude');

    // Sucesso
    await sw.evaluate(() => {
      globalThis.fetch = () => Promise.resolve(new Response(
        JSON.stringify({ content: [{ type: 'text', text: 'OK' }] }),
        { status: 200, headers: { 'content-type': 'application/json' } }));
    });
    await popup.locator('#ai-test').click();
    await popup.waitForFunction(
      () => /^[✓✗]/.test(document.getElementById('ai-test-result').textContent),
      null, { timeout: 10000 });
    assert.ok((await popup.locator('#ai-test-result').textContent()).startsWith('✓'),
      'esperava sucesso, veio: ' + await popup.locator('#ai-test-result').textContent());
    assert.match(await popup.locator('#ai-test-result').textContent(), /Conexão funcionando/);

    // Sem créditos — a mensagem precisa apontar o Console, não o claude.ai
    await sw.evaluate(() => {
      globalThis.fetch = () => Promise.resolve(new Response(
        JSON.stringify({ error: { message: 'Your credit balance is too low to access the API.' } }),
        { status: 400, headers: { 'content-type': 'application/json' } }));
    });
    await popup.locator('#ai-test').click();
    await popup.waitForFunction(
      () => document.getElementById('ai-test-result').textContent.includes('créditos'),
      null, { timeout: 10000 });
    assert.match(await popup.locator('#ai-test-result').textContent(),
      /platform\.claude\.com/);

    // Chave inválida
    await sw.evaluate(() => {
      globalThis.fetch = () => Promise.resolve(new Response(
        JSON.stringify({ error: { message: 'invalid x-api-key' } }),
        { status: 401, headers: { 'content-type': 'application/json' } }));
    });
    await popup.locator('#ai-test').click();
    await popup.waitForFunction(
      () => document.getElementById('ai-test-result').textContent.startsWith('✗'),
      null, { timeout: 10000 });
    const txt = await popup.locator('#ai-test-result').textContent();
    assert.match(txt, /Chave do Claude inválida/);
    // A mensagem crua do provedor tem de sobreviver ao texto amigável.
    assert.match(txt, /HTTP 401 — invalid x-api-key/);

    // Rede fora do ar
    await sw.evaluate(() => {
      globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch'));
    });
    await popup.locator('#ai-test').click();
    await popup.waitForFunction(
      () => document.getElementById('ai-test-result').textContent.includes('api.anthropic.com'),
      null, { timeout: 10000 });
    // A mensagem precisa dar um teste que separa "rede bloqueada" de
    // "extensão desatualizada" — senão o usuário fica adivinhando.
    assert.match(await popup.locator('#ai-test-result').textContent(),
      /abra https:\/\/api\.anthropic\.com\/v1beta\/models numa aba/);
    await popup.close();
  });

  await step('trocar para o Gemini muda endpoint, cabeçalho e formato do corpo', async () => {
    const extId = new URL(sw.url()).host;
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
    await popup.waitForFunction(
      () => document.getElementById('set-key').value.startsWith('sk-ant-'),
      null, { timeout: 5000 });

    await popup.locator('#set-provider').selectOption('gemini');
    // O campo de chave troca junto: a do Claude não pode vazar para o Gemini.
    await popup.waitForFunction(
      () => document.getElementById('set-key').value === '', null, { timeout: 5000 });
    assert.match(await popup.locator('#provider-note').textContent(), /Google AI Studio/);

    await popup.locator('#set-key').fill('AIzaChaveDeTeste');
    await popup.locator('#set-key').blur();

    // A lista de modelos vem da própria API, então um ID novo não quebra nada.
    await sw.evaluate(() => {
      globalThis.__apiCalls = [];
      globalThis.fetch = function (url, init) {
        globalThis.__apiCalls.push({ url: String(url), method: init.method, headers: init.headers, body: init.body });
        if (String(url).includes('/models?')) {
          return Promise.resolve(new Response(JSON.stringify({ models: [
            { name: 'models/gemini-8.0-pro', displayName: 'Gemini 8.0 Pro', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-9.9-flash', displayName: 'Gemini 9.9 Flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-9.9-pro-preview', displayName: 'Gemini 9.9 Pro Preview', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/imagen-4.0-generate', displayName: 'Imagen', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/text-embedding-004', displayName: 'Embeddings', supportedGenerationMethods: ['embedContent'] }
          ] }), { status: 200, headers: { 'content-type': 'application/json' } }));
        }
        return Promise.resolve(new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }]
        }), { status: 200, headers: { 'content-type': 'application/json' } }));
      };
    });

    await popup.locator('#model-refresh').click();
    await popup.waitForFunction(
      () => document.getElementById('ai-test-result').textContent.startsWith('✓'),
      null, { timeout: 10000 });
    // Embeddings e geração de imagem saem da lista; estáveis vêm antes de
    // preview e mais novos antes de mais antigos; e o modelo salvo, que a API
    // não lista mais, é substituído em vez de virar 404.
    const opcoes = await popup.locator('#set-model option').allTextContents();
    assert.deepStrictEqual(opcoes, [
      'Gemini 9.9 Flash — rápido e barato',
      'Gemini 8.0 Pro — mais capaz',
      'Gemini 9.9 Pro Preview — mais capaz'
    ]);
    assert.strictEqual(await popup.locator('#set-model').inputValue(), 'gemini-9.9-flash');
    assert.match(await popup.locator('#ai-test-result').textContent(), /não existe mais/);

    await popup.locator('#ai-test').click();
    await popup.waitForFunction(
      () => document.getElementById('ai-test-result').textContent.includes('Gemini'),
      null, { timeout: 10000 });
    assert.match(await popup.locator('#ai-test-result').textContent(), /^✓ Conexão funcionando com Gemini/);
    await popup.close();

    const chamadas = await sw.evaluate(() => globalThis.__apiCalls);
    const geracao = chamadas[chamadas.length - 1];
    assert.match(geracao.url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-9\.9-flash:generateContent$/);
    assert.strictEqual(geracao.headers['x-goog-api-key'], 'AIzaChaveDeTeste');
    assert.strictEqual(geracao.headers['x-api-key'], undefined, 'não pode mandar cabeçalho do Claude');
    assert.ok(!geracao.url.includes('AIza'), 'a chave não pode ir na URL');

    const corpo = JSON.parse(geracao.body);
    assert.ok(corpo.contents[0].parts[0].text, 'formato do Gemini: contents[].parts[].text');
    assert.ok(corpo.systemInstruction.parts[0].text, 'formato do Gemini: systemInstruction');
    assert.strictEqual(corpo.generationConfig.maxOutputTokens, 16);
  });

  await step('chave "AQ." do AI Studio vai como chave de API, não como Bearer', async () => {
    // As chaves emitidas hoje pelo AI Studio começam com "AQ." e continuam
    // sendo chave de API. Adivinhar pelo prefixo já me fez recusar uma válida.
    await sw.evaluate(() => {
      globalThis.__apiCalls = [];
      globalThis.fetch = function (url, init) {
        globalThis.__apiCalls.push({ url: String(url), headers: init.headers });
        return Promise.resolve(new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }]
        }), { status: 200, headers: { 'content-type': 'application/json' } }));
      };
    });
    await sw.evaluate(() => WhatsWorkStore.setApiKey('gemini', 'AQ.Ab8ExemploDeChaveNova'));

    const res = await sw.evaluate(() => WhatsWorkAI.test());
    assert.ok(res.ok, 'a chave não deveria ser barrada pelo formato: ' + res.error);

    const calls = await sw.evaluate(() => globalThis.__apiCalls);
    assert.strictEqual(calls.length, 1, 'uma chave aceita não deve gerar segunda tentativa');
    assert.strictEqual(calls[0].headers['x-goog-api-key'], 'AQ.Ab8ExemploDeChaveNova');
    assert.strictEqual(calls[0].headers.authorization, undefined);
    assert.ok(!calls[0].url.includes('AQ.Ab8'), 'a credencial não pode ir na URL');
  });

  await step('credencial recusada como chave é reenviada como Bearer', async () => {
    // Quem colar um token OAuth ainda funciona: o 401 dispara a segunda forma.
    await sw.evaluate(() => {
      globalThis.__apiCalls = [];
      globalThis.fetch = function (url, init) {
        globalThis.__apiCalls.push({ headers: init.headers });
        if (init.headers['x-goog-api-key']) {
          return Promise.resolve(new Response(
            JSON.stringify({ error: { message: 'API key not valid' } }),
            { status: 401, headers: { 'content-type': 'application/json' } }));
        }
        return Promise.resolve(new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }]
        }), { status: 200, headers: { 'content-type': 'application/json' } }));
      };
    });

    const res = await sw.evaluate(() => WhatsWorkAI.test());
    assert.ok(res.ok, 'a segunda forma de autenticação não foi tentada: ' + res.error);

    const calls = await sw.evaluate(() => globalThis.__apiCalls);
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[1].headers.authorization, 'Bearer AQ.Ab8ExemploDeChaveNova');
  });

  await step('erro que não é de autenticação não vira segunda tentativa', async () => {
    await sw.evaluate(() => {
      globalThis.__apiCalls = [];
      globalThis.fetch = function (url, init) {
        globalThis.__apiCalls.push({ headers: init.headers });
        return Promise.resolve(new Response(
          JSON.stringify({ error: { message: 'quota exceeded' } }),
          { status: 429, headers: { 'content-type': 'application/json' } }));
      };
    });

    const res = await sw.evaluate(() => WhatsWorkAI.test());
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /Cota esgotada para esse modelo/);
    assert.match(res.error, /HTTP 429 — quota exceeded/);
    // A mensagem precisa dizer O QUE foi tentado, não só que falhou.
    assert.match(res.error, /tentei: Gemini \(Google\) \/ /);
    assert.strictEqual((await sw.evaluate(() => globalThis.__apiCalls)).length, 1);

    await sw.evaluate(() => WhatsWorkStore.setApiKey('gemini', 'AIzaChaveDeTeste'));
  });

  await step('modelo aposentado é trocado sozinho pelo que a API indica', async () => {
    // Caso real: o Google respondeu 404 dizendo "use models/gemini-3.6-flash".
    // Em vez de exigir que o usuário traduza a mensagem, a extensão obedece.
    await sw.evaluate(() => WhatsWorkStore.saveModelFor('gemini', 'gemini-2.5-flash'));
    await sw.evaluate(() => {
      globalThis.__apiCalls = [];
      globalThis.fetch = function (url, init) {
        globalThis.__apiCalls.push({ url: String(url) });
        if (String(url).includes('gemini-2.5-flash')) {
          return Promise.resolve(new Response(JSON.stringify({ error: { message:
            'This model models/gemini-2.5-flash is no longer available to new users. ' +
            'Please update your code to use models/gemini-3.6-flash for the latest features.' } }),
            { status: 404, headers: { 'content-type': 'application/json' } }));
        }
        return Promise.resolve(new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }]
        }), { status: 200, headers: { 'content-type': 'application/json' } }));
      };
    });

    const res = await sw.evaluate(() => WhatsWorkAI.test());
    assert.ok(res.ok, 'a troca automática não aconteceu: ' + res.error);
    assert.match(res.text, /gemini-3\.6-flash/);
    assert.match(res.text, /foi aposentado; troquei para você/);

    const calls = await sw.evaluate(() => globalThis.__apiCalls);
    assert.strictEqual(calls.length, 2, 'devia ter tentado o antigo e depois o novo');
    assert.ok(calls[1].url.includes('gemini-3.6-flash'));

    // A troca precisa ficar salva, senão o erro volta na próxima chamada.
    const salvo = await sw.evaluate(() =>
      WhatsWorkStore.getSettings().then((s) => s.aiModelGemini));
    assert.strictEqual(salvo, 'gemini-3.6-flash');
  });

  await step('substituto que também falha não vira laço', async () => {
    await sw.evaluate(() => WhatsWorkStore.saveModelFor('gemini', 'gemini-antigo'));
    await sw.evaluate(() => {
      globalThis.__apiCalls = [];
      globalThis.fetch = function (url, init) {
        globalThis.__apiCalls.push({ url: String(url) });
        return Promise.resolve(new Response(JSON.stringify({ error: { message:
          'model retired, please use models/outro-modelo' } }),
          { status: 404, headers: { 'content-type': 'application/json' } }));
      };
    });

    const res = await sw.evaluate(() => WhatsWorkAI.test());
    assert.strictEqual(res.ok, false);
    assert.strictEqual((await sw.evaluate(() => globalThis.__apiCalls)).length, 2,
      'uma tentativa de recuperação, não mais');
    assert.match(res.error, /tentei: Gemini \(Google\) \/ outro-modelo/);

    await sw.evaluate(() => WhatsWorkStore.saveModelFor('gemini', 'gemini-3.6-flash'));
  });

  await step('sobrecarga temporária (503) é repetida até passar', async () => {
    // Caso real: "This model is currently experiencing high demand… try again
    // later." É uma instrução que o código segue sozinho.
    await sw.evaluate(() => {
      globalThis.__tentativas = 0;
      globalThis.fetch = function () {
        globalThis.__tentativas++;
        if (globalThis.__tentativas < 3) {
          return Promise.resolve(new Response(JSON.stringify({ error: { message:
            'This model is currently experiencing high demand.' } }),
            { status: 503, headers: { 'content-type': 'application/json' } }));
        }
        return Promise.resolve(new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }]
        }), { status: 200, headers: { 'content-type': 'application/json' } }));
      };
    });

    const res = await sw.evaluate(() => WhatsWorkAI.test());
    assert.ok(res.ok, 'a repetição não recuperou: ' + res.error);
    assert.strictEqual(await sw.evaluate(() => globalThis.__tentativas), 3);
  });

  await step('sobrecarga que não passa desiste e explica', async () => {
    await sw.evaluate(() => {
      globalThis.__tentativas = 0;
      globalThis.fetch = function () {
        globalThis.__tentativas++;
        return Promise.resolve(new Response(JSON.stringify({ error: { message:
          'high demand' } }), { status: 503, headers: { 'content-type': 'application/json' } }));
      };
    });

    const res = await sw.evaluate(() => WhatsWorkAI.test());
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /congestionado/);
    // 1 chamada + 3 repetições, e para por aí.
    assert.strictEqual(await sw.evaluate(() => globalThis.__tentativas), 4);
  });

  await step('cota (429) não é repetida, para não queimar o que resta', async () => {
    await sw.evaluate(() => {
      globalThis.__tentativas = 0;
      globalThis.fetch = function () {
        globalThis.__tentativas++;
        return Promise.resolve(new Response(JSON.stringify({ error: { message: 'quota' } }),
          { status: 429, headers: { 'content-type': 'application/json' } }));
      };
    });

    const res = await sw.evaluate(() => WhatsWorkAI.test());
    assert.strictEqual(res.ok, false);
    assert.strictEqual(await sw.evaluate(() => globalThis.__tentativas), 1);
  });

  await step('acha sozinho um modelo com cota, pulando os que dão 429', async () => {
    // Caso real: no nível gratuito a cota é por modelo — o mais novo veio com
    // cota zero enquanto outro funcionava.
    await sw.evaluate(() => WhatsWorkStore.saveModelFor('gemini', 'gemini-sem-cota'));
    await sw.evaluate(() => {
      globalThis.__testados = [];
      globalThis.fetch = function (url) {
        var u = String(url);
        if (u.includes('/models?')) {
          return Promise.resolve(new Response(JSON.stringify({ models: [
            { name: 'models/gemini-sem-cota', displayName: 'Sem cota', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-tambem-sem', displayName: 'Também sem', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-que-funciona', displayName: 'Funciona', supportedGenerationMethods: ['generateContent'] }
          ] }), { status: 200, headers: { 'content-type': 'application/json' } }));
        }
        globalThis.__testados.push(u.split('/models/')[1].split(':')[0]);
        if (u.includes('gemini-que-funciona')) {
          return Promise.resolve(new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }]
          }), { status: 200, headers: { 'content-type': 'application/json' } }));
        }
        return Promise.resolve(new Response(JSON.stringify({ error: { message:
          'Quota exceeded for metric' } }), { status: 429, headers: { 'content-type': 'application/json' } }));
      };
    });

    const res = await sw.evaluate(() => WhatsWorkAI.findWorkingModel());
    assert.ok(res.ok, 'não achou modelo: ' + res.error);
    assert.strictEqual(res.model, 'gemini-que-funciona');

    // O modelo atual é testado primeiro, e a busca para no primeiro sucesso.
    const testados = await sw.evaluate(() => globalThis.__testados);
    assert.strictEqual(testados[0], 'gemini-sem-cota');
    assert.strictEqual(testados[testados.length - 1], 'gemini-que-funciona');

    const salvo = await sw.evaluate(() =>
      WhatsWorkStore.getSettings().then((s) => s.aiModelGemini));
    assert.strictEqual(salvo, 'gemini-que-funciona', 'a escolha precisa ficar salva');
  });

  await step('quando nenhum modelo tem cota, explica em vez de insistir', async () => {
    await sw.evaluate(() => {
      globalThis.fetch = function (url) {
        if (String(url).includes('/models?')) {
          return Promise.resolve(new Response(JSON.stringify({ models: [
            { name: 'models/a', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/b', supportedGenerationMethods: ['generateContent'] }
          ] }), { status: 200, headers: { 'content-type': 'application/json' } }));
        }
        return Promise.resolve(new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }),
          { status: 429, headers: { 'content-type': 'application/json' } }));
      };
    });

    const res = await sw.evaluate(() => WhatsWorkAI.findWorkingModel());
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /Nenhum dos \d+ modelos testados respondeu/);
    assert.match(res.error, /Cota esgotada/);

    await sw.evaluate(() => WhatsWorkStore.saveModelFor('gemini', 'gemini-3.6-flash'));
  });

  await step('cada provedor guarda a sua própria chave', async () => {
    const chaves = await sw.evaluate(() => Promise.all([
      WhatsWorkStore.getApiKey('claude'),
      WhatsWorkStore.getApiKey('gemini')
    ]));
    assert.deepStrictEqual(chaves, ['sk-ant-chave-de-teste', 'AIzaChaveDeTeste']);

    // Volta ao Claude para não afetar os passos seguintes.
    await sw.evaluate(() => WhatsWorkStore.saveSettings({ aiProvider: 'claude' }));
  });

  await step('a extensão não faz nenhuma requisição externa', async () => {
    assert.deepStrictEqual(externalRequests, []);
  });

  await step('nenhum erro de JavaScript na página', async () => {
    assert.deepStrictEqual(pageErrors, []);
  });

  await context.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });

  const failed = results.filter((r) => r[0] !== 'ok');
  console.log(`\n${results.length - failed.length}/${results.length} passaram\n`);
  if (failed.length) {
    failed.forEach((f) => console.error(f[2]));
    process.exit(1);
  }
})();
