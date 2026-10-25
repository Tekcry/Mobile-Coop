import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, TACTICS } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { RADIO } from '../src/ai/radioNet';
import { R_REPORTER, ROLES, Rng } from '../src/ai/squadRoles';
import { AlertMachine } from '../src/ai/alertState';
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

/**
 * (S24 fix) A stand-in on the radio net (`netOn`) running the real `callContact` (his re-call on his first intruder),
 * whose `radio` is the real rule (`tell`: in combat with none, at once), with the fields `knownSpot` reads.
 */
function netGuard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const g = guard(x, z, o) as FakeGuard & Record<string, unknown>;
  const proto = Enemy.prototype as unknown as Record<string, unknown>;
  Object.assign(g, { netOn: true, sawOnce: false, hasStimulus: false, stimulus: [0, 0], lastKnown: new Vector3(), knownV: new Vector3() });
  g.huntPos = proto.huntPos;
  g.callContact = () => callContact(g);
  const tell = g.tell as unknown as (s: number) => void;
  g.radio = vi.fn((_d: number, s: number) => tell(s));
  g.joinAsReinforcement = vi.fn();
  return g;
}

/** The real `Enemy.knownSpot`: where he goes out of sight (his intruder's last known position, else his own spot). */
const spot = (g: FakeGuard, t: PlayerRef) => (Enemy.prototype as unknown as { knownSpot(this: FakeGuard, t: PlayerRef): Vector3 }).knownSpot.call(g, t);

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

  it('(h) S24 fix: a contact with no intruder, then the caller sees B: every alerted joiner hunts B and goes for its spot (G139: never A)', () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const ha = guard(0, -10);
    const c = netGuard(30, -14);
    const far = netGuard(30, 10);
    const near = netGuard(32, -14);
    const { em, radio } = manager([ha, c, far, near], [A, B]);
    sees(ha, A);
    const sa = em.intruders.slotFor('host');
    const sb = em.intruders.slotFor('guest');
    // c went to combat with no intruder (shot from the dark): his shout and call name nobody; they join with none
    callContact(c);
    radio(RADIO.callIn + RADIO.staggerMax + 1);
    expect(far.radio).toHaveBeenCalledWith(0, -1);
    expect([c.hunt, far.hunt, near.hunt]).toEqual([-1, -1, -1]);
    expect([spot(far, B).x, spot(far, B).z]).toEqual([30, 10]);
    // c sees B: he names him again; the guard in voice range takes it at once, the far one when the call gets through
    sees(c, B);
    expect([c.hunt, near.hunt, far.hunt]).toEqual([sb, sb, -1]);
    radio(RADIO.callIn + RADIO.staggerMax + 1);
    expect(far.radio).toHaveBeenCalledWith(0, sb);
    expect(far.hunt).toBe(sb);
    expect([spot(far, B).x, spot(far, B).z]).toEqual([30, 0]);
    expect(spot(near, B)).toBe(em.lkpOf(sb));
    expect(ha.hunt).toBe(sa);
    for (const g of [c, far, near]) expect(g.radio).not.toHaveBeenCalledWith(0, sa);
    // he made the call naming B: B's reporter
    expect((em as unknown as { callers: Int32Array }).callers[sb]).toBe(c.num);
    // a second sighting with an intruder already: no new call
    const calls = (em.radioNet as unknown as { nextId: number }).nextId;
    sees(c, B);
    expect((em.radioNet as unknown as { nextId: number }).nextId).toBe(calls);
  });

  it('(f2) solo parity: guards in combat with no intruder (a shot from the dark) converge once anyone sees the player', () => {
    const P = player('local', 0, 0);
    const v = netGuard(0, -16);
    const js = [netGuard(2, -17), netGuard(-2, -17.5), netGuard(0, -19)];
    const rf = netGuard(40, 40, { alerted: false, level: 'unaware' });
    const all = [v, ...js];
    const { em, roles, radio, priv } = manager([...all, rf], [P]);
    const pr = em as unknown as { raiseAlarm(e: Enemy, p: null): void; alarmHunt: number };
    // the victim's call names nobody; his squad joins with none (they stand where they are: no position)
    callContact(v);
    radio(RADIO.callIn + RADIO.staggerMax + 1);
    expect(all.map((g) => g.hunt)).toEqual([-1, -1, -1, -1]);
    expect(spot(js[2]!, P).z).toBe(-19);
    // command is called by one of them (no intruder yet): the alarm's reinforcements have none
    pr.raiseAlarm(E(js[2]!), null);
    expect(pr.alarmHunt).toBe(-1);
    // the victim walks over and sees the player: one position (slot 0), and he names it
    sees(v, P);
    radio(RADIO.callIn + RADIO.staggerMax + 1);
    // as the old shared path: every guard in the fight hunts it and goes for it
    expect(all.map((g) => g.hunt)).toEqual([0, 0, 0, 0]);
    expect([em.lkp.x, em.lkp.z, em.lkpValid, em.sightT]).toEqual([0, 0, true, 0]);
    for (const g of js) expect(spot(g, P)).toBe(em.lkpOf(0));
    // one roles group; (walk 4.82 item 2) the victim's call is through, so he takes a fighting role, not the reporter's
    roles();
    expect(names(all)).toEqual(['point', 'overwatch', 'search', 'flank']);
    // the reinforcements: the intruder the call named
    expect(pr.alarmHunt).toBe(0);
    em.joinReinforcement(E(rf), 0, null);
    expect(rf.joinAsReinforcement).toHaveBeenCalledWith(null, 0);
    // the victim goes down: his squad still fights it, slot 0 is kept (the old rule: kept while anyone hunts)
    v.alive = false;
    em.sightT += 3;
    em.intruders.step(3);
    priv.forgetStep();
    expect([em.lkpValid, em.huntingOf(0)]).toEqual([true, true]);
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

describe('guard-ai S24 levels triage: a guard spawned alerted is sent in on the intruder command knows of', () => {
  /** A calm stand-in with the real `Enemy.tell` and `knownSpot`; `alert()` as `onLevel('alert')` takes the told intruder. */
  function sent(x: number, z: number): FakeGuard {
    const g = netGuard(x, z, { alerted: false, level: 'unaware' }) as FakeGuard & Record<string, unknown>;
    const proto = Enemy.prototype as unknown as Record<string, unknown>;
    g.pendingHunt = -1;
    g.tell = proto.tell as unknown as FakeGuard['tell'];
    g.alert = () => {
      g.alerted = true;
      g.level = 'alert';
      if ((g.pendingHunt as number) >= 0) g.hunt = g.pendingHunt as number;
      g.pendingHunt = -1;
    };
    return g;
  }
  const sendIn = (em: EnemyManager, g: FakeGuard) => {
    g.ctx = (em as unknown as Priv).ctx;
    (em as unknown as { sendIn(e: Enemy): void }).sendIn(E(g));
  };

  it('(i) nobody known: no intruder (A148); one player seen: he hunts that slot and goes for its spot, not the feet', () => {
    const P = player('local', 0, 0);
    const seer = guard(0, -10);
    const { em } = manager([seer], [P]);
    const r0 = sent(40, 40);
    sendIn(em, r0);
    expect([r0.alerted, r0.hunt]).toEqual([true, -1]);
    expect([spot(r0, P).x, spot(r0, P).z]).toEqual([40, 40]);
    // the player is seen at (0, 0), then walks on: a guard spawned alerted now goes for the seen spot
    sees(seer, P);
    P.feet.set(5, 0, 9);
    const r1 = sent(40, 40);
    sendIn(em, r1);
    expect(r1.hunt).toBe(0);
    expect(spot(r1, P)).toBe(em.lkpOf(0));
    expect([spot(r1, P).x, spot(r1, P).z]).toEqual([0, 0]);
  });

  it("(i2) two intruders: the alarm's while its position is valid, else the freshest (A150); never one nobody reported", () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const ha = guard(0, -10);
    const hb = guard(30, -10);
    const { em } = manager([ha, hb], [A, B]);
    sees(ha, A);
    const sa = em.intruders.slotFor('host');
    // only A known: B is never named
    const r0 = sent(40, 40);
    sendIn(em, r0);
    expect(r0.hunt).toBe(sa);
    sees(hb, B);
    const sb = em.intruders.slotFor('guest');
    // no alarm: the freshest (B, seen last)
    const r1 = sent(40, 40);
    sendIn(em, r1);
    expect(r1.hunt).toBe(sb);
    // the alarm raised by A's hunter: A's
    (em as unknown as { raiseAlarm(e: Enemy, p: null): void }).raiseAlarm(E(ha), null);
    const r2 = sent(40, 40);
    sendIn(em, r2);
    expect(r2.hunt).toBe(sa);
    // A forgotten: the alarm's slot has no position, the freshest valid one (B)
    em.intruders.forget(sa);
    const r3 = sent(40, 40);
    sendIn(em, r3);
    expect(r3.hunt).toBe(sb);
  });
});

describe('guard-ai polish A4 / A15: calls on a switch and the real alert()', () => {
  /** A calm guard on the real Enemy prototype (`tell`, `alert`, `onLevel`, `callContact`, `takeSighting`, `netOn`) with
   *  the stand-in's fields, wired to the manager's ctx. */
  function realGuard(em: EnemyManager, x: number, z: number): Enemy {
    const fake = guard(x, z, { alerted: false, level: 'unaware' }) as unknown as Record<string, unknown>;
    const e = Object.create(Enemy.prototype) as Enemy;
    const proto = Enemy.prototype as unknown as object;
    for (const [k, v] of Object.entries(fake)) {
      if (k === 'radio' || k === 'tell') continue;
      let d: PropertyDescriptor | undefined;
      for (let o: object | null = proto; o && !d; o = Object.getPrototypeOf(o) as object | null) d = Object.getOwnPropertyDescriptor(o, k);
      if (d && d.get && !d.set) continue;
      (e as unknown as Record<string, unknown>)[k] = v;
    }
    Object.assign(e, {
      ctx: (em as unknown as Priv).ctx,
      aware: new AlertMachine(),
      health: { alive: true },
      alertIn: { called: false },
      lc: { stop() {}, active: false },
      lure: { cancel() {}, active: false },
      walker: { rejoin() {} },
      rng: new Rng(1),
      camBody: null,
      pendingHunt: -1,
      calledMask: 0,
      called: 0,
      brkGroup: -1,
      incident: -1,
      meter: 0,
      loudAlert: false,
      gunfire: false,
      target: null,
      los: false,
      state: 'idle',
      searchRoom: null,
      reviving: null,
      hasStimulus: false,
      sawOnce: false,
      stimulus: [0, 0],
      lastKnown: new Vector3(),
      knownV: new Vector3(),
      setState(this: { state: string }, st: string) {
        this.state = st;
      },
    });
    em.enemies.push(e);
    return e;
  }

  it('A4 / A166: hunting A, he sees B: one contact call naming B (B gets a reporter); no second call on B or back on A', () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const ha = netGuard(10, -10);
    const { em, radio } = manager([ha], [A, B]);
    sees(ha, A);
    const sa = em.intruders.slotFor('host');
    expect(ha.hunt).toBe(sa);
    const calls = () => (em.radioNet as unknown as { nextId: number }).nextId;
    const c0 = calls();
    sees(ha, B);
    const sb = em.intruders.slotFor('guest');
    expect(ha.hunt).toBe(sb);
    expect(calls()).toBe(c0 + 1);
    radio(RADIO.callIn + RADIO.staggerMax + 1);
    expect((em as unknown as { callers: Int32Array }).callers[sb]).toBe(ha.num);
    const c1 = calls();
    sees(ha, B);
    sees(ha, A);
    sees(ha, B);
    expect(calls()).toBe(c1);
  });

  it('A4: hunting A, told of B (a mate called him in), then he sees B: no call (B has his caller)', () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const ha = netGuard(10, -10);
    const { em, ctx } = manager([ha], [A, B]);
    sees(ha, A);
    const sb = ctx.reportSighting(B);
    (Enemy.prototype as unknown as { tell(this: FakeGuard, s: number): void }).tell.call(ha, sb);
    expect(ha.hunt).toBe(em.intruders.slotFor('host'));
    const calls = () => (em.radioNet as unknown as { nextId: number }).nextId;
    const c0 = calls();
    sees(ha, B);
    expect(ha.hunt).toBe(sb);
    expect(calls()).toBe(c0);
  });

  it('A15: the real alert() on a told calm guard hunts the told slot and his contact call names it', () => {
    const A = player('host', 0, 0);
    const { em, ctx } = manager([], [A]);
    const sa = ctx.reportSighting(A);
    const rc = vi.spyOn(ctx, 'radioCall');
    const e = realGuard(em, 4, -6);
    e.tell(sa);
    expect(e.hunt).toBe(-1);
    e.alert();
    expect([e.alerted, e.hunt]).toEqual([true, sa]);
    expect(rc).toHaveBeenCalledWith(e, sa, 'contact');
    // (the manager takes the caller at the call: `noteCaller`)
    expect((em as unknown as { callers: Int32Array }).callers[sa]).toBe(e.num);
  });

  it('A15: alerted with nobody named (-1), then he sees B: the re-call names B (the -1 -> slot step)', () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const { em, ctx } = manager([], [A, B]);
    ctx.reportSighting(A);
    const rc = vi.spyOn(ctx, 'radioCall');
    const e = realGuard(em, 28, -6);
    e.alert();
    expect(e.hunt).toBe(-1);
    expect(rc).toHaveBeenLastCalledWith(e, -1, 'contact');
    (Enemy.prototype as unknown as { takeSighting(this: Enemy, p: PlayerRef): void }).takeSighting.call(e, B);
    const sb = em.intruders.slotFor('guest');
    expect(e.hunt).toBe(sb);
    expect(rc).toHaveBeenLastCalledWith(e, sb, 'contact');
    expect((em as unknown as { callers: Int32Array }).callers[sb]).toBe(e.num);
  });
});

