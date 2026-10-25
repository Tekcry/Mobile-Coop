/**
 * (sector-fixes R3) Sector Ops section 3's co-op-only routes and its team door (docs/archive/sector-fixes/r/R3.md): the zone-valve
 * platform beside the hall main (east bay), the crane bridge's drive platform over the CNC cell with the sprinkler branch,
 * and the plant room's service door into the fire-exit lobby, bolted from the lobby side. Built from the real `warehouseOps`.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { S3_BOLTS, S3_COOP, S3_ROOF_HOODS, S3_ROOMS } from '../src/world/maps/warehouseS3';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { findJumpTarget, generateLedges, REACH, type Ledge } from '../src/world/anchors';
import { MOVEMENT, TEAM, WALL_JUMP } from '../src/config/movement';
import { inBoostBand, ropeRoom } from '../src/game/teamMoves';
import { hyp2 } from '../src/core/mathx';
import facts from '../scripts/kestrel/facts.json';
import { soloJumpThreats } from './helpers/soloJumpReach';

const b = new LevelBuilder();
warehouseOps.build(b, 0);
// the generated lips join the placed anchors (pipes, ladders), as the build does
const anchors = generateLedges(b.boxes, b.anchors);
const BAND_MIN = WALL_JUMP.maxUp + 0.5;
const BAND_MAX = TEAM.boostMax;
/** The game's mantle and jump-grab reach (scripts/kestrel/facts.json, F04 / F06). */
const MANTLE = facts.traverse.mantleMax.value;
const JUMP_GRAB = Math.max(REACH.grabMax, facts.reach.jumpGrab.value);
/** A jump from a hang rises at most this (findJumpTarget) and spans at most this (its default gap). */
const JUMP_UP = 1.2;
const JUMP_GAP = 2.5;

type Plat = { x0: number; x1: number; z0: number; z1: number; top: number };
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const solidAt = (x: number, y: number, z: number): boolean =>
  solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
/** The highest solid top under (x, z) at or below `y`. */
const floorAt = (x: number, z: number, y: number): number => {
  let f = 0;
  for (const p of solid) if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2 && top(p) <= y + 1e-3 && top(p) > f) f = top(p);
  return f;
};
/** Plan gap between a box's footprint and a platform's. */
const gapTo = (p: BoxPiece, q: Plat): number =>
  hyp2(Math.max(0, Math.abs(p.c[0] - (q.x0 + q.x1) / 2) - p.s[0] / 2 - (q.x1 - q.x0) / 2), Math.max(0, Math.abs(p.c[2] - (q.z0 + q.z1) / 2) - p.s[2] / 2 - (q.z1 - q.z0) / 2));
/** Plan gap between a point and a platform. */
const ptGap = (x: number, z: number, q: Plat): number => hyp2(Math.max(0, q.x0 - x, x - q.x1), Math.max(0, q.z0 - z, z - q.z1));
/** The platform's own pieces: the slab and its rails (inside its footprint, at or over its underside). */
const own = (p: BoxPiece, q: Plat): boolean => gapTo(p, q) < 1e-6 && Math.abs(p.c[0] - (q.x0 + q.x1) / 2) <= (q.x1 - q.x0) / 2 + 1e-6 && Math.abs(p.c[2] - (q.z0 + q.z1) / 2) <= (q.z1 - q.z0) / 2 + 1e-6 && bottom(p) >= q.top - 0.31;
/** A floor piece a player alone cannot get on: no lips and over the mantle (the CNC machines, the cabinets). */
const unclimbable = (p: BoxPiece): boolean => !!p.noLedge && bottom(p) < 0.05 && top(p) > MANTLE;
/** Lips generated on a platform's slab. */
const lipsOf = (q: Plat): Ledge[] =>
  anchors.ledges.filter((l) => Math.abs(l.top - q.top) < 1e-3 && [l.a, l.b].every((e) => e.x > q.x0 - 0.01 && e.x < q.x1 + 0.01 && e.z > q.z0 - 0.01 && e.z < q.z1 + 0.01));
