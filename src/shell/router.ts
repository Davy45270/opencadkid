import { bindDragEnd } from './drag';
import { mount as mountAtelier, snapshot as atelierSnapshot, type Studio } from '../games/atelier/interaction';
import { labels as atelierLabels } from '../games/atelier/view';
import { eraseGallery, readDraft } from '../games/atelier/storage';
import { mount as mountGouter, readRecords as readGouterRecords, writeRecords as writeGouterRecords, snapshot as gouterSnapshot, type Session as GouterSession } from '../games/gouter/interaction';
import { labels as gouterLabels } from '../games/gouter/view';
import { mount as mountCherche, readRecords as readChercheRecords, writeRecords as writeChercheRecords, snapshot as chercheSnapshot, type Session as ChercheSession } from '../games/cherche/interaction';
import { labels as chercheLabels } from '../games/cherche/view';
import { mount as mountPromenade, readRecords as readPromenadeRecords, writeRecords as writePromenadeRecords, snapshot as promenadeSnapshot, type Session as PromenadeSession } from '../games/promenade/interaction';
import { labels as promenadeLabels } from '../games/promenade/view';
import { mount as mountBulles, readRecords as readBullesRecords, writeRecords as writeBullesRecords, snapshot as bullesSnapshot, type Session as BullesSession } from '../games/bulles/interaction';
import { labels as bullesLabels } from '../games/bulles/view';
import { mount as mountBonbons, readRecords as readBonbonsRecords, writeRecords as writeBonbonsRecords, snapshot as bonbonsSnapshot, type Session as BonbonsSession } from '../games/bonbons/interaction';
import { labels as bonbonsLabels } from '../games/bonbons/view';
import { mount as mountTraverse, readRecords as readTraverseRecords, writeRecords as writeTraverseRecords, snapshot as traverseSnapshot, type Session as TraverseSession } from '../games/traverse/interaction';
import { labels as traverseLabels } from '../games/traverse/view';
import { mount as mountCaisses, readRecords as readCaissesRecords, writeRecords as writeCaissesRecords, snapshot as caissesSnapshot, type Session as CaissesSession } from '../games/caisses/interaction';
import { labels as caissesLabels } from '../games/caisses/view';
import { mount as mountChenille, readRecords as readChenilleRecords, writeRecords as writeChenilleRecords, snapshot as chenilleSnapshot, type Session as ChenilleSession } from '../games/chenille/interaction';
import { labels as chenilleLabels } from '../games/chenille/view';
import { mount as mountCollier, readRecords as readCollierRecords, writeRecords as writeCollierRecords, snapshot as collierSnapshot, type Session as CollierSession } from '../games/collier/interaction';
import { labels as collierLabels } from '../games/collier/view';
import { mount as mountBriques, readRecords as readBriquesRecords, writeRecords as writeBriquesRecords, snapshot as briquesSnapshot, type Session as BriquesSession } from '../games/briques/interaction';
import { labels as briquesLabels } from '../games/briques/view';
import { mount as mountFusee, readRecords as readFuseeRecords, writeRecords as writeFuseeRecords, snapshot as fuseeSnapshot, type Session as FuseeSession } from '../games/fusee/interaction';
import { labels as fuseeLabels } from '../games/fusee/view';
import { mount as mountPepites, readRecords as readPepitesRecords, writeRecords as writePepitesRecords, snapshot as pepitesSnapshot, type Session as PepitesSession } from '../games/pepites/interaction';
import { labels as pepitesLabels } from '../games/pepites/view';
import { mount as mountDedale, readRecords as readDedaleRecords, writeRecords as writeDedaleRecords, snapshot as dedaleSnapshot, type Session as DedaleSession } from '../games/dedale/interaction';
import { labels as dedaleLabels } from '../games/dedale/view';
import * as tambours from '../engines/tambours';
import * as tamboursView from '../games/tambours/view';
import { bindDrums } from '../games/tambours/interaction';
import * as ranger from '../engines/ranger';
import * as rangerView from '../games/ranger/view';
import { bindObjects } from '../games/ranger/interaction';
import { labels as rangerLabels } from '../games/ranger/items';
import * as suites from '../engines/suites';
import * as suitesView from '../games/suites/view';
import { bindPatternChoices } from '../games/suites/interaction';
import { backdrop } from '../ui/backdrops';
import * as chemin from '../engines/chemin';
import * as cheminView from '../games/chemin/view';
import { screenToZone, distanceToZone, withinDropZone, dragPosition } from './coordinates';
import { bindAction, activationEvents, acceptActivation, recordActivation, resetActivations } from './activation';
import * as puzzle from '../engines/puzzle';
import * as puzzleView from '../games/puzzle/view';
import * as sounds from '../engines/sons';
import * as soundsView from '../games/sons/view';
import * as shapes from '../engines/formes';
import * as shapesView from '../games/formes/view';
import { name as shapeName } from '../games/formes/shapes';
import { start, answer, advance, moveObject, complete, levels, isUnlocked, type Session } from '../engines/compter';
import * as memory from '../engines/paires';
import * as memoryView from '../games/paires/view';
import { names as motifNames } from '../games/paires/motifs';
import { home } from '../ui/home';
import { levelView, gameView, instruction } from '../games/compter/view';
import { icon } from '../ui/svg';
import { otherGamesList } from '../ui/other-games';
import { feedbackLinkHtml } from '../ui/feedback';
import { games } from '../registry';
import { applyLocale, detectLocale, text } from './i18n';
import { browserStorage, readSave, writeSave, fresh } from './storage';
import { say, stopSpeech, unlockSpeech } from './speech';
import { chime, unlockSound, stopSound } from './sound';
import { parentalQuestion, checkParental } from './parental';
import type { Expression } from '../characters/model';
const app = document.querySelector<HTMLElement>('#app')!;
const storage = browserStorage();
let save = readSave(storage, detectLocale(navigator.language));
let screen: 'home' | 'levels' | 'game' | 'parents' | 'gate' = 'home';
let atelierStudio: Studio | undefined;
let disposeAtelier: (() => void) | undefined;
let gouterSession: GouterSession | undefined;
let disposeGouter: (() => void) | undefined;
let chercheSession: ChercheSession | undefined;
let disposeCherche: (() => void) | undefined;
let promenadeSession: PromenadeSession | undefined;
let disposePromenade: (() => void) | undefined;
let bullesSession: BullesSession | undefined;
let disposeBulles: (() => void) | undefined;
let bonbonsSession: BonbonsSession | undefined;
let disposeBonbons: (() => void) | undefined;
let traverseSession: TraverseSession | undefined;
let disposeTraverse: (() => void) | undefined;
let caissesSession: CaissesSession | undefined;
let chenilleSession: ChenilleSession | undefined;
let disposeChenille: (() => void) | undefined;
let collierSession: CollierSession | undefined;
let disposeCollier: (() => void) | undefined;
let briquesSession: BriquesSession | undefined;
let disposeBriques: (() => void) | undefined;
let fuseeSession: FuseeSession | undefined;
let disposeFusee: (() => void) | undefined;
let pepitesSession: PepitesSession | undefined;
let disposePepites: (() => void) | undefined;
let dedaleSession: DedaleSession | undefined;
let disposeDedale: (() => void) | undefined;
let disposeCaisses: (() => void) | undefined;
let session: Session | undefined;
let tamboursSession: tambours.Session | undefined;
let disposeDrums: (() => void) | undefined;
let rangerSession: ranger.Session | undefined;
let rangerSelected: string | undefined;
let disposeRanger: (() => void) | undefined;
let suitesSession: suites.Session | undefined;
let cheminSession: chemin.Maze | undefined;
let cheminHelp = false;
let cheminDrag: { pointer: number; point: chemin.Point; anchor: number } | undefined;
let puzzleSession: puzzle.Puzzle | undefined;
let puzzleModel = false;
let puzzleTop: number | undefined;
let puzzleIdleStart = 0;
let soundsSession: sounds.Session | undefined;
let soundHintPiece = 0;
let shapesSession: shapes.Session | undefined;
let memorySession: memory.Board | undefined;
let activeGame = 'compter';
let disposePatternChoices: (() => void) | undefined;
let hint = false;
let expression: Expression = 'joie';
let seedCounter = 0;
let timers: ReturnType<typeof setTimeout>[] = [];
function seed(): number { const buffer = new Uint32Array(1); try { crypto.getRandomValues(buffer); return buffer[0]!; } catch { return ++seedCounter * 7919; } }
function persist(): void { writeSave(storage, save); }
function cancel(): void { endRouterDrags(); disposeAtelier?.(); disposeAtelier = undefined; disposeGouter?.(); disposeGouter = undefined; disposeCherche?.(); disposeCherche = undefined; disposePromenade?.(); disposePromenade = undefined; disposeBulles?.(); disposeBulles = undefined; disposeBonbons?.(); disposeBonbons = undefined; disposeTraverse?.(); disposeTraverse = undefined; disposeCaisses?.(); disposeCaisses = undefined; disposeChenille?.(); disposeChenille = undefined; disposeCollier?.(); disposeCollier = undefined; disposeBriques?.(); disposeBriques = undefined; disposeFusee?.(); disposeFusee = undefined; disposePepites?.(); disposePepites = undefined; disposeDedale?.(); disposeDedale = undefined; disposeDrums?.(); disposeDrums = undefined; disposeRanger?.(); disposeRanger = undefined; disposePatternChoices?.(); disposePatternChoices = undefined; timers.forEach(clearTimeout); timers = []; stopSpeech(); }
function speak(parts: string[], rate = 0.82): void { say(parts, save.locale, save.voice, undefined, rate); }
function actionKey(element: HTMLElement): string {
    const target = element.id || Object.entries(element.dataset).map(([key, value]) => `${key}-${value ?? ''}`).join(':');
    const selection = element.matches('[data-bin]') ? `:piece-${rangerSelected ?? 'none'}` : element.matches('[data-sound-box]') ? `:piece-${soundSelected ?? 'none'}`
        : element.matches('[data-box]') ? `:piece-${selectedPiece ?? 'none'}` : '';
    return `${screen}:${activeGame}:${rangerSession?.index ?? suitesSession?.index ?? soundsSession?.index ?? shapesSession?.index ?? session?.index ?? 0}:${target}${selection}`;
}
function bind(selector: string, fn: (element: HTMLElement) => void, keyFor = actionKey): void {
    app.querySelectorAll<HTMLElement>(selector).forEach(el => {
        // Drag controllers already own release and capture; click is their keyboard alternative.
        if (el.matches('[data-piece], [data-sound-piece]')) {
            el.onclick = event => { if (event.pointerType !== 'touch') fn(el); };
        } else bindAction(el, () => fn(el), () => keyFor(el));
    });
}
let shownView = '';
function render(): void {
    cancel(); applyLocale(save.locale);
    // A new screen starts at its top: the home page scroll must not open a game at its last levels.
    const view = `${screen}:${activeGame}`;
    if (view !== shownView) { shownView = view; window.scrollTo(0, 0); }
    app.dataset.theme = screen === 'game' || screen === 'levels' ? activeGame : screen;
    if (screen === 'home') {
        app.innerHTML = home(save);
        bind('[data-game]', el => { activeGame = el.dataset.game!; if (activeGame === 'atelier') { atelierStudio = { state: readDraft(storage), revision: 0 }; screen = 'game'; render(); speak([atelierLabels[save.locale].instruction]); return; } if (activeGame === 'gouter') { gouterSession = { screen: 'levels', state: null, records: readGouterRecords(storage) }; screen = 'game'; render(); speak([gouterLabels[save.locale].title, gouterLabels[save.locale].levels]); return; } if (activeGame === 'promenade') { promenadeSession = { screen: 'levels', state: null, records: readPromenadeRecords(storage) }; screen = 'game'; render(); speak([promenadeLabels[save.locale].title, promenadeLabels[save.locale].levels]); return; } if (activeGame === 'bulles') { bullesSession = { screen: 'levels', state: null, records: readBullesRecords(storage), aim: 0, last: null }; screen = 'game'; render(); speak([bullesLabels[save.locale].title, bullesLabels[save.locale].levels]); return; } if (activeGame === 'bonbons') { bonbonsSession = { screen: 'levels', state: null, records: readBonbonsRecords(storage), selected: null, cursor: 0, last: null }; screen = 'game'; render(); speak([bonbonsLabels[save.locale].title, bonbonsLabels[save.locale].levels]); return; } if (activeGame === 'traverse') { traverseSession = { screen: 'levels', state: null, records: readTraverseRecords(storage), last: null }; screen = 'game'; render(); speak([traverseLabels[save.locale].title, traverseLabels[save.locale].levels]); return; } if (activeGame === 'caisses') { caissesSession = { screen: 'levels', state: null, records: readCaissesRecords(storage), history: [], grip: null }; screen = 'game'; render(); speak([caissesLabels[save.locale].title, caissesLabels[save.locale].levels]); return; } if (activeGame === 'chenille') { chenilleSession = { screen: 'levels', state: null, records: readChenilleRecords(storage), history: [] }; screen = 'game'; render(); speak([chenilleLabels[save.locale].title, chenilleLabels[save.locale].levels]); return; } if (activeGame === 'collier') { collierSession = { screen: 'levels', state: null, records: readCollierRecords(storage), aim: 0, last: null }; screen = 'game'; render(); speak([collierLabels[save.locale].title, collierLabels[save.locale].levels]); return; } if (activeGame === 'dedale') { dedaleSession = { screen: 'levels', state: null, records: readDedaleRecords(storage), history: [] }; screen = 'game'; render(); speak([dedaleLabels[save.locale].title, dedaleLabels[save.locale].levels]); return; } if (activeGame === 'pepites') { pepitesSession = { screen: 'levels', state: null, records: readPepitesRecords(storage), history: [] }; screen = 'game'; render(); speak([pepitesLabels[save.locale].title, pepitesLabels[save.locale].levels]); return; } if (activeGame === 'fusee') { fuseeSession = { screen: 'levels', state: null, records: readFuseeRecords(storage), last: null }; screen = 'game'; render(); speak([fuseeLabels[save.locale].title, fuseeLabels[save.locale].levels]); return; } if (activeGame === 'briques') { briquesSession = { screen: 'levels', state: null, records: readBriquesRecords(storage), aim: 0, last: null }; screen = 'game'; render(); speak([briquesLabels[save.locale].title, briquesLabels[save.locale].levels]); return; } if (activeGame === 'cherche') { chercheSession = { screen: 'levels', state: null, records: readChercheRecords(storage) }; screen = 'game'; render(); speak([chercheLabels[save.locale].title, chercheLabels[save.locale].levels]); return; } screen = 'levels'; render(); speak([games.find(g => g.id === activeGame)!.names[save.locale], text(save.locale, 'levels')]); });
        bind('#parents', () => gate('parents'));
        bind('#tictac', () => gate('tictac'));
    } else if (screen === 'levels') {
        app.innerHTML = activeGame === 'tambours' ? tamboursView.levelView(save) : activeGame === 'ranger' ? rangerView.levelView(save) : activeGame === 'suites' ? suitesView.levelView(save) : activeGame === 'chemin' ? cheminView.levelView(save) : activeGame === 'puzzle' ? puzzleView.levelView(save) : activeGame === 'sons' ? soundsView.levelView(save) : activeGame === 'formes' ? shapesView.levelView(save) : activeGame === 'paires' ? memoryView.levelView(save) : levelView(save);
        bind('[data-level]', el => { const level = Number(el.dataset.level); if (activeGame === 'tambours' ? tambours.isUnlocked(level, save.tamboursRecords) : activeGame === 'ranger' ? ranger.isUnlocked(level, save.rangerRecords) : activeGame === 'suites' ? suites.isUnlocked(level, save.suitesRecords) : activeGame === 'chemin' ? chemin.isUnlocked(level, save.cheminRecords) : activeGame === 'puzzle' ? puzzle.isUnlocked(level, save.puzzleRecords) : activeGame === 'sons' ? sounds.isUnlocked(level, save.sonsRecords) : activeGame === 'formes' ? shapes.isUnlocked(level, save.formesRecords) : activeGame === 'paires' ? memory.isUnlocked(level, save.pairesRecords) : isUnlocked(level, save.records)) begin(level); });
    } else if (screen === 'game' && activeGame === 'dedale' && dedaleSession) {
        disposeDedale = mountDedale(app, dedaleSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; dedaleSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'pepites' && pepitesSession) {
        disposePepites = mountPepites(app, pepitesSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; pepitesSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'fusee' && fuseeSession) {
        disposeFusee = mountFusee(app, fuseeSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; fuseeSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'briques' && briquesSession) {
        disposeBriques = mountBriques(app, briquesSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; briquesSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'collier' && collierSession) {
        disposeCollier = mountCollier(app, collierSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; collierSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'chenille' && chenilleSession) {
        disposeChenille = mountChenille(app, chenilleSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; chenilleSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'caisses' && caissesSession) {
        disposeCaisses = mountCaisses(app, caissesSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; caissesSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'traverse' && traverseSession) {
        disposeTraverse = mountTraverse(app, traverseSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; traverseSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'bonbons' && bonbonsSession) {
        disposeBonbons = mountBonbons(app, bonbonsSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; bonbonsSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'bulles' && bullesSession) {
        disposeBulles = mountBulles(app, bullesSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; bullesSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'promenade' && promenadeSession) {
        disposePromenade = mountPromenade(app, promenadeSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; promenadeSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'cherche' && chercheSession) {
        disposeCherche = mountCherche(app, chercheSession, save.locale, storage, speak, () => save.sound, seed, () => { screen = 'home'; chercheSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'gouter' && gouterSession) {
        disposeGouter = mountGouter(app, gouterSession, save.locale, storage, speak, () => save.sound, () => { screen = 'home'; gouterSession = undefined; render(); });
    } else if (screen === 'game' && activeGame === 'atelier' && atelierStudio) {
        disposeAtelier = mountAtelier(app, atelierStudio, save.locale, storage, speak, () => { screen = 'home'; render(); });
    } else if (screen === 'game' && activeGame === 'tambours' && tamboursSession) {
        renderTambours();
    } else if (screen === 'game' && activeGame === 'ranger' && rangerSession) {
        renderRanger();
    } else if (screen === 'game' && activeGame === 'suites' && suitesSession) {
        renderSuites();
    } else if (screen === 'game' && activeGame === 'chemin' && cheminSession) {
        renderChemin();
    } else if (screen === 'game' && activeGame === 'puzzle' && puzzleSession) {
        renderPuzzle();
    } else if (screen === 'game' && activeGame === 'sons' && soundsSession) {
        renderSounds();
    } else if (screen === 'game' && activeGame === 'formes' && shapesSession) {
        renderShapes();
    } else if (screen === 'game' && activeGame === 'paires' && memorySession) {
        renderMemory();
    } else if (screen === 'game' && session) {
        app.innerHTML = gameView(session, save.locale, expression, hint);
        bind('[data-answer]', el => respond(Number(el.dataset.answer), el));
        bind('#check', el => respond(session!.basket, el));
        bind('#continue', () => {
            session = advance(session!); hint = false; expression = 'joie';
            if (session.finished) { save.records = complete(save.records, session); persist(); chime(save.sound); }
            render(); speak([session.finished ? text(save.locale, 'finished') : instruction(session.questions[session.index]!, save.locale, true)]);
        });
        bind('#listen', () => speak([session!.finished ? text(save.locale, 'finished') : instruction(session!.questions[session!.index]!, save.locale, true)]));
        bind('#again', () => begin(session!.level));
        bind('#next', () => { if (session!.level < levels.length) begin(session!.level + 1); });
    }
    if (screen === 'game' || screen === 'levels') app.insertAdjacentHTML('afterbegin', backdrop(activeGame));
    // The snack game owns its back button: from a level it returns to its own level list.
    if (!(screen === 'game' && (activeGame === 'gouter' || activeGame === 'cherche' || activeGame === 'promenade' || activeGame === 'bulles' || activeGame === 'bonbons' || activeGame === 'traverse' || activeGame === 'caisses' || activeGame === 'chenille' || activeGame === 'collier' || activeGame === 'briques' || activeGame === 'fusee' || activeGame === 'pepites' || activeGame === 'dedale'))) bind('#back', () => { endRouterDrags(); screen = 'home'; tamboursSession = undefined; rangerSession = undefined; rangerSelected = undefined; suitesSession = undefined; cheminSession = undefined; cheminDrag = undefined; puzzleSession = undefined; puzzleDrag = undefined; soundsSession = undefined; soundDrag = undefined; session = undefined; memorySession = undefined; shapesSession = undefined; render(); });
}
function begin(level: number): void {
    endRouterDrags();
    resetActivations();
    tamboursSession = undefined;
    if (activeGame === 'tambours') {
        session = undefined; rangerSession = undefined; suitesSession = undefined; cheminSession = undefined; puzzleSession = undefined; soundsSession = undefined; shapesSession = undefined; memorySession = undefined;
        tamboursSession = tambours.start(level, seed()); screen = 'game'; render(); return;
    }
    rangerSession = undefined; rangerSelected = undefined;
    if (activeGame === 'ranger') {
        session = undefined; memorySession = undefined; shapesSession = undefined; soundsSession = undefined; puzzleSession = undefined; cheminSession = undefined; suitesSession = undefined;
        rangerSession = ranger.start(level, seed()); screen = 'game'; render(); speak([rangerView.instruction(rangerSession.questions[0]!, save.locale)]); return;
    }
    suitesSession = undefined;
    if (activeGame === 'suites') {
        session = undefined; memorySession = undefined; shapesSession = undefined; soundsSession = undefined; puzzleSession = undefined; cheminSession = undefined;
        suitesSession = suites.start(level, seed()); screen = 'game'; hint = false; render(); speak([suitesView.instruction(suitesSession.questions[0]!, save.locale)]); return;
    }
    cheminSession = undefined; cheminDrag = undefined; cheminHelp = false;
    if (activeGame === 'chemin') {
        session = undefined; soundsSession = undefined; memorySession = undefined; shapesSession = undefined; puzzleSession = undefined; puzzleDrag = undefined;
        cheminSession = chemin.newMaze(level, seed()); screen = 'game'; render(); speak([text(save.locale, 'pathInstruction')]); return;
    }
    puzzleSession = undefined; puzzleDrag = undefined; puzzleTop = undefined;
    if (activeGame === 'puzzle') {
        session = undefined; soundsSession = undefined; memorySession = undefined; shapesSession = undefined;
        puzzleSession = puzzle.newPuzzle(level, seed()); puzzleModel = puzzle.levels[level - 1]!.model;
        puzzleIdleStart = performance.now(); screen = 'game'; render(); speak([text(save.locale, 'puzzleInstruction')]); return;
    }
    soundsSession = undefined; soundSelected = undefined; soundDrag = undefined;
    shapesSession = undefined; selectedPiece = undefined;
    if (activeGame === 'sons') { session = undefined; memorySession = undefined; soundsSession = sounds.start(level, seed(), save.locale); screen = 'game'; hint = false; render(); speak(soundsView.spoken(soundsSession.questions[0]!, save.locale)); return; }
    if (activeGame === 'formes') { session = undefined; memorySession = undefined; shapesSession = shapes.start(level, seed()); screen = 'game'; hint = false; render(); speak([shapesView.instruction(shapesSession.questions[0]!, save.locale)]); return; }
    if (activeGame === 'paires') { app.replaceChildren(); session = undefined; memorySession = memory.newBoard(level, seed()); screen = 'game'; render(); speak([memoryView.instruction(memorySession, save.locale)]); return; }
    memorySession = undefined; session = start(level, seed()); screen = 'game'; hint = false; expression = 'joie'; render(); speak([instruction(session.questions[0]!, save.locale, true)]); }
function renderTambours(): void {
    const state = tamboursSession!;
    app.innerHTML = tamboursView.gameView(state, save.locale);
    disposeDrums = bindDrums(app, state, save.locale, save.sound, next => {
        const previous = tamboursSession!; tamboursSession = next;
        if (next.finished) { save.tamboursRecords = tambours.complete(save.tamboursRecords, next); persist(); chime(save.sound); speak([text(save.locale, 'finished')]); }
        if (next.index !== previous.index || next.finished) render();
    }, speak);
    bind('#again', () => begin(state.level));
    bind('#next', () => { if (state.level < tambours.levels.length) begin(state.level + 1); });
    if (state.finished) bind('#listen', () => speak([text(save.locale, 'finished')]));
}
function renderRanger(): void {
    const state = rangerSession!;
    app.innerHTML = rangerView.gameView(state, save.locale);
    disposeRanger = bindObjects(app, state, () => rangerSelected, id => { rangerSelected = id; const o = ranger.catalog.find(o => o.id === id); if (o) speak([`${o.names[save.locale]}, ${rangerLabels[save.locale][o.color]!}, ${rangerLabels[save.locale][o.size]!}`]); }, (id, bin) => {
        if (!rangerSession || document.hidden) return;
        const result = ranger.place(rangerSession, id, bin);
        if (result.state === rangerSession) return;
        rangerSession = result.state; render();
        if (result.correct) { chime(save.sound); speak([text(save.locale, 'bravo')]); }
        else speak([text(save.locale, 'tryAgain'), ...(result.hint ? [rangerView.instruction(rangerSession.questions[rangerSession.index]!, save.locale)] : [])]);
    });
    bind('#listen', () => speak([state.finished ? text(save.locale, 'finished') : rangerView.instruction(state.questions[state.index]!, save.locale)]));
    bind('#continue', () => {
        rangerSelected = undefined; rangerSession = ranger.advance(rangerSession!);
        if (rangerSession.finished) { save.rangerRecords = ranger.complete(save.rangerRecords, rangerSession); persist(); chime(save.sound); }
        render(); speak([rangerSession.finished ? text(save.locale, 'finished') : rangerView.instruction(rangerSession.questions[rangerSession.index]!, save.locale)]);
    });
    bind('#again', () => begin(state.level));
    bind('#next', () => { if (state.level < ranger.levels.length) begin(state.level + 1); });
}
function renderSuites(): void {
    const state = suitesSession!;
    app.innerHTML = suitesView.gameView(state, save.locale, hint);
    disposePatternChoices = bindPatternChoices(app, state, choice => {
        if (!suitesSession || document.hidden) return;
        const result = suites.answer(suitesSession, choice);
        if (result.state === suitesSession) return;
        suitesSession = result.state; hint = suitesSession.errors >= 2 && !suitesSession.solved;
        render();
        if (result.correct) { chime(save.sound); speak([text(save.locale, 'bravo')]); }
        else {
            app.querySelector(`[data-pattern-choice="${choice}"]`)?.classList.add('wiggle');
            speak([text(save.locale, 'tryAgain'), ...(hint ? suitesView.hintSpeech(suitesSession.questions[suitesSession.index]!, save.locale) : [])]);
        }
    });
    bind('#listen', () => speak(state.finished ? [text(save.locale, 'finished')] : hint ? suitesView.hintSpeech(state.questions[state.index]!, save.locale) : [suitesView.instruction(state.questions[state.index]!, save.locale)]));
    bind('#continue', () => {
        suitesSession = suites.advance(suitesSession!); hint = false;
        if (suitesSession.finished) { save.suitesRecords = suites.complete(save.suitesRecords, suitesSession); persist(); chime(save.sound); }
        render(); speak([suitesSession.finished ? text(save.locale, 'finished') : suitesView.instruction(suitesSession.questions[suitesSession.index]!, save.locale)]);
    });
    bind('#again', () => begin(state.level));
    bind('#next', () => { if (state.level < suites.levels.length) begin(state.level + 1); });
}
function renderChemin(): void {
    const state = cheminSession!;
    app.innerHTML = cheminView.gameView(state, save.locale, cheminHelp);
    bind('#listen', () => speak([text(save.locale, state.finished ? 'finished' : 'pathInstruction')]));
    bind('#help', () => {
        cheminHelp = !cheminHelp;
        patchChemin();
        app.querySelector('#help')!.setAttribute('aria-pressed', String(cheminHelp));
    });
    bind('#again', () => begin(state.level));
    bind('#next', () => { if (state.level < chemin.levels.length) begin(state.level + 1); });
}
function patchChemin(): void {
    const zone = app.querySelector('.chemin-zone')!;
    const template = document.createElement('template');
    template.innerHTML = cheminView.boardSvg(cheminSession!, cheminHelp);
    const desired = template.content.querySelector('svg')!;
    const svg = zone.querySelector('svg')!;
    for (const cell of svg.querySelectorAll('[data-cell]')) {
        cell.setAttribute('data-head', String(Number(cell.getAttribute('data-cell')) === cheminSession!.trace.at(-1)));
    }
    // Preserve the cell nodes, replacing only decorations and the drawing.
    for (const child of [...svg.children]) if (!child.hasAttribute('data-cell')) child.remove();
    for (const child of [...desired.children]) if (!child.hasAttribute('data-cell')) svg.append(child);
}
function updateChemin(next: chemin.Maze): void {
    if (next === cheminSession) return;
    cheminSession = next;
    if (next.finished) {
        cheminEnding.finish();
        save.cheminRecords = chemin.complete(save.cheminRecords, next);
        if (chemin.medal(next)) save.cheminMedals = { ...save.cheminMedals, [next.level]: true };
        persist(); chime(save.sound); render(); speak([text(save.locale, 'finished')]);
    } else patchChemin();
}
function cheminPoint(event: PointerEvent): chemin.Point {
    return screenToZone({ x: event.clientX, y: event.clientY }, app.querySelector('.chemin-zone')!.getBoundingClientRect(), { width: cheminSession!.columns, height: cheminSession!.rows });
}
app.addEventListener('pointerdown', event => {
    if (activeGame !== 'chemin' || screen !== 'game' || !cheminSession || cheminSession.finished || cheminDrag || !event.isPrimary || event.button !== 0 || !(event.target as Element).closest('.chemin-zone')) return;
    const point = cheminPoint(event), cell = chemin.fromPoint(cheminSession, point.x, point.y);
    if (cell === null || !cheminSession.trace.includes(cell)) return;
    event.preventDefault(); app.querySelector<HTMLElement>('.chemin-zone')!.focus({ preventScroll: true });
    cheminDrag = { pointer: event.pointerId, point, anchor: cell };
    recordActivation(`chemin-cell-${cell}`, event.type, true, 'trace-grab'); app.setPointerCapture(event.pointerId); cheminEnding.watch();
});
function moveChemin(event: PointerEvent): void {
    const drag = cheminDrag;
    if (!drag || event.pointerId !== drag.pointer || !cheminSession) return;
    event.preventDefault();
    const point = cheminPoint(event), original = cheminSession;
    const anchorIndex = original.trace.indexOf(drag.anchor);
    const base = anchorIndex === original.trace.length - 1 ? original : { ...original, trace: original.trace.slice(0, anchorIndex + 1) };
    const next = chemin.interpolate(base, drag.point, point);
    // Grabbing an earlier point does not erase anything until an open step is taken.
    recordActivation(`chemin-cell-${chemin.fromPoint(original, point.x, point.y) ?? 'outside'}`, event.type, next !== base, next !== base ? 'trace-advanced' : 'no-open-step');
    if (next !== base) updateChemin(next);
    if (!cheminDrag) return;
    const head = cheminSession.trace.at(-1)!;
    const under = chemin.fromPoint(cheminSession, point.x, point.y);
    if (next !== base || base === original) {
        drag.anchor = head;
        drag.point = under === head ? point : chemin.centre(cheminSession, head);
    }
}
app.addEventListener('pointermove', moveChemin);
app.addEventListener('pointerup', event => {
    if (cheminDrag?.pointer !== event.pointerId) return;
    moveChemin(event); recordActivation('chemin-trace', event.type, true, 'primary-gesture'); cheminEnding.finish();
});
app.addEventListener('keydown', event => {
    if (!(event.target as Element).closest('.chemin-zone') || !cheminSession || cheminDrag) return;
    const keys: Record<string, chemin.Direction> = { ArrowLeft: 'W', ArrowRight: 'E', ArrowUp: 'N', ArrowDown: 'S' };
    const direction = keys[event.key]; if (!direction) return;
    event.preventDefault(); const cell = chemin.neighbour(cheminSession, cheminSession.trace.at(-1)!, direction);
    if (cell !== null) updateChemin(chemin.extend(cheminSession, cell));
});
let puzzleDrag: { pointer: number; piece: number; startX: number; startY: number; x: number; y: number; element: HTMLElement } | undefined;
function puzzleDragCoordinates(d: NonNullable<typeof puzzleDrag>, event: PointerEvent, rect: DOMRect): [number, number] {
    const p = dragPosition({ x: event.clientX, y: event.clientY }, { x: d.startX, y: d.startY }, d, rect, { width: 320, height: 550 });
    return [p.x, p.y];
}
function cancelPuzzleDrag(): void {
    if (!puzzleDrag) return;
    const d = puzzleDrag; puzzleEnding.finish();
    const r = d.element.getBoundingClientRect(), zone = puzzleZone()!;
    const p = screenToZone({ x: r.x + r.width / 2, y: r.y + r.height / 2 }, zone, { width: 320, height: 550 });
    const frame = puzzle.pieceFrame(puzzleSession!.pieces[d.piece]!);
    const piece = puzzleSession!.pieces[d.piece]!;
    puzzleDrop(d.piece, p.x - frame.x - frame.width / 2 + piece.column * piece.width + piece.width / 2, p.y - frame.y - frame.height / 2 + piece.row * piece.height + piece.height / 2);
}
function puzzleZone(): DOMRect | undefined { return app.querySelector('.puzzle-zone')?.getBoundingClientRect(); }
function puzzlePosition(element: HTMLElement, p: puzzle.Piece, x: number, y: number): void {
    const f = puzzle.pieceFrame(p);
    element.style.left = `${(x - p.width / 2 + f.x - p.column * p.width) / 320 * 100}%`;
    element.style.top = `${(y - p.height / 2 + f.y - p.row * p.height) / 550 * 100}%`;
}
function armPuzzleHint(): void {
    if (!puzzleSession || puzzleSession.finished || puzzleSession.hintPiece !== null || document.hidden) return;
    timers.push(setTimeout(() => {
        if (screen !== 'game' || activeGame !== 'puzzle' || !puzzleSession || document.hidden) return;
        puzzleSession = puzzle.hint(puzzleSession, performance.now() - puzzleIdleStart);
        if (puzzleSession.hintPiece !== null) {
            // Avoid replacing a captured piece during a gesture; show the cue on release.
            if (!puzzleDrag) render();
            speak([text(save.locale, 'puzzleHint')]);
        } else armPuzzleHint();
    }, Math.max(1, 25_000 - (performance.now() - puzzleIdleStart))));
}
function renderPuzzle(): void {
    const state = puzzleSession!;
    app.innerHTML = puzzleView.gameView(state, save.locale, puzzleModel);
    if (puzzleTop !== undefined && !state.pieces[puzzleTop]!.placed) {
        const top = app.querySelector<HTMLElement>(`[data-piece="${puzzleTop}"]`); if (top) top.style.zIndex = '3';
    }
    bind('#listen', () => speak([text(save.locale, state.finished ? 'finished' : 'puzzleInstruction')]));
    bind('#model', () => {
        puzzleModel = !puzzleModel;
        if (puzzleModel && !puzzle.levels[state.level - 1]!.model && !state.finished) puzzleSession = { ...puzzleSession!, aids: puzzleSession!.aids + 1 };
        render();
    });
    bind('#again', () => begin(state.level));
    bind('#next', () => { if (state.level < puzzle.levels.length) begin(state.level + 1); });
    armPuzzleHint();
}
function puzzleDrop(id: number, x: number, y: number): void {
    if (!puzzleSession) return;
    const before = puzzleSession; puzzleTop = id;
    puzzleSession = puzzle.drop(before, id, x, y);
    const placed = !before.pieces[id]!.placed && puzzleSession.pieces[id]!.placed;
    if (placed) {
        puzzleIdleStart = performance.now(); chime(save.sound);
        if (puzzleSession.finished) { save.puzzleRecords = puzzle.complete(save.puzzleRecords, puzzleSession); persist(); }
    }
    render();
    app.querySelector<HTMLElement>(`[data-piece="${id}"]`)?.focus({ preventScroll: true });
    if (placed) speak([text(save.locale, puzzleSession.finished ? 'finished' : 'bravo')]);
}
app.addEventListener('pointerdown', event => {
    const element = (event.target as Element).closest<HTMLElement>('.puzzle-piece');
    if (!element || !event.isPrimary || puzzleDrag || !puzzleSession || screen !== 'game') return;
    const piece = Number(element.dataset.piece), p = puzzleSession.pieces[piece]!;
    if (p.placed) return;
    event.preventDefault(); element.focus({ preventScroll: true });
    puzzleDrag = { pointer: event.pointerId, piece, startX: event.clientX, startY: event.clientY, x: p.x, y: p.y, element };
    recordActivation(`puzzle-piece-${piece}`, event.type, true, 'drag-grab');
    element.style.zIndex = '4'; app.setPointerCapture(event.pointerId); puzzleEnding.watch();
});
app.addEventListener('pointermove', event => {
    if (puzzleDrag?.pointer !== event.pointerId || !puzzleSession) return;
    const r = puzzleZone()!; const d = puzzleDrag;
    puzzlePosition(d.element, puzzleSession.pieces[d.piece]!, ...puzzleDragCoordinates(d, event, r));
});
app.addEventListener('pointerup', event => {
    if (puzzleDrag?.pointer !== event.pointerId) return;
    const d = puzzleDrag, r = puzzleZone()!; puzzleEnding.finish();
    recordActivation(`puzzle-piece-${d.piece}`, event.type, true, 'primary-drag');
    puzzleDrop(d.piece, ...puzzleDragCoordinates(d, event, r));
});
app.addEventListener('keydown', event => {
    const el = (event.target as Element).closest<HTMLElement>('.puzzle-piece');
    if (!el || !puzzleSession || puzzleDrag) return;
    const id = Number(el.dataset.piece), p = puzzleSession.pieces[id]!;
    if (p.placed) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); puzzleDrop(id, p.x, p.y); return; }
    const delta: Record<string, readonly [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
    const d = delta[event.key]; if (!d) return;
    event.preventDefault();
    const f = puzzle.pieceFrame(p), left = p.column * p.width - f.x, top = p.row * p.height - f.y;
    const x = Math.max(p.width / 2 + left, Math.min(320 - p.width / 2 - (f.width - p.width - left), p.x + d[0]));
    const y = Math.max(p.height / 2 + top, Math.min(550 - p.height / 2 - (f.height - p.height - top), p.y + d[1]));
    puzzleSession = { ...puzzleSession, pieces: puzzleSession.pieces.map(piece => piece.id === id ? { ...piece, x, y } : piece) };
    puzzlePosition(el, p, x, y);
});

let soundSelected: number | undefined;
let soundDrag: { id: number; piece: number; x: number; y: number; element: HTMLElement } | undefined;
function soundSpeech(): void {
    const s = soundsSession!;
    speak(s.finished ? [text(save.locale, 'finished')] : soundsView.spoken(s.questions[s.index]!, save.locale));
}
function renderSounds(): void {
    const s = soundsSession!;
    app.innerHTML = soundsView.gameView(s, save.locale, hint, soundHintPiece);
    bind('[data-answer]', el => soundResponse(sounds.answer(soundsSession!, Number(el.dataset.answer)), Number(el.dataset.answer)));
    bind('#listen', soundSpeech);
    bind('#continue', () => {
        soundsSession = sounds.advance(soundsSession!); hint = false; soundSelected = undefined;
        if (soundsSession.finished) { save.sonsRecords = sounds.complete(save.sonsRecords, soundsSession); persist(); chime(save.sound); }
        render(); soundSpeech();
    });
    bind('#again', () => begin(s.level));
    bind('#next', () => { if (s.level < sounds.levels.length) begin(s.level + 1); });
    // Keyboard/tap alternative. Selecting an image says its native name, then its sound.
    bind('[data-sound-piece]', el => {
        soundSelected = Number(el.dataset.soundPiece);
        speak(soundsView.spoken(s.questions[s.index]!, save.locale, false, soundSelected));
    });
    bind('[data-sound-box]', el => {
        if (soundSelected === undefined) return;
        const piece = soundSelected; soundSelected = undefined;
        soundResponse(sounds.drop(soundsSession!, piece, Number(el.dataset.soundBox)), piece);
    });
}
function soundResponse(result: ReturnType<typeof sounds.answer>, index: number): void {
    if (result.state === soundsSession) return;
    soundsSession = result.state; hint = result.hint || (hint && !soundsSession.solved); soundHintPiece = index;
    render();
    if (result.correct) { chime(save.sound); speak([text(save.locale, 'bravo')]); }
    else {
        app.querySelector(`[data-answer="${index}"], [data-sound-piece="${index}"]`)?.classList.add('wiggle');
        const q = soundsSession.questions[soundsSession.index]!;
        speak([text(save.locale, 'tryAgain'), ...(hint ? soundsView.spoken(q, save.locale, true, q.mode === 'trier' ? index : undefined) : [])], hint ? 0.6 : 0.82);
    }
}
app.addEventListener('pointerdown', event => {
    const element = (event.target as Element).closest<HTMLElement>('[data-sound-piece]:not(:disabled)');
    if (!element || !event.isPrimary || soundDrag || !soundsSession || soundsSession.solved) return;
    const piece = Number(element.dataset.soundPiece);
    soundSelected = undefined;
    soundDrag = { id: event.pointerId, piece, x: event.clientX, y: event.clientY, element };
    app.setPointerCapture(event.pointerId); soundEnding.watch();
    speak(soundsView.spoken(soundsSession.questions[soundsSession.index]!, save.locale, false, piece));
});
app.addEventListener('pointermove', event => {
    if (soundDrag?.id !== event.pointerId) return;
    soundDrag.element.style.transform = `translate(${event.clientX - soundDrag.x}px, ${event.clientY - soundDrag.y}px)`;
    soundDrag.element.classList.add('dragging');
});
app.addEventListener('pointerup', event => {
    if (!soundDrag || soundDrag.id !== event.pointerId) return;
    const drag = soundDrag; soundEnding.finish();
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 12) { soundSelected = drag.piece; return; }
    const boxes = [...app.querySelectorAll<HTMLElement>('[data-sound-box]')].map(el => {
        const r = el.getBoundingClientRect();
        return { el, rect: r, distance: distanceToZone({ x: event.clientX, y: event.clientY }, r) };
    }).sort((a, b) => a.distance - b.distance);
    if (boxes[0] && withinDropZone({ x: event.clientX, y: event.clientY }, boxes[0].rect) && soundsSession) {
        const result = sounds.drop(soundsSession, drag.piece, Number(boxes[0].el.dataset.soundBox));
        soundResponse(result, drag.piece);
        if (!result.correct && !matchMedia('(prefers-reduced-motion: reduce)').matches) app.querySelector(`[data-sound-piece="${drag.piece}"]`)?.animate([
            { transform: `translate(${event.clientX - drag.x}px, ${event.clientY - drag.y}px)` }, { transform: 'translate(0, 0)' }
        ], { duration: 260, easing: 'ease-out' });
    }
});

function renderShapes(): void {
    const state = shapesSession!;
    app.innerHTML = shapesView.gameView(state, save.locale, hint);
    bind('[data-answer]', el => shapeResponse(shapes.answer(shapesSession!, Number(el.dataset.answer)), Number(el.dataset.answer)));
    bind('#listen', () => speak([state.finished ? text(save.locale, 'finished') : shapesView.instruction(state.questions[state.index]!, save.locale)]));
    bind('#continue', () => {
        shapesSession = shapes.advance(shapesSession!); hint = false;
        if (shapesSession.finished) { save.formesRecords = shapes.complete(save.formesRecords, shapesSession); persist(); chime(save.sound); }
        render(); speak([shapesSession.finished ? text(save.locale, 'finished') : shapesView.instruction(shapesSession.questions[shapesSession.index]!, save.locale)]);
    });
    bind('#again', () => begin(state.level));
    bind('#next', () => { if (state.level < shapes.levels.length) begin(state.level + 1); });
    // Keyboard alternative: select a piece, then its box.
    bind('[data-piece]', el => { selectedPiece = Number(el.dataset.piece); });
    bind('[data-box]', el => { if (selectedPiece !== undefined) { const piece = selectedPiece; selectedPiece = undefined; shapeResponse(shapes.drop(shapesSession!, piece, Number(el.dataset.box)), piece); } });
}
let selectedPiece: number | undefined;
function shapeResponse(result: ReturnType<typeof shapes.answer>, index: number): void {
    if (result.state === shapesSession) return;
    shapesSession = result.state; hint = shapesSession.errors >= 2 && !shapesSession.solved;
    render();
    if (result.correct) { chime(save.sound); speak([text(save.locale, 'bravo')]); }
    else {
        app.querySelector(`[data-answer="${index}"], [data-piece="${index}"]`)?.classList.add('wiggle');
        const q = shapesSession.questions[shapesSession.index]!;
        speak([text(save.locale, 'tryAgain'), ...(hint ? [q.mode === 'trier' ? shapeName(q.choices[index]!, save.locale) : shapesView.instruction(q, save.locale)] : [])]);
    }
}
let shapeDrag: { id: number; piece: number; x: number; y: number; element: HTMLElement } | undefined;
app.addEventListener('pointerdown', event => {
    const element = (event.target as Element).closest<HTMLElement>('[data-piece]:not(:disabled)');
    if (!element || !event.isPrimary || shapeDrag || !shapesSession || shapesSession.solved) return;
    selectedPiece = undefined;
    shapeDrag = { id: event.pointerId, piece: Number(element.dataset.piece), x: event.clientX, y: event.clientY, element };
    app.setPointerCapture(event.pointerId); shapeEnding.watch();
});
app.addEventListener('pointermove', event => {
    if (shapeDrag?.id !== event.pointerId) return;
    shapeDrag.element.style.transform = `translate(${event.clientX - shapeDrag.x}px, ${event.clientY - shapeDrag.y}px)`;
    shapeDrag.element.classList.add('dragging');
});
app.addEventListener('pointerup', event => {
    if (!shapeDrag || shapeDrag.id !== event.pointerId) return;
    const drag = shapeDrag; shapeEnding.finish();
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 12) { selectedPiece = drag.piece; recordActivation(`shape-piece-${drag.piece}`, event.type, true, 'selection'); return; }
    const boxes = [...app.querySelectorAll<HTMLElement>('[data-box]')].map(el => {
        const r = el.getBoundingClientRect();
        return { el, rect: r, distance: distanceToZone({ x: event.clientX, y: event.clientY }, r) };
    }).sort((a, b) => a.distance - b.distance);
    if (boxes[0] && withinDropZone({ x: event.clientX, y: event.clientY }, boxes[0].rect) && shapesSession) {
        const result = shapes.drop(shapesSession, drag.piece, Number(boxes[0].el.dataset.box));
        recordActivation(`shape-piece-${drag.piece}`, event.type, result.correct, result.correct ? 'placed' : 'wrong-box');
        shapeResponse(result, drag.piece);
        if (result.returned && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            app.querySelector<HTMLElement>(`[data-piece="${drag.piece}"]`)?.animate([
                { transform: `translate(${event.clientX - drag.x}px, ${event.clientY - drag.y}px)` }, { transform: 'translate(0, 0)' }
            ], { duration: 260, easing: 'ease-out' });
        }
    }
});
function renderMemory(): void {
    const state = memorySession!;
    const next = document.createElement('template');
    next.innerHTML = memoryView.gameView(state, save.locale);
    const grid = app.querySelector('.memory-grid');
    if (grid && !state.finished) {
        // Keep the connected card faces: CSS can interpolate opening AND closing.
        app.querySelector('.instruction')!.innerHTML = next.content.querySelector('.instruction')!.innerHTML;
        next.content.querySelectorAll<HTMLButtonElement>('[data-card]').forEach(desired => {
            const card = grid.querySelector<HTMLButtonElement>(`[data-card="${desired.dataset.card}"]`)!;
            for (const attribute of [...card.attributes]) card.removeAttribute(attribute.name);
            for (const attribute of [...desired.attributes]) card.setAttribute(attribute.name, attribute.value);
            if (!card.querySelector('.memory-spark') && desired.querySelector('.memory-spark')) card.append(desired.querySelector('.memory-spark')!);
        });
    } else app.replaceChildren(next.content);
    bind('[data-card]', el => {
        if (!memorySession || memorySession.preview || memorySession.finished) return;
        const index = Number(el.dataset.card), previous = memorySession;
        memorySession = memory.flip(previous, index);
        if (memorySession === previous) return;
        const matched = memorySession.cards.filter(c => c.found).length > previous.cards.filter(c => c.found).length;
        if (memorySession.finished) { save.pairesRecords = memory.complete(save.pairesRecords, memorySession); persist(); }
        render();
        if (matched) chime(save.sound);
        if (!matched && !memorySession.visible.includes(index)) return;
        speak([motifNames[save.locale][memorySession.cards[index]!.motif], ...(matched ? [text(save.locale, memorySession.finished ? 'finished' : 'bravo')] : memorySession.hint.length && !previous.hint.length ? [text(save.locale, 'memoryHint')] : [])]);
    }, el => `${actionKey(el)}:turn-${memorySession!.moves}`);
    bind('#listen', () => speak([memoryView.instruction(memorySession!, save.locale)]));
    bind('#again', () => begin(state.level));
    bind('#next', () => { if (state.level < memory.levels.length) begin(state.level + 1); });
    if (state.preview) timers.push(setTimeout(() => { memorySession = memory.endPreview(memorySession!); render(); speak([memoryView.instruction(memorySession, save.locale)]); }, memory.levels[state.level - 1]!.preview));
    if (state.mismatch) timers.push(setTimeout(() => { memorySession = memory.settle(memorySession!); render(); }, 900));
}
function respond(choice: number, element: HTMLElement): void {
    if (!session || session.solved || session.finished) return;
    const result = answer(session, choice); session = result.state; hint = result.hint;
    expression = result.correct ? 'joie' : 'surprise';
    const selector = element.id ? `#${element.id}` : `[data-answer="${element.dataset.answer}"]`;
    render();
    if (result.correct) { chime(save.sound); app.querySelector('.question')?.classList.add('success'); speak([text(save.locale, 'bravo')]); }
    else {
        app.querySelector(selector)?.classList.add('wiggle'); speak([text(save.locale, 'tryAgain')]);
        if (hint) showHint();
    }
}
function showHint(): void {
    const q = session!.questions[session!.index]!;
    const scope = q.mode === 'plus' ? app.querySelector(`[data-answer="${q.answer}"]`) : app.querySelector('.objects');
    const basket = [...app.querySelectorAll<HTMLElement>('#basket .token')];
    const reserve = [...app.querySelectorAll<HTMLElement>('#reserve .token')];
    const items = q.mode === 'remplir'
        ? [...basket, ...reserve.slice(0, Math.max(0, q.target - basket.length))]
        : [...(scope?.querySelectorAll<HTMLElement>('[data-object]') ?? [])];
    const n = q.mode === 'remplir' ? Math.max(q.target, basket.length) : q.mode === 'plus' ? q.answer === 0 ? q.left : q.right : q.target;
    for (let i = 0; i < n; i++) timers.push(setTimeout(() => {
        items.forEach(el => el.classList.remove('counting'));
        items[i]?.classList.add('counting');
        app.querySelector('.instruction-pic')?.classList.add('counting');
        speak([String(i + 1)]);
    }, 1100 + i * 850));
    if (q.mode === 'remplir' && basket.length > q.target) timers.push(setTimeout(() => {
        items.forEach(el => el.classList.remove('counting'));
        basket.slice(q.target).forEach(el => el.classList.add('counting'));
        speak([save.locale === 'fr' ? `${basket.length - q.target} en trop` : `${basket.length - q.target} too many`]);
    }, 1100 + n * 850));
}
function gate(destination: 'parents' | 'tictac'): void {
    cancel(); screen = 'gate';
    const question = parentalQuestion(seed());
    app.innerHTML = `<section class="parent-panel"><h1>${text(save.locale, 'adult')}</h1><p class="calculation">${question.a} × ${question.b} = ?</p><div class="answers">${question.choices.map(n => `<button data-parent="${n}">${n}</button>`).join('')}</div><button id="close">${icon('close')}<span>${text(save.locale, 'close')}</span></button></section>`;
    bind('[data-parent]', el => {
        if (!checkParental(question, Number(el.dataset.parent))) { screen = 'home'; render(); return; }
        if (destination === 'parents') settings();
        else {
            // The external link exists only after the adult has answered correctly.
            const link = document.createElement('a'); link.href = 'https://davy45270.github.io/tictac/'; link.rel = 'noopener noreferrer'; link.target = '_blank';
            document.body.append(link); link.click(); link.remove(); screen = 'home'; render();
        }
    });
    bind('#close', () => { screen = 'home'; render(); });
}
function settings(): void {
    cancel(); screen = 'parents';
    app.innerHTML = `<section class="parent-panel"><h1>${text(save.locale, 'parents')}</h1><label>${text(save.locale, 'language')}<select id="language"><option value="fr" ${save.locale === 'fr' ? 'selected' : ''}>Français</option><option value="en" ${save.locale === 'en' ? 'selected' : ''}>English</option></select></label><label>${text(save.locale, 'voice')}<input id="voice" type="checkbox" ${save.voice ? 'checked' : ''}></label><label>${text(save.locale, 'sound')}<input id="sound" type="checkbox" ${save.sound ? 'checked' : ''}></label><button id="erase">${text(save.locale, 'erase')}</button><div id="confirmation"></div><button id="erase-gallery">${atelierLabels[save.locale].parentsErase}</button><div id="gallery-confirmation"></div><button id="other-games">${text(save.locale, 'otherGames')}</button>${feedbackLinkHtml(save.locale)}<button id="close">${icon('close')}<span>${text(save.locale, 'close')}</span></button><p class="app-version">Opencadkid ${__APP_VERSION__}</p></section>`;
    app.querySelector('#language')!.addEventListener('change', event => { save.locale = (event.target as HTMLSelectElement).value === 'en' ? 'en' : 'fr'; persist(); applyLocale(save.locale); settings(); });
    for (const key of ['voice', 'sound'] as const) app.querySelector(`#${key}`)!.addEventListener('change', event => { save[key] = (event.target as HTMLInputElement).checked; persist(); if (key === 'voice') stopSpeech(); else if (!save.sound) stopSound(); else unlockSound(); });
    bind('#other-games', otherGamesPanel);
    bind('#erase-gallery', () => {
        app.querySelector('#gallery-confirmation')!.innerHTML = `<p>${atelierLabels[save.locale].parentsConfirm}</p><button id="gallery-yes">${text(save.locale, 'yes')}</button><button id="gallery-no">${text(save.locale, 'no')}</button>`;
        bind('#gallery-yes', () => { if (eraseGallery(storage)) { atelierStudio = undefined; settings(); } else app.querySelector('#gallery-confirmation')!.textContent = atelierLabels[save.locale].unsaved; });
        bind('#gallery-no', settings);
    });
    bind('#erase', () => {
        app.querySelector('#confirmation')!.innerHTML = `<p>${text(save.locale, 'confirm')}</p><button id="yes">${text(save.locale, 'yes')}</button><button id="no">${text(save.locale, 'no')}</button>`;
        bind('#yes', () => { save = { ...fresh(save.locale), voice: save.voice, sound: save.sound }; persist(); writeGouterRecords(storage, {}); writeChercheRecords(storage, {}); writePromenadeRecords(storage, {}); writeBullesRecords(storage, {}); writeBonbonsRecords(storage, {}); writeTraverseRecords(storage, {}); writeCaissesRecords(storage, {}); writeChenilleRecords(storage, {}); writeCollierRecords(storage, {}); writeBriquesRecords(storage, {}); writeFuseeRecords(storage, {}); writePepitesRecords(storage, {}); writeDedaleRecords(storage, {}); gouterSession = undefined; chercheSession = undefined; promenadeSession = undefined; bullesSession = undefined; bonbonsSession = undefined; traverseSession = undefined; caissesSession = undefined; chenilleSession = undefined; collierSession = undefined; briquesSession = undefined; fuseeSession = undefined; pepitesSession = undefined; dedaleSession = undefined; settings(); }); bind('#no', settings);
    });
    bind('#close', () => { screen = 'home'; render(); });
}
function otherGamesPanel(): void {
    cancel(); screen = 'parents';
    app.innerHTML = `<section class="parent-panel other-games-panel"><h1 tabindex="-1">${text(save.locale, 'otherGames')}</h1>${otherGamesList(save.locale)}<button id="settings">${icon('gear')}<span>${text(save.locale, 'parents')}</span></button><button id="close">${icon('close')}<span>${text(save.locale, 'close')}</span></button></section>`;
    app.querySelector<HTMLElement>('h1')?.focus();
    bind('#settings', settings);
    bind('#close', () => { screen = 'home'; render(); });
}
// One primary pointer owns the gesture. DOM updates only after release.
let gesture: { id: number; x: number; y: number; area: 'reserve' | 'basket'; moved: boolean; key: string } | undefined;

app.addEventListener('pointerdown', event => {
    if (gesture || !event.isPrimary || !session || session.solved) return;
    const token = (event.target as Element).closest<HTMLElement>('.token'); if (!token) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, area: token.hasAttribute('data-reserve') ? 'reserve' : 'basket', moved: false, key: actionKey(token) };
    app.setPointerCapture(event.pointerId); compterEnding.watch();
});
app.addEventListener('pointermove', event => { if (gesture?.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 12) gesture.moved = true; });
app.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const g = gesture; compterEnding.finish();
    const zone = app.querySelector(g.area === 'reserve' ? '#basket' : '#reserve')?.getBoundingClientRect();
    if (g.moved && (!zone || distanceToZone({ x: event.clientX, y: event.clientY }, zone) !== 0)) return;
    if (!acceptActivation(g.key, event.type, event.pointerType === 'touch' && !g.moved)) return;
    if (session) { session = moveObject(session, g.area === 'reserve' ? 1 : -1); render(); if (hint) showHint(); }
});
app.addEventListener('keydown', event => {
    const token = (event.target as Element).closest('.token');
    if (token && (event.key === 'Enter' || event.key === ' ') && session) { event.preventDefault(); session = moveObject(session, token.hasAttribute('data-reserve') ? 1 : -1); render(); if (hint) showHint(); }
});
const cheminEnding = bindDragEnd(document, () => cheminDrag && { ...cheminDrag, element: app }, () => { cheminDrag = undefined; });
const puzzleEnding = bindDragEnd(document, () => puzzleDrag && { ...puzzleDrag, capture: app }, () => { puzzleDrag = undefined; }, () => cancelPuzzleDrag());
const soundEnding = bindDragEnd(document, () => soundDrag && { ...soundDrag, pointer: soundDrag.id, capture: app }, () => { soundDrag = undefined; }, () => { soundSelected = undefined; });
const shapeEnding = bindDragEnd(document, () => shapeDrag && { ...shapeDrag, pointer: shapeDrag.id, capture: app }, () => { shapeDrag = undefined; }, () => { selectedPiece = undefined; });
const compterEnding = bindDragEnd(document, () => gesture && { pointer: gesture.id, element: app }, () => { gesture = undefined; });
function endRouterDrags(): void {
    for (const ending of [cheminEnding, puzzleEnding, soundEnding, shapeEnding, compterEnding]) ending.finish();
}
document.addEventListener('pointerdown', () => { unlockSpeech(); if (save.sound) unlockSound(); }, { once: true, capture: true });
let puzzleHiddenAt: number | undefined;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cheminEnding.finish(); puzzleHiddenAt = performance.now(); cancelPuzzleDrag(); }
    else if (screen === 'game' && activeGame === 'puzzle') { if (puzzleHiddenAt !== undefined) puzzleIdleStart += performance.now() - puzzleHiddenAt; puzzleHiddenAt = undefined; render(); }
 if (document.hidden) { cancel(); stopSound(); } else { if (save.sound) unlockSound(); if (screen === 'game' && (activeGame === 'paires' || activeGame === 'atelier' || activeGame === 'gouter' || activeGame === 'cherche' || activeGame === 'promenade' || activeGame === 'bulles' || activeGame === 'bonbons' || activeGame === 'traverse' || activeGame === 'caisses' || activeGame === 'chenille' || activeGame === 'collier' || activeGame === 'briques' || activeGame === 'fusee' || activeGame === 'pepites' || activeGame === 'dedale' || activeGame === 'suites' || activeGame === 'ranger')) render(); if (screen === 'game' && activeGame === 'tambours' && tamboursSession) { tamboursSession = { ...tamboursSession, cursor: tamboursSession.solved || tambours.levels[tamboursSession.level - 1]!.mode === 'libre' ? tamboursSession.cursor : 0, last: null }; render(); } } });
Object.defineProperty(window, '__kid', { configurable: false, writable: false, value: Object.freeze({ events: activationEvents, state: () => {
    const targets = [...app.querySelectorAll<HTMLElement>('button, select, input')].filter(el => !el.hasAttribute('disabled')).map(el => { const r = el.getBoundingClientRect(); return { id: el.id || (el.dataset.drum !== undefined ? `drum-${el.dataset.drum}` : el.dataset.object !== undefined ? `object-${el.dataset.object}` : el.dataset.bin !== undefined ? `bin-${el.dataset.bin}` : el.dataset.patternChoice !== undefined ? `pattern-choice-${el.dataset.patternChoice}` : el.dataset.answer !== undefined ? `answer-${el.dataset.answer}` : el.dataset.level ? `level-${el.dataset.level}` : el.dataset.card !== undefined ? `card-${el.dataset.card}` : el.hasAttribute('data-reserve') ? `reserve-${el.dataset.reserve}` : el.hasAttribute('data-basket') ? `basket-${el.dataset.basket}` : el.dataset.soundPiece !== undefined ? `sound-piece-${el.dataset.soundPiece}` : el.dataset.soundBox !== undefined ? `sound-box-${el.dataset.soundBox}` : el.dataset.piece !== undefined ? `piece-${el.dataset.piece}` : el.dataset.box !== undefined ? `box-${el.dataset.box}` : el.dataset.game || ''), x: r.x, y: r.y, width: r.width, height: r.height }; });
    const rect = (selector: string): { x: number; y: number; width: number; height: number } | null => { const r = app.querySelector(selector)?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; };
    return structuredClone({ atelier: screen === 'game' && activeGame === 'atelier' && atelierStudio ? atelierSnapshot(atelierStudio) : null, gouter: screen === 'game' && activeGame === 'gouter' && gouterSession ? gouterSnapshot(gouterSession, app) : null, cherche: screen === 'game' && activeGame === 'cherche' && chercheSession ? chercheSnapshot(chercheSession, app) : null, promenade: screen === 'game' && activeGame === 'promenade' && promenadeSession ? promenadeSnapshot(promenadeSession, app) : null, bulles: screen === 'game' && activeGame === 'bulles' && bullesSession ? bullesSnapshot(bullesSession, app) : null, bonbons: screen === 'game' && activeGame === 'bonbons' && bonbonsSession ? bonbonsSnapshot(bonbonsSession, app) : null, traverse: screen === 'game' && activeGame === 'traverse' && traverseSession ? traverseSnapshot(traverseSession, app) : null, caisses: screen === 'game' && activeGame === 'caisses' && caissesSession ? caissesSnapshot(caissesSession, app) : null, chenille: screen === 'game' && activeGame === 'chenille' && chenilleSession ? chenilleSnapshot(chenilleSession, app) : null, collier: screen === 'game' && activeGame === 'collier' && collierSession ? collierSnapshot(collierSession, app) : null, briques: screen === 'game' && activeGame === 'briques' && briquesSession ? briquesSnapshot(briquesSession, app) : null, fusee: screen === 'game' && activeGame === 'fusee' && fuseeSession ? fuseeSnapshot(fuseeSession, app) : null, pepites: screen === 'game' && activeGame === 'pepites' && pepitesSession ? pepitesSnapshot(pepitesSession, app) : null, dedale: screen === 'game' && activeGame === 'dedale' && dedaleSession ? dedaleSnapshot(dedaleSession, app) : null, tambours: tamboursSession ?? null, ranger: rangerSession ?? null, suites: suitesSession ?? null, chemin: cheminSession ?? null, puzzle: puzzleSession ? { ...puzzleSession, zone: rect('.puzzle-zone'), boardScreen: rect('[data-puzzle-board]') } : null, screen, game: screen === 'game' && (activeGame === 'atelier' || activeGame === 'gouter' || activeGame === 'cherche') || tamboursSession || rangerSession || suitesSession || cheminSession || puzzleSession || session || memorySession || shapesSession || soundsSession || screen === 'levels' ? activeGame : null, level: tamboursSession?.level ?? rangerSession?.level ?? suitesSession?.level ?? cheminSession?.level ?? puzzleSession?.level ?? soundsSession?.level ?? shapesSession?.level ?? memorySession?.level ?? session?.level ?? null, index: tamboursSession?.index ?? rangerSession?.index ?? suitesSession?.index ?? soundsSession?.index ?? shapesSession?.index ?? session?.index ?? 0, selection: rangerSelected ?? soundSelected ?? selectedPiece ?? null, question: rangerSession?.questions[rangerSession.index] ?? suitesSession?.questions[suitesSession.index] ?? soundsSession?.questions[soundsSession.index] ?? shapesSession?.questions[shapesSession.index] ?? session?.questions[session.index] ?? null, sons: soundsSession ?? null, shapes: shapesSession ?? null, basket: session?.basket ?? 0, board: memorySession ? { ...memorySession, cards: memorySession.cards.map((card, i) => {
        const r = app.querySelector(`[data-card="${i}"]`)?.getBoundingClientRect();
        return { ...card, visible: memorySession!.preview || card.found || memorySession!.visible.includes(i), rect: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null };
    }) } : null, targets });
} }) });
render();
