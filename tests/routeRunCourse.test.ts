import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs tool script without types
import * as C from '../scripts/route-run/course.mjs';
// @ts-expect-error plain .mjs tool script without types
import { addPast, stepsForPath } from '../scripts/route-run.mjs';

// Route-runs R4c (docs/route-runs/PLAN.md "R4c Course mode: drill gates and restarts"): course.mjs's pure rules (drill
// actions, the A13 hold, the A14 cause, the jump check, what follows a restart, rejoin and push past, linking seen
// restarts, the selftest's course lines) and its page glue on fakes (`ctx.coursePage`, a fake driver and clock). The page
// runs (the course selftest) are pending PC runs once SR1-SR5 are wired.

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const fx = JSON.parse(readFileSync(new URL('./fixtures/route-run/selftest-course.graph.json', import.meta.url), 'utf8'));
const metrics = JSON.parse(readFileSync(new URL('../docs/design/metrics.json', import.meta.url), 'utf8'));
const a2Steps = () => addPast(stepsForPath([fx], fx.points, [13, 15, 20], metrics.rules.split_speed_mps), fx.points);

/** A fake course: drills `[{ id, verb, who: 'both' | 'p1' | 'p2', count }]` ticked by the page's `act`, a door, a lock
 *  rule over (clock, drills done, placed), a clock moved by `advance` / `hold`. Every call is recorded. */
function lockWorld(o: { drills?: Obj[]; door?: Obj | null; locked?: (t: number, done: boolean, placed: boolean) => boolean; graphs?: unknown } = {}) {
  const calls: unknown[][] = [];
  const clock = { t: 0 };
  const drills = o.drills ?? [];
  const ticks: Record<string, number[]> = {};
  let placed = false;
  const tickOf = (id: string, p: number) => ticks[id]?.[p] ?? 0;
  const openFor = (d: Obj, p: number) => (d.who === 'both' || d.who === `p${p + 1}`) && tickOf(d.id, p) < (d.count ?? 1);
  const allDone = () => drills.every((d) => !openFor(d, 0) && !openFor(d, 1));
  const tick = (d: Obj, p: number) => {
    const t = (ticks[d.id] ??= [0, 0]);
    t[p] = t[p]! + 1;
  };
  const page = {
    door: async () => o.door ?? null,
    locked: async () => (o.locked ?? ((_t: number, done: boolean) => !done))(clock.t, allDone(), placed),
    nextDrill: async (p: number) => {
      const d = drills.find((x) => openFor(x, p));
      return d ? { id: d.id, verb: d.verb, count: d.count ?? 1, left: (d.count ?? 1) - tickOf(d.id, p) } : null;
    },
    act: async (a: Obj) => {
      calls.push(['act', a.kind, a.player, a.kind === 'flag' ? a.flag : a.verb]);
      // a flag ticks every player the drill is open for (CourseState.addFlag); a verb that player's drills
      if (a.kind === 'flag') for (const d of drills) { if (d.verb === `flag:${a.flag}`) for (const p of [0, 1]) if (openFor(d, p)) tick(d, p); }
      else for (const d of drills) if (d.verb === a.verb && openFor(d, a.player)) tick(d, a.player);
      return true;
    },
  };
  const ctx: Obj = {
    coursePage: page,
    graphs: o.graphs ?? null,
    notes: [],
    advance: async (s: number) => {
      calls.push(['advance', s]);
      clock.t += s;
    },
    driver: {
      points: null,
      hold: async (s: number) => {
        calls.push(['hold', s]);
        clock.t += s;
      },
      place: async (p: number[]) => {
        calls.push(['place', p]);
        placed = true;
      },
    },
  };
  const run: Obj = { id: 'a1-gate', section: 'A1', drills: [], stubs: [], restarts: [], detections: [], deadStops: [] };
  return { ctx, run, calls, clock };
}

const gateDoor = { cid: 'A5-gate', locked: true, airlock: null };
const airDoor = (phase: string, far = true) => ({ cid: far ? 'L1-far' : 'L1-near', locked: true, airlock: { id: 'L1', phase, far, pad: [25, 0, 11] } });
const step = { type: 'link', index: 9, at: [28, 0, 11] };
const waited = (calls: unknown[][]) => calls.filter((c) => c[0] === 'advance').reduce((a, c) => a + (c[1] as number), 0);

describe('drill actions', () => {
  it('a verb drill with count 2 is two verb actions, a flag drill one setFlag, a one-player drill only that player', () => {
    expect(C.drillActions([{ id: 'crouch2', verb: 'crouch', player: 0, left: 2 }])).toEqual([
      { kind: 'verb', id: 'crouch2', player: 0, verb: 'crouch' },
      { kind: 'verb', id: 'crouch2', player: 0, verb: 'crouch' },
    ]);
    expect(C.drillActions([{ id: 'key', verb: 'flag:a5-key', player: 1, left: 3 }])).toEqual([{ kind: 'flag', id: 'key', player: 1, verb: 'flag:a5-key', flag: 'a5-key' }]);
    expect(C.drillActions([{ id: 'peek', verb: 'peek', player: 1 }])).toEqual([{ kind: 'verb', id: 'peek', player: 1, verb: 'peek' }]);
    expect(C.drillActions([])).toEqual([]);
  });
});

