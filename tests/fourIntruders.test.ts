import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, TACTICS } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { COOP4 } from '../src/ai/intruders';
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

function manager(gs: FakeGuard[], players: PlayerRef[]) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: COVERS, coverSegments: [] },
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
