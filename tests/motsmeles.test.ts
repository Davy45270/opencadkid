import { describe, expect, it } from 'vitest';
import { makeRng } from '../src/engines/rng';
import { BLOCKED, complete, dictionary, generate, isUnlocked, levelOf, levels, line, parseRecords, place, problems, select, start, type Dir, type Grid, type State } from '../src/engines/motsmeles';

/** Oracle of the word-search game, written before its engine. It re-implements, outside the engine, the search of a word
 * in the eight directions and checks every grid against it: the engine is never asked whether its own grid is right. */
const D: Record<Dir, readonly [number, number]> = { E: [0, 1], W: [0, -1], S: [1, 0], N: [-1, 0], SE: [1, 1], SW: [1, -1], NE: [-1, 1], NW: [-1, -1] };
const ALL = Object.keys(D) as Dir[];
/** Every distinct set of cells that reads `word`, in any of the eight directions and either way. */
function occurrences(letters: readonly string[], size: number, word: string): string[] {
    const w = [...word], found = new Set<string>();
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) for (const d of ALL) {
        const cells: number[] = [];
        for (let k = 0; k < w.length; k++) {
            const rr = r + D[d][0] * k, cc = c + D[d][1] * k;
            if (rr < 0 || cc < 0 || rr >= size || cc >= size || letters[rr * size + cc] !== w[k]) break;
            cells.push(rr * size + cc);
        }
        if (cells.length === w.length) found.add([...cells].sort((a, b) => a - b).join(','));
    }
    return [...found];
}
const cellsOf = (g: Grid, i: number): number[] => {
    const p = g.placements[i]!;
    return [...p.word].map((_, k) => (p.row + D[p.dir][0] * k) * g.size + p.col + D[p.dir][1] * k);
};
const ends = (g: Grid, i: number): [number, number] => { const c = cellsOf(g, i); return [c[0]!, c[c.length - 1]!]; };
/** Everything a grid of `level` must be, checked without the engine. */
function independentProblems(g: Grid, levelId: number): string[] {
    const l = levelOf(levelId), out: string[] = [];
    if (g.size !== l.size || g.letters.length !== l.size * l.size) out.push('size');
    if (g.letters.some(x => [...x].length !== 1 || x !== x.normalize('NFC') || x !== x.toUpperCase() || !/^\p{L}$/u.test(x))) out.push('one upper-case NFC letter per cell');
    if (g.placements.length < l.minWords || g.placements.length > l.maxWords) out.push(`word count ${g.placements.length}`);
    if (new Set(g.placements.map(p => p.word)).size !== g.placements.length) out.push('a word twice in the list');
    const used = new Map<number, string>();
    g.placements.forEach((p, i) => {
        if (!l.dirs.includes(p.dir)) out.push(`${p.word}: direction ${p.dir}`);
        if (occurrences(g.letters, g.size, p.word).length !== 1) out.push(`${p.word}: ${occurrences(g.letters, g.size, p.word).length} occurrences`);
        const cells = cellsOf(g, i);
        if (cells.some(c => c < 0 || c >= g.size * g.size) || cells.some((c, k) => g.letters[c] !== [...p.word][k])) out.push(`${p.word}: not where placed`);
        for (const c of cells) { if (used.has(c) && !l.crossing) out.push(`${p.word} crosses ${used.get(c)}`); used.set(c, p.word); }
    });
    for (const bad of BLOCKED) if (occurrences(g.letters, g.size, bad).length) out.push(`blocked word ${bad}`);
    return out;
}
const SEEDS = 10_000;

describe('levels (spec § 2, MVP of § 18: three levels)', () => {
    it('Découverte 4×4 1–2 words E, Apprenti 5×5 2–3 E/S, Explorateur 6×6 3–4 E/S, no crossing, all open', () => {
        expect(levels.map(l => [l.id, l.size, l.minWords, l.maxWords, [...l.dirs].sort().join(''), l.crossing])).toEqual([
            [1, 4, 1, 2, 'E', false], [2, 5, 2, 3, 'ES', false], [3, 6, 3, 4, 'ES', false]]);
        for (const key of ['fr', 'en'] as const) expect(new Set(levels.map(l => l.name[key])).size).toBe(3);
        expect(levels.map(l => l.name.fr)).toEqual(['Découverte', 'Apprenti', 'Explorateur']);
        // Levels are indicative, not age barriers (§ 2): nothing is locked, even with no record at all.
        for (const l of levels) expect(isUnlocked({}, l.id)).toBe(true);
        expect(() => levelOf(4)).toThrow(RangeError);
    });
});

