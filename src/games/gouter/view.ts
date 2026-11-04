import { characterSvg } from '../../characters/svg';
import { BUBBLE_RADIUS, FIELD, levels, isUnlocked, TREAT_RADIUS, type Records, type State } from '../../engines/gouter';
import { rewardLabel, type Locale } from '../../shell/i18n';
import { dots, icon, svg } from '../../ui/svg';

export const labels = {
    fr: { title: 'Le goûter de Boubou', levels: 'Choisis un niveau', instruction: 'Coupe les ficelles avec ton doigt : le bonbon doit tomber dans la bouche de Boubou.', bubble: 'Touche la bulle pour la faire éclater.', won: 'Miam ! Merci !', lost: 'Oups ! Le bonbon est parti. On recommence.', again: 'Recommencer', next: 'Niveau suivant', list: 'Niveaux', home: 'Accueil', listen: 'Écouter', field: 'Le terrain : glisse ou touche une ficelle pour la couper', level: 'Niveau' },
    en: { title: "Boubou's snack", levels: 'Choose a level', instruction: 'Cut the strings with your finger: the sweet must fall into Boubou’s mouth.', bubble: 'Touch the bubble to pop it.', won: 'Yum! Thank you!', lost: 'Oops! The sweet got away. Let’s try again.', again: 'Try again', next: 'Next level', list: 'Levels', home: 'Home', listen: 'Listen', field: 'The play area: swipe or touch a string to cut it', level: 'Level' }
} as const;

/** A wrapped sweet with twisted ends: drawn here, used for the card, the level grid and the game. */
export function sweet(x = 0, y = 0, r = TREAT_RADIUS): string {
    const k = r / 13;
    return `<g data-sweet transform="translate(${x} ${y}) scale(${k})"><path d="M-12 0L-25 -10Q-28 0 -25 10Z M12 0L25 -10Q28 0 25 10Z" fill="#f6d76d" stroke="#58443b" stroke-width="2.4" stroke-linejoin="round"/><circle r="13" fill="url(#gouter-sweet)" stroke="#58443b" stroke-width="2.4"/><path d="M-7 -4Q0 -11 7 -4M-8 3Q0 -4 8 3" fill="none" stroke="#fff4f6" stroke-width="2.6" stroke-linecap="round"/></g>`;
}
const sweetGradient = '<radialGradient id="gouter-sweet" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffd3df"/><stop offset=".55" stop-color="#ee737a"/><stop offset="1" stop-color="#c24e66"/></radialGradient>';
export const pictogram = svg(`<defs>${sweetGradient.replace('gouter-sweet', 'gouter-sweet-card')}</defs><path d="M32 4V22" stroke="#9a6b44" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="5" r="4" fill="#b78c70" stroke="#58443b" stroke-width="2"/>${sweet(32, 36, 15).replace('url(#gouter-sweet)', 'url(#gouter-sweet-card)')}`);

