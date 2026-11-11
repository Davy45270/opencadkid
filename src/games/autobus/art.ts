import { characterSvg } from '../../characters/svg';
import { CALI, geometry, STOP, type Color, type Exit, type Fail, type LevelDef, type Vehicle } from '../../engines/autobus';
/** Drawings of « Les bus de CaliRoux », in board units (the board is 180 wide and 300 high), in the ink and rounded
 * strokes of the guides. Every bus colour has its own white picture (a heart, a ball, a star, a triangle, a square), on
 * the bus’s roof and on the cap of the child who waits for it, so that nothing differs by colour alone. */
export const INK = '#46364a';
const st = (w = 2): string => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const STAR = 'M0 -10L3 -3.6L9.9 -3.1L4.6 1.5L6.2 8.3L0 4.7L-6.2 8.3L-4.6 1.5L-9.9 -3.1L-3 -3.6Z';
export const hex: Readonly<Record<Color, string>> = { r: '#e5383b', b: '#2f80ed', j: '#f6b912', v: '#27ae60', m: '#9b51e0' };
/** The white picture of a colour, about 10 units across, centred on (0, 0). */
export function motif(c: Color): string {
    const w = `fill="#fff" stroke="${INK}" stroke-width="1" stroke-linejoin="round"`;
    switch (c) {
        case 'r': return `<path d="M0 4.8C-5.8 0.8 -5.9 -4.2 -2.7 -4.7C-1.2 -4.9 -0.3 -4 0 -3C0.3 -4 1.2 -4.9 2.7 -4.7C5.9 -4.2 5.8 0.8 0 4.8Z" ${w}/>`;
        case 'b': return `<circle r="4.4" ${w}/>`;
        case 'j': return `<path transform="scale(.58)" d="${STAR}" fill="#fff" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>`;
        case 'v': return `<path d="M0 -5.2L5.2 4.2H-5.2Z" ${w}/>`;
        case 'm': return `<rect x="-4.2" y="-4.2" width="8.4" height="8.4" rx="1" ${w}/>`;
    }
}
/** A vehicle seen from above, `long` by `wide` units, its nose to the right: a bus (its colour, windows, its picture on
 * the roof) or a grey car or lorry. */
