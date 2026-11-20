#!/usr/bin/env python3
"""Assemble le catalogue versionné du jeu (public/dictee/catalogue.json, schéma 1.1) et la liste de relecture (CSV).

Entrées : la sélection de mots (selectionner_mots.py), les phrases et astuces (phrases.json), les relectures
(relectures.json, écrit par importer_validation.py depuis la page de relecture), les signalements audio
(audio-non-regression.json) et les empreintes des fichiers audio (audio-empreintes.json, generer_audio.py).

Pour chaque mot :
- `status` : `approved` seulement si un adulte a approuvé les quatre relectures (orthographe, pédagogie, contexte,
  audio) sur la forme, la phrase et l'astuce actuelles ; sinon `needs_review`. Rien d'autre n'approuve un mot.
- `audio.mode` : `audio_manual_review` tant qu'un signalement audio du mot n'a pas été écouté et jugé bon par un adulte
  sur la version actuelle du fichier ; sinon `context_required` pour un mot que le son seul ne suffit pas à
  écrire (homophone, ou mot de CONTEXTE_OBLIGATOIRE) ; `word_then_context` pour un homophone dont la ressemblance
  n'est pas entendue par tous ; `word_only` sinon.

    python3 scripts/dictee/assembler_catalogue.py [--csv relecture.csv]
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import unicodedata
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parents[1]
SELECTION = ICI / 'mots-selection.json'
PHRASES = ICI / 'phrases.json'
RELECTURES = ICI / 'relectures.json'
SIGNALEMENTS = ICI / 'audio-non-regression.json'
EMPREINTES = ICI / 'audio-empreintes.json'
CATALOGUE = RACINE / 'public/dictee/catalogue.json'
VERSION = 3
REVUES = ('orthography', 'pedagogy', 'context', 'audio')
# Mots que le son seul ne suffit pas à écrire, même sans homophone relevé par Lexique (revue du 2026-11-16) :
# un article ou une élision s'entend avec (« l'arme » pour larme, « d'âme » pour dame), un nom propre (« Marie »),
# une ponctuation (« point »), ou une prononciation qui dépend de l'emploi (« plus »). Ajouts de David : vert (verre,
# vers, ver), sept (cet, set), un (l'article), neuf (le nombre ou l'adjectif), et les couleurs qui sont aussi une fleur
# ou un fruit (rose, orange, marron) : la phrase dit le sens attendu.
CONTEXTE_OBLIGATOIRE = set('air dame larme lettre lit verre gens quel point plus mari vert sept un neuf rose orange marron'.split())
# Homophonies qui ne sont pas entendues par tous : la phrase suit le mot, sans être exigée.
NUANCES = {'pensée': {'penser': "homophonie non universelle : selon les accents, « pensée » et « penser » s'entendent pareil ou non"}}
# Relecture orthographique du 2026-11-19 (deux relecteurs indépendants, puis arbitrage) : homophones de forme de base que
# le filtre de Lexique avait manqués (fréquence, ou mot qui est aussi un participe : « marché »), et un faux (« com »).
# Les formes conjuguées ou fléchies (aimé, vois, pareille…) restent exclues, comme dans selectionner_mots.py.
HOMOPHONES_RELUS: dict[str, tuple[list[str], list[str]]] = {
    'air': (['aire'], []), 'cour': (['cours'], []), 'mur': (['mûr', 'mûre'], []), 'verre': (['ver'], []), 'vert': (['ver'], []),
    'fil': (['file'], []), 'pain': (['pin'], []), 'père': (['pair'], []), 'corps': (['cor'], []), 'marcher': (['marché'], []),
    'trop': (['trot'], []), 'compte': (['conte'], []), 'compter': (['conter'], []), 'plutôt': (['plus tôt'], []), 'signe': (['cygne'], []),
    'sol': (['sole'], []),  # revue Codex du 2026-11-20 : « sole » s'entend pareil
    'comme': ([], ['com']),
}


def homophones_relus(lemme: str, homos: list[str]) -> list[str]:
    ajouts, retraits = HOMOPHONES_RELUS.get(lemme, ([], []))
    return [h for h in homos if h not in retraits] + [h for h in ajouts if h not in homos]


def octets(asset: str) -> str | None:
    f = RACINE / 'public' / asset
    return hashlib.sha256(f.read_bytes()).hexdigest() if f.is_file() else None


def lire(chemin: Path, defaut):
    return json.loads(chemin.read_text(encoding='utf-8')) if chemin.exists() else defaut


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--csv', type=Path)
    a = p.parse_args()
    mots = lire(SELECTION, [])
    phrases = {r['lemma']: r for r in lire(PHRASES, [])}
    relus = lire(RELECTURES, {})
    empreintes = lire(EMPREINTES, {})
    signales: dict[str, list[dict]] = {}
    for cas in lire(SIGNALEMENTS, {'cases': []})['cases']:
        signales.setdefault(cas['id'], []).append(cas)
    words = []
    for m in mots:
        ph = phrases.get(m['lemma'], {})
        r = relus.get(m['lemma'])
        forme = r.get('expectedForm', m['expectedForm']) if r else m['expectedForm']
        phrase, expl = ph.get('contextSentence'), ph.get('explanation')
        mot_audio = f"dictee/audio/{m['id']}.ogg"
        phrase_audio = f"dictee/audio/{m['id']}-phrase.ogg" if phrase else None
        # Un signalement n'est levé que par une écoute humaine « ok » de la version actuelle du fichier.
        a_ecouter = [c for c in signales.get(m['id'], []) if c['listening']['status'] != 'ok'
                     or c['listening'].get('audioVersion') != empreintes.get(c['asset'])]
        # Validation en bloc sans écoute mot à mot (décision de l'adulte, notée) : les signalements restent « pending »
        # pour la traçabilité, mais ne bloquent plus le mot tant que ses fichiers audio sont ceux qu'il a approuvés.
        # Elle ne vaut que pour les textes qu'il a approuvés : un texte corrigé depuis fait revenir l'écoute en attente.
        textes_relus = r and r.get('expectedForm') == forme and r.get('contextSentence') == phrase and r.get('explanation') == expl
        if a_ecouter and textes_relus and r.get('audioNonEcoute') and r.get('wordVersion') == empreintes.get(f"dictee/audio/{m['id']}.ogg") \
                and r.get('contextVersion') == (empreintes.get(f"dictee/audio/{m['id']}-phrase.ogg") if phrase else None):
            a_ecouter = []
        homos = homophones_relus(m['lemma'], m['homophones'])
        tags = [t for t in m['tags'] if t != 'homophone'] + (['homophone'] if homos else [])
        nuances = NUANCES.get(m['lemma'], {})
        ambigu = m['lemma'] in CONTEXTE_OBLIGATOIRE or any(h not in nuances for h in homos)
        if a_ecouter:
            mode = 'audio_manual_review'
        elif ambigu:
            mode = 'context_required'
        elif homos and phrase:
            mode = 'word_then_context'
        else:
            mode = 'word_only'
        w = {
            'id': m['id'], 'lemma': m['lemma'], 'expectedForm': unicodedata.normalize('NFC', forme), 'grade': m['grade'],
            'tags': tags, 'homophones': homos, 'homophoneNotes': nuances, 'contextSentence': phrase, 'explanation': expl,
            'pronunciationAsset': mot_audio, 'contextAsset': phrase_audio,
            # Empreinte des OCTETS livrés (revue Codex du 2026-11-20) : le jeu ne garde en cache que ces octets-là.
            'audio': {'mode': mode, 'wordVersion': empreintes.get(mot_audio), 'contextVersion': empreintes.get(phrase_audio) if phrase_audio else None,
                      'wordSha256': octets(mot_audio), 'contextSha256': octets(phrase_audio) if phrase_audio else None,
                      'voice': 'fr_FR-siwis-medium', 'engine': 'piper-tts 1.8.0', 'locale': 'fr-FR'},
            'difficulty': m['difficulty'], 'status': 'needs_review', 'review': {k: 'pending' for k in REVUES}, 'validatedBy': None, 'version': VERSION,
            'provenance': {'list': m['source']['list'], 'listRank': m['source']['rank'], 'listFrequency': m['source']['frequency'],
                           'text': ph.get('generatedBy'), **({'alsoIn': m['source']['alsoIn']} if 'alsoIn' in m['source'] else {}),
                           **({'note': m['note']} if 'note' in m else {}), **({'correction': ph['correction']} if 'correction' in ph else {})},
        }
        # Une relecture ne vaut que pour les textes et l'audio que l'adulte a eus sous les yeux et dans l'oreille.
        if r and all(r.get(k) == w[k] for k in ('expectedForm', 'contextSentence', 'explanation')):
            revue = dict(r.get('review', {}))
            if revue.get('audio') == 'approved' and (r.get('wordVersion') != w['audio']['wordVersion'] or r.get('contextVersion') != w['audio']['contextVersion']):
                revue['audio'] = 'pending'
            if a_ecouter:
                revue['audio'] = 'pending'
            w['review'] = {k: revue.get(k, 'pending') for k in REVUES}
            if all(v == 'approved' for v in w['review'].values()):
                w['status'], w['validatedBy'] = 'approved', r['by']
                if r.get('note'):
                    w['provenance']['validation'] = r['note']
            elif 'rejected' in w['review'].values():
                w['status'] = 'rejected'
        words.append(w)
    CATALOGUE.parent.mkdir(parents=True, exist_ok=True)
    CATALOGUE.write_text(json.dumps({'schemaVersion': '1.1', 'version': VERSION, 'locale': 'fr-FR', 'words': words}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    compte = {s: sum(w['status'] == s for w in words) for s in ('needs_review', 'approved', 'rejected')}
    modes = {s: sum(w['audio']['mode'] == s for w in words) for s in ('word_only', 'word_then_context', 'context_required', 'audio_manual_review')}
    print(f'{len(words)} mots ; statuts {compte} ; audio {modes} ; {sum(not w["contextSentence"] for w in words)} sans phrase')
    if a.csv:
        with a.csv.open('w', encoding='utf-8', newline='') as f:
            out = csv.writer(f)
            out.writerow(['niveau', 'identifiant', 'mot', 'phrase de contexte', 'explication', 'homophones', 'étiquettes', 'difficulté', 'source', 'rang dans la liste', 'statut', 'mode audio'])
            for w in words:
                out.writerow([w['grade'], w['id'], w['expectedForm'], w['contextSentence'] or '', w['explanation'] or '', ' '.join(w['homophones']), ' '.join(w['tags']),
                              w['difficulty'], w['provenance']['list'] + ' ; phrase et explication : brouillon à relire' + (' ; ' + w['provenance']['note'] if 'note' in w['provenance'] else ''), w['provenance']['listRank'] or '',
                              w['status'], w['audio']['mode']])


if __name__ == '__main__':
    main()
