import { describe, expect, it } from 'vitest';
import { advance, answer, drop, generateRound, levels, start, type Question } from '../src/engines/sons';
import { readSave } from '../src/shell/storage';
// Literal copy of the ten original levels: records are stored by id, so they must never change.
const original = [
    { id: 1, mode: 'image-lettre', choices: 2, lowercase: false },
    { id: 2, mode: 'image-lettre', choices: 3, lowercase: false },
    { id: 3, mode: 'image-lettre', choices: 4, lowercase: false },
    { id: 4, mode: 'image-lettre', choices: 4, lowercase: true },
    { id: 5, mode: 'lettre-image', choices: 3, lowercase: false },
    { id: 6, mode: 'lettre-image', choices: 3, lowercase: true },
    { id: 7, mode: 'son-lettre', choices: 3, lowercase: false },
    { id: 8, mode: 'son-lettre', choices: 4, lowercase: true },
    { id: 9, mode: 'trier', choices: 2, lowercase: false },
    { id: 10, mode: 'trier', choices: 2, lowercase: true }
];
const config = (l: typeof levels[number]): string => JSON.stringify({ ...l, id: undefined });
/** What the child actually faces, read from generated questions rather than from the table. */
const fingerprint = (level: number): string => {
    const seen = new Set<string>();
    for (const locale of ['fr', 'en'] as const) for (let seed = 0; seed < 50; seed++) for (const q of generateRound(level, seed, locale)) {
        seen.add(`${q.mode}|letters ${q.letters.length}|images ${q.mode === 'lettre-image' || q.mode === 'trier' ? q.choices.length : 1}|boxes ${q.boxes.length}|${q.lowercase ? 'abc' : 'ABC'}`);
    }
    return [...seen].sort().join(';');
};
/** Independent check that a question can be solved, then solved through the pure engine. */
function playable(q: Question): string[] {
    const problems: string[] = [];
    if (q.mode === 'trier') {
        if (new Set(q.boxes).size !== q.boxes.length) problems.push('duplicate boxes');
        if (new Set(q.choices.map(w => w.word)).size !== q.choices.length) problems.push('duplicate images');
        for (const w of q.choices) if (q.boxes.filter(b => b === w.initial).length !== 1) problems.push(`no unique box for ${w.word}`);
        for (const b of q.boxes) if (!q.choices.some(w => w.initial === b)) problems.push(`empty box ${b}`);
    } else {
        const options = q.mode === 'lettre-image' ? q.choices.map(w => w.initial) : q.letters;
        if (new Set(options).size !== options.length) problems.push('duplicate options');
        if (options.filter(o => o === q.target.initial).length !== 1) problems.push('answer not unique');
        if (options[q.answer] !== q.target.initial) problems.push('answer misplaced');
    }
    return problems;
}
describe('sons: doubled levels', () => {
    it('twenty contiguous levels, the first ten unchanged', () => {
        expect(levels).toHaveLength(2 * original.length);
        expect(levels.map(l => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
        expect(levels.slice(0, 10)).toEqual(original);
    });
    it('new records survive a reload, beyond the last level they are dropped', () => {
        const save = readSave({ getItem: () => JSON.stringify({ version: 1, locale: 'fr', voice: true, sound: true, records: {}, sonsRecords: { 11: 2, 20: 3, 21: 3 } }), setItem: () => undefined });
        expect(save.sonsRecords).toEqual({ 11: 2, 20: 3 });
    });
    it('no two levels share a configuration or play the same way', () => {
        const configs = levels.map(config);
        expect(new Set(configs).size).toBe(levels.length);
        const prints = levels.map(l => fingerprint(l.id));
        for (const [i, a] of prints.entries()) for (const [j, b] of prints.entries()) if (i < j) expect(a, `levels ${i + 1} and ${j + 1}`).not.toBe(b);
    });
    it('every question of every level is solvable on 200 seeds in both languages', () => {
        const failures: string[] = [];
        for (const level of levels) for (const locale of ['fr', 'en'] as const) for (let seed = 0; seed < 200; seed++) {
            let s = start(level.id, seed, locale);
            for (const q of s.questions) {
                failures.push(...playable(q).map(p => `${level.id}/${locale}/${seed}: ${p}`));
                if (q.mode === 'trier') for (const [piece, w] of q.choices.entries()) s = drop(s, piece, q.boxes.indexOf(w.initial)).state;
                else s = answer(s, q.answer).state;
                if (!s.solved) failures.push(`${level.id}/${locale}/${seed}: engine refuses the solution`);
                s = advance(s);
            }
            if (!s.finished || s.firstTry !== 6) failures.push(`${level.id}/${locale}/${seed}: round not completed`);
        }
        expect(failures).toEqual([]);
    }, 120_000);
    it('difficulty never decreases within a mode, and each new level offers more than every original one of its mode', () => {
        for (const mode of new Set(levels.map(l => l.mode))) {
            const sequence = levels.filter(l => l.mode === mode);
            // Number of letters, images or boxes first; lowercase reading is the harder variant at equal count.
            for (const [i, l] of sequence.slice(1).entries()) {
                const before = sequence[i]!;
                expect(l.choices > before.choices || l.choices === before.choices && Number(l.lowercase) >= Number(before.lowercase), `${mode} level ${l.id}`).toBe(true);
            }
            const oldMax = Math.max(...original.filter(l => l.mode === mode).map(l => l.choices));
            for (const l of sequence.filter(l => l.id > 10)) expect(l.choices, `level ${l.id}`).toBeGreaterThan(oldMax);
        }
        // The summit levels ask for the most letters or images of the whole game.
        expect(levels.slice(-2).every(l => l.choices === Math.max(...levels.map(m => m.choices)))).toBe(true);
    });
});
