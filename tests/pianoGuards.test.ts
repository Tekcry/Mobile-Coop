import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { BLACKOUT_SEARCH, ringPoint, SEARCH, SEARCH_BLACKOUT, SEARCH_PLAIN, searchSpec } from '../src/ai/response';
import { hyp2 } from '../src/core/mathx';
import { PatrolWalker, type PatrolRoute } from '../src/ai/patrol';
import { PACE, paceSpeed } from '../src/ai/response';
import { SCENE_SWEEP, rejoinStop, wrapAng } from '../src/ai/sceneSweep';
import { PAIRS } from '../src/ai/pairs';
import { SEPARATION } from '../src/ai/separation';
import { AlertMachine, emptyAlertInput } from '../src/ai/alertState';
import { ENEMIES } from '../src/ai/enemyDefs';
import { RISE_SIGHT, RISE_SOUND } from '../src/ai/enemy';
import { DUAL_WINDOW } from '../src/game/dualTakedown';
import { asEnemy, calmStep, sweepGuard, type SweepGuard } from './helpers/sweepGuard';
import type { Enemy } from '../src/ai/enemy';
import type { Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (piano escape GA1, GA3; docs/piano-escape/PLAN.md "Guard AI Build asks" on feature/piano-escape) The scene blackout:
// every guard who carries a torch has it on in every state (GA1), and the scene's one reaction is a ~6 m search round
// the intro wall by the guards it names (GA3). Off the scene (`sceneDark` false) nothing changes. Stand-in guards on
// the real class (no meshes), as tests/enemyManagerDespawn.test.ts.

function manager(level = 1) {
  const setOn = vi.fn();
  const torches = [
    { id: 'torch-0', kind: 'flashlight', x: 0, y: -50, z: 0, radius: 13, on: false },
    { id: 'torch-1', kind: 'flashlight', x: 0, y: -50, z: 0, radius: 13, on: false },
    { id: 'torch-2', kind: 'flashlight', x: 0, y: -50, z: 0, radius: 13, on: false },
  ];
  const world = {
    level: { lights: { lights: torches, setOn }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    // `level` everywhere (1: brightly lit, so the torch rule as built says no)
    lightField: { levelAt: () => level },
  };
  const em = new EnemyManager({} as Scene, world as unknown as World, { walk: new Uint8Array(4), heightAt: () => 0 } as unknown as NavGrid, {} as DamageRegistry, {} as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  return { em, world, setOn };
}

async function standIn(em: EnemyManager, kind: 'grunt' | 'officer' | 'dog', level: 'unaware' | 'searching' = 'unaware'): Promise<Enemy> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const ctx = (em as unknown as { ctx: unknown }).ctx;
  return Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    id: kind,
    health: { alive: true },
    def: ENEMIES[kind],
    aware: { level, calmNow: level === 'unaware' },
    caution: 0,
    los: false,
    taken: false,
    torchOverride: null,
    pos: { x: 0, y: 0, z: 0 },
    yaw: 0,
    crouch: 0,
    ctx,
    // (GA6b) `sceneDark = true` puts every guard on his sweep: a post at his spot
    walker: new PatrolWalker(null, 0, 0, 0),
    post: [0, 0],
    postYaw: 0,
    slotIdx: -1,
  });
}

const torchesOf = (em: EnemyManager) => (em as unknown as { torchOwner: (Enemy | null)[]; updateTorches(): void });

describe('GA1: torches on in every state during the scene blackout', () => {
  it('calm guards in a lit spot have none as built; with sceneDark every carrier takes one, a dog never', async () => {
    const { em } = manager(1);
    const grunt = await standIn(em, 'grunt');
    const officer = await standIn(em, 'officer');
    const dog = await standIn(em, 'dog');
    em.enemies.push(grunt, officer, dog);
    const t = torchesOf(em);
    t.updateTorches();
    expect(em.torchesOn).toBe(0);
    em.sceneDark = true;
    t.updateTorches();
    expect(t.torchOwner).toContain(grunt);
    expect(t.torchOwner).toContain(officer);
    expect(t.torchOwner).not.toContain(dog);
    expect(em.torchesOn).toBe(2);
    // the blackout over (the scene left): the rule as built releases them
    em.sceneDark = false;
    t.updateTorches();
    expect(em.torchesOn).toBe(0);
  });

  it('a guard held in a takedown or down drops his; the rule as built is untouched with sceneDark off', async () => {
    const { em } = manager(0);
    const a = await standIn(em, 'grunt');
    const b = await standIn(em, 'grunt');
    em.enemies.push(a, b);
    em.sceneDark = true;
    const t = torchesOf(em);
    t.updateTorches();
    expect(em.torchesOn).toBe(2);
    (a as unknown as { taken: boolean }).taken = true;
    (b as unknown as { health: { alive: boolean } }).health.alive = false;
    t.updateTorches();
    expect(em.torchesOn).toBe(0);
    // off: a calm guard in the pitch dark has none (the rule: only while looking for something)
    em.sceneDark = false;
    (a as unknown as { taken: boolean }).taken = false;
    t.updateTorches();
    expect(t.torchOwner).not.toContain(a);
    // and a searching one in the dark has his, as built
    const c = await standIn(em, 'grunt', 'searching');
    em.enemies.push(c);
    t.updateTorches();
    expect(t.torchOwner).toContain(c);
  });
});

