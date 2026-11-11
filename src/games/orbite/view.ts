import { characterSvg } from '../../characters/svg';
import { featuresOf, GRUMPY, isUnlocked, levels, stars, type Feature, type Funny, type LevelDef, type State } from '../../engines/orbite';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { cloud, goalCloud, heart, moon, sun, U, windArrows } from './art';

export const labels = {
    fr: { title: 'Les nuages de Lumi', levels: 'Choisis un niveau',
        gesture: 'Touche le ciel au-dessus d’un nuage : Lumi y court et lance un cœur.',
        goal: 'Fais sourire tous les nuages.',
        intro: { pas: 'À chaque cœur, les nuages font un pas.', balance: 'Les nuages se balancent : touche quand ton nuage est au-dessus.', casque: 'Le nuage au casque a besoin de deux cœurs.', oiseau: 'Un oiseau ami passe : attention à lui !', pluie: 'Le nuage gris fait tomber des gouttes : attends qu’elles tombent.', cache: 'Des petits nuages se cachent derrière les grands.', arc: 'Le nuage arc-en-ciel fait sourire ses voisins.', vent: 'Le vent pousse le cœur de côté : regarde la flèche.', ami: 'Certains nuages sourient déjà : ils font des bisous.' } as Record<Feature, string>,
        fail: { rougit: 'Il rougit ! Encore un cœur.', lune: 'Boing ! Le cœur rebondit sur la Lune.', entre: 'Hi hi ! Le cœur passe entre deux nuages.', bisou: 'Smack ! Ce nuage sourit déjà : il fait un bisou.', oiseau: 'Youpi ! L’oiseau fait une pirouette.', bord: 'Bonk ! Le vent pousse le cœur contre le bord.', pluie: 'Plic ! Une goutte sur Lumi : elle ouvre son parapluie.' } as Record<Funny, string>,
        shine: 'Regarde la colonne qui brille !', smile: 'Il sourit et s’envole !', smiles: 'Ils sourient et s’envolent !',
        won: 'Bravo ! Le soleil est revenu !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        board: 'Le ciel : touche une colonne pour que Lumi lance un cœur ; au clavier, gauche et droite, puis Entrée',
        goals: 'Nuages à faire sourire' },
    en: { title: 'Lumi’s clouds', levels: 'Choose a level',
        gesture: 'Touch the sky above a cloud: Lumi runs there and throws a heart.',
        goal: 'Make every cloud smile.',
        intro: { pas: 'After each heart, the clouds take one step.', balance: 'The clouds swing: touch when your cloud is above.', casque: 'The cloud in a helmet needs two hearts.', oiseau: 'A friendly bird flies by: mind it!', pluie: 'The grey cloud lets drops fall: wait until they land.', cache: 'Little clouds hide behind the big ones.', arc: 'The rainbow cloud makes its neighbours smile.', vent: 'The wind pushes the heart sideways: look at the arrow.', ami: 'Some clouds already smile: they blow kisses.' } as Record<Feature, string>,
        fail: { rougit: 'It blushes! One more heart.', lune: 'Boing! The heart bounces on the Moon.', entre: 'Tee hee! The heart goes between two clouds.', bisou: 'Smack! This cloud already smiles: it blows a kiss.', oiseau: 'Whee! The bird does a loop.', bord: 'Bonk! The wind pushes the heart against the edge.', pluie: 'Plip! A drop on Lumi: she opens her umbrella.' } as Record<Funny, string>,
        shine: 'Look at the column that shines!', smile: 'It smiles and flies away!', smiles: 'They smile and fly away!',
        won: 'Well done! The sun is back!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        board: 'The sky: touch a column for Lumi to throw a heart; with the keyboard, left and right, then Enter',
        goals: 'Clouds to make smile' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the goal. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), t.goal];
}
export const pictogram = svg(`<rect x="4" y="4" width="56" height="56" rx="10" fill="#bfe4ff"/><g transform="translate(20 20) scale(.26)">${cloud('n')}</g><g transform="translate(44 18) scale(.26)">${cloud('smile')}</g><g transform="translate(32 46) scale(.3)">${heart()}</g>`);
export function levelView(records: Partial<Record<number, number>>, locale: Locale): string {
    const t = labels[locale];
    return `<section class="orbite"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-orbite-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
/** How the sky fits its stage: columns as wide as the stage allows (at most `MAX_CELL` px), the sky stretched to the whole
 * height: the Moon on top, the troop under it, the bird lane, the wind, Lumi at the bottom. All in units, a column being 100
 * wide. */
export const MAX_CELL = 110;
/** The fewest rows of sky, in columns: the Moon, three rows of clouds, the bird, the wind and Lumi. */
export const MIN_ROWS = 8.4;
export interface Layout { cell: number; ox: number; W: number; H: number; top: number; birdY: number; windY: number; lumiY: number }
export function layout(level: LevelDef, stageW: number, stageH: number): Layout {
    const cell = Math.max(1, Math.min(stageW / (level.cols + .1), stageH / MIN_ROWS, MAX_CELL));
    const W = Math.max(level.cols * U, stageW / cell * U), H = Math.max(MIN_ROWS * U, stageH / cell * U);
    const top = .95 * U, lumiY = H - .8 * U, windY = H - 2.05 * U, birdY = Math.min(top + 3 * U + .75 * U, windY - 1.1 * U);
    return { cell, ox: (W - level.cols * U) / 2, W, H, top, birdY, windY, lumiY };
}
/** The middle of column x, and of row r of the troop. */
export const cx = (l: Layout, x: number): number => l.ox + x * U + U / 2;
export const ry = (l: Layout, r: number): number => l.top + r * U + U / 2;
const n = (v: number): string => (Math.round(v * 100) / 100).toString();
/** The clouds of the troop, each at its place from the troop's left edge. */
export function troopSvg(l: Layout, troop: readonly string[]): string {
    return troop.map((row, r) => row.split('').map((c, j) => c === '.' ? '' : `<g data-cloud="${r},${j}" data-kind="${c}" transform="translate(${n(j * U + U / 2)} ${n(ry(l, r))})"><g class="orbite-nuage">${cloud(c)}</g></g>`).join('')).join('');
}
export function lumiSvg(reduce: boolean): string {
    const size = 1.45 * U, body = characterSvg('licorne', 'joie', 'repos', reduce ? 'reduce' : 'full').replace('<svg ', `<svg x="${-size / 2}" y="${-size * .62}" width="${size}" height="${size}" `);
    return `<g class="orbite-lumi-corps">${body}</g><g class="orbite-ombrelle" transform="translate(0 -70)"></g>`;
}
/** The sky: its colour, the Moon, the hidden sun, the wind, then the layers that change. */
export function boardSvg(level: LevelDef, l: Layout, locale: Locale, reduce: boolean): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(l.W)} ${n(l.H)}" role="img" aria-label="${labels[locale].board}">`
        + `<defs><linearGradient id="orbite-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0ff"/><stop offset=".75" stop-color="#d4eeff"/><stop offset="1" stop-color="#e9f8e0"/></linearGradient></defs>`
        + `<rect data-frame width="${n(l.W)}" height="${n(l.H)}" fill="url(#orbite-ciel)"/>`
        + `<rect y="${n(l.H - .45 * U)}" width="${n(l.W)}" height="${n(.45 * U)}" fill="#8fd17a"/>`
        + `<g data-hint></g>`
        + `<g data-sun transform="translate(${n(l.W / 2)} ${n(l.top + U)})"><g class="orbite-soleil">${sun()}</g></g>`
        + `<g data-moon transform="translate(${n(l.W - .6 * U)} ${n(.55 * U)}) scale(.85)"><g class="orbite-lune">${moon()}</g></g>`
        + (level.wind ? `<g data-wind transform="translate(0 ${n(l.windY)})"><g transform="${level.wind < 0 ? `translate(${n(l.W)} 0) scale(-1 1)` : ''}"><g class="orbite-vent">${windArrows(l.W)}</g></g></g>` : '')
        + `<g data-troop><g class="orbite-troupe"></g></g><g data-drops></g><g data-bird></g>`
        + `<g data-lumi><g class="orbite-lumi">${lumiSvg(reduce)}</g></g><g data-heart><g class="orbite-coeur"></g></g><g data-effects></g></svg>`;
}
/** The row of goals under Lumi: one little cloud for each grumpy cloud of the scene, smiling once it smiled. */
export function goalsHtml(level: LevelDef, s: State, locale: Locale): string {
    const t = labels[locale], total = level.troop.join('').split('').filter(c => GRUMPY.includes(c)).length;
    const left = s.troop.join('').split('').filter(c => GRUMPY.includes(c) || c === 'r').length, done = total - left;
    return `<div class="orbite-goals" role="img" aria-label="${t.goals} : ${left}">${Array.from({ length: total }, (_, i) => `<span data-goal="${i}"${i < done ? ' data-got' : ''}>${svg(goalCloud(i < done))}</span>`).join('')}</div>`;
}
export function gameView(s: State, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="orbite-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="orbite-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="orbite-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="orbite orbite-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="orbite-instruction"><div id="guide">${characterSvg('licorne', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="orbite-message" aria-live="polite">${typeset(message)}</p></div>`
        + goalsHtml(levels[s.level - 1]!, s, locale)
        + `<div class="orbite-stage"><div class="orbite-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div></section>`;
}
