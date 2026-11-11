import type { Fail, FriendKind } from '../../engines/dedale';
/** Drawings of « Le jardin de Boubou », in the ink and rounded strokes of the guides (src/characters). A cell is 100 units
 * wide; every drawing of a thing is centred on (0, 0), the middle of its cell, and stays within 50 units of it. What is to be
 * picked up (seeds, suns, the key flower) is big, bright and glowing; the scenery (hedges, paths, leaves) stays low in
 * contrast, with no round bright spot that could pass for a seed. */
export const U = 100;
export const INK = '#4a3a3f';
const STAR = 'M0 -26L7.6 -9.4L25.7 -8L12 3.8L16 21.5L0 12.2L-16 21.5L-12 3.8L-25.7 -8L-7.6 -9.4Z';
const eyes = (y: number, gap: number, r = 5): string => `<circle cx="${-gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${-gap + 2}" cy="${y - 2}" r="1.8" fill="#fff"/><circle cx="${gap + 2}" cy="${y - 2}" r="1.8" fill="#fff"/>`;

/** A path of fine sand; `x + y` alternates the shade so the cells can be counted. */
export const path = (x: number, y: number): string => `<rect x="-50" y="-50" width="100" height="100" fill="${(x + y) % 2 ? '#f1dfb4' : '#ecd8a9'}"/><path d="M-30 -24h8M18 28h8M24 -30h6" stroke="#dcc28c" stroke-width="3" stroke-linecap="round"/>`;
/** A flowering hedge: a dark green bush, square, with small leaf strokes (no bright dot: flowers are only on the edge). */
export function hedge(x: number, y: number): string {
    const odd = (x + y) % 2 === 1;
    return `<g class="dedale-haie"><rect x="-50" y="-50" width="100" height="100" fill="${odd ? '#3f8a45' : '#3a8040'}"/><path d="M-50 -50h100v100h-100z" fill="none" stroke="#2f6b35" stroke-width="3"/>`
        + `<path d="M-30 -20q8 -10 16 0M6 -32q8 -10 16 0M-22 18q8 -10 16 0M14 14q8 -10 16 0" fill="none" stroke="#5aa95c" stroke-width="5" stroke-linecap="round"/>`
        + `<path d="M-40 34l6 -6 6 6M24 -44l6 -6 6 6" fill="none" stroke="#e98fb0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}
/** The stream: blue water with waves. */
export const stream = (): string => `<rect x="-50" y="-50" width="100" height="100" fill="#6fb8e4"/><path d="M-40 -18q10 -8 20 0t20 0t20 0t20 0M-40 20q10 -8 20 0t20 0t20 0t20 0" fill="none" stroke="#d8f0ff" stroke-width="5" stroke-linecap="round"/>`;
/** A wooden bridge over the stream, its planks across the way it is crossed (`vertical`: crossed up-down). */
export function bridge(vertical: boolean): string {
    const planks = [-36, -18, 0, 18, 36].map(p => vertical ? `<rect x="-34" y="${p - 8}" width="68" height="15" rx="3" fill="#c98e55" stroke="${INK}" stroke-width="3"/>` : `<rect x="${p - 8}" y="-34" width="15" height="68" rx="3" fill="#c98e55" stroke="${INK}" stroke-width="3"/>`).join('');
    const rails = vertical ? '<path d="M-40 -50V50M40 -50V50" stroke="#8a5a2e" stroke-width="6"/>' : '<path d="M-50 -40H50M-50 40H50" stroke="#8a5a2e" stroke-width="6"/>';
    return stream() + planks + rails;
}
/** A puddle on the path: a flat blue patch with a ripple. */
export const puddle = (): string => `<g class="dedale-flaque"><path d="M-40 6Q-42 -22 -10 -24Q20 -30 38 -12Q48 10 30 24Q0 36 -24 28Q-40 24 -40 6Z" fill="#8ccbef" stroke="#4d95c6" stroke-width="4"/><ellipse cx="-4" cy="2" rx="18" ry="7" fill="none" stroke="#e3f5ff" stroke-width="4"/></g>`;
/** Dead leaves covering the path, brown and orange, flat on the ground. */
export const leaves = (): string => `<rect x="-50" y="-50" width="100" height="100" fill="#e2b778"/>` + [[-26, -24, 30], [20, -22, -40], [-18, 20, 70], [24, 22, 10], [0, 0, -15]].map(([x, y, r], i) =>
    `<path transform="translate(${x} ${y}) rotate(${r})" d="M-18 0Q-6 -12 18 0Q-6 12 -18 0Z" fill="${['#d9792f', '#b85d24', '#e39a3c', '#c96a2a', '#a8522a'][i]}" stroke="#8a4520" stroke-width="2"/>`).join('');
/** A tunnel mouth: a dark hole in the hedge, open towards the edge `side` it is on. */
export function tunnel(side: 'haut' | 'bas' | 'gauche' | 'droite'): string {
    const r = { haut: 180, bas: 0, gauche: 90, droite: -90 }[side];
    return `<rect x="-50" y="-50" width="100" height="100" fill="#3f8a45"/><g transform="rotate(${r})"><path d="M-36 50V10Q-36 -30 0 -30Q36 -30 36 10V50Z" fill="#2a2420" stroke="${INK}" stroke-width="4"/><path d="M-24 50V14Q-24 -14 0 -14Q24 -14 24 14V50Z" fill="#3a302a"/></g>`;
}
/** A seed to pick up: a big striped sunflower seed in a yellow glow, with a sparkle. */
export function seed(): string {
    return `<circle r="40" fill="#fff3a0" opacity=".8"/><path d="M0 -34Q22 -10 14 18Q8 32 0 34Q-8 32 -14 18Q-22 -10 0 -34Z" fill="#4b3b33" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M0 -26V28M-8 -10Q-10 10 -6 24M8 -10Q10 10 6 24" fill="none" stroke="#f4ecd8" stroke-width="3.5" stroke-linecap="round"/>`
        + `<path class="dedale-scintille" transform="translate(26 -26) scale(.4)" d="${STAR}" fill="#fff" stroke="${INK}" stroke-width="5"/>`;
}
/** A sun to pick up: a round smiling sun with its rays. */
export function sun(): string {
    const rays = Array.from({ length: 10 }, (_, i) => `<path transform="rotate(${i * 36})" d="M-6 -30L0 -46L6 -30Z" fill="#ffb627" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`).join('');
    return `<circle r="44" fill="#fff3a0" opacity=".6"/>${rays}<circle r="27" fill="#ffd93b" stroke="${INK}" stroke-width="4"/>${eyes(-5, 9, 4)}<path d="M-9 8Q0 16 9 8" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="-16" cy="5" r="4" fill="#ff9f7a" opacity=".8"/><circle cx="16" cy="5" r="4" fill="#ff9f7a" opacity=".8"/>`;
}
/** The key flower: a pink flower whose stalk is a golden key. */
export function keyFlower(): string {
    const petals = Array.from({ length: 5 }, (_, i) => `<ellipse transform="rotate(${i * 72}) translate(0 -14)" rx="10" ry="13" fill="#ff8fc0" stroke="${INK}" stroke-width="3"/>`).join('');
    return `<circle r="44" fill="#ffe9f4" opacity=".8"/><g transform="translate(0 -12)">${petals}<circle r="9" fill="#ffd23f" stroke="${INK}" stroke-width="3"/></g>`
        + `<path d="M0 6V40M0 30H12M0 38H10" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M0 6V40M0 30H12M0 38H10" fill="none" stroke="#f2b51d" stroke-width="5" stroke-linecap="round"/>`;
}
/** A closed garden gate: white pickets in the hedge, with a pink lock. */
export function gate(): string {
    return `<rect x="-50" y="-50" width="100" height="100" fill="#3f8a45"/><g class="dedale-porte"><path d="M-40 -18H40M-40 20H40" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M-40 -18H40M-40 20H40" stroke="#fffaf0" stroke-width="7" stroke-linecap="round"/>`
        + [-30, -10, 10, 30].map(x => `<path d="M${x - 8} 38V-28L${x} -40L${x + 8} -28V38Z" fill="#fffaf0" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`).join('')
        + `<rect x="-11" y="-6" width="22" height="18" rx="4" fill="#ff8fc0" stroke="${INK}" stroke-width="3"/><path d="M-6 -6V-12Q0 -20 6 -12V-6" fill="none" stroke="${INK}" stroke-width="3"/></g>`;
}
/** Boubou the panda in his straw hat, seen from the front: a happy face, a surprised one (funny tries). */
export function boubou(): string {
    return `<ellipse cy="44" rx="28" ry="6" fill="#00000030"/><ellipse cy="26" rx="26" ry="20" fill="#5ab56b" stroke="${INK}" stroke-width="4"/><path d="M-12 12V30M12 12V30" stroke="#3d8a4c" stroke-width="5" stroke-linecap="round"/>`
        + `<circle cx="-24" cy="-30" r="11" fill="${INK}"/><circle cx="24" cy="-30" r="11" fill="${INK}"/><circle cy="-8" r="30" fill="#fff" stroke="${INK}" stroke-width="4"/>`
        + `<ellipse cx="-12" cy="-10" rx="9" ry="11" fill="${INK}" transform="rotate(-20 -12 -10)"/><ellipse cx="12" cy="-10" rx="9" ry="11" fill="${INK}" transform="rotate(20 12 -10)"/>`
        + `<g class="dedale-face-joie"><circle cx="-11" cy="-11" r="4" fill="#fff"/><circle cx="11" cy="-11" r="4" fill="#fff"/><path d="M-7 6Q0 12 7 6" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`
        + `<g class="dedale-face-surprise"><circle cx="-11" cy="-11" r="6" fill="#fff"/><circle cx="11" cy="-11" r="6" fill="#fff"/><circle cx="-11" cy="-11" r="2.5" fill="${INK}"/><circle cx="11" cy="-11" r="2.5" fill="${INK}"/><ellipse cy="9" rx="4" ry="5" fill="${INK}"/></g>`
        + `<ellipse cy="0" rx="5" ry="3.5" fill="${INK}"/><circle cx="-21" cy="4" r="4.5" fill="#ff9fbf" opacity=".7"/><circle cx="21" cy="4" r="4.5" fill="#ff9fbf" opacity=".7"/>`
        + `<g class="dedale-chapeau"><ellipse cy="-36" rx="34" ry="8" fill="#f2cf72" stroke="${INK}" stroke-width="4"/><path d="M-18 -38Q-18 -58 0 -58Q18 -58 18 -38Z" fill="#f2cf72" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-18 -42H18" stroke="#e2655d" stroke-width="5"/></g>`
        + `<g class="dedale-gouttes"><path d="M-40 -16q-4 7 0 9q4 -2 0 -9ZM40 -10q-4 7 0 9q4 -2 0 -9ZM-36 18q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/></g>`;
}
/** The three friends, each in its own colours. */
export const friendColours: Readonly<Record<FriendKind, string>> = { papillon: '#9b6bd3', herisson: '#a8703f', coccinelle: '#e2384f' };
export function friend(kind: FriendKind): string {
    switch (kind) {
        case 'papillon': return `<g class="dedale-ailes"><path d="M0 -4Q-30 -44 -40 -20Q-44 4 -4 4Z" fill="#c39bf0" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M0 -4Q30 -44 40 -20Q44 4 4 4Z" fill="#c39bf0" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M-2 4Q-30 10 -28 28Q-14 36 -2 10Z" fill="#9b6bd3" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M2 4Q30 10 28 28Q14 36 2 10Z" fill="#9b6bd3" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="-24" cy="-18" r="5" fill="#fff"/><circle cx="24" cy="-18" r="5" fill="#fff"/></g>`
            + `<ellipse cy="4" rx="6" ry="20" fill="${INK}"/><path d="M-2 -14Q-8 -30 -14 -32M2 -14Q8 -30 14 -32" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="-3" cy="-8" r="1.8" fill="#fff"/><circle cx="3" cy="-8" r="1.8" fill="#fff"/>`;
        case 'herisson': return `<path d="M-40 20Q-44 -30 0 -30Q34 -30 40 10L44 20Z" fill="#7a4a2a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-36 -6l-10 -8M-26 -22l-6 -12M-10 -28l-2 -14M8 -28l4 -14M24 -20l8 -10M-40 10l-10 -2" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
            + `<path d="M14 -6Q40 -6 46 18Q30 30 10 24Z" fill="#e8c296" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="46" cy="16" r="5" fill="${INK}"/><circle cx="28" cy="6" r="4" fill="${INK}"/><circle cx="29" cy="5" r="1.5" fill="#fff"/><path d="M-24 24v8M0 24v8M22 24v8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
        case 'coccinelle': return `<circle cy="-24" r="12" fill="${INK}"/><circle cx="-4" cy="-26" r="2.5" fill="#fff"/><circle cx="4" cy="-26" r="2.5" fill="#fff"/><path d="M-6 -34Q-12 -44 -16 -42M6 -34Q12 -44 16 -42" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
            + `<ellipse cy="6" rx="32" ry="30" fill="#e2384f" stroke="${INK}" stroke-width="4"/><path d="M0 -22V36" stroke="${INK}" stroke-width="4"/><circle cx="-16" cy="-4" r="6" fill="${INK}"/><circle cx="16" cy="-4" r="6" fill="${INK}"/><circle cx="-14" cy="18" r="5" fill="${INK}"/><circle cx="14" cy="18" r="5" fill="${INK}"/><ellipse cx="-14" cy="-10" rx="5" ry="8" fill="#fff" opacity=".45"/>`;
    }
}
/** A flower that grows at the end, on every cell. */
export function bloom(i: number): string {
    const colour = ['#ff8fc0', '#ffd23f', '#9fd0ff', '#c39bf0', '#ff9b6b'][i % 5]!;
    const petals = Array.from({ length: 6 }, (_, k) => `<ellipse transform="rotate(${k * 60}) translate(0 -12)" rx="8" ry="11" fill="${colour}" stroke="${INK}" stroke-width="2.5"/>`).join('');
    return `<path d="M0 10V40" stroke="#3d8a4c" stroke-width="5" stroke-linecap="round"/><g>${petals}<circle r="7" fill="#fff6c9" stroke="${INK}" stroke-width="2.5"/></g>`;
}
/** A big arrow in a neighbouring cell, pointing where Boubou would go. */
export function arrow(rotation: number): string {
    return `<g transform="rotate(${rotation})"><path d="M-26 12H4V30L36 0L4 -30V-12H-26Z" fill="#ffffffcc" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>`;
}
/** A round arrow going back: the free « back » button. */
export const backArrow = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 22H40Q54 22 54 36Q54 50 40 50H22" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M24 8L8 22L24 36Z" fill="#5ab56b" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></svg>`;
/** Two footprints and an arrow: « he goes on by himself to the next crossing ». */
export const runIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="16" cy="40" rx="7" ry="10" fill="${INK}"/><ellipse cx="30" cy="26" rx="7" ry="10" fill="${INK}"/><path d="M36 44H54M46 36L56 44L46 52" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
/** A speech bubble with a sound word (Boing, Atchoum…), above a cell. */
export const bubbleWidth = (word: string): number => Math.max(90, word.length * 19 + 30);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="dedale-bubble"><path d="M${-w / 2} -96H${w / 2}Q${w / 2 + 10} -96 ${w / 2 + 10} -84V-52Q${w / 2 + 10} -40 ${w / 2} -40H12L0 -26L-6 -40H${-w / 2}Q${-w / 2 - 10} -40 ${-w / 2 - 10} -52V-84Q${-w / 2 - 10} -96 ${-w / 2} -96Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="0" y="-56" text-anchor="middle" font-size="34" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
const sparks = (fill: string): string => [[-34, -40], [0, -54], [34, -40]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.36)" d="${STAR}" fill="${fill}" stroke="${INK}" stroke-width="5"/>`).join('');
/** What flies around a funny try, drawn on the cell of the try. */
export const effects: Readonly<Record<Fail, string>> = {
    haie: `<g class="dedale-eclat"><path d="M-30 -30q-10 -10 -4 -20M30 -30q10 -10 4 -20M0 -40v-14" fill="none" stroke="#5aa95c" stroke-width="6" stroke-linecap="round"/></g>`,
    flaque: `<g class="dedale-eclat"><path d="M-24 -10q-4 7 0 9q4 -2 0 -9ZM20 -18q-4 7 0 9q4 -2 0 -9ZM0 -30q-4 7 0 9q4 -2 0 -9Z" fill="#7cc6f0" stroke="${INK}" stroke-width="1.5"/></g>`,
    ruisseau: `<g class="dedale-eclat"><ellipse rx="36" ry="12" fill="none" stroke="#fff" stroke-width="5"/><path d="M-18 -6L-26 -30M0 -10V-38M18 -6L26 -30" stroke="#cfeaff" stroke-width="6" stroke-linecap="round"/></g>`,
    porte: `<g class="dedale-eclat"><path d="M-30 -30L-20 -20M30 -30L20 -20M0 -44V-30" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`,
    papillon: `<g class="dedale-eclat">${sparks('#e9d6ff')}</g>`,
    herisson: `<g class="dedale-eclat"><path d="M-12 -46c-8 -10 -20 0 -12 8l12 12 12 -12c8 -8 -4 -18 -12 -8z" fill="#ff8fc0" stroke="${INK}" stroke-width="3"/></g>`,
    coccinelle: `<g class="dedale-eclat"><path d="M-36 -30q6 -8 12 0t12 0M12 -34q6 -8 12 0t12 0" fill="none" stroke="#e2384f" stroke-width="4" stroke-linecap="round"/></g>`
};
/** Each funny try has its own animation of Boubou, named after its CSS keyframes in style.css. */
export const failAnimations: Readonly<Record<Fail, string>> = {
    haie: 'dedale-boing', flaque: 'dedale-splash', ruisseau: 'dedale-plouf', porte: 'dedale-toque', papillon: 'dedale-atchoum', herisson: 'dedale-calin', coccinelle: 'dedale-chatouille'
};
/** What the thing on the cell of the try does: the hedge shakes, the puddle ripples, the gate rattles, the friend laughs. */
export const thingAnimations: Readonly<Record<Fail, string>> = {
    haie: 'dedale-secoue', flaque: 'dedale-vague', ruisseau: 'dedale-vague', porte: 'dedale-pas-encore', papillon: 'dedale-rit', herisson: 'dedale-rit', coccinelle: 'dedale-rit'
};
/** The sound word of each funny try, in its bubble. */
export const failWords: Readonly<Record<'fr' | 'en', Record<Fail, string>>> = {
    fr: { haie: 'Boing !', flaque: 'Splash !', ruisseau: 'Plouf !', porte: 'Pas encore !', papillon: 'Atchoum !', herisson: 'Câlin !', coccinelle: 'Hi hi hi !' },
    en: { haie: 'Boing!', flaque: 'Splash!', ruisseau: 'Splosh!', porte: 'Not yet!', papillon: 'Atchoo!', herisson: 'Hug!', coccinelle: 'Tee-hee!' }
};
