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
  KIND,
  LEVEL,
  lightInView,
  lightRingPoint,
  MODE_BREAKER,
  MODE_COVER,
  MODE_INVESTIGATE,
  MODE_LEAD,
  MODE_LIGHT,
  type PathLen,
} from '../src/ai/incidents';
import { AlertMachine, ALERT, emptyAlertInput, type AlertLevel } from '../src/ai/alertState';
import { LC_DONE, LC_FACE, LightCheck, RING_WALK, type LightCheckNav, type LightCheckWalker } from '../src/ai/lightCheck';
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

// (guard-ai S2 fix round) e2e 'light pair': the first of a pair stood investigating for good. His last ring point lay
// past the wall at x -4 (6 m out, a three-quarter turn from the side he came from), so he walked an A* detour round it;
// the 8 s ring timeout only fired with no path left, so he froze there and his incident never closed.

/** Nav stand-in: open floor on a 0.5 m grid, a wall along x = WALL_X with one door at z = DOOR_Z (a long way round). */
const WALL_X = -4;
const DOOR_Z = 20;
const CELL = 0.5;
function wallNav(): LightCheckNav {
  const side = (x: number): number => (x < WALL_X ? -1 : 1);
  return {
    nearestWalkable(x, z) {
      return (Math.floor(x / CELL) + 1000) * 10000 + (Math.floor(z / CELL) + 1000);
    },
    center(c) {
      return [(Math.floor(c / 10000) - 1000 + 0.5) * CELL, ((c % 10000) - 1000 + 0.5) * CELL];
    },
    lineClear(a, b) {
      if (side(a[0]) === side(b[0])) return true;
      const t = (WALL_X - a[0]) / (b[0] - a[0]);
      return Math.abs(a[1] + (b[1] - a[1]) * t - DOOR_Z) < 1;
    },
  };
}

/** A guard walking at the grunt's investigate pace: straight when the line is clear, else through the door (the
 *  enemy's `goTo`: the next waypoint, null when within 0.6 m; the path kept until dropped). `stuck`: he cannot move. */
class SimGuard implements LightCheckWalker {
  readonly lc = new LightCheck();
  path: [number, number][] = [];
  doneAt = -1;
  stuck = false;
  readonly ring: [number, number][] = [];
  constructor(
    public x: number,
    public z: number,
    private readonly nav: LightCheckNav,
  ) {}
  walkTo(p: [number, number]): [number, number] | null {
    if (Math.hypot(p[0] - this.x, p[1] - this.z) < 0.6) return null;
    if (this.nav.lineClear([this.x, this.z], p)) {
      this.path.length = 0;
      return p;
    }
    if (this.path.length === 0) {
      const s = this.x < WALL_X ? -1 : 1;
      this.path = [
        [WALL_X + s * 0.5, DOOR_Z],
        [WALL_X - s * 0.5, DOOR_Z],
        [p[0], p[1]],
      ];
    }
    if (Math.hypot(this.path[0]![0] - this.x, this.path[0]![1] - this.z) < 0.4) this.path.shift();
    return this.path[0] ?? p;
  }
  following(): boolean {
    return this.path.length > 0;
  }
  dropPath(): void {
    this.path.length = 0;
  }
  step(dt: number, t: number): number {
    const k0 = this.lc.k;
    const r = this.lc.step(dt, this.x, 0, this.z, 0, this.nav, this);
    if (r === LC_DONE) this.doneAt = t;
    // a look at a ring point (not the look at the fixture that just ended)
    if (r === LC_FACE && k0 >= 2) {
      const last = this.ring[this.ring.length - 1];
      if (!last || last[0] !== this.lc.spot[0] || last[1] !== this.lc.spot[1]) this.ring.push([this.lc.spot[0], this.lc.spot[1]]);
    }
    const p = this.lc.point;
    if (r === 0 && p && !this.stuck) {
      const d = Math.hypot(p[0] - this.x, p[1] - this.z);
      const m = Math.min(d, 0.77 * dt);
      this.x += ((p[0] - this.x) / d) * m;
      this.z += ((p[1] - this.z) / d) * m;
    }
    return r;
  }
}

