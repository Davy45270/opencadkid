import { expect, it } from 'vitest';
import { advance, choose, complete, difficulty, FAIL_TICKS, failOf, FAILS, FOALS, gates, IDLE_TICKS, isRole, isUnlocked, known, levels, migrateV1, NAME_TICKS, offered, open, parseRecords, path, pick, poke, press, problems, roles, start, stars, targets, things, touch, treats, TRIES_BEFORE_HELP, waiting, type Kind, type LevelDef, type State } from '../src/engines/promenade';
import { play, wander } from '../src/engines/promenade/solver';
import { failSvg } from '../src/games/promenade/art';

/** Runs until the first foal waits at a gate (or the level ends). */
const toGate = (s: State): State => { let out = s; while (waiting(out) === null && !out.finished && out.tick < 6000) out = advance(out); return out; };
/** Every element a child can meet: the gates, the treats, the puddles and the leaves. */
const elements = (l: LevelDef): Set<string> => new Set([...gates(l).map(g => g.kind as string), ...treats(l).length ? ['friandise'] : [], ...path(l).some(s => s.cell === 'P') ? ['flaque'] : [], ...path(l).some(s => s.cell === 'L') ? ['feuilles'] : []]);
/** What a level is made of, in walking order: its gates, treats, puddles and leaves, and the floors. */
function tokens(l: LevelDef): string[] {
    const spots = path(l), list = gates(l), treatList = treats(l), out: string[] = [];
    for (let k = 0; k < spots.length; k++) {
        if (k > 0 && spots[k]!.floor !== spots[k - 1]!.floor) out.push('/');
        for (const g of list) if (g.at === k) out.push(g.kind);
        if ('PL'.includes(spots[k]!.cell)) out.push(spots[k]!.cell);
        if (treatList.some(t => Math.floor(t.at) === k && !t.arch)) out.push('*');
    }
    return out;
}
function levenshtein(a: readonly string[], b: readonly string[]): number {
    let row = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const next = [i];
        for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j]! + 1, next[j - 1]! + 1, row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
        row = next;
    }
    return row[b.length]!;
}
const apart = (a: Set<string>, b: Set<string>): number => [...a].filter(x => !b.has(x)).length + [...b].filter(x => !a.has(x)).length;
/** How different two scenes feel: the edit distance of what happens in walking order, plus the elements one has and the
 * other has not, one for another scenery and half a point for another lost friend. The same scene in another scenery is at 1. */
const distance = (a: LevelDef, b: LevelDef): number => levenshtein(tokens(a), tokens(b)) + apart(elements(a), elements(b)) + (a.theme === b.theme ? 0 : 1) + ((a.friend ?? '') === (b.friend ?? '') ? 0 : .5);
const MIN_DISTANCE = 3;
/** The robot's median number of touches over 200 seeds, for every level, stays under this. */
const ROBOT_MEDIAN = 24;

it('52 scenes written by hand, each fair to a five-year-old, with a title Lumi says and its own strong moment', () => {
    expect(levels).toHaveLength(52);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `level ${l.id}`).toEqual([]);
        expect(l.title.fr.length, `level ${l.id}`).toBeLessThanOrEqual(40); expect(l.title.en.length).toBeGreaterThan(5);
    }
    for (const key of ['fr', 'en'] as const) expect(new Set(levels.map(l => l.title[key])).size).toBe(52);
    expect(new Set(levels.map(l => l.moment)).size).toBe(52);
});

it('every scene is far enough from every other one: what happens, in which order, and where', () => {
    let min = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < min) { min = d; pair = `${a.id}~${b.id}`; } }
    expect(min, `closest scenes ${pair}`).toBeGreaterThanOrEqual(MIN_DISTANCE);
    // The measure does fail on near twins: the same scene in another scenery.
    expect(distance(levels[9]!, { ...levels[9]!, theme: 'neige' })).toBeLessThan(MIN_DISTANCE);
});

it('from level 3 on, every scene has a moment other than waiting for a job', () => {
    for (const l of levels.slice(2)) expect([...elements(l)].some(e => !isRole(e as Kind)), `level ${l.id}`).toBe(true);
    // At least six new playful elements, each seen in three scenes or more, and eight sceneries.
    for (const t of [...things, 'friandise'] as const) expect(levels.filter(l => elements(l).has(t)).length, t).toBeGreaterThanOrEqual(3);
    expect(new Set(levels.map(l => l.theme)).size).toBe(8);
    expect(new Set(levels.map(l => l.floors.length))).toEqual(new Set([1, 2, 3]));
});

