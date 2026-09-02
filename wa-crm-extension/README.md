# WA CRM Lite

Extensão de navegador (Chrome/Edge, Manifest V3) que adiciona um painel de CRM
ao WhatsApp Web: anotações e etiquetas por contato, modelos de resposta,
mensagens agendadas e lembretes de follow-up.

Inspirada em extensões comerciais do gênero (WAPlus CRM e similares), mas
**escrita do zero** — nenhum código de terceiros foi copiado. Não é afiliada,
mantida ou endossada pelo WhatsApp, pela Meta ou pela WAPlus.

## Instalação

1. Abra `chrome://extensions`
2. Ative o **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação** e selecione a pasta `wa-crm-extension/`
4. Abra <https://web.whatsapp.com/> e clique na aba **CRM** na borda direita

## O que já funciona

| Recurso | Onde |
|---|---|
| Anotações por contato, com data e exclusão | painel → aba *Contato* |
| Etiquetas coloridas (Lead, Cliente, Negociando, Perdido + suas próprias) | painel → aba *Contato*; gerenciar no popup |
| Modelos de resposta com variáveis `{{nome}}` e `{{primeiro_nome}}` | painel → aba *Modelos* |
| Mensagens agendadas (abre a conversa e envia na hora marcada) | painel → aba *Agenda* |
| Lembretes de follow-up com notificação do sistema | painel → aba *Lembretes* |
| Exportar/importar contatos em CSV | popup da extensão |

Tudo é gravado em `chrome.storage.local`: os dados ficam **na sua máquina**, a
extensão não faz nenhuma requisição de rede e não tem servidor.

## Como está organizado

```
manifest.json                     MV3: permissões, content scripts, service worker
src/lib/store.js                  persistência (chrome.storage.local)
src/content/wa-dom.js             todo o acoplamento com o DOM do WhatsApp
src/content/sidebar.js            UI do painel (shadow DOM)
src/content/index.js              bootstrap + fila de envios agendados
src/background/service-worker.js  relógio (chrome.alarms) e notificações
src/popup/                        popup: estatísticas, etiquetas, CSV
tools/validate.js                 checagem do pacote antes de carregar no Chrome
```

Duas decisões que valem explicar:

- **`wa-dom.js` concentra todos os seletores.** O WhatsApp Web ofusca as classes
  CSS e muda o markup sem aviso. Os seletores aqui usam só atributos semânticos
  (`data-id`, `contenteditable`, `role`, `aria-label`, `data-icon`), que duram
  bem mais — e quando quebrarem, só esse arquivo precisa de conserto.
- **Quem conta o tempo é o service worker, não a página.** Abrir uma conversa
  recarrega o SPA e mata o content script, então o agendamento é reentrante: o
  service worker marca o item como vencido, o content script abre a conversa,
  recarrega, se reconhece na conversa certa e aí envia.

## Validação

```bash
node wa-crm-extension/tools/validate.js
```

Confere o manifest, se todo arquivo citado existe e se todos os scripts
compilam — os três erros que fazem o Chrome recusar o pacote sem dizer onde.

## Limitações conhecidas

- **Envio agendado exige o WhatsApp Web aberto** numa aba. Se não houver aba, a
  extensão avisa por notificação e tenta de novo no próximo minuto.
- **Agendamento só para conversas individuais** com número identificado (grupos
  não têm telefone).
- Numa conversa sem nenhuma mensagem carregada, as notas ficam salvas pelo nome
  do contato até o número aparecer.
- Interface e seletores foram escritos para o WhatsApp Web de 2026; uma mudança
  grande no app pode exigir ajuste em `wa-dom.js`.

## Aviso de uso

Automatizar o WhatsApp fora da API oficial do WhatsApp Business é contra os
Termos de Serviço da plataforma, e disparos em massa podem resultar em bloqueio
do número. Esta extensão foi feita para uso pessoal e organização do próprio
atendimento — um envio agendado por vez, escrito por você. Não inclui, e não
deve ser estendida para, disparo em massa.
