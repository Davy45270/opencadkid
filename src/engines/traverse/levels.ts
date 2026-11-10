/** Scenes of « La traversée de Lumi ». Each level is a short scene written by hand: a title Lumi says, one strong moment that
 * no other scene repeats, who crosses, where to, and the lanes of the board from the top (far bank) to the bottom (start).
 *
 * A lane is one row of the board. Its `ring` is longer than the board when things move: the part past the board is where
 * cars and logs wait, off screen, before they come back. Nothing moves until the child moves: one step, one tick.
 *   grass (`herbe`), one character per cell:  `.` grass  `S` start  `H` where to go  `x` a bush  `A` a friend to bring along
 *                                             `o` a snack to pick on the way  `F` a traffic light (touch it: the cars stop)
 *   road (`route`):    `.` road  `c` a car  `TT` a truck (two or three cells)  `r` a tractor (slow roads only)
 *   meadow (`pre`):    `.` grass `d` a duck waddling along
 *   river (`riviere`): `.` water `l` a log (two to four cells) that carries the little one;
 *                      on still water (no direction): `n` a water lily up on turns 0-1 of 4, `m` one up on turns 2-3
 *   rail (`rail`): the ring is a timeline, one character per tick: `.` open, `b` the barrier is down and rings, `X` the train
 * New things come one at a time, each alone in a scene before they are combined. `problems()` in index.ts and
 * tests/traverse.test.ts check every rule. The list is final: it never changes under a player. */