describe('dictionary (§ 5, § 13)', () => {
    it('upper-case NFC words of letters only, unique, with accents kept, enough for every level', () => {
        expect(dictionary.length).toBeGreaterThanOrEqual(40);
        expect(new Set(dictionary.map(e => e.word)).size).toBe(dictionary.length);
        for (const e of dictionary) {
            expect(e.word, e.word).toBe(e.word.normalize('NFC'));
            expect(e.word, e.word).toMatch(/^\p{Lu}{2,}$/u); // no space, apostrophe nor hyphen in V1
            expect(BLOCKED.some(b => e.word.includes(b)), e.word).toBe(false);
        }
        expect(dictionary.some(e => /[ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ]/u.test(e.word))).toBe(true);
        for (const l of levels) expect(dictionary.filter(e => [...e.word].length <= l.size).length, `level ${l.id}`).toBeGreaterThanOrEqual(l.maxWords * 4);
        // The filter knows at least the obvious words a child must never read by chance.
        for (const b of ['CON', 'CUL', 'PUTE', 'MERDE']) expect(BLOCKED).toContain(b);
    });
});

describe('generator (§ 12, GEN 001 … GEN 006, FR 001, FR 002)', () => {
    it(`GEN 001/004/005/006: ${SEEDS} grids per level, each solvable, in its directions, no crossing, no ambiguous or blocked word`, () => {
        for (const l of levels) {
            let fallbacks = 0;
            for (let seed = 0; seed < SEEDS; seed++) {
                const g = generate(l.id, seed);
                const bad = independentProblems(g, l.id);
                if (bad.length) throw new Error(`level ${l.id} seed ${seed}: ${bad.join('; ')}`);
                expect(problems(g, l)).toEqual([]);
                if (g.fallback) fallbacks++;
            }
            // The fallback grid is a safety net, not the normal way: at most 1 % of the seeds.
            expect(fallbacks, `level ${l.id}`).toBeLessThanOrEqual(SEEDS / 100);
        }
    }, 120_000);

    it('GEN 002: same seed, same level, same version: the same grid; another seed: another grid', () => {
        for (const l of levels) {
            expect(generate(l.id, 1234)).toEqual(generate(l.id, 1234));
            expect(new Set(Array.from({ length: 20 }, (_, s) => generate(l.id, s).letters.join(''))).size).toBeGreaterThan(15);
        }
        expect(typeof generate(1, 1).version).toBe('string');
    });

    it('GEN 003: a word longer than the grid is refused, not cut', () => {
        expect(() => place(['GIRAFES'], 4, ['E'], false, makeRng(1))).toThrow(RangeError);
        expect(() => place(['LUNE', 'DIPLODOCUS'], 6, ['E', 'S'], false, makeRng(1))).toThrow(RangeError);
    });

    it('place() says « impossible » rather than overlapping when the words cannot all fit', () => {
        // Five four-letter words, E only, no crossing, in 4×4: only four rows.
        expect(place(['LUNE', 'MARS', 'CHAT', 'LION', 'VÉLO'], 4, ['E'], false, makeRng(3))).toBeNull();
        const ok = place(['LUNE', 'MARS'], 4, ['E'], false, makeRng(3));
        expect(ok?.map(p => p.word).sort()).toEqual(['LUNE', 'MARS']);
    });

    it('FR 001/FR 002: accented words keep their accent, one NFC code point per cell', () => {
        const accented = dictionary.filter(e => /[^A-Z]/u.test(e.word) && [...e.word].length <= 4).map(e => e.word);
        expect(accented.length).toBeGreaterThan(0);
        let seen = 0;
        for (let seed = 0; seed < 2000; seed++) {
            const g = generate(1, seed);
            for (const p of g.placements) if (accented.includes(p.word)) {
                seen++;
                expect(occurrences(g.letters, g.size, p.word)).toHaveLength(1);
                expect(occurrences(g.letters, g.size, p.word.normalize('NFD'))).toHaveLength(0);
            }
        }
        expect(seen).toBeGreaterThan(0);
    });

    it('the example of § 3 (CHAT, LUNE, PAPA in 5×5) is a valid Apprenti grid, found by the oracle where the spec says', () => {
        const rows = ['CHATM', 'LROSP', 'UIVBA', 'NCDFP', 'EGKJA'];
        const g: Grid = { size: 5, letters: rows.join('').split(''), seed: 0, fallback: false, version: 'spec', placements: [
            { word: 'CHAT', row: 0, col: 0, dir: 'E' }, { word: 'LUNE', row: 1, col: 0, dir: 'S' }, { word: 'PAPA', row: 1, col: 4, dir: 'S' }] };
        expect(independentProblems(g, 2)).toEqual([]);
        expect(problems(g, levelOf(2))).toEqual([]);
        // What problems() must catch: a word not where it says, a forbidden direction, a crossing, a word twice, a blocked word.
        expect(problems({ ...g, placements: [{ word: 'CHAT', row: 1, col: 0, dir: 'E' }, ...g.placements.slice(1)] }, levelOf(2)).length).toBeGreaterThan(0);
        expect(problems(g, levelOf(1)).length).toBeGreaterThan(0); // S is not allowed in Découverte (and 5×5 is not 4×4)
        const twice = [...g.letters]; [6, 11, 16, 21].forEach((c, k) => { twice[c] = 'CHAT'[k]!; }); // CHAT again, down the second column
        expect(independentProblems({ ...g, letters: twice }, 2)).toEqual(['CHAT: 2 occurrences']);
        expect(problems({ ...g, letters: twice }, levelOf(2)).length).toBeGreaterThan(0);
        const crossing: Grid = { ...g, placements: [...g.placements, { word: 'CLUNE', row: 0, col: 0, dir: 'S' }] };
        expect(problems(crossing, levelOf(2)).length).toBeGreaterThan(0);
        const rude = [...g.letters]; [7, 12, 17].forEach((c, k) => { rude[c] = 'CUL'[k]!; });
        expect(independentProblems({ ...g, letters: rude }, 2)).toEqual(['blocked word CUL']);
        expect(problems({ ...g, letters: rude }, levelOf(2)).length).toBeGreaterThan(0);
    });
});

