import type { Records } from '../engines/compter';
import type { Locale } from './i18n';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface Save { version: 1; locale: Locale; voice: boolean; sound: boolean; records: Records; pairesRecords: Records }
export const SAVE_KEY = 'opencadkid.v1';
export function fresh(locale: Locale = 'fr'): Save { return { version: 1, locale, voice: true, sound: true, records: {}, pairesRecords: {} }; }
export function browserStorage(): StoragePort | undefined { try { return window.localStorage; } catch { return undefined; } }
export function readSave(storage?: StoragePort, locale: Locale = 'fr'): Save {
    try {
        const data: unknown = JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null');
        if (!data || typeof data !== 'object') return fresh(locale);
        const v = data as Record<string, unknown>;
        if (v.version !== 1 || (v.locale !== 'fr' && v.locale !== 'en') || typeof v.voice !== 'boolean' || typeof v.sound !== 'boolean' || !v.records || typeof v.records !== 'object' || Array.isArray(v.records)) return fresh(locale);
        const records: Records = {};
        for (const [key, score] of Object.entries(v.records)) if (/^[1-8]$/.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) records[Number(key)] = score;
        const pairesRecords: Records = {};
        if (v.pairesRecords && typeof v.pairesRecords === 'object' && !Array.isArray(v.pairesRecords)) {
            for (const [key, score] of Object.entries(v.pairesRecords)) if (/^[1-7]$/.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) pairesRecords[Number(key)] = score;
        }
        return { version: 1, locale: v.locale, voice: v.voice, sound: v.sound, records, pairesRecords };
    } catch { return fresh(locale); }
}
export function writeSave(storage: StoragePort | undefined, save: Save): void { try { storage?.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* Play remains available when storage is full or blocked. */ } }
