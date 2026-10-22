import { describe, expect, it, vi } from 'vitest';
import {
  CMD_ACK,
  CMD_SEND,
  GuardView,
  GV_BUSY,
  GV_HELD,
  GV_MELEE,
  GV_OFFICER,
  INCIDENT,
  IncidentBoard,
  LEVEL,
  lightInView,
  lightRingPoint,
  MODE_COVER,
  MODE_INVESTIGATE,
  MODE_LEAD,
  MODE_LIGHT,
  type PathLen,
} from '../src/ai/incidents';
import { AlertMachine, ALERT, emptyAlertInput } from '../src/ai/alertState';
import { PERCEPTION } from '../src/ai/perception';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { Vector3, type Scene } from '../src/core/babylon';
import type { Enemy } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { RoomRect } from '../src/world/rooms';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S2) the incident board (design section 3), on a fake path model and a hand-filled guard view.

/** Straight-line paths (x `detour` for the guards listed), counting the queries. */
function paths(detour: Record<number, number> = {}): PathLen & { calls: number; from: number[] } {
  const p = {
    calls: 0,
    from: [] as number[],
    len(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
      p.calls++;
      const d = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2);
      // the detour is keyed by the start x (tests place guards at distinct x)
      p.from.push(ax);
      return d * (detour[ax] ?? 1);
    },
  };
  return p;
}

interface G {
  id: number;
  x: number;
  z: number;
  y?: number;
  level?: number;
  flags?: number;
  task?: number;
}

function view(gs: G[]): GuardView {
  const v = new GuardView(4);
  v.ensure(gs.length);
  v.n = gs.length;
  gs.forEach((g, i) => v.set(i, g.id, g.x, g.y ?? 0, g.z, g.level ?? LEVEL.unaware, g.flags ?? 0, g.task ?? -1));
  return v;
}

function ids(...a: number[]): Int32Array {
  return new Int32Array(a);
}

/** The SEND commands in the board's output: [guard, mode, slot]. */
function sends(b: IncidentBoard): [number, number, number][] {
  const o = b.out;
  const r: [number, number, number][] = [];
  for (let k = 0; k < o.n; k++) if (o.cmd[k] === CMD_SEND) r.push([o.guard[k]!, o.mode[k]!, o.arg[k]!]);
  return r;
}

function acks(b: IncidentBoard): [number, number][] {
  const o = b.out;
  const r: [number, number][] = [];
  for (let k = 0; k < o.n; k++) if (o.cmd[k] === CMD_ACK) r.push([o.guard[k]!, o.arg[k]!]);
  return r;
}

/** Apply the board's sends to the view (what the manager does through `Enemy.incident`) and clear the output. */
function apply(b: IncidentBoard, v: GuardView): void {
  const o = b.out;
  for (let k = 0; k < o.n; k++) {
    if (o.cmd[k] !== CMD_SEND) continue;
    for (let i = 0; i < v.n; i++) if (v.id[i] === o.guard[k]) v.task[i] = o.inc[k]!;
  }
  o.n = 0;
}

