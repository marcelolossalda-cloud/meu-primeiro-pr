/* ==========================================================================
   CATÁLOGO GHOODESS — dados dos produtos
   Descrições e benefícios transcritos do catálogo 2026 da marca (texto do
   próprio PDF). Para editar um produto, altere os campos abaixo.

     familia    nome da linha impresso na embalagem (Original, Reparagy…)
     resumo     linha curta que aparece no card e abre a ficha
     descricao  texto completo, exibido na ficha
   ========================================================================== */

const LINHAS = {
  desc:  { nome: 'Descoloração & Oxidação',  cor: '#97A0A4',
           resumo: 'Pó descolorante, água oxigenada e acidificante para clarear com segurança e fechar o processo químico.' },
  alin:  { nome: 'Alinhamento',              cor: '#A095A3',
           resumo: 'Sistemas profissionais de alinhamento capilar, redução de volume e limpeza preparatória.' },
  trat:  { nome: 'Tratamento',               cor: '#C3A6A8',
           resumo: 'Nutrição, reconstrução, hidratação e matização, em versão profissional e home care.' },
  fin:   { nome: 'Finalização',              cor: '#C8AD80',
           resumo: 'Protetor térmico, óleo, ativador de cachos e perfume capilar para o acabamento do dia a dia.' },
  couro: { nome: 'Couro Cabeludo & Limpeza', cor: '#A8C7B7',
           resumo: 'Loção e cápsulas contra a queda, e shampoo e condicionador neutros de uso diário.' },
  cor:   { nome: 'Coloração',                cor: '#E0A283',
           resumo: 'Coloração creme profissional com cores intensas e tratamento durante o processo.' }
};