describe('(polish2 A187) told of A, he goes alert seeing B', () => {
  it('he hunts B and calls B in once (one contact naming B, callers[B] him); calledMask has A and B', () => {
    const A = player('host', 0, 0);
    const B = player('guest', 30, 0);
    const { em, ctx } = manager([], [A, B]);
    const sa = ctx.reportSighting(A);
    const sb = ctx.reportSighting(B);
    const rc = vi.spyOn(ctx, 'radioCall');
    // a calm guard on the real prototype (`tell`, `onLevel`, `takeSighting`, `callContact`), as A15's
    const fake = guard(28, -6, { alerted: false, level: 'unaware' }) as unknown as Record<string, unknown>;
    const e = Object.create(Enemy.prototype) as Enemy;
    for (const [k, v] of Object.entries(fake)) {
      if (k === 'radio' || k === 'tell') continue;
      let d: PropertyDescriptor | undefined;
      for (let o: object | null = Enemy.prototype; o && !d; o = Object.getPrototypeOf(o) as object | null) d = Object.getOwnPropertyDescriptor(o, k);
      if (d && d.get && !d.set) continue;
      (e as unknown as Record<string, unknown>)[k] = v;
    }
    Object.assign(e, {
      ctx, aware: new AlertMachine(), health: { alive: true }, alertIn: { called: false }, lc: { stop() {}, active: false },
      lure: { cancel() {}, active: false }, walker: { rejoin() {} }, rng: new Rng(1), camBody: null, pendingHunt: -1, calledMask: 0,
      called: 0, brkGroup: -1, incident: -1, meter: 0, loudAlert: false, gunfire: false, target: null, los: false, state: 'idle',
      searchRoom: null, reviving: null, hasStimulus: false, sawOnce: false, stimulus: [0, 0], lastKnown: new Vector3(), knownV: new Vector3(),
      setState(this: { state: string }, st: string) {
        this.state = st;
      },
    });
    em.enemies.push(e);
    // a mate's call about A reaches him (told A), and the call takes him to combat in a step where he sees B
    e.tell(sa);
    const p = e as unknown as { pendingHunt: number; alertIn: { called: boolean }; target: PlayerRef | null; los: boolean; calledMask: number; aware: AlertMachine; onLevel(a: string, b: string): void };
    expect(p.pendingHunt).toBe(sa);
    p.alertIn.called = true;
    p.target = B;
    p.los = true;
    p.aware.set('alert');
    p.onLevel('unaware', 'alert');
    expect(e.hunt).toBe(sb);
    const contacts = rc.mock.calls.filter((c) => c[2] === 'contact');
    expect(contacts.length).toBe(1);
    expect(contacts[0]![1]).toBe(sb);
    expect((em as unknown as { callers: Int32Array }).callers[sb]).toBe(e.num);
    expect(p.calledMask & (1 << sa)).toBeTruthy();
    expect(p.calledMask & (1 << sb)).toBeTruthy();
  });
});
