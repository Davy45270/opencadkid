export interface Point { x: number; y: number }
export interface Rect extends Point { width: number; height: number }
/** Client coordinates and DOM rectangles always belong to the same viewport. */
export function screenToZone(point: Point, rect: Rect, size: Pick<Rect, 'width' | 'height'> = rect): Point {
    return { x: (point.x - rect.x) * size.width / rect.width, y: (point.y - rect.y) * size.height / rect.height };
}
export function distanceToZone(point: Point, rect: Rect): number {
    // Measure in CSS viewport pixels, without scaling the snap allowance.
    return Math.hypot(Math.max(rect.x - point.x, 0, point.x - rect.x - rect.width), Math.max(rect.y - point.y, 0, point.y - rect.y - rect.height));
}
export function dragPosition(point: Point, start: Point, origin: Point, rect: Rect, size: Pick<Rect, 'width' | 'height'>): Point {
    const end = screenToZone(point, rect, size), begin = screenToZone(start, rect, size);
    return { x: origin.x + end.x - begin.x, y: origin.y + end.y - begin.y };
}

/** Sorting games share the same inclusive 24 CSS pixel snap boundary. */
export function withinDropZone(point: Point, rect: Rect): boolean {
    return distanceToZone(point, rect) <= 24;
}
