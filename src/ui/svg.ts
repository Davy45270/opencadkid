import { volume } from './illustration';
import type { ObjectKind } from '../engines/compter';
export function svg(body: string, box = '0 0 64 64'): string { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${body}</svg>`; }
const stroke = 'stroke="#58443b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';
export function objectSvg(kind: ObjectKind): string {
    const drawings: Record<ObjectKind, string> = {
        apple: '<path fill="#ef7865" d="M32 18C6 5 5 48 22 55Q32 59 38 55C59 55 59 10 39 16Z"/><path fill="none" d="M32 21L35 9"/><path fill="#70aa65" d="M35 13Q50 0 53 11Q47 20 35 13"/>',
        pear: '<path fill="#b5cd69" d="M28 13Q39 8 39 25C39 33 55 37 51 48C47 62 14 60 12 47C10 35 25 31 25 21Z"/><path fill="none" d="M31 14L36 5"/>',
        berry: '<path fill="#f17683" d="M12 23Q32 13 53 23Q50 45 32 58Q14 47 12 23"/><path fill="#73ae64" d="M32 23L13 15L27 15L32 5L37 15L52 15Z"/><path stroke="#fff4cb" d="M24 30V32M40 30V32M32 39V41M23 42V44M39 44V46"/>',
        carrot: '<path fill="#f6a34d" d="M20 19Q39 12 47 28L13 58Z"/><path fill="none" stroke="#70a75a" stroke-width="6" d="M34 20L32 5M39 21L50 8M28 19L18 7"/><path fill="none" d="M24 30L33 35M20 40L26 44"/>',
        star: '<path fill="#f6cf63" d="M32 5L40 23L60 25L45 39L49 59L32 49L14 59L18 39L4 25L24 23Z"/>',
        fish: '<path fill="#77bfc5" d="M44 30L59 15V49L44 36Q25 58 6 33Q24 8 44 30Z"/><circle fill="#fff" cx="20" cy="29" r="5"/><circle fill="#58443b" cx="20" cy="29" r="2"/>',
        flower: '<path stroke="#70a75a" stroke-width="5" d="M32 30V59"/><path fill="#86bd76" d="M32 49Q11 50 14 38Q30 36 32 49"/><g fill="#efa9c2"><circle cx="32" cy="14" r="10"/><circle cx="46" cy="25" r="10"/><circle cx="41" cy="41" r="10"/><circle cx="23" cy="41" r="10"/><circle cx="17" cy="25" r="10"/></g><circle fill="#f6cf63" cx="32" cy="28" r="10"/>'
    };
    return svg(volume(`<g ${stroke}>${drawings[kind]}</g>`));
}
export function dots(n: number): string {
    const dice: readonly (readonly [number, number])[][] = [[], [[36, 24]], [[12, 8], [60, 40]], [[12, 8], [36, 24], [60, 40]], [[12, 8], [60, 8], [12, 40], [60, 40]], [[12, 8], [60, 8], [36, 24], [12, 40], [60, 40]], [[12, 8], [60, 8], [12, 24], [60, 24], [12, 40], [60, 40]]];
    if (n > 10) {
        // Beyond ten, a centred grid of smaller dots (at most six per row) stays inside the 72×48 box.
        const rows = Math.ceil(n / 6), columns = Math.ceil(n / rows);
        return svg(Array.from({ length: n }, (_, i) => `<circle cx="${36 + (i % columns - (columns - 1) / 2) * 11.5}" cy="${24 + (Math.floor(i / columns) - (rows - 1) / 2) * 11.5}" r="4.5" fill="currentColor"/>`).join(''), '0 0 72 48');
    }
    const positions = n <= 6 ? dice[n]! : Array.from({ length: n }, (_, i) => [8 + i % 5 * 14, 14 + Math.floor(i / 5) * 20] as const);
    return svg(positions.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="currentColor"/>`).join(''), '0 0 72 48');
}
export type Icon = 'home' | 'ear' | 'gear' | 'clock' | 'basket' | 'eye' | 'compare' | 'check' | 'arrow' | 'replay' | 'lock' | 'close';
export function icon(name: Icon): string {
    const paths: Record<Icon, string> = {
        home: '<path d="M6 30L32 8L58 30M14 26V56H50V26M26 56V38H38V56"/>',
        ear: '<path d="M18 24C16 0 54 3 51 28C49 40 37 39 35 49C33 62 17 58 17 48M28 26C27 13 43 15 41 26L33 36"/>',
        gear: '<path d="M24 10L26 4H38L40 10L49 14L55 13L61 24L56 29V39L60 44L54 54L47 52L39 56L37 62H26L24 56L15 52L8 54L3 43L8 38V28L3 23L9 13L16 15Z"/><circle cx="32" cy="33" r="11"/>',
        clock: '<circle cx="32" cy="32" r="26"/><path d="M32 14V32L44 40M32 6V10M58 32H54M32 58V54M6 32H10"/>',
        basket: '<path d="M8 28H56L50 55H14ZM18 28C18 2 46 2 46 28M22 34V49M32 34V49M42 34V49"/>',
        eye: '<path d="M3 25Q32 0 61 25Q32 50 3 25M24 56L30 44L37 51L45 40"/><circle cx="32" cy="25" r="9"/>',
        compare: '<path d="M4 35H26L22 56H8ZM38 35H60L56 56H42ZM15 24H51M42 15L51 24L42 32"/>',
        check: '<path d="M10 33L25 49L55 14"/>', arrow: '<path d="M8 32H55M38 13L57 32L38 51"/>',
        replay: '<path d="M15 20A23 23 0 1 1 9 40M15 7V24H32"/>', lock: '<rect x="13" y="27" width="38" height="31" rx="8"/><path d="M21 27V17C21 2 43 2 43 17V27"/>', close: '<path d="M14 14L50 50M50 14L14 50"/>'
    };
    return svg(`<g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</g>`);
}
export function scenery(): string {
    return svg(volume(`<rect width="900" height="300" fill="#c5eaf0"/>
    <circle cx="748" cy="63" r="50" fill="#fff0b0" opacity=".35"/><circle cx="748" cy="63" r="35" fill="#f8d982"/>
    <g fill="#fffdf5"><path d="M101 66C70 42 113 23 138 38C142 10 199 15 203 39C247 37 254 68 217 72Z"/><path d="M499 65C475 45 505 30 526 39C537 11 581 18 587 36C627 28 647 63 613 68Z"/></g>
    <path d="M0 211Q128 107 292 174Q427 106 564 191Q740 117 900 179V300H0Z" fill="#badbb3"/>
    <path d="M0 254Q190 157 398 233Q651 139 900 232V300H0Z" fill="#95c59c"/>
    <path d="M0 284Q259 227 452 266Q687 213 900 271V300H0Z" fill="#81b382"/>
    <path d="M55 265Q68 171 66 94M67 174L33 135M66 152L100 111" fill="none" stroke="#a8805c" stroke-width="17" stroke-linecap="round"/>
    <g fill="#71ac79"><ellipse cx="60" cy="83" rx="44" ry="58"/><ellipse cx="26" cy="123" rx="31" ry="42"/><ellipse cx="99" cy="117" rx="36" ry="47"/></g>
    <g fill="#add29b"><path d="M34 72Q42 38 62 42Q47 53 34 72Z"/><path d="M79 98Q99 77 113 91Q96 88 79 98Z"/></g>
    <path d="M858 265L850 122M850 174L824 148" fill="none" stroke="#b38a62" stroke-width="12"/>
    <g fill="#88b880"><ellipse cx="849" cy="105" rx="39" ry="51"/><ellipse cx="817" cy="141" rx="29" ry="35"/><ellipse cx="881" cy="142" rx="32" ry="39"/></g>
    <g stroke="#56865b" stroke-width="2" fill="none"><path d="M24 289l-7 -14m7 14l8 -18M302 285l-6 -15m6 15l7 -19M612 282l-5 -13m5 13l9 -16M872 287l-5 -18m5 18l9 -12"/></g>
    <g fill="#ffe9c1"><path d="M25 276c-14 -8 -7 -15 0 -7c8 -10 15 -1 0 7Z"/><path d="M610 272c-12 -9 -4 -15 1 -7c9 -6 13 4 -1 7Z"/></g>
    <g fill="#f3b6c8"><path d="M303 275c-12 -7 -7 -15 0 -8c8 -8 15 2 0 8Z"/><path d="M874 276c-13 -8 -6 -15 0 -8c9 -9 16 2 0 8Z"/></g>`), '0 0 900 300');
}
