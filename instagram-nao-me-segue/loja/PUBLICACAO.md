# Guia de publicação na Chrome Web Store

Tudo que o formulário do painel de desenvolvedor pede, já preenchido. É copiar e colar.

Painel: <https://chrome.google.com/webstore/devconsole>

---

## 1. Pacote

Envie o arquivo **`quem-nao-me-segue-loja-v1.1.0.zip`** (gerado na raiz do projeto).
Ele contém só o que a extensão precisa para rodar — sem README, sem scripts de build,
sem as imagens da loja.

---

## 2. Aba "Informações da loja"

**Nome**
```
Quem Não Me Segue de Volta
```

**Descrição breve** (limite de 132 caracteres — este tem 99)
```
Veja quem você segue e não te segue de volta. Roda 100% no navegador, sem login e sem enviar dados.
```

**Descrição detalhada**
```
Descubra em segundos quem você segue e não te segue de volta.

A extensão compara a sua lista de seguidores com a lista de quem você segue e
mostra as diferenças, organizadas em quatro listas:

• Não me seguem — você segue, a pessoa não retribui
• Não sigo — te seguem e você ainda não seguiu de volta
• Mútuos — seguimento recíproco
• Saíram — quem deixou de te seguir desde a sua última análise

COMO FUNCIONA

Basta estar logado no Instagram no navegador e clicar em "Analisar minha conta".
A leitura acontece na aba que você já tem aberta, com pausas entre as requisições
para não sobrecarregar o serviço. Você pode fechar a janelinha: quando terminar,
o total aparece no ícone da extensão.

Prefere não conectar? A extensão também lê o arquivo de "Baixar suas informações"
do próprio Instagram. Nesse modo ela não faz nenhuma requisição à internet.

PRIVACIDADE DE VERDADE

Não existe servidor, cadastro, anúncio ou rastreamento. Tudo é processado e
guardado no seu computador. Nós não temos acesso a nada.

ELA NÃO MEXE NA SUA CONTA

A extensão apenas lê e compara. Nunca segue, deixa de seguir, bloqueia, curte
ou publica. O botão ✕ ao lado de um perfil só o esconde da lista.

TAMBÉM TEM

• Busca por usuário ou nome
• Exportação em CSV e cópia da lista de @
• Lista de ignorados, para tirar da conta perfis que você não quer acompanhar
• Modo tela cheia, com mais colunas
• Tema claro e escuro automáticos

Projeto independente. Não é um produto oficial do Instagram nem da Meta
Platforms, Inc. "Instagram" é marca registrada da Meta Platforms, Inc.
```

**Categoria:** Redes sociais e comunicação
**Idioma:** Português (Brasil)

**Capturas de tela** (1280×800, já no formato exigido), nesta ordem:
1. `loja-1-resultado.png`
2. `loja-2-inicio.png`
3. `loja-3-saidas.png`

---

## 3. Aba "Práticas de privacidade"

**Finalidade única** (campo obrigatório)
```
Comparar a lista de seguidores da própria conta do usuário no Instagram com a
lista de contas que ele segue, e exibir as diferenças. A extensão apenas lê e
compara dados que já pertencem ao usuário; não realiza nenhuma ação na conta.
```

**Justificativa de cada permissão**

`storage`
```
Guardar no computador do usuário o resultado da última análise, a lista de
perfis que ele escolheu ignorar e suas preferências de ritmo e ordenação, para
que ele possa reabrir a extensão sem precisar analisar de novo. Nenhum desses
dados é transmitido.
```

`scripting`
```
Injetar o script de leitura na aba do Instagram apenas quando o usuário clica
em "Analisar minha conta". A injeção sob demanda evita que a extensão execute
código em qualquer página sem a ação explícita do usuário.
```

`https://www.instagram.com/*` (permissão de host)
```
As listas de seguidores só podem ser lidas a partir da origem
www.instagram.com, usando a sessão que o próprio usuário já tem autenticada no
navegador. Este é o único site que a extensão acessa.
```

**Usa código remoto?** Não. Todo o código JavaScript está dentro do pacote; a
extensão não carrega scripts de fora e não usa `eval`.

**Coleta de dados do usuário:** marque que **não coleta**. O Google define coleta
como transmitir dados para fora do dispositivo — esta extensão não transmite nada:
tudo fica em `chrome.storage.local`.

Marque as três declarações finais de conformidade (não vender dados, não usar para
finalidade alheia, não usar para avaliação de crédito).

**URL da política de privacidade:** obrigatório. Use o arquivo `PRIVACIDADE.md`
deste projeto. Duas formas rápidas de deixá-lo público:
- fazer merge deste branch e usar o link do arquivo no GitHub; ou
- colar o conteúdo em um Gist público (<https://gist.github.com>) e usar essa URL.

---

## 4. Antes de enviar, saiba dos riscos

Sendo direto, para você não perder tempo nem dinheiro de anúncio em cima de algo
que pode cair:

1. **O Instagram não tem API pública de seguidores.** O modo "Analisar agora" usa
   os endpoints internos do site, o que contraria os Termos de Uso da Meta. A
   Chrome Web Store já removeu extensões dessa categoria mediante reclamação do
   detentor da marca. O modo de importação do export oficial não tem esse problema
   — se a revisão implicar, ele é o argumento de defesa.
2. **Marca registrada.** Por isso o nome não contém "Instagram", o ícone deixou de
   usar o gradiente da marca, e o disclaimer aparece na extensão, na descrição e na
   política. Não use o logotipo da Meta em nenhuma imagem.
3. **Revisão inicial** costuma levar de alguns dias a algumas semanas, e extensões
   que pedem permissão de host em site popular caem com mais frequência na fila
   de revisão manual.
4. **Se for rejeitada**, o e-mail informa o item da política. Dá para corrigir e
   reenviar sem pagar de novo — a taxa de US$ 5 é única e cobre até 20 extensões.
