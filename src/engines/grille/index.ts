import { features, handLevels, IMAGES, type Feature, type LevelDef, type Theme } from './levels';
export { features, IMAGES, themes, type Feature, type LevelDef, type Theme } from './levels';
/** « La grille de CaliRoux »: a small grid of pictures where each picture goes once in every row, every column and every
 * square. The child touches an empty cell, then a picture in the big tray (or drags the picture onto the cell). Only the
 * right picture stays: a picture already in the row, the column or the square makes a face and the new one goes back to
 * the tray; a picture that fits nowhere else but is not this cell's goes back too. So the grid never holds a wrong
 * picture and there is never a dead end. No clock, no lives, nothing lost: every refusal is a funny try. Each grid has
 * exactly one way to be filled, found by looking, never by guessing. Pure and deterministic. */

/** Funny tries: each has its own animation, and nothing in the grid changes.
 *   `grimace`   a fruit already in the row, column or square: the twin fruit blinks and pulls a face
 *   `chamaille` an animal already there: the two animals squabble
 *   `cogne`     a shape already there: the two shapes bump into each other
 *   `pasici`    no twin anywhere, but this is not the picture's cell: it shrugs
 *   `salto`     a picture put on a cell already full: it turns a somersault and goes back
 *   `coucou`    a touch on a cell given at the start: it waves hello
 *   `tournis`   a picture shaken fast: it gets dizzy
 *   `roulade`   a touch on CaliRoux: he rolls over */
export const fails = ['grimace', 'chamaille', 'cogne', 'pasici', 'salto', 'coucou', 'tournis', 'roulade'] as const;
export type Fail = typeof fails[number];
const TWIN: Readonly<Record<Theme, Fail>> = { fruits: 'grimace', animaux: 'chamaille', formes: 'cogne' };
/** Funny tries in a row before the right picture and its cell shine. */
export const TRIES_BEFORE_HELP = 3;
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const sizeOf = (level: LevelDef): number => level.rows.length;
/** Rows and columns of a square: 2 × 2 in the small grid, 2 × 3 in the big one. */
export const boxOf = (n: number): readonly [number, number] => n === 6 ? [2, 3] : [2, 2];
/** A cell holds the index of its picture in the theme (0 to 5), or -1 when it is empty. */
export const givenOf = (level: LevelDef): number[] => level.rows.join('').split('').map(ch => ch === '.' ? -1 : ch.charCodeAt(0) - 97);
/** The pictures of a scene, in the order of the theme: they fill the tray. */
export const imagesOf = (level: LevelDef): number[] => [...new Set(solutionOf(level))].sort((a, b) => a - b);
export type UnitKind = 'ligne' | 'colonne' | 'carre';
export interface Unit { kind: UnitKind; cells: readonly number[] }
const unitCache = new Map<number, Unit[]>();
/** The rows, columns and squares of a grid of side n. */
export function unitsOf(n: number): Unit[] {
    let u = unitCache.get(n);
    if (u) return u;
    const [br, bc] = boxOf(n), range = Array.from({ length: n }, (_, i) => i);
    u = [...range.map(r => ({ kind: 'ligne' as const, cells: range.map(c => r * n + c) })), ...range.map(c => ({ kind: 'colonne' as const, cells: range.map(r => r * n + c) }))];
    for (let r = 0; r < n; r += br) for (let c = 0; c < n; c += bc) u.push({ kind: 'carre', cells: Array.from({ length: n }, (_, k) => (r + Math.floor(k / bc)) * n + c + k % bc) });
    unitCache.set(n, u);
    return u;
}
const peerCache = new Map<number, number[][]>();
/** The other cells that share a row, a column or a square with each cell. */
export function peersOf(n: number): number[][] {
    let p = peerCache.get(n);
    if (!p) { p = Array.from({ length: n * n }, (_, i) => [...new Set(unitsOf(n).filter(u => u.cells.includes(i)).flatMap(u => u.cells))].filter(j => j !== i)); peerCache.set(n, p); }
    return p;
}
/** The ways to fill a grid, up to `cap` of them: a backtracking search on the cell with the fewest choices. */
export function solutions(cells: readonly number[], n: number, images: readonly number[], cap = 2): number[][] {
    const grid = [...cells], out: number[][] = [], peers = peersOf(n);
    const rec = (): void => {
        if (out.length >= cap) return;
        let best = -1, choice: number[] = [];
        for (let i = 0; i < grid.length; i++) if (grid[i]! < 0) {
            const c = images.filter(v => peers[i]!.every(p => grid[p] !== v));
            if (best < 0 || c.length < choice.length) { best = i; choice = c; }
        }
        if (best < 0) { out.push([...grid]); return; }
        for (const v of choice) { grid[best] = v; rec(); grid[best] = -1; }
    };
    rec();
    return out;
}
const solutionCache = new WeakMap<LevelDef, number[]>();
/** The one way to fill the scene's grid. */
export function solutionOf(level: LevelDef): number[] {
    let s = solutionCache.get(level);
    if (!s) {
        const given = givenOf(level), n = sizeOf(level), letters = [...new Set(level.rows.join('').replace(/\./g, '').split(''))].map(ch => ch.charCodeAt(0) - 97);
        // The pictures are those written in the grid; a grid where one picture is missing everywhere cannot be read.
        s = solutions(given, n, letters.length === n ? letters : Array.from({ length: n }, (_, i) => i), 1)[0] ?? given;
        solutionCache.set(level, s);
    }
    return s;
}
/** The pictures that do not meet a twin in the row, the column or the square of a cell. */
export const candidates = (cells: readonly number[], n: number, images: readonly number[], i: number): number[] => images.filter(v => peersOf(n)[i]!.every(p => cells[p] !== v));
/** One cell that can be found by looking: why it is found, and its picture.
 * `units` lists the row, column or square where it is the last empty cell (`croise` when there is none: two of them must be
 * crossed, or the picture has only this place left in one of them). */