it('each new element comes alone first, novelties keep coming, and difficulty never steps back more than one notch', () => {
    const seen = new Set<string>(), debuts: number[] = [];
    for (const l of levels) {
        const fresh = [...elements(l)].filter(e => !seen.has(e) && e !== 'flaque' && e !== 'feuilles');
        expect(fresh.length, `level ${l.id} brings ${fresh.join(', ')}`).toBeLessThanOrEqual(1);
        if (fresh.length) {
            debuts.push(l.id);
            // Alone: no other gate than the new one.
            const others = gates(l).filter(g => g.kind !== fresh[0]);
            expect(others, `level ${l.id} (${fresh[0]!})`).toEqual([]);
        }
        for (const e of elements(l)) seen.add(e);
    }
    expect(debuts).toEqual([2, 3, 4, 5, 6, 7, 10, 13, 16, 19, 23, 27, 31]);
    // Once met, an element comes back two or three times before the next one arrives with something else.
    for (let i = 1; i < debuts.length; i++) expect(debuts[i]! - debuts[i - 1]!, `after level ${debuts[i - 1]}`).toBeLessThanOrEqual(4);
    const curve = levels.map(difficulty);
    for (let i = 1; i < curve.length; i++) expect(curve[i]!, `level ${i + 1}`).toBeGreaterThanOrEqual(curve[i - 1]! - 1);
    expect(Math.max(...curve.slice(0, 20))).toBeLessThan(Math.max(...curve.slice(40)));
});

it('the solver brings the five foals (and the friend) home on every level with three stars, both ways at a fork', () => {
    for (const l of levels) {
        for (const straight of [false, true]) {
            const { state } = play(l.id, { straight });
            expect(state.finished, `level ${l.id}`).toBe(true);
            expect(state.foals.every(f => f.home)).toBe(true); expect(stars(state)).toBe(3);
            if (l.friend) expect(state.friend?.home, `level ${l.id}`).toBe(true);
        }
    }
    // The tasty way picks the arch treats on its own; going straight leaves them.
    expect(play(31).state.picked.filter(Boolean)).toHaveLength(6);
    expect(play(31, { straight: true }).state.picked.filter(Boolean)).toHaveLength(0);
});

it('every gate is needed where it stands: without it the troupe waits in front of it, whole', () => {
    for (const l of levels) for (const [k, g] of gates(l).entries()) {
        const stuck = play(l.id, { skip: k, limit: 4000 }).state;
        expect(stuck.finished, `level ${l.id} gate ${k}`).toBe(false);
        expect(waiting(stuck), `level ${l.id} gate ${k}`).toBe(k);
        expect(Math.max(...stuck.foals.map(f => f.pos))).toBe(g.at * 8);
        expect(stuck.foals.every(f => !f.home)).toBe(true);
    }
});

it('every wrong job is tried for real with its own funny scene, then the foal waits again with nothing changed', () => {
    // Twelve pairs (obstacle × wrong job), twelve different scenes, each one drawn from start to end.
    const names = roles.flatMap(need => roles.filter(r => r !== need).map(r => failOf(need, r)!));
    expect(names).toHaveLength(12); expect(new Set(names).size).toBe(12);
    expect(Object.values(FAILS).flatMap(Object.values).sort()).toEqual([...names].sort());
    for (const name of names) for (const t of [0, .3, .6, 1]) expect(failSvg(name, t, 50, 200, 1).length, `${name} at ${t}`).toBeGreaterThan(80);
    for (const l of levels) {
        const { state, tries, broken } = play(l.id, { wrong: true });
        expect(broken, `level ${l.id}`).toEqual([]);
        const roleGates = gates(l).filter(g => isRole(g.kind)).length;
        // The wrong jobs never cost a star; only the help that comes after the third one does.
        expect(state.finished).toBe(true);
        expect(state.helped.filter(Boolean).length, `level ${l.id}`).toBe(offered(l).length - 1 >= TRIES_BEFORE_HELP ? roleGates : 0);
        expect(tries, `level ${l.id}`).toBe(roleGates * Math.max(0, offered(l).length - 1));
    }
});

it('from two known jobs on, every known job is offered, not only the right ones', () => {
    expect(known(5)).toEqual(['pont', 'tunnel']);
    expect(offered(levels[3]!)).toEqual(['tunnel']);
    expect(offered(levels[4]!)).toEqual(['pont', 'tunnel', 'trou']);
    for (const l of levels.slice(5)) if (gates(l).some(g => isRole(g.kind))) expect(offered(l), `level ${l.id}`).toEqual([...roles]);
});

it('a random child touching any offered button finishes every level in a bounded median of touches', () => {
    let worst = 0, at = 0;
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, seed) => wander(l.id, seed + 1));
        expect(runs.every(r => r.state.finished), `level ${l.id}`).toBe(true);
        const sorted = runs.map(r => r.touches).sort((a, b) => a - b), median = (sorted[99]! + sorted[100]!) / 2;
        if (median > worst) { worst = median; at = l.id; }
    }
    expect(worst, `level ${at}`).toBeLessThanOrEqual(ROBOT_MEDIAN);
}, 120_000);

