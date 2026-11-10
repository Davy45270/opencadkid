import type { Fail, FoodKind, Ground } from '../../engines/chenille';
/** Drawings of « La chenille de Lumi », in the ink and rounded strokes of the guides (src/characters). A cell is 100 units
 * wide; every drawing of a thing is centred on (0, 0), the middle of its cell, and stays within 48 units of it. */
export const U = 100;
export const INK = '#583746';
/** The leaves of the rainbow: each has its colour and as many dots as its place in the rainbow, never the colour alone. */
export const RAINBOW_COLOURS = ['#e2384f', '#f08a24', '#f2c21b', '#3fae55', '#2f86e0', '#8d5bc7'] as const;
const LEAF = 'M0 -34C22 -26 30 -2 18 18C10 30 -2 34 -6 34C-14 22 -26 6 -22 -12C-18 -26 -8 -32 0 -34Z';
const VEIN = 'M-6 34Q-2 6 0 -30M-2 4L-14 -6M0 -12L10 -20M-4 18L10 10';
/** A plain leaf. Every plain leaf of a scene is drawn the same way: they are all worth the same. */
export function leaf(fill = '#5fbf4a', light = '#a8e38f'): string {
    return `<g transform="rotate(20)"><path d="${LEAF}" fill="${fill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="${VEIN}" fill="none" stroke="${light}" stroke-width="3.5" stroke-linecap="round"/></g>`;
}
/** A sweet leaf: pink, with sugar sparkles round it. */
export function sweetLeaf(): string {
    return `${leaf('#ff8fbf', '#ffd6e8')}${[[-30, -26], [30, -18], [26, 28]].map(([x, y]) => `<path transform="translate(${x} ${y})" d="M0 -9L2.5 -2.5L9 0L2.5 2.5L0 9L-2.5 2.5L-9 0L-2.5 -2.5Z" fill="#fff6a8" stroke="${INK}" stroke-width="2"/>`).join('')}`;
}
/** An apple: red, with a bite-sized shine and a leaf on its stalk. */
export function apple(): string {
    return `<path d="M0 -18C-6 -26 -30 -26 -30 0C-30 22 -14 34 0 28C14 34 30 22 30 0C30 -26 6 -26 0 -18Z" fill="#e2384f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M0 -18Q2 -30 8 -34" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M6 -28Q18 -38 24 -26Q12 -22 6 -28Z" fill="#5fbf4a" stroke="${INK}" stroke-width="2.5"/><ellipse cx="-14" cy="-6" rx="5" ry="9" fill="#fff" opacity=".5"/>`;
}
/** A leaf of the rainbow, of rank 1 to 6, with its dots. */
export function rainbowLeaf(rank: number): string {
    const c = RAINBOW_COLOURS[rank - 1]!, dots = Array.from({ length: rank }, (_, i) => { const col = i % 3, row = Math.floor(i / 3); return `<circle cx="${-9 + col * 9}" cy="${-6 + row * 11}" r="4" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`; }).join('');
    return `<g transform="rotate(20)"><path d="${LEAF}" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>${dots}`;
}
export function food(kind: FoodKind, rank: number): string {
    return kind === 'feuille' ? leaf() : kind === 'sucree' ? sweetLeaf() : kind === 'pomme' ? apple() : rainbowLeaf(rank);
}
/** Two eyes that open on a stone when the caterpillar stares at it (`chenille-yeux-caillou` shows them). */
const stoneEyes = `<g class="chenille-yeux"><circle cx="-12" cy="-4" r="8" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="12" cy="-4" r="8" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="-12" cy="-3" r="3.5" fill="${INK}"/><circle cx="12" cy="-3" r="3.5" fill="${INK}"/></g>`;
/** The ground of a cell. `x + y` alternates the grass so the cells can be counted. */
export function ground(kind: Ground, x: number, y: number): string {
    const grass = `<rect x="-50" y="-50" width="100" height="100" fill="${(x + y) % 2 ? '#b5e08f' : '#a9d983'}"/>`;
    switch (kind) {
        case 'haie': return `<rect x="-50" y="-50" width="100" height="100" fill="#4f9a4a"/><g fill="#6cbd5c" stroke="${INK}" stroke-width="3"><circle cx="-22" cy="-20" r="22"/><circle cx="22" cy="-20" r="22"/><circle cx="-22" cy="22" r="22"/><circle cx="22" cy="22" r="22"/><circle r="20"/></g>`;
        case 'caillou': return grass + `<g class="chenille-caillou"><path d="M-36 24Q-40 -10 -14 -26Q12 -36 32 -16Q44 8 30 26Z" fill="#a9a2b5" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-20 -12Q-8 -22 6 -20" fill="none" stroke="#d9d4e2" stroke-width="5" stroke-linecap="round"/>${stoneEyes}</g>`;
        case 'flaque': return grass + `<path d="M-42 4Q-46 -30 -10 -34Q30 -40 42 -10Q50 24 16 36Q-36 42 -42 4Z" fill="#76c3ee" stroke="#4a9fd0" stroke-width="3"/><path d="M-24 -8q8 -6 16 0t16 0M-4 16q8 -6 16 0" fill="none" stroke="#e1f4ff" stroke-width="4" stroke-linecap="round"/>`;
        case 'fleur': return grass + `<g class="chenille-fleur"><path d="M0 40V8" stroke="#3f8f3a" stroke-width="5" stroke-linecap="round"/><path d="M0 26Q14 14 22 22Q12 32 0 26Z" fill="#5fbf4a" stroke="${INK}" stroke-width="2"/>${[0, 72, 144, 216, 288].map(r => `<ellipse transform="rotate(${r} 0 -12)" cy="-28" rx="11" ry="15" fill="#ffb3d1" stroke="${INK}" stroke-width="3"/>`).join('')}<circle cy="-12" r="10" fill="#ffe381" stroke="${INK}" stroke-width="3"/></g>`;
        case 'trou': return grass + `<ellipse rx="42" ry="34" fill="#8a5a2e" stroke="${INK}" stroke-width="4"/><ellipse cy="4" rx="30" ry="22" fill="#2e1c10"/><path d="M-34 -24q8 -10 18 -6M16 -30q10 -2 16 8" fill="none" stroke="#c99a6a" stroke-width="4" stroke-linecap="round"/>`;
        case 'pont': return grass + `<path d="M-50 -6H50V6H-50Z" fill="#c9b48a" opacity=".6"/><path d="M-30 -50V50M30 -50V50" stroke="#8a5a2e" stroke-width="6"/><g fill="#d9a066" stroke="${INK}" stroke-width="3">${[-40, -20, 0, 20, 40].map(y => `<rect x="-34" y="${y - 8}" width="68" height="16" rx="4"/>`).join('')}</g>`;
        case 'cocon': return grass;
        default: return grass;
    }
}
/** The cocoon on its twig. It glows and opens a little once every leaf is eaten (`data-ready` on its group). */
export function cocoon(): string {
    return `<path d="M-40 -42H40" stroke="#8a5a2e" stroke-width="7" stroke-linecap="round"/><path d="M0 -42V-30" stroke="#d8cfc0" stroke-width="3"/><g class="chenille-cocon"><ellipse class="chenille-halo" cy="4" rx="32" ry="42" fill="#fff6a8"/><path d="M0 -32C20 -32 26 -6 24 12C22 32 10 42 0 42C-10 42 -22 32 -24 12C-26 -6 -20 -32 0 -32Z" fill="#f3ead8" stroke="${INK}" stroke-width="4"/><path d="M-20 -10Q0 -2 20 -12M-23 8Q0 16 23 6M-18 26Q0 32 18 24" fill="none" stroke="#cbbfa6" stroke-width="3" stroke-linecap="round"/></g>`;
}
/** The butterfly that flies off the cocoon at the end. */
export function butterfly(): string {
    const wing = (s: number): string => `<path transform="scale(${s} 1)" d="M2 -4C14 -34 46 -30 40 -6C36 8 18 6 2 0ZM2 4C16 6 34 14 28 30C20 42 6 26 2 8Z" fill="#ffb3d1" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><circle transform="scale(${s} 1)" cx="24" cy="-14" r="6" fill="#ffe381"/>`;
    return `<g class="chenille-papillon"><g class="chenille-aile">${wing(1)}</g><g class="chenille-aile chenille-aile-g">${wing(-1)}</g><ellipse rx="5" ry="20" fill="#5fbf4a" stroke="${INK}" stroke-width="3"/><path d="M-2 -18Q-8 -30 -14 -32M2 -18Q8 -30 14 -32" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/></g>`;
}
/** A ring of the caterpillar's body; the last one is a little smaller. */
export function ring(tail: boolean): string {
    const r = tail ? 38 : 46;
    return `<circle r="${r}" fill="#7ccf5a" stroke="${INK}" stroke-width="4"/><path d="M${-r * .6} ${-r * .2}Q0 ${-r * .7} ${r * .6} ${-r * .2}" fill="none" stroke="#b8ef8f" stroke-width="5" stroke-linecap="round"/><circle cx="${-r * .35}" cy="${r * .3}" r="${r * .14}" fill="#ffe381"/><circle cx="${r * .35}" cy="${r * .3}" r="${r * .14}" fill="#ffe381"/>`;
}
/** The head: antennae, eyes that look where it goes (`look` moves the pupils), and the faces of its funny tries: happy,
 * surprised, crying with laughter, dizzy, sneezing. */
