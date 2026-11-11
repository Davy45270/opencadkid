import { features, handLevels, stages, type Feature, type LevelDef, type Stage } from './levels';
export { features, stages, type Feature, type LevelDef, type Stage } from './levels';
/** « Les œufs de Lumi »: a nest of eggs, chicks, hens and peacocks. The child slides a finger (or touches a big arrow) and
 * everything in the nest slides that way as far as it can; two identical creatures that meet hatch into the next stage of
 * the chain (egg → chick → hen → peacock → little dragon), each creature only once per slide. The scene is won when the
 * creature shown at the top hatches. No numbers, no clock, no lives, nothing ever lost: when the nest is full and nothing
 * can slide, a gentle breeze carries the smallest creatures to Lumi's basket and play goes on. A slide that moves nothing
 * is a funny try (everything goes « boing », two different creatures sulk, a stone gets bumped), and so are a diagonal
 * slide, a shake, a touch on Lumi or on the creature to hatch. Pure and deterministic: Lumi lays her eggs in a fixed order. */
export const slides = ['haut', 'bas', 'gauche', 'droite'] as const;
export type Slide = typeof slides[number];
/** Gestures that are only ever funny tries: a diagonal slide, two quick slides (a shake), a touch on Lumi, on the target. */
export const plays = ['diagonale', 'secoue', 'lumi', 'cible'] as const;
export type Play = typeof plays[number];
export type Action = Slide | Play;
export const actions: readonly Action[] = [...slides, ...plays];
/** Funny tries: each has its own animation, and nothing in the nest changes. */
export const fails = ['mur', 'tete', 'pierre', 'hesite', 'tournis', 'saut', 'coucou'] as const;
export type Fail = typeof fails[number];
const PLAY_FAIL: Readonly<Record<Play, Fail>> = { diagonale: 'hesite', secoue: 'tournis', lumi: 'saut', cible: 'coucou' };
/** Funny tries in a row (on the nest) before the right next slide shines. */
export const TRIES_BEFORE_HELP = 3;
/** Slides in a row that hatch nothing before the right next slide shines. */
export const IDLE_BEFORE_HELP = 8;
/** The biggest stage: the little dragon. */
export const TOP = stages.length - 1;
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const width = (level: LevelDef): number => level.rows[0]!.length;
export const height = (level: LevelDef): number => level.rows.length;
export const DELTA: Readonly<Record<Slide, readonly [number, number]>> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
export const stageOf = (ch: string | undefined): number => ch !== undefined && ch >= '0' && ch <= '9' ? Number(ch) : -1;
export const isTile = (ch: string | undefined): boolean => stageOf(ch) >= 0;
const EMPTY = '.', STONE = '#';

/** A board is one string, row after row: `.` empty, `#` a stone, a digit the stage of a creature. */
export type Board = string;
export const boardOf = (level: LevelDef): Board => level.rows.join('');
/** How many creatures of the target stage are in the nest. */
export const hatched = (level: LevelDef, b: Board): number => { let n = 0; for (const ch of b) if (stageOf(ch) === level.target) n++; return n; };
export const won = (level: LevelDef, b: Board): boolean => hatched(level, b) >= level.count;

const featureCache = new Map<number, Feature[]>();
/** The new things a scene uses. */
export function featuresOf(level: LevelDef): Feature[] {
    const known = featureCache.get(level.id);
    if (known && levels[level.id - 1] === level) return known;
    const has: Record<Feature, boolean> = {
        deux: level.count === 2, poule: level.target === 2, grand: width(level) * height(level) > 9,
        pierre: level.rows.some(r => r.includes(STONE)), ponte: level.lay !== undefined, loin: level.target >= 3
    };
    const out = features.filter(f => has[f]);
    if (levels[level.id - 1] === level) featureCache.set(level.id, out);
    return out;
}
/** How much the creatures are worth, counted in eggs: a chick is two eggs, a hen four… */
export const worth = (b: Board): number => { let n = 0; for (const ch of b) if (isTile(ch)) n += 2 ** stageOf(ch); return n; };

