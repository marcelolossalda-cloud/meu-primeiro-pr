# Prompt: busca inteligente no DistriWork

> **Para quem é:** para o Marcelo colar no **Claude Code**, dentro da pasta do código do app (`Documentos\crm-app`), o mesmo app publicado em **loja.marceloemilene.com**.
> **O que faz:** em todo campo de busca de cliente ou de produto, as sugestões aparecem enquanto você digita, sem ligar para acento, maiúscula ou erro de digitação.
> **Demonstração:** https://claude.ai/artifact/F5Lg7pvJdzcFMpPnZX5JwU

---

## PROMPT PRONTO (copie tudo abaixo e cole no Claude Code)

````
Missão: busca inteligente com sugestões em todos os campos de busca de cliente e de produto
do DistriWork (Work Distri), o app publicado em loja.marceloemilene.com.
Fale comigo em português do Brasil, com palavras simples. Antes de começar, diga quanto
tempo acha que leva e me avise a cada ~5 minutos quanto falta.

Contexto do app
- Next.js 16.3 (App Router) + React 19 + Prisma 7 com SQLite (better-sqlite3) + Tailwind 4
  + TypeScript. O AGENTS.md avisa que este Next.js tem mudanças que não estão no seu
  treinamento: leia o guia em node_modules/next/dist/docs/ antes de mexer em rota, cache
  ou API.
- Três versões, e a busca tem que funcionar nas três: o site no Railway
  (loja.marceloemilene.com), o celular com modo sem internet (public/sw.js e
  lib/offline.ts) e o programa do computador (scripts/empacotar-windows.mjs).
- Cores: use os tokens de src/app/globals.css e src/lib/coresDaArea.ts. Nada de cor fixa
  no JSX; o npm run verificar-cores tem que continuar passando.
- src/components/sales/PosScreen.tsx (a tela de vender) é grande e de alto risco: mexa só
  no campo de busca, com cuidado, e teste a venda inteira depois.

O que eu quero
- Quando eu digitar o nome de uma cliente ou de um produto, as sugestões aparecem embaixo
  do campo enquanto eu digito.
- Tanto faz acento, cedilha, maiúscula ou minúscula: "jose" = "José", "MONICA" = "Mônica",
  "conceicao" = "Conceição".
- Mesmo com erro de digitação, sugere o mais parecido ("progresiva" → "Progressiva",
  "Ghodess" → "Ghoodess"), com o aviso "você quis dizer?".
- Palavras fora de ordem ou pela metade também funcionam ("silva jose", "desco").
- Cliente: também acha pelo salão, pelo apelido e pelo telefone.
  Produto: também acha pela marca, pela linha, pelo código e pelo código de barras.
- O que bate certinho vem primeiro; o que foi achado por aproximação vem depois.
- Teclado: ↓ e ↑ andam, Enter escolhe, Esc fecha. No celular, é só tocar.
- Tem que funcionar nas 3 versões: site, celular (inclusive sem internet) e programa do
  computador.

Onde aplicar (confira no código quais telas têm busca de cliente ou de produto)
- Vender (caixa / PosScreen): busca de produto e escolha da cliente. No caixa, depois de
  escolher o produto, o campo limpa para lançar o próximo (limparAoEscolher).
- Clientes, Fiado, Boletos, Consultar Vendas, Agenda e Rotas: busca de cliente.
- Produtos / Estoque: busca de produto.
- Loja pública /loja/[slug]: busca de produto.
- Agente de IA do app: quando eu citar uma cliente ou um produto pelo nome, ele procura com
  a mesma função (buscar) e, se houver mais de um parecido, me pergunta qual é.
- Achou outro campo de busca de cliente ou produto? Me mostre a lista antes de mexer.

O código já está pronto e testado (17 testes da busca + 6 da caixa de sugestões,
TypeScript no modo estrito). Ele vem no fim desta mensagem:
- src/lib/buscaInteligente.ts → o motor da busca. Não depende de nenhuma biblioteca.
- src/components/CampoBusca.tsx → a caixa com as sugestões. Ajuste o import do motor
  para o caminho do projeto e adapte o visual às classes e cores do projeto
  (props "classes"). Não use cor fixa: rode npm run verificar-cores.
- Os testes também vêm no fim; adapte ao jeito de testar do projeto.

