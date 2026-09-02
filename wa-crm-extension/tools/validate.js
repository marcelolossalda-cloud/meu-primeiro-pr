#!/usr/bin/env node
/*
 * Verificação de sanidade antes de carregar a extensão no Chrome.
 *
 * Confere que o manifest é JSON válido, que todo arquivo citado nele existe
 * de fato e que todo .js do pacote é sintaticamente válido — os três erros
 * que fazem o chrome://extensions recusar o carregamento sem dizer onde.
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

function ref(file) {
  if (file) referenced.add(file.replace(/^\//, ''));
}

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

/* --------------------------------- todo JS do pacote precisa compilar */

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return [full];
  });
}

const jsFiles = walk(ROOT).filter((f) => f.endsWith('.js') && !f.includes(`${path.sep}tools${path.sep}`));
for (const file of jsFiles) {
  try {
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
  } catch (err) {
    errors.push(`erro de sintaxe em ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

/* --------------- content scripts carregam store.js antes de quem o usa */

(manifest.content_scripts || []).forEach((cs, i) => {
  const js = cs.js || [];
  const storeAt = js.indexOf('src/lib/store.js');
  check(storeAt === 0, `content_scripts[${i}]: src/lib/store.js deve ser o primeiro script`);
});

/* ------------------------------------------------------------ resultado */

if (errors.length) {
  console.error(`\n${errors.length} problema(s):`);
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log(`OK — manifest v${manifest.manifest_version}, ${referenced.size} arquivos referenciados, ${jsFiles.length} scripts validados.`);
