import type { Page } from '@playwright/test';
import { prepare } from './helpers';
export interface AtelierProbe { zones: Record<string,string>; tool: string; color: string; width: number; strokeCount: number; pointCount: number; undoSize: number; redoSize: number; strokes: {points:{x:number;y:number}[]}[] }
export const studioState=(page:Page):Promise<AtelierProbe>=>page.evaluate(()=>(window as unknown as {__kid:{state():{atelier:AtelierProbe}}}).__kid.state().atelier);
export async function prepareStudio(page:Page):Promise<void> {await prepare(page);await page.locator('#back').click();await page.locator('[data-game="atelier"]').click();}
export async function zoneCenter(page:Page, id:string):Promise<{x:number;y:number}> {const r=(await page.locator(`[data-zone="${id}"]`).boundingBox())!;return {x:r.x+r.width/2,y:r.y+r.height/2};}
