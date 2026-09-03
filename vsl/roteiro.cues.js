/* ------------------------------------------------------------------
   MINI-VSL — CAIXA RÁPIDO 7 DIAS  ·  versão 2
   Fonte única do roteiro. Alimenta o player (vsl/index.html), o
   teleprompter, as legendas (legendas.srt / .vtt) e a narração.

   Rode `node vsl/build.js` depois de editar este arquivo.
   Depois `python3 vsl/trilha.py` (os tempos mudam, a trilha acompanha).

   O que mudou da v1 para cá:
   - abre numa cena concreta (a cliente que comprou shampoo no mercado)
     em vez de uma tese sobre o mercado — identificação nos 10s iniciais
   - abre um ciclo logo no começo ("existe um custo que quase ninguém
     calcula") e só fecha na conta do bloco 2
   - a conta virou micro-compromisso: quem assiste calcula o próprio
     número, em vez de receber um número pronto
   - as duas objeções que travam a compra (tempo e "não sei vender")
     entram antes do preço, não depois
   - fechamento em duas estradas, não em resumo

   Campos:
     t  texto da legenda / narração (até ~10 palavras)
     s  id da cena (define o visual)
     p  pausa em segundos DEPOIS da fala
     b  rótulo do bloco (só na primeira fala de cada bloco)
   ------------------------------------------------------------------ */

