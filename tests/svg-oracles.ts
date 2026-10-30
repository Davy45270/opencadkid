/** Ignore only the per-instance namespace, retaining local paint identity and all geometry. */
export function canonicalPaintIds(svg: string): string { return svg.replace(/(?:art-|guide)\d+(?=-)/g, 'paint-instance'); }

export function validSvg(svg: string): boolean {
    const stack: string[] = [];
    for (const token of svg.match(/<[^>]+>/g) ?? []) {
        const tag = /^<\/?([A-Za-z][\w-]*)/.exec(token)?.[1];
        if (!tag) return false;
        if (token.startsWith('</')) { if (stack.pop() !== tag) return false; }
        else {
            const attributes = token.replace(/^<[\w-]+/, '').replace(/\/?[>]$/, '');
            if (attributes.replace(/\s+[\w:-]+="[^"]*"/g, '').trim()) return false;
            if (!token.endsWith('/>')) stack.push(tag);
        }
    }
    return stack.length === 0;
}
export function paintIds(svg: string): string[] { return [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]!); }
export function paintReferences(svg: string): string[] { return [...svg.matchAll(/url\(#([^\s)]+)\)/g)].map(m => m[1]!); }
