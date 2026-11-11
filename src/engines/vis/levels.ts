/** Scenes of « Les vis de Pestouille ». Pestouille takes a toy apart to put it away: coloured plates are screwed onto the
 * toy (a car, a rocket, a house, a boat, a train). The child touches a free screw (nothing covers it): it turns, jumps and
 * flies into the pot of its colour; a plate with no screw left falls gently into the toy chest. No reserve that fills up,
 * no dead end: every screw always has its pot, and the only obstacle is the order (a plate hides a screw).
 *
 * Board units: the board is 180 wide and 300 high. The pots stand in a row at the top, the toy fills the middle
 * (x 4–176, y 62–230), Pestouille and the toy chest stand at the bottom. One string per plate, the lowest first:
 *   `p x0 y0 x1 y1 : screws`  a panel, an upright rectangle with rounded corners, from (x0, y0) to (x1, y1);
 *   `b x0 y0 x1 y1 : screws`  a bar 26 wide (rounded ends) from (x0, y0) to (x1, y1), at any angle;
 *   screws `c x y, c x y`, each with its colour: `r` red (heart), `b` blue (round), `j` yellow (star), `v` green
 *   (triangle), `m` purple (square); each colour has its own shape, so that nothing differs by colour alone.
 * A plate written later lies on top of the plates written before it. `problems()` in index.ts and tests/vis.test.ts check
 * every rule. The list is final: it never changes under a player. */
