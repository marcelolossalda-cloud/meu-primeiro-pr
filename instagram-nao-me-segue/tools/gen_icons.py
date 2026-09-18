import zlib, struct, math, os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")

def write_png(path, w, h, px):
    raw = b"".join(b"\x00" + bytes(px[y*w*4:(y+1)*w*4]) for y in range(h))
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    data = (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(data)

def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))

# Paleta inspirada no gradiente do Instagram
C1 = (131, 58, 180)   # roxo
C2 = (225, 48, 108)   # rosa
C3 = (252, 175, 69)   # laranja

def grad(x, y):
    t = max(0.0, min(1.0, (x * 0.55 + (1 - y) * 0.45)))
    return lerp(C1, C2, t / 0.55) if t < 0.55 else lerp(C2, C3, (t - 0.55) / 0.45)

def rounded_rect(x, y, r=0.24, m=0.02):
    x0, y0, x1, y1 = m, m, 1 - m, 1 - m
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    if x0 + r <= x <= x1 - r or y0 + r <= y <= y1 - r:
        return x0 <= x <= x1 and y0 <= y <= y1
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def circle(x, y, cx, cy, r):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def person(x, y):
    # cabeca
    if circle(x, y, 0.44, 0.33, 0.145):
        return True
    # ombros (meia elipse)
    if y <= 0.80 and ((x - 0.44) / 0.30) ** 2 + ((y - 0.80) / 0.29) ** 2 <= 1 and y >= 0.51:
        return True
    return False

def cross(x, y, cx, cy, half=0.105, th=0.032):
    dx, dy = x - cx, y - cy
    u = (dx + dy) * 0.70710678
    v = (dx - dy) * 0.70710678
    return (abs(u) <= th and abs(v) <= half) or (abs(v) <= th and abs(u) <= half)

BADGE_C, BADGE_R = (0.755, 0.745), 0.215
RING_R = 0.175
RED = (237, 73, 86)

def shade(x, y):
    """Retorna (r,g,b,a) em floats 0..255 para um ponto normalizado."""
    if not rounded_rect(x, y, 0.24 if SIZE >= 32 else 0.20):
        return (0, 0, 0, 0)
    r, g, b = grad(x, y)
    if circle(x, y, *BADGE_C, BADGE_R):
        if circle(x, y, *BADGE_C, RING_R):
            if cross(x, y, *BADGE_C):
                return (255, 255, 255, 255)
            return (*RED, 255)
        return (255, 255, 255, 255)
    if person(x, y):
        return (255, 255, 255, 255)
    return (r, g, b, 255)

SS = 4  # supersampling
for SIZE in (16, 32, 48, 128):
    px = bytearray(SIZE * SIZE * 4)
    for py in range(SIZE):
        for pxi in range(SIZE):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sy in range(SS):
                for sx in range(SS):
                    nx = (pxi + (sx + 0.5) / SS) / SIZE
                    ny = (py + (sy + 0.5) / SS) / SIZE
                    c = shade(nx, ny)
                    a = c[3] / 255.0
                    acc[0] += c[0] * a; acc[1] += c[1] * a; acc[2] += c[2] * a; acc[3] += a
            n = SS * SS
            a = acc[3] / n
            i = (py * SIZE + pxi) * 4
            if a > 0:
                px[i] = int(round(acc[0] / acc[3]))
                px[i + 1] = int(round(acc[1] / acc[3]))
                px[i + 2] = int(round(acc[2] / acc[3]))
            px[i + 3] = int(round(a * 255))
    write_png(os.path.join(OUT, f"icon{SIZE}.png"), SIZE, SIZE, px)
    print("gerado", SIZE)
