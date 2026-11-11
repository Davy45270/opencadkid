import { characterSvg } from '../../characters/svg';
import { ballColor, CEIL, cellRect, CELL, COLS, FLOOR, HEIGHT, isUnlocked, LAUNCH, levelOf, levels, stars, WIDTH, X0, Y0, type Brick, type Feature, type LevelDef, type Miss, type Records, type State } from '../../engines/briques';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { ballSvg, brickSvg, defs, INK } from './art';
import { drawing } from './drawings';

export const labels = {
    fr: { title: 'Les briques de Lumi', levels: 'Choisis un niveau',
        gesture: 'Touche le mur, ou glisse ton doigt pour viser, puis lâche !',
        goal: 'Casse les briques : un dessin se cache derrière.',
        intro: { dur: 'Les briques à pointillés sont solides : un coup les fêle, le deuxième les casse.', metal: 'La brique en fer ne casse jamais : la balle rebondit dessus.', bonbon: 'Casse la brique bonbon : tu auras deux balles au lancer suivant !', bombe: 'La bombe à confettis casse toutes ses voisines.', mobile: 'La brique à roulettes avance d’une case après chaque lancer.', gelee: 'Dans la gelée, la balle s’enfonce et revient vers moi.', couleur: 'La balle a une couleur : elle traverse les briques de sa couleur.' } as Record<Feature, string>,
        miss: { rigole: 'Hihi ! Le fer rigole, il ne casse pas.', tremble: 'Ça tremble ! La gelée a avalé la balle.', tete: 'Aïe, sur ma tête ! Je la rattrape.', atchoum: 'Atchoum ! Le nuage éternue.', tournis: 'Oh là là, la balle a le tournis !', boing: 'Boing ! L’herbe rebondit.' } as Record<Miss, string>,
        help: 'Regarde la ligne dorée !', crack: 'Crac !', broke: 'Bravo !', two: 'Deux balles !', boom: 'Boum, des confettis !',
        won: 'Bravo ! Regarde le dessin !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        board: 'Le mur de briques : touche ou glisse le doigt pour viser, lâche pour lancer ; au clavier, les flèches pour viser, Entrée pour lancer' },
    en: { title: 'Lumi’s bricks', levels: 'Choose a level',
        gesture: 'Touch the wall, or slide your finger to aim, then let go!',
        goal: 'Break the bricks: a drawing is hiding behind them.',
        intro: { dur: 'Dotted bricks are strong: one hit cracks them, the second breaks them.', metal: 'The iron brick never breaks: the ball bounces off it.', bonbon: 'Break the sweet brick: you get two balls on the next throw!', bombe: 'The confetti bomb breaks all the bricks next to it.', mobile: 'The brick on wheels moves one place after each throw.', gelee: 'In the jelly, the ball sinks in and comes back to me.', couleur: 'The ball has a colour: it goes through the bricks of its colour.' } as Record<Feature, string>,
        miss: { rigole: 'Hee hee! The iron laughs, it does not break.', tremble: 'It wobbles! The jelly swallowed the ball.', tete: 'Ouch, on my head! I catch it.', atchoum: 'Atchoo! The cloud sneezes.', tournis: 'Oh dear, the ball is dizzy!', boing: 'Boing! The grass bounces.' } as Record<Miss, string>,
        help: 'Look at the golden line!', crack: 'Crack!', broke: 'Well done!', two: 'Two balls!', boom: 'Boom, confetti!',
        won: 'Well done! Look at the drawing!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        board: 'The brick wall: touch or slide your finger to aim, let go to throw; with the keyboard, arrows to aim, Enter to throw' }
} as const;
/** What is said when a scene opens: its title, the gesture and the goal (first scene) or the new thing it brings in. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = level.features.filter(f => levels.find(l => l.features.includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture, t.goal] : fresh.map(f => t.intro[f]))];
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
const n = (v: number): string => (Math.round(v * 10) / 10).toString();
export const centre = (row: number, col: number): { x: number; y: number } => { const r = cellRect(row, col); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
export const at = (row: number, col: number): string => { const c = centre(row, col); return `translate(${n(c.x)}px,${n(c.y)}px)`; };
export const pictogram = svg(`${defs()}<rect x="6" y="40" width="52" height="18" rx="4" fill="#bfe6ff"/><circle cx="32" cy="44" r="9" fill="#ffd23f" stroke="${INK}" stroke-width="2"/>`
    + [[6, 8, 'rouge'], [24, 8, 'jaune'], [42, 8, 'bleu'], [6, 24, 'vert'], [42, 24, 'rouge']].map(([x, y, c]) => `<g transform="translate(${Number(x) + 8} ${Number(y) + 8}) scale(.75)">${brickSvg({ id: 0, row: 0, col: 0, kind: 'brique', color: c as 'rouge', hits: 1, dir: 0 })}</g>`).join('')
    + `<g transform="translate(32 33) scale(1.1)">${ballSvg(null)}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="briques"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-briques-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
const themes = [['#bfe6ff', '#f2fbff'], ['#ffe0ec', '#fff8fb'], ['#d9f2d0', '#f6fff2'], ['#e6dcff', '#faf7ff']] as const;
/** The picture behind the wall: the rows of the scene, all six places wide; once the wall is gone, the iron and the
 * jelly go too and the drawing grows to a square, for everyone to see. */
export function pictureBox(level: LevelDef, finished = false): { x: number; y: number; w: number; h: number } { return finished ? { x: X0, y: Y0, w: COLS * CELL, h: COLS * CELL } : { x: X0, y: Y0, w: COLS * CELL, h: level.rows.length * CELL }; }
export function bricksSvg(bricks: readonly Brick[]): string {
    return bricks.map(b => `<g data-brick="${b.id}" data-kind="${b.kind}"${b.color ? ` data-color="${b.color}"` : ''} style="transform:${at(b.row, b.col)}"><g class="briques-inner">${brickSvg(b)}</g></g>`).join('');
}
const clouds = (): string => Array.from({ length: 6 }, (_, i) => `<ellipse cx="${n(12.5 + i * 25)}" cy="${CEIL - 3}" rx="16" ry="7" fill="#ffffff" stroke="#d7e7f2" stroke-width="1"/>`).join('');
/** Lumi stands on the grass below the ball she holds. */
export const LUMI = 48;
export function lumiSvg(reduce: boolean): string {
    const body = characterSvg('licorne', 'joie', 'repos', reduce ? 'reduce' : 'full').replace('<svg ', `<svg x="${n(LAUNCH.x - LUMI / 2)}" y="${n(LAUNCH.y - 6)}" width="${LUMI}" height="${LUMI}" `);
    return `<g class="briques-lumi" aria-hidden="true"><g class="briques-lumi-body">${body}</g></g>`;
}
/** The board: sky, the cloud ceiling, the drawing behind the wall, the bricks, the grass, the aim, Lumi and her ball. */
export function boardSvg(s: State, locale: Locale, reduce = false): string {
    const level = levelOf(s.level), [sky, low] = themes[(s.level - 1) % themes.length]!, box = pictureBox(level, s.finished), color = ballColor(s);
    const grass = `<path d="M0 ${HEIGHT}V${FLOOR - 2}Q40 ${FLOOR - 8} 75 ${FLOOR - 3}T${WIDTH} ${FLOOR - 2}V${HEIGHT}Z" fill="#a8dc8f"/><path d="M0 ${HEIGHT}V${FLOOR + 6}Q60 ${FLOOR + 1} ${WIDTH} ${FLOOR + 7}V${HEIGHT}Z" fill="#8fcf74"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${labels[locale].board}">${defs()}<linearGradient id="briques-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${low}"/></linearGradient>`
        + `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#briques-sky)"/>${grass}`
        + `<g data-picture${s.finished ? ' class="briques-wow"' : ''}><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="5" fill="#fffdf5" stroke="#e8dcc0" stroke-width="1"/><svg x="${box.x + 2}" y="${box.y + 2}" width="${box.w - 4}" height="${box.h - 4}" viewBox="0 -8 120 92" preserveAspectRatio="xMidYMid meet" overflow="visible">${drawing(level.drawing)}</svg></g>`
        + `<g data-clouds>${clouds()}</g>`
        + `<g data-bricks>${s.finished ? '' : bricksSvg(s.bricks)}</g>`
        + `<path data-help d="" fill="none" stroke="#f5b400" stroke-width="3.2" stroke-linecap="round" stroke-dasharray=".1 6" opacity="0"/>`
        + `<path data-aim d="" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray=".1 5.4" opacity="0"/>`
        + lumiSvg(reduce)
        + `<g data-effects></g>`
        + `<g data-hand transform="translate(${LAUNCH.x} ${LAUNCH.y})">${s.finished ? '' : handSvg(s.balls, color)}</g>`
        + `<g data-flight></g></svg>`;
}
/** The ball (or two balls after a sweet brick) waiting in Lumi's arms. */
export function handSvg(balls: number, color: State['bricks'][number]['color']): string {
    return balls > 1 ? `<g transform="translate(-6.5 0)">${ballSvg(color)}</g><g transform="translate(6.5 0)">${ballSvg(color)}</g>` : ballSvg(color);
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="briques-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="briques-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="briques-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="briques briques-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="briques-instruction"><div id="guide">${characterSvg('licorne', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="briques-message" aria-live="polite">${typeset(message)}</p></div>`
        + `<div class="briques-stage"><div class="briques-zone" tabindex="0" role="application" aria-label="${t.board}">${boardSvg(s, locale, reduce)}${finish}</div></div></section>`;
}
