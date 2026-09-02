# WhatsWork

Extensão de navegador (Chrome/Edge, Manifest V3) que adiciona um painel de CRM
ao WhatsApp Web: anotações e etiquetas por contato, modelos de resposta,
mensagens agendadas e lembretes de follow-up.

Inspirada em extensões comerciais do gênero (WAPlus CRM e similares), mas
**escrita do zero** — nenhum código de terceiros foi copiado. Não é afiliada,
mantida ou endossada pelo WhatsApp, pela Meta ou por qualquer um desses
produtos.

## Instalação

1. Abra `chrome://extensions`
2. Ative o **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação** e selecione a pasta `whatswork/`
4. Abra <https://web.whatsapp.com/> e clique na aba **WHATSWORK** na borda direita

## O que funciona

| Recurso | Onde |
|---|---|
| Anotações por contato, com data e exclusão | painel → aba *Contato* |
| Etiquetas coloridas (Lead, Negociando, Cliente, Perdido + suas próprias) | painel → aba *Contato*; gerenciar no popup |
| Modelos de resposta com variáveis `{{nome}}` e `{{primeiro_nome}}` | painel → aba *Modelos* |
| Mensagens agendadas | painel → aba *Agenda* |
| Lembretes de follow-up com notificação do sistema | painel → aba *Lembretes* |
| Exportar/importar contatos em CSV | popup da extensão |

## Segurança e privacidade

Esta extensão vai enxergar o seu WhatsApp pessoal, então as garantias abaixo
não são promessa de texto: cada uma é verificada por `tools/validate.js` ou
pelo teste ponta a ponta, e a build falha se deixarem de valer.

**O que ela lê do WhatsApp.** Apenas o identificador e o nome da conversa
aberta — o número sai do atributo `data-id` das mensagens, o nome sai do
cabeçalho. **O conteúdo das suas mensagens nunca é lido, copiado ou
armazenado.**

**Onde os dados ficam.** Só em `chrome.storage.local`, ou seja, no seu
computador. Nada de `chrome.storage.sync` (que subiria tudo para a sua conta
Google) — o validador rejeita esse uso.

**Rede.** A extensão não faz nenhuma requisição: não tem servidor, não tem
telemetria, não tem analytics. O teste ponta a ponta registra todo request do
navegador e falha se aparecer qualquer destino que não seja o próprio WhatsApp.
A CSP do manifest ainda declara `connect-src 'none'`, então nem uma chamada
acidental passaria.

**Permissões.** Só três (`storage`, `alarms`, `notifications`) e um único host
(`https://web.whatsapp.com/*`). Ela não consegue ver nenhum outro site que você
abra. O validador tem essa lista fixa e reclama de qualquer permissão a mais.

**Código remoto.** A CSP proíbe `eval` e scripts externos; o validador recusa
`innerHTML`, `document.write`, `eval` e `new Function`. Toda a UI é montada com
`createElement`/`textContent`, então nome de contato ou texto de anotação nunca
viram HTML.

**Envio automático.** Só existe um caminho de envio automático — a aba *Agenda*,
uma mensagem por vez, escrita por você. Antes de enviar, a extensão confere que
a conversa aberta é mesmo a do destinatário e **não envia se houver rascunho no
campo de mensagem**, para nunca sobrescrever o que você está digitando (o
adiamento aparece no painel). Não há, e não deve ser adicionado, disparo em
massa.

**Exportação CSV.** Células que começam com `=`, `+`, `-` ou `@` recebem um
apóstrofo, para o Excel não interpretar um contato como fórmula ao abrir.

## Testes

```bash
cd whatswork
npm install      # só playwright, para o teste em navegador
npm test
```

- `tools/validate.js` — manifest válido, arquivos referenciados existentes,
  scripts compilando, e as travas de segurança descritas acima.
- `tests/e2e.js` — carrega a extensão num Chromium real e exercita o painel
  contra uma réplica do DOM do WhatsApp Web (`tests/fixtures/whatsapp-mock.html`).

O truque do teste está em interceptar as requisições para
`https://web.whatsapp.com/` e responder com o fixture local: a URL continua
sendo a real, então o Chrome injeta os content scripts normalmente e tudo roda
com as APIs de extensão de verdade — `chrome.storage`, `chrome.runtime`,
service worker. Nada de mock das APIs.

Cobertura atual (12 verificações): carregamento da extensão, injeção do painel,
identificação da conversa, persistência de anotações e etiquetas entre reloads,
modelo preenchido e inserido no campo de mensagem, envio pelo botão, envio
agendado disparado pelo service worker, adiamento diante de rascunho, popup com
as estatísticas, ausência de requisições externas e ausência de erros de JS.

## Como está organizado

```
manifest.json                     MV3: permissões, CSP, content scripts, service worker
src/lib/store.js                  persistência (chrome.storage.local)
src/content/wa-dom.js             todo o acoplamento com o DOM do WhatsApp
src/content/sidebar.js            UI do painel (shadow DOM)
src/content/index.js              bootstrap + fila de envios agendados
src/background/service-worker.js  relógio (chrome.alarms) e notificações
src/popup/                        popup: estatísticas, etiquetas, CSV
tools/validate.js                 validação do pacote + travas de segurança
tests/                            teste ponta a ponta e réplica do WhatsApp Web
```

Três decisões que valem explicar:

- **`wa-dom.js` concentra todos os seletores.** O WhatsApp Web ofusca as classes
  CSS e muda o markup sem aviso. Os seletores aqui usam só atributos semânticos
  (`data-id`, `contenteditable`, `role`, `aria-label`, `data-icon`), que duram
  bem mais — e quando quebrarem, só esse arquivo precisa de conserto.
- **Quem conta o tempo é o service worker, não a página.** Abrir uma conversa
  recarrega o SPA e mata o content script, então o agendamento é reentrante: o
  service worker marca o item como vencido, o content script abre a conversa,
  recarrega, se reconhece na conversa certa e aí envia.
- **`setComposerText` usa `execCommand('insertText')` de propósito.** O editor
  do WhatsApp ignora atribuições diretas a `textContent`, porque escuta eventos
  de composição do navegador.

## Limitações conhecidas

- **Envio agendado exige o WhatsApp Web aberto** numa aba. Se não houver aba, a
  extensão avisa por notificação e tenta de novo no próximo minuto.
- **Agendamento só para conversas individuais** com número identificado (grupos
  não têm telefone).
- Numa conversa sem nenhuma mensagem carregada, as notas ficam salvas pelo nome
  do contato até o número aparecer.
- Os testes rodam contra uma réplica do DOM, não contra o WhatsApp real (não há
  como automatizar o login). Se o app mudar o markup, o ajuste é em `wa-dom.js`.

## Aviso de uso

Automatizar o WhatsApp fora da API oficial do WhatsApp Business é contra os
Termos de Serviço da plataforma, e disparos em massa podem resultar em bloqueio
do número. Esta extensão foi feita para uso pessoal e organização do próprio
atendimento — um envio agendado por vez, escrito por você.
