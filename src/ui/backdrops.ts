import { svg } from './svg';
/** Decorations stay on the outer 44 units; the middle is deliberately empty. */
export function backdrop(game: string): string {
    let drawing = '';
    if (game === 'compter') drawing = [8, 28, 367, 387].map((x, i) => `<path d="M${x} 770V${100 + i * 45}" stroke="#507b50" stroke-width="8"/><path d="M${x - 5} 290h10m-10 90h10m-10 90h10m-10 90h10" stroke="#b0bb78" stroke-width="3"/><path d="M${x} 260q${x < 100 ? 30 : -30} -50 ${x < 100 ? 17 : -17} -65q${x < 100 ? -20 : 20} 22 ${x < 100 ? -17 : 17} 65" fill="#62875c"/>`).join('');
    if (game === 'paires') drawing = [12, 375, 27, 360, 14, 380].map((x, i) => `<path d="M${x} ${130 + i * 95}l3 8l8 3l-8 3l-3 8l-3 -8l-8 -3l8 -3Z" fill="#8a70a5"/>`).join('') + '<path d="M12 620Q42 612 28 580Q4 594 12 620Z" fill="#a791ba"/>';
    if (game === 'formes') drawing = [8, 375, 20, 363, 11, 380].map((x, i) => `<path d="M${x} ${145 + i * 95}q-17 -30 10 -44q18 28 -10 44m0 0l8 -33" fill="#be8155" stroke="#936a48" stroke-width="2" transform="rotate(${i * 24} ${x} ${145 + i * 95})"/>`).join('');
    if (game === 'sons') drawing = '<path d="M8 100Q45 260 8 460T25 800M381 120Q348 350 385 480T365 800" fill="none" stroke="#5f8057" stroke-width="5"/>' + [12, 378, 18, 370, 10, 380].map((x, i) => `<path d="M${x} ${170 + i * 90}q-27 -46 13 -56q25 35 -13 56m0 -3l8 -40" fill="#6d915d" stroke="#486f4d" stroke-width="2"/>`).join('');
    if (game === 'puzzle') drawing = '<path d="M0 790V530h12v-18h10v18h15v260M355 790V530h12v-18h10v18h13v260" fill="#9b88ab"/><path d="M0 530L20 495L43 530M349 530L372 495L390 530" fill="#b087a6"/><path d="M12 575v24m359 -24v24M13 660v24m357 -24v24" stroke="#6a6082" stroke-width="6"/>';
    if (game === 'chemin') drawing = '<path d="M0 795Q90 744 190 800Q290 752 390 795V844H0Z" fill="#8cb17a"/><path d="M12 745l-7 -45m7 45l14 -32M376 745l10 -43m-10 43l-14 -28M32 820l-9 -38m9 38l12 -30M351 820l10 -38m-10 38l-12 -30" stroke="#658f61" stroke-width="3"/>';
    if (game === 'suites') drawing = ['#db8b94', '#e6c472', '#91b792', '#88adcb', '#b598c6'].map((c, i) => `<path d="M${4 + i * 7} 200Q195 ${-80 + i * 20} ${386 - i * 7} 200" fill="none" stroke="${c}" stroke-width="6"/>`).join('');
    return svg(drawing, '0 0 390 844').replace('<svg ', '<svg class="game-backdrop" focusable="false" ');
}
