import { characterSvg } from '../../characters/svg';
import { featuresOf, height, isUnlocked, levels, nuggetsOf, stars, width, type Fail, type Feature, type LevelDef, type Move, type Records, type State } from '../../engines/pepites';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { apple, arrow, backArrow, door, giant, ground, lumi, nugget, rock, U, water, worm } from './art';

export const labels = {
    fr: { title: 'Les pépites de Lumi', levels: 'Choisis un niveau',
        gesture: 'Glisse ton doigt ou touche une flèche : Lumi creuse d’une case.',
        intro: { rocher: 'Attention : un rocher tombe quand on creuse dessous.', pousser: 'Un rocher dans la galerie ? Pousse-le sur le côté.', pomme: 'Les pommes roulent sur les rochers. Ramasse-les !', dure: 'La roche dure ne se creuse pas : fais le tour.', eau: 'L’eau coule dans les galeries que tu creuses.', ver: 'Un ver dort dans le passage : donne-lui une pomme.', geante: 'La pépite géante : frappe deux fois.' } as Record<Feature, string>,
        goal: 'Ramasse toutes les pépites, puis rentre à la maison.',
        fail: { racine: 'Aïe ! Des racines, on ne passe pas.', dure: 'Bzzz ! La roche dure ne se creuse pas.', lourd: 'Hmpf ! Ce rocher est trop lourd.', ver: 'Aaah… Le ver bâille : il veut une pomme.', plouf: 'Plouf ! L’eau est trop froide.', porte: 'Pas encore ! Il reste des pépites.', chapeau: 'Bonk ! Le rocher rebondit sur le chapeau.' } as Record<Fail, string>,
        shine: 'Regarde ce qui brille !', nugget: 'Une pépite !', giant: 'La pépite géante !', crack: 'Toc ! Elle se fêle.', apple: 'Une pomme dans le panier !', caught: 'Attrapée !', fed: 'Miam ! Le ver s’en va.', splash: 'Plouf, toute mouillée !', ready: 'La porte s’ouvre !', undo: 'On revient en arrière.',
        won: 'Bravo ! Lumi est rentrée chez elle !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau', back: 'Retour',
        board: 'Le jardin sous la terre : glisse ou touche une case à côté de Lumi ; au clavier, les flèches, Retour arrière pour revenir',
        nuggets: 'Pépites à ramasser', basket: 'Pommes dans le panier' },
    en: { title: 'Lumi’s nuggets', levels: 'Choose a level',
        gesture: 'Slide your finger or touch an arrow: Lumi digs one cell.',
        intro: { rocher: 'Careful: a rock falls when you dig under it.', pousser: 'A rock in the gallery? Push it to the side.', pomme: 'Apples roll off rocks. Pick them up!', dure: 'Hard rock cannot be dug: go round it.', eau: 'Water runs into the galleries you dig.', ver: 'A worm sleeps in the way: give it an apple.', geante: 'The giant nugget: knock twice.' } as Record<Feature, string>,
        goal: 'Pick up every nugget, then go home.',
        fail: { racine: 'Ouch! Roots, no way through.', dure: 'Bzzz! Hard rock cannot be dug.', lourd: 'Hmph! This rock is too heavy.', ver: 'Yaaawn… The worm wants an apple.', plouf: 'Splash! The water is too cold.', porte: 'Not yet! Some nuggets are left.', chapeau: 'Bonk! The rock bounces on the hat.' } as Record<Fail, string>,
        shine: 'Look at what shines!', nugget: 'A nugget!', giant: 'The giant nugget!', crack: 'Knock! It cracks.', apple: 'An apple in the basket!', caught: 'Caught it!', fed: 'Yum! The worm goes away.', splash: 'Splash, all wet!', ready: 'The door opens!', undo: 'One step back.',
        won: 'Well done! Lumi is home!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level', back: 'Back',
        board: 'The garden under the ground: slide or touch a cell next to Lumi; with the keyboard, arrows, Backspace to go back',
        nuggets: 'Nuggets to pick up', basket: 'Apples in the basket' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.goal];
}
export const pictogram = svg(`<rect x="4" y="30" width="56" height="30" rx="6" fill="#bd824e"/><rect x="22" y="30" width="20" height="30" fill="#553626"/><g transform="translate(14 22) scale(.22)">${rock()}</g><g transform="translate(46 44) scale(.3)">${nugget()}</g><g transform="translate(32 26) scale(.3)">${lumi()}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="pepites"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-pepites-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
/** How the garden fits its stage: square cells as big as the stage allows (at most `MAX_CELL` px), the board in the middle
 * and the rest of the stage given to the earth around it, with grass on top. Never turned: things fall downwards. All in
 * units, a cell being 100 wide. */
export const MAX_CELL = 96;
export interface Layout { cell: number; ox: number; oy: number; W: number; H: number }
export function layout(level: LevelDef, stageW: number, stageH: number): Layout {
    const w = width(level), h = height(level), cell = Math.max(1, Math.min(stageW / w, stageH / h, MAX_CELL));
    const W = Math.max(w * U, stageW / cell * U), H = Math.max(h * U, stageH / cell * U);
    return { cell, ox: (W - w * U) / 2, oy: (H - h * U) / 2, W, H };
}
export const cx = (l: Layout, x: number): number => l.ox + x * U + U / 2;
export const cy = (l: Layout, y: number): number => l.oy + y * U + U / 2;
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
/** What a cell of the grid shows under everything that moves. */
export function cellSvg(c: string, x: number, y: number): string {
    const base = c === '.' ? ground('terre', x, y) : c === '#' ? ground('racine', x, y) : c === 'X' ? ground('dure', x, y) : ground('galerie', x, y);
    const top = c === '*' ? `<g class="pepites-pepite"><g transform="scale(1.45)">${nugget()}</g></g>` : c === 'G' || c === 'g' ? `<g class="pepites-geante">${giant(c === 'g')}</g>` : c === 'v' ? worm() : c === 'P' ? door() : '';
    return base + top;
}
/** The things that move: rocks, apples and water. */
export const objectSvg = (c: string): string => c === 'o' ? rock() : c === 'a' ? apple() : water();
/** The garden: earth around, the cells, then the layers that move (things, Lumi, arrows, effects). */
export function boardSvg(level: LevelDef, l: Layout, locale: Locale): string {
    const top = l.oy;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(l.W)} ${n(l.H)}" role="img" aria-label="${labels[locale].board}">`
        + `<rect width="${n(l.W)}" height="${n(l.H)}" fill="#a8703f"/>${top > 0 ? `<rect width="${n(l.W)}" height="${n(Math.max(0, top - 12))}" fill="#bfe7ff"/><rect y="${n(Math.max(0, top - 30))}" width="${n(l.W)}" height="22" fill="#7cc46c"/>` : ''}`
        + `<rect x="${n(l.ox - 8)}" y="${n(l.oy - 8)}" width="${width(level) * U + 16}" height="${height(level) * U + 16}" rx="16" fill="none" stroke="#6b4428" stroke-width="10"/>`
        + `<g data-cells></g><g data-objects></g><g data-arrows></g><g data-lumi><g class="pepites-inner">${lumi()}</g></g><g data-effects></g></svg>`;
}
export const arrowsSvg = (cells: { action: Move; x: number; y: number }[], l: Layout): string =>
    cells.map(c => `<g data-arrow="${c.action}" transform="translate(${n(cx(l, c.x))} ${n(cy(l, c.y))})"><g class="pepites-arrow">${arrow({ haut: -90, bas: 90, gauche: 180, droite: 0 }[c.action])}</g></g>`).join('');
