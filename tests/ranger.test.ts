import { afterEach, expect, it, vi } from 'vitest';
import { advance, catalog, complete, generateRound, isUnlocked, levels, place, start, stars, type ObjectItem, type Question } from '../src/engines/ranger';
import { objectSvg, labels, pic } from '../src/games/ranger/items';
import { gameView, instruction, levelView } from '../src/games/ranger/view';
import { resetActivations } from '../src/shell/activation';
import { bindObjects } from '../src/games/ranger/interaction';
import { bindPatternChoices } from '../src/games/suites/interaction';
import * as suites from '../src/engines/suites';
import { fresh, readSave, writeSave } from '../src/shell/storage';
import { validSvg } from './svg-oracles';
import silhouettes from './ranger-drawings.json';
import { expectedInstruction } from './ranger-oracles';
/** Independent predicate: never imports belongs or consumes an engine answer. */
function oracle(q: Question, o: ObjectItem, bin: string): boolean {
    switch (q.rule) {
        case 'color': return o.color === bin;
        case 'shape': return o.shape === bin;
        case 'size': return o.size === bin;
        case 'category': return o.category === bin;
        case 'two': return (o.color === q.color && o.category === q.category) === (bin === 'oui');
        case 'intrus': return (o.category !== q.category) === (bin === 'intrus');
    }
}
it('catalogue: complete attributes, unique identities and bilingual names', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(30);
    expect(new Set(catalog.map(o => o.kind)).size).toBeGreaterThanOrEqual(30);
    expect(new Set(catalog.map(o => o.id)).size).toBe(catalog.length);
    expect(new Set(catalog.map(o => [o.kind, o.color, o.size].join(':'))).size).toBe(catalog.length);
    for (const o of catalog) {
        expect(['rouge', 'vert', 'jaune']).toContain(o.color); expect(['rond', 'carre', 'long']).toContain(o.shape);
        expect(['petit', 'grand']).toContain(o.size); expect(['fruit', 'jouet', 'vetement', 'animal', 'cuisine']).toContain(o.category);
        expect(o.names.fr.trim()).not.toBe(''); expect(o.names.en.trim()).not.toBe('');
    }
});
const table = [['color', 2], ['shape', 2], ['size', 2], ['category', 2], ['color', 3], ['category', 3], ['two', 2], ['intrus', 2]];
it('independent eight-level table and invalid inputs', () => {
    expect(levels.map(l => [l.rule, l.bins])).toEqual(table);
    for (const level of [0, 9, 1.5, NaN]) expect(() => generateRound(level, 1)).toThrow();
    for (const count of [0, -1, 1.5, NaN]) expect(() => generateRound(1, 1, count)).toThrow();
});
for (let level = 1; level <= 8; level++) it(`level ${level}: 300 seeds, unique membership, occupied bins and no colour shortcut`, () => {
    for (let seed = 0; seed < 300; seed++) {
        const round = generateRound(level, seed);
        expect(round).toEqual(generateRound(level, seed)); expect(round).toHaveLength(4);
        for (const q of round) {
            expect(q.rule).toBe(table[level - 1]![0]); expect(q.bins).toHaveLength(Number(table[level - 1]![1]));
            expect(q.objects).toHaveLength(q.bins.length === 3 ? 6 : 4);
            expect(new Set(q.objects.map(o => o.id)).size).toBe(q.objects.length);
            for (const o of q.objects) expect(q.bins.filter(b => oracle(q, o, b))).toHaveLength(1);
            for (const bin of q.bins) {
                const members = q.objects.filter(o => oracle(q, o, bin)); expect(members.length).toBeGreaterThan(0);
                if (q.rule !== 'color') expect(members.some(o => q.objects.some(other => !oracle(q, other, bin) && other.color === o.color))).toBe(true);
            }
            if (q.rule === 'intrus') expect(q.objects.filter(o => o.category !== q.category)).toHaveLength(1);
            if (q.rule === 'two') {
                expect(q.objects.some(o => o.category === q.category && o.color !== q.color)).toBe(true);
                expect(q.objects.some(o => o.category !== q.category && o.color === q.color)).toBe(true);
            }
        }
    }
    expect(generateRound(level, 1)).not.toEqual(generateRound(level, 2));
}, 30_000);
it('pure placement, object-specific two-error hint, soft return, invalid and duplicate guards', () => {
    const initial = start(1, 42), snapshot = structuredClone(initial), q = initial.questions[0]!, a = q.objects[0]!, b = q.objects[1]!;
    const wrong = q.bins.find(bin => !oracle(q, a, bin))!, right = q.bins.find(bin => oracle(q, a, bin))!;
    const once = place(initial, a.id, wrong); expect(once).toMatchObject({ correct: false, returned: true, hint: false });
    expect(once.state.placed).toEqual([]); expect(advance(once.state)).toBe(once.state);
    const other = place(once.state, b.id, q.bins.find(bin => !oracle(q, b, bin))!); expect(other.hint).toBe(false);
    const twice = place(other.state, a.id, wrong); expect(twice.hint).toBe(true); expect(twice.state.hint).toBe(a.id);
    expect(twice.state.errors).toBe(3); expect(twice.state.objectErrors[a.id]).toBe(2); expect(initial).toEqual(snapshot);
    const placed = place(twice.state, a.id, right); expect(placed.state.hint).toBeNull(); expect(placed.state.placed).toEqual([a.id]);
    expect(place(placed.state, a.id, right).state).toBe(placed.state);
    for (const [id, bin] of [['missing', right], [a.id, 'missing']]) expect(place(initial, id!, bin!).state).toBe(initial);
});
it('common rewards, every level completes, lowest score unlocks and best score survives', () => {
    expect(Array.from({ length: 7 }, (_, n) => stars(n))).toEqual([1, 1, 1, 2, 2, 3, 3]);
    for (let level = 1; level <= 8; level++) for (const clean of [true, false]) {
        let s = start(level, 77); expect(complete({}, s)).toEqual({});
        for (let i = 0; i < 6; i++) {
            const q = s.questions[s.index]!;
            if (!clean) {
                const o = q.objects.find(o => q.rule !== 'intrus' || o.category === q.category)!;
                s = place(s, o.id, q.rule === 'intrus' ? 'intrus' : q.bins.find(b => !oracle(q, o, b))!).state;
            }
            for (const o of q.objects) {
                if (q.rule === 'intrus' && o.category === q.category) continue;
                s = place(s, o.id, q.bins.find(b => oracle(q, o, b))!).state;
            }
            expect(s.solved).toBe(true); const solved = s;
            expect(place(s, q.objects[0]!.id, q.bins[0]!).state).toBe(solved);
            s = advance(s);
        }
        expect(s.finished).toBe(true); expect(s.firstTry).toBe(clean ? 6 : 0);
        const records = complete({}, s); expect(records[level]).toBe(clean ? 3 : 1);
        expect(complete({ [level]: 3 }, s)[level]).toBe(3); expect(isUnlocked(level + 1, records)).toBe(true);
        expect(advance(s)).toBe(s);
    }
});
it('bilingual rules, hints and finite valid procedural illustrations', () => {
    expect(Object.keys(labels.fr).sort()).toEqual(Object.keys(labels.en).sort());
    for (const locale of ['fr', 'en'] as const) {
        expect(Object.values(labels[locale]).every(Boolean)).toBe(true);
        for (const o of catalog) { const drawing = objectSvg(o, locale); expect(validSvg(drawing)).toBe(true); expect(drawing).not.toMatch(/NaN|Infinity|undefined/); expect(drawing).toContain(o.names[locale]); }
        for (const key of ['rouge', 'vert', 'jaune', 'petit', 'grand', 'carre', 'rond', 'long', 'fruit', 'jouet', 'vetement', 'animal', 'cuisine', 'oui', 'non']) expect(validSvg(pic(key))).toBe(true);
        expect(levelView(fresh(locale))).toContain('data-level="8"');
        for (let level = 1; level <= 8; level++) {
            const s = start(level, 19), q = s.questions[0]!;
            expect(instruction(q, locale)).not.toBe(''); expect(gameView(s, locale)).not.toMatch(/NaN|Infinity|undefined/);
            for (const o of q.objects) for (const attr of ['color', 'shape', 'size', 'category'] as const) expect(gameView(s, locale)).toContain(`data-${attr}="${o[attr]}"`);
        }
    }
});
it('isolated records migrate, filter and round-trip', () => {
    let raw = JSON.stringify({ ...fresh(), records: { 1: 3 }, rangerRecords: { 1: 2, 8: 3, 9: 2, 2: 0, 3: 1.5, 4: '3' } });
    const port = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
    const save = readSave(port); expect(save.rangerRecords).toEqual({ 1: 2, 8: 3 }); expect(save.records).toEqual({ 1: 3 });
    writeSave(port, save); expect(readSave(port)).toEqual(save);
    raw = JSON.stringify({ version: 1, locale: 'fr', voice: true, sound: true, records: { 1: 2 } });
    expect(readSave(port).rangerRecords).toEqual({}); expect(fresh().rangerRecords).toEqual({});
});
/** Minimal in-memory DOM: real controllers own all listeners and activation keys. */
class TestDocument extends EventTarget {
    hidden = false;
    private sequence = 0;
    readonly frames = new Map<number, FrameRequestCallback>();
    readonly defaultView = {
        requestAnimationFrame: (callback: FrameRequestCallback): number => { const id = ++this.sequence; this.frames.set(id, callback); return id; },
        cancelAnimationFrame: (id: number): void => { this.frames.delete(id); }
    };
}
class TestElement extends EventTarget {
    readonly ownerDocument = document as unknown as TestDocument;
    dataset: Record<string, string> = {};
    style = { transform: '' };
    classList = { add: vi.fn(), remove: vi.fn() };
    attributes = new Map<string, string>();
    isConnected = true;
    onclick: ((event: Event & { detail: number }) => void) | null = null;
    animate = vi.fn();
    focus = vi.fn();
    private capture: number | undefined;
    constructor(data: Record<string, string> = {}, private x = 0, private y = 0) { super(); this.dataset = data; }
    setAttribute(key: string, value: string): void { this.attributes.set(key, value); }
    setPointerCapture(id: number): void { this.capture = id; }
    hasPointerCapture(id: number): boolean { return this.capture === id; }
    releasePointerCapture(): void { this.capture = undefined; }
    getBoundingClientRect(): DOMRect { return { x: this.x, y: this.y, left: this.x, top: this.y, right: this.x + 100, bottom: this.y + 100, width: 100, height: 100, toJSON: () => ({}) }; }
    send(type: string, overrides = {}): void {
        const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: this.x + 50, clientY: this.y + 50, detail: 1 }, overrides);
        // EventTarget has no DOM ancestry: forward document capture before the
        // target, and document bubble after the target's normal drop handler.
        if (type === 'pointercancel' || type === 'lostpointercapture') this.ownerDocument.dispatchEvent(event);
        this.dispatchEvent(event); if (type === 'click') this.onclick?.(event);
        if (type === 'pointerup') this.ownerDocument.dispatchEvent(event);
    }
    tap(): void { for (const type of ['pointerdown', 'pointerup', 'click']) this.send(type); }
    get element(): HTMLElement { return this as unknown as HTMLElement; }
}
class TestRoot extends TestElement {
    constructor(readonly objects: TestElement[], readonly bins: TestElement[] = [], readonly choices: TestElement[] = []) { super(); }
    querySelectorAll(selector: string): TestElement[] {
        if (selector.startsWith('[data-bin]')) return this.bins;
        if (selector.startsWith('[data-pattern-choice]')) return this.choices;
        if (selector.startsWith('[data-object]')) return this.objects;
        return [];
    }
    querySelector(selector: string): TestElement | null {
        if (selector.startsWith('.suites-active')) return this.bins[0] ?? null;
        return this.objects.find(el => selector.includes(`"${el.dataset.object!}"`)) ?? null;
    }
}
function testDocument(): void {
    vi.stubGlobal('document', new TestDocument());
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    resetActivations();
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('suites: real controller places A then B at zero milliseconds', () => {
    testDocument(); vi.useFakeTimers({ toFake: ['performance'] });
    let s = suites.start(9, 17);
    const q = s.questions[0]!;
    expect(q.mode).toBe('deux-suivants');
    const choices = q.answers.map(choice => new TestElement({ patternChoice: String(choice) }));
    const root = new TestRoot([], [new TestElement({}, 200, 200)], choices);
    const dispose = bindPatternChoices(root.element, s, choice => { s = suites.answer(s, choice).state; });
    const time = performance.now();
    for (const choice of choices) choice.tap();
    expect(performance.now()).toBe(time);
    expect(s.placed).toEqual(q.answers); expect(s.solved).toBe(true); expect(s.index).toBe(0); dispose();
});
function rangerFixture() {
    testDocument();
    let s = start(1, 19), selected: string | undefined;
    const q = s.questions[0]!;
    const objects = q.objects.map(o => new TestElement({ object: o.id }));
    const bins = q.bins.map(bin => new TestElement({ bin }, 200, 200));
    const root = new TestRoot(objects, bins);
    const respond = vi.fn((id: string, bin: string) => { s = place(s, id, bin).state; });
    const dispose = bindObjects(root.element, s, () => selected, id => { selected = id; }, respond);
    return { q, objects, bins, root, respond, dispose, state: () => s, selected: () => selected };
}
it('ranger: real controller places two objects in the same bin at zero milliseconds', () => {
    const f = rangerFixture(); vi.useFakeTimers({ toFake: ['performance'] });
    const bin = f.q.bins[0]!, pair = f.q.objects.filter(o => oracle(f.q, o, bin));
    const time = performance.now();
    for (const o of pair) { f.objects.find(el => el.dataset.object === o.id)!.tap(); f.bins[0]!.tap(); }
    expect(performance.now()).toBe(time); expect(f.state().placed).toEqual(pair.map(o => o.id)); expect(f.respond).toHaveBeenCalledTimes(2); f.dispose();
});
for (const ending of ['pointercancel', 'lostpointercapture']) it(`ranger: ${ending} preserves the displayed selection and its bin action`, () => {
    const f = rangerFixture(), a = f.objects[0]!, b = f.objects[1]!;
    a.tap(); const before = structuredClone(f.state());
    b.send('pointerdown'); b.send('pointermove', { clientX: 80 }); b.send(ending); b.send('pointerup'); b.send('click');
    expect(f.state()).toEqual(before); expect(f.selected()).toBe(a.dataset.object);
    expect(a.attributes.get('aria-pressed')).toBe('true'); expect(b.attributes.get('aria-pressed')).toBe('false');
    expect(b.style.transform).toBe('');
    const bin = f.q.bins.findIndex(bin => oracle(f.q, f.q.objects[0]!, bin)); f.bins[bin]!.tap();
    expect(f.state().placed).toEqual([a.dataset.object]); expect(f.respond).toHaveBeenCalledTimes(1); f.dispose();
});
for (const reduced of [false, true]) it(`ranger: wrong drop returns gently with reduced motion ${reduced}`, () => {
    const f = rangerFixture(); vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced })));
    const wrong = 0, index = f.q.objects.findIndex(o => !oracle(f.q, o, f.q.bins[wrong]!)), a = f.objects[index]!;
    a.send('pointerdown'); a.send('pointermove', { clientX: 250, clientY: 250 }); a.send('pointerup', { clientX: 250, clientY: 250 });
    expect(f.respond).toHaveBeenCalledWith(a.dataset.object, f.q.bins[wrong]);
    expect(f.state().errors).toBe(1); expect(f.state().placed).toEqual([]); expect(a.style.transform).toBe('');
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    if (reduced) expect(a.animate).not.toHaveBeenCalled();
    else expect(a.animate).toHaveBeenCalledExactlyOnceWith([{ transform: 'translate(200px, 200px)' }, { transform: 'translate(0, 0)' }], { duration: 260, easing: 'ease-out' });
    f.dispose();
});

