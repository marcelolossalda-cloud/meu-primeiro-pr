/* ==========================================================================
   CATÁLOGO AELLA PROFESSIONAL — dados dos produtos
   Transcritos do catálogo em PDF da marca.
   Para editar um produto, altere os campos abaixo. Nada mais precisa mudar.
   ========================================================================== */

const LINHAS = {
  rx: { nome: 'Reconstrução',  cor: '#E1002F', resumo: 'Restitui a fibra capilar desgastada por química, coloração, descoloração e alisamentos.' },
  fx: { nome: 'Finalização',   cor: '#00A98F', resumo: 'Finaliza e complementa os processos feitos pelo profissional. Também pode ser usada pelo cliente em casa.' },
  nx: { nome: 'Nutrição',      cor: '#F2B705', resumo: 'Devolve "peso" ao cabelo com carga maior de nutrientes, óleos graxos, manteigas e anti-frizz.' },
  dx: { nome: 'Descolorante',  cor: '#2E5FD9', resumo: 'Pós descolorantes com ativos nobres, para clarear a melanina natural ou artificial hidratando os fios.' },
  ox: { nome: 'Oxidante',      cor: '#4C8DE0', resumo: 'Emulsões reveladoras para ativar a coloração oxidante e o pó descolorante.' },
  cx: { nome: 'Coloração',     cor: '#1A1A1C', resumo: 'Portfólio de 40 cores de coloração e 7 tons de tonalizante, com fórmula exclusiva.' },
  lx: { nome: 'Liss',          cor: '#EE7623', resumo: 'Reposição de massa, redução de volume e alinhamento das cutículas.' },
  vx: { nome: 'Tratamento',    cor: '#35B44A', resumo: 'Tratamento restaurador vegano para cabelos rebeldes, volumosos e com frizz.' },
  hc: { nome: 'Home Care',     cor: '#7E4CA6', resumo: 'O profissionalismo do salão levado para a casa do cliente.' }
};

