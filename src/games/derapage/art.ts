import { characterSvg } from '../../characters/svg';
import { roofs, type Fail, type Friend } from '../../engines/derapage';
/** Drawings of « Le kart de Pestouille », in board units (the board is 180 wide), in the ink and rounded strokes of the guides.
 * Every thing is drawn centred on (0, 0). Each friend has its own silhouette (round ears, floppy ears, tufts, long ears, a
 * beak, pointed ears) and each funny thing its own shape, so that nothing differs by colour alone, except the roofs, which
 * are the point of the « roofs only » scenes. */
export const INK = '#46364a';
const st = (w = 2): string => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const eyes = (y: number, gap: number, r = 1.8): string => `<circle cx="${-gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${-gap + .6}" cy="${y - .6}" r=".6" fill="#fff"/><circle cx="${gap + .6}" cy="${y - .6}" r=".6" fill="#fff"/>`;
const smile = (y: number, w: number): string => `<path d="M${-w} ${y}Q0 ${y + w} ${w} ${y}" fill="none" ${st(1.5)}/>`;
const cheeks = (y: number, gap: number): string => `<circle cx="${-gap}" cy="${y}" r="2" fill="#ff9fbf" opacity=".8"/><circle cx="${gap}" cy="${y}" r="2" fill="#ff9fbf" opacity=".8"/>`;
export const STAR = 'M0 -10L3 -3.6L9.9 -3.1L4.6 1.5L6.2 8.3L0 4.7L-6.2 8.3L-4.6 1.5L-9.9 -3.1L-3 -3.6Z';
/** A friend's head, about 24 wide, centred on (0, 0). */
export function friendHead(who: Friend): string {
    switch (who) {
        case 'ours': return `<circle cx="-9" cy="-9" r="5" fill="#a0673c" ${st()}/><circle cx="9" cy="-9" r="5" fill="#a0673c" ${st()}/><circle cx="-9" cy="-9" r="2.2" fill="#e8b78a"/><circle cx="9" cy="-9" r="2.2" fill="#e8b78a"/><circle r="12" fill="#a0673c" ${st()}/><ellipse cy="4" rx="6" ry="4.5" fill="#e8b78a" ${st(1.3)}/><ellipse cy="2" rx="2.2" ry="1.6" fill="${INK}"/>${eyes(-3, 5)}${smile(5, 2.5)}`;
        case 'chiot': return `<circle r="12" fill="#f3d9a4" ${st()}/><path d="M-10 -8Q-20 -6 -16 8Q-12 10 -9 2Z" fill="#9c6b3e" ${st()}/><path d="M10 -8Q20 -6 16 8Q12 10 9 2Z" fill="#9c6b3e" ${st()}/><ellipse cx="5" cy="-4" rx="4" ry="3.5" fill="#9c6b3e" opacity=".7"/>${eyes(-2, 4.5)}<ellipse cy="3.5" rx="2.6" ry="2" fill="${INK}"/><path d="M-2 7Q0 11 2 7" fill="#ff7a9a" ${st(1)}/>${cheeks(4, 8)}`;
        case 'hibou': return `<path d="M-11 -6L-12 -15L-5 -10Z M11 -6L12 -15L5 -10Z" fill="#7c4bc2" ${st()}/><ellipse rx="12.5" ry="12" fill="#9b6ad8" ${st()}/><circle cx="-5" cy="-2" r="5" fill="#fff" ${st(1.3)}/><circle cx="5" cy="-2" r="5" fill="#fff" ${st(1.3)}/>${eyes(-2, 5, 2.4)}<path d="M-2 3L2 3L0 7Z" fill="#f2a43a" ${st(1)}/><path d="M-6 9Q0 6 6 9" fill="none" stroke="#e7dbff" stroke-width="1.5"/>`;
        case 'lapin': return `<ellipse cx="-5" cy="-17" rx="3.6" ry="10" fill="#f4f1f6" ${st()}/><ellipse cx="5" cy="-17" rx="3.6" ry="10" fill="#f4f1f6" ${st()}/><ellipse cx="-5" cy="-17" rx="1.5" ry="7" fill="#ffb6c9"/><ellipse cx="5" cy="-17" rx="1.5" ry="7" fill="#ffb6c9"/><circle r="11" fill="#f4f1f6" ${st()}/>${eyes(-2, 4.5)}<path d="M-1.6 2.5L1.6 2.5L0 4.5Z" fill="#ff7a9a"/><path d="M0 4.5Q-3 8 -5 6M0 4.5Q3 8 5 6" fill="none" ${st(1.2)}/>${cheeks(4, 7)}`;
        case 'canard': return `<path d="M-2 -12Q0 -17 4 -14" fill="none" ${st(1.5)}/><circle r="11.5" fill="#ffd84a" ${st()}/>${eyes(-3, 4.5)}<path d="M-7 3Q0 0 7 3Q8 7 0 8Q-8 7 -7 3Z" fill="#f28c28" ${st(1.4)}/>${cheeks(1, 8.5)}`;
        case 'chat': return `<path d="M-11 -3L-11 -16L-3 -10Z M11 -3L11 -16L3 -10Z" fill="#f29b4a" ${st()}/><circle r="12" fill="#f29b4a" ${st()}/><path d="M-4 -11Q0 -8 4 -11M0 -12V-8" fill="none" stroke="#c96a1c" stroke-width="1.6" stroke-linecap="round"/>${eyes(-1, 4.8)}<path d="M-1.6 3L1.6 3L0 5Z" fill="#ff6f9a"/><path d="M0 5Q-3 8 -5 6M0 5Q3 8 5 6" fill="none" ${st(1.2)}/><path d="M-15 2H-8M-15 5H-8M15 2H8M15 5H8" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`;
    }
}
const bodyColour: Readonly<Record<Friend, string>> = { ours: '#a0673c', chiot: '#f3d9a4', hibou: '#9b6ad8', lapin: '#f4f1f6', canard: '#ffd84a', chat: '#f29b4a' };
/** A friend standing, about 38 wide and 52 high, centred on (0, 0): body, waving arm (`.derapage-bras`), head. */
export function friendBody(who: Friend): string {
    const c = bodyColour[who];
    return `<ellipse cy="24" rx="13" ry="3" fill="#00000022"/><path d="M-11 22Q-13 2 0 0Q13 2 11 22Z" fill="${c}" ${st()}/><ellipse cy="13" rx="6" ry="7" fill="#fff" opacity=".55"/>`
        + `<path d="M-10 6Q-16 12 -14 16" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><g class="derapage-bras"><path d="M10 6Q17 0 16 -8" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M10 6Q17 0 16 -8" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round" opacity=".5"/></g>`
        + `<g transform="translate(0 -11)">${friendHead(who)}</g>`;
}
/** The gift each friend waits for, about 18 wide. */
export function gift(who: Friend): string {
    switch (who) {
        case 'ours': return `<path d="M-9 1H9V8Q0 11 -9 8Z" fill="#f7c6d9" ${st(1.4)}/><path d="M-9 1Q-6 -4 0 -4Q6 -4 9 1Z" fill="#fff" ${st(1.4)}/><path d="M0 -4V-9" stroke="#ffd84a" stroke-width="2"/><path d="M0 -13Q2 -10 0 -9Q-2 -10 0 -13Z" fill="#ff8c1a"/><circle cx="-4" cy="4" r="1.2" fill="#e5383b"/><circle cx="4" cy="5" r="1.2" fill="#2f80ed"/>`;
        case 'chiot': return `<circle r="8" fill="#e5383b" ${st(1.4)}/><path d="M-8 0Q0 -5 8 0" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M-6 5Q0 1 6 5" fill="none" stroke="#fff" stroke-width="2"/>`;
        case 'hibou': return `<rect x="-10" y="-7" width="20" height="14" rx="2" fill="#fff" ${st(1.4)}/><path d="M-10 -7L0 1L10 -7" fill="none" ${st(1.4)}/><path d="M0 4C-3 1 -5 4 0 7C5 4 3 1 0 4Z" fill="#e5383b"/>`;
        case 'lapin': return `<path d="M-3 -6L3 -6L1 10Z" transform="rotate(25)" fill="#f2851d" ${st(1.4)}/><path d="M-1 -7Q-5 -13 -3 -14M0 -7Q0 -14 2 -14M1 -7Q5 -12 6 -10" transform="rotate(25)" fill="none" stroke="#27ae60" stroke-width="2" stroke-linecap="round"/>`;
        case 'canard': return `<path d="M-10 2L10 2L6 8L-6 8Z" fill="#fff" ${st(1.4)}/><path d="M-2 2L0 -9L7 2Z" fill="#cfe8ff" ${st(1.4)}/>`;
        case 'chat': return `<circle r="8" fill="#ff7ab6" ${st(1.4)}/><path d="M-6 -4Q0 0 6 -5M-7 1Q0 5 7 0M-4 6Q1 2 5 6" fill="none" stroke="#c2185b" stroke-width="1.2"/><path d="M6 4Q12 8 10 12" fill="none" stroke="#ff7ab6" stroke-width="1.6" stroke-linecap="round"/>`;
    }
}
/** A house with its roof in the friend's colour, centred on (0, 0), `w` wide: walls, roof, round window, door. With
 * `face`, the friend peeks out of the window. */
