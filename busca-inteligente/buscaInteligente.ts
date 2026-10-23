/**
 * Busca inteligente do DistriWork.
 *
 * Encontra clientes e produtos do jeito que a pessoa digitar:
 * - sem diferença entre maiúscula e minúscula ("JOSÉ" = "josé");
 * - sem diferença de acento ou cedilha ("Joao" = "João", "conceicao" = "Conceição");
 * - com erro de digitação ("progresiva" acha "Progressiva", "Ghodess" acha "Ghoodess");
 * - com palavras fora de ordem ou pela metade ("silva mar" acha "Maria da Silva").
 *
 * Não depende de nenhuma biblioteca e roda no navegador, inclusive sem internet.
 */

/** Um pedaço do texto original que bateu com a busca (para destacar em negrito). */
export interface Trecho {
  inicio: number;
  fim: number;
}

export interface Sugestao<T> {
  item: T;
  /** Texto principal do item, como foi cadastrado. */
  texto: string;
  /** Quanto maior, mais parecido com o que foi digitado. */
  pontos: number;
  /** true quando só foi encontrado por aproximação (erro de digitação). */
  aproximado: boolean;
  /** Partes do texto principal que bateram com a busca. */
  trechos: Trecho[];
}

export interface OpcoesIndice<T> {
  /** Texto principal: nome da cliente ou do produto. */
  texto: (item: T) => string;
  /** Textos extras que também valem na busca (apelido, salão, código, marca). */
  extras?: (item: T) => Array<string | null | undefined>;
}

export interface OpcoesBusca {
  /** Quantas sugestões mostrar. Padrão: 8. */
  limite?: number;
  /** Aceitar erro de digitação. Padrão: true. */
  aproximar?: boolean;
}

interface Palavra {
  texto: string;
  inicio: number;
  fim: number;
}

interface Entrada<T> {
  item: T;
  original: string;
  completo: string;
  palavras: Palavra[];
  palavrasExtras: string[];
  extrasCompletos: string[];
}

export interface Indice<T> {
  entradas: Entrada<T>[];
}

const MARCAS_DE_ACENTO = /[̀-ͯ]/g;

function normalizarLetra(letra: string): string {
  const semAcento = letra.normalize("NFD").replace(MARCAS_DE_ACENTO, "").toLowerCase();
  const primeira = semAcento.charAt(0);
  return /[a-z0-9]/.test(primeira) ? primeira : " ";
}

/**
 * Deixa o texto pronto para comparar: sem acento, sem cedilha, tudo minúsculo,
 * só letras, números e um espaço entre as palavras.
 */
export function normalizar(texto: string | null | undefined): string {
  return quebrarEmPalavras(String(texto ?? "").normalize("NFC"))
    .map((p) => p.texto)
    .join(" ");
}

/** Separa as palavras e guarda onde cada uma está no texto original. */
function quebrarEmPalavras(original: string): Palavra[] {
  const palavras: Palavra[] = [];
  let atual = "";
  let inicio = 0;
  for (let i = 0; i < original.length; i++) {
    const letra = normalizarLetra(original[i]);
    if (letra === " ") {
      if (atual) palavras.push({ texto: atual, inicio, fim: i });
      atual = "";
    } else {
      if (!atual) inicio = i;
      atual += letra;
    }
  }
  if (atual) palavras.push({ texto: atual, inicio, fim: original.length });
  return palavras;
}

/**
 * Quantas letras precisam mudar para uma palavra virar a outra
 * (trocar, tirar, pôr ou inverter duas vizinhas). Para de contar ao passar do limite.
 */
export function distancia(a: string, b: string, limite = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let antes2: number[] = [];
  let antes = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const linha = [i];
    let menorDaLinha = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let valor = Math.min(antes[j] + 1, linha[j - 1] + 1, antes[j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        valor = Math.min(valor, antes2[j - 2] + 1);
      }
      linha.push(valor);
      if (valor < menorDaLinha) menorDaLinha = valor;
    }
    if (menorDaLinha > limite) return limite + 1;
    antes2 = antes;
    antes = linha;
  }
  return antes[b.length];
}

