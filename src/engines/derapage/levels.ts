/** Scenes of « Le kart de Pestouille ». Pestouille the dragon delivers parcels in his little kart, which rolls by itself,
 * slowly, on a road seen from above. Before each scene a friend asks for something; at each fork the road stops, big arrows
 * appear and picture signs tell where each road leads; the child touches an arrow. No race, no rival, no clock, no ranking.
 *
 * A scene is a little map of « spots », one per screen: the road comes up from the bottom of the screen to the spot.
 *   `fork(road, ...to)` a fork: one road per spot it leads to, from left to right; `-` is a one-way road that comes towards
 *     Pestouille (arrows on the ground, a no-entry sign, no arrow to touch)
 *   `round(road, ...to)` the same fork drawn as a roundabout
 *   `friend(road, who, then?)` a friend's house: a parcel for him is delivered; a friend who is not waiting for anything
 *     waves « it's not for me! »; the road then goes on (back) to `then`
 *   `funny(road, fail, then)` a funny try (mud, sheep, hay…), then the kart turns round and goes back to the fork `then`
 * A road is a shape (`droit`, `vague`, `serpent`, `zigzag`, `virage`, `escalier`, `boucle`), `*` when its bend is marked
 * with stars (the « Dérape ! » button lights up there), `+pont` or `+tunnel` for a bridge over a river or a tunnel under a
 * hill. `best` is the fewest choices that deliver everything, written by hand and checked by tests/derapage.test.ts. The
 * list is final: it never changes under a player. */
export const friends = ['ours', 'chiot', 'hibou', 'lapin', 'canard', 'chat'] as const;
export type Friend = typeof friends[number];
/** What each friend waits for, and the colour of his roof (the signs of some scenes show only the roof). */
export const gifts: Readonly<Record<Friend, string>> = { ours: 'gateau', chiot: 'balle', hibou: 'lettre', lapin: 'carotte', canard: 'bateau', chat: 'pelote' };
export const roofs: Readonly<Record<Friend, string>> = { ours: '#e5383b', chiot: '#2f80ed', hibou: '#9b51e0', lapin: '#f2851d', canard: '#27ae60', chat: '#f2c40f' };
/** Funny tries: a mud puddle and its bubble wash (`boue`), a flock of sheep crossing (`moutons`), a dead end with a wall of
 * hay (`foin`), the house of a friend who waits for nothing (`mauvais`), a wobbly wooden bridge (`planches`), a dark cave
 * where Pestouille's eyes shine (`grotte`), a little roundabout where the kart goes round three times laughing (`manege`). */
export const fails = ['boue', 'moutons', 'foin', 'mauvais', 'planches', 'grotte', 'manege'] as const;
export type Fail = typeof fails[number];
/** New things, each alone in a scene before they are combined. */
export const features = ['deux', 'derape', 'trois', 'double', 'toit', 'sens', 'rondpoint', 'pont', 'tunnel'] as const;
export type Feature = typeof features[number];
export const shapes = ['droit', 'vague', 'serpent', 'zigzag', 'virage', 'escalier', 'boucle'] as const;
export type Shape = typeof shapes[number];
export interface Road { shape: Shape; star: boolean; deco: 'pont' | 'tunnel' | null }
export type Spot =
    | { kind: 'fourche'; road: Road; to: readonly string[]; round: boolean }
    | { kind: 'ami'; road: Road; who: Friend; then: string | null }
    | { kind: 'drole'; road: Road; fail: Fail; then: string };
