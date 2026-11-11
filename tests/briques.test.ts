import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { aimLine, aims, AIM_MAX, ballAt, ballColor, breakable, breaks, closeColors, colors, complete, distance, drawings, DRY_HELP, features, fire, goodAim, has, helpOn, isUnlocked, LAUNCH, levels, MAX_BOUNCES, MIN_GAP, misses, palette, parse, parseRecords, problems, start, stars, type ColorId, type Miss, type State } from '../src/engines/briques';
import { greedy, randomPlayer } from '../src/engines/briques/solver';
import { missAnimations, PAINT } from '../src/games/briques/art';

/** The greedy player never needs more throws than this on any scene (measured: 6 at most, scene 9). */
const GREEDY_MAX = 9;
/** A robot throwing at an angle drawn uniformly among the allowed whole degrees, over 200 seeds per scene: medians
 * measured at 21 at most (scene 22), longest game 68 throws (scene 32). The 600 cap only stops a game that would never end. */
const RANDOM_MEDIAN_MAX = 25;
const RANDOM_WORST_MAX = 250;
const RANDOM_LIMIT = 600;

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with a title in both languages and its own drawing', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
    }
    for (const key of [(l: typeof levels[number]) => l.title.fr, (l: typeof levels[number]) => l.title.en, (l: typeof levels[number]) => l.moment, (l: typeof levels[number]) => l.drawing]) expect(new Set(levels.map(key)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.drawing))).toEqual(new Set(drawings));
    // Short walls first: at most twelve bricks before scene 8.
    for (const l of levels.filter(x => x.id < 8)) expect(parse(l).length, `scene ${l.id}`).toBeLessThanOrEqual(12);
});

it('every new thing comes alone in two scenes before it is combined, and all of them come back in combinations', () => {
    const met = new Set<string>();
    for (const l of levels) {
        for (const f of l.features) if (!met.has(f)) {
            expect(l.features, `scene ${l.id} brings in ${f}`).toEqual([f]);
            const second = levels.find(o => o.id > l.id && o.features.includes(f))!;
            expect(second.features, `scene ${second.id}`).toEqual([f]);
            met.add(f);
        }
        if (l.features.length > 1) for (const f of l.features) expect(levels.filter(o => o.id < l.id && o.features.length === 1 && o.features[0] === f).length, `scene ${l.id}: ${f}`).toBe(2);
    }
    expect([...met]).toEqual([...features]);
    for (const f of features) expect(levels.filter(l => l.features.length > 1 && l.features.includes(f)).length, f).toBeGreaterThanOrEqual(3);
    expect(levels.slice(0, 7).every(l => l.features.length === 0)).toBe(true);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    // The distance sees through a recolouring, and counts a brick that changes.
    const one = levels[0]!, rows = one.rows;
    expect(distance(one, { ...one, rows: rows.map(r => r.replace(/r/g, 'v').replace(/j/g, 'b')) })).toBe(0);
    expect(distance(one, { ...one, rows: [rows[0]!.replace(/^\.r/, '.m'), ...rows.slice(1)] })).toBe(1);
    expect(distance(one, { ...one, features: ['metal'] })).toBe(4);
});

/** CIE L*a*b* of a hex colour (D65). */
function lab(hex: string): [number, number, number] {
    const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(hex.slice(i, i + 2), 16))) as [number, number, number];
    const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883];
    const f = (t: number) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
    const [fx, fy, fz] = xyz.map(f) as [number, number, number];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const deltaE = (a: ColorId, b: ColorId): number => { const p = lab(PAINT[a].fill), q = lab(PAINT[b].fill); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
it('colours stay apart: each has its own shape, and two close colours never share a scene where the ball has a colour', () => {
    expect(new Set(colors.map(c => PAINT[c].shape)).size).toBe(colors.length);
    const NEAR = 60;
    for (const a of colors) for (const b of colors) if (a < b) {
        const close = closeColors.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
        expect(deltaE(a, b) < NEAR, `${a}/${b}: ΔE ${deltaE(a, b).toFixed(1)}`).toBe(close);
    }
    for (const l of levels.filter(x => has(x, 'couleur'))) for (const a of palette(l)) for (const b of palette(l)) if (a < b) expect(deltaE(a, b), `scene ${l.id}: ${a}/${b}`).toBeGreaterThanOrEqual(NEAR);
});

it('a scene always starts the same way, and the same throw always does the same thing', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    for (const a of [-80, -33, 0, 17, 80]) expect(fire(start(32), a)).toEqual(fire(start(32), a));
    expect(randomPlayer(12, 7).state).toEqual(randomPlayer(12, 7).state);
});

