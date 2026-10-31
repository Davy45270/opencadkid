import type { Locator } from '@playwright/test';
import { expect } from './helpers';

/** Wait for finite feedback/return animations, leaving continuous hints alone. */
export async function expectMotionFinished(pieces: Locator): Promise<void> {
    await expect.poll(() => pieces.evaluateAll(elements => elements.length > 0 && elements.every(element =>
        element.getAnimations().every(animation =>
            animation.effect?.getComputedTiming().iterations === Infinity ||
            (!animation.pending && (animation.playState === 'finished' || animation.playState === 'idle'))))), { timeout: 1000 }).toBe(true);
}

/** Exact viewport geometry and no residual drag transform after a gentle return. */
export async function expectReturned(piece: Locator, origin: { x: number; y: number; width: number; height: number }): Promise<void> {
    await expectMotionFinished(piece);
    await expect.poll(() => piece.boundingBox(), { timeout: 1000 }).toEqual(origin);
    await expect.poll(() => piece.evaluate(element => ({
        inline: (element as HTMLElement).style.transform,
        computed: getComputedStyle(element).transform,
        dragging: element.classList.contains('dragging')
    })), { timeout: 1000 }).toEqual({ inline: '', computed: 'none', dragging: false });
}