it('nothing moves before the trapdoor opens; wrong tries are free; three of them make the right job shine', () => {
    const closed = advance(start(1), 300);
    expect(closed.foals.every(f => !f.out)).toBe(true); expect(closed.hint).toBe('start');
    const s = toGate(open(start(8)));
    expect(waiting(s)).toBe(0);
    const chosen = touch(s); expect(chosen.outcome).toBe('choose'); expect(chosen.state.choosing).toBe(true);
    let t = chosen.state;
    for (const [i, wrong] of (['tunnel', 'trou', 'echelle'] as const).entries()) {
        const tried = choose(t, wrong); expect(tried.outcome).toBe('fail'); expect(tried.state.fail?.role).toBe(wrong);
        // While the funny scene plays the foal is busy, then it waits again, the buttons still open.
        expect(waiting(tried.state)).toBe(null); expect(targets(tried.state).some(x => x.type === 'role')).toBe(false);
        t = advance(tried.state, FAIL_TICKS);
        expect(waiting(t)).toBe(0); expect(t.choosing).toBe(true); expect(t.cleared).toEqual([false, false]);
        expect(t.hint).toBe(i + 1 >= TRIES_BEFORE_HELP ? 'role' : 'none');
    }
    expect(t.helped[0]).toBe(true);
    const right = choose(t, 'pont'); expect(right.outcome).toBe('work');
    let end = right.state; while (!end.finished) { end = advance(end); const w = waiting(end); if (w !== null) end = choose(end, gates(levels[7]!)[w]!.kind as never).state; }
    expect(stars(end)).toBe(2);
    // Two funny tries cost nothing at all.
    let free = touch(toGate(open(start(8)))).state;
    for (const wrong of ['tunnel', 'trou'] as const) free = advance(choose(free, wrong).state, FAIL_TICKS);
    free = choose(free, 'pont').state; while (!free.finished) { free = advance(free); const w = waiting(free); if (w !== null) free = choose(free, gates(levels[7]!)[w]!.kind as never).state; }
    expect(stars(free)).toBe(3);
});

it('waiting long makes what to touch shine, then Lumi names it; a single job works on the first touch', () => {
    const s = toGate(open(start(2)));
    expect(touch(s).outcome).toBe('work');
    const idle = advance(s, IDLE_TICKS); expect(idle.hint).toBe('foal'); expect(idle.helped[0]).toBe(false);
    const longer = advance(s, NAME_TICKS); expect(longer.hint).toBe('role'); expect(longer.helped[0]).toBe(true);
    expect(longer.foals.length).toBe(FOALS);
    const multi = advance(toGate(open(start(8))), NAME_TICKS); expect(multi.choosing).toBe(true); expect(multi.hint).toBe('role');
    // At a fork both ways are right: naming them is not a help.
    const fork = advance(toGate(open(start(31))), NAME_TICKS); expect(fork.hint).toBe('role'); expect(fork.helped[0]).toBe(false);
});

it('the scenery waits for a touch: the bear, the friend, the flower, the treats', () => {
    const bear = toGate(open(start(10)));
    expect(targets(bear)).toEqual([{ type: 'thing' }, { type: 'treat', index: 0 }]);
    expect(touch(bear).outcome).toBe('ignored'); expect(poke(bear).outcome).toBe('work');
    // The friend steps aside, lets the troupe go by, then follows it through the door.
    let friend = poke(toGate(open(start(7)))).state;
    while (!friend.finished) friend = advance(friend);
    expect(friend.friend?.home).toBe(true);
    // The flower can be touched before the troupe gets to the drawbridge: then nobody waits there.
    let castle = press(advance(open(start(19)), 2)).state;
    expect(castle.works).toHaveLength(1);
    while (!castle.finished && castle.tick < 4000) { castle = advance(castle); expect(waiting(castle)).toBe(null); }
    expect(castle.finished).toBe(true);
    const sweets = start(3);
    const picked = pick(sweets, 1); expect(picked.outcome).toBe('pick'); expect(pick(picked.state, 1).outcome).toBe('ignored');
});

it('stars and records: best kept, next unlocked, bad storage ignored, the first walk keeps its open levels', () => {
    const won = play(3).state;
    expect(complete({ 3: 2 }, won)).toEqual({ 3: 3 }); expect(complete({ 3: 3 }, { ...won, helped: [true] })).toEqual({ 3: 3 });
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"53":1,"x":2,"4":1.5,"open":12}')).toEqual({ 1: 3, open: 12 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
    expect(migrateV1('{"1":3,"2":2,"3":1}')).toEqual({ open: 4 }); expect(migrateV1('{"52":3}')).toEqual({ open: 52 });
    expect(migrateV1(null)).toEqual({}); expect(migrateV1('garbage')).toEqual({});
    expect(isUnlocked(4, { open: 4 })).toBe(true); expect(isUnlocked(5, { open: 4 })).toBe(false);
});
