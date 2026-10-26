import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager, POLISH2 } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { AlertMachine } from '../src/ai/alertState';
import { COMBAT_HEAR, combatHearAct, type HearTier } from '../src/ai/hearing';
import { noiseRadius } from '../src/player/movement';
import { SURFACE_NOISE } from '../src/world/surfaces';
import { Vector3, type Scene } from '../src/core/babylon';
import { Enemy, type AiContext, type PlayerRef } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid, P2 } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S26, CT rule 8, A155-A160) Guards hear you in a fight and a search. The pure table (`combatHearAct`), then a
// real EnemyManager (stealth, coordinated) with stand-in guards on the Enemy prototype (the real `hearSearch`,
// `heardAt`, `tell`, `knownSpot`), a stub nav (1 m cells, open floor, a flow field by straight distance), all dark, and a
// stub ballistics whose wall ray is clear or blocked by hand.

const W = 40;
const OX = -20;
const OZ = -20;
const col = (x: number, z: number): number => {
  const ix = Math.floor(x - OX);
  const iz = Math.floor(z - OZ);
  return ix < 0 || iz < 0 || ix >= W || iz >= W ? -1 : iz * W + ix;
};
const centreX = (c: number): number => OX + (c % W) + 0.5;
const centreZ = (c: number): number => OZ + Math.floor(c / W) + 0.5;

/** A sprint step on concrete (~7 m: `noiseRadius(5)` x `SURFACE_NOISE`), read from the game. */
const STEP = noiseRadius(5.0, false) * SURFACE_NOISE.concrete;

type Priv = { ctx: AiContext; slotFlowStep(dt: number): void; planClock: number; report(...a: unknown[]): void; reportIntruder(...a: unknown[]): void };

/** A player `id` at (x, z). */
function player(id: string, x: number, z: number): PlayerRef {
  return { id, feet: new Vector3(x, 0, z), target: { alive: true }, speed: 0, crouched: false } as unknown as PlayerRef;
}

function manager(players: PlayerRef[]) {
  const walk = new Uint8Array(W * W).fill(1);
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    lightField: { levelAt: () => 0.02 },
  };
  const nav = {
    walk,
    cell: 1,
    w: W,
    cols: W * W,
    ox: OX,
    oz: OZ,
    version: 0,
    cellOf: (x: number, z: number) => col(x, z),
    isWalkable: (c: number) => c >= 0 && walk[c] === 1,
    nearestWalkable: (x: number, z: number) => col(x, z),
    center: (c: number): P2 => [centreX(c), centreZ(c)],
    cellHeight: () => 0,
    heightAt: () => 0,
    lineClear: () => true,
    findPath: () => null,
    flowField: vi.fn((g: readonly P2[], out: Float32Array) => {
      const gx = g[0]![0];
      const gz = g[0]![1];
      for (let c = 0; c < W * W; c++) out[c] = Math.sqrt((centreX(c) - gx) ** 2 + (centreZ(c) - gz) ** 2);
      return out;
    }),
  };
  const clear = vi.fn(() => true);
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => players);
  em.stealth = true;
  const priv = em as unknown as Priv;
  const gs: Guard[] = [];
  const add = (g: Guard): Guard => {
    (g as unknown as { ctx: AiContext }).ctx = priv.ctx;
    em.enemies.push(g as unknown as Enemy);
    gs.push(g);
    return g;
  };
  /** The clocks as `update` steps them: the board, the plan clock, the mirror's sight clock and each guard's throttles
   *  (`Enemy.update`'s two lines). */
  const tick = (dt: number): void => {
    em.sightT += dt;
    em.intruders.step(dt);
    priv.planClock += dt;
    priv.slotFlowStep(dt);
    for (const g of gs) {
      const h = g as unknown as { heardT: number; hearBarkT: number };
      if (h.heardT < 99) h.heardT += dt;
      if (h.hearBarkT < 99) h.hearBarkT += dt;
    }
  };
  return { em, priv, ctx: priv.ctx, clear, add, tick };
}

type Guard = Enemy;

