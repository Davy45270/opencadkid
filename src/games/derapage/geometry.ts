import { ONE_WAY, EXIT, roadTicks, spotOf, levelOf, type LevelDef, type Road, type Shape, type Spot, type State } from '../../engines/derapage';
/** Where things stand on a screen of « Le kart de Pestouille », in board units, without the DOM: the board is 180 wide and
 * 300 high (taller than wide, like a phone), the road comes up from the bottom to where the kart stops, then goes on to the
 * fork, the house or the funny thing at the top. Pure, so that the tests can check every screen of every scene. */
export const W = 180, H = 300;
export interface Pt { x: number; y: number }
export interface Box { what: string; x0: number; y0: number; x1: number; y1: number }
/** Where the kart stops on every screen, where the road comes in, the fork point and the middle of a roundabout. */
export const STOP: Pt = { x: 90, y: 204 };
export const ENTRY: Pt = { x: 90, y: 316 };
export const FORK: Pt = { x: 90, y: 176 };
export const RING: Pt & { r: number } = { x: 90, y: 148, r: 22 };
/** The kart (its box while it waits at the stop), the arrows, the road's half width. */
export const KART_W = 44, KART_H = 54, ARROW = 36, ROAD = 12;
/** The signs: a row of panels at the top, one per road, and the bottom of the panels where the roads end. */
export const SIGN_TOP = 6, SIGN_BOTTOM = 92;
/** The friend's house and the friend beside it; the funny thing. */
export const HOUSE_X = 86, HOUSE_W = 92;
export const HOUSE: Box = { what: 'house', x0: HOUSE_X - HOUSE_W / 2 - 4, y0: 47, x1: HOUSE_X + HOUSE_W / 2 + 4, y1: 150 };
export const FRIEND: Box = { what: 'friend', x0: 138, y0: 124, x1: 178, y1: 180 };
export const THING: Box = { what: 'thing', x0: 22, y0: 38, x1: 158, y1: 150 };
export const THING_AT: Pt = { x: 90, y: 92 };
/** The river (bridge) or the hill (tunnel) across the road, as a band. */
export const DECO_Y = 260;

