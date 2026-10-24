import { afterEach, describe, expect, it, vi } from 'vitest';
import { Enemy, type PlayerRef } from '../src/ai/enemy';
import { mayBeSeen, MAX_INTRUDERS, PERCEIVE, perceiveOrder } from '../src/ai/targetPick';
import { COOP4 } from '../src/ai/intruders';
import { wrapAngle } from '../src/player/playerController';
import { Vector3, type Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { NavGrid } from '../src/ai/navGrid';
import { DIFFICULTY } from '../src/ai/archetypes';
import { bytesPerCall, HEAP_NUMBER, sink } from './helpers/allocPerCall';

// (coop4 AI2, A181) Perception over 4 players: the real `Enemy.perceive` on a stand-in guard (the harness of
// tests/coopPerception.test.ts: Enemy's prototype, no rig, a stub ctx, a counted sight ray). At 3+ players a think
// casts at most `PERCEIVE.maxRays` (9) sight rays, the one who waits rotates; at 1-2 players perceive is today's
// exactly (index order, uncapped).

interface Pl {
  ref: PlayerRef;
  hidden: { chest: boolean; head: boolean; hips: boolean };
}

/** A player at (x, z): chest 1.25 m, head 1.6 m above the feet. */
function player(id: string, x: number, z: number, o: { light?: number; speed?: number; crouched?: boolean; hidden?: boolean; chest?: boolean; head?: boolean; hips?: boolean } = {}): Pl {
  const feet = new Vector3(x, 0, z);
  const target = {
    alive: true,
    team: 'player',
    aimPoint: (out: Vector3) => out.set(feet.x, feet.y + 1.25, feet.z),
    headPoint: (out: Vector3) => out.set(feet.x, feet.y + 1.6, feet.z),
  };
  const ref = { id, target, feet, speed: o.speed ?? 0, crouched: o.crouched ?? false, light: o.light } as unknown as PlayerRef;
  const h = o.hidden ?? false;
  return { ref, hidden: { chest: o.chest ?? h, head: o.head ?? h, hips: o.hips ?? h } };
}

/** The ray stub: blocked when it ends on a hidden body point. `who` logs the player each ray went to, at the call
 *  (perceive reuses its vectors, so the mock's recorded arguments are not read). */
function ballistics(pls: Pl[]) {
  const who: number[] = [];
  const ray = vi.fn((_from: Vector3, to: Vector3) => {
    who.push(pls.findIndex((p) => Math.abs(p.ref.feet.x - to.x) < 1e-6 && Math.abs(p.ref.feet.z - to.z) < 1e-6));
    for (const p of pls) {
      if (Math.abs(to.x - p.ref.feet.x) > 1e-6 || Math.abs(to.z - p.ref.feet.z) > 1e-6) continue;
      const dy = to.y - p.ref.feet.y;
      const part = Math.abs(dy - 1.25) < 1e-6 ? 'chest' : Math.abs(dy - 1.6) < 1e-6 ? 'head' : 'hips';
      if (p.hidden[part]) return { hit: true, distance: 0.5 };
    }
    return { hit: false, distance: 0 };
  });
  const clear = () => {
    who.length = 0;
    ray.mockClear();
  };
  return { ray, who, clear };
}

type Priv = {
  target: PlayerRef | null;
  los: boolean;
  losHead: boolean;
  dist: number;
  rate: number;
  smelled: boolean;
  lastKnown: Vector3;
  lastSeenT: number;
  sight: unknown;
  stimulus: [number, number];
  hasStimulus: boolean;
  meter: number;
  targetLight: number;
  perRR: number;
  perceive(): void;
};

/** A stand-in guard at the origin facing +z (yaw 0). */
function guard(pls: Pl[], o: { alerted?: boolean; yaw?: number; dog?: boolean; field?: number; hunt?: number; hid?: string } = {}) {
  const b = ballistics(pls);
  const list = pls.map((p) => p.ref);
  const ctx = {
    rooms: [],
    players: () => list,
    world: { lightField: { totalAt: vi.fn(() => o.field ?? 0.5) } },
    ballistics: b,
    diff: { perception: 1 },
    reportSighting: vi.fn(),
    bodies: () => [],
    intruderId: (s: number) => (s === (o.hunt ?? -1) ? (o.hid ?? '') : ''),
  };
  const e = Object.create(Enemy.prototype) as Enemy;
  Object.assign(e, {
    ctx,
    pos: new Vector3(0, 0, 0),
    yaw: o.yaw ?? 0,
    crouch: 0,
    def: { scale: 1, melee: null },
    dog: o.dog ? {} : null,
    aware: { alert: o.alerted ?? false, sensitivity: 1 },
    passive: false,
    buff: false,
    room: -1,
    hunt: o.hunt ?? -1,
    target: null,
    los: false,
    losHead: false,
    dist: 99,
    seenMask: 0,
    perRR: 0,
    raysThink: 0,
    raysStep: 0,
    rate: 0,
    smelled: false,
    meter: 0,
    lastKnown: new Vector3(),
    lastSeenT: 99,
    tmp: new Vector3(),
    tmpEye: new Vector3(),
    tmpHead: new Vector3(),
    tmpHips: new Vector3(),
    sight: { dist: 0, angle: 0, light: 1, crouched: false, speed: 0, exposure: 0, sensitivity: 1, pitch: 0 },
    stimulus: [0, 0],
    hasStimulus: false,
  });
  return { e, p: e as unknown as Priv, ctx, ray: b.ray, b };
}

/** Which players (by index) the rays since the last clear went to, in cast order (one entry per ray). */
function rayTargets(_pls: Pl[], b: ReturnType<typeof ballistics>): number[] {
  return b.who.slice();
}

const setFrom = (v: number) => ((COOP4 as { from: number }).from = v);
const setMax = (v: number) => ((PERCEIVE as { maxRays: number }).maxRays = v);

afterEach(() => {
  setFrom(3);
  setMax(9);
});

/** Four lit players in a calm guard's field, all fully visible (3 rays each if started). */
function fourInField() {
  return [player('a', -1, 5, { light: 1 }), player('b', 1, 7, { light: 1 }), player('c', -2, 9, { light: 1 }), player('d', 2, 11, { light: 1 })];
}

describe('coop4 AI2: rays per think with 4 players', () => {
  it('calm, 4 in his field: 9 rays a think (3 started); over 4 thinks each player is started 3 times', () => {
    const pls = fourInField();
    const { e, p, ray, b } = guard(pls);
    const started = [0, 0, 0, 0];
    for (let k = 0; k < 4; k++) {
      b.clear();
      // calm cur would always come first: reset it so the rotation alone decides (the brief's "each 3 in 4")
      p.target = null;
      p.perceive();
      expect(ray).toHaveBeenCalledTimes(9);
      expect(e.raysThink).toBe(9);
      const hit = new Set(rayTargets(pls, b));
      expect(hit.size).toBe(3);
      for (const i of hit) started[i]!++;
      // the one left out: rate 0, no sight bit
      for (let i = 0; i < 4; i++) if (!hit.has(i)) expect(e.seesIndex(i)).toBe(false);
      for (const i of hit) expect(e.seesIndex(i)).toBe(true);
    }
    expect(started).toEqual([3, 3, 3, 3]);
    expect((e as unknown as { raysStep: number }).raysStep).toBe(36);
  });

  it('calm with a target: his target is started every think, the other three share the rest', () => {
    const pls = fourInField();
    const { p, ray, b } = guard(pls);
    const started = [0, 0, 0, 0];
    p.perceive();
    const cur = pls.findIndex((x) => x.ref === p.target);
    expect(cur).toBeGreaterThanOrEqual(0);
    for (let k = 0; k < 12; k++) {
      b.clear();
      p.perceive();
      expect(ray.mock.calls.length).toBeLessThanOrEqual(PERCEIVE.maxRays);
      const hit = new Set(rayTargets(pls, b));
      for (const i of hit) started[i]!++;
      if (pls[cur]!.ref === p.target) expect(hit.has(cur)).toBe(true);
    }
    // nobody starves: every player started in at least half the thinks
    for (const s of started) expect(s).toBeGreaterThanOrEqual(6);
  });

  it('alerted, 4 players: 8 rays (chest and head each), never capped', () => {
    const pls = fourInField();
    const { e, p, ray, b } = guard(pls, { alerted: true });
    for (let k = 0; k < 4; k++) {
      b.clear();
      p.perceive();
      expect(ray).toHaveBeenCalledTimes(8);
      expect(e.raysThink).toBe(8);
      expect(new Set(rayTargets(pls, b)).size).toBe(4);
    }
  });

  it('his intruder\'s player is started right after his target (hunt first under the budget)', () => {
    const pls = fourInField();
    // hunt slot 2 belongs to the farthest player 'd' (index 3)
    const { p, b } = guard(pls, { hunt: 2, hid: 'd' });
    for (let k = 0; k < 4; k++) {
      b.clear();
      p.target = null;
      p.perceive();
      expect(rayTargets(pls, b).slice(0, 3)).toEqual([3, 3, 3]);
    }
  });

  it('a player he cannot see costs no ray: 3 in field + 1 behind him = all 3 in field started (9)', () => {
    const pls = [player('a', -1, 5, { light: 1 }), player('b', 1, 7, { light: 1 }), player('c', -2, 9, { light: 1 }), player('d', 0, -15, { light: 1 })];
    const { e, p, ray, b } = guard(pls);
    for (let k = 0; k < 4; k++) {
      b.clear();
      p.target = null;
      p.perceive();
      expect(ray).toHaveBeenCalledTimes(9);
      expect(new Set(rayTargets(pls, b))).toEqual(new Set([0, 1, 2]));
      expect(e.seesIndex(3)).toBe(false);
    }
  });

  it('a dead player is never started; 3 live calm players fit the budget exactly', () => {
    const pls = fourInField();
    (pls[1]!.ref.target as { alive: boolean }).alive = false;
    const { e, p, ray, b } = guard(pls);
    p.perceive();
    expect(ray).toHaveBeenCalledTimes(9);
    expect(rayTargets(pls, b)).not.toContain(1);
    expect(e.seesIndex(1)).toBe(false);
  });

  it('the undo: PERCEIVE.maxRays Infinity casts 12 rays for 4 calm players', () => {
    setMax(Infinity);
    const pls = fourInField();
    const { e, p, ray } = guard(pls);
    p.perceive();
    expect(ray).toHaveBeenCalledTimes(12);
    expect(e.raysThink).toBe(12);
  });
});

describe('coop4 AI2: 1-2 players are today exactly', () => {
  /** Today's ray order: each live player in index order, chest, head, then hips when calm, when `mayBeSeen`. */
  function expectedRays(pls: Pl[], alerted: boolean, yaw: number, dog: boolean): number[] {
    const out: number[] = [];
    for (let i = 0; i < pls.length; i++) {
      const r = pls[i]!.ref;
      if (!r.target.alive) continue;
      const d = Vector3.Distance(r.feet, Vector3.Zero());
      const a = wrapAngle(Math.atan2(r.feet.x, r.feet.z) - yaw);
      if (!mayBeSeen(d, a, r.speed, alerted, dog)) continue;
      out.push(i, i);
      if (!alerted) out.push(i);
    }
    return out;
  }

  it('2 players: the same rays in the same order, the same results, with the budget at 0 and with the gate off', () => {
    const spots: [number, number][] = [[0, 9], [3, 4], [-6, 14], [0.6, 1.2], [8, 2], [0, -15], [2, 22]];
    const bodies = [{ light: 1 }, { light: 0.2, crouched: true }, { speed: 1.5 }, { chest: true }, { hidden: true }, { speed: 4, light: 0.6 }];
    const guards = [{}, { alerted: true }, { dog: true }, { yaw: 0.7 }];
    let cases = 0;
    for (const g of guards) {
      for (let s = 0; s < spots.length; s++) {
        for (let b = 0; b < bodies.length; b++) {
          const [ax, az] = spots[s]!;
          const [bx, bz] = spots[(s + 3) % spots.length]!;
          const mk = () => [player('a', ax, az, bodies[b]!), player('b', bx, bz, bodies[(b + 2) % bodies.length]!)];
          const run = () => {
            const pls = mk();
            const r = guard(pls, g);
            r.p.perceive();
            r.p.perceive();
            return {
              rays: rayTargets(pls, r.b),
              target: r.p.target ? r.p.target.id : null,
              dist: r.p.dist,
              rate: r.p.rate,
              los: r.p.los,
              losHead: r.p.losHead,
              meter: r.p.meter,
              light: r.p.targetLight,
              lk: r.p.lastKnown.asArray(),
              stim: [r.p.stimulus[0], r.p.stimulus[1]],
              mask: [r.e.seesIndex(0), r.e.seesIndex(1)],
              think: r.e.raysThink,
              rr: r.p.perRR,
            };
          };
          const base = run();
          const pls = mk();
          const exp = expectedRays(pls, (g as { alerted?: boolean }).alerted ?? false, (g as { yaw?: number }).yaw ?? 0, (g as { dog?: boolean }).dog ?? false);
          expect(base.rays).toEqual([...exp, ...exp]);
          expect(base.think).toBeLessThanOrEqual(6);
          // the rotation counter never moves at 2 players
          expect(base.rr).toBe(0);
          // the budget is never read at 2 players
          setMax(0);
          expect(run()).toEqual(base);
          setMax(9);
          // the gate off (COOP4.from Infinity, the A170 undo): the same
          setFrom(Infinity);
          expect(run()).toEqual(base);
          setFrom(3);
          cases++;
        }
      }
    }
    expect(cases).toBe(168);
  });

  it('solo: the same with the budget at 0', () => {
    const pls = [player('a', 0, 9, { light: 1 })];
    const r = guard(pls);
    setMax(0);
    r.p.perceive();
    expect(r.ray).toHaveBeenCalledTimes(3);
    expect(r.e.raysThink).toBe(3);
  });
});

describe('coop4 AI2: EnemyManager.raysThisStep', () => {
  it('sums every guard\'s rays over one update and zeroes them; the next update starts at 0', async () => {
    const { EnemyManager } = await import('../src/ai/enemyManager');
    const world = { level: { lights: { lights: [] }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
    const nav = { version: 0, walk: new Uint8Array(4), cols: 2, rows: 2 };
    const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
    // a down guard stand-in: only what the update's loops read
    const fake = (rays: number) => ({
      alive: false,
      def: { kind: 'guard', melee: null },
      dog: null,
      pos: new Vector3(),
      hunt: -1,
      raysStep: 0,
      update(this: { raysStep: number }) {
        this.raysStep += rays;
      },
      frame() {},
      setRole() {},
      dispose() {},
    });
    const a = fake(9);
    const b = fake(8);
    (em.enemies as unknown[]).push(a, b);
    em.update(1 / 60);
    expect(em.raysThisStep).toBe(17);
    expect(a.raysStep).toBe(0);
    expect(b.raysStep).toBe(0);
    em.enemies.length = 0;
    em.update(1 / 60);
    expect(em.raysThisStep).toBe(0);
  });
});

describe('coop4 AI2: perceiveOrder allocates nothing', () => {
  it('bytes per call <= one HeapNumber', async () => {
    const out = new Int8Array(MAX_INTRUDERS);
    const dist = Float64Array.from([4, 9, 6, 12]);
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) sink[0]! += perceiveOrder(4, k & 3, -1, dist, k, out);
    }, HEAP_NUMBER);
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
  });
});
