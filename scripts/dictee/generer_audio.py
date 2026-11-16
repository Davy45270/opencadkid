#!/usr/bin/env python3
"""Pré-génère l'audio de la dictée avec une voix LOCALE (Piper), au moment de la construction du contenu.

Rien n'est appelé pendant le jeu : les fichiers .ogg (Opus, mono, 24 kbit/s) sont livrés avec la page et jouent
hors ligne. Un fichier n'est refait que si son texte ou les réglages de voix ont changé (empreintes dans
`scripts/dictee/audio-empreintes.json`), donc relancer le script ne refait que ce qui a changé.

Outils, versions figées :
- piper-tts 1.8.0 (pip), voix fr_FR-siwis-medium (jeu de données SIWIS, licence CC BY 4.0) :
  https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/siwis/medium
  empreinte sha256 du modèle b1d946fd68d0347155fa59bce0a018924abbef3c1561181db45ca463d83963ef
- ffmpeg avec libopus.

Préparer une fois (sur la machine qui génère, sans GPU) :
    python3 -m venv ~/piper/venv && ~/piper/venv/bin/pip install piper-tts==1.8.0
    (télécharger fr_FR-siwis-medium.onnx et .onnx.json dans ~/piper/voices)
Puis :
    ~/piper/venv/bin/python scripts/dictee/generer_audio.py --modele ~/piper/voices/fr_FR-siwis-medium.onnx

Piper tire un peu de bruit à chaque synthèse : deux passes donnent des fichiers voisins, pas identiques à l'octet ;
c'est le texte, la voix et les réglages qui sont figés et vérifiés.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
import wave
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
CATALOGUE = RACINE / 'public/dictee/catalogue.json'
SORTIE = RACINE / 'public'
EMPREINTES = RACINE / 'scripts/dictee/audio-empreintes.json'
MODELE_SHA256 = 'b1d946fd68d0347155fa59bce0a018924abbef3c1561181db45ca463d83963ef'
# Le mot est dit dans une courte phrase porteuse : la voix prononce mal un mot isolé (mesure du 2026-11-16 avec
# verifier_audio.py : 2 à 5 mots sur 20 reconnus seuls, 12 sur 20 dans « Écris le mot … », les autres ratés étant
# surtout des homophones de la reconnaissance elle-même). Le mot est un peu plus lent que la phrase de contexte.
PORTEUSE = 'Écris le mot {}.'
REGLAGES = {'mot': {'length_scale': 1.15}, 'phrase': {'length_scale': 1.05}}
OPUS = ['-c:a', 'libopus', '-b:a', '24k', '-ac', '1', '-ar', '24000', '-map_metadata', '-1', '-fflags', '+bitexact']


def empreinte(texte: str, sorte: str) -> str:
    return hashlib.sha256(json.dumps([texte, MODELE_SHA256, REGLAGES[sorte], OPUS, PORTEUSE], ensure_ascii=False).encode()).hexdigest()[:16]


def main() -> None:
    from piper import PiperVoice, SynthesisConfig  # noqa: PLC0415 — installé seulement là où l'on génère

    p = argparse.ArgumentParser()
    p.add_argument('--modele', type=Path, required=True)
    p.add_argument('--catalogue', type=Path, default=CATALOGUE)
    a = p.parse_args()
    vu = hashlib.sha256(a.modele.read_bytes()).hexdigest()
    if vu != MODELE_SHA256:
        raise SystemExit(f'modèle inattendu : {vu}')
    voix = PiperVoice.load(str(a.modele))
    mots = json.loads(a.catalogue.read_text(encoding='utf-8'))['words']
    connues = json.loads(EMPREINTES.read_text(encoding='utf-8')) if EMPREINTES.exists() else {}
    faits = 0
    taches = [(w['pronunciationAsset'], PORTEUSE.format(w['expectedForm']), 'mot') for w in mots]
    taches += [(w['contextAsset'], w['contextSentence'], 'phrase') for w in mots if w['contextAsset'] and w['contextSentence']]
    with tempfile.TemporaryDirectory() as tmp:
        for chemin, texte, sorte in taches:
            cible, cle = SORTIE / chemin, empreinte(texte, sorte)
            if cible.exists() and connues.get(chemin) == cle:
                continue
            cible.parent.mkdir(parents=True, exist_ok=True)
            wav = Path(tmp) / 'a.wav'
            with wave.open(str(wav), 'wb') as f:
                voix.synthesize_wav(texte, f, syn_config=SynthesisConfig(**REGLAGES[sorte]))
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), *OPUS, str(cible)], check=True)
            connues[chemin] = cle
            faits += 1
            if faits % 50 == 0:
                EMPREINTES.write_text(json.dumps(dict(sorted(connues.items())), indent=0) + '\n', encoding='utf-8')
                print(f'{faits} fichiers', flush=True)
    # Les fichiers qui ne correspondent plus à aucun mot sont retirés.
    attendus = {c for c, _, _ in taches}
    for f in (SORTIE / 'dictee/audio').glob('*.ogg'):
        if f'dictee/audio/{f.name}' not in attendus:
            f.unlink()
            connues.pop(f'dictee/audio/{f.name}', None)
    EMPREINTES.write_text(json.dumps(dict(sorted((k, v) for k, v in connues.items() if k in attendus)), indent=0) + '\n', encoding='utf-8')
    print(f'{faits} fichiers générés, {len(taches)} attendus')


if __name__ == '__main__':
    main()
