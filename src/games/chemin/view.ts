import { characterSvg } from '../../characters/svg';
import { centre, directions, hint, isUnlocked, levels, medal, stars, type Maze } from '../../engines/chemin';
import { rewardLabel, text, type Locale } from '../../shell/i18n';
import type { Save } from '../../shell/storage';
import { dots, icon } from '../../ui/svg';
export const pictogram = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M8 8H56V56H8ZM8 24H40V40H24V56" fill="#eef3dd" stroke="#354e41" stroke-width="5"/><path d="M15 16H48V48H36" fill="none" stroke="#ab6090" stroke-width="6" stroke-linecap="round"/></svg>';
export function levelView(save: Save): string {
    return `<header class="shapes-header"><button id="back" class="round" aria-label="${text(save.locale, 'home')}">${icon('home')}</button><h1>${text(save.locale, 'levels')}</h1></header><div class="level-guide">${characterSvg('dragon')}</div><div class="level-grid">${levels.map(l => `<button data-level="${l.id}" ${isUnlocked(l.id, save.cheminRecords) ? '' : 'disabled'} aria-label="${l.id}"><b>${l.id}</b>${dots(l.id)}<small>${pictogram}</small><span>${'★'.repeat(save.cheminRecords[l.id] ?? 0)}${save.cheminMedals[l.id] ? ' 🏅' : ''}</span>${isUnlocked(l.id, save.cheminRecords) ? '' : icon('lock')}</button>`).join('')}</div>`;
}
/** Procedural nest, bamboo and rainbow alternate; no imported artwork. */
function destination(level: number): string {
    if (level % 3 === 2) return '<path d="M.35 .85V.15M.65 .85V.15M.2 .35H.5M.5 .6H.8" stroke="#427c50" stroke-width=".1"/><path d="M.35 .3Q0 0 .1 .3M.65 .5Q1 .1 .9 .5" fill="#72a552"/>';
    if (level % 3 === 0) return '<path d="M.12 .8V.5A.38 .38 0 0 1 .88 .5V.8" fill="none" stroke="#b2679e" stroke-width=".17"/><path d="M.28 .8V.5A.22 .22 0 0 1 .72 .5V.8" fill="none" stroke="#dfb644" stroke-width=".12"/>';
    return '<ellipse cx=".5" cy=".65" rx=".38" ry=".22" fill="#c69c66" stroke="#755b3a" stroke-width=".06"/><path d="M.14 .56L.78 .77M.24 .75L.85 .53M.25 .47L.74 .83" stroke="#755b3a" stroke-width=".05"/><ellipse cx=".5" cy=".5" rx=".23" ry=".12" fill="#f5e5b7"/>';
}
export function boardSvg(state: Maze, help: boolean): string {
    const head = state.trace.at(-1)!, at = centre(state, head), end = centre(state, state.goal);
    const line = (cells: number[]): string => cells.map(c => { const p = centre(state, c); return `${p.x},${p.y}`; }).join(' ');
    const walls: string[] = [];
    const cells = state.grid.map((open, cell) => {
        const x = cell % state.columns, y = Math.floor(cell / state.columns);
        const segments = { N: `M${x} ${y}h1`, E: `M${x + 1} ${y}v1`, S: `M${x} ${y + 1}h1`, W: `M${x} ${y}v1` };
        for (const d of directions) if (!open.includes(d) && (d === 'N' || d === 'W' || d === 'E' && x === state.columns - 1 || d === 'S' && y === state.rows - 1)) walls.push(segments[d]);
        return `<rect data-cell="${cell}" data-open="${open.join('')}" data-head="${cell === head}" ${cell === state.start ? 'data-start' : ''} ${cell === state.goal ? 'data-goal' : ''} x="${x}" y="${y}" width="1" height="1" fill="${cell === state.goal ? '#e5eed3' : '#fffaf0'}"/>`;
    }).join('');
    const guide = characterSvg('dragon', state.finished ? 'celebration' : 'joie', 'repos', 'reduce').replace(/<svg[^>]*>/, `<g data-guide transform="translate(${at.x - .35} ${at.y - .35}) scale(${.7 / 240})">`).replace('</svg>', '</g>');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${state.columns} ${state.rows}" aria-hidden="true">${cells}<g data-destination transform="translate(${end.x - .5} ${end.y - .5})">${destination(state.level)}</g>${state.bonuses.map(c => { const p = centre(state, c); return `<text data-bonus="${c}" data-collected="${state.collected.includes(c)}" x="${p.x}" y="${p.y + .18}" text-anchor="middle" font-size=".6" fill="${state.collected.includes(c) ? '#96794a' : '#bd861f'}" opacity="${state.collected.includes(c) ? .3 : 1}">★</text>`; }).join('')}<polyline data-trace points="${line(state.trace)}" fill="none" stroke="#ac568c" stroke-width=".22" stroke-linejoin="round" stroke-linecap="round"/>${help && !state.finished ? `<polyline data-hint="${hint(state).join(',')}" points="${line([head, ...hint(state)])}" fill="none" stroke="#6d52a1" stroke-width=".1" stroke-dasharray=".12 .13"/>` : ''}<path data-walls d="${walls.join('')}" fill="none" stroke="#354e41" stroke-width=".1" stroke-linecap="round"/>${guide}</svg>`;
}
export function gameView(state: Maze, locale: Locale, help: boolean): string {
    return `<header class="play-header shapes-header"><button id="back" class="round" aria-label="${text(locale, 'home')}">${icon('home')}</button><button id="help" class="round" aria-label="${text(locale, 'pathHelp')}" aria-pressed="${help}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M23 45C23 36 12 32 14 21A18 18 0 0 1 50 21C52 32 41 36 41 45Z" fill="#f2d575" stroke="#705d37" stroke-width="3"/><path d="M24 51H40M27 57H37" stroke="#705d37" stroke-width="5"/></svg></button><button id="listen" class="round" aria-label="${text(locale, 'listen')}">${icon('ear')}</button></header><div class="chemin-instruction"><p aria-live="polite">${text(locale, state.finished ? 'finished' : 'pathInstruction')}</p></div><div class="chemin-zone" tabindex="0" role="application" aria-label="${text(locale, 'pathInstruction')}" style="--maze-ratio:${state.columns}/${state.rows};--maze-columns:${state.columns}">${boardSvg(state, help)}</div>${state.finished ? `<div class="chemin-reward"><div class="stars" aria-label="${rewardLabel(stars(), locale)}">★★★</div>${medal(state) ? `<div data-medal aria-label="${text(locale, 'pathMedal')}">🏅</div>` : ''}<div class="finish-actions"><button id="again">${icon('replay')}<span>${text(locale, 'again')}</span></button>${state.level < levels.length ? `<button id="next">${icon('arrow')}<span>${text(locale, 'next')}</span></button>` : ''}</div></div>` : ''}`;
}
