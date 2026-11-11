/** Scenes of « La grille de CaliRoux ». Each level is a small grid written by hand: a title CaliRoux says, one strong moment
 * no other scene repeats, a theme of pictures, and the grid, one string per row from the top. One character per cell: a
 * letter `a` to `f` is a picture of the theme, `.` an empty cell. A small grid of four uses four of the six pictures,
 * with squares of 2 × 2; the big grid of six (the last scenes only) uses all six, with squares of 2 × 3.
 * Every grid has exactly one way to be filled, found by looking only (`reading` in index.ts proves it). New things come
 * one at a time, each the only new thing of its first scene, before they are combined. tests/grille.test.ts checks every
 * rule. The list is final: it never changes under a player. The grids were searched offline, then chosen and ordered by
 * hand. */
export const features = ['ligne', 'colonne', 'carre', 'croise', 'plusieurs', 'six'] as const;
export type Feature = typeof features[number];
export const themes = ['fruits', 'animaux', 'formes'] as const;
export type Theme = typeof themes[number];
/** The pictures of each theme, letters a to f. */
export const IMAGES: Readonly<Record<Theme, readonly string[]>> = {
    fruits: ['pomme', 'banane', 'fraise', 'raisin', 'orange', 'poire'],
    animaux: ['chat', 'chien', 'lapin', 'poisson', 'oiseau', 'tortue'],
    formes: ['rond', 'carre', 'triangle', 'etoile', 'coeur', 'lune']
};
export interface LevelDef { id: number; title: { fr: string; en: string }; moment: string; theme: Theme; rows: readonly string[] }
type Scene = Omit<LevelDef, 'id'>;
const say = (fr: string, en: string, moment: string, theme: Theme, ...rows: string[]): Scene => ({ title: { fr, en }, moment, theme, rows });
const scenes: readonly Scene[] = [
    say('Il manque un fruit', 'One fruit missing', 'A single empty cell: the grapes are the only fruit missing from its row, its column and its square.', 'fruits',
        'dbac', 'cabd', 'bc.a', 'adcb'),
    say('Où est le chat ?', 'Where is the cat?', 'The cat is the only animal not yet in the bottom corner.', 'animaux',
        'beac', 'acbe', 'caeb', 'ebc.'),
    say('Deux trous', 'Two gaps', 'Two empty cells far apart, each with its own missing shape: the triangle at the top, the star below.', 'formes',
        'dab.', 'cbda', 'bca.', 'adcb'),
    say('La ligne de fruits', 'The fruit row', 'Two cells empty in the same column: only their rows tell which fruit goes where.', 'fruits',
        'ac.b', 'db.a', 'cabd', 'bdac'),
    say('Chacun sa ligne', 'A row each', 'Three rows each miss one animal: the fish, the dog, then the fish again.', 'animaux',
        'f.ab', 'a.df', 'bafd', '.fba'),
    say('De haut en bas', 'Top to bottom', 'Two cells side by side on the bottom row: each column, read downwards, gives its shape.', 'formes',
        'bdac', 'cabd', 'dbca', 'ac..'),
    say('La colonne des fruits', 'The fruit column', 'Three cells in two columns: read each column from top to bottom.', 'fruits',
        'ec.a', 'dace', '..ec', 'cead'),
    say('Le carré des animaux', 'The animal square', 'The coloured squares come in: each square already holds three animals and misses one.', 'animaux',
        'abdc', '.ca.', 'bdc.', 'cabd'),
    say('Quatre carrés', 'Four squares', 'Four empty cells, one in each coloured square: each square misses a different shape.', 'formes',
        'e.f.', 'bfec', 'cebf', 'f.c.'),
    say('La ligne ou la colonne', 'Row or column', 'Some cells are found along their row, others down their column.', 'fruits',
        '.b.a', 'adb.', 'bcad', 'dac.'),
    say('Les trois regards', 'Three ways to look', 'A row, a column and a square: each empty cell is found by one of the three.', 'animaux',
        '.aeb', 'e.a.', '.efa', 'afb.'),
    say('À la croisée', 'At the crossing', 'At the bottom, the row has the star, the column has the heart: only the triangle is left.', 'formes',
        'fecd', 'c.fe', '.fdc', 'd..f'),
    say('Ligne et colonne ensemble', 'Row and column together', 'The fruit at the end of the third row is found by crossing its row and its column.', 'fruits',
        'acdb', 'bda.', '.ab.', 'db.a'),
    say('Trois en colonne', 'Three down', 'Three animals missing down the first column: the column alone cannot tell, look along each row too.', 'animaux',
        'badc', '.dab', '.bca', '.cb.'),
    say('Croiser dans le carré', 'Crossing in the square', 'The star at the end of the third row: neither its row nor its column is nearly full, so cross them.', 'formes',
        'adfc', 'f.d.', '.fa.', 'da.f'),
    say('Le coin des fruits', 'The fruit corner', 'Two fruits missing side by side in the top corner: crossing tells them apart.', 'fruits',
        '..df', 'fd.c', 'bfc.', '.cfb'),
    say('Le coin vide', 'The empty corner', 'The bottom right corner is empty: it fills from the outside in, one shape after the other.', 'formes',
        'dce.', 'ebcd', 'c.b.', 'b...'),
    say('Le damier', 'The checkerboard', 'Empty cells scattered like a checkerboard: one fruit put in shows the next.', 'fruits',
        'd.b.', '.cad', 'c.d.', '.dc.'),
    say('L’un après l’autre', 'One after another', 'The first animal put in opens the way: then the next one can be seen.', 'animaux',
        '...d', 'd..b', '.dbc', 'bcda'),
    say('Le toit vide', 'The empty roof', 'The whole top row is empty: the rows below fill it, one shape after the other.', 'formes',
        '....', '.afc', '..a.', 'afce'),
    say('Les escaliers', 'The stairs', 'More than half the grid is empty: the animals come one after the other, like steps.', 'animaux',
        'ba..', '.d.b', '.b.c', '..b.'),
    say('Dix cases vides', 'Ten empty cells', 'The emptiest small grid: ten fruits to find, in three waves, a whole row empty.', 'fruits',
        '..d.', '....', 'f.b.', '.bfe'),
    say('La grande grille', 'The big grid', 'Six animals and six cells in each row: the big grid, with two easy holes.', 'animaux',
        'dbfcea', 'a.edb.', 'bdaefc', 'fecadb', 'eabfcd', 'cfdbae'),
    say('Six formes en ligne', 'Six shapes in a row', 'Two cells in the same column of the big grid: each row of six says its shape.', 'formes',
        'deb.ac', 'acf.be', 'cfaedb', 'bdecfa', 'facbed', 'ebdac.'),
    say('Six fruits en colonne', 'Six fruits down', 'Read a long column of six fruits to find the missing one.', 'fruits',
        '.a.bde', 'dbe.cf', 'fedcab', 'bcaefd', 'afbde.', 'edcfba'),
    say('Le grand carré', 'The big square', 'The squares of the big grid are two rows of three: one tortoise is found by its square alone.', 'animaux',
        '.acdbf', 'fdbcea', 'aefbcd', 'bc..ae', 'dba.fc', 'cfeadb'),
    say('La dernière colonne', 'The last column', 'The last column misses three shapes: rows and columns share the work.', 'formes',
        'dacbef', 'febdac', 'bdafc.', 'c..abd', 'ebfcd.', 'acdef.'),
    say('Croiser en grand', 'Crossing in big', 'In the big grid, one fruit is found only by crossing its row and its column.', 'fruits',
        'cfe.db', 'b.dc.f', 'ecabfd', 'fdbe.a', 'aefdbc', '.bcfae'),
    say('Le grand zoo', 'The big zoo', 'Two animals missing from the second row, and one tortoise found only by crossing.', 'animaux',
        'abedfc', '.dcb.e', 'cfdeba', 'beacdf', 'dc.ae.', 'ea.fcd'),
    say('Les formes en chaîne', 'Shapes in a chain', 'In the big grid, one shape put in shows the next one.', 'formes',
        'ba.f.c', 'fcdbea', 'dbf.ce', 'ceadbf', '.fbc.d', '.dc.fb'),
    say('Le marché', 'The market', 'Eight fruits to put away, spread over the whole big grid.', 'fruits',
        'a.dbf.', 'cbfaed', 'bdafc.', 'efcd.a', 'fa..db', 'd.b.af'),
    say('La ferme', 'The farm', 'Nine animals to bring home to the farm, from the top to the bottom.', 'animaux',
        'cbde.f', 'eafbdc', '.ebcf.', '.fc.e.', 'f.adbe', 'bd.fc.'),
    say('Le grand tableau', 'The big painting', 'The bottom right corner of the big grid is empty: three shapes in a row to find.', 'formes',
        'e.bad.', 'fa.bce', 'adcef.', 'b.e.a.', 'dba...', 'cefdba'),
    say('La fête des fruits', 'The fruit party', 'The last grid: ten fruits, and every way of looking at once, for the big party.', 'fruits',
        'fcba.d', '...cbf', 'dfebac', '..cd.e', 'cb.eda', 'e..fcb')
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => ({ id: i + 1, ...s }));
