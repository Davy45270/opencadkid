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
    const point=(i:number):{id:number;x:number;y:number}=>({id:1,x:r.x+25+i*(r.width-50)/299+noise(),y:r.y+r.height/2+35*Math.sin(i/30)+noise()});
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
        const y=await path.evaluate(el=>(el as SVGGraphicsElement).getBBox().y);expect(y).toBeGreaterThan(80);
        expect(await page.evaluate(()=>[scrollX,scrollY])).toEqual(scroll);
        await page.locator('[data-tool="undo"]').tap();expect((await studioState(page)).strokeCount).toBe(0);await page.locator('[data-tool="redo"]').tap();expect((await studioState(page)).strokeCount).toBe(1);
    } finally {await cdp.detach();}
});
