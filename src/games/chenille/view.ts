import { characterSvg } from '../../characters/svg';
import { featuresOf, foodsOf, groundAt, height, isUnlocked, levels, stars, width, type Fail, type Feature, type LevelDef, type Move, type Records, type State } from '../../engines/chenille';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { arrow, backArrow, cocoon, food, ground, head, ring, turnIcon, U } from './art';

export const labels = {
    fr: { title: 'La chenille de Lumi', levels: 'Choisis un niveau',
        gesture: 'Glisse ton doigt ou touche une flèche : la chenille avance d’une case.',
        intro: { caillou: 'Un caillou ! La chenille passe à côté.', retourne: 'Coincée ? Touche « Je me retourne » : la queue devient la tête.', fleur: 'Les fleurs, on les sent, on ne les mange pas.', flaque: 'Attention à la flaque : la chenille n’aime pas l’eau.', sucree: 'La feuille sucrée fait grandir de deux anneaux.', pomme: 'La pomme rend la chenille plus courte.', tunnel: 'Entre dans un trou, tu sors par l’autre.', pont: 'Sur le pont, la chenille passe par-dessus son corps.', arcenciel: 'Mange les couleurs dans l’ordre de l’arc-en-ciel : rouge d’abord.' } as Record<Feature, string>,
        goal: 'Mange toutes les feuilles, puis va dans le cocon.',
        fail: { mur: 'Boing ! La chenille se cogne la tête.', caillou: 'Oh ! Un caillou. Ils se font les gros yeux.', corps: 'Hihi ! La chenille se chatouille toute seule.', demitour: 'Oh là là ! Pour revenir en arrière, touche « Je me retourne ».', flaque: 'Brrr ! L’eau est trop froide.', fleur: 'Atchoum ! Une fleur, ça se sent, ça ne se mange pas.', couleur: 'Non non ! Pas encore cette couleur : suis l’arc-en-ciel.', cocon: 'Grrr… J’ai encore faim ! Il reste des feuilles.' } as Record<Fail, string>,
        shine: 'Regarde ce qui brille !', yum: 'Miam !', sweet: 'Miam, c’est sucré !', apple: 'Croc ! La chenille rapetisse.', ready: 'Le cocon est prêt !', turned: 'Je me suis retournée !', undo: 'On revient en arrière.',
        won: 'Bravo ! La chenille est devenue un papillon !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau', back: 'Retour', turn: 'Je me retourne',
        board: 'Jardin de la chenille : glisse ou touche une case voisine de la tête ; au clavier, les flèches, Espace pour se retourner, Retour arrière pour revenir',
        leaves: 'Feuilles à manger' },
    en: { title: 'Lumi’s caterpillar', levels: 'Choose a level',
        gesture: 'Slide your finger or touch an arrow: the caterpillar moves one cell.',
        intro: { caillou: 'A stone! The caterpillar goes round it.', retourne: 'Stuck? Touch « I turn round »: the tail becomes the head.', fleur: 'Flowers are for smelling, not for eating.', flaque: 'Mind the puddle: the caterpillar does not like water.', sucree: 'The sweet leaf makes it grow two rings.', pomme: 'The apple makes the caterpillar shorter.', tunnel: 'Go into one hole, come out of the other.', pont: 'On the bridge, the caterpillar goes over its own body.', arcenciel: 'Eat the colours in rainbow order: red first.' } as Record<Feature, string>,
        goal: 'Eat all the leaves, then go into the cocoon.',
        fail: { mur: 'Boing! The caterpillar bumps its head.', caillou: 'Oh! A stone. They make big eyes at each other.', corps: 'Hee hee! The caterpillar tickles itself.', demitour: 'Oh dear! To go back, touch « I turn round ».', flaque: 'Brrr! The water is too cold.', fleur: 'Atishoo! Flowers are for smelling, not for eating.', couleur: 'No no! Not that colour yet: follow the rainbow.', cocon: 'Rumble… Still hungry! Some leaves are left.' } as Record<Fail, string>,
        shine: 'Look at what shines!', yum: 'Yum!', sweet: 'Yum, it’s sweet!', apple: 'Crunch! The caterpillar gets shorter.', ready: 'The cocoon is ready!', turned: 'I turned round!', undo: 'One step back.',
        won: 'Well done! The caterpillar became a butterfly!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level', back: 'Back', turn: 'I turn round',
        board: 'The caterpillar’s garden: slide or touch a cell next to the head; with the keyboard, arrows, Space to turn round, Backspace to go back',
        leaves: 'Leaves to eat' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.goal];
}
export const pictogram = svg(`<rect x="4" y="34" width="56" height="26" rx="6" fill="#a9d983"/><g transform="translate(50 30) scale(.28)">${food('feuille', 0)}</g><g transform="translate(12 44) scale(.2)">${ring(true)}</g><g transform="translate(24 42) scale(.22)">${ring(false)}</g><g transform="translate(38 38) scale(.24)">${head([1, 0])}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="chenille"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-chenille-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
/** How the garden fits its stage: square cells as big as the stage allows (at most `MAX_CELL` px), the board in the middle
 * and the rest of the stage given to the meadow around it. A board wider than tall on a tall phone is drawn turned on its
 * diagonal (`flip`: rows become columns) when that gives bigger cells; the game is the same, only the screen directions are
 * swapped. All in units, a cell being 100 wide. */
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
export const cx = (l: Layout, x: number, y: number): number => l.ox + (l.flip ? y : x) * U + U / 2;
export const cy = (l: Layout, x: number, y: number): number => l.oy + (l.flip ? x : y) * U + U / 2;
export const gameCell = (l: Layout, col: number, row: number): { x: number; y: number } => l.flip ? { x: row, y: col } : { x: col, y: row };
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
/** The garden: the meadow around, the ground of every cell, the cocoon, the food, then the layers that move. */
export function boardSvg(level: LevelDef, l: Layout, locale: Locale): string {
    const cells: string[] = [];
    for (let y = 0; y < height(level); y++) for (let x = 0; x < width(level); x++) {
        const g = groundAt(level, x, y), at = `transform="translate(${n(cx(l, x, y))} ${n(cy(l, x, y))})"`;
        const tag = g === 'caillou' ? ` data-stone="${x},${y}"` : g === 'fleur' ? ` data-flower="${x},${y}"` : g === 'trou' ? ` data-hole="${x},${y}"` : g === 'pont' ? ' data-bridge' : '';
        cells.push(`<g ${at}${tag}>${ground(g, x, y)}</g>`);
        if (g === 'cocon') cells.push(`<g ${at} data-cocoon>${cocoon()}</g>`);
    }
    const foods = foodsOf(level).map((f, i) => `<g data-food="${i}" data-kind="${f.kind}" data-pos="${f.x},${f.y}" transform="translate(${n(cx(l, f.x, f.y))} ${n(cy(l, f.x, f.y))})"><g class="chenille-inner">${food(f.kind, f.rank)}</g></g>`).join('');
    const bushes = Array.from({ length: Math.ceil(l.W / 120) + 1 }, (_, i) => `<circle cx="${i * 120}" cy="${n(l.H - 6)}" r="46" fill="#7cc46c"/><circle cx="${i * 120 + 60}" cy="6" r="40" fill="#7cc46c"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(l.W)} ${n(l.H)}" role="img" aria-label="${labels[locale].board}">`
        + `<rect width="${n(l.W)}" height="${n(l.H)}" fill="#8fcf74"/>${bushes}<rect x="${n(l.ox - 10)}" y="${n(l.oy - 10)}" width="${l.cols * U + 20}" height="${l.rows * U + 20}" rx="18" fill="#7d5a3c" stroke="#583746" stroke-width="5"/>`
        + `<g data-ground>${cells.join('')}</g><g data-foods>${foods}</g><g data-arrows></g><g data-body></g><g data-effects></g></svg>`;
}
export const arrowsSvg = (cells: { action: Move; x: number; y: number }[], l: Layout): string =>
    cells.map(c => `<g data-arrow="${c.action}" transform="translate(${n(cx(l, c.x, c.y))} ${n(cy(l, c.x, c.y))})"><g class="chenille-arrow">${arrow({ haut: -90, bas: 90, gauche: 180, droite: 0 }[onScreen(l, c.action)])}</g></g>`).join('');
