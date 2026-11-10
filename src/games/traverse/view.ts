import { characterSvg } from '../../characters/svg';
import { featuresOf, friendOf, height, isUnlocked, laneAt, levels, lightOf, snacksOf, stars, width, type Fail, type Feature, type GoalKind, type LevelDef, type Records, type State } from '../../engines/traverse';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { arrow, bush, car, chevrons, goal, ground, hero, light, snack, friend, U } from './art';

export const labels = {
    fr: { title: 'La traversée de Lumi', levels: 'Choisis un niveau',
        gesture: 'Glisse ton doigt ou touche une flèche. À chaque pas du petit, tout avance d’un pas.',
        intro: { deuxsens: 'Les voitures roulent dans les deux sens. Regarde bien !', camion: 'Le camion est très long. Laisse-le passer.', tracteur: 'Le tracteur est lent : il avance un pas sur deux.', rondin: 'Saute sur un rondin : il te porte sur l’eau.', nenuphar: 'Les nénuphars plongent et remontent. Saute sur celui qui remonte !', canard: 'Les canards se promènent dans le pré.', train: 'Quand la barrière sonne, le train arrive.', ami: 'Marche jusqu’à ton ami : il te suivra.', gouter: 'Cueille le goûter en chemin.', feu: 'Touche le feu : les voitures s’arrêtent.', attendre: 'Touche l’œil pour regarder sans bouger.' } as Record<Feature, string>,
        goal: { maison: 'à la maison', lumi: 'jusqu’à Lumi', piquenique: 'au pique-nique', cabane: 'à la cabane' } as Record<GoalKind, string>,
        help: (who: string) => `Aide ${who} à aller`, little: 'le petit', boubou: 'Boubou', friend: 'N’oublie pas ton ami !', snack: 'N’oublie pas le goûter !',
        fail: { voiture: 'Tut tut ! La voiture freine. Hop, on recule !', camion: 'Pouet ! Le gros camion passe. Hop, on recule !', tracteur: 'Teuf teuf… le tracteur te pousse tout doucement.', canard: 'Coin coin ! Le canard te bouscule.', train: 'Tchou tchou ! On attend que le train passe.', plouf: 'Plouf ! Tout mouillé… on s’ébroue !', nenuphar: 'Glouglou ! Le nénuphar a plongé.', bord: 'Oh, le rondin va trop loin ! Hop, on revient.' } as Record<Fail, string>,
        missing: { friend: 'Il manque ton ami !', snack: 'Il manque le goûter !' },
        shine: 'Regarde ce qui brille !', red: 'Feu rouge ! Les voitures s’arrêtent.', found: 'Ton ami vient avec toi !', yum: 'Miam, le goûter !',
        won: 'Bravo ! Tu as traversé !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau', wait: 'Je regarde',
        board: 'Traversée : glisse ou touche une case voisine du petit ; au clavier, flèches, et espace pour regarder', arrows: { haut: 'Monter', bas: 'Descendre', gauche: 'Gauche', droite: 'Droite' } },
    en: { title: 'Lumi’s crossing', levels: 'Choose a level',
        gesture: 'Slide your finger or touch an arrow. With each step of the little one, everything moves one step.',
        intro: { deuxsens: 'Cars go both ways. Look carefully!', camion: 'The truck is very long. Let it go by.', tracteur: 'The tractor is slow: it moves every other step.', rondin: 'Jump on a log: it carries you on the water.', nenuphar: 'Water lilies dive and come back up. Jump on the one coming up!', canard: 'The ducks are out for a walk in the meadow.', train: 'When the barrier rings, the train is coming.', ami: 'Walk up to your friend: it will follow you.', gouter: 'Pick the snack on the way.', feu: 'Touch the light: the cars stop.', attendre: 'Touch the eye to watch without moving.' } as Record<Feature, string>,
        goal: { maison: 'home', lumi: 'to Lumi', piquenique: 'to the picnic', cabane: 'to the hut' } as Record<GoalKind, string>,
        help: (who: string) => `Help ${who} go`, little: 'the little one', boubou: 'Boubou', friend: 'Don’t forget your friend!', snack: 'Don’t forget the snack!',
        fail: { voiture: 'Beep beep! The car brakes. Hop, back you go!', camion: 'Honk! The big truck goes by. Hop, back you go!', tracteur: 'Putt putt… the tractor pushes you gently back.', canard: 'Quack quack! The duck bumps into you.', train: 'Choo choo! Wait for the train to go by.', plouf: 'Splash! All wet… shake it off!', nenuphar: 'Glug glug! The water lily dived.', bord: 'Whoa, the log goes too far! Hop, back again.' } as Record<Fail, string>,
        missing: { friend: 'Your friend is missing!', snack: 'The snack is missing!' },
        shine: 'Look at what shines!', red: 'Red light! The cars stop.', found: 'Your friend comes with you!', yum: 'Yum, the snack!',
        won: 'Well done! You made it across!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level', wait: 'I watch',
        board: 'Crossing: slide or touch a cell next to the little one; with the keyboard, arrows, and space to watch', arrows: { haut: 'Up', bas: 'Down', gauche: 'Left', droite: 'Right' } }
} as const;
/** The goal, said in one sentence, then the friend and the snack not to forget. */
export function goalWords(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], who = level.hero === 'boubou' ? t.boubou : t.little;
    return [`${t.help(who)} ${t.goal[level.goal]}.`, ...(friendOf(level) ? [t.friend] : []), ...(snacksOf(level).length ? [t.snack] : [])];
}
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    const words = goalWords(level, locale).filter(w => !(fresh.includes('ami') && w === t.friend) && !(fresh.includes('gouter') && w === t.snack));
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), ...words];
}
export const pictogram = svg(`<rect x="4" y="22" width="56" height="20" rx="3" fill="#80828f"/><path d="M8 32H56" stroke="#fff" stroke-width="2" stroke-dasharray="6 5"/><rect x="4" y="42" width="56" height="16" rx="3" fill="#abd985"/><rect x="4" y="6" width="56" height="16" rx="3" fill="#76c3ee"/><g transform="translate(40 32) scale(.17)">${car(-1, '#e2384f')}</g><g transform="translate(18 47) scale(.2)">${hero('rose')}</g>`);
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="traverse"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-traverse-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1');
/** How the board fits its stage: cells as wide as the width allows, taller (up to twice as tall) to use the height, and
 * the rest of the height given to the banks above and below. All in units, a cell being 100 wide. */
