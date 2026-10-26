import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, TACTICS } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { COOP4, FIGHTS4 } from '../src/ai/intruders';
import { RESPONSE_N, SWEEP4 } from '../src/ai/gear';
import { RADIO } from '../src/ai/radioNet';
import type { SweepTeam } from '../src/ai/sweepTeam';
import { Vector3, type Scene } from '../src/core/babylon';
import { Enemy, type AiContext, type PlayerRef } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (coop4 AI1) Up to four intruders on a real EnemyManager with stand-in guards (the FakeGuard harness of
// twoIntruders.test.ts): a player who left keeps his slot for his rejoin; a new player with no free slot takes a gone
// one (from 3 live players, A170 / A171), which releases its search plan, caller, chase field and hunters; `ghostOf` is
// a read (0 none, 1 known, 2 show).

interface FakeGuard {
  id: string;
  num: number;
  key: number;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  runningAlarm: boolean;
  closing: boolean;
  dog: null;
  buff: boolean;
  hold: object | null;
  level: string;
  incident: number;
  state: string;
  coverIdx: number;
  roleBound: boolean;
  tacticsProfile: number;
  seesTarget: boolean;
  def: { melee: object | null; kind: string; scale: number; usesCover: boolean };
  pos: Vector3;
  yaw: number;
  role: number;
  cover: number;
  hunt: number;
  ctx: AiContext | null;
  setRole: ReturnType<typeof vi.fn>;
  radio: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
  hearGunfire: ReturnType<typeof vi.fn>;
  tell: ReturnType<typeof vi.fn>;
  joinAsReinforcement?: ReturnType<typeof vi.fn>;
  dropHunt: (s: number) => void;
}

let n = 0;
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 9600 + n++;
  const g: FakeGuard = {
    id: `t${num}`,
    num,
    key: -1,
    alive: true,
    alerted: true,
    passive: false,
    taken: false,
    runningAlarm: false,
    closing: false,
    dog: null,
    buff: false,
    hold: null,
    level: 'alert',
    incident: -1,
    state: 'chase',
    coverIdx: -1,
    roleBound: false,
    tacticsProfile: 0,
    seesTarget: false,
    def: { melee: null, kind: 'grunt', scale: 1, usesCover: true },
    pos: new Vector3(x, 0, z),
    yaw: 0,
    role: 0,
    cover: -1,
    hunt: -1,
    ctx: null,
    setRole: vi.fn(),
    radio: vi.fn(),
    bark: vi.fn(),
    hearGunfire: vi.fn(),
    tell: vi.fn(),
    // the real rule (Enemy.dropHunt, check A F1): his hunt and pending tell of a reused slot
    dropHunt: Enemy.prototype.dropHunt,
    ...o,
  };
  g.setRole = vi.fn((role: number, cover: number) => {
    g.role = role;
    g.cover = cover;
  });
  // the real rule (Enemy.tell): in combat with no intruder of his own, at once
  g.tell = vi.fn((s: number) => {
    if (s >= 0 && g.alerted && g.hunt < 0) g.hunt = s;
  });
  return g;
}

/** A player `id` at (x, z). */
function player(id: string, x: number, z: number): PlayerRef {
  return { id, feet: new Vector3(x, 0, z), target: { alive: true }, speed: 0, crouched: false } as unknown as PlayerRef;
}

/** A cover point at (cx + x, z) whose protected side faces (cx, 0). */
function cp(cx: number, x: number, z: number, low = false) {
  const l = Math.sqrt(x * x + z * z);
  return { pos: new Vector3(cx + x, 0, z), normal: new Vector3(-x / l, 0, -z / l), low, seg: 0, s: 0 };
}

/** squadWiring's layout round A at the origin (covers 0-4) and the same round B at (30, 0) (covers 5-9). */
const AROUND = (cx: number) => [cp(cx, 0, -7), cp(cx, 1, -12), cp(cx, 12, -4), cp(cx, 1, -17.5), cp(cx, 3, -9)];
const COVERS = [...AROUND(0), ...AROUND(30)];

type Priv = {
  ctx: AiContext;
  rolesStep(dt: number): void;
  radioStep(dt: number): void;
  forgetStep(): void;
  slotFlowStep(dt: number): void;
};

