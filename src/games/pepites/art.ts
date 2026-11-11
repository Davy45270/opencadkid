import type { Fail } from '../../engines/pepites';
/** Drawings of « Les pépites de Lumi », in the ink and rounded strokes of the guides (src/characters). A cell is 100 units
 * wide; every drawing of a thing is centred on (0, 0), the middle of its cell, and stays within 48 units of it. */
export const U = 100;
export const INK = '#583746';
const RAINBOW = ['#f789b6', '#ffc167', '#ffe381', '#80d6b0', '#83cbea'];
const STAR = 'M0 -26L7.6 -9.4L25.7 -8L12 3.8L16 21.5L0 12.2L-16 21.5L-12 3.8L-25.7 -8L-7.6 -9.4Z';
const eyes = (y: number, gap: number, r = 5): string => `<circle cx="${-gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${-gap + 2}" cy="${y - 2}" r="2" fill="#fff"/><circle cx="${gap + 2}" cy="${y - 2}" r="2" fill="#fff"/>`;

/** The ground of a cell: soft earth with pebbles, a dug gallery, roots or hard rock.
 * `x + y` alternates the shade so the cells can be counted. */
export function ground(kind: 'terre' | 'galerie' | 'racine' | 'dure', x: number, y: number): string {
    const odd = (x + y) % 2 === 1;
    switch (kind) {
        case 'terre': return `<rect x="-50" y="-50" width="100" height="100" fill="${odd ? '#c58a55' : '#bd824e'}"/><g fill="#9c6337"><circle cx="-24" cy="-18" r="4"/><circle cx="18" cy="-26" r="3"/><circle cx="26" cy="16" r="4"/><circle cx="-14" cy="22" r="3"/></g><path d="M-32 6q6 -4 12 0M6 30q6 -4 12 0" fill="none" stroke="#dba878" stroke-width="3" stroke-linecap="round"/>`;
        case 'galerie': return `<rect x="-50" y="-50" width="100" height="100" fill="${odd ? '#5a3a2a' : '#553626'}"/><path d="M-50 -50H50" stroke="#4a2d20" stroke-width="2"/>`;
        case 'racine': {
            return `<rect x="-50" y="-50" width="100" height="100" fill="#8a5a3a"/><g fill="none" stroke="#e9c79a" stroke-linecap="round"><path d="M-50 -20Q-20 -30 0 -6T50 -18" stroke-width="12"/><path d="M-10 -10Q-18 18 -40 50M20 -14Q30 10 24 50" stroke-width="8"/></g><g fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"><path d="M-50 -26Q-20 -36 0 -12T50 -24M-50 -14Q-20 -24 0 0T50 -12"/></g>`;
        }
        case 'dure': return `<g class="pepites-roc"><rect x="-50" y="-50" width="100" height="100" fill="#6d7488"/><g stroke="${INK}" stroke-width="3" stroke-linejoin="round"><path d="M-46 -46H6L-4 -6H-46Z" fill="#8e96ad"/><path d="M12 -46H46V0H2Z" fill="#a3abc0"/><path d="M-46 2H-6L4 46H-46Z" fill="#a3abc0"/><path d="M10 6H46V46H18Z" fill="#8e96ad"/></g><g class="pepites-dure-eclat" fill="#e3e8f5"><path d="M-30 -36l6 4-6 4zM28 -30l5 5-6 3zM-26 20l6 3-5 5zM30 22l5 4-6 4z"/></g></g>`;
    }
}
/** A rock: round, grey, with a crack, and two eyes that open when it is too heavy (`pepites-rocher-yeux` shows them). */
export function rock(): string {
    return `<ellipse cy="42" rx="36" ry="6" fill="#00000030"/><path d="M-38 30Q-46 -10 -18 -34Q12 -48 36 -22Q50 6 34 32Q0 46 -38 30Z" fill="#a9a2b5" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-20 -18Q-6 -30 10 -28" fill="none" stroke="#d9d4e2" stroke-width="6" stroke-linecap="round"/><path d="M18 8l8 8-4 10" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`
        + `<g class="pepites-rocher-yeux"><circle cx="-12" cy="-2" r="9" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="12" cy="-2" r="9" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="-12" cy="0" r="4" fill="${INK}"/><circle cx="12" cy="0" r="4" fill="${INK}"/><path d="M-6 18Q0 14 6 18" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`;
}
/** An apple: red, with a shine and a leaf on its stalk. */
export function apple(): string {
    return `<path d="M0 -18C-6 -26 -30 -26 -30 0C-30 22 -14 34 0 28C14 34 30 22 30 0C30 -26 6 -26 0 -18Z" fill="#e2384f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M0 -18Q2 -30 8 -34" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M6 -28Q18 -38 24 -26Q12 -22 6 -28Z" fill="#5fbf4a" stroke="${INK}" stroke-width="2.5"/><ellipse cx="-14" cy="-6" rx="5" ry="9" fill="#fff" opacity=".5"/>`;
}
/** A drop of water filling its cell, with little waves. */
export function water(): string {
    return `<path d="M-46 -30Q-46 -46 -30 -46H30Q46 -46 46 -30V30Q46 46 30 46H-30Q-46 46 -46 30Z" fill="#76c3ee" stroke="#3f8fc4" stroke-width="3"/><path d="M-30 -14q8 -6 16 0t16 0t16 0M-22 16q8 -6 16 0t16 0" fill="none" stroke="#e1f4ff" stroke-width="4" stroke-linecap="round"/>`;
}
/** A shining nugget: a golden crystal with a sparkle. */
export function nugget(): string {
    return `<circle r="30" fill="#fff6a8" opacity=".55"/><path d="M-22 6L-12 -18H12L22 6L0 26Z" fill="#ffd23f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-12 -18L-4 6L0 26M12 -18L4 6L0 26M-22 6H22" fill="none" stroke="#e8a50c" stroke-width="2.5"/><path d="M-8 -12L-14 2" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path class="pepites-scintille" transform="translate(22 -24) scale(.36)" d="${STAR}" fill="#fff" stroke="${INK}" stroke-width="5"/>`;
}
/** The giant nugget, as big as its cell; once knocked (`cracked`), a crack runs across it. */
export function giant(cracked: boolean): string {
    return `<circle r="46" fill="#fff6a8" opacity=".5"/><path d="M-40 10L-26 -32H26L40 10L0 42Z" fill="#ffc21f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M-26 -32L-8 10L0 42M26 -32L8 10L0 42M-40 10H40" fill="none" stroke="#e09a0a" stroke-width="3"/><path d="M-16 -24L-26 0" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`
        + (cracked ? `<path d="M-30 -20L-12 -6L-20 8L2 16L-4 30" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : '');
}
/** A friendly worm asleep in its hole (Zzz), which yawns when woken without an apple. */
export function worm(): string {
    return `<g class="pepites-ver"><path d="M-36 30Q-36 4 -16 6Q0 8 0 -8Q0 -30 22 -28Q40 -26 38 -6" fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round"/><path d="M-36 30Q-36 4 -16 6Q0 8 0 -8Q0 -30 22 -28Q40 -26 38 -6" fill="none" stroke="#ff9fbf" stroke-width="19" stroke-linecap="round"/><path d="M-30 14l10 4M-8 2l8 8M6 -20l8 6" stroke="#e8749a" stroke-width="3" stroke-linecap="round"/>`
        + `<circle cx="44" cy="-2" r="4" fill="#ff7fa8" opacity=".8"/><g class="pepites-ver-dort"><path d="M24 -14q4 3 8 0M34 -16q4 3 8 0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><text x="16" y="-38" font-size="20" font-weight="800" fill="#fff" stroke="${INK}" stroke-width="1" font-family="inherit">z</text></g>`
        + `<g class="pepites-ver-baille"><circle cx="27" cy="-16" r="4" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="38" cy="-17" r="4" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="27" cy="-16" r="1.8" fill="${INK}"/><circle cx="38" cy="-17" r="1.8" fill="${INK}"/><ellipse cx="34" cy="-2" rx="6" ry="8" fill="${INK}"/></g></g>`;
}
/** The round door of Lumi's burrow; it glows and opens a little once every nugget is picked up (`data-ready`). */
export function door(): string {
    return `<rect x="-50" y="-50" width="100" height="100" fill="#553626"/><g class="pepites-porte"><circle class="pepites-halo" r="46" fill="#fff6a8"/><circle r="40" fill="#e0a868" stroke="${INK}" stroke-width="5"/><path d="M-40 0H40M-26 -30V30M0 -40V40M26 -30V30" stroke="#b97c44" stroke-width="4"/><circle cx="22" cy="6" r="6" fill="#ffd23f" stroke="${INK}" stroke-width="3"/><path d="M-10 -52Q0 -66 10 -52" fill="none" stroke="#ff8fbf" stroke-width="5" stroke-linecap="round"/></g>`;
}
/** Lumi's little one in her miner's hat (a lamp on it), seen from the front: a happy face, a surprised one (funny tries), a
 * yawn-sleepy one never; water drops show when she gets wet. */
export function lumi(): string {
    const coat = '#fffaf6', side = (sx: number): string => RAINBOW.map((c, i) => `<circle cx="${sx * (24 + Math.abs(i - 2) * -3 + 6)}" cy="${-30 + i * 11}" r="10" fill="${c}" stroke="${INK}" stroke-width="2.5"/>`).join('');
    return `<ellipse cy="42" rx="26" ry="6" fill="#00000033"/><path d="M-16 14V36M-6 18V38M6 18V38M16 14V36" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M-16 14V36M-6 18V38M6 18V38M16 14V36" stroke="${coat}" stroke-width="5" stroke-linecap="round"/>`
        + `<ellipse cy="16" rx="24" ry="15" fill="${coat}" stroke="${INK}" stroke-width="4"/>${side(-1)}${side(1)}<path d="M-22 -24L-30 -44L-10 -32Z" fill="${coat}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M22 -24L30 -44L10 -32Z" fill="${coat}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cy="-6" r="25" fill="${coat}" stroke="${INK}" stroke-width="4"/>`
        + `<g class="pepites-face-joie">${eyes(-8, 10, 6)}<path d="M-7 8Q0 14 7 8" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`
        + `<g class="pepites-face-surprise"><circle cx="-10" cy="-8" r="7" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="10" cy="-8" r="7" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="-10" cy="-8" r="3" fill="${INK}"/><circle cx="10" cy="-8" r="3" fill="${INK}"/><ellipse cy="10" rx="3.5" ry="4" fill="${INK}"/></g>`
        + `<circle cx="-17" cy="4" r="4.5" fill="#ff9fbf" opacity=".7"/><circle cx="17" cy="4" r="4.5" fill="#ff9fbf" opacity=".7"/>`
        + `<g class="pepites-chapeau"><path d="M-24 -26Q-22 -48 0 -48Q22 -48 24 -26Z" fill="#ff8a5c" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-30 -26H30" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-30 -26H30" stroke="#e5603a" stroke-width="3" stroke-linecap="round"/><circle cx="-11" cy="-36" r="6" fill="#fffbe0" stroke="${INK}" stroke-width="3"/>`
        + `<path d="M-12 -44L0 -96L12 -44Z" fill="#ffc72c" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-8 -56L7 -61M-6 -68L5 -72M-3 -80L3 -82" stroke="#d98b00" stroke-width="3" stroke-linecap="round"/></g>`
        + `<g class="pepites-gouttes"><path d="M-36 -20q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/><path d="M36 -14q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/><path d="M-32 14q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/></g>`;
}
/** A big arrow in a neighbouring cell, pointing where Lumi would go. */
export function arrow(rotation: number): string {
    return `<g transform="rotate(${rotation})"><path d="M-26 12H4V30L36 0L4 -30V-12H-26Z" fill="#ffffffcc" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>`;
}
/** A round arrow going back: the free « back » button. */
export const backArrow = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 22H40Q54 22 54 36Q54 50 40 50H22" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M24 8L8 22L24 36Z" fill="#8d68a0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></svg>`;
/** A speech bubble with a sound word (Bonk, Bzzz…), above a cell. */
export const bubbleWidth = (word: string): number => Math.max(90, word.length * 19 + 30);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="pepites-bubble"><path d="M${-w / 2} -96H${w / 2}Q${w / 2 + 10} -96 ${w / 2 + 10} -84V-52Q${w / 2 + 10} -40 ${w / 2} -40H12L0 -26L-6 -40H${-w / 2}Q${-w / 2 - 10} -40 ${-w / 2 - 10} -52V-84Q${-w / 2 - 10} -96 ${-w / 2} -96Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="0" y="-56" text-anchor="middle" font-size="34" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
/** What flies around a funny try, drawn on the cell of the try (on Lumi's hat for `chapeau`). */
export const effects: Readonly<Partial<Record<Fail, string>>> = {
    chapeau: `<g class="pepites-etoiles">${[[-34, -50], [0, -66], [34, -50]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.42)" d="${STAR}" fill="#ffe381" stroke="${INK}" stroke-width="5"/>`).join('')}</g>`,
    racine: `<g class="pepites-eclat">${[[-30, -30], [26, -36], [0, -46]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.32)" d="${STAR}" fill="#ffe381" stroke="${INK}" stroke-width="5"/>`).join('')}</g>`,
    dure: `<g class="pepites-eclat"><path d="M-44 -30l10 6-10 6 10 6M44 -30l-10 6 10 6-10 6M-20 -46l6 10 6-10 6 10" fill="none" stroke="#ffe381" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    plouf: `<g class="pepites-eclat"><ellipse rx="36" ry="12" fill="none" stroke="#fff" stroke-width="5"/><path d="M-18 -6L-26 -30M0 -10V-38M18 -6L26 -30" stroke="#cfeaff" stroke-width="6" stroke-linecap="round"/></g>`,
    lourd: `<g class="pepites-eclat"><path d="M-30 -34q-4 7 0 9q4 -2 0 -9ZM30 -40q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/></g>`,
    porte: `<g class="pepites-eclat"><path d="M-30 -30L-20 -20M30 -30L20 -20M0 -44V-30" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`
};
/** Each funny try has its own animation of Lumi, named after its CSS keyframes in style.css. */
export const failAnimations: Readonly<Record<Fail, string>> = {
    racine: 'pepites-cogne', dure: 'pepites-bzzz', lourd: 'pepites-pousse', ver: 'pepites-chut', plouf: 'pepites-plouf', porte: 'pepites-toque', chapeau: 'pepites-bonk'
};
/** What the thing on the cell of the try does: hard rock shivers, the rock opens big eyes, the worm yawns, the door shakes. */
export const thingAnimations: Readonly<Partial<Record<Fail, string>>> = { dure: 'pepites-vibre', lourd: 'pepites-gros-yeux', ver: 'pepites-baille', porte: 'pepites-pas-encore', plouf: 'pepites-vague' };
/** The sound word of each funny try, in its bubble. */
export const failWords: Readonly<Record<'fr' | 'en', Record<Fail, string>>> = {
    fr: { racine: 'Aïe !', dure: 'Bzzz !', lourd: 'Hmpf !', ver: 'Aaah…', plouf: 'Plouf !', porte: 'Pas encore !', chapeau: 'Bonk !' },
    en: { racine: 'Ouch!', dure: 'Bzzz!', lourd: 'Hmph!', ver: 'Yaaawn…', plouf: 'Splash!', porte: 'Not yet!', chapeau: 'Bonk!' }
};
