import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, TACTICS } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { RADIO } from '../src/ai/radioNet';
import { ALERT, AlertMachine, emptyAlertInput } from '../src/ai/alertState';
import { closeFromCover, ENGAGE, P_STANDARD, R_FLANK, R_NONE, R_OVERWATCH, R_POINT, R_REPORTER, R_SEARCH } from '../src/ai/squadRoles';
import { INTRUDERS } from '../src/ai/intruders';
import { Vector3, type Scene } from '../src/core/babylon';
import { Enemy, type AiContext, type PlayerRef } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai walk 4.82 item 2) Michael, Marlow Yard set 2: "s2 guard sees you, hides, reports, and forgets where you are
// and becomes cautious. That's not logical at all. He should report then attack you instead of hiding." A guard with no
// holding role (a lone guard, a group's search) whose call is through leaves his cover once a whole peek shows nothing
// and moves up on his intruder's last known position; while he closes on it the fight does not time out into a search
// (`ALERT.lostSightClosing`; arriving there starts it); the caller is the group's reporter only while his call is open;
// the last known position is kept while he fights and searches.

describe('closeFromCover (pure)', () => {
  const W = ENGAGE.peekWait;
  it('a lone guard (or a group search) with his call through and a whole peek unseen leaves the cover', () => {
    expect(closeFromCover(R_NONE, false, false, W, W)).toBe(true);
    expect(closeFromCover(R_SEARCH, false, false, W + 3, W + 1)).toBe(true);
  });
  it('not while his call is open (report first), not a high-security post, not before one peek, not a holding role', () => {
    expect(closeFromCover(R_NONE, true, false, 20, 20)).toBe(false);
    expect(closeFromCover(R_NONE, false, true, 20, 20)).toBe(false);
    expect(closeFromCover(R_NONE, false, false, W - 0.1, 20)).toBe(false);
    expect(closeFromCover(R_NONE, false, false, 20, W - 0.1)).toBe(false);
    for (const r of [R_POINT, R_OVERWATCH, R_FLANK, R_REPORTER]) expect(closeFromCover(r, false, false, 20, 20)).toBe(false);
  });
});

describe('lost sight while closing (AlertMachine)', () => {
  const run = (closing: boolean, s: number): AlertMachine => {
    const m = new AlertMachine();
    m.set('alert');
    const i = emptyAlertInput();
    i.closing = closing;
    for (let t = 0; t < s; t += 0.1) {
      i.sinceSeen = t;
      m.step(0.1, i);
    }
    return m;
  };
  it('in cover or waiting: the search after ALERT.lostSight, as before', () => {
    expect(run(false, ALERT.lostSight + 0.3).level).toBe('searching');
  });
  it('closing on the last known position: still in the fight past lostSight, the search only at lostSightClosing', () => {
    expect(ALERT.lostSightClosing).toBeGreaterThan(ALERT.lostSight);
    expect(run(true, ALERT.lostSight + 3).level).toBe('alert');
    expect(run(true, ALERT.lostSightClosing + 0.3).level).toBe('searching');
  });
});

// ---- the real `Enemy.decide` on a stand-in guard (no rig, no scene) ----

const LKP = new Vector3(0, 0, 0);

/** A lone grunt in low cover at (0, -14) facing the last known position at the origin; the player out of sight. */
function loneInCover(radioOpen: () => boolean) {
  const player = { id: 'p1', feet: new Vector3(3, 0, 2), target: { alive: true }, speed: 0, crouched: false } as unknown as PlayerRef;
  const cover = [{ pos: new Vector3(0, 0, -14), normal: new Vector3(0, 0, 1), low: true, seg: 0, s: 0 }];
  const ctx = {
    cover,
    coverSegments: [],
    stealth: () => true,
    coordinated: () => true,
    lkpOf: (s: number) => (s === 0 ? LKP : null),
    radioOpen: vi.fn(radioOpen),
    releaseCover: vi.fn(),
    reserveCover: vi.fn(() => true),
    nav: { lineClear: () => true, findPath: () => null, isWalkable: () => true, cellOf: () => 0 },
  };
  const aware = new AlertMachine();
  aware.set('alert');
  const e = Object.create(Enemy.prototype) as Enemy;
  Object.assign(e, {
    ctx,
    aware,
    health: { alive: true },
    def: { usesCover: true, melee: null, kind: 'grunt', walkSpeed: 1.5, runSpeed: 4, engageMin: 4, engageMax: 22, scale: 1 },
    target: player,
    los: false,
    smelled: false,
    stagger: 0,
    alarm: null,
    entry: null,
    hunt: 0,
    pos: new Vector3(0, 0, -14),
    yaw: 0,
    knownPt: [0, 0],
    knownV: new Vector3(),
    advanceCd: 0,
    hold: null,
    postDef: null,
    post: [0, -14],
    doorCheck: 0,
    role: R_NONE,
    fireGate: { blocked: false, moveT: 0 },
    state: 'inCover',
    stateT: ENGAGE.peekWait + 0.5,
    coverIdx: 0,
    onRoleBound: false,
    advancing: false,
    peekCycles: 1,
    dist: 14,
    flanking: false,
    onRadio: false,
    lastSeenT: ENGAGE.peekWait + 0.5,
    closingIn: false,
    closing: false,
    coverPose: 'none',
    coverPeek: 0,
    coverWallSide: 0,
    wantCrouch: false,
    coverPicked: true,
    mateMoving: false,
    tacticsProfile: P_STANDARD,
    lastKnown: new Vector3(),
    sawOnce: true,
    strafe: 1,
    blindPlan: false,
    path: [],
  });
  const p = e as unknown as { decide(dt: number): { point: [number, number] | null; speed: number; face: number | null }; closingIn: boolean; stateT: number };
  return { e, p, ctx };
}

