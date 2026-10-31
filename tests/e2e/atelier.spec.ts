import { test, expect, media, clearSpeech, passGate, state } from './helpers';
import { prepareStudio, studioState } from './atelier-helpers';
test('DOM zone oracle fills the whole drawing, recolours, undoes, redoes and keeps a local gallery after reload', async ({page,context})=>{
    await prepareStudio(page);
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
    const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
    const ids=await page.locator('.atelier-sheet [data-zone]').evaluateAll(zones=>zones.map(z=>z.getAttribute('data-zone')!));
    expect(new Set(ids).size).toBe(ids.length);expect(ids.length).toBeGreaterThanOrEqual(3);
    const colors=['#ee737a','#f4a269','#f6d76d','#acd26e','#58ad87','#62c9c5'];
    const expected:Record<string,string>={};
    for(const [i,id] of ids.entries()) {
        const color=colors[i%colors.length]!;await page.locator(`[data-color="${color}"]`).click();await page.locator(`[data-zone="${id}"]`).click();
        await expect(page.locator(`[data-zone="${id}"]`)).toHaveAttribute('data-fill',color);expected[id]=color;
    }
    expect((await studioState(page)).zones).toEqual(expected);
    await page.locator('[data-color="#727ed1"]').click();await page.locator(`[data-zone="${ids[0]!}"]`).click();
    await expect(page.locator(`[data-zone="${ids[0]!}"]`)).toHaveAttribute('data-fill','#727ed1');
    await page.locator('[data-tool="undo"]').click();await expect(page.locator(`[data-zone="${ids[0]!}"]`)).toHaveAttribute('data-fill',expected[ids[0]!]!);
    await page.locator('[data-tool="redo"]').click();await expect(page.locator(`[data-zone="${ids[0]!}"]`)).toHaveAttribute('data-fill','#727ed1');expected[ids[0]!]='#727ed1';
    await page.locator('[data-tool="done"]').click();await expect(page.locator('.atelier-stamp')).toBeVisible();await expect(page.locator('.stars')).toHaveCount(0);
    await page.locator('[data-tool="gallery"]').click();await expect(page.locator('[data-art]')).toHaveCount(1);await page.locator('#atelier-close').click();
    expect(requests).toEqual([]);page.removeAllListeners('request');
    await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true);
    await page.reload();await page.locator('[data-game="atelier"]').click();await page.locator('[data-tool="gallery"]').click();await expect(page.locator('[data-art]')).toHaveCount(1);await page.locator('[data-art="0"]').click();
    expect((await studioState(page)).zones).toEqual(expected);
    await page.evaluate(()=>{(window as unknown as {__kid:{state():{atelier:{zones:Record<string,string>}}}}).__kid.state().atelier.zones.head='changed';});
    expect((await studioState(page)).zones).toEqual(expected);
});
test('spoken bilingual colours, brush sizes, eraser, gentle clear and parental gallery confirmation',async({page})=>{
    await prepareStudio(page);await clearSpeech(page);
    await page.locator('[data-color="#ab83cc"]').click();expect((await media(page)).speech).toContain('violet');
    await page.locator('[data-zone="head"]').click();await page.locator('[data-tool="eraser"]').click();await page.locator('[data-zone="head"]').click();await expect(page.locator('[data-zone="head"]')).toHaveAttribute('data-fill','#ffffff');
    await page.locator('[data-tool="clear"]').click();await expect(page.locator('[data-zone="head"]')).toHaveAttribute('data-fill','#ffffff');await page.locator('#atelier-close').click();expect((await studioState(page)).zones.head).toBe('#ffffff');
    await page.locator('[data-tool="clear"]').click();await page.locator('#atelier-yes').click();expect((await studioState(page)).zones).toEqual({});await page.locator('[data-tool="undo"]').click();expect((await studioState(page)).zones.head).toBe('#ffffff');
    await page.locator('[data-tool="done"]').click();await page.locator('#back').click();await page.locator('#parents').click();await passGate(page);
    await page.locator('#erase-gallery').click();await page.locator('#gallery-no').click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('opencadkid.atelier.v1')!) as unknown[])).toHaveLength(1);
    await page.locator('#erase-gallery').click();await page.locator('#gallery-yes').click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('opencadkid.atelier.v1')!) as unknown[])).toEqual([]);
    await page.locator('#language').selectOption('en');await page.locator('#close').click();await page.locator('[data-game="atelier"]').click();await clearSpeech(page);await page.locator('[data-color="#ab83cc"]').click();expect((await media(page)).speech).toContain('purple');
    await page.locator('[data-tool="draw"]').click();await page.locator('[data-width="18"]').click();expect((await studioState(page)).width).toBe(18);expect((await media(page)).speech).toContain('Large brush');
    await page.locator('[data-tool="gallery"]').click();await expect(page.locator('[data-art]')).toHaveCount(0);
    await page.reload();await page.locator('[data-game="atelier"]').click();await page.locator('[data-tool="gallery"]').click();await expect(page.locator('[data-art]')).toHaveCount(0);
});
test('all ten drawings: actual SVG bounds, 48px palette and controls, selected ring and no overflow at 320–1280',async({page})=>{
    await prepareStudio(page);
    const options=await page.locator('#atelier-picture option').evaluateAll(els=>els.map(el=>(el as HTMLOptionElement).value));expect(options).toHaveLength(10);
    for(const width of [320,360,390,414,768,1280]) {
        await page.setViewportSize({width,height:844});
        for(const r of (await state(page)).targets) {expect(r.width).toBeGreaterThanOrEqual(48);expect(r.height).toBeGreaterThanOrEqual(48);}
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        for(const swatch of await page.locator('[data-color]>span').all()) {const r=(await swatch.boundingBox())!;expect(r.width).toBeGreaterThanOrEqual(48);expect(r.height).toBeGreaterThanOrEqual(48);}
        for(const id of options) {
            await page.locator('#atelier-picture').selectOption(id);
            const bounds=await page.locator('.atelier-sheet [data-zone]').evaluateAll(els=>els.map(el=>{const path=el as SVGGraphicsElement,b=path.getBBox(),m=path.getScreenCTM()!,a=new DOMPoint(b.x,b.y).matrixTransform(m),z=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m),r=el.getBoundingClientRect();return {width:z.x-a.x,height:z.y-a.y,left:r.left,right:r.right};}));
            for(const b of bounds) {expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(width);if(width===390) {expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}}
        }
    }
    const ring=await page.locator('[data-color][aria-pressed=true]').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth));expect(ring).toBeGreaterThanOrEqual(4);
});
test('optional mobile studio and ten-game catalogue captures',async({page,isMobile})=>{
    test.skip(process.env.CAPTURES!=='1'||!isMobile,'Optional mobile review artifacts');await prepareStudio(page);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
    for(const [i,id] of ['head','body','left-ear','right-ear','left-foot','right-foot'].entries()) {await page.locator('[data-color]').nth(i).click();await page.locator(`[data-zone="${id}"]`).click();}
    await page.screenshot({path:'docs/captures/atelier-coloriage.png'});await page.locator('[data-tool="draw"]').click();
    const r=(await page.locator('.atelier-sheet').boundingBox())!;await page.mouse.move(r.x+40,r.y+70);await page.mouse.down();for(let i=0;i<80;i++) await page.mouse.move(r.x+40+i*2.5,r.y+120+50*Math.sin(i/12));await page.mouse.up();
    await page.screenshot({path:'docs/captures/atelier-dessin.png'});await page.locator('#back').click();await expect(page.locator('[data-game]')).toHaveCount(10);await expect(page.locator('#tictac')).toBeVisible();await page.screenshot({path:'docs/captures/accueil-catalogue.png',fullPage:true});
});