export const colors = ['r', 'b', 'j', 'v', 'm'] as const;
export type Color = typeof colors[number];
export const toys = ['voiture', 'fusee', 'maison', 'bateau', 'train'] as const;
export type Toy = typeof toys[number];
/** New things, each alone in a scene before they are combined. `profond` needs `superpose` (a plate on a plate). */
export const features = ['superpose', 'couleurs3', 'angle', 'deuxvis', 'profond', 'grand'] as const;
export type Feature = typeof features[number];
export const W = 180, H = 300;
/** A bar's half width, a screw head's radius, and the radius a finger touches a screw in (28 units, 56 px on a phone). */
export const BAR = 13, HEAD = 9.5, HIT = 14;
export interface Plate { id: string; shape: 'panneau' | 'barre'; x0: number; y0: number; x1: number; y1: number; tint: number }
export interface Screw { id: string; plate: string; color: Color; x: number; y: number }
export interface LevelDef { id: number; title: { fr: string; en: string }; moment: string; toy: Toy; plates: readonly Plate[]; screws: readonly Screw[] }
type Scene = Omit<LevelDef, 'id' | 'plates' | 'screws'> & { specs: readonly string[] };
const ids = 'abcdefghijklmnop';
/** Reads the plates of a scene: `p 62 138 118 186 : r 90 162`. */
export function parse(specs: readonly string[]): { plates: Plate[]; screws: Screw[] } {
    const plates: Plate[] = [], screws: Screw[] = [];
    specs.forEach((spec, i) => {
        const m = /^([pb]) (\d+) (\d+) (\d+) (\d+) : (.+)$/.exec(spec);
        if (!m) throw new Error(`plate ${spec}`);
        const id = ids[i]!;
        plates.push({ id, shape: m[1] === 'p' ? 'panneau' : 'barre', x0: Number(m[2]), y0: Number(m[3]), x1: Number(m[4]), y1: Number(m[5]), tint: i });
        m[6]!.split(', ').forEach((s, k) => {
            const v = /^([rbjvm]) (\d+) (\d+)$/.exec(s);
            if (!v) throw new Error(`screw ${s} in ${spec}`);
            screws.push({ id: `${id}${k + 1}`, plate: id, color: v[1] as Color, x: Number(v[2]), y: Number(v[3]) });
        });
    });
    return { plates, screws };
}
const say = (fr: string, en: string, toy: Toy, moment: string, ...specs: string[]): Scene => ({ title: { fr, en }, toy, moment, specs });
const scenes: readonly Scene[] = [
    say('Une vis', 'One screw', 'voiture', 'A single red screw holds the car door: one touch and the door falls into the chest.',
        'p 62 138 118 186 : r 90 162'),
    say('Deux fenêtres', 'Two windows', 'maison', 'Two window shutters, a red screw and a blue one, two pots side by side.',
        'p 36 142 82 188 : r 59 165',
        'p 98 142 144 188 : b 121 165'),
    say('Cachée dessous', 'Hidden underneath', 'fusee', 'The yellow screw hides under the red bar: the bar goes first, then the rocket’s spine.',
        'b 90 100 90 204 : j 90 152',
        'b 44 152 136 152 : r 54 152'),
    say('Trois couleurs', 'Three colours', 'maison', 'Roof, window and door: three screws, three colours, three pots.',
        'b 50 108 130 108 : j 90 108',
        'p 30 142 78 188 : r 54 165',
        'p 100 150 140 222 : b 120 186'),
    say('Tout penché', 'All tilted', 'bateau', 'A tilted bar on the sail and a tilted plank on the hull.',
        'b 104 100 150 160 : r 127 130',
        'b 22 184 72 208 : b 47 196'),
    say('Deux vis', 'Two screws', 'train', 'The boiler plate is held by two green screws: it falls only when both are out.',
        'p 22 134 102 190 : v 40 162, v 84 162',
        'p 112 100 160 142 : r 136 121'),
    say('Sous le toit', 'Under the roof', 'voiture', 'A long red bar lies across the yellow door, beside a blue window.',
        'p 64 96 116 194 : j 90 176',
        'p 128 112 166 154 : b 147 133',
        'b 30 176 146 176 : r 42 176'),
    say('En croix', 'Crossed', 'fusee', 'Two tilted bars cross on the rocket: the top one first.',
        'b 64 112 116 192 : v 90 152',
        'b 116 112 64 192 : r 72 180'),
    say('La grande porte', 'The big door', 'maison', 'The big door is held at the top and at the bottom.',
        'p 70 142 110 222 : b 90 158, b 90 206',
        'b 46 110 134 110 : j 90 110',
        'p 118 146 152 182 : r 135 164'),
    say('La voile', 'The sail', 'bateau', 'A tilted bar held by two red screws runs along the sail.',
        'b 100 96 152 164 : r 108 106, r 144 154',
        'b 20 196 160 196 : b 30 196, b 150 196'),
    say('La barre du dessus', 'The bar on top', 'train', 'A bar with two screws lies over the red plate of the boiler.',
        'p 30 128 74 194 : r 52 160',
        'p 114 100 162 146 : b 138 123',
        'b 20 160 112 160 : v 24 160, v 104 160'),
    say('Le capot', 'The bonnet', 'voiture', 'A tilted bar lies over the bonnet; three colours to sort.',
        'p 18 136 74 192 : b 46 172',
        'p 106 136 162 192 : j 134 164',
        'b 20 148 80 196 : r 70 188'),
    say('Les ailerons', 'The fins', 'fusee', 'The two fins are tilted, each one held by two screws.',
        'b 46 172 76 210 : v 50 178, v 70 204',
        'b 134 172 104 210 : r 130 178, r 110 204',
        'p 70 96 110 140 : j 90 118'),
    say('Trois étages', 'Three floors', 'maison', 'Three plates piled up: the top one, then the middle one, then the bottom one.',
        'p 40 120 140 160 : b 90 140',
        'p 66 130 114 214 : r 90 196',
        'b 30 196 150 196 : b 140 196'),
    say('Le mât', 'The mast', 'bateau', 'Three tilted bars piled on the mast and the sail.',
        'b 90 80 90 176 : j 90 92',
        'b 60 120 130 80 : r 70 114',
        'b 46 94 106 144 : r 100 139'),
    say('La locomotive', 'The engine', 'train', 'Three plates piled on the engine, in three colours.',
        'p 26 128 98 192 : r 62 160',
        'b 26 160 150 160 : b 140 160',
        'p 120 120 160 200 : j 140 130'),
    say('Le pare-chocs', 'The bumper', 'voiture', 'Three plates piled on the car, the bottom one held by two screws.',
        'p 30 110 150 160 : r 46 135, r 134 135',
        'b 30 135 106 135 : v 96 135',
        'p 80 120 120 200 : v 100 184'),
    say('Le réservoir', 'The tank', 'fusee', 'Crossed bars, a tilted fin and three colours on the rocket.',
        'p 64 96 116 152 : b 90 108',
        'b 64 130 116 190 : j 106 178',
        'b 116 130 64 190 : r 74 178, r 104 144',
        'b 40 196 70 170 : v 46 192'),
    say('La cheminée', 'The chimney', 'maison', 'A chimney held by two screws under a tilted bar.',
        'p 104 70 132 130 : m 118 80, m 118 116',
        'b 70 128 150 108 : r 80 126',
        'p 40 150 80 210 : r 60 180'),
    say('La cabine', 'The cabin', 'bateau', 'The cabin, held by two screws, hides under a long plank.',
        'p 26 120 84 176 : b 40 134, b 72 160',
        'b 20 160 120 160 : j 100 160',
        'p 114 120 160 170 : r 137 145'),
    say('Huit fenêtres', 'Eight windows', 'train', 'A long train of eight little windows, red and blue.',
        'p 20 98 48 126 : r 34 112',
        'p 56 98 84 126 : b 70 112',
        'p 92 98 120 126 : r 106 112',
        'p 128 98 156 126 : b 142 112',
        'p 20 150 48 178 : b 34 164',
        'p 56 150 84 178 : r 70 164',
        'p 92 150 120 178 : b 106 164',
        'p 128 150 156 178 : r 142 164'),
    say('La belle voiture', 'The nice car', 'voiture', 'Seven plates in four colours all over the car.',
        'p 18 136 52 176 : r 35 156',
        'p 56 136 90 176 : b 73 156',
        'p 94 136 128 176 : j 111 156',
        'p 132 136 166 176 : v 149 156',
        'p 50 96 86 128 : b 68 112',
        'p 94 96 130 128 : r 112 112',
        'b 20 194 160 194 : j 90 194'),
    say('Plein de couches', 'Lots of layers', 'fusee', 'Seven plates and two piles on the rocket.',
        'p 64 96 116 140 : r 90 128',
        'p 64 146 116 200 : b 90 160',
        'p 36 170 64 210 : j 50 190',
        'p 116 170 144 210 : j 130 190',
        'b 52 128 128 128 : v 60 128',
        'b 52 160 128 160 : r 120 160',
        'p 74 66 106 94 : m 90 80'),
    say('Le grand toit', 'The big roof', 'maison', 'Tilted roof bars, windows and a door in five colours.',
        'b 28 126 84 80 : r 40 116, r 72 90',
        'b 152 126 96 80 : b 140 116, b 108 90',
        'p 34 140 74 180 : j 54 160',
        'p 106 140 146 180 : v 126 160',
        'p 72 168 108 222 : m 90 206',
        'b 34 196 146 196 : j 44 196'),
    say('Le grand bateau', 'The big boat', 'bateau', 'Eight screws on a big boat: a sail held by two, planks on the hull.',
        'b 96 84 96 176 : m 96 98, m 96 162',
        'p 112 96 156 160 : r 122 140',
        'b 20 188 160 188 : b 24 188',
        'b 30 214 150 214 : j 140 214',
        'p 40 148 80 180 : v 60 164',
        'b 110 140 160 140 : r 152 140'),
    say('La tour', 'The tower', 'train', 'Four plates piled into a tower over the engine.',
        'p 110 96 164 200 : r 148 186',
        'p 104 140 168 200 : b 156 152',
        'b 112 152 156 152 : j 120 152',
        'p 104 106 136 176 : j 120 122',
        'p 20 140 50 190 : b 35 165',
        'p 58 140 92 190 : r 75 165',
        'b 22 120 96 120 : r 59 120'),
    say('Tout à la fois', 'All at once', 'voiture', 'Piles, tilted bars and plates held by two screws all over the car.',
        'p 22 132 82 190 : r 36 146, r 68 146',
        'b 30 184 80 140 : j 36 179',
        'p 96 132 158 190 : r 128 162',
        'b 100 140 156 184 : v 104 143, v 153 182',
        'p 58 96 122 126 : v 90 110',
        'b 24 180 100 180 : j 88 180'),
    say('La grande fusée', 'The big rocket', 'fusee', 'The big rocket: eight screws, five colours, plates on plates.',
        'b 90 76 90 204 : r 90 90, r 90 190',
        'p 66 104 114 160 : b 90 146',
        'b 50 146 130 146 : j 122 146',
        'p 108 100 140 170 : v 124 114',
        'b 40 172 70 210 : m 44 177, m 66 205',
        'b 140 172 110 210 : v 136 177'),
    say('Le château', 'The castle', 'maison', 'Two tall towers and a big door, all piled up.',
        'p 26 120 62 222 : r 44 134, r 44 208',
        'p 118 120 154 222 : b 136 134, b 136 208',
        'p 70 140 110 222 : m 90 200',
        'b 90 150 90 214 : v 90 160',
        'b 20 160 160 160 : j 30 160',
        'b 50 108 130 92 : r 90 100'),
    say('Le paquebot', 'The liner', 'bateau', 'Two chimneys, a long deck and a tilted sail on the liner.',
        'p 36 116 68 176 : r 52 130',
        'p 76 116 108 176 : b 92 130',
        'b 20 176 160 176 : j 130 176',
        'b 116 90 156 160 : v 124 104, v 148 146',
        'b 30 160 112 160 : m 40 160',
        'b 30 200 150 200 : j 90 200'),
    say('Le grand train', 'The big train', 'train', 'The engine and its wagons: eight screws to put away.',
        'p 112 96 162 150 : r 122 110, r 152 110',
        'p 20 130 104 190 : b 32 160',
        'b 110 140 160 190 : j 152 182',
        'b 20 160 104 160 : v 92 160',
        'p 44 150 78 200 : m 61 188',
        'b 40 110 70 110 : r 50 110',
        'b 96 186 146 210 : j 106 191'),
    say('Le grand rangement', 'The big tidy-up', 'voiture', 'The biggest car: eight screws and a pile three plates deep under the bumper.',
        'p 20 140 160 196 : r 34 188, r 146 188',
        'p 52 96 128 132 : b 90 112',
        'b 26 188 154 188 : j 90 188',
        'p 70 146 110 206 : j 90 156',
        'b 30 120 64 140 : r 40 126',
        'b 150 120 116 160 : r 142 129',
        'b 30 212 150 212 : b 120 212')
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => { const { plates, screws } = parse(s.specs); return { id: i + 1, title: s.title, moment: s.moment, toy: s.toy, plates, screws }; });
