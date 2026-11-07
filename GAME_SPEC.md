# Opencadkid — game specification 1.0.0

Audience: ages 4–8, primarily touch phones. French first, English included. No reading is required in child play. Spoken instructions, procedural SVG pictograms, object illustrations and dot patterns convey the task. No timer, lives, punishment, advertising, purchase, account, analytics or external runtime resource. The first home gesture unlocks browser audio. Reduced motion removes shakes, bounces and decorative particles. Local speech voices are preferred; speech availability offline depends on installed device voices.

## Catalogue

`compter`, `paires`, `formes`, `sons`, `puzzle`, `chemin`, `suites`, `ranger`, `tambours`, `gouter` and `atelier` are implemented and present in the playable registry.

| ID | Français | English | Guide | Skill and intended rules |
| --- | --- | --- | --- | --- |
| compter | Les paniers de Boubou | Boubou's baskets | Boubou | Count 1–10, build quantities, compare unequal baskets. |
| paires | Les cartes de Lumi | Lumi's cards | Lumi | Remember illustrated cards and uncover identical pairs, no time limit. |
| formes | Les formes de CaliRoux | CaliRoux's shapes | CaliRoux | Recognize shapes and colours named aloud, choose the matching illustration. |
| sons | Les sons de Tutu | Tutu's sounds | Tutu | Match initial sounds and letters with illustrations; separate native vocabulary and recordings/speech text for each language. |
| puzzle | Le puzzle de Pestouille | Pestouille's puzzle | Pestouille | Rebuild twelve illustrated scenes (six vector, six painted) with 2–12 pieces and soft snap assistance. |
| chemin | Le chemin de Pestouille | Pestouille's path | Pestouille | Trace a maze with a finger; guide gently at walls, never reset progress as punishment. |
| suites | Les suites de Lumi | Lumi's patterns | Lumi | Extend AB, ABC, AAB and related illustrated sequences by selecting the next object. |
| ranger | Le rangement de CaliRoux | CaliRoux’s tidy-up | CaliRoux | Sort illustrated objects by spoken colour, shape, size or category. |
| tambours | Les tambours de Tutu | Tutu's drums | Tutu | Listen to and repeat short rhythms with taps; replay freely, no penalty for timing. |
| gouter | Le goûter de Boubou | Boubou's snack | Boubou | Cut strings so a hanging sweet falls into Boubou's mouth; bubbles, hooks and slack strings; 116 solver-checked levels. |
| atelier | L'atelier de Boubou | Boubou's studio | Boubou | Colour drawing regions and the background, paint over the model or on a blank page, play the model's animation; creation rather than scoring. |

Learning the time belongs to TicTac. Its home card opens the sister app only after the adult gate. No other future-game cards appear.

## Counting levels

All sessions contain six questions. Levels unlock in numerical order after completing the previous session, regardless of errors. The level chooser displays large numbered dot constellations and a mode pictogram. Level one is initially available. Completed levels remain replayable; level sixteen has an Again button and Home, without a nonexistent next level.

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
| 9 | combien | 6–10 | Count large quantities only. |
| 10 | remplir | 6–10 | Fill large quantities only. |
| 11 | plus | 6–10 | More, between two large baskets. |
| 12 | combien | 6–10 | Large quantities; wrong cards are the ±1 neighbours whenever the range allows. |
| 13 | plus | 6–10 | More, the baskets differ by exactly one. |
| 14 | plus | 6–10 | Fewer, the baskets differ by exactly one. |
| 15 | combien | 3–7 among 10 | Count one kind among ten objects of two kinds (“How many apples are there?”); ±1 cards. |
| 16 | mixed review | 6–10 (decoys 3–7) | Each round covers ±1 counting, filling, more and fewer by one, and decoys once, plus one more, shuffled. |

Levels 9–16 only add optional rules (`min`, `close`, `gap`, `decoys`, mode `melange`); levels 1–8 keep their literal configuration and the same seeded rounds. Every new question shows at least six objects. The decoy scene always holds ten objects, so the total never reveals the answer; the counted kind is shown next to the eye pictogram and listed first in the scene's document order, so the shared two-error hint counts only that kind. `tests/compter-niveaux.test.ts` checks the literal original table and a fingerprint of their rounds, pairwise distinct configurations and play fingerprints, 200 playable rounds per level and a non-decreasing hardness score.

`generateRound(level, seed, count = 6)` is deterministic with Mulberry32. Each question uses one illustrated object type: apple, pear, strawberry, carrot, star, fish or flower. Consecutive targets differ. Counting cards contain three distinct integers within the level's range; the answer appears once. Distractors differ from the target by one or two. Each answer position is drawn with the seeded RNG from all three positions, excluding the previous position only when it has already appeared twice consecutively. Across 600 questions each position must receive 20–47% of answers; triples are forbidden and fewer than 5% of 300 seeded rounds may follow a complete +1 modulo 3 rotation.

Filling provides at least target + 2 objects (up to target + 4). Touch a reserve object or drag it onto the basket to add one; touch a basket object or drag it back to remove one. Validate explicitly. The engine clamps quantities to 0…reserve. Only a primary pointer owns a drag; cancelled or lost capture clears it. Drags use `touch-action: none` only in the filling zone; other controls use manipulation. A 350 ms per-token transfer debounce absorbs accidental double taps. Answer validation locks the solved question; a separate arrow continues, so an accidental second answer cannot skip a question.

Comparison baskets are never equal. Both quantities lie in the level range. The answer is index 0 for the left basket or 1 for the right. More and fewer are actual inequality rules, not visual size comparisons.

`layoutObjects(n, width, height, seed)` uses shuffled grid cells with bounded jitter. Each layout cell reserves a diameter of 68; the rendered object has a fixed 52 CSS pixel viewport. Cell spacing minus maximum jitter remains at least the diameter. Circles stay within the scene and centres remain at least 68 apart for n = 1…10 in 320×220, as well as the UI's 288-wide scenes. Objects are absolutely positioned in a 280×216 CSS pixel scene without an outer SVG transform; their SVG viewports retain their 52×52 size. On a 390×844 phone, rendered objects measure 40–64 px, remain inside their scene and their rectangles do not overlap (2 px measurement tolerance). An impossible scene throws instead of silently overlapping objects. Quantity zero returns an empty layout.

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
| 8 | 8 | 4 × 4 | None | One coloured picture and its silhouette |
| 9 | 10 | 4 × 5 | None | One coloured picture and its silhouette |
| 10 | 12 | 4 × 6 | None | Identical pictures |
| 11 | 8 | 4 × 4 | None | Two identical silhouettes (outline only) |
| 12 | 10 | 4 × 5 | None | Two identical silhouettes (outline only) |
| 13 | 12 | 4 × 6 | None | One coloured picture and its silhouette |
| 14 | 12 | 4 × 6 | None | Two identical silhouettes (outline only) |

Levels 8–14 add the optional `silhouettes` flag (both cards of a pair are dark, so only the outline matches; Lumi says “Trouve les deux mêmes ombres.” / “Find the two matching shadows.”) and the 4 × 6 board. Levels 1–7 keep their literal configuration and the same seeded boards. Difficulty, measured as pairs plus two per lost colour cue, never decreases (10, 12, 12, 12, 14, 14, 16). `tests/paires-niveaux.test.ts` checks the literal original table and a fingerprint of their boards, distinct configurations and play fingerprints, 200 solvable boards per level with unique silhouettes and the phone geometry.

Sixteen motifs have distinct dominant colours and outline paths: apple, banana, cherries, carrot, fish, cat, butterfly, snail, car, boat, rocket, house, star, heart, moon and umbrella. Silhouettes reuse the exact filled outline in a uniform dark colour. Matching uses the motif identifier, including in shadow mode. Recognition never requires colour or reading.

The first three levels block flips until the view calls `endPreview` after two seconds. `flip` rejects invalid indices, found cards, preview and completed boards. Visible cards are otherwise inert. Two matching cards become found immediately, remain face up and clear the pending selection. A mismatch keeps two cards visible until `settle`; moves increment once per two-card attempt. During a mismatch, touching either visible card only settles the pair. Touching an eligible hidden card settles the pair and opens that card in the same pure `flip` transition, without another move. `settle` is idempotent and leaves a new single selection intact. The UI also settles after 900 ms. The 350 ms same-card, same-turn guard still absorbs accidental repeats; a repeated touch on the newly opened card leaves it open. Settlement alone does not speak a motif.

`seen` records actual flips (the introductory preview does not count). Each card tracks consecutive failed attempts since its last match; the first encounter does not count as a repeated miss. After three failures involving a previously seen card, `hint` identifies that card and its partner only if both have been seen and neither is found. The hint survives settling and shines around the two card backs; finding the pair clears it. Lumi encourages throughout. No incorrect-pair sound, timer or visible move count is present.

Completion occurs immediately when all cards are found. Three stars require moves ≤ ceil(1.5 × pairs), two require moves ≤ ceil(2.5 × pairs), otherwise one. Every completion unlocks the next level; level fourteen has no next button. `complete` preserves the maximum score. Existing `records` still belongs to counting; optional saved `pairesRecords` holds memory levels 1–14, filtered to integer stars 1–3. Missing memory records migrate to an empty object without losing counting progress. Erasing progress clears both games.

The home uses Lumi's existing `licorne` character identifier and the memory skill. Level dots, Home, ear, replay and next-level controls follow the counting shell. The game header has 64 px controls. Card buttons are at least 64 px on 320 px and wider phones, with 10 px gaps. At 390×844, twenty cards fit in four columns and five rows without scrolling, and twenty-four in four columns and six rows. A star decorates each back. Faces turn with a short animation, matched cards sparkle and play the shared soft chime, and reduced motion removes transitions and particles. The active local voice names every flipped motif; the ear repeats the illustrated instruction. Hidden/backgrounded play cancels timers and audio; returning resumes pending preview/mismatch resolution.

`window.__kid.state().board` is a detached snapshot: board dimensions, identifiers, shadow flags, per-card visible/found flags and screen rectangles, pending indices, seen flags, moves, mismatch, hint and finished. It provides no mutation API. Found cards remain in the snapshot when the completion screen replaces the grid; their rectangles are then null.

### Memory test oracle

Authored without running Vitest, Playwright or a browser:

