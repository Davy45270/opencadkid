import type { Fail, Theme } from '../../engines/grille';
/** Drawings of « La grille de CaliRoux », in the ink and rounded strokes of the guides (src/characters). Every picture is
 * centred on (0, 0) and stays within 44 units of it (a cell is 100 wide). Each picture has its own colour AND its own
 * outline, so no two of a theme are told apart by colour alone. Each has a face: happy, pulling a face (`grille-moue`), or
 * dizzy (`grille-vertige`); the CSS shows one at a time. */
export const INK = '#583746';
const face = (x: number, y: number, s = 1): string => `<g transform="translate(${x} ${y}) scale(${s})">`
    + `<g class="grille-joie"><circle cx="-8" cy="-3" r="3.6" fill="${INK}"/><circle cx="8" cy="-3" r="3.6" fill="${INK}"/><circle cx="-6.8" cy="-4.2" r="1.2" fill="#fff"/><circle cx="9.2" cy="-4.2" r="1.2" fill="#fff"/><path d="M-6 5Q0 11 6 5" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/></g>`
    + `<g class="grille-moue"><path d="M-12 -7L-5 -3L-12 1M12 -7L5 -3L12 1" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M-7 8Q-3.5 4 0 8T7 8" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/><path d="M-1 8Q2 15 5 9" fill="#ff7f9a" stroke="${INK}" stroke-width="1.8"/></g>`
    + `<g class="grille-vertige"><path d="M-8 -3m-4 0a4 4 0 1 0 4 -4a2.4 2.4 0 1 0 2 2.4M8 -3m-4 0a4 4 0 1 0 4 -4a2.4 2.4 0 1 0 2 2.4" fill="none" stroke="${INK}" stroke-width="2"/><ellipse cy="8" rx="3.5" ry="2.6" fill="${INK}"/></g></g>`;
