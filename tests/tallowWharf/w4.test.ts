/**
 * Tallow Wharf GB4: the W4 wharf sheds. The eight rooms are the graph's; the clerestory boost (C9) and the jetty pull (C10) sit
 * in the code's bands with no solo jump onto either; the only lip in the co-op band is the planned one; the jetty cannot be
 * reached on foot with the gate and the yard door shut; the canal bed is walkable but has no wall-jump lip; the gantry and
 * its arm are caged; the circuits are the brief's. J8 G4 adds the re-light to LIGHT.md section 5 (every lamp on, the table's
 * lamps, switches and conduits, levels at the check points, the raised crane lamp's line from the W3 roof), the jetty way back
 * (the drop off the open edge), cover, hide spots, the medkit, the gantry look-out and the encounter vantages.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BoxPiece } from '../../src/world/levelBuilder';
import { MOVEMENT, TEAM, WALL_JUMP } from '../../src/config/movement';
import { hyp2 } from '../../src/core/mathx';
import { PULL } from '../../src/game/kit/pullUp';
import { contribution, type LightDef } from '../../src/world/lights';
import { lampReach } from '../../src/world/lampMath';
import { CHEST_Y, HEAD_Y } from '../../src/world/lighting/levels';
import { SECTION_BOX, STANDIN_TAGS } from '../../src/world/maps/tallowWharfKit';
import { WHARF_SECTORS } from '../../src/world/maps/tallowWharfSectors';
import { anchorsOf, blockedAt, builtWharf, climbRoom, COOP_BAND, downHit, GREY_KEEP_CLEAR, legUpTarget, onPlannedLip, pullCheck, roomForBoost, soloJumpThreats, soloNav, solidOf, space, spacesIn, type ShutDoor } from './helpers';
import { W4, W4_CONDUITS, W4_DROP_GUARDS, W4_GUARD_GAPS, W4_LIP, W4_PULL, W4_SHUTTER } from '../../src/world/maps/tallowWharfW4';

const { b } = builtWharf();
const solid = solidOf(b);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const inRect = (p: BoxPiece, x0: number, x1: number, z0: number, z1: number, eps = 0.01): boolean =>
  p.c[0] + p.s[0] / 2 > x0 + eps && p.c[0] - p.s[0] / 2 < x1 - eps && p.c[2] + p.s[2] / 2 > z0 + eps && p.c[2] - p.s[2] / 2 < z1 - eps;
const W4_BOX = SECTION_BOX.W4;
const MANTLE = 1.8;
const NORTH_FACE = 28.3;
const SPOT = W4.legUps[0]!;
const inW4 = (x: number, z: number): boolean => x >= W4_BOX[0] && x <= W4_BOX[2] && z >= W4_BOX[1] && z <= W4_BOX[3];
/** The jetty gate and the shed three yard door, shut (the bolted pair a solo run cannot pass). */
const SHUT: ShutDoor[] = [
  { at: [72, 8], y: 0, w: 1.2, alongX: false },
  { at: [72, 19], y: 0, w: 1.2, alongX: false },
];

/** The W4 guards (`W4_GUARDS` in the sectors file) and their post and route points as { x, z, y }. */
const W4G = WHARF_SECTORS[3]!.guards;
const guardPoints = (): { x: number; z: number; y: number; who: string }[] =>
  W4G.flatMap((g, i) => [{ x: g.x, z: g.z, y: g.y ?? 0, who: `guard ${i} post` }, ...(g.route ?? []).map(([x, z], k) => ({ x, z, y: g.y ?? 0, who: `guard ${i} route ${k}` }))]);