- `tests/paires.test.ts`: independent seven-level table; 300 seeds per level check deterministic exact duplicate counts, distinct pair motifs and phone geometry. 2000 four-pair boards check every introductory motif at every position between 8% and 17%.
- State tests reject preview/invalid/found/visible flips, verify pure mismatch and settle transitions against a handwritten board and explicit expected selections, and finish every level with a perfect player in exactly pairs moves. Twelve seeded random players per level must finish within a generous safety guard; no move cap exists in the engine. Every finish earns at least one star. Exact rounded reward boundaries, unlocking and best-score preservation are checked independently.
- Hint test exposes both partners, repeats three misses, checks no early hint, then matches the pair and checks clearing. Shadow tests require opposite rendering variants with equal motif identifiers. SVG tests check finite well-formed wrappers/path elements, sixteen distinct outlines/colours, distinct silhouette strings and complete FR/EN motif names and instructions. Storage tests cover independent records, filtering, migration and round trips.
- `tests/e2e/paires.spec.ts`: click a full game guided by the read-only hook, make one deliberate mismatch, wait for settlement, verify detached snapshots, stars, reload/unlock and counting isolation. Check preview visibility/locking, English shadow completion, spoken names and replay with media on/off, and sound only on matches. The shared fixture rejects all console/page errors.
- `tests/e2e/paires-doigt.spec.ts`: mobile touch only, twenty-card board, deterministic ±10 px offsets, 64 px targets, gaps ≥8 px, a double touch on the same card and two rapid touches during a mismatch. A paused clock keeps settlement and the double-touch guard deterministic: a visible-card touch closes both cards; a hidden-card touch closes both and opens its target; an immediate repeat leaves that target open and moves unchanged. Advancing 900 ms verifies that the old mismatch timer cannot close the new selection. Intentional solver touches advance the clock by 350 ms and poll the state for settlement. Finish using real touch input; assert unchanged scroll offsets throughout and no page overflow.
- Home checks both playable cards at each responsive width. Existing generic counting selectors are qualified by game id because two cards make them ambiguous. Optional capture outputs include `paires-plateau.png` and `paires-fin.png`; generated images require orchestrator review.

### Memory mutations to try

1. Make `flip` only settle a mismatch without opening a hidden target, or open a touched visible mismatch card again: the handwritten transition oracle must fail.
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


## Shapes: CaliRoux's shapes

CaliRoux uses the existing `pandaroux` character identifier. The twenty levels each contain six questions. Recognition has one matching choice; sorting has three pieces per question, each with exactly one matching box. Answer positions are drawn from the seeded RNG, excluding a position only after two consecutive uses. Adjacent requested shapes differ. No ambient randomness, time or DOM enters the engine. The scoring and unlocking functions are imported unchanged from counting: 0–2 clean questions earn one star, 3–4 two, 5–6 three. Sorting credits a question only when all three pieces were placed without error. Every finish unlocks the next level and preserves the best score in `formesRecords` (levels 1–20); missing records migrate safely.

| Level | Mode | Choices | Task |
| --- | --- | --- | --- |
| 1 | forme | 3 | Different shapes, same colour |
| 2 | forme | 4 | Different shapes, same colour |
| 3 | forme | 6 | Different shapes, mixed colours |
| 4 | couleur | 3 | Same shape, distinct colours |
| 5 | couleur | 3 | Varied shapes, distinct colours |
| 6 | les-deux | 4 | Shape and colour; one same-shape and one same-colour distractor |
| 7 | taille | 2 | Same shape in small and large sizes |
| 8 | taille | 4 | Small/large with other shapes as distractors |
| 9 | trier | 2 boxes | Three shapes sorted by colour |
| 10 | trier | 3 boxes | Three shapes sorted by colour |
| 11 | couleur | 4 | Four distinct colours, varied shapes |
| 12 | intrus | 4 | Odd one out: three pieces share a shape, one differs; colour and size never give it away; no prompt picture |
| 13 | les-trois | 4 | Shape, colour and size; one near miss for each attribute |
| 14 | les-deux | 6 | Two same-shape and two same-colour distractors |
| 15 | taille | 6 | Distractors in both sizes; another shape always shares the requested size |
| 16 | intrus | 6 | Odd one out hidden among a look-alike shape (circle/oval, square/rectangle, square/diamond) |
| 17 | les-trois | 6 | Shape, colour and size with six choices |
| 18 | trier | 3 boxes | Four shapes sorted by colour (one box takes two) |
| 19 | trier | 4 boxes | Four shapes into four colour boxes |
| 20 | mixed review | — | One question each from levels 11, 14, 15, 16, 17 and 19, shuffled |

Levels 11–20 only add optional rules (`sizes`, `lookalike`, `pieces`, modes `les-trois`, `intrus` and `melange` with `review`); levels 1–10 keep their literal configuration and the same seeded rounds. Four-colour questions redraw the seeded palette until the greedy compatible palette reaches four colours (always reached). The odd-one-out prompt shows a comparison pictogram, never the answer's outline or colour: “Touche la forme qui n’est pas comme les autres.” / “Touch the shape that is not like the others.” Shape+colour+size prompts name the size and show the size cue and the swatch. The number of pieces and boxes on screen never decreases (4, 4, 4, 6, 6, 6, 6, 7, 8, 8). `tests/formes-niveaux.test.ts` checks the literal original table and a fingerprint of their rounds, distinct configurations and play fingerprints, and 200 solvable rounds per level with an independent oracle.

Shapes: circle, square, triangle, rectangle, star, heart, diamond, oval. Colours: red, blue, yellow, green, orange, purple, pink, brown. Symmetric forbidden colour pairs: red/green, blue/purple, pink/orange, red/brown, green/brown, red/orange, red/pink, yellow/orange, purple/pink. Palettes are assembled from a seeded shuffle with pairwise exclusion before choices or boxes are made. These conservative exclusions reduce common confusions; they cannot guarantee perception for every colour vision. Shape recognition uses geometry independently of colour. Thick dark outlines surround every shape.

The displayed SVG viewports measure 104 px, or 64 px for small shapes (ratio 1.625). Rectangle and oval outlines have a taller profile so the drawn bounds, including the 3-unit stroke, measure at least 64 px large and 48 px small in both dimensions. Size ratios are measured for the same drawn shape in both dimensions. Prompts show an outline and/or colour swatch; size prompts include a relative-size silhouette. All choices carry accessible bilingual labels and SVG `data-shape`, `data-color`, `data-size`. French names agree with the noun (including feminine étoile and generic forme); English adjectives precede nouns. An error shakes the touched piece without sound. After two errors the correct choice pulses and the requested name is spoken again. A solved question locks until the separate arrow is pressed. This also applies to the sixth sorting question: all three pieces set `solved`, then Continue sets `finished`. Touch validation and Continue commit on primary pointer release; a later compatibility click cannot activate them twice.

Sorting uses one captured primary pointer, cancels on lost capture and limits `touch-action: none` to its zone. The piece follows the finger; nearest-box distance up to 24 px snaps to the box. An incorrect placement retains the piece at its original position and counts an error; a release outside all boxes simply returns. Keyboard users select a piece then its colour box. Sorted pieces retain their grid spaces and cannot be placed twice. The read-only `window.__kid.state()` snapshot includes `shapes`, the current question and target rectangles.

### Shapes test oracle and review

Authored without executing unit tests or browsers:

- `tests/formes.test.ts`: a literal ten-level table and literal forbidden-pair list; 300 seeds per level check reproducibility, unique answers, mode-specific distractors, adjacent differences, no position triples, broad position distribution and rare cycles. Sorting checks exactly one box per piece. State tests check pure errors, two-error hints, duplicate-credit guards, wrong-box returns, complete rounds, the exact seven-entry reward table, unlocks and preserved best scores. Literal SVG command signatures and starting geometry distinguish all eight shapes, with finite SVG and complete FR/EN labels. Language examples check gender and adjective order. Storage tests cover migration, filtering and independent records.
- `tests/e2e/formes.spec.ts`: one full series per mode with deliberate errors, hints, progress after reload and shared console guard. The independent DOM oracle matches SVG attributes to the pictogram prompt before checking the observation hook. Literal French and English dictionaries check spoken instructions, agreement and ear replay throughout every mode. All ten levels check rendered SVG size and ratio, detached snapshots and horizontal overflow at narrow and wide breakpoints.
- `tests/e2e/formes-doigt.spec.ts`: mobile touch only, five complete modes, seeded ±10 px touch offsets, 10–16-step noisy drags, double taps, a wrong box and unchanged scroll offsets. It requires completion and no page overflow. Sorting browser tests also release 20 px outside a box to check snap assistance.
- `captures.spec.ts`: optional mobile `formes-question.png` and `formes-trier.png`; the orchestrator generates and visually reviews these artifacts. No captures were generated during authoring.

Mutations to try: raise the hint threshold to three errors; remove the same-colour distractor in level six; accept every sorting box. Respectively the state/hint, 300-seed distractor, and sorting return/browser tests must fail.

Visual regression guards use a literal colour-to-fill table independent of the renderer. Every palette pair differs by at least 25 degrees of hue or 0.08 relative luminance; the forbidden-pair rules remain in force. Browser checks require outline relative luminance at most 0.2 and at least 3:1 contrast against the actual background behind the drawing. Exhaustive shape/size/colour fixtures use SVG path bounds plus stroke transformed into screen pixels. Prompt outline/swatch markup, two-error speech in both languages, mixed-colour shape diversity, square area and the real wrong-box return animation have explicit regression assertions.

## Sounds: Tutu's sounds (0.4.0)

Tutu is the existing `singe` guide. This game uses the shared six-question session, two-error hint, separate Continue control, exact 1/2/3-star thresholds and best-score/unlock rules. `sonsRecords` is independent of every other game; old saves migrate to an empty record set and erase clears all games. No existing engine changes. Generic registry/home expectations now include four games. The sixth sorting question sets `solved` after its third piece; the separate Continue control then sets `finished`, as in shapes. Touch commands commit on release and suppress the following compatibility click.

### Levels and native selection

| Level | Mode | Choices | Letter case |
| --- | --- | --- | --- |
| 1 | image-lettre | 2 letters | Uppercase |
| 2 | image-lettre | 3 letters | Uppercase |
| 3 | image-lettre | 4 letters | Uppercase |
| 4 | image-lettre | 4 letters | Lowercase |
| 5 | lettre-image | 3 images | Uppercase |
| 6 | lettre-image | 3 images | Lowercase |
| 7 | son-lettre | 3 letters, sound only | Uppercase |
| 8 | son-lettre | 4 letters, sound only | Lowercase |
| 9 | trier | 3 images into 2 letter boxes | Uppercase |
| 10 | trier | 3 images into 2 letter boxes | Lowercase |
| 11 | image-lettre | 5 letters | Uppercase |
| 12 | image-lettre | 6 letters | Lowercase |
| 13 | lettre-image | 4 images | Uppercase |
| 14 | lettre-image | 5 images | Lowercase |
| 15 | son-lettre | 5 letters, sound only | Uppercase |
| 16 | son-lettre | 5 letters, sound only | Lowercase |
| 17 | trier | 4 images into 3 letter boxes | Uppercase |
| 18 | trier | 4 images into 3 letter boxes | Lowercase |
| 19 | lettre-image | 6 images | Lowercase |
| 20 | son-lettre | 6 letters, sound only | Lowercase |

