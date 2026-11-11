/** Scenes of « Le collier de Boubou ». Each level is a short scene: a title said by Boubou, one strong moment.
 *
 * A scene is one or two necklaces, each written as a string of beads from its clasp to its free end, and laid on a path
 * drawn in code (board units, the board is 160 × 250, a bead 20 wide). One character per bead:
 *   `r o j v b p` a bead (red heart, orange diamond, yellow star, green square, blue circle, purple triangle)
 *   `R O J V B P` the same colour, asleep: it does not count in a line until a line flies away right next to it
 * New things come one at a time, each alone in two scenes, before they are mixed. `problems()` in index.ts and
 * tests/collier.test.ts check every rule. */
export const colors = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet'] as const;
export type ColorId = typeof colors[number];
export const letters: Readonly<Record<string, ColorId>> = { r: 'rouge', o: 'orange', j: 'jaune', v: 'vert', b: 'bleu', p: 'violet' };
/** The things a scene can bring in, in the order they first appear: the rainbow bead, sleeping beads, a rock to bounce
 * on, two necklaces, a necklace all around Boubou. */
export const features = ['arc', 'dodo', 'rocher', 'deux', 'tour'] as const;
export type Feature = typeof features[number];
export interface Point { x: number; y: number }
/** A rock the bead bounces on: centre and radius. */
export type Rock = readonly [number, number, number];