describe('GA3: one blackout reaction', () => {
  it('the blackout search kind rings out to ~6 m with the plain length; the other kinds are unchanged', () => {
    const s = searchSpec(SEARCH_BLACKOUT);
    expect(SEARCH.length).toBe(4);
    expect(s.time).toBe(searchSpec(SEARCH_PLAIN).time);
    expect(s.max).toBe(BLACKOUT_SEARCH.max);
    expect(s.max).toBe(6);
    const p: [number, number] = [0, 0];
    for (let k = 0; k < 16; k++)
      for (let slot = 0; slot < 4; slot++) {
        ringPoint(5, 3, k, slot, s, p);
        expect(hyp2(p[0] - 5, p[1] - 3)).toBeLessThanOrEqual(6 + 1e-9);
      }
  });

  it('blackoutSearch starts the named guards searching round the point; the down, the alerted and the held are skipped', () => {
    const { em } = manager();
    const g = (o: Partial<{ alive: boolean; alerted: boolean; taken: boolean }> = {}) => ({ alive: true, alerted: false, taken: false, ...o, searchAt: vi.fn() });
    const ok1 = g();
    const ok2 = g();
    const down = g({ alive: false });
    const fighting = g({ alerted: true });
    const held = g({ taken: true });
    const list = [ok1, down, ok2, fighting, held] as unknown as Enemy[];
    expect(em.blackoutSearch(list, 4, -2)).toBe(2);
    expect(ok1.searchAt).toHaveBeenCalledWith(4, -2, null, SEARCH_BLACKOUT);
    expect(ok2.searchAt).toHaveBeenCalledWith(4, -2, null, SEARCH_BLACKOUT);
    for (const e of [down, fighting, held]) expect(e.searchAt).not.toHaveBeenCalled();
  });

  it("blackoutSearchSlots takes the live section's slot indices (the plan's mill:0-mill:3); an empty slot is skipped", () => {
    const { em } = manager();
    const g = () => ({ alive: true, alerted: false, taken: false, searchAt: vi.fn() });
    const s0 = g();
    const s2 = g();
    const s3 = g();
    (em as unknown as { slotGuard: unknown[] }).slotGuard.push(s0, null, s2, s3);
    expect(em.blackoutSearchSlots([0, 1, 2, 7], 5.5, 5.25)).toBe(2);
    expect(s0.searchAt).toHaveBeenCalledWith(5.5, 5.25, null, SEARCH_BLACKOUT);
    expect(s2.searchAt).toHaveBeenCalledWith(5.5, 5.25, null, SEARCH_BLACKOUT);
    expect(s3.searchAt).not.toHaveBeenCalled();
  });

  it('in a scene blackout a lights-out sends nobody (the scene reaction is the only one); off, the board runs as built', () => {
    const { em } = manager();
    const room = vi.fn();
    (em as unknown as { hearRoom: (n: number) => void }).hearRoom = room;
    em.sceneDark = true;
    em.lightsOut(1, 1);
    expect(room).not.toHaveBeenCalled();
    em.sceneDark = false;
    em.lightsOut(1, 1, 2.5);
    expect(room).toHaveBeenCalled();
  });
});

describe('GA7: rain masks hearing over the whole map', () => {
  it('a map-wide source gives its level at every listener, near and far, and halves the reach at 6 dB', async () => {
    const { ambientDb, effectiveReach, mapWideNoise } = await import('../src/ai/hearing');
    const rain = mapWideNoise('rain', 6);
    for (const [x, z] of [[0, 0], [40, -25], [-300, 900]] as const) expect(ambientDb([rain], x, z)).toBe(6);
    expect(effectiveReach(10, 0, ambientDb([rain], 12, 3))).toBeCloseTo(10 * 10 ** (-6 / 20), 9);
    expect(effectiveReach(10, 0, ambientDb([rain], 12, 3))).toBeCloseTo(5, 0);
    // a louder local source still wins where it is louder; the rain is the floor elsewhere
    const gen = { id: 'gen', x: 0, z: 0, radius: 10, db: 12 };
    expect(ambientDb([rain, gen], 1, 0)).toBeGreaterThan(6);
    expect(ambientDb([rain, gen], 30, 0)).toBe(6);
  });
});

// ----- (guard-ai piano GA6b + the PLAN's GA7) the slow methodical sweep wired into the real guards -----
// docs/guard-ai/slices/PIANO-GA6-PLAN.md sections 4-5 and 8 (F1, N2, N4, N5, N6). Guards on the real class
// (tests/helpers/sweepGuard.ts): the calm decision, the walk (motion driver, spacing), the level side effects.

