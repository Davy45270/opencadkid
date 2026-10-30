import { expect, it } from 'vitest';
import { advance, answer, complete, generateRound, isUnlocked, levels, start, stars, type Item, type Question } from '../src/engines/suites';
import { colorNames, shapeNames, itemSvg, name } from '../src/games/suites/items';
import { gameView, hintSpeech, instruction, levelView } from '../src/games/suites/view';
import { messages } from '../src/shell/i18n';
import { fresh, readSave, writeSave } from '../src/shell/storage';
import { validSvg } from './svg-oracles';
const table = [
    ['suivant', 'AB', 3], ['suivant', 'AAB', 3], ['suivant', 'ABB', 4], ['suivant', 'ABC', 4],
    ['suivant', 'AABB', 4], ['suivant', 'ABCD', 4], ['trou', 'ABC', 4], ['trou', 'AABB', 4],
    ['deux-suivants', 'ABC', 4], ['croissant', '', 4]
] as const;
const identity = (p: Item): string => JSON.stringify([p.shape, p.color, p.dots]);
/** Deliberately enumerate actual motifs, rather than calling the engine's
 * residue validator or reading its pattern/answer to decide a continuation. */
function possibilities(q: Question, slot: number): number[] {
    if (q.mode === 'croissant') {
        const shown = q.sequence.flatMap((p, i) => p ? [{ p, i }] : []);
        const differences = shown.slice(1).map((v, i) => (v.p.dots - shown[i]!.p.dots) / (v.i - shown[i]!.i));
        if (!differences.every(d => d === 1)) throw new Error('Not growing by one');
        return q.choices.flatMap((p, i) => p.shape === 'points' && p.dots === shown[0]!.p.dots + slot ? [i] : []);
    }
    const alphabet = [...new Set([...q.sequence.filter((p): p is Item => p !== null), ...q.choices].map(identity))];
    const possible = new Set<string>();
    for (const period of [1, 2, 3, 4]) {
        const enumerate = (base: string[]): void => {
            if (base.length === period) {
                if (q.sequence.every((p, i) => p === null || identity(p) === base[i % period])) possible.add(base[slot % period]!);
                return;
            }
            for (const value of alphabet) enumerate([...base, value]);
        };
        enumerate([]);
    }
    return q.choices.flatMap((p, i) => possible.has(identity(p)) ? [i] : []);
}
it('independent ten-level specification and invalid generation inputs', () => {
    expect(levels.map(l => [l.mode, l.pattern, l.choices])).toEqual(table);
    for (const level of [0, 11, 1.5]) expect(() => generateRound(level, 1)).toThrow();
    for (const count of [0, -1, 1.5, NaN]) expect(() => generateRound(1, 1, count)).toThrow();
    expect(generateRound(1, 2, 2)).toHaveLength(2);
});
for (const [index, [mode, motif, count]] of table.entries()) it(`level ${index + 1}: 300 seeds, exhaustive independent period oracle and drawn positions`, () => {
    const failures: string[] = [], positions = Array<number>(count).fill(0);
    let rotations = 0;
    for (let seed = 0; seed < 300; seed++) {
        const round = generateRound(index + 1, seed);
        if (JSON.stringify(round) !== JSON.stringify(generateRound(index + 1, seed))) failures.push('determinism');
        if (round.length !== 6) failures.push('six questions');
        if (round.slice(1).every((q, i) => q.answer === (round[i]!.answer + 1) % count)) rotations++;
        for (const [n, q] of round.entries()) {
            if (q.mode !== mode || q.choices.length !== count) failures.push('level');
            if (new Set(q.choices.map(identity)).size !== count) failures.push('distinct choices');
            for (const [i, slot] of q.slots.entries()) {
                const possible = possibilities(q, slot);
                if (possible.length !== 1 || possible[0] !== q.answers[i]) failures.push(`oracle ${seed}:${n}:${slot}`);
            }
            if (q.answer !== q.answers[0]) failures.push('first answer');
            positions[q.answer]!++;
            if (n >= 2 && q.answer === round[n - 1]!.answer && q.answer === round[n - 2]!.answer) failures.push('position triple');
            if (mode === 'suivant') {
                const shown = q.sequence.slice(0, -1);
                if (shown.length < 2 * motif.length || shown.some(p => p === null)) failures.push('two complete repetitions');
                const letters = new Map<string, string>();
                for (const [i, letter] of Array.from(motif).entries()) {
                    const value = identity(shown[i]!);
                    if (letters.has(letter) && letters.get(letter) !== value) failures.push('base motif');
                    letters.set(letter, value);
                }
                if (new Set(letters.values()).size !== letters.size) failures.push('distinct symbols');
                if (!shown.every((p, i) => identity(p!) === letters.get(motif[i % motif.length]!))) failures.push('visible rule');
            }
            if (mode === 'trou' && (q.slots[0]! <= 0 || q.slots[0]! >= q.sequence.length - 1)) failures.push('interior hole');
            const all = [...q.choices, ...q.sequence.filter((p): p is Item => p !== null)];
            for (const a of all) for (const b of all) if (identity(a) !== identity(b) && a.shape === b.shape && a.dots === b.dots) failures.push('colour alone');
            if (mode !== 'croissant') {
                const base = new Set(q.pattern.map(identity));
                if (!q.choices.some(p => !base.has(identity(p)))) failures.push('outside distractor');
                if (!q.choices.some((p, i) => i !== q.answer && base.has(identity(p)))) failures.push('wrong rank distractor');
            }
        }
    }
    expect(failures).toEqual([]);
    for (const n of positions) { expect(n / 1800).toBeGreaterThan(.65 / count); expect(n / 1800).toBeLessThan(1.35 / count); }
    expect(rotations / 300).toBeLessThan(.05);
    expect(generateRound(index + 1, 1)).not.toEqual(generateRound(index + 1, 2));
}, 30_000);
it('pure answers, two-error hint, ordered double continuation, invalid inputs and solved locking', () => {
    for (const level of [1, 7, 9, 10]) {
        const initial = start(level, 8), snapshot = structuredClone(initial), q = initial.questions[0]!;
        const wrong = (q.answer + 1) % q.choices.length;
        const once = answer(initial, wrong), twice = answer(once.state, wrong);
        expect(initial).toEqual(snapshot); expect(once.hint).toBe(false); expect(twice.hint).toBe(true);
        expect(answer(twice.state, wrong).hint).toBe(true); expect(advance(twice.state)).toBe(twice.state);
        for (const choice of [-1, 99, 1.5, NaN]) expect(answer(initial, choice).state).toBe(initial);
        expect(answer(initial, q.answer, 1).state).toBe(initial);
        let s = twice.state;
        for (const choice of q.answers) s = answer(s, choice).state;
        expect(s.solved).toBe(true); expect(s.firstTry).toBe(0);
        expect(answer(s, q.answer).state).toBe(s);
        expect(advance(s)).toMatchObject({ index: 1, errors: 0, solved: false, placed: [] });
        let clean = initial;
        for (const [i, choice] of q.answers.entries()) { clean = answer(clean, choice).state; expect(clean.firstTry).toBe(i === q.answers.length - 1 ? 1 : 0); }
    }
});
it('common reward boundaries, six successes, low score unlock and best score preservation', () => {
    expect(Array.from({ length: 7 }, (_, n) => stars(n))).toEqual([1, 1, 1, 2, 2, 3, 3]);
    for (let level = 1; level <= 10; level++) for (const clean of [false, true]) {
        let s = start(level, 5); expect(complete({}, s)).toEqual({});
        for (let i = 0; i < 6; i++) {
            const q = s.questions[s.index]!;
            if (!clean) s = answer(s, (q.answer + 1) % q.choices.length).state;
            for (const choice of q.answers) s = answer(s, choice).state;
            s = advance(s);
        }
        expect(s.finished).toBe(true); expect(s.firstTry).toBe(clean ? 6 : 0);
        const records = complete({}, s); expect(records[level]).toBe(clean ? 3 : 1);
        expect(complete({ [level]: 3 }, s)[level]).toBe(3); expect(isUnlocked(level + 1, records)).toBe(true);
        expect(advance(s)).toBe(s); expect(answer(s, 0).state).toBe(s);
    }
});
it('complete bilingual prompts and names, finite well-formed SVG and hint around base motif', () => {
    expect(Object.keys(messages.fr).sort()).toEqual(Object.keys(messages.en).sort());
    for (const locale of ['fr', 'en'] as const) {
        for (const value of Object.values(messages[locale])) expect(value.trim()).not.toBe('');
        expect(Object.values(colorNames[locale]).every(Boolean)).toBe(true); expect(Object.values(shapeNames[locale]).every(Boolean)).toBe(true);
        expect(levelView(fresh(locale))).toContain('data-level="10"');
        for (let level = 1; level <= 10; level++) {
            const state = start(level, 4), q = state.questions[0]!;
            expect(instruction(q, locale)).not.toBe(''); expect(hintSpeech(q, locale).every(Boolean)).toBe(true);
            const view = gameView(state, locale, true);
            expect(view).not.toMatch(/NaN|undefined|Infinity/); expect(view).toContain('suites-base');
            for (const p of [...q.choices, ...q.pattern]) {
                expect(name(p, locale)).not.toBe(''); const svg = itemSvg(p, locale);
                expect(validSvg(svg)).toBe(true); expect(svg).not.toMatch(/NaN|undefined|Infinity/);
                expect(svg).toContain(`aria-label="${name(p, locale)}"`);
                if (p.shape === 'points') expect((svg.match(/<circle /g) ?? []).length).toBe(p.dots);
            }
        }
    }
    expect(instruction(generateRound(1, 0)[0]!, 'fr')).toBe('Qu’est-ce qui vient après ?');
    expect(instruction(generateRound(7, 0)[0]!, 'en')).toBe('What is missing?');
});
it('independent saved records migrate, filter, round-trip and clear', () => {
    let raw = JSON.stringify({ ...fresh(), records: { 1: 3 }, suitesRecords: { 1: 1, 10: 3, 11: 2, 2: 0, 3: 1.5, 4: '3' } });
    const port = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
    const save = readSave(port); expect(save.suitesRecords).toEqual({ 1: 1, 10: 3 }); expect(save.records).toEqual({ 1: 3 });
    writeSave(port, save); expect(readSave(port)).toEqual(save);
    raw = JSON.stringify({ version: 1, locale: 'fr', voice: true, sound: true, records: { 1: 2 } });
    expect(readSave(port).suitesRecords).toEqual({}); expect(readSave(port).records).toEqual({ 1: 2 });
    expect(fresh().suitesRecords).toEqual({});
});

