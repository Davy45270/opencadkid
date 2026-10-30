# Opencadkid — game specification 0.2.0

Audience: ages 4–8, primarily touch phones. French first, English included. No reading is required in child play. Spoken instructions, procedural SVG pictograms, object illustrations and dot patterns convey the task. No timer, lives, punishment, advertising, purchase, account, analytics or external runtime resource. The first home gesture unlocks browser audio. Reduced motion removes shakes, bounces and decorative particles. Local speech voices are preferred; speech availability offline depends on installed device voices.

## Catalogue

`compter` and `paires` are implemented and present in the playable registry. Other catalogue entries remain planned.

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

`generateRound(level, seed, count = 6)` is deterministic with Mulberry32. Each question uses one illustrated object type: apple, pear, strawberry, carrot, star, fish or flower. Consecutive targets differ. Counting cards contain three distinct integers within the level's range; the answer appears once. Distractors differ from the target by one or two. Each answer position is drawn with the seeded RNG from all three positions, excluding the previous position only when it has already appeared twice consecutively. Across 600 questions each position must receive 20–47% of answers; triples are forbidden and fewer than 5% of 300 seeded rounds may follow a complete +1 modulo 3 rotation.

Filling provides at least target + 2 objects (up to target + 4). Touch a reserve object or drag it onto the basket to add one; touch a basket object or drag it back to remove one. Validate explicitly. The engine clamps quantities to 0…reserve. Only a primary pointer owns a drag; cancelled or lost capture clears it. Drags use `touch-action: none` only in the filling zone; other controls use manipulation. A 180 ms transfer debounce absorbs accidental double taps. Answer validation locks the solved question; a separate arrow continues, so an accidental second answer cannot skip a question.

Comparison baskets are never equal. Both quantities lie in the level range. The answer is index 0 for the left basket or 1 for the right. More and fewer are actual inequality rules, not visual size comparisons.

`layoutObjects(n, width, height, seed)` uses shuffled grid cells with bounded jitter. Each circle has diameter 48. Cell spacing minus maximum jitter remains at least the diameter. Circles stay within the scene and centres remain at least 48 apart for n = 1…10 in 320×220, as well as the UI's 288-wide scenes. Nested object SVG viewports explicitly retain their 48×48 size despite the generic SVG rule. On a 390×844 phone, rendered objects measure 40–64 px, remain inside their scene and their rectangles do not overlap (2 px measurement tolerance). An impossible scene throws instead of silently overlapping objects. Quantity zero returns an empty layout.

## Memory: Lumi's cards

`src/engines/paires/` is pure and uses the shared Mulberry32 RNG and Fisher–Yates shuffle. `newBoard(level, seed)` shuffles a palette, selects distinct motifs, duplicates each exactly twice, then shuffles all cards. The first three levels select from eight introductory motifs, giving each motif a 12.5% expected occupancy at each position over four-pair boards. Later levels use all sixteen. Equal seeds reproduce the entire board. The engine manipulates identifiers only; all artwork and singular spoken names live in `src/games/paires/`.

| Level | Pairs | Columns × rows | Preview | Matching |
| --- | --- | --- | --- | --- |
| 1 | 2 | 2 × 2 | 2000 ms | Identical pictures |
| 2 | 3 | 3 × 2 | 2000 ms | Identical pictures |
| 3 | 4 | 4 × 2 | 2000 ms | Identical pictures |
| 4 | 6 | 4 × 3 | None | Identical pictures |
| 5 | 8 | 4 × 4 | None | Identical pictures |
| 6 | 10 | 4 × 5 | None | Identical pictures |
| 7 (optional extension) | 6 | 4 × 3 | None | One coloured picture and its silhouette |

Sixteen motifs have distinct dominant colours and outline paths: apple, banana, cherries, carrot, fish, cat, butterfly, snail, car, boat, rocket, house, star, heart, moon and umbrella. Silhouettes reuse the exact filled outline in a uniform dark colour. Matching uses the motif identifier, including in shadow mode. Recognition never requires colour or reading.

The first three levels block flips until the view calls `endPreview` after two seconds. `flip` returns a new board only for an eligible hidden card; it rejects invalid indices, found cards, visible cards, preview, completed boards and any third card during a mismatch. Two matching cards become found immediately, remain face up and clear the pending selection. A mismatch keeps two cards visible until `settle`; it increments moves once per two-card attempt. The UI settles after 900 ms or consumes the next card touch to close the mismatch. A rapid second touch can open at most one new card. Double touches on a visible card cannot increment moves.

