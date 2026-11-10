import type { Ammo, Cell, ColorId, Friend, Miss } from '../../engines/bulles';
/** Drawings of « Les bulles de Boubou », in the ink and rounded strokes of the guides (src/characters). Board units: a bubble has a radius of 10. */
export const INK = '#583746';
/** Each colour also carries its own shape, so that no throw depends on colour alone. Close colours never share a scene. */
export const PAINT: Readonly<Record<ColorId, { fill: string; light: string; shape: 'coeur' | 'losange' | 'etoile' | 'carre' | 'rond' | 'triangle' }>> = {
    rouge: { fill: '#e2384f', light: '#ff9aa8', shape: 'coeur' },
    orange: { fill: '#f08a1c', light: '#ffc98a', shape: 'losange' },
    jaune: { fill: '#f5c518', light: '#fff1a6', shape: 'etoile' },
    vert: { fill: '#3fae55', light: '#a8eab2', shape: 'carre' },
    bleu: { fill: '#2f86e0', light: '#a9d3ff', shape: 'rond' },
    violet: { fill: '#9457d6', light: '#d6bdf6', shape: 'triangle' }
};
const RAINBOW = ['#e2384f', '#f08a1c', '#f5c518', '#3fae55', '#2f86e0', '#9457d6'];
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
/** The shape of a colour, centred on (0, 0), about 9 units across. */
export function shape(color: ColorId): string {
    const s = (d: string): string => `<path d="${d}" fill="#ffffff" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
    switch (PAINT[color].shape) {
        case 'coeur': return s('M0 4.6C-6 0.4 -5.2 -4.6 -2.4 -4.6C-1.2 -4.6 -0.3 -3.8 0 -2.8C0.3 -3.8 1.2 -4.6 2.4 -4.6C5.2 -4.6 6 0.4 0 4.6Z');
        case 'losange': return s('M0 -5.2L4.2 0L0 5.2L-4.2 0Z');
        case 'etoile': return s(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.3 : 5.3; return `${i ? 'L' : 'M'}${n(Math.cos(a) * r)} ${n(Math.sin(a) * r)}`; }).join('') + 'Z');
        case 'carre': return s('M-3.8 -3.8H3.8V3.8H-3.8Z');
        case 'rond': return `<circle r="4.2" fill="#ffffff" stroke="${INK}" stroke-width="1"/>`;
        case 'triangle': return s('M0 -5L4.6 3.8H-4.6Z');
    }
}
/** Shared gradients: one per colour, defined once in the board. */
export function defs(): string {
    return `<defs>${Object.entries(PAINT).map(([c, p]) => `<radialGradient id="bulles-${c}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${p.light}"/><stop offset=".6" stop-color="${p.fill}"/><stop offset="1" stop-color="${p.fill}"/></radialGradient>`).join('')}`
        + `<radialGradient id="bulles-glass" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e9f6ff"/><stop offset="1" stop-color="#bfe3f7"/></radialGradient></defs>`;
}
const shine = '<ellipse cx="-3.6" cy="-4" rx="2.6" ry="1.6" fill="#ffffff" opacity=".75" transform="rotate(-30 -3.6 -4)"/>';
/** A bubble of a colour, with its shape; `face` replaces the shape for the moment of a funny try. */
export function bubble(color: ColorId, face = ''): string {
    return `<circle r="9.4" fill="url(#bulles-${color})" stroke="${INK}" stroke-width="1.2"/>${face || shape(color)}${shine}`;
}
/** The rainbow bubble: rings of every colour around a white star. */
export function rainbow(): string {
    return `<circle r="9.4" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>${RAINBOW.map((c, i) => `<circle r="${n(8.2 - i * 1.2)}" fill="none" stroke="${c}" stroke-width="1.25"/>`).join('')}<path d="M0 -2.6L.8 -.8L2.6 -.6L1.2 .6L1.6 2.4L0 1.4L-1.6 2.4L-1.2 .6L-2.6 -.6L-.8 -.8Z" fill="#ffffff" stroke="${INK}" stroke-width=".6"/>${shine}`;
}
export const ammo = (a: Ammo): string => a === 'arc' ? rainbow() : bubble(a);
/** Ice cube over a bubble: whole at two, cracked at one. */
export function ice(level: number): string {
    const crack = level < 2 ? `<path d="M-6 -7L-1 -1L-4 3M-1 -1L5 1L7 6M5 1L6 -5" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>` : '';
    return `<rect x="-10" y="-10" width="20" height="20" rx="5" fill="#e4f6ff" fill-opacity=".38" stroke="#5aa6cf" stroke-width="1.4"/><path d="M-7 -6.5H-1" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>${crack}`;
}
/** A sleepy cloud, the size of a bubble. */
export function cloud(): string {
    return `<path d="M-9 4C-12 4 -12 -2 -8 -2C-9 -7 -2 -9 0 -5C2 -10 10 -8 8 -2C12 -2 12 4 8 4Z" fill="#ffffff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M-4 0Q-2.6 1.2 -1.2 0M1.2 0Q2.6 1.2 4 0" fill="none" stroke="${INK}" stroke-width=".9" stroke-linecap="round"/>`;
}
/** A friend stuck in a glass bubble. */
export function friend(kind: Friend): string {
    const body: Record<Friend, string> = {
        poussin: `<circle cy="1" r="5.6" fill="#ffe066" stroke="${INK}" stroke-width=".9"/><path d="M4.6 .4L7.4 1.4L4.6 2.4Z" fill="#f08a1c" stroke="${INK}" stroke-width=".6"/><circle cx="2.4" cy="-.6" r=".9" fill="${INK}"/><path d="M-1 -4.4Q0 -6.6 1 -4.4" fill="none" stroke="${INK}" stroke-width=".8"/>`,
        coccinelle: `<ellipse cy="1" rx="5.6" ry="5" fill="#e2384f" stroke="${INK}" stroke-width=".9"/><path d="M0 -4V6" stroke="${INK}" stroke-width=".8"/><circle cx="-2.6" cy="0" r="1.1" fill="${INK}"/><circle cx="2.6" cy="2" r="1.1" fill="${INK}"/><circle cy="-4.4" r="2.6" fill="${INK}"/><circle cx="-.9" cy="-4.8" r=".6" fill="#ffffff"/><circle cx=".9" cy="-4.8" r=".6" fill="#ffffff"/>`,
        escargot: `<path d="M-6 5H6Q7 2 4 2" fill="#c9e59a" stroke="${INK}" stroke-width=".9"/><circle cx="-1" cy="0" r="4.6" fill="#e9a56a" stroke="${INK}" stroke-width=".9"/><path d="M-1 0m-2.4 0a2.4 2.4 0 1 1 2.4 2.4a1.2 1.2 0 1 1 0 -2.4" fill="none" stroke="${INK}" stroke-width=".7"/><path d="M4.4 2V-2.6M6 2V-2" stroke="${INK}" stroke-width=".7"/><circle cx="4.4" cy="-2.8" r=".7" fill="${INK}"/><circle cx="6" cy="-2.2" r=".7" fill="${INK}"/>`
    };
    return `<circle r="9.4" fill="url(#bulles-glass)" stroke="${INK}" stroke-width="1.2"/>${body[kind]}${shine}`;
}
export function cell(c: Cell, kind: Friend | undefined): string {
    if (c.kind === 'nuage') return cloud();
    if (c.kind === 'ami') return friend(kind ?? 'poussin');
    return bubble(c.color!) + (c.kind === 'glace' ? ice(c.ice) : '');
}
/** What a popped bubble becomes: a butterfly in its colour. */
export function butterfly(color: ColorId | null): string {
    const fill = color ? PAINT[color].fill : '#ffffff';
    return `<path d="M0 0C-4 -9 -11 -7 -9 -1C-11 4 -4 6 0 1C4 6 11 4 9 -1C11 -7 4 -9 0 0Z" fill="${fill}" stroke="${INK}" stroke-width="1"/><path d="M0 -3V3" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
}
/** What a falling bubble becomes once it lands: a flower in its colour. */
export function flower(color: ColorId | null): string {
    const fill = color ? PAINT[color].fill : '#ffffff';
    return `<path d="M0 3V9" stroke="#3f8f47" stroke-width="1.4"/>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-3" rx="2.2" ry="3.2" fill="${fill}" stroke="${INK}" stroke-width=".6" transform="rotate(${a})"/>`).join('')}<circle r="1.8" fill="#ffe066" stroke="${INK}" stroke-width=".6"/>`;
}
/** A face drawn on the stuck bubble for each funny try, and a little sign beside it. */
export function missFace(miss: Miss): string {
    const eyes = (dy = -1.6): string => `<circle cx="-2.6" cy="${dy}" r="1.1" fill="${INK}"/><circle cx="2.6" cy="${dy}" r="1.1" fill="${INK}"/>`;
    const faces: Record<Miss, string> = {
        boing: `${eyes()}<ellipse cy="3" rx="1.6" ry="2" fill="${INK}"/><path d="M-6 -14Q0 -20 6 -14" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`,
        tournis: `<path d="M-4 -2.6l2 2m0 -2l-2 2M2 -2.6l2 2m0 -2l-2 2" stroke="${INK}" stroke-width="1"/><path d="M-2.6 3.6Q0 1.6 2.6 3.6" fill="none" stroke="${INK}" stroke-width="1"/>${[0, 120, 240].map(a => `<path d="M0 -15l1 2l2 .2l-1.6 1.3l.6 2l-2 -1.2l-2 1.2l.6 -2l-1.6 -1.3l2 -.2Z" fill="#f5c518" stroke="${INK}" stroke-width=".5" transform="rotate(${a})"/>`).join('')}`,
        coucou: `${eyes()}<path d="M-3 2.2Q0 5.4 3 2.2" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/><path d="M10 -10q2 -3 4 0M11 -13q3 -4 6 0" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`,
        atchoum: `<path d="M-4 -1.6h2.4M1.6 -1.6h2.4" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/><ellipse cy="3" rx="2.4" ry="1.4" fill="${INK}"/><circle cx="12" cy="-6" r="1.6" fill="#bfe3f7" stroke="${INK}" stroke-width=".5"/><circle cx="15" cy="-2" r="1.2" fill="#bfe3f7" stroke="${INK}" stroke-width=".5"/><circle cx="13" cy="2" r="1" fill="#bfe3f7" stroke="${INK}" stroke-width=".5"/>`,
        bisou: `${eyes()}<path d="M-1 2.4q1.4 -1.6 2.2 0q-1 1.4 -2.2 0" fill="#e2384f" stroke="${INK}" stroke-width=".7"/><path d="M0 -12C-4 -16 -5 -11 0 -8C5 -11 4 -16 0 -12Z" fill="#ff7b95" stroke="${INK}" stroke-width=".8"/>`,
        grimace: `<path d="M-4 -3l2.4 1.2M4 -3l-2.4 1.2" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/><path d="M-3.4 2.4Q0 .8 3.4 2.4" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/><path d="M-.6 2.2q.6 3 2 0" fill="#ff7b95" stroke="${INK}" stroke-width=".7"/>`
    };
    return `<g data-miss-face transform="scale(1.3)">${faces[miss]}</g>`;
}
/** Each funny try has its own animation, named after its CSS keyframes in style.css. */
export const missAnimations: Readonly<Record<Miss, string>> = { boing: 'bulles-boing', tournis: 'bulles-tournis', coucou: 'bulles-coucou', atchoum: 'bulles-atchoum', bisou: 'bulles-bisou', grimace: 'bulles-grimace' };
export function plank(x1: number, y1: number, x2: number, y2: number): string {
    return `<g data-plank><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#c98a4f" stroke-width="5.4" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#e7b37a" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="3 5"/></g>`;
}
