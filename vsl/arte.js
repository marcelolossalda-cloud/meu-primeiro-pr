/* ------------------------------------------------------------------
   Ilustrações das cenas — SVG desenhado, sem depender de banco de imagem.

   Direção de arte: silhueta contra luz quente. É assim que a cena parece
   filmada de verdade sem cair no desenho infantil — o que se lê é a forma,
   a profundidade e a luz, não o traço do rosto.

   Cada função devolve um SVG 1600x900 que preenche o quadro (slice).
   Injetado em index.html por build.js.
   ------------------------------------------------------------------ */

const A = {
  // paleta em sincronia com os tokens do player
  wall1: '#2A211C', wall2: '#0B0807', dark: '#080605',
  brass: '#D39A3E', brassSoft: '#F0C87C', clay: '#A8503F', bone: '#F2E9E0',
};

/* defs reaproveitadas; o sufixo evita colisão de id entre cenas */
const defs = (k, quente = 1) => `
<defs>
  <linearGradient id="w${k}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${A.wall1}" stop-opacity="${.9 * quente}"/>
    <stop offset="1" stop-color="${A.wall2}"/>
  </linearGradient>
  <radialGradient id="g${k}" cx=".5" cy=".5">
    <stop offset="0" stop-color="${A.brass}" stop-opacity="${.78 * quente}"/>
    <stop offset="1" stop-color="${A.brass}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="s${k}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#150F0D"/><stop offset="1" stop-color="#050403"/>
  </linearGradient>
  <linearGradient id="r${k}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${A.brassSoft}" stop-opacity=".85"/>
    <stop offset=".35" stop-color="${A.brass}" stop-opacity="0"/>
  </linearGradient>
  <filter id="b${k}" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="9"/>
  </filter>
  <filter id="bb${k}" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="22"/>
  </filter>
</defs>`;

const quadro = (k, inner, quente) =>
  `<svg class="art-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
     ${defs(k, quente)}
     <rect width="1600" height="900" fill="url(#w${k})"/>
     ${inner}
     <rect width="1600" height="900" fill="url(#g${k})" opacity=".26"/>
   </svg>`;

/* lâmpadas de penteadeira em volta do espelho */
const lampadas = (k, x, y, w, n) => Array.from({ length: n }, (_, i) => {
  const cx = x + (w / (n - 1)) * i;
  return `<g class="lamp" style="--i:${i}">
    <circle cx="${cx}" cy="${y}" r="34" fill="url(#g${k})" opacity=".9"/>
    <circle cx="${cx}" cy="${y}" r="11" fill="${A.brassSoft}"/>
  </g>`;
}).join('');

/* frascos de home care na bancada */
const frascos = (x, y, alturas, destaque = -1) => alturas.map((h, i) => {
  const bx = x + i * 62, cor = i === destaque ? A.brass : '#2E241E';
  return `<g>
    <rect x="${bx}" y="${y - h}" width="40" height="${h}" rx="7" fill="${cor}" opacity="${i === destaque ? .95 : .9}"/>
    <rect x="${bx + 13}" y="${y - h - 16}" width="14" height="18" rx="3" fill="#151010"/>
    <rect x="${bx + 5}" y="${y - h + 12}" width="6" height="${h - 30}" rx="3" fill="#F2E9E0" opacity=".10"/>
  </g>`;
}).join('');


/* silhueta humana: cabeça, pescoço e ombros caídos — sem isso a forma vira borrão */
const silhueta = (cx, cy, r, { cor = '#050403', altura = 6.2, ombro = 2.15 } = {}) => `
  <g fill="${cor}">
    <circle cx="${cx}" cy="${cy}" r="${r}"/>
    <path d="M${cx - .3 * r} ${cy + .72 * r} h${.6 * r} v${.5 * r} h${-.6 * r} Z"/>
    <path d="M${cx - ombro * r} ${cy + altura * r}
             C${cx - ombro * r - .1 * r} ${cy + 2.9 * r} ${cx - 1.25 * r} ${cy + 1.5 * r} ${cx - .5 * r} ${cy + 1.18 * r}
             L${cx + .5 * r} ${cy + 1.18 * r}
             C${cx + 1.25 * r} ${cy + 1.5 * r} ${cx + ombro * r + .1 * r} ${cy + 2.9 * r} ${cx + ombro * r} ${cy + altura * r} Z"/>
  </g>`;