/** The main and its branch: the planned solo way along the services (the plant-room roof, the deck's north end). */
const isMainNetwork = (a: { a: { x: number; z: number }; b: { x: number; z: number }; hangHeight: number }): boolean =>
  Math.abs(a.hangHeight - 5.0) < 1e-3 && ((Math.abs(a.a.x - 17.0) < 1e-3 && Math.abs(a.b.x - 17.0) < 1e-3) || (Math.abs(a.a.z - S3_COOP.branch.z) < 1e-3 && Math.abs(a.b.z - S3_COOP.branch.z) < 1e-3));

/** The platforms, the side the boost comes from (the open floor; outward normal) and the railed side. */
const PLATS: { name: string; q: Plat; boost: [number, number]; railed: [number, number] }[] = [
  { name: 'zone-valve platform', q: S3_COOP.valve, boost: [0, 1], railed: [0, -1] },
  { name: 'crane drive platform', q: S3_COOP.drive, boost: [0, 1], railed: [-1, 0] },
];

describe.each(PLATS)('R3 $name', ({ q, boost, railed }) => {
  const cx = (q.x0 + q.x1) / 2;
  const cz = (q.z0 + q.z1) / 2;
  const lips = lipsOf(q);
  // the boost side's lip mid point and a spot 0.6 m out over the floor
  const bx = boost[0] > 0 ? q.x1 : boost[0] < 0 ? q.x0 : cx;
  const bz = boost[1] > 0 ? q.z1 : boost[1] < 0 ? q.z0 : cz;
  const outX = bx + boost[0] * 0.6;
  const outZ = bz + boost[1] * 0.6;

  it('the lip is in the co-op band (WALL_JUMP.maxUp + 0.5 .. TEAM.boostMax) over open floor', () => {
    expect(q.top).toBeGreaterThanOrEqual(BAND_MIN);
    expect(q.top).toBeLessThanOrEqual(BAND_MAX);
    expect(inBoostBand(q.top - floorAt(outX, outZ, q.top - 0.5))).toBe(true);
    expect(floorAt(outX, outZ, q.top - 0.5)).toBeLessThan(0.1);
    expect(floorAt(cx, cz, q.top - 0.5)).toBeLessThan(2.5);
  });

  it('lips: hang and climb on the boost side, none on the railed side', () => {
    const on = (l: Ledge, n: [number, number]): boolean => Math.abs(l.nx - n[0]) < 0.01 && Math.abs(l.nz - n[1]) < 0.01;
    const front = lips.filter((l) => on(l, boost));
    expect(front.length).toBeGreaterThan(0);
    expect(front.every((l) => l.canHang && l.canClimbUp && l.len >= 0.6)).toBe(true);
    expect(lips.filter((l) => on(l, railed) && l.canHang)).toEqual([]);
  });

  it('a leg-up from the floor in front finds the lip (the toss apex, as Marlow Yard), then relay or rope for the partner', () => {
    const apex = { x: outX, y: TEAM.boostMax - 1.15, z: outZ };
    const t = findJumpTarget(anchors, apex, -1, -boost[0], -boost[1], 1, 2.2, 0.2);
    expect(t).not.toBeNull();
    expect(t!.anchor.kind).toBe('ledge');
    expect(lips).toContain(t!.anchor);
    expect(inBoostBand(t!.grip.y)).toBe(true);
    expect((t!.anchor as Ledge).canClimbUp).toBe(true);
    // the relay: the partner under the hanging one reaches up the body; the rope: a top 1 m thick, the floor in its range
    expect(q.top - 0).toBeLessThanOrEqual(TEAM.relayMax);
    expect(Math.min(q.x1 - q.x0, q.z1 - q.z0)).toBeGreaterThanOrEqual(1.0);
    expect(ropeRoom(q.top, floorAt(outX, outZ, q.top - 0.5))).toBe('ok');
  });

  // (sector-fixes-r e2e fix) was a crouch under the hall roof (6.03): the climb-up off a lip needs a standing body's room
  // (`AttachController.climbRoom`), so the roof over the platform is cut open under a hood (underside 6.3)
  it('standing room on top under its hood (the climb-up), the hood closed over it', () => {
    for (const [x, z] of [[cx, cz], [q.x0 + 0.3, q.z1 - 0.3], [q.x1 - 0.3, q.z0 + 0.3], [q.x0 + 0.67, cz], [q.x1 - 0.67, cz], [cx, q.z0 + 0.67], [cx, q.z1 - 0.67]] as const) {
      for (let y = q.top + 0.05; y <= q.top + MOVEMENT.standHeight + 0.1; y += 0.1) expect(solidAt(x, y, z), `${x}, ${y.toFixed(2)}, ${z}`).toBe(false);
      expect(solidAt(x, S3_COOP.hoodUnder + 0.1, z), `hood over ${x}, ${z}`).toBe(true);
    }
    expect(S3_ROOF_HOODS).toContainEqual([q.x0, q.x1, q.z0, q.z1]);
  });

  it('no unplanned solo access: nothing a player alone stands on within a jump-grab or a wall jump, no other anchor within a jump', () => {
    const solo = solid.filter((p) => !own(p, q) && !unclimbable(p) && top(p) > 0.3 && top(p) < q.top - 0.05);
    // a grab from a top (standing or jumping: F06 jump-grab 3.1 m) within the hands' reach
    const grab = solo.filter((p) => top(p) >= q.top - JUMP_GRAB && gapTo(p, q) < REACH.horiz + 0.3);
    expect(grab.map((p) => p.c.join(','))).toEqual([]);
    // a wall jump from a top within its reach of the lip
    const wall = solo.filter((p) => top(p) >= q.top - WALL_JUMP.maxUp && gapTo(p, q) < WALL_JUMP.cornerReach + 0.3);
    expect(wall.map((p) => p.c.join(','))).toEqual([]);
    // from a hang: a lip, pipe or ladder no more than a jump below the top within a jump's gap; only the main and its branch
    const others: string[] = [];
    for (const l of anchors.ledges) {
      if (lips.includes(l) || !l.canHang || l.top < q.top - JUMP_UP || l.top > q.top + JUMP_UP) continue;
      const g = Math.min(ptGap(l.a.x, l.a.z, q), ptGap(l.b.x, l.b.z, q), ptGap((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, q));
      if (g < JUMP_GAP) others.push(`ledge ${l.a.x.toFixed(2)},${l.a.z.toFixed(2)} y ${l.top}`);
    }
    for (const p of anchors.pipesH) {
      if (isMainNetwork(p) || p.hangHeight < q.top - JUMP_UP) continue;
      let g = Infinity;
      for (let k = 0; k <= 20; k++) g = Math.min(g, ptGap(p.a.x + ((p.b.x - p.a.x) * k) / 20, p.a.z + ((p.b.z - p.a.z) * k) / 20, q));
      if (g < JUMP_GAP) others.push(`pipe ${p.a.x},${p.a.z} y ${p.hangHeight}`);
    }
    for (const p of anchors.ladders) if (p.top.y >= q.top - JUMP_UP && ptGap(p.top.x, p.top.z, q) < JUMP_GAP) others.push(`ladder ${p.top.x},${p.top.z}`);
    expect(others).toEqual([]);
  });

  it('(sector-fixes-r fix) no solo top within a top-gear running jump of a lip (the in-air grab, FALL_GRAB)', () => {
    const near: string[] = [];
    for (const l of lips) if (l.canHang) for (const t of soloJumpThreats(solid, { y: l.top, a: l.a, b: l.b, n: { x: l.nx, z: l.nz } }, (p) => own(p, q))) near.push(t);
    expect(near).toEqual([]);
  });

  it('ways down alone: let go over open floor (nothing under the boost lip); a reviver reaches it alone along the main', () => {
    for (let y = 0.1; y < q.top - 0.35; y += 0.25) expect(solidAt(outX - boost[0] * 0.3, y, outZ - boost[1] * 0.3), `under the lip at ${y.toFixed(2)}`).toBe(false);
    // the main (or its branch) passes within a hang's jump of a lip: up 0.4 - 1.2 m, within 1 m across
    const linked = anchors.pipesH.filter(isMainNetwork).some((p) =>
      lips.some((l) => {
        const up = p.hangHeight - l.top;
        if (up < 0.4 || up > JUMP_UP) return false;
        for (let k = 0; k <= 40; k++) {
          const x = p.a.x + ((p.b.x - p.a.x) * k) / 40;
          const z = p.a.z + ((p.b.z - p.a.z) * k) / 40;
          for (const e of [l.a, l.b, { x: (l.a.x + l.b.x) / 2, z: (l.a.z + l.b.z) / 2 }]) if (hyp2(x - e.x, z - e.z) <= 1.0) return true;
        }
        return false;
      }),
    );
    expect(linked).toBe(true);
  });

  it('guards walk under it: the new pieces sit over 4 m, clear of every section 3 post and route', () => {
    const mine = solid.filter((p) => own(p, q));
    expect(mine.length).toBeGreaterThan(0);
    for (const p of mine) expect(bottom(p)).toBeGreaterThanOrEqual(q.top - 0.31);
    expect(q.top - 0.3).toBeGreaterThan(4.0);
    // every guard on the hall floor passes under it (head room over 2 m); the deck guards (y 3.3) are on the far side of the deck edge
    for (const g of WAREHOUSE_SECTORS[2]!.guards) {
      const gy = g.y ?? 0;
      for (const [x, z] of [[g.x, g.z], ...(g.route ?? [])] as const) {
        if (ptGap(x, z, q) > 1.0) continue;
        expect(gy, `guard point ${x}, ${z}`).toBe(0);
        for (const p of mine) expect(bottom(p) - gy).toBeGreaterThan(2.0);
      }
    }
  });
});

describe('R3 the main network and the branch', () => {
  it('the branch line leaves the main at x 17 and ends over the drive platform east lip, at the main height', () => {
    const br = S3_COOP.branch;
    const pipe = anchors.pipesH.find((p) => Math.abs(p.a.z - br.z) < 1e-3 && Math.abs(p.b.z - br.z) < 1e-3);
    expect(pipe).toBeTruthy();
    expect(pipe!.hangHeight).toBe(br.y);
    const main = anchors.pipesH.find((p) => Math.abs(p.a.x - 17.0) < 1e-3 && Math.abs(p.b.x - 17.0) < 1e-3 && Math.abs(p.hangHeight - 5.0) < 1e-3);
    expect(main).toBeTruthy();
    expect(Math.min(main!.a.z, main!.b.z)).toBeLessThan(br.z);
    expect(Math.max(main!.a.z, main!.b.z)).toBeGreaterThan(br.z);
    expect(Math.max(pipe!.a.x, pipe!.b.x)).toBeCloseTo(17.0, 6);
    expect(Math.min(pipe!.a.x, pipe!.b.x) - S3_COOP.drive.x1).toBeLessThan(0.3);
    // the main is the high route's climb (route 2 hangs along it at 5.0): a player alone gets on it from the plant-room roof
    const high = WAREHOUSE_SECTORS[2]!.routes[1]!;
    expect(high.pts.some((p) => Math.abs(p[0] - 17.0) < 1e-3 && p[2] === 5.0)).toBe(true);
  });

  it('the supervisor stops by the drive platform east lip (the hang-drop)', () => {
    const sup = WAREHOUSE_SECTORS[2]!.guards[4]!;
    const d = S3_COOP.drive;
    expect(sup.x - d.x1).toBeGreaterThan(0);
    expect(sup.x - d.x1).toBeLessThan(0.6);
    expect(sup.z).toBeGreaterThan(d.z0);
    expect(sup.z).toBeLessThan(d.z1);
  });
});

describe('R3 team door: the plant room service door into the fire-exit lobby, bolted from the lobby side', () => {
  const sec = WAREHOUSE_SECTORS[2]!;
  const centre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2];
  /** The smallest ground-floor room round (x, z) (the hall's box holds the plant room and the lobby). */
  const inRoom = (x: number, z: number): string | undefined =>
    S3_ROOMS.filter((r) => r.maxY !== undefined && x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ).sort((p, q) => (p.maxX - p.minX) * (p.maxZ - p.minZ) - (q.maxX - q.minX) * (q.maxZ - q.minZ))[0]?.id;

  it('every bolt is a locked, unbreachable door at that centre; side is a unit plan vector; the section carries the list', () => {
    expect(S3_BOLTS.length).toBe(1);
    for (const bolt of S3_BOLTS) {
      const door = b.anchors.doors.find((d) => hyp2(centre(d)[0] - bolt.at[0], centre(d)[1] - bolt.at[1]) < 0.05);
      expect(door, `door at ${bolt.at}`).toBeTruthy();
      expect(door!.locked).toBe(true);
      expect(door!.breachable).toBe(false);
      expect(hyp2(bolt.side[0], bolt.side[1])).toBeCloseTo(1, 6);
      // the doorway is open in the wall (a gap, the lintel over the door height)
      expect(solidAt(bolt.at[0], 1.0, bolt.at[1])).toBe(false);
      expect(solidAt(bolt.at[0], 3.0, bolt.at[1])).toBe(true);
    }
    // (sector-fixes-r2) the sector list adds the door width (w) for the unbolt reach
    expect(sec.bolts?.map(({ at, side }) => ({ at, side }))).toEqual(S3_BOLTS);
  });

  it('the bolt side is the lobby, the far side the plant room', () => {
    const [bolt] = S3_BOLTS;
    expect(inRoom(bolt!.at[0] + bolt!.side[0], bolt!.at[1] + bolt!.side[1])).toBe('fireLobby');
    expect(inRoom(bolt!.at[0] - bolt!.side[0], bolt!.at[1] - bolt!.side[1])).toBe('plant');
  });

  it('not on any guard route or post, and not the only way into the lobby (the fire door, the roof hatch)', () => {
    const [bolt] = S3_BOLTS;
    const [x, z] = bolt!.at;
    const segGap = (a: readonly [number, number], e: readonly [number, number]): number => {
      const dx = e[0] - a[0];
      const dz = e[1] - a[1];
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)) : 0;
      return hyp2(a[0] + dx * t - x, a[1] + dz * t - z);
    };
    for (const g of sec.guards) {
      expect(hyp2(g.x - x, g.z - z), `post ${g.x}, ${g.z}`).toBeGreaterThan(1.5);
      const r = g.route ?? [];
      for (let i = 0; i < r.length; i++) expect(segGap(r[i]!, r[(i + 1) % r.length]!), `route ${g.x}, ${g.z} leg ${i}`).toBeGreaterThan(1.0);
    }
    // the fire door (16, -6.3) stays an unlocked way in; the lobby roof hatch is open
    const fire = b.anchors.doors.find((d) => hyp2(centre(d)[0] - 16, centre(d)[1] + 6.3) < 0.05);
    expect(fire?.locked).toBe(false);
    expect(solidAt(22.5, 3.1, -7.2)).toBe(false);
    // the section's three routes do not need it: none passes through the doorway
    for (const r of sec.routes) for (let i = 0; i + 1 < r.pts.length; i++) expect(segGap([r.pts[i]![0], r.pts[i]![1]], [r.pts[i + 1]![0], r.pts[i + 1]![1]]), r.name).toBeGreaterThan(0.6);
  });
});
