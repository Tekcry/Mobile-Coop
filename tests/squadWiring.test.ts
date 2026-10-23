import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, TACTICS } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { RADIO } from '../src/ai/radioNet';
import { combatSeed, P_AGGRESSIVE, P_POST, P_STANDARD, R_FLANK, R_NONE, R_OVERWATCH, R_POINT, R_REPORTER, R_SEARCH, ROLES } from '../src/ai/squadRoles';
import { Vector3, type Scene } from '../src/core/babylon';
import { Enemy, type AiContext, type PlayerRef } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S8) Squad roles wired into EnemyManager (design 8) on stand-in guards: the engaged group gets reporter /
// point / overwatch / flank on the level's cover, a lone guard and guards outside the group keep today's tactics, the
// overwatch's low cover needs a view of the last known position, reservations mirror into the cover set, a point and a
// flanker never start moving while the other is on its way, the reporter is held down while his call is open, and
// each guard's combat dice are seeded per engagement.

interface FakeGuard {
  id: string;
  num: number;
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
  moving: boolean;
  mates: boolean;
  onRadio: boolean;
  setRole: ReturnType<typeof vi.fn>;
  radio: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
  setPost?: ReturnType<typeof vi.fn>;
  setGear?: ReturnType<typeof vi.fn>;
  profile?: string;
  section?: number;
  /** (guard-ai S24) The intruder slot he fights (one player here: slot 0). */
  hunt: number;
}

let n = 0;
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 8000 + n++;
  const g: FakeGuard = {
    id: `s${num}`,
    num,
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
    role: R_NONE,
    cover: -1,
    moving: false,
    mates: false,
    onRadio: false,
    setRole: vi.fn(),
    radio: vi.fn(),
    bark: vi.fn(),
    hunt: 0,
    ...o,
  };
  g.setRole = vi.fn((role: number, cover: number, moving: boolean, _run: boolean, mates: boolean, onRadio: boolean) => {
    g.role = role;
    g.cover = cover;
    g.moving = moving;
    g.mates = mates;
    g.onRadio = onRadio;
  });
  return g;
}

/** A cover point at (x, z) whose protected side faces the LKP at the origin. */
function cp(x: number, z: number, low = false) {
  const l = Math.sqrt(x * x + z * z);
  return { pos: new Vector3(x, 0, z), normal: new Vector3(-x / l, 0, -z / l), low, seg: 0, s: 0 };
}

// The squadRoles.test layout: LKP at the origin; c0 point (7 m), c1 overwatch (~12 m), c2 flank (~72 deg off c0),
// c3 reporter (~17.5 m), c4 a decoy too close to the point's bearing to flank from.
const COVERS = [cp(0, -7), cp(1, -12), cp(12, -4), cp(1, -17.5), cp(3, -9)];

function manager(gs: FakeGuard[], covers = COVERS, sees: (from: Vector3) => boolean = () => true) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: covers, coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn((a: Vector3) => sees(a));
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  const priv = em as unknown as { ctx: AiContext; rolesStep(dt: number): void; radioStep(dt: number): void };
  // (guard-ai S24) the one player seen at the origin: intruder slot 0 (the guards hunt it), mirrored into `lkp`
  expect(priv.ctx.reportSighting({ id: 'p1', feet: new Vector3(0, 0, 0) } as unknown as PlayerRef)).toBe(0);
  expect(em.lkpValid).toBe(true);
  return { em, ctx: priv.ctx, roles: () => priv.rolesStep(TACTICS.tick), radio: (s: number) => { for (let k = 0; k < Math.round(s / 0.1); k++) priv.radioStep(0.1); }, clear };
}

const E = (g: FakeGuard) => g as unknown as Enemy;
const names = (gs: FakeGuard[]) => gs.map((g) => ROLES[g.role]);