describe('the A13 drill hold', () => {
  it("the set's teach link time; 0 when it was stubbed this run; 10 s for a teach on a space, none, or no graphs", () => {
    // A1's leg-up (link 3) carries `teach: leg-up`, time_s 6 (not measured: off the nav grid)
    expect(fx.links[3]).toMatchObject({ kind: 'coop_boost', teach: 'leg-up', time_s: 6 });
    expect(C.drillHold([fx], 'A1', [])).toBe(6);
    expect(C.drillHold([fx], 'a1', [{ link: 3, hold_s: 6 }])).toBe(0);
    expect(C.drillHold([fx], 'A1', [{ link: 0 }])).toBe(6);
    // A2's teach is a tag on a2-neck (a space has no link time)
    expect(C.drillHold([fx], 'A2', [])).toBe(C.DRILL_HOLD_S);
    expect(C.drillHold(null, 'A1', [])).toBe(10);
    expect(C.drillHold([], 'A1', [])).toBe(10);
    const plain = { meta: { sections: ['A1'] }, spaces: [{ id: 's', section: 'A1' }], links: [{ from: 's', to: 's', kind: 'door' }] };
    expect(C.drillHold([plain], 'A1', [])).toBe(10);
    const measured = { ...plain, links: [{ from: 's', to: 's', kind: 'coop_boost', teach: 'x', time_s: 6, measured: { time_s: 7.5 } }] };
    expect(C.drillHold(measured, 'A1', [])).toBe(7.5);
    // a teach link of another set is not this set's
    expect(C.drillHold([fx], 'A3', [])).toBe(10);
  });
});

describe('the drill gate (onLockedDoor) on a fake page', () => {
  const drills = [
    { id: 'd-crouch', verb: 'crouch', who: 'both', count: 2 },
    { id: 'd-key', verb: 'flag:key', who: 'both' },
    { id: 'd-peek', verb: 'peek', who: 'p2' },
  ];

  it('holds once, stubs every open drill per player, then the door opens: true, the hold counted on the first stub only', async () => {
    const { ctx, run, calls } = lockWorld({ drills, door: gateDoor });
    expect(await C.onLockedDoor(ctx, run, step)).toBe(true);
    expect(calls.filter((c) => c[0] === 'hold')).toEqual([['hold', 10]]);
    expect(calls.filter((c) => c[0] === 'act')).toEqual([
      ['act', 'verb', 0, 'crouch'], ['act', 'verb', 0, 'crouch'], ['act', 'flag', 0, 'key'],
      ['act', 'verb', 1, 'crouch'], ['act', 'verb', 1, 'crouch'], ['act', 'verb', 1, 'peek'],
    ]);
    // the shared flag ticked P2's key drill too: nothing left to stub for it
    expect(run.drills).toEqual([
      { id: 'd-crouch', player: 1, verb: 'crouch', hold_s: 10, why: 'gate' },
      { id: 'd-key', player: 1, verb: 'flag:key', hold_s: 0, why: 'gate' },
      { id: 'd-crouch', player: 2, verb: 'crouch', hold_s: 0, why: 'gate' },
      { id: 'd-peek', player: 2, verb: 'peek', hold_s: 0, why: 'gate' },
    ]);
    expect(run.drills.reduce((a: number, d: Obj) => a + d.hold_s, 0)).toBe(10);
    // opened at once: no wait
    expect(waited(calls)).toBe(0);
  });

  it('no second hold when the teach link was stubbed on this run (A13), the graph hold otherwise', async () => {
    const a = lockWorld({ drills, door: gateDoor, graphs: [fx] });
    a.run.stubs.push({ link: 3, kind: 'coop_boost', hold_s: 6 });
    expect(await C.onLockedDoor(a.ctx, a.run, step)).toBe(true);
    expect(a.calls.some((c) => c[0] === 'hold')).toBe(false);
    expect(a.run.drills.every((d: Obj) => d.hold_s === 0)).toBe(true);
    const b = lockWorld({ drills, door: gateDoor, graphs: [fx] });
    await C.onLockedDoor(b.ctx, b.run, step);
    expect(b.calls.filter((c) => c[0] === 'hold')).toEqual([['hold', 6]]);
    expect(b.run.drills[0].hold_s).toBe(6);
  });

  it('a door still locked UNLOCK_WAIT_S after the drills is false, and not 0.2 s before', async () => {
    const never = lockWorld({ drills, door: gateDoor, locked: () => true });
    expect(await C.onLockedDoor(never.ctx, never.run, step)).toBe(false);
    expect(waited(never.calls)).toBeCloseTo(C.UNLOCK_WAIT_S, 6);
    expect(never.run.drills).toHaveLength(4);
    // a lock that opens at the last poll (10 s hold + 5 s) is still waited for
    const late = lockWorld({ drills, door: gateDoor, locked: (t) => t < 10 + C.UNLOCK_WAIT_S - 1e-6 });
    expect(await C.onLockedDoor(late.ctx, late.run, step)).toBe(true);
    expect(waited(late.calls)).toBeCloseTo(C.UNLOCK_WAIT_S, 6);
    // every wait is in LOCK_POLL_S steps (every page stepped by ctx.advance)
    expect(late.calls.filter((c) => c[0] === 'advance').every((c) => c[1] === C.LOCK_POLL_S)).toBe(true);
  });

  it('not a course lock (or no door, no point, an airlock locked behind): false at once, no hold, no wait', async () => {
    for (const door of [null, { cid: null, locked: false, airlock: null }, { cid: 'L3-near', locked: false, airlock: null }, airDoor('sealed', false)]) {
      const w = lockWorld({ drills, door });
      expect(await C.onLockedDoor(w.ctx, w.run, step)).toBe(false);
      expect(w.calls).toEqual([]);
      expect(w.run.drills).toEqual([]);
    }
    const w = lockWorld({ drills, door: gateDoor });
    expect(await C.onLockedDoor(w.ctx, w.run, { type: 'link', index: 1 })).toBe(false);
    expect(await C.onLockedDoor({}, {}, {})).toBe(false);
  });

  it('an airlock cycling is waited for: no stubs, no hold, no placement', async () => {
    const w = lockWorld({ drills, door: airDoor('cycling'), locked: (t) => t < 3.5 });
    expect(await C.onLockedDoor(w.ctx, w.run, step)).toBe(true);
    expect(w.run.drills).toEqual([]);
    expect(w.calls.some((c) => c[0] === 'hold' || c[0] === 'place' || c[0] === 'act')).toBe(false);
    expect(waited(w.calls)).toBeCloseTo(3.6, 6);
    const stuck = lockWorld({ door: airDoor('cycling'), locked: () => true });
    expect(await C.onLockedDoor(stuck.ctx, stuck.run, step)).toBe(false);
    expect(waited(stuck.calls)).toBeCloseTo(C.AIRLOCK_WAIT_S, 6);
    expect(C.AIRLOCK_WAIT_S).toBe(C.AIRLOCK_CYCLE_S + 5);
  });

  it("an airlock's far door with one robot on the pad (or none): the drills, then both onto the pad, then its cycle", async () => {
    // master's yard has no drills: the cycle starts once both stand on the pad
    const w = lockWorld({ door: airDoor('waiting'), locked: (t, _d, placed) => !placed || t < 4 });
    expect(await C.onLockedDoor(w.ctx, w.run, step)).toBe(true);
    expect(w.calls.filter((c) => c[0] === 'place')).toEqual([['place', [25, 0, 11]]]);
    expect(w.calls.some((c) => c[0] === 'hold')).toBe(false);
    expect(w.run.drills).toEqual([]);
    // both on the pad already, held back by open drills (`ready`): drill stubs, no placement
    const r = lockWorld({ drills, door: airDoor('ready'), locked: (_t, done) => !done });
    expect(await C.onLockedDoor(r.ctx, r.run, step)).toBe(true);
    expect(r.calls.some((c) => c[0] === 'place')).toBe(false);
    expect(r.run.drills).toHaveLength(4);
  });
});

