import { expect, it, vi } from 'vitest';
import { advance, answer, complete, DECOY_SCENE, generateRound, isUnlocked, layoutObjects, levels, start, type Level, type Question } from '../src/engines/compter';
import { gameView, instruction, levelView } from '../src/games/compter/view';
import { fresh } from '../src/shell/storage';

// Literal copy of the eight original levels: records are stored by id, they must never move.
const original = [
    { id: 1, mode: 'combien', max: 3 }, { id: 2, mode: 'combien', max: 5 },
    { id: 3, mode: 'combien', max: 10 }, { id: 4, mode: 'remplir', max: 5 },
    { id: 5, mode: 'remplir', max: 10 }, { id: 6, mode: 'plus', max: 5, comparison: 'more' },
    { id: 7, mode: 'plus', max: 10, comparison: 'more' }, { id: 8, mode: 'plus', max: 10, comparison: 'less' }
];
// FNV-1a of the 50 first seeded rounds of each original level, recorded before the new rules were added.
const originalRounds = ['152ca211', 'dea3754e', 'cfbd47ca', 'fcd1cbee', 'ac8a838a', '6b1f3c55', '1f83cdc2', 'a5a309dc'];
const fnv = (s: string): string => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
const range = (l: Level): [number, number] => [l.min ?? 1, l.max];