Levels 11–20 keep the first ten unchanged, since records are stored by level id. Each new level offers more letters, images or boxes than every original level of its mode. Three-box sorting has two images of the target family and one of each other family; its three boxes are pairwise outside the neighbour table. `tests/sons-niveaux.test.ts` checks the literal original table, distinct configurations and played fingerprints, solvability on 200 seeds per language and the per-mode progression.

`generateRound(level, seed, locale, count = 6)` is pure and uses shared Mulberry32/Fisher–Yates. Each language has twenty families, three distinct words per family. Selection happens in that language's native list; there is no question-translation step. Motif identifiers are shared only for the same represented object. All words in the question choices are reserved for the rest of the series, including unseen image-lettre/son-lettre distractor words. Sorting has two words from one family and one from the other, shuffled; the target family box is at the drawn answer position. Every image has exactly one matching box. Each question consumes fresh words; invalid/impossible counts throw. Answer positions are drawn from all allowed slots, excluding a slot only after two consecutive occurrences. No periodic position schedule.

Distractors never share the target initial and never belong to its conservative symmetric neighbour set. Sorting excludes neighbours between its two boxes. French pairs: B/P, D/T, F/V, M/N, S/Z, C/K, C/Q, K/Q, G/C, G/K, G/Q, J/G, E/I, O/U. English pairs: B/P, D/T, F/V, M/N, S/Z, C/K, C/Q, K/Q, G/C, G/K, G/Q, J/G, W/V, Y/J. Absent letters remain in the table to keep equivalent sounds explicit. French C is always hard, G always hard; English C/G also always hard. English Q always represents /kw/; Y always /j/. Neither is a vowel lesson.

### Inclusion and exclusion rules

Only concrete, drawable, familiar objects/animals or visible concepts are retained (including zero and a zoo). No silent initials, no French H/K/W/X/Y families, no initial CH, PH, OU, ON, or nasal vowel digraphs. A following N/M is excluded when it nasalizes the first vowel; nasal sounds later in a word do not affect its initial. French E uses only É /e/, I uses /i/, U uses /y/, A uses /a/; O uses ordinary oral O, with natural open/closed timbre variation. Accents normalize to the associated uppercase letter. French G words have /g/; there is no soft G ambiguity. English excludes KN, WR, PH, TH, SH, CH, silent letters, soft C/G and all vowel-initial families: no long/short-vowel inference is required. All retained English words begin with their family consonant sound. English Q words consistently start /kw/ and Y words /j/. Lexicon entries have no articles, so speech starts directly with the word.

Hand-authored synthesis text (keys are uppercase; lowercase input is accepted):

| Locale | Letter → synthesis text |
| --- | --- |
| FR | A → a; B → beu; C → keu; D → deu; E → é; F → fff; G → gueu; I → i; J → jjj; L → lll; M → mmm; N → nnn; O → o; P → peu; R → rrr; S → sss; T → teu; U → u; V → vvv; Z → zzz |
| EN | B → buh; C → kuh; D → duh; F → fff; G → guh; H → huh; J → juh; K → kuh; L → lll; M → mmm; N → nnn; P → puh; Q → kwuh; R → rrr; S → sss; T → tuh; V → vvv; W → wuh; Y → yuh; Z → zzz |

Stop consonants use a brief support vowel rather than an alphabet name. Text-to-speech pronunciation varies with the installed local voice: the orchestrator must listen to both languages on real devices, especially stops, French U/E, English Q/Y and sustained consonants. The table is speech text, not an IPA/audio guarantee. No external voices or recordings are fetched.

### Full word → drawing lists

### Français

- A: abeille → bee, arbre → tree, avion → plane.
- B: banane → banana, bateau → boat, ballon → ball.
- C: carotte → carrot, cadeau → gift, cube → cube.
- D: dé → dice, domino → domino, dauphin → dolphin.
- E: écharpe → scarf, échelle → ladder, étoile → star.
- F: fusée → rocket, fleur → flower, fourmi → ant.
- G: gâteau → cake, gomme → eraser, gorille → gorilla.
- I: île → island, igloo → igloo, iris → iris.
- J: jaguar → jaguar, jupe → skirt, journal → newspaper.
- L: lune → moon, lapin → rabbit, livre → book.
- M: moto → motorcycle, melon → melon, mouton → sheep.
- N: navire → ship, nid → nest, nuage → cloud.
- O: olive → olive, orange → orange, oreiller → pillow.
- P: pomme → apple, poisson → fish, papillon → butterfly.
- R: robe → dress, rat → rat, robot → robot.
- S: sac → bag, savon → soap, seau → bucket.
- T: tortue → turtle, tomate → tomato, toupie → top.
- U: usine → factory, ustensile → spatula, ukulélé → ukulele.
- V: vache → cow, vélo → bicycle, voiture → car.
- Z: zèbre → zebra, zéro → zero, zoo → zoo.
### English

- B: banana → banana, boat → boat, ball → ball.
- C: cat → cat, cup → cup, cow → cow.
- D: dog → dog, dice → dice, dolphin → dolphin.
- F: fish → fish, flower → flower, fork → fork.
- G: goat → goat, goose → goose, gorilla → gorilla.
- H: hat → hat, hen → hen, horse → horse.
- J: jam → jam, jug → jug, jellyfish → jellyfish.
- K: kite → kite, key → key, kangaroo → kangaroo.
- L: lion → lion, leaf → leaf, lemon → lemon.
- M: moon → moon, mouse → mouse, monkey → monkey.
- N: nest → nest, net → net, nut → nut.
- P: pineapple → pineapple, pig → pig, panda → panda.
- Q: queen → queen, quilt → quilt, quill → quill.
- R: rabbit → rabbit, rat → rat, robot → robot.
- S: sun → sun, sock → sock, seal → seal.
- T: turtle → turtle, tomato → tomato, tiger → tiger.
- V: van → van, vest → vest, vase → vase.
- W: web → web, wig → wig, wagon → wagon.
- Y: yarn → yarn, yak → yak, yoyo → yoyo.
- Z: zebra → zebra, zip → zip, zucchini → zucchini.

Round generation plans family capacities with backtracking before selecting distinct words. It preserves seeded determinism and succeeds for every feasible requested count, including rounds consuming all sixty words. Sorting spends singleton and spare third words before breaking a remaining pair.

### Screen, voice and gestures

System-font letters use 80 px type and dark AA ink on light cards/boxes. Cards and image SVG viewports measure at least 72 px; the image prompt measures 100 px. There are no printed object names, including SVG text; `aria-label`, `data-word`, `data-initial` and `data-letter` describe the pictures/letters for accessibility and independent observation. The child cannot pair a printed word with its initial. Prompts have generic short instructions and a Tutu illustration.

Image-lettre says the native word then its sound. Lettre-image starts with the target sound, then names each candidate word followed by its own initial sound; the large letter is shown. Son-lettre has no image/word cue and says only the sound and generic instruction; the ear repeats it. Trier names all images with their sounds; grabbing/selecting one repeats its word and sound. After two errors the relevant letter card or sorting box pulses (and the target letter in lettre-image); speech stretches the initial sound once before the word (for example “sss… sac”), then says the sound. This hint uses a reduced speech rate of 0.6 instead of 0.82; the actual acoustic stretching depends on the installed local voice and requires listening on the device. Errors keep the question open. A successful question locks and requires Continue, absorbing double touches. Sorting rejects repeat placements, counts first-try once on the last piece, and supports both primary-pointer dragging and selecting an image then its box with taps or keyboard. A 24 px snap allowance helps noisy fingers; wrong drops return over 260 ms unless reduced motion. Pointer cancellation/lost capture clears drags. Only the sorting area disables touch scrolling.

`window.__kid.state()` adds a detached `sons` session, current native question, game, level/index and the common target rectangles. No mutation API. Home stars read the independent sounds records. All audio uses the existing cancellable local speech and synthesized chime shell.

### Sounds test oracle (authored, not executed here)

- `tests/sons.test.ts`: literal independent ten-level, phoneme and neighbour tables; twenty families × three normalized initial words per language, unique words/motifs, explicit forbidden-initial rules, every drawing present, finite well-nested SVG with no image/network/text elements. For 300 seeds × ten levels × two languages: determinism, unique answer or box per image, target-family counts, no neighbour distractors, no repeated words, no three identical answer slots, balanced position occupancy and fewer than 5% full rotations for 3+ slots. Native object sequences differ across languages. State tests check purity, second-error hints, locking, invalid input, sorting placement and final-piece credit, exact reward boundaries, perfect/low-score completion, unlocking, best scores, i18n, native spoken order, sound-only cues, no printed words, independent storage migration/filter/roundtrip/erase.
- `tests/e2e/sons.spec.ts`: one complete series per mode in each language, DOM `data-initial`/`data-letter` oracle independently checked against the hook, exact adjacent native-word/sound utterances through shared fake local speech/WebAudio, replay, wrong answer/drop, no early hint, second-error pulse and elongated speech, three-star completion after one retried question, reload/unlock and isolation of other records. All ten levels at 320–1280 px check 72 px cards/SVGs, large letter bounds/case, AA ink/fill contrast, separated targets, detached hook and horizontal overflow. Shared fixture rejects console/page errors.
- `tests/e2e/sons-doigt.spec.ts`: all four modes on the mobile touch project, seeded ±10 px taps, 10–16-step noisy real touch drags, wrong box, cancelled pointer, double touch, complete rounds, unchanged scroll and no page overflow.
- `tests/e2e/captures.spec.ts`: adds optional `sons-image-lettre.png` and `sons-trier.png` under the existing capture gate. The orchestrator generates and visually reviews them; no browser was launched here.

### Sounds mutations to try

1. Change the sounds result hint threshold from `errors >= 2` to `errors >= 3`: unit and browser second-error assertions must fail.
2. Remove the sounds neighbour check when choosing distractor families: seeded independent exclusion assertions must fail.
3. Replace `Math.max` in sounds `complete` with the current score: the best-record unit assertion must fail.

