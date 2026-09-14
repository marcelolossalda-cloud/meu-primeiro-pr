/* ==========================================================================
   CATÁLOGO AELLA PROFESSIONAL — dados dos produtos
   Transcritos e reescritos a partir do catálogo em PDF da marca.
   Para editar um produto, altere os campos abaixo. Nada mais precisa mudar.

     resumo     linha curta que aparece no card e abre a ficha
     descricao  texto completo, exibido na ficha do produto
   ========================================================================== */

const LINHAS = {
  rx:  { nome: 'Reconstrução',   cor: '#E1002F',
         resumo: 'Restitui a fibra capilar desgastada por química, coloração, descoloração e alisamentos.' },
  fx:  { nome: 'Finalização',    cor: '#00A98F',
         resumo: 'Finaliza e complementa os processos feitos pelo profissional. Também pode ser usada pelo cliente em casa.' },
  nx:  { nome: 'Nutrição',       cor: '#F2B705',
         resumo: 'Devolve "peso" ao cabelo com carga maior de nutrientes, óleos graxos, manteigas e anti-frizz.' },
  dx:  { nome: 'Descolorante',   cor: '#2E5FD9',
         resumo: 'Pós descolorantes com ativos nobres, para clarear a melanina natural ou artificial hidratando os fios.' },
  ox:  { nome: 'Oxidante',       cor: '#4C8DE0',
         resumo: 'Emulsões reveladoras para ativar a coloração oxidante e o pó descolorante.' },
  cx:  { nome: 'Coloração',      cor: '#1A1A1C',
         resumo: 'Portfólio de 40 cores de coloração e 7 tons de tonalizante, com fórmula exclusiva.' },
  lx:  { nome: 'Liss',           cor: '#EE7623',
         resumo: 'Reposição de massa, redução de volume e alinhamento das cutículas.' },
  vx:  { nome: 'Tratamento',     cor: '#35B44A',
         resumo: 'Tratamento restaurador vegano para cabelos rebeldes, volumosos e com frizz.' },
  hc:  { nome: 'Home Care',      cor: '#7E4CA6',
         resumo: 'O profissionalismo do salão levado para a casa do cliente.' },
};

