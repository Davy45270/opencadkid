# Changelog

## 1.2.0

- Parents’ space: a new “My other games” entry lists the author’s three other games (Opencade, TicTac, Petit Astronome), each with its icon and one sentence. Like every way out of the app, it sits behind the adult question; a tap opens the game in the same tab.
- The list and its icons ship with the app, so it still shows offline; nothing is requested from the network.

## 1.1.0

- Add **Boubou’s snack**, an eleventh game for ages 4–8: a sweet hangs from strings, and cutting them with a finger lets it fall into Boubou’s mouth. A tap cuts the closest string, a swipe every string it crosses; touching the sweet itself cuts nothing. Bubbles lift the sweet until they are popped, hooks catch it when it passes within reach, and slack strings catch it on the way down.
- Sixteen levels, each proven by an exhaustive solver over every cut and pop on a fixed time grid: finishable, three stars reachable, nothing happens without the child, and the reference plan tolerates timing errors. Deterministic fixed-step physics; a missed sweet floats away and the level starts again by itself, with no lives and no timer. Best stars are kept on the device and unlock the next level.
- Boubou’s studio: the paper behind each model takes a colour like any zone; the brush now paints over the coloured model, whose lines stay on top; a blank page joins the ten models and opens with the brush; a new model starts on fresh paper.
- Boubou’s studio: the sheet in progress is kept on the device and comes back after leaving the studio or reloading the page; the picture can be saved as a PNG file on the device, with no network.
- Boubou’s studio: every model has a pre-authored animation (wings that flap, a tail that wags, a rocket that takes off, a door that opens…) in which only the child’s colours change. Reduced motion shows it still.
- Saved works move to a second format; works saved by earlier versions keep exactly what the child saw.
- Home: the game cards no longer fade out and back in each time the home screen appears, which looked like flickering on a light screen; the small guides on the cards stay still while the landscape cast keeps its gentle motion.

## 1.0.1

- Reserve two explicit text lines for game instructions, encouragements and feedback, and space for the studio stamp; wrap text without clipping. Keep sorting pieces at their grid origin during touch activation.
- Measure gentle returns relative to the original parent after finite motion, with a bounded half-pixel tolerance and no residual transform. Add target, instruction and feedback geometry regressions after an error and a hint in all five drag games, using both default and wider fallback typography. Browser execution awaits CI.

- Wait for finite gesture feedback before recording pattern positions, then poll for strict state equality after cancellation. Replace fixed gentle-return delays with bounded animation and exact geometry checks in shape, sound and sorting regressions; verify that no drag transform remains.

- During a memory mismatch, a hidden-card touch closes both cards and opens its target immediately; touching either visible card only closes the pair. Preserve move counts and accidental-double-touch protection.
- Redraw all ten colouring sheets with rounded contours, smiling faces, recognisable guide features and large colourable object details, with 8–20 closed regions per sheet.
- Add handwritten memory transition oracles, controlled-clock touch regressions, guide-feature identifiers and geometric smile/eyebrow checks. Preserve existing geometry, colouring and history checks. Test suites and visual capture review await orchestrator execution.

## 1.0.0

- Complete the ten-game catalogue with Boubou’s studio: ten procedural colouring drawings and calm free finger drawing, twelve bilingual spoken colours, white eraser and three brush sizes.
- Add forty undo/redo steps, confirmed clearing, bounded simplified geometry and versioned compact local artwork serialization.
- Add a twelve-work local gallery, Boubou’s voluntary completion stamp without stars, tolerant corruption handling, storage-failure feedback and confirmed parental gallery erasure. No artwork leaves the phone.
- Reuse shared activation, viewport coordinate conversion, primary pointer capture, local speech, read-only observations and event diagnostics.
- Author independent engine, gallery, language, responsive geometry, immediate-touch and 300-point two-finger browser regressions; optional studio and refreshed catalogue captures await orchestrator execution. No test runner or browser was launched during authoring.

## 0.10.0

