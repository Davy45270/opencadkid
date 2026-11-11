import { features, handLevels, type Feature, type LevelDef } from './levels';
export { features, type Feature, type LevelDef } from './levels';
/** « Le voyage de Boubou »: Boubou pilots a little round rocket that goes up gently through space; the sky scrolls slowly
 * down. The child touches one of the five lanes and the rocket glides there. It picks up stars and lost friends (little
 * rockets, space kittens, robots) who line up behind it, and when everything is picked up, a home planet comes down where
 * everybody gets off and has a party. No shooting, no enemy, no clock, no lives, nothing to lose: what is missed comes back,
 * the piece of sky loops until every goal of the scene is picked up.
 *
 * Time goes in ticks. The sky moves one row every `ROW` ticks; the rocket glides one lane every `GLIDE` ticks towards the
 * lane last touched. A row is met when it reaches the rocket. A gesture is (lane, instant): `touch` lets the sky run up to the
 * instant, then sets the lane. Pure and deterministic. */
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
/** Five lanes, always: each stays at least 44 px wide on a 320 px phone. */
export const LANES = 5;
/** Ticks for the sky to move one row down, and for the rocket to glide one lane over. */
export const ROW = 4;
export const GLIDE = 2;
/** Rows between the rocket and the first row of the scene at the start, and empty rows between two turns of the sky. */
export const LEAD = 3;
export const GAP = 3;
/** Rows the kind black hole keeps the rocket for, spinning it round before it comes out further on. */
export const HOLE_ROWS = 2;
/** Passes missed in front of a goal before its lane shines; from then on, each pass missed brings it one lane nearer. */
export const TRIES_BEFORE_HELP = 3;
/** The rocket's little magnet: it pulls in a star from the next lane too (friends and the gate need the rocket in their own
 * lane). */
export const MAGNET = 1;
/** The goals: stars, three kinds of lost friends, the rainbow gate (it opens only with a friend behind the rocket). */
export const GOALS = '*FCRP';
export const FRIENDS = 'FCR';
/** Tries that change nothing but the counters: a soft rock (`rocher`, boing, the rocket spins), a cloud of dust (`poussiere`,
 * it sneezes, its window gets dusty), a soap bubble (`bulle`, it floats a moment), a comet brushing past (`comete`, Boubou's
 * hair stands up), the edge of the sky (`bord`, a shooting star says peekaboo), a friend already picked up met again
 * (`calin`, a hug), the rainbow gate without a friend behind (`porte`, it tickles and stays shut). */
export const fails = ['rocher', 'poussiere', 'bulle', 'comete', 'bord', 'calin', 'porte'] as const;
export type Fail = typeof fails[number];
const OBSTACLE: Readonly<Record<string, Fail>> = { o: 'rocher', d: 'poussiere', b: 'bulle', m: 'comete' };

export interface Goal { id: number; j: number; lane: number; kind: string; got: boolean; misses: number; at: number | null }
export interface State {
    level: number;
    /** The tick of the sky; the rocket's place in half lanes (0 to 8) and the lane it glides to. */
    t: number; pos: number; target: number;
    goals: Goal[];
    /** The friends in a line behind the rocket, in the order they joined. */
    train: string[];
    /** Rows left inside the kind black hole. */
    hidden: number;
    touches: number; tries: number; helps: number; finished: boolean;
}
export type Event =
    | { kind: 'got'; k: number; lane: number; goal: number; helped: boolean }
    | { kind: 'miss'; k: number; goal: number; from: number; to: number }
    | { kind: 'fail'; k: number; lane: number; fail: Fail }
    | { kind: 'tapis'; k: number; from: number; to: number }
    | { kind: 'trou'; k: number; lane: number };
export interface Gesture { lane: number; at: number }
export interface Result { gesture: Gesture; state: State; events: Event[]; fail: Fail | null }

