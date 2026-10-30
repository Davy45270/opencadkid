import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { acceptActivation, activationEvents, bindAction, resetActivations } from '../src/shell/activation';
import * as compter from '../src/engines/compter';
import * as formes from '../src/engines/formes';
import * as memory from '../src/engines/paires';
import * as sons from '../src/engines/sons';
beforeEach(() => { resetActivations(); vi.useFakeTimers({ toFake: ['performance'] }); });
afterEach(() => vi.useRealTimers());
class Button extends EventTarget {
    onclick: ((event: Event & { detail: number }) => void) | null = null;
    getBoundingClientRect(): { x: number; y: number; width: number; height: number } { return { x: 10, y: 20, width: 130, height: 72 }; }
    send(type: string, overrides = {}): void {
        const event = Object.assign(new Event(type), { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 75, clientY: 56, detail: 1 }, overrides);
        this.dispatchEvent(event);
        if (type === 'click') this.onclick?.(event);
    }
}
const bind = (button: Button, action: () => void): void => bindAction(button as unknown as HTMLElement, action);
it('a touch validates an already filled basket on release, exactly once even with delayed click', () => {
    let s = compter.start(4, 17);
    const q = s.questions[0]!;
    for (let i = 0; i < q.target; i++) s = compter.moveObject(s, 1);
    const button = new Button(); let calls = 0;
    bind(button, () => { calls++; s = compter.answer(s, s.basket).state; });
    button.send('pointerdown'); button.send('pointerup');
    expect(s.solved).toBe(true); expect(calls).toBe(1);
    button.send('click'); expect(calls).toBe(1);
});
it('sorting counts the last piece but finishes only on Continue, without waiting for a compatibility click', () => {
    for (const engine of [formes, sons]) {
        let s = engine === formes ? formes.start(10, 17) : sons.start(10, 17, 'fr');
        for (let index = 0; index < 6; index++) {
            for (let piece = 0; piece < 3; piece++) {
                if ('locale' in s) {
                    const q = s.questions[s.index]!;
                    s = sons.drop(s, piece, q.boxes.indexOf(q.choices[piece]!.initial)).state;
                } else {
                    const q = s.questions[s.index]!;
                    s = formes.drop(s, piece, q.boxes.indexOf(q.choices[piece]!.color)).state;
                }
            }
            expect(s.placed).toHaveLength(3); expect(s.solved).toBe(true); expect(s.finished).toBe(false);
            const button = new Button(); let calls = 0;
            bind(button, () => { calls++; s = 'locale' in s ? sons.advance(s) : formes.advance(s); });
            button.send('pointerdown'); button.send('pointerup');
            expect(s.finished).toBe(index === 5); expect(s.index).toBe(Math.min(index + 1, 5));
            button.send('click'); expect(calls).toBe(1);
        }
    }
});
it('mouse and keyboard remain clickable; cancelled, secondary and dragged touches do not activate', () => {
    for (const ending of ['pointercancel', 'outside', 'drag', 'secondary']) {
        const button = new Button(); let calls = 0; bind(button, () => calls++);
        button.send('pointerdown', { isPrimary: ending !== 'secondary' });
        if (ending === 'pointercancel') button.send('pointercancel');
        button.send('pointerup', ending === 'outside' ? { clientX: 150 } : ending === 'drag' ? { clientX: 90 } : {});
        expect(calls).toBe(0);
        button.send('click', { detail: 0 }); expect(calls).toBe(1);
    }
    const button = new Button(); let calls = 0; bind(button, () => calls++);
    button.send('pointerdown', { pointerType: 'mouse' }); button.send('pointerup', { pointerType: 'mouse' }); button.send('click', { pointerType: 'mouse' }); expect(calls).toBe(1);
});

// Literal browser-like event sequences: no browser-generated events are assumed.
it('distinct targets respond immediately, while a same-target double touch responds once', () => {
    const answer = new Button(), next = new Button(); let answers = 0, advances = 0;
    bind(answer, () => answers++); bind(next, () => advances++);
    answer.send('pointerdown'); answer.send('pointerup');
    answer.send('pointerdown', { pointerId: 2 }); answer.send('pointerup', { pointerId: 2 });
    next.send('pointerdown', { pointerId: 3 }); next.send('pointerup', { pointerId: 3 });
    answer.send('click'); next.send('click');
    expect(answers).toBe(1); expect(advances).toBe(1);
});