describe('the light check (fix round: e2e light pair)', () => {
  it('a 2-guard light incident: both check the light and the ring, both are released, the incident closes', () => {
    const nav = wallNav();
    const b = new IncidentBoard(paths());
    // the e2e's lamp at (0, -3) and its two witnesses; the wall at x -4 like the racking hall's
    const gs = [new SimGuard(4, 1, nav), new SimGuard(3, -6.5, nav)];
    const v = view([
      { id: 1, x: 4, z: 1 },
      { id: 2, x: 3, z: -6.5 },
    ]);
    const inc = b.report('light', 0, -3, 0, 7, ids(1, 2), 2);
    b.tick(0, v);
    // the nearer (b) leads, slot 0; a is the pair's second (slot 1: stops short, ring an eighth on)
    expect(sends(b)).toEqual([
      [2, MODE_LIGHT, 0],
      [1, MODE_LIGHT, 1],
    ]);
    const o = b.out;
    for (let k = 0; k < o.n; k++) gs[o.guard[k]! - 1]!.lc.start(o.x[k]!, o.z[k]!, o.arg[k]!);
    apply(b, v);
    const dt = 0.1;
    let t = 0;
    for (let n = 0; n < 1200 && b.openCount > 0; n++) {
      t += dt;
      gs.forEach((g, i) => {
        if (g.doneAt >= 0) return;
        g.step(dt, t);
        v.x[i] = g.x;
        v.z[i] = g.z;
        if (g.doneAt >= 0) v.task[i] = -1;
      });
      b.tick(dt, v);
    }
    // both released (a, the second, froze on his third ring point before), well inside the e2e's 120 s
    expect(gs[0]!.doneAt).toBeGreaterThan(0);
    expect(gs[1]!.doneAt).toBeGreaterThan(0);
    expect(Math.max(gs[0]!.doneAt, gs[1]!.doneAt)).toBeLessThan(60);
    expect(b.openCount).toBe(0);
    expect(b.kindOf(inc)).toBeNull();
    // the ring stays in the light's space: a's third point (past the wall) is pulled in, not walked round to
    const p = [0, 0] as [number, number];
    lightRingPoint(0, -3, 2, Math.atan2(gs[0]!.ring[0]![0], gs[0]!.ring[0]![1] + 3) - Math.PI / 4, 1, p);
    expect(p[0]).toBeLessThan(WALL_X);
    for (const g of gs) {
      expect(g.ring.length).toBe(INCIDENT.ringN);
      for (const q of g.ring) expect(q[0]).toBeGreaterThan(WALL_X);
    }
  });

  it('a ring point he cannot get to (blocked on a path) is given up after RING_WALK s, path or not', () => {
    const nav = wallNav();
    const g = new SimGuard(2, -3, nav);
    g.lc.start(0, -3, 0);
    // at the light, then frozen in place on a path that never ends
    let t = 0;
    while (g.lc.k < 2 && t < 10) g.step(0.1, (t += 0.1));
    g.stuck = true;
    g.path = [[50, 50]];
    g.following = () => true;
    const k0 = g.lc.k;
    while (g.lc.k === k0 && t < 30) g.step(0.1, (t += 0.1));
    expect(g.lc.k).toBe(k0 + 1);
    // and the whole check ends within the ring's bound
    while (g.doneAt < 0 && t < 60) g.step(0.1, (t += 0.1));
    expect(g.doneAt).toBeGreaterThan(0);
    expect(g.doneAt).toBeLessThan(2 + INCIDENT.lightLook + INCIDENT.ringN * (RING_WALK + 0.2));
  });
});

