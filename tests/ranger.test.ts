import { afterEach, expect, it, vi } from 'vitest';
import { advance, catalog, complete, generateRound, isUnlocked, levels, place, start, stars, type ObjectItem, type Question } from '../src/engines/ranger';
import { objectSvg, labels, pic } from '../src/games/ranger/items';
import { gameView, instruction, levelView } from '../src/games/ranger/view';
import { bindAction, resetActivations } from '../src/shell/activation';
import { placementKey } from '../src/games/ranger/interaction';
import { patternActivationKey } from '../src/games/suites/interaction';
import * as suites from '../src/engines/suites';
import { fresh, readSave, writeSave } from '../src/shell/storage';
import { validSvg } from './svg-oracles';
/** Independent predicate: never imports belongs or consumes an engine answer. */
function oracle(q: Question, o: ObjectItem, bin: string): boolean {
    switch (q.rule) {
        case 'color': return o.color === bin;
        case 'shape': return o.shape === bin;
        case 'size': return o.size === bin;
        case 'category': return o.category === bin;
        case 'two': return (o.color === q.color && o.category === q.category) === (bin === 'oui');
        case 'intrus': return (o.category !== q.category) === (bin === 'intrus');
    }
}
it('catalogue: complete attributes, unique identities and bilingual names', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(30);
    expect(new Set(catalog.map(o => o.kind)).size).toBeGreaterThanOrEqual(30);
    expect(new Set(catalog.map(o => o.id)).size).toBe(catalog.length);
    expect(new Set(catalog.map(o => [o.kind, o.color, o.size].join(':'))).size).toBe(catalog.length);
    for (const o of catalog) {
        expect(['rouge', 'vert', 'jaune']).toContain(o.color); expect(['rond', 'carre', 'long']).toContain(o.shape);
        expect(['petit', 'grand']).toContain(o.size); expect(['fruit', 'jouet', 'vetement', 'animal', 'cuisine']).toContain(o.category);
        expect(o.names.fr.trim()).not.toBe(''); expect(o.names.en.trim()).not.toBe('');
    }
});
const table = [['color', 2], ['shape', 2], ['size', 2], ['category', 2], ['color', 3], ['category', 3], ['two', 2], ['intrus', 2]];
it('independent eight-level table and invalid inputs', () => {
    expect(levels.map(l => [l.rule, l.bins])).toEqual(table);
    for (const level of [0, 9, 1.5, NaN]) expect(() => generateRound(level, 1)).toThrow();
    for (const count of [0, -1, 1.5, NaN]) expect(() => generateRound(1, 1, count)).toThrow();
});
for (let level = 1; level <= 8; level++) it(`level ${level}: 300 seeds, unique membership, occupied bins and no colour shortcut`, () => {
    for (let seed = 0; seed < 300; seed++) {
        const round = generateRound(level, seed);
        expect(round).toEqual(generateRound(level, seed)); expect(round).toHaveLength(4);
        for (const q of round) {
            expect(q.rule).toBe(table[level - 1]![0]); expect(q.bins).toHaveLength(Number(table[level - 1]![1]));
            expect(q.objects).toHaveLength(q.bins.length === 3 ? 6 : 4);
            expect(new Set(q.objects.map(o => o.id)).size).toBe(q.objects.length);
            for (const o of q.objects) expect(q.bins.filter(b => oracle(q, o, b))).toHaveLength(1);
            for (const bin of q.bins) {
                const members = q.objects.filter(o => oracle(q, o, bin)); expect(members.length).toBeGreaterThan(0);
                if (q.rule !== 'color') expect(members.some(o => q.objects.some(other => !oracle(q, other, bin) && other.color === o.color))).toBe(true);
            }
            if (q.rule === 'intrus') expect(q.objects.filter(o => o.category !== q.category)).toHaveLength(1);
            if (q.rule === 'two') {
                expect(q.objects.some(o => o.category === q.category && o.color !== q.color)).toBe(true);
                expect(q.objects.some(o => o.category !== q.category && o.color === q.color)).toBe(true);
            }
        }
    }
    expect(generateRound(level, 1)).not.toEqual(generateRound(level, 2));
}, 30_000);
it('pure placement, object-specific two-error hint, soft return, invalid and duplicate guards', () => {
    const initial = start(1, 42), snapshot = structuredClone(initial), q = initial.questions[0]!, a = q.objects[0]!, b = q.objects[1]!;
    const wrong = q.bins.find(bin => !oracle(q, a, bin))!, right = q.bins.find(bin => oracle(q, a, bin))!;
    const once = place(initial, a.id, wrong); expect(once).toMatchObject({ correct: false, returned: true, hint: false });
    expect(once.state.placed).toEqual([]); expect(advance(once.state)).toBe(once.state);
    const other = place(once.state, b.id, q.bins.find(bin => !oracle(q, b, bin))!); expect(other.hint).toBe(false);
    const twice = place(other.state, a.id, wrong); expect(twice.hint).toBe(true); expect(twice.state.hint).toBe(a.id);
    expect(twice.state.errors).toBe(3); expect(twice.state.objectErrors[a.id]).toBe(2); expect(initial).toEqual(snapshot);
    const placed = place(twice.state, a.id, right); expect(placed.state.hint).toBeNull(); expect(placed.state.placed).toEqual([a.id]);
    expect(place(placed.state, a.id, right).state).toBe(placed.state);
    for (const [id, bin] of [['missing', right], [a.id, 'missing']]) expect(place(initial, id!, bin!).state).toBe(initial);
});
it('common rewards, every level completes, lowest score unlocks and best score survives', () => {
    expect(Array.from({ length: 7 }, (_, n) => stars(n))).toEqual([1, 1, 1, 2, 2, 3, 3]);
    for (let level = 1; level <= 8; level++) for (const clean of [true, false]) {
        let s = start(level, 77); expect(complete({}, s)).toEqual({});
        for (let i = 0; i < 6; i++) {
            const q = s.questions[s.index]!;
            if (!clean) {
                const o = q.objects.find(o => q.rule !== 'intrus' || o.category === q.category)!;
                s = place(s, o.id, q.rule === 'intrus' ? 'intrus' : q.bins.find(b => !oracle(q, o, b))!).state;
            }
            for (const o of q.objects) {
                if (q.rule === 'intrus' && o.category === q.category) continue;
                s = place(s, o.id, q.bins.find(b => oracle(q, o, b))!).state;
            }
            expect(s.solved).toBe(true); const solved = s;
            expect(place(s, q.objects[0]!.id, q.bins[0]!).state).toBe(solved);
            s = advance(s);
        }
        expect(s.finished).toBe(true); expect(s.firstTry).toBe(clean ? 6 : 0);
        const records = complete({}, s); expect(records[level]).toBe(clean ? 3 : 1);
        expect(complete({ [level]: 3 }, s)[level]).toBe(3); expect(isUnlocked(level + 1, records)).toBe(true);
        expect(advance(s)).toBe(s);
    }
});
it('bilingual rules, hints and finite valid procedural illustrations', () => {
    expect(Object.keys(labels.fr).sort()).toEqual(Object.keys(labels.en).sort());
    for (const locale of ['fr', 'en'] as const) {
        expect(Object.values(labels[locale]).every(Boolean)).toBe(true);
        for (const o of catalog) { const drawing = objectSvg(o, locale); expect(validSvg(drawing)).toBe(true); expect(drawing).not.toMatch(/NaN|Infinity|undefined/); expect(drawing).toContain(o.names[locale]); }
        for (const key of ['rouge', 'vert', 'jaune', 'petit', 'grand', 'carre', 'rond', 'long', 'fruit', 'jouet', 'vetement', 'animal', 'cuisine', 'oui', 'non']) expect(validSvg(pic(key))).toBe(true);
        expect(levelView(fresh(locale))).toContain('data-level="8"');
        for (let level = 1; level <= 8; level++) {
            const s = start(level, 19), q = s.questions[0]!;
            expect(instruction(q, locale)).not.toBe(''); expect(gameView(s, locale)).not.toMatch(/NaN|Infinity|undefined/);
            for (const o of q.objects) for (const attr of ['color', 'shape', 'size', 'category'] as const) expect(gameView(s, locale)).toContain(`data-${attr}="${o[attr]}"`);
        }
    }
});
it('isolated records migrate, filter, round-trip and erase', () => {
    let raw = JSON.stringify({ ...fresh(), records: { 1: 3 }, rangerRecords: { 1: 2, 8: 3, 9: 2, 2: 0, 3: 1.5, 4: '3' } });
    const port = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
    const save = readSave(port); expect(save.rangerRecords).toEqual({ 1: 2, 8: 3 }); expect(save.records).toEqual({ 1: 3 });
    writeSave(port, save); expect(readSave(port)).toEqual(save);
    raw = JSON.stringify({ version: 1, locale: 'fr', voice: true, sound: true, records: { 1: 2 } });
    expect(readSave(port).rangerRecords).toEqual({}); expect(fresh().rangerRecords).toEqual({});
});
class Button extends EventTarget {
    onclick: ((event: Event & { detail: number }) => void) | null = null;
    getBoundingClientRect(): { x: number; y: number; width: number; height: number } { return { x: 0, y: 0, width: 100, height: 100 }; }
    tap(): void {
        for (const type of ['pointerdown', 'pointerup', 'click']) {
            const event = Object.assign(new Event(type), { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 50, clientY: 50, detail: 1 });
            this.dispatchEvent(event); if (type === 'click') this.onclick?.(event);
        }
    }
}
afterEach(() => vi.useRealTimers());
it('suites: selection A → slot 1 → selection B → slot 2 at zero milliseconds places twice', () => {
    vi.useFakeTimers({ toFake: ['performance'] }); resetActivations();
    let s = suites.start(9, 17), selected: number | undefined;
    const q = s.questions[0]!, buttons = [new Button(), new Button()];
    buttons.forEach(button => bindAction(button as unknown as HTMLElement, () => { s = suites.answer(s, selected!).state; selected = undefined; }, () => patternActivationKey(s, selected!)));
    selected = q.answers[0]!; buttons[0]!.tap(); selected = q.answers[1]!; buttons[1]!.tap();
    expect(s.placed).toEqual(q.answers); expect(s.solved).toBe(true); expect(s.index).toBe(0);
});
it('ranger: two distinct objects in the same bin at zero milliseconds both place', () => {
    vi.useFakeTimers({ toFake: ['performance'] }); resetActivations();
    let s = start(1, 19), selected: string | undefined;
    const q = s.questions[0]!, bin = q.bins[0]!, objects = q.objects.filter(o => oracle(q, o, bin)), button = new Button();
    bindAction(button as unknown as HTMLElement, () => { s = place(s, selected!, bin).state; selected = undefined; }, () => placementKey('ranger', s.level, s.index, bin, selected));
    selected = objects[0]!.id; button.tap(); selected = objects[1]!.id; button.tap();
    expect(s.placed).toEqual(objects.map(o => o.id));
});