const r1 = (v: number): number => Math.round(v * 10) / 10;
const line = (x1: number, y1: number, x2: number, y2: number): Point[] => [{ x: x1, y: y1 }, { x: x2, y: y2 }];
/** An arc of ellipse from angle a0 to a1 (degrees, 0 to the right, 90 down, as on the screen). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Point[] {
    const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 3));
    return Array.from({ length: steps + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180; return { x: r1(cx + rx * Math.cos(a)), y: r1(cy + ry * Math.sin(a)) }; });
}
/** One period of a wave across the board. */
function wave(x1: number, x2: number, y: number, amplitude: number): Point[] {
    return Array.from({ length: 49 }, (_, i) => ({ x: r1(x1 + (x2 - x1) * i / 48), y: r1(y - amplitude * Math.sin(2 * Math.PI * i / 48)) }));
}
const join = (...parts: Point[][]): Point[] => parts.reduce<Point[]>((all, p) => all.concat(all.length ? p.slice(1) : p), []);
/** The paths a necklace lies on, from its clasp to the far end. */
export const paths = {
    /** A short straight line across the board. */
    droite: line(14, 110, 146, 110),
    /** A straight slope from bottom left to top right. */
    pente: line(16, 172, 144, 40),
    /** Half an ellipse standing over Boubou. */
    arche: arc(80, 176, 64, 140, 180, 360),
    /** A wave across the middle. */
    vague: wave(14, 146, 100, 42),
    /** Up the left side, over the top, down the right side. */
    crochet: join(line(16, 186, 16, 76), arc(80, 76, 64, 64, 180, 360), line(144, 76, 144, 186)),
    /** Up the left side then towards the middle top; and its mirror on the right. */
    gauche: join(line(16, 186, 16, 76), arc(70, 76, 54, 54, 180, 260)),
    droit: join(line(144, 186, 144, 76), arc(90, 76, 54, 54, 360, 280)),
    /** All around Boubou, who stands in the middle: the clasp on the top, a little gap left. */
    tour: arc(80, 125, 60, 60, 288, 288 + 324),
    /** Two halves around Boubou, from the bottom up: one on the left, one on the right. */
    tourG: arc(80, 125, 60, 60, 102, 258),
    tourD: arc(80, 125, 60, 60, 78, -78)
} as const satisfies Record<string, Point[]>;
export type PathId = keyof typeof paths;
export interface LevelDef {
    id: number; title: { fr: string; en: string }; moment: string;
    features: readonly Feature[]; necklaces: readonly { path: PathId; beads: string }[]; rocks?: readonly Rock[];
    /** The bead Boubou holds first, when the scene's moment needs it. */
    hand?: ColorId;
}
type Scene = Omit<LevelDef, 'id'>;
const say = (fr: string, en: string, moment: string, features: readonly Feature[], necklaces: Scene['necklaces'], rocks?: readonly Rock[]): Scene => ({ title: { fr, en }, moment, features, necklaces, ...(rocks ? { rocks } : {}) });
const one = (path: PathId, beads: string): Scene['necklaces'] => [{ path, beads }];
const two = (left: string, right: string, around = false): Scene['necklaces'] => [{ path: around ? 'tourG' : 'gauche', beads: left }, { path: around ? 'tourD' : 'droit', beads: right }];
const scenes: readonly Scene[] = [
    say('Bonjour, les perles !', 'Hello, beads!', 'the very first three-in-a-row flies away as butterflies', [], one('droite', 'rrbb')),
    say('Trois, ça s’envole !', 'Three fly away!', 'a slanted necklace of pairs, set free one pair at a time', [], one('pente', 'rrbbrrb')),
    say('Le chemin tourne', 'The path turns', 'the necklace follows a big arch over Boubou', [], one('arche', 'bbrrbrrbbr')),
    say('Le jaune arrive', 'Here comes yellow', 'a third colour on a wavy path', [], one('vague', 'jjrrbbjj')),
    { ...say('Les deux bouts se rejoignent', 'The two ends meet', 'one bead sets off a chain: the ends meet and fly away again and again', [], one('arche', 'rrbbjjbbrr')), hand: 'jaune' },
    say('Le grand collier', 'The long necklace', 'a long necklace hangs like a big upside-down U', [], one('crochet', 'jjrrjjbbrrbbjj')),
    say('La perle arc-en-ciel', 'The rainbow bead', 'Boubou’s first bead is a rainbow: it goes with any colour', ['arc'], one('pente', 'rrjjbbj')),
    say('Arc-en-ciel au milieu', 'Rainbow in the middle', 'a rainbow thrown between two pairs finishes the bigger one', ['arc'], one('vague', 'jjbbrrbbjj')),
    say('La perle endormie', 'The sleeping bead', 'a sleeping bead wakes up when the beads next to it fly away', ['dodo'], one('pente', 'rrBbbjj')),
    say('Deux marmottes', 'Two sleepyheads', 'two sleeping beads, woken one after the other', ['dodo'], one('arche', 'bbRjjRbb')),
    say('L’arc-en-ciel réveille', 'The rainbow wakes them up', 'rainbow beads wake two sleepers on a wave', ['arc', 'dodo'], one('vague', 'rrJbbJrr')),
    say('Le rocher', 'The rock', 'a rock stands in the way: aim around it, or bounce on it', ['rocher'], one('arche', 'bbjjvvjjbb'), [[52, 150, 9]]),
    say('Ricochet', 'Ricochet', 'a rock under the end of the necklace: the aim line bounces off it', ['rocher'], one('droite', 'vvbbvv'), [[104, 165, 9]]),
    say('Arc-en-ciel et rocher', 'Rainbow and rock', 'a rainbow bead bounces on the rock into the wave', ['rocher', 'arc'], one('vague', 'jjvvbbvvjj'), [[40, 180, 9]]),
    say('Deux colliers', 'Two necklaces', 'one necklace on each side of Boubou', ['deux'], two('rrbb', 'bbrr')),
    say('Le grand et le petit', 'The big one and the little one', 'a long necklace on the left, a short one on the right', ['deux'], two('jjvvjjv', 'vj')),
    say('Un dormeur de chaque côté', 'A sleeper on each side', 'each necklace has its own sleeping bead', ['deux', 'dodo'], two('rrBbb', 'bbRrr')),
    say('Le tour de Boubou', 'All around Boubou', 'the necklace goes all the way round Boubou: throw in every direction', ['tour'], one('tour', 'rrjjbbrrjj')),
    say('La ronde', 'The ring dance', 'a ring of three colours, with a gap at the top to throw through', ['tour'], one('tour', 'vvbbvvjjbbjj')),
    say('Arc-en-ciel tout autour', 'Rainbow all around', 'rainbow beads thrown all around Boubou', ['tour', 'arc'], one('tour', 'rrvvjjrrvvj')),
    say('Le rocher et la marmotte', 'The rock and the sleepyhead', 'a rock beside the arch, and a sleeping bead in the middle of the reds', ['rocher', 'dodo'], one('arche', 'jjrrBrrjjbb'), [[108, 150, 9]]),
    say('Deux colliers et un rocher', 'Two necklaces and a rock', 'a rock between two necklaces bounces the bead from one to the other', ['deux', 'rocher'], two('vvjjv', 'jjvvj'), [[80, 160, 8]]),
    say('Marmottes en ronde', 'Sleepyheads in a ring', 'sleeping beads all around Boubou', ['tour', 'dodo'], one('tour', 'bbJbbvvJvv')),
    say('Deux colliers arc-en-ciel', 'Two rainbow necklaces', 'rainbow beads on two necklaces at once', ['deux', 'arc'], two('jjrrjj', 'rrjjrr')),
    say('Le rocher dans la ronde', 'The rock in the ring', 'a rock inside the ring, right next to Boubou', ['tour', 'rocher'], one('tour', 'rrbbvvrrbb'), [[80, 92, 9]]),
    say('Deux demi-colliers', 'Two half necklaces', 'two half necklaces make a ring around Boubou', ['tour', 'deux'], two('jjbbjj', 'bbjjbb', true)),
    say('La marmotte du grand collier', 'The sleepyhead on the long necklace', 'rainbow, sleeping beads and a rock on the long necklace', ['arc', 'dodo', 'rocher'], one('crochet', 'rrJjjvvRvvjjrr'), [[118, 186, 8]]),
    say('Deux colliers qui dorment', 'Two sleepy necklaces', 'rainbow beads wake a sleeper on each necklace', ['arc', 'dodo', 'deux'], two('bbJbb', 'jjBjj')),
    say('La ronde du rocher endormi', 'The ring of the sleepy rock', 'a rock and sleepers in the ring around Boubou', ['dodo', 'rocher', 'tour'], one('tour', 'vvBvvrJrr'), [[80, 92, 9]]),
    say('Ricochets arc-en-ciel', 'Rainbow ricochets', 'two necklaces, a rock and rainbow beads', ['arc', 'rocher', 'deux'], two('rrvvrr', 'vvrrvv'), [[80, 160, 8]]),
    say('La ronde arc-en-ciel', 'The rainbow ring', 'two half necklaces of sleepers and rainbows around Boubou', ['arc', 'dodo', 'deux', 'tour'], two('jjRjj', 'rrJrr', true)),
    say('La grande fête des perles', 'The great bead party', 'everything at once: rainbow, sleepers, a rock and two half necklaces around Boubou', ['arc', 'dodo', 'rocher', 'deux', 'tour'], two('bbVbb', 'jjBjj', true), [[80, 92, 9]])
];
export const handLevels: readonly LevelDef[] = scenes.map((scene, i) => ({ id: i + 1, ...scene }));
