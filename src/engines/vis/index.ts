import { BAR, colors, features, handLevels, HEAD, HIT, W, type Color, type Feature, type LevelDef, type Plate, type Screw } from './levels';
export { BAR, colors, features, H, HEAD, HIT, parse, toys, W, type Color, type Feature, type LevelDef, type Plate, type Screw, type Toy } from './levels';
/** « Les vis de Pestouille »: Pestouille takes a toy apart to put it away. The child touches a free screw (no plate above
 * covers it): it flies into the pot of its colour; a plate with no screw left falls into the toy chest. Every screw always
 * has its pot: no reserve, no dead end, no clock, no lives. A touch that does nothing useful is a funny try. Pure and
 * deterministic: no randomness, no clock. */
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export interface Box { what: string; x0: number; y0: number; x1: number; y1: number }
/** Where the toy may be drawn, and where Pestouille and the toy chest stand, below it. */
export const TOY: Box = { what: 'jouet', x0: 4, y0: 62, x1: 176, y1: 230 };
export const PEST: Box = { what: 'pestouille', x0: 4, y0: 232, x1: 70, y1: 298 };
export const CHEST: Box = { what: 'coffre', x0: 108, y0: 242, x1: 176, y1: 296 };
/** The pots, one per colour of the scene, in a row at the top. */
export const POT_W = 30, POT_GAP = 3, POT_Y0 = 6, POT_Y1 = 56;
export const JOUET = 'jouet', COFFRE = 'coffre', PESTOUILLE = 'pestouille';
export const potId = (c: Color): string => `pot-${c}`;
/** The colours of a scene, in the order of the pots. */
export const colorsOf = (l: LevelDef): Color[] => colors.filter(c => l.screws.some(s => s.color === c));
export function potBox(l: LevelDef, c: Color): Box {
    const cs = colorsOf(l), n = cs.length, k = cs.indexOf(c), x0 = (W - n * POT_W - (n - 1) * POT_GAP) / 2 + k * (POT_W + POT_GAP);
    return { what: potId(c), x0, y0: POT_Y0, x1: x0 + POT_W, y1: POT_Y1 };
}
/** The box a touch on the toy itself (not on a plate or a screw) is read in, for each toy. */
export const toyBox: Readonly<Record<LevelDef['toy'], Box>> = {
    voiture: { what: JOUET, x0: 12, y0: 86, x1: 168, y1: 222 },
    fusee: { what: JOUET, x0: 36, y0: 62, x1: 144, y1: 216 },
    maison: { what: JOUET, x0: 14, y0: 66, x1: 166, y1: 226 },
    bateau: { what: JOUET, x0: 10, y0: 74, x1: 170, y1: 224 },
    train: { what: JOUET, x0: 14, y0: 90, x1: 168, y1: 222 }
};
export type Fail = 'toc' | 'toupie' | 'rot' | 'klaxon' | 'ressort' | 'chapeau';
export const fails: readonly Fail[] = ['toc', 'toupie', 'rot', 'klaxon', 'ressort', 'chapeau'];
export const HELP_AFTER = 3;
export interface State {
    level: number;
    /** The screws out (in their pots), in the order they left; the plates in the chest. */
    out: string[]; fallen: string[];
    moves: number; tries: number;
    /** Touches since the last screw out: after `HELP_AFTER`, the good screw shines. */
    misses: number; helps: number;
    finished: boolean;
}
export type Event =
    | { kind: 'devisse'; screw: string; color: Color; helped: boolean }
    | { kind: 'tombe'; plate: string }
    | { kind: 'fail'; fail: Fail; on: string }
    | { kind: 'fini' };
export interface Result { state: State; events: Event[] }