// (guard-ai S2 fix round 2) e2e 'lkp': an alerted guard who lost sight walked on to the last known position at the calm
// search pace (0.75) with the calm turn once the alert timed out into a search (12 s), so he no longer got there in the
// window. A search after combat keeps the old pace and the aimed turn; only a calm search is slow.
describe('search pace: after combat vs calm (fix round 2: e2e lkp)', () => {
  type Probe = { searchPace: number; aimedMotion: boolean; onLevel(from: AlertLevel, to: AlertLevel): void; aware: AlertMachine };
  async function guard(coordinated: boolean): Promise<Probe> {
    const { Enemy: EnemyClass, PACE: P } = await import('../src/ai/enemy');
    expect(P.search).toBeLessThan(P.oldSearch);
    const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
      aware: new AlertMachine(),
      ctx: { coordinated: () => coordinated, stealth: () => true },
      incident: -1,
      lc: { stop() {} },
      lure: { cancel() {} }, // (guard-ai S5) the post lure
      bark() {},
      setState() {},
      walker: { rejoin() {} },
      alertIn: { called: true },
      def: { kind: 'grunt' },
      pos: { x: 0, y: 0, z: 0 },
      // (guard-ai S8) going to combat reseeds his combat dice
      rng: { reseed() {} },
      // (guard-ai S16) combat over resets the armour fire gate
      fireGate: { reset() {} },
    });
    return e as unknown as Probe;
  }
  const to = (g: Probe, from: AlertLevel, lvl: AlertLevel): void => {
    g.aware.set(lvl);
    g.onLevel(from, lvl);
  };

  it('alert -> searching (lost sight): the old search pace and the aimed turn, for the whole search', async () => {
    const { PACE: P } = await import('../src/ai/enemy');
    const g = await guard(true);
    to(g, 'unaware', 'alert');
    expect(g.aimedMotion).toBe(true);
    to(g, 'alert', 'searching');
    expect(g.searchPace).toBe(P.oldSearch);
    expect(g.aimedMotion).toBe(true);
    // the search ends: the next calm search (a body) is slow again
    to(g, 'searching', 'cooldown');
    to(g, 'cooldown', 'searching');
    expect(g.searchPace).toBe(P.search);
    expect(g.aimedMotion).toBe(false);
  });

  it('a calm search (a body, a call, a pair) keeps A9: 0.75 and the calm turn; parked modes the old pace', async () => {
    const { PACE: P } = await import('../src/ai/enemy');
    const g = await guard(true);
    to(g, 'unaware', 'searching');
    expect(g.searchPace).toBe(P.search);
    expect(g.aimedMotion).toBe(false);
    const old = await guard(false);
    to(old, 'unaware', 'searching');
    expect(old.searchPace).toBe(P.oldSearch);
    expect(old.aimedMotion).toBe(true);
  });
});

describe('S2 check polish (guard-ai S3)', () => {
  it('polish 1: a full pool never evicts the incident being escalated from; the new missing pair is sent', () => {
    const b = new IncidentBoard(paths());
    // 16 noises, all reported at the same moment (equal ages: the followed one, slot 0, is "the oldest" by ties);
    // each heard and investigated by its own guard; two free guards far off for the pair
    const gs: G[] = [];
    for (let k = 0; k < INCIDENT.perSection; k++) gs.push({ id: k + 1, x: k * 20 + 1, z: 0 });
    gs.push({ id: 100, x: 0, z: 40 }, { id: 101, x: 6, z: 40 });
    let v = view(gs);
    for (let k = 0; k < INCIDENT.perSection; k++) b.report('noise', k * 20, 0, 0, -1, ids(k + 1), 1);
    b.tick(0, v);
    apply(b, v);
    expect(b.openCount).toBe(INCIDENT.perSection);
    // the first investigator is taken out: gone from the list; the others stay on their tasks
    const tasks = Array.from(v.task.subarray(1, v.n));
    v = view(gs.slice(1));
    for (let i = 0; i < tasks.length; i++) v.task[i] = tasks[i]!;
    let lead = -1;
    let cover = -1;
    for (let t = 0; t < INCIDENT.silentEscalate + 2 && lead < 0; t += 0.2) {
      b.tick(0.2, v);
      for (const [g, m] of sends(b)) {
        if (m === MODE_LEAD) lead = g;
        if (m === MODE_COVER) cover = g;
      }
      apply(b, v);
    }
    expect(b.escalations).toBe(1);
    // before the fix the missing incident took slot 0 and the same follow closed it: nobody was sent
    expect([lead, cover].sort()).toEqual([100, 101]);
    // one other incident made room (the oldest other); the pool is still full, the missing one open
    expect(b.openCount).toBe(INCIDENT.perSection - 1);
  });

  it('polish 2: an investigation sent to a plain noise that finds nothing ends calm (unaware), not in the cooldown', () => {
    const run = (calmEnd: boolean, fought: boolean): string => {
      const m = new AlertMachine();
      if (fought) {
        m.set('alert');
        m.set('cooldown');
      }
      m.set('investigating');
      const i = emptyAlertInput();
      i.arrived = true;
      i.calmEnd = calmEnd;
      for (let t = 0; t < ALERT.investigateLook + 0.5; t += 0.1) m.step(0.1, i);
      return m.level;
    };
    expect(run(true, false)).toBe('unaware');
    // gunfire (no calmEnd) keeps the cooldown; so does a guard who has fought
    expect(run(false, false)).toBe('cooldown');
    expect(run(true, true)).toBe('cooldown');
  });

  it('polish 2: the board tells the investigator whether to end calm: a noise or a lure yes, gunfire no', () => {
    const sent: [string, boolean][] = [];
    const mk = (num: number, x: number) => ({
      id: `p${num}`,
      num,
      alive: true,
      alerted: false,
      passive: false,
      taken: false,
      level: 'unaware',
      incident: -1,
      def: { melee: null, kind: 'grunt', scale: 1 },
      pos: new Vector3(x, 0, 0),
      yaw: 0,
      hear: vi.fn(),
      hearTurn: vi.fn(),
      hearGunfire: vi.fn(),
      sendTo: vi.fn((_x: number, _z: number, _id: number, calm: boolean) => sent.push([`p${num}`, calm])),
      ack: vi.fn(),
      checkLight: vi.fn(),
      pairSearch: vi.fn(),
      // (guard-ai S14) a calm hearer of a loud shot radios it ("shots fired")
      bark: vi.fn(),
    });
    const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
    const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
    const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
    em.enemies.push(mk(1, 3) as unknown as Enemy, mk(2, 60) as unknown as Enemy);
    em.hear(new Vector3(0, 0, 0), 15, 'noise');
    em.hear(new Vector3(60, 0, 3), 15, 'distraction');
    expect(sent).toEqual([
      ['p1', true],
      ['p2', true],
    ]);
    // gunfire heard at the investigate tier (far enough not to be combat) sends one who keeps the cooldown after
    const em2 = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
    sent.length = 0;
    em2.enemies.push(mk(3, 10) as unknown as Enemy);
    em2.noise(new Vector3(0, 0, 0), 28);
    expect(sent).toEqual([['p3', false]]);
  });
});