let n = 0;
/** A stand-in on the real Enemy prototype: alerted (in combat, out of sight) or searching (`combat` true: after combat). */
function guard(x: number, z: number, level: 'alert' | 'searching', o: Record<string, unknown> = {}): Guard {
  const aware = new AlertMachine();
  aware.set(level);
  const num = 9800 + n++;
  return Object.assign(Object.create(Enemy.prototype) as Enemy, {
    num,
    id: `h${num}`,
    health: { alive: true },
    aware,
    passive: false,
    taken: false,
    los: false,
    crew: null,
    postDef: null,
    def: { melee: null, kind: 'grunt', scale: 1, walkSpeed: 0.9, runSpeed: 3.2 },
    pos: new Vector3(x, 0, z),
    yaw: 0,
    hunt: -1,
    pendingHunt: -1,
    heardT: 99,
    hearBarkT: 99,
    spot: [x, z] as P2,
    spotSet: false,
    spotLookT: 0,
    planPoint: false,
    rush: false,
    combatSearch: level === 'searching',
    searchOwn: false,
    sawOnce: false,
    hasStimulus: false,
    stimulus: [0, 0] as P2,
    lastKnown: new Vector3(),
    knownV: new Vector3(),
    bark: vi.fn(),
    hear: vi.fn(),
    hearTurn: vi.fn(),
    ...o,
  }) as Guard;
}

const spotOf = (g: Guard): P2 => g.searchSpot([0, 0]);
const knownSpot = (g: Guard, t: PlayerRef): Vector3 => (Enemy.prototype as unknown as { knownSpot(this: Guard, t: PlayerRef): Vector3 }).knownSpot.call(g, t);
const at = (x: number, z: number) => new Vector3(x, 0, z);

afterEach(() => {
  (COMBAT_HEAR as { enabled: boolean }).enabled = true;
});

describe('combatHearAct (pure table)', () => {
  it('every state x sees x tier x body x lure', () => {
    const want = (state: 0 | 1 | 2, sees: boolean, tier: number, body: boolean, lure: boolean): number => {
      if (state === 0 || tier < 1) return 0;
      if (state === 2) return !sees && body && !lure ? 2 : 0;
      return body ? 2 : 1;
    };
    for (const state of [0, 1, 2] as const)
      for (const sees of [false, true])
        for (const tier of [0, 1, 2, 3] as HearTier[])
          for (const body of [false, true])
            for (const lure of [false, true]) expect(combatHearAct(state, sees, tier, body, lure), `${state} ${sees} ${tier} ${body} ${lure}`).toBe(want(state, sees, tier, body, lure));
  });

  it('the defaults (A156, A158, A160)', () => {
    expect(COMBAT_HEAR).toEqual({ enabled: true, tier: 1, gap: 1.5, reportGap: 1, reportMove: 1.5, switchAfter: 8, searchLures: true, bark: 6 });
    expect(STEP).toBeGreaterThan(6.5);
    expect(STEP).toBeLessThan(7.5);
  });
});

