/** Scenes of « Les cubes de Lumi ». Each level is a short scene written by hand: a title Lumi says, one strong moment that
 * no other scene repeats, the well, the pieces in the order they come, and its goals.
 *
 * `rows` draws the well from the top, one character per cell; what is in a column always rests on what is under it:
 *   `.` empty   `u d t c k T L r` a cube already there, in the colour of that piece (`r`: a rainbow cube)
 *   `p` a stone cube   `A` a friend stuck under the cubes (the chick): its row flying away sets it free
 * `pieces` is the order the pieces come in, again and again: `u` one cube, `d` two, `t` three in a line, `c` a corner of
 * three, `k` a square of four, `T` and `L` four cubes, `a` the rainbow cube (it fills the hole it is dropped in),
 * `b` the candy cube (its whole column flies away).
 * `goal` is how many rows to make fly away (0: none); `silhouette` is a drawing at the bottom of the well (`y` rows up) to light up;
 * a friend `A` is to set free. `rotate` gives the big turn button; `cloud` puts a little cloud on top of a column, that
 * floats one column further after each piece.
 * New things come one at a time, each alone in a scene (with only what it needs) before they are combined.
 * `problems()` in index.ts and tests/empilo.test.ts check every rule. The list is final: it never changes under a player. */
export const features = ['deux', 'trois', 'tourner', 'rangee', 'silhouette', 'quatre', 'ami', 'nuage', 'arc', 'bonbon'] as const;
export type Feature = typeof features[number];
export const silhouettes = ['maison', 'bateau', 'coeur', 'sapin', 'fusee', 'champignon', 'poisson', 'chateau', 'etoile', 'fleur'] as const;
export type SilhouetteName = typeof silhouettes[number];
/** The drawings, one string per row from the top: `#` a cell to light up. */
export const PATTERNS: Readonly<Record<SilhouetteName, readonly string[]>> = {
    maison: ['.##.', '####', '####', '####'],
    bateau: ['..#..', '..##.', '#####', '.###.'],
    coeur: ['##.##', '#####', '.###.', '..#..'],
    sapin: ['..#..', '.###.', '#####', '..#..'],
    fusee: ['.#.', '###', '###', '#.#'],
    champignon: ['.###.', '#####', '..#..'],
    poisson: ['.##.#', '#####', '.##.#'],
    chateau: ['#.#.#', '#####', '##.##'],
    etoile: ['..#..', '#####', '.###.', '.#.#.'],
    fleur: ['.#.', '###', '.#.', '.#.']
};
export interface LevelDef {
    id: number; title: { fr: string; en: string }; moment: string;
    rows: readonly string[]; pieces: string; goal: number; rotate: boolean;
    cloud?: { x: number; dir: 1 | -1 }; silhouette?: { name: SilhouetteName; x: number; y?: number };
}
type Scene = Omit<LevelDef, 'id'>;
interface Extra { rotate?: boolean; cloud?: { x: number; dir: 1 | -1 }; silhouette?: { name: SilhouetteName; x: number; y?: number } }
const say = (fr: string, en: string, moment: string, pieces: string, goal: number, extra: Extra, ...rows: string[]): Scene =>
    ({ title: { fr, en }, moment, rows, pieces, goal, rotate: Boolean(extra.rotate), ...(extra.cloud ? { cloud: extra.cloud } : {}), ...(extra.silhouette ? { silhouette: extra.silhouette } : {}) });
