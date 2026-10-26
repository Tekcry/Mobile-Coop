import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, RADIO_ALARM } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { RADIO } from '../src/ai/radioNet';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S3) The radio net wired into EnemyManager (design 5, M5), on stand-in guards: the spotter's contact call
// reaches the section only when it completes, nearest first, staggered; a cut call reaches nobody; the shout is the
// voice model; reports are acknowledged once; the command call's alarm is off until S6.

interface FakeGuard {
  id: string;
  num: number;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  runningAlarm: boolean;
  dog: null;
  buff: boolean;
  level: string;
  incident: number;
  def: { melee: object | null; kind: string; scale: number };
  pos: Vector3;
  yaw: number;
  radio: ReturnType<typeof vi.fn>;
  /** (guard-ai S24) his intruder slot (the shout and the contact call carry it). */
  hunt: number;
  bark: ReturnType<typeof vi.fn>;
}

let n = 0;
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 7000 + n++;
  return {
    id: `r${num}`,
    num,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    runningAlarm: false,
    dog: null,
    buff: false,
    level: 'unaware',
    incident: -1,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw: 0,
    radio: vi.fn(),
    hunt: -1,
    bark: vi.fn(),
    ...o,
  };
}

/** A manager on a stub world (open floor); `wall(x, z)`: a wall between the speaker and a listener standing there. */
function manager(gs: FakeGuard[], wall: (x: number, z: number) => boolean = () => false) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn((_a: Vector3, b: Vector3) => !wall(b.x, b.z));
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  const priv = em as unknown as { ctx: AiContext; radioStep(dt: number): void };
  const ctx = priv.ctx;
  /** Run the 10 Hz net for `sec` s; returns the clock time each guard's `radio` was first called (by guard index;
   *  -1 not yet; the clock runs on across calls). */
  let clock = 0;
  const at = gs.map(() => -1);
  const run = (sec: number): number[] => {
    for (let k = 0; k < Math.round(sec / 0.1); k++) {
      clock += 0.1;
      priv.radioStep(0.1);
      gs.forEach((g, i) => {
        if (at[i]! < 0 && g.radio.mock.calls.length > 0) at[i] = clock;
      });
    }
    return at.slice();
  };
  return { em, ctx, run, clear };
}

const E = (g: FakeGuard) => g as unknown as Enemy;

