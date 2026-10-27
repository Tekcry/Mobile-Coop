import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager, MILL_HUNT_W1 } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { ALERT, emptyAlertInput } from '../src/ai/alertState';
import { HUNT, type HuntBoard } from '../src/ai/millHunt';
import { SEARCH_BLACKOUT, SEARCH_BODY, SEARCH_PLAIN } from '../src/ai/response';
import { Enemy as EnemyClass, type Enemy } from '../src/ai/enemy';
import { flags } from '../src/core/flags';
import { hyp2 } from '../src/core/mathx';
import { SEARCH_X, SEARCH_Z } from '../src/game/pianoScene';
import { THORNBECK_GUARDS, THORNBECK_SECTORS } from '../src/world/maps/thornbeckMill';
import { sweepGuard, type SweepGuard } from './helpers/sweepGuard';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';
import type { Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { SectorGuard } from '../src/game/sectors';

// (guard-ai mill-hunt H3; docs/guard-ai/mill-hunt/PLAN.md "Glue (H3)", "Slices" H3 tests) The hunt wired into the real
// guards and the manager: held in `searching` for good (A1), combat as built and back on the hunt after it, the board
// built empty at `sceneDark = true` and every placed guard admitted, the board's goal driving the walk (fold-ins 7, 11),
// flag off: GA6's sweep as built (A13). Real-class guards without a scene (tests/helpers/sweepGuard.ts), the storm mill's
// own section (`THORNBECK_SECTORS`, its `hunt`, its 12 guards and pair tags).

const DT = 1 / 60;
const flag0 = flags.millHunt;
afterEach(() => {
  flags.millHunt = flag0;
});

/** The real class's members these tests drive or read (several private). */
interface Hunter extends Omit<SweepGuard, 'searchAt'> {
  searchAt(x: number, z: number, revive?: null, kind?: number): void;
  mhOn: boolean;
  mhPt: [number, number];
  mhFace: number;
  mhSpeed: number;
  mhIdx: number;
  mhStart(): void;
  mhStop(): void;
  updateAwareness(dt: number): void;
  bodySearch(x: number, z: number, rush?: boolean): void;
  searchKind: number;
  searchReq: boolean;
  meter: number;
  rate: number;
  sinceSeen: number;
  state: string;
}

/**
 * A real-class grunt on the mill floor at (x, y, z) that can run its awareness step (`updateAwareness`: the meter, the
 * `hunting` input, the alert machine) and the real `searchAt` / `bodySearch`; perception is the test's (`rate`).
 */
function hunter(list: Enemy[], x: number, y: number, z: number): Hunter {
  const g = sweepGuard(list, x, z, 0, null, {
    searchAt: EnemyClass.prototype.searchAt,
    alertIn: emptyAlertInput(),
    los: false,
    smelled: false,
    sinceSeen: 99,
    called: 0,
    gunfire: false,
    searchReq: false,
    searchKind: SEARCH_PLAIN,
    responder: false,
    tacticsProfile: 0,
    closingIn: false,
    cueQuiet: false,
    cueRise: false,
    state: 'idle',
    alarm: null,
    loudAlert: false,
    pendingHunt: -1,
    buff: false,
    rng: { reseed: () => {} },
    fireGate: { reset: () => {} },
    huntPos: () => null,
    mhOn: false,
    mhPt: [x, z],
    mhFace: Number.NaN,
    mhSpeed: HUNT.pace,
    mhIdx: -1,
  }) as unknown as Hunter;
  g.pos.y = y;
  (g as unknown as { ctx: { diff: unknown } }).ctx.diff = DIFFICULTY.normal;
  return g;
}

const asE = (g: Hunter): Enemy => g as unknown as Enemy;

/** A manager on the storm mill (its `map.sectors`: the section's `hunt`); the missing-man path stubbed. */
function mill(): { em: EnemyManager; list: Enemy[] } {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    lightField: { levelAt: () => 0 },
    map: { id: 'thornbeckMill', sectors: THORNBECK_SECTORS },
  };
  const em = new EnemyManager({} as Scene, world as unknown as World, { walk: new Uint8Array(4), heightAt: () => 0 } as unknown as NavGrid, {} as DamageRegistry, {} as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  const p = em as unknown as { report: unknown; missingCall: unknown };
  p.report = vi.fn(() => 0);
  p.missingCall = vi.fn();
  return { em, list: em.enemies as Enemy[] };
}

type MillSlot = SectorGuard & { kind: 'grunt' };

/** The scene's order: the dark on, then the section's guards spawn on their slots and are placed (`placeSlot`). */
function placeMill(em: EnemyManager, list: Enemy[], guards: readonly SectorGuard[] = THORNBECK_GUARDS): Hunter[] {
  const slots = guards as readonly MillSlot[];
  const gs = slots.map((s) => hunter(list, s.x, s.y ?? 0, s.z));
  for (const g of gs) list.push(asE(g));
  for (let i = 0; i < gs.length; i++) em.placeSlot(asE(gs[i]!), slots[i]!, 0, slots, i);
  return gs;
}

const tickOf = (em: EnemyManager) => em as unknown as { mhTick(hb: HuntBoard<Enemy>): void };

/** `s` seconds of the hunt: the board tick every 0.2 s (as `update`'s coordinated block), each guard's calm decision and
 *  walk every step. */
function run(em: EnemyManager, gs: Hunter[], s: number): void {
  const n = Math.round(s / DT);
  for (let k = 0; k < n; k++) {
    if (k % 12 === 0) tickOf(em).mhTick(em.millHunt!);
    for (const g of gs) {
      if (!g.health.alive) continue;
      const goal = g.calmDecide(DT);
      g.move(DT, goal.point, goal.speed, goal.face);
    }
  }
}

describe('mill-hunt H3: the guard (A1)', () => {
  it('mhStart: searching (plain, no room), on the hunt, his goal where he stands; a dog, a held or a downed guard never', () => {
    const g = hunter([], 3, 0, 4);
    g.mhStart();
    expect(g.level).toBe('searching');
    expect(g.mhOn).toBe(true);
    expect(g.searchKind).toBe(SEARCH_PLAIN);
    expect(g.mhPt).toEqual([3, 4]);
    expect(g.mhFace).toBeNaN();
    const held = hunter([], 0, 0, 0);
    held.taken = true;
    held.mhStart();
    const down = hunter([], 0, 0, 0);
    down.health.alive = false;
    down.mhStart();
    const dog = hunter([], 0, 0, 0);
    (dog as unknown as { dog: unknown }).dog = {};
    dog.mhStart();
    for (const o of [held, down, dog]) {
      expect(o.mhOn).toBe(false);
      expect(o.level).toBe('unaware');
    }
  });

  it('on the hunt he stays searching past searchTime (the hunting input); off it the search ends as built', () => {
    const on = hunter([], 0, 0, 0);
    const off = hunter([], 0, 0, 0);
    on.mhStart();
    off.aware.set('searching');
    for (let t = 0; t < ALERT.searchTime + 30; t += 0.2) {
      on.updateAwareness(0.2);
      off.updateAwareness(0.2);
    }
    expect(on.level).toBe('searching');
    expect(off.level).toBe('cooldown');
    // and after mhStop his search ends (the scene's dark off)
    on.mhStop();
    on.updateAwareness(0.2);
    expect(on.level).toBe('cooldown');
  });

  it('a full meter is combat as built; lost sight brings him back to searching, still on the hunt', () => {
    const g = hunter([], 0, 0, 0);
    g.mhStart();
    g.rate = 50;
    for (let k = 0; k < 30 && g.level !== 'alert'; k++) g.updateAwareness(DT);
    expect(g.level).toBe('alert');
    expect(g.mhOn).toBe(true);
    g.rate = 0;
    for (let t = 0; t < ALERT.lostSight + 1; t += DT) g.updateAwareness(DT);
    expect(g.level).toBe('searching');
    expect(g.mhOn).toBe(true);
    for (let t = 0; t < ALERT.searchTime + 10; t += 0.2) g.updateAwareness(0.2);
    expect(g.level).toBe('searching');
  });

  it("the searching walk is the board's goal at its pace (capped at his walk); there, he faces the board's yaw", () => {
    const g = hunter([], 0, 0, 0);
    g.mhStart();
    // the stimulus of a blackout search and a body search do not move him (fold-ins 7, 11)
    g.searchAt(9, 9, null, SEARCH_BLACKOUT);
    g.bodySearch(-9, 9);
    expect(g.searchKind).toBe(SEARCH_BODY);
    g.mhPt[0] = 4;
    g.mhPt[1] = 0;
    g.mhFace = 1.2;
    let goal = g.calmDecide(DT);
    expect(goal.point).toBe(g.mhPt);
    expect(goal.speed).toBeCloseTo(Math.min(HUNT.pace, g.def.walkSpeed), 9);
    expect(goal.face).toBeNull();
    g.pos.x = 4 - HUNT.arrive + 0.05;
    goal = g.calmDecide(DT);
    expect(goal.face).toBeCloseTo(1.2, 9);
    g.pos.x = 3.9;
    goal = g.calmDecide(DT);
    expect(goal.point).toBeNull();
    expect(goal.speed).toBe(0);
    expect(goal.face).toBeCloseTo(1.2, 9);
    // the board says he walks (face NaN): no face
    g.mhFace = Number.NaN;
    expect(g.calmDecide(DT).face).toBeNull();
    // a fast board pace is capped at his walk
    g.pos.x = 0;
    g.mhSpeed = 9;
    expect(g.calmDecide(DT).speed).toBeCloseTo(g.def.walkSpeed, 9);
  });
});

describe('mill-hunt H3: the manager on the storm mill', () => {
  it('W1 is the scene blackout search point', () => {
    expect(MILL_HUNT_W1).toEqual([SEARCH_X, SEARCH_Z]);
  });

  it('dark with the flag on: every guard searching and on the hunt, none swept, no pairs; all on the board', () => {
    flags.millHunt = true;
    const { em, list } = mill();
    em.sceneDark = true;
    const hb = em.millHunt!;
    expect(hb).not.toBeNull();
    // built empty: the guards spawn after the dark (`spawnBeat`)
    expect(hb.phase).toBe(0);
    const gs = placeMill(em, list);
    for (const g of gs) {
      expect(g.level).toBe('searching');
      expect(g.mhOn).toBe(true);
      expect(g.sweeping).toBe(false);
      expect(g.sweepMate).toBeNull();
      expect(hb.unitOf(asE(g))).toBeGreaterThanOrEqual(0);
    }
    expect(em.pairs.length).toBe(0);
    // the pairs (G1 + G2, G4 + G5, G8 + G9, G11 + G12) are units of the board
    const u = (k: number) => hb.unitOf(asE(gs[k]!));
    expect(u(0)).toBe(u(1));
    expect(u(7)).toBe(u(8));
    expect(u(10)).toBe(u(11));
  });

  it('G1 + G2 hunt-driven after blackoutSearchSlots (fold-in 7); searching for good; the board walks them all', () => {
    flags.millHunt = true;
    const { em, list } = mill();
    em.sceneDark = true;
    const gs = placeMill(em, list);
    const [g1, g2] = [gs[0]!, gs[1]!];
    expect(em.blackoutSearchSlots([0, 1], SEARCH_X, SEARCH_Z)).toBe(2);
    expect(g1.searchKind).toBe(SEARCH_BLACKOUT);
    expect(g1.searchReq).toBe(true);
    run(em, gs, 1);
    for (const g of [g1, g2]) {
      expect(g.level).toBe('searching');
      expect(g.calmDecide(DT).point === g.mhPt || g.calmDecide(DT).point === null).toBe(true);
    }
    // the hunt moves them (the start spread: G3 out of the start bay) and keeps them searching past searchTime
    const g3 = gs[2]!;
    const x3 = g3.pos.x;
    for (let t = 0; t < ALERT.searchTime + 10; t += 5) {
      run(em, gs, 5);
      for (const g of gs) g.updateAwareness(0.2);
    }
    for (const g of gs) {
      expect(g.level).toBe('searching');
      expect(g.mhOn).toBe(true);
      expect(g.sweeping).toBe(false);
    }
    expect(g3.pos.x).toBeGreaterThan(x3 + 1);
    for (const g of gs) expect(Number.isFinite(g.mhPt[0]) && Number.isFinite(g.mhPt[1])).toBe(true);
  });

  it('a fight takes him off the board; lost sight, the next tick admits him again; a calm hunt guard is put back', () => {
    flags.millHunt = true;
    const { em, list } = mill();
    em.sceneDark = true;
    const gs = placeMill(em, list);
    const hb = em.millHunt!;
    const g = gs[5]!; // G6, the office solo
    const m = asE(g);
    run(em, gs, 1);
    const i = hb.memberIndex(m);
    expect(hb.mOn[i]).toBe(1);
    g.aware.set('alert');
    run(em, gs, 0.4);
    expect(hb.mOn[i]).toBe(0);
    g.aware.set('searching');
    run(em, gs, 0.4);
    expect(hb.mOn[i]).toBe(1);
    expect(hb.memberIndex(m)).toBe(i);
    // calm (an investigation over, let go): on the hunt again at the next tick
    g.aware.set('cooldown');
    run(em, gs, 0.4);
    expect(g.level).toBe('searching');
    expect(hb.mOn[i]).toBe(1);
  });

  it("each hunt guard's goal is the board's arrays at his cached index (no callback: the board's out is null)", () => {
    flags.millHunt = true;
    const { em, list } = mill();
    em.sceneDark = true;
    const gs = placeMill(em, list);
    const hb = em.millHunt!;
    expect((hb as unknown as { out: unknown }).out).toBeNull();
    run(em, gs, 3);
    for (const g of gs) {
      const i = g.mhIdx;
      expect(i).toBe(hb.memberIndex(asE(g)));
      expect(hb.mOn[i]).toBe(1);
      expect(g.mhPt[0]).toBe(hb.gx[i]);
      expect(g.mhPt[1]).toBe(hb.gz[i]);
      expect(Object.is(g.mhFace, hb.gface[i])).toBe(true);
      expect(g.mhSpeed).toBe(hb.gspeed[i]);
    }
  });

  it("a woken guard (a new object for his slot) gets an index again, pairs by the map's pair data; 30 wakes, no cap", () => {
    flags.millHunt = true;
    const { em, list } = mill();
    em.sceneDark = true;
    const gs = placeMill(em, list);
    const hb = em.millHunt!;
    run(em, gs, 2);
    for (let n = 0; n < 30; n++) {
      // G1 / G2 (a pair) in turn; half woken before the board's next tick (he takes the old index by his slot), half
      // after it (the old index freed, he takes a free one)
      const k = n % 2;
      const old = gs[k]!;
      const mate = gs[1 - k]!;
      const i0 = hb.memberIndex(asE(old));
      old.health.alive = false;
      list.splice(list.indexOf(asE(old)), 1);
      if (n % 4 >= 2) {
        run(em, gs, 0.2);
        expect(hb.member(i0)).toBeNull();
      }
      const w = hunter(list, old.pos.x, old.pos.y, old.pos.z);
      w.slotIdx = old.slotIdx;
      w.pairSlot = old.pairSlot;
      list.push(asE(w));
      gs[k] = w;
      w.mhStart();
      run(em, gs, 0.4);
      const i = hb.memberIndex(asE(w));
      expect(i).toBeGreaterThanOrEqual(0);
      if (n % 4 < 2) expect(i).toBe(i0);
      expect(w.mhIdx).toBe(i);
      expect(hb.mOn[i]).toBe(1);
      expect(hb.mPartner[i]).toBe(hb.memberIndex(asE(mate)));
      expect(w.mhPt[0]).toBe(hb.gx[i]);
      expect(w.mhPt[1]).toBe(hb.gz[i]);
    }
    let on = 0;
    for (let i = 0; i < hb.mOn.length; i++) on += hb.mOn[i]!;
    expect(on).toBe(gs.length);
    // the pair meets again as one unit
    run(em, gs, 20);
    expect(hb.unitOf(asE(gs[0]!))).toBe(hb.unitOf(asE(gs[1]!)));
  });

  it('a later spawn in the dark joins the board; the room cap holds by positions after the start spread', () => {
    flags.millHunt = true;
    const { em, list } = mill();
    em.sceneDark = true;
    // G3 held back (a player within 4 m): the rest first, him 20 s later
    const order = THORNBECK_GUARDS.map((_, k) => k).filter((k) => k !== 2);
    const slots = THORNBECK_GUARDS as readonly MillSlot[];
    const gs = slots.map((s) => hunter(list, s.x, s.y ?? 0, s.z));
    for (const k of order) {
      list.push(asE(gs[k]!));
      em.placeSlot(asE(gs[k]!), slots[k]!, 0, slots, k);
    }
    const live = order.map((k) => gs[k]!);
    run(em, live, 20);
    list.push(asE(gs[2]!));
    em.placeSlot(asE(gs[2]!), slots[2]!, 0, slots, 2);
    expect(em.millHunt!.unitOf(asE(gs[2]!))).toBeGreaterThanOrEqual(0);
    // from 15 s after the last joiner: no room above 2 guards by their positions
    run(em, gs, 15);
    const hb = em.millHunt!;
    let worst = 0;
    for (let t = 0; t < 60; t += 1) {
      run(em, gs, 1);
      for (let r = 0; r < hb.nRooms; r++) {
        const y = hb.lineY[hb.roomLine[r]!]!;
        let n = 0;
        for (const g of gs)
          if (Math.abs(g.pos.y - y) < 1.5 && g.pos.x >= hb.roomBox[r * 4]! && g.pos.x <= hb.roomBox[r * 4 + 2]! && g.pos.z >= hb.roomBox[r * 4 + 1]! && g.pos.z <= hb.roomBox[r * 4 + 3]!) n++;
        if (n > worst) worst = n;
      }
    }
    expect(worst).toBeLessThanOrEqual(HUNT.roomCap);
  });

  it('the dark off drops the hunt; a restart (clear, the dark again, the spawn) builds it anew at phase 0', () => {
    flags.millHunt = true;
    const { em, list } = mill();
    em.sceneDark = true;
    const gs = placeMill(em, list);
    run(em, gs, 2);
    const first = em.millHunt!;
    // a checkpoint restart: every guard goes (stand-ins: nothing to dispose), the scene sets the dark again and spawns
    for (const g of gs) (g as unknown as { dispose(): void }).dispose = () => {};
    em.clear();
    expect(em.millHunt).not.toBeNull();
    expect(em.millHunt).not.toBe(first);
    em.sceneDark = true;
    const hb = em.millHunt!;
    expect(hb.phase).toBe(0);
    const gs2 = placeMill(em, list);
    for (const g of gs2) {
      expect(g.level).toBe('searching');
      expect(g.mhOn).toBe(true);
      expect(hb.unitOf(asE(g))).toBeGreaterThanOrEqual(0);
    }
    // the scene left: off the hunt, the board gone
    em.sceneDark = false;
    expect(em.millHunt).toBeNull();
    for (const g of gs2) expect(g.mhOn).toBe(false);
  });

  it('flag off: GA6 as built (every placed guard swept, the sweep pairs watch-only, no board, nobody searching)', () => {
    flags.millHunt = false;
    const { em, list } = mill();
    em.sceneDark = true;
    expect(em.millHunt).toBeNull();
    const gs = placeMill(em, list);
    for (const g of gs) {
      expect(g.sweeping).toBe(true);
      expect(g.mhOn).toBe(false);
      expect(g.level).toBe('unaware');
    }
    expect(em.pairs.length).toBe(4);
    expect(em.pairs.every((p) => p.watchOnly)).toBe(true);
    // and the board tick runs GA7's glimpse follow, not the hunt
    const p = em as unknown as { glimpseFollow(): void; mhTick(hb: unknown): void };
    const follow = vi.spyOn(p, 'glimpseFollow');
    const hunt = vi.spyOn(p, 'mhTick');
    const nav = { version: 0, walk: new Uint8Array(4), cols: 2, rows: 2, heightAt: () => 0, sliceTick: () => {} };
    const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] }, lightField: { levelAt: () => 0 }, map: { sectors: THORNBECK_SECTORS } };
    const em2 = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
    const f2 = vi.spyOn(em2 as unknown as { glimpseFollow(): void }, 'glimpseFollow');
    em2.sceneDark = true;
    for (let k = 0; k < 60; k++) em2.update(DT);
    expect(f2).toHaveBeenCalledTimes(5);
    expect(follow).not.toHaveBeenCalled();
    expect(hunt).not.toHaveBeenCalled();
  });

  it('flag on: the board tick runs the hunt, not the glimpse follow (fold-in 10); a section without a hunt sweeps', () => {
    flags.millHunt = true;
    const nav = { version: 0, walk: new Uint8Array(4), cols: 2, rows: 2, heightAt: () => 0, sliceTick: () => {} };
    const mk = (sectors: unknown) => {
      const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] }, lightField: { levelAt: () => 0 }, map: { sectors } };
      return new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
    };
    const em = mk(THORNBECK_SECTORS);
    const follow = vi.spyOn(em as unknown as { glimpseFollow(): void }, 'glimpseFollow');
    const hunt = vi.spyOn(em as unknown as { mhTick(hb: unknown): void }, 'mhTick');
    em.sceneDark = true;
    for (let k = 0; k < 60; k++) em.update(DT);
    expect(hunt).toHaveBeenCalledTimes(5);
    expect(follow).not.toHaveBeenCalled();
    // no `hunt` on the section: GA6 / GA7 as built
    const em2 = mk([{ ...THORNBECK_SECTORS[0]!, hunt: undefined }]);
    em2.sceneDark = true;
    expect(em2.millHunt).toBeNull();
  });
});

