import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { aims, apply, colors, closeColors, complete, distance, DRY_HELP, features, fire, goodPlace, has, helpOn, holdable, isUnlocked, launchOf, levels, MIDDLE, MIN_GAP, misses, palette, parseRecords, problems, rainbowAt, reach, roomOf, score, start, stars, swap, throwAt, trace, type Bead, type ColorId, type Miss, type State } from '../src/engines/collier';
import { greedy, randomPlayer } from '../src/engines/collier/solver';
import { missAnimations, PAINT } from '../src/games/collier/art';

const text = (s: State): string[] => s.necks.map(n => n.map(b => b.asleep ? b.color[0]!.toUpperCase() : b.color[0]!).join(''));
/** The greedy player never needs more throws than this on any scene (measured: 9 at most, scene 29). */
const GREEDY_MAX = 12;
/** A robot throwing at random among the places Boubou can reach, over 200 seeds per scene: medians measured at
 * 24 at most (scene 29), longest game 207 throws (scene 21). The bounds are those of « Les bulles de Boubou »; the 600 cap only stops a
 * game that would never end. */
const RANDOM_MEDIAN_MAX = 25;
const RANDOM_WORST_MAX = 250;
const RANDOM_LIMIT = 600;

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with a title in both languages', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
    }
    expect(new Set(levels.map(l => l.title.fr)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.title.en)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
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
    // The first scenes bring in the gesture, the curve and the chain on their own.
    expect(levels.slice(0, 6).every(l => l.features.length === 0)).toBe(true);
    expect(levels[0]!.necklaces[0]!.path).toBe('droite');
    // Two colours to start with, never more than three before scene 10, never more than four.
    expect(palette(levels[0]!)).toHaveLength(2);
    for (const l of levels) expect(palette(l).length, `scene ${l.id}`).toBeLessThanOrEqual(l.id < 10 ? 3 : 4);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    // The distance sees through a recolouring, and counts a bead that changes.
    const one = levels[0]!;
    expect(distance(one, { ...one, necklaces: [{ path: 'droite', beads: 'jjvv' }] })).toBe(0);
    expect(distance(one, { ...one, necklaces: [{ path: 'droite', beads: 'rbbb' }] })).toBe(1);
    expect(distance(one, { ...one, necklaces: [{ path: 'pente', beads: 'rrbb' }] })).toBe(4);
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
it('colours stay apart: each has its own shape, and two close colours never share a scene', () => {
    expect(new Set(colors.map(c => PAINT[c].shape)).size).toBe(colors.length);
    const NEAR = 60;
    for (const a of colors) for (const b of colors) if (a < b) {
        const close = closeColors.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
        expect(deltaE(a, b) < NEAR, `${a}/${b}: ΔE ${deltaE(a, b).toFixed(1)}`).toBe(close);
    }
    for (const l of levels) for (const a of palette(l)) for (const b of palette(l)) if (a < b) expect(deltaE(a, b), `scene ${l.id}: ${a}/${b}`).toBeGreaterThanOrEqual(NEAR);
});

it('a scene always starts the same way', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    expect(randomPlayer(12, 7).state).toEqual(randomPlayer(12, 7).state);
});

it('a greedy player finishes every scene, quickly', () => {
    for (const l of levels) {
        const { state, shots } = greedy(l.id);
        expect(state.finished, `scene ${l.id}`).toBe(true);
        expect(shots, `scene ${l.id}`).toBeLessThanOrEqual(GREEDY_MAX);
    }
});

/** No dead end: Boubou holds two beads he can use, and from here a throw makes a line or leads to one. */
function noDeadEnd(s: State): string | null {
    if (s.finished) return null;
    if (!reach(s).length) return 'nothing to reach';
    if (!holdable(s, s.queue[0]) || !holdable(s, s.queue[1])) return `beads not next to a reachable place: ${s.queue.join(',')}`;
    const good = goodPlace(s);
    if (!good || score(s.necks, good.place, s.queue[0]) <= 0) return 'no throw that makes a line or a pair';
    for (const [k, n] of s.necks.entries()) if (n.length > roomOf(levels[s.level - 1]!, k)) return 'a necklace past its room';
    return null;
}
it(`a robot throwing anywhere finishes every scene, in at most ${RANDOM_MEDIAN_MAX} throws at the median over 200 seeds, never at a dead end`, { timeout: 300_000 }, () => {
    const medians: number[] = [], worst: number[] = [];
    for (const l of levels) {
        let dead: string | null = null;
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, RANDOM_LIMIT, s => { dead ??= noDeadEnd(s); }));
        expect(dead, `scene ${l.id}`).toBeNull();
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.shots, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const shots = runs.map(r => r.shots).sort((a, b) => a - b), median = (shots[99]! + shots[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
        medians.push(median); worst.push(shots[199]!);
    }
    expect(Math.max(...medians)).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    expect(Math.max(...worst)).toBeLessThanOrEqual(RANDOM_WORST_MAX);
});

