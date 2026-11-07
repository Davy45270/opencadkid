import { describe, expect, it } from 'vitest';
import { advance, generateRound, levels, place, start, type ObjectItem, type Question } from '../src/engines/ranger';
import { readSave } from '../src/shell/storage';
// Literal copy of the eight original levels: records are stored by id, so they must never change.
const original = [
    { id: 1, rule: 'color', bins: 2 }, { id: 2, rule: 'shape', bins: 2 },
    { id: 3, rule: 'size', bins: 2 }, { id: 4, rule: 'category', bins: 2 },
    { id: 5, rule: 'color', bins: 3 }, { id: 6, rule: 'category', bins: 3 },
    { id: 7, rule: 'two', bins: 2 }, { id: 8, rule: 'intrus', bins: 2 }
];
/** Authored sorting predicate, independent of the engine's `belongs`. */
function home(q: Question, o: ObjectItem): string[] {
    if (q.rule === 'two') return [o.color === q.color && o.category === q.category ? 'oui' : 'non'];
    if (q.rule === 'intrus') return [o.category === q.category ? 'ensemble' : 'intrus'];
    const value = { color: o.color, shape: o.shape, size: o.size, category: o.category }[q.rule];
    return q.bins.filter(b => b === value);
}
const colours = (objects: ObjectItem[]): Set<string> => new Set(objects.map(o => o.color));
/** Colour lure: no bin is a single colour and no colour belongs to a single bin. */
function lure(q: Question): boolean {
    if (q.rule === 'intrus') {
        const family = q.objects.filter(o => o.category === q.category), intruder = q.objects.find(o => o.category !== q.category)!;
        return colours(family).size >= 2 && family.some(o => o.color === intruder.color);
    }
    const bins = q.bins.map(b => q.objects.filter(o => home(q, o)[0] === b));
    return bins.every(m => colours(m).size >= 2) && [...colours(q.objects)].every(c => bins.filter(m => m.some(o => o.color === c)).length >= 2);
}
const fingerprint = (level: number): string => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 50; seed++) for (const q of generateRound(level, seed, 6)) {
        seen.add(`${q.rule}|bins ${q.rule === 'intrus' ? 0 : q.bins.length}|objects ${q.objects.length}|${q.rule === 'color' ? 'colour rule' : lure(q) ? 'lure' : colours(q.objects).size === 1 ? 'one colour' : 'clues'}`);
    }
    return [...seen].sort().join(';');
};
describe('ranger: doubled levels', () => {
    it('sixteen contiguous levels, the first eight unchanged', () => {
        expect(levels).toHaveLength(2 * original.length);
        expect(levels.map(l => l.id)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
        expect(levels.slice(0, 8)).toEqual(original);
    });
    it('new records survive a reload, beyond the last level they are dropped', () => {
        const save = readSave({ getItem: () => JSON.stringify({ version: 1, locale: 'fr', voice: true, sound: true, records: {}, rangerRecords: { 9: 2, 16: 3, 17: 3 } }), setItem: () => undefined });
        expect(save.rangerRecords).toEqual({ 9: 2, 16: 3 });
    });
    it('no two levels share a configuration or play the same way', () => {
        const configs = levels.map(l => JSON.stringify({ rule: l.rule, bins: l.bins, objects: l.objects ?? (l.bins === 3 ? 6 : 4), mixed: l.mixed ?? false }));
        expect(new Set(configs).size).toBe(levels.length);
        const prints = levels.map(l => fingerprint(l.id));
        for (const [i, a] of prints.entries()) for (const [j, b] of prints.entries()) if (i < j) expect(a, `levels ${i + 1} and ${j + 1}`).not.toBe(b);
    });
    it('every question of every level is solvable on 200 seeds, mixed levels always lure', () => {
        const failures: string[] = [];
        for (const level of levels) for (let seed = 0; seed < 200; seed++) {
            let s = start(level.id, seed);
            for (const [n, q] of s.questions.entries()) {
                const where = `${level.id}/${seed}/${n}`;
                if (new Set(q.objects.map(o => o.id)).size !== q.objects.length) failures.push(`${where}: duplicate object`);
                for (const o of q.objects) if (home(q, o).length !== 1) failures.push(`${where}: ${o.id} has no single bin`);
                for (const b of q.bins) if (!q.objects.some(o => home(q, o)[0] === b)) failures.push(`${where}: empty bin ${b}`);
                if (q.rule === 'intrus' && q.objects.filter(o => o.category !== q.category).length !== 1) failures.push(`${where}: intruders`);
                if (level.mixed && !lure(q)) failures.push(`${where}: colours give the answer away`);
                if (!level.mixed && q.rule !== 'color' && q.rule !== 'two' && colours(q.objects).size !== 1) failures.push(`${where}: colours should be shared`);
                for (const o of q.objects) if (q.rule !== 'intrus' || o.category !== q.category) s = place(s, o.id, home(q, o)[0]!).state;
                if (!s.solved) failures.push(`${where}: engine refuses the solution`);
                s = advance(s);
            }
            if (!s.finished || s.firstTry !== 6) failures.push(`${level.id}/${seed}: round not completed`);
        }
        expect(failures).toEqual([]);
    }, 120_000);
    it('difficulty never decreases over the new levels and each rule gets more objects or a colour lure', () => {
        // Indicator: objects to examine, then the colour lure that no longer helps.
        const weight = (l: typeof levels[number]): number => 2 * (l.objects ?? (l.bins === 3 ? 6 : 4)) + Number(l.mixed ?? false);
        const fresh = levels.slice(8);
        for (const [i, l] of fresh.slice(1).entries()) expect(weight(l), `level ${l.id}`).toBeGreaterThanOrEqual(weight(fresh[i]!));
        for (const l of fresh) {
            const before = levels.filter(o => o.id < l.id && o.rule === l.rule && (o.rule === 'intrus' || o.bins === l.bins));
            // Category with three bins (14) already had six objects at level 6: it differs by its colour lure.
            for (const o of before) expect(weight(l), `level ${l.id} after ${o.id}`).toBeGreaterThan(weight(o));
        }
    });
});
