#!/usr/bin/env node
/*
 * Verificação de sanidade antes de carregar a extensão no Chrome.
 *
 * Faz duas coisas. A primeira é evitar frustração: manifest válido, arquivos
 * citados existentes, scripts que compilam — os três erros que fazem o
 * chrome://extensions recusar o pacote sem dizer onde.
 *
 * A segunda é manter honestas as promessas de segurança do README. Cada trava
 * abaixo corresponde a uma frase que o usuário leu e acreditou. Elas devem
 * falhar a build quando alguém (inclusive o autor, meses depois) mexer em algo
 * que quebre a promessa sem perceber.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

/* ------------------------------------------------------------- manifest */

const manifestPath = path.join(ROOT, 'manifest.json');
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (err) {
  console.error('manifest.json inválido:', err.message);
  process.exit(1);
}

check(manifest.manifest_version === 3, 'manifest_version precisa ser 3');
check(!!manifest.name, 'manifest sem "name"');
check(/^\d+\.\d+\.\d+$/.test(manifest.version || ''), 'version deve ser x.y.z');

/* ------------------------- arquivos referenciados pelo manifest existem */

const referenced = new Set();
const ref = (file) => { if (file) referenced.add(file.replace(/^\//, '')); };

ref(manifest.background && manifest.background.service_worker);
ref(manifest.action && manifest.action.default_popup);
(manifest.content_scripts || []).forEach((cs) => {
  (cs.js || []).forEach(ref);
  (cs.css || []).forEach(ref);
});
(manifest.web_accessible_resources || []).forEach((war) => (war.resources || []).forEach(ref));
Object.values(manifest.icons || {}).forEach(ref);

for (const file of referenced) {
  check(fs.existsSync(path.join(ROOT, file)), `arquivo citado no manifest não existe: ${file}`);
}

/* ------------------------------------ inventário de scripts do pacote */

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return [full];
  });
}

const allJs = walk(ROOT).filter((f) => f.endsWith('.js'));
const isSupport = (f) => f.includes(`${path.sep}tools${path.sep}`) || f.includes(`${path.sep}tests${path.sep}`);
// Só os scripts que o Chrome carrega passam pelas travas de segurança;
// tools/ e tests/ não são empacotados no comportamento da extensão.
const runtimeJs = allJs.filter((f) => !isSupport(f));