describe('incident board: breaker faults (guard-ai S15)', () => {
  it('the kind codes of the earlier kinds hold; breaker is appended (code 10)', () => {
    expect(KIND.slice(0, 10)).toEqual(['noise', 'shots', 'light', 'distraction', 'missing', 'bodyDead', 'bodyKo', 'camBody', 'witnessKill', 'contact']);
    expect(KIND.indexOf('breaker')).toBe(10);
  });

  it('two witnesses close by: one goes (MODE_BREAKER, never a pair), the other acks; done, it closes', () => {
    const b = new IncidentBoard(paths());
    const v = view([
      { id: 1, x: 2, z: 0 },
      { id: 2, x: 4, z: 0 },
    ]);
    const id = b.report('breaker', 0, 0, 0, 100004, ids(1, 2), 2);
    b.tick(0, v);
    expect(sends(b)).toEqual([[1, MODE_BREAKER, 0]]);
    expect(acks(b).map((a) => a[0])).toEqual([2]);
    expect(b.keyOf(id)).toBe(100004);
    apply(b, v);
    // back from it (the walk ended): the board closes it
    v.task[0] = -1;
    b.tick(0.2, v);
    expect(b.kindOf(id)).toBeNull();
    expect(b.keyOf(id)).toBe(-1);
  });

  it('a breaker merges only with an open breaker of its circuit; a light with the same key is its own incident', () => {
    const b = new IncidentBoard(paths());
    const v = view([{ id: 1, x: 30, z: 0, task: 99 }]);
    const a = b.report('breaker', 0, 0, 0, 100004, ids(1), 1);
    expect(b.report('breaker', 0.5, 0, 0, 100004, ids(1), 1)).toBe(a);
    expect(b.report('breaker', 0.5, 0, 0, 100005, ids(1), 1)).not.toBe(a);
    const l = b.report('light', 0, 0, 0, 100004, ids(1), 1);
    expect(l).not.toBe(a);
    expect(b.kindOf(l)).toBe('light');
    expect(b.kindOf(a)).toBe('breaker');
    b.tick(0, v);
    expect(sends(b)).toEqual([]);
  });
});
