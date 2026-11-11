import { characterSvg } from '../../characters/svg';
import { BASE, canAt, cloudAt, groundAt, HEIGHT, isUnlocked, launch, levelOf, levels, profile, SLING_H, stars, WIDTH, type Feature, type LevelDef, type Miss, type Records, type State } from '../../engines/arrosoir';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { balloon, can, caliroux, cloud, cow, duck, flower, frog, INK, puddle, sling, tree, tuft, windsock } from './art';

export const labels = {
    fr: { title: 'L’arrosoir de CaliRoux', levels: 'Choisis un niveau',
        gesture: 'Tire en arrière avec ton doigt, comme un lance-pierre, puis lâche : plus tu tires, plus le ballon va loin !',
        goal: 'Arrose toutes les fleurs qui ont soif.',
        intro: { colline: 'Une colline : lance par-dessus !', vent: 'Le vent pousse les ballons : regarde la manche à air.', haut: 'Une fleur est perchée sur un rocher.', arbre: 'Un pommier : passe par-dessus.', vache: 'Attention à la vache !', etang: 'Le canard nage dans l’étang.', sable: 'Du sable : un splash y fait une petite mare.', nuage: 'Un nuage passe un peu plus loin à chaque ballon.', groupe: 'Un bouquet : un seul splash pour trois fleurs !', geant: 'Arrose l’arrosoir géant : les ballons deviennent gros !', pointilles: 'Les pointillés ne montrent plus que le début du vol.' } as Record<Feature, string>,
        miss: { court: 'Ploc ! Trop court, le ballon revient sur moi. Je m’ébroue !', loin: 'Plouf, tout là-bas ! Un poisson saute.', pousse: 'Splash dans l’herbe : elle pousse !', mare: 'Une petite mare dans le sable : une grenouille arrive !', bisou: 'Cette fleur a déjà bu : elle t’envoie un bisou !', vache: 'Meuh ! La vache secoue ses cornes.', etang: 'Coin coin ! Le canard fait la vague.', arbre: 'Bonk ! Une pomme me tombe sur la tête.', nuage: 'Le nuage fait pleuvoir un petit coup.' } as Record<Miss, string>,
        drink: 'Glou glou ! La fleur s’ouvre.', drinks: 'Glou glou ! Les fleurs s’ouvrent.', big: 'L’arrosoir géant ! Mes ballons sont tout gros.', help: 'Regarde la main : tire comme elle.',
        won: 'Bravo ! Toutes les fleurs sont ouvertes. Un arc-en-ciel !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        board: 'La prairie de CaliRoux : tire en arrière avec le doigt puis lâche pour lancer un ballon d’eau ; au clavier, flèches pour viser et régler la force, Entrée pour lancer' },
    en: { title: 'CaliRoux’s water balloons', levels: 'Choose a level',
        gesture: 'Pull back with your finger, like a slingshot, then let go: the more you pull, the further the balloon goes!',
        goal: 'Water every thirsty flower.',
        intro: { colline: 'A hill: throw over it!', vent: 'The wind pushes the balloons: look at the windsock.', haut: 'A flower is perched on a rock.', arbre: 'An apple tree: throw over it.', vache: 'Mind the cow!', etang: 'The duck swims in the pond.', sable: 'Sand: a splash there makes a little puddle.', nuage: 'A cloud goes a little further after each balloon.', groupe: 'A bouquet: one splash for three flowers!', geant: 'Water the giant watering can: the balloons get big!', pointilles: 'The dots only show the start of the flight now.' } as Record<Feature, string>,
        miss: { court: 'Splosh! Too short, the balloon rolls back on me. I shake myself!', loin: 'Splash, far away! A fish jumps.', pousse: 'Splash on the grass: it grows!', mare: 'A little puddle in the sand: here comes a frog!', bisou: 'This flower has had a drink: it blows you a kiss!', vache: 'Moo! The cow shakes her horns.', etang: 'Quack quack! The duck rides the wave.', arbre: 'Bonk! An apple falls on my head.', nuage: 'The cloud makes a little shower.' } as Record<Miss, string>,
        drink: 'Glug glug! The flower opens.', drinks: 'Glug glug! The flowers open.', big: 'The giant watering can! My balloons are big now.', help: 'Watch the hand: pull like it does.',
        won: 'Well done! Every flower is open. A rainbow!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        board: 'CaliRoux’s meadow: pull back with your finger and let go to throw a water balloon; with the keyboard, arrows to aim and set the strength, Enter to throw' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = level.features.filter(f => levels.find(l => l.features.includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.goal];
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»…])/g, ' $1');
const n = (v: number): string => (Math.round(v * 10) / 10).toString();
export const pictogram = svg(`<rect x="4" y="4" width="56" height="56" rx="12" fill="#cfeefc"/><path d="M4 48q14 -8 28 0t28 0V60H4Z" fill="#8fcf74"/><g transform="translate(44 50) scale(.9)">${flower(0, true)}</g><path d="M14 40q10 -26 26 -10" fill="none" stroke="#3c8fd6" stroke-width="2" stroke-dasharray="2 3"/><g transform="translate(16 38) scale(.9)">${balloon()}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="arrosoir"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('pandaroux')}</div><div class="level-grid">${levels.map(l => `<button data-arrosoir-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** The ground line of a scene as an SVG path, closed under the board. */
function groundPath(level: LevelDef): string {
    const p = profile(level);
    let d = `M0 ${HEIGHT}L0 ${n(p[0]!)}`;
    for (let x = 1; x <= WIDTH; x++) d += `L${x} ${n(p[x]!)}`;
    return `${d}L${WIDTH} ${HEIGHT}Z`;
}
/** The flowers layer: each flower thirsty or open. */
export function flowersSvg(level: LevelDef, s: State): string {
    return level.flowers.map((x, i) => `<g data-flower="${i}"${s.open[i] ? ' data-open' : ''} transform="translate(${x} ${n(groundAt(level, x))})"><g class="arrosoir-fleur">${flower(i, s.open[i]!)}</g></g>`).join('');
}
/** Puddles (with a frog in the last one) and tufts of grass left by funny tries. */
export function tracesSvg(level: LevelDef, s: State): string {
    return s.puddles.map((x, i) => `<g data-puddle transform="translate(${n(x)} ${n(groundAt(level, x) + 1)})">${puddle()}${i === s.puddles.length - 1 ? `<g data-frog><g class="arrosoir-grenouille-assise">${frog()}</g></g>` : ''}</g>`).join('')
        + s.tufts.map(x => `<g data-tuft transform="translate(${n(x)} ${n(groundAt(level, x) + 1)})">${tuft()}</g>`).join('');
}
/** Far away and never in the way: soft hills on the horizon, two sleepy clouds and a few birds. */
const scenery = (c: number): string => `<path d="M0 214Q30 186 62 204T124 196T160 206V250H0Z" fill="#c9e8b4"/><g fill="#fff" opacity=".8"><ellipse cx="${c < WIDTH / 2 ? 40 : 110}" cy="40" rx="18" ry="6"/><ellipse cx="${c < WIDTH / 2 ? 52 : 98}" cy="35" rx="10" ry="7"/><ellipse cx="96" cy="78" rx="14" ry="4.5"/><ellipse cx="104" cy="74" rx="8" ry="5"/></g>`
    + `<path d="M70 58q3 -3 6 0q3 -3 6 0M88 66q2 -2 4 0q2 -2 4 0" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round" opacity=".6"/>`;
/** The board: sky, sun, the cloud, hills and rocks, sand, the pond and its duck, apple trees, cows, the giant can, the
 * windsock, traces, flowers, CaliRoux and his sling, then the layers that move (the dots, the balloon, the effects). */
export function boardSvg(s: State, locale: Locale): string {
    const level = levelOf(s.level), c = level.caliroux.x, cg = groundAt(level, c), start = launch(level), cl = cloudAt(level, s.turn), cn = canAt(level);
    const sand = level.sand.map(z => { let d = `M${z.x0} ${n(groundAt(level, z.x0))}`; for (let x = z.x0 + 1; x <= z.x1; x++) d += `L${x} ${n(groundAt(level, x))}`; for (let x = z.x1; x >= z.x0; x--) d += `L${x} ${n(groundAt(level, x) + 7)}`; return `<path data-sand d="${d}Z" fill="#f2d98c" stroke="#d6b45e" stroke-width=".8"/>`; }).join('');
    const mesas = level.mesas.map(m => `<rect x="${m.x0}" y="${BASE - m.h}" width="${m.x1 - m.x0}" height="${m.h + 2}" rx="2" fill="#b7a58f" stroke="${INK}" stroke-width="1.2"/><rect x="${m.x0}" y="${BASE - m.h - 1}" width="${m.x1 - m.x0}" height="4" rx="2" fill="#7cc46c"/>`).join('');
    const pond = level.pond ? `<g data-pond><path d="M${level.pond.x0} ${BASE - 1}q${n((level.pond.x1 - level.pond.x0) / 2)} 12 ${level.pond.x1 - level.pond.x0} 0Z" fill="#5fb6e8" stroke="#3c8fd6" stroke-width="1"/><rect x="${level.pond.x0}" y="${BASE - 2}" width="${level.pond.x1 - level.pond.x0}" height="3" fill="#5fb6e8"/><g data-duck transform="translate(${n((level.pond.x0 + level.pond.x1) / 2)} ${BASE - 1})"><g class="arrosoir-canard">${duck()}</g></g></g>` : '';
    const wind = level.wind ? `<g data-wind transform="translate(${level.wind > 0 ? 58 : 102} 48)">${windsock(level.wind)}</g>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${labels[locale].board}">`
        + `<defs><linearGradient id="arrosoir-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ed8f7"/><stop offset="1" stop-color="#e6f7ff"/></linearGradient></defs>`
        + `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#arrosoir-ciel)"/><circle cx="${c < WIDTH / 2 ? 138 : 22}" cy="22" r="11" fill="#ffe27a" stroke="#f5b400" stroke-width="1.4"/>`
        + scenery(c) + `<g data-rainbow></g>${wind}`
        + `<path d="${groundPath(level)}" fill="#8fcf74" stroke="#5aa04a" stroke-width="1.4"/><rect x="0" y="${BASE + 6}" width="${WIDTH}" height="${HEIGHT - BASE}" fill="#b98a5a" opacity=".35"/>${mesas}${sand}${pond}`
        + level.trees.map((t, i) => `<g data-tree="${i}" transform="translate(${t.x} ${n(groundAt(level, t.x))})">${tree(t.h)}</g>`).join('')
        + level.cows.map((x, i) => `<g data-cow="${i}" transform="translate(${x} ${n(groundAt(level, x))})"><g class="arrosoir-vache">${cow()}</g></g>`).join('')
        + (cn ? `<g data-can transform="translate(${level.can} ${n(cn.y + 10)})"${s.big ? ' data-taken' : ''}><g class="arrosoir-arrosoir">${can()}</g></g>` : '')
        + `<g data-traces>${tracesSvg(level, s)}</g><g data-flowers>${flowersSvg(level, s)}</g>`
        + `<g data-caliroux transform="translate(${n(c - 15)} ${n(groundAt(level, c - 15) + 2)})"><g class="arrosoir-caliroux">${caliroux(s.finished ? 'celebration' : 'joie')}</g></g>`
        + `<g data-sling transform="translate(${c} ${n(cg)})">${sling(SLING_H)}</g><g data-band></g>`
        + (cl ? `<g data-cloud transform="translate(${n(cl.x)} ${cl.y})"><g class="arrosoir-nuage">${cloud()}</g></g>` : '')
        + `<g data-help></g><g data-dots></g><g data-balloon transform="translate(${n(start.x)} ${n(start.y)})"><g transform="scale(1.25)">${balloon()}</g></g><g data-effects></g></svg>`;
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="arrosoir-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="arrosoir-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="arrosoir-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="arrosoir arrosoir-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="arrosoir-instruction"><div id="guide">${characterSvg('pandaroux', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="arrosoir-message" aria-live="polite">${typeset(message)}</p></div>`
        + `<div class="arrosoir-stage"><div class="arrosoir-zone" tabindex="0" role="application" aria-label="${t.board}">${boardSvg(s, locale)}${finish}</div></div></section>`;
}
