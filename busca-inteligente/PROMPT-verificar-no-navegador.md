# Prompt: conferir a busca inteligente no site (Claude no navegador)

> **Para quem é:** para colar na extensão do **Claude no navegador** (Claude in Chrome), com o site **loja.marceloemilene.com** aberto e você já logado.
> **O que faz:** testa se a busca de clientes e produtos sugere enquanto digita e entende o que foi digitado sem acento, em maiúscula ou com erro. Ele **só digita nos campos de busca e observa**: não salva, não finaliza venda e não apaga nada.

---

## PROMPT PRONTO (copie tudo abaixo e cole na extensão)

```
Você vai testar a busca do meu app DistriWork no site https://loja.marceloemilene.com.
Fale comigo em português do Brasil, com palavras simples.

REGRAS (inegociáveis)
- Você só pode navegar, clicar em abas/menus, digitar em campos de BUSCA e observar.
- NUNCA clique em Salvar, Finalizar venda, Excluir, Cancelar venda, Pagar, Enviar ou
  Publicar. Não edite nenhum cadastro.
- Se a página pedir login ou senha, PARE e me peça para entrar. Não digite senha.
- Se algum produto entrar no carrinho do caixa durante o teste, tire-o do carrinho logo
  em seguida (botão de remover o item) e não finalize nada.
- No relatório, não copie CPF, telefone nem endereço de ninguém. Pode citar o nome.

ANTES DE COMEÇAR
Abra https://loja.marceloemilene.com e confirme que estou logado. Olhe o menu e anote
as telas que existem.

TESTE 1 — Clientes
1. Abra a tela Clientes. Na lista, escolha UMA cliente cujo nome tenha acento
   (por exemplo José, Mônica, Conceição, Ávila). Anote o nome como está no cadastro.
2. No campo de busca, digite esse nome SEM acento e TODO EM MAIÚSCULAS, devagar,
   letra por letra.
   - As sugestões aparecem numa lista embaixo do campo ENQUANTO você digita?
   - A cliente aparece? Em que posição?
3. Apague e digite o mesmo nome em minúsculas, sem acento. Aparece igual?
4. Apague e digite só as 4 primeiras letras do nome. Ela já aparece na sugestão?
5. Apague e digite o nome com UMA letra errada (troque uma letra do meio, num nome com
   5 letras ou mais). Ela aparece? Aparece algum aviso como "você quis dizer?"?
6. Se a cliente tiver sobrenome, digite primeiro o sobrenome e depois o nome
   (ex.: "silva jose"). Ela aparece?
7. Com sugestões na tela, aperte a seta para baixo, depois Enter. O que acontece?
   Depois digite de novo e aperte Esc. A lista fecha?
8. Digite algo que não existe, como "xyzw". Aparece um aviso de "nada encontrado"?

TESTE 2 — Produtos
1. Abra a tela de Produtos (ou Estoque). Escolha UM produto com acento no nome
   (ex.: Máscara, Óleo, Líquido) e anote o nome.
2. Digite o nome sem acento e em maiúsculas (ex.: MASCARA). O produto aparece nas
   sugestões enquanto digita?
3. Digite o nome com uma letra faltando (ex.: "progresiva" em vez de "progressiva",
   se existir progressiva; senão, tire uma letra do produto que você escolheu).
   Ele aparece? Com aviso de "você quis dizer?"?
4. Digite só o nome de uma marca: aella, depois ghoodess, depois southliss.
   Aparecem os produtos da marca?

TESTE 3 — Caixa (Vender)
1. Abra a tela Vender (caixa). NÃO finalize nada.
2. No campo de busca de produto, digite um produto com uma letra errada.
   As sugestões aparecem? O produto certo está entre elas?
3. Escolha o produto (clique ou Enter). Ele entra no carrinho? O campo de busca fica
   limpo para o próximo produto?
4. Tire esse produto do carrinho em seguida. Confirme que o carrinho ficou vazio.
5. Se houver campo para escolher a cliente, digite o nome de uma cliente sem acento.
   Ela aparece? NÃO conclua a venda.

TESTE 4 — Outras telas
Em cada tela abaixo que existir, procure um campo de busca e digite o nome de uma
cliente (ou produto) sem acento e em maiúsculas. Anote se acha e se sugere enquanto
digita: Fiado, Boletos, Consultar Vendas, Agenda, Rotas.

TESTE 5 — Celular
Deixe a janela do navegador com cerca de 400 px de largura e repita o passo 2 do
Teste 1.
- A lista de sugestões cabe na tela, sem ficar cortada?
- A página rola para os lados (seria errado) ou só para baixo?

TESTE 6 — Erros
Abra o console do navegador (F12, aba Console) e diga se aparece alguma mensagem de
erro em vermelho durante os testes.

RELATÓRIO FINAL
Me devolva uma tabela assim, uma linha por teste:

| Teste | O que digitei | O que apareceu | Resultado |
|---|---|---|---|
| 1.2 Cliente sem acento e maiúscula | ... | ... | ✅ funcionou / ❌ não funcionou |

Depois, em poucas linhas:
- A busca sugere enquanto digita? Em quais telas sim e em quais não?
- Ignora acento e maiúscula? Aceita erro de digitação?
- O que não funcionou, com o máximo de detalhe (tela, o que digitou, o que apareceu).
- Erros no console: lista, ou "nenhum".
- Confirme que nenhuma venda foi finalizada e que nada foi salvo, editado ou apagado.
```

---

## O que fazer com o resultado

- **Tudo ✅:** a busca inteligente está no ar.
- **Algum ❌:** mande o relatório para o Claude (nesta conversa) que ele prepara a correção para o Claude Code aplicar no `crm-app`.
- **Nenhuma tela sugere enquanto digita:** a busca nova ainda não foi publicada. Rode o `PROMPT-busca-inteligente.md` no Claude Code, na pasta `crm-app`, e publique depois de conferir.

> O teste sem internet (modo avião no celular) a extensão não consegue fazer. Faça você: ligue o modo avião, abra o app instalado no celular e busque uma cliente.
