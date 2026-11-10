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
