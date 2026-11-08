import { characterSvg } from '../../characters/svg';
import { FIELD, foot, levels, isUnlocked, stars, type Item, type Records, type Scene, type State } from '../../engines/cherche';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { dots, icon, svg } from '../../ui/svg';
import { paintedSceneUrl } from '../puzzle/scenes';
import { artHeight, artWidth, itemArt, names } from './items';

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
/** Mean colour of each painting over an 8 × 8 grid of 40 × 32 field units, measured once on the WebP files: the light an object
 * standing in that cell receives. */
const ambient: Record<Scene, string> = {
    zen: '66b2c30b90fc0890fc33a4fbb1d7fa8dc7fa21a5fb57bcfb6da16983c7d571b8f852a8f36badf19abce875b99a88c5ee5f943d9baf86a1b3e2a7abe6bfa5dd6d8275707f5aa1987e67983d7aa865b2828dc8746ca8725fa07a578d745d909b6f767c5d9c9478a88b48a16d67877f987c4a4b866e497d8a51798272837d7f79847e707e964b80b3736e857a837086936a73a17298a66e84b6bc678faf929fa768a2a3648d766eaaaeeeddc2e5d1b4ecd7b9e7d7bceedbb9f4e5cbe9d5bcaa9186',
    ardennes: '72c9fdc1e5f945b4fc21a5fd21a5fd20a5fd20a5fd21a5fdd4f1fbdff4faceeef960c7fc34b7fd35b7fd35b6fd34b7fd97d5d099e0fcb7e9fcb8e9fa9ae1fb5fd2fd4bccfd5bd2fc4eab7e54c8d35cc6b957cee665d8eb89ebf986ebfd93edfd287e3f29804f3c98553cb0923ebaa93bbcc24ec7d95ccdde287c4418664238852f2b9264228f7b2b9d8e32a6993ba9895a9b1c1c6b5224753f459a403f984b5fb28366c2b427876f759c1d7da74169a31e73ab1d78b22679b62586cd5b81c266',
    volcano: '3834d74c237f5a173b981d13f05f07e240057b18274d24788858f1623cc9863cadc33a66be4f20ca4317bc3e9c8339a6d15bd7c757a28434767429516c2745913a398c396bc65155794dd87c3979ab3d336d2746632d46b84d27a2352f7b385d8d3a647a2f46ad4730df6c19e98416cb7322ab6233994c54f17216f06b12f4760ced6d17dc5f19d83f20c43e21c2432f6c3656a4483b7d3b59734659623c57643e6b7642557943486d3751864c48552f5248264c4e233e6b2a4170304f783847',
    islands: '339ef53ca0fb2d97f20d8dfa018cfc048ffc4badfb82c4f851b0907edaf615bffc26befb67caf611c0f81fc5fa26b3c8449451539c4181d09f4ad5f759aec870c8ce42b9b8478d64838e5255aec26e895140c8d15f95976aa49d3b929a978449619d960dabdf3d868455bbad15b1e323c3e4219ebb3b8c8f13ddd30ad2e50bd7e008d5f50ad8f60de0f40cdff61ae3e895cdae60efda5af3db5ef6da65f6d67ef4db7fedd396e1cbf4de8bfae594f8e494dfdb86c0d462e6df76f2e484f6df8e',
    galaxy: '080d510c0b4d190a63390e8b702dc64426bd1b0d740e0c5257458d16167e4e38d1b360f0b156eb401eb1362c8e131d7c3145a24054bc253cc43939c51822950524815054bc1f37a72d52ca2f5dc5587ed54153a31458ce074fc3195bbf3568cf5770cc5588ee5d65ca547acb4d65ca2c84e7448fea5c80cb3f45b87f6fe87462e05657cc3968dc6173da4c3ba9747dd4935ba9904cbd8a5bcd9e74d8746edc8d4ccb6664db634abca036a497409e913db67d41c67c45c17c47cd773fc19342bf',
    valley: '0096fd0096fd0097fd0097fd2da9fc98d7fc34abfc0098fd12adfc0dacfd45bffc51c3fcace4fc9de0fbb4e9fb3ebcf77ed9fa50d4fc45d4fc36c4ed46c7d037cde546cdee66c1d11ab6e238c1ca47a890408e5c3f9142778e58929553a5a55f3aa1353ba12e48b13067b7415ba05e71ae4b54a13d4faa255da243448c426f94308d8754607c3f89a667a7b24272a51f72bcc263aab3718b734a938c5ea3a36a9b3d59970a9acd116caf2975b2417ec62c82bf367b982243800f38750a6e9b2a'
};
export function ambientAt(scene: Scene, x: number, y: number): [number, number, number] {
    const col = Math.min(7, Math.max(0, Math.floor(x / 40))), row = Math.min(7, Math.max(0, Math.floor(y / 32))), at = (row * 8 + col) * 6;
    const hex = ambient[scene];
    return [0, 2, 4].map(k => parseInt(hex.slice(at + k, at + k + 2), 16) / 255) as [number, number, number];
}
/** How strongly the local light colours an object: enough to sit it in the picture, little enough that it stays the object of the list. */
export const TINT = .28;
/** Channel gains for an object standing at (x, y): the hue of the surrounding paint, and a little darker in a dark place. */
export function lightGains(scene: Scene, x: number, y: number): [number, number, number] {
    const [r, g, b] = ambientAt(scene, x, y), mean = (r + g + b) / 3 || 1e-3;
    const bright = Math.min(1.04, Math.max(.8, .72 + .55 * mean));
    return [r, g, b].map(c => Math.min(1.15, Math.max(.6, bright * (1 - TINT + TINT * c / mean)))) as [number, number, number];
}
/** Share of a hidden object's drawn height that the scenery covers, between the hollows and the tops of its bumps. */
export const COVER = { low: .26, high: .38 } as const;
/** The piece of painting in front of a hidden object: the ground it stands on rises in soft bumps over the bottom of the drawing,
 * so its upper half always shows. */
