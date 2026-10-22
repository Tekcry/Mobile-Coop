import { describe, expect, it, vi } from 'vitest';
import { HEARING, WALL_FACTOR, ambientDb, dbFactor, effectiveReach, hearTier, pickNearest, wallMatters, type NoisySource } from '../src/ai/hearing';
import { MUFFLE } from '../src/config/noise';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { Vector3, type Scene } from '../src/core/babylon';
import type { Enemy } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S1) hearing by range with walls and masking (design section 2): the pure maths, then EnemyManager's routing
// (one guard sent, the rest turn) on stand-in guards.

describe('hearing maths', () => {
  it('quiet place, no wall: the effective reach is the reach (the old rule: d < reach hears)', () => {
    expect(effectiveReach(15, 0, 0)).toBe(15);
    for (const d of [0, 3, 7.4, 14.9]) expect(hearTier(d, effectiveReach(15, 0, 0), false)).toBeGreaterThan(0);
    expect(hearTier(15, 15, false)).toBe(0);
    expect(hearTier(20, 15, false)).toBe(0);
  });
  it('one wall keeps 0.45 of the reach (the old MUFFLE, within 1%)', () => {
    expect(Math.abs(effectiveReach(10, 1, 0) / 10 - MUFFLE) / MUFFLE).toBeLessThan(0.01);
    expect(Math.abs(WALL_FACTOR - MUFFLE) / MUFFLE).toBeLessThan(0.01);
    // two walls: 0.45 squared
    expect(effectiveReach(10, 2, 0)).toBeCloseTo(10 * WALL_FACTOR * WALL_FACTOR, 6);
  });
  it('ambient masking: 6 dB halves the reach, 12 dB quarters it', () => {
    expect(effectiveReach(16, 0, 6) / 16).toBeCloseTo(0.5, 2);
    expect(effectiveReach(16, 0, 12) / 16).toBeCloseTo(0.25, 2);
    expect(dbFactor(0)).toBe(1);
  });
  it('ambientDb: linear fade to 0 at the radius, the loudest source wins, 3D only with both heights', () => {
    const gen: NoisySource = { id: 'gen', x: 0, z: 0, radius: 8, db: 12 };
    const vent: NoisySource = { id: 'vent', x: 10, z: 0, radius: 4, db: 6 };
    expect(ambientDb([], 0, 0)).toBe(0);
    expect(ambientDb([gen], 0, 0)).toBe(12);
    expect(ambientDb([gen], 4, 0)).toBeCloseTo(6, 6);
    expect(ambientDb([gen], 8, 0)).toBe(0);
    expect(ambientDb([gen], 20, 0)).toBe(0);
    // at x 7: generator 1.5 dB, vent 6 * (1 - 3/4) = 1.5 dB; at x 9: generator 0, vent 4.5
    expect(ambientDb([gen, vent], 9, 0)).toBeCloseTo(4.5, 6);
    expect(ambientDb([gen, vent], 2, 0)).toBeCloseTo(9, 6);
    const high: NoisySource = { ...gen, y: 6 };
    expect(ambientDb([high], 0, 0)).toBe(12);
    expect(ambientDb([high], 0, 0, 0)).toBeCloseTo(12 * (1 - 6 / 8), 6);
  });
  it('a guard by a 12 dB generator does not hear a footstep at 3 m (a 4 m step: reach 1 m there)', () => {
    const gen: NoisySource = { id: 'gen', x: 0, z: 0, radius: 8, db: 12 };
    const r = effectiveReach(4, 0, ambientDb([gen], 0, 0));
    expect(r).toBeCloseTo(1, 1);
    expect(hearTier(3, r, false)).toBe(0);
  });
  it('tiers at their boundaries: turn inside the reach, investigate inside half, combat (loud only) inside a quarter', () => {
    const R = 20;
    const half = R * dbFactor(HEARING.investigateDb);
    const quarter = R * dbFactor(HEARING.combatDb);
    expect(half).toBeCloseTo(R * 0.501, 2);
    expect(quarter).toBeCloseTo(R * 0.251, 2);
    expect(hearTier(R, R, false)).toBe(0);
    expect(hearTier(R - 1e-6, R, false)).toBe(1);
    expect(hearTier(half, R, false)).toBe(1);
    expect(hearTier(half - 1e-6, R, false)).toBe(2);
    expect(hearTier(0, R, false)).toBe(2);
    // never combat for a quiet noise
    expect(hearTier(quarter - 1, R, false)).toBe(2);
    // loud: combat only inside a quarter of the effective reach
    expect(hearTier(quarter - 1e-6, R, true)).toBe(3);
    expect(hearTier(quarter, R, true)).toBe(2);
    expect(hearTier(half, R, true)).toBe(1);
    expect(hearTier(R, R, true)).toBe(0);
  });
  it('a shot through a wall 20 m off sends nobody to combat; through two walls nobody hears it at all', () => {
    expect(hearTier(20, effectiveReach(28, 1, 0), true)).toBe(0);
    expect(hearTier(20, effectiveReach(28, 2, 0), true)).toBe(0);
    // in the open at 20 m: turn only; at 6 m behind one wall: investigate, not combat
    expect(hearTier(20, 28, true)).toBe(1);
    expect(hearTier(6, effectiveReach(28, 1, 0), true)).toBe(2);
    expect(hearTier(6, 28, true)).toBe(3);
  });
  it('wallMatters: the ray is cast only where one wall could change the tier', () => {
    expect(wallMatters(1, 20, false)).toBe(false);
    expect(wallMatters(5, 20, false)).toBe(true);
    expect(wallMatters(19, 20, false)).toBe(true);
    expect(wallMatters(25, 20, false)).toBe(false);
    expect(wallMatters(1, 28, true)).toBe(false);
    expect(wallMatters(5, 28, true)).toBe(true);
  });
  it('pickNearest: the nearest hearer by straight distance, ties to the lower index, -1 with none', () => {
    const xs = new Float32Array([0, 5, 3, -3, 9]);
    const zs = new Float32Array([0, 0, 0, 0, 9]);
    const h = new Int16Array([1, 3, 2, 4]);
    expect(pickNearest(h, 0, xs, zs, 0, 0)).toBe(-1);
    expect(pickNearest(h, 4, xs, zs, 0, 0)).toBe(2);
    expect(pickNearest(h, 2, xs, zs, 0, 0)).toBe(3);
    // 2 and 3 both 3 m off: the lower index
    expect(pickNearest(new Int16Array([3, 2]), 2, xs, zs, 0, 0)).toBe(2);
  });
});

