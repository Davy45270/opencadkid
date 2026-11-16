#!/usr/bin/env python3
"""Reporte dans le dépôt les décisions exportées par la page de relecture (scripts/dictee/validation/).

Pour chaque mot :
- « valider » : les quatre relectures (orthographe, pédagogie, contexte, audio) sont approuvées dans
  `relectures.json`, pour la forme, la phrase, l'astuce et les versions audio que l'adulte a vues et entendues ; les
  signalements audio du mot (`audio-non-regression.json`) passent à « ok », écoutés par lui, pour cette version ;
- « corriger » : la phrase et l'explication corrigées remplacent celles de `phrases.json` ; orthographe, pédagogie et
  contexte sont approuvés ; l'audio ne l'est que si ni le mot ni la phrase n'ont changé (sinon il sera régénéré, puis
  réécouté) ;
- « audio_faux » : les signalements du mot passent à « failed » pour la version entendue : à régénérer, puis réécouter ;
- « retirer » : le mot entre dans `mots-retires.json` ; selectionner_mots.py prend le suivant de la liste.

Puis : selectionner_mots.py (seulement s'il y a des retraits), assembler_catalogue.py, generer_audio.py (phrases
corrigées et nouveaux mots), verifier_audio.py. Un mot n'est montré à un enfant qu'une fois `reviewed`.

    python3 scripts/dictee/importer_validation.py dictee-relecture-….json
"""
from __future__ import annotations

import argparse
import json
import unicodedata
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parents[1]
PHRASES = ICI / 'phrases.json'
RELECTURES = ICI / 'relectures.json'
RETIRES = ICI / 'mots-retires.json'
SIGNALEMENTS = ICI / 'audio-non-regression.json'
CATALOGUE = RACINE / 'public/dictee/catalogue.json'


def nfc(t: str | None) -> str | None:
    t = unicodedata.normalize('NFC', (t or '').strip())
    return t or None


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('fichier', type=Path)
    a = p.parse_args()
    lot = json.loads(a.fichier.read_text(encoding='utf-8'))
    if lot.get('format') != 'dictee-relecture' or lot.get('version') != 1:
        raise SystemExit('ce fichier ne vient pas de la page de relecture')
    qui = lot.get('reviewer') or 'David'
    mots = {w['id']: w for w in json.loads(CATALOGUE.read_text(encoding='utf-8'))['words']}
    phrases = json.loads(PHRASES.read_text(encoding='utf-8'))
    par_lemme = {r['lemma']: r for r in phrases}
    relus = json.loads(RELECTURES.read_text(encoding='utf-8')) if RELECTURES.exists() else {}
    retires = set(json.loads(RETIRES.read_text(encoding='utf-8'))) if RETIRES.exists() else set()
    signalements = json.loads(SIGNALEMENTS.read_text(encoding='utf-8')) if SIGNALEMENTS.exists() else {'cases': []}

    def ecoute(ident: str, statut: str, quand: str) -> None:
        for cas in signalements['cases']:
            if cas['id'] == ident:
                version = mots[ident]['audio']['wordVersion'] if cas['kind'] == 'mot' else mots[ident]['audio']['contextVersion']
                cas['listening'] = {'status': statut, 'by': qui, 'date': quand[:10], 'audioVersion': version, 'note': None}

    compte = {'valider': 0, 'corriger': 0, 'retirer': 0, 'audio_faux': 0, 'inconnu': 0}
    for ident, d in sorted(lot['decisions'].items()):
        w = mots.get(ident)
        if not w or w['lemma'] != d.get('lemma'):
            compte['inconnu'] += 1
            print(f'ignoré : {ident} ne correspond plus au catalogue')
            continue
        action = d['action']
        if action == 'retirer':
            retires.add(w['lemma'])
            relus.pop(w['lemma'], None)
        elif action == 'audio_faux':
            ecoute(ident, 'failed', d.get('at', ''))
        elif action in ('valider', 'corriger'):
            forme, phrase, expl = w['expectedForm'], w['contextSentence'], w['explanation']
            if action == 'corriger':
                forme = nfc(d.get('expectedForm')) or forme
                phrase, expl = nfc(d.get('contextSentence')), nfc(d.get('explanation'))
                ph = par_lemme.setdefault(w['lemma'], {'id': ident, 'lemma': w['lemma']})
                if ph not in phrases:
                    phrases.append(ph)
                ph.update({'contextSentence': phrase, 'explanation': expl, 'generatedBy': {'by': f'{qui}, corrected at review', 'date': d.get('at', '')[:10]}})
            audio_inchange = forme == w['expectedForm'] and phrase == w['contextSentence']
            revue = {'orthography': 'approved', 'pedagogy': 'approved', 'context': 'approved', 'audio': 'approved' if audio_inchange else 'pending'}
            relus[w['lemma']] = {'by': qui, 'at': d.get('at', ''), 'expectedForm': forme, 'contextSentence': phrase, 'explanation': expl,
                                 'review': revue, 'wordVersion': w['audio']['wordVersion'], 'contextVersion': w['audio']['contextVersion']}
            if action == 'valider':
                ecoute(ident, 'ok', d.get('at', ''))
        else:
            compte['inconnu'] += 1
            continue
        compte[action] += 1
    PHRASES.write_text(json.dumps(phrases, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    RELECTURES.write_text(json.dumps(dict(sorted(relus.items())), ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    RETIRES.write_text(json.dumps(sorted(retires), ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    SIGNALEMENTS.write_text(json.dumps(signalements, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"{compte['valider']} validés, {compte['corriger']} corrigés, {compte['retirer']} retirés, {compte['audio_faux']} audio faux, {compte['inconnu']} ignorés")
    if compte['retirer']:
        print('des mots sont retirés : relancer selectionner_mots.py avant assembler_catalogue.py')


if __name__ == '__main__':
    main()