const catmull = (pts: Pt[], steps = 12): Pt[] => {
    const out: Pt[] = [pts[0]!];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[Math.min(pts.length - 1, i + 2)]!;
        for (let k = 1; k <= steps; k++) {
            const t = k / steps, t2 = t * t, t3 = t2 * t;
            const f = (a: number, b: number, c: number, d: number): number => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
            out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
        }
    }
    return out;
};
const line = (a: Pt, b: Pt, steps = 8): Pt[] => Array.from({ length: steps + 1 }, (_, k) => ({ x: a.x + (b.x - a.x) * k / steps, y: a.y + (b.y - a.y) * k / steps }));
const join = (...parts: Pt[][]): Pt[] => parts.reduce<Pt[]>((acc, p) => acc.length ? [...acc, ...p.slice(1)] : [...p], []);
/** The road of a screen, from the bottom edge to the stop, as its shape draws it. */
export function roadPoints(shape: Shape): Pt[] {
    const y = (k: number): number => ENTRY.y + (STOP.y - ENTRY.y) * k;
    switch (shape) {
        case 'droit': return line(ENTRY, STOP, 12);
        case 'vague': return catmull([ENTRY, { x: 90, y: y(.12) }, { x: 44, y: y(.4) }, { x: 136, y: y(.72) }, { x: 90, y: y(.92) }, STOP]);
        case 'serpent': return catmull([ENTRY, { x: 70, y: y(.1) }, { x: 34, y: y(.28) }, { x: 146, y: y(.5) }, { x: 34, y: y(.72) }, { x: 90, y: y(.9) }, STOP]);
        case 'zigzag': return join(line(ENTRY, { x: 90, y: y(.1) }, 3), line({ x: 90, y: y(.1) }, { x: 36, y: y(.32) }), line({ x: 36, y: y(.32) }, { x: 144, y: y(.58) }), line({ x: 144, y: y(.58) }, { x: 40, y: y(.84) }), line({ x: 40, y: y(.84) }, STOP));
        case 'virage': return catmull([ENTRY, { x: 120, y: y(.15) }, { x: 150, y: y(.45) }, { x: 120, y: y(.8) }, STOP]);
        case 'escalier': return join(line(ENTRY, { x: 40, y: y(.05) }, 6), line({ x: 40, y: y(.05) }, { x: 40, y: y(.38) }, 5), line({ x: 40, y: y(.38) }, { x: 140, y: y(.38) }, 8), line({ x: 140, y: y(.38) }, { x: 140, y: y(.72) }, 5), line({ x: 140, y: y(.72) }, { x: 90, y: y(.72) }, 5), line({ x: 90, y: y(.72) }, STOP, 5));
        case 'boucle': {
            // Up the right side, once round a loop on the left (like a 6), then up to the stop.
            const c = { x: 60, y: 260 }, r = 30, loop: Pt[] = [];
            for (let k = 0; k <= 36; k++) { const a = -k / 36 * 2 * Math.PI; loop.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }); }
            return join(line(ENTRY, { x: 90, y: 260 }, 6), loop, line({ x: 90, y: 260 }, STOP, 6));
        }
    }
}
/** Where the road of a screen goes on beyond the stop: to the fork point, or to the door of the house, or the funny thing. */
export const approachPoints = (sp: Spot): Pt[] => line(STOP, sp.kind === 'fourche' ? (sp.round ? { x: RING.x, y: RING.y + RING.r } : FORK) : { x: sp.kind === 'ami' ? HOUSE_X : 90, y: 150 }, 6);
/** The middle of the panel of road i of n, at its bottom (where the road ends). */
export const signX = (n: number, i: number): number => n === 2 ? [45, 135][i]! : [30, 90, 150][i]!;
export function signBox(n: number, i: number): Box {
    const w = n === 2 ? 78 : 56, x = signX(n, i);
    return { what: `sign ${i}`, x0: x - w / 2, y0: SIGN_TOP, x1: x + w / 2, y1: SIGN_BOTTOM };
}
/** The way out of a fork along road i of n, from the stop to the bottom of its panel. */
export function branchPoints(n: number, i: number, round: boolean): Pt[] {
    const end = { x: signX(n, i), y: SIGN_BOTTOM + 2 };
    if (!round) {
        const x = end.x, curve: Pt[] = [];
        for (let k = 0; k <= 16; k++) { const t = k / 16, u = 1 - t; curve.push({ x: u ** 3 * FORK.x + 3 * u * u * t * FORK.x + 3 * u * t * t * x + t ** 3 * x, y: u ** 3 * FORK.y + 3 * u * u * t * 150 + 3 * u * t * t * 128 + t ** 3 * end.y }); }
        return join(line(STOP, FORK, 4), curve);
    }
    // Round the ring, keeping it on the left (anticlockwise on screen), from its bottom to the exit, then out.
    const exits = n === 2 ? [-3 * Math.PI / 4, -Math.PI / 4] : [Math.PI, -Math.PI / 2, 0];
    const exit = exits[i]!, start = Math.PI / 2, ring: Pt[] = [];
    // From the bottom (angle π/2) going right then up: angles decrease from π/2 towards the exit.
    let to = exit; while (to > start) to -= 2 * Math.PI;
    const steps = Math.max(4, Math.round((start - to) / (Math.PI / 12)));
    for (let k = 0; k <= steps; k++) { const a = start + (to - start) * k / steps; ring.push({ x: RING.x + Math.cos(a) * RING.r, y: RING.y + Math.sin(a) * RING.r }); }
    const out = ring[ring.length - 1]!;
    return join(line(STOP, ring[0]!, 4), ring, catmull([out, { x: out.x + Math.cos(exit) * 12, y: out.y + Math.sin(exit) * 12 }, end], 8));
}
/** The arrow of road i: on its way out, where it crosses `ARROW_Y`, pointing along it. */
export const ARROW_Y = 124;
/** The middle road of three goes straight up: its arrow stands higher, clear of the two roads leaving sideways. */
export const arrowY = (n: number, i: number): number => n === 3 && i === 1 ? ARROW_Y - 11 : ARROW_Y;
export function arrowAt(n: number, i: number, round: boolean): Pt & { angle: number } {
    const pts = branchPoints(n, i, round), ARROW_Y = arrowY(n, i);
    let k = pts.findIndex((p, j) => j > 0 && p.y <= ARROW_Y && pts[j - 1]!.y > ARROW_Y);
    if (k < 1) k = Math.floor(pts.length * .7);
    const a = pts[k - 1]!, b = pts[k]!, t = (a.y - ARROW_Y) / ((a.y - b.y) || 1);
    const after = pts[Math.min(pts.length - 1, k + 2)]!, before = pts[Math.max(0, k - 2)]!;
    return { x: a.x + (b.x - a.x) * t, y: ARROW_Y, angle: Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI + 90 };
}
export const arrowBox = (n: number, i: number, round: boolean): Box => { const a = arrowAt(n, i, round); return { what: `arrow ${i}`, x0: a.x - ARROW / 2, y0: a.y - ARROW / 2, x1: a.x + ARROW / 2, y1: a.y + ARROW / 2 }; };
export const kartBox = (at: Pt = STOP): Box => ({ what: 'kart', x0: at.x - KART_W / 2, y0: at.y - KART_H / 2, x1: at.x + KART_W / 2, y1: at.y + KART_H / 2 });
/** The things drawn on the screen of a spot, as boxes: what must never cover anything else. */
export function boxesOf(sp: Spot): Box[] {
    const out: Box[] = [kartBox()];
    if (sp.kind === 'fourche') sp.to.forEach((to, i) => { out.push(signBox(sp.to.length, i)); if (to !== ONE_WAY) out.push(arrowBox(sp.to.length, i, sp.round)); });
    else if (sp.kind === 'ami') out.push(HOUSE, FRIEND);
    else out.push(THING);
    return out;
}
export const overlap = (a: Box, b: Box, margin = 1): boolean => a.x0 < b.x1 - margin && b.x0 < a.x1 - margin && a.y0 < b.y1 - margin && b.y0 < a.y1 - margin;
/** What covers what on the screen of a spot: two boxes, or a box over a road it is not on (the arrows sit on their roads,
 * the kart on its own). Empty when nothing does. */
