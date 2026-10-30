# Opencadkid — game specification 0.1.0

Audience: ages 4–8, primarily touch phones. French first, English included. No reading is required in child play. Spoken instructions, procedural SVG pictograms, object illustrations and dot patterns convey the task. No timer, lives, punishment, advertising, purchase, account, analytics or external runtime resource. The first home gesture unlocks browser audio. Reduced motion removes shakes, bounces and decorative particles. Local speech voices are preferred; speech availability offline depends on installed device voices.

## Catalogue

Only `compter` is implemented and present in the playable registry in this release.

| ID | Français | English | Guide | Skill and intended rules |
| --- | --- | --- | --- | --- |
| compter | Les paniers de Boubou | Boubou's baskets | Boubou | Count 1–10, build quantities, compare unequal baskets. |
| paires | Les cartes de Lumi | Lumi's cards | Lumi | Remember illustrated cards and uncover identical pairs, no time limit. |
| formes | Les formes de CaliRoux | CaliRoux's shapes | CaliRoux | Recognize shapes and colours named aloud, choose the matching illustration. |
| sons | Les sons de Tutu | Tutu's sounds | Tutu | Match initial sounds and letters with illustrations; separate native vocabulary and recordings/speech text for each language. |
| puzzle | Le puzzle de Pestouille | Pestouille's puzzle | Pestouille | Drag illustrated pieces into a 2×2 then 3×3 image; offer soft snap assistance. |
| chemin | Le chemin de Pestouille | Pestouille's path | Pestouille | Trace a maze with a finger; guide gently at walls, never reset progress as punishment. |
| suites | Les suites de Lumi | Lumi's patterns | Lumi | Extend AB, ABC, AAB and related illustrated sequences by selecting the next object. |
| ranger | Le rangement de CaliRoux | CaliRoux's sorting | CaliRoux | Sort illustrated objects by spoken colour, shape, size or category. |
| tambours | Les tambours de Tutu | Tutu's drums | Tutu | Listen to and repeat short rhythms with taps; replay freely, no penalty for timing. |
| atelier | L'atelier de Boubou | Boubou's workshop | Boubou | Fill drawing regions with colour and draw freely; creation rather than scoring. |

Learning the time belongs to TicTac. Its home card opens the sister app only after the adult gate. No other future-game cards appear.

## Counting levels

All sessions contain six questions. Levels unlock in numerical order after completing the previous session, regardless of errors. The level chooser displays large numbered dot constellations and a mode pictogram. Level one is initially available. Completed levels remain replayable; level eight has an Again button and Home, without a nonexistent next level.

| Level | Mode | Quantities | Task |
| --- | --- | --- | --- |
| 1 | combien | 1–3 | Count a scene; choose one of three number-and-dot cards. |
| 2 | combien | 1–5 | Same task with more objects. |
| 3 | combien | 1–10 | Same task up to ten. |
| 4 | remplir | 1–5 | Put the spoken number of illustrated objects into the basket. |
| 5 | remplir | 1–10 | Same task up to ten. |
| 6 | plus | 1–5 | Choose the basket with more objects. |
| 7 | plus | 1–10 | Choose the basket with more objects up to ten. |
| 8 | plus | 1–10 | Choose the basket with fewer objects. |

`generateRound(level, seed, count = 6)` is deterministic with Mulberry32. Each question uses one illustrated object type: apple, pear, strawberry, carrot, star, fish or flower. Consecutive targets differ. Counting cards contain three distinct integers within the level's range; the answer appears once. Distractors differ from the target by one or two. A seeded initial answer position and a cyclic offset balance all three positions in every six-question session.

Filling provides at least target + 2 objects (up to target + 4). Touch a reserve object or drag it onto the basket to add one; touch a basket object or drag it back to remove one. Validate explicitly. The engine clamps quantities to 0…reserve. Only a primary pointer owns a drag; cancelled or lost capture clears it. Drags use `touch-action: none` only in the filling zone; other controls use manipulation. A 180 ms transfer debounce absorbs accidental double taps. Answer validation locks the solved question; a separate arrow continues, so an accidental second answer cannot skip a question.

Comparison baskets are never equal. Both quantities lie in the level range. The answer is index 0 for the left basket or 1 for the right. More and fewer are actual inequality rules, not visual size comparisons.

`layoutObjects(n, width, height, seed)` uses shuffled grid cells with bounded jitter. Each circle has diameter 48. Cell spacing minus maximum jitter remains at least the diameter. Circles stay within the scene and centres remain at least 48 apart for n = 1…10 in 320×220, as well as the UI's 288-wide scenes. An impossible scene throws instead of silently overlapping objects. Quantity zero returns an empty layout.

## Answers, hints and rewards

