import { describe, expect, it } from 'vitest';
import { keepApart, SEPARATION, steerOff, stepApart, tooClose, type SepBody, type SepOut } from '../src/ai/separation';
import { Vector3 } from '../src/core/babylon';
import type { Enemy } from '../src/ai/enemy';
import { NavGrid, type NavBlocker } from '../src/ai/navGrid';

// (guard-ai S20, Michael's walk of 4.72 G4: "guards seem to walk through eachother and sometimes doors.") Two guards
// whose paths cross never come nearer than SEPARATION.min between centres, at a walk, a jog or a run, and both still get
// where they were going; held and downed guards push nobody; a guard upstairs is not in the way.

const MIN = SEPARATION.min;
const hyp = (x: number, z: number): number => Math.sqrt(x * x + z * z);

describe('separation.ts (pure)', () => {
  it('the spacing is a body apart: 0.6-0.7 m between centres', () => {
    expect(MIN).toBeGreaterThanOrEqual(0.6);
    expect(MIN).toBeLessThanOrEqual(0.7);
  });

  it('keepApart cuts a step into another guard at the circle; one already nearer may only move apart', () => {
    const o: SepOut = { x: 0, z: 0 };
    // walking straight at a man standing at (0, 0)
    expect(keepApart(-1, 0, -0.5, 0, 0, 0, o)).toBe(true);
    expect(hyp(o.x, o.z)).toBeCloseTo(MIN, 9);
    // a step clear of him is not touched
    expect(keepApart(-2, 0, -1.5, 0, 0, 0, o)).toBe(false);
    expect(o.x).toBe(-1.5);
    // already 0.4 m off (let go from a hold): not nearer, apart freely
    expect(keepApart(-0.4, 0, -0.3, 0, 0, 0, o)).toBe(true);
    expect(hyp(o.x, o.z)).toBeCloseTo(0.4, 9);
    expect(keepApart(-0.4, 0, -0.5, 0, 0, 0, o)).toBe(false);
  });

  it('two guards head on sidestep to opposite sides (no stall face to face)', () => {
    const a: SepOut = { x: 0, z: 0 };
    const b: SepOut = { x: 0, z: 0 };
    // A at (-1, 0) heading +x, B at (1, 0) heading -x, both at 1 m/s, dead on the same line
    steerOff(-1, 0, 1, 0, 1, 1, 0, a);
    steerOff(1, 0, -1, 0, 1, -1, 0, b);
    expect(Math.abs(a.z)).toBeGreaterThan(0.05);
    expect(Math.sign(a.z)).toBe(-Math.sign(b.z));
    // a guard behind him or standing still gets no sidestep
    const c: SepOut = { x: 0, z: 0 };
    steerOff(-1, 0, -1, 0, 1, 1, 0, c);
    expect(c.z).toBe(0);
  });

  it('held (taken) and downed guards are not solid; a guard on the floor above is not in the way', () => {
    const me: SepBody = { pos: { x: -1, y: 0, z: 0 }, solid: true };
    const held: SepBody = { pos: { x: 0, y: 0, z: 0 }, solid: false };
    const above: SepBody = { pos: { x: 0, y: 3.2, z: 0 }, solid: true };
    const o: SepOut = { x: 0, z: 0 };
    expect(stepApart(me, -0.2, 0, [me, held, above], o)).toBe(false);
    expect(o.x).toBe(-0.2);
    expect(tooClose(me, -0.2, 0, [me, held, above])).toBe(false);
  });

  it('a step boxed in by two guards is cut clear of both, or not taken', () => {
    const me: SepBody = { pos: { x: 0, y: 0, z: -0.8 }, solid: true };
    const l: SepBody = { pos: { x: -0.35, y: 0, z: 0 }, solid: true };
    const r: SepBody = { pos: { x: 0.35, y: 0, z: 0 }, solid: true };
    const o: SepOut = { x: 0, z: 0 };
    stepApart(me, 0, -0.1, [me, l, r], o);
    expect(tooClose(me, o.x, o.z, [me, l, r])).toBe(false);
    expect(hyp(o.x - l.pos.x, o.z - l.pos.z)).toBeGreaterThanOrEqual(MIN - 1e-6);
    expect(hyp(o.x - r.pos.x, o.z - r.pos.z)).toBeGreaterThanOrEqual(MIN - 1e-6);
  });

  // a simple walker: wanted velocity to the goal + steering, the step cut by stepApart (the Enemy.move order)
  function crossing(ax: number, az: number, agx: number, agz: number, bx: number, bz: number, bgx: number, bgz: number, speed: number): { min: number; arrived: boolean } {
    const A = { pos: { x: ax, y: 0, z: az }, solid: true, g: [agx, agz] as const };
    const B = { pos: { x: bx, y: 0, z: bz }, solid: true, g: [bgx, bgz] as const };
    const list = [A, B];
    const s: SepOut = { x: 0, z: 0 };
    const dt = 1 / 60;
    let min = Infinity;
    for (let i = 0; i < 60 * 30; i++) {
      for (const g of list) {
        const dx = g.g[0] - g.pos.x;
        const dz = g.g[1] - g.pos.z;
        const l = hyp(dx, dz);
        const sp = l > 0.05 ? Math.min(speed, l / dt) : 0;
        let vx = l > 0.05 ? (dx / l) * sp : 0;
        let vz = l > 0.05 ? (dz / l) * sp : 0;
        s.x = 0;
        s.z = 0;
        for (const o of list) if (o !== g) steerOff(g.pos.x, g.pos.z, l > 0.05 ? dx / l : 0, l > 0.05 ? dz / l : 0, sp, o.pos.x, o.pos.z, s);
        vx += s.x;
        vz += s.z;
        stepApart(g, g.pos.x + vx * dt, g.pos.z + vz * dt, list, s);
        g.pos.x = s.x;
        g.pos.z = s.z;
        min = Math.min(min, hyp(A.pos.x - B.pos.x, A.pos.z - B.pos.z));
      }
    }
    const arrived = hyp(A.pos.x - agx, A.pos.z - agz) < 0.3 && hyp(B.pos.x - bgx, B.pos.z - bgz) < 0.3;
    return { min, arrived };
  }

  for (const [name, sp] of [['walk', 1], ['jog (S19)', 2.4], ['run', 3.2]] as const) {
    it(`two guards whose paths cross never overlap (${name}, ${sp} m/s): head on, at right angles, overtaking`, () => {
      const head = crossing(-5, 0, 5, 0, 5, 0, -5, 0, sp);
      expect(head.min).toBeGreaterThanOrEqual(MIN - 1e-6);
      expect(head.arrived).toBe(true);
      const right = crossing(-5, 0, 5, 0, 0, -5, 0, 5, sp);
      expect(right.min).toBeGreaterThanOrEqual(MIN - 1e-6);
      expect(right.arrived).toBe(true);
      // the same line, B slower ahead: A goes round
      const past = crossing(-5, 0, 6, 0, -3, 0, -2, 0, sp);
      expect(past.min).toBeGreaterThanOrEqual(MIN - 1e-6);
    });
  }
});