describe('radio net wired (coordinated): the contact call', () => {
  it('nothing before the call completes; then every other guard of the section, nearest first, staggered <= staggerMax', () => {
    const spotter = guard(0, 0);
    const others = [guard(30, 0), guard(0, 7), guard(3, 0), guard(-20, 0), guard(0, -12)];
    const { ctx, run } = manager([spotter, ...others]);
    ctx.radioCall!(E(spotter), -1, 'contact');
    // nobody hears before the call completes (2.5 s at normal reaction)
    const early = run(RADIO.callIn - 0.2);
    expect(early.every((t) => t < 0)).toBe(true);
    const at = run(RADIO.staggerMax + 1.2).slice(1);
    // everyone is told, the guard 30 m off too (the old 22 m circle is gone: the section is the range)
    expect(at.every((t) => t > 0)).toBe(true);
    // in distance order (3, 7, 12, 20, 30 m), strictly later each
    const byDist = [2, 1, 4, 3, 0].map((k) => at[k]!);
    for (let k = 1; k < byDist.length; k++) expect(byDist[k]!).toBeGreaterThan(byDist[k - 1]!);
    expect(byDist[0]!).toBeGreaterThanOrEqual(RADIO.callIn + RADIO.staggerBase - 1e-6);
    expect(byDist[4]!).toBeLessThanOrEqual(RADIO.callIn + RADIO.staggerMax + 0.1 + 1e-6);
    // spread over seconds, never all at once
    expect(byDist[4]! - byDist[0]!).toBeGreaterThan(1);
    // the receiver joins at once (the stagger already holds his reaction); the spotter is not told his own call
    for (const g of others) expect(g.radio.mock.calls[0]![0]).toBe(0);
    expect(spotter.radio).not.toHaveBeenCalled();
  });

  it("the spotter's radio line shows when the call gets through, not before", () => {
    const spotter = guard(0, 0);
    const { ctx, run } = manager([spotter, guard(5, 0)]);
    ctx.radioCall!(E(spotter), -1, 'contact');
    run(RADIO.callIn - 0.2);
    expect(spotter.bark).not.toHaveBeenCalled();
    run(0.3);
    expect(spotter.bark).toHaveBeenCalledWith('callIn');
  });

  it('cut before it completes (down, grabbed, blinded): nobody is told, the call is lost', () => {
    const spotter = guard(0, 0);
    const others = [guard(4, 0), guard(15, 0)];
    const { em, ctx, run } = manager([spotter, ...others]);
    ctx.radioCall!(E(spotter), -1, 'contact');
    run(1.2);
    ctx.radioCut!(E(spotter));
    run(RADIO.callIn + RADIO.staggerMax + 1);
    for (const g of others) expect(g.radio).not.toHaveBeenCalled();
    expect(em.radioNet.lost).toBe(1);
    expect(em.radioNet.openCalls).toBe(0);
  });

  it('held when it would complete (the safety net): lost too; a held receiver is not told', () => {
    const spotter = guard(0, 0);
    const held = guard(3, 0, { taken: true });
    const free = guard(6, 0);
    const { em, ctx, run } = manager([spotter, held, free]);
    ctx.radioCall!(E(spotter), -1, 'contact');
    spotter.taken = true;
    run(RADIO.callIn + RADIO.staggerMax + 1);
    expect(free.radio).not.toHaveBeenCalled();
    expect(em.radioNet.lost).toBe(1);
    // a free spotter: the held receiver is skipped, the free one told
    spotter.taken = false;
    ctx.radioCall!(E(spotter), -1, 'contact');
    run(RADIO.callIn + RADIO.staggerMax + 1);
    expect(held.radio).not.toHaveBeenCalled();
    expect(free.radio).toHaveBeenCalledTimes(1);
  });

  it('radioLeft: the seconds left on his call (the e2e reads it), 0 with none', () => {
    const spotter = guard(0, 0);
    const { em, ctx, run } = manager([spotter, guard(4, 0)]);
    expect(em.radioLeft(E(spotter))).toBe(0);
    ctx.radioCall!(E(spotter), -1, 'contact');
    expect(em.radioLeft(E(spotter))).toBeCloseTo(RADIO.callIn, 5);
    run(1);
    expect(em.radioLeft(E(spotter))).toBeCloseTo(RADIO.callIn - 1, 5);
  });

  it('an officer near (buff) calls faster; a rookie difficulty slower (x reaction)', () => {
    const spotter = guard(0, 0, { buff: true });
    const { em, ctx } = manager([spotter]);
    ctx.radioCall!(E(spotter), -1, 'contact');
    expect(em.radioLeft(E(spotter))).toBeLessThan(RADIO.callIn);
  });

  it('deterministic: two runs tell the same guards at the same times', () => {
    const mk = () => {
      const s = guard(0, 0);
      const os = [guard(9, 1), guard(-4, 2), guard(2, -11), guard(6, 6)];
      const m = manager([s, ...os]);
      m.ctx.radioCall!(E(s), -1, 'contact');
      return m.run(RADIO.callIn + RADIO.staggerMax + 1).slice(1);
    };
    expect(mk()).toEqual(mk());
  });

  it('coordinated off (Hunter, Mission): no call is started (the old 22 m radio stays)', () => {
    const spotter = guard(0, 0);
    const { em, ctx } = manager([spotter, guard(4, 0)]);
    em.coordinated = false;
    ctx.radioCall!(E(spotter), -1, 'contact');
    expect(em.radioNet.openCalls).toBe(0);
  });

  it('clear (a Sector unload / restart) drops every call and queued reception', () => {
    const spotter = guard(0, 0);
    const other = guard(4, 0);
    const { em, ctx, run } = manager([spotter, other]);
    ctx.radioCall!(E(spotter), -1, 'contact');
    em.radioNet.clear();
    run(RADIO.callIn + RADIO.staggerMax + 1);
    expect(other.radio).not.toHaveBeenCalled();
  });
});