it('a throw is a whole number of degrees within the allowed range; the ball always comes back into Lumi’s arms', () => {
    expect(aims).toHaveLength(2 * AIM_MAX + 1); expect(aims.every(Number.isInteger)).toBe(true);
    expect(fire(start(1), 200).shot!.aim).toBe(AIM_MAX); expect(fire(start(1), -12.4).shot!.aim).toBe(-12);
    for (const l of levels) for (const a of [-80, -40, -7, 0, 23, 61, 80]) {
        const { shot } = fire(start(l.id), a);
        for (const f of shot!.flights) {
            const last = f.keys[f.keys.length - 1]!;
            expect([last.x, last.y, last.t], `scene ${l.id} at ${a}°`).toEqual([LAUNCH.x, LAUNCH.y, f.landed]);
            expect(f.keys.length - 3, `scene ${l.id} at ${a}°`).toBeLessThanOrEqual(MAX_BOUNCES);
            expect(ballAt(f, f.landed + 50)).toEqual({ x: LAUNCH.x, y: LAUNCH.y });
        }
    }
});

it('a greedy player finishes every scene, quickly', () => {
    for (const l of levels) {
        const { state, shots } = greedy(l.id);
        expect(state.finished, `scene ${l.id}`).toBe(true);
        expect(shots, `scene ${l.id}`).toBeLessThanOrEqual(GREEDY_MAX);
    }
});

/** No dead end: some throw always breaks or cracks something. */
const outwards = [...aims].sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
const noDeadEnd = (s: State): boolean => s.finished || outwards.some(a => breaks(s, a));
it(`a robot throwing anywhere finishes every scene, in at most ${RANDOM_MEDIAN_MAX} throws at the median over 200 seeds, never at a dead end`, { timeout: 120_000 }, () => {
    const medians: number[] = [], worst: number[] = [];
    for (const l of levels) {
        let dead = 0;
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, RANDOM_LIMIT, s => { if (!noDeadEnd(s)) dead++; }));
        expect(dead, `scene ${l.id}`).toBe(0);
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.shots, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const shots = runs.map(r => r.shots).sort((a, b) => a - b), median = (shots[99]! + shots[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
        medians.push(median); worst.push(shots[199]!);
    }
    expect(Math.max(...medians)).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    expect(Math.max(...worst)).toBeLessThanOrEqual(RANDOM_WORST_MAX);
});

/** Every throw from the start of each scene and after a few greedy throws: where the funny tries are found. */
function throws(): { before: State; after: State; miss: Miss | null; level: number }[] {
    const out: { before: State; after: State; miss: Miss | null; level: number }[] = [];
    for (const l of levels) for (let k = 0; k < 3; k++) {
        const s = greedy(l.id, k).state;
        if (s.finished) break;
        for (const a of aims) { const { state, shot } = fire(s, a); out.push({ before: s, after: state, miss: shot!.miss, level: l.id }); }
    }
    return out;
}
it('every funny try exists, has its own animation, and breaks nothing', () => {
    const seen = new Map<Miss, Set<number>>();
    for (const { before, after, miss, level } of throws()) {
        if (!miss) continue;
        if (!seen.has(miss)) seen.set(miss, new Set());
        seen.get(miss)!.add(level);
        expect([after.broken, after.finished, after.dry, after.helps], `scene ${level} ${miss}`).toEqual([before.broken, false, before.dry + 1, before.helps]);
        expect(after.bricks.filter(breakable).map(b => [b.id, b.hits]), `scene ${level} ${miss}`).toEqual(before.bricks.filter(breakable).map(b => [b.id, b.hits]));
    }
    expect([...seen.keys()].sort()).toEqual([...misses].sort());
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(missAnimations)).size).toBe(misses.length);
    for (const m of misses) {
        expect(css, m).toContain(`@keyframes ${missAnimations[m]}{`);
        expect(css, m).toContain(`.${missAnimations[m]}{animation:${missAnimations[m]} `);
    }
});

