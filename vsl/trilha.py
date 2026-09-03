#!/usr/bin/env python3
"""
Gera a trilha sonora da VSL: cama harmônica por bloco + efeitos sincronizados
com as cenas (tesoura, secador, gota, tique-taque, moeda, chimes dos pilares).

    pip install numpy scipy
    node vsl/build.js          # gera tempos.json
    python3 vsl/trilha.py      # gera vsl/audio/trilha.mp3

Tudo é sintetizado aqui — nenhum sample de terceiros, nenhuma licença envolvida.
A trilha fica baixa de propósito (pico em -6 dB): ela é cama para a locução,
não protagonista. Ajuste GANHO_* se quiser mais ou menos presença.

Para usar uma música licenciada sua (Epidemic Sound, Artlist, Soundstripe...) no
lugar da cama sintetizada, mantendo os efeitos sincronizados com as cenas:

    python3 vsl/trilha.py --musica ~/Downloads/faixa.mp3
    python3 vsl/trilha.py --musica faixa.mp3 --ganho 0.7   # mais presença da música

A música é cortada (ou repetida) no tamanho exato da VSL, ganha fade de entrada e
saída, e continua abaixando naquele respiro de "e você não falou nada".
Baixe a faixa com a sua conta e confira se o seu plano cobre anúncio pago —
plano pessoal costuma não cobrir tráfego, e trilha fora de licença derruba vídeo.
"""

import argparse
import json
import os
import subprocess
import sys
import wave

import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
AQUI = os.path.dirname(os.path.abspath(__file__))
TEMPOS = os.path.join(AQUI, 'tempos.json')
SAIDA = os.path.join(AQUI, 'audio')

GANHO_CAMA = 0.22      # drone/pad
GANHO_PULSO = 0.16     # batida grave
GANHO_EFEITO = 0.5     # efeitos de cena
PICO = 0.5             # pico final (-6 dB), para a locução caber por cima

rng = np.random.default_rng(7)


# ---------------------------------------------------------------- utilidades
def env(n, ataque, queda, sustento=1.0):
    """envelope ataque/queda exponencial"""
    a = max(1, int(ataque * SR))
    d = max(1, int(queda * SR))
    e = np.ones(n) * sustento
    e[:a] = np.linspace(0, 1, a) ** 2 * sustento
    if d < n:
        e[n - d:] = np.exp(np.linspace(0, -6, d)) * sustento
    return e


def sino(freq, dur, gain=1.0, brilho=2.0):
    """toque de sino: parciais inarmônicas com queda rápida"""
    t = np.arange(int(dur * SR)) / SR
    x = np.zeros_like(t)
    for mult, amp in ((1, 1), (2.01, .5), (3.02, .25), (4.7, .12 * brilho)):
        x += amp * np.sin(2 * np.pi * freq * mult * t) * np.exp(-t * (2.2 + mult))
    return x / 1.9 * gain


def corda(freq, dur, gain=1.0):
    """pluck suave"""
    t = np.arange(int(dur * SR)) / SR
    x = (np.sin(2 * np.pi * freq * t) + .3 * np.sin(4 * np.pi * freq * t)) * np.exp(-t * 3.2)
    return x * gain


def ruido(dur):
    return rng.normal(0, 1, int(dur * SR))


def passa(x, tipo, corte, ordem=2):
    wn = np.asarray(corte, dtype=float) / (SR / 2)
    b, a = butter(ordem, wn if wn.ndim else float(wn), btype=tipo)
    return lfilter(b, a, x)


def reverb(x, tempo=1.6, mistura=.3):
    """reverb barato: ecos decrescentes em tempos primos"""
    saida = x.copy()
    for atraso_ms, g in ((23, .5), (37, .38), (53, .3), (79, .22), (113, .16)):
        d = int(SR * atraso_ms / 1000)
        eco = np.zeros_like(x)
        eco[d:] = x[:-d] * g * mistura
        saida += eco * tempo / 1.6
    return saida


