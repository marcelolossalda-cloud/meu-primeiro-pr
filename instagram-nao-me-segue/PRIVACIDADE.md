# Política de Privacidade — Quem Não Me Segue de Volta

**Última atualização:** 18 de setembro de 2026

## Resumo

Esta extensão **não coleta, não transmite e não vende nenhum dado pessoal**.
Não há servidor, não há cadastro, não há análise de uso, não há anúncios.
Tudo o que ela faz acontece dentro do seu próprio navegador.

## Que dados a extensão acessa

Para comparar suas listas, a extensão lê, **dentro da aba do Instagram já aberta e
autenticada por você**:

- a lista de contas que seguem você;
- a lista de contas que você segue;
- de cada conta dessas listas: nome de usuário, nome de exibição, se é verificada,
  se é privada e o endereço da foto de perfil;
- o seu identificador de usuário do Instagram, obtido do cookie da sessão, apenas
  para saber de qual conta ler as listas.

Como alternativa, a extensão lê os arquivos `followers_*.json` e `following.json`
que **você** seleciona a partir do export oficial "Baixar suas informações" do
Instagram. Nesse modo, nenhuma requisição é feita à internet.

## Onde esses dados ficam

Exclusivamente em `chrome.storage.local`, que é uma área de armazenamento local
do seu navegador, no seu computador. Guardamos:

- o resultado da última análise e o da penúltima, para mostrar o que mudou;
- a sua lista de perfis ignorados;
- suas preferências (ritmo da coleta e ordenação).

Esses dados **nunca saem do seu navegador**. Nós, os autores, não temos acesso a eles.

## Compartilhamento com terceiros

Nenhum. Os dados não são enviados a servidores nossos (não existem), nem a
terceiros, nem a serviços de análise, e não são usados para publicidade,
treinamento de modelos ou qualquer outra finalidade.

A única comunicação de rede que a extensão realiza é com `www.instagram.com`,
o mesmo destino que seu navegador já acessa quando você usa o site — e apenas
para ler as listas descritas acima.

## Como apagar os dados

Desinstalar a extensão remove todo o armazenamento local associado a ela.
Você também pode abrir `chrome://extensions`, clicar em **Detalhes** na extensão,
e usar as opções de limpeza de dados do site.

## Permissões e por que são necessárias

| Permissão | Para quê |
| --------- | -------- |
| `storage` | Guardar o resultado da análise, os ignorados e as preferências no seu computador |
| `scripting` | Injetar o script de leitura na aba do Instagram **apenas quando você clica em "Analisar"** |
| `https://www.instagram.com/*` | Ler as listas de seguidores na aba do Instagram; é o único site que a extensão acessa |

A extensão **não** segue, não deixa de seguir, não bloqueia, não publica, não curte
e não altera nada na sua conta. Ela apenas lê e compara.

## Aviso de marca

Esta extensão é um projeto independente. Não é um produto oficial do Instagram
nem da Meta Platforms, Inc., e não possui vínculo, patrocínio ou endosso dessas
empresas. "Instagram" é marca registrada da Meta Platforms, Inc.

## Contato

Dúvidas sobre esta política: abra uma issue no repositório do projeto.