it('a plain brick breaks at once; a hard one cracks, then breaks', () => {
    const one = start(1), up = fire(one, 0);
    expect(up.shot!.broken.length).toBeGreaterThan(0); expect(up.state.bricks.length).toBe(one.bricks.length - up.shot!.broken.length);
    const hard: State = { ...start(8), bricks: [{ id: 0, row: 0, col: 2, kind: 'dur', color: 'bleu', hits: 2, dir: 0 }, { id: 1, row: 0, col: 3, kind: 'dur', color: 'bleu', hits: 2, dir: 0 }] };
    const first = fire(hard, -3);
    expect(first.shot!.cracked.length).toBeGreaterThan(0); expect(first.state.bricks.some(b => b.hits === 1)).toBe(true);
    const second = fire(first.state, -3);
    expect(second.shot!.broken.some(b => first.shot!.cracked.some(c => c.id === b.id))).toBe(true);
});

it('iron never breaks and the ball bounces off it; jelly swallows the ball, which goes back to Lumi', () => {
    const iron: State = { ...start(10), bricks: [{ id: 0, row: 3, col: 2, kind: 'metal', color: null, hits: 1, dir: 0 }, { id: 1, row: 3, col: 3, kind: 'metal', color: null, hits: 1, dir: 0 }, { id: 2, row: 0, col: 0, kind: 'brique', color: 'bleu', hits: 1, dir: 0 }] };
    const hit = fire(iron, 0);
    expect(hit.shot!.metal.length).toBeGreaterThan(0); expect(hit.state.bricks.filter(b => b.kind === 'metal')).toHaveLength(2);
    const jelly: State = { ...iron, bricks: iron.bricks.map(b => b.kind === 'metal' ? { ...b, kind: 'gelee' } : b) };
    const sunk = fire(jelly, 0), f = sunk.shot!.flights[0]!;
    expect(sunk.shot!.miss).toBe('tremble'); expect(f.keys).toHaveLength(3); expect(f.keys[1]!.y).toBeGreaterThan(70);
});

it('a sweet brick gives two balls on the next throw, then one again', () => {
    const sweet = anyThrow(13, r => r.shot!.sweet);
    expect(sweet.state.balls).toBe(2); expect(handBalls(sweet.state)).toBe(2);
    const next = fire(sweet.state, 0);
    expect(next.shot!.flights).toHaveLength(2); expect(next.shot!.flights[1]!.start).toBeGreaterThan(0);
    expect(next.state.balls).toBe(next.shot!.sweet ? 2 : 1);
});
const handBalls = (s: State): number => s.balls;
/** The first throw, from the start of a scene or after a few greedy throws, that does what `want` asks. */
function anyThrow(id: number, want: (r: ReturnType<typeof fire>) => boolean): ReturnType<typeof fire> {
    for (let k = 0; k < 6; k++) { const s = greedy(id, k).state; if (s.finished) break; const r = aims.map(a => fire(s, a)).find(want); if (r) return r; }
    throw new Error(`scene ${id}: no such throw`);
}

