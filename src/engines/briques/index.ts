import { colors, drawings, features, handLevels, letters, type ColorId, type Feature, type LevelDef } from './levels';
export { colors, drawings, features, type ColorId, type DrawingId, type Feature, type LevelDef } from './levels';
/** « Les briques de Lumi »: a wall of coloured bricks hides a drawing. Lumi, at the bottom, throws a ball where the child
 * aims; the ball bounces on the walls, the clouds above, the grass below and the bricks, breaks what it touches, then
 * comes back by itself into Lumi's arms after a fixed number of bounces. It never falls: no paddle, no reflex, no clock,
 * no lives, nothing to lose. Each throw is one turn: aim, let go, watch. The scene ends when every brick that can break
 * is broken and the whole drawing shows.
 *
 * Pure and deterministic. A throw is an angle in whole degrees (0 straight up, negative to the left); the flight is a
 * fixed-step simulation in board units (the board is 150 × 250, a brick 22 × 22, the ball has a radius of 4.5 and moves 3 units per step): the
 * same throw always breaks the same bricks along the same path. */
export const WIDTH = 150;
export const HEIGHT = 250;
export const COLS = 6;
export const CELL = 22;
export const X0 = (WIDTH - COLS * CELL) / 2;
export const Y0 = 14;
/** The cloud ceiling and the grass the ball bounces on. */
export const CEIL = 8;
export const FLOOR = 236;
export const BALL_R = 4.5;
/** Where the ball rests, in Lumi's arms above her head. */
export const LAUNCH = { x: 75, y: 204 } as const;
/** A ball coming down onto Lumi lands back in her arms: half the width of that catch, and its top. */
export const CATCH_HALF = 14;
export const CATCH_Y = 196;
/** Board units per simulation step. Below the ball's radius: it never jumps over a brick's edge. */
export const STEP = 3;
/** Bounces before the ball comes back by itself into Lumi's arms. */
export const MAX_BOUNCES = 7;
/** A step budget, never reached in practice: a ball that has flown this far comes back too. */
export const MAX_STEPS = 1600;
/** The second ball given by a sweet brick leaves this many steps after the first, along the same aim. */
export const SECOND_DELAY = 14;
/** Aim from 80° left to 80° right of straight up, in whole degrees. */
export const AIM_MAX = 80;
export const aims: readonly number[] = Array.from({ length: 2 * AIM_MAX + 1 }, (_, i) => i - AIM_MAX);
export const clampAim = (deg: number): number => Math.max(-AIM_MAX, Math.min(AIM_MAX, Math.round(deg)));
/** Throws in a row that break nothing before the help shows a good direction. */
export const DRY_HELP = 3;
/** A throw within this many degrees of the help's direction uses the help. */
export const HELP_TOLERANCE = 2;
/** Side-wall bounces that make the ball dizzy. */
export const TOURNIS_WALLS = 4;
/** Funny tries: a throw that breaks and cracks nothing. Each has its own animation, and each is met in at least one scene.
 * Named after what the ball did last before coming home: `tremble`, it sank into a jelly brick, which wobbles; `tete`,
 * it came down on Lumi's head; `tournis`, it bounced on the side walls four times or last, and comes back dizzy;
 * `rigole`, it bounced on an iron brick, which laughs; `atchoum`, it touched the cloud ceiling, which sneezes; `boing`,
 * it bounced on the grass. */
export const misses = ['rigole', 'tremble', 'tete', 'atchoum', 'tournis', 'boing'] as const;
export type Miss = typeof misses[number];
export type Kind = 'brique' | 'dur' | 'metal' | 'gelee' | 'bonbon' | 'bombe' | 'mobile';
export interface Brick { id: number; row: number; col: number; kind: Kind; color: ColorId | null; hits: number; dir: number }
export interface Point { x: number; y: number }
/** A point of a ball's flight, `t` in steps since the throw. */
export interface Key { x: number; y: number; t: number }
export interface Flight { keys: Key[]; start: number; landed: number; caught: boolean; color: ColorId | null }
export type EventKind = 'break' | 'crack' | 'boom' | 'metal' | 'jelly' | 'sweet';
export interface Event { t: number; id: number; kind: EventKind; ball: number }
export interface State {
    level: number; bricks: Brick[]; shots: number;
    /** Balls on the next throw: one, or two after a sweet brick. */
    balls: number;
    /** Throws in a row that broke or cracked nothing. */
    dry: number; helps: number; broken: number; finished: boolean;
}
export interface Shot {
    aim: number; flights: Flight[]; events: Event[]; broken: Brick[]; cracked: Brick[]; moved: { id: number; from: number; to: number }[];
    miss: Miss | null; helped: boolean; sweet: boolean;
    /** What the balls touched, for the funny tries: the first touch of the ceiling and of the grass, the side walls. */
    ceiling: Key | null; grass: Key | null; walls: number; metal: number[]; jelly: number[];
}

