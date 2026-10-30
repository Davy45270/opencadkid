import { volume } from '../ui/illustration';
import { drawList, characters, type CharacterId, type Expression, type Animation, type Primitive } from './model';

const escape = (s: string): string => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
function primitive(p: Primitive): string {
    const paint = `fill="${p.fill || 'none'}" stroke="${p.stroke}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round"`;
    switch (p.kind) {
        case 'circle':
            return `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" ${paint}/>`;
        case 'ellipse':
            return `<ellipse class="${p.x < 90 && p.y > 120 && p.y < 165 && p.ry === 27 ? 'character-arm' : 'character-detail'}" cx="${p.x}" cy="${p.y}" rx="${p.rx}" ry="${p.ry}" transform="rotate(${p.rotation * 180 / Math.PI} ${p.x} ${p.y})" ${paint}/>`;
        case 'polygon':
        case 'line':
            return `<${p.kind === 'line' ? 'polyline' : 'polygon'} points="${p.points.map(v => v.join(',')).join(' ')}" ${paint}/>`;
        case 'path':
            return `<path d="${p.commands.map(c => c.op === 'C' ? `C ${c.a.join(' ')} ${c.b.join(' ')} ${c.p.join(' ')}` : `${c.op} ${c.p.join(' ')}`).join(' ')}${p.closed ? ' Z' : ''}" ${paint}/>`;
    }
}

export function characterSvg(id: CharacterId, expression: Expression = 'joie', animation: Animation = 'repos', motion: 'full' | 'reduce' = 'full'): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${escape(characters[id].fr)}">${volume('<ellipse cx="120" cy="218" rx="65" ry="10" fill="#c1b8a5" opacity=".28"/>' + drawList(id,'face',expression,animation,150,motion).map(primitive).join(''))}</svg>`;
}
