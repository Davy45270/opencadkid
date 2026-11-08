import { makeRng, shuffle } from '../rng';
/** Hide and seek in a painted landscape: the child finds the objects shown in the strip.
 * The field has the 5:4 shape of the painted puzzle scenes it reuses. */
export const FIELD = { width: 320, height: 256 } as const;
/** Every object a scene can hide: twenty props from Petits Pompiers and the seven Opencadkid fruits and friends. */
export const props = ['borne', 'banc', 'caisse', 'buisson_fleuri', 'chaton_heureux', 'chien_face', 'lapin_face', 'lampadaire', 'outil_extincteur', 'outil_megaphone',
    'outil_trousse', 'poubelle', 'jardiniere', 'souche', 'sapin', 'camion', 'pompier_panda_S', 'pompier_licorne_S', 'pompier_dragon_S', 'pompier_pandaroux_S'] as const;
export const drawn = ['apple', 'pear', 'berry', 'carrot', 'star', 'fish', 'flower'] as const;
export const kinds = [...props, ...drawn] as const;
export type Kind = typeof kinds[number];
export const scenes = ['zen', 'ardennes', 'volcano', 'islands', 'galaxy', 'valley'] as const;
export type Scene = typeof scenes[number];
/** find: objects to find; decoys: other objects in the way; size: drawn size in field units, for an object in the foreground;
 * covered: targets half hidden behind a piece of the scenery. */
export interface Level { id: number; find: number; decoys: number; size: number; covered: number }
export const levels: readonly Level[] = [
    { id: 1, find: 3, decoys: 2, size: 60, covered: 0 }, { id: 2, find: 3, decoys: 4, size: 56, covered: 0 },
    { id: 3, find: 4, decoys: 5, size: 52, covered: 0 }, { id: 4, find: 4, decoys: 6, size: 50, covered: 1 },
    { id: 5, find: 5, decoys: 6, size: 48, covered: 1 }, { id: 6, find: 5, decoys: 8, size: 46, covered: 2 },
    { id: 7, find: 6, decoys: 8, size: 44, covered: 2 }, { id: 8, find: 6, decoys: 10, size: 42, covered: 3 },
    { id: 9, find: 7, decoys: 10, size: 40, covered: 3 }, { id: 10, find: 7, decoys: 12, size: 38, covered: 4 },
    { id: 11, find: 8, decoys: 12, size: 36, covered: 5 }, { id: 12, find: 8, decoys: 14, size: 34, covered: 6 }
];
/** Around every object to find, no other object's centre comes closer than this: the tap zone of a target is a disc of
 * at least TARGET_CLEARANCE / 2 units (about 22 CSS px of radius on a phone), whatever is drawn around it. */
export const TARGET_CLEARANCE = 40;
/** A tap within this distance of an object's centre (or within its drawn half-size, if larger) is a tap on that object. */
export const HIT_RADIUS = 22;
export interface Item { kind: Kind; x: number; y: number; size: number; target: boolean; covered: boolean; found: boolean }
type Polygon = readonly (readonly [number, number])[];
/** Where an object can stand in each painting, in field units: the point under its feet lies in one of these zones (sand,
 * meadow, bridge deck, pier, rock top, lily pad…), never in the sky or on water. `horizon` sets the perspective: an object
 * standing high up the picture is farther away, so smaller. Traced by hand on the six paintings. */