describe('squad roles wired (coordinated)', () => {
  it('a 4-guard contact: the caller reports, one point, one overwatch, one flank, each on its own cover', () => {
    const a = guard(0, -16);
    const b = guard(2, -17);
    const c = guard(-2, -17);
    const d = guard(0, -19);
    const { ctx, roles } = manager([a, b, c, d]);
    ctx.radioCall!(E(d), -1, 'contact');
    roles();
    expect(names([a, b, c, d])).toEqual(['point', 'overwatch', 'flank', 'reporter']);
    expect([a.cover, b.cover, c.cover, d.cover]).toEqual([0, 1, 2, 3]);
    // the reporter is held down while his call is open
    expect(d.onRadio).toBe(true);
  });

  it("the reporter's hold ends when his call gets through", () => {
    const gs = [guard(0, -16), guard(2, -17), guard(-2, -17), guard(0, -19)];
    const { ctx, roles, radio } = manager(gs);
    ctx.radioCall!(E(gs[3]!), -1, 'contact');
    roles();
    expect(gs[3]!.onRadio).toBe(true);
    radio(RADIO.callIn + 0.3);
    roles();
    expect(gs[3]!.role).toBe(R_REPORTER);
    expect(gs[3]!.onRadio).toBe(false);
  });

  it('the first caller of an engagement stays the reporter; a new caller takes over once he is down', () => {
    const gs = [guard(0, -16), guard(2, -17), guard(-2, -17), guard(0, -19)];
    const { em, ctx } = manager(gs);
    ctx.radioCall!(E(gs[3]!), -1, 'contact');
    ctx.radioCall!(E(gs[0]!), -1, 'contact');
    expect(em.contactCaller).toBe(gs[3]!.num);
    gs[3]!.alive = false;
    ctx.radioCall!(E(gs[0]!), -1, 'contact');
    expect(em.contactCaller).toBe(gs[0]!.num);
  });

  it('a lone guard, guards outside the group and the parked rules keep today tactics (R_NONE)', () => {
    const lone = guard(0, -16);
    const one = manager([lone]);
    one.roles();
    expect(lone.role).toBe(R_NONE);
    // melee, a dog handler's dog, a held room, passive, a sniper: not in the group; two free guards are
    const free = [guard(0, -16), guard(2, -17)];
    const out = [guard(-2, -17, { def: { melee: {}, kind: 'runner', scale: 1, usesCover: false } }), guard(0, -19, { hold: {} }), guard(1, -18, { passive: true }), guard(3, -18, { def: { melee: null, kind: 'sniper', scale: 1, usesCover: true } })];
    const m = manager([...free, ...out]);
    m.roles();
    expect(names(free)).toEqual(['point', 'overwatch']);
    for (const g of out) expect(g.role).toBe(R_NONE);
    // the fight is over: roles drop back
    for (const g of free) g.alerted = false;
    m.roles();
    for (const g of free) expect(g.role).toBe(R_NONE);
    expect(m.em.contactCaller).toBe(-1);
  });

  it('the single flanker gives way only while a group has roles (a lone guard keeps it)', () => {
    const lone = manager([guard(0, -16)]);
    lone.roles();
    expect((lone.em as unknown as { rolesActive: boolean }).rolesActive).toBe(false);
    const pair = manager([guard(0, -16), guard(2, -17)]);
    pair.roles();
    expect((pair.em as unknown as { rolesActive: boolean }).rolesActive).toBe(true);
  });

  it('no shared last known position: no roles', () => {
    const gs = [guard(0, -16), guard(2, -17)];
    const { em, roles } = manager(gs);
    // (guard-ai S24) their intruder's position forgotten
    em.intruders.forget(0);
    roles();
    for (const g of gs) expect(g.role).toBe(R_NONE);
  });

  it('a closing point leaves the group; it is cleared when he leaves combat', () => {
    const gs = [guard(0, -16), guard(2, -17), guard(-2, -17)];
    const { roles } = manager(gs);
    gs[0]!.closing = true;
    roles();
    expect(gs[0]!.role).toBe(R_NONE);
    gs[0]!.alerted = false;
    roles();
    expect(gs[0]!.closing).toBe(false);
  });

  it("the overwatch's low cover must see the last known position: a blind one is blocked for a while", () => {
    // c1 (low) has no view; c5 (low, ~12 m the other side) does
    const covers = [cp(0, -7), cp(1, -12, true), cp(12, -4), cp(1, -17.5), cp(3, -9), cp(-3, -11.5, true)];
    const gs = [guard(0, -16), guard(2, -17)];
    let blind = true;
    const { em, roles, clear } = manager(gs, covers, (from) => !blind || Math.abs(from.x - 1) > 0.01);
    roles();
    expect(gs[1]!.role).toBe(R_OVERWATCH);
    expect(gs[1]!.cover).toBe(5);
    expect(em.coverSet.block[1]).toBe(1);
    expect(clear).toHaveBeenCalled();
    // the block wears off (and c1 is not blocked again once it has a view)
    blind = false;
    for (let t = 0; t < TACTICS.blockS + TACTICS.tick; t += TACTICS.tick) roles();
    expect(em.coverSet.block[1]).toBe(0);
  });

  it('reservations mirror into the cover set (owner = guard num); taken covers are skipped by the picks', () => {
    const gs = [guard(0, -16), guard(2, -17)];
    const other = guard(30, 30, { alerted: false, level: 'unaware' });
    // (without the c4 decoy, which is in the point band too)
    const { em, ctx, roles } = manager([...gs, other], COVERS.slice(0, 4));
    expect(ctx.reserveCover(E(other), 0)).toBe(true);
    expect(em.coverSet.owner[0]).toBe(other.num);
    roles();
    // c0 is the only point cover and someone else holds it: no standard point (no cover path)
    expect(gs.some((g) => g.role === R_POINT)).toBe(false);
    ctx.releaseCover(E(other));
    expect(em.coverSet.owner[0]).toBe(-1);
    roles();
    expect(gs[0]!.role).toBe(R_POINT);
  });

  it('point and flank: the one already on its way finishes before the other starts', () => {
    const gs = [guard(0, -16), guard(2, -17), guard(-2, -17)];
    const { roles } = manager(gs);
    // overwatch in its cover: the point may bound, the flank waits for it
    gs[1]!.state = 'inCover';
    gs[1]!.coverIdx = 1;
    roles();
    expect(names(gs)).toEqual(['point', 'overwatch', 'flank']);
    expect(gs[0]!.moving).toBe(true);
    expect(gs[2]!.moving).toBe(false);
    // the flank is already on its way (it started while the point held): the point waits, the overwatch covers
    gs[2]!.state = 'seekCover';
    roles();
    expect(gs[0]!.moving).toBe(false);
    expect(gs[1]!.mates).toBe(true);
    // aggressive: point and flank may both go (an aggressive group fills the flank before the overwatch)
    gs[0]!.tacticsProfile = P_AGGRESSIVE;
    roles();
    expect(gs[0]!.role).toBe(R_POINT);
    expect(gs[0]!.moving).toBe(true);
    const fl = gs.find((g) => g.role === R_FLANK);
    expect(fl && (fl.moving || fl.state === 'seekCover')).toBe(true);
  });

  it('the combat dice: one seed per guard per engagement, a new engagement when nobody else is in combat', () => {
    const a = guard(0, -16, { alerted: false });
    const b = guard(2, -17, { alerted: false });
    const { em, ctx } = manager([a, b]);
    const e0 = em.engagement;
    a.alerted = true;
    const sa = ctx.combatSeed!(E(a));
    expect(em.engagement).toBe(e0 + 1);
    expect(sa).toBe(combatSeed(em.matchSeed, e0 + 1, a.num));
    // b joins the same fight
    b.alerted = true;
    const sb = ctx.combatSeed!(E(b));
    expect(em.engagement).toBe(e0 + 1);
    expect(sb).not.toBe(sa);
    // later, a fresh fight
    a.alerted = false;
    b.alerted = false;
    a.alerted = true;
    expect(ctx.combatSeed!(E(a))).toBe(combatSeed(em.matchSeed, e0 + 2, a.num));
  });

  it('no allocation per tick: the role buffers keep their identity over many ticks', () => {
    const gs = [guard(0, -16), guard(2, -17), guard(-2, -17), guard(0, -19)];
    const { em, ctx, roles } = manager(gs);
    ctx.radioCall!(E(gs[3]!), -1, 'contact');
    const priv = em as unknown as { roleIn: object; roleOut: object; roleMember: Int16Array };
    const ids = [priv.roleIn, priv.roleOut, priv.roleMember];
    for (let k = 0; k < 2000; k++) roles();
    expect([priv.roleIn, priv.roleOut, priv.roleMember]).toEqual(ids);
    expect(priv.roleMember).toBe(ids[2]);
  });
});

