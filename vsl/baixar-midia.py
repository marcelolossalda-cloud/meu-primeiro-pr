#!/usr/bin/env python3
"""
Baixa vídeo/imagem do Pexels para as cenas da VSL e preenche assets/manifest.json.

Uso:
    export PEXELS_API_KEY="sua-chave"        # chave gratuita: https://www.pexels.com/api/
    python3 vsl/baixar-midia.py              # todas as cenas
    python3 vsl/baixar-midia.py cadeira balde

Nunca sobrescreve arquivo já baixado. Ao final imprime a origem e o autor de cada arquivo —
guarde essa lista como comprovante de procedência.
"""

import json
import os
import sys
import urllib.parse
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(AQUI, "assets")
MANIFEST = os.path.join(ASSETS, "manifest.json")
API = os.environ.get("PEXELS_API_KEY", "").strip()

# cena -> termo de busca (os mesmos de MIDIA.md; em inglês, que é onde o acervo é maior)
TERMOS = {
    "abertura": "empty hair salon",
    "rotina": "hairdresser working",
    "caixa": "calculator receipts",
    "atencao": "thoughtful woman portrait",
    "nao-e-voce": "tired woman working",
    "vazamento": "dripping faucet",
    "promessa": "planner notebook desk",
    "diagnostico": "clipboard notes",
    "conselhos": "scrolling social media phone",
    "pressuposto": "scrolling social media phone",
    "ja-entrou": "shop door opening customer",
    "cadeira": "client in salon chair",
    "silencio": "hands styling hair",
    "causa": "hairdresser talking to client",
    "todo-mes": "calendar month desk",
    "descoberta": "beauty salon interior",
    "pilar-1": "filming phone salon",
    "pilar-2": "hair analysis close up",
    "pilar-3": "hair product recommendation",
    "balde": "water filling glass",
    "margem": "card payment small business",
    "produto": "hand holding phone screen",
    "dias": "checklist checkbox pen",
    "bonus": "typing laptop",
    "conta-fria": "hair care products shelf",
    "preco": "dark texture background",
    "cta": "happy salon client",
    "garantia": "handshake trust",
    "risco": "calendar last day",
    "fecho": "confident hairstylist portrait",
}


def pedir(url):
    req = urllib.request.Request(url, headers={"Authorization": API, "User-Agent": "vsl-caixa-rapido"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


def buscar_video(termo):
    url = "https://api.pexels.com/videos/search?" + urllib.parse.urlencode(
        {"query": termo, "per_page": 1, "orientation": "landscape", "size": "medium"})
    dados = pedir(url)
    if not dados.get("videos"):
        return None
    v = dados["videos"][0]
    # menor arquivo com pelo menos 1280 de largura, para não pesar a página
    arquivos = sorted((f for f in v["video_files"] if (f.get("width") or 0) >= 1280),
                      key=lambda f: f["width"])
    if not arquivos:
        arquivos = sorted(v["video_files"], key=lambda f: -(f.get("width") or 0))
    return {"url": arquivos[0]["link"], "ext": "mp4", "autor": v["user"]["name"], "pagina": v["url"]}


def buscar_foto(termo):
    url = "https://api.pexels.com/v1/search?" + urllib.parse.urlencode(
        {"query": termo, "per_page": 1, "orientation": "landscape"})
    dados = pedir(url)
    if not dados.get("photos"):
        return None
    p = dados["photos"][0]
    return {"url": p["src"]["large2x"], "ext": "jpg", "autor": p["photographer"], "pagina": p["url"]}


def baixar(url, destino):
    req = urllib.request.Request(url, headers={"User-Agent": "vsl-caixa-rapido"})
    with urllib.request.urlopen(req, timeout=120) as r, open(destino, "wb") as f:
        while True:
            bloco = r.read(1 << 16)
            if not bloco:
                break
            f.write(bloco)


def main():
    if not API:
        sys.exit("Defina PEXELS_API_KEY (chave gratuita em https://www.pexels.com/api/).")

    alvos = sys.argv[1:] or list(TERMOS)
    desconhecidas = [c for c in alvos if c not in TERMOS]
    if desconhecidas:
        sys.exit("Cena desconhecida: " + ", ".join(desconhecidas))

    os.makedirs(ASSETS, exist_ok=True)
    with open(MANIFEST, encoding="utf-8") as f:
        manifest = json.load(f)
    manifest.setdefault("cenas", {})

    creditos = []
    for cena in alvos:
        termo = TERMOS[cena]
        try:
            achado = buscar_video(termo) or buscar_foto(termo)
        except Exception as e:                                    # rede, cota, chave inválida
            print(f"  {cena}: falhou ({e})")
            continue
        if not achado:
            print(f"  {cena}: nada encontrado para '{termo}'")
            continue

        nome = f"{cena}.{achado['ext']}"
        destino = os.path.join(ASSETS, nome)
        if os.path.exists(destino):
            print(f"  {cena}: já existe, mantido")
        else:
            print(f"  {cena}: baixando '{termo}' ({achado['autor']})")
            baixar(achado["url"], destino)
        manifest["cenas"][cena] = f"assets/{nome}"
        creditos.append(f"{cena}\t{achado['autor']}\t{achado['pagina']}")

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    creditos_txt = os.path.join(ASSETS, "creditos.txt")
    with open(creditos_txt, "a", encoding="utf-8") as f:
        f.write("\n".join(creditos) + "\n")

    print(f"\n{len(creditos)} cena(s) mapeadas em assets/manifest.json")
    print(f"Origem e autoria registradas em {creditos_txt}")
    print("Confira a licença na página de cada arquivo antes de subir o anúncio.")


if __name__ == "__main__":
    main()
