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
import fcntl
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
# Octets écrits par CE script (sha256 de chaque fichier) : l'assembleur refuse tout autre fichier sous le même nom
# (quatrième revue Codex, 2026-11-20), l'approbation d'un enregistrement ne passe donc jamais à d'autres octets.
OCTETS = RACINE / 'scripts/dictee/audio-octets.json'
# Quinzième revue Codex : la génération et l'assemblage ne tournent jamais ensemble ; chacun prend ce verrou pour toute
# sa durée, et s'arrête si l'autre le tient.
VERROU = RACINE / 'scripts/dictee/.audio.verrou'


def prendre_verrou(qui: str):  # noqa: ANN201 — le fichier ouvert tient le verrou jusqu'à la fin du processus
    f = VERROU.open('w')
    try:
        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        f.close()
        raise SystemExit(f"{qui} : l'autre script audio tourne (verrou {VERROU.name}), relancer après lui") from None
    return f


MODELE_SHA256 = 'b1d946fd68d0347155fa59bce0a018924abbef3c1561181db45ca463d83963ef'
# Le mot est dit dans une courte phrase porteuse : la voix prononce mal un mot isolé (mesure du 2026-11-16 avec
# verifier_audio.py : 2 à 5 mots sur 20 reconnus seuls, 12 sur 20 dans « Écris le mot … »). Les deux-points posent
# une pause avant le mot, qui ne se colle plus à « mot » (« le mot vent » entendu « le mauvais ») : sur les 24 mots
# encore mal reconnus, 14 avec « Écris le mot X. », 19 avec « Écris le mot : X. » (même jour, même voix).
PORTEUSE = 'Écris le mot : {}.'
# Graphie donnée à la voix quand elle prononce mal le mot écrit (le mot affiché et attendu ne change pas).
PRONONCIATION = {'dos': 'do', 'fils': 'fisse'}
REGLAGES = {'mot': {'length_scale': 1.15}, 'phrase': {'length_scale': 1.05}}
OPUS = ['-c:a', 'libopus', '-b:a', '24k', '-ac', '1', '-ar', '24000', '-map_metadata', '-1', '-fflags', '+bitexact']


def empreinte(texte: str, sorte: str) -> str:
    return hashlib.sha256(json.dumps([texte, MODELE_SHA256, REGLAGES[sorte], OPUS, PORTEUSE], ensure_ascii=False).encode()).hexdigest()[:16]


def version(cle: str, sha: str) -> str:
    """Version d'un fichier qu'on vient de produire : sa recette ET ses octets (`clé.octets`). Piper ne rend jamais deux
    fois les mêmes octets ; une recette refaite, ou reprise après une autre (A, B, puis A), donne donc une AUTRE version,
    et aucune approbation ni écoute d'un ancien fichier ne passe à ces octets (5e et 6e revues Codex). Les fichiers
    produits avant le 2026-11-20 gardent leur clé seule, liée à leurs octets par audio-octets.json."""
    return f'{cle}.{sha[:8]}'


def a_regenerer(forme: str, phrase: str | None, mid: str, empreintes: dict[str, str]) -> list[str]:
    """Les fichiers d'un mot dont la recette ne correspond plus au texte actuel (un texte corrigé sans régénérer) : leur
    enregistrement dit autre chose que ce que l'adulte lit ; l'assemblage les bloque, l'approbation ciblée les refuse."""
    attendus = {f'dictee/audio/{mid}.ogg': empreinte(PORTEUSE.format(PRONONCIATION.get(forme, forme)), 'mot')}
    if phrase:
        attendus[f'dictee/audio/{mid}-phrase.ogg'] = empreinte(phrase, 'phrase')
    return sorted(a for a, cle in attendus.items() if empreintes.get(a, '').split('.')[0] != cle)


def fait(chemin: str, cle: str, connues: dict[str, str], ecrits: dict[str, str], cible: Path) -> bool:
    """Le fichier est à jour : même recette, et ses octets sont ceux que ce script a écrits."""
    return cible.exists() and connues.get(chemin, '').split('.')[0] == cle and ecrits.get(chemin) == hashlib.sha256(cible.read_bytes()).hexdigest()


def main() -> None:
    from piper import PiperVoice, SynthesisConfig  # noqa: PLC0415 — installé seulement là où l'on génère

    p = argparse.ArgumentParser()
    p.add_argument('--modele', type=Path, required=True)
    p.add_argument('--catalogue', type=Path, default=CATALOGUE)
    a = p.parse_args()
    verrou = prendre_verrou('generer_audio.py')  # noqa: F841 — tenu jusqu'à la fin
    vu = hashlib.sha256(a.modele.read_bytes()).hexdigest()
    if vu != MODELE_SHA256:
        raise SystemExit(f'modèle inattendu : {vu}')
    voix = PiperVoice.load(str(a.modele))
    mots = json.loads(a.catalogue.read_text(encoding='utf-8'))['words']
    connues = json.loads(EMPREINTES.read_text(encoding='utf-8')) if EMPREINTES.exists() else {}
    octets = json.loads(OCTETS.read_text(encoding='utf-8')) if OCTETS.exists() else {}
    faits = 0
    taches = [(w['pronunciationAsset'], PORTEUSE.format(PRONONCIATION.get(w['expectedForm'], w['expectedForm'])), 'mot') for w in mots]
    taches += [(w['contextAsset'], w['contextSentence'], 'phrase') for w in mots if w['contextAsset'] and w['contextSentence']]
    with tempfile.TemporaryDirectory() as tmp:
        for chemin, texte, sorte in taches:
            cible, cle = SORTIE / chemin, empreinte(texte, sorte)
            if fait(chemin, cle, connues, octets, cible):
                continue
            cible.parent.mkdir(parents=True, exist_ok=True)
            wav = Path(tmp) / 'a.wav'
            with wave.open(str(wav), 'wb') as f:
                voix.synthesize_wav(texte, f, syn_config=SynthesisConfig(**REGLAGES[sorte]))
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), *OPUS, str(cible)], check=True)
            octets[chemin] = hashlib.sha256(cible.read_bytes()).hexdigest()
            connues[chemin] = version(cle, octets[chemin])
            faits += 1
            if faits % 50 == 0:
                EMPREINTES.write_text(json.dumps(dict(sorted(connues.items())), indent=0) + '\n', encoding='utf-8')
                OCTETS.write_text(json.dumps(dict(sorted(octets.items())), indent=0) + '\n', encoding='utf-8')  # reprise sûre
                print(f'{faits} fichiers', flush=True)
    # Les fichiers qui ne correspondent plus à aucun mot sont retirés.
    attendus = {c for c, _, _ in taches}
    for f in (SORTIE / 'dictee/audio').glob('*.ogg'):
        if f'dictee/audio/{f.name}' not in attendus:
            f.unlink()
            connues.pop(f'dictee/audio/{f.name}', None)
            octets.pop(f'dictee/audio/{f.name}', None)
    EMPREINTES.write_text(json.dumps(dict(sorted((k, v) for k, v in connues.items() if k in attendus)), indent=0) + '\n', encoding='utf-8')
    OCTETS.write_text(json.dumps(dict(sorted((k, v) for k, v in octets.items() if k in attendus)), indent=0) + '\n', encoding='utf-8')
    print(f'{faits} fichiers générés, {len(taches)} attendus')


if __name__ == '__main__':
    main()
