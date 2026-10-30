import type { Item } from '../../engines/suites';
import type { Locale } from '../../shell/i18n';
import { volume } from '../../ui/illustration';
export const colorNames = {
    fr: { rouge: 'rouge', bleu: 'bleu', jaune: 'jaune', vert: 'vert', violet: 'violet', orange: 'orange' },
    en: { rouge: 'red', bleu: 'blue', jaune: 'yellow', vert: 'green', violet: 'purple', orange: 'orange' }
};
export const shapeNames = {
    fr: { perle: 'perle', triangle: 'triangle', carre: 'carré', fleur: 'fleur', etoile: 'étoile', lune: 'lune', points: 'points' },
    en: { perle: 'bead', triangle: 'triangle', carre: 'square', fleur: 'flower', etoile: 'star', lune: 'moon', points: 'dots' }
};
export const fills = { rouge: '#e96c64', bleu: '#638ed0', jaune: '#eac34b', vert: '#8cae54', violet: '#9a80bf', orange: '#ed9145' };
const paths = {
    perle: 'M32 5A27 27 0 1 0 32 59A27 27 0 1 0 32 5ZM32 25A7 7 0 1 1 32 39A7 7 0 1 1 32 25Z',
    triangle: 'M32 5L59 57H5Z', carre: 'M6 6H58V58H6Z',
    fleur: 'M32 20C8 -8 -8 28 20 32C-8 56 28 72 32 44C56 72 72 36 44 32C72 8 36 -8 32 20Z',
    etoile: 'M32 3L41 22L61 25L46 40L50 60L32 50L14 60L18 40L3 25L23 22Z',
    lune: 'M43 5A28 28 0 1 0 58 46A27 27 0 0 1 43 5Z'
};
export function name(item: Item, locale: Locale): string { return item.shape === 'points' ? `${item.dots} ${shapeNames[locale].points}` : `${shapeNames[locale][item.shape]}, ${colorNames[locale][item.color]}`; }
export function itemSvg(item: Item, locale: Locale = 'fr'): string {
    // Diagonal first pair keeps even two dots legible in both dimensions.
    // The single dot fills the same visual area as the other silhouettes.
    const body = item.shape === 'points' ? Array.from({ length: item.dots }, (_, i) => `<circle cx="${item.dots === 1 ? 32 : [10, 54, 54, 10, 32, 32, 10, 54][i]}" cy="${item.dots === 1 ? 32 : [10, 54, 10, 54, 32, 10, 32, 32][i]}" r="${item.dots === 1 ? 26 : 7}" fill="${fills[item.color]}" stroke="#354e41" stroke-width="2"/>`).join('') : `<path d="${paths[item.shape]}" fill="${fills[item.color]}" fill-rule="evenodd" stroke="#354e41" stroke-width="2" stroke-linejoin="round"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 62 62" role="img" aria-label="${name(item, locale)}">${volume(body)}</svg>`;
}
export const pictogram = itemSvg({ shape: 'fleur', color: 'violet', dots: 0 });