class Mix:
    def __init__(self, dur):
        self.buf = np.zeros(int(dur * SR) + SR)

    def add(self, x, t0, gain=1.0):
        i = int(t0 * SR)
        if i < 0:
            x, i = x[-i:], 0
        fim = min(len(self.buf), i + len(x))
        if fim > i:
            self.buf[i:fim] += x[:fim - i] * gain


# ------------------------------------------------------------------ camadas
def cama(dur, notas, brilho=.5):
    """drone: senoides levemente desafinadas + respiração lenta"""
    t = np.arange(int(dur * SR)) / SR
    x = np.zeros_like(t)
    for i, f in enumerate(notas):
        lfo = 1 + .06 * np.sin(2 * np.pi * (.05 + i * .017) * t)
        x += np.sin(2 * np.pi * f * t * lfo) / (i + 1.6)
        x += .5 * np.sin(2 * np.pi * f * 1.004 * t) / (i + 2.2)   # desafinação
    ar = passa(ruido(dur), 'low', 900) * (.05 + .04 * brilho)      # ruído de sala
    x = x / max(1e-9, np.abs(x).max()) * .8 + ar
    return passa(x, 'low', 1800 + 1400 * brilho)


def pulso(freq=58, dur=.5):
    t = np.arange(int(dur * SR)) / SR
    corpo = np.sin(2 * np.pi * (freq * np.exp(-t * 6) + freq * .7) * t) * np.exp(-t * 7)
    clique = passa(ruido(.02), 'high', 1800) * np.exp(-np.arange(int(.02 * SR)) / (SR * .004))
    corpo[:len(clique)] += clique * .25
    return corpo


def tesoura():
    x = passa(ruido(.09), 'high', 3800) * np.exp(-np.arange(int(.09 * SR)) / (SR * .012))
    x2 = np.zeros(int(.22 * SR))
    x2[:len(x)] += x
    d = int(.11 * SR)
    x2[d:d + len(x)] += x * .8
    return reverb(x2, .8, .2)


