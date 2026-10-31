import { afterEach, expect, it, vi } from 'vitest';
import { bindDragEnd, type DragHandle } from '../src/shell/drag';
import { bindPatternChoices } from '../src/games/suites/interaction';
import { start } from '../src/engines/suites';

// Minimal test DOM, following the EventTarget fixtures used for activation.
// Frames are explicit: no browser, timers, or DOM dependency is needed.
class TestDocument extends EventTarget {
    hidden = false;
    private sequence = 0;
    readonly frames = new Map<number, FrameRequestCallback>();
    readonly defaultView = {
        requestAnimationFrame: (callback: FrameRequestCallback): number => { const id = ++this.sequence; this.frames.set(id, callback); return id; },
        cancelAnimationFrame: (id: number): void => { this.frames.delete(id); }
    };
    frame(): void { const batch = [...this.frames.values()]; this.frames.clear(); batch.forEach(callback => callback(16)); }
}
class TestClassList extends Set<string> {
    remove(...tokens: string[]): void { tokens.forEach(token => this.delete(token)); }
}
class TestElement extends EventTarget {
    isConnected = true;
    style = { transform: '' };
    classList = new TestClassList();
    dataset: Record<string, string> = {};
    captures = new Set<number>();
    onclick: ((event: Event) => void) | null = null;
    constructor(readonly ownerDocument: TestDocument) { super(); }
    focus(): void { /* The fixture has no focus navigation. */ }
    getBoundingClientRect(): { x: number; y: number; width: number; height: number; left: number; top: number; right: number; bottom: number } {
        return { x: 0, y: 0, width: 300, height: 300, left: 0, top: 0, right: 300, bottom: 300 };
    }
    hasPointerCapture(pointer: number): boolean { return this.captures.has(pointer); }
    setPointerCapture(pointer: number): void { this.captures.add(pointer); }
    releasePointerCapture(pointer: number): void { this.captures.delete(pointer); }
    get element(): HTMLElement { return this as unknown as HTMLElement; }
}
function send(target: EventTarget, type: string, overrides = {}): void {
    target.dispatchEvent(Object.assign(new Event(type, { bubbles: true, cancelable: true }), { pointerId: 1, isPrimary: true, button: 0, clientX: 20, clientY: 20 }, overrides));
}
function fixture(separateCapture = false) {
    const document = new TestDocument(), piece = new TestElement(document), capture = separateCapture ? new TestElement(document) : piece;
    const active: DragHandle = { pointer: 1, element: piece.element, capture: capture.element };
    let drag: DragHandle | undefined = active;
    piece.classList.add('dragging'); piece.style.transform = 'translate(30px, 40px)'; capture.setPointerCapture(1);
    const ending = bindDragEnd(document as unknown as Document, () => drag, () => { drag = undefined; });
    ending.watch();
    const clean = (): void => {
        expect(drag).toBeUndefined(); expect(piece.classList.has('dragging')).toBe(false);
        expect(piece.style.transform).toBe(''); expect(capture.hasPointerCapture(1)).toBe(false); expect(document.frames.size).toBe(0);
    };
    return { document, piece, capture, ending, clean, current: () => drag };
}
afterEach(() => vi.unstubAllGlobals());
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'visibilitychange']) {
    it(`clears ownership, visuals and capture on ${type}, including a separate capture target`, () => {
        for (const separate of [false, true]) {
            const f = fixture(separate);
            if (type === 'visibilitychange') f.document.hidden = true;
            send(f.document, type); f.clean();
            send(f.document, type); f.ending.finish(); f.clean(); f.ending.dispose();
        }
    });
}
it('cleans a stationary gesture when capture is released without lostpointercapture delivery', () => {
    const f = fixture(); f.capture.releasePointerCapture(1);
    f.document.frame(); f.clean(); f.ending.dispose();
});
it('cleans the original detached node when a render replaces it', () => {
    const f = fixture(); f.piece.isConnected = false;
    f.document.frame(); f.clean(); f.ending.dispose();
});
it('ignores endings from a second finger and visible visibility changes', () => {
    const f = fixture();
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) send(f.document, type, { pointerId: 2 });
    send(f.document, 'visibilitychange'); f.document.frame();
    expect(f.current()).toBeDefined(); expect(f.piece.classList.has('dragging')).toBe(true);
    f.ending.dispose(); f.clean();
});
it('forgets ownership before capture release can dispatch a reentrant lostpointercapture', () => {
    const f = fixture();
    f.capture.releasePointerCapture = pointer => {
        expect(f.current()).toBeUndefined(); f.capture.captures.delete(pointer); send(f.document, 'lostpointercapture');
    };
    f.ending.finish(); f.clean(); f.ending.dispose();
});
it('does not cancel a successful release twice when its drop handler already finished', () => {
    const document = new TestDocument(), piece = new TestElement(document), cancelled = vi.fn();
    let drag: DragHandle | undefined = { pointer: 1, element: piece.element };
    piece.setPointerCapture(1);
    const ending = bindDragEnd(document as unknown as Document, () => drag, () => { drag = undefined; }, cancelled);
    ending.watch(); ending.finish(); send(document, 'pointerup');
    expect(cancelled).not.toHaveBeenCalled(); expect(document.frames.size).toBe(0); ending.dispose();
});
it('suites keeps one owner across cards and cannot resurrect a cancelled drag on noisy moves', () => {
    const document = new TestDocument(); vi.stubGlobal('document', document);
    const cards = [new TestElement(document), new TestElement(document)];
    cards.forEach((card, index) => { card.dataset.patternChoice = String(index); });
    const root = Object.assign(new TestElement(document), { querySelectorAll: () => cards, querySelector: () => undefined });
    const respond = vi.fn(), dispose = bindPatternChoices(root.element, start(9, 14), respond);
    send(cards[0]!, 'pointerdown');
    send(cards[1]!, 'pointerdown', { pointerId: 2, isPrimary: false });
    send(cards[1]!, 'pointerdown'); // A noisy primary start cannot steal the existing owner.
    send(cards[1]!, 'pointermove', { clientX: 60 });
    send(cards[1]!, 'pointermove', { pointerId: 2, clientX: 60 });
    send(document, 'pointerup', { pointerId: 2 });
    send(cards[0]!, 'pointermove', { clientX: 60 });
    expect(cards[0]!.classList.has('dragging')).toBe(true);
    expect(cards[1]!.classList.has('dragging')).toBe(false);
    cards[0]!.releasePointerCapture(1); document.frame();
    send(cards[0]!, 'pointermove', { clientX: 90 }); send(cards[1]!, 'pointermove', { clientX: 90 });
    send(document, 'pointerup');
    for (const card of cards) { expect(card.classList.has('dragging')).toBe(false); expect(card.style.transform).toBe(''); }
    expect(respond).not.toHaveBeenCalled(); dispose(); expect(document.frames.size).toBe(0);
});
