import { expect, it } from 'vitest';
import { addStroke, appendGallery, clear, deserialize, drawings, fill, HISTORY, MAX_BYTES, MAX_POINTS, palette, parseGallery, pointCount, redo, sample, serialize, SHEET, simplify, start, strokeTolerance, undo, type Point } from '../src/engines/atelier';
import { eraseGallery, readGallery, writeGallery } from '../src/games/atelier/storage';
import { gameView, labels, sheet, underpaint } from '../src/games/atelier/view';

it('ten independent polygon drawings have unique closed finite zones at least 44 real pixels on the phone sheet', () => {
    expect(drawings.map(d=>d.id)).toEqual(['boubou','caliroux','pestouille','tutu','lumi','maison','arbre','poisson','fusee','papillon']);
    for(const d of drawings) {
        expect(new Set(d.zones.map(z=>z.id)).size).toBe(d.zones.length);
        expect(new Set(d.zones.map(z=>z.path)).size).toBe(d.zones.length);
        expect(d.zones.length).toBeGreaterThanOrEqual(3);
        for(const z of d.zones) {
            expect(z.path).toMatch(/^M(?:[\d .ML-]+)Z$/); expect(z.path).not.toMatch(/NaN|Infinity|undefined/);
            // Independent bounds from actual authored path vertices, not engine metadata.
            const pairs=[...z.path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
            const xs=pairs.map(p=>p[0]!), ys=pairs.map(p=>p[1]!);
            expect((Math.max(...xs)-Math.min(...xs))*300/320).toBeGreaterThanOrEqual(44);
            expect((Math.max(...ys)-Math.min(...ys))*300/320).toBeGreaterThanOrEqual(44);
            expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);expect(Math.max(...xs)).toBeLessThanOrEqual(320);
            expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);expect(Math.max(...ys)).toBeLessThanOrEqual(300);
        }
    }
    expect(SHEET).toEqual({width:320,height:300});
});
it('fill is pure, rejects unknown zones, recolours immediately and keeps neighbours distinct', () => {
    const a=start(), b=fill(a,'head'), c=fill({...b,color:palette[1][0]},'head');
    expect(a.art.zones).toEqual({});expect(b.art.zones).toEqual({head:'#ee737a'});expect(c.art.zones).toEqual({head:'#f4a269'});
    expect(fill(c,'missing')).toBe(c);expect(fill(c,'head')).toBe(c);
    expect(fill(c,'body').art.zones).toEqual({head:'#f4a269',body:'#f4a269'});
    expect(clear(c).art.zones).toEqual({});expect(undo(clear(c)).art).toEqual(c.art);
});
it('at least thirty steps undo and redo exactly, stay bounded, and new edits discard redo', () => {
    let s=start();const arts=[s.art];
    for(let i=0;i<70;i++) {s=fill({...s,color:palette[i%12]![0]},'head');arts.push(s.art);}
    expect(s.past.length).toBe(HISTORY);expect(HISTORY).toBeGreaterThanOrEqual(30);
    for(let i=0;i<30;i++) {s=undo(s);expect(s.art).toEqual(arts[69-i]);}
    for(let i=0;i<30;i++) s=redo(s);
    expect(s.art).toEqual(arts[70]);expect(redo(s)).toBe(s);
    const branched=fill({...undo(s),color:'#ffffff'},'body');expect(branched.future).toEqual([]);
    for(let i=0;i<100;i++) s=undo(s);
    expect(s.past).toEqual([]);expect(s.future.length).toBeLessThanOrEqual(HISTORY);expect(undo(s)).toBe(s);
});
// Independent point-to-polyline oracle: no production distance or simplifier is used here.
function distance(p: Point, poly: readonly Point[]): number {
    return Math.min(...poly.slice(1).map((b,i)=>{const a=poly[i]!,dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}));
}
it('noisy long strokes retain their endpoints and shape within 2px with at most 4000 total points', () => {
    const original=Array.from({length:12001},(_,i)=>({x:10+i/40,y:150+65*Math.sin(i/900)+.25*Math.sin(i)}));
    const reduced=simplify(original), s=addStroke(start('boubou','draw'),original);
    expect(reduced[0]).toEqual(original[0]);expect(reduced.at(-1)).toEqual(original.at(-1));
    expect(pointCount(s.art)).toBeLessThanOrEqual(4000);
    for(const p of original) expect(distance(p,s.art.strokes[0]!.points)).toBeLessThanOrEqual(2);
    expect(undo(s).art.strokes).toEqual([]);expect(redo(undo(s)).art).toEqual(s.art);
    let sampled: Point[]=[];
    for(let i=0;i<=100;i++) sampled=sample(sampled,{x:i/10,y:10});
    for(let i=1;i<sampled.length;i++) expect(Math.hypot(sampled[i]!.x-sampled[i-1]!.x,sampled[i]!.y-sampled[i-1]!.y)).toBeGreaterThanOrEqual(2);
    expect(sample(sampled,{x:NaN,y:10})).toEqual(sampled);
});
for(const scale of [.8,1,1.5,2]) {
    it(`300 noisy finger points stay within 2 screen pixels at scale ${scale}`, () => {
        let seed=29;
        const noise=(): number=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32*2-1;};
        // Generate noise in screen pixels, then convert the gesture to sheet units.
        const original=Array.from({length:300},(_,i)=>({
            x:25/scale+i*(SHEET.width-50/scale)/299+noise()/scale,
            y:SHEET.height/2+(35*Math.sin(i/30)+noise())/scale
        }));
        let preview: Point[]=[];
        for(const p of original) preview=sample(preview,p,strokeTolerance(scale));
        const state=addStroke(start('boubou','draw'),original,scale);
        expect(state.art.strokes).toHaveLength(1);
        expect(state.art.flattened).toBeUndefined();
        expect(pointCount(state.art)).toBeLessThanOrEqual(MAX_POINTS);
        const retained=state.art.strokes[0]!.points;
        for(const line of [preview,retained]) {
            expect(line.length).toBeGreaterThan(5);
            expect(line.length).toBeLessThanOrEqual(MAX_POINTS);
            for(const p of original) expect(distance(p,line)*scale).toBeLessThanOrEqual(2);
        }
        for(const [p,q] of [[original[0]!,retained[0]!],[original.at(-1)!,retained.at(-1)!]]) {
            expect(Math.hypot(p!.x-q!.x,p!.y-q!.y)*scale).toBeLessThanOrEqual(2);
        }
        expect(deserialize(serialize(state.art))).toEqual(state.art);
    });
}
it('the total budget flattens earlier strokes within 2px instead of discarding any marks', () => {
    let s=start('boubou','draw');
    for(let n=0;n<60;n++) {
        const points=Array.from({length:300},(_,i)=>({x:10+i,y:20+n*3+(i%2 ? 2 : 0)}));
        s=addStroke(s,points);
        expect(pointCount(s.art)).toBeLessThanOrEqual(4000);
        expect(s.art.strokes.length+(s.art.flattened ?? 0)).toBe(n+1);
        expect(s.art.strokes.at(-1)!.points.at(-1)).toEqual(points.at(-1));
    }
    expect(s.art.underpaint).toHaveLength(24000);
    expect(deserialize(serialize(s.art))).toEqual(s.art);
    expect(new TextEncoder().encode(serialize(s.art)).length).toBeLessThanOrEqual(60*1024);
    expect(clear(s).art.underpaint).toBeUndefined();
});
it('versioned compact serialization round trips both modes and a worst-case 4000-point artwork within 60 KiB', () => {
    for(const mode of ['color','draw'] as const) {
        const s=fill(start('lumi',mode),'head');const raw=serialize(s.art);
        expect(JSON.parse(raw) as object).toMatchObject({v:1});expect(deserialize(raw)).toEqual(s.art);
    }
    const art={...start().art,mode:'draw' as const,strokes:Array.from({length:4000},(_,i)=>({color:palette[i%12]![0],width:18 as const,points:[{x:i%320,y:i%300}]}))};
    const raw=serialize(art);expect(new TextEncoder().encode(raw).length).toBeLessThanOrEqual(60*1024);expect(MAX_BYTES).toBe(60*1024);expect(deserialize(raw)).toEqual(art);
    for(const bad of ['', '{', 'null', raw.replace('"v":1','"v":2'),raw.replace('"m":"draw"','"m":"bad"'),raw.replace('"d":"boubou"','"d":"unknown"'),'x'.repeat(MAX_BYTES+1),JSON.stringify({v:1,d:'boubou',m:'draw',z:[-1,-1,-1,-1,-1,-1],s:'00zzzz'})]) expect(deserialize(bad)).toBeNull();
    const a=addStroke(start(),[{x:20.5,y:30},{x:60,y:80.5}]);expect(deserialize(serialize(a.art))).toEqual(a.art);
});
it('4001 differently coloured isolated marks keep every mark, the vector bound and the complete byte bound', () => {
    const base=start('boubou','draw');
    base.art.strokes=Array.from({length:4000},(_,i)=>({color:palette[i%13]![0],width:4,points:[{x:20+i%280,y:20+i%260}]}));
    const s=addStroke({...base,color:'#727ed1'},[{x:120,y:130}]);
    expect(pointCount(s.art)).toBe(4000);expect(s.art.flattened).toBe(1);
    expect(s.art.underpaint![10*160+10]).toBe('0');
    const cells=s.art.underpaint!.split('').flatMap((c,i)=>c==='d'?[]:[{x:(i%160)*2,y:Math.floor(i/160)*2}]);
    expect(cells).toHaveLength(4);
    for(const cell of cells) for(const dx of [0,2]) for(const dy of [0,2]) expect(Math.max(0,Math.hypot(cell.x+dx-20,cell.y+dy-20)-2)).toBeLessThanOrEqual(2);
    expect(s.art.strokes.at(-1)!.points).toEqual([{x:120,y:130}]);
    const raw=serialize(s.art);expect(new TextEncoder().encode(raw).length).toBeLessThanOrEqual(60*1024);expect(deserialize(raw)).toEqual(s.art);
    expect(undo(s).art).toEqual(base.art);
});
it('local gallery evicts the oldest at twelve, skips each corrupt work and tolerates broken or blocked storage', () => {
    let gallery: string[]=[];
    const works=Array.from({length:13},(_,i)=>serialize({...start().art,zones:{head:palette[i%13]![0]}}));
    for(const work of works) gallery=appendGallery(gallery,deserialize(work)!);
    expect(gallery).toEqual(works.slice(1));expect(parseGallery(JSON.stringify(['bad',...gallery,'{}']))).toEqual(gallery);
    expect(parseGallery('{')).toEqual([]);expect(parseGallery('{}')).toEqual([]);
    let raw: string | null=null;const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}};
    expect(writeGallery(storage,gallery)).toBe(true);expect(readGallery(storage)).toEqual(gallery);
    expect(eraseGallery(storage)).toBe(true);expect(readGallery(storage)).toEqual([]);
    const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
    expect(readGallery(blocked)).toEqual([]);expect(writeGallery(blocked,gallery)).toBe(false);expect(eraseGallery(blocked)).toBe(false);
});
it('twelve colours plus white eraser have complete FR/EN spoken names and creation never shows stars', () => {
    expect(palette).toHaveLength(13);expect(new Set(palette.map(c=>c[0])).size).toBe(13);
    expect(palette.map(c=>c[1])).toEqual(['rouge','orange','jaune','vert clair','vert','turquoise','bleu clair','bleu','violet','rose','marron','gris','gomme']);
    expect(palette.map(c=>c[2])).toEqual(['red','orange','yellow','light green','green','turquoise','light blue','blue','purple','pink','brown','grey','eraser']);
    expect(Object.keys(labels.fr)).toEqual(Object.keys(labels.en));
    for(const locale of ['fr','en'] as const) {const html=gameView(start(),locale);expect(html).not.toMatch(/stars|★|☆/);expect(html.match(/data-color=/g)).toHaveLength(12);expect(html).toContain(labels[locale].done);}
});

