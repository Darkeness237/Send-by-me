"""Synthèse vocale des phrases de voix off (Piper, voix française fr_FR-siwis-medium, licence CC BY 4.0).
python tts.py liste.json dossier_sortie   (liste : [{"key": ..., "text": ...}])
Le modèle est cherché dans PIPER_VOICE (chemin du .onnx)."""
import json
import os
import sys
import wave

from piper import PiperVoice, SynthesisConfig

voice = PiperVoice.load(os.environ["PIPER_VOICE"])
cfg = SynthesisConfig(length_scale=0.95, noise_scale=0.6, noise_w_scale=0.7)
for line in json.load(open(sys.argv[1])):
    out = os.path.join(sys.argv[2], line["key"] + ".wav")
    with wave.open(out, "wb") as w:
        voice.synthesize_wav(line["text"], w, syn_config=cfg)
    print("voix :", line["text"][:60])
