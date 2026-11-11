/** Scenes of « Le robot de Boubou ». Boubou visits a toy workshop seen from the side: shelves, workbenches, crates and
 * conveyor belts stacked from the floor to the ceiling. A kind big robot sits broken at the end of the workshop: some of its
 * parts (golden bolts, gears, a spring, a battery) lie about on the platforms. The child touches a platform; Boubou jumps
 * there (or walks there) and picks up the part he lands on; touching the robot brings the parts back to it.
 *
 * Board units: the board is 180 wide and 300 high; the floor, a big soft cushion, is the line y = 286. Platforms sit on a
 * grid of 6 columns (30 wide) and 4 rows above the floor (55 high), written `kind row col0-col1`:
 *   `c` a crate (it stands on the floor or on what is under it), `e` a wall shelf, `b` a workbench (row 1 only),
 *   `r` a trampoline (it sends Boubou three rows up), `t` a conveyor belt (`>id`: it carries Boubou to platform `id`),
 *   `a` a lift (`a1~3`: from row 1 up to row 3 and back, in a slow loop), `p` a bridge that comes out when Boubou lands on
 *   the platform with the switch (`!`), `k` a crate of balls and `d` a big rubber duck (two funny things);
 *   `*bolt` a part on the platform: `*b` golden bolt, `*g` gear, `*s` spring, `*p` battery (heavy: one at a time).
 * Ladders join two platforms (`a-b@col`). The robot sits on the floor on the right (`d`) or the left (`g`) and Boubou starts
 * beside it. `best` is the fewest touches that bring every part back, written by hand and checked by tests/ferraille.test.ts.
 * The list is final: it never changes under a player. */
export const pieces = ['b', 'g', 's', 'p'] as const;
export type Piece = typeof pieces[number];
export const kinds = ['sol', 'caisse', 'etagere', 'etabli', 'trampo', 'tapis', 'ascenseur', 'pont', 'balles', 'canard'] as const;
export type Kind = typeof kinds[number];
/** New things, each alone in a scene before they are combined. */
export const features = ['trampo', 'tapis', 'echelle', 'ascenseur', 'pont', 'lourd'] as const;
export type Feature = typeof features[number];
export const W = 180, H = 300, FLOOR = 286, ROW = 55, COL = 30;
export const rowY = (r: number): number => FLOOR - ROW * r;
/** A platform: Boubou stands on its top `y` (the lift's goes from `y` up to `top`), its body is `h` deep. */
export interface Plat { id: string; kind: Kind; x0: number; x1: number; y: number; top: number; h: number; piece: Piece | null; to: string | null; button: boolean }
export interface Ladder { a: string; b: string; x: number }
export interface LevelDef { id: number; title: { fr: string; en: string }; moment: string; robot: 'g' | 'd'; best: number; plats: readonly Plat[]; ladders: readonly Ladder[] }
const letters: Readonly<Record<string, Kind>> = { c: 'caisse', e: 'etagere', b: 'etabli', r: 'trampo', t: 'tapis', a: 'ascenseur', p: 'pont', k: 'balles', d: 'canard' };
/** A plank's thickness; a crate, a trampoline, a duck and a crate of balls are a row deep. */
export const THICK = 12;
const DEEP = 'crkd';
/** `id:kind row col0-col1 [*piece] [>to] [!]`, for example `a:c1 0-2 *b`; `l:a1~3 3-4` a lift from row 1 to row 3,
 * `c1~3` a pile of three crates from row 1 to row 3. */
export function plat(spec: string): Plat {
    const m = /^(\w+):([cebrtapkd])(\d)(?:~(\d))? (\d)-(\d)(?: \*([bgsp]))?(?: >(\w+))?( !)?$/.exec(spec);
    if (!m) throw new Error(`platform ${spec}`);
    const k = m[2]!, low = Number(m[3]), high = m[4] ? Number(m[4]) : low, pile = k === 'c';
    if (m[4] && k !== 'a' && k !== 'c') throw new Error(`platform ${spec}`);
    const y = rowY(pile ? high : low);
    return { id: m[1]!, kind: letters[k]!, x0: Number(m[5]) * COL, x1: Number(m[6]) * COL, y, top: pile ? y : rowY(high), h: DEEP.includes(k) ? ROW * (high - low + 1) : THICK, piece: (m[7] as Piece | undefined) ?? null, to: m[8] ?? null, button: Boolean(m[9]) };
}
const ladder = (spec: string): Ladder => { const m = /^(\w+)-(\w+)@(\d)$/.exec(spec); if (!m) throw new Error(`ladder ${spec}`); return { a: m[1]!, b: m[2]!, x: Number(m[3]) * COL + COL / 2 }; };
type Scene = Omit<LevelDef, 'id'>;
const say = (fr: string, en: string, moment: string, best: number, plats: string[], extra: { robot?: 'g' | 'd'; ladders?: string[] } = {}): Scene =>
    ({ title: { fr, en }, moment, robot: extra.robot ?? 'd', best, plats: plats.map(plat), ladders: (extra.ladders ?? []).map(ladder) });