describe('incident board: who goes', () => {
  it('a noise heard by 5: exactly 1 goes (the nearest by path), the other 4 ack, at most 2 say "Copy."', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 11, x: 6, z: 0 },
      { id: 12, x: 0, z: 3 },
      { id: 13, x: -5, z: 0 },
      { id: 14, x: 0, z: -4 },
      { id: 15, x: 4, z: 4 },
    ]);
    const id = b.report('noise', 0, 0, 0, -1, ids(11, 12, 13, 14, 15), 5);
    b.tick(0, v);
    expect(sends(b)).toEqual([[12, MODE_INVESTIGATE, 0]]);
    const a = acks(b);
    expect(a.map((x) => x[0]).sort()).toEqual([11, 13, 14, 15]);
    expect(a.filter((x) => x[1] === 1).length).toBe(INCIDENT.maxCopy);
    expect(b.kindOf(id)).toBe('noise');
  });

  it('only the 3 nearest by straight distance get a path query; a long detour sends the next', () => {
    const p = paths({ 1: 10 });
    const b = new IncidentBoard(p);
    // guard at x 1 is nearest in a straight line but his path is 10x (a wall between)
    const v = view([
      { id: 1, x: 1, z: 0 },
      { id: 2, x: 2, z: 0 },
      { id: 3, x: 3, z: 0 },
      { id: 4, x: 4, z: 0 },
      { id: 5, x: 5, z: 0 },
    ]);
    b.report('noise', 0, 0, 0, -1, ids(1, 2, 3, 4, 5), 5);
    b.tick(0, v);
    expect(p.calls).toBe(INCIDENT.pathCandidates);
    expect(p.from.sort()).toEqual([1, 2, 3]);
    expect(sends(b)[0]![0]).toBe(2);
  });

  it('an officer (x1.6) sends someone else; a guard on edge (cooldown, x0.8) goes first', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 3, z: 0, flags: GV_OFFICER },
      { id: 2, x: 4, z: 0 },
    ]);
    b.report('noise', 0, 0, 0, -1, ids(1, 2), 2);
    b.tick(0, v);
    expect(sends(b)[0]![0]).toBe(2);
    const b2 = new IncidentBoard(paths());
    const v2 = view([
      { id: 1, x: 3, z: 0 },
      { id: 2, x: 3.6, z: 0, level: LEVEL.cooldown },
    ]);
    b2.report('noise', 0, 0, 0, -1, ids(1, 2), 2);
    b2.tick(0, v2);
    expect(sends(b2)[0]![0]).toBe(2);
  });

  it('dogs and melee kinds never go; nor held, busy, already tasked, investigating or alerted guards', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 1, z: 0, flags: GV_MELEE },
      { id: 2, x: 1.5, z: 0, flags: GV_HELD },
      { id: 3, x: 2, z: 0, flags: GV_BUSY },
      { id: 4, x: 2.5, z: 0, task: 77 },
      { id: 5, x: 3, z: 0, level: LEVEL.investigating },
      { id: 6, x: 3.5, z: 0, level: LEVEL.alert },
      { id: 7, x: 9, z: 0 },
    ]);
    b.report('noise', 0, 0, 0, -1, ids(1, 2, 3, 4, 5, 6, 7), 7);
    b.tick(0, v);
    expect(sends(b)).toEqual([[7, MODE_INVESTIGATE, 0]]);
    // the held guard gets no ack either (he cannot look anywhere)
    expect(acks(b).map((a) => a[0])).not.toContain(2);
  });

  it('nobody who heard it may go: a calm guard within callR is sent; none within: nobody', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 1, z: 0, flags: GV_MELEE },
      { id: 2, x: INCIDENT.callR - 1, z: 0 },
    ]);
    b.report('noise', 0, 0, 0, -1, ids(1), 1);
    b.tick(0, v);
    expect(sends(b)[0]![0]).toBe(2);
    const b2 = new IncidentBoard(paths());
    const v2 = view([
      { id: 1, x: 1, z: 0, flags: GV_MELEE },
      { id: 2, x: INCIDENT.callR + 1, z: 0 },
    ]);
    b2.report('noise', 0, 0, 0, -1, ids(1), 1);
    b2.tick(0, v2);
    expect(sends(b2)).toEqual([]);
  });

  it('deterministic ties: equal scores go to the lower guard index, run after run', () => {
    for (let r = 0; r < 3; r++) {
      const b = new IncidentBoard(paths());
      const v = view([
        { id: 30, x: 0, z: 4 },
        { id: 20, x: 4, z: 0 },
        { id: 10, x: -4, z: 0 },
      ]);
      b.report('noise', 0, 0, 0, -1, ids(10, 20, 30), 3);
      b.tick(0, v);
      expect(sends(b)[0]![0]).toBe(30);
    }
  });

  it('3D: a guard on the floor above, nearer on the plan, is not the nearest', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 0.5, z: 0, y: 3.4 },
      { id: 2, x: 2.5, z: 0 },
    ]);
    b.report('noise', 0, 0, 0, -1, ids(1, 2), 2);
    b.tick(0, v);
    expect(sends(b)[0]![0]).toBe(2);
  });
});

