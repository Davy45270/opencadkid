import { characterSvg } from '../../characters/svg';
import { BAR, CHEST, HEAD, PEST, type Color, type Fail, type Plate, type Toy } from '../../engines/vis';
/** Drawings of « Les vis de Pestouille », in board units (the board is 180 wide and 300 high), in the ink and rounded
 * strokes of the guides. Every screw colour has its own white picture (a heart, a ball, a star, a triangle, a square), so
 * that nothing differs by colour alone. */
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
/** A screw head of radius `HEAD`, centred on (0, 0), with its picture. */
export const screwHead = (c: Color): string => `<circle r="${HEAD}" fill="${hex[c]}" ${st(1.8)}/><path d="M-6 -4.5A7.5 7.5 0 0 1 -2 -7.2" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>${motif(c)}`;
/** Soft colours for the plates: never one of the screws' colours. */
export const tints = ['#ffd6a5', '#bde0fe', '#caffbf', '#ffc6ff', '#fdffb6', '#d0bfff', '#ffcfd2', '#a0f0ea'] as const;
const tintOf = (p: Plate): string => tints[p.tint % tints.length]!;
/** A plate: a rounded bar or a panel, see-through enough to show the screws it hides, with a hole under each screw. */
export function plateShape(p: Plate, holes: readonly { x: number; y: number }[]): string {
    const shape = p.shape === 'barre'
        ? `<path d="M${p.x0} ${p.y0}L${p.x1} ${p.y1}" stroke="${INK}" stroke-width="${2 * BAR + 2}" stroke-linecap="round"/><path d="M${p.x0} ${p.y0}L${p.x1} ${p.y1}" stroke="${tintOf(p)}" stroke-width="${2 * BAR - 2}" stroke-linecap="round"/>`
        : `<rect x="${p.x0}" y="${p.y0}" width="${p.x1 - p.x0}" height="${p.y1 - p.y0}" rx="8" fill="${tintOf(p)}" ${st(2)}/><path d="M${p.x0 + 6} ${p.y0 + 5}H${p.x1 - 8}" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>`;
    return `<g opacity=".8">${shape}</g>${holes.map(h => `<circle cx="${h.x}" cy="${h.y}" r="5" fill="#00000040"/>`).join('')}`;
}
const wheel = (x: number, y: number, r: number): string => `<g transform="translate(${x} ${y})"><g class="vis-roue"><circle r="${r}" fill="#3b3346" ${st(2)}/><circle r="${r * .42}" fill="#cfd8dc" ${st(1.4)}/><path d="M0 ${-r * .42}V${-r * .9}M0 ${r * .42}V${r * .9}M${-r * .42} 0H${-r * .9}M${r * .42} 0H${r * .9}" stroke="#cfd8dc" stroke-width="2"/></g></g>`;
/** The toy itself, under its plates: what stays when everything is taken apart. */
export function toyBody(t: Toy): string {
    switch (t) {
        case 'voiture': return `<ellipse cx="90" cy="224" rx="74" ry="4" fill="#00000022"/><path d="M14 192Q12 140 40 134L54 98Q58 88 72 88H110Q122 88 128 98L144 134Q168 138 166 192Z" fill="#cfd8dc" ${st(2.2)}/><path d="M60 130L68 100H87V130ZM95 130V100H114L122 130Z" fill="#e3f2fd" ${st(1.6)}/><circle class="vis-lampe" cx="158" cy="158" r="6" fill="#fff59d" ${st(1.4)}/>${wheel(50, 202, 20)}${wheel(130, 202, 20)}`;
        case 'fusee': return `<g class="vis-flamme"><path d="M72 206Q90 246 108 206Z" fill="#ffb703" ${st(1.6)}/><path d="M80 206Q90 230 100 206Z" fill="#fb8500"/></g><path d="M62 166L38 200V216L62 206ZM118 166L142 200V216L118 206Z" fill="#ef8a8a" ${st(2)}/><path d="M62 206V96Q62 78 90 63Q118 78 118 96V206Z" fill="#eceff1" ${st(2.2)}/><path d="M67 92Q90 80 113 92" fill="none" stroke="#ef8a8a" stroke-width="6" stroke-linecap="round"/><circle class="vis-lampe" cx="90" cy="120" r="12" fill="#bbdefb" ${st(1.8)}/>`;
        case 'maison': return `<rect x="110" y="74" width="20" height="40" fill="#a1887f" ${st(2)}/><rect x="26" y="124" width="128" height="100" fill="#f1dcc0" ${st(2.2)}/><path d="M14 130L90 66L166 130Z" fill="#c97b63" ${st(2.2)}/><rect x="74" y="168" width="32" height="56" rx="4" fill="#a1887f" ${st(1.8)}/><rect class="vis-lampe" x="36" y="144" width="36" height="32" rx="3" fill="#fff3c4" ${st(1.6)}/><rect class="vis-lampe" x="108" y="144" width="36" height="32" rx="3" fill="#fff3c4" ${st(1.6)}/><circle class="vis-lampe" cx="90" cy="104" r="9" fill="#fff3c4" ${st(1.6)}/>`;
        case 'bateau': return `<path d="M4 224Q20 216 36 224T68 224T100 224T132 224T164 224T180 224" fill="none" stroke="#5fb3e6" stroke-width="4" stroke-linecap="round"/><rect x="88" y="74" width="7" height="110" fill="#8d6e63" ${st(1.6)}/><path d="M95 78V172H166Z" fill="#fafafa" ${st(2)}/><path d="M86 94V168H34Z" fill="#ffe0b2" ${st(2)}/><path d="M95 74L118 80L95 86Z" fill="#e5383b" ${st(1.4)}/><path d="M10 180H170L150 220H30Z" fill="#8d6e63" ${st(2.2)}/>${[50, 90, 130].map(x => `<circle class="vis-lampe" cx="${x}" cy="196" r="6" fill="#e3f2fd" ${st(1.4)}/>`).join('')}`;
        case 'train': return `<g class="vis-fumee">${[[44, 88, 7], [52, 76, 9], [64, 64, 11]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#eceff1" ${st(1.2)}/>`).join('')}</g><rect x="34" y="100" width="20" height="28" fill="#546e7a" ${st(1.8)}/><rect x="30" y="96" width="28" height="8" rx="2" fill="#546e7a" ${st(1.8)}/><rect x="16" y="126" width="92" height="66" rx="10" fill="#90a4ae" ${st(2.2)}/><rect x="104" y="94" width="64" height="98" rx="6" fill="#b0bec5" ${st(2.2)}/><rect x="98" y="88" width="76" height="10" rx="3" fill="#78909c" ${st(1.8)}/><rect class="vis-lampe" x="116" y="106" width="40" height="30" rx="3" fill="#e3f2fd" ${st(1.6)}/><circle class="vis-lampe" cx="20" cy="150" r="6" fill="#fff59d" ${st(1.4)}/>${wheel(40, 204, 16)}${wheel(82, 204, 16)}${wheel(136, 204, 18)}`;
    }
}
/** A glass pot for one colour, in its box, with its colour's screw on the front and the screws already in it at the bottom. */
export function pot(c: Color, x0: number, y0: number, w: number, h: number, n: number): string {
    const cx = x0 + w / 2, inside = Array.from({ length: n }, (_, k) => `<g transform="translate(${cx + ((k % 3) - 1) * 8.5} ${y0 + h - 6 - Math.floor(k / 3) * 7}) scale(.42)">${screwHead(c)}</g>`).join('');
    return `<rect x="${x0}" y="${y0 + 4}" width="${w}" height="${h - 4}" rx="7" fill="#ffffffb3" ${st(2)}/><rect x="${x0 + 2}" y="${y0 + h - 22}" width="${w - 4}" height="20" rx="5" fill="${hex[c]}" opacity=".18"/>`
        + `<g data-inside>${inside}</g><rect x="${x0 - 2}" y="${y0}" width="${w + 4}" height="7" rx="3" fill="${hex[c]}" ${st(1.6)}/><g transform="translate(${cx} ${y0 + 19})">${screwHead(c)}</g>`;
}
/** The toy chest, with the plates already put away peeking out, and a jack-in-the-box asleep inside. */
export function chest(n: number): string {
    const { x0, y0, x1, y1 } = CHEST, w = x1 - x0, peek = Array.from({ length: Math.min(n, 6) }, (_, k) => `<rect x="${x0 + 8 + k * 9}" y="${y0 + 2 + (k % 2) * 3}" width="12" height="16" rx="3" fill="${tints[k % tints.length]}" ${st(1.2)} transform="rotate(${(k % 3 - 1) * 8} ${x0 + 14 + k * 9} ${y0 + 10})"/>`).join('');
    return `<g data-peek>${peek}</g><g class="vis-diable"><path d="M${x0 + w / 2} ${y0 + 14}l-6 -5l12 -5l-12 -5l12 -5l-6 -4" fill="none" stroke="#8d8d99" stroke-width="2.6"/><circle cx="${x0 + w / 2}" cy="${y0 - 16}" r="9" fill="#ffd166" ${st(1.6)}/><circle cx="${x0 + w / 2 - 3}" cy="${y0 - 18}" r="1.5" fill="${INK}"/><circle cx="${x0 + w / 2 + 3}" cy="${y0 - 18}" r="1.5" fill="${INK}"/><path d="M${x0 + w / 2 - 4} ${y0 - 13}q4 4 8 0" fill="none" ${st(1.4)}/><path d="M${x0 + w / 2 - 9} ${y0 - 22}l9 -9l9 9z" fill="#e5383b" ${st(1.4)}/></g>`
        + `<rect x="${x0 + 2}" y="${y0 + 14}" width="${w - 4}" height="${y1 - y0 - 16}" rx="5" fill="#dca36a" ${st(2)}/><path d="M${x0 + 8} ${y0 + 26}H${x1 - 8}M${x0 + 8} ${y1 - 10}H${x1 - 8}" stroke="#a8703f" stroke-width="2"/><g transform="translate(${x0 + w / 2} ${y0 + 34}) scale(.8)"><path d="${STAR}" fill="#ffd23f" ${st(1.4)}/></g>`
        + `<g class="vis-couvercle"><rect x="${x0}" y="${y0 + 8}" width="${w}" height="10" rx="4" fill="#c58a55" ${st(2)}/></g>`;
}
/** Pestouille, the guide's own drawing, in his box at the bottom left, and the plate he may wear as a hat. */
export function pestouille(expression: 'joie' | 'surprise' | 'celebration' = 'joie'): string {
    const { x0, y0, x1, y1 } = PEST, w = x1 - x0;
    return `<g class="vis-pest-corps">${characterSvg('dragon', expression, 'repos', 'reduce').replace('<svg ', `<svg x="${x0}" y="${y0}" width="${w}" height="${y1 - y0}" `)}<g transform="translate(${x0 + w / 2} ${y0 + 8})"><g class="vis-chapeau"><path d="M-17 0H17" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M-17 0H17" stroke="#ffc6ff" stroke-width="8" stroke-linecap="round"/><circle r="2.6" fill="#00000040"/></g></g></g>`;
}
/** The bubble with the sound word. */
export const bubbleWidth = (word: string): number => Math.max(46, word.length * 8.6 + 16);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="vis-bulle-mot"><rect x="${-w / 2}" y="-42" width="${w}" height="24" rx="10" fill="#fff" ${st(1.8)}/><path d="M-4 -19L0 -12L5 -19" fill="#fff" ${st(1.8)}/><text x="0" y="-25" text-anchor="middle" font-size="15" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
/** What Pestouille does in a funny try: leans to look, spins dizzy, laughs, jumps at the noise, steps back, squashed under
 * his hat. */
