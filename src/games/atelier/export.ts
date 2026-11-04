import { type Artwork } from '../../engines/atelier';
import type { Locale } from '../../shell/i18n';
import { thumbnail } from './view';
/** Width and height of the saved picture: three times the 320 × 300 sheet, sharp on a phone screen. */
export const EXPORT_SCALE = 3;
/** Saves the current sheet as a PNG file on this device. Everything happens locally: no network, no account. */
export async function exportPicture(art: Artwork, locale: Locale, doc: Document = document): Promise<boolean> {
    try {
        const svg = thumbnail(art, locale).replace('<svg ', `<svg width="${320 * EXPORT_SCALE}" height="${300 * EXPORT_SCALE}" `);
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        const image = new Image();
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('image')); image.src = url; });
        const canvas = doc.createElement('canvas'); canvas.width = 320 * EXPORT_SCALE; canvas.height = 300 * EXPORT_SCALE;
        const context = canvas.getContext('2d'); if (!context) return false;
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!png) return false;
        const link = doc.createElement('a'), stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        link.href = URL.createObjectURL(png); link.download = `opencadkid-${art.drawing}-${stamp}.png`;
        doc.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
        return true;
    } catch { return false; }
}
