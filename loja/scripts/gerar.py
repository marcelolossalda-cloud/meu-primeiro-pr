#!/usr/bin/env python3
"""Gera os arquivos finais do catálogo a partir de template.html + dados.js.

  loja.html               página completa, usa as imagens da pasta imagens/
  embed-hostinger.html    código para colar no elemento "Incorporar código" do
                          Hostinger Website Builder; as fotos vêm do GitHub
  embed-autocontido.html  o mesmo, com as 28 fotos embutidas em base64 (pesado,
                          mas não depende de nada externo)

Uso:  python3 scripts/gerar.py
"""
import base64
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent

# De onde o site carrega as fotos no embed-hostinger.html. Aponta para a pasta
# imagens/ deste repositório, na branch em que o catálogo está publicado.
# Se o catálogo for parar na branch main, troque o nome da branch aqui.
IMAGENS_URL = ('https://raw.githubusercontent.com/marcelolossalda-cloud/meu-primeiro-pr/'
               'claude/product-store-page-7o5bm4/loja/imagens/')


def main() -> int:
    template = (RAIZ / 'template.html').read_text(encoding='utf-8')
    dados = (RAIZ / 'dados.js').read_text(encoding='utf-8')

    if '/* {{DADOS}} */' not in template:
        print('template.html não tem o marcador {{DADOS}}', file=sys.stderr)
        return 1

    # — versão com imagens em arquivo —
    pagina = template.replace('/* {{DADOS}} */', dados.rstrip())
    (RAIZ / 'loja.html').write_text(pagina, encoding='utf-8')

    sem_titulo = lambda html: '\n'.join(l for l in html.splitlines() if not l.startswith('<title>'))

    # — embed para o Hostinger: código leve, fotos servidas pelo GitHub —
    marcador = "var CAMINHO_IMAGENS = 'imagens/';"
    if marcador not in pagina:
        print('template.html não tem a linha CAMINHO_IMAGENS esperada', file=sys.stderr)
        return 1
    hostinger = sem_titulo(pagina.replace(marcador, "var CAMINHO_IMAGENS = '%s';" % IMAGENS_URL))
    (RAIZ / 'embed-hostinger.html').write_text(hostinger, encoding='utf-8')

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

    bloco = sem_titulo(pagina.replace('var IMAGENS_EMBUTIDAS = {}; /* {{IMAGENS}} */', embutidas))
    (RAIZ / 'embed-autocontido.html').write_text(bloco, encoding='utf-8')

    kb = lambda p: (RAIZ / p).stat().st_size / 1024
    print('loja.html               %6.0f KB  (+ pasta imagens/, %.0f KB)'
          % (kb('loja.html'), sum(i.stat().st_size for i in imagens) / 1024))
    print('embed-hostinger.html    %6.0f KB  (fotos vindas de %s)' % (kb('embed-hostinger.html'), IMAGENS_URL))
    print('embed-autocontido.html  %6.0f KB  (%d fotos embutidas)' % (kb('embed-autocontido.html'), len(imagens)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
