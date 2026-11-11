import { characterSvg } from '../../characters/svg';
import { colorsOf, featuresOf, H, isUnlocked, levels, potBox, stars, W, type Color, type Feature, type LevelDef, type State, type Toy } from '../../engines/vis';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { chest, pestouille, plateShape, pot, screwHead, toyBody } from './art';

export const labels = {
    fr: { title: 'Les vis de Pestouille', levels: 'Choisis un niveau',
        gesture: 'Touche une vis : elle tourne et saute dans son pot.',
        intro: { superpose: 'Une plaque est posée sur une autre : commence par celle du dessus.', couleurs3: 'Trois couleurs : chaque vis a son pot, avec son dessin.', angle: 'Des plaques toutes penchées !', deuxvis: 'Cette plaque tient avec deux vis : elle tombe quand les deux sont parties.', profond: 'Trois plaques empilées : de haut en bas !', grand: 'Un grand jouet, plein de vis !' } as Record<Feature, string>,
        wants: (n: number): string => n === 1 ? 'Dévisse la vis pour ranger le jouet.' : `Dévisse les ${n} vis pour ranger le jouet.`,
        got: { r: 'Dans le pot rouge !', b: 'Dans le pot bleu !', j: 'Dans le pot jaune !', v: 'Dans le pot vert !', m: 'Dans le pot violet !' } as Record<Color, string>,
        fall: 'La plaque tombe dans le coffre.',
        fail: { toc: 'Toc toc ! Une plaque cache cette vis : enlève d’abord celle du dessus.', toupie: 'Elle tourne comme une toupie ! Elle file déjà dans son pot.', rot: 'Burp ! Le pot a fait un rot. Il attend les vis.', ressort: 'Boing ! Un diable à ressort sort du coffre.', chapeau: 'Hop ! Pestouille met une plaque sur sa tête : un chapeau !',
            klaxon: { voiture: 'Tut tut ! La voiture klaxonne.', fusee: 'Pchhh ! La fusée crache un petit nuage.', maison: 'Ding dong ! C’est la sonnette de la maison.', bateau: 'Pouêt ! Le bateau corne.', train: 'Tchou ! Le train siffle.' } as Record<Toy, string> },
        won: { voiture: 'Bravo ! La voiture se remonte toute seule et elle roule !', fusee: 'Bravo ! La fusée se remonte toute seule et elle s’envole !', maison: 'Bravo ! La maison se remonte toute seule et elle s’allume !', bateau: 'Bravo ! Le bateau se remonte tout seul et il vogue !', train: 'Bravo ! Le train se remonte tout seul et il roule !' } as Record<Toy, string>,
        shine: 'Regarde la vis qui brille !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        board: 'Le jouet : touche une vis', pot: 'Pot', chest: 'Le coffre à jouets' },
    en: { title: 'Pestouille’s screws', levels: 'Choose a level',
        gesture: 'Touch a screw: it turns and jumps into its pot.',
        intro: { superpose: 'One plate lies on another: start with the one on top.', couleurs3: 'Three colours: every screw has its pot, with its picture.', angle: 'Tilted plates everywhere!', deuxvis: 'This plate is held by two screws: it falls when both are out.', profond: 'Three plates piled up: from the top down!', grand: 'A big toy, full of screws!' } as Record<Feature, string>,
        wants: (n: number): string => n === 1 ? 'Unscrew the screw to put the toy away.' : `Unscrew the ${n} screws to put the toy away.`,
        got: { r: 'Into the red pot!', b: 'Into the blue pot!', j: 'Into the yellow pot!', v: 'Into the green pot!', m: 'Into the purple pot!' } as Record<Color, string>,
        fall: 'The plate falls into the chest.',
        fail: { toc: 'Knock knock! A plate hides this screw: take the one on top off first.', toupie: 'It spins like a top! It is already on its way to its pot.', rot: 'Burp! The pot burped. It is waiting for the screws.', ressort: 'Boing! A jack-in-the-box pops out of the chest.', chapeau: 'Ta-da! Pestouille puts a plate on his head: a hat!',
            klaxon: { voiture: 'Beep beep! The car honks.', fusee: 'Whoosh! The rocket puffs a little cloud.', maison: 'Ding dong! That is the house’s doorbell.', bateau: 'Toot! The boat hoots.', train: 'Choo! The train whistles.' } as Record<Toy, string> },
        won: { voiture: 'Well done! The car puts itself back together and drives off!', fusee: 'Well done! The rocket puts itself back together and flies off!', maison: 'Well done! The house puts itself back together and lights up!', bateau: 'Well done! The boat puts itself back together and sails off!', train: 'Well done! The train puts itself back together and rolls off!' } as Record<Toy, string>,
        shine: 'Look at the shining screw!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        board: 'The toy: touch a screw', pot: 'Pot', chest: 'The toy chest' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.wants(level.screws.length)];
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
export const pictogram = svg(`<rect x="4" y="4" width="56" height="56" rx="12" fill="#e8f1f8"/><path d="M12 22L52 42" stroke="#46364a" stroke-width="14" stroke-linecap="round"/><path d="M12 22L52 42" stroke="#ffd6a5" stroke-width="10" stroke-linecap="round"/><g transform="translate(16 24) scale(.9)">${screwHead('r')}</g><g transform="translate(48 40) scale(.9)">${screwHead('b')}</g><g transform="translate(46 15) scale(.8)">${screwHead('j')}</g>`);
export function levelView(records: Partial<Record<number, number>>, locale: Locale): string {
    const t = labels[locale];
    return `<section class="vis"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('dragon')}</div><div class="level-grid">${levels.map(l => `<button data-vis-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** The pots of a scene, each with the screws already in it. */
export const potsSvg = (l: LevelDef, s: Pick<State, 'out'>): string => colorsOf(l).map(c => { const b = potBox(l, c), n = s.out.filter(id => l.screws.find(x => x.id === id)?.color === c).length; return `<g data-pot="${c}"><g class="vis-pot">${pot(c, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, n)}</g></g>`; }).join('');
/** The room of a scene: the wall, the rug, the pots, the toy with its plates and screws (the lowest plate first),
 * the chest, Pestouille and the effects, each in its own layer. Screws out and plates fallen are kept, hidden, so that the
 * toy can put itself back together at the end. */
export function sceneSvg(l: LevelDef, s: State, locale: Locale): string {
    const room = `<rect width="${W}" height="${H}" fill="#eef5ea"/><path d="M0 60H${W}" stroke="#d6e4cf" stroke-width="2"/><rect y="234" width="${W}" height="${H - 234}" fill="#f6e3c1"/>${Array.from({ length: 9 }, (_, k) => `<circle cx="${10 + k * 20}" cy="${266 + (k % 2) * 14}" r="3" fill="#ead2a4"/>`).join('')}`;
    const plates = l.plates.map(p => {
        const mine = l.screws.filter(x => x.plate === p.id);
        return `<g data-plate="${p.id}"${s.fallen.includes(p.id) ? ' data-fallen' : ''}><g class="vis-plaque">${plateShape(p, mine)}</g>`
            + mine.map(x => `<g data-screw="${x.id}" transform="translate(${x.x} ${x.y})"${s.out.includes(x.id) ? ' data-out' : ''}><g class="vis-vol"><g class="vis-tete">${screwHead(x.color)}</g></g></g>`).join('') + '</g>';
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${labels[locale].board}">${room}<g data-pots>${potsSvg(l, s)}</g>`
        + `<g data-toy="${l.toy}"><g class="vis-jouet">${toyBody(l.toy)}${plates}</g></g>`
        + `<g data-chest aria-label="${labels[locale].chest}"><g class="vis-coffre">${chest(s.fallen.length)}</g></g><g data-pest>${pestouille(s.finished ? 'celebration' : 'joie')}</g><g data-effects></g></svg>`;
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="vis-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="vis-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="vis-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="vis vis-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="vis-instruction"><div id="guide">${characterSvg('dragon', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="vis-message" aria-live="polite">${typeset(message)}</p></div>`
        + `<div class="vis-stage"><div class="vis-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div></section>`;
}
