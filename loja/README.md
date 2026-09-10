# Catálogos de produtos

Duas marcas, cada uma com sua página:

| Pasta | Marca | Produtos |
| --- | --- | --- |
| `loja/` (esta) | **aella professional** | 28 produtos em 9 linhas |
| `loja/ghoodess/` | **Ghoodess** | 26 produtos em 6 categorias |

As duas páginas têm a mesma mecânica (filtro, busca, ficha por produto) e cada
uma segue a identidade visual do próprio catálogo. O gerador é compartilhado:
`python3 scripts/gerar.py` gera a Aella e `python3 scripts/gerar.py ghoodess`
gera a Ghoodess. Abaixo, o catálogo da Aella; o da Ghoodess tem README próprio.

# Catálogo aella Professional

Página de catálogo com os **28 produtos** das **9 linhas** da aella professional,
montada a partir do catálogo em PDF da marca. É um catálogo, não uma loja: não
tem preço, carrinho nem checkout.

O visitante pode filtrar por linha, buscar por nome, ativo ou tecnologia, e abrir
a ficha de cada produto com resumo, descrição completa, volume, caixa master,
selos e a tecnologia com os ativos. O rodapé traz onde a distribuição atende:
a loja física em São Borja e as cidades de atendimento mensal.

## Colocar no site (Hostinger Website Builder)

O arquivo a usar é **`embed-hostinger.html`**. Ele é leve (54 KB) porque as fotos
são carregadas direto deste repositório no GitHub, e não vão dentro do código.

1. Abra o editor do site e vá na página **Loja**.
2. Clique em **Adicionar elemento** e escolha **Incorporar código** (*Embed code*).
3. Abra o `embed-hostinger.html`, selecione tudo, copie e cole na caixa do elemento.
   Confirme em **Incorporar código**.
4. Estique o elemento para ficar alto — o catálogo tem uns 2.800 px de altura no
   computador e mais no celular. O que não couber rola dentro do próprio bloco.
5. Clique em **Atualizar site** (publicar).

Pronto. Se o Hostinger reclamar do tamanho do código, ou se as fotos não
aparecerem, veja as alternativas abaixo.

### Se as fotos não carregarem

O `embed-hostinger.html` busca as fotos em
`https://raw.githubusercontent.com/marcelolossalda-cloud/meu-primeiro-pr/claude/product-store-page-7o5bm4/loja/imagens/`.
Isso exige que este repositório continue público e que a branch
`claude/product-store-page-7o5bm4` continue existindo. Se o catálogo for
integrado à branch `main` e a branch de trabalho for apagada, troque o nome da
branch na constante `IMAGENS_URL` de `scripts/gerar.py` e regere.

Alternativa sem dependência externa: **`embed-autocontido.html`** tem as 28 fotos
embutidas dentro do próprio código (733 KB). Funciona em qualquer lugar, mas é
pesado para colar num campo de texto e pode passar do limite do editor.

### Se o site um dia for para o WordPress

O mesmo `embed-hostinger.html` vai num bloco **HTML personalizado**. O WordPress
só preserva `<style>` e `<script>` para quem tem a permissão `unfiltered_html`
(Administrador). A versão `loja.html` serve para quem prefere subir as fotos na
Biblioteca de Mídia: troque a linha `var CAMINHO_IMAGENS = 'imagens/';` pela
pasta de uploads, com a barra no fim.

## Ajustes comuns

**Endereço e cidades do rodapé.** Estão em HTML puro, no trecho
`<footer class="al-rodape">` de `template.html` (ou direto no arquivo que você
colou no site). O link do endereço abre o Google Maps; se mudar o endereço, mude
também o texto depois de `query=` no link.

**Botão de contato.** Vem desligado, para não deixar link quebrado no ar. Para
ligar, preencha a url no começo do `<script>`:

```js
var CONTATO = { rotulo: 'Falar com a gente', url: 'https://wa.me/5554999999999' };
```

O botão passa a aparecer no rodapé e em cada ficha de produto.

