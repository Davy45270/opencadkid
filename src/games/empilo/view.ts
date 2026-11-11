import { characterSvg } from '../../characters/svg';
import { featuresOf, friendsOf, height, isUnlocked, levels, PATTERNS, shapeOf, silhouetteCells, skyOf, stars, width, type Feature, type Funny, type LevelDef, type PieceKind, type SilhouetteName, type State } from '../../engines/empilo';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { chick, cloud, cube, picture, RAINBOW, swapIcon, turnIcon, U } from './art';

const names = {
    fr: { maison: 'la maison', bateau: 'le bateau', coeur: 'le cœur', sapin: 'le sapin', fusee: 'la fusée', champignon: 'le champignon', poisson: 'le poisson', chateau: 'le château', etoile: 'l’étoile', fleur: 'la fleur' },
    en: { maison: 'the house', bateau: 'the boat', coeur: 'the heart', sapin: 'the fir tree', fusee: 'the rocket', champignon: 'the mushroom', poisson: 'the fish', chateau: 'the castle', etoile: 'the star', fleur: 'the flower' }
} as const satisfies Record<Locale, Record<SilhouetteName, string>>;
export const labels = {
    fr: { title: 'Les cubes de Lumi', levels: 'Choisis un niveau',
        gesture: 'Glisse la pièce au-dessus d’une colonne, ou touche une colonne : elle descend et se pose.',
        intro: { deux: 'Deux cubes qui se tiennent la main.', trois: 'Trois cubes en train, et un petit coin.', tourner: 'Le gros bouton tourne la pièce.', rangee: 'Des cubes attendent déjà : remplis le trou.', silhouette: 'Un dessin au fond du puits : pose des cubes dessus pour l’allumer.', quatre: 'Des pièces de quatre cubes.', ami: 'Un poussin est coincé sous les pierres : quand sa rangée s’envole, il est libre.', nuage: 'Un petit nuage se promène : ne pose pas sur lui !', arc: 'Le cube arc-en-ciel remplit le trou où tu le lâches.', bonbon: 'Le cube bonbon fait s’envoler toute sa colonne.' } as Record<Feature, string>,
        rows: (n: number): string => n === 1 ? 'Fais s’envoler une rangée.' : `Fais s’envoler ${n} rangées.`,
        drawing: (n: SilhouetteName): string => `Allume ${names.fr[n]}.`,
        friends: (n: number): string => n === 1 ? 'Libère le poussin.' : 'Libère les poussins.',
        fail: { trou: 'Ouh ouh… un trou ! Le cube glisse dedans.', mur: 'Bonk ! La pièce cogne le bord.', deborde: 'Trop haut ! La pièce ne tient pas là.', nuage: 'Atchoum ! Le nuage souffle la pièce.', tournis: 'Ça tourne, ça tourne ! La pièce a le tournis.', arc: 'Pas de trou ici ! L’arc-en-ciel cherche un trou.', bonbon: 'Rien à emporter ! Les pierres sont trop lourdes.' } as Record<Funny, string>,
        shine: 'Regarde la place qui brille !', row: 'Une rangée s’envole !', rowsMany: 'Des rangées s’envolent !', lit: 'Le dessin s’allume !', drawn: 'Le dessin est tout allumé !', free: 'Le poussin est libre !', wind: 'Le vent souffle la rangée du haut.', candy: 'Toute la colonne s’envole !', rainbow: 'L’arc-en-ciel remplit le trou !',
        won: 'Bravo ! Tous les papillons dansent !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        swap: 'Échanger', swapLabel: 'Échanger : prendre l’autre pièce', turn: 'Tourner', turnLabel: 'Tourner la pièce',
        board: 'Le puits : glisse ou touche une colonne pour lâcher la pièce ; au clavier, gauche et droite, haut pour tourner, Entrée pour lâcher, E pour échanger',
        goals: 'À faire' },
    en: { title: 'Lumi’s cubes', levels: 'Choose a level',
        gesture: 'Slide the piece over a column, or touch a column: it comes down and rests.',
        intro: { deux: 'Two cubes holding hands.', trois: 'Three cubes in a train, and a little corner.', tourner: 'The big button turns the piece.', rangee: 'Some cubes are already there: fill the gap.', silhouette: 'A drawing at the bottom of the well: put cubes on it to light it up.', quatre: 'Pieces of four cubes.', ami: 'A chick is stuck under the stones: when its row flies, it is free.', nuage: 'A little cloud is out for a walk: do not drop on it!', arc: 'The rainbow cube fills the hole where you drop it.', bonbon: 'The candy cube makes its whole column fly away.' } as Record<Feature, string>,
        rows: (n: number): string => n === 1 ? 'Make one row fly away.' : `Make ${n} rows fly away.`,
        drawing: (n: SilhouetteName): string => `Light up ${names.en[n]}.`,
        friends: (n: number): string => n === 1 ? 'Set the chick free.' : 'Set the chicks free.',
        fail: { trou: 'Ooh ooh… a hole! The cube slides into it.', mur: 'Bonk! The piece bumps the edge.', deborde: 'Too high! The piece does not fit there.', nuage: 'Atchoo! The cloud blows the piece away.', tournis: 'Round and round! The piece is dizzy.', arc: 'No hole here! The rainbow looks for a hole.', bonbon: 'Nothing to lift! The stones are too heavy.' } as Record<Funny, string>,
        shine: 'Look at the place that shines!', row: 'A row flies away!', rowsMany: 'Rows fly away!', lit: 'The drawing lights up!', drawn: 'The whole drawing is lit!', free: 'The chick is free!', wind: 'The wind blows the top row away.', candy: 'The whole column flies away!', rainbow: 'The rainbow fills the hole!',
        won: 'Well done! All the butterflies dance!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        swap: 'Swap', swapLabel: 'Swap: take the other piece', turn: 'Turn', turnLabel: 'Turn the piece',
        board: 'The well: slide or touch a column to drop the piece; with the keyboard, left and right, up to turn, Enter to drop, S to swap',
        goals: 'To do' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goals. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), ...goalWords(level, locale)];
}
export function goalWords(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], out: string[] = [];
    if (level.silhouette) out.push(t.drawing(level.silhouette.name));
    if (friendsOf(level)) out.push(t.friends(friendsOf(level)));
    if (level.goal) out.push(t.rows(level.goal));
    return out;
}
const piece = (kind: PieceKind, rot: number, size = 64): string => {
    const shape = shapeOf(kind, rot), w = Math.max(...shape.map(c => c[0])) + 1, h = Math.max(...shape.map(c => c[1])) + 1, s = size * .8 / (Math.max(w, h, 1.4) * U);
    return `<g transform="translate(${size / 2} ${size / 2}) scale(${s}) translate(${-w * U / 2} ${h * U / 2})">${shape.map(([x, y]) => `<g transform="translate(${x * U + U / 2} ${-y * U - U / 2})">${cube(kind)}</g>`).join('')}</g>`;
};
export const pictogram = svg(`<rect x="10" y="6" width="44" height="54" rx="6" fill="#efe6ff" stroke="#4a3a3f" stroke-width="3"/><g transform="translate(32 33)">${[[-11, 16, 'u'], [0, 16, 'c'], [11, 16, 'd'], [-11, 5, 'd'], [11, 5, 'k'], [0, -12, 'T'], [11, -12, 'T']].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(.11)">${cube(k as string)}</g>`).join('')}</g>`);
export function levelView(records: Partial<Record<number, number>>, locale: Locale): string {
    const t = labels[locale];
    return `<section class="empilo"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-empilo-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