it('drawn silhouettes identify every kind and actual paint follows its colour', () => {
    // Fixed reference geometry, independent of accessible names and data attributes.
    expect(Object.keys(silhouettes).sort()).toEqual([...new Set(catalog.map(o => o.kind))].sort());
    const palette = { rouge: '#df6c66', vert: '#81b16b', jaune: '#edc350' };
    for (const o of catalog) {
        const drawing = objectSvg(o, 'fr').replace(/ style="[^"]*"/g, '');
        expect(drawing).toContain(`<g fill="${palette[o.color]}" stroke="#58443b" stroke-width="2" stroke-linejoin="round">${silhouettes[o.kind as keyof typeof silhouettes]}</g>`);
        expect(drawing).toContain(`<stop offset=".48" stop-color="${palette[o.color]}"/>`);
    }
});
it('size pictograms show a smaller small circle and a larger large circle', () => {
    expect(pic('petit')).toContain('<circle cx="32" cy="32" r="14"');
    expect(pic('grand')).toContain('<circle cx="32" cy="32" r="28"');
    expect(pic('rond')).toContain('<circle cx="32" cy="32" r="27"');
    expect(pic('carre')).toContain('<rect x="5" y="5" width="54" height="54"');
    expect(pic('long')).toContain('<rect x="20" y="3" width="24" height="58"');
    for (const [category, kind] of [['fruit', 'pomme'], ['jouet', 'ballon'], ['vetement', 'pull'], ['animal', 'chat'], ['cuisine', 'spatule']] as const) {
        expect(pic(category).replace(/ style="[^"]*"/g, '')).toContain(silhouettes[kind]);
    }
});
it('every rule has an independent complete French and English instruction', () => {
    for (const locale of ['fr', 'en'] as const) for (let level = 1; level <= 8; level++) for (const q of generateRound(level, 19)) {
        const expected = expectedInstruction(q, locale);
        expect(instruction(q, locale)).toBe(expected);
    }
});
it('presentation shuffles combinations and puts the intruder in every position', () => {
    const combinations = new Set<string>(), intruderPositions = new Set<number>();
    for (let seed = 0; seed < 100; seed++) {
        for (const q of generateRound(7, seed)) combinations.add(q.objects.map(o => `${Number(o.category === q.category)}${Number(o.color === q.color)}`).join(','));
        for (const q of generateRound(8, seed)) intruderPositions.add(q.objects.findIndex(o => o.category !== q.category));
    }
    for (let level = 1; level <= 6; level++) {
        const rounds = Array.from({ length: 40 }, (_, seed) => generateRound(level, seed)).flat();
        expect(rounds.some(q => q.objects.some((o, i) => i > 0 && q.rule !== 'two' && q.rule !== 'intrus' && o[q.rule] === q.objects[i - 1]![q.rule]))).toBe(true);
    }
    expect(combinations.size).toBeGreaterThan(1);
    expect([...intruderPositions].sort()).toEqual([0, 1, 2, 3]);
});
