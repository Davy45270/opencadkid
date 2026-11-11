import { characterSvg } from '../../characters/svg';
import { carrying, HEIGHT, isUnlocked, levelOf, levels, padAt, stars, surfaceAt, WIDTH, world, type Feature, type LevelDef, type Miss, type Records, type State } from '../../engines/fusee';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { alienSvg, craterSvg, defs, ground, helpArrow, hillSvg, houseSvg, INK, padSvg, rocketSvg, rockSvg, sky, starSvg, windSvg } from './art';

export const labels = {
    fr: { title: 'La fusée de Boubou', levels: 'Choisis un niveau',
        gesture: 'Appuie pour souffler et monter, lâche pour descendre. Glisse ton doigt pour aller de côté !',
        goal: 'Pose la fusée tout doucement sur la piste étoilée.',
        intro: { cote: 'La piste est à côté : glisse ton doigt ou touche une flèche.', rocher: 'Un rocher ! Passe à côté.', etoile: 'Attrape l’étoile en descendant !', colline: 'La piste est en haut de la colline.', vent: 'Le vent pousse un peu : regarde les flèches bleues.', glisse: 'La piste glisse : suis-la !', deux: 'Deux amis : d’abord la piste qui brille, puis l’autre.', tunnel: 'Passe par le trou du tunnel.', passager: 'Un petit ami vient avec moi : ramenons-le chez lui !' } as Record<Feature, string>,
        miss: { boing: 'Boing ! Trop vite, je rebondis comme une balle.', tournis: 'Oh là là, j’ai la tête qui tourne !', pouf: 'Pouf ! Un peu de poussière. La piste est à côté.', cratere: 'Plouf dans le cratère ! Il me recrache.', toc: 'Toc ! Pardon, rocher.', rigole: 'Hihi ! L’ami rigole, ça chatouille.', coucou: 'Coucou ! D’abord la piste qui brille.' } as Record<Miss, string>,
        help: 'Suis la flèche dorée : je descends plus doucement.', star: 'Une étoile !', hello: 'Bonjour, l’ami ! Maintenant, l’autre piste.', aboard: 'Monte avec moi !',
        won: 'Bravo ! Posée tout doucement !', home: 'Le voilà chez lui. Bravo !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        left: 'À gauche', right: 'À droite', puff: 'Souffler',
        board: 'Le ciel de la Lune : appuie pour souffler, lâche pour descendre, glisse le doigt pour aller de côté ; au clavier, flèche du haut pour souffler, flèches gauche et droite' },
    en: { title: 'Boubou’s rocket', levels: 'Choose a level',
        gesture: 'Press to puff and go up, let go to come down. Slide your finger to go sideways!',
        goal: 'Land the rocket very gently on the starry runway.',
        intro: { cote: 'The runway is to the side: slide your finger or touch an arrow.', rocher: 'A rock! Go round it.', etoile: 'Catch the star on the way down!', colline: 'The runway is at the top of the hill.', vent: 'The wind pushes a little: look at the blue arrows.', glisse: 'The runway slides: follow it!', deux: 'Two friends: first the shining runway, then the other one.', tunnel: 'Go through the hole in the tunnel.', passager: 'A little friend comes with me: let’s take it home!' } as Record<Feature, string>,
        miss: { boing: 'Boing! Too fast, I bounce like a ball.', tournis: 'Oh dear, my head is spinning!', pouf: 'Poof! A little dust. The runway is over there.', cratere: 'Splosh into the crater! It spits me out.', toc: 'Knock! Sorry, rock.', rigole: 'Hee hee! Our friend laughs, it tickles.', coucou: 'Hello! First the shining runway.' } as Record<Miss, string>,
        help: 'Follow the golden arrow: I come down more slowly.', star: 'A star!', hello: 'Hello, friend! Now the other runway.', aboard: 'Climb aboard!',
        won: 'Well done! A gentle landing!', home: 'Home at last. Well done!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        left: 'Left', right: 'Right', puff: 'Puff',
        board: 'The Moon’s sky: press to puff, let go to come down, slide your finger to go sideways; with the keyboard, up arrow to puff, left and right arrows' }
} as const;
/** What is said when a scene opens: its title, the gesture and the goal (first scene) or the new thing it brings in. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = level.features.filter(f => levels.find(l => l.features.includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture, t.goal] : fresh.map(f => t.intro[f]))];
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
const n = (v: number): string => (Math.round(v * 10) / 10).toString();
export const pictogram = svg(`<rect x="4" y="4" width="56" height="56" rx="12" fill="#2b3480"/><circle cx="14" cy="14" r="1.2" fill="#fff"/><circle cx="48" cy="10" r="1" fill="#fff"/><circle cx="54" cy="30" r="1.2" fill="#fff"/><rect x="4" y="50" width="56" height="10" rx="3" fill="#d9d4e8"/><rect x="18" y="47" width="28" height="4" rx="2" fill="#f5b400" stroke="${INK}"/>`
    + `<defs><linearGradient id="fusee-body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfc8de"/></linearGradient></defs><g transform="translate(32 28) scale(1.15)">${rocketSvg({ happy: true }).replace('class="fusee-flame"', '')}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="fusee"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('panda')}</div><div class="level-grid">${levels.map(l => `<button data-fusee-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** Which way a friend on a runway stands: towards the middle of the board. */