describe('the A14 cause', () => {
  it("each J14 cause -> its class and restart value ('other' is other)", () => {
    const of = (cause: string) => C.classify({ retry: { st: 3, cause }, rises: [{ t: 9, cls: 'detection' }], closes: [], lastT: 10, nowT: 10.2 });
    expect(of('seen')).toMatchObject({ cause: 'seen', restart: 'retry' });
    expect(of('caught')).toMatchObject({ cause: 'seen', restart: 'retry' });
    expect(of('timer')).toMatchObject({ cause: 'timer', restart: 'timer' });
    for (const c of ['out', 'down', 'other']) expect(of(c)).toMatchObject({ cause: 'other', restart: 'other' });
  });

  it('master: a detection or camera alarm rise in [last poll - 2 s, now] is seen (set), a timed gate closing timer, else other', () => {
    const at = (rises: Obj[], closes: Obj[] = []) => C.classify({ retry: null, rises, closes, lastT: 10, nowT: 10.2 });
    expect(C.causeWindow(10, 10.2)).toEqual({ from: 8, to: 10.2 });
    expect(at([{ t: 9.1, cls: 'detection' }])).toMatchObject({ cause: 'seen', restart: 'set' });
    expect(at([{ t: 8, cls: 'detection' }]).cause).toBe('seen');
    expect(at([{ t: 10.2, cls: 'detection' }]).cause).toBe('seen');
    expect(at([{ t: 7.99, cls: 'detection' }])).toMatchObject({ cause: 'other', restart: 'other' });
    expect(at([{ t: 10.21, cls: 'detection' }]).cause).toBe('other');
    expect(at([{ t: 9.5, cls: 'detection', camera: 'a2-cam' }]).cause).toBe('seen');
    expect(at([{ t: 9.5, cls: 'notice' }]).cause).toBe('other');
    expect(at([], [{ id: 'g-a2-neck', t: 10.2 }])).toMatchObject({ cause: 'timer', restart: 'timer' });
    expect(at([], [{ id: 'g-a2-neck', t: 7.9 }]).cause).toBe('other');
    // a guard outranks the timer
    expect(at([{ t: 9, cls: 'detection' }], [{ id: 'g', t: 9 }]).cause).toBe('seen');
    expect(at([])).toEqual({ cause: 'other', restart: 'other', from: 'none' });
  });
});

