"""Gera os arquivos finais de um catálogo a partir de template.html + dados.js.

  loja.html               página completa, usa as imagens da pasta imagens/
  embed-hostinger.html    código para colar no elemento "Incorporar código" do
                          Hostinger Website Builder; as fotos vêm do GitHub
  embed-autocontido.html  o mesmo, com as fotos embutidas em base64 (pesado,
                          mas não depende de nada externo)

Uso:  python3 scripts/gerar.py            (catálogo aella, na pasta loja/)
      python3 scripts/gerar.py ghoodess   (catálogo ghoodess, em loja/ghoodess/)
"""
import base64
import pathlib
import sys

LOJA = pathlib.Path(__file__).resolve().parent.parent
RAIZ = LOJA / sys.argv[1] if len(sys.argv) > 1 else LOJA

# De onde o site carrega as fotos no embed-hostinger.html: a pasta imagens/ do
# catálogo, neste repositório, na branch em que ele está publicado. Se o
# catálogo for parar na branch main, troque o nome da branch aqui.
# De onde o site carrega as fotos nos embeds. O endereço aponta para o commit
# exato em que as fotos foram gravadas pela última vez, e não para uma branch:
# assim continua funcionando mesmo depois de integrar na main e apagar a branch
# de trabalho. Se as fotos mudarem, commite-as antes de rodar este script.
import subprocess
REPO_RAW = 'https://raw.githubusercontent.com/marcelolossalda-cloud/meu-primeiro-pr/'

def ref_das_imagens(pasta: pathlib.Path) -> str:
    sujo = subprocess.run(['git', 'status', '--porcelain', '--', str(pasta)], capture_output=True, text=True).stdout.strip()
    if sujo:
        raise SystemExit(f'há fotos alteradas e não commitadas em {pasta}; commite antes de gerar os embeds')
    sha = subprocess.run(['git', 'log', '-1', '--format=%H', '--', str(pasta)], capture_output=True, text=True).stdout.strip()
    if not sha:
        raise SystemExit(f'nenhum commit encontrado para {pasta}')
    return sha

IMAGENS_URL = REPO_RAW + ref_das_imagens(RAIZ / 'imagens') + '/' + RAIZ.relative_to(LOJA.parent).as_posix() + '/imagens/'


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
    print('[%s]' % RAIZ.name)
    print('loja.html               %6.0f KB  (+ pasta imagens/, %.0f KB)'
          % (kb('loja.html'), sum(i.stat().st_size for i in imagens) / 1024))
    print('embed-hostinger.html    %6.0f KB  (fotos vindas de %s)' % (kb('embed-hostinger.html'), IMAGENS_URL))
    print('embed-autocontido.html  %6.0f KB  (%d fotos embutidas)' % (kb('embed-autocontido.html'), len(imagens)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
