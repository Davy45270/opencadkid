import type { Page } from '@playwright/test';
import { prepare } from './helpers';
import type { State } from '../../src/engines/gouter';
export interface Probe { screen: 'levels' | 'play'; state: State | null; records: Partial<Record<number, number>>; zone: { x: number; y: number; width: number; height: number } | null; field: { width: number; height: number }; levels: number }
export const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state(): { gouter: Probe } } }).__kid.state().gouter);
export async function openGame(page: Page): Promise<void> { await prepare(page); await page.locator('#back').click(); await page.locator('[data-game="gouter"]').click(); }
/** Field units to screen pixels, read from the live zone. */
export function screen(p: Probe, x: number, y: number): { x: number; y: number } {
    return { x: p.zone!.x + x * p.zone!.width / p.field.width, y: p.zone!.y + y * p.zone!.height / p.field.height };
}
/** Waits inside the page, frame by frame, until the simulation reaches a tick (game progress, not a clock). */
export function untilTick(page: Page, tick: number): Promise<number> {
    return page.evaluate(target => new Promise<number>(resolve => {
        const check = (): void => {
            const g = (window as unknown as { __kid: { state(): { gouter: Probe } } }).__kid.state().gouter;
            if (!g.state || g.state.status !== 'play' || g.state.tick >= target) resolve(g.state?.tick ?? -1); else requestAnimationFrame(check);
        };
        check();
    }), tick);
}
/** The middle of a rope between its anchor and the sweet. */
export function ropeMiddle(s: State, rope: number): { x: number; y: number } {
    const r = s.ropes[rope]!; return { x: (r.x + s.treat.x) / 2, y: (r.y + s.treat.y) / 2 };
}
/** Waits inside the page until a bubble carries the sweet (or the level ends). */
export function untilHeld(page: Page, bubble: number): Promise<boolean> {
    return page.evaluate(index => new Promise<boolean>(resolve => {
        const check = (): void => {
            const g = (window as unknown as { __kid: { state(): { gouter: Probe } } }).__kid.state().gouter;
            if (!g.state || g.state.status !== 'play') resolve(false); else if (g.state.bubbles[index]?.state === 'held') resolve(true); else requestAnimationFrame(check);
        };
        check();
    }), bubble);
}
