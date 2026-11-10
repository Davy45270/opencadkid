import type { ColorId, Friend, Miss, Tile } from '../../engines/bonbons';
/** Drawings of « Les bonbons de Lumi », in the ink and rounded strokes of the guides (src/characters). A cell is 40 units;
 * every drawing is centred on (0, 0) and stays within 17 units. */
export const CELL = 40;
export const INK = '#583746';
/** Each colour is also its own sweet shape, so that no line depends on colour alone. Close colours never share a scene. */
export const PAINT: Readonly<Record<ColorId, { fill: string; light: string; dark: string; shape: 'coeur' | 'losange' | 'etoile' | 'carre' | 'rond' | 'berlingot' }>> = {
    rouge: { fill: '#e2384f', light: '#ff9aa8', dark: '#a8213a', shape: 'coeur' },
    orange: { fill: '#f08a1c', light: '#ffc98a', dark: '#b65e05', shape: 'losange' },
    jaune: { fill: '#f5c518', light: '#fff1a6', dark: '#b88c00', shape: 'etoile' },
    vert: { fill: '#3fae55', light: '#a8eab2', dark: '#237a37', shape: 'carre' },
    bleu: { fill: '#2f86e0', light: '#a9d3ff', dark: '#1a5ca8', shape: 'rond' },
    violet: { fill: '#9457d6', light: '#d6bdf6', dark: '#6534a3', shape: 'berlingot' }
};
const RAINBOW = ['#e2384f', '#f08a1c', '#f5c518', '#3fae55', '#2f86e0', '#9457d6'];
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
const star = (r1: number, r2: number): string => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r2 : r1; return `${i ? 'L' : 'M'}${n(Math.cos(a) * r)} ${n(Math.sin(a) * r)}`; }).join('') + 'Z';
/** The outline of each sweet shape. */
export const OUTLINE: Readonly<Record<string, string>> = {
    coeur: 'M0 14C-17 3 -15 -12 -7 -12C-3.5 -12 -1 -9.5 0 -7C1 -9.5 3.5 -12 7 -12C15 -12 17 3 0 14Z',
    losange: 'M0 -16L13 0L0 16L-13 0Z',
    etoile: star(16, 7.6),
    carre: 'M-11 -13H11Q13 -13 13 -11V11Q13 13 11 13H-11Q-13 13 -13 11V-11Q-13 -13 -11 -13Z',
    rond: 'M0 -14A14 14 0 1 1 0 14A14 14 0 1 1 0 -14Z',
    berlingot: 'M0 -15Q2 -15 3 -13L15 9Q16 12 13 12H-13Q-16 12 -15 9L-3 -13Q-2 -15 0 -15Z'
};
/** Shared gradients, defined once in the board. */
export function defs(): string {
    return `<defs>${Object.entries(PAINT).map(([c, p]) => `<radialGradient id="bonbons-${c}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${p.light}"/><stop offset=".55" stop-color="${p.fill}"/><stop offset="1" stop-color="${p.dark}"/></radialGradient>`).join('')}`
        + `<linearGradient id="bonbons-sugar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3eef5"/></linearGradient>`
        + `<linearGradient id="bonbons-choco" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5532"/><stop offset="1" stop-color="#5d361d"/></linearGradient></defs>`;
}
/** A sweet of a colour: its own shape, a glossy fill, a little pattern and a shine. */
export function sweet(color: ColorId): string {
    const p = PAINT[color], d = OUTLINE[p.shape]!;
    const pattern: Record<string, string> = {
        coeur: '<path d="M-6 2Q0 7 6 2" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>',
        losange: '<path d="M0 -9L7 0L0 9L-7 0Z" fill="none" stroke="#ffffff" stroke-width="1.4" opacity=".55"/>',
        etoile: '<circle r="3" fill="#ffffff" opacity=".45"/>',
        carre: '<path d="M-6 -6H6M-6 0H6M-6 6H6" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>',
        rond: '<path d="M0 -7A7 7 0 1 1 -7 0A4 4 0 1 1 1 0" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>',
        berlingot: '<path d="M-5 -2L5 -2M-8 4L8 4" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>'
    };
    return `<path d="${d}" fill="url(#bonbons-${color})" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>${pattern[p.shape]}<ellipse cx="-5" cy="-6" rx="3.6" ry="2" fill="#ffffff" opacity=".8" transform="rotate(-30 -5 -6)"/>`;
}
/** A wrapped sweet: the same shape, smaller, in a twisted paper of its colour. */
export function wrapped(color: ColorId): string {
    const p = PAINT[color];
    const twist = (s: number): string => `<path d="M${s * 9} -4L${s * 18} -10Q${s * 15} 0 ${s * 18} 10L${s * 9} 4Z" fill="${p.light}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${s * 11} -2L${s * 15} -5M${s * 11} 2L${s * 15} 5" stroke="${p.dark}" stroke-width="1"/>`;
    return `<g data-paper>${twist(-1)}${twist(1)}</g><g transform="scale(.74)">${sweet(color)}</g><path d="M-9 -3Q0 1 9 -3" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
}
/** The rainbow sweet: a round lollipop of every colour with a white star. */
export function rainbow(): string {
    return `<circle r="15" fill="#ffffff" stroke="${INK}" stroke-width="1.8"/>${RAINBOW.map((c, i) => `<circle r="${n(13 - i * 2)}" fill="none" stroke="${c}" stroke-width="2"/>`).join('')}<path d="${star(4.6, 2)}" fill="#ffffff" stroke="${INK}" stroke-width=".9"/><ellipse cx="-6" cy="-7" rx="3.6" ry="2" fill="#ffffff" opacity=".8" transform="rotate(-30 -6 -7)"/>`;
}
/** A sugar cube: whole with two layers, cracked with one. */
export function sugar(layers: number): string {
    const crack = layers < 2 ? `<path d="M-9 -12L-3 -3L-7 4M-3 -3L5 -1L9 8M5 -1L8 -9" fill="none" stroke="#8fb4c9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    return `<path d="M-15 -9L0 -16L15 -9V10L0 17L-15 10Z" fill="url(#bonbons-sugar)" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-15 -9L0 -2L15 -9M0 -2V17" fill="none" stroke="#a9c3d3" stroke-width="1.4"/>`
        + `<g fill="#ffffff" stroke="#c9dbe6" stroke-width=".6"><circle cx="-8" cy="4" r="1.2"/><circle cx="7" cy="6" r="1.2"/><circle cx="-3" cy="-9" r="1"/><circle cx="5" cy="-10" r="1"/></g>${crack}`;
}
/** A square of chocolate. */
export function chocolate(): string {
    return `<rect x="-17" y="-17" width="34" height="34" rx="6" fill="url(#bonbons-choco)" stroke="${INK}" stroke-width="1.8"/><path d="M-17 0H17M0 -17V17" stroke="#4a2a15" stroke-width="2"/><path d="M-13 -13H-4M4 -13H13M-13 4H-4M4 4H13" stroke="#a97048" stroke-width="1.6" stroke-linecap="round"/>`;
}
const eyes = (y = -1, gap = 4.2): string => `<circle cx="${-gap}" cy="${y}" r="1.7" fill="${INK}"/><circle cx="${gap}" cy="${y}" r="1.7" fill="${INK}"/><circle cx="${-gap + 0.6}" cy="${y - 0.6}" r=".55" fill="#ffffff"/><circle cx="${gap + 0.6}" cy="${y - 0.6}" r=".55" fill="#ffffff"/>`;
/** A friend to bring down: a cherry pair or a gummy bear, both smiling. */
export function friend(kind: Friend): string {
    if (kind === 'cerise') return `<path d="M-6 0Q-4 -12 4 -16M6 2Q4 -10 4 -16" fill="none" stroke="#3f8f47" stroke-width="2" stroke-linecap="round"/><path d="M4 -16Q12 -18 13 -12Q8 -11 4 -16Z" fill="#7cc46c" stroke="${INK}" stroke-width="1"/>`
        + `<circle cx="-7" cy="6" r="9" fill="#d81f3f" stroke="${INK}" stroke-width="1.8"/><circle cx="7" cy="7" r="8" fill="#e8344f" stroke="${INK}" stroke-width="1.8"/><ellipse cx="-10" cy="3" rx="2.4" ry="1.4" fill="#ffffff" opacity=".8"/>`
        + `<g transform="translate(-7 6)">${eyes(-1, 3)}<path d="M-2.4 2.6Q0 4.6 2.4 2.6" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/></g>`;
    return `<g fill="#ffb347" stroke="${INK}" stroke-width="1.6"><circle cx="-9" cy="-12" r="4.4"/><circle cx="9" cy="-12" r="4.4"/><ellipse cy="9" rx="11" ry="9"/><circle cy="-4" r="10"/><ellipse cx="-11" cy="5" rx="3.4" ry="4.6"/><ellipse cx="11" cy="5" rx="3.4" ry="4.6"/></g>`
        + `<ellipse cy="10" rx="6" ry="4.6" fill="#ffd9a0"/><ellipse cx="-6" cy="-9" rx="2.6" ry="1.4" fill="#ffffff" opacity=".75"/>${eyes(-5, 3.6)}<ellipse cy="-1" rx="2" ry="1.4" fill="${INK}"/><path d="M-2.6 1.6Q0 3.6 2.6 1.6" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`;
}
export function tileSvg(t: Tile): string {
    if (t.kind === 'arc') return rainbow();
    if (t.kind === 'sucre') return sugar(t.layers ?? 2);
    if (t.kind === 'choco') return chocolate();
    if (t.kind === 'ami') return friend(t.friend ?? 'cerise');
    return t.wrapped ? wrapped(t.color!) : sweet(t.color!);
}
/** A face drawn on a sweet for each funny try. */
export function missFace(miss: Miss): string {
    const mouth = (d: string): string => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`;
    const faces: Record<Miss, string> = {
        cogne: `<path d="M-6 -3l3 2m0 -2l-3 2M3 -3l3 2m0 -2l-3 2" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>${mouth('M-3 5Q0 3 3 5')}<path d="M-2 -17l2 -5l2 5M8 -14l5 -3" stroke="#f5b400" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
        saute: `${eyes(-2)}<ellipse cy="4" rx="2.2" ry="2.8" fill="${INK}"/>`,
        rougit: `${eyes(-2)}${mouth('M-3 3Q0 6 3 3')}<ellipse cx="-8" cy="3" rx="3.2" ry="2" fill="#ff7b95" opacity=".85"/><ellipse cx="8" cy="3" rx="3.2" ry="2" fill="#ff7b95" opacity=".85"/><path d="M0 -14C-3 -18 -6 -15 0 -10C6 -15 3 -18 0 -14Z" fill="#ff7b95" stroke="${INK}" stroke-width=".8"/>`,
        chatouille: `<path d="M-6 -2Q-4 -5 -2 -2M2 -2Q4 -5 6 -2" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/><path d="M-4 2Q0 8 4 2Z" fill="${INK}"/>`,
        froisse: `<path d="M-6 -2h4M2 -2h4" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>${mouth('M-3 4Q-1.5 2 0 4Q1.5 6 3 4')}`,
        lourd: `${eyes(-2)}${mouth('M-4 5Q0 2 4 5')}<path d="M10 -10q2 3 0 5q-2 -2 0 -5Z" fill="#9fd3ff" stroke="${INK}" stroke-width=".7"/>`,
        colle: `<path d="M-6 -1l3 -2M6 -1l-3 -2" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/><ellipse cy="4" rx="3" ry="1.6" fill="${INK}"/><path d="M-12 12q2 5 4 0M8 12q2 6 4 0" fill="#6b3f22" stroke="${INK}" stroke-width=".7"/>`
    };
    return `<g data-miss-face>${faces[miss]}</g>`;
}
/** Each funny try has its own animation, named after its CSS keyframes in style.css. */
export const missAnimations: Readonly<Record<Miss, string>> = { cogne: 'bonbons-cogne', saute: 'bonbons-saute', rougit: 'bonbons-rougit', chatouille: 'bonbons-chatouille', froisse: 'bonbons-froisse', lourd: 'bonbons-lourd', colle: 'bonbons-colle' };
/** Lumi’s jar, filled up to `fill` (0 to 1) with the colours that went in. */
export function jar(fill: number, color: ColorId | null): string {
    const h = Math.max(0, Math.min(1, fill)) * 34, top = 50 - h, paint = color ? PAINT[color].fill : '#ffb347';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 56" aria-hidden="true"><clipPath id="bonbons-jar-${color ?? 'x'}"><path d="M10 16H38V46Q38 52 32 52H16Q10 52 10 46Z"/></clipPath>`
        + `<path d="M10 16H38V46Q38 52 32 52H16Q10 52 10 46Z" fill="#eaf6ff" opacity=".9"/><rect clip-path="url(#bonbons-jar-${color ?? 'x'})" x="10" y="${n(top)}" width="28" height="${n(h + 4)}" fill="${paint}" opacity=".85"/>`
        + `<path d="M10 16H38V46Q38 52 32 52H16Q10 52 10 46Z" fill="none" stroke="${INK}" stroke-width="2"/><rect x="8" y="8" width="32" height="8" rx="3" fill="#f5a3c7" stroke="${INK}" stroke-width="2"/><path d="M14 22V40" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></svg>`;
}
/** A small picture of a goal for the goal strip: the sweet, the friend, the cube or the chocolate. */
export function goalIcon(inner: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 40 40" aria-hidden="true">${defs()}${inner}</svg>`;
}
