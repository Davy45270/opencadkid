import { characterSvg } from '../../characters/svg';
import { cellAt, featuresOf, height, isUnlocked, levels, stars, width, type Fail, type Feature, type LevelDef, type Move, type Records, type State } from '../../engines/caisses';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { arrow, backArrow, boubou, crate, gate, ground, hands, spot, U } from './art';

export const labels = {
    fr: { title: 'Les caisses de Boubou', levels: 'Choisis un niveau',
        gesture: 'Glisse ton doigt ou touche une flèche : Boubou pousse la caisse devant lui.',
        intro: { tirer: 'Une caisse coincée ? Touche-la, puis recule : Boubou la tire.', motif: 'Chaque jouet va sur son dessin.', eau: 'Attention à la mare : les caisses n’aiment pas l’eau.', tapis: 'Le tapis roulant avance la caisse tout seul.', porte: 'Une caisse sur le gros bouton, et la porte s’ouvre.', glace: 'Sur la glace, la caisse glisse jusqu’au bout.', trou: 'Pousse une caisse dans le trou pour passer dessus.' } as Record<Feature, string>,
        goal: 'Range les jouets sur les places.',
        fail: { mur: 'Boing ! Boubou se cogne le nez.', bonk: 'Bonk ! La caisse touche le mur, elle fait les gros yeux.', lourd: 'Pfff ! Deux caisses, c’est trop lourd.', motif: 'Non non ! Ce n’est pas le dessin de ce jouet.', plouf: 'Oh oh ! La caisse ne veut pas aller dans l’eau.', buisson: 'Scritch ! La caisse se prend dans le buisson.', vide: 'Oups ! Il n’y a rien à tirer. Boubou tombe sur les fesses.', orteil: 'Brrr ! L’eau est trop froide pour Boubou.', porte: 'Toc toc ! La porte est fermée.', trou: 'Ouh là ! Un trou. Boubou recule.' } as Record<Fail, string>,
        shine: 'Regarde ce qui brille !', grab: 'Je la tiens ! Recule pour la tirer.', pullOn: 'Boubou est prêt à tirer.', tidy: 'Rangé !', undo: 'On revient en arrière.',
        won: 'Bravo ! Tous les jouets sont rangés !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau', back: 'Retour', pull: 'Tirer',
        board: 'Jardin de Boubou : glisse ou touche une case voisine ; touche une caisse collée à Boubou pour la tenir ; au clavier, flèches, Maj et une flèche pour tirer, Retour arrière pour revenir',
        arrows: { haut: 'Monter', bas: 'Descendre', gauche: 'Gauche', droite: 'Droite' } },
    en: { title: 'Boubou’s boxes', levels: 'Choose a level',
        gesture: 'Slide your finger or touch an arrow: Boubou pushes the crate in front of him.',
        intro: { tirer: 'A crate stuck? Touch it, then step back: Boubou pulls it.', motif: 'Each toy goes on its own drawing.', eau: 'Mind the pond: crates don’t like water.', tapis: 'The moving belt carries the crate by itself.', porte: 'A crate on the big button, and the gate opens.', glace: 'On the ice, the crate slides all the way.', trou: 'Push a crate into the hole to walk over it.' } as Record<Feature, string>,
        goal: 'Put the toys on their spots.',
        fail: { mur: 'Boing! Boubou bumps his nose.', bonk: 'Bonk! The crate hits the wall and makes big eyes.', lourd: 'Phew! Two crates are too heavy.', motif: 'No no! That is not this toy’s drawing.', plouf: 'Uh oh! The crate does not want to go in the water.', buisson: 'Scritch! The crate gets stuck in the bush.', vide: 'Oops! Nothing to pull. Boubou falls on his bottom.', orteil: 'Brrr! The water is too cold for Boubou.', porte: 'Knock knock! The gate is closed.', trou: 'Whoa! A hole. Boubou steps back.' } as Record<Fail, string>,
        shine: 'Look at what shines!', grab: 'Got it! Step back to pull it.', pullOn: 'Boubou is ready to pull.', tidy: 'Tidied!', undo: 'One step back.',
        won: 'Well done! All the toys are put away!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level', back: 'Back', pull: 'Pull',
        board: 'Boubou’s garden: slide or touch a cell next to Boubou; touch a crate next to Boubou to hold it; with the keyboard, arrows, Shift and an arrow to pull, Backspace to go back',
        arrows: { haut: 'Up', bas: 'Down', gauche: 'Left', droite: 'Right' } }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.goal];
}
export const pictogram = svg(`<rect x="4" y="34" width="56" height="26" rx="6" fill="#a9d983"/><g transform="translate(40 40) scale(.3)">${crate('ballon')}</g><g transform="translate(18 34) scale(.3)">${boubou()}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="caisses"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('panda')}</div><div class="level-grid">${levels.map(l => `<button data-caisses-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1');
/** How the garden fits its stage: square cells as big as the stage allows (at most `MAX_CELL` px), the board in the middle
 * and the rest of the stage given to the hedge around it. A board wider than tall on a tall phone is drawn turned on its
 * diagonal (`flip`: rows become columns), which gives bigger cells and fills the height; the game is the same, only the
 * screen directions are swapped. All in units, a cell being 100 wide. */
export const MAX_CELL = 96;
export interface Layout { cell: number; flip: boolean; cols: number; rows: number; ox: number; oy: number; W: number; H: number }
export function layout(level: LevelDef, stageW: number, stageH: number): Layout {
    const w = width(level), h = height(level), size = (c: number, r: number): number => Math.max(1, Math.min(stageW / c, stageH / r, MAX_CELL));
    const flip = size(h, w) > size(w, h) * 1.1, cols = flip ? h : w, rows = flip ? w : h, cell = size(cols, rows);
    const W = Math.max(cols * U, stageW / cell * U), H = Math.max(rows * U, stageH / cell * U);
    return { cell, flip, cols, rows, ox: (W - cols * U) / 2, oy: (H - rows * U) / 2, W, H };
}
const TURN: Readonly<Record<Move, Move>> = { haut: 'gauche', gauche: 'haut', bas: 'droite', droite: 'bas' };
/** A direction of the game as seen on the screen, and back (the diagonal turn is its own inverse). */
export const onScreen = (l: Layout, m: Move): Move => l.flip ? TURN[m] : m;
/** The centre of the cell x, y of the game on the board, in units. */
export const cx = (l: Layout, x: number, y: number): number => l.ox + (l.flip ? y : x) * U + U / 2;
export const cy = (l: Layout, x: number, y: number): number => l.oy + (l.flip ? x : y) * U + U / 2;
/** The cell of the game under a screen column and row. */
export const gameCell = (l: Layout, col: number, row: number): { x: number; y: number } => l.flip ? { x: row, y: col } : { x: col, y: row };
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
/** The garden: the hedge around, the ground of every cell, spots, the button, the gate, then the layers that move. */
export function boardSvg(level: LevelDef, l: Layout, locale: Locale): string {
    const cells: string[] = [];
    for (let y = 0; y < height(level); y++) for (let x = 0; x < width(level); x++) {
        const c = cellAt(level, x, y), at = `transform="translate(${n(cx(l, x, y))} ${n(cy(l, x, y))})"`;
        if (c.ground === 'porte') cells.push(`<g ${at} data-gate>${ground('sol', x, y)}${gate()}</g>`);
        else if (c.ground === 'bouton') cells.push(`<g ${at} data-button="${x},${y}">${ground('bouton', x, y)}</g>`);
        else if (c.ground === 'place') cells.push(`<g ${at} data-spot="${c.motif ?? 'any'}">${ground('sol', x, y)}${spot(c.motif ?? null)}</g>`);
        else cells.push(`<g ${at}${c.ground === 'trou' ? ` data-hole="${x},${y}"` : ''}>${ground(c.ground, x, y, c.dir && onScreen(l, c.dir))}</g>`);
    }
    const hedge = Array.from({ length: Math.ceil(l.W / 120) + 1 }, (_, i) => `<circle cx="${i * 120}" cy="${n(l.H - 6)}" r="46" fill="#7cc46c"/><circle cx="${i * 120 + 60}" cy="6" r="40" fill="#7cc46c"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(l.W)} ${n(l.H)}" role="img" aria-label="${labels[locale].board}">`
        + `<rect width="${n(l.W)}" height="${n(l.H)}" fill="#8fcf74"/>${hedge}<rect x="${n(l.ox - 10)}" y="${n(l.oy - 10)}" width="${l.cols * U + 20}" height="${l.rows * U + 20}" rx="18" fill="#c98b4d" stroke="#583746" stroke-width="5"/>`
        + `<g data-ground>${cells.join('')}</g><g data-sunk></g><g data-arrows></g><g data-crates></g>`
        + `<g data-hero><g class="caisses-inner"><g class="caisses-boubou">${boubou()}</g></g></g><g data-effects></g></svg>`;
}
export const arrowsSvg = (cells: { action: Move; pull: boolean; x: number; y: number }[], l: Layout): string =>
    cells.map(c => `<g data-arrow="${c.action}"${c.pull ? ' data-pull' : ''} transform="translate(${n(cx(l, c.x, c.y))} ${n(cy(l, c.x, c.y))})"><g class="caisses-arrow">${arrow({ haut: -90, bas: 90, gauche: 180, droite: 0 }[onScreen(l, c.action)], c.pull)}</g></g>`).join('');
export function crateSvg(i: number, motif: Parameters<typeof crate>[0]): string {
    return `<g data-crate="${i}" data-motif="${motif}"><g class="caisses-inner">${crate(motif)}</g></g>`;
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="caisses-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="caisses-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="caisses-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="caisses caisses-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="caisses-instruction"><div id="guide">${characterSvg('panda', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="caisses-message" aria-live="polite">${typeset(message)}</p></div>`
        + `<div class="caisses-stage"><div class="caisses-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div>`
        + `<div class="caisses-tools"><button id="caisses-retour" aria-label="${t.back}">${backArrow}<span>${t.back}</span></button><button id="caisses-tire" aria-pressed="false" aria-label="${t.pull}">${hands}<span>${t.pull}</span></button></div></section>`;
}