describe('a lone guard reports, then attacks (Enemy.decide)', () => {
  it('his call still open: he stays in his cover (the report)', () => {
    const { e, p, ctx } = loneInCover(() => true);
    const g = p.decide(1 / 60);
    expect(ctx.radioOpen).toHaveBeenCalled();
    expect(e.state).toBe('inCover');
    expect(g.point).toEqual([0, -14]);
  });

  it('his call through and a peek with nothing: he leaves the cover and moves up on the last known position', () => {
    const { e, p } = loneInCover(() => false);
    p.decide(1 / 60);
    expect(e.state).toBe('chase');
    expect(p.closingIn).toBe(true);
    // the next step: the out-of-sight advance (no cover closer to it here): he walks to the last known position, closing
    const g = p.decide(1 / 60);
    expect(g.point).toEqual([LKP.x, LKP.z]);
    expect(g.speed).toBeGreaterThan(0);
    expect(p.closingIn).toBe(true);
  });

  it('a high-security post and a holding role keep today: in his cover', () => {
    const post = loneInCover(() => false);
    Object.assign(post.e, { postDef: { leash: 30, highSecurity: true } });
    post.p.decide(1 / 60);
    expect(post.e.state).toBe('inCover');
    const ow = loneInCover(() => false);
    Object.assign(ow.e, { role: R_OVERWATCH, roleCover: 0, roleMoving: false, roleGoal: { point: null, speed: 0, face: null } });
    ow.p.decide(1 / 60);
    expect(ow.e.state).toBe('inCover');
  });

  it('seen a moment ago (a crouched hide phase): no leaving yet', () => {
    const { e, p } = loneInCover(() => false);
    Object.assign(e, { lastSeenT: 1 });
    p.decide(1 / 60);
    expect(e.state).toBe('inCover');
  });
});

// ---- the manager: the call, the reporter's role, the last known position ----

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
  onRadio: boolean;
  hunt: number;
  setRole: ReturnType<typeof vi.fn>;
  radio: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
}

let n = 0;
function guard(x: number, z: number): FakeGuard {
  const num = 9700 + n++;
  const g: FakeGuard = {
    id: `w${num}`,
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
    onRadio: false,
    hunt: 0,
    setRole: vi.fn(),
    radio: vi.fn(),
    bark: vi.fn(),
  };
  g.setRole = vi.fn((role: number, cover: number, _m: boolean, _r: boolean, _mates: boolean, onRadio: boolean) => {
    g.role = role;
    g.cover = cover;
    g.onRadio = onRadio;
  });
  return g;
}

function cp(x: number, z: number) {
  const l = Math.sqrt(x * x + z * z);
  return { pos: new Vector3(x, 0, z), normal: new Vector3(-x / l, 0, -z / l), low: false, seg: 0, s: 0 };
}
const COVERS = [cp(0, -7), cp(1, -12), cp(12, -4), cp(1, -17.5), cp(3, -9)];

function manager(gs: FakeGuard[]) {
  const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: COVERS, coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn(() => true) } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  em.stealth = true;
  // no command call after the contact (S6's alarm by radio is its own block): the contact call alone
  em.alarmRaised = true;
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  const priv = em as unknown as { ctx: AiContext; rolesStep(dt: number): void; radioStep(dt: number): void; forgetStep(): void };
  const slot = priv.ctx.reportSighting({ id: 'p1', feet: new Vector3(0, 0, 0) } as unknown as PlayerRef);
  return { em, ctx: priv.ctx, slot, priv, roles: () => priv.rolesStep(TACTICS.tick), radio: (s: number) => { for (let k = 0; k < Math.round(s / 0.1); k++) priv.radioStep(0.1); } };
}
const E = (g: FakeGuard) => g as unknown as Enemy;

describe('the call, then the fight (EnemyManager)', () => {
  it('a lone guard: his call is open while he reports (radioOpen), through after RADIO.callIn; no roles for one', () => {
    const g = guard(0, -14);
    const { ctx, slot, roles, radio } = manager([g]);
    expect(slot).toBe(0);
    ctx.radioCall!(E(g), slot, 'contact');
    expect(ctx.radioOpen!(E(g))).toBe(true);
    roles();
    expect(g.role).toBe(R_NONE);
    radio(RADIO.callIn + 0.3);
    expect(ctx.radioOpen!(E(g))).toBe(false);
  });

  it('a group: the caller reports while his call is open, then takes a fighting role (no reporter sitting in cover)', () => {
    const gs = [guard(0, -16), guard(2, -17), guard(-2, -17), guard(0, -19)];
    const { ctx, roles, radio } = manager(gs);
    ctx.radioCall!(E(gs[3]!), 0, 'contact');
    roles();
    expect(gs[3]!.role).toBe(R_REPORTER);
    expect(gs[3]!.onRadio).toBe(true);
    radio(RADIO.callIn + 0.3);
    roles();
    expect([R_POINT, R_OVERWATCH, R_FLANK, R_SEARCH]).toContain(gs[3]!.role);
    expect(gs.filter((x) => x.role === R_REPORTER)).toHaveLength(0);
  });

  it('the last known position is kept while he fights and searches; forgotten only once he is calm', () => {
    const g = guard(0, -14);
    const { em, priv } = manager([g]);
    em.intruders.step(INTRUDERS.forget + 5);
    priv.forgetStep();
    expect(em.lkpOf(0)).not.toBeNull();
    g.alerted = false;
    g.level = 'searching';
    em.intruders.step(30);
    priv.forgetStep();
    expect(em.lkpOf(0)).not.toBeNull();
    g.level = 'cooldown';
    priv.forgetStep();
    expect(em.lkpOf(0)).toBeNull();
  });
});