const DT = 1 / 60;
const LANE: PatrolRoute = { points: [[0, 0], [6, 0]], waits: [3, 3] };
const lane = (z: number, x1 = 6): PatrolRoute => ({ points: [[0, z], [x1, z]], waits: [3, 3] });
type SweepSlot = { kind: 'grunt'; x: number; z: number; yaw: number; pair?: number };

interface MgrPriv {
  pairStep(dt: number): void;
  glimpseFollow(): void;
  report: ReturnType<typeof vi.fn>;
  missingCall: ReturnType<typeof vi.fn>;
}
const priv = (em: EnemyManager) => em as unknown as MgrPriv;

/** A manager for real-class guards, the board's missing path stubbed (the report and missingCall spies). */
function sweepManager(): { em: EnemyManager; list: Enemy[] } {
  const { em } = manager(0);
  const list = em.enemies as Enemy[];
  priv(em).report = vi.fn(() => 0);
  priv(em).missingCall = vi.fn();
  return { em, list };
}

/** Real-class guards on `routes`, placed in `order` through `placeSlot` (slot i: route i, the pair tags as given). */
function placeAll(em: EnemyManager, list: Enemy[], routes: PatrolRoute[], pairs: (number | undefined)[], order?: number[]): SweepGuard[] {
  const slots: SweepSlot[] = routes.map((r, i) => ({ kind: 'grunt', x: r.points[0]![0], z: r.points[0]![1], yaw: Math.PI / 2, pair: pairs[i] }));
  const gs = routes.map((r, i) => sweepGuard(list, slots[i]!.x, slots[i]!.z, Math.PI / 2, r));
  for (const g of gs) list.push(asEnemy(g));
  for (const i of order ?? gs.map((_, k) => k)) em.placeSlot(asEnemy(gs[i]!), slots[i]!, 0, slots, i);
  return gs;
}

const SIDE_A = (): PatrolRoute => ({ points: [[-29, -66.2], [-21, -66.2], [-21, -63.8], [-29, -63.8]], loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 } });
const SIDE_B = (): PatrolRoute => ({ points: [[-29, -65.2], [-21, -65.2], [-21, -62.8], [-29, -62.8]], loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 } });

describe('GA6b: off the scene nothing changes', () => {
  it('placed with sceneDark off: not swept, the patrol pace as built, a timed-loop pair is a talking pair', () => {
    const { em, list } = sweepManager();
    const [a, b] = placeAll(em, list, [SIDE_A(), SIDE_B()], [1, 0]);
    expect(a!.sweeping).toBe(false);
    expect(b!.sweeping).toBe(false);
    expect(a!.sweepMate).toBeNull();
    expect(em.pairs.length).toBe(1);
    expect(em.pairs[0]!.watchOnly).toBeUndefined();
    // a timed loop walks at his walk; an untimed route at the patrol pace
    a!.pos.x = -25;
    expect(a!.calmDecide(DT).speed).toBeCloseTo(ENEMIES.grunt.walkSpeed, 9);
    const c = sweepGuard([], 3, 0, 0, LANE);
    expect(c.calmDecide(DT).speed).toBeCloseTo(ENEMIES.grunt.walkSpeed * PACE.patrol, 9);
  });
});

