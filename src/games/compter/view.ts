import { characterSvg } from '../../characters/svg';
import type { Expression } from '../../characters/model';
import { layoutObjects, levels, isUnlocked, stars, type Session, type Question, type ObjectKind } from '../../engines/compter';
import { text, type Locale } from '../../shell/i18n';
import type { Save } from '../../shell/storage';
import { icon, dots, objectSvg } from '../../ui/svg';
export function instruction(q: Question, locale: Locale): string {
    return text(locale, q.mode === 'plus' ? q.comparison === 'less' ? 'less' : 'more' : q.mode).replace('{n}', String(q.target)).replace('{object}', text(locale, q.object));
}
export function levelView(save: Save): string {
    return `<header><button id="back" class="round" aria-label="${text(save.locale, 'home')}">${icon('home')}</button><h1>${text(save.locale, 'levels')}</h1></header><div class="level-guide">${characterSvg('panda')}</div><div class="level-grid">${levels.map(l => `<button data-level="${l.id}" ${isUnlocked(l.id, save.records) ? '' : 'disabled'} aria-label="${l.id}"><b>${l.id}</b>${dots(l.id)}<small>${l.mode === 'combien' ? icon('eye') : l.mode === 'remplir' ? icon('basket') : icon('compare')}</small><span>${'★'.repeat(save.records[l.id] ?? 0)}</span>${isUnlocked(l.id, save.records) ? '' : icon('lock')}</button>`).join('')}</div>`;
}
function scene(n: number, kind: ObjectKind, seed: number, short = false): string {
    return `<svg class="objects" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 ${short ? 116 : 200}" aria-hidden="true">${layoutObjects(n, 288, short ? 116 : 200, seed).map((p, i) => `<g data-object="${i}" transform="translate(${p.x - 24} ${p.y - 24})"><circle class="halo" cx="24" cy="24" r="24"/>${objectSvg(kind).replace('<svg ', '<svg width="48" height="48" ')}</g>`).join('')}</svg>`;
}
function token(kind: ObjectKind, area: string, i: number): string { return `<button class="token" data-${area}="${i}" aria-label="${area === 'reserve' ? '+' : '−'} ${i + 1}">${objectSvg(kind)}</button>`; }
export function gameView(state: Session, locale: Locale, expression: Expression, hint: boolean): string {
    const q = state.questions[state.index]!;
    const top = `<header class="play-header"><button id="back" class="round" aria-label="${text(locale, 'home')}">${icon('home')}</button><div class="progress" aria-label="${state.index + 1}/6">${Array.from({ length: 6 }, (_, i) => `<i class="${i < state.index || state.finished ? 'done' : i === state.index ? 'current' : ''}"></i>`).join('')}</div><button id="listen" class="round" aria-label="${text(locale, 'listen')}">${icon('ear')}</button></header>`;
    if (state.finished) return `${top}<section class="finish"><div class="celebration">${characterSvg('panda', 'celebration', 'celebration', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full')}</div><h1>${text(locale, 'finished')}</h1><div class="stars" aria-label="${stars(state.firstTry)} étoiles">${'★'.repeat(stars(state.firstTry))}</div><div class="finish-actions"><button id="again">${icon('replay')}<span>${text(locale, 'again')}</span></button>${state.level < levels.length ? `<button id="next">${icon('arrow')}<span>${text(locale, 'next')}</span></button>` : ''}</div></section>`;
    let content: string;
    if (q.mode === 'combien') content = `${scene(q.target, q.object, q.seed)}<div class="answers">${q.choices.map(n => `<button data-answer="${n}" ${state.solved ? 'disabled' : ''}><b>${n}</b>${dots(n)}</button>`).join('')}</div>`;
    else if (q.mode === 'plus') content = `<div class="baskets">${[q.left, q.right].map((n, i) => `<button data-answer="${i}" class="comparison" ${state.solved ? 'disabled' : ''}>${scene(n, q.object, q.seed + i, true)}<span class="basket-rim"></span></button>`).join('')}</div>`;
    else content = `<div class="fill-zone"><div id="reserve" class="token-grid" aria-label="${text(locale, 'reserve')}">${Array.from({ length: q.reserve - state.basket }, (_, i) => token(q.object, 'reserve', i)).join('')}</div><div id="basket" class="token-grid basket" aria-label="${text(locale, 'basket')}">${Array.from({ length: state.basket }, (_, i) => token(q.object, 'basket', i)).join('') || icon('basket')}</div></div><button id="check" ${state.solved ? 'disabled' : ''}>${icon('check')}<span>${text(locale, 'check')}</span></button>`;
    return `${top}<div class="instruction"><div id="guide">${characterSvg('panda', expression)}</div><div><div class="instruction-pic">${icon(q.mode === 'combien' ? 'eye' : q.mode === 'remplir' ? 'basket' : 'compare')}${q.mode === 'remplir' ? `<b>${q.target}</b>${dots(q.target)}` : ''}</div><p>${instruction(q, locale)}</p></div></div><section class="question ${hint ? 'hint' : ''}">${content}</section><p id="feedback" aria-live="polite">${state.solved ? text(locale, 'bravo') : state.errors ? text(locale, 'tryAgain') : ''}</p>${state.solved ? `<button id="continue">${icon('arrow')}<span>${text(locale, 'continue')}</span></button>` : ''}`;
}
