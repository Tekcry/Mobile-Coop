import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import type { Enemy, PlayerRef } from '../src/ai/enemy';
import type { NavGrid } from '../src/ai/navGrid';
import { DIFFICULTY } from '../src/ai/archetypes';
import { Vector3, type Scene } from '../src/core/babylon';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { World } from '../src/world/world';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';
import type { PatrolRoute } from '../src/ai/patrol';
import { RISE_SIGHT } from '../src/ai/enemy';
import { asEnemy, sweepGuard } from './helpers/sweepGuard';
import { SCENE_SWEEP, wrapAng } from '../src/ai/sceneSweep';
import { steerFrom } from '../src/ai/separation';
import { hyp2 } from '../src/core/mathx';

// (guard-ai-alloc D2) The manager's 0.5 s tick (the flow field's goals, the flanker's held-cover check) and the
// `searchSlot` callback (per search ring point) run index loops into kept buffers: no closures, iterators or arrays.

type FakePlayer = { id: string; target: { alive: boolean }; feet: Vector3; speed: number; crouched: boolean; cover: object | null; coverT: number };
const player = (id: string, x: number, y: number, z: number, alive = true): FakePlayer => ({ id, target: { alive }, feet: new Vector3(x, y, z), speed: 0, crouched: false, cover: null, coverT: 0 });

function manager(ps: FakePlayer[]) {
  const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const calls: { goals: unknown; pts: number[][]; ys: number[] }[] = [];
  const nav = {
    walk: new Uint8Array(4),
    version: 0,
    nearestWalkable: vi.fn(() => -1),
    lineClear: vi.fn(() => true),
    findPath: vi.fn(() => null),
    heightAt: vi.fn(() => 0),
    flowField: (goals: [number, number][], out: Float32Array, ys: number[]) => {
      calls.push({ goals, pts: goals.map((g) => [g[0], g[1]]), ys: ys.slice() });
      return out;
    },
  };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, {} as Ballistics, {} as Vfx, DIFFICULTY.normal, () => ps as unknown as readonly PlayerRef[]);
  em.stealth = false;
  const p = em as unknown as { refreshFlow(): void; assignFlanker(): void; ctx: { searchSlot(e: Enemy): number } };
  return { em, p, calls, nav };
}

describe('guard-ai-alloc D2: the flow field goals', () => {
  it('passes the live players in order, with their heights, from kept buffers', () => {
    const ps = [player('a', 1, 0, 2), player('b', 3, 4, 5, false), player('c', 6, 7, 8)];
    const m = manager(ps);
    m.calls.length = 0;
    m.p.refreshFlow();
    ps[0]!.feet.set(9, 1, 9);
    ps[1]!.target.alive = true;
    m.p.refreshFlow();
    ps[0]!.target.alive = false;
    ps[1]!.target.alive = false;
    ps[2]!.target.alive = false;
    m.p.refreshFlow();
    expect(m.calls.length).toBe(2);
    expect(m.calls[0]!.pts).toEqual([
      [1, 2],
      [6, 8],
    ]);
    expect(m.calls[0]!.ys).toEqual([0, 7]);
    expect(m.calls[1]!.pts).toEqual([
      [9, 9],
      [3, 5],
      [6, 8],
    ]);
    expect(m.calls[1]!.ys).toEqual([1, 4, 7]);
    // the same goals array both times
    expect(m.calls[0]!.goals).toBe(m.calls[1]!.goals);
  });

  it('allocates nothing per refresh once its buffers are made', async () => {
    const ps = [player('a', 1, 0, 2), player('b', 3, 4, 5)];
    const m = manager(ps);
    (m.nav as { flowField: unknown }).flowField = (_g: unknown, out: Float32Array) => out;
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) m.p.refreshFlow();
    }, 0);
    expect(per).toBeLessThan(16);
  });
});

