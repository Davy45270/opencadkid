/** Scenes of « Les nuages de Lumi ». Each level is a short scene written by hand: a title Lumi says, one strong moment that
 * no other scene repeats (most often a shape the little troop of clouds draws in the sky), the troop, how it moves, and what
 * else is in the sky.
 *
 * `troop` draws the troop from its top row down, one character per cloud place:
 *   `.` no cloud   `n` a grumpy cloud   `c` a grumpy cloud in a helmet (two hearts: it blushes at the first)
 *   `g` a grey rain cloud (grumpy; it lets slow drops fall)   `a` a rainbow cloud (grumpy; when it smiles, its neighbours
 *   on the left and the right smile too)   `s` a cloud that already smiles (a heart on it gets a kiss)
 * A heart goes straight up and meets the lowest cloud of its column: the clouds higher up hide behind the lower ones.
 * `cols` is the width of the sky (five or six columns); `x` the column of the troop's left edge at the start.
 * `move`: `fixe` the troop stays still; `pas` it takes one step after each heart (turn by turn); `balance` it swings by
 * itself, one slow step at a time, and holds still while a heart flies. `dir` is the way it goes first.
 * `bird`: a friendly bird crosses the sky under the troop, again and again (`dir` its way, `phase` where it starts).
 * `wind`: a wind blows across the sky just above Lumi and pushes every heart one column that way (a big arrow shows it).
 * New things come one at a time, each alone in a scene before they are combined. `problems()` in index.ts and
 * tests/orbite.test.ts check every rule. The list is final: it never changes under a player. */
export const features = ['pas', 'balance', 'casque', 'oiseau', 'pluie', 'cache', 'arc', 'vent', 'ami'] as const;
export type Feature = typeof features[number];
export type Move = 'fixe' | 'pas' | 'balance';
export interface LevelDef {
    id: number; title: { fr: string; en: string }; moment: string;
    troop: readonly string[]; cols: number; x: number; move: Move; dir: 1 | -1;
    bird?: { dir: 1 | -1; phase: number }; wind?: 1 | -1;
}
type Scene = Omit<LevelDef, 'id'>;
interface Opts { cols?: number; x?: number; move?: Move; dir?: 1 | -1; bird?: { dir: 1 | -1; phase: number }; wind?: 1 | -1 }
const say = (fr: string, en: string, moment: string, o: Opts, ...troop: string[]): Scene =>
    ({ title: { fr, en }, moment, troop, cols: o.cols ?? 6, x: o.x ?? 0, move: o.move ?? 'fixe', dir: o.dir ?? 1, ...(o.bird ? { bird: o.bird } : {}), ...(o.wind ? { wind: o.wind } : {}) });