/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], w = width(level), h = height(level), b = boardOf(level);
    if (w < 3 || w > 4) out.push('three or four columns');
    if (h < 3 || h > 4) out.push('three or four rows');
    if (level.rows.some(r => r.length !== w)) out.push('rows of the same length');
    for (const ch of b) if (!/^[.#0-3]$/.test(ch)) out.push(`unknown cell ${ch}`);
    if (level.target < 1 || level.target > TOP) out.push('a target from the chick to the dragon');
    if (b.split('').some(ch => stageOf(ch) >= level.target)) out.push('nothing as big as the target at the start');
    const tiles = b.split('').filter(isTile).length;
    if (tiles < (level.lay === undefined ? 2 : 1)) out.push('enough creatures');
    if (!b.includes(EMPTY)) out.push('room to slide');
    if (level.lay === undefined && worth(b) < level.count * 2 ** level.target) out.push('enough creatures to hatch the target');
    if (level.title.fr.length > 32 || level.title.en.length > 32) out.push('a short title');
    return out;
}

export interface State {
    level: number; board: Board;
    /** Gestures (funny tries included), funny tries, funny tries on the nest in a row, slides in a row that hatched nothing,
     * helps taken. */
    steps: number; tries: number; dry: number; idle: number; helps: number; finished: boolean;
}
export const start = (id: number): State => ({ level: id, board: boardOf(levelOf(id)), steps: 0, tries: 0, dry: 0, idle: 0, helps: 0, finished: false });

/** One creature's way in a slide: from a cell to a cell; `merged` when it hatched into the next stage there. */
export interface Way { from: number; to: number; stage: number; merged: boolean }
/** The cells of each line in a slide, from the front (where everything goes) to the back. */
function lines(w: number, h: number, d: Slide): number[][] {
    const out: number[][] = [];
    if (d === 'gauche' || d === 'droite') for (let y = 0; y < h; y++) { const l: number[] = []; for (let x = 0; x < w; x++) l.push(y * w + x); out.push(d === 'gauche' ? l : l.reverse()); }
    else for (let x = 0; x < w; x++) { const l: number[] = []; for (let y = 0; y < h; y++) l.push(y * w + x); out.push(d === 'haut' ? l : l.reverse()); }
    return out;
}
/** Everything slides to the front of its line, stopped by the edge and by stones; two equal creatures meeting hatch into
 * one of the next stage, which does not hatch again in the same slide; the pair nearest the front hatches first. */
export function slide(level: LevelDef, b: Board, d: Slide): { board: Board; ways: Way[]; hatched: number[] } {
    const cells = b.split(''), ways: Way[] = [], born: number[] = [];
    for (const line of lines(width(level), height(level), d)) {
        let seg: number[] = [];
        const flush = (): void => {
            let slot = 0, last: Way | null = null;
            const tiles = seg.filter(i => isTile(b[i]));
            for (const i of seg) cells[i] = EMPTY;
            for (const i of tiles) {
                const st = stageOf(b[i]);
                if (last && !last.merged && last.stage === st) {
                    last.merged = true; ways.push({ from: i, to: last.to, stage: st, merged: true });
                    cells[last.to] = String(st + 1); born.push(last.to); last = null;
                    continue;
                }
                const to = seg[slot++]!;
                last = { from: i, to, stage: st, merged: false }; ways.push(last); cells[to] = String(st);
            }
            seg = [];
        };
        for (const i of line) { if (b[i] === STONE) flush(); else seg.push(i); }
        flush();
    }
    return { board: cells.join(''), ways, hatched: born };
}
/** Why a slide that moves nothing is a funny try: a stone bumped, two different creatures sulking face to face, or
 * everything against the edge. */
function blocked(level: LevelDef, b: Board, d: Slide): Fail {
    const w = width(level), h = height(level), [dx, dy] = DELTA[d];
    let kind: Fail = 'mur';
    for (let i = 0; i < b.length; i++) {
        if (!isTile(b[i])) continue;
        const x = i % w + dx, y = Math.floor(i / w) + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        if (b[y * w + x] === STONE) return 'pierre';
        kind = 'tete';
    }
    return kind;
}
export const canSlide = (level: LevelDef, b: Board): boolean => slides.some(d => slide(level, b, d).board !== b);
/** Where Lumi lays her egg after a slide: behind everything, on the side the creatures left. She looks along the back line
 * first, starting at the scene's own place (`lay`), then the line in front of it, and so on. */
export function layAt(level: LevelDef, b: Board, d: Slide): number {
    const w = width(level), h = height(level), seed = level.lay ?? 0;
    const across = d === 'gauche' || d === 'droite', n = across ? h : w, depth = across ? w : h;
    for (let k = 0; k < depth; k++) {
        const back = d === 'gauche' ? w - 1 - k : d === 'droite' ? k : d === 'haut' ? h - 1 - k : k;
        for (let j = 0; j < n; j++) {
            const o = (seed + j) % n, i = across ? o * w + back : back * w + o;
            if (b[i] === EMPTY) return i;
        }
    }
    return -1;
}
/** The breeze: when nothing can slide any more, the smallest creatures fly to Lumi's basket. */
export function breeze(b: Board): { board: Board; gone: number[] } {
    let low = Infinity;
    for (const ch of b) if (isTile(ch)) low = Math.min(low, stageOf(ch));
    const gone: number[] = [];
    const board = b.split('').map((ch, i) => { if (stageOf(ch) === low) { gone.push(i); return EMPTY; } return ch; }).join('');
    return { board, gone };
}
export interface Result {
    action: Action; state: State; helped: boolean;
    /** The funny try, or null when the nest changed. */
    fail: Fail | null;
    /** Every creature's way, the cells where a creature hatched, the egg Lumi laid (-1: none), the cells the breeze emptied. */
    ways: Way[]; hatched: number[]; laid: number; gone: number[];
}
/** Only the nest: where it goes after a slide that moves something. */
export function next(level: LevelDef, b: Board, d: Slide): { board: Board; ways: Way[]; hatched: number[]; laid: number; gone: number[]; finished: boolean } | null {
    const r = slide(level, b, d);
    if (r.board === b) return null;
    let board = r.board, laid = -1, gone: number[] = [];
    const finished = won(level, board);
    if (!finished && level.lay !== undefined) { laid = layAt(level, board, d); if (laid >= 0) board = board.slice(0, laid) + '0' + board.slice(laid + 1); }
    if (!finished && !canSlide(level, board)) { const z = breeze(board); board = z.board; gone = z.gone; }
    return { board, ways: r.ways, hatched: r.hatched, laid, gone, finished };
}
/** One gesture of the child. A slide that moves something changes the nest; a funny try changes nothing but the counters. */
export function step(s: State, a: Action): Result | null {
    if (s.finished) return null;
    const level = levelOf(s.level), helped = helpOn(s) && hint(s) === a;
    const miss = (kind: Fail, onNest: boolean): Result => ({ action: a, helped: false, fail: kind, ways: [], hatched: [], laid: -1, gone: [], state: { ...s, steps: s.steps + 1, tries: s.tries + 1, dry: onNest ? s.dry + 1 : s.dry } });
    if ((plays as readonly string[]).includes(a)) { const p = a as Play; return miss(PLAY_FAIL[p], p === 'diagonale' || p === 'secoue'); }
    const d = a as Slide, r = next(level, s.board, d);
    if (!r) return miss(blocked(level, s.board, d), true);
    const state: State = { ...s, board: r.board, steps: s.steps + 1, dry: 0, idle: r.hatched.length ? 0 : s.idle + 1, helps: s.helps + (helped ? 1 : 0), finished: r.finished };
    return { action: a, helped, fail: null, ways: r.ways, hatched: r.hatched, laid: r.laid, gone: r.gone, state };
}

/** Every nest the child can reach from `from` with slides: the game as a graph. */
export function explore(level: LevelDef, from: Board, limit = Infinity): { nodes: Map<Board, Board[]>; goals: Set<Board>; complete: boolean } {
    const nodes = new Map<Board, Board[]>(), goals = new Set<Board>(), queue: Board[] = [from];
    nodes.set(from, []);
    if (won(level, from)) goals.add(from);
    for (let i = 0; i < queue.length; i++) {
        if (nodes.size > limit) return { nodes, goals, complete: false };
        const b = queue[i]!;
        if (goals.has(b)) continue;
        const out = nodes.get(b)!;
        for (const d of slides) {
            const r = next(level, b, d);
            if (!r) continue;
            out.push(r.board);
            if (!nodes.has(r.board)) { nodes.set(r.board, []); queue.push(r.board); if (r.finished) goals.add(r.board); }
        }
    }
    return { nodes, goals, complete: true };
}
/** The shortest way from a nest to the hatching, as slides; null when none is found within `limit` nests. */
export function solve(level: LevelDef, from: Board, limit = 200_000): Slide[] | null {
    if (won(level, from)) return [];
    const seen = new Map<Board, { from: Board | null; d: Slide | null }>([[from, { from: null, d: null }]]), queue: Board[] = [from];
    for (let i = 0; i < queue.length && seen.size <= limit; i++) {
        const b = queue[i]!;
        for (const d of slides) {
            const r = next(level, b, d);
            if (!r || seen.has(r.board)) continue;
            seen.set(r.board, { from: b, d });
            if (r.finished) {
                const way: Slide[] = [];
                for (let at: Board | null = r.board; at !== null && seen.get(at)!.d; at = seen.get(at)!.from) way.unshift(seen.get(at)!.d!);
                return way;
            }
            queue.push(r.board);
        }
    }
    return null;
}
export const helpOn = (s: State): boolean => !s.finished && (s.dry >= TRIES_BEFORE_HELP || s.idle >= IDLE_BEFORE_HELP);
const hintCache = new Map<string, Slide | null>();
/** The right next slide: the first of a shortest way to the hatching. */
export function hint(s: State): Slide | null {
    if (s.finished) return null;
    const k = `${s.level}:${s.board}`;
    if (!hintCache.has(k)) { if (hintCache.size > 5000) hintCache.clear(); hintCache.set(k, solve(levelOf(s.level), s.board)?.[0] ?? null); }
    return hintCache.get(k)!;
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
export const MIN_GAP = 3;
/** How far apart two scenes are: the nests laid over each other from the top left corner, one per cell that differs, two
 * per row or column more or less, three per new thing one has and not the other, two per stage between the targets, one
 * when Lumi lays from another place. */
export function distance(a: LevelDef, b: LevelDef): number {
    const wa = width(a), wb = width(b), ha = height(a), hb = height(b);
    let d = 2 * Math.abs(wa - wb) + 2 * Math.abs(ha - hb) + 2 * Math.abs(a.target - b.target) + 2 * Math.abs(a.count - b.count) + (a.lay !== b.lay ? 1 : 0);
    for (let y = 0; y < Math.min(ha, hb); y++) for (let x = 0; x < Math.min(wa, wb); x++) if (a.rows[y]![x] !== b.rows[y]![x]) d++;
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d;
}
export const stageName = (i: number): Stage => stages[i]!;
