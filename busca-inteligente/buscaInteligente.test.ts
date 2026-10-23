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
