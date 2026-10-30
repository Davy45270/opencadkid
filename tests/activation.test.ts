import { expect, it } from 'vitest';
import { bindAction } from '../src/shell/activation';
import * as compter from '../src/engines/compter';
import * as formes from '../src/engines/formes';
import * as sons from '../src/engines/sons';
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
    button.send('pointerdown', { pointerType: 'mouse' }); button.send('pointerup', { pointerType: 'mouse' }); button.send('click'); expect(calls).toBe(1);
});
