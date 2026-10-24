/**
 * Tallow Wharf GB4: the W4 wharf sheds. The eight rooms are the graph's; the clerestory boost (C9) and the jetty pull (C10) sit
 * in the code's bands with no solo jump onto either; the only lip in the co-op band is the planned one; the jetty cannot be
 * reached on foot with the gate and the yard door shut; the canal bed is walkable but has no wall-jump lip; the gantry and
 * its arm are caged; the circuits are the brief's.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BoxPiece } from '../../src/world/levelBuilder';
import { TEAM, WALL_JUMP } from '../../src/config/movement';
import { PULL } from '../../src/game/kit/pullUp';
import { SECTION_BOX, STANDIN_TAGS } from '../../src/world/maps/tallowWharfKit';
import { anchorsOf, builtWharf, COOP_BAND, GREY_KEEP_CLEAR, legUpTarget, onPlannedLip, pullCheck, roomForBoost, soloJumpThreats, soloNav, solidOf, space, spacesIn } from './helpers';
import { W4, W4_DROP_GUARDS, W4_GUARD_GAPS, W4_LIP, W4_PULL, W4_SHUTTER } from '../../src/world/maps/tallowWharfW4';

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
  });

  it('the sash is open (a 1.2 wide gap at 4.4-5.6) and the tea-chest stack under it is 2.0 and noLedge', () => {
    const wallPieces = solid.filter((p) => inRect(p, 78.45, 79.55, 27.75, 28.25) && bottom(p) > 4.39 && top(p) < 5.61);
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
    const guards = b.boxes.filter((p) => p.collide && p.noLedge && Math.abs(bottom(p) - 10) < 1e-6 && Math.abs(p.s[1] - 2.2) < 1e-6);
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

describe('W4: the lights', () => {
  const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && l.x >= W4_BOX[0] && l.x <= W4_BOX[2] && l.z >= W4_BOX[1] && l.z <= W4_BOX[3]);
  const group = (g: number) => lamps.filter((l) => l.group === g);

  it('every lamp in the W4 box is in groups 91-97, with the brief\'s counts', () => {
    for (const l of lamps) expect(l.group, `lamp at (${l.x}, ${l.y}, ${l.z})`).toBeGreaterThanOrEqual(91);
    for (const l of lamps) expect(l.group).toBeLessThanOrEqual(97);
    expect([91, 92, 93, 94, 95, 96, 97].map((g) => group(g).length)).toEqual([4, 1, 1, 2, 1, 1, 1]);
  });

  it('every switch has a lamp group of its own; groups 94-97 have no switch; the emergency and aviation lamps are not shootable', () => {
    for (const s of W4.switches) expect(group(s.group).length, `switch group ${s.group}`).toBeGreaterThan(0);
    expect(W4.switches.map((s) => s.group).sort()).toEqual([91, 92, 93]);
    for (const g of [94, 95, 96, 97]) expect(W4.switches.filter((s) => s.group === g)).toEqual([]);
    for (const l of group(96)) expect(l.destructible).toBe(false);
    for (const l of group(97)) {
      expect(l.destructible).toBe(false);
      expect(l.electric).toBe(false);
    }
    for (const l of [...group(91), ...group(92), ...group(93), ...group(94), ...group(95)]) expect(l.destructible && l.electric).toBe(true);
  });

  it('the data exports are the brief\'s: seven nav seeds, two hide spots, five debug points, the culvert duct', () => {
    expect(W4.navSeeds.map((v) => [v.x, v.y, v.z])).toEqual([[90, 0, 32], [58, 0, 18], [79, 0, 18], [93, 0, 18], [86, 0, 8], [66, 10, 17], [90, -1, 3]]);
    expect(W4.hideSpots.map((h) => [h.pos.x, h.pos.z])).toEqual([[76, 26], [46, 26]]);
    expect(W4.debugPoints).toHaveLength(5);
    // the culvert: a crouch duct (1.2 x 1.5) through the z 28-30 mass at x 70.5
    const lid = solid.find((p) => Math.abs(p.c[0] - 70.5) < 0.01 && Math.abs(bottom(p) - 1.5) < 1e-6 && p.overhead);
    expect(lid).toBeDefined();
  });
});
