import type { Ammo, Bead, ColorId, Miss } from '../../engines/collier';
/** Drawings of « Le collier de Boubou », in the ink and rounded strokes of the guides (src/characters). Board units: a bead has a radius of 10. */
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
/** The shape of a colour, centred on (0, 0), about 10 units across. */
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
    return `<defs>${Object.entries(PAINT).map(([c, p]) => `<radialGradient id="collier-${c}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${p.light}"/><stop offset=".55" stop-color="${p.fill}"/><stop offset="1" stop-color="${p.fill}"/></radialGradient>`).join('')}</defs>`;
}
const shine = '<ellipse cx="-3.8" cy="-4.4" rx="2.8" ry="1.6" fill="#ffffff" opacity=".8" transform="rotate(-30 -3.8 -4.4)"/>';
/** A bead of a colour, with its shape; `face` replaces the shape for the moment of a funny try. */
export function bead(color: ColorId, face = ''): string {
    return `<circle r="9.6" fill="url(#collier-${color})" stroke="${INK}" stroke-width="1.3"/>${face || shape(color)}${shine}`;
}
/** A sleeping bead: its colour faded, eyes closed, a little night cap, and a z. */
export function sleeper(color: ColorId): string {
    return `<circle r="9.6" fill="url(#collier-${color})" stroke="${INK}" stroke-width="1.3"/><circle r="9.6" fill="#ffffff" opacity=".35"/>`
        + `<path d="M-5 -.4Q-3 1.6 -1 -.4M1 -.4Q3 1.6 5 -.4" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/><ellipse cy="4.4" rx="1.4" ry="1" fill="${INK}"/>`
        + `<path d="M-7 -6.4Q0 -15 8 -7.4Q1 -9 -7 -6.4Z" fill="#7d6fd1" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/><circle cx="9.4" cy="-8" r="2" fill="#ffffff" stroke="${INK}" stroke-width=".8"/>`
        + `<text class="collier-z" x="8" y="-11" font-size="8" font-weight="700" fill="${INK}" font-family="sans-serif">z</text>`;
}
/** The rainbow bead: rings of every colour around a white star. */
export function rainbow(): string {
    return `<circle r="9.6" fill="#ffffff" stroke="${INK}" stroke-width="1.3"/>${RAINBOW.map((c, i) => `<circle r="${n(8.4 - i * 1.25)}" fill="none" stroke="${c}" stroke-width="1.3"/>`).join('')}<path d="M0 -2.6L.8 -.8L2.6 -.6L1.2 .6L1.6 2.4L0 1.4L-1.6 2.4L-1.2 .6L-2.6 -.6L-.8 -.8Z" fill="#ffffff" stroke="${INK}" stroke-width=".6"/>${shine}`;
}
export const ammo = (a: Ammo): string => a === 'arc' ? rainbow() : bead(a);
export const beadOf = (b: Bead): string => b.asleep ? sleeper(b.color) : bead(b.color);
/** A grey rock with a moss cap: the bead bounces on it once. */
export function rock(r: number): string {
    const k = r / 12;
    return `<g transform="scale(${n(k)})"><path d="M-12 6C-14 -2 -9 -11 -1 -12C8 -13 14 -5 12 4C11 10 4 12 -2 12C-8 12 -11 10 -12 6Z" fill="#a39ba6" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`
        + `<path d="M-8 -6C-4 -10 3 -10 6 -7" fill="none" stroke="#d6d0d8" stroke-width="2" stroke-linecap="round"/><path d="M-6 7C-2 9 3 9 6 6" fill="none" stroke="#7f7783" stroke-width="1.6" stroke-linecap="round"/></g>`;
}
/** The clasp at the start of a necklace: a little golden ring. */
export const clasp = `<circle r="5.2" fill="none" stroke="${INK}" stroke-width="4.2"/><circle r="5.2" fill="none" stroke="#f5c84c" stroke-width="2.4"/>`;
/** What a bead of the first line becomes: a butterfly in its colour. */
export function butterfly(color: ColorId): string {
    return `<path d="M0 0C-4 -9 -11 -7 -9 -1C-11 4 -4 6 0 1C4 6 11 4 9 -1C11 -7 4 -9 0 0Z" fill="${PAINT[color].fill}" stroke="${INK}" stroke-width="1"/><path d="M0 -3V3" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
}
/** What a bead of a chain becomes: a burst of confetti in its colour and the next ones. */
export function confetti(color: ColorId): string {
    const others = RAINBOW;
    return Array.from({ length: 7 }, (_, i) => { const a = i * 2 * Math.PI / 7, x = n(Math.cos(a) * 6), y = n(Math.sin(a) * 6); return `<rect x="${x}" y="${y}" width="4" height="2.4" rx=".8" fill="${i % 2 ? PAINT[color].fill : others[(i + 2) % others.length]}" stroke="${INK}" stroke-width=".4" transform="rotate(${i * 51} ${x} ${y})"/>`; }).join('')
        + `<path d="M0 -4L1.2 -1.2L4 -1L1.8 .8L2.4 3.6L0 2.2L-2.4 3.6L-1.8 .8L-4 -1L-1.2 -1.2Z" fill="${PAINT[color].fill}" stroke="${INK}" stroke-width=".6"/>`;
}
/** A face drawn on the bead for each funny try, and a little sign beside it. */
export function missFace(miss: Miss): string {
    const eyes = (dy = -1.6): string => `<circle cx="-2.6" cy="${dy}" r="1.2" fill="${INK}"/><circle cx="2.6" cy="${dy}" r="1.2" fill="${INK}"/>`;
    const faces: Record<Miss, string> = {
        boing: `${eyes()}<ellipse cy="3" rx="1.6" ry="2" fill="${INK}"/><path d="M-6 -14Q0 -20 6 -14" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`,
        toc: `<path d="M-4 -2.6l2 2m0 -2l-2 2M2 -2.6l2 2m0 -2l-2 2" stroke="${INK}" stroke-width="1"/><path d="M-2.6 3.6Q0 1.6 2.6 3.6" fill="none" stroke="${INK}" stroke-width="1"/>${[0, 120, 240].map(a => `<path d="M0 -15l1 2l2 .2l-1.6 1.3l.6 2l-2 -1.2l-2 1.2l.6 -2l-1.6 -1.3l2 -.2Z" fill="#f5c518" stroke="${INK}" stroke-width=".5" transform="rotate(${a})"/>`).join('')}`,
        dodo: `<path d="M-4.4 -1.4Q-2.6 .4 -.8 -1.4M.8 -1.4Q2.6 .4 4.4 -1.4" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/><ellipse cy="3.4" rx="2.4" ry="2.8" fill="${INK}"/><text x="8" y="-9" font-size="9" font-weight="700" fill="${INK}" font-family="sans-serif">z</text><text x="13" y="-15" font-size="7" font-weight="700" fill="${INK}" font-family="sans-serif">z</text>`,
        chatouille: `<path d="M-4.4 -1Q-2.6 -3.4 -.8 -1M.8 -1Q2.6 -3.4 4.4 -1" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/><path d="M-3.4 1.6Q0 6 3.4 1.6Z" fill="#ff7b95" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/><path d="M11 -6l3 -3M12 0h4M11 6l3 3M-11 -6l-3 -3M-12 0h-4M-11 6l-3 3" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`,
        bout: `${eyes()}<path d="M-2.6 2.4Q0 4.6 2.6 2.4" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/><path d="M-10 -12Q0 -17 10 -12" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="1.5 2" stroke-linecap="round"/>`,
        rougit: `${eyes(-2)}<ellipse cx="-5" cy="2" rx="2.4" ry="1.5" fill="#ff5c7a" opacity=".85"/><ellipse cx="5" cy="2" rx="2.4" ry="1.5" fill="#ff5c7a" opacity=".85"/><path d="M-1.6 3.4Q0 2.4 1.6 3.4" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`
    };
    return `<g data-miss-face transform="scale(1.25)">${faces[miss]}</g>`;
}
/** Each funny try has its own animation, named after its CSS keyframes in style.css. */
export const missAnimations: Readonly<Record<Miss, string>> = { boing: 'collier-boing', toc: 'collier-toc', dodo: 'collier-dodo', chatouille: 'collier-chatouille', bout: 'collier-bout', rougit: 'collier-rougit' };
/** The swap icon: two round arrows. */
export const swapIcon = `<path d="M8 13A11 11 0 0 1 28 9" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M29 3L29 11L21 10Z" fill="${INK}"/><path d="M28 23A11 11 0 0 1 8 27" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M7 33L7 25L15 26Z" fill="${INK}"/>`;
