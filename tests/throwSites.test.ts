/** (tallow-fixes A24, Q23, M2) Per-site throw length: a map's throw sites give their own length; no sites = `TEAM.throwDist`. */
import { afterEach, describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { checkTeamRequest, setThrowSites, throwArc, throwDistAt, throwLanding, throwLandingOk, THROW_SUB, type TeamRequest, type TeamSide } from '../src/game/teamMoves';
import { TeamController } from '../src/game/teamController';
import { TEAM } from '../src/config/movement';
import { SNAP_SPEED } from '../src/net/interp';
import type { ThrowSite } from '../src/world/mapDef';

const SITE: ThrowSite = { x: 0, z: 0, dx: 1, dz: 0, dist: 5.8 };
const DEG = Math.PI / 180;

const side = (o: Partial<TeamSide> = {}): TeamSide => ({ id: 'a', x: 0, y: 0, z: 0, mode: 'ground', alive: true, ...o });
/** As `tests/teamMoves.test.ts`'s `toss`: b stands offering the throw at the origin, a runs in from -x. */
const toss = (o: Partial<TeamRequest> = {}): TeamRequest => ({
  kind: 'throw',
  a: side({ id: 'a', x: -1.2 }),
  b: side({ id: 'b', mode: 'brace', sub: THROW_SUB }),
  target: -1,
  targetUp: 0,
  sinceLast: 5,
  land: { x: TEAM.throwDist, y: 0, z: 0 },
  ...o,
});

afterEach(() => setThrowSites(null));

describe('throwDistAt (tallow-fixes A24)', () => {
  it('no sites: the standard throw at the site spot in every direction', () => {
    for (let a = 0; a < 360; a += 45) expect(throwDistAt(0, 0, Math.cos(a * DEG), Math.sin(a * DEG))).toBe(TEAM.throwDist);
    expect(throwDistAt(0, 0, 1, 0)).toBe(TEAM.throwDist);
  });

  it('a site: its length at the spot along its facing, within reach and within the facing cone', () => {
    setThrowSites([SITE]);
    expect(throwDistAt(0, 0, 1, 0)).toBe(5.8);
    expect(throwDistAt(0, 0.9, 1, 0)).toBe(5.8);
    expect(throwDistAt(-0.9, 0, 1, 0)).toBe(5.8);
    expect(throwDistAt(0, 1.1, 1, 0)).toBe(TEAM.throwDist);
    expect(throwDistAt(1.1, 0, 1, 0)).toBe(TEAM.throwDist);
    expect(throwDistAt(0, 0, 0, 1)).toBe(TEAM.throwDist);
    expect(throwDistAt(0, 0, -1, 0)).toBe(TEAM.throwDist);
    expect(throwDistAt(0, 0, Math.cos(20 * DEG), Math.sin(20 * DEG))).toBe(5.8);
    expect(throwDistAt(0, 0, Math.cos(20 * DEG), -Math.sin(20 * DEG))).toBe(5.8);
    expect(throwDistAt(0, 0, Math.cos(30 * DEG), Math.sin(30 * DEG))).toBe(TEAM.throwDist);
    expect(throwDistAt(0, 0, 2, 0)).toBe(5.8);
    expect(throwDistAt(0, 0, 0, 0)).toBe(TEAM.throwDist);
  });

  it('two sites 3 m apart: each spot its own length; an empty list or null means no sites', () => {
    setThrowSites([SITE, { x: 3, z: 0, dx: 1, dz: 0, dist: 4.5 }]);
    expect(throwDistAt(0, 0, 1, 0)).toBe(5.8);
    expect(throwDistAt(3, 0, 1, 0)).toBe(4.5);
    expect(throwDistAt(2.2, 0, 1, 0)).toBe(4.5);
    expect(throwDistAt(1.5, 0, 1, 0)).toBe(TEAM.throwDist);
    setThrowSites([]);
    expect(throwDistAt(0, 0, 1, 0)).toBe(TEAM.throwDist);
    setThrowSites([SITE]);
    setThrowSites(null);
    expect(throwDistAt(0, 0, 1, 0)).toBe(TEAM.throwDist);
  });

  it('overlapping sites: the nearest qualifying one wins', () => {
    setThrowSites([{ x: 0.8, z: 0, dx: 1, dz: 0, dist: 4.5 }, { x: 0.2, z: 0, dx: 1, dz: 0, dist: 5.8 }]);
    expect(throwDistAt(0, 0, 1, 0)).toBe(5.8);
    expect(throwDistAt(0.9, 0, 1, 0)).toBe(4.5);
  });
});

describe('throwLanding / throwLandingOk take the length', () => {
  const out = { x: 0, z: 0, dx: 0, dz: 0 };
  it('throwLanding lands dist past the thrower along runner -> thrower; the default is TEAM.throwDist', () => {
    throwLanding(-1, 0, 0, 0, 0, out, 5.8);
    expect(out.x).toBeCloseTo(5.8, 9);
    expect(out.z).toBeCloseTo(0, 9);
    expect(out.dx).toBeCloseTo(1, 9);
    throwLanding(-1, 0, 0, 0, 0, out);
    expect(out.x).toBeCloseTo(TEAM.throwDist, 9);
    expect(out.z).toBeCloseTo(0, 9);
  });
  it('throwLandingOk(..., 5.8): the band 4.8-6.8 m and the TEAM.throwDrop height limit', () => {
    expect(throwLandingOk(0, 0, 0, 4.85, 0, 0, 5.8)).toBe(true);
    expect(throwLandingOk(0, 0, 0, 6.75, 0, 0, 5.8)).toBe(true);
    expect(throwLandingOk(0, 0, 0, 5.8, -0.9, 0, 5.8)).toBe(true);
    expect(throwLandingOk(0, 0, 0, TEAM.throwDist, 0, 0, 5.8)).toBe(false);
    expect(throwLandingOk(0, 0, 0, 7.0, 0, 0, 5.8)).toBe(false);
    expect(throwLandingOk(0, 0, 0, 5.8, -1.1, 0, 5.8)).toBe(false);
  });
});

describe('checkTeamRequest follows the site length (host band)', () => {
  it('with the site (TD-b): the site band and the standard band along +x allowed, outside both denied; off-facing only the standard', () => {
    setThrowSites([SITE]);
    expect(checkTeamRequest(toss({ land: { x: 5.8, y: 0, z: 0 } }))).toBeNull();
    expect(checkTeamRequest(toss({ land: { x: TEAM.throwDist, y: 0, z: 0 } }))).toBeNull();
    expect(checkTeamRequest(toss({ land: { x: 7.0, y: 0, z: 0 } }))).toBe('noTarget');
    expect(checkTeamRequest(toss({ land: { x: 2.0, y: 0, z: 0 } }))).toBe('noTarget');
    expect(checkTeamRequest(toss({ land: { x: 0, y: 0, z: TEAM.throwDist } }))).toBeNull();
    expect(checkTeamRequest(toss({ land: { x: 0, y: 0, z: 5.8 } }))).toBe('noTarget');
  });
  it('the reverse edge stays a denial: a thrower 1.1 m from the site claiming 5.8 along its facing', () => {
    setThrowSites([SITE]);
    const b = side({ id: 'b', x: -1.1, mode: 'brace', sub: THROW_SUB });
    expect(checkTeamRequest(toss({ a: side({ id: 'a', x: -2.3 }), b, land: { x: -1.1 + 5.8, y: 0, z: 0 } }))).toBe('noTarget');
    expect(checkTeamRequest(toss({ a: side({ id: 'a', x: -2.3 }), b, land: { x: -1.1 + TEAM.throwDist, y: 0, z: 0 } }))).toBeNull();
  });
  it('no sites: the standard along +x allowed, 5.8 denied', () => {
    expect(checkTeamRequest(toss({ land: { x: TEAM.throwDist, y: 0, z: 0 } }))).toBeNull();
    expect(checkTeamRequest(toss({ land: { x: 5.8, y: 0, z: 0 } }))).toBe('noTarget');
  });
});

/** As `tests/kit/registry.test.ts`'s `fakeGame`: a floor at y 0 under every downward ray; `net.teamRequest` recorded. */
function fakeGame(world: object | undefined) {
  const controller = { pos: new Vector3(0, 0, 0), renderPos: new Vector3(), yaw: 0, renderYaw: 0, override: null, grounded: true, swallowCrouch: false, crouched: false, crouchIntent: false, autoCrouch: false };
  const mate = { id: 'm', pos: new Vector3(0, 0, 0), yaw: 0, mode: 'brace', sub: THROW_SUB };
  const asked: unknown[][] = [];
  const g = {
    player: { alive: true, controller, pose: { traverse: 'none', traverseT: 0, tumble: 0 } },
    net: { teamMates: () => [mate], teamRequest: (...a: unknown[]) => asked.push(a) },
    app: { toasts: { show: () => {} } },
    traversal: { attached: false, committed: null, attach: { kind: 'none', phase: 'off' } },
    takedown: { active: null },
    strike: { active: false },
    ballistics: { ray: (a: Vector3, b: Vector3) => (b.y < a.y - 0.1 && a.y >= 0 && b.y <= 0 ? { hit: true, distance: a.y, point: new Vector3(b.x, 0, b.z) } : { hit: false, distance: 0, point: new Vector3() }) },
    world,
  };
  return { g, controller, mate, asked, tm: new TeamController(g as never) };
}

const PLUS_Z: ThrowSite = { x: 0, z: 0, dx: 0, dz: 1, dist: 5.8 };
const withSites = (throwSites?: readonly ThrowSite[]): object => ({ level: {}, layout: throwSites ? { throwSites } : {} });
const requestThrow = (tm: TeamController, mate: unknown): void => (tm as unknown as { requestThrow(m: unknown): void }).requestThrow(mate);

describe('TeamController registers the map throw sites (TD-b)', () => {
  it('construction: a world with a site sets it; no sites, no layout or no world at all give the standard (and do not throw)', () => {
    fakeGame(withSites([PLUS_Z]));
    expect(throwDistAt(0, 0, 0, 1)).toBe(5.8);
    fakeGame(withSites());
    expect(throwDistAt(0, 0, 0, 1)).toBe(TEAM.throwDist);
    setThrowSites([PLUS_Z]);
    fakeGame({ level: {} });
    expect(throwDistAt(0, 0, 0, 1)).toBe(TEAM.throwDist);
    setThrowSites([PLUS_Z]);
    expect(() => new TeamController({} as never)).not.toThrow();
    expect(throwDistAt(0, 0, 0, 1)).toBe(TEAM.throwDist);
    setThrowSites([PLUS_Z]);
    fakeGame(withSites([]));
    expect(throwDistAt(0, 0, 0, 1)).toBe(TEAM.throwDist);
  });

  it('dispose clears only its own sites: an older controller disposed after a newer one leaves the newer list', () => {
    const s2: ThrowSite[] = [{ x: 10, z: 0, dx: 0, dz: 1, dist: 4.5 }];
    const a = fakeGame(withSites([PLUS_Z])).tm;
    const b = fakeGame(withSites(s2)).tm;
    expect(throwDistAt(10, 0, 0, 1)).toBe(4.5);
    expect(throwDistAt(0, 0, 0, 1)).toBe(TEAM.throwDist);
    a.dispose();
    expect(throwDistAt(10, 0, 0, 1)).toBe(4.5);
    b.dispose();
    expect(throwDistAt(10, 0, 0, 1)).toBe(TEAM.throwDist);
    const none = fakeGame(withSites()).tm;
    expect(() => none.dispose()).not.toThrow();
    expect(() => new TeamController({} as never).dispose()).not.toThrow();
  });
});

describe('requestThrow lands the site length (TD-b)', () => {
  /** The landing x / z the runner asked the host for (the last two numbers of `teamRequest`). */
  const landed = (asked: unknown[][]): [number, number] => {
    const r = asked[0]!;
    return [r[r.length - 2] as number, r[r.length - 1] as number];
  };

  it('at the +z site, the runner behind the thrower: lands 5.8 m on; with no sites 3.2', () => {
    const f = fakeGame(withSites([PLUS_Z]));
    f.controller.pos.set(0, 0, -1.3);
    requestThrow(f.tm, f.mate);
    expect(f.tm.lastThrowRoom).toBe('ok');
    expect(f.tm.lastThrowDist).toBe(5.8);
    const [x, z] = landed(f.asked);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(5.8, 9);

    const n = fakeGame(withSites());
    n.controller.pos.set(0, 0, -1.3);
    requestThrow(n.tm, n.mate);
    expect(n.tm.lastThrowRoom).toBe('ok');
    expect(n.tm.lastThrowDist).toBe(TEAM.throwDist);
    const [nx, nz] = landed(n.asked);
    expect(nx).toBeCloseTo(0, 9);
    expect(nz).toBeCloseTo(TEAM.throwDist, 9);
  });

  it('a throw along +x at the +z site is the standard; a runner within 5 cm uses the thrower yaw (0 = +z): the site', () => {
    const f = fakeGame(withSites([PLUS_Z]));
    f.controller.pos.set(-1.3, 0, 0);
    requestThrow(f.tm, f.mate);
    expect(f.tm.lastThrowRoom).toBe('ok');
    expect(f.tm.lastThrowDist).toBe(TEAM.throwDist);
    const [x, z] = landed(f.asked);
    expect(x).toBeCloseTo(TEAM.throwDist, 9);
    expect(z).toBeCloseTo(0, 9);

    const y = fakeGame(withSites([PLUS_Z]));
    y.controller.pos.set(0, 0, -0.03);
    y.mate.yaw = 0;
    requestThrow(y.tm, y.mate);
    expect(y.tm.lastThrowRoom).toBe('ok');
    expect(y.tm.lastThrowDist).toBe(5.8);
    const [yx, yz] = landed(y.asked);
    expect(yx).toBeCloseTo(0, 9);
    expect(yz).toBeCloseTo(5.8, 9);
  });
});

describe('the long throw arc at a fixed TEAM.throwTime (TD-b)', () => {
  it('from 1.3 m behind the thrower to 5.8 m past: mean horizontal speed under SNAP_SPEED; the arc ends on the landing', () => {
    const speed = (5.8 + 1.3) / TEAM.throwTime;
    expect(speed).toBeLessThan(SNAP_SPEED);
    const out = { x: 0, y: 0, z: 0 };
    throwArc(TEAM.throwTime, 0, 0, -1.3, 0, 0, 5.8, out);
    expect(out.x).toBeCloseTo(0, 9);
    expect(out.y).toBeCloseTo(0, 9);
    expect(out.z).toBeCloseTo(5.8, 9);
  });
});
