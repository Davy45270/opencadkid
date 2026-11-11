/** Scenes of « Les bus de CaliRoux ». Children wait at the bus stop, in a row, each wearing the cap of the bus they wait
 * for. The buses are parked in CaliRoux’s yard, among grey cars and traffic cones; a bus only drives along its own lane,
 * forward or backward. The child touches a vehicle: it drives forward as far as it can; if it cannot go forward, it backs
 * up as far as it can. A bus whose nose reaches a gate leaves, taking the first child of the row, but only if that child
 * waits for its colour: otherwise the children shake their heads and the bus stays where it is. A grey car never leaves.
 *
 * One string per row of the yard, from the top:
 *   `.` an empty cell, `#` a traffic cone (it never moves);
 *   a bus: its colour letter, `r` red (heart), `b` blue (round), `j` yellow (star), `v` green (triangle), `m` purple
 *   (square), two cells (three for the long coach) in a straight line, the nose in capitals (`R`);
 *   a grey car: `w`, `x`, `y` or `z`, two cells (three for the lorry), the nose in capitals.
 * The gates: `h3` at the top over column 3, `g1` on the left beside row 1, `d2` on the right beside row 2 (counted from
 * 0). The row of children: the colours in the order they get on, one child per bus. `problems()` in index.ts and
 * tests/autobus.test.ts check every rule. The list is final: it never changes under a player. */
