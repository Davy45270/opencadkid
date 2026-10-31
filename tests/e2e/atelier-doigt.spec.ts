import { test, expect, expectTouch, touchFrame } from './helpers';
import { prepareStudio, studioState, zoneCenter } from './atelier-helpers';
test('two immediate distinct zones and immediate recolouring each commit once with no page scroll',async({page,isMobile})=>{
    test.skip(!isMobile,'Mobile touch only');await prepareStudio(page);
    const scroll=await page.evaluate(()=>[scrollX,scrollY]),a=await zoneCenter(page,'head'),b=await zoneCenter(page,'body');
    await page.touchscreen.tap(a.x,a.y);await page.touchscreen.tap(b.x,b.y);
    await expectTouch(page,'Both rapid zones fill',async()=>{const s=await studioState(page);return s.zones.head==='#ee737a'&&s.zones.body==='#ee737a'&&s.undoSize===2;});
    await page.locator('[data-color="#727ed1"]').tap();await page.touchscreen.tap(b.x,b.y);
    await expectTouch(page,'Recolouring the same zone is not debounced',async()=>(await studioState(page)).zones.body==='#727ed1');
    expect(await page.evaluate(()=>[scrollX,scrollY])).toEqual(scroll);
});
test('300 noisy finger points keep a single captured stroke; a second finger is ignored and the page stays still',async({page,context,isMobile})=>{
    test.skip(!isMobile,'Mobile touch only');await prepareStudio(page);await page.locator('[data-tool="draw"]').tap();
    const scroll=await page.evaluate(()=>[scrollX,scrollY]),r=(await page.locator('.atelier-sheet').boundingBox())!,cdp=await context.newCDPSession(page);
    let seed=29;const noise=():number=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32*2-1;};
    const input:{id:number;x:number;y:number}[]=[];
    const point=(i:number):{id:number;x:number;y:number}=>{const p={id:1,x:r.x+25+i*(r.width-50)/299+noise(),y:r.y+r.height/2+35*Math.sin(i/30)+noise()};input.push(p);return p;};
    try {
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(0)]});await touchFrame(page);
        for(let i=1;i<300;i++) {
            const touches=[point(i)];if(i>=80&&i<220) touches.push({id:2,x:r.x+r.width-25,y:r.y+25});
            await cdp.send('Input.dispatchTouchEvent',{type:i===80?'touchStart':i===220?'touchEnd':'touchMove',touchPoints:touches});await touchFrame(page);
        }
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touchFrame(page);
        await expectTouch(page,'One primary finger produces one retained stroke',async()=>{const s=await studioState(page);return s.strokeCount===1&&s.pointCount>5&&s.pointCount<=4000&&s.undoSize===2;});
        // Compare painted geometry and hook; a secondary-finger spur would reach the top margin.
        const path=page.locator('.atelier-sheet [data-stroke]');await expect(path).toHaveCount(1);
        await expect(path).toHaveAttribute('stroke','#ee737a');await expect(path).toHaveAttribute('stroke-width','9');
        const y=await path.evaluate(el=>(el as SVGGraphicsElement).getBBox().y);expect(y).toBeGreaterThan(80);
        const line=pathPoints((await path.getAttribute('d'))!);
        const original=await path.evaluate((el,pts)=>{
            const m=(el as SVGGraphicsElement).getScreenCTM()!.inverse();
            return pts.map(p=>{const q=new DOMPoint(p.x,p.y).matrixTransform(m);return {x:q.x,y:q.y};});
        },input);
        const scale=await path.evaluate(el=>(el as SVGGraphicsElement).getScreenCTM()!.a);
        for(const p of original) expect(distanceToPath(p,line)*scale).toBeLessThanOrEqual(2);
        expect(Math.hypot(line[0]!.x-original[0]!.x,line[0]!.y-original[0]!.y)).toBeLessThanOrEqual(.36);
        expect(Math.hypot(line.at(-1)!.x-original.at(-1)!.x,line.at(-1)!.y-original.at(-1)!.y)).toBeLessThanOrEqual(.36);
        expect(await page.evaluate(()=>[scrollX,scrollY])).toEqual(scroll);
        await page.locator('[data-tool="undo"]').tap();expect((await studioState(page)).strokeCount).toBe(0);await page.locator('[data-tool="redo"]').tap();expect((await studioState(page)).strokeCount).toBe(1);
    } finally {await cdp.detach();}
});

