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
import tempfile
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


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--ecoute', required=True, help='adresse:port privée')
    p.add_argument('--sortie', type=Path, required=True)
    p.add_argument('--verification', type=Path)
    a = p.parse_args()
    hote, port = a.ecoute.rsplit(':', 1)
    if not ipaddress.ip_address(hote).is_private and not ipaddress.ip_address(hote) in ipaddress.ip_network('100.64.0.0/10'):
        raise SystemExit(f'{hote} n\'est pas une adresse privée : refus')
    a.sortie.mkdir(parents=True, exist_ok=True)

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
            corps = json.dumps(lot, ensure_ascii=False, indent=1).encode()
            for cible in (a.sortie / 'dictee-relecture.json', a.sortie / f'dictee-relecture-{time.strftime("%Y%m%d-%H%M")}.json'):
                with tempfile.NamedTemporaryFile(dir=a.sortie, delete=False) as f:
                    f.write(corps)
                os.replace(f.name, cible)
            self.envoyer(200, json.dumps({'enregistre': len(lot['decisions'])}).encode(), 'application/json')

        def log_message(self, fmt: str, *args: object) -> None:
            print(f'{self.address_string()} {fmt % args}', flush=True)

    print(f'page de relecture sur http://{hote}:{port}/ ; décisions dans {a.sortie}', flush=True)
    ThreadingHTTPServer((hote, int(port)), H).serve_forever()


if __name__ == '__main__':
    main()