const scenes: readonly Scene[] = [
    say('Bonjour les nuages', 'Hello, clouds', 'Three grumpy clouds side by side: the very first heart makes one smile, turn rainbow and fly away.', { cols: 5, x: 1 },
        'nnn'),
    say('Le grand sourire', 'The big smile', 'The grumpy troop draws a big smile in the sky, and smiles for real when it is gone.', { cols: 5 },
        'n...n', '.nnn.'),
    say('Le vol en V', 'Flying in a V', 'Five clouds fly in a V, like wild geese going south.', { x: 1 },
        'n...n', '.n.n.', '..n..'),
    say('Un pas, un cœur', 'One step, one heart', 'After each heart, the little troop takes one step along the sky.', { cols: 5, move: 'pas' },
        'nnn'),
    say('La vague', 'The wave', 'Four clouds make a wave that steps along, a cloud up, a cloud down.', { move: 'pas', x: 2, dir: -1 },
        'n.n.', '.n.n'),
    say('La balançoire', 'The swing', 'The troop swings by itself and holds still while a heart flies.', { move: 'balance' },
        'nnn'),
    say('Le pont', 'The bridge', 'An arch of clouds swings like a little bridge over Lumi.', { move: 'balance', x: 2, dir: -1 },
        '.nn.', 'n..n'),
    say('Le nuage casqué', 'The cloud in a helmet', 'The middle cloud wears a helmet: it blushes at the first heart and smiles at the second.', { x: 2 },
        'ncn'),
    say('Deux casques', 'Two helmets', 'Two helmet clouds march with a plain one between them, a step after each heart.', { move: 'pas' },
        'c.n.c'),
    say('L’oiseau ami', 'The friendly bird', 'A little bird flies under the clouds, again and again: a heart on it makes it do a loop.', { x: 1, bird: { dir: 1, phase: 0 } },
        'nnnn'),
    say('Coucou l’oiseau', 'Peekaboo, bird', 'The bird flies one way while the troop swings the other.', { move: 'balance', x: 3, dir: -1, bird: { dir: -1, phase: 20 } },
        'n.n', '.n.'),
    say('Il pleut', 'It is raining', 'A grey cloud lets slow drops fall: Lumi waits for the drop to land before she goes under it.', { x: 3 },
        'ngn'),
    say('L’averse', 'The shower', 'Two rain clouds and a helmet swing together and drip on both sides.', { move: 'balance' },
        'gcg'),
    say('Cache-cache', 'Hide and seek', 'Two little clouds hide behind the big ones and peek over their shoulders.', { cols: 5, x: 1 },
        'n.n', 'nnn'),
    say('Le bateau', 'The boat', 'The troop draws a sailing boat that rocks on the wind.', { move: 'balance', x: 1 },
        '.n..', '.nn.', 'nnnn'),
    say('L’arc-en-ciel', 'The rainbow', 'A rainbow cloud in the middle of the row: one heart on it and its two neighbours smile too.', { x: 0 },
        'nnann'),
    say('Le poisson', 'The fish', 'A fish of clouds with a rainbow eye swims one step after each heart.', { move: 'pas', x: 1 },
        '.nn.n', 'nnann'),
    say('Le vent', 'The wind', 'A wind blows from the left: every heart flies on a slant, one column to the right.', { x: 2, wind: 1 },
        'nnn'),
    say('Souffle à gauche', 'Wind to the left', 'The wind blows the other way while three clouds swing in it.', { move: 'balance', x: 1, wind: -1 },
        'n.n.n'),
    say('Les nuages contents', 'Happy clouds', 'Two clouds already smile among the grumpy ones: a heart on them gets a kiss.', { x: 1 },
        'nsns'),
    say('Bisous et plumes', 'Kisses and feathers', 'A happy cloud and the bird play together while the troop swings.', { move: 'balance', bird: { dir: 1, phase: 30 } },
        'n.s', 'nsn'),
    say('Le cœur', 'The heart', 'The troop draws a heart with a rainbow in the middle.', { cols: 5, x: 2 },
        'n.n', 'nan', '.n.'),
    say('Pluie et plumes', 'Rain and feathers', 'Two rain clouds frame a little bridge while the bird flies below.', { move: 'balance', x: 1, bird: { dir: -1, phase: 8 } },
        '.nn.', 'g..g'),
    say('Le grand vent', 'The big wind', 'Helmets hide behind helmets, and the wind blows from the right.', { x: 2, wind: -1 },
        'c.c', 'ncn'),
    say('L’étoile', 'The star', 'A star of clouds swings, with a rainbow at its heart.', { move: 'balance', x: 3, dir: -1 },
        '.n.', 'nan', 'n.n'),
    say('Le champignon', 'The mushroom', 'A big mushroom cap with two helmet clouds under it takes a step after each heart.', { move: 'pas', x: 1 },
        'nnnn', '.cc.'),
    say('La fusée', 'The rocket', 'A rocket of clouds with two rain clouds for flames.', { move: 'balance', x: 0 },
        '.n.', 'nan', 'g.g'),
    say('Le sapin', 'The fir tree', 'A fir tree of clouds in the wind, with a rainbow at its foot.', { cols: 5, x: 1, wind: 1 },
        '.n.', 'nan'),
    say('Le papillon', 'The butterfly', 'A butterfly of clouds opens its wings, and the bird flies under it.', { x: 1, bird: { dir: 1, phase: 44 } },
        'n.n', 'nan', 'n.n'),
    say('Le chat', 'The cat', 'A cat of clouds with two happy ears swings and blinks.', { move: 'balance', x: 2 },
        's.s', 'nan', '.c.'),
    say('La maison', 'The house', 'A little house of clouds with a helmet roof swings in the wind.', { move: 'balance', x: 2, dir: -1, wind: 1 },
        '.c.', 'n.n', 'nan'),
    say('Le soleil revient', 'The sun comes back', 'Everything at once: rain, a rainbow, the bird and the swing; then the big sun comes out.', { move: 'balance', x: 1, bird: { dir: 1, phase: 12 } },
        '.n.', 'nan', 'g.g')
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => ({ id: i + 1, ...s }));