describe('EnemyManager.hear in a fight and a search (guard-ai S26)', () => {
  it('(a) in combat, no line to A, A sprints 5 m off in the open: A located at the step (locT 0, seenT kept), he goes for it', () => {
    const A = player('host', 10, 0);
    const { em, ctx, add, tick } = manager([A]);
    const g = add(guard(0, -5, 'alert'));
    const s = ctx.reportSighting(A);
    g.hunt = s;
    tick(3);
    em.hear(at(0, 0), STEP, 'noise', null, 'host');
    expect([em.lkpOf(s)!.x, em.lkpOf(s)!.z]).toEqual([0, 0]);
    expect(em.intruders.locT[s]).toBe(0);
    expect(em.intruders.seenT[s]).toBeCloseTo(3, 4);
    expect(g.hunt).toBe(s);
    expect(knownSpot(g, A)).toBe(em.lkpOf(s));
    expect(g.heardAt).toBe(0);
  });

  it('(b) the same step through one wall (5 m > 7 x 0.45): nothing', () => {
    const A = player('host', 10, 0);
    const { em, ctx, add, tick, clear } = manager([A]);
    const g = add(guard(0, -5, 'alert'));
    g.hunt = ctx.reportSighting(A);
    tick(3);
    clear.mockReturnValue(false);
    em.hear(at(0, 0), STEP, 'noise', null, 'host');
    expect(clear).toHaveBeenCalled();
    expect(em.lkpOf(0)!.x).toBe(10);
    expect(em.intruders.locT[0]).toBeCloseTo(3, 4);
    expect(g.heardAt).toBe(99);
  });

  it('(c) he sees his target: nothing, and no ray cast for him', () => {
    const A = player('host', 10, 0);
    const { em, ctx, add, tick, clear } = manager([A]);
    const g = add(guard(0, -5, 'alert', { los: true }));
    g.hunt = ctx.reportSighting(A);
    tick(3);
    em.hear(at(0, 0), STEP, 'noise', null, 'host');
    expect(clear).not.toHaveBeenCalled();
    expect(em.lkpOf(0)!.x).toBe(10);
    expect(g.heardAt).toBe(99);
  });

  it('(d) G139: hunting A (located 2 s ago), he hears B: B located, his hunt stays A; A stale (9 s): he hunts B', () => {
    const A = player('host', -10, 0);
    const B = player('guest', 10, 0);
    const { em, ctx, add, tick } = manager([A, B]);
    const g = add(guard(0, -5, 'alert'));
    const sa = ctx.reportSighting(A);
    g.hunt = sa;
    tick(2);
    em.hear(at(1, -1), STEP, 'noise', null, 'guest');
    const sb = em.intruders.slotFor('guest');
    expect(sb).not.toBe(sa);
    expect(em.intruders.valid[sb]).toBe(1);
    expect([em.lkpOf(sb)!.x, em.lkpOf(sb)!.z]).toEqual([1, -1]);
    expect(g.hunt).toBe(sa);
    // A's position untouched
    expect(em.lkpOf(sa)!.x).toBe(-10);
    // nothing new of A for 9 s: the next step of B takes him over
    tick(7);
    expect(em.intruders.locT[sa]).toBeGreaterThanOrEqual(COMBAT_HEAR.switchAfter);
    em.hear(at(1, -2), STEP, 'noise', null, 'guest');
    expect(g.hunt).toBe(sb);
    expect(knownSpot(g, B)).toBe(em.lkpOf(sb));
  });

  it('(e) a combat searcher hears a step 6 m off: his spot is the step, his claim released, the plan re-centred; another searcher walks on, then takes a point of the new plan', () => {
    const A = player('host', 0, 0);
    const { em, ctx, priv, add, tick } = manager([A]);
    const g1 = add(guard(0, 0, 'searching'));
    const g2 = add(guard(-15, 0, 'searching'));
    const s = ctx.reportSighting(A);
    g1.hunt = s;
    g2.hunt = s;
    priv.slotFlowStep(0);
    const plan = em.plans[s]!;
    // both on a plan point (as the search branch takes them)
    const out: P2 = [0, 0];
    for (const g of [g1, g2]) {
      expect(ctx.searchPoint!(g, out)).toBe(true);
      Object.assign(g, { spot: [out[0], out[1]] as P2, spotSet: true, planPoint: true });
    }
    const g2Spot = spotOf(g2);
    expect([plan.claimOf(g1.num) >= 0, plan.claimOf(g2.num) >= 0, plan.cx, plan.cz]).toEqual([true, true, 0, 0]);
    tick(0.6);
    em.hear(at(0, 6), STEP, 'noise', null, 'host');
    // he walks to the step (one cell), off the plan, his claim gone; "I heard something."
    const sp = spotOf(g1);
    expect(Math.hypot(sp[0] - 0, sp[1] - 6)).toBeLessThanOrEqual(Math.SQRT1_2 + 1e-6);
    expect([g1.onPlan, g1.heardAt, (g1 as unknown as { rush: boolean }).rush]).toEqual([false, 0, false]);
    expect(g1.bark).toHaveBeenCalledWith('heard');
    expect(plan.claimOf(g1.num)).toBe(-1);
    // the slot moved to the step: the plan is reset at once (claims dropped)
    expect([em.lkpOf(s)!.x, em.lkpOf(s)!.z]).toEqual([0, 6]);
    expect([plan.builtAt, plan.anyClaim()]).toEqual([-1, false]);
    // the other searcher (out of earshot) keeps his walk
    expect(spotOf(g2)).toEqual(g2Spot);
    expect(g2.onPlan).toBe(true);
    // his point ends: done on a reset plan is a no-op; his next point comes from the plan rebuilt round the step
    ctx.searchDone!(g2, true);
    priv.slotFlowStep(0);
    expect(ctx.searchPoint!(g2, out)).toBe(true);
    expect([plan.cx, plan.cz]).toEqual([0, 6]);
    expect(plan.builtAt).toBeGreaterThanOrEqual(0);
    expect(Math.hypot(out[0] - 0, out[1] - 6)).toBeLessThanOrEqual((em as unknown as { planR: Float32Array }).planR[s]! + 1);
  });

  it('(f) a calm body searcher hears a step: he walks to it (search pace), the incident board is not told', () => {
    const A = player('host', 30, 0);
    const { em, priv, add } = manager([A]);
    const g = add(guard(0, 0, 'searching', { combatSearch: false, searchOwn: true }));
    const report = vi.spyOn(priv, 'report').mockImplementation(() => {});
    em.hear(at(4, 3), STEP, 'noise', null, 'host');
    const sp = spotOf(g);
    expect(Math.hypot(sp[0] - 4, sp[1] - 3)).toBeLessThanOrEqual(Math.SQRT1_2 + 1e-6);
    expect([g.inCombatSearch, (g as unknown as { rush: boolean }).rush]).toEqual([false, false]);
    expect(report).not.toHaveBeenCalled();
    expect(g.hearTurn).not.toHaveBeenCalled();
    // (the table: a body noise locates its maker) he hunts that slot from now
    expect(g.hunt).toBe(em.intruders.slotFor('host'));
  });

  it('(g) a bottle (a lure, by nobody): searchers go, a guard in combat ignores it; nobody located', () => {
    const A = player('host', 10, 0);
    const { em, ctx, add, tick, clear } = manager([A]);
    const c = add(guard(0, -5, 'alert'));
    const s = add(guard(2, 0, 'searching'));
    c.hunt = ctx.reportSighting(A);
    s.hunt = c.hunt;
    tick(3);
    em.hear(at(0, 1), 6, 'distraction');
    const sp = spotOf(s);
    expect(Math.hypot(sp[0] - 0, sp[1] - 1)).toBeLessThanOrEqual(Math.SQRT1_2 + 1e-6);
    expect(c.heardAt).toBe(99);
    expect(em.lkpOf(0)!.x).toBe(10);
    expect(em.intruders.locT[0]).toBeCloseTo(3, 4);
    // no ray for the guard in combat (it could mean nothing to him); one for the searcher at most
    expect(clear.mock.calls.length).toBeLessThanOrEqual(1);
    // a glass break (by nobody): the same
    tick(2);
    em.hear(at(1, 1), 6, 'noise');
    expect(c.heardAt).toBe(99);
    expect(spotOf(s)).toEqual([1.5, 1.5]);
  });

  it('(S26 fix) a flashbanged guard (blindT running) hears nothing: no walk, no locate, no bark, no ray', () => {
    const A = player('host', 10, 0);
    const { em, ctx, add, tick, clear } = manager([A]);
    const c = add(guard(0, -5, 'alert', { blindT: 2 }));
    const s = add(guard(2, 0, 'searching', { blindT: 2 }));
    c.hunt = ctx.reportSighting(A);
    s.hunt = c.hunt;
    tick(3);
    const sp0 = spotOf(s);
    em.hear(at(0, 1), STEP, 'noise', null, 'host');
    expect(clear).not.toHaveBeenCalled();
    expect(em.lkpOf(0)!.x).toBe(10);
    expect(em.intruders.locT[0]).toBeCloseTo(3, 4);
    expect([c.heardAt, s.heardAt]).toEqual([99, 99]);
    expect(spotOf(s)).toEqual(sp0);
    expect(s.bark).not.toHaveBeenCalled();
    // the flash wears off: he hears the next step
    (s as unknown as { blindT: number }).blindT = 0;
    em.hear(at(0, 1), STEP, 'noise', null, 'host');
    expect(s.heardAt).toBe(0);
  });

  it('(h) throttles: two steps 0.25 s apart, one re-aim; a slot moved < 1.5 m within 1 s, one report', () => {
    const A = player('host', 10, 0);
    const { em, add, tick } = manager([A]);
    const s = add(guard(0, 0, 'searching'));
    em.hear(at(3, 0), STEP, 'noise', null, 'host');
    const first = spotOf(s);
    tick(0.25);
    em.hear(at(0, 3), STEP, 'noise', null, 'host');
    expect(spotOf(s)).toEqual(first);
    expect(s.bark).toHaveBeenCalledTimes(1);
    // after the gap he re-aims (the bark keeps its own 6 s)
    tick(COMBAT_HEAR.gap);
    em.hear(at(0, 3), STEP, 'noise', null, 'host');
    expect(spotOf(s)).toEqual([0.5, 3.5]);
    expect(s.bark).toHaveBeenCalledTimes(1);
    // reports: three guards in combat, one per step (each re-aims once)
    const B = player('guest', 0, 0);
    const m = manager([A, B]);
    const gs = [m.add(guard(0, -5, 'alert')), m.add(guard(0, 5, 'alert')), m.add(guard(5, 0, 'alert'))];
    const sb = m.ctx.reportSighting(B);
    for (const g of gs) g.hunt = sb;
    const rep = vi.spyOn(m.priv, 'reportIntruder');
    const hearOnly = (p: Vector3): void => m.em.hear(p, STEP, 'noise', null, 'guest');
    // only gs[0] is free to hear: the others re-aimed just now
    Object.assign(gs[1]!, { heardT: 0 });
    Object.assign(gs[2]!, { heardT: 0 });
    hearOnly(at(1, 0));
    expect(rep).toHaveBeenCalledTimes(1);
    m.tick(0.5);
    Object.assign(gs[1]!, { heardT: 99 });
    hearOnly(at(2, 0));
    // 0.5 s and 1 m: not reported again
    expect(rep).toHaveBeenCalledTimes(1);
    expect(m.em.lkpOf(sb)!.x).toBe(1);
    m.tick(0.2);
    Object.assign(gs[2]!, { heardT: 99 });
    hearOnly(at(3, 0));
    // 0.7 s but 2 m: reported
    expect(rep).toHaveBeenCalledTimes(2);
    expect(m.em.lkpOf(sb)!.x).toBe(3);
  });

  it('(i) coordinated false, COMBAT_HEAR.enabled false, stealth off: today exactly (combat deaf, a searcher only the old hooks)', () => {
    for (const mode of ['parked', 'off', 'loud'] as const) {
      const A = player('host', 10, 0);
      const { em, ctx, priv, add, tick } = manager([A]);
      if (mode === 'parked') em.coordinated = false;
      if (mode === 'off') (COMBAT_HEAR as { enabled: boolean }).enabled = false;
      if (mode === 'loud') em.stealth = false;
      // (the incident board's own reaction is S2's; only whether it is told matters here)
      vi.spyOn(priv, 'report').mockImplementation(() => {});
      const c = add(guard(0, -5, 'alert'));
      const s = add(guard(2, 0, 'searching'));
      c.hunt = ctx.reportSighting(A);
      s.hunt = c.hunt;
      tick(3);
      const before = spotOf(s);
      em.hear(at(0, 0), STEP, 'noise', null, 'host');
      expect(em.lkpOf(0)!.x).toBe(10);
      expect(em.intruders.locT[0]).toBeCloseTo(3, 4);
      expect([c.heardAt, s.heardAt]).toEqual([99, 99]);
      expect(spotOf(s)).toEqual(before);
      if (mode === 'parked') expect(s.hear).toHaveBeenCalled();
      else expect(s.hearTurn).toHaveBeenCalled();
      expect(c.hear).not.toHaveBeenCalled();
      expect(c.hearTurn).not.toHaveBeenCalled();
    }
  });

  it("(guard-ai polish B3) hunting a fresh A, B's step: B located, his throttle not restarted, so A's next step is heard at once", () => {
    const A = player('host', -10, 0);
    const B = player('guest', 10, 0);
    const { em, ctx, add, tick } = manager([A, B]);
    const c = add(guard(0, -5, 'alert'));
    const sa = ctx.reportSighting(A);
    c.hunt = sa;
    tick(2);
    em.hear(at(1, -1), STEP, 'noise', null, 'guest');
    const sb = em.intruders.find('guest');
    expect(em.intruders.valid[sb]).toBe(1);
    expect([c.hunt, c.heardAt]).toEqual([sa, 99]);
    // A's step right after (inside COMBAT_HEAR.gap of B's): heard, A located there (before B3 he was deaf to it)
    em.hear(at(-2, -3), STEP, 'noise', null, 'host');
    expect([em.lkpOf(sa)!.x, em.lkpOf(sa)!.z, em.intruders.locT[sa]]).toEqual([-2, -3, 0]);
    expect([c.hunt, c.heardAt]).toEqual([sa, 0]);
  });

  it('(guard-ai polish B3) a searcher told of A who switches to B by a noise is re-told B (pendingHunt B, not the old A)', () => {
    const A = player('host', -10, 0);
    const B = player('guest', 10, 0);
    const { em, ctx, add, tick } = manager([A, B]);
    const s = add(guard(4, 4, 'searching'));
    const sa = ctx.reportSighting(A);
    (s as unknown as { pendingHunt: number }).pendingHunt = sa;
    tick(2);
    em.hear(at(5, 4), STEP, 'noise', null, 'guest');
    const sb = em.intruders.find('guest');
    expect(sb).not.toBe(sa);
    expect([s.hunt, (s as unknown as { pendingHunt: number }).pendingHunt]).toEqual([sb, sb]);
  });

  it('(guard-ai polish B6) a flashbanged calm guard hears nothing: no turn, no board report', () => {
    const A = player('host', 10, 0);
    const { em, priv, add } = manager([A]);
    const g = add(guard(0, 0, 'searching', { blindT: 2 }));
    g.aware.set('unaware');
    const report = vi.spyOn(priv, 'report').mockImplementation(() => {});
    em.hear(at(1, 0), STEP, 'noise', null, 'host');
    em.hear(at(1, 0), STEP, 'noise');
    expect(g.hearTurn).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
    // the flash wears off: today's path
    (g as unknown as { blindT: number }).blindT = 0;
    em.hear(at(1, 0), STEP, 'noise');
    expect(g.hearTurn).toHaveBeenCalled();
    expect(report).toHaveBeenCalledTimes(1);
  });

  it('calm guards: today\'s path (hearTurn and the incident board), whatever `by`', () => {
    const A = player('host', 10, 0);
    const { em, priv, add } = manager([A]);
    const g = add(guard(0, 0, 'searching'));
    g.aware.set('unaware');
    const report = vi.spyOn(priv, 'report').mockImplementation(() => {});
    em.hear(at(1, 0), STEP, 'noise', null, 'host');
    expect(g.hearTurn).toHaveBeenCalled();
    expect(report).toHaveBeenCalledTimes(1);
    expect([g.heardAt, em.intruders.valid[0]]).toEqual([99, 0]);
  });

  it('a sweeping response team reports what it hears but keeps its stack; a melee kind keeps its own rule', () => {
    const A = player('host', 10, 0);
    const { em, add } = manager([A]);
    const s = add(guard(0, 0, 'searching', { crew: { sweeping: true } }));
    const dog = add(guard(1, 0, 'searching', { def: { melee: {}, kind: 'dog', scale: 1 } }));
    const before = spotOf(s);
    em.hear(at(3, 0), STEP, 'noise', null, 'host');
    expect(spotOf(s)).toEqual(before);
    expect([em.lkpOf(0)!.x, s.hunt]).toEqual([3, 0]);
    expect(dog.hear).toHaveBeenCalled();
    expect(dog.heardAt).toBe(99);
  });

  it('(j) solo parity: one player, the old lkp / lkpValid / sightT reads', () => {
    const P = player('local', 10, 0);
    const { em, ctx, add, tick } = manager([P]);
    const g = add(guard(0, -5, 'alert'));
    g.hunt = ctx.reportSighting(P);
    expect([em.lkp.x, em.lkpValid, em.sightT]).toEqual([10, true, 0]);
    tick(3);
    em.hear(at(1, -2), STEP, 'noise', null, 'local');
    expect([em.lkp.x, em.lkp.z, em.lkpValid, em.intruders.freshest]).toEqual([1, -2, true, 0]);
    // heard, not seen: the sight clock runs on
    expect(em.sightT).toBeCloseTo(3, 4);
    expect(g.hunt).toBe(0);
  });
});

