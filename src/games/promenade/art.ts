import type { Role } from '../../engines/promenade';
/** Drawings of « La promenade de Lumi », in the ink and rounded strokes of the guides (src/characters). */
export const INK = '#583746';
const RAINBOW = ['#f789b6', '#ffc167', '#ffe381', '#80d6b0', '#83cbea', '#b39beb'];
/** The five foals: Lumi's coat, each with its own pastel. */
export const COATS = ['#ffd6e7', '#d3e9ff', '#fff0b3', '#cdf2dc', '#e6d9ff'] as const;
/** A foal standing with its feet at (0, 0), facing right, about 84 units tall (one tile is 100). */
export function foal(coat: string, uid: string): string {
    const s = (d: string, fill: string, w = 4): string => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const grad = `<radialGradient id="${uid}" cx="35%" cy="25%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="${coat}"/><stop offset="1" stop-color="#c9b6c6"/></radialGradient>`;
    const legs = [-24, -11, 11, 23].map(x => s(`M${x - 5} -26V-3Q${x} 1 ${x + 5} -3V-26Z`, `url(#${uid})`, 3.5)).join('');
    const tail = RAINBOW.slice(0, 3).map((c, i) => `<path d="M-30 -40Q${-50 - i * 3} ${-44 + i * 8} ${-44 - i * 2} ${-20 + i * 4}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`).join('');
    const mane = RAINBOW.slice(0, 4).map((c, i) => `<circle cx="${10 - i * 2}" cy="${-76 + i * 9}" r="8" fill="${c}" stroke="${INK}" stroke-width="2.5"/>`).join('');
    return `<defs>${grad}</defs>${tail}${legs}${s('M-32 -38Q-32 -56 -6 -54Q26 -56 28 -36Q28 -20 -2 -21Q-32 -20 -32 -38Z', `url(#${uid})`)}`
        + `${s('M10 -48Q6 -70 22 -80Q40 -88 48 -70Q54 -56 44 -50Q34 -46 26 -48Z', `url(#${uid})`)}${mane}`
        + `${s('M30 -84L36 -104L41 -82Z', '#ffd56b', 3)}${s('M20 -80L18 -94L28 -84Z', `url(#${uid})`, 3)}`
        + `<ellipse cx="45" cy="-55" rx="8" ry="6" fill="#ffc1d4" stroke="${INK}" stroke-width="3"/><circle cx="35" cy="-68" r="4.6" fill="${INK}"/><circle cx="36.6" cy="-69.6" r="1.6" fill="#fff"/><circle cx="31" cy="-58" r="4" fill="#ff9fbf" opacity=".7"/>`;
}
/** Pictograms of the four jobs, drawn in a 64 × 64 box: the role buttons, the bubble over a working foal. */
export function rolePicture(role: Role): string {
    const ground = (x: number, w: number, y = 40): string => `<path d="M${x} ${y}h${w}v20h-${w}Z" fill="#9a6a45" stroke="${INK}" stroke-width="3"/><path d="M${x} ${y}h${w}v6h-${w}Z" fill="#7cc860" stroke="${INK}" stroke-width="3"/>`;
    switch (role) {
        case 'pont': return `${ground(2, 18)}${ground(44, 18)}<path d="M20 54h24v6H20Z" fill="#6fc3ef"/><path d="M14 40Q32 30 50 40" fill="none" stroke="#b5743f" stroke-width="7" stroke-linecap="round"/><path d="M14 40Q32 30 50 40" fill="none" stroke="${INK}" stroke-width="2"/><path d="M22 36v-8M32 33v-8M42 36v-8M18 30Q32 20 46 30" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
        case 'tunnel': return `${ground(2, 60, 50)}<path d="M12 50V12h40v38Z" fill="#c9b8a6" stroke="${INK}" stroke-width="3"/><path d="M12 24h40M12 37h40M24 12v12M40 12v12M18 24v13M32 24v13M46 24v13" stroke="#8f7c6c" stroke-width="2"/><path d="M22 50V38Q32 26 42 38V50Z" fill="#4a3442" stroke="${INK}" stroke-width="3"/>`;
        case 'trou': return `${ground(2, 60, 28)}<path d="M20 28Q32 50 44 28Z" fill="#4a3442" stroke="${INK}" stroke-width="3"/><path d="M32 4V20M24 13L32 22L40 13" fill="none" stroke="#e84f8a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 50v8" stroke="#e84f8a" stroke-width="5" stroke-linecap="round"/>`;
        case 'echelle': return `${ground(2, 60, 52)}<path d="M34 52V22h28v30Z" fill="#9a6a45" stroke="${INK}" stroke-width="3"/><path d="M34 22h28v6H34Z" fill="#7cc860" stroke="${INK}" stroke-width="3"/><path d="M12 54L22 14M24 54L34 14M14 46h12M16 38h12M18 30h12M20 22h12" stroke="#d58a3d" stroke-width="4" stroke-linecap="round"/>`;
    }
}
/** The trapdoor the troupe comes out of: a little wooden house hanging high in the first floor, open once the walk starts. */
export function trapdoor(x: number, open: boolean): string {
    const doors = open ? `<path d="M${x - 34} 72l-14 22M${x + 34} 72l14 22" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${x - 30} 46h60v26h-60Z" fill="#4a3442"/>` : `<path d="M${x - 30} 46h60v26h-60Z" fill="#e4a95b" stroke="${INK}" stroke-width="3"/><path d="M${x} 46v26" stroke="${INK}" stroke-width="3"/><circle cx="${x - 6}" cy="60" r="3" fill="${INK}"/><circle cx="${x + 6}" cy="60" r="3" fill="${INK}"/>`;
    return `<g data-trapdoor="${open ? 'open' : 'closed'}"><path d="M${x - 42} 46L${x} 10L${x + 42} 46Z" fill="#e8708f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M${x - 36} 46h72v30h-72Z" fill="#c8874a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${doors}</g>`;
}
/** The rainbow door at the end of the walk, its feet on the ground at (x, y). */
export function rainbowDoor(x: number, y: number, open = 0): string {
    const arcs = RAINBOW.map((c, i) => { const r = 46 - i * 5; return `<path d="M${x - r} ${y}V${y - 70 + i * 2}A${r} ${r} 0 0 1 ${x + r} ${y - 70 + i * 2}V${y}" fill="none" stroke="${c}" stroke-width="5.5"/>`; }).join('');
    return `<g data-door>${arcs}<path d="M${x - 18} ${y}V${y - 62}A18 18 0 0 1 ${x + 18} ${y - 62}V${y}Z" fill="#fff6d6" stroke="${INK}" stroke-width="3"/><circle cx="${x}" cy="${y - 58}" r="${4 + open}" fill="#ffd56b"/></g>`;
}
const stroke = (w = 3): string => `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
/** The lost friends, feet at (0, 0), facing right, about 56 units tall. `found` adds a heart, otherwise a tear. */
export function friendSvg(animal: 'lapin' | 'herisson' | 'caneton', found: boolean): string {
    const eye = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${INK}"/><circle cx="${x + 1.2}" cy="${y - 1.2}" r="1.2" fill="#fff"/>`;
    const mood = found ? `<path d="M0 -84c-6 -8 -18 -2 -10 8l10 9l10 -9c8 -10 -4 -16 -10 -8Z" fill="#f789b6" ${stroke(2.5)}/>` : `<path d="M22 -30q-4 7 0 10q4 -3 0 -10Z" fill="#83cbea" ${stroke(1.5)}/>`;
    switch (animal) {
        case 'lapin': return `<g data-animal="lapin"><ellipse cx="-4" cy="-18" rx="20" ry="17" fill="#f4f1f6" ${stroke()}/><circle cx="-24" cy="-20" r="7" fill="#fff" ${stroke(2.5)}/>`
            + `<path d="M6 -46q-8 -30 2 -32q8 2 2 32Z" fill="#f4f1f6" ${stroke()}/><path d="M16 -44q4 -30 13 -27q6 6 -6 29Z" fill="#f4f1f6" ${stroke()}/><path d="M7 -50q-3 -18 1 -22" stroke="#ffb3c9" stroke-width="4" stroke-linecap="round"/>`
            + `<circle cx="14" cy="-38" r="15" fill="#f4f1f6" ${stroke()}/>${eye(19, -41)}<circle cx="28" cy="-34" r="3" fill="#ff8fb2"/><circle cx="12" cy="-31" r="4" fill="#ffc1d4" opacity=".8"/>${mood}</g>`;
        case 'herisson': return `<g data-animal="herisson"><path d="M-30 -4Q-34 -26 -18 -38L-20 -48L-8 -42L-4 -54L4 -44L12 -52L14 -40Q22 -28 18 -4Z" fill="#8a5a3c" ${stroke()}/>`
            + `<path d="M8 -6Q4 -30 22 -30Q36 -26 40 -12Q34 -4 8 -6Z" fill="#f2d3a8" ${stroke()}/><circle cx="40" cy="-13" r="4" fill="${INK}"/>${eye(25, -20)}<circle cx="20" cy="-12" r="3.5" fill="#ffb3c9" opacity=".8"/>`
            + `<path d="M-18 -2v4M6 -2v4" ${stroke(4)}/>${mood}</g>`;
        case 'caneton': return `<g data-animal="caneton"><ellipse cx="-4" cy="-16" rx="20" ry="15" fill="#ffe36b" ${stroke()}/><path d="M-10 -20q8 10 16 0" fill="none" ${stroke(2.5)}/>`
            + `<circle cx="12" cy="-38" r="13" fill="#ffe36b" ${stroke()}/><path d="M23 -38l14 3l-14 5Z" fill="#ff9f43" ${stroke(2.5)}/>${eye(15, -41)}<path d="M-6 0h-6M4 0h6" stroke="#ff9f43" stroke-width="5" stroke-linecap="round"/>${mood}</g>`;
    }
}
/** The bear, feet at (0, 0): asleep across the path, or sitting up (`awake` from 0 to 1) and waving. */
export function bearSvg(awake: number): string {
    if (awake < .5) {
        const z = (x: number, y: number, s: number) => `<path d="M${x} ${y}h${s}l-${s} ${s}h${s}" fill="none" stroke="#7d6bd0" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        return `<g data-bear="sleep"><path d="M-46 0Q-50 -46 -6 -48Q40 -50 44 -14Q44 0 30 0Z" fill="#a9744f" ${stroke(4)}/><circle cx="-40" cy="-30" r="22" fill="#a9744f" ${stroke(4)}/>`
            + `<circle cx="-54" cy="-48" r="8" fill="#a9744f" ${stroke(3)}/><circle cx="-28" cy="-50" r="8" fill="#a9744f" ${stroke(3)}/><ellipse cx="-50" cy="-22" rx="10" ry="7" fill="#e9c9a3" ${stroke(2.5)}/><circle cx="-54" cy="-24" r="3" fill="${INK}"/>`
            + `<path d="M-44 -34q4 3 8 0M-32 -34q4 3 8 0" fill="none" ${stroke(2.5)}/><path d="M14 -8q10 -10 22 -2" fill="none" ${stroke(3)}/>${z(-10, -78, 12)}${z(8, -100, 16)}</g>`;
    }
    const wave = Math.sin(awake * Math.PI * 6) * 14;
    return `<g data-bear="awake"><path d="M-26 0Q-34 -60 0 -62Q34 -60 26 0Z" fill="#a9744f" ${stroke(4)}/><ellipse cx="0" cy="-26" rx="16" ry="20" fill="#e9c9a3" ${stroke(2.5)}/>`
        + `<circle cx="0" cy="-80" r="24" fill="#a9744f" ${stroke(4)}/><circle cx="-19" cy="-98" r="8" fill="#a9744f" ${stroke(3)}/><circle cx="19" cy="-98" r="8" fill="#a9744f" ${stroke(3)}/>`
        + `<ellipse cx="0" cy="-72" rx="10" ry="7" fill="#e9c9a3" ${stroke(2.5)}/><circle cx="0" cy="-75" r="3" fill="${INK}"/><circle cx="-9" cy="-86" r="3.4" fill="${INK}"/><circle cx="9" cy="-86" r="3.4" fill="${INK}"/><path d="M-5 -66q5 5 10 0" fill="none" ${stroke(2.5)}/>`
        + `<path d="M22 -44L${40 + wave / 3} ${-74 - Math.abs(wave)}" ${stroke(14)}/><path d="M22 -44L${40 + wave / 3} ${-74 - Math.abs(wave)}" stroke="#a9744f" stroke-width="9" stroke-linecap="round"/></g>`;
}
/** A big leaf boat, centred at (0, 0) on the water. */
export const leafBoat = (): string => `<g data-boat><path d="M-46 -6Q0 22 46 -6Q20 -26 -46 -6Z" fill="#6cc46a" ${stroke(3.5)}/><path d="M-40 -6Q0 -2 40 -6" fill="none" stroke="#3f8f45" stroke-width="3"/><path d="M-10 -5l8 -8M10 -5l8 -8" stroke="#3f8f45" stroke-width="2.5" stroke-linecap="round"/></g>`;
/** The flower that lowers the drawbridge, standing at (0, 0); pressed, its heart turns green. */
export function flowerSvg(pressed: boolean): string {
    const petals = [0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="0" cy="-74" rx="11" ry="17" transform="rotate(${a} 0 -58)" fill="#ff8fb8" ${stroke(2.5)}/>`).join('');
    return `<g data-flower="${pressed ? 'on' : 'off'}"><path d="M0 0V-48" stroke="#4f9c48" stroke-width="6" stroke-linecap="round"/><path d="M0 -20q-18 -4 -22 -18q16 0 22 14Z" fill="#6cc46a" ${stroke(2)}/>${petals}<circle cx="0" cy="-58" r="14" fill="${pressed ? '#7cd67a' : '#ffd84d'}" ${stroke(3)}/><circle cx="-4" cy="-62" r="4" fill="#fff" opacity=".8"/></g>`;
}
/** A jar of sleeping fireflies at (0, 0); open, it is empty and its lid is off. */
export function jarSvg(open: boolean): string {
    const flies = open ? '' : [[-8, -22], [6, -30], [-2, -40], [8, -16]].map(([x, y]) => `<circle cx="${x!}" cy="${y!}" r="4" fill="#fff27a"/>`).join('');
    return `<g data-jar><path d="M-18 0V-46Q-18 -52 -12 -52H12Q18 -52 18 -46V0Z" fill="#dff3ff" fill-opacity=".7" ${stroke(3)}/>${flies}<path d="M-16 ${open ? -70 : -52}h32v-8h-32Z" fill="#c8874a" ${stroke(3)} transform="rotate(${open ? -30 : 0} 0 -56)"/></g>`;
}
/** Three balloons tied to a little stake at (0, 0). */
export function balloonsSvg(glow: number): string {
    const b = (x: number, y: number, c: string) => `<path d="M0 0Q${x / 2} ${y / 2 + 10} ${x} ${y + 18}" fill="none" stroke="${INK}" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="${14 + glow * 3}" ry="${17 + glow * 3}" fill="${c}" ${stroke(3)}/><circle cx="${x - 5}" cy="${y - 6}" r="4" fill="#fff" opacity=".7"/>`;
    return `<g data-balloons><path d="M-4 0V-14h8V0Z" fill="#c8874a" ${stroke(2)}/>${b(-18, -86, '#ff7a9c')}${b(4, -104, '#ffd84d')}${b(22, -80, '#83cbea')}</g>`;
}
/** A single balloon held above a flying foal, its string ending at (0, 0). */
export const balloonUp = (c = '#ff7a9c'): string => `<path d="M0 0V-44" stroke="${INK}" stroke-width="2"/><ellipse cx="0" cy="-60" rx="15" ry="18" fill="${c}" ${stroke(3)}/><circle cx="-5" cy="-66" r="4" fill="#fff" opacity=".7"/>`;
/** The bouncy mushroom at (0, 0); `squash` from 0 to 1 while it boings. */
export function mushroomSvg(squash: number, awake: boolean): string {
    const s = 1 - Math.sin(squash * Math.PI) * .3;
    return `<g data-mushroom transform="scale(1 ${s.toFixed(2)})"><path d="M-10 0V-26h20V0Z" fill="#fff4dd" ${stroke(3)}/><path d="M-34 -24Q-34 -62 0 -62Q34 -62 34 -24Z" fill="#ef5a5a" ${stroke(3.5)}/>`
        + `<circle cx="-16" cy="-40" r="6" fill="#fff"/><circle cx="8" cy="-50" r="5" fill="#fff"/><circle cx="20" cy="-34" r="5" fill="#fff"/>${awake ? '<circle cx="-5" cy="-12" r="2.6" fill="#583746"/><circle cx="5" cy="-12" r="2.6" fill="#583746"/>' : '<path d="M-8 -12h5M3 -12h5" stroke="#583746" stroke-width="2.5" stroke-linecap="round"/>'}</g>`;
}
/** A treat floating in the air at (0, 0): a strawberry, an apple in autumn, a star biscuit at night. */
export function treatSvg(kind: 'fraise' | 'pomme' | 'etoile'): string {
    switch (kind) {
        case 'fraise': return `<g data-sweet="fraise"><path d="M-14 -8Q-16 12 0 20Q16 12 14 -8Q0 -14 -14 -8Z" fill="#ef4f5f" ${stroke(3)}/><path d="M-12 -9l6 -7l6 5l6 -5l6 7Q0 -4 -12 -9Z" fill="#5fb85a" ${stroke(2)}/><circle cx="-5" cy="2" r="1.6" fill="#ffe381"/><circle cx="5" cy="6" r="1.6" fill="#ffe381"/><circle cx="0" cy="12" r="1.6" fill="#ffe381"/></g>`;
        case 'pomme': return `<g data-sweet="pomme"><path d="M0 -10Q-18 -18 -16 2Q-12 20 0 16Q12 20 16 2Q18 -18 0 -10Z" fill="#e8483c" ${stroke(3)}/><path d="M0 -10q0 -8 4 -12" ${stroke(3)} fill="none"/><path d="M4 -16q10 -6 12 2q-8 4 -12 -2Z" fill="#5fb85a" ${stroke(2)}/><circle cx="-7" cy="-2" r="3" fill="#fff" opacity=".6"/></g>`;
        case 'etoile': return `<g data-sweet="etoile"><path d="M0 -18L5 -6L18 -5L8 4L11 17L0 10L-11 17L-8 4L-18 -5L-5 -6Z" fill="#f2c46b" ${stroke(3)}/><circle cx="0" cy="0" r="3" fill="#c8874a"/></g>`;
    }
}
/** The basket of picked treats, top right of the field. */
export function basketSvg(x: number, y: number, count: number, kind: 'fraise' | 'pomme' | 'etoile'): string {
    const inside = Array.from({ length: Math.min(count, 6) }, (_, i) => `<g transform="translate(${x - 26 + (i % 3) * 22} ${y - 14 - Math.floor(i / 3) * 14}) scale(.55)">${treatSvg(kind)}</g>`).join('');
    return `<g data-basket="${count}">${inside}<path d="M${x - 40} ${y - 12}h80l-10 34h-60Z" fill="#d99a52" ${stroke(3)}/><path d="M${x - 36} ${y}h72M${x - 32} ${y + 11}h64" stroke="#a96d34" stroke-width="2.5"/></g>`;
}

/** The funny try of a wrong job, around the waiting foal whose feet are at (x, y), facing `dir`; the obstacle is the next
 * cell. `t` goes from 0 to 1. Every pair (obstacle × wrong job) has its own scene: nothing is lost, it is a joke. */
export function failSvg(name: string, t: number, x: number, y: number, dir: 1 | -1): string {
    const X = (dx: number): number => x + dir * dx, wave = Math.sin(t * Math.PI);
    const drops = (cx: number, cy: number, n: number, spread: number, c = '#6fc3ef') => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI - Math.PI, r = spread * (.4 + wave * .8); return `<path d="M${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}q-4 7 0 10q4 -3 0 -10Z" fill="${c}" ${stroke(1.5)}/>`; }).join('');
    const ladder = (len: number) => `<path d="M-12 0V${-len}M12 0V${-len}${Array.from({ length: Math.floor(len / 18) }, (_, i) => `M-12 ${-(i + 1) * 18}h24`).join('')}" stroke="#d58a3d" stroke-width="6" stroke-linecap="round"/>`;
    const plank = `<path d="M-50 -6h100v12h-100Z" fill="#c98a4f" ${stroke(3)}/>`;
    const shovel = (a: number) => `<g transform="translate(${X(40)} ${y - 30}) rotate(${dir * a})"><path d="M0 0V34" stroke="#b5743f" stroke-width="5" stroke-linecap="round"/><path d="M-9 30h18l-3 16h-12Z" fill="#9fb6cc" ${stroke(2.5)}/></g>`;
    const boing = (cx: number, cy: number) => `<path d="M${cx - 18} ${cy}q6 -12 12 0t12 0t12 0" fill="none" stroke="#ec79ac" stroke-width="4" stroke-linecap="round" opacity="${wave.toFixed(2)}"/>`;
    let out = '';
    switch (name) {
        case 'plouf': // A tunnel dug in thin air over the ditch: down it goes, splash, back out soaking wet and shaking.
            out = shovel(-40 + t * 80) + (t > .3 && t < .65 ? drops(X(100), y + 70, 7, 40) : '') + (t > .6 ? drops(x, y - 70, 5, 30) + `<path d="M${x - 46} ${y - 50}l-10 -4M${x + 46} ${y - 50}l10 -4M${x - 48} ${y - 30}l-12 0M${x + 48} ${y - 30}l12 0" stroke="#6fc3ef" stroke-width="4" stroke-linecap="round"/>` : '');
            break;
        case 'jet': // A hole dug at the edge of the ditch: a jet of water squirts back into the foal's face.
            out = shovel(-20 + Math.sin(t * 20) * 20) + (t > .25 ? `<path d="M${X(100)} ${y + 70}Q${X(80)} ${y - 120 * Math.min(1, (t - .25) * 3)} ${X(28)} ${y - 60}" fill="none" stroke="#6fc3ef" stroke-width="${(10 * wave + 3).toFixed(1)}" stroke-linecap="round"/>${drops(X(30), y - 64, 6, 26)}` : '');
            break;
        case 'balancoire': // The ladder laid over the ditch tips and the foal seesaws on it.
            out = `<g transform="translate(${X(50)} ${y}) rotate(${(Math.sin(t * Math.PI * 4) * 18 * dir).toFixed(1)})"><g transform="rotate(90)">${ladder(110)}</g></g>`;
            break;
        case 'accordeon': // The bridge pushed against the wall folds up like an accordion, boing.
            {
                const span = 70 - wave * 46, folds = 6, d = Array.from({ length: folds + 1 }, (_, i) => `${i ? 'L' : 'M'}${X(20 + span * i / folds).toFixed(1)} ${(y - 30 + (i % 2 ? -1 : 1) * (10 + wave * 26)).toFixed(1)}`).join('');
                out = `<path d="${d}" fill="none" stroke="#c98a4f" stroke-width="13" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${INK}" stroke-width="2"/>${boing(X(70), y - 80)}`;
            }
            break;
        case 'taupe': // A hole at the foot of the wall: a mole pops up, blinks and waves.
            {
                const up = Math.min(1, Math.max(0, (t - .2) * 3)) * (t > .85 ? (1 - t) / .15 : 1);
                out = `<ellipse cx="${X(52)}" cy="${y + 4}" rx="22" ry="7" fill="#5e4636"/><g transform="translate(${X(52)} ${y + 4 - up * 30})"><ellipse cx="0" cy="0" rx="16" ry="18" fill="#6d5a6e" ${stroke(3)}/><circle cx="-5" cy="-6" r="2.5" fill="${INK}"/><circle cx="5" cy="-6" r="2.5" fill="${INK}"/><ellipse cx="0" cy="1" rx="5" ry="4" fill="#ff9fbf"/><path d="M14 -4l10 ${-8 + Math.sin(t * 30) * 6}" ${stroke(5)}/></g>${shovel(30)}`;
            }
            break;
        case 'glissade': // The ladder is too short for the wall: up the foal goes, then the ladder slides down flat.
            {
                const tilt = t < .5 ? 70 : 70 - (t - .5) * 140;
                out = `<g transform="translate(${X(30)} ${y}) rotate(${(dir * (90 - tilt)).toFixed(1)})">${ladder(90)}</g>`;
            }
            break;
        case 'tremplin': // A bridge laid on flat ground turns into a springboard: the foal boings high up and lands back.
            out = `<g transform="translate(${x} ${y - 6}) rotate(${(dir * -Math.sin(t * Math.PI * 2) * 14).toFixed(1)})">${plank}</g><path d="M${x - 10} ${y}l10 -14l10 14Z" fill="#9a6a45" ${stroke(2.5)}/>${boing(x, y - 110)}`;
            break;
        case 'carotte': // A tunnel into the soft earth: clods fly and the foal comes back with a carrot.
            out = (t < .6 ? [0, 1, 2, 3].map(i => `<circle cx="${X(Math.sin(i * 2 + t * 9) * 36).toFixed(1)}" cy="${(y - 20 - Math.abs(Math.sin(i + t * 12)) * 50).toFixed(1)}" r="6" fill="#a9774b" ${stroke(1.5)}/>`).join('') : '')
                + (t > .55 ? `<g transform="translate(${x} ${(y - 96 + (1 - t) * 80).toFixed(1)}) rotate(-90)"><path d="M0 -6L34 0L0 6Z" fill="#ff9f43" ${stroke(2.5)}/><path d="M0 -4l-10 -8M0 0l-12 0M0 4l-10 8" stroke="#5fb85a" stroke-width="4" stroke-linecap="round"/></g>` : '');
            break;
        case 'echasses': // The ladder stands up on flat ground with nothing to lean on: the foal sways on top like on stilts.
            out = `<g transform="translate(${x} ${y}) rotate(${(Math.sin(t * Math.PI * 5) * 12 * wave).toFixed(1)})">${ladder(Math.round(80 * Math.min(1, t * 4)))}</g>`;
            break;
        case 'toboggan': // A bridge leaned against the step becomes a slide: the foal walks up and slides back down, whee.
            out = `<g transform="translate(${X(50)} ${y - 50}) rotate(${dir * -45})">${plank}</g>${t > .5 ? `<path d="M${X(10)} ${y - 40}q${dir * 10} -10 ${dir * 20} 0M${X(-4)} ${y - 30}q${dir * 10} -10 ${dir * 20} 0" fill="none" stroke="#ec79ac" stroke-width="3" stroke-linecap="round"/>` : ''}`;
            break;
        case 'etoiles': // A tunnel into the rock of the step: the shovel bounces off, stars twirl round the foal's head.
            out = shovel(t < .3 ? -60 + t * 300 : 30 - Math.sin(t * 25) * 30 * (1 - t)) + (t > .3 ? [0, 1, 2].map(i => { const a = t * 10 + i * 2.1; return `<g transform="translate(${(x + Math.cos(a) * 34).toFixed(1)} ${(y - 100 + Math.sin(a) * 10).toFixed(1)}) scale(.75)"><path d="M0 -18L5 -6L18 -5L8 4L11 17L0 10L-11 17L-8 4L-18 -5L-5 -6Z" fill="#ffe381" ${stroke(3)}/></g>`; }).join('') : '');
            break;
        case 'geyser': // A hole at the foot of the step: a spring bursts out and lifts the foal up and down on a fountain.
            out = t > .15 ? `<path d="M${x - 16} ${y}C${x - 10} ${y - 60 * wave} ${x + 10} ${y - 60 * wave} ${x + 16} ${y}Z" fill="#6fc3ef" opacity=".85"/>${drops(x, y - 70 * wave - 10, 6, 34)}` : shovel(-30);
            break;
    }
    return `<g data-fail="${name}">${out}</g>`;
}
/** How the foal itself moves during a funny try: an offset in field units and a little turn. */
export function failPose(name: string, t: number): { dx: number; dy: number; rot: number } {
    const w = Math.sin(t * Math.PI);
    switch (name) {
        case 'plouf': return { dx: t < .4 ? t / .4 * 70 : t < .7 ? 70 : 70 * (1 - (t - .7) / .3), dy: t < .4 ? t / .4 * 80 : t < .7 ? 80 : 80 * (1 - (t - .7) / .3), rot: t > .7 ? Math.sin(t * 60) * 8 : 0 };
        case 'jet': return { dx: t > .4 ? -w * 18 : 0, dy: 0, rot: t > .4 ? -10 * w : 0 };
        case 'balancoire': { const a = Math.sin(t * Math.PI * 4) * 18; return { dx: 24, dy: -28 * Math.sin(a * Math.PI / 180) - 8, rot: a }; }
        case 'accordeon': return { dx: -w * 22, dy: -Math.abs(Math.sin(t * Math.PI * 3)) * 10, rot: 0 };
        case 'taupe': return { dx: t > .3 && t < .6 ? -10 : 0, dy: t > .3 && t < .6 ? -30 * Math.sin((t - .3) / .3 * Math.PI) : 0, rot: 0 };
        case 'glissade': return t < .5 ? { dx: 20 + t * 40, dy: -t * 140, rot: -40 } : { dx: 40 - (t - .5) * 80, dy: -70 + (t - .5) * 140, rot: -10 };
        case 'tremplin': return { dx: 0, dy: -Math.sin(t * Math.PI) * 90, rot: Math.sin(t * Math.PI * 2) * 25 };
        case 'carotte': return { dx: 0, dy: t < .5 ? t * 80 : (1 - t) * 80, rot: t > .55 ? Math.sin(t * 40) * 6 : 0 };
        case 'echasses': return { dx: 0, dy: -80 * Math.min(1, t * 4) * (t > .9 ? (1 - t) * 10 : 1), rot: Math.sin(t * Math.PI * 5) * 12 * w };
        case 'toboggan': return t < .5 ? { dx: t * 120, dy: -t * 100, rot: -30 } : { dx: 60 - (t - .5) * 120, dy: -50 + (t - .5) * 100, rot: -30 * (1 - t) * 2 };
        case 'etoiles': return { dx: t > .3 ? -12 * w : 0, dy: 0, rot: t > .3 ? Math.sin(t * 30) * 6 : 0 };
        case 'geyser': return { dx: 0, dy: t > .15 ? -70 * w : 0, rot: Math.sin(t * 20) * 5 * w };
        default: return { dx: 0, dy: 0, rot: 0 };
    }
}
