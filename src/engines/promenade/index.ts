import { written, type Floor, type LevelDef } from './levels';
export { animals, themes, type Animal, type End, type Floor, type LevelDef, type Theme } from './levels';
/** « La promenade de Lumi »: five foals leave a trapdoor and walk to a rainbow door. In front of an obstacle they stop and
 * wait, never fall. The child touches the foal who waits and gives it a job; a wrong job is tried for real and turns into a
 * funny little scene, then the foal waits again. Along the way the scenery plays too: a lost friend, a sleeping bear, a leaf
 * boat, a flower that lowers a drawbridge, fireflies, balloons, a bouncy mushroom, a rainbow fork and treats to pick.
 * Nothing in the scenery moves before the child touches it. No clock, no lives.
 * Pure and deterministic: one tick moves a walking foal by one SUB of a cell. */
/** Height of one floor in tiles: two of air, one of ground. */
export const BAND = 3;
export const SUB = 8;
export const TICK_MS = 40;
export const FOALS = 5;
/** Ticks between two foals leaving the trapdoor, and the smallest gap between two walking foals (in SUBs). */
export const SPAWN_GAP = 12;
export const SPACING = 5;
/** Ticks of a job, or of a scenery thing doing what the child asked. */
export const WORK_TICKS = 32;
/** Ticks of a funny try with the wrong job, before the foal waits again. */
export const FAIL_TICKS = 56;
/** About eight seconds without a touch while a foal waits: what to touch shines; three times as long: Lumi names it. */
export const IDLE_TICKS = 200;
export const NAME_TICKS = 3 * IDLE_TICKS;
/** Funny tries on the same obstacle before the right job shines and Lumi names it. */
export const TRIES_BEFORE_HELP = 3;
export const roles = ['pont', 'tunnel', 'trou', 'echelle'] as const;
export type Role = typeof roles[number];
/** What the scenery asks for: the child touches the thing itself, not the foal. */
export const things = ['ami', 'ours', 'bateau', 'pontlevis', 'lucioles', 'ballon', 'champignon', 'fourche'] as const;
export type Thing = typeof things[number];
export type Kind = Role | Thing;
export const isRole = (k: Kind): k is Role => (roles as readonly string[]).includes(k);
/** A gate on the move from path cell `at` to `at + 1`. */
export interface Gate { at: number; kind: Kind }
/** The funny scene of each wrong job, by the job the obstacle needs: never the same twice. */
export const FAILS = {
    pont: { tunnel: 'plouf', trou: 'jet', echelle: 'balancoire' },
    tunnel: { pont: 'accordeon', trou: 'taupe', echelle: 'glissade' },
    trou: { pont: 'tremplin', tunnel: 'carotte', echelle: 'echasses' },
    echelle: { pont: 'toboggan', tunnel: 'etoiles', trou: 'geyser' }
} as const satisfies Record<Role, Partial<Record<Role, string>>>;
export type Fail = { [R in Role]: typeof FAILS[R][keyof typeof FAILS[R]] }[Role];
export const failOf = (needed: Role, tried: Role): Fail | null => needed === tried ? null : (FAILS[needed] as Record<string, Fail>)[tried]!;

