import { characterSvg } from '../../characters/svg';
import { CARROT_FROM, carrotsOn, countAt, featuresOf, height, isRock, isUnlocked, levels, molesOf, stars, width, type Fail, type Feature, type LevelDef, type Records, type State } from '../../engines/taupes';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { carrot, carrotIcon, clod, flower, mole, open, rock, spadeIcon, U } from './art';

export const labels = {
    fr: { title: 'Les taupes de Tutu', levels: 'Choisis un niveau',
        gesture: 'Touche une motte. Sans taupe, elle s’ouvre sur une fleur : les petites taupes dessinées disent combien dorment juste à côté.',
        carrot: 'Tu sais où dort la taupe ? Touche le bouton carotte, puis sa motte. Ou garde le doigt appuyé dessus.',
        intro: { deux: 'Deux taupes dorment dans ce jardin.', zero: 'Une fleur sans taupe autour ouvre ses voisines toute seule.', croise: 'Regarde deux fleurs ensemble : la taupe dort là où elles se croisent.', grand: 'Le jardin grandit !', rocher: 'Un rocher : rien à creuser dessous.' } as Record<Feature, string>,
        goal: (n: number): string => n === 1 ? 'Ouvre toutes les mottes, sauf celle de la taupe.' : `Ouvre toutes les mottes, sauf celles des ${n} taupes.`,
        near: (n: number): string => n === 0 ? 'Aucune taupe autour : les mottes voisines s’ouvrent !' : n === 1 ? 'Une taupe dort juste à côté.' : `${['', '', 'Deux', 'Trois', 'Quatre'][n] ?? n} taupes dorment juste à côté.`,
        funny: { baille: 'Chut, je dors ! La taupe bâille et se rendort.', lapin: 'Pas de taupe ici : hop, un lapin chipe la carotte !', pollen: 'Atchoum ! La fleur éternue du pollen.', galipette: 'Youpi ! Tutu fait une galipette.', saute: 'Boing ! La carotte saute : elle garde une taupe.', ver: 'Coucou ! Un ver de terre dit bonjour.', rocher: 'Toc ! On ne creuse pas un rocher.' } as Record<Fail, string>,
        placed: 'Une carotte pour la taupe !', taken: 'Tu reprends la carotte.',
        shine: 'Regarde la motte qui brille !',
        won: 'Bravo ! Les taupes se réveillent, mangent leur carotte et font la fête !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        dig: 'Creuser', carrotTool: 'Carotte', pocket: 'Carottes dans la poche', tutu: 'Tutu',
        board: 'Jardin de Tutu : touche une motte pour la creuser' },
    en: { title: 'Tutu’s moles', levels: 'Choose a level',
        gesture: 'Touch a clod. With no mole under it, it opens on a flower: the little moles drawn there say how many sleep right next to it.',
        carrot: 'You know where the mole sleeps? Touch the carrot button, then its clod. Or keep your finger on it.',
        intro: { deux: 'Two moles are sleeping in this garden.', zero: 'A flower with no mole around opens its neighbours by itself.', croise: 'Look at two flowers together: the mole sleeps where they cross.', grand: 'The garden is growing!', rocher: 'A rock: nothing to dig under it.' } as Record<Feature, string>,
        goal: (n: number): string => n === 1 ? 'Open every clod, except the mole’s.' : `Open every clod, except the ${n} moles’.`,
        near: (n: number): string => n === 0 ? 'No mole around: the clods next to it open!' : n === 1 ? 'One mole sleeps right next to it.' : `${['', '', 'Two', 'Three', 'Four'][n] ?? n} moles sleep right next to it.`,
        funny: { baille: 'Shh, I’m sleeping! The mole yawns and goes back to sleep.', lapin: 'No mole here: hop, a rabbit takes the carrot!', pollen: 'Atchoo! The flower sneezes pollen.', galipette: 'Wheee! Tutu does a somersault.', saute: 'Boing! The carrot jumps: it is guarding a mole.', ver: 'Hello! An earthworm says hi.', rocher: 'Knock! You can’t dig a rock.' } as Record<Fail, string>,
        placed: 'A carrot for the mole!', taken: 'You take the carrot back.',
        shine: 'Look at the clod that shines!',
        won: 'Well done! The moles wake up, eat their carrots and have a party!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        dig: 'Dig', carrotTool: 'Carrot', pocket: 'Carrots in the pocket', tutu: 'Tutu',
        board: 'Tutu’s garden: touch a clod to dig it' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene), the carrot (when it comes in) or the new thing
 * the scene brings, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : level.id === CARROT_FROM ? [t.carrot] : fresh.map(f => t.intro[f])), t.goal(molesOf(level).length)];
}
export const pictogram = svg(`<rect x="2" y="30" width="60" height="32" rx="8" fill="#8cc970"/><g transform="translate(20 44) scale(.3)">${mole(false)}</g><g transform="translate(46 44) scale(.3)">${flower(1.1)}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="taupes"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('singe')}</div><div class="level-grid">${levels.map(l => `<button data-taupes-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»…])/g, ' $1');
/** How the garden fits its stage: square cells as big as the stage allows, with a strip of lawn all round where the
 * earthworms live (`EDGE` of a cell at least above and below, `SIDE` on the sides, kept thin so that a narrow garden still
 * fills most of the stage's height). In units, a cell being 100 wide. */
