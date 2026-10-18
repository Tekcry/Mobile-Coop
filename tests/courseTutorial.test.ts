import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DrillDetect, emptySnap, type DrillSnap } from '../src/game/course/drillDetect';
import { isClientVerb } from '../src/game/course/courseWire';
import { compareRatings, rateFinale, summarise } from '../src/game/course/courseRating';
import { newStats, type BayStats } from '../src/game/course/courseState';
import type { CourseDef } from '../src/game/course/courseDef';
import {
  COURSE_RECORD_KEY,
  emptyCourseEntry,
  loadCourseRecord,
  recordBay,
  recordRun,
  sanitizeCourseRecord,
  startableBays,
  updateCourseRecord,
} from '../src/save/courseRecord';
import { dbPut } from '../src/save/db';

/** Step a detector from a primed base through one change; returns the verbs of that step. */
function edge(change: (s: DrillSnap) => void, base?: (s: DrillSnap) => void): string[] {
  const d = new DrillDetect();
  const s = emptySnap();
  s.gear = 3;
  s.weapon = 'pistol';
  base?.(s);
  const out: string[] = [];
  d.step(s, out);
  expect(out).toEqual([]);
  change(s);
  d.step(s, out);
  const got = out.slice();
  d.step(s, out);
  expect(out).toEqual([]); // edge-triggered: no repeat while held
  return got;
}

describe('drillDetect (T1c)', () => {
  it('the first step only primes', () => {
    const d = new DrillDetect();
    const s = emptySnap();
    s.mode = 'ladder';
    s.crouch = true;
    const out: string[] = [];
    d.step(s, out);
    expect(out).toEqual([]);
  });
  it('gear and sprint', () => {
    expect(edge((s) => (s.gear = 4))).toEqual(['gear']);
    expect(edge((s) => (s.gear = 6))).toEqual(['gear', 'sprint']);
    expect(edge((s) => (s.crouch = false), (s) => ((s.gear = 6), (s.crouch = true)))).toEqual(['sprint', 'stance']);
  });
  it('stance, aim, fire, reload, swap', () => {
    expect(edge((s) => (s.crouch = true))).toEqual(['stance']);
    expect(edge((s) => (s.ads = true))).toEqual(['aim']);
    expect(edge((s) => s.shots++)).toEqual(['fire']);
    expect(edge((s) => (s.reload = true))).toEqual(['reload']);
    expect(edge((s) => (s.weapon = 'rifle'))).toEqual(['swap']);
  });
  it('vision and ping (counters)', () => {
    expect(edge((s) => s.visions++)).toEqual(['vision']);
    expect(edge((s) => (s.pings += 2))).toEqual(['ping']);
  });
  it('attach modes and traversal kinds by name, once per occurrence', () => {
    expect(edge((s) => (s.mode = 'ledge'))).toEqual(['ledge']);
    expect(edge((s) => ((s.mode = 'vault'), (s.traversal = 'vault')))).toEqual(['vault']);
    expect(edge((s) => (s.mode = 'ground'), (s) => (s.mode = 'ladder'))).toEqual([]);
    const d = new DrillDetect();
    const s = emptySnap();
    const out: string[] = [];
    let n = 0;
    for (const m of ['ground', 'vault', 'ground', 'vault']) {
      s.mode = m;
      d.step(s, out);
      n += out.length;
    }
    expect(n).toBe(2);
  });
  it('landing bands', () => {
    expect(edge((s) => ((s.landings = 1), (s.landing = 'heavy')))).toEqual(['land', 'land:heavy']);
  });
  it('door, gadget, throw, takedown kind, team move', () => {
    expect(edge((s) => s.doors++)).toEqual(['door']);
    expect(edge((s) => s.gadgets++)).toEqual(['gadget']);
    expect(edge((s) => (s.throws++, s.gadgets++))).toEqual(['gadget', 'throw']);
    expect(edge((s) => ((s.takedowns = 1), (s.takedownKind = 'rear')))).toEqual(['takedown', 'takedown:rear']);
    expect(edge((s) => s.teamMoves++)).toEqual(['teamMove']);
  });
  it('light band: entering the dark', () => {
    expect(edge((s) => (s.light = 0))).toEqual(['dark']);
    expect(edge((s) => (s.light = 1))).toEqual([]);
  });
  it('reset re-primes (a teleport is not a verb)', () => {
    const d = new DrillDetect();
    const s = emptySnap();
    const out: string[] = [];
    d.step(s, out);
    d.reset();
    s.crouch = true;
    d.step(s, out);
    expect(out).toEqual([]);
  });
  it('client verbs are the local-only ones (C10)', () => {
    for (const v of ['gear', 'stance', 'vision', 'ping', 'aim', 'reload', 'swap', 'sprint', 'fire', 'dark', 'gadget']) expect(isClientVerb(v)).toBe(true);
    // host-resolved (A23): takedowns, doors, throws, team moves, movement modes
    for (const v of ['vault', 'ladder', 'takedown', 'switch', 'teamMove', 'door', 'throw']) expect(isClientVerb(v)).toBe(false);
  });
});