const star = (x: number, y: number, r: number, attrs: string): string => {
    const points = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * .46 : r; return `${(x + Math.cos(a) * d).toFixed(1)} ${(y + Math.sin(a) * d).toFixed(1)}`; });
    return `<path ${attrs} d="M${points.join('L')}Z" fill="#f6cf63" stroke="#a7752c" stroke-width="2" stroke-linejoin="round"/>`;
};
export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="gouter"><header class="shapes-header"><button id="back" class="round" aria-label="${t.home}">${icon('home')}</button><h1>${t.levels}</h1></header><div class="level-guide">${characterSvg('panda')}</div><div class="level-grid">${levels.map(l => `<button data-gouter-level="${l.id}" ${isUnlocked(l.id, records) ? '' : 'disabled'} aria-label="${t.level} ${l.id}"><b>${l.id}</b>${dots(Math.min(l.id, 12))}<span>${'★'.repeat(records[l.id] ?? 0)}</span>${isUnlocked(l.id, records) ? '' : icon('lock')}</button>`).join('')}</div></section>`;
}
/** Paints the scenery once per level: sky, hills and the place where Boubou waits. */
function scenery(s: State): string {
    const high = s.mouth.y < FIELD.height / 2;
    const seat = high
        ? `<g fill="#ffffff" stroke="#b9d6e6" stroke-width="2"><ellipse cx="${s.mouth.x}" cy="${s.mouth.y + 62}" rx="64" ry="20"/><ellipse cx="${s.mouth.x - 34}" cy="${s.mouth.y + 52}" rx="26" ry="18"/><ellipse cx="${s.mouth.x + 30}" cy="${s.mouth.y + 50}" rx="30" ry="20"/></g>`
        : `<ellipse cx="${s.mouth.x}" cy="${s.mouth.y + 62}" rx="70" ry="16" fill="#81b382"/>`;
    return `<rect width="${FIELD.width}" height="${FIELD.height}" fill="url(#gouter-sky)"/><circle cx="278" cy="40" r="22" fill="#f8d982" opacity=".85"/><g fill="#fffdf5" opacity=".9"><path d="M30 70C14 58 36 46 50 54C56 38 88 42 90 56C112 54 114 72 96 74Z"/><path d="M190 120C176 110 194 100 206 106C212 92 238 96 240 108C258 106 262 122 246 124Z"/></g><path d="M0 400Q80 360 170 392Q250 360 320 388V440H0Z" fill="#badbb3"/><path d="M0 422Q120 396 210 416Q270 402 320 414V440H0Z" fill="#95c59c"/>${seat}`;
}
/** Boubou sits with the treat target on his mouth; his face changes with the outcome. */
function boubou(s: State): string {
    const scale = 120 / 240, x = s.mouth.x - 120 * scale, y = s.mouth.y - 150 * scale;
    const expression = s.status === 'won' ? 'celebration' : s.status === 'lost' ? 'surprise' : 'joie';
    const body = characterSvg('panda', expression, 'repos', 'reduce').replace(/<svg[^>]*>/, `<g data-boubou="${expression}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale})">`).replace(/<\/svg>$/, '</g>');
    return `${body}<g data-mouth><ellipse cx="${s.mouth.x}" cy="${s.mouth.y}" rx="13" ry="${s.status === 'won' ? 6 : 10}" fill="#6b3a3a" stroke="#58443b" stroke-width="2"/><ellipse cx="${s.mouth.x}" cy="${s.mouth.y + 4}" rx="7" ry="3.5" fill="#ef8c9a"/></g>`;
}
export function ropePath(r: { x: number; y: number; length: number }, end: { x: number; y: number }): string {
    const dx = end.x - r.x, dy = end.y - r.y, d = Math.hypot(dx, dy);
    const sag = Math.sqrt(Math.max(0, r.length * r.length - d * d)) * .5;
    return `M${r.x.toFixed(1)} ${r.y.toFixed(1)}Q${((r.x + end.x) / 2).toFixed(1)} ${((r.y + end.y) / 2 + sag).toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}
