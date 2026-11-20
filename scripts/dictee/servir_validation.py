#!/usr/bin/env python3
"""Sert la page de relecture de la dictée sur le réseau local, le temps de la relecture.

Sert, en lecture seule : la page (scripts/dictee/validation/index.html), le catalogue et l'audio
(public/dictee/), et un rapport facultatif de verifier_audio.py. Une seule écriture : POST /decisions
enregistre les décisions de la page dans --sortie (JSON vérifié, 1 Mo au plus, écriture atomique, une copie
horodatée par envoi). Rien d'autre n'est servi : pas de liste de dossier, pas d'autre chemin.

Pas d'authentification : à écouter SEULEMENT sur une adresse privée (tailnet ou réseau local), jamais sur
une adresse publique. Exemple, sur l'adresse tailnet de la machine :
    python3 scripts/dictee/servir_validation.py --ecoute 100.64.0.1:8978 --sortie ~/relecture-dictee \
        [--verification rapport.json]
Puis : python3 scripts/dictee/importer_validation.py ~/relecture-dictee/dictee-relecture.json
"""
from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import os
import re
import socket
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ICI = Path(__file__).resolve().parent
RACINE = ICI.parents[1]
PAGE = ICI / 'validation/index.html'
PUBLIC = RACINE / 'public'
AUDIO = re.compile(r'^/dictee/audio/[a-z0-9-]+\.ogg$')
MAX = 1 << 20
VERROU = threading.Lock()


