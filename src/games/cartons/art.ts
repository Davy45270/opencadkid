import { characterSvg } from '../../characters/svg';
import type { Fail, FriendKind, Reaction, Treasure } from '../../engines/cartons';
import type { Locale } from '../../shell/i18n';
/** Drawings of « Les surprises de Tutu », in the ink and rounded strokes of the guides (src/characters). A cell is 100 units
 * wide; every drawing of a thing is centred on (0, 0), the middle of its cell, and stays within 50 units of it. The cartons
 * are big and brown, the treasures bright, the confetti box striped in rainbow colours with its count in a big round
 * badge; the yard stays pale so that everything that matters stands out. */
export const U = 100;
export const INK = '#583746';
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
const eyes = (y: number, gap: number, r = 5): string => `<circle cx="${-gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${-gap + 1.6}" cy="${y - 1.6}" r="${r * .35}" fill="#fff"/><circle cx="${gap + 1.6}" cy="${y - 1.6}" r="${r * .35}" fill="#fff"/>`;

/** A paving stone of the yard; `x + y` alternates the shade so the cells can be counted. */
export const yard = (x: number, y: number): string => `<rect x="-50" y="-50" width="100" height="100" fill="${(x + y) % 2 ? '#f6ecd9' : '#efe2c9'}"/><rect x="-46" y="-46" width="92" height="92" rx="10" fill="none" stroke="#e2d0ad" stroke-width="3"/>`;
/** A brick wall: red bricks in rows, joints in pale mortar. */
export function brick(): string {
    const rows = [-50, -25, 0, 25].map((y, i) => (i % 2 ? [-66, -32, 2, 36] : [-49, -15, 19]).map(x => { const a = Math.max(-48, x), b = Math.min(48, x + 30); return `<rect x="${a}" y="${y + 2}" width="${b - a}" height="21" rx="3" fill="${(x + y) % 3 ? '#c8553d' : '#b8483a'}"/>`; }).join('')).join('');
    return `<rect x="-50" y="-50" width="100" height="100" fill="#e8d6c0"/>${rows}<rect x="-50" y="-50" width="100" height="100" fill="none" stroke="#8e3a2e" stroke-width="3"/>`;
}
/** A flower bed: green leaves and round flowers, low and soft (no carton colour). */
export function flowers(x: number, y: number): string {
    const tint = ['#ff8fc0', '#ffd23f', '#b38cf0'][(x * 3 + y) % 3]!;
    const flower = (fx: number, fy: number): string => `<g transform="translate(${fx} ${fy})">${[0, 72, 144, 216, 288].map(r => `<ellipse transform="rotate(${r}) translate(0 -8)" rx="6" ry="8" fill="${tint}" stroke="${INK}" stroke-width="2"/>`).join('')}<circle r="5" fill="#fff3a0" stroke="${INK}" stroke-width="2"/></g>`;
    return `<rect x="-50" y="-50" width="100" height="100" fill="#8fcf74"/><path d="M-40 30q8 -16 16 0M10 34q8 -16 16 0M-14 -2q8 -16 16 0M24 -30q8 -16 16 0" fill="none" stroke="#4f9a45" stroke-width="5" stroke-linecap="round"/>${flower(-24, -22)}${flower(20, 6)}${flower(-12, 28)}`;
}
/** A fan on the ground: a round grille with its blades and a big arrow the way it blows (`angle` in degrees, 0 is right). */
export function fan(angle: number): string {
    const blades = [0, 120, 240].map(r => `<path class="cartons-pale" transform="rotate(${r})" d="M0 0Q14 -26 2 -30Q-10 -20 0 0Z" fill="#7cc6f0" stroke="${INK}" stroke-width="2.5"/>`).join('');
    return `<circle r="34" fill="#e3f5ff" stroke="${INK}" stroke-width="4"/><g class="cartons-helice">${blades}</g><circle r="6" fill="${INK}"/>`
        + `<g transform="rotate(${angle})"><path d="M30 -12L48 0L30 12Z" fill="#4d95c6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path class="cartons-vent" d="M36 -26q6 4 12 0M36 26q6 -4 12 0" fill="none" stroke="#4d95c6" stroke-width="3" stroke-linecap="round"/></g>`;
}
/** A carton: a big brown box with its flaps and tape. A double carton is taller, with two straps and a second carton
 * peeking on top. Every carton looks the same outside: what is inside is a surprise. */
