# Agente DistriWork — Copiloto de Vendas

Base de conhecimento para o agente de IA do aplicativo **DistriWork** (Work Distri), da World Cosméticos. Ela foi montada a partir dos livros de **vendas, persuasão, comunicação, atendimento ao cliente e administração** da pasta "Livros" do Google Drive do Marcelo, mais os resumos, roteiros, scripts e pesquisas dele.

## Os arquivos

| Arquivo | Para quê | Onde colocar no app |
|---|---|---|
| **`DistriWork-Agente-Completo.md`** | **O documento principal.** Junta as instruções, o mapa de perguntas, as regras da loja, o método de venda, a cobrança, as ofertas, as promoções, o conteúdo, a empatia, as mensagens prontas, o aprendizado e as fichas dos livros. | Como **base de conhecimento** do agente (arquivo de conhecimento ou "documento-base"). |
| `instrucoes-curtas.md` | A versão resumida das instruções, para campos com limite de caracteres. | No campo de **instruções / prompt / personalidade** do agente, se o completo não couber. |
| `memoria-de-aprendizado.md` | O caderno de aprendizados: aprovados, provisórios, descartados e perguntas frequentes. | Também como **conhecimento**. Atualize toda sexta-feira. |
| `guia-tecnico-aprendizado.md` | Um prompt pronto para o Claude Code ligar a memória de aprendizado dentro do app, caso o agente ainda não tenha. | Não vai para o agente. Use no Claude Code, na pasta `crm-app`. |

## Passo a passo para colocar no DistriWork

1. Abra a configuração do agente no app.
2. No campo de **instruções**, cole a Parte A do documento completo (ou o arquivo `instrucoes-curtas.md`, se houver limite de tamanho).
3. Em **arquivos de conhecimento** (ou no lugar equivalente), suba `DistriWork-Agente-Completo.md` e `memoria-de-aprendizado.md`.
4. Faça um teste com estas perguntas:
   - "A Carla disse que tá caro o kit de progressiva."
   - "/cobrar boleto de R$ 300 atrasado há 5 dias"
   - "/promocao estoque parado de descolorante"
   - "/post loiro que amarela"
5. Responda às pendências marcadas com **[CONFIRMAR]** na Parte 1.8 do documento completo. Elas são preços, condições e benefícios que o agente não pode inventar.
6. Toda sexta-feira, peça `/revisar` ao agente e aprove ou descarte os aprendizados da semana.

## Como manter atualizado

- **Mudou um preço ou uma regra da loja?** Edite a Parte 1 do documento completo e suba de novo.
- **Algo funcionou ou não funcionou?** Diga ao agente `/aprendi ...`. Na sexta-feira, você aprova.
- **Livro novo?** Peça para incluir na Parte 16 e no método da parte certa (venda, cobrança, oferta, promoção ou conteúdo).
