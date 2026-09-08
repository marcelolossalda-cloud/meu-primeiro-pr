# Catálogo aella Professional

Página de catálogo com os **28 produtos** das **9 linhas** da aella professional,
montada a partir do catálogo em PDF da marca. É um catálogo, não uma loja: não
tem preço, carrinho nem checkout.

O visitante pode filtrar por linha, buscar por nome, ativo ou tecnologia, e abrir
a ficha de cada produto com a descrição completa, volume, caixa master, selos e a
tecnologia com os ativos.

## Colocar no WordPress

Na página **Loja**, adicione um bloco **HTML personalizado** e cole o conteúdo de
um dos dois arquivos:

| Arquivo | Quando usar | Tamanho |
| --- | --- | --- |
| `wordpress-bloco.html` | **Mais simples.** As 28 fotos vão embutidas no próprio bloco: cola e funciona, sem subir imagem nenhuma. | ~520 KB |
| `loja.html` | Mais leve para o visitante. Exige subir a pasta `imagens/` na Biblioteca de Mídia e apontar o caminho (veja abaixo). | ~47 KB + 355 KB de imagens |

Depois de colar, publique a página. Não é preciso instalar plugin.

> O bloco usa `<style>` e `<script>`. O WordPress só preserva essas tags para
> quem tem a permissão `unfiltered_html` — na prática, Administrador (e Editor,
> em site único). Se você colar com um usuário de permissão menor, o WordPress
> remove o CSS e o JS e a página aparece quebrada.

### Usando `loja.html` com a Biblioteca de Mídia

1. Suba os 28 arquivos de `imagens/` na Biblioteca de Mídia.
2. Abra a imagem de qualquer produto e copie o endereço do arquivo. Ele será algo
   como `https://marceloemilene.com/wp-content/uploads/2026/09/rx-liquid-mask.webp`.
3. No `loja.html`, troque a linha:

   ```js
   var CAMINHO_IMAGENS = 'imagens/';
   ```

   pela pasta de uploads, com a barra no fim:

   ```js
   var CAMINHO_IMAGENS = 'https://marceloemilene.com/wp-content/uploads/2026/09/';
   ```

   Os nomes dos arquivos precisam continuar os mesmos. Se o WordPress renomear
   algum no upload (acrescentando `-1`, por exemplo), ajuste o nome no arquivo.

## Ajustes comuns

Tudo o que costuma mudar está no começo do `<script>`, logo antes dos dados.

**Botão de contato.** Vem desligado, para não deixar link quebrado no ar. Para
ligar, preencha a url:

```js
var CONTATO = { rotulo: 'Falar com a gente', url: 'https://wa.me/5554999999999' };
```

O botão passa a aparecer no rodapé e em cada ficha de produto.

**Tema claro ou escuro.** O bloco acompanha o tema do visitante. Se o seu site é
sempre claro, fixe na primeira linha do bloco:

```html
<div class="aella-loja" data-tema="claro">
```

Os valores são `auto` (padrão), `claro` e `escuro`.

**Faixa preta do topo.** Se a página Loja já tem título e a faixa ficar repetitiva,
apague o trecho `<header class="al-marca"> ... </header>`. O resto continua
funcionando.

**Texto de um produto.** Edite `dados.js` e rode `python3 scripts/gerar.py` para
regerar os dois arquivos.

Todo o CSS está escopado em `.aella-loja`, então o bloco não interfere no tema do
site nem sofre interferência dele.

## Arquivos

```
dados.js                 os 28 produtos e as 9 linhas — é aqui que se edita conteúdo
template.html            estrutura, CSS e JS da página
imagens/                 as 28 fotos recortadas do PDF (.webp)
loja.html                gerado — versão que usa a pasta imagens/
wordpress-bloco.html     gerado — versão autocontida para colar no WordPress
scripts/gerar.py         gera os dois arquivos acima a partir de dados.js
scripts/extrair_imagens.py  recorta as fotos do PDF (só é preciso se o PDF mudar)
```

Para regerar tudo do zero:

```bash
python3 scripts/extrair_imagens.py caminho/para/catalogo.pdf   # requer pymupdf, pillow, scipy
python3 scripts/gerar.py
```

## Sobre o conteúdo

Nomes, descrições, volumes, caixa master, selos e tecnologias foram transcritos
do catálogo em PDF da marca. Três observações:

- **As fotos são de baixa resolução.** Cada página do PDF é uma única imagem de
  480x270 px, então cada embalagem recortada tem entre 60 e 170 px de largura
  no original — foram ampliadas 4x para uso na web. Ficam boas no tamanho em que
  a página as exibe, mas não aguentam ampliação maior. Se a Aella fornecer as
  fotos originais, basta substituir os arquivos em `imagens/` mantendo os nomes.
- **A página 28 do PDF tem o título trocado:** está escrito "Vegan Prime", mas a
  descrição, a embalagem e a ficha são da **Máscara Matize** da linha Home Care.
  Foi cadastrada como Máscara Matize.
- **A linha Ox não tem tecnologia cadastrada.** Diferente das outras páginas, a
  do oxidante não traz o bloco de tecnologia, e o texto impresso no frasco está
  ilegível na resolução do PDF. Ficou só o ativo citado na descrição (Proteína do
  Leite). Se souber o nome da tecnologia, é só acrescentar em `dados.js`.

O rodapé credita a marca com o Instagram e o site oficial. O endereço e o
telefone que aparecem na última página do PDF **não** foram incluídos — são o
contato da fábrica, não o seu. Use o `CONTATO` acima para pôr o seu.
