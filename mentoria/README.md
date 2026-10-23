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
- Ações ordenadas por prioridade, com responsável, prazo, base e status.
- Base: **Definido** (consta na reunião) ou **Proposto** (organizado por
  dependência, precisa de validação).
- Entregar o PDF no chat **e** subir o documento na pasta da reunião no Drive.

## Classes do conteúdo

`.campos` faixa de identificação · `.duas` colunas avançou/travou (`.trava` para
a coluna dourada) · `table.exec` plano de execução · `table.ind` indicadores
(cabeçalho dourado) · `table.etapas` processo de venda · `ol.rot-lista` roteiro ·
`ul.caixa` checklist · `ul.check` diretrizes · `.nota` observação · `.rodape-doc`
