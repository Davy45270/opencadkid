import { volume } from '../../ui/illustration';
import { characterSvg } from '../../characters/svg';
import type { CharacterId } from '../../characters/model';
import type { Scene } from '../../engines/puzzle';
import type { Locale } from '../../shell/i18n';
export const sceneNames: Record<Locale, Record<Scene, string>> = {
    fr: { castle: 'Pestouille au château', bamboo: 'Boubou dans les bambous', rainbow: 'Lumi sous l’arc-en-ciel', jungle: 'Tutu dans la jungle', autumn: 'CaliRoux et les feuilles', picnic: 'Le pique-nique des amis' },
    en: { castle: 'Pestouille above the castle', bamboo: 'Boubou in the bamboo forest', rainbow: 'Lumi under the rainbow', jungle: 'Tutu in the jungle', autumn: 'CaliRoux and the leaves', picnic: 'A picnic with friends' }
};
const guide = (id: CharacterId, x: number, y: number, size: number): string => `<g transform="translate(${x} ${y}) scale(${size / 240})">${characterSvg(id, 'joie', 'repos', 'reduce').replace('<svg ', '<svg style="width:240px;height:240px" ')}</g>`;
/** Procedural scenes; each repeated character owns unique paint server IDs. */
export function sceneSvg(scene: Scene): string {
    let drawing = '';
    if (scene === 'castle') drawing = `<path d="M40 206V108H66V94H82V108H105V206M184 206V108H210V94H226V108H250V206" fill="#bdabcc" stroke="#645478" stroke-width="4"/><path d="M82 206V140H212V206" fill="#e7cdb8"/><path d="M123 206V177A24 24 0 0 1 171 177V206" fill="#8b6e85"/><path d="M35 108L73 74L111 108M179 108L217 74L255 108" fill="#df8f90"/>${guide('dragon', 100, 0, 108)}`;
    if (scene === 'bamboo') drawing = [25, 65, 216, 264].map((x, i) => `<path d="M${x} 220L${x + 8} ${20 + i * 9}" stroke="#639c60" stroke-width="13"/>${[55, 95, 135, 175].map(y => `<path d="M${x - 8} ${y}h22m-10 5q-35 -35 -28 -38m30 32q32 -28 35 -20" fill="none" stroke="#426e4e" stroke-width="4"/>`).join('')}`).join('') + guide('panda', 85, 86, 135);
    if (scene === 'rainbow') drawing = ['#e88985', '#efbe72', '#f4dd87', '#9acb99', '#8db9dc', '#b49dce'].map((color, i) => `<path d="M${24 + i * 11} 152A${126 - i * 11} ${126 - i * 11} 0 0 1 ${276 - i * 11} 152" fill="none" stroke="${color}" stroke-width="12"/>`).join('') + guide('licorne', 95, 102, 130);
    if (scene === 'jungle') drawing = `<path d="M8 0Q80 120 32 190M280 0Q210 90 267 194M58 0Q150 80 244 12" fill="none" stroke="#698858" stroke-width="9"/>${[18, 65, 240, 275].map((x, i) => `<ellipse cx="${x}" cy="${60 + i * 33}" rx="38" ry="16" transform="rotate(${i % 2 ? 35 : -35} ${x} ${60 + i * 33})" fill="#78ae72" stroke="#466a49" stroke-width="3"/>`).join('')}${guide('singe', 88, 65, 145)}`;
    if (scene === 'autumn') drawing = `<path d="M52 210L63 30M60 88L20 44M62 68L100 25M250 220L240 40M243 93L279 63" stroke="#99704f" stroke-width="14"/>${Array.from({ length: 12 }, (_, i) => `<ellipse cx="${18 + i * 24}" cy="${32 + i % 4 * 49}" rx="17" ry="9" transform="rotate(${i * 29} ${18 + i * 24} ${32 + i % 4 * 49})" fill="${['#e5a052', '#d37a57', '#e5c267'][i % 3]}"/>`).join('')}${guide('pandaroux', 94, 90, 135)}`;
    if (scene === 'picnic') drawing = `<path d="M35 181L244 181L276 233H16Z" fill="#e6a4a0" stroke="#b9757b" stroke-width="3"/><path d="M30 201H258M83 182L68 232M169 182L181 232" stroke="#fff4dc" stroke-width="6"/>${guide('panda', 20, 75, 115)}${guide('dragon', 165, 65, 120)}<ellipse cx="146" cy="204" rx="26" ry="12" fill="#fff5d6"/><circle cx="140" cy="199" r="9" fill="#dc7d60"/><circle cx="156" cy="202" r="8" fill="#e8bb57"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240">${volume(`<rect width="300" height="240" fill="${scene === 'autumn' ? '#fae6c8' : '#deeff1'}"/><circle cx="268" cy="28" r="19" fill="#f3d784"/><path d="M0 185Q72 145 152 187Q240 155 300 180V240H0Z" fill="#b9d69e"/>`)}${volume(drawing)}</svg>`;
}
