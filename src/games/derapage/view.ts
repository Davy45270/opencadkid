import { characterSvg } from '../../characters/svg';
import { featuresOf, gifts, isUnlocked, levels, ONE_WAY, signOf, spotOf, stars, type Fail, type Feature, type Friend, type LevelDef, type Spot, type State } from '../../engines/derapage';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';
import { arrow, friendBody, friendHead, friendIcon, funnyIcon, funnyThing, gift, house, kartChassis, noEntry, panel, pilot, STAR } from './art';
import { arrowAt, branchPoints, DECO_Y, decoX, FRIEND, H, HOUSE, HOUSE_W, HOUSE_X, pathD, RING, ROAD, roadPoints, approachPoints, signBox, signX, SIGN_BOTTOM, SIGN_TOP, starPoints, THING_AT, W } from './geometry';

const fr = { ours: 'l’ours', chiot: 'le chiot', hibou: 'le hibou', lapin: 'le lapin', canard: 'le canard', chat: 'le chat' } as Record<Friend, string>;
const en = { ours: 'the bear', chiot: 'the puppy', hibou: 'the owl', lapin: 'the rabbit', canard: 'the duck', chat: 'the cat' } as Record<Friend, string>;
const giftFr = { gateau: 'son gâteau', balle: 'sa balle', lettre: 'sa lettre', carotte: 'sa carotte', bateau: 'son petit bateau', pelote: 'sa pelote de laine' } as Record<string, string>;
const giftEn = { gateau: 'his cake', balle: 'his ball', lettre: 'his letter', carotte: 'his carrot', bateau: 'his little boat', pelote: 'his ball of wool' } as Record<string, string>;
const roofFr = { ours: 'rouge', chiot: 'bleu', hibou: 'violet', lapin: 'orange', canard: 'vert', chat: 'jaune' } as Record<Friend, string>;
const roofEn = { ours: 'red', chiot: 'blue', hibou: 'purple', lapin: 'orange', canard: 'green', chat: 'yellow' } as Record<Friend, string>;
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
export const labels = {
    fr: { title: 'Le kart de Pestouille', levels: 'Choisis un niveau',
        gesture: 'Le kart roule tout seul. À chaque croisement, regarde les panneaux et touche la grosse flèche du bon chemin.',
        intro: { deux: 'Deux croisements à la suite : regarde bien chaque panneau.', derape: 'Un virage à étoiles ! Touche « Dérape ! » pendant le virage.', trois: 'Trois chemins cette fois !', double: 'Deux paquets à livrer, dans l’ordre que tu veux.', toit: 'Les panneaux ne montrent que la couleur du toit : souviens-toi de la maison !', sens: 'Les flèches par terre viennent vers nous : c’est un sens unique, on n’y va pas.', rondpoint: 'Un rond-point : on tourne autour, puis on sort.', pont: 'Un pont au-dessus de la rivière !', tunnel: 'Un tunnel sous la colline !' } as Record<Feature, string>,
        wants: (who: Friend): string => `${cap(fr[who])} attend ${giftFr[gifts[who]]}.`,
        roof: (who: Friend): string => `La maison ${fr[who].startsWith('l’') ? 'de ' + fr[who] : 'du ' + fr[who].slice(3)} a le toit ${roofFr[who]}.`,
        fail: { boue: 'Splatch ! Pestouille est tout crotté. Vite, la station de lavage à bulles !', moutons: 'Bêêê ! Les moutons traversent, on attend.', foin: 'Boing ! Un mur de foin : demi-tour !', planches: 'Clac clac ! Le petit pont de bois ne mène nulle part.', grotte: 'Hou hou ! Il fait tout noir, les yeux de Pestouille brillent.', manege: 'Youpi ! Trois tours de manège, et on repart.' } as Record<Exclude<Fail, 'mauvais'>, string>,
        notMe: (who: Friend): string => `Coucou ! ${cap(fr[who])} dit : « Ce n’est pas pour moi ! »`,
        thanks: (who: Friend): string => `${cap(fr[who])} dit : « J’ai déjà mon cadeau, merci ! »`,
        delivered: (who: Friend): string => `Livré ! ${cap(fr[who])} est tout content.`,
        shine: 'Regarde la flèche qui brille !', drift: 'Dérape !', bonus: 'Étoile bonus !', pick: 'Quel chemin ? Touche une flèche.',
        won: 'Bravo ! Tous les paquets sont livrés !', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', listen: 'Écouter', level: 'Niveau',
        board: 'La route : touche une grosse flèche pour choisir le chemin ; au clavier, gauche, haut et droite', goals: 'Paquets à livrer', bonusLabel: 'Étoiles de dérapage' },
    en: { title: 'Pestouille’s kart', levels: 'Choose a level',
        gesture: 'The kart drives by itself. At each crossing, look at the signs and touch the big arrow of the right road.',
        intro: { deux: 'Two crossings in a row: look at each sign.', derape: 'A star bend! Touch « Drift! » in the bend.', trois: 'Three roads this time!', double: 'Two parcels to deliver, in the order you like.', toit: 'The signs only show the colour of the roof: remember the house!', sens: 'The arrows on the ground come towards us: it is one way, we don’t go there.', rondpoint: 'A roundabout: we go round, then out.', pont: 'A bridge over the river!', tunnel: 'A tunnel under the hill!' } as Record<Feature, string>,
        wants: (who: Friend): string => `${cap(en[who])} is waiting for ${giftEn[gifts[who]]}.`,
        roof: (who: Friend): string => `${cap(en[who])}’s house has a ${roofEn[who]} roof.`,
        fail: { boue: 'Splat! Pestouille is all muddy. Quick, the bubble wash!', moutons: 'Baa! The sheep are crossing, we wait.', foin: 'Boing! A wall of hay: turn round!', planches: 'Clack clack! The little wooden bridge goes nowhere.', grotte: 'Oooh! It’s all dark, Pestouille’s eyes shine.', manege: 'Wheee! Three times round the merry-go-round, and off we go.' } as Record<Exclude<Fail, 'mauvais'>, string>,
        notMe: (who: Friend): string => `Hello! ${cap(en[who])} says: “It’s not for me!”`,
        thanks: (who: Friend): string => `${cap(en[who])} says: “I already have my present, thank you!”`,
        delivered: (who: Friend): string => `Delivered! ${cap(en[who])} is so happy.`,
        shine: 'Look at the arrow that shines!', drift: 'Drift!', bonus: 'Bonus star!', pick: 'Which way? Touch an arrow.',
        won: 'Well done! Every parcel is delivered!', again: 'Try again', next: 'Next level', list: 'Levels', listen: 'Listen', level: 'Level',
        board: 'The road: touch a big arrow to pick the way; with the keyboard, left, up and right', goals: 'Parcels to deliver', bonusLabel: 'Drift stars' }
} as const;
/** What is said when a scene opens: its title, the gesture (first scene) or the new thing it brings in, then the requests. */
export function instruction(level: LevelDef, locale: Locale): string[] {
    const t = labels[locale], fresh = featuresOf(level).filter(f => levels.find(l => featuresOf(l).includes(f))?.id === level.id);
    return [level.title[locale], ...(level.id === 1 ? [t.gesture] : fresh.map(f => t.intro[f])), ...level.deliver.map(f => t.wants(f)), ...(level.roofsOnly ? level.deliver.map(f => t.roof(f)) : [])];
}
const n = (v: number): string => (Math.round(v * 10) / 10).toString();
export const pictogram = svg(`<rect x="4" y="4" width="56" height="56" rx="12" fill="#a8dc7c"/><path d="M32 60V36L14 14M32 36L50 14" fill="none" stroke="#8d8d99" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(14 13) scale(.45)">${house('ours', 26, false)}</g><g transform="translate(32 46) scale(.42)">${kartChassis()}</g>`);
export function levelView(records: Partial<Record<number, number>>, locale: Locale): string {
    const t = labels[locale];
    return `<section class="derapage"><header class="shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('dragon')}</div><div class="level-grid">${levels.map(l => `<button data-derapage-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b><span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** French punctuation keeps its space without breaking the line. */
export const typeset = (text: string): string => text.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
/** The pictures of a sign: one big, two one above the other, three in a little pyramid. */
function signPictures(l: LevelDef, fork: string, i: number, w: number): string {
    const icons = signOf(l, fork, i), draw = (k: number): string => { const c = icons[k]!; return c.kind === 'ami' ? friendIcon(c.who, l.roofsOnly) : funnyIcon(c.fail); };
    const at = icons.length === 1 ? [[0, 0, w > 60 ? 2.1 : 1.65]] : icons.length === 2 ? [[0, -19, w > 60 ? 1.3 : 1.2], [0, 19, w > 60 ? 1.3 : 1.2]] : [[-17, -18, 1.08], [17, -18, 1.08], [0, 20, 1.15]];
    return icons.map((c, k) => `<g data-icon="${c.kind === 'ami' ? c.who : c.fail}" transform="translate(${at[k]![0]} ${at[k]![1]}) scale(${at[k]![2]})">${draw(k)}</g>`).join('');
}
const roadStroke = (d: string, attrs = ''): string => `<path d="${d}" fill="none" stroke="#6f6f7d" stroke-width="${2 * ROAD + 3}" stroke-linecap="round" stroke-linejoin="round"/><path ${attrs} d="${d}" fill="none" stroke="#a9a9b6" stroke-width="${2 * ROAD}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dashes = (d: string): string => `<path d="${d}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="6 7" stroke-linecap="round"/>`;
/** One screen: the road of a spot from the bottom to the kart's stop, and what stands at the top: the fork with its signs and
 * arrows, a friend's house, or a funny thing. The kart and the effects have their own layers. */
export function screenSvg(l: LevelDef, id: string, locale: Locale): string {
    const sp: Spot = spotOf(l, id), road = sp.road, main = roadPoints(road.shape), approach = approachPoints(sp);
    let under = '', roads = '', top = '', over = '';
    const grass = Array.from({ length: 22 }, (_, k) => `<path d="M${(k * 67) % 176 + 2} ${(k * 131) % 296 + 2}l2 -5l2 5" fill="none" stroke="#7fbf5a" stroke-width="1.4" stroke-linecap="round"/>`).join('');
    if (road.deco === 'pont') {
        const x = decoX(road.shape);
        under += `<path data-river d="M0 ${DECO_Y - 12}Q45 ${DECO_Y - 18} 90 ${DECO_Y - 12}T180 ${DECO_Y - 12}V${DECO_Y + 12}Q135 ${DECO_Y + 18} 90 ${DECO_Y + 12}T0 ${DECO_Y + 12}Z" fill="#5fb3e6"/><path d="M10 ${DECO_Y}q10 -4 20 0M120 ${DECO_Y + 4}q10 -4 20 0" stroke="#fff" stroke-width="1.6" fill="none"/>`;
        over += `<g data-bridge><path d="M${x - 20} ${DECO_Y - 16}H${x + 20}M${x - 20} ${DECO_Y + 16}H${x + 20}" stroke="#7d8793" stroke-width="5" stroke-linecap="round"/><path d="M${x - 20} ${DECO_Y - 16}H${x + 20}M${x - 20} ${DECO_Y + 16}H${x + 20}" stroke="#c3cbd3" stroke-width="2.5" stroke-linecap="round"/></g>`;
    }
    roads += roadStroke(pathD(main), 'data-road') + roadStroke(pathD(approach));
    if (sp.kind === 'fourche') {
        const k = sp.to.length;
        if (sp.round) roads += `<circle cx="${RING.x}" cy="${RING.y}" r="${RING.r}" fill="none" stroke="#6f6f7d" stroke-width="${2 * ROAD + 3}"/><circle cx="${RING.x}" cy="${RING.y}" r="${RING.r}" fill="none" stroke="#a9a9b6" stroke-width="${2 * ROAD}"/>`;
        sp.to.forEach((to, i) => {
            const pts = branchPoints(k, i, sp.round), d = pathD(sp.round ? pts.filter(p => Math.hypot(p.x - RING.x, p.y - RING.y) > RING.r + .5 && p.y < RING.y + RING.r) : pts.slice(4));
            roads += roadStroke(d, `data-way="${i}"`);
            if (to === ONE_WAY) {
                // Big white arrows on the ground, pointing down at the kart.
                for (const f of [.62, .82]) { const p = pts[Math.round((pts.length - 1) * f)]!, q = pts[Math.round((pts.length - 1) * f) - 1]!, a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI + 90; roads += `<path data-ground-arrow transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(a)})" d="M0 -7L6 0H2.5V7H-2.5V0H-6Z" fill="#fff"/>`; }
            }
        });
        if (sp.round) roads += `<circle cx="${RING.x}" cy="${RING.y}" r="${RING.r - ROAD - 1}" fill="#7bc96f" stroke="#5a9e4f" stroke-width="2"/>${[0, 120, 240].map(a => `<circle cx="${n(RING.x + Math.cos(a * Math.PI / 180) * 4)}" cy="${n(RING.y + Math.sin(a * Math.PI / 180) * 4)}" r="2.6" fill="${['#ff7ab6', '#ffd84a', '#fff'][a / 120]}"/>`).join('')}`;
        sp.to.forEach((to, i) => {
            const b = signBox(k, i), w = b.x1 - b.x0, h = SIGN_BOTTOM - SIGN_TOP, cx = signX(k, i), cy = (SIGN_TOP + SIGN_BOTTOM) / 2;
            if (to === ONE_WAY) top += `<g data-sign="${i}" data-one-way transform="translate(${cx} ${cy})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="none"/><g transform="scale(1.6)">${noEntry()}</g></g>`;
            else top += `<g data-sign="${i}" transform="translate(${cx} ${cy})">${panel(w, h)}${signPictures(l, id, i, w)}</g>`;
        });
        sp.to.forEach((to, i) => { if (to === ONE_WAY) return; const a = arrowAt(k, i, sp.round); top += `<g data-arrow="${i}" transform="translate(${n(a.x)} ${n(a.y)})"><g class="derapage-fleche"><g transform="rotate(${n(a.angle)})">${arrow()}</g></g></g>`; });
    } else if (sp.kind === 'ami') {
        top += `<g data-house="${sp.who}" transform="translate(${HOUSE_X} ${n(HOUSE.y1 - HOUSE_W * .62 * .9)})">${house(sp.who, HOUSE_W, false)}</g>`;
        top += `<g data-friend="${sp.who}" transform="translate(${(FRIEND.x0 + FRIEND.x1) / 2} ${(FRIEND.y0 + FRIEND.y1) / 2})"><g class="derapage-ami">${friendBody(sp.who)}</g><g data-gift-in-hands></g></g>`;
    } else top += `<g data-thing="${sp.fail}" transform="translate(${THING_AT.x} ${THING_AT.y})">${funnyThing(sp.fail)}</g>`;
    if (road.star) roads += starPoints(road.shape).map(p => `<g data-star-bend transform="translate(${n(p.x + (p.x < 90 ? -ROAD - 9 : ROAD + 9))} ${n(p.y)})"><path d="${STAR}" fill="#ffd23f" stroke="#46364a" stroke-width="1.2" class="derapage-scintille"/></g>`).join('');
    roads += dashes(pathD(main));
    if (road.deco === 'tunnel') {
        const x = decoX(road.shape);
        over += `<g data-hill><path d="M0 ${DECO_Y + 22}Q20 ${DECO_Y - 30} 90 ${DECO_Y - 28}Q160 ${DECO_Y - 30} 180 ${DECO_Y + 22}Z" fill="#6cbf5a" stroke="#4e9a3f" stroke-width="2"/><path d="M${x - 15} ${DECO_Y + 22}Q${x - 15} ${DECO_Y + 6} ${x} ${DECO_Y + 6}Q${x + 15} ${DECO_Y + 6} ${x + 15} ${DECO_Y + 22}" fill="#3b3346"/><path d="M${x - 15} ${DECO_Y - 16}Q${x - 15} ${DECO_Y - 30} ${x} ${DECO_Y - 30}Q${x + 15} ${DECO_Y - 30} ${x + 15} ${DECO_Y - 16}Z" fill="#3b3346" opacity=".9"/><circle cx="40" cy="${DECO_Y - 4}" r="3" fill="#ff7ab6"/><circle cx="140" cy="${DECO_Y - 2}" r="3" fill="#ffd84a"/></g>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${labels[locale].board}" data-screen="${id}">`
        + `<rect data-frame width="${W}" height="${H}" fill="#a8dc7c"/>${grass}${under}${roads}${top}<g data-kart><g class="derapage-corps">${kartChassis()}<g data-drift></g>${pilot()}</g></g>${over}<g data-effects></g></svg>`;
}
/** The row of parcels above the road: each friend's head and his gift (and his roof in the « roofs only » scenes), ticked
 * once delivered; then the drift stars caught. */
export function goalsHtml(s: State, l: LevelDef, locale: Locale): string {
    const t = labels[locale];
    return `<div class="derapage-goals" role="img" aria-label="${t.goals} : ${s.pending.length}">${l.deliver.map(f => `<span data-goal="${f}"${s.delivered.includes(f) ? ' data-got' : ''}>${svg(`<g transform="translate(12 44) scale(.9)">${house(f, 20, false)}</g><g transform="translate(33 30) scale(.9)">${friendHead(f)}</g><g transform="translate(54 40) scale(1.05)">${gift(f)}</g>`)}</span>`).join('')}<span class="derapage-bonus" aria-label="${t.bonusLabel} : ${s.bonus}"${s.bonus ? '' : ' hidden'}>★ ${s.bonus}</span></div>`;
}
export const hasStarBend = (l: LevelDef): boolean => Object.values(l.spots).some(sp => sp.road.star);
export function gameView(s: State, l: LevelDef, locale: Locale, message: string, reduce: boolean): string {
    const t = labels[locale], won = stars(s);
    const finish = s.finished ? `<div class="derapage-reward"><div class="stars" aria-label="${rewardLabel(won, locale)}">${'★'.repeat(won)}${'☆'.repeat(3 - won)}</div><div class="finish-actions"><button id="derapage-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="derapage-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    const driftButton = hasStarBend(l) ? `<button id="derapage-derape" class="derapage-derape" disabled><span aria-hidden="true">✦</span> ${t.drift}</button>` : '';
    return `<section class="derapage derapage-play"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header>`
        + `<div class="derapage-instruction"><div id="guide">${characterSvg('dragon', s.finished ? 'celebration' : 'joie', 'repos', reduce ? 'reduce' : 'full')}</div><p id="derapage-message" aria-live="polite">${typeset(message)}</p></div>`
        + goalsHtml(s, l, locale)
        + `<div class="derapage-stage"><div class="derapage-zone" tabindex="0" role="application" aria-label="${t.board}"></div>${finish}</div>${driftButton}</section>`;
}
