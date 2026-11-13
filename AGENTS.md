# Working on Opencadkid

Instructions for any coding agent (and any human) changing this repository. Read [GAME_SPEC.md](GAME_SPEC.md)
before changing or adding a game: it is the contract of every game.

## What this is

Gentle, touch-first games for young children (35 games), an offline PWA built with Vite and TypeScript.
**No game library and no canvas game loop**: views are SVG and HTML strings injected into the DOM
(`root.innerHTML = …`), animated with CSS classes, `requestAnimationFrame` and timers. Sound is synthesized
(`shell/sound.ts`, oscillators, no audio file); the voice is `speechSynthesis` (`shell/speech.ts`).
`package.json` has no runtime dependency, and that is deliberate.

### Rendering lock: no Phaser, no Phaser AE

Kid never embeds `phaser` nor any `@phaser-ae/*` package, even if a documentation page or a tool suggests it.
Two guards enforce it, and both must stay green:
- `.oxlintrc.json`, rule `eslint/no-restricted-imports`: an import of `phaser`, `phaser/*` or `@phaser-ae/*`
  fails `npm run lint`;
- `tests/no-phaser.test.ts`: such a package in `package.json` or `package-lock.json` fails the test.

## Map of `src/`

- `main.ts` imports `shell/router`.
- `registry.ts`: the public list `games` (id, names fr/en, guide character, pictogram, skill). Home card only.
- `engines/<game>/`: **pure game logic**, no DOM. Usually `index.ts` (state, pure transitions such as `play`,
  `step`, `fire`, `tick`, `choose`, plus `levels`, `stars`, `complete`, `isUnlocked`, `parseRecords`, `hint`),
  `levels.ts` and `solver.ts` (`greedyPlayer`, `randomPlayer(id, seed)`, used by the tests to prove every level).
- `engines/rng.ts`: the only randomness, a seeded Mulberry32 (`makeRng`) and `shuffle`. The session seed comes
  from `crypto.getRandomValues` in the router and is passed down.
- `games/<game>/`: the view. `art.ts` (SVG drawings), `view.ts` (screens as strings, `labels = { fr, en }`,
  `pictogram`), `interaction.ts` (DOM mounting, gestures, timers; exports `mount`, `readRecords`,
  `writeRecords`, `snapshot`, `Session`).
- `shell/`: router, storage, i18n (fr and en), sound, speech, drag, activation, coordinates, parental gate.
- `ui/`: home screen, feedback, backdrops, illustrations. `characters/`: the five characters and their SVG.

Two generations of games coexist. The 26 recent games (and `atelier`) follow the layout above. Nine older
games (`compter`, `paires`, `formes`, `sons`, `puzzle`, `chemin`, `suites`, `ranger`, `tambours`) keep a
single-file engine, are orchestrated inside `shell/router.ts` and store their records in the common `Save`
(`shell/storage.ts`). Do not copy that older pattern for a new game.

## Adding a game

The router still wires every game by hand. Copy the most recent game (`autobus`): search for `autobus` and
`Autobus` outside its own folders and mirror **every** occurrence. Today that means:

1. `src/engines/<id>/` and `src/games/<id>/` (the new code; storage key `opencadkid.<id>.v1`).
2. `src/registry.ts`: import the pictogram, add the entry to `games`.
3. `src/shell/router.ts`, ten places:
   - the two imports (`mount`, `readRecords`, `writeRecords`, `snapshot`, `Session`; then `labels`) after the
     last game's imports, near the top;
   - the `let <id>Session` and `let dispose<Id>` declarations;
   - the cleanup line that calls every `dispose…?.()`;
   - the `[data-game]` click handler on the home screen (opens the level list and speaks the title);
   - one `else if (screen === 'game' && activeGame === '<id>' && <id>Session)` branch calling `mount…`;
   - the list of games that own their back button;
   - the "erase progress" handler (`write…Records(storage, {})` and reset of the session);
   - the `visibilitychange` list;
   - the test hook snapshot at the end of the file.
4. `src/ui/home.ts`: import `readRecords` and add the game to the stars ternary.
5. `src/style.css`: the game's styles, with a `prefers-reduced-motion: reduce` block.
6. Tests: `tests/<id>.test.ts` (engine and solver proving every level), `tests/e2e/<id>.spec.ts`, the id in
   `tests/registry.test.ts`, and the spec in **both** tables of `scripts/e2e-impact.js` (`npm run test:impact`
   fails otherwise).
7. `GAME_SPEC.md`, `README.md`, `README.fr.md`, `CHANGELOG.md`.

## Rules

- **Engines stay pure.** No `window`, `document`, `navigator`, `Date`, `localStorage`, `fetch`, no timer and no
  `Math.random` under `src/engines/` (the lint enforces most of it). Randomness goes through `engines/rng.ts`.
  Time is advanced by explicit ticks or frames, so every engine replays deterministically without a browser.
- **Children first.** Touch first (large targets; `touch-action: none` only on drag zones). No reading needed to
  play: spoken instructions, pictograms. Honour `prefers-reduced-motion` in every game. No defeat, no time limit, no
  score pressure. Everything visible exists in French and English.
- **Public text.** `tests/brand-guard.test.ts` reads every tracked text file: no commercial game name and no
  internal ticket identifier (an uppercase word, a hyphen and digits). Use plain descriptions of game genres.
- **Lint.** `npm run lint` runs oxlint with zero warning allowed; `npm run typecheck` runs `tsc --noEmit`.

## Tests: targeted, never the whole suite

- Unit (Vitest): run only the files you touched, `npx vitest run tests/<file>.test.ts`. Do not run `npm test`
  locally; the CI runs it.
- Browser (Playwright): never the whole suite. `node scripts/e2e-impact.js --base <commit>` prints the specs a
  change needs; run those with `npx playwright test <specs>` after `npm run build`.
- `npm run test:impact` checks the selection script itself.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc --noEmit && vite build` |
| `npm run preview` | serves `dist/` |
| `npm run lint` | oxlint, `--max-warnings=0` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | whole Vitest suite (CI only) |
| `npm run test:e2e` | Playwright (always with an explicit list of specs) |
| `npm run check:precache` | precache budget, after a build |
| `npm run test:impact` | tests of the E2E selection |

## Precache budget

`scripts/check-precache.js` gzips every precached file of `dist/` and fails at 800 kB. A fresh build measured
529 kB for 35 games; a game costs about 13 kB. Painted WebP scenes are never precached and stay under 60 kB each.
Run `npm run build && npm run check:precache` when a change adds a game or an asset, and report the measured size.

## Continuous integration

The reference CI is **Woodpecker**, on the local forge: `.woodpecker/checks.yml` (npm ci, lint, typecheck,
test, build, check:precache, test:impact) then `.woodpecker/e2e.yml` (targeted E2E selection, then
Playwright). It runs on a push to `main`, on pull requests and on manual runs. **A push to any other branch
triggers nothing**: start a manual pipeline on the branch, with the variable `E2E_BASE=<commit before the
change>` so the E2E selection has a base. The GitHub repository is a mirror; its workflows are not the
reference.
