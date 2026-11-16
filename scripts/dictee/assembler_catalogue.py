#!/usr/bin/env python3
"""Assemble le catalogue versionné du jeu (public/dictee/catalogue.json) et la liste de relecture (CSV).

Entrées : la sélection de mots (selectionner_mots.py) et les propositions de phrases (rediger_phrases.py).
Les relectures viennent de `scripts/dictee/relectures.json` (écrit par importer_validation.py depuis la page de
relecture) : un mot est `reviewed` tant que sa forme, sa phrase et son explication sont celles que l'adulte a vues ;
si l'une change, il redevient brouillon.

    python3 scripts/dictee/assembler_catalogue.py [--csv relecture.csv]
"""
from __future__ import annotations

import argparse
import csv
import json
import unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
SELECTION = RACINE / 'scripts/dictee/mots-selection.json'
PHRASES = RACINE / 'scripts/dictee/phrases.json'
CATALOGUE = RACINE / 'public/dictee/catalogue.json'
RELECTURES = RACINE / 'scripts/dictee/relectures.json'
VERSION = 2
NOMS = {'CP': 'CP', 'CE1': 'CE1', 'CE2': 'CE2', 'CM1': 'CM1', 'CM2': 'CM2'}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--csv', type=Path)
    a = p.parse_args()
    mots = json.loads(SELECTION.read_text(encoding='utf-8'))
    phrases = {r['lemma']: r for r in json.loads(PHRASES.read_text(encoding='utf-8'))} if PHRASES.exists() else {}
    relus = json.loads(RELECTURES.read_text(encoding='utf-8')) if RELECTURES.exists() else {}
    words = []
    for m in mots:
        ph = phrases.get(m['lemma'], {})
        r = relus.get(m['lemma'])
        forme = r.get('expectedForm', m['expectedForm']) if r else m['expectedForm']
        phrase, expl = ph.get('contextSentence'), ph.get('explanation')
        w = {
            'id': m['id'], 'lemma': m['lemma'], 'expectedForm': unicodedata.normalize('NFC', forme), 'grade': m['grade'],
            'tags': m['tags'], 'homophones': m['homophones'], 'contextSentence': phrase, 'explanation': expl,
            'pronunciationAsset': f"dictee/audio/{m['id']}.ogg", 'contextAsset': f"dictee/audio/{m['id']}-phrase.ogg" if phrase else None,
            'difficulty': m['difficulty'], 'contentStatus': 'draft', 'validatedBy': None, 'version': VERSION,
            'provenance': {'list': m['source']['list'], 'listRank': m['source']['rank'], 'listFrequency': m['source']['frequency'],
                           'text': ph.get('generatedBy')},
        }
        if r and all(r.get(k) == w[k] for k in ('expectedForm', 'contextSentence', 'explanation')):
            w['contentStatus'], w['validatedBy'] = 'reviewed', r['by']
        words.append(w)
    CATALOGUE.parent.mkdir(parents=True, exist_ok=True)
    CATALOGUE.write_text(json.dumps({'schemaVersion': '1.0', 'version': VERSION, 'locale': 'fr-FR', 'words': words}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(words)} mots, {sum(w["contentStatus"] == "reviewed" for w in words)} relus, {sum(not w["contextSentence"] for w in words)} sans phrase')
    if a.csv:
        with a.csv.open('w', encoding='utf-8', newline='') as f:
            out = csv.writer(f)
            out.writerow(['niveau', 'identifiant', 'mot', 'phrase de contexte', 'explication', 'homophones', 'étiquettes', 'difficulté', 'source', 'rang dans la liste', 'statut'])
            for w in words:
                out.writerow([w['grade'], w['id'], w['expectedForm'], w['contextSentence'] or '', w['explanation'] or '', ' '.join(w['homophones']), ' '.join(w['tags']),
                              w['difficulty'], "liste de fréquence lexicale éduscol (Licence Ouverte 2.0) ; phrase et explication : brouillon à relire", w['provenance']['listRank'], w['contentStatus']])


if __name__ == '__main__':
    main()
