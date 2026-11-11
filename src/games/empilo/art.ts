import type { Funny, PieceKind, SilhouetteName } from '../../engines/empilo';
/** Drawings of « Les cubes de Lumi », in the ink and rounded strokes of the guides (src/characters). A cell is 100 units wide;
 * every cube is drawn centred on (0, 0), the middle of its cell. Each colour carries its own shape drawn on it, so that two
 * pieces never differ by colour alone. */
export const U = 100;
export const INK = '#4a3a3f';
const STAR = 'M0 -26L7.6 -9.4L25.7 -8L12 3.8L16 21.5L0 12.2L-16 21.5L-12 3.8L-25.7 -8L-7.6 -9.4Z';
const eyes = (y: number, gap: number, r = 5): string => `<circle cx="${-gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${-gap + 2}" cy="${y - 2}" r="1.8" fill="#fff"/><circle cx="${gap + 2}" cy="${y - 2}" r="1.8" fill="#fff"/>`;
export const RAINBOW = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc'];

/** The colour of each piece, the shape drawn on it, and its name (said by the board's label). */
export const COLOURS: Readonly<Record<string, string>> = { u: '#ffd23f', d: '#5aa9f0', t: '#5cbf6a', c: '#ff8fc0', k: '#b48be8', T: '#ff9b4a', L: '#3fc7bd' };
const SYMBOL: Readonly<Record<string, string>> = {
    // A star, a round, a triangle, a heart, a diamond, a flower, a moon.
    u: `<path transform="scale(1.05)" d="${STAR}" fill="#fff8d6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
    d: `<circle r="20" fill="#e3f2ff" stroke="${INK}" stroke-width="4"/>`,
    t: `<path d="M0 -24L23 18H-23Z" fill="#e6f8e6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
    c: `<path d="M0 22C-30 2 -26 -24 -10 -24C-4 -24 0 -18 0 -14C0 -18 4 -24 10 -24C26 -24 30 2 0 22Z" fill="#fff0f6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
    k: `<path d="M0 -26L22 0L0 26L-22 0Z" fill="#f3ebff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
    T: [0, 72, 144, 216, 288].map(r => `<ellipse transform="rotate(${r}) translate(0 -13)" rx="9" ry="12" fill="#fff1e3" stroke="${INK}" stroke-width="3"/>`).join('') + `<circle r="8" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>`,
    L: `<path d="M8 -24A24 24 0 1 0 8 24A18 18 0 1 1 8 -24Z" fill="#e0fbf8" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
};
const box = (fill: string, inner: string): string => `<rect x="-46" y="-46" width="92" height="92" rx="16" fill="${fill}" stroke="${INK}" stroke-width="5"/><path d="M-36 -30Q-36 -36 -30 -36H20" fill="none" stroke="#ffffff99" stroke-width="7" stroke-linecap="round"/>${inner}`;
/** A rainbow cube: stripes of the six colours. */
export function rainbowCube(): string {
    const stripes = RAINBOW.map((c, i) => `<rect x="-38" y="${-38 + i * 76 / 6}" width="76" height="${76 / 6 + .5}" fill="${c}"/>`).join('');
    return `<rect x="-46" y="-46" width="92" height="92" rx="16" fill="#fff" stroke="${INK}" stroke-width="5"/>${stripes}`
        + `<g transform="translate(22 -22) scale(.5)"><path class="empilo-scintille" d="${STAR}" fill="#fff" stroke="${INK}" stroke-width="5"/></g>`;
}
/** The candy cube: a wrapped sweet, pink and white, on a white cube. */
export function candyCube(): string {
    return `<rect x="-46" y="-46" width="92" height="92" rx="16" fill="#fff6fb" stroke="${INK}" stroke-width="5"/><path d="M-22 0L-42 -16V16Z M22 0L42 -16V16Z" fill="#ff8fc0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
        + `<circle r="22" fill="#ff5fa2" stroke="${INK}" stroke-width="4"/><path d="M-14 -14Q0 -4 -4 16M2 -20Q14 -6 10 16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
}
/** A stone cube: grey, rough, with cracks. */
export const stone = (): string => `<rect x="-46" y="-46" width="92" height="92" rx="10" fill="#9aa1a8" stroke="${INK}" stroke-width="5"/><path d="M-30 -20L-12 -8L-18 10M14 -34L6 -14L22 -2M10 18L26 30" fill="none" stroke="#5f666d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="-26" cy="26" r="5" fill="#7d848b"/>`;
/** The chick stuck under the cubes: a round yellow chick with its beak, in a little nest of straw. */
export function chick(): string {
    return `<rect x="-46" y="-46" width="92" height="92" rx="16" fill="#fff4cf" stroke="${INK}" stroke-width="4"/><path d="M-40 34Q0 22 40 34" fill="none" stroke="#d9a441" stroke-width="7" stroke-linecap="round"/>`
        + `<g class="empilo-poussin"><ellipse cy="8" rx="30" ry="28" fill="#ffd93b" stroke="${INK}" stroke-width="4"/><path d="M-30 4Q-42 -6 -34 -18M30 4Q42 -6 34 -18" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>${eyes(-2, 11, 5)}<path d="M-8 8L0 18L8 8Z" fill="#ff9a3c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-4 -22Q0 -34 6 -24" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`;
}
/** A cube of a piece or a cell of the well, by its letter. */
export function cube(c: string): string {
    if (c === 'r' || c === 'a') return rainbowCube();
    if (c === 'b') return candyCube();
    if (c === 'p') return stone();
    if (c === 'A') return chick();
    return box(COLOURS[c] ?? '#ddd', SYMBOL[c] ?? '');
}
export const pieceCube = (kind: PieceKind): string => cube(kind);
/** The little cloud that floats on top of a column, with a sleepy smile; it sneezes when a piece lands on it. */
export function cloud(): string {
    return `<g class="empilo-nuage-corps"><path d="M-44 22Q-56 22 -54 6Q-52 -8 -36 -8Q-34 -32 -10 -32Q8 -40 20 -22Q44 -26 46 -4Q60 0 54 16Q50 26 40 24Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${eyes(-4, 13, 4)}<path d="M-6 8Q0 13 6 8" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="-24" cy="6" r="5" fill="#ff9fbf" opacity=".7"/><circle cx="24" cy="6" r="5" fill="#ff9fbf" opacity=".7"/></g>`;
}
/** The big wind cloud that blows the top row away, puffing from the side of the well. */
export function windCloud(): string {
    return `<g transform="scale(1.4)">${cloud()}</g><path d="M80 -10H150M86 12H170M80 34H140" stroke="#cfe8ff" stroke-width="8" stroke-linecap="round"/>`;
}
/** A butterfly, for the rows that fly away. */
export function butterfly(colour: string): string {
    return `<g transform="scale(1.5)"><g class="empilo-ailes"><path d="M0 -2Q-26 -34 -32 -14Q-34 4 -2 4Z" fill="${colour}" stroke="${INK}" stroke-width="3"/><path d="M0 -2Q26 -34 32 -14Q34 4 2 4Z" fill="${colour}" stroke="${INK}" stroke-width="3"/><path d="M-2 4Q-24 10 -22 24Q-10 28 -2 10Z" fill="${colour}" stroke="${INK}" stroke-width="3"/><path d="M2 4Q24 10 22 24Q10 28 2 10Z" fill="${colour}" stroke="${INK}" stroke-width="3"/></g><ellipse cy="4" rx="4" ry="15" fill="${INK}"/></g>`;
}
/** The pictures of the drawings, in a box of `w` by `h` cells; outlined only until the drawing is whole. */
export function picture(name: SilhouetteName, w: number, h: number): string {
    const W = w * U, H = h * U, s = Math.min(W, H) / 100, inner = PICTURES[name];
    return `<g transform="translate(${W / 2} ${H / 2}) scale(${s})">${inner}</g>`;
}
const PICTURES: Readonly<Record<SilhouetteName, string>> = {
    maison: `<path d="M-40 -6L0 -46L40 -6Z" fill="#e2655d" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="-32" y="-6" width="64" height="52" fill="#ffe3b3" stroke="${INK}" stroke-width="4"/><rect x="-8" y="16" width="18" height="30" rx="3" fill="#a8703f" stroke="${INK}" stroke-width="3"/><rect x="-26" y="4" width="14" height="14" fill="#9fd0ff" stroke="${INK}" stroke-width="3"/><rect x="16" y="4" width="14" height="14" fill="#9fd0ff" stroke="${INK}" stroke-width="3"/>`,
    bateau: `<path d="M2 -46V18" stroke="${INK}" stroke-width="5"/><path d="M6 -42L36 10H6Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-46 18H46L30 44H-30Z" fill="#e2655d" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="-14" cy="30" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="12" cy="30" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
    coeur: `<path d="M0 44C-60 4 -50 -44 -22 -44C-10 -44 0 -34 0 -24C0 -34 10 -44 22 -44C50 -44 60 4 0 44Z" fill="#ff6b8a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`,
    sapin: `<path d="M0 -44L-22 -12H-12L-34 16H-20L-44 34H44L20 16H34L12 -12H22Z" fill="#3f9a4f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="-8" y="34" width="16" height="14" fill="#a8703f" stroke="${INK}" stroke-width="3"/><path transform="translate(0 -44) scale(.5)" d="${STAR}" fill="#ffd23f" stroke="${INK}" stroke-width="5"/>`,
    fusee: `<path d="M0 -48Q22 -28 20 20H-20Q-22 -28 0 -48Z" fill="#f2f2f2" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cy="-10" r="10" fill="#9fd0ff" stroke="${INK}" stroke-width="3"/><path d="M-20 4L-34 34L-18 26ZM20 4L34 34L18 26Z" fill="#e2655d" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-10 22L0 44L10 22Z" fill="#ffa94d" stroke="${INK}" stroke-width="3"/>`,
    champignon: `<path d="M-46 4Q-46 -40 0 -40Q46 -40 46 4Z" fill="#e2384f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="-22" cy="-16" r="7" fill="#fff"/><circle cx="8" cy="-26" r="6" fill="#fff"/><circle cx="26" cy="-8" r="6" fill="#fff"/><rect x="-12" y="4" width="24" height="40" rx="8" fill="#fff3dc" stroke="${INK}" stroke-width="4"/>`,
    poisson: `<path d="M-46 0Q-20 -32 16 -12L40 -30V30L16 12Q-20 32 -46 0Z" fill="#ffa94d" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="-26" cy="-4" r="5" fill="${INK}"/><path d="M-6 -12Q0 0 -6 12" fill="none" stroke="${INK}" stroke-width="3"/>`,
    chateau: `<path d="M-46 -30H-34V-22H-26V-30H-14V44H-46Z M14 -30H26V-22H34V-30H46V44H14Z M-14 -8H14V44H-14Z" fill="#c9c3d6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-8 44V26Q0 16 8 26V44Z" fill="#a8703f" stroke="${INK}" stroke-width="3"/><path d="M-30 -30V-46L-18 -40L-30 -36" fill="#e2655d" stroke="${INK}" stroke-width="3"/>`,
    etoile: `<path transform="scale(1.8)" d="${STAR}" fill="#ffd23f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
    fleur: `<path d="M0 0V48" stroke="#3d8a4c" stroke-width="7" stroke-linecap="round"/><path d="M0 30Q16 18 24 28Q14 38 0 34" fill="#5cbf6a" stroke="${INK}" stroke-width="3"/>` + [0, 60, 120, 180, 240, 300].map(r => `<ellipse transform="translate(0 -18) rotate(${r}) translate(0 -16)" rx="11" ry="15" fill="#ff8fc0" stroke="${INK}" stroke-width="3"/>`).join('') + `<circle cy="-18" r="11" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>`
};
/** Two round arrows: the free swap button. */
export const swapIcon = `<path d="M10 22A20 20 0 0 1 46 16" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M50 4L50 20L35 18Z" fill="${INK}"/><path d="M54 42A20 20 0 0 1 18 48" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M14 60L14 44L29 46Z" fill="${INK}"/>`;
/** A round arrow: the turn button. */
export const turnIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><path d="M48 34A17 17 0 1 1 38 18" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M32 6L50 16L34 28Z" fill="#b48be8" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></svg>`;
/** A speech bubble with a sound word (Ouh ouh, Atchoum…), above a cell. */
export const bubbleWidth = (word: string): number => Math.max(90, word.length * 19 + 30);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="empilo-bubble"><path d="M${-w / 2} -96H${w / 2}Q${w / 2 + 10} -96 ${w / 2 + 10} -84V-52Q${w / 2 + 10} -40 ${w / 2} -40H12L0 -26L-6 -40H${-w / 2}Q${-w / 2 - 10} -40 ${-w / 2 - 10} -52V-84Q${-w / 2 - 10} -96 ${-w / 2} -96Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="0" y="-56" text-anchor="middle" font-size="34" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
const sparks = (fill: string): string => [[-34, -40], [0, -54], [34, -40]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.36)" d="${STAR}" fill="${fill}" stroke="${INK}" stroke-width="5"/>`).join('');
/** What flies around a funny try, drawn on the cell of the try. */
export const effects: Readonly<Record<Funny, string>> = {
    trou: `<g class="empilo-eclat"><circle r="30" fill="none" stroke="#fff" stroke-width="5"/><circle r="44" fill="none" stroke="#ffffff99" stroke-width="4"/></g>`,
    mur: `<g class="empilo-eclat"><path d="M-30 -30L-20 -20M30 -30L20 -20M0 -44V-30" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></g>`,
    deborde: `<g class="empilo-eclat"><path d="M-20 -20Q0 -60 20 -20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-dasharray="6 10"/></g>`,
    nuage: `<g class="empilo-eclat"><path d="M-30 -10q-4 7 0 9q4 -2 0 -9ZM24 -18q-4 7 0 9q4 -2 0 -9ZM0 -34q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/></g>`,
    tournis: `<g class="empilo-eclat">${sparks('#ffd23f')}</g>`,
    arc: `<g class="empilo-eclat">${sparks('#e9d6ff')}</g>`,
    bonbon: `<g class="empilo-eclat"><path d="M-12 -46c-8 -10 -20 0 -12 8l12 12 12 -12c8 -8 -4 -18 -12 -8z" fill="#ff8fc0" stroke="${INK}" stroke-width="3"/></g>`
};
/** Each funny try has its own animation of the piece, named after its CSS keyframes in style.css. */
export const failAnimations: Readonly<Record<Funny, string>> = {
    trou: 'empilo-tasse', mur: 'empilo-bonk', deborde: 'empilo-rebond', nuage: 'empilo-souffle', tournis: 'empilo-tournis', arc: 'empilo-cherche', bonbon: 'empilo-leche'
};
/** What the thing of the try does: the hole echoes, the wall shakes, the column wobbles, the cloud sneezes, the turn button
 * spins, the flat column shrugs, the stone column will not move. */
export const thingAnimations: Readonly<Record<Funny, string>> = {
    trou: 'empilo-echo', mur: 'empilo-secoue', deborde: 'empilo-vacille', nuage: 'empilo-atchoum', tournis: 'empilo-vertige', arc: 'empilo-vacille', bonbon: 'empilo-secoue'
};
/** The sound word of each funny try, in its bubble. */
export const failWords: Readonly<Record<'fr' | 'en', Record<Funny, string>>> = {
    fr: { trou: 'Ouh ouh…', mur: 'Bonk !', deborde: 'Trop haut !', nuage: 'Atchoum !', tournis: 'Ça tourne !', arc: 'Pas de trou ?', bonbon: 'Rien à porter !' },
    en: { trou: 'Ooh ooh…', mur: 'Bonk!', deborde: 'Too high!', nuage: 'Atchoo!', tournis: 'So dizzy!', arc: 'No hole?', bonbon: 'Nothing to lift!' }
};
