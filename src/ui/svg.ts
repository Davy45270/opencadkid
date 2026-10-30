import type { ObjectKind } from '../engines/compter';
export function svg(body: string, box = '0 0 64 64'): string { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" aria-hidden="true">${body}</svg>`; }
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
    return svg(`<g ${stroke}>${drawings[kind]}</g>`);
}
export function dots(n: number): string {
    return svg(Array.from({ length: n }, (_, i) => `<circle cx="${12 + i % 5 * 10}" cy="${n > 5 ? 22 + Math.floor(i / 5) * 18 : 32}" r="3.6" fill="currentColor"/>`).join(''));
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
export function scenery(): string { return svg('<rect width="900" height="300" fill="#e2f2ef"/><circle cx="748" cy="63" r="39" fill="#f7d783"/><g fill="#fffdf5"><ellipse cx="140" cy="56" rx="65" ry="18"/><ellipse cx="182" cy="41" rx="39" ry="26"/><ellipse cx="573" cy="43" rx="57" ry="21"/></g><path d="M0 230Q210 100 450 234Q690 125 900 200V300H0" fill="#c4deb0"/><path d="M0 275Q400 190 900 268V300H0" fill="#a9cc94"/><path d="M65 260L78 81" stroke="#ae8766" stroke-width="23"/><g fill="#8dbe86"><circle cx="70" cy="99" r="65"/><circle cx="31" cy="137" r="42"/><circle cx="109" cy="140" r="47"/></g>', '0 0 900 300'); }
