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

Validation en bloc, quand l'adulte approuve tout le catalogue sans passer mot par mot sur la page :

    python3 scripts/dictee/importer_validation.py --approuver-tout --par David --note "…"

Approbation de mots désignés, après une correction (le texte affiché est celui qui sera approuvé ; sans --oui,
rien n'est écrit) :

    python3 scripts/dictee/importer_validation.py --approuver en-attente --par David --note "…"        # lire
    python3 scripts/dictee/importer_validation.py --approuver en-attente --par David --note "…" --oui  # approuver

La validation en bloc approuve les quatre relectures de chaque mot du catalogue actuel, pour ses textes et ses versions audio, avec la
note et `audioNonEcoute: true` : l'écoute n'a pas été faite mot à mot. Les signalements audio gardent leur statut
d'écoute (`pending`) pour la traçabilité, mais ne bloquent plus ces mots. Un fichier audio régénéré, ou un texte
changé, fait redescendre le mot en relecture.
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
EMPREINTES = ICI / 'audio-empreintes.json'
CATALOGUE = RACINE / 'public/dictee/catalogue.json'


def nfc(t: str | None) -> str | None:
    t = unicodedata.normalize('NFC', (t or '').strip())
    return t or None


def approuver_tout(qui: str, note: str) -> None:
    from datetime import date  # noqa: PLC0415
    relus = json.loads(RELECTURES.read_text(encoding='utf-8')) if RELECTURES.exists() else {}
    jour = date.today().isoformat()
    mots = json.loads(CATALOGUE.read_text(encoding='utf-8'))['words']
    for w in mots:
        relus[w['lemma']] = {'by': qui, 'at': jour, 'expectedForm': w['expectedForm'], 'contextSentence': w['contextSentence'], 'explanation': w['explanation'],
                             'review': {k: 'approved' for k in ('orthography', 'pedagogy', 'context', 'audio')},
                             'wordVersion': w['audio']['wordVersion'], 'contextVersion': w['audio']['contextVersion'], 'audioNonEcoute': True, 'note': note}
    RELECTURES.write_text(json.dumps(dict(sorted(relus.items())), ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(mots)} mots approuvés par {qui} ({note}) ; relancer assembler_catalogue.py')


def approuver(ids: list[str], qui: str, note: str, ecrire: bool) -> None:
    """Approuve des mots désignés (ou « en-attente » : tous ceux qui ne sont pas approuvés), pour leurs textes et leurs
    versions audio ACTUELS, affichés avant. Sans --oui, rien n'est écrit : on lit d'abord ce qu'on approuve."""
    from datetime import date  # noqa: PLC0415
    if 'en-attente' in ids and ids != ['en-attente']:
        raise SystemExit('« en-attente » se donne seul, sans identifiant')
    mots = json.loads(CATALOGUE.read_text(encoding='utf-8'))['words']
    choisis = [w for w in mots if w['status'] != 'approved'] if ids == ['en-attente'] else [w for w in mots if w['id'] in ids]
    inconnus = sorted(set(ids) - {w['id'] for w in mots} - {'en-attente'})
    if inconnus:
        raise SystemExit(f'identifiants inconnus : {", ".join(inconnus)}')
    # Revue Codex du 2026-11-20 : un enregistrement signalé attend une oreille d'adulte (page de relecture, « Audio faux »
    # ou écoute validée) ; une approbation de texte ne le lève pas. « en-attente » les laisse de côté, un id désigné refuse.
    # Revue Codex (2e passe) : l'approbation ciblée n'écrit jamais `audioNonEcoute` — un signalement ajouté depuis le dernier
    # assemblage reste bloquant ; seule la validation en bloc, décidée et notée par l'adulte, porte cette exemption.
    # Revue Codex (3e passe) : les signalements se lisent dans leur fichier, pas dans le dernier catalogue assemblé — un cas
    # ajouté depuis refuse l'id désigné comme les autres. Même règle que l'assembleur : seule une écoute « ok » de la
    # version actuelle du fichier lève un cas.
    empreintes = json.loads(EMPREINTES.read_text(encoding='utf-8')) if EMPREINTES.exists() else {}
    cas = json.loads(SIGNALEMENTS.read_text(encoding='utf-8'))['cases'] if SIGNALEMENTS.exists() else []
    signales = {c['id'] for c in cas if c['listening']['status'] != 'ok' or c['listening'].get('audioVersion') != empreintes.get(c['asset'])}
    # Sixième revue : un texte corrigé sans régénérer l'enregistrement n'est jamais approuvé avec l'ancien.
    from generer_audio import a_regenerer  # noqa: PLC0415
    perimes = {w['id'] for w in choisis if a_regenerer(w['expectedForm'], w['contextSentence'], w['id'], empreintes)}
    a_ecouter = [w['id'] for w in choisis if w['audio']['mode'] == 'audio_manual_review' or w['id'] in signales or w['id'] in perimes]
    if a_ecouter and ids != ['en-attente']:
        raise SystemExit(f"enregistrement en attente d'écoute, à entendre sur la page de relecture : {', '.join(a_ecouter)}")
    choisis = [w for w in choisis if w['id'] not in a_ecouter]
    if 'écoute audio non faite' not in note:
        note += ' ; écoute audio non faite mot à mot'
    for w in choisis:
        print(f"{w['grade']:4} {w['id']} — « {w['expectedForm']} »\n     phrase : {w['contextSentence']}\n     astuce : {w['explanation']}"
              f"\n     homophones : {', '.join(w['homophones']) or '-'} ; audio mot {w['audio']['wordVersion']}, phrase {w['audio']['contextVersion']}")
    if not ecrire:
        print(f'{len(choisis)} mots affichés, RIEN écrit : relancer avec --oui pour les approuver tels quels')
        return
    relus = json.loads(RELECTURES.read_text(encoding='utf-8')) if RELECTURES.exists() else {}
    jour = date.today().isoformat()
    for w in choisis:
        relus[w['lemma']] = {'by': qui, 'at': jour, 'expectedForm': w['expectedForm'], 'contextSentence': w['contextSentence'], 'explanation': w['explanation'],
                             'review': {k: 'approved' for k in ('orthography', 'pedagogy', 'context', 'audio')},
                             'wordVersion': w['audio']['wordVersion'], 'contextVersion': w['audio']['contextVersion'], 'audioNonEcoute': False, 'note': note}
    RELECTURES.write_text(json.dumps(dict(sorted(relus.items())), ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(choisis)} mots approuvés par {qui} ({note}) ; relancer assembler_catalogue.py')


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('fichier', type=Path, nargs='?')
    p.add_argument('--approuver-tout', action='store_true')
    p.add_argument('--par')
    p.add_argument('--note')
    p.add_argument('--approuver', nargs='+', metavar='ID', help='identifiants (fr-ami …) ou « en-attente »')
    p.add_argument('--oui', action='store_true', help='avec --approuver : écrire (sinon affichage seul)')
    a = p.parse_args()
    if a.approuver:
        if not a.par or not a.note:
            raise SystemExit('--approuver demande --par (qui valide) et --note (comment)')
        approuver(a.approuver, a.par, a.note, a.oui)
        return
    if a.approuver_tout:
        if not a.par or not a.note:
            raise SystemExit('--approuver-tout demande --par (qui valide) et --note (comment)')
        approuver_tout(a.par, a.note)
        return
    if not a.fichier:
        raise SystemExit('fichier de décisions attendu, ou --approuver-tout')
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
        # Septième revue Codex : une décision ne vaut que pour le texte et les enregistrements que l'adulte a eus sous
        # les yeux et dans l'oreille ; changés depuis (ou décision exportée sans eux), elle est ignorée, à refaire.
        a = w['audio']
        actuel = {'expectedForm': w['expectedForm'], 'contextSentence': w['contextSentence'], 'explanation': w['explanation'],
                  'wordVersion': a.get('wordVersion'), 'contextVersion': a.get('contextVersion'), 'wordSha256': a.get('wordSha256'), 'contextSha256': a.get('contextSha256')}
        if d.get('seen') != actuel:  # « Retirer » aussi (huitième revue) : retirer une autre fiche que celle vue, jamais
            compte['inconnu'] += 1
            print(f'ignoré : {ident} a changé depuis la décision (texte ou enregistrement), à relire')
            continue
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