export const failAnimations: Readonly<Record<Fail, string>> = {
    toc: 'vis-pest-penche', toupie: 'vis-pest-tourne', rot: 'vis-pest-rit', klaxon: 'vis-pest-sursaut', ressort: 'vis-pest-recule', chapeau: 'vis-pest-ecrase'
};
/** What the thing of the try does: the plate on top knocks and wriggles, the screw spins like a top, the pot burps, the toy
 * honks, the jack pops out of the chest, the hat drops on Pestouille. */
export const thingAnimations: Readonly<Record<Fail, string>> = {
    toc: 'vis-plaque-toc', toupie: 'vis-toupie', rot: 'vis-pot-rot', klaxon: 'vis-jouet-klaxon', ressort: 'vis-diable-sort', chapeau: 'vis-chapeau-tombe'
};
export const failWords: Readonly<Record<'fr' | 'en', Record<Exclude<Fail, 'klaxon'>, string> & { klaxon: Record<Toy, string> }>> = {
    fr: { toc: 'Toc toc !', toupie: 'Vrrr !', rot: 'Burp !', ressort: 'Boing !', chapeau: 'Hop !', klaxon: { voiture: 'Tut tut !', fusee: 'Pchhh !', maison: 'Ding dong !', bateau: 'Pouêt !', train: 'Tchou !' } },
    en: { toc: 'Knock!', toupie: 'Whirr!', rot: 'Burp!', ressort: 'Boing!', chapeau: 'Ta-da!', klaxon: { voiture: 'Beep beep!', fusee: 'Whoosh!', maison: 'Ding dong!', bateau: 'Toot!', train: 'Choo!' } }
};
const sparks = (fill: string, at: number[][]): string => at.map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.6)" d="${STAR}" fill="${fill}" ${st(1.2)}/>`).join('');
export const effects: Readonly<Record<Fail, string>> = {
    toc: `<g class="vis-eclat"><path d="M-16 -6l-6 -4M16 -6l6 -4M0 -16v-7" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/></g>`,
    toupie: `<g class="vis-eclat"><path d="M-14 6q14 8 28 0M-12 -8q12 -7 24 0" fill="none" stroke="#9aa5b1" stroke-width="2" stroke-linecap="round"/></g>`,
    rot: `<g class="vis-eclat">${[[-8, -8, 4], [6, -16, 5], [-2, -26, 6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e3f2fd" ${st(1.2)}/>`).join('')}</g>`,
    klaxon: `<g class="vis-eclat"><path d="M-20 -10l-8 -6M-22 0h-10M-20 10l-8 6M20 -10l8 -6M22 0h10M20 10l8 6" stroke="#ffb703" stroke-width="3" stroke-linecap="round"/></g>`,
    ressort: `<g class="vis-eclat">${sparks('#ffd23f', [[-18, -10], [18, -14]])}</g>`,
    chapeau: `<g class="vis-eclat">${sparks('#ff7ab6', [[-20, 0], [20, -4], [0, -18]])}</g>`
};
export const confetti = (): string => `<g class="vis-confettis">${Array.from({ length: 18 }, (_, k) => `<rect x="${Math.round(Math.cos(k * 2.4) * (18 + k * 2.4))}" y="${Math.round(Math.sin(k * 2.4) * (14 + k * 2))}" width="4" height="7" rx="1" fill="${['#e5383b', '#2f80ed', '#f6b912', '#27ae60', '#9b51e0', '#f2851d'][k % 6]}"/>`).join('')}</g>`;