export function house(who: Friend, w: number, face: boolean): string {
    const h = w * .62, roof = roofs[who];
    return `<path d="M${-w / 2 - 4} ${-h * .1}L0 ${-h * .1 - w * .5}L${w / 2 + 4} ${-h * .1}Z" fill="${roof}" ${st(w / 30)}/><path d="M${-w * .32} ${-h * .1 - w * .18}L${w * .1} ${-h * .1 - w * .42}" stroke="#ffffff88" stroke-width="${w / 20}" stroke-linecap="round"/>`
        + `<rect x="${-w / 2}" y="${-h * .1}" width="${w}" height="${h}" fill="#fff4dc" ${st(w / 30)}/>`
        + `<rect x="${-w * .12}" y="${h * .38}" width="${w * .24}" height="${h * .52}" rx="${w * .1}" fill="#b5784a" ${st(w / 40)}/>`
        + (face ? `<g transform="translate(${w * .28} ${h * .25}) scale(${w / 90})"><circle r="12" fill="#cfe8ff" ${st(1.4)}/>${friendHead(who)}</g>` : `<circle cx="${w * .28}" cy="${h * .25}" r="${w * .11}" fill="#cfe8ff" ${st(w / 40)}/>`);
}
/** A picture of a funny thing for a sign, about 28 wide. */
export function funnyIcon(f: Fail): string {
    switch (f) {
        case 'boue': return `<ellipse rx="13" ry="7" fill="#8b5a2b" ${st(1.4)}/><ellipse cx="-4" cy="-2" rx="4" ry="1.6" fill="#b07a45"/><circle cx="6" cy="-1" r="1.6" fill="#b07a45"/>`;
        case 'moutons': return [[-6, 0], [6, 2]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle cx="-4" cy="-2" r="4" fill="#fff" ${st(1.2)}/><circle cx="3" cy="-3" r="4.5" fill="#fff" ${st(1.2)}/><circle cx="0" cy="2" r="4.5" fill="#fff" ${st(1.2)}/><ellipse cx="6" cy="2" rx="2.6" ry="3" fill="${INK}"/></g>`).join('');
        case 'foin': return `<rect x="-13" y="-8" width="26" height="16" rx="3" fill="#f2cf5b" ${st(1.4)}/><path d="M-9 -8V8M-3 -8V8M3 -8V8M9 -8V8" stroke="#c9a227" stroke-width="1.2"/>`;
        case 'mauvais': return '';
        case 'planches': return `<path d="M-14 6Q0 -4 14 6" fill="none" stroke="#5fb3e6" stroke-width="6"/><path d="M-12 -3H12" stroke="#a0673c" stroke-width="3"/>${[-9, -3, 3, 9].map(x => `<rect x="${x - 2}" y="-6" width="4" height="7" rx="1" fill="#c8945f" ${st(.8)}/>`).join('')}`;
        case 'grotte': return `<path d="M-14 9Q-14 -10 0 -10Q14 -10 14 9Z" fill="#9aa5b1" ${st(1.4)}/><path d="M-7 9Q-7 -3 0 -3Q7 -3 7 9Z" fill="#1d1a2e"/><circle cx="-2" cy="3" r="1.2" fill="#ffe14a"/><circle cx="2" cy="3" r="1.2" fill="#ffe14a"/>`;
        case 'manege': return `<circle r="11" fill="none" stroke="#8d8d99" stroke-width="5"/><circle r="5" fill="#7bc96f" ${st(1.2)}/><path d="M0 -5V-14" ${st(1.2)}/><path d="M0 -14L6 -12L0 -10Z" fill="#e5383b"/>`;
    }
}
/** A sign's picture of a friend: his house with his face in the window, or only the roof's colour. */
export const friendIcon = (who: Friend, roofOnly: boolean): string => `<g transform="translate(0 4)">${house(who, 26, !roofOnly)}</g>`;
/** The big arrow the child touches, pointing up (-y), 36 wide. */
export function arrow(): string {
    return `<circle r="18" fill="#ffffffcc" ${st(2)}/><path d="M0 -14L13 0H6V13H-6V0H-13Z" fill="#ffcf33" ${st(2.4)}/>`;
}
/** A wooden sign of `w` × `h` with its two posts, centred on its middle. */
export function panel(w: number, h: number): string {
    return `<path d="M${-w * .3} ${h / 2 - 3}V${h / 2 + 1}M${w * .3} ${h / 2 - 3}V${h / 2 + 1}" stroke="#8a5a32" stroke-width="5" stroke-linecap="round"/>`
        + `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h - 2}" rx="7" fill="#c8945f" ${st(2.2)}/><rect x="${-w / 2 + 4}" y="${-h / 2 + 4}" width="${w - 8}" height="${h - 10}" rx="5" fill="#fffaf0" stroke="#8a5a32" stroke-width="1.2"/>`;
}
/** The no-entry sign of a one-way road. */
export function noEntry(): string {
    return `<path d="M0 12V26" stroke="#8d8d99" stroke-width="3" stroke-linecap="round"/><circle r="15" fill="#e5383b" ${st(2)}/><rect x="-10" y="-3" width="20" height="6" rx="1.5" fill="#fff"/>`;
}
/** Pestouille's kart, seen from above, going up: the chassis (it turns with the road) and Pestouille (the guide's own
 * drawing, always upright) with the parcel behind him. The mud and the shining eyes are hidden until a funny try. */
export function kartChassis(): string {
    return `<g class="derapage-chassis">${[[-20, -16], [20, -16], [-20, 16], [20, 16]].map(([x, y]) => `<rect x="${x! - 5}" y="${y! - 8}" width="10" height="16" rx="3" fill="#3b3346" ${st(1.4)}/>`).join('')}`
        + `<path d="M-16 -26Q0 -32 16 -26L18 22Q0 28 -18 22Z" fill="#ff6b3d" ${st(2.2)}/><path d="M-11 -20Q0 -24 11 -20" fill="none" stroke="#ffd2a8" stroke-width="2.5" stroke-linecap="round"/><rect x="-12" y="14" width="24" height="7" rx="3" fill="#ffcf33" ${st(1.4)}/></g>`;
}
export function pilot(): string {
    return `<g class="derapage-pilote"><g class="derapage-colis"><rect x="-9" y="6" width="18" height="14" rx="2" fill="#d9a066" ${st(1.4)}/><path d="M0 6V20M-9 13H9" stroke="#e5383b" stroke-width="1.6"/></g>`
        + characterSvg('dragon', 'joie', 'repos', 'reduce').replace('<svg ', '<svg x="-25" y="-36" width="50" height="50" ')
        + `<g class="derapage-crotte"><circle cx="-8" cy="-14" r="3.5" fill="#8b5a2b"/><circle cx="7" cy="-20" r="2.6" fill="#8b5a2b"/><circle cx="10" cy="-6" r="3" fill="#8b5a2b"/><circle cx="-12" cy="2" r="2.4" fill="#8b5a2b"/><circle cx="2" cy="-2" r="2" fill="#8b5a2b"/></g>`
        + `<g class="derapage-yeux"><circle cx="-6" cy="-15" r="9" fill="#fff36b" opacity=".35"/><circle cx="6" cy="-15" r="9" fill="#fff36b" opacity=".35"/><circle cx="-6" cy="-15" r="4.2" fill="#fff36b" stroke="#fff" stroke-width="1"/><circle cx="6" cy="-15" r="4.2" fill="#fff36b" stroke="#fff" stroke-width="1"/><circle cx="-6" cy="-15" r="1.6" fill="#46364a"/><circle cx="6" cy="-15" r="1.6" fill="#46364a"/></g></g>`;
}
const sheep = (x: number, y: number): string => `<g transform="translate(${x} ${y})"><path d="M-6 8V13M6 8V13" ${st(2.4)}/><circle cx="-7" cy="0" r="7" fill="#fff" ${st(1.6)}/><circle cx="3" cy="-3" r="8" fill="#fff" ${st(1.6)}/><circle cx="2" cy="5" r="7" fill="#fff" ${st(1.6)}/><circle cx="-5" cy="6" r="6" fill="#fff" ${st(1.6)}/><ellipse cx="12" cy="2" rx="5" ry="6" fill="${INK}"/><circle cx="13.5" cy="0" r="1.2" fill="#fff"/></g>`;
/** The big funny things at the top of their screen, centred on (0, 0), about 130 wide and 110 high. Each has its own part
 * that moves (`data-part`). */
export function funnyThing(f: Fail): string {
    switch (f) {
        case 'boue': return `<g data-part class="derapage-flaque"><ellipse cy="34" rx="46" ry="18" fill="#8b5a2b" ${st(2.4)}/><ellipse cx="-14" cy="30" rx="12" ry="4" fill="#b07a45"/><circle cx="18" cy="36" r="4" fill="#b07a45"/></g>`
            + `<g transform="translate(0 -22)"><rect x="-40" y="-26" width="80" height="44" rx="8" fill="#bfe4ff" ${st(2.4)}/><path d="M-40 -26Q0 -48 40 -26" fill="#5fb3e6" ${st(2.4)}/><rect x="-28" y="-14" width="56" height="10" rx="4" fill="#fff"/><g class="derapage-mousse">${[[-22, 4], [-8, 8], [8, 2], [22, 8], [0, 12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#fff" stroke="#9ccbf0" stroke-width="1.5"/>`).join('')}</g></g>`;
        case 'moutons': return `<path d="M-64 16H64" stroke="#c8e6a0" stroke-width="30"/><g data-part class="derapage-troupeau">${sheep(-40, 14)}${sheep(0, 10)}${sheep(40, 16)}</g><path d="M-62 -40H62" stroke="#a0673c" stroke-width="3"/>${[-56, -28, 0, 28, 56].map(x => `<path d="M${x} -48V-30" stroke="#a0673c" stroke-width="4" stroke-linecap="round"/>`).join('')}`;
        case 'foin': return `<g data-part class="derapage-meule">${[-1, 0, 1].map(i => `<rect x="${i * 40 - 20}" y="10" width="40" height="30" rx="5" fill="#f2cf5b" ${st(2.2)}/>`).join('')}${[-.5, .5].map(i => `<rect x="${i * 40 - 20}" y="-20" width="40" height="30" rx="5" fill="#f5d873" ${st(2.2)}/>`).join('')}<path d="M-52 18H-28M-12 18H12M28 18H52M-32 -12H-8M8 -12H32" stroke="#c9a227" stroke-width="2" stroke-linecap="round"/></g>`;
        case 'mauvais': return '';
        case 'planches': return `<path d="M-66 30Q0 4 66 30V50H-66Z" fill="#5fb3e6"/><path d="M-60 40Q-40 34 -20 40M10 44Q30 38 50 44" stroke="#fff" stroke-width="2" fill="none"/><g data-part class="derapage-pont-bois"><path d="M-14 50V-40M14 50V-40" stroke="#8a5a32" stroke-width="3"/>${Array.from({ length: 9 }, (_, k) => `<rect x="-16" y="${-40 + k * 10}" width="32" height="7" rx="2" fill="#c8945f" ${st(1.2)}/>`).join('')}</g><ellipse cy="-46" rx="30" ry="10" fill="#7bc96f" ${st(2)}/>`;
        case 'grotte': return `<path d="M-62 46Q-66 -46 0 -50Q66 -46 62 46Z" fill="#9aa5b1" ${st(2.4)}/><path d="M-40 -20L-30 -26M30 -30L42 -22M-10 -40L4 -38" stroke="#7d8793" stroke-width="2"/><g data-part class="derapage-noir"><path d="M-30 46Q-32 -12 0 -14Q32 -12 30 46Z" fill="#1d1a2e"/></g>`;
        case 'manege': return `<g data-part class="derapage-manege"><circle cy="6" r="44" fill="none" stroke="#8d8d99" stroke-width="22"/><circle cy="6" r="44" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="6 8"/><circle cy="6" r="30" fill="#7bc96f" ${st(2)}/>${[0, 72, 144, 216, 288].map(a => `<circle cx="${Math.cos(a * Math.PI / 180) * 18}" cy="${6 + Math.sin(a * Math.PI / 180) * 18}" r="4" fill="${['#ff7ab6', '#ffd84a', '#ffffff', '#9b6ad8', '#ff8c1a'][a / 72]}"/>`).join('')}<path d="M0 6V-30" ${st(2)}/><path d="M0 -30L16 -24L0 -18Z" fill="#e5383b" ${st(1.4)}/></g>`;
    }
}
/** The bubble with the sound word. */
export const bubbleWidth = (word: string): number => Math.max(50, word.length * 9 + 18);
export function bubble(word: string): string {
    const w = bubbleWidth(word);
    return `<g class="derapage-bulle-mot"><rect x="${-w / 2}" y="-44" width="${w}" height="26" rx="10" fill="#fff" ${st(1.8)}/><path d="M-4 -19L0 -12L5 -19" fill="#fff" ${st(1.8)}/><text x="0" y="-25" text-anchor="middle" font-size="16" font-weight="800" fill="${INK}" font-family="inherit">${word}</text></g>`;
}
const sparks = (fill: string): string => [[-24, -18], [0, -30], [24, -18]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.7)" d="${STAR}" fill="${fill}" ${st(1.4)}/>`).join('');
/** What flies around a funny try, drawn where it happens. */
export const effects: Readonly<Record<Fail, string>> = {
    boue: `<g class="derapage-eclat">${[[-20, -10], [16, -16], [-8, -24], [24, 0]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#8b5a2b"/>`).join('')}</g>`,
    moutons: `<g class="derapage-eclat">${sparks('#ffffff')}</g>`,
    foin: `<g class="derapage-eclat">${[[-20, -10], [0, -22], [20, -8]].map(([x, y]) => `<path d="M${x} ${y}l6 -4" stroke="#c9a227" stroke-width="2.4" stroke-linecap="round"/>`).join('')}</g>`,
    mauvais: `<g class="derapage-eclat">${sparks('#ff9fbf')}</g>`,
    planches: `<g class="derapage-eclat">${sparks('#c8945f')}</g>`,
    grotte: `<g class="derapage-eclat">${sparks('#fff36b')}</g>`,
    manege: `<g class="derapage-eclat">${sparks('#ffd84a')}</g>`
};
/** What the kart does in a funny try. */
export const failAnimations: Readonly<Record<Fail, string>> = {
    boue: 'derapage-kart-crotte', moutons: 'derapage-kart-attend', foin: 'derapage-kart-boing', mauvais: 'derapage-kart-oups',
    planches: 'derapage-kart-clac', grotte: 'derapage-kart-noir', manege: 'derapage-kart-tours'
};
/** What the thing of the try does: the puddle splashes, the sheep cross, the hay squashes, the friend waves, the planks
 * bounce, the cave darkens, the merry-go-round spins. */
export const thingAnimations: Readonly<Record<Fail, string>> = {
    boue: 'derapage-flaque-splash', moutons: 'derapage-moutons-passent', foin: 'derapage-foin-boing', mauvais: 'derapage-ami-coucou',
    planches: 'derapage-planches-clac', grotte: 'derapage-grotte-noire', manege: 'derapage-manege-tourne'
};
export const failWords: Readonly<Record<'fr' | 'en', Record<Fail, string>>> = {
    fr: { boue: 'Splatch !', moutons: 'Bêêê !', foin: 'Boing !', mauvais: 'Coucou !', planches: 'Clac clac !', grotte: 'Hou hou !', manege: 'Youpi !' },
    en: { boue: 'Splat!', moutons: 'Baa!', foin: 'Boing!', mauvais: 'Hello!', planches: 'Clack!', grotte: 'Oooh!', manege: 'Wheee!' }
};
/** The bonus star of a drift, the sparks under the wheels, the confetti of a delivery. */
export const bonusStar = (): string => `<g class="derapage-etoile-bonus"><path d="${STAR}" transform="scale(1.8)" fill="#ffd23f" ${st(1.4)}/></g>`;
export const driftSparks = (): string => `<g class="derapage-etincelles">${[[-22, 20], [22, 22], [-26, 8], [26, 10]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.6)" d="${STAR}" fill="#ffb627"/>`).join('')}<path d="M-20 26Q-30 40 -26 56M20 26Q30 40 26 56" fill="none" stroke="#3b334666" stroke-width="5" stroke-linecap="round"/></g>`;
export const confetti = (): string => `<g class="derapage-confettis">${Array.from({ length: 14 }, (_, k) => `<rect x="${Math.round(Math.cos(k * 2.4) * (14 + k * 2))}" y="${Math.round(Math.sin(k * 2.4) * (10 + k * 2)) - 20}" width="4" height="7" rx="1" fill="${['#e5383b', '#2f80ed', '#ffd84a', '#27ae60', '#9b51e0', '#f2851d'][k % 6]}" transform="rotate(${k * 37} ${Math.round(Math.cos(k * 2.4) * (14 + k * 2))} ${Math.round(Math.sin(k * 2.4) * (10 + k * 2)) - 20})"/>`).join('')}</g>`;
