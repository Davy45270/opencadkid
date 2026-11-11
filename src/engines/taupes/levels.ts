/** Scenes of « Les taupes de Tutu », written by hand. A scene is a little garden of rows read top to bottom:
 *   `.` a clod of earth with no mole under it (to open), `T` a sleeping mole, `#` a rock (nothing to dig, never a mole),
 *   `o` a clod already open when the scene starts (the first zone: a child never starts blind).
 * Gardens are 3 × 3 up to 6 × 6, as tall as they are wide or taller. Every scene is proved without a guess from its first
 * open zone (tests/taupes.test.ts). The list is final: it never changes under a player. */
export const features = ['deux', 'zero', 'croise', 'grand', 'rocher'] as const;
export type Feature = typeof features[number];
export interface LevelDef { id: number; title: { fr: string; en: string }; moment: string; rows: readonly string[] }
export const handLevels: readonly LevelDef[] = [
    { id: 1, title: { fr: 'Une taupe dort', en: 'A mole is asleep' }, moment: 'the first mole, in the corner, two clods to open', rows: ['ooo', 'oo.', 'o.T'] },
    { id: 2, title: { fr: 'La taupe d’en haut', en: 'The mole up top' }, moment: 'a mole near the top, flowers all around it', rows: ['oo.', 'oT.', 'ooo', 'ooo'] },
    { id: 3, title: { fr: 'Deux taupes', en: 'Two moles' }, moment: 'two moles in opposite corners', rows: ['oT.', 'oo.', 'ooo', 'Too'] },
    { id: 4, title: { fr: 'Une carotte !', en: 'A carrot!' }, moment: 'the carrot comes in: a mole plain to see', rows: ['ooo', 'ooo', 'oTo', '.o.'] },
    { id: 5, title: { fr: 'L’une sur l’autre', en: 'One above the other' }, moment: 'two moles one above the other', rows: ['ooo.', 'ooT.', 'ooT.', 'oooo'] },
    { id: 6, title: { fr: 'Zéro taupe ici', en: 'No mole here' }, moment: 'a clod with no mole around opens the whole row', rows: ['ooo', 'ooo', 'Too', '...'] },
    { id: 7, title: { fr: 'Le côté droit', en: 'The right side' }, moment: 'two moles down the right side, the clods open by themselves', rows: ['o...', 'oo..', 'oo.T', 'oo.T'] },
    { id: 8, title: { fr: 'Deux fleurs à croiser', en: 'Two flowers to cross' }, moment: 'one mole between two flowers that point at it together', rows: ['ooo', 'ooo', '.T.', 'ooo'] },
    { id: 9, title: { fr: 'Les deux bouts', en: 'Both ends' }, moment: 'two moles at both ends of a column, found by crossing', rows: ['.Too', '..oo', '..oo', '.Too'] },
    { id: 10, title: { fr: 'Un grand jardin', en: 'A big garden' }, moment: 'the garden grows: a single mole in a big lawn', rows: ['oo..', 'ooT.', 'oooo', 'oooo', 'oooo'] },
    { id: 11, title: { fr: 'Trois dormeuses', en: 'Three sleepers' }, moment: 'three moles, the first time', rows: ['oooo', 'ToTo', 'ooo.', 'oT..', 'o...'] },
    { id: 12, title: { fr: 'Un rocher !', en: 'A rock!' }, moment: 'a rock comes in, next to the mole', rows: ['..oo', '.T#o', 'oooo', 'oooo'] },
    { id: 13, title: { fr: 'Le rocher et la file', en: 'The rock and the queue' }, moment: 'three moles queuing beside a rock', rows: ['ooT.', 'o#T.', 'oo..', 'ooTo', 'ooo.'] },
    { id: 14, title: { fr: 'Le rocher du haut', en: 'The rock up top' }, moment: 'a rock on the top row, two moles to cross', rows: ['.#..', 'T..T', 'oooo', 'oooo'] },
    { id: 15, title: { fr: 'Côte à côte', en: 'Side by side' }, moment: 'two moles side by side in the middle', rows: ['.To.', '.oo.', 'ooTT', '.ooo', '.ooo'] },
    { id: 16, title: { fr: 'Le jardin carré', en: 'The square garden' }, moment: 'the first five by five garden', rows: ['oT...', 'oooo.', 'oooTo', 'ooo..', 'oooT.'] },
    { id: 17, title: { fr: 'Deux rochers', en: 'Two rocks' }, moment: 'two rocks, two moles together on the left', rows: ['.o...', 'TTo..', 'o#oo.', 'oooTo', 'oo#..'] },
    { id: 18, title: { fr: 'Le jardin tout en long', en: 'The long garden' }, moment: 'a long garden, three moles at its two ends', rows: ['ooTo', 'oooo', 'oooo', 'oooo', 'T..T', '....'] },
    { id: 19, title: { fr: 'Quatre taupes', en: 'Four moles' }, moment: 'four moles, three of them at the bottom', rows: ['ooToo', 'oooo.', 'ooo..', 'ooT..', '.T.T.'] },
    { id: 20, title: { fr: 'La taupe aux rochers', en: 'The mole by the rocks' }, moment: 'a mole hidden between two rocks', rows: ['.o#oo', 'oTooo', 'T#ooo', '.oooo', '..oo.', '..TT.'] },
    { id: 21, title: { fr: 'Le zigzag', en: 'The zigzag' }, moment: 'four moles drawing a zigzag', rows: ['ooooo', 'ooooo', 'ooooo', 'T.T.T', '...T.', '.....'] },
    { id: 22, title: { fr: 'Trois en ligne', en: 'Three in a row' }, moment: 'three moles in a row against a rock', rows: ['.....', '.TTT#', '#o#oo', 'ooooo', 'ooooo'] },
    { id: 23, title: { fr: 'Cinq taupes', en: 'Five moles' }, moment: 'five moles for the first time', rows: ['.oo.o', 'TTooT', '.Too.', '..ooo', 'Tooo.', '.....'] },
    { id: 24, title: { fr: 'Le plus grand jardin', en: 'The biggest garden' }, moment: 'the first six by six garden', rows: ['..oT..', '.ooTT.', '.oooo.', '.ooo.T', '.oooo.', 'o.ooT.'] },
    { id: 25, title: { fr: 'Le coin des rochers', en: 'The rocky corner' }, moment: 'two rocks in the top left corner', rows: ['#..oo', '#.Too', '.Tooo', '..ooo', '..T#o', '..Too'] },
    { id: 26, title: { fr: 'Les rochers du bas', en: 'The rocks below' }, moment: 'two rocks on the fifth row, three moles at the bottom', rows: ['ooooo.', 'oooooT', 'ooooo.', 'oToT..', '.#.o.#', 'T..T..'] },
    { id: 27, title: { fr: 'Le couloir', en: 'The corridor' }, moment: 'a narrow garden with a rock at both ends of the bottom', rows: ['..T.', '....', 'T.T.', 'Tooo', 'oooo', '#oo#'] },
    { id: 28, title: { fr: 'Six taupes', en: 'Six moles' }, moment: 'six moles, three of them in a corner', rows: ['..oo..', 'oooooT', 'oooToo', '.oTooo', '.TTooo', '...ooT'] },
    { id: 29, title: { fr: 'Quatre rochers', en: 'Four rocks' }, moment: 'four rocks around the garden', rows: ['T.T..', '#....', '..#oT', 'Tooo.', 'oooT.', '#oo#.'] },
    { id: 30, title: { fr: 'Le grand chantier', en: 'The great dig' }, moment: 'six moles and three rocks in the biggest garden', rows: ['.T.T..', '#..#..', '.oT...', 'Tooo..', 'oooo.T', 'ooooT#'] },
    { id: 31, title: { fr: 'Le jardin secret', en: 'The secret garden' }, moment: 'six moles to find by crossing, no clod opens by itself', rows: ['.T.Too', '#.oo#o', '.Toooo', '..oooo', 'T..oT.', '.T.oo.'] },
    { id: 32, title: { fr: 'La grande fête', en: 'The big party' }, moment: 'seven moles and four rocks: the biggest party', rows: ['.#.T..', '.TTo.#', '..oo#T', '#.oooo', '.ToooT', '.Toooo'] }
];