export interface Forced { cell: number; image: number; units: UnitKind[] }
/** Every cell found by looking at the grid as it is: a cell with one picture left, or a picture with one place left in a
 * row, a column or a square. */
export function forced(cells: readonly number[], n: number, images: readonly number[]): Forced[] {
    const out = new Map<number, number>(), units = unitsOf(n);
    const cand = new Map<number, number[]>();
    cells.forEach((v, i) => { if (v < 0) cand.set(i, candidates(cells, n, images, i)); });
    for (const [i, c] of cand) if (c.length === 1) out.set(i, c[0]!);
    for (const u of units) for (const v of images) {
        if (u.cells.some(x => cells[x] === v)) continue;
        const spots = u.cells.filter(x => cand.get(x)?.includes(v));
        if (spots.length === 1 && !out.has(spots[0]!)) out.set(spots[0]!, v);
    }
    return [...out].sort((a, b) => a[0] - b[0]).map(([cell, image]) => ({ cell, image, units: [...new Set(units.filter(u => u.cells.includes(cell) && u.cells.filter(x => cells[x]! < 0).length === 1).map(u => u.kind))] }));
}
/** How a scene is solved by looking only: rounds of cells found at once, what each one needed, cells found by crossing. */
export interface Reading { rounds: number; kinds: Set<Feature>; crossed: number; solved: boolean }
const readingCache = new WeakMap<LevelDef, Reading>();
export function reading(level: LevelDef): Reading {
    const known = readingCache.get(level);
    if (known) return known;
    const n = sizeOf(level), images = imagesOf(level), cells = givenOf(level), kinds = new Set<Feature>();
    let rounds = 0, crossed = 0, solved = true;
    while (cells.some(v => v < 0)) {
        const f = forced(cells, n, images);
        if (!f.length) { solved = false; break; }
        rounds++;
        for (const c of f) { if (!c.units.length) { kinds.add('croise'); crossed++; } else if (c.units.length === 1) kinds.add(c.units[0]!); }
        for (const c of f) cells[c.cell] = c.image;
    }
    const r = { rounds, kinds, crossed, solved };
    readingCache.set(level, r);
    return r;
}
/** The new things a scene uses: the row, the column or the square to finish, two of them to cross, several cells where one
 * opens the next (`plusieurs`), the big grid (`six`). A cell that is the last of its row, column and square at once (the
 * first scenes) is not a new thing. */
