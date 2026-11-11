import type { Fail } from '../../engines/essaim';
/** Drawings of « Le voyage de Boubou », in the ink and rounded strokes of the guides (src/characters). A lane is 100 units
 * wide; every thing is drawn centred on (0, 0). Each thing has its own shape (a star, a cat's ears, a robot's antenna, a
 * rock's bumps, a bubble's shine), so that two things never differ by colour alone. */
export const U = 100;
export const INK = '#46364a';
const STAR = 'M0 -40L11.8 -14.5L39.6 -12.4L18.6 5.9L24.8 33.2L0 18.8L-24.8 33.2L-18.6 5.9L-39.6 -12.4L-11.8 -14.5Z';
const eyes = (y: number, gap: number, r = 4.5): string => `<circle cx="${-gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${-gap + 1.6}" cy="${y - 1.6}" r="1.6" fill="#fff"/><circle cx="${gap + 1.6}" cy="${y - 1.6}" r="1.6" fill="#fff"/>`;
const smile = (y: number, w: number): string => `<path d="M${-w} ${y}Q0 ${y + w} ${w} ${y}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
const cheeks = (y: number, gap: number): string => `<circle cx="${-gap}" cy="${y}" r="5" fill="#ff9fbf" opacity=".8"/><circle cx="${gap}" cy="${y}" r="5" fill="#ff9fbf" opacity=".8"/>`;
/** A big golden star with a happy face. */
export function star(): string {
    return `<g class="essaim-scintille"><path d="${STAR}" fill="#ffd23f" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>${eyes(0, 9, 3.6)}${cheeks(8, 17)}${smile(8, 7)}</g>`;
}
/** Boubou's face in the window: the panda with his tuft of hair (it stands up when a comet brushes past). */
export function boubou(happy = true): string {
    return `<g class="essaim-meche"><path d="M-4 -26Q-10 -40 -2 -44M2 -26Q4 -42 12 -42M-2 -26Q-2 -38 4 -46" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`
        + `<circle cx="-17" cy="-17" r="9" fill="${INK}"/><circle cx="17" cy="-17" r="9" fill="${INK}"/><circle r="24" fill="#fff" stroke="${INK}" stroke-width="3.5"/>`
        + `<ellipse cx="-9" cy="-2" rx="7" ry="8.5" fill="${INK}"/><ellipse cx="9" cy="-2" rx="7" ry="8.5" fill="${INK}"/><circle cx="-8" cy="-3" r="2.6" fill="#fff"/><circle cx="10" cy="-3" r="2.6" fill="#fff"/>`
        + `<ellipse cx="0" cy="8" rx="4" ry="3" fill="${INK}"/>` + (happy ? smile(12, 6) : `<circle cx="0" cy="16" r="3.5" fill="${INK}"/>`);
}
/** Boubou's little round rocket, going up (towards -y): fins, a window with Boubou inside, a soft flame. The window can get
 * dusty (`.essaim-vitre-poussiere`). */
export function rocket(): string {
    return `<g class="essaim-flamme"><path d="M-16 40Q0 86 16 40Z" fill="#ffb627" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-7 42Q0 66 7 42Z" fill="#fff3a0"/></g>`
        + `<path d="M-34 14L-52 44L-24 34Z" fill="#4dabf7" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M34 14L52 44L24 34Z" fill="#4dabf7" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
        + `<path d="M0 -62Q44 -40 42 10Q40 44 0 44Q-40 44 -42 10Q-44 -40 0 -62Z" fill="#ff6b6b" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`
        + `<path d="M-30 -20Q-26 -36 -12 -46" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>`
        + `<g transform="translate(0 -2)"><circle r="31" fill="#bfe4ff" stroke="${INK}" stroke-width="4.5"/><g transform="scale(.95)">${boubou()}</g>`
        + `<g class="essaim-vitre-poussiere"><circle r="29" fill="#9b8f84" opacity=".75"/><circle cx="-10" cy="-8" r="4" fill="#6f655c"/><circle cx="8" cy="6" r="5" fill="#6f655c"/><circle cx="12" cy="-12" r="3" fill="#6f655c"/></g></g>`;
}
/** A lost little rocket, a space kitten in its bubble helmet, a little robot: the three friends. */
export function friend(kind: string): string {
    switch (kind) {
        case 'C': return `<path d="M-30 -12L-30 -42L-10 -28Z" fill="#ffa94d" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M30 -12L30 -42L10 -28Z" fill="#ffa94d" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle r="32" fill="#ffa94d" stroke="${INK}" stroke-width="4.5"/><path d="M-12 -30Q0 -24 12 -30M0 -32V-22" fill="none" stroke="#e8762b" stroke-width="4" stroke-linecap="round"/>${eyes(-2, 12, 5)}<path d="M-5 9L5 9L0 14Z" fill="#ff6f9a" stroke="${INK}" stroke-width="2"/><path d="M0 14Q-6 21 -11 16M0 14Q6 21 11 16" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M-40 6H-20M-40 14H-20M40 6H20M40 14H20" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><circle r="44" fill="#bfe4ff" opacity=".25" stroke="#7fb2d9" stroke-width="3"/>`;
        case 'R': return `<path d="M0 -34V-46" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cy="-48" r="6" fill="#ff6b6b" stroke="${INK}" stroke-width="3"/><rect x="-32" y="-34" width="64" height="56" rx="14" fill="#b0bec5" stroke="${INK}" stroke-width="4.5"/><rect x="-24" y="-24" width="48" height="26" rx="10" fill="#e3f2fd" stroke="${INK}" stroke-width="3"/>${eyes(-11, 11, 5)}<path d="M-12 10H12" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><rect x="-40" y="-12" width="8" height="20" rx="4" fill="#90a4ae" stroke="${INK}" stroke-width="3"/><rect x="32" y="-12" width="8" height="20" rx="4" fill="#90a4ae" stroke="${INK}" stroke-width="3"/><path d="M-20 22V36M20 22V36" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
        default: return `<path d="M-14 26Q0 50 14 26Z" fill="#ffb627" stroke="${INK}" stroke-width="3.5"/><path d="M-22 6L-34 30L-14 24Z M22 6L34 30L14 24Z" fill="#69db7c" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M0 -44Q30 -26 28 8Q26 30 0 30Q-26 30 -28 8Q-30 -26 0 -44Z" fill="#b197fc" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/><circle cy="-4" r="17" fill="#fff" stroke="${INK}" stroke-width="3.5"/>${eyes(-6, 6, 3.6)}${smile(2, 5)}`;
    }
}
/** The rainbow gate: an arch of six colours on two little pillars; open, it sparkles. */
export function gate(open = false): string {
    const colours = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc'];
    return `<path d="M-46 34V-6A46 46 0 0 1 46 -6V34" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/>` + colours.map((c, i) => `<path d="M-46 34V-6A46 46 0 0 1 46 -6V34" fill="none" stroke="${c}" stroke-width="${16 - i * 2.6}" stroke-linecap="round"/>`).join('')
        + (open ? '' : `<path d="M-30 34V0A30 30 0 0 1 30 0V34Z" fill="#fff8" stroke="${INK}" stroke-width="3" stroke-dasharray="6 6"/>${eyes(4, 9, 3.6)}${smile(12, 6)}`);
}
/** A soft rock: lumpy, lilac, with a sleepy smile. */
export function rock(): string {
    return `<path d="M-38 10Q-44 -18 -22 -30Q-6 -44 14 -34Q40 -30 40 -4Q46 22 22 32Q-2 42 -22 32Q-40 28 -38 10Z" fill="#c4a7e7" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/><circle cx="-16" cy="-14" r="6" fill="#a98bd1"/><circle cx="20" cy="14" r="8" fill="#a98bd1"/><path d="M-14 0Q-10 -4 -6 0M6 0Q10 -4 14 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>${smile(10, 6)}`;
}
/** A cloud of dust, grey and puffy, full of specks. */
export function dust(): string {
    return `<g class="essaim-tourne"><path d="M-36 18Q-50 4 -36 -10Q-34 -32 -12 -30Q2 -44 20 -30Q42 -30 40 -8Q52 8 36 22Q20 36 0 28Q-20 36 -36 18Z" fill="#b8ab9e" stroke="${INK}" stroke-width="4" stroke-linejoin="round" opacity=".92"/>${[[-20, -8], [8, -16], [20, 8], [-6, 14], [-24, 12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#7d7065"/>`).join('')}</g>`;
}
/** A soap bubble: see-through, with a shine and rainbow glints. */
export function soapBubble(): string {
    return `<circle r="38" fill="#e7f6ff" fill-opacity=".45" stroke="#6fb7e6" stroke-width="4"/><path d="M-24 -14Q-20 -28 -6 -30" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M14 26Q26 20 30 8" fill="none" stroke="#ff9fbf" stroke-width="4" stroke-linecap="round"/><path d="M20 -24Q28 -18 30 -10" fill="none" stroke="#ffd43b" stroke-width="4" stroke-linecap="round"/>`;
}
/** A comet: a round icy head with a long glowing tail, falling slowly. */
export function comet(): string {
    return `<path d="M-6 -16Q-36 -60 -48 -86Q-16 -60 14 -18Z" fill="#9be7ff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" opacity=".9"/><path d="M-12 -8Q-50 -40 -60 -58Q-24 -36 4 -10Z" fill="#d0f4ff" stroke="${INK}" stroke-width="3" opacity=".85"/><circle r="22" fill="#e3f9ff" stroke="${INK}" stroke-width="4"/>${eyes(-2, 8, 3.4)}<circle cy="9" r="3" fill="${INK}"/>`;
}
/** A carpet of stars: a lane-wide band of little stars and big chevrons pointing the way it pushes (+x). */
export function carpet(): string {
    return `<rect x="-48" y="-26" width="96" height="52" rx="22" fill="#fff3bf" stroke="#e0a800" stroke-width="4"/><g class="essaim-defile">${[-26, 2, 30].map(x => `<path d="M${x - 10} -14L${x + 6} 0L${x - 10} 14" fill="none" stroke="#f08c00" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</g>`
        + [[-36, -18], [-36, 18], [36, -18], [36, 18]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.18)" d="${STAR}" fill="#ffd43b" stroke="${INK}" stroke-width="8"/>`).join('');
}
/** The kind black hole: a dark swirl with a gentle face. */
export function blackHole(): string {
    return `<g class="essaim-tourbillon">${[40, 30, 20].map((r, i) => `<path d="M${-r} 0A${r} ${r} 0 1 1 ${r * .3} ${r * .95}" fill="none" stroke="${['#7048e8', '#5f3dc4', '#3b2a8a'][i]}" stroke-width="10" stroke-linecap="round"/>`).join('')}</g><circle r="17" fill="#241a4a" stroke="${INK}" stroke-width="3"/><path d="M-9 -3Q-6 -6 -3 -3M3 -3Q6 -6 9 -3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M-5 5Q0 10 5 5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
}
/** A friend already behind the rocket, faintly, where it was found: a heart says it waits for a hug. */
export function ghost(kind: string): string {
    return `<g opacity=".38" transform="scale(.7)">${friend(kind)}</g><path transform="translate(0 -36) scale(.5)" d="M0 26C-40 0 -34 -30 -16 -30C-7 -30 0 -22 0 -15C0 -22 7 -30 16 -30C34 -30 40 0 0 26Z" fill="#ff6f9a" stroke="${INK}" stroke-width="6"/>`;
}
/** The shooting star at the edge of the sky, with a little hand that waves. */
export function shootingStar(): string {
    return `<path d="M0 0L-8 40" stroke="#fff3a0" stroke-width="8" stroke-linecap="round" opacity=".7"/><path transform="scale(.45)" d="${STAR}" fill="#ffe066" stroke="${INK}" stroke-width="8"/><g class="essaim-main"><path d="M14 -8Q22 -18 26 -14Q24 -6 16 -2" fill="#ffe066" stroke="${INK}" stroke-width="3"/></g>`;
}
/** The home planet: green and round, with a little house and a flag. */
export function planet(): string {
    return `<circle r="150" fill="#8fd17a" stroke="${INK}" stroke-width="6"/><path d="M-120 -40Q-60 -70 0 -60Q60 -70 120 -40" fill="none" stroke="#6cbf5a" stroke-width="14" stroke-linecap="round"/><circle cx="-70" cy="30" r="22" fill="#6cbf5a"/><circle cx="60" cy="50" r="30" fill="#6cbf5a"/>`
        + `<g transform="translate(0 -148)"><rect x="-34" y="-46" width="68" height="46" fill="#fff3bf" stroke="${INK}" stroke-width="5"/><path d="M-46 -44L0 -84L46 -44Z" fill="#ff6b6b" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><rect x="-10" y="-30" width="20" height="30" rx="4" fill="#b197fc" stroke="${INK}" stroke-width="4"/><path d="M40 -46V-110" stroke="${INK}" stroke-width="5"/><path d="M40 -110L72 -98L40 -86Z" fill="#ffd43b" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>`;
}
/** A little twinkling dot of the night sky. */
export const twinkle = (r: number): string => `<circle r="${r}" fill="#fff" class="essaim-pique"/>`;
/** The goal icon in the row under the title: a star, a friend or the gate, grey until picked up. */
export const goalIcon = (kind: string): string => `<g transform="translate(32 32) scale(.62)">${kind === '*' ? `<path d="${STAR}" fill="#ffd23f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` : kind === 'P' ? gate(true) : friend(kind)}</g>`;
/** A speech bubble with a sound word (Boing, Atchoum…), above a point. */
export const bubbleWidth = (word: string): number => Math.max(90, word.length * 19 + 30);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="essaim-bulle-mot"><path d="M${-w / 2} -96H${w / 2}Q${w / 2 + 10} -96 ${w / 2 + 10} -84V-52Q${w / 2 + 10} -40 ${w / 2} -40H12L0 -26L-6 -40H${-w / 2}Q${-w / 2 - 10} -40 ${-w / 2 - 10} -52V-84Q${-w / 2 - 10} -96 ${-w / 2} -96Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="0" y="-56" text-anchor="middle" font-size="34" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
const heartPath = 'M0 26C-40 0 -34 -30 -16 -30C-7 -30 0 -22 0 -15C0 -22 7 -30 16 -30C34 -30 40 0 0 26Z';
const sparks = (fill: string): string => [[-34, -40], [0, -54], [34, -40]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.3)" d="${STAR}" fill="${fill}" stroke="${INK}" stroke-width="6"/>`).join('');
/** What flies around a funny try, drawn where it happens. */
export const effects: Readonly<Record<Fail, string>> = {
    rocher: `<g class="essaim-eclat">${sparks('#c4a7e7')}</g>`,
    poussiere: `<g class="essaim-eclat">${[[-30, -20], [0, -40], [30, -20], [-14, -54], [16, -58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#b8ab9e" stroke="${INK}" stroke-width="2.5"/>`).join('')}</g>`,
    bulle: `<g class="essaim-eclat">${[[-30, -30, 10], [26, -46, 14], [0, -64, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e7f6ff" stroke="#6fb7e6" stroke-width="3"/>`).join('')}</g>`,
    comete: `<g class="essaim-eclat">${sparks('#9be7ff')}</g>`,
    bord: `<g class="essaim-eclat">${sparks('#ffe066')}</g>`,
    calin: `<g class="essaim-eclat">${[[-30, -30], [0, -50], [30, -30]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.4)" d="${heartPath}" fill="#ff8fc0" stroke="${INK}" stroke-width="6"/>`).join('')}</g>`,
    porte: `<g class="essaim-eclat"><path d="M-36 -30q6 -10 12 0M24 -30q6 -10 12 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>${sparks('#ffd43b')}</g>`
};
/** Each funny try has its own animation of the rocket, named after its CSS keyframes in style.css. */
export const failAnimations: Readonly<Record<Fail, string>> = {
    rocher: 'essaim-fusee-toupie', poussiere: 'essaim-fusee-atchoum', bulle: 'essaim-fusee-flotte', comete: 'essaim-fusee-frisson',
    bord: 'essaim-fusee-rebond', calin: 'essaim-fusee-calin', porte: 'essaim-fusee-recule'
};
/** What the thing of the try does: the soft rock squishes, the dust puffs, the bubble wobbles, the comet zooms by, the
 * shooting star waves, the friend jumps forward for a hug, the gate giggles. */
export const thingAnimations: Readonly<Record<Fail, string>> = {
    rocher: 'essaim-rocher-mou', poussiere: 'essaim-poussiere-pouf', bulle: 'essaim-bulle-tremble', comete: 'essaim-comete-file',
    bord: 'essaim-filante-coucou', calin: 'essaim-ami-calin', porte: 'essaim-porte-rit'
};
/** The sound word of each funny try, in its bubble. */
export const failWords: Readonly<Record<'fr' | 'en', Record<Fail, string>>> = {
    fr: { rocher: 'Boing !', poussiere: 'Atchoum !', bulle: 'Flotte !', comete: 'Ouh !', bord: 'Coucou !', calin: 'Câlin !', porte: 'Hi hi !' },
    en: { rocher: 'Boing!', poussiere: 'Atchoo!', bulle: 'Float!', comete: 'Ooh!', bord: 'Peekaboo!', calin: 'Hug!', porte: 'Tee hee!' }
};
