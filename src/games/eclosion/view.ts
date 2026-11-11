import { characterSvg } from '../../characters/svg';
import { boardOf, featuresOf, hatched, height, isTile, isUnlocked, levels, stageOf, stars, width, type Feature, type LevelDef, type State } from '../../engines/eclosion';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { arrow, creature, ROTATION, stone, straw, tile, U } from './art';

export const labels = {
    fr: { title: 'Les œufs de Lumi', levels: 'Choisis un niveau',
        gesture: 'Glisse ton doigt sur le nid, ou touche une flèche : tout glisse, et deux pareils qui se touchent éclosent !',
        intro: { deux: 'Cette fois, il en faut deux !', poule: 'Deux poussins qui se touchent deviennent une poule.', grand: 'Un nid plus grand !', pierre: 'Une pierre : rien ne passe à travers.', ponte: 'Après chaque glissement, je pondrai un nouvel œuf.', loin: 'Deux poules font un paon, et deux paons… un petit dragon !' } as Record<Feature, string>,
        wants: (name: string, n: number): string => n === 2 ? `Fais éclore deux ${name.split(' ').slice(1).join(' ')}s.` : `Fais éclore ${name}.`,
        names: ['un œuf', 'un poussin', 'une poule', 'un paon', 'un petit dragon'],
        hatch: ['', 'Un poussin !', 'Une poule !', 'Un paon !', 'Un petit dragon !'],
        fail: { mur: 'Boing ! Tout est déjà contre le bord.', tete: 'Hmpf ! Ils ne sont pas pareils : ils se font la tête.', pierre: 'Aïe ! La pierre ne bouge pas.', hesite: 'Euh… en biais ? Ils hésitent : glisse tout droit.', tournis: 'Wouh ! Tu as secoué le nid : tout le monde a le tournis.', saut: 'Hop ! Je saute de joie.', coucou: 'Coucou ! C’est moi qu’il faut faire éclore.' },
        laid: 'Un nouvel œuf !', breeze: 'Une petite brise ! Les plus petits vont dans mon panier.',
        shine: 'Regarde la flèche qui brille !', won: 'Bravo, c’est éclos !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        board: 'Le nid : glisse ton doigt pour tout faire glisser', goal: 'À faire éclore', lumi: 'Lumi', arrows: { haut: 'Vers le haut', bas: 'Vers le bas', gauche: 'Vers la gauche', droite: 'Vers la droite' } },
    en: { title: 'Lumi’s eggs', levels: 'Choose a level',
        gesture: 'Slide your finger on the nest, or touch an arrow: everything slides, and two alike that touch hatch!',
        intro: { deux: 'This time, you need two!', poule: 'Two chicks that touch become a hen.', grand: 'A bigger nest!', pierre: 'A stone: nothing goes through it.', ponte: 'After each slide, I will lay a new egg.', loin: 'Two hens make a peacock, and two peacocks… a little dragon!' } as Record<Feature, string>,
        wants: (name: string, n: number): string => n === 2 ? `Hatch two ${name.split(' ').slice(1).join(' ')}s.` : `Hatch ${name}.`,
        names: ['an egg', 'a chick', 'a hen', 'a peacock', 'a little dragon'],
        hatch: ['', 'A chick!', 'A hen!', 'A peacock!', 'A little dragon!'],
        fail: { mur: 'Boing! Everything is already against the edge.', tete: 'Hmph! They are not alike: they sulk.', pierre: 'Ouch! The stone does not move.', hesite: 'Er… sideways? They hesitate: slide straight.', tournis: 'Whoa! You shook the nest: everyone is dizzy.', saut: 'Hop! I jump for joy.', coucou: 'Hello! I am the one to hatch.' },
        laid: 'A new egg!', breeze: 'A little breeze! The smallest go into my basket.',
        shine: 'Look at the arrow that shines!', won: 'Well done, it hatched!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        board: 'The nest: slide your finger to slide everything', goal: 'To hatch', lumi: 'Lumi', arrows: { haut: 'Up', bas: 'Down', gauche: 'Left', droite: 'Right' } }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.wants(t.names[level.target]!, level.count)];
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
export const pictogram = svg(`<rect x="4" y="4" width="56" height="56" rx="12" fill="#f5dfa3"/><g transform="translate(20 40) scale(.3)">${creature(0, 1)}</g><g transform="translate(43 38) scale(.36)">${creature(1, 1)}</g><path d="M6 54Q32 46 58 54" fill="none" stroke="#c99b45" stroke-width="4" stroke-linecap="round"/>`);
export function levelView(records: Partial<Record<number, number>>, locale: Locale): string {
    const t = labels[locale];
    return `<section class="eclosion"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-eclosion-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** The middle of a cell, in nest units. */
export const cellCenter = (level: LevelDef, i: number): { x: number; y: number } => ({ x: (i % width(level)) * U + U / 2, y: Math.floor(i / width(level)) * U + U / 2 });
/** The nest: straw and stones underneath, the creatures above, each in its own group so that it can slide. */
export function nestSvg(level: LevelDef, board: string, locale: Locale): string {
    const w = width(level), h = height(level), start = boardOf(level);
    const ground = start.split('').map((ch, i) => `<g transform="translate(${(i % w) * U} ${Math.floor(i / w) * U})"${ch === '#' ? ` data-stone="${i}"` : ''}>${ch === '#' ? stone : straw(i % w, Math.floor(i / w))}</g>`).join('');
    const tiles = board.split('').map((ch, i) => isTile(ch) ? tileSvg(level, i, stageOf(ch)) : '').join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 ${w * U + 12} ${h * U + 12}" role="img" aria-label="${labels[locale].board}"><rect x="-6" y="-6" width="${w * U + 12}" height="${h * U + 12}" rx="26" fill="#c99b45"/>${ground}<g data-tiles>${tiles}</g><g data-effects></g></svg>`;
}
export const tileSvg = (level: LevelDef, i: number, stage: number): string => { const c = cellCenter(level, i); return `<g data-tile="${i}" data-stage="${stage}" style="transform:translate(${c.x}px,${c.y}px)"><g class="eclosion-bete">${tile(stage)}</g></g>`; };
/** The chain at the top: every stage up to the target, small, then the target big, framed, and touchable. */
export function chainHtml(level: LevelDef, s: State, locale: Locale): string {
    const t = labels[locale], got = Math.min(hatched(level, s.board), level.count);
    const steps = Array.from({ length: level.target }, (_, k) => `<span class="eclosion-maillon" data-chain="${k}">${svg(`<g transform="translate(32 32) scale(${0.42 + k * 0.05})">${creature(k, 1)}</g>`)}</span><b aria-hidden="true">›</b>`).join('');
    const goal = Array.from({ length: level.count }, (_, k) => `<span class="eclosion-but" data-goal="${k}"${k < got ? ' data-got' : ''}>${svg(`<g transform="translate(32 34) scale(.66)">${creature(level.target, 1)}</g>`)}</span>`).join('');
    return `<div class="eclosion-chaine">${steps}<button id="eclosion-cible" class="eclosion-cible" aria-label="${t.goal} : ${t.names[level.target]}">${goal}</button></div>`;
}
export function gameView(s: State, l: LevelDef, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="eclosion-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="eclosion-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="eclosion-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    const pad = (['gauche', 'haut', 'bas', 'droite'] as const).map(d => `<button data-arrow="${d}" aria-label="${t.arrows[d]}"${s.finished ? ' disabled' : ''}>${arrow(ROTATION[d])}</button>`).join('');
    return `<section class="eclosion eclosion-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="eclosion-instruction"><button id="eclosion-lumi" aria-label="${t.lumi}">${characterSvg('licorne', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</button><p id="eclosion-message" aria-live="polite">${typeset(message)}</p></div>`
        + chainHtml(l, s, locale)
        + `<div class="eclosion-stage"><div class="eclosion-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div>`
        + `<div class="eclosion-pad">${pad}</div></section>`;
}