export const inward = (x: number): 1 | -1 => x < WIDTH / 2 ? 1 : -1;
/** A runway, its friend (two runways) or the passenger's house (last runway), drawn at its place at step `t`. */
export function padGroup(s: State, i: number): string {
    const level = levelOf(s.level), w = world(level), p = padAt(w, i, s.t), last = i === level.pads.length - 1, dir = inward(level.pads[i]!.x);
    const active = !s.finished && s.visited === i, done = i < s.visited;
    // The friend or the house stands on the ground beside the runway (at the foot of a hill when the runway is on one).
    // Never astride a hill's edge: further out until the ground is flat under it.
    const beside = (side: number, gap: number, half: number): string => {
        let off = p.w / 2 + gap;
        while (surfaceAt(w, p.x + side * off - half) !== surfaceAt(w, p.x + side * off + half) && off < 60) off += 2;
        return `translate(${n(side * off)} ${n(surfaceAt(w, p.x + side * off) - p.top)})`;
    };
    let host = '';
    // The house stands at the outer end of its runway, the friends on the inner side.
    if (level.passenger && last) host = `<g transform="${beside(-dir, 10, 9)}" data-house>${houseSvg()}</g>`;
    else if (level.pads.length > 1 && !level.passenger) host = `<g transform="${beside(dir, 8, 7)}" data-friend="${i}"><g class="${active ? 'fusee-wave' : 'fusee-sleep'}">${alienSvg(i === 0 ? '#7ed957' : '#7fc8ff')}</g></g>`;
    // With two runways and a passenger, the passenger waits on the first one until Boubou comes.
    const waiting = level.passenger && level.pads.length > 1 && i === 0 && s.visited === 0 ? `<g transform="translate(${n(-dir * (p.w / 2 - 4))} 0) scale(.6)" data-waiting>${alienSvg('#ff9ad5')}</g>` : '';
    return `<g data-pad="${i}"${active ? ' data-active' : ''}${done ? ' data-done' : ''} transform="translate(${n(p.x)} ${n(p.top)})">${host}${padSvg(p.w, active, active || done)}${waiting}</g>`;
}
/** The board: sky and Earth, wind, rocks, the Moon with its hills and craters, aliens, runways, stars, the help arrow
 * and Boubou's rocket. Everything but the rocket, the runways and the stars stays put. */
export function boardSvg(s: State, locale: Locale): string {
    const level = levelOf(s.level), w = world(level);
    const tunnel = new Set(w.rocks.slice(level.rocks.length));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${labels[locale].board}">${defs()}${sky()}`
        + level.wind.map(b => `<g data-wind>${windSvg(b.y0, b.y1, b.dir)}</g>`).join('')
        + w.rocks.map((r, i) => `<g data-rock="${i}"${tunnel.has(r) ? ' data-layer' : ''}><g class="fusee-inner">${rockSvg(r, tunnel.has(r))}</g></g>`).join('')
        + ground() + w.hills.map(h => hillSvg(h)).join('')
        + level.craters.map((c, i) => craterSvg(c.x, c.w).replace('data-crater', `data-crater="${i}"`)).join('')
        + w.aliens.map((a, i) => `<g data-alien="${i}" transform="translate(${n(a.x + a.w / 2)} ${n(a.y + a.h)})">${alienSvg()}</g>`).join('')
        + `<g data-pads>${level.pads.map((_, i) => padGroup(s, i)).join('')}</g>`
        + `<g data-stars>${level.stars.map((p, i) => s.caught.includes(i) ? '' : `<g data-star="${i}" transform="translate(${n(p.x)} ${n(p.y)})">${starSvg()}</g>`).join('')}</g>`
        + `<g data-help opacity="0"></g><g data-effects></g>`
        + `<g data-rocket transform="translate(${n(s.x)} ${n(s.y)})"><g class="fusee-rocket">${rocketSvg({ passenger: carrying(s), happy: s.finished })}</g></g>`
        + `</svg>`;
}
export const helpSvg = helpArrow;
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="fusee-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="fusee-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="fusee-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    const arrow = (dir: 1 | -1): string => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M${dir > 0 ? '12 8L30 20L12 32' : '28 8L10 20L28 32'}Z" fill="#ffd23f" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
    const puff = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4q9 6 9 16q0 7 -9 7q-9 0 -9 -7q0 -10 9 -16Z" fill="#ffffff" stroke="${INK}" stroke-width="2"/><path d="M16 28q4 10 8 0Z" fill="#ffb347" stroke="#f5741c" stroke-width="1.4"/><circle cx="20" cy="17" r="4" fill="#bfe6ff" stroke="${INK}" stroke-width="1.5"/></svg>`;
    return `<section class="fusee fusee-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="fusee-instruction"><div id="guide">${characterSvg('panda', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="fusee-message" aria-live="polite">${typeset(message)}</p></div>`
        + `<div class="fusee-stage"><div class="fusee-zone" tabindex="0" role="application" aria-label="${t.board}">${boardSvg(s, locale)}${finish}</div></div>`
        + `<div class="fusee-controls"${s.finished ? ' hidden' : ''}><button id="fusee-left" class="fusee-hold" aria-label="${t.left}">${arrow(-1)}</button><button id="fusee-puff" class="fusee-hold fusee-big" aria-label="${t.puff}">${puff}</button><button id="fusee-right" class="fusee-hold" aria-label="${t.right}">${arrow(1)}</button></div></section>`;
}