it('a confetti bomb breaks its neighbours, iron and jelly excepted, and bombs set each other off', () => {
    const boom = anyThrow(16, r => r.shot!.events.some(e => e.kind === 'boom')), bomb = boom.shot!.broken.find(b => b.kind === 'bombe')!;
    expect(boom.state.bricks.filter(b => Math.abs(b.row - bomb.row) <= 1 && Math.abs(b.col - bomb.col) <= 1)).toEqual([]);
    anyThrow(17, r => r.shot!.events.filter(e => e.kind === 'boom').length === 2);
    const iron = start(18), boxed = anyThrow(18, r => r.shot!.events.some(e => e.kind === 'boom'));
    expect(boxed.state.bricks.filter(b => b.kind === 'metal')).toHaveLength(iron.bricks.filter(b => b.kind === 'metal').length);
});

it('a brick on wheels moves one place along its row after each throw, never while aiming, and turns round at an edge', () => {
    const s = start(19), wheel = s.bricks.find(b => b.kind === 'mobile')!;
    // Aiming changes nothing: the aim line is computed without moving the state.
    aimLine(s, 30); expect(s.bricks.find(b => b.id === wheel.id)).toEqual(wheel);
    const miss = aims.map(a => fire(s, a)).find(r => r.state.bricks.some(b => b.id === wheel.id))!;
    const moved = miss.state.bricks.find(b => b.id === wheel.id)!;
    expect(Math.abs(moved.col - wheel.col)).toBe(1); expect(moved.row).toBe(wheel.row);
    let t: State = { ...s, bricks: [{ ...wheel, col: 5, dir: 1 }, { id: 99, row: 0, col: 0, kind: 'brique', color: 'rouge', hits: 1, dir: 0 }] };
    t = fire(t, 80).state;
    const after = t.bricks.find(b => b.id === wheel.id);
    if (after) { expect(after.col).toBe(4); expect(after.dir).toBe(-1); }
});

it('the coloured ball goes through the bricks of its colour, and its colour changes from throw to throw', () => {
    const s = start(25);
    expect(ballColor(s)).not.toBeNull(); expect(ballColor(start(1))).toBeNull();
    const c = ballColor(s)!, through = fire(s, 0);
    expect(through.shot!.broken.filter(b => b.color === c).length).toBeGreaterThanOrEqual(2);
    expect(ballColor(through.state)).not.toBe(through.state.finished ? undefined : null);
    const used = new Set<ColorId | null>(); let t = s;
    for (let k = 0; k < 4 && !t.finished; k++) { used.add(ballColor(t)); t = fire(t, 40).state; }
    expect(used.size).toBeGreaterThan(1);
});

it('the aim line shows the first bounce, then a little beyond', () => {
    const line = aimLine(start(3), -60);
    expect(line).toHaveLength(3); expect(line[0]).toEqual({ x: LAUNCH.x, y: LAUNCH.y });
    expect(line[1]!.x).toBeLessThan(10);
});

it('after three throws that break nothing, a good direction shows; using it costs a star', () => {
    let s: State = start(10);
    const dull = aims.find(a => fire(s, a).shot!.miss)!;
    while (s.dry < DRY_HELP) s = fire(s, dull).state;
    expect(helpOn(s)).toBe(true);
    const g = goodAim(s)!;
    expect(fire(s, g).shot!.broken.length).toBeGreaterThan(0);
    expect(fire(s, dull).state.helps).toBe(0);
    const helped = fire(s, g);
    expect(helped.shot!.helped).toBe(true); expect(helped.state.helps).toBe(1); expect(helped.state.dry).toBe(0);
    expect(stars(helped.state)).toBe(2); expect(stars({ ...helped.state, helps: 0 })).toBe(3); expect(stars({ ...helped.state, helps: 3 })).toBe(1);
});

it('the scene ends when every brick that can break is broken; iron and jelly stay until then', () => {
    for (const id of [10, 22]) { const won = greedy(id).state; expect(won.finished).toBe(true); expect(won.bricks.every(b => !breakable(b))).toBe(true); expect(won.bricks.length).toBeGreaterThan(0); }
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedy(3).state;
    expect(complete({ 3: 1 }, won)[3]).toBe(stars(won)); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