/** The row under Lumi: the nuggets of the scene (a picked one fades) and the apples in her basket. */
export function goalsHtml(level: LevelDef, left: number, basket: number, locale: Locale): string {
    const total = nuggetsOf(level), t = labels[locale];
    return `<div class="pepites-goals"><span class="pepites-nuggets" role="img" aria-label="${t.nuggets} : ${left}">${Array.from({ length: total }, (_, i) => `<span data-goal="${i}"${i < total - left ? ' data-got' : ''}>${svg(`<g transform="translate(32 32) scale(.7)">${nugget()}</g>`)}</span>`).join('')}</span>`
        + `<span class="pepites-basket" role="img" aria-label="${t.basket} : ${basket}">${Array.from({ length: basket }, () => `<span data-apple>${svg(`<g transform="translate(32 34) scale(.7)">${apple()}</g>`)}</span>`).join('')}</span></div>`;
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean, left: number): string {
    const t = labels[locale], won = stars(s), level = levels[s.level - 1]!;
    const finish = s.finished ? `<div class="pepites-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="pepites-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="pepites-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="pepites pepites-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="pepites-instruction"><div id="guide">${characterSvg('licorne', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="pepites-message" aria-live="polite">${typeset(message)}</p></div>`
        + goalsHtml(level, left, s.basket, locale)
        + `<div class="pepites-stage"><div class="pepites-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div>`
        + `<div class="pepites-tools"><button id="pepites-retour" aria-label="${t.back}">${backArrow}<span>${t.back}</span></button></div></section>`;
}
