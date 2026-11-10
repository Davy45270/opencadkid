import { characterSvg } from '../../characters/svg';
import { BAND, failOf, feet, gates, isRole, isUnlocked, levelOf, levels, offered, path, stars, SUB, FAIL_TICKS, treats, waiting, width, WORK_TICKS, type Kind, type LevelDef, type Records, type Role, type State, type Theme } from '../../engines/promenade';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { dots, icon, svg } from '../../ui/svg';
import { balloonsSvg, balloonUp, basketSvg, bearSvg, COATS, failPose, failSvg, flowerSvg, foal, friendSvg, INK, jarSvg, leafBoat, mushroomSvg, rainbowDoor, rolePicture, trapdoor, treatSvg } from './art';

export const labels = {
    fr: { title: 'La promenade de Lumi', levels: 'Choisis un niveau', start: 'Touche la trappe : les petits de Lumi vont marcher jusqu’à la porte arc-en-ciel.',
        intro: { pont: 'Un fossé ! Touche le petit qui attend : il construit un pont.', tunnel: 'Un mur ! Touche le petit qui attend : il creuse un tunnel.', trou: 'Pour descendre, touche le petit qui attend, puis choisis le trou.', echelle: 'Une marche trop haute ! Touche le petit, puis choisis l’échelle.',
            ami: 'Quelqu’un s’est perdu ! Touche-le : il viendra avec nous.', ours: 'Un ours dort sur le chemin. Chatouille-le en le touchant !', bateau: 'De l’eau ! Touche la grande feuille : elle devient un bateau.', pontlevis: 'Le pont du château est levé. Cherche la fleur et touche-la !',
            lucioles: 'Il fait tout noir dans la grotte. Touche le bocal : les lucioles vont éclairer.', ballon: 'Un grand rocher ! Touche les ballons pour passer par-dessus.', champignon: 'Un champignon rebondissant ! Touche-le, et boing !', fourche: 'Deux chemins : touche l’arc-en-ciel pour le chemin gourmand, ou le petit pour aller tout droit.', friandise: 'Des friandises ! Touche-les pour remplir le panier.' },
        mixed: 'Quand un petit attend, touche-le, puis essaie une image. Si ça ne marche pas, c’est rigolo : essaie une autre !', waiting: 'Un petit attend : touche-le !', choose: 'Que doit-il faire ?', good: 'Bravo !', oops: { plouf: 'Plouf !', jet: 'Pschitt !', balancoire: 'Hop, la balançoire !', accordeon: 'Boing !', taupe: 'Coucou la taupe !', glissade: 'Wiii, ça glisse !', tremplin: 'Boing, boing !', carotte: 'Une carotte !', echasses: 'Oh là là, ça penche !', toboggan: 'Wiii !', etoiles: 'Bong ! Des étoiles !', geyser: 'Pschitt, une fontaine !' },
        say: { pont: 'Fais un pont !', tunnel: 'Creuse un tunnel !', trou: 'Creuse un trou !', echelle: 'Pose une échelle !', ami: 'Touche l’ami perdu !', ours: 'Chatouille l’ours !', bateau: 'Touche la feuille !', pontlevis: 'Touche la fleur !', lucioles: 'Touche le bocal de lucioles !', ballon: 'Touche les ballons !', champignon: 'Touche le champignon !', fourche: 'Touche l’arc-en-ciel, ou le petit !' },
        role: { pont: 'Pont', tunnel: 'Tunnel', trou: 'Trou', echelle: 'Échelle' },
        won: 'Bravo ! Les cinq petits sont arrivés !', wonFriend: 'Bravo ! Les cinq petits et leur ami sont arrivés !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', home: 'Accueil', field: 'Le chemin des petits de Lumi', level: 'Niveau', foal: 'Le petit qui attend', trap: 'Ouvrir la trappe', roles: 'Ce que le petit peut faire', thing: 'Toucher', flower: 'La fleur du pont-levis', treat: 'Une friandise' },
    en: { title: 'Lumi’s walk', levels: 'Choose a level', start: 'Touch the trapdoor: Lumi’s little ones will walk to the rainbow door.',
        intro: { pont: 'A ditch! Touch the little one who waits: it builds a bridge.', tunnel: 'A wall! Touch the little one who waits: it digs a tunnel.', trou: 'To go down, touch the little one who waits, then choose the hole.', echelle: 'A step too high! Touch the little one, then choose the ladder.',
            ami: 'Someone is lost! Touch it: it will come with us.', ours: 'A bear is asleep on the path. Tickle it with a touch!', bateau: 'Water! Touch the big leaf: it turns into a boat.', pontlevis: 'The castle bridge is up. Find the flower and touch it!',
            lucioles: 'It is all dark in the cave. Touch the jar: the fireflies will light it up.', ballon: 'A big rock! Touch the balloons to float over it.', champignon: 'A bouncy mushroom! Touch it, and boing!', fourche: 'Two ways: touch the rainbow for the tasty way, or the little one to go straight on.', friandise: 'Treats! Touch them to fill the basket.' },
        mixed: 'When a little one waits, touch it, then try a picture. If it does not work, it is funny: try another one!', waiting: 'A little one is waiting: touch it!', choose: 'What should it do?', good: 'Well done!', oops: { plouf: 'Splash!', jet: 'Squirt!', balancoire: 'A seesaw!', accordeon: 'Boing!', taupe: 'Hello, mole!', glissade: 'Whee, it slides!', tremplin: 'Boing, boing!', carotte: 'A carrot!', echasses: 'Whoa, it wobbles!', toboggan: 'Whee!', etoiles: 'Bonk! Stars!', geyser: 'Squirt, a fountain!' },
        say: { pont: 'Build a bridge!', tunnel: 'Dig a tunnel!', trou: 'Dig a hole!', echelle: 'Set up a ladder!', ami: 'Touch the lost friend!', ours: 'Tickle the bear!', bateau: 'Touch the leaf!', pontlevis: 'Touch the flower!', lucioles: 'Touch the jar of fireflies!', ballon: 'Touch the balloons!', champignon: 'Touch the mushroom!', fourche: 'Touch the rainbow, or the little one!' },
        role: { pont: 'Bridge', tunnel: 'Tunnel', trou: 'Hole', echelle: 'Ladder' },
        won: 'Well done! All five little ones made it!', wonFriend: 'Well done! The five little ones and their friend made it!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', home: 'Home', field: 'The path of Lumi’s little ones', level: 'Level', foal: 'The little one who waits', trap: 'Open the trapdoor', roles: 'What the little one can do', thing: 'Touch', flower: 'The drawbridge flower', treat: 'A treat' }
} as const;
type Element = Kind | 'friandise';
/** The level where each element shows up for the first time: there Lumi explains it. */
const debut = new Map<Element, number>();
for (const l of levels) for (const e of [...gates(l).map(g => g.kind as Element), ...treats(l).length ? ['friandise' as const] : []]) if (!debut.has(e)) debut.set(e, l.id);
/** What Lumi says when a level opens: its title, then the new element, the reminder to try the pictures, or the walk. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = [...debut].find(([, id]) => id === level.id)?.[0];
    const words: string[] = [level.title[locale]];
    if (level.id === 1) words.push(t.start);
    if (fresh) words.push(t.intro[fresh]);
    else if (offered(level).length > 1 && level.id <= 12) words.push(t.mixed);
    return words;
}
export const wonWords = (level: LevelDef, locale: Locale): string => level.friend ? labels[locale].wonFriend : labels[locale].won;
/** A foal walking towards a rainbow: the home card and the level guide. */
export const pictogram = svg(`<path d="M2 58H62" stroke="#7cc860" stroke-width="5" stroke-linecap="round"/>${rainbowDoor(0, 0).replace('<g data-door>', '<g transform="translate(50 57) scale(.36)">')}<g transform="translate(22 57) scale(.5)">${foal(COATS[0], 'promenade-card')}</g>`);
interface Palette { sky: [string, string]; top: string; earth: string; deco: string }
const palette: Record<Theme, Palette> = {
    prairie: { sky: ['#bfe6ff', '#eef9ff'], top: '#7cc860', earth: '#b98552', deco: '#f789b6' },
    plage: { sky: ['#a9e0f7', '#fff3d6'], top: '#f2d58f', earth: '#d9ad6a', deco: '#ffffff' },
    neige: { sky: ['#cfe3f5', '#f7fbff'], top: '#ffffff', earth: '#9fb6cc', deco: '#83cbea' },
    automne: { sky: ['#ffd9ae', '#fff3e3'], top: '#e9a646', earth: '#9a6a45', deco: '#e8603c' },
    foret: { sky: ['#c9ecd2', '#f1fbef'], top: '#4fa85a', earth: '#8a6343', deco: '#ffe381' },
    montagne: { sky: ['#b7d3f2', '#eef4ff'], top: '#9cc77c', earth: '#9d8f86', deco: '#ffffff' },
    nuit: { sky: ['#27305e', '#4a4f8c'], top: '#5f8f6a', earth: '#5d4a52', deco: '#fff27a' },
    pluie: { sky: ['#a8b8c8', '#dfe8ef'], top: '#78b86a', earth: '#8c6a4c', deco: '#83cbea' }
};
const treatKind = (theme: Theme): 'fraise' | 'pomme' | 'etoile' => theme === 'automne' ? 'pomme' : theme === 'nuit' ? 'etoile' : 'fraise';
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="promenade"><header class="shapes-header"><button id="back" class="round" aria-label="${t.home}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-promenade-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b>${dots(Math.max(1, gates(l).length))}<span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
const U = 100;
export const fieldSize = (level: LevelDef): { width: number; height: number } => ({ width: width(level) * U, height: level.floors.length * BAND * U });
/** Progress of the work on gate k, from 0 to 1: what is drawn of the bridge, the tunnel, the boat crossing… */
const built = (s: State, k: number): number => { if (k < 0) return 0; if (s.cleared[k]) return 1; const w = s.works.find(x => x.gate === k); return w ? 1 - w.left / WORK_TICKS : 0; };
const surfaceOf = (level: LevelDef, k: number): number => { const spot = path(level)[k]!; return spot.floor * BAND * U + (spot.high ? U : 2 * U); };
const centre = (level: LevelDef, k: number): number => path(level)[k]!.col * U + U / 2;
const dirOf = (level: LevelDef, k: number): 1 | -1 => path(level)[k]!.floor % 2 === 0 ? 1 : -1;
function bricks(x: number, top: number, bottom: number): string {
    let d = '';
    for (let y = top + 24; y < bottom; y += 24) d += `M${x} ${y}h76`;
    for (let y = top, row = 0; y < bottom; y += 24, row++) for (let bx = x + (row % 2 ? 19 : 38); bx < x + 76; bx += 38) d += `M${bx} ${y}v${Math.min(24, bottom - y)}`;
    return `<path d="${d}" stroke="#8f7c6c" stroke-width="3"/>`;
}
/** The way down to the next floor: a winding slide, so that going down is a game and never a fall. */
function slide(x: number, top: number, bottom: number, opacity = 1): string {
    const h = bottom - top, d = `M${x + 50} ${top}C${x + 100} ${top + h * .25} ${x} ${top + h * .45} ${x + 50} ${top + h * .62}S${x + 92} ${top + h * .9} ${x + 50} ${bottom}`;
    return `<g data-slide opacity="${opacity.toFixed(2)}"><path d="${d}" fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#f789b6" stroke-width="20" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ffe381" stroke-width="5" stroke-linecap="round"/></g>`;
}
/** A little scenery in the air of each floor, never where the foals walk. */
function sky(theme: Theme, f: number, Y: number, w: number): string {
    const cloud = (x: number, y: number, c = '#ffffff') => `<path d="M${x} ${y}a16 16 0 0 1 28 -10a20 20 0 0 1 36 4a14 14 0 0 1 4 26h-64a12 12 0 0 1 -4 -20Z" fill="${c}" opacity=".85"/>`;
    switch (theme) {
        case 'neige': return [70, 260, 470].map((x, i) => `<circle cx="${x + f * 37}" cy="${Y + 26 + (i % 2) * 20}" r="5" fill="#ffffff" stroke="#b9d3ea" stroke-width="2"/>`).join('');
        case 'nuit': return (f === 0 ? `<circle cx="${w - 70}" cy="${Y + 46}" r="24" fill="#fff6c8"/><circle cx="${w - 60}" cy="${Y + 40}" r="22" fill="${palette.nuit.sky[0]}"/>` : '') + [40, 190, 330, 450].map((x, i) => `<path d="M${x + f * 29} ${Y + 22 + (i % 2) * 26}l3 7l7 1l-5 5l1 7l-6 -3l-6 3l1 -7l-5 -5l7 -1Z" fill="#fff27a"/>`).join('');
        case 'pluie': return cloud(120 + f * 140, Y + 36, '#eef2f6') + Array.from({ length: 9 }, (_, i) => `<path d="M${30 + i * 66 + f * 11} ${Y + 70 + (i % 3) * 22}l-6 16" stroke="#6f9fc8" stroke-width="3" stroke-linecap="round" opacity=".7"/>`).join('');
        case 'foret': return [30, 250, 510].map((x, i) => `<path d="M${x + f * 40} ${Y + 2 * U}l34 -${120 + i * 10}l34 ${120 + i * 10}Z" fill="#9ccf97" opacity=".55"/>`).join('');
        case 'montagne': return `<path d="M${-20 + f * 60} ${Y + 2 * U}L${120 + f * 60} ${Y + 40}L${260 + f * 60} ${Y + 2 * U}Z" fill="#c5d2e6" opacity=".7"/><path d="M${92 + f * 60} ${Y + 70}L${120 + f * 60} ${Y + 40}L${148 + f * 60} ${Y + 70}Z" fill="#ffffff"/>${cloud(w - 200, Y + 36)}`;
        default: return cloud(Math.min(w - 120, 380) - f * 150, Y + 40);
    }
}
/** The scenery, obstacles and what the foals and the scenery did so far. Foals are drawn on top by `foalsSvg`. */
/** The scenery, obstacles and what the foals and the scenery did so far: `back` under the foals, `front` over them (the
 * things the child touches, so that no foal ever hides them). */