// (guard-ai S8 at the S5 merge) Profiles come from the map slots; a high-security post keeps his leash in a group.
describe('squad roles and posts (S5 wiring)', () => {
  it('placeSlot sets the profile: a post P_POST, an aggressive slot P_AGGRESSIVE, else P_STANDARD', () => {
    const g = guard(0, -16, { setPost: vi.fn(), setGear: vi.fn() });
    const { em } = manager([g]);
    em.placeSlot(E(g), { yaw: 0, post: { leash: 3, highSecurity: true } });
    expect(g.tacticsProfile).toBe(P_POST);
    em.placeSlot(E(g), { yaw: 0, post: { leash: 3 }, profile: 'aggressive' });
    expect(g.tacticsProfile).toBe(P_POST);
    em.placeSlot(E(g), { yaw: 0, profile: 'aggressive' });
    expect(g.tacticsProfile).toBe(P_AGGRESSIVE);
    em.placeSlot(E(g), { yaw: 0 });
    expect(g.tacticsProfile).toBe(P_STANDARD);
  });

  it('a woken guard keeps his profile (Enemy.inherit)', () => {
    const old = { key: 3, squad: 1, hold: null, passive: false, info: null, post: [4, 5], postDef: { leash: 3, highSecurity: true }, postYaw: 1, section: 2, profile: 'standard', tacticsProfile: P_POST, walker: { tick: vi.fn(), rejoin: vi.fn() } };
    const e = Object.create(Enemy.prototype) as Enemy;
    Object.assign(e, { post: [0, 0], pos: new Vector3(4, 0, 5), tacticsProfile: P_STANDARD, setPost: vi.fn(), setCaution: vi.fn() });
    e.inherit(old as unknown as Enemy, 0);
    expect(e.tacticsProfile).toBe(P_POST);
  });

  it('posted guards in a group never take point or flank (P_POST weights 0)', () => {
    const a = guard(0, -16, { tacticsProfile: P_POST });
    const b = guard(2, -17);
    const c = guard(-2, -17, { tacticsProfile: P_POST });
    const d = guard(0, -19);
    const { ctx, roles } = manager([a, b, c, d]);
    ctx.radioCall!(E(d), -1, 'contact');
    roles();
    for (const g of [a, c]) expect([R_POINT, R_FLANK]).not.toContain(g.role);
    expect(b.role).toBe(R_POINT);
    expect(d.role).toBe(R_REPORTER);
  });

  it('a high-security post drops a role cover outside his leash and never bounds as point / flank (Enemy.setRole)', () => {
    // posted at c1 (1, -12), leash 3: c1 inside, c3 (1, -17.5) and c0 (0, -7) outside
    const e = Object.create(Enemy.prototype) as Enemy;
    Object.assign(e, { postDef: { leash: 3, highSecurity: true }, post: [1, -12], ctx: { cover: COVERS }, mateMoving: false, bark: vi.fn() });
    const p = e as unknown as { roleCover: number; roleMoving: boolean; roleRun: boolean };
    e.setRole(R_OVERWATCH, 1, true, true, false, false);
    expect([e.role, p.roleCover, p.roleMoving]).toEqual([R_OVERWATCH, 1, true]);
    e.setRole(R_REPORTER, 3, true, true, false, false);
    expect([e.role, p.roleCover, p.roleMoving, p.roleRun]).toEqual([R_REPORTER, -1, false, false]);
    e.setRole(R_POINT, 0, true, true, false, false);
    expect([e.role, p.roleCover, p.roleMoving]).toEqual([R_SEARCH, -1, false]);
    // a normal post (not high security) keeps any cover
    (e as unknown as { postDef: object }).postDef = { leash: 3 };
    e.setRole(R_REPORTER, 3, true, false, false, false);
    expect([e.role, p.roleCover, p.roleMoving]).toEqual([R_REPORTER, 3, true]);
  });
});
