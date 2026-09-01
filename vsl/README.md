# Mini-VSL — Caixa Rápido 7 Dias

Vídeo de vendas do desafio **Caixa Rápido — 7 Dias**, montado como página web: o roteiro roda
sozinho no navegador, com cena animada, legenda queimada e botão de compra visível desde o
segundo zero. Duração 6:11, 836 palavras.

Abra `index.html` no navegador para assistir.

```
vsl/
├── index.html          página pronta (gerada — não edite à mão)
├── index.artifact.html mesma página com a trilha embutida, para publicar solta
├── index.src.html      fonte da página: estilo, cenas e player
├── roteiro.cues.js     fonte do roteiro: cada fala, cena e pausa
├── arte.js             as ilustrações das cenas, em SVG
├── trilha.py           gera a trilha sonora sintetizada
├── audio/trilha.mp3    trilha com os efeitos de cada cena
├── tempos.json         início e fim de cada fala (usado pela trilha)
├── build.js            gera index.html + legendas + narração + tempos
├── legendas.srt/.vtt   legendas cronometradas
├── narracao.txt        texto limpo para gravar a locução (ou TTS)
├── roteiro-vsl.md      a VSL escrita, em blocos — para ler, editar ou subir no NotebookLM
├── roteiro-vsl.pdf     a mesma coisa em PDF
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

## Som

`audio/trilha.mp3` é sintetizada por `trilha.py` — nenhum sample de terceiros, nenhuma licença
envolvida. A cama harmônica escurece nos blocos de dor e abre em maior a partir da solução, e os
efeitos entram na hora exata de cada cena: tesoura, secador, moeda no caixa, gota no vazamento
(que para de pingar no segundo em que o roteiro tampa os furos), tique-taque no calendário, chime
em cada pilar, batida grave no "todo dia 30".

Na página o som começa **desligado** — é assim que VSL tem que abrir, e o navegador bloqueia áudio
sem clique. O botão **Som** liga; a partir daí a trilha vira o relógio do player, então imagem e
áudio não têm como sair de sincronia.

Para mexer na trilha, edite `trilha.py` e rode:

```bash
node vsl/build.js && python3 vsl/trilha.py
```

Ela fica em -28 dB de média, de propósito: é cama para a locução entrar por cima. `GANHO_CAMA`,
`GANHO_PULSO` e `GANHO_EFEITO` no topo do arquivo controlam o equilíbrio.

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

`video/vsl-caixa-rapido-7dias.mp4` — 6:12, 1280×720, com a trilha e sem locução. É a página
gravada quadro a quadro, pronta para levar para o editor e receber a voz por cima (a legenda já
está sincronizada em `legendas.srt`).

Esse arquivo foi gerado sem acesso à internet, então saiu com as fontes substitutas. Para gravar
de novo com a tipografia certa (Fraunces / Karla / IBM Plex Mono, que vêm do Google Fonts):

```bash
npm install playwright && npx playwright install chromium
node vsl/gravar-video.js
```

O script pisca um quadro claro antes de começar, acha esse flash no vídeo bruto, corta o começo
e casa a trilha com a imagem sozinho.

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
| Ligar o som | botão **Som** (começa desligado) |

A barra de progresso fica escondida nos primeiros 60 segundos, de propósito: em VSL de preço baixo,
mostrar a duração logo no começo derruba retenção.

## Antes de subir

- Troque o `href` do botão (`#configurar-checkout`, em `index.src.html`) pelo seu link da Hotmart e
  rode `node vsl/build.js`.
- Nenhuma linha do roteiro promete valor de faturamento — isso é proposital. Promessa de número
  garantido derruba anúncio no Meta e gera reembolso em massa. Mantenha a promessa em método e rotina.
- Depoimento tem que ser real. Pessoa de banco de imagem nunca pode aparecer como aluna ou cliente sua.