for (const delay of [0, 100, 205, 300]) it(`compatibility click at ${delay} ms is ignored, the other target still acts`, () => {
    const a = new Button(), b = new Button(); let calls = 0;
    bind(a, () => calls++); bind(b, () => calls++);
    a.send('pointerdown'); a.send('pointerup');
    vi.advanceTimersByTime(delay);
    a.send('click'); b.send('pointerdown'); b.send('pointerup'); b.send('click');
    expect(calls).toBe(2);
});
it('a second finger cannot steal ownership, and a drag does not consume the next tap', () => {
    const a = new Button(), b = new Button(); let calls = 0;
    bind(a, () => calls++); bind(b, () => calls++);
    a.send('pointerdown');
    b.send('pointerdown', { pointerId: 2, isPrimary: false });
    b.send('pointerup', { pointerId: 2, isPrimary: false });
    a.send('pointermove', { clientX: 95 }); a.send('pointerup', { clientX: 95 }); a.send('click');
    b.send('pointerdown', { pointerId: 3 }); b.send('pointerup', { pointerId: 3 }); b.send('click');
    expect(calls).toBe(1);
});
it('a logical target survives rerender, but a new question has an independent target', () => {
    let calls = 0;
    const first = new Button(), replacement = new Button(), nextQuestion = new Button();
    bindAction(first as unknown as HTMLElement, () => calls++, 'q0:reserve-0');
    bindAction(replacement as unknown as HTMLElement, () => calls++, 'q0:reserve-0');
    bindAction(nextQuestion as unknown as HTMLElement, () => calls++, 'q1:reserve-0');
    first.send('pointerdown'); first.send('pointerup');
    replacement.send('pointerdown'); replacement.send('pointerup');
    nextQuestion.send('pointerdown'); nextQuestion.send('pointerup');
    expect(calls).toBe(2);
    vi.advanceTimersByTime(205);
    replacement.send('pointerdown'); replacement.send('pointerup');
    expect(calls).toBe(2);
    vi.advanceTimersByTime(145);
    replacement.send('pointerdown'); replacement.send('pointerup'); replacement.send('click');
    expect(calls).toBe(3);
});
it('event history is detached and bounded to the last 200 decisions', () => {
    const button = new Button(); bind(button, () => undefined);
    for (let i = 0; i < 220; i++) button.send('click', { detail: 0 });
    const snapshot = activationEvents(); expect(snapshot).toHaveLength(200);
    snapshot[0]!.reason = 'changed'; snapshot.pop();
    expect(activationEvents()).toHaveLength(200);
    expect(activationEvents()[0]!.reason).toBe('keyboard');
});

it('a completed drag and immediate tap on the same token both act', () => {
    expect(acceptActivation('q0:reserve-0', 'pointerup')).toBe(true);
    expect(acceptActivation('q0:reserve-0', 'pointerup', false)).toBe(true);
    expect(acceptActivation('q0:reserve-0', 'pointerup')).toBe(true);
    expect(acceptActivation('q0:reserve-0', 'pointerup')).toBe(false);
});

it('a plain compatibility MouseEvent is suppressed on a replacement of the same target', () => {
    const first = new Button(), replacement = new Button(), other = new Button(); let calls = 0;
    bindAction(first as unknown as HTMLElement, () => calls++, 'same');
    bindAction(replacement as unknown as HTMLElement, () => calls++, 'same');
    bindAction(other as unknown as HTMLElement, () => calls++, 'other');
    first.send('pointerdown'); first.send('pointerup');
    vi.advanceTimersByTime(300);
    replacement.send('click', { pointerType: '' });
    other.send('pointerdown'); other.send('pointerup');
    expect(calls).toBe(2);
    replacement.send('pointerdown', { pointerType: 'mouse' });
    replacement.send('pointerup', { pointerType: 'mouse' });
    replacement.send('click', { pointerType: 'mouse' });
    expect(calls).toBe(3);
});