/** How the well fits its stage: square cells as big as the stage allows (at most `MAX_CELL` px), the sky where the piece waits
 * on top of the well, the whole in the middle of the stage. All in units, a cell being 100 wide. */
export const MAX_CELL = 96;
export interface Layout { cell: number; ox: number; oy: number; W: number; H: number; sky: number }
export function layout(level: LevelDef, stageW: number, stageH: number): Layout {
    // A fifth of a cell around the well, for its frame.
    const w = width(level), sky = skyOf(level), h = height(level) + sky, cell = Math.max(1, Math.min(stageW / (w + .2), stageH / (h + .2), MAX_CELL));
    const W = Math.max(w * U, stageW / cell * U), H = Math.max(h * U, stageH / cell * U);
    return { cell, ox: (W - w * U) / 2, oy: (H - h * U) / 2, W, H, sky };
}
/** The middle of the cell of column x, row y counted from the bottom of the well. */
export const cx = (l: Layout, x: number): number => l.ox + x * U + U / 2;
export const cy = (l: Layout, level: LevelDef, y: number): number => l.oy + (l.sky + height(level) - 1 - y) * U + U / 2;
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
/** The cubes of the well, from its columns. */
export function cellsSvg(level: LevelDef, l: Layout, cols: readonly string[]): string {
    return cols.map((col, x) => col.split('').map((c, y) => `<g data-cell="${x},${y}" data-kind="${c}" transform="translate(${n(cx(l, x))} ${n(cy(l, level, y))})"><g class="empilo-cube">${cube(c)}</g></g>`).join('')).join('');
}
/** The drawing: its picture over the cubes, faint until it is whole, and a dashed frame on each cell to light (gold once lit). */
export function drawingSvg(level: LevelDef, l: Layout, lit: string, top: boolean): string {
    const s = level.silhouette; if (!s) return '';
    const cells = silhouetteCells(level), p = PATTERNS[s.name], whole = !lit.includes('0');
    if (!top) {
        const x0 = l.ox + s.x * U, y0 = cy(l, level, (s.y ?? 0) + p.length - 1) - U / 2;
        return `<g transform="translate(${n(x0)} ${n(y0)})"><g class="empilo-dessin${whole ? ' empilo-dessin-fini' : ''}" opacity="${whole ? 1 : .35}">${picture(s.name, p[0]!.length, p.length)}</g></g>`;
    }
    return cells.map((c, i) => `<rect data-sil="${i}"${lit[i] === '1' ? ' data-lit' : ''} x="${n(cx(l, c.x) - 44)}" y="${n(cy(l, level, c.r) - 44)}" width="88" height="88" rx="14" fill="${lit[i] === '1' ? '#fff3a055' : '#ffffff40'}" stroke="${lit[i] === '1' ? '#f5b400' : '#ffffff'}" stroke-width="7" stroke-dasharray="14 10"/>`).join('');
}
/** The piece in hand, its cubes placed from its bottom left corner. */
export function pieceSvg(kind: PieceKind, rot: number): string {
    return shapeOf(kind, rot).map(([x, y]) => `<g transform="translate(${x * U + U / 2} ${-y * U - U / 2})">${cube(kind)}</g>`).join('');
}
/** The well: the sky where the piece waits, the well with its frame, then the layers that change. */
export function boardSvg(level: LevelDef, l: Layout, locale: Locale): string {
    const w = width(level), h = height(level), top = l.oy + l.sky * U;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(l.W)} ${n(l.H)}" role="img" aria-label="${labels[locale].board}">`
        + `<rect width="${n(l.W)}" height="${n(l.H)}" fill="#cfe9ff"/>`
        + `<rect x="${n(l.ox)}" y="${n(top)}" width="${w * U}" height="${h * U}" fill="#f4eefc"/>`
        + Array.from({ length: w - 1 }, (_, i) => `<path d="M${n(l.ox + (i + 1) * U)} ${n(top)}V${n(top + h * U)}" stroke="#e2d8f2" stroke-width="3"/>`).join('')
        + `<rect data-frame x="${n(l.ox - 8)}" y="${n(top - 8)}" width="${w * U + 16}" height="${h * U + 16}" rx="16" fill="none" stroke="#8d68a0" stroke-width="10"/>`
        + `<g data-cells></g><g data-picture></g><g data-sil-cells></g><g data-cloud></g><g data-marks></g><g data-ghost></g><g data-piece><g class="empilo-inner"></g></g><g data-effects></g></svg>`;
}
export { cloud };
/** The row of goals under Lumi: rows to make (a rainbow bar each), the drawing, the chicks. */
export function goalsHtml(level: LevelDef, s: State, locale: Locale): string {
    const t = labels[locale], items: string[] = [];
    for (let i = 0; i < level.goal; i++) items.push(`<span data-goal-row="${i}"${i < s.rows ? ' data-got' : ''}>${svg(RAINBOW.map((c, k) => `<rect x="${4 + k * 9.3}" y="24" width="9.3" height="16" fill="${c}"/>`).join('') + '<rect x="4" y="24" width="56" height="16" rx="3" fill="none" stroke="#4a3a3f" stroke-width="3"/>')}</span>`);
    if (level.silhouette) items.push(`<span data-goal-drawing${s.lit.includes('0') ? '' : ' data-got'} class="empilo-goal-big">${svg(`<g transform="scale(.64)">${picture(level.silhouette.name, 1, 1)}</g>`)}</span>`);
    for (let i = 0; i < friendsOf(level); i++) items.push(`<span data-goal-friend="${i}"${i < s.freed ? ' data-got' : ''}>${svg(`<g transform="translate(32 32) scale(.6)">${chick()}</g>`)}</span>`);
    return `<div class="empilo-goals" role="img" aria-label="${t.goals} : ${goalWords(level, locale).join(' ')}">${items.join('')}</div>`;
}
export const swapContent = (kind: PieceKind | null): string => `<span class="empilo-autre" data-other>${kind ? svg(piece(kind, 0)) : ''}</span>`;
const swapSvg = svg(swapIcon).replace('<svg', '<svg class="empilo-swap-icon"');
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s), level = levels[s.level - 1]!;
    const finish = s.finished ? `<div class="empilo-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="empilo-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="empilo-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="empilo empilo-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="empilo-instruction"><div id="guide">${characterSvg('licorne', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="empilo-message" aria-live="polite">${typeset(message)}</p></div>`
        + goalsHtml(level, s, locale)
        + `<div class="empilo-stage"><div class="empilo-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div>`
        + `<div class="empilo-tools"><button id="empilo-echange" aria-label="${t.swapLabel}"${s.finished ? ' disabled' : ''}>${swapContent(s.finished ? null : s.other)}${swapSvg}<span>${t.swap}</span></button>`
        + (level.rotate ? `<button id="empilo-tourne" aria-label="${t.turnLabel}"${s.finished ? ' disabled' : ''}>${turnIcon}<span>${t.turn}</span></button>` : '') + `</div></section>`;
}
