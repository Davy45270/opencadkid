import type { Funny } from '../../engines/orbite';
/** Drawings of « Les nuages de Lumi », in the ink and rounded strokes of the guides (src/characters). A column is 100 units
 * wide; every cloud, heart, drop and the bird are drawn centred on (0, 0). Each kind of cloud carries its own sign (a helmet,
 * a drop, a rainbow scarf, a smile), so that two clouds never differ by colour alone. */
export const U = 100;
export const INK = '#4a3a3f';
export const RAINBOW = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc'];
const STAR = 'M0 -26L7.6 -9.4L25.7 -8L12 3.8L16 21.5L0 12.2L-16 21.5L-12 3.8L-25.7 -8L-7.6 -9.4Z';
/** The puffy body of a cloud, about 96 units wide and 70 high. */
const BODY = 'M-38 30Q-52 30 -50 12Q-48 -2 -34 -2Q-34 -30 -8 -30Q8 -40 22 -22Q44 -26 46 -2Q56 4 50 20Q46 30 36 30Z';
const body = (fill: string): string => `<path d="${BODY}" fill="${fill}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
const eyes = (y: number, gap: number, r = 5): string => `<circle cx="${-gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${-gap + 2}" cy="${y - 2}" r="1.8" fill="#fff"/><circle cx="${gap + 2}" cy="${y - 2}" r="1.8" fill="#fff"/>`;
/** A grumpy face: frowning brows and a mouth turned down. */
const grumpy = `${eyes(6, 13)}<path d="M-22 -6L-8 -1M22 -6L8 -1" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M-9 22Q0 14 9 22" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
/** A happy face: eyes closed in a smile, pink cheeks, a big smile. */
const happy = `<path d="M-19 6Q-13 0 -7 6M7 6Q13 0 19 6" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="-26" cy="14" r="6" fill="#ff9fbf" opacity=".8"/><circle cx="26" cy="14" r="6" fill="#ff9fbf" opacity=".8"/><path d="M-11 13Q0 26 11 13Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
/** A helmet of a building site, yellow, with its brim. */
const helmet = `<path d="M-26 -26Q-26 -52 0 -52Q26 -52 26 -26Z" fill="#ffc531" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-34 -25H34" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-34 -25H34" stroke="#ffc531" stroke-width="3" stroke-linecap="round"/><path d="M0 -52V-30" stroke="${INK}" stroke-width="3"/>`;
const blush = `<ellipse cx="-27" cy="15" rx="10" ry="7" fill="#ff6f9a"/><ellipse cx="27" cy="15" rx="10" ry="7" fill="#ff6f9a"/>`;
/** The little drop of a rain cloud, and a big drop falling. */
export const drop = (s = 1): string => `<path transform="scale(${s})" d="M0 -22Q14 0 14 8A14 14 0 0 1 -14 8Q-14 0 0 -22Z" fill="#5fb4f0" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path transform="scale(${s})" d="M-6 4Q-7 12 -1 15" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
const scarf = `<path d="M-30 -10Q0 -34 30 -10" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>` + RAINBOW.slice(0, 4).map((c, i) => `<path d="M-30 -10Q0 -34 30 -10" fill="none" stroke="${c}" stroke-width="${12 - i * 3}" stroke-linecap="round"/>`).join('');
/** A cloud by its letter: `n` grumpy, `c` in a helmet, `r` the helmet blushing, `g` rain, `a` rainbow, `s` already smiling,
 * `smile` a cloud that just smiled (rainbow body). */
