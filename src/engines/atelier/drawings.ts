export interface Zone { id: string; path: string }
export interface Drawing { id: string; names: { fr: string; en: string }; zones: readonly Zone[]; ink: string }
type Point = readonly [number, number];
const polygon = (id: string, points: readonly Point[]): Zone => ({ id, path: points.map((p, i) => `${i ? 'L' : 'M'}${p.map(n => Math.round(n * 100) / 100).join(' ')}`).join('') + 'Z' });
// Sample authored quadratic contours into the same closed polygons used by hit testing.
function contour(id: string, start: Point, curves: readonly (readonly [Point, Point])[]): Zone {
    const points: Point[] = [start]; let a = start;
    for (const [c, b] of curves) {
        for (let i = 1; i <= 12; i++) { const t = i / 12, u = 1 - t; points.push([u*u*a[0]+2*u*t*c[0]+t*t*b[0], u*u*a[1]+2*u*t*c[1]+t*t*b[1]]); }
        a = b;
    }
    return polygon(id, points);
}
const oval = (id: string, x: number, y: number, w: number, h: number): Zone => polygon(id, Array.from({ length: 64 }, (_, i): Point => { const a = i * Math.PI / 32; return [x+w/2+Math.cos(a)*w/2,y+h/2+Math.sin(a)*h/2]; }));
const panel = (id: string, x: number, y: number, w: number, h: number): Zone => contour(id,[x+10,y],[[[x+w,y],[x+w,y+10]],[[x+w,y+h],[x+w-10,y+h]],[[x,y+h],[x,y+h-10]],[[x,y],[x+10,y]]]);
const line = (d: string, feature = 'detail'): string => `<path data-feature="${feature}" d="${d}" fill="none" stroke="#58443b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
// Faces have no eyebrows. Every mouth is a single upward-open smile, separate from details.
const face = (x = 160, y = 115): string => `<g data-face="smiling">${line(`M${x-37} ${y-8}v8M${x+37} ${y-8}v8`,'eyes')}${line(`M${x-15} ${y+23}Q${x} ${y+39} ${x+15} ${y+23}`,'mouth')}${line(`M${x-4} ${y+10}Q${x} ${y+14} ${x+4} ${y+10}`,'nose')}</g>`;
const drawing = (id: string, fr: string, en: string, zones: Zone[], ink = ''): Drawing => ({ id, names: { fr, en }, zones, ink });
const head = (): Zone => contour('head',[75,105],[[[70,54],[118,57]],[[160,38],[202,57]],[[250,54],[245,105]],[[260,174],[160,177]],[[60,174],[75,105]]]);
const body = (): Zone => contour('body',[108,177],[[[160,161],[212,177]],[[239,237],[205,262]],[[160,278],[115,262]],[[81,237],[108,177]]]);
const feet = (): Zone[] => [oval('left-foot',82,244,60,49),oval('right-foot',178,244,60,49)];
const roundEars = (): Zone[] => [oval('left-ear',51,24,60,60),oval('right-ear',209,24,60,60)];
const pointedEars = (): Zone[] => [contour('left-ear',[70,87],[[[45,7],[84,24]],[[120,43],[119,87]],[[94,99],[70,87]]]),contour('right-ear',[201,87],[[[200,43],[236,24]],[[275,7],[250,87]],[[226,99],[201,87]]])];
const tail = (id: string): Zone => contour(id,[217,203],[[[303,145],[298,214]],[[298,280],[235,259]],[[211,248],[217,203]]]);
export const drawings: readonly Drawing[] = [
    drawing('boubou','Boubou','Boubou',[
        ...roundEars(),...feet(),body(),head(),
        oval('left-eye-patch',94,79,52,61),oval('right-eye-patch',174,79,52,61),
        contour('bamboo-leaves',[12,211],[[[5,157],[61,161]],[[83,195],[60,223]],[[34,239],[12,211]]]),
        contour('basket',[240,230],[[[268,219],[301,230]],[[298,286],[270,288]],[[241,286],[240,230]]])
    ],face()+line('M34 222L53 169M27 184L45 194L62 183M248 245Q270 254 295 245M253 232L258 280M276 230L281 280')),
    drawing('caliroux','CaliRoux','CaliRoux',[
        tail('striped-tail'),...pointedEars(),...feet(),body(),head(),
        contour('left-cheek',[76,109],[[[97,91],[130,130]],[[145,160],[104,162]],[[70,151],[76,109]]]),
        contour('right-cheek',[244,109],[[[223,91],[190,130]],[[175,160],[216,162]],[[250,151],[244,109]]])
    ],face()+line('M246 199Q270 218 297 204M235 223Q263 244 294 232M235 250Q255 263 279 263M70 47L88 67M250 47L232 67')),
    drawing('pestouille','Pestouille','Pestouille',[
        contour('left-wing',[92,183],[[[34,191],[10,113]],[[40,132],[34,83]],[[87,95],[105,150]],[[113,176],[92,183]]]),
        contour('right-wing',[228,183],[[[286,191],[310,113]],[[280,132],[286,83]],[[233,95],[215,150]],[[207,176],[228,183]]]),
        tail('dragon-tail'),...feet(),body(),
        contour('left-horn',[88,79],[[[52,43],[83,9]],[[78,41],[136,67]],[[119,88],[88,79]]]),
        contour('right-horn',[232,79],[[[268,43],[237,9]],[[242,41],[184,67]],[[201,88],[232,79]]]),head(),
        panel('book-left',102,209,57,60),panel('book-right',161,209,57,60)
    ],face()+line('M21 126L80 160L49 151M299 126L240 160L271 151M111 225L147 232M111 242L147 249M173 232L207 225M173 249L207 242')),
    drawing('tutu','Tutu','Tutu',[
        tail('curled-tail'),...roundEars(),...feet(),body(),head(),
        contour('face-mask',[95,96],[[[98,59],[160,87]],[[222,59],[225,110]],[[229,165],[160,169]],[[90,165],[95,96]]]),
        contour('tutu',[106,216],[[[160,236],[214,216]],[[232,240],[249,265]],[[221,286],[192,274]],[[162,297],[132,276]],[[100,292],[71,265]],[[87,237],[106,216]]]),
        oval('flower',249,30,55,55)
    ],face()+line('M111 239L99 266M141 245L136 278M179 245L190 276M209 239L225 268M274 42Q255 60 279 72Q297 55 274 42M249 213Q280 193 283 228Q281 249 264 239')),
    drawing('lumi','Lumi','Lumi',[
        tail('flowing-tail'),...pointedEars(),...feet(),body(),
        contour('head',[95,64],[[[149,39],[190,72]],[[210,92],[211,114]],[[259,125],[248,157]],[[231,186],[190,174]],[[155,170],[132,149]],[[81,126],[95,64]]]),
        contour('mane',[79,61],[[[18,71],[48,120]],[[10,157],[59,192]],[[112,185],[96,147]],[[66,119],[103,89]],[[118,65],[79,61]]]),
        contour('horn',[137,64],[[[143,29],[162,7]],[[182,31],[187,64]],[[162,80],[137,64]]]),
        contour('chest-star',[160,187],[[[175,207],[191,211]],[[181,228],[185,249]],[[160,244],[135,249]],[[139,228],[129,211]],[[145,207],[160,187]]])
    ],face()+line('M55 86Q82 102 63 132Q43 157 72 172M247 216Q279 204 284 239M147 40L177 48M112 264L127 264M192 264L210 264')),
    drawing('maison','Maison','House',[
        panel('wall',55,125,210,160),
        panel('chimney',221,31,49,75),
        contour('roof',[25,132],[[[85,67],[160,23]],[[235,67],[295,132]],[[160,149],[25,132]]]),
        panel('door',135,213,50,72),panel('left-window',72,157,50,50),panel('right-window',198,157,50,50),
        oval('attic-window',135,79,50,50),oval('sun',8,15,50,50)
    ],line('M97 159V205M74 182H120M223 159V205M200 182H246M173 249v5M143 97Q160 87 177 97')),
    drawing('arbre','Arbre','Tree',[
        contour('trunk',[132,149],[[[160,135],[183,149]],[[175,229],[194,287]],[[160,276],[120,287]],[[144,219],[132,149]]]),
        oval('crown-left',30,75,100,108),oval('crown-right',190,75,100,108),oval('crown-top',106,12,108,108),
        oval('apple-left',64,119,49,49),oval('apple-top',135,58,49,49),oval('apple-right',207,119,49,49),
        contour('fallen-leaf',[22,265],[[[21,205],[80,210]],[[80,267],[22,265]]])
    ],line('M155 218Q172 200 163 183M155 248L166 261M31 255L69 219M85 128q0 -9 9 -12M156 67q0 -9 9 -12M228 128q0 -9 9 -12')),
    drawing('poisson','Poisson','Fish',[
        contour('tail',[228,151],[[[271,100],[303,100]],[[289,151],[303,208]],[[271,208],[228,151]]]),
        contour('top-fin',[103,95],[[[135,22],[188,56]],[[208,80],[204,107]],[[147,115],[103,95]]]),
        contour('bottom-fin',[112,204],[[[143,267],[198,251]],[[218,232],[207,200]],[[160,190],[112,204]]]),
        contour('body',[32,151],[[[49,79],[136,83]],[[216,79],[248,151]],[[216,229],[136,226]],[[49,229],[32,151]]]),
        contour('gill',[118,87],[[[158,148],[118,223]],[[170,234],[183,199]],[[210,149],[180,101]],[[154,78],[118,87]]]),
        oval('side-fin',166,130,58,54),oval('bubble-top',16,15,49,49),oval('bubble-bottom',21,241,49,49)
    ],line('M68 128v8')+line('M58 164Q73 180 88 164','mouth')+line('M183 145L211 158M254 150L286 123M254 157L286 183')),
    drawing('fusee','Fusée','Rocket',[
        contour('left-fin',[105,166],[[[45,184],[35,258]],[[76,254],[112,221]],[[119,190],[105,166]]]),
        contour('right-fin',[215,166],[[[275,184],[285,258]],[[244,254],[208,221]],[[201,190],[215,166]]]),
        contour('flame',[132,234],[[[111,266],[160,298]],[[209,266],[188,234]],[[160,221],[132,234]]]),
        panel('cabin',105,91,110,151),
        contour('nose',[105,91],[[[116,44],[160,10]],[[204,44],[215,91]],[[160,108],[105,91]]]),
        oval('window',132,118,56,56),panel('hatch',133,187,54,51),
        oval('planet',15,22,52,52),oval('moon',253,51,51,51)
    ],line('M144 132L173 151M150 202H171M143 216H177M147 257L160 280L174 257M20 53Q40 68 65 45')),
    drawing('papillon','Papillon','Butterfly',[
        contour('left-top',[132,147],[[[16,150],[17,56]],[[24,2],[88,35]],[[128,63],[132,147]]]),
        contour('right-top',[188,147],[[[304,150],[303,56]],[[296,2],[232,35]],[[192,63],[188,147]]]),
        contour('left-bottom',[133,153],[[[29,132],[28,223]],[[39,282],[94,263]],[[133,239],[133,153]]]),
        contour('right-bottom',[187,153],[[[291,132],[292,223]],[[281,282],[226,263]],[[187,239],[187,153]]]),
        oval('left-top-spot',43,62,55,62),oval('right-top-spot',222,62,55,62),oval('left-bottom-spot',53,186,51,51),oval('right-bottom-spot',216,186,51,51),
        oval('body',135,110,50,151),oval('head',135,58,50,53)
    ],line('M146 60Q117 13 107 43M174 60Q203 13 213 43M148 80v2M172 80v2')+line('M150 92Q160 104 170 92','mouth')+line('M147 150H173M143 177H177M143 204H177'))
];
export const SHEET = { width: 320, height: 300 } as const;