Como fazer (regras da casa, inegociáveis)
1. Trabalhe numa branch nova (ex.: busca-inteligente). Nada direto na principal.
2. Leia antes: HISTORICO.md, AGENTS.md e como cada tela busca hoje (filtra a lista no
   navegador ou consulta o servidor). Leia também o guia em node_modules/next/dist/docs/
   antes de escrever rota, cache ou API.
3. Se a tela já tem a lista carregada no navegador: use o CampoBusca (ou a função buscar)
   direto. Funciona sem internet.
4. Se a busca é feita no servidor: no SQLite, o `contains` do Prisma NÃO ignora acento
   ("José" ≠ "Jose"), só ignora maiúscula em letra sem acento ("É" ≠ "é") e não aceita erro
   de digitação. Me explique as duas opções e me deixe escolher ANTES de mexer no banco:
   a) carregar a lista de clientes ou produtos da empresa no navegador (com cache) e buscar
      com o buscaInteligente. É mais simples, funciona sem internet e aguenta milhares de
      itens;
   b) guardar um campo "nomeBusca" já normalizado (com a função normalizar), procurar nele
      no servidor e depois ordenar com buscar(). Isso é mudança no banco: siga o padrão de
      src/lib/migracoesLeves.ts e me avise antes, explicando em uma frase o porquê.
5. Uma regra só no app inteiro: antes de criar algo, procure funções que já comparam nomes
   ignorando maiúscula e acento (por exemplo chaveDoNome, do cadastro de formas de
   pagamento) e faça todas usarem a função normalizar. Nada de duas funções fazendo a
   mesma conta de jeitos diferentes.
6. Sem internet: a lista de clientes e produtos que a busca usa tem que estar guardada no
   aparelho (veja lib/offline.ts e public/sw.js). Teste com a internet desligada.
7. Toda consulta filtra pela empresa logada (businessId). Permissões conferidas no servidor.
8. O índice da busca só é montado quando a lista muda (o componente já faz isso com
   useMemo). Passe "texto" e "extras" como funções estáveis (fora do componente ou com
   useCallback), senão o índice é refeito a cada letra.
9. Nunca mostre segredos (.env, chaves). Nunca apague nada sem me perguntar.
10. Nunca mexa na minha instalação do computador em C:\Users\lossa\WorkDistri (a pasta
    dados ali tem o meu banco real). Gere e teste o pacote novo só na pasta dist do projeto,
    numa empresa de teste.
11. Tudo passa por: npx tsc --noEmit, npm run lint, npm run build, npm run verificar-cores e
   os testes. Todo comportamento novo ganha um teste.
12. Registre no HISTORICO.md o que mudou e por quê.
13. Antes de mudanças grandes de tela, me mostre o antes e o depois em print (celular
    390 px e computador 1280 px) e espere o meu ok.
14. Nunca publique (Railway) sem a minha confirmação explícita.

No fim, me entregue um relatório simples (o que foi feito, em quais telas, como testar e o
que ficou pendente) e esta lista de conferência marcada:
[ ] "jose", "JOSE" e "José" acham a mesma cliente.
[ ] Um nome com 1 letra errada aparece com "você quis dizer?".
[ ] No caixa: digito "progresiva", aperto Enter, o produto entra na venda e o campo limpa.
[ ] No celular, sem internet, a busca continua funcionando.
[ ] Com mais de 1.000 clientes, as sugestões aparecem sem travar.
[ ] Uma empresa nunca vê clientes ou produtos de outra.
[ ] O programa do computador (pacote novo, numa pasta temporária) também sugere certo.
Depois pergunte: "Posso publicar?"

===== src/lib/buscaInteligente.ts =====
```ts
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
```

