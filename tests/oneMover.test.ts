import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager, TACTICS } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { CoverGrid, coverSetFrom, type CoverPointLike } from '../src/ai/coverGrid';
import { assignRoles, ONE_MOVER, P_AGGRESSIVE, P_STANDARD, R_FLANK, R_NONE, R_POINT, RoleInput, RoleOutput, ROLES } from '../src/ai/squadRoles';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy, PlayerRef } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (one-mover triage, e2e-stealth-ai 'squad roles' red on 4.100.2, trains 77 and its rerun) A guard still walking to the
// cover of his old role (a reporter whose call went through, an overwatch) was made the flank while the point was on
// his own bound: two role bounds as point and flank at once, and the manager's hold had nobody left to hold.
// `assignRoles` now never pairs two guards on their way as point and flank (`ONE_MOVER.roles`).

type Mut<T> = { -readonly [K in keyof T]: T[K] extends boolean ? boolean : T[K] };
const oneMover = ONE_MOVER as Mut<typeof ONE_MOVER>;
afterEach(() => {
  oneMover.roles = true;
});

/** A cover point at (x, z) whose protected side faces the LKP at the origin. */
function cp(x: number, z: number): CoverPointLike & { seg: number; s: number } {
  const l = Math.sqrt(x * x + z * z);
  return { pos: new Vector3(x, 0, z), normal: new Vector3(-x / l, 0, -z / l), low: false, seg: 0, s: 0 };
}
// squadRoles.test's layout (LKP at the origin): c0 point, c1 overwatch, c2 flank, c3 reporter, c4 a decoy
const COVERS = [cp(0, -7), cp(1, -12), cp(12, -4), cp(1, -17.5), cp(3, -9)];

// the e2e's moment: the point (P) on his bound to c0, the overwatch (O) set in c1, a mate (W) still on his way to a
// cover from his old role, standing where the flank cover is his best pick
const P = { slot: 1, x: 0, z: -10 };
const O = { slot: 2, x: 1, z: -12 };
const W = { slot: 3, x: 11, z: -9 };

describe('one-mover triage: assignRoles never makes two guards on their way point and flank', () => {
  function run(pBound: boolean, wBound: boolean, pProfile = P_STANDARD) {
    const set = coverSetFrom(COVERS);
    const inp = new RoleInput();
    inp.cover = set;
    inp.grid = CoverGrid.fromSet(set);
    const gs = [P, O, W];
    inp.n = gs.length;
    gs.forEach((g, i) => {
      inp.slot[i] = g.slot;
      inp.x[i] = g.x;
      inp.y[i] = 0;
      inp.z[i] = g.z;
      inp.profile[i] = i === 0 ? pProfile : P_STANDARD;
      inp.seesTarget[i] = 0;
      inp.inCover[i] = i === 1 ? 1 : 0;
      inp.coverIdx[i] = i === 1 ? 1 : -1;
      inp.bound[i] = 0;
    });
    inp.bound[0] = pBound ? 1 : 0;
    inp.bound[2] = wBound ? 1 : 0;
    inp.lkpX = inp.lkpY = inp.lkpZ = 0;
    inp.callerSlot = -1;
    inp.targetCoverT = 0;
    const out = new RoleOutput();
    assignRoles(inp, out);
    return { inp, out, roles: [0, 1, 2].map((i) => ROLES[out.role[i]!]) };
  }

  it('undo (ONE_MOVER.roles false): the walker is made the flank beside the bounding point (the bug)', () => {
    oneMover.roles = false;
    const { roles } = run(true, true);
    expect(roles).toEqual(['point', 'overwatch', 'flank']);
  });

  it('the point on his way: the walker is not the flank; never both of point and flank on their way', () => {
    const { inp, out, roles } = run(true, true);
    expect(roles[0]).toBe('point');
    expect(roles[2]).not.toBe('flank');
    const both = out.point >= 0 && out.flank >= 0 && inp.bound[out.point] === 1 && inp.bound[out.flank] === 1;
    expect(both).toBe(false);
  });

  it('only one on his way: the walker still flanks (the hold is the manager\'s), and a point not on his way changes nothing', () => {
    expect(run(false, true).roles).toEqual(['point', 'overwatch', 'flank']);
    expect(run(true, false).roles).toEqual(['point', 'overwatch', 'flank']);
  });

  it('an aggressive point: the walker may flank beside him (an aggressive pair moves together)', () => {
    expect(run(true, true, P_AGGRESSIVE).roles).toEqual(['point', 'overwatch', 'flank']);
  });
});