describe('guard-ai piano GA6b: the scene sweep', () => {
  /** Four real-class guards on two sweep pairs, placed in the dark (`sceneDark` before `placeSlot`). */
  function sweepers() {
    const m = manager([]);
    const em = m.em;
    const list = em.enemies as Enemy[];
    em.sceneDark = true;
    const routes: PatrolRoute[] = [0, 0.7, 5, 5.7].map((z) => ({ points: [[0, z], [8, z]], waits: [3, 3] }));
    const slots = routes.map((r, i) => ({ kind: 'grunt' as const, x: 0, z: r.points[0]![1], yaw: Math.PI / 2, pair: i ^ 1 }));
    const gs = routes.map((r, i) => sweepGuard(list, 0, slots[i]!.z, -Math.PI / 2, r));
    const quiet = (): void => {};
    for (const g of gs) {
      (g as unknown as { bark: () => void }).bark = quiet;
      list.push(asEnemy(g));
    }
    for (let i = 0; i < gs.length; i++) em.placeSlot(asEnemy(gs[i]!), slots[i]!, 0, slots, i);
    return { em, list, gs };
  }

  // The sweep walker's step reads as boxed doubles only (V8 boxes a double passed across a call it does not inline,
  // `HEAP_NUMBER`): about 2.5 per guard step here (the walker off the scene: 1.5), never an object (an object is 48 B
  // or more: a single one per guard step would break the bound). The partner skip and the follow: at most one boxed double.
  it('600 steps of 4 sweeping guards (pans, the walk, the partner skip, a glimpse follow, a rejoin) make no object', async () => {
    const { em, list, gs } = sweepers();
    expect(gs.every((g) => g.sweeping)).toBe(true);
    expect(em.pairs.length).toBe(2);
    const p = em as unknown as { glimpseFollow(): void };
    const DT = 1 / 60;
    const a = gs[0]!;
    const b = gs[1]!;
    const c = gs[2]!;
    const ctr = new Int32Array(1);
    const body = new Float64Array([-Math.PI / 2, -Math.PI / 2, -Math.PI / 2, -Math.PI / 2]);
    const sep = { x: 0, z: 0 };
    const ext = new Float64Array(2);
    const step = (): void => {
      const k = ctr[0]!;
      ctr[0] = k + 1;
      for (let i = 0; i < gs.length; i++) {
        const g = gs[i]!;
        const w = g.walker;
        w.tick(DT);
        // the sweep step with his body yaw (the N2 gate), the pan, the walk at the sweep pace
        const t = w.step(DT, g.pos.x, g.pos.z, body[i]!);
        if (t) {
          const dx = t[0] - g.pos.x;
          const dz = t[1] - g.pos.z;
          const d = hyp2(dx, dz);
          // the soft push with his partner skipped
          steerFrom(asEnemy(g), dx / d, dz / d, SCENE_SWEEP.pace, list, sep, g.sweepMate);
          const s = d < SCENE_SWEEP.pace * DT ? d : SCENE_SWEEP.pace * DT;
          g.pos.x += (dx / d) * s;
          g.pos.z += (dz / d) * s;
          body[i] = Math.atan2(dx, dz);
        } else {
          body[i] = w.lookYaw;
          const o = wrapAng(w.lookYaw - w.sweepPlan!.centre[w.idx]!);
          if (o < ext[0]!) ext[0] = o;
          if (o > ext[1]!) ext[1] = o;
        }
      }
      // the board tick: the glimpse follow
      if (k % 12 === 0) p.glimpseFollow();
      const ph = k % 600;
      if (ph === 200) {
        // a glimpse: his partner (0.7 m off) is sent to the spot at the next board tick
        a.riseN++;
        a.riseCause = RISE_SIGHT;
        a.aware.set('suspicious');
        a.stimulus[0] = 4;
        a.stimulus[1] = 2;
        a.hasStimulus = true;
      } else if (ph === 300) {
        a.aware.set('unaware');
        a.hasStimulus = false;
        b.hasStimulus = false;
        b.stimulus[0] = 0;
        // a rejoin (a calm return)
        c.walker.rejoin(c.pos.x, c.pos.z);
      }
    };
    const per = await bytesPerCall(
      (n) => {
        for (let k = 0; k < n; k++) step();
      },
      0,
      { n: 600, warm: 6000 },
    );
    expect(per).toBeLessThanOrEqual(4 * 3 * HEAP_NUMBER);
    // it ran: they walked their lanes, panned both ways, the partner was sent
    expect(gs.some((g) => g.pos.x > 1)).toBe(true);
    expect(ext[0]).toBeLessThan(-SCENE_SWEEP.panYaw + 0.01);
    expect(ext[1]).toBeGreaterThan(SCENE_SWEEP.panYaw - 0.01);
    expect(ctr[0]).toBeGreaterThan(6000);
  }, 60000);

  it('the partner skip (steerFrom with his mate) and the glimpse follow make no object', async () => {
    const { em, list, gs } = sweepers();
    const p = em as unknown as { glimpseFollow(): void };
    const g = gs[0]!;
    const sep = { x: 0, z: 0 };
    expect(g.sweepMate).toBe(asEnemy(gs[1]!));
    const per = await bytesPerCall(
      (n) => {
        for (let k = 0; k < n; k++) {
          steerFrom(asEnemy(g), 1, 0, SCENE_SWEEP.pace, list, sep, g.sweepMate);
          p.glimpseFollow();
        }
      },
      HEAP_NUMBER,
      { n: 600, warm: 6000 },
    );
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
  }, 60000);

  it("the calm decision on the sweep makes no object (boxed doubles only: the pan's face and the body yaw it reads)", async () => {
    const { gs } = sweepers();
    const g = gs[0]!;
    const DT = 1 / 60;
    const per = await bytesPerCall(
      (n) => {
        for (let k = 0; k < n; k++) {
          g.walker.tick(DT);
          g.calmDecide(DT);
        }
      },
      3 * HEAP_NUMBER,
      { n: 600, warm: 6000 },
    );
    expect(per).toBeLessThanOrEqual(3 * HEAP_NUMBER);
  }, 60000);
});

describe('guard-ai-alloc D2: the flanker check and the search slot', () => {
  it('picks a flanker only while a live player has held cover over 4 s', () => {
    const ps = [player('a', 0, 0, 0), player('b', 0, 0, 0)];
    const m = manager(ps);
    const g = { alive: true, alerted: true, def: { melee: null, usesCover: true }, hold: null, targetDist: 5 } as unknown as Enemy;
    m.em.enemies.push(g);
    m.p.assignFlanker();
    expect(m.em.flanker).toBeNull();
    ps[1]!.cover = {};
    ps[1]!.coverT = 4.5;
    ps[1]!.target.alive = false;
    m.p.assignFlanker();
    expect(m.em.flanker).toBeNull();
    ps[1]!.target.alive = true;
    m.p.assignFlanker();
    expect(m.em.flanker).toBe(g);
  });

  it('counts the searching guards numbered before him, and allocates nothing', async () => {
    const m = manager([]);
    const mk = (num: number, level: string, alive = true) => ({ num, level, alive }) as unknown as Enemy;
    const me = mk(5, 'searching');
    m.em.enemies.push(mk(1, 'searching'), mk(2, 'alert'), mk(3, 'searching', false), me, mk(4, 'searching'), mk(7, 'searching'));
    expect(m.p.ctx.searchSlot(me)).toBe(2);
    const ctx = m.p.ctx;
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) ctx.searchSlot(me);
    }, 0);
    expect(per).toBeLessThan(16);
  });
});