/** How far a point is from a plate's edge: negative inside, positive outside. */
export function sd(p: Pick<Plate, 'shape' | 'x0' | 'y0' | 'x1' | 'y1'>, x: number, y: number): number {
    if (p.shape === 'barre') {
        const dx = p.x1 - p.x0, dy = p.y1 - p.y0, n = dx * dx + dy * dy, t = n ? Math.max(0, Math.min(1, ((x - p.x0) * dx + (y - p.y0) * dy) / n)) : 0;
        return Math.hypot(x - p.x0 - t * dx, y - p.y0 - t * dy) - BAR;
    }
    const ox = Math.max(p.x0 - x, 0, x - p.x1), oy = Math.max(p.y0 - y, 0, y - p.y1);
    if (ox > 0 || oy > 0) return Math.hypot(ox, oy);
    return -Math.min(x - p.x0, p.x1 - x, y - p.y0, p.y1 - y);
}
const plateIndex = (l: LevelDef, id: string): number => l.plates.findIndex(p => p.id === id);
export const plateOf = (l: LevelDef, id: string): Plate => { const p = l.plates.find(x => x.id === id); if (!p) throw new RangeError(`Unknown plate ${id}`); return p; };
export const screwOf = (l: LevelDef, id: string): Screw => { const s = l.screws.find(x => x.id === id); if (!s) throw new RangeError(`Unknown screw ${id}`); return s; };
/** The plates written after the screw's own plate that lie over its head (its centre inside them). */
export function coversOf(l: LevelDef, screw: Screw, fallen: readonly string[] = []): Plate[] {
    const k = plateIndex(l, screw.plate);
    return l.plates.filter((p, i) => i > k && !fallen.includes(p.id) && sd(p, screw.x, screw.y) <= 0);
}
type Core = Pick<State, 'level' | 'out' | 'fallen'>;
export const remaining = (s: Core): Screw[] => levelOf(s.level).screws.filter(x => !s.out.includes(x.id));
export const isFree = (s: Core, id: string): boolean => { const l = levelOf(s.level); return !s.out.includes(id) && coversOf(l, screwOf(l, id), s.fallen).length === 0; };
/** The screws the child can take out right now. */
export const freeScrews = (s: Core): string[] => remaining(s).filter(x => isFree(s, x.id)).map(x => x.id);
/** Everything that can be touched: the screws left, the plates still on the toy, the pots, the toy, the chest, Pestouille. */
export function targets(s: Core): string[] {
    const l = levelOf(s.level);
    return [...remaining(s).map(x => x.id), ...l.plates.filter(p => !s.fallen.includes(p.id)).map(p => p.id), ...colorsOf(l).map(potId), JOUET, COFFRE, PESTOUILLE];
}
export function start(id: number): State {
    levelOf(id);
    return { level: id, out: [], fallen: [], moves: 0, tries: 0, misses: 0, helps: 0, finished: false };
}
/** How many plates (still on) a screw's way out goes under: 0 free, 1 under a plate whose screws are free, 2 under a plate
 * whose screws are themselves under a plate... */
export function depth(l: LevelDef, screw: Screw, fallen: readonly string[] = [], seen = new Set<string>()): number {
    const over = coversOf(l, screw, fallen);
    if (!over.length || seen.has(screw.id)) return 0;
    const next = new Set([...seen, screw.id]);
    return 1 + Math.max(...over.map(p => Math.max(0, ...l.screws.filter(x => x.plate === p.id).map(x => depth(l, x, fallen, next)))));
}
/** The screw that shines when help is due: the free one that frees the most screws under its plate, then the first. */
export function goodScrew(s: State): string | null {
    if (s.finished) return null;
    const l = levelOf(s.level), free = freeScrews(s);
    if (!free.length) return null;
    const gain = (id: string): number => { const p = screwOf(l, id).plate, left = remaining(s).filter(x => x.plate === p).length; return (left === 1 ? 10 * remaining(s).filter(x => coversOf(l, x, s.fallen).some(q => q.id === p)).length : 0) - left; };
    return [...free].sort((a, b) => gain(b) - gain(a))[0]!;
}
/** What shines: the good screw, once the child has made `HELP_AFTER` touches in a row that took no screw out. */
export const hint = (s: State): string[] => { const g = s.misses >= HELP_AFTER ? goodScrew(s) : null; return g ? [g] : []; };
/** The child touches `target`: a screw, a plate (its first free screw), a pot, the toy, the chest or Pestouille. Null when
 * nothing happens: the scene is over, the target is unknown or a plate already in the chest. */