const ink = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"`;
/** The pictures of each theme, in the order of the letters a to f of the scenes. */
const DRAW: Readonly<Record<Theme, readonly (() => string)[]>> = {
    fruits: [
        // A red apple with its leaf.
        () => `<path d="M0 -24Q-2 -34 4 -40" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M4 -34Q18 -42 24 -30Q12 -26 4 -34Z" fill="#5fbf4a" ${ink}/><path d="M0 -22Q-18 -34 -32 -18Q-42 4 -26 26Q-14 40 0 32Q14 40 26 26Q42 4 32 -18Q18 -34 0 -22Z" fill="#e8384f" ${ink}/><ellipse cx="-18" cy="-10" rx="5" ry="9" fill="#fff" opacity=".45"/>${face(0, 6)}`,
        // A yellow banana, a crescent.
        () => `<path d="M-36 -18Q-40 22 -4 32Q30 38 40 6Q28 20 2 14Q-24 6 -28 -22Z" fill="#ffd93b" ${ink}/><path d="M-36 -18L-28 -22L-30 -30L-38 -26Z" fill="#8a6a2a" ${ink}/><path d="M40 6L42 0" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>${face(-6, 20, .85)}`,
        // A strawberry: a rounded triangle, seeds and a green crown.
        () => `<path d="M-30 -16Q-34 6 -12 28Q0 40 12 28Q34 6 30 -16Q14 -26 0 -22Q-14 -26 -30 -16Z" fill="#f2384a" ${ink}/><path d="M-20 -22L-8 -18L0 -30L8 -18L20 -22L12 -12L0 -14L-12 -12Z" fill="#3fae55" ${ink}/>${[[-18, -2], [18, -2], [-10, 20], [10, 20], [0, 30]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" fill="#ffe381"/>`).join('')}${face(0, 4, .9)}`,
        // A bunch of purple grapes.
        () => `<path d="M0 -30Q2 -38 8 -40" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>${[[-16, -18], [0, -20], [16, -18], [-24, -2], [24, -2], [-14, 14], [14, 14], [0, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="#8e4fc4" ${ink}/>`).join('')}<circle cy="0" r="17" fill="#a065d6" ${ink}/>${face(0, 1, .9)}`,
        // An orange: a big round with a dimpled skin.
        () => `<circle r="33" fill="#ff9a1f" ${ink}/><path d="M-4 -32L2 -40L10 -36" fill="#5fbf4a" ${ink}/>${[[-20, -14], [22, -10], [-22, 14], [20, 18], [-6, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#d9700b"/>`).join('')}${face(0, 4)}`,
        // A green pear.
        () => `<path d="M0 -26Q-2 -36 6 -40" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M0 -28Q-14 -28 -14 -10Q-14 -2 -24 10Q-32 34 0 36Q32 34 24 10Q14 -2 14 -10Q14 -28 0 -28Z" fill="#b7d94a" ${ink}/>${face(0, 16)}`
    ],
    animaux: [
        // A grey cat: triangle ears and whiskers.
        () => `<path d="M-30 -10L-30 -40L-8 -26ZM30 -10L30 -40L8 -26Z" fill="#9aa0ad" ${ink}/><path d="M-26 -30L-24 -18M26 -30L24 -18" stroke="#ffb3c4" stroke-width="5" stroke-linecap="round"/><ellipse cy="4" rx="34" ry="30" fill="#b3b8c4" ${ink}/><path d="M-40 6H-20M-40 14L-20 10M40 6H20M40 14L20 10" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M-3 8L3 8L0 12Z" fill="#ff7f9a"/>${face(0, 2)}`,
        // A brown dog with long floppy ears.
        () => `<path d="M-26 -24Q-44 -26 -40 6Q-38 18 -28 12Z" fill="#7a4b2a" ${ink}/><path d="M26 -24Q44 -26 40 6Q38 18 28 12Z" fill="#7a4b2a" ${ink}/><ellipse cy="2" rx="28" ry="30" fill="#c98b4d" ${ink}/><ellipse cy="18" rx="14" ry="10" fill="#f3d2a8"/><ellipse cy="12" rx="5" ry="4" fill="${INK}"/>${face(0, -4)}`,
        // A white rabbit with tall pink ears.
        () => `<ellipse cx="-12" cy="-26" rx="8" ry="18" fill="#fff" ${ink}/><ellipse cx="12" cy="-26" rx="8" ry="18" fill="#fff" ${ink}/><ellipse cx="-12" cy="-26" rx="3.5" ry="11" fill="#ffb3c4"/><ellipse cx="12" cy="-26" rx="3.5" ry="11" fill="#ffb3c4"/><circle cy="12" r="26" fill="#fff" ${ink}/><path d="M-3 16L3 16L0 20Z" fill="#ff7f9a"/>${face(0, 10)}`,
        // A blue fish seen from the side.
        () => `<path d="M24 0L42 -18V18Z" fill="#2f86e0" ${ink}/><ellipse cx="-4" rx="32" ry="24" fill="#5aa8f0" ${ink}/><path d="M-6 -24Q4 -36 14 -22" fill="#2f86e0" ${ink}/><path d="M8 -12Q14 0 8 12" fill="none" stroke="#2f86e0" stroke-width="3"/>${face(-14, 0, .9)}`,
        // A yellow bird with an orange beak.
        () => `<path d="M-4 -30Q0 -42 8 -34" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cy="2" r="30" fill="#ffd93b" ${ink}/><path d="M-30 6Q-44 0 -38 18Q-30 20 -24 12Z" fill="#f2b51b" ${ink}/><path d="M30 0L44 6L30 12Z" fill="#ff8a2b" ${ink}/>${face(4, -2)}`,
        // A green tortoise: a domed shell, head and feet.
        () => `<circle cx="-32" cy="4" r="10" fill="#8fd16e" ${ink}/><ellipse cx="-14" cy="24" rx="7" ry="6" fill="#8fd16e" ${ink}/><ellipse cx="16" cy="24" rx="7" ry="6" fill="#8fd16e" ${ink}/><path d="M-24 20Q-24 -26 4 -26Q32 -26 32 20Z" fill="#3c9a4a" ${ink}/><path d="M-12 20L-6 -4L14 -4L20 20M-6 -4L4 -24L14 -4" fill="none" stroke="#2b6b33" stroke-width="3"/>${face(-32, 4, .5)}`
    ],
    formes: [
        // A red round.
        () => `<circle r="32" fill="#e8384f" ${ink}/>${face(0, 2)}`,
        // A blue square.
        () => `<rect x="-30" y="-30" width="60" height="60" rx="6" fill="#2f86e0" ${ink}/>${face(0, 2)}`,
        // A yellow triangle.
        () => `<path d="M0 -36L36 30H-36Z" fill="#ffd93b" ${ink}/>${face(0, 12, .9)}`,
        // A green star.
        () => `<path d="M0 -38L11 -14L37 -12L17 6L23 32L0 18L-23 32L-17 6L-37 -12L-11 -14Z" fill="#3fae55" ${ink}/>${face(0, 4, .8)}`,
        // A pink heart.
        () => `<path d="M0 34Q-40 6 -34 -16Q-28 -34 -10 -30Q-2 -28 0 -20Q2 -28 10 -30Q28 -34 34 -16Q40 6 0 34Z" fill="#ff7fb0" ${ink}/>${face(0, -2)}`,
        // A purple crescent moon.
        () => `<path d="M10 -34Q-30 -30 -30 0Q-30 30 10 34Q-10 20 -10 0Q-10 -20 10 -34Z" fill="#8e4fc4" ${ink}/>${face(-20, 0, .55)}`
    ]
};
export const picture = (theme: Theme, image: number): string => DRAW[theme][image]!();
/** The words said for each picture, in the order of the letters a to f. */
export const names: Readonly<Record<'fr' | 'en', Record<Theme, readonly string[]>>> = {
    fr: { fruits: ['la pomme', 'la banane', 'la fraise', 'le raisin', 'l’orange', 'la poire'], animaux: ['le chat', 'le chien', 'le lapin', 'le poisson', 'l’oiseau', 'la tortue'], formes: ['le rond', 'le carré', 'le triangle', 'l’étoile', 'le cœur', 'la lune'] },
    en: { fruits: ['the apple', 'the banana', 'the strawberry', 'the grapes', 'the orange', 'the pear'], animaux: ['the cat', 'the dog', 'the rabbit', 'the fish', 'the bird', 'the tortoise'], formes: ['the circle', 'the square', 'the triangle', 'the star', 'the heart', 'the moon'] }
};
/** Each funny try has its own animation, named after its CSS keyframes in style.css: on the twin that reacts, or on the
 * picture itself, or on CaliRoux. */
