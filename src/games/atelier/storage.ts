import { parseGallery } from '../../engines/atelier';
import type { StoragePort } from '../../shell/storage';
export const GALLERY_KEY = 'opencadkid.atelier.v1';
export function readGallery(storage?: StoragePort): string[] { try { return parseGallery(storage?.getItem(GALLERY_KEY) ?? null); } catch { return []; } }
export function writeGallery(storage: StoragePort | undefined, gallery: readonly string[]): boolean { try { if (!storage) return false; storage.setItem(GALLERY_KEY,JSON.stringify(gallery)); return true; } catch { return false; } }
export function eraseGallery(storage?: StoragePort): boolean { return writeGallery(storage,[]); }
