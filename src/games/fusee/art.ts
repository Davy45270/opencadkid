import { GROUND, WIDTH, type Miss, type Rect } from '../../engines/fusee';
/** Drawings of « La fusée de Boubou », in the ink and rounded strokes of the guides (src/characters). Board units: the
 * board is 150 × 250, the rocket is drawn centred on (0, 0), a little larger than its touch circle of radius 9. */
export const INK = '#583746';
const n = (v: number): string => (Math.round(v * 10) / 10).toString();
/** A small pseudo-random sequence for the scenery, the same on every draw. */
const scatter = (count: number, seed: number): [number, number, number][] => {
    let v = seed;
    const r = (): number => { v = (v * 1103515245 + 12345) % 2147483648; return v / 2147483648; };
    return Array.from({ length: count }, () => [r(), r(), r()]);
};
export function defs(): string {
    return `<defs><linearGradient id="fusee-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2a6b"/><stop offset=".6" stop-color="#3a3f95"/><stop offset="1" stop-color="#6a5bb5"/></linearGradient>`
        + `<linearGradient id="fusee-moon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e6f2"/><stop offset="1" stop-color="#b9b3cc"/></linearGradient>`
        + `<linearGradient id="fusee-rock" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9c0b4"/><stop offset="1" stop-color="#8f8478"/></linearGradient>`
        + `<linearGradient id="fusee-body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f1eef7"/><stop offset="1" stop-color="#cfc8de"/></linearGradient>`
        + `<radialGradient id="fusee-glow"><stop offset="0" stop-color="#fff7b0" stop-opacity=".95"/><stop offset="1" stop-color="#fff7b0" stop-opacity="0"/></radialGradient></defs>`;
}
/** The sky: twinkling stars, the Earth far away. */
export function sky(): string {
    const dots = scatter(34, 7).map(([a, b, c]) => `<circle cx="${n(a * WIDTH)}" cy="${n(4 + b * 150)}" r="${n(0.5 + c * 0.9)}" fill="#ffffff" opacity="${n(0.5 + c * 0.5)}"${c > 0.7 ? ' class="fusee-twinkle"' : ''}/>`).join('');
    const earth = `<g transform="translate(128 26)"><circle r="11" fill="#4aa3e8" stroke="#ffffff" stroke-width=".8"/><path d="M-7 -5q4 -4 8 -1q3 4 -1 6q-5 1 -7 -5ZM2 4q5 -2 6 2q-2 4 -6 3Z" fill="#6cc46a"/><path d="M-9 2q6 2 10 -2" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".8"/></g>`;
    return `<rect width="${WIDTH}" height="250" fill="url(#fusee-sky)"/>${dots}${earth}`;
}
/** The Moon's ground, with a few little bumps. */
export function ground(): string {
    const pebbles = scatter(9, 3).map(([a, b]) => `<ellipse cx="${n(a * WIDTH)}" cy="${n(GROUND + 6 + b * 14)}" rx="${n(2 + b * 3)}" ry="${n(1 + b)}" fill="#a39cb8" opacity=".7"/>`).join('');
    return `<rect x="0" y="${GROUND}" width="${WIDTH}" height="${250 - GROUND}" fill="url(#fusee-moon)"/><path d="M0 ${GROUND}H${WIDTH}" stroke="${INK}" stroke-width="1.2"/>${pebbles}`;
}
export function hillSvg(h: Rect): string {
    return `<path d="M${n(h.x)} ${GROUND}V${n(h.y + 6)}Q${n(h.x)} ${n(h.y)} ${n(h.x + 8)} ${n(h.y)}H${n(h.x + h.w - 8)}Q${n(h.x + h.w)} ${n(h.y)} ${n(h.x + h.w)} ${n(h.y + 6)}V${GROUND}Z" fill="url(#fusee-moon)" stroke="${INK}" stroke-width="1.2"/>`
        + `<circle cx="${n(h.x + h.w * 0.3)}" cy="${n(h.y + h.h * 0.5)}" r="${n(Math.min(5, h.h / 5))}" fill="#a39cb8" opacity=".6"/>`;
}
export function craterSvg(x: number, w: number): string {
    return `<g data-crater transform="translate(${n(x)} ${GROUND})"><g class="fusee-inner"><ellipse rx="${n(w / 2)}" ry="${n(Math.max(3, w / 7))}" cy="1" fill="#9a92b2" stroke="${INK}" stroke-width="1"/><ellipse rx="${n(w / 2 - 3)}" ry="${n(Math.max(2, w / 10))}" cy="2" fill="#7f7699"/>`
        + `<path d="M${n(-w / 4)} 0q2 -2 4 0M${n(w / 4 - 4)} 0q2 -2 4 0" fill="none" stroke="${INK}" stroke-width=".8" stroke-linecap="round"/></g></g>`;
}
/** A rock, with sleepy eyes that open wide on a « toc ». */
export function rockSvg(r: Rect, layer = false): string {
    const rx = Math.min(8, r.h / 2, r.w / 3);
    const pits = scatter(Math.max(2, Math.round(r.w * r.h / 260)), Math.round(r.x * 7 + r.y)).map(([a, b, c]) => `<circle cx="${n(r.x + 4 + a * (r.w - 8))}" cy="${n(r.y + 4 + b * (r.h - 8))}" r="${n(1.2 + c * 2)}" fill="#7d7268" opacity=".55"/>`).join('');
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const face = layer ? '' : `<g class="fusee-face"><path d="M${n(cx - 5)} ${n(cy - 1)}q2 -2 4 0M${n(cx + 1)} ${n(cy - 1)}q2 -2 4 0" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/><path d="M${n(cx - 2)} ${n(cy + 3)}q2 1.5 4 0" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/></g>`;
    return `<rect x="${n(r.x)}" y="${n(r.y)}" width="${n(r.w)}" height="${n(r.h)}" rx="${n(rx)}" fill="url(#fusee-rock)" stroke="${INK}" stroke-width="1.2"/>${pits}${face}`;
}
/** A friendly alien, standing with its feet at (0, 0). */
export function alienSvg(color = '#7ed957'): string {
    return `<g class="fusee-inner"><path d="M-3 -16l-3 -6M3 -16l3 -6" stroke="${INK}" stroke-width="1"/><circle cx="-6" cy="-22.5" r="1.8" fill="#ffd23f" stroke="${INK}" stroke-width=".6"/><circle cx="6" cy="-22.5" r="1.8" fill="#ffd23f" stroke="${INK}" stroke-width=".6"/>`
        + `<path d="M-7 0v-9a7 7 0 0 1 14 0v9Z" fill="${color}" stroke="${INK}" stroke-width="1.1"/><circle cy="-11" r="3" fill="#ffffff" stroke="${INK}" stroke-width=".8"/><circle cy="-11" r="1.4" fill="${INK}"/><path d="M-3 -5q3 2.5 6 0" fill="none" stroke="${INK}" stroke-width=".9" stroke-linecap="round"/></g>`;
}
/** The round house of the little passenger, standing at the end of its runway, door at (0, 0). */
export function houseSvg(): string {
    return `<g><path d="M-9 0v-10a9 9 0 0 1 18 0v10Z" fill="#ffb3d1" stroke="${INK}" stroke-width="1.1"/><path d="M-3 0v-5a3 3 0 0 1 6 0v5Z" fill="#8c5aa8"/><circle cx="5" cy="-11" r="2" fill="#fff4b8" stroke="${INK}" stroke-width=".6"/><path d="M0 -19v-5" stroke="${INK}" stroke-width="1"/><circle cy="-24.5" r="1.6" fill="#ffd23f"/></g>`;
}
/** A starry runway (a glowing carpet) of width `w`, its top centred at (0, 0). `active` marks the one to visit next (it
 * glows), `lit` a runway that shines: the next one, or one already visited. */