describe('GA6b: the sweep on the real class', () => {
  it('sweep pace 0.7, capped at his walk; a calm investigation at the sweep pace; a rush and the search pace as built', () => {
    const g = sweepGuard([], 3, 0, 0, LANE);
    g.startSweep(0, 1);
    expect(g.sweeping).toBe(true);
    expect(g.calmDecide(DT).speed).toBeCloseTo(SCENE_SWEEP.pace, 9);
    g.def = { ...ENEMIES.grunt, walkSpeed: 0.5 };
    expect(g.calmDecide(DT).speed).toBeCloseTo(0.5, 9);
    g.def = ENEMIES.grunt;
    const walk = ENEMIES.grunt.walkSpeed;
    const run = ENEMIES.grunt.runSpeed;
    g.aware.set('investigating');
    g.stimulus[0] = 10;
    g.stimulus[1] = 0;
    g.hasStimulus = true;
    expect(g.calmDecide(DT).speed).toBeCloseTo(SCENE_SWEEP.pace, 9);
    g.rush = true;
    expect(g.calmDecide(DT).speed).toBeCloseTo(paceSpeed(true, PACE.investigate, walk, run), 9);
    g.rush = false;
    g.aware.set('searching');
    g.spotSet = true;
    g.spot[0] = 10;
    g.spot[1] = 5;
    expect(g.calmDecide(DT).speed).toBeCloseTo(walk * PACE.search, 9);
    // off the sweep: the investigate pace as built
    g.stopSweep();
    g.aware.set('investigating');
    expect(g.calmDecide(DT).speed).toBeCloseTo(walk * PACE.investigate, 9);
  });

  it('a pan stop drives the face: held at the lane end, the goal face is the walker look, left then right', () => {
    const g = sweepGuard([], 0, 0, -Math.PI / 2, LANE);
    g.startSweep(0, 1);
    const c = g.walker.sweepPlan!.centre[0]!;
    expect(c).toBeCloseTo(-Math.PI / 2, 9);
    const offs: number[] = [];
    for (let k = 0; k < Math.round(2.9 / DT); k++) {
      const goal = calmStep(g, DT);
      expect(goal.point).toBeNull();
      expect(goal.face).toBe(g.walker.lookYaw);
      offs.push(wrapAng(goal.face! - c));
    }
    const iMin = offs.indexOf(Math.min(...offs));
    const iMax = offs.indexOf(Math.max(...offs));
    expect(offs[iMin]).toBeLessThan(-SCENE_SWEEP.panYaw + 0.02);
    expect(offs[iMax]).toBeGreaterThan(SCENE_SWEEP.panYaw - 0.02);
    expect(iMin).toBeLessThan(iMax);
  });

  it('N2: at a lane end the body yaw reaches both pan extremes, lap after lap (5 laps), and leaves on schedule', () => {
    const g = sweepGuard([], 0, 0, -Math.PI / 2, LANE);
    g.startSweep(0, 1);
    const plan = g.walker.sweepPlan!;
    const holds: { idx: number; lo: number; hi: number }[] = [];
    const deps: [number, number][] = [];
    let held = false;
    for (let k = 0; k < Math.round((plan.period * 5 + 0.5) / DT); k++) {
      const i0 = g.walker.idx;
      const goal = calmStep(g, DT);
      const now = goal.point === null;
      if (now && !held) holds.push({ idx: g.walker.idx, lo: Infinity, hi: -Infinity });
      if (!now && held) deps.push([i0, g.walker.sweepTime()]);
      held = now;
      if (now) {
        const h = holds[holds.length - 1]!;
        const o = wrapAng(g.motion.yaw - plan.centre[h.idx]!);
        h.lo = Math.min(h.lo, o);
        h.hi = Math.max(h.hi, o);
      }
    }
    expect(deps.length).toBeGreaterThanOrEqual(10);
    for (let k = 0; k < deps.length; k++) {
      const h = holds[k]!;
      expect(h.lo).toBeLessThan(-SCENE_SWEEP.panYaw + 0.05);
      expect(h.hi).toBeGreaterThan(SCENE_SWEEP.panYaw - 0.05);
      // left on schedule (the hold ends at leave)
      const [i, t] = deps[k]!;
      let d = (t - plan.leave[i]!) % plan.period;
      if (d > plan.period / 2) d -= plan.period;
      if (d < -plan.period / 2) d += plan.period;
      expect(Math.abs(d)).toBeLessThan(2 * DT);
    }
  });

  it('a post on one spot face-pans 8 s each way between its two faces, never walking', () => {
    const post: PatrolRoute = { points: [[2, 3], [2, 3]], waits: [8, 8], faces: [0.3, 1.5] };
    const g = sweepGuard([], 2, 3, 1.5, post);
    g.startSweep(0, 1);
    const faceAt: number[] = [];
    for (let k = 0; k < Math.round(16 / DT); k++) {
      const goal = calmStep(g, DT);
      expect(goal.point).toBeNull();
      faceAt.push(goal.face!);
    }
    expect(faceAt[0]).toBeCloseTo(1.5, 1);
    expect(faceAt[Math.round(7.95 / DT)]).toBeCloseTo(0.3, 1);
    expect(faceAt[faceAt.length - 1]).toBeCloseTo(1.5, 1);
    expect(hyp2(g.pos.x - 2, g.pos.z - 3)).toBeLessThan(1e-9);
    // the body follows (0.15 rad/s, well under the calm turn)
    expect(Math.abs(wrapAng(g.motion.yaw - 1.5))).toBeLessThan(0.1);
  });
});