export const has = (level: LevelDef, f: Feature): boolean => level.features.includes(f);
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const breakable = (b: Brick): boolean => b.kind !== 'metal' && b.kind !== 'gelee';
export const cellRect = (row: number, col: number): { x: number; y: number; w: number; h: number } => ({ x: X0 + col * CELL, y: Y0 + row * CELL, w: CELL, h: CELL });
export function parse(level: LevelDef): Brick[] {
    const out: Brick[] = [];
    level.rows.forEach((line, row) => line.split('').forEach((ch, col) => {
        const lower = ch.toLowerCase(), base = { id: out.length, row, col, color: null, hits: 1, dir: 0 };
        if (ch === '.') return;
        if (letters[lower]) out.push({ ...base, kind: ch === lower ? 'brique' : 'dur', color: letters[lower], hits: ch === lower ? 1 : 2 });
        else if (ch === 'm') out.push({ ...base, kind: 'metal' });
        else if (ch === 'g') out.push({ ...base, kind: 'gelee' });
        else if (ch === 'c') out.push({ ...base, kind: 'bonbon' });
        else if (ch === 'x') out.push({ ...base, kind: 'bombe' });
        else if (ch === '>' || ch === '<') out.push({ ...base, kind: 'mobile', dir: ch === '>' ? 1 : -1 });
    }));
    return out;
}
/** The colours of the bricks of a scene, in the catalogue order. */
export function palette(level: LevelDef): ColorId[] { const used = new Set(parse(level).map(b => b.color)); return colors.filter(c => used.has(c)); }
/** Pairs of colours too close to share a scene where the ball has a colour (the test measures them in CIELAB). */
export const closeColors: readonly (readonly [ColorId, ColorId])[] = [['rouge', 'orange'], ['orange', 'jaune'], ['bleu', 'violet']];
/** Bricks at most before scene 8: the first scenes stay short. */
export const EARLY_BRICKS = 12;
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], bricks = parse(level), kinds = new Set(bricks.map(b => b.kind));
    if (level.rows.length < 1 || level.rows.length > 6) out.push('one to six rows');
    level.rows.forEach((line, row) => { if (line.length !== COLS) out.push(`row ${row}: ${COLS} places`); if (!/^[.rojvbpROJVBPmgcx<>]+$/.test(line)) out.push(`row ${row}: known places`); });
    if (!bricks.some(breakable)) out.push('something to break');
    if (level.id < 8 && bricks.length > EARLY_BRICKS) out.push(`at most ${EARLY_BRICKS} bricks before scene 8`);
    const want: Record<Feature, boolean> = { dur: kinds.has('dur'), metal: kinds.has('metal'), bonbon: kinds.has('bonbon'), bombe: kinds.has('bombe'), mobile: kinds.has('mobile'), gelee: kinds.has('gelee'), couleur: has(level, 'couleur') };
    for (const f of features) if (has(level, f) !== want[f]) out.push(`${f} where the scene says so`);
    if (new Set(level.features).size !== level.features.length || level.features.some(f => !features.includes(f))) out.push('known features once');
    if (!drawings.includes(level.drawing)) out.push('a known drawing');
    if (has(level, 'couleur')) {
        const used = palette(level);
        if (used.length < 2) out.push('two colours for the coloured ball');
        for (const [a, b] of closeColors) if (used.includes(a) && used.includes(b)) out.push(`${a} and ${b} look alike`);
    }
    return out;
}

export function start(id: number): State {
    return { level: id, bricks: parse(levelOf(id)), shots: 0, balls: 1, dry: 0, helps: 0, broken: 0, finished: false };
}
/** The colour of the ball for the next throw: in the scenes with the coloured ball, the colours still on the wall in
 * turn; elsewhere none (a white ball). */
export function ballColor(s: State): ColorId | null {
    if (!has(levelOf(s.level), 'couleur')) return null;
    const left = colors.filter(c => s.bricks.some(b => b.color === c));
    return left.length ? left[s.shots % left.length]! : null;
}
export const helpOn = (s: State): boolean => !s.finished && s.dry >= DRY_HELP;