**Tema claro ou escuro.** O bloco acompanha o tema do visitante. Se o seu site é
sempre claro, fixe na primeira linha do bloco:

```html
<div class="aella-loja" lang="pt-BR" data-tema="claro">
```

Os valores são `auto` (padrão), `claro` e `escuro`.

**Faixa preta do topo.** Se a página Loja já tem título e a faixa ficar repetitiva,
apague o trecho `<header class="al-marca"> ... </header>`. O resto continua
funcionando.

**Texto de um produto.** Edite `dados.js` e rode `python3 scripts/gerar.py` para
regerar os três arquivos. Cada produto tem um `resumo` (uma linha, aparece no
card e abre a ficha) e uma `descricao` (texto completo da ficha).

**Quantidade de colunas.** A grade mostra 3 produtos por linha em telas estreitas,
4 a partir de 700 px de largura e 5 a partir de 940 px. Isso está nas regras
`.al-grade` do CSS.

Todo o CSS está escopado em `.aella-loja`, então o bloco não interfere no tema do
site nem sofre interferência dele.

## Arquivos

```
dados.js                 os 28 produtos e as 9 linhas — é aqui que se edita conteúdo
template.html            estrutura, CSS e JS da página (inclui o rodapé com endereço)
imagens/                 as 28 fotos recortadas do PDF (.webp)
loja.html                gerado — página completa, usa a pasta imagens/
embed-hostinger.html     gerado — para colar no Hostinger; fotos vêm do GitHub
embed-autocontido.html   gerado — o mesmo, com as fotos embutidas (pesado)
scripts/gerar.py         gera os três arquivos acima a partir de dados.js
scripts/extrair_imagens.py  recorta as fotos do PDF (só é preciso se o PDF mudar)
```

Para regerar tudo do zero:

```bash
python3 scripts/extrair_imagens.py caminho/para/catalogo.pdf   # requer pymupdf, pillow, scipy
python3 scripts/gerar.py
```

## Sobre o conteúdo

Nomes, volumes, caixa master, selos e tecnologias foram transcritos do catálogo
em PDF da marca. As descrições foram reescritas a partir do texto do catálogo
para ficarem mais claras na tela, sem acrescentar nenhuma propriedade que o
catálogo não afirme. Algumas observações:

- **As fotos são de baixa resolução na origem.** Cada página do PDF é uma única
  imagem de 480x270 px, então cada embalagem recortada tem entre 60 e 170 px de
  largura no original. O script amplia 5x em passos, com realce de nitidez e
  fundo limpo para branco puro, e o resultado fica bom no tamanho em que a
  página exibe — mas nenhum tratamento inventa detalhe que não existe. Se a
  Aella fornecer as fotos originais, basta substituir os arquivos em `imagens/`
  mantendo os nomes.
- **A foto da Coloração mostra só a bisnaga.** No PDF ela vem ao lado da caixa;
  a caixa foi cortada fora para ficar igual às outras embalagens.
- **A página 28 do PDF tem o título trocado:** está escrito "Vegan Prime", mas a
  descrição, a embalagem e a ficha são da **Máscara Matize** da linha Home Care.
  Foi cadastrada como Máscara Matize.
- **A linha Ox não tem tecnologia cadastrada.** Diferente das outras páginas, a
  do oxidante não traz o bloco de tecnologia, e o texto impresso no frasco está
  ilegível na resolução do PDF. Ficou só o ativo citado na descrição (Proteína do
  Leite). Se souber o nome da tecnologia, é só acrescentar em `dados.js`.
- **Endereço da loja.** Foi cadastrado como "Rua General Marques, 654 · Centro ·
  São Borja/RS". Se o logradouro for outro (avenida, por exemplo) ou quiser
  acrescentar CEP e telefone, edite o rodapé.

O rodapé credita a marca com o Instagram e o site oficial. O endereço e o
telefone da fábrica, que aparecem na última página do PDF, **não** foram
incluídos.
