import { ids } from '../characters/model';
import { characterSvg } from '../characters/svg';
import { games } from '../registry';
import type { Save } from '../shell/storage';
import { text, rewardLabel } from '../shell/i18n';
import { icon, scenery } from './svg';
import { readRecords as gouterRecords } from '../games/gouter/interaction';
import { readRecords as chercheRecords } from '../games/cherche/interaction';
import { readRecords as promenadeRecords } from '../games/promenade/interaction';
import { readRecords as bullesRecords } from '../games/bulles/interaction';
import { readRecords as bonbonsRecords } from '../games/bonbons/interaction';
import { readRecords as traverseRecords } from '../games/traverse/interaction';
import { readRecords as caissesRecords } from '../games/caisses/interaction';
import { readRecords as chenilleRecords } from '../games/chenille/interaction';
import { readRecords as collierRecords } from '../games/collier/interaction';
import { readRecords as briquesRecords } from '../games/briques/interaction';
import { readRecords as fuseeRecords } from '../games/fusee/interaction';
import { readRecords as pepitesRecords } from '../games/pepites/interaction';
import { readRecords as dedaleRecords } from '../games/dedale/interaction';
import { readRecords as empiloRecords } from '../games/empilo/interaction';
import { readRecords as orbiteRecords } from '../games/orbite/interaction';
import { readRecords as essaimRecords } from '../games/essaim/interaction';
import { readRecords as cartonsRecords } from '../games/cartons/interaction';
import { readRecords as arrosoirRecords } from '../games/arrosoir/interaction';
import { readRecords as derapageRecords } from '../games/derapage/interaction';
import { readRecords as ferrailleRecords } from '../games/ferraille/interaction';
import { readRecords as eclosionRecords } from '../games/eclosion/interaction';
import { readRecords as taupesRecords } from '../games/taupes/interaction';
import { browserStorage } from '../shell/storage';
export function home(save: Save): string {
    return `<header class="home-heading"><div><p class="eyebrow">${text(save.locale, 'welcome')}</p><h1>Opencadkid</h1></div><button id="parents" class="round" aria-label="${text(save.locale, 'parents')}">${icon('gear')}</button></header>
    <section class="landscape" aria-label="Boubou, CaliRoux, Pestouille, Tutu, Lumi">${scenery()}<div class="cast">${ids.map(id => characterSvg(id)).join('')}</div></section>
    <div class="game-grid">${games.map(game => `<button class="game-card" data-game="${game.id}"><span class="card-picture">${game.pictogram}${characterSvg(game.guide, 'joie', 'repos', 'reduce')}</span><strong>${game.names[save.locale]}</strong><span>${game.skill[save.locale]}</span>${game.id === 'atelier' ? '' : `<span class="small-stars" aria-label="${rewardLabel(Math.max(0, ...Object.values(game.id === 'gouter' ? gouterRecords(browserStorage()) : game.id === 'cherche' ? chercheRecords(browserStorage()) : game.id === 'promenade' ? promenadeRecords(browserStorage()) : game.id === 'bulles' ? bullesRecords(browserStorage()) : game.id === 'bonbons' ? bonbonsRecords(browserStorage()) : game.id === 'traverse' ? traverseRecords(browserStorage()) : game.id === 'caisses' ? caissesRecords(browserStorage()) : game.id === 'chenille' ? chenilleRecords(browserStorage()) : game.id === 'collier' ? collierRecords(browserStorage()) : game.id === 'briques' ? briquesRecords(browserStorage()) : game.id === 'fusee' ? fuseeRecords(browserStorage()) : game.id === 'pepites' ? pepitesRecords(browserStorage()) : game.id === 'dedale' ? dedaleRecords(browserStorage()) : game.id === 'empilo' ? empiloRecords(browserStorage()) : game.id === 'orbite' ? orbiteRecords(browserStorage()) : game.id === 'essaim' ? essaimRecords(browserStorage()) : game.id === 'cartons' ? cartonsRecords(browserStorage()) : game.id === 'arrosoir' ? arrosoirRecords(browserStorage()) : game.id === 'derapage' ? derapageRecords(browserStorage()) : game.id === 'ferraille' ? ferrailleRecords(browserStorage()) : game.id === 'eclosion' ? eclosionRecords(browserStorage()) : game.id === 'taupes' ? taupesRecords(browserStorage()) : game.id === 'tambours' ? save.tamboursRecords : game.id === 'ranger' ? save.rangerRecords : game.id === 'suites' ? save.suitesRecords : game.id === 'chemin' ? save.cheminRecords : game.id === 'puzzle' ? save.puzzleRecords : game.id === 'sons' ? save.sonsRecords : game.id === 'formes' ? save.formesRecords : game.id === 'paires' ? save.pairesRecords : save.records).map(n => n ?? 0)), save.locale)}">${'★'.repeat(Math.max(0, ...Object.values(game.id === 'gouter' ? gouterRecords(browserStorage()) : game.id === 'cherche' ? chercheRecords(browserStorage()) : game.id === 'promenade' ? promenadeRecords(browserStorage()) : game.id === 'bulles' ? bullesRecords(browserStorage()) : game.id === 'bonbons' ? bonbonsRecords(browserStorage()) : game.id === 'traverse' ? traverseRecords(browserStorage()) : game.id === 'caisses' ? caissesRecords(browserStorage()) : game.id === 'chenille' ? chenilleRecords(browserStorage()) : game.id === 'collier' ? collierRecords(browserStorage()) : game.id === 'briques' ? briquesRecords(browserStorage()) : game.id === 'fusee' ? fuseeRecords(browserStorage()) : game.id === 'tambours' ? save.tamboursRecords : game.id === 'ranger' ? save.rangerRecords : game.id === 'suites' ? save.suitesRecords : game.id === 'chemin' ? save.cheminRecords : game.id === 'puzzle' ? save.puzzleRecords : game.id === 'sons' ? save.sonsRecords : game.id === 'formes' ? save.formesRecords : game.id === 'paires' ? save.pairesRecords : save.records).map(n => n ?? 0))) || '☆ ☆ ☆'}</span>`}</button>`).join('')}
    <button id="tictac" class="game-card clock-card">${icon('clock')}<strong>TicTac</strong><span>${text(save.locale, 'clock')}</span>${icon('lock')}</button></div>`;
}