for (const delay of [0, 205, 300]) it(`the final Continue cannot click the newly rendered Next at ${delay} ms`, () => {
    const next = new Button(), lastContinue = new Button(); let finished = false, level = 4;
    bindAction(next as unknown as HTMLElement, () => level++, 'finished:next');
    bindAction(lastContinue as unknown as HTMLElement, () => { finished = true; }, 'q5:continue');
    lastContinue.send('pointerdown'); lastContinue.send('pointerup');
    expect(finished).toBe(true);
    vi.advanceTimersByTime(delay);
    // Compatibility click is retargeted after the release replaced the old DOM.
    next.send('click', { pointerType: 'touch' });
    expect(level).toBe(4);
    // A genuinely new touch on this distinct target is accepted immediately.
    next.send('pointerdown', { pointerId: 2 }); next.send('pointerup', { pointerId: 2 });
    next.send('click', { pointerType: 'touch' });
    expect(level).toBe(5);
});

it('memory can reopen a card immediately in the next turn while duplicate touches stay ignored', () => {
    let board = memory.newBoard(6, 73);
    const buttons = board.cards.map(() => new Button());
    const render = (): void => buttons.forEach((button, index) => {
        bindAction(button as unknown as HTMLElement, () => {
            board = board.mismatch ? memory.settle(board) : memory.flip(board, index);
            render();
        }, `card-${index}:turn-${board.moves}`);
    });
    const tap = (index: number): void => { buttons[index]!.send('pointerdown'); buttons[index]!.send('pointerup'); buttons[index]!.send('click'); };
    render();
    tap(0); tap(0); expect(board.visible).toEqual([0]);
    const wrong = board.cards.findIndex(card => card.motif !== board.cards[0]!.motif);
    tap(wrong); expect(board.mismatch).toBe(true);
    const third = board.cards.findIndex((_, index) => index !== 0 && index !== wrong);
    tap(third); tap(third); expect(board.visible).toEqual([]); expect(board.moves).toBe(1);
    tap(0); expect(board.visible).toEqual([0]); expect(board.moves).toBe(1);
});

for (const delay of [0, 50, 120, 300]) it(`different selected pieces reach the same box at ${delay} ms`, () => {
    for (const engine of [formes, sons]) {
        resetActivations();
        let s = engine === formes ? formes.start(9, 17) : sons.start(9, 17, 'fr');
        const q = s.questions[0]!;
        const labels = 'locale' in s ? s.questions[0]!.choices.map(p => p.initial) : s.questions[0]!.choices.map(p => p.color);
        const pieces = labels.map((label, i) => labels.indexOf(label) !== i ? [labels.indexOf(label), i] : []).find(pair => pair.length === 2)!;
        const boxes: readonly string[] = q.boxes;
        const boxIndex = boxes.indexOf(labels[pieces[0]!]!);
        let selected: number | undefined;
        const box = new Button();
        bindAction(box as unknown as HTMLElement, () => {
            const piece = selected!; selected = undefined;
            s = 'locale' in s ? sons.drop(s, piece, boxIndex).state : formes.drop(s, piece, boxIndex).state;
        }, () => `q${s.index}:box-0:piece-${selected ?? 'none'}`);
        const tap = (): void => { box.send('pointerdown'); box.send('pointerup'); box.send('click'); };
        selected = pieces[0]!; tap();
        vi.advanceTimersByTime(delay);
        selected = pieces[1]!; tap();
        expect(s.placed).toEqual(pieces);
    }
});
it('the same box and unchanged selection at 120 ms commit only once', () => {
    const box = new Button(); let calls = 0;
    bindAction(box as unknown as HTMLElement, () => calls++, () => 'q0:box-X:piece-A');
    box.send('pointerdown'); box.send('pointerup');
    vi.advanceTimersByTime(120);
    box.send('pointerdown'); box.send('pointerup');
    expect(calls).toBe(1);
});
