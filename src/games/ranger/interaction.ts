import type { Session } from '../../engines/ranger';
import { acceptActivation, bindAction, recordActivation } from '../../shell/activation';
import { distanceToZone, dragPosition, withinDropZone } from '../../shell/coordinates';
export function placementKey(game: string, level: number, question: number, target: string, selection: string | number | undefined): string { return `${game}:${level}:${question}:${target}:piece-${selection ?? 'none'}`; }
/** One captured primary finger; every coordinate and snap allowance is in CSS pixels. */
export function bindObjects(root: HTMLElement, state: Session, selected: () => string | undefined, select: (id: string | undefined) => void, respond: (id: string, bin: string) => void): () => void {
    const q = state.questions[state.index];
    if (!q || state.finished) return () => {};
    let drag: { element: HTMLElement; pointer: number; x: number; y: number; moved: boolean; rect: DOMRect } | undefined;
    const clear = (): void => {
        const d = drag; drag = undefined;
        if (!d) return;
        d.element.style.transform = ''; d.element.classList.remove('dragging');
        if (d.element.hasPointerCapture(d.pointer)) d.element.releasePointerCapture(d.pointer);
    };
    const choose = (id: string): void => {
        if (document.hidden) return;
        if (q.rule === 'intrus') respond(id, 'intrus');
        else { select(id); root.querySelectorAll<HTMLElement>('[data-object]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.object === id))); }
    };
    for (const bin of root.querySelectorAll<HTMLElement>('[data-bin]')) bindAction(bin, () => {
        const id = selected(); if (id !== undefined) { select(undefined); respond(id, bin.dataset.bin!); }
    }, () => placementKey('ranger', state.level, state.index, bin.dataset.bin!, selected()));
    for (const element of root.querySelectorAll<HTMLElement>('[data-object]:not(:disabled)')) {
        const id = element.dataset.object!, key = placementKey('ranger', state.level, state.index, 'object', id);
        element.addEventListener('pointerdown', event => {
            if (!event.isPrimary || event.button !== 0 || drag || document.hidden) return;
            event.preventDefault(); element.focus({ preventScroll: true });
            drag = { element, pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false, rect: root.getBoundingClientRect() };
            element.setPointerCapture(event.pointerId);
        });
        element.addEventListener('pointermove', event => {
            if (!drag || drag.pointer !== event.pointerId) return;
            if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 12) drag.moved = true;
            if (!drag.moved) return;
            const p = dragPosition({ x: event.clientX, y: event.clientY }, drag, { x: 0, y: 0 }, drag.rect, drag.rect);
            element.style.transform = `translate(${p.x}px, ${p.y}px)`; element.classList.add('dragging');
        });
        element.addEventListener('pointerup', event => {
            if (!drag || drag.pointer !== event.pointerId) return;
            const d = drag, point = { x: event.clientX, y: event.clientY };
            const moved = d.moved || Math.hypot(point.x - d.x, point.y - d.y) >= 12;
            const bins = [...root.querySelectorAll<HTMLElement>('[data-bin]')].map(el => ({ el, rect: el.getBoundingClientRect() })).sort((a, b) => distanceToZone(point, a.rect) - distanceToZone(point, b.rect));
            clear();
            if (!element.isConnected || document.hidden) return;
            if (!moved) { if (withinDropZone(point, element.getBoundingClientRect()) && acceptActivation(key, event.type)) choose(id); return; }
            const bin = bins[0];
            if (!bin || !withinDropZone(point, bin.rect)) { recordActivation(key, event.type, false, 'outside'); return; }
            select(undefined);
            if (acceptActivation(placementKey('ranger', state.level, state.index, bin.el.dataset.bin!, id), event.type, false)) {
                respond(id, bin.el.dataset.bin!);
                if (!matchMedia('(prefers-reduced-motion: reduce)').matches) root.querySelector<HTMLElement>(`[data-object="${id}"]:not(:disabled)`)?.animate([{ transform: `translate(${point.x - d.x}px, ${point.y - d.y}px)` }, { transform: 'translate(0, 0)' }], { duration: 260, easing: 'ease-out' });
            }
        });
        for (const type of ['pointercancel', 'lostpointercapture'] as const) element.addEventListener(type, event => {
            if (drag?.pointer === event.pointerId) { recordActivation(key, type, false, 'cancelled'); clear(); }
        });
        element.onclick = event => { if (event.detail === 0) { recordActivation(key, 'click', true, 'keyboard'); choose(id); } else recordActivation(key, 'click', false, 'compatibility-click'); };
    }
    const visibility = (): void => { if (document.hidden) { clear(); select(undefined); root.querySelectorAll<HTMLElement>('[data-object]').forEach(el => el.setAttribute('aria-pressed', 'false')); } };
    document.addEventListener('visibilitychange', visibility);
    return () => { clear(); document.removeEventListener('visibilitychange', visibility); };
}
