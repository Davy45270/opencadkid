import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ids, expressions, drawList } from '../src/characters/model';
import { characterSvg } from '../src/characters/svg';
import { backdrop } from '../src/ui/backdrops';
import { objectSvg, scenery } from '../src/ui/svg';
import { shapeSvg } from '../src/games/formes/shapes';
import { motifSvg } from '../src/games/paires/motifs';
import { sceneSvg } from '../src/games/puzzle/scenes';
import { sceneIds } from '../src/engines/puzzle';
import { canonicalPaintIds, validSvg, paintIds, paintReferences } from './svg-oracles';

it('every guide and expression owns valid, finite paint servers in both motion modes', () => {
    for (const id of ids) for (const expression of expressions) for (const motion of ['full', 'reduce'] as const) {
        const a = characterSvg(id, expression, 'celebration', motion);
        const b = characterSvg(id, expression, 'celebration', motion);
        expect(validSvg(a)).toBe(true); expect(validSvg(b)).toBe(true);
        expect(a).not.toMatch(/NaN|undefined|Infinity|<image|<script/);
        expect(a).toContain('<radialGradient'); expect(a).toContain('cy="218"');
        const allIds = [...paintIds(a), ...paintIds(b)];
        expect(new Set(allIds).size).toBe(allIds.length);
        for (const svg of [a, b]) for (const ref of paintReferences(svg)) expect(paintIds(svg)).toContain(ref);
        expect(canonicalPaintIds(a)).toBe(canonicalPaintIds(b));
        expect(drawList(id, 'face', expression, 'special', 0, 'reduce')).toEqual(drawList(id, 'face', expression, 'special', 800, 'reduce'));
    }
});
it('all six repeated puzzle scenes keep their nested character paint servers isolated', () => {
    const svgs = sceneIds.flatMap(scene => [sceneSvg(scene), sceneSvg(scene)]);
    const all = svgs.flatMap(paintIds);
    expect(new Set(all).size).toBe(all.length);
    for (const svg of svgs) {
        expect(validSvg(svg)).toBe(true);
        for (const ref of paintReferences(svg)) expect(paintIds(svg)).toContain(ref);
    }
});
it('shaded objects retain exact silhouette geometry and outlines stay unpainted', () => {
    const shape = { shape: 'carre', color: 'rouge', size: 'grand' } as const;
    for (const svg of [objectSvg('berry'), shapeSvg(shape), motifSvg('fish')]) {
        expect(validSvg(svg)).toBe(true); expect(svg).toContain('<radialGradient');
        for (const ref of paintReferences(svg)) expect(paintIds(svg)).toContain(ref);
    }
    expect(shapeSvg(shape, 'fr', true)).not.toContain('radialGradient');
    expect(motifSvg('fish', true)).not.toContain('radialGradient');
});
it('every screen has a distinct decorative SVG with no interactive or imported content', () => {
    const scenes = ['compter', 'paires', 'formes', 'sons', 'puzzle', 'chemin'].map(backdrop);
    expect(new Set(scenes).size).toBe(6);
    for (const svg of [...scenes, scenery()]) {
        expect(validSvg(svg)).toBe(true); expect(svg).toContain('aria-hidden="true"');
        expect(svg).not.toMatch(/<image|<text|<script|NaN|undefined/);
    }
});
// WCAG sRGB transfer, calculated independently from the CSS hexadecimal endpoints.
function luminance(hex: string): number {
    const channels = hex.slice(1).match(/../g)!.map(c => {
        const v = parseInt(c, 16) / 255;
        return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    return channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722;
}
function contrast(a: string, b: string): number {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
it('text meets 4.5:1 on every new card gradient endpoint and the paper background', () => {
    const css = readFileSync('src/style.css', 'utf8');
    const root = css.match(/:root\{([^}]+)\}/)![1]!;
    const ink = root.match(/color:(#[a-f\d]{6})/)![1]!;
    const paper = root.match(/background:(#[a-f\d]{6})/)![1]!;
    // Read the actual new styles, including the base card's two gradient layers.
    const rules = [...css.matchAll(/\.game-card(?:\[data-game=\w+\])?\{([^}]+)\}/g)].map(m => m[1]!);
    // Border/shadow colours aren't text backgrounds; inspect only the background declarations.
    const gradientEnds = rules.flatMap(rule => [...(rule.match(/background-image:([^;]+)/)?.[1] ?? '').matchAll(/#[a-f\d]{6}(?![a-f\d])/g)].map(m => m[0]));
    expect(gradientEnds.length).toBeGreaterThanOrEqual(12);
    const colorOf = (selector: string): string => {
        const rule = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
            .filter(m => m[1]!.split(',').map(s => s.trim()).includes(selector) && /(?:^|;)color:/.test(m[2]!)).at(-1)![2]!;
        return rule.match(/(?:^|;)color:(#[a-f\d]{6})/)![1]!;
    };
    const rewards = colorOf('.small-stars');
    for (const background of [paper, ...gradientEnds]) {
        expect(contrast(ink, background), `${ink} on ${background}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(rewards, background), `reward text on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
    const inks = [ink, rewards, ...['.eyebrow', '.memory-encouragement', '.stars'].map(colorOf)];
    for (const text of inks) expect(contrast(text, paper)).toBeGreaterThanOrEqual(4.5);
    const opacity = Number(css.match(/\.game-backdrop\{[^}]*opacity:([\d.]+)/)![1]);
    for (const game of ['compter', 'paires', 'formes', 'sons', 'puzzle', 'chemin']) {
        for (const match of backdrop(game).matchAll(/(?:fill|stroke)="(#[a-f\d]{6})"/g)) {
            const blended = '#' + [1, 3, 5].map(at => Math.round(parseInt(paper.slice(at, at + 2), 16) * (1 - opacity) + parseInt(match[1]!.slice(at, at + 2), 16) * opacity).toString(16).padStart(2, '0')).join('');
            for (const text of inks) expect(contrast(text, blended), `${text} on ${game} decoration`).toBeGreaterThanOrEqual(4.5);
        }
    }
    expect(css).toContain('.game-backdrop{position:absolute;'); expect(opacity).toBe(.14);
});
