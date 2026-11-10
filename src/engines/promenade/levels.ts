/** Levels of « La promenade de Lumi », written by hand as scenes: each one has a short title Lumi says and a strong moment
 * that no other scene repeats. A level is one to three floors stacked from top to bottom; the troupe walks the first floor
 * to the right, the second to the left, and so on, going down at the end of each floor.
 *
 * `cells` lists a floor's six or seven cells in WALKING order (index 0 is where the troupe enters it):
 *   `.` plain ground   `G` a ditch (a bridge)   `W` a brick wall (a tunnel)   `F` the lost friend   `B` a sleeping bear
 *   `~` water with a leaf boat moored before it   `D` a moat with a raised drawbridge (its flower is the cell `button`)
 *   `n` a dark cave (a jar of fireflies waits before it)   `C` a tall rock (balloons wait before it)
 *   `M` a mushroom just before the step up   `P` a puddle   `L` a pile of leaves
 * `up` is the walking index where the floor steps up to high ground (a ladder, or a bounce when a mushroom stands before).
 * `top` puts treats in the air (`*`); `arch` is a rainbow arch with three treats from one cell to another: a fork.
 * `end` says how the troupe leaves the floor: `stairs` go down by themselves, `dig` is soft earth to dig through (a hole),
 * `door` is the rainbow door of the last floor. Rules are checked by `problems()` in index.ts and tests/promenade.test.ts.
 * The list is final: it does not depend on any generator, so the levels never change under a player. */
export type End = 'stairs' | 'dig' | 'door';
export interface Floor { cells: string; end: End; up?: number; top?: string; arch?: readonly [number, number] }
export const themes = ['prairie', 'plage', 'neige', 'automne', 'foret', 'montagne', 'nuit', 'pluie'] as const;
export type Theme = typeof themes[number];
export const animals = ['lapin', 'herisson', 'caneton'] as const;
export type Animal = typeof animals[number];
export interface LevelDef {
    id: number; theme: Theme; title: { fr: string; en: string };
    /** The strong moment of the scene, for whoever writes the next ones. */
    moment: string; floors: readonly Floor[]; friend?: Animal; button?: number;
}
type More = Omit<Floor, 'cells' | 'end'>;
const door = (cells: string, more: More = {}): Floor => ({ cells, end: 'door', ...more });
const stairs = (cells: string, more: More = {}): Floor => ({ cells, end: 'stairs', ...more });
const dig = (cells: string, more: More = {}): Floor => ({ cells, end: 'dig', ...more });
const say = (fr: string, en: string) => ({ fr, en });

