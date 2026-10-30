import { ids } from '../characters/model';
import { characterSvg } from '../characters/svg';
import { games } from '../registry';
import type { Save } from '../shell/storage';
import { text, rewardLabel } from '../shell/i18n';
import { icon, scenery } from './svg';
export function home(save: Save): string {
    return `<header class="home-heading"><div><p class="eyebrow">${text(save.locale, 'welcome')}</p><h1>Opencadkid</h1></div><button id="parents" class="round" aria-label="${text(save.locale, 'parents')}">${icon('gear')}</button></header>
    <section class="landscape" aria-label="Boubou, CaliRoux, Pestouille, Tutu, Lumi">${scenery()}<div class="cast">${ids.map(id => characterSvg(id)).join('')}</div></section>
    <div class="game-grid">${games.map(game => `<button class="game-card" data-game="${game.id}"><span class="card-picture">${game.pictogram}${characterSvg(game.guide)}</span><strong>${game.names[save.locale]}</strong><span>${game.skill[save.locale]}</span><span class="small-stars" aria-label="${rewardLabel(Math.max(0, ...Object.values(game.id === 'chemin' ? save.cheminRecords : game.id === 'puzzle' ? save.puzzleRecords : game.id === 'sons' ? save.sonsRecords : game.id === 'formes' ? save.formesRecords : game.id === 'paires' ? save.pairesRecords : save.records).map(n => n ?? 0)), save.locale)}">${'★'.repeat(Math.max(0, ...Object.values(game.id === 'chemin' ? save.cheminRecords : game.id === 'puzzle' ? save.puzzleRecords : game.id === 'sons' ? save.sonsRecords : game.id === 'formes' ? save.formesRecords : game.id === 'paires' ? save.pairesRecords : save.records).map(n => n ?? 0))) || '☆ ☆ ☆'}</span></button>`).join('')}
    <button id="tictac" class="game-card clock-card">${icon('clock')}<strong>TicTac</strong><span>${text(save.locale, 'clock')}</span>${icon('lock')}</button></div>`;
}
