import type { Records } from '../engines/compter';
import type { Locale } from './i18n';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface Save { version: 1; locale: Locale; voice: boolean; sound: boolean; records: Records; pairesRecords: Records; formesRecords: Records; sonsRecords: Records; puzzleRecords: Records; cheminRecords: Records; suitesRecords: Records; rangerRecords: Records; tamboursRecords: Records; cheminMedals: Partial<Record<number, boolean>> }
export const SAVE_KEY = 'opencadkid.v1';
export function fresh(locale: Locale = 'fr'): Save { return { version: 1, locale, voice: true, sound: true, records: {}, pairesRecords: {}, formesRecords: {}, sonsRecords: {}, puzzleRecords: {}, cheminRecords: {}, suitesRecords: {}, rangerRecords: {}, tamboursRecords: {}, cheminMedals: {} }; }
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
        const formesRecords: Records = {};
        if (v.formesRecords && typeof v.formesRecords === 'object' && !Array.isArray(v.formesRecords)) {
            for (const [key, score] of Object.entries(v.formesRecords)) if (/^(?:[1-9]|10)$/.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) formesRecords[Number(key)] = score;
        }
        const sonsRecords: Records = {};
        if (v.sonsRecords && typeof v.sonsRecords === 'object' && !Array.isArray(v.sonsRecords)) {
            for (const [key, score] of Object.entries(v.sonsRecords)) if (/^(?:[1-9]|10)$/.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) sonsRecords[Number(key)] = score;
        }
        const puzzleRecords: Records = {};
        if (v.puzzleRecords && typeof v.puzzleRecords === 'object' && !Array.isArray(v.puzzleRecords)) {
            for (const [key, score] of Object.entries(v.puzzleRecords)) if (/^[1-8]$/.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) puzzleRecords[Number(key)] = score;
        }
        const cheminRecords: Records = {};
        if (v.cheminRecords && typeof v.cheminRecords === 'object' && !Array.isArray(v.cheminRecords)) {
            for (const [key, score] of Object.entries(v.cheminRecords)) if (/^[1-8]$/.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) cheminRecords[Number(key)] = score;
        }
        const suitesRecords: Records = {};
        if (v.suitesRecords && typeof v.suitesRecords === 'object' && !Array.isArray(v.suitesRecords)) {
            for (const [key, score] of Object.entries(v.suitesRecords)) if (/^(?:[1-9]|10)$/.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) suitesRecords[Number(key)] = score;
        }
        const rangerRecords: Records = {};
        if (v.rangerRecords && typeof v.rangerRecords === 'object' && !Array.isArray(v.rangerRecords)) {
            for (const [key, score] of Object.entries(v.rangerRecords)) if (/^[1-8]$/.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) rangerRecords[Number(key)] = score;
        }
        const tamboursRecords: Records = {};
        if (v.tamboursRecords && typeof v.tamboursRecords === 'object' && !Array.isArray(v.tamboursRecords)) {
            for (const [key, score] of Object.entries(v.tamboursRecords)) if (/^[1-8]$/.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) tamboursRecords[Number(key)] = score;
        }
        const cheminMedals: Partial<Record<number, boolean>> = {};
        if (v.cheminMedals && typeof v.cheminMedals === 'object' && !Array.isArray(v.cheminMedals)) {
            for (const [key, earned] of Object.entries(v.cheminMedals)) if (/^[4-8]$/.test(key) && earned === true && cheminRecords[Number(key)]) cheminMedals[Number(key)] = true;
        }
        return { version: 1, locale: v.locale, voice: v.voice, sound: v.sound, records, pairesRecords, formesRecords, sonsRecords, puzzleRecords, cheminRecords, suitesRecords, rangerRecords, tamboursRecords, cheminMedals };
    } catch { return fresh(locale); }
}
export function writeSave(storage: StoragePort | undefined, save: Save): void { try { storage?.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* Play remains available when storage is full or blocked. */ } }