export const features = ['deuxsens', 'camion', 'tracteur', 'rondin', 'nenuphar', 'canard', 'train', 'ami', 'gouter', 'feu', 'attendre'] as const;
export type Feature = typeof features[number];
export type LaneKind = 'herbe' | 'route' | 'pre' | 'riviere' | 'rail';
export interface Lane { kind: LaneKind; dir: -1 | 0 | 1; slow: boolean; ring: string }
/** Who crosses: one of Lumi's foals (by the colour of its coat) or Boubou. */
export const heroes = ['rose', 'bleu', 'jaune', 'vert', 'mauve', 'boubou'] as const;
export type Hero = typeof heroes[number];
/** What waits on the other side. */
export const goals = ['maison', 'lumi', 'piquenique', 'cabane'] as const;
export type GoalKind = typeof goals[number];
export interface LevelDef {
    id: number; title: { fr: string; en: string }; moment: string; hero: Hero; goal: GoalKind;
    /** From the top (far bank) to the bottom (start bank). */
    lanes: readonly Lane[];
    /** The « je regarde » button: the world moves on while the little one stays put. */
    wait: boolean;
}
type Scene = Omit<LevelDef, 'id'>;
const g = (ring: string): Lane => ({ kind: 'herbe', dir: 0, slow: false, ring });
const road = (dir: 1 | -1, ring: string, slow = false): Lane => ({ kind: 'route', dir, slow, ring });
const pre = (dir: 1 | -1, ring: string, slow = false): Lane => ({ kind: 'pre', dir, slow, ring });
const eau = (dir: 1 | -1, ring: string, slow = false): Lane => ({ kind: 'riviere', dir, slow, ring });
const lis = (ring: string): Lane => ({ kind: 'riviere', dir: 0, slow: false, ring });
const rail = (timeline: string): Lane => ({ kind: 'rail', dir: 0, slow: false, ring: timeline });
const say = (fr: string, en: string, moment: string, hero: Hero, goal: GoalKind, lanes: readonly Lane[], wait = false): Scene => ({ title: { fr, en }, moment, hero, goal, lanes, wait });
const scenes: readonly Scene[] = [
    say('Une petite route', 'A little road', 'one slow car on a quiet road, and the little one hops across behind it', 'rose', 'maison', [
        g('..H..'), road(1, 'c.....', true), g('..S..')]),
    say('Deux voitures', 'Two cars', 'two cars follow each other: cross in the gap between them', 'bleu', 'lumi', [
        g('.H...'), g('.....'), road(-1, 'c..c....'), g('...S.')]),
    say('Une route, deux sens', 'One road, two ways', 'cars go one way on the first lane and the other way on the second', 'jaune', 'maison', [
        g('...H.'), road(-1, '.c.....'), road(1, 'c......'), g('.S...')]),
    say('Le terre-plein', 'The middle strip', 'a strip of grass in the middle of the road to rest on', 'vert', 'piquenique', [
        g('..H..'), road(1, '..c....c'), g('x...x'), road(-1, 'c.....c.'), g('..S..')]),
    say('Le gros camion', 'The big truck', 'a long truck, two cells long, takes its time to go by', 'mauve', 'cabane', [
        g('.H...'), g('.....'), road(1, 'TT......'), g('..S..')]),
    say('Le camion et la voiture', 'The truck and the car', 'a truck on the first lane, a little car on the second, same way', 'rose', 'maison', [
        g('...H.'), road(-1, '.TT.....'), road(-1, 'c....c..'), g('.S...')]),
    say('Le tracteur', 'The tractor', 'a slow tractor moves only every other step', 'boubou', 'piquenique', [
        g('..H..'), road(1, 'r....', true), g('.....'), g('..S..')]),
    say('La rivière', 'The river', 'the first log carries the little one along the water', 'bleu', 'lumi', [
        g('..H..'), eau(1, 'lll...'), g('..S..')]),
    say('Deux rondins', 'Two logs', 'two rivers of logs going opposite ways', 'jaune', 'cabane', [
        g('.H...'), eau(-1, '.llll..'), eau(1, 'llll...'), g('...S.')]),
    say('Les nénuphars', 'The water lilies', 'water lilies that dive one after the other', 'vert', 'maison', [
        g('..H..'), lis('nmnmn'), g('.....'), g('..S..')]),
    say('Les canards', 'The ducks', 'a family of ducks waddles across the meadow', 'mauve', 'piquenique', [
        g('.....H.'), pre(1, 'd.d.....', true), g('.......'), pre(-1, 'd......'), g('.S.....')]),
    say('Le petit train', 'The little train', 'the barrier rings, then the train goes by with a whistle', 'boubou', 'lumi', [
        g('...H...'), g('.......'), rail('......bbXX'), g('.S.....')]),
    say('Va chercher ton ami', 'Fetch your friend', 'a friend waits on the middle strip and comes along', 'rose', 'maison', [
        g('...H...'), road(1, 'c...c...'), g('.A.....'), road(1, '.c.....c'), g('...S...')]),
    say('Le goûter en chemin', 'A snack on the way', 'an apple to pick on the middle strip', 'bleu', 'piquenique', [
        g('.....H.'), road(-1, 'c....c..'), g('.o.....'), road(-1, '...c...c'), g('.S.....')]),
    say('Le feu rouge', 'The red light', 'touch the traffic light and every car stops', 'jaune', 'cabane', [
        g('...H...'), road(1, 'cc...ccc'), road(1, 'cc...ccc'), g('F..S...')]),
    say('Je regarde', 'I watch', 'a button to watch the world move without stepping', 'vert', 'lumi', [
        g('...H...'), road(1, 'cc.cc.ccc...'), g('xxx.xxx'), g('...S...')], true),
    say('Route et rivière', 'Road and river', 'a road, then a river: cars first, logs after', 'mauve', 'maison', [
        g('..H....'), eau(1, 'llll....'), g('.......'), road(-1, 'c...c...'), g('....S..')]),
    say('Camion dans les deux sens', 'Trucks both ways', 'trucks on two lanes going opposite ways', 'boubou', 'piquenique', [
        g('....H..'), road(-1, 'TT......'), g('.......'), road(1, '..TT....'), g('..S....')]),
    say('Le tracteur et les voitures', 'The tractor and the cars', 'the slow tractor pushes the little one gently if it gets in the way', 'rose', 'cabane', [
        g('.H.....'), road(-1, 'c...c...'), g('.......'), road(1, 'r.....r.', true), g('.....S.')]),
    say('Rondins et nénuphars', 'Logs and water lilies', 'from a log to a water lily and on to the bank', 'bleu', 'lumi', [
        g('...H...'), lis('nmnmnmn'), g('.......'), eau(-1, '.llll...'), g('..S....')]),
    say('Le train et la route', 'The train and the road', 'the train passes behind the cars', 'jaune', 'maison', [
        g('..H....'), rail('......bbXX'), g('.......'), road(1, 'c..c....'), g('....S..')]),
    say('Les canards de la rivière', 'The river ducks', 'ducks on the bank, logs on the river', 'vert', 'piquenique', [
        g('....H..'), eau(1, 'llll....'), pre(-1, 'd...d...', true), g('..S....')]),
    say('Ton ami de l’autre rive', 'Your friend across the river', 'a friend to bring along over the logs', 'mauve', 'maison', [
        g('..H....'), eau(-1, 'llll....'), g('....A..'), eau(1, '.llll...'), g('..S....')]),
    say('Pique-nique sur la route', 'Picnic by the road', 'a snack to pick between a truck and a tractor', 'boubou', 'piquenique', [
        g('.....H.'), road(1, 'TT......'), g('..o....'), road(-1, 'r......', true), g('.S.....')]),
    say('Le feu et le camion', 'The light and the truck', 'the red light stops the trucks too', 'rose', 'cabane', [
        g('....H..'), road(-1, 'TT....TT..'), road(1, 'c...c...'), g('F.S....')]),
    say('Nénuphars et canards', 'Lilies and ducks', 'water lilies first, then a duck parade', 'bleu', 'lumi', [
        g('..H....'), pre(1, 'd...d...'), g('.......'), lis('mnmnmnm'), g('....S..')]),
    say('Le feu près des rails', 'The light by the rails', 'stop the cars, then wait for the train to pass', 'jaune', 'maison', [
        g('...H...'), rail('......bbXX'), g('.......'), road(-1, 'cc..cc..'), g('F.S....')]),
    say('Je regarde la rivière', 'I watch the river', 'wait on the bank for the right log', 'vert', 'piquenique', [
        g('...H...'), eau(1, 'll......'), g('xxx.xxx'), g('...S...')], true),
    say('L’ami et le train', 'The friend and the train', 'a friend waits between the road and the rails', 'mauve', 'maison', [
        g('..H....'), rail('.....bbXX'), g('....A..'), road(-1, 'c....c..'), g('.S.....')]),
    say('Le goûter sur l’île', 'The snack on the island', 'an island in the river with a snack on it', 'boubou', 'cabane', [
        g('.H.....'), lis('nmnmnmn'), g('x..o..x'), eau(-1, 'llll....'), g('.....S.')]),
    say('Je regarde le train', 'I watch the train', 'wait on the grass for the train between two roads', 'rose', 'lumi', [
        g('...H...'), road(1, 'c...c...'), rail('.....bbXX'), g('.......'), road(-1, 'c....c..'), g('...S...')], true),
    say('L’ami et le goûter', 'The friend and the snack', 'a friend and an apple, then home', 'bleu', 'maison', [
        g('..H....'), road(-1, 'c...c...'), g('.o...A.'), road(1, '..c....c'), g('..S....')]),
    say('Route, rivière et rails', 'Road, river and rails', 'a road, the rails and a river in one crossing', 'jaune', 'piquenique', [
        g('...H...'), eau(1, 'llll....'), g('.......'), rail('......bbXX'), road(-1, 'c...c...'), g('...S...')]),
    say('La grande traversée', 'The big crossing', 'everything at once: a truck and a car, the train, logs, lilies and a snack on the way', 'vert', 'lumi', [
        g('...H...'), lis('nmnmnmn'), eau(-1, 'llll...'), g('....o..'), rail('......bbXX'), road(1, 'TT...c..'), g('...S...')], true)
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => ({ id: i + 1, ...s }));