describe('incident board: lights (M1: one or two)', () => {
  it('a light seen by 2 within lightPairR: 2 go (the second sweeps the ring offset); seen by 1: 1 goes', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 5, z: 0 },
      { id: 2, x: -8, z: 3 },
      { id: 3, x: 30, z: 0 },
    ]);
    b.report('light', 0, 0, 0, 42, ids(1, 2), 2);
    b.tick(0, v);
    expect(sends(b)).toEqual([
      [1, MODE_LIGHT, 0],
      [2, MODE_LIGHT, 1],
    ]);
    const b1 = new IncidentBoard(paths());
    const v1 = view([
      { id: 1, x: 5, z: 0 },
      { id: 2, x: -8, z: 3 },
    ]);
    b1.report('light', 0, 0, 0, 42, ids(1), 1);
    b1.tick(0, v1);
    expect(sends(b1)).toEqual([[1, MODE_LIGHT, 0]]);
  });

  it('the second must be within lightPairR of the light: a far second witness only acks', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 5, z: 0 },
      { id: 2, x: INCIDENT.lightPairR + 2, z: 0 },
    ]);
    b.report('light', 0, 0, 0, 7, ids(1, 2), 2);
    b.tick(0, v);
    expect(sends(b)).toEqual([[1, MODE_LIGHT, 0]]);
    expect(acks(b).map((a) => a[0])).toEqual([2]);
  });

  it('nobody saw it: nobody is sent (no more 25 m through walls); it closes after mergeT', () => {
    const b = new IncidentBoard(paths());
    const v = view([{ id: 1, x: 5, z: 0 }]);
    b.report('light', 0, 0, 0, 3, ids(), 0);
    b.tick(0, v);
    expect(sends(b)).toEqual([]);
    expect(b.openCount).toBe(1);
    for (let k = 0; k < 60; k++) b.tick(0.2, v);
    expect(b.openCount).toBe(0);
  });

  it('dedupe by light id: a second report of the same light adds a witness, never a second assignment', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 5, z: 0 },
      { id: 2, x: 6, z: 2 },
    ]);
    const a = b.report('light', 0, 0, 0, 9, ids(1), 1);
    b.tick(0, v);
    apply(b, v);
    const c = b.report('light', 0, 0, 0, 9, ids(2), 1);
    b.tick(0, v);
    expect(c).toBe(a);
    expect(sends(b)).toEqual([]);
    expect(acks(b).map((x) => x[0])).toEqual([2]);
    // another light (another id) close by is its own incident
    const d = b.report('light', 1, 0, 1, 10, ids(2), 1);
    expect(d).not.toBe(a);
  });

  it("the bulb's pop and the round's impact (plain noises under the light) merge into it: one event, not three", () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 5, z: 0 },
      { id: 2, x: 2, z: 1 },
    ]);
    const l = b.report('light', 0, 0, 0, 4, ids(1), 1);
    b.tick(0, v);
    apply(b, v);
    // the pop up at the fixture (5 m above the floor point), heard by guard 2; the impact 3 m off on the plan
    expect(b.report('noise', 0, 0, 5, -1, ids(2), 1)).toBe(l);
    expect(b.report('noise', 3, 0, 4, -1, ids(2), 1)).toBe(l);
    b.tick(0, v);
    expect(sends(b)).toEqual([]);
    expect(b.openCount).toBe(1);
  });

  it('the pop reported first: the light takes over the waiting noise incident (a light check, not a noise)', () => {
    const b = new IncidentBoard(paths());
    const v = view([{ id: 1, x: 5, z: 0, flags: GV_MELEE }]);
    const n = b.report('noise', 0, 0, 5, -1, ids(1), 1);
    b.tick(0, v);
    const v2 = view([
      { id: 1, x: 5, z: 0, flags: GV_MELEE },
      { id: 2, x: 4, z: 1 },
    ]);
    // the dog heard it but may not go and nobody else is near enough: still waiting when the light is reported
    const l = b.report('light', 0, 0, 0, 5, ids(2), 1);
    expect(l).toBe(n);
    expect(b.kindOf(l)).toBe('light');
    b.tick(0, v2);
    expect(sends(b)).toEqual([[2, MODE_LIGHT, 0]]);
  });

  it('the light check: a look, then 4 ring points from 2 to 6 m; 8 s at the spot in all', () => {
    expect(INCIDENT.lightLook + INCIDENT.ringN * INCIDENT.ringLook).toBe(INCIDENT.lightCheck);
    const p: [number, number] = [0, 0];
    const r: number[] = [];
    for (let k = 0; k < INCIDENT.ringN; k++) {
      lightRingPoint(10, -3, k, 0.3, 0, p);
      r.push(Math.hypot(p[0] - 10, p[1] + 3));
    }
    expect(r[0]).toBeCloseTo(INCIDENT.ringMin, 5);
    expect(r[INCIDENT.ringN - 1]).toBeCloseTo(INCIDENT.ringMax, 5);
    // a quarter turn apart; the partner's ring starts an eighth on
    lightRingPoint(0, 0, 0, 0, 0, p);
    const a0 = Math.atan2(p[0], p[1]);
    lightRingPoint(0, 0, 1, 0, 0, p);
    expect(Math.atan2(p[0], p[1]) - a0).toBeCloseTo(Math.PI / 2, 5);
    lightRingPoint(0, 0, 0, 0, 1, p);
    expect(Math.atan2(p[0], p[1]) - a0).toBeCloseTo(Math.PI / 4, 5);
  });

  it('lightInView: the focused cone to its range, the peripheral field to its shorter range, never behind', () => {
    const P = PERCEPTION;
    const f = (x: number, z: number, y = 3) => lightInView(0, 1.55, 0, 0, x, y, z, P.focusHalf, P.focusRange, P.periphHalf, P.periphRange);
    expect(f(0, 20)).toBe(true);
    expect(f(0, P.focusRange + 1)).toBe(false);
    // 70 deg off: peripheral only, inside 12 m yes, beyond no
    expect(f(Math.sin(1.22) * 8, Math.cos(1.22) * 8)).toBe(true);
    expect(f(Math.sin(1.22) * 16, Math.cos(1.22) * 16)).toBe(false);
    expect(f(0, -5)).toBe(false);
  });
});