describe('GA6b: the manager', () => {
  it('sceneDark = true: the clock from 0, every placed guard swept, the talking pair cleared, partners and sides both ways', () => {
    const { em, list } = sweepManager();
    const [a, b, c] = placeAll(em, list, [SIDE_A(), SIDE_B(), lane(9)], [1, 0, undefined]);
    expect(em.pairs.length).toBe(1);
    em.sweepClock = 12;
    em.sceneDark = true;
    expect(em.sceneDark).toBe(true);
    expect(em.sweepClock).toBe(0);
    for (const g of [a!, b!, c!]) expect(g.sweeping).toBe(true);
    expect(a!.sweepMate).toBe(asEnemy(b!));
    expect(b!.sweepMate).toBe(asEnemy(a!));
    expect(c!.sweepMate).toBeNull();
    expect(a!.sweepSide).toBe(1);
    expect(b!.sweepSide).toBe(-1);
    // the talking pair is gone: the sweep pair's watch only
    expect(em.pairs.length).toBe(1);
    expect(em.pairs[0]!.watchOnly).toBe(true);
    expect(em.pairs[0]!.pm.def.watch).toBe(true);
    expect(em.pairs[0]!.pm.inWindow()).toBe(false);
  });

  it('placed while dark (N5): either order gives the partner and the side on both; no talking pair, no skip', () => {
    for (const order of [
      [0, 1],
      [1, 0],
    ]) {
      const { em, list } = sweepManager();
      em.sceneDark = true;
      const [a, b] = placeAll(em, list, [lane(0), lane(0.7)], [1, 0], order);
      expect(a!.sweepMate).toBe(asEnemy(b!));
      expect(b!.sweepMate).toBe(asEnemy(a!));
      expect([a!.sweepSide, b!.sweepSide]).toEqual([1, -1]);
      expect(a!.sweeping && b!.sweeping).toBe(true);
      expect(em.pairs.length).toBe(1);
      expect(em.pairs[0]!.watchOnly).toBe(true);
      expect(em.pairSkips.length).toBe(0);
    }
  });

  it('a re-set (a restart) runs the same clock: the sweep time after it is the one after the first set', () => {
    const { em, list } = sweepManager();
    em.sceneDark = true;
    const [a] = placeAll(em, list, [lane(0)], [undefined]);
    const t1 = a!.walker.sweepTime();
    a!.walker.tick(17.3);
    em.sweepClock = 17.3;
    expect(a!.walker.sweepTime()).not.toBeCloseTo(t1, 3);
    em.sceneDark = true;
    expect(em.sweepClock).toBe(0);
    expect(a!.walker.sweepTime()).toBeCloseTo(t1, 9);
  });

  it('F1: one of a sweep pair taken alone: the other is missing after PAIRS.notice (as built); both taken within DUAL_WINDOW: nothing; off the scene: unchanged', () => {
    const run = (em: EnemyManager, secs: number): void => {
      for (let k = 1; k <= Math.round(secs / PAIRS.tick); k++) priv(em).pairStep(PAIRS.tick);
    };
    // alone
    {
      const { em, list } = sweepManager();
      em.sceneDark = true;
      const [a, b] = placeAll(em, list, [lane(0), lane(0.7)], [1, 0]);
      run(em, 1);
      a!.taken = true;
      run(em, PAIRS.notice - 0.2);
      expect(priv(em).report).not.toHaveBeenCalled();
      run(em, 0.4);
      expect(priv(em).report).toHaveBeenCalledTimes(1);
      expect(priv(em).report.mock.calls[0]![0]).toBe('missing');
      expect(priv(em).missingCall.mock.calls[0]![0]).toBe(asEnemy(b!));
      expect(em.pairMisses).toBe(1);
    }
    // both within the dual window
    {
      const { em, list } = sweepManager();
      em.sceneDark = true;
      const [a, b] = placeAll(em, list, [lane(0), lane(0.7)], [1, 0]);
      run(em, 1);
      a!.taken = true;
      run(em, DUAL_WINDOW - 0.2);
      b!.taken = true;
      run(em, 10);
      expect(priv(em).report).not.toHaveBeenCalled();
      expect(em.pairMisses).toBe(0);
    }
    // off the scene: no timed loops, no pair (as built); one taken: nothing
    {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { em, list } = sweepManager();
      const [a] = placeAll(em, list, [lane(0), lane(0.7)], [1, 0]);
      expect(em.pairs.length).toBe(0);
      expect(em.pairSkips.length).toBe(1);
      run(em, 1);
      a!.taken = true;
      run(em, 10);
      expect(priv(em).report).not.toHaveBeenCalled();
      warn.mockRestore();
    }
  });

  it('N4: set true then false: off the sweep, the watch pairs gone, the walker as a never-swept one', () => {
    const r: PatrolRoute = { points: [[0, 0], [5, 0], [5, 5]], waits: [2, 1, 2] };
    const { em, list } = sweepManager();
    const [a, b] = placeAll(em, list, [r, lane(2)], [1, 0]);
    const twin = new PatrolWalker(r, 0, 0, Math.PI / 2, 0);
    em.sceneDark = true;
    expect(a!.sweeping).toBe(true);
    expect(em.pairs.some((p) => p.watchOnly)).toBe(true);
    a!.walker.tick(4);
    twin.tick(4);
    em.sceneDark = false;
    expect(em.sceneDark).toBe(false);
    expect(a!.sweeping || b!.sweeping).toBe(false);
    expect(a!.sweepMate).toBeNull();
    expect(em.pairs.some((p) => p.watchOnly)).toBe(false);
    twin.rejoin(a!.pos.x, a!.pos.z);
    // the same route rules step for step
    const pa: [number, number] = [a!.pos.x, a!.pos.z];
    const pt: [number, number] = [a!.pos.x, a!.pos.z];
    for (let k = 0; k < Math.round(60 / DT); k++) {
      a!.walker.tick(DT);
      twin.tick(DT);
      const ga = a!.walker.step(DT, pa[0], pa[1]);
      const gt = twin.step(DT, pt[0], pt[1]);
      expect(ga).toEqual(gt);
      expect(a!.walker.lookYaw).toEqual(twin.lookYaw);
      for (const [p, g] of [
        [pa, ga],
        [pt, gt],
      ] as const) {
        if (!g) continue;
        const d = hyp2(g[0] - p[0], g[1] - p[1]);
        const s = Math.min(d, 1.0 * DT);
        if (d > 1e-9) {
          p[0] += ((g[0] - p[0]) / d) * s;
          p[1] += ((g[1] - p[1]) / d) * s;
        }
      }
    }
  });

  it('blackoutSearchSlots, then calm: each rejoins his sweep at the soonest pan stop and is back in step with an undisturbed twin', () => {
    const { em, list } = sweepManager();
    em.sceneDark = true;
    const [a, b] = placeAll(em, list, [lane(0), lane(4)], [undefined, undefined]);
    expect(em.blackoutSearchSlots([0, 1], 3, 2)).toBe(2);
    expect(a!.searchAt).toHaveBeenCalledWith(3, 2, null, SEARCH_BLACKOUT);
    // the twins: swept at the same clock, never disturbed
    const ta = sweepGuard([], 0, 0, Math.PI / 2, lane(0));
    const tb = sweepGuard([], 0, 4, Math.PI / 2, lane(4));
    ta.startSweep(0, 1);
    tb.startSweep(0, 1);
    // the search: 20 s off the lanes (the walker clocks run on), then calm (onLevel's rejoin)
    for (const [g, x, z] of [
      [a!, 3, 2],
      [b!, 2.5, 6],
    ] as const) {
      g.pos.x = x;
      g.pos.z = z;
      g.walker.tick(20);
    }
    for (let k = 0; k < Math.round(20 / DT); k++) {
      calmStep(ta, DT);
      calmStep(tb, DT);
    }
    for (const g of [a!, b!]) {
      g.aware.set('searching');
      g.aware.set('unaware');
      g.onLevel('searching', 'unaware');
      const pl = g.walker.sweepPlan!;
      expect(g.walker.idx).toBe(rejoinStop(pl, g.pos.x, g.pos.z, g.walker.sweepTime()));
    }
    const plan = ta.walker.sweepPlan!;
    for (let k = 0; k < Math.round((plan.period * 2) / DT); k++) for (const g of [a!, b!, ta, tb]) calmStep(g, DT);
    expect(hyp2(a!.pos.x - ta.pos.x, a!.pos.z - ta.pos.z)).toBeLessThan(0.3);
    expect(hyp2(b!.pos.x - tb.pos.x, b!.pos.z - tb.pos.z)).toBeLessThan(0.3);
  });

  it('a sweep pair pans opposite ways at their shared stop', () => {
    const { em, list } = sweepManager();
    em.sceneDark = true;
    const [a, b] = placeAll(em, list, [lane(0), lane(1.1)], [1, 0]);
    for (const g of [a!, b!]) g.motion.reset(-Math.PI / 2);
    let lo = 0;
    let hi = 0;
    for (let k = 0; k < Math.round(1 / DT); k++) {
      calmStep(a!, DT);
      calmStep(b!, DT);
      const c = a!.walker.sweepPlan!.centre[0]!;
      lo = Math.min(lo, wrapAng(a!.walker.lookYaw - c));
      hi = Math.max(hi, wrapAng(b!.walker.lookYaw - c));
    }
    // by D/4 the lower slot has looked left, his partner right
    expect(lo).toBeLessThan(-SCENE_SWEEP.panYaw + 0.05);
    expect(hi).toBeGreaterThan(SCENE_SWEEP.panYaw - 0.05);
  });

  it('the soft push skips the partner (lanes 0.7 m apart hold); never under 0.65 m', () => {
    const lanes = (mate: boolean, rb: PatrolRoute): { min: number; maxDz: number } => {
      const { em, list } = sweepManager();
      em.sceneDark = true;
      const [a, b] = placeAll(em, list, [lane(0, 20), rb], mate ? [1, 0] : [undefined, undefined]);
      let min = Infinity;
      let maxDz = 0;
      for (let k = 0; k < Math.round(25 / DT); k++) {
        calmStep(a!, DT);
        calmStep(b!, DT);
        min = Math.min(min, hyp2(a!.pos.x - b!.pos.x, a!.pos.z - b!.pos.z));
        maxDz = Math.max(maxDz, Math.abs(a!.pos.z - b!.pos.z));
      }
      return { min, maxDz };
    };
    const skip = lanes(true, lane(0.7, 20));
    expect(skip.maxDz).toBeLessThan(0.75);
    expect(skip.min).toBeGreaterThanOrEqual(SEPARATION.min - 1e-6);
    // not partners: the soft push shoves them apart
    expect(lanes(false, lane(0.7, 20)).maxDz).toBeGreaterThan(0.85);
    // a partner's lane closing on his: the 0.65 m floor still holds
    const close = lanes(true, { points: [[0, 0.7], [20, 0]], waits: [3, 3] });
    expect(close.min).toBeGreaterThanOrEqual(SEPARATION.min - 1e-6);
  });
});

