import type { Motif } from '../../engines/paires';
import { svg } from '../../ui/svg';
import type { Locale } from '../../shell/i18n';
export const names: Record<Locale, Record<Motif, string>> = {
    fr: { apple: 'une pomme', banana: 'une banane', cherry: 'des cerises', carrot: 'une carotte', fish: 'un poisson', cat: 'un chat', butterfly: 'un papillon', snail: 'un escargot', car: 'une voiture', boat: 'un bateau', rocket: 'une fusée', house: 'une maison', star: 'une étoile', heart: 'un cœur', moon: 'une lune', umbrella: 'un parapluie' },
    en: { apple: 'an apple', banana: 'a banana', cherry: 'cherries', carrot: 'a carrot', fish: 'a fish', cat: 'a cat', butterfly: 'a butterfly', snail: 'a snail', car: 'a car', boat: 'a boat', rocket: 'a rocket', house: 'a house', star: 'a star', heart: 'a heart', moon: 'a moon', umbrella: 'an umbrella' }
};
// Each path is also the filled silhouette: recognition never depends on colour.
export const drawings: Record<Motif, { color: string; path: string }> = {
    apple: { color: '#e96c64', path: 'M31 18C5 3 4 49 22 55Q31 59 39 55C60 54 59 9 39 17L37 7L31 6Z' },
    banana: { color: '#eac34b', path: 'M10 10Q4 52 43 55Q57 52 58 37Q25 52 17 10Z' },
    cherry: { color: '#bd4769', path: 'M16 29A13 13 0 1 0 27 45L36 14L44 32A12 12 0 1 0 50 30L40 6L31 8L22 29Z' },
    carrot: { color: '#ed9145', path: 'M9 59L22 23L18 5L27 17L33 3L37 18L49 8L42 25L50 32Z' },
    fish: { color: '#57b6bc', path: 'M5 32Q23 8 43 27L60 13L58 51L43 38Q24 57 5 32Z' },
    cat: { color: '#9a80bf', path: 'M12 51Q4 37 14 24L12 6L28 17L39 16L54 5L52 26Q62 45 49 53Q30 63 12 51Z' },
    butterfly: { color: '#d68cbd', path: 'M30 26C6 -5 -6 32 23 35C-1 57 24 69 31 43C41 70 66 56 42 35C70 24 55 -7 34 26L36 8L30 8Z' },
    snail: { color: '#8cae54', path: 'M6 54L9 40L8 25L13 24L15 39L21 40A21 21 0 1 1 55 46L61 52Q36 63 6 54Z' },
    car: { color: '#638ed0', path: 'M5 27L15 25L23 12L43 12L52 26L60 29L60 46L53 46A7 7 0 0 1 39 46L24 46A7 7 0 0 1 10 46L5 46Z' },
    boat: { color: '#b67b4e', path: 'M5 40L29 40L29 7L57 36L35 36L35 40L60 40L48 56L17 56Z' },
    rocket: { color: '#b5a44b', path: 'M22 39L8 52L12 32L23 25Q24 10 33 3Q44 12 45 26L55 33L59 52L44 40L41 48L36 48L32 61L27 48L22 48Z' },
    house: { color: '#cd815e', path: 'M3 29L32 4L61 29L53 29L53 58L38 58L38 39L26 39L26 58L11 58L11 29Z' },
    star: { color: '#e0b25b', path: 'M32 3L41 22L61 25L46 40L50 61L32 51L13 61L17 40L2 25L23 22Z' },
    heart: { color: '#d65b87', path: 'M32 58C-21 25 12 -9 32 15C53 -9 85 25 32 58Z' },
    moon: { color: '#7d87b4', path: 'M45 4A29 29 0 1 0 58 47A28 28 0 0 1 45 4Z' },
    umbrella: { color: '#66a58a', path: 'M4 32Q6 8 30 7L30 3L35 3L35 7Q58 9 61 32L52 27L43 32L35 28L35 51Q33 65 21 56L24 51Q30 56 30 49L30 28L21 32L12 27Z' }
};
export function motifSvg(motif: Motif, shadow = false, locale: Locale = 'fr'): string {
    const drawing = drawings[motif];
    return svg(`<path fill="${shadow ? '#354e41' : drawing.color}" stroke="#58443b" stroke-width="2" stroke-linejoin="round" d="${drawing.path}"/>`).replace('aria-hidden="true"', `data-motif="${motif}" role="img" aria-label="${names[locale][motif]}"`);
}
export function cardBack(): string { return svg('<rect x="3" y="3" width="58" height="58" rx="12" fill="#e6dbf0"/><path fill="#f5ce6b" stroke="#8c729e" stroke-width="2" d="M32 10L38 25L54 26L42 37L46 53L32 44L18 53L22 37L10 26L26 25Z"/><circle cx="12" cy="12" r="2" fill="#8c729e"/><circle cx="52" cy="52" r="2" fill="#8c729e"/>'); }
