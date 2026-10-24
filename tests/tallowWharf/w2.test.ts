/**
 * Tallow Wharf GB2: W2, the arcade lofts. Sizes against the graph, the C3 boost / pull / rope, the three 2.5 m throws, no solo jump
 * onto C3's lips, only the planned lip, the solo-nav bypass checks (bolted doors shut), the closed reverse lightwell jump, the lights.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BoxPiece } from '../../src/world/levelBuilder';
import { TEAM, WALL_JUMP } from '../../src/config/movement';
import { W2 } from '../../src/world/maps/tallowWharfW2';
import { SECTION_BOX } from '../../src/world/maps/tallowWharfKit';
import { anchorsOf, builtWharf, COOP_BAND, downHit, GREY_KEEP_CLEAR, legUpTarget, onPlannedLip, pullCheck, roomForBoost, ropeCheck, soloJumpThreats, soloNav, solidOf, space, spacesIn, throwCheck } from './helpers';

const { b } = builtWharf();
const solid = solidOf(b);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const inW2 = (x: number, z: number): boolean => x >= SECTION_BOX.W2[0] && x <= SECTION_BOX.W2[2] && z >= SECTION_BOX.W2[1] && z <= SECTION_BOX.W2[3];

describe('W2: sizes against the graph', () => {
  it('has the nine graph spaces, each room matching its area and storey', () => {
    expect(W2.rooms).toHaveLength(9);
    const spaces = spacesIn('W2');
    expect(spaces).toHaveLength(9);
    for (const s of spaces) {
      const r = W2.rooms.find((q) => q.id === s.id);
      expect(r, s.id).toBeDefined();
      const [x0, z0, x1, z1] = s.area[0]!;
      expect(r!.minX, s.id).toBeCloseTo(x0, 2);
      expect(r!.maxX, s.id).toBeCloseTo(x1, 2);
      expect(r!.minZ, s.id).toBeCloseTo(z0, 2);
      expect(r!.maxZ, s.id).toBeCloseTo(z1, 2);
      expect(r!.minY, s.id).toBe(s.storey);
    }
    // a ground space is banded under the lofts; every deviation has a reason
    for (const id of ['w2-arcade', 'w2-pie-shop']) expect(W2.rooms.find((q) => q.id === id)!.maxY).toBe(4.4);
    expect(W2.deviations.length).toBeGreaterThan(0);
    for (const d of W2.deviations) expect(d.why.length, d.space).toBeGreaterThan(10);
    // every room lies inside the section box
    for (const r of W2.rooms) expect(inW2(r.minX, r.minZ) && inW2(r.maxX, r.maxZ), r.id).toBe(true);
  });

  it('every nav seed stands on a floor at its height, and the entry and exit do too', () => {
    const pts = [...W2.navSeeds.map((v) => ({ x: v.x, y: v.y, z: v.z })), { x: W2.entry[0], y: W2.entry[1], z: W2.entry[2] }, { x: W2.exit[0], y: W2.exit[1], z: W2.exit[2] }];
    for (const p of pts) {
      const f = downHit(solid, p.x, p.y + 1, p.z, p.y - 0.3);
      expect(Number.isFinite(f) && Math.abs(f - p.y) < 0.05, `(${p.x}, ${p.y}, ${p.z}) floor ${f}`).toBe(true);
    }
  });
});

describe('W2: C3, the walkway (boost, pull, rope)', () => {
  it('boost: the pier lip is in the band, the leg-up finds it, and the booster has room', () => {
    expect(W2.lips).toHaveLength(1);
    const lip = W2.lips[0]!;
    expect(lip.id).toBe('w2-lip-pier');
    expect(lip.y - lip.floor).toBeGreaterThanOrEqual(COOP_BAND.min - 1e-6);
    expect(lip.y - lip.floor).toBeLessThanOrEqual(COOP_BAND.max + 1e-6);
    const u = W2.legUps.find((l) => l.lip === lip.id)!;
    const t = legUpTarget(anchorsOf(b), u, u.facing);
    expect(t).not.toBeNull();
    const l = t!.anchor as { kind: string; canClimbUp: boolean; top: number; nx: number; nz: number };
    expect(l.kind).toBe('ledge');
    expect(l.canClimbUp).toBe(true);
    expect(Math.abs(l.top - lip.y)).toBeLessThan(1e-6);
    expect(l.nx * lip.n.x + l.nz * lip.n.z).toBeGreaterThan(0.99);
    expect(roomForBoost(solid, u, u.facing)).toBe(true);
    // the spot is on the lip's approach side, 0.5 m off the pier's face
    expect(Math.abs(u.z - (lip.a.z + lip.n.z * 0.5))).toBeLessThan(1e-9);
  });

  it('pull: pullCheck is ok for the east lip (band 4.5, an open edge, the catch point in reach)', () => {
    expect(W2.pulls).toHaveLength(1);
    const p = W2.pulls[0]!;
    expect(p.id).toBe('w2-pull-east');
    const r = pullCheck(solid, p);
    expect(r.band).toBe('ok');
    expect(r.hang).not.toBeNull();
    expect(r.partnerReach).toBe(true);
    expect(r.holderOk).toBe(true);
    expect(r.ok).toBe(true);
    // the balustrade gap x 72.5-74.5 is the open edge; the balustrade closes the rest
    expect(r.hang!.x).toBeGreaterThan(72.5);
    expect(r.hang!.x).toBeLessThan(74.5);
  });

  it('rope: ropeCheck is ok for the west pier (4.5 within 2.2-6.0)', () => {
    expect(W2.ropes).toHaveLength(1);
    const r = ropeCheck(solid, W2.ropes[0]!);
    expect(W2.ropes[0]!.id).toBe('w2-rope-pier');
    expect(r.room).toBe('ok');
    expect(r.reach).toBe(true);
    expect(r.hang).not.toBeNull();
    expect(r.ok).toBe(true);
  });
});

describe('W2: the throws (C4 lightwell x2, C5 lane)', () => {
  /** W3's corner-bay roof stage (GB3) when the merged map has no floor at the lane landing yet: a stand-in box, top 8.4. */
  const withStage = (t: (typeof W2.throws)[number]): readonly BoxPiece[] => {
    const probe = throwCheck(solid, t);
    if (Number.isFinite(probe.floorY)) return solid;
    const [x0, z0, x1, z1] = t.stage;
    return [...solid, { c: [(x0 + x1) / 2, t.thrower.y - 0.1, (z0 + z1) / 2], s: [x1 - x0, 0.2, z1 - z0], yaw: 0, pitch: 0, color: '#000', collide: true, visible: true, noLedge: true }];
  };

  it('has the three throws, each a 2.5 m level gap (landing 3.2 m past the thrower)', () => {
    expect(W2.throws.map((t) => t.id)).toEqual(['w2-throw-pawn', 'w2-throw-pie', 'w2-throw-lane']);
  });

  for (const id of ['w2-throw-pawn', 'w2-throw-pie', 'w2-throw-lane']) {
    it(`${id}: throwLandingOk, floor within throwDrop, head room, clear arc, clear air over the thrower, landing inside the stage`, () => {
      const t = W2.throws.find((q) => q.id === id)!;
      const r = throwCheck(withStage(t), t);
      expect(r.ok).toBe(true);
      expect(Math.abs(r.floorY - t.thrower.y)).toBeLessThanOrEqual(TEAM.throwDrop);
      expect(r.head).toBeGreaterThanOrEqual(1.2);
      expect(r.arcClear).toBe(true);
      expect(r.upClear).toBe(true);
      expect(r.room).toBe('ok');
      // 0.3 m (the body radius) of the stage on every side of the landing along the throw
      const [x0, z0, x1, z1] = t.stage;
      expect(r.land.x - 0.3).toBeGreaterThanOrEqual(x0 - 1e-6);
      expect(r.land.x + 0.3).toBeLessThanOrEqual(x1 + 1e-6);
      expect(r.land.z - 0.3).toBeGreaterThanOrEqual(z0 - 1e-6);
      expect(r.land.z + 0.3).toBeLessThanOrEqual(z1 + 1e-6);
    });
  }

  it('the gap from the thrower side to the stage edge is 2.5 m (lightwell: the door plane z 70 to the stage z 72.5; lane: the flat x 79.5 to x 82)', () => {
    for (const id of ['w2-throw-pawn', 'w2-throw-pie']) {
      const t = W2.throws.find((q) => q.id === id)!;
      expect(t.stage[1] - 70).toBeCloseTo(2.5, 9);
    }
    expect(W2.throws[2]!.stage[0] - 79.5).toBeCloseTo(2.5, 9);
    // the stages are iron slabs at the loft height, 0.2 thick, with open air under them (nothing solid at y 1-4 beneath)
    for (const s of [W2.throws[0]!.stage, W2.throws[1]!.stage]) {
      const cx = (s[0] + s[2]) / 2;
      const cz = (s[1] + s[3]) / 2 - 0.3;
      expect(solid.some((p) => bottom(p) < 4 && top(p) > 1 && Math.abs(p.c[0] - cx) < p.s[0] / 2 && Math.abs(p.c[2] - cz) < p.s[2] / 2)).toBe(false);
    }
  });
});