const scenes: readonly Scene[] = [
    say('Trois sauts', 'Three jumps', 'Crate, shelf, shelf: three jumps up to the golden bolt.', 3, ['a:c1 1-3', 'b:e2 0-2', 'c:e3 1-3 *b']),
    say('L’étagère', 'The shelf', 'The gear waits on a shelf too high from the floor: first the crate, then the shelf.', 3, ['a:c1 3-5', 'b:e2 4-6 *g', 'c:e3 3-5 *b'], { robot: 'g' }),
    say('L’escalier', 'The staircase', 'Three bolts on three steps, like a staircase up to the left.', 3, ['a:c1 2-3 *b', 'b:e2 1-2 *b', 'c:e3 0-1 *b']),
    say('Le trampoline', 'The trampoline', 'Boing! The trampoline sends Boubou right up to the spring on the top shelf.', 2, ['t:r1 0-1', 'a:e4 0-2 *s', 'd:d1 2-3']),
    say('Les balles', 'The balls', 'A crate full of coloured balls: Boubou dives in and comes out covered.', 3, ['k:k1 3-5', 'a:c1 5-6 *b', 'b:e2 4-6 *g', 'c:e3 2-4 *b'], { robot: 'g' }),
    say('Le tapis roulant', 'The conveyor belt', 'The belt carries Boubou across a gap far too wide to jump.', 3, ['a:c1 0-2', 'c:e2 0-1 *b', 't:t3 0-2 >b', 'b:e3 4-6 *g']),
    say('Le château de caisses', 'The crate castle', 'Crates piled like a castle: a part on each tower, a gear on the bridge between.', 4, ['a:c1 3-6', 'b:c2 3-4 *b', 'c:e3 4-5 *g', 'd:c2 5-6 *s'], { robot: 'g' }),
    say('L’échelle', 'The ladder', 'A shelf too high for any jump: the ladder climbs to it.', 3, ['a:c1 0-2', 'b:e3 0-2 *b', 'c:e3 2-4 *g'], { ladders: ['a-b@0'] }),
    say('Boing et grimpe', 'Bounce and climb', 'The trampoline up, the ladder down: a bolt at the top, a gear on the way.', 3, ['t:r1 0-1', 'a:e4 0-2 *b', 'b:e2 1-3 *g'], { ladders: ['a-b@1'] }),
    say('L’ascenseur', 'The lift', 'The lift goes up and down slowly: jump on when it is down, off when it is up.', 3, ['l:a1~3 2-3', 'b:e3 0-2 *b', 'c:e3 3-4 *g']),
    say('Le pont', 'The bridge', 'Boubou lands on the red button: a bridge slides out across the gap.', 4, ['a:c1 0-1 !', 'b:e2 0-1 *b', 'p:p2 1-3', 'c:e3 3-4 *g']),
    say('Deux piles', 'Two batteries', 'Two heavy batteries: Boubou carries only one at a time and hands it to the robot.', 4, ['a:c1 0-2 *p', 'c:e2 2-3', 'b:e3 1-3 *p']),
    say('Le canard géant', 'The giant duck', 'A giant rubber duck sits between the crates: couic!', 4, ['a:c1 0-1 *b', 'd:d1 1-2', 'b:c1 2-3 *b', 'c:e2 1-2 *g', 'e:e3 2-4 *s']),
    say('Boing et tapis', 'Bounce and belt', 'Boing up to the top shelf, then the belt rolls Boubou over to the spring.', 3, ['t:r1 0-1 *b', 'a:e4 0-2 *g', 'b:t4 3-5 >c', 'c:e3 5-6 *s', 'k:k1 1-3']),
    say('Monte et descends', 'Up and down', 'The lift climbs four shelves high; a ladder leads down to the gear.', 4, ['e:c1 0-1', 'l:a1~4 2-3', 'a:e4 0-2 *b', 'b:e2 0-1 *g', 'c:e4 3-4 *s'], { ladders: ['a-b@0'] }),
    say('Bouton et tapis', 'Button and belt', 'The belt rolls Boubou to the button; the bridge comes out with the spring on it.', 4, ['a:c1 4-6', 'b:e2 3-5 *b', 't:t3 4-6 >c', 'c:e3 0-1 *g !', 'p:p3 1-4 *s'], { robot: 'g' }),
    say('Piles en haut', 'Batteries up high', 'One battery on a crate, the other on the top shelf: the trampoline helps.', 4, ['t:r1 0-1', 'a:e4 0-2 *p', 'b:c1 1-3 *p', 'c:e3 2-4', 'd:e2 3-4']),
    say('Les deux tours', 'The two towers', 'Two towers of crates on either side of a shelf, a part at the top of each.', 4, ['c:c1 4-5 *s', 'd:e2 4-5', 'a:c1~3 3-4 *b', 'b:c1~3 5-6 *g'], { robot: 'g' }),
    say('Ascenseur et pont', 'Lift and bridge', 'The button on the crate brings out a bridge up high; the lift takes Boubou to it.', 4, ['e:c1 0-2 *b !', 'l:a1~3 2-3', 'a:e3 0-2 *s', 'p:p3 3-5 *g']),
    say('Piles et échelle', 'Ladder and batteries', 'A long ladder up to the second battery, four shelves high.', 5, ['a:c1 3-5 *p', 'b:e4 3-5 *p', 'c:e2 5-6 *b'], { robot: 'g', ladders: ['a-b@4'] }),
    say('Tapis et ascenseur', 'Belt and lift', 'Up in the lift, onto the belt, and off it rolls to the spring.', 3, ['a:c1 1-3 *b', 'd:e2 2-4 *g', 'l:a1~4 0-1', 't:t4 1-3 >c', 'c:e3 4-6 *s']),
    say('Le zigzag', 'The zigzag', 'Three shelves zigzag right, left and right again, a part on each.', 3, ['a:c1 4-6 *b', 'b:e2 2-4 *g', 'c:e3 4-6 *s'], { robot: 'g' }),
    say('Bouton et échelle', 'Button and ladder', 'The button on the crate, a long ladder, and the bridge comes out at the top.', 3, ['b:c1 0-1 *s !', 'c:e4 0-2 *b', 'p:p4 2-4 *g'], { ladders: ['b-c@0'] }),
    say('Boing et ascenseur', 'Bounce and lift', 'Boing to the high shelf, then the lift over to the little corner shelf.', 4, ['t:r1 4-5', 'a:e4 3-6 *b', 'l:a2~4 2-3', 'c:e3 0-1 *g'], { robot: 'g' }),
    say('Piles sur le tapis', 'Batteries on the belt', 'The belt rolls Boubou to the second battery, far on the other side.', 4, ['a:c1 4-6 *p', 'b:e2 3-5 *b', 't:t3 4-6 >c', 'c:e3 0-2 *p'], { robot: 'g' }),
    say('La tour de caisses', 'The crate tower', 'A tower of three crates: the gear is hidden right at its top.', 3, ['a:c1~3 0-1 *g', 'b:c1 1-3 *b', 'd:e2 1-2 *s']),
    say('Boing et bouton', 'Bounce and button', 'The trampoline throws Boubou onto the button, four shelves up.', 4, ['t:r1 3-4 *s', 'a:e4 3-5 *g !', 'p:p4 1-3', 'b:e4 0-1 *b'], { robot: 'g' }),
    say('Le pont des piles', 'The battery bridge', 'The first battery sits on the button; its bridge leads to the second one.', 5, ['a:c1 0-2 *p !', 'b:e2 0-1 *b', 'p:p2 2-4', 'c:e3 3-5 *p']),
    say('Tapis et échelle', 'Belt and ladder', 'Up the ladder, onto the belt, and down to the gear on the far side.', 4, ['a:c1 4-6', 'b:e4 4-6 *b', 't:t4 2-4 >c', 'c:e3 0-1 *g', 'd:e2 2-3 *s'], { robot: 'g', ladders: ['a-b@5'] }),
    say('La grande machine', 'The big machine', 'Trampoline, lift and ladder, one after the other, right up under the ceiling.', 4, ['t:r1 0-1 *b', 'a:e4 0-2', 'l:a3~4 2-3', 'c:e3 4-6 *g', 'd:e4 4-6 *s'], { ladders: ['c-d@5'] }),
    say('Le grand tapis', 'The long belt', 'A battery on the button, the belt to the other one, the bolt on the bridge.', 5, ['a:c1 3-6 *p !', 'b:e2 2-4', 't:t3 4-6 >c', 'c:e3 0-1 *p', 'p:p3 2-4 *b'], { robot: 'g' }),
    say('La fête du robot', 'The robot’s party', 'Trampoline, belt and ladder all at once, and the robot dances at the end.', 4, ['t:r1 0-1', 'a:e4 0-2 *g', 'b:t4 3-5 >c', 'c:e3 5-6 *s', 'd:e2 4-6 *b'], { ladders: ['c-d@5'] }),
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => ({ id: i + 1, ...s }));
