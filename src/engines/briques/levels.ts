/** Scenes of « Les briques de Lumi ». Each level is a short scene: a title said by Lumi, one strong moment (the drawing
 * that appears behind the wall).
 *
 * `rows` lists the wall from the top down, six places per row. One character per place:
 *   `.` empty   `r o j v b p` a brick of a colour (red heart, orange diamond, yellow star, green square, blue circle,
 *   purple triangle)   `R O J V B P` the same colour, a hard brick (cracked by the first hit, broken by the second)
 *   `m` a metal brick (never breaks, the ball bounces off)   `g` a jelly brick (never breaks, the ball sinks in and
 *   goes back to Lumi)   `c` a sweet brick (one more ball on the next throw)   `x` a confetti bomb (breaks its neighbours)
 *   `>` `<` a brick on wheels (moves one place along its row after each throw, starting that way)
 * New things come one at a time, each alone in two scenes, before they are mixed. `problems()` in index.ts and
 * tests/briques.test.ts check every rule. */
export const colors = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet'] as const;
export type ColorId = typeof colors[number];
export const letters: Readonly<Record<string, ColorId>> = { r: 'rouge', o: 'orange', j: 'jaune', v: 'vert', b: 'bleu', p: 'violet' };
/** The things a scene can bring in, in the order they first appear. */
export const features = ['dur', 'metal', 'bonbon', 'bombe', 'mobile', 'gelee', 'couleur'] as const;
export type Feature = typeof features[number];
/** The drawings hidden behind the walls, one per scene (src/games/briques/drawings.ts draws them). */
export const drawings = ['soleil', 'coeur', 'maison', 'poisson', 'fleur', 'arbre', 'chat', 'bateau', 'etoile', 'lune', 'papillon', 'escargot', 'champignon', 'fusee', 'pomme', 'ballons', 'bonhomme', 'tortue', 'coccinelle', 'oiseau', 'canard', 'gateau', 'glace', 'voiture', 'hibou', 'grenouille', 'chateau', 'baleine', 'arc', 'lumi', 'boubou', 'amis'] as const;
export type DrawingId = typeof drawings[number];
export interface LevelDef {
    id: number; title: { fr: string; en: string }; moment: string; features: readonly Feature[]; rows: readonly string[]; drawing: DrawingId;
}
type Scene = Omit<LevelDef, 'id'>;
const say = (fr: string, en: string, drawing: DrawingId, moment: string, features: readonly Feature[], rows: readonly string[]): Scene => ({ title: { fr, en }, drawing, moment, features, rows });
const scenes: readonly Scene[] = [
    say('Bonjour, les briques !', 'Hello, bricks!', 'soleil', 'a big smiling sun shines out from behind the first wall', [], ['.rrjj.', '.rrjj.', '.rrjj.']),
    say('Un cœur caché', 'A hidden heart', 'coeur', 'a red heart beats once the last brick falls', [], ['.p..p.', 'pp..pp', '.p..p.']),
    say('Boing sur le mur !', 'Boing off the wall!', 'poisson', 'a fish swims out of the corners, reached by bouncing on the side walls', [], ['bb..bb', 'b....b']),
    say('Une maison', 'A little house', 'maison', 'smoke curls from the chimney of a little house', [], ['..oo..', '.vvvv.', '.v..v.']),
    say('La fleur du jardin', 'The garden flower', 'fleur', 'a flower opens its petals when the wall opens', [], ['jj..jj', '..rr..', 'jj..jj']),
    say('Le grand arbre', 'The big tree', 'arbre', 'a tree full of apples appears, its leaves rustling', [], ['vvvvvv', 'v.vv.v']),
    say('Le chat qui dort', 'The sleeping cat', 'chat', 'a cat curled up asleep wakes and stretches', [], ['oo..oo', '.oooo.', 'o....o']),
    say('Des briques solides', 'Strong bricks', 'bateau', 'a sailing boat appears after the cracked bricks give way', ['dur'], ['.BBBB.', 'b.bb.b']),
    say('Crac, puis crac !', 'Crack, then crack!', 'etoile', 'a shooting star behind a wall of hard bricks', ['dur'], ['JJ..JJ', '.jJJj.', 'JJ..JJ']),
    say('La brique en fer', 'The iron brick', 'lune', 'the moon and her stars, with iron bricks that never break', ['metal'], ['.mbbm.', 'bbbbbb', '..bb..']),
    say('Le fer rigole', 'The iron laughs', 'papillon', 'a butterfly behind a wall of iron and colour', ['metal'], ['p.mm.p', 'pppppp', '.pppp.']),
    say('Fer et briques dures', 'Iron and hard bricks', 'escargot', 'a snail slides out between iron and hard bricks', ['dur', 'metal'], ['vVmmVv', 'vv..vv', 'VvvvvV']),
    say('La brique bonbon', 'The sweet brick', 'champignon', 'a sweet brick gives two balls at once, and a mushroom appears', ['bonbon'], ['rrcrrr', 'r.rr.r', 'rrrrrr']),
    say('Deux balles !', 'Two balls!', 'fusee', 'two balls at once and a rocket takes off', ['bonbon'], ['bb..bb', 'bbcbbb', 'b.bb.b', 'bbbbcb']),
    say('Bonbon dur', 'A hard sweet', 'pomme', 'two balls crack hard bricks and an apple appears', ['bonbon', 'dur'], ['RRrrRR', 'rcRRcr', 'RrrrrR']),
    say('La bombe à confettis', 'The confetti bomb', 'ballons', 'a confetti bomb breaks everything around it, and balloons fly up', ['bombe'], ['jjjjjj', 'jjxjjj', 'jjjjjj']),
    say('Boum, boum !', 'Boom, boom!', 'bonhomme', 'two bombs set each other off and a snowman appears', ['bombe'], ['bbbbbb', 'bxbbbb', 'bbxbbb', '.b..b.']),
    say('La bombe dans le fer', 'The bomb in the iron', 'tortue', 'a bomb in an iron box, and a turtle', ['bombe', 'metal'], ['vvmmvv', 'vmxvmv', 'vvvvvv']),
    say('La brique à roulettes', 'The brick on wheels', 'coccinelle', 'a brick on wheels rolls along its row and a ladybird appears', ['mobile'], ['rr..rr', '>.....', 'rr..rr']),
    say('Ça roule !', 'It rolls!', 'oiseau', 'two bricks on wheels cross each other and a bird sings', ['mobile'], ['>....<', 'bbbbbb', '.<..>.']),
    say('Le bonbon qui roule', 'The rolling sweet', 'canard', 'a sweet brick on wheels, and a duck appears', ['mobile', 'bonbon'], ['jjjjjj', '>..c..', 'jjjjjj']),
    say('La brique en gelée', 'The jelly brick', 'gateau', 'the ball sinks into the jelly, and a birthday cake appears', ['gelee'], ['pppppp', 'p.gg.p', 'pppppp']),
    say('Ça tremble !', 'It wobbles!', 'glace', 'jelly bricks wobble around an ice cream', ['gelee'], ['g.oo.g', 'oooooo', 'oo..oo']),
    say('Gelée et confettis', 'Jelly and confetti', 'voiture', 'a bomb bursts next to the jelly, which only wobbles, and a car drives out', ['gelee', 'bombe'], ['bbbbbb', 'bgxxgb', 'bb..bb']),
    say('La balle de couleur', 'The coloured ball', 'hibou', 'the ball goes through the bricks of its colour, and an owl blinks', ['couleur'], ['rrrrrr', 'bbbbbb', 'rrrrrr']),
    say('À travers les couleurs', 'Through the colours', 'grenouille', 'the ball crosses the green bricks to a frog', ['couleur'], ['vjvjvj', 'jvjvjv', 'vjvjvj']),
    say('Couleurs solides', 'Strong colours', 'chateau', 'the ball goes through hard bricks of its colour, and a castle appears', ['couleur', 'dur'], ['BBrrBB', 'rrBBrr', 'BrrrrB']),
    say('Couleurs qui roulent', 'Rolling colours', 'baleine', 'a brick on wheels and a coloured ball, and a whale spouts', ['couleur', 'mobile'], ['jjbbjj', '>.....', 'bbjjbb']),
    say('Fer, gelée et bonbon', 'Iron, jelly and sweet', 'arc', 'iron, jelly and a sweet brick around a rainbow', ['gelee', 'metal', 'bonbon'], ['vmvvvv', 'vvcvgv', 'vvvvmv']),
    say('La fête des confettis', 'The confetti party', 'lumi', 'rolling bombs and hard bricks, and Lumi herself appears', ['mobile', 'bombe', 'dur'], ['PPppPP', '>..x..', 'pPPPPp']),
    say('Le grand mur', 'The great wall', 'boubou', 'a coloured ball, a bomb and jelly in front of Boubou', ['couleur', 'bombe', 'gelee'], ['rrjjrr', 'jgxxgj', 'rrjjrr']),
    say('Tous les amis !', 'All the friends!', 'amis', 'everything at once, and all five friends wave behind the wall', ['dur', 'metal', 'bonbon', 'bombe', 'mobile', 'gelee', 'couleur'], ['bmRRmb', 'RbcxbR', '>.....', 'bbgRbb'])
];
export const handLevels: readonly LevelDef[] = scenes.map((scene, i) => ({ id: i + 1, ...scene }));