export function terrainSvg(s: State, layer: 'back' | 'front' = 'back'): string {
    const level = levelOf(s.level), p = palette[level.theme], spots = path(level), list = gates(level), { width: W } = fieldSize(level), w = width(level);
    const parts: string[] = [`<defs><linearGradient id="promenade-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>`];
    const after: string[] = [], front: string[] = [];
    const gateAt = (k: number, kind: Kind): number => list.findIndex(g => g.at === k && g.kind === kind);
    for (let f = 0; f < level.floors.length; f++) {
        const Y = f * BAND * U, floor = level.floors[f]!;
        parts.push(`<rect x="0" y="${Y}" width="${W}" height="${2 * U}" fill="url(#promenade-sky)"/>`, sky(level.theme, f, Y, W));
        for (let i = 0; i < w; i++) {
            const k = f * w + i, spot = spots[k]!, x = spot.col * U, cx = x + U / 2, surface = surfaceOf(level, k), dir = dirOf(level, k), bottom = Y + 3 * U;
            if (i === w - 1 && floor.end !== 'door') {
                const down = surfaceOf(level, k + 1), dig = gateAt(k, 'trou');
                if (floor.end === 'dig' && built(s, dig) < 1) parts.push(`<g data-soft><rect x="${x}" y="${surface}" width="${U}" height="${bottom - surface}" fill="#d9a874" stroke="${INK}" stroke-width="3"/>${[[20, 30], [55, 22], [75, 52], [35, 64]].map(([dx, dy]) => `<circle cx="${x + dx!}" cy="${surface + dy! * (bottom - surface) / 90}" r="5" fill="#a9774b"/>`).join('')}<path d="M${x + 40} ${surface + 8}l20 18M${x + 60} ${surface + 8}l-20 18" stroke="#fff6d6" stroke-width="5" stroke-linecap="round"/></g>`);
                const way = floor.end === 'stairs' ? 1 : built(s, dig);
                if (way > 0) parts.push(`<path data-hole d="M${x} ${surface}h${U}v${bottom - surface}h-${U}Z" fill="#5e4636" opacity="${way.toFixed(2)}"/><path d="M${x} ${surface}h${U}" stroke="${p.top}" stroke-width="10" opacity="${way.toFixed(2)}"/>`);
                if (way > 0) after.push(slide(x, surface - 10, down, way));
                continue;
            }
            const ground = (): void => { parts.push(`<rect x="${x}" y="${surface}" width="${U}" height="${bottom - surface}" fill="${p.earth}"/><rect x="${x}" y="${surface}" width="${U}" height="16" fill="${p.top}"/><path d="M${x} ${surface + 16}h${U}" stroke="${INK}" stroke-width="2" opacity=".35"/>`); };
            const pit = (water: string): void => { parts.push(`<rect x="${x}" y="${surface}" width="${U}" height="${bottom - surface}" fill="#5e4636"/><rect x="${x}" y="${bottom - 34}" width="${U}" height="34" fill="${water}"/><path d="M${x + 10} ${bottom - 22}q10 -8 20 0t20 0t20 0t20 0" fill="none" stroke="#ffffff" stroke-width="3"/>`); };
            switch (spot.cell) {
                case 'G': {
                    pit('#6fc3ef');
                    const b = built(s, gateAt(k - 1, 'pont'));
                    if (b > 0) after.push(`<g data-bridge opacity="${b.toFixed(2)}"><path d="M${x - 6} ${surface}h${U + 12}v16h-${U + 12}Z" fill="#c98a4f" stroke="${INK}" stroke-width="3"/><path d="M${x + 25} ${surface}v16M${x + 50} ${surface}v16M${x + 75} ${surface}v16" stroke="${INK}" stroke-width="2"/></g>`);
                    continue;
                }
                case '~': {
                    parts.push(`<g data-water><rect x="${x}" y="${surface + 14}" width="${U}" height="${bottom - surface - 14}" fill="#5bb6e8"/><path d="M${x} ${surface + 14}q12 -8 25 0t25 0t25 0t25 0" fill="none" stroke="#ffffff" stroke-width="4"/><path d="M${x + 30} ${surface + 50}q8 -6 16 0" fill="none" stroke="#ffffff" stroke-width="3" opacity=".7"/></g>`);
                    const b = built(s, gateAt(k - 1, 'bateau'));
                    after.push(`<g transform="translate(${(cx - dir * 34 * (1 - b)).toFixed(1)} ${surface + 14})">${leafBoat()}</g>`);
                    continue;
                }
                case 'D': {
                    pit('#4f8fb8');
                    const b = built(s, gateAt(k - 1, 'pontlevis')), hinge = cx + dir * 50, angle = (1 - b) * Math.PI / 2;
                    const ex = hinge - dir * 100 * Math.cos(angle), ey = surface - 100 * Math.sin(angle);
                    after.push(`<g data-drawbridge="${b >= 1 ? 'down' : 'up'}"><path d="M${hinge} ${surface}V${surface - 120}h${dir * 18}V${surface}Z" fill="#b9b2c9" stroke="${INK}" stroke-width="3"/><path d="M${hinge + dir * 9} ${surface - 112}L${ex.toFixed(1)} ${(ey - 6).toFixed(1)}" stroke="#7a7280" stroke-width="3" stroke-dasharray="6 4"/><path d="M${hinge} ${surface}L${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${INK}" stroke-width="20" stroke-linecap="round"/><path d="M${hinge} ${surface}L${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="#c98a4f" stroke-width="14" stroke-linecap="round"/></g>`);
                    continue;
                }
            }
            ground();
            if ((spot.col + f) % 3 === 1 && '.M'.includes(spot.cell)) parts.push(`<circle cx="${x + 30}" cy="${surface + 34}" r="5" fill="${p.deco}" opacity=".8"/><circle cx="${x + 70}" cy="${surface + 52}" r="4" fill="${p.deco}" opacity=".6"/>`);
            switch (spot.cell) {
                case 'W': {
                    const b = built(s, gateAt(k - 1, 'tunnel'));
                    parts.push(`<g data-wall><rect x="${x + 12}" y="${Y + 4}" width="76" height="${surface - Y - 4}" rx="6" fill="#d3c3b1" stroke="${INK}" stroke-width="4"/>${bricks(x + 12, Y + 4, surface)}</g>`);
                    if (b > 0) after.push(`<path data-tunnel d="M${x + 12} ${surface}V${surface - 70}Q${x + 50} ${surface - 112} ${x + 88} ${surface - 70}V${surface}Z" fill="#4a3442" stroke="${INK}" stroke-width="4" opacity="${b.toFixed(2)}"/>`);
                    break;
                }
                case 'C': {
                    const top = surface - (spot.high ? 62 : 88);
                    parts.push(`<path data-rock d="M${x + 4} ${surface}V${top + 30}Q${x + 6} ${top + 2} ${cx} ${top}Q${x + 94} ${top + 2} ${x + 96} ${top + 30}V${surface}Z" fill="#a7a3b5" stroke="${INK}" stroke-width="4"/><path d="M${x + 24} ${top + 36}l14 12M${x + 64} ${top + 52}l-12 10" stroke="#7d7890" stroke-width="4" stroke-linecap="round"/><path d="M${x + 22} ${top + 10}Q${cx} ${top - 6} ${x + 78} ${top + 10}" stroke="${p.top}" stroke-width="8" fill="none" stroke-linecap="round"/>`);
                    break;
                }
                case 'P': parts.push(`<ellipse data-puddle cx="${cx}" cy="${surface + 4}" rx="38" ry="9" fill="#7fc4ec" stroke="${INK}" stroke-width="2.5"/><path d="M${cx - 18} ${surface + 3}h12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`); break;
                case 'L': parts.push(`<g data-leaves>${[[-30, '#e8603c'], [-12, '#ffb347'], [8, '#d94f30'], [26, '#f2a03d'], [-20, '#ffcf5a'], [16, '#e8603c']].map(([dx, c], j) => `<ellipse cx="${cx + (dx as number)}" cy="${surface - 6 - (j > 3 ? 12 : 0)}" rx="14" ry="8" transform="rotate(${j * 37} ${cx + (dx as number)} ${surface - 6})" fill="${c as string}" stroke="${INK}" stroke-width="2"/>`).join('')}</g>`); break;
                case 'M': {
                    const g = gateAt(k, 'champignon'), b = built(s, g);
                    front.push(`<g transform="translate(${cx + dir * 30} ${surface})">${mushroomSvg(b > 0 && b < 1 ? b : 0, b > 0)}</g>`);
                    break;
                }
                case 'B': {
                    const b = built(s, gateAt(k - 1, 'ours'));
                    after.push(b < .5 ? `<g transform="translate(${cx} ${surface}) scale(${dir} 1)">${bearSvg(b)}</g>` : `<g transform="translate(${cx + dir * 34} ${surface - 2}) scale(.95)">${bearSvg(b)}</g>`);
                    break;
                }
                case 'F': {
                    if (s.friend || !level.friend) break;
                    const b = built(s, gateAt(k - 1, 'ami'));
                    after.push(`<g transform="translate(${cx} ${surface - b * 30 * Math.sin(b * Math.PI)}) scale(${-dir * 1.25} 1.25)">${friendSvg(level.friend, b > 0)}</g>`);
                    break;
                }
            }
            // What waits before a gate on this cell: the jar before the cave, the balloons before the rock.
            const next = spots[k + 1];
            if (next && next.floor === f && next.cell === 'n' && spot.cell !== 'n') front.push(`<g transform="translate(${cx + dir * 30} ${surface})">${jarSvg(built(s, gateAt(k, 'lucioles')) > 0)}</g>`);
            if (next && next.floor === f && next.cell === 'C') front.push(`<g transform="translate(${cx + dir * 32} ${surface})">${balloonsSvg(built(s, gateAt(k, 'ballon')))}</g>`);
            if (level.button === k) { const g = list.findIndex(x2 => x2.kind === 'pontlevis'); front.push(`<g transform="translate(${cx} ${surface})">${flowerSvg(built(s, g) > 0)}</g>`); }
        }
        // A dark cave over the run of `n` cells, until the fireflies light it up.
        const run = floor.cells.split('').flatMap((c, i) => c === 'n' ? [f * w + i] : []);
        if (run.length) {
            const xs = run.map(k => spots[k]!.col * U), x0 = Math.min(...xs), x1 = Math.max(...xs) + U, top = Math.min(...run.map(k => surfaceOf(level, k))), light = built(s, gateAt(run[0]! - 1, 'lucioles'));
            after.push(`<g data-cave="${light >= 1 ? 'lit' : 'dark'}"><path d="M${x0} ${top}V${top - 150}Q${(x0 + x1) / 2} ${top - 200} ${x1} ${top - 150}V${top}" fill="none" stroke="#7d7890" stroke-width="16"/><path d="M${x0 + 6} ${top}V${top - 146}Q${(x0 + x1) / 2} ${top - 192} ${x1 - 6} ${top - 146}V${top}Z" fill="#1d1630" opacity="${(0.92 - light * 0.8).toFixed(2)}"/>${light > 0 ? Array.from({ length: run.length * 3 }, (_, j) => `<circle cx="${x0 + 20 + (j * 37) % (x1 - x0 - 30)}" cy="${top - 30 - (j * 53) % 110}" r="5" fill="#fff27a" opacity="${light.toFixed(2)}"/><circle cx="${x0 + 20 + (j * 37) % (x1 - x0 - 30)}" cy="${top - 30 - (j * 53) % 110}" r="11" fill="#fff27a" opacity="${(light * .3).toFixed(2)}"/>`).join('') : ''}</g>`);
        }
        // The rainbow arch of a fork, with its treats.
        if (floor.arch) {
            const a = f * w + floor.arch[0], b = f * w + floor.arch[1], xa = centre(level, a), xb = centre(level, b), ya = surfaceOf(level, a), peak = ya - 105;
            const arcs = ['#f789b6', '#ffc167', '#ffe381', '#80d6b0', '#83cbea'].map((c, j) => `<path d="M${xa} ${ya - j * 4}Q${(xa + xb) / 2} ${2 * peak - ya - j * 4} ${xb} ${ya - j * 4}" fill="none" stroke="${c}" stroke-width="5"/>`).join('');
            after.push(`<g data-arch>${arcs}</g>`);
        }
    }
    // Ladders lean against each high step that got one.
    for (const [k, o] of list.entries()) if (o.kind === 'echelle' && built(s, k) > 0) {
        const a = spots[o.at]!, b = spots[o.at + 1]!, Y = a.floor * BAND * U, edge = (a.col < b.col ? b.col : b.col + 1) * U, toward = a.col < b.col ? -1 : 1;
        const foot = edge + toward * 44, rungs = [0.2, 0.4, 0.6, 0.8].map(t => { const yy = Y + 2 * U - t * U * 1.05, xx = foot + (edge - foot) * t; return `M${xx - 14} ${yy}h28`; }).join('');
        after.push(`<g data-ladder opacity="${built(s, k).toFixed(2)}"><path d="M${foot - 14} ${Y + 2 * U}L${edge - 14} ${Y + U - 8}M${foot + 14} ${Y + 2 * U}L${edge + 14} ${Y + U - 8}${rungs}" stroke="#d58a3d" stroke-width="7" stroke-linecap="round"/></g>`);
    }
    const kind = treatKind(level.theme);
    for (const i of treats(level).keys()) if (!s.picked[i]) { const at = treatSpot(level, i); front.push(`<g data-treat-picture="${i}" transform="translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) scale(1.4)">${treatSvg(kind)}</g>`); }
    if (treats(level).length) front.push(basketSvg(W - 56, level.floors.length * BAND * U - 30, s.picked.filter(Boolean).length, kind));
    const first = spots[0]!, last = spots.at(-1)!;
    after.push(trapdoor(first.col * U + U / 2, s.started), rainbowDoor(last.col * U + U / 2, surfaceOf(level, spots.length - 1), s.foals.filter(f => f.home).length));
    return layer === 'front' ? front.join('') : parts.join('') + after.join('');
}
/** Where treat i floats, in field units. */
export function treatSpot(level: LevelDef, i: number): { x: number; y: number } {
    const t = treats(level)[i]!, w = width(level), f = Math.floor(t.at / w), Y = f * BAND * U;
    if (!t.arch) { const k = Math.round(t.at); return { x: centre(level, k), y: Y + (path(level)[k]!.high ? 34 : 58) }; }
    const arch = level.floors[f]!.arch!, a = f * w + arch[0], b = f * w + arch[1], u = (t.at - a) / (b - a), xa = centre(level, a), xb = centre(level, b), ya = surfaceOf(level, a);
    // On the quadratic arch drawn in terrainSvg (control point at twice the peak height).
    return { x: xa + (xb - xa) * u, y: ya - 2 * u * (1 - u) * 210 - 26 };
}
/** Where a foal is drawn and which way it looks; null while it is in the trapdoor or through the door. */
export function foalPlace(s: State, i: number, reduce: boolean): { x: number; y: number; dir: 1 | -1; rot: number; lift: string } | null {
    const f = s.foals[i]!;
    if (!f.out || f.home) return null;
    const level = levelOf(s.level), at = feet(level, f.pos, s.ways);
    const leader = s.foals.findIndex(o => o.out && !o.home) === i;
    // A soft bounce while walking; the funny try moves the first foal; nothing of either with reduced motion.
    const bob = reduce || f.pos % SUB === 0 ? 0 : -Math.abs(Math.sin(f.pos * Math.PI / 4)) * 6;
    let dx = 0, dy = 0, rot = 0;
    if (leader && s.fail && !reduce) {
        const name = failOf(gates(level)[s.fail.gate]!.kind as Role, s.fail.role)!, pose = failPose(name, 1 - s.fail.left / FAIL_TICKS);
        dx = pose.dx * at.dir; dy = pose.dy; rot = pose.rot;
    }
    return { x: at.x * U + dx, y: at.y * U + bob + dy, dir: at.dir, rot, lift: at.lift };
}
const GEAR: Record<string, string> = {
    balloon: balloonUp(),
    splash: `<path d="M-30 -4q-6 -12 -14 -14M30 -4q6 -12 14 -14M-18 -2q-2 -14 -6 -20M18 -2q2 -14 6 -20" stroke="#6fc3ef" stroke-width="4" stroke-linecap="round" fill="none"/>`,
    leaves: `<ellipse cx="-30" cy="-30" rx="10" ry="6" fill="#e8603c" transform="rotate(30 -30 -30)"/><ellipse cx="34" cy="-40" rx="10" ry="6" fill="#ffb347" transform="rotate(-20 34 -40)"/><ellipse cx="-4" cy="-60" rx="9" ry="5" fill="#d94f30"/>`
};
export function foalsSvg(level: LevelDef): string {
    const friend = level.friend ? `<g data-friend style="display:none"><g transform="scale(1.2)">${friendSvg(level.friend, true)}</g></g>` : '';
    return `<g data-foals>${friend}${COATS.map((coat, i) => `<g data-foal="${i}" style="display:none"><g data-gear></g><g data-face>${foal(coat, `promenade-coat-${i}`)}</g></g>`).join('')}<g data-fail-layer></g><g data-front></g><g data-bubble style="display:none"><circle cx="0" cy="0" r="38" fill="#fffdf5" stroke="${INK}" stroke-width="4"/><g data-bubble-picture transform="translate(-26 -26) scale(.82)"></g></g></g>`;
}
export function fieldSvg(s: State, locale: Locale): string {
    const level = levelOf(s.level), { width: W, height } = fieldSize(level);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="${labels[locale].field}"><g data-terrain>${terrainSvg(s)}</g>${foalsSvg(level).replace('<g data-front></g>', `<g data-front>${terrainSvg(s, 'front')}</g>`)}</svg>`;
}
/** Moves the foals, the friend, the funny try and the work bubble without rebuilding the scenery. */
export function placeFoals(root: ParentNode, s: State, reduce: boolean): void {
    const level = levelOf(s.level);
    for (let i = 0; i < s.foals.length; i++) {
        const g = root.querySelector<SVGGElement>(`[data-foal="${i}"]`), at = foalPlace(s, i, reduce);
        if (!g) continue;
        if (!at) { g.style.display = 'none'; continue; }
        g.style.display = '';
        g.setAttribute('transform', `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) scale(${at.dir} 1) rotate(${at.rot.toFixed(1)})`);
        const gear = g.querySelector('[data-gear]')!, want = GEAR[at.lift] ?? '';
        if (gear.getAttribute('data-lift') !== at.lift) { gear.setAttribute('data-lift', at.lift); gear.innerHTML = at.lift === 'balloon' ? `<g transform="translate(-8 -50) scale(.8)">${balloonUp(['#ff7a9c', '#ffd84d', '#83cbea', '#b39beb', '#80d6b0'][i])}</g>` : want; }
    }
    const fr = root.querySelector<SVGGElement>('[data-friend]');
    if (fr) {
        if (!s.friend || s.friend.home) fr.style.display = 'none';
        else { const at = feet(level, s.friend.pos, s.ways); fr.style.display = ''; fr.setAttribute('transform', `translate(${(at.x * U).toFixed(1)} ${(at.y * U).toFixed(1)}) scale(${at.dir} 1)`); }
    }
    const layer = root.querySelector('[data-fail-layer]'), leader = s.foals.findIndex(o => o.out && !o.home);
    if (layer) {
        if (s.fail && leader >= 0) {
            const at = feet(level, s.foals[leader]!.pos, s.ways), name = failOf(gates(level)[s.fail.gate]!.kind as Role, s.fail.role)!;
            layer.innerHTML = failSvg(name, reduce ? .5 : 1 - s.fail.left / FAIL_TICKS, at.x * U, at.y * U, at.dir);
        } else if (layer.innerHTML) layer.innerHTML = '';
    }
    const bubble = root.querySelector<SVGGElement>('[data-bubble]'), lead = leader >= 0 ? s.foals[leader]!.pos : -1;
    const work = s.works.find(x => { const g = gates(level)[x.gate]!; return isRole(g.kind) && g.at * SUB === lead; });
    if (!bubble) return;
    const at = work && leader >= 0 ? foalPlace(s, leader, reduce) : null;
    if (!at || !work) { bubble.style.display = 'none'; return; }
    bubble.style.display = '';
    bubble.setAttribute('transform', `translate(${at.x.toFixed(1)} ${(at.y - 140).toFixed(1)})`);
    const role = gates(level)[work.gate]!.kind, pic = bubble.querySelector('[data-bubble-picture]')!;
    if (pic.getAttribute('data-bubble-role') !== role) { pic.setAttribute('data-bubble-role', role); pic.innerHTML = rolePicture(role as Role); }
}
const percent = (level: LevelDef, x: number, y: number): { left: number; top: number } => { const { width: W, height } = fieldSize(level); return { left: x / W * 100, top: y / height * 100 }; };
/** Centre of the waiting foal, in percent of the field: where its big touch zone goes (a job to give, or straight on at a fork). */
export function touchSpot(s: State): { left: number; top: number } | null {
    const w = waiting(s);
    if (w === null) return null;
    const level = levelOf(s.level), kind = gates(level)[w]!.kind;
    if (!isRole(kind) && kind !== 'fourche') return null;
    const leader = s.foals.find(f => f.out && !f.home)!, at = feet(level, leader.pos, s.ways);
    return percent(level, at.x * U, at.y * U - 42);
}
/** The scenery thing the troupe waits at, in percent of the field. */
export function thingSpot(s: State): { left: number; top: number } | null {
    const w = waiting(s);
    if (w === null) return null;
    const level = levelOf(s.level), g = gates(level)[w]!, dir = dirOf(level, g.at), here = centre(level, g.at), there = centre(level, g.at + 1), y = surfaceOf(level, g.at), y2 = surfaceOf(level, g.at + 1);
    switch (g.kind) {
        case 'ami': case 'ours': return percent(level, there, y2 - 40);
        case 'bateau': return percent(level, there - dir * 34, y2 + 6);
        case 'lucioles': return percent(level, here + dir * 28, y - 30);
        case 'ballon': return percent(level, here + dir * 30, y - 84);
        case 'champignon': return percent(level, here + dir * 26, y - 34);
        case 'fourche': { const f = path(level)[g.at]!.floor, arch = level.floors[f]!.arch!, ww = width(level), xb = centre(level, f * ww + arch[1]); return percent(level, (here + xb) / 2, y - 100); }
        default: return null;
    }
}
export function flowerSpot(s: State): { left: number; top: number } | null {
    const level = levelOf(s.level);
    if (level.button === undefined) return null;
    return percent(level, centre(level, level.button), surfaceOf(level, level.button) - 56);
}
export function treatPercent(s: State, i: number): { left: number; top: number } { const level = levelOf(s.level), at = treatSpot(level, i); return percent(level, at.x, at.y); }
export function trapSpot(s: State): { left: number; top: number } {
    const level = levelOf(s.level), first = path(level)[0]!;
    return percent(level, first.col * U + U / 2, 52);
}
export function roleButtons(level: LevelDef, locale: Locale): string {
    const t = labels[locale];
    return `<div class="promenade-roles" role="group" aria-label="${t.roles}">${offered(level).map((r: Role) => `<button data-role="${r}" aria-label="${t.role[r]}" disabled>${svg(rolePicture(r))}</button>`).join('')}</div>`;
}
export function gameView(s: State, locale: Locale, message: string): string {
    const t = labels[locale], level = levelOf(s.level), won = stars(s), rows = level.floors.length * BAND, cols = width(level);
    const finish = s.finished ? `<div class="promenade-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="promenade-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="promenade-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    const sweets = treats(level).flatMap((tr, i) => tr.arch ? [] : [`<button class="promenade-touch promenade-treat" data-treat="${i}" aria-label="${t.treat}" hidden></button>`]).join('');
    return `<section class="promenade"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="promenade-instruction"><div id="guide">${characterSvg('licorne', s.finished ? 'celebration' : 'joie', 'repos', 'reduce')}</div><p id="promenade-message" aria-live="polite">${message}</p></div>`
        + `<div class="promenade-zone" style="aspect-ratio:${cols}/${rows};--rows:${rows};--cols:${cols}"><div class="promenade-field">${fieldSvg(s, locale)}</div>${sweets}<button id="promenade-start" class="promenade-touch" aria-label="${t.trap}" hidden></button><button id="promenade-flower" class="promenade-touch" aria-label="${t.flower}" hidden></button><button id="promenade-thing" class="promenade-touch" aria-label="${t.thing}" hidden></button><button id="promenade-foal" class="promenade-touch" aria-label="${t.foal}" hidden></button>${rows > BAND ? finish : ''}</div>`
        // A one-floor walk leaves room below the field: the reward goes there instead of over the scenery.
        + (s.finished ? (rows > BAND ? '' : finish) : roleButtons(level, locale)) + '</section>';
}
