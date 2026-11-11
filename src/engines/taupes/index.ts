import { handLevels, features, type Feature, type LevelDef } from './levels';
import { deduce, neighbours, type Board, type Technique } from './solver';
export { features, type Feature, type LevelDef } from './levels';
export { neighbours } from './solver';
/** « Les taupes de Tutu »: a little garden in a grid. Sleeping moles hide under some clods of earth. The child touches a
 * clod: with no mole under it, it opens on a flower and shows, in little dots, how many moles sleep just next to it (the
 * eight cells around). A carrot put on a clod says « a mole sleeps here ». The scene is over when every clod with no mole is
 * open: the moles wake up, eat their carrot and have a party.
 *
 * Nothing explodes and nothing is lost: a mole touched pokes its head out, yawns « shh, I'm sleeping! » and goes back to
 * sleep. Every mistake is a funny try that changes nothing but the counters. No clock, no lives.
 *
 * Pure and deterministic: no randomness, no clock; a gesture is (what, where). */
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
/** The carrot button comes in at this scene (alone, with a single mole). */
export const CARROT_FROM = 4;
export const HELP_AFTER = 3;
/** At most two moles before scene 8, boards of 3 × 3 up to 6 × 6. */
export const EARLY = 8, EARLY_MOLES = 2, MIN_SIDE = 3, MAX_SIDE = 6;
export type Fail = 'baille' | 'lapin' | 'pollen' | 'galipette' | 'saute' | 'ver' | 'rocher';
export const fails: readonly Fail[] = ['baille', 'lapin', 'pollen', 'galipette', 'saute', 'ver', 'rocher'];
export type Action = { kind: 'creuser' | 'carotte'; cell: number } | { kind: 'tutu' } | { kind: 'bord' };
export interface State {
    level: number;
    /** Open cells and carrots, as sorted cell indices (row by row). */
    open: number[]; carrots: number[];
    moves: number; tries: number; wrong: number; helps: number;
    finished: boolean;
}
export type Event =
    | { kind: 'ouvre'; cells: number[]; helped: boolean }
    | { kind: 'carotte'; cell: number }
    | { kind: 'reprise'; cell: number }
    | { kind: 'fail'; fail: Fail; cell: number | null }
    | { kind: 'fini' };
export interface Result { state: State; events: Event[] }

export const width = (l: LevelDef): number => l.rows[0]!.length;
export const height = (l: LevelDef): number => l.rows.length;
const grid = (l: LevelDef): string => l.rows.join('');
export const isMole = (l: LevelDef, i: number): boolean => grid(l)[i] === 'T';
export const isRock = (l: LevelDef, i: number): boolean => grid(l)[i] === '#';
export const molesOf = (l: LevelDef): number[] => grid(l).split('').flatMap((c, i) => c === 'T' ? [i] : []);
/** The clods to open: every cell that is neither a mole nor a rock. */
export const freeCells = (l: LevelDef): number[] => grid(l).split('').flatMap((c, i) => c === '.' || c === 'o' ? [i] : []);
/** How many moles sleep in the eight cells around cell i. */
export const countAt = (l: LevelDef, i: number): number => neighbours(width(l), height(l), i).filter(j => isMole(l, j)).length;
export const counts = (l: LevelDef): number[] => Array.from({ length: width(l) * height(l) }, (_, i) => countAt(l, i));
export const boardOf = (l: LevelDef): Board => ({ w: width(l), h: height(l), moles: molesOf(l).length, rock: grid(l).split('').map(c => c === '#') });
export const carrotsOn = (id: number): boolean => id >= CARROT_FROM;
/** Opens cell i and, from every flower with no mole around, its neighbours, as far as it goes. */
function cascade(l: LevelDef, open: Set<number>, i: number): number[] {
    const out: number[] = [], todo = [i];
    while (todo.length) {
        const c = todo.shift()!;
        if (open.has(c) || isMole(l, c) || isRock(l, c)) continue;
        open.add(c); out.push(c);
        if (countAt(l, c) === 0) for (const j of neighbours(width(l), height(l), c)) if (!open.has(j)) todo.push(j);
    }
    return out;
}
export function start(id: number): State {
    const l = levelOf(id);
    const open = grid(l).split('').flatMap((c, i) => c === 'o' ? [i] : []);
    return { level: id, open, carrots: [], moves: 0, tries: 0, wrong: 0, helps: 0, finished: false };
}
/** What the open flowers prove right now. */
export const proof = (s: Pick<State, 'level' | 'open'>): ReturnType<typeof deduce> => { const l = levelOf(s.level); return deduce(boardOf(l), new Set(s.open), counts(l)); };
/** The clod that shines once the help is on: the first clod the flowers prove free (there is always one: no scene asks to
 * guess, and opening more never takes a proof away). */