function coverPath(it: Item): string {
    const base = foot(it), h = artHeight(it.kind, it.size), w = artWidth(it.kind, it.size) / 2 + 4, bumps = 4, step = 2 * w / bumps;
    const hollow = base - COVER.low * h, f = (n: number): string => n.toFixed(1);
    let d = `M${f(it.x - w)} ${f(base + 2)}V${f(hollow)}`;
    for (let k = 0; k < bumps; k++) {
        const x0 = it.x - w + k * step, peak = base - (k % 2 ? COVER.low + (COVER.high - COVER.low) * .5 : COVER.high) * h;
        // A quadratic curve reaches halfway to its control point: the control sits twice as high as the peak.
        d += `Q${f(x0 + step / 2)} ${f(2 * peak - hollow)} ${f(x0 + step)} ${f(hollow)}`;
    }
    return `${d}V${f(base + 2)}Z`;
}
let renders = 0;
export function fieldSvg(s: State, locale: Locale): string {
    const [sky, ground] = tint[s.scene], uid = `ch${++renders}`;
    const scene = `href="${paintedSceneUrl[s.scene]}" width="${FIELD.width}" height="${FIELD.height}" preserveAspectRatio="xMidYMid slice"`;
    const defs: string[] = [`<filter id="${uid}-soft" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="1.6"/></filter>`];
    // Painter's order: what stands farther (higher up) is drawn first, so a nearer object passes in front of it.
    const order = s.items.map((it, i) => i).sort((a, b) => foot(s.items[a]!) - foot(s.items[b]!));
    const items = order.map(i => {
        const it = s.items[i]!, base = foot(it), w = artWidth(it.kind, it.size);
        const [gr, gg, gb] = lightGains(s.scene, it.x, base - it.size * .3);
        defs.push(`<filter id="${uid}-l${i}" color-interpolation-filters="sRGB"><feColorMatrix values="${gr.toFixed(3)} 0 0 0 0 0 ${gg.toFixed(3)} 0 0 0 0 0 ${gb.toFixed(3)} 0 0 0 0 0 1 0"/></filter>`);
        const shadow = `<ellipse data-shadow cx="${it.x}" cy="${(base - 1).toFixed(1)}" rx="${(w * .46 + 2).toFixed(1)}" ry="${(2 + it.size * .06).toFixed(1)}" fill="#1c1408" opacity=".38" filter="url(#${uid}-soft)"/>`;
        const cover = it.covered ? (defs.push(`<clipPath id="${uid}-c${i}"><path d="${coverPath(it)}"/></clipPath>`), `<g data-cover pointer-events="none" clip-path="url(#${uid}-c${i})"><image ${scene}/></g>`) : '';
        const ring = it.found ? `<circle cx="${it.x}" cy="${it.y}" r="${Math.max(it.size / 2, 20) + 3}" fill="none" stroke="#58ad87" stroke-width="4"/>` : '';
        return `<g data-item="${i}" data-kind="${it.kind}" data-target="${it.target}" data-found="${it.found}" aria-label="${names[locale][it.kind]}">${shadow}<g filter="url(#${uid}-l${i})">${itemArt(it.kind, it.x, it.y, it.size)}</g>${cover}${ring}</g>`;
    }).join('');
    const hint = s.hint === null ? '' : (() => { const h = s.items[s.hint]!; return `<circle data-hint cx="${h.x}" cy="${h.y}" r="${Math.max(h.size / 2, 22) + 4}" fill="#fff6c255" stroke="#f6cf63" stroke-width="4"><animate attributeName="r" values="${Math.max(h.size / 2, 22) + 2};${Math.max(h.size / 2, 22) + 9};${Math.max(h.size / 2, 22) + 2}" dur="1.2s" repeatCount="indefinite"/></circle>`; })();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIELD.width} ${FIELD.height}" role="img" aria-label="${labels[locale].field}"><defs>${defs.join('')}</defs><rect width="${FIELD.width}" height="${FIELD.height * .6}" fill="${sky}"/><rect y="${FIELD.height * .6}" width="${FIELD.width}" height="${FIELD.height * .4}" fill="${ground}"/><image data-scene="${s.scene}" ${scene}/>${items}${hint}</svg>`;
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
