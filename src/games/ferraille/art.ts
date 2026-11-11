import { characterSvg } from '../../characters/svg';
import { ROW, type Fail, type Piece, type Plat } from '../../engines/ferraille';
/** Drawings of « Le robot de Boubou », in board units (the board is 180 wide and 300 high), in the ink and rounded strokes
 * of the guides. Every part has its own silhouette (a nut, a toothed wheel, a coil, a battery), so that nothing differs by
 * colour alone. */
export const INK = '#46364a';
const st = (w = 2): string => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const STAR = 'M0 -10L3 -3.6L9.9 -3.1L4.6 1.5L6.2 8.3L0 4.7L-6.2 8.3L-4.6 1.5L-9.9 -3.1L-3 -3.6Z';
const r1 = (v: number): number => Math.round(v * 10) / 10;
/** A part, about 24 wide, centred on (0, 0). */
export function part(p: Piece): string {
    switch (p) {
        case 'b': return `<path d="M-11 -6L0 -12L11 -6V6L0 12L-11 6Z" fill="#ffc83d" ${st(2)}/><circle r="5" fill="#fff4c2" ${st(1.6)}/><path d="M-6 -3L-2 -8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`;
        case 'g': return `<path d="${Array.from({ length: 16 }, (_, k) => { const a = k * Math.PI / 8, r = k % 2 ? 9 : 13; return `${k ? 'L' : 'M'}${r1(Math.cos(a) * r)} ${r1(Math.sin(a) * r)}`; }).join('')}Z" fill="#9ab3c9" ${st(2)}/><circle r="4" fill="#f4efe6" ${st(1.6)}/>`;
        case 's': return `<path d="M-8 -11H8M-8 11H8" ${st(3)}/><path d="M-7 -8L7 -4L-7 0L7 4L-7 8" fill="none" stroke="#7a8590" stroke-width="3.4" stroke-linecap="round"/><path d="M-7 -8L7 -4L-7 0L7 4L-7 8" fill="none" stroke="#dfe6ec" stroke-width="1.2" stroke-linecap="round"/>`;
        case 'p': return `<rect x="-13" y="-9" width="26" height="18" rx="3" fill="#2fb36b" ${st(2)}/><rect x="13" y="-4" width="3" height="8" rx="1" fill="#c9ced3" ${st(1.4)}/><rect x="-13" y="-9" width="9" height="18" rx="3" fill="#1d7a46"/><path d="M4 -4V4M0 0H8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`;
    }
}
/** The red button of the bridge, on top of its platform. */
export const button = (pressed: boolean): string => `<rect x="-9" y="-3" width="18" height="4" rx="2" fill="#8d8d99" ${st(1.4)}/><path d="M-6 -3Q-6 ${pressed ? -5 : -10} 0 ${pressed ? -5 : -10}Q6 ${pressed ? -5 : -10} 6 -3Z" fill="#e5383b" ${st(1.6)}/>`;
const crate = (x: number, y: number, w: number, h: number): string => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#dca36a" ${st(2)}/><rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="2" fill="none" stroke="#a8703f" stroke-width="1.6"/><path d="M${x + 5} ${y + h - 5}L${x + w - 5} ${y + 5}" stroke="#a8703f" stroke-width="2.4" stroke-linecap="round"/>`;
const plank = (p: Plat, fill: string, shade: string): string => `<rect x="${p.x0}" y="${p.y}" width="${p.x1 - p.x0}" height="12" rx="3" fill="${fill}" ${st(2)}/><path d="M${p.x0 + 4} ${p.y + 4}H${p.x1 - 4}" stroke="${shade}" stroke-width="2" stroke-linecap="round"/>`;
/** A platform, drawn where it stands (the lift at its bottom row, moved by the page). */
export function platform(p: Plat, dir = 1): string {
    const w = p.x1 - p.x0, cx = (p.x0 + p.x1) / 2;
    switch (p.kind) {
        case 'caisse': return Array.from({ length: p.h / ROW }, (_, k) => crate(p.x0, p.y + ROW * k, w, ROW)).join('');
        case 'balles': { const n = Math.round(w / 9); return `${crate(p.x0, p.y + 8, w, p.h - 8)}${Array.from({ length: n }, (_, k) => `<circle cx="${p.x0 + 6 + k * (w - 12) / (n - 1)}" cy="${p.y + 6 + (k % 2) * 3}" r="5.2" fill="${['#e5383b', '#2f80ed', '#ffd84a', '#27ae60', '#ff7ab6'][k % 5]}" ${st(1.2)}/>`).join('')}`; }
        case 'trampo': return `<rect x="${p.x0 + 2}" y="${p.y + 10}" width="${w - 4}" height="${p.h - 10}" rx="4" fill="#5b8fd9" ${st(2)}/>${[.3, .7].map(f => `<path d="M${p.x0 + w * f} ${p.y + 10}l-4 -3l8 -2l-8 -2l4 -3" fill="none" stroke="#c9ced3" stroke-width="2"/>`).join('')}<rect x="${p.x0}" y="${p.y - 1}" width="${w}" height="6" rx="3" fill="#3b3346"/><path d="M${p.x0 + 4} ${p.y + 2}H${p.x1 - 4}" stroke="#ff7ab6" stroke-width="2"/>`;
        case 'canard': return `<g transform="translate(${cx} ${p.y + 30}) scale(${Math.min(1.2, (w - 2) / 37).toFixed(2)})"><g class="ferraille-canard"><ellipse cx="2" cy="6" rx="16" ry="11" fill="#ffd84a" ${st(2)}/><circle cx="-4" cy="-10" r="9" fill="#ffd84a" ${st(2)}/><path d="M-13 -9Q-20 -8 -19 -5Q-15 -3 -11 -6Z" fill="#f28c28" ${st(1.4)}/><circle cx="-6" cy="-12" r="1.8" fill="${INK}"/><path d="M4 4Q10 0 14 6" fill="none" stroke="#e8b800" stroke-width="2" stroke-linecap="round"/></g></g>`;
        case 'tapis': {
            const arrows = Array.from({ length: Math.floor(w / 18) }, (_, k) => `<path d="M${p.x0 + 9 + k * 18 - 3 * dir} ${p.y + 3}l${6 * dir} 3l${-6 * dir} 3" fill="none" stroke="#ffd23f" stroke-width="2" stroke-linecap="round"/>`).join('');
            return `<rect x="${p.x0}" y="${p.y}" width="${w}" height="12" rx="6" fill="#4a4558" ${st(2)}/><g class="ferraille-fleches" style="--dir:${dir}">${arrows}</g>${[p.x0 + 6, p.x1 - 6].map(x => `<circle cx="${x}" cy="${p.y + 6}" r="4" fill="#c9ced3" ${st(1.2)}/>`).join('')}`;
        }
        case 'ascenseur': return `<path d="M${p.x0 + 6} ${p.y}V${-400}M${p.x1 - 6} ${p.y}V${-400}" stroke="#8d8d99" stroke-width="1.6"/><rect x="${p.x0}" y="${p.y}" width="${w}" height="12" rx="2" fill="#ffcf33" ${st(2)}/><path d="M${p.x0 + 3} ${p.y + 9}H${p.x1 - 3}" stroke="${INK}" stroke-width="2" stroke-dasharray="4 4"/>`;
        case 'pont': return `<rect x="${p.x0}" y="${p.y}" width="${w}" height="12" rx="2" fill="#f2a43a" ${st(2)}/>${Array.from({ length: Math.floor(w / 12) }, (_, k) => `<path d="M${p.x0 + 4 + k * 12} ${p.y + 11}l6 -10" stroke="${INK}" stroke-width="2.4"/>`).join('')}`;
        default: return `<path d="M${p.x0 + 8} ${p.y + 12}v4h7M${p.x1 - 8} ${p.y + 12}v4h-7" fill="none" stroke="#8d8d99" stroke-width="3" stroke-linejoin="round"/>${plank(p, '#c58a55', '#e2b384')}`;
    }
}
/** A ladder from y0 down to y1 at x. */
export const ladder = (x: number, y0: number, y1: number): string => `<path d="M${x - 8} ${y0 - 6}V${y1}M${x + 8} ${y0 - 6}V${y1}" ${st(2.6)}/>${Array.from({ length: Math.floor((y1 - y0) / 11) }, (_, k) => `<path d="M${x - 8} ${y0 + 4 + k * 11}H${x + 8}" stroke="#a8703f" stroke-width="2.6" stroke-linecap="round"/>`).join('')}`;
/** Boubou: the guide's own drawing, feet on (0, 0), about 40 high (twice a part); the balls that cover him come out of the crate. */
export function boubou(): string {
    return `<g class="ferraille-corps">${characterSvg('panda', 'joie', 'repos', 'reduce').replace('<svg ', '<svg x="-24" y="-46" width="48" height="48" ')}<g class="ferraille-couvert" transform="scale(1.14)">${[[-10, -24, '#e5383b'], [8, -30, '#2f80ed'], [12, -14, '#ffd84a'], [-12, -8, '#27ae60'], [0, -36, '#ff7ab6']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}" ${st(1.2)}/>`).join('')}</g></g>`;
}
/** The big kind robot, sitting broken on the floor, drawn in a box 52 wide and 90 high whose bottom middle is (0, 0) (arms included once scaled by 0.9 in the scene). Its eyes
 * light up and it stands when repaired; its long arm carries a magnet. */
export function robot(): string {
    return `<g class="ferraille-robot"><ellipse cy="-1" rx="26" ry="3" fill="#00000022"/>`
        + `<rect x="-20" y="-16" width="14" height="16" rx="4" fill="#8fa3b5" ${st(2)}/><rect x="6" y="-16" width="14" height="16" rx="4" fill="#8fa3b5" ${st(2)}/>`
        + `<rect x="-24" y="-56" width="48" height="42" rx="10" fill="#b8c9d8" ${st(2.2)}/><rect x="-13" y="-48" width="26" height="18" rx="4" fill="#e9f1f7" ${st(1.6)}/>${[-7, 0, 7].map((x, k) => `<circle class="ferraille-voyant" cx="${x}" cy="-39" r="3" fill="${['#e5383b', '#ffd84a', '#27ae60'][k]}"/>`).join('')}`
        + `<g class="ferraille-bras"><path d="M23 -44Q28 -38 26 -27" fill="none" stroke="#8fa3b5" stroke-width="6" stroke-linecap="round"/><path d="M20 -27h11v6h-3v-2h-5v2h-3Z" fill="#e5383b" ${st(1.4)}/></g><path d="M-23 -44Q-28 -36 -26 -25" fill="none" stroke="#8fa3b5" stroke-width="6" stroke-linecap="round"/>`
        + `<g class="ferraille-tete"><rect x="-18" y="-86" width="36" height="28" rx="9" fill="#c9d8e6" ${st(2.2)}/><path d="M0 -86V-94" ${st(2)}/><circle class="ferraille-antenne" cx="0" cy="-96" r="3.5" fill="#ff7ab6" ${st(1.4)}/>`
        + `<g class="ferraille-dort"><path d="M-11 -73q4 3 8 0M3 -73q4 3 8 0" fill="none" ${st(2)}/></g><g class="ferraille-yeux"><circle cx="-7" cy="-73" r="4.2" fill="#5fd3ff" ${st(1.4)}/><circle cx="7" cy="-73" r="4.2" fill="#5fd3ff" ${st(1.4)}/></g><path d="M-6 -64Q0 -61 6 -64" fill="none" ${st(1.6)}/></g></g>`;
}
/** The bubble with the sound word. */
export const bubbleWidth = (word: string): number => Math.max(46, word.length * 8.6 + 16);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="ferraille-bulle-mot"><rect x="${-w / 2}" y="-42" width="${w}" height="24" rx="10" fill="#fff" ${st(1.8)}/><path d="M-4 -19L0 -12L5 -19" fill="#fff" ${st(1.8)}/><text x="0" y="-25" text-anchor="middle" font-size="15" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
const sparks = (fill: string, at: number[][]): string => at.map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.7)" d="${STAR}" fill="${fill}" ${st(1.2)}/>`).join('');
/** What flies around a funny try, drawn on Boubou (the sneeze on the robot). */
export const effects: Readonly<Record<Fail, string>> = {
    coussin: `<g class="ferraille-eclat">${sparks('#ff9fbf', [[-16, -8], [16, -8]])}</g>`,
    bong: `<g class="ferraille-etoiles">${sparks('#ffd23f', [[-14, -46], [0, -54], [14, -46]])}</g>`,
    balles: `<g class="ferraille-eclat">${[[-16, -30, '#e5383b'], [14, -36, '#2f80ed'], [0, -48, '#ffd84a'], [20, -20, '#27ae60']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}" ${st(1.2)}/>`).join('')}</g>`,
    canard: `<g class="ferraille-eclat">${sparks('#fff36b', [[-18, -10], [18, -14]])}</g>`,
    surplace: `<g class="ferraille-eclat"><path d="M-22 -20h-8M-22 -12h-10M-22 -4h-8" stroke="#9aa5b1" stroke-width="2.4" stroke-linecap="round"/></g>`,
    eternue: `<g class="ferraille-eternuement">${[[-30, -70], [-40, -54], [-26, -46], [-46, -76]].map(([x, y], k) => `<g transform="translate(${x} ${y}) rotate(${k * 40}) scale(.45)">${part('b')}</g>`).join('')}</g>`
};
/** What Boubou does in a funny try: arms wide in the fall, a bump on the head, gone into the balls, squashed on the duck,
 * running on the spot, startled by the sneeze. */
export const failAnimations: Readonly<Record<Fail, string>> = {
    coussin: 'ferraille-boubou-plouf', bong: 'ferraille-boubou-bong', balles: 'ferraille-boubou-plonge', canard: 'ferraille-boubou-couic', surplace: 'ferraille-boubou-court', eternue: 'ferraille-boubou-sursaut'
};
/** What the thing of the try does: the cushion sags, the platform shakes, the balls splash, the duck squashes, the belt
 * rolls, the robot sneezes. */
export const thingAnimations: Readonly<Record<Fail, string>> = {
    coussin: 'ferraille-coussin-creuse', bong: 'ferraille-planche-tremble', balles: 'ferraille-balles-giclent', canard: 'ferraille-canard-ecrase', surplace: 'ferraille-tapis-file', eternue: 'ferraille-robot-atchoum'
};
export const failWords: Readonly<Record<'fr' | 'en', Record<Fail, string>>> = {
    fr: { coussin: 'Pouf !', bong: 'Bong !', balles: 'Plouf !', canard: 'Couic !', surplace: 'Zzz zzz !', eternue: 'Atchoum !' },
    en: { coussin: 'Poof!', bong: 'Bong!', balles: 'Splosh!', canard: 'Squeak!', surplace: 'Zoom zoom!', eternue: 'Atishoo!' }
};
export const confetti = (): string => `<g class="ferraille-confettis">${Array.from({ length: 16 }, (_, k) => `<rect x="${Math.round(Math.cos(k * 2.4) * (16 + k * 2))}" y="${Math.round(Math.sin(k * 2.4) * (12 + k * 2)) - 30}" width="4" height="7" rx="1" fill="${['#e5383b', '#2f80ed', '#ffd84a', '#27ae60', '#9b51e0', '#f2851d'][k % 6]}"/>`).join('')}</g>`;
