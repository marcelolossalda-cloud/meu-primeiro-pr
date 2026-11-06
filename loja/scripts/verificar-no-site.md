# Prompt de verificação do site (extensão do navegador)

Cole o texto abaixo na extensão do Claude no Chrome. Ele só navega e relata:
não altera, não publica e não edita nada.

A primeira parte descobre o que existe no site hoje; a segunda confere se os
catálogos funcionam. Se os catálogos ainda não estiverem publicados, a parte 1
já responde isso e a parte 2 é pulada.

---

Você vai inspecionar o site marceloemilene.com e me devolver um relatório.
Apenas navegue e observe: não altere nada, não publique nada, não entre no
editor do site. Se alguma tela pedir login ou confirmar alteração, pare e me
avise. Não invente nada: se não conseguir ver algo, escreva "não consegui ver".

## PARTE 1 — O que existe hoje

1. Abra https://marceloemilene.com/ . A página abriu? Se deu erro, qual?
2. Liste TODOS os itens do menu do site, na ordem, com o endereço para onde
   cada um leva (passe o mouse ou clique e veja a barra de endereço).
3. Existe algum item chamado Loja? E Ghoodess? E Cursos?
4. Abra cada um desses que existir e descreva em duas linhas o que aparece:
   é um catálogo de produtos com fotos, é uma página vazia, é outra coisa?
5. Teste estes endereços, um por um, e diga o que acontece em cada
   (abre normalmente / erro 404 / não existe / redireciona para outro lugar):
   - https://loja.marceloemilene.com/
   - https://curso.marceloemilene.com/
   - https://kuceracademy.marceloemilene.com/

## PARTE 2 — Se houver catálogo publicado, confira

Faça esta parte só nas páginas onde você viu um catálogo de produtos.

**Catálogo com duas marcas (esperado na aba Loja):**
- Aparecem duas abas internas, "aella Professional" e "Ghoodess"?
- Na aella, quantos produtos aparecem? O certo é 28.
- Alguma foto fica em branco ou quebrada?
- Clique no filtro "Home Care": quantos sobram? O certo é 9.
- Digite "pantenol" na busca: quantos sobram? O certo é 17.
- Limpe a busca, clique em "Todos", clique no primeiro produto.
  A ficha abre perto do produto clicado e visível na tela, ou abre longe,
  obrigando a rolar para achar? Descreva onde ela apareceu. Isto é o mais
  importante do teste.
- A tecla Esc fecha a ficha?
- Troque para a aba interna Ghoodess: quantos produtos? O certo é 26.

**Catálogo só da Ghoodess (esperado na aba Ghoodess):**
- Aparecem 26 produtos, sem abas internas?
- As fotos carregam? Um filtro e a busca funcionam?
- Clique num produto e confirme que a ficha abre visível.

**No celular:** reduza a janela para cerca de 400 px de largura e volte ao
catálogo.
- Os produtos ficam três por linha?
- Os filtros viram uma faixa que rola de lado, em vez de ocupar várias linhas?
- A página rola para os lados? (rolar para os lados é defeito)

**Console:** abra o console (F12, aba Console) e diga se aparece erro em
vermelho enquanto navega.

## Relatório final

Responda exatamente neste formato:

- Site abriu: [sim / não, com o erro]
- Itens do menu: [nome → endereço, um por linha]
- Aba Loja: [existe? o que tem nela?]
- Aba Ghoodess: [existe? o que tem nela?]
- Aba Cursos: [existe? para onde leva?]
- loja.marceloemilene.com: [o que aconteceu]
- curso.marceloemilene.com: [o que aconteceu]
- kuceracademy.marceloemilene.com: [o que aconteceu]
- Catálogo publicado em algum lugar: [sim, onde / não]
- Contagens obtidas: [aella __ de 28, Home Care __ de 9, pantenol __ de 17,
  Ghoodess __ de 26, ou "não testado"]
- Posição da ficha do produto: [descrição do que viu]
- Celular: [o que observou]
- Erros no console: [lista ou "nenhum"]
- Problemas encontrados: [lista objetiva ou "nenhum"]

Para cada problema, descreva o que apareceu na tela, não o que você imagina ser
a causa. Se um número não bater com o esperado, diga o número que apareceu.