describe('the jump check', () => {
  it('3.1 m in 0.05 s with no placement jumped; with a placement not; 6 m over a 2 s gap not', () => {
    const p = (x: number, n: number | null = 4) => ({ x, y: 0, z: 0, n });
    expect(C.jumped(p(0), p(3.1), 0.05)).toBe(true);
    expect(C.jumped(p(0), p(3.1, 5), 0.05)).toBe(false);
    expect(C.jumped(p(0), p(6), 2)).toBe(false);
    expect(C.jumped(p(0), p(2.9), 0.05)).toBe(false);
    // no placement count on the page (SR3 not in): never a jump
    expect(C.jumped(p(0, null), p(30, null), 0.05)).toBe(false);
    expect(C.jumped(null, p(30), 0.05)).toBe(false);
  });
});

describe('what follows a restart', () => {
  it('seen twice from one space: rejoined, then pushed past with the rule off', () => {
    const s = C.followState();
    expect(C.follow(s, 'seen', { space: 'a2-neck', t: 10 })).toMatchObject({ then: 'rejoined', actions: ['rejoin'] });
    expect(C.follow(s, 'seen', { space: 'a2-neck', t: 30 })).toMatchObject({ then: 'pushed-past', actions: ['ruleOff', 'pushPast'], n: 2 });
  });

  it('seen from two spaces: both rejoined; causes count apart', () => {
    const s = C.followState();
    expect(C.follow(s, 'seen', { space: 'a2-neck' }).then).toBe('rejoined');
    expect(C.follow(s, 'seen', { space: 'a2-east' }).then).toBe('rejoined');
    expect(C.follow(s, 'other', { space: 'a2-neck' }).then).toBe('rejoined');
    expect(C.follow(s, 'timer', { space: 'a2-neck' }).then).toBe('rejoined');
  });

  it('timer twice on one step (its station, whatever the space): drill stubs; other twice from one space: the stop and a push past', () => {
    const s = C.followState();
    expect(C.follow(s, 'timer', { space: 'a2-neck', step: 'station 3' }).then).toBe('rejoined');
    expect(C.follow(s, 'timer', { space: 'a2-east', step: 'station 3' })).toMatchObject({ then: 'drill-stub', actions: ['timerDrills', 'rejoin'] });
    expect(C.follow(s, 'other', { space: 'a2-neck', t: 12 }).then).toBe('rejoined');
    expect(C.follow(s, 'other', { space: 'a2-neck', t: 40 })).toMatchObject({ then: 'dead-stop', actions: ['deadStop', 'pushPast'], since: 12 });
  });
});

describe('rejoin and push past', () => {
  it('rejoin: the nearest step at or before i on the robot storey (a link by its own walk)', () => {
    const steps = a2Steps();
    expect(steps.map((s: Obj) => `${s.type}${s.index ?? s.link ?? ''}`)).toEqual(['walk13', 'link13', 'walk15', 'link15', 'walk20', 'link20', 'walk']);
    // the set restart puts the pair in holding room one: back to the walk to the shadow gap
    expect(C.rejoinIndex(steps, 2, [25, 0, 11])).toBe(0);
    expect(C.rejoinIndex(steps, 4, [57, 0, 12])).toBe(2);
    // never a step after i
    expect(C.rejoinIndex(steps, 1, [70, 0, 10])).toBe(0);
    // no step on that storey: walk on from i
    expect(C.rejoinIndex(steps, 4, [57, 4.4, 18])).toBe(4);
    const own = [{ type: 'walk', to: [0, 0, 0], link: 5 }, { type: 'link', index: 5, at: [10, 0, 0] }];
    expect(C.rejoinIndex(own, 1, [10, 0, 0])).toBe(0);
  });

  it("push past: the link the step walks to, the step's own link, else the next link; the end's last point", () => {
    const steps = a2Steps();
    expect(C.pushPastTarget(steps, 2)).toEqual({ link: 3, past: steps[3].past, resume: 4 });
    expect(C.pushPastTarget(steps, 3)).toEqual({ link: 3, past: steps[3].past, resume: 4 });
    expect(C.pushPastTarget(steps, 6)).toEqual({ link: null, past: steps[6].to, resume: 7 });
    const mid = [{ type: 'walk', to: [1, 0, 1], link: null }, { type: 'objective', space: 'x' }, { type: 'link', index: 4, at: [5, 0, 5], past: [6, 0, 5] }];
    expect(C.pushPastTarget(mid, 0)).toEqual({ link: 2, past: [6, 0, 5], resume: 3 });
    expect(C.pushPastTarget([], 0)).toBe(null);
  });
});