// ----- on the real Enemy code: Enemy.move (the motion driver, the steering, the cut step, the nav step) -----

type Walker = { move(dt: number, goal: [number, number] | null, speed: number, face: number | null): void; pos: Vector3; taken: boolean; health: { alive: boolean }; readonly solid: boolean };

async function walkers(n: number, grid: NavGrid | null = null): Promise<{ list: Walker[]; make(x: number, z: number, y?: number): Walker }> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const { MotionDriver, emptyMotionInput } = await import('../src/anim/motion');
  const list: Walker[] = [];
  const nav = grid ?? { cellOf: () => 0, cellNear: () => 0, canStep: () => true, isWalkable: () => true, heightAt: (_x: number, _z: number, y: number) => y };
  const ctx = { nav, enemies: () => list, players: () => [] };
  void n;
  return {
    list,
    make(x: number, z: number, y = 0): Walker {
      const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
        health: { alive: true },
        taken: false,
        pos: new Vector3(x, y, z),
        vel: new Vector3(),
        desired: new Vector3(),
        tmp: new Vector3(),
        sepOut: { x: 0, z: 0 },
        motion: new MotionDriver(0),
        motionIn: emptyMotionInput(),
        navCell: 0,
        yaw: 0,
        target: null,
        def: { walkSpeed: 0.9, runSpeed: 3.2, kind: 'grunt', scale: 1, quadruped: false },
        ctx,
      }) as unknown as Walker;
      Object.defineProperty(e, 'aimedMotion', { value: false });
      list.push(e);
      return e;
    },
  };
}

function run(list: Walker[], goals: ([number, number] | null)[], speed: number, seconds: number): number {
  const dt = 1 / 60;
  let min = Infinity;
  for (let i = 0; i < seconds * 60; i++) {
    for (let k = 0; k < list.length; k++) {
      const e = list[k]!;
      if (!e.health.alive || e.taken) continue;
      const g = goals[k] ?? null;
      const there = !g || hyp(g[0] - e.pos.x, g[1] - e.pos.z) < 0.6;
      e.move(dt, there ? null : g, speed, null);
    }
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length; b++) {
        const A = list[a]!;
        const B = list[b]!;
        if (!A.health.alive || A.taken || !B.health.alive || B.taken || Math.abs(A.pos.y - B.pos.y) > SEPARATION.dy) continue;
        min = Math.min(min, hyp(A.pos.x - B.pos.x, A.pos.z - B.pos.z));
      }
    }
  }
  return min;
}

