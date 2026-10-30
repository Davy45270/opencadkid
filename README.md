## [▶ Jouer / Play](https://davy45270.github.io/opencadkid/)

# Opencadkid

Play online, without installation, offline once opened.

[Français](README.fr.md) · [Play online](https://davy45270.github.io/opencadkid/)

Gentle educational games for children aged **4–8**, designed for fingers and phones. Boubou the panda, CaliRoux the red panda, Pestouille the dragon, Tutu the monkey and Lumi the unicorn guide each discovery. All artwork is generated in SVG from code.

**Available:** Boubou's baskets — count, fill and compare across eight levels — and **Lumi's cards**, a gentle memory game with 2, 3, 4, 6, 8 and 10 pairs, plus a picture-to-shadow level. Lumi offers a two-second preview on the first three levels and a glowing hint after repeated misses. Sixteen procedural shapes remain distinguishable without colour; the largest board fits a 390×844 phone without scrolling. French comes first; English is included. English is selected automatically only when the device language starts with `en`. Adults can change and save the language.

Planned: CaliRoux's shapes, Tutu's sounds, Pestouille's puzzle, Pestouille's path, Lumi's patterns, CaliRoux's sorting, Tutu's drums and Boubou's workshop. These eight games are described in [GAME_SPEC.md](GAME_SPEC.md); they are not playable yet. Learning to tell time is available in the sister application TicTac, through an adult-gated home card.

No reading is required to play: spoken instructions accompany pictograms, objects and dot constellations. The first touch enables browser audio. Voice availability depends on the device's speech service; install a local French or English voice for spoken play offline. The ear button repeats an instruction. A silent device still shows the visual prompts.

There are no timers, lives, punitive failures, ads, purchases, accounts or analytics. Mistakes invite another try; two mistakes trigger a counting hint. Finishing always earns stars and unlocks the next level. Each game keeps its own best stars and unlocks; older counting saves remain valid. Progress and preferences stay in local browser storage. The app makes no external runtime requests. An adult's written challenge protects settings and the external TicTac link. This is a light parental gate, not an identity or security check.

## Install and play offline

Open the online game once while connected. Use your browser's **Install app** or **Add to Home Screen** option. After the service worker has installed, the entire game reloads offline. Sounds are synthesized locally. Use the gear to change voice/sounds/language or erase progress, with a separate confirmation. Nothing is sent off the phone by this app.

## Screenshots

Screenshots are produced by the optional mobile capture suite; they are not generated during source authoring. Run `CAPTURES=1 npm run test:e2e -- --project=mobile tests/e2e/captures.spec.ts` on a machine authorized to run browsers after building.

![French home](docs/captures/accueil-fr.png)
![English home](docs/captures/accueil-en.png)
![Count objects](docs/captures/compter-combien.png)
![Fill a basket](docs/captures/compter-remplir.png)
![Completed series](docs/captures/compter-etoiles.png)
![Lumi’s cards](docs/captures/paires-plateau.png)
![Memory completion](docs/captures/paires-fin.png)

## Develop

Use the Node version in `.nvmrc`.

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Preview serves the built `dist` directory. The E2E configuration starts preview automatically, with one worker and desktop and touch-phone Chromium projects. `CAPTURES=1` enables screenshots. Regenerate the three committed PWA icons with `node scripts/make-icons.js` (Node only, no image dependencies).

Pure engines live in `src/engines/`; they receive seeds and never access the DOM, time or ambient randomness. The UI draws SVG and forwards gestures. `window.__kid.state()` returns a detached snapshot containing the screen, current question, memory board (motifs, visible/found cards, moves, mismatch and card rectangles) and target rectangles; this read-only observation hook cannot change progress. Vitest covers 300 seeds per level and per layout quantity; E2E covers complete games, noisy fingers, parental controls, language and offline reloads. Tests are authored but intentionally not executed during this delivery; lint, typecheck and build are the local validation steps.

The public game registry contains playable games only. Follow [GAME_SPEC.md](GAME_SPEC.md) when adding a game. GitHub Actions checks the app, then deploys a successful main-branch CI build to Pages. All action versions are pinned.

MIT © 2026 David Sevin. See [LICENSE](LICENSE). Report vulnerabilities as described in [SECURITY.md](SECURITY.md).
