# Opencadkid — game specification 0.4.0

Audience: ages 4–8, primarily touch phones. French first, English included. No reading is required in child play. Spoken instructions, procedural SVG pictograms, object illustrations and dot patterns convey the task. No timer, lives, punishment, advertising, purchase, account, analytics or external runtime resource. The first home gesture unlocks browser audio. Reduced motion removes shakes, bounces and decorative particles. Local speech voices are preferred; speech availability offline depends on installed device voices.

## Catalogue

`compter`, `paires`, `formes` and `sons` are implemented and present in the playable registry. Other catalogue entries remain planned.

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


## Shapes: CaliRoux's shapes

CaliRoux uses the existing `pandaroux` character identifier. The ten levels each contain six questions. Recognition has one matching choice; sorting has three pieces per question, each with exactly one matching box. Answer positions are drawn from the seeded RNG, excluding a position only after two consecutive uses. Adjacent requested shapes differ. No ambient randomness, time or DOM enters the engine. The scoring and unlocking functions are imported unchanged from counting: 0–2 clean questions earn one star, 3–4 two, 5–6 three. Sorting credits a question only when all three pieces were placed without error. Every finish unlocks the next level and preserves the best score in `formesRecords`; missing records migrate safely.

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

Shapes: circle, square, triangle, rectangle, star, heart, diamond, oval. Colours: red, blue, yellow, green, orange, purple, pink, brown. Symmetric forbidden colour pairs: red/green, blue/purple, pink/orange, red/brown, green/brown, red/orange, red/pink, yellow/orange, purple/pink. Palettes are assembled from a seeded shuffle with pairwise exclusion before choices or boxes are made. These conservative exclusions reduce common confusions; they cannot guarantee perception for every colour vision. Shape recognition uses geometry independently of colour. Thick dark outlines surround every shape.

The displayed SVG viewports measure 104 px, or 64 px for small shapes (ratio 1.625). Rectangle and oval outlines have a taller profile so the drawn bounds, including the 3-unit stroke, measure at least 64 px large and 48 px small in both dimensions. Size ratios are measured for the same drawn shape in both dimensions. Prompts show an outline and/or colour swatch; size prompts include a relative-size silhouette. All choices carry accessible bilingual labels and SVG `data-shape`, `data-color`, `data-size`. French names agree with the noun (including feminine étoile and generic forme); English adjectives precede nouns. An error shakes the touched piece without sound. After two errors the correct choice pulses and the requested name is spoken again. A solved question locks until the separate arrow is pressed.

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

Tutu is the existing `singe` guide. This game uses the shared six-question session, two-error hint, separate Continue control, exact 1/2/3-star thresholds and best-score/unlock rules. `sonsRecords` is independent of every other game; old saves migrate to an empty record set and erase clears all games. No existing engine changes. Generic registry/home expectations now include four games. No behaviour-changing factorization.

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

### Screen, voice and gestures

System-font letters use 80 px type and dark AA ink on light cards/boxes. Cards and image SVG viewports measure at least 72 px; the image prompt measures 100 px. There are no printed object names, including SVG text; `aria-label`, `data-word`, `data-initial` and `data-letter` describe the pictures/letters for accessibility and independent observation. The child cannot pair a printed word with its initial. Prompts have generic short instructions and a Tutu illustration.

Image-lettre says the native word then its sound. Lettre-image starts with the target sound, then names each candidate word followed by its own initial sound; the large letter is shown. Son-lettre has no image/word cue and says only the sound and generic instruction; the ear repeats it. Trier names all images with their sounds; grabbing/selecting one repeats its word and sound. After two errors the relevant letter card or sorting box pulses (and the target letter in lettre-image); speech repeats the initial sound twice with pauses before the word, then the sound. Errors keep the question open. A successful question locks and requires Continue, absorbing double touches. Sorting rejects repeat placements, counts first-try once on the last piece, and supports both primary-pointer dragging and selecting an image then its box with taps or keyboard. A 24 px snap allowance helps noisy fingers; wrong drops return over 260 ms unless reduced motion. Pointer cancellation/lost capture clears drags. Only the sorting area disables touch scrolling.

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
