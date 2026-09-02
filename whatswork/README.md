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
| Lembretes de follow-up com notificação do sistema | painel → aba *Lembretes* |
| Sugerir resposta, melhorar texto, contornar objeção, fechar a venda, retomar contato, resumir conversa | painel → aba *IA* |
| Limites anti-bloqueio, chave da API, etiquetas, CSV | popup da extensão |

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

Seis ações na aba *IA*, divididas em **Responder** (sugerir resposta, melhorar
meu texto) e **Vender** (contornar objeção, fechar a venda, retomar contato,
resumir conversa).

Duas coisas no popup mudam completamente a qualidade das sugestões:

- **O que você vende** — produtos, marcas, faixas de preço, pagamento, entrega,
  pedido mínimo. A IA se apoia **só** nisso para falar de preço e produto; o que
  não estiver ali ela deixa marcado como `[preencher]` em vez de inventar. Essa
  regra está no system prompt e é verificada no teste.
- **Seu tom de voz** — como você escreve com o cliente. Ele governa forma,
  ritmo e vocabulário, mas não autoriza inventar dado nenhum. O botão
  **Usar tom do livro de Dale Carnegie** preenche o campo com os princípios de
  *Como Fazer Amigos e Influenciar Pessoas* traduzidos em regras de escrita
  ("comece pelo que a pessoa disse", "reconheça o ponto antes de responder",
  "ofereça opções em vez de empurrar uma") — a leitura honesta do livro, não a
  manipuladora. É um ponto de partida editável.

O botão **Carregar modelos de cosméticos** (seção *Kit de vendas*) adiciona 7
modelos prontos — abordagem, catálogo, dúvida de produto, objeção de preço,
fechamento, pós-venda e recompra — mais as etiquetas *Aguardando pagamento* e
*Recompra*. Os modelos vêm com `[colchetes]` no lugar do que só você sabe, para
ninguém sair mandando preço errado por descuido. Clicar duas vezes não duplica.

Para ligar, abra o popup da extensão, cole uma chave da API da Anthropic
(<https://platform.claude.com/settings/keys>), clique em **Testar conexão** e
marque *Ativar as ações de IA*. O botão de teste faz uma chamada mínima e diz
exatamente o que falhou — chave inválida, limite de uso, modelo inexistente ou
rede bloqueada — em vez de deixar o erro genérico.
O consumo é cobrado na sua conta. O modelo padrão é `claude-opus-5`; o popup
também oferece Sonnet 5 e Haiku 4.5, mais baratos.

A chamada é feita com `fetch` em HTTP puro, do service worker, em vez do SDK
oficial: o pacote não roda sem bundler, a extensão não tem etapa de build, e a
CSP proíbe código remoto — então tudo que executa está no pacote que você
inspeciona. As tarefas rodam com `effort` baixo ou médio, porque são pedidos
curtos e isso mantém custo e latência baixos.

Só o texto das últimas 12 mensagens da conversa aberta é enviado (configurável),
com tetos de tamanho para não mandar mais do que a tarefa precisa.

## Testes

```bash
cd whatswork
npm install      # só playwright, para o teste em navegador
npm test
```

- `tools/validate.js` — manifest válido, arquivos referenciados existentes,
  scripts compilando, e as 10 travas de segurança descritas acima.
- `tests/e2e.js` — carrega a extensão num Chromium real e exercita o painel
  contra uma réplica do DOM do WhatsApp Web (`tests/fixtures/whatsapp-mock.html`).

O truque do teste está em interceptar as requisições para
`https://web.whatsapp.com/` e responder com o fixture local: a URL continua
sendo a real, então o Chrome injeta os content scripts normalmente e tudo roda
com as APIs de extensão de verdade — `chrome.storage`, `chrome.runtime`,
service worker. Nada de mock das APIs.

As 22 verificações cobrem: carga da extensão, injeção do painel, isolamento
entre página e extensão, identificação da conversa, persistência de anotações e
etiquetas, modelos, envio manual, recusa de envio sem confirmação, confirmação
pelo botão, envio automático quando permitido, bloqueio pelo limite por hora,
adiamento diante de rascunho, aba de IA bloqueada sem chave, resposta da IA
inserida sem enviar, formato e cabeçalhos da chamada à API, defesa contra
injeção de prompt, presença do contexto de negócio e do tom de voz no system
prompt, existência e conteúdo das ações de venda, chave ausente da página,
popup, diagnóstico de conexão nos três desfechos (sucesso, chave inválida e
rede fora), ausência de requisição externa e ausência de erro de JS.

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
