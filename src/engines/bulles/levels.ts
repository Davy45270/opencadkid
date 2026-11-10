/** Scenes of « Les bulles de Boubou ». Each level is a short scene: a title said by Lumi or Boubou, one strong moment.
 *
 * `rows` lists the cluster from the ceiling down, in an offset hexagonal grid: even rows hold seven bubbles, odd rows
 * six, shifted half a bubble to the right. One character per place:
 *   `.` empty   `r o j v b p` a bubble (red heart, orange diamond, yellow star, green square, blue circle, purple triangle)
 *   `R O J V B P` the same colour frozen in an ice cube (it melts in two hits)
 *   `n` a cloud (it floats away when a bubble next to it pops)   `a` a friend stuck in a bubble (same, and it is the goal)
 * New things come one at a time, each alone in two scenes, before they are mixed. `problems()` in index.ts and
 * tests/bulles.test.ts check every rule. */
export const colors = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet'] as const;
export type ColorId = typeof colors[number];
export const letters: Readonly<Record<string, ColorId>> = { r: 'rouge', o: 'orange', j: 'jaune', v: 'vert', b: 'bleu', p: 'violet' };
/** The things a scene can bring in, in the order they first appear. */
export const features = ['arc', 'nuage', 'ami', 'glace', 'balance', 'murs'] as const;
export type Feature = typeof features[number];
export const friends = ['poussin', 'coccinelle', 'escargot'] as const;
export type Friend = typeof friends[number];
export type Speaker = 'boubou' | 'lumi';
/** A plank the bubble bounces on, from (x1, y1) to (x2, y2) in board units (the board is 150 × 250, a bubble 20 wide). */
export type Plank = readonly [number, number, number, number];
export interface LevelDef {
    id: number; speaker: Speaker; title: { fr: string; en: string }; moment: string;
    features: readonly Feature[]; rows: readonly string[]; friend?: Friend; planks?: readonly Plank[];
}
type Scene = Omit<LevelDef, 'id'>;
const say = (speaker: Speaker, fr: string, en: string, moment: string, features: readonly Feature[], rows: readonly string[], extra: Partial<Scene> = {}): Scene => ({ speaker, title: { fr, en }, moment, features, rows, ...extra });
const slants: readonly Plank[] = [[0, 142, 38, 166], [150, 142, 112, 166]];
const corridor: readonly Plank[] = [[52, 150, 52, 196], [98, 150, 98, 196]];
const middle: readonly Plank[] = [[58, 168, 92, 154]];
const scenes: readonly Scene[] = [
    say('boubou', 'Bonjour, les bulles !', 'Hello, bubbles!', 'the very first three-in-a-row flies away as butterflies', [], ['rr...bb']),
    say('lumi', 'Trois, ça s’envole !', 'Three fly away!', 'a whole line of pairs to finish one by one', [], ['rrbbrrb', 'r....b']),
    say('boubou', 'Le jaune arrive', 'Here comes yellow', 'a third colour joins the game', [], ['jjrrbbj', '.rrbb.']),
    say('lumi', 'Pluie de fleurs', 'A shower of flowers', 'one pop at the top and the whole hanging tail falls as flowers', [], ['..jj...', '..rr..', '..bbr..', '..rb..', '..rbb..']),
    say('boubou', 'Boing sur le mur !', 'Boing off the wall!', 'the corners are reached by bouncing on the side walls', [], ['v.....b', 'vv..bb', 'v.....b']),
    say('lumi', 'Des groupes partout', 'Groups everywhere', 'big groups everywhere, three colours', [], ['rrjjvvr', 'rjjvvr', '..rrvv.']),
    say('lumi', 'La bulle arc-en-ciel', 'The rainbow bubble', 'Boubou’s first bubble is a rainbow: it goes with any colour', ['arc'], ['rr.jj.b', '....b.']),
    say('boubou', 'Arc-en-ciel au milieu', 'Rainbow in the middle', 'a rainbow between two colours pops both groups at once', ['arc'], ['bbvvrrb', 'bvvrrb', 'b.....b']),
    say('boubou', 'Un petit nuage', 'A little cloud', 'a cloud floats away when the bubbles next to it pop', ['nuage'], ['r.nbb..', '.r....']),
    say('lumi', 'Les nuages font la sieste', 'The clouds take a nap', 'two sleepy clouds woken one after the other', ['nuage'], ['oonvvno', 'o.vv.o', '..bb...']),
    say('boubou', 'Le ciel se dégage', 'The sky clears up', 'rainbow bubbles chase three clouds away', ['arc', 'nuage'], ['nrrnbbn', 'rrnbb.', '...v...']),
    say('lumi', 'Le poussin coincé', 'The stuck chick', 'a chick trapped in a bubble is set free', ['ami'], ['rr.jj.b', 'r.ja.b', '..jj...'], { friend: 'poussin' }),
    say('boubou', 'La coccinelle dans la bulle', 'The ladybird in the bubble', 'the ladybird falls free when the bubbles holding it pop', ['ami'], ['ppooopp', 'po..op', '..a....'], { friend: 'coccinelle' }),
    say('lumi', 'Le poussin dans les nuages', 'The chick in the clouds', 'the chick hides between clouds', ['ami', 'nuage'], ['nbbnrrn', 'b.an.r'], { friend: 'poussin' }),
    say('boubou', 'Une bulle glaçon', 'An ice-cube bubble', 'an ice cube cracks, then melts on the second hit', ['glace'], ['rrJbb..', 'r.bb..']),
    say('lumi', 'Glaçons en rang', 'Ice cubes in a row', 'a whole row of ice cubes melts', ['glace'], ['vvBBBvv', 'v....v']),
    say('boubou', 'Arc-en-ciel sur la glace', 'Rainbow on the ice', 'the rainbow pops a colour that just thawed', ['glace', 'arc'], ['RRjjbb.', 'rjjbb.']),
    say('lumi', 'La grappe danse', 'The cluster dances', 'the cluster sways gently: aim while it swings', ['balance'], ['..rrb..', '..rbb.', '...j...']),
    say('boubou', 'Balançoire', 'The swing', 'a wide cluster swings from side to side', ['balance'], ['oo.p.oo', 'oppppo']),
    say('lumi', 'Le poussin sur la balançoire', 'The chick on the swing', 'a chick swings in its bubble until it is freed', ['balance', 'ami'], ['rrjjjrr', '.rajr.'], { friend: 'poussin' }),
    say('boubou', 'Les planches de Boubou', 'Boubou’s planks', 'two slanted planks send the bubble flying sideways', ['murs'], ['jjrrvvj', 'jrrvvj'], { planks: slants }),
    say('lumi', 'Le couloir', 'The corridor', 'shots squeeze through a narrow corridor', ['murs'], ['bbrrrvv', 'b.rr.v'], { planks: corridor }),
    say('boubou', 'Glaçons et planche', 'Ice cubes and a plank', 'a plank in the middle: go around it to reach the ice', ['murs', 'glace'], ['..bVb..', '.bbvv.'], { planks: middle }),
    say('lumi', 'Nuages gelés', 'Frozen clouds', 'clouds held by ice cubes', ['nuage', 'glace'], ['nRRnBBn', 'rr.bb.']),
    say('boubou', 'L’arc-en-ciel qui danse', 'The dancing rainbow', 'rainbow bubbles thrown at a swinging cluster', ['arc', 'balance'], ['jjppvvj', 'jppvvj', '..pp...']),
    say('lumi', 'L’escargot gelé', 'The frozen snail', 'a snail behind ice cubes: melt, then free it', ['ami', 'glace'], ['rrVVVrr', '.vav..'], { friend: 'escargot' }),
    say('boubou', 'Nuages et planches', 'Clouds and planks', 'bounce on a plank to reach a hidden cloud', ['murs', 'nuage'], ['njjnbbn', 'jjnbb.'], { planks: slants }),
    say('lumi', 'La balançoire gelée', 'The frozen swing', 'an ice cube swings with the cluster', ['balance', 'glace'], ['rRr.jj.', 'r..jj.']),
    say('boubou', 'La coccinelle derrière la planche', 'The ladybird behind the plank', 'a plank hides the ladybird: go around it', ['murs', 'ami'], ['jjbbbjj', 'jbbabj', 'vvjvjvv'], { friend: 'coccinelle', planks: middle }),
    say('lumi', 'Tout le monde dehors !', 'Everybody out!', 'rainbows, clouds and a chick together', ['arc', 'nuage', 'ami'], ['nrrnjjn', 'rrnjjn', 'jjnarnr'], { friend: 'poussin' }),
    say('boubou', 'La danse des glaçons', 'The ice cube dance', 'a swinging cluster of ice cubes above two planks', ['balance', 'murs', 'glace'], ['bbb.Vv.', 'b..vv.'], { planks: slants }),
    say('lumi', 'La grande fête des bulles', 'The great bubble party', 'everything at once: rainbow, clouds, ice, planks, swing and the snail to free', ['arc', 'nuage', 'ami', 'glace', 'balance', 'murs'], ['njjnbbn', 'jjnbbn', 'bnJaJnj'], { friend: 'escargot', planks: slants })
];
export const handLevels: readonly LevelDef[] = scenes.map((scene, i) => ({ id: i + 1, ...scene }));
