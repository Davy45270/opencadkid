import type { Color, Piece, Shape } from '../../engines/formes';
import type { Locale } from '../../shell/i18n';
export const shapeNames: Record<Locale, Record<Shape, string>> = {
    fr: { rond: 'rond', carre: 'carré', triangle: 'triangle', rectangle: 'rectangle', etoile: 'étoile', coeur: 'cœur', losange: 'losange', ovale: 'ovale' },
    en: { rond: 'circle', carre: 'square', triangle: 'triangle', rectangle: 'rectangle', etoile: 'star', coeur: 'heart', losange: 'diamond', ovale: 'oval' }
};
export const colorNames: Record<Locale, Record<Color, readonly [string, string]>> = {
    fr: { rouge: ['rouge', 'rouge'], bleu: ['bleu', 'bleue'], jaune: ['jaune', 'jaune'], vert: ['vert', 'verte'], orange: ['orange', 'orange'], violet: ['violet', 'violette'], rose: ['rose', 'rose'], marron: ['marron', 'marron'] },
    en: { rouge: ['red', 'red'], bleu: ['blue', 'blue'], jaune: ['yellow', 'yellow'], vert: ['green', 'green'], orange: ['orange', 'orange'], violet: ['purple', 'purple'], rose: ['pink', 'pink'], marron: ['brown', 'brown'] }
};
export const fills: Record<Color, string> = { rouge: '#ce3449', bleu: '#287cc1', jaune: '#f4d442', vert: '#30834c', orange: '#ef8a28', violet: '#8246a5', rose: '#ec86b1', marron: '#805338' };
export const paths: Record<Shape, string> = {
    rond: 'M32 4A28 28 0 1 1 32 60A28 28 0 1 1 32 4Z', carre: 'M5 5H59V59H5Z', triangle: 'M32 4L60 59L4 59Z', rectangle: 'M4 8H60V56H4Z',
    etoile: 'M32 4L40 23L60 25L45 39L49 60L32 49L15 60L19 39L4 25L24 23Z', coeur: 'M32 59C-15 29 7 -7 32 15C57 -7 79 29 32 59Z',
    losange: 'M32 3L60 32L32 61L4 32Z', ovale: 'M32 8A29 24 0 1 1 32 56A29 24 0 1 1 32 8Z'
};
export function name(piece: Piece, locale: Locale, generic = false, withSize = false): string {
    const feminine = generic || piece.shape === 'etoile';
    const noun = generic ? locale === 'fr' ? 'forme' : 'shape' : shapeNames[locale][piece.shape];
    if (locale === 'en') return `the ${withSize ? piece.size === 'petit' ? 'small ' : 'large ' : ''}${colorNames.en[piece.color][0]} ${noun}`;
    const article = !generic && (piece.shape === 'etoile' || piece.shape === 'ovale') && !withSize ? 'l’' : feminine ? 'la ' : 'le ';
    return `${article}${withSize ? piece.size === 'petit' ? feminine ? 'petite ' : 'petit ' : feminine ? 'grande ' : 'grand ' : ''}${noun} ${colorNames.fr[piece.color][feminine ? 1 : 0]}`;
}
export function shapeSvg(piece: Piece, locale: Locale = 'fr', outline = false): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" data-shape="${piece.shape}" data-color="${piece.color}" data-size="${piece.size}" role="img" aria-label="${name(piece, locale, false, true)}"><path d="${paths[piece.shape]}" fill="${outline ? 'none' : fills[piece.color]}" stroke="#403c39" stroke-width="3" stroke-linejoin="round"/></svg>`;
}
