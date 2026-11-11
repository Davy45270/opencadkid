import { characterSvg } from '../../characters/svg';
import { featuresOf, FANS, height, isCarton, isDouble, isUnlocked, levels, stars, treasuresOf, width, type Fail, type Feature, type LevelDef, type Reaction, type Records, type State, type Treasure } from '../../engines/cartons';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { bonus, box, boxIcon, brick, carton, fan, flowers, treasure, tutu, U, waitIcon, yard } from './art';

export const labels = {
    fr: { title: 'Les surprises de Tutu', levels: 'Choisis un niveau',
        gesture: 'Touche une case à côté de Tutu pour marcher. Le bouton boîte pose la boîte à confettis : 3, 2, 1… pouf !',
        intro: { mur: 'Les confettis s’arrêtent sur les briques.', double: 'Un gros carton s’ouvre avec deux poufs.', fleurs: 'Tutu ne marche pas sur les fleurs, mais les confettis passent au-dessus.', grande: 'Prends la grande boîte : les confettis vont plus loin.', ami: 'Un ami se promène dans la cour.', ventilo: 'Le ventilateur souffle la boîte d’une case.', boites: 'Prends la boîte en plus : deux boîtes à la fois !' } as Record<Feature, string>,
        goal: 'Trouve les surprises cachées dans les cartons.',
        funny: { grimace: 'Beuh ! Tutu fait une grimace au mur.', carton: 'Toc toc ! Le carton ne bouge pas : il faut des confettis.', fleurs: 'Chut ! Tutu ne marche pas sur les fleurs.', boite: 'Hi hi ! La boîte compte, Tutu ne marche pas dessus.', poche: 'Oups ! La poche est vide : la boîte va revenir.',
            eternue: 'Atchoum ! Tutu est couvert de confettis.', coucou: 'Coucou ! Un clown sort du carton vide.', rebond: 'Boing ! Les confettis rebondissent sur les briques.', danse: 'Youpi ! Les confettis font danser notre ami.', pfff: 'Pfff… Aucun carton par ici : la boîte fait un tout petit pouf.' } as Record<Fail | Reaction, string>,
        found: { pomme: 'Des pommes !', chaton: 'Un chaton !', ballons: 'Des ballons !', ours: 'Un ours en peluche !' } as Record<Treasure, string>,
        shine: 'Regarde la case qui brille !', bigBox: 'La grande boîte ! Les confettis vont plus loin.', moreBox: 'Une boîte en plus dans la poche !',
        won: 'Bravo ! Toutes les surprises sont trouvées : c’est la fête !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        put: 'Poser la boîte', putShort: 'Boîte', wait: 'Attendre', waitShort: 'Attendre', shelf: 'Surprises trouvées',
        board: 'Cour de Tutu : touche une case voisine pour marcher ; au clavier, flèches pour marcher, Espace pour poser la boîte, Entrée pour attendre',
        arrows: { haut: 'Monter', bas: 'Descendre', gauche: 'Gauche', droite: 'Droite' } },
    en: { title: 'Tutu’s surprises', levels: 'Choose a level',
        gesture: 'Touch a cell next to Tutu to walk. The box button puts down the confetti box: 3, 2, 1… pouf!',
        intro: { mur: 'Confetti stop on the bricks.', double: 'A big carton opens with two poufs.', fleurs: 'Tutu never walks on the flowers, but confetti fly over them.', grande: 'Take the big box: the confetti fly further.', ami: 'A friend is walking in the yard.', ventilo: 'The fan blows the box one cell.', boites: 'Take the extra box: two boxes at once!' } as Record<Feature, string>,
        goal: 'Find the surprises hidden in the cartons.',
        funny: { grimace: 'Yuck! Tutu pulls a face at the wall.', carton: 'Knock knock! The carton won’t move: it needs confetti.', fleurs: 'Shh! Tutu never walks on the flowers.', boite: 'Tee hee! The box is counting, Tutu won’t step on it.', poche: 'Oops! The pocket is empty: the box will come back.',
            eternue: 'Atchoo! Tutu is covered in confetti.', coucou: 'Peekaboo! A clown pops out of the empty carton.', rebond: 'Boing! The confetti bounce off the bricks.', danse: 'Yippee! The confetti make our friend dance.', pfff: 'Pfff… No carton around here: the box makes a tiny pouf.' } as Record<Fail | Reaction, string>,
        found: { pomme: 'Apples!', chaton: 'A kitten!', ballons: 'Balloons!', ours: 'A teddy bear!' } as Record<Treasure, string>,
        shine: 'Look at the cell that shines!', bigBox: 'The big box! The confetti fly further.', moreBox: 'One more box in the pocket!',
        won: 'Well done! Every surprise is found: party time!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        put: 'Put the box down', putShort: 'Box', wait: 'Wait', waitShort: 'Wait', shelf: 'Surprises found',
        board: 'Tutu’s yard: touch a cell next to Tutu to walk; with the keyboard, arrows to walk, Space to put the box down, Enter to wait',
        arrows: { haut: 'Up', bas: 'Down', gauche: 'Left', droite: 'Right' } }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.goal];
}
export const pictogram = svg(`<rect x="4" y="34" width="56" height="26" rx="6" fill="#efe2c9"/><g transform="translate(44 40) scale(.32)">${carton(false)}</g><g transform="translate(20 46) scale(.26)">${box(3)}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="cartons"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('singe')}</div><div class="level-grid">${levels.map(l => `<button data-cartons-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»…])/g, ' $1');
/** How the yard fits its stage: square cells as big as the stage allows (at most `MAX_CELL` px), the yard in the middle and
 * the rest of the stage given to the fence and the grass around it. All in units, a cell being 100 wide. */
