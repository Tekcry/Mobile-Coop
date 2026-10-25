/**
 * (sector-fixes R1) Sector Ops section 1's co-op-only routes and its team door (docs/archive/sector-fixes/r/R1.md): the plant-room
 * service door over the yard (a 4.4 m sill onto the plant deck), the goods-in hoist monorail (a 4.4 m pipe over the east
 * lane) and the mess's back door bolted from the mess side. Built from the real `warehouseOps` map.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { S1_BOLTS, S1_COOP, S1_ROOMS } from '../src/world/maps/warehouseS1';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { generateLedges, REACH } from '../src/world/anchors';
import { MOVEMENT, TEAM, WALL_JUMP } from '../src/config/movement';
import { hyp2 } from '../src/core/mathx';
import { attachRange } from '../src/player/attach';
import { TAKEDOWN } from '../src/game/takedown';
import { LEAP_APEX, MANTLE, soloJumpThreats } from './helpers/soloJumpReach';

const b = new LevelBuilder();
warehouseOps.build(b, 0);
const anchors = generateLedges(b.boxes);
const BAND_MIN = WALL_JUMP.maxUp + 0.5;
const BAND_MAX = TEAM.boostMax;
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const solidAt = (x: number, y: number, z: number): boolean =>
  solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
/** The highest solid top under (x, z) at or below `y`. */
const floorAt = (x: number, z: number, y: number): number => {
  let f = 0;
  for (const p of solid) if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2 && top(p) <= y + 1e-3 && top(p) > f) f = top(p);
  return f;
};
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

describe('R1 plant-room service door (yard to the plant deck)', () => {
  const d = S1_COOP.plantDoor;
  const mx = (d.x0 + d.x1) / 2;
  const lip = anchors.ledges.find((l) => Math.abs(l.top - d.sill) < 1e-3 && Math.abs(l.a.z - d.z0) < 1e-3 && l.nz < -0.9 && l.a.x > d.x0 - 0.01 && l.b.x > d.x0 - 0.01 && l.a.x < d.x1 + 0.01 && l.b.x < d.x1 + 0.01);

  it('the sill is a co-op lip over the yard: in the band, hangable and climbable, facing the yard', () => {
    expect(d.sill).toBeGreaterThanOrEqual(BAND_MIN);
    expect(d.sill).toBeLessThanOrEqual(BAND_MAX);
    expect(floorAt(mx, d.z0 - 0.6, d.sill)).toBeLessThan(0.1);
    expect(lip, 'a generated lip on the sill').toBeTruthy();
    expect(lip!.canHang && lip!.canClimbUp).toBe(true);
    expect(lip!.len).toBeGreaterThanOrEqual(0.6);
  });

  it('standing room over the sill (the notch under the hood: a climb-up stands), the facade solid under it', () => {
    for (const z of [d.z0 + 0.1, d.z0 + 0.67, d.z1 - 0.1]) {
      for (let y = d.sill + 0.05; y <= d.sill + MOVEMENT.standHeight; y += 0.1) expect(solidAt(mx, y, z), `room at ${z}, ${y.toFixed(2)}`).toBe(false);
    }
    for (const y of [0.5, 2.0, 3.5, d.sill - 0.1]) expect(solidAt(mx, y, -18), `facade at ${y}`).toBe(true);
  });

  it('nothing a player alone stands on in the yard comes within a wall jump of the sill', () => {
    const near = solid.filter((p) => p.c[2] < d.z0 - 0.01 && top(p) >= d.sill - WALL_JUMP.maxUp && top(p) < d.sill - 0.05 && boxToSeg(p, d.x0, d.z0, d.x1, d.z0) < WALL_JUMP.cornerReach + 0.3);
    expect(near.map((p) => p.c.join(','))).toEqual([]);
    // and no lower lip on the yard side within reach (nothing to climb onto first)
    const lips = anchors.ledges.filter((l) => l.top < d.sill - 0.05 && l.top > 0.5 && Math.min(hyp2((l.a.x + l.b.x) / 2 - mx, (l.a.z + l.b.z) / 2 - d.z0), hyp2(l.a.x - mx, l.a.z - d.z0), hyp2(l.b.x - mx, l.b.z - d.z0)) < 2 && l.a.z < d.z0 + 0.01);
    expect(lips.map((l) => `${l.a.x.toFixed(2)},${l.a.z.toFixed(2)} y ${l.top}`)).toEqual([]);
  });

  it('(sector-fixes-r fix) no solo top on the yard side within a top-gear running jump of the sill (the in-air grab)', () => {
    expect(soloJumpThreats(solid, { y: d.sill, a: { x: d.x0, z: d.z0 }, b: { x: d.x1, z: d.z0 }, n: { x: 0, z: -1 } })).toEqual([]);
  });

  it('ways down alone: the deck 1.1 m under the sill (mantle back), the roof lips of the notch 1.6 m over it, the yard drop', () => {
    expect(floorAt(mx, d.z1 + 0.4, d.sill - 0.2)).toBeCloseTo(d.deck, 3);
    expect(d.sill - d.deck).toBeLessThanOrEqual(1.8);
    // headroom over the deck past the sill: a crouch (1.15) clears under the roof slab
    expect(solidAt(mx, d.deck + 1.2, d.z1 + 0.4)).toBe(false);
    const roofLips = anchors.ledges.filter((l) => Math.abs(l.top - 6.0) < 1e-3 && l.canClimbUp && Math.min(hyp2(l.a.x - mx, l.a.z - (d.z0 + d.z1) / 2), hyp2(l.b.x - mx, l.b.z - (d.z0 + d.z1) / 2), hyp2((l.a.x + l.b.x) / 2 - mx, (l.a.z + l.b.z) / 2 - (d.z0 + d.z1) / 2)) < 1.0);
    expect(roofLips.length).toBeGreaterThan(0);
    expect(6.0 - d.sill).toBeLessThanOrEqual(REACH.grabMax);
  });
});