describe('hearing with 3-4 intruders (coop4 AI3)', () => {
  const four = (): PlayerRef[] => [player('host', -18, -18), player('c1', 18, -18), player('c2', -18, 18), player('c3', 18, 18)];

  it('4 bys, 4 guards in combat each near one maker: 4 slots located at the noises, each guard hunts his own maker', () => {
    const ps = four();
    const { em, add } = manager(ps);
    const corners: [number, number][] = [
      [-15, -15],
      [15, -15],
      [-15, 15],
      [15, 15],
    ];
    const gs = corners.map(([x, z]) => add(guard(x, z, 'alert')));
    for (let k = 0; k < 4; k++) em.hear(at(corners[k]![0], corners[k]![1] + 3), STEP, 'noise', null, ps[k]!.id);
    const slots = ps.map((p) => em.intruders.find(p.id));
    expect(slots).toEqual([0, 1, 2, 3]);
    for (let k = 0; k < 4; k++) {
      const s = slots[k]!;
      expect(em.intruders.valid[s]).toBe(1);
      expect([em.lkpOf(s)!.x, em.lkpOf(s)!.z]).toEqual([corners[k]![0], corners[k]![1] + 3]);
      expect(em.intruders.locT[s]).toBe(0);
      expect(gs[k]!.hunt).toBe(s);
      expect(gs[k]!.heardAt).toBe(0);
    }
  });

  it('a searcher on slot 2 hears slots 0, 1 and 3: each located, he walks to each, his hunt stays 2 until slot 2 is switchAfter stale', () => {
    const ps = four();
    const { em, ctx, add, tick } = manager(ps);
    for (const p of ps) ctx.reportSighting(p);
    expect(ps.map((p) => em.intruders.find(p.id))).toEqual([0, 1, 2, 3]);
    const g = add(guard(0, 0, 'searching'));
    g.hunt = 2;
    tick(2);
    const heard: [string, number, number][] = [
      ['c1', 3, 0],
      ['c3', 0, 3],
      ['host', -3, 0],
    ];
    for (const [id, x, z] of heard) {
      em.hear(at(x, z), STEP, 'noise', null, id);
      const s = em.intruders.find(id);
      expect([em.lkpOf(s)!.x, em.lkpOf(s)!.z, em.intruders.locT[s]]).toEqual([x, z, 0]);
      // he walks to it (re-aims his search spot), but keeps hunting slot 2
      const sp = spotOf(g);
      expect(Math.hypot(sp[0] - x, sp[1] - z)).toBeLessThanOrEqual(Math.SQRT1_2 + 1e-6);
      expect(g.heardAt).toBe(0);
      expect(g.hunt).toBe(2);
      expect(em.intruders.locT[2]).toBeLessThan(COMBAT_HEAR.switchAfter);
      tick(COMBAT_HEAR.gap);
    }
    // slot 2 not seen or heard for switchAfter: the next body noise of another intruder takes his hunt
    tick(COMBAT_HEAR.switchAfter - em.intruders.locT[2]!);
    expect(em.intruders.locT[2]).toBeGreaterThanOrEqual(COMBAT_HEAR.switchAfter);
    em.hear(at(3, 3), STEP, 'noise', null, 'c3');
    expect(g.hunt).toBe(3);
    // and slot 2 itself is never moved by the others' noises
    expect([em.lkpOf(2)!.x, em.lkpOf(2)!.z]).toEqual([-18, 18]);
  });

  /** One scripted fight: A sighted and hunted by a guard in combat, B's steps, a searcher near B; the outcome. */
  const fight = (ps: PlayerRef[]): unknown => {
    const { em, ctx, add, tick } = manager(ps);
    const c = add(guard(0, -5, 'alert'));
    const s = add(guard(8, 4, 'searching'));
    const sa = ctx.reportSighting(ps[0]!);
    c.hunt = sa;
    s.hunt = sa;
    tick(2);
    em.hear(at(1, -1), STEP, 'noise', null, ps[1]!.id);
    tick(COMBAT_HEAR.gap);
    em.hear(at(6, 4), STEP, 'noise', null, ps[1]!.id);
    tick(7);
    em.hear(at(2, -2), STEP, 'noise', null, ps[1]!.id);
    em.hear(at(0, 0), 6, 'noise');
    const sb = em.intruders.find(ps[1]!.id);
    return {
      sa,
      sb,
      lkpA: [em.lkpOf(sa)!.x, em.lkpOf(sa)!.z],
      lkpB: [em.lkpOf(sb)!.x, em.lkpOf(sb)!.z],
      locT: Array.from(em.intruders.locT),
      seenT: Array.from(em.intruders.seenT),
      valid: Array.from(em.intruders.valid),
      hunts: [c.hunt, s.hunt],
      heard: [c.heardAt, s.heardAt],
      spot: spotOf(s),
      freshest: em.intruders.freshest,
    };
  };

  it('2-player identity: the same fight with two silent, unseen teammates added ends exactly as with 2 players', () => {
    const two = fight([player('host', -10, 0), player('guest', 10, 0)]);
    const withFour = fight([player('host', -10, 0), player('guest', 10, 0), player('c2', -19, 19), player('c3', 19, 19)]);
    expect(withFour).toEqual(two);
    // and the 2-player outcome is today's G139 rule: B located; the combat guard switched to B once A went stale, the
    // searcher (B's last step out of his earshot) still hunts A
    expect(two).toMatchObject({ sa: 0, sb: 1, lkpA: [-10, 0], lkpB: [2, -2], hunts: [1, 0] });
  });

  it('(A172, pure part of the client hold-noise fix) a client\'s noisy hold heard with `by` locates him at the item; without it (coopHost.ts:771 today) nobody is located', () => {
    const HOLD = 6; // A6_HOLD_NOISE (the pump-house panel)
    for (const ps of [[player('host', -10, 0), player('guest', 10, 0)], four()]) {
      const client = ps[1]!.id;
      for (const fixed of [false, true]) {
        const { em, ctx, add, tick } = manager(ps);
        const c = add(guard(0, -3, 'alert'));
        c.hunt = ctx.reportSighting(ps[0]!);
        tick(3);
        const item = at(0, 0);
        if (fixed) em.hear(item, HOLD, 'noise', null, client);
        else em.hear(item, HOLD);
        const s = em.intruders.find(client);
        if (fixed) {
          expect(s).toBeGreaterThan(0);
          expect([em.lkpOf(s)!.x, em.lkpOf(s)!.z, em.intruders.locT[s]]).toEqual([0, 0, 0]);
          // (guard-ai polish B3) he hunts the fresh host: the client's noise does not restart his re-aim throttle
          expect([c.hunt, c.heardAt]).toEqual([0, 99]);
        } else {
          expect(s).toBe(-1);
          expect(c.heardAt).toBe(99);
        }
        // the hunted host is untouched either way
        expect(em.lkpOf(0)!.x).toBe(ps[0]!.feet.x);
      }
    }
  });
});