The correction oracles cover the eight additional review mutations (authored here; execution belongs to the test runner):

1. Truncate a valid count to six: short/long/full round length and distinct-word checks, over 300 seeds in each language and level.
2. Assign the cat word to an axe: literal native word-to-motif tables, plus the cat silhouette signature.
3. Empty the ladder path: nonempty geometry checks and the literal two-rail/four-rung signature.
4. Give boxes the same fill as their ink: contrast measured from computed ink and the actual opaque ancestor background.
5. Disable hint animation: computed animation name, duration, iteration count and real keyframes, with reduced-motion coverage.
6. Remove the entry announcement: speech asserted immediately after level entry, before touching the ear.
7. Disable box activation: full sorting questions via image selection then box, using taps/clicks and keyboard activation.
8. Remove the outside capture allowance: a drop 18 px outside succeeds; one 26 px outside leaves the question unchanged.


## Puzzle: Pestouille’s puzzle (0.5.0)

Pure `newPuzzle(level, seed)` uses shared Mulberry32 and Fisher–Yates. Scene selection, shared edges and shuffled reserve slots are seeded. The 320×550 stage contains a 300×240 board at (10,8) and a reserve starting at y=280. All positions describe centres in stage units. Uniform CSS scaling keeps piece geometry and pointer coordinates consistent. At 390×844 the board measures 300 px across; the stage and controls fit without scrolling. At 320 px the stage uses the full window width, preserving a 300 px board and pieces at least 64 px through nine pieces and 56 px for twelve. No rotation at any level.

| Level | Pieces | Columns × rows | Initial model | Edges |
| --- | --- | --- | --- | --- |
| 1 | 2 | 2 × 1 halves | Faint model | Straight |
| 2 | 3 | 3 × 1 | Faint model | Straight |
| 3 | 4 | 2 × 2 | Eye button | Straight |
| 4 | 6 | 3 × 2 | Eye button | Straight |
| 5 | 6 | 3 × 2 | Eye button, no automatic model | Straight |
| 6 | 9 | 3 × 3 | Eye button | Straight |
| 7 | 12 | 4 × 3 | Eye button | Straight |
| 8 | 9 | 3 × 3 | Eye button | Wavy, complementary tabs and sockets |
| 9 | 9 | 3 × 3 | No eye button | Wavy |
| 10 | 12 | 4 × 3 | No eye button | Straight |
| 11 | 16 | 4 × 4 | Eye button | Straight |
| 12 | 16 | 4 × 4 | No eye button | Straight |
| 13 | 20 | 5 × 4 | Eye button | Straight |
| 14 | 20 | 5 × 4 | No eye button | Straight |
| 15 | 24 | 6 × 4 | Eye button | Straight |
| 16 | 24 | 6 × 4 | No eye button | Straight |

Since the doubling to sixteen levels, each new size comes first with the eye button, then without it (`eye: false`: no model before the end, and the instruction adds “Sans modèle cette fois !” / “No picture this time!”; only the 25-second hint remains, so stars still count aids). Twenty-four pieces of 50 × 60 stage px are the most the 320 × 270 reserve holds without overlap at a 1:1 stage, and curved edges stay on three columns: a fourth column of tabs no longer fits a reserve row. Levels 4 and 5 were already identical before the doubling; they keep their ids and records, and `tests/puzzle-niveaux.test.ts` tolerates that pair only. That test keeps a literal copy of levels 1–8, rejects any other duplicate configuration or play fingerprint, checks 200 seeds per new level (exact tiling, homes in the board, reserve inside the stage without overlap, complementary edges, pieces ≥ 44 px, full rebuild through `drop`) and the progression. Records accept levels 1–16.

Level five consolidates six pieces without an automatic model; rotation remains disabled throughout. Twelve scenes are drawn by the seeded selection, uniformly. Six vector SVG scenes depict Pestouille above a castle, Boubou in bamboo, Lumi under a rainbow, Tutu in the jungle, CaliRoux among autumn leaves and a picnic with Boubou and Pestouille; they contain no image and no reference. Since 1.3.0, six painted scenes are cut from the author’s Pistouille horizons, each a 5:4 window away from the framing tree and banners: Boubou in the zen garden, CaliRoux in the Ardennes forest, Pestouille at the fiery volcano, Tutu on the tropical islands, Lumi in the starry galaxy, and CaliRoux with Tutu in the spring valley. A painted scene is one bundled, hashed, same-origin WebP (600×480, or 450×360 for the forest and valley whose source band is only 363 px high; 35–56 kB each) laid over a flat vector fallback, with the guide drawn as SVG on top, exactly as in the vector scenes. The WebP is fetched only when a puzzle shows that scene, never by the home or level screens; until it arrives, and offline before a first visit, the fallback is what the child sees, and the puzzle plays identically. The painted files stay out of the 400 kB gzip precache: the service worker keeps them at runtime in its own cache (`opencadkid-scenes`, cache first, 12 entries), so a scene shown once plays offline afterwards. The image is clipped by each piece’s generated SVG path. Inner edges share canonical cubic points, traversed in reverse by the neighbour, so the exact same curve makes a tab and socket. Outside edges are straight. The classic outline has five cubics per inner edge, a narrow neck and a rounded head with 6-pixel depth. SVG viewports and bounds include actual curve extents and the full 1.5-pixel outline, rather than symmetric curve padding. For the classic level, pieces shuffle within original row groups, and the groups also shuffle; their asymmetric extents fit the reserve without overlap. Straight levels retain shuffled grid slots. No piece starts on its home.

`drop` snaps at a strictly radial distance <32 stage pixels and locks the piece; otherwise it preserves the release point, bounded so the painted piece remains within the stage. Locked pieces reject further drops. Primary pointer capture preserves the grab offset, raises the held piece and ignores a second finger. Touch action is disabled only inside the play zone. Cancellation releases ownership and bounds the last visible position. Each piece remains focusable; arrows move it by 16 stage pixels and Enter drops it. Placement plays the shared soft chime; completion celebrates with Pestouille and animates the board except with reduced motion.

The UI supplies elapsed active time to `hint`: at 25,000 ms without a placement, the first unplaced piece and its home pulse. No displayed timer or penalty. Missed drops and model toggles do not restart the idle period. A placement restarts it; hiding the document pauses it and stops speech/audio. A hint already active is not charged twice. The introductory models are free; revealing the model later counts one aid per reveal. Three stars for zero aids, two for one, otherwise one; never zero. This differs from the common question-based star thresholds because a puzzle has no answers to count. Unlocking reuses the common function; completion follows its max-score record convention without changing other engines. Optional `puzzleRecords` migrates to an empty object, filters levels 1–16 and integer scores 1–3, persists independently and clears with all progress.

`window.__kid.state().puzzle` exposes a detached state, the stage rectangle (`zone`) and board screen rectangle (`boardScreen`). DOM pieces carry `data-piece`, `data-home-x`, `data-home-y` and `data-placed`. E2E solves from these DOM attributes and measured stage bounds; the hook only checks agreement and progress.

### Puzzle test oracle (authored without running tests or browsers)

- `tests/puzzle.test.ts`: independent eight-level table, 300 seeds per level, deterministic puzzle equality; exact base rectangle area, image containment and pairwise nonintersection; full reserve extents, pairwise nonoverlap and distance from homes; canonical inner curves in reverse and straight outer edges. State cases cover strict snap−1/snap/snap+1 and diagonal distances, bounds, purity, invalid input, locking, all-level completion, exact 25-second hints, assistance rewards, best scores and unlocking. Twelve distinct finite SVG scenes (six without any image or reference, six with exactly one local WebP between the fallback and the guide), distinct bilingual labels, WebP headers, 5:4 dimensions and 25–60 kB sizes, seeded selection reaching every scene with its picture in each piece and the model, and save migration/filtering/round trips are checked. `scripts/check-precache.js` requires six built WebP files, none precached, each ≤ 60 kB, and the runtime route in the generated worker.
- `tests/e2e/puzzle.spec.ts`: levels 1, 4 and 8 finish by independent DOM-guided dragging, including a missed drop that stays put and an out-of-zone bounded drop. Shared speech and AudioContext doubles check replay, placement-only chimes and disabled media. Reload preserves stars and unlocks. `page.clock` verifies no hint before 25 seconds and a hint after, despite a missed drop. English, model assistance, keyboard steps, locked pieces, XML parsing, actual painted piece dimensions and target sizes, and zero page overflow at widths 320–1280 are covered. Shared fixture rejects console and page errors. Optional mobile captures write `puzzle-debut.png` and `puzzle-fini.png`.
- `tests/e2e/puzzle-peint.spec.ts`: each painted scene, forced through the app’s single seed, fetches its own WebP (HTTP 200, same origin, decodable at 5:4), paints it in every piece, and finishes with three stars at 390×844. With the WebP held back, the vector fallback is playable to the end, and the board changes once the picture arrives. A scene shown once is in the runtime cache and plays offline after a reload. The home and level screens fetch no WebP.
- `tests/e2e/puzzle-doigt.spec.ts`: mobile levels 7 and 8, twelve-piece and wavy boards; ±8 px grab offsets, 12–20 steps with ±6 px noise, each rendered position follows the original grab point, final centre within snap−8, a missed drop then retry, simultaneous second finger ignored and unchanged page scroll throughout.

### Puzzle mutations to try

1. Change `distance < state.snap` to `distance <= state.snap`: the exact-boundary unit assertion must fail.
2. Remove the `piece.placed` guard from `drop`: locked-piece unit and keyboard assertions must fail.
3. Remove a neighbour’s `reverse: true`: shared-edge reversal checks must fail and visual seams should appear.

The orchestrator must run the unit and browser suites, generate both captures, review illustration continuity and curved seams, check mobile grab-offset tracking and second-finger ownership, and confirm real painted sizes, no scrolling, media behavior and persistence. No screenshots were generated during authoring.

### Touch regression and puzzle review coverage

All four drag games share `src/shell/coordinates.ts`: viewport-to-zone conversion, rectangular drop distance and grab-offset-preserving movement. Counting tests the destination rectangle directly, so a decorative or captured element cannot hide the basket from a hit test. `tests/coordinates.test.ts` covers shifted and scaled stages, exact edges and the 24-pixel distance. `tests/activation.test.ts` checks validation and six sorting questions without any compatibility click, then delivers that click late and checks exactly one activation; cancellation, movement, mouse and keyboard remain covered. Mobile sorting E2E checks all three placements, `solved` before Continue and actual progress after every arrow.