for (const file of allJs) {
  try {
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
  } catch (err) {
    errors.push(`erro de sintaxe em ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

const read = (f) => fs.readFileSync(f, 'utf8');
const rel = (f) => path.relative(ROOT, f);
const contentScripts = runtimeJs.filter((f) => f.includes(`${path.sep}content${path.sep}`));

/* ==================================================================
   TRAVAS DE SEGURANÇA
   ================================================================== */

/* 1. Superfície de permissões ------------------------------------------ */

const ALLOWED_PERMISSIONS = ['storage', 'alarms', 'notifications'];
const ALLOWED_HOSTS = [
  'https://web.whatsapp.com/*',
  'https://api.anthropic.com/*',
  'https://generativelanguage.googleapis.com/*'
];

(manifest.permissions || []).forEach((perm) => {
  check(ALLOWED_PERMISSIONS.includes(perm),
    `permissão não prevista: "${perm}" — amplia o acesso da extensão, revise antes de liberar`);
});
(manifest.host_permissions || []).forEach((host) => {
  check(ALLOWED_HOSTS.includes(host),
    `host_permission não prevista: "${host}" — a extensão só deveria alcançar o WhatsApp Web e as APIs de IA previstas`);
});

/* 2. Nenhuma página web pode conversar com a extensão ------------------- */

check(!manifest.externally_connectable,
  'manifest declara externally_connectable: isso deixaria páginas web mandarem mensagens para a extensão');

/* 3. CSP: sem código remoto, sem destino de rede além da API ------------ */

const csp = (manifest.content_security_policy || {}).extension_pages || '';
check(!!csp, 'manifest sem content_security_policy.extension_pages');
check(/script-src\s+'self'/.test(csp), "CSP deve fixar script-src 'self'");
check(!/unsafe-eval|unsafe-inline/.test(csp), 'CSP não pode liberar unsafe-eval nem unsafe-inline');

const connectSrc = (csp.match(/connect-src([^;]*)/) || [])[1] || '';
const connectAllowed = new Set([
  "'self'", "'none'", 'https://api.anthropic.com', 'https://generativelanguage.googleapis.com'
]);
connectSrc.trim().split(/\s+/).filter(Boolean).forEach((token) => {
  check(connectAllowed.has(token), `CSP connect-src permite destino inesperado: "${token}"`);
});

/* 4. Recurso exposto à página usa URL rotativa -------------------------- */

(manifest.web_accessible_resources || []).forEach((war, i) => {
  check(war.use_dynamic_url === true,
    `web_accessible_resources[${i}] sem use_dynamic_url — a página conseguiria detectar a extensão por URL fixa`);
  check(!(war.matches || []).includes('<all_urls>'),
    `web_accessible_resources[${i}] exposto a <all_urls>`);
});

/* 5. Padrões proibidos no código ---------------------------------------- */

const BANNED = [
  [/\.innerHTML\s*=/, 'atribuição a innerHTML (use textContent / createElement)'],
  [/\bdocument\.write\b/, 'document.write'],
  [/\beval\s*\(/, 'eval()'],
  [/\bnew\s+Function\s*\(/, 'new Function()'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
  [/\bnew\s+WebSocket\b/, 'WebSocket'],
  [/chrome\.storage\.sync\b/, 'chrome.storage.sync (sobe os dados para a conta Google; use .local)']
];

for (const file of runtimeJs) {
  const src = read(file);
  for (const [re, label] of BANNED) {
    if (re.test(src)) errors.push(`${rel(file)}: ${label}`);
  }
}

/* 6. Nenhum destino de rede fora do previsto ---------------------------- */

const NETWORK_ALLOWLIST = new Set([
  'api.anthropic.com', 'generativelanguage.googleapis.com', 'web.whatsapp.com',
  'platform.claude.com'   // só citado em texto de ajuda
]);
for (const file of runtimeJs) {
  const hosts = read(file).match(/https?:\/\/[a-z0-9.-]+/gi) || [];
  hosts.forEach((url) => {
    const host = url.replace(/^https?:\/\//i, '');
    check(NETWORK_ALLOWLIST.has(host), `${rel(file)}: URL para host não previsto: ${host}`);
  });
}

/* 7. A chave da API não pode ser lida pelo content script --------------- */

for (const file of contentScripts) {
  check(!/getApiKey|KEYS\.APIKEY|whatswork:apikey/.test(read(file)),
    `${rel(file)}: content script tocando na chave da API — ela deve ficar restrita ao service worker`);
}

/* 8. O painel não pode ficar alcançável pela página --------------------- */

for (const file of contentScripts) {
  const src = read(file);
  const shadow = src.match(/attachShadow\(\{[^}]*\}\)/);
  if (shadow) {
    check(!/mode:\s*'open'/.test(shadow[0]) && !/mode:\s*"open"/.test(shadow[0]),
      `${rel(file)}: attachShadow fixo em 'open' — a página do WhatsApp conseguiria ler o painel`);
  }
}

/* 9. Mensagens que chegam ao service worker são verificadas ------------- */

const swPath = path.join(ROOT, manifest.background.service_worker);
if (fs.existsSync(swPath)) {
  const sw = read(swPath);
  check(/sender\.id\s*!==\s*chrome\.runtime\.id/.test(sw),
    'service worker aceita mensagem sem conferir sender.id');
  check(/web\.whatsapp\.com/.test(sw),
    'service worker aceita mensagem de content script sem conferir a origem');
}

/* 10. Todo elemento que o popup manipula precisa existir no HTML ---------
      Reescrever uma seção do popup e esquecer de recriar um campo quebra o
      script inteiro na primeira linha que faz addEventListener em null. */

const popupHtmlPath = manifest.action && manifest.action.default_popup
  ? path.join(ROOT, manifest.action.default_popup) : null;

if (popupHtmlPath && fs.existsSync(popupHtmlPath)) {
  const html = read(popupHtmlPath);
  const idsNoHtml = new Set((html.match(/\bid="([^"]+)"/g) || [])
    .map((m) => m.slice(4, -1)));

  const popupJs = path.join(path.dirname(popupHtmlPath), 'popup.js');
  if (fs.existsSync(popupJs)) {
    const usados = new Set((read(popupJs).match(/\$\('([^']+)'\)/g) || [])
      .map((m) => m.slice(3, -2)));
    for (const id of usados) {
      check(idsNoHtml.has(id), `popup.js usa #${id}, que não existe em ${path.basename(popupHtmlPath)}`);
    }
  }
}

/* 11. Ordem de carregamento dos content scripts ------------------------- */

(manifest.content_scripts || []).forEach((cs, i) => {
  check((cs.js || []).indexOf('src/lib/store.js') === 0,
    `content_scripts[${i}]: src/lib/store.js deve ser o primeiro script`);
});

/* ------------------------------------------------------------ resultado */

if (errors.length) {
  console.error(`\n${errors.length} problema(s):`);
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log(
  `OK — manifest v${manifest.manifest_version}, ${referenced.size} arquivos referenciados, ` +
  `${allJs.length} scripts validados, 11 travas aprovadas.`
);