def vu(w: dict) -> dict:
    """Ce que la page montre d'une fiche (son champ « seen ») : textes, versions et empreintes."""
    a = w.get('audio') or {}
    return {'expectedForm': w['expectedForm'], 'contextSentence': w.get('contextSentence'), 'explanation': w.get('explanation'),
            'wordVersion': a.get('wordVersion'), 'contextVersion': a.get('contextVersion'), 'wordSha256': a.get('wordSha256'), 'contextSha256': a.get('contextSha256')}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--ecoute', required=True, help='adresse:port privée')
    p.add_argument('--sortie', type=Path, required=True)
    p.add_argument('--verification', type=Path)
    a = p.parse_args()
    hote, port = a.ecoute.rsplit(':', 1)
    ip = ipaddress.ip_address(hote.strip('[]'))
    # Onzième revue Codex : 0.0.0.0 (toutes les interfaces, publiques comprises) est classée « privée » par ipaddress ;
    # seule une adresse précise d'un réseau local, du tailnet ou de la boucle locale est acceptée.
    prive = any(ip in ipaddress.ip_network(r) for r in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '100.64.0.0/10', '127.0.0.0/8', 'fd00::/8', '::1/128'))
    if ip.is_unspecified or ip.is_multicast or not prive:
        raise SystemExit(f'{hote} n\'est pas une adresse privée précise : refus')
    a.sortie.mkdir(parents=True, exist_ok=True)

    def ecrire(cible: Path, corps: bytes) -> None:
        with tempfile.NamedTemporaryFile(dir=a.sortie, delete=False) as f:
            f.write(corps)
        os.replace(f.name, cible)

    class H(BaseHTTPRequestHandler):
        def envoyer(self, code: int, corps: bytes, type_: str) -> None:
            self.send_response(code)
            self.send_header('Content-Type', type_)
            self.send_header('Content-Length', str(len(corps)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(corps)

        def do_GET(self) -> None:  # noqa: N802
            chemin = self.path.split('?', 1)[0]
            if chemin in ('/', '/index.html'):
                return self.envoyer(200, PAGE.read_bytes(), 'text/html; charset=utf-8')
            if chemin == '/dictee/catalogue.json':
                return self.envoyer(200, (PUBLIC / 'dictee/catalogue.json').read_bytes(), 'application/json')
            if chemin == '/verification.json' and a.verification and a.verification.exists():
                return self.envoyer(200, a.verification.read_bytes(), 'application/json')
            if chemin == '/audio-non-regression.json':
                return self.envoyer(200, (ICI / 'audio-non-regression.json').read_bytes(), 'application/json')
            if chemin == '/decisions' and (a.sortie / 'dictee-relecture.json').exists():
                return self.envoyer(200, (a.sortie / 'dictee-relecture.json').read_bytes(), 'application/json')
            if AUDIO.match(chemin) and (PUBLIC / chemin[1:]).is_file():
                # Huitième revue Codex : seuls les octets que la page a nommés (?sha=, ceux du catalogue qu'elle a chargé)
                # sont servis ; un fichier remplacé depuis répond 409, l'adulte recharge avant de décider.
                octets = (PUBLIC / chemin[1:]).read_bytes()
                voulu = parse_qs(urlsplit(self.path).query).get('sha', [''])[0]
                if voulu != hashlib.sha256(octets).hexdigest():
                    return self.envoyer(409, b'enregistrement change : recharger la page', 'text/plain; charset=utf-8')
                return self.envoyer(200, octets, 'audio/ogg')
            self.envoyer(404, b'introuvable', 'text/plain; charset=utf-8')

        def do_POST(self) -> None:  # noqa: N802
            n = int(self.headers.get('Content-Length') or 0)
            if self.path != '/decisions' or not 0 < n <= MAX:
                return self.envoyer(400, b'refus', 'text/plain; charset=utf-8')
            try:
                lot = json.loads(self.rfile.read(n))
                assert lot.get('format') == 'dictee-relecture' and isinstance(lot.get('decisions'), dict)
            except (ValueError, AssertionError):
                return self.envoyer(400, b'format inattendu', 'text/plain; charset=utf-8')
            # Neuvième et onzième revues Codex : chaque choix reçu est gardé. Un téléphone n'envoie que les choix changés
            # depuis son dernier envoi ; le serveur les applique mot par mot dans l'ordre d'arrivée (le dernier reçu gagne,
            # un choix défait compris ; aucune horloge de téléphone n'est crue), et garde chaque envoi sous un nom unique.
            with VERROU:
                garde = a.sortie / 'dictee-relecture.json'
                avant = json.loads(garde.read_text(encoding='utf-8')) if garde.exists() else {'format': 'dictee-relecture', 'version': 1, 'decisions': {}}
                fusion = dict(avant.get('decisions') or {})
                recus = set(avant.get('recus') or [])
                # Seizième revue Codex : une décision (ou une annulation) prise sur une autre version de la fiche que celle
                # du catalogue servi n'écrase jamais rien ; chaque décision reçue est notée par son identifiant (rev), pour
                # qu'un téléphone dont l'accusé s'est perdu ne la renvoie pas.
                mots = {w['id']: w for w in json.loads((PUBLIC / 'dictee/catalogue.json').read_text(encoding='utf-8'))['words']}
                perimes = []
                for ident, d in lot['decisions'].items():
                    if not isinstance(d, dict):
                        continue
                    # Dix-septième revue : un état déjà reçu (renvoyé après un accusé perdu) n'est jamais réappliqué.
                    if isinstance(d.get('rev'), str):
                        if d['rev'] in recus:
                            continue
                        recus.add(d['rev'])
                    if ident not in mots or d.get('seen') != vu(mots[ident]):
                        perimes.append(ident)
                        continue
                    fusion[ident] = d
                tout = {**lot, 'decisions': dict(sorted(fusion.items())), 'recus': sorted(recus)}
                ecrire(garde, json.dumps(tout, ensure_ascii=False, indent=1).encode())
                ecrire(a.sortie / f'dictee-relecture-envoi-{time.time_ns()}.json', json.dumps(lot, ensure_ascii=False, indent=1).encode())
            self.envoyer(200, json.dumps({'enregistre': len(lot['decisions']) - len(perimes), 'perimes': sorted(perimes)}).encode(), 'application/json')

        def log_message(self, fmt: str, *args: object) -> None:
            print(f'{self.address_string()} {fmt % args}', flush=True)

    print(f'page de relecture sur http://{hote}:{port}/ ; décisions dans {a.sortie}', flush=True)
    class Serveur(ThreadingHTTPServer):
        # Douzième revue Codex : une adresse IPv6 admise (fd00::/8, ::1) s'écoute vraiment, en IPv6.
        address_family = socket.AF_INET6 if ip.version == 6 else socket.AF_INET

    Serveur((hote.strip('[]'), int(port)), H).serve_forever()


if __name__ == '__main__':
    main()