/** The wall as a table of places: six rows of six. */
const ROWS = 6;
class Grid {
    private cells: (Brick | undefined)[] = new Array<Brick | undefined>(ROWS * COLS);
    get(row: number, col: number): Brick | undefined { return row >= 0 && row < ROWS && col >= 0 && col < COLS ? this.cells[row * COLS + col] : undefined; }
    set(row: number, col: number, b: Brick | undefined): void { this.cells[row * COLS + col] = b; }
    values(): Brick[] { return this.cells.filter((b): b is Brick => b !== undefined); }
}
interface Ball { x: number; y: number; dx: number; dy: number; bounces: number; done: boolean; flight: Flight }
const touches = (x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean => {
    const cx = Math.max(r.x, Math.min(x, r.x + r.w)), cy = Math.max(r.y, Math.min(y, r.y + r.h));
    return (x - cx) ** 2 + (y - cy) ** 2 < BALL_R * BALL_R;
};
/** One throw at `deg`. `quick` stops at the first brick broken or cracked (used to know whether a throw does anything). */
function simulate(s: State, deg: number, quick = false): { bricks: Brick[]; shot: Shot } {
    const a = clampAim(deg) * Math.PI / 180, color = ballColor(s);
    const bricks = s.bricks.map(b => ({ ...b })), grid = new Grid();
    for (const b of bricks) grid.set(b.row, b.col, b);
    const events: Event[] = [], broken: Brick[] = [], cracked: Brick[] = [];
    let ceiling: Key | null = null, grass: Key | null = null, walls = 0, sweet = false, last: 'metal' | 'ceiling' | 'grass' | 'wall' | null = null;
    const metal = new Set<number>(), jelly = new Set<number>();
    const balls: Ball[] = Array.from({ length: s.balls }, (_, k) => ({ x: LAUNCH.x, y: LAUNCH.y, dx: Math.sin(a), dy: -Math.cos(a), bounces: 0, done: false,
        flight: { keys: [{ x: LAUNCH.x, y: LAUNCH.y, t: k * SECOND_DELAY }], start: k * SECOND_DELAY, landed: 0, caught: false, color } }));
    const damage = (b: Brick, t: number, ball: number, whole = false): void => {
        if (grid.get(b.row, b.col) !== b || !breakable(b)) return;
        if (b.kind === 'dur' && b.hits > 1 && !whole) { b.hits--; cracked.push({ ...b }); events.push({ t, id: b.id, kind: 'crack', ball }); return; }
        grid.set(b.row, b.col, undefined); broken.push({ ...b });
        if (b.kind === 'bonbon') { sweet = true; events.push({ t, id: b.id, kind: 'sweet', ball }); }
        else if (b.kind === 'bombe') {
            events.push({ t, id: b.id, kind: 'boom', ball });
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const n = grid.get(b.row + dr, b.col + dc); if (n) damage(n, t, ball); }
        } else events.push({ t, id: b.id, kind: 'break', ball });
    };
    const finish = (ball: Ball, t: number, caught: boolean): void => {
        ball.done = true; ball.flight.caught = caught;
        ball.flight.keys.push({ x: ball.x, y: ball.y, t });
        const back = Math.hypot(LAUNCH.x - ball.x, LAUNCH.y - ball.y) / STEP;
        ball.flight.landed = t + Math.max(1, Math.round(back));
        ball.flight.keys.push({ x: LAUNCH.x, y: LAUNCH.y, t: ball.flight.landed });
    };
    for (let t = 1; t <= MAX_STEPS + balls.length * SECOND_DELAY && balls.some(b => !b.done); t++) {
        for (const [k, ball] of balls.entries()) {
            if (ball.done || t <= ball.flight.start) continue;
            if (t - ball.flight.start >= MAX_STEPS) { finish(ball, t, false); continue; }
            const nx = ball.x + ball.dx * STEP, ny = ball.y + ball.dy * STEP;
            let flipX = false, flipY = false, corner: Point | null = null, stop = false;
            if (nx < BALL_R || nx > WIDTH - BALL_R) { flipX = true; walls++; last = 'wall'; }
            if (ny < CEIL + BALL_R) { flipY = true; ceiling = { x: nx, y: CEIL, t }; last = 'ceiling'; }
            if (ny > FLOOR - BALL_R) { flipY = true; grass = { x: nx, y: FLOOR, t }; last = 'grass'; }
            const c0 = Math.floor((nx - BALL_R - X0) / CELL), c1 = Math.floor((nx + BALL_R - X0) / CELL), r0 = Math.floor((ny - BALL_R - Y0) / CELL), r1 = Math.floor((ny + BALL_R - Y0) / CELL);
            scan: for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) {
                const b = grid.get(row, col);
                if (!b) continue;
                const r = cellRect(row, col);
                if (!touches(nx, ny, r)) continue;
                if (b.kind === 'gelee') { jelly.add(b.id); events.push({ t, id: b.id, kind: 'jelly', ball: k }); stop = true; break scan; }
                if (b.kind === 'metal') { metal.add(b.id); events.push({ t, id: b.id, kind: 'metal', ball: k }); last = 'metal'; }
                const through = color !== null && b.color === color;
                damage(b, t, k, through);
                if (through) continue;
                const inX = ball.x > r.x && ball.x < r.x + r.w, inY = ball.y > r.y && ball.y < r.y + r.h;
                if (inX) flipY = true; else if (inY) flipX = true; else corner ??= { x: ball.x < r.x ? r.x : r.x + r.w, y: ball.y < r.y ? r.y : r.y + r.h };
            }
            if (stop) { ball.x = nx; ball.y = ny; finish(ball, t, false); continue; }
            if (flipX || flipY || corner) {
                if (flipX || flipY) { if (flipX) ball.dx = -ball.dx; if (flipY) ball.dy = -ball.dy; }
                else {
                    const nxv = ball.x - corner!.x, nyv = ball.y - corner!.y, len = Math.hypot(nxv, nyv) || 1, ux = nxv / len, uy = nyv / len, dot = ball.dx * ux + ball.dy * uy;
                    if (dot < 0) { ball.dx -= 2 * dot * ux; ball.dy -= 2 * dot * uy; } else { ball.dx = -ball.dx; ball.dy = -ball.dy; }
                }
                ball.bounces++; ball.flight.keys.push({ x: ball.x, y: ball.y, t });
                if (ball.bounces >= MAX_BOUNCES) finish(ball, t, false);
            } else {
                ball.x = nx; ball.y = ny;
                if (ball.dy > 0 && ball.y >= CATCH_Y && Math.abs(ball.x - LAUNCH.x) <= CATCH_HALF) finish(ball, t, true);
            }
        }
        if (quick && (broken.length || cracked.length)) break;
    }
    for (const ball of balls) if (!ball.done) finish(ball, MAX_STEPS, false);
    const left = grid.values();
    // Bricks on wheels roll one place along their row once the balls are back, turning round at an edge or a brick.
    const moved: Shot['moved'] = [];
    for (const b of left.filter(x => x.kind === 'mobile').sort((p, q) => p.id - q.id)) {
        const free = (col: number): boolean => col >= 0 && col < COLS && !grid.get(b.row, col);
        if (!free(b.col + b.dir)) b.dir = -b.dir;
        if (free(b.col + b.dir)) { grid.set(b.row, b.col, undefined); moved.push({ id: b.id, from: b.col, to: b.col + b.dir }); b.col += b.dir; grid.set(b.row, b.col, b); }
    }
    let miss: Miss | null = null;
    if (!broken.length && !cracked.length) {
        const caught = balls.some(b => b.flight.caught);
        // What the ball did last before coming home: sank into jelly, landed on Lumi's head, went round and round between
        // the side walls, or touched iron, the clouds or the grass.
        miss = jelly.size ? 'tremble' : caught ? 'tete' : walls >= TOURNIS_WALLS || last === 'wall' ? 'tournis' : last === 'metal' ? 'rigole' : last === 'ceiling' ? 'atchoum' : 'boing';
    }
    const kept = grid.values().sort((p, q) => p.id - q.id);
    return { bricks: kept, shot: { aim: clampAim(deg), flights: balls.map(b => b.flight), events, broken, cracked, moved, miss, helped: false, sweet, ceiling, grass, walls, metal: [...metal], jelly: [...jelly] } };
}
/** Lumi throws at `deg`. Never loses anything: the ball always comes back. */
export function fire(s: State, deg: number): { state: State; shot: Shot | null } {
    if (s.finished) return { state: s, shot: null };
    const { bricks, shot } = simulate(s, deg);
    if (helpOn(s)) { const g = goodAim(s); shot.helped = g !== null && Math.abs(clampAim(deg) - g) <= HELP_TOLERANCE; }
    const progress = shot.broken.length + shot.cracked.length > 0;
    const finished = !bricks.some(breakable);
    const state: State = { ...s, bricks, shots: s.shots + 1, balls: shot.sweet ? 2 : 1, dry: progress ? 0 : s.dry + 1, helps: s.helps + (shot.helped ? 1 : 0), broken: s.broken + shot.broken.length, finished };
    return { state, shot };
}
/** Does a throw at `deg` break or crack anything? Stops at the first brick. */
export function breaks(s: State, deg: number): boolean { const { shot } = simulate(s, deg, true); return shot.broken.length + shot.cracked.length > 0; }
/** How good a throw is for the greedy player and for the help: bricks broken, cracks counting half, a sweet a little more. */
export function score(shot: Shot): number { return shot.broken.length + shot.cracked.length / 2 + (shot.sweet ? 0.5 : 0); }
/** The best throw from here, or null when nothing breaks anything: what the help shows. Among equally good throws, the
 * straightest one. */
