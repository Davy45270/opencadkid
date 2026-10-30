import { distanceToZone, type Rect } from './coordinates';
export interface ActivationEvent { target: string; type: string; time: number; accepted: boolean; reason: string }
const origin = performance.now();
const history: ActivationEvent[] = [];
export function activationEvents(): ActivationEvent[] { return history.map(event => ({ ...event })); }
export function recordActivation(target: string, type: string, accepted: boolean, reason: string): void {
    history.push({ target, type, time: performance.now() - origin, accepted, reason });
    if (history.length > 200) history.shift();
}
interface TargetState { last: number; compatibilityUntil: number }
const targets = new Map<string, TargetState>();
const bindings = new WeakMap<HTMLElement, { action: () => void; key: string }>();
function compatibilityClick(key: string): void {
    const state = targets.get(key) ?? { last: -Infinity, compatibilityUntil: -Infinity };
    state.compatibilityUntil = performance.now() + 350; targets.set(key, state);
}
export function resetActivations(): void { targets.clear(); }
/** Debounce only the same logical target, including its replacement after a render. */
export function acceptActivation(key: string, type: string, tap = true): boolean {
    const now = performance.now(), state = targets.get(key) ?? { last: -Infinity, compatibilityUntil: -Infinity };
    targets.set(key, state);
    if (tap && now - state.last < 180) { recordActivation(key, type, false, 'same-target-double-tap'); return false; }
    state.last = tap ? now : -Infinity;
    recordActivation(key, type, true, tap ? 'distinct-gesture' : 'primary-drag'); return true;
}
/** Release commits once; browser compatibility clicks never commit a touch again. */
let anonymousTarget = 0;
export function bindAction(element: HTMLElement, action: () => void, key = element.id || `action-${++anonymousTarget}`): void {
    const existing = bindings.get(element);
    if (existing) { existing.action = action; existing.key = key; return; }
    const binding = { action, key }; bindings.set(element, binding);
    let touch: { id: number; x: number; y: number; moved: boolean; rect: Rect } | undefined;
    let touchClickUntil = -Infinity;
    element.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'touch') {
            touchClickUntil = -Infinity;
            const state = targets.get(binding.key); if (state) state.compatibilityUntil = -Infinity;
            return;
        }
        if (!event.isPrimary || touch) { touchClickUntil = performance.now() + 350; compatibilityClick(binding.key); recordActivation(binding.key, event.type, false, 'secondary-pointer'); return; }
        touch = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, rect: element.getBoundingClientRect() };
    });
    element.addEventListener('pointermove', event => {
        if (touch?.id === event.pointerId && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) >= 12) touch.moved = true;
    });
    element.addEventListener('pointerup', event => {
        if (!touch || touch.id !== event.pointerId) return;
        const start = touch; touch = undefined; touchClickUntil = performance.now() + 350; compatibilityClick(binding.key);
        if (start.moved || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 12 || distanceToZone({ x: event.clientX, y: event.clientY }, start.rect) !== 0) {
            recordActivation(binding.key, event.type, false, 'drag-or-outside'); return;
        }
        if (acceptActivation(binding.key, event.type)) binding.action();
    });
    for (const name of ['pointercancel', 'lostpointercapture'] as const) element.addEventListener(name, event => {
        if (touch?.id !== event.pointerId) return;
        touch = undefined; touchClickUntil = performance.now() + 350; compatibilityClick(binding.key); recordActivation(binding.key, name, false, 'cancelled');
    });
    element.onclick = event => {
        if (event.detail !== 0 && (event.pointerType === 'touch' || performance.now() <= touchClickUntil || performance.now() <= (targets.get(binding.key)?.compatibilityUntil ?? -Infinity))) {
            recordActivation(binding.key, event.type, false, 'compatibility-click'); return;
        }
        recordActivation(binding.key, event.type, true, event.detail === 0 ? 'keyboard' : 'mouse'); binding.action();
    };
}
