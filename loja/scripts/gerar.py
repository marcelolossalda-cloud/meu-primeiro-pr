#!/usr/bin/env python3
"""Gera os arquivos finais do catálogo a partir de template.html + dados.js.

  loja.html            página completa, usa as imagens da pasta imagens/
  wordpress-bloco.html bloco único com as imagens embutidas, pronto para colar
                       num bloco "HTML personalizado" do WordPress

Uso:  python3 scripts/gerar.py
"""
import base64
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent


def main() -> int:
    template = (RAIZ / 'template.html').read_text(encoding='utf-8')
    dados = (RAIZ / 'dados.js').read_text(encoding='utf-8')

    if '/* {{DADOS}} */' not in template:
        print('template.html não tem o marcador {{DADOS}}', file=sys.stderr)
        return 1

    # — versão com imagens em arquivo —
    pagina = template.replace('/* {{DADOS}} */', dados.rstrip())
    (RAIZ / 'loja.html').write_text(pagina, encoding='utf-8')

    # — versão autocontida: imagens viram data URI —
    imagens = sorted((RAIZ / 'imagens').glob('*.webp'))
    if not imagens:
        print('nenhuma imagem em imagens/ — rode scripts/extrair_imagens.py antes', file=sys.stderr)
        return 1
    pares = []
    for img in imagens:
        b64 = base64.b64encode(img.read_bytes()).decode('ascii')
        pares.append("'%s':'data:image/webp;base64,%s'" % (img.stem, b64))
    embutidas = 'var IMAGENS_EMBUTIDAS = {' + ','.join(pares) + '};'

    bloco = pagina.replace('var IMAGENS_EMBUTIDAS = {}; /* {{IMAGENS}} */', embutidas)
    # o WordPress já fornece o título da página
    bloco = '\n'.join(l for l in bloco.splitlines() if not l.startswith('<title>'))
    (RAIZ / 'wordpress-bloco.html').write_text(bloco, encoding='utf-8')

    kb = lambda p: (RAIZ / p).stat().st_size / 1024
    print('loja.html             %7.0f KB  (+ pasta imagens/, %.0f KB)'
          % (kb('loja.html'), sum(i.stat().st_size for i in imagens) / 1024))
    print('wordpress-bloco.html  %7.0f KB  (autocontido, %d imagens embutidas)'
          % (kb('wordpress-bloco.html'), len(imagens)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
