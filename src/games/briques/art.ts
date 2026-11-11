import { CELL, type Brick, type ColorId, type Miss } from '../../engines/briques';
/** Drawings of « Les briques de Lumi », in the ink and rounded strokes of the guides (src/characters). Board units: a
 * brick is 22 × 22, drawn centred on (0, 0) with a small gap around it. */
export const INK = '#583746';
/** Each colour also carries its own shape, so that no throw depends on colour alone. Close colours never share a scene
 * where the ball has a colour. */
export const PAINT: Readonly<Record<ColorId, { fill: string; light: string; shape: 'coeur' | 'losange' | 'etoile' | 'carre' | 'rond' | 'triangle' }>> = {
    rouge: { fill: '#e2384f', light: '#ff9aa8', shape: 'coeur' },
    orange: { fill: '#f08a1c', light: '#ffc98a', shape: 'losange' },
    jaune: { fill: '#f5c518', light: '#fff1a6', shape: 'etoile' },
    vert: { fill: '#3fae55', light: '#a8eab2', shape: 'carre' },
    bleu: { fill: '#2f86e0', light: '#a9d3ff', shape: 'rond' },
    violet: { fill: '#9457d6', light: '#d6bdf6', shape: 'triangle' }
};
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
const H = CELL / 2 - 1;
/** The shape of a colour, centred on (0, 0), about 10 units across. */
export function shape(color: ColorId, k = 1): string {
    const s = (d: string): string => `<path d="${d}" fill="#ffffff" stroke="${INK}" stroke-width="1" stroke-linejoin="round" transform="scale(${k})"/>`;
    switch (PAINT[color].shape) {
        case 'coeur': return s('M0 4.6C-6 0.4 -5.2 -4.6 -2.4 -4.6C-1.2 -4.6 -0.3 -3.8 0 -2.8C0.3 -3.8 1.2 -4.6 2.4 -4.6C5.2 -4.6 6 0.4 0 4.6Z');
        case 'losange': return s('M0 -5.2L4.2 0L0 5.2L-4.2 0Z');
        case 'etoile': return s(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.3 : 5.3; return `${i ? 'L' : 'M'}${n(Math.cos(a) * r)} ${n(Math.sin(a) * r)}`; }).join('') + 'Z');
        case 'carre': return s('M-3.8 -3.8H3.8V3.8H-3.8Z');
        case 'rond': return `<circle r="${n(4.2 * k)}" fill="#ffffff" stroke="${INK}" stroke-width="1"/>`;
        case 'triangle': return s('M0 -5L4.6 3.8H-4.6Z');
    }
}
/** Shared gradients, defined once in the board. */
export function defs(): string {
    return `<defs>${Object.entries(PAINT).map(([c, p]) => `<linearGradient id="briques-${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.light}"/><stop offset=".45" stop-color="${p.fill}"/><stop offset="1" stop-color="${p.fill}"/></linearGradient>`).join('')}`
        + `<linearGradient id="briques-fer" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef1f5"/><stop offset=".5" stop-color="#aab4c0"/><stop offset="1" stop-color="#8a95a3"/></linearGradient>`
        + `<linearGradient id="briques-gelee" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9ffe6"/><stop offset="1" stop-color="#5fd39a"/></linearGradient></defs>`;
}
const body = (fill: string, extra = ''): string => `<rect x="${-H}" y="${-H}" width="${2 * H}" height="${2 * H}" rx="4" fill="${fill}" stroke="${INK}" stroke-width="1.3"${extra}/>`;
const shine = `<path d="M${-H + 3} ${-H + 4}h8" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>`;
const crack = `<path d="M-6 -10L-1 -3L-5 2L1 10M-1 -3L6 -6" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const eyes = (shut = false): string => shut
    ? `<path d="M-6 -2q2 -3 4 0M2 -2q2 -3 4 0" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`
    : `<circle cx="-4" cy="-2" r="1.6" fill="${INK}"/><circle cx="4" cy="-2" r="1.6" fill="${INK}"/>`;
/** A brick as the state has it. `laugh` gives an iron brick its laughing face for the moment of a funny try. */
export function brickSvg(b: Brick, laugh = false): string {
    switch (b.kind) {
        case 'brique': return body(`url(#briques-${b.color!})`) + shape(b.color!) + shine;
        case 'dur': return body(`url(#briques-${b.color!})`) + `<rect x="${-H + 2.5}" y="${-H + 2.5}" width="${2 * H - 5}" height="${2 * H - 5}" rx="2.5" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="2 2" opacity=".6"/>` + shape(b.color!) + shine + (b.hits < 2 ? crack : '');
        case 'metal': return body('url(#briques-fer)') + [[-6, -6], [6, -6], [-6, 6], [6, 6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#6f7a88"/>`).join('')
            + (laugh ? `${eyes(true)}<path d="M-5 2q5 7 10 0Z" fill="${INK}"/><path d="M-3 4.6q3 2 6 0" fill="none" stroke="#ff9aa8" stroke-width="1.4"/>` : '');
        case 'gelee': return body('url(#briques-gelee)', ' fill-opacity=".85"') + `<circle cx="-4" cy="4" r="2" fill="#ffffff" opacity=".6"/><circle cx="5" cy="-3" r="1.4" fill="#ffffff" opacity=".7"/>` + shine + eyes() + `<path d="M-2 4q2 2 4 0" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`;
        case 'bonbon': return body('#ffd6ec') + `<path d="M-10 -3l-4 -4v14l4 -4ZM10 -3l4 -4v14l4 -4Z" fill="#ff7ab8" stroke="${INK}" stroke-width="1" transform="translate(${n(-0)} 0)"/><ellipse rx="7.5" ry="6" fill="#ff7ab8" stroke="${INK}" stroke-width="1.2"/><path d="M-4 -4l3 8M1 -5l3 9" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>`;
        case 'bombe': return body('#fff4d9') + `<circle cy="2" r="7" fill="#4b4a63" stroke="${INK}" stroke-width="1.2"/><path d="M3 -4q3 -6 7 -5" fill="none" stroke="${INK}" stroke-width="1.4"/><circle cx="10" cy="-9" r="1.8" fill="#f5a623"/>`
            + [[-8, -7, '#e2384f'], [-6, 8, '#2f86e0'], [8, 7, '#3fae55'], [-9, 1, '#f5c518']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="2.6" height="2.6" fill="${c}" transform="rotate(30 ${x} ${y})"/>`).join('') + `<circle cx="-2" cy="0" r="1.6" fill="#ffffff" opacity=".7"/>`;
        case 'mobile': return body('#c9b8ff') + `<path d="M${b.dir > 0 ? '-5 -5L4 0L-5 5' : '5 -5L-4 0L5 5'}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` + `<circle cx="-6" cy="${H}" r="3" fill="${INK}"/><circle cx="6" cy="${H}" r="3" fill="${INK}"/>` + shine;
    }
}
/** The ball: white, or of its colour with its shape in the scenes with the coloured ball. */
export function ballSvg(color: ColorId | null, dizzy = false): string {
    const face = dizzy ? `<path d="M-3 -1.5l1.6 1.6M-1.4 -1.5l-1.6 1.6M1.4 -1.5l1.6 1.6M3 -1.5l-1.6 1.6" stroke="${INK}" stroke-width=".9"/>` : '';
    return color ? `<circle r="6" fill="url(#briques-${color})" stroke="${INK}" stroke-width="1.2"/>${shape(color, 0.7)}${face}` : `<circle r="6" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/><path d="M-4.4 -.6q4.4 -3.6 8.8 0M-4.4 1.8q4.4 3.6 8.8 0" fill="none" stroke="#f08ab8" stroke-width="1.3"/>${face}`;
}
/** Confetti for a brick that breaks: little bits of its colour flying off. */
export function burst(color: string): string {
    return Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<rect x="-1.6" y="-1.6" width="3.2" height="3.2" rx=".6" fill="${i % 2 ? color : '#ffffff'}" stroke="${INK}" stroke-width=".5" style="--dx:${n(Math.cos(a) * 16)}px;--dy:${n(Math.sin(a) * 16)}px"/>`; }).join('');
}
export const brickColor = (b: Brick): string => b.color ? PAINT[b.color].fill : b.kind === 'bonbon' ? '#ff7ab8' : b.kind === 'bombe' ? '#f5c518' : b.kind === 'mobile' ? '#9457d6' : '#aab4c0';
/** The CSS animation of each funny try (src/style.css). */
export const missAnimations: Readonly<Record<Miss, string>> = { rigole: 'briques-rigole', tremble: 'briques-tremble', tete: 'briques-tete', atchoum: 'briques-atchoum', tournis: 'briques-tournis', boing: 'briques-boing' };
/** A cloud of the ceiling, for the sneeze: a face and a puff. */
export function sneezeCloud(): string {
    return `<g class="briques-atchoum"><path d="M-14 4q-6 -8 2 -10q2 -8 10 -6q6 -6 12 0q8 -2 8 6q6 4 0 10Z" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>${eyes(true)}<ellipse cx="0" cy="3" rx="2.4" ry="2" fill="${INK}"/></g><g class="briques-puff"><circle cx="0" cy="14" r="3" fill="#ffffff" stroke="${INK}" stroke-width=".8"/><circle cx="-6" cy="18" r="2" fill="#ffffff" stroke="${INK}" stroke-width=".8"/><circle cx="6" cy="19" r="2.4" fill="#ffffff" stroke="${INK}" stroke-width=".8"/></g>`;
}
/** A boing on the grass: the grass springs and little lines fly. */
export function grassBoing(): string {
    return `<g class="briques-boing"><path d="M-12 0q12 -10 24 0" fill="none" stroke="#3fae55" stroke-width="3" stroke-linecap="round"/><path d="M-10 -10l-4 -5M0 -12v-6M10 -10l4 -5" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/></g>`;
}
/** Stars around Lumi's head when the ball lands on it. */
export function headStars(): string {
    return `<g class="briques-tete">${[[-12, -4], [0, -10], [12, -4]].map(([x, y]) => `<path d="M${x} ${y! - 4}l1.2 2.8l3 .2l-2.3 2l.8 3l-2.7 -1.6l-2.7 1.6l.8 -3l-2.3 -2l3 -.2Z" fill="#ffd23f" stroke="${INK}" stroke-width=".7"/>`).join('')}</g>`;
}
