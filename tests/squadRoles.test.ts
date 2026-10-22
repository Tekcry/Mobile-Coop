import { describe, expect, it } from 'vitest';
import { CoverGrid, coverSetFrom, type CoverPointLike } from '../src/ai/coverGrid';
import {
  assignRoles,
  BEHAVIOUR,
  combatSeed,
  mulberry32,
  P_AGGRESSIVE,
  P_POST,
  P_STANDARD,
  profileOf,
  R_FLANK,
  R_OVERWATCH,
  R_POINT,
  R_REPORTER,
  R_SEARCH,
  RoleInput,
  RoleOutput,
  ROLES,
  scoreCover,
  SQUAD,
  squadScratch,
} from '../src/ai/squadRoles';

/** A cover point at (x, z) whose protected side faces the LKP at the origin. */
function cp(x: number, z: number, low = false, y = 0): CoverPointLike {
  const l = Math.sqrt(x * x + z * z);
  return { pos: { x, y, z }, normal: { x: -x / l, z: -z / l }, low };
}

// LKP at the origin. c0 point cover (7 m), c1 overwatch cover (~12 m), c2 flank cover (~12.6 m, ~72 deg off c0),
// c3 reporter cover (~17.5 m), c4 a decoy inside the flank band but only ~18 deg off the point's bearing.
const COVERS = [cp(0, -7), cp(1, -12), cp(12, -4), cp(1, -17.5), cp(3, -9)];

interface G {
  slot: number;
  x: number;
  z: number;
  profile?: number;
  sees?: boolean;
  inCover?: boolean;
  coverIdx?: number;
}

const A: G = { slot: 1, x: 0, z: -16 };
const B: G = { slot: 2, x: 2, z: -17 };
const C: G = { slot: 3, x: -2, z: -17 };
const D: G = { slot: 4, x: 0, z: -19 };

function setup(gs: G[], caller = -1, covers = COVERS): { inp: RoleInput; out: RoleOutput } {
  const set = coverSetFrom(covers);
  const inp = new RoleInput();
  inp.cover = set;
  inp.grid = CoverGrid.fromSet(set);
  fill(inp, gs, caller);
  return { inp, out: new RoleOutput() };
}

function fill(inp: RoleInput, gs: G[], caller: number): void {
  inp.n = gs.length;
  gs.forEach((g, i) => {
    inp.slot[i] = g.slot;
    inp.x[i] = g.x;
    inp.y[i] = 0;
    inp.z[i] = g.z;
    inp.profile[i] = g.profile ?? P_STANDARD;
    inp.seesTarget[i] = g.sees ? 1 : 0;
    inp.inCover[i] = g.inCover ? 1 : 0;
    inp.coverIdx[i] = g.coverIdx ?? -1;
  });
  inp.lkpX = 0;
  inp.lkpY = 0;
  inp.lkpZ = 0;
  inp.callerSlot = caller;
  inp.targetCoverT = 0;
}

/** role name per slot */
function bySlot(inp: RoleInput, out: RoleOutput): Record<number, string> {
  const r: Record<number, string> = {};
  for (let i = 0; i < inp.n; i++) r[inp.slot[i]!] = ROLES[out.role[i]!]!;
  return r;
}

function count(out: RoleOutput, n: number, role: number): number {
  let k = 0;
  for (let i = 0; i < n; i++) if (out.role[i] === role) k++;
  return k;
}

