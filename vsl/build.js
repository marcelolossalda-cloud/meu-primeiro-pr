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

/* ---------- tempos (usado por trilha.py e por quem for editar) ---------- */
fs.writeFileSync(path.join(dir, 'tempos.json'), JSON.stringify({
  total: TOTAL,
  falas: timed.map(c => ({ inicio: +c.start.toFixed(3), fim: +c.end.toFixed(3), cena: c.s, bloco: c.b || undefined, texto: c.t })),
}, null, 1));

const words = CUES.reduce((a, c) => a + c.t.trim().split(/\s+/).length, 0);
console.log('index.html' + (temTrilha ? ' + index.artifact.html (trilha embutida)' : '') +
  ' + legendas.srt + legendas.vtt + narracao.txt + tempos.json');
console.log(`${CUES.length} falas · ${words} palavras · ${Math.floor(TOTAL / 60)}:${pad(Math.round(TOTAL) % 60)} de duração`);
