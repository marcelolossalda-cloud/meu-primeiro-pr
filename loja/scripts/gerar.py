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
    gerar_publicar()
    return 0


# ─────────────────────────────────────────────────────────────────────────────
# publicar.html: painel local com o código das marcas e o comando para a
# extensão do navegador executar a publicação no Hostinger.
MARCAS_PUBLICAR = [
    # (id, nome, pasta, nome da página no editor do Hostinger)
    ('ghoodess', 'Ghoodess', LOJA / 'ghoodess', 'Ghoodess'),
    ('aella', 'aella Professional', LOJA, 'Loja'),
]

COMANDO_PUBLICAR = (
    'Você vai publicar catálogos de produtos no meu site, que é feito no Hostinger Website Builder. '
    'Eu já estou logado no editor. O código de cada catálogo está na aba "Publicar catálogos", que tem um '
    'botão "Copiar código" para cada marca. Não digite o código: sempre copie pelo botão e cole com Ctrl+V.\n\n'
    'Faça para cada marca, nesta ordem: {marcas}.\n\n'
    '1. Na aba "Publicar catálogos", clique no botão "Copiar código" da marca e espere o botão mostrar "Copiado".\n'
    '2. Vá para a aba do editor do Hostinger (builder.hostinger.com) e abra a página da marca: {paginas}.\n'
    '3. Clique em "Adicionar elemento" e escolha "Incorporar código" (Embed code). Arraste o elemento para a '
    'página, numa área vazia abaixo do que já existe.\n'
    '4. Clique na caixa de texto do elemento, cole com Ctrl+V e confirme em "Incorporar código".\n'
    '5. Estique o elemento pela borda de baixo até uns 3.000 px de altura, para o catálogo caber.\n'
    '6. Clique em "Atualizar site" no canto superior direito e confirme a publicação.\n\n'
    'Regras: não altere nem apague nenhum outro elemento das páginas; não edite o código; se algum botão ou '
    'tela não bater com o que descrevi, pare e me diga exatamente o que apareceu, em vez de improvisar. '
    'No fim, me diga quais páginas foram publicadas.'
)

BLOCO_MARCA = (
    '  <section>\n'
    '    <p class="etiqueta">Marca</p>\n'
    '    <div class="linha"><h2>{nome}</h2><span class="meta">página <strong>{pagina}</strong> no editor &middot; {kb} KB</span></div>\n'
    '    <div class="linha"><button type="button" data-copiar="codigo-{id}">Copiar código &middot; {nome}</button></div>\n'
    '    <details><summary>Ver o código</summary><textarea id="codigo-{id}" readonly spellcheck="false">{codigo}</textarea></details>\n'
    '  </section>'
)


def gerar_publicar() -> None:
    import html
    modelo_p = LOJA / 'scripts' / 'publicar.template.html'
    if not modelo_p.exists():
        return
    modelo = modelo_p.read_text(encoding='utf-8')
    blocos, nomes, paginas = [], [], []
    for mid, nome, pasta, pagina in MARCAS_PUBLICAR:
        arq = pasta / 'embed-hostinger.html'
        if not arq.exists():
            continue
        codigo = arq.read_text(encoding='utf-8')
        nomes.append(nome)
        paginas.append('"%s" para a %s' % (pagina, nome))
        # dentro de <textarea> as entidades são decodificadas: escapar garante
        # que o valor copiado seja idêntico, byte a byte, ao arquivo
        blocos.append(BLOCO_MARCA.format(nome=html.escape(nome), pagina=html.escape(pagina), id=mid,
                                         kb=round(len(codigo.encode('utf-8')) / 1024),
                                         codigo=html.escape(codigo, quote=False)))
    comando = COMANDO_PUBLICAR.format(marcas=' e depois '.join(nomes), paginas='; '.join(paginas))
    saida = modelo.replace('{{COMANDO}}', html.escape(comando, quote=False)).replace('{{MARCAS}}', '\n\n'.join(blocos))
    (LOJA / 'publicar.html').write_text(saida, encoding='utf-8')
    print('publicar.html          %6.0f KB  (%s)' % ((LOJA / 'publicar.html').stat().st_size / 1024, ', '.join(nomes)))


if __name__ == '__main__':
    raise SystemExit(main())
