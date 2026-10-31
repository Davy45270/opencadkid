/** A gesture owns its original node and capture target until every end path clears it. */
export interface DragHandle { pointer: number; element: HTMLElement; capture?: HTMLElement }
export function bindDragEnd(document: Document, current: () => DragHandle | undefined, reset: () => void, cancelled?: (reason: string) => void): { watch: () => void; finish: () => void; dispose: () => void } {
    const window = document.defaultView!;
    let frame: number | undefined;
    const finish = (): void => {
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        frame = undefined;
        const drag = current();
        // Forget ownership before releasing capture: lostpointercapture may reenter.
        reset();
        if (!drag) return;
        drag.element.style.transform = '';
        drag.element.classList.remove('dragging');
        const capture = drag.capture ?? drag.element;
        if (capture.hasPointerCapture(drag.pointer)) capture.releasePointerCapture(drag.pointer);
    };
    const cancel = (reason: string): void => {
        try { cancelled?.(reason); } finally { finish(); }
    };
    const end = (event: Event): void => {
        if (current()?.pointer === (event as PointerEvent).pointerId) cancel(event.type);
    };
    const visibility = (): void => { if (document.hidden) cancel('visibilitychange'); };
    const check = (): void => {
        frame = undefined;
        const drag = current();
        if (!drag) return;
        // Capture loss is pending until the next pointer event. A stationary finger
        // need not produce that event; hasPointerCapture already reflects the loss.
        if (document.hidden || !drag.element.isConnected || !(drag.capture ?? drag.element).hasPointerCapture(drag.pointer)) {
            cancel('lostpointercapture'); return;
        }
        frame = window.requestAnimationFrame(check);
    };
    const watch = (): void => { if (frame === undefined && current()) frame = window.requestAnimationFrame(check); };
    // Release bubbles after normal drop handlers; cancellation needs no drop.
    // Document scope also catches endings outside the original owner.
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) document.addEventListener(type, end, type !== 'pointerup');
    document.addEventListener('visibilitychange', visibility);
    return { watch, finish, dispose: () => {
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) document.removeEventListener(type, end, type !== 'pointerup');
        document.removeEventListener('visibilitychange', visibility);
        cancel('dispose');
    } };
}