// ----- the manager: a real EnemyManager roles tick with stand-in guards (guardPolishB's B2 fakes) -----

interface Sq {
  id: string;
  num: number;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  runningAlarm: boolean;
  closing: boolean;
  dog: null;
  hold: null;
  level: string;
  incident: number;
  state: string;
  coverIdx: number;
  roleBound: boolean;
  tacticsProfile: number;
  seesTarget: boolean;
  def: { melee: null; kind: string; scale: number; usesCover: boolean };
  pos: Vector3;
  role: number;
  cover: number;
  moving: boolean;
  hunt: number;
  setRole: ReturnType<typeof vi.fn>;
  radio: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
}
let sqN = 0;
function sq(x: number, z: number): Sq {
  const num = 8700 + sqN++;
  const g: Sq = {
    id: `m${num}`,
    num,
    alive: true,
    alerted: true,
    passive: false,
    taken: false,
    runningAlarm: false,
    closing: false,
    dog: null,
    hold: null,
    level: 'alert',
    incident: -1,
    state: 'chase',
    coverIdx: -1,
    roleBound: false,
    tacticsProfile: P_STANDARD,
    seesTarget: false,
    def: { melee: null, kind: 'grunt', scale: 1, usesCover: true },
    pos: new Vector3(x, 0, z),
    role: R_NONE,
    cover: -1,
    moving: false,
    hunt: 0,
    setRole: vi.fn(),
    radio: vi.fn(),
    bark: vi.fn(),
  };
  g.setRole = vi.fn((role: number, cover: number, moving: boolean) => {
    g.role = role;
    g.cover = cover;
    g.moving = moving;
  });
  return g;
}

function squad(gs: Sq[]) {
  const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: COVERS, coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn(() => true) } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  const priv = em as unknown as { ctx: AiContext; rolesStep(dt: number): void };
  expect(priv.ctx.reportSighting({ id: 'p1', feet: new Vector3(0, 0, 0) } as unknown as PlayerRef)).toBe(0);
  return () => priv.rolesStep(TACTICS.tick);
}

/** The e2e's count: point / flank in `seekCover` on a role bound. */
function movers(gs: Sq[]): number {
  return gs.filter((g) => (g.role === R_POINT || g.role === R_FLANK) && g.state === 'seekCover' && g.roleBound).length;
}

describe('one-mover triage: the roles tick never leaves two role bounds as point and flank', () => {
  function scene() {
    const gs = [sq(P.x, P.z), sq(O.x, O.z), sq(W.x, W.z)];
    const roles = squad(gs);
    // the overwatch set in c1; the point on his bound to c0; the third still walking to his old role's cover (c3, the
    // reporter's), on a role bound (Enemy.boundTo; a role switch mid-walk keeps it)
    gs[1]!.state = 'inCover';
    gs[1]!.coverIdx = 1;
    gs[0]!.state = 'seekCover';
    gs[0]!.coverIdx = 0;
    gs[0]!.roleBound = true;
    gs[2]!.state = 'seekCover';
    gs[2]!.coverIdx = 3;
    gs[2]!.roleBound = true;
    return { gs, roles };
  }

  it('undo: the walker becomes the flank, two movers (the e2e failure)', () => {
    oneMover.roles = false;
    const { gs, roles } = scene();
    roles();
    expect(gs.map((g) => ROLES[g.role])).toEqual(['point', 'overwatch', 'flank']);
    expect(movers(gs)).toBe(2);
  });

  it('the fix: one mover; once the walker is in his cover he takes the flank and is held while the point is on his way', () => {
    const { gs, roles } = scene();
    roles();
    expect(gs[0]!.role).toBe(R_POINT);
    expect(gs[2]!.role).not.toBe(R_FLANK);
    expect(movers(gs)).toBeLessThanOrEqual(1);
    // the walker arrives (setState: roleBound cleared): the flank again, held while the point is still on his way
    gs[2]!.state = 'inCover';
    gs[2]!.roleBound = false;
    roles();
    expect(gs[2]!.role).toBe(R_FLANK);
    expect(gs[2]!.moving).toBe(false);
    expect(movers(gs)).toBe(1);
  });
});
