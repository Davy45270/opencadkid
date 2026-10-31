import { addStroke, appendGallery, change, clear, deserialize, drawings, fill, palette, pointCount, redo, sample, SHEET, start, undo, type Point, type State } from '../../engines/atelier';
import { acceptActivation, bindAction, recordActivation } from '../../shell/activation';
import { screenToZone } from '../../shell/coordinates';
import type { Locale } from '../../shell/i18n';
import type { StoragePort } from '../../shell/storage';
import { characterSvg } from '../../characters/svg';
import { gameView, labels, sheet, strokePath, thumbnail } from './view';
import { readGallery, writeGallery } from './storage';
export interface Studio { state: State; revision: number }
export function snapshot(studio: Studio): object { const s=studio.state; return { ...s.art, tool:s.art.mode, color:s.color, width:s.width, strokeCount:s.art.strokes.length+(s.art.flattened ?? 0), pointCount:pointCount(s.art), undoSize:s.past.length, redoSize:s.future.length }; }
export function mount(root: HTMLElement, studio: Studio, locale: Locale, storage: StoragePort | undefined, speak: (parts:string[])=>void, home: ()=>void): ()=>void {
    const t=labels[locale];
    let pointer: number | undefined, points: Point[]=[], preview: Point[]=[], disposed=false, savedRevision=-1;
    const abort=new AbortController();
    const state=(): State=>studio.state;
    const set=(s:State): void=>{ if(s!==studio.state) { studio.state=s; studio.revision++; } };
    const draw=(): void=>{
        root.innerHTML=gameView(state(),locale); bind();
    };
    const controls=(): void=>{
        for(const key of ['undo','redo']) root.querySelector<HTMLButtonElement>(`[data-tool="${key}"]`)!.disabled=key==='undo' ? !state().past.length : !state().future.length;
        root.querySelector('#atelier-status')!.textContent='';
    };
    const paint=(): void=>{ root.querySelector('.atelier-sheet')!.innerHTML=sheet(state().art,locale); bindSheet(); controls(); };
    const choose=(color:State['color']): void=>{
        set({...state(),color});
        root.querySelectorAll<HTMLElement>('[data-color]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.color===color)));
        root.querySelector('[data-tool="eraser"]')!.setAttribute('aria-pressed',String(color==='#ffffff'));
        const c=palette.find(c=>c[0]===color)!; speak([c[locale==='fr'?1:2]]);
    };
    function finish(): void {
        if(pointer===undefined) return;
        const held=pointer; pointer=undefined;
        set(addStroke(state(),points)); points=[]; preview=[];
        const paper=root.querySelector<HTMLElement>('.atelier-sheet');
        if(paper?.hasPointerCapture(held)) paper.releasePointerCapture(held);
        if(!disposed) paint();
    }
    function bindSheet(): void {
        root.querySelectorAll<SVGElement>('[data-zone]').forEach(el=>{
            bindAction(el as unknown as HTMLElement,()=>{set(fill(state(),el.dataset.zone!)); el.setAttribute('fill',state().art.zones[el.dataset.zone!] ?? '#ffffff'); el.dataset.fill=state().art.zones[el.dataset.zone!]; controls();},()=>`atelier:${studio.revision}:zone:${el.dataset.zone!}:${state().color}`);
            el.addEventListener('keydown',event=>{ if(event.key==='Enter' || event.key===' ') {event.preventDefault(); el.dispatchEvent(new MouseEvent('click',{bubbles:true}));} });
        });
    }
    const modal=(body:string): void=>{
        finish(); const host=root.querySelector<HTMLElement>('#atelier-dialog')!;
        host.innerHTML=`<div class="atelier-shade"><section class="atelier-modal" role="dialog" aria-modal="true" aria-label="${t.gallery}">${body}<button id="atelier-close">${t.close}</button></section></div>`;
        bindAction(host.querySelector<HTMLElement>('#atelier-close')!,()=>{host.innerHTML='';root.querySelector<HTMLElement>('[data-tool="gallery"]')?.focus();},()=>`atelier:close:${studio.revision}`);
        host.querySelector<HTMLElement>('button')?.focus();
        host.onkeydown=event=>{
            if(event.key==='Escape') host.innerHTML='';
            if(event.key==='Tab') {const all=[...host.querySelectorAll<HTMLElement>('button')], first=all[0]!,last=all.at(-1)!; if(event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();} else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();} }
        };
    };
    function bind(): void {
        bindSheet();
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'atelier:home');
        const paper=root.querySelector<HTMLElement>('.atelier-sheet')!;
        const position=(event:PointerEvent): Point=>screenToZone({x:event.clientX,y:event.clientY},paper.getBoundingClientRect(),SHEET);
        const extend=(event:PointerEvent): void=>{
            const batch=typeof event.getCoalescedEvents==='function' ? event.getCoalescedEvents() : [];
            // Keep the original gesture for a single simplification at commit time.
            // Sampling is only a live-preview optimisation: its error must not accumulate.
            for(const e of batch.length ? batch : [event]) {
                const p=position(e); points.push(p); preview=sample(preview,p);
            }
            const live=root.querySelector('#atelier-live')!;
            live.setAttribute('d',strokePath(preview)); live.setAttribute('stroke',state().color); live.setAttribute('stroke-width',String(state().width));
        };
        paper.addEventListener('pointerdown',event=>{
            if(state().art.mode!=='draw') return;
            if(pointer!==undefined || !event.isPrimary || event.button!==0) {recordActivation('atelier:stroke',event.type,false,'secondary-pointer');return;}
            if(!acceptActivation(`atelier:stroke:${studio.revision}`,event.type,false)) return;
            event.preventDefault(); pointer=event.pointerId; points=[]; preview=[]; paper.setPointerCapture(event.pointerId); extend(event);
        });
        paper.addEventListener('pointermove',event=>{if(pointer===event.pointerId) {event.preventDefault();extend(event);} });
        paper.addEventListener('pointerup',event=>{if(pointer===event.pointerId) {extend(event);finish();} });
        for(const name of ['pointercancel','lostpointercapture'] as const) paper.addEventListener(name,event=>{if(pointer===event.pointerId) {recordActivation('atelier:stroke',name,true,'preserve-partial-stroke');finish();} });
        root.querySelectorAll<HTMLElement>('[data-color]').forEach(el=>bindAction(el,()=>choose(el.dataset.color as State['color']),()=>`atelier:color:${el.dataset.color!}:${studio.revision}`));
        root.querySelectorAll<HTMLElement>('[data-width]').forEach(el=>bindAction(el,()=>{finish();set({...state(),width:Number(el.dataset.width) as State['width']});root.querySelectorAll<HTMLElement>('[data-width]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));speak([Number(el.dataset.width)===4?t.small:Number(el.dataset.width)===9?t.medium:t.large]);},()=>`atelier:width:${el.dataset.width!}:${studio.revision}`));
        root.querySelectorAll<HTMLElement>('button[data-tool]').forEach(el=>bindAction(el,()=>{
            finish(); const tool=el.dataset.tool;
            if(tool==='color' || tool==='draw') {set(change(state(),{...state().art,mode:tool}));draw();}
            if(tool==='undo' || tool==='redo') {set(tool==='undo'?undo(state()):redo(state()));draw();}
            if(tool==='eraser') choose('#ffffff');
            if(tool==='clear') {modal(`<p>${t.confirm}</p><button id="atelier-yes">${t.yes}</button>`);bindAction(root.querySelector<HTMLElement>('#atelier-yes')!,()=>{set(clear(state()));draw();},()=>`atelier:clear:${studio.revision}`);}
            if(tool==='gallery') {
                const gallery=readGallery(storage);
                modal(`<h2>${t.gallery}</h2>${gallery.length ? `<div class="atelier-gallery">${gallery.map((raw,i)=>`<button data-art="${i}" aria-label="${t.picture} ${i+1}">${thumbnail(deserialize(raw)!,locale)}</button>`).join('')}</div>` : `<p>${t.empty}</p>`}`);
                root.querySelectorAll<HTMLElement>('[data-art]').forEach(b=>bindAction(b,()=>{const art=deserialize(gallery[Number(b.dataset.art)]!);if(art) {set({...start(art.drawing,art.mode),art});draw();}},()=>`atelier:load:${b.dataset.art!}:${studio.revision}`));
            }
            if(tool==='done') {
                let ok=true;
                if(savedRevision!==studio.revision) {ok=writeGallery(storage,appendGallery(readGallery(storage),state().art));if(ok) savedRevision=studio.revision;}
                root.querySelector('#atelier-status')!.innerHTML=`<span class="atelier-stamp">${characterSvg('panda','celebration')}<b>${t.bravo}</b></span> ${ok?t.saved:t.unsaved}`;speak([t.bravo]);
            }
        },()=>`atelier:${el.dataset.tool!}:${studio.revision}`));
        root.querySelector<HTMLSelectElement>('#atelier-picture')!.onchange=event=>{
            finish(); const id=(event.target as HTMLSelectElement).value;
            if(drawings.some(d=>d.id===id)) {set(change(state(),{...state().art,drawing:id,zones:{}}));paint();}
        };
        bindAction(root.querySelector<HTMLElement>('#listen')!,()=>speak([t.instruction]),'atelier:listen');
        // Home is owned by the shared router; it rebinds this connected control after mount.
    }
    document.addEventListener('visibilitychange',()=>{if(document.hidden) finish();},{signal:abort.signal});
    draw();
    return ()=>{disposed=true;finish();abort.abort();};
}
