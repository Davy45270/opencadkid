/** Scenes of « L'arrosoir de CaliRoux ». Each level is a short scene: a title said by CaliRoux, one strong moment of its own.
 *
 * Board units: the board is 160 wide and 256 high, the meadow's ground is the line y = 246. Positions are written by hand:
 *   `caliroux`  where CaliRoux's water-balloon sling stands (`x`) and how high his hill is (`h`): he throws from up high,
 *              over a meadow tiered down his slope;
 *   `flowers`   thirsty flowers standing on the ground (their foot `x`), at most seven;
 *   `hills`     round hills (centre `x`, width `w`, height `h`);
 *   `mesas`     flat rocks with steep sides (from `x0` to `x1`, height `h`) where a flower can stand up high;
 *   `trees`     apple trees (trunk at `x`, crown `h` above the ground) the balloon must fly over;
 *   `cows`      a cow grazing (its middle);
 *   `pond`      a pond (from `x0` to `x1`) where a duck swims; `sand` patches of sand (from `x0` to `x1`);
 *   `cloud`     a little cloud that passes high in the sky, above the sling,, one notch after each balloon (it starts at `x`, at height `y`);
 *   `wind`      the wind, from −2 (to the left) to 2 (to the right), shown by a big windsock and an arrow;
 *   `dots`      the share of the flight the dotted line shows while the child pulls (1: all of it);
 *   `can`       the giant watering can standing in the meadow (its `x`): splash it and the balloons get big.
 * New things come one at a time, each alone first, before they are mixed. `problems()` in index.ts and
 * tests/arrosoir.test.ts check every rule. */
