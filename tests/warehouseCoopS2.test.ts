/**
 * (sector-fixes R2) Sector Ops section 2's co-op-only routes and its team door (docs/archive/sector-fixes/r/R2.md): the high-bay
 * row R3 (tops 4.4, lips only where planned, no rolling ladder; C1 R3S, C2 R3N) and the VNA escape gate in R1S's
 * through-bay, bolted from the A2 side. Built from the real `warehouseOps` map.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { S2_BOLTS, S2_COOP, S2_HIGH_TOP, S2_LANDING, S2_ROOMS, S2_THROUGH_BAY } from '../src/world/maps/warehouseS2';
import { TAKEDOWN } from '../src/game/takedown';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { findJumpTarget, generateLedges, type Ledge } from '../src/world/anchors';
import { MOVEMENT, SPLIT, TEAM, WALL_JUMP } from '../src/config/movement';
import { inBoostBand, ropeRoom } from '../src/game/teamMoves';
import { hyp2 } from '../src/core/mathx';
import { soloJumpReach, soloJumpThreats } from './helpers/soloJumpReach';

const b = new LevelBuilder();
warehouseOps.build(b, 0);
const anchors = generateLedges(b.boxes);
const BAND_MIN = WALL_JUMP.maxUp + 0.5;
const BAND_MAX = TEAM.boostMax;
/**
 * A hang's jump from a pipe, ladder or drainpipe to a lip spans 2.5 m at most (`findJumpTarget`'s gap): the lips keep this
 * clear of every one. (sector-fixes-r fix) It is not the solo reach from a top: a top-gear running jump off a 4.0 rack top
 * carries the in-air grab about 4.5 m (tests/helpers/soloJumpReach.ts), checked against every top below.
 */
const SOLO_GAP = 3.0;
const HALL = S2_ROOMS.find((r) => r.id === 'storage')!;
const SEC = WAREHOUSE_SECTORS[1]!;
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const inHall = (x: number, z: number, m = 0): boolean => x > HALL.minX - m && x < HALL.maxX + m && z > HALL.minZ - m && z < HALL.maxZ + m;
const solidAt = (x: number, y: number, z: number): boolean =>
  solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