const PRODUTOS = [
  {
    slug: 'white-repair-po', linha: 'desc', familia: 'White Repair',
    nome: 'Pó Descolorante White Repair', volume: '500 g', uso: 'Profissional',
    resumo: 'Alto poder de clareamento com complexo de 9 óleos e tecnologia aceleradora.',
    descricao: 'Desenvolvido para oferecer alto poder de clareamento com segurança. Possui complexo de 9 óleos que protegem a fibra capilar durante a descoloração, além de tecnologia aceleradora que reduz o tempo de exposição dos fios.',
    ativos: ['Colágeno', 'Elastina', 'Complexo de 9 óleos']
  },
  {
    slug: 'agua-oxigenada', linha: 'desc', familia: 'White Repair',
    nome: 'Água Oxigenada', subtitulo: '05 · 20 · 30 · 40 volumes', uso: 'Profissional',
    resumo: 'Emulsão estabilizada com lanolina, para coloração e descoloração com oxidação segura.',
    descricao: 'Fórmula estabilizada e balanceada com lanolina, ideal para processos de coloração e descoloração. Garante oxidação segura, mistura homogênea e resultados precisos.',
    ativos: ['Lanolina'],
    variantes: ['05 volumes', '20 volumes', '30 volumes', '40 volumes']
  },
  {
    slug: 'golden', linha: 'desc', familia: 'Golden',
    nome: 'Golden Acidificante', volume: '500 ml', uso: 'Profissional',
    resumo: 'Neutraliza o pH alcalino e estabiliza a fibra depois da descoloração.',
    descricao: 'Produto desenvolvido para estabilizar a ação do pó descolorante e neutralizar o pH alcalino após processos químicos. Sua fórmula com proteína do trigo, ácido láctico e silicones nobres reduz a porosidade, facilita o desembaraço e devolve maciez e brilho aos fios.',
    beneficios: ['Neutraliza o pH alcalino', 'Reduz a porosidade', 'Facilita o desembaraço', 'Maciez e brilho imediatos', 'Estabiliza a fibra capilar', 'Ideal pós-descoloração'],
    ativos: ['Proteína do trigo', 'Ácido láctico', 'Silicones nobres']
  },
  {
    slug: 'original-alinhamento', linha: 'alin', familia: 'Original',
    nome: 'Original Alinhamento Capilar', volume: '1000 ml', uso: 'Profissional',
    resumo: 'Blend de ácidos que alinha 100% dos fios, com brilho e vitalidade. Compatível com todas as químicas.',
    descricao: 'Sistema profissional elaborado com blend de ácidos que promove alinhamento total dos fios, brilho intenso e vitalidade. Compatível com todas as químicas, com segurança no processo.',
    beneficios: ['Alinha 100%', 'Blend de ácidos', 'Brilho intenso', 'Compatível com todas as químicas'],
    ativos: ['Ácido láctico', 'Ácido hialurônico', 'Keratina', 'Argan', 'Cálamo', 'Aminoácidos']
  },
  {
    slug: 'original-anti-residuos', linha: 'alin', familia: 'Original',
    nome: 'Original Shampoo Anti-Resíduos', volume: '1000 ml', uso: 'Profissional',
    resumo: 'Limpeza profunda que prepara os fios para o alinhamento.',
    descricao: 'Promove limpeza profunda preparando os fios para o alinhamento capilar. Pode ser usado em conjunto com o Alinhamento Original ou separadamente.',
    beneficios: ['Limpeza profunda', 'Prepara para o alinhamento', 'Uso combinado ou isolado'],
    ativos: ['Ácido láctico', 'Ácido hialurônico']
  },
  {
    slug: 'original-homecare', linha: 'alin', familia: 'Original',
    nome: 'Original Home Care', subtitulo: 'Shampoo, alinhamento e máscara', uso: 'Home care',
    resumo: 'A manutenção do alinhamento Original em casa: shampoo, alinhamento e máscara.',
    descricao: 'Versão home care da linha Original, para manter o resultado do alinhamento entre as visitas ao salão. Conjunto de shampoo, alinhamento e máscara.',
    ativos: ['Keratina', 'Serine', 'Macadâmia']
  },
  {
    slug: 'pro-gold', linha: 'alin', familia: 'Pro Gold',
    nome: 'Pro Gold Alinhamento Líquido', volume: '500 ml', uso: 'Profissional',
    resumo: 'Alinhamento líquido de alto rendimento, baixa fumaça e cor roxa: ideal também para loiros.',
    descricao: 'Alinhamento líquido desenvolvido para proporcionar fios alinhados, disciplinados e com brilho intenso. Sua fórmula com ácido láctico e aloe vera garante alto rendimento, menor emissão de fumaça e segurança no processo. Possui cor roxa, sendo ideal também para cabelos loiros, além de ser compatível com outras químicas.',
    beneficios: ['Alinhamento eficaz dos fios', 'Alto rendimento por ser líquido', 'Baixa emissão de fumaça', 'Indicado para cabelos loiros', 'Compatível com outras químicas', 'Uso exclusivamente profissional'],
    ativos: ['Ácido láctico', 'Aloe vera']
  },
  {
    slug: 'btx', linha: 'alin', familia: 'BTX',
    nome: 'BTX Redutor de Volume', volume: '500 g', uso: 'Profissional',
    resumo: 'Textura cremosa que alinha, trata e disciplina. Cor roxa, indicado também para loiros.',
    descricao: 'Desenvolvido para alinhar, tratar e disciplinar os fios. Sua textura cremosa proporciona aplicação uniforme, enquanto a fórmula com aloe vera e ácido láctico promove hidratação, maciez e controle do frizz. Possui cor roxa, sendo indicado também para cabelos loiros.',
    beneficios: ['Redução de volume', 'Alinhamento dos fios', 'Hidratação e maciez', 'Controle do frizz', 'Indicado para cabelos loiros', 'Uso profissional'],
    ativos: ['Aloe vera', 'Ácido láctico']
  },
  {
    slug: 'reparagy-profissional', linha: 'trat', familia: 'Reparagy',
    nome: 'Reparagy Profissional', subtitulo: 'Shampoo, máscara e BB cream', uso: 'Profissional',
    resumo: 'Nutrição profunda para cabelos extremamente secos e ressecados.',
    descricao: 'Linha desenvolvida para cabelos extremamente secos e ressecados. O Reparagy promove nutrição intensa, devolvendo maciez, brilho e vitalidade aos fios. Suas fórmulas ricas em ativos de alto desempenho tratam profundamente a fibra capilar, sendo ideal para uso profissional e home care.',
    beneficios: ['Fortalece a fibra capilar', 'Fios mais saudáveis e sedosos', 'Recupera maciez e brilho', 'Ideal para cabelos secos e porosos', 'Nutrição profunda']
  },
  {
    slug: 'reparagy-homecare', linha: 'trat', familia: 'Reparagy',
    nome: 'Reparagy Home Care', subtitulo: 'Shampoo, condicionador, máscara e BB cream', uso: 'Home care',
    resumo: 'A nutrição intensa do Reparagy para continuar em casa.',
    descricao: 'Versão home care da linha Reparagy, desenvolvida para cabelos extremamente secos e ressecados. Promove nutrição intensa, devolvendo maciez, brilho e vitalidade aos fios no cuidado diário.',
    beneficios: ['Fortalece a fibra capilar', 'Fios mais saudáveis e sedosos', 'Recupera maciez e brilho', 'Nutrição profunda']
  },
  {
    slug: 'reparagy-bb-cream', linha: 'trat', familia: 'Reparagy',
    nome: 'Reparagy BB Cream', volume: '200 ml · 100 ml', uso: 'Profissional e home care',
    resumo: 'Tratamento multifuncional instantâneo: nutre, alinha e protege.',
    descricao: 'Tratamento multifuncional desenvolvido para nutrir, alinhar e proteger os fios instantaneamente. Sua fórmula com óleos, proteínas e aminoácidos atua na cutícula e no córtex capilar, auxiliando na reparação dos danos causados por agressões físicas, químicas, térmicas e ambientais.',
    beneficios: ['Tratamento instantâneo', 'Nutre e revitaliza os fios', 'Ação reparadora profunda', 'Protege contra danos externos', 'Alinha e reduz o frizz', 'Brilho e maciez imediatos', 'Proteção térmica'],
    ativos: ['Óleos', 'Proteínas', 'Aminoácidos']
  },
  {
    slug: 'nescuihair-profissional', linha: 'trat', familia: 'Nescuihair',
    nome: 'Nescuihair Tratamento Profissional', subtitulo: 'Shampoo, máscara e BB cream', volume: '1000 ml', uso: 'Profissional',
    resumo: 'Limpeza suave e tratamento nutritivo, vegano, com fragrância de morango.',
    descricao: 'Linha desenvolvida para proporcionar limpeza suave e tratamento nutritivo, com fragrância irresistível de morango. Suas fórmulas veganas e antialérgicas promovem maciez, brilho e vitalidade desde as primeiras aplicações, sendo indicadas para todos os tipos de cabelo.',
    beneficios: ['Limpeza suave sem agredir', 'Hidratação e nutrição dos fios', 'Fórmula vegana e antialérgica', 'Brilho e maciez imediatos', 'Fragrância de morango', 'Ideal para uso diário'],
    selos: ['Vegano', 'Antialérgico']
  },
  {
    slug: 'nescuihair-homecare', linha: 'trat', familia: 'Nescuihair',
    nome: 'Nescuihair Home Care', subtitulo: 'Shampoo, BB cream e máscara', uso: 'Home care',
    resumo: 'O tratamento Nescuihair em tamanho para casa, com fragrância de morango.',
    descricao: 'Versão home care da linha Nescuihair: limpeza suave e tratamento nutritivo com fragrância de morango. Fórmulas veganas e antialérgicas, indicadas para todos os tipos de cabelo.',
    beneficios: ['Limpeza suave sem agredir', 'Hidratação e nutrição dos fios', 'Fórmula vegana e antialérgica', 'Ideal para uso diário'],
    selos: ['Vegano', 'Antialérgico']
  },
  {
    slug: 'blond-repair-profissional', linha: 'trat', familia: 'Blond Repair',
    nome: 'Blond Repair Platinum Profissional', subtitulo: 'Shampoo e máscara matizadora', volume: '1000 ml', uso: 'Profissional',
    resumo: 'Tratamento intenso e neutralização eficaz para loiros, descoloridos e com mechas.',
    descricao: 'Linha desenvolvida especialmente para cabelos loiros, descoloridos ou com mechas. O Blond Repair Profissional oferece tratamento intenso e neutralização eficaz, enquanto o Blond Repair home care mantém a cor, o brilho e a saúde dos fios no dia a dia. Fórmulas de alta performance que tratam profundamente sem comprometer o tom do loiro.',
    beneficios: ['Matizado perfeito', 'Tratamento intenso', 'Não compromete o tom do loiro']
  },
  {
    slug: 'blond-repair-homecare', linha: 'trat', familia: 'Blond Repair',
    nome: 'Blond Repair Home Care', subtitulo: 'Shampoo e máscara', volume: '300 ml', uso: 'Home care',
    resumo: 'Mantém a cor, o brilho e a saúde do loiro no dia a dia.',
    descricao: 'Versão home care da linha Blond Repair, para cabelos loiros, descoloridos ou com mechas. Mantém a cor, o brilho e a saúde dos fios no dia a dia, sem comprometer o tom do loiro.',
    beneficios: ['Mantém a cor', 'Brilho no dia a dia', 'Não compromete o tom do loiro']
  },
  {
    slug: 'hydration-kit', linha: 'trat', familia: 'Hydration',
    nome: 'Hydration Dose Tripla', subtitulo: '+ escova anti frizz', uso: 'Profissional e home care',
    resumo: 'Kit de hidratação inteligente com lipídios e vitamina E, de absorção rápida.',
    descricao: 'Transforme cabelos opacos, ressecados e sem vida em fios profundamente hidratados, macios e com brilho extraordinário. Hydration é um tratamento inovador desenvolvido com lipídios e Vitamina E, ativos que ajudam a repor nutrientes essenciais, restaurar a maciez e devolver a saúde dos cabelos desde a primeira aplicação. Sua tecnologia líquida promove absorção rápida, proporcionando resultados imediatos sem pesar os fios.',
    ativos: ['Lipídios', 'Vitamina E']
  },
  {
    slug: 'hydration', linha: 'trat', familia: 'Hydration',
    nome: 'Hydration Máscara Líquida', volume: '200 ml', uso: 'Profissional e home care',
    resumo: 'Hidratação instantânea que vira máscara cremosa em contato com a água.',
    descricao: 'Máscara líquida desenvolvida para proporcionar hidratação instantânea e profunda. Sua fórmula com vitamina E e lipídios recupera a integridade da fibra capilar, deixando os fios mais fortes, macios e brilhantes. Ao entrar em contato com a água, transforma-se em máscara cremosa, oferecendo rendimento superior às máscaras tradicionais.',
    beneficios: ['Hidratação imediata', 'Alto rendimento', 'Praticidade no uso', 'Maciez e brilho', 'Fortalecimento dos fios', 'Ideal para profissional e home care'],
    ativos: ['Vitamina E', 'Lipídios']
  },
  {
    slug: 'bruma-repair', linha: 'trat', familia: 'Bruma Repair',
    nome: 'Bruma Repair Spray Aminoácidos', volume: '200 ml', uso: 'Profissional e home care',
    resumo: 'Reconstrução imediata com queratina, elastina, colágeno e proteína da seda.',
    descricao: 'Reconstrutor desenvolvido para restaurar a força e a resistência dos fios sensibilizados. Sua fórmula com queratina, elastina, colágeno, proteína da seda e Hydration NMF atua no córtex capilar, protegendo contra danos oxidativos e auxiliando na preservação da cor.',
    beneficios: ['Reconstrução imediata', 'Fortalecimento dos fios', 'Proteção antioxidante', 'Prevenção do desbotamento'],
    ativos: ['Queratina', 'Elastina', 'Colágeno', 'Proteína da seda', 'Hydration NMF']
  },
  {
    slug: 'strawberry', linha: 'fin', familia: 'Strawberry',
    nome: 'Strawberry BB Cream', subtitulo: 'Reconstrutor e protetor térmico', volume: '200 ml', uso: 'Profissional e home care',
    resumo: 'Finalizador em creme que reconstrói e protege do calor. Dez benefícios em um só produto.',
    descricao: 'Finalizador em creme desenvolvido para reconstruir e proteger os fios contra o calor do secador e da chapinha. Sua fórmula com ceramidas, proteína do algodão e silicones promove maciez e brilho, sendo ideal para uso profissional na bancada e também para o dia a dia da cliente. Excelente também para finalizar cabelos cacheados, pois possui alto poder nutritivo.',
    beneficios: ['Proteção térmica', 'Reconstrução', 'Antifrizz', 'Maciez e brilho', 'Finaliza cabelos cacheados'],
    ativos: ['Ceramidas', 'Proteína do algodão', 'Silicones', 'Aloe vera', 'Proteínas']
  },
  {
    slug: 'nescuihair-bb-cream', linha: 'fin', familia: 'Nescuihair',
    nome: 'Nescuihair BB Cream', volume: '200 ml · 100 ml', uso: 'Profissional e home care',
    resumo: 'Finalizador leve com proteção térmica e fragrância de morango.',
    descricao: 'Finalizador leve desenvolvido para proteger os fios contra o calor do secador e da chapinha, além das agressões externas do dia a dia. Auxilia no controle do frizz, promove brilho natural e deixa os cabelos alinhados e sedosos, com fragrância suave de morango.',
    beneficios: ['Proteção térmica', 'Controle do frizz', 'Brilho e maciez', 'Não pesa nos fios', 'Fragrância de morango', 'Ideal para finalização diária']
  },
  {
    slug: 'oil-repair', linha: 'fin', familia: 'Oil Repair',
    nome: 'Oil Repair Óleo Finalizador', subtitulo: 'Argan oil', volume: '08 ml · 60 ml', uso: 'Profissional e home care',
    resumo: 'Óleo de argan que repara, protege do calor e reduz pontas duplas.',
    descricao: 'Óleo finalizador desenvolvido para reparar, proteger e proporcionar brilho intenso aos fios. Enriquecido com óleo de argan e silicones nobres de origem vegetal, auxilia na redução das pontas duplas, no controle do frizz e na proteção térmica, podendo ser utilizado em cabelos úmidos ou secos.',
    beneficios: ['Reparação da fibra capilar', 'Proteção térmica', 'Redução das pontas duplas', 'Brilho intenso', 'Ação anti-frizz', 'Toque leve e sedoso'],
    ativos: ['Óleo de argan', 'Silicones vegetais']
  },
  {
    slug: 'love-in-shine', linha: 'fin', familia: 'Love in Shine',
    nome: 'Love in Shine Perfume Capilar', subtitulo: '3 fragrâncias, 3 experiências', volume: '50 ml', uso: 'Home care',
    resumo: 'Perfuma, neutraliza odores e realça o brilho, com toque leve e secagem rápida.',
    descricao: 'Perfume capilar desenvolvido para perfumar delicadamente os fios, neutralizar odores e realçar a suavidade e o brilho natural do cabelo. Possui textura leve, secagem rápida e brilho que proporciona um acabamento sofisticado, deixando os fios radiantes e perfumados ao longo do dia.',
    beneficios: ['Perfuma e neutraliza', 'Brilho sofisticado', 'Toque leve e secagem rápida', 'Não pesa nos fios', 'Realça o brilho natural do cabelo', 'Ideal para finalização diária']
  },
  {
    slug: 'curl-revival', linha: 'fin', familia: 'Curl Revival',
    nome: 'Curl Revival Ativador de Cachos', volume: '500 ml', uso: 'Profissional e home care',
    resumo: 'Define, modela e nutre os cachos com óleo de coco e manteiga de karité.',
    descricao: 'Ativador desenvolvido para definir, modelar e nutrir os cachos, proporcionando hidratação, controle do frizz e volume na medida certa. Sua fórmula com óleo de coco e manteiga de karité devolve maciez, brilho e movimento natural, mantendo os cachos lindos por muito mais tempo.',
    beneficios: ['Definição dos cachos', 'Hidratação e nutrição', 'Redução do frizz', 'Brilho e maciez', 'Volume controlado', 'Uso profissional e home care'],
    ativos: ['Óleo de coco', 'Manteiga de karité']
  },
  {
    slug: 'herbal', linha: 'couro', familia: 'Herbal',
    nome: 'Herbal Loção + Cápsula', uso: 'Profissional e home care',
    resumo: 'Tratamento completo contra queda, alopecias e caspa: loção no couro cabeludo e cápsulas de vitaminas.',
    descricao: 'Tratamento desenvolvido para auxiliar no combate à queda capilar, alopecias e caspas. A loção atua no couro cabeludo com extratos vegetais calmantes e anti-inflamatórios, enquanto as cápsulas fornecem vitaminas e minerais essenciais para o fortalecimento e crescimento saudável dos fios.',
    beneficios: ['Auxilia no combate à queda', 'Equilibra o couro cabeludo', 'Estimula o crescimento', 'Ação calmante e anti-inflamatória', 'Fortalece os fios', 'Tratamento completo'],
    ativos: ['Arnica', 'Confrei', 'Alecrim', 'Própolis', 'Jaborandi', 'Aloe vera']
  },
  {
    slug: 'clean-repair', linha: 'couro', familia: 'Clean Repair',
    nome: 'Clean Repair Shampoo Neutro + Condicionador', volume: '2500 ml', uso: 'Profissional',
    resumo: 'Limpeza suave e equilibrada com broto de bambu e proteína do trigo, para todos os tipos de cabelo.',
    descricao: 'Linha desenvolvida para promover limpeza suave e equilibrada do couro cabeludo e dos fios, sem agredir a fibra capilar. Sua fórmula com broto de bambu e proteína do trigo auxilia na elasticidade, na hidratação e na penteabilidade, garantindo cabelos macios, alinhados e saudáveis no dia a dia.',
    beneficios: ['Limpeza delicada e eficaz', 'Mantém a umidade dos fios', 'Neutraliza resíduos alcalinos', 'Facilita o desembaraço', 'Maciez e elasticidade', 'Uso profissional'],
    ativos: ['Broto de bambu', 'Proteína do trigo']
  },
  {
    slug: 'collors', linha: 'cor', familia: 'Collors',
    nome: 'Ghoodess Collors Coloração Creme', volume: '60 g', uso: 'Profissional',
    resumo: 'Cores intensas e fiéis à cartela, com hidratação durante o processo.',
    descricao: 'A Ghoodess Collors é uma coloração creme profissional de alta performance, desenvolvida para entregar cores intensas, fiéis à cartela e com brilho superior, ao mesmo tempo em que trata e protege a fibra capilar durante o processo químico.',
    beneficios: ['Cores intensas e duradouras', 'Excelente cobertura de fios brancos', 'Hidratação durante o processo de coloração', 'Abertura de cutícula equilibrada', 'Tecnologia profissional de alto desempenho', 'Conforto ao couro cabeludo', 'Resultado uniforme da raiz às pontas'],
    cartela: ['Naturais', 'Acinzentados', 'Dourados', 'Marrons', 'Corretores', 'Acobreados', 'Vermelhos', 'Beges', 'Mate', 'Pérolas'],
    modoDeUso: [
      ['Coloração', '1 : 1½ (60 g de coloração para 90 ml de oxidante)', '40 a 45 minutos'],
      ['Tonalizante', '1 : 2 (60 g de coloração para 120 ml de oxidante)', '20 a 40 minutos'],
      ['Super reforçador de clareamento', '1 : 3 (60 g de coloração para 180 ml de oxidante 40 volumes)', '45 a 55 minutos']
    ],
    aviso: 'Siga as instruções de preparação e respeite o tempo de pausa de cada procedimento. Realize teste de mechas e prova de toque.'
  }
];
