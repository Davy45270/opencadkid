import { levelOf, levels, placementCells, type Records, type State } from '../../engines/motsmeles';
import type { Locale } from '../../shell/i18n';
import { icon } from '../../ui/svg';
import { owl } from './art';

export { pictogram } from './art';
export const labels = {
    fr: {
        title: 'Mystère des mots', levels: 'Choisis un niveau.', back: 'Retour', owl: 'La chouette',
        right: 'Glisse ton doigt sur un mot, de gauche à droite.', both: 'Glisse ton doigt sur un mot, vers la droite ou vers le bas.',
        listen: 'Écouter', grid: 'Grille de lettres', words: 'Mots à trouver', found: 'Trouvé',
        bravo: 'Bravo !', again: 'Rejouer', next: 'Niveau suivant', completed: 'Terminé',
    },
    en: {
        title: 'Word mystery', levels: 'Choose a level.', back: 'Back', owl: 'The owl',
        right: 'Slide across a word from left to right.', both: 'Slide across a word to the right or down.',
        listen: 'Listen', grid: 'Letter grid', words: 'Words to find', found: 'Found',
        bravo: 'Well done!', again: 'Play again', next: 'Next level', completed: 'Completed',
    },
};

export function instruction(state: State, locale: Locale): string {
    return labels[locale][state.level === 1 ? 'right' : 'both'];
}

const backButton = (label: string): string => `<button id="back" class="round" aria-label="${label}">${icon('arrow')}</button>`;

export function levelView(records: Records, locale: Locale): string {
    const t = labels[locale];
    return `<section class="motsmeles-levels">
        <header>${backButton(t.back)}<h1>${t.title}</h1></header>
        <div class="motsmeles-level-guide">${owl(t.owl)}<p>${t.levels}</p></div>
        <div class="motsmeles-level-list">${levels.map(level => `<button data-motsmeles-level="${level.id}">
            <strong>${level.name[locale]}</strong><span>${level.size} × ${level.size}</span>
            ${records[level.id] ? `<span aria-label="${t.completed}">★</span>` : ''}
        </button>`).join('')}</div>
    </section>`;
}

export function gameView(state: State, locale: Locale): string {
    const t = labels[locale], { grid } = state;
    const found = new Set(grid.placements.filter(p => state.found.includes(p.word)).flatMap(p => placementCells(grid.size, p)));
    return `<section class="motsmeles-play${state.finished ? ' motsmeles-won' : ''}">
        <header class="motsmeles-header">${backButton(t.back)}<h1>${levelOf(state.level).name[locale]}</h1></header>
        <div class="motsmeles-guide">
            <div class="motsmeles-owl-frame">${owl(t.owl)}</div>
            <div class="motsmeles-bubble">
                <p id="motsmeles-message" role="status">${state.finished ? t.bravo : instruction(state, locale)}</p>
                <button type="button" class="motsmeles-listen" data-motsmeles-instruction aria-label="${t.listen}">${icon('ear')}</button>
            </div>
        </div>
        <div class="motsmeles-board">
            <div class="motsmeles-grid" role="group" aria-label="${t.grid}" style="--size:${grid.size}">
                ${grid.letters.map((letter, i) => `<button type="button" class="motsmeles-cell" data-motsmeles-cell="${i}"
                    aria-pressed="false" tabindex="${i === 0 ? 0 : -1}"${found.has(i) ? ' data-found' : ''}>${letter}</button>`).join('')}
            </div>
        </div>
        <div class="motsmeles-words">
            <ul aria-label="${t.words}">${grid.placements.map(({ word }) => `<li class="motsmeles-word" data-motsmeles-word="${word}"${state.found.includes(word) ? ' data-found' : ''}>
                <strong>${word}</strong><span class="motsmeles-check" aria-label="${t.found}">✓</span>
                <button type="button" class="motsmeles-listen" data-motsmeles-listen="${word}" aria-label="${t.listen} ${word}">${icon('ear')}</button>
            </li>`).join('')}</ul>
            <div class="motsmeles-actions"${state.finished ? '' : ' hidden'}>
                <button type="button" data-motsmeles-again>${t.again}</button>
                <button type="button" data-motsmeles-next${state.level === levels.length ? ' hidden' : ''}>${t.next}</button>
            </div>
        </div>
    </section>`;
}
