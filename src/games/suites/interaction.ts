import { bindDragEnd } from '../../shell/drag';
import type { Session } from '../../engines/suites';
import { acceptActivation, bindAction, recordActivation } from '../../shell/activation';
import { dragPosition, withinDropZone } from '../../shell/coordinates';
export function patternActivationKey(state: Session, choice: number): string { return `suites:${state.level}:${state.index}:choice-${choice}`; }
/** Release commits once. Capture and gesture state belong to the current DOM,
 * so navigation, cancellation and backgrounding can never place an old piece. */
export function bindPatternChoices(root: HTMLElement, state: Session, respond: (choice: number) => void): () => void {
    const q = state.questions[state.index]!;
    let drag: { element: HTMLElement; pointer: number; x: number; y: number; moved: boolean; rect: DOMRect } | undefined;
    const ending = bindDragEnd(root.ownerDocument, () => drag, () => { drag = undefined; }, reason => {
        if (drag) recordActivation(patternActivationKey(state, Number(drag.element.dataset.patternChoice)), reason, false, 'cancelled');
    });
    const clear = ending.finish;
    for (const element of root.querySelectorAll<HTMLButtonElement>('[data-pattern-choice]:not(:disabled)')) {
        const choice = Number(element.dataset.patternChoice), key = patternActivationKey(state, choice);
        if (q.mode !== 'deux-suivants') { bindAction(element, () => respond(choice), key); continue; }
        element.addEventListener('pointerdown', event => {
            if (!event.isPrimary || event.button !== 0 || drag || document.hidden) { recordActivation(key, event.type, false, 'secondary-pointer'); return; }
            event.preventDefault(); element.focus({ preventScroll: true });
            drag = { element, pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false, rect: root.getBoundingClientRect() };
            element.setPointerCapture(event.pointerId); ending.watch();
        });
        element.addEventListener('pointermove', event => {
            if (!drag || drag.element !== element || drag.pointer !== event.pointerId) return;
            if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 12) drag.moved = true;
            if (!drag.moved) return;
            const p = dragPosition({ x: event.clientX, y: event.clientY }, drag, { x: 0, y: 0 }, drag.rect, drag.rect);
            element.style.transform = `translate(${p.x}px, ${p.y}px)`; element.classList.add('dragging');
        });
        element.addEventListener('pointerup', event => {
            if (!drag || drag.element !== element || drag.pointer !== event.pointerId) return;
            const d = drag, point = { x: event.clientX, y: event.clientY };
            const moved = d.moved || Math.hypot(point.x - d.x, point.y - d.y) >= 12;
            const slot = root.querySelector('.suites-active[data-missing="true"]');
            const valid = moved ? slot && withinDropZone(point, slot.getBoundingClientRect()) : withinDropZone(point, element.getBoundingClientRect());
            clear();
            if (!element.isConnected || document.hidden || !valid) { recordActivation(key, event.type, false, 'outside-or-inactive'); return; }
            if (acceptActivation(key, event.type, !moved)) respond(choice);
        });
        element.onclick = event => {
            if (event.detail !== 0) { recordActivation(key, event.type, false, 'compatibility-click'); return; }
            recordActivation(key, event.type, true, 'keyboard'); respond(choice);
        };
    }
    return ending.dispose;
}