// ----- EnemyManager routing on stand-in guards -----

interface FakeGuard {
  id: string;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  def: { melee: object | null };
  pos: Vector3;
  hear: ReturnType<typeof vi.fn>;
  hearTurn: ReturnType<typeof vi.fn>;
  hearGunfire: ReturnType<typeof vi.fn>;
}

let n = 0;
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  return { id: `h${n++}`, alive: true, alerted: false, passive: false, def: { melee: null }, pos: new Vector3(x, 0, z), hear: vi.fn(), hearTurn: vi.fn(), hearGunfire: vi.fn(), ...o };
}

/** A manager with stub world / nav; `wall(x, z)`: a wall between the noise and a listener standing there. */
function manager(wall: (x: number, z: number) => boolean = () => false) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1) };
  const clear = vi.fn((_a: Vector3, b: Vector3) => !wall(b.x, b.z));
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  return { em, clear };
}

function cast(em: EnemyManager, gs: FakeGuard[]): void {
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
}

describe('EnemyManager.hear (coordinated)', () => {
  it('of 5 guards in reach of a bottle (15 m), only the nearest inside half the reach is sent; the rest turn', () => {
    const { em } = manager();
    const gs = [guard(6, 0), guard(0, 3), guard(-5, 0), guard(0, -9), guard(12, 0)];
    cast(em, gs);
    em.hear(new Vector3(0, 0, 0), 15);
    expect(gs[1]!.hear).toHaveBeenCalledTimes(1);
    expect(gs[1]!.hearTurn).not.toHaveBeenCalled();
    for (const k of [0, 2, 3, 4]) {
      expect(gs[k]!.hear).not.toHaveBeenCalled();
      expect(gs[k]!.hearTurn).toHaveBeenCalledTimes(1);
    }
    // the investigator's call carries the effective reach (quiet, open: the reach)
    expect(gs[1]!.hear.mock.calls[0]).toEqual([0, 0, 15]);
  });
  it('nobody inside half the reach: everyone only turns (no one walks over)', () => {
    const { em } = manager();
    const gs = [guard(9, 0), guard(0, 12)];
    cast(em, gs);
    em.hear(new Vector3(0, 0, 0), 15);
    for (const g of gs) {
      expect(g.hear).not.toHaveBeenCalled();
      expect(g.hearTurn).toHaveBeenCalledTimes(1);
    }
  });
  it('a wall cuts the reach to 0.45: behind it at 8 m of a 15 m noise, nothing; the ray only near a threshold', () => {
    const { em, clear } = manager((x) => x > 0);
    const behind = guard(8, 0);
    const near = guard(1, 0);
    const open = guard(-5, 0);
    cast(em, [behind, near, open]);
    em.hear(new Vector3(0, 0, 0), 15);
    expect(behind.hear).not.toHaveBeenCalled();
    expect(behind.hearTurn).not.toHaveBeenCalled();
    // 1 m behind the wall: still inside 0.45 x half the reach, the wall changes nothing and no ray is cast for him
    expect(near.hear).toHaveBeenCalledTimes(1);
    expect(open.hearTurn).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(2);
  });
  it('a guard by a 12 dB generator does not hear a footstep 3 m off; one away from it does', () => {
    const { em } = manager();
    em.setNoisy([{ id: 'gen', x: 20, z: 0, radius: 8, db: 12 }]);
    const deaf = guard(20, 3);
    const quiet = guard(0, 3);
    cast(em, [deaf, quiet]);
    em.hear(new Vector3(20, 0, 0), 4);
    em.hear(new Vector3(0, 0, 0), 4);
    expect(deaf.hear).not.toHaveBeenCalled();
    expect(deaf.hearTurn).not.toHaveBeenCalled();
    expect(quiet.hearTurn).toHaveBeenCalledTimes(1);
  });
  it('alerted, dead and passive guards are skipped; melee guards keep their own rule (they hear in reach)', () => {
    const { em } = manager();
    const dog = guard(10, 0, { def: { melee: {} } });
    const passive = guard(0.5, 0, { passive: true });
    const gs = [guard(1, 0, { alerted: true }), guard(1, 0, { alive: false }), passive, dog, guard(2, 0)];
    cast(em, gs);
    em.hear(new Vector3(0, 0, 0), 15);
    expect(gs[0]!.hear).not.toHaveBeenCalled();
    expect(gs[1]!.hear).not.toHaveBeenCalled();
    expect(passive.hear).not.toHaveBeenCalled();
    expect(passive.hearTurn).not.toHaveBeenCalled();
    expect(dog.hear).toHaveBeenCalledTimes(1);
    expect(gs[4]!.hear).toHaveBeenCalledTimes(1);
  });
  it('uncoordinated (parked modes): everyone in reach hears and walks over', () => {
    const { em } = manager();
    em.coordinated = false;
    const gs = [guard(6, 0), guard(0, 3), guard(12, 0)];
    cast(em, gs);
    em.hear(new Vector3(0, 0, 0), 15);
    for (const g of gs) {
      expect(g.hear).toHaveBeenCalledTimes(1);
      expect(g.hearTurn).not.toHaveBeenCalled();
    }
  });
});

