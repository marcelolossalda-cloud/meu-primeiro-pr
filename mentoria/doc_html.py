# -*- coding: utf-8 -*-
"""Converte o corpo do plano em HTML com estilos inline, para o Google Docs."""
import io, re, sys

VERDE, OURO, FAIXA, BORDA = "#1F5A45", "#B58A2A", "#EAF3EF", "#C9D5D0"
s = io.open(sys.argv[1], encoding="utf-8").read()

# faixas de campos -> tabela
def campos(m):
    bloco = m.group(1)
    cels = re.findall(r'<span class="rot">(.*?)</span><span class="val">(.*?)</span>', bloco, re.S)
    tds = "".join(
        '<td style="background:%s;border:1px solid #CFE0D8;padding:6px 9px;width:%d%%">'
        '<div style="font-size:7pt;font-weight:bold;color:%s;letter-spacing:1px">%s</div>'
        '<div style="font-size:11pt;font-weight:bold;color:#1A2B24">%s</div></td>'
        % (FAIXA, 100 // len(cels), VERDE, r.upper(), v) for r, v in cels)
    return ('<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;'
            'width:100%%;margin-bottom:4px"><tr>%s</tr></table>' % tds)
s = re.sub(r'<div class="campos[^"]*">(.*?)\n</div>', campos, s, flags=re.S)

# duas colunas (avancou / travou)
def duas(m):
    cols = re.findall(r'<div(?: class="trava")?>\s*<h4>(.*?)</h4>\s*<ul>(.*?)</ul>\s*</div>', m.group(1), re.S)
    tds = ""
    for i, (t, itens) in enumerate(cols):
        cor = OURO if i else VERDE
        lis = re.sub(r'<li>', '<li style="font-size:9pt;color:#333;margin-bottom:3px">', itens)
        tds += ('<td style="vertical-align:top;padding:0 10px 0 0;width:50%%">'
                '<div style="font-size:10pt;font-weight:bold;color:%s;margin-bottom:4px">%s</div>'
                '<ul style="margin:0;padding-left:16px">%s</ul></td>' % (cor, t, lis))
    return ('<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%%">'
            '<tr>%s</tr></table>' % tds)
s = re.sub(r'<div class="duas">(.*?)\n</div>', duas, s, flags=re.S)

# tabelas
s = s.replace('<div class="tabw">', '').replace('</table>\n</div>', '</table>')
TAB = ('<table cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%;'
       'font-size:8.5pt;border:1px solid ' + BORDA + '">')
s = re.sub(r'<table class="(exec|ind|etapas)">', lambda m: TAB + '<!--%s-->' % m.group(1), s)
blocos = s.split("<table")
saida = [blocos[0]]
for b in blocos[1:]:
    tipo = re.search(r'<!--(\w+)-->', b)
    cor = OURO if (tipo and tipo.group(1) == "ind") else VERDE
    b = re.sub(r'<th class="c">', '<th>', b)
    b = re.sub(r'<th>', '<th style="background:%s;color:#fff;font-size:7.5pt;font-weight:bold;'
               'text-align:left;padding:6px 7px;border:1px solid %s">' % (cor, cor), b)
    saida.append(b)
s = "<table".join(saida)
s = re.sub(r'<!--\w+-->', '', s)

CEL = ""
s = s.replace('<tr class="fase"><td colspan="7">',
              '<tr><td colspan="7" style="background:%s;border:1px solid #CFE0D8;padding:5px 7px;'
              'font-size:7.5pt;font-weight:bold;color:%s;letter-spacing:1px">' % (FAIXA, VERDE))
s = re.sub(r'<span>(.*?)</span>', r'<span style="color:%s">\1</span>' % OURO, s)
s = s.replace('<td class="n">', '<td style="%stext-align:center;font-weight:bold">' % CEL)
s = s.replace('<td class="def">', '<td style="%stext-align:center;color:#2C7457;font-size:8pt">' % CEL)
s = s.replace('<td class="prop">', '<td style="%stext-align:center;color:%s;font-size:8pt">' % (CEL, OURO))
s = s.replace('<td class="pr-a">', '<td style="%stext-align:center;color:%s;font-weight:bold;font-size:8pt">' % (CEL, VERDE))
s = s.replace('<td class="pr-m">', '<td style="%stext-align:center;color:%s;font-weight:bold;font-size:8pt">' % (CEL, OURO))
s = s.replace('<td class="st">', '<td style="%stext-align:center;font-size:8pt;color:#444">' % CEL)
s = s.replace('<td class="lbl">', '<td style="%scolor:%s;font-weight:bold">' % (CEL, VERDE))
s = s.replace('<td class="et">', '<td style="%scolor:%s;font-weight:bold">' % (CEL, VERDE))
s = s.replace('<span class="bx"></span>', '&#9744; ')

# titulos e listas
s = s.replace('<h1>', '<h1 style="color:%s;font-size:26pt;font-weight:bold;margin:0 0 4px;'
              'text-transform:uppercase">' % VERDE)
s = s.replace('<p class="subt">', '<p style="font-style:italic;color:#6B7280;font-size:11pt;'
              'border-bottom:1px solid %s;padding-bottom:6px;margin:0 0 10px">' % VERDE)
s = re.sub(r'<h2>', '<h2 style="color:%s;font-size:13pt;font-weight:bold;margin:14px 0 5px">' % VERDE, s)
s = re.sub(r'<h3>', '<h3 style="color:%s;font-size:9.5pt;font-weight:bold;margin:10px 0 3px">' % OURO, s)
s = s.replace('<p class="peq">', '<p style="font-size:9pt;color:#555;margin:0">')
s = s.replace('<p class="nota">', '<p style="font-size:9pt;color:#555;margin:6px 0 0">')
s = s.replace('<p class="rodape-doc">', '<p style="font-size:8pt;color:#8A8F8D;margin-top:14px;'
              'border-top:1px solid #D8DEDB;padding-top:6px">')
s = s.replace('<ol class="rot-lista">', '<ol style="margin:4px 0 0;padding-left:20px">')
s = s.replace('<ul class="caixa col2">', '<ul style="margin:4px 0 0;padding-left:20px">')
s = s.replace('<ul class="check">', '<ul style="margin:4px 0 0;padding-left:20px">')
s = re.sub(r'<li>', '<li style="font-size:9.5pt;color:#222;margin-bottom:3px">', s)

cabecalho = sys.argv[4] if len(sys.argv) > 4 else u"MENTORIA DE DISTRIBUIÇÃO | PLANO DE EXECUÇÃO"
doc = (u'<!doctype html><html><head><meta charset="utf-8"><title>%s</title><style>'
       u'table{border-collapse:collapse;width:100%%}'
       u'td{border:1px solid #D8DEDB;padding:5px 7px;font-size:8.5pt;vertical-align:top}'
       u'li{font-size:9.5pt;color:#222;margin-bottom:3px}'
       u'</style></head>'
       u'<body style="font-family:Lato,Calibri,Arial,sans-serif;font-size:9.5pt;color:#2B2B2B">'
       u'<p style="font-size:7.5pt;font-weight:bold;color:%s;letter-spacing:1px;margin:0 0 8px">'
       u'%s</p>%s</body></html>'
       % (sys.argv[3], VERDE, cabecalho, s))
io.open(sys.argv[2], "w", encoding="utf-8").write(doc)
print("doc html:", len(doc), "bytes")
