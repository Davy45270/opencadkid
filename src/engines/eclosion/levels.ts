/** Scenes of « Les œufs de Lumi ». Each level is a short scene written by hand: a title Lumi says, one strong moment that no
 * other scene repeats, the nest, one string per row from the top, and the creature to hatch. One character per cell:
 *   `.` an empty cell of straw   `#` a stone (nothing goes through it)
 *   `0` an egg   `1` a chick   `2` a hen   `3` a peacock   (`4`, the little dragon, is only ever hatched)
 * The child never sees a number: each stage is its own drawing, bigger than the one before.
 * `target` is the stage to hatch, `count` how many of it (two in the « deux » scenes), `lay` the order in which Lumi lays a
 * new egg after each slide (absent: she lays none). New things come one at a time, each alone in a scene before they are
 * combined. `problems()` in index.ts and tests/eclosion.test.ts check every rule. The list is final: it never changes under
 * a player. */
export const features = ['deux', 'poule', 'grand', 'pierre', 'ponte', 'loin'] as const;
export type Feature = typeof features[number];
/** The hatching chain, from the smallest to the biggest. */
export const stages = ['oeuf', 'poussin', 'poule', 'paon', 'dragon'] as const;
export type Stage = typeof stages[number];
export interface LevelDef { id: number; title: { fr: string; en: string }; moment: string; rows: readonly string[]; target: number; count: 1 | 2; lay?: number }
type Scene = Omit<LevelDef, 'id'>;
const say = (fr: string, en: string, moment: string, target: number, rows: string[], more: { count?: 2; lay?: number } = {}): Scene => ({ title: { fr, en }, moment, rows, target, count: more.count ?? 1, ...(more.lay === undefined ? {} : { lay: more.lay }) });
const scenes: readonly Scene[] = [
    say('Deux œufs', 'Two eggs', 'One slide and the two eggs roll together: a chick hatches.', 1,
        ['...', '0.0', '...']),
    say('L’un sur l’autre', 'One above the other', 'The eggs are in a column: slide up or down.', 1,
        ['.0.', '...', '.0.']),
    say('Chacun dans son coin', 'Each in its corner', 'The eggs are not on the same line: line them up first, then bring them together.', 1,
        ['0..', '...', '..0']),
    say('Deux poussins', 'Two chicks', 'A single slide hatches two chicks at once.', 1,
        ['00.', '...', '00.'], { count: 2 }),
    say('Encore deux', 'Two more', 'Two eggs meet at once, the other two need a second slide.', 1,
        ['0..', '0..', '.00'], { count: 2 }),
    say('La première poule', 'The first hen', 'A chick waits: hatch another one beside it and they become a hen.', 2,
        ['...', '1.0', '..0']),
    say('Quatre coins', 'Four corners', 'Four eggs in the corners: two chicks, then a hen.', 2,
        ['0.0', '...', '0.0']),
    say('Trois poussins', 'Three chicks', 'Three chicks for one hen: only two of them are needed.', 2,
        ['10.', '.0.', '..1']),
    say('Le grand nid', 'The big nest', 'A bigger nest: the two eggs start far apart.', 1,
        ['0...', '....', '....', '...0']),
    say('Le nid tout en haut', 'The tall nest', 'A tall nest, three cells wide and four high.', 1,
        ['.0.', '...', '...', '0..']),
    say('La pierre', 'The stone', 'A stone sits between the eggs: they go round it.', 1,
        ['0#0', '...', '...']),
    say('La pierre au milieu', 'The stone in the middle', 'The stone in the middle stops the eggs: go along the edge.', 1,
        ['0..', '.#.', '..0']),
    say('Lumi pond', 'Lumi lays', 'One egg alone: after each slide Lumi lays another one behind it.', 1,
        ['...', '.0.', '...'], { lay: 1 }),
    say('Un œuf dans le coin', 'An egg in the corner', 'The egg in the corner waits for the one Lumi lays.', 1,
        ['0..', '...', '...'], { lay: 0 }),
    say('Le paon', 'The peacock', 'Two hens meet and a peacock spreads its tail.', 3,
        ['2..', '...', '..2']),
    say('Le petit dragon', 'The little dragon', 'Two peacocks meet: a little dragon hatches!', 4,
        ['3..', '..3', '...']),
    say('Deux poules', 'Two hens', 'Four chicks, two hens to make.', 2,
        ['1..', '.1.', '1.1'], { count: 2 }),
    say('La poule du grand nid', 'The big nest’s hen', 'In the big nest the chick and the eggs come from three corners.', 2,
        ['0..1', '....', '....', '0..0']),
    say('Deux pierres', 'Two stones', 'Two stones in the corners: the eggs make the chick the other one needs.', 2,
        ['#10', '0..', '..#']),
    say('La poule qui pond', 'The hen who lays', 'One chick alone: the eggs Lumi lays make the second one.', 2,
        ['1..', '...', '...'], { lay: 2 }),
    say('Le grand nid de pierres', 'The stony big nest', 'Three stones in the big nest: the eggs zigzag between them.', 1,
        ['0.#.', '.#..', '..#0', '....']),
    say('Deux et deux pierres', 'Two and two stones', 'Two pairs of eggs on each side of the stones.', 1,
        ['0#0', '...', '0#0'], { count: 2 }),
    say('Pondre près de la pierre', 'Laying by the stone', 'Lumi lays behind the egg, between two stones.', 1,
        ['.#.', '.0.', '.#.'], { lay: 1 }),
    say('Un grand nid qui pond', 'A big nest that lays', 'A big nest, a chick, an egg, and Lumi lays the rest.', 2,
        ['....', '.1..', '....', '..0.'], { lay: 3 }),
    say('Le paon et la pierre', 'The peacock and the stone', 'A hen and two chicks around a stone: a peacock at the end.', 3,
        ['2.1', '.#.', '1..']),
    say('Le paon du grand nid', 'The big nest’s peacock', 'Hen, chicks and eggs in the big nest: step by step up to the peacock.', 3,
        ['2..1', '....', '...0', '..0.']),
    say('Le paon qui pond', 'The laying peacock', 'Just one egg is missing for the peacock: Lumi lays it.', 3,
        ['2..', '.1.', '..0'], { lay: 0 }),
    say('Deux poules dans le grand nid', 'Two hens in the big nest', 'Two hens to hatch from chicks and eggs all over the big nest.', 2,
        ['.1.1', '..0.', '.1.0', '....'], { count: 2 }),
    say('Les pierres qui pondent', 'The laying stones', 'Stones, a big nest and fresh eggs: a hen to hatch.', 2,
        ['.#..', '..1.', '#...', '...#'], { lay: 2 }),
    say('Un paon tout neuf', 'A brand-new peacock', 'A hen, a chick, a stone and fresh eggs: the peacock.', 3,
        ['2..', '...', '1#.'], { lay: 1 }),
    say('Le dragon de pierre', 'The stone dragon', 'An egg, a chick, a hen and a peacock, a stone in the corner: up to the dragon.', 4,
        ['023', '..1', '..#'], { lay: 2 }),
    say('La grande éclosion', 'The great hatching', 'Everything at once: stones, fresh eggs and the whole chain up to the dragon.', 4,
        ['31.', '2..', '.##', '.#.'], { lay: 0 })
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => ({ id: i + 1, ...s }));
