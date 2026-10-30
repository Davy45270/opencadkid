import { start, answer, advance, moveObject, complete, levels, isUnlocked, type Session } from '../engines/compter';
import { home } from '../ui/home';
import { levelView, gameView, instruction } from '../games/compter/view';
import { icon } from '../ui/svg';
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
let session: Session | undefined;
let hint = false;
let expression: Expression = 'joie';
let seedCounter = 0;
let timers: ReturnType<typeof setTimeout>[] = [];
function seed(): number { const buffer = new Uint32Array(1); try { crypto.getRandomValues(buffer); return buffer[0]!; } catch { return ++seedCounter * 7919; } }
function persist(): void { writeSave(storage, save); }
function cancel(): void { timers.forEach(clearTimeout); timers = []; stopSpeech(); }
function speak(parts: string[]): void { say(parts, save.locale, save.voice); }
function bind(selector: string, fn: (element: HTMLElement) => void): void { app.querySelectorAll<HTMLElement>(selector).forEach(el => el.addEventListener('click', () => fn(el))); }
function render(): void {
    cancel(); applyLocale(save.locale);
    if (screen === 'home') {
        app.innerHTML = home(save);
        bind('[data-game]', () => { screen = 'levels'; render(); speak([games[0]!.names[save.locale], text(save.locale, 'levels')]); });
        bind('#parents', () => gate('parents'));
        bind('#tictac', () => gate('tictac'));
    } else if (screen === 'levels') {
        app.innerHTML = levelView(save);
        bind('[data-level]', el => { const level = Number(el.dataset.level); if (isUnlocked(level, save.records)) begin(level); });
    } else if (screen === 'game' && session) {
        app.innerHTML = gameView(session, save.locale, expression, hint);
        bind('[data-answer]', el => respond(Number(el.dataset.answer), el));
        bind('#check', el => respond(session!.basket, el));
        bind('#continue', () => {
            session = advance(session!); hint = false; expression = 'joie';
            if (session.finished) { save.records = complete(save.records, session); persist(); chime(save.sound); }
            render(); speak([session.finished ? text(save.locale, 'finished') : instruction(session.questions[session.index]!, save.locale)]);
        });
        bind('#listen', () => speak([session!.finished ? text(save.locale, 'finished') : instruction(session!.questions[session!.index]!, save.locale)]));
        bind('#again', () => begin(session!.level));
        bind('#next', () => { if (session!.level < levels.length) begin(session!.level + 1); });
    }
    bind('#back', () => { screen = 'home'; session = undefined; render(); });
}
function begin(level: number): void { session = start(level, seed()); screen = 'game'; hint = false; expression = 'joie'; render(); speak([instruction(session.questions[0]!, save.locale)]); }
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
    const scope = q.mode === 'plus' ? app.querySelector(`[data-answer="${q.answer}"]`) : q.mode === 'remplir' ? app.querySelector('.fill-zone') : app.querySelector('.objects');
    const items = [...(scope?.querySelectorAll<HTMLElement>('[data-object], .token') ?? [])];
    const n = q.mode === 'plus' ? q.answer === 0 ? q.left : q.right : q.target;
    for (let i = 0; i < n; i++) timers.push(setTimeout(() => {
        items.forEach(el => el.classList.remove('counting'));
        items[i]?.classList.add('counting');
        app.querySelector('.instruction-pic')?.classList.add('counting');
        speak([String(i + 1)]);
    }, 1100 + i * 850));
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
    app.innerHTML = `<section class="parent-panel"><h1>${text(save.locale, 'parents')}</h1><label>${text(save.locale, 'language')}<select id="language"><option value="fr" ${save.locale === 'fr' ? 'selected' : ''}>Français</option><option value="en" ${save.locale === 'en' ? 'selected' : ''}>English</option></select></label><label>${text(save.locale, 'voice')}<input id="voice" type="checkbox" ${save.voice ? 'checked' : ''}></label><label>${text(save.locale, 'sound')}<input id="sound" type="checkbox" ${save.sound ? 'checked' : ''}></label><button id="erase">${text(save.locale, 'erase')}</button><div id="confirmation"></div><button id="close">${icon('close')}<span>${text(save.locale, 'close')}</span></button></section>`;
    app.querySelector('#language')!.addEventListener('change', event => { save.locale = (event.target as HTMLSelectElement).value === 'en' ? 'en' : 'fr'; persist(); applyLocale(save.locale); settings(); });
    for (const key of ['voice', 'sound'] as const) app.querySelector(`#${key}`)!.addEventListener('change', event => { save[key] = (event.target as HTMLInputElement).checked; persist(); if (key === 'voice') stopSpeech(); else if (!save.sound) stopSound(); else unlockSound(); });
    bind('#erase', () => {
        app.querySelector('#confirmation')!.innerHTML = `<p>${text(save.locale, 'confirm')}</p><button id="yes">${text(save.locale, 'yes')}</button><button id="no">${text(save.locale, 'no')}</button>`;
        bind('#yes', () => { save = { ...fresh(save.locale), voice: save.voice, sound: save.sound }; persist(); settings(); }); bind('#no', settings);
    });
    bind('#close', () => { screen = 'home'; render(); });
}
// One primary pointer owns the gesture. DOM updates only after release.
let gesture: { id: number; x: number; y: number; area: 'reserve' | 'basket'; moved: boolean } | undefined;
let lastMove = -1000;
app.addEventListener('pointerdown', event => {
    if (gesture || !event.isPrimary || !session || session.solved) return;
    const token = (event.target as Element).closest<HTMLElement>('.token'); if (!token) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, area: token.hasAttribute('data-reserve') ? 'reserve' : 'basket', moved: false };
    app.setPointerCapture(event.pointerId);
});
app.addEventListener('pointermove', event => { if (gesture?.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 12) gesture.moved = true; });
app.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const g = gesture; gesture = undefined;
    if (app.hasPointerCapture(event.pointerId)) app.releasePointerCapture(event.pointerId);
    const end = document.elementFromPoint(event.clientX, event.clientY);
    if (g.moved && !end?.closest(g.area === 'reserve' ? '#basket' : '#reserve')) return;
    if (performance.now() - lastMove < 180) return;
    lastMove = performance.now();
    if (session) { session = moveObject(session, g.area === 'reserve' ? 1 : -1); render(); }
});
for (const name of ['pointercancel', 'lostpointercapture']) app.addEventListener(name, () => { gesture = undefined; });
app.addEventListener('keydown', event => {
    const token = (event.target as Element).closest('.token');
    if (token && (event.key === 'Enter' || event.key === ' ') && session) { event.preventDefault(); session = moveObject(session, token.hasAttribute('data-reserve') ? 1 : -1); render(); }
});
document.addEventListener('pointerdown', () => { unlockSpeech(); if (save.sound) unlockSound(); }, { once: true, capture: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancel(); stopSound(); } else if (save.sound) unlockSound(); });
Object.defineProperty(window, '__kid', { configurable: false, writable: false, value: Object.freeze({ state: () => {
    const targets = [...app.querySelectorAll<HTMLElement>('button, select, input')].filter(el => !el.hasAttribute('disabled')).map(el => { const r = el.getBoundingClientRect(); return { id: el.id || (el.dataset.answer !== undefined ? `answer-${el.dataset.answer}` : el.dataset.level ? `level-${el.dataset.level}` : el.hasAttribute('data-reserve') ? `reserve-${el.dataset.reserve}` : el.hasAttribute('data-basket') ? `basket-${el.dataset.basket}` : el.dataset.game || ''), x: r.x, y: r.y, width: r.width, height: r.height }; });
    return structuredClone({ screen, game: session || screen === 'levels' ? 'compter' : null, level: session?.level ?? null, index: session?.index ?? 0, question: session?.questions[session.index] ?? null, basket: session?.basket ?? 0, targets });
} }) });
render();
