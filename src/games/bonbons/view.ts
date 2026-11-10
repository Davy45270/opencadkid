import { characterSvg } from '../../characters/svg';
import { isUnlocked, levelOf, levels, progress, stars, type ColorId, type Feature, type Friend, type Goal, type LevelDef, type Miss, type Records, type State, type Tile } from '../../engines/bonbons';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { CELL, chocolate, defs, friend, goalIcon, jar, sugar, sweet, tileSvg, wrapped } from './art';

const names: Record<Locale, Record<ColorId, string>> = {
    fr: { rouge: 'cœurs rouges', orange: 'losanges orange', jaune: 'étoiles jaunes', vert: 'carrés verts', bleu: 'ronds bleus', violet: 'berlingots violets' },
    en: { rouge: 'red hearts', orange: 'orange diamonds', jaune: 'yellow stars', vert: 'green squares', bleu: 'blue rounds', violet: 'purple berlingots' }
};
export const labels = {
    fr: { title: 'Les bonbons de Lumi', levels: 'Choisis un niveau', gesture: 'Fais glisser un bonbon vers son voisin pour les échanger.',
        intro: { arc: 'Échange le bonbon arc-en-ciel avec un bonbon : il prend tous ceux de sa couleur.', emballe: 'Le bonbon emballé saute et fait éclater ses voisins.', sucre: 'Fais une ligne à côté du cube de sucre : il fond en deux fois.', ami: 'Fais descendre ton ami tout en bas.', trou: 'Regarde la forme des bonbons !', choco: 'Fais une ligne à côté du chocolat pour le manger. S’il est seul, il s’étale !' } as Record<Feature, string>,
        miss: { cogne: 'Bong ! Ils se sont cognés.', saute: 'Hop, hop… et ils reviennent !', rougit: 'Deux pareils ! Ils rougissent.', chatouille: 'Hi hi, ça chatouille !', froisse: 'Le papier fait cric-crac !', lourd: 'Trop lourd, le cube de sucre !', colle: 'Oh, ça colle, le chocolat !' } as Record<Miss, string>,
        pot: 'Remplis le pot de Lumi', and: 'et', ami: { cerise: 'Fais descendre la cerise tout en bas.', ourson: 'Fais descendre l’ourson tout en bas.', deux: 'Fais descendre les deux amis tout en bas.' }, sucre: 'Fais fondre le sucre.', choco: 'Mange tout le chocolat.',
        help: 'Regarde les bonbons qui brillent !', mix: 'Plus de coup ? Lumi mélange les bonbons !', won: 'Bravo ! Tu as réussi !', freed: 'Bravo ! Ton ami est arrivé !',
        again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau', board: 'Bonbons : touche un bonbon puis son voisin, ou glisse-le ; au clavier, flèches puis Entrée', goals: 'À faire' },
    en: { title: 'Lumi’s sweets', levels: 'Choose a level', gesture: 'Slide a sweet towards its neighbour to swap them.',
        intro: { arc: 'Swap the rainbow sweet with a sweet: it takes every sweet of that colour.', emballe: 'The wrapped sweet jumps and bursts its neighbours.', sucre: 'Make a line next to the sugar cube: it melts in two times.', ami: 'Bring your friend all the way down.', trou: 'Look at the shape of the sweets!', choco: 'Make a line next to the chocolate to eat it. Left alone, it spreads!' } as Record<Feature, string>,
        miss: { cogne: 'Bonk! They bumped heads.', saute: 'Hop, hop… and back they go!', rougit: 'Twins! They’re blushing.', chatouille: 'Tee-hee, that tickles!', froisse: 'The wrapper goes crinkle-crackle!', lourd: 'The sugar cube is too heavy!', colle: 'Oops, the chocolate is sticky!' } as Record<Miss, string>,
        pot: 'Fill Lumi’s jar', and: 'and', ami: { cerise: 'Bring the cherry all the way down.', ourson: 'Bring the gummy bear all the way down.', deux: 'Bring both friends all the way down.' }, sucre: 'Melt the sugar.', choco: 'Eat all the chocolate.',
        help: 'Look at the shining sweets!', mix: 'No more moves? Lumi mixes the sweets!', won: 'Well done! You did it!', freed: 'Well done! Your friend made it!',
        again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level', board: 'Sweets: touch a sweet then its neighbour, or slide it; with the keyboard, arrows then Enter', goals: 'To do' }
} as const;
const friendsOf = (level: LevelDef): Friend[] => level.rows.join('').split('').filter(ch => ch === 'c' || ch === 'o').map(ch => ch === 'c' ? 'cerise' : 'ourson');
/** The goals, said in one or two short sentences. */
export function goalWords(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], out: string[] = [], pots = level.goals.filter((g): g is Extract<Goal, { kind: 'pot' }> => g.kind === 'pot');
    level.goals.forEach((g, i) => {
        if (g.kind === 'pot' && level.goals.findIndex(x => x.kind === 'pot') === i) out.push(`${t.pot}${locale === 'fr' ? ' :' : ':'} ${pots.map(p => `${p.count} ${names[locale][p.color]}`).join(` ${t.and} `)}.`);
        if (g.kind === 'ami') { const f = friendsOf(level); out.push(f.length > 1 ? t.ami.deux : t.ami[f[0]!]); }
        if (g.kind === 'sucre') out.push(t.sucre);
        if (g.kind === 'choco') out.push(t.choco);
    });
    return out;
}
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goals. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], title = level.title[locale];
    const first = level.features.length === 1 && levels.find(l => l.features.includes(level.features[0]!))?.id === level.id;
    return [title, ...(level.id === 1 ? [t.gesture] : first ? [t.intro[level.features[0]!]] : []), ...goalWords(level, locale)];
}
export const pictogram = svg(`${defs()}<g transform="translate(22 24) scale(.7)">${sweet('rouge')}</g><g transform="translate(46 22) scale(.62)">${wrapped('bleu')}</g><g transform="translate(34 46) scale(.7)">${sweet('jaune')}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="bonbons"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-bonbons-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line: « brillent ! » never leaves the « ! » alone. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, '\u00a0$1');
export const cellX = (s: Pick<State, 'cols'>, i: number): number => (i % s.cols) * CELL + CELL / 2;
export const cellY = (s: Pick<State, 'cols'>, i: number): number => Math.floor(i / s.cols) * CELL + CELL / 2;
/** One tile: an outer group placed by a CSS transform (it slides when it moves), an inner group for its animations. */
export function tileNode(s: Pick<State, 'cols'>, t: Tile, at: number, dy = 0): string {
    return `<g data-tile="${t.id}" data-at="${at}" data-kind="${t.kind}"${t.color ? ` data-color="${t.color}"` : ''}${t.wrapped ? ' data-wrapped' : ''} style="transform:translate(${cellX(s, at)}px,${cellY(s, at) - dy * CELL}px)"><g class="bonbons-inner">${tileSvg(t)}</g></g>`;
}
const themes = [['#ffe3ef', '#fff6fa'], ['#e3f1ff', '#f6fbff'], ['#fff1d6', '#fffaf0'], ['#e9e1ff', '#f8f5ff']] as const;
/** The board: a soft tray of cells (holes give it its shape), then the tiles. */
export function boardSvg(s: State, locale: Locale): string {
    const [dark, light] = themes[(s.level - 1) % themes.length]!, w = s.cols * CELL, h = s.rows * CELL;
    const cells = s.holes.map((hole, i) => hole ? '' : `<rect x="${(i % s.cols) * CELL + 1.5}" y="${Math.floor(i / s.cols) * CELL + 1.5}" width="${CELL - 3}" height="${CELL - 3}" rx="9" fill="${(i % s.cols + Math.floor(i / s.cols)) % 2 ? dark : light}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${labels[locale].board}">${defs()}<g data-tray>${cells}</g><rect data-cursor x="0" y="0" width="${CELL}" height="${CELL}" rx="10" fill="none" stroke="#8d68a0" stroke-width="3" opacity="0"/>`
        + `<rect data-selected x="0" y="0" width="${CELL}" height="${CELL}" rx="10" fill="#fff6a8" stroke="#f5b400" stroke-width="2.5" opacity="0"/>`
        + `<g data-tiles>${s.grid.map((t, i) => t ? tileNode(s, t, i) : '').join('')}</g><g data-effects></g></svg>`;
}
/** The goal strip: Lumi’s jar for each colour to collect, then friends, sugar and chocolate, each with what is left. */
export function goalsHtml(s: State, locale: Locale): string {
    const level = levelOf(s.level);
    return `<div class="bonbons-goals" aria-label="${labels[locale].goals}">${progress(s).map(p => {
        const g = p.goal, ok = p.left === 0 ? ' data-done' : '';
        if (g.kind === 'pot') return `<div class="bonbons-goal" data-goal="pot-${g.color}"${ok}>${jar(p.done / p.total, g.color)}<span class="bonbons-goal-sweet">${goalIcon(sweet(g.color))}</span><b>${p.left || '✓'}</b></div>`;
        if (g.kind === 'ami') return `<div class="bonbons-goal" data-goal="ami"${ok}>${goalIcon(`<g transform="scale(.95)">${friend(friendsOf(level)[0] ?? 'cerise')}</g>`)}<span class="bonbons-arrow">⬇</span><b>${p.left || '✓'}</b></div>`;
        if (g.kind === 'sucre') return `<div class="bonbons-goal" data-goal="sucre"${ok}>${goalIcon(sugar(2))}<b>${p.left || '✓'}</b></div>`;
        return `<div class="bonbons-goal" data-goal="choco"${ok}>${goalIcon(`<g transform="scale(.9)">${chocolate()}</g>`)}<b>${p.left || '✓'}</b></div>`;
    }).join('')}</div>`;
}
export function guideSvg(expression: 'joie' | 'surprise' | 'celebration' | 'concentre', reduce: boolean): string {
    return characterSvg('licorne', expression, 'repos', reduce ? 'reduce' : 'full');
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s), ratio = `${s.cols} / ${s.rows}`;
    const finish = s.finished ? `<div class="bonbons-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="bonbons-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="bonbons-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="bonbons bonbons-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="bonbons-instruction"><div id="guide">${guideSvg(s.finished ? 'celebration' : 'joie', reduce)}</div><p id="bonbons-message" aria-live="polite">${typeset(message)}</p></div>`
        + `<div class="bonbons-stage"><div class="bonbons-zone" tabindex="0" role="application" aria-label="${t.board}" style="--ratio:${ratio}">${boardSvg(s, locale)}${finish}</div></div>`
        + goalsHtml(s, locale) + `</section>`;
}
