import { complete, FIELD, isUnlocked, parseRecords, start, tap, type Records, type State } from '../../engines/cherche';
import { bindAction, recordActivation } from '../../shell/activation';
import { screenToZone } from '../../shell/coordinates';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { names } from './items';
import { gameView, labels, levelView } from './view';

export const RECORDS_KEY = 'opencadkid.cherche.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.cherche-zone svg')?.getBoundingClientRect();
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, field: FIELD };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, seed: () => number, home: () => void): () => void {
    const t = labels[locale];
    let message: string = t.instruction;
    const wanted = (s: State): string[] => s.items.filter(it => it.target && !it.found).map(it => names[locale][it.kind]);
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'cherche:home');
        root.querySelectorAll<HTMLElement>('[data-cherche-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.chercheLevel); if (isUnlocked(id, session.records)) play(start(id, seed())); }, () => `cherche:level:${el.dataset.chercheLevel!}`));
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'cherche:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => speak(s.finished ? [t.won] : [t.instruction, ...wanted(s)]), 'cherche:listen');
        const again = root.querySelector<HTMLElement>('#cherche-again'), next = root.querySelector<HTMLElement>('#cherche-next');
        if (again) bindAction(again, () => play(start(s.level, seed())), `cherche:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1, seed())), `cherche:next:${s.level}`);
        // The zone listens (SVG ignores pointers app-wide); the drawing fills it exactly.
        const field = root.querySelector<HTMLElement>('.cherche-zone')!;
        // One tap is one look: pointerup on the primary pointer, wherever the finger went down.
        field.addEventListener('pointerup', event => {
            if (!event.isPrimary || event.button !== 0 || !session.state || session.state.finished) return;
            const p = screenToZone({ x: event.clientX, y: event.clientY }, field.getBoundingClientRect(), FIELD);
            const { state, found } = tap(session.state, p);
            if (state === session.state) { recordActivation('cherche:tap', event.type, false, 'already-found'); return; }
            session.state = state;
            if (found !== null) {
                recordActivation(`cherche:found:${found}`, event.type, true, 'target');
                const name = names[locale][state.items[found]!.kind];
                if (state.finished) { session.records = complete(session.records, state); writeRecords(storage, session.records); chime(sound()); message = t.won; speak([t.won]); }
                else { message = `${t.found} ${name}`; speak([t.found, name]); }
            } else {
                recordActivation('cherche:miss', event.type, false, 'not-a-target');
                if (state.hint !== null) message = t.hint;
            }
            draw();
        });
    };
    function play(s: State): void {
        session.screen = 'play'; session.state = s; message = t.instruction; draw();
        speak([t.instruction, ...wanted(s)]);
    }
    if (session.screen === 'play' && session.state) draw(); else levelsScreen();
    return () => { /* Nothing runs between taps. */ };
}