describe('incident board: merging, closing, escalation', () => {
  it('same kind within mergeR and mergeT of its last report merges; farther or later is a new incident', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 2, z: 0 },
      { id: 2, x: -3, z: 0 },
      { id: 3, x: 12, z: 0 },
    ]);
    const a = b.report('noise', 0, 0, 0, -1, ids(1), 1);
    b.tick(0, v);
    apply(b, v);
    expect(b.report('noise', INCIDENT.mergeR - 0.5, 0, 0, -1, ids(2), 1)).toBe(a);
    b.tick(0, v);
    expect(sends(b)).toEqual([]);
    expect(b.report('noise', INCIDENT.mergeR + 4, 0, 0, -1, ids(3), 1)).not.toBe(a);
    // gunfire never merges into a plain noise
    expect(b.report('shots', 0.5, 0, 0, -1, ids(2), 1)).not.toBe(a);
    // past mergeT since the last report: new
    const b2 = new IncidentBoard(paths());
    const c = b2.report('noise', 0, 0, 0, -1, ids(1), 1, 0);
    expect(b2.report('noise', 1, 0, 0, -1, ids(2), 1, INCIDENT.mergeT + 0.1)).not.toBe(c);
  });

  it('closes once the investigator is back (off the task)', () => {
    const b = new IncidentBoard(paths());
    const v = view([{ id: 1, x: 2, z: 0 }]);
    b.report('noise', 0, 0, 0, -1, ids(1), 1);
    b.tick(0, v);
    apply(b, v);
    b.tick(0.2, v);
    expect(b.openCount).toBe(1);
    v.task[0] = -1;
    b.tick(0.2, v);
    expect(b.openCount).toBe(0);
  });

  it('investigator down for silentEscalate s: missing, the 2 nearest calm guards go as a pair (lead, cover 5 m short)', () => {
    const b = new IncidentBoard(paths());
    const gs: G[] = [
      { id: 1, x: 2, z: 0 },
      { id: 2, x: 20, z: 0 },
      { id: 3, x: 0, z: 30 },
      { id: 4, x: -50, z: 0 },
      { id: 5, x: 10, z: 0, flags: GV_MELEE },
    ];
    let v = view(gs);
    b.report('noise', 0, 0, 0, -1, ids(1), 1);
    b.tick(0, v);
    apply(b, v);
    // he walks over and is taken out at (1, 0): gone from the list (dead / knocked out)
    v.x[0] = 1;
    b.tick(0.2, v);
    v = view(gs.slice(1));
    let t = 0;
    while (t < INCIDENT.silentEscalate - 0.5) {
      b.tick(0.2, v);
      t += 0.2;
      expect(sends(b)).toEqual([]);
    }
    for (let k = 0; k < 5 && b.escalations === 0; k++) b.tick(0.2, v);
    expect(b.escalations).toBe(1);
    // the missing incident is assigned at the next tick (or at once)
    if (sends(b).length === 0) b.tick(0.2, v);
    const s = sends(b);
    expect(s).toEqual([
      [2, MODE_LEAD, 0],
      [3, MODE_COVER, 1],
    ]);
    // the lead goes to where he was last; the cover holds pairBack short of it on his side
    const o = b.out;
    const ci = s.findIndex((q) => q[1] === MODE_COVER);
    const li = s.findIndex((q) => q[1] === MODE_LEAD);
    let k0 = -1;
    let k1 = -1;
    for (let k = 0, c = 0; k < o.n; k++) {
      if (o.cmd[k] !== CMD_SEND) continue;
      if (c === li) k0 = k;
      if (c === ci) k1 = k;
      c++;
    }
    expect(o.x[k0]).toBeCloseTo(1, 4);
    expect(Math.hypot(o.x[k1]! - 1, o.z[k1]!)).toBeCloseTo(INCIDENT.pairBack, 3);
  });

  it('a held investigator (grabbed, interrogated) escalates the same way; one back in time does not', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 2, z: 0 },
      { id: 2, x: 8, z: 0 },
      { id: 3, x: 9, z: 0 },
    ]);
    b.report('noise', 0, 0, 0, -1, ids(1), 1);
    b.tick(0, v);
    apply(b, v);
    v.flags[0] = GV_HELD;
    for (let t = 0; t < 10; t += 0.2) b.tick(0.2, v);
    // let go after 10 s: no escalation
    v.flags[0] = 0;
    for (let t = 0; t < 30; t += 0.2) b.tick(0.2, v);
    expect(b.escalations).toBe(0);
    v.flags[0] = GV_HELD;
    for (let t = 0; t < INCIDENT.silentEscalate + 1; t += 0.2) b.tick(0.2, v);
    expect(b.escalations).toBe(1);
  });

  it('the pool is fixed: 20 incidents in, the oldest are dropped, never more than perSection open', () => {
    const b = new IncidentBoard(paths());
    const v = view([{ id: 1, x: 0, z: 0, flags: GV_MELEE }]);
    for (let k = 0; k < 20; k++) b.report('noise', k * 20, 0, 0, -1, ids(1), 1);
    b.tick(0, v);
    expect(b.openCount).toBe(INCIDENT.perSection);
  });

  it('no allocation smoke: 1000 ticks with open incidents run on the fixed pools', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 2, z: 0 },
      { id: 2, x: 5, z: 0 },
      { id: 3, x: 9, z: 9 },
    ]);
    b.report('light', 0, 0, 0, 1, ids(1, 2), 2);
    b.report('noise', 30, 0, 0, -1, ids(3), 1);
    const pool = b.inv;
    for (let k = 0; k < 1000; k++) {
      b.tick(0.2, v);
      b.out.n = 0;
    }
    expect(b.inv).toBe(pool);
    expect(b.openCount).toBeLessThanOrEqual(INCIDENT.perSection);
  });
});

