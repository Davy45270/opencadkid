import { characterSvg } from '../../characters/svg';
import { FIELD, levels, isUnlocked, stars, type Records, type Scene, type State } from '../../engines/cherche';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { dots, icon, svg } from '../../ui/svg';
import { paintedSceneUrl } from '../puzzle/scenes';
import { itemArt, names } from './items';

export const labels = {
    fr: { title: 'Les cachettes de Tutu', levels: 'Choisis un niveau', instruction: 'Des objets se cachent dans le paysage. Touche ceux de la liste.', find: 'À trouver', found: 'Trouvé !', won: 'Bravo, tu as tout trouvé !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', home: 'Accueil', field: 'Le paysage : touche les objets cachés', level: 'Niveau', hint: 'Regarde bien là où ça brille.' },
    en: { title: 'Tutu’s hiding places', levels: 'Choose a level', instruction: 'Objects are hiding in the landscape. Touch the ones in the list.', find: 'To find', found: 'Found it!', won: 'Well done, you found them all!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', home: 'Home', field: 'The landscape: touch the hidden objects', level: 'Level', hint: 'Look closely where it shines.' }
} as const;
/** A magnifying glass over a little landscape: the home card and the level guide. */
export const pictogram = svg('<path d="M4 50Q20 38 34 46Q48 36 60 44V60H4Z" fill="#9fcf8f"/><circle cx="27" cy="25" r="15" fill="#e3f4fb" stroke="#58443b" stroke-width="4"/><path d="M38 36L52 50" stroke="#58443b" stroke-width="7" stroke-linecap="round"/><path d="M20 21Q24 15 31 16" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><path d="M24 30l3 -8l3 8l-7 -5h8Z" fill="#f6cf63"/>');
/** Flat stand-in under each painting, shown until the WebP arrives (it is fetched only when a scene opens). */
const tint: Record<Scene, [string, string]> = { zen: ['#a9d8f0', '#efe2c8'], ardennes: ['#79c4f0', '#8cc85a'], volcano: ['#7a4aa0', '#5b4650'], islands: ['#5ab8f0', '#f2d9a0'], galaxy: ['#2c2160', '#6a4a9a'], valley: ['#6cc0f0', '#7cc860'] };
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="cherche"><header class="shapes-header"><button id="back" class="round" aria-label="${t.home}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('singe')}</div><div class="level-grid">${levels.map(l => `<button data-cherche-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b>${dots(l.find)}<span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** Tall grass in front of the lower half of a hidden object: only its top peeks out. */
const grass = (x: number, y: number, size: number): string => {
    const w = size * .62, top = y, base = y + size / 2 + 1;
    const blades = [-1, -.6, -.2, .2, .6, 1].map((k, i) => `M${(x + k * w).toFixed(1)} ${base.toFixed(1)}Q${(x + k * w + (i % 2 ? 6 : -6)).toFixed(1)} ${(top + (i % 3) * 4).toFixed(1)} ${(x + k * w + (i % 2 ? 3 : -3)).toFixed(1)} ${(top - 2 + (i % 3) * 3).toFixed(1)}`).join('');
    return `<g data-grass pointer-events="none"><path d="M${(x - w - 4).toFixed(1)} ${base.toFixed(1)}Q${x.toFixed(1)} ${(top + 4).toFixed(1)} ${(x + w + 4).toFixed(1)} ${base.toFixed(1)}Z" fill="#6fae5c"/><path d="${blades}" fill="none" stroke="#4d8c45" stroke-width="5" stroke-linecap="round"/></g>`;
};
/** High in the scene, a little cloud does the same job as the grass. */
const cloud = (x: number, y: number, size: number): string => {
    const w = size * .62, base = y + size / 2;
    return `<g data-grass="cloud" pointer-events="none" fill="#ffffff" opacity=".96"><ellipse cx="${x.toFixed(1)}" cy="${(base - size * .12).toFixed(1)}" rx="${(w + 6).toFixed(1)}" ry="${(size * .3).toFixed(1)}"/><circle cx="${(x - w * .45).toFixed(1)}" cy="${(y + size * .1).toFixed(1)}" r="${(size * .24).toFixed(1)}"/><circle cx="${(x + w * .35).toFixed(1)}" cy="${(y + size * .06).toFixed(1)}" r="${(size * .28).toFixed(1)}"/></g>`;
};
const cover = (x: number, y: number, size: number): string => y < FIELD.height * .4 ? cloud(x, y, size) : grass(x, y, size);
export function fieldSvg(s: State, locale: Locale): string {
    const [sky, ground] = tint[s.scene];
    const items = s.items.map((it, i) => `<g data-item="${i}" data-kind="${it.kind}" data-target="${it.target}" data-found="${it.found}" aria-label="${names[locale][it.kind]}">${itemArt(it.kind, it.x, it.y, it.size)}${it.covered ? cover(it.x, it.y, it.size) : ''}${it.found ? `<circle cx="${it.x}" cy="${it.y}" r="${Math.max(it.size / 2, 20) + 3}" fill="none" stroke="#58ad87" stroke-width="4"/>` : ''}</g>`).join('');
    const hint = s.hint === null ? '' : (() => { const h = s.items[s.hint]!; return `<circle data-hint cx="${h.x}" cy="${h.y}" r="${Math.max(h.size / 2, 22) + 4}" fill="#fff6c255" stroke="#f6cf63" stroke-width="4"><animate attributeName="r" values="${Math.max(h.size / 2, 22) + 2};${Math.max(h.size / 2, 22) + 9};${Math.max(h.size / 2, 22) + 2}" dur="1.2s" repeatCount="indefinite"/></circle>`; })();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIELD.width} ${FIELD.height}" role="img" aria-label="${labels[locale].field}"><rect width="${FIELD.width}" height="${FIELD.height * .6}" fill="${sky}"/><rect y="${FIELD.height * .6}" width="${FIELD.width}" height="${FIELD.height * .4}" fill="${ground}"/><image data-scene="${s.scene}" href="${paintedSceneUrl[s.scene]}" width="${FIELD.width}" height="${FIELD.height}" preserveAspectRatio="xMidYMid slice"/>${items}${hint}</svg>`;
}
/** The strip of objects to find: each one is ticked once found. */
export function listHtml(s: State, locale: Locale): string {
    const t = labels[locale];
    return `<ul class="cherche-list" aria-label="${t.find}">${s.items.filter(it => it.target).map(it => `<li data-wanted="${it.kind}" data-found="${it.found}" aria-label="${names[locale][it.kind]}${it.found ? ` : ${t.found}` : ''}">${svg(itemArt(it.kind, 32, 32, 56), '0 0 64 64')}${it.found ? `<span class="cherche-tick">${icon('check')}</span>` : ''}</li>`).join('')}</ul>`;
}
export function gameView(s: State, locale: Locale, message: string): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="cherche-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="cherche-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="cherche-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="cherche"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header><div class="cherche-instruction"><div id="guide">${characterSvg('singe', s.finished ? 'celebration' : 'joie', 'repos', 'reduce')}</div><p id="cherche-message" aria-live="polite">${message}</p></div>${listHtml(s, locale)}<div class="cherche-zone">${fieldSvg(s, locale)}</div>${finish}</section>`;
}
