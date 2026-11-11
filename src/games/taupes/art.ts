import type { Fail } from '../../engines/taupes';
import type { Locale } from '../../shell/i18n';
/** Drawings of « Les taupes de Tutu », in the ink and rounded strokes of the guides (src/characters). A cell is 100 units
 * wide; every drawing of a thing is centred on (0, 0), the middle of its cell, and stays within 50 units of it. Clods are
 * big brown mounds on the lawn, an open clod a pale bed with a flower, and the moles sleeping around it are counted with
 * little mole faces (a five-year-old counts up to four at a glance), the digit small beside them. */
export const U = 100;
export const INK = '#583746';
const n = (v: number): string => (Math.round(v * 100) / 100).toString();

/** The lawn under a clod; `x + y` alternates the shade so the cells can be counted. */
const lawn = (x: number, y: number): string => `<rect x="-50" y="-50" width="100" height="100" fill="${(x + y) % 2 ? '#9bd27f' : '#8cc970'}"/>`;
/** A clod of earth: a big round brown mound with a few crumbs and a blade of grass. */
export function clod(x: number, y: number): string {
    return lawn(x, y) + `<path d="M-42 34Q-44 -34 0 -38Q44 -34 42 34Z" fill="#9a6538" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
        + `<path d="M-26 -10Q-14 -24 2 -24" fill="none" stroke="#c48a55" stroke-width="5" stroke-linecap="round"/><circle cx="-14" cy="14" r="4" fill="#6f4526"/><circle cx="16" cy="2" r="3.5" fill="#6f4526"/><circle cx="6" cy="22" r="3" fill="#6f4526"/>`
        + `<path d="M-42 34H42" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
}
/** A flower: five petals round a yellow heart. */
export function flower(scale = 1, tint = '#ff8fc0'): string {
    return `<g transform="scale(${scale})">${[0, 72, 144, 216, 288].map(r => `<ellipse transform="rotate(${r}) translate(0 -14)" rx="10" ry="14" fill="${tint}" stroke="${INK}" stroke-width="3"/>`).join('')}<circle r="9" fill="#ffd23f" stroke="${INK}" stroke-width="3"/></g>`;
}
/** A little mole face: one per mole sleeping just next to an open flower. */
export const dot = (): string => `<circle r="12.5" fill="#5b3b2c" stroke="${INK}" stroke-width="2.5"/><path d="M-6 -3q2 -2 4 0M2 -3q2 -2 4 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><ellipse cy="5" rx="4.5" ry="3.5" fill="#ff8fa3"/>`;
const DOTS: Readonly<Record<number, readonly [number, number][]>> = {
    1: [[10, 10]], 2: [[-6, 24], [26, -6]], 3: [[-8, 26], [10, 8], [28, -10]], 4: [[-6, -6], [26, -6], [-6, 26], [26, 26]]
};
/** An open clod: a pale bed with a flower. With moles around, the flower moves to the top left and little mole faces
 * (one per mole) sit beside it, the digit small in the corner. */
export function open(x: number, y: number, count: number): string {
    const tint = ['#ff8fc0', '#b38cf0', '#ffffff'][(x * 2 + y) % 3]!;
    const bed = `<rect x="-50" y="-50" width="100" height="100" fill="${(x + y) % 2 ? '#f6ecd0' : '#efe2c0'}"/><rect x="-45" y="-45" width="90" height="90" rx="14" fill="none" stroke="#e0cb9e" stroke-width="3"/>`;
    if (!count) return `${bed}<path d="M0 8V36" stroke="#4f9a45" stroke-width="5" stroke-linecap="round"/><path d="M0 28Q-16 18 -20 30Q-8 36 0 28Z" fill="#5ab56b" stroke="${INK}" stroke-width="2"/><g transform="translate(0 -4)" class="taupes-fleur">${flower(1.2, tint)}</g>`;
    const dots = (DOTS[count] ?? DOTS[4]!).map(([dx, dy]) => `<g transform="translate(${dx} ${dy})">${dot()}</g>`).join('');
    return `${bed}<g transform="translate(-28 -28)" class="taupes-fleur">${flower(.62, tint)}</g><g data-dots="${count}">${dots}</g>`
        + `<text x="-30" y="40" text-anchor="middle" font-size="24" font-weight="900" fill="${INK}" font-family="inherit">${count}</text>`;
}
/** A rock: a big grey boulder, nothing to dig under it. */
export function rock(x: number, y: number): string {
    return lawn(x, y) + `<g class="taupes-caillou"><path d="M-40 30Q-46 -8 -18 -30Q8 -44 30 -24Q48 -6 40 30Z" fill="#a6a6ad" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
        + `<path d="M-22 -12Q-8 -24 8 -20M14 6Q24 0 28 10" fill="none" stroke="#d6d6dc" stroke-width="5" stroke-linecap="round"/><path d="M-40 30H40" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`;
}
/** A carrot pushed into a clod, its green top up. */
export function carrot(): string {
    return `<g transform="rotate(14)"><path d="M-14 -16L14 -16L0 34Z" fill="#f28a2e" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M-6 -2h8M-2 12h6" stroke="#c96a1e" stroke-width="3" stroke-linecap="round"/>`
        + `<path d="M0 -16Q-14 -36 -8 -44Q0 -30 0 -16Q4 -40 10 -46Q12 -30 0 -16Q16 -32 22 -30Q14 -18 0 -16Z" fill="#5ab56b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>`;
}
/** A mole poking its head out of its hole: brown velvet, a pink nose, little pink paws. `awake`: eyes open (the party),
 * otherwise sleepy eyes and a yawn. */