describe('alert machine: S2 inputs', () => {
  it('turning (a sound he was not sent to): the linger rule waits, so continuous steps do not pull him over', () => {
    const m = new AlertMachine();
    const i = emptyAlertInput();
    i.meter = 0.4;
    i.turning = true;
    for (let t = 0; t < ALERT.lingerLook + 2; t += 0.1) m.step(0.1, i);
    expect(m.level).toBe('suspicious');
    i.turning = false;
    for (let t = 0; t < 0.5; t += 0.1) m.step(0.1, i);
    expect(m.level).toBe('investigating');
  });
  it('hold (the light check): investigating does not time out or end on arrival; the task ends it', () => {
    const m = new AlertMachine();
    m.set('investigating');
    const i = emptyAlertInput();
    i.hold = true;
    i.arrived = true;
    for (let t = 0; t < ALERT.investigateMax + 5; t += 0.1) m.step(0.1, i);
    expect(m.level).toBe('investigating');
    i.hold = false;
    for (let t = 0; t < ALERT.investigateLook + 0.5; t += 0.1) m.step(0.1, i);
    expect(m.level).toBe('cooldown');
  });
});

// ----- EnemyManager.lightsOut on stand-in guards (who saw it go) -----

function lightGuard(num: number, x: number, z: number, yaw: number, o: Record<string, unknown> = {}) {
  return {
    id: `l${num}`,
    num,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    level: 'unaware',
    incident: -1,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw,
    checkLight: vi.fn(),
    ack: vi.fn(),
    notice: vi.fn(),
    hear: vi.fn(),
    sendTo: vi.fn(),
    ...o,
  };
}