describe('seen restarts linked to detections (onRunEnd)', () => {
  const captured = { t: 59.5, cls: 'detection', level: 'alert', camera: null, guard: { id: 'e7', kind: 'grunt', role: null, zone: null, x: 51, y: 1.6, z: 10, yaw: 0 }, robots: [{ x: 51, y: 0, z: 13, crouched: true, speed: 1.2, light: 0.4 }, { x: 49, y: 0, z: 13 }], heard: [], told: null, body: null, space: 'a2-neck' };

  it('the latest detection in the window; else the captured rise as its line; else a note', () => {
    const run: Obj = {
      restarts: [
        { t: 20, space: 'a2-neck', set: 'A2', restart: 'set', detection: null, then: 'rejoined' },
        { t: 40, space: 'a2-east', set: 'A2', restart: 'timer', detection: null, then: 'rejoined' },
        { t: 60, space: 'a2-neck', set: 'A2', restart: 'set', detection: null, then: 'pushed-past' },
        { t: 80, space: 'a2-west', set: 'A2', restart: 'retry', detection: null, then: 'rejoined' },
      ],
      detections: [{ t: 5, restart: null }, { t: 19.1, restart: null }, { t: 19.5, restart: null }, { t: 39, restart: null }],
    };
    const notes = C.linkRestarts(run, [{ from: 18, to: 20 }, { from: 38, to: 40 }, { from: 58, to: 60, captured }, { from: 78, to: 80 }], ['leader', 'follower']);
    expect(run.restarts.map((x: Obj) => x.detection)).toEqual([2, null, 4, null]);
    expect(run.detections[2].restart).toBe('set');
    expect(run.detections[1].restart).toBe(null);
    // a timer restart is never a detection
    expect(run.detections[3].restart).toBe(null);
    expect(run.detections[4]).toMatchObject({ t: 59.5, robot: 'leader', guard: { id: 'e7' }, level: 'alert', restart: 'set', space: 'a2-neck', inferred: true });
    expect(run.detections[4].kind).toBeUndefined();
    expect(notes).toEqual(['seen retry at a2-west with no guard or camera rise logged']);
  });

  it('without meta the window is [t - 2 s, t]; onRunEnd puts its notes in ctx.notes', async () => {
    const run: Obj = { id: 'r', restarts: [{ t: 10, space: 'a2-neck', restart: 'set' }], detections: [{ t: 7.9 }] };
    const ctx: Obj = { notes: [] };
    expect(await C.onRunEnd(ctx, run)).toEqual(['seen set restart at a2-neck with no guard or camera rise logged']);
    expect(ctx.notes).toEqual(['run r: seen set restart at a2-neck with no guard or camera rise logged']);
    run.detections[0].t = 8;
    expect(C.linkRestarts(run)).toEqual([]);
    expect(run.restarts[0].detection).toBe(0);
  });
});

describe('the selftest course lines (checkCourseExpect)', () => {
  const log: Obj = {
    id: 'a2-seen-twice',
    drills: [{ id: 'd1', player: 1, hold_s: 10, why: 'gate' }, { id: 'd1', player: 2, hold_s: 0, why: 'gate' }],
    restarts: [
      { t: 20, space: 'a2-neck', set: 'A2', restart: 'set', detection: 0, then: 'rejoined' },
      { t: 60, space: 'a2-neck', set: 'A2', restart: 'set', detection: 1, then: 'pushed-past' },
    ],
    detections: [{ t: 19, restart: 'set' }, { t: 59, restart: 'set' }],
  };

  it("passes a log that matches the fixture's lines", () => {
    const block = fx.expect.runs.find((r: Obj) => r.id === 'a2-seen-twice').course;
    expect(C.checkCourseExpect(block, log)).toEqual([]);
    expect(C.checkCourseExpect({ drills: { why: 'gate', hold_s: 10, ids: ['d1'], count: 2 } }, log)).toEqual([]);
    expect(C.checkCourseExpect(null, log)).toEqual([]);
  });

  it('names every mismatch', () => {
    const bad = structuredClone(log);
    bad.restarts[1].then = 'rejoined';
    bad.restarts[0].detection = null;
    bad.detections[1].restart = 'retry';
    bad.drills[1].why = 'timer';
    const p = C.checkCourseExpect({ ...fx.expect.runs.find((r: Obj) => r.id === 'a2-seen-twice').course, drills: { why: 'gate', hold_s: 0, ids: ['d1', 'd2'] } }, bad);
    expect(p).toEqual([
      'a2-seen-twice: drill stub d1 (P2) why timer, expected gate',
      'a2-seen-twice: drill holds sum to 10 s, expected 0',
      'a2-seen-twice: drill d2 not stubbed for P1',
      'a2-seen-twice: drill d2 not stubbed for P2',
      'a2-seen-twice: restart 1 not linked to a detection',
      'a2-seen-twice: restart 2 then rejoined, expected pushed-past',
      "a2-seen-twice: restart 2's detection says restart retry, expected set",
      'a2-seen-twice: 1 detection(s) with restart set, expected 2',
    ]);
    expect(C.checkCourseExpect({ restarts: [] }, log)[0]).toMatch(/^a2-seen-twice: 2 restarts .*expected 0$/);
  });
});