Earlier corrections committed Check and Continue on release. The current regression shows why every command, including Next after completion, must also reject the resulting compatibility click. The touch activation contract below records this behavior and its event-sequence coverage; the next browser run can inspect the activation history at each gesture.

Puzzle review oracles added without running them:

- `tests/puzzle.test.ts` parses rendered paths independently: curved-command counts reject rectangular paths, sampled depth rejects tiny waves, and a head/neck width comparison rejects a colless wave. Reserve containment and nonintersection now use the rendered paths, including asymmetric tabs. Exact scene character SVGs reject wrong subjects, and the final guide must render both the celebration expression and pose for both motion preferences.
- `tests/e2e/puzzle.spec.ts` checks a new full idle interval after placement, all three gesture interruptions (cancel, lost capture, document hiding), retained visible position and a subsequent usable gesture. Hit-testing while crossing another piece rejects a held piece below its neighbour. A rendering-turn observer captures and pauses the final 700-ms board animation, requiring it with full motion and forbidding it with reduced motion.
- `tests/e2e/paires.spec.ts` captures closing transitions in the mutation-observer turn and pauses them immediately. Slow protocol calls cannot consume the 240-ms transition before inspection; reduced motion still requires no animation and the final closed transform.

These cover the eight proposed puzzle mutation behaviours; mutation executions remain for the external test environment.


## Chemin: Pestouille’s path

Eight pure seeded perfect mazes use shared Mulberry32 and randomized depth-first carving. The first two trees start with a straight left-to-right corridor; random branches attach without cycles. Later trees first carve a U-shaped route from a seeded choice of top or bottom left corner to the corresponding right corner. Its seeded depth guarantees the minimum length before random branches attach, without retries. Length counts **cells including both endpoints**, not edges. From level four the minimum is at least 1.5 times the width; an independent table checks every bound over 300 seeds per level.

| Level | Columns × rows | Solution length in cells | Optional stars |
| --- | --- | --- | --- |
| 1 | 3 × 3 | 3–3 | 0 |
| 2 | 4 × 3 | 4–4 | 0 |
| 3 | 5 × 4 | 7–20 | 0 |
| 4 | 6 × 4 | 9–24 | 2 |
| 5 | 7 × 5 | 11–35 | 2 |
| 6 | 7 × 6 | 11–42 | 3 |
| 7 | 8 × 6 | 12–48 | 3 |
| 8 | 9 × 7 | 14–63 | 3 |
| 9 | 9 × 7 serpentine, 3 sweeps | 27 | 3 |
| 10 | 9 × 8 serpentine, 3 sweeps | 30 | 4 |
| 11 | 9 × 7 serpentine, 4 sweeps | 33 | 4, up to 3 edges off the route |
| 12 | 9 × 8 serpentine, 4 sweeps | 37 | 4, up to 3 edges off |
| 13 | 9 × 7 serpentine, 5 sweeps, no bulb | 39 | 5, up to 3 edges off |
| 14 | 9 × 8 serpentine, 5 sweeps, no bulb | 44 | 5, up to 4 edges off |
| 15 | 9 × 7 serpentine, 6 sweeps, no bulb | 45 | 5, up to 4 edges off |
| 16 | 9 × 8 serpentine, 6 sweeps, no bulb | 51 | 6, up to 4 edges off |

Since the doubling to sixteen levels, levels 9–16 replace the U with a serpentine: a seeded set of `sweeps` columns is crossed from border to border, the route running east along the current border row between them, so its length is exactly columns + sweeps × (rows − 1) and always longer than any level-8 route. An odd number of sweeps puts the goal on the far row. Optional stars may hide up to `reach` edges from the route (2 when absent). From level 13 `help: false` removes the bulb and the instruction adds “Sans ampoule cette fois !” / “No bulb this time!”. Nine columns keep 40 px cells at 390 px, and eight rows for nine columns still fit 844 px without scrolling up to 1280 px wide. `tests/chemin-niveaux.test.ts` keeps a literal copy of levels 1–8, rejects duplicate configurations and play fingerprints, solves 200 seeds per new level (perfect tree, independent BFS route within bounds, every star reachable before the goal and collected through `extend`) and checks the progression. Records and medals accept levels 1–16.

`newMaze(level, seed)` returns reciprocal N/E/S/W openings, start, goal, solution, trace, bonuses and collected bonuses. Every tree has exactly cells − 1 passages. Optional stars lie on the solution or at dead ends at most two edges from it, with a junction strictly before the goal. Collection survives backtracking and is never mandatory. `extend` accepts only an adjacent open step; stepping to the previous cell shortens the trace. Invalid steps and walls preserve the original state. Completion locks the trace at the goal. `fromPoint(state, x, y)` uses cell units and snaps an outer quarter-cell margin inward, inclusively. Nonfinite or more distant points are rejected.

`segmentCells` traverses every crossed grid boundary in order; exact corner ties cross X before Y. `interpolate` applies those steps until the first wall, preventing fast diagonal wall cutting. A finite endpoint outside the board clips the original segment at its first border intersection, preserving its slope and applying all crossed cells up to the border, goal or first wall. The UI uses the existing shared `screenToZone` conversion. One primary pointer owns capture on the stable app element, while only the maze has `touch-action: none`. Pointer cancellation or backgrounding frees the gesture and retains the drawing. Grabbing any previously traced cell resumes from that prefix on the first valid movement; simply touching or hitting a wall erases nothing. Rejected motion anchors at the head centre so a later event cannot jump across a wall. Keyboard arrows move one cell from the head.

The SVG draws contrast walls, a wide coloured trace and Pestouille at its head. Nest, bamboo and rainbow destinations alternate by level. Cells are square and at least 40 real CSS pixels at 390×844, including 9×7; narrower screens scale uniformly without overflow. Header buttons measure 64 px. Since 1.4.0 a start sign stands outside the board, in a 64 px strip as wide as the board, on the border next to the start square: above it when the first step goes down, below when it goes up, and for a first step to the right (levels one and two) above or below by the start row. `firstStep(state)` reads the direction from the solution's first two cells; the author’s painted signpost points right, is mirrored for west and turned a quarter for south or north. It covers no cell and neither guide, and ignores pointers. The painting is one bundled, hashed, same-origin WebP (189×300, 17 kB, with transparency) applied as a CSS background over a drawn fallback inset inside the painting’s opaque silhouette, so a pending or failed image leaves the fallback visible and a loaded one covers it entirely. It is fetched only when a maze opens, stays out of the precache, and the service worker keeps it in `opencadkid-scenes` with the puzzle scenes. The bulb is always available and toggles a dotted route of the next three cells from the head, including retreat from dead ends; it never changes the reward. Every finish earns three stars. A medal additionally requires at least one bonus and all bonuses collected. Independent `cheminRecords` stores the maximum stars and `cheminMedals` preserves earned medals. Invalid records are filtered; old saves migrate, and erase clears both. Completion unlocks the next level. Level sixteen has no next control.

Each SVG cell exposes `data-cell`, `data-open`, `data-head`, and endpoint markers; bonuses expose their collected status. `window.__kid.state().chemin` contains a detached grid, trace and solution snapshot, with no mutation function. Browser solvers read openings and SVG endpoint markers only, independently reconstructing the route before comparing with the hook.

### Chemin validation and review

Tests authored without executing Vitest, Playwright or a browser:

- `tests/chemin.test.ts` (start sign): `firstStep` against an independent solution oracle over 300 seeds per level, side and turn per direction including a synthetic west start, exactly one painting reference and none in the board or level screen, fallback before painting, and the WebP header, alpha flag, 189×300 size and 8–30 kB budget.
- `tests/chemin.test.ts`: independent eight-level table, 300 seeds each, deterministic reciprocal in-bounds openings, exact tree edge count, connected BFS and independent simple-path enumeration, opposite borders and solution lengths; bonus placement; pure advance/retreat/rejection; five-cell fast diagonal and wall stop; quarter-cell tolerance; persistent optional collection; constant three-star completion, medal and best-score/unlock; three-cell help from a dead end; bilingual UI, DOM oracle, SVG structure and save migration/filtering/roundtrip/erase. Render assertions compare every painted wall with closed edges, the trace points and character translation after advance/retreat, the visible dashed help points including a dead-end retreat, and the actual nest/bamboo/rainbow drawings. Fast-exit cases cover all four borders, an oblique exit, first-wall stopping and nonfinite rejection.
- `tests/e2e/chemin.spec.ts`: DOM-only BFS solves levels 1, 4 and 8 through simulated touch, checks wall stops, retreat, help, detached hook, local speech and synthesized sound, reload/unlock and isolation. English keyboard completion and media disabled; all eight levels measure real cell squares, wall strokes, 64 px controls, valid SVG and no page overflow at widths 320–1280. Cancellation retains progress. Dedicated cases reject a non-primary pointer, cancel a held gesture on visibilitychange, verify fresh primary gestures still work, and finish a fast gesture beyond the board. Optional mobile captures: `chemin-debut.png`, `chemin-fini.png`.
- `tests/e2e/chemin-panneau.spec.ts`: every level, top and other start rows at 390×844: the sign's direction equals the DOM route's first step, the sign overlaps no cell and no guide, touches the board border on the start's column and stays in the viewport; the WebP is fetched only by a maze (never home or the level list) and decodes at 189×300; the drawn fallback shows while it is held, then the painting changes the picture; once seen it is served offline.
- `tests/e2e/chemin-doigt.spec.ts`: mobile real touch protocol, seeded ±6 px offsets, irregular steps and collinear two-cell skips, a deliberate wall, finger lift/restart at the head, DOM-derived route completion and unchanged page scroll. Shared media doubles and console guard are reused.

Mutations to try: (1) remove the open-passage guard in `extend`: wall/state and browser wall tests must fail; (2) remove the previous-cell shortening branch: retreat tests must fail; (3) apply only the last cell in `interpolate`: the five-cell diagonal and fast-finger tests must fail.

The orchestrator must run unit and browser suites, inspect start/finish captures for clear walls, destinations, trace, bonus and medal visibility, and verify noisy touch, restart after lifting, keyboard focus, silent mode, persisted progress, 40 px cells at 390×844 and no overflow. Only the generic registry list and home game-count expectations change outside new tests; other games’ tests and rules remain unchanged.

### Touch activation contract