export const width = (level: LevelDef): number => level.floors[0]!.cells.length;
export interface Spot { floor: number; index: number; col: number; cell: string; high: boolean }
const highAt = (floor: Floor, i: number): boolean => floor.up !== undefined && i >= floor.up;
/** Every cell in walking order. The troupe goes down from the last cell of a floor to the first one of the next, same column. */
const pathCache = new WeakMap<LevelDef, Spot[]>();
export function path(level: LevelDef): Spot[] {
    const cached = pathCache.get(level); if (cached) return cached;
    const w = width(level), out = level.floors.flatMap((floor, f) => floor.cells.split('').map((cell, index) => ({ floor: f, index, col: f % 2 === 0 ? index : w - 1 - index, cell, high: highAt(floor, index) })));
    pathCache.set(level, out); return out;
}
const CELL_GATE: Partial<Record<string, Thing | Role>> = { G: 'pont', W: 'tunnel', F: 'ami', B: 'ours', '~': 'bateau', D: 'pontlevis', C: 'ballon' };
/** Every gate in walking order; a move holds at most one (checked by `problems`). */
function gateList(level: LevelDef, all: boolean): Gate[] {
    const spots = path(level), out: Gate[] = [];
    for (let k = 0; k < spots.length - 1; k++) {
        const a = spots[k]!, b = spots[k + 1]!, floor = level.floors[a.floor]!;
        if (a.floor !== b.floor) { if (floor.end === 'dig') out.push({ at: k, kind: 'trou' }); continue; }
        const here: Kind[] = [];
        if (floor.arch && a.index === floor.arch[0]) here.push('fourche');
        if (b.high && !a.high) here.push(a.cell === 'M' ? 'champignon' : 'echelle');
        const g = CELL_GATE[b.cell]; if (g) here.push(g);
        if (b.cell === 'n' && a.cell !== 'n') here.push('lucioles');
        for (const kind of all ? here : here.slice(0, 1)) out.push({ at: k, kind });
    }
    return out;
}
const gateCache = new WeakMap<LevelDef, Gate[]>();
/** The gates of a level, computed once: the engine asks for them at every tick. */
export function gates(level: LevelDef): Gate[] { let g = gateCache.get(level); if (!g) { g = gateList(level, false); gateCache.set(level, g); } return g; }
/** The roles the child has met before this level: from two on, every one of them is offered, not only the right ones. */
export function known(id: number): Role[] {
    const met = new Set(written.filter(l => l.id < id).flatMap(l => gates(l).map(g => g.kind).filter(isRole)));
    return roles.filter(r => met.has(r));
}
/** The jobs a level offers, always in the same order so that a button keeps its place. */
export function offered(level: LevelDef): Role[] {
    const needed = new Set(gates(level).map(g => g.kind).filter(isRole));
    if (!needed.size) return [];
    const before = known(level.id), all = before.length >= 2 ? new Set([...before, ...needed]) : needed;
    return roles.filter(r => all.has(r));
}
/** Treats to pick: `*` in a floor's `top` line, plus three on each rainbow arch (picked up on the way when the troupe takes it). */
export interface Treat { at: number; arch: boolean }
const treatCache = new WeakMap<LevelDef, Treat[]>();
export function treats(level: LevelDef): Treat[] {
    const cached = treatCache.get(level); if (cached) return cached;
    const w = width(level), out: Treat[] = [];
    for (const [f, floor] of level.floors.entries()) {
        for (const [i, c] of (floor.top ?? '').split('').entries()) if (c === '*') out.push({ at: f * w + i, arch: false });
        if (floor.arch) { const [a, b] = floor.arch; for (const t of [.25, .5, .75]) out.push({ at: f * w + a + (b - a) * t, arch: true }); }
    }
    treatCache.set(level, out); return out;
}
const STAND = '.PLMn';
/** What a level must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], { floors } = level, w = floors[0]?.cells.length ?? 0, list = gates(level);
    if (floors.length < 1 || floors.length > 3) out.push('one to three floors');
    if (w < 6 || w > 7) out.push('six or seven cells a floor');
    const spots = path(level);
    for (const [f, floor] of floors.entries()) {
        const c = floor.cells;
        if (c.length !== w || !/^[.GWFB~DnCPLM]+$/.test(c)) out.push(`floor ${f}: ${w} known cells`);
        if ((floor.end === 'door') !== (f === floors.length - 1)) out.push(`floor ${f}: the door ends the last floor only`);
        // Where the troupe arrives and leaves a floor: plain ground (the trapdoor, the landing, the door, the stairs).
        if (!'.PL'.includes(c[0]!) || !'.PL'.includes(c[w - 1]!)) out.push(`floor ${f}: plain ground at both ends`);
        if (f === 0 && (c[0] !== '.' || floor.up === 0)) out.push('the trapdoor stands on low plain ground');
        if (floor.up !== undefined && (floor.up < 2 || floor.up > w - 2)) out.push(`floor ${f}: the step inside the floor`);
        if (f === 0 && floor.top && floor.top.slice(0, 2).includes('*')) out.push('no treat next to the trapdoor');
        if (floor.end === 'door' && floor.top?.[w - 1] === '*') out.push('no treat over the door');
        if (floor.top !== undefined && (floor.top.length !== w || !/^[.*]+$/.test(floor.top))) out.push(`floor ${f}: top line`);
        for (let i = 0; i < w; i++) {
            if (c[i] === 'M' && floor.up !== i + 1) out.push(`floor ${f}: a mushroom stands just before the step`);
            if (c[i] === 'C' && (highAt(floor, i - 1) !== highAt(floor, i + 1))) out.push(`floor ${f}: a rock between two cells of the same height`);
            if (floor.top?.[i] === '*' && 'C'.includes(c[i]!)) out.push(`floor ${f}: no treat inside a rock`);
        }
        const run = c.indexOf('n');
        if (run >= 0 && !/^[^n]*n+[^n]*$/.test(c)) out.push(`floor ${f}: one dark run`);
        if (run >= 0 && floor.up !== undefined && floor.up >= run && floor.up <= c.lastIndexOf('n') + 1) out.push(`floor ${f}: no step in the dark`);
        if (floor.arch) {
            const [a, b] = floor.arch;
            if (a < 1 || b > w - 2 || b - a < 2) out.push(`floor ${f}: arch bounds`);
            for (let i = a + 1; i < b; i++) if (!'.PL'.includes(c[i]!)) out.push(`floor ${f}: plain ground under the arch`);
            if (!'.PL'.includes(c[a]!) || !'.PL'.includes(c[b]!)) out.push(`floor ${f}: the arch stands on plain ground`);
            if (floor.up !== undefined && floor.up > a && floor.up <= b) out.push(`floor ${f}: no step under the arch`);
            if (floor.top && floor.top.split('').some((t, i) => t === '*' && i > a && i < b)) out.push(`floor ${f}: the arch carries its own treats`);
        }
        // Interior gates guard cells 2 to w-2, never two next to each other: there is always a cell to stand and wait on.
        const guarded = list.filter(g => spots[g.at]!.floor === f && spots[g.at + 1]?.floor === f).map(g => spots[g.at + 1]!.index);
        for (const g of guarded) if (g < 2 || g > w - 2) out.push(`floor ${f}: gate at cell ${g}`);
        for (let i = 1; i < guarded.length; i++) if (guarded[i]! - guarded[i - 1]! < 2) out.push(`floor ${f}: gates too close`);
        for (const g of list) if (spots[g.at]!.floor === f && !STAND.includes(spots[g.at]!.cell) && g.kind !== 'trou') out.push(`floor ${f}: the troupe waits on plain ground`);
    }
    if (gateList(level, true).length !== list.length) out.push('one gate per move');
    const friends = spots.filter(s => s.cell === 'F').length, moats = spots.filter(s => s.cell === 'D').length;
    if (friends > 1 || (friends === 1) !== (level.friend !== undefined)) out.push('one lost friend, with its animal');
    if (moats > 1 || (moats === 1) !== (level.button !== undefined)) out.push('one drawbridge, with its flower');
    if (level.button !== undefined && (spots[level.button]?.cell !== '.' || list.some(g => g.at === level.button || g.at + 1 === level.button))) out.push('the flower stands on free plain ground');
    if (list.length > 6) out.push('at most six gates');
    return out;
}
/** How much a level asks: one per gate, one more when it needs two different jobs. */
export function difficulty(level: LevelDef): number {
    const list = gates(level), jobs = new Set(list.map(g => g.kind).filter(isRole));
    return list.length + (jobs.size >= 2 ? 1 : 0);
}
export const levels: readonly LevelDef[] = written;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };

export interface Foal { pos: number; out: boolean; home: boolean }
export type Hint = 'none' | 'start' | 'foal' | 'role';
export type Way = 'arch' | 'straight';
export interface State {
    level: number; tick: number; started: boolean; foals: Foal[];
    /** The lost friend, once found: it walks behind the troupe to the door. */
    friend: Foal | null; cleared: boolean[];
    /** Things at work: the job of the waiting foal, or the scenery doing what it was asked (the flower may be touched early). */
    works: { gate: number; left: number }[];
    /** A wrong job being tried: its funny scene plays, then the foal waits again with nothing lost. */
    fail: { gate: number; role: Role; left: number } | null;
    /** The job buttons are shown (after a touch on the waiting foal). */
    choosing: boolean; errors: number[]; helped: boolean[]; ways: (Way | null)[]; picked: boolean[];
    idle: number; hint: Hint; finished: boolean;
}
export function start(id: number): State {
    const level = levelOf(id), n = gates(level).length;
    return { level: id, tick: 0, started: false, foals: Array.from({ length: FOALS }, () => ({ pos: 0, out: false, home: false })), friend: null,
        cleared: Array<boolean>(n).fill(false), works: [], fail: null, choosing: false, errors: Array<number>(n).fill(0), helped: Array<boolean>(n).fill(false),
        ways: Array<Way | null>(n).fill(null), picked: Array<boolean>(treats(level).length).fill(false), idle: 0, hint: 'none', finished: false };
}
export const lastPos = (level: LevelDef): number => (level.floors.length * width(level) - 1) * SUB;
const leaderOf = (s: State): Foal | undefined => s.foals.find(f => f.out && !f.home);
/** The gate the first foal on the way is waiting at, if any (nobody working on it, no funny try going on). */
export function waiting(s: State): number | null {
    if (s.fail || s.finished) return null;
    const leader = leaderOf(s);
    if (!leader) return null;
    const i = gates(levelOf(s.level)).findIndex((g, k) => !s.cleared[k] && g.at * SUB === leader.pos);
    return i < 0 || s.works.some(w => w.gate === i) ? null : i;
}
/** The gate the leader stands at, waiting or trying: what the field shows the touch zone and the funny try on. */
export function standing(s: State): number | null { return s.fail ? s.fail.gate : waiting(s); }
function step(s: State): State {
    if (s.finished) return s;
    const level = levelOf(s.level), list = gates(level), end = lastPos(level), treatList = treats(level);
    const tick = s.tick + 1;
    if (!s.started) { const idle = s.idle + 1; return { ...s, tick, idle, hint: idle >= IDLE_TICKS ? 'start' : s.hint }; }
    let { cleared, friend, fail, picked } = s;
    const works: State['works'] = [];
    for (const w of s.works) {
        if (w.left > 1) { works.push({ ...w, left: w.left - 1 }); continue; }
        cleared = cleared.map((c, k) => c || k === w.gate);
        if (list[w.gate]!.kind === 'ami') friend = { pos: (list[w.gate]!.at + 1) * SUB, out: true, home: false };
    }
    if (fail) fail = fail.left > 1 ? { ...fail, left: fail.left - 1 } : null;
    const foals = s.foals.map(f => ({ ...f }));
    const blocked = (pos: number): boolean => list.some((g, k) => !cleared[k] && g.at * SUB === pos);
    for (const [i, f] of foals.entries()) {
        if (f.home) continue;
        const ahead = foals.slice(0, i).reverse().find(o => o.out && !o.home);
        if (!f.out) {
            // Leaves the trapdoor in turn, once the one before has moved on.
            if (tick >= i * SPAWN_GAP && foals.slice(0, i).every(o => o.out) && (!ahead || ahead.pos >= SPACING)) f.out = true;
            continue;
        }
        if (blocked(f.pos)) continue;
        if (ahead && f.pos + 1 > ahead.pos - SPACING) continue;
        f.pos += 1;
        if (f.pos >= end) { f.pos = end; f.home = true; }
    }
    // The found friend waits on its cell until the whole troupe has gone by, then follows the last foal.
    if (friend && !friend.home) {
        const last = foals[FOALS - 1]!;
        if (foals.every(f => f.out) && (last.home || friend.pos + 1 <= last.pos - SPACING)) { friend = { ...friend, pos: friend.pos + 1 }; if (friend.pos >= end) friend = { ...friend, pos: end, home: true }; }
    }
    // Treats on a rainbow arch fall into the basket as the first foal goes over them.
    const lead = foals.find(f => f.out && !f.home)?.pos ?? end;
    if (treatList.some((t, k) => t.arch && !picked[k] && lead >= t.at * SUB && archTaken(level, s.ways, t.at)))
        picked = picked.map((p, k) => p || (treatList[k]!.arch && lead >= treatList[k]!.at * SUB && archTaken(level, s.ways, treatList[k]!.at)));
    const friendGate = list.some(g => g.kind === 'ami');
    const next: State = { ...s, tick, cleared, works, fail, friend, picked, foals, finished: foals.every(f => f.home) && (!friendGate || !!friend?.home) };
    const w = waiting(next);
    if (w === null) return { ...next, idle: 0, hint: next.hint === 'role' && (works.length || fail) ? next.hint : 'none', choosing: fail ? next.choosing : false };
    const waited = next.idle + 1, kind = list[w]!.kind;
    if (waited === IDLE_TICKS && next.hint === 'none') return { ...next, idle: waited, hint: 'foal' };
    // Naming the way to go counts as a help, except at a fork where both ways are right.
    if (waited >= NAME_TICKS && next.hint !== 'role') return { ...next, idle: waited, hint: 'role', choosing: isRole(kind) && offered(level).length > 1, helped: kind === 'fourche' ? next.helped : next.helped.map((h, k) => h || k === w) };
    return { ...next, idle: waited };
}
/** Whether the troupe takes the rainbow arch over path position `at` (in cells). */
export function archTaken(level: LevelDef, ways: readonly (Way | null)[], at: number): boolean {
    const list = gates(level), w = width(level), f = Math.floor(at / w), arch = level.floors[f]?.arch;
    if (!arch) return false;
    const k = list.findIndex(g => g.kind === 'fourche' && g.at === f * w + arch[0]);
    return k >= 0 && ways[k] === 'arch' && at >= f * w + arch[0] && at <= f * w + arch[1];
}
export function advance(s: State, ticks = 1): State { let out = s; for (let i = 0; i < ticks; i++) out = step(out); return out; }
/** The trapdoor opens: the troupe sets off. */
export function open(s: State): State { return s.started ? s : { ...s, started: true, idle: 0, hint: 'none' }; }
export type Outcome = 'work' | 'fail' | 'choose' | 'way' | 'pick' | 'ignored';
type Result = { state: State; outcome: Outcome };
const ignored = (s: State): Result => ({ state: s, outcome: 'ignored' });
/** A touch on the foal who waits: a single job starts at once, several show their buttons; at a fork it goes straight on. */
export function touch(s: State): Result {
    const w = waiting(s);
    if (w === null) return ignored(s);
    const kind = gates(levelOf(s.level))[w]!.kind;
    if (kind === 'fourche') return { state: { ...s, cleared: s.cleared.map((c, k) => c || k === w), ways: s.ways.map((v, k) => k === w ? 'straight' : v), idle: 0, hint: 'none' }, outcome: 'way' };
    if (!isRole(kind)) return ignored(s);
    const roleList = offered(levelOf(s.level));
    if (roleList.length === 1) return choose(s, roleList[0]!);
    return { state: { ...s, choosing: true, idle: 0 }, outcome: 'choose' };
}
/** The right job starts the work. Another one is tried for real: its funny scene plays, nothing is lost, and after a few
 * tries on the same obstacle the right button shines while Lumi names it. */