export interface Layout { ch: number; pad: number; px: number }
export function layout(level: LevelDef, stageW: number, stageH: number): Layout {
    const w = width(level), h = height(level), px = Math.max(1, Math.min(stageW / w, stageH / h));
    const ch = U * Math.min(2, Math.max(1, stageH / (h * px)));
    const pad = Math.max(0, (stageH / px * U - h * ch) / 2);
    return { ch, pad, px };
}
export const centerX = (x: number): number => x * U + U / 2;
export const centerY = (level: LevelDef, y: number, l: Layout): number => (height(level) - 1 - y) * l.ch + l.ch / 2;
/** The fixed part of the board: the lanes, the banks above and below, bushes, the light, the snacks, the friend, the goal. */
export function boardSvg(s: State, l: Layout, locale: Locale): string {
    const level = levelOf(s), w = width(level) * U, h = height(level), total = h * l.ch + 2 * l.pad;
    const lanes = Array.from({ length: h }, (_, y) => { const lane = laneAt(level, y); return `<g transform="translate(0 ${n((h - 1 - y) * l.ch)})">${ground(lane.kind, w, l.ch, y)}${lane.dir && lane.kind !== 'herbe' ? chevrons(w, l.ch, lane.dir) : ''}</g>`; }).join('');
    const top = l.pad ? `<g transform="translate(0 ${-l.pad})">${ground('herbe', w, l.pad, 1)}${trees(w, l.pad, 0)}</g>` : '';
    const bottom = l.pad ? `<g transform="translate(0 ${h * l.ch})">${ground('herbe', w, l.pad, 0)}${trees(w, l.pad, 1)}</g>` : '';
    const at = (x: number, y: number, inner: string, attrs = ''): string => `<g ${attrs} transform="translate(${centerX(x)} ${n(centerY(level, y, l))})"><g class="traverse-inner">${inner}</g></g>`;
    const statics: string[] = [];
    for (let y = 0; y < h; y++) {
        const lane = laneAt(level, y);
        if (lane.kind !== 'herbe') continue;
        for (let x = 0; x < lane.ring.length; x++) {
            const c = lane.ring[x];
            if (c === 'x') statics.push(at(x, y, bush()));
            if (c === 'H') statics.push(at(x, y, `<g transform="scale(1.2)">${goal(level.goal)}</g>`, 'data-home'));
        }
    }
    const lt = lightOf(level);
    if (lt) statics.push(at(lt.x, lt.y, light(s.red > 0), `data-light data-red="${s.red > 0}"`));
    snacksOf(level).forEach((p, k) => { if (!s.picked[k]) statics.push(at(p.x, p.y, snack(), `data-snack="${k}"`)); });
    const fr = friendOf(level);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${n(-l.pad)} ${w} ${n(total)}" role="img" aria-label="${labels[locale].board}"><defs><clipPath id="traverse-clip"><rect x="0" y="${n(-l.pad)}" width="${w}" height="${n(total)}"/></clipPath></defs>`
        + `<g clip-path="url(#traverse-clip)">${top}${lanes}${bottom}<g data-statics>${statics.join('')}</g><g data-world></g>`
        + `<g data-arrows></g>${fr ? `<g data-follower style="transform:translate(${centerX(fr.x)}px,${n(centerY(level, fr.y, l))}px)"><g class="traverse-inner">${friend()}</g></g>` : ''}`
        + `<g data-hero style="transform:translate(${centerX(s.x)}px,${n(centerY(level, s.y, l))}px)"><g class="traverse-inner"><g transform="scale(1.05)">${hero(level.hero)}</g></g></g><g data-effects></g></g></svg>`;
}
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
const levelOf = (s: State): LevelDef => levels[s.level - 1]!;
function trees(w: number, h: number, side: number): string {
    if (h < 60) return '';
    const y = side ? Math.min(h - 40, 70) : Math.max(40, h - 60), r = Math.min(34, h / 3);
    return Array.from({ length: Math.floor(w / 140) }, (_, i) => { const x = 60 + i * 140 + (side ? 60 : 0); return x > w - 30 ? '' : `<g transform="translate(${x} ${n(y)})"><rect x="-6" y="0" width="12" height="${n(r)}" fill="#8a5a2e"/><circle r="${n(r)}" fill="#7cc46c" stroke="#583746" stroke-width="3"/><circle cx="${n(-r / 3)}" cy="${n(-r / 3)}" r="${n(r / 5)}" fill="#ffd6e7"/></g>`; }).join('');
}
export const arrowsSvg = (cells: { action: 'haut' | 'bas' | 'gauche' | 'droite'; x: number; y: number }[], level: LevelDef, l: Layout): string =>
    cells.map(c => `<g data-arrow="${c.action}" transform="translate(${centerX(c.x)} ${n(centerY(level, c.y, l))})"><g class="traverse-arrow">${arrow({ haut: -90, bas: 90, gauche: 180, droite: 0 }[c.action])}</g></g>`).join('');
export function guideSvg(expression: 'joie' | 'surprise' | 'celebration', reduce: boolean): string {
    return characterSvg('licorne', expression, 'repos', reduce ? 'reduce' : 'full');
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s), level = levelOf(s);
    const finish = s.finished ? `<div class="traverse-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="traverse-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="traverse-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    const eye = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><path d="M4 32Q32 6 60 32Q32 58 4 32Z" fill="#fff" stroke="#583746" stroke-width="4"/><circle cx="32" cy="32" r="11" fill="#7a5bb0" stroke="#583746" stroke-width="3"/><circle cx="32" cy="32" r="5" fill="#583746"/><circle cx="36" cy="28" r="3" fill="#fff"/></svg>`;
    return `<section class="traverse traverse-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="traverse-instruction"><div id="guide">${guideSvg(s.finished ? 'celebration' : 'joie', reduce)}</div><p id="traverse-message" aria-live="polite">${typeset(message)}</p></div>`
        + `<div class="traverse-stage"><div class="traverse-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div>`
        + (level.wait ? `<div class="traverse-tools"><button id="traverse-wait">${eye}<span>${t.wait}</span></button></div>` : '') + `</section>`;
}
