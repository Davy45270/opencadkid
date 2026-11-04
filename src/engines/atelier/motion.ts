import { partInk } from './drawings';
/** Pre-authored animations for every colouring model. Only the child's colours vary:
 * the movement, timing and pivots are fixed, so a coloured picture always plays the same way. */
export type Motion =
    | { kind: 'rotate'; angle: number; cx: number; cy: number; dur: number }
    | { kind: 'move'; dx: number; dy: number; dur: number }
    | { kind: 'spin'; cx: number; cy: number; dur: number }
    | { kind: 'flap'; cx: number; scale: number; dur: number }
    | { kind: 'pulse'; cx: number; cy: number; scale: number; dur: number };
export interface Part { zones: readonly string[]; ink: readonly string[]; motion: Motion; follow: boolean }
export interface Show { whole: Motion; parts: readonly Part[]; extra?: 'smoke' }
const rotate = (angle: number, cx: number, cy: number, dur: number): Motion => ({ kind: 'rotate', angle, cx, cy, dur });
const move = (dx: number, dy: number, dur: number): Motion => ({ kind: 'move', dx, dy, dur });
const part = (zones: readonly string[], motion: Motion, ink: readonly string[] = [], follow = true): Part => ({ zones, ink, motion, follow });
export const shows: Readonly<Record<string, Show>> = {
    boubou: { whole: move(0, -10, 1.6), parts: [part(['left-ear'], rotate(-10, 100, 75, .8)), part(['right-ear'], rotate(10, 220, 75, .8))] },
    caliroux: { whole: rotate(4, 160, 290, 2.4), parts: [part(['striped-tail'], rotate(12, 220, 230, 1.2), [partInk.caliTail])] },
    pestouille: { whole: move(0, -14, 2.2), parts: [part(['left-wing'], rotate(14, 100, 175, .7), [partInk.leftWing]), part(['right-wing'], rotate(-14, 220, 175, .7), [partInk.rightWing])] },
    tutu: { whole: rotate(6, 160, 285, 1.8), parts: [part(['flower'], { kind: 'spin', cx: 276.5, cy: 57.5, dur: 4 }, [partInk.flower]), part(['curled-tail'], rotate(10, 225, 225, 1.2), [partInk.tutuTail])] },
    lumi: { whole: move(0, -8, 1.4), parts: [part(['flowing-tail'], rotate(10, 215, 215, 1.4), [partInk.lumiTail]), part(['mane'], rotate(4, 100, 90, 1.4), [partInk.mane]), part(['chest-star'], { kind: 'pulse', cx: 160, cy: 218, scale: 1.2, dur: 1.4 })] },
    maison: { whole: move(0, -3, 2.4), parts: [part(['sun'], { kind: 'spin', cx: 33, cy: 40, dur: 8 }, [], false), part(['door'], { kind: 'flap', cx: 136, scale: .3, dur: 3 })], extra: 'smoke' },
    arbre: { whole: rotate(3, 160, 290, 2.6), parts: [part(['fallen-leaf'], rotate(15, 50, 240, 1.6), [partInk.leafVein], false)] },
    poisson: { whole: move(-18, 6, 2.4), parts: [part(['tail'], rotate(14, 230, 151, .8), [partInk.fishTail]), part(['side-fin'], rotate(12, 170, 150, .8), [partInk.sideFin]), part(['bubble-top', 'bubble-bottom'], move(0, -12, 1.8), [], false)] },
    fusee: { whole: move(0, -22, 1.8), parts: [part(['flame'], { kind: 'pulse', cx: 160, cy: 234, scale: 1.3, dur: .4 }, [partInk.flame]), part(['planet'], move(0, 6, 3), [partInk.ring], false), part(['moon'], move(0, -6, 3), [], false)] },
    papillon: { whole: move(0, -14, 1.8), parts: [part(['left-top', 'right-top', 'left-bottom', 'right-bottom', 'left-top-spot', 'right-top-spot', 'left-bottom-spot', 'right-bottom-spot'], { kind: 'flap', cx: 160, scale: .55, dur: .5 })] },
    feuille: { whole: move(0, -6, 2), parts: [] }
};
const ease = 'calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" repeatCount="indefinite"';
/** Wraps SVG content in groups whose SMIL animation plays the motion; no script runs per frame. */
export function animate(motion: Motion, content: string): string {
    const n = (v: number): number => Math.round(v * 100) / 100;
    switch (motion.kind) {
        case 'rotate': return `<g><animateTransform attributeName="transform" type="rotate" values="${-motion.angle} ${motion.cx} ${motion.cy};${motion.angle} ${motion.cx} ${motion.cy};${-motion.angle} ${motion.cx} ${motion.cy}" dur="${motion.dur}s" ${ease}/>${content}</g>`;
        case 'move': return `<g><animateTransform attributeName="transform" type="translate" values="0 0;${motion.dx} ${motion.dy};0 0" dur="${motion.dur}s" ${ease}/>${content}</g>`;
        case 'spin': return `<g><animateTransform attributeName="transform" type="rotate" values="0 ${motion.cx} ${motion.cy};360 ${motion.cx} ${motion.cy}" dur="${motion.dur}s" repeatCount="indefinite"/>${content}</g>`;
        case 'flap': return `<g transform="translate(${motion.cx} 0)"><g><animateTransform attributeName="transform" type="scale" values="1 1;${n(motion.scale)} 1;1 1" dur="${motion.dur}s" ${ease}/><g transform="translate(${-motion.cx} 0)">${content}</g></g></g>`;
        case 'pulse': return `<g transform="translate(${motion.cx} ${motion.cy})"><g><animateTransform attributeName="transform" type="scale" values="1;${n(motion.scale)};1" dur="${motion.dur}s" ${ease}/><g transform="translate(${-motion.cx} ${-motion.cy})">${content}</g></g></g>`;
    }
}
/** Chimney smoke puffs for the house; white with the same outline as the drawing. */
export const smoke = [0, 1, 2].map(i => `<circle cx="245" cy="28" r="9" fill="#ffffff" stroke="#58443b" stroke-width="2" opacity="0"><animate attributeName="cy" values="28;-12" dur="2.4s" begin="${i * .8}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="2.4s" begin="${i * .8}s" repeatCount="indefinite"/><animate attributeName="r" values="7;14" dur="2.4s" begin="${i * .8}s" repeatCount="indefinite"/></circle>`).join('');