function lightManager(rooms: RoomRect[], blocked: (x: number, z: number) => boolean = () => false) {
  const lamp = { id: 3, kind: 'lamp', x: 0, y: 5, z: 0, group: 2, on: false, destroyed: true };
  const world = {
    level: { lights: { lights: [lamp], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn((a: Vector3) => !blocked(a.x, a.z));
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  return { em, clear };
}

describe('EnemyManager.lightsOut (coordinated): who saw it go', () => {
  const hall: RoomRect = { id: 'hall', name: 'Hall', minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const side: RoomRect = { id: 'side', name: 'Side', minX: -30, maxX: -10, minZ: -10, maxZ: 10 };

  it('the room he stands in goes dark, or the fixture in his field with a clear line: those two go; one behind a wall, facing away, does not', () => {
    const { em } = lightManager([hall, side]);
    // in the hall, facing away from the lamp (room rule)
    const a = lightGuard(1, 6, 0, Math.PI / 2);
    // in the side room, facing the lamp 12 m off, clear line (sight rule)
    const b = lightGuard(2, -12, 0, Math.PI / 2);
    // in the side room, facing away: sees nothing
    const c = lightGuard(3, -13, 2, -Math.PI / 2);
    for (const g of [a, b, c]) em.enemies.push(g as unknown as Enemy);
    em.lightsOut(0, 0, 5, 3);
    expect(a.checkLight).toHaveBeenCalledTimes(1);
    expect(b.checkLight).toHaveBeenCalledTimes(1);
    expect(c.checkLight).not.toHaveBeenCalled();
    expect(c.ack).not.toHaveBeenCalled();
  });

  it('a lone witness: one goes; the rest of the map never hears of it (no 25 m / 14 m rule)', () => {
    const { em } = lightManager([hall, side], (x) => x < -10);
    const a = lightGuard(1, 6, 0, 0);
    // facing the lamp but a wall in the way
    const b = lightGuard(2, -12, 0, Math.PI / 2);
    for (const g of [a, b]) em.enemies.push(g as unknown as Enemy);
    em.lightsOut(0, 0, 5, 3);
    expect(a.checkLight).toHaveBeenCalledTimes(1);
    expect(b.checkLight).not.toHaveBeenCalled();
    expect(b.notice).not.toHaveBeenCalled();
  });

  it('uncoordinated (parked modes): the old rule, the nearest within 25 m is sent through walls', () => {
    const { em } = lightManager([hall, side], () => true);
    em.coordinated = false;
    const b = lightGuard(2, -12, 0, -Math.PI / 2);
    em.enemies.push(b as unknown as Enemy);
    em.lightsOut(0, 0, 5, 3);
    expect(b.hear).toHaveBeenCalledTimes(1);
    expect(b.checkLight).not.toHaveBeenCalled();
  });
});