describe('mill-hunt H3: no allocation on the hunt path', () => {
  /** The 12 on the hunt, 30 s in (the start spread and the regroups done: the rounds walk, clear, hold and loop). */
  async function warm() {
    flags.millHunt = true;
    const { em, list } = mill();
    em.sceneDark = true;
    const gs = placeMill(em, list);
    for (const g of gs) (g as unknown as { bark: () => void }).bark = () => {};
    run(em, gs, 30);
    return { em, gs, hb: em.millHunt! };
  }

  // The board tick with the goals handed to the guards: tests/millHuntGlueAlloc.test.ts (real `Enemy` objects, a file
  // of its own so these stand-ins' feedback does not reach the manager's code there).
  it("a guard's hunt step (the searching branch, mhStep) makes no object", async () => {
    const { gs } = await warm();
    const g = gs[5]!;
    const per = await bytesPerCall(
      (n) => {
        for (let k = 0; k < n; k++) g.calmDecide(DT);
      },
      0,
      { n: 600, warm: 30000 },
    );
    expect(per).toBeLessThanOrEqual(3 * HEAP_NUMBER);
    let moved = 0;
    for (let i = 0; i < gs.length; i++) if (hyp2(gs[i]!.pos.x - THORNBECK_GUARDS[i]!.x, gs[i]!.pos.z - THORNBECK_GUARDS[i]!.z) > 1) moved++;
    expect(moved).toBeGreaterThan(3);
  }, 120000);
});

