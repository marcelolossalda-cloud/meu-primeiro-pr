# Quem Não Me Segue de Volta

Extensão para Chrome (Manifest V3) que mostra **quem você segue no Instagram e não te segue de volta** — além de quem te segue e você não segue, e os mútuos.

Tudo roda dentro do seu navegador. Nenhum dado sai da máquina, não há servidor, conta ou login na extensão.

## Como instalar

1. Baixe/clone esta pasta (`instagram-nao-me-segue`).
2. Abra `chrome://extensions` no Chrome (ou Edge/Brave).
3. Ligue o **Modo do desenvolvedor** no canto superior direito.
4. Clique em **Carregar sem compactação** e escolha a pasta `instagram-nao-me-segue`.
5. Fixe a extensão na barra e clique no ícone.

## Como usar

### Opção 1 — Analisar agora (rápido)

Abra o `instagram.com` e faça login. Clique no ícone da extensão e em **Analisar minha conta**.
A extensão usa a sessão que já está aberta no navegador para ler as listas, com pausas entre
as requisições. A barra mostra o progresso e o tempo estimado.

Contas grandes levam mais tempo: o ritmo *Normal* lê cerca de 50 perfis a cada 1–2 segundos
(≈ 1 minuto para cada 2.000 seguidores).

Ritmos disponíveis:

| Ritmo    | Pausa entre páginas | Quando usar                                   |
| -------- | ------------------- | --------------------------------------------- |
| Devagar  | 2,4 – 4,2 s         | contas grandes ou depois de levar um bloqueio |
| Normal   | 1,2 – 2,4 s         | padrão                                        |
| Rápido   | 0,5 – 1,1 s         | contas pequenas, com pressa                   |

### Opção 2 — Importar os dados (sem risco nenhum)

O próprio Instagram deixa você baixar seus dados:

1. **Configurações → Central de contas → Suas informações e permissões → Baixar suas informações**
2. Peça em formato **JSON** (a seção "Seguidores e seguindo" já basta)
3. Quando o e-mail chegar, baixe o `.zip` e solte na extensão

A extensão lê o `.zip` direto (descompacta no navegador, sem biblioteca externa) ou os
`followers_1.json` / `following.json` soltos. Também aceita a versão HTML do export.

## O que a tela mostra

- **Não te seguem de volta** — você segue, a pessoa não segue você
- **Você não segue de volta** — te seguem e você não retribui
- **Mútuos** — seguimento recíproco
- **Ignorados** — perfis que você escondeu das outras abas (o ✕ ao lado de cada um)

Em todas as abas dá para buscar por usuário/nome, ordenar, abrir o perfil, **exportar CSV**
e **copiar a lista de @**. O botão ⤢ no topo abre a mesma tela em uma aba cheia, com mais colunas.

## Como funciona por dentro

```
manifest.json          Manifest V3: permissões storage + scripting, host só em instagram.com
src/content.js         injetado sob demanda na aba do Instagram; pagina os endpoints
                       /api/v1/friendships/<id>/followers/ e /following/ usando os cookies
                       da sua própria sessão, com jitter, retry e backoff em caso de 429
src/background.js      service worker: acha/abre a aba, injeta o script e guarda o progresso
                       em chrome.storage (o popup pode fechar sem interromper a coleta)
src/lib/unzip.js       leitor de ZIP em ~100 linhas usando DecompressionStream nativo
src/lib/parse-export.js  entende os JSON/HTML de "Baixar suas informações"
src/lib/csv.js         exportação CSV com BOM (abre certo no Excel)
popup/                 interface: telas de início, progresso e resultado
```

O resultado fica em `chrome.storage.local` (chave `lastResult`), então reabrir o popup mostra
a última análise sem precisar coletar de novo.

## Decisões de interface

A tela foi revisada aplicando *Enviesados — Psicologia e Vieses Cognitivos no Design*
(Rian Dutra, 2022), que trata vieses como algo a usar **a favor** de quem usa o produto,
nunca como armadilha. O que entrou:

| Princípio do livro | O que virou na tela |
| ------------------ | ------------------- |
| **Ancoragem** — a primeira informação vira a referência de tudo que vem depois | O resultado abre com um placar grande: o número da lista aberta, antes de qualquer dado de serviço |
| **Aversão à perda** — o medo pesa o dobro do ganho, e aliviá-lo é uma abordagem legítima | Três garantias antes do clique ("só leitura", "nada sai do navegador", "pode parar no meio") e a legenda de que o ✕ apenas esconde |
| **Efeito cashless** — quanto menos tangível o custo, menor o atrito | Aqui o custo é tempo: a coleta roda em segundo plano, o popup pode fechar e o total aparece no ícone da extensão quando termina |
| **Custo afundado / comprometimento** — as pessoas valorizam o que construíram e progresso retém | Cada análise guarda a anterior, e a tela mostra quem deixou de te seguir e quantos seguidores novos chegaram desde então |

O que ficou **de fora de propósito**, porque o livro classifica como padrão obscuro:
contagem regressiva falsa, aviso de escassez inventado, confirmação envergonhada
("quero perder essa oportunidade") e qualquer atrito artificial para desistir.

Na mesma linha, cancelar no meio **não salva** um resultado parcial, e uma coleta que
vier incompleta é marcada com aviso: meia lista acusaria como "não te segue" alguém que
te segue — e um número errado é pior do que número nenhum.

## Avisos

- O Instagram **não tem API pública** para ler seguidores; a coleta ao vivo usa os mesmos
  endpoints internos do site. Uso automatizado contraria os Termos de Uso da plataforma e,
  em excesso, pode gerar limitação temporária ("Tente novamente mais tarde") na sua conta.
  Por isso os ritmos são conservadores. **Em caso de dúvida, use a importação do export** —
  ela é oficial e não faz requisição nenhuma.
- A extensão não segue, deixa de seguir nem bloqueia ninguém: ela só lê e compara.
- Se for publicar na Chrome Web Store, revise o nome e os ícones: "Instagram" é marca
  registrada da Meta e a loja rejeita extensões que sugiram vínculo oficial.

## Publicar na Chrome Web Store

Os textos do formulário, as justificativas de permissões e as capturas em 1280×800
estão prontos em [`loja/PUBLICACAO.md`](loja/PUBLICACAO.md). A política de privacidade
exigida pela loja está em [`PRIVACIDADE.md`](../instagram-nao-me-segue/PRIVACIDADE.md).

Para reduzir o risco de rejeição por marca registrada, o nome não contém "Instagram",
o ícone usa paleta própria (índigo/azul, não o gradiente da Meta) e o aviso de projeto
independente aparece na extensão, na descrição e na política.

## Desenvolvimento

Não há build: é JavaScript puro com módulos ES. Edite e clique em **Atualizar** em
`chrome://extensions`.

Para regenerar os ícones a partir do gerador (PNG escrito na mão, sem dependências):
`python3 tools/gen_icons.py`
