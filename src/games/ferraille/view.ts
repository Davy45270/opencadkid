import { characterSvg } from '../../characters/svg';
import { allPlats, featuresOf, FLOOR, H, isUnlocked, levels, partsOf, robotBox, standX, stars, W, type Feature, type LevelDef, type Piece, type Plat, type State } from '../../engines/ferraille';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { boubou, button, ladder, part, platform, robot } from './art';

export const labels = {
    fr: { title: 'Le robot de Boubou', levels: 'Choisis un niveau',
        gesture: 'Touche une caisse ou une étagère : Boubou saute dessus.',
        intro: { trampo: 'Un trampoline : il envoie Boubou tout en haut !', tapis: 'Un tapis roulant : il emporte Boubou de l’autre côté.', echelle: 'Une échelle : touche l’étagère du haut, Boubou grimpe.', ascenseur: 'Un ascenseur monte et descend : touche-le quand il brille !', pont: 'Un bouton rouge : saute dessus, un pont va sortir.', lourd: 'Les piles sont lourdes : une seule à la fois ! Touche le robot pour la lui donner.' } as Record<Feature, string>,
        wants: (n: number): string => n === 1 ? 'Ramasse la pièce du robot.' : `Ramasse les ${n} pièces du robot.`,
        got: { b: 'Un boulon doré !', g: 'Un engrenage !', s: 'Un ressort !', p: 'Une pile !' } as Record<Piece, string>,
        heavy: 'Trop lourd ! Une seule pile à la fois : donne d’abord l’autre au robot.', bridge: 'Clic ! Le pont sort.', give: 'Le robot attrape la pile avec son aimant. Merci !',
        fail: { coussin: 'Trop loin ! Pouf, le gros coussin renvoie Boubou.', bong: 'Bong ! C’est trop haut pour sauter.', balles: 'Plouf ! Boubou plonge dans les balles et ressort tout couvert.', canard: 'Couic ! Le canard en caoutchouc renvoie Boubou.', surplace: 'Le tapis roule dans l’autre sens : Boubou court sur place !', eternue: 'Atchoum ! Le robot éternue des boulons : il en manque !' },
        shine: 'Regarde ce qui brille !', won: 'Bravo ! Le robot est réparé, il danse !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        board: 'L’atelier : touche une caisse, une étagère ou le robot', goals: 'Pièces du robot', robot: 'Le robot' },
    en: { title: 'Boubou’s robot', levels: 'Choose a level',
        gesture: 'Touch a crate or a shelf: Boubou jumps onto it.',
        intro: { trampo: 'A trampoline: it sends Boubou right up!', tapis: 'A conveyor belt: it carries Boubou to the other side.', echelle: 'A ladder: touch the top shelf, Boubou climbs.', ascenseur: 'A lift goes up and down: touch it when it shines!', pont: 'A red button: jump on it, a bridge comes out.', lourd: 'Batteries are heavy: only one at a time! Touch the robot to give it one.' } as Record<Feature, string>,
        wants: (n: number): string => n === 1 ? 'Pick up the robot’s part.' : `Pick up the robot’s ${n} parts.`,
        got: { b: 'A golden bolt!', g: 'A gear!', s: 'A spring!', p: 'A battery!' } as Record<Piece, string>,
        heavy: 'Too heavy! Only one battery at a time: give the other one to the robot first.', bridge: 'Click! The bridge comes out.', give: 'The robot catches the battery with its magnet. Thank you!',
        fail: { coussin: 'Too far! Poof, the big cushion bounces Boubou back.', bong: 'Bong! It’s too high to jump.', balles: 'Splosh! Boubou dives into the balls and comes out covered.', canard: 'Squeak! The rubber duck bounces Boubou back.', surplace: 'The belt rolls the other way: Boubou runs on the spot!', eternue: 'Atishoo! The robot sneezes bolts: some are missing!' },
        shine: 'Look at what shines!', won: 'Well done! The robot is mended, it dances!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        board: 'The workshop: touch a crate, a shelf or the robot', goals: 'The robot’s parts', robot: 'The robot' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the parts. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.wants(partsOf(level).length)];
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
export const pictogram = svg(`<rect x="4" y="4" width="56" height="56" rx="12" fill="#f3e3c3"/><rect x="8" y="40" width="22" height="20" rx="2" fill="#dca36a" stroke="#46364a" stroke-width="2"/><rect x="30" y="24" width="26" height="6" rx="2" fill="#c58a55" stroke="#46364a" stroke-width="2"/><g transform="translate(43 15) scale(.7)">${part('g')}</g><g transform="translate(40 60) scale(.42)">${robot()}</g>`);
export function levelView(records: Partial<Record<number, number>>, locale: Locale): string {
    const t = labels[locale];
    return `<section class="ferraille"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('panda')}</div><div class="level-grid">${levels.map(l => `<button data-ferraille-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** Where a part lies on its platform: above the middle, where Boubou lands. */
export const partAt = (l: LevelDef, p: Plat): { x: number; y: number } => ({ x: standX(l, p), y: p.y - (p.button && p.piece ? 24 : 16) });
/** A red button under a part: the part floats a little higher so that it does not hide the button. */
const buttonAt = (l: LevelDef, p: Plat): string => `translate(${standX(l, p)} ${p.y})`;
/** The workshop of a scene: the wall, the cushion, the platforms with their parts and buttons, the ladders, the robot,
 * Boubou and the effects, each in its own layer. */
export function sceneSvg(l: LevelDef, s: State, locale: Locale): string {
    const r = robotBox(l), plats = allPlats(l).filter(p => p.kind !== 'sol'), dirOf = (p: Plat): number => { const q = plats.find(x => x.id === p.to); return q && q.x0 >= p.x1 ? 1 : -1; };
    const wall = `<rect width="${W}" height="${H}" fill="#f6e7c8"/>${Array.from({ length: 40 }, (_, k) => `<circle cx="${12 + (k % 8) * 22}" cy="${20 + Math.floor(k / 8) * 50}" r="1.6" fill="#e2cfa6"/>`).join('')}<path d="M70 0V12M110 0V12" stroke="#8d8d99" stroke-width="1.5"/><path d="M60 12H120L112 20H68Z" fill="#ffcf33" stroke="#46364a" stroke-width="1.6"/>`;
    const cushion = `<g data-cushion><rect x="0" y="${FLOOR}" width="${W}" height="${H - FLOOR + 6}" rx="8" fill="#ff9fbf" stroke="#46364a" stroke-width="2"/>${Array.from({ length: 9 }, (_, k) => `<path d="M${k * 20 + 6} ${FLOOR + 3}v10" stroke="#ffd1e1" stroke-width="5" stroke-linecap="round"/>`).join('')}</g>`;
    const ladders = l.ladders.map(d => { const a = plats.find(p => p.id === d.a)!, b = plats.find(p => p.id === d.b)!; return ladder(d.x, Math.min(a.y, b.y), Math.max(a.y, b.y)); }).join('');
    const body = plats.map(p => {
        const pt = partAt(l, p), got = s.carried.includes(p.id) || s.delivered.includes(p.id);
        const extra = (p.button ? `<g data-button transform="${buttonAt(l, p)}">${button(s.bridge)}</g>` : '') + (p.piece ? `<g data-part="${p.id}"${got ? ' data-got' : ''} transform="translate(${pt.x} ${pt.y})"><g class="ferraille-piece">${part(p.piece)}</g></g>` : '');
        return `<g data-plat="${p.id}" data-kind="${p.kind}"${p.kind === 'pont' && !s.bridge ? ' data-hidden' : ''}><g class="ferraille-plateforme">${platform(p, dirOf(p))}</g>${extra}</g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${labels[locale].board}">${wall}${cushion}${ladders}`
        + `<g data-robot transform="translate(${(r.x0 + r.x1) / 2} ${FLOOR})"${l.robot === 'g' ? ' data-left' : ''}><g transform="scale(${l.robot === 'g' ? -0.9 : 0.9} 0.9)">${robot()}</g></g>${body}`
        + `<g data-boubou><g data-mover>${boubou()}</g></g><g data-effects></g></svg>`;
}
/** The row of parts above the workshop: grey while they lie about, bright once Boubou has them, ticked once in the robot. */
export function goalsHtml(s: State, l: LevelDef, locale: Locale): string {
    const t = labels[locale];
    return `<div class="ferraille-goals" role="img" aria-label="${t.goals} : ${s.delivered.length + s.carried.length} / ${partsOf(l).length}">${partsOf(l).map(p => `<span data-goal="${p.id}"${s.delivered.includes(p.id) ? ' data-got' : s.carried.includes(p.id) ? ' data-carried' : ''}>${svg(`<g transform="translate(32 32) scale(1.5)">${part(p.piece!)}</g>`)}</span>`).join('')}</div>`;
}
export function gameView(s: State, l: LevelDef, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="ferraille-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="ferraille-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="ferraille-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="ferraille ferraille-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="ferraille-instruction"><div id="guide">${characterSvg('panda', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="ferraille-message" aria-live="polite">${typeset(message)}</p></div>`
        + goalsHtml(s, l, locale)
        + `<div class="ferraille-stage"><div class="ferraille-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div></section>`;
}
