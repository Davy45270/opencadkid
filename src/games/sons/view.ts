import { characterSvg } from '../../characters/svg';
import { levels, isUnlocked, stars, phoneme, type Question, type Session } from '../../engines/sons';
import { text, rewardLabel, type Locale } from '../../shell/i18n';
import type { Save } from '../../shell/storage';
import { dots, icon } from '../../ui/svg';
import { motifSvg } from './motifs';
export function instruction(q: Question, locale: Locale): string {
    return text(locale, q.mode === 'lettre-image' ? 'soundsFindImage' : q.mode === 'trier' ? 'soundsSort' : 'soundsFindLetter');
}
export function spoken(q: Question, locale: Locale, hint = false, piece?: number): string[] {
    const word = piece === undefined ? q.target : q.choices[piece]!;
    const sound = phoneme(word.initial, locale);
    if (hint) return [`${sound}… ${word.word}`, sound];
    if (q.mode === 'son-lettre') return [sound, instruction(q, locale)];
    if (q.mode === 'trier' && piece === undefined) return [instruction(q, locale), ...q.choices.flatMap(w => [w.word, phoneme(w.initial, locale)])];
    if (q.mode === 'lettre-image' && piece === undefined) return [sound, instruction(q, locale), ...q.choices.flatMap(w => [w.word, phoneme(w.initial, locale)])];
    return [word.word, sound, instruction(q, locale)];
}
const letter = (initial: string, lowercase: boolean): string => `<span class="sound-letter" data-letter="${initial}">${lowercase ? initial.toLowerCase() : initial}</span>`;
export function levelView(save: Save): string {
    return `<header class="shapes-header"><button id="back" class="round" aria-label="${text(save.locale, 'home')}">${icon('home')}</button><h1>${text(save.locale, 'levels')}</h1></header><div class="level-guide">${characterSvg('singe')}</div><div class="level-grid">${levels.map(l => `<button data-level="${l.id}" ${isUnlocked(l.id, save.sonsRecords) ? '' : 'disabled'} aria-label="${l.id}"><b>${l.id}</b>${dots(l.id)}<small>${icon(l.mode === 'trier' ? 'basket' : 'ear')}</small><span>${'★'.repeat(save.sonsRecords[l.id] ?? 0)}</span>${isUnlocked(l.id, save.sonsRecords) ? '' : icon('lock')}</button>`).join('')}</div>`;
}
export function gameView(state: Session, locale: Locale, hint: boolean, hintPiece = 0): string {
    const q = state.questions[state.index]!;
    const top = `<header class="play-header shapes-header"><button id="back" class="round" aria-label="${text(locale, 'home')}">${icon('home')}</button><div class="progress">${state.questions.map((_, i) => `<i class="${i < state.index || state.finished ? 'done' : i === state.index ? 'current' : ''}"></i>`).join('')}</div><button id="listen" class="round" aria-label="${text(locale, 'listen')}">${icon('ear')}</button></header>`;
    if (state.finished) return `${top}<section class="finish"><div class="celebration">${characterSvg('singe', 'celebration', 'celebration', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full')}</div><h1>${text(locale, 'finished')}</h1><div class="stars" aria-label="${rewardLabel(stars(state.firstTry), locale)}">${'★'.repeat(stars(state.firstTry))}</div><div class="finish-actions"><button id="again">${icon('replay')}<span>${text(locale, 'again')}</span></button>${state.level < levels.length ? `<button id="next">${icon('arrow')}<span>${text(locale, 'next')}</span></button>` : ''}</div></section>`;
    const images = q.mode === 'lettre-image' || q.mode === 'trier';
    const cue = q.mode === 'image-lettre' ? motifSvg(q.target) : q.mode === 'lettre-image' ? letter(q.target.initial, q.lowercase) : icon('ear');
    return `${top}<div class="instruction sons-instruction"><div id="guide">${characterSvg('singe', state.errors && !state.solved ? 'surprise' : 'joie')}</div><div><div class="sons-prompt ${hint && q.mode === 'lettre-image' ? 'shape-hint' : ''}" data-mode="${q.mode}" data-initial="${q.target.initial}">${cue}</div><p>${instruction(q, locale)}</p></div></div><section class="question sons-zone ${q.mode === 'trier' ? 'sort-zone' : ''}"><div class="sons-grid" style="--sound-columns:${[3, 5, 6].includes(images ? q.choices.length : q.letters.length) ? 3 : 2}">${(images ? q.choices : q.letters).map((_, i) => `<button ${q.mode === 'trier' ? `data-sound-piece="${i}"` : `data-answer="${i}"`} class="sound-choice ${hint && q.mode !== 'trier' && q.answer === i ? 'shape-hint' : ''} ${state.placed.includes(i) ? 'placed' : ''}" ${state.solved || state.placed.includes(i) ? 'disabled' : ''} aria-label="${images ? q.choices[i]!.word : q.letters[i]!}">${images ? motifSvg(q.choices[i]!) : letter(q.letters[i]!, q.lowercase)}</button>`).join('')}</div>${q.mode === 'trier' ? `<div class="sound-boxes">${q.boxes.map((b, i) => `<button data-sound-box="${i}" class="${hint && b === q.choices[hintPiece]!.initial ? 'shape-hint' : ''}" aria-label="${b}">${letter(b, q.lowercase)}</button>`).join('')}</div>` : ''}</section><p id="feedback" aria-live="polite">${state.solved ? text(locale, 'bravo') : state.errors ? text(locale, 'tryAgain') : ''}</p>${state.solved ? `<button id="continue">${icon('arrow')}<span>${text(locale, 'continue')}</span></button>` : ''}`;
}
