import type { Locale } from '../../shell/i18n';
export interface Word { word: string; initial: string; motif: string }
// Native lists: identifiers name drawings, never translated questions.
export const lexicon: Record<Locale, readonly Word[]> = {
    fr: [
        { word: 'abeille', initial: 'A', motif: 'bee' }, { word: 'arbre', initial: 'A', motif: 'tree' }, { word: 'avion', initial: 'A', motif: 'plane' },
        { word: 'banane', initial: 'B', motif: 'banana' }, { word: 'bateau', initial: 'B', motif: 'boat' }, { word: 'ballon', initial: 'B', motif: 'ball' },
        { word: 'carotte', initial: 'C', motif: 'carrot' }, { word: 'cadeau', initial: 'C', motif: 'gift' }, { word: 'cube', initial: 'C', motif: 'cube' },
        { word: 'dé', initial: 'D', motif: 'dice' }, { word: 'domino', initial: 'D', motif: 'domino' }, { word: 'dauphin', initial: 'D', motif: 'dolphin' },
        { word: 'écharpe', initial: 'E', motif: 'scarf' }, { word: 'échelle', initial: 'E', motif: 'ladder' }, { word: 'étoile', initial: 'E', motif: 'star' },
        { word: 'fusée', initial: 'F', motif: 'rocket' }, { word: 'fleur', initial: 'F', motif: 'flower' }, { word: 'fourmi', initial: 'F', motif: 'ant' },
        { word: 'gâteau', initial: 'G', motif: 'cake' }, { word: 'gomme', initial: 'G', motif: 'eraser' }, { word: 'gorille', initial: 'G', motif: 'gorilla' },
        { word: 'île', initial: 'I', motif: 'island' }, { word: 'igloo', initial: 'I', motif: 'igloo' }, { word: 'iris', initial: 'I', motif: 'iris' },
        { word: 'jaguar', initial: 'J', motif: 'jaguar' }, { word: 'jupe', initial: 'J', motif: 'skirt' }, { word: 'journal', initial: 'J', motif: 'newspaper' },
        { word: 'lune', initial: 'L', motif: 'moon' }, { word: 'lapin', initial: 'L', motif: 'rabbit' }, { word: 'livre', initial: 'L', motif: 'book' },
        { word: 'moto', initial: 'M', motif: 'motorcycle' }, { word: 'melon', initial: 'M', motif: 'melon' }, { word: 'mouton', initial: 'M', motif: 'sheep' },
        { word: 'navire', initial: 'N', motif: 'ship' }, { word: 'nid', initial: 'N', motif: 'nest' }, { word: 'nuage', initial: 'N', motif: 'cloud' },
        { word: 'olive', initial: 'O', motif: 'olive' }, { word: 'orange', initial: 'O', motif: 'orange' }, { word: 'oreiller', initial: 'O', motif: 'pillow' },
        { word: 'pomme', initial: 'P', motif: 'apple' }, { word: 'poisson', initial: 'P', motif: 'fish' }, { word: 'papillon', initial: 'P', motif: 'butterfly' },
        { word: 'robe', initial: 'R', motif: 'dress' }, { word: 'rat', initial: 'R', motif: 'rat' }, { word: 'robot', initial: 'R', motif: 'robot' },
        { word: 'sac', initial: 'S', motif: 'bag' }, { word: 'savon', initial: 'S', motif: 'soap' }, { word: 'seau', initial: 'S', motif: 'bucket' },
        { word: 'tortue', initial: 'T', motif: 'turtle' }, { word: 'tomate', initial: 'T', motif: 'tomato' }, { word: 'toupie', initial: 'T', motif: 'top' },
        { word: 'usine', initial: 'U', motif: 'factory' }, { word: 'ustensile', initial: 'U', motif: 'spatula' }, { word: 'ukulélé', initial: 'U', motif: 'ukulele' },
        { word: 'vache', initial: 'V', motif: 'cow' }, { word: 'vélo', initial: 'V', motif: 'bicycle' }, { word: 'voiture', initial: 'V', motif: 'car' },
        { word: 'zèbre', initial: 'Z', motif: 'zebra' }, { word: 'zéro', initial: 'Z', motif: 'zero' }, { word: 'zoo', initial: 'Z', motif: 'zoo' },
    ],
    en: [
        { word: 'banana', initial: 'B', motif: 'banana' }, { word: 'boat', initial: 'B', motif: 'boat' }, { word: 'ball', initial: 'B', motif: 'ball' },
        { word: 'cat', initial: 'C', motif: 'cat' }, { word: 'cup', initial: 'C', motif: 'cup' }, { word: 'cow', initial: 'C', motif: 'cow' },
        { word: 'dog', initial: 'D', motif: 'dog' }, { word: 'dice', initial: 'D', motif: 'dice' }, { word: 'dolphin', initial: 'D', motif: 'dolphin' },
        { word: 'fish', initial: 'F', motif: 'fish' }, { word: 'flower', initial: 'F', motif: 'flower' }, { word: 'fork', initial: 'F', motif: 'fork' },
        { word: 'goat', initial: 'G', motif: 'goat' }, { word: 'goose', initial: 'G', motif: 'goose' }, { word: 'gorilla', initial: 'G', motif: 'gorilla' },
        { word: 'hat', initial: 'H', motif: 'hat' }, { word: 'hen', initial: 'H', motif: 'hen' }, { word: 'horse', initial: 'H', motif: 'horse' },
        { word: 'jam', initial: 'J', motif: 'jam' }, { word: 'jug', initial: 'J', motif: 'jug' }, { word: 'jellyfish', initial: 'J', motif: 'jellyfish' },
        { word: 'kite', initial: 'K', motif: 'kite' }, { word: 'key', initial: 'K', motif: 'key' }, { word: 'kangaroo', initial: 'K', motif: 'kangaroo' },
        { word: 'lion', initial: 'L', motif: 'lion' }, { word: 'leaf', initial: 'L', motif: 'leaf' }, { word: 'lemon', initial: 'L', motif: 'lemon' },
        { word: 'moon', initial: 'M', motif: 'moon' }, { word: 'mouse', initial: 'M', motif: 'mouse' }, { word: 'monkey', initial: 'M', motif: 'monkey' },
        { word: 'nest', initial: 'N', motif: 'nest' }, { word: 'net', initial: 'N', motif: 'net' }, { word: 'nut', initial: 'N', motif: 'nut' },
        { word: 'pineapple', initial: 'P', motif: 'pineapple' }, { word: 'pig', initial: 'P', motif: 'pig' }, { word: 'panda', initial: 'P', motif: 'panda' },
        { word: 'queen', initial: 'Q', motif: 'queen' }, { word: 'quilt', initial: 'Q', motif: 'quilt' }, { word: 'quill', initial: 'Q', motif: 'quill' },
        { word: 'rabbit', initial: 'R', motif: 'rabbit' }, { word: 'rat', initial: 'R', motif: 'rat' }, { word: 'robot', initial: 'R', motif: 'robot' },
        { word: 'sun', initial: 'S', motif: 'sun' }, { word: 'sock', initial: 'S', motif: 'sock' }, { word: 'seal', initial: 'S', motif: 'seal' },
        { word: 'turtle', initial: 'T', motif: 'turtle' }, { word: 'tomato', initial: 'T', motif: 'tomato' }, { word: 'tiger', initial: 'T', motif: 'tiger' },
        { word: 'van', initial: 'V', motif: 'van' }, { word: 'vest', initial: 'V', motif: 'vest' }, { word: 'vase', initial: 'V', motif: 'vase' },
        { word: 'web', initial: 'W', motif: 'web' }, { word: 'wig', initial: 'W', motif: 'wig' }, { word: 'wagon', initial: 'W', motif: 'wagon' },
        { word: 'yarn', initial: 'Y', motif: 'yarn' }, { word: 'yak', initial: 'Y', motif: 'yak' }, { word: 'yoyo', initial: 'Y', motif: 'yoyo' },
        { word: 'zebra', initial: 'Z', motif: 'zebra' }, { word: 'zip', initial: 'Z', motif: 'zip' }, { word: 'zucchini', initial: 'Z', motif: 'zucchini' },
    ],
};
export const soundTable: Record<Locale, Readonly<Record<string, string>>> = {
    fr: { A: 'a', B: 'beu', C: 'keu', D: 'deu', E: 'é', F: 'fff', G: 'gueu', I: 'i', J: 'jjj', L: 'lll', M: 'mmm', N: 'nnn', O: 'o', P: 'peu', R: 'rrr', S: 'sss', T: 'teu', U: 'u', V: 'vvv', Z: 'zzz' },
    en: { B: 'buh', C: 'kuh', D: 'duh', F: 'fff', G: 'guh', H: 'huh', J: 'juh', K: 'kuh', L: 'lll', M: 'mmm', N: 'nnn', P: 'puh', Q: 'kwuh', R: 'rrr', S: 'sss', T: 'tuh', V: 'vvv', W: 'wuh', Y: 'yuh', Z: 'zzz' }
};
export function phoneme(letter: string, locale: Locale): string {
    const sound = soundTable[locale][letter.toUpperCase()];
    if (!sound) throw new RangeError('Unsupported letter');
    return sound;
}
