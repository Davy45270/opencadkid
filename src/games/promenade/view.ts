import { characterSvg } from '../../characters/svg';
import { BAND, COLS, feet, isUnlocked, levelOf, levels, obstacles, offered, path, stars, SUB, waiting, WORK_TICKS, type LevelDef, type Records, type Role, type State, type Theme } from '../../engines/promenade';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { dots, icon, svg } from '../../ui/svg';
import { COATS, foal, INK, rainbowDoor, rolePicture, trapdoor } from './art';

export const labels = {
    fr: { title: 'La promenade de Lumi', levels: 'Choisis un niveau', start: 'Touche la trappe : les petits de Lumi vont marcher jusqu’à la porte arc-en-ciel.',
        intro: { pont: 'Un fossé ! Touche le petit qui attend : il construit un pont.', tunnel: 'Un mur ! Touche le petit qui attend : il creuse un tunnel.', trou: 'Pour descendre, touche le petit qui attend : il creuse un trou.', echelle: 'Une marche trop haute ! Touche le petit qui attend : il pose une échelle.' },
        mixed: 'Quand un petit attend, touche-le, puis choisis la bonne image.', waiting: 'Un petit attend : touche-le !', choose: 'Que doit-il faire ?', good: 'Bravo !',
        say: { pont: 'Fais un pont !', tunnel: 'Creuse un tunnel !', trou: 'Creuse un trou !', echelle: 'Pose une échelle !' }, role: { pont: 'Pont', tunnel: 'Tunnel', trou: 'Trou', echelle: 'Échelle' },
        won: 'Bravo ! Les cinq petits sont arrivés !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', home: 'Accueil', field: 'Le chemin des petits de Lumi', level: 'Niveau', foal: 'Le petit qui attend', trap: 'Ouvrir la trappe', roles: 'Ce que le petit peut faire' },
    en: { title: 'Lumi’s walk', levels: 'Choose a level', start: 'Touch the trapdoor: Lumi’s little ones will walk to the rainbow door.',
        intro: { pont: 'A ditch! Touch the little one who waits: it builds a bridge.', tunnel: 'A wall! Touch the little one who waits: it digs a tunnel.', trou: 'To go down, touch the little one who waits: it digs a hole.', echelle: 'A step too high! Touch the little one who waits: it sets up a ladder.' },
        mixed: 'When a little one waits, touch it, then choose the right picture.', waiting: 'A little one is waiting: touch it!', choose: 'What should it do?', good: 'Well done!',
        say: { pont: 'Build a bridge!', tunnel: 'Dig a tunnel!', trou: 'Dig a hole!', echelle: 'Set up a ladder!' }, role: { pont: 'Bridge', tunnel: 'Tunnel', trou: 'Hole', echelle: 'Ladder' },
        won: 'Well done! All five little ones made it!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', home: 'Home', field: 'The path of Lumi’s little ones', level: 'Level', foal: 'The little one who waits', trap: 'Open the trapdoor', roles: 'What the little one can do' }
} as const;
/** What Lumi says when a level opens: the walk, then the new job or the reminder to choose. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], roleList = offered(level);
    return roleList.length === 0 ? [t.start] : roleList.length === 1 && level.id <= 5 ? [t.start, t.intro[roleList[0]!]] : roleList.length === 1 ? [t.start, t.waiting] : [t.start, t.mixed];
}
/** A foal walking towards a rainbow: the home card and the level guide. */
export const pictogram = svg(`<path d="M2 58H62" stroke="#7cc860" stroke-width="5" stroke-linecap="round"/>${rainbowDoor(0, 0).replace('<g data-door>', '<g transform="translate(50 57) scale(.36)">')}<g transform="translate(22 57) scale(.5)">${foal(COATS[0], 'promenade-card')}</g>`);
const palette: Record<Theme, { sky: [string, string]; top: string; earth: string; deco: string }> = {
    prairie: { sky: ['#bfe6ff', '#eef9ff'], top: '#7cc860', earth: '#b98552', deco: '#f789b6' },
    plage: { sky: ['#a9e0f7', '#fff3d6'], top: '#f2d58f', earth: '#d9ad6a', deco: '#ffffff' },
    neige: { sky: ['#cfe3f5', '#f7fbff'], top: '#ffffff', earth: '#9fb6cc', deco: '#83cbea' },
    automne: { sky: ['#ffd9ae', '#fff3e3'], top: '#e9a646', earth: '#9a6a45', deco: '#e8603c' }
};
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="promenade"><header class="shapes-header"><button id="back" class="round" aria-label="${t.home}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-promenade-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b>${dots(Math.max(1, obstacles(l).length))}<span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
const U = 100;
export const fieldSize = (level: LevelDef): { width: number; height: number } => ({ width: COLS * U, height: level.floors.length * BAND * U });
/** Progress of the work on obstacle k, from 0 to 1: what is drawn of the bridge, tunnel, hole or ladder. */
const built = (s: State, k: number): number => s.cleared[k] ? 1 : s.work?.obstacle === k ? 1 - s.work.left / WORK_TICKS : 0;
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
/** The scenery, obstacles and what the foals built so far. Foals are drawn on top by `foalsSvg`. */
export function terrainSvg(s: State): string {
    const level = levelOf(s.level), p = palette[level.theme], spots = path(level), list = obstacles(level), { width } = fieldSize(level);
    const parts: string[] = [`<defs><linearGradient id="promenade-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>`];
    const after: string[] = [];
    for (let f = 0; f < level.floors.length; f++) {
        const Y = f * BAND * U;
        parts.push(`<rect x="0" y="${Y}" width="${width}" height="${2 * U}" fill="url(#promenade-sky)"/>`);
        // A little scenery in the air: clouds, or flakes in the snow, never where the foals walk.
        parts.push(level.theme === 'neige' ? [70, 260, 470].map((x, i) => `<circle cx="${x + f * 37}" cy="${Y + 26 + (i % 2) * 20}" r="5" fill="#ffffff" stroke="#b9d3ea" stroke-width="2"/>`).join('') : `<path d="M${380 - f * 150} ${Y + 40}a16 16 0 0 1 28 -10a20 20 0 0 1 36 4a14 14 0 0 1 4 26h-64a12 12 0 0 1 -4 -20Z" fill="#ffffff" opacity=".85"/>`);
        for (let c = 0; c < COLS; c++) {
            const i = f % 2 === 0 ? c : COLS - 1 - c, k = f * COLS + i, spot = spots[k]!, x = c * U, surface = Y + (spot.high ? U : 2 * U);
            const guard = list.findIndex(o => o.at === k - 1 && o.role !== 'echelle'), floor = level.floors[f]!;
            if (i === COLS - 1 && floor.end !== 'door') {
                const down = (f + 1) * BAND * U + (spots[k + 1]!.high ? U : 2 * U), dig = list.findIndex(o => o.at === k);
                if (floor.end === 'dig' && built(s, dig) < 1) parts.push(`<g data-soft><rect x="${x}" y="${surface}" width="${U}" height="${Y + 3 * U - surface}" fill="#d9a874" stroke="${INK}" stroke-width="3"/>${[[20, 30], [55, 22], [75, 52], [35, 64]].map(([dx, dy]) => `<circle cx="${x + dx!}" cy="${surface + dy! * (Y + 3 * U - surface) / 90}" r="5" fill="#a9774b"/>`).join('')}<path d="M${x + 40} ${surface + 8}l20 18M${x + 60} ${surface + 8}l-20 18" stroke="#fff6d6" stroke-width="5" stroke-linecap="round"/></g>`);
                const way = floor.end === 'stairs' ? 1 : built(s, dig);
                if (way > 0) parts.push(`<path data-hole d="M${x} ${surface}h${U}v${Y + 3 * U - surface}h-${U}Z" fill="#5e4636" opacity="${way.toFixed(2)}"/><path d="M${x} ${surface}h${U}" stroke="${p.top}" stroke-width="10" opacity="${way.toFixed(2)}"/>`);
                if (way > 0) after.push(slide(x, surface - 10, down, way));
                continue;
            }
            if (spot.cell === 'G' || spot.cell === 'g') {
                parts.push(`<g data-ditch><rect x="${x}" y="${surface}" width="${U}" height="${Y + 3 * U - surface}" fill="#5e4636"/><rect x="${x}" y="${Y + 3 * U - 34}" width="${U}" height="34" fill="#6fc3ef"/><path d="M${x + 10} ${Y + 3 * U - 22}q10 -8 20 0t20 0t20 0t20 0" fill="none" stroke="#ffffff" stroke-width="3"/></g>`);
                const b = built(s, guard);
                if (b > 0) after.push(`<g data-bridge opacity="${b.toFixed(2)}"><path d="M${x - 6} ${surface}h${U + 12}v16h-${U + 12}Z" fill="#c98a4f" stroke="${INK}" stroke-width="3"/><path d="M${x + 25} ${surface}v16M${x + 50} ${surface}v16M${x + 75} ${surface}v16" stroke="${INK}" stroke-width="2"/></g>`);
                continue;
            }
            parts.push(`<rect x="${x}" y="${surface}" width="${U}" height="${Y + 3 * U - surface}" fill="${p.earth}"/><rect x="${x}" y="${surface}" width="${U}" height="16" fill="${p.top}"/><path d="M${x} ${surface + 16}h${U}" stroke="${INK}" stroke-width="2" opacity=".35"/>`);
            if ((c + f) % 3 === 1 && spot.cell !== 'W' && spot.cell !== 'w') parts.push(`<circle cx="${x + 30}" cy="${surface + 34}" r="5" fill="${p.deco}" opacity=".8"/><circle cx="${x + 70}" cy="${surface + 52}" r="4" fill="${p.deco}" opacity=".6"/>`);
            if (spot.cell === 'W' || spot.cell === 'w') {
                const b = built(s, guard);
                parts.push(`<g data-wall><rect x="${x + 12}" y="${Y + 4}" width="76" height="${surface - Y - 4}" rx="6" fill="#d3c3b1" stroke="${INK}" stroke-width="4"/>${bricks(x + 12, Y + 4, surface)}</g>`);
                if (b > 0) after.push(`<path data-tunnel d="M${x + 12} ${surface}V${surface - 70}Q${x + 50} ${surface - 112} ${x + 88} ${surface - 70}V${surface}Z" fill="#4a3442" stroke="${INK}" stroke-width="4" opacity="${b.toFixed(2)}"/>`);
            }
        }
    }
    // Ladders lean against each high step that got one.
    for (const [k, o] of list.entries()) if (o.role === 'echelle' && built(s, k) > 0) {
        const a = spots[o.at]!, b = spots[o.at + 1]!, Y = a.floor * BAND * U, edge = (a.col < b.col ? b.col : b.col + 1) * U, toward = a.col < b.col ? -1 : 1;
        const foot = edge + toward * 44, rungs = [0.2, 0.4, 0.6, 0.8].map(t => { const yy = Y + 2 * U - t * U * 1.05, xx = foot + (edge - foot) * t; return `M${xx - 14} ${yy}h28`; }).join('');
        after.push(`<g data-ladder opacity="${built(s, k).toFixed(2)}"><path d="M${foot - 14} ${Y + 2 * U}L${edge - 14} ${Y + U - 8}M${foot + 14} ${Y + 2 * U}L${edge + 14} ${Y + U - 8}${rungs}" stroke="#d58a3d" stroke-width="7" stroke-linecap="round"/></g>`);
    }
    const first = spots[0]!, last = spots.at(-1)!;
    after.push(trapdoor(first.col * U + U / 2, s.started), rainbowDoor(last.col * U + U / 2, last.floor * BAND * U + (last.high ? U : 2 * U), s.foals.filter(f => f.home).length));
    return parts.join('') + after.join('');
}
/** Where a foal is drawn and which way it looks; null while it is in the trapdoor or through the door. */
export function foalPlace(s: State, i: number, reduce: boolean): { x: number; y: number; dir: 1 | -1 } | null {
    const f = s.foals[i]!;
    if (!f.out || f.home) return null;
    const level = levelOf(s.level), at = feet(level, f.pos);
    const leader = s.foals.findIndex(o => o.out && !o.home) === i;
    // A soft bounce while walking, a little head shake after a wrong job; nothing of either with reduced motion.
    const bob = reduce || f.pos % SUB === 0 ? 0 : -Math.abs(Math.sin(f.pos * Math.PI / 4)) * 6;
    const shake = !reduce && leader && s.shake > 0 ? Math.sin(s.shake * 1.3) * 7 : 0;
    return { x: at.x * U + shake, y: at.y * U + bob, dir: at.dir };
}
export function foalsSvg(): string {
    return `<g data-foals>${COATS.map((coat, i) => `<g data-foal="${i}" style="display:none"><g data-face>${foal(coat, `promenade-coat-${i}`)}</g></g>`).join('')}<g data-bubble style="display:none"><circle cx="0" cy="0" r="38" fill="#fffdf5" stroke="${INK}" stroke-width="4"/><g data-bubble-picture transform="translate(-26 -26) scale(.82)"></g></g></g>`;
}
export function fieldSvg(s: State, locale: Locale): string {
    const { width, height } = fieldSize(levelOf(s.level));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${labels[locale].field}"><g data-terrain>${terrainSvg(s)}</g>${foalsSvg()}</svg>`;
}
/** Moves the foals and the work bubble without rebuilding the scenery. */
export function placeFoals(root: ParentNode, s: State, reduce: boolean): void {
    for (let i = 0; i < s.foals.length; i++) {
        const g = root.querySelector<SVGGElement>(`[data-foal="${i}"]`), at = foalPlace(s, i, reduce);
        if (!g) continue;
        if (!at) { g.style.display = 'none'; continue; }
        g.style.display = '';
        g.setAttribute('transform', `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) scale(${at.dir} 1)`);
    }
    const bubble = root.querySelector<SVGGElement>('[data-bubble]'), worker = s.work ? s.foals.findIndex(o => o.out && !o.home) : -1;
    if (!bubble) return;
    const at = worker >= 0 ? foalPlace(s, worker, reduce) : null;
    if (!at || !s.work) { bubble.style.display = 'none'; return; }
    bubble.style.display = '';
    bubble.setAttribute('transform', `translate(${at.x.toFixed(1)} ${(at.y - 140).toFixed(1)})`);
    const role = obstacles(levelOf(s.level))[s.work.obstacle]!.role, pic = bubble.querySelector('[data-bubble-picture]')!;
    if (pic.getAttribute('data-role') !== role) { pic.setAttribute('data-role', role); pic.innerHTML = rolePicture(role); }
}
/** Centre of the waiting foal, in percent of the field: where its big touch zone goes. */
export function touchSpot(s: State): { left: number; top: number } | null {
    if (waiting(s) === null) return null;
    const level = levelOf(s.level), leader = s.foals.find(f => f.out && !f.home)!, at = feet(level, leader.pos), { width, height } = fieldSize(level);
    return { left: at.x * U / width * 100, top: (at.y * U - 42) / height * 100 };
}
export function trapSpot(s: State): { left: number; top: number } {
    const level = levelOf(s.level), first = path(level)[0]!, { width, height } = fieldSize(level);
    return { left: (first.col * U + U / 2) / width * 100, top: 52 / height * 100 };
}
export function roleButtons(level: LevelDef, locale: Locale): string {
    const t = labels[locale];
    return `<div class="promenade-roles" role="group" aria-label="${t.roles}">${offered(level).map((r: Role) => `<button data-role="${r}" aria-label="${t.role[r]}" disabled>${svg(rolePicture(r))}</button>`).join('')}</div>`;
}
export function gameView(s: State, locale: Locale, message: string): string {
    const t = labels[locale], level = levelOf(s.level), won = stars(s), rows = level.floors.length * BAND;
    const finish = s.finished ? `<div class="promenade-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="promenade-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="promenade-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="promenade"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="promenade-instruction"><div id="guide">${characterSvg('licorne', s.finished ? 'celebration' : 'joie', 'repos', 'reduce')}</div><p id="promenade-message" aria-live="polite">${message}</p></div>`
        + `<div class="promenade-zone" style="aspect-ratio:${COLS}/${rows};--rows:${rows}"><div class="promenade-field">${fieldSvg(s, locale)}</div><button id="promenade-start" class="promenade-touch" aria-label="${t.trap}" hidden></button><button id="promenade-foal" class="promenade-touch" aria-label="${t.foal}" hidden></button>${rows > BAND ? finish : ''}</div>`
        // A one-floor walk leaves room below the field: the reward goes there instead of over the scenery.
        + (s.finished ? (rows > BAND ? '' : finish) : roleButtons(level, locale)) + '</section>';
}