function body(v: Vehicle, long: number, wide: number): string {
    const m = 3, x0 = m, y0 = m, x1 = long - m, y1 = wide - m, w = y1 - y0, fill = v.color ? hex[v.color] : '#9aa3ad';
    const lights = `<circle cx="${x1 - 2.5}" cy="${y0 + 4.5}" r="2.4" fill="#fff59d" ${st(1.1)}/><circle cx="${x1 - 2.5}" cy="${y1 - 4.5}" r="2.4" fill="#fff59d" ${st(1.1)}/>`;
    const wheels = [x0 + 7, x1 - 9].map(x => `<rect x="${x}" y="${y0 - 2}" width="7" height="3.4" rx="1.4" fill="${INK}"/><rect x="${x}" y="${y1 - 1.4}" width="7" height="3.4" rx="1.4" fill="${INK}"/>`).join('');
    if (v.kind === 'bus') {
        const windows = Array.from({ length: Math.max(1, Math.floor((x1 - x0 - 26) / 11)) }, (_, k) => `<rect x="${x0 + 6 + k * 11}" y="${y0 + 3}" width="8" height="${w - 6}" rx="2.4" fill="#e3f2fd" opacity=".85"/>`).join('');
        return `${wheels}<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${w}" rx="7" fill="${fill}" ${st(2)}/>${windows}`
            + `<rect x="${x1 - 13}" y="${y0 + 2.5}" width="7" height="${w - 5}" rx="2.5" fill="#bbdefb" ${st(1.2)}/>${lights}`
            + `<g transform="translate(${(x0 + x1) / 2 - 3} ${(y0 + y1) / 2})"><circle r="8" fill="${fill}" ${st(1.4)}/><g transform="scale(1.15)">${motif(v.color!)}</g></g>`;
    }
    const cab = v.len === 3 ? `<rect x="${x1 - 17}" y="${y0}" width="17" height="${w}" rx="6" fill="#b0bec5" ${st(1.8)}/><path d="M${x0 + 6} ${y0 + w / 2}H${x1 - 22}" stroke="#78909c" stroke-width="2" stroke-dasharray="5 4"/>` : `<rect x="${x0 + 9}" y="${y0 + 4}" width="${x1 - x0 - 24}" height="${w - 8}" rx="4" fill="#cfd8dc" ${st(1.2)}/>`;
    return `${wheels}<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${w}" rx="6" fill="${fill}" ${st(2)}/>${cab}<rect x="${x1 - 12}" y="${y0 + 3}" width="5" height="${w - 6}" rx="2" fill="#e3f2fd" ${st(1)}/>${lights}`;
}
const angle = { droite: 0, bas: 90, gauche: 180, haut: -90 } as const;
/** Where a vehicle’s box starts, in board units, at `pos`. */
export function place(l: LevelDef, v: Vehicle, pos: number): { x: number; y: number; w: number; h: number } {
    const g = geometry(l), c = g.cell, along = v.len * c;
    return v.axis === 'v' ? { x: g.x0 + v.lane * c, y: g.y0 + pos * c, w: c, h: along } : { x: g.x0 + pos * c, y: g.y0 + v.lane * c, w: along, h: c };
}
/** A vehicle in its box: the outer group moves (CSS transform), the inner one is turned to the vehicle’s nose. */
export function vehicle(l: LevelDef, v: Vehicle, pos: number): string {
    const g = geometry(l), p = place(l, v, pos), long = v.len * g.cell, wide = g.cell;
    return `<g data-vehicle="${v.id}" style="transform:translate(${p.x}px,${p.y}px)"><g class="bus-roule"><g class="autobus-corps" transform="translate(${p.w / 2} ${p.h / 2}) rotate(${angle[v.nose]}) translate(${-long / 2} ${-wide / 2})">${body(v, long, wide)}</g></g></g>`;
}
/** A traffic cone in its cell. */
export function cone(x: number, y: number, c: number): string {
    const s = c / 36;
    return `<g transform="translate(${x + c / 2} ${y + c / 2}) scale(${s})"><g class="bus-plot"><ellipse cy="12" rx="13" ry="4.5" fill="#00000026"/><path d="M-12 12H12L4 -14H-4Z" fill="#fb8500" ${st(2)}/><path d="M-7.6 -1H7.6L9.4 5H-9.4Z" fill="#fff"/><rect x="-14" y="10" width="28" height="5" rx="2" fill="#fb8500" ${st(1.8)}/></g></g>`;
}
/** The yard: asphalt, parking lines, the fence with a gap and a little road for each gate. */
export function yard(l: LevelDef): string {
    const g = geometry(l), c = g.cell, gap = (e: Exit): boolean => e.side === 'haut';
    const lines = Array.from({ length: l.rows * l.cols }, (_, k) => { const r = Math.floor(k / l.cols), col = k % l.cols; return `<rect x="${g.x0 + col * c + 2}" y="${g.y0 + r * c + 2}" width="${c - 4}" height="${c - 4}" rx="5" fill="none" stroke="#ffffff70" stroke-width="1.4" stroke-dasharray="4 4"/>`; }).join('');
    const roads = l.exits.map(e => {
        const at = e.at * c;
        if (gap(e)) return `<rect data-gate="h${e.at}" x="${g.x0 + at + 2}" y="${g.y0 - 20}" width="${c - 4}" height="22" fill="#8d99a6"/><path d="M${g.x0 + at + c / 2} ${g.y0 - 16}v12" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/>`;
        const left = e.side === 'gauche', x = left ? 0 : g.x1 - 2;
        return `<rect data-gate="${left ? 'g' : 'd'}${e.at}" x="${x}" y="${g.y0 + at + 2}" width="${left ? g.x0 + 2 : 180 - g.x1 + 2}" height="${c - 4}" fill="#8d99a6"/>`;
    }).join('');
    // The fence: four sides, broken where a gate opens.
    const fence: string[] = [];
    const side = (fixed: number, from: number, to: number, horizontal: boolean, open: number[]): void => {
        const post = (p: number, q: number): void => { fence.push(horizontal ? `M${p} ${fixed}L${q} ${fixed}` : `M${fixed} ${p}L${fixed} ${q}`); };
        let a = from;
        for (const o of [...open].sort((p, q) => p - q)) { const s = from + 2 + o * c; if (s > a) post(a, s); a = s + c; }
        if (a < to) post(a, to);
    };
    side(g.y0 - 2, g.x0 - 2, g.x1 + 2, true, l.exits.filter(e => e.side === 'haut').map(e => e.at));
    side(g.y1 + 2, g.x0 - 2, g.x1 + 2, true, []);
    side(g.x0 - 2, g.y0 - 2, g.y1 + 2, false, l.exits.filter(e => e.side === 'gauche').map(e => e.at));
    side(g.x1 + 2, g.y0 - 2, g.y1 + 2, false, l.exits.filter(e => e.side === 'droite').map(e => e.at));
    return `${roads}<rect x="${g.x0}" y="${g.y0}" width="${g.x1 - g.x0}" height="${g.y1 - g.y0}" rx="4" fill="#b8c2cc"/>${lines}<path d="${fence.join('')}" stroke="#a1785c" stroke-width="4" stroke-linecap="round"/>`;
}
/** A child waiting at the stop, about 22 units high, standing on (0, 0), with the cap of its bus’s colour and picture. */
export function child(c: Color, k: number): string {
    const skin = ['#f8d3b0', '#d9a77e', '#a8754f', '#f1c7a3', '#c58c62'][k % 5]!;
    return `<ellipse cy="1" rx="8" ry="2.4" fill="#00000022"/><path d="M-6 0V-9Q-6 -13 0 -13Q6 -13 6 -9V0Z" fill="${hex[c]}" ${st(1.4)}/><circle cy="-18" r="6.4" fill="${skin}" ${st(1.4)}/>`
        + `<circle cx="-2.2" cy="-18.4" r=".9" fill="${INK}"/><circle cx="2.2" cy="-18.4" r=".9" fill="${INK}"/><path d="M-2 -15.6Q0 -14 2 -15.6" fill="none" ${st(1)}/>`
        + `<path d="M-7 -21Q-6.4 -27.6 0 -27.6Q6.4 -27.6 7 -21Z" fill="${hex[c]}" ${st(1.4)}/><path d="M5 -21.6H11" ${st(2.4)}/><g transform="translate(0 -23.4) scale(.48)">${motif(c)}</g>`;
}
/** Where the children stand in the stop: the first by the shelter, the others behind. */
export const childX = (k: number): number => 58 + k * 23;
export const CHILD_Y = 54;
/** The bus stop: a shelter with its sign, and the children still waiting, the first one lifted on a little step. */
export function stop(waiting: readonly Color[], first: number): string {
    const kids = waiting.map((c, k) => `<g data-child="${first + k}" transform="translate(${childX(k)} ${CHILD_Y - (k === 0 ? 4 : 0)})"><g class="bus-enfant">${child(c, first + k)}</g></g>`).join('');
    return `<rect x="${STOP.x0}" y="${STOP.y0}" width="${STOP.x1 - STOP.x0}" height="${STOP.y1 - STOP.y0}" rx="12" fill="#fff4dc" ${st(1.6)}/>`
        + `<g class="bus-abri"><path d="M10 18H44V58H10Z" fill="#cfe8f3" opacity=".7" ${st(1.6)}/><path d="M6 18L27 8L48 18Z" fill="#8d6e63" ${st(1.8)}/></g>`
        + `<g class="autobus-panneau" transform="translate(27 34)"><g class="bus-panneau"><circle r="11" fill="#2f80ed" ${st(1.8)}/><rect x="-6.5" y="-5" width="13" height="9" rx="2.5" fill="#fff"/><circle cx="-3.6" cy="5" r="1.8" fill="#fff"/><circle cx="3.6" cy="5" r="1.8" fill="#fff"/></g></g>`
        + `<rect x="${childX(0) - 11}" y="${CHILD_Y - 4}" width="22" height="5" rx="2" fill="#e0c79a" ${st(1.2)}/><g class="bus-file">${kids}</g>`;
}
/** CaliRoux, the guide’s own drawing, in his corner at the bottom left. */
export function caliroux(expression: 'joie' | 'surprise' | 'celebration' = 'joie'): string {
    const { x0, y0, x1, y1 } = CALI;
    return `<g class="bus-cali-corps">${characterSvg('pandaroux', expression, 'repos', 'reduce').replace('<svg ', `<svg x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" `)}</g>`;
}
/** The pigeon who walks in the yard when an empty cell is touched. */
export const pigeon = (): string => `<g class="bus-pigeon"><ellipse cx="0" cy="0" rx="9" ry="6" fill="#b0bec5" ${st(1.4)}/><circle cx="7" cy="-6" r="4.4" fill="#90a4ae" ${st(1.4)}/><path d="M11 -6.5L14.5 -5.5L11 -4.4Z" fill="#ffb703" ${st(.9)}/><circle cx="8" cy="-7" r=".9" fill="${INK}"/><path d="M-8 -1L-14 -4L-12 2Z" fill="#90a4ae" ${st(1.2)}/></g>`;
/** The bubble with the sound word. */
export const bubbleWidth = (word: string): number => Math.max(46, word.length * 8.6 + 16);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="bus-bulle-mot"><rect x="${-w / 2}" y="-42" width="${w}" height="24" rx="10" fill="#fff" ${st(1.8)}/><path d="M-4 -19L0 -12L5 -19" fill="#fff" ${st(1.8)}/><text x="0" y="-25" text-anchor="middle" font-size="15" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
/** What CaliRoux does in a funny try: jumps at the horn, leans to tell the children, laughs, waves, looks at the pigeon,
 * rolls over. */