A primary touch commits on release inside its original target bounds, provided it
has moved less than 12 CSS pixels. Each distinct touch on a distinct target acts
exactly once, even when Continue follows an answer immediately or 205 ms later.
A second touch on the same logical target within 350 ms of its last accepted tap
is a double tap and acts only once. Target identity includes the game, question
and control, and survives replacement of that control during rendering. Sorting
box keys also include the selected image/piece, read at pointerdown (selection
need not render). Selecting A → box X → selecting B → box X therefore commits
two placements even at 0, 50, 120 or 300 ms; box X twice with the same selection
within 350 ms commits once. The key is frozen for the duration of the gesture.
Counting filling keys include question, reserve/basket and token index; distinct
tokens act immediately, while a duplicate on the same token is merged. Memory
card keys include the turn, so the same card can reopen in the next turn.
Puzzle pieces and path traces use their primary-pointer drag controllers: piece
identity/position and trace/head define each move, with no tap debounce on drags.
The next question has independent targets. There is no global suppression interval.

The failed final counting snapshot asks for nine flowers although level four is
limited to five: it has already entered level five. Likewise the failed shapes
snapshots show the next levels' four choices, two size choices, and two sorting
boxes. A delayed Continue click could reach the newly rendered Next control,
which formerly used an unfiltered click handler. All command buttons now use the
same touch-aware activation binding, including Next. Literal event-sequence unit
tests deliver that retargeted click at 0, 205 and 300 ms, then require a fresh
primary touch on Next to advance exactly once.

A browser compatibility click delivered 0–300 ms after a touch does not activate
that touch again, including when rendering replaced its target. Keyboard clicks
remain available, and a new mouse pointer starts an independent click. Secondary
pointers cannot take ownership. A cancelled or moved command touch does not
activate; a completed drag does not suppress a following tap. Counting applies
its double-tap guard per token target, and only taps start that guard.

`window.__kid.events()` returns a detached, read-only observation of the last 200
activation decisions: logical target, input type, milliseconds relative to page
initialization, accepted/ignored and reason. It cannot change game state. Finger
specs check question/state progress at the gesture that should cause it; failed
assertions and the failure attachment include this history. Touch protocol moves
are checked after their rendering turn, retaining exact position, trace and
scroll assertions.

Maze updates preserve connected cell nodes while replacing only drawing layers.
Each cell uses an integer CSS pixel scale so measured width and height agree at
all supported widths. Puzzle pieces have no button press transform or transition:
the original grab point follows the finger directly; paper styling remains on
other controls. Memory faces use a single 240 ms transform transition in both
directions. The closing test controls application timers with `page.clock` and
pauses CSS animations in the mutation turn which creates them, then checks their
midpoint and final transform. Reduced motion still requires an immediate closing
transform and no animation. The media fixture installs once per document even
when preparation is called repeatedly in a viewport/level matrix.

These regression suites are authored for the external runner; no test runner or
browser was executed during this correction.


## Patterns: Lumi’s patterns (0.8.0)

Pure `src/engines/suites/` uses the common seeded Mulberry32 RNG. `generateRound(level, seed, count = 6)` returns reproducible questions. Every periodic question is checked against all compatible base motifs of periods 1–4, including nonprimitive motifs; exactly one offered item fits each missing position. The engine enumerates periods and their residue assignments; the unit and browser oracles separately enumerate concrete base motifs. Growing questions use the explicit rule of one additional dot, rather than a periodic oracle.

| Level | Mode | Base motif | Choices |
| --- | --- | --- | --- |
| 1 | suivant | AB | 3 |
| 2 | suivant | AAB | 3 |
| 3 | suivant | ABB | 4 |
| 4 | suivant | ABC | 4 |
| 5 | suivant | AABB | 4 |
| 6 | suivant | ABCD | 4 |
| 7 | trou | ABC | 4 |
| 8 | trou | AABB | 4 |
| 9 | deux-suivants | ABC | 4 |
| 10 | croissant | 1, 2, 3, 4… or 2, 3, 4, 5… dots | 4 |
| 11 | suivant | AABC | 4 |
| 12 | suivant | ABAC | 4 |
| 13 | decroissant | 8, 7, 6, 5… or 7, 6, 5, 4… dots | 4 |
| 14 | trou | ABCD | 4 |
| 15 | trou | AABC | 4 |
| 16 | deux-suivants | AABB | 4 |
| 17 | deux-suivants | AABC | 4 |
| 18 | trou, two holes | ABCD | 4 |
| 19 | trou, two holes | AABC | 5 |
| 20 | deux-suivants | ABCD | 5 |

Levels 11–20 keep the first ten unchanged, since records are stored by level id. Every new periodic level uses a four-symbol motif. The shrinking count removes one dot per step; its distractors stay on both sides of the answer (one more, one and two fewer, never zero). Two-hole questions place two distinct interior holes among positions 4–7, filled from left to right; whenever a later answer is a wrong rank of the first, it is moved among the kept ranks so that every answer is offered. Five choices use a three-column palette. The answers to find per question, then the choices, never decrease from level 11 to level 20. `tests/suites-niveaux.test.ts` checks the literal original table, distinct configurations and played fingerprints, a left-to-right solver on 200 seeds and this progression.

Next-item questions show at least two complete repetitions (8–11 visible objects), with a seeded variable stopping rank across every residue of the motif; middle gaps have 12 positions with one interior hole. Two-item continuation extends a visible motif in order, letting the child build its continuation by tap or drag. The same choice palette remains available for the second item. Each symbol has a distinct silhouette: bead, triangle, square, flower, star or moon. Colours may be shared or paired with different shapes; colour alone never distinguishes symbols. Growing objects differ by their visible dot pattern and share a colour. Distractors prioritize wrong ranks and always include an outside motif. Where a two-symbol motif has four choices, two outside objects fill the palette; ABCD selects two wrong ranks and one outside object. Growing distractors include both smaller and larger quantities than the next count, so choosing the largest cannot solve the question. Correct first-choice positions are randomly drawn, excluding a third consecutive identical position.

The common six-question reward table applies, with one first-try credit only after all slots are filled without errors. Success locks answers; a separate Continue arrow advances. No error removes progress, and every completion unlocks the next level. `suitesRecords` stores independent maximum stars for levels 1–20, migrates safely from old saves, filters invalid entries and clears with common progress erasure. No next-level control appears at level twenty.

Lumi asks “Qu’est-ce qui vient après ?” / “What comes next?”, with separate spoken hole and two-item instructions. At the second error, the first base motif is outlined and spoken twice (shape and colour names, or dot quantities); the ear repeats this hint while active. A partial correct placement keeps a previously activated hint. Speech and synthesized chimes use the common media shell and respect saved settings and background cancellation.

The shared header, guide and progress dots frame a discreet pale rainbow. A dashed empty slot pulses unless reduced motion is requested. Each sequence slot has a 56×56 px SVG viewport framing a drawing at least 48 px wide and high including its stroke; choices are 88×88 px with 68×68 px illustrations. Six slots fit a row on 390×844; every question fits at most two rows and the whole play screen fits without scrolling. Narrower widths wrap freely. `data-item`, `data-color`, `data-shape`, `data-dots`, `data-slot` and `data-missing` describe rendered objects; blank slots expose no answer. `window.__kid.state().suites` is a detached read-only observation, and `events()` journals activations. Touch uses shared activation debouncing; dragging uses shared viewport coordinates and the inclusive 24 px drop allowance. One primary pointer owns capture; cancel/lost capture discard a pending drop. Keyboard Enter/Space selects the next item.

### Patterns verification authored for the orchestrator

- `tests/suites.test.ts`: independent ten-level table, determinism and exhaustive period-1–4 continuation oracle for 300 seeds per level; visible repetitions, interior holes, distractors, no colour-only distinctions, position distribution, no triples or mechanical rotations. Pure state transitions, two-error hint, ordered placement, duplicate credit rejection, all reward boundaries, low-score unlocking, best-score preservation, storage migration/filtering/clearing, exact bilingual object vocabulary, descriptive attribute consistency, persistent partial-placement hints and valid finite SVG. Independent 300-seed oracles require every next-item rank to occur at least 15% of the time and growing distractors on both sides of the answer (the answer is largest at most 40% of the time).
- `tests/e2e/suites.spec.ts`: complete sessions for all four modes, DOM-only answer oracle, mocked local speech and AudioContext, two-error hints, detached observations, exact stars, saved progress after reload, English keyboard play, silent settings and final-level controls. All levels measure actual targets, illustration viewports, painted geometry including strokes (at least 48 px on both axes), SVG validity, phone row counts and overflow across widths 320–1280. Separate checks cover normal breathing animation, its suppression with reduced motion and base-hint persistence after partial placement. The shared fixture rejects console/page errors. Optional mobile captures are `suites-question.png` and `suites-trou.png`.
- `tests/e2e/suites-doigt.spec.ts`: four mobile sessions with deterministic ±10 px finger noise, accidental double taps, cancelled, outside-target and lost-capture drags, fourteen-step noisy ordered drops and measured grab-offset tracking within one viewport pixel; no page scrolling. Shared fixture attaches `events()` history on failure.

### Patterns mutations to try

1. Change the hint threshold in `answer` from `errors >= 2` to `errors >= 3`: the unit and browser two-error checks must fail.
2. Change the correct item to the following rank while retaining the shown sequence: the independent exhaustive motif oracle must fail.
3. Credit first-try on each partial placement instead of only full success: the ordered-placement and exact reward checks must fail.

No unit test runner, browser or E2E runner was launched while authoring these changes. The orchestrator must execute them, generate both optional captures, inspect the pale rainbow and empty-slot pulse (including reduced motion), and verify finger ergonomics on a real phone.

Sorting regression coverage uses synthetic performance timestamps in Vitest,
without sleeping, and mobile touch sequences for both sounds and shapes. Each
observed touch polls `window.__kid` for selection or placement; a separate burst
sends all four touches without intervening waits or assertions. Noisy finger
specs use state polling after release rather than fixed machine-speed delays.

## Sorting: CaliRoux’s tidy-up (0.9.0)

`ranger` is the eighth playable game. CaliRoux uses the existing `pandaroux` character identifier. A pale bedroom stays at the edges. The pure engine owns a catalogue of 180 distinct object variants: thirty everyday drawings, three colours and two sizes, with simplified shape, disjoint category and FR/EN names. Apples and pears are fruit; balls, blocks and jigsaws are toys; jumpers and socks are clothes; cats and dogs are animals; plates, spatulas and napkins are kitchen tools. No borderline food classification is used. Colours on toy animals are illustrative.