/** Quantos erros de digitação aceitar numa palavra, conforme o tamanho dela. */
function errosPermitidos(tamanho: number): number {
  if (tamanho <= 3) return 0;
  if (tamanho <= 6) return 1;
  return 2;
}

interface Acerto {
  pontos: number;
  aproximado: boolean;
  palavra: number;
  /** Que pedaço da palavra encontrada destacar (posições dentro da palavra). */
  destaque: { de: number; ate: number };
}

/** Compara uma palavra digitada com uma palavra cadastrada. */
function compararPalavra(digitada: string, cadastrada: string, aproximar: boolean): Omit<Acerto, "palavra"> | null {
  if (cadastrada === digitada) {
    return { pontos: 100, aproximado: false, destaque: { de: 0, ate: cadastrada.length } };
  }
  if (cadastrada.startsWith(digitada)) {
    return { pontos: 80, aproximado: false, destaque: { de: 0, ate: digitada.length } };
  }
  const meio = digitada.length >= 2 ? cadastrada.indexOf(digitada) : -1;
  if (meio > 0) {
    return { pontos: 45, aproximado: false, destaque: { de: meio, ate: meio + digitada.length } };
  }
  if (!aproximar) return null;
  const limite = errosPermitidos(digitada.length);
  if (limite === 0) return null;

  const inteira = distancia(digitada, cadastrada, limite);
  if (inteira <= limite) {
    return { pontos: 70 - 15 * inteira, aproximado: true, destaque: { de: 0, ate: cadastrada.length } };
  }
  // A pessoa ainda está digitando: compara com o começo da palavra cadastrada.
  let melhor = limite + 1;
  let tamanhoMelhor = digitada.length;
  for (const tamanho of [digitada.length - 1, digitada.length, digitada.length + 1]) {
    if (tamanho < 1 || tamanho >= cadastrada.length) continue;
    const d = distancia(digitada, cadastrada.slice(0, tamanho), limite);
    if (d < melhor) {
      melhor = d;
      tamanhoMelhor = tamanho;
    }
  }
  if (melhor <= limite) {
    return { pontos: 60 - 15 * melhor, aproximado: true, destaque: { de: 0, ate: tamanhoMelhor } };
  }
  return null;
}

/** Prepara a lista uma vez só (faça isso quando a lista mudar, não a cada letra digitada). */
export function criarIndice<T>(itens: readonly T[], opcoes: OpcoesIndice<T>): Indice<T> {
  const entradas = itens.map((item) => {
    const original = String(opcoes.texto(item) ?? "").normalize("NFC");
    const palavras = quebrarEmPalavras(original);
    const extras = (opcoes.extras?.(item) ?? []).filter((e): e is string => Boolean(e)).map(normalizar);
    return {
      item,
      original,
      completo: palavras.map((p) => p.texto).join(" "),
      palavras,
      palavrasExtras: extras.flatMap((e) => e.split(" ")).filter(Boolean),
      extrasCompletos: extras,
    };
  });
  return { entradas };
}

