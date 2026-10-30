import { distanceToZone } from './coordinates';
/** Touch commands commit on release, before an asynchronously delivered compatibility click. */
export function bindAction(element: HTMLElement, action: () => void): void {
    let touch: { id: number; x: number; y: number; moved: boolean } | undefined;
    let suppressClick = false;
    element.addEventListener('pointerdown', event => {
        if (!event.isPrimary) return;
        suppressClick = false;
        if (event.pointerType === 'touch') touch = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    });
    element.addEventListener('pointermove', event => {
        if (touch?.id === event.pointerId && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) >= 12) touch.moved = true;
    });
    element.addEventListener('pointerup', event => {
        if (!touch || touch.id !== event.pointerId) return;
        const start = touch; touch = undefined; suppressClick = true;
        if (start.moved || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 12 || distanceToZone({ x: event.clientX, y: event.clientY }, element.getBoundingClientRect()) !== 0) return;
        action();
    });
    for (const name of ['pointercancel', 'lostpointercapture'] as const) element.addEventListener(name, event => { if (touch?.id === event.pointerId) { touch = undefined; suppressClick = true; } });
    element.onclick = event => { if (suppressClick && event.detail !== 0) { suppressClick = false; return; } action(); };
}
