#!/usr/bin/env python3
"""Assemble le catalogue versionné du jeu (public/dictee/catalogue.json) et la liste de relecture (CSV).

Entrées : la sélection de mots (selectionner_mots.py) et les propositions de phrases (rediger_phrases.py).
Une relecture déjà faite est gardée : un mot passé à `reviewed` dans le catalogue existant le reste tant que sa
forme, sa phrase et son explication n'ont pas changé ; sinon il redevient brouillon.

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
VERSION = 1
NOMS = {'CP': 'CP', 'CE1': 'CE1', 'CE2': 'CE2', 'CM1': 'CM1', 'CM2': 'CM2'}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--csv', type=Path)
    a = p.parse_args()
    mots = json.loads(SELECTION.read_text(encoding='utf-8'))
    phrases = {r['id']: r for r in json.loads(PHRASES.read_text(encoding='utf-8'))} if PHRASES.exists() else {}
    avant = {w['id']: w for w in json.loads(CATALOGUE.read_text(encoding='utf-8'))['words']} if CATALOGUE.exists() else {}
    words = []
    for m in mots:
        ph = phrases.get(m['id'], {})
        phrase, expl = ph.get('contextSentence'), ph.get('explanation')
        w = {
            'id': m['id'], 'lemma': m['lemma'], 'expectedForm': unicodedata.normalize('NFC', m['expectedForm']), 'grade': m['grade'],
            'tags': m['tags'], 'homophones': m['homophones'], 'contextSentence': phrase, 'explanation': expl,
            'pronunciationAsset': f"dictee/audio/{m['id']}.ogg", 'contextAsset': f"dictee/audio/{m['id']}-phrase.ogg" if phrase else None,
            'difficulty': m['difficulty'], 'contentStatus': 'draft', 'validatedBy': None, 'version': VERSION,
            'provenance': {'list': m['source']['list'], 'listGrade': m['source']['grade'], 'frequencyPerMillion': m['source']['frequencyPerMillion'],
                           'text': ph.get('generatedBy') and {'by': 'local language model, draft to review', **ph['generatedBy']}},
        }
        v = avant.get(m['id'])
        if v and v.get('contentStatus') == 'reviewed' and all(v.get(k) == w[k] for k in ('expectedForm', 'contextSentence', 'explanation')):
            w['contentStatus'], w['validatedBy'], w['version'] = 'reviewed', v['validatedBy'], v.get('version', VERSION)
        words.append(w)
    CATALOGUE.parent.mkdir(parents=True, exist_ok=True)
    CATALOGUE.write_text(json.dumps({'schemaVersion': '1.0', 'version': VERSION, 'locale': 'fr-FR', 'words': words}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(words)} mots, {sum(w["contentStatus"] == "reviewed" for w in words)} relus, {sum(not w["contextSentence"] for w in words)} sans phrase')
    if a.csv:
        with a.csv.open('w', encoding='utf-8', newline='') as f:
            out = csv.writer(f)
            out.writerow(['niveau', 'identifiant', 'mot', 'phrase de contexte', 'explication', 'homophones', 'étiquettes', 'difficulté', 'source', 'fréquence par million', 'statut'])
            for w in words:
                out.writerow([w['grade'], w['id'], w['expectedForm'], w['contextSentence'] or '', w['explanation'] or '', ' '.join(w['homophones']), ' '.join(w['tags']),
                              w['difficulty'], f"Manulex lemmes ({w['provenance']['listGrade']}) ; phrase et explication : brouillon LLM local", w['provenance']['frequencyPerMillion'], w['contentStatus']])


if __name__ == '__main__':
    main()
