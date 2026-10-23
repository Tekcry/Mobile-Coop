import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, TACTICS } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { RADIO } from '../src/ai/radioNet';
import { R_REPORTER, ROLES } from '../src/ai/squadRoles';
import { INTRUDERS } from '../src/ai/intruders';
import { Vector3, type Scene } from '../src/core/babylon';
import { Enemy, type AiContext, type PlayerRef } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S24, G139) Two intruders on a real EnemyManager with stand-in guards (as squadWiring): one last known
// position per player, each guard hunts the one he saw or was told of, one squad-roles group per intruder, a call names
// its intruder, a slot is forgotten only when nobody hunts it, a located shot reports its shooter's slot, and solo is
// today's one shared position.

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
}

let n = 0;
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 9400 + n++;
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
/** The real Enemy code on a stand-in: his own sighting (`takeSighting`), his contact call (`callContact`). */
const sees = (g: FakeGuard, p: PlayerRef) => (Enemy.prototype as unknown as { takeSighting(this: FakeGuard, p: PlayerRef): void }).takeSighting.call(g, p);
const callContact = (g: FakeGuard) => (Enemy.prototype as unknown as { callContact(this: FakeGuard): void }).callContact.call(g);
const names = (gs: FakeGuard[]) => gs.map((g) => ROLES[g.role]);

