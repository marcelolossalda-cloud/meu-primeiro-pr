#!/usr/bin/env python3
"""Recorta as fotos dos produtos do catálogo 2026 da Ghoodess (PDF do Canva).

Diferente do catálogo da Aella, este PDF traz as fotos embutidas em boa
resolução e, para vários produtos, já recortadas com transparência. Então:

  ('img', xref, recorte)  usa a imagem embutida de número xref, aplicando a
                          máscara de transparência sobre fundo branco;
  ('pag', n, recorte)     renderiza a página n a 220 dpi e recorta a região.
  ('par', (a, b), None)   duas imagens embutidas lado a lado, com um respiro entre elas.

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
    # Fotos inteiras, como estão no PDF. Onde a página corta a foto, a imagem
    # embutida costuma guardar o que ficou fora — por isso usamos o objeto e não
    # a página renderizada. Só o BTX perde a faixa vazia do topo.
    ('white-repair-po',           ('img', 3346, None)),
    ('agua-oxigenada',            ('img', 3394, None)),
    ('golden',                    ('img', 4886, None)),
    ('original-alinhamento',      ('img', 3602, (0.50, 0.00, 1.00, 1.00))),
    ('original-anti-residuos',    ('img', 3602, (0.00, 0.00, 0.52, 1.00))),
    ('original-homecare',         ('img', 3619, None)),
    ('pro-gold',                  ('img', 3704, None)),
    ('btx',                       ('img', 1553, (0.10, 0.52, 0.90, 1.00))),
    ('reparagy-profissional',     ('img', 3852, None)),
    ('reparagy-homecare',         ('img', 3978, None)),
    ('reparagy-bb-cream',         ('img', 4025, None)),
    ('nescuihair-profissional',   ('img', 4187, None)),
    ('nescuihair-homecare',       ('img', 4292, None)),
    ('nescuihair-bb-cream',       ('img', 4173, None)),
    ('blond-repair-profissional', ('img', 4322, None)),
    ('blond-repair-homecare',     ('img', 4353, None)),
    ('hydration',                 ('img', 4730, None)),
    ('hydration-kit',             ('img', 4612, None)),
    ('bruma-repair',              ('img', 5034, None)),
    ('strawberry',                ('img', 4544, None)),
    ('oil-repair',                ('img', 5368, None)),
    ('love-in-shine',             ('img', 5167, None)),
    ('curl-revival',              ('img', 5473, None)),
    ('herbal',                    ('img', 5568, None)),
    ('clean-repair',              ('par', (5680, 5686), None)),   # shampoo e condicionador lado a lado
    ('collors',                   ('img', 5721, None)),
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
        elif tipo == 'par':
            a, b = (imagem_embutida(doc, x) for x in ref)
            alt = max(a.height, b.height); folga = int(alt * 0.06)
            im = Image.new('RGB', (a.width + b.width + folga, alt), (255, 255, 255))
            im.paste(a, (0, alt - a.height)); im.paste(b, (a.width + folga, alt - b.height))
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