function pontuar<T>(
  entrada: Entrada<T>,
  digitado: string,
  palavrasDigitadas: string[],
  aproximar: boolean,
  exigirTodas: boolean,
): Sugestao<T> | null {
  let pontos = 0;
  let aproximado = false;
  let encontradas = 0;
  const trechos: Trecho[] = [];
  const usadas = new Set<number>();

  for (const digitada of palavrasDigitadas) {
    // No plano B (só parte das palavras), "de", "da", "e" e outras palavrinhas não contam.
    if (!exigirTodas && digitada.length < 3) continue;
    let achado: Acerto | null = null;
    for (let indice = 0; indice < entrada.palavras.length; indice++) {
      if (usadas.has(indice)) continue;
      const acerto = compararPalavra(digitada, entrada.palavras[indice].texto, aproximar);
      if (acerto && (!achado || acerto.pontos > achado.pontos)) achado = { ...acerto, palavra: indice };
    }
    let pontosExtra = 0;
    let aproximadoExtra = false;
    for (const palavraExtra of entrada.palavrasExtras) {
      const acerto = compararPalavra(digitada, palavraExtra, aproximar);
      if (acerto && acerto.pontos > pontosExtra) {
        pontosExtra = acerto.pontos;
        aproximadoExtra = acerto.aproximado;
      }
    }
    if (achado && achado.pontos >= pontosExtra) {
      encontradas++;
      usadas.add(achado.palavra);
      pontos += achado.pontos;
      aproximado ||= achado.aproximado;
      const palavra = entrada.palavras[achado.palavra];
      trechos.push({ inicio: palavra.inicio + achado.destaque.de, fim: palavra.inicio + achado.destaque.ate });
    } else if (pontosExtra > 0) {
      encontradas++;
      pontos += pontosExtra * 0.8;
      aproximado ||= aproximadoExtra;
    } else if (exigirTodas) {
      return null; // Uma das palavras digitadas não apareceu: não é este item.
    }
  }
  if (encontradas === 0) return null;
  if (encontradas < palavrasDigitadas.length) aproximado = true;

  // Bônus para o que é mais provável que a pessoa queira.
  if (entrada.completo === digitado || entrada.extrasCompletos.includes(digitado)) pontos += 300;
  else if (entrada.completo.startsWith(digitado)) pontos += 150;
  else if (entrada.completo.includes(digitado)) pontos += 60;
  // Itens com nome mais curto ficam um pouco à frente quando empatam.
  pontos -= entrada.completo.length * 0.05;

  trechos.sort((a, b) => a.inicio - b.inicio);
  return { item: entrada.item, texto: entrada.original, pontos, aproximado, trechos };
}

/**
 * Devolve as sugestões para o que foi digitado, da mais parecida para a menos parecida.
 * Busca vazia devolve lista vazia.
 */
export function buscar<T>(indice: Indice<T>, digitado: string, opcoes: OpcoesBusca = {}): Sugestao<T>[] {
  const limite = opcoes.limite ?? 8;
  const aproximar = opcoes.aproximar ?? true;
  const consulta = normalizar(digitado);
  if (!consulta) return [];
  const palavrasDigitadas = consulta.split(" ");

  const exatas: Sugestao<T>[] = [];
  const aproximadas: Sugestao<T>[] = [];
  const separar = (exigirTodas: boolean) => {
    for (const entrada of indice.entradas) {
      const sugestao = pontuar(entrada, consulta, palavrasDigitadas, aproximar, exigirTodas);
      if (!sugestao) continue;
      (sugestao.aproximado ? aproximadas : exatas).push(sugestao);
    }
  };
  separar(true);
  // Nada bateu com todas as palavras? Mostra o que bate com parte delas, como "você quis dizer?".
  if (exatas.length === 0 && aproximadas.length === 0 && palavrasDigitadas.length > 1 && aproximar) separar(false);
  const ordenar = (a: Sugestao<T>, b: Sugestao<T>) =>
    b.pontos - a.pontos || a.texto.localeCompare(b.texto, "pt-BR", { sensitivity: "base" });
  exatas.sort(ordenar);
  aproximadas.sort(ordenar);
  // O que bate certinho vem sempre antes do que foi achado por aproximação.
  return [...exatas, ...aproximadas].slice(0, limite);
}

/** Atalho para buscar numa lista sem guardar o índice (bom para listas pequenas). */
export function sugerir<T>(itens: readonly T[], digitado: string, opcoes: OpcoesIndice<T> & OpcoesBusca): Sugestao<T>[] {
  return buscar(criarIndice(itens, opcoes), digitado, opcoes);
}

/** Divide o texto em pedaços normais e destacados, para mostrar em negrito o que bateu. */
export function dividirParaDestaque(texto: string, trechos: Trecho[]): Array<{ texto: string; destaque: boolean }> {
  const partes: Array<{ texto: string; destaque: boolean }> = [];
  let posicao = 0;
  for (const { inicio, fim } of trechos) {
    if (inicio < posicao) continue;
    if (inicio > posicao) partes.push({ texto: texto.slice(posicao, inicio), destaque: false });
    partes.push({ texto: texto.slice(inicio, fim), destaque: true });
    posicao = fim;
  }
  if (posicao < texto.length) partes.push({ texto: texto.slice(posicao), destaque: false });
  return partes;
}