describe('guard-ai S24: two intruders', () => {
  it('(a) A seen at (0, 0) and B at (30, 0) by different guards: two slots, each guard hunts his own sighting, lkp mirrors the later', () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const g1 = guard(0, -10);
    const g2 = guard(30, -10);
    const { em } = manager([g1, g2], [A, B]);
    sees(g1, A);
    sees(g2, B);
    const sa = em.intruders.slotFor('host');
    const sb = em.intruders.slotFor('guest');
    expect(sa).not.toBe(sb);
    expect([em.intruders.valid[sa], em.intruders.valid[sb]]).toEqual([1, 1]);
    expect([g1.hunt, g2.hunt]).toEqual([sa, sb]);
    expect(em.lkpOf(sa)!.x).toBe(0);
    expect(em.lkpOf(sb)!.x).toBe(30);
    // the old shared fields: the later sighting (B)
    expect([em.lkp.x, em.lkpValid, em.sightT, em.intruders.freshest]).toEqual([30, true, 0, sb]);
    expect(A.spotted && B.spotted).toBe(true);
    // a reused vector per slot (no allocation)
    expect(em.lkpOf(sa)).toBe(em.lkpOf(sa));
    expect(em.lkpOf(-1)).toBeNull();
  });

  it('(b) roles: one group per intruder, each scored against its own slot, its own reporter, no cover taken by both', () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const ga = [guard(0, -16), guard(2, -17), guard(-2, -17), guard(0, -19)];
    const gb = [guard(30, -16), guard(32, -17), guard(28, -17), guard(30, -19)];
    const { em, ctx, roles } = manager([...ga, ...gb], [A, B]);
    for (const g of ga) sees(g, A);
    for (const g of gb) sees(g, B);
    ctx.radioCall!(E(ga[3]!), ga[3]!.hunt, 'contact');
    ctx.radioCall!(E(gb[3]!), gb[3]!.hunt, 'contact');
    roles();
    expect(names(ga)).toEqual(['point', 'overwatch', 'flank', 'reporter']);
    expect(names(gb)).toEqual(['point', 'overwatch', 'flank', 'reporter']);
    expect(ga.map((g) => g.cover)).toEqual([0, 1, 2, 3]);
    expect(gb.map((g) => g.cover)).toEqual([5, 6, 7, 8]);
    const taken = [...ga, ...gb].map((g) => g.cover).filter((c) => c >= 0);
    expect(new Set(taken).size).toBe(taken.length);
    expect(gb.find((g) => g.role === R_REPORTER)).toBe(gb[3]);
    expect((em as unknown as { rolesActive: boolean }).rolesActive).toBe(true);
  });

  it('(c) G139: a contact call by a guard hunting B tells every receiver of B only; a voice shout the same', () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const ha = guard(0, -10);
    const hb = guard(30, -10);
    const calm = [guard(10, 0, { alerted: false, level: 'unaware' }), guard(20, 5, { alerted: false, level: 'unaware' })];
    const { em, radio } = manager([ha, hb, ...calm], [A, B]);
    sees(ha, A);
    sees(hb, B);
    const sa = em.intruders.slotFor('host');
    const sb = em.intruders.slotFor('guest');
    callContact(hb);
    radio(RADIO.callIn + RADIO.staggerMax + 1);
    for (const g of calm) {
      expect(g.radio).toHaveBeenCalledWith(0, sb);
      expect(g.radio).not.toHaveBeenCalledWith(0, sa);
    }
    // the shout (voice model, 6 m in the open) names the shouter's intruder too
    const near = guard(31, -12, { alerted: false, level: 'unaware' });
    em.enemies.push(E(near));
    (em as unknown as Priv).ctx.shout!(E(hb));
    expect(near.radio).toHaveBeenCalledWith(RADIO.voiceDelay, sb);
  });

  it('(c2) Enemy.radio / tell: calm, the first intruder told is taken on going to combat; alerted with none, at once', () => {
    const e = Object.create(Enemy.prototype) as Enemy;
    Object.assign(e, { health: { alive: true }, aware: { alert: false }, called: 0, hunt: -1, pendingHunt: -1 });
    const p = e as unknown as { pendingHunt: number; called: number };
    e.radio(0, 1);
    e.radio(0, 0);
    expect([e.hunt, p.pendingHunt]).toEqual([-1, 1]);
    expect(p.called).toBeGreaterThan(0);
    Object.assign(e, { aware: { alert: true } });
    e.tell(2);
    e.tell(3);
    expect(e.hunt).toBe(2);
  });

  it("(d) A's slot is forgotten only when nobody hunts it (B's hunters still searching do not hold it)", () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const ha = guard(0, -10);
    const hb = guard(30, -10);
    const { em, priv } = manager([ha, hb], [A, B]);
    sees(ha, A);
    sees(hb, B);
    const sa = em.intruders.slotFor('host');
    const sb = em.intruders.slotFor('guest');
    em.intruders.step(INTRUDERS.forget + 0.5);
    // A's hunter searching: A is held
    ha.alerted = false;
    ha.level = 'searching';
    hb.alerted = false;
    hb.level = 'searching';
    priv.forgetStep();
    expect([em.intruders.valid[sa], em.intruders.valid[sb]]).toEqual([1, 1]);
    // A's hunter calm again (his hunt ends): A is forgotten, B is not; the mirror stays on B
    ha.level = 'cooldown';
    ha.hunt = -1;
    priv.forgetStep();
    expect([em.intruders.valid[sa], em.intruders.valid[sb]]).toEqual([0, 1]);
    expect([em.lkpValid, em.lkp.x, em.huntingOf(sb), em.huntingOf(sa)]).toEqual([true, 30, true, false]);
    expect(em.hunting).toBe(true);
  });

  it('(e) a located shot with `by` = B reports B; the hearers sent by it hunt B; null reports the freshest', () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const ha = guard(0, -10);
    const near = guard(31, 2, { alerted: false, level: 'unaware' });
    const { em } = manager([ha, near], [A, B]);
    em.coordinated = false;
    sees(ha, A);
    const sa = em.intruders.slotFor('host');
    const sb = em.intruders.slotFor('guest');
    em.noise(new Vector3(30, 0, 1), 10, 'guest');
    expect(em.lkpOf(sb)!.z).toBe(1);
    expect(near.hearGunfire).toHaveBeenCalled();
    expect(near.tell).toHaveBeenCalledWith(sb);
    // located, not seen: B's clock is not reset
    expect(em.intruders.seenT[sb]).toBe(99);
    expect([em.intruders.freshest, em.lkp.x]).toEqual([sb, 30]);
    // A's position untouched
    expect(em.lkpOf(sa)!.x).toBe(0);
    // a parked caller (no shooter): the freshest (B)
    em.noise(new Vector3(32, 0, 3), 10);
    expect(em.lkpOf(sb)!.x).toBe(32);
    expect(em.lkpOf(sa)!.x).toBe(0);
  });

  it('(f) one player: lkp, lkpValid, sightT and roles as the old shared path (solo parity)', () => {
    const P = player('local', 0, 0);
    const gs = [guard(0, -16), guard(2, -17), guard(-2, -17), guard(0, -19)];
    const { em, ctx, roles, priv } = manager(gs, [P]);
    expect([em.lkpValid, em.sightT]).toEqual([false, 99]);
    for (const g of gs) sees(g, P);
    expect(gs.map((g) => g.hunt)).toEqual([0, 0, 0, 0]);
    expect([em.lkp.x, em.lkp.z, em.lkpValid, em.sightT, em.intruders.freshest]).toEqual([0, 0, true, 0, 0]);
    // the old roles (squadWiring's 4-guard contact)
    ctx.radioCall!(E(gs[3]!), gs[3]!.hunt, 'contact');
    expect(em.contactCaller).toBe(gs[3]!.num);
    roles();
    expect(names(gs)).toEqual(['point', 'overwatch', 'flank', 'reporter']);
    expect(gs.map((g) => g.cover)).toEqual([0, 1, 2, 3]);
    // a shot located 1 s later (the clocks as `update` steps them): the one position moves, not the sight clock
    const tick = (dt: number) => {
      em.sightT += dt;
      em.intruders.step(dt);
      priv.forgetStep();
    };
    tick(1);
    em.coordinated = false;
    em.noise(new Vector3(1, 0, 2), 30);
    expect([em.lkp.x, em.lkp.z, em.lkpValid]).toEqual([1, 2, true]);
    expect(em.sightT).toBeCloseTo(1, 5);
    // still hunted: kept past 2 s
    tick(1.5);
    expect(em.lkpValid).toBe(true);
    // nobody hunting any more and not seen for 2 s: forgotten (the old rule)
    for (const g of gs) {
      g.alerted = false;
      g.level = 'unaware';
    }
    tick(0.1);
    expect([em.lkpValid, em.intruders.freshest]).toEqual([false, -1]);
  });

  it('(g) stealth: one chase field per intruder, at most one rebuild per update, only on a move of a nav cell', () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const ha = guard(0, -10);
    const hb = guard(30, -10);
    const { em, priv, flowField } = manager([ha, hb], [A, B]);
    em.stealth = true;
    // (the constructor built the parked field for both players)
    flowField.mockClear();
    sees(ha, A);
    sees(hb, B);
    priv.slotFlowStep(0.1);
    expect(flowField).toHaveBeenCalledTimes(1);
    priv.slotFlowStep(0.1);
    expect(flowField).toHaveBeenCalledTimes(2);
    const fa = em.flowOf(em.intruders.slotFor('host'));
    const fb = em.flowOf(em.intruders.slotFor('guest'));
    expect(fa).not.toBe(fb);
    expect(flowField.mock.calls[0]![1]).toBe(fa);
    expect(flowField.mock.calls[1]![1]).toBe(fb);
    // the same goal array, filled in place
    expect(flowField.mock.calls[0]![0]).toBe(flowField.mock.calls[1]![0]);
    // no move: no rebuild; under a cell: none; a cell after FLOW_MIN: one
    for (let k = 0; k < 10; k++) priv.slotFlowStep(0.1);
    expect(flowField).toHaveBeenCalledTimes(2);
    A.feet.x = 0.3;
    sees(ha, A);
    priv.slotFlowStep(0.1);
    expect(flowField).toHaveBeenCalledTimes(2);
    A.feet.x = 0.8;
    sees(ha, A);
    priv.slotFlowStep(0.1);
    expect(flowField).toHaveBeenCalledTimes(3);
    // no hunt: the freshest intruder's field (A, reported last)
    expect(em.flowOf(-1)).toBe(fa);
  });
});