===== src/components/CampoBusca.tsx =====
```tsx
"use client";

/**
 * Caixa de busca com sugestões do DistriWork.
 *
 * Mostra as sugestões embaixo do campo enquanto a pessoa digita, sem ligar para
 * acento, maiúscula ou erro de digitação (veja buscaInteligente.ts).
 * Teclado: ↓ e ↑ andam pelas sugestões, Enter escolhe, Esc fecha.
 *
 * As cores e o visual ficam com as classes do projeto (props `classes`).
 * Passe `texto` e `extras` como funções estáveis (fora do componente ou com useCallback):
 * o índice da busca só é refeito quando a lista ou essas funções mudam.
 */

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { buscar, criarIndice, dividirParaDestaque, type Sugestao } from "./buscaInteligente";

export interface ClassesCampoBusca {
  raiz?: string;
  campo?: string;
  lista?: string;
  sugestao?: string;
  sugestaoAtiva?: string;
  destaque?: string;
  detalhe?: string;
  aviso?: string;
  vazio?: string;
}

export interface CampoBuscaProps<T> {
  /** A lista onde procurar (clientes, produtos...). */
  itens: readonly T[];
  /** Texto principal de cada item (o nome). */
  texto: (item: T) => string;
  /** Outros textos que também valem na busca: salão, apelido, telefone, código, marca. */
  extras?: (item: T) => Array<string | null | undefined>;
  /** Chave única de cada item (o id). */
  chave: (item: T) => string | number;
  /** O que fazer quando a pessoa escolhe uma sugestão. */
  onEscolher: (item: T) => void;
  /** Linha pequena embaixo do nome (ex.: cidade, preço, estoque). */
  detalhe?: (item: T) => ReactNode;
  placeholder?: string;
  rotulo?: string;
  limite?: number;
  /** Limpa o campo depois de escolher (bom no caixa, para lançar o próximo produto). */
  limparAoEscolher?: boolean;
  autoFocus?: boolean;
  textoSemResultado?: string;
  classes?: ClassesCampoBusca;
}

export function CampoBusca<T>({
  itens,
  texto,
  extras,
  chave,
  onEscolher,
  detalhe,
  placeholder = "Digite um nome...",
  rotulo,
  limite = 8,
  limparAoEscolher = false,
  autoFocus = false,
  textoSemResultado = "Nada encontrado. Confira o que foi digitado.",
  classes = {},
}: CampoBuscaProps<T>) {
  const [digitado, setDigitado] = useState("");
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(0);
  const idLista = useId();
  const raiz = useRef<HTMLDivElement>(null);

  // O índice só é refeito quando a lista muda, não a cada letra.
  const indice = useMemo(() => criarIndice(itens, { texto, extras }), [itens, texto, extras]);
  const sugestoes = useMemo(() => buscar(indice, digitado, { limite }), [indice, digitado, limite]);

  useEffect(() => setAtiva(0), [digitado]);

  useEffect(() => {
    function fecharAoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberta(false);
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  function escolher(sugestao: Sugestao<T>) {
    onEscolher(sugestao.item);
    setDigitado(limparAoEscolher ? "" : sugestao.texto);
    setAberta(false);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAberta(true);
      setAtiva((i) => Math.min(i + 1, sugestoes.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtiva((i) => Math.max(i - 1, 0));
    } else if (evento.key === "Enter" && aberta && sugestoes[ativa]) {
      evento.preventDefault();
      escolher(sugestoes[ativa]);
    } else if (evento.key === "Escape") {
      setAberta(false);
    }
  }

  const mostrarLista = aberta && digitado.trim() !== "";
  const idAtiva = sugestoes[ativa] ? `${idLista}-${ativa}` : undefined;

  return (
    <div ref={raiz} className={classes.raiz} style={{ position: "relative" }}>
      <input
        type="search"
        role="combobox"
        aria-label={rotulo ?? placeholder}
        aria-expanded={mostrarLista}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={mostrarLista ? idAtiva : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={digitado}
        className={classes.campo}
        onChange={(evento) => {
          setDigitado(evento.target.value);
          setAberta(true);
        }}
        onFocus={() => setAberta(true)}
        onKeyDown={aoTeclar}
      />

      {mostrarLista && (
        <ul id={idLista} role="listbox" className={classes.lista} style={{ position: "absolute", left: 0, right: 0, zIndex: 50 }}>
          {sugestoes.length === 0 && <li className={classes.vazio}>{textoSemResultado}</li>}
          {sugestoes.map((sugestao, posicao) => (
            <li
              key={chave(sugestao.item)}
              id={`${idLista}-${posicao}`}
              role="option"
              aria-selected={posicao === ativa}
              className={posicao === ativa ? classes.sugestaoAtiva ?? classes.sugestao : classes.sugestao}
              onMouseEnter={() => setAtiva(posicao)}
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={() => escolher(sugestao)}
            >
              <span>
                {dividirParaDestaque(sugestao.texto, sugestao.trechos).map((parte, i) =>
                  parte.destaque ? (
                    <strong key={i} className={classes.destaque}>
                      {parte.texto}
                    </strong>
                  ) : (
                    <span key={i}>{parte.texto}</span>
                  ),
                )}
              </span>
              {sugestao.aproximado && <small className={classes.aviso}> · você quis dizer?</small>}
              {detalhe && <div className={classes.detalhe}>{detalhe(sugestao.item)}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

===== testes: buscaInteligente.test.ts (node:test; adapte ao projeto) =====
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buscar, criarIndice, dividirParaDestaque, distancia, normalizar, sugerir } from "./buscaInteligente.ts";

interface Cliente {
  nome: string;
  salao?: string;
  telefone?: string;
}

const clientes: Cliente[] = [
  { nome: "José da Silva", salao: "Studio Zé" },
  { nome: "João Pedro Martins" },
  { nome: "Mônica Souza", salao: "Espaço Mônica", telefone: "(55) 99999-1234" },
  { nome: "Maria da Conceição" },
  { nome: "Ana Paula Ribeiro" },
  { nome: "Mariana Lopes" },
  { nome: "Juliana Ávila" },
  { nome: "Luís Fernando" },
  { nome: "Thaís Gonçalves" },
  { nome: "Ada Nunes" },
  { nome: "Carla Brandão", salao: "Salão Bela Vista" },
];

const produtos = [
  "Progressiva Sem Formol SouthLiss 1L",
  "Descolorante Aella DX 500g",
  "Aella OX 20 Volumes 900ml",
  "Aella OX 30 Volumes 900ml",
  "Ghoodess Alinhamento Líquido",
  "Ghoodess Blond Repair Home Care",
  "SouthLiss Keraplus Reconstrutor",
  "Máscara Nutri Premium SouthLiss",
  "Matizador Aella VX Vegan",
];

const indiceClientes = criarIndice(clientes, { texto: (c) => c.nome, extras: (c) => [c.salao, c.telefone] });
const indiceProdutos = criarIndice(produtos, { texto: (p) => p });
const nomes = (digitado: string) => buscar(indiceClientes, digitado).map((s) => s.texto);
const nomesProdutos = (digitado: string) => buscar(indiceProdutos, digitado).map((s) => s.texto);

test("normalizar tira acento, cedilha, maiúscula e símbolos", () => {
  assert.equal(normalizar("  JOSÉ   da  Conceição! "), "jose da conceicao");
  assert.equal(normalizar("Ávila-Gonçalves"), "avila goncalves");
  assert.equal(normalizar("OX 20 Vol."), "ox 20 vol");
  assert.equal(normalizar(null), "");
});

test("acento e maiúscula não fazem diferença", () => {
  for (const digitado of ["jose", "JOSE", "José", "jOsÉ", "josé"]) {
    assert.equal(nomes(digitado)[0], "José da Silva", digitado);
  }
  assert.equal(nomes("monica")[0], "Mônica Souza");
  assert.equal(nomes("MÔNICA")[0], "Mônica Souza");
  assert.equal(nomes("joao")[0], "João Pedro Martins");
  assert.equal(nomes("conceicao")[0], "Maria da Conceição");
  assert.equal(nomes("thais goncalves")[0], "Thaís Gonçalves");
  assert.equal(nomes("avila")[0], "Juliana Ávila");
});

test("sugere enquanto digita, pelo começo da palavra", () => {
  assert.deepEqual(nomes("jo").slice(0, 2).sort(), ["José da Silva", "João Pedro Martins"].sort());
  assert.equal(nomesProdutos("desco")[0], "Descolorante Aella DX 500g");
  assert.equal(nomesProdutos("kera")[0], "SouthLiss Keraplus Reconstrutor");
});

test("aceita erro de digitação", () => {
  assert.equal(nomesProdutos("progresiva")[0], "Progressiva Sem Formol SouthLiss 1L");
  assert.equal(nomesProdutos("prgressiva")[0], "Progressiva Sem Formol SouthLiss 1L");
  assert.equal(nomesProdutos("porgressiva")[0], "Progressiva Sem Formol SouthLiss 1L");
  assert.equal(nomesProdutos("ghodess")[0].startsWith("Ghoodess"), true);
  assert.equal(nomesProdutos("southlis")[0].includes("SouthLiss"), true);
  assert.equal(nomes("luiz")[0], "Luís Fernando");
  assert.equal(nomes("monika")[0], "Mônica Souza");
  assert.equal(nomes("julinaa")[0], "Juliana Ávila");
});

test("erro de digitação no meio da digitação (palavra ainda incompleta)", () => {
  assert.equal(nomesProdutos("progrs")[0], "Progressiva Sem Formol SouthLiss 1L");
  assert.equal(nomesProdutos("matiza")[0], "Matizador Aella VX Vegan");
  assert.equal(nomesProdutos("matisa")[0], "Matizador Aella VX Vegan");
});

test("palavras fora de ordem e nome pela metade", () => {
  assert.equal(nomes("silva jose")[0], "José da Silva");
  assert.equal(nomes("mar conc")[0], "Maria da Conceição");
  assert.equal(nomesProdutos("ox 30")[0], "Aella OX 30 Volumes 900ml");
  assert.equal(nomesProdutos("aella ox 20")[0], "Aella OX 20 Volumes 900ml");
  assert.equal(nomesProdutos("liquido alinhamento")[0], "Ghoodess Alinhamento Líquido");
});

test("ordem das sugestões: começo do nome antes do meio", () => {
  const resultado = nomes("ana");
  assert.equal(resultado[0], "Ana Paula Ribeiro");
  assert.ok(resultado.indexOf("Mariana Lopes") > 0);
  assert.ok(resultado.indexOf("Juliana Ávila") > 0);
});

test("o que bate certinho vem antes do que foi achado por aproximação", () => {
  const resultado = buscar(indiceClientes, "ana");
  const primeiroAproximado = resultado.findIndex((s) => s.aproximado);
  if (primeiroAproximado >= 0) {
    assert.ok(resultado.slice(primeiroAproximado).every((s) => s.aproximado));
  }
});

test("não inventa parecido demais em palavras curtas", () => {
  assert.ok(!nomes("ana").includes("Ada Nunes"));
  assert.deepEqual(nomes("xyz"), []);
  assert.deepEqual(nomesProdutos("shampoo"), []);
});

test("se nada bate com todas as palavras, sugere o que bate com parte delas", () => {
  const resultado = buscar(indiceClientes, "maria conseissao");
  assert.equal(resultado[0].texto, "Maria da Conceição");
  assert.equal(resultado[0].aproximado, true);
  assert.deepEqual(nomes("xyz qwe"), []);
  assert.deepEqual(nomesProdutos("xampu de cachorro"), []);
  assert.equal(nomes("maria de conseissao")[0], "Maria da Conceição");
  assert.ok(nomes("silva joao").every((n) => n === "João Pedro Martins" || n === "José da Silva"));
});

test("também procura no salão e no telefone", () => {
  assert.equal(nomes("bela vista")[0], "Carla Brandão");
  assert.equal(nomes("studio ze")[0], "José da Silva");
  assert.equal(nomes("99999")[0], "Mônica Souza");
});

test("busca vazia não sugere nada, e o limite é respeitado", () => {
  assert.deepEqual(nomes(""), []);
  assert.deepEqual(nomes("   "), []);
  assert.equal(buscar(indiceProdutos, "a", { limite: 3 }).length, 3);
});

test("sem aproximação, só aceita o que bate", () => {
  assert.deepEqual(buscar(indiceProdutos, "progresiva", { aproximar: false }), []);
});

test("destaca o pedaço certo do nome original, com acento", () => {
  const [primeira] = buscar(indiceClientes, "conceicao");
  const partes = dividirParaDestaque(primeira.texto, primeira.trechos);
  assert.deepEqual(partes, [
    { texto: "Maria da ", destaque: false },
    { texto: "Conceição", destaque: true },
  ]);
  const [jo] = buscar(indiceClientes, "MONI");
  assert.deepEqual(dividirParaDestaque(jo.texto, jo.trechos)[0], { texto: "Môni", destaque: true });
});

test("distância entre palavras", () => {
  assert.equal(distancia("casa", "casa"), 0);
  assert.equal(distancia("progresiva", "progressiva"), 1);
  assert.equal(distancia("porgressiva", "progressiva"), 1);
  assert.equal(distancia("abc", "xyz", 1), 2);
});

test("sugerir funciona sem montar o índice antes", () => {
  const [primeira] = sugerir(produtos, "blond", { texto: (p) => p, limite: 1 });
  assert.equal(primeira.texto, "Ghoodess Blond Repair Home Care");
});

test("lista grande continua rápida", () => {
  const muitos = Array.from({ length: 5000 }, (_, i) => `Cliente Número ${i} de São Borja`);
  muitos.push("Rosângela Fagundes");
  const indice = criarIndice(muitos, { texto: (t) => t });
  const comeco = performance.now();
  for (const digitado of ["r", "ro", "ros", "rosa", "rosan", "rosang", "rosangela"]) buscar(indice, digitado);
  const tempoPorLetra = (performance.now() - comeco) / 7;
  assert.equal(buscar(indice, "rosangela")[0].texto, "Rosângela Fagundes");
  assert.ok(tempoPorLetra < 50, `cada letra levou ${tempoPorLetra.toFixed(1)} ms`);
});
```

