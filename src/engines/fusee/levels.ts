/** Scenes of « La fusée de Boubou ». Each level is a short scene: a title said by Boubou, one strong moment of its own.
 *
 * Board units: the board is 150 × 250, the Moon's ground is the line y = 228, Boubou's round rocket has a radius of 9.
 * Positions are written by hand:
 *   `start`    where the rocket waits at the top of the sky;
 *   `pads`     one or two starry runways (centre `x`, width `w`, 36 by default) on the ground or on a hill; a runway
 *              with `swing` slides slowly from side to side (that far each way, one full trip in `period` steps);
 *              two runways are two friends to visit in order — never a trap: the one to visit next glows;
 *   `rocks`    rocks to go round (left, top, width, height), resting on the ground or floating;
 *   `hills`    round hills (left, width, height) that lift a runway;
 *   `craters`  craters in the ground (centre, width); `aliens` friendly aliens standing on the ground (centre);
 *   `stars`    golden stars to catch on the way down (never required);
 *   `wind`     bands of sky (from `y0` to `y1`) where a gentle wind pushes to one side, shown by arrows;
 *   `tunnel`   layers of crater rock across the whole sky, each with a hole (centre `x`, width `gap`) to slip through;
 *   `passenger` a little alien rides with Boubou and hops out at its house (the last runway); with two runways, it
 *              climbs aboard at the first.
 * New things come one at a time, each alone first, before they are mixed. `problems()` in index.ts and
 * tests/fusee.test.ts check every rule. */