`seen` records actual flips (the introductory preview does not count). Each card tracks consecutive failed attempts since its last match; the first encounter does not count as a repeated miss. After three failures involving a previously seen card, `hint` identifies that card and its partner only if both have been seen and neither is found. The hint survives settling and shines around the two card backs; finding the pair clears it. Lumi encourages throughout. No incorrect-pair sound, timer or visible move count is present.

Completion occurs immediately when all cards are found. Three stars require moves ≤ ceil(1.5 × pairs), two require moves ≤ ceil(2.5 × pairs), otherwise one. Every completion unlocks the next level; level seven has no next button. `complete` preserves the maximum score. Existing `records` still belongs to counting; optional saved `pairesRecords` holds memory levels 1–7, filtered to integer stars 1–3. Missing memory records migrate to an empty object without losing counting progress. Erasing progress clears both games.

The home uses Lumi's existing `licorne` character identifier and the memory skill. Level dots, Home, ear, replay and next-level controls follow the counting shell. The game header has 64 px controls. Card buttons are at least 64 px on 320 px and wider phones, with 10 px gaps. At 390×844, twenty cards fit in four columns and five rows without scrolling. A star decorates each back. Faces turn with a short animation, matched cards sparkle and play the shared soft chime, and reduced motion removes transitions and particles. The active local voice names every flipped motif; the ear repeats the illustrated instruction. Hidden/backgrounded play cancels timers and audio; returning resumes pending preview/mismatch resolution.

`window.__kid.state().board` is a detached snapshot: board dimensions, identifiers, shadow flags, per-card visible/found flags and screen rectangles, pending indices, seen flags, moves, mismatch, hint and finished. It provides no mutation API. Found cards remain in the snapshot when the completion screen replaces the grid; their rectangles are then null.

### Memory test oracle

Authored without running Vitest, Playwright or a browser:

- `tests/paires.test.ts`: independent seven-level table; 300 seeds per level check deterministic exact duplicate counts, distinct pair motifs and phone geometry. 2000 four-pair boards check every introductory motif at every position between 8% and 17%.
- State tests reject preview/invalid/found/visible/third flips, verify pure mismatch and settle transitions, and finish every level with a perfect player in exactly pairs moves. Twelve seeded random players per level must finish within a generous safety guard; no move cap exists in the engine. Every finish earns at least one star. Exact rounded reward boundaries, unlocking and best-score preservation are checked independently.
- Hint test exposes both partners, repeats three misses, checks no early hint, then matches the pair and checks clearing. Shadow tests require opposite rendering variants with equal motif identifiers. SVG tests check finite well-formed wrappers/path elements, sixteen distinct outlines/colours, distinct silhouette strings and complete FR/EN motif names and instructions. Storage tests cover independent records, filtering, migration and round trips.
- `tests/e2e/paires.spec.ts`: click a full game guided by the read-only hook, make one deliberate mismatch, wait for settlement, verify detached snapshots, stars, reload/unlock and counting isolation. Check preview visibility/locking, English shadow completion, spoken names and replay with media on/off, and sound only on matches. The shared fixture rejects all console/page errors.
- `tests/e2e/paires-doigt.spec.ts`: mobile touch only, twenty-card board, deterministic ±10 px offsets, 64 px targets, gaps ≥8 px, a double touch on the same card and two rapid touches during a mismatch. Finish using real touch input; assert unchanged scroll offsets throughout and no page overflow.
- Home checks both playable cards at each responsive width. Existing generic counting selectors are qualified by game id because two cards make them ambiguous. Optional capture outputs include `paires-plateau.png` and `paires-fin.png`; generated images require orchestrator review.

### Memory mutations to try

1. Remove the `state.mismatch` guard from `flip`: the third-card state test must fail.
2. Change the repeated-miss threshold from `>= 3` to `>= 4`: the hint test must fail.
3. Replace `Math.max` in memory `complete` with the current score: the best-score preservation test must fail.

## Answers, hints and rewards

`answer(state, choice)` returns a new state, `correct`, and `hint`. Wrong choices increase the current question's error count, keep the question open, and never subtract progress. Hint is true for the second and subsequent errors. A correct answer credits first-try only if there were zero errors. Repeated answers after success cannot earn extra credit. Only `advance` moves to the next question after success; after the sixth success, it marks the session finished.