describe("GA7 (the PLAN's): a player seen in a flash", () => {
  it('a lit sighting: suspicious faces the spot, investigates at the sweep pace, seen again alert, not seen back on his sweep', () => {
    const g = sweepGuard([], 3, 0, 0, LANE);
    g.startSweep(0, 1);
    g.stimulus[0] = 6;
    g.stimulus[1] = 4;
    g.hasStimulus = true;
    g.aware.set('suspicious');
    const s = g.calmDecide(DT);
    expect(s.point).toBeNull();
    expect(s.face).toBeCloseTo(Math.atan2(3, 4), 9);
    g.aware.set('investigating');
    expect(g.calmDecide(DT).speed).toBeCloseTo(SCENE_SWEEP.pace, 9);
    // seen again: alert (the machine as built)
    const m = new AlertMachine();
    m.set('investigating');
    const i = emptyAlertInput();
    i.meter = 1;
    i.seeing = true;
    m.step(DT, i);
    expect(m.level).toBe('alert');
    // not seen: calm, back on his sweep at the soonest pan stop
    g.pos.x = 5;
    g.pos.z = 3;
    g.aware.set('cooldown');
    g.onLevel('investigating', 'cooldown');
    expect(g.sweeping).toBe(true);
    expect(g.walker.idx).toBe(rejoinStop(g.walker.sweepPlan!, 5, 3, g.walker.sweepTime()));
  });

  it('the partner within 4 m follows the spot with one line (N6); 6 m away, a sound rise or a busy partner: nobody', () => {
    const setup = (dz: number) => {
      const { em, list } = sweepManager();
      em.sceneDark = true;
      const [a, b] = placeAll(em, list, [lane(0), lane(dz)], [1, 0]);
      return { em, a: a!, b: b! };
    };
    const glimpse = (a: SweepGuard, cause = RISE_SIGHT) => {
      a.aware.set('suspicious');
      a.riseN++;
      a.riseCause = cause;
      a.stimulus[0] = 5;
      a.stimulus[1] = 5;
      a.hasStimulus = true;
    };
    {
      const { em, a, b } = setup(3);
      glimpse(a);
      priv(em).glimpseFollow();
      expect(b.hasStimulus).toBe(true);
      expect([b.stimX, b.stimZ]).toEqual([5, 5]);
      expect(b.bark).toHaveBeenCalledTimes(1);
      expect(b.bark).toHaveBeenCalledWith('checking');
      // his rise to look (the send's `heard`) says nothing more
      b.aware.set('suspicious');
      b.onLevel('unaware', 'suspicious');
      b.aware.set('investigating');
      b.onLevel('suspicious', 'investigating');
      expect(b.bark).toHaveBeenCalledTimes(1);
      // the same rise again: no second send
      priv(em).glimpseFollow();
      expect(b.bark).toHaveBeenCalledTimes(1);
      // a later rise of his own barks as built
      b.aware.set('cooldown');
      b.onLevel('investigating', 'cooldown');
      b.bark.mockClear();
      b.aware.set('suspicious');
      b.onLevel('cooldown', 'suspicious');
      expect(b.bark).toHaveBeenCalledWith('suspicious');
    }
    {
      const { em, a, b } = setup(6);
      glimpse(a);
      priv(em).glimpseFollow();
      expect(b.hasStimulus).toBe(false);
      expect(b.bark).not.toHaveBeenCalled();
    }
    {
      const { em, a, b } = setup(3);
      glimpse(a, RISE_SOUND);
      priv(em).glimpseFollow();
      expect(b.bark).not.toHaveBeenCalled();
    }
    {
      const { em, a, b } = setup(3);
      b.aware.set('searching');
      glimpse(a);
      priv(em).glimpseFollow();
      expect(b.bark).not.toHaveBeenCalled();
    }
  });
});