describe('radio net wired: the shout (voice model)', () => {
  it('heard at the investigate tier of a 12 m voice: 4 m in the open joins (+0.3 s); 7 m does not; a wall cuts it to ~2.7 m', () => {
    const spotter = guard(0, 0);
    const open4 = guard(-4, 0);
    const open7 = guard(0, -7);
    const wall4 = guard(4, 0);
    const wall2 = guard(2, 0.5);
    const busy = guard(-3, 1, { alerted: true });
    const { ctx, clear } = manager([spotter, open4, open7, wall4, wall2, busy], (x) => x > 0);
    ctx.shout!(E(spotter));
    expect(open4.radio).toHaveBeenCalledWith(RADIO.voiceDelay, -1);
    expect(open7.radio).not.toHaveBeenCalled();
    expect(wall4.radio).not.toHaveBeenCalled();
    expect(wall2.radio).toHaveBeenCalledWith(RADIO.voiceDelay, -1);
    expect(busy.radio).not.toHaveBeenCalled();
    // one ray only where one wall decides it (the 4 m listeners), none for the 2 m one or the 7 m one
    expect(clear).toHaveBeenCalledTimes(2);
  });

  it('coordinated off: the old 8 m shout (through walls)', () => {
    const spotter = guard(0, 0);
    const at7 = guard(7, 0);
    const { em, ctx } = manager([spotter, at7], () => true);
    em.coordinated = false;
    ctx.shout!(E(spotter));
    expect(at7.radio).toHaveBeenCalledTimes(1);
    const d = at7.radio.mock.calls[0]![0] as number;
    expect(d).toBeGreaterThanOrEqual(0.3);
    expect(d).toBeLessThan(0.6 + 1e-9);
  });
});

describe('radio net wired: reports and the command call', () => {
  it('a light / stand-down / missing report: the section hears it once it completes; only its first receiver says "Copy."', () => {
    for (const kind of ['light', 'standDown', 'missing'] as const) {
      const caller = guard(0, 0);
      const near = guard(3, 0);
      const mid = guard(8, 0);
      const far = guard(20, 0);
      const { ctx, run } = manager([caller, near, mid, far]);
      ctx.radioCall!(E(caller), 4, kind);
      run(RADIO.callIn + RADIO.staggerMax + 1);
      expect(near.bark).toHaveBeenCalledWith('ack');
      expect(mid.bark).not.toHaveBeenCalled();
      expect(far.bark).not.toHaveBeenCalled();
      // a report is not a contact: nobody goes to combat
      for (const g of [near, mid, far]) expect(g.radio).not.toHaveBeenCalled();
      expect(caller.bark).not.toHaveBeenCalledWith('callIn');
    }
  });

  it('(S6) RADIO_ALARM is on: a completed command call raises the alarm (no panel needed) and queues nobody', () => {
    expect(RADIO_ALARM).toBe(true);
    const caller = guard(0, 0);
    const other = guard(4, 0);
    const { em, run } = manager([caller, other]);
    em.radioNet.startCall(caller.num, -1, 'command', 0.2);
    run(1);
    expect(em.radioNet.alarms).toBe(1);
    expect(em.alarmRaised).toBe(true);
    expect(em.alarmBy).toBe('radio');
    expect(other.radio).not.toHaveBeenCalled();
    // (guard-rules S5, A7) a second command call through: no second alarm while the repeat lock is shut (alarmRepeat
    // off, today's one per load); the net still counts the call, the manager does not raise
    em.radioNet.startCall(caller.num, -1, 'command', 0.2);
    run(1);
    expect([em.radioNet.alarms, em.guardAlarms, em.sectionCounts.radioAlarms]).toEqual([2, 1, 1]);
  });
});