On error the touched control shakes briefly, Boubou looks gently surprised, and speech says “Essaie encore !” / “Try again!”. At two errors the visual scene is highlighted; objects in the relevant scene are counted in sequence with speech and a moving highlight. Filling also shows the requested target as dots. Its hint first counts and highlights every object already in the basket, then counts the missing objects in the reserve up to the target. If the basket exceeds the target, it counts the entire basket and then highlights all excess objects while naming the excess quantity. A transfer during a hint restarts the complete sequence at 1 using the updated basket; the hint remains active until a correct validation or navigation. This applies to both pointer and keyboard transfers. On success Boubou smiles and a short cancellable synthesized chime plays. Backgrounding or disabling sound stops audio. The session's final screen uses celebration and large stars.

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
- Counting: a hard-coded table of eight expected level modes, ranges and comparison rules is the independent oracle. Every level over 300 seeds checks deterministic six-question output, ranges, distinct adjacent targets, distractor rules, reserve size and strict comparison correctness. Six hundred counting questions per counting level put each correct position between 20% and 47%. Three hundred seeds per counting level also forbid position triples and limit complete periodic rotations to less than 5%.
- Layout: each quantity 1…10 over 300 seeds checks deterministic positions, bounded radius-24 circles and all pairwise centre distances ≥ 48. Impossible areas throw.
- State: wrong answers retain a question; hint starts at two errors; only a clean success credits first-try; solved questions reject duplicate credit; basket operations are pure and bounded.
- Reward: all seven possible first-try totals match the exact star table. A zero-first-try completion earns one star and unlocks the next level. Better records survive.
- Parental: 200 seeds yield factors in 3…9, three distinct options, exactly one product, determinism and all three correct positions.
- Language/registry/characters: bilingual key parity and no empty strings; the playable registry has valid guides and SVG; all character expressions render finite SVG in both motion modes.
- Persistence: malformed, absent, incompatible and throwing storage are safe; preferences round-trip; invalid records are removed.
- Brand guard: public text excludes commercial game names and uppercase internal issue identifiers. Lockfile and PNG bytes are excluded from prose inspection.
- PWA: manifest uses relative start/scope, three valid PNG dimensions and standalone display; configuration uses generateSW, relative base and complete asset globs without runtime network caching. E2E establishes worker control, disables network, reloads and completes a session.
- Browser: both desktop and phone show home and all guides, two playable cards, targets ≥ 48, cards ≥ 120, language persistence, zero console errors and no external home requests. Widths 320…1280 have no horizontal overflow.
- Parental E2E: wrong answers cannot open a link; correct answers request precisely the sister app URL, intercepted before loading, with the required rel attributes.
- Counting E2E: DOM objects and every answer constellation form the counting oracle; the read-only hook only checks agreement. Answer cards and validation controls measure at least 72 px in each dimension; other targets measure at least 48 px. A full session in each mode and in the fewer level, exact star counts, progress after reload, low-score unlocking, removal from basket, retry encouragement and two-error hints. The read-only hook exposes a detached snapshot of screen, game, level, question index, current question including answer, basket count and target rectangles; it exposes no mutation function.
- Media E2E: injected local speech and WebAudio doubles record utterances and oscillator starts. No speech precedes the first touch; both counting and filling check every question instruction, replay, retry and the full highlighted hint count. Filling tests basket-first order, restart on a transfer and excess highlighting. Comparison hints count the selected basket. Correct answers start oscillators only with sound enabled.
- Noisy touch: fixed-seed ±10 px offsets, a 10–16-step noisy drag, an accidental double tap, completed sessions for all modes and unchanged scroll offsets. Touches use the touchscreen or Chromium touch events, never engine mutation.
- Captures: mobile only and skipped unless `CAPTURES=1`; outputs the seven README screenshots. Generated screenshots are review artifacts, not runtime images.

### Suggested mutation checks

1. In `src/engines/compter/index.ts`, change the hint comparison from `errors >= 2` to `errors >= 3`. The state unit test and the two-error browser test must fail.
2. In the same engine, change the comparison answer rule from `left > right` to `left < right` for more. Per-level seeded rule tests must fail, independently calculating the inequality.
3. In the same engine, make `complete` return a new lower score instead of taking `Math.max`. The best-record preservation unit test must fail.