export function head(look: [number, number] = [0, 0]): string {
    const [lx, ly] = look;
    return `<path d="M-16 -36Q-24 -58 -34 -60M16 -36Q24 -58 34 -60" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="-34" cy="-60" r="7" fill="#ff8fbf" stroke="${INK}" stroke-width="3"/><circle cx="34" cy="-60" r="7" fill="#ff8fbf" stroke="${INK}" stroke-width="3"/>`
        + `<circle r="46" fill="#8fdc63" stroke="${INK}" stroke-width="4.5"/><circle cx="-26" cy="12" r="8" fill="#ff9fbf" opacity=".7"/><circle cx="26" cy="12" r="8" fill="#ff9fbf" opacity=".7"/>`
        + `<g class="chenille-face-joie"><circle cx="-15" cy="-10" r="11" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="15" cy="-10" r="11" fill="#fff" stroke="${INK}" stroke-width="3"/><g class="chenille-pupilles" transform="translate(${lx * 4} ${ly * 4})"><circle cx="-15" cy="-10" r="5" fill="${INK}"/><circle cx="15" cy="-10" r="5" fill="${INK}"/></g><path d="M-12 14Q0 26 12 14" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`
        + `<g class="chenille-face-surprise"><circle cx="-15" cy="-10" r="13" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="15" cy="-10" r="13" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="-15" cy="-10" r="4" fill="${INK}"/><circle cx="15" cy="-10" r="4" fill="${INK}"/><ellipse cy="18" rx="7" ry="9" fill="${INK}"/></g>`
        + `<g class="chenille-face-rire"><path d="M-24 -10Q-15 -20 -6 -10M6 -10Q15 -20 24 -10" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M-16 8Q0 32 16 8Z" fill="${INK}"/><path d="M-30 -2q-4 8 0 12M30 -2q4 8 0 12" fill="none" stroke="#9fd3ff" stroke-width="4" stroke-linecap="round"/></g>`
        + `<g class="chenille-face-tournis"><path d="M-15 -10m-8 0a8 8 0 1 1 8 8a5 5 0 1 1 -4 -5M15 -10m-8 0a8 8 0 1 1 8 8a5 5 0 1 1 -4 -5" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M-10 18Q0 12 10 18" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`
        + `<g class="chenille-face-atchoum"><path d="M-24 -10L-8 -6M24 -10L8 -6" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><ellipse cy="16" rx="10" ry="7" fill="${INK}"/></g>`;
}
/** A big arrow in a neighbouring cell, pointing where the head would go. */
export function arrow(rotation: number): string {
    return `<g transform="rotate(${rotation})"><path d="M-26 12H4V30L36 0L4 -30V-12H-26Z" fill="#ffffffcc" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>`;
}
/** A round arrow going back: the free « back » button. */
export const backArrow = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 22H40Q54 22 54 36Q54 50 40 50H22" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M24 8L8 22L24 36Z" fill="#8d68a0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></svg>`;
/** The « I turn round » button: a little caterpillar with a curved arrow from its tail to its head. */
export const turnIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><circle cx="14" cy="44" r="8" fill="#7ccf5a" stroke="${INK}" stroke-width="3"/><circle cx="30" cy="44" r="9" fill="#7ccf5a" stroke="${INK}" stroke-width="3"/><circle cx="48" cy="42" r="11" fill="#8fdc63" stroke="${INK}" stroke-width="3"/><circle cx="51" cy="39" r="2.5" fill="${INK}"/><path d="M48 24Q32 4 14 24" fill="none" stroke="#8d68a0" stroke-width="6" stroke-linecap="round"/><path d="M6 18L14 32L22 18Z" fill="#8d68a0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></svg>`;
/** A speech bubble with a sound word (Boing, Atchoum…), above a cell. */
export const bubbleWidth = (word: string): number => Math.max(90, word.length * 19 + 30);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="chenille-bubble"><path d="M${-w / 2} -96H${w / 2}Q${w / 2 + 10} -96 ${w / 2 + 10} -84V-52Q${w / 2 + 10} -40 ${w / 2} -40H12L0 -26L-6 -40H${-w / 2}Q${-w / 2 - 10} -40 ${-w / 2 - 10} -52V-84Q${-w / 2 - 10} -96 ${-w / 2} -96Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="0" y="-56" text-anchor="middle" font-size="34" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
/** What flies around a funny try, drawn on the cell of the try (or on the head for `corps` and `demitour`). */
export const effects: Readonly<Partial<Record<Fail, string>>> = {
    mur: `<g class="chenille-etoiles">${[[-30, -40], [0, -54], [30, -40]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.4)" d="M0 -26L7.6 -9.4L25.7 -8L12 3.8L16 21.5L0 12.2L-16 21.5L-12 3.8L-25.7 -8L-7.6 -9.4Z" fill="#ffe381" stroke="${INK}" stroke-width="5"/>`).join('')}</g>`,
    flaque: `<g class="chenille-eclat"><ellipse rx="36" ry="12" fill="none" stroke="#fff" stroke-width="5"/><path d="M-18 -6L-26 -30M0 -10V-38M18 -6L26 -30" stroke="#cfeaff" stroke-width="6" stroke-linecap="round"/></g>`,
    fleur: `<g class="chenille-eclat">${[[-24, -30], [20, -36], [0, -50], [30, -14], [-32, -10]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#ffe381" stroke="${INK}" stroke-width="1.5"/>`).join('')}</g>`,
    corps: `<g class="chenille-eclat"><path d="M-40 -40q6 -8 12 0t12 0M20 -44q6 -8 12 0t12 0" fill="none" stroke="#ff8fbf" stroke-width="4" stroke-linecap="round"/></g>`,
    demitour: `<g class="chenille-eclat"><path d="M-20 -60a14 10 0 1 1 28 0a10 7 0 1 1 -20 0" fill="none" stroke="#8d68a0" stroke-width="4" stroke-linecap="round"/></g>`
};
/** Each funny try has its own animation of the caterpillar's head, named after its CSS keyframes in style.css. */
export const failAnimations: Readonly<Record<Fail, string>> = {
    mur: 'chenille-frotte', caillou: 'chenille-fixe', corps: 'chenille-rit', demitour: 'chenille-tournis', flaque: 'chenille-brr',
    fleur: 'chenille-atchoum', couleur: 'chenille-secoue', cocon: 'chenille-ventre'
};
/** The face the head shows during each funny try. */
export const failFaces: Readonly<Record<Fail, 'surprise' | 'rire' | 'tournis' | 'atchoum'>> = {
    mur: 'surprise', caillou: 'surprise', corps: 'rire', demitour: 'tournis', flaque: 'surprise', fleur: 'atchoum', couleur: 'surprise', cocon: 'surprise'
};
/** What the thing on the cell of the try does: the stone stares back, the leaf shakes its head, the cocoon wobbles. */
export const thingAnimations: Readonly<Partial<Record<Fail, string>>> = { caillou: 'chenille-regard', couleur: 'chenille-non', cocon: 'chenille-pas-encore', fleur: 'chenille-balance' };
/** The sound word of each funny try, in its bubble. */
export const failWords: Readonly<Record<'fr' | 'en', Record<Fail, string>>> = {
    fr: { mur: 'Boing !', caillou: 'Oh !', corps: 'Hihi !', demitour: 'Oh là là', flaque: 'Brrr !', fleur: 'Atchoum !', couleur: 'Non non', cocon: 'Grrr…' },
    en: { mur: 'Boing!', caillou: 'Oh!', corps: 'Hee hee!', demitour: 'Oh dear', flaque: 'Brrr!', fleur: 'Atishoo!', couleur: 'No no', cocon: 'Rumble…' }
};
