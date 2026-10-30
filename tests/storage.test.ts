import { it, expect } from 'vitest';
import { readSave, writeSave, fresh, SAVE_KEY } from '../src/shell/storage';
it('missing, corrupt, obsolete and blocked storage return a fresh state', () => {
    for (const value of [null, '', '{', 'null', '[]', '42', '{"version":2}', '{"version":1,"records":[]}']) expect(readSave({ getItem: () => value, setItem: () => undefined })).toEqual(fresh());
    expect(readSave()).toEqual(fresh());
    const blocked = { getItem: (): null => { throw new Error('blocked'); }, setItem: (): void => { throw new Error('full'); } };
    expect(readSave(blocked, 'en')).toEqual(fresh('en')); expect(() => writeSave(blocked, fresh())).not.toThrow();
});
it('round trips preferences and filters invalid level records', () => {
    let raw = '';
    const storage = { getItem: () => raw, setItem: (key: string, value: string) => { expect(key).toBe(SAVE_KEY); raw = value; } };
    const save = { ...fresh('en'), voice: false, records: { 1: 3, 2: 1 } };
    writeSave(storage, save); expect(readSave(storage)).toEqual(save);
    raw = JSON.stringify({ ...save, records: { 1: 2, 2: -1, 3: 4, 4: '3', 5: 1.5, 9: 3 } });
    expect(readSave(storage).records).toEqual({ 1: 2 });
});
