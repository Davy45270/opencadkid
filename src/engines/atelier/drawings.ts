export interface Zone { id: string; path: string }
export interface Drawing { id: string; names: { fr: string; en: string }; zones: readonly Zone[]; ink: string }
const polygon = (id: string, points: number[][]): Zone => ({ id, path: points.map((p, i) => `${i ? 'L' : 'M'}${p.join(' ')}`).join('') + 'Z' });
const box = (id: string, x: number, y: number, w: number, h: number): Zone => polygon(id, [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
// Polygonal rounded silhouettes keep every coloured part large and separately reachable.
const oval = (id: string, x: number, y: number, w: number, h: number): Zone => polygon(id, Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12; return [Math.round(x + w/2 + Math.cos(a)*w/2), Math.round(y + h/2 + Math.sin(a)*h/2)]; }));
function guide(id: string, fr: string, en: string, kind: number): Drawing {
    const zones = [oval('body',110,163,100,kind === 3 ? 54 : 92), oval('head',100,72,120,88), oval('left-foot',kind === 3 ? 25 : 53,218,54,55), oval('right-foot',kind === 3 ? 241 : 213,218,54,55)];
    if (kind === 2) zones.push(polygon('left-wing',[[103,153],[29,111],[34,189],[103,209]]),polygon('right-wing',[[217,153],[291,111],[286,189],[217,209]]));
    else zones.push(oval('left-ear',45,26,56,58),oval('right-ear',219,26,56,58));
    if (kind === 4) zones.push(polygon('horn',[[132,68],[160,12],[188,68]]));
    if (kind === 1) zones.push(polygon('tail',[[218,164],[285,135],[280,207],[218,215]]));
    if (kind === 3) zones.push(polygon('tutu',[[109,222],[211,222],[241,278],[79,278]]));
    const ink = '<path d="M132 111h4m48 0h4M149 133q11 10 22 0" fill="none" stroke="#58443b" stroke-width="5" stroke-linecap="round"/>' + (kind === 0 ? '<path d="M118 100l26 21m58 -21l-26 21" stroke="#58443b" stroke-width="10" stroke-linecap="round"/>' : '');
    return { id, names: { fr, en }, zones, ink };
}
export const drawings: readonly Drawing[] = [
    guide('boubou','Boubou','Boubou',0), guide('caliroux','CaliRoux','CaliRoux',1), guide('pestouille','Pestouille','Pestouille',2), guide('tutu','Tutu','Tutu',3), guide('lumi','Lumi','Lumi',4),
    { id:'maison', names:{fr:'Maison',en:'House'}, zones:[polygon('roof',[[45,117],[160,25],[275,117]]),box('wall-left',65,122,92,140),box('wall-right',163,122,92,140)], ink:'<path d="M91 154h42v46H91ZM186 211h43v51" fill="none" stroke="#58443b" stroke-width="3"/>' },
    { id:'arbre', names:{fr:'Arbre',en:'Tree'}, zones:[box('trunk',133,185,54,92),oval('crown-left',30,82,100,110),oval('crown-top',112,20,96,130),oval('crown-right',210,82,80,110)], ink:'' },
    { id:'poisson', names:{fr:'Poisson',en:'Fish'}, zones:[oval('body',77,79,159,142),polygon('tail',[[242,150],[303,94],[303,206]]),polygon('fin',[[109,73],[160,17],[200,73]])], ink:'<path d="M109 136h4M116 173q18 12 30 0" fill="none" stroke="#58443b" stroke-width="5" stroke-linecap="round"/>' },
    { id:'fusee', names:{fr:'Fusée',en:'Rocket'}, zones:[polygon('nose',[[110,90],[160,17],[210,90]]),box('cabin',110,96,100,116),polygon('left-fin',[[104,155],[48,211],[48,266],[104,211]]),polygon('right-fin',[[216,155],[272,211],[272,266],[216,211]]),polygon('flame',[[131,219],[189,219],[160,286]])], ink:'<circle cx="160" cy="144" r="26" fill="none" stroke="#58443b" stroke-width="3"/>' },
    { id:'papillon', names:{fr:'Papillon',en:'Butterfly'}, zones:[oval('left-top',20,35,105,105),oval('right-top',195,35,105,105),oval('left-bottom',32,149,93,105),oval('right-bottom',195,149,93,105),oval('body',132,83,56,172)], ink:'<path d="M146 83l-22 -38m50 38l22 -38" stroke="#58443b" stroke-width="3"/>' }
];
export const SHEET = { width: 320, height: 300 } as const;