| Level | Rule | Bins | Objects per question |
| --- | --- | --- | --- |
| 1 | Colour | Two drawn colours | 4 |
| 2 | Simplified shape | Two of round, square, long | 4 |
| 3 | Size | Small, large | 4 |
| 4 | Category | Two of fruit, toys, clothes, animals, kitchen tools | 4 |
| 5 | Colour | Three drawn colours | 6 |
| 6 | Category | Three categories | 6 |
| 7 | Two criteria | Yes / no for the illustrated category AND colour | 4 |
| 8 | Find the odd one out | Touch the unique object outside the shown category | 4 |
| 9 | Find the odd one out | Touch the unique object outside the shown category | 5 |
| 10 | Simplified shape | Round, square, long | 6 |
| 11 | Size | Small, large | 6 |
| 12 | Two criteria | Yes / no for the illustrated category AND colour | 6 |
| 13 | Category, colour lure | Two categories | 6 |
| 14 | Category, colour lure | Three categories | 6 |
| 15 | Simplified shape, colour lure | Round, square, long | 6 |
| 16 | Find the odd one out, colour lure | Touch the unique object outside the shown category | 6 |

Levels 9–16 keep the first eight unchanged, since records are stored by level id. They add objects (five or six per question), all three shapes at once, and a colour lure on the last four: instead of one shared colour, a drawn palette rotates so that every bin holds at least two colours and every colour spans at least two bins; in the mixed odd-one-out, the family shows two colours or more and the intruder wears one of them. Six-object two-criteria rounds keep the four combinations and add two free objects. Objects to examine, then the lure, never decrease from level 9 to level 16. `tests/ranger-niveaux.test.ts` checks the literal original table, distinct configurations and played fingerprints, solvability and the lure on 200 seeds, and this progression.

`generateRound(level, seed, count = 4)` returns a reproducible series with the shared Mulberry32 RNG. The shell uses six questions for the common first-try reward table. Rule parameters, object identities, presentation order and bin order are drawn. Every presented object belongs to exactly one bin; every bin is occupied. Non-colour sorting uses a shared colour across bins. Two-criterion rounds include all four combinations of matching/nonmatching colour and matching/nonmatching category, so neither criterion alone suffices. In odd-one-out rounds three objects share a category, one differs, and all share a colour. The engine validates unique membership and occupied bins before returning a question; the tests reproduce the predicate independently.

`place(state, objectId, bin)` is pure. Success adds the identifier once; an error leaves it in reserve and increments total and per-object errors. Two misses on that same object pulse its correct bin and repeat the whole spoken rule. For the odd one out, the unique intruder pulses. Invalid identifiers, invalid bins, already placed objects and solved questions cannot alter state. No negative sound is played. Wrong drags animate back in 260 ms; reduced motion returns immediately. Only Continue advances. The common six-question star boundaries apply: 0–2 clean questions give one star, 3–4 give two, 5–6 give three. Completion always unlocks the next level and preserves best stars in independent `rangerRecords`; missing records migrate safely and parental erasure clears them.

Objects have 88 px targets and 64/80 px SVG viewports; actual painted longest extent is at least 56 px. Small and large drawings keep visibly different dimensions. Bins are at least 96 px wide and high, each with a colour patch, shape silhouette, small/large disc, category drawing or yes/no icon. The instruction combines spoken FR/EN text and the same pictograms. Touch an object then a bin, or drag it. The shared `activation.ts` owns deduplication and event history; `coordinates.ts` owns drag conversion, nearest-zone distance and inclusive 24 px snapping. Every bin activation key includes the selected object, so two distinct objects can reach the same bin at zero elapsed time. Pattern keys already include their selected choice, allowing A then B immediately while suppressing a repeated A; sound and shape sorting retain their existing selection-aware keys. One primary pointer owns a gesture; cancellation, lost capture, backgrounding and navigation dispose it. Compatibility clicks cannot place twice. Keyboard activation selects objects and then bins without scrolling.

The DOM exposes `data-object`, `data-color`, `data-shape`, `data-size`, `data-category`, `data-bin`, `data-rule`, `data-rule-color` and `data-rule-category`. `window.__kid.state().ranger` is a detached snapshot; `events()` remains the shared read-only activation history. Neither exposes mutation.

### Sorting validation authored for the orchestrator

- `tests/ranger.test.ts`: catalogue integrity, independent literal eight-level table and 300 seeds per level; deterministic four-question series, unique identities, exactly one bin per object, nonempty bins, shared colours across bins, both criteria necessary, and exactly one intruder. Pure-state tests cover return, per-object hints, immutable inputs, invalid/duplicate/solved guards, full six-question completion, all reward boundaries, unlocking and best-score preservation. Bilingual rules, SVG well-formedness and finite coordinates, attribute rendering and isolated save migration/filtering/erasure are checked. Fake performance time stays at zero for A → first pattern slot → B → second pattern slot and for two objects entering the same sorting bin.
- `tests/e2e/ranger.spec.ts`: one full session at each level using only DOM attributes as the answer oracle, rule voice and replay with fake speech/WebAudio, gentle errors without oscillators, two-error hint, completion and persisted unlocks after reload, English names, disabled audio, detached snapshots and zero console errors. Across 320, 360, 390, 414, 768 and 1280 px, all levels measure actual SVG paint via geometry and screen transforms, targets, viewport containment and page overflow. Optional mobile captures write `ranger-couleur.png` and `ranger-categorie.png` under `docs/captures/` when `CAPTURES=1`.
- `tests/e2e/ranger-doigt.spec.ts`: full sessions for all eight levels with seeded noisy real touch, fourteen-step noisy drags with painted displacement checks, cancellation and outside drops, soft return, release 18 px below the correct bin, two distinct objects in one bin without waits, exact single-placement increments, unchanged page scroll and no overflow. The shared fixture attaches `events()` on failure.

No Vitest, Playwright or browser is run during authoring. Screenshots are generated and visually reviewed by the orchestrator.

### Sorting mutations to try

1. Replace the two-criterion AND with OR in `belongs`: the independent seeded membership tests and DOM browser oracle must fail.
2. Change the per-object hint threshold from two to three: the state and two-error browser tests must fail.
3. Remove the selected object from `placementKey`: the zero-delay same-bin test and rapid mobile pair must fail.


## Rhythm: Tutu’s drums (0.10.0)

`tambours` is the ninth playable game. Tutu uses the existing `singe` character identifier. A pale jungle stays at the edges. Four, five then six shaded drums have separate shapes (circle, triangle, square, star, diamond, heart), colours and notes. Notes are C4, D4, E4, G4, A4 and C5 (261.63, 293.66, 329.63, 392, 440, 523.25 Hz): a pentatonic scale with its octave. Recognition never depends on colour alone.

| Level | Mode | Drums | Initial/minimum length | Maximum length |
| --- | --- | --- | --- | --- |
| 1 | repeter | 4 | 2 | 3 |
| 2 | repeter | 4 | 2 | 4 |
| 3 | repeter | 5 | 3 | 5 |
| 4 | repeter | 6 | 3 | 6 |
| 5 | rythme | 4 | 3 | 3 |
| 6 | rythme | 5 | 4 | 4 |
| 7 | rythme | 6 | 6 | 6 |
| 8 | libre | 6 | 8 | 8 |

The pure engine uses shared Mulberry32; it never reads a clock. `generateRound(level, seed, count = 5)` produces distinct sequences, with deterministic prefixes even when count changes. Count must be an integer 1–16. Repetition and generated composition examples forbid three identical drums in succession; rhythm intentionally uses one drum throughout, with identity determined by that drum and its interval pattern. User compositions may repeat any drum freely. Repetition prefixes are distinct even at the minimum playable length.

The interface supplies millisecond timestamps to `hit(state, drum, t)`. In repetition, each success increases the next question’s length by one up to the level maximum. Every second error decreases the current length by one down to the level minimum. An error resets the cursor, keeps the question open and increases the interval tempo by ×1.3, bounded at 1600 ms from a 650 ms base. Every replay retains the generated sequence prefix. Two errors highlight and pulse the next expected drum; the hint follows each successful beat.

Rhythm has three, four or six strikes, hence two, three or five measured intervals. Each interval is one base interval (short) or two (long). The first strike anchors the child's clock; there is no deadline to begin. Subsequent strikes must use the demonstrated drum and land within **±35% inclusive** of the expected interval at the current replay tempo. This deliberately wide tolerance suits young children. Synthetic tests accept ±34% and the ±35% boundary and reject ±36%; a tiny numerical epsilon only compensates floating point rounding. Early/late strikes invite another slower demonstration, with no visible clock or failure screen.

In free mode every valid strike is accepted, including consecutive identical drums. After eight strikes Tutu replays those drums and their measured spacing (playback intervals clamped to 100–2000 ms), then offers Continue. No errors are possible and every completed free session earns three stars. All modes have five questions. Repetition and rhythm use the common first-try star thresholds: 0–2 clean questions earn one star, 3–4 two, and 5 three. Every completion unlocks the next level. `tamboursRecords` preserves best stars, migrates absent saves, filters levels 1–8 and clears with the shared erase control.

### Musical touch exception and media

**This game intentionally has no same-target double-tap debounce.** `activation.ts` exports `bindBeat`, distinct from release-based `bindAction`: each primary or secondary `pointerdown` immediately plays one beat. Two simultaneous fingers count as two strikes in dispatch order, and two rapid contacts count twice. The shared coordinate helper checks containment in CSS viewport pixels. Generated pointer compatibility clicks are suppressed; a keyboard click (`detail=0`) still plays. Connected drum nodes survive each hit. Only drums use `touch-action: none`; shell controls retain the usual activation behavior. Every accepted beat is visible in `events()` as `musical-beat`.

Targets measure at least 100×112 CSS px; the 100×100 SVGs paint at least 88 px in either axis. Instruments form a shallow three-column arc over two rows, with two columns below 360 px. `data-drum`, `data-note`, `data-shape` and `data-lit` describe each instrument; `data-phase` distinguishes listening, playing and solved, while `data-tempo` records the actual interval. Tutu illuminates and bounces each struck drum for 230 ms, then shows a hand pictogram and speaks “À toi !” / “Your turn!”. Successive strikes alternate two distinct illumination intensities so even overlapping 230 ms lights produce a visible change. Reduced motion removes bouncing and hint motion, retaining those illumination changes and the static hint outline. Synthesized sine notes peak at gain .055 and stop within .26 seconds; no audio files or dependencies are used. Parent sound controls, unavailable devices and local voice behavior follow the shell. Hiding cancels playback and suspends sound; returning restarts the demonstration and clears a partial timing anchor. Navigation cancels all owned timers. A detached `window.__kid.state().tambours` snapshot exposes state without mutation methods.

