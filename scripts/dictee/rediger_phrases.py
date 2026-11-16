#!/usr/bin/env python3
"""Propose, pour chaque mot choisi, une phrase de contexte et une explication d'une ligne.

Le modèle est un LLM LOCAL (passerelle compatible OpenAI, route `llm-local`), utilisé seulement ici, à la
préparation du contenu, jamais pendant le jeu. Tout ce qu'il propose reste un BROUILLON
(`contentStatus: "draft"`, `validatedBy: null`) tant qu'un adulte ne l'a pas relu.

Chaque proposition est contrôlée : la phrase contient le mot exact, compte 4 à 12 mots et finit par un point ;
l'explication tient en une ligne. Sinon la question est reposée (3 essais), puis la case reste vide.
Les propositions déjà faites sont gardées (reprise possible) : supprimer le fichier de sortie pour tout refaire.

    LLM_URL=http://<passerelle>:4000 LLM_KEY=<clé> python3 scripts/dictee/rediger_phrases.py \
        --entree scripts/dictee/mots-selection.json --sortie scripts/dictee/phrases.json
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

MODELE = 'llm-local'
VERSION_CONSIGNE = 3
CONSIGNE = """Tu prépares une dictée de mots pour des enfants de 6 à 11 ans (niveau {grade}, école en France).
Le mot dicté est : « {mot} » ({categorie}).{homos}
Ce qui est difficile dans ce mot : {pieges}.{accord}
Réponds UNIQUEMENT par un objet JSON {{"phrase": "...", "explication": "..."}} :
- "phrase" : une phrase courte (5 à 10 mots), simple, concrète et gentille, au présent si possible, qui contient
  exactement la forme « {mot} » (sans la changer : même accord, mêmes accents) et qui en rend le sens évident.
  Pas de prénom, pas de marque, rien d'effrayant.
- "explication" : UNE ligne (12 mots au plus) qui aide à retenir l'orthographe de « {mot} » : une lettre muette
  qu'on entend dans un mot de la même famille, un accent, une double consonne, un son qui s'écrit d'une façon
  particulière. Parle seulement de ce qui est difficile ci-dessus, et seulement si c'est vrai. Tutoie l'enfant. Exemple pour « chat » : "Un t muet à la fin, comme dans chaton."
"""
# Version 3 : un adjectif écrit tel quel (masculin singulier) doit qualifier un nom masculin singulier ; la version 2
# donnait « L'herbe est très vert ».
ACCORDS = {'ADJ': "\nC'est un adjectif au masculin singulier : il doit qualifier un nom masculin singulier (« un ciel bleu »), jamais un nom féminin ou pluriel.",
           'NC': "\nC'est un nom : emploie-le au singulier, comme nom (pas comme verbe)."}
CATEGORIES = {'NC': 'nom', 'ADJ': 'adjectif', 'VER': 'verbe à l\'infinitif', 'ADV': 'mot invariable'}


def mots_de(phrase: str) -> list[str]:
    return [m for m in re.split(r"[^\wàâçéèêëîïôûùüÿœæ-]+", unicodedata.normalize('NFC', phrase.lower())) if m]


def valide(mot: str, r: object) -> str | None:
    if not isinstance(r, dict):
        return 'pas un objet'
    phrase, expl = r.get('phrase'), r.get('explication')
    if not isinstance(phrase, str) or not isinstance(expl, str):
        return 'champs manquants'
    if mot.lower() not in mots_de(phrase):
        return 'mot absent de la phrase'
    if not 4 <= len(phrase.split()) <= 12 or not re.search(r'[.!?]$', phrase.strip()):
        return 'phrase trop longue ou sans point'
    if '\n' in expl or len(expl.split()) > 16 or not expl.strip():
        return 'explication trop longue'
    return None


def pieges(mot: str, tags: list[str]) -> str:
    """Les difficultés du mot, repérées par la sélection, dites en clair pour guider l'explication."""
    p = []
    doubles = sorted({a + b for a, b in zip(mot, mot[1:]) if a == b and a not in 'aeiouy'})
    if doubles:
        p.append('double consonne ' + ', '.join(doubles))
    accents = sorted({c for c in mot if c in 'éèêàâçùîôëï'})
    if accents:
        p.append('accent sur ' + ', '.join(accents))
    if 'lettre-muette' in tags:
        p.append(f'la dernière lettre « {mot[-1]} » ne s\'entend pas')
    if 'eau' in mot:
        p.append('le son o s\'écrit eau')
    elif 'au' in mot:
        p.append('le son o s\'écrit au')
    return '; '.join(p) or 'il s\'écrit comme il se prononce, mais il faut bien écouter chaque son'


