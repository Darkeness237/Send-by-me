"""Musique de fond originale (générée, donc libre de droits) : groove léger d'inspiration afro, 100 BPM.
python3 marketing/_src/music.py sortie.wav [durée_en_secondes]"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 100
BEAT = 60 / BPM
rng = np.random.default_rng(7)


def note(n):  # numéro MIDI -> fréquence
    return 440 * 2 ** ((n - 69) / 12)


def env(length, a=0.01, r=0.3):
    t = np.arange(length) / SR
    e = np.minimum(1, t / a) * np.exp(-t / r)
    return e


def place(buf, sig, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def pad(freqs, dur):
    t = np.arange(int(dur * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t) for f in freqs)
    fade = np.minimum(1, np.minimum(t / 0.4, (dur - t) / 0.4))
    return s * fade / len(freqs) * 0.18


def marimba(f, dur=0.5):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.05)
    return s * env(len(t), 0.003, 0.18) * 0.32


def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 110 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) * 0.9


def shaker(strength=1.0):
    n = rng.standard_normal(int(0.06 * SR))
    n = np.diff(n, prepend=0)  # passe-haut simple
    return n * env(len(n), 0.002, 0.018) * 0.12 * strength


def clap():
    n = rng.standard_normal(int(0.18 * SR))
    n = np.diff(n, prepend=0)
    return n * env(len(n), 0.001, 0.05) * 0.18


def bass(f, dur):
    t = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * env(len(t), 0.005, 0.35) * 0.35


def main(out, seconds):
    n = int(seconds * SR)
    L = np.zeros(n + SR)
    R = np.zeros(n + SR)
    # Progression en La majeur : A - E - F#m - D (une mesure de 4 temps par accord)
    chords = [[57, 61, 64], [52, 56, 59, 64], [54, 57, 61], [50, 54, 57, 62]]
    roots = [45, 40, 42, 38]
    bar = 4 * BEAT
    t = 0.0
    k = 0
    while t < seconds:
        c = chords[k % 4]
        p = pad([note(x) for x in c], bar + 0.4)
        place(L, p, t)
        place(R, p * 0.9, t)
        # basse syncopée
        for off, d in [(0, 0.6), (1.5, 0.4), (2.5, 0.6)]:
            place(L, bass(note(roots[k % 4]), d), t + off * BEAT)
            place(R, bass(note(roots[k % 4]), d), t + off * BEAT)
        # arpège marimba (croches, motif afro 3+3+2)
        pattern = [0, 2, 1, 2, 0, 1, 2, 1]
        for i, idx in enumerate(pattern):
            if i in (3, 7) and k % 2:
                continue
            f = note(c[idx % len(c)] + 12)
            s = marimba(f)
            pan = 0.35 + 0.3 * (i % 2)
            place(L, s * (1 - pan), t + i * BEAT / 2)
            place(R, s * pan, t + i * BEAT / 2)
        # percussions
        for b in range(4):
            if b in (0, 2) or (b == 3 and k % 2):
                place(L, kick(), t + b * BEAT)
                place(R, kick(), t + b * BEAT)
            if b in (1, 3):
                place(L, clap() * 0.8, t + b * BEAT)
                place(R, clap(), t + b * BEAT)
            for s16 in range(4):
                sh = shaker(1.0 if s16 in (0, 2) else 0.55)
                place(L, sh * 0.8, t + b * BEAT + s16 * BEAT / 4)
                place(R, sh, t + b * BEAT + s16 * BEAT / 4 + 0.004)
        t += bar
        k += 1
    # réverbération légère
    ir = rng.standard_normal(int(0.6 * SR)) * np.exp(-np.arange(int(0.6 * SR)) / SR / 0.18) * 0.02
    L = L + np.convolve(L, ir)[: len(L)]
    R = R + np.convolve(R, ir[::-1].copy())[: len(R)]
    st = np.stack([L[:n], R[:n]], axis=1)
    fade = int(1.5 * SR)
    st[-fade:] *= np.linspace(1, 0, fade)[:, None]
    st[: int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))[:, None]
    st = st / np.max(np.abs(st)) * 0.89
    pcm = (st * 32767).astype(np.int16)
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 60)
