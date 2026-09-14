#!/usr/bin/env python3
"""Gera o HTML completo do site a partir do fragmento da página.

O arquivo `pagina-de-vendas/index.html` é a fonte da verdade: ele contém
apenas <title>, <link>, <style> e o conteúdo da página, no formato que o
preview do Claude espera.

Este script embrulha esse fragmento num documento HTML completo — com
<!doctype>, <html lang="pt-BR">, charset, viewport e as metatags de SEO e
de compartilhamento — e escreve o resultado em `site/index.html`, que é o
arquivo pronto para subir em qualquer hospedagem.

Uso:  python3 pagina-de-vendas/build.py
"""

from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "pagina-de-vendas" / "index.html"
DESTINO = RAIZ / "site" / "index.html"

# Ajuste estes três valores quando definir o endereço final da página.
URL = "https://aula.marceloemilene.com/"
TITULO = "Loiro de Tinta na Prática — com Milene Kucera"
DESCRICAO = (
    "Aula prática para profissionais: acompanhe um caso real de correção de "
    "loiro de tinta, do diagnóstico do cabelo manchado à finalização. "
    "Com Milene Kucera. Descoloração segura, escolha de cor e volume de OX por região."
)

# Favicon em SVG embutido: fios dourados sobre fundo escuro.
FAVICON = (
    "data:image/svg+xml,"
    "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
    "%3Crect width='32' height='32' fill='%23151016'/%3E"
    "%3Cg stroke='%23E4B24A' stroke-width='3' stroke-linecap='round'%3E"
    "%3Cpath d='M9 7v18'/%3E%3Cpath d='M16 7v18'/%3E%3Cpath d='M23 7v18'/%3E"
    "%3C/g%3E%3C/svg%3E"
)

RESET = """    html { -webkit-text-size-adjust: 100%; }
    body { margin: 0; }
    img, video { max-width: 100%; height: auto; }
    [hidden] { display: none !important; }"""


def montar(fragmento: str) -> str:
    corte = fragmento.index("</style>") + len("</style>")
    cabeca, corpo = fragmento[:corte].strip(), fragmento[corte:].strip()

    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{DESCRICAO}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{URL}">
<link rel="icon" href="{FAVICON}">

<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Milene Kucera">
<meta property="og:url" content="{URL}">
<meta property="og:title" content="{TITULO}">
<meta property="og:description" content="{DESCRICAO}">
<!-- Ao ter a imagem de capa (1200x630), suba como capa.jpg e descomente: -->
<!-- <meta property="og:image" content="{URL}capa.jpg"> -->
<meta name="twitter:card" content="summary_large_image">

<style>
{RESET}
</style>

{cabeca}
</head>
<body>
{corpo}
</body>
</html>
"""


def main() -> None:
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    html = montar(ORIGEM.read_text(encoding="utf-8"))
    DESTINO.write_text(html, encoding="utf-8")
    print(f"{DESTINO.relative_to(RAIZ)} gerado — {len(html):,} bytes".replace(",", "."))


if __name__ == "__main__":
    main()