function manager(gs: FakeGuard[], players: PlayerRef[], covers = COVERS) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: covers, coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
  };
  const flowField = vi.fn();
  const nav = { walk: new Uint8Array(4), version: 0, nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0), flowField };
  const clear = vi.fn(() => true);
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => players);
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  const priv = em as unknown as Priv;
  for (const g of gs) g.ctx = priv.ctx;
  const radio = (s: number): void => {
    for (let k = 0; k < Math.round(s / 0.1); k++) priv.radioStep(0.1);
  };
  return { em, ctx: priv.ctx, priv, roles: () => priv.rolesStep(TACTICS.tick), radio, nav, flowField };
}

const E = (g: FakeGuard) => g as unknown as Enemy;
/** The real Enemy code on a stand-in: his own sighting (`takeSighting`). */
const sees = (g: FakeGuard, p: PlayerRef) => (Enemy.prototype as unknown as { takeSighting(this: FakeGuard, p: PlayerRef): void }).takeSighting.call(g, p);

type Rel = { callers: Int32Array; slotFlowVer: Int32Array; heardRepAt: Float64Array; alarmHunt: number; contactHunt: number };

/** Four players seen by four guards (one each): slots 0-3 in that order. */
function four(live = 4) {
  const ps = [player('a', 0, 0), player('b', 30, 0), player('c', 60, 0), player('d', 90, 0)];
  const gs = ps.map((p) => guard(p.feet.x, -10));
  const list = ps.slice(0, live);
  const m = manager(gs, list);
  ps.forEach((p, i) => sees(gs[i]!, p));
  return { ...m, ps, gs, list, rel: m.em as unknown as Rel };
}

