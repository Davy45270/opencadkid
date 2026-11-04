import { deserialize, parseGallery, serialize, start, type Artwork, type State } from '../../engines/atelier';
import type { StoragePort } from '../../shell/storage';
export const GALLERY_KEY = 'opencadkid.atelier.v1';
export function readGallery(storage?: StoragePort): string[] { try { return parseGallery(storage?.getItem(GALLERY_KEY) ?? null); } catch { return []; } }
export function writeGallery(storage: StoragePort | undefined, gallery: readonly string[]): boolean { try { if (!storage) return false; storage.setItem(GALLERY_KEY,JSON.stringify(gallery)); return true; } catch { return false; } }
export function eraseGallery(storage?: StoragePort): boolean { return writeGallery(storage,[]); }
/** The sheet in progress, kept on this device so leaving the studio or closing the page loses nothing. */
export const DRAFT_KEY = 'opencadkid.atelier.draft.v1';
export function readDraft(storage?: StoragePort): State { try { const art=deserialize(storage?.getItem(DRAFT_KEY) ?? ''); return art ? {...start(art.drawing,art.mode),art} : start(); } catch { return start(); } }
export function writeDraft(storage: StoragePort | undefined, art: Artwork): boolean { try { if (!storage) return false; storage.setItem(DRAFT_KEY,serialize(art)); return true; } catch { return false; } }