export const MAX_CELL = 110;
const INK_FENCE = '#8a5a2e';
export interface Layout { cell: number; ox: number; oy: number; W: number; H: number }
export function layout(level: LevelDef, stageW: number, stageH: number): Layout {
    const w = width(level), h = height(level), cell = Math.max(1, Math.min(stageW / w, stageH / h, MAX_CELL));
    const W = Math.max(w * U, stageW / cell * U), H = Math.max(h * U, stageH / cell * U);
    return { cell, ox: (W - w * U) / 2, oy: (H - h * U) / 2, W, H };
}
/** The centre of the cell x, y on the board, in units. */
export const cx = (l: Layout, x: number): number => l.ox + x * U + U / 2;
export const cy = (l: Layout, y: number): number => l.oy + y * U + U / 2;
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
const ANGLE: Readonly<Record<string, number>> = { droite: 0, bas: 90, gauche: 180, haut: -90 };
/** What stands on a cell of the grid, drawn above the ground: a carton, a bonus. */
export function thing(c: string): string {
    if (isCarton(c)) return carton(isDouble(c));
    if (c === 'g' || c === 'm') return bonus(c);
    return '';
}
/** The yard: grass, the fence, the ground of every cell (yard, bricks, flowers, fans), then the layers that move. */
export function boardSvg(level: LevelDef, l: Layout, locale: Locale): string {
    const cells: string[] = [], grid = level.rows.join('').replace('@', '.'), w = width(level);
    for (let y = 0; y < height(level); y++) for (let x = 0; x < w; x++) {
        const c = grid[y * w + x]!, at = `transform="translate(${n(cx(l, x))} ${n(cy(l, y))})"`;
        const ground = c === '#' ? brick() : c === '*' ? flowers(x, y) : yard(x, y) + (FANS[c] ? fan(ANGLE[FANS[c]]!) : '');
        cells.push(`<g ${at}${c === '#' ? ' data-brick' : c === '*' ? ' data-flowers' : FANS[c] ? ` data-fan="${FANS[c]}"` : ''}>${ground}</g>`);
    }
    const tufts = Array.from({ length: Math.ceil(l.W / 120) + 1 }, (_, i) => `<circle cx="${i * 120}" cy="${n(l.H - 6)}" r="40" fill="#7cc46c"/><circle cx="${i * 120 + 60}" cy="6" r="34" fill="#7cc46c"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(l.W)} ${n(l.H)}" role="img" aria-label="${labels[locale].board}">`
        + `<rect width="${n(l.W)}" height="${n(l.H)}" fill="#8fcf74"/>${tufts}<rect x="${n(l.ox - 12)}" y="${n(l.oy - 12)}" width="${width(level) * U + 24}" height="${height(level) * U + 24}" rx="18" fill="#d9b98a" stroke="${INK_FENCE}" stroke-width="6"/>`
        + `<g data-ground>${cells.join('')}</g><g data-things></g><g data-reach></g><g data-arrows></g><g data-friends></g>`
        + `<g data-hero><g class="cartons-inner"><g class="cartons-tutu">${tutu('joie')}</g></g></g><g data-boxes></g><g data-effects></g></svg>`;
}
/** The shelf: every treasure of the scene, grey until found. */
export function shelfHtml(level: LevelDef, s: State, locale: Locale): string {
    const all = treasuresOf(level), got = [...s.found];
    const items = all.map(k => { const i = got.indexOf(k); if (i >= 0) got.splice(i, 1); return [k, i >= 0] as const; });
    return `<div class="cartons-shelf" role="img" aria-label="${labels[locale].shelf} : ${s.found.length} / ${all.length}">${items.map(([k, ok]) => `<span data-treasure="${k}"${ok ? ' data-found' : ''}>${svg(`<g transform="translate(32 32) scale(.6)">${treasure(k)}</g>`)}</span>`).join('')}</div>`;
}
export function gameView(s: State, level: LevelDef, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="cartons-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="cartons-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="cartons-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="cartons cartons-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="cartons-instruction"><div id="guide">${characterSvg('singe', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="cartons-message" aria-live="polite">${typeset(message)}</p></div>`
        + shelfHtml(level, s, locale)
        + `<div class="cartons-stage"><div class="cartons-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div>`
        + `<div class="cartons-tools"><button id="cartons-poser" aria-label="${t.put}">${boxIcon}<span>${t.putShort}</span></button><button id="cartons-attendre" aria-label="${t.wait}">${waitIcon}<span>${t.waitShort}</span></button></div></section>`;
}
