import type { Fail, Motif, Move } from '../../engines/caisses';
/** Drawings of « Les caisses de Boubou », in the ink and rounded strokes of the guides (src/characters). A cell is 100 units
 * wide; every drawing of a thing is centred on (0, 0), the middle of its cell, and stays within 48 units of it. */
export const U = 100;
export const INK = '#583746';
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
/** Each toy has its colour, on its crate and on its spot: two cues, never the colour alone. */
export const COLOURS: Readonly<Record<Motif, { main: string; light: string }>> = {
    ballon: { main: '#e2384f', light: '#ffc7cf' }, ours: { main: '#e8892b', light: '#ffdcb5' }, voiture: { main: '#2f86e0', light: '#cfe4ff' },
    etoile: { main: '#f2c21b', light: '#fff2b0' }, grenouille: { main: '#3fae55', light: '#cdf2d3' }
};
/** The toy itself, centred, about 56 units wide. */
export function toy(m: Motif, fill = true): string {
    const c = COLOURS[m].main, f = fill ? c : 'none', w = fill ? 3 : 4;
    switch (m) {
        case 'ballon': return `<path d="M0 18Q-4 24 2 30" fill="none" stroke="${INK}" stroke-width="2.5"/><ellipse cy="-4" rx="18" ry="22" fill="${f}" stroke="${fill ? INK : c}" stroke-width="${w}"/><path d="M-4 18L0 14L4 18Z" fill="${f}" stroke="${fill ? INK : c}" stroke-width="2"/>${fill ? '<ellipse cx="-7" cy="-12" rx="4" ry="7" fill="#fff" opacity=".6"/>' : ''}`;
        case 'ours': return `<circle cx="-15" cy="-17" r="8" fill="${f}" stroke="${fill ? INK : c}" stroke-width="${w}"/><circle cx="15" cy="-17" r="8" fill="${f}" stroke="${fill ? INK : c}" stroke-width="${w}"/><circle cy="0" r="22" fill="${f}" stroke="${fill ? INK : c}" stroke-width="${w}"/>${fill ? `<ellipse cy="7" rx="9" ry="7" fill="#ffdcb5"/><circle cx="-8" cy="-5" r="3" fill="${INK}"/><circle cx="8" cy="-5" r="3" fill="${INK}"/><ellipse cy="4" rx="3.5" ry="2.5" fill="${INK}"/>` : ''}`;
        case 'voiture': return `<path d="M-26 10V0Q-26 -6 -18 -7L-10 -18H10L18 -7Q26 -6 26 0V10Z" fill="${f}" stroke="${fill ? INK : c}" stroke-width="${w}" stroke-linejoin="round"/>${fill ? '<path d="M-7 -14H-1V-7H-12ZM3 -14H8L13 -7H3Z" fill="#cfeaff"/>' : ''}<circle cx="-14" cy="12" r="7" fill="${fill ? '#3d3a44' : 'none'}" stroke="${fill ? INK : c}" stroke-width="${w}"/><circle cx="14" cy="12" r="7" fill="${fill ? '#3d3a44' : 'none'}" stroke="${fill ? INK : c}" stroke-width="${w}"/>`;
        case 'etoile': return `<path d="M0 -26L7.6 -9.4L25.7 -8L12 3.8L16 21.5L0 12.2L-16 21.5L-12 3.8L-25.7 -8L-7.6 -9.4Z" fill="${f}" stroke="${fill ? INK : c}" stroke-width="${w}" stroke-linejoin="round"/>`;
        case 'grenouille': return `<circle cx="-11" cy="-14" r="9" fill="${f}" stroke="${fill ? INK : c}" stroke-width="${w}"/><circle cx="11" cy="-14" r="9" fill="${f}" stroke="${fill ? INK : c}" stroke-width="${w}"/><ellipse cy="4" rx="24" ry="17" fill="${f}" stroke="${fill ? INK : c}" stroke-width="${w}"/>${fill ? `<circle cx="-11" cy="-15" r="4" fill="#fff"/><circle cx="11" cy="-15" r="4" fill="#fff"/><circle cx="-11" cy="-15" r="2" fill="${INK}"/><circle cx="11" cy="-15" r="2" fill="${INK}"/><path d="M-10 6Q0 13 10 6" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>` : ''}`;
    }
}
/** A crate of toys: a wooden box with the band of its toy's colour, the toy on its front, and two eyes that open wide when it
 * bumps into a wall (`caisses-gros-yeux` shows them). */