describe('GA6 fix round', () => {
  const run = (em: EnemyManager, secs: number): void => {
    for (let k = 1; k <= Math.round(secs / PAIRS.tick); k++) priv(em).pairStep(PAIRS.tick);
  };
  /** A sweep pair on the scene, walked together a second; then `a` is taken with `b` as `busy` leaves him. */
  const takenWith = (busy: (b: SweepGuard) => void) => {
    const { em, list } = sweepManager();
    em.sceneDark = true;
    const [a, b] = placeAll(em, list, [lane(0), lane(0.7)], [1, 0]);
    run(em, 1);
    busy(b!);
    a!.taken = true;
    run(em, PAIRS.notice - 0.2);
    const early = priv(em).report.mock.calls.length;
    run(em, 0.4);
    return { em, b: b!, early };
  };

  it('check A FIX 1: the sweep watch hears with the survivor in cooldown or the section cautious: missing after PAIRS.notice', () => {
    expect(PAIRS.notice).toBe(3);
    for (const busy of [
      (b: SweepGuard) => b.aware.set('cooldown'),
      (b: SweepGuard) => {
        (b as unknown as { caution: number }).caution = 1;
      },
      (b: SweepGuard) => {
        b.aware.set('cooldown');
        (b as unknown as { caution: number }).caution = 1;
      },
    ]) {
      const { em, b, early } = takenWith(busy);
      expect(asEnemy(b).pairCalm).toBe(false);
      expect(asEnemy(b).sweepCalm).toBe(true);
      expect(early).toBe(0);
      expect(priv(em).report).toHaveBeenCalledTimes(1);
      expect(priv(em).report.mock.calls[0]![0]).toBe('missing');
      expect(priv(em).missingCall.mock.calls[0]![0]).toBe(asEnemy(b));
    }
    // still deaf on a board task or while looking (suspicious)
    for (const busy of [
      (b: SweepGuard) => {
        (b as unknown as { incident: number }).incident = 4;
      },
      (b: SweepGuard) => b.aware.set('suspicious'),
    ]) {
      const { em } = takenWith(busy);
      run(em, 10);
      expect(priv(em).report).not.toHaveBeenCalled();
    }
  });

  it('check A FIX 1: off the scene a talking pair still fills calm from pairCalm (cooldown or cautious: not calm)', () => {
    const { em, list } = sweepManager();
    const [, b] = placeAll(em, list, [SIDE_A(), SIDE_B()], [1, 0]);
    expect(em.pairs.length).toBe(1);
    expect(em.pairs[0]!.watchOnly).toBeUndefined();
    const pm = em.pairs[0]!.pm;
    priv(em).pairStep(PAIRS.tick);
    expect(pm.b.calm).toBe(true);
    b!.aware.set('cooldown');
    priv(em).pairStep(PAIRS.tick);
    expect(pm.b.calm).toBe(false);
    b!.aware.set('unaware');
    (b as unknown as { caution: number }).caution = 1;
    priv(em).pairStep(PAIRS.tick);
    expect(pm.b.calm).toBe(false);
  });

  it('check A FIX 2: a swept deck guard on the floor under his stop walks to it on his storey, never holds under it; up there he holds', () => {
    const ys: number[] = [];
    const g = sweepGuard([], 0, 0, -Math.PI / 2, LANE, {
      homeY: 3,
      // the nav stand-in as `goTo`: null only within `near` on the asked storey
      goTo(this: { pos: { x: number; y: number; z: number } }, p: [number, number], _dt: number, near = 0.6, y = Number.NaN): [number, number] | null {
        ys.push(y);
        return hyp2(p[0] - this.pos.x, p[1] - this.pos.z) < near && !(Math.abs(y - this.pos.y) >= 1.2) ? null : p;
      },
    });
    g.startSweep(0, 1);
    const stop = g.walker.sweepPlan!.pts[g.walker.idx]!;
    g.pos.x = stop[0];
    g.pos.z = stop[1];
    expect(g.pos.y).toBe(0);
    for (let k = 0; k < Math.round(4 / DT); k++) {
      g.walker.tick(DT);
      const goal = g.calmDecide(DT);
      expect(goal.point).toBe(stop);
      expect(g.walker.waiting).toBe(0);
      expect(Number.isNaN(g.walker.lookYaw)).toBe(true);
    }
    expect(ys.length).toBeGreaterThan(0);
    expect(ys.every((y) => y === 3)).toBe(true);
    // up on the deck: at his stop
    g.pos.y = 3;
    g.walker.tick(DT);
    expect(g.calmDecide(DT).point).toBeNull();
  });

  it('check B Polish 2: clear() sets the sweep clock to 0 and keeps sceneDark', () => {
    const { em } = sweepManager();
    em.sceneDark = true;
    em.sweepClock = 12.5;
    em.clear();
    expect(em.sweepClock).toBe(0);
    expect(em.sceneDark).toBe(true);
  });

  it('check A Polish 3 / B Polish 8: em.update with sceneDark advances the sweep clock and runs glimpseFollow at the board tick; off, neither', () => {
    const mk = () => {
      const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] }, lightField: { levelAt: () => 0 } };
      const nav = { version: 0, walk: new Uint8Array(4), cols: 2, rows: 2, heightAt: () => 0, sliceTick: () => {} };
      const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
      const follow = vi.spyOn(em as unknown as { glimpseFollow(): void }, 'glimpseFollow');
      return { em, follow };
    };
    const dt = 1 / 60;
    {
      const { em, follow } = mk();
      em.sceneDark = true;
      for (let k = 0; k < 60; k++) em.update(dt);
      expect(em.sweepClock).toBeCloseTo(1, 9);
      // the board at 5 Hz: 5 ticks in 1 s
      expect(follow).toHaveBeenCalledTimes(5);
    }
    {
      const { em, follow } = mk();
      for (let k = 0; k < 60; k++) em.update(dt);
      expect(em.sweepClock).toBe(0);
      expect(follow).not.toHaveBeenCalled();
    }
  });
});
