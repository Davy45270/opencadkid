import { characterSvg } from '../../characters/svg';
import type { Miss } from '../../engines/arrosoir';
import type { Locale } from '../../shell/i18n';
/** Drawings of « L'arrosoir de CaliRoux », in board units (the board is 160 × 256), in the ink and rounded strokes of the
 * guides. Every thing standing on the ground is drawn with its foot at (0, 0). Flowers, CaliRoux, the balloon and the
 * dots are drawn big and bright on a pale meadow so that a five-year-old reads them at once. */
export const INK = '#583746';
const n = (v: number): string => (Math.round(v * 10) / 10).toString();
const PETALS: readonly string[] = ['#ff4f9a', '#ffbf1a', '#9b5cff'];
const HEARTS: readonly string[] = ['#fff3a0', '#9a5a2a', '#fff3a0'];
const STEM = '#3f8f3a';
/** A flower, its foot at (0, 0), drawn inside its box (18 wide, 30 high, see FLOWER_HALF and FLOWER_H): thirsty, its
 * bright bud hangs its head on a bent stem with a drop of sweat; open, it stands up, its petals wide round a smiling heart.
 * Both keep the same bright colour and a dark outline, so that a thirsty flower never melts into the grass. `kind` changes
 * the colour (pink, yellow, purple). */
export function flower(kind: number, open: boolean): string {
    const petal = PETALS[kind % 3]!, heart = HEARTS[kind % 3]!;
    if (!open) return `<path d="M0 0C0 -12 2 -24 -2 -28Q-5 -30 -5 -24" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="M0 0C0 -12 2 -24 -2 -28Q-5 -30 -5 -24" fill="none" stroke="${STEM}" stroke-width="2.4" stroke-linecap="round"/>`
        + `<path d="M0 -8q6 -6 9 -2q-4 5 -9 2ZM0 -4q-6 -5 -9 -1q4 4 9 1Z" fill="#6cc05a" stroke="${INK}" stroke-width="1.2"/>`
        + `<g transform="translate(-5 -23)"><path d="M-4 0Q-5 8 0 10Q5 8 4 0Z" fill="${petal}" stroke="${INK}" stroke-width="1.5"/><path d="M-1.5 1.5Q-1.5 6 0 8" fill="none" stroke="#fff" stroke-width="1" opacity=".7"/><path d="M-4.4 0Q0 -3 4.4 0Q0 2.4 -4.4 0Z" fill="#6cc05a" stroke="${INK}" stroke-width="1.1"/></g>`
        + `<path d="M5 -26q-2 3 0 4q2 -1 0 -4Z" fill="#6cc0f5" stroke="#2f7fc4" stroke-width=".8"/>`;
    const petals = Array.from({ length: 8 }, (_, i) => `<ellipse transform="rotate(${i * 45})" cy="-4.6" rx="2.9" ry="4.2" fill="${petal}" stroke="${INK}" stroke-width="1.1"/>`).join('');
    return `<path d="M0 0V-16" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="M0 0V-16" stroke="${STEM}" stroke-width="2.4" stroke-linecap="round"/><path d="M0 -5q-6 -5 -8.6 -1q4 4 8.6 1ZM0 -9q6 -5 8.6 -1q-4 4 -8.6 1Z" fill="#6cc05a" stroke="${INK}" stroke-width="1.1"/>`
        + `<g transform="translate(0 -21)" class="arrosoir-tete">${petals}<circle r="3.8" fill="${heart}" stroke="${INK}" stroke-width="1.1"/><circle cx="-1.3" cy="-.6" r=".65" fill="${INK}"/><circle cx="1.3" cy="-.6" r=".65" fill="${INK}"/><path d="M-1.3 .9q1.3 1.2 2.6 0" fill="none" stroke="${INK}" stroke-width=".7" stroke-linecap="round"/></g>`;
}
/** CaliRoux himself (the guide's drawing), standing beside his sling, his feet on the ground at (0, 0). */
export const caliroux = (expression: 'joie' | 'surprise' | 'celebration' | 'concentre'): string =>
    characterSvg('pandaroux', expression, 'repos', 'reduce').replace('<svg ', '<svg x="-24" y="-45" width="48" height="48" ');
