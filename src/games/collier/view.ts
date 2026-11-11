import { characterSvg } from '../../characters/svg';
import { GAP, HEIGHT, isUnlocked, launchOf, layout, levelOf, levels, paths, pointAt, R, spacing, stars, track, WIDTH, type Bead, type Feature, type LevelDef, type Miss, type Place, type Point, type Records, type State } from '../../engines/collier';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { ammo, bead, beadOf, butterfly, clasp, defs, INK, rock, swapIcon } from './art';

export const labels = {
    fr: { title: 'Le collier de Boubou', levels: 'Choisis un niveau',
        gesture: 'Touche le collier, ou glisse ton doigt pour viser, puis lâche !',
        intro: { arc: 'La perle arc-en-ciel va avec toutes les couleurs.', dodo: 'Une perle dort. Fais une ligne juste à côté : elle se réveille.', rocher: 'La perle rebondit sur le rocher : regarde la ligne.', deux: 'Deux colliers : vide les deux !', tour: 'Le collier fait le tour de Boubou : lance de tous les côtés.' } as Record<Feature, string>,
        goal: 'Fais trois pareilles : elles s’envolent.',
        miss: { boing: 'Boing ! La perle revient dans ma main.', toc: 'Toc ! Ça tourne un peu.', dodo: 'Chut… elle fait dodo.', chatouille: 'Hihi ! Ça chatouille. Encore une pareille !', bout: 'Hop, tout au bout du fil !', rougit: 'Oh ! La perle rougit. Pas la même couleur.' } as Record<Miss, string>,
        help: 'Regarde ce qui brille !', chain: 'Les deux bouts se rejoignent !', woke: 'Debout, petite perle !', fly: 'Ça s’envole !',
        won: 'Bravo ! Tout le collier s’est envolé !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau', swap: 'Échanger',
        board: 'Le collier : touche une place ou vise avec le doigt ; au clavier, les flèches pour viser, Entrée pour lancer, E pour échanger',
        next_bead: 'Perle suivante' },
    en: { title: 'Boubou’s necklace', levels: 'Choose a level',
        gesture: 'Touch the necklace, or slide your finger to aim, then let go!',
        intro: { arc: 'The rainbow bead goes with every colour.', dodo: 'A bead is asleep. Make a line right next to it: it wakes up.', rocher: 'The bead bounces off the rock: look at the line.', deux: 'Two necklaces: empty them both!', tour: 'The necklace goes all around Boubou: throw every way.' } as Record<Feature, string>,
        goal: 'Make three the same: they fly away.',
        miss: { boing: 'Boing! The bead comes back to my hand.', toc: 'Bonk! A little dizzy.', dodo: 'Shh… it is sleeping.', chatouille: 'Hee hee! That tickles. One more the same!', bout: 'Hop, right at the end of the string!', rougit: 'Oh! The bead blushes. Not the same colour.' } as Record<Miss, string>,
        help: 'Look at what shines!', chain: 'The two ends meet!', woke: 'Wake up, little bead!', fly: 'Off they fly!',
        won: 'Well done! The whole necklace flew away!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level', swap: 'Swap',
        board: 'The necklace: touch a place or aim with your finger; with the keyboard, arrows to aim, Enter to throw, S to swap',
        next_bead: 'Next bead' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal on the first scene. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = level.features.filter(f => levels.find(l => l.features.includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture, t.goal] : fresh.map(f => t.intro[f]))];
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
const n = (v: number): string => (Math.round(v * 10) / 10).toString();
export const at = (p: Point): string => `translate(${n(p.x)}px,${n(p.y)}px)`;
export const pictogram = svg(`${defs()}<path d="M6 22Q32 58 58 22" fill="none" stroke="${INK}" stroke-width="2"/>${[[10, 29], [20, 39], [32, 43], [44, 39], [54, 29]].map(([x, y], i) => `<g transform="translate(${x} ${y}) scale(.55)">${bead((['rouge', 'rouge', 'jaune', 'bleu', 'bleu'] as const)[i]!)}</g>`).join('')}<g transform="translate(32 13) scale(.7)">${butterfly('rouge')}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="collier"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('panda')}</div><div class="level-grid">${levels.map(l => `<button data-collier-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
const themes = [['#bfe6ff', '#f2fbff'], ['#ffe0ec', '#fff8fb'], ['#d9f2d0', '#f6fff2'], ['#e6dcff', '#faf7ff']] as const;
/** The string of a necklace, from its clasp to its last bead (or a stub when it is empty). */
export function threadD(level: LevelDef, k: number, count: number): string {
    const id = level.necklaces[k]!.path, t = track(id), end = count ? R + (count - 1) * spacing(id, count) : 0;
    const pts: Point[] = [t.points[0]!];
    for (let i = 1; i < t.points.length && t.cum[i]! < end; i++) pts.push(t.points[i]!);
    if (end > 0) pts.push(pointAt(t, end).p);
    return pts.map((p, i) => `${i ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`).join('');
}
/** Where a place is drawn: between two beads, or half a bead beyond an end. */
export function placePoint(level: LevelDef, necks: readonly (readonly Bead[])[], place: Place): Point {
    const beads = layout(level, necks)[place.neck]!, a = beads[place.index - 1], b = beads[place.index];
    if (a && b) return { x: (a.p.x + b.p.x) / 2, y: (a.p.y + b.p.y) / 2 };
    const one = (a ?? b)!, sign = a ? 1 : -1;
    return { x: one.p.x + one.dir.x * sign * GAP / 2, y: one.p.y + one.dir.y * sign * GAP / 2 };
}
export function beadsSvg(level: LevelDef, necks: readonly (readonly Bead[])[]): string {
    const pos = layout(level, necks);
    return necks.map((list, k) => list.map((b, i) => `<g data-bead="${b.id}" data-neck="${k}" data-index="${i}" data-color="${b.color}"${b.asleep ? ' data-asleep' : ''} style="transform:${at(pos[k]![i]!.p)}"><g class="collier-inner">${beadOf(b)}</g></g>`).join('')).join('');
}
/** The board: sky and meadow, the paths, the strings, rocks, the necklaces, the aim, Boubou's bead. */
export function boardSvg(s: State, locale: Locale, reduce = false): string {
    const level = levelOf(s.level), [sky, low] = themes[(s.level - 1) % themes.length]!, launch = launchOf(level);
    const ways = level.necklaces.map(nk => `<path d="${paths[nk.path].map((p, i) => `${i ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`).join('')}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`).join('');
    const strings = level.necklaces.map((nk, k) => `<path data-thread="${k}" d="${threadD(level, k, s.necks[k]!.length)}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(${n(paths[nk.path][0]!.x)} ${n(paths[nk.path][0]!.y)})">${clasp}</g>`).join('');
    const hills = `<path d="M0 ${HEIGHT}V${HEIGHT - 26}Q40 ${HEIGHT - 44} 80 ${HEIGHT - 28}T${WIDTH} ${HEIGHT - 30}V${HEIGHT}Z" fill="#a8dc8f"/><path d="M0 ${HEIGHT}V${HEIGHT - 12}Q60 ${HEIGHT - 24} ${WIDTH} ${HEIGHT - 10}V${HEIGHT}Z" fill="#8fcf74"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${labels[locale].board}">${defs()}<linearGradient id="collier-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${low}"/></linearGradient>`
        + `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#collier-sky)"/>${hills}${ways}${strings}`
        + (level.rocks ?? []).map(([x, y, r]) => `<g data-rock transform="translate(${x} ${y})">${rock(r)}</g>`).join('')
        + `<path data-help d="" fill="none" stroke="#f5b400" stroke-width="3" stroke-linecap="round" stroke-dasharray=".1 6" opacity="0"/>`
        + `<g data-beads>${beadsSvg(level, s.necks)}</g>`
        + `<g data-place opacity="0"><circle class="collier-pulse" r="9" fill="#fff6a8" fill-opacity=".55" stroke="#f5b400" stroke-width="3"/></g>`
        + `<path data-aim d="" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray=".1 5.4" opacity="0"/>`
        + `<g data-effects></g>`
        + boubouSvg(level, reduce)
        + `<g data-launcher transform="translate(${launch.x} ${launch.y})"><g data-current>${s.finished ? '' : ammo(s.queue[0])}</g></g>`
        + `<g data-flight style="display:none"></g></svg>`;
}
/** Boubou stands behind his bead, drawn in the board so that the bead he holds stays in front of him. When a throw goes
 * into the void he scratches his head (a paw and a question mark). */
export const BOUBOU = 52;
export function boubouSvg(level: LevelDef, reduce: boolean): string {
    const l = launchOf(level), x = l.x - BOUBOU / 2, y = l.y - BOUBOU * 0.52;
    const body = characterSvg('panda', 'joie', 'repos', reduce ? 'reduce' : 'full').replace('<svg ', `<svg x="${n(x)}" y="${n(y)}" width="${BOUBOU}" height="${BOUBOU}" `);
    return `<g class="collier-boubou" aria-hidden="true"><g class="collier-boubou-body">${body}</g><g transform="translate(${n(l.x + 8)} ${n(y + 6)})"><g class="collier-scratch"><circle r="5" fill="#3d3440" stroke="${INK}" stroke-width="1.4"/><text x="6" y="-4" font-size="11" font-weight="700" fill="${INK}" font-family="sans-serif">?</text></g></g></g>`;
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="collier-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="collier-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="collier-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="collier collier-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="collier-instruction"><div id="guide">${characterSvg('panda', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="collier-message" aria-live="polite">${typeset(message)}</p></div>`
        + `<div class="collier-stage"><div class="collier-zone" tabindex="0" role="application" aria-label="${t.board}">${boardSvg(s, locale, reduce)}${finish}</div></div>`
        + `<div class="collier-tools"><button id="collier-echange"${s.finished ? ' disabled' : ''} aria-label="${t.swap}"><span class="collier-hand" data-hand>${svg(`${defs()}<g transform="translate(32 32) scale(2.6)">${s.finished ? '' : ammo(s.queue[1])}</g>`)}</span>${svg(swapIcon, '0 0 36 36')}<span>${t.swap}</span></button></div></section>`;
}
