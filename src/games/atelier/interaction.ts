import { bindDragEnd } from '../../shell/drag';
import { addStroke, appendGallery, ERASER, change, choose as chooseSheet, clear, deserialize, fill, palette, pointCount, redo, sample, strokeTolerance, SHEET, start, undo, type Point, type State } from '../../engines/atelier';
import { acceptActivation, bindAction, recordActivation } from '../../shell/activation';
import { screenToZone } from '../../shell/coordinates';
import type { Locale } from '../../shell/i18n';
import type { StoragePort } from '../../shell/storage';
import { characterSvg } from '../../characters/svg';
import { animatedSheet, gameView, labels, sheet, strokePath, thumbnail } from './view';
import { readGallery, writeDraft, writeGallery } from './storage';
import { exportPicture } from './export';
export interface Studio { state: State; revision: number }
export function snapshot(studio: Studio): object { const s=studio.state; return { ...s.art, tool:s.art.mode, color:s.color, width:s.width, strokeCount:s.art.strokes.length+(s.art.flattened ?? 0), pointCount:pointCount(s.art), undoSize:s.past.length, redoSize:s.future.length }; }
export function mount(root: HTMLElement, studio: Studio, locale: Locale, storage: StoragePort | undefined, speak: (parts:string[])=>void, home: ()=>void): ()=>void {
    const t=labels[locale];
    let pointer: number | undefined, points: Point[]=[], preview: Point[]=[], disposed=false, savedRevision=-1, strokeScale=1, playing=false;
    let paperOwner: HTMLElement | undefined;
    const ending=bindDragEnd(root.ownerDocument,()=>pointer===undefined || !paperOwner ? undefined : {pointer,element:paperOwner},()=>{pointer=undefined;paperOwner=undefined;},reason=>{
        if(pointer!==undefined) {recordActivation('atelier:stroke',reason,true,'preserve-partial-stroke');finish();}
    });
    const state=(): State=>studio.state;
    const set=(s:State): void=>{ if(s!==studio.state) { const moved=s.art!==studio.state.art; studio.state=s; studio.revision++; if(moved) writeDraft(storage,s.art); } };
    const draw=(): void=>{
        root.innerHTML=gameView(state(),locale); bind();
    };
    const controls=(): void=>{
        for(const key of ['undo','redo']) root.querySelector<HTMLButtonElement>(`[data-tool="${key}"]`)!.disabled=key==='undo' ? !state().past.length : !state().future.length;
        root.querySelector('#atelier-status')!.textContent='';
    };
    const paint=(): void=>{ playing=false; root.querySelector('[data-tool="play"]')?.setAttribute('aria-pressed','false'); root.querySelector('.atelier-sheet')!.innerHTML=sheet(state().art,locale); bindSheet(); controls(); };
    const motionAllowed=(): boolean=>typeof matchMedia!=='function' || !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const play=(): void=>{
        if(playing) {paint();return;}
        playing=true; root.querySelector('[data-tool="play"]')!.setAttribute('aria-pressed','true');
        // Reduced motion: the picture is shown as it will move, without the movement.
        const html=animatedSheet(state().art,locale); root.querySelector('.atelier-sheet')!.innerHTML=motionAllowed() ? html : html.replace(/<animate(?:Transform)?\b[^>]*\/>/g,'');
    };
    const choose=(color:State['color']): void=>{
        if(playing) paint();
        set({...state(),color});
        root.querySelectorAll<HTMLElement>('[data-color]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.color===color)));
        root.querySelector('[data-tool="eraser"]')!.setAttribute('aria-pressed',String(color==='#ffffff'));
        const c=palette.find(c=>c[0]===color)!; speak([c[locale==='fr'?1:2]]);
    };
    function finish(): void {
        if(pointer===undefined) return;
        ending.finish();
        set(addStroke(state(),points,strokeScale)); points=[]; preview=[];
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
                const p=position(e); points.push(p); preview=sample(preview,p,strokeTolerance(strokeScale));
            }
            // The eraser's live gesture is a mask over the brush marks: it never paints white over the model.
            const live=root.querySelector(state().color===ERASER ? '#atelier-erase' : '#atelier-live')!;
            live.setAttribute('d',strokePath(preview)); live.setAttribute('stroke-width',String(state().width));
            if(state().color!==ERASER) live.setAttribute('stroke',state().color);
        };
        paper.addEventListener('pointerdown',event=>{
            if(playing) {event.preventDefault();recordActivation('atelier:stroke',event.type,false,'stops-animation');paint();return;}
            if(state().art.mode!=='draw') return;
            if(pointer!==undefined || !event.isPrimary || event.button!==0) {recordActivation('atelier:stroke',event.type,false,'secondary-pointer');return;}
            if(!acceptActivation(`atelier:stroke:${studio.revision}`,event.type,false)) return;
            // Use the SVG's actual screen scale, including CSS transforms and viewport scaling.
            const matrix=paper.querySelector<SVGSVGElement>('.atelier-paper')!.getScreenCTM()!;
            strokeScale=Math.max(Math.hypot(matrix.a,matrix.b),Math.hypot(matrix.c,matrix.d));
            event.preventDefault(); paperOwner=paper; pointer=event.pointerId; points=[]; preview=[]; paper.setPointerCapture(event.pointerId); ending.watch(); extend(event);
        });
        paper.addEventListener('pointermove',event=>{if(pointer===event.pointerId) {event.preventDefault();extend(event);} });
        paper.addEventListener('pointerup',event=>{if(pointer===event.pointerId) {extend(event);finish();} });
        root.querySelectorAll<HTMLElement>('[data-color]').forEach(el=>bindAction(el,()=>choose(el.dataset.color as State['color']),()=>`atelier:color:${el.dataset.color!}:${studio.revision}`));
        root.querySelectorAll<HTMLElement>('[data-width]').forEach(el=>bindAction(el,()=>{finish();set({...state(),width:Number(el.dataset.width) as State['width']});root.querySelectorAll<HTMLElement>('[data-width]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));speak([Number(el.dataset.width)===4?t.small:Number(el.dataset.width)===9?t.medium:t.large]);},()=>`atelier:width:${el.dataset.width!}:${studio.revision}`));
        root.querySelectorAll<HTMLElement>('button[data-tool]').forEach(el=>bindAction(el,()=>{
            finish(); const tool=el.dataset.tool;
            if(tool==='play') {play();return;}
            if(playing) paint();
            if(tool==='color' || tool==='draw') {set(change(state(),{...state().art,mode:tool}));draw();}
            if(tool==='export') {const status=root.querySelector('#atelier-status')!;void exportPicture(state().art,locale).then(ok=>{if(!disposed && ok) status.textContent=t.savedImage;});}
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
            const next=chooseSheet(state(),id); if(next!==state()) {set(next);draw();}
        };
        bindAction(root.querySelector<HTMLElement>('#listen')!,()=>speak([t.instruction]),'atelier:listen');
        // Home is owned by the shared router; it rebinds this connected control after mount.
    }
    draw();
    return ()=>{disposed=true;finish();ending.dispose();};
}
