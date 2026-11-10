import { makeRng } from '../rng';
/** Levels of « La promenade de Lumi ». A level is one to three floors stacked from top to bottom; the troupe walks the
 * first floor to the right, the second to the left, and so on, going down at the end of each floor.
 *
 * `cells` lists a floor's six cells in WALKING order (index 0 is where the troupe enters it, index 5 where it leaves):
 *   `.` low ground   `^` high ground (one tile up; going up from low ground needs a ladder)
 *   `G` / `g` a ditch in low / high ground (a bridge)   `W` / `w` a wall standing on low / high ground (a tunnel)
 * `end` says how the troupe leaves the floor: `stairs` go down by themselves, `dig` is soft earth to dig through (a hole),
 * `door` is the rainbow door of the last floor. Rules are checked by `problems()` in index.ts and tests/promenade.test.ts. */
export type End = 'stairs' | 'dig' | 'door';
export interface Floor { cells: string; end: End }
export const themes = ['prairie', 'plage', 'neige', 'automne'] as const;
export type Theme = typeof themes[number];
export interface LevelDef { id: number; theme: Theme; floors: readonly Floor[] }

const door = (cells: string): Floor => ({ cells, end: 'door' });
/** Twelve levels written by hand: walking, then each role on its own, then two, then three obstacles. */
const drawn: readonly LevelDef[] = [
    { id: 1, theme: 'prairie', floors: [door('......')] },
    { id: 2, theme: 'prairie', floors: [door('...G..')] },
    { id: 3, theme: 'automne', floors: [door('...W..')] },
    { id: 4, theme: 'plage', floors: [{ cells: '......', end: 'dig' }, door('......')] },
    { id: 5, theme: 'neige', floors: [door('...^^^')] },
    { id: 6, theme: 'prairie', floors: [door('..G.W.')] },
    { id: 7, theme: 'plage', floors: [door('..^^g^')] },
    { id: 8, theme: 'automne', floors: [{ cells: '......', end: 'dig' }, door('...W..')] },
    { id: 9, theme: 'neige', floors: [{ cells: '...G..', end: 'dig' }, door('......')] },
    { id: 10, theme: 'prairie', floors: [{ cells: '..W...', end: 'dig' }, door('...^^^')] },
    { id: 11, theme: 'plage', floors: [{ cells: '..G...', end: 'dig' }, { cells: '....W.', end: 'stairs' }, door('......')] },
    { id: 12, theme: 'neige', floors: [{ cells: '..^^^^', end: 'dig' }, { cells: '...G..', end: 'stairs' }, door('......')] }
];
/** Generated levels: fixed seed, so every device plays the same list. */
export const GENERATOR_SEED = 20261110;
export const GENERATED = 40;
/** Obstacles in a generated level: two up to level 24, three up to 38, then four (never more). */
export function obstacleCount(id: number): number { return id <= 24 ? 2 : id <= 38 ? 3 : 4; }
/** Interior obstacles of a floor, by walking index of the cell they guard: never next to each other, never at the ends. */
const interior: readonly (readonly number[])[] = [[], [2], [3], [4], [2, 4]];
type Rng = () => number;
const pick = <T>(rng: Rng, values: readonly T[]): T => values[Math.floor(rng() * values.length)]!;
function randomFloor(rng: Rng, end: End): Floor {
    const cells = ['.', '.', '.', '.', '.', '.'];
    let high = false;
    for (const t of pick(rng, interior)) {
        const kind = pick(rng, high ? ['G', 'W'] : ['G', 'W', 'S']);
        if (kind === 'S') { high = true; for (let i = t; i < 6; i++) cells[i] = '^'; }
        else cells[t] = high ? kind.toLowerCase() : kind;
    }
    return { cells: cells.join(''), end };
}
/** A layout with exactly `n` obstacles of two or three kinds; `accept` filters the rest (rules, repeats). */
export function generate(seed: number, count: number, first: number, accept: (level: LevelDef) => boolean): LevelDef[] {
    const rng = makeRng(seed), out: LevelDef[] = [];
    for (let id = first; out.length < count; id++) {
        const n = obstacleCount(id);
        for (let attempt = 0; ; attempt++) {
            if (attempt > 5000) throw new RangeError(`No layout for level ${id}`);
            const floorsCount = pick(rng, n <= 2 ? [1, 2] : n === 3 ? [2, 2, 3] : [2, 3, 3]);
            const floors = Array.from({ length: floorsCount }, (_, f) => randomFloor(rng, f === floorsCount - 1 ? 'door' : rng() < .5 ? 'dig' : 'stairs'));
            const level: LevelDef = { id, theme: themes[id % themes.length]!, floors };
            if (accept(level)) { out.push(level); break; }
        }
    }
    return out;
}
export const handLevels = drawn;
