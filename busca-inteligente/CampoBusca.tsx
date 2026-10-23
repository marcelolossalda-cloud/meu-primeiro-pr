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