describe('the course fixture', () => {
  it("is S9's A1 / A2 graph with its own points, merged link indices as S9's, and the runs the brief names", () => {
    expect(fx.meta).toMatchObject({ map: 'ctcourse', mode: 'training', sections: ['A1', 'A2'] });
    expect(fx.meta.taught_by).toBeUndefined();
    expect(fx.expect.players).toBe(2);
    expect(fx.links).toHaveLength(21);
    expect(fx.points.links).toHaveLength(21);
    expect(fx.links[9]).toMatchObject({ from: 'a1-hold-l1', to: 'a2-west', kind: 'double_door' });
    expect(fx.links[8]).toMatchObject({ from: 'a1-yard', to: 'a1-hold-l1', kind: 'double_door' });
    expect(fx.links[20]).toMatchObject({ from: 'a2-east', to: 'a2-hold-l2', kind: 'double_door' });
    expect(fx.points.links.filter((l: Obj) => l.atFrom === 'declared')).toHaveLength(19);
    expect(fx.expect.runs.map((r: Obj) => [r.id, r.section, r.path])).toEqual([
      ['a1-gate', 'A1', [0, 3, 6, 8, 9]],
      ['a2-seen-once', 'A2', [13, 15, 20]],
      ['a2-seen-twice', 'A2', [13, 15, 20]],
    ]);
    // the drop's past lands in the yard: its step-timeout's recovery places the pair there
    const a1 = addPast(stepsForPath([fx], fx.points, [0, 3, 6, 8, 9], metrics.rules.split_speed_mps), fx.points);
    const drop = a1.find((s: Obj) => s.type === 'link' && s.index === 6);
    expect(C.spaceAt(fx.points, drop.past[0], drop.past[1], drop.past[2])).toBe('a1-yard');
    expect(C.spaceAt(fx.points, 51, 0, 10)).toBe('a2-neck');
    expect(C.spaceAt(fx.points, 25, 0, 11)).toBe('a1-hold-l1');
  });
});

/** A fake course page for the watcher: `snap` is what the next read returns (its rises and captures are read once). */
function pollWorld(over: Obj = {}) {
  const calls: unknown[][] = [];
  const forbidden: unknown[][] = [];
  const snap: Obj = { t: 0, restarts: 1, lastRetry: null, station: null, bay: 1, spotHold: 0, gates: { 'g-a2-neck': false }, feet: [33, 0, 12.5], posN: null, rises: [], caught: [], ...over };
  // one drill open for both players (done per player by its verb)
  const done = [false, false];
  const page: Obj = {
    read: async (since: number) => {
      calls.push(['read', since]);
      const r = structuredClone(snap);
      snap.rises = [];
      snap.caught = [];
      return snap.dead ? null : r;
    },
    setSpotHold: async (v: number) => {
      calls.push(['spotHold', v]);
      snap.spotHold = v;
    },
    retryOff: async (n: number) => {
      calls.push(['retryOff', n]);
      return over.retryOk ?? true;
    },
    interrupt: async () => calls.push(['interrupt']),
    raise: async (g: string) => {
      calls.push(['raise', g]);
      return true;
    },
    shot: async (f: string) => calls.push(['shot', f]),
    pos: async () => snap.feet,
    nextDrill: async (p: number) => (done[p] ? null : { id: 'a2-iso', verb: 'isolate', count: 1, left: 1 }),
    act: async (a: Obj) => {
      calls.push(['act', a.player, a.verb]);
      done[a.player] = true;
    },
  };
  const no = (name: string) => async (...a: unknown[]) => {
    forbidden.push([name, ...a]);
  };
  const ctx: Obj = { coursePage: page, driver: { points: fx.points, hold: no('hold'), place: no('place') }, advance: no('advance'), notes: [], shots: '/tmp/rr-shots', players: 2, pair: { step: { type: 'walk', link: 15 } } };
  const run: Obj = { id: 'a2-seen-twice', section: 'A2', drills: [], stubs: [], restarts: [], detections: [], deadStops: [] };
  const poll = async (o: Obj) => {
    Object.assign(snap, o);
    await C.onPoll(ctx, run);
  };
  return { ctx, run, calls, forbidden, snap, poll };
}

const rise = (t: number, guard = 'e7') => ({ t, cls: 'detection', level: 'alert', camera: null, guard: { id: guard, kind: 'grunt', x: 51, y: 1.6, z: 10, yaw: 0 }, robots: [{ x: 51, y: 0, z: 12, crouched: true, speed: 1.2 }], heard: [], told: null, body: null });