describe('coop4 AI1: four intruders, slot reuse', () => {
  it('four players seen: four slots, each guard hunts his own', () => {
    const { em, gs } = four();
    expect(gs.map((g) => g.hunt)).toEqual([0, 1, 2, 3]);
    expect(['a', 'b', 'c', 'd'].map((id) => em.intruders.find(id))).toEqual([0, 1, 2, 3]);
    expect(Array.from(em.intruders.valid)).toEqual([1, 1, 1, 1]);
    expect(COOP4.from).toBe(3);
    expect(em.coop4()).toBe(true);
  });

  it('intruderLeft + rejoin with the same id: the same slot, last known position and hunters kept', () => {
    const { em, gs, ps } = four();
    em.intruderLeft('c');
    expect(em.intruders.gone[2]).toBe(1);
    expect([em.intruders.valid[2], gs[2]!.hunt]).toEqual([1, 2]);
    sees(gs[2]!, ps[2]!);
    expect([em.intruders.find('c'), em.intruders.gone[2], gs[2]!.hunt]).toEqual([2, 0, 2]);
    expect(em.lkpOf(2)!.x).toBe(60);
  });

  it('a new id takes a gone slot: its plan, caller, chase field, heard throttle and hunters are released', () => {
    const { em, gs, rel } = four();
    const e = player('e', 200, 0);
    const old = gs[3]!;
    const other = guard(95, -12);
    other.hunt = 3;
    em.enemies.push(E(other));
    other.ctx = gs[0]!.ctx;
    em.plans[3]!.reset(90, 0, 1);
    rel.callers[3] = old.num;
    rel.slotFlowVer[3] = 7;
    rel.heardRepAt[3] = 5;
    rel.alarmHunt = 3;
    rel.contactHunt = 3;
    // nothing free, nobody gone: the fifth id is reported nowhere, nothing released
    const g5 = guard(200, -10);
    em.enemies.push(E(g5));
    g5.ctx = gs[0]!.ctx;
    sees(g5, e);
    expect([g5.hunt, em.intruders.find('e'), old.hunt, rel.callers[3]]).toEqual([-1, -1, 3, old.num]);
    // d leaves; e is seen: e takes d's slot (hunted and valid, but the only gone one)
    em.intruderLeft('d');
    sees(g5, e);
    expect([em.intruders.find('e'), em.intruders.find('d'), em.intruders.idOf(3)]).toEqual([3, -1, 'e']);
    expect(g5.hunt).toBe(3);
    // d's hunters hunt nobody (they keep searching where they stand); the others keep theirs
    expect([old.hunt, other.hunt]).toEqual([-1, -1]);
    expect(gs.slice(0, 3).map((g) => g.hunt)).toEqual([0, 1, 2]);
    expect([em.plans[3]!.builtAt, rel.callers[3], rel.slotFlowVer[3], rel.heardRepAt[3], rel.alarmHunt, rel.contactHunt]).toEqual([-1, -1, -1, -1e9, -1, -1]);
    // the slot now holds e's sighting, not d's
    expect([em.intruders.valid[3], em.lkpOf(3)!.x, em.intruders.seenT[3], em.intruders.freshest]).toEqual([1, 200, 0, 3]);
    expect(em.intruders.reused).toBe(-1);
  });

  it('check A F1: a reuse drops a calm guard\'s pending tell of the old player (real Enemy.radio / tell / dropHunt)', () => {
    const { em, gs } = four();
    // a calm guard on the real Enemy prototype told of d (slot 3) by a contact call, and a reinforcement walking in on d
    const calm = (): Enemy => {
      const e = Object.create(Enemy.prototype) as Enemy;
      Object.assign(e, { health: { alive: true }, aware: { alert: false }, called: 0, hunt: -1, pendingHunt: -1 });
      em.enemies.push(e);
      return e;
    };
    const told = calm();
    told.radio(0, 3);
    const rein = calm();
    Object.assign(rein, { profile: 'normal', tacticsProfile: 0, entry: null, entryK: 0, entryT: 0 });
    rein.joinAsReinforcement(null, 3);
    const other = calm();
    other.radio(0, 1);
    const pend = (e: Enemy): number => (e as unknown as { pendingHunt: number }).pendingHunt;
    expect([pend(told), pend(rein), pend(other)]).toEqual([3, 3, 1]);
    // d leaves; e takes his slot
    em.intruderLeft('d');
    const g5 = guard(200, -10);
    em.enemies.push(E(g5));
    g5.ctx = gs[0]!.ctx;
    sees(g5, player('e', 200, 0));
    expect(em.intruders.find('e')).toBe(3);
    // nothing left that would make them hunt e when they go to combat (enemy.ts: hunt = pendingHunt); b's tell kept
    expect([pend(told), pend(rein), pend(other)]).toEqual([-1, -1, 1]);
    expect([told.hunt, rein.hunt]).toEqual([-1, -1]);
    // a later call about e tells them of e again (the new player, reported)
    told.radio(0, 3);
    expect(pend(told)).toBe(3);
  });

  it('check A F1: contact calls about the old player, open or queued, never deliver after the reuse', () => {
    const { em, gs, ctx, radio } = four();
    const calm = [guard(95, 5, { alerted: false, level: 'unaware' }), guard(85, 5, { alerted: false, level: 'unaware' })];
    for (const g of calm) {
      g.ctx = ctx;
      em.enemies.push(E(g));
    }
    // d's hunter calls d in; it gets through (receivers queued, staggered); a second call is still open
    ctx.radioCall!(E(gs[3]!), 3, 'contact');
    radio(RADIO.callIn + 0.05);
    expect(em.radioNet.queued).toBeGreaterThan(0);
    ctx.radioCall!(E(gs[2]!), 3, 'contact');
    ctx.radioCall!(E(gs[1]!), 1, 'contact');
    expect(em.radioNet.openCalls).toBe(2);
    for (const g of calm) g.radio.mockClear();
    // d leaves; e takes slot 3: the queued receivers and the open call about slot 3 are dropped
    em.intruderLeft('d');
    const g5 = guard(200, -10);
    em.enemies.push(E(g5));
    g5.ctx = ctx;
    sees(g5, player('e', 200, 0));
    expect(em.intruders.find('e')).toBe(3);
    expect(em.radioNet.openCalls).toBe(1);
    expect(em.radioNet.cancelled).toBeGreaterThan(1);
    radio(RADIO.callIn + RADIO.staggerMax + 1);
    for (const g of calm) {
      expect(g.radio).not.toHaveBeenCalledWith(0, 3);
      // b's call still gets through
      expect(g.radio).toHaveBeenCalledWith(0, 1);
    }
    expect((em as unknown as Rel).contactHunt).not.toBe(3);
  });

  it('a located shot and a heard step by a new id reuse the gone slot too', () => {
    const { em } = four();
    em.intruderLeft('b');
    em.noise(new Vector3(30, 0, 0), 5, 'e');
    expect(em.intruders.find('e')).toBe(1);
  });

  it('A170: at 2 live players no reuse (today: a new id with no free slot is reported nowhere)', () => {
    const { em, gs } = four(2);
    expect(em.coop4()).toBe(false);
    em.intruderLeft('d');
    const g5 = guard(200, -10);
    em.enemies.push(E(g5));
    g5.ctx = gs[0]!.ctx;
    sees(g5, player('e', 200, 0));
    expect([g5.hunt, em.intruders.find('e'), em.intruders.idOf(3), gs[3]!.hunt]).toEqual([-1, -1, 'd', 3]);
    // his rejoin still finds his slot
    sees(gs[3]!, player('d', 91, 0));
    expect([em.intruders.find('d'), em.intruders.gone[3]]).toEqual([3, 0]);
  });

  it('ghostOf: 0 none, 1 known, 2 show (unseen > 0.6 s and hunted); a read, never assigns', () => {
    const { em, gs } = four();
    const out = new Vector3();
    expect(em.ghostOf('nobody', out)).toBe(0);
    expect(em.intruders.find('nobody')).toBe(-1);
    // just seen: known, not shown
    expect(em.ghostOf('b', out)).toBe(1);
    expect([out.x, out.z]).toEqual([30, 0]);
    em.intruders.step(0.7);
    expect(em.ghostOf('b', out)).toBe(2);
    // nobody hunts him any more: known, not shown
    gs[1]!.hunt = -1;
    expect(em.ghostOf('b', out)).toBe(1);
    // forgotten: none
    em.intruders.forget(1);
    expect(em.ghostOf('b', out)).toBe(0);
  });
});