export const EDGE = 0.22, SIDE = 0.06;
export interface Layout { cell: number; ox: number; oy: number; W: number; H: number }
export function layout(level: LevelDef, stageW: number, stageH: number): Layout {
    const w = width(level), h = height(level), cell = Math.max(1, Math.min(stageW / (w + 2 * SIDE), stageH / (h + 2 * EDGE)));
    const W = stageW / cell * U, H = stageH / cell * U;
    return { cell, ox: (W - w * U) / 2, oy: (H - h * U) / 2, W, H };
}
export const cx = (l: Layout, x: number): number => l.ox + x * U + U / 2;
export const cy = (l: Layout, y: number): number => l.oy + y * U + U / 2;
const r2 = (v: number): string => (Math.round(v * 100) / 100).toString();
/** One cell as the child sees it: a clod (with its carrot), an open bed with its flower and dots, or a rock. */
export function cellSvg(level: LevelDef, s: State, i: number): string {
    const w = width(level), x = i % w, y = Math.floor(i / w);
    if (isRock(level, i)) return rock(x, y);
    if (s.open.includes(i)) return open(x, y, countAt(level, i));
    return clod(x, y) + (s.carrots.includes(i) ? `<g class="taupes-carotte">${carrot()}</g>` : '');
}
export function cellKind(level: LevelDef, s: State, i: number): string { return isRock(level, i) ? 'rocher' : s.open.includes(i) ? 'fleur' : s.carrots.includes(i) ? 'carotte' : 'motte'; }
/** The garden: the lawn all round, a low fence, every cell, then the layers that move. */
export function boardSvg(level: LevelDef, s: State, l: Layout, locale: Locale): string {
    const w = width(level), h = height(level), cells: string[] = [];
    for (let i = 0; i < w * h; i++) cells.push(`<g data-cell="${i}" data-kind="${cellKind(level, s, i)}" transform="translate(${r2(cx(l, i % w))} ${r2(cy(l, Math.floor(i / w)))})"><g class="taupes-inner">${cellSvg(level, s, i)}</g></g>`);
    const tufts = Array.from({ length: Math.ceil(l.W / 90) + 1 }, (_, i) => `<path d="M${i * 90 + 20} ${r2(l.H - 4)}l6 -18l6 18M${i * 90 + 60} 26l6 -18l6 18" fill="none" stroke="#5f9c4c" stroke-width="4" stroke-linecap="round"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(l.W)} ${r2(l.H)}" role="img" aria-label="${labels[locale].board}">`
        + `<rect width="${r2(l.W)}" height="${r2(l.H)}" fill="#b6e29c"/>${tufts}<rect x="${r2(l.ox - 3)}" y="${r2(l.oy - 3)}" width="${w * U + 6}" height="${h * U + 6}" rx="12" fill="#7cbf62" stroke="#8a5a2e" stroke-width="5"/>`
        + `<g data-cells>${cells.join('')}</g><g data-marks></g><g data-effects></g></svg>`;
}
/** The pocket: one carrot per mole, bright while it is still in the pocket, pale once it is on a clod. */
export function pocketHtml(level: LevelDef, s: State, locale: Locale): string {
    const all = molesOf(level).length, left = s.finished ? 0 : all - s.carrots.length;
    if (!carrotsOn(level.id)) return `<div class="taupes-poche" role="img" aria-label="${molesOf(level).length}">${molesOf(level).map(() => `<span data-mole>${svg(`<g transform="translate(32 34) scale(.5)">${mole(false)}</g>`)}</span>`).join('')}</div>`;
    return `<div class="taupes-poche" role="img" aria-label="${labels[locale].pocket} : ${left} / ${all}">${Array.from({ length: all }, (_, k) => `<span data-carrot${k < left ? '' : ' data-used'}>${svg(`<g transform="translate(32 32) scale(.55)">${carrot()}</g>`)}</span>`).join('')}</div>`;
}
export function gameView(s: State, level: LevelDef, locale: Locale, message: string, mode: 'creuser' | 'carotte', reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="taupes-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="taupes-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="taupes-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    const tools = carrotsOn(level.id) ? `<div class="taupes-tools"><button id="taupes-creuser" aria-pressed="${mode === 'creuser'}">${spadeIcon}<span>${t.dig}</span></button><button id="taupes-carotte" aria-pressed="${mode === 'carotte'}">${carrotIcon}<span>${t.carrotTool}</span></button></div>` : '';
    return `<section class="taupes taupes-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="taupes-instruction"><button id="guide" class="taupes-guide" aria-label="${t.tutu}"><span class="taupes-tutu">${characterSvg('singe', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</span></button><p id="taupes-message" aria-live="polite">${typeset(message)}</p></div>`
        + pocketHtml(level, s, locale)
        + `<div class="taupes-stage"><div class="taupes-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div>`
        + tools + '</section>';
}