export function goodAim(s: State): number | null {
    if (s.finished) return null;
    // A pure function of the wall, the balls and their colour: remembered for the throws in a row that change nothing.
    const key = `${s.level}|${s.balls}|${ballColor(s) ?? ''}|${s.bricks.map(b => `${b.id}.${b.col}.${b.hits}.${b.dir}`).join(',')}`, known = goodCache.get(key);
    if (known !== undefined) return known;
    const found = searchAim(s);
    if (goodCache.size > 256) goodCache.clear();
    goodCache.set(key, found);
    return found;
}
const goodCache = new Map<string, number | null>();
function searchAim(s: State): number | null {
    let best: number | null = null, top = 0;
    for (const a of [...aims].sort((p, q) => Math.abs(p) - Math.abs(q) || p - q)) {
        const v = score(simulate(s, a).shot);
        if (v > top + 1e-9) { top = v; best = a; }
    }
    return best;
}
/** The path of the first ball up to its first bounce, then a little beyond: what the dotted aim line shows. */
export function aimLine(s: State, deg: number, beyond = 34): Point[] {
    const { shot } = simulate({ ...s, balls: 1 }, deg), keys = shot.flights[0]!.keys;
    const first = keys[1] ?? keys[0]!, second = keys[2];
    const out: Point[] = [{ x: keys[0]!.x, y: keys[0]!.y }, { x: first.x, y: first.y }];
    if (second) { const len = Math.hypot(second.x - first.x, second.y - first.y) || 1, k = Math.min(1, beyond / len); out.push({ x: first.x + (second.x - first.x) * k, y: first.y + (second.y - first.y) * k }); }
    return out;
}
/** Where a ball is at step `t` of its flight. */
export function ballAt(f: Flight, t: number): Point {
    const keys = f.keys;
    if (t <= keys[0]!.t) return { x: keys[0]!.x, y: keys[0]!.y };
    for (let i = 1; i < keys.length; i++) {
        const a = keys[i - 1]!, b = keys[i]!;
        if (t <= b.t) { const k = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
    }
    const last = keys[keys.length - 1]!; return { x: last.x, y: last.y };
}
export function stars(s: State): 1 | 2 | 3 { return s.helps === 0 ? 3 : s.helps <= 2 ? 2 : 1; }
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
/** Two scenes play differently when they differ in at least this many places, counted by `distance`. */
export const MIN_GAP = 4;
/** Places whose content differs once colours are renamed in order of appearance (so a mere recolouring counts as the
 * same scene), plus four per feature one scene has and the other not. */
export function distance(a: LevelDef, b: LevelDef): number {
    const canon = (l: LevelDef): Map<string, string> => {
        const names = new Map<string, string>(), out = new Map<string, string>();
        for (const c of parse(l)) {
            let v: string = c.kind + (c.dir ? String(c.dir) : '');
            if (c.color) { if (!names.has(c.color)) names.set(c.color, String(names.size)); v += names.get(c.color)!; }
            out.set(`${c.row}:${c.col}`, v);
        }
        return out;
    };
    const ca = canon(a), cb = canon(b), places = new Set([...ca.keys(), ...cb.keys()]);
    let d = 0;
    for (const k of places) if (ca.get(k) !== cb.get(k)) d++;
    for (const f of features) if (has(a, f) !== has(b, f)) d += 4;
    return d;
}