describe('coop4 AI4: the alarm draw, which intruders the reinforcements hunt (A174)', () => {
  type Alarm = { raiseAlarm(e: Enemy, p: null): void; alarmHunt: number; sendIn(e: Enemy): void };

  /** `live` players seen one second apart (a, then b, then c...: a's sighting the oldest); b's hunter raises the alarm. */
  function alarmed(live: number) {
    const ps = [player('a', 0, 0), player('b', 30, 0), player('c', 60, 0), player('d', 90, 0)].slice(0, live);
    const gs = ps.map((p) => guard(p.feet.x, -10));
    const m = manager(gs, ps);
    ps.forEach((p, i) => {
      if (i) m.em.intruders.step(1);
      sees(gs[i]!, p);
    });
    const pr = m.em as unknown as Alarm;
    pr.raiseAlarm(E(gs[1]!), null);
    /** One lone reinforcement joins (Sector Ops' `joinReinforcement`): the slot he is told to hunt. */
    const join = (): number => {
      const g = guard(40, 40, { alerted: false, level: 'unaware' });
      g.ctx = m.ctx;
      g.joinAsReinforcement = vi.fn();
      m.em.joinReinforcement(E(g), 0, null);
      expect(g.joinAsReinforcement).toHaveBeenCalledTimes(1);
      return g.joinAsReinforcement.mock.calls[0]![1] as number;
    };
    return { ...m, ps, gs, pr, join };
  }

  it("3 known, the alarm on slot 1: four lone reinforcements hunt 1, then the freshest (2), then 0, then 1 again", () => {
    const { em, pr, join } = alarmed(3);
    expect(em.coop4()).toBe(true);
    expect(pr.alarmHunt).toBe(1);
    expect(Array.from(em.intruders.seenT.subarray(0, 3))).toEqual([2, 1, 0]);
    expect([join(), join(), join(), join()]).toEqual([1, 2, 0, 1]);
  });

  it("the alarm's slot forgotten: the freshest first, then the rest", () => {
    const { em, join } = alarmed(3);
    em.intruders.forget(1);
    expect([join(), join(), join()]).toEqual([2, 0, 2]);
  });

  it('a player who left is not hunted; the alarm reset starts again at the alarm slot', () => {
    const { em, gs, pr, join } = alarmed(3);
    em.intruderLeft('c');
    expect([join(), join(), join()]).toEqual([1, 0, 1]);
    em.resetAlarm();
    pr.raiseAlarm(E(gs[1]!), null);
    expect(join()).toBe(1);
  });

  it('a guard spawned alerted (sendIn) takes the next one too', () => {
    const { em, pr } = alarmed(3);
    const told: number[] = [];
    for (let k = 0; k < 3; k++) {
      const g = guard(40, 40, { alerted: false, level: 'unaware' }) as FakeGuard & { alert(): void };
      g.ctx = (em as unknown as Priv).ctx;
      g.tell = vi.fn((s: number) => told.push(s));
      g.alert = () => {
        g.alerted = true;
      };
      pr.sendIn(E(g));
    }
    expect(told).toEqual([1, 2, 0]);
  });

  it('fewer than asked (the live cap refuses one): the order is kept, nothing is skipped', () => {
    const { em, join } = alarmed(3);
    em.maxAlive = 0;
    expect(em.spawnReinforcement('grunt', new Vector3(40, 0, 40), 0, 0, null)).toBeNull();
    expect([join(), join()]).toEqual([1, 2]);
  });

  it('A170: at 2 players every reinforcement hunts the alarm caller\'s intruder (today), even once it is forgotten', () => {
    const { em, pr, join } = alarmed(2);
    expect(em.coop4()).toBe(false);
    expect(pr.alarmHunt).toBe(1);
    expect([join(), join(), join(), join()]).toEqual([1, 1, 1, 1]);
    expect(em.nextAlarmHunt()).toBe(1);
    em.intruders.forget(1);
    expect([join(), join()]).toEqual([1, 1]);
  });
});

