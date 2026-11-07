import { expect, it } from 'vitest';
import { complete, FIELD, HINT_AFTER, isUnlocked, itemAt, kinds, levels, parseRecords, props, scenes, stars, start, tap, TARGET_CLEARANCE, type State } from '../src/engines/cherche';
import { names, propUrl } from '../src/games/cherche/items';
import { fieldSvg, gameView, levelView } from '../src/games/cherche/view';

const SEEDS = 200;
it('twelve distinct levels, harder step by step', () => {
    expect(levels.map(l => l.id)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    const keys = levels.map(l => `${l.find}/${l.decoys}/${l.size}/${l.covered}`);
    expect(new Set(keys).size).toBe(levels.length);
    for (let i = 1; i < levels.length; i++) {
        const a = levels[i - 1]!, b = levels[i]!;
        // Never easier: as many objects to find and in the way, never larger, never fewer hidden in the grass; and something changes.
        expect(b.find).toBeGreaterThanOrEqual(a.find); expect(b.decoys).toBeGreaterThanOrEqual(a.decoys);
        expect(b.size).toBeLessThan(a.size); expect(b.covered).toBeGreaterThanOrEqual(a.covered);
        expect(b.covered).toBeLessThanOrEqual(b.find);
    }
    expect(levels.at(-1)!.find + levels.at(-1)!.decoys).toBeLessThanOrEqual(kinds.length);
});
it('every kind has a picture and a French and English name', () => {
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const kind of kinds) { expect(names.fr[kind].length).toBeGreaterThan(1); expect(names.en[kind].length).toBeGreaterThan(1); }
    for (const p of props) expect(propUrl[p]).toMatch(new RegExp(`cherche-${p}\\.webp`));
});
/** Every target can be found: the disc of radius TARGET_CLEARANCE / 2 around its centre answers only to it. */
function solvable(s: State): void {
    const spec = levels[s.level - 1]!;
    const targets = s.items.filter(it => it.target);
    expect(targets).toHaveLength(spec.find);
    expect(s.items).toHaveLength(spec.find + spec.decoys);
    expect(targets.filter(it => it.covered)).toHaveLength(spec.covered);
    expect(new Set(s.items.map(it => it.kind)).size).toBe(s.items.length);
    expect(scenes).toContain(s.scene);
    for (const it of s.items) {
        expect(it.x - it.size / 2).toBeGreaterThanOrEqual(0); expect(it.x + it.size / 2).toBeLessThanOrEqual(FIELD.width);
        expect(it.y - it.size / 2).toBeGreaterThanOrEqual(0); expect(it.y + it.size / 2).toBeLessThanOrEqual(FIELD.height);
    }
    for (const [i, it] of s.items.entries()) {
        if (!it.target) { expect(itemAt(s, it)).toBe(i); continue; }
        for (const other of s.items) if (other !== it) expect(Math.hypot(other.x - it.x, other.y - it.y)).toBeGreaterThanOrEqual(TARGET_CLEARANCE);
        for (let a = 0; a < 8; a++) {
            const r = TARGET_CLEARANCE / 2 - .5, p = { x: it.x + Math.cos(a * Math.PI / 4) * r, y: it.y + Math.sin(a * Math.PI / 4) * r };
            expect(itemAt(s, p)).toBe(i);
        }
    }
    // Playing every target in order finishes the level with three stars.
    let state = s;
    for (const [i, it] of s.items.entries()) if (it.target) { const r = tap(state, it); expect(r.found).toBe(i); state = r.state; }
    expect(state.finished).toBe(true); expect(stars(state)).toBe(3);
}
it(`every level is solvable on ${SEEDS} seeds, deterministic, and no two levels deal the same scenes`, () => {
    const fingerprints = new Map<string, number>();
    for (const level of levels) for (let seed = 1; seed <= SEEDS; seed++) {
        const s = start(level.id, seed * 7919);
        expect(start(level.id, seed * 7919)).toEqual(s);
        solvable(s);
        const print = `${s.scene}|${s.items.map(it => `${it.kind}@${Math.round(it.x)},${Math.round(it.y)}${it.target ? '*' : ''}`).join(';')}`;
        expect(fingerprints.has(print), `level ${level.id} seed ${seed} repeats level ${fingerprints.get(print)}`).toBe(false);
        fingerprints.set(print, level.id);
    }
}, 120_000);
it('misses count, a hint shows after three misses in a row, an object already found is not a mistake', () => {
    let s = start(6, 42);
    const decoy = s.items.find(it => !it.target)!, target = s.items.findIndex(it => it.target);
    for (let i = 1; i < HINT_AFTER; i++) { s = tap(s, decoy).state; expect(s.hint).toBeNull(); }
    s = tap(s, { x: decoy.x, y: decoy.y }).state;
    expect(s.misses).toBe(HINT_AFTER); expect(s.hint).not.toBeNull(); expect(s.items[s.hint!]!.target).toBe(true);
    const found = tap(s, s.items[target]!); expect(found.found).toBe(target); expect(found.state.hint).toBeNull();
    expect(tap(found.state, s.items[target]!).state).toBe(found.state);
    expect(stars({ ...found.state, misses: 4 })).toBe(2); expect(stars({ ...found.state, misses: 5 })).toBe(1);
});
it('records unlock the next level and survive only valid values', () => {
    let s = start(1, 3); for (const it of s.items) if (it.target) s = tap(s, it).state;
    const records = complete({}, s); expect(records).toEqual({ 1: 3 });
    expect(isUnlocked(2, records)).toBe(true); expect(isUnlocked(3, records)).toBe(false);
    expect(complete(records, start(2, 3))).toEqual(records);
    expect(parseRecords(JSON.stringify({ 1: 3, 2: 0, 3: 1.5, 13: 2, x: 1, 4: '3', 5: 2 }))).toEqual({ 1: 3, 5: 2 });
    expect(parseRecords('{')).toEqual({}); expect(parseRecords(null)).toEqual({});
    expect(() => start(13, 1)).toThrow();
});
it('the views draw every object, the list of objects to find, and finite numbers', () => {
    const s = start(12, 5);
    for (const locale of ['fr', 'en'] as const) {
        const html = gameView(s, locale, 'x');
        expect(html.match(/data-item=/g)).toHaveLength(s.items.length);
        expect(html.match(/data-wanted=/g)).toHaveLength(levels[11]!.find);
        expect(html.match(/data-grass/g)).toHaveLength(levels[11]!.covered);
        expect(html).not.toMatch(/NaN|undefined|Infinity/);
        expect(levelView({ 1: 3 }, locale).match(/data-cherche-level=/g)).toHaveLength(12);
    }
    expect(fieldSvg({ ...s, hint: 0 }, 'fr')).toContain('data-hint');
});