- Add Tutu’s drums: eight seeded levels of repetition, generous short/long rhythm imitation and free eight-beat composition with playback.
- Give six shaded instruments distinct shapes and quiet pentatonic WebAudio notes; lights keep play available with sound muted or unavailable. Respect reduced motion and background cancellation.
- Add an explicit shared activation exception for musical pointerdown, rapid beats and simultaneous fingers. Reuse viewport coordinates and bounded event history.
- Slow demonstrations after mistakes, hint after two errors, adapt sequence length and preserve independent best stars and unlocks.
- Author 300-seed engine tests, synthetic rhythm boundary tests, fake audio/speech tests, DOM light oracles, noisy touch, responsive painted-size checks and optional captures. Test suites and captures await orchestrator execution.

## 0.9.0

- Add CaliRoux’s tidy-up: eight seeded levels for colour, shape, size, category, three bins, two criteria and a unique odd one out, with 180 bilingual everyday object variants.
- Validate disjoint sorting and occupied bins; prevent colour-only shortcuts and require both clues for combined rules. Count hints per object, return wrong drops softly and reuse common stars, unlocks, local voice and isolated save records.
- Reuse shared touch activation and coordinate helpers, inclusive 24 px snapping, selected-object bin keys, read-only snapshots and event history. Verify selection-aware double-continuation pattern activation keys at zero elapsed time.
- Add independent 300-seed engine oracles, zero-delay activation regressions, per-rule browser sessions, noisy mobile gestures, actual painted-size and responsive overflow checks, plus two optional captures.
- Version 0.9.0. Tests and captures await orchestrator execution; no test runner or browser was launched during authoring.

## 0.8.0

- Add Lumi’s patterns: ten seeded levels covering AB, AAB, ABB, ABC, AABB, ABCD, middle gaps, two ordered continuations and growing dot groups.
- Validate periodic answers against every compatible period up to four. Randomize answer positions without triples; use wrong-rank and outside-motif distractors with shape or dot-count differences beyond colour.
- Reuse shared touch activation, drag coordinates, local bilingual speech, soft audio, rewards and isolated best-score persistence. Add a pale rainbow, two-error base-motif hints and reduced-motion empty slots.
- Author independent 300-seed unit oracles, complete-mode browser sessions, noisy mobile gestures, responsive painted-size checks and two optional captures. Unit tests, browser tests and screenshots await orchestrator execution; no test runner or browser was launched during authoring.

## 0.7.1

- Correction : deux images posées rapidement dans la même boîte sont désormais toutes deux acceptées.

## 0.7.0

- Give Boubou a softly shaded cream coat, dark eye patches, paw pads, bamboo and fruit basket; CaliRoux a warm red coat, white face mask and striped plume; Pestouille a red coat, cream belly, curved gold horns, veined green wings and book; Tutu a warm face, pink flower and layered tutu; Lumi a rainbow mane, blue eyes, twisted gold horn and star.
- Add per-instance radial paint servers, ground shadows, bright eyes, expressive brows and coloured outlines, keeping the character API and reduced-motion drawing stable.
- Enrich the home panorama with layered hills, luminous clouds, trees and flowers. Add discreet peripheral bamboo, night-sky, autumn, jungle, castle and meadow decorations to the six games.
- Give cards and buttons gentle depth, a pressed state, a short entrance and a waving guide with reduced-motion support. Keep responses at least 72 px, including four-column memory grids on narrow phones.
- Shade fruit, shape, memory, sound and puzzle illustrations without changing their silhouettes, measured sizes, identifiers or geometric signatures. Outline prompts and memory shadows stay solid.
- Add SVG validity, paint-server isolation, calculated text contrast and generated precache gzip-budget tests. Canonicalize only instance namespaces in exact character comparisons; extend the sound SVG vocabulary for gradient definitions. Extend mobile captures to the entire catalogue, puzzle and path screens.
- Version 0.7.0. Unit and browser suites await orchestrator execution; neither suite nor a browser is run during this beauty pass.

## 0.6.0

