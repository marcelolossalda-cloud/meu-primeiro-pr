# -*- coding: utf-8 -*-
"""Monta o HTML do plano: fontes Lato subsetizadas + folha de estilo do modelo."""
import re, io, os, sys, base64, subprocess
from fontTools import subset

corpo_path, saida_html, titulo = sys.argv[1], sys.argv[2], sys.argv[3]
corpo = io.open(corpo_path, encoding="utf-8").read()
texto = re.sub(r'<[^>]+>', ' ', corpo)
chars = set(texto) | set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
                         ".,;:!?()[]-–—·%$/\"'“”‘’ºª+=<>÷≈&@× áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ")
alvo = "".join(sorted({c for c in chars if c == " " or c.strip()}))

BASE = os.path.dirname(os.path.abspath(__file__))
FDIR = os.path.join(BASE, "fontes")
os.makedirs(FDIR, exist_ok=True)
lato = os.path.join(FDIR, "lato.css")
if not os.path.exists(lato):
    UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
    subprocess.run(["curl", "-s", "-A", UA,
        "https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;0,900;1,400&display=swap",
        "-o", lato], check=True)
css = io.open(lato, encoding="utf-8").read()
blocos = re.findall(r'/\*\s*([a-z0-9-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})', css)
faces = []
for i, (sub, b) in enumerate(blocos):
    if sub != "latin": continue
    url = re.search(r'url\((https://fonts\.gstatic\.com[^)]+)\)', b).group(1)
    orig = os.path.join(FDIR, "lato%02d.woff2" % i)
    if not os.path.exists(orig):
        subprocess.run(["curl", "-s", "-o", orig, url], check=True)
    corte = os.path.join(FDIR, "sub%02d.woff2" % i)
    subset.main([orig, "--text=%s" % alvo, "--flavor=woff2", "--output-file=%s" % corte,
                 "--layout-features=kern", "--no-hinting", "--desubroutinize"])
    uri = "data:font/woff2;base64," + base64.b64encode(open(corte, "rb").read()).decode()
    faces.append(re.sub(r'url\([^)]+\)', "url(%s)" % uri, b))

estilo = io.open(os.path.join(BASE, "estilo.css"), encoding="utf-8").read()
doc = u"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>%s</title><style>%s</style><style>%s</style></head><body>%s</body></html>""" % (
    titulo, "\n".join(faces), estilo, corpo)
io.open(saida_html, "w", encoding="utf-8").write(doc)
print("html:", len(doc)//1024, "KB |", len(faces), "fontes")