export function goodCell(s: State): number | null {
    if (s.finished) return null;
    const p = proof(s), free = p.free.filter(i => !s.open.includes(i));
    return free[0] ?? null;
}
export const helpOn = (s: State): boolean => !s.finished && s.wrong >= HELP_AFTER;
export const hint = (s: State): number | null => helpOn(s) ? goodCell(s) : null;
const sorted = (xs: Iterable<number>): number[] => [...xs].sort((a, b) => a - b);
/** A gesture. Null when nothing happens: the scene is over, a cell outside the garden, or the carrot before it comes in. */
export function play(s: State, a: Action): Result | null {
    if (s.finished) return null;
    const l = levelOf(s.level), n = width(l) * height(l);
    const fail = (f: Fail, cell: number | null): Result => ({ state: { ...s, moves: s.moves + 1, tries: s.tries + 1, wrong: s.wrong + 1 }, events: [{ kind: 'fail', fail: f, cell }] });
    if (a.kind === 'tutu') return fail('galipette', null);
    if (a.kind === 'bord') return fail('ver', null);
    const i = a.cell;
    if (!Number.isInteger(i) || i < 0 || i >= n) return null;
    if (a.kind === 'carotte' && !carrotsOn(s.level)) return null;
    if (isRock(l, i)) return fail('rocher', i);
    if (s.open.includes(i)) return fail('pollen', i);
    const carrot = s.carrots.includes(i);
    if (a.kind === 'carotte') {
        if (carrot) return { state: { ...s, moves: s.moves + 1, carrots: s.carrots.filter(c => c !== i) }, events: [{ kind: 'reprise', cell: i }] };
        // A carrot on a clod with no mole: a rabbit comes and takes it away.
        if (!isMole(l, i)) return fail('lapin', i);
        return { state: { ...s, moves: s.moves + 1, carrots: sorted([...s.carrots, i]) }, events: [{ kind: 'carotte', cell: i }] };
    }
    if (carrot) return fail('saute', i);
    if (isMole(l, i)) return fail('baille', i);
    const helped = hint(s) === i, open = new Set(s.open), opened = cascade(l, open, i);
    const finished = freeCells(l).every(c => open.has(c));
    const state: State = { ...s, open: sorted(open), moves: s.moves + 1, wrong: 0, helps: s.helps + (helped ? 1 : 0), finished };
    return { state, events: [{ kind: 'ouvre', cells: opened, helped }, ...(finished ? [{ kind: 'fini' } as Event] : [])] };
}
/** Help costs one star, and only help. */
export function stars(s: Pick<State, 'helps'>): 2 | 3 { return s.helps === 0 ? 3 : 2; }
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

/** Proves the whole scene from its first open zone, the way a careful child would: the cheaper technique first, every
 * clod proved free opened (with its cascade). `steps` counts the proofs, `techniques` what they took. */
export function solve(l: LevelDef): { solved: boolean; techniques: Technique[]; zero: boolean } {
    const open = new Set(grid(l).split('').flatMap((c, i) => c === 'o' ? [i] : [])), cs = counts(l), b = boardOf(l), techniques: Technique[] = [];
    let zero = false;
    for (;;) {
        if (freeCells(l).every(c => open.has(c))) return { solved: true, techniques, zero };
        const p = deduce(b, open, cs);
        if (!p.technique) return { solved: false, techniques, zero };
        techniques.push(p.technique);
        for (const i of p.free) { if (open.has(i)) continue; const before = open.size; cascade(l, open, i); if (open.size - before > 1) zero = true; }
    }
}
/** The new things a scene uses. `zero`: a covered clod with no mole around, which opens its neighbours by itself;
 * `croise`: a proof that needs two flowers at once; `grand`: more than 16 cells; `deux`: two moles or more. */
export function featuresOf(l: LevelDef): Feature[] {
    const sol = solve(l), cs = counts(l), g = grid(l);
    const has: Record<Feature, boolean> = {
        deux: molesOf(l).length >= 2,
        zero: g.split('').some((c, i) => c === '.' && cs[i] === 0),
        croise: sol.techniques.includes('croise'),
        grand: width(l) * height(l) > 16,
        rocher: g.includes('#')
    };
    return features.filter(f => has[f]);
}
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(l: LevelDef): string[] {
    const out: string[] = [], w = width(l), h = height(l), m = molesOf(l).length;
    if (l.title.fr.length > 26 || l.title.en.length > 26) out.push('a short title');
    if (l.rows.some(r => r.length !== w) || !l.rows.every(r => /^[.oT#]+$/.test(r))) out.push('a rectangle of . o T #');
    if (w < MIN_SIDE || h < MIN_SIDE || w > MAX_SIDE || h > MAX_SIDE) out.push(`a garden of ${MIN_SIDE} to ${MAX_SIDE} cells a side`);
    if (h < w) out.push('a garden as tall as it is wide or taller (portrait phone)');
    if (m < 1) out.push('at least one mole');
    if (l.id < EARLY && m > EARLY_MOLES) out.push(`at most ${EARLY_MOLES} moles before scene ${EARLY}`);
    if (!grid(l).includes('o')) out.push('a first zone already open');
    if (!grid(l).includes('.')) out.push('something to dig');
    // At most four dots on a flower: a five-year-old counts them at a glance.
    if (freeCells(l).some(i => countAt(l, i) > 4)) out.push('at most four moles around a flower');
    if (out.length) return out;
    if (!solve(l).solved) out.push('needs a guess');
    return out;
}
/** Two scenes play differently when they are at least this far apart (see `distance`). */
export const MIN_GAP = 6;
/** How far apart two scenes are: cells that differ (the smaller garden laid on the larger one from the top left, a cell
 * outside it counting as different), two per difference of width or height, three per new thing one has and not the
 * other. */
export function distance(a: LevelDef, b: LevelDef): number {
    const w = Math.max(width(a), width(b)), h = Math.max(height(a), height(b)), at = (l: LevelDef, x: number, y: number): string => l.rows[y]?.[x] ?? ' ';
    let d = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(a, x, y) !== at(b, x, y)) d++;
    d += 2 * (Math.abs(width(a) - width(b)) + Math.abs(height(a) - height(b)));
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d;
}