export function featuresOf(level: LevelDef): Feature[] {
    const r = reading(level), has = new Set(r.kinds);
    if (r.rounds >= 2) has.add('plusieurs');
    if (sizeOf(level) === 6) has.add('six');
    return features.filter(f => has.has(f));
}
/** How hard a scene is: the big grid, the rounds of looking, the empty cells and the cells found by crossing. */
export function difficulty(level: LevelDef): number {
    const r = reading(level);
    return (sizeOf(level) === 6 ? 100 : 0) + 10 * r.rounds + givenOf(level).filter(v => v < 0).length + 4 * r.crossed;
}
/** Empty cells at most: a robot child must finish in few gestures, and a five-year-old too. */
export const MAX_EMPTY: Readonly<Record<number, number>> = { 4: 10, 6: 10 };
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], n = sizeOf(level);
    if (n !== 4 && n !== 6) out.push('a grid of four or six');
    if (level.rows.some(r => r.length !== n)) out.push('a square grid');
    if (level.rows.some(r => !/^[a-f.]+$/.test(r))) out.push('pictures a to f or an empty cell');
    if (out.length) return out;
    const given = givenOf(level), letters = new Set(given.filter(v => v >= 0));
    if (letters.size !== n) out.push(`${n} pictures in the grid`);
    const empty = given.filter(v => v < 0).length;
    if (empty < 1 || empty > (MAX_EMPTY[n] ?? 0)) out.push(`one to ${MAX_EMPTY[n]} empty cells`);
    given.forEach((v, i) => { if (v >= 0 && peersOf(n)[i]!.some(p => given[p] === v)) out.push(`twins at ${i}`); });
    if (out.length) return out;
    if (solutions(given, n, [...letters]).length !== 1) out.push('exactly one way to fill the grid');
    else if (!reading(level).solved) out.push('found by looking, never by guessing');
    if (level.title.fr.length > 32 || level.title.en.length > 32) out.push('a short title');
    return out;
}

/** A gesture of the child: put a picture on a cell, touch a cell with nothing in hand, shake a picture, touch CaliRoux. */
export type Action = { kind: 'pose'; cell: number; image: number } | { kind: 'touche'; cell: number } | { kind: 'secoue'; image: number } | { kind: 'caliroux' };
export interface State {
    level: number; cells: readonly number[];
    /** Gestures (funny tries included), funny tries, funny tries in a row, helps. */
    gestures: number; tries: number; dry: number; helps: number; finished: boolean;
}
const startState = (level: LevelDef): State => ({ level: level.id, cells: givenOf(level), gestures: 0, tries: 0, dry: 0, helps: 0, finished: false });
export const start = (id: number): State => startState(levelOf(id));
export const isGiven = (level: LevelDef, i: number): boolean => givenOf(level)[i]! >= 0;
export interface Result {
    action: Action; state: State; helped: boolean;
    /** The funny try, on which cell, the picture it was about, and the twins that react (same picture in the row, column or
     * square). */
    fail: { kind: Fail; cell: number; image: number; twins: number[] } | null;
    /** The picture put on its cell. */
    placed: { cell: number; image: number } | null;
}
/** One gesture of the child. A touch on an empty or filled cell with nothing in hand only chooses it: `null`. */
export function step(s: State, a: Action): Result | null {
    if (s.finished) return null;
    const level = levelOf(s.level), n = sizeOf(level);
    const miss = (kind: Fail, cell = -1, image = -1, twins: number[] = []): Result => ({ action: a, helped: false, placed: null, fail: { kind, cell, image, twins }, state: { ...s, gestures: s.gestures + 1, tries: s.tries + 1, dry: s.dry + 1 } });
    if (a.kind === 'caliroux') return miss('roulade');
    if (a.kind === 'secoue') return miss('tournis', -1, a.image);
    if (a.kind === 'touche') return isGiven(level, a.cell) ? miss('coucou', a.cell, s.cells[a.cell]) : null;
    const { cell, image } = a;
    if (cell < 0 || cell >= n * n || !imagesOf(level).includes(image)) return null;
    if (s.cells[cell]! >= 0) return miss('salto', cell, image);
    if (solutionOf(level)[cell] !== image) {
        const twins = peersOf(n)[cell]!.filter(p => s.cells[p] === image);
        return miss(twins.length ? TWIN[level.theme] : 'pasici', cell, image, twins);
    }
    const h = helpOn(s) ? hint(s) : null, helped = Boolean(h && h.cell === cell && h.image === image);
    const cells = s.cells.map((v, i) => i === cell ? image : v);
    return { action: a, helped, fail: null, placed: { cell, image }, state: { ...s, cells, gestures: s.gestures + 1, dry: 0, helps: s.helps + (helped ? 1 : 0), finished: cells.every(v => v >= 0) } };
}
export const helpOn = (s: State): boolean => !s.finished && s.dry >= TRIES_BEFORE_HELP;
/** The right next gesture: the cell easiest to see (the last of the most rows, columns and squares, then the first in
 * reading order) and its picture. */