describe('coop4 AI5: response teams and fights with 4 (A174 / A176-A179)', () => {
  type Alarm = { raiseAlarm(e: Enemy, p: null): void; alarmHunt: number };
  type Team = SweepTeam<Enemy>;
  type Member = FakeGuard & { crew: Team | null; retell: ReturnType<typeof vi.fn> };

  /** `live` players seen one second apart (a the oldest); b's hunter raises the alarm (as AI4's `alarmed`). */
  function alarmed(live: number) {
    const ps = [player('a', 0, 0), player('b', 30, 0), player('c', 60, 0), player('d', 90, 0)].slice(0, live);
    const gs = ps.map((p) => guard(p.feet.x, -10));
    const m = manager(gs, ps);
    ps.forEach((p, i) => {
      if (i) m.em.intruders.step(1);
      sees(gs[i]!, p);
    });
    (m.em as unknown as Alarm).raiseAlarm(E(gs[1]!), null);
    /** Sector Ops' `fill` for one reinforcement: `joinReinforcement`, then `joinTeam` when he has a team. `told()`: the
     *  slot he ends up told (a retell replaces his draw). */
    const spawn = (t: Team | null): { g: Member; told: () => number } => {
      const g = guard(40, 40, { alerted: false, level: 'unaware' }) as Member;
      g.ctx = m.ctx;
      g.crew = null;
      g.joinAsReinforcement = vi.fn();
      g.retell = vi.fn();
      m.em.joinReinforcement(E(g), 0, null);
      if (t) m.em.joinTeam(E(g), t);
      const told = (): number => (g.retell.mock.calls.length ? (g.retell.mock.calls.at(-1)![0] as number) : (g.joinAsReinforcement!.mock.calls[0]![1] as number));
      return { g, told };
    };
    return { ...m, ps, gs, spawn };
  }

  it("A174 / A176: each team shares one intruder (its first member's draw); the others' draws go back to the split", () => {
    const { em, spawn } = alarmed(3);
    const tA = em.newTeam(0, null, [], []);
    const a = [spawn(tA), spawn(tA)];
    const tB = em.newTeam(0, null, [], []);
    const b = [spawn(tB), spawn(tB), spawn(tB)];
    expect([tA.hunt, tB.hunt]).toEqual([1, 2]);
    expect(a.map((m) => m.told())).toEqual([1, 1]);
    expect(b.map((m) => m.told())).toEqual([2, 2, 2]);
    // the first member is never retold; the later ones are, with the team's
    expect(a[0]!.g.retell).not.toHaveBeenCalled();
    expect(a[1]!.g.retell).toHaveBeenCalledWith(1);
    expect(b[2]!.g.retell).toHaveBeenCalledWith(2);
    // the round robin moved one per team: a lone reinforcement next hunts 0, the next team 1 again
    expect(spawn(null).told()).toBe(0);
    const tC = em.newTeam(0, null, [], []);
    expect([spawn(tC).told(), spawn(tC).told(), tC.hunt]).toEqual([1, 1, 1]);
    expect(tA.members.length + tB.members.length + tC.members.length).toBe(7);
  });

  it('fewer than asked (the cap refuses members): the team takes its hunt from the first member that spawns', () => {
    const { em, spawn } = alarmed(3);
    const tA = em.newTeam(0, null, [], []);
    em.maxAlive = 0;
    expect(em.spawnReinforcement('grunt', new Vector3(40, 0, 40), 0, 0, null)).toBeNull();
    em.maxAlive = 32;
    expect([spawn(tA).told(), tA.hunt]).toEqual([1, 1]);
    const tB = em.newTeam(0, null, [], []);
    expect([spawn(tB).told(), tB.hunt]).toEqual([2, 2]);
  });

  it("A170: at 2 players no team hunt, nobody retold: every member hunts the alarm caller's intruder (today)", () => {
    const { em, spawn } = alarmed(2);
    expect(em.coop4()).toBe(false);
    const tA = em.newTeam(0, null, [], []);
    const a = [spawn(tA), spawn(tA), spawn(tA)];
    expect(tA.hunt).toBe(-1);
    expect(a.map((m) => m.told())).toEqual([1, 1, 1]);
    for (const m of a) expect(m.g.retell).not.toHaveBeenCalled();
  });

  it("A176: from 3 players a team sweeps round its own intruder's last known position; unknown: the freshest; 2 players: the freshest", () => {
    for (const live of [4, 2]) {
      const { em, priv } = four(live);
      const t = em.newTeam(0, null, [], []);
      t.hunt = 2;
      const tick = vi.spyOn(t, 'tick').mockImplementation(() => undefined);
      const step = (): void => (priv as unknown as { teamsStep(): void }).teamsStep();
      step();
      // the mirror is the freshest: d (90, 0)
      expect(tick.mock.calls[0]).toEqual(live === 4 ? [true, 60, 0] : [true, 90, 0]);
      expect(t.peers).toBe(live === 4 ? em.teams : null);
      em.intruders.forget(2);
      step();
      expect(tick.mock.calls[1]).toEqual([true, 90, 0]);
    }
  });

  it('A177: newTeam passes the spread on (3 = today)', () => {
    const { em } = four();
    expect(em.newTeam(0, null, [], []).spread).toBe(3);
    const t = em.newTeam(0, null, [], [], 6);
    expect([t.index, t.spread]).toEqual([1, 6]);
  });

  it('a reused slot drops its team hunt (the team sweeps round the freshest again)', () => {
    const { em, gs } = four();
    const t = em.newTeam(0, null, [], []);
    t.hunt = 3;
    em.intruderLeft('d');
    const g5 = guard(200, -10);
    em.enemies.push(E(g5));
    g5.ctx = gs[0]!.ctx;
    sees(g5, player('e', 200, 0));
    expect([em.intruders.find('e'), t.hunt]).toEqual([3, -1]);
  });

  it('A175: shapeResponse reads the live players, the cap room and the section override', () => {
    const out = { teams: 0, size: 0 };
    const four4 = four(4);
    four4.em.maxAlive = 32;
    // four stand-in guards alive: room 28
    expect(four4.em.shapeResponse(1, 2, out)).toEqual({ teams: 2, size: 4 });
    four4.em.maxAlive = 7;
    expect(four4.em.shapeResponse(1, 2, out)).toEqual({ teams: 1, size: 3 });
    four4.em.maxAlive = 32;
    four4.em.setResponseShape({ splitAt: Infinity });
    expect(four4.em.shapeResponse(1, 2, out)).toEqual({ teams: 1, size: 4 });
    four4.em.setResponseShape(null);
    expect(four4.em.shapeResponse(1, 2, out)).toEqual({ teams: 2, size: 4 });
    const two = four(2);
    expect(two.em.shapeResponse(1, 2, out)).toEqual({ teams: 1, size: 2 });
  });

  /** Four fights, two guards each, `live` players; covers round each player (or all round the origin: `shared`). */
  function fights(live: number, shared = false) {
    const ps = [player('a', 0, 0), player('b', 30, 0), player('c', 60, 0), player('d', 90, 0)];
    if (shared) ps.forEach((p, i) => p.feet.set(i * 2, 0, 0));
    const gs: FakeGuard[] = [];
    for (const p of ps) gs.push(guard(p.feet.x, -16), guard(p.feet.x + 2, -17));
    const covers = shared ? AROUND(0) : [...AROUND(0), ...AROUND(30), ...AROUND(60), ...AROUND(90)];
    const m = manager(gs, ps.slice(0, live), covers);
    // the real reservation as the guard takes his role's cover (`reserveCover`: `coverSet.owner`)
    for (const g of gs) {
      const set = g.setRole as unknown as (role: number, cover: number) => void;
      g.setRole = vi.fn((role: number, cover: number) => {
        set(role, cover);
        if (cover >= 0) m.ctx.reserveCover(E(g), cover);
      });
    }
    ps.forEach((p, i) => {
      sees(gs[2 * i]!, p);
      sees(gs[2 * i + 1]!, p);
    });
    const order: number[] = [];
    const pr = m.em as unknown as { rolesFor(s: number): boolean; targetCoverT(s: number): number; spottedStep(): void; rolesActive: boolean };
    const orig = pr.rolesFor.bind(m.em);
    pr.rolesFor = (s: number): boolean => {
      order.push(s);
      return orig(s);
    };
    return { ...m, ps, gs, order, pr };
  }

  it('A178: four fights, four groups, no cover taken twice; the first pick rotates each roles tick (2 players: slot 0 first)', () => {
    const { gs, roles, order, pr } = fights(4);
    roles();
    expect(pr.rolesActive).toBe(true);
    expect(order).toEqual([0, 1, 2, 3]);
    const taken = gs.map((g) => g.cover).filter((c) => c >= 0);
    expect(taken.length).toBeGreaterThanOrEqual(4);
    expect(new Set(taken).size).toBe(taken.length);
    order.length = 0;
    roles();
    roles();
    expect(order).toEqual([1, 2, 3, 0, 2, 3, 0, 1]);
    const two = fights(2);
    two.roles();
    two.roles();
    expect(two.order).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });

  it('S24 (b) with 4: four groups on one set of covers never share one, whichever picks first', () => {
    const { gs, roles } = fights(4, true);
    for (let k = 0; k < 4; k++) {
      roles();
      const taken = gs.map((g) => g.cover).filter((c) => c >= 0);
      expect(taken.length).toBeGreaterThan(0);
      expect(new Set(taken).size).toBe(taken.length);
    }
  });

  it("A178: the flank trigger reads the slot's own player's cover time (2 players: the longest of all, today)", () => {
    const { ps, pr } = fights(4);
    const c = ps[2] as unknown as { cover: unknown; coverT: number };
    c.cover = {};
    c.coverT = 12;
    expect([0, 1, 2, 3].map((s) => pr.targetCoverT(s))).toEqual([0, 0, 12, 0]);
    const two = fights(2);
    const b = two.ps[1] as unknown as { cover: unknown; coverT: number };
    b.cover = {};
    b.coverT = 7;
    expect([0, 1].map((s) => two.pr.targetCoverT(s))).toEqual([7, 7]);
  });

  it("A179: a player's spotted clears once no guard fights his slot (2 players: only once nobody fights at all)", () => {
    const { ps, gs, pr } = fights(4);
    expect(ps.map((p) => p.spotted)).toEqual([true, true, true, true]);
    gs[2]!.level = 'searching';
    gs[3]!.level = 'searching';
    pr.spottedStep();
    expect(ps.map((p) => p.spotted)).toEqual([true, false, true, true]);
    // a guard in combat on nobody in particular: nobody else clears
    gs[4]!.level = 'searching';
    gs[5]!.hunt = -1;
    pr.spottedStep();
    expect(ps.map((p) => p.spotted)).toEqual([true, false, true, true]);
    // nobody fights: all clear (today)
    for (const g of gs) g.level = 'searching';
    pr.spottedStep();
    expect(ps.map((p) => p.spotted)).toEqual([false, false, false, false]);
    const two = fights(2);
    two.gs[2]!.level = 'searching';
    two.gs[3]!.level = 'searching';
    two.pr.spottedStep();
    expect(two.ps.slice(0, 2).map((p) => p.spotted)).toEqual([true, true]);
  });
});