const st = (o: Partial<BayStats>): BayStats => ({ ...newStats(), ...o });

describe('courseRating (D31, D32)', () => {
  it('tiers', () => {
    expect(rateFinale(st({ time: 100 })).tier).toBe('ghost');
    expect(rateFinale(st({ knockouts: 2 })).tier).toBe('silent');
    expect(rateFinale(st({ detections: 1 })).tier).toBe('silent');
    expect(rateFinale(st({ bodies: 1 })).tier).toBe('silent');
    expect(rateFinale(st({ kills: 1 })).tier).toBe('loud');
    expect(rateFinale(st({ alarms: 1 })).tier).toBe('loud');
  });
  it('detections, alarms and bodies lower it; time breaks ties', () => {
    const a = rateFinale(st({ knockouts: 1, time: 200 }));
    const b = rateFinale(st({ knockouts: 1, detections: 1, time: 100 }));
    expect(compareRatings(a, b)).toBeGreaterThan(0);
    const c = rateFinale(st({ knockouts: 1, time: 150 }));
    expect(compareRatings(c, a)).toBeGreaterThan(0);
    expect(compareRatings(rateFinale(st({ alarms: 1 })), rateFinale(st({ knockouts: 1, detections: 9 })))).toBeLessThan(0);
  });
  it('summary: per bay, team, per player; the drill bays are not rated', () => {
    const def = { id: 'c', bays: [{ id: 'B1' }, { id: 'B2' }], airlocks: [] } as unknown as CourseDef;
    const s = summarise(def, [st({ time: 10, kills: 3 }), st({ time: 20, knockouts: 1 })], [st({ kills: 3 }), st({ knockouts: 1 })]);
    expect(s.bays).toEqual([{ id: 'B1', time: 10 }, { id: 'B2', time: 20 }]);
    expect(s.team.time).toBe(30);
    expect(s.team.kills).toBe(3);
    expect(s.finale?.bay).toBe('B2');
    expect(s.finale?.tier).toBe('silent'); // B1's kills do not count against the finale
    expect(summarise(def, [st({}), st({})], [st({}), st({})], 1).bays.map((b) => b.id)).toEqual(['B2']);
  });
});

describe('course record (C9)', () => {
  it('sanitises anything', () => {
    expect(sanitizeCourseRecord(null)).toEqual({ v: 1, courses: {} });
    const r = sanitizeCourseRecord({
      courses: { fallow: { bays: ['B1', 'B2', '<x>', 'B1'], finished: ['B1', 5], bestBay: { B1: 12, B2: -1, '<b>': 3 }, bestTotal: 'x', bestRating: { tier: 'mythic', points: 1 } }, 'bad id!': {} },
    });
    expect(Object.keys(r.courses)).toEqual(['fallow']);
    const e = r.courses.fallow!;
    expect(e.bays).toEqual(['B1', 'B2']);
    expect(e.finished).toEqual(['B1']);
    expect(e.bestBay).toEqual({ B1: 12 });
    expect(e.bestTotal).toBe(0);
    expect(e.bestRating).toBeNull();
  });
  it('startable bays follow the finished ones (all with the dev flag)', () => {
    const e = emptyCourseEntry();
    recordBay(e, ['B1', 'B2', 'B3'], 'B1', 30);
    expect(startableBays(e)).toEqual([1, 2]);
    expect(startableBays(e, true)).toEqual([1, 2, 3]);
    expect(startableBays(undefined)).toEqual([1]);
    recordBay(e, ['B1', 'B2', 'B3'], 'B1', 40);
    expect(e.bestBay.B1).toBe(30);
  });
  it('keeps the best run', () => {
    const e = emptyCourseEntry();
    recordRun(e, 300, { tier: 'silent', points: 900, time: 100 });
    recordRun(e, 400, { tier: 'loud', points: 1000, time: 50 });
    expect(e.bestTotal).toBe(300);
    expect(e.bestRating?.tier).toBe('silent');
    recordRun(e, null, { tier: 'ghost', points: 1000, time: 200 });
    expect(e.bestRating?.tier).toBe('ghost');
  });
  it('round trips through IndexedDB kv', async () => {
    await dbPut('kv', COURSE_RECORD_KEY, { courses: { junk: 7 } });
    expect((await loadCourseRecord()).courses).toEqual({});
    await updateCourseRecord('courselab', (e) => recordBay(e, ['L1', 'L2'], 'L1', 9));
    await updateCourseRecord('courselab', (e) => recordRun(e, 20, null));
    const r = await loadCourseRecord();
    expect(r.courses.courselab?.finished).toEqual(['L1']);
    expect(r.courses.courselab?.bestTotal).toBe(20);
    expect(startableBays(r.courses.courselab)).toEqual([1, 2]);
  });
});