export function overlaps(sp: Spot): string[] {
    const out: string[] = [], boxes = boxesOf(sp);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlap(boxes[i]!, boxes[j]!)) out.push(`${boxes[i]!.what} covers ${boxes[j]!.what}`);
    const near = (b: Box, pts: Pt[], pad: number): boolean => pts.some(p => p.x > b.x0 - pad && p.x < b.x1 + pad && p.y > b.y0 - pad && p.y < b.y1 + pad);
    // The last points of a way out reach the bottom of its panel: that is where it ends, not a road over the panel.
    const ways = sp.kind === 'fourche' ? sp.to.map((_, i) => branchPoints(sp.to.length, i, sp.round).filter(p => p.y > SIGN_BOTTOM + ROAD)) : [];
    for (const b of boxes) {
        if (b.what === 'kart') continue;
        if (b.what.startsWith('arrow')) {
            const i = Number(b.what.split(' ')[1]);
            // Another road may pass under an arrow only near the fork, where all the roads start together.
            if (sp.kind === 'fourche' && !sp.round) ways.forEach((w, j) => { if (j !== i && near(b, w.filter(p => p.y < FORK.y - 16), ROAD - 4)) out.push(`${b.what} on road ${j}`); });
            continue;
        }
        if (near(b, roadPoints(sp.road.shape), ROAD - 2)) out.push(`${b.what} on the road`);
        ways.forEach((w, j) => { if (near(b, w, ROAD - 2)) out.push(`${b.what} on road ${j}`); });
    }
    return out;
}
/** The way the kart follows, and how far along it, at a state: the road picked out of the screen left (or back down the
 * road after a funny try), then the road of the new screen up to its stop. */
export function kartAt(s: Pick<State, 'level' | 'spot' | 'd' | 'from'>): Pt & { angle: number } {
    const l: LevelDef = levelOf(s.level);
    let pts: Pt[], f: number;
    if (s.from && s.d < EXIT) {
        const sp = spotOf(l, s.from.spot);
        pts = s.from.road >= 0 && sp.kind === 'fourche' ? branchPoints(sp.to.length, s.from.road, sp.round) : [...roadPoints(sp.road.shape)].reverse();
        f = s.d / EXIT;
        if (s.from.road < 0) {
            // Back down after a funny try: the kart still faces up while the try plays, then turns round as it leaves.
            const p = along(pts, f), k = Math.min(1, f / .5);
            return { ...p, angle: (p.angle > 0 ? p.angle : p.angle + 360) * k * k * (3 - 2 * k) };
        }
    } else {
        const road: Road = spotOf(l, s.spot).road;
        pts = roadPoints(road.shape); f = Math.min(1, (s.d - EXIT) / roadTicks(road));
        // The kart straightens up as it comes to its stop, to wait facing the fork.
        const p = along(pts, f), k = Math.max(0, Math.min(1, (f - .8) / .2));
        return { ...p, angle: p.angle * (1 - k * k * (3 - 2 * k)) };
    }
    return along(pts, f);
}
/** The point at fraction f of the length of a polyline, and the direction it goes (degrees, 0 = up). */
export function along(pts: Pt[], f: number): Pt & { angle: number } {
    const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y)), total = seg.reduce((a, b) => a + b, 0);
    let left = Math.max(0, Math.min(1, f)) * total;
    for (let i = 0; i < seg.length; i++) {
        if (left <= seg[i]! || i === seg.length - 1) {
            const a = pts[i]!, b = pts[i + 1]!, t = seg[i]! ? Math.min(1, left / seg[i]!) : 0;
            return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90 };
        }
        left -= seg[i]!;
    }
    return { ...pts[0]!, angle: 0 };
}
/** Where the starred bend of a road is: the stretch of its points between 30 % and 80 %. */
export const starPoints = (shape: Shape): Pt[] => [.35, .55, .75].map(f => along(roadPoints(shape), f));
/** The x of the road where it crosses the river or the hill. */
export function decoX(shape: Shape): number {
    const pts = roadPoints(shape);
    const k = pts.findIndex((p, j) => j > 0 && p.y <= DECO_Y && pts[j - 1]!.y > DECO_Y);
    return k > 0 ? pts[k]!.x : 90;
}
export const pathD = (pts: Pt[]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`).join('');
