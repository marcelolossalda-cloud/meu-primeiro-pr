# WhatsWork

Extensão de navegador (Chrome/Edge, Manifest V3) que adiciona um painel de CRM
ao WhatsApp Web: anotações e etiquetas por contato, modelos de resposta,
mensagens agendadas, lembretes de follow-up e um assistente de IA opcional.

Inspirada em extensões comerciais do gênero, mas **escrita do zero** — nenhum
código de terceiros foi copiado. Não é afiliada, mantida ou endossada pelo
WhatsApp, pela Meta ou por qualquer um desses produtos.

## Instalação no Google Chrome

1. Baixe e descompacte a pasta `whatswork/`
2. Abra `chrome://extensions`
3. Ative o **Modo do desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação** e selecione a pasta `whatswork`
   (a que contém o `manifest.json`)
5. Abra <https://web.whatsapp.com/> e clique na aba **WHATSWORK** na borda direita

Não é preciso instalar Node nem rodar nada — isso só é necessário para os testes.

## O que funciona

| Recurso | Onde |
|---|---|
| Anotações por contato, com data e exclusão | painel → aba *Contato* |
| Etiquetas coloridas (Lead, Negociando, Cliente, Perdido + suas próprias) | painel → aba *Contato*; gerenciar no popup |
| Modelos de resposta com variáveis `{{nome}}` e `{{primeiro_nome}}` | painel → aba *Modelos* |
| Mensagens agendadas, com confirmação humana | painel → aba *Agenda* |
| Alerta de clientes sem contato há mais de 60 dias | painel → aba *Follow-up* |
| Lembretes de follow-up com notificação do sistema | painel → aba *Follow-up* |
| Sugerir resposta, melhorar texto, contornar objeção, fechar a venda, retomar contato, resumir conversa | painel → aba *IA* |
| Limites anti-bloqueio, chave da API, etiquetas, CSV | popup da extensão |

## Clientes esquecidos

A aba *Follow-up* lista quem está sem contato há mais de 60 dias (o limite é
seu, no popup), do mais esquecido para o menos, com um botão que abre a
conversa. A aba *Contato* mostra a mesma informação para quem está aberto na
tela, destacada quando passa do limite.

A conta usa a **data da última mensagem trocada**, lida do próprio WhatsApp
(o atributo `data-pre-plain-text` das bolhas). Isso importa por dois motivos:
vale para conversas anteriores à instalação da extensão, e mede conversa de
verdade — abrir o chat sem falar nada não zera o contador.

Uma vez por dia o service worker avisa por notificação quantos clientes
passaram do limite. Uma vez ao dia de propósito: avisar a cada minuto viraria
ruído e a pessoa desligaria as notificações da extensão, perdendo também as que
importam na hora.

Grupos ficam de fora — grupo não é cliente.

## Proteção do seu número

Automatizar o WhatsApp fora da API oficial do WhatsApp Business é contra os
Termos de Serviço, e **nenhum ajuste garante que um número não seja banido**. O
que mais pesa não é a ferramenta: é mandar mensagem para quem não espera, o que
vira bloqueio e denúncia. Dito isso, tudo que depende do software está montado
para não parecer robô:

- **Confirmação humana, ligada por padrão.** A mensagem agendada não sai
  sozinha: na hora marcada ela fica em espera e você clica em **Enviar agora**
  no painel. Quem quiser envio autônomo desliga isso conscientemente no popup.
- **Limites de volume** — no padrão, 6 envios automáticos por hora e 30 por dia.
- **Cadência humana** — intervalo mínimo de 90 s entre envios automáticos, mais
  um atraso aleatório de até 60 s, para o ritmo não virar metrônomo.
- **Janela de silêncio** — nada automático entre 21h e 8h.
- **Nunca sobrescreve o que você está digitando** — se há rascunho no campo de
  mensagem, o envio espera e diz por quê.