it('no dead end by construction: the next bead is always a colour next to a place Boubou can reach', () => {
    for (const l of levels) {
        let s = start(l.id);
        expect(noDeadEnd(s), `scene ${l.id}`).toBeNull();
        // Every throw from the start, then from the state after it: the rule holds after each one.
        for (const r of reach(s)) { const after = throwAt(s, r.place, r.bounces).state; expect(noDeadEnd(after), `scene ${l.id}`).toBeNull(); expect(noDeadEnd(swap(after)), `scene ${l.id}`).toBeNull(); }
        s = swap(s); expect(noDeadEnd(s), `scene ${l.id}`).toBeNull();
    }
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
it('every funny try exists, has its own animation, and only puts the bead in', () => {
    const seen = new Map<Miss, Set<number>>();
    for (const { before, after, miss, level } of throws()) {
        if (!miss) continue;
        if (!seen.has(miss)) seen.set(miss, new Set());
        seen.get(miss)!.add(level);
        expect([after.flown - before.flown <= 1, after.finished, after.dry, after.helps]).toEqual([true, false, before.dry + 1, before.helps]);
        const was = before.necks.flat().map(b => b.id), now = after.necks.flat().map(b => b.id);
        if (miss === 'boing') { expect(after.necks).toEqual(before.necks); expect(after.queue).toEqual(before.queue); }
        else expect(now.filter(id => !was.includes(id)), `scene ${level} ${miss}`).toEqual([before.nextId]);
    }
    expect([...seen.keys()].sort()).toEqual([...misses].sort());
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(missAnimations)).size).toBe(misses.length);
    for (const m of misses) {
        expect(css, m).toContain(`@keyframes ${missAnimations[m]}{`);
        expect(css, m).toContain(`.${missAnimations[m]}{animation:${missAnimations[m]} `);
    }
});

it('a throw into the void goes boing on the edge and the bead comes back to Boubou: nothing changes', () => {
    const s = start(1), { state, shot } = fire(s, Math.PI);
    expect(shot!.miss).toBe('boing'); expect(shot!.place).toBeNull();
    expect(state.necks).toBe(s.necks); expect(state.queue).toEqual(s.queue); expect(state.shots).toBe(1); expect(state.dry).toBe(1);
});

it('three of a colour fly away; the ends meet and fly away again: a chain', () => {
    const one = start(1), r = reach(one).find(x => x.place.index === 2)!;
    const first = throwAt({ ...one, queue: ['rouge', 'rouge'] }, r.place);
    expect(text(first.state)).toEqual(['bb']); expect(first.shot!.pops[0]!.beads.map(b => b.color)).toEqual(['rouge', 'rouge', 'rouge']);
    // Scene 5: one yellow bead between the yellow pair, and everything flies away, link after link.
    const five = start(5);
    expect(text(five)).toEqual(['rrbbjjbbrr']); expect(five.queue[0]).toBe('jaune');
    const all = throwAt(five, { neck: 0, index: 5 });
    expect(all.shot!.pops.map(p => [p.chain, p.beads.length])).toEqual([[0, 3], [1, 4], [2, 4]]);
    expect(all.state.finished).toBe(true); expect(all.state.flown).toBe(11);
});

it('the rainbow goes with any colour, first in the scene that brings it in, every fourth bead elsewhere', () => {
    const seven = levels[6]!, eleven = levels[10]!;
    expect(start(7).queue[0]).toBe('arc');
    expect([0, 1, 2, 3, 4].map(i => rainbowAt(seven, i))).toEqual([true, false, false, false, true]);
    expect([0, 1, 2, 3, 7].map(i => rainbowAt(eleven, i))).toEqual([false, false, false, true, true]);
    const necks: Bead[][] = [[{ id: 0, color: 'rouge', asleep: false }, { id: 1, color: 'rouge', asleep: false }, { id: 2, color: 'bleu', asleep: false }]];
    expect(apply(necks, { neck: 0, index: 2 }, 'arc', 9).pops[0]!.beads.map(b => b.color)).toEqual(['rouge', 'rouge', 'rouge']);
    expect(apply(necks, { neck: 0, index: 3 }, 'arc', 9).bead.color).toBe('bleu');
});

