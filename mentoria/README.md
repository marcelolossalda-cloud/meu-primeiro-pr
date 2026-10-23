# Modelo do Plano de Ação — mentoria de distribuição

Gerador do PDF entregue ao final de cada reunião de mentoria. O layout reproduz
o modelo aprovado pelo cliente (documento de 06/08/2026).

## Arquivos

| Arquivo | O que é |
|---|---|
| `estilo.css` | Folha de estilo do modelo: cores, tipografia e tabelas |
| `montar.py` | Junta o conteúdo + a fonte Lato subsetizada + o estilo em um HTML |
| `gerar_plano.py` | Renderiza o PDF, ajusta a escala e aplica cabeçalho/rodapé/numeração |
| `exemplo-corpo.html` | Conteúdo de referência (plano do Leandro, 19/10/2026) |
| `doc_html.py` | Converte o mesmo conteúdo em HTML com estilos inline, para subir como Google Doc |

## Como gerar

```bash
pip install fonttools brotli pypdf pikepdf pypdfium2 pillow

# 1. escreva o conteúdo em corpo.html, seguindo exemplo-corpo.html
# 2. monte o HTML completo (baixa e subsetiza a fonte Lato)
python3 montar.py corpo.html plano.html "Plano de Ação — Fulano"

# 3. gere o PDF
python3 gerar_plano.py plano.html "Plano_de_Acao_<data>_<NOME>.pdf" \
  "MENTORIA DE DISTRIBUIÇÃO  |  PLANO DE EXECUÇÃO" \
  "Fulano · Cidade · ciclo de dd/mm a dd/mm/aaaa" \
  "Plano de Ação — Fulano" "Mentoria de distribuição · plano de execução"
```

O `gerar_plano.py` imprime a escala usada, o número de páginas e quanto da
última página foi ocupado.

## Regras do entregável

- Máximo **5 páginas A4**, sem espaço desperdiçado (última página ≥ 85%).
- Margens de impressão enxutas: `14mm` no topo, `11mm` nas laterais e `10mm`
  embaixo — o suficiente para a área imprimível de qualquer impressora comum.
- Plano de execução **agrupado por fase** (`tr.fase`), na ordem em que as ações
  acontecem; dentro de cada fase, ordenadas por prioridade.
- Prioridade nas cores primárias: `td.pr-a` (Alta, verde) e `td.pr-m` (Média, dourado).
- Logo abaixo da faixa de identificação, uma faixa `.campos.q4` com os quatro
  compromissos do ciclo, para o mentorado enxergar o essencial de imediato.
- Ações ordenadas por prioridade, com responsável, prazo, base e status.
- Base: **Definido** (consta na reunião) ou **Proposto** (organizado por
  dependência, precisa de validação).
- Entregar o PDF no chat **e** subir o documento na pasta da reunião no Drive.

## Classes do conteúdo

`.campos` faixa de identificação · `.duas` colunas avançou/travou (`.trava` para
a coluna dourada) · `table.exec` plano de execução · `table.ind` indicadores
(cabeçalho dourado) · `table.etapas` processo de venda · `ol.rot-lista` roteiro ·
`ul.caixa` checklist · `ul.check` diretrizes · `.col2` lista curta em duas colunas ·
`.nota` observação · `.rodape-doc`

## Subir o documento no Drive

O conector do Drive só aceita conteúdo inline, então o PDF binário não sobe.
Gere a versão em HTML com estilos inline e crie o Google Doc com ela:

```bash
python3 doc_html.py corpo.html doc.html "Plano de Ação - Fulano"
```

Depois use `create_file` com `contentMimeType: text/html` na pasta da reunião e
mande para a lixeira a versão anterior do plano, para a pasta ficar só com a atual.