/** The rows of a scene, the first to reach the rocket first (levels.ts draws them top first, as the sky shows them). */
export const rowsOf = (l: LevelDef): string[] => [...l.sky].reverse();
/** One turn of the sky: the scene's rows, then a few empty ones. */
export const lapOf = (l: LevelDef): number => l.sky.length + GAP;
/** The tick at which absolute row `k` reaches the rocket, and the row that reaches it at tick `t` (null between rows). */
export const arrival = (k: number): number => (k + LEAD) * ROW;
export const rowAt = (t: number): number | null => t % ROW === 0 && t / ROW - LEAD >= 0 ? t / ROW - LEAD : null;
/** The lane the rocket is in when a row reaches it: halfway, the lane it goes to. */
export const laneOf = (s: Pick<State, 'pos' | 'target'>): number => s.pos % 2 === 0 ? s.pos / 2 : (s.pos + (2 * s.target > s.pos ? 1 : -1)) / 2;
const goalsOf = (l: LevelDef): Goal[] => {
    const out: Goal[] = [];
    rowsOf(l).forEach((row, j) => row.split('').forEach((c, lane) => { if (GOALS.includes(c)) out.push({ id: out.length, j, lane, kind: c, got: false, misses: 0, at: null }); }));
    return out;
};
export function start(id: number): State {
    const l = levelOf(id);
    return { level: id, t: 0, pos: 4, target: 2, goals: goalsOf(l), train: [], hidden: 0, touches: 0, tries: 0, helps: 0, finished: false };
}
export const done = (s: Pick<State, 'goals'>): boolean => s.goals.every(g => g.got);
/** The thing that stands in a cell of the sky, goals aside. */
const thing = (l: LevelDef, j: number, lane: number): string => rowsOf(l)[j]?.[lane] ?? '.';
/** One tick of the sky: the rocket glides, and the row that reaches it is met. */
export function tick(s: State): { state: State; events: Event[] } {
    if (s.finished) return { state: s, events: [] };
    const l = levelOf(s.level), t = s.t + 1, pos = s.pos + Math.sign(2 * s.target - s.pos);
    let st: State = { ...s, t, pos, goals: s.goals.map(g => ({ ...g })), train: [...s.train] };
    const k = rowAt(t), events: Event[] = [];
    if (k === null) return { state: st, events };
    const lap = lapOf(l), j = k % lap;
    if (j >= l.sky.length) return { state: st, events };
    const L = laneOf(st), hidden = st.hidden > 0;
    let fail: Fail | null = null;
    const miss = (g: Goal): void => {
        g.misses++;
        const from = g.lane;
        // From the help on, a goal missed comes back one lane nearer to where the rocket was.
        if (g.misses >= TRIES_BEFORE_HELP && g.lane !== L) g.lane += Math.sign(L - g.lane);
        events.push({ kind: 'miss', k, goal: g.id, from, to: g.lane });
    };
    let goalHere = false;
    for (const g of st.goals) {
        if (g.got || g.j !== j) continue;
        if (hidden || Math.abs(g.lane - L) > (g.kind === '*' ? MAGNET : 0)) { miss(g); continue; }
        if (g.lane === L) goalHere = true;
        if (g.kind === 'P' && st.train.length === 0) { fail = 'porte'; miss(g); continue; }
        const helped = g.misses >= TRIES_BEFORE_HELP;
        g.got = true; g.at = k;
        if (FRIENDS.includes(g.kind)) st.train.push(g.kind);
        if (helped) st.helps++;
        events.push({ kind: 'got', k, lane: L, goal: g.id, helped });
    }
    if (hidden) st.hidden--;
    else if (!goalHere) {
        const c = thing(l, j, L);
        if (OBSTACLE[c]) fail = OBSTACLE[c]!;
        else if (c === '<' || c === '>') {
            const to = Math.max(0, Math.min(LANES - 1, L + (c === '>' ? 1 : -1)));
            events.push({ kind: 'tapis', k, from: L, to });
            st = { ...st, pos: 2 * to, target: to };
        } else if (c === '@') { st.hidden = HOLE_ROWS; events.push({ kind: 'trou', k, lane: L }); }
        // A friend already behind the rocket comes forward for a hug where Boubou found it, on a later turn of the sky.
        else if (st.goals.some(g => g.got && FRIENDS.includes(g.kind) && g.j === j && g.lane === L && g.at !== null && g.at < k)) fail = 'calin';
    }
    if (fail) { st.tries++; events.push({ kind: 'fail', k, lane: L, fail }); }
    st.finished = done(st);
    return { state: st, events };
}
/** The sky running by itself up to tick `to` (or until the scene is finished). */
export function advance(s: State, to: number): { state: State; events: Event[] } {
    let st = s; const events: Event[] = [];
    while (st.t < to && !st.finished) { const r = tick(st); st = r.state; events.push(...r.events); }
    return { state: st, events };
}
/** One gesture of the child: the sky runs to instant `at` (never before the sky's tick), then the rocket heads for `lane`.
 * A touch beyond the edge lanes (-1 or `LANES`) is a funny try: the rocket goes to the edge and bounces off it. */
