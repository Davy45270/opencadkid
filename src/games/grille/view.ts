import { characterSvg } from '../../characters/svg';
import { boxOf, featuresOf, imagesOf, isGiven, isUnlocked, levels, sizeOf, stars, type Fail, type Feature, type LevelDef, type Records, type State, type Theme } from '../../engines/grille';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { names, picture } from './art';

export const labels = {
    fr: { title: 'La grille de CaliRoux', levels: 'Choisis un niveau',
        gesture: 'Touche la case vide, puis l’image qui manque.', rule: 'Chaque image une seule fois par ligne, par colonne et par carré.',
        intro: { ligne: 'Regarde la ligne : il y manque une seule image.', colonne: 'Regarde la colonne, de haut en bas.', carre: 'Regarde le carré de couleur : chaque image y est une fois.', croise: 'Regarde la ligne et la colonne ensemble.', plusieurs: 'Une image posée aide à trouver la suivante.', six: 'Maintenant six images, et des carrés de six cases.' } as Record<Feature, string>,
        goal: 'Remplis la grille.',
        fail: { grimace: 'Beurk ! {X} est déjà dans {u}.', chamaille: 'Grrr ! {X} est déjà dans {u} : ils se chamaillent.', cogne: 'Bong ! {X} est déjà dans {u}.', pasici: 'Hmm ? {X} n’a pas sa place ici. Essaie une autre image.', salto: 'Hop là ! Cette case est déjà prise.', coucou: 'Coucou ! Cette image était là dès le début.', tournis: 'Ouh là ! {X} a le tournis.', roulade: 'Youpi ! CaliRoux fait une roulade.' } as Record<Fail, string>,
        units: { ligne: 'la ligne', colonne: 'la colonne', carre: 'le carré' },
        which: 'Quelle image va ici ?', where: 'Où va {x} ?', shine: 'Regarde ce qui brille !',
        won: 'Bravo ! La grille est devenue un joli tableau !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau', guide: 'CaliRoux',
        board: 'Grille de CaliRoux', tray: 'Le bac des images', empty: 'case vide', cell: 'ligne {r}, colonne {c}' },
    en: { title: 'CaliRoux’s grid', levels: 'Choose a level',
        gesture: 'Touch the empty cell, then the missing picture.', rule: 'Each picture only once in every row, every column and every square.',
        intro: { ligne: 'Look at the row: only one picture is missing.', colonne: 'Look at the column, from top to bottom.', carre: 'Look at the coloured square: each picture is there once.', croise: 'Look at the row and the column together.', plusieurs: 'One picture put in helps to find the next.', six: 'Now six pictures, and squares of six cells.' } as Record<Feature, string>,
        goal: 'Fill the grid.',
        fail: { grimace: 'Yuck! {X} is already in {u}.', chamaille: 'Grrr! {X} is already in {u}: they squabble.', cogne: 'Bong! {X} is already in {u}.', pasici: 'Hmm? {X} does not belong here. Try another picture.', salto: 'Hop! This cell is already taken.', coucou: 'Hello! This picture was here from the start.', tournis: 'Whoa! {X} is dizzy.', roulade: 'Wheee! CaliRoux rolls over.' } as Record<Fail, string>,
        units: { ligne: 'the row', colonne: 'the column', carre: 'the square' },
        which: 'Which picture goes here?', where: 'Where does {x} go?', shine: 'Look at what shines!',
        won: 'Well done! The grid is now a lovely painting!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level', guide: 'CaliRoux',
        board: 'CaliRoux’s grid', tray: 'The picture tray', empty: 'empty cell', cell: 'row {r}, column {c}' }
} as const;
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
export const nameOf = (locale: Locale, theme: Theme, image: number): string => names[locale][theme][image] ?? '';
/** What is said when a scene opens: its title, the gesture and the rule (first scene), or the new thing it brings in, then
 * the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture, t.rule] : fresh.map(f => t.intro[f])), t.goal];
}
export const pictogram = svg(`<rect x="6" y="6" width="52" height="52" rx="8" fill="#fffdf5" stroke="#583746" stroke-width="3"/><path d="M32 8V56M8 32H56" stroke="#583746" stroke-width="3"/><g transform="translate(19 19) scale(.24)">${picture('fruits', 0)}</g><g transform="translate(45 45) scale(.24)">${picture('fruits', 1)}</g><g transform="translate(45 19) scale(.24)">${picture('animaux', 0)}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="grille"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('pandaroux')}</div><div class="level-grid">${levels.map(l => `<button data-grille-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1');
export const pictureSvg = (theme: Theme, image: number): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" aria-hidden="true"><g class="grille-image">${picture(theme, image)}</g></svg>`;
/** One cell: its picture (or nothing), whether it was given at the start, and its place in its square for the borders. */
export function cellView(level: LevelDef, s: State, i: number, locale: Locale): string {
    const t = labels[locale], n = sizeOf(level), v = s.cells[i]!, r = Math.floor(i / n), c = i % n;
    const where = t.cell.replace('{r}', String(r + 1)).replace('{c}', String(c + 1)), what = v >= 0 ? nameOf(locale, level.theme, v) : t.empty;
    return `<button class="grille-cell" data-cell="${i}"${isGiven(level, i) ? ' data-given' : v >= 0 ? ' data-filled' : ''} aria-label="${what}, ${where}" style="--i:${i}"><span class="grille-in">${v >= 0 ? pictureSvg(level.theme, v) : ''}</span></button>`;
}
/** The grid drawn square by square: each square has its own background, so the squares can be seen at a glance. */
export function boardView(level: LevelDef, s: State, locale: Locale): string {
    const n = sizeOf(level), [br, bc] = boxOf(n), boxes: string[] = [];
    for (let R = 0; R < n; R += br) for (let C = 0; C < n; C += bc) {
        const cells: string[] = [];
        for (let r = R; r < R + br; r++) for (let c = C; c < C + bc; c++) cells.push(cellView(level, s, r * n + c, locale));
        boxes.push(`<div class="grille-box" data-box="${boxes.length}" style="grid-template-columns:repeat(${bc},1fr);grid-template-rows:repeat(${br},1fr)">${cells.join('')}</div>`);
    }
    return `<div class="grille-board grille-n${n}" data-theme="${level.theme}" role="group" aria-label="${labels[locale].board}" style="grid-template-columns:repeat(${n / bc},1fr);grid-template-rows:repeat(${n / br},1fr)">${boxes.join('')}</div>`;
}
export function trayView(level: LevelDef, locale: Locale): string {
    return `<div class="grille-tray grille-tray-${sizeOf(level)}" role="group" aria-label="${labels[locale].tray}">${imagesOf(level).map(k => `<button class="grille-pick" data-image="${k}" aria-label="${nameOf(locale, level.theme, k)}"><span class="grille-in">${pictureSvg(level.theme, k)}</span></button>`).join('')}</div>`;
}
export function gameView(level: LevelDef, s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="grille-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="grille-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="grille-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : trayView(level, locale);
    return `<section class="grille grille-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="grille-instruction"><button id="grille-caliroux" aria-label="${t.guide}"><span class="grille-guide">${characterSvg('pandaroux', s.finished ? 'celebration' : 'joie', s.finished ? 'celebration' : 'repos', reduce ? 'reduce' : 'full')}</span></button><p id="grille-message" aria-live="polite">${typeset(message)}</p></div>`
        + `<div class="grille-stage">${boardView(level, s, locale)}</div>${finish}</section>`;
}