describe('R1 goods-in hoist monorail (over the east lane)', () => {
  const h = S1_COOP.hoist;
  const pipe = b.anchors.pipesH.find((p) => Math.abs(p.a.y - h.y) < 1e-3 && Math.abs(p.a.x - h.x) < 1e-3 && Math.abs(p.b.x - h.x) < 1e-3);

  it('a hand-over-hand pipe at 4.4 m over the bay floor (in the band)', () => {
    expect(pipe).toBeTruthy();
    expect(h.y).toBeGreaterThanOrEqual(BAND_MIN);
    expect(h.y).toBeLessThanOrEqual(BAND_MAX);
    expect(h.z0).toBeLessThan(h.z1);
    for (const z of [h.z0, (h.z0 + h.z1) / 2, h.z1]) expect(floorAt(h.x, z, h.y)).toBeLessThan(0.1);
  });

  it('nothing a player alone stands on comes within a jump-grab of it', () => {
    // a standing grab from any top within 2.7 m under it (a hang's jump to another grip rises 1.2 m at most; the running
    // jump off a top, which lifts the feet LEAP_APEX, is the next test)
    const near = solid.filter((p) => !p.overhead && top(p) >= h.y - REACH.grabMax - 0.05 && top(p) < h.y && boxToSeg(p, h.x, h.z0, h.x, h.z1) < REACH.horiz + 0.3);
    expect(near.map((p) => p.c.join(','))).toEqual([]);
    // nor a lip from which a hanging player reaches it
    const lips = anchors.ledges.filter((l) => l.top < h.y && l.top > h.y - REACH.grabMax - 0.05 && Math.min(hyp2(l.a.x - h.x, Math.max(0, h.z0 - l.a.z, l.a.z - h.z1)), hyp2(l.b.x - h.x, Math.max(0, h.z0 - l.b.z, l.b.z - h.z1))) < REACH.horiz + 0.3);
    expect(lips.map((l) => `${l.a.x.toFixed(2)},${l.a.z.toFixed(2)} y ${l.top}`)).toEqual([]);
  });

  it('(sector-fixes-r fix) no solo top within a top-gear running jump of it (the in-air grab, FALL_GRAB); the deck is the planned way on from above', () => {
    // the east lane's two loads by its end: stacked over the mantle, no lips (nothing a player alone climbs)
    const stacks = solid.filter((p) => boxToSeg(p, h.x, h.z0, h.x, h.z1) < 2.0 && Math.abs(top(p) - S1_COOP.hoist.laneStack) < 1e-3);
    expect(stacks.length).toBe(2);
    for (const p of stacks) expect(!!p.noLedge && top(p) > MANTLE && p.c[1] - p.s[1] / 2 < 0.05).toBe(true);
    // nor from the single pallet north of them (it is itself past the reach, below). (sector-fixes-r e2e fix) A jump off
    // it peaks more than the controller's step under their tops (the capsule rides up over an edge within the step: off
    // 1.0 the e2e stood on them), and they are over the mantle from its top (a mantle from its edge crosses the gap)
    const single = solid.find((p) => Math.abs(p.c[0] + 11.4) < 1e-3 && Math.abs(p.c[2] + 11.6) < 1e-3)!;
    expect(top(single)).toBeCloseTo(S1_COOP.hoist.lanePallet, 3);
    expect(top(single) + LEAP_APEX).toBeLessThan(S1_COOP.hoist.laneStack - MOVEMENT.maxStep - 0.1);
    expect(S1_COOP.hoist.laneStack - top(single)).toBeGreaterThan(MANTLE);
    const deck = S1_COOP.plantDoor.deck;
    expect(soloJumpThreats(solid, { y: h.y, a: { x: h.x, z: h.z0 }, b: { x: h.x, z: h.z1 } }, (p) => top(p) >= deck - 1e-3)).toEqual([]);
  });

  it('the checker stops under its end (the drop takedown); way down: let go (bay floor under it)', () => {
    const checker = WAREHOUSE_SECTORS[0]!.guards[2]!;
    const stop = checker.route![1]!;
    const dz = Math.max(0, stop[1] - h.z1, h.z0 - stop[1]);
    expect(hyp2(stop[0] - h.x, dz)).toBeLessThan(0.5);
    // (sector-fixes-r e2e fix) the hands stop 0.45 m short of the pipe's end (`attachRange`): the drop from there still
    // lands within the drop takedown's reach of him
    const lim = attachRange(pipe!);
    const handZ = pipe!.a.z + ((pipe!.b.z - pipe!.a.z) / Math.abs(pipe!.b.z - pipe!.a.z)) * lim.max;
    expect(hyp2(stop[0] - h.x, stop[1] - handZ)).toBeLessThan(TAKEDOWN.dropReach);
    // nothing solid between the pipe and the floor along it (only the hanging body's room)
    for (let z = h.z0; z <= h.z1 + 1e-6; z += 0.25) for (let y = 0.1; y < h.y - 0.1; y += 0.3) expect(solidAt(h.x, y, z), `${z}, ${y}`).toBe(false);
    // the bay main crosses over it (a jump up to it, then east to the plant deck)
    const main = b.anchors.pipesH.find((p) => Math.abs(p.a.y - 5.0) < 1e-3 && Math.abs(p.a.z + 17.0) < 1e-3);
    expect(main).toBeTruthy();
    expect(Math.min(main!.a.x, main!.b.x)).toBeLessThan(h.x);
    expect(Math.max(main!.a.x, main!.b.x)).toBeGreaterThan(h.x);
  });
});