/** Is (x, y, z) inside a piece of `pieces`? */
const inside = (pieces: readonly BoxPiece[], x: number, y: number, z: number): BoxPiece | undefined =>
  pieces.find((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
/** The first piece a segment crosses, sampled every 0.05 m and stopped `stop` m short of its end. */
function segmentBlock(pieces: readonly BoxPiece[], a: readonly [number, number, number], e: readonly [number, number, number], stop: number): string | null {
  const len = Math.hypot(e[0] - a[0], e[1] - a[1], e[2] - a[2]);
  for (let d = 0; d <= len - stop; d += 0.05) {
    const t = d / len;
    const x = a[0] + (e[0] - a[0]) * t;
    const y = a[1] + (e[1] - a[1]) * t;
    const z = a[2] + (e[2] - a[2]) * t;
    const p = inside(pieces, x, y, z);
    if (p) return `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) in box (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')})`;
  }
  return null;
}
/** The plan distance from a point to a rectangle [x0, z0, x1, z1]. */
const distRect = (x: number, z: number, r: readonly number[]): number => hyp2(Math.max(r[0]! - x, 0, x - r[2]!), Math.max(r[1]! - z, 0, z - r[3]!));

/**
 * LIGHT.md section 1 rule 3: ambient + the brighter of chest (floor + CHEST_Y) and head (floor + HEAD_Y) of the summed
 * `contribution` over the given lamps, capped at 1, visibility 1. A cone lamp (the floods 92 and 93) is read through its cone.
 */
function levelAt(lamps: readonly LightDef[], ambient: number, x: number, floorY: number, z: number): number {
  let chest = 0;
  let head = 0;
  for (const l of lamps) {
    chest += contribution(l, x, floorY + CHEST_Y, z);
    head += contribution(l, x, floorY + HEAD_Y, z);
  }
  return Math.min(1, ambient + Math.max(chest, head));
}

describe('W4 the wharf sheds: the graph', () => {
  it('has the eight graph rooms, each equal to its graph area and storey', () => {
    expect(W4.rooms).toHaveLength(8);
    expect(W4.rooms.map((r) => r.id).sort()).toEqual(spacesIn('W4').map((s) => s.id).sort());
    for (const r of W4.rooms) {
      const g = space(r.id);
      const [x0, z0, x1, z1] = g.area[0]!;
      expect([r.minX, r.minZ, r.maxX, r.maxZ], r.id).toEqual([x0, z0, x1, z1]);
      expect(r.minY ?? 0, r.id).toBeCloseTo(g.storey, 6);
    }
    expect(W4.rooms.find((r) => r.id === 'w4-canal-ledge')!.minY).toBe(-4.4);
    expect(W4.rooms.find((r) => r.id === 'w4-boat')!.minY).toBe(-1);
  });

  it('keeps the stub id, entry and exit, and lists a deviation for each built-as-different space', () => {
    expect(W4.id).toBe('W4');
    expect([...W4.entry]).toEqual([90, 0, 32]);
    expect([...W4.exit]).toEqual([90, -1, 3]);
    const dev = W4.deviations.map((d) => d.space);
    for (const id of ['w4-back-lane', 'w4-canal-ledge', 'w4-gantry', 'w4-shed-two', 'w4-jetty']) expect(dev).toContain(id);
  });
});

describe('W4 C9: the clerestory boost', () => {
  it('is 4.4 over the lane, inside COOP_BAND', () => {
    expect(W4_LIP.y - W4_LIP.floor).toBeCloseTo(4.4, 9);
    expect(W4_LIP.y - W4_LIP.floor).toBeGreaterThanOrEqual(COOP_BAND.min);
    expect(W4_LIP.y - W4_LIP.floor).toBeLessThanOrEqual(COOP_BAND.max);
    expect(W4.lips).toEqual([W4_LIP]);
  });

  it('the leg-up from (79, 0, 29.2) facing -z finds the lip, which can be climbed, top 4.4, normal +z; the booster has room', () => {
    expect([SPOT.x, SPOT.y, SPOT.z]).toEqual([79, 0, 29.2]);
    expect(SPOT.facing).toEqual({ x: 0, z: -1 });
    const t = legUpTarget(anchorsOf(b), SPOT, SPOT.facing);
    expect(t).not.toBeNull();
    const l = t!.anchor as { kind: string; canClimbUp: boolean; top: number; nz: number; nx: number };
    expect(l.kind).toBe('ledge');
    expect(l.canClimbUp).toBe(true);
    expect(l.top).toBeCloseTo(4.4, 6);
    expect(l.nz).toBeGreaterThan(0.99);
    expect(roomForBoost(solid, SPOT, SPOT.facing)).toBe(true);
    // the climb-up off the lip has a standing body's room inside the face (AttachController.climbRoom): the 2.0 sash, the 6.7 roof
    expect(climbRoom(solid, W4_LIP)).toEqual([]);
  });

  it('the sash is open (a 1.2 wide gap at 4.4-6.4) and the tea-chest stack under it is 2.0 and noLedge', () => {
    const wallPieces = solid.filter((p) => inRect(p, 78.45, 79.55, 27.75, 28.25) && top(p) > 4.41 && bottom(p) < 6.39);
    expect(wallPieces).toEqual([]);
    const stack = solid.find((p) => Math.abs(p.c[0] - 79) < 0.01 && Math.abs(p.s[0] - 3) < 1e-6 && Math.abs(p.c[2] - 26.6) < 0.01);
    expect(stack).toBeDefined();
    expect(top(stack!)).toBeCloseTo(2.0, 6);
    expect(stack!.noLedge).toBe(true);
  });
});

describe('W4 C10: the jetty pull', () => {
  it('is ok: band 4.4, an open edge, the catch point within 1.6 of the partner', () => {
    expect(W4.pulls).toEqual([W4_PULL]);
    expect(W4_PULL.holder.y - W4_PULL.partner.y).toBeCloseTo(4.4, 9);
    expect(W4_PULL.holder.y - W4_PULL.partner.y).toBeGreaterThanOrEqual(PULL.min);
    expect(W4_PULL.holder.y - W4_PULL.partner.y).toBeLessThanOrEqual(PULL.max);
    const r = pullCheck(solid, W4_PULL);
    expect(r.band).toBe('ok');
    expect(r.hang).not.toBeNull();
    expect(r.partnerReach).toBe(true);
    expect(r.holderOk).toBe(true);
    expect(r.ok).toBe(true);
  });
});

describe('W4: no solo jump', () => {
  const pullGrip = { y: 0, a: { x: 72.5, z: 6 }, b: { x: 74.5, z: 6 }, n: { x: 0, z: -1 } };
  it('soloJumpThreats is empty for the clerestory lip and the pull edge', () => {
    expect(soloJumpThreats(solid, W4_LIP)).toEqual([]);
    expect(soloJumpThreats(solid, pullGrip)).toEqual([]);
  });

  it('the check has teeth: a 1.8 m crate on the lane within the running jump threatens the lip, one at GREY_KEEP_CLEAR does not', () => {
    const crate = (gap: number): BoxPiece => ({ c: [79, 0.9, NORTH_FACE + gap + 0.5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true });
    expect(soloJumpThreats([...solid, crate(2.5)], W4_LIP).length).toBeGreaterThan(0);
    expect(soloJumpThreats([...solid, crate(GREY_KEEP_CLEAR)], W4_LIP)).toEqual([]);
  });

  it('keep-clear: nothing a player can stand on between the floor and the lip on the lane side (x 74.3-84.3, z 28.3-33)', () => {
    const bad = solid.filter((p) => inRect(p, 74.3, 84.3, 28.3, 33) && top(p) > 0.3 && bottom(p) < 4.35).map((p) => `(${p.c.join(', ')}) ${p.s.join(' x ')}`);
    expect(bad).toEqual([]);
  });

  it('keep-clear on the canal bed round the pull edge (x 68.8-78.2, z 0-6): only boxes too thin or too tall to stand on', () => {
    const bad = solid
      .filter((p) => inRect(p, 68.8, 78.2, 0, 6) && top(p) > -4.4 + 0.3 && bottom(p) < 0)
      .filter((p) => !(p.noLedge && (Math.min(p.s[0], p.s[2]) < 0.38 || top(p) - -4.4 > MANTLE)))
      .map((p) => `(${p.c.join(', ')}) ${p.s.join(' x ')}`);
    expect(bad).toEqual([]);
  });
});

describe('W4: only planned lips', () => {
  it('every hangable ledge in the W4 box at the co-op band is the clerestory lip; the lip exists as a manual ledge', () => {
    const [x0, z0, x1, z1] = W4_BOX;
    const ledges = anchorsOf(b).ledges.filter((l) => {
      const mx = (l.a.x + l.b.x) / 2;
      const mz = (l.a.z + l.b.z) / 2;
      return mx >= x0 && mx <= x1 && mz >= z0 && mz <= z1;
    });
    const band = ledges.filter((l) => l.canHang && l.top >= WALL_JUMP.maxUp && l.top <= TEAM.boostMax + 0.05 && l.drop >= 1.9);
    const bad = band.filter((l) => !onPlannedLip(l, [W4_LIP])).map((l) => `(${l.a.x.toFixed(2)}, ${l.a.z.toFixed(2)}) -> (${l.b.x.toFixed(2)}, ${l.b.z.toFixed(2)}) top ${l.top}`);
    expect(bad).toEqual([]);
    expect(band.length).toBeGreaterThanOrEqual(1);
  });
});

describe('W4: no solo bypass', () => {
  const shut = [
    { at: [72, 8] as [number, number], y: 0, w: 1.2, alongX: false },
    { at: [72, 19] as [number, number], y: 0, w: 1.2, alongX: false },
  ];
  it('the lane cannot reach the jetty on foot with the gate and the shed three yard door shut (the shutter stand-in is solid)', () => {
    const { nav, restore } = soloNav(b, 4, W4.navSeeds, shut);
    try {
      expect(nav.findPath([90, 32], [88, 8], 1e6, 0, 0)).toBeNull();
      // controls: the lane reaches the yard (the open gate), and shed three reaches the jetty through the loading door
      expect(nav.findPath([90, 32], [58, 18], 1e6, 0, 0)).not.toBeNull();
      expect(nav.findPath([79, 18], [88, 8], 1e6, 0, 0)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('the bolted doors are the brief\'s, and the shutter is a closed stand-in (data only, no placeShutter in the file)', () => {
    expect(W4.doors['w4-jetty-gate']).toEqual([72, 0, 8]);
    expect(W4.doors['w4-shed3-yard']).toEqual([72, 0, 19]);
    expect(W4.shutters).toEqual([{ id: 'w4-shutter', x: 92, y: 0, z: 28, yaw: 0, width: 3, height: 3 }]);
    expect(W4.shutters[0]).toEqual(W4_SHUTTER);
    const tags = STANDIN_TAGS.get(b)!;
    const i = [...tags.entries()].find(([, tag]) => tag === 'shutter-standin:w4-shutter')![0];
    const p = b.boxes[i]!;
    expect(p.collide).toBe(true);
    expect(p.noLedge).toBe(true);
    expect([p.s[0], p.s[1]]).toEqual([3, 3]);
    expect(readFileSync(new URL('../../src/world/maps/tallowWharfW4.ts', import.meta.url), 'utf8')).not.toContain('placeShutter(');
    // the sliding loading door, the fire door and the canal door exist
    const doors = b.anchors.doors;
    const at = (x: number, z: number) => doors.find((d) => Math.abs(d.hinge.z - z) < 1e-6 && Math.abs(d.hinge.x - x) < 1e-6);
    expect(at(77.5, 10)).toMatchObject({ leaf: 'slide', width: 3, locked: false });
    expect(at(86, 18.4)).toBeDefined();
    expect(at(92.4, 10)).toBeDefined();
  });
});

describe('W4: the canal', () => {
  it('the bed top is -4.4 over the whole W4 canal; the hull (3.4 over it) and the jetty (4.4) are noLedge', () => {
    const bed = solid.find((p) => Math.abs(top(p) + 4.4) < 1e-6 && p.s[0] >= 76 - 1e-6 && Math.abs(p.s[2] - 6) < 1e-6);
    expect(bed).toBeDefined();
    const hull = solid.find((p) => Math.abs(p.c[0] - 90) < 0.01 && Math.abs(p.s[0] - 12) < 1e-6 && Math.abs(top(p) + 1) < 1e-6);
    const jetty = solid.find((p) => Math.abs(p.c[0] - 86) < 0.01 && Math.abs(p.s[0] - 28) < 1e-6 && Math.abs(top(p)) < 1e-6 && Math.abs(p.s[2] - 4) < 1e-6);
    expect(hull).toBeDefined();
    expect(jetty).toBeDefined();
    expect(top(hull!) - -4.4).toBeLessThan(WALL_JUMP.maxUp);
    expect(hull!.noLedge).toBe(true);
    expect(jetty!.noLedge).toBe(true);
    // everything standing in the canal and rising off the bed is noLedge
    for (const p of solid.filter((q) => inRect(q, 44, 120, 0, 6) && top(q) > -4.1 && bottom(q) < 0)) expect(p.noLedge, `box (${p.c.join(', ')})`).toBe(true);
  });

  it('no wall-jump lip off the bed: no ledge within 0.3 m of the hull, the jetty\'s south face, the steps\' body or the fence', () => {
    const faces: [number, number, number, number][] = [
      [84, 1, 96, 5],
      [72, 6, 100, 10],
      [86.75, 5, 89.25, 6],
      [71.85, 5, 72.15, 10],
    ];
    const near = anchorsOf(b).ledges.filter((l) => l.top < 11 && faces.some(([x0, z0, x1, z1]) => [l.a, l.b].some((q) => q.x > x0 - 0.3 && q.x < x1 + 0.3 && q.z > z0 - 0.3 && q.z < z1 + 0.3)));
    expect(near.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
  });

  it('the quay ladder runs from the bed (-4.4) to the quay (0)', () => {
    const l = b.anchors.ladders.find((q) => Math.abs(q.base.x - 58) < 0.01 && q.base.y < -4);
    expect(l).toBeDefined();
    expect(l!.base.y).toBeCloseTo(-4.4, 6);
    expect(l!.top.y).toBeCloseTo(0, 6);
    expect(l!.top.z).toBeCloseTo(6.0, 6);
  });

  it('the gangway is a 6-riser stair from the jetty edge (y 0) to the boat deck (y -1)', () => {
    const ramp = b.boxes.find((p) => p.collide && Math.abs(p.pitch) > 1e-3 && Math.abs(p.c[0] - 88) < 0.01);
    expect(ramp).toBeDefined();
    expect(ramp!.s[0]).toBeCloseTo(2.5, 6);
  });
});

describe('W4: the drop guards', () => {
  it('six guards exist as collide noLedge boxes 2.2 tall on y 10 along their segments, open only at the listed joins', () => {
    expect(W4.dropGuards).toBe(W4_DROP_GUARDS);
    expect(W4.dropGuards.map((g) => g.id).sort()).toEqual(['w4-dg-arm-e', 'w4-dg-arm-w', 'w4-dg-gantry-e', 'w4-dg-gantry-n', 'w4-dg-gantry-s', 'w4-dg-gantry-w']);
    // the look-out's clear glass is left out (its turned box would match a sample in the bay); it is the look-out test's
    const guards = b.boxes.filter((p) => p.collide && p.noLedge && !p.glass && Math.abs(bottom(p) - 10) < 1e-6 && Math.abs(p.s[1] - 2.2) < 1e-6);
    for (const g of W4.dropGuards) {
      expect(g.y).toBe(10);
      expect(g.h).toBeCloseTo(2.2, 9);
      const horizontal = Math.abs(g.a.z - g.b.z) < 1e-6;
      const lo = horizontal ? Math.min(g.a.x, g.b.x) : Math.min(g.a.z, g.b.z);
      const hi = horizontal ? Math.max(g.a.x, g.b.x) : Math.max(g.a.z, g.b.z);
      const gaps = W4_GUARD_GAPS[g.id] ?? [];
      for (let s = lo + 0.05; s < hi; s += 0.1) {
        const open = gaps.some((q) => s > q[0] + 1e-6 && s < q[1] - 1e-6);
        // a corner shares its 0.1 m with the neighbouring guard: leave out samples within 0.12 m of a gap's edge
        if (gaps.some((q) => Math.abs(s - q[0]) < 0.12 || Math.abs(s - q[1]) < 0.12)) continue;
        const x = horizontal ? s : g.a.x;
        const z = horizontal ? g.a.z : s;
        const hit = guards.some((p) => Math.abs(p.c[0] - x) <= p.s[0] / 2 + 1e-6 && Math.abs(p.c[2] - z) <= p.s[2] / 2 + 1e-6);
        expect(hit, `${g.id} at ${s.toFixed(2)}`).toBe(!open);
      }
    }
    expect(W4_GUARD_GAPS['w4-dg-gantry-s']).toEqual([[59.4, 60.6]]);
    expect(W4_GUARD_GAPS['w4-dg-gantry-n']).toEqual([[50.0, 54.0], [84, 85.2]]);
  });

  it('the gantry slab (9.7-10) and the arm (x 84-85.2, z 19-29.4) are noLedge, and no top between them and the roof of shed three can be reached from them', () => {
    const slab = solid.find((p) => Math.abs(top(p) - 10) < 1e-6 && Math.abs(p.s[1] - 0.3) < 1e-6 && p.s[0] > 30);
    const arm = solid.find((p) => Math.abs(top(p) - 10) < 1e-6 && Math.abs(p.c[0] - 84.6) < 0.01 && Math.abs(p.s[2] - 10.4) < 1e-6);
    expect(slab!.noLedge).toBe(true);
    expect(arm!.noLedge).toBe(true);
    const ladders = b.anchors.ladders.filter((l) => Math.abs(l.top.y - 10) < 1e-6);
    expect(ladders).toHaveLength(2);
    expect(ladders.some((l) => Math.abs(l.base.x - 60) < 0.01)).toBe(true);
    expect(ladders.some((l) => Math.abs(l.base.x - 84.6) < 0.01)).toBe(true);
  });
});


describe('W4: the lights (LIGHT.md section 5)', () => {
  const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inW4(l.x, l.z));
  const group = (g: number) => lamps.filter((l) => l.group === g);

  /** LIGHT.md section 5's table: group, x, y, z, r, i. */
  const TABLE: readonly (readonly [number, number, number, number, number, number])[] = [
    [91, 75, 5.4, 13.5, 8, 1.5],
    [91, 75, 5.4, 21.5, 8, 1.5],
    [91, 80.5, 5.4, 13.5, 8, 1.5],
    [91, 80.5, 5.4, 21.5, 8, 1.5],
    [92, 79, 4.0, 9.6, 12, 1.3],
    [93, 66, 6.0, 27.2, 16, 1.4],
    [93, 53, 9.6, 17, 16, 3.5],
    [93, 65, 9.6, 17, 16, 3.5],
    [94, 50, 4.0, 6.6, 7, 0.4],
    [94, 64, 4.0, 6.6, 7, 0.4],
    [94, 88, 4.0, 9.7, 7, 0.4],
    [95, 66, 4.0, 30.4, 7, 0.3],
    [95, 48, 5.0, 33.6, 7, 0.3],
    [95, 104, 5.0, 33.6, 7, 0.3],
    [95, 117, 5.0, 33.6, 7, 0.3],
    [96, 93, 2.4, 10.6, 4, 0.4],
    [97, 88, 14, 5, 6, 0.6],
    [98, 90, 3.0, 3, 3, 0.15],
  ];

  it('18 lamps in groups 91-98, every one on (no light left off), counts [4, 1, 3, 3, 4, 1, 1, 1]', () => {
    expect(lamps).toHaveLength(18);
    for (const l of lamps) expect(l.on, `group ${l.group} at (${l.x}, ${l.z})`).toBe(true);
    expect([...new Set(lamps.map((l) => l.group))].sort((p, q) => p - q)).toEqual([91, 92, 93, 94, 95, 96, 97, 98]);
    expect([91, 92, 93, 94, 95, 96, 97, 98].map((g) => group(g).length)).toEqual([4, 1, 3, 3, 4, 1, 1, 1]);
    const src = readFileSync(new URL('../../src/world/maps/tallowWharfW4.ts', import.meta.url), 'utf8');
    expect(src).not.toContain('on: false');
    expect(src).not.toContain('stays dark');
  });

  it('each lamp\'s position, r and i are LIGHT.md section 5\'s (the registry holds the reach, lampReach(r)); the floods are 92 and 93', () => {
    expect(TABLE).toHaveLength(18);
    for (const [g, x, y, z, r, i] of TABLE) {
      const l = lamps.find((q) => q.group === g && Math.abs(q.x - x) < 1e-6 && Math.abs(q.y - y) < 1e-6 && Math.abs(q.z - z) < 1e-6);
      expect(l, `group ${g} at (${x}, ${y}, ${z})`).toBeDefined();
      expect(l!.radius, `r of ${g} at (${x}, ${z})`).toBeCloseTo(lampReach(r), 9);
      expect(l!.intensity, `i of ${g} at (${x}, ${z})`).toBeCloseTo(i, 9);
    }
    const cones = lamps.filter((l) => l.cone);
    expect(cones.map((l) => l.group).sort((p, q) => p - q)).toEqual([92, 93, 93, 93]);
    // the crane floods aim straight down from under the deck
    for (const l of group(93).filter((q) => q.y > 9)) expect(l.cone!.dy).toBeCloseTo(-1, 6);
  });

  it('switched groups are exactly 91, 92 and 93; 94-98 have none; 96 and 97 are not destructible, 97 not electric; every other lamp (98 included) is both', () => {
    expect(W4.switches.map((s) => s.group).sort((p, q) => p - q)).toEqual([91, 92, 93]);
    for (const g of [94, 95, 96, 97, 98]) expect(W4.switches.some((s) => s.group === g), `no switch on ${g}`).toBe(false);
    for (const l of lamps) {
      expect(l.destructible, `destructible, group ${l.group} at (${l.x}, ${l.z})`).toBe(l.group !== 96 && l.group !== 97);
      expect(l.electric, `electric, group ${l.group} at (${l.x}, ${l.z})`).toBe(l.group !== 97);
    }
    expect(group(97)[0]!.color).toEqual([1, 0.1, 0.1]);
  });
});

describe('W4: switches and conduits (LIGHT.md rules 5-6)', () => {
  const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inW4(l.x, l.z));
  const sw = (g: number) => W4.switches.find((s) => s.group === g)!;
  const near = (g: number, jambs: readonly [number, number][]): number => Math.min(...jambs.map(([x, z]) => hyp2(sw(g).pos.x - x, sw(g).pos.z - z)));

  it('each switch is within 1.5 m (plan) of the nearer jamb of its door or opening, on floor 0', () => {
    expect(near(91, [[86, 18.4], [86, 19.6]]), 'the fire door').toBeLessThanOrEqual(1.5);
    expect(near(92, [[77.5, 10], [80.5, 10]]), 'the loading door').toBeLessThanOrEqual(1.5);
    expect(near(93, [[64.25, 28], [67.75, 28]]), 'the lane gate').toBeLessThanOrEqual(1.5);
    for (const s of W4.switches) expect(s.pos.y, `group ${s.group} floor`).toBe(0);
  });

  it('conduits: one run per lamp of 91, 92 and 93; each starts within 0.3 m (plan) of its switch at y 1.2, ends within 0.3 m of a lamp, every leg axis-aligned', () => {
    expect([...new Set(W4_CONDUITS.map((c) => c.group))].sort((p, q) => p - q)).toEqual([91, 92, 93]);
    for (const g of [91, 92, 93]) {
      const runs = W4_CONDUITS.filter((c) => c.group === g);
      const gl = lamps.filter((l) => l.group === g);
      expect(runs.length, `runs of ${g}`).toBe(gl.length);
      for (const r of runs) {
        const [x0, y0, z0] = r.pts[0]!;
        expect(hyp2(sw(g).pos.x - x0, sw(g).pos.z - z0), `run of ${g} starts at its switch`).toBeLessThanOrEqual(0.3);
        expect(y0, `run of ${g} starts at 1.2 over the switch's floor`).toBeCloseTo(sw(g).pos.y + 1.2, 6);
        for (let i = 0; i + 1 < r.pts.length; i++) {
          const d = [0, 1, 2].filter((k) => Math.abs(r.pts[i + 1]![k]! - r.pts[i]![k]!) > 1e-9).length;
          expect(d, `a leg of ${g} is axis-aligned`).toBe(1);
        }
        const [ex, ey, ez] = r.pts[r.pts.length - 1]!;
        expect(Math.min(...gl.map((l) => Math.hypot(l.x - ex, l.y - ey, l.z - ez))), `run of ${g} ends at a lamp`).toBeLessThanOrEqual(0.3);
      }
      for (const l of gl) {
        const ends = runs.filter((r) => {
          const e = r.pts[r.pts.length - 1]!;
          return Math.hypot(l.x - e[0], l.y - e[1], l.z - e[2]) <= 0.3;
        });
        expect(ends, `lamp of ${g} at (${l.x}, ${l.y}, ${l.z}) is the end of exactly one run`).toHaveLength(1);
      }
    }
  });

  it('the conduits are built: visual-only 0.05 boxes in #4f5459, one per leg', () => {
    const cond = b.boxes.filter((p) => p.color === '#4f5459' && inW4(p.c[0], p.c[2]) && p.c[2] < 30);
    expect(cond).toHaveLength(W4_CONDUITS.reduce((n, c) => n + c.pts.length - 1, 0));
    for (const p of cond) {
      expect(p.collide).toBe(false);
      expect(Math.min(...p.s)).toBeCloseTo(0.05, 6);
    }
  });
});

describe('W4: levels at the check points (LIGHT.md section 5)', () => {
  const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inW4(l.x, l.z));
  const of = (...g: number[]): LightDef[] => lamps.filter((l) => g.includes(l.group));
  const rows: { name: string; g: number[]; amb: number; at: [number, number, number]; ok: (v: number) => boolean; want: string }[] = [
    { name: 'shed three floor', g: [91], amb: 0.14, at: [78, 0, 18], ok: (v) => v >= 0.79, want: '>= 0.79' },
    { name: 'shed three west', g: [91], amb: 0.14, at: [73, 0, 17], ok: (v) => v >= 0.79, want: '>= 0.79' },
    { name: 'candle chest', g: [91], amb: 0.14, at: [75.5, 0, 14], ok: (v) => v >= 0.79, want: '>= 0.79' },
    { name: 'shed two mid', g: [96], amb: 0.14, at: [93, 0, 19], ok: (v) => v <= 0.28, want: '<= 0.28' },
    { name: 'shed yard centre', g: [93, 94], amb: 0.244, at: [58, 0, 17], ok: (v) => v >= 0.7, want: '>= 0.70' },
    { name: 'jetty at the loading door', g: [92, 94, 97], amb: 0.244, at: [79, 0, 8], ok: (v) => v >= 0.7, want: '>= 0.70' },
    { name: 'canal ledge', g: [92, 94], amb: 0.244, at: [68, -4.4, 4.5], ok: (v) => v <= 0.35, want: '<= 0.35' },
    { name: 'back lane at the checkpoint', g: [95], amb: 0.244, at: [90, 0, 32], ok: (v) => v <= 0.3, want: '<= 0.30' },
    { name: 'clerestory boost spot', g: [95], amb: 0.244, at: [79, 0, 29.2], ok: (v) => v <= 0.3, want: '<= 0.30' },
    { name: 'gantry', g: [], amb: 0.244, at: [58, 10, 17], ok: (v) => v <= 0.28, want: '<= 0.28' },
  ];

  for (const r of rows)
    it(`${r.name} (${r.at.join(', ')}) reads ${r.want} over groups ${r.g.join(', ') || 'none'}`, () => {
      const v = levelAt(of(...r.g), r.amb, r.at[0], r.at[1], r.at[2]);
      console.info(`W4 level ${r.name}: ${v.toFixed(3)}`);
      expect(r.ok(v), `${r.name} ${v}`).toBe(true);
    });

  it('the gantry reads the moon even with every W4 lamp counted (the floods hang under the deck and light downward)', () => {
    const v = levelAt(lamps, 0.244, 58, 10, 17);
    console.info(`W4 level gantry, all lamps: ${v.toFixed(3)}`);
    expect(v).toBeLessThanOrEqual(0.28);
  });

  it('O20: lamp 97 at (88, 14, 5) on the raised jib (top 13.9, x 86-90, z 4.7-5.3); the line from the W3 roof eye (90, 10.0, 66) hits no collide piece', () => {
    const l = of(97)[0]!;
    expect([l.x, l.y, l.z]).toEqual([88, 14, 5]);
    const jib = solid.find((p) => Math.abs(top(p) - 13.9) < 1e-6 && Math.abs(bottom(p) - 13.6) < 1e-6 && Math.abs(p.c[0] - 88) < 1e-6 && Math.abs(p.s[0] - 4) < 1e-6 && Math.abs(p.c[2] - 5) < 1e-6 && Math.abs(p.s[2] - 0.6) < 1e-6);
    expect(jib, 'the jib box').toBeDefined();
    expect(jib!.noLedge).toBe(true);
    const eye = [90, 10.0, 66] as const;
    expect(segmentBlock(solid, eye, [l.x, l.y, l.z], 0.4)).toBeNull();
    // the clearance over W3's coal-yard drop guard (z 52, top 10.6), for the report
    const t = (66 - 52) / (66 - 5);
    const yAtGuard = eye[1] + (l.y - eye[1]) * t;
    const guard = Math.max(...solid.filter((p) => Math.abs(p.c[2] - 52) < 0.2 && p.s[2] < 0.2 && top(p) > 10 && Math.abs(90 - p.c[0]) < p.s[0] / 2).map(top));
    console.info(`W4 crane line clearance over the W3 drop guard: ${(yAtGuard - guard).toFixed(3)} (guard top ${guard})`);
    expect(yAtGuard - guard).toBeGreaterThanOrEqual(0.25);
  });
});

describe('W4: the jetty way back (A6, EGRESS E4)', () => {
  /** The whole open edge (the pull grip extended over x 72.2-75.9). */
  const edge = { y: 0, a: { x: 72.2, z: 6 }, b: { x: 75.9, z: 6 }, n: { x: 0, z: -1 } };

  it('the drop: the open edge x 72.2-75.9 is clear to 1.1 m; off it a body lands on the bed at -4.4; the debug point marks it', () => {
    const inEdge = b.boxes.filter((p) => p.collide && inRect(p, 72.2, 75.9, 5.9, 6.2, 0) && top(p) > 0.05 && bottom(p) < 1.1);
    expect(inEdge.map((p) => `(${p.c.join(', ')})`)).toEqual([]);
    const land = downHit(solid, 74, 0.5, 5.8, -10);
    console.info(`W4 jetty drop: from (74, 0, 6.0) onto the bed at ${land}`);
    expect(land).toBeCloseTo(-4.4, 6);
    const d = W4.debugPoints.find((q) => q.id === 'w4-jetty-drop')!;
    expect([d.pos.x, d.pos.y, d.pos.z]).toEqual([74, 0, 6.3]);
    expect(d.yaw).toBeCloseTo(Math.PI, 9);
  });

  it('the bed is continuous from the drop round the fence foot\'s end (x 72, z 5) to the canal-ledge room', () => {
    const pts: [number, number][] = [[74, 5.6], [74, 4.5], [71.5, 4.5], [68, 4.5]];
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, az] = pts[k]!;
      const [ex, ez] = pts[k + 1]!;
      const n = Math.ceil(hyp2(ex - ax, ez - az) / 0.1);
      for (let i = 0; i <= n; i++) {
        const x = ax + ((ex - ax) * i) / n;
        const z = az + ((ez - az) * i) / n;
        expect(downHit(solid, x, -4.0, z, -6), `bed at (${x.toFixed(2)}, ${z.toFixed(2)})`).toBeCloseTo(-4.4, 6);
        expect(blockedAt(solid, x, z, MOVEMENT.radius, -4.4), `body at (${x.toFixed(2)}, ${z.toFixed(2)})`).toEqual([]);
      }
    }
  });

  it('the bed does not reach the jetty with the gate and the yard door shut (the guards\' nav stops at y -2: the bed is off it)', () => {
    const { nav, restore } = soloNav(b, 4, W4.navSeeds, SHUT);
    try {
      expect(nav.findPath([68, 4.5], [88, 8], 1e6, -4.4, 0)).toBeNull();
      // the runtime nav casts down to y -2 only (`navBuild.ts` buildNavGrid, the helper's twin): no cell on the canal bed, so
      // the walk from the bed cannot bite until the bed is on the nav; this pins that, and the drop is not a nav link
      let bed = 0;
      for (let i = 0; i < nav.walk.length; i++) if (nav.height[i]! < -2) bed++;
      expect(bed).toBe(0);
    } finally {
      restore();
    }
  });

  it('no solo jump onto the whole open edge; the C10 pull band stays 4.4', () => {
    expect(soloJumpThreats(solid, edge)).toEqual([]);
    expect(W4_PULL.holder.y - W4_PULL.partner.y).toBeCloseTo(4.4, 9);
  });

  it('the lip audit at the rail gap: no ledge of any height with an end within 0.5 m of the jetty\'s south edge (x 72-76.5) or the rail\'s west end', () => {
    const near = anchorsOf(b).ledges.filter((l) => [l.a, l.b].some((q) => distRect(q.x, q.z, [72, 6, 76.5, 6]) <= 0.5 || distRect(q.x, q.z, [76, 6.0, 76, 6.1]) <= 0.5));
    expect(near.map((l) => `(${l.a.x}, ${l.a.z}) -> (${l.b.x}, ${l.b.z}) top ${l.top}`)).toEqual([]);
  });
});

describe('W4: cover, hide spots and the medkit', () => {
  /** The cover boxes: [x0, z0, x1, z1, y0, y1]. */
  const COVER: readonly (readonly [number, number, number, number, number, number])[] = [
    [82.4, 13.0, 84.0, 17.6, 0, 2.4],
    [82.4, 20.4, 84.0, 25.0, 0, 2.4],
    [81.6, 14.6, 82.4, 15.4, 0, 0.8],
    [72.15, 15.0, 73.0, 16.0, 0, 0.9],
    [52.0, 22.0, 55.0, 23.4, 0, 1.6],
    [59.0, 22.0, 62.0, 23.4, 0, 1.6],
    [63.0, 14.6, 64.0, 15.4, 0, 0.9],
  ];

  it('each cover box exists, collide and noLedge; none in the lane-side or canal keep-clear', () => {
    for (const [x0, z0, x1, z1, y0, y1] of COVER) {
      const p = b.boxes.find((q) => q.collide && Math.abs(q.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(q.c[1] - (y0 + y1) / 2) < 1e-6 && Math.abs(q.c[2] - (z0 + z1) / 2) < 1e-6 && Math.abs(q.s[0] - (x1 - x0)) < 1e-6 && Math.abs(q.s[1] - (y1 - y0)) < 1e-6 && Math.abs(q.s[2] - (z1 - z0)) < 1e-6);
      expect(p, `cover (${x0}, ${z0})`).toBeDefined();
      expect(p!.noLedge, `cover (${x0}, ${z0}) noLedge`).toBe(true);
      expect(x1 > 74.3 && x0 < 84.3 && z1 > 28.3 && z0 < 33, `cover (${x0}, ${z0}) off the lane keep-clear`).toBe(false);
      expect(x1 > 68.8 && x0 < 78.2 && z0 < 6, `cover (${x0}, ${z0}) off the canal keep-clear`).toBe(false);
    }
  });

  it('the foreman\'s alley (x 85, z 12.6-25.4) and the fire-door gap to the stack gap are walkable on the guards\' nav', () => {
    const { nav, restore } = soloNav(b, 4, W4.navSeeds, []);
    try {
      expect(nav.lineClear([85, 12.6], [85, 25.4], 0, 0), 'the alley, straight').toBe(true);
      expect(nav.findPath([85, 12.6], [85, 25.4], 1e6, 0, 0)).not.toBeNull();
      expect(nav.findPath([86.6, 19], [80, 17], 1e6, 0, 0)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('six hide spots; every takedown spot has one within 8 m (plan) on its floor', () => {
    expect(W4.hideSpots).toHaveLength(6);
    for (const [i, g] of W4G.entries()) {
      const [tx, tz] = g.takedownSpot;
      const floor = g.y ?? 0;
      const d = Math.min(...W4.hideSpots.filter((h) => Math.abs(h.pos.y - floor) < 1).map((h) => hyp2(h.pos.x - tx, h.pos.z - tz)));
      console.info(`W4 guard ${i} takedown spot (${tx}, ${tz}): nearest hide spot ${d.toFixed(2)} m`);
      expect(d, `guard ${i}`).toBeLessThanOrEqual(8);
    }
    // the four new ones stand beside a cover box (within 1.0 m of its footprint)
    for (const h of W4.hideSpots.slice(2)) expect(Math.min(...COVER.map((c) => distRect(h.pos.x, h.pos.z, [c[0], c[1], c[2], c[3]]))), `hide spot (${h.pos.x}, ${h.pos.z})`).toBeLessThanOrEqual(1.0);
  });

  it('medkit: one, on the back lane, within 8 m of the checkpoint, at least 10 m (plan) from every W4 guard post and route point', () => {
    expect(W4.medkits).toHaveLength(1);
    const m = W4.medkits![0]!;
    const lane = W4.rooms.find((r) => r.id === 'w4-back-lane')!;
    expect(m.pos.x >= lane.minX && m.pos.x <= lane.maxX && m.pos.z >= lane.minZ && m.pos.z <= lane.maxZ).toBe(true);
    expect(m.pos.y).toBe(0);
    const cp = W4.debugPoints.find((d) => d.id === 'w4-lane')!.pos;
    expect(Math.hypot(m.pos.x - cp.x, m.pos.y - cp.y, m.pos.z - cp.z)).toBeLessThanOrEqual(8);
    const near = guardPoints().filter((p) => hyp2(p.x - m.pos.x, p.z - m.pos.z) < 10);
    expect(near.map((p) => p.who)).toEqual([]);
    expect(Math.abs(m.yaw)).toBeCloseTo(Math.PI, 6);
  });
});

describe('W4: the gantry look-out and the vantages (G157 6)', () => {
  const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inW4(l.x, l.z));
  const ids = ['yard-a', 'yard-b', 'shed-a', 'shed-b'] as const;
  const point = (id: string) => W4.debugPoints.find((d) => d.id === `w4-vantage-${id}`)!.pos;
  const amb = (id: string): number => (id.startsWith('yard') ? 0.244 : 0.14);
  /**
   * Eye (floor + 1.6) -> target (a standing chest over the encounter's floor), on the hand-truck line x 78. The gantry's
   * north-east leg (x 83.3-83.7, z 18.6-19.0) stands in the stack gap behind the fire door: the drawn targets (78, 20) and (78, 18)
   * cross it (shed-a at z 18.97, shed-b grazing z 19.00), so shed-a looks north of it to z 21 and shed-b south of it to z 16.2.
   */
  const SIGHT: Record<string, readonly [number, number, number]> = {
    'yard-a': [48.6, 1.0, 26],
    'yard-b': [58, 1.0, 26],
    'shed-a': [78, 1.0, 21],
    'shed-b': [78, 1.0, 16.2],
  };

  it('the look-out: one clear glass pane (collide) on z 19 over x 50.0-54.0, y 10-12.2; no ledge on it', () => {
    const panes = b.boxes.filter((p) => p.glass && inW4(p.c[0], p.c[2]));
    expect(panes).toHaveLength(1);
    const g = panes[0]!;
    expect(g.glass).toBe('clear');
    expect(g.collide).toBe(true);
    expect(g.noLedge).toBe(true);
    expect([g.c[0], g.c[2]]).toEqual([52, 19]);
    expect(g.s[2]).toBeCloseTo(4.0, 9);
    expect(bottom(g)).toBeCloseTo(10, 9);
    expect(top(g)).toBeCloseTo(12.2, 9);
    expect(anchorsOf(b).ledges.filter((l) => [l.a, l.b].some((q) => q.x > 49.5 && q.x < 54.5 && Math.abs(q.z - 19) < 0.5 && l.top > 9))).toEqual([]);
  });

  it('four points, two per encounter, each on a floor, each pair at least 1.0 m apart', () => {
    for (const id of ids) {
      const p = point(id);
      expect(Math.abs(downHit(solid, p.x, p.y + 0.5, p.z, p.y - 0.5) - p.y), `${id} floor`).toBeLessThan(0.01);
    }
    for (const [a, c] of [['yard-a', 'yard-b'], ['shed-a', 'shed-b']] as const) expect(hyp2(point(a).x - point(c).x, point(a).z - point(c).z), `${a} / ${c}`).toBeGreaterThanOrEqual(1.0);
  });

  it('levelAt (all W4 lamps) at most 0.45; no W4 guard post or route point within 6 m (plan) on the same floor band (|dy| < 2)', () => {
    for (const id of ids) {
      const p = point(id);
      const v = levelAt(lamps, amb(id), p.x, p.y, p.z);
      console.info(`W4 vantage ${id} level: ${v.toFixed(3)}`);
      expect(v, id).toBeLessThanOrEqual(0.45);
      const near = guardPoints().filter((g) => Math.abs(g.y - p.y) < 2 && hyp2(g.x - p.x, g.z - p.z) < 6);
      expect(near.map((g) => g.who), id).toEqual([]);
    }
  });

  it('sightlines: from the eye (floor + 1.6) to the encounter, sampled every 0.05 m and stopped 0.3 m short, no collide piece (sight passes the clear glass); the control: a screen in the bay blocks yard-a', () => {
    for (const id of ids) {
      const p = point(id);
      expect(segmentBlock(solid, [p.x, p.y + 1.6, p.z], SIGHT[id]!, 0.3), id).toBeNull();
    }
    const a = point('yard-a');
    const bay: BoxPiece = { c: [52, 11.1, 19], s: [4, 2.2, 0.1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(segmentBlock([...solid, bay], [a.x, a.y + 1.6, a.z], SIGHT['yard-a']!, 0.3)).not.toBeNull();
    // and the lines to the drawn targets are the leg's (why the targets moved)
    const sa = point('shed-a');
    const sb = point('shed-b');
    expect(segmentBlock(solid, [sa.x, sa.y + 1.6, sa.z], [78, 1.0, 20], 0.3)).toMatch(/in box \(83\.50, /);
    expect(segmentBlock(solid, [sb.x, sb.y + 1.6, sb.z], [78, 1.0, 18], 0.3)).toMatch(/in box \(83\.50, /);
  });
});

describe('W4: the data exports', () => {
  it('nav seeds as built (seven), the six hide spots, the debug points (five, the jetty drop, four vantages), the culvert duct', () => {
    expect(W4.navSeeds.map((v) => [v.x, v.y, v.z])).toEqual([[90, 0, 32], [58, 0, 18], [79, 0, 18], [93, 0, 18], [86, 0, 8], [66, 10, 17], [90, -1, 3]]);
    expect(W4.hideSpots.map((h) => [h.pos.x, h.pos.y, h.pos.z])).toEqual([[76, 0, 26], [46, 0, 26], [53.5, 0, 23.8], [63.5, 0, 15.8], [73.4, 0, 15.5], [81.2, 0, 15.0]]);
    expect(W4.debugPoints.map((d) => d.id)).toEqual(['w4-lane', 'w4-clerestory', 'w4-shutter', 'w4-canal-bed', 'w4-boat', 'w4-jetty-drop', 'w4-vantage-yard-a', 'w4-vantage-yard-b', 'w4-vantage-shed-a', 'w4-vantage-shed-b']);
    // the culvert: a crouch duct (1.2 x 1.5) through the z 28-30 mass at x 70.5
    const lid = solid.find((p) => Math.abs(p.c[0] - 70.5) < 0.01 && Math.abs(bottom(p) - 1.5) < 1e-6 && p.overhead);
    expect(lid).toBeDefined();
  });
});
