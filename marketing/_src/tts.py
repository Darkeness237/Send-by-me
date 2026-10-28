"""Synthèse vocale des phrases de voix off.
python tts.py liste.json dossier_sortie   (liste : [{"key": ..., "text": ...}])

Moteur Kokoro (modèle Apache 2.0, voix française « ff_siwis » entraînée sur le corpus SIWIS, CC BY 4.0),
puis un léger traitement (égalisation douce, compression, petite réverbération) pour une voix moins métallique."""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from kokoro import KPipeline

pipeline = KPipeline(lang_code="f", repo_id="hexgrad/Kokoro-82M")
VOICE = os.environ.get("KOKORO_VOICE", "ff_siwis")
SPEED = float(os.environ.get("KOKORO_SPEED", "0.95"))
POLISH = "highpass=f=80,equalizer=f=250:t=q:w=1:g=1.5,equalizer=f=6500:t=q:w=1.5:g=-3,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=200,aecho=0.85:0.6:35:0.08,loudnorm=I=-16:TP=-1.5"

for line in json.load(open(sys.argv[1])):
    out = os.path.join(sys.argv[2], line["key"] + ".wav")
    audio = np.concatenate([a for _, _, a in pipeline(line["text"], voice=VOICE, speed=SPEED)])
    with tempfile.NamedTemporaryFile(suffix=".wav") as raw:
        sf.write(raw.name, audio, 24000)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw.name, "-af", POLISH, "-ar", "44100", out], check=True)
    print("voix :", line["text"][:60], flush=True)
