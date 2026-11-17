# Prompt curto: busca inteligente no DistriWork

> A mesma missão do `PROMPT-busca-inteligente.md`, mas sem o código dentro: o Claude Code baixa os 4 arquivos do GitHub (links fixos no commit em que foram testados). Bom para copiar e colar.

---

```
Missão: busca inteligente com sugestões em todos os campos de busca de cliente e de produto
do DistriWork (Work Distri), o app publicado em loja.marceloemilene.com.
Fale comigo em português do Brasil, com palavras simples. Antes de começar, diga quanto
tempo acha que leva e me avise a cada ~5 minutos quanto falta.

Contexto do app
- Next.js 16.3 (App Router) + React 19 + Prisma 7 com SQLite (better-sqlite3) + Tailwind 4
  + TypeScript. O AGENTS.md avisa que este Next.js tem mudanças que não estão no seu
  treinamento: leia o guia em node_modules/next/dist/docs/ antes de mexer em rota, cache
  ou API.
- Três versões, e a busca tem que funcionar nas três: o site no Railway
  (loja.marceloemilene.com), o celular com modo sem internet (public/sw.js e
  lib/offline.ts) e o programa do computador (scripts/empacotar-windows.mjs).
- Cores: use os tokens de src/app/globals.css e src/lib/coresDaArea.ts. Nada de cor fixa
  no JSX; o npm run verificar-cores tem que continuar passando.
- src/components/sales/PosScreen.tsx (a tela de vender) é grande e de alto risco: mexa só
  no campo de busca, com cuidado, e teste a venda inteira depois.

O que eu quero
- Quando eu digitar o nome de uma cliente ou de um produto, as sugestões aparecem embaixo
  do campo enquanto eu digito.
- Tanto faz acento, cedilha, maiúscula ou minúscula: "jose" = "José", "MONICA" = "Mônica",
  "conceicao" = "Conceição".
- Mesmo com erro de digitação, sugere o mais parecido ("progresiva" → "Progressiva",
  "Ghodess" → "Ghoodess"), com o aviso "você quis dizer?".
- Palavras fora de ordem ou pela metade também funcionam ("silva jose", "desco").
- Cliente: também acha pelo salão, pelo apelido e pelo telefone.
  Produto: também acha pela marca, pela linha, pelo código e pelo código de barras.
- O que bate certinho vem primeiro; o que foi achado por aproximação vem depois.
- Teclado: ↓ e ↑ andam, Enter escolhe, Esc fecha. No celular, é só tocar.
- Tem que funcionar nas 3 versões: site, celular (inclusive sem internet) e programa do
  computador.

O que o teste no site publicado mostrou (05/11/2026)
- 🟢 Acento, cedilha e maiúscula JÁ são ignorados em todas as buscas testadas: Vender
  (produto e cliente), Estoque, Rotas, Clientes e Produtos. Também já acham por pedaço
  do nome, palavras fora de ordem, código do produto e cidade da cliente. Descubra no
  código qual função faz isso hoje e não quebre esse comportamento.
- 🔴 Clientes (/contatos) e Produtos (/produtos/catalogo) só procuram depois de apertar
  Enter (a busca vai para o endereço, ?q=). Não sugerem enquanto digita.
- 🔴 Nenhuma tela aceita erro de digitação: "monika", "progresiva" e "ghodess" não acham
  nada. Também não existe o aviso "você quis dizer?".
- Então o trabalho principal é: sugestões enquanto digita em Clientes e Produtos, e
  tolerância a erro de digitação em todas as buscas.

Onde aplicar (confira no código quais telas têm busca de cliente ou de produto)
- Vender (caixa / PosScreen): busca de produto e escolha da cliente. No caixa, depois de
  escolher o produto, o campo limpa para lançar o próximo (limparAoEscolher).
- Clientes, Fiado, Boletos, Consultar Vendas, Agenda e Rotas: busca de cliente.
- Produtos / Estoque: busca de produto.
- Loja pública /loja/[slug]: busca de produto.
- Agente de IA do app: quando eu citar uma cliente ou um produto pelo nome, ele procura com
  a mesma função (buscar) e, se houver mais de um parecido, me pergunta qual é.
- Achou outro campo de busca de cliente ou produto? Me mostre a lista antes de mexer.

O código já está pronto e testado (17 testes da busca + 6 da caixa de sugestões,
TypeScript no modo estrito). Baixe os 4 arquivos do meu GitHub (repositório público),
leia cada um antes de usar e salve assim:
- https://raw.githubusercontent.com/marcelolossalda-cloud/meu-primeiro-pr/330ae2d5a73bb6ea6561193ca5af230f5a47eb85/busca-inteligente/buscaInteligente.ts
  → src/lib/buscaInteligente.ts (o motor da busca; não depende de nenhuma biblioteca).
- https://raw.githubusercontent.com/marcelolossalda-cloud/meu-primeiro-pr/330ae2d5a73bb6ea6561193ca5af230f5a47eb85/busca-inteligente/CampoBusca.tsx
  → src/components/CampoBusca.tsx (a caixa com as sugestões). Ajuste o import do motor
  para o caminho do projeto e adapte o visual às classes e cores do projeto (props
  "classes"). Não use cor fixa: rode npm run verificar-cores.
- https://raw.githubusercontent.com/marcelolossalda-cloud/meu-primeiro-pr/330ae2d5a73bb6ea6561193ca5af230f5a47eb85/busca-inteligente/buscaInteligente.test.ts
- https://raw.githubusercontent.com/marcelolossalda-cloud/meu-primeiro-pr/330ae2d5a73bb6ea6561193ca5af230f5a47eb85/busca-inteligente/CampoBusca.test.tsx
  → os testes. Adapte ao jeito de testar do projeto.
Se não conseguir baixar, pare e me avise. Não reescreva o código de memória.

Como fazer (regras da casa, inegociáveis)
1. Trabalhe numa branch nova (ex.: busca-inteligente). Nada direto na principal.
2. Leia antes: HISTORICO.md, AGENTS.md e como cada tela busca hoje (filtra a lista no
   navegador ou consulta o servidor). Leia também o guia em node_modules/next/dist/docs/
   antes de escrever rota, cache ou API.
3. Se a tela já tem a lista carregada no navegador: use o CampoBusca (ou a função buscar)
   direto. Funciona sem internet.
4. Se a busca é feita no servidor: no SQLite, o `contains` do Prisma NÃO ignora acento
   ("José" ≠ "Jose"), só ignora maiúscula em letra sem acento ("É" ≠ "é") e não aceita erro
   de digitação. Me explique as duas opções e me deixe escolher ANTES de mexer no banco:
   a) carregar a lista de clientes ou produtos da empresa no navegador (com cache) e buscar
      com o buscaInteligente. É mais simples, funciona sem internet e aguenta milhares de
      itens;
   b) guardar um campo "nomeBusca" já normalizado (com a função normalizar), procurar nele
      no servidor e depois ordenar com buscar(). Isso é mudança no banco: siga o padrão de
      src/lib/migracoesLeves.ts e me avise antes, explicando em uma frase o porquê.
5. Uma regra só no app inteiro: antes de criar algo, procure funções que já comparam nomes
   ignorando maiúscula e acento (por exemplo chaveDoNome, do cadastro de formas de
   pagamento) e faça todas usarem a função normalizar. Nada de duas funções fazendo a
   mesma conta de jeitos diferentes.
6. Sem internet: a lista de clientes e produtos que a busca usa tem que estar guardada no
   aparelho (veja lib/offline.ts e public/sw.js). Teste com a internet desligada.
7. Toda consulta filtra pela empresa logada (businessId). Permissões conferidas no servidor.
8. O índice da busca só é montado quando a lista muda (o componente já faz isso com
   useMemo). Passe "texto" e "extras" como funções estáveis (fora do componente ou com
   useCallback), senão o índice é refeito a cada letra.
9. Nunca mostre segredos (.env, chaves). Nunca apague nada sem me perguntar.
10. Nunca mexa na minha instalação do computador em C:\Users\lossa\WorkDistri (a pasta
    dados ali tem o meu banco real). Gere e teste o pacote novo só na pasta dist do projeto,
    numa empresa de teste.
11. Tudo passa por: npx tsc --noEmit, npm run lint, npm run build, npm run verificar-cores e
   os testes. Todo comportamento novo ganha um teste.
12. Registre no HISTORICO.md o que mudou e por quê.
13. Antes de mudanças grandes de tela, me mostre o antes e o depois em print (celular
    390 px e computador 1280 px) e espere o meu ok.
14. Nunca publique (Railway) sem a minha confirmação explícita.

No fim, me entregue um relatório simples (o que foi feito, em quais telas, como testar e o
que ficou pendente) e esta lista de conferência marcada:
[ ] "jose", "JOSE" e "José" acham a mesma cliente.
[ ] Um nome com 1 letra errada aparece com "você quis dizer?".
[ ] No caixa: digito "progresiva", aperto Enter, o produto entra na venda e o campo limpa.
[ ] No celular, sem internet, a busca continua funcionando.
[ ] Com mais de 1.000 clientes, as sugestões aparecem sem travar.
[ ] Uma empresa nunca vê clientes ou produtos de outra.
[ ] O programa do computador (pacote novo, numa pasta temporária) também sugere certo.
Depois pergunte: "Posso publicar?"
```
