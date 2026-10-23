# Busca inteligente do DistriWork

Busca de **clientes e produtos** que sugere enquanto você digita e entende o que foi digitado de qualquer jeito:

| Se você digitar | Ela acha | Por quê |
|---|---|---|
| `joao`, `JOAO`, `João` | João Pedro Martins | Acento, cedilha, maiúscula e minúscula não fazem diferença |
| `progresiva`, `prgressiva` | Progressiva Sem Formol | Aceita erro de digitação (até 1 letra em palavras de 4 a 6 letras, até 2 nas maiores) |
| `desco` | Descolorante Aella DX | Sugere antes de terminar a palavra |
| `silva jose` | José da Silva | Palavras em qualquer ordem |
| `bela vista`, `99999` | A cliente desse salão ou telefone | Procura também nos textos extras |
| `maria conseissao` | Maria da Conceição | Se nada bate com todas as palavras, mostra o que bate com parte delas |

O que bate certinho vem primeiro. O que foi achado por aproximação vem depois, com o aviso "você quis dizer?". Palavras de até 3 letras precisam estar certas, para não sugerir qualquer coisa.

**Experimente:** https://claude.ai/artifact/F5Lg7pvJdzcFMpPnZX5JwU (com nomes e produtos de exemplo).

## Como colocar no app

O DistriWork publicado em **loja.marceloemilene.com** é feito a partir da pasta `Documentos\crm-app` do computador do Marcelo. Abra o **`PROMPT-busca-inteligente.md`** e cole o prompt no Claude Code, dentro dessa pasta. O código e os testes já vão dentro do prompt. O Claude Code só publica no Railway depois da sua confirmação.

## Os arquivos

| Arquivo | O que é |
|---|---|
| `PROMPT-busca-inteligente.md` | **O prompt pronto para o Claude Code**, com o código embutido. É gerado pelo `montar-prompt.py`. |
| `buscaInteligente.ts` | O motor da busca: `normalizar`, `criarIndice`, `buscar`, `sugerir`, `dividirParaDestaque`. Não depende de nenhuma biblioteca e funciona sem internet. |
| `CampoBusca.tsx` | A caixa de busca em React com a lista de sugestões, setas, Enter, Esc e destaque do que bateu. |
| `buscaInteligente.test.ts` | 17 testes do motor da busca. |
| `CampoBusca.test.tsx` | 6 testes da caixa de busca (digitação, teclado, clique, destaque). |
| `demonstracao.src.html` / `demonstracao.html` | A página de demonstração. O `.html` final leva o motor já embutido. |
| `PROMPT-modelo.md` / `montar-prompt.py` | O modelo do prompt e o script que embute o código nele. |

## Para quem for mexer no código

```bash
# Testes do motor (Node 22 ou mais novo)
node --experimental-strip-types --test busca-inteligente/buscaInteligente.test.ts

# Depois de mudar o código, monte o prompt de novo
python3 busca-inteligente/montar-prompt.py

# E remonte a demonstração (precisa do esbuild)
npx esbuild busca-inteligente/buscaInteligente.ts --bundle --format=iife --global-name=BuscaInteligente --target=es2019 --minify --outfile=busca.min.js
# depois troque /*BUSCA_JS*/ no demonstracao.src.html pelo conteúdo de busca.min.js e salve como demonstracao.html
```

Os testes do `CampoBusca.test.tsx` precisam de React, Testing Library e jsdom. No app, rode-os do jeito que o projeto já testa os componentes.
