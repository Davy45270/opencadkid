/** Scenes of « Les bonbons de Lumi ». Each level is a short scene written by hand: a title Lumi says, one strong moment
 * that no other scene repeats, a board, the colours of its sweets and its goals.
 *
 * `rows` draws the board from the top, one character per cell:
 *   `.` a sweet (its colour is drawn from the scene's seed, never three in a row at the start)
 *   `#` a hole: the board takes a shape, sweets fall across it
 *   `A` a rainbow sweet (it goes with any colour)   `E` a wrapped sweet (it jumps and bursts its neighbours)
 *   `S` a sugar cube (it melts in two times)        `C` chocolate (it is eaten next to a line, and spreads when a line leaves it alone)
 *   `c` a cherry, `o` a gummy bear: a friend to bring down to the bottom of its column
 * New things come one at a time, each alone in two scenes, before they are combined. `problems()` in index.ts and
 * tests/bonbons.test.ts check every rule. The list is final: it never changes under a player. */
export const colors = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet'] as const;
export type ColorId = typeof colors[number];
/** The things a scene can bring in, in the order they first appear. */
export const features = ['arc', 'emballe', 'sucre', 'ami', 'trou', 'choco'] as const;
export type Feature = typeof features[number];
export const friends = ['cerise', 'ourson'] as const;
export type Friend = typeof friends[number];
export type Goal = { kind: 'pot'; color: ColorId; count: number } | { kind: 'ami' } | { kind: 'sucre' } | { kind: 'choco' };
export interface LevelDef {
    id: number; title: { fr: string; en: string }; moment: string;
    features: readonly Feature[]; colors: readonly ColorId[]; rows: readonly string[]; goals: readonly Goal[];
}
type Scene = Omit<LevelDef, 'id'>;
const R: ColorId = 'rouge', O: ColorId = 'orange', J: ColorId = 'jaune', V: ColorId = 'vert', B: ColorId = 'bleu', P: ColorId = 'violet';
const pot = (color: ColorId, count: number): Goal => ({ kind: 'pot', color, count });
const ami: Goal = { kind: 'ami' }, sucre: Goal = { kind: 'sucre' }, choco: Goal = { kind: 'choco' };
const say = (fr: string, en: string, moment: string, features: readonly Feature[], colors: readonly ColorId[], goals: readonly Goal[], rows: readonly string[]): Scene => ({ title: { fr, en }, moment, features, colors, goals, rows });
const plain = (cols: number, rows: number): string[] => Array.from({ length: rows }, () => '.'.repeat(cols));
const scenes: readonly Scene[] = [
    say('Bonjour, les bonbons !', 'Hello, sweets!', 'the very first three red hearts jump into Lumi’s jar', [], [R, J, B], [pot(R, 8)], plain(5, 7)),
    say('Le pot de Lumi', 'Lumi’s jar', 'the sweets above fall down to fill the gap', [], [R, V, B], [pot(V, 12)], plain(5, 8)),
    say('Deux sortes à la fois', 'Two kinds at once', 'the jar wants yellow stars and purple berlingots together', [], [J, V, P], [pot(J, 9), pot(P, 9)], plain(6, 8)),
    say('Quatre couleurs', 'Four colours', 'a fourth colour on a taller board', [], [R, J, V, B], [pot(B, 15)], plain(6, 8)),
    say('Le bonbon arc-en-ciel', 'The rainbow sweet', 'the rainbow sweet swapped with a blue one takes every blue sweet', ['arc'], [R, J, B], [pot(B, 15)],
        ['......', '......', '......', '..A...', '......', '......', '......', '......']),
    say('Deux arcs-en-ciel', 'Two rainbows', 'two rainbows wait in the top corners, and five in a row make a new one', ['arc'], [O, V, B], [pot(O, 18)],
        ['A....A', '......', '......', '......', '......', '......', '......', '......']),
    say('Le bonbon emballé', 'The wrapped sweet', 'a wrapped sweet jumps and bursts all its neighbours', ['emballe'], [R, V, B], [pot(R, 15)],
        ['......', '......', '..E...', '......', '......', '...E..', '......', '......']),
    say('Papillotes en croix', 'Wrapped sweets in a cross', 'four wrapped sweets in a cross, and four in a row wrap a new one', ['emballe'], [J, V, P], [pot(V, 18)],
        ['......', '..E...', '.E.E..', '..E...', '......', '......', '......', '......']),
    say('Le cube de sucre', 'The sugar cube', 'a sugar cube cracks, then melts the second time', ['sucre'], [R, J, B], [sucre],
        ['......', '......', '......', '.S..S.', '......', '..SS..', '......', '......']),
    say('Le mur de sucre', 'The sugar wall', 'a whole wall of sugar across the board', ['sucre'], [R, V, B], [sucre],
        ['......', '......', '......', 'SSSSSS', '......', '......', '......', '......']),
    say('La cerise qui descend', 'The cherry comes down', 'a cherry rides the falling sweets down to Lumi', ['ami'], [R, J, B], [ami],
        ['......', '......', '......', '..c...', '......', '......', '......', '......']),
    say('Les deux oursons', 'The two gummy bears', 'two gummy bears race each other to the bottom', ['ami'], [J, V, P], [ami, pot(V, 6)],
        ['......', '......', '......', '......', '......', '..oo..', '......', '......']),
    say('Un cœur de bonbons', 'A heart of sweets', 'the board is a big heart', ['trou'], [R, J, B], [pot(R, 18)],
        ['#..#..#', '.......', '.......', '.......', '.......', '.......', '#.....#', '##...##', '###.###']),
    say('La petite maison', 'The little house', 'a house-shaped board with a pointed roof and a door', ['trou'], [R, J, V, P], [pot(P, 15)],
        ['##..##', '#....#', '......', '......', '......', '......', '......', '..##..']),
    say('Le chocolat', 'The chocolate', 'a line next to the chocolate eats it, a line far away lets it spread', ['choco'], [R, J, B], [choco],
        ['......', '......', '......', '......', '......', '......', '..CC..', '...C..']),
    say('La rivière de chocolat', 'The chocolate river', 'a chocolate river along the bottom of the board', ['choco'], [R, V, B], [choco],
        ['......', '......', '......', '......', '......', '......', '......', '.CCCC.']),
    say('Arc-en-ciel et papillotes', 'Rainbow and wrapped sweets', 'a rainbow takes a colour and the wrapped sweets of that colour jump', ['arc', 'emballe'], [R, J, V, B], [pot(J, 20)],
        ['......', '.E..E.', '......', '..A...', '......', '......', '......', '......']),
    say('Le trésor de sucre', 'The sugar treasure', 'a rainbow sweet locked in a little house of sugar', ['arc', 'sucre'], [J, V, P], [sucre],
        ['......', '......', '..S...', '.SAS..', '..S...', '......', '......', '......']),
    say('La cerise sur le sucre', 'The cherry on the sugar', 'the cherry waits on a sugar cube until it melts', ['ami', 'sucre'], [R, J, B], [ami],
        ['......', '......', '..c...', '..SS..', '......', '......', '......', '......']),
    say('L’ourson dans l’entonnoir', 'The bear in the funnel', 'the bear slides down a funnel', ['ami', 'trou'], [R, V, B], [ami],
        ['.......', '...o...', '.......', '#.....#', '##...##', '##...##', '##...##', '#.....#', '.......']),
    say('Papillotes et sucre', 'Wrapped sweets and sugar', 'one wrapped sweet melts several cubes at once', ['emballe', 'sucre'], [O, V, B], [sucre],
        ['......', '......', '.SESS.', '......', '......', '.SSES.', '......', '......']),
    say('La cerise et le chocolat', 'The cherry and the chocolate', 'the cherry has to get through the chocolate', ['ami', 'choco'], [R, J, V], [ami],
        ['......', '......', '......', '...c..', '......', '..CC..', '......', '......']),
    say('Le sablier', 'The hourglass', 'an hourglass whose neck is plugged with sugar', ['trou', 'sucre'], [J, V, P], [sucre],
        ['.......', '.......', '#.....#', '##...##', '###S###', '##...##', '#.....#', '.......', '.......']),
    say('Arc-en-ciel gourmand', 'The greedy rainbow', 'a rainbow eats chocolate all over the board', ['arc', 'choco'], [R, J, B], [choco],
        ['......', '......', '...A..', '......', '......', 'C....C', 'CC..CC', '......']),
    say('L’ourson et les papillotes', 'The bear and the wrapped sweets', 'wrapped sweets clear a path for the bear', ['emballe', 'ami'], [R, J, B], [ami, pot(R, 12)],
        ['......', '......', '.o..E.', '.E....', '......', '..E...', '......', '......', '......']),
    say('Le gâteau au chocolat', 'The chocolate cake', 'a cake-shaped board with chocolate icing and a candle', ['trou', 'choco'], [R, V, B], [choco, pot(B, 8)],
        ['###.###', '###.###', '.......', '.......', '..CCC..', '.......', '.......', '.......', '.......']),
    say('Sous l’arc-en-ciel', 'Under the rainbow', 'the board is a rainbow arch with rainbow sweets', ['arc', 'trou'], [R, J, V, P], [pot(R, 20)],
        ['#.....#', '.......', '.......', '...A...', '.......', '..###..', '..###..', '..###..', '..###..']),
    say('Sucre et chocolat', 'Sugar and chocolate', 'sugar and chocolate in layers, like a cake', ['emballe', 'sucre', 'choco'], [J, V, P], [sucre, choco],
        ['......', '......', '..E...', '......', 'SSSSSS', '......', 'CC..CC', '......']),
    say('La tour de la cerise', 'The cherry’s tower', 'the cherry comes down from the top of a tower', ['ami', 'trou', 'sucre'], [R, J, B], [ami],
        ['##c##', '#...#', '#...#', '.....', '.S.S.', '.....', '.....', '.....', '.....']),
    say('Les deux amis', 'Two friends', 'a cherry and a gummy bear come down together', ['arc', 'emballe', 'ami'], [O, V, B], [ami],
        ['.c..o.', '......', '......', '..A...', '......', '.E..E.', '......', '......', '......']),
    say('La fusée de bonbons', 'The sweet rocket', 'a rocket of sweets with chocolate flames', ['arc', 'emballe', 'trou', 'choco'], [R, J, V, B], [choco, pot(V, 10)],
        ['###.###', '##...##', '##.A.##', '##...##', '#.....#', '#..E..#', '#.....#', '.C...C.', '.......']),
    say('La grande fête de Lumi', 'Lumi’s big party', 'everything at once: rainbow, wrapped sweets, sugar, a cherry, a heart shape and chocolate', [...features], [R, J, V, B], [ami, sucre],
        ['#..#..#', '.E...E.', '..cA...', '.S...S.', '.......', '#.....#', '#C...C#', '##...##', '###.###'])
];
export const handLevels: readonly LevelDef[] = scenes.map((scene, i) => ({ id: i + 1, ...scene }));
