# Mini-VSL — Caixa Rápido 7 Dias

Vídeo de vendas do desafio **Caixa Rápido — 7 Dias**, montado como página web: o roteiro roda
sozinho no navegador, com cena animada, legenda queimada e botão de compra visível desde o
segundo zero. Duração 6:11, 836 palavras.

Abra `index.html` no navegador para assistir.

```
vsl/
├── index.html          página pronta (gerada — não edite à mão)
├── index.src.html      fonte da página: estilo, cenas e player
├── roteiro.cues.js     fonte do roteiro: cada fala, cena e pausa
├── build.js            gera index.html + legendas + narração
├── legendas.srt/.vtt   legendas cronometradas
├── narracao.txt        texto limpo para gravar a locução (ou TTS)
├── MIDIA.md            imagem e vídeo de bancos gratuitos, cena a cena
├── baixar-midia.py     baixa a mídia do Pexels e preenche o manifest
├── gravar-video.js     grava a página como arquivo de vídeo
├── video/              o vídeo renderizado (6:12, 720p, sem áudio)
└── assets/manifest.json  mapa cena → arquivo de mídia
```

## Editar o roteiro

Mexa só em `roteiro.cues.js` — cada item é uma fala:

```js
{ s: 'cadeira', t: 'Você viu o fio quebrado.', p: 0.8 }
//  ^cena        ^legenda/narração             ^pausa depois, em segundos
```

Depois:

```bash
node vsl/build.js
```

Isso regenera `index.html`, `legendas.srt`, `legendas.vtt` e `narracao.txt` já com os tempos
recalculados. O ritmo assumido é de locução calma em português (~2,85 palavras por segundo);
as constantes ficam no topo do `<script>` em `index.src.html`.

## Imagem e vídeo reais

O player roda 100% com visual próprio — nenhum arquivo externo é necessário. Para trocar as cenas
por vídeo e foto de bancos gratuitos (Pexels, Pixabay, Mixkit, Coverr, Unsplash), veja
[MIDIA.md](MIDIA.md): tem o termo de busca de cada cena, o que a licença permite e como plugar o
arquivo pelo `manifest.json`.

Ao usar mídia local, sirva a pasta por HTTP — o navegador bloqueia a leitura do manifest via `file://`:

```bash
cd vsl && python3 -m http.server 8000
```

## Vídeo pronto

`video/vsl-caixa-rapido-7dias.mp4` — 6:12, 1280×720, sem áudio. É a página gravada quadro a
quadro, pronta para levar para o editor e receber a locução por cima (a legenda já está
sincronizada em `legendas.srt`).

Esse arquivo foi gerado sem acesso à internet, então saiu com as fontes substitutas. Para gravar
de novo com a tipografia certa (Fraunces / Karla / IBM Plex Mono, que vêm do Google Fonts):

```bash
npm install playwright && npx playwright install chromium
node vsl/gravar-video.js
ffmpeg -i vsl/video/*.webm -c:v libx264 -crf 24 -pix_fmt yuv420p vsl/video/vsl.mp4
```

## Gravar como MP4 (na mão)

A página é o storyboard rodando. Para virar arquivo de vídeo:

- **Tela cheia:** aperte `F11`, deixe rodar do início e capture com OBS ou com a gravação de tela
  do sistema, em 1920×1080.
- **Sem interface:** esconda tudo menos o quadro com

  ```js
  document.querySelectorAll('.masthead,.headline,.sub,.controls,.offer,.panel,footer')
    .forEach(el => el.style.display = 'none');
  document.querySelector('.stage').style.height = '100vh';
  ```

  no console do navegador, e grave só a tela.

Depois monte a locução por cima (a legenda já está sincronizada em `legendas.srt`) no CapCut,
Premiere ou similar.

## Controles do player

| Ação | Como |
|---|---|
| Play / pause | clique no quadro, botão, ou barra de espaço |
| Avançar / voltar 5s | setas ← → |
| Pular para uma fala | clique na linha do roteiro cronometrado, abaixo do vídeo |
| Ligar/desligar legenda | botão **Legenda** |

A barra de progresso fica escondida nos primeiros 60 segundos, de propósito: em VSL de preço baixo,
mostrar a duração logo no começo derruba retenção.

## Antes de subir

- Troque o `href` do botão (`#configurar-checkout`, em `index.src.html`) pelo seu link da Hotmart e
  rode `node vsl/build.js`.
- Nenhuma linha do roteiro promete valor de faturamento — isso é proposital. Promessa de número
  garantido derruba anúncio no Meta e gera reembolso em massa. Mantenha a promessa em método e rotina.
- Depoimento tem que ser real. Pessoa de banco de imagem nunca pode aparecer como aluna ou cliente sua.
