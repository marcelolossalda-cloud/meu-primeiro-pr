# -*- coding: utf-8 -*-
"""Gera o PDF do plano: ajusta a escala para ocupar bem as páginas A4 (teto de 5),
depois aplica cabeçalho, rodapé e numeração."""
import sys, io, os, re, subprocess
sys.modules['cryptography'] = None
from pypdf import PdfReader, PdfWriter
import pypdfium2 as pdfium

CHROME = "/opt/pw-browsers/chromium"
W, H = 595.28, 841.89
MAX_PAGINAS, MIN_ULTIMA = 5, 0.86

def render(html_path, pdf_path):
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                    "--no-pdf-header-footer", "--virtual-time-budget=20000",
                    "--print-to-pdf=" + pdf_path, "file://" + html_path], capture_output=True)

def medir(pdf_path):
    pdf = pdfium.PdfDocument(pdf_path); n = len(pdf)
    img = pdf[n-1].render(scale=0.7).to_pil().convert("L")
    w, h = img.size; px = img.load(); limite = int(h*0.93); ultima = 0
    for y in range(limite, -1, -1):
        if any(px[x, y] < 235 for x in range(0, w, 3)): ultima = y; break
    return n, ultima/float(limite)

def com_zoom(html, z):
    return re.sub(r'body\{font-family', 'body{zoom:%.3f;font-family' % z, html, count=1)

def ajustar(html_base, th, tp):
    z = 1.0; n = pct = 0
    while z > 0.80:
        io.open(th, "w", encoding="utf-8").write(com_zoom(html_base, z)); render(th, tp)
        n, pct = medir(tp)
        if n <= MAX_PAGINAS: break
        z -= 0.03
    base_n = n; melhor = (z, n, pct)
    while pct < MIN_ULTIMA and z < 1.35:
        teste = z + 0.02
        io.open(th, "w", encoding="utf-8").write(com_zoom(html_base, teste)); render(th, tp)
        n2, pct2 = medir(tp)
        if n2 > base_n: break
        z, n, pct = teste, n2, pct2; melhor = (z, n, pct)
    io.open(th, "w", encoding="utf-8").write(com_zoom(html_base, melhor[0])); render(th, tp)
    return melhor

def larg(t, s):
    return sum(0.72 if c.isupper() else (0.3 if c in ".,:;|· " else 0.55) for c in t)*s

def overlay(n, cab, rod):
    kids, corpo = [], []; num = 4
    for i in range(n):
        pag, cont = num, num+1; num += 2; kids.append("%d 0 R" % pag)
        xc = W - 36.9 - larg(cab, 7.4)
        st = "BT 0.12 0.35 0.27 rg /F1 7.4 Tf %.2f %.2f Td (%s) Tj ET\n" % (xc, H - 40, cab)
        d = "%d / %d" % (i+1, n); xd = W-39.7-larg(d, 7)
        st += ("BT 0.56 0.60 0.59 rg /F1 7 Tf 39.7 22 Td (%s) Tj ET\n"
               "BT 0.71 0.54 0.16 rg /F1 7 Tf %.2f 22 Td (%s) Tj ET\n") % (rod, xd, d)
        b = st.encode("latin-1")
        corpo.append((pag, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>" % (W, H, cont)))
        corpo.append((cont, "<< /Length %d >>\nstream\n%sendstream" % (len(b), st)))
    objs = [(1, "<< /Type /Catalog /Pages 2 0 R >>"),
            (2, "<< /Type /Pages /Kids [%s] /Count %d >>" % (" ".join(kids), n)),
            (3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")] + corpo
    objs.sort(); out = bytearray(b"%PDF-1.4\n"); off = {}
    for k, t in objs:
        off[k] = len(out); out += ("%d 0 obj\n%s\nendobj\n" % (k, t)).encode("latin-1")
    x = len(out); tot = len(objs)+1
    out += ("xref\n0 %d\n" % tot).encode() + b"0000000000 65535 f \n"
    for k, _ in objs: out += ("%010d 00000 n \n" % off[k]).encode()
    out += ("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (tot, x)).encode()
    return bytes(out)

def processar(html_fonte, saida, cab, rod, titulo, assunto):
    html = re.sub(r'body\{zoom:[\d.]+;', 'body{', io.open(html_fonte, encoding="utf-8").read())
    d = os.path.abspath("."); th = os.path.join(d, "_trab.html"); tp = os.path.join(d, "_trab.pdf")
    z, n, pct = ajustar(html, th, tp)
    base = PdfReader(tp); n = len(base.pages)
    ov = PdfReader(io.BytesIO(overlay(n, cab, rod)))
    w = PdfWriter()
    for i, p in enumerate(base.pages):
        p.merge_page(ov.pages[i]); w.add_page(p)
    for p in w.pages:
        try: p.compress_content_streams()
        except Exception: pass
    w.add_metadata({"/Title": titulo, "/Subject": assunto})
    with open(saida, "wb") as f: w.write(f)
    try:
        import pikepdf
        pk = pikepdf.open(saida)
        pk.save("_c.pdf", object_stream_mode=pikepdf.ObjectStreamMode.generate, compress_streams=True)
        os.replace("_c.pdf", saida)
    except Exception: pass
    print("%s | escala %.2f | %d páginas | última %.0f%% cheia | %.0f KB"
          % (os.path.basename(saida), z, len(PdfReader(saida).pages), pct*100, os.path.getsize(saida)/1024))

if __name__ == "__main__":
    processar(*sys.argv[1:])