/** The sling: a wooden Y, its mouth `h` above the ground. */
export const sling = (h: number): string => `<path d="M0 0V${-h + 8}M0 ${-h + 9}L-5 ${-h}M0 ${-h + 9}L5 ${-h}" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/><path d="M0 0V${-h + 8}M0 ${-h + 9}L-5 ${-h}M0 ${-h + 9}L5 ${-h}" fill="none" stroke="#b9814d" stroke-width="2.6" stroke-linecap="round"/>`;
/** The soft water balloon: a round blue drop with a shine and a little knot. */
export const balloon = (): string => `<path d="M0 6l-2 3h4Z" fill="#3c8fd6" stroke="${INK}" stroke-width="1"/><circle r="6.2" fill="#6cc0f5" stroke="${INK}" stroke-width="1.5"/><ellipse cx="-2.2" cy="-2.4" rx="1.8" ry="2.6" fill="#fff" opacity=".75"/>`;
/** One dot of the dotted line; the help's dots are golden. */
export const dot = (x: number, y: number, gold = false): string => `<circle cx="${n(x)}" cy="${n(y)}" r="${gold ? 2.4 : 2.2}" fill="${gold ? '#ffd23f' : '#fff'}" stroke="${gold ? '#c28a00' : '#3c8fd6'}" stroke-width="1.1"/>`;
/** An apple tree, its foot at (0, 0), its crown `h` up. */
export const tree = (h: number): string => `<path d="M-3 0V${-h + 6}h6V0Z" fill="#9a6a3c" stroke="${INK}" stroke-width="1.4"/><g transform="translate(0 ${-h})" class="arrosoir-couronne"><circle r="15" fill="#5ab56b" stroke="${INK}" stroke-width="1.6"/><circle cx="-7" cy="-5" r="6" fill="#74c97f"/>`
    + [[-6, 4], [6, -4], [3, 8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.8" fill="#e8463c" stroke="${INK}" stroke-width=".9"/>`).join('') + `</g>`;
/** An apple, for the one that falls on CaliRoux's head. */
export const apple = (): string => `<circle r="3.6" fill="#e8463c" stroke="${INK}" stroke-width="1"/><path d="M0 -3.4q1 -2 2.4 -2.6" fill="none" stroke="${INK}" stroke-width=".9"/>`;
/** A cow, her feet at (0, 0), looking left, drawn within COW_SPAN. */
export const cow = (): string => `<g transform="scale(.86)"><g class="arrosoir-vache-corps"><path d="M-12 0V-6M-6 0V-6M6 0V-6M12 0V-6" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><rect x="-15" y="-19" width="30" height="14" rx="6" fill="#fff" stroke="${INK}" stroke-width="1.5"/><path d="M-6 -19q4 6 -2 9q-5 -2 -3 -9ZM6 -14q5 -2 6 3q-4 3 -8 0Z" fill="#3b3035"/><path d="M15 -14q4 4 3 8" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/></g>`
    + `<g class="arrosoir-vache-tete" transform="translate(-16 -18)"><path d="M-4 -6q-5 -3 -6 -7M4 -6q5 -3 6 -7" fill="none" stroke="#e8d6a0" stroke-width="2.2" stroke-linecap="round"/><ellipse rx="7" ry="6.5" fill="#fff" stroke="${INK}" stroke-width="1.4"/><ellipse cy="4" rx="5.5" ry="3.2" fill="#ffb3c4" stroke="${INK}" stroke-width="1.1"/><circle cx="-2.4" cy="-1.6" r="1.1" fill="${INK}"/><circle cx="2.4" cy="-1.6" r="1.1" fill="${INK}"/></g></g>`;
/** The duck on the pond, its waterline at (0, 0). */
export const duck = (): string => `<path d="M-8 0q0 -8 8 -8q5 0 7 3l-1 5Z" fill="#fff6c8" stroke="${INK}" stroke-width="1.3"/><circle cx="5" cy="-10" r="4.4" fill="#fff6c8" stroke="${INK}" stroke-width="1.3"/><path d="M9 -10l4 1l-4 1.6Z" fill="#f2a33a" stroke="${INK}" stroke-width=".9"/><circle cx="6" cy="-11" r=".9" fill="${INK}"/>`;
/** The passing cloud, centred on (0, 0), with a sleepy smile. */
export const cloud = (): string => `<g class="arrosoir-nuage-corps"><path d="M-18 6q-6 -8 2 -11q0 -9 10 -8q4 -6 12 -2q10 -2 10 7q8 2 4 10Z" fill="#fff" stroke="#9fb3c8" stroke-width="1.5"/><path d="M-6 0q2 1.6 4 0M4 0q2 1.6 4 0M-2 4q2 1.4 4 0" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/></g>`;
/** The giant watering can, its foot at (0, 0). */
export const can = (): string => `<path d="M-10 -4l-11 -12" stroke="#2f8f5c" stroke-width="4" stroke-linecap="round"/><ellipse cx="-22" cy="-17" rx="3" ry="4" fill="#3fae72" stroke="${INK}" stroke-width="1.1"/><rect x="-10" y="-20" width="20" height="20" rx="3" fill="#3fae72" stroke="${INK}" stroke-width="1.5"/><path d="M-6 -20q6 -10 12 0" fill="none" stroke="${INK}" stroke-width="2.4"/><path d="M-4 -10l3 3l5 -6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`;
/** The windsock on its pole and a big arrow the way the wind blows, `wind` notches strong. */
export function windsock(wind: number): string {
    const dir = Math.sign(wind), len = 16 + Math.abs(wind) * 6;
    const stripes = Array.from({ length: 4 }, (_, i) => `<path d="M${n(dir * i * len / 4)} ${n(-4 + i * .6)}h${n(dir * len / 4)}v${n(8 - i * 1.2 - 1.2)}h${n(-dir * len / 4)}Z" fill="${i % 2 ? '#fff' : '#e8463c'}" stroke="${INK}" stroke-width=".9"/>`).join('');
    return `<path d="M0 0V-34" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><g transform="translate(0 -30)" class="arrosoir-manche">${stripes}</g>`
        + `<g transform="translate(${n(dir * (len + 14))} -30)"><path d="M${-dir * 10} 0H${dir * 4}" stroke="#4d95c6" stroke-width="${2 + Math.abs(wind) * 1.4}" stroke-linecap="round"/><path d="M${dir * 2} -6L${dir * 11} 0L${dir * 2} 6Z" fill="#4d95c6" stroke="${INK}" stroke-width="1"/></g>`;
}
/** A splash of water drops round the place where a balloon burst. */
export const splashDrops = (big: boolean): string => {
    const r = big ? 1.7 : 1;
    return `<g class="arrosoir-splash">${Array.from({ length: 10 }, (_, i) => { const a = (i * 36 + 10) * Math.PI / 180; return `<ellipse cx="${n(Math.cos(a) * 10 * r)}" cy="${n(-Math.abs(Math.sin(a)) * 10 * r - 2)}" rx="2.2" ry="3" fill="#6cc0f5" stroke="#3c8fd6" stroke-width=".8"/>`; }).join('')}<ellipse rx="${n(9 * r)}" ry="2.6" fill="#6cc0f5" opacity=".7"/></g>`;
};
/** A puddle in the sand, and the frog that comes into it. */
export const puddle = (): string => `<ellipse rx="10" ry="2.6" fill="#7cc6f0" stroke="#3c8fd6" stroke-width="1"/>`;
export const frog = (): string => `<ellipse cy="-4" rx="6" ry="4.4" fill="#6fcf5f" stroke="${INK}" stroke-width="1.2"/><circle cx="-3" cy="-8" r="2.2" fill="#6fcf5f" stroke="${INK}" stroke-width="1"/><circle cx="3" cy="-8" r="2.2" fill="#6fcf5f" stroke="${INK}" stroke-width="1"/><circle cx="-3" cy="-8.4" r=".9" fill="${INK}"/><circle cx="3" cy="-8.4" r=".9" fill="${INK}"/><path d="M-2.6 -3q2.6 2 5.2 0" fill="none" stroke="${INK}" stroke-width=".9"/>`;
/** A tuft of grass grown where a balloon fell on the meadow. */
export const tuft = (): string => `<path d="M-5 0q1 -7 -2 -10M0 0q0 -8 1 -12M5 0q-1 -7 3 -9" fill="none" stroke="#3f9a45" stroke-width="1.8" stroke-linecap="round"/><circle cx="1" cy="-12" r="1.6" fill="#ffd23f"/>`;
export const fish = (): string => `<path d="M-6 0q6 -6 12 0q-6 6 -12 0ZM-6 0l-5 -4v8Z" fill="#ff9a3c" stroke="${INK}" stroke-width="1.1"/><circle cx="3" cy="-1" r=".8" fill="${INK}"/>`;
export const heart = (): string => `<path d="M0 3l-5 -5q-3 -4 1 -6q3 -1 4 2q1 -3 4 -2q4 2 1 6Z" fill="#ff5c8a" stroke="${INK}" stroke-width="1"/>`;
export const rain = (): string => Array.from({ length: 7 }, (_, i) => `<path d="M${-15 + i * 5} ${8 + (i % 2) * 4}l-1 4" stroke="#3c8fd6" stroke-width="1.6" stroke-linecap="round"/>`).join('');
export const rainbow = (): string => ['#e8463c', '#ff9a3c', '#ffd23f', '#5ab56b', '#4d95c6', '#9b6bd3'].map((c, i) => `<path d="M10 160A70 70 0 0 1 150 160" transform="translate(0 ${i * 4})" fill="none" stroke="${c}" stroke-width="4.2" opacity=".85"/>`).join('');
export const butterfly = (c: string): string => `<g class="arrosoir-ailes"><path d="M0 0q-8 -9 -9 -2q1 5 9 2q-6 7 -1 7q2 0 1 -7Z" fill="${c}" stroke="${INK}" stroke-width=".9"/><path d="M0 0q8 -9 9 -2q-1 5 -9 2q6 7 1 7q-2 0 -1 -7Z" fill="${c}" stroke="${INK}" stroke-width=".9"/></g><path d="M0 -3v7" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`;
/** The ghost hand of the help: it pulls the balloon back the good way. */
export const hand = (): string => `<g opacity=".8"><path d="M-3 -9q0 -4 3 -4q3 0 3 4v6l4 -1q3 0 3 3l-2 9q-1 4 -5 4h-6q-4 0 -5 -4l-2 -8q0 -3 3 -2l2 2Z" fill="#fff" stroke="#c28a00" stroke-width="1.5" stroke-linejoin="round"/></g>`;
/** Each funny try has its own animation (a CSS class of src/style.css). */
export const missAnimations: Readonly<Record<Miss, string>> = {
    court: 'arrosoir-ebroue', loin: 'arrosoir-poisson', pousse: 'arrosoir-pousse', mare: 'arrosoir-grenouille', bisou: 'arrosoir-bisou',
    vache: 'arrosoir-meuh', etang: 'arrosoir-vague', arbre: 'arrosoir-pomme', nuage: 'arrosoir-pluie'
};
/** The word in the bubble. */
export const missWords: Readonly<Record<Locale, Readonly<Record<Miss, string>>>> = {
    fr: { court: 'Ploc !', loin: 'Plouf !', pousse: 'Pousse !', mare: 'Croâ !', bisou: 'Smack !', vache: 'Meuh !', etang: 'Coin !', arbre: 'Bonk !', nuage: 'Plic ploc !' },
    en: { court: 'Splosh!', loin: 'Splash!', pousse: 'Sprout!', mare: 'Ribbit!', bisou: 'Smack!', vache: 'Moo!', etang: 'Quack!', arbre: 'Bonk!', nuage: 'Pitter!' }
};
export const bubbleWidth = (word: string): number => Math.max(34, word.length * 7.4 + 12);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="arrosoir-bulle"><rect x="${n(-w / 2)}" y="-40" width="${n(w)}" height="20" rx="9" fill="#fff" stroke="${INK}" stroke-width="1.4"/><path d="M-3 -20.6L0 -14L4 -20.6Z" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><text y="-25.6" text-anchor="middle" font-size="13" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
