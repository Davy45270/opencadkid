import type { Locator } from '@playwright/test';
import { expect } from './helpers';

/** Wait for finite feedback/return animations, leaving continuous hints alone. */
export async function expectMotionFinished(pieces: Locator): Promise<void> {
    await expect.poll(() => pieces.evaluateAll(elements => elements.length > 0 && elements.every(element =>
        element.getAnimations().every(animation =>
            animation.effect?.getComputedTiming().iterations === Infinity ||
            (!animation.pending && (animation.playState === 'finished' || animation.playState === 'idle'))))), { timeout: 1000 }).toBe(true);
}

interface RelativeBox { x: number; y: number; width: number; height: number; relativeToParent: true }

/** Geometry in the original grid/case, independent of page layout and scrolling. */
async function relativeBox(piece: Locator): Promise<RelativeBox> {
    return piece.evaluate(element => {
        const rect = element.getBoundingClientRect(), parent = element.parentElement!.getBoundingClientRect();
        return { x: rect.x - parent.x, y: rect.y - parent.y, width: rect.width, height: rect.height, relativeToParent: true };
    });
}

export async function captureReturnOrigin(piece: Locator): Promise<RelativeBox> {
    await expectMotionFinished(piece);
    return relativeBox(piece);
}

/** Strict half-pixel geometry and no residual drag transform after a gentle return. */
export async function expectReturned(piece: Locator, origin: RelativeBox): Promise<void> {
    await expectMotionFinished(piece);
    await expect.poll(async () => {
        const actual = await relativeBox(piece);
        return Math.max(...(['x', 'y', 'width', 'height'] as const).map(key => Math.abs(actual[key] - origin[key])));
    }, { timeout: 1000 }).toBeLessThanOrEqual(0.5);
    await expect.poll(() => piece.evaluate(element => ({
        inline: (element as HTMLElement).style.transform,
        computed: getComputedStyle(element).transform,
        dragging: element.classList.contains('dragging')
    })), { timeout: 1000 }).toEqual({ inline: '', computed: 'none', dragging: false });
}