export interface LevelDef { id: number; title: { fr: string; en: string }; moment: string; deliver: readonly Friend[]; roofsOnly: boolean; best: number; spots: Readonly<Record<string, Spot>> }
/** The one-way road of a fork. */
export const ONE_WAY = '-';
export const START = 'a';
const road = (spec: string): Road => {
    const m = /^([a-z]+)(\*)?(?:\+(pont|tunnel))?$/.exec(spec);
    if (!m || !(shapes as readonly string[]).includes(m[1]!)) throw new Error(`road ${spec}`);
    return { shape: m[1] as Shape, star: Boolean(m[2]), deco: (m[3] as 'pont' | 'tunnel' | undefined) ?? null };
};
const fork = (r: string, ...to: string[]): Spot => ({ kind: 'fourche', road: road(r), to, round: false });
const round = (r: string, ...to: string[]): Spot => ({ kind: 'fourche', road: road(r), to, round: true });
const friend = (r: string, who: Friend, then: string | null = null): Spot => ({ kind: 'ami', road: road(r), who, then });
const funny = (r: string, fail: Fail, then: string): Spot => ({ kind: 'drole', road: road(r), fail, then });
type Scene = Omit<LevelDef, 'id'>;
const say = (fr: string, en: string, moment: string, deliver: Friend[], best: number, spots: Record<string, Spot>, roofsOnly = false): Scene => ({ title: { fr, en }, moment, deliver, roofsOnly, best, spots });
const scenes: readonly Scene[] = [
    say('Le gâteau de l’ours', 'The bear’s cake', 'One fork: the bear’s red house on one sign, a mud puddle on the other.', ['ours'], 1, {
        a: fork('droit', 'ours', 'boue'), ours: friend('droit', 'ours'), boue: funny('vague', 'boue', 'a') }),
    say('La balle du chiot', 'The puppy’s ball', 'The road waves like a ribbon; a flock of sheep waits on the other road.', ['chiot'], 1, {
        a: fork('vague', 'moutons', 'chiot'), chiot: friend('droit', 'chiot'), moutons: funny('droit', 'moutons', 'a') }),
    say('La lettre du hibou', 'The owl’s letter', 'Two forks in a row: first towards the owl, then his purple house.', ['hibou'], 2, {
        a: fork('droit', 'b', 'foin'), b: fork('vague', 'hibou', 'ours'), hibou: friend('droit', 'hibou'), ours: friend('vague', 'ours', 'b'), foin: funny('droit', 'foin', 'a') }),
    say('Le virage à étoiles', 'The star bend', 'A big bend marked with stars: the first « Dérape ! ».', ['lapin'], 1, {
        a: fork('virage*', 'lapin', 'planches'), lapin: friend('droit', 'lapin'), planches: funny('droit', 'planches', 'a') }),
    say('Trois chemins', 'Three roads', 'Three signs at once: the cave, the cat and the merry-go-round.', ['chat'], 1, {
        a: fork('droit', 'grotte', 'chat', 'manege'), chat: friend('vague', 'chat'), grotte: funny('droit', 'grotte', 'a'), manege: funny('vague', 'manege', 'a') }),
    say('Deux paquets', 'Two parcels', 'Two deliveries from the same fork, in the order the child likes.', ['ours', 'canard'], 2, {
        a: fork('vague', 'ours', 'canard'), ours: friend('droit', 'ours', 'a'), canard: friend('droit', 'canard', 'a') }),
    say('Le toit jaune', 'The yellow roof', 'The signs show only roofs: the cat lives under the yellow one.', ['chat'], 1, {
        a: fork('serpent', 'chiot', 'chat'), chiot: friend('droit', 'chiot', 'a'), chat: friend('vague', 'chat') }, true),
    say('Les deux virages', 'The two bends', 'A star bend, then a second star bend before the rabbit.', ['lapin'], 2, {
        a: fork('serpent*', 'b', 'boue'), b: fork('virage*', 'moutons', 'lapin'), lapin: friend('droit', 'lapin'), boue: funny('droit', 'boue', 'a'), moutons: funny('vague', 'moutons', 'b') }),
    say('Sens unique', 'One way', 'Arrows on the ground come towards Pestouille: that road is one way.', ['hibou'], 1, {
        a: fork('droit', 'foin', '-', 'hibou'), hibou: friend('vague', 'hibou'), foin: funny('droit', 'foin', 'a') }),
    say('Au fond des bois', 'Deep in the woods', 'Three roads, then two: the duck’s green roof hides deep in the woods.', ['canard'], 2, {
        a: fork('vague', 'grotte', 'b', 'manege'), b: fork('zigzag', 'canard', 'chat'), canard: friend('droit', 'canard'), chat: friend('droit', 'chat', 'b'), grotte: funny('droit', 'grotte', 'a'), manege: funny('droit', 'manege', 'a') }),
    say('Le rond-point', 'The roundabout', 'Pestouille goes round the roundabout to the exit the child picks.', ['chiot'], 1, {
        a: round('droit', 'planches', 'chiot', 'boue'), chiot: friend('vague', 'chiot'), planches: funny('droit', 'planches', 'a'), boue: funny('droit', 'boue', 'a') }),
    say('Toits rouge et bleu', 'Red and blue roofs', 'Two parcels and only roofs on the signs, one fork after the other.', ['ours', 'chiot'], 3, {
        a: fork('vague', 'ours', 'b'), b: fork('droit', 'chiot', 'lapin'), ours: friend('droit', 'ours', 'a'), chiot: friend('vague', 'chiot', 'a'), lapin: friend('droit', 'lapin', 'b') }, true),
    say('Le pont de pierre', 'The stone bridge', 'The road crosses the river on a stone bridge.', ['canard'], 1, {
        a: fork('droit+pont', 'canard', 'moutons'), canard: friend('droit', 'canard'), moutons: funny('vague', 'moutons', 'a') }),
    say('La rivière', 'The river', 'A star bend down to the river, then the bridge over to the rabbit.', ['lapin'], 2, {
        a: fork('vague*', 'b', 'foin'), b: fork('droit+pont', 'lapin', 'grotte'), lapin: friend('vague', 'lapin'), foin: funny('droit', 'foin', 'a'), grotte: funny('droit', 'grotte', 'b') }),
    say('Le tunnel', 'The tunnel', 'The road dives under a green hill and comes out on the other side.', ['chat'], 1, {
        a: fork('droit+tunnel', 'manege', 'chat'), chat: friend('droit', 'chat'), manege: funny('vague', 'manege', 'a') }),
    say('Sous la colline', 'Under the hill', 'Out of the tunnel, a one-way road between two signs.', ['ours'], 2, {
        a: fork('vague+tunnel', 'b', 'planches'), b: fork('droit', 'ours', '-', 'boue'), ours: friend('droit', 'ours'), planches: funny('droit', 'planches', 'a'), boue: funny('vague', 'boue', 'b') }),
    say('Autour du rond-point', 'Round the roundabout', 'Two parcels around the same roundabout.', ['hibou', 'chat'], 2, {
        a: round('vague', 'hibou', 'grotte', 'chat'), hibou: friend('droit', 'hibou', 'a'), chat: friend('droit', 'chat', 'a'), grotte: funny('vague', 'grotte', 'a') }),
    say('Trois toits', 'Three roofs', 'Three roofs on three signs: the purple one is the owl’s.', ['hibou'], 1, {
        a: fork('serpent', 'lapin', 'hibou', 'chat'), lapin: friend('droit', 'lapin', 'a'), hibou: friend('vague', 'hibou'), chat: friend('droit', 'chat', 'a') }, true),
    say('Le long voyage', 'The long trip', 'Three forks in a row, and the sheep send Pestouille back two forks.', ['lapin'], 3, {
        a: fork('droit', 'b', 'boue'), b: fork('vague', 'foin', 'c'), c: fork('zigzag*', 'lapin', 'moutons'), lapin: friend('droit', 'lapin'), boue: funny('droit', 'boue', 'a'), foin: funny('vague', 'foin', 'b'), moutons: funny('droit', 'moutons', 'b') }),
    say('Le pont et le tunnel', 'Bridge and tunnel', 'A bridge, then a tunnel, then the cat’s yellow roof.', ['chat'], 2, {
        a: fork('droit+pont', 'b', 'planches'), b: fork('vague+tunnel', 'chat', 'grotte'), chat: friend('droit', 'chat'), planches: funny('droit', 'planches', 'a'), grotte: funny('droit', 'grotte', 'b') }),
    say('Le facteur', 'The postman', 'A letter for the owl and a ball for the puppy, on two different roads.', ['hibou', 'chiot'], 4, {
        a: fork('vague', 'b', 'c'), b: fork('droit', 'hibou', 'foin'), c: fork('droit', 'boue', 'chiot'), hibou: friend('droit', 'hibou', 'a'), chiot: friend('vague', 'chiot', 'a'), foin: funny('droit', 'foin', 'b'), boue: funny('droit', 'boue', 'c') }),
    say('Le rond-point fleuri', 'The flower roundabout', 'A star bend, then a roundabout with one exit that is one way.', ['ours'], 2, {
        a: fork('vague*', 'b', 'foin'), b: round('serpent', 'manege', '-', 'ours'), ours: friend('droit', 'ours'), foin: funny('droit', 'foin', 'a'), manege: funny('droit', 'manege', 'b') }),
    say('Le toit bleu', 'The blue roof', 'Over the bridge, the signs show only roofs: the blue one is the puppy’s.', ['chiot'], 2, {
        a: fork('vague+pont', 'b', 'moutons'), b: fork('droit', 'canard', 'chiot'), chiot: friend('droit', 'chiot'), canard: friend('vague', 'canard', 'b'), moutons: funny('droit', 'moutons', 'a') }, true),
    say('La route serpent', 'The snake road', 'The road wiggles like a snake, with stars on its bends.', ['canard'], 1, {
        a: fork('serpent*', 'canard', 'b'), b: fork('zigzag', 'grotte', 'planches'), canard: friend('droit', 'canard'), grotte: funny('droit', 'grotte', 'a'), planches: funny('vague', 'planches', 'a') }),
    say('La fête des amis', 'The friends’ party', 'A roundabout with three friends: two of them wait for a parcel.', ['lapin', 'ours'], 2, {
        a: round('droit', 'lapin', 'chat', 'ours'), lapin: friend('vague', 'lapin', 'a'), chat: friend('droit', 'chat', 'a'), ours: friend('droit', 'ours', 'a') }),
    say('La montagne', 'The mountain', 'A star bend, a tunnel through the mountain and a one-way road.', ['hibou'], 2, {
        a: fork('virage*', 'b', 'boue'), b: fork('droit+tunnel', '-', 'hibou', 'foin'), hibou: friend('vague', 'hibou'), boue: funny('droit', 'boue', 'a'), foin: funny('droit', 'foin', 'b') }),
    say('L’escalier', 'The staircase', 'The road climbs like a staircase, three forks high.', ['chiot'], 3, {
        a: fork('escalier', 'b', 'planches'), b: fork('escalier', 'c', 'manege'), c: fork('escalier', 'chiot', 'chat'), chiot: friend('droit', 'chiot'), chat: friend('vague', 'chat', 'c'), planches: funny('droit', 'planches', 'a'), manege: funny('droit', 'manege', 'a') }),
    say('La grande boucle', 'The big loop', 'The road makes a big loop before the first fork.', ['canard', 'lapin'], 3, {
        a: fork('boucle', 'canard', 'b'), b: fork('vague', 'lapin', 'moutons'), canard: friend('droit', 'canard', 'a'), lapin: friend('droit', 'lapin', 'a'), moutons: funny('droit', 'moutons', 'b') }),
    say('Le toit orange', 'The orange roof', 'Only roofs, over a bridge, round a roundabout: the orange one is the rabbit’s.', ['lapin'], 2, {
        a: fork('droit+pont', 'b', 'grotte'), b: round('serpent', 'chat', 'lapin', '-'), lapin: friend('droit', 'lapin'), chat: friend('vague', 'chat', 'b'), grotte: funny('droit', 'grotte', 'a') }, true),
    say('Le grand tour', 'The grand tour', 'A tunnel, a bridge and a star bend for two parcels.', ['chat', 'hibou'], 4, {
        a: fork('droit+tunnel', 'b', 'c'), b: fork('vague*', 'chat', 'boue'), c: fork('droit+pont', 'foin', 'hibou'), chat: friend('droit', 'chat', 'a'), hibou: friend('vague', 'hibou', 'a'), boue: funny('droit', 'boue', 'b'), foin: funny('droit', 'foin', 'c') }),
    say('Le zigzag', 'The zigzag', 'A zigzag road with stars, three signs, then two.', ['ours'], 2, {
        a: fork('zigzag*', 'manege', 'b', 'planches'), b: fork('vague', 'ours', 'moutons'), ours: friend('droit', 'ours'), manege: funny('droit', 'manege', 'a'), planches: funny('vague', 'planches', 'a'), moutons: funny('droit', 'moutons', 'b') }),
    say('La dernière tournée', 'The last round', 'Everything together: roundabout, bridge, tunnel, roofs and two parcels.', ['canard', 'chiot'], 4, {
        a: round('droit+pont', 'b', '-', 'c'), b: fork('vague*+tunnel', 'canard', 'boue'), c: fork('serpent', 'chat', 'chiot'), canard: friend('droit', 'canard', 'a'), chiot: friend('vague', 'chiot', 'a'), chat: friend('droit', 'chat', 'c'), boue: funny('droit', 'boue', 'b') }, true)
];
export const handLevels: readonly LevelDef[] = scenes.map((s, i) => ({ id: i + 1, ...s }));