- Add Pestouille’s path: eight seeded perfect mazes, finger tracing with exact cell interpolation, wall stops, backtracking, keyboard arrows and three-cell hints.
- Add procedural destinations, optional stars and a completion medal; preserve separate best stars and medals with safe save migration.
- Reuse screen-to-zone conversion, local speech, synthesized sound, unlocking and the read-only observation hook. Existing games’ rules are unchanged; only shared catalogue count assertions change.
- Add independent 300-seed topology, state, interpolation, help, rewards, language and storage tests; browser DOM maze solvers, noisy mobile gestures, responsive measurements and optional start/finish captures. Unit and browser suites await orchestrator execution.

## 0.5.0

- Add Pestouille’s puzzle: eight seeded levels, six procedural scenes, complementary SVG curves, gentle snapping and nonpunitive bounded drops.
- Add primary pointer capture, noisy touch support, 16 px keyboard movement, optional model, idle hints, speech, chimes and reduced-motion celebration.
- Keep separate best puzzle stars with safe migration and shared unlocking conventions. Puzzle rewards count assistance rather than question answers.
- Add independent seeded geometry, state, SVG, i18n and persistence tests; complete drag and noisy mobile suites, responsive painted-size checks and optional start/finish captures. Browser and unit suites await orchestrator execution.
- Update only generic registry and home game-count expectations. Other games’ rules and tests are unchanged.

## 0.4.0

- Add Tutu’s sounds: ten levels, four modes, uppercase and lowercase, native French and English lexicons with twenty letter families and sixty words each.
- Add seeded pure rounds, conservative sound-neighbour exclusions, two-error spoken/visual hints, native SVG pictures and touch sorting with a keyboard alternative.
- Reuse the common rewards and preserve independent sounds progress with safe save migration; existing game engines and rules are unchanged.
- Add independent lexicon, SVG, phoneme, seeded, session, reward, i18n and persistence tests, two browser suites and two optional captures. Tests await orchestrator execution.
- Extend generic catalogue/home expectations from three games to four; existing game tests are unchanged.

## 0.3.0

- Add CaliRoux's shapes: ten levels recognizing eight shapes, eight colours, combinations and sizes, then sorting into two or three colour boxes.
- Add seeded pure questions, conservative colour exclusions, spoken French agreement and English adjective order, outlined SVG prompts, two-error hints and gentle touch dragging with snap assistance.
- Reuse counting's reward and unlocking functions without changing either existing game's rules. Keep separate shape records with safe migration.
- Add independent seeded, state, geometry, language and persistence tests, complete-mode browser and noisy-finger suites, and two optional captures. Tests await orchestrator execution.
- Update generic catalogue and home assertions for three playable games; counting and memory tests are unchanged.

## 0.2.0

- Add Lumi's cards: six progressive memory levels, an optional picture–shadow level, sixteen distinct procedural SVG silhouettes and bilingual spoken card names.
- Add deterministic shuffled boards, short introductory previews, gentle repeated-miss hints, soft matched-pair chimes and one-to-three-star completion.
- Fit twenty large touch cards on a phone without scrolling; respect reduced motion and expose detached board/card geometry through the observation hook.
- Preserve independent best scores and unlocks for each game while reading existing counting saves.
- Add seeded engine, distribution, reward, SVG, language, persistence, click and noisy-touch tests, plus two optional screenshots. Tests await execution by the browser/test orchestrator.
- Qualify existing counting, offline and screenshot game selectors now that the home has two playable cards; counting rules are unchanged.

## 0.1.0

- Introduce Opencadkid, a French-first, bilingual, touch-oriented educational collection.
- Add Boubou's baskets: eight levels of counting, filling and comparison, deterministic pure engines, hints and gentle rewards.
- Add five procedural SVG guides, illustrated home, speech, synthesized sounds and adult-gated settings and sister-app link.
- Store progress locally; support offline installation with reproducible panda icons.
- Add unit and browser test suites, pinned CI and Pages workflows, and specifications for nine future games.
