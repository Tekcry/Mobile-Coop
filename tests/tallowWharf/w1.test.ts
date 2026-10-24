/**
 * Tallow Wharf W1, the night market (mission-framework GB1, `docs/missions/slices/GB-briefs.md` "GB1"): the sizes against the
 * graph, the two C1 boost lips, no solo jump onto them, only planned lips, no solo bypass of the bolted doors and the shutter
 * stand-in, the shutter reservation, and the lights.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEAM, WALL_JUMP } from '../../src/config/movement';
import { W1 } from '../../src/world/maps/tallowWharfW1';
import { STANDIN_TAGS } from '../../src/world/maps/tallowWharfKit';
import {
  anchorsOf,
  builtWharf,
  COOP_BAND,
  GRAPH,
  legUpTarget,
  onPlannedLip,
  roomForBoost,
  soloJumpThreats,
  soloNav,
  solidOf,
  spacesIn,
  type ShutDoor,
} from './helpers';

const { b, layout } = builtWharf();
const solid = solidOf(b);
const anchors = anchorsOf(b);
const box = [0, 6, 40, 62] as const;
const inBox = (x: number, z: number): boolean => x >= box[0] && x <= box[2] && z >= box[1] && z <= box[3];

describe('W1 sizes against the graph', () => {
  it('has one room per W1 graph space (7), with the graph area and storey', () => {
    expect(W1.rooms).toHaveLength(7);
    expect(spacesIn('W1')).toHaveLength(7);
    for (const s of spacesIn('W1')) {
      const r = W1.rooms.find((p) => p.id === s.id);
      expect(r, s.id).toBeDefined();
      const a = s.area[0]!;
      expect(r!.minX).toBeCloseTo(a[0], 2);
      expect(r!.minZ).toBeCloseTo(a[1], 2);
      expect(r!.maxX).toBeCloseTo(a[2], 2);
      expect(r!.maxZ).toBeCloseTo(a[3], 2);
      expect(r!.minY ?? 0, s.id).toBeCloseTo(s.storey, 6);
    }
    for (const r of W1.rooms.filter((p) => (p.minY ?? 0) < 4)) expect(r.maxY, r.id).toBe(4.4);
  });

  it('lists its deviations, and the map carries the rooms', () => {
    expect(W1.deviations.map((d) => d.space).sort()).toEqual(['w1-gallery', 'w1-warden-office']);
    for (const r of W1.rooms) expect(layout.rooms!.some((p) => p.id === r.id)).toBe(true);
    expect(GRAPH.meta.section_info.W1!.box).toEqual([0, 6, 40, 62]);
  });
});

describe('W1 boost lips (C1)', () => {
  it('has the two planned lips with their leg-up spots', () => {
    expect(W1.lips.map((l) => l.id)).toEqual(['w1-lip-steps', 'w1-lip-market']);
    expect(W1.legUps.map((l) => l.lip)).toEqual(['w1-lip-steps', 'w1-lip-market']);
  });

  for (const lip of W1.lips) {
    const spot = W1.legUps.find((l) => l.lip === lip.id)!;
    it(`${lip.id}: in COOP_BAND, the leg-up finds the lip, room at the spot, no solo jump onto it`, () => {
      expect(lip.y - lip.floor).toBeGreaterThanOrEqual(COOP_BAND.min - 1e-6);
      expect(lip.y - lip.floor).toBeLessThanOrEqual(COOP_BAND.max + 1e-6);
      const t = legUpTarget(anchors, spot, spot.facing);
      expect(t).not.toBeNull();
      const l = t!.anchor as { kind: string; canClimbUp: boolean; top: number; nx: number; nz: number };
      expect(l.kind).toBe('ledge');
      expect(l.canClimbUp).toBe(true);
      expect(Math.abs(l.top - lip.y)).toBeLessThan(1e-6);
      expect(l.nx * lip.n.x + l.nz * lip.n.z).toBeGreaterThan(0.99);
      // the spot is on the approach side of the lip's face
      expect((spot.x - lip.a.x) * lip.n.x + (spot.z - lip.a.z) * lip.n.z).toBeGreaterThan(0);
      expect(roomForBoost(solid, spot, spot.facing)).toBe(true);
      expect(soloJumpThreats(solid, lip)).toEqual([]);
    });
  }

  it('every lip the game generates in W1 over a body\'s reach is a planned one', () => {
    const bad = anchors.ledges
      .filter((l) => l.canHang && inBox((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2) && l.top >= WALL_JUMP.maxUp && l.top <= TEAM.boostMax + 0.05 && l.drop >= 1.9)
      .filter((l) => !onPlannedLip(l, W1.lips))
      .map((l) => `(${l.a.x.toFixed(2)}, ${l.a.z.toFixed(2)}) -> (${l.b.x.toFixed(2)}, ${l.b.z.toFixed(2)}) top ${l.top}`);
    expect(bad).toEqual([]);
  });
});

describe('W1 has no solo bypass', () => {
  const shut: ShutDoor[] = [
    { at: [W1.doors['w1-warden-stair']![0], W1.doors['w1-warden-stair']![2]], y: 0, w: 1.2, alongX: true },
    { at: [W1.doors['w1-hall-back']![0], W1.doors['w1-hall-back']![2]], y: 0, w: 1.2, alongX: true },
    { at: [W1.doors['w1-conn-near']![0], W1.doors['w1-conn-near']![2]], y: 0, w: 1.2, alongX: false },
  ];

  it('the way from the start to the passage end is shut with the bolted doors shut and the shutter a solid stand-in', () => {
    const { nav, restore } = soloNav(b, 4, W1.navSeeds, shut);
    try {
      expect(nav.findPath([7, 10], [38, 60], 1e6, 0, 0)).toBeNull();
      // the start reaches the market and the hall (the nav is not simply empty)
      expect(nav.findPath([7, 10], [20, 28], 1e6, 0, 0)).not.toBeNull();
      expect(nav.findPath([7, 10], [20, 51], 1e6, 0, 0)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('control: with the hall back door left open the hall reaches the passage, so it is the bolt that blocks', () => {
    const { nav, restore } = soloNav(b, 4, W1.navSeeds, [shut[0]!, shut[2]!]);
    try {
      expect(nav.findPath([20, 51], [34, 60], 1e6, 0, 0)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('names its bolted and unlocked doors, each with a door anchor', () => {
    expect(Object.keys(W1.doors).sort()).toEqual(['w1-conn-near', 'w1-hall-back', 'w1-hall-side', 'w1-warden-stair']);
    for (const c of Object.values(W1.doors)) {
      // a door's hinge is at one jamb: the centre is half its width along the wall (yaw PI / 2: along x; yaw 0: along z)
      const near = b.anchors.doors.some((d) => Math.abs(d.hinge.x + (d.yaw === 0 ? 0 : d.width / 2) - c[0]) < 0.01 && Math.abs(d.hinge.z + (d.yaw === 0 ? d.width / 2 : 0) - c[2]) < 0.01 && Math.abs(d.hinge.y - c[1]) < 0.01);
      expect(near, `door at ${c.join(', ')}`).toBe(true);
    }
    // the gallery door into the office
    expect(b.anchors.doors.some((d) => Math.abs(d.hinge.x - 3.4) < 0.01 && Math.abs(d.hinge.y - 4.5) < 0.01 && Math.abs(d.hinge.z - 46) < 0.01)).toBe(true);
  });
});

describe('W1 shutter reservation (C2)', () => {
  it('reserves one shutter spec and fills the opening with a closed stand-in', () => {
    expect(W1.shutters).toEqual([{ id: 'w1-shutter', x: 22, y: 0, z: 58, yaw: 0, width: 3, height: 3 }]);
    const tags = STANDIN_TAGS.get(b)!;
    const hit = [...tags.entries()].filter(([, t]) => t === 'shutter-standin:w1-shutter');
    expect(hit).toHaveLength(1);
    const p = b.boxes[hit[0]![0]]!;
    expect(p.collide).toBe(true);
    expect(p.noLedge).toBe(true);
    expect(p.s[0]).toBeCloseTo(3, 9);
    expect(p.s[1]).toBeCloseTo(3, 9);
    expect(p.c[0]).toBeCloseTo(22, 9);
    expect(p.c[1] - p.s[1] / 2).toBeCloseTo(0, 9);
    expect(p.c[2]).toBeCloseTo(58, 9);
  });

  it('never calls placeShutter', () => {
    const src = readFileSync(new URL('../../src/world/maps/tallowWharfW1.ts', import.meta.url), 'utf8');
    expect(src.includes('placeShutter(')).toBe(false);
  });

  it('keeps the crawl space clear: nothing but the wall and the stand-in below 3.0 m within z 57-59 at x 20.5-23.5', () => {
    const tags = STANDIN_TAGS.get(b)!;
    const stray = b.boxes.filter((p, i) => {
      // (the ground slab, top 0, is not in the way)
      if (!p.collide || tags.has(i) || p.c[1] + p.s[1] / 2 <= 0.05) return false;
      if (p.c[1] - p.s[1] / 2 >= 3 - 1e-6) return false;
      const x0 = p.c[0] - p.s[0] / 2;
      const x1 = p.c[0] + p.s[0] / 2;
      const z0 = p.c[2] - p.s[2] / 2;
      const z1 = p.c[2] + p.s[2] / 2;
      if (x1 <= 20.5 || x0 >= 23.5 || z1 <= 57 || z0 >= 59) return false;
      // the hall's north wall pieces (0.3 thick on z 58) are the wall
      return !(Math.abs(p.c[2] - 58) < 1e-6 && Math.abs(p.s[2] - 0.3) < 1e-6);
    });
    expect(stray.map((p) => `${p.c.join(',')} ${p.s.join(',')}`)).toEqual([]);
  });
});

describe('W1 lights', () => {
  const lamps = b.lights.lights.filter((l) => inBox(l.x, l.z));
  it('every switch has lamps, and the unswitchable groups have no switch', () => {
    for (const s of W1.switches) expect(lamps.some((l) => l.group === s.group), `group ${s.group}`).toBe(true);
    for (const g of [65, 66, 67]) {
      expect(W1.switches.some((s) => s.group === g)).toBe(false);
      expect(lamps.some((l) => l.group === g)).toBe(true);
    }
    expect(layout.switches!.filter((s) => s.section === 0)).toHaveLength(W1.switches.length);
  });

  it('keeps every W1 lamp in groups 60-67, and the clock face is not destructible', () => {
    expect(lamps).toHaveLength(4 + 4 + 3 + 1 + 1 + 1 + 1 + 1);
    for (const l of lamps) {
      expect(l.group).toBeGreaterThanOrEqual(60);
      expect(l.group).toBeLessThanOrEqual(67);
    }
    for (const l of lamps.filter((p) => p.group === 66)) {
      expect(l.destructible).toBe(false);
      expect(l.electric).toBe(false);
    }
  });
});