it('sampling accepts exactly two units and rejects shorter moves without mutating input', () => {
    const initial=[{x:20,y:20}];
    expect(sample(initial,{x:21.5,y:20})).toEqual(initial);
    expect(sample(initial,{x:22,y:20})).toEqual([...initial,{x:22,y:20}]);
    expect(sample(initial,{x:22.5,y:20})).toEqual([...initial,{x:22.5,y:20}]);
    expect(initial).toEqual([{x:20,y:20}]);
});
it('SVG strokes render every selected colour and all three actual brush widths', () => {
    for(const color of palette.map(c=>c[0])) for(const width of [4,9,18] as const) {
        const s=addStroke({...start('fusee','draw'),color,width},[{x:20,y:30},{x:80,y:50}]);
        expect(sheet(s.art,'en')).toContain(`data-stroke="0" d="M20 30L80 50" fill="none" stroke="${color}" stroke-width="${width}"`);
    }
});
it('sheet and zone accessible names follow the selected locale for every drawing', () => {
    for(const d of drawings) for(const locale of ['fr','en'] as const) {
        const html=gameView(start(d.id),locale);
        expect(html).toContain(`aria-label="${d.names[locale]}" class="atelier-paper"`);
        for(const z of d.zones) expect(html).toContain(`aria-label="${d.names[locale]} ${z.id}"`);
    }
});
it('corrupt raster characters, lengths and inconsistent flattened counters are rejected', () => {
    const base=JSON.parse(serialize(start('boubou','draw').art)) as Record<string,unknown>;
    const r='d'.repeat(24000);
    expect(deserialize(JSON.stringify({...base,r,f:1}))).not.toBeNull();
    for(const patch of [
        {r:'e'+r.slice(1),f:1},{r:'z'+r.slice(1),f:1},{r:'!'+r.slice(1),f:1},
        {r:r.slice(1),f:1},{r:r+'d',f:1},{r:42,f:1},
        {r},{r,f:0},{r,f:-1},{r,f:1.5},{r,f:'1'},{r,f:Number.MAX_SAFE_INTEGER+1},{f:1}
    ]) expect(deserialize(JSON.stringify({...base,...patch}))).toBeNull();
});
it('flattened polylines render the exact coloured grid and stay within 2px of the vector ink', () => {
    const points=[{x:30,y:40},{x:90,y:110},{x:160,y:50},{x:270,y:210}];
    const base=start('boubou','draw');
    base.art.strokes=[{color:'#727ed1',width:9,points},
        {color:'#ee737a',width:4,points:Array.from({length:3996},()=>({x:310,y:290}))}];
    const s=addStroke(base,[{x:10,y:10}]);
    expect(s.art.flattened).toBe(1);
    const expected=new Set<number>();
    for(let y=0;y<150;y++) for(let x=0;x<160;x++) {
        const centre={x:x*2+1,y:y*2+1};
        if(distance(centre,points)<=4.5) expected.add(y*160+x);
    }
    const actual=new Set<number>();
    const html=underpaint(s.art);
    expect(html).toMatch(/^<path d="[^"]+" fill="#727ed1"\/>$/);
    for(const m of html.matchAll(/M(\d+) (\d+)h(\d+)v2H(\d+)Z/g)) {
        const x=Number(m[1]),y=Number(m[2]),width=Number(m[3]);
        expect(Number(m[4])).toBe(x);
        for(let dx=0;dx<width;dx+=2) actual.add(y/2*160+(x+dx)/2);
    }
    expect(actual).toEqual(expected);
    // Both directions: painted cell corners to vector ink, and vector ink to painted cells.
    for(const i of actual) for(const dx of [0,2]) for(const dy of [0,2]) {
        expect(Math.max(0,distance({x:i%160*2+dx,y:Math.floor(i/160)*2+dy},points)-4.5)).toBeLessThanOrEqual(2);
    }
    for(let j=1;j<points.length;j++) {
        const a=points[j-1]!,b=points[j]!;
        for(let step=0;step<=100;step++) {
            const x=a.x+(b.x-a.x)*step/100,y=a.y+(b.y-a.y)*step/100;
            const gap=Math.min(...[...actual].map(i=>Math.hypot(Math.max(i%160*2-x,0,x-(i%160*2+2)),Math.max(Math.floor(i/160)*2-y,0,y-(Math.floor(i/160)*2+2)))));
            expect(gap).toBeLessThanOrEqual(2);
        }
    }
    expect(sheet(s.art,'en')).toContain(html);
});
it('underpaint renders all palette colours including white and skips transparent cells', () => {
    const art={...start('boubou','draw').art,underpaint:'0123456789abcd'+'d'.repeat(24000-14),flattened:1};
    const html=underpaint(art);
    expect(html.match(/<path /g)).toHaveLength(13);
    for(const [i,c] of palette.entries()) expect(html).toContain(`<path d="M${i*2} 0h2v2H${i*2}Z" fill="${c[0]}"/>`);
});
