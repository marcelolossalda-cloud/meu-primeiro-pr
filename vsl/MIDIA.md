# Imagem e vídeo de bancos gratuitos

O player (`index.html`) já roda inteiro com visual próprio animado — não depende de nenhum
arquivo externo. Este documento é para quando você quiser **trocar (ou sobrepor) cada cena por
imagem e vídeo reais** de bancos gratuitos.

Cada cena tem um `id`. Você baixa o arquivo, joga em `vsl/assets/` e aponta o caminho em
`vsl/assets/manifest.json`. O player carrega sozinho: vídeo entra em loop mudo, imagem entra fixa,
sempre **atrás** do gráfico animado e da legenda.

---

## 1. Como plugar um arquivo

1. Baixe o vídeo/imagem no banco (links abaixo) e salve em `vsl/assets/`, por exemplo `salao-vazio.mp4`.
2. Abra `vsl/assets/manifest.json` e preencha a cena:

```json
"cenas": {
  "abertura": "assets/salao-vazio.mp4",
  "cadeira": "assets/cliente-na-cadeira.jpg"
}
```

3. Abra a página **por um servidor local** — o navegador bloqueia a leitura do `manifest.json`
   quando o arquivo é aberto direto do disco (`file://`):

```bash
cd vsl && python3 -m http.server 8000
# depois acesse http://localhost:8000
```

Se o arquivo não existir ou não carregar, o player simplesmente continua com o visual animado.
Nada quebra.

**Narração:** salve a locução como `vsl/assets/narracao.mp3`, preencha `"narracao": "assets/narracao.mp3"`
e o player passa a sincronizar a legenda pelo áudio, no lugar do relógio interno. O texto para gravar
está em `narracao.txt`.

**Trilha:** já vem pronta em `vsl/audio/trilha.mp3`, sintetizada por `trilha.py` — som seu, sem
licença de terceiros. Com a locução ligada, a trilha continua tocando por baixo como cama.

---

## 2. Onde baixar (grátis, uso comercial liberado)

| Banco | O que tem | Link |
|---|---|---|
| **Pexels** | vídeo + foto, muita coisa de salão e cabelo | https://www.pexels.com/pt-br/ |
| **Pixabay** | vídeo + foto + trilha | https://pixabay.com/pt/ |
| **Mixkit** | vídeo curto, bom para b-roll de fundo | https://mixkit.co/free-stock-video/ |
| **Coverr** | vídeo de fundo, cortes lentos | https://coverr.co/ |
| **Unsplash** | foto de alta resolução | https://unsplash.com/pt-br |

Padrão de busca direta:

- Pexels vídeo: `https://www.pexels.com/search/videos/TERMO/`
- Pexels foto: `https://www.pexels.com/search/TERMO/`
- Pixabay vídeo: `https://pixabay.com/videos/search/TERMO/`
- Unsplash: `https://unsplash.com/s/photos/TERMO`

### Licença — o que checar antes de usar em anúncio

Pexels, Pixabay, Mixkit, Coverr e Unsplash liberam uso comercial **sem exigir atribuição**, mas as
regras mudam de tempos em tempos: confira a licença na página do arquivo que você baixou. Em todos
elas valem os mesmos limites práticos:

- Não revender nem redistribuir o arquivo como se fosse seu.
- Não usar pessoa identificável de forma ofensiva, nem de forma que sugira que ela **endossa** o produto.
- **Nunca** apresentar pessoa de banco de imagem como aluna, cliente ou depoimento seu. Isso é
  propaganda enganosa, derruba conta de anúncio e é o erro mais comum em VSL de infoproduto.
- Depoimento tem que ser real, gravado pela pessoa, com autorização.

---

## 3. Cena a cena — o que buscar

Os termos em inglês costumam devolver muito mais resultado nesses bancos. Prefira plano fechado,
movimento lento e imagem escura: a legenda fica por cima, e imagem clara demais come o texto.

### Bloco 1 — O padrão oculto (0:00–1:00)

