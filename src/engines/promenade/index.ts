import { generate, GENERATED, GENERATOR_SEED, handLevels, obstacleCount, type LevelDef } from './levels';
export { themes, type End, type Floor, type LevelDef, type Theme } from './levels';
/** « La promenade de Lumi »: five foals leave a trapdoor and walk to a rainbow door. In front of an obstacle they stop and
 * wait, never fall; the child touches the foal who waits and gives it the right job. No clock, no lives.
 * Pure and deterministic: one tick moves a walking foal by one SUB of a cell. */
export const COLS = 6;
/** Height of one floor in tiles: two of air, one of ground. */
export const BAND = 3;
export const SUB = 8;
export const TICK_MS = 40;
export const FOALS = 5;
/** Ticks between two foals leaving the trapdoor, and the smallest gap between two walking foals (in SUBs). */
export const SPAWN_GAP = 12;
export const SPACING = 5;
/** Ticks a foal works on its job. */
export const WORK_TICKS = 32;
/** About eight seconds without a touch while a foal waits: it shines; as long again: the right job is shown and named. */
export const IDLE_TICKS = 200;
export const SHAKE_TICKS = 18;
export const roles = ['pont', 'tunnel', 'trou', 'echelle'] as const;
export type Role = typeof roles[number];
export interface Obstacle { at: number; role: Role }
export interface Spot { floor: number; index: number; col: number; cell: string; high: boolean }
export const isHigh = (cell: string): boolean => cell === '^' || cell === 'g' || cell === 'w';
/** Every cell in walking order. The troupe goes down from the last cell of a floor to the first one of the next, same column. */
export function path(level: LevelDef): Spot[] {
    return level.floors.flatMap((floor, f) => floor.cells.split('').map((cell, index) => ({ floor: f, index, col: f % 2 === 0 ? index : COLS - 1 - index, cell, high: isHigh(cell) })));
}
/** The obstacle in front of path cell `at`: the move from `at` to `at + 1` waits for its role. */
export function obstacles(level: LevelDef): Obstacle[] {
    const spots = path(level), out: Obstacle[] = [];
    for (let k = 0; k < spots.length - 1; k++) {
        const a = spots[k]!, b = spots[k + 1]!;
        if (a.floor !== b.floor) { if (level.floors[a.floor]!.end === 'dig') out.push({ at: k, role: 'trou' }); continue; }
        if (b.cell === 'G' || b.cell === 'g') out.push({ at: k, role: 'pont' });
        if (b.cell === 'W' || b.cell === 'w') out.push({ at: k, role: 'tunnel' });
        if (!a.high && b.high) out.push({ at: k, role: 'echelle' });
    }
    return out;
}
/** The roles a level offers, always in the same order so that a button keeps its place. */
export function offered(level: LevelDef): Role[] { const used = new Set(obstacles(level).map(o => o.role)); return roles.filter(r => used.has(r)); }
/** What a level must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], { floors } = level, list = obstacles(level);
    if (floors.length < 1 || floors.length > 3) out.push('one to three floors');
    for (const [f, floor] of floors.entries()) {
        if (!/^[.^GgWw]{6}$/.test(floor.cells)) out.push(`floor ${f}: six known cells`);
        if ((floor.end === 'door') !== (f === floors.length - 1)) out.push(`floor ${f}: the door ends the last floor only`);
        // Where the troupe arrives and where it leaves: plain ground (the trapdoor, the landing, the door, the stairs).
        if (!'.^'.includes(floor.cells[0]!) || !'.^'.includes(floor.cells[5]!)) out.push(`floor ${f}: plain ground at both ends`);
        if (f === 0 && floor.cells[0] !== '.') out.push('the trapdoor stands on low ground');
        for (let i = 1; i < 6; i++) if (isHigh(floor.cells[i - 1]!) && !isHigh(floor.cells[i]!)) out.push(`floor ${f}: no way down inside a floor`);
        // Interior obstacles guard cells 2 to 4, never two next to each other: there is always a cell to stand and wait on.
        const guarded = list.filter(o => Math.floor(o.at / 6) === f).map(o => o.at % 6 + 1);
        for (const g of guarded) if (g !== 6 && (g < 2 || g > 4)) out.push(`floor ${f}: obstacle at cell ${g}`);
        for (let i = 1; i < guarded.length; i++) if (guarded[i]! - guarded[i - 1]! < 2) out.push(`floor ${f}: obstacles too close`);
    }
    if (new Set(list.map(o => o.at)).size !== list.length) out.push('one obstacle per move');
    if (list.length > 4) out.push('at most four obstacles');
    if (offered(level).length > 3) out.push('at most three roles');
    return out;
}
/** A level's layout, without its scenery: two levels with the same key play the same way. */
export const layoutKey = (level: LevelDef): string => level.floors.map(f => `${f.cells}/${f.end}`).join('|');
function buildLevels(): LevelDef[] {
    const keys = new Set(handLevels.map(layoutKey));
    const extra = generate(GENERATOR_SEED, GENERATED, handLevels.length + 1, level => {
        const kinds = offered(level).length;
        if (problems(level).length || obstacles(level).length !== obstacleCount(level.id) || kinds < 2 || keys.has(layoutKey(level))) return false;
        keys.add(layoutKey(level)); return true;
    });
    return [...handLevels, ...extra];
}
export const levels: readonly LevelDef[] = buildLevels();
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };

export interface Foal { pos: number; out: boolean; home: boolean }
export type Hint = 'none' | 'start' | 'foal' | 'role';
export interface State {
    level: number; tick: number; started: boolean; foals: Foal[]; cleared: boolean[];
    work: { obstacle: number; left: number } | null;
    /** The role buttons are shown (after a touch on the waiting foal, when the level offers more than one role). */
    choosing: boolean; errors: number[]; helped: boolean[]; idle: number; hint: Hint; shake: number; finished: boolean;
}
export function start(id: number): State {
    const n = obstacles(levelOf(id)).length;
    return { level: id, tick: 0, started: false, foals: Array.from({ length: FOALS }, () => ({ pos: 0, out: false, home: false })), cleared: Array<boolean>(n).fill(false),
        work: null, choosing: false, errors: Array<number>(n).fill(0), helped: Array<boolean>(n).fill(false), idle: 0, hint: 'none', shake: 0, finished: false };
}
export const lastPos = (level: LevelDef): number => (level.floors.length * COLS - 1) * SUB;
/** The obstacle the first foal on the way is waiting at, if any (and nobody is working on it yet). */
export function waiting(s: State): number | null {
    if (s.work || s.finished) return null;
    const leader = s.foals.find(f => f.out && !f.home);
    if (!leader) return null;
    const i = obstacles(levelOf(s.level)).findIndex((o, k) => !s.cleared[k] && o.at * SUB === leader.pos);
    return i < 0 ? null : i;
}
function step(s: State): State {
    if (s.finished) return s;
    const level = levelOf(s.level), list = obstacles(level), end = lastPos(level);
    const tick = s.tick + 1;
    if (!s.started) { const idle = s.idle + 1; return { ...s, tick, idle, hint: idle >= IDLE_TICKS ? 'start' : s.hint }; }
    let { cleared, work, hint, idle } = s;
    if (work) {
        const left = work.left - 1;
        if (left <= 0) { cleared = cleared.map((c, k) => c || k === work!.obstacle); work = null; hint = 'none'; idle = 0; }
        else work = { ...work, left };
    }
    const foals = s.foals.map(f => ({ ...f }));
    for (const [i, f] of foals.entries()) {
        if (f.home) continue;
        const ahead = foals.slice(0, i).reverse().find(o => o.out && !o.home);
        if (!f.out) {
            // Leaves the trapdoor in turn, once the one before has moved on.
            if (tick >= i * SPAWN_GAP && foals.slice(0, i).every(o => o.out) && (!ahead || ahead.pos >= SPACING)) f.out = true;
            continue;
        }
        if (work) continue;
        if (list.some((o, k) => !cleared[k] && o.at * SUB === f.pos)) continue;
        if (ahead && f.pos + 1 > ahead.pos - SPACING) continue;
        f.pos += 1;
        if (f.pos >= end) { f.pos = end; f.home = true; }
    }
    const next: State = { ...s, tick, cleared, work, hint, idle, foals, shake: Math.max(0, s.shake - 1), finished: foals.every(f => f.home) };
    const w = waiting(next);
    if (w === null) return { ...next, idle: 0, hint: next.hint === 'role' && work ? next.hint : 'none', choosing: false };
    const waited = next.idle + 1;
    if (waited === IDLE_TICKS && next.hint === 'none') return { ...next, idle: waited, hint: 'foal' };
    if (waited >= 2 * IDLE_TICKS && next.hint !== 'role') return { ...next, idle: waited, hint: 'role', choosing: offered(level).length > 1, helped: next.helped.map((h, k) => h || k === w) };
    return { ...next, idle: waited };
}
export function advance(s: State, ticks = 1): State { let out = s; for (let i = 0; i < ticks; i++) out = step(out); return out; }
/** The trapdoor opens: the troupe sets off. */
export function open(s: State): State { return s.started ? s : { ...s, started: true, idle: 0, hint: 'none' }; }
export type Outcome = 'work' | 'wrong' | 'choose' | 'ignored';
/** A touch on the foal who waits: with a single role it starts working, otherwise the role buttons show. */
export function touch(s: State): { state: State; outcome: Outcome } {
    if (waiting(s) === null) return { state: s, outcome: 'ignored' };
    const roleList = offered(levelOf(s.level));
    if (roleList.length === 1) return choose(s, roleList[0]!);
    return { state: { ...s, choosing: true, idle: 0 }, outcome: 'choose' };
}
/** The right role starts the work; another one makes the foal shake its head. Two wrong roles show the right one. */
export function choose(s: State, role: Role): { state: State; outcome: Outcome } {
    const w = waiting(s);
    if (w === null) return { state: s, outcome: 'ignored' };
    if (obstacles(levelOf(s.level))[w]!.role === role) return { state: { ...s, work: { obstacle: w, left: WORK_TICKS }, choosing: false, idle: 0, hint: 'none' }, outcome: 'work' };
    const errors = s.errors.map((e, k) => k === w ? e + 1 : e), shown = errors[w]! >= 2;
    return { state: { ...s, errors, shake: SHAKE_TICKS, idle: 0, hint: shown ? 'role' : s.hint, helped: shown ? s.helped.map((h, k) => h || k === w) : s.helped }, outcome: 'wrong' };
}
/** The role the waiting foal needs: what a hint shows and Lumi names. */
export function needed(s: State): Role | null { const w = waiting(s); return w === null ? null : obstacles(levelOf(s.level))[w]!.role; }
export function stars(s: State): 1 | 2 | 3 { const helps = s.helped.filter(Boolean).length; return helps === 0 ? 3 : helps === 1 ? 2 : 1; }
export type Records = Partial<Record<number, number>>;
export function complete(records: Records, s: State): Records { return s.finished ? { ...records, [s.level]: Math.max(records[s.level] ?? 0, stars(s)) } : { ...records }; }
export function isUnlocked(id: number, records: Records): boolean { return id === 1 || (records[id - 1] ?? 0) > 0; }
export function parseRecords(raw: string | null): Records {
    try {
        const v: unknown = JSON.parse(raw ?? 'null'); const out: Records = {};
        if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
        for (const [key, score] of Object.entries(v)) if (/^\d+$/.test(key) && Number(key) >= 1 && Number(key) <= levels.length && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) out[Number(key)] = score;
        return out;
    } catch { return {}; }
}
/** Where the feet of a foal at `pos` are, in tiles: x across, y down. Between two cells it walks (or climbs, or goes down) in a straight line. */
export function feet(level: LevelDef, pos: number): { x: number; y: number; dir: 1 | -1 } {
    const spots = path(level), k = Math.min(spots.length - 1, Math.floor(pos / SUB)), t = pos / SUB - k;
    const at = (s: Spot) => ({ x: s.col + .5, y: s.floor * BAND + (s.high ? 1 : 2) });
    const a = at(spots[k]!), b = spots[k + 1] ? at(spots[k + 1]!) : a;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dir: spots[k]!.floor % 2 === 0 ? 1 : -1 };
}
