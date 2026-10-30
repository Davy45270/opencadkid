export interface Point { x: number; y: number }
export interface Rect extends Point { width: number; height: number }
/** Client coordinates and DOM rectangles always belong to the same viewport. */
export function screenToZone(point: Point, rect: Rect, size: Pick<Rect, 'width' | 'height'> = rect): Point {
    return { x: (point.x - rect.x) * size.width / rect.width, y: (point.y - rect.y) * size.height / rect.height };
}
export function distanceToZone(point: Point, rect: Rect): number {
    const p = screenToZone(point, rect);
    return Math.hypot(Math.max(-p.x, 0, p.x - rect.width), Math.max(-p.y, 0, p.y - rect.height));
}
export function dragPosition(point: Point, start: Point, origin: Point, rect: Rect, size: Pick<Rect, 'width' | 'height'>): Point {
    const end = screenToZone(point, rect, size), begin = screenToZone(start, rect, size);
    return { x: origin.x + end.x - begin.x, y: origin.y + end.y - begin.y };
}