describe('selection (§ 3, SEL 001 … SEL 003)', () => {
    it('line(): the cells from the first to the last letter, in a row, a column or a diagonal; null otherwise', () => {
        expect(line(5, 0, 3)).toEqual([0, 1, 2, 3]);
        expect(line(5, 3, 0)).toEqual([3, 2, 1, 0]);
        expect(line(5, 1, 21)).toEqual([1, 6, 11, 16, 21]);
        expect(line(5, 0, 24)).toEqual([0, 6, 12, 18, 24]);
        expect(line(5, 4, 20)).toEqual([4, 8, 12, 16, 20]);
        expect(line(5, 7, 7)).toEqual([7]);
        expect(line(5, 0, 7)).toBeNull(); // (0,0) → (1,2)
        expect(line(5, 4, 5)).toBeNull(); // end of a row → start of the next: not a straight line
    });

    const play = (s: State, from: number, to: number) => select(s, from, to);
    it('SEL 001: first to last letter finds the word, either way; the word stays found', () => {
        for (let seed = 0; seed < 200; seed++) {
            const s0 = start(3, seed), [a, b] = ends(s0.grid, 0);
            const r = play(s0, a, b);
            expect(r.events[0]).toMatchObject({ kind: 'trouve', word: s0.grid.placements[0]!.word, cells: cellsOf(s0.grid, 0) });
            expect(r.state.found).toEqual([s0.grid.placements[0]!.word]);
            expect(play(s0, b, a).events[0]).toMatchObject({ kind: 'trouve', word: s0.grid.placements[0]!.word });
            expect(s0.found).toEqual([]); // pure: the old state is untouched
        }
    });

    it('SEL 002: a crooked line, a wrong line or half a word is refused, with no penalty', () => {
        const s0 = start(2, 7), [a, b] = ends(s0.grid, 0), size = s0.grid.size;
        const crooked = play(s0, 0, size + 2);
        expect(crooked.events).toEqual([{ kind: 'rate', cells: null }]);
        const half = play(s0, a, cellsOf(s0.grid, 0)[1]!);
        expect(half.events[0]).toMatchObject({ kind: 'rate' });
        for (const r of [crooked, half]) {
            expect(r.state.found).toEqual([]);
            expect(r.state.finished).toBe(false);
        }
        // After refusals, the word is found as if nothing had happened.
        expect(play(half.state, a, b).state.found).toEqual([s0.grid.placements[0]!.word]);
    });

    it('SEL 003: a word found twice counts once', () => {
        const s0 = start(2, 11), [a, b] = ends(s0.grid, 0);
        const once = play(s0, a, b), twice = play(once.state, b, a);
        expect(twice.events).toEqual([{ kind: 'deja', word: s0.grid.placements[0]!.word }]);
        expect(twice.state.found).toEqual(once.state.found);
    });

    it('the game ends when every word is found, in any order; nothing moves after the end', () => {
        for (const l of levels) for (let seed = 0; seed < 100; seed++) {
            let s = start(l.id, seed);
            const order = [...s.grid.placements.keys()].reverse();
            order.forEach((i, k) => {
                const r = play(s, ...ends(s.grid, i));
                expect(r.events.map(e => e.kind)).toEqual(k === order.length - 1 ? ['trouve', 'fini'] : ['trouve']);
                s = r.state;
            });
            expect(s.finished).toBe(true);
            const after = play(s, ...ends(s.grid, 0));
            expect(after.events).toEqual([]);
            expect(after.state).toEqual(s);
        }
    });
});

describe('records (PRF 001)', () => {
    it('a finished grid is kept per level; garbage reads as no record', () => {
        expect(parseRecords(null)).toEqual({});
        expect(parseRecords('{oops')).toEqual({});
        expect(parseRecords(JSON.stringify({ 1: 1, 9: 1, 2: 'x' }))).toEqual({ 1: 1 });
        const r = complete(complete({}, 2), 2);
        expect(r).toEqual({ 2: 1 });
        expect(parseRecords(JSON.stringify(r))).toEqual(r);
    });
});
