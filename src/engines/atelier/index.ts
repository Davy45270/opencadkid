import { blank, drawings, SHEET, type Drawing } from './drawings';
export { blank, drawings, SHEET } from './drawings';
/** Every sheet the child can pick: the ten colouring models, then a blank page. */
export const sheets: readonly Drawing[] = [...drawings, blank];
const sheetOf = (id: string): Drawing | undefined => sheets.find(d => d.id === id);
/** The paper behind the drawing, coloured like any zone. */
export const BACKGROUND = 'fond';
export const palette = [
    ['#ee737a','rouge','red'], ['#f4a269','orange','orange'], ['#f6d76d','jaune','yellow'], ['#acd26e','vert clair','light green'],
    ['#58ad87','vert','green'], ['#62c9c5','turquoise','turquoise'], ['#72b8ed','bleu clair','light blue'], ['#727ed1','bleu','blue'],
    ['#ab83cc','violet','purple'], ['#ed9fc7','rose','pink'], ['#b78c70','marron','brown'], ['#666678','gris','grey'], ['#ffffff','gomme','eraser']
] as const;
export type Color = typeof palette[number][0];
export type Mode = 'color' | 'draw';
export interface Point { x: number; y: number }
export interface Stroke { color: Color; width: 4 | 9 | 18; points: Point[] }
export interface Artwork { drawing: string; mode: Mode; zones: Record<string, Color>; strokes: Stroke[]; underpaint?: string; flattened?: number }
export interface State { art: Artwork; color: Color; width: Stroke['width']; past: Artwork[]; future: Artwork[] }
export const MAX_POINTS = 4000, MAX_BYTES = 60 * 1024, HISTORY = 40;
export function start(drawing = 'boubou', mode: Mode = 'color'): State { return { art: { drawing: sheetOf(drawing) ? drawing : 'boubou', mode, zones: {}, strokes: [] }, color: palette[0][0], width: 9, past: [], future: [] }; }
export function change(state: State, art: Artwork): State { return { ...state, art, past: [...state.past, state.art].slice(-HISTORY), future: [] }; }
export function fill(state: State, zone: string): State {
    if ((zone !== BACKGROUND && !sheetOf(state.art.drawing)!.zones.some(z => z.id === zone)) || state.art.zones[zone] === state.color) return state;
    return change(state, { ...state.art, zones: { ...state.art.zones, [zone]: state.color } });
}
export function undo(state: State): State { const art = state.past.at(-1); return art ? { ...state, art, past: state.past.slice(0,-1), future: [state.art, ...state.future].slice(0,HISTORY) } : state; }
export function redo(state: State): State { const art = state.future[0]; return art ? { ...state, art, past: [...state.past,state.art].slice(-HISTORY), future: state.future.slice(1) } : state; }
export function clear(state: State): State { const art: Artwork={...state.art,zones:{},strokes:[]};delete art.underpaint;delete art.flattened;return change(state,art); }
export function pointCount(art: Artwork): number { return art.strokes.reduce((n,s) => n+s.points.length,0); }
export function segmentDistance(p: Point, a: Point, b: Point): number {
    const dx=b.x-a.x, dy=b.y-a.y, t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
    return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
/** Iterative Ramer–Douglas–Peucker, without recursion or a stack-depth limit. */
export function simplify(points: readonly Point[], tolerance = 1): Point[] {
    if (points.length < 3) return points.map(p => ({ ...p }));
    const keep=new Set([0,points.length-1]), stack: [number,number][]=[[0,points.length-1]];
    while (stack.length) {
        const [a,b]=stack.pop()!; let far=tolerance, at=-1;
        for(let i=a+1;i<b;i++) { const d=segmentDistance(points[i]!,points[a]!,points[b]!); if(d>far) { far=d; at=i; } }
        if(at>=0) { keep.add(at); stack.push([a,at],[at,b]); }
    }
    return [...keep].sort((a,b)=>a-b).map(i=>({ ...points[i]! }));
}
/** Reserve half-unit coordinate rounding inside a 1.5 CSS-pixel error budget. */
export function strokeTolerance(scale: number): number {
    return Math.max(0, 1.5 / scale - Math.SQRT2 / 4);
}
export function sample(points: readonly Point[], p: Point, step = 2): Point[] {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return [...points];
    const next={x:Math.round(Math.max(0,Math.min(SHEET.width,p.x))*2)/2,y:Math.round(Math.max(0,Math.min(SHEET.height,p.y))*2)/2};
    const last=points.at(-1);
    return last && Math.hypot(last.x-next.x,last.y-next.y)<step ? [...points] : [...points,next];
}
/** When vector detail reaches the budget, flatten oldest strokes to a 2-unit
 * colour grid. Marks remain visible (including isolated dots); no stroke is dropped.
 * Pixel centres are at most sqrt(2) units from their cell corners. */
export const RASTER_WIDTH = 160, RASTER_HEIGHT = 150;
function flatten(base: string | undefined, stroke: Stroke): string {
    const cells=(base ?? 'd'.repeat(RASTER_WIDTH*RASTER_HEIGHT)).split('');
    const ink=palette.findIndex(c=>c[0]===stroke.color).toString(16), radius=stroke.width/2;
    const mark=(a:Point,b:Point): void=>{
        const x0=Math.max(0,Math.floor((Math.min(a.x,b.x)-radius)/2)),x1=Math.min(RASTER_WIDTH-1,Math.floor((Math.max(a.x,b.x)+radius)/2));
        const y0=Math.max(0,Math.floor((Math.min(a.y,b.y)-radius)/2)),y1=Math.min(RASTER_HEIGHT-1,Math.floor((Math.max(a.y,b.y)+radius)/2));
        for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if(segmentDistance({x:x*2+1,y:y*2+1},a,b)<=radius) cells[y*RASTER_WIDTH+x]=ink;
    };
    if(stroke.points.length===1) mark(stroke.points[0]!,stroke.points[0]!);
    else for(let i=1;i<stroke.points.length;i++) mark(stroke.points[i-1]!,stroke.points[i]!);
    return cells.join('');
}
export function addStroke(state: State, points: readonly Point[], scale = 1): State {
    const clean=points.filter(p=>Number.isFinite(p.x) && Number.isFinite(p.y)).map(p=>({x:Math.round(Math.max(0,Math.min(SHEET.width,p.x))*2)/2,y:Math.round(Math.max(0,Math.min(SHEET.height,p.y))*2)/2}));
    if (!clean.length) return state;
    const strokes=[...state.art.strokes,{color:state.color,width:state.width,points:simplify(clean,strokeTolerance(scale))}];
    let total=strokes.reduce((n,s)=>n+s.points.length,0), underpaint=state.art.underpaint, flattened=state.art.flattened ?? 0;
    while(total>MAX_POINTS) {const oldest=strokes.shift()!;underpaint=flatten(underpaint,oldest);flattened++;total-=oldest.points.length;}
    const art: Artwork={...state.art,strokes};
    if(underpaint) {art.underpaint=underpaint;art.flattened=flattened;}
    return change(state,art);
}
const colorIndex = (color: Color): number => palette.findIndex(p=>p[0]===color);
const widths = [4,9,18] as const;
const encodeNumber = (n: number): string => Math.round(n*2).toString(36).padStart(2,'0');
export function serialize(art: Artwork): string {
    const d=sheetOf(art.drawing)!;
    const data=JSON.stringify({v:2,d:art.drawing,m:art.mode,z:d.zones.map(z=>art.zones[z.id] ? colorIndex(art.zones[z.id]!) : -1),b:art.zones[BACKGROUND] ? colorIndex(art.zones[BACKGROUND]) : -1,s:art.strokes.map(s=>colorIndex(s.color).toString(36)+widths.indexOf(s.width).toString()+s.points.map(p=>encodeNumber(p.x)+encodeNumber(p.y)).join('')).join('|'),r:art.underpaint,f:art.flattened});
    if(new TextEncoder().encode(data).length>MAX_BYTES || pointCount(art)>MAX_POINTS) throw new RangeError('Artwork is too large');
    return data;
}
export function deserialize(raw: string): Artwork | null {
    try {
        if(raw.length>MAX_BYTES || new TextEncoder().encode(raw).length>MAX_BYTES) return null;
        const v: unknown=JSON.parse(raw); if(!v || typeof v!=='object') return null;
        const a=v as Record<string,unknown>, d=typeof a.d==='string' ? (a.v===1 ? drawings.find(d=>d.id===a.d) : sheetOf(a.d)) : undefined;
        if((a.v!==1 && a.v!==2) || !d || (a.m!=='color' && a.m!=='draw') || !Array.isArray(a.z) || a.z.length!==d.zones.length || typeof a.s!=='string') return null;
        const zones: Record<string,Color>={};
        for(const [i,c] of a.z.entries()) { if(typeof c!=='number' || !Number.isInteger(c) || c < -1 || c>=palette.length) return null; if(c>=0) zones[d.zones[i]!.id]=palette[c]![0]; }
        const strokes: Stroke[]=[]; let total=0;
        for(const s of a.s ? a.s.split('|') : []) {
            if(!/^[0-9a-c][0-2](?:[0-9a-z]{4})+$/.test(s)) return null;
            const points: Point[]=[];
            for(let i=2;i<s.length;i+=4) { const x=parseInt(s.slice(i,i+2),36)/2,y=parseInt(s.slice(i+2,i+4),36)/2; if(x>SHEET.width || y>SHEET.height) return null; points.push({x,y}); }
            total+=points.length; if(total>MAX_POINTS) return null;
            strokes.push({color:palette[parseInt(s[0]!,36)]![0],width:widths[Number(s[1])]!,points});
        }
        if(a.v===2 && a.b!==undefined) { if(typeof a.b!=='number' || !Number.isInteger(a.b) || a.b < -1 || a.b>=palette.length) return null; if(a.b>=0) zones[BACKGROUND]=palette[a.b]![0]; }
        const art: Artwork={ drawing:d.id,mode:a.m,zones,strokes };
        if(a.r!==undefined) {if(typeof a.r!=='string' || a.r.length!==RASTER_WIDTH*RASTER_HEIGHT || !/^[0-9a-d]+$/.test(a.r) || typeof a.f!=='number' || !Number.isSafeInteger(a.f) || a.f<1) return null;art.underpaint=a.r;art.flattened=a.f;}
        else if(a.f!==undefined) return null;
        return a.v===1 ? legacy(art) : art;
    } catch { return null; }
}
/** Version 1 showed either the zones (colour mode) or the strokes on a blank page (draw mode), never both.
 * Keep exactly what the child saw: a drawn work moves to the blank page, a coloured one keeps its zones only. */
function legacy(art: Artwork): Artwork {
    if(art.mode==='draw') { const moved: Artwork={drawing:blank.id,mode:'draw',zones:{},strokes:art.strokes}; if(art.underpaint) {moved.underpaint=art.underpaint;moved.flattened=art.flattened!;} return moved; }
    return {drawing:art.drawing,mode:'color',zones:art.zones,strokes:[]};
}
/** A new picture starts on fresh paper, in colouring mode (the blank page starts with the brush):
 * colours, brush marks and flattened marks belong to the previous sheet. */
export function choose(state: State, drawing: string): State {
    const d=sheetOf(drawing); if(!d || d.id===state.art.drawing) return state;
    return change(state,{drawing:d.id,mode:d.zones.length ? 'color' : 'draw',zones:{},strokes:[]});
}
export function appendGallery(gallery: readonly string[], art: Artwork): string[] { return [...gallery.filter(s=>deserialize(s)),serialize(art)].slice(-12); }
export function parseGallery(raw: string | null): string[] { try { const v: unknown=JSON.parse(raw ?? 'null'); return Array.isArray(v) ? v.filter((s): s is string=>typeof s==='string' && deserialize(s)!==null).slice(-12) : []; } catch { return []; } }
