# Prompt: correções do teste de 05/11/2026

> **Para quem é:** para o Marcelo colar no **Claude Code**, dentro da pasta do código do app (`Documentos\crm-app`), o app publicado em **loja.marceloemilene.com**.
> **De onde vem:** o teste feito pelo Claude no site publicado em 05/11/2026, numa empresa de teste criada para isso. Foram 27 telas, no celular (390 px) e no computador (1280 px).
> **O que faz:** corrige 5 pontos que o teste encontrou e apaga a empresa de teste.
> **Depois:** rode também o `busca-inteligente/PROMPT-busca-inteligente.md`, que completa a busca.

---

## PROMPT PRONTO (copie tudo abaixo e cole no Claude Code)

```
Missão: corrigir o que o teste do site publicado (05/11/2026) encontrou no Distri Work e
apagar a empresa de teste que foi criada para esse teste.
Fale comigo em português do Brasil, com palavras simples. Antes de começar, diga quanto
tempo acha que leva e me avise a cada ~5 minutos quanto falta.

Contexto do app
- Next.js 16.3 (App Router) + React 19 + Prisma 7 com SQLite (better-sqlite3) + Tailwind 4
  + TypeScript. O AGENTS.md avisa que este Next.js tem mudanças que não estão no seu
  treinamento: leia o guia em node_modules/next/dist/docs/ antes de mexer em rota, cache,
  layout ou API.
- Três versões, e toda correção tem que funcionar nas três: o site no Railway
  (loja.marceloemilene.com), o celular com modo sem internet (public/sw.js e
  lib/offline.ts) e o programa do computador (scripts/empacotar-windows.mjs).
- Cores: use os tokens de src/app/globals.css e src/lib/coresDaArea.ts. Nada de cor fixa
  no JSX; o npm run verificar-cores tem que continuar passando.
- Leia o HISTORICO.md antes de mexer.

O QUE O TESTE ENCONTROU (confirme cada um com um teste que falhe antes da correção e
passe depois)

1. 🟡 Produto novo: a janela continua aberta depois de salvar, sem aviso.
   Em Produtos e estoque (/produtos/catalogo), ao cadastrar um produto novo e tocar em
   "Salvar produto", o servidor salva (POST /api/products responde 201), mas a janela
   continua aberta, com todos os campos preenchidos e sem nenhuma mensagem. Quem usa acha
   que não salvou e toca de novo. O segundo toque faz PUT no mesmo produto (não duplica,
   que bom), mas a pessoa fica sem saber o que aconteceu.
   Quero: depois de salvar um produto novo, aparece uma confirmação visível ("Produto
   salvo ✓", com palavra, não só cor) e a janela fecha, mostrando o produto na lista.
   Se achar útil um botão "Salvar e cadastrar outro", me proponha antes.
   Confira se a mesma coisa acontece ao editar um produto e em outras janelas de cadastro.

2. 🟡 Caixa, Financeiro e Taxas mostram o mês de quando o app foi publicado.
   As páginas /caixa, /financeiro e /taxas vêm prontas do servidor e guardadas em cache
   (cabeçalhos: x-nextjs-cache: HIT, x-nextjs-prerender: 1, cache-control:
   s-maxage=31536000). O mês inicial foi calculado na hora da publicação: o HTML diz
   "Outubro de 2026" mesmo em novembro. No navegador o React troca para o mês certo e os
   dados vêm certos (pede ?mes=2026-11), mas por um instante aparece o mês errado e o
   console mostra o erro "Minified React error #418" (o texto do servidor e o do navegador
   não batem).
   Quero: o mês certo desde o primeiro instante e nenhum erro #418. O mês nunca pode ser
   calculado na publicação: calcule no navegador, ou mostre o esqueleto de carregamento
   até saber o mês, ou deixe essas páginas dinâmicas (leia o guia do Next antes de
   escolher e me diga em uma frase qual escolheu e por quê).
   Atenção ao fuso: o mês e o dia são os de Brasília (America/Sao_Paulo), não UTC. Dia 31
   às 22h ainda é o mesmo mês aqui, mas em UTC já é o mês seguinte.
   Procure o mesmo padrão ("mês atual", "hoje", data calculada no servidor) em outras
   telas: Início, Indicadores, Relatório semanal, Relatório consolidado, Agenda, Metas.

3. 🔵 Links pequenos demais para tocar no celular.
   Na tela de login, "Esqueci minha senha" (20 px de altura) e "Criar conta" (18 px); no
   cadastro, "Entrar" (18 px); em recuperar senha, "Voltar para o login" (20 px). A regra
   do app é no mínimo 44 px no celular. Aumente a área de toque sem mudar o visual (por
   exemplo, min-h-11 com inline-flex e items-center). Procure outros links de texto
   soltos com o mesmo problema.

4. 🔵 Ainda aparece a palavra em inglês "pipeline".
   Na Início, o cartão diz "Negócios (pipeline)", e o título da tela /pipeline é
   "Pipeline". Troque por "Negócios" em todo texto que a pessoa lê (menu, títulos,
   cartões, descrição do app em src/app/layout.tsx). Não mude o endereço /pipeline, para
   não quebrar links e atalhos.

5. 🔵 O app pede a logo mesmo quando a empresa não tem logo.
   Em Vender (/vender) e em Configurações (/configuracoes), a empresa sem logo pede
   /api/logo e recebe 404. Na tela não aparece nada, mas o console registra o erro. Só
   peça a logo quando a empresa tiver uma (ou faça a API responder sem erro). Sem mudança
   visual.

APAGAR A EMPRESA DE TESTE
O app não tem opção de apagar empresa nas Configurações. A empresa foi criada pelo
cadastro público do site, em 05/11/2026, só para o teste:
- Nome da empresa: "Empresa de Teste Claude (apagar)"
- Usuário: "Teste Claude", e-mail teste.claude.20261105@example.com
- 6 clientes de teste (todos com a nota "Cliente de teste (Claude). Pode apagar.") e
  5 produtos de teste (códigos TESTE-01 a TESTE-05). Nenhuma venda.
Como fazer, com cuidado, porque é o banco de verdade (produção):
a) Me mostre o plano ANTES e espere o meu ok. Não apague nada sem a minha confirmação.
b) Faça uma cópia de segurança do banco de produção antes de apagar.
c) Encontre a empresa pelo nome E pelo e-mail do usuário. Se aparecer mais de uma, ou se
   o usuário estiver ligado a outra empresa, pare e me pergunte.
d) Me mostre o que vai ser apagado, tabela por tabela, com a quantidade de registros.
   Só pode ter coisa com o businessId dessa empresa.
e) Apague numa transação só, e apenas o que tem esse businessId (e o usuário de teste).
f) Confira depois que as contagens das outras empresas, principalmente a minha, não
   mudaram.
Se achar mais seguro, me proponha criar no app uma opção de "excluir empresa" só para o
dono, com confirmação escrita, em vez de apagar direto no banco.

REGRAS DA CASA (inegociáveis)
1. Trabalhe numa branch nova (ex.: correcoes-teste-05-11). Nada direto na principal.
2. Nunca apague nada sem me perguntar: arquivos, dados, clientes, vendas, backups, dev.db.
3. Nunca mostre segredos no chat (.env, chaves, senhas, tokens). Confira só pelo nome.
4. Nunca publique (Railway) sem a minha confirmação explícita.
5. Nunca mexa na minha instalação do computador em C:\Users\lossa\WorkDistri (a pasta
   dados ali tem o meu banco real). Gere e teste o pacote novo só na pasta dist do
   projeto.
6. Teste numa empresa de teste local, criada e apagada pelo próprio teste.
7. Mudança no banco (prisma/schema.prisma): me avise antes, explique em uma frase o porquê
   e siga o padrão de src/lib/migracoesLeves.ts.
8. Toda consulta filtra pela empresa logada (businessId). Permissões conferidas no
   servidor.
9. Tudo passa por: npx tsc --noEmit, npm run lint, npm run build, npm run verificar-cores
   e os testes. Todo bug corrigido ganha um teste que falha antes e passa depois.
10. Antes de mudanças grandes de tela, me mostre o antes e o depois em print (celular
    390 px e computador 1280 px) e espere o meu ok.
11. Registre tudo no HISTORICO.md: o que mudou e por quê, em português simples.

RELATÓRIO FINAL
Em português simples, com o semáforo (🟢 bom, 🟡 atenção, 🔴 problema, sempre com palavra
junto da cor):
- Cada um dos 5 pontos: o que acontecia, o que foi feito e como foi testado.
- Outras telas onde achou o mesmo problema e corrigiu.
- A empresa de teste: o que foi apagado (com as quantidades) e a confirmação de que as
  outras empresas não mudaram. Se ainda não apagou, o plano esperando o meu ok.
- O que ficou pendente e o que precisa de decisão minha.
Depois pergunte: "Posso publicar?"
```

---

## Depois de publicar

Peça ao Claude (nesta conversa) para **rodar o teste no site de novo**. Ele confere os 5 pontos, a busca e as 27 telas, e te diz o que mudou.
