/* ------------------------------------------------------------------
   MINI-VSL — CAIXA RÁPIDO 7 DIAS
   Fonte única do roteiro. Alimenta o player (vsl/index.html),
   as legendas (legendas.srt / legendas.vtt) e o texto de narração.

   Rode `node vsl/build.js` depois de editar este arquivo.

   Campos de cada fala:
     t      texto da legenda / narração (mantenha até ~10 palavras)
     s      id da cena (define o visual de fundo)
     p      pausa em segundos DEPOIS da fala (respiração do roteiro)
     b      rótulo do bloco (só na primeira fala de cada bloco)
   ------------------------------------------------------------------ */

const CUES = [
  // BLOCO 1 — O LEAD: O PADRÃO OCULTO
  { b: 'Bloco 1 — O padrão oculto', s: 'abertura', t: 'Existe um padrão que se repete' },
  { s: 'abertura', t: 'em milhares de salões de beleza no Brasil.' },
  { s: 'abertura', t: 'E quase ninguém fala sobre ele em voz alta.', p: 0.8 },

  { s: 'rotina', t: 'A profissional acorda cedo.' },
  { s: 'rotina', t: 'Fica oito, dez, doze horas em pé.' },
  { s: 'rotina', t: 'Atende uma cliente atrás da outra.' },
  { s: 'rotina', t: 'A agenda até enche.', p: 0.5 },
  { s: 'rotina', t: 'O corpo cansa.', p: 0.8 },

  { s: 'caixa', t: 'E aí, no fim do mês, ela abre o caixa.' },
  { s: 'caixa', t: 'E o número não corresponde ao esforço.', p: 1.6 },

  { s: 'atencao', t: 'Se isso está acontecendo com você,' },
  { s: 'atencao', t: 'preste muita atenção no que eu vou dizer agora:', p: 0.6 },
  { s: 'nao-e-voce', t: 'O problema não é você.', p: 1.2 },

  { s: 'nao-e-voce', t: 'Você não é devagar.' },
  { s: 'nao-e-voce', t: 'Você não é ruim de atendimento.' },
  { s: 'nao-e-voce', t: 'E você definitivamente não precisa se dedicar mais —' },
  { s: 'nao-e-voce', t: 'você já se dedica demais.', p: 0.9 },

  { s: 'vazamento', t: 'O que existe aqui é uma falha estrutural' },
  { s: 'vazamento', t: 'na forma como o dinheiro entra dentro de um salão.' },
  { s: 'vazamento', t: 'Uma falha invisível.' },
  { s: 'vazamento', t: 'É ela que faz a profissional mais talentosa da rua' },
  { s: 'vazamento', t: 'faturar menos que a concorrente do lado.', p: 0.8 },

  { s: 'promessa', t: 'Nos próximos minutos, eu vou te mostrar' },
  { s: 'promessa', t: 'exatamente onde está esse vazamento.' },
  { s: 'promessa', t: 'E o método prático de 7 dias que foi criado para fechá-lo.', p: 1.4 },

  // BLOCO 2 — O DIAGNÓSTICO
  { b: 'Bloco 2 — O diagnóstico', s: 'diagnostico', t: 'Vamos ao diagnóstico.', p: 0.6 },
  { s: 'conselhos', t: 'Quando o faturamento trava,' },
  { s: 'conselhos', t: 'o mercado sempre dá os mesmos quatro conselhos.' },
  { s: 'conselhos', t: '"Poste mais no Instagram."', p: 0.3 },
  { s: 'conselhos', t: '"Faça promoção."', p: 0.3 },
  { s: 'conselhos', t: '"Baixe o preço."', p: 0.3 },
  { s: 'conselhos', t: '"Trabalhe mais horas."', p: 0.9 },

  { s: 'pressuposto', t: 'Repare no que essas quatro receitas têm em comum.' },
  { s: 'pressuposto', t: 'Todas elas partem do mesmo pressuposto:' },
  { s: 'pressuposto', t: 'que o seu problema é falta de cliente.', p: 0.7 },
  { s: 'pressuposto', t: 'Na maioria dos casos, não é.', p: 1.5 },

  { s: 'ja-entrou', t: 'A maioria das profissionais ignora um fato desconfortável.' },
  { s: 'ja-entrou', t: 'O dinheiro que está faltando no seu caixa' },
  { s: 'ja-entrou', t: 'já entrou pela porta do salão hoje.' },
  { s: 'ja-entrou', t: 'E saiu sem ser aproveitado.', p: 1.0 },

  { s: 'cadeira', t: 'Pense na cliente que sentou na sua cadeira essa semana.', p: 0.5 },
  { s: 'cadeira', t: 'Você viu o fio quebrado.' },
  { s: 'cadeira', t: 'Você sabia exatamente qual produto ela precisava levar para casa.' },
  { s: 'cadeira', t: 'Você sabia que ela ia sair dali' },
  { s: 'cadeira', t: 'e comprar qualquer coisa no mercado.' },
  { s: 'cadeira', t: 'Algo que ia estragar o seu trabalho em duas semanas.', p: 0.8 },

  { s: 'silencio', t: 'E você não falou nada.', p: 1.4 },
  { s: 'silencio', t: 'Não foi por falta de conhecimento técnico.' },
  { s: 'silencio', t: 'Disso você tem de sobra.', p: 0.7 },
  { s: 'silencio', t: 'Você não falou porque ninguém nunca te ensinou' },
  { s: 'silencio', t: 'como falar sem se sentir uma vendedora chata.', p: 1.0 },

  { s: 'causa', t: 'Essa é a causa real.' },
  { s: 'causa', t: 'Não é falta de esforço.' },
  { s: 'causa', t: 'É falta de método de conversa.', p: 1.2 },

  { s: 'todo-mes', t: 'E aqui está a parte que ninguém te conta:' },
  { s: 'todo-mes', t: 'enquanto isso continuar,' },
  { s: 'todo-mes', t: 'cada dia de trabalho é um dia de dinheiro deixado na cadeira.', p: 0.6 },
  { s: 'todo-mes', t: 'Não é um mês perdido.' },
  { s: 'todo-mes', t: 'É todo mês.' },
  { s: 'todo-mes', t: 'É o ano inteiro.', p: 1.6 },

  // BLOCO 3 — A SOLUÇÃO: O MECANISMO ÚNICO
  { b: 'Bloco 3 — O mecanismo único', s: 'descoberta', t: 'Agora, a descoberta.', p: 0.6 },
  { s: 'descoberta', t: 'Quando você analisa os salões que faturam bem' },
  { s: 'descoberta', t: 'sem aumentar a jornada,' },
  { s: 'descoberta', t: 'aparece uma estrutura em comum.' },
  { s: 'descoberta', t: 'Três movimentos. Sempre na mesma ordem.', p: 1.0 },

  { s: 'pilar-1', t: 'Primeiro: ATRAIR.', p: 0.4 },
  { s: 'pilar-1', t: 'Ações simples, de custo zero,' },
  { s: 'pilar-1', t: 'para despertar interesse e trazer clientes novas.' },
  { s: 'pilar-1', t: 'Sem depender de sorte e sem depender de algoritmo.', p: 0.8 },

  { s: 'pilar-2', t: 'Segundo: APROVEITAR.', p: 0.4 },
  { s: 'pilar-2', t: 'Um novo olhar durante o atendimento.' },
  { s: 'pilar-2', t: 'Aprender a enxergar, em cada cliente que senta na cadeira,' },
  { s: 'pilar-2', t: 'a oportunidade que já está ali.' },
  { s: 'pilar-2', t: 'Visível. Esperando só para ser nomeada.', p: 0.8 },

  { s: 'pilar-3', t: 'Terceiro: VENDER NATURALMENTE.', p: 0.4 },
  { s: 'pilar-3', t: 'Transformar essa observação técnica em uma recomendação.' },
  { s: 'pilar-3', t: 'De serviço, de produto ou de home care.' },
  { s: 'pilar-3', t: 'Que soa como cuidado profissional.' },
  { s: 'pilar-3', t: 'Não como empurrão de vendedora.', p: 1.5 },

  { s: 'balde', t: 'A metáfora é simples.', p: 0.5 },
  { s: 'balde', t: 'A maioria das profissionais tenta encher um balde furado' },
  { s: 'balde', t: 'colocando mais água dentro.' },
  { s: 'balde', t: 'Mais cliente. Mais hora. Mais promoção.', p: 0.7 },
  { s: 'balde', t: 'Esse método faz o contrário.' },
  { s: 'balde', t: 'Ele tampa os furos primeiro.' },
  { s: 'balde', t: 'Aí sim, cada litro que entra, fica.', p: 1.2 },

  { s: 'margem', t: 'É por isso que ele funciona onde a promoção falha.' },
  { s: 'margem', t: 'Promoção traz movimento e leva a sua margem junto.' },
  { s: 'margem', t: 'Isso aqui aumenta o valor de cada atendimento' },
  { s: 'margem', t: 'que você já faz hoje.', p: 1.4 },

  // BLOCO 4 — A OFERTA
  { b: 'Bloco 4 — A oferta', s: 'produto', t: 'A forma prática de aplicar essa estrutura se chama' },
  { s: 'produto', t: 'Caixa Rápido — Desafio de 7 Dias.', p: 0.7 },
  { s: 'produto', t: 'São 7 dias. 7 missões.' },
  { s: 'produto', t: 'Uma por dia, para executar dentro do salão,' },
  { s: 'produto', t: 'no meio da sua rotina normal.', p: 0.9 },

  { s: 'dias', t: 'Dia 1: você define a sua meta.', p: 0.2 },
  { s: 'dias', t: 'Dia 2: ações para atrair.', p: 0.2 },
  { s: 'dias', t: 'Dia 3: enxergar as oportunidades na cadeira.', p: 0.2 },
  { s: 'dias', t: 'Dia 4: a venda natural.', p: 0.2 },
  { s: 'dias', t: 'Dia 5: home care.', p: 0.2 },
  { s: 'dias', t: 'Dia 6: respostas prontas para "está caro" e "vou pensar".', p: 0.2 },
  { s: 'dias', t: 'Dia 7: o seu plano de vendas,' },
  { s: 'dias', t: 'pronto para continuar rodando depois que o desafio acabar.', p: 1.0 },

  { s: 'bonus', t: 'E vêm dois bônus incluídos.' },
  { s: 'bonus', t: 'O treinamento de ChatGPT para comunicação e vendas,' },
  { s: 'bonus', t: 'para você criar divulgação, legenda' },
  { s: 'bonus', t: 'e mensagem de WhatsApp em minutos.' },
  { s: 'bonus', t: 'E o acesso ao app USALON 30D.', p: 1.5 },

  { s: 'conta-fria', t: 'Agora, a conta fria.', p: 0.6 },
  { s: 'conta-fria', t: 'Uma única indicação de home care que você não fez hoje.' },
  { s: 'conta-fria', t: 'Multiplique por trinta dias.' },
  { s: 'conta-fria', t: 'Depois por doze meses.', p: 1.0 },
  { s: 'conta-fria', t: 'Esse é o custo de não fazer nada.', p: 1.2 },

  { s: 'preco', t: 'O acesso completo ao desafio, com os dois bônus,' },
  { s: 'preco', t: 'é um pagamento único de 97 reais.', p: 1.4 },

  // BLOCO 5 — FECHAMENTO
  { b: 'Bloco 5 — Fechamento', s: 'cta', t: 'Clique no botão aqui embaixo' },
  { s: 'cta', t: 'e garanta o seu acesso por 97 reais.' },
  { s: 'cta', t: 'Pagamento único, pela Hotmart.', p: 0.9 },

  { s: 'garantia', t: 'E olha: você não precisa decidir nada hoje.' },
  { s: 'garantia', t: 'Você tem 7 dias de garantia.' },
  { s: 'garantia', t: 'Entre, aplique as primeiras missões dentro do seu salão,' },
  { s: 'garantia', t: 'e observe o que acontece no seu caixa.' },
  { s: 'garantia', t: 'Se não fizer sentido para você,' },
  { s: 'garantia', t: 'é só pedir o reembolso dentro do prazo,' },
  { s: 'garantia', t: 'conforme as condições da Hotmart.', p: 0.8 },

  { s: 'risco', t: 'O risco de testar é zero.', p: 0.9 },
  { s: 'risco', t: 'O risco de continuar exatamente como está,' },
  { s: 'risco', t: 'você já conhece.' },
  { s: 'risco', t: 'Ele aparece todo dia 30.', p: 1.6 },

  { s: 'fecho', t: 'Talento você já tem.', p: 0.8 },
  { s: 'fecho', t: 'O que falta é estratégia.', p: 1.0 },
  { s: 'fecho', t: 'Clique no botão e comece hoje.', p: 2.0 },
];

if (typeof module !== 'undefined' && module.exports) module.exports = CUES;