export const colors = ['r', 'b', 'j', 'v', 'm'] as const;
export type Color = typeof colors[number];
export const greys = ['w', 'x', 'y', 'z'] as const;
export type Dir = 'haut' | 'bas' | 'gauche' | 'droite';
export type Side = 'haut' | 'gauche' | 'droite';
/** New things, each alone in a scene before they are combined. `deuxsorties` needs `deuxbus` (a gate for each). */
export const features = ['voiture', 'deuxbus', 'plot', 'cote', 'grandcar', 'camion', 'deuxsorties', 'grand'] as const;
export type Feature = typeof features[number];
export interface Vehicle {
    /** The bus’s colour letter, or the grey car’s letter. */
    id: string; kind: 'bus' | 'voiture'; color: Color | null;
    /** `v` drives up and down a column (`lane`), `h` left and right along a row; `pos` is its top (or left) cell. */
    axis: 'h' | 'v'; nose: Dir; len: number; lane: number; pos: number;
}
export interface Cone { row: number; col: number }
export interface Exit { side: Side; at: number }
export interface LevelDef { id: number; title: { fr: string; en: string }; moment: string; cols: number; rows: number; vehicles: readonly Vehicle[]; cones: readonly Cone[]; exits: readonly Exit[]; queue: readonly Color[] }
type Yard = Pick<LevelDef, 'cols' | 'rows' | 'vehicles' | 'cones' | 'exits' | 'queue'>;
type Scene = Omit<LevelDef, 'id' | keyof Yard> & { grid: readonly string[]; gates: string; queue: string };
/** Reads a yard: its rows, its gates (`h1 d2`) and its row of children (`rb`). Throws on anything it cannot read. */
export function parse(grid: readonly string[], gates: string, queue: string): Yard {
    const rows = grid.length, cols = grid[0]?.length ?? 0, cells = new Map<string, { row: number; col: number; nose: boolean }[]>(), cones: Cone[] = [];
    grid.forEach((line, row) => {
        if (line.length !== cols) throw new Error(`row ${row}: ${line}`);
        line.split('').forEach((ch, col) => {
            if (ch === '.') return;
            if (ch === '#') { cones.push({ row, col }); return; }
            const id = ch.toLowerCase();
            if (![...colors, ...greys].includes(id as never)) throw new Error(`cell ${row},${col}: ${ch}`);
            cells.set(id, [...cells.get(id) ?? [], { row, col, nose: ch !== id }]);
        });
    });
    const vehicles: Vehicle[] = [];
    for (const [id, cs] of [...cells.entries()].sort(([a], [b]) => [...colors, ...greys].indexOf(a as never) - [...colors, ...greys].indexOf(b as never))) {
        const v = cs.every(c => c.col === cs[0]!.col), h = cs.every(c => c.row === cs[0]!.row), len = cs.length;
        if (len < 2 || len > 3 || v === h) throw new Error(`vehicle ${id}`);
        const along = cs.map(c => v ? c.row : c.col).sort((a, b) => a - b), pos = along[0]!;
        if (along.some((x, k) => x !== pos + k)) throw new Error(`vehicle ${id} is in one piece`);
        const noses = cs.filter(c => c.nose);
        if (noses.length !== 1) throw new Error(`vehicle ${id} has one nose`);
        const n = v ? noses[0]!.row : noses[0]!.col;
        if (n !== pos && n !== pos + len - 1) throw new Error(`vehicle ${id}: the nose at an end`);
        const nose: Dir = v ? (n === pos ? 'haut' : 'bas') : (n === pos ? 'gauche' : 'droite');
        const bus = (colors as readonly string[]).includes(id);
        vehicles.push({ id, kind: bus ? 'bus' : 'voiture', color: bus ? id as Color : null, axis: v ? 'v' : 'h', nose, len, lane: v ? cs[0]!.col : cs[0]!.row, pos });
    }
    const exits = gates.split(' ').filter(Boolean).map(g => {
        const m = /^([hgd])(\d)$/.exec(g);
        if (!m) throw new Error(`gate ${g}`);
        return { side: ({ h: 'haut', g: 'gauche', d: 'droite' } as const)[m[1] as 'h' | 'g' | 'd'], at: Number(m[2]) };
    });
    return { cols, rows, vehicles, cones, exits, queue: queue.split('').map(c => { if (!(colors as readonly string[]).includes(c)) throw new Error(`child ${c}`); return c as Color; }) };
}
const say = (fr: string, en: string, moment: string, gates: string, queue: string, ...grid: string[]): Scene => ({ title: { fr, en }, moment, gates, queue, grid });
const scenes: readonly Scene[] = [
    say('Le premier bus', 'The first bus', 'One red bus and nothing in its way: one touch, and it leaves with the child.',
        'h1', 'r', '....', '....', '.R..', '.r..'),
    say('La voiture garée', 'The parked car', 'A grey car sleeps across the red bus’s lane: it drives off to the left, then the bus leaves.',
        'h2', 'r', '....', '.Ww.', '..R.', '..r.'),
    say('Chacun son tour', 'Each in turn', 'Two buses in one lane: the red one in front leaves first, the blue one behind follows.',
        'h2', 'rb', '....', '..R.', '..r.', '..B.', '..b.'),
    say('Les plots', 'The cones', 'The grey car first drives the wrong way, then backs up against the cone and frees the yellow bus.',
        'h1', 'j', '.....', '.Ww.#', '.J...', '.j...'),
    say('La porte de côté', 'The side gate', 'The green bus leaves through a gate on the right, once the grey car has driven down.',
        'd1', 'v', '...x', 'vV.X', '....', '....'),
    say('Le bus du fond', 'The bus at the back', 'A grey car over two buses in one lane: the car moves, red leaves, then blue.',
        'h1', 'rb', '.wW.', '.R..', '.r..', '.B..', '.b..'),
    say('Le grand car', 'The long coach', 'The long blue coach, three cells long, waits for the grey car to drive out of its way.',
        'h2', 'b', '....', '.Ww.', '..B.', '..b.', '..b.'),
    say('Deux voitures', 'Two cars', 'Two grey cars over the red bus, one in each row, each moved in turn.',
        'h2', 'r', '..Xx', '....', '.Ww.', '..R.', '..r.'),
    say('Le camion', 'The lorry', 'A long grey lorry, nose against a cone, backs up to free the red bus.',
        'h3', 'r', '.....', '.yyY#', '...R.', '...r.', '.....'),
    say('Deux portes', 'Two gates', 'The red bus already stands at its gate, but the blue child is first: heads shake until blue has gone.',
        'h0 h3', 'br', 'R...', 'r...', '...B', '...b'),
    say('Le détour', 'The detour', 'The green bus drives halfway to let red through, then waits for the grey car to go down.',
        'h1 d2', 'rv', '....#', '....x', 'vV..X', '.R...', '.r...'),
    say('Trois voitures', 'Three cars', 'Three grey cars around the red bus: one goes right and back left, so another can drive off.',
        'h3', 'r', '.....', '.w...', '#WYy.', '...R.', '.Xxr.'),
    say('Le va-et-vient', 'Back and forth', 'A grey car over both gates at the top drives away for blue, then back the other way for red.',
        'h3 h2', 'br', '.wxX.', '.W.R.', '..Br.', '..b..', '.....'),
    say('Le car de côté', 'The coach on the side', 'The long red coach leaves on the right once the car in front has shuffled twice.',
        'd3', 'r', '#.Yyy', '.....', '...wX', 'rrRWx', '.....'),
    say('En haut, en bas', 'Up and down', 'Red leaves on the right first; the corner car then backs up so that blue can leave lower down.',
        'd1 d4', 'rb', '.....', 'rR..x', '....X', '...w.', '.bBW.'),
    say('Quatre voitures', 'Four cars', 'Four grey cars around two buses: the one on the right goes and comes back before anyone leaves.',
        'h2 h0', 'rb', '...y.', 'BxXYW', 'b...w', '..R..', '..r#.'),
    say('Le car du coin', 'The corner coach', 'The lorry backs up, the blue bus waits halfway, and the long red coach leaves first.',
        'h0 d0', 'rb', 'bB...', 'R.yyY', 'r..w.', 'r..WX', '.#..x'),
    say('Trois enfants', 'Three children', 'Three buses, three gates: the yellow bus stands ready at its gate and leaves at once.',
        'h1 g2 d3', 'jrb', '.....', '.Ww..', '..xBb', '#RXjJ', '.r...'),
    say('Par la droite', 'Out on the right', 'Blue and red both leave on the right, one above the other, after a little shuffle of cars.',
        'd3 d1', 'br', '.xX#.', 'bB.YW', '...yw', '.rR..', '.....'),
    say('Par la gauche', 'Out on the left', 'Two buses leave on the left, one above the other, and red goes up through the top.',
        'h1 g0 g1', 'rjb', '.Bb..', '..Jj.', '.R...', 'xr...', 'X#.wW'),
    say('Le car qui attend', 'The coach that waits', 'The long red coach waits at the bottom left while blue leaves on the right.',
        'h0 d3', 'br', '.Yyy.', '...Ww', 'R..x.', 'rbBX.', 'r#...'),
    say('Mi-chemin', 'Halfway', 'Blue drives halfway, the cars shuffle, red leaves on the left, then blue on the right.',
        'g3 d2', 'rb', '.#..x', '....X', 'bB...', 'yW.Rr', 'Yw...'),
    say('Le grand parking', 'The big car park', 'The big yard of six: two grey cars cross the red bus’s lane far above it.',
        'h3', 'r', '..xX..', '......', '......', 'YywW..', '...R..', '...r..'),
    say('La longue route', 'The long road', 'The red bus at the bottom of the big yard, with a car behind it and two in front.',
        'h1', 'r', 'wW....', '.Xx...', '.R....', '.r....', '.y....', '.Y....'),
    say('La rue du camion', 'Lorry street', 'In the big yard the lorry goes down for red, then back up for blue; both leave on the right.',
        'd0 d3', 'rb', '.rR.w.', '.#..W.', 'xX.zyY', 'bB.z..', '...Z..', '......'),
    say('Le bus pressé', 'The bus in a hurry', 'Blue leaves at once on the left; then three cars dance back and forth before red can go up.',
        'h4 g5', 'br', '......', '..ZyY.', 'WwzxX.', '#.z.R.', '....r.', 'Bb....'),
    say('Le grand ménage', 'The big tidy-up', 'Blue drives up and backs down again to make room, then red leaves on the right.',
        'd3 h2', 'rb', '......', '.#.zzZ', 'xX...Y', 'rRB..y', '..b..W', '.....w'),
    say('Les trois portes', 'The three gates', 'Three buses leave by three gates; the long red coach goes last, straight away.',
        'd1 g2 g4', 'bjr', 'X..#..', 'xZ.rrR', '.zBb..', '.z..Y.', '.Jj.y.', '#.Ww..'),
    say('Le car du bas', 'The bottom coach', 'The long red coach at the bottom leaves on the left once the cars have moved; yellow waits at its gate.',
        'g4 h4 h0', 'rjb', 'J.....', 'j#.XxZ', 'yY...z', 'w....z', 'WRrrB.', '..#.b.'),
    say('Quatre bus', 'Four buses', 'Four buses, four gates: blue and red leave first, then the cars make way for yellow and green.',
        'g5 g1 h2 h4', 'brjv', '#..XwW', 'Bb.xV.', '#yY.v.', '..J...', '..j...', '...Rr.'),
    say('Le grand embouteillage', 'The big traffic jam', 'Twelve touches: green first, then yellow, red and blue, between cars that go back and forth.',
        'h3 d0 h1 d2', 'vjrb', '.bB..x', '.yYR.X', 'wW.rvV', '......', '.J....', '#j..#.'),
    say('Bus en pagaille', 'Buses all over', 'The last scene: four buses all over the big yard and twelve touches to send every child off.',
        'd3 h2 h4 d2', 'rvjb', '...wYy', '...W..', '#...vV', 'rRB.J.', '..b#j.', '....Xx'),
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => ({ id: i + 1, title: s.title, moment: s.moment, ...parse(s.grid, s.gates, s.queue) }));
