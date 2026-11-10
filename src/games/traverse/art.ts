import type { Fail, GoalKind, Hero } from '../../engines/traverse';
/** Drawings of « La traversée de Lumi », in the ink and rounded strokes of the guides (src/characters). A cell is 100 units
 * wide; every drawing of a thing is centred on (0, 0), the middle of its cell, and stays within 46 units of it. */
export const U = 100;
export const INK = '#583746';
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
const RAINBOW = ['#f789b6', '#ffc167', '#ffe381', '#80d6b0', '#83cbea', '#b39beb'];
/** Each foal has its own coat; Boubou is the panda. */
export const COATS: Readonly<Record<Exclude<Hero, 'boubou'>, string>> = { rose: '#ffd6e7', bleu: '#d3e9ff', jaune: '#fff0b3', vert: '#cdf2dc', mauve: '#e6d9ff' };
/** Each vehicle has its colour and its own shape: a round car, a long box truck, a tractor with a big wheel. */
export const PAINT = { voiture: '#e2384f', voiture2: '#2f86e0', camion: '#f08a1c', tracteur: '#3fae55', canard: '#f5c518', rondin: '#a86b3c', train: '#9457d6' } as const;
const eyes = (y: number, gap: number, r = 5): string => `<circle cx="${-gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${n(-gap + r * .35)}" cy="${n(y - r * .35)}" r="${n(r * .38)}" fill="#fff"/><circle cx="${n(gap + r * .35)}" cy="${n(y - r * .35)}" r="${n(r * .38)}" fill="#fff"/>`;
const wide = (y: number, gap: number): string => `<circle cx="${-gap}" cy="${y}" r="7" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="${gap}" cy="${y}" r="7" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="${-gap}" cy="${y}" r="3" fill="${INK}"/><circle cx="${gap}" cy="${y}" r="3" fill="${INK}"/>`;
/** The little one who crosses, seen from the front: a smiling face and a surprised one (shown during a funny try), and
 * water drops (shown when it comes out of the water). */
