#!/usr/bin/env python3
"""Contre-épreuve de l'audio : chaque mot pré-généré (dans sa phrase porteuse) et chaque phrase sont réécoutés par une reconnaissance vocale locale
(faster-whisper, CPU) et comparé au mot attendu. Un mot dont la transcription ne s'entend pas comme le mot
(ni comme un de ses homophones) est signalé : c'est à réécouter avant de le valider.

    ~/.venv-stt/bin/python scripts/dictee/verifier_audio.py [--sortie rapport.json]
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]


# La reconnaissance écrit les nombres en chiffres (« Écris le mot 2. ») : on les remet en lettres.
NOMBRES = {'1': 'un', '2': 'deux', '3': 'trois', '4': 'quatre', '5': 'cinq', '6': 'six', '7': 'sept', '8': 'huit', '9': 'neuf', '10': 'dix', '100': 'cent', '1000': 'mille'}


def simple(t: str) -> str:
    t = re.sub(r'\d+', lambda m: f' {NOMBRES.get(m.group(), m.group())} ', t)
    t = unicodedata.normalize('NFD', t.lower())
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z ]', ' ', t)


def entendu_dans(mot: str, texte: str, autres: list[str]) -> bool:
    """Le mot (ou un homophone, ou sa forme au pluriel ou en -é/-ez pour un verbe) est dans la transcription."""
    vus = simple(texte).split()
    cibles = {simple(mot).strip()} | {simple(h).strip() for h in autres}
    if mot.endswith('er'):
        cibles |= {mot[:-2] + 'e', mot[:-2] + 'ez'}
    return any(v in cibles or v.rstrip('sx') in cibles for v in vus)


def main() -> None:
    from faster_whisper import WhisperModel  # noqa: PLC0415 — installé seulement là où l'on vérifie

    p = argparse.ArgumentParser()
    p.add_argument('--sortie', type=Path)
    a = p.parse_args()
    mots = json.loads((RACINE / 'public/dictee/catalogue.json').read_text(encoding='utf-8'))['words']
    modele = WhisperModel('small', device='cpu', compute_type='int8')
    resultats = []
    for w in mots:
        segs, _ = modele.transcribe(str(RACINE / 'public' / w['pronunciationAsset']), language='fr', beam_size=5, vad_filter=False)
        texte = ' '.join(s.text for s in segs).strip()
        r = {'id': w['id'], 'mot': w['expectedForm'], 'entendu': texte, 'ok': entendu_dans(w['expectedForm'], texte, w['homophones'])}
        if w.get('contextAsset'):
            segs, _ = modele.transcribe(str(RACINE / 'public' / w['contextAsset']), language='fr', beam_size=5)
            r['phraseEntendue'] = ' '.join(s.text for s in segs).strip()
            r['phraseOk'] = entendu_dans(w['expectedForm'], r['phraseEntendue'], w['homophones'])
        resultats.append(r)
    douteux = [r for r in resultats if not r['ok']]
    phrases = [r for r in resultats if 'phraseOk' in r]
    print(f'{len(resultats) - len(douteux)}/{len(resultats)} mots reconnus ; phrases : {sum(r["phraseOk"] for r in phrases)}/{len(phrases)} ; à réécouter : {len(douteux)}')
    for r in douteux:
        print(f"  {r['id']} {r['mot']!r} entendu {r['entendu']!r}")
    if a.sortie:
        a.sortie.write_text(json.dumps(resultats, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
