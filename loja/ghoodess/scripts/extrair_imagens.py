#!/usr/bin/env python3
"""Recorta as fotos dos produtos do catálogo 2026 da Ghoodess (PDF do Canva).

Diferente do catálogo da Aella, este PDF traz as fotos embutidas em boa
resolução e, para vários produtos, já recortadas com transparência. Então:

  ('img', xref, recorte)  usa a imagem embutida de número xref, aplicando a
                          máscara de transparência sobre fundo branco;
  ('pag', n, recorte)     renderiza a página n a 220 dpi e recorta a região.

Recortes são frações (x0, y0, x1, y1) da largura e altura. As fotos são
salvas em imagens/<slug>.webp.

Uso:  python3 scripts/extrair_imagens.py caminho/para/catalogo.pdf
Requer: pymupdf, pillow
"""
import io
import pathlib
import sys

import pymupdf
from PIL import Image, ImageFilter

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'imagens'
LADO_MAXIMO = 1100
QUALIDADE = 84

SPEC = [
    ('white-repair-po',           ('pag', 2,  (0.16, 0.20, 0.80, 0.70))),
    ('agua-oxigenada',            ('pag', 3,  (0.02, 0.55, 0.56, 0.99))),
    ('golden',                    ('img', 4886, (0.55, 0.10, 1.00, 1.00))),
    ('original-alinhamento',      ('img', 3602, (0.50, 0.00, 1.00, 1.00))),
    ('original-anti-residuos',    ('img', 3602, (0.00, 0.00, 0.52, 1.00))),
    ('original-homecare',         ('pag', 5,  (0.36, 0.48, 0.96, 0.99))),
    ('pro-gold',                  ('pag', 7,  (0.58, 0.66, 0.82, 1.00))),
    ('btx',                       ('pag', 8,  (0.26, 0.56, 0.74, 1.00))),
    ('reparagy-profissional',     ('pag', 9,  (0.10, 0.68, 0.78, 1.00))),
    ('reparagy-homecare',         ('pag', 10, (0.46, 0.53, 0.90, 0.94))),
    ('reparagy-bb-cream',         ('pag', 11, (0.22, 0.62, 0.72, 1.00))),
    ('nescuihair-profissional',   ('pag', 13, (0.20, 0.55, 1.00, 1.00))),
    ('nescuihair-homecare',       ('pag', 14, (0.28, 0.72, 0.74, 0.97))),
    ('nescuihair-bb-cream',       ('img', 4173, None)),
    ('blond-repair-profissional', ('pag', 15, (0.36, 0.36, 0.78, 0.92))),
    ('blond-repair-homecare',     ('pag', 16, (0.20, 0.70, 0.68, 1.00))),
    ('hydration',                 ('pag', 21, (0.66, 0.46, 1.00, 0.96))),
    ('hydration-kit',             ('pag', 20, (0.30, 0.70, 0.74, 1.00))),
    ('bruma-repair',              ('img', 5034, None)),
    ('strawberry',                ('img', 4544, None)),
    ('oil-repair',                ('img', 5368, None)),
    ('love-in-shine',             ('img', 5167, None)),
    ('curl-revival',              ('img', 5473, None)),
    ('herbal',                    ('pag', 30, (0.52, 0.42, 0.94, 0.90))),
    ('clean-repair',              ('pag', 31, (0.42, 0.40, 0.90, 0.95))),
    ('collors',                   ('pag', 33, (0.60, 0.72, 1.00, 1.00))),
]


def imagem_embutida(doc, xref):
    """Imagem de número xref com a máscara de transparência aplicada sobre branco."""
    base = Image.open(io.BytesIO(doc.extract_image(xref)['image'])).convert('RGB')
    smask = doc.xref_get_key(xref, 'SMask')
    if smask and smask[0] == 'xref':
        num = int(smask[1].split()[0])
        mascara = Image.open(io.BytesIO(doc.extract_image(num)['image'])).convert('L')
        if mascara.size != base.size:
            mascara = mascara.resize(base.size, Image.LANCZOS)
        fundo = Image.new('RGB', base.size, (255, 255, 255))
        fundo.paste(base, mask=mascara)
        return fundo
    return base


def acabar(im):
    if max(im.size) > LADO_MAXIMO:
        r = LADO_MAXIMO / max(im.size)
        im = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    return im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=35, threshold=3))


def main(pdf):
    doc = pymupdf.open(pdf)
    SAIDA.mkdir(exist_ok=True)
    for slug, (tipo, ref, caixa) in SPEC:
        if tipo == 'pag':
            pix = doc[ref - 1].get_pixmap(dpi=220)
            im = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
        else:
            im = imagem_embutida(doc, ref)
        if caixa:
            W, H = im.size
            im = im.crop((int(W * caixa[0]), int(H * caixa[1]), int(W * caixa[2]), int(H * caixa[3])))
        im = acabar(im)
        im.save(SAIDA / f'{slug}.webp', quality=QUALIDADE, method=6)
        print(f'{slug:28s} {im.width:4d}x{im.height:4d}')
    print(f'\n{len(SPEC)} imagens em {SAIDA}')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        raise SystemExit(2)
    raise SystemExit(main(sys.argv[1]))