const PRODUTOS = [
  {
    slug: 'rx-shampoo-restauracao-profunda', linha: 'rx',
    nome: 'Shampoo de Restauração Profunda',
    volume: '970 ml',
    descricao: 'Shampoo hidratante e reparador, limpa os fios de forma equilibrada, removendo as impurezas enquanto auxilia a reparar e restaurar a fibra capilar. Elaborado com Pantenol e Blend de Aminoácidos, possui ação revitalizante, hidratante e reparadora dos fios, deixando-os maleáveis e com brilho. Livre de sal (cloreto de sódio), corantes e parabenos.',
    tecnologia: 'Amino Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'rx-mascara-reconstrucao-profunda', linha: 'rx',
    nome: 'Máscara de Reconstrução Profunda',
    volume: '970 g',
    descricao: 'Máscara de hidratação intensa, deixa os fios extremamente macios e sedosos, facilitando o pentear e o desembaraçar. Elaborada com Pantenol, Blend de Aminoácidos e Óleo de Ojon, promove ação hidratante, reparadora e nutritiva, proporciona fios sedosos, maleáveis e mais fáceis de desembaraçar, mantendo os cabelos saudáveis e com brilho intenso. Livre de corantes e parabenos.',
    tecnologia: 'Amino Ojon Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol', 'Óleo de Ojon'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'rx-leave-in-hidra-frizz', linha: 'rx',
    nome: 'Leave-in Multifuncional Hidra Frizz',
    volume: '135 ml',
    descricao: 'Leave-in finalizador indicado para todos os tipos de cabelos, hidrata, facilita o pentear, combate o frizz, restaura o brilho e a maciez. Elaborado com Pantenol, Blend de Aminoácidos e Óleo de Amla e Girassol, possui propriedades hidratantes e restauradoras, conferindo cabelos revitalizados, macios e com brilho absoluto. Contém protetor térmico e filtro solar.',
    beneficios: ['Hidratação intensa', 'Brilho, maciez e sedosidade', 'Redução de volume', 'Reparação', 'Melhora a penteabilidade', 'Antifrizz', 'Revitalização', 'Desembaraça', 'Proteção térmica', 'Filtro solar'],
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
    descricao: 'Máscara líquida ultra concentrada e com ação instantânea nutritiva, hidratante e emoliente, desenvolvida para todos os tipos de cabelos. Elaborada com Óleos de Argan, Jojoba e Amla, promove hidratação profunda, desembaraço, ação nutritiva e antifrizz. Proporciona sedosidade, maciez e brilho intenso aos cabelos. Livre de parabenos.',
    tecnologia: "4 Oil's Blend",
    ativos: ['Óleo de jojoba', 'Argan', 'Amla', 'Girassol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'fx-reconstrutor-essencial', linha: 'fx',
    nome: 'Reconstrutor Essencial',
    volume: '250 ml',
    descricao: 'Fluido finalizador e hidratante de uso essencial, promove proteção e brilho intenso aos cabelos. Elaborado com Ômega Plus e Pantenol, possui propriedades hidratantes e protetoras, conferindo cabelos revitalizados, macios e com brilho absoluto. Contém protetor térmico e filtro solar. Livre de parabenos.',
    tecnologia: 'Amino Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol', 'Ômega Plus', 'Filtro solar capilar'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'fx-perfect-liss', linha: 'fx',
    nome: 'Perfect Liss',
    volume: '135 ml',
    descricao: 'Fluido termoativado com efeito prolongador do liso e também do efeito dos cachos temporários, reduz o frizz com maciez e brilho intenso aos cabelos. Elaborado com Proteínas de Colágeno e Seda e Pantenol, possuem ação reparadora e hidratante. Facilita o deslizamento da escova sobre os fios e realinha as cutículas, diminuindo o frizz e deixando os cabelos macios e maleáveis. Protege os cabelos do calor do secador e da chapinha. Contém filtro solar. Livre de parabenos.',
    tecnologia: 'Protein Complex',
    ativos: ['Pantenol', 'Proteína da seda', 'Colágeno'],
    selos: ['Não testado em animais', 'Livre de parabenos e corante'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'fx-serum', linha: 'fx',
    nome: 'Sérum',
    volume: '60 ml',
    descricao: 'Sérum hidratante e doador de brilho desenvolvido com Ômega Plus, promove ação de reposição lipídica rica em ômegas. Sela e fortalece as pontas ressecadas, promove brilho, maciez e vitalidade aos fios. O uso regular do produto previne a formação de pontas duplas. Contém filtro solar. Livre de parabenos.',
    tecnologia: "5 Oil's",
    ativos: ['Complexo Ômega Plus', 'Filtro solar capilar'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'nx-shampoo-nutricao-intensiva', linha: 'nx',
    nome: 'Shampoo de Nutrição Intensiva',
    volume: '970 ml',
    descricao: 'Shampoo desembaraçante e nutritivo, indicado para todos os tipos de cabelo, limpa gentilmente, deixando-os mais saudáveis, sem ressecar. Elaborado com Fito Extratos de Frutas Vermelhas e Pantenol, que possuem ação revitalizante e hidratante, proporcionando maleabilidade, leveza, toque sedoso e brilho renovado. Livre de sal (cloreto de sódio), corantes e parabenos.',
    tecnologia: 'Nutrition Force',
    ativos: ['Complexo de cereja', 'Morango', 'Pitanga', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'nx-mascara-nutricao', linha: 'nx',
    nome: 'Máscara de Nutrição',
    volume: '250 g',
    descricao: 'Máscara de nutrição intensa, promove reposição lipídica rica em ômegas e combate o ressecamento dos fios, deixando os cabelos mais saudáveis, leves e com movimento. Elaborada com Ômega Plus, Proteína do Trigo, Pantenol e Fito Extratos de Frutas Vermelhas, possui ação emoliente, reparadora e nutritiva, alinha os fios e facilita o processo de desembaraçamento, resultando em cabelos macios, sedosos e com brilho intenso. Livre de parabenos.',
    tecnologia: 'Nutrition Force',
    ativos: ['Complexo frutas vermelhas', 'Pantenol', 'Ômega Plus', 'Proteína do trigo'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'dx-po-descolorante-blue', linha: 'dx',
    nome: 'Pó Descolorante Blue',
    volume: '500 g',
    descricao: 'O Pó Descolorante Blue Aella clareia os fios de forma uniforme e neutraliza tons alaranjados durante o processo. Perfeito para quem busca um loiro incrível. Possui fórmula exclusiva com Óleo de Avelã, Óleo de Coco e Extrato de Aloe Vera, que protegem a integridade da fibra capilar durante o clareamento, e tecnologia Dust Free, que não levanta pó e facilita o preparo com oxidante. Pode ser usado em todas as técnicas de clareamento dos fios, além de garantir um loiro bonito e saudável.',
    tecnologia: 'Blonde Platinum',
    ativos: ['Óleo de avelã', 'Óleo de coco', 'Extrato de aloe vera'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'dx-po-descolorante-white', linha: 'dx',
    nome: 'Pó Descolorante White',
    volume: '500 g',
    descricao: 'Fórmula desenvolvida com ativos de tratamento e proteção que preservam a integridade da fibra capilar durante a descoloração. Rápido e eficaz, é suavemente perfumado, não levanta pó (Dust Free) e se dispersa facilmente na água oxigenada, formando uma emulsão cremosa com excelente desempenho nos processos de clareamento, reflexos ou mechas, sem danificar o fio. É elaborado com Pantenol, Silicone e Óleo de Argan, que agem como um poderoso hidratante de efeito prolongado e também promovem um filme protetor que atenua de forma notável a ação de produtos agressivos e irritantes sobre a pele.',
    tecnologia: 'Hidra Flash',
    ativos: ['Pantenol', 'Silicone', 'Óleo de argan'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'ox-06-volumes', linha: 'ox',
    nome: 'Emulsão Reveladora 06 Volumes',
    volume: '900 ml',
    descricao: 'Emulsão cremosa oxidante suavemente perfumada contendo peróxido de hidrogênio. Indicada para ativar a coloração oxidante e o pó descolorante. Sua cremosidade e consistência facilitam a mistura com a massa da coloração e a dispersão do pó descolorante, devendo ser utilizada na proporção indicada no modo de usar tanto da coloração oxidante como do pó descolorante. Confere proteção e tratamento cosmético simultâneo, de hidratação e emoliência, enquanto potencializa a ação da coloração e do descolorante. Fórmula enriquecida com Proteína do Leite, proporciona maior resistência, flexibilidade e maciez aos cabelos.',
    ativos: ['Proteína do leite'],
    selos: ['Livre de corante e parabenos', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'ox-20-volumes', linha: 'ox',
    nome: 'Emulsão Reveladora 20 Volumes',
    volume: '900 ml',
    descricao: 'Emulsão cremosa oxidante suavemente perfumada contendo peróxido de hidrogênio. Indicada para ativar a coloração oxidante e o pó descolorante. Sua cremosidade e consistência facilitam a mistura com a massa da coloração e a dispersão do pó descolorante, devendo ser utilizada na proporção indicada no modo de usar tanto da coloração oxidante como do pó descolorante. Confere proteção e tratamento cosmético simultâneo, de hidratação e emoliência, enquanto potencializa a ação da coloração e do descolorante. Fórmula enriquecida com Proteína do Leite, proporciona maior resistência, flexibilidade e maciez aos cabelos.',
    ativos: ['Proteína do leite'],
    selos: ['Livre de corante e parabenos', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'ox-30-volumes', linha: 'ox',
    nome: 'Emulsão Reveladora 30 Volumes',
    volume: '900 ml',
    descricao: 'Emulsão cremosa oxidante suavemente perfumada contendo peróxido de hidrogênio. Indicada para ativar a coloração oxidante e o pó descolorante. Sua cremosidade e consistência facilitam a mistura com a massa da coloração e a dispersão do pó descolorante, devendo ser utilizada na proporção indicada no modo de usar tanto da coloração oxidante como do pó descolorante. Confere proteção e tratamento cosmético simultâneo, de hidratação e emoliência, enquanto potencializa a ação da coloração e do descolorante. Fórmula enriquecida com Proteína do Leite, proporciona maior resistência, flexibilidade e maciez aos cabelos.',
    ativos: ['Proteína do leite'],
    selos: ['Livre de corante e parabenos', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'ox-40-volumes', linha: 'ox',
    nome: 'Emulsão Reveladora 40 Volumes',
    volume: '900 ml',
    descricao: 'Emulsão cremosa oxidante suavemente perfumada contendo peróxido de hidrogênio. Indicada para ativar a coloração oxidante e o pó descolorante. Sua cremosidade e consistência facilitam a mistura com a massa da coloração e a dispersão do pó descolorante, devendo ser utilizada na proporção indicada no modo de usar tanto da coloração oxidante como do pó descolorante. Confere proteção e tratamento cosmético simultâneo, de hidratação e emoliência, enquanto potencializa a ação da coloração e do descolorante. Fórmula enriquecida com Proteína do Leite, proporciona maior resistência, flexibilidade e maciez aos cabelos.',
    ativos: ['Proteína do leite'],
    selos: ['Livre de corante e parabenos', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'cx-coloracao', linha: 'cx',
    nome: 'Coloração Cx',
    subtitulo: '40 cores · 7 tonalizantes',
    volume: '60 g',
    descricao: 'Contamos com um portfólio de 40 cores de coloração para atender todas as necessidades que o mercado procura. São desenvolvidas com uma fórmula exclusiva e com tecnologia de ponta. Nos tonalizantes possuímos 7 tons diferentes.',
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '72 unidades'
  },
  {
    slug: 'cx-luster-up-tonalize', linha: 'cx',
    nome: 'Luster Up Tonalize',
    subtitulo: 'Emulsão tonalizante e hidratante',
    volume: '900 ml',
    descricao: 'Possui formulação suave e hidratante que preserva a estrutura dos fios sem danificá-los. Permite revitalizar e intensificar a beleza da cor, contribuindo para sua uniformidade e durabilidade. Ação antioxidante e antiporosidade, para uma melhor fixação e retenção dos pigmentos sobre os fios, garantindo um resultado perfeito e duradouro, com brilho excepcional. Ativos combinados: Óleo de girassol, rico em ômega 9, possui ação antioxidante que protege a fibra contra os agentes externos e melhora a permeação dos pigmentos nos cabelos durante e pós-processo de coloração. Pro Soy, tecnologia exclusiva com alto poder de hidratação e emoliência, protege os fios contra o ressecamento com ação formadora de filme, para uma perfeita manutenção e beleza da cor.',
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
    descricao: 'Tratamento para reposição de massa capilar, redução de volume e alinhamento das cutículas para todos os tipos de cabelos, especialmente para cabelos loiros, coloridos e com mechas. Elimina o frizz, previne pontas duplas e sela as cutículas dos fios. Prolonga o efeito liso com a combinação de vitaminas e ácidos graxos, que mantêm as cutículas dos fios seladas e protege dos danos diários. Além de disciplinar o cabelo, o Botox Matize intensifica o brilho, hidrata, platina e nutre.',
    tecnologia: 'Amino Repair',
    ativos: ['Complexo de aminoácidos', 'Óleo de café verde', 'Manteiga de karité'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '6 unidades'
  },
  {
    slug: 'vx-vegan-prime', linha: 'vx',
    nome: 'Vegan Prime',
    volume: '970 ml',
    descricao: 'Tratamento restaurador para todos os tipos de cabelos com Blend de Manteigas, Ácidos Tânicos e Nanoqueratina. Alinha, hidrata, nutre e restaura os cabelos, enquanto sela as cutículas e reduz o frizz. Promove brilho e maciez incomparáveis. Sua fórmula catiônica penetra na fibra capilar, nutrindo intensamente os cabelos rebeldes, volumosos e com frizz.',
    tecnologia: 'Amino Repair',
    ativos: ['Complexo de aminoácidos', 'Óleo de café verde', 'Manteiga de karité'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '8 unidades'
  },
  {
    slug: 'hc-shampoo-restauracao-profunda', linha: 'hc',
    nome: 'Shampoo de Restauração Profunda',
    volume: '250 ml',
    descricao: 'Shampoo hidratante e reparador, limpa os fios de forma equilibrada, removendo as impurezas enquanto auxilia a reparar e restaurar a fibra capilar. Elaborado com Pantenol e Blend de Aminoácidos, possui ação revitalizante, hidratante e reparadora dos fios, deixando-os maleáveis e com brilho. Livre de sal (cloreto de sódio), corantes e parabenos.',
    tecnologia: 'Amino Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-condicionador-restauracao-profunda', linha: 'hc',
    nome: 'Condicionador de Restauração Profunda',
    volume: '250 ml',
    descricao: 'Condicionador hidratante, indicado para todos os tipos de cabelos, promove ação desembaraçante e facilita o cuidado diário dos cabelos. Elaborado com Pantenol, Blend de Aminoácidos e Óleo de Ojon, ativos hidratantes, nutritivos e reparadores, resultando em cabelos macios, brilhantes, com mais vida e movimento. Para ser aplicado pós tratamentos: ajuda a desembaraçar e alinhar as cutículas, aumentando o brilho e a emoliência dos fios. Livre de corantes e parabenos.',
    tecnologia: 'Amino Ojon Treatment',
    ativos: ['Complexo de aminoácidos', 'Pantenol', 'Óleo de Ojon'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-shampoo-liss', linha: 'hc',
    nome: 'Shampoo Liss',
    volume: '250 ml',
    descricao: 'Shampoo hidratante desenvolvido especialmente para auxiliar a diminuir o frizz e o controle do volume dos cabelos. Elaborado com Pantenol e Proteína da Seda, possui ação emoliente, hidratante e reparadora, proporciona maleabilidade, maciez e sedosidade aos fios. Livre de sal (cloreto de sódio) e parabenos.',
    tecnologia: 'Defense Frizz',
    ativos: ['Proteína da seda', 'Pantenol'],
    selos: ['Livre de corantes e parabenos', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-condicionador-liss', linha: 'hc',
    nome: 'Condicionador Liss',
    volume: '250 ml',
    descricao: 'Condicionador hidratante desenvolvido especialmente para auxiliar a diminuir o frizz e o controle do volume dos cabelos. Elaborado com Pantenol e Proteína da Seda, possui ação emoliente, hidratante e reparadora, promove brilho, desembaraço e maciez aos cabelos. Livre de corantes e parabenos.',
    tecnologia: 'Defense Frizz',
    ativos: ['Proteína da seda', 'Pantenol'],
    selos: ['Livre de corantes e parabenos', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-shampoo-matize', linha: 'hc',
    nome: 'Shampoo Matize',
    volume: '250 ml',
    descricao: 'Shampoo hidratante matizador desenvolvido especialmente para os cabelos loiros, descoloridos e com mechas ou luzes, atua auxiliando a neutralizar as tonalidades amareladas indesejadas, mantendo o tom bege e platinado por mais tempo. Elaborado com Fito Complexo Nutritivo e Pantenol, promove ação nutritiva e revitalizante, proporcionando cabelos saudáveis, com toque sedoso e brilho renovado. Livre de sal (cloreto de sódio) e parabenos.',
    tecnologia: 'Blond Protection',
    ativos: ['Complexo de açaí', 'Acerola', 'Uva', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-condicionador-matize', linha: 'hc',
    nome: 'Condicionador Matize',
    volume: '250 ml',
    descricao: 'Condicionador hidratante desenvolvido especialmente para cabelos loiros, descoloridos e com mechas, deixa os cabelos com brilho intenso e mantém a tonalidade platinada por mais tempo, neutralizando os tons amarelados indesejados. Elaborado com Fito Complexo Nutritivo e Pantenol, promovendo nutrição e hidratação, mantendo os fios alinhados e com brilho intenso. Livre de parabenos.',
    tecnologia: 'Blond Protection',
    ativos: ['Complexo de açaí', 'Acerola', 'Uva', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-mascara-matize', linha: 'hc',
    nome: 'Máscara Matize',
    volume: '250 g',
    descricao: 'Máscara hidratante e matizadora, atua na neutralização dos tons amarelados dos cabelos loiros descoloridos, com mechas ou luzes, reforça a durabilidade e a tonalidade dos fios, promovendo loiros bege e platinados. Elaborada com Fitocomplexo Nutritivo com Açaí, Acerola e Uva e Pantenol, possui ação hidratante e nutritiva, proporciona desembaraço, maciez, sedosidade e brilho intenso aos cabelos. Livre de parabenos.',
    tecnologia: 'Blond Protection',
    ativos: ['Complexo de açaí', 'Acerola', 'Uva', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-shampoo-pos-quimica', linha: 'hc',
    nome: 'Shampoo Pós-Química',
    volume: '250 ml',
    descricao: 'Shampoo desenvolvido especialmente para cabelos quimicamente tratados, limpa suavemente os fios enquanto auxilia a resgatar a vitalidade, a leveza e o brilho natural dos cabelos. Elaborado com Proteína do Trigo e Pantenol, ativos com ação reparadora, condicionante e protetora, proporcionando cabelos maleáveis, sedosos e com brilho renovado. Livre de sal (cloreto de sódio), corantes e parabenos.',
    tecnologia: 'Repair Protein',
    ativos: ['Proteína do trigo', 'Pantenol'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  },
  {
    slug: 'hc-condicionador-pos-quimica', linha: 'hc',
    nome: 'Condicionador Pós-Química',
    volume: '250 ml',
    descricao: 'Condicionador desenvolvido especialmente para cabelos quimicamente tratados, hidrata os fios sem deixar os cabelos pesados, enquanto repara e auxilia a resgatar a vitalidade, a leveza e o brilho natural dos cabelos. Elaborado com Proteína do Trigo, Pantenol e Óleo de Macadâmia, ativos com ação reparadora, condicionante e protetora, proporcionando cabelos maleáveis, sedosos, macios e com brilho intenso. Livre de corantes e parabenos.',
    tecnologia: 'Oil Repair Protein',
    ativos: ['Proteína do trigo', 'Pantenol', 'Óleo de macadâmia'],
    selos: ['Vegano', 'Não testado em animais'],
    caixaMaster: '12 unidades'
  }
];