describe('R1 team door: the mess back door, bolted from the mess side', () => {
  const sec = WAREHOUSE_SECTORS[0]!;
  const centre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2];

  it('every bolt is a locked, unbreachable door at that centre; side is a unit plan vector', () => {
    expect(S1_BOLTS.length).toBeGreaterThanOrEqual(1);
    for (const bolt of S1_BOLTS) {
      const door = b.anchors.doors.find((d) => hyp2(centre(d)[0] - bolt.at[0], centre(d)[1] - bolt.at[1]) < 0.05);
      expect(door, `door at ${bolt.at}`).toBeTruthy();
      expect(door!.locked).toBe(true);
      expect(door!.breachable).toBe(false);
      expect(hyp2(bolt.side[0], bolt.side[1])).toBeCloseTo(1, 6);
    }
  });

  it('the bolt side is the mess, the far side the workshop', () => {
    const inRoom = (x: number, z: number): string | undefined => S1_ROOMS.find((r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ)?.id;
    const [bolt] = S1_BOLTS;
    expect(inRoom(bolt!.at[0] + bolt!.side[0], bolt!.at[1] + bolt!.side[1])).toBe('mess');
    expect(inRoom(bolt!.at[0] - bolt!.side[0], bolt!.at[1] - bolt!.side[1])).toBe('workshop');
  });

  it('off every guard route and post (at least 1.5 m), and the section has other doors between the same rooms', () => {
    const segDist = (px: number, pz: number, ax: number, az: number, ex: number, ez: number): number => {
      const dx = ex - ax;
      const dz = ez - az;
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
      return hyp2(px - (ax + dx * t), pz - (az + dz * t));
    };
    for (const bolt of S1_BOLTS) {
      for (const g of sec.guards) {
        const pts: [number, number][] = g.route ? g.route.map((p) => [p[0], p[1]]) : [[g.x, g.z]];
        if (g.route && g.route.length > 2) pts.push(pts[0]!);
        let d = hyp2(pts[0]![0] - bolt.at[0], pts[0]![1] - bolt.at[1]);
        for (let i = 0; i + 1 < pts.length; i++) d = Math.min(d, segDist(bolt.at[0], bolt.at[1], pts[i]![0], pts[i]![1], pts[i + 1]![0], pts[i + 1]![1]));
        expect(d, `${g.kind} at ${g.x}, ${g.z}`).toBeGreaterThanOrEqual(1.5);
      }
    }
    // the corridor's east door (x 8, z -12.9 to -11.7) joins the mess side (by the corridor) to the workshop unlocked
    const east = b.anchors.doors.find((d) => Math.abs(d.hinge.x - 8) < 1e-3 && Math.abs(d.hinge.z + 12.9) < 1e-3);
    expect(east && !east.locked).toBe(true);
    const mess = b.anchors.doors.find((d) => Math.abs(d.hinge.x - 1.9) < 1e-3 && Math.abs(d.hinge.z + 10.8) < 1e-3);
    expect(mess && !mess.locked).toBe(true);
  });
});
