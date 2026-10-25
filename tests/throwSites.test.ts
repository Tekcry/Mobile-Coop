/** (tallow-fixes A24, Q23, M2) Per-site throw length: a map's throw sites give their own length; no sites = `TEAM.throwDist`. */
import { afterEach, describe, expect, it } from 'vitest';
import { checkTeamRequest, setThrowSites, throwDistAt, throwLanding, throwLandingOk, THROW_SUB, type TeamRequest, type TeamSide } from '../src/game/teamMoves';
import { TEAM } from '../src/config/movement';
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
  it('with the site: 5.8 along +x allowed, the standard along +x denied, the standard along +z allowed', () => {
    setThrowSites([SITE]);
    expect(checkTeamRequest(toss({ land: { x: 5.8, y: 0, z: 0 } }))).toBeNull();
    expect(checkTeamRequest(toss({ land: { x: TEAM.throwDist, y: 0, z: 0 } }))).toBe('noTarget');
    expect(checkTeamRequest(toss({ land: { x: 0, y: 0, z: TEAM.throwDist } }))).toBeNull();
  });
  it('no sites: the standard along +x allowed, 5.8 denied', () => {
    expect(checkTeamRequest(toss({ land: { x: TEAM.throwDist, y: 0, z: 0 } }))).toBeNull();
    expect(checkTeamRequest(toss({ land: { x: 5.8, y: 0, z: 0 } }))).toBe('noTarget');
  });
});
