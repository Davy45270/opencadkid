import { characterSvg } from '../../characters/svg';
import { levels, isUnlocked, notes, sequence, stars, type Session } from '../../engines/tambours';
import { text, rewardLabel, type Locale } from '../../shell/i18n';
import type { Save } from '../../shell/storage';
import { svg, dots, icon } from '../../ui/svg';
import { volume } from '../../ui/illustration';
export const shapes = ['rond', 'triangle', 'carre', 'etoile', 'losange', 'coeur'] as const;
const colors = ['#df8979', '#8badd2', '#e4c36f', '#8fbd9c', '#b29acb', '#e3a878'];
const names = { fr: ['rond', 'triangle', 'carré', 'étoile', 'losange', 'cœur'], en: ['circle', 'triangle', 'square', 'star', 'diamond', 'heart'] };
export function drumName(drum: number, locale: Locale): string { return names[locale][drum]!; }
export function drumSvg(drum: number): string {
    const marks = ['<circle cx="50" cy="36" r="16"/>', '<path d="M50 17L69 50H31Z"/>', '<rect x="34" y="20" width="32" height="32" rx="3"/>', '<path d="M50 16L56 29L71 31L60 42L63 56L50 49L37 56L40 42L29 31L44 29Z"/>', '<path d="M50 16L70 36L50 56L30 36Z"/>', '<path d="M50 54Q17 34 32 22Q43 15 50 28Q57 15 68 22Q83 34 50 54Z"/>'];
    return svg(volume(`<ellipse cx="50" cy="88" rx="42" ry="7" fill="#c7c5ae"/><path d="M6 35L14 82Q50 99 86 82L94 35Z" fill="${colors[drum]}" stroke="#58443b" stroke-width="3"/><path d="M20 50L26 83M80 50L74 83" stroke="#fff4d9" stroke-width="4"/><ellipse cx="50" cy="35" rx="44" ry="30" fill="#fff1cf" stroke="#58443b" stroke-width="3"/><g fill="${colors[drum]}" stroke="#58443b" stroke-width="2">${marks[drum]}</g>`), '0 0 100 100');
}
export const pictogram = drumSvg(0);
export function instruction(state: Session, locale: Locale, listening = false): string { return text(locale, listening ? 'drumsListen' : levels[state.level - 1]!.mode === 'libre' ? 'drumsFree' : 'drumsTurn'); }
export function levelView(save: Save): string {
    return `<header class="shapes-header"><button id="back" class="round" aria-label="${text(save.locale, 'home')}">${icon('home')}</button><h1>${text(save.locale, 'levels')}</h1></header><div class="level-guide">${characterSvg('singe')}</div><div class="level-grid">${levels.map(l => `<button data-level="${l.id}" ${isUnlocked(l.id, save.tamboursRecords) ? '' : 'disabled'} aria-label="${l.id}"><b>${l.id}</b>${dots(l.id)}<small>${pictogram}</small><span>${'★'.repeat(save.tamboursRecords[l.id] ?? 0)}</span>${isUnlocked(l.id, save.tamboursRecords) ? '' : icon('lock')}</button>`).join('')}</div>`;
}
export function gameView(state: Session, locale: Locale): string {
    const spec = levels[state.level - 1]!;
    const top = `<header class="play-header shapes-header"><button id="back" class="round" aria-label="${text(locale, 'home')}">${icon('home')}</button><div class="progress">${state.questions.map((_, i) => `<i class="${i < state.index || state.finished ? 'done' : i === state.index ? 'current' : ''}"></i>`).join('')}</div><button id="listen" class="round" aria-label="${text(locale, 'listen')}">${icon('ear')}</button></header>`;
    if (state.finished) return `${top}<section class="finish"><div class="celebration">${characterSvg('singe', 'celebration')}</div><h1>${text(locale, 'finished')}</h1><div class="stars" aria-label="${rewardLabel(stars(state), locale)}">${'★'.repeat(stars(state))}</div><div class="finish-actions"><button id="again">${icon('replay')}<span>${text(locale, 'again')}</span></button>${state.level < levels.length ? `<button id="next">${icon('arrow')}<span>${text(locale, 'next')}</span></button>` : ''}</div></section>`;
    return `${top}<div class="instruction"><div id="guide">${characterSvg('singe')}</div><div><div class="instruction-pic" id="drums-cue">${icon('ear')}</div><p id="drums-instruction">${instruction(state, locale, spec.mode !== 'libre')}</p></div></div><section class="tambours-zone" data-mode="${spec.mode}" data-phase="listening" data-tempo="${state.tempo}"><div class="tambours-arc">${Array.from({ length: spec.drums }, (_, d) => `<button data-drum="${d}" data-note="${notes[d]}" data-shape="${shapes[d]}" data-lit="false" data-hint="${state.hint && sequence(state)[state.cursor] === d}" aria-label="${drumName(d, locale)}">${drumSvg(d)}</button>`).join('')}</div><div class="tambours-beats">${Array.from({ length: state.length }, (_, i) => `<i data-beat="${i}" data-played="${i < state.cursor}"></i>`).join('')}</div></section><p id="feedback" aria-live="polite"></p><button id="continue" hidden>${icon('arrow')}<span>${text(locale, 'continue')}</span></button>`;
}
