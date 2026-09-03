#!/usr/bin/env node
/* Gera vsl/index.html, legendas.srt, legendas.vtt e narracao.txt
   a partir de vsl/roteiro.cues.js.  Uso:  node vsl/build.js          */

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const CUES = require(path.join(dir, 'roteiro.cues.js'));
const src = fs.readFileSync(path.join(dir, 'index.src.html'), 'utf8');

/* o modelo de tempo vive no player; aqui é lido de lá para não divergir */
const grab = name => {
  const m = src.match(new RegExp(name + '\\s*=\\s*([0-9.]+)'));
  if (!m) throw new Error(`constante ${name} não encontrada em index.src.html`);
  return parseFloat(m[1]);
};
const RATE = grab('RATE'), FLOOR = grab('FLOOR'), OVERHEAD = grab('OVERHEAD');

let t = 0;
const timed = CUES.map(c => {
  const words = c.t.trim().split(/\s+/).length;
  const start = t;
  const dur = Math.max(FLOOR, words / RATE + OVERHEAD);
  t += dur + (c.p || 0);
  return { ...c, start, end: start + dur };
});
const TOTAL = t;

/* ---------- index.html ---------- */
/* as ilustrações vivem em arte.js e entram inline na página */
const arte = fs.readFileSync(path.join(dir, 'arte.js'), 'utf8')
  .replace(/if \(typeof module[\s\S]*$/, '')
  .trim();

const json = JSON.stringify(CUES.map(c => ({ t: c.t, s: c.s, ...(c.p ? { p: c.p } : {}), ...(c.b ? { b: c.b } : {}) })), null, 0);
/* na versão publicada a trilha viaja embutida; no repositório fica em audio/ */
const mp3 = path.join(dir, 'audio', 'trilha.mp3');
const temTrilha = fs.existsSync(mp3);

const out = src
  .replace(/\/\*__CUES__\*\/[\s\S]*?\/\*__END_CUES__\*\//, `/*__CUES__*/${json}/*__END_CUES__*/`)
  .replace(/\/\*__ART__\*\/[\s\S]*?\/\*__END_ART__\*\//, `/*__ART__*/\n${arte}\n/*__END_ART__*/`);
fs.writeFileSync(path.join(dir, 'index.html'), out);

if (temTrilha) {
  const dataUri = 'data:audio/mpeg;base64,' + fs.readFileSync(mp3).toString('base64');
  fs.writeFileSync(path.join(dir, 'index.artifact.html'), out.replace(
    /\/\*__TRILHA__\*\/[\s\S]*?\/\*__END_TRILHA__\*\//,
    `/*__TRILHA__*/'${dataUri}'/*__END_TRILHA__*/`));
}

/* ---------- legendas ---------- */
const pad = (n, w = 2) => String(n).padStart(w, '0');
const stamp = (s, sep) => {
  const ms = Math.round((s % 1) * 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}${sep}${pad(ms, 3)}`;
};
const srt = timed.map((c, i) =>
  `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.t}\n`).join('\n');
fs.writeFileSync(path.join(dir, 'legendas.srt'), srt);

const vtt = 'WEBVTT\n\n' + timed.map((c, i) =>
  `${i + 1}\n${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.t}\n`).join('\n');
fs.writeFileSync(path.join(dir, 'legendas.vtt'), vtt);

/* ---------- texto de narração (locução / TTS) ---------- */
let narr = 'MINI-VSL — CAIXA RÁPIDO 7 DIAS\nTexto de locução. [pausa] = respiração marcada no roteiro.\n';
for (const c of timed) {
  if (c.b) narr += `\n\n== ${c.b} == (${Math.floor(c.start / 60)}:${pad(Math.floor(c.start) % 60)})\n`;
  narr += c.t + (c.p >= 0.8 ? ' [pausa]' : '') + '\n';
}
fs.writeFileSync(path.join(dir, 'narracao.txt'), narr.trim() + '\n');

const words = CUES.reduce((a, c) => a + c.t.trim().split(/\s+/).length, 0);

/* ---------- producao.html: o material interno, fora da página de vendas ---------- */
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const mmss = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

let blocosHtml = '';
timed.forEach((c, i) => {
  if (c.b) {
    if (i) blocosHtml += '</div></section>';
    blocosHtml += `<section class="bloco"><h2>${esc(c.b)} <span>${mmss(c.start)}</span></h2><div class="falas">`;
  }
  blocosHtml += `<p><time>${mmss(c.start)}</time><span>${esc(c.t)}</span></p>`;
});
blocosHtml += '</div></section>';

const producao = `<title>Produção — Caixa Rápido 7 Dias</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Karla:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{--ink:#100C0B;--bone:#F2E9E0;--smoke:#9B8C82;--brass:#D39A3E;--clay:#A8503F;--line:rgba(242,233,224,.14);
 --display:"Fraunces",Georgia,serif;--body:"Karla",Arial,sans-serif;--mono:"IBM Plex Mono",monospace;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--ink);color:var(--bone);font-family:var(--body);line-height:1.6}
.wrap{max-width:900px;margin:0 auto;padding:40px 20px 90px}
h1{font-family:var(--display);font-size:34px;font-weight:600;margin:0 0 6px;letter-spacing:-.01em}
.ficha{color:var(--smoke);font-family:var(--mono);font-size:12px;letter-spacing:.08em;margin:0 0 8px}
.aviso{border-left:2px solid var(--clay);padding:10px 14px;color:var(--smoke);font-size:14px;margin:22px 0 34px;max-width:70ch}
h2{font-family:var(--display);font-size:19px;font-weight:600;margin:34px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline}
h2 span{font-family:var(--mono);font-size:12px;color:var(--brass);letter-spacing:.1em}
.falas p{display:grid;grid-template-columns:62px 1fr;gap:14px;margin:0;padding:3px 0;font-size:15px}
time{font-family:var(--mono);font-size:11px;color:var(--smoke);font-variant-numeric:tabular-nums}
h3{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--brass);margin:48px 0 14px;font-weight:500}
.notas{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}
.nota{border:1px solid var(--line);border-radius:4px;padding:18px;background:rgba(27,21,18,.5)}
.nota b{display:block;font-family:var(--display);font-size:17px;margin-bottom:6px}
.nota p,.nota li{color:var(--smoke);font-size:14px;margin:0}
.nota ul{margin:8px 0 0;padding-left:18px}
code{font-family:var(--mono);font-size:.88em;background:rgba(242,233,224,.07);padding:1px 5px;border-radius:3px}
a{color:var(--brass)}
@media (max-width:560px){.falas p{grid-template-columns:52px 1fr;gap:10px}}
</style>
<div class="wrap">
  <h1>Caixa Rápido 7 Dias — produção</h1>
  <p class="ficha">${CUES.length} FALAS · ${words} PALAVRAS · ${mmss(TOTAL)} · MÉTODO RMBC</p>
  <p class="aviso">Material interno. A página de vendas é a <a href="index.html">index.html</a> — esta aqui é o roteiro cronometrado e as decisões de produção, para gravar a locução e conferir a sincronia.</p>

  ${blocosHtml}

  <h3>Produção</h3>
  <div class="notas">
    <div class="nota"><b>Onde entra na página</b><p>O player fica logo abaixo da headline, com o botão de compra visível desde o segundo zero — VSL de preço baixo não esconde o botão. A barra de progresso só aparece depois de 60 segundos.</p></div>
    <div class="nota"><b>Link do checkout</b><p>Preencha a constante <code>CHECKOUT</code> no topo do script em <code>index.src.html</code> e rode <code>node vsl/build.js</code>: os quatro botões passam a apontar para o seu link da Hotmart.</p></div>
    <div class="nota"><b>Locução</b><p>Grave a partir de <code>narracao.txt</code> e salve como <code>assets/narracao.mp3</code>; o player sincroniza a legenda pelo áudio. As legendas prontas estão em <code>legendas.srt</code>.</p></div>
    <div class="nota"><b>Trilha</b><p>Vem sintetizada em <code>audio/trilha.mp3</code>. Para usar uma faixa licenciada sua mantendo os efeitos de cena: <code>python3 vsl/trilha.py --musica faixa.mp3</code>.</p></div>
    <div class="nota"><b>Imagem e vídeo reais</b><p>Cada cena aceita arquivo de banco livre por cima da ilustração. Termos de busca por cena e limites de licença em <a href="MIDIA.md">MIDIA.md</a>.</p></div>
    <div class="nota"><b>O que não prometer</b><p>Nenhuma linha promete valor de faturamento, e isso é proposital: número garantido derruba anúncio no Meta e gera reembolso em massa na Hotmart. Depoimento só real e autorizado.</p></div>
  </div>
</div>`;
fs.writeFileSync(path.join(dir, 'producao.html'), producao);

/* ---------- teleprompter: mesmo roteiro, mesmo relógio ---------- */
const prompter = fs.readFileSync(path.join(dir, 'teleprompter.src.html'), 'utf8')
  .replace(/\/\*__CUES__\*\/[\s\S]*?\/\*__END_CUES__\*\//, `/*__CUES__*/${json}/*__END_CUES__*/`);
fs.writeFileSync(path.join(dir, 'teleprompter.html'), prompter);

/* ---------- tempos (usado por trilha.py e por quem for editar) ---------- */
fs.writeFileSync(path.join(dir, 'tempos.json'), JSON.stringify({
  total: TOTAL,
  falas: timed.map(c => ({ inicio: +c.start.toFixed(3), fim: +c.end.toFixed(3), cena: c.s, bloco: c.b || undefined, texto: c.t })),
}, null, 1));

console.log('index.html (vendas) + producao.html + teleprompter.html' + (temTrilha ? ' + index.artifact.html' : '') +
  ' + legendas.srt + legendas.vtt + narracao.txt + tempos.json');
console.log(`${CUES.length} falas · ${words} palavras · ${Math.floor(TOTAL / 60)}:${pad(Math.round(TOTAL) % 60)} de duração`);