export function mole(awake: boolean): string {
    const eyes = awake ? `<circle cx="-11" cy="-10" r="4.5" fill="${INK}"/><circle cx="11" cy="-10" r="4.5" fill="${INK}"/><circle cx="-9.5" cy="-11.5" r="1.6" fill="#fff"/><circle cx="12.5" cy="-11.5" r="1.6" fill="#fff"/>`
        : `<path d="M-16 -10q5 4 10 0M6 -10q5 4 10 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    const mouth = awake ? `<path d="M-8 12Q0 20 8 12" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` : `<ellipse class="taupes-bouche" cy="14" rx="7" ry="8" fill="#a8324a" stroke="${INK}" stroke-width="2.5"/>`;
    return `<ellipse cy="36" rx="40" ry="12" fill="#5b3b20"/><path d="M-30 40Q-34 -26 0 -28Q34 -26 30 40Z" fill="#6b4a3a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
        + `<ellipse cx="0" cy="8" rx="20" ry="16" fill="#9a7563"/>${eyes}<ellipse cy="2" rx="8" ry="6" fill="#ff8fa3" stroke="${INK}" stroke-width="2.5"/>${mouth}`
        + `<path d="M-30 30q-10 -4 -12 6q8 6 14 0M30 30q10 -4 12 6q-8 6 -14 0" fill="#ffb3c2" stroke="${INK}" stroke-width="2.5"/>`;
}
/** A rabbit hopping away with the carrot. */
export function rabbit(): string {
    return `<path d="M-10 -30Q-18 -66 -8 -70Q2 -66 -2 -30ZM6 -30Q8 -66 18 -68Q26 -62 14 -28Z" fill="#f4f0ee" stroke="${INK}" stroke-width="3.5"/><path d="M-6 -36Q-10 -58 -7 -62M10 -36Q14 -56 17 -60" stroke="#ffb3c2" stroke-width="4" stroke-linecap="round"/>`
        + `<ellipse cy="14" rx="28" ry="22" fill="#f4f0ee" stroke="${INK}" stroke-width="3.5"/><circle cy="-16" r="20" fill="#f4f0ee" stroke="${INK}" stroke-width="3.5"/><circle cx="-7" cy="-20" r="3.5" fill="${INK}"/><circle cx="7" cy="-20" r="3.5" fill="${INK}"/><ellipse cy="-10" rx="4" ry="3" fill="#ff8fa3"/>`
        + `<g transform="translate(18 -4) rotate(80) scale(.55)">${carrot()}</g>`;
}
/** An earthworm popping out of the lawn to wave. */
export function worm(): string {
    return `<ellipse cy="40" rx="20" ry="7" fill="#6f4526"/><path d="M0 40Q-12 16 2 0Q14 -16 0 -30" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round"/><path d="M0 40Q-12 16 2 0Q14 -16 0 -30" fill="none" stroke="#ff9db5" stroke-width="14" stroke-linecap="round"/>`
        + `<path d="M-6 18h10M2 4h10M-2 -12h8" stroke="#e7708f" stroke-width="3" stroke-linecap="round"/><circle cx="-4" cy="-32" r="3" fill="${INK}"/><circle cx="5" cy="-32" r="3" fill="${INK}"/><path d="M-4 -24Q0 -20 4 -24" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
}
/** A puff of pollen sneezed by a flower. */
export const pollen = (): string => [[-22, -20, 7], [18, -26, 6], [-30, 6, 5], [26, 4, 7], [0, -36, 5], [-8, 24, 4], [14, 26, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffd23f" stroke="#e0a800" stroke-width="1.5"/>`).join('');
/** A ladybird sitting on a rock, who flies off when it is knocked. */
export const ladybird = (): string => `<g transform="translate(14 -32)"><ellipse rx="12" ry="10" fill="#e8463c" stroke="${INK}" stroke-width="2.5"/><path d="M0 -10V10" stroke="${INK}" stroke-width="2"/><circle cx="-5" cy="-2" r="2.5" fill="${INK}"/><circle cx="5" cy="3" r="2.5" fill="${INK}"/><circle cx="12" cy="-4" r="5" fill="${INK}"/></g>`;
/** Little stars round a carrot that jumps. */
export const sparkle = (): string => [[-30, -30], [30, -24], [-26, 24], [28, 28]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.4)" d="M0 -20L5 -5L20 0L5 5L0 20L-5 5L-20 0L-5 -5Z" fill="#ffd23f" stroke="${INK}" stroke-width="4"/>`).join('');
/** The help: a golden ring round the clod to dig. */
export const shine = (): string => '<circle class="taupes-brille" r="44" fill="#fff3a0" fill-opacity=".25" stroke="#f5b400" stroke-width="8"/>';
/** Confetti for the party. */
export function confetti(seed: number): string {
    const colours = ['#e8463c', '#ffd23f', '#5ab56b', '#4d95c6', '#9b6bd3', '#ff8fc0'];
    return Array.from({ length: 7 }, (_, i) => {
        const a = (seed * 37 + i * 71) % 360, r = 12 + (seed * 13 + i * 29) % 30, x = Math.cos(a * Math.PI / 180) * r, y = Math.sin(a * Math.PI / 180) * r;
        return `<rect x="${n(x - 5)}" y="${n(y - 3)}" width="10" height="6" rx="1.5" transform="rotate(${(a * 3) % 180} ${n(x)} ${n(y)})" fill="${colours[(seed + i) % colours.length]}"/>`;
    }).join('');
}
/** Each funny try has its own animation of the thing touched (a CSS class of src/style.css), and Tutu his own reaction. */
export const funnyAnimations: Readonly<Record<Fail, string>> = {
    baille: 'taupes-baille', lapin: 'taupes-lapin', pollen: 'taupes-atchoum', galipette: 'taupes-galipette', saute: 'taupes-saute', ver: 'taupes-ver', rocher: 'taupes-toc'
};
export const tutuAnimations: Readonly<Record<Fail, string>> = {
    baille: 'taupes-tutu-chut', lapin: 'taupes-tutu-surpris', pollen: 'taupes-tutu-rit', galipette: 'taupes-tutu-roule', saute: 'taupes-tutu-saute', ver: 'taupes-tutu-salue', rocher: 'taupes-tutu-aie'
};
/** The word in the bubble. */
export const funnyWords: Readonly<Record<Locale, Readonly<Record<Fail, string>>>> = {
    fr: { baille: 'Chut !', lapin: 'Hop hop !', pollen: 'Atchoum !', galipette: 'Youpi !', saute: 'Boing !', ver: 'Coucou !', rocher: 'Toc !' },
    en: { baille: 'Shh!', lapin: 'Hop hop!', pollen: 'Atchoo!', galipette: 'Wheee!', saute: 'Boing!', ver: 'Hello!', rocher: 'Knock!' }
};
export const bubbleWidth = (word: string): number => Math.max(90, word.length * 19 + 30);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="taupes-bulle"><path d="M${-w / 2} -96H${w / 2}Q${w / 2 + 10} -96 ${w / 2 + 10} -84V-52Q${w / 2 + 10} -40 ${w / 2} -40H12L0 -26L-6 -40H${-w / 2}Q${-w / 2 - 10} -40 ${-w / 2 - 10} -52V-84Q${-w / 2 - 10} -96 ${-w / 2} -96Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="0" y="-56" text-anchor="middle" font-size="34" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
/** Tool icons: a spade and a carrot. */
export const spadeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" aria-hidden="true"><path d="M-4 -46h8v50h-8Z" fill="#c98b4d" stroke="${INK}" stroke-width="4"/><path d="M-16 -46h32" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-20 2H20V24Q20 44 0 48Q-20 44 -20 24Z" fill="#b7c3cc" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></svg>`;
export const carrotIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" aria-hidden="true"><g transform="scale(1.1)">${carrot()}</g></svg>`;