- **Sem disparo em massa.** Não existe e não deve ser adicionado: é o caminho
  mais curto para um número banido.

Um envio que **você confirmou** não passa pelos limites automáticos — clicar é
uma decisão humana, e não é isso que caracteriza comportamento de robô.

## Segurança

A extensão enxerga uma conta pessoal de WhatsApp, então as garantias abaixo não
são promessa de texto: cada uma é verificada por `tools/validate.js` ou pelo
teste ponta a ponta, e a build falha se deixarem de valer.

**O que ela lê.** No uso normal, apenas o identificador e o nome da conversa
aberta — o número sai do atributo `data-id` das mensagens, o nome do cabeçalho.
O conteúdo das mensagens só é lido quando **você clica** numa ação da aba IA.

**Onde os dados ficam.** Em `chrome.storage.local`, no seu computador. Nada de
`chrome.storage.sync`, que subiria tudo para a sua conta Google — o validador
rejeita esse uso.

**Rede.** Com a IA desligada (o padrão), a extensão não faz nenhuma requisição:
sem servidor, sem telemetria, sem analytics. O teste registra todo request do
navegador e falha se aparecer um destino inesperado; o validador recusa
qualquer URL no código fora de `web.whatsapp.com` e `api.anthropic.com`.

**A chave da API.** Fica em `chrome.storage.local` e é lida **somente pelo
service worker** — o content script que roda dentro do WhatsApp nunca a toca,
então nem uma falha de XSS na página alcançaria ela. O validador falha se
algum arquivo de `src/content/` mencionar a chave. Ela também não entra no
export de CSV.

**O painel é inalcançável pela página.** Ele vive num shadow root **fechado**:
com `open`, qualquer script rodando no WhatsApp Web poderia ler as suas
anotações ou clicar nos botões. (O teste automatizado liga o modo aberto por
uma chave de storage dedicada, que não afeta mais nada.)

**Nenhuma página web fala com a extensão.** O manifest não declara
`externally_connectable`, e o service worker ainda confere `sender.id` e a
origem de cada mensagem antes de agir — essa é a porta que dá acesso à chave.

**Permissões mínimas.** Três (`storage`, `alarms`, `notifications`) e dois hosts
(`web.whatsapp.com`, `api.anthropic.com`). Ela não vê nenhum outro site que você
abra. O validador tem essa lista fixa e reclama de qualquer acréscimo.

**Sem código remoto, sem injeção de HTML.** A CSP proíbe `eval` e script
externo e limita `connect-src` à API da Anthropic; o validador recusa
`innerHTML`, `document.write`, `eval`, `new Function`, `XMLHttpRequest` e
`WebSocket`. Toda a UI é montada com `createElement`/`textContent`, então nome
de contato ou texto de anotação nunca viram HTML.

**Fingerprinting.** O único recurso exposto à página (a folha de estilo do
painel) usa `use_dynamic_url`, então o WhatsApp não consegue detectar a
extensão por uma URL fixa.

**Injeção de prompt.** O texto das conversas é conteúdo de terceiros — qualquer
pessoa pode mandar "ignore as instruções acima". Ele vai para a API delimitado
por tags e o system prompt diz explicitamente que aquilo é dado a ser
analisado, nunca ordem a ser obedecida. O teste verifica essa instrução.

**A IA nunca envia nada.** O resultado é apenas inserido no campo de mensagem;
a decisão de enviar continua sua. O teste confirma que nada é enviado.

**Exportação CSV.** Células que começam com `=`, `+`, `-` ou `@` recebem um
apóstrofo, para o Excel não interpretar um contato como fórmula.

## Assistente de IA (opcional, desligado por padrão)

Dois provedores, escolhidos no popup — a extensão fala com **Claude
(Anthropic)** ou **Gemini (Google)**, e trocar entre eles é um clique. Cada um
guarda a sua própria chave e o seu próprio modelo, então alternar não apaga a
configuração do outro.