def secador(dur=2.6):
    n = int(dur * SR)
    x = passa(ruido(dur), 'band', [320, 2600])
    swell = np.concatenate([np.linspace(0, 1, n // 3), np.ones(n - n // 3 - n // 4),
                            np.linspace(1, 0, n // 4)])
    return x[:len(swell)] * swell * .5


def gota():
    dur = .28
    t = np.arange(int(dur * SR)) / SR
    f = 1500 * np.exp(-t * 26) + 320
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)
    return reverb(x, 2.2, .45) * .8


def tique():
    x = passa(ruido(.012), 'high', 5000) * np.exp(-np.arange(int(.012 * SR)) / (SR * .002))
    return x * .8


def moeda():
    x = np.zeros(int(.9 * SR))
    for i, f in enumerate((2100, 2650, 3300)):
        s = sino(f, .7, .7)
        d = int(i * .055 * SR)
        x[d:d + len(s)] += s
    return reverb(x, 1.4, .3) * .7


def sopro(dur=1.4, subindo=True):
    n = int(dur * SR)
    x = passa(ruido(dur), 'band', [400, 5000])
    e = np.linspace(0, 1, n) ** 2 if subindo else np.exp(np.linspace(0, -5, n))
    return x[:n] * e * .35


def batida_grave():
    t = np.arange(int(1.2 * SR)) / SR
    return np.sin(2 * np.pi * (46 * np.exp(-t * 3) + 34) * t) * np.exp(-t * 3.4)


# -------------------------------------------------------------------- trilha
def ffmpeg():
    if os.environ.get('FFMPEG'):
        return os.environ['FFMPEG']
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return 'ffmpeg'


def musica_externa(arquivo, dur):
    """decodifica a faixa licenciada e ajusta ao tamanho da VSL"""
    bruto = subprocess.run(
        [ffmpeg(), '-v', 'quiet', '-i', arquivo, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
        capture_output=True, check=True).stdout
    x = np.frombuffer(bruto, '<i2').astype(np.float64) / 32768
    if len(x) == 0:
        sys.exit(f'não consegui ler áudio de {arquivo}')
    n = int(dur * SR)
    if len(x) < n:                      # curta demais: repete com emenda suave
        emenda = int(1.5 * SR)
        voltas = []
        while sum(len(v) for v in voltas) < n:
            t = x.copy()
            if voltas:
                t[:emenda] *= np.linspace(0, 1, emenda)
                voltas[-1][-emenda:] *= np.linspace(1, 0, emenda)
            voltas.append(t)
        x = np.concatenate(voltas)
    x = x[:n]
    e = int(3 * SR)
    x[:e] *= np.linspace(0, 1, e)
    x[-e:] *= np.linspace(1, 0, e)
    return x / max(1e-9, np.abs(x).max())


def main():
    ap = argparse.ArgumentParser(description='trilha da VSL Caixa Rápido')
    ap.add_argument('--musica', help='faixa licenciada para usar no lugar da cama sintetizada')
    ap.add_argument('--ganho', type=float, default=.55, help='volume da faixa (padrão 0.55)')
    args = ap.parse_args()

    if not os.path.exists(TEMPOS):
        sys.exit('tempos.json não existe — rode `node vsl/build.js` antes.')
    dados = json.load(open(TEMPOS, encoding='utf-8'))
    total, falas = dados['total'], dados['falas']

    def cena(nome):
        """(início, fim, [inícios de cada fala]) de uma cena"""
        f = [c for c in falas if c['cena'] == nome]
        return (f[0]['inicio'], f[-1]['fim'], [c['inicio'] for c in f]) if f else (0, 0, [])

    blocos = [(c['inicio'], c['bloco']) for c in falas if c.get('bloco')]
    limites = [(ini, blocos[i + 1][0] if i + 1 < len(blocos) else total)
               for i, (ini, _) in enumerate(blocos)]

    mix = Mix(total + 4)

    if args.musica:
        mix.add(musica_externa(args.musica, total), 0, args.ganho)

    # --- cama harmônica: menor e escura nos blocos 1-2, abre em maior no 3
    acordes = [
        [55.00, 82.41, 110.00],            # Lá menor — a dor
        [55.00, 82.41, 130.81],            # tensão
        [65.41, 98.00, 130.81, 164.81],    # Dó maior — a descoberta
        [65.41, 98.00, 174.61, 196.00],    # Fá — a oferta
        [65.41, 98.00, 164.81, 196.00],    # resolução
    ]
    for i, (ini, fim) in enumerate(limites) if not args.musica else []:
        dur = fim - ini + 3
        cor = .25 if i < 2 else .75
        camada = cama(dur, acordes[i], cor)
        n = len(camada)
        fade = int(2.5 * SR)
        camada[:fade] *= np.linspace(0, 1, fade)
        camada[-fade:] *= np.linspace(1, 0, fade)
        mix.add(camada, ini - 1.5, GANHO_CAMA)

    # --- pulso: lento e cardíaco no diagnóstico, mais firme na oferta
    t = 6.0 if not args.musica else total
    while t < total - 3:
        b3 = limites[2][0]
        intervalo = 2.0 if t < b3 else 1.5
        ganho = GANHO_PULSO * (.75 if t < b3 else 1.0)
        mix.add(pulso(), t, ganho)
        t += intervalo

    # --- plucks a partir da solução (bloco 3)
    escala = [261.63, 293.66, 329.63, 392.00, 440.00]
    t = limites[2][0] if not args.musica else total
    i = 0
    while t < total - 4:
        nota = escala[(i * 3 + (i // 5)) % len(escala)]
        mix.add(reverb(corda(nota, 1.6), 1.8, .35), t, .07)
        t += 1.6
        i += 1

    # --- transição em cada virada de bloco
    for ini, _ in blocos[1:]:
        mix.add(sopro(1.6, True), ini - 1.6, GANHO_EFEITO * .7)

    E = GANHO_EFEITO

    # bloco 1 -----------------------------------------------------------
    ini, fim, falas_ini = cena('rotina')
    mix.add(secador(2.8), ini + .3, E * .45)
    for t0 in falas_ini[2:4]:
        mix.add(tesoura(), t0 + .2, E * .8)

    ini, fim, falas_ini = cena('mercado')          # o bipe do caixa do supermercado
    if falas_ini:
        mix.add(sino(2093, .35, .4, 1.6), falas_ini[1], E * .5)

    ini, fim, falas_ini = cena('caixa')
    mix.add(moeda(), ini + .2, E * .8)
    mix.add(batida_grave(), falas_ini[-1], E * .9)          # "não corresponde ao esforço"

    ini, *_ = cena('nao-e-voce')
    mix.add(batida_grave(), ini, E)

    ini, fim, _ = cena('vazamento')
    t = ini + .6
    while t < fim:
        mix.add(gota(), t, E * .7)
        t += 1.5

    # bloco 2 -----------------------------------------------------------
    ini, fim, falas_ini = cena('conselhos')
    for t0 in falas_ini[2:]:
        mix.add(sino(1450, .5, .45, 1.2), t0, E * .5)        # notificação

    ini, fim, falas_ini = cena('pressuposto')
    for k in range(4):
        mix.add(sopro(.5, False), falas_ini[-1] + k * .3, E * .5)

    ini, fim, falas_ini = cena('ja-entrou')
    mix.add(sino(880, 1.1, .5), ini, E * .6)                 # sino da porta
    mix.add(sino(660, 1.4, .5), ini + .22, E * .6)
    mix.add(moeda(), falas_ini[-1], E * .55)                 # "saiu sem ser aproveitado"

    ini, fim, falas_ini = cena('cadeira')
    mix.add(sino(2400, .8, .35, 2.5), falas_ini[1], E * .5)  # "viu o fio quebrado"

    # silêncio: a cama some por 2s — é o beat de "e você não falou nada"
    ini, *_ = cena('silencio')
    a, b = int(ini * SR), int((ini + 2.2) * SR)
    janela = np.concatenate([np.linspace(1, .12, int(.6 * SR)),
                             np.ones(b - a - int(1.2 * SR)) * .12,
                             np.linspace(.12, 1, int(.6 * SR))])
    mix.buf[a:a + len(janela)] *= janela

    ini, fim, falas_ini = cena('causa')
    mix.add(sino(1320, 1.2, .5), falas_ini[-1], E * .55)

    ini, fim, falas_ini = cena('objecoes')         # as duas objeções, antes do preço
    if falas_ini:
        mix.add(sino(880, .8, .4), falas_ini[1], E * .45)
        mix.add(reverb(sino(1174.66, 1.4, .5), 1.8, .35), falas_ini[-1], E * .5)

    ini, fim, falas_ini = cena('calculo')          # a conta de cabeça: um toque por passo
    for k, t0 in enumerate(falas_ini[1:5]):
        mix.add(sino(659.25 * (1 + k * .18), .9, .45), t0, E * .5)

    ini, fim, _ = cena('todo-mes')
    t = ini
    while t < fim:
        mix.add(tique(), t, E * .5)
        t += 1.0

    # bloco 3 -----------------------------------------------------------
    for nome, f in (('pilar-1', 523.25), ('pilar-2', 659.25), ('pilar-3', 783.99)):
        ini, *_ = cena(nome)
        mix.add(reverb(sino(f, 1.8, .6), 2.0, .4), ini, E * .7)

    ini, fim, falas_ini = cena('balde')
    tampou = next((c['inicio'] for c in falas if 'tampa os furos' in c['texto']), ini + 12)
    t = ini
    while t < tampou:                                        # vaza até tampar os furos
        mix.add(gota(), t, E * .6)
        t += 1.4
    mix.add(batida_grave(), tampou, E * .7)                  # os furos tampados
    mix.add(reverb(sino(392, 2.4, .6), 2.4, .5), tampou + .3, E * .5)

    ini, fim, falas_ini = cena('margem')
    for t0 in falas_ini[1:3]:
        mix.add(sino(1760, .35, .4, 1.5), t0, E * .45)       # bipe da maquininha

    # bloco 4 -----------------------------------------------------------
    ini, *_ = cena('produto')
    mix.add(sopro(1.2, True), ini - .8, E * .6)
    mix.add(reverb(sino(659.25, 1.6, .6), 2, .4), ini, E * .55)

    ini, fim, falas_ini = cena('dias')
    for k, t0 in enumerate(falas_ini[:7]):
        mix.add(sino(880 + k * 60, .4, .35, 1.2), t0, E * .45)

    ini, fim, falas_ini = cena('bonus')
    for t0 in (falas_ini[1], falas_ini[-1]):
        mix.add(sino(987.77, 1.0, .45), t0, E * .5)

    ini, fim, falas_ini = cena('conta-fria')
    for k, t0 in enumerate(falas_ini[1:4]):
        mix.add(sino(523.25 * (1 + k * .26), 1.1, .5), t0, E * .55)

    ini, *_ = cena('preco')
    mix.add(sopro(2.0, True), ini - 2.0, E * .7)
    mix.add(reverb(sino(1046.5, 2.2, .7), 2.2, .45), ini, E * .7)

    # bloco 5 -----------------------------------------------------------
    ini, *_ = cena('cta')
    mix.add(reverb(sino(783.99, 2.0, .6), 2, .4), ini, E * .6)

    ini, *_ = cena('garantia')
    for k, f in enumerate((392.00, 493.88, 587.33)):
        mix.add(reverb(corda(f, 2.4), 2, .4), ini + k * .12, .12)

    ini, fim, falas_ini = cena('risco')
    t = ini
    while t < falas_ini[-1]:
        mix.add(tique(), t, E * .55)
        t += 1.0
    mix.add(batida_grave(), falas_ini[-1], E * .9)           # "todo dia 30"

    ini, fim, falas_ini = cena('fecho')
    for k, f in enumerate((261.63, 329.63, 392.00, 523.25)):
        mix.add(reverb(corda(f, 3.0), 2.2, .45), falas_ini[-1] + k * .1, .14)

    # --- masterização simples
    x = mix.buf[:int(total * SR)]
    x = passa(x, 'high', 32)                                  # tira o subgrave inútil
    x = np.tanh(x * 1.4) / 1.4                                # limitador macio
    x = x / max(1e-9, np.abs(x).max()) * PICO
    n_in, n_out = int(2.5 * SR), int(3.5 * SR)
    x[:n_in] *= np.linspace(0, 1, n_in)
    x[-n_out:] *= np.linspace(1, 0, n_out)

    os.makedirs(SAIDA, exist_ok=True)
    wav = os.path.join(SAIDA, 'trilha.wav')
    with wave.open(wav, 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((x * 32767).astype('<i2').tobytes())

    mp3 = os.path.join(SAIDA, 'trilha.mp3')
    ff = os.environ.get('FFMPEG')
    if not ff:
        try:
            import imageio_ffmpeg
            ff = imageio_ffmpeg.get_ffmpeg_exe()
        except ImportError:
            ff = 'ffmpeg'
    try:
        subprocess.run([ff, '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '80k', '-ac', '1', mp3],
                       check=True, capture_output=True)
        os.remove(wav)
        print(f'{mp3}  ({os.path.getsize(mp3) / 1e6:.1f} MB, {total / 60:.2f} min)')
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f'{wav}  (ffmpeg não encontrado; converta para mp3 na mão)')


if __name__ == '__main__':
    main()
