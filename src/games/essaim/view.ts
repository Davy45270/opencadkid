import { characterSvg } from '../../characters/svg';
import { featuresOf, isUnlocked, LANES, levels, stars, type Feature, type Fail, type LevelDef, type State } from '../../engines/essaim';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { goalIcon, rocket, shootingStar, star, twinkle, U } from './art';

export const labels = {
    fr: { title: 'Le voyage de Boubou', levels: 'Choisis un niveau',
        gesture: 'Touche un couloir du ciel : la fusée de Boubou y glisse.',
        goal: 'Ramasse les étoiles et les amis perdus.',
        intro: { ami: 'Des amis perdus attendent : va dans leur couloir, ils te suivront.', rocher: 'Les rochers sont tout mous : boing !', poussiere: 'Attention, la poussière fait éternuer la fusée.', bulle: 'Les bulles de savon font flotter la fusée.', comete: 'Une comète passe tout près : ouh !', tapis: 'Le tapis d’étoiles pousse la fusée sur le côté.', porte: 'La porte arc-en-ciel s’ouvre si un ami te suit.', trou: 'Le trou noir gentil fait faire un tour à la fusée.' } as Record<Feature, string>,
        fail: { rocher: 'Boing ! La fusée rebondit sur le rocher mou et fait la toupie.', poussiere: 'Atchoum ! La fusée éternue, sa fenêtre est toute grise.', bulle: 'Oh ! La fusée flotte dans une bulle de savon.', comete: 'Ouh ! La comète passe, les cheveux de Boubou se dressent.', bord: 'Coucou ! L’étoile filante du bord fait rebondir la fusée.', calin: 'Câlin ! Ton ami est déjà avec toi, il te fait un câlin.', porte: 'Hi hi ! La porte attend qu’un ami te suive.' } as Record<Fail, string>,
        star: 'Une étoile !', friend: { F: 'Coucou ! La petite fusée te suit.', C: 'Miaou ! Le chaton te suit.', R: 'Bip bip ! Le petit robot te suit.' } as Record<string, string>,
        open: 'La porte arc-en-ciel s’ouvre !', shine: 'Regarde le couloir qui brille !', hole: 'Le trou noir fait faire un tour !', push: 'Hop, le tapis pousse !',
        won: 'Bravo ! Tout le monde est arrivé sur la planète-maison !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        board: 'Le ciel : touche un couloir pour y faire glisser la fusée ; au clavier, gauche et droite',
        goals: 'Étoiles et amis à ramasser' },
    en: { title: 'Boubou’s trip', levels: 'Choose a level',
        gesture: 'Touch a lane of the sky: Boubou’s rocket glides there.',
        goal: 'Pick up the stars and the lost friends.',
        intro: { ami: 'Lost friends are waiting: go into their lane and they will follow you.', rocher: 'The rocks are all soft: boing!', poussiere: 'Careful, dust makes the rocket sneeze.', bulle: 'Soap bubbles make the rocket float.', comete: 'A comet flies very close: ooh!', tapis: 'The star carpet pushes the rocket to the side.', porte: 'The rainbow gate opens when a friend follows you.', trou: 'The kind black hole spins the rocket round.' } as Record<Feature, string>,
        fail: { rocher: 'Boing! The rocket bounces off the soft rock and spins.', poussiere: 'Atchoo! The rocket sneezes, its window is all grey.', bulle: 'Oh! The rocket floats in a soap bubble.', comete: 'Ooh! The comet goes by and Boubou’s hair stands on end.', bord: 'Peekaboo! The shooting star at the edge bounces the rocket back.', calin: 'Hug! Your friend is already with you: it gives you a hug.', porte: 'Tee hee! The gate is waiting for a friend to follow you.' } as Record<Fail, string>,
        star: 'A star!', friend: { F: 'Hello! The little rocket follows you.', C: 'Meow! The kitten follows you.', R: 'Beep beep! The little robot follows you.' } as Record<string, string>,
        open: 'The rainbow gate opens!', shine: 'Look at the lane that shines!', hole: 'The black hole spins you round!', push: 'Whoosh, the carpet pushes!',
        won: 'Well done! Everybody is home on the planet!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        board: 'The sky: touch a lane to glide the rocket there; with the keyboard, left and right',
        goals: 'Stars and friends to pick up' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.goal];
}
export const pictogram = svg(`<rect x="4" y="4" width="56" height="56" rx="10" fill="#2b2160"/><g transform="translate(16 18) scale(.2)">${star()}</g><g transform="translate(48 14) scale(.14)">${star()}</g><g transform="translate(32 38) scale(.3)">${rocket()}</g>`);
export function levelView(records: Partial<Record<number, number>>, locale: Locale): string {
    const t = labels[locale];
    return `<section class="essaim"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('panda')}</div><div class="level-grid">${levels.map(l => `<button data-essaim-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
/** How the sky fits its stage: lanes as wide as the stage allows (at most `MAX_CELL` px), with a narrow edge band on each side
 * where the shooting stars live, the sky stretched to the whole height, the rocket near the bottom. All in units, a lane being
 * 100 wide. */
export const MAX_CELL = 110;
/** The edge bands, the fewest rows of sky, the rocket's height above the bottom. */
export const EDGE = 0.35 * U;
export const MIN_ROWS = 8;
export const ROCKET_UP = 1.7 * U;
export interface Layout { cell: number; ox: number; W: number; H: number; rocketY: number }
export function layout(stageW: number, stageH: number): Layout {
    const cell = Math.max(1, Math.min(stageW / (LANES + 2 * EDGE / U), stageH / MIN_ROWS, MAX_CELL));
    const W = Math.max(LANES * U + 2 * EDGE, stageW / cell * U), H = Math.max(MIN_ROWS * U, stageH / cell * U);
    return { cell, ox: (W - LANES * U) / 2, W, H, rocketY: H - ROCKET_UP };
}
/** The middle of lane x (half lanes allowed). */
export const cx = (l: Layout, x: number): number => l.ox + x * U + U / 2;
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
/** The night sky: its colour, the lanes, the twinkling dots, the edge bands with their shooting stars, then the layers. */
export function boardSvg(l: Layout, locale: Locale): string {
    const dots = Array.from({ length: 26 }, (_, i) => `<g transform="translate(${n((i * 137) % Math.round(l.W))} ${n((i * 251) % Math.round(l.H))})">${twinkle(2 + (i % 3))}</g>`).join('');
    const lanes = Array.from({ length: LANES - 1 }, (_, i) => `<path d="M${n(l.ox + (i + 1) * U)} 0V${n(l.H)}" stroke="#ffffff22" stroke-width="3" stroke-dasharray="14 18"/>`).join('');
    const edge = (left: boolean): string => `<rect x="${left ? 0 : n(l.ox + LANES * U)}" width="${n(l.ox)}" height="${n(l.H)}" fill="#ffffff14"/><g data-edge="${left ? 'left' : 'right'}" transform="translate(${n(left ? l.ox / 2 : l.W - l.ox / 2)} ${n(l.H * .42)})"><g class="essaim-filante"><g transform="scale(${left ? 1 : -1} 1) scale(1.15)">${shootingStar()}</g></g></g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(l.W)} ${n(l.H)}" role="img" aria-label="${labels[locale].board}">`
        + `<defs><linearGradient id="essaim-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f1a4f"/><stop offset=".7" stop-color="#3b2f86"/><stop offset="1" stop-color="#5a46a8"/></linearGradient></defs>`
        + `<rect data-frame width="${n(l.W)}" height="${n(l.H)}" fill="url(#essaim-ciel)"/>${dots}${lanes}${edge(true)}${edge(false)}`
        + `<g data-hint></g><g data-sky></g><g data-planet></g>`
        + `<g data-rocket><g class="essaim-corps"><g data-train></g><g class="essaim-fusee">${rocket()}</g></g></g><g data-effects></g></svg>`;
}
/** The row of goals under Boubou: one icon for each star, friend and gate of the scene, coloured once picked up. */
export function goalsHtml(s: State, locale: Locale): string {
    const t = labels[locale], left = s.goals.filter(g => !g.got).length;
    return `<div class="essaim-goals" role="img" aria-label="${t.goals} : ${left}">${s.goals.map(g => `<span data-goal="${g.id}" data-kind="${g.kind}"${g.got ? ' data-got' : ''}>${svg(goalIcon(g.kind))}</span>`).join('')}</div>`;
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="essaim-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="essaim-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="essaim-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="essaim essaim-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="essaim-instruction"><div id="guide">${characterSvg('panda', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="essaim-message" aria-live="polite">${typeset(message)}</p></div>`
        + goalsHtml(s, locale)
        + `<div class="essaim-stage"><div class="essaim-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div></section>`;
}
