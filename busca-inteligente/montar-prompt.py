"""Monta PROMPT-busca-inteligente.md a partir do modelo, com o código atual embutido.

Rode de novo sempre que mudar buscaInteligente.ts, CampoBusca.tsx ou os testes:
    python3 busca-inteligente/montar-prompt.py
"""

from pathlib import Path

pasta = Path(__file__).resolve().parent
modelo = (pasta / "PROMPT-modelo.md").read_text(encoding="utf-8")
trocas = {
    "{{BUSCA_TS}}": "buscaInteligente.ts",
    "{{CAMPO_TSX}}": "CampoBusca.tsx",
    "{{BUSCA_TEST}}": "buscaInteligente.test.ts",
    "{{CAMPO_TEST}}": "CampoBusca.test.tsx",
}
for marcador, arquivo in trocas.items():
    assert modelo.count(marcador) == 1, marcador
    modelo = modelo.replace(marcador, (pasta / arquivo).read_text(encoding="utf-8").rstrip())

(pasta / "PROMPT-busca-inteligente.md").write_text(modelo, encoding="utf-8")
print("PROMPT-busca-inteligente.md montado")
