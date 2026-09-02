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

async function openWhatsApp(context) {
  const page = await context.newPage();
  await page.route('https://web.whatsapp.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: MOCK })
  );
  await page.goto('https://web.whatsapp.com/');
  await page.waitForSelector('#whatswork-host', { state: 'attached', timeout: 15000 });
  return page;
}

/** Abre o painel e vai para a aba pedida. */
async function openPanel(page, tab) {
  const toggle = page.locator('.ww-toggle');
  if (!(await page.locator('.ww-panel.is-open').count())) await toggle.click();
  await page.locator('.ww-panel.is-open').waitFor({ timeout: 5000 });
  if (tab) {
    await page.locator(`.ww-tab[data-tab="${tab}"]`).click();
    await page.locator(`.ww-tab[data-tab="${tab}"].is-active`).waitFor({ timeout: 5000 });
  }
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

  let page;

  await step('a extensão carrega e registra o service worker', async () => {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 15000 });
    assert.ok(sw.url().includes('service-worker.js'), 'service worker não subiu');
  });

  await step('o painel é injetado no WhatsApp Web', async () => {
    page = await openWhatsApp(context);
    assert.strictEqual(await page.locator('.ww-toggle').count(), 1);
  });

  await step('o painel identifica a conversa aberta', async () => {
    await openPanel(page, 'contato');
    await assertText(page, '.ww-subtitle', 'Contato Teste');
  });

  await step('uma anotação é salva e sobrevive ao reload', async () => {
    await page.locator('.ww-textarea').first().fill('Pediu orçamento de 3 unidades');
    await page.getByText('Salvar anotação').click();
    await page.locator('.ww-note-text').waitFor({ timeout: 5000 });

    await page.reload();
    await page.waitForSelector('#whatswork-host', { state: 'attached' });
    await openPanel(page, 'contato');
    await assertText(page, '.ww-note-text', 'Pediu orçamento de 3 unidades');
  });

  await step('uma etiqueta é aplicada e sobrevive ao reload', async () => {
    await page.locator('.ww-chip', { hasText: 'Cliente' }).click();
    await page.locator('.ww-chip.is-active', { hasText: 'Cliente' }).waitFor({ timeout: 5000 });

    await page.reload();
    await page.waitForSelector('#whatswork-host', { state: 'attached' });
    await openPanel(page, 'contato');
    await page.locator('.ww-chip.is-active', { hasText: 'Cliente' }).waitFor({ timeout: 5000 });
  });

  await step('um modelo com {{primeiro_nome}} é inserido já preenchido', async () => {
    await openPanel(page, 'modelos');
    await page.locator('.ww-input').first().fill('Boas-vindas');
    await page.locator('.ww-textarea').first().fill('Olá {{primeiro_nome}}, tudo bem?');
    await page.getByText('Adicionar modelo').click();
    await page.locator('.ww-card-title').waitFor({ timeout: 5000 });

    await page.getByText('Inserir', { exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector('#main [contenteditable]').innerText.length > 0,
      null,
      { timeout: 5000 }
    );
    const text = await page.locator('#main [contenteditable]').innerText();
    assert.strictEqual(text.trim(), 'Olá Contato, tudo bem?');
  });

  await step('o botão Enviar do modelo dispara o envio', async () => {
    await page.evaluate(() => { window.__sent = []; });
    await page.getByText('Enviar', { exact: true }).click();
    await page.waitForFunction(() => window.__sent.length > 0, null, { timeout: 5000 });
    const sent = await page.evaluate(() => window.__sent);
    assert.strictEqual(sent[0].trim(), 'Olá Contato, tudo bem?');
  });

  await step('uma mensagem agendada vencida é enviada sozinha', async () => {
    await page.evaluate(() => { window.__sent = []; });

    // O agendamento é criado dentro do service worker, não pela página: o
    // content script roda em mundo isolado, então WhatsWorkStore não existe no
    // contexto do page.evaluate. Chamar tick() ali é também o caminho real —
    // é o que o chrome.alarms faz a cada minuto.
    const [sw] = context.serviceWorkers();
    await sw.evaluate((phone) =>
      WhatsWorkStore.addScheduled({
        jid: phone + '@c.us',
        phone: phone,
        name: 'Contato Teste',
        body: 'Follow-up automático',
        sendAt: Date.now() - 60000
      }).then(() => tick()),
    CHAT_PHONE);

    await page.waitForFunction(() => window.__sent.length > 0, null, { timeout: 20000 });
    const sent = await page.evaluate(() => window.__sent);
    assert.strictEqual(sent[0].trim(), 'Follow-up automático');

    const status = await sw.evaluate(() =>
      WhatsWorkStore.listScheduled().then((l) => l[l.length - 1].status));
    assert.strictEqual(status, 'sent', 'o agendamento devia ficar como "sent"');
  });

  await step('o popup abre e conta os dados salvos', async () => {
    const [sw] = context.serviceWorkers();
    const extId = new URL(sw.url()).host;
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
    await popup.waitForFunction(
      () => document.getElementById('stat-contacts').textContent !== '0',
      null,
      { timeout: 5000 }
    );
    assert.strictEqual(await popup.locator('#stat-notes').textContent(), '1');
    assert.ok((await popup.locator('.tags li').count()) >= 4, 'etiquetas padrão não apareceram');
    await popup.close();
  });

  await step('envio agendado não sobrescreve um rascunho em digitação', async () => {
    await page.evaluate(() => {
      window.__sent = [];
      document.querySelector('#main [contenteditable]').textContent = 'rascunho que eu estava escrevendo';
    });

    const [sw2] = context.serviceWorkers();
    await sw2.evaluate((phone) =>
      WhatsWorkStore.addScheduled({
        jid: phone + '@c.us',
        phone: phone,
        name: 'Contato Teste',
        body: 'NÃO DEVE SER ENVIADA AGORA',
        sendAt: Date.now() - 60000
      }).then(() => tick()),
    CHAT_PHONE);

    // Espera o content script realmente ter decidido adiar, em vez de checar
    // logo em seguida: sem isso o teste passaria só por chegar antes dele.
    const item = await waitFor(
      () => sw2.evaluate(() => WhatsWorkStore.listScheduled().then((l) => l[l.length - 1])),
      (rec) => !!rec && !!rec.waitingReason,
      10000,
      'a extensão não registrou o adiamento'
    );

    assert.strictEqual(item.status, 'due');
    assert.strictEqual(item.waitingReason, 'há um rascunho no campo de mensagem');

    const draft = await page.locator('#main [contenteditable]').innerText();
    assert.ok(draft.includes('rascunho'), 'o rascunho foi sobrescrito');
    assert.deepStrictEqual(await page.evaluate(() => window.__sent), [], 'enviou por cima do rascunho');

    // limpa o rascunho para não afetar os passos seguintes
    await page.evaluate(() => { document.querySelector('#main [contenteditable]').textContent = ''; });
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

async function assertText(page, selector, expected) {
  const actual = (await page.locator(selector).first().textContent()).trim();
  assert.strictEqual(actual, expected);
}