const PRODUTOS = [
  {
    slug: 'rx-shampoo-restauracao-profunda', linha: 'rx',
    nome: 'Shampoo de Restauração Profunda',
    volume: '970 ml',
    resumo:
      'Limpa de forma equilibrada enquanto repara a fibra capilar. Sem sal, corantes ou ' +
      'parabenos.',
    descricao:
      'Shampoo hidratante e reparador para uso no salão. Limpa os fios de forma equilibrada e ' +
      'remove as impurezas enquanto auxilia a reparar e restaurar a fibra capilar. A ' +
      'combinação de Pantenol e Blend de Aminoácidos tem ação revitalizante, hidratante e ' +
      'reparadora, e deixa os fios maleáveis e com brilho. Livre de sal (cloreto de sódio), ' +
      'corantes e parabenos.',
    tecnologia: 'Amino Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'rx-mascara-reconstrucao-profunda', linha: 'rx',
    nome: 'Máscara de Reconstrução Profunda',
    volume: '970 g',
    resumo: 'Hidratação intensa que devolve maciez e facilita o desembaraço.',
    descricao:
      'Máscara de hidratação intensa que deixa os fios extremamente macios e sedosos, ' +
      'facilitando o pentear e o desembaraçar. Pantenol, Blend de Aminoácidos e Óleo de Ojon ' +
      'somam ação hidratante, reparadora e nutritiva: os fios ficam sedosos, maleáveis e mais ' +
      'fáceis de desembaraçar, saudáveis e com brilho intenso. Livre de corantes e parabenos.',
    tecnologia: 'Amino Ojon Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol', 'Óleo de Ojon'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'rx-leave-in-hidra-frizz', linha: 'rx',
    nome: 'Leave-in Multifuncional Hidra Frizz',
    volume: '135 ml',
    resumo: 'Dez benefícios em um só passo: hidrata, controla o frizz e protege do calor.',
    descricao:
      'Leave-in finalizador indicado para todos os tipos de cabelo. Hidrata, facilita o ' +
      'pentear, combate o frizz e restaura o brilho e a maciez. Pantenol, Blend de ' +
      'Aminoácidos e Óleo de Amla e Girassol dão propriedades hidratantes e restauradoras, e ' +
      'os fios ficam revitalizados, macios e com brilho absoluto. Contém protetor térmico e ' +
      'filtro solar.',
    beneficios: [
      'Hidratação intensa',
      'Brilho, maciez e sedosidade',
      'Redução de volume',
      'Reparação',
      'Melhora a penteabilidade',
      'Antifrizz',
      'Revitalização',
      'Desembaraça',
      'Proteção térmica',
      'Filtro solar'
    ],
    tecnologia: 'Amino Ojon Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol', 'Óleo de Amla e Girassol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'rx-liquid-mask', linha: 'rx',
    nome: 'Liquid Mask',
    subtitulo: 'Potencializador de tratamento',
    volume: '135 ml',
    resumo: 'Máscara líquida ultraconcentrada, de ação nutritiva instantânea.',
    descricao:
      'Máscara líquida ultraconcentrada, de ação instantânea nutritiva, hidratante e ' +
      'emoliente, desenvolvida para todos os tipos de cabelo. Os Óleos de Argan, Jojoba e ' +
      'Amla promovem hidratação profunda, desembaraço e ação nutritiva e antifrizz, com ' +
      'sedosidade, maciez e brilho intenso. Livre de parabenos.',
    tecnologia: '4 Oil\'s Blend',
    ativos: ['Óleo de jojoba', 'Argan', 'Amla', 'Girassol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'fx-reconstrutor-essencial', linha: 'fx',
    nome: 'Reconstrutor Essencial',
    volume: '250 ml',
    resumo: 'Fluido finalizador com protetor térmico e filtro solar, para brilho intenso.',
    descricao:
      'Fluido finalizador e hidratante de uso essencial, que promove proteção e brilho ' +
      'intenso aos cabelos. Ômega Plus e Pantenol dão propriedades hidratantes e protetoras, ' +
      'deixando os fios revitalizados, macios e com brilho absoluto. Contém protetor térmico ' +
      'e filtro solar. Livre de parabenos.',
    tecnologia: 'Amino Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol', 'Ômega Plus', 'Filtro solar capilar'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'fx-perfect-liss', linha: 'fx',
    nome: 'Perfect Liss',
    volume: '135 ml',
    resumo: 'Fluido termoativado que prolonga o liso e reduz o frizz na escova e na chapinha.',
    descricao:
      'Fluido termoativado que prolonga o efeito do liso e também o dos cachos temporários, ' +
      'reduzindo o frizz com maciez e brilho intenso. As Proteínas de Colágeno e Seda e o ' +
      'Pantenol têm ação reparadora e hidratante: facilitam o deslizamento da escova sobre os ' +
      'fios e realinham as cutículas, o que diminui o frizz e deixa os cabelos macios e ' +
      'maleáveis. Protege do calor do secador e da chapinha e contém filtro solar. Livre de ' +
      'parabenos.',
    tecnologia: 'Protein Complex',
    ativos: ['Pantenol', 'Proteína da seda', 'Colágeno'],
    selos: ['Não testado em animais', 'Livre de parabenos e corante'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'fx-serum', linha: 'fx',
    nome: 'Sérum',
    volume: '60 ml',
    resumo: 'Sela as pontas ressecadas e previne pontas duplas com reposição lipídica.',
    descricao:
      'Sérum hidratante e doador de brilho, desenvolvido com Ômega Plus para repor lipídios ' +
      'ricos em ômegas. Sela e fortalece as pontas ressecadas e devolve brilho, maciez e ' +
      'vitalidade aos fios. O uso regular do produto previne a formação de pontas duplas. ' +
      'Contém filtro solar. Livre de parabenos.',
    tecnologia: '5 Oil\'s',
    ativos: ['Complexo Ômega Plus', 'Filtro solar capilar'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'nx-shampoo-nutricao-intensiva', linha: 'nx',
    nome: 'Shampoo de Nutrição Intensiva',
    volume: '970 ml',
    resumo: 'Limpeza gentil e nutritiva, com fito extratos de frutas vermelhas.',
    descricao:
      'Shampoo desembaraçante e nutritivo, indicado para todos os tipos de cabelo. Limpa ' +
      'gentilmente e deixa os fios mais saudáveis, sem ressecar. Os Fito Extratos de Frutas ' +
      'Vermelhas e o Pantenol têm ação revitalizante e hidratante, e proporcionam ' +
      'maleabilidade, leveza, toque sedoso e brilho renovado. Livre de sal (cloreto de ' +
      'sódio), corantes e parabenos.',
    tecnologia: 'Nutrition Force',
    ativos: ['Complexo de cereja', 'Morango', 'Pitanga', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'nx-mascara-nutricao', linha: 'nx',
    nome: 'Máscara de Nutrição',
    volume: '250 g',
    resumo: 'Nutrição intensa que combate o ressecamento sem pesar nos fios.',
    descricao:
      'Máscara de nutrição intensa que repõe lipídios ricos em ômegas e combate o ' +
      'ressecamento dos fios, deixando os cabelos mais saudáveis, leves e com movimento. ' +
      'Ômega Plus, Proteína do Trigo, Pantenol e Fito Extratos de Frutas Vermelhas somam ação ' +
      'emoliente, reparadora e nutritiva: alinham os fios e facilitam o desembaraçamento, ' +
      'resultando em cabelos macios, sedosos e com brilho intenso. Livre de parabenos.',
    tecnologia: 'Nutrition Force',
    ativos: ['Complexo frutas vermelhas', 'Pantenol', 'Ômega Plus', 'Proteína do trigo'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'dx-po-descolorante-blue', linha: 'dx',
    nome: 'Pó Descolorante Blue',
    volume: '500 g',
    resumo: 'Clareia por igual e neutraliza o alaranjado. Dust Free, não levanta pó.',
    descricao:
      'Clareia os fios de forma uniforme e neutraliza os tons alaranjados durante o processo ' +
      '— perfeito para quem busca um loiro incrível. A fórmula exclusiva com Óleo de Avelã, ' +
      'Óleo de Coco e Extrato de Aloe Vera protege a integridade da fibra capilar durante o ' +
      'clareamento, e a tecnologia Dust Free não levanta pó e facilita o preparo com o ' +
      'oxidante. Pode ser usado em todas as técnicas de clareamento dos fios, garantindo um ' +
      'loiro bonito e saudável.',
    tecnologia: 'Blonde Platinum',
    ativos: ['Óleo de avelã', 'Óleo de coco', 'Extrato de aloe vera'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'dx-po-descolorante-white', linha: 'dx',
    nome: 'Pó Descolorante White',
    volume: '500 g',
    resumo: 'Descoloração rápida com ativos de tratamento. Dust Free, dispersa fácil no oxidante.',
    descricao:
      'Fórmula desenvolvida com ativos de tratamento e proteção que preservam a integridade ' +
      'da fibra capilar durante a descoloração. Rápido, eficaz e suavemente perfumado, não ' +
      'levanta pó (Dust Free) e se dispersa facilmente na água oxigenada, formando uma ' +
      'emulsão cremosa com excelente desempenho em clareamento, reflexos ou mechas, sem ' +
      'danificar o fio. Pantenol, Silicone e Óleo de Argan agem como um poderoso hidratante ' +
      'de efeito prolongado e formam um filme protetor que atenua de forma notável a ação de ' +
      'produtos agressivos e irritantes sobre a pele.',
    tecnologia: 'Hidra Flash',
    ativos: ['Pantenol', 'Silicone', 'Óleo de argan'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'ox-06-volumes', linha: 'ox',
    nome: 'Emulsão Reveladora 06 Volumes',
    volume: '900 ml',
    resumo: 'Emulsão reveladora cremosa, enriquecida com proteína do leite.',
    descricao:
      'Emulsão cremosa oxidante, suavemente perfumada, contendo peróxido de hidrogênio. ' +
      'Indicada para ativar a coloração oxidante e o pó descolorante. A cremosidade e a ' +
      'consistência facilitam a mistura com a massa da coloração e a dispersão do pó ' +
      'descolorante — use sempre na proporção indicada no modo de usar da coloração ou do pó. ' +
      'Confere proteção e tratamento cosmético simultâneos, de hidratação e emoliência, ' +
      'enquanto potencializa a ação da coloração e do descolorante. A fórmula enriquecida com ' +
      'Proteína do Leite proporciona maior resistência, flexibilidade e maciez aos cabelos.',
    ativos: ['Proteína do leite'],
    selos: ['Livre de corante e parabenos', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'ox-20-volumes', linha: 'ox',
    nome: 'Emulsão Reveladora 20 Volumes',
    volume: '900 ml',
    resumo: 'Emulsão reveladora cremosa, enriquecida com proteína do leite.',
    descricao:
      'Emulsão cremosa oxidante, suavemente perfumada, contendo peróxido de hidrogênio. ' +
      'Indicada para ativar a coloração oxidante e o pó descolorante. A cremosidade e a ' +
      'consistência facilitam a mistura com a massa da coloração e a dispersão do pó ' +
      'descolorante — use sempre na proporção indicada no modo de usar da coloração ou do pó. ' +
      'Confere proteção e tratamento cosmético simultâneos, de hidratação e emoliência, ' +
      'enquanto potencializa a ação da coloração e do descolorante. A fórmula enriquecida com ' +
      'Proteína do Leite proporciona maior resistência, flexibilidade e maciez aos cabelos.',
    ativos: ['Proteína do leite'],
    selos: ['Livre de corante e parabenos', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'ox-30-volumes', linha: 'ox',
    nome: 'Emulsão Reveladora 30 Volumes',
    volume: '900 ml',
    resumo: 'Emulsão reveladora cremosa, enriquecida com proteína do leite.',
    descricao:
      'Emulsão cremosa oxidante, suavemente perfumada, contendo peróxido de hidrogênio. ' +
      'Indicada para ativar a coloração oxidante e o pó descolorante. A cremosidade e a ' +
      'consistência facilitam a mistura com a massa da coloração e a dispersão do pó ' +
      'descolorante — use sempre na proporção indicada no modo de usar da coloração ou do pó. ' +
      'Confere proteção e tratamento cosmético simultâneos, de hidratação e emoliência, ' +
      'enquanto potencializa a ação da coloração e do descolorante. A fórmula enriquecida com ' +
      'Proteína do Leite proporciona maior resistência, flexibilidade e maciez aos cabelos.',
    ativos: ['Proteína do leite'],
    selos: ['Livre de corante e parabenos', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'ox-40-volumes', linha: 'ox',
    nome: 'Emulsão Reveladora 40 Volumes',
    volume: '900 ml',
    resumo: 'Emulsão reveladora cremosa, enriquecida com proteína do leite.',
    descricao:
      'Emulsão cremosa oxidante, suavemente perfumada, contendo peróxido de hidrogênio. ' +
      'Indicada para ativar a coloração oxidante e o pó descolorante. A cremosidade e a ' +
      'consistência facilitam a mistura com a massa da coloração e a dispersão do pó ' +
      'descolorante — use sempre na proporção indicada no modo de usar da coloração ou do pó. ' +
      'Confere proteção e tratamento cosmético simultâneos, de hidratação e emoliência, ' +
      'enquanto potencializa a ação da coloração e do descolorante. A fórmula enriquecida com ' +
      'Proteína do Leite proporciona maior resistência, flexibilidade e maciez aos cabelos.',
    ativos: ['Proteína do leite'],
    selos: ['Livre de corante e parabenos', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'cx-coloracao', linha: 'cx',
    nome: 'Coloração Cx',
    subtitulo: '40 cores · 7 tonalizantes',
    volume: '60 g',
    resumo: '40 cores de coloração e 7 tons de tonalizante, com fórmula exclusiva.',
    descricao:
      'Portfólio de 40 cores de coloração, desenvolvido para atender a todas as necessidades ' +
      'que o mercado procura. São feitas com uma fórmula exclusiva e tecnologia de ponta. ' +
      'Entre os tonalizantes, a linha conta com 7 tons diferentes.',
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '72 unidades'
  },
  {
    slug: 'cx-luster-up-tonalize', linha: 'cx',
    nome: 'Luster Up Tonalize',
    subtitulo: 'Emulsão tonalizante e hidratante',
    volume: '900 ml',
    resumo: 'Revitaliza e prolonga a cor, com ação antioxidante e antiporosidade.',
    descricao:
      'Formulação suave e hidratante que preserva a estrutura dos fios sem danificá-los. ' +
      'Revitaliza e intensifica a beleza da cor, contribuindo para sua uniformidade e ' +
      'durabilidade. A ação antioxidante e antiporosidade melhora a fixação e a retenção dos ' +
      'pigmentos sobre os fios, para um resultado perfeito e duradouro, com brilho ' +
      'excepcional. São dois ativos combinados: o Óleo de girassol, rico em ômega 9, tem ação ' +
      'antioxidante, protege a fibra contra os agentes externos e melhora a permeação dos ' +
      'pigmentos durante e depois do processo de coloração; a tecnologia exclusiva Pro Soy ' +
      'tem alto poder de hidratação e emoliência e protege os fios do ressecamento com ação ' +
      'formadora de filme, para uma perfeita manutenção e beleza da cor.',
    tecnologia: 'Luster Up',
    ativos: ['Óleo de girassol', 'Pro Soy'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'lx-botox-matize', linha: 'lx',
    nome: 'Botox Matize',
    subtitulo: 'Para todos os tipos de cabelo',
    volume: '970 g',
    resumo:
      'Repõe massa, reduz volume e alinha as cutículas. Ideal para loiros e cabelos com ' +
      'mechas.',
    descricao:
      'Tratamento para reposição de massa capilar, redução de volume e alinhamento das ' +
      'cutículas, indicado para todos os tipos de cabelo e especialmente para os loiros, ' +
      'coloridos e com mechas. Elimina o frizz, previne pontas duplas e sela as cutículas dos ' +
      'fios. A combinação de vitaminas e ácidos graxos prolonga o efeito liso, mantém as ' +
      'cutículas seladas e protege dos danos diários. Além de disciplinar o cabelo, ' +
      'intensifica o brilho, hidrata, platina e nutre.',
    tecnologia: 'Amino Repair',
    ativos: ['Complexo de aminoácidos', 'Óleo de café verde', 'Manteiga de karité'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'vx-vegan-prime', linha: 'vx',
    nome: 'Vegan Prime',
    volume: '970 ml',
    resumo: 'Restaurador com nanoqueratina para cabelos rebeldes, volumosos e com frizz.',
    descricao:
      'Tratamento restaurador para todos os tipos de cabelo, com Blend de Manteigas, Ácidos ' +
      'Tânicos e Nanoqueratina. Alinha, hidrata, nutre e restaura os cabelos, ao mesmo tempo ' +
      'em que sela as cutículas e reduz o frizz, com brilho e maciez incomparáveis. A fórmula ' +
      'catiônica penetra na fibra capilar e nutre intensamente os cabelos rebeldes, volumosos ' +
      'e com frizz.',
    tecnologia: 'Amino Repair',
    ativos: ['Complexo de aminoácidos', 'Óleo de café verde', 'Manteiga de karité'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '8 unidades'
  },
  {
    slug: 'hc-shampoo-restauracao-profunda', linha: 'hc',
    nome: 'Shampoo de Restauração Profunda',
    volume: '250 ml',
    resumo: 'A restauração profunda do salão, na versão para casa.',
    descricao:
      'Shampoo hidratante e reparador na versão home care. Limpa os fios de forma equilibrada ' +
      'e remove as impurezas enquanto auxilia a reparar e restaurar a fibra capilar. Pantenol ' +
      'e Blend de Aminoácidos têm ação revitalizante, hidratante e reparadora, e deixam os ' +
      'fios maleáveis e com brilho. Livre de sal (cloreto de sódio), corantes e parabenos.',
    tecnologia: 'Amino Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-condicionador-restauracao-profunda', linha: 'hc',
    nome: 'Condicionador de Restauração Profunda',
    volume: '250 ml',
    resumo: 'Desembaraça e alinha as cutículas depois do tratamento.',
    descricao:
      'Condicionador hidratante indicado para todos os tipos de cabelo, com ação ' +
      'desembaraçante que facilita o cuidado diário. Pantenol, Blend de Aminoácidos e Óleo de ' +
      'Ojon são ativos hidratantes, nutritivos e reparadores, e resultam em cabelos macios, ' +
      'brilhantes, com mais vida e movimento. Feito para ser aplicado depois dos tratamentos: ' +
      'ajuda a desembaraçar e a alinhar as cutículas, aumentando o brilho e a emoliência dos ' +
      'fios. Livre de corantes e parabenos.',
    tecnologia: 'Amino Ojon Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol', 'Óleo de Ojon'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-shampoo-liss', linha: 'hc',
    nome: 'Shampoo Liss',
    volume: '250 ml',
    resumo: 'Ajuda a controlar o volume e diminuir o frizz no dia a dia.',
    descricao:
      'Shampoo hidratante desenvolvido especialmente para auxiliar a diminuir o frizz e ' +
      'controlar o volume dos cabelos. Pantenol e Proteína da Seda dão ação emoliente, ' +
      'hidratante e reparadora, e proporcionam maleabilidade, maciez e sedosidade aos fios. ' +
      'Livre de sal (cloreto de sódio) e parabenos.',
    tecnologia: 'Defense Frizz',
    ativos: ['Proteína da seda', 'Pantenol'],
    selos: ['Livre de corantes e parabenos', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-condicionador-liss', linha: 'hc',
    nome: 'Condicionador Liss',
    volume: '250 ml',
    resumo: 'Brilho, desembaraço e maciez com controle de volume.',
    descricao:
      'Condicionador hidratante desenvolvido especialmente para auxiliar a diminuir o frizz e ' +
      'controlar o volume dos cabelos. Pantenol e Proteína da Seda dão ação emoliente, ' +
      'hidratante e reparadora, e promovem brilho, desembaraço e maciez. Livre de corantes e ' +
      'parabenos.',
    tecnologia: 'Defense Frizz',
    ativos: ['Proteína da seda', 'Pantenol'],
    selos: ['Livre de corantes e parabenos', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-shampoo-matize', linha: 'hc',
    nome: 'Shampoo Matize',
    volume: '250 ml',
    resumo: 'Neutraliza o amarelado e mantém o loiro bege e platinado por mais tempo.',
    descricao:
      'Shampoo hidratante matizador desenvolvido especialmente para cabelos loiros, ' +
      'descoloridos e com mechas ou luzes. Auxilia a neutralizar as tonalidades amareladas ' +
      'indesejadas e mantém o tom bege e platinado por mais tempo. O Fito Complexo Nutritivo ' +
      'e o Pantenol têm ação nutritiva e revitalizante, e deixam os cabelos saudáveis, com ' +
      'toque sedoso e brilho renovado. Livre de sal (cloreto de sódio) e parabenos.',
    tecnologia: 'Blond Protection',
    ativos: ['Complexo de açaí', 'Acerola', 'Uva', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-condicionador-matize', linha: 'hc',
    nome: 'Condicionador Matize',
    volume: '250 ml',
    resumo: 'Mantém a tonalidade platinada e o brilho entre uma matização e outra.',
    descricao:
      'Condicionador hidratante desenvolvido especialmente para cabelos loiros, descoloridos ' +
      'e com mechas. Deixa os fios com brilho intenso e mantém a tonalidade platinada por ' +
      'mais tempo, neutralizando os tons amarelados indesejados. O Fito Complexo Nutritivo e ' +
      'o Pantenol promovem nutrição e hidratação e mantêm os fios alinhados e com brilho ' +
      'intenso. Livre de parabenos.',
    tecnologia: 'Blond Protection',
    ativos: ['Complexo de açaí', 'Acerola', 'Uva', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-mascara-matize', linha: 'hc',
    nome: 'Máscara Matize',
    volume: '250 g',
    resumo: 'Máscara matizadora que reforça a durabilidade do loiro platinado.',
    descricao:
      'Máscara hidratante e matizadora que atua na neutralização dos tons amarelados dos ' +
      'cabelos loiros descoloridos, com mechas ou luzes. Reforça a durabilidade e a ' +
      'tonalidade dos fios, promovendo loiros bege e platinados. O Fitocomplexo Nutritivo com ' +
      'Açaí, Acerola e Uva, somado ao Pantenol, tem ação hidratante e nutritiva e proporciona ' +
      'desembaraço, maciez, sedosidade e brilho intenso. Livre de parabenos.',
    tecnologia: 'Blond Protection',
    ativos: ['Complexo de açaí', 'Acerola', 'Uva', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-shampoo-pos-quimica', linha: 'hc',
    nome: 'Shampoo Pós-Química',
    volume: '250 ml',
    resumo: 'Limpeza suave para cabelos quimicamente tratados.',
    descricao:
      'Shampoo desenvolvido especialmente para cabelos quimicamente tratados. Limpa ' +
      'suavemente os fios enquanto auxilia a resgatar a vitalidade, a leveza e o brilho ' +
      'natural dos cabelos. Proteína do Trigo e Pantenol são ativos com ação reparadora, ' +
      'condicionante e protetora, e deixam os fios maleáveis, sedosos e com brilho renovado. ' +
      'Livre de sal (cloreto de sódio), corantes e parabenos.',
    tecnologia: 'Repair Protein',
    ativos: ['Proteína do trigo', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-condicionador-pos-quimica', linha: 'hc',
    nome: 'Condicionador Pós-Química',
    volume: '250 ml',
    resumo: 'Hidrata sem pesar, para cabelos quimicamente tratados.',
    descricao:
      'Condicionador desenvolvido especialmente para cabelos quimicamente tratados. Hidrata ' +
      'os fios sem deixar os cabelos pesados, enquanto repara e auxilia a resgatar a ' +
      'vitalidade, a leveza e o brilho natural. Proteína do Trigo, Pantenol e Óleo de ' +
      'Macadâmia são ativos com ação reparadora, condicionante e protetora, e deixam os ' +
      'cabelos maleáveis, sedosos, macios e com brilho intenso. Livre de corantes e ' +
      'parabenos.',
    tecnologia: 'Oil Repair Protein',
    ativos: ['Proteína do trigo', 'Pantenol', 'Óleo de macadâmia'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  }
];
