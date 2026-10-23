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