export function choose(s: State, role: Role): Result {
    const w = waiting(s);
    if (w === null) return ignored(s);
    const kind = gates(levelOf(s.level))[w]!.kind;
    if (!isRole(kind)) return ignored(s);
    if (kind === role) return { state: { ...s, works: [...s.works, { gate: w, left: WORK_TICKS }], choosing: false, idle: 0, hint: s.hint === 'role' ? 'role' : 'none' }, outcome: 'work' };
    const errors = s.errors.map((e, k) => k === w ? e + 1 : e), shown = errors[w]! >= TRIES_BEFORE_HELP;
    return { state: { ...s, errors, fail: { gate: w, role, left: FAIL_TICKS }, idle: 0, hint: shown ? 'role' : s.hint === 'role' ? 'role' : 'none', helped: shown ? s.helped.map((h, k) => h || k === w) : s.helped }, outcome: 'fail' };
}
/** A touch on the scenery thing the troupe waits at (the friend, the bear, the leaf boat, the jar, the balloons, the
 * mushroom); at a fork, the rainbow arch. */
export function poke(s: State): Result {
    const w = waiting(s);
    if (w === null) return ignored(s);
    const kind = gates(levelOf(s.level))[w]!.kind;
    if (kind === 'fourche') return { state: { ...s, cleared: s.cleared.map((c, k) => c || k === w), ways: s.ways.map((v, k) => k === w ? 'arch' : v), idle: 0, hint: 'none' }, outcome: 'way' };
    if (isRole(kind) || kind === 'pontlevis') return ignored(s);
    return { state: { ...s, works: [...s.works, { gate: w, left: WORK_TICKS }], idle: 0, hint: s.hint }, outcome: 'work' };
}
/** The drawbridge's flower: it can be touched any time once the walk has started, even before the troupe gets there. */
export function press(s: State): Result {
    const k = gates(levelOf(s.level)).findIndex(g => g.kind === 'pontlevis');
    if (!s.started || k < 0 || s.cleared[k] || s.works.some(w => w.gate === k)) return ignored(s);
    return { state: { ...s, works: [...s.works, { gate: k, left: WORK_TICKS }], idle: waiting(s) === k ? 0 : s.idle }, outcome: 'work' };
}
/** A treat in the air goes into the basket. Treats never count for anything but fun. */
export function pick(s: State, i: number): Result {
    const t = treats(levelOf(s.level))[i];
    if (!t || t.arch || s.picked[i] || s.finished) return ignored(s);
    return { state: { ...s, picked: s.picked.map((p, k) => p || k === i) }, outcome: 'pick' };
}
/** What the child can touch right now, as the field shows it. */
export type Target = { type: 'trap' } | { type: 'foal' } | { type: 'role'; role: Role } | { type: 'thing' } | { type: 'flower' } | { type: 'treat'; index: number };
export function targets(s: State): Target[] {
    if (s.finished) return [];
    const level = levelOf(s.level), list = gates(level), out: Target[] = [];
    if (!s.started) out.push({ type: 'trap' });
    const w = waiting(s);
    if (w !== null) {
        const kind = list[w]!.kind;
        if (isRole(kind)) { if (s.choosing) for (const role of offered(level)) out.push({ type: 'role', role }); else out.push({ type: 'foal' }); }
        else if (kind === 'fourche') out.push({ type: 'foal' }, { type: 'thing' });
        else if (kind !== 'pontlevis') out.push({ type: 'thing' });
    }
    const flower = list.findIndex(g => g.kind === 'pontlevis');
    if (s.started && flower >= 0 && !s.cleared[flower] && !s.works.some(x => x.gate === flower)) out.push({ type: 'flower' });
    for (const [i, t] of treats(level).entries()) if (!t.arch && !s.picked[i]) out.push({ type: 'treat', index: i });
    return out;
}
export function act(s: State, target: Target): Result {
    switch (target.type) {
        case 'trap': return s.started ? ignored(s) : { state: open(s), outcome: 'work' };
        case 'foal': return touch(s);
        case 'role': return choose(s, target.role);
        case 'thing': return poke(s);
        case 'flower': return press(s);
        case 'treat': return pick(s, target.index);
    }
}
/** What the waiting foal needs: the job a hint shows and Lumi names, or the thing to touch. */
export function needed(s: State): Kind | null { const w = waiting(s); return w === null ? null : gates(levelOf(s.level))[w]!.kind; }
export function stars(s: State): 1 | 2 | 3 { const helps = s.helped.filter(Boolean).length; return helps === 0 ? 3 : helps === 1 ? 2 : 1; }
/** Stars by level; `open` carries how many levels were open in the first version of the walk, whose levels were different. */
export type Records = Partial<Record<number, number>> & { open?: number };
export function complete(records: Records, s: State): Records { return s.finished ? { ...records, [s.level]: Math.max(records[s.level] ?? 0, stars(s)) } : { ...records }; }
export function isUnlocked(id: number, records: Records): boolean { return id === 1 || id <= (records.open ?? 0) || (records[id - 1] ?? 0) > 0; }
export function parseRecords(raw: string | null): Records {
    try {
        const v: unknown = JSON.parse(raw ?? 'null'); const out: Records = {};
        if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
        for (const [key, score] of Object.entries(v)) {
            if (key === 'open' && typeof score === 'number' && Number.isInteger(score) && score >= 1) out.open = Math.min(score, levels.length);
            else if (/^\d+$/.test(key) && Number(key) >= 1 && Number(key) <= levels.length && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) out[Number(key)] = score;
        }
        return out;
    } catch { return {}; }
}
/** The first walk had other levels: its stars cannot be kept, but as many levels stay open as were open then. */
export function migrateV1(raw: string | null): Records {
    const old = parseRecords(raw), ids = Object.keys(old).filter(k => /^\d+$/.test(k)).map(Number);
    if (!ids.length) return {};
    const open = Math.min(levels.length, Math.max(...ids) + 1);
    return open > 1 ? { open } : {};
}
/** Where the feet of a walker at `pos` are, in tiles: x across, y down. Between two cells it walks (or climbs, or goes down)
 * in a straight line; it floats over a rock under its balloon, bounces off a mushroom, and goes over a taken arch. */