export function play(s: State, target: string): Result | null {
    if (s.finished) return null;
    const l = levelOf(s.level);
    const fail = (f: Fail, on: string): Result => ({ state: { ...s, moves: s.moves + 1, tries: s.tries + 1, misses: s.misses + 1 }, events: [{ kind: 'fail', fail: f, on }] });
    // A touch on a plate still held takes out its first free screw; a plate whose screws are all covered knocks like them.
    const plate = l.plates.find(p => p.id === target);
    if (plate && s.fallen.includes(plate.id)) return null;
    const mine = plate ? l.screws.filter(x => x.plate === plate.id && !s.out.includes(x.id)) : [];
    const screw = plate ? mine.find(x => isFree(s, x.id)) ?? mine[0] : l.screws.find(x => x.id === target);
    if (screw) {
        // Touched again on its way to the pot: it spins like a top.
        if (s.out.includes(screw.id)) return fail('toupie', screw.id);
        // Covered: the plate on top of it knocks and wriggles.
        const over = coversOf(l, screw, s.fallen);
        if (over.length) return fail('toc', over[over.length - 1]!.id);
        const helped = hint(s).includes(screw.id), out = [...s.out, screw.id], events: Event[] = [{ kind: 'devisse', screw: screw.id, color: screw.color, helped }];
        const fallen = [...s.fallen];
        if (!l.screws.some(x => x.plate === screw.plate && !out.includes(x.id))) { fallen.push(screw.plate); events.push({ kind: 'tombe', plate: screw.plate }); }
        const finished = out.length === l.screws.length;
        if (finished) events.push({ kind: 'fini' });
        return { state: { ...s, out, fallen, moves: s.moves + 1, misses: 0, helps: s.helps + (helped ? 1 : 0), finished }, events };
    }
    if (colorsOf(l).some(c => potId(c) === target)) return fail('rot', target);
    if (target === JOUET) return fail('klaxon', JOUET);
    if (target === COFFRE) return fail('ressort', COFFRE);
    if (target === PESTOUILLE) return fail('chapeau', PESTOUILLE);
    return null;
}
/** Help costs one star, and only help: everything else is free. */
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
/** What a finger at (x, y) touches: a screw still on its way to the pot (`flying`), a screw left (within `HIT`), else the
 * plate on top there (its nearest free screw if it has one: a finger on a plate means its screw), else a pot, the chest,
 * Pestouille or the toy itself. Null: nothing. */
export function touched(s: Core, x: number, y: number, flying: readonly string[] = []): string | null {
    const l = levelOf(s.level), near = (xs: readonly Screw[], r: number): string | null => {
        let best: string | null = null, d = r;
        for (const sc of xs) { const e = Math.hypot(sc.x - x, sc.y - y); if (e <= d) { best = sc.id; d = e; } }
        return best;
    };
    const hit = near(l.screws.filter(sc => flying.includes(sc.id) && s.out.includes(sc.id)), HIT) ?? near(remaining(s), HIT);
    if (hit) return hit;
    for (let i = l.plates.length - 1; i >= 0; i--) {
        const p = l.plates[i]!;
        if (s.fallen.includes(p.id) || sd(p, x, y) > 2) continue;
        return near(remaining(s).filter(sc => sc.plate === p.id && isFree(s, sc.id)), Infinity) ?? p.id;
    }
    const inside = (b: Box): boolean => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
    for (const c of colorsOf(l)) if (inside(potBox(l, c))) return potId(c);
    if (inside(CHEST)) return COFFRE;
    if (inside(PEST)) return PESTOUILLE;
    if (inside(toyBox[l.toy])) return JOUET;
    return null;
}

