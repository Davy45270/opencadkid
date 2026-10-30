import { characterSvg } from '../../characters/svg';
import { key, levels, isUnlocked, stars, type Item, type Question, type Session } from '../../engines/suites';
import { text, rewardLabel, type Locale } from '../../shell/i18n';
import type { Save } from '../../shell/storage';
import { dots, icon } from '../../ui/svg';
import { itemSvg, name, pictogram } from './items';
export { pictogram } from './items';
export function instruction(q: Question, locale: Locale): string { return text(locale, q.mode === 'trou' ? 'patternsHole' : q.mode === 'deux-suivants' ? 'patternsTwo' : 'patternsNext'); }
export function hintSpeech(q: Question, locale: Locale): string[] {
    const base = q.mode === 'croissant' ? q.sequence.filter((p): p is Item => p !== null) : q.pattern;
    const phrase = base.map(p => name(p, locale)).join(' ; ');
    return [phrase, `${phrase}…`];
}
function attributes(p: Item): string { return `data-item="${key(p)}" data-shape="${p.shape}" data-color="${p.color}" data-dots="${p.dots}"`; }
export function levelView(save: Save): string {
    return `<header class="shapes-header"><button id="back" class="round" aria-label="${text(save.locale, 'home')}">${icon('home')}</button><h1>${text(save.locale, 'levels')}</h1></header><div class="level-guide">${characterSvg('licorne')}</div><div class="level-grid">${levels.map(l => `<button data-level="${l.id}" ${isUnlocked(l.id, save.suitesRecords) ? '' : 'disabled'} aria-label="${l.id}"><b>${l.id}</b>${dots(l.id)}<small>${pictogram}</small><span>${'★'.repeat(save.suitesRecords[l.id] ?? 0)}</span>${isUnlocked(l.id, save.suitesRecords) ? '' : icon('lock')}</button>`).join('')}</div>`;
}
export function gameView(state: Session, locale: Locale, hint: boolean): string {
    const top = `<header class="play-header shapes-header"><button id="back" class="round" aria-label="${text(locale, 'home')}">${icon('home')}</button><div class="progress">${state.questions.map((_, i) => `<i class="${i < state.index || state.finished ? 'done' : i === state.index ? 'current' : ''}"></i>`).join('')}</div><button id="listen" class="round" aria-label="${text(locale, 'listen')}">${icon('ear')}</button></header>`;
    if (state.finished) return `${top}<section class="finish"><div class="celebration">${characterSvg('licorne', 'celebration', 'celebration', typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full')}</div><h1>${text(locale, 'finished')}</h1><div class="stars" aria-label="${rewardLabel(stars(state.firstTry), locale)}">${'★'.repeat(stars(state.firstTry))}</div><div class="finish-actions"><button id="again">${icon('replay')}<span>${text(locale, 'again')}</span></button>${state.level < levels.length ? `<button id="next">${icon('arrow')}<span>${text(locale, 'next')}</span></button>` : ''}</div></section>`;
    const q = state.questions[state.index]!;
    return `${top}<div class="instruction suites-instruction"><div id="guide">${characterSvg('licorne', state.errors && !state.solved ? 'surprise' : 'joie')}</div><div><div class="instruction-pic">${icon('eye')}${icon('arrow')}</div><p>${instruction(q, locale)}</p></div></div><section class="question suites-zone ${q.mode === 'deux-suivants' ? 'suites-drag-zone' : ''}" data-mode="${q.mode}"><div class="suites-sequence">${q.sequence.map((item, i) => {
        const slot = q.slots.indexOf(i), p = item ?? (slot < state.placed.length ? q.choices[state.placed[slot]!] : null);
        return `<div data-slot="${i}" data-missing="${item === null}" class="suites-slot ${!p ? 'suites-empty' : ''} ${slot === state.placed.length ? 'suites-active' : ''} ${hint && i < (q.pattern.length || 4) ? 'suites-base' : ''}" ${p ? attributes(p) : ''}>${p ? itemSvg(p, locale) : icon('arrow')}</div>`;
    }).join('')}</div><div class="suites-choices">${q.choices.map((p, i) => `<button data-pattern-choice="${i}" ${attributes(p)} class="suites-choice" ${state.solved ? 'disabled' : ''} aria-label="${name(p, locale)}">${itemSvg(p, locale)}</button>`).join('')}</div></section><p id="feedback" aria-live="polite">${state.solved ? text(locale, 'bravo') : state.errors ? text(locale, 'tryAgain') : ''}</p>${state.solved ? `<button id="continue">${icon('arrow')}<span>${text(locale, 'continue')}</span></button>` : ''}`;
}