export function carton(double: boolean): string {
    const box = `<path d="M-38 -18L-30 -34H30L38 -18Z" fill="#e0a65f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="-38" y="-18" width="76" height="58" rx="4" fill="#c98b4d" stroke="${INK}" stroke-width="4"/><path d="M-8 -18V40M8 -18V40" stroke="#f1d9a9" stroke-width="5"/><path d="M-28 4H-16M18 22H28" stroke="#a46d39" stroke-width="3" stroke-linecap="round"/>`;
    if (!double) return `<g class="cartons-carton">${box}</g>`;
    return `<g class="cartons-carton"><g transform="translate(0 6) scale(.9)">${box}</g><g transform="translate(0 -30) scale(.62)"><path d="M-38 -18L-30 -34H30L38 -18Z" fill="#e0a65f" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><rect x="-38" y="-18" width="76" height="40" rx="4" fill="#c98b4d" stroke="${INK}" stroke-width="6"/></g>`
        + `<path d="M-36 10H36M-36 28H36" stroke="#5aa0d8" stroke-width="5"/></g>`;
}
/** The treasures: apples, a kitten, three balloons, a teddy bear. */
export function treasure(kind: Treasure): string {
    switch (kind) {
        case 'pomme': return [[-14, 8], [14, 8], [0, -14]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="17" fill="#e8463c" stroke="${INK}" stroke-width="3.5"/><path d="M0 -16Q2 -24 6 -26" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M2 -20Q12 -28 16 -18Q8 -14 2 -20Z" fill="#5ab56b" stroke="${INK}" stroke-width="2"/><ellipse cx="-6" cy="-5" rx="4" ry="6" fill="#fff" opacity=".5"/></g>`).join('');
        case 'chaton': return `<path d="M-30 -14L-26 -42L-8 -26ZM30 -14L26 -42L8 -26Z" fill="#f4a259" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><ellipse cy="0" rx="34" ry="30" fill="#f4a259" stroke="${INK}" stroke-width="3.5"/><path d="M-12 -24l4 10M0 -28v10M12 -24l-4 10" stroke="#d57d33" stroke-width="3" stroke-linecap="round"/>${eyes(-2, 12, 5.5)}<path d="M-4 8L4 8L0 13Z" fill="#ff8fa3" stroke="${INK}" stroke-width="2"/><path d="M0 13Q-6 20 -10 16M0 13Q6 20 10 16M-18 8H-36M-18 13L-34 18M18 8H36M18 13L34 18" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
        case 'ballons': return `<path d="M-18 4Q-8 24 0 44M18 4Q8 24 0 44M0 -2V44" fill="none" stroke="${INK}" stroke-width="2.5"/>` + [[-18, -16, '#e8463c'], [18, -16, '#4d95c6'], [0, -26, '#ffd23f']].map(([x, y, c]) => `<g transform="translate(${x} ${y})"><ellipse rx="16" ry="20" fill="${c}" stroke="${INK}" stroke-width="3.5"/><path d="M-3 20L0 25L3 20Z" fill="${c}" stroke="${INK}" stroke-width="2"/><ellipse cx="-6" cy="-7" rx="4" ry="7" fill="#fff" opacity=".55"/></g>`).join('');
        case 'ours': return `<circle cx="-24" cy="-26" r="11" fill="#b9814d" stroke="${INK}" stroke-width="3.5"/><circle cx="24" cy="-26" r="11" fill="#b9814d" stroke="${INK}" stroke-width="3.5"/><ellipse cy="26" rx="26" ry="20" fill="#b9814d" stroke="${INK}" stroke-width="3.5"/><circle cy="-8" r="26" fill="#c98f5a" stroke="${INK}" stroke-width="3.5"/>${eyes(-12, 10, 4.5)}<ellipse cy="2" rx="11" ry="8" fill="#f1d3ad" stroke="${INK}" stroke-width="2.5"/><ellipse cy="-1" rx="4" ry="3" fill="${INK}"/><path d="M-10 26Q0 18 10 26L0 34Z" fill="#e8463c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
    }
}
/** The confetti box: a gift box with rainbow stripes and a pink lid. On the yard (`count` given), it sits small in the
 * bottom left of its cell, so that Tutu standing on it hides nothing, with its count in a big round badge top right
 * (3, 2, then a red 1). */
export function box(count: number | null): string {
    if (count !== null) return `<g transform="translate(-14 24) scale(.6)">${box(null)}</g><g transform="translate(28 -28)"><g class="cartons-pastille"><circle r="27" fill="#fff" stroke="${INK}" stroke-width="5"/><text y="14" text-anchor="middle" font-size="42" font-weight="900" fill="${count === 1 ? '#e8463c' : INK}" font-family="inherit">${count}</text></g></g>`;
    const stripes = ['#e8463c', '#ffd23f', '#5ab56b', '#4d95c6', '#9b6bd3'].map((c, i) => `<rect x="${-30 + i * 12}" y="-14" width="12" height="44" fill="${c}"/>`).join('');
    return `<g class="cartons-boite-corps"><rect x="-32" y="-16" width="64" height="48" rx="6" fill="#fff" stroke="${INK}" stroke-width="4"/>${stripes}<rect x="-32" y="-16" width="64" height="48" rx="6" fill="none" stroke="${INK}" stroke-width="4"/><rect x="-36" y="-26" width="72" height="14" rx="5" fill="#ff8fc0" stroke="${INK}" stroke-width="4"/></g>`;
}
/** The two bonuses on the ground: the big box (a box with a star and « + ») and one box more (two little boxes). */
export function bonus(kind: 'g' | 'm'): string {
    const glow = '<circle r="44" fill="#fff3a0" opacity=".8"/>';
    if (kind === 'g') return `${glow}<g transform="scale(.95)">${box(null)}</g><path transform="translate(0 6) scale(.55)" d="M0 -26L7.6 -9.4L25.7 -8L12 3.8L16 21.5L0 12.2L-16 21.5L-12 3.8L-25.7 -8L-7.6 -9.4Z" fill="#ffd23f" stroke="${INK}" stroke-width="5"/><path d="M28 -36h16M36 -44v16" stroke="#e8463c" stroke-width="6" stroke-linecap="round"/>`;
    return `${glow}<g transform="translate(-14 6) scale(.6)">${box(null)}</g><g transform="translate(16 -10) scale(.6)">${box(null)}</g><text x="26" y="40" text-anchor="middle" font-size="26" font-weight="900" fill="${INK}" font-family="inherit">×2</text>`;
}
/** Tutu, the guide himself (the drawing of src/characters), standing in his cell. */
export const tutu = (expression: 'joie' | 'surprise' | 'celebration'): string =>
    characterSvg('singe', expression, 'repos', 'reduce').replace('<svg ', '<svg x="-56" y="-66" width="112" height="112" ');
/** The friends who walk their round. */
export function friend(kind: FriendKind): string {
    if (kind === 'escargot') return `<path d="M-40 30Q-44 18 -30 18H24Q34 18 36 6Q40 -12 44 -18" fill="#c7e88a" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M-40 30H30Q40 30 40 22" fill="#c7e88a" stroke="${INK}" stroke-width="3.5"/><path d="M38 -16L34 -32M44 -18L48 -34" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="34" cy="-33" r="4" fill="${INK}"/><circle cx="48" cy="-35" r="4" fill="${INK}"/>`
        + `<circle cx="-6" cy="-4" r="26" fill="#f2b05e" stroke="${INK}" stroke-width="3.5"/><path d="M-6 -4m-16 0a16 16 0 1 1 16 16a10 10 0 1 1 -8 -12" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    return `<ellipse cy="14" rx="34" ry="22" fill="#fff6c8" stroke="${INK}" stroke-width="3.5"/><path d="M-34 6Q-46 -2 -40 18" fill="#fff6c8" stroke="${INK}" stroke-width="3.5"/><path d="M-6 16Q8 4 20 14" fill="none" stroke="#e7d28a" stroke-width="4" stroke-linecap="round"/><circle cx="18" cy="-16" r="18" fill="#fff6c8" stroke="${INK}" stroke-width="3.5"/>`
        + `<circle cx="22" cy="-20" r="3.8" fill="${INK}"/><path d="M32 -14L48 -10L32 -4Z" fill="#f2a33a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-10 36v8h-8M10 36v8h8" fill="none" stroke="#f2a33a" stroke-width="4" stroke-linecap="round"/>`;
}
/** A clown head on a spring, popping out of an empty carton. */
export const clown = (): string => `<path d="M0 30L-10 22L10 14L-10 6L10 -2L0 -8" fill="none" stroke="#8a8a8a" stroke-width="4" stroke-linejoin="round"/><circle cy="-26" r="20" fill="#fff6ef" stroke="${INK}" stroke-width="3.5"/><circle cx="-18" cy="-36" r="9" fill="#ff8f3a" stroke="${INK}" stroke-width="2.5"/><circle cx="18" cy="-36" r="9" fill="#ff8f3a" stroke="${INK}" stroke-width="2.5"/>${eyes(-30, 7, 3.5)}<circle cy="-22" r="5" fill="#e8463c"/><path d="M-8 -14Q0 -8 8 -14" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
/** Confetti on a cell: little coloured paper bits, each with its own small offset so a cross reads as a rain. */
export function confetti(seed: number): string {
    const colours = ['#e8463c', '#ffd23f', '#5ab56b', '#4d95c6', '#9b6bd3', '#ff8fc0'];
    return Array.from({ length: 9 }, (_, i) => {
        const a = (seed * 37 + i * 71) % 360, r = 10 + (seed * 13 + i * 29) % 32, x = Math.cos(a * Math.PI / 180) * r, y = Math.sin(a * Math.PI / 180) * r;
        return `<rect x="${n(x - 5)}" y="${n(y - 3)}" width="10" height="6" rx="1.5" transform="rotate(${(a * 3) % 180} ${n(x)} ${n(y)})" fill="${colours[(seed + i) % colours.length]}" stroke="${INK}" stroke-width="1"/>`;
    }).join('');
}
/** A dotted mark on a cell the confetti will reach: shown as soon as a box stands on the yard. */
export const reach = (): string => `<circle r="30" fill="none" stroke="#e8463c" stroke-width="5" stroke-dasharray="8 9" stroke-linecap="round" opacity=".85"/><circle r="6" fill="#e8463c" opacity=".7"/>`;
/** The arrow on a cell next to Tutu: touch it and he steps there. */
export const arrow = (angle: number): string => `<g transform="rotate(${angle})" opacity=".85"><circle r="22" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M-10 -10L8 0L-10 10Z" fill="#8d68a0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>`;
/** The help: a golden ring around the best cell. */
export const shine = (): string => '<circle class="cartons-brille" r="42" fill="#fff3a0" opacity=".55" stroke="#f5b400" stroke-width="6"/>';

/** Each funny try and reaction has its own animation (a CSS class of src/style.css). */
export const funnyAnimations: Readonly<Record<Fail | Reaction, string>> = {
    grimace: 'cartons-grimace', carton: 'cartons-toc', fleurs: 'cartons-pointe', boite: 'cartons-rigole', poche: 'cartons-poche',
    eternue: 'cartons-atchoum', coucou: 'cartons-ressort', rebond: 'cartons-pluie', danse: 'cartons-danse', pfff: 'cartons-pfff'
};
/** The word in the bubble. */
export const funnyWords: Readonly<Record<Locale, Readonly<Record<Fail | Reaction, string>>>> = {
    fr: { grimace: 'Beuh !', carton: 'Toc toc !', fleurs: 'Chut !', boite: 'Hi hi !', poche: 'Vide !', eternue: 'Atchoum !', coucou: 'Coucou !', rebond: 'Boing !', danse: 'Youpi !', pfff: 'Pfff…' },
    en: { grimace: 'Yuck!', carton: 'Knock!', fleurs: 'Shh!', boite: 'Tee hee!', poche: 'Empty!', eternue: 'Atchoo!', coucou: 'Peekaboo!', rebond: 'Boing!', danse: 'Yippee!', pfff: 'Pfff…' }
};
export const bubbleWidth = (word: string): number => Math.max(90, word.length * 19 + 30);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="cartons-bulle"><path d="M${-w / 2} -96H${w / 2}Q${w / 2 + 10} -96 ${w / 2 + 10} -84V-52Q${w / 2 + 10} -40 ${w / 2} -40H12L0 -26L-6 -40H${-w / 2}Q${-w / 2 - 10} -40 ${-w / 2 - 10} -52V-84Q${-w / 2 - 10} -96 ${-w / 2} -96Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="0" y="-56" text-anchor="middle" font-size="34" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
/** Tool icons: the box button and the wait button (an hourglass). */
export const boxIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" aria-hidden="true">${box(null)}</svg>`;
export const waitIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><path d="M16 8H48M16 56H48" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M20 10Q20 26 32 32Q44 26 44 10ZM20 54Q20 38 32 32Q44 38 44 54Z" fill="#e3f5ff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M26 50Q32 42 38 50Z" fill="#f2b05e"/></svg>`;