export function crate(m: Motif): string {
    const c = COLOURS[m];
    return `<ellipse cy="44" rx="40" ry="6" fill="#00000026"/><rect x="-42" y="-42" width="84" height="84" rx="10" fill="#d9a066" stroke="${INK}" stroke-width="4"/><path d="M-42 -20H42M-42 20H42" stroke="#b07a42" stroke-width="3"/>`
        + `<rect x="-42" y="-42" width="84" height="14" rx="7" fill="${c.main}" stroke="${INK}" stroke-width="3"/><circle cy="4" r="30" fill="${c.light}" stroke="${INK}" stroke-width="3"/><g transform="translate(0 6) scale(.82)">${toy(m)}</g>`
        + `<g class="caisses-yeux"><circle cx="-16" cy="-35" r="9" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="16" cy="-35" r="9" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="-16" cy="-34" r="4" fill="${INK}"/><circle cx="16" cy="-34" r="4" fill="${INK}"/></g>`
        + `<g class="caisses-non-non"><path d="M-30 -48L-38 -58M30 -48L38 -58" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`;
}
/** A crate sunk in a hole: only its lid shows, level with the grass, and Boubou walks over it. */
export function sunk(m: Motif): string {
    return `<rect x="-40" y="-36" width="80" height="72" rx="10" fill="#b98550" stroke="${INK}" stroke-width="4"/><path d="M-40 -12H40M-40 12H40" stroke="#8a5a2e" stroke-width="3"/><rect x="-40" y="-36" width="80" height="10" rx="5" fill="${COLOURS[m].main}" opacity=".8"/>`;
}
/** A spot: a rug with a chalk outline of its toy, or a big dotted star when any crate fits. */
export function spot(m: Motif | null): string {
    const edge = m ? COLOURS[m].main : '#8d68a0';
    return `<rect x="-44" y="-44" width="88" height="88" rx="16" fill="${m ? COLOURS[m].light : '#f3e9ff'}" stroke="${edge}" stroke-width="5" stroke-dasharray="14 8"/>`
        + (m ? `<g opacity=".9">${toy(m, false)}</g>` : `<path d="M0 -24L7 -8L24 -7L11 4L15 21L0 12L-15 21L-11 4L-24 -7L-7 -8Z" fill="none" stroke="#8d68a0" stroke-width="4" stroke-linejoin="round"/>`);
}
/** The ground of a cell. `x + y` alternates the grass so the cells can be counted. */
export function ground(kind: string, x: number, y: number, dir?: Move): string {
    const grass = `<rect x="-50" y="-50" width="100" height="100" fill="${(x + y) % 2 ? '#b5e08f' : '#a9d983'}"/>`;
    switch (kind) {
        case 'mur': return `<rect x="-50" y="-50" width="100" height="100" fill="#a9a2b5"/><g stroke="${INK}" stroke-width="3" fill="#c9c2d4"><rect x="-46" y="-46" width="52" height="28" rx="6"/><rect x="10" y="-46" width="36" height="28" rx="6"/><rect x="-46" y="-14" width="30" height="28" rx="6"/><rect x="-12" y="-14" width="58" height="28" rx="6"/><rect x="-46" y="18" width="50" height="28" rx="6"/><rect x="8" y="18" width="38" height="28" rx="6"/></g>`;
        case 'buisson': return grass + `<g fill="#5fae55" stroke="${INK}" stroke-width="3.5"><circle cx="-20" cy="10" r="22"/><circle cx="20" cy="10" r="22"/><circle cy="-10" r="26"/></g><circle cx="-8" cy="-14" r="5" fill="#ff9fbf"/><circle cx="14" cy="4" r="5" fill="#ffe381"/><circle cx="-18" cy="16" r="4" fill="#fff"/>`;
        case 'eau': return `<rect x="-50" y="-50" width="100" height="100" fill="#76c3ee"/><path d="M-36 -16q10 -7 20 0t20 0M-6 22q10 -7 20 0t20 0" fill="none" stroke="#c8ebff" stroke-width="4" stroke-linecap="round"/>`;
        case 'trou': return grass + `<ellipse rx="40" ry="36" fill="#5d3b22" stroke="${INK}" stroke-width="4"/><ellipse cy="6" rx="30" ry="24" fill="#2e1c10"/>`;
        case 'glace': return `<rect x="-50" y="-50" width="100" height="100" fill="#dff4ff"/><path d="M-30 -30L-10 -10M10 8L30 28M-24 18L-14 28" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M-50 -50H50" stroke="#b6e0f5" stroke-width="2"/>`;
        case 'tapis': {
            const r = { droite: 0, bas: 90, gauche: 180, haut: -90 }[dir ?? 'droite'];
            return `<rect x="-50" y="-50" width="100" height="100" fill="#6f7280"/><g transform="rotate(${r})"><rect x="-50" y="-34" width="100" height="68" fill="#8b8f9c"/><g class="caisses-defile"><path d="M-46 -16L-30 0L-46 16M-14 -16L2 0L-14 16M18 -16L34 0L18 16M50 -16L66 0L50 16" fill="none" stroke="#ffe381" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
        }
        case 'bouton': return grass + `<ellipse cy="10" rx="38" ry="22" fill="#7a7f8c" stroke="${INK}" stroke-width="3"/><g class="caisses-bouton"><ellipse cy="0" rx="28" ry="16" fill="#ff5d73" stroke="${INK}" stroke-width="3"/><ellipse cx="-8" cy="-5" rx="8" ry="4" fill="#fff" opacity=".6"/></g>`;
        default: return grass;
    }
}
/** The garden gate: two wooden leaves that swing open (`data-open` on its group folds them). */
export function gate(): string {
    const leaf = (side: number): string => `<g class="caisses-battant" style="transform-origin:${side * 50}px 0px"><rect x="${side < 0 ? -48 : 2}" y="-44" width="46" height="88" rx="6" fill="#c98b4d" stroke="${INK}" stroke-width="4"/><path d="M${side < 0 ? -40 : 10} -20H${side < 0 ? -10 : 40}M${side < 0 ? -40 : 10} 20H${side < 0 ? -10 : 40}" stroke="#8a5a2e" stroke-width="5" stroke-linecap="round"/></g>`;
    return `<rect x="-50" y="-50" width="100" height="100" fill="#d8c8a8"/>${leaf(-1)}${leaf(1)}`;
}
/** Boubou the panda, seen from the front, with the faces of his funny tries: surprised, red and puffing, scratching his
 * head, sitting on his bottom; and his paws, shown when he holds a crate to pull it. */
export function boubou(): string {
    return `<ellipse cy="42" rx="28" ry="6" fill="#00000026"/><ellipse cy="20" rx="25" ry="21" fill="#fff6e7" stroke="${INK}" stroke-width="4"/><circle cx="-25" cy="-30" r="11" fill="#3b3035" stroke="${INK}" stroke-width="3"/><circle cx="25" cy="-30" r="11" fill="#3b3035" stroke="${INK}" stroke-width="3"/>`
        + `<circle cy="-8" r="31" fill="#fff6e7" stroke="${INK}" stroke-width="4"/><ellipse cx="-12" cy="-10" rx="9" ry="11" fill="#3b3035" transform="rotate(20 -12 -10)"/><ellipse cx="12" cy="-10" rx="9" ry="11" fill="#3b3035" transform="rotate(-20 12 -10)"/>`
        + `<g class="caisses-face-joie"><circle cx="-11" cy="-11" r="4" fill="#fff"/><circle cx="11" cy="-11" r="4" fill="#fff"/><circle cx="-11" cy="-11" r="2" fill="${INK}"/><circle cx="11" cy="-11" r="2" fill="${INK}"/><path d="M-7 6Q0 12 7 6" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`
        + `<g class="caisses-face-surprise"><circle cx="-11" cy="-11" r="6" fill="#fff"/><circle cx="11" cy="-11" r="6" fill="#fff"/><circle cx="-11" cy="-11" r="2.5" fill="${INK}"/><circle cx="11" cy="-11" r="2.5" fill="${INK}"/><ellipse cy="9" rx="4" ry="5" fill="${INK}"/></g>`
        + `<ellipse cy="0" rx="4.5" ry="3.2" fill="${INK}"/><g class="caisses-joues"><circle cx="-21" cy="2" r="5" fill="#ff9fbf" opacity=".7"/><circle cx="21" cy="2" r="5" fill="#ff9fbf" opacity=".7"/></g>`
        + `<g class="caisses-rouge"><circle cx="-21" cy="2" r="9" fill="#ff4d6d" opacity=".75"/><circle cx="21" cy="2" r="9" fill="#ff4d6d" opacity=".75"/><path d="M34 -4q10 -4 14 4M36 6q8 0 12 6" fill="none" stroke="#9fd3ff" stroke-width="4" stroke-linecap="round"/></g>`
        + `<g class="caisses-patte"><ellipse cx="22" cy="-40" rx="9" ry="7" fill="#3b3035" stroke="${INK}" stroke-width="2.5"/><path d="M28 -54q6 -6 2 -12" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><text x="-6" y="-46" font-size="28" font-weight="800" fill="${INK}">?</text></g>`
        + `<g class="caisses-pattes"><ellipse cx="-24" cy="20" rx="9" ry="8" fill="#3b3035" stroke="${INK}" stroke-width="2.5"/><ellipse cx="24" cy="20" rx="9" ry="8" fill="#3b3035" stroke="${INK}" stroke-width="2.5"/></g>`;
}
/** A big arrow in a neighbouring cell, pointing where Boubou would go; a pull arrow carries two paws. */
export function arrow(rotation: number, pull = false): string {
    return `<g transform="rotate(${rotation})"><path d="M-26 12H4V30L36 0L4 -30V-12H-26Z" fill="${pull ? '#ffe9a8e6' : '#ffffffcc'}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${pull ? `<circle cx="-30" cy="-12" r="7" fill="#3b3035"/><circle cx="-30" cy="12" r="7" fill="#3b3035"/>` : ''}</g>`;
}
/** Two paws: the « pull » button. */
export const hands = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="14" width="30" height="36" rx="5" fill="#d9a066" stroke="${INK}" stroke-width="3.5"/><path d="M10 26H40M10 38H40" stroke="#b07a42" stroke-width="3"/><ellipse cx="46" cy="22" rx="10" ry="9" fill="#3b3035" stroke="${INK}" stroke-width="3"/><ellipse cx="46" cy="42" rx="10" ry="9" fill="#3b3035" stroke="${INK}" stroke-width="3"/><path d="M58 32H62" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></svg>`;
/** A round arrow going back: the free « back » button. */
export const backArrow = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 22H40Q54 22 54 36Q54 50 40 50H22" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M24 8L8 22L24 36Z" fill="#8d68a0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></svg>`;
/** A speech bubble with a sound word (Boing, Bonk…), above a cell. */
export const bubbleWidth = (word: string): number => Math.max(90, word.length * 19 + 30);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="caisses-bubble"><path d="M${-w / 2} -96H${w / 2}Q${w / 2 + 10} -96 ${w / 2 + 10} -84V-52Q${w / 2 + 10} -40 ${w / 2} -40H12L0 -26L-6 -40H${-w / 2}Q${-w / 2 - 10} -40 ${-w / 2 - 10} -52V-84Q${-w / 2 - 10} -96 ${-w / 2} -96Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="0" y="-56" text-anchor="middle" font-size="34" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
/** What flies around a funny try: stars of a bumped nose, a splash, leaves, a puff of effort. */
export const effects: Readonly<Partial<Record<Fail, string>>> = {
    mur: `<g class="caisses-etoiles">${[[-30, -40], [0, -54], [30, -40]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.4)" d="M0 -26L7.6 -9.4L25.7 -8L12 3.8L16 21.5L0 12.2L-16 21.5L-12 3.8L-25.7 -8L-7.6 -9.4Z" fill="#ffe381" stroke="${INK}" stroke-width="5"/>`).join('')}</g>`,
    plouf: `<g class="caisses-splash"><ellipse rx="40" ry="14" fill="none" stroke="#fff" stroke-width="5"/><path d="M-20 -6L-30 -34M0 -10V-44M20 -6L30 -34" stroke="#cfeaff" stroke-width="7" stroke-linecap="round"/></g>`,
    orteil: `<g class="caisses-splash"><ellipse rx="26" ry="9" fill="none" stroke="#fff" stroke-width="4"/></g>`,
    buisson: `<g class="caisses-feuilles">${[[-26, -20, 30], [20, -30, -40], [4, 10, 80]].map(([x, y, r]) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 -12Q12 0 0 12Q-12 0 0 -12Z" fill="#7cc46c" stroke="${INK}" stroke-width="2.5"/>`).join('')}</g>`,
    porte: `<g class="caisses-toc"><path d="M-20 -30q-8 8 0 16M20 -30q8 8 0 16" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`
};
/** Each funny try has its own animation of Boubou, named after its CSS keyframes in style.css. */
export const failAnimations: Readonly<Record<Fail, string>> = {
    mur: 'caisses-nez', bonk: 'caisses-bonk', lourd: 'caisses-souffle', motif: 'caisses-gratte', plouf: 'caisses-bascule',
    buisson: 'caisses-pique', vide: 'caisses-fesses', orteil: 'caisses-brr', porte: 'caisses-frappe', trou: 'caisses-penche'
};
/** What the crate does during a funny try that involves it. */
export const crateAnimations: Readonly<Partial<Record<Fail, string>>> = { bonk: 'caisses-gros-yeux', lourd: 'caisses-tremble', motif: 'caisses-non', plouf: 'caisses-vacille', buisson: 'caisses-coince' };
/** The sound word of each funny try, in its bubble. */
export const failWords: Readonly<Record<'fr' | 'en', Record<Fail, string>>> = {
    fr: { mur: 'Boing !', bonk: 'Bonk !', lourd: 'Pfff !', motif: 'Non non', plouf: 'Oh oh !', buisson: 'Scritch', vide: 'Oups !', orteil: 'Brrr !', porte: 'Toc toc', trou: 'Ouh là !' },
    en: { mur: 'Boing!', bonk: 'Bonk!', lourd: 'Phew!', motif: 'No no', plouf: 'Uh oh!', buisson: 'Scritch', vide: 'Oops!', orteil: 'Brrr!', porte: 'Knock', trou: 'Whoa!' }
};
export { n as round };
