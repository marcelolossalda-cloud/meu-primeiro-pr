/**
 * Grava a VSL como arquivo de vídeo, com a trilha sonora já embutida.
 *
 *   npm install playwright && npx playwright install chromium
 *   node vsl/gravar-video.js
 *
 * Sai vsl/video/vsl-caixa-rapido-7dias.mp4 (1280x720, com trilha, sem locução).
 * Rode com internet: as fontes (Fraunces, Karla, IBM Plex Mono) vêm do Google Fonts;
 * sem internet o vídeo sai com as fontes substitutas.
 *
 * Sincronia: antes de começar, a página pisca um quadro claro. É esse flash que o
 * script procura no vídeo bruto para saber onde o tempo zero cai, cortar o começo e
 * casar a trilha com a imagem.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const AQUI = __dirname;
const PAGINA = 'file://' + path.join(AQUI, 'index.html');
const DESTINO = path.join(AQUI, 'video');
const TRILHA = path.join(AQUI, 'audio', 'trilha.mp3');
const SAIDA = path.join(DESTINO, 'vsl-caixa-rapido-7dias.mp4');
const FLASH = 0.2;   // duração do quadro de sincronia

function acharFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {
    try {
      return execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'])
        .toString().trim();
    } catch {
      return null;
    }
  }
}

/** procura o flash: branco do carregamento, depois a página escura, depois o pisca */
function inicioDoVideo(ff, arquivo) {
  const saida = execFileSync(ff, ['-v', 'quiet', '-i', arquivo, '-t', '60',
    '-vf', 'fps=10,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-',
    '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 24 });
  const luz = [...saida.matchAll(/YAVG=([\d.]+)/g)].map(m => parseFloat(m[1]));
  const escureceu = luz.findIndex(v => v < 60);
  if (escureceu < 0) return null;
  const flash = luz.findIndex((v, i) => i > escureceu && v > 80);
  return flash < 0 ? null : flash / 10 + FLASH;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: DESTINO, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(PAGINA);

  // sobra só o quadro do vídeo: esconde por exclusão, para não quebrar
  // quando a página de vendas ganhar seções novas
  await page.addStyleTag({ content: `
    body > *:not(.wrap){display:none!important}
    .wrap > *:not(.hero){display:none!important}
    .hero > *:not(.stage){display:none!important}
    body{overflow:hidden;background:#080605}
    .wrap{max-width:none;padding:0;margin:0}
    .hero{margin:0}
    .stage{border:0;border-radius:0;height:100vh;aspect-ratio:auto}
    #flash{position:fixed;inset:0;z-index:99;background:#C9A05A}
  `});
  await page.evaluate(() => { window.pause(); window.seek(0); });
  await page.waitForTimeout(2500);              // fontes, primeira pintura

  await page.evaluate(f => {                    // marcador de sincronia
    const el = document.createElement('div');
    el.id = 'flash';
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); window.play(); }, f * 1000);
  }, FLASH);

  const total = await page.evaluate(() => TOTAL);
  console.log(`gravando ${total.toFixed(0)}s — não mexa na janela`);
  await page.waitForTimeout((total + 2) * 1000);
  await context.close();
  await browser.close();

  const bruto = fs.readdirSync(DESTINO).filter(f => f.endsWith('.webm'))
    .map(f => path.join(DESTINO, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

  const ff = acharFfmpeg();
  if (!ff) {
    console.log(`vídeo bruto em ${bruto} (ffmpeg não encontrado; converta na mão)`);
    return;
  }

  const t0 = inicioDoVideo(ff, bruto);
  if (t0 == null) console.log('flash de sincronia não encontrado — convertendo sem cortar o começo');

  const args = ['-y'];
  if (t0 != null) args.push('-ss', String(t0));
  args.push('-i', bruto);
  if (fs.existsSync(TRILHA)) args.push('-i', TRILHA, '-c:a', 'aac', '-b:a', '128k', '-shortest');
  args.push('-t', String(total), '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', '30',
    '-vf', `fade=t=out:st=${(total - 1.5).toFixed(1)}:d=1.5`, SAIDA);
  execFileSync(ff, args, { stdio: 'ignore' });
  fs.unlinkSync(bruto);
  console.log(`pronto: ${SAIDA} (${(fs.statSync(SAIDA).size / 1e6).toFixed(1)} MB)`);
})();