===== testes: CampoBusca.test.tsx (node:test + Testing Library; adapte ao projeto) =====
```tsx
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CampoBusca } from "./CampoBusca";

interface Produto {
  id: number;
  nome: string;
  marca: string;
}

const produtos: Produto[] = [
  { id: 1, nome: "Progressiva Sem Formol 1L", marca: "SouthLiss" },
  { id: 2, nome: "Descolorante DX 500g", marca: "Aella" },
  { id: 3, nome: "Alinhamento Líquido", marca: "Ghoodess" },
  { id: 4, nome: "Máscara Nutri Premium", marca: "SouthLiss" },
];

afterEach(cleanup);

const texto = (p: Produto) => p.nome;
const extras = (p: Produto) => [p.marca];
const chave = (p: Produto) => p.id;

function montar(onEscolher: (p: Produto) => void, limparAoEscolher = false) {
  render(
    <CampoBusca
      itens={produtos}
      texto={texto}
      extras={extras}
      chave={chave}
      onEscolher={onEscolher}
      placeholder="Buscar produto"
      limparAoEscolher={limparAoEscolher}
    />,
  );
  return screen.getByRole("combobox");
}

test("mostra sugestões enquanto digita, mesmo sem acento e com erro", () => {
  const campo = montar(() => {});
  fireEvent.change(campo, { target: { value: "MASCARA" } });
  assert.equal(screen.getAllByRole("option")[0].textContent?.startsWith("Máscara Nutri Premium"), true);
  fireEvent.change(campo, { target: { value: "progresiva" } });
  const [primeira] = screen.getAllByRole("option");
  assert.match(primeira.textContent ?? "", /Progressiva Sem Formol 1L/);
  assert.match(primeira.textContent ?? "", /você quis dizer\?/);
});

test("acha pela marca também", () => {
  const campo = montar(() => {});
  fireEvent.change(campo, { target: { value: "ghoodes" } });
  assert.match(screen.getAllByRole("option")[0].textContent ?? "", /Alinhamento Líquido/);
});

test("setas e Enter escolhem a sugestão", () => {
  const escolhidos: Produto[] = [];
  const campo = montar((p) => escolhidos.push(p));
  fireEvent.change(campo, { target: { value: "southliss" } });
  const opcoes = screen.getAllByRole("option");
  assert.equal(opcoes.length, 2);
  assert.equal(opcoes[0].getAttribute("aria-selected"), "true");
  const segunda = opcoes[1].textContent ?? "";
  fireEvent.keyDown(campo, { key: "ArrowDown" });
  assert.equal(screen.getAllByRole("option")[1].getAttribute("aria-selected"), "true");
  fireEvent.keyDown(campo, { key: "Enter" });
  assert.equal(escolhidos.length, 1);
  assert.ok(segunda.startsWith(escolhidos[0].nome));
  assert.equal((campo as HTMLInputElement).value, escolhidos[0].nome);
  assert.equal(screen.queryByRole("listbox"), null);
});

test("clique escolhe, e no caixa o campo limpa para o próximo produto", () => {
  const escolhidos: Produto[] = [];
  const campo = montar((p) => escolhidos.push(p), true);
  fireEvent.change(campo, { target: { value: "desco" } });
  fireEvent.click(screen.getAllByRole("option")[0]);
  assert.equal(escolhidos[0].id, 2);
  assert.equal((campo as HTMLInputElement).value, "");
});

test("avisa quando não acha nada e Esc fecha a lista", () => {
  const campo = montar(() => {});
  fireEvent.change(campo, { target: { value: "xampu de cachorro" } });
  assert.match(screen.getByRole("listbox").textContent ?? "", /Nada encontrado/);
  fireEvent.keyDown(campo, { key: "Escape" });
  assert.equal(screen.queryByRole("listbox"), null);
});

test("destaca em negrito o pedaço que bateu", () => {
  const campo = montar(() => {});
  fireEvent.change(campo, { target: { value: "liquido" } });
  const negrito = screen.getAllByRole("option")[0].querySelector("strong");
  assert.equal(negrito?.textContent, "Líquido");
});
```
````