export function cloud(kind: string): string {
    switch (kind) {
        case 'c': return body('#e6edf6') + grumpy + helmet;
        case 'r': return body('#ffe1ea') + grumpy + blush + `<g transform="rotate(-12)">${helmet}</g>`;
        case 'g': return body('#aeb8c6') + grumpy + `<g transform="translate(0 44)">${drop(.7)}</g>`;
        case 'a': return body('#e6edf6') + scarf + grumpy;
        case 's': return body('#ffffff') + happy;
        case 'smile': return `<path d="${BODY}" fill="#fff" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>` + RAINBOW.map((c, i) => `<path d="M-40 ${-6 + i * 6}H44" stroke="${c}" stroke-width="6" opacity=".75"/>`).join('') + `<path d="${BODY}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>` + happy;
        default: return body('#e6edf6') + grumpy;
    }
}
/** A big red heart, the one Lumi throws. */
export const heart = (fill = '#ff4f7b'): string => `<path d="M0 26C-40 0 -34 -30 -16 -30C-7 -30 0 -22 0 -15C0 -22 7 -30 16 -30C34 -30 40 0 0 26Z" fill="${fill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-20 -18Q-24 -8 -18 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
/** The friendly bird, round and blue, flying towards +x. */
export function bird(): string {
    return `<g class="orbite-oiseau-corps"><ellipse rx="30" ry="24" fill="#6cc4ff" stroke="${INK}" stroke-width="4"/><path d="M28 -4L44 2L28 8Z" fill="#ffa94d" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${'<circle cx="14" cy="-6" r="5" fill="' + INK + '"/><circle cx="16" cy="-8" r="1.8" fill="#fff"/>'}<path d="M-28 -2L-44 -14L-42 8Z" fill="#4fa8e8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><g class="orbite-aile"><path d="M-8 -2Q-6 -30 14 -22Q8 -6 -8 -2Z" fill="#a8defc" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g><circle cx="10" cy="8" r="4" fill="#ff9fbf" opacity=".8"/></g>`;
}
/** The Moon at the top of the sky, with a sleepy smile: a heart that goes past the troop bounces on her. */
export function moon(): string {
    return `<path d="M10 -34A36 36 0 1 0 10 34A28 28 0 1 1 10 -34Z" fill="#ffe27a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-22 -6Q-18 -10 -14 -6" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M-22 10Q-16 16 -10 10" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="-24" cy="2" r="4" fill="#ffb3c7"/>`;
}
/** The big sun that comes out when every cloud smiles. */
export function sun(): string {
    return `<g class="orbite-rayons">${Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30})" d="M0 -62L8 -48H-8Z" fill="#ffb627" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`).join('')}</g><circle r="44" fill="#ffd23f" stroke="${INK}" stroke-width="4"/>${eyes(-6, 14, 5)}<path d="M-16 10Q0 26 16 10" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="-26" cy="8" r="6" fill="#ff9fbf" opacity=".8"/><circle cx="26" cy="8" r="6" fill="#ff9fbf" opacity=".8"/>`;
}
/** The umbrella Lumi opens when a drop falls on her. */
export function umbrella(): string {
    return `<path d="M-52 0Q-52 -46 0 -46Q52 -46 52 0Q40 -10 26 0Q13 -10 0 0Q-13 -10 -26 0Q-40 -10 -52 0Z" fill="#ff8fc0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M0 -46V-54M0 0V40Q0 48 -8 48" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
}
/** The wind: three big arrows across the sky, pointing the way it blows (+x). */
export function windArrows(widthUnits: number): string {
    const n = Math.max(2, Math.round(widthUnits / 150));
    return Array.from({ length: n }, (_, i) => `<g transform="translate(${(i + .5) * widthUnits / n} 0)"><path d="M-44 -8H18V-24L48 0L18 24V8H-44Z" fill="#ffffff" stroke="#3f7fb8" stroke-width="6" opacity=".9" stroke-linejoin="round"/></g>`).join('');
}
/** The goal under Lumi: a little cloud, grumpy until it smiles. */
export const goalCloud = (smiled: boolean): string => `<g transform="translate(32 34) scale(.5)">${cloud(smiled ? 'smile' : 'n')}</g>`;
/** A speech bubble with a sound word (Boing, Bisou…), above a point. */
export const bubbleWidth = (word: string): number => Math.max(90, word.length * 19 + 30);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="orbite-bulle"><path d="M${-w / 2} -96H${w / 2}Q${w / 2 + 10} -96 ${w / 2 + 10} -84V-52Q${w / 2 + 10} -40 ${w / 2} -40H12L0 -26L-6 -40H${-w / 2}Q${-w / 2 - 10} -40 ${-w / 2 - 10} -52V-84Q${-w / 2 - 10} -96 ${-w / 2} -96Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="0" y="-56" text-anchor="middle" font-size="34" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
const sparks = (fill: string): string => [[-34, -40], [0, -54], [34, -40]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.36)" d="${STAR}" fill="${fill}" stroke="${INK}" stroke-width="5"/>`).join('');
const smallHearts = [[-30, -30], [0, -50], [30, -30]].map(([x, y]) => `<g transform="translate(${x} ${y}) scale(.35)">${heart('#ff8fc0')}</g>`).join('');
/** What flies around a funny try, drawn where it happens. */
export const effects: Readonly<Record<Funny, string>> = {
    rougit: `<g class="orbite-eclat">${smallHearts}</g>`,
    lune: `<g class="orbite-eclat">${sparks('#ffe27a')}</g>`,
    entre: `<g class="orbite-eclat"><path d="M-40 -10q6 -10 12 0M28 -10q6 -10 12 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`,
    bisou: `<g class="orbite-eclat">${smallHearts}</g>`,
    oiseau: `<g class="orbite-eclat"><path d="M-30 -30q-6 -12 6 -14M30 -30q6 -12 -6 -14" fill="none" stroke="#a8defc" stroke-width="6" stroke-linecap="round"/></g>`,
    bord: `<g class="orbite-eclat"><path d="M-30 -30L-20 -20M30 -30L20 -20M0 -44V-30" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></g>`,
    pluie: `<g class="orbite-eclat"><g transform="translate(-30 -10)">${drop(.45)}</g><g transform="translate(30 -14)">${drop(.45)}</g><g transform="translate(0 -36)">${drop(.45)}</g></g>`
};
/** Each funny try has its own animation of the heart (of Lumi, for the drop), named after its CSS keyframes in style.css. */
export const failAnimations: Readonly<Record<Funny, string>> = {
    rougit: 'orbite-coeur-fond', lune: 'orbite-coeur-boing', entre: 'orbite-coeur-zigzag', bisou: 'orbite-coeur-bisou', oiseau: 'orbite-coeur-plume', bord: 'orbite-coeur-bonk', pluie: 'orbite-ebroue'
};
/** What the thing of the try does: the helmet cloud blushes, the Moon says boing, the two clouds giggle, the smiling cloud
 * blows a kiss, the bird loops, the edge of the sky shakes, Lumi opens her umbrella. */
export const thingAnimations: Readonly<Record<Funny, string>> = {
    rougit: 'orbite-rougit', lune: 'orbite-lune-boing', entre: 'orbite-chatouille', bisou: 'orbite-bisou', oiseau: 'orbite-pirouette', bord: 'orbite-secoue', pluie: 'orbite-parapluie'
};
/** The sound word of each funny try, in its bubble. */
export const failWords: Readonly<Record<'fr' | 'en', Record<Funny, string>>> = {
    fr: { rougit: 'Oh ! Encore un !', lune: 'Boing !', entre: 'Hi hi !', bisou: 'Smack !', oiseau: 'Youpi !', bord: 'Bonk !', pluie: 'Plic !' },
    en: { rougit: 'Oh! One more!', lune: 'Boing!', entre: 'Tee hee!', bisou: 'Smack!', oiseau: 'Whee!', bord: 'Bonk!', pluie: 'Plip!' }
};
