#!/usr/bin/env python3
"""Choisit 100 mots par niveau (CP, CE1, CE2, CM1, CM2) pour la dictée de mots.

Sources (téléchargées, jamais versionnées ; empreintes vérifiées) :
- « Liste de fréquence lexicale », ministère de l'Éducation nationale, éduscol (page
  https://eduscol.education.gouv.fr/6873/liste-de-frequence-lexicale, fichier .xls téléchargé le 2026-11-16) :
  près de 1 500 mots les plus fréquents du français, établie par Étienne Brunet, ramenés à leur base lexicale,
  avec leur nature et leur fréquence. Licence : Licence Ouverte / Etalab 2.0 (« Sauf cas particuliers indiqués
  dans les mentions légales, les contenus de ce site sont sous licence etalab-2.0 »), réutilisation libre avec
  mention de la source et de la date. Elle ne donne pas de niveau scolaire : le niveau est attribué ici par la
  fréquence, la longueur et la régularité de l'orthographe (règles ci-dessous).
- Lexique 3.83 (New, Pallier et al., lexique.org) : la prononciation, pour repérer les lettres muettes et les
  homophones. Licence CC BY-SA 4.0.

Le tirage est déterministe : mêmes fichiers, même sortie. Lire le .xls demande `xlrd` (pip install xlrd==2.0.2).
Usage :
    python3 scripts/dictee/selectionner_mots.py --sources <dossier> --sortie scripts/dictee/mots-selection.json
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

SOURCES = {
    'eduscol-liste-frequence.xls': ('https://eduscol.education.gouv.fr/sites/default/files/document/listefrequencedesmots132918292375xls-76260.xls',
                                    '5f3e83e190d197c180aff533e1fea030456104ae61a480c394680fa47f164495'),
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
fois chose truc machin nominal vacance gouvernement parti président saint politique député ministre colon
fusil sein maîtresse amant amour baiser désir passion ivre vin alcool tabac cigarette blessure cri douleur souffrance
malheur misère crainte angoisse haine colère sexe état franc est grand petit nouveau être pouvoir savoir devoir as
mine couche drame instinct mensonge ennemi soldat armée combat juif chrétien prêtre âme esprit dieu église'''.split())
NIVEAUX = ['CP', 'CE1', 'CE2', 'CM1', 'CM2']
NATURES = {'subst.': 'NC', 'adj.': 'ADJ', 'verbe': 'VER', 'adv.': 'ADV'}
# Erreurs repérées dans le fichier source (2026-11-16) : « manier » rangé comme nom est « manière » tronqué ;
# « mari » figure deux fois (30 082 et 4 457) : la première fréquence, invraisemblable, est ignorée.
CORRECTIONS = {'manier': 'manière'}
DOUBLONS_DOUTEUX = {('mari', 30082.0)}
# Au CP, des noms concrets seulement : la liste vient de textes d'adultes et ses noms les plus fréquents sont souvent
# abstraits (raison, doute, effet). CONCRETS_CP est un tri à la main, fait le 2026-11-16, parmi les noms de la liste
# éduscol qui passent les règles du CP (3 à 6 lettres, orthographe régulière, pas de c ni de g doux, pas de son an
# écrit en) : on n'y garde que ce qu'un enfant de six ans peut voir, toucher ou montrer. Le CP prend les 100 plus
# fréquents. Mots proposés à la revue et absents de la liste éduscol : vélo, moto, tomate (non ajoutés).
CONCRETS_CP = set('''femme jour mer main yeux monde fille terre voix maison air mot nuit eau ami porte pied nom pays
ville rue soir soleil bras bruit lettre mois fils matin pierre ombre tour bout bois feu route livre arbre mur chemin
cheveu fleur table lit cheval papier sol cour bord salle oiseau larme chien peau nombre dos dame coin jardin doigt fer
train papa jeu secret jambe minute épaule foule ligne classe odeur oncle midi herbe pluie verre étoile sable hiver pain
phrase rocher école rayon trou pont lune robe cou fil nez aile flamme toit bureau sac voile palais voisin carte animal
été désert joue poche fruit trésor soirée fumée port faim plaine billet rose toile sommet vol banc course chat barbe
rideau loup plante repas corde saison tapis clef ferme paquet abri grain'''.split())
# Mots ajoutés par David le 2026-11-16, hors liste éduscol (et donc hors Licence Ouverte) : le vocabulaire de ses
# enfants. Graphie attendue (une majuscule pour un nom propre ou une marque) et note éventuelle.
AJOUTS_DAVID = {
    'vélo': 'vélo', 'moto': 'moto', 'tomate': 'tomate', 'judo': 'judo', 'piscine': 'piscine', 'train': 'train',
    'maison': 'maison', 'voiture': 'voiture', 'ordinateur': 'ordinateur', 'téléphone': 'téléphone', 'soleil': 'soleil',
    'lune': 'lune', 'papa': 'papa', 'maman': 'maman', 'livre': 'livre', 'vidéo': 'vidéo', 'jouet': 'jouet', 'noël': 'Noël',
    'écran': 'écran', 'montre': 'montre', 'chaussette': 'chaussette', 'pantalon': 'pantalon', 'robe': 'robe',
    'poupée': 'poupée', 'jupe': 'jupe', 'lego': 'Lego', 'playmobil': 'Playmobil',
    # Second envoi, le même jour : la famille, les couleurs, les chiffres (fleur et arbre étaient déjà au CP).
    'cousin': 'cousin', 'cousine': 'cousine', 'fleur': 'fleur', 'arbre': 'arbre',
    'rouge': 'rouge', 'bleu': 'bleu', 'vert': 'vert', 'jaune': 'jaune', 'orange': 'orange', 'violet': 'violet', 'rose': 'rose',
    'noir': 'noir', 'blanc': 'blanc', 'gris': 'gris', 'marron': 'marron',
    'zéro': 'zéro', 'un': 'un', 'deux': 'deux', 'trois': 'trois', 'quatre': 'quatre', 'cinq': 'cinq', 'six': 'six',
    'sept': 'sept', 'huit': 'huit', 'neuf': 'neuf',
}
MARQUES = {'lego', 'playmobil'}
SOURCE_DAVID = 'ajout de David (2026-11-16)'
# Règle de niveau des ajouts : CP par défaut ; CE1 si le mot a plus de 8 lettres, une majuscule, ou une graphie que le
# CP n'a pas encore vue (ph, y, tréma, double consonne, au/eau, c ou g doux, « en »). Ainsi ordinateur (10 lettres),
# téléphone (ph), chaussette (au, ss, tt), piscine (c doux), Noël (majuscule, tréma), Lego et Playmobil (majuscule ;
# y pour Playmobil) vont au CE1 ; pantalon (8 lettres, sons an et on réguliers) reste au CP.
CP_GRAPHIES_AVANCEES = re.compile(r'ph|y|[ëï]|([bcdfglmnprst])\1|e?au')


def niveau_ajout(forme: str) -> str:
    if len(forme) > 8 or forme != forme.lower() or CP_GRAPHIES_AVANCEES.search(forme) or CP_DOUX.search(forme) or CP_AN_EN.search(forme):
        return 'CE1'
    return 'CP'


# Mots éduscol que David veut au CP (2026-11-16), même si la règle des sons ou la longueur les en écartait.
FORCES_CP = set('école sac verre nez rouge voiture'.split())
REPORT_CE1 = set('argent danger espace police prince image nuage genou visage voyage juge ciel vent parent'.split())
# Revue de niveau du 2026-11-16 : au CP, pas de lettre dont le son change avec la voyelle qui suit (c ou g devant e, i, y :
# « police », « argent »), ni de son an écrit en (« argent ») ; ces mots passent au CE1 ou plus loin. La règle
# s'applique à tous les mots, pas à une liste : ciel, image, nuage… suivent le même chemin.
CP_DOUX = re.compile(r'[cg][eiyéèê]')
CP_AN_EN = re.compile(r'(?<!i)e[nm](?![aeiouyéèêàâîôûnm])')
# Un homophone compte s'il est courant (fréquence Lexique, films + livres, par million) : écarte « ter », « vers » rare…
SEUIL_HOMOPHONE = 20


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


def homophones(mot: str, phon: str | None, par_phon: dict[str, list[tuple[str, float]]], lemmes: dict[str, set[str]]) -> list[str]:
    """Les autres mots courants qui se prononcent pareil (hors formes fléchies du même mot)."""
    if not phon:
        return []
    autres: dict[str, float] = {}
    for ortho, freq in par_phon.get(phon, []):
        # Un homophone compte s'il est courant et n'est pas une forme du mot.
        if ortho == mot or mot in lemmes.get(ortho, set()) or ortho in {mot + f for f in ('e', 's', 'es', 'x')} or freq < SEUIL_HOMOPHONE or not set(ortho) <= LETTRES:
            continue
        autres[ortho] = max(autres.get(ortho, 0), freq)
    return sorted(autres, key=lambda o: (-autres[o], o))[:4]


def identifiant(mot: str) -> str:
    """Identifiant stable tiré du mot (« fr-epaule ») : il ne bouge pas quand un autre mot entre ou sort de la liste."""
    plat = ''.join(c for c in unicodedata.normalize('NFD', mot) if unicodedata.category(c) != 'Mn')
    return 'fr-' + re.sub(r'[^a-z]', '-', plat)


def etiquettes(mot: str, phon: str | None, homos: list[str]) -> list[str]:
    t = []
    if any(c in ACCENTS for c in mot):
        t.append('accent')
    if any(a == b and a not in 'aeiouy' for a, b in zip(mot, mot[1:])):
        t.append('double-consonne')
    if 'eau' in mot or 'au' in mot:
        t.append('son-o')
    # an, en, am, em font le son an seulement devant une consonne ou en fin de mot (pas dans « ami », « ennemi »).
    if re.search(r'[ae][nm](?![aeiouyéèêàâîôûnm])', mot):
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
    # Les mots qu'un adulte a retirés à la relecture ne reviennent pas ; le suivant de la liste prend la place.
    retires = Path(__file__).with_name('mots-retires.json')
    if retires.exists():
        ECARTES.update(json.loads(retires.read_text(encoding='utf-8')))
    chemins = charger(a.sources)
    phon_de, par_phon, lemmes = lire_lexique(chemins['Lexique383.tsv'])
    mots: dict[str, dict] = {}
    import xlrd  # noqa: PLC0415 — utile seulement ici

    feuille = xlrd.open_workbook(str(chemins['eduscol-liste-frequence.xls'])).sheet_by_index(0)
    for r in range(1, feuille.nrows):
        nature, freq, brut = feuille.row_values(r)[:3]
        mot = unicodedata.normalize('NFC', str(brut).strip())
        if mot in CORRECTIONS:
            mot = CORRECTIONS[mot]
        cat = NATURES.get(str(nature).strip())
        if (mot, freq) in DOUBLONS_DOUTEUX or mot in ('tout', 'toute'):
            continue
        if not cat or mot in ECARTES or not set(mot) <= LETTRES or len(mot) < 2 or 'oe' in mot:
            continue
        # Un même mot peut figurer deux fois : on garde la fréquence la plus forte.
        if mot in mots and mots[mot]['f'] >= freq:
            continue
        mots[mot] = {'mot': mot, 'cat': cat, 'f': float(freq)}

    pris: set[str] = set()
    ajouts: dict[str, list[str]] = {n: [] for n in NIVEAUX}
    fixes: dict[str, str] = {}

    def choisir(niveau: str, cats: tuple[str, ...], lmin: int, lmax: int, saut: int = 0, filtre=lambda m: True) -> list[dict]:
        cand = [m for m in mots.values() if (fixes.get(m['mot']) == niveau or (m['mot'] not in fixes and m['cat'] in cats and lmin <= len(m['mot']) <= lmax
                and filtre(m))) and m['mot'] not in pris]
        # Un ajout de David déjà à ce niveau y reste ; puis les mots reportés d'un niveau plus bas passent avant les
        # autres : un report n'est jamais une suppression.
        cand.sort(key=lambda m: (fixes.get(m['mot']) != niveau, m['mot'] not in reportes, -m['f'], m['mot']))
        # Les ajouts de David prennent leur place au niveau : les derniers mots éduscol cèdent la leur et sont reportés.
        places = 100 - len(ajouts[niveau])
        choix = cand[saut:saut + places]
        if len(choix) < places:
            sys.exit(f'{niveau} : {len(choix)} mots seulement')
        reportes.update(m['mot'] for m in cand[saut + places:saut + 100])
        pris.update(m['mot'] for m in choix)
        return choix

    reportes: set[str] = set()

    def regulier(m: dict) -> bool:
        phon = phon_de.get(m['mot'])
        return phon is not None and len(m['mot']) - len(phon) <= 2 and not (set(m['mot']) & (ACCENTS - {'é'}))

    if os.environ.get('LISTER_CP'):
        cand = [m for m in mots.values() if m['cat'] == 'NC' and 3 <= len(m['mot']) <= 6 and regulier(m) and not CP_DOUX.search(m['mot']) and not CP_AN_EN.search(m['mot'])]
        print(' '.join(m['mot'] for m in sorted(cand, key=lambda m: -m['f'])))
        sys.exit(0)
    # Noms concrets écartés du CP par la seule règle des sons (c ou g doux, an écrit en) : ils sont reportés au CE1.
    reportes = {m['mot'] for m in mots.values() if m['cat'] == 'NC' and 3 <= len(m['mot']) <= 7 and regulier(m)
                and m['mot'] in CONCRETS_CP | REPORT_CE1 and (CP_DOUX.search(m['mot']) or CP_AN_EN.search(m['mot']))}
    def selectionner() -> dict[str, list[dict]]:
        pris.clear()
        return {
            'CP': choisir('CP', ('NC',), 3, 6, filtre=lambda m: regulier(m) and m['mot'] in CONCRETS_CP
                         and not CP_DOUX.search(m['mot']) and not CP_AN_EN.search(m['mot'])),
            'CE1': choisir('CE1', ('NC', 'ADJ', 'VER'), 3, 7, filtre=lambda m: not (set(m['mot']) & (ACCENTS - {'é', 'è', 'ê'}))),
            'CE2': choisir('CE2', ('NC', 'ADJ', 'VER', 'ADV'), 4, 8),
            'CM1': choisir('CM1', ('NC', 'ADJ', 'VER', 'ADV'), 5, 10),
            'CM2': choisir('CM2', ('NC', 'ADJ', 'VER', 'ADV'), 5, 14),
        }

    # Un ajout de David que la liste éduscol avait déjà choisi reste à son niveau (premier tour, sans ajout) ; les
    # autres sont placés par niveau_ajout() et poussent en cascade les derniers mots éduscol (second tour).
    reportes_depart = set(reportes)
    sans_ajout = selectionner()
    for niveau, choix in sans_ajout.items():
        for m in choix:
            if m['mot'] in AJOUTS_DAVID:
                fixes[m['mot']] = niveau
    # Décision de David (2026-11-16) : ces mots de la liste éduscol sont au CP, hors règle des sons et de longueur.
    # Ils prennent la place des derniers mots éduscol du CP, reportés au CE1 ; un mot de David ne sort jamais du CP.
    for mot in FORCES_CP:
        fixes[mot] = 'CP'
    mots_eduscol = dict(mots)
    for mot, forme in AJOUTS_DAVID.items():
        if mot not in fixes:
            mots.pop(mot, None)
            ajouts[niveau_ajout(forme)].append(mot)
    reportes.clear()
    reportes.update(reportes_depart)
    selection = selectionner()
    for niveau in NIVEAUX:
        for mot in ajouts[niveau]:
            selection[niveau].append({'mot': mot, 'cat': 'NC', 'f': None, 'david': True})
    rang_de = {m['mot']: i for i, m in enumerate(sorted(mots_eduscol.values(), key=lambda m: (-m['f'], m['mot'])), 1)}
    sortie = []
    for niveau in NIVEAUX:
        for m in sorted(selection[niveau], key=lambda m: m['mot']):
            phon = phon_de.get(m['mot'])
            homos = homophones(m['mot'], phon, par_phon, lemmes)
            forme = AJOUTS_DAVID.get(m['mot'], m['mot'])
            tags = etiquettes(m['mot'], phon, homos) + (['majuscule'] if forme != m['mot'] else []) + (['marque'] if m['mot'] in MARQUES else [])
            if m.get('david') or m['mot'] in fixes:
                source = {'list': SOURCE_DAVID, 'rank': rang_de.get(m['mot']), 'frequency': mots_eduscol[m['mot']]['f'] if m['mot'] in mots_eduscol else None}
                if m['mot'] in fixes:
                    source['alsoIn'] = 'éduscol, liste de fréquence lexicale (É. Brunet), Licence Ouverte 2.0'
            else:
                source = {'list': 'éduscol, liste de fréquence lexicale (É. Brunet), Licence Ouverte 2.0', 'rank': rang_de[m['mot']], 'frequency': m['f']}
            sortie.append({
                'id': identifiant(m['mot']), 'lemma': m['mot'], 'expectedForm': forme, 'grade': niveau,
                'category': m['cat'], 'tags': tags, 'homophones': homos, 'difficulty': difficulte(forme, phon, tags),
                'source': source,
            })
            if m['mot'] in MARQUES:
                sortie[-1]['note'] = "nom de marque, graphie attendue avec majuscule : à relire par un adulte"
    # Deux mots qui ne diffèrent que par un accent (marche, marché) : le mot accentué prend un suffixe.
    vus: dict[str, int] = {}
    for w in sorted(sortie, key=lambda w: (w['id'], w['lemma'] != w['id'][3:].replace('-', ' '), w['lemma'])):
        n = vus.get(w['id'], 0)
        vus[w['id']] = n + 1
        if n:
            w['id'] = f"{w['id']}-{n + 1}"
    ids = [w['id'] for w in sortie]
    if len(set(ids)) != len(ids):
        sys.exit('identifiants en double : ' + ' '.join(sorted({i for i in ids if ids.count(i) > 1})))
    a.sortie.write_text(json.dumps(sortie, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(sortie)} mots écrits dans {a.sortie}', file=sys.stderr)


if __name__ == '__main__':
    main()