// Independent SVG oracle: measure the actual committed path, not just the state hook.
function pathPoints(d:string): {x:number;y:number}[] {
    return [...d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map(m=>({x:Number(m[1]),y:Number(m[2])}));
}
function distanceToPath(p:{x:number;y:number},line:{x:number;y:number}[]):number {
    return Math.min(...line.slice(1).map((b,i)=>{
        const a=line[i]!,dx=b.x-a.x,dy=b.y-a.y;
        const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
        return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
    }));
}
test('complete pointer pipeline preserves the regression gesture within 2px and its last point',async({page})=>{
    await prepareStudio(page);await page.setViewportSize({width:390,height:844});
    await page.locator('[data-tool="draw"]').click();
    const original=[[20,102],[20.5,103],[21,102],[21.5,103],[22,102.5],[22.5,103.5],[23,101.5],[23.5,103.5],[24,101],[24.5,102]].map(([x,y])=>({x:x!,y:y!}));
    const screen=await page.locator('.atelier-paper').evaluate((el,pts)=>{
        const m=(el as SVGGraphicsElement).getScreenCTM()!;
        return pts.map(p=>{const q=new DOMPoint(p.x,p.y).matrixTransform(m);return {x:q.x,y:q.y};});
    },original);
    // An active mouse pointer permits real capture; synthetic positions keep half-unit input exact.
    await page.mouse.move(1,1);await page.mouse.down();
    await page.locator('.atelier-sheet').evaluate((el,pts)=>{
        const first=pts[0]!;
        el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,isPrimary:true,button:0,buttons:1,clientX:first.x,clientY:first.y,bubbles:true}));
        for(const p of pts.slice(1)) el.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,isPrimary:true,buttons:1,clientX:p.x,clientY:p.y,bubbles:true}));
        const last=pts.at(-1)!;
        el.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,isPrimary:true,clientX:last.x,clientY:last.y,bubbles:true}));
    },screen);
    await page.mouse.up();
    const path=page.locator('[data-stroke="0"]');await expect(path).toHaveCount(1);
    const line=pathPoints((await path.getAttribute('d'))!);
    expect(line[0]).toEqual(original[0]);expect(line.at(-1)).toEqual(original.at(-1));
    const scale=await path.evaluate(el=>(el as SVGGraphicsElement).getScreenCTM()!.a);
    for(const p of original) expect(distanceToPath(p,line)*scale).toBeLessThanOrEqual(2);
    expect((await studioState(page)).strokes[0]!.points).toEqual(line);
});
for(const interruption of ['pointercancel','lostpointercapture'] as const) {
    test(`${interruption} preserves a partial stroke exactly once with undo and redo`,async({page})=>{
        await prepareStudio(page);await page.locator('[data-tool="draw"]').click();
        const r=(await page.locator('.atelier-sheet').boundingBox())!;
        await page.mouse.move(r.x+30,r.y+60);await page.mouse.down();
        await page.mouse.move(r.x+90,r.y+100);await page.mouse.move(r.x+140,r.y+70);
        const live=pathPoints((await page.locator('#atelier-live').getAttribute('d'))!);
        expect(live.length).toBeGreaterThanOrEqual(3);
        const before=await studioState(page);
        expect(await page.locator('.atelier-sheet').evaluate(el=>el.hasPointerCapture(1))).toBe(true);
        await page.locator('.atelier-sheet').evaluate((el,name)=>{
            el.dispatchEvent(new PointerEvent(name,{pointerId:1,isPrimary:true,pointerType:'mouse'}));
        },interruption);
        await expect(page.locator('[data-stroke]')).toHaveCount(1);
        const retained=pathPoints((await page.locator('[data-stroke="0"]').getAttribute('d'))!);
        expect(retained[0]).toEqual(live[0]);expect(retained.at(-1)).toEqual(live.at(-1));
        for(const p of live) expect(distanceToPath(p,retained)).toBeLessThanOrEqual(2);
        await page.mouse.up();
        const after=await studioState(page);expect(after.strokeCount).toBe(1);expect(after.undoSize).toBe(before.undoSize+1);
        await page.locator('[data-tool="undo"]').click();await expect(page.locator('[data-stroke]')).toHaveCount(0);
        await page.locator('[data-tool="redo"]').click();await expect(page.locator('[data-stroke]')).toHaveCount(1);
        expect((await studioState(page)).strokes).toEqual(after.strokes);
    });
}
test('each selected brush paints its actual width and colour in live and committed SVG',async({page})=>{
    await prepareStudio(page);await page.locator('[data-tool="draw"]').click();
    const r=(await page.locator('.atelier-sheet').boundingBox())!;
    for(const [i,width] of [4,9,18].entries()) {
        const color=['#ab83cc','#62c9c5','#f4a269'][i]!;
        await page.locator(`[data-width="${width}"]`).click();await page.locator(`[data-color="${color}"]`).click();
        await expect(page.locator(`[data-width="${width}"]`)).toHaveAttribute('aria-pressed','true');
        await page.mouse.move(r.x+30,r.y+60+i*40);await page.mouse.down();await page.mouse.move(r.x+120,r.y+60+i*40);
        await expect(page.locator('#atelier-live')).toHaveAttribute('stroke',color);
        await expect(page.locator('#atelier-live')).toHaveAttribute('stroke-width',String(width));
        await page.mouse.up();
        const path=page.locator(`[data-stroke="${i}"]`);
        await expect(path).toHaveAttribute('stroke',color);await expect(path).toHaveAttribute('stroke-width',String(width));
        // A nonempty line must actually be emitted for each selection.
        const length=await path.evaluate(el=>(el as SVGPathElement).getTotalLength());expect(length).toBeGreaterThan(50);
        expect((await studioState(page)).width).toBe(width);
    }
});