describe('coop4 AI5: 2-player identity (A170)', () => {
  type Flags = Record<string, number | boolean>;
  const ALL: Flags[] = [FIGHTS4 as unknown as Flags, SWEEP4 as unknown as Flags, RESPONSE_N as unknown as Flags];
  /** Every AI5 rule undone (its A175-A179 undo), or back to the defaults. */
  function rules(on: boolean): void {
    const [f, s, r] = ALL as [Flags, Flags, Flags];
    f.rotate = f.ownCover = f.spotted = on;
    s.own = s.dedupe = on;
    r.extraPerPlayer = on ? 1 : 0;
    r.splitAt = on ? 4 : Infinity;
  }

  /** One scripted 2-player fight and response through every AI5 path; the state it ends in. */
  function script(): unknown {
    const ps = [player('a', 0, 0), player('b', 30, 0)];
    const gs: FakeGuard[] = [];
    for (const p of ps) gs.push(guard(p.feet.x, -16), guard(p.feet.x + 2, -17), guard(p.feet.x - 2, -17));
    const m = manager(gs, ps);
    for (const g of gs) {
      const set = g.setRole as unknown as (role: number, cover: number) => void;
      g.setRole = vi.fn((role: number, cover: number) => {
        set(role, cover);
        if (cover >= 0) m.ctx.reserveCover(E(g), cover);
      });
    }
    ps.forEach((p, i) => gs.slice(3 * i, 3 * i + 3).forEach((g) => sees(g, p)));
    (ps[1] as unknown as { cover: unknown; coverT: number }).cover = {};
    (ps[1] as unknown as { coverT: number }).coverT = 9;
    const pr = m.em as unknown as { spottedStep(): void; teamsStep(): void; raiseAlarm(e: Enemy, p: null): void; roleIn: { targetCoverT: number } };
    const roles: unknown[] = [];
    for (let k = 0; k < 4; k++) {
      m.roles();
      roles.push(gs.map((g) => [g.role, g.cover]), pr.roleIn.targetCoverT);
    }
    // the alarm and two teams of reinforcements
    pr.raiseAlarm(E(gs[3]!), null);
    const told: number[] = [];
    const teams = [m.em.newTeam(0, null, [[[0, 0], [20, 0], [40, 0]]], []), m.em.newTeam(0, null, [[[0, 0], [20, 0], [40, 0]]], [])];
    for (const t of teams) {
      for (let k = 0; k < 3; k++) {
        const g = guard(40, 40, { alerted: false, level: 'unaware' }) as FakeGuard & { crew: unknown; retell: ReturnType<typeof vi.fn> };
        g.ctx = m.ctx;
        g.joinAsReinforcement = vi.fn((_r: unknown, h: number) => told.push(h));
        g.retell = vi.fn((h: number) => told.push(100 + h));
        m.em.joinReinforcement(E(g), 0, null);
        m.em.joinTeam(E(g), t);
      }
    }
    const ticks: unknown[] = [];
    for (const t of teams) vi.spyOn(t, 'tick').mockImplementation((v: boolean, x: number, z: number) => void ticks.push([v, x, z]));
    pr.teamsStep();
    // a sweep on: the second team's next point (no dedupe at 2 players)
    for (const t of teams) {
      t.begin(0, 0, 0, 0);
      t.next();
    }
    gs[0]!.level = 'searching';
    gs[1]!.level = 'searching';
    gs[2]!.level = 'searching';
    pr.spottedStep();
    const shape = m.em.shapeResponse(2, 2, { teams: 0, size: 0 });
    return {
      roles,
      told,
      ticks,
      teams: teams.map((t) => [t.hunt, t.start, t.point, t.busySkips, t.peers === null]),
      spotted: ps.map((p) => p.spotted),
      shape: { ...shape },
      hunts: gs.map((g) => g.hunt),
    };
  }

  it('every AI5 rule on (defaults) or undone: the same 2-player fight, alarm, teams, sweep and spotted', () => {
    rules(true);
    const on = script();
    rules(false);
    const off = script();
    rules(true);
    expect(on).toEqual(off);
    // and it did run through the paths
    const o = on as { told: number[]; ticks: unknown[]; spotted: boolean[] };
    expect(o.told).toEqual([1, 1, 1, 1, 1, 1]);
    expect(o.ticks.length).toBe(2);
    expect(o.spotted).toEqual([true, true]);
  });
});
