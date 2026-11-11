import { characterSvg } from '../../characters/svg';
import { featuresOf, goalsOf, height, isUnlocked, levels, roundOf, stars, width, type Fail, type Feature, type LevelDef, type Move, type Records, type State } from '../../engines/dedale';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { arrow, backArrow, boubou, bridge, friend, friendColours, gate, hedge, keyFlower, leaves, path, puddle, runIcon, seed, stream, sun, tunnel, U } from './art';

export const labels = {
    fr: { title: 'Le jardin de Boubou', levels: 'Choisis un niveau',
        gesture: 'Glisse ton doigt ou touche une flèche : Boubou avance d’une case.',
        intro: { papillon: 'Un papillon se promène : il suit les petits points.', flaque: 'Attention aux flaques : fais le tour !', herisson: 'Le hérisson fait sa ronde sur les petits points.', soleil: 'Prends le soleil : les amis dansent et te donnent une graine.', coccinelle: 'Une coccinelle se promène sur les petits points.', porte: 'La porte est fermée : cherche la clé fleur.', tunnel: 'Un trou dans la haie : on passe d’un bord à l’autre.', pont: 'Traverse le ruisseau sur le pont.', feuilles: 'Sur les feuilles, Boubou glisse jusqu’au bout.' } as Record<Feature, string>,
        goal: 'Ramasse toutes les graines.',
        fail: { haie: 'Boing ! On ne passe pas dans la haie.', flaque: 'Splash ! Pas dans la flaque, les pieds sont mouillés.', ruisseau: 'Plouf ! Le ruisseau se traverse sur le pont.', porte: 'Pas encore ! Il faut la clé fleur.', papillon: 'Atchoum ! Le papillon chatouille le nez de Boubou.', herisson: 'Un câlin au hérisson ! Ça pique un peu.', coccinelle: 'Hi hi hi ! La coccinelle chatouille Boubou.' } as Record<Fail, string>,
        shine: 'Regarde la flèche qui bouge !', seed: 'Une graine !', sun: 'Le soleil ! Les amis dansent.', bonus: 'Merci les amis, une graine en plus !', key: 'La clé fleur ! La porte s’ouvre.', tunnel: 'Hop, par le tunnel !', slide: 'Ça glisse !', undo: 'On revient en arrière.',
        won: 'Bravo ! Les fleurs poussent partout !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau', back: 'Retour',
        run: 'Tout seul', runLabel: 'Boubou continue tout seul jusqu’au prochain croisement quand tu glisses',
        board: 'Le jardin : glisse ou touche une case à côté de Boubou ; au clavier, les flèches, Retour arrière pour revenir',
        seeds: 'Graines à ramasser', bonusSeeds: 'Graines en plus' },
    en: { title: 'Boubou’s garden', levels: 'Choose a level',
        gesture: 'Slide your finger or touch an arrow: Boubou walks one cell.',
        intro: { papillon: 'A butterfly is out for a walk: it follows the little dots.', flaque: 'Mind the puddles: go round them!', herisson: 'The hedgehog walks its round on the little dots.', soleil: 'Take the sun: the friends dance and give you a seed.', coccinelle: 'A ladybird is out for a walk on the little dots.', porte: 'The gate is closed: find the key flower.', tunnel: 'A hole in the hedge: go from one edge to the other.', pont: 'Cross the stream on the bridge.', feuilles: 'On the leaves, Boubou slides to the end.' } as Record<Feature, string>,
        goal: 'Pick up every seed.',
        fail: { haie: 'Boing! No way through the hedge.', flaque: 'Splash! Not in the puddle, wet feet.', ruisseau: 'Splosh! Cross the stream on the bridge.', porte: 'Not yet! You need the key flower.', papillon: 'Atchoo! The butterfly tickles Boubou’s nose.', herisson: 'A hug for the hedgehog! A bit prickly.', coccinelle: 'Tee-hee! The ladybird tickles Boubou.' } as Record<Fail, string>,
        shine: 'Look at the arrow that moves!', seed: 'A seed!', sun: 'The sun! The friends dance.', bonus: 'Thank you, friends, one more seed!', key: 'The key flower! The gate opens.', tunnel: 'Hop, through the tunnel!', slide: 'Wheee, it slides!', undo: 'One step back.',
        won: 'Well done! Flowers grow everywhere!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level', back: 'Back',
        run: 'By himself', runLabel: 'Boubou goes on by himself to the next crossing when you slide',
        board: 'The garden: slide or touch a cell next to Boubou; with the keyboard, arrows, Backspace to go back',
        seeds: 'Seeds to pick up', bonusSeeds: 'Bonus seeds' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.goal];
}
export const pictogram = svg(`<rect x="4" y="8" width="56" height="50" rx="8" fill="#3f8a45"/><path d="M14 18H50V30H22V48H50" fill="none" stroke="#f1dfb4" stroke-width="9" stroke-linejoin="round"/><g transform="translate(44 46) scale(.22)">${seed()}</g><g transform="translate(18 20) scale(.26)">${boubou()}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="dedale"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('panda')}</div><div class="level-grid">${levels.map(l => `<button data-dedale-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
/** How the garden fits its stage: square cells as big as the stage allows (at most `MAX_CELL` px), the board in the middle
 * and the rest of the stage given to the lawn around it. All in units, a cell being 100 wide. */
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
/** What a cell of the grid shows. `level` places the tunnel mouths on their edge. */
export function cellSvg(level: LevelDef, c: string, x: number, y: number): string {
    switch (c) {
        case '#': return hedge(x, y);
        case '~': return stream();
        case '-': return bridge(false);
        case '|': return bridge(true);
        case 'D': return gate();
        case 'f': return leaves();
        case '=': return tunnel(x === 0 ? 'gauche' : x === width(level) - 1 ? 'droite' : y === 0 ? 'haut' : 'bas');
        case 'o': return path(x, y) + puddle();
        case '*': return path(x, y) + `<g class="dedale-graine">${seed()}</g>`;
        case 'S': return path(x, y) + `<g class="dedale-soleil">${sun()}</g>`;
        case 'k': return path(x, y) + `<g class="dedale-cle">${keyFlower()}</g>`;
        default: return path(x, y);
    }
}
/** The round of every friend, in little dots of its colour. */
export function routesSvg(level: LevelDef, l: Layout): string {
    const w = width(level);
    return level.friends.map(f => {
        const cells = roundOf(level, f), pts = [...cells, cells[0]!].map(c => `${n(cx(l, c % w))},${n(cy(l, Math.floor(c / w)))}`).join(' ');
        return `<polyline points="${pts}" fill="none" stroke="${friendColours[f.kind]}" stroke-width="7" stroke-dasharray="2 16" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
    }).join('');
}
/** The garden: the lawn around, the cells, the rounds, then the layers that move (friends, arrows, Boubou, effects). */
export function boardSvg(level: LevelDef, l: Layout, locale: Locale): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(l.W)} ${n(l.H)}" role="img" aria-label="${labels[locale].board}">`
        + `<rect width="${n(l.W)}" height="${n(l.H)}" fill="#9ccf7d"/>`
        + `<rect x="${n(l.ox - 8)}" y="${n(l.oy - 8)}" width="${width(level) * U + 16}" height="${height(level) * U + 16}" rx="16" fill="none" stroke="#2f6b35" stroke-width="10"/>`
        + `<g data-cells></g><g data-routes>${routesSvg(level, l)}</g><g data-blooms></g><g data-friends>${level.friends.map((f, i) => `<g data-friend="${i}" data-kind="${f.kind}"><g class="dedale-inner">${friend(f.kind)}</g></g>`).join('')}</g>`
        + `<g data-arrows></g><g data-boubou><g class="dedale-inner">${boubou()}</g></g><g data-effects></g></svg>`;
}
export const arrowsSvg = (cells: { action: Move; x: number; y: number }[], l: Layout): string =>
    cells.map(c => `<g data-arrow="${c.action}" transform="translate(${n(cx(l, c.x))} ${n(cy(l, c.y))})"><g class="dedale-arrow">${arrow({ haut: -90, bas: 90, gauche: 180, droite: 0 }[c.action])}</g></g>`).join('');
/** The row under Boubou: the seeds and suns of the scene (a picked one fades), then the bonus seeds the friends gave. */
export function goalsHtml(level: LevelDef, left: number, bonus: number, locale: Locale): string {
    const total = goalsOf(level), t = labels[locale], kinds = level.rows.join('').split('').filter(c => c === '*' || c === 'S');
    return `<div class="dedale-goals"><span class="dedale-seeds" role="img" aria-label="${t.seeds} : ${left}">${kinds.map((c, i) => `<span data-goal="${i}"${i < total - left ? ' data-got' : ''}>${svg(`<g transform="translate(32 32) scale(.62)">${c === 'S' ? sun() : seed()}</g>`)}</span>`).join('')}</span>`
        + `<span class="dedale-bonus" role="img" aria-label="${t.bonusSeeds} : ${bonus}">${Array.from({ length: bonus }, () => `<span data-bonus>${svg(`<g transform="translate(32 32) scale(.5)">${seed()}</g>`)}</span>`).join('')}</span></div>`;
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean, left: number, running: boolean): string {
    const t = labels[locale], won = stars(s), level = levels[s.level - 1]!;
    const finish = s.finished ? `<div class="dedale-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="dedale-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="dedale-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="dedale dedale-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="dedale-instruction"><div id="guide">${characterSvg('panda', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="dedale-message" aria-live="polite">${typeset(message)}</p></div>`
        + goalsHtml(level, left, s.bonus, locale)
        + `<div class="dedale-stage"><div class="dedale-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div>`
        + `<div class="dedale-tools"><button id="dedale-retour" aria-label="${t.back}">${backArrow}<span>${t.back}</span></button><button id="dedale-seul" aria-pressed="${running}" aria-label="${t.runLabel}">${runIcon}<span>${t.run}</span></button></div></section>`;
}