export const grounds: Record<Scene, { horizon: number; zones: readonly Polygon[] }> = {
    zen: { horizon: 100, zones: [
        [[0, 212], [320, 212], [320, 252], [0, 252]], // raked sand and the stones of the shore
        [[100, 133], [140, 125], [200, 124], [244, 130], [244, 135], [100, 137]], // bridge deck
        [[28, 120], [68, 120], [68, 125], [28, 125]], // mossy rock
        [[78, 158], [132, 158], [132, 164], [78, 164]], [[262, 152], [320, 150], [320, 160], [262, 161]], // banks
        [[30, 202], [116, 202], [116, 207], [30, 207]], [[214, 188], [306, 186], [306, 192], [214, 193]] // lily pads
    ] },
    ardennes: { horizon: 110, zones: [
        [[0, 228], [320, 228], [320, 252], [0, 252]], // meadow
        [[0, 190], [200, 198], [200, 228], [0, 228]], // grass under the trees
        [[252, 184], [320, 181], [320, 190], [252, 192]] // far bank of the river
    ] },
    volcano: { horizon: 120, zones: [
        [[0, 212], [320, 210], [320, 252], [0, 252]], // cold lava plain
        [[12, 140], [138, 140], [138, 149], [12, 149]], [[182, 150], [298, 146], [298, 156], [182, 158]] // rock shelves
    ] },
    islands: { horizon: 125, zones: [
        [[0, 222], [320, 220], [320, 252], [0, 252]], // beach
        [[250, 129], [320, 129], [320, 133], [250, 133]], // pier
        [[74, 134], [148, 136], [148, 140], [74, 140]] // islet
    ] },
    galaxy: { horizon: 150, zones: [
        [[0, 204], [320, 204], [320, 252], [0, 252]], // plain
        [[60, 174], [250, 172], [250, 198], [60, 200]], [[0, 186], [55, 186], [55, 200], [0, 200]], [[250, 190], [320, 188], [320, 200], [250, 200]] // plateau
    ] },
    valley: { horizon: 110, zones: [
        [[0, 228], [320, 228], [320, 252], [0, 252]], // meadow
        [[226, 178], [320, 175], [320, 228], [226, 228]], // flowering slope
        [[106, 168], [195, 161], [288, 166], [288, 170], [106, 172]], // bridge
        [[0, 136], [100, 140], [100, 168], [0, 170]], [[100, 128], [320, 124], [320, 148], [100, 150]] // hills
    ] }
};
/** How big an object standing at `foot` looks, relative to the foreground: from FAR at the horizon to NEAR at the bottom edge. */
export const DEPTH = { far: .7, near: 1.12 } as const;
/** An object to find never shrinks below this share of the level's size, however far it stands. */
export const TARGET_MIN_SCALE = .9;
export function depthScale(scene: Scene, foot: number): number {
    const { horizon } = grounds[scene], t = Math.min(1, Math.max(0, (foot - horizon) / (FIELD.height - horizon)));
    return DEPTH.far + (DEPTH.near - DEPTH.far) * t;
}
export function inside(poly: Polygon, x: number, y: number): boolean {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i]!, [xj, yj] = poly[j]!;
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
}
const area = (poly: Polygon): number => Math.abs(poly.reduce((sum, [x, y], i) => { const [nx, ny] = poly[(i + 1) % poly.length]!; return sum + x * ny - nx * y; }, 0)) / 2;
/** A point under an object's feet, picked uniformly over the scene's ground zones. */
function footPoint(scene: Scene, rng: () => number): Point {
    const zones = grounds[scene].zones, weights = zones.map(area), total = weights.reduce((a, b) => a + b, 0);
    let pick = rng() * total, zone = zones[0]!;
    for (const [i, w] of weights.entries()) { if (pick < w) { zone = zones[i]!; break; } pick -= w; }
    const xs = zone.map(p => p[0]), ys = zone.map(p => p[1]);
    for (;;) {
        const x = Math.min(...xs) + rng() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + rng() * (Math.max(...ys) - Math.min(...ys));
        if (inside(zone, x, y)) return { x, y };
    }
}
/** Bottom of an object's drawing: it stands there. */
export const foot = (item: Pick<Item, 'y' | 'size'>): number => item.y + item.size / 2;
export interface State { level: number; scene: Scene; items: Item[]; misses: number; sinceFind: number; hint: number | null; finished: boolean }
export interface Point { x: number; y: number }
/** Every object stands on the ground of the painting, at the size its distance gives it; decoys also vary a little. */
function place(spec: Level, scene: Scene, rng: () => number): Item[] | null {
    const chosen = shuffle(kinds, rng).slice(0, spec.find + spec.decoys);
    const items: Item[] = [];
    const coveredSet = new Set(shuffle(Array.from({ length: spec.find }, (_, i) => i), rng).slice(0, spec.covered));
    for (const [i, kind] of chosen.entries()) {
        const target = i < spec.find, vary = target ? 1 : 0.9 + rng() * 0.2;
        let ok = false;
        for (let attempt = 0; attempt < 400 && !ok; attempt++) {
            const ground = footPoint(scene, rng), depth = depthScale(scene, ground.y);
            const size = Math.round(spec.size * (target ? Math.max(TARGET_MIN_SCALE, depth) : depth * vary));
            // Rounded before the checks, so the stored positions are exactly the ones that passed them.
            const x = Math.round(ground.x * 10) / 10, y = Math.round((ground.y - size / 2) * 10) / 10;
            if (x - size / 2 < 0 || x + size / 2 > FIELD.width || y - size / 2 < 0 || y + size / 2 > FIELD.height) continue;
            if (!grounds[scene].zones.some(z => inside(z, x, y + size / 2))) continue;
            ok = items.every(o => {
                const d = Math.hypot(o.x - x, o.y - y);
                // Decoys may stand partly behind one another, as things do; a target keeps its clear tap zone.
                return d >= (target || o.target ? 0.8 : 0.55) * (o.size + size) / 2 && (!(target || o.target) || d >= TARGET_CLEARANCE);
            });
            if (ok) items.push({ kind, x, y, size, target, covered: target && coveredSet.has(i), found: false });
        }
        if (!ok) return null;
    }
    return items;
}
export function start(level: number, seed: number): State {
    const spec = levels.find(l => l.id === level);
    if (!spec) throw new RangeError('Unknown level');
    const rng = makeRng(seed);
    const first = Math.floor(rng() * scenes.length);
    // A painting with too little ground for this many objects hands over to the next one.
    for (let k = 0; k < scenes.length; k++) {
        const scene = scenes[(first + k) % scenes.length]!;
        for (let round = 0; round < 30; round++) {
            const items = place(spec, scene, rng);
            if (items) return { level, scene, items, misses: 0, sinceFind: 0, hint: null, finished: false };
        }
    }
    throw new RangeError('No layout found');
}
/** The object under a tap: the nearest centre within reach. A decoy drawn over a target's corner takes taps near its own centre. */
export function itemAt(state: State, p: Point): number | null {
    let best: number | null = null, bestDistance = Infinity;
    for (const [i, item] of state.items.entries()) {
        const d = Math.hypot(item.x - p.x, item.y - p.y);
        if (d <= Math.max(HIT_RADIUS, item.size / 2) && d < bestDistance) { best = i; bestDistance = d; }
    }
    return best;
}
/** After three misses in a row, one object still to find is shown. */
export const HINT_AFTER = 3;
export function tap(state: State, p: Point): { state: State; found: number | null } {
    if (state.finished) return { state, found: null };
    const i = itemAt(state, p), item = i === null ? undefined : state.items[i];
    if (i !== null && item?.target && !item.found) {
        const items = state.items.map((o, k) => k === i ? { ...o, found: true } : o);
        return { found: i, state: { ...state, items, sinceFind: 0, hint: null, finished: items.every(o => !o.target || o.found) } };
    }
    // A tap on an object already found is not a mistake.
    if (item?.target && item.found) return { state, found: null };
    const sinceFind = state.sinceFind + 1, misses = state.misses + 1;
    const hint = state.hint ?? (sinceFind >= HINT_AFTER ? state.items.findIndex(o => o.target && !o.found) : null);
    return { found: null, state: { ...state, misses, sinceFind, hint } };
}
export function stars(state: State): 1 | 2 | 3 { return state.misses <= 1 ? 3 : state.misses <= 4 ? 2 : 1; }
export type Records = Partial<Record<number, number>>;
export function complete(records: Records, state: State): Records { return state.finished ? { ...records, [state.level]: Math.max(records[state.level] ?? 0, stars(state)) } : { ...records }; }
export function isUnlocked(id: number, records: Records): boolean { return id === 1 || (records[id - 1] ?? 0) > 0; }
export function parseRecords(raw: string | null): Records {
    try {
        const v: unknown = JSON.parse(raw ?? 'null'); const out: Records = {};
        if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
        for (const [key, score] of Object.entries(v)) if (/^\d+$/.test(key) && Number(key) >= 1 && Number(key) <= levels.length && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) out[Number(key)] = score;
        return out;
    } catch { return {}; }
}