/** Plan distance from a box's footprint to the segment a -> e. */
const boxToSeg = (p: BoxPiece, ax: number, az: number, ex: number, ez: number): number => {
  let best = Infinity;
  for (let k = 0; k <= 20; k++) {
    const x = ax + ((ex - ax) * k) / 20;
    const z = az + ((ez - az) * k) / 20;
    const dx = Math.max(0, Math.abs(x - p.c[0]) - p.s[0] / 2);
    const dz = Math.max(0, Math.abs(z - p.c[2]) - p.s[2] / 2);
    best = Math.min(best, hyp2(dx, dz));
  }
  return best;
};
/** Plan distance between two segments (sampled). */
const segToSeg = (ax: number, az: number, ex: number, ez: number, px: number, pz: number, qx: number, qz: number): number => {
  let best = Infinity;
  for (let k = 0; k <= 40; k++) {
    const x = px + ((qx - px) * k) / 40;
    const z = pz + ((qz - pz) * k) / 40;
    const dx = ex - ax;
    const dz = ez - az;
    const l2 = dx * dx + dz * dz;
    const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    best = Math.min(best, hyp2(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
};
const inBay = (x: number, z: number, bay: readonly [number, number, number, number]): boolean =>
  x > bay[0] - 0.01 && x < bay[2] + 0.01 && z > bay[1] - 0.01 && z < bay[3] + 0.01;
/** The pieces of the high-bay blocks (the co-op surfaces). */
const bayPieces = solid.filter((p) => S2_COOP.some((r) => inBay(p.c[0], p.c[2], r.bay) && Math.abs(top(p) - S2_HIGH_TOP) < 1e-3));
/** The co-op lips: generated ledges on the high-bay blocks. */
const coopLips = anchors.ledges.filter((l) => Math.abs(l.top - S2_HIGH_TOP) < 1e-3 && S2_COOP.some((r) => inBay(l.a.x, l.a.z, r.bay) && inBay(l.b.x, l.b.z, r.bay)));
/** A planned lip (route, lip index) a ledge lies on, or null. */
const plannedOf = (l: Ledge): { r: number; k: number } | null => {
  for (let r = 0; r < S2_COOP.length; r++)
    for (let k = 0; k < S2_COOP[r]!.lips.length; k++) {
      const p = S2_COOP[r]!.lips[k]!;
      const on = Math.abs(l.a.x - p.x) < 1e-3 && Math.abs(l.b.x - p.x) < 1e-3 && Math.sign(l.nx) === p.nx;
      if (on && Math.min(l.a.z, l.b.z) > p.z0 - 1e-3 && Math.max(l.a.z, l.b.z) < p.z1 + 1e-3) return { r, k };
    }
  return null;
};

/** (sector-fixes-r e2e fix) C2's lip: the landing's west edge (S2_LANDING). */
const L = S2_LANDING;
const landingLip = (l: Ledge): boolean => Math.abs(l.a.x - L.x0) < 1e-3 && Math.abs(l.b.x - L.x0) < 1e-3 && l.nx < -0.5 && Math.abs(l.top - L.top) < 1e-3 && Math.min(l.a.z, l.b.z) > L.z0 - 1e-3 && Math.max(l.a.z, l.b.z) < L.z1 + 1e-3;

describe('R2 the high-bay row (C1 R3S, C2 R3N): co-op lips in the band', () => {
  it('the tops sit in the co-op band read from the constants', () => {
    expect(S2_HIGH_TOP).toBeGreaterThanOrEqual(BAND_MIN);
    expect(S2_HIGH_TOP).toBeLessThanOrEqual(BAND_MAX);
    expect(inBoostBand(S2_HIGH_TOP)).toBe(true);
    // (sector-fixes-r fix) one route with a lip (C1b); R3N is a lipless block
    expect(S2_COOP.filter((r) => r.lips.length > 0).length).toBeGreaterThanOrEqual(1);
  });

  it('every generated lip on the high bays is a planned one, hangable and climbable onto a full top; every planned lip exists', () => {
    expect(coopLips.length).toBeGreaterThan(0);
    for (const l of coopLips) {
      expect(plannedOf(l), `unplanned lip at (${l.a.x.toFixed(2)}, ${l.a.z.toFixed(2)}) - (${l.b.x.toFixed(2)}, ${l.b.z.toFixed(2)})`).not.toBeNull();
      expect(l.canHang && l.canClimbUp).toBe(true);
    }
    S2_COOP.forEach((r, ri) =>
      r.lips.forEach((p, k) => {
        const len = coopLips.filter((l) => { const q = plannedOf(l); return q && q.r === ri && q.k === k; }).reduce((s, l) => s + l.len, 0);
        expect(len, `${r.name} lip ${k}`).toBeGreaterThan(p.z1 - p.z0 - 0.05);
      }),
    );
  });

  it('LD 11.5: every lip in the hall between solo reach and the boost is a planned co-op lip or a 4.0 rack top (SPEC 3)', () => {
    const odd = anchors.ledges.filter((l) => {
      if (!inHall((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2) || l.top <= WALL_JUMP.maxUp || l.top > BAND_MAX) return false;
      return Math.abs(l.top - 4.0) > 1e-3 && !plannedOf(l) && !landingLip(l);
    });
    expect(odd.map((l) => `(${l.a.x.toFixed(1)}, ${l.a.z.toFixed(1)}) ${l.top}`)).toEqual([]);
  });

  it('a leg-up from each planned spot finds its lip in the band (the team controller\'s own search)', () => {
    for (const r of S2_COOP)
      for (const p of r.lips) {
        const [x, z] = p.spot;
        const apex = { x, y: TEAM.boostMax - 1.15, z };
        const t = findJumpTarget(anchors, apex, -1, -p.nx, 0, 1, 2.2, 0.2);
        expect(t, `${r.name} from (${x}, ${z})`).not.toBeNull();
        expect(inBoostBand(t!.grip.y)).toBe(true);
        expect((t!.anchor as Ledge).canClimbUp).toBe(true);
        expect(Math.abs((t!.anchor as Ledge).top - S2_HIGH_TOP)).toBeLessThan(1e-3);
        // room for the offer (TEAM.roomUp of free air over the crouched booster) on open floor
        for (let y = 0.1; y <= TEAM.roomUp; y += 0.1) expect(solidAt(x, y, z), `${r.name} room at ${y.toFixed(1)}`).toBe(false);
        // the run-in side: a body's width of floor back from the spot
        for (let d = 0; d <= TEAM.roomSide; d += 0.25) expect(solidAt(x + p.nx * d, 0.5, z)).toBe(false);
      }
  });
});

describe('R2 no unplanned solo access to the high bays', () => {
  // (sector-fixes-r fix) the solo-standable tops round the hall (floor objects, racks, stacks; not the high bays): none
  // within a top-gear running jump of a co-op lip (the in-air grab, FALL_GRAB, from the constants)
  it('no solo top within a top-gear running jump of a co-op lip (rack tops, stacks, desks)', () => {
    const near: string[] = [];
    for (const l of coopLips)
      for (const t of soloJumpThreats(solid, { y: l.top, a: l.a, b: l.b, n: { x: l.nx, z: l.nz } }, (p) => bayPieces.includes(p) || !inHall(p.c[0], p.c[2], 3)))
        near.push(`lip (${l.a.x}, ${l.a.z.toFixed(1)}-${l.b.z.toFixed(1)}): ${t}`);
    expect(near).toEqual([]);
  });

  it('no lip faces A3 (the R2 rack tops 3.0 m across it are within a running jump)', () => {
    for (const r of S2_COOP) for (const l of r.lips) expect(l.nx, r.name).toBe(1);
    expect(coopLips.filter((l) => l.nx < -0.5)).toEqual([]);
  });

  it('and SOLO_GAP from every pipe, ladder and drainpipe (a grip-to-grip jump reaches 2.5 m)', () => {
    const near: string[] = [];
    for (const l of coopLips) {
      for (const p of b.anchors.pipesH) {
        const d = segToSeg(l.a.x, l.a.z, l.b.x, l.b.z, p.a.x, p.a.z, p.b.x, p.b.z);
        if (d < SOLO_GAP) near.push(`pipe ${d.toFixed(2)}`);
      }
      for (const p of [...b.anchors.pipesV.map((v) => v.base), ...b.anchors.ladders.map((v) => v.base)]) {
        const d = segToSeg(l.a.x, l.a.z, l.b.x, l.b.z, p.x, p.z, p.x, p.z);
        if (d < SOLO_GAP) near.push(`climb (${p.x}, ${p.z}) ${d.toFixed(2)}`);
      }
    }
    expect(near).toEqual([]);
  });

  it('no ladder serves the high-bay row (the R3S rolling ladder is gone)', () => {
    for (const r of S2_COOP) for (const l of b.anchors.ladders) expect(hyp2(Math.max(0, Math.abs(l.base.x - (r.bay[0] + r.bay[2]) / 2) - (r.bay[2] - r.bay[0]) / 2), Math.max(0, Math.abs(l.base.z - (r.bay[1] + r.bay[3]) / 2) - (r.bay[3] - r.bay[1]) / 2))).toBeGreaterThan(SOLO_GAP);
  });

  it('out of a solo wall jump from the floor', () => {
    for (const l of coopLips) expect(l.top).toBeGreaterThan(WALL_JUMP.maxUp + 0.49);
  });
});

describe('R2 a way down alone, and the rope', () => {
  it('every high bay has open floor beside each planned lip: a drop or a hang-drop (no fall damage), and the rope fits', () => {
    for (const r of S2_COOP) {
      for (const p of r.lips) {
        const zm = (p.z0 + p.z1) / 2;
        for (let y = 0.1; y < S2_HIGH_TOP + 0.5; y += 0.2) expect(solidAt(p.x + p.nx * 0.5, y, zm), `${r.name} drop at ${y.toFixed(1)}`).toBe(false);
      }
      // the two-person rope needs a top at least 1 m deep (Marlow's rope wall) and a floor within its length
      expect(r.bay[2] - r.bay[0]).toBeGreaterThanOrEqual(1.0);
      expect(ropeRoom(S2_HIGH_TOP, 0)).toBe('ok');
      // standing room where the climb-up lands (the roof sheets' collision, 6.03, leaves 1.63 m over a 4.4 top: the lips
      // stay out from under the sheet bands; elsewhere under a band the top is crouch-walked)
      for (const p of r.lips)
        for (const z of [p.z0 + 0.3, (p.z0 + p.z1) / 2, p.z1 - 0.3])
          for (let y = S2_HIGH_TOP + 0.05; y <= S2_HIGH_TOP + MOVEMENT.standHeight + 0.05; y += 0.1) expect(solidAt(p.x - p.nx * 0.6, y, z), `${r.name} stand at ${z}, ${y.toFixed(2)}`).toBe(false);
    }
  });
});

describe('R2 the routes and guards are untouched', () => {
  const ground: [number, number, number, number][] = [];
  for (const g of SEC.guards) {
    const route = g.route ?? [[g.x, g.z]];
    for (let k = 0; k < route.length; k++) {
      const p = route[k]!;
      const q = route[(k + 1) % route.length]!;
      ground.push([p[0], p[1], q[0], q[1]]);
    }
  }
  const routeSegs: [number, number, number, number][] = [];
  for (const r of SEC.routes)
    for (let k = 1; k < r.pts.length; k++) {
      const p = r.pts[k - 1]!;
      const q = r.pts[k]!;
      if ((p[2] ?? 0) > 0.5 || (q[2] ?? 0) > 0.5) continue;
      routeSegs.push([p[0], p[1], q[0], q[1]]);
    }

  it('no new piece (high bays, the through-bay) stands on a guard path or a ground leg of the three routes', () => {
    const fresh = [...bayPieces, ...solid.filter((p) => Math.abs(p.c[0] + 18.75) < 0.01 && p.c[2] > -3 && p.c[2] < 4)];
    const hit: string[] = [];
    for (const p of fresh)
      for (const [ax, az, ex, ez] of [...ground, ...routeSegs]) {
        if (bottom(p) > 2.0) continue;
        const d = boxToSeg(p, ax, az, ex, ez);
        if (d < 0.3) hit.push(`(${p.c[0]}, ${p.c[2]}) ${d.toFixed(2)} from (${ax}, ${az}) - (${ex}, ${ez})`);
      }
    expect(hit).toEqual([]);
  });
});

describe('R2 the team door: the VNA escape gate in R1S, bolted from the A2 side', () => {
  it('one bolt; its door is at `at`, locked, not breachable; `side` is a unit normal to the leaf toward A2', () => {
    expect(S2_BOLTS).toHaveLength(1);
    for (const bolt of S2_BOLTS) {
      const doors = b.anchors.doors.filter((d) => {
        const cx = d.hinge.x + Math.sin(d.yaw) * d.width * 0.5;
        const cz = d.hinge.z + Math.cos(d.yaw) * d.width * 0.5;
        return hyp2(cx - bolt.at[0], cz - bolt.at[1]) < 0.05;
      });
      expect(doors).toHaveLength(1);
      const d = doors[0]!;
      expect(d.locked).toBe(true);
      expect(d.breachable).toBe(false);
      expect(hyp2(bolt.side[0], bolt.side[1])).toBeCloseTo(1, 6);
      // the leaf runs along (sin yaw, cos yaw): the side is across it
      expect(Math.abs(bolt.side[0] * Math.sin(d.yaw) + bolt.side[1] * Math.cos(d.yaw))).toBeLessThan(1e-6);
      // the bolt side is A2 (east of R1S), the near side A1
      expect(bolt.at[0] + bolt.side[0] * 0.5).toBeGreaterThan(S2_THROUGH_BAY.x1);
      expect(bolt.at[0] - bolt.side[0] * 1.0).toBeLessThan(S2_THROUGH_BAY.x1);
    }
  });

  it('the through-bay is open floor under a head over the door, too narrow for a split, and the door fills it', () => {
    const tb = S2_THROUGH_BAY;
    const zm = (tb.z0 + tb.z1) / 2;
    for (let x = tb.x0 + 0.05; x < tb.x1; x += 0.2) for (let y = 0.1; y < tb.head; y += 0.2) expect(solidAt(x, y, zm), `${x.toFixed(2)}, ${y.toFixed(1)}`).toBe(false);
    expect(solidAt((tb.x0 + tb.x1) / 2, tb.head + 0.1, zm)).toBe(true);
    expect(tb.z1 - tb.z0).toBeLessThan(SPLIT.minWidth);
    const d = b.anchors.doors.find((q) => hyp2(q.hinge.x - S2_BOLTS[0]!.at[0], q.hinge.z - tb.z0) < 0.05)!;
    expect(d.width).toBeCloseTo(tb.z1 - tb.z0, 6);
    expect(d.height).toBeLessThanOrEqual(tb.head);
  });

  it('on no guard route (2 m clear of every patrol leg and post) and on no route leg (not the only way: A1 and A2 both open on the lane)', () => {
    for (const bolt of S2_BOLTS) {
      for (const g of SEC.guards) {
        const route = g.route ?? [[g.x, g.z]];
        for (let k = 0; k < route.length; k++) {
          const p = route[k]!;
          const q = route[(k + 1) % route.length]!;
          expect(segToSeg(p[0], p[1], q[0], q[1], bolt.at[0], bolt.at[1], bolt.at[0], bolt.at[1]), `${g.kind} at (${g.x}, ${g.z})`).toBeGreaterThan(2);
        }
      }
      // the three routes pass beside it at most (R3 walks up A2 past the gate's face; the leaf swings into the bay, -x)
      for (const r of SEC.routes)
        for (let k = 1; k < r.pts.length; k++) {
          const p = r.pts[k - 1]!;
          const q = r.pts[k]!;
          expect(segToSeg(p[0], p[1], q[0], q[1], bolt.at[0], bolt.at[1], bolt.at[0], bolt.at[1]), r.name).toBeGreaterThan(0.6);
        }
      const d = b.anchors.doors.find((q) => hyp2(q.hinge.x - bolt.at[0], q.hinge.z - S2_THROUGH_BAY.z0) < 0.05)!;
      // the leaf opens away from the bolt side (`doors.ts`: yaw + swing * angle), so an open gate never juts into A2
      expect(d.swing * (Math.cos(d.yaw) * bolt.side[0] - Math.sin(d.yaw) * bolt.side[1])).toBeLessThan(0);
    }
    // the way round: A1's and A2's south mouths onto the lane are open floor
    for (const x of [-21.4, -16.7]) for (const z of [-2.8, -1.0]) expect(solidAt(x, 0.5, z), `(${x}, ${z})`).toBe(false);
  });
});

// (sector-fixes-r e2e fix; Michael M1 2026-10-22 ~21:20 "Add another") C2: the dispatch mezzanine's landing on the x -4
// wall over the east gangway (S2_LANDING), a second co-op-only route in section 2
describe('R2 C2 the landing on the x -4 wall', () => {
  const lips = anchors.ledges.filter(landingLip);
  const onLanding = anchors.ledges.filter((l) => {
    const mx = (l.a.x + l.b.x) / 2;
    const mz = (l.a.z + l.b.z) / 2;
    return mx > L.x0 - 0.05 && mx < L.x1 + 0.05 && mz > L.z0 - 0.05 && mz < L.z1 + 0.05 && l.top > WALL_JUMP.maxUp;
  });
  const grip = (l: Ledge) => ({ y: l.top, a: l.a, b: l.b, n: { x: l.nx, z: l.nz } });

  it('one lip, the west edge, in the band, hangable and climbable onto the top; the landing carries no other grip', () => {
    expect(L.top).toBeGreaterThanOrEqual(BAND_MIN);
    expect(L.top).toBeLessThanOrEqual(BAND_MAX);
    expect(lips.length).toBeGreaterThan(0);
    expect(lips.reduce((s, l) => s + l.len, 0)).toBeGreaterThan(1.0);
    for (const l of lips) expect(l.canHang && l.canClimbUp).toBe(true);
    expect(onLanding.filter((l) => !landingLip(l)).map((l) => `(${l.a.x}, ${l.a.z}) n ${l.nx}, ${l.nz} y ${l.top}`)).toEqual([]);
  });

  it('a leg-up from its spot (facing +x) finds it, with room for the offer and the run-in', () => {
    const [x, z] = L.spot;
    const t = findJumpTarget(anchors, { x, y: TEAM.boostMax - 1.15, z }, -1, 1, 0, 1, 2.2, 0.2);
    expect(t).not.toBeNull();
    expect(landingLip(t!.anchor as Ledge)).toBe(true);
    for (let y = 0.1; y <= TEAM.roomUp; y += 0.1) expect(solidAt(x, y, z), `room at ${y.toFixed(1)}`).toBe(false);
    for (let d = 0; d <= TEAM.roomSide; d += 0.25) expect(solidAt(x - d, 0.5, z)).toBe(false);
  });

  it('no solo top within a top-gear running jump of it, with 0.5 m to spare (tests/helpers/soloJumpReach.ts)', () => {
    const skip = (p: BoxPiece): boolean => bayPieces.includes(p) || !inHall(p.c[0], p.c[2], 3) || (bottom(p) > 4.0 && p.c[0] > L.x0 - 0.05);
    for (const l of lips) expect(soloJumpThreats(solid, grip(l), skip, 0.5)).toEqual([]);
    // the nearest one, the empty-pallet stack (2.0): 4.1 m off against its reach
    const stack = solid.find((p) => Math.abs(p.c[0] + 6.0) < 1e-3 && Math.abs(p.c[2] + 2.8) < 1e-3)!;
    expect(L.z0 - (stack.c[2] + stack.s[2] / 2) - soloJumpReach(top(stack), L.top)).toBeGreaterThan(0.5);
  });

  it('no pipe, ladder or drainpipe within a hang\'s jump (2.5 m grip to grip) plus 0.5', () => {
    for (const l of lips) {
      for (const p of b.anchors.pipesH) {
        const d = segToSeg(l.a.x, l.a.z, l.b.x, l.b.z, p.a.x, p.a.z, p.b.x, p.b.z);
        expect(hyp2(d, p.a.y - l.top), `pipe at ${p.a.y}`).toBeGreaterThan(3.0);
      }
      for (const p of [...b.anchors.pipesV.map((v) => v.base), ...b.anchors.ladders.map((v) => v.base)]) expect(segToSeg(l.a.x, l.a.z, l.b.x, l.b.z, p.x, p.z, p.x, p.z)).toBeGreaterThan(3.0);
    }
  });

  it('hung (overhead, nothing on the floor), a drop under the lip, standing room on top, the rope fits', () => {
    for (const p of solid) if (p.c[0] > L.x0 - 0.01 && p.c[0] < L.x1 + 0.01 && p.c[2] > L.z0 - 0.05 && p.c[2] < L.z1 + 0.05 && top(p) > 4.0) expect(bottom(p) > 4.0 && !!p.overhead).toBe(true);
    const zm = (L.z0 + L.z1) / 2;
    for (let y = 0.1; y < L.top + 0.5; y += 0.2) expect(solidAt(L.x0 - 0.5, y, zm), `drop at ${y.toFixed(1)}`).toBe(false);
    for (const z of [L.z0 + 0.4, zm, L.z1 - 0.4]) for (let y = L.top + 0.05; y <= L.top + MOVEMENT.standHeight + 0.05; y += 0.1) expect(solidAt(L.x0 + 0.6, y, z), `stand at ${z}, ${y.toFixed(2)}`).toBe(false);
    expect(L.x1 - L.x0).toBeGreaterThanOrEqual(1.0);
    expect(ropeRoom(L.top, 0)).toBe('ok');
  });

  it('off every guard path (only the overhead slab; the picker passes under its edge, inside a hang-drop of the lip)', () => {
    const picker = SEC.guards[4]!;
    const px = picker.route![0]![0];
    expect(px).toBeLessThan(L.x0);
    // the hanging body is HANG.out (0.22) out from the lip; the drop takedown reaches 1.0
    expect(L.x0 - 0.22 - px).toBeLessThan(TAKEDOWN.dropReach);
    for (let x = L.x0 - 0.3; x <= px + 0.3; x += 0.1) for (const y of [0.5, 1.5]) expect(solidAt(x, y, (L.z0 + L.z1) / 2)).toBe(false);
  });
});
