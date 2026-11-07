import { describe, expect, it } from 'vitest';
import { advance, answer, generateRound, levels, start, type Item, type Question } from '../src/engines/suites';
import { readSave } from '../src/shell/storage';
// Literal copy of the ten original levels: records are stored by id, so they must never change.
const original = [
    { id: 1, mode: 'suivant', pattern: 'AB', choices: 3 },
    { id: 2, mode: 'suivant', pattern: 'AAB', choices: 3 },
    { id: 3, mode: 'suivant', pattern: 'ABB', choices: 4 },
    { id: 4, mode: 'suivant', pattern: 'ABC', choices: 4 },
    { id: 5, mode: 'suivant', pattern: 'AABB', choices: 4 },
    { id: 6, mode: 'suivant', pattern: 'ABCD', choices: 4 },
    { id: 7, mode: 'trou', pattern: 'ABC', choices: 4 },
    { id: 8, mode: 'trou', pattern: 'AABB', choices: 4 },
    { id: 9, mode: 'deux-suivants', pattern: 'ABC', choices: 4 },
    { id: 10, mode: 'croissant', pattern: '', choices: 4 }
];
const identity = (p: Item): string => `${p.shape}:${p.color}:${p.dots}`;
/** Letters of the visible base motif, rebuilt from the drawn items (AABC, ABAC…). */
const motif = (q: Question): string => {
    const seen: string[] = [];
    return q.pattern.map(p => { if (!seen.includes(identity(p))) seen.push(identity(p)); return String.fromCharCode(65 + seen.indexOf(identity(p))); }).join('');
};
const fingerprint = (level: number): string => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 50; seed++) for (const q of generateRound(level, seed)) {
        const dots = q.sequence.filter((p): p is Item => p !== null && p.shape === 'points').map(p => p.dots);
        const direction = dots.length > 1 ? Math.sign(dots[1]! - dots[0]!) : 0;
        seen.add(`${q.mode}|${motif(q)}|dots ${direction}|slots ${q.slots.length}|choices ${q.choices.length}`);
    }
    return [...seen].sort().join(';');
};
/** Independent solver: fills holes from left to right, as the child does, by enumerating
 * every base motif of period 1–4 (or the ±1 dot rule) compatible with what is visible. */
function solve(q: Question): number[][] {
    const sequence = [...q.sequence], found: number[][] = [];
    for (const slot of q.slots) {
        const shown = sequence.flatMap((p, i) => p ? [{ p, i }] : []);
        let fits: (p: Item) => boolean;
        if (shown.every(s => s.p.shape === 'points') && (q.mode === 'croissant' || q.mode === 'decroissant')) {
            const step = (shown[1]!.p.dots - shown[0]!.p.dots) / (shown[1]!.i - shown[0]!.i);
            if (!shown.every(s => s.p.dots === shown[0]!.p.dots + (s.i - shown[0]!.i) * step)) return [];
            fits = p => p.shape === 'points' && p.dots === shown[0]!.p.dots + (slot - shown[0]!.i) * step;
        } else {
            const alphabet = [...new Set([...shown.map(s => identity(s.p)), ...q.choices.map(identity)])], possible = new Set<string>();
            for (let period = 1; period <= 4; period++) {
                const enumerate = (base: string[]): void => {
                    if (base.length === period) { if (shown.every(s => identity(s.p) === base[s.i % period])) possible.add(base[slot % period]!); return; }
                    for (const value of alphabet) enumerate([...base, value]);
                };
                enumerate([]);
            }
            fits = p => possible.has(identity(p));
        }
        const matches = q.choices.flatMap((p, i) => fits(p) ? [i] : []);
        found.push(matches);
        if (matches.length === 1) sequence[slot] = q.choices[matches[0]!]!;
    }
    return found;
}
describe('suites: doubled levels', () => {
    it('twenty contiguous levels, the first ten unchanged', () => {
        expect(levels).toHaveLength(2 * original.length);
        expect(levels.map(l => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
        expect(levels.slice(0, 10)).toEqual(original);
    });
    it('new records survive a reload, beyond the last level they are dropped', () => {
        const save = readSave({ getItem: () => JSON.stringify({ version: 1, locale: 'fr', voice: true, sound: true, records: {}, suitesRecords: { 11: 2, 20: 3, 21: 3 } }), setItem: () => undefined });
        expect(save.suitesRecords).toEqual({ 11: 2, 20: 3 });
    });
    it('no two levels share a configuration or play the same way', () => {
        const configs = levels.map(l => JSON.stringify({ mode: l.mode, pattern: l.pattern, choices: l.choices, holes: l.holes ?? 1 }));
        expect(new Set(configs).size).toBe(levels.length);
        const prints = levels.map(l => fingerprint(l.id));
        for (const [i, a] of prints.entries()) for (const [j, b] of prints.entries()) if (i < j) expect(a, `levels ${i + 1} and ${j + 1}`).not.toBe(b);
    });
    it('every question of every level has exactly one offered continuation per slot on 200 seeds', () => {
        const failures: string[] = [];
        for (const level of levels) for (let seed = 0; seed < 200; seed++) {
            let s = start(level.id, seed);
            for (const [n, q] of s.questions.entries()) {
                const where = `${level.id}/${seed}/${n}`;
                if (new Set(q.choices.map(identity)).size !== q.choices.length) failures.push(`${where}: duplicate choices`);
                if (q.slots.some(slot => q.sequence[slot] !== null)) failures.push(`${where}: visible slot`);
                const found = solve(q);
                if (found.length !== q.slots.length || found.some((m, i) => m.length !== 1 || m[0] !== q.answers[i])) failures.push(`${where}: ${JSON.stringify(found)} vs ${JSON.stringify(q.answers)}`);
                for (const choice of q.answers) s = answer(s, choice).state;
                if (!s.solved) failures.push(`${where}: engine refuses the solution`);
                s = advance(s);
            }
            if (!s.finished || s.firstTry !== 6) failures.push(`${level.id}/${seed}: round not completed`);
        }
        expect(failures).toEqual([]);
    }, 120_000);
    it('difficulty never decreases over the new levels and starts at the hardest original single-answer level', () => {
        // Indicator: answers to find per question, then offered choices. The shrinking count (13)
        // is a new rule with one answer and four choices, the same weight as its neighbours.
        const weight = (l: typeof levels[number]): number => 10 * (l.mode === 'deux-suivants' ? 2 : l.holes ?? 1) + l.choices;
        const fresh = levels.slice(10);
        for (const [i, l] of fresh.slice(1).entries()) expect(weight(l), `level ${l.id}`).toBeGreaterThanOrEqual(weight(fresh[i]!));
        expect(Math.min(...fresh.map(weight))).toBeGreaterThanOrEqual(Math.max(...original.filter(l => l.mode !== 'deux-suivants').map(l => weight(l as typeof levels[number]))));
        // Every new periodic level uses a four-symbol motif, the longest of the original series.
        for (const l of fresh.filter(l => l.pattern)) expect(l.pattern, `level ${l.id}`).toHaveLength(4);
        // The last level asks for two answers among five choices, the most of the whole game.
        expect(weight(levels.at(-1)!)).toBe(Math.max(...levels.map(weight)));
    });
});
