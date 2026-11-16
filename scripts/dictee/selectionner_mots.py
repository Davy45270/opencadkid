#!/usr/bin/env python3
"""Choisit 100 mots par niveau (CP, CE1, CE2, CM1, CM2) pour la dictée de mots.

Sources (téléchargées, jamais versionnées ; empreintes vérifiées) :
- Manulex, lemmes (Lété, Sprenger-Charolles et Colé, 2004) : fréquences d'usage dans les manuels
  scolaires de l'école élémentaire, par niveau (CP, CE1, CE2 à CM2). Diffusé par Openlexicon (lexique.org).
- Lexique 3.83 (New, Pallier et al.) : la prononciation, pour repérer les homophones. Licence CC BY-SA 4.0.

Le tirage est déterministe : mêmes fichiers, même sortie. Usage :
    python3 scripts/dictee/selectionner_mots.py --sources <dossier> --sortie scripts/dictee/mots-selection.json
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
import unicodedata
import urllib.request
from pathlib import Path

SOURCES = {
    'Manulex-Lemmes.tsv': ('http://www.lexique.org/databases/Lete_2004_Manulex/Manulex-Lemmes.tsv',
                           '044aa8e9fe262e56afe91a5a8fa38b47f4238219271896587b6d70f23cdb51d8'),
    'Lexique383.tsv': ('http://www.lexique.org/databases/Lexique383/Lexique383.tsv',
                       '637ba37a767a66679c48371d673ece50cbf541b49a4e40e598963d4f3fbce52b'),
}
# Lettres que le clavier du jeu sait taper : l'alphabet et la rangée d'accents.
LETTRES = set('abcdefghijklmnopqrstuvwxyzéèêàâçùîôëï')
ACCENTS = set('éèêàâçùîôëï')
# Mots écartés : peu adaptés à un enfant de six ans, ou trop ambigus sans contexte.
ECARTES = set('''mort mourir tuer sang fusil arme guerre bombe cadavre poison prison voleur diable enfer crime
bête idiot imbécile stupide sale crotte caca pipi zizi fesse sein nu dieu église messe roi reine madame monsieur
mademoiselle oh ah eh hé bah ha non oui ok nan tu il elle on je nous vous ils elles le la les un une des du au aux ce
cet cette ces mon ton son ma ta sa mes tes ses notre votre leur leurs qui que quoi dont où faire être avoir aller dire
fois chose truc machin nominal vacance'''.split())
NIVEAUX = ['CP', 'CE1', 'CE2', 'CM1', 'CM2']


def nombre(texte: str) -> float:
    texte = texte.replace(' ', '').replace(' ', '').replace(' ', '').replace(',', '.')
    return float(texte) if texte else 0.0


def charger(dossier: Path) -> dict[str, Path]:
    dossier.mkdir(parents=True, exist_ok=True)
    chemins = {}
    for nom, (url, empreinte) in SOURCES.items():
        chemin = dossier / nom
        if not chemin.exists():
            print(f'téléchargement de {url}', file=sys.stderr)
            urllib.request.urlretrieve(url, chemin)
        vue = hashlib.sha256(chemin.read_bytes()).hexdigest()
        if vue != empreinte:
            sys.exit(f'{nom} : empreinte {vue}, attendue {empreinte}')
        chemins[nom] = chemin
    return chemins


def lire_lexique(chemin: Path) -> tuple[dict[str, str], dict[str, list[tuple[str, float]]], dict[str, set[str]]]:
    """Prononciation de chaque forme (la plus fréquente), formes de base par prononciation, lemmes de chaque forme."""
    phon_de: dict[str, tuple[str, float]] = {}
    par_phon: dict[str, list[tuple[str, float]]] = {}
    lemmes: dict[str, set[str]] = {}
    with chemin.open(encoding='utf-8') as f:
        for ligne in csv.DictReader(f, delimiter='\t', quoting=csv.QUOTE_NONE):
            ortho, phon, lemme = ligne['ortho'], ligne['phon'], ligne['lemme']
            freq = nombre(ligne['freqfilms2']) + nombre(ligne['freqlivres'])
            if ortho not in phon_de or freq > phon_de[ortho][1]:
                phon_de[ortho] = (phon, freq)
            lemmes.setdefault(ortho, set()).add(lemme)
            # Seules les formes de base (le mot du dictionnaire) comptent comme homophones.
            if ortho == lemme:
                par_phon.setdefault(phon, []).append((ortho, freq))
    return {o: p for o, (p, _) in phon_de.items()}, par_phon, lemmes


def homophones(mot: str, phon: str | None, par_phon: dict[str, list[tuple[str, float]]], lemmes: dict[str, set[str]], connus: set[str]) -> list[str]:
    """Les autres mots courants qui se prononcent pareil (hors formes fléchies du même mot)."""
    if not phon:
        return []
    autres: dict[str, float] = {}
    for ortho, freq in par_phon.get(phon, []):
        # Un homophone compte s'il figure lui-même dans les manuels (Manulex) et n'est pas une forme du mot.
        if ortho == mot or mot in lemmes.get(ortho, set()) or ortho.startswith(mot) or freq < 5 or ortho not in connus:
            continue
        autres[ortho] = max(autres.get(ortho, 0), freq)
    return sorted(autres, key=lambda o: (-autres[o], o))[:4]


def etiquettes(mot: str, phon: str | None, homos: list[str]) -> list[str]:
    t = []
    if any(c in ACCENTS for c in mot):
        t.append('accent')
    if any(a == b and a not in 'aeiouy' for a, b in zip(mot, mot[1:])):
        t.append('double-consonne')
    if 'eau' in mot or 'au' in mot:
        t.append('son-o')
    if any(g in mot for g in ('an', 'en', 'am', 'em')):
        t.append('son-an')
    if phon is not None and mot[-1] in 'tdspxz' and not phon.endswith(mot[-1]):
        t.append('lettre-muette')
    if homos:
        t.append('homophone')
    return t


def difficulte(mot: str, phon: str | None, tags: list[str]) -> int:
    """1 (facile) à 5 : longueur, lettres qui ne s'entendent pas, accents, doubles consonnes."""
    muettes = max(0, len(mot) - len(phon)) if phon else 1
    brut = len(mot) / 3 + muettes * .7 + ('accent' in tags) * .6 + ('double-consonne' in tags) * .8 + ('homophone' in tags) * .8
    return max(1, min(5, round(brut - .5)))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--sources', type=Path, required=True)
    p.add_argument('--sortie', type=Path, required=True)
    a = p.parse_args()
    chemins = charger(a.sources)
    phon_de, par_phon, lemmes = lire_lexique(chemins['Lexique383.tsv'])
    mots: dict[str, dict] = {}
    connus: set[str] = set()
    with chemins['Manulex-Lemmes.tsv'].open(encoding='utf-8') as f:
        for ligne in csv.DictReader(f, delimiter='\t', quoting=csv.QUOTE_NONE):
            mot = unicodedata.normalize('NFC', ligne['Word'].strip())
            cat = ligne['SYNT']
            connus.add(mot)
            if cat not in ('NC', 'ADJ', 'VER', 'ADV') or mot in ECARTES or not set(mot) <= LETTRES or len(mot) < 2:
                continue
            u = {'CP': nombre(ligne['CP_U']), 'CE1': nombre(ligne['CE1_U']), 'CE2-CM2': nombre(ligne['CE2-CM2_U'])}
            # Un même mot peut être nom et adjectif : on garde la catégorie la plus fréquente.
            if mot in mots and sum(mots[mot]['u'].values()) >= sum(u.values()):
                continue
            mots[mot] = {'mot': mot, 'cat': cat, 'u': u}

    pris: set[str] = set()

    def choisir(niveau: str, cle: str, cats: tuple[str, ...], lmin: int, lmax: int, saut: int = 0, filtre=lambda m: True) -> list[dict]:
        cand = [m for m in mots.values() if m['cat'] in cats and lmin <= len(m['mot']) <= lmax and m['mot'] not in pris and m['u'][cle] > 0 and filtre(m)]
        cand.sort(key=lambda m: (-m['u'][cle], m['mot']))
        choix = cand[saut:saut + 100]
        if len(choix) < 100:
            sys.exit(f'{niveau} : {len(choix)} mots seulement')
        pris.update(m['mot'] for m in choix)
        return choix

    def regulier(m: dict) -> bool:
        phon = phon_de.get(m['mot'])
        return phon is not None and len(m['mot']) - len(phon) <= 2 and not (set(m['mot']) & (ACCENTS - {'é'}))

    selection = {
        'CP': choisir('CP', 'CP', ('NC',), 3, 6, filtre=regulier),
        'CE1': choisir('CE1', 'CE1', ('NC', 'ADJ', 'VER'), 4, 7),
        'CE2': choisir('CE2', 'CE2-CM2', ('NC', 'ADJ', 'VER', 'ADV'), 5, 8),
        'CM1': choisir('CM1', 'CE2-CM2', ('NC', 'ADJ', 'VER', 'ADV'), 6, 9),
        'CM2': choisir('CM2', 'CE2-CM2', ('NC', 'ADJ', 'VER', 'ADV'), 7, 12),
    }
    sortie = []
    for niveau in NIVEAUX:
        for rang, m in enumerate(sorted(selection[niveau], key=lambda m: m['mot']), 1):
            phon = phon_de.get(m['mot'])
            homos = homophones(m['mot'], phon, par_phon, lemmes, connus)
            tags = etiquettes(m['mot'], phon, homos)
            sortie.append({
                'id': f'fr-{niveau.lower()}-{rang:03d}', 'lemma': m['mot'], 'expectedForm': m['mot'], 'grade': niveau,
                'category': m['cat'], 'tags': tags, 'homophones': homos, 'difficulty': difficulte(m['mot'], phon, tags),
                'source': {'list': 'Manulex lemmes', 'grade': 'CP' if niveau == 'CP' else 'CE1' if niveau == 'CE1' else 'CE2-CM2',
                           'frequencyPerMillion': round(m['u']['CP' if niveau == 'CP' else 'CE1' if niveau == 'CE1' else 'CE2-CM2'], 2)},
            })
    a.sortie.write_text(json.dumps(sortie, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(sortie)} mots écrits dans {a.sortie}', file=sys.stderr)


if __name__ == '__main__':
    main()