| | Claude | Gemini |
|---|---|---|
| Chave vem de | platform.claude.com (Console) | Google AI Studio |
| Prefixo | `sk-ant-…` | varia — já houve `AIza…`, hoje há `AQ.…` |
| Plano gratuito | não — precisa de créditos | sim, com limite por minuto e por dia |
| Padrão | `claude-opus-5` | `gemini-3.6-flash` |

Um ponto que confunde muita gente no Claude: a chave vem do **Console**, não do
chat em **claude.ai** — e uma assinatura Claude Pro ou Max **não** paga o uso da
API. São cobranças separadas.

**Atualizar lista de modelos** pergunta ao provedor quais modelos existem hoje e
preenche o seletor com a resposta. No Gemini a lista crua traz dezenas de
entradas e a maioria não serve para conversa — embeddings, geração de imagem e
vídeo, leitura de voz —, então ela é filtrada e ordenada: estáveis antes de
preview, mais novos antes de mais antigos, com `flash` marcado como *rápido e
barato* e `pro` como *mais capaz*. Isso evita o erro de configuração mais chato:
uma lista fixa no código envelhece e o usuário só descobre com um 404 sem
explicação. Se o modelo que estava salvo não aparecer mais na resposta, ele é
trocado pelo primeiro disponível e o popup avisa.

**A extensão não valida o formato da credencial** — ela tenta e deixa o
provedor decidir. O motivo é concreto: o AI Studio já emitiu chaves começando
com `AIza` e hoje emite com `AQ.`, e uma checagem de prefixo escrita hoje recusa
a chave válida de amanhã. O Google aceita chave de API (cabeçalho
`x-goog-api-key`) e token OAuth (`Authorization: Bearer`) no mesmo endpoint, e
a extensão tenta as duas formas: se a primeira volta 401 ou 403, ela reenvia com
a outra. Qualquer outro erro chega ao usuário como veio, sem segunda tentativa.