function bearingDeg(ax: number, az: number, bx: number, bz: number): number {
  const c = (ax * bx + az * bz) / (Math.sqrt(ax * ax + az * az) * Math.sqrt(bx * bx + bz * bz));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

describe('squad roles: assignment', () => {
  it('4-guard group with a caller: 1 reporter, 1 point, 1 overwatch, 1 flank', () => {
    const { inp, out } = setup([A, B, C, D], 4);
    assignRoles(inp, out);
    expect(bySlot(inp, out)).toEqual({ 1: 'point', 2: 'overwatch', 3: 'flank', 4: 'reporter' });
    expect(count(out, 4, R_REPORTER)).toBe(1);
    expect(count(out, 4, R_POINT)).toBe(1);
    expect(count(out, 4, R_OVERWATCH)).toBe(1);
    expect(count(out, 4, R_FLANK)).toBe(1);
    // each role took its own cover: point c0, overwatch c1, flank c2 (not the closer decoy c4), reporter c3
    expect([out.cover[0], out.cover[1], out.cover[2], out.cover[3]]).toEqual([0, 1, 2, 3]);
  });

  it('2-guard group: point and overwatch, no flank', () => {
    const { inp, out } = setup([A, B]);
    assignRoles(inp, out);
    expect(bySlot(inp, out)).toEqual({ 1: 'point', 2: 'overwatch' });
    expect(count(out, 2, R_FLANK)).toBe(0);
  });

  it('3-guard group without a caller gets a flank; extra guards search', () => {
    const { inp, out } = setup([A, B, C]);
    assignRoles(inp, out);
    expect(bySlot(inp, out)).toEqual({ 1: 'point', 2: 'overwatch', 3: 'flank' });
    const E: G = { slot: 5, x: -4, z: -20 };
    const s = setup([A, B, C, D, E], 4);
    assignRoles(s.inp, s.out);
    expect(bySlot(s.inp, s.out)[5]).toBe('search');
    expect(s.out.cover[4]).toBe(-1);
  });

  it('aggressive profiles fill point and flank first', () => {
    const Cg: G = { ...C, profile: P_AGGRESSIVE };
    const Dg: G = { slot: 4, x: 4, z: -17, profile: P_AGGRESSIVE };
    const { inp, out } = setup([A, B, Cg, Dg]);
    assignRoles(inp, out);
    // A is nearer the LKP, but the aggressive pair takes point and flank
    expect(bySlot(inp, out)).toEqual({ 1: 'overwatch', 2: 'search', 3: 'point', 4: 'flank' });
  });

  it('an aggressive guard takes point even without a cover path, and runs; standard guards never do', () => {
    const Ag: G = { ...A, profile: P_AGGRESSIVE };
    const { inp, out } = setup([Ag, B], -1, [cp(1, -12)]);
    assignRoles(inp, out);
    expect(ROLES[out.role[0]!]).toBe('point');
    expect(out.cover[0]).toBe(-1);
    expect(out.moving[0]).toBe(1);
    expect(out.run[0]).toBe(1);
    const s = setup([A, B], -1, [cp(1, -12)]);
    assignRoles(s.inp, s.out);
    expect(count(s.out, 2, R_POINT)).toBe(0);
  });

  it('posted guards never take point or flank', () => {
    const Ap: G = { ...A, profile: P_POST };
    const { inp, out } = setup([Ap, B, C]);
    assignRoles(inp, out);
    const r = bySlot(inp, out);
    expect(r[1]).not.toBe('point');
    expect(r[1]).not.toBe('flank');
    expect(r[1]).toBe('overwatch'); // weight 2
  });

  it('flank cover bearing is >= 60 deg off the point cover (the closer decoy is refused)', () => {
    const { inp, out } = setup([A, B, C, D], 4);
    assignRoles(inp, out);
    const set = inp.cover!;
    const pc = out.cover[out.point]!;
    const fc = out.cover[out.flank]!;
    expect(fc).toBeGreaterThanOrEqual(0);
    expect(bearingDeg(set.x[pc]!, set.z[pc]!, set.x[fc]!, set.z[fc]!)).toBeGreaterThanOrEqual(SQUAD.flankMinDeg);
    // with only the decoy in the flank band nobody flanks
    const s = setup([A, B, C, D], 4, [cp(0, -7), cp(1, -12), cp(1, -17.5), cp(3, -9)]);
    assignRoles(s.inp, s.out);
    expect(count(s.out, 4, R_FLANK)).toBe(0);
  });

  it('overwatch takes cover 8-15 m from the LKP', () => {
    const { inp, out } = setup([A, B, C, D], 4);
    assignRoles(inp, out);
    const set = inp.cover!;
    const oc = out.cover[out.overwatch]!;
    const d = Math.hypot(set.x[oc]!, set.z[oc]!);
    expect(d).toBeGreaterThanOrEqual(SQUAD.overwatchMin);
    expect(d).toBeLessThanOrEqual(SQUAD.overwatchMax);
  });

  it('respects reservations by other guards, keeps his own', () => {
    const { inp, out } = setup([A, B]);
    inp.cover!.owner[0] = 9; // someone outside the group holds c0
    assignRoles(inp, out);
    expect(out.cover[0]).not.toBe(0);
    inp.cover!.owner[0] = 1; // A holds it himself
    assignRoles(inp, out);
    expect(out.cover[0]).toBe(0);
    inp.cover!.owner[0] = -1;
    inp.cover!.block[1] = 1; // overwatch cover blocked (no view)
    assignRoles(inp, out);
    expect(out.cover[1]).not.toBe(1);
  });
});

describe('squad roles: moving mask', () => {
  it('at most 1 point and 1 flank move; point waits for the overwatch, flank goes while the point holds', () => {
    const { inp, out } = setup([A, B, C, D], 4);
    assignRoles(inp, out);
    // nobody in cover yet: overwatch and reporter go to cover, point waits, flank goes
    expect(out.moving[1]).toBe(1); // overwatch
    expect(out.moving[3]).toBe(1); // reporter
    expect(out.moving[0]).toBe(0); // point
    expect(out.moving[2]).toBe(1); // flank
    expect(out.run[3]).toBe(1); // between covers
    // overwatch set in its cover: the point bounds, the flank holds
    fill(inp, [A, { ...B, inCover: true, coverIdx: 1 }, C, D], 4);
    inp.cover!.owner[1] = 2;
    assignRoles(inp, out);
    expect(out.cover[1]).toBe(1);
    expect(out.moving[1]).toBe(0);
    expect(out.moving[0]).toBe(1);
    expect(out.moving[2]).toBe(0);
    // target held cover 4 s+: the flank goes first, the point holds
    inp.targetCoverT = SQUAD.flankAfter + 0.5;
    assignRoles(inp, out);
    expect(out.moving[0]).toBe(0);
    expect(out.moving[2]).toBe(1);
  });

  it('search members move at a walk unless aggressive', () => {
    const E: G = { slot: 5, x: -4, z: -20 };
    const F: G = { slot: 6, x: -5, z: -20, profile: P_AGGRESSIVE };
    const { inp, out } = setup([A, B, C, D, E, F], 4);
    assignRoles(inp, out);
    for (let i = 0; i < inp.n; i++) {
      if (out.role[i] !== R_SEARCH) continue;
      expect(out.moving[i]).toBe(1);
      expect(out.run[i]).toBe(inp.profile[i] === P_AGGRESSIVE ? 1 : 0);
    }
  });

  it('aggressive point and flank may move together', () => {
    const Cg: G = { ...C, profile: P_AGGRESSIVE };
    const Dg: G = { slot: 4, x: 4, z: -17, profile: P_AGGRESSIVE };
    const { inp, out } = setup([A, B, Cg, Dg]);
    assignRoles(inp, out);
    expect(out.moving[out.point]).toBe(1);
    expect(out.moving[out.flank]).toBe(1);
  });
});

describe('squad roles: cover score', () => {
  const s = (x: number, z: number, role: number, opts: { gx?: number; gz?: number; reserved?: boolean; cy?: number; nx?: number; nz?: number } = {}): number => {
    const l = Math.hypot(x, z);
    return scoreCover(x, opts.cy ?? 0, z, opts.nx ?? -x / l, opts.nz ?? -z / l, false, opts.gx ?? x, 0, opts.gz ?? z - 2, 0, 0, 0, role, opts.reserved ?? false);
  };
  it('role bands to the LKP', () => {
    expect(s(0, -3, R_POINT, { gz: -12 })).toBe(-Infinity);
    expect(s(0, -6, R_POINT, { gz: -12 })).toBeGreaterThan(-Infinity);
    expect(s(0, -11, R_POINT, { gz: -16 })).toBe(-Infinity);
    expect(s(0, -7, R_OVERWATCH)).toBe(-Infinity);
    expect(s(0, -8.5, R_OVERWATCH)).toBeGreaterThan(-Infinity);
    expect(s(0, -14.5, R_OVERWATCH)).toBeGreaterThan(-Infinity);
    expect(s(0, -16, R_OVERWATCH)).toBe(-Infinity);
    expect(s(0, -9, R_REPORTER)).toBe(-Infinity);
    expect(s(0, -15, R_REPORTER)).toBeGreaterThan(-Infinity);
    expect(s(0, -21, R_REPORTER)).toBe(-Infinity);
    expect(s(0, -12, R_SEARCH)).toBe(-Infinity);
  });
  it('protects only when normal . dirToLkp >= 0.3; not reserved; same storey; point must advance', () => {
    expect(s(0, -12, R_OVERWATCH, { nx: 1, nz: 0 })).toBe(-Infinity); // side-on
    expect(s(0, -12, R_OVERWATCH, { nx: 0, nz: -1 })).toBe(-Infinity); // faces away
    expect(s(0, -12, R_OVERWATCH, { nx: 0.95, nz: 0.31 })).toBeGreaterThan(-Infinity); // dot 0.31
    expect(s(0, -12, R_OVERWATCH, { reserved: true })).toBe(-Infinity);
    expect(s(0, -12, R_OVERWATCH, { cy: 3 })).toBe(-Infinity);
    expect(s(0, -8, R_POINT, { gz: -9 })).toBe(-Infinity); // only 1 m closer
    expect(s(0, -8, R_POINT, { gz: -11 })).toBeGreaterThan(-Infinity);
  });
  it('nearer cover scores higher', () => {
    expect(s(0, -12, R_OVERWATCH, { gz: -13 })).toBeGreaterThan(s(0, -12, R_OVERWATCH, { gz: -20 }));
  });
});

describe('cover grid', () => {
  it('query finds exactly the points in range', () => {
    const rng = mulberry32(1234);
    const pts: CoverPointLike[] = [];
    for (let i = 0; i < 600; i++) pts.push({ pos: { x: rng.range(-60, 60), y: 0, z: rng.range(-40, 80) }, normal: { x: 1, z: 0 }, low: false });
    const set = coverSetFrom(pts);
    const grid = CoverGrid.fromSet(set);
    const buf = new Int32Array(600);
    const qs: [number, number, number][] = [
      [0, 0, 10],
      [-60, -40, 7.5],
      [59, 79, 12],
      [200, 200, 5],
      [13.3, 21.7, 4],
      [0, 20, 100],
    ];
    for (const [x, z, r] of qs) {
      const k = grid.query(x, z, r, buf);
      const got = Array.from(buf.subarray(0, k)).sort((a, b) => a - b);
      const want: number[] = [];
      for (let i = 0; i < set.n; i++) {
        const dx = set.x[i]! - x;
        const dz = set.z[i]! - z;
        if (dx * dx + dz * dz <= r * r) want.push(i);
      }
      expect(got).toEqual(want);
    }
    // a point exactly on the radius counts
    const g2 = CoverGrid.fromSet(coverSetFrom([cp(4, 0), cp(8, 0), cp(4.01, 0)]));
    expect(g2.query(0, 0, 4, buf)).toBe(1);
    // a full buffer stops the query
    expect(grid.query(0, 20, 100, new Int32Array(5))).toBe(5);
  });

  it('empty set: queries return 0', () => {
    const g = CoverGrid.fromSet(coverSetFrom([]));
    expect(g.query(0, 0, 50, new Int32Array(4))).toBe(0);
  });
});

describe('squad roles: determinism and allocation', () => {
  it('same input, same output; member order does not matter', () => {
    const { inp, out } = setup([A, B, C, D], 4);
    assignRoles(inp, out);
    const first = bySlot(inp, out);
    assignRoles(inp, out);
    expect(bySlot(inp, out)).toEqual(first);
    const s = setup([D, C, B, A], 4);
    assignRoles(s.inp, s.out);
    expect(bySlot(s.inp, s.out)).toEqual(first);
  });

  it('ties go to the lower slot', () => {
    // two guards mirrored about the LKP axis, one point cover straight ahead: same distance, same score
    const L: G = { slot: 7, x: -2, z: -16 };
    const R: G = { slot: 3, x: 2, z: -16 };
    const { inp, out } = setup([L, R], -1, [cp(0, -7)]);
    assignRoles(inp, out);
    expect(bySlot(inp, out)).toEqual({ 3: 'point', 7: 'overwatch' });
  });

  it('seeded RNG is repeatable and per guard', () => {
    const a = mulberry32(combatSeed(42, 3, 7));
    const b = mulberry32(combatSeed(42, 3, 7));
    const c = mulberry32(combatSeed(42, 3, 8));
    const sa: number[] = [];
    const sb: number[] = [];
    const sc: number[] = [];
    for (let i = 0; i < 50; i++) {
      sa.push(a.next());
      sb.push(b.next());
      sc.push(c.next());
    }
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
    for (const v of sa) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    a.reseed(combatSeed(42, 3, 7));
    expect(a.next()).toBe(sa[0]);
    expect(combatSeed(42, 3, 7)).toBe(combatSeed(42, 3, 7));
    expect(combatSeed(42, 4, 7)).not.toBe(combatSeed(42, 3, 7));
    expect(combatSeed(1, 1, 1)).toBeGreaterThanOrEqual(0);
    // a fixed value, so a change to the seed formula shows up here
    expect(mulberry32(0).next()).toBeCloseTo(0.26642920868471265, 12);
  });

  it('no growth over 10k calls', () => {
    const E: G = { slot: 5, x: -4, z: -20 };
    const { inp, out } = setup([A, B, C, D, E], 4);
    const before = squadScratch();
    const arrays = [out.role, out.cover, out.moving, out.run, inp.slot, inp.x];
    for (let k = 0; k < 10_000; k++) {
      inp.targetCoverT = k % 10;
      assignRoles(inp, out);
    }
    const after = squadScratch();
    expect(after.query).toBe(before.query);
    expect(after.taken).toBe(before.taken);
    [out.role, out.cover, out.moving, out.run, inp.slot, inp.x].forEach((a, i) => expect(a).toBe(arrays[i]));
    expect(count(out, 5, R_POINT)).toBe(1);
  });

  it('profiles: weights, not dice', () => {
    expect(profileOf(P_AGGRESSIVE)).toBe(BEHAVIOUR.aggressive);
    expect(profileOf(99)).toBe(BEHAVIOUR.standard);
    expect(BEHAVIOUR.standard.advanceHold).toBe(2.5);
    expect(BEHAVIOUR.aggressive.advanceHold).toBe(0.8);
    expect(BEHAVIOUR.aggressive.flankWeight).toBe(2);
    expect(BEHAVIOUR.standard.coverFirst).toBe(0.85);
    expect(BEHAVIOUR.aggressive.coverFirst).toBe(0.3);
    expect(BEHAVIOUR.post.pointWeight).toBe(0);
  });
});