/** The new things a scene uses. */
export function featuresOf(l: LevelDef): Feature[] {
    const deep = Math.max(0, ...l.screws.map(x => depth(l, x)));
    const has: Record<Feature, boolean> = {
        superpose: deep >= 1, couleurs3: colorsOf(l).length >= 3,
        angle: l.plates.some(p => p.shape === 'barre' && p.x0 !== p.x1 && p.y0 !== p.y1),
        deuxvis: l.plates.some(p => l.screws.filter(x => x.plate === p.id).length >= 2),
        profond: deep >= 2, grand: l.screws.length >= GRAND
    };
    return features.filter(f => has[f]);
}
/** What a new thing brings with it: a pile three deep is first of all a plate on a plate. */
export const needs: Readonly<Partial<Record<Feature, Feature[]>>> = { profond: ['superpose'] };
/** A big toy has at least this many screws; at most three screws before scene `EARLY`, never more than `MAX_SCREWS`. */
export const GRAND = 7, EARLY = 6, EARLY_SCREWS = 3, MAX_SCREWS = 10;
/** A screw sits well inside its plate; a plate over a screw covers its centre, or keeps clear of its head. */
export const INSIDE = 6;
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(l: LevelDef): string[] {
    const out: string[] = [], n = l.screws.length;
    if (l.title.fr.length > 24 || l.title.en.length > 24) out.push('a short title');
    if (n < 1 || n > MAX_SCREWS) out.push(`one to ${MAX_SCREWS} screws`);
    if (l.id < EARLY && n > EARLY_SCREWS) out.push(`at most ${EARLY_SCREWS} screws before scene ${EARLY}`);
    for (const p of l.plates) {
        if (!l.screws.some(x => x.plate === p.id)) out.push(`${p.id}: a plate is held by a screw`);
        const r = p.shape === 'barre' ? BAR : 0, lo = { x: Math.min(p.x0, p.x1) - r, y: Math.min(p.y0, p.y1) - r }, hi = { x: Math.max(p.x0, p.x1) + r, y: Math.max(p.y0, p.y1) + r };
        if (lo.x < TOY.x0 || hi.x > TOY.x1 || lo.y < TOY.y0 || hi.y > TOY.y1) out.push(`${p.id}: inside the toy`);
        if (p.shape === 'panneau' && (p.x1 - p.x0 < 2 * HIT || p.y1 - p.y0 < 2 * HIT)) out.push(`${p.id}: a panel big enough to touch`);
    }
    for (const x of l.screws) {
        const k = plateIndex(l, x.plate);
        if (sd(plateOf(l, x.plate), x.x, x.y) > -INSIDE) out.push(`${x.id}: a screw inside its plate`);
        for (const [i, p] of l.plates.entries()) { const e = sd(p, x.x, x.y); if (i > k && e > 0 && e < HEAD + 1) out.push(`${x.id}: ${p.id} half covers it`); }
        for (const y of l.screws) if (x.id < y.id && Math.hypot(x.x - y.x, x.y - y.y) < 2 * HIT) out.push(`${x.id} and ${y.id}: too close to touch`);
    }
    if (colorsOf(l).length * (POT_W + POT_GAP) - POT_GAP > W - 8) out.push('the pots fit');
    if (out.length) return out;
    // Never a dead end: from every set of screws the child can take out, there is still a free one until the end.
    const seen = new Set<string>(), todo: State[] = [start(l.id)];
    while (todo.length) {
        const s = todo.pop()!, key = [...s.out].sort().join(',');
        if (seen.has(key)) continue; seen.add(key);
        if (s.finished) continue;
        const free = freeScrews(s);
        if (!free.length) { out.push(`a dead end after ${key}`); break; }
        for (const id of free) todo.push(play(s, id)!.state);
    }
    return out;
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 6;
/** How far apart two scenes are: one per plate (shape and place, to 10 units) or screw (colour and place) one has and not
 * the other, three per new thing one has and not the other, two for another toy, two per screw more or less. */
export function distance(a: LevelDef, b: LevelDef): number {
    const r = (v: number): number => Math.round(v / 10);
    const bag = (l: LevelDef): string[] => [...l.plates.map(p => `${p.shape}:${r(p.x0)},${r(p.y0)},${r(p.x1)},${r(p.y1)}`), ...l.screws.map(x => `${x.color}:${r(x.x)},${r(x.y)}`)];
    const count = (xs: string[]): Map<string, number> => { const m = new Map<string, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
    const ca = count(bag(a)), cb = count(bag(b));
    let d = 0;
    for (const k of new Set([...ca.keys(), ...cb.keys()])) d += Math.abs((ca.get(k) ?? 0) - (cb.get(k) ?? 0));
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d + (a.toy === b.toy ? 0 : 2) + 2 * Math.abs(a.screws.length - b.screws.length);
}
/** The boxes that must never cover one another: the pots, the toy's room, Pestouille, the chest. */
export function overlaps(l: LevelDef): string[] {
    const boxes = [...colorsOf(l).map(c => potBox(l, c)), TOY, PEST, CHEST], out: string[] = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i]!, b = boxes[j]!; if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) out.push(`${a.what} covers ${b.what}`); }
    return out;
}