export function padSvg(w: number, active: boolean, lit = active): string {
    const stars = Array.from({ length: Math.max(2, Math.floor(w / 9)) }, (_, i) => { const x = -w / 2 + 6 + i * ((w - 12) / Math.max(1, Math.floor(w / 9) - 1)); return `<path d="M${n(x)} -0.2l.7 1.4 1.5.1-1.1 1 .3 1.5-1.4-.8-1.4.8.3-1.5-1.1-1 1.5-.1Z" fill="#fff8c4"/>`; }).join('');
    return `${active ? `<ellipse cy="-2" rx="${n(w / 2 + 8)}" ry="12" fill="url(#fusee-glow)" class="fusee-glow"/>` : ''}<rect x="${n(-w / 2)}" y="0" width="${n(w)}" height="5.5" rx="2.5" fill="${lit ? '#f5b400' : '#b9a7d8'}" stroke="${INK}" stroke-width="1"/>${stars}`;
}
export function starSvg(): string {
    return `<g class="fusee-star"><path d="M0 -6l1.8 3.7 4 .5-3 2.8.8 4-3.6-2-3.6 2 .8-4-3-2.8 4-.5Z" fill="#ffd23f" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/></g>`;
}
/** Arrows of wind across a band of the sky. */
export function windSvg(y0: number, y1: number, dir: number): string {
    const rows = Math.max(1, Math.round((y1 - y0) / 26));
    let out = `<rect x="0" y="${y0}" width="${WIDTH}" height="${y1 - y0}" fill="#9fd8ff" opacity=".12"/>`;
    for (let r = 0; r < rows; r++) for (let k = 0; k < 3; k++) {
        const y = y0 + (r + 0.5) * (y1 - y0) / rows, x = 20 + k * 55 + (r % 2) * 22;
        out += `<g transform="translate(${n(x)} ${n(y)}) scale(${dir} 1)"><g class="fusee-wind"><path d="M-10 0h16M2 -4l5 4-5 4M-8 -5h8" fill="none" stroke="#bfe6ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/></g></g>`;
    }
    return out;
}
/** Boubou's face in the porthole: dizzy eyes spin. */
export function boubouFace(dizzy: boolean, happy: boolean): string {
    const eyes = dizzy
        ? `<g class="fusee-spin"><path d="M-3.6 -1.2a1.4 1.4 0 1 1 1 1.2" fill="none" stroke="${INK}" stroke-width=".7"/></g><g class="fusee-spin"><path d="M2.2 -1.2a1.4 1.4 0 1 1 1 1.2" fill="none" stroke="${INK}" stroke-width=".7"/></g>`
        : `<circle cx="-2.4" cy="-1" r=".9" fill="${INK}"/><circle cx="2.4" cy="-1" r=".9" fill="${INK}"/>`;
    return `<circle cx="-4.4" cy="-4.6" r="2" fill="#3b3346"/><circle cx="4.4" cy="-4.6" r="2" fill="#3b3346"/><circle r="5" fill="#ffffff" stroke="${INK}" stroke-width=".6"/>`
        + `<ellipse cx="-2.4" cy="-.9" rx="1.7" ry="1.4" fill="#3b3346"/><ellipse cx="2.4" cy="-.9" rx="1.7" ry="1.4" fill="#3b3346"/>${dizzy ? `<circle cx="-2.4" cy="-.9" r="1.3" fill="#ffffff"/><circle cx="2.4" cy="-.9" r="1.3" fill="#ffffff"/>` : ''}${eyes}`
        + `<ellipse cy="1.4" rx=".9" ry=".6" fill="${INK}"/><path d="${happy ? 'M-1.8 2.4q1.8 1.8 3.6 0' : 'M-1.2 2.8q1.2 .8 2.4 0'}" fill="none" stroke="${INK}" stroke-width=".6" stroke-linecap="round"/>`;
}
/** Boubou's little round rocket, centred on (0, 0): a puff of flame when it blows, a passenger in the back window. */
export function rocketSvg(opts: { dizzy?: boolean; happy?: boolean; passenger?: boolean } = {}): string {
    return `<g class="fusee-flame"><path d="M-4 9q4 12 8 0Z" fill="#ffb347" stroke="#f5741c" stroke-width=".8"/><path d="M-2 9q2 7 4 0Z" fill="#fff3a0"/></g>`
        + `<path d="M-10 4l-5 7h7ZM10 4l5 7h-7Z" fill="#e2384f" stroke="${INK}" stroke-width="1"/>`
        + `<path d="M0 -15q11 6 11 15q0 9 -11 9q-11 0 -11 -9q0 -9 11 -15Z" fill="url(#fusee-body)" stroke="${INK}" stroke-width="1.3"/>`
        + `<path d="M-5 -12.2q5 -3 10 0" fill="none" stroke="#e2384f" stroke-width="2.2" stroke-linecap="round"/>`
        + `<circle cy="-1" r="6.8" fill="#bfe6ff" stroke="${INK}" stroke-width="1.1"/><g transform="translate(0 -.6)">${boubouFace(opts.dizzy ?? false, opts.happy ?? false)}</g>`
        + (opts.passenger ? `<g transform="translate(9 -6) scale(.62)" data-passenger>${alienSvg('#ff9ad5')}</g>` : '');
}
/** The golden arrow of the help, pointing down at (0, 0). */
export function helpArrow(): string {
    return `<g class="fusee-arrow"><path d="M-6 -24h12v10h6l-12 13-12-13h6Z" fill="#ffd23f" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/></g>`;
}
/** The CSS animation of each funny try (src/style.css). */
export const missAnimations: Readonly<Record<Miss, string>> = { boing: 'fusee-boing', tournis: 'fusee-tournis', pouf: 'fusee-pouf', cratere: 'fusee-cratere', toc: 'fusee-toc', rigole: 'fusee-rigole', coucou: 'fusee-coucou' };
/** A puff of dust on the ground. */
export function dust(big = false): string {
    const k = big ? 1.5 : 1;
    return `<g class="fusee-dust">${[[-9, -3, 4], [0, -6, 5], [9, -3, 4], [-15, -1, 3], [15, -1, 3]].map(([x, y, r]) => `<circle cx="${n(x! * k)}" cy="${n(y! * k)}" r="${n(r! * k)}" fill="#e9e6f2" stroke="#b9b3cc" stroke-width=".7"/>`).join('')}</g>`;
}
/** Springy lines under a bounce. */
export function boingLines(): string {
    return `<g class="fusee-lines"><path d="M-12 -2l-4 -4M0 -4v-6M12 -2l4 -4" stroke="#fff3a0" stroke-width="1.6" stroke-linecap="round"/><path d="M-8 2q8 -6 16 0" fill="none" stroke="#f5b400" stroke-width="2" stroke-linecap="round"/></g>`;
}
/** « Toc »: a little bump and lines around the point where the rocket touched a rock. */
export function tocMark(): string {
    return `<g class="fusee-lines"><path d="M-8 -8l-4 -4M8 -8l4 -4M0 -10v-5" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/><circle r="3" fill="#ffd23f" stroke="${INK}" stroke-width=".7"/></g>`;
}
/** « Hihi »: little laugh marks above a tickled alien. */
export function laughMarks(): string {
    return `<g class="fusee-lines"><path d="M-9 -30q2 -3 4 0M5 -30q2 -3 4 0M-2 -34q2 -3 4 0" fill="none" stroke="#ffd23f" stroke-width="1.4" stroke-linecap="round"/></g>`;
}
/** A friend waving « coucou » over its runway, pointing at the one to visit first. */
export function waveHand(dir: number): string {
    return `<g transform="scale(${dir} 1)"><g class="fusee-hand"><path d="M0 -6q-2 -7 2 -8l1 4l1 -5q3 0 2 5l1-3q3 1 1 5l-2 4Z" fill="#ffe0b8" stroke="${INK}" stroke-width=".8"/><path d="M8 -12h8l-3 -3M16 -12l-3 3" fill="none" stroke="#ffd23f" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
}
/** A star caught: a little sparkle. */
export function sparkle(): string {
    return `<g class="fusee-sparkle">${Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3; return `<path d="M${n(Math.cos(a) * 4)} ${n(Math.sin(a) * 4)}L${n(Math.cos(a) * 10)} ${n(Math.sin(a) * 10)}" stroke="#ffd23f" stroke-width="1.6" stroke-linecap="round"/>`; }).join('')}</g>`;
}