/** The row of leaves to eat, under Lumi: a leaf fades once eaten; rainbow leaves come in their order. */
export function goalsHtml(level: LevelDef, eaten: number, locale: Locale): string {
    const list = foodsOf(level).map((f, i) => ({ f, i })).filter(({ f }) => f.kind !== 'pomme').sort((a, b) => a.f.rank - b.f.rank);
    return `<div class="chenille-goals" role="img" aria-label="${labels[locale].leaves} : ${list.filter(({ i }) => !(eaten & (1 << i))).length}">${list.map(({ f, i }) => `<span data-goal="${i}"${eaten & (1 << i) ? ' data-eaten' : ''}>${svg(`<g transform="translate(32 32) scale(.62)">${food(f.kind, f.rank)}</g>`)}</span>`).join('')}</div>`;
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s), level = levels[s.level - 1]!;
    const finish = s.finished ? `<div class="chenille-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="chenille-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="chenille-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="chenille chenille-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="chenille-instruction"><div id="guide">${characterSvg('licorne', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="chenille-message" aria-live="polite">${typeset(message)}</p></div>`
        + goalsHtml(level, s.eaten, locale)
        + `<div class="chenille-stage"><div class="chenille-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div>`
        + `<div class="chenille-tools"><button id="chenille-retour" aria-label="${t.back}">${backArrow}<span>${t.back}</span></button><button id="chenille-tourne" aria-label="${t.turn}">${turnIcon}<span>${t.turn}</span></button></div></section>`;
}
