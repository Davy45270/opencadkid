import { volume } from '../../ui/illustration';
import { characterSvg } from '../../characters/svg';
import type { CharacterId } from '../../characters/model';
import { paintedSceneIds, type PaintedScene, type Scene } from '../../engines/puzzle';
import type { Locale } from '../../shell/i18n';
export const sceneNames: Record<Locale, Record<Scene, string>> = {
    fr: { castle: 'Pestouille au château', bamboo: 'Boubou dans les bambous', rainbow: 'Lumi sous l’arc-en-ciel', jungle: 'Tutu dans la jungle', autumn: 'CaliRoux et les feuilles', picnic: 'Le pique-nique des amis', zen: 'Boubou au jardin zen', ardennes: 'CaliRoux dans la forêt des Ardennes', volcano: 'Pestouille au volcan ardent', islands: 'Tutu sur les îles tropicales', galaxy: 'Lumi dans la galaxie étoilée', valley: 'La vallée au printemps' },
    en: { castle: 'Pestouille above the castle', bamboo: 'Boubou in the bamboo forest', rainbow: 'Lumi under the rainbow', jungle: 'Tutu in the jungle', autumn: 'CaliRoux and the leaves', picnic: 'A picnic with friends', zen: 'Boubou in the zen garden', ardennes: 'CaliRoux in the Ardennes forest', volcano: 'Pestouille at the fiery volcano', islands: 'Tutu on the tropical islands', galaxy: 'Lumi in the starry galaxy', valley: 'The valley in spring' }
};
const guide = (id: CharacterId, x: number, y: number, size: number): string => `<g transform="translate(${x} ${y}) scale(${size / 240})">${characterSvg(id, 'joie', 'repos', 'reduce').replace('<svg ', '<svg style="width:240px;height:240px" ')}</g>`;
/** Bundled, hashed WebP URLs (600×480 or 450×360, 5:4). Not precached: the service worker keeps them once a puzzle has shown them. */
// `new URL(literal, import.meta.url)`: Vite emits each file hashed; Node-side test runners can load this module (no binary import).
export const paintedSceneUrl: Record<PaintedScene, string> = {
    zen: new URL('./painted/zen.webp', import.meta.url).href, ardennes: new URL('./painted/ardennes.webp', import.meta.url).href,
    volcano: new URL('./painted/volcano.webp', import.meta.url).href, islands: new URL('./painted/islands.webp', import.meta.url).href,
    galaxy: new URL('./painted/galaxy.webp', import.meta.url).href, valley: new URL('./painted/valley.webp', import.meta.url).href
};
/** Flat vector stand-in drawn under the picture: it is what the child sees until the WebP arrives, or offline before a first visit. */
const fallback: Record<PaintedScene, string> = {
    zen: '<rect width="300" height="240" fill="#a9d8f0"/><path d="M60 120L150 20L240 120Z" fill="#8c96c4"/><path d="M122 51L150 20L178 51L164 46L150 56L136 46Z" fill="#ffffff"/><path d="M0 120H300V180H0Z" fill="#7cc6d8"/><path d="M60 128Q150 70 240 128" fill="none" stroke="#d9534a" stroke-width="10"/><path d="M0 180Q150 166 300 180V240H0Z" fill="#efe2c8"/>',
    ardennes: '<rect width="300" height="240" fill="#79c4f0"/><path d="M0 150Q80 100 160 140Q230 110 300 135V240H0Z" fill="#4f9a55"/><path d="M28 200L58 60L88 200Z" fill="#2f7044"/><path d="M180 205Q230 180 300 190V215H170Z" fill="#79c3e0"/><path d="M0 215H300V240H0Z" fill="#8cc85a"/>',
    volcano: '<rect width="300" height="240" fill="#7a4aa0"/><path d="M60 140L140 40H170L250 140Z" fill="#4a3a44"/><path d="M148 44L140 140M162 44L176 140" stroke="#f08a3a" stroke-width="6"/><path d="M0 140H300V175H0Z" fill="#f0a040"/><path d="M0 175H300V240H0Z" fill="#5b4650"/>',
    islands: '<rect width="300" height="240" fill="#5ab8f0"/><path d="M150 85L190 50L240 85Z" fill="#6f8fa0"/><path d="M0 85H300V190H0Z" fill="#3fc6d8"/><path d="M40 95Q60 45 90 95" fill="none" stroke="#5f9a5a" stroke-width="12"/><path d="M0 190Q150 176 300 190V240H0Z" fill="#f2d9a0"/>',
    galaxy: '<rect width="300" height="240" fill="#2c2160"/><circle cx="90" cy="50" r="30" fill="#b27ad8"/><circle cx="230" cy="70" r="18" fill="#e0a070"/><path d="M0 170Q100 150 200 165Q260 160 300 168V240H0Z" fill="#6a4a9a"/><path d="M110 170L130 120L150 170Z" fill="#7fd8f0"/>',
    valley: '<rect width="300" height="240" fill="#6cc0f0"/><path d="M0 120L60 80L120 120L190 70L260 120L300 100V240H0Z" fill="#9fb7d0"/><path d="M0 140Q150 110 300 140V240H0Z" fill="#7cc860"/><path d="M0 195Q150 170 300 195V215H0Z" fill="#6ac0e8"/><path d="M100 190Q150 150 200 190" fill="none" stroke="#c8b89a" stroke-width="12"/>'
};
/** Called per render: each embedded guide gets fresh paint server IDs. */
const subjects: Record<PaintedScene, () => string> = {
    zen: () => guide('panda', 182, 124, 112), ardennes: () => guide('pandaroux', 70, 124, 114), volcano: () => guide('dragon', 8, 112, 124),
    islands: () => guide('singe', 178, 124, 112), galaxy: () => guide('licorne', 178, 120, 116), valley: () => guide('pandaroux', 6, 146, 92) + guide('singe', 202, 146, 92)
};
const isPainted = (scene: Scene): scene is PaintedScene => (paintedSceneIds as readonly Scene[]).includes(scene);
/** Procedural scenes; each repeated character owns unique paint server IDs. */
export function sceneSvg(scene: Scene): string {
    if (isPainted(scene)) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240">${fallback[scene]}<image href="${paintedSceneUrl[scene]}" x="0" y="0" width="300" height="240" preserveAspectRatio="xMidYMid slice"/>${subjects[scene]()}</svg>`;
    let drawing = '';
    if (scene === 'castle') drawing = `<path d="M40 206V108H66V94H82V108H105V206M184 206V108H210V94H226V108H250V206" fill="#bdabcc" stroke="#645478" stroke-width="4"/><path d="M82 206V140H212V206" fill="#e7cdb8"/><path d="M123 206V177A24 24 0 0 1 171 177V206" fill="#8b6e85"/><path d="M35 108L73 74L111 108M179 108L217 74L255 108" fill="#df8f90"/>${guide('dragon', 100, 0, 108)}`;
    if (scene === 'bamboo') drawing = [25, 65, 216, 264].map((x, i) => `<path d="M${x} 220L${x + 8} ${20 + i * 9}" stroke="#639c60" stroke-width="13"/>${[55, 95, 135, 175].map(y => `<path d="M${x - 8} ${y}h22m-10 5q-35 -35 -28 -38m30 32q32 -28 35 -20" fill="none" stroke="#426e4e" stroke-width="4"/>`).join('')}`).join('') + guide('panda', 85, 86, 135);
    if (scene === 'rainbow') drawing = ['#e88985', '#efbe72', '#f4dd87', '#9acb99', '#8db9dc', '#b49dce'].map((color, i) => `<path d="M${24 + i * 11} 152A${126 - i * 11} ${126 - i * 11} 0 0 1 ${276 - i * 11} 152" fill="none" stroke="${color}" stroke-width="12"/>`).join('') + guide('licorne', 95, 102, 130);
    if (scene === 'jungle') drawing = `<path d="M8 0Q80 120 32 190M280 0Q210 90 267 194M58 0Q150 80 244 12" fill="none" stroke="#698858" stroke-width="9"/>${[18, 65, 240, 275].map((x, i) => `<ellipse cx="${x}" cy="${60 + i * 33}" rx="38" ry="16" transform="rotate(${i % 2 ? 35 : -35} ${x} ${60 + i * 33})" fill="#78ae72" stroke="#466a49" stroke-width="3"/>`).join('')}${guide('singe', 88, 65, 145)}`;
    if (scene === 'autumn') drawing = `<path d="M52 210L63 30M60 88L20 44M62 68L100 25M250 220L240 40M243 93L279 63" stroke="#99704f" stroke-width="14"/>${Array.from({ length: 12 }, (_, i) => `<ellipse cx="${18 + i * 24}" cy="${32 + i % 4 * 49}" rx="17" ry="9" transform="rotate(${i * 29} ${18 + i * 24} ${32 + i % 4 * 49})" fill="${['#e5a052', '#d37a57', '#e5c267'][i % 3]}"/>`).join('')}${guide('pandaroux', 94, 90, 135)}`;
    if (scene === 'picnic') drawing = `<path d="M35 181L244 181L276 233H16Z" fill="#e6a4a0" stroke="#b9757b" stroke-width="3"/><path d="M30 201H258M83 182L68 232M169 182L181 232" stroke="#fff4dc" stroke-width="6"/>${guide('panda', 20, 75, 115)}${guide('dragon', 165, 65, 120)}<ellipse cx="146" cy="204" rx="26" ry="12" fill="#fff5d6"/><circle cx="140" cy="199" r="9" fill="#dc7d60"/><circle cx="156" cy="202" r="8" fill="#e8bb57"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240">${volume(`<rect width="300" height="240" fill="${scene === 'autumn' ? '#fae6c8' : '#deeff1'}"/><circle cx="268" cy="28" r="19" fill="#f3d784"/><path d="M0 185Q72 145 152 187Q240 155 300 180V240H0Z" fill="#b9d69e"/>`)}${volume(drawing)}</svg>`;
}
