import { characterSvg } from '../../characters/svg';
import type { Expression } from '../../characters/model';
import { layoutObjects, levels, isUnlocked, stars, type Session, type Question, type ObjectKind } from '../../engines/compter';
import { text, rewardLabel, type Locale } from '../../shell/i18n';
import type { Save } from '../../shell/storage';
import { icon, dots, objectSvg } from '../../ui/svg';
const nouns: Record<Locale, Record<ObjectKind, readonly [string, string, string]>> = {
    fr: { apple: ['pomme', 'pommes', 'une'], pear: ['poire', 'poires', 'une'], berry: ['fraise', 'fraises', 'une'], carrot: ['carotte', 'carottes', 'une'], star: ['étoile', 'étoiles', 'une'], fish: ['poisson', 'poissons', 'un'], flower: ['fleur', 'fleurs', 'une'] },
    en: { apple: ['apple', 'apples', 'one'], pear: ['pear', 'pears', 'one'], berry: ['strawberry', 'strawberries', 'one'], carrot: ['carrot', 'carrots', 'one'], star: ['star', 'stars', 'one'], fish: ['fish', 'fish', 'one'], flower: ['flower', 'flowers', 'one'] }
};
export function instruction(q: Question, locale: Locale, oral = false): string {
    const [singular, plural, one] = nouns[locale][q.object];
    if (q.decoy) return text(locale, 'combienOf').replace('{object}', plural);
    return text(locale, q.mode === 'plus' ? q.comparison === 'less' ? 'less' : 'more' : q.mode).replace('{n}', oral && q.target === 1 ? one : String(q.target)).replace('{object}', q.target === 1 ? singular : plural);
}
export function levelView(save: Save): string {
    return `<header><button id="back" class="round" aria-label="${text(save.locale, 'home')}">${icon('home')}</button><h1>${text(save.locale, 'levels')}</h1></header><div class="level-guide">${characterSvg('panda')}</div><div class="level-grid">${levels.map(l => `<button data-level="${l.id}" ${isUnlocked(l.id, save.records) ? '' : 'disabled'} aria-label="${l.id}"><b>${l.id}</b>${dots(Math.min(l.id, 10))}<small>${l.mode === 'melange' ? icon('replay') : l.decoys ? objectSvg('apple') : l.mode === 'combien' ? icon('eye') : l.mode === 'remplir' ? icon('basket') : icon('compare')}</small><span>${'★'.repeat(save.records[l.id] ?? 0)}</span>${isUnlocked(l.id, save.records) ? '' : icon('lock')}</button>`).join('')}</div>`;
}
function scene(n: number, kind: ObjectKind, seed: number, decoy?: Question['decoy']): string {
    const size = 52, radius = size / 2;
    // CSS pixels throughout: no parent SVG transform can shrink the objects. Layout cells are shuffled, so decoys
    // listed after the counted objects still land anywhere in the scene, while the shared two-error hint, which
    // counts the first n objects in document order, highlights only the requested kind.
    return `<div class="objects" aria-hidden="true">${layoutObjects(n + (decoy?.count ?? 0), 280, 216, seed).map((p, i) => { const k = i < n ? kind : decoy!.object; return `<span data-object="${i}" data-kind="${k}" style="left:${p.x - radius}px;top:${p.y - radius}px">${objectSvg(k)}</span>`; }).join('')}</div>`;
}
function token(kind: ObjectKind, area: string, i: number): string { return `<button class="token" data-${area}="${i}" aria-label="${area === 'reserve' ? '+' : '−'} ${i + 1}">${objectSvg(kind)}</button>`; }
export function gameView(state: Session, locale: Locale, expression: Expression, hint: boolean): string {
    const q = state.questions[state.index]!;
    const top = `<header class="play-header"><button id="back" class="round" aria-label="${text(locale, 'home')}">${icon('home')}</button><div class="progress" aria-label="${state.index + 1}/6">${Array.from({ length: 6 }, (_, i) => `<i class="${i < state.index || state.finished ? 'done' : i === state.index ? 'current' : ''}"></i>`).join('')}</div><button id="listen" class="round" aria-label="${text(locale, 'listen')}">${icon('ear')}</button></header>`;
    if (state.finished) return `${top}<section class="finish"><div class="celebration">${characterSvg('panda', 'celebration', 'celebration', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full')}</div><h1>${text(locale, 'finished')}</h1><div class="stars" aria-label="${rewardLabel(stars(state.firstTry), locale)}">${'★'.repeat(stars(state.firstTry))}</div><div class="finish-actions"><button id="again">${icon('replay')}<span>${text(locale, 'again')}</span></button>${state.level < levels.length ? `<button id="next">${icon('arrow')}<span>${text(locale, 'next')}</span></button>` : ''}</div></section>`;
    let content: string;
    if (q.mode === 'combien') content = `${scene(q.target, q.object, q.seed, q.decoy)}<div class="answers">${q.choices.map(n => `<button data-answer="${n}" ${state.solved ? 'disabled' : ''}><b>${n}</b>${dots(n)}</button>`).join('')}</div>`;
    else if (q.mode === 'plus') content = `<div class="baskets">${[q.left, q.right].map((n, i) => `<button data-answer="${i}" class="comparison" ${state.solved ? 'disabled' : ''}>${scene(n, q.object, q.seed + i)}<span class="basket-rim"></span></button>`).join('')}</div>`;
    else content = `<div class="fill-zone"><div id="reserve" class="token-grid" aria-label="${text(locale, 'reserve')}">${Array.from({ length: q.reserve - state.basket }, (_, i) => token(q.object, 'reserve', i)).join('')}</div><div id="basket" class="token-grid basket" aria-label="${text(locale, 'basket')}">${Array.from({ length: state.basket }, (_, i) => token(q.object, 'basket', i)).join('') || icon('basket')}</div></div><button id="check" ${state.solved ? 'disabled' : ''}>${icon('check')}<span>${text(locale, 'check')}</span></button>`;
    return `${top}<div class="instruction"><div id="guide">${characterSvg('panda', expression)}</div><div><div class="instruction-pic">${icon(q.mode === 'combien' ? 'eye' : q.mode === 'remplir' ? 'basket' : 'compare')}${q.mode === 'remplir' ? `<b>${q.target}</b>${dots(q.target)}` : ''}${q.decoy ? objectSvg(q.object) : ''}</div><p>${instruction(q, locale)}</p></div></div><section class="question ${hint ? 'hint' : ''}">${content}</section><p id="feedback" aria-live="polite">${state.solved ? text(locale, 'bravo') : state.errors ? text(locale, 'tryAgain') : ''}</p>${state.solved ? `<button id="continue">${icon('arrow')}<span>${text(locale, 'continue')}</span></button>` : ''}`;
}