export const written: readonly LevelDef[] = [
    { id: 1, theme: 'prairie', title: say('Allons nous promener !', 'Off we go for a walk!'), moment: 'the first walk, from the trapdoor to the rainbow door', floors: [door('......')] },
    { id: 2, theme: 'automne', title: say('Un fossé sur le chemin', 'A ditch on the path'), moment: 'the first bridge', floors: [door('...G..')] },
    { id: 3, theme: 'prairie', title: say('Des fraises pour le goûter', 'Strawberries for a snack'), moment: 'strawberries float in the air to pick, then the first slide down', floors: [stairs('......', { top: '..*.*.' }), door('......', { top: '.*....' })] },
    { id: 4, theme: 'automne', title: say('Le mur du verger', 'The orchard wall'), moment: 'the first tunnel, through the orchard wall', floors: [door('...W..', { top: '..*.*.' })] },
    { id: 5, theme: 'plage', title: say('On creuse dans le sable', 'Digging in the sand'), moment: 'the first hole, down through the sand to the beach below', floors: [dig('......', { top: '..*...' }), door('......', { top: '....*.' })] },
    { id: 6, theme: 'montagne', title: say('La grande marche', 'The big step'), moment: 'the first ladder, up to a mountain ledge', floors: [door('......', { up: 3, top: '....*.' })] },
    { id: 7, theme: 'foret', friend: 'lapin', title: say('Un lapin s’est perdu', 'A little rabbit is lost'), moment: 'a lost rabbit joins the troupe and follows it home', floors: [door('...F..', { top: '....*.' })] },
    { id: 8, theme: 'prairie', title: say('Pont ou tunnel ?', 'Bridge or tunnel?'), moment: 'the job buttons show up: a ditch then a wall', floors: [door('..G.W.', { top: '...*..' })] },
    { id: 9, theme: 'foret', friend: 'herisson', title: say('Le hérisson du sous-bois', 'The hedgehog in the woods'), moment: 'a hedgehog found before a ladder', floors: [door('..F...', { up: 4 })] },
    { id: 10, theme: 'foret', title: say('Chut, l’ours fait la sieste', 'Shh, the bear is napping'), moment: 'tickle a sleeping bear: it yawns and steps aside', floors: [door('...B..', { top: '..*...' })] },
    { id: 11, theme: 'montagne', title: say('L’ours de la montagne', 'The mountain bear'), moment: 'a bear asleep on the ledge at the top of a ladder', floors: [door('....B.', { up: 2 })] },
    { id: 12, theme: 'neige', friend: 'lapin', title: say('Le lapin dans la neige', 'The rabbit in the snow'), moment: 'the rabbit comes back, lost in the snow, before a frozen ditch', floors: [stairs('..F...', { top: '....*.' }), door('...G..')] },
    { id: 13, theme: 'foret', title: say('Le champignon rebondissant', 'The bouncy mushroom'), moment: 'boing: the foals bounce up a ledge off a mushroom', floors: [door('..M...', { up: 3, top: '....*.' })] },
    { id: 14, theme: 'neige', title: say('Boing dans la neige', 'Boing in the snow'), moment: 'a bounce at once, then digging down through the snow', floors: [dig('.M....', { up: 2 }), door('......', { top: '..*.*.' })] },
    { id: 15, theme: 'prairie', title: say('Champignon ou échelle ?', 'Mushroom or ladder?'), moment: 'two ledges: one with a mushroom, one without', floors: [stairs('..M...', { up: 3 }), door('......', { up: 3, top: '.*....' })] },
    { id: 16, theme: 'plage', title: say('La feuille-bateau', 'The leaf boat'), moment: 'a big leaf floats the troupe across the water', floors: [door('..~...', { top: '....*.' })] },
    { id: 17, theme: 'plage', title: say('Les petits veulent voir la mer', 'The little ones want to see the sea'), moment: 'a hole in the dunes, then two leaf boats to the sea', floors: [dig('......', { top: '...*.*' }), door('..~.~.')] },
    { id: 18, theme: 'pluie', title: say('Les flaques de pluie', 'Rain puddles'), moment: 'splashing through puddles in the rain, a leaf boat on a pond', floors: [door('.P~PW.', { top: '...*..' })] },
    { id: 19, theme: 'automne', button: 1, title: say('La fleur magique du château', 'The castle’s magic flower'), moment: 'press a flower: the drawbridge comes down', floors: [door('...D..', { top: '....*.' })] },
    { id: 20, theme: 'pluie', button: 1, title: say('Le château sous la pluie', 'The castle in the rain'), moment: 'the flower upstairs lowers the drawbridge downstairs', floors: [stairs('......', { up: 3 }), door('..PD..')] },
    { id: 21, theme: 'prairie', friend: 'caneton', title: say('Le caneton cherche sa maman', 'The duckling looks for its mum'), moment: 'a duckling joins, then a bridge and a tunnel', floors: [stairs('..F...', { top: '....*.' }), door('..G.W.')] },
    { id: 22, theme: 'foret', button: 7, title: say('L’ours devant le château', 'The bear by the castle'), moment: 'a bear naps before the hole, the castle waits below', floors: [dig('..B...'), door('...D..')] },
    { id: 23, theme: 'nuit', title: say('La grotte des lucioles', 'The firefly cave'), moment: 'a jar of fireflies lights up a dark cave', floors: [stairs('..nnn.', { top: '.....*' }), door('..nn..')] },
    { id: 24, theme: 'nuit', title: say('Lucioles et tunnel', 'Fireflies and a tunnel'), moment: 'out of the dark cave straight into a brick wall', floors: [door('..nn.W.', { top: '.....*.' })] },
    { id: 25, theme: 'nuit', friend: 'herisson', title: say('Le hérisson de la nuit', 'The night hedgehog'), moment: 'the hedgehog was hiding in the dark cave', floors: [stairs('..nnF.'), door('......', { up: 3, top: '.*....' })] },
    { id: 26, theme: 'montagne', title: say('La grotte de la montagne', 'The mountain cave'), moment: 'a bounce up to a cave, then a mountain lake', floors: [stairs('.M..nn.', { up: 2 }), door('...~...', { top: '.*.....' })] },
    { id: 27, theme: 'montagne', title: say('Les ballons du rocher', 'Balloons over the rock'), moment: 'balloons carry the foals over tall rocks', floors: [stairs('..C...'), door('...C..', { top: '.*....' })] },
    { id: 28, theme: 'prairie', title: say('Ballons et pont', 'Balloons and a bridge'), moment: 'flying over a rock and landing before a ditch', floors: [door('..C.G.', { top: '...*..' })] },
    { id: 29, theme: 'neige', friend: 'lapin', title: say('Le lapin s’envole', 'The rabbit flies'), moment: 'the rabbit flies with the troupe, a bear sleeps in the snow', floors: [stairs('..F.C.'), door('...B..', { top: '.*....' })] },
    { id: 30, theme: 'automne', title: say('Les feuilles d’automne', 'Autumn leaves'), moment: 'jumping in a pile of leaves, balloons over a rock', floors: [stairs('..L.C.'), door('..W...', { top: '....*.' })] },
    { id: 31, theme: 'prairie', title: say('Le chemin gourmand', 'The tasty path'), moment: 'a rainbow arch full of treats: the tasty way or straight on', floors: [stairs('......', { arch: [1, 4] }), door('......', { arch: [1, 4] })] },
    { id: 32, theme: 'plage', title: say('L’arc-en-ciel de la plage', 'A rainbow on the beach'), moment: 'a rainbow arch, then a leaf boat', floors: [door('.....~.', { arch: [1, 3] })] },
    { id: 33, theme: 'foret', title: say('Gourmand ou courageux ?', 'Tasty or brave?'), moment: 'a fork before the hole, a bear and a ditch below', floors: [dig('......', { arch: [1, 4] }), door('..B.G.')] },
    { id: 34, theme: 'pluie', friend: 'caneton', title: say('Le caneton sous la pluie', 'The duckling in the rain'), moment: 'the duckling found after a boat ride, then a ditch and a ladder', floors: [stairs('.P~.F.'), door('..G...', { up: 4, top: '*.....' })] },
    { id: 35, theme: 'neige', title: say('Trois marches de neige', 'Three snowy steps'), moment: 'going up on each of three floors', floors: [dig('......', { up: 3 }), stairs('..M...', { up: 3 }), door('......', { up: 3, top: '*.....' })] },
    { id: 36, theme: 'automne', button: 5, title: say('Le château d’automne', 'The autumn castle'), moment: 'the flower is far up, the drawbridge in the middle, a bear at the bottom', floors: [stairs('..W.L.'), stairs('...D..'), door('..B.G.')] },
    { id: 37, theme: 'nuit', title: say('Ballons dans la nuit', 'Balloons in the night'), moment: 'fireflies, then balloons under the moon', floors: [stairs('..nn..'), dig('..C...'), door('...W..', { top: '.*....' })] },
    { id: 38, theme: 'montagne', friend: 'herisson', title: say('Le grand voyage du hérisson', 'The hedgehog’s big trip'), moment: 'the hedgehog climbs, digs and flies with the troupe', floors: [dig('..F...', { up: 4 }), stairs('..C.G.'), door('......', { top: '...*..' })] },
    { id: 39, theme: 'plage', title: say('Le bateau et l’arc-en-ciel', 'The boat and the rainbow'), moment: 'a boat, a wall, a hole, then a rainbow by the sea', floors: [dig('..~.W.'), door('......', { arch: [1, 4] })] },
    { id: 40, theme: 'foret', title: say('La sieste des trois ours', 'Three bears napping'), moment: 'three bears to tickle in a row', floors: [dig('..B.B.'), door('..B.G.')] },
    { id: 41, theme: 'pluie', button: 7, title: say('Les flaques et le château', 'Puddles and the castle'), moment: 'the flower is on the floor below the drawbridge', floors: [dig('.PD.W.'), stairs('...M..', { up: 4 }), door('..G...', { top: '....*.' })] },
    { id: 42, theme: 'nuit', friend: 'lapin', title: say('Le lapin et les lucioles', 'The rabbit and the fireflies'), moment: 'the rabbit in the cave, then a night boat ride', floors: [stairs('..nnF.'), dig('..G...', { up: 4 }), door('..~...', { top: '....*.' })] },
    { id: 43, theme: 'montagne', title: say('Le sommet aux ballons', 'Balloon summit'), moment: 'balloons over a rock on the highest ledge', floors: [stairs('..C...', { up: 4 }), dig('.M..C.', { up: 2 }), door('......', { top: '.*.*..' })] },
    { id: 44, theme: 'automne', title: say('Le chemin des pommes', 'The apple path'), moment: 'an arch of apples, then a bear before the water', floors: [stairs('......', { arch: [1, 4] }), dig('..W...'), door('..B.~.')] },
    { id: 45, theme: 'neige', button: 4, title: say('Le château de neige', 'The snow castle'), moment: 'a snow castle at the top, a rock to fly over at the bottom', floors: [stairs('..D...'), dig('..G...'), door('...C..', { top: '.*....' })] },
    { id: 46, theme: 'prairie', friend: 'caneton', title: say('Le caneton et l’ours', 'The duckling and the bear'), moment: 'the duckling next to a sleeping bear', floors: [stairs('..F.B.'), dig('..M...', { up: 3 }), door('..W.G.')] },
    { id: 47, theme: 'nuit', title: say('La forêt des lucioles', 'The firefly forest'), moment: 'a long dark cave, leaves, a rock and a ditch at night', floors: [stairs('..nnn.'), dig('.L.W..'), door('..C.G.')] },
    { id: 48, theme: 'plage', title: say('La grande traversée', 'The big crossing'), moment: 'two boats in a row, then a rainbow on the last floor', floors: [stairs('..~.~.'), dig('...G..'), door('......', { arch: [1, 4] })] },
    { id: 49, theme: 'montagne', button: 13, title: say('L’ours du sommet', 'The bear on the summit'), moment: 'a bear on the top ledge and a castle at the bottom', floors: [dig('..W...', { up: 4 }), stairs('.M..B.', { up: 2 }), door('...D..')] },
    { id: 50, theme: 'pluie', friend: 'herisson', title: say('Après la pluie', 'After the rain'), moment: 'the hedgehog under the rain, then a ladder in the sun', floors: [stairs('.P~.F.'), dig('.P.W..'), door('......', { up: 3, top: '.*....' })] },
    { id: 51, theme: 'nuit', title: say('La nuit étoilée', 'The starry night'), moment: 'a rainbow under the stars, a cave, a rock and a bear', floors: [stairs('......', { arch: [1, 4] }), dig('..nn..'), door('..C.B.')] },
    { id: 52, theme: 'prairie', friend: 'lapin', button: 5, title: say('Le grand retour de Lumi', 'Lumi’s big homecoming'), moment: 'everything at once on the way home with the rabbit', floors: [stairs('..F.G..'), dig('..D..C.'), door('.M.....', { up: 2, top: '...*.*.' })] }
];
