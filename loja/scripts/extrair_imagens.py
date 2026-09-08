#!/usr/bin/env python3
"""Recorta as fotos dos produtos do catálogo em PDF da Aella.

Cada página do PDF é uma imagem única (480x270) exportada do Canva, sem camada
de texto. O script localiza a embalagem em cada página, recorta e salva em
imagens/<slug>.webp.

Como a embalagem é encontrada: monta-se uma máscara de "tinta" (pixels não
brancos), removem-se as áreas fixas de texto do layout (coluna esquerda,
cabeçalho, logo) e ficam os componentes altos e densos o bastante para serem
uma embalagem. Texto sobra em componentes baixos e esparsos, que são
descartados.

Uso:  python3 scripts/extrair_imagens.py caminho/para/catalogo.pdf
Requer: pymupdf, pillow, scipy, numpy
"""
import io
import pathlib
import sys

import numpy as np
import pymupdf
from PIL import Image
from scipy import ndimage

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'imagens'
ESCALA = 4      # ampliação final (o PDF só tem 480x270 por página)
MARGEM = 3      # folga em pixels ao redor do recorte
INK = 248       # abaixo disso o pixel conta como tinta

# (slug, página do PDF, seletor)
#   ('c', i)      -> i-ésima embalagem da página
#   ('col', i, n) -> i-ésima de n embalagens lado a lado
SPEC = [
    ('rx-shampoo-restauracao-profunda',       5,  ('c', 0)),
    ('rx-mascara-reconstrucao-profunda',      6,  ('c', 0)),
    ('rx-leave-in-hidra-frizz',               7,  ('c', 0)),
    ('rx-liquid-mask',                        8,  ('c', 0)),
    ('fx-reconstrutor-essencial',            10,  ('c', 0)),
    ('fx-perfect-liss',                      11,  ('c', 0)),
    ('fx-serum',                             12,  ('c', 0)),
    ('nx-shampoo-nutricao-intensiva',        14,  ('c', 0)),
    ('nx-mascara-nutricao',                  15,  ('c', 0)),
    ('dx-po-descolorante-blue',              17,  ('c', 0)),
    ('dx-po-descolorante-white',             18,  ('c', 0)),
    ('ox-06-volumes',                        19,  ('col', 0, 4)),
    ('ox-20-volumes',                        19,  ('col', 1, 4)),
    ('ox-30-volumes',                        19,  ('col', 2, 4)),
    ('ox-40-volumes',                        19,  ('col', 3, 4)),
    ('cx-coloracao',                         20,  ('c', 0)),
    ('cx-luster-up-tonalize',                21,  ('c', 0)),
    ('lx-botox-matize',                      22,  ('c', 0)),
    ('vx-vegan-prime',                       23,  ('c', 0)),
    ('hc-shampoo-restauracao-profunda',      25,  ('c', 0)),
    ('hc-condicionador-restauracao-profunda', 25, ('c', 1)),
    ('hc-shampoo-liss',                      26,  ('c', 0)),
    ('hc-condicionador-liss',                26,  ('c', 1)),
    ('hc-shampoo-matize',                    27,  ('c', 0)),
    ('hc-condicionador-matize',              27,  ('c', 1)),
    ('hc-mascara-matize',                    28,  ('c', 0)),
    ('hc-shampoo-pos-quimica',               29,  ('c', 0)),
    ('hc-condicionador-pos-quimica',         29,  ('c', 1)),
]


def mascara(pagina: Image.Image):
    """Tinta da página, sem as áreas fixas de texto do layout do catálogo."""
    a = np.asarray(pagina.convert('L'))
    H, W = a.shape
    m = a < INK
    m[:, :int(W * 0.30)] = False               # coluna de título/descrição/ficha
    m[:int(H * 0.10), :int(W * 0.25)] = False  # "APRESENTAÇÃO COMERCIAL"
    m[:int(H * 0.12), int(W * 0.84):] = False  # logo aella
    return m, W, H