export const failAnimations: Readonly<Record<Fail, string>> = {
    grimace: 'grille-grimace', chamaille: 'grille-chamaille', cogne: 'grille-cogne', pasici: 'grille-haussement',
    salto: 'grille-salto', coucou: 'grille-coucou', tournis: 'grille-tournis', roulade: 'grille-roulade'
};
/** The sound word of each funny try, in its bubble. */
export const failWords: Readonly<Record<'fr' | 'en', Record<Fail, string>>> = {
    fr: { grimace: 'Beurk !', chamaille: 'Grrr !', cogne: 'Bong !', pasici: 'Hmm ?', salto: 'Hop là !', coucou: 'Coucou !', tournis: 'Ouh là…', roulade: 'Youpi !' },
    en: { grimace: 'Yuck!', chamaille: 'Grrr!', cogne: 'Bong!', pasici: 'Hmm?', salto: 'Hop!', coucou: 'Hello!', tournis: 'Whoa…', roulade: 'Wheee!' }
};
/** How the finished grid moves, as a little living painting. */
export const dances: Readonly<Record<Theme, string>> = { fruits: 'grille-danse', animaux: 'grille-ronde', formes: 'grille-toupie' };
/** A speech bubble with a sound word, over a cell. */
export function bubble(word: string): string {
    const w = Math.max(70, word.length * 13 + 24);
    return `<svg class="grille-bulle-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${-w / 2 - 6} -60 ${w + 12} 66" aria-hidden="true"><path d="M${-w / 2} -56H${w / 2}Q${w / 2 + 4} -56 ${w / 2 + 4} -50V-22Q${w / 2 + 4} -16 ${w / 2} -16H10L0 0L-8 -16H${-w / 2}Q${-w / 2 - 4} -16 ${-w / 2 - 4} -22V-50Q${-w / 2 - 4} -56 ${-w / 2} -56Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><text x="0" y="-27" text-anchor="middle" font-size="24" font-weight="800" fill="${INK}">${word}</text></svg>`;
}