export const failAnimations: Readonly<Record<Fail, string>> = {
    klaxon: 'bus-cali-sursaut', pasmoi: 'bus-cali-penche', plot: 'bus-cali-rit', coucou: 'bus-cali-salue', pigeon: 'bus-cali-regarde', roulade: 'bus-cali-roule'
};
/** What the thing of the try does: the stuck vehicle shakes, the children shake their heads, the cone wobbles, the
 * children jump and wave, the pigeon hops, the bus-stop sign spins. */
export const thingAnimations: Readonly<Record<Fail, string>> = {
    klaxon: 'bus-klaxon', pasmoi: 'bus-non', plot: 'bus-plot-bong', coucou: 'bus-coucou', pigeon: 'bus-pigeon-saute', roulade: 'bus-panneau-tourne'
};
export const failWords: Readonly<Record<'fr' | 'en', Record<Fail, string>>> = {
    fr: { klaxon: 'Pouêt pouêt !', pasmoi: 'Non non !', plot: 'Bong !', coucou: 'Coucou !', pigeon: 'Rou rou !', roulade: 'Hop !' },
    en: { klaxon: 'Honk honk!', pasmoi: 'Not ours!', plot: 'Bong!', coucou: 'Hello!', pigeon: 'Coo coo!', roulade: 'Whee!' }
};
const sparks = (fill: string, at: number[][]): string => at.map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.6)" d="${STAR}" fill="${fill}" ${st(1.2)}/>`).join('');
export const effects: Readonly<Record<Fail, string>> = {
    klaxon: `<g class="bus-eclat"><path d="M-20 -10l-8 -6M-22 0h-10M-20 10l-8 6M20 -10l8 -6M22 0h10M20 10l8 6" stroke="#ffb703" stroke-width="3" stroke-linecap="round"/></g>`,
    pasmoi: `<g class="bus-eclat"><path d="M-8 -8L8 8M8 -8L-8 8" stroke="#e5383b" stroke-width="4" stroke-linecap="round"/></g>`,
    plot: `<g class="bus-eclat"><path d="M-16 -6l-6 -4M16 -6l6 -4M0 -16v-7" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/></g>`,
    coucou: `<g class="bus-eclat">${sparks('#ffd23f', [[-20, -6], [20, -10]])}</g>`,
    pigeon: `<g class="bus-eclat">${[[-10, 8], [-2, 10], [6, 8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#8d6e63"/>`).join('')}</g>`,
    roulade: `<g class="bus-eclat">${sparks('#ff7ab6', [[-20, 0], [20, -4], [0, -18]])}</g>`
};
export const confetti = (): string => `<g class="bus-confettis">${Array.from({ length: 18 }, (_, k) => `<rect x="${Math.round(Math.cos(k * 2.4) * (18 + k * 2.4))}" y="${Math.round(Math.sin(k * 2.4) * (14 + k * 2))}" width="4" height="7" rx="1" fill="${['#e5383b', '#2f80ed', '#f6b912', '#27ae60', '#9b51e0', '#f2851d'][k % 6]}"/>`).join('')}</g>`;