it('next ranks cover every motif residue over 300 seeds without a first-item shortcut', () => {
    for (const [index, [mode, motif]] of table.entries()) {
        if (mode !== 'suivant') continue;
        const ranks = Array<number>(motif.length).fill(0), firstRanks = [...ranks];
        for (let seed = 0; seed < 300; seed++) {
            for (const [n, q] of generateRound(index + 1, seed).entries()) {
                // Read the visible length, independently of pattern and declared answers.
                const visible = q.sequence.findIndex(p => p === null);
                const rank = visible % motif.length;
                ranks[rank]!++; if (n === 0) firstRanks[rank]!++;
                const candidates = possibilities(q, visible);
                expect(candidates).toHaveLength(1);
                expect(identity(q.choices[candidates[0]!]!)).toBe(identity(q.sequence[rank]!));
            }
        }
        for (const count of ranks) expect(count / 1800).toBeGreaterThanOrEqual(.15);
        for (const count of firstRanks) expect(count / 300).toBeGreaterThanOrEqual(.15);
        expect(ranks.slice(1).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    }
}, 30_000);
it('growing choices straddle the independently inferred answer on 300 seeds', () => {
    let largest = 0, questions = 0;
    for (let seed = 0; seed < 300; seed++) for (const q of generateRound(10, seed)) {
        const possible = possibilities(q, q.sequence.findIndex(p => p === null));
        expect(possible).toHaveLength(1);
        const target = q.choices[possible[0]!]!.dots;
        const distractors = q.choices.filter((_, i) => i !== possible[0]).map(p => p.dots);
        expect(distractors.some(n => n < target)).toBe(true);
        expect(distractors.some(n => n > target)).toBe(true);
        largest += Number(distractors.every(n => n < target)); questions++;
    }
    expect(largest / questions).toBeLessThanOrEqual(.4);
});
it('exact French and English object vocabulary and rendered descriptive attributes', () => {
    const vocabulary = {
        fr: { colors: ['rouge', 'bleu', 'jaune', 'vert', 'violet', 'orange'], shapes: ['perle', 'triangle', 'carré', 'fleur', 'étoile', 'lune', 'points'] },
        en: { colors: ['red', 'blue', 'yellow', 'green', 'purple', 'orange'], shapes: ['bead', 'triangle', 'square', 'flower', 'star', 'moon', 'dots'] }
    };
    for (const locale of ['fr', 'en'] as const) {
        expect(Object.values(colorNames[locale])).toEqual(vocabulary[locale].colors);
        expect(Object.values(shapeNames[locale])).toEqual(vocabulary[locale].shapes);
        for (const [shapeIndex, shape] of (['perle', 'triangle', 'carre', 'fleur', 'etoile', 'lune'] as const).entries()) {
            for (const [colorIndex, color] of (['rouge', 'bleu', 'jaune', 'vert', 'violet', 'orange'] as const).entries()) {
                const label = `${vocabulary[locale].shapes[shapeIndex]}, ${vocabulary[locale].colors[colorIndex]}`;
                expect(name({ shape, color, dots: 0 }, locale)).toBe(label);
                expect(itemSvg({ shape, color, dots: 0 }, locale)).toContain(`aria-label="${label}"`);
            }
        }
        for (let dots = 1; dots <= 8; dots++) expect(name({ shape: 'points', color: 'bleu', dots }, locale)).toBe(`${dots} ${vocabulary[locale].shapes[6]}`);
        for (let level = 1; level <= 10; level++) {
            const html = gameView(start(level, 42), locale, false);
            const tags = [...html.matchAll(/<[^>]+data-item="([^"]+)"[^>]*>/g)];
            expect(tags.length).toBeGreaterThan(0);
            for (const [tag, item] of tags) {
                const [shape, color, dots] = item!.split(':');
                expect(tag).toContain(`data-shape="${shape}"`);
                expect(tag).toContain(`data-color="${color}"`);
                expect(tag).toContain(`data-dots="${dots}"`);
            }
        }
    }
});
it('base hint remains visible after the first correct double placement', () => {
    const initial = start(9, 14), q = initial.questions[0]!;
    const wrong = (q.answer + 1) % q.choices.length;
    const twice = answer(answer(initial, wrong).state, wrong);
    expect(twice.hint).toBe(true);
    const partial = answer(twice.state, q.answers[0]!).state;
    expect(partial.placed).toHaveLength(1); expect(partial.solved).toBe(false);
    for (const state of [twice.state, partial]) {
        const slots = [...gameView(state, 'fr', true).matchAll(/<div data-slot="(\d+)"[^>]*class="([^"]*)"/g)];
        expect(slots.filter(([, , classes]) => classes!.split(' ').includes('suites-base')).map(([, i]) => Number(i))).toEqual([0, 1, 2]);
    }
});
