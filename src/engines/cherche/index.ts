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
/** find: objects to find; decoys: other objects in the way; size: drawn size in field units; covered: targets half hidden behind grass. */
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
export interface State { level: number; scene: Scene; items: Item[]; misses: number; sinceFind: number; hint: number | null; finished: boolean }
export interface Point { x: number; y: number }
/** Decoys vary a little in size so the scene does not look like a grid; targets keep the level's size. */
function place(spec: Level, rng: () => number): Item[] | null {
    const chosen = shuffle(kinds, rng).slice(0, spec.find + spec.decoys);
    const items: Item[] = [];
    const coveredSet = new Set(shuffle(Array.from({ length: spec.find }, (_, i) => i), rng).slice(0, spec.covered));
    for (const [i, kind] of chosen.entries()) {
        const target = i < spec.find, size = target ? spec.size : Math.round(spec.size * (0.85 + rng() * 0.3));
        const margin = size / 2 + 2;
        let ok = false;
        for (let attempt = 0; attempt < 400 && !ok; attempt++) {
            // Rounded before the checks, so the stored positions are exactly the ones that passed them.
            const x = Math.round((margin + rng() * (FIELD.width - 2 * margin)) * 10) / 10, y = Math.round((margin + rng() * (FIELD.height - 2 * margin)) * 10) / 10;
            ok = items.every(o => {
                const d = Math.hypot(o.x - x, o.y - y);
                // Objects may touch but never sit on top of each other; a target keeps its clear tap zone.
                return d >= 0.8 * (o.size + size) / 2 && (!(target || o.target) || d >= TARGET_CLEARANCE);
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
    const scene = scenes[Math.floor(rng() * scenes.length)]!;
    for (let round = 0; round < 50; round++) {
        const items = place(spec, rng);
        if (items) return { level, scene, items, misses: 0, sinceFind: 0, hint: null, finished: false };
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