**Modelo aposentado se corrige sozinho.** Quando um modelo sai do ar, a API não
devolve só um 404 — ela diz qual usar no lugar ("Please update your code to use
models/…"). A extensão lê essa indicação, salva a troca e repete a chamada uma
única vez; se o substituto também falhar, o erro vai para o usuário em vez de
virar laço.

**Sobrecarga temporária é repetida sozinha.** Um 502/503/504 vem com "try again
later" — uma instrução que o código consegue seguir. A extensão repete até três
vezes, com esperas crescentes (0,6s, 1,5s, 3s) — crescentes para não piorar o
congestionamento que causou o erro, e curtas porque o service worker de uma
extensão MV3 é encerrado quando fica ocioso: uma pausa longa entre tentativas
faria a requisição seguinte morrer com "Failed to fetch", que parece falha de
rede e manda o diagnóstico para o lado errado. Cota (429) **não** é repetida: insistir só queima o que resta
do limite gratuito.

**Procurar um modelo que funcione** resolve o problema mais confuso do nível
gratuito: ali a cota é **por modelo**, e o mais novo costuma vir com cota zero
enquanto outro funciona. O botão testa os modelos em sequência — o atual
primeiro, para não mexer no que já está bom — e para no primeiro que responder,
salvando a escolha. Cada tentativa custa 16 tokens, então a busca não consome
cota de forma perceptível.

**Testar conexão** faz uma chamada mínima e diz exatamente o que falhou — chave
ausente, chave inválida, sem créditos, cota esgotada, modelo inexistente ou rede
bloqueada (nomeando o host a liberar no firewall). Toda mensagem de erro leva
junto, entre colchetes, o status HTTP e o texto que o provedor devolveu: o texto
amigável ajuda, mas é a mensagem crua que diz qual campo o servidor recusou, e
engoli-la só transfere o trabalho de diagnóstico para outra rodada.

### Ações

Seis, divididas em **Responder** (sugerir resposta, melhorar meu texto) e
**Vender** (contornar objeção, fechar a venda, retomar contato, resumir
conversa).

Duas coisas no popup mudam completamente a qualidade das sugestões:

- **O que você vende** — produtos, marcas, faixas de preço, pagamento, entrega,
  pedido mínimo. A IA se apoia **só** nisso para falar de preço e produto; o que
  não estiver ali ela deixa marcado como `[preencher]` em vez de inventar. Essa
  regra está no system prompt e é verificada no teste.
- **Seu tom de voz** — como você escreve com o cliente. Governa forma, ritmo e
  vocabulário, mas não autoriza inventar dado nenhum. O botão **Usar tom do
  livro de Dale Carnegie** preenche o campo com os princípios de *Como Fazer
  Amigos e Influenciar Pessoas* traduzidos em regras de escrita ("comece pelo
  que a pessoa disse", "reconheça o ponto antes de responder", "ofereça opções
  em vez de empurrar uma") — a leitura honesta do livro, não a manipuladora.

O botão **Carregar modelos de cosméticos** (seção *Kit de vendas*) adiciona 7
modelos prontos — abordagem, catálogo, dúvida de produto, objeção de preço,
fechamento, pós-venda e recompra — mais as etiquetas *Aguardando pagamento* e
*Recompra*. Os modelos vêm com `[colchetes]` no lugar do que só você sabe, para
ninguém sair mandando preço errado por descuido. Clicar duas vezes não duplica.

### Como está implementado

`src/background/ai.js` tem um objeto `PROVIDERS`: cada provedor sabe montar sua
requisição, ler sua resposta, traduzir seus erros e listar seus modelos. O resto
do arquivo não conhece nenhuma particularidade de API — acrescentar um terceiro
provedor é escrever mais uma entrada ali e liberar o host no manifest e no
validador.

As chamadas são feitas com `fetch` em HTTP puro, do service worker, em vez dos
SDKs oficiais: eles não rodam sem bundler, a extensão não tem etapa de build e a
CSP proíbe código remoto — então tudo que executa está no pacote que você
inspeciona. No Claude as tarefas rodam com `effort` baixo ou médio, porque são
pedidos curtos e isso mantém custo e latência baixos.

Só o texto das últimas 12 mensagens da conversa aberta é enviado (configurável),
com tetos de tamanho para não mandar mais do que a tarefa precisa.

## Testes

```bash
cd whatswork
npm install      # só playwright, para o teste em navegador
npm test
```

- `tools/validate.js` — manifest válido, arquivos referenciados existentes,
  scripts compilando, as travas de segurança descritas acima e a conferência de
  que todo elemento usado pelo popup existe no HTML.
- `tests/e2e.js` — carrega a extensão num Chromium real e exercita o painel
  contra uma réplica do DOM do WhatsApp Web (`tests/fixtures/whatsapp-mock.html`).

O truque do teste está em interceptar as requisições para
`https://web.whatsapp.com/` e responder com o fixture local: a URL continua
sendo a real, então o Chrome injeta os content scripts normalmente e tudo roda
com as APIs de extensão de verdade — `chrome.storage`, `chrome.runtime`,
service worker. Nada de mock das APIs.

As 39 verificações cobrem: carga da extensão, injeção do painel, isolamento
entre página e extensão, identificação da conversa, persistência de anotações e etiquetas, leitura da
data da última mensagem, entrada e saída da lista de clientes esquecidos
(incluindo a exclusão de grupos), integridade dos dados sob escritas
simultâneas, modelos, envio manual, recusa de envio sem confirmação, confirmação
pelo botão, envio automático quando permitido, bloqueio pelo limite por hora,
adiamento diante de rascunho, aba de IA bloqueada sem chave, resposta da IA
inserida sem enviar, formato e cabeçalhos da chamada à API, defesa contra
injeção de prompt, presença do contexto de negócio e do tom de voz no system
prompt, existência e conteúdo das ações de venda, chave ausente da página,
popup, diagnóstico de conexão nos quatro desfechos (sucesso, sem créditos,
chave inválida e rede fora), troca para o Gemini com endpoint, cabeçalho e
formato de corpo próprios, chave "AQ." enviada como chave de API, credencial
recusada reenviada como Bearer, erro não-autenticação sem segunda tentativa,
troca automática de modelo aposentado, ausência de laço quando o substituto
também falha, repetição em 503 até recuperar, desistência após três repetições
ausência de repetição em 429, busca automática de um modelo com cota (parando
no primeiro que responde e salvando a escolha) e explicação quando nenhum
responde,
isolamento das chaves por provedor, ausência de
requisição externa e ausência de erro de JS.

## Como está organizado

```
manifest.json                     MV3: permissões, CSP, content scripts, service worker
src/lib/store.js                  persistência, ajustes e limites anti-bloqueio
src/content/wa-dom.js             todo o acoplamento com o DOM do WhatsApp
src/content/sidebar.js            UI do painel (shadow root fechado)
src/content/index.js              bootstrap + fila de envios agendados
src/background/service-worker.js  relógio, notificações e porta de entrada de mensagens
src/background/ai.js              única ponte com a API da Anthropic
src/popup/                        popup: estatísticas, ajustes, etiquetas, CSV
tools/validate.js                 validação do pacote + travas de segurança
tests/                            teste ponta a ponta e réplica do WhatsApp Web
```

Decisões que valem explicar:

- **`wa-dom.js` concentra todos os seletores.** O WhatsApp Web ofusca as classes
  CSS e muda o markup sem aviso. Os seletores aqui usam só atributos semânticos
  (`data-id`, `contenteditable`, `role`, `aria-label`, `data-icon`), que duram
  bem mais — e quando quebrarem, só esse arquivo precisa de conserto.
- **Quem conta o tempo é o service worker, não a página.** Abrir uma conversa
  recarrega o SPA e mata o content script, então o agendamento é reentrante: o
  service worker marca o item como vencido, o content script abre a conversa,
  recarrega, se reconhece na conversa certa e aí envia. Todas as travas são
  checadas *antes* de navegar, para o navegador não sair do lugar por um envio
  que nem vai acontecer.
- **`ai.js` só existe no service worker.** É uma decisão de segurança, não de
  arquitetura: é o que mantém a chave da API fora do alcance da página.
- **`setComposerText` usa `execCommand('insertText')` de propósito.** O editor
  do WhatsApp ignora atribuições diretas a `textContent`, porque escuta eventos
  de composição do navegador.

## Personalizar a aparência

A paleta inteira está em variáveis CSS no topo de `src/content/sidebar.css`
(e repetida em `src/popup/popup.css`). Trocar a identidade visual é mudar
`--ww-brand` e as variáveis vizinhas — nenhuma cor aparece literal no resto do
arquivo. O tema escuro tem seu próprio bloco logo abaixo.

## Limitações conhecidas

- **Envio agendado exige o WhatsApp Web aberto** numa aba. Se não houver aba, a
  extensão avisa por notificação e tenta de novo no próximo minuto.
- **O agendamento troca a conversa aberta**: para enviar, a extensão navega até
  a conversa do destinatário. É o único caminho sem a API oficial.
- **Agendamento só para conversas individuais** com número identificado (grupos
  não têm telefone).
- Numa conversa sem nenhuma mensagem carregada, as notas ficam salvas pelo nome
  do contato até o número aparecer.
- Os testes rodam contra uma réplica do DOM e com o `fetch` da API substituído
  dentro do service worker — não contra o WhatsApp real nem contra a API real,
  porque não há como automatizar o login nem gastar a chave de ninguém. Se o
  app mudar o markup, o ajuste é em `wa-dom.js`.
