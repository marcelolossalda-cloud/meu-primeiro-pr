# Guia técnico: fazer o agente do DistriWork aprender de verdade

> **Para quem é:** para o Marcelo colar no **Claude Code**, dentro da pasta do código do app (`crm-app`), **se o agente do DistriWork ainda não tiver memória própria**.
> Se o app já tiver um campo de "memória" ou de "arquivos de conhecimento" que o agente lê sozinho, basta subir `DistriWork-Agente-Completo.md` e `memoria-de-aprendizado.md` lá, e este guia não é necessário.

---

## PROMPT PRONTO (copie tudo abaixo e cole no Claude Code)

```
Missão: ligar a "memória de aprendizado" no agente de IA do DistriWork (Work Distri).
Fale comigo em português do Brasil, com palavras simples. Antes de começar, diga quanto
tempo acha que leva e me avise a cada ~5 minutos quanto falta.

Contexto
- O agente usa como base o documento agente-distriwork/DistriWork-Agente-Completo.md
  (vou colocar este arquivo na pasta do projeto) e precisa aprender com as perguntas,
  as respostas e os resultados, sempre com a minha aprovação.
- Leia antes: HISTORICO.md, AGENTS.md, prisma/schema.prisma e o guia em
  node_modules/next/dist/docs/ antes de escrever rota, cache ou API.

Regras da casa (inegociáveis)
1. Trabalhe numa branch nova (ex.: agente-memoria). Nada direto na principal.
2. Nunca apague nada sem me perguntar.
3. Nunca mostre segredos (.env, chaves). Confira as variáveis só pelo nome.
4. Nunca publique (Railway) sem a minha confirmação explícita.
5. Mudança no banco: me avise antes, explique em uma frase o porquê e siga o
   padrão de src/lib/migracoesLeves.ts.
6. Toda consulta filtra pela empresa logada (businessId). Permissões conferidas no servidor.
7. Tudo passa por: npx tsc --noEmit, npm run lint, npm run build, npm run verificar-cores
   e os testes. Todo comportamento novo ganha um teste.
8. Registre no HISTORICO.md o que mudou e por quê.
9. Tem que funcionar nas 3 versões: site, celular (modo sem internet) e programa do computador.

O que construir
A) Tabela AprendizadoAgente (proposta; ajuste ao padrão do projeto):
   id, businessId, tipo (objecao|frase|produto|campanha|preferencia|correcao|faq),
   situacao, acao, resultado (opcional), licao, fonteLivro (opcional),
   status (PROVISORIO|APROVADO|DESCARTADO), criadoPorId, aprovadoPorId (opcional),
   aprovadoEm (opcional), createdAt, updatedAt.
   NÃO guardar dados pessoais de cliente (CPF, telefone, endereço, dívida de pessoa).
   Validar no servidor e recusar textos que pareçam CPF ou telefone.

B) Tabela FeedbackResposta: id, businessId, usuarioId, pergunta, resposta,
   nota (funcionou|nao_funcionou), comentario (opcional), createdAt.

C) Como montar o contexto do agente em cada pergunta:
   1. Instruções + DistriWork-Agente-Completo.md (o conhecimento fixo).
   2. Os aprendizados APROVADOS da empresa (os mais recentes e os ligados ao assunto da
      pergunta, por busca simples de palavras), num bloco "Regras aprendidas (aprovadas)".
   3. Os PROVISÓRIOS mais relevantes (no máximo 5), num bloco "Em teste".
   4. Os dados do app que a pergunta pedir (cliente, fiado, estoque, metas), sempre pela
      empresa logada.
   Ordem de confiança: regras oficiais > aprovados > livros > provisórios.

D) Na tela do agente:
   - Botões 👍 Funcionou / 👎 Não funcionou em cada resposta (grava FeedbackResposta).
   - Botão "Guardar como aprendizado" (abre a ficha já preenchida pela IA, para editar).
   - Comandos /aprendi, /funcionou, /naofuncionou e /revisar funcionando.

E) Tela "Aprendizados do agente" (só para o dono):
   - Lista dos PROVISÓRIOS com Aprovar / Editar / Descartar.
   - Filtros por tipo e status; contadores do mês (aprovados, descartados, 👍, 👎).
   - Botão "Exportar" que gera o arquivo memoria-de-aprendizado.md atualizado.
   - Lembrete toda sexta-feira: "Você tem X aprendizados para revisar."

F) Testes mínimos:
   - Um aprendizado de uma empresa nunca aparece para outra.
   - O vendedor não aprova; só o dono aprova.
   - O PROVISÓRIO não entra no bloco de regras aprovadas.
   - Um texto com CPF ou telefone é recusado.

Antes de mudanças grandes de tela, me mostre o antes e o depois em print e espere o meu ok.
No fim, me entregue um relatório simples: o que foi feito, como testar e o que ficou pendente.
Pergunte: "Posso publicar?"
```

---

## Por que fazer assim

- **Aprender com segurança:** a IA sugere e o dono aprova. Assim o agente nunca transforma um erro em regra.
- **Privacidade (LGPD):** a memória guarda lições, não pessoas.
- **Cada empresa separada:** o filtro por `businessId` segue a regra que o app já tem.
- **Medir:** com o 👍/👎 e o placar mensal, dá para ver se o agente está melhorando.
