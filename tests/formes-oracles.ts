// Literal visual oracle, deliberately independent of the renderer's palette.
export const expectedFills = {
    rouge: '#ce3449', bleu: '#287cc1', jaune: '#f4d442', vert: '#30834c',
    orange: '#ef8a28', violet: '#8246a5', rose: '#ec86b1', marron: '#805338'
} as const;
export function rgb(hex: string): number[] {
    return hex.slice(1).match(/../g)!.map(c => parseInt(c, 16) / 255);
}
export function luminance(channels: number[]): number {
    const linear = channels.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return linear[0]! * .2126 + linear[1]! * .7152 + linear[2]! * .0722;
}
export function hue(channels: number[]): number {
    const [r, g, b] = channels as [number, number, number];
    const max = Math.max(r, g, b), delta = max - Math.min(r, g, b);
    if (!delta) return 0;
    return ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
}