describe('the restart watcher (onPoll) on a fake page', () => {
  it("baseline on the first poll (the run's own start restart is no line); a restarts rise logs one line; nothing waits", async () => {
    const w = pollWorld();
    await w.poll({ t: 0.2, restarts: 1 });
    expect(w.run.restarts).toEqual([]);
    await w.poll({ t: 0.4, feet: [51, 0, 12] });
    expect(w.run.restarts).toEqual([]);
    // the shunter's alert restarts the set: the squad is gone before the driver's poll (only the capture saw him)
    await w.poll({ t: 0.6, restarts: 2, feet: [25, 0, 11], caught: [rise(0.55)] });
    expect(w.run.restarts).toEqual([{ t: 0.6, space: 'a2-neck', set: 'A2', restart: 'set', detection: null, then: 'rejoined' }]);
    expect(w.calls.filter((c) => c[0] === 'interrupt')).toHaveLength(1);
    expect(w.forbidden).toEqual([]);
    // the queued rejoin (SR3): back to the walk to the shadow gap
    const steps = a2Steps();
    expect(await C.onRestart(w.ctx, w.run, steps, 2)).toEqual({ resume: 0, place: null });
    expect(await C.onRestart(w.ctx, w.run, steps, 2)).toBe(null);
    // the run's end links it to the captured rise (the driver logged none)
    await C.onRunEnd(w.ctx, w.run);
    expect(w.run.restarts[0].detection).toBe(0);
    expect(w.run.detections[0]).toMatchObject({ restart: 'set', guard: { id: 'e7' }, robot: 'leader', space: 'a2-neck' });
    expect(w.ctx.notes).toEqual([]);
  });

  it('seen twice from one space: pushed past, the rule off for the rest of the set, back on at the next bay', async () => {
    const w = pollWorld();
    await w.poll({ t: 0.2 });
    await w.poll({ t: 0.4, feet: [51, 0, 12] });
    await w.poll({ t: 0.6, restarts: 2, feet: [25, 0, 11], rises: [{ t: 0.5, cls: 'detection' }] });
    await w.poll({ t: 10, feet: [52, 0, 12] });
    await w.poll({ t: 10.2, restarts: 3, feet: [25, 0, 11], rises: [{ t: 10.1, cls: 'detection' }] });
    expect(w.run.restarts.map((x: Obj) => [x.space, x.restart, x.then])).toEqual([['a2-neck', 'set', 'rejoined'], ['a2-neck', 'set', 'pushed-past']]);
    expect(w.calls.filter((c) => c[0] === 'spotHold')).toEqual([['spotHold', C.SPOT_OFF]]);
    expect(await C.onRestart(w.ctx, w.run, a2Steps(), 2)).toEqual({ resume: 4, place: { leader: a2Steps()[3].past, follower: null } });
    // a later restart in the same set puts the bay's 1.5 s hold back: the rule is turned off again
    await w.poll({ t: 10.4, spotHold: 1.5 });
    expect(w.calls.filter((c) => c[0] === 'spotHold')).toEqual([['spotHold', C.SPOT_OFF], ['spotHold', C.SPOT_OFF]]);
    // the next set (bay change): the rule back on
    await w.poll({ t: 20, bay: 2 });
    expect(w.calls.filter((c) => c[0] === 'spotHold').at(-1)).toEqual(['spotHold', 0]);
    await w.poll({ t: 20.2, spotHold: 0 });
    expect(w.calls.filter((c) => c[0] === 'spotHold')).toHaveLength(3);
    expect(w.run.deadStops).toEqual([]);
    expect(w.forbidden).toEqual([]);
    // both linked at the end: the driver's rises became detection lines with these times
    w.run.detections.push({ t: 0.5, restart: null }, { t: 10.1, restart: null });
    await C.onRunEnd(w.ctx, w.run);
    expect(C.checkCourseExpect(fx.expect.runs.find((r: Obj) => r.id === 'a2-seen-twice').course, w.run)).toEqual([]);
  });

  it('two timer restarts on one step: two timer lines, no detection, the open drills stubbed (why timer) on the next poll', async () => {
    const w = pollWorld({ gates: { 'g-a2-neck': true } });
    await w.poll({ t: 0.2 });
    await w.poll({ t: 0.4, feet: [51, 0, 12] });
    await w.poll({ t: 0.6, restarts: 2, gates: { 'g-a2-neck': false }, feet: [25, 0, 11] });
    await w.poll({ t: 5, gates: { 'g-a2-neck': true }, feet: [51, 0, 12] });
    await w.poll({ t: 5.2, restarts: 3, gates: { 'g-a2-neck': false }, feet: [25, 0, 11] });
    expect(w.run.restarts.map((x: Obj) => [x.restart, x.then])).toEqual([['timer', 'rejoined'], ['timer', 'drill-stub']]);
    expect(w.run.drills).toEqual([]);
    await w.poll({ t: 5.4 });
    expect(w.run.drills).toEqual([
      { id: 'a2-iso', player: 1, verb: 'isolate', hold_s: 0, why: 'timer' },
      { id: 'a2-iso', player: 2, verb: 'isolate', hold_s: 0, why: 'timer' },
    ]);
    await C.onRunEnd(w.ctx, w.run);
    expect(w.run.detections).toEqual([]);
    expect(w.run.restarts.every((x: Obj) => x.detection === null)).toBe(true);
    expect(w.ctx.notes).toEqual([]);
    expect(w.forbidden).toEqual([]);
  });

  it('two other restarts from one space: one restart-loop dead stop (with its picture) and a push past', async () => {
    const w = pollWorld();
    await w.poll({ t: 0.2 });
    await w.poll({ t: 0.4, feet: [51, 0, 12] });
    await w.poll({ t: 0.6, restarts: 2, feet: [25, 0, 11] });
    await w.poll({ t: 8, feet: [51, 0, 12] });
    await w.poll({ t: 8.2, restarts: 3, feet: [25, 0, 11] });
    expect(w.run.restarts.map((x: Obj) => [x.restart, x.then])).toEqual([['other', 'rejoined'], ['other', 'dead-stop']]);
    expect(w.run.deadStops).toEqual([{ t: 8.2, robot: 'leader', at: [51, 0, 12], space: 'a2-neck', link: 15, class: 'restart-loop', shot: 'shots/a2-seen-twice-course-1.png', since: 0.6 }]);
    expect(w.calls.filter((c) => c[0] === 'shot')).toEqual([['shot', join('/tmp/rr-shots', 'a2-seen-twice-course-1.png')]]);
    expect((await C.onRestart(w.ctx, w.run, a2Steps(), 2))?.place?.leader).toEqual(a2Steps()[3].past);
    expect(w.forbidden).toEqual([]);
  });

  it("J14's recorded cause: a seen retry is 'retry', the second turns the station's retry off (a refusal is a run note)", async () => {
    const w = pollWorld({ retryOk: false });
    await w.poll({ t: 0.2 });
    await w.poll({ t: 0.4, feet: [51, 0, 12] });
    await w.poll({ t: 0.6, restarts: 2, lastRetry: { st: 3, cause: 'caught' } });
    await w.poll({ t: 0.8, feet: [51, 0, 12] });
    await w.poll({ t: 1, restarts: 3, lastRetry: { st: 3, cause: 'seen' } });
    expect(w.run.restarts.map((x: Obj) => [x.restart, x.then])).toEqual([['retry', 'rejoined'], ['retry', 'pushed-past']]);
    expect(w.calls.filter((c) => c[0] === 'retryOff')).toEqual([['retryOff', 3]]);
    expect(w.calls.some((c) => c[0] === 'spotHold')).toBe(false);
    expect(w.ctx.notes).toEqual(['run a2-seen-twice: retryOff(3) refused at a2-neck (the retry rule stays on)']);
    // J14 timer retries count per station
    const t = pollWorld();
    await t.poll({ t: 0.2 });
    await t.poll({ t: 0.4, restarts: 2, lastRetry: { st: 4, cause: 'timer' }, feet: [51, 0, 12] });
    await t.poll({ t: 0.6, restarts: 3, lastRetry: { st: 4, cause: 'timer' }, feet: [60, 0, 10] });
    expect(t.run.restarts.map((x: Obj) => [x.restart, x.space, x.then])).toEqual([['timer', 'a2-west', 'rejoined'], ['timer', 'a2-neck', 'drill-stub']]);
    const o = pollWorld();
    await o.poll({ t: 0.2 });
    await o.poll({ t: 0.4, restarts: 2, lastRetry: { st: 1, cause: 'other' } });
    expect(o.run.restarts[0].restart).toBe('other');
  });

  it('a robot moved over 3 m with no placement counted (SR3 posN) is a restart; a placement is not', async () => {
    const w = pollWorld({ posN: 2 });
    await w.poll({ t: 0.2 });
    await w.poll({ t: 0.4, feet: [34, 0, 8], posN: 3 });
    expect(w.run.restarts).toEqual([]);
    await w.poll({ t: 0.6, feet: [25, 0, 11], posN: 3 });
    expect(w.run.restarts.map((x: Obj) => [x.restart, x.space])).toEqual([['other', 'a2-west']]);
    // without posN on the page nothing jumps
    const n = pollWorld();
    await n.poll({ t: 0.2 });
    await n.poll({ t: 0.4, feet: [25, 0, 11] });
    expect(n.run.restarts).toEqual([]);
  });

  it('the selftest raise: once per entry into the space, up to its times; nothing logged for it', async () => {
    const w = pollWorld();
    w.ctx.selftest = { runs: [{ id: 'a2-seen-twice', course: { raise: [{ guard: 'a2-shunter', space: 'a2-neck', times: 2 }] } }] };
    await w.poll({ t: 0.2 });
    await w.poll({ t: 0.4, feet: [51, 0, 12] });
    await w.poll({ t: 0.6, feet: [52, 0, 12] });
    expect(w.calls.filter((c) => c[0] === 'raise')).toEqual([['raise', 'a2-shunter']]);
    await w.poll({ t: 0.8, feet: [25, 0, 11] });
    await w.poll({ t: 1, feet: [51, 0, 12] });
    await w.poll({ t: 1.2, feet: [25, 0, 11] });
    await w.poll({ t: 1.4, feet: [51, 0, 12] });
    expect(w.calls.filter((c) => c[0] === 'raise')).toHaveLength(2);
    expect(w.run.restarts).toEqual([]);
    expect(w.run.detections).toEqual([]);
    // another run's id: no raise
    const o = pollWorld();
    o.ctx.selftest = { runs: [{ id: 'other-run', course: { raise: [{ guard: 'a2-shunter', space: 'a2-neck', times: 1 }] } }] };
    await o.poll({ t: 0.2 });
    await o.poll({ t: 0.4, feet: [51, 0, 12] });
    expect(o.calls.some((c) => c[0] === 'raise')).toBe(false);
  });

  it('a page with no course reads once per run; the clock going back ends the run (the next run started)', async () => {
    const w = pollWorld({ dead: true });
    await w.poll({ t: 0.2 });
    await w.poll({ t: 0.4 });
    expect(w.calls.filter((c) => c[0] === 'read')).toHaveLength(1);
    const e = pollWorld();
    await e.poll({ t: 30 });
    await e.poll({ t: 0.1, restarts: 2 });
    await e.poll({ t: 0.3, restarts: 3 });
    expect(e.run.restarts).toEqual([]);
    expect(e.calls.filter((c) => c[0] === 'read')).toHaveLength(2);
  });

  it('reads the rises from its own index per run', async () => {
    const w = pollWorld();
    await w.poll({ t: 0.2, rises: [{ t: 0.1, cls: 'notice' }] });
    await w.poll({ t: 0.4, rises: [{ t: 0.3, cls: 'detection' }, { t: 0.35, cls: 'notice' }] });
    await w.poll({ t: 0.6 });
    expect(w.calls.filter((c) => c[0] === 'read').map((c) => c[1])).toEqual([0, 1, 3]);
  });
});
