/** Scenes of « Le voyage de Boubou ». Each level is a short piece of sky written by hand: a title Boubou says, one strong
 * moment that no other scene repeats (most often a shape the stars draw), and the sky itself.
 *
 * `sky` draws the piece of sky as the screen shows it, top row first, five lanes wide: the last row reaches the rocket first.
 * When the rocket has gone through the whole piece, a few empty rows go by and the piece comes again (the goals already
 * picked up stay picked up), until every goal is picked up; then the home planet comes down.
 *   `.` empty sky
 *   goals: `*` a star   `F` a lost little rocket   `C` a space kitten   `R` a little robot (the three friends line up behind
 *     Boubou)   `P` a rainbow gate (it opens only when a friend follows Boubou)
 *   things: `o` a soft rock   `d` a cloud of dust   `b` a soap bubble   `m` a comet (each a funny try, nothing lost)
 *     `<` `>` a carpet of stars that pushes the rocket one lane that way   `@` a kind black hole that spins the rocket round
 *     and lets it out two rows further on
 * New things come one at a time, each alone in a scene before they are combined (friends may come with the gate: it opens
 * only with a friend). `problems()` in index.ts and tests/essaim.test.ts check every rule. The list is final: it never
 * changes under a player. */
export const features = ['ami', 'rocher', 'poussiere', 'bulle', 'comete', 'tapis', 'porte', 'trou'] as const;
export type Feature = typeof features[number];
export interface LevelDef { id: number; title: { fr: string; en: string }; moment: string; sky: readonly string[] }
type Scene = Omit<LevelDef, 'id'>;
const say = (fr: string, en: string, moment: string, ...sky: string[]): Scene => ({ title: { fr, en }, moment, sky });
const scenes: readonly Scene[] = [
    say('Bonjour les étoiles', 'Hello, stars', 'Three stars straight ahead, then one far on the left: a single glide and they are all Boubou’s.',
        '*....', '.....', '.....', '..*..', '.....', '..*..', '.....', '..*..'),
    say('Le zigzag', 'The zigzag', 'The stars zigzag from one edge of the sky to the other.',
        '....*', '.....', '*....', '.....', '....*', '.....', '*....', '.....'),
    say('L’escalier', 'The staircase', 'Five stars climb like a staircase, one step per lane.',
        '....*', '.....', '...*.', '.....', '..*..', '.....', '.*...', '.....', '*....'),
    say('Un ami perdu', 'A lost friend', 'A little lost rocket waits among the stars and lines up behind Boubou.',
        '.*...', '.....', '...F.', '.....', '.*...', '.....', '...*.'),
    say('Le chaton et le robot', 'The kitten and the robot', 'A space kitten and a little robot wait in two corners of the sky.',
        'C....', '.....', '..*..', '.....', '....R', '.....', '..*..'),
    say('Le rocher mou', 'The soft rock', 'Soft rocks float in the middle lane: go round them, or bounce off them, boing!',
        '..*..', '.....', '..o..', '.*...', '.....', '..o..', '...*.', '.....'),
    say('Atchoum !', 'Atchoo!', 'A cloud of dust makes the rocket sneeze, and its window goes all grey.',
        '.*...', '.....', '..d..', '...*.', '.....', '.d...', '..*..', '.....', '...*.'),
    say('La fleur', 'The flower', 'The stars draw a flower with a kitten at its heart, on a stem of soft rocks.',
        '..*..', '.*.*.', '..C..', '.*.*.', '..*..', '..o..', '..o..'),
    say('Les bulles de savon', 'Soap bubbles', 'Soap bubbles float by: the rocket goes into one and floats for a moment.',
        '..*..', '.b...', '...b.', '.*...', '.....', '..b..', '...*.', '.....', '.*...'),
    say('La tortue', 'The turtle', 'A turtle of stars walks by, with a shell of soft rocks.',
        '..*..', '.ooo.', '*ooo*', '.ooo.', '.*.*.'),
    say('La comète', 'The comet', 'Comets brush past and Boubou’s hair stands on end.',
        '.*...', '...m.', '.....', '..*..', '.m...', '.....', '...*.', '..m..', '.*...'),
    say('Le bonhomme', 'The little man', 'The stars draw a little man waving hello, a robot for a tummy and dust for shoes.',
        '..*..', '*.*.*', '..R..', '.*.*.', '.d.d.'),
    say('Le toboggan', 'The slide', 'A carpet of stars pushes the rocket aside, then three in a row slide it down to the far star.',
        '*....', '.<...', '..<..', '...<.', '...*.', '.....', '..>..', '.....', '..*..'),
    say('Le poisson', 'The fish', 'A fish of stars swims by blowing soap bubbles, with a little rocket for an eye.',
        '.b...', 'b....', '..**.', '.*F.*', '..**.'),
    say('La porte arc-en-ciel', 'The rainbow gate', 'A rainbow gate opens only when a friend follows Boubou.',
        '..P..', '.....', '.*...', '.....', '...F.', '.....', '..*..'),
    say('Le bateau', 'The boat', 'A sailing boat of stars on waves of carpets that push it to the middle, a robot at the helm.',
        '..*..', '..**.', '..*..', '*.R.*', '.>.<.'),
    say('Le trou noir gentil', 'The kind black hole', 'A kind black hole spins the rocket round and lets it out further on.',
        '.*...', '.....', '.....', '...*.', '.....', '.....', '..@..', '.....', '..*..'),
    say('La maison', 'The house', 'A house of stars with a rainbow door: the kitten at the window must come along first.',
        '..*..', '.*.*.', '*.C.*', '*.P.*', '.o.o.'),
    say('Le papillon', 'The butterfly', 'A butterfly of stars opens its wings around a comet, over a bubble.',
        '*...*', '.*.*.', '..m..', '.*.*.', '*.b.*'),
    say('Le cœur', 'The heart', 'The stars draw a big heart around a little rocket and a kitten side by side.',
        '.*.*.', '*.*.*', '.F.C.', '.*.*.', '..*..', '.....'),
    say('La pluie de comètes', 'Comet shower', 'Comets rain down while carpets slide the rocket from one star to the next.',
        '....*', '...>.', '.m...', '..*..', '.>.m.', '*....', '.m...', '..*..'),
    say('Le sapin', 'The fir tree', 'A fir tree of stars on a soft rock trunk, with a little robot on top.',
        '..R..', '.*.*.', '*.*.*', '.*.*.', '..o..', '..o..'),
    say('Le chat', 'The cat', 'A cat face of stars with dust whiskers and a kitten for a nose.',
        '*...*', '.*.*.', 'd*.*d', '..C..', 'd.*.d'),
    say('La fusée', 'The rocket', 'The stars draw a rocket just like Boubou’s, a rainbow gate for its door, bubbles for its flames.',
        '..*..', '.*.*.', '.*P*.', '.*F*.', '.b.b.'),
    say('Le serpent', 'The snake', 'A long snake of stars wiggles up the sky, and the carpets follow its curves.',
        '.*...', '..<..', '...*.', '..>..', '.*...', '..<..', '...*.', '..>..', '.*...'),
    say('Le champignon', 'The mushroom', 'A big mushroom of stars with bubble spots on a soft rock stem.',
        '.***.', '*b*b*', '..o..', '..o..', '.....'),
    say('Le croissant de lune', 'The crescent moon', 'A crescent moon of stars with a kitten asleep in its curve, after a ride in a black hole.',
        '.**..', '*....', '*.C..', '*....', '.**..', '.....', '.....', '...@.', '.....'),
    say('Le parapluie', 'The umbrella', 'An umbrella of stars keeps a little robot dry under a shower of bubbles.',
        '.b.b.', '.***.', '*.*.*', '..*..', '..R..'),
    say('L’étoile géante', 'The giant star', 'The stars draw one giant star, after a carpet and a black hole.',
        '..*..', '**.**', '.*.*.', '*...*', '.....', '.....', '..@..', '.....', '.>...'),
    say('Le grand robot', 'The big robot', 'A big robot of stars with comet antennas and soft rock feet; a little robot waits inside.',
        'm...m', '.***.', '.*R*.', '.***.', '.o.o.'),
    say('Le château', 'The castle', 'A castle of stars with dusty towers and a rainbow gate; a little rocket keeps watch.',
        '*.*.*', '*...*', '*.P.*', '.d.d.', '..F..', '.>.<.'),
    say('La grande parade', 'The big parade', 'Every kind of friend comes along for one big parade through the gate before the home planet.',
        '..P..', '.....', '.*.*.', 'F.C.R', '.o.b.', '..m..', '.....', '.....', '..@..', '.....')
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => ({ id: i + 1, ...s }));
