/**
 * Grava a VSL como arquivo de vídeo, sem precisar de gravador de tela.
 *
 *   npm install playwright && npx playwright install chromium
 *   node vsl/gravar-video.js
 *
 * Sai um .webm em vsl/video/ (1280x720, sem áudio). Para virar MP4:
 *   ffmpeg -i vsl/video/*.webm -c:v libx264 -crf 24 -pix_fmt yuv420p vsl.mp4
 *
 * Rode com internet: as fontes (Fraunces, Karla, IBM Plex Mono) vêm do Google Fonts.
 * Sem internet o vídeo sai com as fontes substitutas.
 */

const path = require('path');
const { chromium } = require('playwright');

const PAGINA = 'file://' + path.join(__dirname, 'index.html');
const DESTINO = path.join(__dirname, 'video');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: DESTINO, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(PAGINA);

  // esconde tudo que não é o quadro do vídeo
  await page.addStyleTag({ content: `
    .masthead,.headline,.sub,.controls,.offer,.panel,footer{display:none!important}
    body{overflow:hidden}
    .wrap{max-width:none;padding:0;margin:0}
    .stage{border:0;border-radius:0;height:100vh;aspect-ratio:auto}
  `});

  await page.waitForTimeout(2000);            // fontes e primeira pintura
  await page.evaluate(() => { window.seek(0); window.play(); });
  const total = await page.evaluate(() => TOTAL);
  console.log(`gravando ${total.toFixed(0)}s — não mexa na janela`);

  await page.waitForTimeout((total + 2) * 1000);
  await context.close();
  await browser.close();
  console.log(`pronto: ${DESTINO}`);
})();