export const features = ['colline', 'vent', 'haut', 'arbre', 'vache', 'etang', 'sable', 'nuage', 'groupe', 'geant', 'pointilles'] as const;
export type Feature = typeof features[number];
export interface HillDef { x: number; w: number; h: number }
export interface MesaDef { x0: number; x1: number; h: number }
export interface TreeDef { x: number; h: number }
export interface Span { x0: number; x1: number }
export interface LevelDef {
    id: number; title: { fr: string; en: string }; moment: string; features: readonly Feature[];
    caliroux: { x: number; h: number }; flowers: readonly number[]; hills: readonly HillDef[]; mesas: readonly MesaDef[];
    trees: readonly TreeDef[]; cows: readonly number[]; pond: Span | null; sand: readonly Span[];
    cloud: { x: number; y: number } | null; wind: number; dots: number; can: number | null;
}
type Scene = Omit<LevelDef, 'id'>;
type Parts = Partial<Omit<Scene, 'title' | 'moment' | 'features'>>;
const say = (fr: string, en: string, moment: string, features: readonly Feature[], parts: Parts): Scene => ({
    title: { fr, en }, moment, features, caliroux: { x: 34, h: 126 }, flowers: [], hills: [], mesas: [], trees: [], cows: [], pond: null, sand: [], cloud: null, wind: 0, dots: 1, can: null, ...parts
});
const scenes: readonly Scene[] = [
    say('Une fleur toute proche', 'A flower close by', 'one single thirsty flower on the slope, right in front of CaliRoux', [], { flowers: [66] }),
    say('Deux copines', 'Two friends', 'two flowers, one on the slope and one down in the meadow, nod to each other', [], { caliroux: { x: 34, h: 138 }, flowers: [64, 112] }),
    say('Tout au bout du pré', 'At the end of the meadow', 'a flower right at the far end of the meadow', [], { caliroux: { x: 38, h: 134 }, flowers: [86, 146] }),
    say('La colline', 'The hill', 'a round hill stands between CaliRoux and the flower', ['colline'], { flowers: [142], hills: [{ x: 108, w: 44, h: 60 }] }),
    say('Le vent souffle', 'The wind is blowing', 'the windsock fills up for the first time and pushes the balloons', ['vent'], { flowers: [84, 136], wind: 1 }),
    say('Sur le rocher', 'On the rock', 'a flower perched on a tall flat rock', ['haut'], { flowers: [66, 122], mesas: [{ x0: 106, x1: 138, h: 64 }] }),
    say('Le grand pommier', 'The big apple tree', 'a big apple tree to fly over', ['arbre'], { flowers: [118, 146], trees: [{ x: 84, h: 48 }] }),
    say('Bonjour la vache', 'Hello, cow', 'a cow grazes between the two flowers', ['vache'], { flowers: [64, 142], cows: [104] }),
    say('L’étang du canard', 'The duck’s pond', 'the flowers wait on the other side of the duck’s pond', ['etang'], { flowers: [128, 150], pond: { x0: 82, x1: 110 } }),
    say('Le bac à sable', 'The sandpit', 'a splash in the sand makes a little puddle for a frog', ['sable'], { flowers: [64, 136], sand: [{ x0: 84, x1: 116 }] }),
    say('Un nuage passe', 'A cloud goes by', 'a little cloud crosses the sky above CaliRoux, one step after each balloon', ['nuage'], { flowers: [90, 134], cloud: { x: 60, y: 70 } }),
    say('Le bouquet', 'The bouquet', 'three flowers in a bouquet, all watered by one single splash', ['groupe'], { flowers: [66, 106, 126, 146] }),
    say('L’arrosoir géant', 'The giant watering can', 'splash the giant watering can and the balloons get big', ['geant'], { flowers: [106, 128, 150], can: 78 }),
    say('Les pointillés raccourcissent', 'Shorter dots', 'the dotted line only shows the start of the flight now', ['pointilles'], { flowers: [74, 108, 142], dots: 0.6 }),
    say('Le vent sur la colline', 'Wind on the hill', 'the wind blows from the right over a hill', ['colline', 'vent', 'pointilles'], { flowers: [98, 150], hills: [{ x: 126, w: 34, h: 46 }], wind: -1, dots: 0.6 }),
    say('La fleur cachée', 'The hidden flower', 'a flower hidden behind the apple tree, on a flat rock', ['haut', 'arbre', 'pointilles'], { flowers: [66, 135], trees: [{ x: 100, h: 54 }], mesas: [{ x0: 122, x1: 148, h: 40 }], dots: 0.55 }),
    say('La vache et le sable', 'The cow and the sand', 'the cow grazes past the sand, the flower waits behind her', ['vache', 'sable', 'pointilles'], { flowers: [144], cows: [106], sand: [{ x0: 54, x1: 76 }], dots: 0.55 }),
    say('Le bouquet de l’étang', 'The pond bouquet', 'a bouquet on the near bank of the pond', ['etang', 'groupe', 'pointilles'], { flowers: [82, 102, 122], pond: { x0: 140, x1: 160 }, dots: 0.5 }),
    say('Le nuage pressé', 'The cloud in a hurry', 'the wind and the cloud go the same way', ['nuage', 'vent', 'pointilles'], { flowers: [72, 118, 150], cloud: { x: 20, y: 60 }, wind: 1, dots: 0.5 }),
    say('Le creux des collines', 'The dip between hills', 'a flower sleeps in the dip between two hills', ['colline', 'pointilles'], { flowers: [70, 118], hills: [{ x: 92, w: 28, h: 50 }, { x: 142, w: 30, h: 44 }], dots: 0.5 }),
    say('Le verger', 'The orchard', 'two apple trees and two flowers between them', ['arbre', 'pointilles'], { flowers: [104, 124], trees: [{ x: 70, h: 44 }, { x: 150, h: 56 }], dots: 0.45 }),
    say('L’escalier', 'The staircase', 'the flowers climb a staircase of rocks', ['haut', 'vent', 'pointilles'], { flowers: [66, 92, 114, 136], mesas: [{ x0: 82, x1: 103, h: 26 }, { x0: 103, x1: 125, h: 48 }, { x0: 125, x1: 147, h: 70 }], wind: -1, dots: 0.45 }),
    say('La vache boit', 'The cow has a drink', 'the cow drinks at the edge of the pond', ['vache', 'etang', 'pointilles'], { flowers: [62, 150], cows: [86], pond: { x0: 112, x1: 132 }, dots: 0.45 }),
    say('La plage', 'The beach', 'two beaches of sand under a passing cloud', ['sable', 'nuage', 'pointilles'], { flowers: [66, 120], sand: [{ x0: 80, x1: 102 }, { x0: 138, x1: 158 }], cloud: { x: 100, y: 66 }, dots: 0.4 }),
    say('La rangée de fleurs', 'The row of flowers', 'a row of four flowers shoulder to shoulder and one on the slope', ['groupe', 'pointilles'], { flowers: [64, 90, 110, 130, 150], dots: 0.4 }),
    say('La tour', 'The tower', 'a flower at the very top of a tall rock tower', ['haut', 'geant', 'pointilles'], { flowers: [106, 132], mesas: [{ x0: 120, x1: 144, h: 84 }], can: 78, dots: 0.4 }),
    say('La ferme', 'The farm', 'an apple tree on the hill and the cow further on', ['colline', 'arbre', 'vache', 'pointilles'], { flowers: [64], hills: [{ x: 100, w: 28, h: 24 }], trees: [{ x: 100, h: 26 }], cows: [134], dots: 0.35 }),
    say('Pluie sur l’étang', 'Rain on the pond', 'a rain cloud floats over the pond', ['etang', 'nuage', 'pointilles'], { flowers: [64, 140], pond: { x0: 92, x1: 122 }, cloud: { x: 140, y: 56 }, dots: 0.35 }),
    say('Des fleurs partout', 'Flowers all around', 'CaliRoux stands in the middle, flowers on both sides', ['colline', 'sable', 'pointilles'], { caliroux: { x: 80, h: 126 }, flowers: [18, 120], hills: [{ x: 18, w: 30, h: 36 }], sand: [{ x0: 138, x1: 158 }], dots: 0.35 }),
    say('La tempête de fleurs', 'The flower storm', 'a strong wind, the giant can and a bouquet', ['vent', 'groupe', 'geant', 'pointilles'], { flowers: [110, 130, 150], wind: 2, can: 78, dots: 0.3 }),
    say('Le château de sable', 'The sandcastle', 'a flower on top of a rock beside the sand, the wind against', ['sable', 'haut', 'vent', 'pointilles'], { flowers: [66, 103, 150], sand: [{ x0: 118, x1: 131 }], mesas: [{ x0: 90, x1: 116, h: 40 }], wind: -1, dots: 0.3 }),
    say('Le grand jardin', 'The big garden', 'the whole garden at once: apple tree, pond, sand and a cloud going by', ['arbre', 'etang', 'sable', 'nuage', 'pointilles'], { flowers: [64, 150], trees: [{ x: 97, h: 60 }], pond: { x0: 109, x1: 129 }, sand: [{ x0: 74, x1: 85 }], cloud: { x: 0, y: 50 }, dots: 0.3 })
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => ({ id: i + 1, ...s }));