export function hint(s: State): { cell: number; image: number } | null {
    if (s.finished) return null;
    const level = levelOf(s.level), f = forced(s.cells, sizeOf(level), imagesOf(level));
    const best = [...f].sort((a, b) => b.units.length - a.units.length || a.cell - b.cell)[0];
    return best ? { cell: best.cell, image: best.image } : null;
}
/** Every gesture that does something: each picture on each cell, a touch on each given cell, each picture shaken, CaliRoux. */
export function gestures(s: State): Action[] {
    const level = levelOf(s.level), n = sizeOf(level), images = imagesOf(level), out: Action[] = [];
    for (let cell = 0; cell < n * n; cell++) for (const image of images) out.push({ kind: 'pose', cell, image });
    for (let cell = 0; cell < n * n; cell++) if (isGiven(level, cell)) out.push({ kind: 'touche', cell });
    for (const image of images) out.push({ kind: 'secoue', image });
    out.push({ kind: 'caliroux' });
    return out;
}
export function stars(s: State): 1 | 2 | 3 { return s.helps === 0 ? 3 : s.helps === 1 ? 2 : 1; }
export type Records = Partial<Record<number, number>>;
export function complete(records: Records, s: State): Records { return s.finished ? { ...records, [s.level]: Math.max(records[s.level] ?? 0, stars(s)) } : { ...records }; }
export function isUnlocked(id: number, records: Records): boolean { return id === 1 || (records[id - 1] ?? 0) > 0; }
export function parseRecords(raw: string | null): Records {
    try {
        const v: unknown = JSON.parse(raw ?? 'null'); const out: Records = {};
        if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
        for (const [k, score] of Object.entries(v)) if (/^\d+$/.test(k) && Number(k) >= 1 && Number(k) <= levels.length && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) out[Number(k)] = score;
        return out;
    } catch { return {}; }
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 8;
/** How far apart two scenes are: one per cell that differs (picture or empty), ten for another grid size, two for another
 * theme, three per new thing one has and not the other. */
export function distance(a: LevelDef, b: LevelDef): number {
    let d = a.theme === b.theme ? 0 : 2;
    if (sizeOf(a) !== sizeOf(b)) d += 10;
    else { const ga = a.rows.join(''), gb = b.rows.join(''); for (let i = 0; i < ga.length; i++) if (ga[i] !== gb[i]) d++; }
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d;
}
export const imageName = (theme: Theme, image: number): string => IMAGES[theme][image]!;