export function touch(s: State, g: Gesture): Result | null {
    if (s.finished || !Number.isInteger(g.lane) || g.lane < -1 || g.lane > LANES || !Number.isInteger(g.at) || g.at < s.t) return null;
    const ran = advance(s, g.at);
    if (ran.state.finished) return { gesture: { ...g }, state: ran.state, events: ran.events, fail: null };
    const edge = g.lane < 0 || g.lane >= LANES, lane = Math.max(0, Math.min(LANES - 1, g.lane));
    const events = [...ran.events];
    if (edge) events.push({ kind: 'fail', k: -1, lane, fail: 'bord' });
    return { gesture: { ...g }, events, fail: edge ? 'bord' : null, state: { ...ran.state, target: lane, touches: ran.state.touches + 1, tries: ran.state.tries + (edge ? 1 : 0) } };
}
/** The lanes that shine: those of the goals missed `TRIES_BEFORE_HELP` times and more. Picking such a goal up costs a star. */
export const helpLanes = (s: State): { goal: number; lane: number }[] => s.finished ? [] : s.goals.filter(g => !g.got && g.misses >= TRIES_BEFORE_HELP).map(g => ({ goal: g.id, lane: g.lane }));
/** The next goal that can be picked up, in the order the sky brings them: the gate only with a friend behind. */
export function nextGoal(s: State): { goal: Goal; k: number } | null {
    if (s.finished) return null;
    const l = levelOf(s.level), lap = lapOf(l);
    const k0 = Math.max(0, (rowAt(s.t - (s.t % ROW)) ?? -1) + 1);
    let best: { goal: Goal; k: number } | null = null;
    for (const g of s.goals) {
        if (g.got || (g.kind === 'P' && s.train.length === 0)) continue;
        let k = Math.floor(k0 / lap) * lap + g.j; if (k < k0) k += lap;
        if (!best || k < best.k) best = { goal: g, k };
    }
    return best;
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

export const goalCount = (l: LevelDef): number => l.sky.join('').split('').filter(c => GOALS.includes(c)).length;
/** The new things a scene uses. */
export function featuresOf(l: LevelDef): Feature[] {
    const all = l.sky.join('');
    const has: Record<Feature, boolean> = {
        ami: /[FCR]/.test(all), rocher: all.includes('o'), poussiere: all.includes('d'), bulle: all.includes('b'), comete: all.includes('m'),
        tapis: /[<>]/.test(all), porte: all.includes('P'), trou: all.includes('@')
    };
    return features.filter(f => has[f]);
}
/** Goals at most, and one thing at most per row, before scene 8. */
export const EARLY = 8;
export const EARLY_GOALS = 6;
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(l: LevelDef): string[] {
    const out: string[] = [], all = l.sky.join('');
    if (l.sky.length < 5 || l.sky.length > 14) out.push('five to fourteen rows');
    if (l.sky.some(r => r.length !== LANES)) out.push('five lanes');
    if (!/^[.*FCRPodbm<>@]+$/.test(all)) out.push('known things');
    if (goalCount(l) < 2) out.push('two goals at least');
    if (goalCount(l) > 10) out.push('ten goals at most');
    if (l.id < EARLY) {
        if (goalCount(l) > EARLY_GOALS) out.push(`at most ${EARLY_GOALS} goals before scene ${EARLY}`);
        if (l.sky.some(r => r.replace(/\./g, '').length > 1)) out.push(`one thing per row at most before scene ${EARLY}`);
    }
    if (all.includes('P') && !/[FCR]/.test(all)) out.push('a friend for the gate');
    if (l.sky.some(r => r[0] === '<' || r[LANES - 1] === '>')) out.push('a carpet never pushes against the edge');
    // The rows right after a black hole stay clear of goals: the rocket would pass under them unseen.
    rowsOf(l).forEach((row, j) => { if (row.includes('@') && rowsOf(l).slice(j + 1, j + 1 + HOLE_ROWS).some(r => /[*FCRP]/.test(r))) out.push(`row ${j}: goals hidden behind a black hole`); });
    if (l.title.fr.length > 24 || l.title.en.length > 24) out.push('a short title');
    return out;
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 6;
/** How far apart two scenes are: their skies laid over each other from the first row that reaches the rocket, one per cell
 * that differs, three per new thing one has and not the other. */
export function distance(a: LevelDef, b: LevelDef): number {
    const ra = rowsOf(a), rb = rowsOf(b);
    let d = 0;
    for (let j = 0; j < Math.max(ra.length, rb.length); j++) for (let x = 0; x < LANES; x++) if ((ra[j]?.[x] ?? '.') !== (rb[j]?.[x] ?? '.')) d++;
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d;
}