`answer(state, choice)` returns a new state, `correct`, and `hint`. Wrong choices increase the current question's error count, keep the question open, and never subtract progress. Hint is true for the second and subsequent errors. A correct answer credits first-try only if there were zero errors. Repeated answers after success cannot earn extra credit. Only `advance` moves to the next question after success; after the sixth success, it marks the session finished.

On error the touched control shakes briefly, Boubou looks gently surprised, and speech says “Essaie encore !” / “Try again!”. At two errors the visual scene is highlighted; objects in the relevant scene are counted in sequence with speech and a moving highlight. Filling also shows the requested target as dots. On success Boubou smiles and a short cancellable synthesized chime plays. Backgrounding or disabling sound stops audio. The session's final screen uses celebration and large stars.

| First-try answers out of six | Stars |
| --- | --- |
| 0–2 | 1 |
| 3–4 | 2 |
| 5–6 | 3 |

Never zero stars. Complete the session to unlock the next level. Save the maximum star count for each level; replay cannot lower it. Storage `opencadkid.v1` includes version 1, locale, voice, sound and level records. Missing, incompatible, corrupt or blocked storage yields a fresh state. Individual invalid level records are dropped; save failures never block play.

## Shell and parental controls

The home shows all five original SVG guides in a soft landscape, the title and one large card per playable game with a pictogram and stars. A touch speaks the game's name, followed by the level-choice prompt. No voice is expected before the initial gesture. The default locale is French except when the device language starts with `en`; saved preferences take precedence. HTML language follows the saved choice.

The settings gear and TicTac card trigger a written multiplication of two integers 3…9. Three distinct options include the product once, shuffled by a seeded generator. The panel is never read aloud. An incorrect answer closes it. Success opens settings or requests `https://davy45270.github.io/tictac/` in a new context with `noopener noreferrer`. Before success there is no actionable external anchor. Settings change FR/EN, voice and sounds, or clear progress after a second confirmation. The gate is a gentle adult check, not secure age verification.

## Test oracle

Tests are written for independent execution; no Vitest, Playwright or browser was run during authoring.

- RNG: equal seeds reproduce a thousand samples, values are in [0,1), different seeds differ.
- Counting: every level over 300 seeds checks deterministic six-question output, ranges, distinct adjacent targets, distractor rules, reserve size and strict comparison correctness. Six hundred counting questions per counting level put each correct position between 20% and 47%.
- Layout: each quantity 1…10 over 300 seeds checks deterministic positions, bounded radius-24 circles and all pairwise centre distances ≥ 48. Impossible areas throw.
- State: wrong answers retain a question; hint starts at two errors; only a clean success credits first-try; solved questions reject duplicate credit; basket operations are pure and bounded.
- Reward: all seven possible first-try totals match the exact star table. A zero-first-try completion earns one star and unlocks the next level. Better records survive.
- Parental: 200 seeds yield factors in 3…9, three distinct options, exactly one product, determinism and all three correct positions.
- Language/registry/characters: bilingual key parity and no empty strings; the playable registry has valid guides and SVG; all character expressions render finite SVG in both motion modes.
- Persistence: malformed, absent, incompatible and throwing storage are safe; preferences round-trip; invalid records are removed.
- Brand guard: public text excludes commercial game names and uppercase internal issue identifiers. Lockfile and PNG bytes are excluded from prose inspection.
- PWA: manifest uses relative start/scope, three valid PNG dimensions and standalone display; configuration uses generateSW, relative base and complete asset globs without runtime network caching. E2E establishes worker control, disables network, reloads and completes a session.
- Browser: both desktop and phone show home and all guides, one playable card, targets ≥ 48, cards ≥ 120, language persistence, zero console errors and no external home requests. Widths 320…1280 have no horizontal overflow.
- Parental E2E: wrong answers cannot open a link; correct answers request precisely the sister app URL, intercepted before loading, with the required rel attributes.
- Counting E2E: a full session in each mode, exact star counts, progress after reload, low-score unlocking, removal from basket, retry encouragement and two-error hints. The read-only hook exposes a detached snapshot of screen, game, level, question index, current question including answer, basket count and target rectangles; it exposes no mutation function.
- Noisy touch: fixed-seed ±10 px offsets, a 10–16-step noisy drag, an accidental double tap, completed sessions for all modes and unchanged scroll offsets. Touches use the touchscreen or Chromium touch events, never engine mutation.
- Captures: mobile only and skipped unless `CAPTURES=1`; outputs the five README screenshots. Generated screenshots are review artifacts, not runtime images.

### Suggested mutation checks

1. In `src/engines/compter/index.ts`, change the hint comparison from `errors >= 2` to `errors >= 3`. The state unit test and the two-error browser test must fail.
2. In the same engine, change the comparison answer rule from `left > right` to `left < right` for more. Per-level seeded rule tests must fail, independently calculating the inequality.
3. In the same engine, make `complete` return a new lower score instead of taking `Math.max`. The best-record preservation unit test must fail.