export function hero(kind: Hero): string {
    const face = (happy: boolean, y: number, gap: number, mouth: number): string => happy
        ? `<g class="traverse-face-joie">${eyes(y, gap)}<path d="M-5 ${mouth}Q0 ${mouth + 4} 5 ${mouth}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`
        : `<g class="traverse-face-surprise">${wide(y, gap)}<ellipse cy="${mouth + 1}" rx="3.5" ry="4" fill="${INK}"/></g>`;
    const drops = `<g class="traverse-drops"><path d="M-30 -30q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/><path d="M30 -24q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/><path d="M-34 6q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/><path d="M34 10q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/></g>`;
    if (kind === 'boubou') {
        return `<ellipse cy="38" rx="26" ry="6" fill="#00000022"/><ellipse cy="18" rx="24" ry="20" fill="#fff6e7" stroke="${INK}" stroke-width="4"/><circle cx="-24" cy="-28" r="11" fill="#3b3035" stroke="${INK}" stroke-width="3"/><circle cx="24" cy="-28" r="11" fill="#3b3035" stroke="${INK}" stroke-width="3"/>`
            + `<circle cy="-8" r="30" fill="#fff6e7" stroke="${INK}" stroke-width="4"/><ellipse cx="-12" cy="-10" rx="9" ry="11" fill="#3b3035" transform="rotate(20 -12 -10)"/><ellipse cx="12" cy="-10" rx="9" ry="11" fill="#3b3035" transform="rotate(-20 12 -10)"/>`
            + `<g class="traverse-face-joie"><circle cx="-11" cy="-11" r="4" fill="#fff"/><circle cx="11" cy="-11" r="4" fill="#fff"/><circle cx="-11" cy="-11" r="2" fill="${INK}"/><circle cx="11" cy="-11" r="2" fill="${INK}"/><path d="M-7 6Q0 12 7 6" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`
            + `<g class="traverse-face-surprise"><circle cx="-11" cy="-11" r="6" fill="#fff"/><circle cx="11" cy="-11" r="6" fill="#fff"/><circle cx="-11" cy="-11" r="2.5" fill="${INK}"/><circle cx="11" cy="-11" r="2.5" fill="${INK}"/><ellipse cy="9" rx="4" ry="5" fill="${INK}"/></g>`
            + `<ellipse cy="0" rx="4.5" ry="3.2" fill="${INK}"/><circle cx="-20" cy="2" r="4" fill="#ff9fbf" opacity=".7"/><circle cx="20" cy="2" r="4" fill="#ff9fbf" opacity=".7"/>${drops}`;
    }
    const coat = COATS[kind], mane = RAINBOW.slice(0, 5).map((c, i) => `<circle cx="${-22 + i * 11}" cy="${-34 + Math.abs(i - 2) * 4}" r="8" fill="${c}" stroke="${INK}" stroke-width="2.5"/>`).join('');
    return `<ellipse cy="40" rx="26" ry="6" fill="#00000022"/><path d="M-16 14V36M-6 18V38M6 18V38M16 14V36" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M-16 14V36M-6 18V38M6 18V38M16 14V36" stroke="${coat}" stroke-width="5" stroke-linecap="round"/>`
        + `<ellipse cy="16" rx="24" ry="15" fill="${coat}" stroke="${INK}" stroke-width="4"/><path d="M-24 -30L-30 -46L-14 -36Z" fill="${coat}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M24 -30L30 -46L14 -36Z" fill="${coat}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
        + `<circle cy="-8" r="27" fill="${coat}" stroke="${INK}" stroke-width="4"/>${mane}<path d="M-5 -36L0 -58L5 -36Z" fill="#ffd56b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
        + `<ellipse cy="8" rx="13" ry="9" fill="#ffc1d4" stroke="${INK}" stroke-width="3"/><circle cx="-4" cy="7" r="1.8" fill="${INK}"/><circle cx="4" cy="7" r="1.8" fill="${INK}"/>`
        + face(true, -12, 11, 12) + face(false, -12, 11, 12) + `<circle cx="-20" cy="-2" r="4.5" fill="#ff9fbf" opacity=".7"/><circle cx="20" cy="-2" r="4.5" fill="#ff9fbf" opacity=".7"/>${drops}`;
}
/** The friend to bring along: a little rabbit, smaller than the hero. */
export function friend(): string {
    return `<ellipse cy="34" rx="18" ry="5" fill="#00000022"/><ellipse cx="-9" cy="-30" rx="6" ry="17" fill="#fff" stroke="${INK}" stroke-width="3"/><ellipse cx="9" cy="-30" rx="6" ry="17" fill="#fff" stroke="${INK}" stroke-width="3"/><ellipse cx="-9" cy="-28" rx="2.5" ry="10" fill="#ffc1d4"/><ellipse cx="9" cy="-28" rx="2.5" ry="10" fill="#ffc1d4"/>`
        + `<ellipse cy="18" rx="17" ry="15" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cy="-4" r="17" fill="#fff" stroke="${INK}" stroke-width="3"/>${eyes(-7, 7, 3.5)}<path d="M-4 3Q0 7 4 3" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><circle cx="-12" cy="1" r="3" fill="#ff9fbf" opacity=".7"/><circle cx="12" cy="1" r="3" fill="#ff9fbf" opacity=".7"/>`;
}
/** A snack to pick: a red apple with a leaf. */
export function snack(): string {
    return `<ellipse cy="30" rx="18" ry="5" fill="#00000022"/><path d="M0 -14C-22 -26 -32 2 -18 20C-10 30 -4 26 0 24C4 26 10 30 18 20C32 2 22 -26 0 -14Z" fill="#e2384f" stroke="${INK}" stroke-width="3.5"/><path d="M0 -14Q2 -26 6 -30" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><path d="M6 -26Q20 -34 22 -22Q12 -18 6 -26Z" fill="#7cc46c" stroke="${INK}" stroke-width="2.5"/><ellipse cx="-11" cy="-4" rx="5" ry="8" fill="#fff" opacity=".55" transform="rotate(20 -11 -4)"/>`;
}
export function bush(): string {
    return `<ellipse cy="32" rx="34" ry="7" fill="#00000022"/><g fill="#5fae55" stroke="${INK}" stroke-width="3.5"><circle cx="-20" cy="10" r="20"/><circle cx="20" cy="10" r="20"/><circle cy="-6" r="24"/></g><circle cx="-8" cy="-12" r="5" fill="#ff9fbf"/><circle cx="14" cy="4" r="5" fill="#ffe381"/><circle cx="-18" cy="16" r="4" fill="#fff"/>`;
}
/** The traffic light the child touches: red stops every car on the roads. */
export function light(red: boolean): string {
    return `<g transform="scale(1.2)"><ellipse cy="34" rx="18" ry="5" fill="#00000022"/><rect x="-4" y="-6" width="8" height="40" fill="#7a7f8c" stroke="${INK}" stroke-width="2.5"/><rect x="-18" y="-46" width="36" height="58" rx="10" fill="#3d3a44" stroke="${INK}" stroke-width="3"/>`
        + `<circle cy="-30" r="11" fill="${red ? '#ff3b4e' : '#5a2a30'}" stroke="${INK}" stroke-width="2"/><circle cy="-4" r="11" fill="${red ? '#26452e' : '#3fd35a'}" stroke="${INK}" stroke-width="2"/>${red ? '<circle cx="-4" cy="-34" r="3" fill="#fff" opacity=".8"/>' : '<circle cx="-4" cy="-8" r="3" fill="#fff" opacity=".8"/>'}</g>`;
}
/** What waits on the far side. */
export function goal(kind: GoalKind): string {
    switch (kind) {
        case 'maison': return `<ellipse cy="40" rx="40" ry="7" fill="#00000022"/><path d="M-34 -6V38H34V-6" fill="#ffe7c4" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-44 -2L0 -42L44 -2Z" fill="#e2384f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-10 38V14Q0 4 10 14V38Z" fill="#a86b3c" stroke="${INK}" stroke-width="3"/><rect x="14" y="4" width="14" height="14" rx="2" fill="#9fd3ff" stroke="${INK}" stroke-width="3"/><path d="M-22 6h10v10h-10Z" fill="#9fd3ff" stroke="${INK}" stroke-width="3"/>`;
        case 'lumi': return `<ellipse cy="40" rx="34" ry="7" fill="#00000022"/><path d="M-20 14V38M-8 16V40M8 16V40M20 14V38" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M-20 14V38M-8 16V40M8 16V40M20 14V38" stroke="#fff9f2" stroke-width="6" stroke-linecap="round"/><ellipse cy="14" rx="30" ry="17" fill="#fff9f2" stroke="${INK}" stroke-width="4"/><circle cy="-14" r="28" fill="#fff9f2" stroke="${INK}" stroke-width="4"/>${RAINBOW.map((c, i) => `<circle cx="${-26 + i * 10.4}" cy="${-40 + Math.abs(i - 2.5) * 4}" r="8.5" fill="${c}" stroke="${INK}" stroke-width="2.5"/>`).join('')}<path d="M-6 -42L0 -66L6 -42Z" fill="#ffd56b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${eyes(-16, 11)}<path d="M-8 -2Q0 6 8 -2" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="-21" cy="-6" r="5" fill="#ff9fbf" opacity=".7"/><circle cx="21" cy="-6" r="5" fill="#ff9fbf" opacity=".7"/>`;
        case 'piquenique': return `<path d="M-44 8L-28 38H28L44 8Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M-36 23H36M-22 8L-14 38M0 8V38M22 8L14 38" stroke="#e2384f" stroke-width="5"/><path d="M-20 -16H20L16 6H-16Z" fill="#c98b4d" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M-14 -16Q0 -42 14 -16" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="-6" cy="-20" r="7" fill="#e2384f" stroke="${INK}" stroke-width="2.5"/><circle cx="7" cy="-21" r="6" fill="#f5c518" stroke="${INK}" stroke-width="2.5"/>`;
        case 'cabane': return `<ellipse cy="40" rx="40" ry="7" fill="#00000022"/><path d="M-30 -4V38H30V-4" fill="#c98b4d" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-30 8H30M-30 22H30" stroke="#8a5a2e" stroke-width="3"/><path d="M-40 0L0 -40L40 0Z" fill="#5fae55" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-9 38V18H9V38Z" fill="#5d361d" stroke="${INK}" stroke-width="3"/><path d="M14 -24V-50L32 -44L14 -38" fill="#f789b6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    }
}
/** A car seen from the side, facing `dir`; two colours alternate on the roads. */
export function car(dir: number, color: string): string {
    return `<g transform="scale(${dir < 0 ? -1 : 1} 1)"><ellipse cy="34" rx="40" ry="6" fill="#00000022"/><path d="M-42 22V4Q-42 -6 -30 -8L-18 -28Q-14 -32 -6 -32H14Q22 -32 26 -26L36 -8Q44 -6 44 4V22Z" fill="${color}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
        + `<path d="M-12 -24H2V-8H-22Z" fill="#cfeaff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M8 -24H18L28 -8H8Z" fill="#cfeaff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="40" cy="4" r="4" fill="#fff59e" stroke="${INK}" stroke-width="2"/>`
        + `<circle cx="-24" cy="24" r="11" fill="#3d3a44" stroke="${INK}" stroke-width="3"/><circle cx="26" cy="24" r="11" fill="#3d3a44" stroke="${INK}" stroke-width="3"/><circle cx="-24" cy="24" r="4" fill="#ccc"/><circle cx="26" cy="24" r="4" fill="#ccc"/></g>`;
}
/** A truck, `cells` long, facing `dir`: an orange box and a cab. Drawn from x = -50 to x = cells * 100 - 50. */
export function truck(dir: number, cells: number): string {
    const len = cells * U, front = len - 50, back = -50;
    const body = `<ellipse cx="${(front + back) / 2}" cy="36" rx="${len / 2 - 6}" ry="6" fill="#00000022"/><rect x="${back + 6}" y="-36" width="${len - 70}" height="58" rx="6" fill="${PAINT.camion}" stroke="${INK}" stroke-width="4"/><path d="M${back + 20} -18H${front - 80}" stroke="#ffc98a" stroke-width="8" stroke-linecap="round"/>`
        + `<path d="M${front - 60} 22V-22Q${front - 60} -26 ${front - 54} -26H${front - 24}L${front - 6} -2V22Z" fill="#2f86e0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M${front - 52} -18H${front - 28}L${front - 16} -2H${front - 52}Z" fill="#cfeaff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
        + [back + 26, back + 60, front - 34].map(x => `<circle cx="${x}" cy="26" r="11" fill="#3d3a44" stroke="${INK}" stroke-width="3"/><circle cx="${x}" cy="26" r="4" fill="#ccc"/>`).join('');
    // The truck turns around its own middle, so that it keeps its cells whichever way it goes.
    return dir < 0 ? `<g transform="translate(${front + back} 0) scale(-1 1)">${body}</g>` : body;
}
/** A slow green tractor with a big back wheel. */
export function tractor(dir: number): string {
    return `<g transform="scale(${dir < 0 ? -1 : 1} 1)"><ellipse cy="38" rx="40" ry="6" fill="#00000022"/><path d="M-30 14V-10H-4V-36H22V-10H38V14Z" fill="${PAINT.tracteur}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="0" y="-30" width="16" height="16" fill="#cfeaff" stroke="${INK}" stroke-width="3"/><path d="M30 -10V-28" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`
        + `<circle cx="-18" cy="16" r="22" fill="#3d3a44" stroke="${INK}" stroke-width="4"/><circle cx="-18" cy="16" r="9" fill="#f5c518" stroke="${INK}" stroke-width="2"/><circle cx="28" cy="26" r="12" fill="#3d3a44" stroke="${INK}" stroke-width="3"/><circle cx="28" cy="26" r="5" fill="#f5c518"/></g>`;
}
/** A duck waddling along, facing `dir`. */
export function duck(dir: number): string {
    return `<g transform="scale(${dir < 0 ? -1 : 1} 1)"><ellipse cy="34" rx="28" ry="5" fill="#00000022"/><path d="M-6 26V34M8 26V34" stroke="#f08a1c" stroke-width="5" stroke-linecap="round"/><path d="M-32 0Q-30 26 2 28Q30 28 28 6Q20 -2 6 4Q-14 6 -32 0Z" fill="${PAINT.canard}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`
        + `<circle cx="16" cy="-16" r="15" fill="${PAINT.canard}" stroke="${INK}" stroke-width="3.5"/><path d="M28 -16L44 -12L28 -6Z" fill="#f08a1c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="-20" r="3.5" fill="${INK}"/><path d="M-14 6Q-4 14 8 8" fill="none" stroke="#b88c00" stroke-width="3" stroke-linecap="round"/></g>`;
}
/** A log `cells` long, drawn from x = -50 to x = cells * 100 - 50. */
export function log(cells: number): string {
    const len = cells * U - 8, x = -46;
    return `<rect x="${x}" y="-24" width="${len}" height="48" rx="24" fill="${PAINT.rondin}" stroke="${INK}" stroke-width="4"/><path d="M${x + 26} -8H${x + len - 40}M${x + 50} 8H${x + len - 26}" stroke="#7a4a24" stroke-width="4" stroke-linecap="round"/><ellipse cx="${x + len - 14}" cy="0" rx="10" ry="20" fill="#e3b47c" stroke="${INK}" stroke-width="3"/><ellipse cx="${x + len - 14}" cy="0" rx="4" ry="9" fill="none" stroke="#a86b3c" stroke-width="2"/>`;
}
/** A water lily: its pad, a flower, and the bubbles of a lily under water. */
export function lily(): string {
    return `<g class="traverse-pad"><path d="M0 0L34 -10A36 30 0 1 1 30 -18Z" fill="#5fbf6a" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M0 0L-24 -14M0 0L-20 16M0 0L14 22" stroke="#3f8f47" stroke-width="2.5"/><g transform="translate(-8 -2)"><path d="M0 -14L5 -3L16 -4L7 4L10 14L0 8L-10 14L-7 4L-16 -4L-5 -3Z" fill="#ffd6e7" stroke="${INK}" stroke-width="2"/><circle r="3.5" fill="#ffe381"/></g></g>`
        + `<g class="traverse-bubbles"><ellipse rx="30" ry="22" fill="none" stroke="#e9f7ff" stroke-width="3" stroke-dasharray="8 7"/><circle cx="-10" cy="-4" r="4" fill="none" stroke="#fff" stroke-width="2"/><circle cx="8" cy="6" r="3" fill="none" stroke="#fff" stroke-width="2"/></g>`;
}
/** The train: a purple engine and two carriages, filling the rail lane. Drawn from x = 0 to x = cells * 100. */
export function train(cells: number): string {
    const car = (x: number, w: number): string => `<rect x="${x}" y="-34" width="${w}" height="56" rx="8" fill="#b39beb" stroke="${INK}" stroke-width="4"/>${Array.from({ length: Math.floor(w / 46) }, (_, i) => `<rect x="${x + 12 + i * 46}" y="-24" width="30" height="22" rx="4" fill="#cfeaff" stroke="${INK}" stroke-width="3"/>`).join('')}<circle cx="${x + 22}" cy="26" r="10" fill="#3d3a44" stroke="${INK}" stroke-width="3"/><circle cx="${x + w - 22}" cy="26" r="10" fill="#3d3a44" stroke="${INK}" stroke-width="3"/>`;
    const len = cells * U, engine = 150;
    let out = '', x = 10;
    while (x + 150 < len - engine) { out += car(x, 140); x += 150; }
    const e = len - engine - 6;
    return out + `<path d="M${e} 22V-30H${e + 70}V-46H${e + 96}V-30H${e + 120}Q${e + 146} -30 ${e + 146} 0V22Z" fill="${PAINT.train}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="${e + 14}" y="-22" width="34" height="24" rx="4" fill="#cfeaff" stroke="${INK}" stroke-width="3"/><circle cx="${e + 136}" cy="-6" r="6" fill="#fff59e" stroke="${INK}" stroke-width="2"/>`
        + [e + 30, e + 74, e + 118].map(c => `<circle cx="${c}" cy="26" r="11" fill="#3d3a44" stroke="${INK}" stroke-width="3"/>`).join('') + `<g class="traverse-smoke"><circle cx="${e + 83}" cy="-60" r="9" fill="#fff" opacity=".85"/><circle cx="${e + 70}" cy="-74" r="12" fill="#fff" opacity=".7"/></g>`;
}
/** The level crossing: two red and white bars along both edges of the rail lane, lamps at the left. Down, they stop the
 * little one from stepping on the rails; up, they fold away to the left. `w` is the board width, `h` the lane height. */
export function crossing(w: number, h: number): string {
    const bar = (y: number): string => `<g class="traverse-bar" transform="translate(16 ${y})"><g class="traverse-arm"><rect x="0" y="-7" width="${w - 32}" height="14" rx="7" fill="#fff" stroke="${INK}" stroke-width="3"/>${Array.from({ length: Math.floor((w - 40) / 52) }, (_, i) => `<rect x="${12 + i * 52}" y="-7" width="24" height="14" fill="#e2384f"/>`).join('')}</g><circle r="10" fill="#7a7f8c" stroke="${INK}" stroke-width="3"/></g>`;
    return `${bar(-h / 2 + 12)}${bar(h / 2 - 12)}<g transform="translate(${w - 34} ${-h / 2 + 30})"><g class="traverse-lamps"><rect x="-24" y="-14" width="48" height="28" rx="12" fill="#3d3a44" stroke="${INK}" stroke-width="3"/><circle cx="-11" r="8" fill="#ff3b4e"/><circle cx="11" r="8" fill="#ff3b4e"/></g></g>`;
}
/** A big arrow in a neighbouring cell, pointing where the little one would go. */
export function arrow(rotation: number): string {
    return `<g transform="rotate(${rotation})"><path d="M-26 12H4V30L36 0L4 -30V-12H-26Z" fill="#ffffffcc" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>`;
}
/** A speech bubble with a sound word (Tut tut, Pouet…), above a cell. */
export const bubbleWidth = (word: string): number => Math.max(90, word.length * 19 + 30);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="traverse-bubble"><path d="M${-w / 2} -90H${w / 2}Q${w / 2 + 10} -90 ${w / 2 + 10} -78V-46Q${w / 2 + 10} -34 ${w / 2} -34H12L0 -20L-6 -34H${-w / 2}Q${-w / 2 - 10} -34 ${-w / 2 - 10} -46V-78Q${-w / 2 - 10} -90 ${-w / 2} -90Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="0" y="-50" text-anchor="middle" font-size="34" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
/** A splash on the water. */
export function splash(): string {
    return `<g class="traverse-splash"><ellipse rx="40" ry="14" fill="none" stroke="#fff" stroke-width="5"/><path d="M-20 -6L-30 -34M0 -10V-44M20 -6L30 -34" stroke="#cfeaff" stroke-width="7" stroke-linecap="round"/></g>`;
}
/** Each funny try has its own animation of the little one, named after its CSS keyframes in style.css. */
export const failAnimations: Readonly<Record<Fail, string>> = { voiture: 'traverse-recule', camion: 'traverse-pouet', tracteur: 'traverse-pousse', canard: 'traverse-bouscule', train: 'traverse-siffle', plouf: 'traverse-plouf', nenuphar: 'traverse-coule', bord: 'traverse-hop' };
/** The sound word of each funny try, in its bubble. */
export const failWords: Readonly<Record<'fr' | 'en', Record<Fail, string>>> = {
    fr: { voiture: 'Tut tut !', camion: 'Pouet !', tracteur: 'Teuf teuf', canard: 'Coin coin !', train: 'Tchou !', plouf: 'Plouf !', nenuphar: 'Glouglou', bord: 'Hop !' },
    en: { voiture: 'Beep beep!', camion: 'Honk!', tracteur: 'Putt putt', canard: 'Quack!', train: 'Choo!', plouf: 'Splash!', nenuphar: 'Glug glug', bord: 'Hop!' }
};
/** Small chevrons at both ends of a moving lane: which way it goes. */
export function chevrons(w: number, h: number, dir: number): string {
    const one = (x: number): string => `<path transform="translate(${x} ${h - 16}) scale(${dir} 1)" d="M-14 -8L-4 0L-14 8M0 -8L10 0L0 8" fill="none" stroke="#ffffffb0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    return one(26) + one(w - 26);
}
/** The lanes, each with its ground drawn over the whole width `w` (in units) and height `h`. */
export function ground(kind: 'herbe' | 'route' | 'pre' | 'riviere' | 'rail', w: number, h: number, shade: number): string {
    switch (kind) {
        case 'herbe': return `<rect width="${w}" height="${h}" fill="${shade % 2 ? '#b5e08f' : '#abd985'}"/>${Array.from({ length: Math.floor(w / 100) }, (_, i) => `<path d="M${i * 100 + 20 + (shade * 37) % 50} ${h - 14}l4 -10l4 10" fill="none" stroke="#7cb85f" stroke-width="3" stroke-linecap="round"/>`).join('')}`;
        case 'route': return `<rect width="${w}" height="${h}" fill="#80828f"/><rect width="${w}" height="6" fill="#d9d4cc"/><rect y="${h - 6}" width="${w}" height="6" fill="#d9d4cc"/><path d="M10 ${h / 2}H${w}" stroke="#ffffffaa" stroke-width="5" stroke-dasharray="36 28"/>`;
        case 'pre': return `<rect width="${w}" height="${h}" fill="#cbeaa2"/>${Array.from({ length: Math.floor(w / 100) }, (_, i) => `<circle cx="${i * 100 + 70}" cy="${h - 16}" r="5" fill="${['#ffd6e7', '#fff', '#ffe381'][i % 3]}" stroke="#d9a3b8" stroke-width="1.5"/>`).join('')}`;
        case 'riviere': return `<rect width="${w}" height="${h}" fill="#76c3ee"/>${Array.from({ length: Math.floor(w / 100) }, (_, i) => `<path d="M${i * 100 + 10} ${h * .3}q12 -8 24 0t24 0M${i * 100 + 50} ${h * .78}q12 -8 24 0" fill="none" stroke="#b5e3fb" stroke-width="3" stroke-linecap="round"/>`).join('')}`;
        case 'rail': return `<rect width="${w}" height="${h}" fill="#d6c4a6"/>${Array.from({ length: Math.ceil(w / 34) }, (_, i) => `<rect x="${i * 34 + 6}" y="${h / 2 - 26}" width="14" height="52" fill="#8a5a2e"/>`).join('')}<path d="M0 ${h / 2 - 16}H${w}M0 ${h / 2 + 16}H${w}" stroke="#6b6f7a" stroke-width="6"/>`;
    }
}
