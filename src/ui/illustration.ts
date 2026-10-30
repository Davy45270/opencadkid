/** Each SVG owns its paint servers, even when repeated in puzzle pieces. */
let instance = 0;
export function artId(): string { return `art-${++instance}`; }
function mix(color: string, target: number, amount: number): string {
    return '#' + [1, 3, 5].map(at => Math.round(parseInt(color.slice(at, at + 2), 16) * (1 - amount) + target * amount).toString(16).padStart(2, '0')).join('');
}
/** Keep the authored flat fill as fallback and the exact geometry as the silhouette.
 * The small white core is a reflection; the darker rim supplies a gentle inner shadow.
 * Tiny eye reflections and ink stay solid for legibility at thumbnail size. */
export function volume(body: string, tint = .27): string {
    const prefix = artId();
    // Embedded SVGs own their geometry and paint servers. Skip the whole subtree,
    // including flat fills which intentionally remain solid in a character.
    let svgDepth = 0;
    const tags = [...body.matchAll(/<\/?[a-z]+\b[^>]*>/gi)].filter(match => {
        const tag = match[0];
        if (/^<\/svg\b/i.test(tag)) { svgDepth--; return false; }
        if (/^<svg\b/i.test(tag)) { if (!tag.endsWith('/>')) svgDepth++; return false; }
        return svgDepth === 0;
    });
    const offsets = new Set(tags.map(match => match.index));
    const colors = [...new Set(tags
        .filter(m => !m[0].includes('style='))
        .flatMap(m => /fill="(#[\da-f]{6})"/i.exec(m[0])?.[1] ?? []))]
        .filter(c => !['#ffffff', '#354e41', '#49333c', '#58443b'].includes(c.toLowerCase()));
    const defs = colors.map((color, i) => `<radialGradient id="${prefix}-${i}" cx="32%" cy="25%" r="78%"><stop stop-color="${mix(color, 255, tint)}"/><stop offset=".48" stop-color="${color}"/><stop offset="1" stop-color="${mix(color, tint === .27 ? 35 : 0, tint === .27 ? .15 : tint)}"/></radialGradient>`).join('');
    const painted = body.replace(/<([a-z]+)\b([^>]*?)>/gi, (tag: string, _name: string, attrs: string, offset: number) => {
        if (!offsets.has(offset) || attrs.includes('style=')) return tag;
        const color = /fill="(#[\da-f]{6})"/i.exec(attrs)?.[1];
        const i = color ? colors.indexOf(color) : -1;
        return i < 0 ? tag : tag.replace(/(\/?)>$/, ` style="fill:url(#${prefix}-${i})"$1>`);
    });
    return `<defs>${defs}</defs>${painted}`;
}
