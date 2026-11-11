import { arrival, complete, FRIENDS, helpLanes, isUnlocked, lapOf, LEAD, levelOf, parseRecords, ROW, rowsOf, start, tick, touch, type Event, type Fail, type Records, type State } from '../../engines/essaim';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { blackHole, bubble, bubbleWidth, carpet, comet, dust, effects, failAnimations, failWords, friend, gate, ghost, planet, rock, soapBubble, star, thingAnimations, U } from './art';
import { boardSvg, cx, gameView, goalsHtml, instruction, labels, layout, levelView, typeset, type Layout } from './view';

export const RECORDS_KEY = 'opencadkid.essaim.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
/** One tick of the sky, in ms: a row goes by every second, the rocket glides one lane in half a second. While the child keeps
 * a finger on the sky, it goes twice as slowly. */
export const TICK_MS = 250, HELD_SLOWER = 2;
/** A funny try holds the sky still; the home planet comes down at the end. */
export const FAIL_MS = 1300, PLANET_MS = 2200;
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { paused: boolean; fail: Fail | null; layout: Layout | null; held: boolean; ending: boolean } = { paused: false, fail: null, layout: null, held: false, ending: false };
/** Where row k of the sky is drawn, in units, at tick t: it reaches the rocket at its arrival. */
const skyY = (l: Layout, t: number): number => l.rocketY - LEAD * U + t * U / ROW;
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.essaim-zone svg')?.getBoundingClientRect(), s = session.state, l = observed.layout;
    let geom = null;
    if (r && s && l) { const k = r.width / l.W; geom = { x0: r.x + l.ox * k, cell: U * k, rocketY: r.y + l.rocketY * k, top: r.y, bottom: r.y + r.height, left: r.x, right: r.x + r.width }; }
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, geom, paused: observed.paused, fail: observed.fail, held: observed.held, ending: observed.ending, hint: s ? helpLanes(s) : [] };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', clock = 0, lastLane: number | null = null;
    observed = { paused: false, fail: null, layout: null, held: false, ending: false };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 40) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'essaim:home');
        root.querySelectorAll<HTMLElement>('[data-essaim-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.essaimLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `essaim:level:${el.dataset.essaimLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#essaim-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.essaim-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.essaim-zone svg');
    const layer = (name: string): SVGGElement | null => root.querySelector<SVGGElement>(`[data-${name}]`);
    const place = (el: SVGGElement | null, x: number, y: number, ms = 0): void => { if (!el) return; el.style.transitionDuration = `${reduce ? 0 : ms}ms`; el.style.transform = `translate(${x}px,${y}px)`; };
    const effect = (x: number, y: number, inner: string): void => { layer('effects')?.insertAdjacentHTML('beforeend', `<g transform="translate(${x} ${y})">${inner}</g>`); };
    const tickMs = (): number => TICK_MS * (observed.held ? HELD_SLOWER : 1);
    const drawing = (c: string): string => c === '*' ? star() : FRIENDS.includes(c) ? friend(c) : c === 'P' ? gate() : c === 'o' ? rock() : c === 'd' ? dust() : c === 'b' ? soapBubble() : c === 'm' ? comet() : c === '>' ? carpet() : c === '<' ? `<g transform="scale(-1 1)">${carpet()}</g>` : c === '@' ? blackHole() : '';
    /** The things of the sky near the screen, each kept by its key from tick to tick: goals not picked up yet (a goal of a row
     * still to come shows the lane it will come by), the things, the friends already found (on a later turn). */
    const sync = (s: State, ms: number): void => {
        const l = observed.layout, g = layer('sky'); if (!l || !g) return;
        const lv = levelOf(s.level), lap = lapOf(lv), rows = rowsOf(lv), y0 = skyY(l, s.t);
        place(g, 0, y0, ms);
        const want = new Map<string, { x: number; k: number; draw: string; kind: string }>();
        const kMin = Math.max(0, Math.floor((y0 - l.H) / U) - 1), kMax = Math.ceil((y0 + U) / U) + 1;
        for (let k = kMin; k <= kMax; k++) {
            const j = k % lap; if (j >= rows.length) continue;
            const ahead = arrival(k) > s.t;
            const covered = new Set<number>();
            for (const goal of s.goals) {
                if (goal.j !== j) continue;
                if (!goal.got) { if (ahead) covered.add(goal.lane); want.set(`g${goal.id}@${k}`, { x: goal.lane, k, draw: goal.kind, kind: goal.kind }); }
                else if (FRIENDS.includes(goal.kind) && goal.at !== null && goal.at < k) want.set(`h${goal.id}@${k}`, { x: goal.lane, k, draw: 'ghost' + goal.kind, kind: 'h' });
            }
            for (let x = 0; x < rows[j]!.length; x++) { const c = rows[j]![x]!; if ('odbm<>@'.includes(c) && !covered.has(x)) want.set(`o${k},${x}`, { x, k, draw: c, kind: c }); }
        }
        const have = new Map<string, SVGGElement>();
        g.querySelectorAll<SVGGElement>(':scope > [data-key]').forEach(el => have.set(el.dataset.key!, el));
        for (const [key, el] of have) if (!want.has(key) && el.dataset.leaving === undefined) el.remove();
        for (const [key, w] of want) {
            let el = have.get(key);
            const passed = arrival(w.k) <= s.t;
            if (!el) {
                if (passed && key.startsWith('g')) continue;
                g.insertAdjacentHTML('beforeend', `<g data-key="${key}" data-thing="${w.kind}" data-row="${w.k}" data-lane="${w.x}"><g class="essaim-chose">${w.draw.startsWith('ghost') ? ghost(w.draw.slice(5)) : drawing(w.draw)}</g></g>`);
                el = g.lastElementChild as SVGGElement;
                place(el, cx(l, w.x), -w.k * U, 0);
            } else if (!passed && Number(el.dataset.lane) !== w.x) { el.dataset.lane = String(w.x); place(el, cx(l, w.x), -w.k * U, 600); }
        }
        marks(s);
    };
    /** The help: the lane of each goal missed three times shines in gold, from the top of the sky down to the rocket. */
    const marks = (s: State): void => {
        const l = observed.layout, m = layer('hint'); if (!l || !m) return;
        const lanes = [...new Set(helpLanes(s).map(h => h.lane))];
        zone()?.toggleAttribute('data-help', lanes.length > 0);
        m.innerHTML = lanes.map(x => `<g data-hint-lane="${x}"><g class="essaim-hint"><rect x="${cx(l, x) - .46 * U}" y="${.1 * U}" width="${.92 * U}" height="${l.rocketY - .1 * U}" rx="40" fill="#fff3a044" stroke="#f5b400" stroke-width="8" stroke-dasharray="4 14" stroke-linecap="round"/></g></g>`).join('');
    };
    const rocketEl = (): SVGGElement | null => layer('rocket');
    const placeRocket = (s: State, ms: number): void => { const l = observed.layout; if (l) place(rocketEl(), cx(l, s.pos / 2), l.rocketY, ms); };
    const drawTrain = (s: State): void => {
        const tr = layer('train'); if (!tr) return;
        const at = [[-.62, .95], [.62, .95], [-1.15, 1.05], [1.15, 1.05], [0, 1.25]];
        tr.innerHTML = s.train.map((k, i) => { const [dx, dy] = at[i % at.length]!; return `<g data-friend="${i}" data-kind="${k}" transform="translate(${dx! * U} ${dy! * U}) scale(.55)"><g class="essaim-ami">${friend(k)}</g></g>`; }).join('');
    };
    const goalsBar = (s: State): void => { const el = root.querySelector('.essaim-goals'); if (el) el.outerHTML = goalsHtml(s, locale); };
    const wordBubble = (word: string, x: number, y: number): void => {
        const l = observed.layout; if (!l) return;
        const half = bubbleWidth(word) / 2 + 14;
        effect(Math.min(l.W - half, Math.max(half, x)), Math.max(110, y), bubble(word));
    };
    /** The thing a funny try is about. */
    const thingOf = (e: Extract<Event, { kind: 'fail' }>): Element[] => {
        const all = (sel: string): Element[] => [...root.querySelectorAll(sel)];
        switch (e.fail) {
            case 'bord': return all(`[data-edge="${e.lane === 0 ? 'left' : 'right'}"] .essaim-filante`);
            case 'calin': { const s = session.state!, g = s.goals.find(x => x.got && FRIENDS.includes(x.kind) && x.lane === e.lane && x.j === e.k % lapOf(levelOf(s.level))); return all(`[data-friend][data-kind="${g?.kind ?? 'F'}"] .essaim-ami`).slice(0, 1); }
            case 'porte': return all(`[data-sky] [data-key^="g"][data-row="${e.k}"][data-thing="P"] .essaim-chose`);
            default: return all(`[data-sky] [data-key="o${e.k},${e.lane}"] .essaim-chose`);
        }
    };
    /** A funny try: the rocket plays its reaction, the thing plays its own, a bubble says the sound word; the sky holds still. */
    const funny = async (e: Extract<Event, { kind: 'fail' }>): Promise<void> => {
        const kind = e.fail, l = observed.layout; if (!l) return;
        observed.fail = kind; observed.paused = true; say(t.fail[kind]);
        recordActivation(`essaim:try:${kind}`, 'action', false, kind);
        const body = rocketEl()?.querySelector<SVGGElement>('.essaim-fusee');
        if (body) { body.style.setProperty('--essaim-bord', e.lane === 0 ? '-24px' : '24px'); body.classList.add(failAnimations[kind]); if (kind === 'poussiere') body.classList.add('essaim-poussiereuse'); }
        const targets = thingOf(e), anim = thingAnimations[kind];
        targets.forEach(el => el.classList.add(anim));
        // The thing the rocket met moves up off its nose, so that both are seen while they play.
        targets.forEach(el => { const th = el.closest<SVGGElement>('[data-sky] [data-thing]'); if (th) place(th, cx(l, Number(th.dataset.lane)), -Number(th.dataset.row) * U - .4 * U, 250); });
        // The rocket backs off a little, to make room between them.
        const corps = rocketEl()?.querySelector<SVGGElement>('.essaim-corps');
        if (corps && kind !== 'bord' && kind !== 'calin') { corps.style.transition = reduce ? '' : 'transform .25s ease-out'; corps.style.transform = `translateY(${.5 * U}px)`; }
        const x = cx(l, e.lane), y = l.rocketY - .5 * U;
        effect(x, y, effects[kind]);
        wordBubble(failWords[locale][kind], x, y - .3 * U);
        await wait(FAIL_MS);
        if (gone()) return;
        body?.classList.remove(failAnimations[kind]);
        targets.forEach(el => el.classList.remove(anim));
        if (corps) corps.style.transform = '';
        const fx = layer('effects'); if (fx) fx.innerHTML = '';
        observed.fail = null; observed.paused = false;
        if (kind === 'poussiere') { await wait(1500); body?.classList.remove('essaim-poussiereuse'); }
    };
    const handle = (events: Event[], s: State): void => {
        const l = observed.layout; if (!l) return;
        for (const e of events) {
            if (e.kind === 'got') {
                const goal = s.goals[e.goal]!, el = root.querySelector<SVGGElement>(`[data-sky] [data-key="g${goal.id}@${e.k}"]`);
                if (el) { el.dataset.leaving = ''; el.querySelector('.essaim-chose')?.classList.add(goal.kind === 'P' ? 'essaim-ouvre' : 'essaim-attrape'); if (goal.kind === 'P') { const c = el.querySelector('.essaim-chose'); if (c) c.innerHTML = gate(true); } window.setTimeout(() => el.remove(), reduce ? 0 : 800); }
                recordActivation(`essaim:got:${goal.kind}`, 'action', true, String(goal.id));
                if (FRIENDS.includes(goal.kind)) { drawTrain(s); say(t.friend[goal.kind]!); }
                else say(goal.kind === 'P' ? t.open : t.star, goal.kind === 'P');
                goalsBar(s);
            } else if (e.kind === 'tapis') {
                placeRocket(s, 450);
                const b = rocketEl()?.querySelector('.essaim-corps'); b?.classList.add('essaim-pousse'); window.setTimeout(() => b?.classList.remove('essaim-pousse'), 650);
                say(t.push, false);
            } else if (e.kind === 'trou') {
                rocketEl()?.querySelector('.essaim-corps')?.classList.add('essaim-dans-trou'); say(t.hole);
            } else if (e.kind === 'fail') void funny(e);
        }
        const b = rocketEl()?.querySelector('.essaim-corps');
        if (s.hidden === 0 && b?.classList.contains('essaim-dans-trou')) { b.classList.remove('essaim-dans-trou'); b.classList.add('essaim-sort-trou'); window.setTimeout(() => b.classList.remove('essaim-sort-trou'), 800); }
    };
    /** Everybody has been picked up: the home planet comes down, the rocket lands by the house, the friends have a party. */
    const ending = async (s: State): Promise<void> => {
        const l = observed.layout; if (!l) return;
        observed.ending = true;
        await wait(700); if (gone()) return;
        const p = layer('planet'), py = l.rocketY - 2.4 * U;
        if (p) { p.setAttribute('transform', `translate(${l.W / 2} ${py})`); p.innerHTML = `<g class="essaim-planete">${planet()}</g>`; }
        await wait(PLANET_MS * .9); if (gone()) return;
        place(rocketEl(), l.W / 2 + .95 * U, py - 164, 900);
        await wait(1000); if (gone()) return;
        root.querySelectorAll('[data-friend] .essaim-ami').forEach((el, i) => { el.classList.add('essaim-fete'); (el as SVGGElement).style.animationDelay = `${i * 120}ms`; });
        await wait(600); if (gone()) return;
        observed.ending = false;
        session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound());
        message = t.won; speak([message]); draw();
    };
    const step = (): void => {
        const s = session.state;
        if (!s || s.finished) return;
        const r = tick(s);
        session.state = r.state;
        placeRocket(r.state, tickMs());
        sync(r.state, tickMs());
        handle(r.events, r.state);
        if (r.state.finished) void ending(r.state);
    };
    const schedule = (): void => {
        clock = window.setTimeout(() => {
            if (disposed) return;
            if (session.screen === 'play' && session.state && !session.state.finished && !observed.paused && observed.layout) step();
            schedule();
        }, tickMs());
    };
    const gesture = (lane: number, how: string): void => {
        const s = session.state; if (!s || s.finished || observed.ending) return;
        const r = touch(s, { lane, at: s.t }); if (!r) return;
        session.state = r.state; lastLane = lane;
        recordActivation(`essaim:touch:${how}`, 'action', true, String(lane));
        handle(r.events, r.state);
    };
    const laneUnder = (px: number): number | null => {
        const r = svgEl()?.getBoundingClientRect(), l = observed.layout;
        if (!r || !l) return null;
        const u = (px - r.x) / (r.width / l.W) - l.ox;
        return u < 0 ? -1 : u >= 5 * U ? 5 : Math.floor(u / U);
    };
    /** The sky, built once the stage has its size: it takes the whole height left under the goals. */
    const fill = (): void => {
        const s = session.state, z = zone(), stage = root.querySelector('.essaim-stage'); if (!s || !z || !stage) return;
        const box = stage.getBoundingClientRect(), l = layout(box.width, box.height);
        observed.layout = l;
        z.style.width = `${box.width}px`; z.style.height = `${box.height}px`;
        z.innerHTML = boardSvg(l, locale);
        drawTrain(s); placeRocket(s, 0); sync(s, 0);
        if (s.finished) { const p = layer('planet'); if (p) { p.setAttribute('transform', `translate(${l.W / 2} ${l.rocketY - 2.4 * U})`); p.innerHTML = planet(); } place(rocketEl(), l.W / 2 + .95 * U, l.rocketY - 2.4 * U - 164, 0); }
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'essaim:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpLanes(st).length ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'essaim:listen');
        const again = root.querySelector<HTMLElement>('#essaim-again'), next = root.querySelector<HTMLElement>('#essaim-next');
        if (again) bindAction(again, () => play(start(s.level), true), `essaim:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `essaim:next:${s.level}`);
        fill();
        const z = zone()!;
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary || session.state!.finished) return;
            e.preventDefault(); observed.held = true; lastLane = null;
            try { z.setPointerCapture(e.pointerId); } catch { /* A finger already gone: the touch still counts. */ }
            const lane = laneUnder(e.clientX); if (lane !== null) gesture(lane, 'tap');
        });
        z.addEventListener('pointermove', e => {
            if (!e.isPrimary || !observed.held) return;
            const lane = laneUnder(e.clientX); if (lane !== null && lane !== lastLane) gesture(lane, 'slide');
        });
        const up = (): void => { observed.held = false; };
        z.addEventListener('pointerup', up); z.addEventListener('pointercancel', up);
        z.addEventListener('keydown', e => {
            const s = session.state!;
            if (s.finished || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
            e.preventDefault(); gesture(s.target + (e.key === 'ArrowLeft' ? -1 : 1), 'key');
        });
    };
    const resize = (): void => { if (session.screen === 'play' && session.state && !observed.ending) fill(); };
    window.addEventListener('resize', resize);
    function play(s: State, fresh: boolean): void {
        for (const id of timers) clearTimeout(id); timers.clear();
        observed = { paused: false, fail: null, layout: null, held: false, ending: false };
        session.screen = 'play'; session.state = s;
        if (s.finished) { session.records = complete(session.records, s); writeRecords(storage, session.records); }
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    schedule();
    return () => { disposed = true; window.clearTimeout(clock); window.removeEventListener('resize', resize); for (const id of timers) clearTimeout(id); timers.clear(); };
}