export const features = ['cote', 'rocher', 'etoile', 'colline', 'vent', 'glisse', 'deux', 'tunnel', 'passager'] as const;
export type Feature = typeof features[number];
export interface PadDef { x: number; w?: number; swing?: number; period?: number }
export interface RockDef { x: number; y: number; w: number; h: number }
export interface HillDef { x: number; w: number; h: number }
export interface CraterDef { x: number; w: number }
export interface WindDef { y0: number; y1: number; dir: 1 | -1 }
export interface LayerDef { y0: number; y1: number; x: number; gap: number }
export interface LevelDef {
    id: number; title: { fr: string; en: string }; moment: string; features: readonly Feature[];
    start: { x: number; y: number }; pads: readonly PadDef[]; rocks: readonly RockDef[]; hills: readonly HillDef[];
    craters: readonly CraterDef[]; aliens: readonly number[]; stars: readonly { x: number; y: number }[];
    wind: readonly WindDef[]; tunnel: readonly LayerDef[]; passenger: boolean;
}
type Scene = Omit<LevelDef, 'id'>;
type Parts = Partial<Omit<Scene, 'title' | 'moment' | 'features'>>;
const say = (fr: string, en: string, moment: string, features: readonly Feature[], parts: Parts): Scene => ({
    title: { fr, en }, moment, features, start: { x: 75, y: 40 }, pads: [], rocks: [], hills: [], craters: [], aliens: [], stars: [], wind: [], tunnel: [], passenger: false, ...parts
});
const scenes: readonly Scene[] = [
    say('Bonjour, la Lune !', 'Hello, Moon!', 'the starry runway lights up under Boubou’s very first landing', [], { pads: [{ x: 75 }], craters: [{ x: 26, w: 22 }] }),
    say('Le cratère qui ronfle', 'The snoring crater', 'a big sleepy crater snores next to the runway and puffs dust if Boubou lands in it', [], { start: { x: 60, y: 40 }, pads: [{ x: 60 }], craters: [{ x: 116, w: 38 }, { x: 18, w: 18 }] }),
    say('Un ami tout vert', 'A little green friend', 'a green alien waves its antennae from beside the runway', [], { start: { x: 90, y: 34 }, pads: [{ x: 90 }], aliens: [134], craters: [{ x: 40, w: 26 }] }),
    say('La piste à côté', 'The runway next door', 'Boubou glides sideways for the first time, to a runway on the right', ['cote'], { start: { x: 38, y: 40 }, pads: [{ x: 116 }], craters: [{ x: 62, w: 26 }] }),
    say('De l’autre côté', 'Over the other side', 'a long glide to the far left, over two craters', ['cote'], { start: { x: 118, y: 40 }, pads: [{ x: 28 }], craters: [{ x: 72, w: 24 }, { x: 106, w: 20 }], aliens: [136] }),
    say('Le gros rocher', 'The big rock', 'a big rock floats right under Boubou: he goes round it', ['rocher'], { pads: [{ x: 75 }], rocks: [{ x: 50, y: 118, w: 50, h: 24 }] }),
    say('Toc toc, rocher !', 'Knock knock, rock!', 'two rocks stand guard on either side of the runway', ['rocher'], { pads: [{ x: 75 }], rocks: [{ x: 22, y: 186, w: 26, h: 42 }, { x: 102, y: 178, w: 28, h: 50 }], craters: [{ x: 140, w: 14 }] }),
    say('Une étoile en chemin', 'A star on the way', 'a golden star waits halfway down, right above the runway', ['etoile'], { pads: [{ x: 75 }], stars: [{ x: 75, y: 130 }], aliens: [26] }),
    say('Pluie d’étoiles', 'Shower of stars', 'three stars in a zigzag to catch on the way down', ['etoile'], { pads: [{ x: 82 }], stars: [{ x: 48, y: 92 }, { x: 104, y: 136 }, { x: 66, y: 182 }], craters: [{ x: 128, w: 22 }] }),
    say('La colline', 'The hill', 'the runway sits on top of a round hill', ['colline'], { pads: [{ x: 75 }], hills: [{ x: 44, w: 62, h: 40 }] }),
    say('Tout là-haut', 'Way up high', 'a tall hill lifts the runway close to the stars', ['colline'], { start: { x: 98, y: 40 }, pads: [{ x: 98 }], hills: [{ x: 70, w: 56, h: 90 }, { x: 6, w: 34, h: 26 }], craters: [{ x: 52, w: 18 }] }),
    say('Le vent souffle', 'The wind blows', 'blue arrows of wind push Boubou gently to the right', ['vent'], { pads: [{ x: 75 }], wind: [{ y0: 90, y1: 170, dir: 1 }], craters: [{ x: 128, w: 22 }] }),
    say('Le vent tourne', 'The wind turns', 'two winds blow one way, then the other', ['vent'], { pads: [{ x: 75 }], wind: [{ y0: 70, y1: 120, dir: -1 }, { y0: 140, y1: 190, dir: 1 }], aliens: [128] }),
    say('La piste qui glisse', 'The sliding runway', 'the runway slides slowly from side to side, and Boubou follows it', ['glisse'], { pads: [{ x: 75, swing: 30, period: 360 }], craters: [{ x: 12, w: 18 }, { x: 138, w: 18 }] }),
    say('Glisse, glisse !', 'Slide, slide!', 'a wider trip: the runway slides almost from one crater to the other', ['glisse'], { pads: [{ x: 75, swing: 40, period: 420 }], aliens: [8, 142] }),
    say('Deux amis', 'Two friends', 'Boubou visits the friend on the left, then the friend on the right', ['deux'], { pads: [{ x: 34 }, { x: 116 }], craters: [{ x: 8, w: 14 }] }),
    say('Le tunnel de cratères', 'The crater tunnel', 'Boubou slips down through a hole in a layer of crater rock', ['tunnel'], { pads: [{ x: 75 }], tunnel: [{ y0: 108, y1: 138, x: 75, gap: 46 }] }),
    say('Le petit passager', 'The little passenger', 'a little alien rides with Boubou and hops out at its round house', ['passager'], { pads: [{ x: 75 }], passenger: true, craters: [{ x: 124, w: 24 }] }),
    say('Rocher et étoile', 'Rock and star', 'a star hides above a rock on the way to the runway on the right', ['cote', 'rocher', 'etoile'], { start: { x: 38, y: 40 }, pads: [{ x: 114 }], rocks: [{ x: 66, y: 138, w: 32, h: 26 }], stars: [{ x: 82, y: 112 }] }),
    say('La colline au vent', 'The windy hill', 'the wind pushes left on the way down to a hilltop runway', ['colline', 'vent'], { pads: [{ x: 75 }], hills: [{ x: 40, w: 70, h: 50 }], wind: [{ y0: 80, y1: 150, dir: -1 }] }),
    say('Les deux collines', 'Two hills', 'Boubou hops from one hilltop friend to the other', ['colline', 'deux'], { pads: [{ x: 32 }, { x: 120 }], hills: [{ x: 6, w: 52, h: 60 }, { x: 96, w: 48, h: 30 }] }),
    say('Le tunnel tordu', 'The twisty tunnel', 'two layers of crater rock whose holes do not line up', ['cote', 'tunnel'], { pads: [{ x: 112 }], tunnel: [{ y0: 90, y1: 112, x: 40, gap: 46 }, { y0: 150, y1: 172, x: 110, gap: 46 }] }),
    say('Étoiles dans le vent', 'Stars in the wind', 'the wind carries Boubou from one star to the next', ['etoile', 'vent'], { pads: [{ x: 75 }], wind: [{ y0: 80, y1: 180, dir: 1 }], stars: [{ x: 106, y: 120 }, { x: 58, y: 166 }] }),
    say('La piste dans le vent', 'Sliding in the wind', 'the wind blows while the runway slides', ['glisse', 'vent'], { pads: [{ x: 75, swing: 30, period: 400 }], wind: [{ y0: 100, y1: 160, dir: -1 }] }),
    say('Le taxi de l’ami', 'A taxi for a friend', 'a friend climbs aboard on the left and Boubou takes it home on the right', ['deux', 'passager'], { pads: [{ x: 30 }, { x: 110 }], passenger: true, aliens: [72] }),
    say('Le rocher et la colline', 'The rock and the hill', 'a tall rock stands between Boubou and a hilltop runway', ['cote', 'rocher', 'colline'], { start: { x: 30, y: 40 }, pads: [{ x: 114 }], hills: [{ x: 86, w: 56, h: 56 }], rocks: [{ x: 50, y: 150, w: 24, h: 78 }] }),
    say('Le tunnel aux étoiles', 'The tunnel of stars', 'two stars shine in the hole of the tunnel', ['etoile', 'tunnel'], { pads: [{ x: 75 }], tunnel: [{ y0: 100, y1: 150, x: 75, gap: 46 }], stars: [{ x: 75, y: 125 }, { x: 75, y: 182 }] }),
    say('La maison sur la colline', 'The house on the hill', 'the little passenger lives at the top of a hill', ['cote', 'colline', 'passager'], { start: { x: 34, y: 40 }, pads: [{ x: 112 }], hills: [{ x: 84, w: 66, h: 70 }], passenger: true, craters: [{ x: 40, w: 26 }] }),
    say('Deux amis qui glissent', 'Two sliding friends', 'the first friend’s runway slides, the second waits on the right', ['glisse', 'deux'], { pads: [{ x: 42, swing: 20, period: 360 }, { x: 116 }] }),
    say('Du vent dans le tunnel', 'Wind in the tunnel', 'the wind blows above the tunnel, a rock waits below it', ['rocher', 'vent', 'tunnel'], { pads: [{ x: 75 }], tunnel: [{ y0: 120, y1: 148, x: 75, gap: 46 }], wind: [{ y0: 70, y1: 110, dir: 1 }], rocks: [{ x: 16, y: 190, w: 26, h: 38 }] }),
    say('Le grand voyage', 'The big journey', 'wind, a rock and a star between the two friends', ['rocher', 'etoile', 'vent', 'deux'], { pads: [{ x: 28 }, { x: 122 }], rocks: [{ x: 60, y: 152, w: 30, h: 28 }], stars: [{ x: 75, y: 112 }], wind: [{ y0: 90, y1: 140, dir: -1 }] }),
    say('Tout le monde à la maison !', 'Everybody home!', 'the passenger climbs aboard under the tunnel and goes home to the hill', ['etoile', 'colline', 'deux', 'tunnel', 'passager'], { start: { x: 40, y: 40 }, pads: [{ x: 30 }, { x: 112 }], hills: [{ x: 86, w: 64, h: 40 }], tunnel: [{ y0: 100, y1: 124, x: 112, gap: 46 }], stars: [{ x: 112, y: 84 }], passenger: true })
];
export const handLevels: readonly LevelDef[] = scenes.map((scene, i) => ({ id: i + 1, ...scene }));