const CUES = [
  // BLOCO 1 — A CENA QUE SE REPETE
  { b: 'Bloco 1 — A cena que se repete', s: 'cadeira', t: 'Ontem uma cliente saiu do seu salão' },
  { s: 'cadeira', t: 'com o cabelo impecável.', p: 0.6 },
  { s: 'mercado', t: 'No caminho de casa, ela passou no mercado.' },
  { s: 'mercado', t: 'E comprou um shampoo de doze reais.', p: 0.5 },
  { s: 'mercado', t: 'Que vai desmanchar o seu trabalho em duas semanas.', p: 1.2 },

  { s: 'cadeira', t: 'Você viu o cabelo dela na cadeira.' },
  { s: 'cadeira', t: 'Sabia exatamente o que ela precisava levar.', p: 0.7 },
  { s: 'silencio', t: 'E não falou nada.', p: 1.5 },

  { s: 'silencio', t: 'Não foi por falta de conhecimento técnico.' },
  { s: 'silencio', t: 'Disso você tem de sobra.', p: 0.6 },
  { s: 'silencio', t: 'Foi porque ninguém nunca te ensinou como falar' },
  { s: 'silencio', t: 'sem se sentir uma vendedora chata.', p: 1.1 },

  { s: 'abertura', t: 'Essa cena se repete em milhares de salões no Brasil.' },
  { s: 'abertura', t: 'Todo dia. E quase ninguém fala sobre ela em voz alta.', p: 0.8 },
  { s: 'abertura', t: 'Ela tem um custo.' },
  { s: 'abertura', t: 'Um custo que quase nenhuma profissional calcula.', p: 1.0 },

  { s: 'promessa', t: 'Nos próximos minutos eu vou te mostrar' },
  { s: 'promessa', t: 'como calcular o seu.' },
  { s: 'promessa', t: 'E o método de 7 dias que fecha esse vazamento.', p: 1.4 },

  // BLOCO 2 — POR QUE O CAIXA NÃO FECHA
  { b: 'Bloco 2 — Por que o caixa não fecha', s: 'rotina', t: 'Antes, repare no seu próprio mês.', p: 0.5 },
  { s: 'rotina', t: 'A agenda enche.' },
  { s: 'rotina', t: 'Você fica oito, dez, doze horas em pé.' },
  { s: 'rotina', t: 'O corpo cansa.', p: 0.9 },

  { s: 'caixa', t: 'E no dia 30 você abre o caixa.' },
  { s: 'caixa', t: 'O número não corresponde ao esforço.', p: 1.5 },

  { s: 'nao-e-voce', t: 'Se isso está acontecendo com você, presta atenção agora:' },
  { s: 'nao-e-voce', t: 'O problema não é você.', p: 1.3 },
  { s: 'nao-e-voce', t: 'Você não é devagar.' },
  { s: 'nao-e-voce', t: 'Você não é ruim de atendimento.' },
  { s: 'nao-e-voce', t: 'E não precisa se dedicar mais — você já se dedica demais.', p: 1.0 },

  { s: 'vazamento', t: 'O problema é estrutural.' },
  { s: 'vazamento', t: 'Está na forma como o dinheiro entra dentro de um salão.' },
  { s: 'vazamento', t: 'É ela que faz a profissional mais talentosa da rua' },
  { s: 'vazamento', t: 'faturar menos que a concorrente do lado.', p: 1.2 },

  { s: 'conselhos', t: 'Quando o faturamento trava,' },
  { s: 'conselhos', t: 'o mercado dá sempre os mesmos quatro conselhos.' },
  { s: 'conselhos', t: '"Poste mais no Instagram."', p: 0.3 },
  { s: 'conselhos', t: '"Faça promoção."', p: 0.3 },
  { s: 'conselhos', t: '"Baixe o preço."', p: 0.3 },
  { s: 'conselhos', t: '"Trabalhe mais horas."', p: 0.9 },

  { s: 'pressuposto', t: 'Repare no que os quatro têm em comum.' },
  { s: 'pressuposto', t: 'Todos partem do mesmo pressuposto:' },
  { s: 'pressuposto', t: 'que o seu problema é falta de cliente.', p: 0.7 },
  { s: 'pressuposto', t: 'Na maioria dos salões, não é.', p: 1.5 },

  { s: 'ja-entrou', t: 'O dinheiro que falta no seu caixa' },
  { s: 'ja-entrou', t: 'já entrou pela porta do salão hoje.' },
  { s: 'ja-entrou', t: 'E saiu sem ser aproveitado.', p: 1.2 },

  { s: 'calculo', t: 'Faz uma conta comigo, de cabeça.', p: 0.7 },
  { s: 'calculo', t: 'Quantas clientes você atendeu essa semana?', p: 0.9 },
  { s: 'calculo', t: 'Agora pensa em quantas saíram sem levar nada.', p: 1.0 },
  { s: 'calculo', t: 'Multiplica por quatro semanas.' },
  { s: 'calculo', t: 'Depois por doze meses.', p: 1.2 },
  { s: 'calculo', t: 'Esse número é o seu vazamento.', p: 1.5 },

  { s: 'todo-mes', t: 'E ele não acontece uma vez.' },
  { s: 'todo-mes', t: 'Acontece em cada cadeira, todo dia.', p: 0.6 },
  { s: 'todo-mes', t: 'Não é um mês perdido. É todo mês.' },
  { s: 'todo-mes', t: 'É o ano inteiro.', p: 1.3 },

  { s: 'causa', t: 'E a causa não é falta de esforço.' },
  { s: 'causa', t: 'É falta de método de conversa.', p: 1.5 },

  // BLOCO 3 — O QUE OS SALÕES QUE FATURAM BEM FAZEM
  { b: 'Bloco 3 — O que os salões que faturam bem fazem', s: 'descoberta', t: 'Agora a parte boa.', p: 0.5 },
  { s: 'descoberta', t: 'Quando você olha os salões que faturam bem' },
  { s: 'descoberta', t: 'sem aumentar a jornada,' },
  { s: 'descoberta', t: 'aparece sempre a mesma estrutura.' },
  { s: 'descoberta', t: 'Três movimentos, na mesma ordem.', p: 1.0 },

  { s: 'pilar-1', t: 'Primeiro: atrair.', p: 0.4 },
  { s: 'pilar-1', t: 'Ações simples, de custo zero, para trazer clientes novas.' },
  { s: 'pilar-1', t: 'Sem depender de sorte, sem depender de algoritmo.', p: 0.8 },

  { s: 'pilar-2', t: 'Segundo: aproveitar.', p: 0.4 },
  { s: 'pilar-2', t: 'Um novo olhar durante o atendimento.' },
  { s: 'pilar-2', t: 'Enxergar, em cada cliente que senta na cadeira,' },
  { s: 'pilar-2', t: 'a oportunidade que já está ali, esperando ser nomeada.', p: 0.8 },

  { s: 'pilar-3', t: 'Terceiro: vender naturalmente.', p: 0.4 },
  { s: 'pilar-3', t: 'Transformar o que você viu em recomendação.' },
  { s: 'pilar-3', t: 'Que soa como cuidado profissional,' },
  { s: 'pilar-3', t: 'não como empurrão de vendedora.', p: 1.5 },

  { s: 'balde', t: 'A imagem é simples.', p: 0.5 },
  { s: 'balde', t: 'A maioria tenta encher um balde furado' },
  { s: 'balde', t: 'colocando mais água dentro.' },
  { s: 'balde', t: 'Mais cliente. Mais hora. Mais promoção.', p: 0.9 },
  { s: 'balde', t: 'Esse método faz o contrário.' },
  { s: 'balde', t: 'Ele tampa os furos primeiro.', p: 0.7 },
  { s: 'balde', t: 'Aí sim, cada litro que entra, fica.', p: 1.2 },

  { s: 'margem', t: 'É por isso que funciona onde a promoção falha.' },
  { s: 'margem', t: 'Promoção traz movimento e leva a sua margem junto.' },
  { s: 'margem', t: 'Isso aqui aumenta o valor de cada atendimento' },
  { s: 'margem', t: 'que você já faz hoje.', p: 1.4 },

  // BLOCO 4 — O DESAFIO DE 7 DIAS
  { b: 'Bloco 4 — O desafio de 7 dias', s: 'produto', t: 'A forma prática de aplicar isso' },
  { s: 'produto', t: 'se chama Caixa Rápido — Desafio de 7 Dias.', p: 0.7 },
  { s: 'produto', t: 'São 7 dias. 7 missões.' },
  { s: 'produto', t: 'Uma por dia, para executar dentro do salão,' },
  { s: 'produto', t: 'no meio da sua rotina normal.', p: 0.9 },

  { s: 'dias', t: 'Dia 1: você define a sua meta.', p: 0.2 },
  { s: 'dias', t: 'Dia 2: as ações para atrair.', p: 0.2 },
  { s: 'dias', t: 'Dia 3: enxergar as oportunidades na cadeira.', p: 0.2 },
  { s: 'dias', t: 'Dia 4: a venda natural.', p: 0.2 },
  { s: 'dias', t: 'Dia 5: home care.', p: 0.2 },
  { s: 'dias', t: 'Dia 6: respostas prontas para "está caro" e "vou pensar".', p: 0.2 },
  { s: 'dias', t: 'Dia 7: o seu plano de vendas, para continuar rodando depois.', p: 1.0 },

  { s: 'bonus', t: 'E vêm dois bônus junto.' },
  { s: 'bonus', t: 'O treinamento de ChatGPT para comunicação e vendas:' },
  { s: 'bonus', t: 'divulgação, legenda e mensagem de WhatsApp em minutos.' },
  { s: 'bonus', t: 'E o acesso ao app USALON 30D.', p: 1.3 },

  { s: 'objecoes', t: 'Talvez você esteja pensando: eu não tenho tempo.', p: 0.6 },
  { s: 'objecoes', t: 'Cada missão cabe entre um atendimento e outro.', p: 0.9 },
  { s: 'objecoes', t: 'Ou então: eu não sei vender.' },
  { s: 'objecoes', t: 'Esse é exatamente o ponto de partida do método.', p: 1.3 },

  { s: 'conta-fria', t: 'Agora, a conta fria.', p: 0.5 },
  { s: 'conta-fria', t: 'Uma única indicação de home care que você não fez hoje.' },
  { s: 'conta-fria', t: 'Multiplique por trinta dias.' },
  { s: 'conta-fria', t: 'Depois por doze meses.', p: 1.0 },
  { s: 'conta-fria', t: 'Esse é o custo de não fazer nada.', p: 1.3 },

  { s: 'preco', t: 'O acesso completo, com os dois bônus,' },
  { s: 'preco', t: 'é um pagamento único de 97 reais.', p: 1.4 },

  // BLOCO 5 — A DECISÃO
  { b: 'Bloco 5 — A decisão', s: 'cta', t: 'Clique no botão aqui embaixo' },
  { s: 'cta', t: 'e garanta o seu acesso por 97 reais.' },
  { s: 'cta', t: 'Pagamento único, pela Hotmart.', p: 0.9 },

  { s: 'garantia', t: 'E você não precisa decidir agora.' },
  { s: 'garantia', t: 'São 7 dias de garantia.' },
  { s: 'garantia', t: 'Entre, aplique as primeiras missões no seu salão,' },
  { s: 'garantia', t: 'e observe o que acontece no seu caixa.' },
  { s: 'garantia', t: 'Se não fizer sentido, peça o reembolso dentro do prazo,' },
  { s: 'garantia', t: 'conforme as condições da Hotmart.', p: 0.9 },

  { s: 'risco', t: 'O risco de testar é zero.', p: 0.9 },
  { s: 'risco', t: 'O risco de continuar exatamente como está,' },
  { s: 'risco', t: 'você já conhece.' },
  { s: 'risco', t: 'Ele volta todo dia 30.', p: 1.6 },

  { s: 'fecho', t: 'Daqui a sete dias, duas coisas podem ser verdade.' },
  { s: 'fecho', t: 'Ou a semana passou igual a todas as outras.' },
  { s: 'fecho', t: 'Ou você terminou o desafio com um plano na mão.', p: 1.1 },
  { s: 'fecho', t: 'Talento você já tem.', p: 0.8 },
  { s: 'fecho', t: 'O que falta é estratégia.', p: 1.0 },
  { s: 'fecho', t: 'Clique no botão e comece hoje.', p: 2.0 },
];

if (typeof module !== 'undefined' && module.exports) module.exports = CUES;