export function feet(level: LevelDef, pos: number, ways: readonly (Way | null)[] = []): { x: number; y: number; dir: 1 | -1; lift: Lift } {
    const spots = path(level), k = Math.min(spots.length - 1, Math.floor(pos / SUB)), t = pos / SUB - k, u = pos / SUB;
    const at = (s: Spot) => ({ x: s.col + .5, y: s.floor * BAND + (s.high ? 1 : 2) });
    const a = at(spots[k]!), b = spots[k + 1] ? at(spots[k + 1]!) : a;
    let y = a.y + (b.y - a.y) * t, lift: Lift = 'none';
    const sameFloor = spots[k + 1]?.floor === spots[k]!.floor;
    if (sameFloor) {
        // A rock: from the middle of the cell before to the middle of the cell after, up to the top of the sky.
        for (const c of [k, k + 1]) if (spots[c]?.cell === 'C' && spots[c - 1]?.floor === spots[c].floor && u >= c - 1 && u <= c + 1) { y -= Math.sin(Math.PI * (u - c + 1) / 2) * (spots[c].high ? .72 : .95); lift = 'balloon'; }
        if (spots[k]!.cell === 'M' && spots[k + 1]!.high && !spots[k]!.high) { y -= Math.sin(Math.PI * t) * .9; lift = 'bounce'; }
        const w = width(level), f = spots[k]!.floor, arch = level.floors[f]!.arch;
        if (arch && archTaken(level, ways, u)) { const a0 = f * w + arch[0], a1 = f * w + arch[1]; y -= Math.sin(Math.PI * (u - a0) / (a1 - a0)) * 1.05; lift = 'arch'; }
        if (spots[k + 1]!.cell === '~' || spots[k]!.cell === '~') lift = lift === 'none' && (spots[k]!.cell === '~' || t > .5) ? 'boat' : lift;
        if (spots[k]!.cell === 'P' || spots[k]!.cell === 'L') lift = lift === 'none' ? (spots[k]!.cell === 'P' ? 'splash' : 'leaves') : lift;
    }
    return { x: a.x + (b.x - a.x) * t, y, dir: spots[k]!.floor % 2 === 0 ? 1 : -1, lift };
}
export type Lift = 'none' | 'balloon' | 'bounce' | 'arch' | 'boat' | 'splash' | 'leaves';