describe('(polish2 A185) one "I heard something." per noise', () => {
  afterEach(() => {
    POLISH2.oneHeardBark = true;
  });
  for (const on of [true, false]) {
    it(`three searchers hear one step: all three walk to it, ${on ? 'one' : 'three (undo)'} heard bark${on ? '' : 's'}`, () => {
      POLISH2.oneHeardBark = on;
      const A = player('host', 30, 0);
      const { em, add } = manager([A]);
      const gs = [add(guard(0, 0, 'searching')), add(guard(2, -2, 'searching')), add(guard(-2, -2, 'searching'))];
      em.hear(at(0, 3), STEP, 'noise', null, null);
      let barks = 0;
      for (const g of gs) {
        const sp = spotOf(g);
        expect(Math.hypot(sp[0] - 0, sp[1] - 3)).toBeLessThanOrEqual(Math.SQRT1_2 + 1e-6);
        expect(g.heardAt).toBe(0);
        barks += (g.bark as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[0] === 'heard').length;
      }
      expect(barks).toBe(on ? 1 : 3);
      // the next noise 2 s on: the speaker is still in his own throttle (`COMBAT_HEAR.bark`), the next searcher says it
      if (on) {
        for (const g of gs) (g as unknown as { heardT: number }).heardT = 99;
        em.hear(at(0, 4), STEP, 'noise', null, null);
        let again = 0;
        for (const g of gs) again += (g.bark as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[0] === 'heard').length;
        expect(again).toBe(2);
        expect((gs[0]!.bark as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
      }
    });
  }
});