### Drum test oracles and review

Authored without running Vitest, Playwright or a browser:

- `tests/tambours.test.ts`: independent eight-level table, determinism and sequence rules for 300 seeds per level; pure hit transitions, invalid inputs, slowed/bounded tempo, two-error hint, length growth/shrinkage, synthetic timing boundaries, every mode’s completion and rewards, best-score preservation, unlocks, bilingual SVG validity, save migration/filtering and a fake AudioContext’s exact frequencies and quiet gain. Event sequences test immediate primary/secondary beats, compatibility-click rejection and keyboard access.
- `tests/e2e/tambours.spec.ts`: a MutationObserver records actual `data-lit` pulses during demonstrations under `page.clock`; those observed drums and intervals are the independent answer oracle. Repetition/rhythm sessions check slower replay, hints, local voice, muted play, stars and reload/unlocks. Free mode checks eight-beat replay and three stars. Drawn SVG extents, targets, reduced motion, detached snapshots and page overflow are measured at widths 320–1280. The shared fixture rejects console/page errors. Optional mobile captures produce `tambours-ecoute.png` and `tambours-a-toi.png`; the orchestrator must generate and inspect them.
- `tests/e2e/tambours-doigt.spec.ts`: seeded ±10 px mobile touches solve a full light-observed session with unchanged scroll. Two rapid same-drum taps count twice; a real simultaneous two-finger contact counts twice before release. The shared failure fixture attaches `events()`.

Three mutations to try:

1. Replace `.35` with `.33` in rhythm acceptance: synthetic ±34% acceptance must fail.
2. Remove the `Math.min(MAX_TEMPO, ...)` slowdown cap: repeated-error state assertions must fail.
3. Route drum contacts through the normal release/debounce binder: immediate-pointer, rapid-tap and simultaneous-finger assertions must fail.

Tambours regression coverage also checks minimal sequence prefixes, backwards timestamps, adapted marker counts, moving hints, varied free replay intervals with both clamps, partial rhythm reset on Listen and visibility changes, detached light timer cancellation, and exact frequencies and stop times after real mobile touches. Painted light filters must differ on consecutive same-drum strikes with and without reduced motion.


## Studio: Boubou’s studio — 1.0.0

The tenth and final game opens directly with Boubou, without levels, questions, stars, success or failure. Children choose colouring or free drawing through a paint-pot or brush tab. Ten authored colouring illustrations depict the five guides, a house, tree, fish, rocket and butterfly. Rounded quadratic contours are sampled into closed polygons. Each illustration has 8–20 zones, including large colourable details. Guide silhouettes retain panda eye patches, bamboo and basket; red-panda cheeks and striped tail; dragon horns, wings, tail and book; monkey ears, face mask, curled tail, flower and tutu; unicorn ears, horn, mane, flowing tail and chest star. Faces have separated vertical eyes, no eyebrows and upward-open quadratic smiles. Distinct closed region identifiers accompany actual SVG paths. The 320×300 sheet renders 300 px wide on a 390×844 phone; each region spans at least 44 real pixels on both axes. Small facial details are decorative ink, never tiny touch targets. Quiet peripheral paint marks decorate the studio.

Twelve colours have explicit French and English spoken names. White is the eraser; free brushes are 4, 9 and 18 sheet units. Selected colours have a thick ink ring and white inner border. Palette and tool targets are at least 48 px. Colouring binds the shared activation helper to stable connected regions. Keys include revision, zone and colour, so immediately colouring different zones or recolouring the same one remains possible. Free drawing captures only the primary pointer, converts viewport coordinates with `screenToZone`, samples points at a minimum distance of 2 sheet units and simplifies polylines. Only the sheet prevents touch panning. Cancellation and backgrounding preserve the partial stroke, release ownership and stop shared speech/audio.

Pure engine state contains region colours, brush strokes and forty bounded undo/redo snapshots; a new edit clears redo. Clearing the sheet first opens a gentle confirmation and remains undoable. Switching sheets is undoable. Colouring and free-drawing content are retained independently while changing tabs. Ramer–Douglas–Peucker uses an iterative stack, retains endpoints and simplifies a noisy trace to within 1 unit. When the global 4,000-point vector budget is exceeded, the oldest strokes are flattened into a fixed 160×150 local colour grid, with 2-unit cells and at most √2 units of boundary quantization error. This preserves isolated marks and interrupted strokes without connecting unrelated gestures or dropping any drawing. Undo retains the previous vector/grid snapshot. Geometry is never uploaded.

Gallery format version 1 stores palette indices, positional region colours and half-unit base-36 point coordinates. The optional underpainting uses 24,000 palette-index characters; even that layer plus 4,000 vector marks remains below 60 KiB. The serialized work is limited to 60 KiB. Readers reject unknown versions, invalid modes, drawings, colours, widths, geometry and excess point counts. A damaged work is skipped independently. The separate `opencadkid.atelier.v1` local key retains the latest twelve creations; the thirteenth evicts the oldest. “I’m done” adds Boubou’s stamp and saves once per revision; there is no reward score. Storage failures keep the sheet playable and report that saving failed. The adult panel has a dedicated gallery erase with a second confirmation, separate from existing star records.

`window.__kid.state().atelier` is a detached snapshot containing zones, mode/tool, colour, width, strokes, stroke/point counts and undo/redo sizes. The shared `events()` records zone activations, stroke starts and ignored secondary pointers.

### Studio verification for the orchestrator

- `tests/atelier.test.ts`: independent list of ten drawings; actual polygon vertices establish closed, unique, finite zones and phone dimensions. Independent distinguishing-zone identifiers and geometric smile/eyebrow oracles; 8–20 regions per sheet. Pure filling, immediate recolouring and independent neighbours; thirty exact undo/redo steps and history bounds; minimum sampling distance, 12,001-point noisy trace with an independent point-to-segment error oracle ≤2 px, total point budget and underpainting across sixty strokes; compact round trips for both modes and 4,000 isolated marks, corruption/version rejection, 60 KiB limit; gallery eviction, isolated corruption, blocked storage and parental erase; explicit bilingual colour-name oracle and absence of stars. The shared seed-29 fixture reproduces all 300 mobile touch points: all lie inside the sheet, truncating at point 220 first exceeds 2 px at point 222 (2.3149951490205 px), and the complete stroke preserves its endpoints and stays within 2 px. The touch scenario releases only the secondary contact at point 220 and checks that the primary stroke remains uncommitted before continuing through point 299.
- `tests/e2e/atelier.spec.ts`: DOM regions are the fill oracle, with recolouring, undo/redo, gallery save/load after reload, detached observation, zero runtime requests during creation, shared console guard, bilingual speech via shared fake media, brush widths, eraser, cancelled/confirmed clear and parental erasure. All ten drawings measure actual SVG geometry and targets at 320–1280 px without horizontal overflow.
- `tests/e2e/atelier-doigt.spec.ts`: immediate real touch releases on two regions and immediate recolouring; 300 noisy CDP touch positions, captured primary finger, ignored second finger, unchanged page offsets and retained stroke through undo/redo. The shared fixture attaches `events()` on failure.
- Optional mobile captures: `atelier-coloriage.png`, `atelier-dessin.png`, refreshed `accueil-catalogue.png` showing ten games and TicTac. Screenshots require orchestrator generation and visual review. No browser or test runner is launched during authoring.

### Studio mutations to try

1. Remove colour/revision from region activation keys: the immediate touch recolouring regression must fail.
2. Remove the primary-pointer/owner guard: the two-finger test must detect an extra stroke or a spur in its painted bounds.
3. Change gallery retention from `.slice(-12)` to `.slice(-13)`: the independent thirteen-work eviction test must fail.

## Snack: Boubou’s snack (1.1.0)

- Field of 320 × 440 units, fixed 60 Hz Verlet steps on a single sweet (radius 13). Ropes are maximum-distance constraints from a peg, slack below their length. Hooks add a rope when the sweet comes within their reach. A bubble catches a free sweet and lifts it until it is popped. The sweet reaching Boubou's mouth (radius 32) wins; leaving the field loses and restarts the same level after 70 steps.
- Input: a tap cuts the closest uncut rope within 24 units, never when the tap lands on the sweet; a tap on a bubble carrying the sweet pops it; a swipe cuts every rope its path crosses. Only the primary finger acts.
- 116 levels (`src/engines/gouter/levels.ts`): sixteen drawn by hand, then a hundred generated by `scripts/gouter-generate.ts` (seed 20261107) and kept as written. The generator draws a rig from seven families (one string, two strings, a slack string, a hook, a bubble that carries the sweet up, a bubble that catches it on the way down, four strings), plays a child-paced plan, and puts Boubou's mouth and the three stars on the path the sweet really takes. It keeps a level only if the solver finishes it with three stars and a tolerance of at least ten steps, nothing happens without the child, every hook and bubble takes part in the solution, a single-string fall travels at least 40 units sideways, and it does not play like a hand-drawn level or one already kept: same mechanisms with Boubou and every anchor within 45 units of the other level's, as seen from the sweet (a rig moved sideways is the same level). Families take turns. The generator compares only against the sixteen hand-drawn levels, so running it again rewrites the same hundred levels. Generated levels go from fewer gestures to more, then from more forgiving timing to less. The solver (`src/engines/gouter/solver.ts`) explores every cut and pop on a six-step grid over ten seconds, merging equivalent situations. Tests require for every level: a win, three stars reachable, no win without an action, and a reference plan whose actions can each shift by at least eight steps.
- Rewards: one star per collected star, at least one for a finished level. Best results are stored under `opencadkid.gouter.v1`; finishing a level unlocks the next.

## Studio additions (1.1.0)

- The background is the zone `fond`. In colour mode it is the bottom tappable layer; in brush mode zones and background are drawn but inert, strokes paint above them and the drawing's lines stay on top.
- `feuille` is a blank page with no zones; choosing it opens the brush. Choosing any model starts fresh paper in colour mode (undoable).
- Version 2 serialization adds the background colour. Version 1 works are converted to what was visible: draw-mode works move to the blank page, colour-mode works keep their zones only.
- The sheet in progress is kept under `opencadkid.atelier.draft.v1` and restored when the studio opens. The save button renders the sheet to a 960 × 900 PNG file locally.
- Each model has a fixed SMIL animation (`src/engines/atelier/motion.ts`): whole-figure motion plus moving parts with their own lines. Only the child's colours vary; reduced motion removes the animation elements.