it('sixteen levels, contiguous ids, the eight originals unchanged in configuration and in generated rounds', () => {
    expect(levels).toHaveLength(16);
    expect(levels.map(l => l.id)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(levels.slice(0, 8)).toEqual(original);
    expect(original.map(l => { let all = ''; for (let seed = 0; seed < 50; seed++) all += JSON.stringify(generateRound(l.id, seed)); return fnv(all); })).toEqual(originalRounds);
});

/** What a child actually meets: task, rule, quantities and wrong-card offsets — not the object pictures. */
function fingerprint(level: number): string[] {
    const tasks = new Set<string>();
    for (let seed = 0; seed < 50; seed++) for (const q of generateRound(level, seed)) {
        const task = q.decoy ? 'decoy' : q.mode === 'plus' ? q.comparison! : q.mode;
        const detail = q.mode === 'combien' ? q.choices.map(n => n - q.target).sort((a, b) => a - b).join(',') : q.mode === 'plus' ? `${Math.min(q.left, q.right)}-${Math.max(q.left, q.right)}` : '';
        tasks.add(`${task}:${q.target}:${detail}`);
    }
    return [...tasks].sort();
}
it('no two levels share a configuration or play alike', () => {
    const configs = levels.map(l => JSON.stringify(Object.entries(l).filter(([key]) => key !== 'id').sort()));
    expect(new Set(configs).size).toBe(levels.length);
    const prints = levels.map(l => JSON.stringify(fingerprint(l.id)));
    for (let a = 0; a < levels.length; a++) for (let b = a + 1; b < levels.length; b++) expect(prints[a], `levels ${a + 1} and ${b + 1}`).not.toBe(prints[b]);
});

function objectsOnScreen(q: Question): number { return q.mode === 'plus' ? q.left + q.right : q.mode === 'remplir' ? q.target : q.target + (q.decoy?.count ?? 0); }
for (const level of levels) it(`level ${level.id}: every round over 200 seeds is playable`, () => {
    const failures = new Set<string>();
    const [min, max] = range(level);
    for (let seed = 0; seed < 200; seed++) {
        const round = generateRound(level.id, seed);
        if (round.length !== 6) failures.add('length');
        if (level.mode === 'melange') {
            const tasks = new Set(round.map(q => q.decoy ? 'decoy' : q.mode === 'plus' ? q.comparison : q.mode));
            if (tasks.size !== 5) failures.add('review covers every task');
        } else if (round.some(q => q.mode !== level.mode || q.comparison !== level.comparison || Boolean(q.decoy) !== Boolean(level.decoys))) failures.add('mode');
        for (const [i, q] of round.entries()) {
            const [low, high] = q.decoy ? [3, 7] : [min, max];
            if (q.target < low || q.target > high) failures.add('target range');
            if (i && round[i - 1]!.target === q.target) failures.add('adjacent');
            if (q.mode === 'combien') {
                if (q.choices.length !== 3 || new Set(q.choices).size !== 3 || q.choices.filter(n => n === q.target).length !== 1 || q.answer !== q.target) failures.add('one right card among three');
                if (q.choices.some(n => n < low || n > high || Math.abs(n - q.target) > 2)) failures.add('wrong cards');
                if (level.close && [q.target - 1, q.target + 1].some(n => n >= low && n <= high && !q.choices.includes(n))) failures.add('close neighbours');
            }
            if (q.mode === 'remplir' && (q.reserve < q.target + 2 || q.reserve > q.target + 4)) failures.add('reserve');
            if (q.mode === 'plus') {
                if (q.left === q.right || Math.min(q.left, q.right) < min || Math.max(q.left, q.right) > max) failures.add('baskets');
                if (q.answer !== ((q.comparison === 'less' ? q.left < q.right : q.left > q.right) ? 0 : 1)) failures.add('comparison answer');
                if (level.gap && Math.abs(q.left - q.right) > level.gap) failures.add('gap');
            }
            if (q.decoy) {
                if (q.decoy.object === q.object || q.target + q.decoy.count !== DECOY_SCENE) failures.add('decoy scene');
                // The rendered scene is the oracle: count the counted kind among all drawn objects.
                const html = gameView({ level: level.id, questions: [q], index: 0, errors: 0, firstTry: 0, solved: false, basket: 0, finished: false }, 'fr', 'joie', false);
                if ([...html.matchAll(/data-kind="(\w+)"/g)].filter(m => m[1] === q.object).length !== q.target) failures.add('rendered count');
                if ([...html.matchAll(/data-object=/g)].length !== DECOY_SCENE) failures.add('rendered total');
            }
            // Every drawn scene must fit the 280×216 area without overlap (layoutObjects throws otherwise).
            for (const n of q.mode === 'plus' ? [q.left, q.right] : q.mode === 'combien' ? [objectsOnScreen(q)] : []) {
                try { if (layoutObjects(n, 280, 216, q.seed).length !== n) failures.add('layout'); } catch { failures.add('layout'); }
            }
        }
    }
    expect([...failures]).toEqual([]);
});

/** Hardening rules carried by a configuration: large quantities, close cards, close baskets, decoys, mixed review. */
function hardness(l: Level): number {
    return Number((l.min ?? 1) >= 6 || Boolean(l.decoys)) + Number(Boolean(l.close)) + Number(Boolean(l.gap)) + Number(Boolean(l.decoys) || l.mode === 'melange') + Number(l.mode === 'melange');
}
it('difficulty never decreases across the new levels', () => {
    const added = levels.slice(8);
    expect(added.map(hardness)).toEqual([1, 1, 1, 2, 2, 2, 3, 5]);
    for (let i = 1; i < added.length; i++) expect(hardness(added[i]!)).toBeGreaterThanOrEqual(hardness(added[i - 1]!));
    // Measured, not declared: every new question puts at least six objects in front of the child, more than the
    // smallest scene of any original level.
    for (const l of added) for (let seed = 0; seed < 50; seed++) for (const q of generateRound(l.id, seed)) expect(objectsOnScreen(q), `level ${l.id}`).toBeGreaterThanOrEqual(6);
});

it('every new level finishes, unlocks the next one, and the last has no next button', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    for (const l of levels.slice(8)) {
        let s = start(l.id, 5);
        for (let i = 0; i < 6; i++) { s = answer(s, -1).state; s = answer(s, s.questions[s.index]!.answer).state; s = advance(s); }
        expect(s.finished).toBe(true);
        const records = complete({}, s);
        expect(records[l.id]).toBe(1); expect(isUnlocked(l.id + 1, records)).toBe(true);
        expect(gameView(s, 'fr', 'joie', false).includes('id="next"')).toBe(l.id < 16);
    }
    const grid = levelView({ ...fresh(), records: Object.fromEntries(levels.map(l => [l.id, 3])) });
    expect([...grid.matchAll(/data-level="(\d+)"/g)].map(m => Number(m[1]))).toEqual(levels.map(l => l.id));
    expect(grid).not.toContain('disabled');
    vi.unstubAllGlobals();
});

it('decoy instructions name the counted kind in both languages', () => {
    const q = generateRound(15, 3)[0]!;
    expect(q.decoy).toBeDefined();
    const plural = { fr: { apple: 'pommes', pear: 'poires', berry: 'fraises', carrot: 'carottes', star: 'étoiles', fish: 'poissons', flower: 'fleurs' }, en: { apple: 'apples', pear: 'pears', berry: 'strawberries', carrot: 'carrots', star: 'stars', fish: 'fish', flower: 'flowers' } };
    for (const object of Object.keys(plural.fr) as Question['object'][]) {
        expect(instruction({ ...q, object }, 'fr')).toBe(`Combien de ${plural.fr[object]} y a-t-il ?`);
        expect(instruction({ ...q, object }, 'en', true)).toBe(`How many ${plural.en[object]} are there?`);
    }
});
