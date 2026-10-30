import { volume } from '../../ui/illustration';
import { drawings as memoryDrawings } from '../paires/motifs';
import type { Word } from '../../engines/sons/lexicon';
// Small native SVG drawings. Shared outlines represent the same object in both languages.
const path = (d: string, fill = '#e7b65a'): string => `<path d="${d}" fill="${fill}"/>`;
const circle = (x: number, y: number, r: number, fill = '#f3cf76'): string => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const rect = (x: number, y: number, w: number, h: number, fill = '#8fb9c6'): string => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}"/>`;
const eyes = circle(24, 28, 2, '#354e41') + circle(40, 28, 2, '#354e41');
const face = circle(32, 33, 23, '#cfa274') + eyes + path('M25 42Q32 48 39 42', 'none');
const wheels = circle(17, 49, 8, '#354e41') + circle(48, 49, 8, '#354e41');
const animal = (ears: string, details = ''): string => ears + face + details;
const custom: Record<string, string> = {
    queen: face + path('M9 20L4 3L22 12L32 1L42 12L60 3L55 20Z', '#eac34b') + path('M20 57L32 47L44 57', '#b894bc'),
    quilt: rect(4, 4, 56, 56, '#fcf8ed') + rect(5, 5, 26, 26, '#dba3ae') + rect(33, 5, 26, 26, '#8fb9c6') + rect(5, 33, 26, 26, '#8caf65') + rect(33, 33, 26, 26, '#e7b65a') + path('M5 5L59 59M5 59L59 5', 'none'),
    quill: path('M8 59L52 7M17 48Q1 12 57 2Q63 45 17 48ZM18 47L18 23M27 36L47 35', '#d6e8ec'),
    bee: path('M28 26C2 0 1 38 26 35M36 26C62 0 63 38 38 35', '#c4e4ec') + path('M12 37Q32 10 52 37Q32 63 12 37Z', '#f4cf5b') + path('M25 25V49M36 25V49', 'none') + circle(46, 34, 2, '#354e41'),
    tree: rect(27, 30, 10, 28, '#a77e51') + circle(32, 24, 20, '#8caf65') + circle(17, 30, 12, '#8caf65') + circle(47, 30, 12, '#8caf65'),
    plane: path('M28 6Q32 0 36 6L37 24L60 38L59 44L37 36L37 50L46 57L44 61L32 57L20 61L18 57L27 50L27 36L5 44L4 38L27 24Z', '#9ebdcc'),
    ball: circle(32, 32, 26, '#e8ba61') + path('M8 28Q32 41 56 28M30 6Q13 32 30 58M36 6Q53 32 36 58', 'none'),
    gift: rect(7, 24, 50, 33, '#a7c8ae') + rect(4, 18, 56, 12, '#dba3ae') + path('M32 18C-5 -8 17 -5 32 18C69 -8 49 -5 32 18M32 19V57', 'none'),
    cube: path('M6 18L32 5L58 18V46L32 59L6 46ZM6 18L32 31L58 18M32 31V59', '#8fb9c6'),
    dice: rect(8, 8, 48, 48, '#fcf8ed') + [circle(20, 20, 4), circle(44, 20, 4), circle(32, 32, 4), circle(20, 44, 4), circle(44, 44, 4)].join(''),
    domino: rect(17, 4, 30, 56, '#fcf8ed') + path('M17 32H47', 'none') + circle(25, 17, 3) + circle(39, 23, 3) + circle(25, 41, 3) + circle(39, 51, 3),
    dolphin: path('M4 37Q21 7 43 24L53 16L52 30L61 38L46 38Q32 53 18 45L10 55L12 40ZM25 26L27 12L38 24', '#8fb9c6') + circle(42, 30, 2, '#354e41'),
    scarf: path('M12 6H51V24H37L44 55H28L22 25L13 57H2L10 22Z', '#b894bc') + path('M11 14H51M29 45L41 44M5 49L16 51', 'none'),
    ladder: path('M15 4V60M49 4V60M15 12H49M15 25H49M15 38H49M15 51H49', 'none'),
    flower: path('M32 33V60M32 49Q6 36 12 53Q23 61 32 49', '#8caf65') + circle(20, 20, 12, '#dba3ae') + circle(42, 20, 12, '#dba3ae') + circle(32, 9, 9, '#dba3ae') + circle(32, 31, 12, '#dba3ae') + circle(31, 21, 8),
    ant: path('M24 30L7 21M24 34L5 39M30 45L10 57M40 31L58 22M40 35L60 43M39 44L53 58M26 12L19 3M37 12L45 3', 'none') + circle(32, 17, 10, '#b97e60') + circle(32, 34, 8, '#b97e60') + circle(32, 49, 10, '#b97e60'),
    cake: rect(6, 27, 52, 30, '#e8ba93') + path('M6 33Q15 48 23 33Q31 48 40 33Q49 48 58 33V25H6Z', '#f1ddd3') + rect(29, 12, 6, 15) + path('M32 2Q21 13 32 13Q43 13 32 2', '#e49b60'),
    eraser: path('M7 39L33 9L58 28L33 58ZM20 24L46 42', '#dba3ae'),
    gorilla: animal(circle(9, 31, 8, '#777f86') + circle(55, 31, 8, '#777f86'), path('M13 22Q32 2 51 22L46 34Q32 17 18 34Z', '#777f86')),
    island: path('M2 50Q32 30 62 50L54 58H10Z', '#ebcf8d') + path('M31 49L35 16L40 17L37 48', '#a77e51') + path('M37 18Q11 -2 11 23Q22 13 37 18Q53 -2 60 22Q47 12 37 18', '#8caf65') + path('M2 61Q17 54 31 61Q47 54 62 61', 'none'),
    igloo: path('M4 55A28 38 0 0 1 60 55ZM4 42H60M11 26H53M32 4V26M19 26V42M43 26V42M12 42V55M51 42V55', '#d6e8ec') + path('M25 55V45A8 8 0 0 1 41 45V55Z', '#7899a7'),
    iris: path('M32 30V61M32 59L12 30L22 59M32 59L51 27L44 59', '#8caf65') + path('M32 28C0 18 9 -2 26 17C20 -6 47 -6 38 17C57 -3 64 27 32 28L45 38L32 45L19 38Z', '#a48ab7'),
    jaguar: animal(path('M10 21L6 7L24 15M40 15L58 7L54 25', '#dfb969'), circle(17, 40, 3, '#5b513d') + circle(46, 39, 3, '#5b513d') + circle(32, 14, 3, '#5b513d')),
    skirt: path('M20 7H44L58 55Q32 64 6 55ZM20 15H44M24 17L19 54M40 17L45 54', '#b894bc'),
    newspaper: rect(6, 10, 52, 45, '#f1e8d3') + path('M12 18H52M34 27H51M34 35H51M12 45H51', 'none') + rect(12, 25, 15, 13),
    rabbit: animal(path('M17 20C-1 -5 27 -8 26 16M38 16C38 -8 64 -5 47 22', '#cfa274')),
    book: path('M3 10Q20 5 32 15Q44 5 61 10V53Q44 47 32 58Q20 47 3 53ZM32 15V58', '#9abfbb') + path('M9 20L25 24M9 31L25 35M39 24L55 20M39 35L55 31', 'none'),
    motorcycle: wheels + path('M16 46L27 30H44L49 46M17 46H37L25 28M38 17H47L51 33M22 27H34', 'none') + rect(26, 26, 14, 7, '#dba3ae'),
    melon: circle(32, 33, 25, '#b6c47a') + path('M27 8Q10 32 27 58M37 8Q54 32 37 58M32 8V58M32 8L37 2', 'none'),
    sheep: circle(17, 27, 13, '#eee6d6') + circle(32, 18, 14, '#eee6d6') + circle(47, 27, 13, '#eee6d6') + circle(32, 39, 19, '#eee6d6') + path('M17 45V60M47 45V60', 'none') + face,
    ship: path('M3 40H61L49 58H15Z', '#8fb9c6') + rect(13, 23, 38, 17) + rect(24, 11, 8, 12, '#b97e60') + circle(22, 32, 3, '#fcf8ed') + circle(42, 32, 3, '#fcf8ed'),
    nest: path('M4 32Q32 43 60 32L52 54Q32 64 12 54Z', '#b79063') + path('M8 43L51 52M12 51L57 39M15 36L48 57', 'none') + path('M18 32C8 4 37 4 29 32M34 33C25 3 55 5 45 34', '#d6e8ec'),
    cloud: path('M13 52C-4 50 -2 27 14 26C10 2 42 0 45 23C64 16 72 49 51 52Z', '#d6e8ec'),
    orange: circle(32, 36, 25, '#e7a052') + path('M32 11Q38 -1 54 7Q51 19 32 11', '#8caf65') + path('M17 23Q10 31 14 42', 'none'),
    olive: path('M19 54C-4 26 29 -6 49 14C71 42 38 74 19 54Z', '#91a65e') + path('M39 15Q40 3 54 5Q52 18 39 15', '#719258') + circle(27, 35, 6, '#bd7565'),
    seal: path('M5 52Q23 47 25 26C22 4 56 2 56 21Q58 42 44 49L60 54L51 60L34 55Q18 61 5 52Z', '#9ebdcc') + circle(46, 17, 2, '#354e41') + path('M44 25L61 21M44 25L61 28', 'none'),
    pillow: path('M7 7Q32 15 57 7Q50 32 57 57Q32 50 7 57Q15 32 7 7Z', '#b7acd0') + path('M15 16Q32 21 48 16', 'none'),
    dress: path('M21 4L32 11L43 4L53 20L43 26L58 58H6L21 26L11 20ZM21 28H43', '#dba3ae'),
    rat: path('M5 46Q5 12 34 21Q52 22 57 47L37 52H15Q2 60 2 38', '#a7a3a7') + circle(20, 21, 10, '#c1b0b8') + circle(44, 35, 2, '#354e41') + path('M48 45L61 40M48 45L61 50', 'none'),
    robot: rect(13, 12, 38, 28) + rect(17, 42, 30, 17) + path('M32 12V4M17 46L4 39M47 46L60 39', 'none') + circle(32, 4, 3) + eyes + rect(23, 34, 18, 3, '#fcf8ed'),
    bag: rect(10, 23, 44, 35, '#dba3ae') + path('M20 25V15A12 12 0 0 1 44 15V25', 'none'),
    soap: rect(6, 27, 49, 29, '#b4cdb6') + circle(46, 18, 7, '#d6e8ec') + circle(31, 9, 5, '#d6e8ec') + path('M13 37Q31 28 47 37', 'none'),
    bucket: path('M9 22H55L49 58H15ZM13 23C9 -2 55 -2 51 23', '#8fb9c6') + path('M14 29H50', 'none'),
    turtle: circle(32, 32, 22, '#8caf65') + circle(32, 5, 5, '#b6c47a') + circle(10, 16, 5, '#b6c47a') + circle(54, 16, 5, '#b6c47a') + circle(10, 50, 5, '#b6c47a') + circle(54, 50, 5, '#b6c47a') + path('M22 20H42L47 36L32 48L17 36ZM22 20L15 14M42 20L49 14M32 48V54', 'none'),
    tomato: circle(32, 36, 25, '#df8576') + path('M32 18L13 12L26 10L31 2L36 10L52 12L36 20L32 29Z', '#8caf65'),
    top: path('M7 28Q32 9 57 28Q48 49 32 59Q16 49 7 28ZM7 28Q32 37 57 28M32 18V4', '#b894bc'),
    factory: path('M5 59V29L22 17V29L39 17V29H59V59ZM45 29V6H54V29', '#a7a3a7') + rect(12, 39, 9, 11, '#f3cf76') + rect(29, 39, 9, 11, '#f3cf76') + rect(46, 39, 9, 11, '#f3cf76'),
    spatula: path('M20 4H44V27L36 36V59H28V36L20 27ZM26 9V24M32 9V24M38 9V24', '#b79063'),
    ukulele: path('M30 5H39V34C59 32 62 58 42 60C19 63 10 47 25 36L30 30Z', '#b79063') + circle(36, 44, 6, '#58443b') + path('M33 8V53M37 8V53', 'none'),
    cow: animal(path('M13 19L5 6L24 13M40 13L59 6L51 22', '#eee6d6'), path('M16 20L26 15L29 25L20 31Z', '#58443b') + rect(18, 38, 28, 13, '#dba3ae')),
    bicycle: circle(16, 46, 12, '#d6e8ec') + circle(49, 46, 12, '#d6e8ec') + path('M16 46L25 24L37 46H16L41 25L49 46M20 22H31M39 14H46L41 25', 'none'),
    zebra: animal(path('M13 21L10 3L27 14M37 14L54 3L51 24', '#eee6d6'), path('M15 22L26 26M14 32L24 34M49 22L39 26M50 32L40 34M30 12L32 23M23 43L31 46L40 42', 'none')),
    zero: path('M32 4C-3 4 -3 60 32 60C67 60 67 4 32 4ZM32 16C48 16 48 48 32 48C16 48 16 16 32 16Z', '#b894bc'),
    zoo: path('M4 58V15H60V58M4 21H60M15 22V58M27 22V58M39 22V58M51 22V58', 'none') + animal('', '') + path('M4 9Q32 -4 60 9V20H4Z', '#8caf65') + path('M15 30V58M49 30V58', 'none'),
    axe: path('M23 57L36 5L42 7L30 59Z', '#b79063') + path('M36 9L58 6Q63 20 55 29L32 21Z', '#a7a3a7'),
    cup: path('M8 10H46V44Q27 61 8 44ZM46 16C67 11 65 43 46 37', '#9ebdcc') + path('M5 57H54', 'none'),
    dog: animal(path('M17 15C-5 0 -5 43 12 39M47 15C69 0 69 43 52 39', '#a77e51')),
    fork: path('M16 3V23Q16 33 28 34V60H36V34Q48 33 48 23V3M26 3V24M38 3V24', 'none'),
    goat: animal(path('M16 17L10 2L27 16M38 16L54 2L49 21', '#b79063'), path('M24 51L32 62L40 51', '#b79063')),
    goose: path('M5 45Q10 24 31 34L35 15C35 -1 55 0 55 14L62 20L51 23L50 44Q39 65 5 45Z', '#eee6d6') + circle(47, 13, 2, '#354e41') + path('M14 41Q27 50 36 41M25 53V61M38 53V61', 'none'),
    hat: path('M7 43L17 35L21 10H43L49 35L59 43Q32 59 7 43ZM17 35Q32 43 49 35', '#b79063'),
    hen: path('M7 29Q16 36 23 28L24 16Q33 6 43 18L57 23L44 29Q58 57 23 57Q7 55 7 29Z', '#eee6d6') + path('M25 16L22 6L31 10L36 4L41 18', '#df8576') + circle(37, 22, 2, '#354e41'),
    horse: animal(path('M14 23L9 3L26 17M37 17L52 3L51 24', '#a77e51'), path('M28 10L39 10L36 36L28 32Z', '#58443b')),
    jam: rect(12, 17, 40, 42, '#bd7565') + rect(9, 7, 46, 12, '#b894bc') + rect(18, 29, 28, 20, '#fcf8ed') + circle(32, 39, 7, '#bd4769'),
    jug: path('M15 9H43V23L49 32V57H11V32L19 23ZM43 21C65 15 65 48 49 45', '#8fb9c6'),
    jellyfish: path('M5 32A27 29 0 0 1 59 32Z', '#b894bc') + path('M13 32Q5 46 16 60M26 32Q14 47 29 60M40 32Q29 48 43 60M53 32Q44 46 56 60', 'none'),
    kite: path('M32 3L56 25L32 48L8 25ZM32 3V48M8 25H56M32 48Q19 54 34 61', '#dba3ae'),
    key: circle(23, 20, 15) + circle(23, 20, 6, '#fcf8ed') + path('M28 32L48 57L57 49L51 42L46 46L40 38L44 34L37 27', '#e7b65a'),
    kangaroo: path('M4 56Q28 56 27 35L23 24L25 5L32 17L41 3L44 25Q53 30 45 39L58 46L53 51L41 44L35 55H51V61H19Z', '#cfa274') + circle(38, 26, 2, '#354e41'),
    lion: circle(32, 33, 29, '#b79063') + face,
    leaf: path('M8 56Q-1 5 58 5Q59 57 8 56ZM8 56L48 15M18 45L16 28M28 35L44 35', '#8caf65'),
    lemon: path('M4 35L10 26Q13 3 38 11L55 15L59 30L52 36Q45 62 21 53L8 51Z', '#eac34b'),
    mouse: animal(circle(15, 14, 12, '#c1b0b8') + circle(49, 14, 12, '#c1b0b8'), path('M16 41L2 35M16 44L2 48M48 41L62 35M48 44L62 48', 'none')),
    monkey: animal(circle(8, 31, 7, '#a77e51') + circle(56, 31, 7, '#a77e51'), path('M10 21Q32 -1 54 21L44 23L32 18L20 23Z', '#a77e51')),
    net: path('M26 33L48 59L54 54L32 29', '#b79063') + circle(22, 21, 18, '#d6e8ec') + path('M8 13L32 37M12 7L38 26M4 23L24 4M11 34L35 10', 'none'),
    nut: path('M9 31Q8 58 32 61Q57 58 55 31Z', '#b79063') + path('M5 31Q6 10 32 10Q59 10 59 31ZM32 10V3', '#8caf65'),
    pineapple: path('M15 21L11 3L26 13L32 1L39 13L54 3L49 23', '#8caf65') + path('M12 34Q12 17 32 19Q52 17 52 34V47Q50 62 32 61Q14 62 12 47ZM15 29L46 58M28 20L52 43M12 43L40 61M15 54L48 24M12 41L32 20M30 61L52 40', '#eac34b'),
    pig: animal(path('M12 20L8 4L27 16M38 16L56 4L52 24', '#dba3ae'), rect(20, 36, 24, 15, '#dba3ae') + circle(27, 44, 2, '#58443b') + circle(37, 44, 2, '#58443b')),
    panda: animal(circle(14, 14, 10, '#58443b') + circle(50, 14, 10, '#58443b'), circle(23, 28, 7, '#58443b') + circle(41, 28, 7, '#58443b') + circle(23, 27, 2, '#fcf8ed') + circle(41, 27, 2, '#fcf8ed')),
    sun: path('M32 1V9M32 55V63M1 32H9M55 32H63M10 10L16 16M48 48L54 54M10 54L16 48M48 16L54 10', 'none') + circle(32, 32, 21),
    sock: path('M27 5H51V39Q54 58 38 59H10Q-3 50 10 41L27 36ZM27 15H51', '#b894bc'),
    tiger: animal(path('M12 20L8 4L27 16M38 16L56 4L52 24', '#d49a50'), path('M15 21L26 26M14 32L24 34M49 21L39 26M50 32L40 34M30 12L32 23M23 43L31 46L40 42', 'none')),
    van: rect(3, 17, 57, 31, '#8fb9c6') + rect(39, 22, 15, 14, '#d6e8ec') + wheels,
    vest: path('M18 4L32 15L46 4L57 21L48 28V59H16V28L7 21ZM32 15V59', '#8caf65'),
    vase: path('M20 4H44L40 20Q62 47 47 60H17Q2 47 24 20Z', '#b894bc') + path('M19 34H45M16 44H48', 'none'),
    web: path('M32 2V62M2 32H62M10 10L54 54M10 54L54 10M32 8L49 15L56 32L49 49L32 56L15 49L8 32L15 15ZM32 20L41 23L44 32L41 41L32 44L23 41L20 32L23 23Z', 'none'),
    wig: path('M10 60C-4 46 8 35 5 26C3 -5 61 -5 59 26C55 37 69 47 54 60L43 51L47 28L32 18L17 28L21 51Z', '#b79063'),
    wagon: rect(4, 29, 48, 20, '#df8576') + wheels + path('M48 29L59 7L63 9', 'none'),
    yarn: circle(32, 31, 25, '#dba3ae') + path('M12 15L48 50M7 26L38 56M25 7L57 38M11 46L44 9M23 55L55 23M32 56Q12 64 4 58', 'none'),
    yak: animal(path('M15 18Q-1 15 4 3L25 15M39 15L60 3Q65 15 49 21', '#a77e51'), path('M13 20L18 6L25 12L32 4L39 12L47 6L52 22L43 25L32 18L21 25Z', '#58443b')),
    yoyo: circle(29, 39, 21, '#b894bc') + circle(34, 39, 17, '#dba3ae') + circle(34, 39, 4, '#fcf8ed') + path('M29 18L48 2', 'none'),
    zip: rect(14, 4, 36, 56, '#8fb9c6') + path('M27 5V59M37 5V59M24 12H40M24 22H40M24 32H40M24 42H40M24 52H40', 'none') + rect(24, 20, 16, 13, '#eac34b'),
    zucchini: path('M13 54Q-1 45 17 27L42 7Q53 2 58 12Q63 22 49 34L26 57Q20 62 13 54ZM46 8L50 2L58 4L57 13M19 47L48 18', '#8caf65')
};
export const drawings: Readonly<Record<string, string>> = {
    ...Object.fromEntries(Object.entries(memoryDrawings).map(([id, d]) => [id, path(d.path, d.color)])), ...custom
};
export function motifSvg(word: Word): string {
    const drawing = drawings[word.motif];
    if (!drawing) throw new RangeError('Unknown motif');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 70 70" role="img" aria-label="${word.word}" data-word="${word.word}" data-initial="${word.initial}" data-motif="${word.motif}"><g stroke="#354e41" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${volume(drawing)}</g></svg>`;
}