| Cena | O que mostrar | Termo PT | Termo EN |
|---|---|---|---|
| `abertura` | salão vazio no fim do expediente, luz do espelho | salão de beleza vazio | `empty hair salon`, `salon mirror lights` |
| `rotina` | profissional em pé atendendo, corte/escova | cabeleireira trabalhando | `hairdresser working`, `hair stylist blow dry` |
| `caixa` | caderno de anotação, calculadora, maquininha | contas mesa calculadora | `calculator receipts`, `small business accounting` |
| `atencao` | rosto pensativo, olhar parado | mulher pensativa | `thoughtful woman portrait` |
| `nao-e-voce` | profissional cansada encostada na cadeira | cansaço trabalho | `tired woman working late` |
| `vazamento` | dinheiro/moeda, torneira pingando | torneira pingando | `dripping faucet`, `coins falling` |
| `promessa` | agenda/planner sendo aberto | agenda planner | `planner notebook desk` |

### Bloco 2 — O diagnóstico (1:00–2:50)

| Cena | O que mostrar | Termo PT | Termo EN |
|---|---|---|---|
| `diagnostico` | prancheta, anotação técnica | anotação prancheta | `clipboard notes` |
| `conselhos` | celular com redes sociais, cartaz de promoção | celular instagram | `scrolling social media phone` |
| `pressuposto` | mesma imagem do anterior, mais escura | — | — |
| `ja-entrou` | porta do salão abrindo, cliente entrando | entrada de loja | `shop door opening customer` |
| `cadeira` | cliente sentada na cadeira, close no cabelo | cliente cadeira salão | `client in salon chair`, `hair close up damaged` |
| `silencio` | close de mão trabalhando, sem rosto | mãos cabelo | `hands styling hair` |
| `causa` | conversa entre profissional e cliente | conversa salão | `hairdresser talking to client` |
| `todo-mes` | calendário, folhinha | calendário mês | `calendar month desk` |

### Bloco 3 — O mecanismo (2:35–4:05)

| Cena | O que mostrar | Termo PT | Termo EN |
|---|---|---|---|
| `descoberta` | salão movimentado, plano aberto | salão de beleza | `beauty salon interior` |
| `pilar-1` | celular filmando atendimento, cliente nova | divulgação celular | `filming phone salon` |
| `pilar-2` | close no fio, análise do cabelo | diagnóstico capilar | `hair analysis close up` |
| `pilar-3` | recomendação de produto na bancada | produto capilar bancada | `hair product recommendation` |
| `balde` | água enchendo, jarra | água enchendo copo | `water filling glass` |
| `margem` | maquininha de cartão, pagamento | pagamento maquininha | `card payment small business` |

### Bloco 4 — A oferta (4:05–5:20)

| Cena | O que mostrar | Termo PT | Termo EN |
|---|---|---|---|
| `produto` | celular na mão com conteúdo, mockup | celular na mão | `hand holding phone screen` |
| `dias` | checklist sendo marcado | checklist lista | `checklist checkbox pen` |
| `bonus` | notebook com IA/chat, WhatsApp | digitando notebook | `typing laptop chat` |
| `conta-fria` | produtos de home care na prateleira | prateleira produtos cabelo | `hair care products shelf` |
| `preco` | fundo escuro, textura neutra | textura escura | `dark texture background` |

### Bloco 5 — Fechamento (5:20–6:11)

| Cena | O que mostrar | Termo PT | Termo EN |
|---|---|---|---|
| `cta` | cliente saindo satisfeita, sorriso real | cliente satisfeita salão | `happy salon client` |
| `garantia` | aperto de mão, gesto de confiança | aperto de mão | `handshake trust` |
| `risco` | calendário/agenda fechando o mês | calendário virada | `calendar last day` |
| `fecho` | profissional confiante olhando para a câmera | profissional confiante | `confident hairstylist portrait` |

---

## 4. Baixar em lote (opcional)

`baixar-midia.py` faz o download automático pelo Pexels usando os termos acima e já preenche o
`manifest.json`. Precisa de uma chave gratuita da API do Pexels (https://www.pexels.com/api/):

```bash
export PEXELS_API_KEY="sua-chave"
python3 vsl/baixar-midia.py            # baixa vídeo para todas as cenas
python3 vsl/baixar-midia.py cadeira balde   # só as cenas citadas
```

Ele nunca sobrescreve arquivo já baixado, e sempre mostra o autor e o link de origem de cada
arquivo — guarde essa lista, é o seu comprovante de origem se o anúncio for revisado.

---

## 5. Thumbnail

O roteiro pede: rosto de profissional + o texto **“Por que o caixa não fecha”**.
Busque `hairstylist portrait` no Pexels/Unsplash, escureça a imagem em 40% e escreva o texto em
cima, alinhado à esquerda, com a mesma cor de destaque do player (`#D39A3E`).