describe('W2: no solo jump onto C3, only the planned lip', () => {
  it('soloJumpThreats is [] for the pier lip and for the east pull edge', () => {
    const lip = W2.lips[0]!;
    expect(soloJumpThreats(solid, lip)).toEqual([]);
    const pull = W2.pulls[0]!;
    const edge = { y: pull.holder.y, a: { x: 72.5, z: 59 }, b: { x: 74.5, z: 59 }, n: { x: 0, z: -1 } };
    expect(soloJumpThreats(solid, edge)).toEqual([]);
  });

  it('keep-clear: nothing a player alone can stand on over 0.3 m within GREY_KEEP_CLEAR of the two edges in the arcade', () => {
    expect(GREY_KEEP_CLEAR).toBeCloseTo(4.7, 9);
    const zones: [number, number, number, number][] = [[40.5, 54.3, 51.5, 59], [67.8, 54.3, 79, 59]];
    const bad: string[] = [];
    for (const p of solid) {
      // a standable top: over 0.3, wide enough to stand on, and not a noLedge piece over the mantle
      if (top(p) <= 0.3 || Math.min(p.s[0], p.s[2]) < 0.38 || (p.noLedge && top(p) > 1.8)) continue;
      if (bottom(p) > 4.0) continue;
      for (const z of zones) {
        if (p.c[0] + p.s[0] / 2 > z[0] && p.c[0] - p.s[0] / 2 < z[2] && p.c[2] + p.s[2] / 2 > z[1] && p.c[2] - p.s[2] / 2 < z[3]) bad.push(`box (${p.c.join(', ')}) size (${p.s.join(', ')})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('the only hangable lip at band height in the W2 box is the pier lip (the pull edge, the stages, the walkway slab and the taking-in walls give none)', () => {
    const anchors = anchorsOf(b);
    const bad: string[] = [];
    let found = 0;
    for (const l of anchors.ledges) {
      if (!inW2((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2)) continue;
      if (!l.canHang || l.top < WALL_JUMP.maxUp || l.top > TEAM.boostMax + 0.05 || l.drop < 1.9) continue;
      found++;
      if (!onPlannedLip(l, W2.lips)) bad.push(`(${l.a.x.toFixed(2)}, ${l.a.z.toFixed(2)}) -> (${l.b.x.toFixed(2)}, ${l.b.z.toFixed(2)}) top ${l.top} drop ${l.drop}`);
    }
    expect(bad).toEqual([]);
    expect(found).toBeGreaterThanOrEqual(1);
  });
});

describe('W2: no solo bypass, the reverse lightwell jump closed', () => {
  const shut = [
    { at: [52.2, 69] as [number, number], y: 4.5, w: 1.2, alongX: false }, // pawn stair top
    { at: [57.8, 69] as [number, number], y: 4.5, w: 1.2, alongX: false }, // pie stair top
    { at: [50.5, 70] as [number, number], y: 4.5, w: 2.0, alongX: true }, // pawn taking-in
    { at: [63, 70] as [number, number], y: 4.5, w: 2.0, alongX: true }, // pie taking-in
    { at: [60, 76.75] as [number, number], y: 4.5, w: 1.2, alongX: false }, // clock door
  ];

  it('the named doors exist where the data says, with the right width and height', () => {
    const find = (x: number, y: number, z: number) =>
      b.anchors.doors.find((d) => {
        const alongX = Math.abs(d.yaw - Math.PI / 2) < 1e-6;
        const cx = alongX ? d.hinge.x + d.width / 2 : d.hinge.x;
        const cz = alongX ? d.hinge.z : d.hinge.z + d.width / 2;
        return Math.abs(cx - x) < 1e-6 && Math.abs(cz - z) < 1e-6 && Math.abs(d.hinge.y - y) < 1e-6;
      });
    for (const [id, p] of Object.entries(W2.doors)) {
      const d = find(p[0], p[1], p[2]);
      expect(d, id).toBeDefined();
      expect(d!.locked, id).toBe(false);
    }
    for (const id of ['w2-pawn-taking-in', 'w2-pie-taking-in']) {
      const p = W2.doors[id]!;
      const d = find(p[0], p[1], p[2])!;
      expect(d.width).toBeCloseTo(2.0, 9);
      expect(d.height).toBeCloseTo(3.6, 9);
    }
    // the unnamed doors: the lane door, the walkway doors, the party wall, the stage doors, the foot doors, the pie shop's lightwell door
    for (const p of [[76, 0, 55], [49, 4.5, 62], [61, 4.5, 62], [72, 4.5, 62], [61, 0, 62], [53, 0, 62], [55, 0, 62], [61, 0, 70], [67, 4.5, 66], [50.5, 4.5, 73.5], [55, 4.5, 73.5], [63, 4.5, 73.5], [57.8, 0, 63]] as const) {
      expect(find(p[0], p[1], p[2]), p.join(',')).toBeDefined();
    }
  });

  it('with the bolted doors shut: the arcade does not reach the roof, the reading room does not reach the pawn loft; the walkway reaches the lane-window loft', () => {
    const { nav, restore } = soloNav(b, 4, W2.navSeeds, shut);
    try {
      expect(nav.findPath([42, 55], [60, 66], 1e6, 0, 8.4)).toBeNull();
      expect(nav.findPath([52, 77], [46, 66], 1e6, 4.5, 4.5)).toBeNull();
      // the open stair does take a solo player from the arcade to the reading room (SPEC: the reading room is the open side)
      expect(nav.findPath([58, 55], [52, 77], 1e6, 0, 4.5)).not.toBeNull();
      // and no solo way from the arcade ground to the walkway or the lofts across
      expect(nav.findPath([42, 55], [60, 60.5], 1e6, 0, 4.5)).toBeNull();
      expect(nav.findPath([42, 55], [46, 66], 1e6, 0, 4.5)).toBeNull();
      expect(nav.findPath([42, 55], [60, 66], 1e6, 0, 4.5)).toBeNull();
      // control: the walkway -> lane-window loft leg is open (the ladder leg to the roof is not in the nav grid)
      expect(nav.findPath([60, 60.5], [72, 66], 1e6, 4.5, 4.5)).not.toBeNull();
    } finally {
      restore();
    }
    // control for the bolts: with a stair top left open, its loft is reached from the arcade
    const pawn = soloNav(b, 4, W2.navSeeds, shut.filter((s) => s.at[0] !== 52.2));
    try {
      expect(pawn.nav.findPath([58, 55], [46, 66], 1e6, 0, 4.5)).not.toBeNull();
    } finally {
      pawn.restore();
    }
    const pie = soloNav(b, 4, W2.navSeeds, shut.filter((s) => s.at[0] !== 57.8));
    try {
      expect(pie.nav.findPath([58, 55], [60, 66], 1e6, 0, 4.5)).not.toBeNull();
    } finally {
      pie.restore();
    }
  });

  it('the hatch opening and the loft ladder exist; the roof is closed over the rest of the lane-window loft', () => {
    const hole = (x: number, z: number): boolean => solid.some((p) => bottom(p) > 8.0 && top(p) < 8.45 && Math.abs(p.c[0] - x) < p.s[0] / 2 && Math.abs(p.c[2] - z) < p.s[2] / 2);
    expect(hole(72, 66)).toBe(false);
    expect(hole(70, 66)).toBe(true);
    expect(hole(74, 66)).toBe(true);
    const ladder = b.anchors.ladders.find((l) => Math.abs(l.base.x - 72) < 1e-6 && Math.abs(l.base.z - 65.3) < 1e-6);
    expect(ladder).toBeDefined();
    expect(ladder!.base.y).toBeCloseTo(4.5, 9);
    expect(ladder!.top.y).toBeCloseTo(8.4, 9);
  });

  it('the taking-in doors: no collide box outside the door plane gives a standable top (z 70-70.6, the door x range, y 4.3-4.7)', () => {
    for (const id of ['w2-pawn-taking-in', 'w2-pie-taking-in']) {
      const [cx, , cz] = W2.doors[id]!;
      const x0 = cx - 1;
      const x1 = cx + 1;
      const bad = solid.filter((p) => p.c[0] + p.s[0] / 2 > x0 && p.c[0] - p.s[0] / 2 < x1 && p.c[2] + p.s[2] / 2 > cz && p.c[2] - p.s[2] / 2 < cz + 0.6 && top(p) >= 4.3 && top(p) <= 4.7);
      // the wall opening itself: no wall piece below its head in the door range
      expect(bad.map((p) => `box (${p.c.join(', ')})`), id).toEqual([]);
    }
  });
});

describe('W2: lights', () => {
  const lamps = b.lights.lights.filter((l) => inW2(l.x, l.z));
  const switches = W2.switches;

  it('every lamp in the W2 box is in groups 70-76, each circuit has a lamp and a switch', () => {
    for (const l of lamps) expect(l.group, `lamp at (${l.x}, ${l.y}, ${l.z})`).toBeGreaterThanOrEqual(70);
    for (const l of lamps) expect(l.group).toBeLessThanOrEqual(76);
    for (let g = 70; g <= 76; g++) {
      expect(lamps.some((l) => l.group === g), `group ${g} lamp`).toBe(true);
      expect(switches.some((s) => s.group === g), `group ${g} switch`).toBe(true);
    }
    for (const s of switches) expect(lamps.some((l) => l.group === s.group), `switch group ${s.group}`).toBe(true);
    expect(lamps.filter((l) => l.group === 70)).toHaveLength(4);
  });

  it('the walkway, lane-window loft, clock loft, roof and stacks are dark (no lamp over them)', () => {
    const near = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): boolean => lamps.some((l) => l.x >= x0 && l.x <= x1 && l.z >= z0 && l.z <= z1 && l.y >= y0 && l.y <= y1);
    expect(near(44, 59, 76, 62, 4.5, 8.3)).toBe(false);
    expect(near(68, 62, 76, 70, 4.5, 8.3)).toBe(false);
    expect(near(60, 73.5, 70, 80, 4.5, 8.3)).toBe(false);
    expect(near(44, 62, 76, 70, 8.4, 12)).toBe(false);
    expect(near(56, 73.5, 60, 80, 4.5, 8.3)).toBe(false);
  });

  it('space ids resolve in the graph', () => {
    for (const r of W2.rooms) expect(space(r.id).section).toBe('W2');
  });
});

describe('W2: source', () => {
  it('reserves no shutter and calls no placeShutter', () => {
    expect(W2.shutters).toEqual([]);
    expect(W2.dropGuards).toEqual([]);
    expect(readFileSync(new URL('../../src/world/maps/tallowWharfW2.ts', import.meta.url), 'utf8')).not.toContain('placeShutter(');
  });
});
