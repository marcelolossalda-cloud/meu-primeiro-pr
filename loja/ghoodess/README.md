# Catálogo Ghoodess

Segunda marca do catálogo, com a mesma mecânica da página da Aella (filtro por
categoria, busca, ficha por produto) e a identidade visual da Ghoodess: fundo
cinza-prata, dourado metálico nos títulos e tipografia geométrica leve, como no
catálogo impresso. **26 produtos** em **6 categorias**.

## Colocar no site (Hostinger Website Builder)

Igual ao catálogo da Aella: na página desejada, **Adicionar elemento** →
**Incorporar código** → cole o conteúdo de `embed-hostinger.html` → estique o
elemento → **Atualizar site**. O passo a passo completo está no README da
pasta `loja/`.

As fotos vêm deste repositório no GitHub (pasta `loja/ghoodess/imagens/`). A
alternativa sem dependência externa é `embed-autocontido.html`, com as fotos
embutidas (mais pesado).

## Arquivos

```
dados.js                 os 26 produtos e as 6 categorias — é aqui que se edita conteúdo
template.html            estrutura, CSS e JS da página Ghoodess
imagens/                 as 26 fotos (.webp), recortadas do PDF
loja.html                gerado — página completa, usa a pasta imagens/
embed-hostinger.html     gerado — para colar no Hostinger; fotos vêm do GitHub
embed-autocontido.html   gerado — o mesmo, com as fotos embutidas
scripts/extrair_imagens.py  recorta as fotos do PDF (só se o PDF mudar)
```

Para regerar: `python3 scripts/extrair_imagens.py catalogo.pdf` (dentro desta
pasta) e depois, na pasta `loja/`, `python3 scripts/gerar.py ghoodess`.

## Sobre o conteúdo

- **Descrições e benefícios são o texto do próprio PDF**, que tem camada de
  texto selecionável. Os resumos de uma linha foram escritos a partir deles.
- **As fotos têm boa resolução.** Para vários produtos o PDF traz a foto da
  embalagem já recortada com transparência; para os demais, a foto editorial
  foi recortada na região do produto (por isso algumas incluem parte da modelo,
  como no catálogo).
- **Categorias** são uma organização para o filtro (o PDF não agrupa em linhas):
  Descoloração & Oxidação, Alinhamento, Tratamento, Finalização, Couro Cabeludo
  & Limpeza e Coloração. Cada produto mostra também o nome da sua linha
  (Original, Reparagy, Nescuihair…), que é o que está impresso na embalagem.
- **Volumes** foram lidos das embalagens nas fotos. Onde não deu para ler com
  segurança (água oxigenada, kits home care, Herbal), o campo ficou vazio.
- **Os kits home care** (Original, Reparagy, Nescuihair, Blond Repair) não têm
  texto próprio no PDF; a ficha traz a descrição da linha e a lista de itens
  que aparece na foto.
- **A cartela de cores da Collors** (página 34 do PDF) entrou como lista de
  famílias e a tabela de proporção e tempo de pausa, na ficha do produto.
- O e-mail e o telefone da última página são o contato da marca, não o seu,
  e **não** foram incluídos. O rodapé repete os dados da distribuição em São
  Borja, Itaqui, Santiago e São Luiz Gonzaga.
