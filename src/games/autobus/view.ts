import { characterSvg } from '../../characters/svg';
import { coneId, featuresOf, geometry, H, isUnlocked, levels, stars, W, type Color, type Feature, type LevelDef, type State } from '../../engines/autobus';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { caliroux, cone, hex, motif, stop, vehicle, yard } from './art';

export const labels = {
    fr: { title: 'Les bus de CaliRoux', levels: 'Choisis un niveau',
        gesture: 'Touche un bus : il roule tout droit, en avant, ou en arrière s’il ne peut pas avancer.',
        intro: { voiture: 'Une voiture grise gêne : touche-la, elle roule aussi.', deuxbus: 'Deux bus : chacun son tour, comme les enfants.', plot: 'Les plots orange ne bougent jamais.', cote: 'Une porte sur le côté !', grandcar: 'Un grand car, long comme trois cases !', camion: 'Un grand camion gris !', deuxsorties: 'Deux portes : regarde quel enfant est le premier de la file.', grand: 'Le grand parking !' } as Record<Feature, string>,
        wants: (n: number): string => n === 1 ? 'Emmène l’enfant dans le bus de sa couleur.' : `Emmène les ${n} enfants, chacun dans le bus de sa couleur.`,
        gone: { r: 'Le bus rouge part !', b: 'Le bus bleu part !', j: 'Le bus jaune part !', v: 'Le bus vert part !', m: 'Le bus violet part !' } as Record<Color, string>,
        fail: { klaxon: 'Pouêt pouêt ! Il est coincé : il ne peut ni avancer ni reculer.', plot: 'Bong ! Un plot ne bouge jamais.', coucou: 'Coucou ! Les enfants attendent leur bus.', pigeon: 'Rou rou ! Un pigeon se promène dans la cour.', roulade: 'Hop ! CaliRoux fait une roulade.',
            pasmoi: { r: 'Non non ! C’est au tour du bus rouge.', b: 'Non non ! C’est au tour du bus bleu.', j: 'Non non ! C’est au tour du bus jaune.', v: 'Non non ! C’est au tour du bus vert.', m: 'Non non ! C’est au tour du bus violet.' } as Record<Color, string> },
        won: 'Bravo ! Tous les enfants sont partis à l’école !',
        shine: 'Regarde ce qui brille !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        board: 'La cour : touche un bus ou une voiture', stop: 'L’arrêt de bus' },
    en: { title: 'CaliRoux’s buses', levels: 'Choose a level',
        gesture: 'Touch a bus: it drives straight on, forward, or backward when it cannot go forward.',
        intro: { voiture: 'A grey car is in the way: touch it, it drives too.', deuxbus: 'Two buses: each in turn, like the children.', plot: 'The orange cones never move.', cote: 'A gate on the side!', grandcar: 'A long coach, three cells long!', camion: 'A big grey lorry!', deuxsorties: 'Two gates: look which child is first in the row.', grand: 'The big car park!' } as Record<Feature, string>,
        wants: (n: number): string => n === 1 ? 'Send the child off in the bus of its colour.' : `Send the ${n} children off, each in the bus of its colour.`,
        gone: { r: 'The red bus leaves!', b: 'The blue bus leaves!', j: 'The yellow bus leaves!', v: 'The green bus leaves!', m: 'The purple bus leaves!' } as Record<Color, string>,
        fail: { klaxon: 'Honk honk! It is stuck: it can go neither forward nor back.', plot: 'Bong! A cone never moves.', coucou: 'Hello! The children are waiting for their bus.', pigeon: 'Coo coo! A pigeon is walking in the yard.', roulade: 'Whee! CaliRoux rolls over.',
            pasmoi: { r: 'Not ours! It is the red bus’s turn.', b: 'Not ours! It is the blue bus’s turn.', j: 'Not ours! It is the yellow bus’s turn.', v: 'Not ours! It is the green bus’s turn.', m: 'Not ours! It is the purple bus’s turn.' } as Record<Color, string> },
        won: 'Well done! All the children are off to school!',
        shine: 'Look at what shines!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        board: 'The yard: touch a bus or a car', stop: 'The bus stop' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.wants(level.queue.length)];
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
export const pictogram = svg(`<rect x="4" y="4" width="56" height="56" rx="12" fill="#e8f1f8"/><rect x="10" y="22" width="44" height="24" rx="7" fill="${hex.r}" stroke="#46364a" stroke-width="2.4"/><rect x="15" y="26" width="8" height="9" rx="2" fill="#e3f2fd"/><rect x="26" y="26" width="8" height="9" rx="2" fill="#e3f2fd"/><rect x="42" y="26" width="8" height="12" rx="2" fill="#bbdefb" stroke="#46364a" stroke-width="1.2"/><circle cx="20" cy="47" r="4.5" fill="#46364a"/><circle cx="44" cy="47" r="4.5" fill="#46364a"/><g transform="translate(31 16) scale(.9)">${motif('r')}</g>`);
export function levelView(records: Partial<Record<number, number>>, locale: Locale): string {
    const t = labels[locale];
    return `<section class="autobus"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('pandaroux')}</div><div class="level-grid">${levels.map(l => `<button data-autobus-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** The children still waiting at the stop. */
export const stopSvg = (l: LevelDef, s: Pick<State, 'gone'>): string => stop(l.queue.slice(s.gone.length), s.gone.length);
/** The board of a scene: the stop and its children, the yard with its gates, cones and vehicles, CaliRoux and the effects,
 * each in its own layer. Buses gone are kept, hidden, so that they can come back for the last show. */
export function sceneSvg(l: LevelDef, s: State, locale: Locale): string {
    const g = geometry(l), grass = `<rect width="${W}" height="${H}" fill="#dcefd2"/>${Array.from({ length: 8 }, (_, k) => `<circle cx="${92 + k * 11}" cy="${262 + (k % 2) * 16}" r="3" fill="#bfe0ae"/>`).join('')}`;
    const cones = l.cones.map((c, k) => `<g data-cone="${coneId(k)}">${cone(g.x0 + c.col * g.cell, g.y0 + c.row * g.cell, g.cell)}</g>`).join('');
    const vehicles = l.vehicles.map((v, i) => vehicle(l, v, s.pos[i]!).replace('<g data-vehicle', `<g${s.gone.includes(v.id) ? ' data-gone' : ''} data-vehicle`)).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${labels[locale].board}">${grass}<g data-stop aria-label="${labels[locale].stop}">${stopSvg(l, s)}</g>`
        + `<g data-yard>${yard(l)}</g><g data-cones>${cones}</g><g data-vehicles>${vehicles}</g><g data-cali>${caliroux(s.finished ? 'celebration' : 'joie')}</g><g data-pigeon></g><g data-effects></g></svg>`;
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="autobus-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="autobus-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="autobus-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="autobus autobus-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="autobus-instruction"><div id="guide">${characterSvg('pandaroux', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="autobus-message" aria-live="polite">${typeset(message)}</p></div>`
        + `<div class="autobus-stage"><div class="autobus-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div></section>`;
}
