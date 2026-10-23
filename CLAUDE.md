# Instruções permanentes

## Planos de ação das mentorias

Sempre que o usuário enviar as anotações/transcrição de uma reunião de mentoria
(upload, link de pasta do Google Drive ou texto), o entregável é **sempre** um
Plano de Ação no modelo padronizado em `mentoria/`. Não inventar outro layout.

**Regras fixas do entregável:**

1. **PDF, no máximo 5 páginas A4**, com as páginas bem aproveitadas — nenhuma
   página fechando com menos de ~85% de ocupação. O `mentoria/gerar_plano.py`
   ajusta a escala automaticamente para isso. Margens enxutas de impressão:
   14mm no topo, 11mm nas laterais e 10mm embaixo.
2. **Só as informações principais** da reunião: o que foi decidido, com
   responsável, prazo, base (Definido/Proposto) e prioridade. O plano de
   execução vem **agrupado por fase**, na ordem em que as ações acontecem, e
   dentro de cada fase ordenado por prioridade — é o que torna o documento
   simples de ler e de executar.
3. **Entregar o PDF no chat** e **subir o documento na mesma pasta do Drive**
   da reunião (como Google Doc, gerado por `mentoria/doc_html.py` — o conector
   do Drive não aceita PDF binário). Ao atualizar um plano, mandar a versão
   anterior para a lixeira: a pasta fica só com o plano vigente.
4. **Sempre informar quanto tempo levou** a execução.
5. Responder em PT-BR.

**Seções do modelo, nesta ordem:**

Cabeçalho "MENTORIA DE DISTRIBUIÇÃO | PLANO DE EXECUÇÃO" (topo direito, todas as
páginas) · Título "PLANO DE AÇÃO" · Subtítulo com nome e data da reunião ·
Faixa Modelo/Região/Ciclo · Faixa com os 4 compromissos do ciclo ·
Objetivo central · Como ler este plano ·
Situação no início do ciclo (o que avançou / o que travou) · Plano de execução
(tabela numerada, ordenada por prioridade) · Tabelas de projeção quando houver
números · Metas e indicadores · Roteiro mínimo de cada visita · Processo de venda ·
Rotina de controle financeiro · Diretrizes estratégicas complementares ·
Pontos que precisam de confirmação · Rodapé com a origem do documento.

**Identidade visual:** verde `#1F5A45` (títulos e cabeçalho de tabela), dourado
`#B58A2A` (Critério de prazo, "Proposto", cabeçalho da tabela de indicadores),
faixa de campos e faixa de fase `#EAF3EF`, "Definido" em `#2C7457`,
prioridade Alta em verde e Média em dourado, fonte Lato.

**Como gerar** (ver `mentoria/README.md` para o passo a passo):

```
python3 mentoria/montar.py corpo.html plano.html "Título"
python3 mentoria/gerar_plano.py plano.html saida.pdf "CABEÇALHO" "rodapé" "Title" "Subject"
```

Use `mentoria/exemplo-corpo.html` como ponto de partida do conteúdo.