describe('Enemy.move: guards never walk through each other (G4)', () => {
  for (const [name, sp] of [['patrol walk', 0.99], ['jog (S19 rush)', 2.4], ['run', 3.2]] as const) {
    it(`two guards head on and two crossing at right angles keep SEPARATION.min and get there (${name})`, async () => {
      const w = await walkers(2);
      const a = w.make(-6, 0);
      const b = w.make(6, 0.02);
      const min = run(w.list, [[6, 0], [-6, 0]], sp, 25);
      expect(min).toBeGreaterThanOrEqual(MIN - 1e-6);
      expect(hyp(a.pos.x - 6, a.pos.z)).toBeLessThan(1);
      expect(hyp(b.pos.x + 6, b.pos.z)).toBeLessThan(1);
      const v = await walkers(2);
      const c = v.make(-6, 0);
      const d = v.make(0, -6);
      const min2 = run(v.list, [[6, 0], [0, 6]], sp, 25);
      expect(min2).toBeGreaterThanOrEqual(MIN - 1e-6);
      expect(hyp(c.pos.x - 6, c.pos.z)).toBeLessThan(1);
      expect(hyp(d.pos.x, d.pos.z - 6)).toBeLessThan(1);
    });
  }

  it('a guard walking through a standing pair (S10 talk, posts) goes round them; the pair keeps its spacing', async () => {
    const w = await walkers(3);
    w.make(0, -0.5);
    w.make(0, 0.5);
    const walker = w.make(-6, 0);
    const min = run(w.list, [null, null, [6, 0]], 2.4, 25);
    expect(min).toBeGreaterThanOrEqual(MIN - 1e-6);
    expect(hyp(walker.pos.x - 6, walker.pos.z)).toBeLessThan(1);
  });

  it('a held guard (takedown) and a downed guard push nobody: a walker is not cut by them', async () => {
    const w = await walkers(3);
    const held = w.make(0, 0);
    held.taken = true;
    const down = w.make(2, 0);
    down.health.alive = false;
    const walker = w.make(-3, 0);
    expect(held.solid).toBe(false);
    expect(down.solid).toBe(false);
    let near = Infinity;
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 6; i++) {
      walker.move(dt, [4, 0], 1, null);
      near = Math.min(near, hyp(walker.pos.x - held.pos.x, walker.pos.z - held.pos.z));
    }
    // he walked straight through the held man's spot (the operator holds him; the body is not a guard)
    expect(near).toBeLessThan(0.2);
  });

  it('a guard on the floor above is not in his way', async () => {
    const w = await walkers(2);
    w.make(0, 0, 3.2);
    const walker = w.make(-3, 0);
    let near = Infinity;
    for (let i = 0; i < 60 * 6; i++) {
      walker.move(1 / 60, [3, 0], 1, null);
      near = Math.min(near, hyp(walker.pos.x, walker.pos.z));
    }
    expect(near).toBeLessThan(0.2);
  });
});

// (guard-ai S20 check) Two guards face to face in a doorway or a narrow corridor cannot step round each other: the
// spacing alone held both there forever (on the S20 code: stuck about 0.65 m apart in a 1.2 m doorway and a 1.2 m
// corridor, walk and jog). Held by it with somewhere to go for SEPARATION.stall s, they squeeze past.
function doorway(gap: number): NavGrid {
  const h = gap / 2;
  const wall = (cz: number, hz: number): NavBlocker => ({ cx: 0, cz, hx: 0.1, hz, yaw: 0, bottom: 0, top: 3 });
  return new NavGrid({
    minX: -6, maxX: 6, minZ: -10, maxZ: 10, cell: 0.25,
    sample: () => ({ h: 0, ok: true }),
    blockers: [wall(-(10 + h) / 2, (10 - h) / 2), wall((10 + h) / 2, (10 - h) / 2)],
    agentRadius: 0.32, stepHeight: 0.45, seed: [-5, -5],
  });
}
function corridor(width: number): NavGrid {
  const wall = (cz: number): NavBlocker => ({ cx: 0, cz, hx: 6, hz: 0.1, yaw: 0, bottom: 0, top: 3 });
  return new NavGrid({
    minX: -6, maxX: 6, minZ: -3, maxZ: 3, cell: 0.25,
    sample: () => ({ h: 0, ok: true }),
    blockers: [wall(-width / 2 - 0.1), wall(width / 2 + 0.1)],
    agentRadius: 0.32, stepHeight: 0.45, seed: [-5, 0],
  });
}

describe('Enemy.move: two guards meeting in a doorway or a narrow corridor never wait forever (S20 check)', () => {
  for (const [name, grid] of [['a 1.2 m doorway', () => doorway(1.2)], ['a 0.9 m doorway', () => doorway(0.9)], ['a 1.2 m corridor', () => corridor(1.2)]] as const) {
    for (const sp of [0.99, 2.4]) {
      it(`head on through ${name} at ${sp} m/s: both get through, the squeeze is brief`, async () => {
        const w = await walkers(2, grid());
        const a = w.make(-4, 0);
        const b = w.make(4, 0.02);
        let near = 0;
        for (let i = 0; i < 60 * 30; i++) {
          a.move(1 / 60, Math.abs(a.pos.x - 4) < 0.6 ? null : [4, 0], sp, null);
          b.move(1 / 60, Math.abs(b.pos.x + 4) < 0.6 ? null : [-4, 0], sp, null);
          if (hyp(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < MIN - 1e-6) near++;
        }
        expect(a.pos.x).toBeGreaterThan(3);
        expect(b.pos.x).toBeLessThan(-3);
        // nearer than the spacing only while squeezing past (well under SEPARATION.squeeze x 2 guards)
        expect(near / 60).toBeLessThan(SEPARATION.squeeze * 2);
      });
    }
  }
});