it('a sleeping bead does not count until a line flies away next to it; then it wakes and may fly in turn', () => {
    const s = start(9);
    expect(text(s)).toEqual(['rrBbbjj']);
    // A blue between the reds and the sleeping blue: the sleeper does not count, nothing flies, it snores.
    const sleepy = throwAt({ ...s, queue: ['bleu', 'bleu'] }, { neck: 0, index: 2 });
    expect(sleepy.shot!.pops).toEqual([]); expect(sleepy.shot!.miss).toBe('dodo'); expect(text(sleepy.state)).toEqual(['rrbBbbj']); expect(sleepy.shot!.dropped?.color).toBe('jaune');
    // Red at the start: the reds fly away, the sleeper wakes next to its blue pair, and the three blues fly away.
    const woke = throwAt({ ...s, queue: ['rouge', 'rouge'] }, { neck: 0, index: 0 });
    expect(woke.shot!.woke.map(b => b.color)).toEqual(['bleu']);
    expect(woke.shot!.pops.map(p => p.beads.length)).toEqual([3, 3]); expect(text(woke.state)).toEqual(['jj']);
});

it('a rock makes the bead bounce once, and the aim line shows it', () => {
    for (const l of levels.filter(x => has(x, 'rocher'))) {
        const s = start(l.id), bounced = aims.map(a => trace(s, a)).filter(t => t.bounces === 1);
        expect(bounced.length, `scene ${l.id}`).toBeGreaterThan(0);
        expect(bounced.some(t => t.place), `scene ${l.id}`).toBe(true);
        for (const a of aims) expect(trace(s, a).bounces, `scene ${l.id}`).toBeLessThanOrEqual(1);
    }
    for (const l of levels.filter(x => !has(x, 'rocher'))) expect(aims.every(a => trace(start(l.id), a).bounces === 0), `scene ${l.id}`).toBe(true);
});

it('two necklaces both have to be emptied; the ring goes all around Boubou', () => {
    for (const l of levels) expect(start(l.id).necks).toHaveLength(has(l, 'deux') ? 2 : 1);
    // The left necklace empty, the right one still there: a throw on the right does not end the scene.
    const two = start(15), half: State = { ...two, necks: [[], two.necks[1]!] }, r = reach(half)[0]!;
    expect(r.place.neck).toBe(1); expect(throwAt(half, r.place).state.finished).toBe(false);
    const ring = levels.find(l => has(l, 'tour'))!;
    expect(launchOf(ring)).toEqual(MIDDLE);
    // From the middle, Boubou reaches the necklace above him, below him and on both sides.
    const angles = reach(start(ring.id)).map(r => r.aim);
    expect(Math.min(...angles)).toBeLessThan(-Math.PI / 2); expect(Math.max(...angles)).toBeGreaterThan(Math.PI / 2);
});

it('a necklace never grows past its room: the bead at the far end slides off and flies away', () => {
    const s = start(1), room = roomOf(levels[0]!, 0);
    let t: State = { ...s, queue: ['bleu', 'bleu'] };
    // Blue beads at the very start, before the reds: never three blues together there.
    const r0 = throwAt({ ...t, queue: ['bleu', 'rouge'] }, { neck: 0, index: 0 });
    t = r0.state;
    expect(t.necks[0]!.length).toBeLessThanOrEqual(room);
    if (s.necks[0]!.length === room) { expect(r0.shot!.dropped?.color).toBe('bleu'); expect(text(t)).toEqual(['brrb']); }
});

it('the swap is free and gives Boubou his other bead', () => {
    const s = start(3), t = swap(s);
    expect(t.queue).toEqual([s.queue[1], s.queue[0]]); expect([t.shots, t.helps, t.dry]).toEqual([0, 0, 0]);
});

it('after three throws without a line, a good place shows; using it costs a star', () => {
    let s: State = start(2);
    while (s.dry < DRY_HELP) { const miss = reach(s).map(r => throwAt(s, r.place, r.bounces)).find(x => x.shot!.miss)!; s = miss.state; }
    expect(helpOn(s)).toBe(true);
    const g = goodPlace(s)!;
    const other = reach(s).find(r => r.place.index !== g.place.index || r.place.neck !== g.place.neck)!;
    expect(throwAt(s, other.place).state.helps).toBe(0);
    const helped = throwAt(s, g.place, g.bounces);
    expect(helped.shot!.helped).toBe(true); expect(helped.state.helps).toBe(1);
    expect(stars(helped.state)).toBe(2); expect(stars({ ...helped.state, helps: 0 })).toBe(3); expect(stars({ ...helped.state, helps: 3 })).toBe(1);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedy(3).state;
    expect(complete({ 3: 1 }, won)[3]).toBe(stars(won)); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