def demander(entree: dict) -> dict:
    url, cle = os.environ['LLM_URL'].rstrip('/'), os.environ['LLM_KEY']
    homos = f" Attention, il se prononce comme : {', '.join(entree['homophones'])} ; la phrase doit lever le doute." if entree['homophones'] else ''
    texte = CONSIGNE.format(grade=entree['grade'], mot=entree['expectedForm'], categorie=CATEGORIES.get(entree['category'], 'mot'), homos=homos,
                                 accord=ACCORDS.get(entree['category'], ''),
                                 pieges=pieges(entree['expectedForm'], entree['tags']))
    erreur = None
    for essai in range(3):
        corps = {'model': MODELE, 'temperature': 0.2 + essai * 0.2, 'seed': 7 + essai, 'max_tokens': 300,
                 'messages': [{'role': 'user', 'content': texte}], 'response_format': {'type': 'json_object'}}
        req = urllib.request.Request(f'{url}/v1/chat/completions', data=json.dumps(corps).encode(),
                                     headers={'Authorization': f'Bearer {cle}', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=180) as rep:
                donnees = json.load(rep)
            contenu = donnees['choices'][0]['message']['content'].strip()
            contenu = re.sub(r'^```(?:json)?|```$', '', contenu).strip()
            r = json.loads(contenu)
        except Exception as e:  # noqa: BLE001 — on note et on repose la question
            erreur = f'{type(e).__name__}'
            continue
        erreur = valide(entree['expectedForm'], r)
        if erreur is None:
            return {'id': entree['id'], 'lemma': entree['lemma'], 'contextSentence': unicodedata.normalize('NFC', r['phrase'].strip()),
                    'explanation': unicodedata.normalize('NFC', r['explication'].strip()),
                    'generatedBy': {'model': donnees.get('model', MODELE), 'route': MODELE, 'promptVersion': VERSION_CONSIGNE, 'attempt': essai + 1}}
    return {'id': entree['id'], 'lemma': entree['lemma'], 'contextSentence': None, 'explanation': None, 'error': erreur}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--entree', type=Path, required=True)
    p.add_argument('--sortie', type=Path, required=True)
    p.add_argument('--paralleles', type=int, default=3)
    a = p.parse_args()
    mots = json.loads(a.entree.read_text(encoding='utf-8'))
    faits = {r['id']: r for r in json.loads(a.sortie.read_text(encoding='utf-8'))} if a.sortie.exists() else {}
    a_faire = [m for m in mots if not faits.get(m['id'], {}).get('contextSentence')]
    print(f'{len(a_faire)} mots à rédiger', file=sys.stderr)
    with ThreadPoolExecutor(a.paralleles) as pool:
        for n, r in enumerate(pool.map(demander, a_faire), 1):
            faits[r['id']] = r
            if n % 20 == 0 or n == len(a_faire):
                ordre = [faits[m['id']] for m in mots if m['id'] in faits]
                a.sortie.write_text(json.dumps(ordre, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
                print(f'{n}/{len(a_faire)}', file=sys.stderr, flush=True)
    manquants = [m['id'] for m in mots if not faits.get(m['id'], {}).get('contextSentence')]
    print(f'sans proposition : {len(manquants)} {manquants[:20]}', file=sys.stderr)


if __name__ == '__main__':
    main()