def embalagens(m, W, H, min_h=0.25, min_dens=0.28, dil=3):
    """Caixas das embalagens: componentes altos e densos, unidos por proximidade."""
    lab, _ = ndimage.label(ndimage.binary_dilation(m, np.ones((dil, dil), bool)))
    caixas = []
    for fatia in ndimage.find_objects(lab):
        ys, xs = fatia
        if (ys.stop - ys.start) / H < min_h:
            continue
        if m[ys, xs].mean() < min_dens:        # texto é esparso, embalagem é densa
            continue
        caixas.append([xs.start, ys.start, xs.stop, ys.stop])
    caixas.sort()
    unidas = []
    for c in caixas:
        if unidas and c[0] <= unidas[-1][2] + W * 0.01:
            p = unidas[-1]
            p[1] = min(p[1], c[1]); p[2] = max(p[2], c[2]); p[3] = max(p[3], c[3])
        else:
            unidas.append(c)
    return unidas


def faixas(m, caixa, largura_minima=0.03):
    """Colunas contínuas de tinta dentro da caixa."""
    x0, y0, x1, y1 = caixa
    col = m[y0:y1, x0:x1].sum(axis=0)
    limite = max(1, col.max() * 0.06)
    saida, inicio = [], None
    for i, v in enumerate(col):
        if v > limite and inicio is None:
            inicio = i
        elif v <= limite and inicio is not None:
            saida.append((inicio, i)); inicio = None
    if inicio is not None:
        saida.append((inicio, len(col)))
    return [f for f in saida if f[1] - f[0] > (x1 - x0) * largura_minima]


def aparar(m, caixa, proporcao=0.25):
    """Descarta sobras estreitas de texto e reajusta os limites verticais."""
    fs = faixas(m, caixa, largura_minima=0)
    if not fs:
        return caixa
    maior = max(b - a for a, b in fs)
    manter = [f for f in fs if (f[1] - f[0]) >= maior * proporcao]
    x0, y0, _, y1 = caixa
    nx0, nx1 = x0 + manter[0][0], x0 + manter[-1][1]
    linhas = m[y0:y1, nx0:nx1].sum(axis=1).nonzero()[0]
    if len(linhas):
        y0, y1 = y0 + linhas[0], y0 + linhas[-1] + 1
    return [nx0, y0, nx1, y1]


def main(pdf: str) -> int:
    doc = pymupdf.open(pdf)
    SAIDA.mkdir(exist_ok=True)
    paginas = {}
    for slug, npag, sel in SPEC:
        if npag not in paginas:
            xref = doc[npag - 1].get_images(full=True)[0][0]
            bruta = doc.extract_image(xref)
            paginas[npag] = Image.open(io.BytesIO(bruta['image']))
        pagina = paginas[npag]
        m, W, H = mascara(pagina)
        caixas = embalagens(m, W, H)
        # a coluna de texto à direita (páginas com dois produtos) fica além de 0.70
        caixas = [c for c in caixas if c[2] / W < 0.70] or caixas
        if sel[0] == 'c':
            caixa = caixas[sel[1]]
        else:
            colunas = faixas(m, caixas[0])
            if len(colunas) != sel[2]:
                print(f'{slug}: esperava {sel[2]} embalagens, achei {len(colunas)}', file=sys.stderr)
                return 1
            a, b = colunas[sel[1]]
            caixa = [caixas[0][0] + a, caixas[0][1], caixas[0][0] + b, caixas[0][3]]
        x0, y0, x1, y1 = aparar(m, caixa)
        corte = pagina.convert('RGB').crop((max(0, x0 - MARGEM), max(0, y0 - MARGEM),
                                            min(W, x1 + MARGEM), min(H, y1 + MARGEM)))
        corte = corte.resize((corte.width * ESCALA, corte.height * ESCALA), Image.LANCZOS)
        corte.save(SAIDA / f'{slug}.webp', quality=88, method=6)
        print(f'{slug:42s} p{npag:02d}  {corte.width}x{corte.height}')
    print(f'\n{len(SPEC)} imagens em {SAIDA}')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        raise SystemExit(2)
    raise SystemExit(main(sys.argv[1]))