const empty = (w: number, h: number): string[] => Array.from({ length: h }, () => '.'.repeat(w));
/** An empty well whose last rows are given. */
const well = (w: number, h: number, ...bottom: string[]): string[] => [...empty(w, h - bottom.length), ...bottom];
const scenes: readonly Scene[] = [
    say('Un cube, deux cubes', 'One cube, two cubes', 'Three little columns and single cubes: the very first full row turns rainbow and flies away as butterflies.', 'u', 2, {},
        ...empty(3, 5)),
    say('La tour de Lumi', 'Lumi’s tower', 'Four columns to fill one cube at a time before a row can fly.', 'u', 4, {},
        ...empty(4, 7)),
    say('Les dominos', 'Dominoes', 'Two cubes holding hands: a domino covers two columns at once.', 'dud', 3, {},
        ...empty(4, 6)),
    say('Le petit train', 'The little train', 'A train of three cubes lies across three columns, then a little corner.', 'tuc', 3, {},
        ...empty(5, 6)),
    say('Tout se mélange', 'All mixed up', 'Ones, twos and threes take turns: the swap button picks the one that fits.', 'udtcu', 4, {},
        ...empty(5, 7)),
    say('Le domino debout', 'The standing domino', 'The big button turns the domino: standing up, it fills one column alone.', 'd', 4, { rotate: true },
        ...empty(3, 7)),
    say('Il manque un cube', 'One cube missing', 'A row waits with a single gap: one cube in the gap and the whole row flies.', 'u', 3, {},
        ...well(5, 6, 'tt.dd')),
    say('Trois d’un coup', 'Three at once', 'Three rows share the same gap: a standing train of three makes all three fly at once.', 'tud', 4, { rotate: true },
        ...well(5, 7, 'dd.uu', 'kk.cc', 'tt.TT')),
    say('La maison', 'The house', 'A house is drawn at the bottom of the well and lights up cube by cube.', 'u', 0, { silhouette: { name: 'maison', x: 0 } },
        ...empty(4, 7)),
    say('Le bateau', 'The boat', 'A boat with its sail: dominos and trains light up the hull in one go.', 'dtuc', 0, { silhouette: { name: 'bateau', x: 0 } },
        ...empty(6, 7)),
    say('Le carré', 'The square', 'A square of four cubes: two columns grow two cubes at a time.', 'kuk', 3, {},
        ...empty(4, 7)),
    say('Le T et le L', 'The T and the L', 'Turning the T and the L until they sit flat on the steps.', 'TLu', 4, { rotate: true },
        ...empty(5, 8)),
    say('Le poussin', 'The chick', 'A chick is stuck under grey stones: when its row flies, it is free.', 'u', 0, {},
        ...well(4, 6, '.p..', '.p..', '.A..')),
    say('Le cœur', 'The heart', 'A heart to light up, with a row almost full beside it.', 'dcu', 0, { silhouette: { name: 'coeur', x: 1 } },
        ...well(6, 7, 'u.....')),
    say('Le petit nuage', 'The little cloud', 'A little cloud floats from column to column; a cube dropped on it makes it sneeze.', 'u', 3, { cloud: { x: 1, dir: 1 } },
        ...empty(4, 6)),
    say('Deux poussins', 'Two chicks', 'Two chicks under the stones, one deeper than the other: every row that flies brings them down.', 'dut', 0, {},
        ...well(5, 7, 'p...p', 'A...p', 'p...A')),
    say('Le sapin', 'The fir tree', 'A fir tree with its trunk: the T turned upside down makes the top.', 'TcuL', 0, { rotate: true, silhouette: { name: 'sapin', x: 0 } },
        ...empty(6, 8)),
    say('L’arc-en-ciel', 'The rainbow', 'A deep hole between two towers: the rainbow cube fills it all the way up.', 'uua', 3, {},
        ...well(5, 7, 'tt.dd', 'tt.dd', 'tt.dd')),
    say('Le nuage et le poussin', 'The cloud and the chick', 'The cloud floats over the stones while the chick waits for its row.', 'du', 0, { cloud: { x: 3, dir: -1 } },
        ...well(5, 6, '..p..', '..A..')),
    say('Le bonbon', 'The candy', 'A tower of cubes far too tall: the candy cube makes the whole column fly away.', 'ubuuu', 2, {},
        ...well(3, 7, 'L..', 'L..', 'L..', 'L..', 'L..')),
    say('La fusée', 'The rocket', 'A rocket stands on its two feet and lights up up to its nose.', 'tuda', 0, { rotate: true, silhouette: { name: 'fusee', x: 1 } },
        ...well(5, 8, '....d')),
    say('Le champignon', 'The mushroom', 'A mushroom on one leg, with the cloud floating over its cap.', 'kdu', 0, { cloud: { x: 0, dir: 1 }, silhouette: { name: 'champignon', x: 0 } },
        ...empty(6, 7)),
    say('La pluie de cubes', 'Raining cubes', 'Every piece comes in turn, and six rows fly away one after the other.', 'udtckTL', 6, { rotate: true },
        ...empty(6, 8)),
    say('L’escalier', 'The staircase', 'A staircase of cubes: the rainbow cube fills each step to the top.', 'aud', 3, {},
        ...well(5, 7, '....u', '...du', '..tdu')),
    say('Le poussin et le bonbon', 'The chick and the candy', 'A chick under ordinary cubes: the candy lifts the whole column, chick and all.', 'cbd', 0, {},
        ...well(5, 7, '.t...', '.t...', '.A...', '.p...')),
    say('Le poisson', 'The fish', 'A fish with its tail swims at the bottom of the well while the cloud floats above.', 'Tdu', 0, { rotate: true, cloud: { x: 5, dir: -1 }, silhouette: { name: 'poisson', x: 0 } },
        ...empty(6, 8)),
    say('Le château', 'The castle', 'A castle with three towers and a door; its rows are almost full already.', 'Lkcu', 2, { rotate: true, silhouette: { name: 'chateau', x: 0, y: 1 } },
        ...well(6, 8, 'uu.ddt')),
    say('Le pont des poussins', 'The chicks’ bridge', 'Two chicks at both ends of a bridge of stones, and a rainbow to fill the middle.', 'udau', 0, {},
        ...well(6, 7, 'pp..pp', 'Ap..pA')),
    say('L’étoile', 'The star', 'A star with five points to light up, and a candy for the tower in the corner.', 'tbcud', 0, { rotate: true, silhouette: { name: 'etoile', x: 1 } },
        ...well(6, 8, 'k.....', 'k.....', 'k.....')),
    say('La fleur', 'The flower', 'A flower on its stem grows in the middle of the well among stones and a chick.', 'dTua', 0, { rotate: true, silhouette: { name: 'fleur', x: 2 } },
        ...well(6, 8, 'p....p', 'A....p')),
    say('La grande fête', 'The big party', 'The cloud, the rainbow and the candy all come to the party: six rows to fly.', 'Lacbutd', 6, { rotate: true, cloud: { x: 2, dir: 1 } },
        ...well(6, 8, 'TT.cc.')),
    say('Lumi et ses amis', 'Lumi and her friends', 'The last scene: a heart to light, a chick to free, the cloud, the rainbow and the candy together.', 'dacTbuk', 2, { rotate: true, cloud: { x: 5, dir: -1 }, silhouette: { name: 'coeur', x: 0 } },
        ...well(6, 8, '.....p', '.....A'))
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => ({ id: i + 1, ...s }));