/** The whole play area. Moving parts carry data attributes so each frame only updates attributes. */
export function fieldSvg(s: State): string {
    const pegs = s.ropes.filter(r => r.hook === null).map(r => `<circle cx="${r.x}" cy="${r.y}" r="7" fill="#b78c70" stroke="#58443b" stroke-width="2.4"/><circle cx="${r.x - 2}" cy="${r.y - 2}" r="2" fill="#f2e1cf"/>`).join('');
    const hooks = s.hooks.map((h, i) => `<g data-hook="${i}" data-used="${h.used}"><circle cx="${h.x}" cy="${h.y}" r="${h.reach}" fill="#fff6d688" stroke="#c89536" stroke-width="2" stroke-dasharray="6 6"/><circle cx="${h.x}" cy="${h.y}" r="8" fill="#f4a269" stroke="#58443b" stroke-width="2.4"/></g>`).join('');
    const stars = s.starPoints.map((p, i) => star(p.x, p.y, 15, `data-star="${i}" data-taken="${s.stars[i]}"${s.stars[i] ? ' opacity="0"' : ''}`)).join('');
    const ropes = s.ropes.map((r, i) => `<path data-rope="${i}" data-cut="${r.cut}" d="${r.cut ? '' : ropePath(r, s.treat)}" fill="none" stroke="#9a6b44" stroke-width="4" stroke-linecap="round"/>`).join('');
    const bubbles = s.bubbles.map((b, i) => `<g data-bubble="${i}" data-state="${b.state}" transform="translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})"${b.state === 'popped' ? ' opacity="0"' : ''}><circle r="${BUBBLE_RADIUS}" fill="#d9f2ff66" stroke="#72b8ed" stroke-width="2.5"/><path d="M-12 -10Q-6 -17 3 -17" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/></g>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIELD.width} ${FIELD.height}" aria-hidden="true"><defs>${sweetGradient}<linearGradient id="gouter-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4f0f4"/><stop offset="1" stop-color="#fcf8ed"/></linearGradient></defs>${scenery(s)}${hooks}${boubou(s)}${stars}${ropes}${pegs}<g data-treat transform="translate(${s.treat.x.toFixed(1)} ${s.treat.y.toFixed(1)})">${sweet()}</g>${bubbles}<path data-swipe fill="none" stroke="#ffffffcc" stroke-width="6" stroke-linecap="round"/></svg>`;
}
export function gameView(s: State, locale: Locale): string {
    const t = labels[locale];
    const message = s.status === 'won' ? t.won : s.status === 'lost' ? t.lost : s.bubbles.length ? `${t.instruction} ${t.bubble}` : t.instruction;
    const finish = s.status === 'won' ? `<div class="gouter-reward"><div class="stars" aria-label="${rewardLabel(Math.max(1, s.stars.filter(Boolean).length), locale)}">${'★'.repeat(Math.max(1, s.stars.filter(Boolean).length))}${'☆'.repeat(3 - Math.max(1, s.stars.filter(Boolean).length))}</div><div class="finish-actions"><button id="gouter-again">${icon('replay')}<span>${t.again}</span></button>${s.level < levels.length ? `<button id="gouter-next">${icon('arrow')}<span>${t.next}</span></button>` : ''}</div></div>` : '';
    return `<section class="gouter"><header class="play-header shapes-header"><button id="back" class="round" aria-label="${t.list}">${icon('home')}</button><h1>${t.level} ${s.level}</h1><button id="gouter-restart" class="round" aria-label="${t.again}">${icon('replay')}</button><button id="listen" class="round" aria-label="${t.listen}">${icon('ear')}</button></header><div class="gouter-instruction"><div id="guide">${characterSvg('panda', s.status === 'won' ? 'celebration' : 'joie', 'repos', 'reduce')}</div><p id="gouter-message" aria-live="polite">${message}</p></div><div class="gouter-zone" role="application" aria-label="${t.field}" data-status="${s.status}">${fieldSvg(s)}</div>${finish}</section>`;
}
/** Per-frame update of the moving parts only. */
export function update(root: ParentNode, s: State): void {
    const field = root.querySelector('.gouter-zone svg'); if (!field) return;
    field.querySelector('[data-treat]')!.setAttribute('transform', `translate(${s.treat.x.toFixed(1)} ${s.treat.y.toFixed(1)})`);
    const ropes = field.querySelectorAll('[data-rope]');
    for (const [i, r] of s.ropes.entries()) {
        let el = ropes[i];
        if (!el) { field.querySelector('[data-treat]')!.insertAdjacentHTML('beforebegin', `<path data-rope="${i}" data-cut="false" fill="none" stroke="#9a6b44" stroke-width="4" stroke-linecap="round"/>`); el = field.querySelector(`[data-rope="${i}"]`)!; }
        el.setAttribute('data-cut', String(r.cut)); el.setAttribute('d', r.cut ? '' : ropePath(r, s.treat));
    }
    for (const [i, h] of s.hooks.entries()) field.querySelector(`[data-hook="${i}"]`)?.setAttribute('data-used', String(h.used));
    for (const [i, b] of s.bubbles.entries()) {
        const el = field.querySelector(`[data-bubble="${i}"]`)!;
        el.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`); el.setAttribute('data-state', b.state);
        if (b.state === 'popped') el.setAttribute('opacity', '0');
    }
    for (const [i, taken] of s.stars.entries()) { const el = field.querySelector(`[data-star="${i}"]`)!; el.setAttribute('data-taken', String(taken)); if (taken) el.setAttribute('opacity', '0'); }
}
