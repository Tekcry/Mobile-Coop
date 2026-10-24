import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, TACTICS } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { RADIO } from '../src/ai/radioNet';
import { combatSeed, P_AGGRESSIVE, P_POST, P_STANDARD, R_FLANK, R_NONE, R_OVERWATCH, R_POINT, R_REPORTER, R_SEARCH, ROLES, Rng, SQUAD } from '../src/ai/squadRoles';
import { ENEMIES } from '../src/ai/enemyDefs';
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
  roleBound: boolean;
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
    roleBound: false,
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

  it("the reporter's hold ends when his call gets through: (walk 4.82 item 2) he then takes a fighting role", () => {
    const gs = [guard(0, -16), guard(2, -17), guard(-2, -17), guard(0, -19)];
    const { ctx, roles, radio } = manager(gs);
    ctx.radioCall!(E(gs[3]!), -1, 'contact');
    roles();
    expect(gs[3]!.onRadio).toBe(true);
    radio(RADIO.callIn + 0.3);
    roles();
    // (guard-ai walk 4.82 item 2, Michael: "He should report then attack you instead of hiding") the reporter only while
    // his call is open: through, he is one of the group's fighting roles (was: R_REPORTER, held in cover for good)
    expect(gs[3]!.role).not.toBe(R_REPORTER);
    expect([R_POINT, R_OVERWATCH, R_FLANK, R_SEARCH]).toContain(gs[3]!.role);
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
    gs[2]!.coverIdx = gs[2]!.cover;
    gs[2]!.roleBound = true; // (polish B2) on its way = a role bound (Enemy.boundTo sets roleBound)
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

// (guard-ai S27) The role guard's own steps on Enemy's prototype (no rig, no scene; a stub ctx, a stub ballistics whose
// static ray is set blocked / clear, a stub cover list; the decide loop run at 60 Hz): out of sight in the open he
// crouches while he waits for the group and then takes today's cover pick (A161); the overwatch suppresses only along
// a clear line and never moves his own last known position (A162); the reporter throws and flanks nothing while his
// call is open (A163); R_NONE, a lone guard, `openWait` Infinity and `suppressView` false keep the S8 steps.
const DT = 1 / 60;
const sq = SQUAD as unknown as { openWait: number; suppressView: boolean };

interface Probe {
  e: Enemy;
  p: {
    state: string;
    stateT: number;
    wantCrouch: boolean;
    coverIdx: number;
    lastKnown: Vector3;
    lastSeenT: number;
    los: boolean;
    fireT: number;
    roundsFired: number;
    suppressRounds: number;
    suppressHeld: number;
    grenadeCd: number;
    decide(dt: number): { point: [number, number] | null; speed: number; face: number | null };
  };
  ctx: { reserveCover: ReturnType<typeof vi.fn>; throwGrenade: ReturnType<typeof vi.fn>; ballistics: { clear: ReturnType<typeof vi.fn> } };
  line: { clear: boolean };
  owner: number[];
  /** Steps of `decide` (stateT and the fire clock run as `update` runs them). */
  step(n?: number): { point: [number, number] | null; speed: number; face: number | null };
}

/** A grunt at (x, z) hunting intruder slot 0, whose last known position is the origin (the target there, unseen). */
function roleProbe(o: { role: number; cover?: number; moving?: boolean; mates?: boolean; onRadio?: boolean; covers?: ReturnType<typeof cp>[]; x?: number; z?: number; state?: string; targetCover?: object | null; coverT?: number }): Probe {
  const covers = o.covers ?? COVERS;
  const owner = covers.map(() => -1);
  const line = { clear: true };
  const lkp = new Vector3(0, 0, 0);
  const target = { id: 'p1', feet: new Vector3(0, 0, 0), speed: 0, crouched: false, cover: o.targetCover ?? null, coverT: o.coverT ?? 0, target: { aimPoint: (v: Vector3) => v.set(0, 1, 0), headPoint: (v: Vector3) => v.set(0, 1.6, 0) } };
  const e = Object.create(Enemy.prototype) as Enemy;
  const ctx = {
    cover: covers,
    coverSegments: [],
    nav: { findPath: vi.fn((_a: number[], b: number[]) => [[b[0], b[1]]]), isWalkable: () => true, cellOf: () => 0, lineClear: () => true },
    reserveCover: vi.fn((g: Enemy, i: number) => {
      if (owner[i] !== -1 && owner[i] !== g.num) return false;
      for (let k = 0; k < owner.length; k++) if (owner[k] === g.num) owner[k] = -1;
      owner[i] = g.num;
      return true;
    }),
    releaseCover: vi.fn((g: Enemy) => {
      for (let k = 0; k < owner.length; k++) if (owner[k] === g.num) owner[k] = -1;
    }),
    blockCover: vi.fn(),
    stealth: () => true,
    lkpOf: () => lkp,
    ballistics: { clear: vi.fn(() => line.clear), ray: vi.fn((_a: Vector3, b: Vector3) => ({ hit: false, point: b })), armouredFirst: () => false },
    vfx: { tracer: vi.fn(), muzzleFlash: vi.fn() },
    diff: DIFFICULTY.normal,
    players: () => [],
    throwGrenade: vi.fn(() => true),
    isFlanker: () => false,
    alarmRaised: () => false,
  };
  Object.assign(e, {
    ctx,
    def: ENEMIES.grunt,
    num: 9100 + n++,
    pos: new Vector3(o.x ?? 0, 0, o.z ?? -16),
    yaw: 0,
    aware: { alert: true, level: 'alert' },
    health: { alive: true },
    target,
    stagger: 0,
    los: false,
    losT: 0,
    losHead: false,
    dist: 16,
    lastSeenT: 5,
    lastKnown: new Vector3(3, 1.1, 3),
    sawOnce: true,
    hasStimulus: false,
    stimulus: [0, 0],
    knownV: new Vector3(),
    hunt: 0,
    alarm: null,
    entry: null,
    smelled: false,
    knownPt: [0, 0],
    advanceCd: 0,
    hold: null,
    postDef: null,
    post: [o.x ?? 0, o.z ?? -16],
    doorCheck: 0,
    role: R_NONE,
    roleCover: -1,
    roleMoving: false,
    roleRun: false,
    mateMoving: false,
    onRadio: false,
    closing: false,
    tacticsProfile: P_STANDARD,
    roleGoal: { point: null, speed: 0, face: null },
    coverIdx: -1,
    onRoleBound: false,
    state: o.state ?? 'chase',
    stateT: 0,
    coverPicked: false,
    armourPick: false,
    relocating: false,
    flanking: false,
    advancing: false,
    path: [],
    peekCycles: 0,
    fireGate: { blocked: false, moveT: 0, gate: () => false, plan: () => 'hold' },
    coverPose: 'none',
    coverPeek: 0,
    coverWallSide: 0,
    wantCrouch: false,
    crouch: 0,
    rng: new Rng(7),
    strafeT: 0,
    strafe: 1,
    blindPlan: false,
    grenadeCd: 0,
    carry: { drawn: true },
    shieldT: 0,
    burstLeft: 0,
    pauseT: 0,
    windup: 0,
    fireT: 0,
    roundsFired: 0,
    buff: false,
    shotsHere: 0,
    kick: 0,
    fireFrom: new Vector3(),
    fireTo: new Vector3(),
    openT: 0,
    openNoCover: false,
    suppressAim: new Vector3(),
    suppressing: false,
    suppressOk: false,
    suppressCheckT: 0,
    suppressRounds: 0,
    suppressHeld: 0,
    bark: vi.fn(),
  });
  e.setRole(o.role, o.cover ?? -1, o.moving ?? false, false, o.mates ?? false, o.onRadio ?? false);
  const p = e as unknown as Probe['p'];
  const step = (k = 1) => {
    let g = p.decide(DT);
    for (let i = 1; i < k; i++) {
      p.stateT += DT;
      p.fireT = Math.max(0, p.fireT - DT);
      g = p.decide(DT);
    }
    p.stateT += DT;
    p.fireT = Math.max(0, p.fireT - DT);
    return g;
  };
  return { e, p, ctx: ctx as unknown as Probe['ctx'], line, owner, step };
}

describe('role guards out of sight in the open (guard-ai S27, A161)', () => {
  it('(a) an overwatch with no role cover: crouched at once, in seekCover with a reserved cover on the next step', () => {
    const r = roleProbe({ role: R_OVERWATCH });
    const g = r.step();
    expect(r.p.wantCrouch).toBe(true);
    expect(r.p.state).toBe('chase');
    expect(g.point).toBeNull();
    r.step();
    expect(r.p.state).toBe('seekCover');
    expect(r.p.coverIdx).toBeGreaterThanOrEqual(0);
    expect(r.owner[r.p.coverIdx]).toBe(r.e.num);
    expect(r.ctx.reserveCover).toHaveBeenCalled();
  });

  it('(a) no cover anywhere: crouched where he stands, never upright, no new pick every think', () => {
    const r = roleProbe({ role: R_OVERWATCH, covers: [] });
    for (let i = 0; i < 60 * 5; i++) {
      const g = r.step();
      expect(r.p.wantCrouch).toBe(true);
      expect(r.p.state).toBe('chase');
      expect(g.point).toBeNull();
    }
    expect(r.ctx.reserveCover).not.toHaveBeenCalled();
    // he sees his target: the wait starts again (the next time he is in the open, he tries once more)
    r.p.los = true;
    r.p.lastSeenT = 0;
    r.step();
    expect(r.p.state).not.toBe('chase');
  });

  it('(b) a point held by the one-mover rule (a cover, not moving): crouched, then seekCover once openWait has passed', () => {
    const r = roleProbe({ role: R_POINT, cover: 0, moving: false });
    const waits = Math.floor(SQUAD.openWait / DT) - 2;
    for (let i = 0; i < waits; i++) {
      r.step();
      expect(r.p.state).toBe('chase');
      expect(r.p.wantCrouch).toBe(true);
    }
    for (let i = 0; i < 5 && r.p.state === 'chase'; i++) r.step();
    expect(r.p.state).toBe('seekCover');
    expect(r.owner[r.p.coverIdx]).toBe(r.e.num);
  });

  it('a role change starts the wait again', () => {
    const r = roleProbe({ role: R_POINT, cover: 0, moving: false });
    r.step(Math.floor(SQUAD.openWait / DT) - 10);
    r.e.setRole(R_FLANK, 2, false, false, false, false);
    r.step(5);
    expect(r.p.state).toBe('chase');
    r.step(Math.floor(SQUAD.openWait / DT));
    expect(r.p.state).toBe('seekCover');
  });

  it('(e) openWait Infinity: the S8 wait (upright and still; only the reporter on his call crouches)', () => {
    const was = sq.openWait;
    sq.openWait = Infinity;
    try {
      const r = roleProbe({ role: R_OVERWATCH });
      for (let i = 0; i < 60 * 4; i++) r.step();
      expect(r.p.state).toBe('chase');
      expect(r.p.wantCrouch).toBe(false);
      expect(r.ctx.reserveCover).not.toHaveBeenCalled();
      const rep = roleProbe({ role: R_REPORTER, onRadio: true });
      rep.step(60);
      expect([rep.p.state, rep.p.wantCrouch]).toEqual(['chase', true]);
    } finally {
      sq.openWait = was;
    }
  });

  it('(e) R_NONE (a lone guard, or coordinated false: no roles): today steps, the cover-to-cover advance', () => {
    const r = roleProbe({ role: R_NONE });
    const g = r.step();
    // (guard-ai polish A16) today's chase, exactly: 16 m from the last known position (> 7 m), so the advance pick
    // (`pickAdvance`: score dT + dMe / 2) takes c0 (0, -7) and bounds to it; no open wait, so no other reservation
    expect(r.p.wantCrouch).toBe(false);
    expect([r.p.state, r.p.coverIdx, g.point]).toEqual(['seekCover', 0, null]);
    expect(r.ctx.reserveCover).toHaveBeenCalledTimes(1);
    expect(r.ctx.reserveCover).toHaveBeenCalledWith(r.e, 0);
    // no cover to bound to: the S8 walk-up on the last known position (the clear line), at the advance pace
    const w = roleProbe({ role: R_NONE, covers: [] });
    for (let i = 0; i < 60; i++) {
      const gw = w.step();
      expect(gw.point).toEqual([0, 0]);
      expect(gw.speed).toBeCloseTo(ENEMIES.grunt.walkSpeed * 1.15, 9);
      expect([w.p.state, w.p.wantCrouch]).toEqual(['chase', false]);
    }
    expect(w.ctx.reserveCover).not.toHaveBeenCalled();
    const s = roleProbe({ role: R_SEARCH, covers: [] });
    for (let i = 0; i < 60 * 4; i++) s.step();
    expect([s.p.state, s.p.wantCrouch]).toEqual(['chase', false]);
    expect(s.ctx.reserveCover).not.toHaveBeenCalled();
  });
});

describe('the overwatch suppress line (guard-ai S27, A162)', () => {
  /** An overwatch in his cover (c1, high), a mate moving, the target out of sight 5 s ago. */
  function overwatch() {
    const r = roleProbe({ role: R_OVERWATCH, cover: 1, moving: false, mates: true, x: 1, z: -12, state: 'inCover' });
    Object.assign(r.e, { coverIdx: 1 });
    r.owner[1] = r.e.num;
    return r;
  }

  it('(c) the line blocked: no round, held; clear: rounds go out; his lastKnown never moves', () => {
    const r = overwatch();
    r.line.clear = false;
    const lk = r.p.lastKnown.clone();
    // (his hide-phase blind fire over the cover at his own lastKnown is today's, not the suppress)
    const aims: Vector3[] = [];
    const aimAt = (Enemy.prototype as unknown as { aimAt(t: unknown, mode: string, out: Vector3): Vector3 }).aimAt;
    Object.assign(r.e, {
      aimAt(this: Enemy, t: unknown, mode: string, out: Vector3) {
        const v = aimAt.call(this, t, mode, out);
        if (mode === 'suppress') aims.push(v.clone());
        return v;
      },
    });
    for (let i = 0; i < 60 * 3; i++) r.step();
    expect(r.p.suppressRounds).toBe(0);
    expect(aims.length).toBe(0);
    expect(r.p.suppressHeld).toBeGreaterThan(0);
    expect(r.p.lastKnown.equals(lk)).toBe(true);
    // one cached ray per SUPPRESS_CHECK (0.25 s): at most ~4 a second
    expect(r.ctx.ballistics.clear.mock.calls.length).toBeLessThanOrEqual(Math.ceil(3 / 0.25) + 1);
    r.line.clear = true;
    for (let i = 0; i < 60 * 3; i++) r.step();
    expect(r.p.suppressRounds).toBeGreaterThan(0);
    expect(r.p.lastKnown.equals(lk)).toBe(true);
    // the rounds went at the hunt's spot + 1.1 m (the last known position at the origin), not at his lastKnown
    expect(aims.length).toBeGreaterThan(0);
    for (const a of aims) expect([a.x, a.y, a.z]).toEqual([0, 1.1, 0]);
  });

  it('(c) out of sight in the open (waiting for the group) the same line rule holds', () => {
    const r = roleProbe({ role: R_OVERWATCH, cover: -1, mates: true, covers: [] });
    r.line.clear = false;
    for (let i = 0; i < 60 * 2; i++) r.step();
    expect([r.p.suppressRounds, r.p.roundsFired]).toEqual([0, 0]);
    expect(r.p.suppressHeld).toBeGreaterThan(0);
  });

  it('(e) suppressView false: the S8 rule (rounds through the blocked line)', () => {
    const was = sq.suppressView;
    sq.suppressView = false;
    try {
      const r = overwatch();
      r.line.clear = false;
      for (let i = 0; i < 60 * 3; i++) r.step();
      expect(r.p.suppressRounds).toBeGreaterThan(0);
      expect(r.p.suppressHeld).toBe(0);
      expect(r.ctx.ballistics.clear).not.toHaveBeenCalled();
    } finally {
      sq.suppressView = was;
    }
  });
});

describe("the reporter's call (guard-ai S27, A163)", () => {
  it('(d) in cover with his call open and the player in cover 7 s: no grenade until the call ends, then allowed', () => {
    const pc = { x: 0, z: 0, nx: 0, nz: -1, low: false };
    const r = roleProbe({ role: R_REPORTER, cover: 3, onRadio: true, x: 1, z: -17.5, state: 'inCover', targetCover: pc, coverT: 7 });
    Object.assign(r.e, { coverIdx: 3, dist: 17.5, lastSeenT: 3 });
    r.owner[3] = r.e.num;
    for (let i = 0; i < 60 * 2; i++) r.step();
    expect(r.ctx.throwGrenade).not.toHaveBeenCalled();
    expect(r.p.wantCrouch).toBe(true);
    // the call gets through: the next roles tick clears his hold
    r.e.setRole(R_REPORTER, 3, false, false, false, false);
    r.step();
    expect(r.ctx.throwGrenade).toHaveBeenCalledTimes(1);
  });

  it('(d) caught in the open (attack) with his call open: no grenade either', () => {
    const pc = { x: 0, z: 0, nx: 0, nz: -1, low: false };
    const r = roleProbe({ role: R_REPORTER, onRadio: true, x: 0, z: -12, state: 'attack', targetCover: pc, coverT: 7 });
    Object.assign(r.e, { dist: 12, lastSeenT: 3 });
    for (let i = 0; i < 30; i++) r.step();
    expect(r.ctx.throwGrenade).not.toHaveBeenCalled();
    r.e.setRole(R_REPORTER, -1, false, false, false, false);
    r.p.state = 'attack';
    r.step();
    expect(r.ctx.throwGrenade).toHaveBeenCalledTimes(1);
  });
});