describe('EnemyManager.noise (gunfire, coordinated)', () => {
  it('combat only inside a quarter of the reach; the nearest inside half is sent; the rest turn; LKP set', () => {
    const { em } = manager();
    const close = guard(5, 0);
    const mid = guard(0, 10);
    const mid2 = guard(-12, 0);
    const far = guard(0, -20);
    cast(em, [close, mid, mid2, far]);
    em.noise(new Vector3(0, 0, 0), 28);
    expect(close.hearGunfire).toHaveBeenCalledTimes(1);
    expect(mid.hear).toHaveBeenCalledTimes(1);
    expect(mid.hearGunfire).not.toHaveBeenCalled();
    expect(mid2.hearTurn).toHaveBeenCalledTimes(1);
    expect(far.hearTurn).toHaveBeenCalledTimes(1);
    expect(far.hearGunfire).not.toHaveBeenCalled();
    expect(em.lkpValid).toBe(true);
  });
  it('a shot behind a wall 20 m off sends nobody to combat and sets no LKP', () => {
    const { em } = manager(() => true);
    const gs = [guard(20, 0), guard(0, 20), guard(-14, 14)];
    cast(em, gs);
    em.noise(new Vector3(0, 0, 0), 28);
    for (const g of gs) {
      expect(g.hearGunfire).not.toHaveBeenCalled();
      expect(g.hear).not.toHaveBeenCalled();
    }
    expect(em.lkpValid).toBe(false);
  });
  it('only turning guards: no LKP; a guard already fighting locates the shot from anywhere in reach', () => {
    const { em } = manager();
    const turner = guard(20, 0);
    cast(em, [turner]);
    em.noise(new Vector3(0, 0, 0), 28);
    expect(turner.hearTurn).toHaveBeenCalledTimes(1);
    expect(em.lkpValid).toBe(false);
    const fighter = guard(0, 22, { alerted: true });
    cast(em, [fighter]);
    em.noise(new Vector3(0, 0, 0), 28);
    expect(fighter.hearGunfire).toHaveBeenCalledTimes(1);
    expect(em.lkpValid).toBe(true);
  });
  it('uncoordinated: everyone within the reach goes to combat, walls or not (the old rule)', () => {
    const { em } = manager(() => true);
    em.coordinated = false;
    const gs = [guard(20, 0), guard(0, 27)];
    cast(em, gs);
    em.noise(new Vector3(0, 0, 0), 28);
    for (const g of gs) expect(g.hearGunfire).toHaveBeenCalledTimes(1);
    expect(em.lkpValid).toBe(true);
  });
});
