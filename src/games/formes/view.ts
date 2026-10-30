import { characterSvg } from '../../characters/svg';
import { levels, isUnlocked, stars, type Question, type Session } from '../../engines/formes';
import { text, rewardLabel, type Locale } from '../../shell/i18n';
import type { Save } from '../../shell/storage';
import { dots, icon } from '../../ui/svg';
import { colorNames, fills, name, shapeNames, shapeSvg } from './shapes';
export function instruction(q: Question, locale: Locale): string {
    if (q.mode === 'trier') return locale === 'fr' ? 'Glisse chaque forme dans la boîte de sa couleur.' : 'Slide each shape into the box of its colour.';
    if (q.mode === 'couleur') return locale === 'fr' ? `Touche le ${colorNames.fr[q.target.color][0]}.` : `Touch the ${colorNames.en[q.target.color][0]} shape.`;
    if (q.mode === 'forme') {
        const s = q.target.shape, article = s === 'etoile' || s === 'ovale' ? 'l’' : 'le ';
        return locale === 'fr' ? `Touche ${article}${shapeNames.fr[s]}.` : `Touch the ${shapeNames.en[s]}.`;
    }
    return `${locale === 'fr' ? 'Touche ' : 'Touch '}${name(q.target, locale, false, q.mode === 'taille')}.`;
}
export function levelView(save: Save): string {
    return `<header class="shapes-header"><button id="back" class="round" aria-label="${text(save.locale, 'home')}">${icon('home')}</button><h1>${text(save.locale, 'levels')}</h1></header><div class="level-guide">${characterSvg('pandaroux')}</div><div class="level-grid">${levels.map(l => `<button data-level="${l.id}" ${isUnlocked(l.id, save.formesRecords) ? '' : 'disabled'} aria-label="${l.id}"><b>${l.id}</b>${dots(l.id)}<small>${icon(l.mode === 'trier' ? 'basket' : 'eye')}</small><span>${'★'.repeat(save.formesRecords[l.id] ?? 0)}</span>${isUnlocked(l.id, save.formesRecords) ? '' : icon('lock')}</button>`).join('')}</div>`;
}
export function gameView(state: Session, locale: Locale, hint: boolean): string {
    const q = state.questions[state.index]!;
    const top = `<header class="play-header shapes-header"><button id="back" class="round" aria-label="${text(locale, 'home')}">${icon('home')}</button><div class="progress">${state.questions.map((_, i) => `<i class="${i < state.index || state.finished ? 'done' : i === state.index ? 'current' : ''}"></i>`).join('')}</div><button id="listen" class="round" aria-label="${text(locale, 'listen')}">${icon('ear')}</button></header>`;
    if (state.finished) return `${top}<section class="finish"><div class="celebration">${characterSvg('pandaroux', 'celebration', 'celebration', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full')}</div><h1>${text(locale, 'finished')}</h1><div class="stars" aria-label="${rewardLabel(stars(state.firstTry), locale)}">${'★'.repeat(stars(state.firstTry))}</div><div class="finish-actions"><button id="again">${icon('replay')}<span>${text(locale, 'again')}</span></button>${state.level < levels.length ? `<button id="next">${icon('arrow')}<span>${text(locale, 'next')}</span></button>` : ''}</div></section>`;
    const silhouette = q.mode !== 'couleur' && q.mode !== 'trier' ? shapeSvg(q.target, locale, true) : '';
    const swatch = q.mode !== 'forme' && q.mode !== 'taille' ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" data-swatch="${q.target.color}" aria-hidden="true"><circle cx="32" cy="32" r="27" fill="${fills[q.target.color]}" stroke="#403c39" stroke-width="3"/></svg>` : '';
    return `${top}<div class="instruction"><div id="guide">${characterSvg('pandaroux', state.errors && !state.solved ? 'surprise' : 'joie')}</div><div><div class="instruction-pic" data-mode="${q.mode}" data-target-shape="${q.target.shape}" data-target-color="${q.target.color}" data-target-size="${q.target.size}">${silhouette}${swatch}${q.mode === 'trier' ? icon('basket') : ''}${q.mode === 'taille' ? `<span class="size-cue ${q.target.size}" aria-hidden="true">${shapeSvg(q.target, locale, true)}</span>` : ''}</div><p>${instruction(q, locale)}</p></div></div><section class="question shapes-zone ${q.mode === 'trier' ? 'sort-zone' : ''}"><div class="shapes-grid">${q.choices.map((p, i) => `<button ${q.mode === 'trier' ? `data-piece="${i}"` : `data-answer="${i}"`} class="shape-choice ${hint && (q.mode === 'trier' ? !state.placed.includes(i) : q.answer === i) ? 'shape-hint' : ''} ${state.placed.includes(i) ? 'placed' : ''}" ${state.solved || state.placed.includes(i) ? 'disabled' : ''} aria-label="${name(p, locale, false, true)}">${shapeSvg(p, locale)}</button>`).join('')}</div>${q.mode === 'trier' ? `<div class="shape-boxes">${q.boxes.map((c, i) => `<button data-box="${i}" data-color="${c}" aria-label="${colorNames[locale][c][1]}" style="--box-color:${fills[c]}"><span aria-hidden="true">${icon('basket')}</span></button>`).join('')}</div>` : ''}</section><p id="feedback" aria-live="polite">${state.solved ? text(locale, 'bravo') : state.errors ? text(locale, 'tryAgain') : ''}</p>${state.solved ? `<button id="continue">${icon('arrow')}<span>${text(locale, 'continue')}</span></button>` : ''}`;
}