const ART = {

  /* salão vazio no fim do expediente: espelho, bancada, cadeira sozinha */
  estacao: () => quadro('es', `
    <ellipse cx="800" cy="300" rx="520" ry="300" fill="url(#ges)" opacity=".55"/>
    <rect x="520" y="120" width="560" height="470" rx="14" fill="url(#ses)" stroke="rgba(242,233,224,.16)" stroke-width="2"/>
    <rect x="556" y="156" width="488" height="398" rx="8" fill="#0E0A09" opacity=".8"/>
    ${lampadas('es', 540, 96, 520, 7)}
    <path d="M300 640 h1000 l70 46 H230 Z" fill="#1A1411"/>
    <rect x="230" y="686" width="1140" height="26" fill="#100C0A"/>
    ${frascos(600, 640, [86, 116, 70, 98])}
    <g opacity=".9">
      <rect x="1090" y="560" width="16" height="80" rx="8" fill="#191312"/>
      <path d="M1060 540 h76 a26 26 0 0 1 0 52 h-76 Z" fill="#191312"/>
    </g>
    <g filter="url(#bes)" opacity=".95">
      <path d="M700 900 v-150 a100 100 0 0 1 200 0 v150 Z" fill="${A.dark}"/>
      <rect x="770" y="820" width="60" height="80" fill="${A.dark}"/>
    </g>`),

  /* salão amplo: estações em fuga, luz quente ao fundo */
  salao: () => quadro('sl', `
    ${[0, 1, 2].map(i => {
      const x = 180 + i * 470, esc = 1 - i * .12;
      return `<g opacity="${.9 - i * .18}">
        <rect x="${x}" y="${220 + i * 20}" width="${300 * esc}" height="${250 * esc}" rx="10" fill="url(#ssl)" stroke="rgba(242,233,224,.12)"/>
        <ellipse cx="${x + 150 * esc}" cy="${340 + i * 20}" rx="${190 * esc}" ry="${150 * esc}" fill="url(#gsl)" opacity=".5"/>
      </g>`;
    }).join('')}
    <path d="M120 640 h1360 l60 40 H60 Z" fill="#1A1411"/>
    ${[0, 1, 2].map(i => `<g filter="url(#bsl)" opacity=".9">
      <path d="M${260 + i * 470} 900 v-130 a86 86 0 0 1 172 0 v130 Z" fill="${A.dark}"/>
    </g>`).join('')}`),

  /* mãos e tesoura em primeiro plano */
  tesoura: () => quadro('te', `
    <ellipse cx="1000" cy="400" rx="520" ry="330" fill="url(#gte)" opacity=".62"/>
    <g opacity=".95">
      ${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${840 + i * 84} 190 q ${46 - i * 14} 250 ${-40} 500" stroke="#150F0D" stroke-width="${20 - i * 1.6}" fill="none" stroke-linecap="round" opacity="${.9 - i * .07}"/>`).join('')}
    </g>
    <g class="snip" style="transform-origin:1180px 470px">
      <path d="M1040 520 l260 -70" stroke="#191311" stroke-width="16" stroke-linecap="round"/>
      <path d="M1040 420 l260 70" stroke="#191311" stroke-width="16" stroke-linecap="round"/>
      <circle cx="1320" cy="436" r="28" fill="none" stroke="#191311" stroke-width="14"/>
      <circle cx="1320" cy="504" r="28" fill="none" stroke="#191311" stroke-width="14"/>
      <circle cx="1150" cy="470" r="9" fill="${A.brass}"/>
      <path d="M1046 448 l250 -60" stroke="url(#rte)" stroke-width="4" fill="none" opacity=".7"/>
    </g>
    <path d="M1180 900 q60 -260 300 -320 l120 80 v240 Z" fill="${A.dark}"/>
    <path d="M980 900 q40 -200 220 -270 l60 40 q-180 70 -220 230 Z" fill="${A.dark}"/>`),

  /* cliente sentada na cadeira, fio em destaque */
  cadeira: () => quadro('cd', `
    <rect x="1040" y="140" width="430" height="560" rx="10" fill="#0E0A09" stroke="rgba(242,233,224,.16)" stroke-width="3"/>
    <rect x="1076" y="176" width="358" height="488" rx="6" fill="#140F0D"/>
    <ellipse cx="720" cy="400" rx="440" ry="320" fill="url(#gcd)" opacity=".85"/>
    <path d="M180 748 h1240 l40 30 H140 Z" fill="#150F0D"/>

    <!-- cadeira -->
    <g stroke="rgba(242,233,224,.13)" stroke-width="2" fill="#0E0A09">
      <rect x="596" y="360" width="286" height="320" rx="46"/>
      <rect x="566" y="648" width="346" height="60" rx="18"/>
      <rect x="712" y="700" width="52" height="120"/>
      <rect x="600" y="820" width="280" height="22" rx="11"/>
    </g>

    <!-- cliente: silhueta contra a luz -->
    ${silhueta(734, 560, 82, { altura: 4.4, ombro: 1.9 })}
    <g fill="#050403">
      <path d="M652 556 q6 -104 82 -104 q76 0 82 104 q10 130 -22 190 q-60 -120 -60 -190 q0 70 -60 190 q-32 -60 -22 -190 Z"/>
    </g>
    <path d="M660 540 a80 80 0 0 1 62 -84" stroke="url(#rcd)" stroke-width="9" fill="none" opacity=".9"/>
    <path d="M806 620 q46 96 26 190" stroke="${A.brass}" stroke-width="5" fill="none" opacity=".95"/>
    <circle class="ping" cx="820" cy="664" r="8" fill="none" stroke="${A.brass}" stroke-width="4"/>
    <circle cx="820" cy="664" r="7" fill="${A.brassSoft}"/>`),

  /* profissional em pé: cansada (ombros caídos) ou confiante (ereta) */
  profissional: (postura = 'cansada') => quadro('pf', `
    <ellipse cx="820" cy="330" rx="520" ry="330" fill="url(#gpf)" opacity="${postura === 'confiante' ? .85 : .45}"/>
    <path d="M120 800 h1360 l50 40 H60 Z" fill="#150F0D"/>
    ${postura === 'cansada'
      ? silhueta(800, 320, 88, { altura: 6.6, ombro: 2.4 })
      : silhueta(800, 286, 88, { altura: 7.0, ombro: 2.0 })}
    ${postura === 'cansada'
      ? `<path d="M624 470 q-30 150 -6 300" stroke="#050403" stroke-width="52" fill="none" stroke-linecap="round"/>`
      : `<path d="M640 600 q160 70 320 0 l0 46 q-160 66 -320 0 Z" fill="#0A0706"/>`}
    <path d="M716 ${postura === 'cansada' ? 300 : 266} a88 88 0 0 1 66 -86" stroke="url(#rpf)" stroke-width="10" fill="none" opacity=".85"/>
    <g filter="url(#bbpf)" opacity=".5"><rect x="40" y="500" width="300" height="400" rx="14" fill="#150F0D"/></g>`),

  /* duas silhuetas conversando; o brilho entre elas é a fala */
  conversa: (calada = false) => quadro('cv', `
    <ellipse cx="800" cy="420" rx="460" ry="300" fill="url(#gcv)" opacity=".7"/>
    <path d="M120 780 h1360 l50 40 H60 Z" fill="#150F0D"/>
    ${silhueta(470, 330, 84)}
    ${silhueta(1140, 356, 78, { cor: '#0A0706', altura: 5.6 })}
    <path d="M392 320 a84 84 0 0 1 62 -80" stroke="url(#rcv)" stroke-width="9" fill="none" opacity=".8"/>
    ${calada
      ? `<g opacity=".65"><path d="M660 400 h280" stroke="${A.clay}" stroke-width="7" stroke-linecap="round" stroke-dasharray="26 26"/></g>`
      : `<g class="fala"><path d="M660 300 h250 a26 26 0 0 1 26 26 v104 a26 26 0 0 1 -26 26 h-160 l-62 50 v-50 h-28 a26 26 0 0 1 -26 -26 v-104 a26 26 0 0 1 26 -26 Z" fill="#0E0A09" stroke="${A.brass}" stroke-width="4" opacity=".95"/>
         <path d="M700 348 h170 M700 384 h130" stroke="${A.brassSoft}" stroke-width="7" stroke-linecap="round" opacity=".85"/></g>`}`),

  /* celular na mão, tela acesa com o feed */
  celular: (conteudo = 'feed') => quadro('ce', `
    <ellipse cx="800" cy="430" rx="420" ry="300" fill="url(#gce)" opacity=".35"/>
    <g>
      <rect x="640" y="150" width="330" height="640" rx="42" fill="#171110" stroke="rgba(242,233,224,.16)" stroke-width="2"/>
      <rect x="664" y="186" width="282" height="568" rx="26" fill="#0C0908"/>
      ${conteudo === 'feed'
        ? [0, 1, 2].map(i => `<g opacity="${.9 - i * .2}">
             <rect x="690" y="${214 + i * 176}" width="230" height="120" rx="8" fill="#1E1714"/>
             <rect x="690" y="${344 + i * 176}" width="150" height="12" rx="6" fill="#2A211C"/>
           </g>`).join('')
        : `<rect x="690" y="230" width="230" height="150" rx="10" fill="${A.brass}" opacity=".85"/>
           <rect x="690" y="400" width="230" height="14" rx="7" fill="#2A211C"/>
           <rect x="690" y="430" width="180" height="14" rx="7" fill="#241C18"/>
           ${[0, 1, 2, 3].map(i => `<rect x="690" y="${480 + i * 44}" width="${210 - i * 20}" height="12" rx="6" fill="#1E1714"/>`).join('')}`}
      <rect x="664" y="186" width="282" height="568" rx="26" fill="url(#gce)" opacity=".35"/>
    </g>
    <path d="M560 900 q60 -230 300 -280 l40 70 q-200 70 -240 210 Z" fill="${A.dark}"/>`),

  /* porta do salão: cliente entra, luz escapa */
  porta: () => quadro('po', `
    <rect x="560" y="90" width="480" height="700" rx="10" fill="#0E0A09" stroke="rgba(242,233,224,.18)" stroke-width="3"/>
    <path d="M600 130 h400 v620 h-400 Z" fill="url(#gpo)" opacity=".85"/>
    <path d="M1000 130 L1420 900 H1000 Z" fill="url(#gpo)" opacity=".25"/>
    ${silhueta(800, 330, 74, { altura: 6.4 })}
    ${[0, 1, 2, 3].map(i => `<circle class="moeda" style="--i:${i}" cx="${1120 + i * 90}" cy="${430 + (i % 2) * 90}" r="16" fill="${A.brass}" opacity=".75"/>`).join('')}`),

  /* prateleira de home care contra a luz */
  prateleira: (destaque = 1) => quadro('pr', `
    <ellipse cx="800" cy="360" rx="560" ry="300" fill="url(#gpr)" opacity=".5"/>
    <rect x="180" y="600" width="1240" height="18" rx="4" fill="#1A1411"/>
    <rect x="180" y="618" width="1240" height="10" fill="#0D0A09"/>
    ${frascos(420, 600, [150, 200, 120, 180, 140, 190], destaque)}
    <g filter="url(#bbpr)" opacity=".6"><rect x="0" y="700" width="1600" height="200" fill="#0A0706"/></g>`),

  /* maquininha de cartão na mão */
  maquininha: () => quadro('mq', `
    <ellipse cx="800" cy="420" rx="420" ry="280" fill="url(#gmq)" opacity=".38"/>
    <g>
      <rect x="660" y="280" width="290" height="420" rx="26" fill="#171110" stroke="rgba(242,233,224,.14)" stroke-width="2"/>
      <rect x="690" y="320" width="230" height="150" rx="8" fill="#0C0908"/>
      <rect x="712" y="352" width="120" height="14" rx="7" fill="${A.brass}" opacity=".8"/>
      <rect x="712" y="386" width="80" height="12" rx="6" fill="#2A211C"/>
      ${[0, 1, 2, 3].map(l => [0, 1, 2].map(c =>
        `<rect x="${706 + c * 74}" y="${500 + l * 46}" width="56" height="32" rx="6" fill="#221A16"/>`).join('')).join('')}
      <path d="M700 250 h210 v-70 h-210 Z" fill="#1E1714"/>
    </g>
    <path d="M540 900 q80 -240 300 -300 l50 66 q-190 70 -240 234 Z" fill="${A.dark}"/>`),

  /* agenda aberta na bancada */
  agenda: () => quadro('ag', `
    <ellipse cx="800" cy="420" rx="500" ry="280" fill="url(#gag)" opacity=".35"/>
    <path d="M420 640 l360 -160 400 130 -380 200 Z" fill="#1C1512" stroke="rgba(242,233,224,.14)" stroke-width="2"/>
    <path d="M800 480 l-8 322" stroke="rgba(242,233,224,.18)" stroke-width="3"/>
    ${[0, 1, 2, 3, 4].map(i => `<path d="M${520 + i * 6} ${610 + i * 26} l190 -80" stroke="#3A2E27" stroke-width="6" stroke-linecap="round"/>`).join('')}
    ${[0, 1, 2, 3, 4].map(i => `<path d="M${880 + i * 6} ${580 + i * 26} l190 60" stroke="#3A2E27" stroke-width="6" stroke-linecap="round"/>`).join('')}
    <path d="M1120 430 l70 130 -30 20 -70 -130 Z" fill="#241C18"/>
    <circle cx="1150" cy="576" r="10" fill="${A.brass}"/>`),

  /* notebook aberto, tela acesa */
  notebook: () => quadro('nb', `
    <ellipse cx="800" cy="380" rx="460" ry="260" fill="url(#gnb)" opacity=".4"/>
    <path d="M560 300 h480 v300 h-480 Z" fill="#0C0908" stroke="rgba(242,233,224,.16)" stroke-width="2"/>
    ${[0, 1, 2, 3].map(i => `<rect x="600" y="${344 + i * 52}" width="${400 - i * 60}" height="16" rx="8" fill="${i === 0 ? A.brass : '#241C18'}" opacity="${i === 0 ? .85 : 1}"/>`).join('')}
    <path d="M520 600 h560 l70 60 H450 Z" fill="#1A1411"/>
    <path d="M560 300 h480 v300 h-480 Z" fill="url(#gnb)" opacity=".25"/>`),

  /* parede com a folhinha do mês */
  calendario: () => quadro('ca', `
    <ellipse cx="800" cy="400" rx="480" ry="300" fill="url(#gca)" opacity=".3"/>
    <rect x="520" y="150" width="560" height="620" rx="10" fill="#150F0D" stroke="rgba(242,233,224,.14)" stroke-width="2"/>
    <rect x="520" y="150" width="560" height="90" fill="${A.clay}" opacity=".45"/>
    ${Array.from({ length: 30 }, (_, i) =>
      `<rect x="${556 + (i % 6) * 82}" y="${290 + Math.floor(i / 6) * 86}" width="60" height="60" rx="5"
             fill="${i === 29 ? A.clay : '#231B17'}" opacity="${i === 29 ? .95 : .8}"/>`).join('')}`),

  /* cliente saindo satisfeita, porta ao fundo */
  saida: () => quadro('sa', `
    <ellipse cx="1120" cy="330" rx="520" ry="320" fill="url(#gsa)" opacity=".6"/>
    <rect x="980" y="120" width="420" height="660" rx="10" fill="url(#gsa)" opacity=".5"/>
    ${silhueta(640, 300, 84, { altura: 6.8 })}
    <g fill="#050403">
      <path d="M800 470 q70 50 52 170 l-56 8 q14 -104 -34 -142 Z"/>
      <rect x="800" y="640" width="90" height="110" rx="8" fill="#1A1411"/>
      <path d="M812 640 q33 -40 66 0" stroke="#2A211C" stroke-width="6" fill="none"/>
    </g>
    <path d="M558 300 a82 82 0 0 1 58 -80" stroke="url(#rsa)" stroke-width="8" fill="none"/>`),
};

if (typeof module !== 'undefined' && module.exports) module.exports = ART;
