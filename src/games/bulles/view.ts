import { characterSvg } from '../../characters/svg';
import { center, HEIGHT, isUnlocked, LAUNCH, levelOf, levels, limitOf, origin, R, ROW, stars, SWAY, WIDTH, type Feature, type LevelDef, type Miss, type Point, type Records, type Shot, type State } from '../../engines/bulles';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { ammo, bubble, butterfly, cell, defs, flower, INK, missAnimations, missFace, plank } from './art';

export const labels = {
    fr: { title: 'Les bulles de Boubou', levels: 'Choisis un niveau', gesture: 'Pose ton doigt, vise, puis lâche !',
        intro: { arc: 'La bulle arc-en-ciel va avec toutes les couleurs.', nuage: 'Fais éclater les bulles à côté du nuage : il s’envole.', ami: 'Fais éclater les bulles autour de l’ami pour le délivrer.', glace: 'Touche deux fois le glaçon : il fond.', balance: 'La grappe se balance : vise quand elle passe.', murs: 'Les planches font rebondir la bulle.' } as Record<Feature, string>,
        miss: { boing: 'Boing ! Il n’y a rien là-haut.', tournis: 'Ça tourne !', coucou: 'Coucou !', atchoum: 'Atchoum !', bisou: 'Un bisou ! Encore une de la même couleur.', grimace: 'Oups, pas la même couleur !' } as Record<Miss, string>,
        help: 'Regarde la ligne dorée !', up: 'Hop, la grappe remonte !', won: 'Bravo ! Tout s’est envolé !', freed: 'Bravo ! Ton ami est libre !',
        again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau', board: 'Viser : pose le doigt ou utilise les flèches, puis lâche ou appuie sur Entrée', next_bubble: 'Bulle suivante' },
    en: { title: 'Boubou’s bubbles', levels: 'Choose a level', gesture: 'Put your finger down, aim, then let go!',
        intro: { arc: 'The rainbow bubble goes with every colour.', nuage: 'Pop the bubbles next to the cloud: it floats away.', ami: 'Pop the bubbles around your friend to set it free.', glace: 'Hit the ice cube twice: it melts.', balance: 'The cluster is swinging: aim as it goes by.', murs: 'The planks make the bubble bounce.' } as Record<Feature, string>,
        miss: { boing: 'Boing! There is nothing up there.', tournis: 'So dizzy!', coucou: 'Hello there!', atchoum: 'Achoo!', bisou: 'A kiss! One more of the same colour.', grimace: 'Oops, not the same colour!' } as Record<Miss, string>,
        help: 'Look at the golden line!', up: 'Hop, the cluster goes up!', won: 'Well done! Everything flew away!', freed: 'Well done! Your friend is free!',
        again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level', board: 'Aim: put your finger down or use the arrow keys, then let go or press Enter', next_bubble: 'Next bubble' }
} as const;
/** What is said when a scene opens: its title, then the gesture (first scene) or the new thing it brings in. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], title = level.title[locale];
    if (level.id === 1) return [title, t.gesture];
    const first = level.features.length === 1 && levels.find(l => l.features.includes(level.features[0]!))?.id === level.id;
    return first ? [title, t.intro[level.features[0]!]] : [title];
}
export const pictogram = svg(`${defs()}<g transform="translate(18 22) scale(1.25)">${bubble('rouge')}</g><g transform="translate(43 18) scale(1.1)">${bubble('bleu')}</g><g transform="translate(31 44) scale(1.25)">${bubble('jaune')}</g><g transform="translate(52 44) scale(.7)">${butterfly('vert')}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="bulles"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('panda')}</div><div class="level-grid">${levels.map(l => `<button data-bulles-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
const themes = [['#bfe6ff', '#f2fbff'], ['#ffe0ec', '#fff8fb'], ['#d9f2d0', '#f6fff2'], ['#e6dcff', '#faf7ff']] as const;
const at = (p: Point): string => `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`;
/** The cluster, drawn as if it rested in the middle: the swing moves the whole group (see `gridShift`). */
export function gridSvg(s: State): string {
    const level = levelOf(s.level);
    return s.cells.map(c => `<g data-cell="${c.row}:${c.col}" data-kind="${c.kind}"${c.color ? ` data-color="${c.color}"` : ''} transform="${at(center(c, s.top, SWAY))}">${cell(c, level.friend)}</g>`).join('');
}
export const gridShift = (s: State): number => origin(levelOf(s.level), s.tick) - SWAY;
/** A dotted line along `points`, cut after `length` units. */
export function dotted(points: readonly Point[], length = Infinity): string {
    let d = `M${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`, left = length;
    for (let i = 1; i < points.length && left > 0; i++) {
        const a = points[i - 1]!, b = points[i]!, seg = Math.hypot(b.x - a.x, b.y - a.y), k = Math.min(1, left / seg);
        d += `L${(a.x + (b.x - a.x) * k).toFixed(1)} ${(a.y + (b.y - a.y) * k).toFixed(1)}`; left -= seg;
    }
    return d;
}
/** The board: ceiling, the limit the cluster never passes, planks, the cluster, Boubou's bubble and the next one, the flowers grown so far. */
export function boardSvg(s: State, locale: Locale): string {
    const level = levelOf(s.level), [sky, low] = themes[(s.level - 1) % themes.length]!, limitY = R + limitOf(level) * ROW - R / 2;
    const garden = Array.from({ length: Math.min(s.flowers, 14) }, (_, i) => `<g transform="translate(${8 + i * 10.4} ${HEIGHT - 9}) scale(.8)">${flower(['rouge', 'jaune', 'bleu', 'vert', 'violet', 'orange'][i % 6] as 'rouge')}</g>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${labels[locale].board}">${defs()}<linearGradient id="bulles-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${low}"/></linearGradient>`
        + `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bulles-sky)"/><rect width="${WIDTH}" height="3" fill="#8fc9a0"/><path d="M0 ${limitY.toFixed(1)}H${WIDTH}" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="2 4" opacity=".9"/>`
        + `<rect y="${HEIGHT - 6}" width="${WIDTH}" height="6" fill="#9fd58a"/><g data-garden>${garden}</g>`
        + (level.planks ?? []).map(p => plank(...p)).join('')
        + `<g data-grid transform="translate(${gridShift(s).toFixed(2)} 0)">${gridSvg(s)}</g>`
        + `<path data-help d="" fill="none" stroke="#f5b400" stroke-width="3" stroke-linecap="round" stroke-dasharray=".1 6" opacity="0"/>`
        + `<path data-aim d="" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray=".1 5.4" opacity="0"/>`
        + `<circle data-ghost r="9.4" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="2 2" opacity="0"/>`
        + `<g data-effects></g>`
        + `<g data-launcher transform="${at(LAUNCH)}"><circle r="13" fill="#ffffff" opacity=".7" stroke="#8fc9a0" stroke-width="1.4"/><g data-current>${s.finished ? '' : ammo(s.queue[0])}</g></g>`
        + `<g data-next transform="translate(118 236) scale(.7)" aria-label="${labels[locale].next_bubble}">${s.finished ? '' : ammo(s.queue[1])}</g>`
        + `<g data-flight style="display:none"></g></svg>`;
}
/** Butterflies, flowers, a friend set free and the funny face of a try that did nothing: played once, then removed. */
export function effectsSvg(shot: Shot, s: State, reduce: boolean): string {
    const level = levelOf(s.level), shift = shot.origin - SWAY, out: string[] = [], motion = reduce ? ' data-still' : '';
    const pos = (c: { row: number; col: number }, top = shot.top): Point => { const p = center(c, top, SWAY); return { x: p.x + shift, y: p.y }; };
    shot.popped.forEach((c, i) => out.push(`<g transform="${at(pos(c))}"><g class="bulles-fly" style="animation-delay:${(i * 40)}ms"${motion}>${butterfly(c.color)}</g></g>`));
    for (const c of shot.freed) out.push(`<g transform="${at(pos(c))}"><g class="${c.kind === 'ami' ? 'bulles-free' : 'bulles-float'}"${motion}>${cell(c, level.friend)}</g></g>`);
    for (const c of shot.fell) out.push(`<g transform="${at(pos(c))}"><g class="bulles-fall" style="--drop:${(HEIGHT - 12 - pos(c).y).toFixed(0)}px"${motion}>${c.kind === 'ami' ? cell(c, level.friend) : flower(c.color)}</g></g>`);
    for (const c of shot.lifted) out.push(`<g transform="${at(pos(c))}"><g class="bulles-float"${motion}>${c.kind === 'ami' ? cell(c, level.friend) : butterfly(c.color)}</g></g>`);
    if (shot.miss) out.push(`<g transform="${at(pos(shot.at))}" data-miss="${shot.miss}"><g class="${missAnimations[shot.miss]}"${motion}>${bubble(shot.color, missFace(shot.miss))}</g></g>`);
    return out.join('');
}
export function guideSvg(level: LevelDef, expression: 'joie' | 'surprise' | 'celebration' | 'concentre', reduce: boolean): string {
    return characterSvg(level.speaker === 'lumi' ? 'licorne' : 'panda', expression, 'repos', reduce ? 'reduce' : 'full');
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], level = levelOf(s.level), won = stars(s);
    const finish = s.finished ? `<div class="bulles-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="bulles-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="bulles-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="bulles"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="bulles-instruction"><div id="guide">${guideSvg(level, s.finished ? 'celebration' : 'joie', reduce)}</div><p id="bulles-message" aria-live="polite">${message}</p></div>`
        + `<div class="bulles-zone" tabindex="0" role="application" aria-label="${t.board}">${boardSvg(s, locale)}<div class="bulles-boubou" aria-hidden="true">${characterSvg('panda', 'joie', 'repos', reduce ? 'reduce' : 'full')}<span class="bulles-scratch"></span></div>${finish}</div></section>`;
}
