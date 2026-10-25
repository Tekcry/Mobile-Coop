/**
 * Tallow Wharf W1, the night market (mission-framework GB1, `docs/missions/slices/GB-briefs.md` "GB1"): the sizes against the
 * graph, the two C1 boost lips, no solo jump onto them, only planned lips, no solo bypass of the bolted doors and the shutter
 * stand-in, the shutter reservation, and the lights.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEAM, WALL_JUMP } from '../../src/config/movement';
import { W1, W1_CONDUITS, W1_DESKS } from '../../src/world/maps/tallowWharfW1';
import { WHARF_SECTORS } from '../../src/world/maps/tallowWharfSectors';
import { contribution, type LightDef } from '../../src/world/lights';
import { CHEST_Y, HEAD_Y } from '../../src/world/lighting/levels';
import { lampReach } from '../../src/world/lampMath';
import { STANDIN_TAGS } from '../../src/world/maps/tallowWharfKit';
import {
  anchorsOf,
  builtWharf,
  climbRoom,
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
  /** The listed deviations from the graph's area: the tea stall stops at z 14 (rooms may not overlap; the graph box runs into the market). */
  const OVERRIDE: Record<string, [number, number, number, number]> = { 'w1-tea-stall': [12, 6, 20, 14] };

  it('has one room per W1 graph space (7), with the graph area (the tea stall is the listed deviation) and storey', () => {
    expect(W1.rooms).toHaveLength(7);
    expect(spacesIn('W1')).toHaveLength(7);
    for (const s of spacesIn('W1')) {
      const r = W1.rooms.find((p) => p.id === s.id);
      expect(r, s.id).toBeDefined();
      const a = OVERRIDE[s.id] ?? s.area[0]!;
      expect(r!.minX).toBeCloseTo(a[0], 2);
      expect(r!.minZ).toBeCloseTo(a[1], 2);
      expect(r!.maxX).toBeCloseTo(a[2], 2);
      expect(r!.maxZ).toBeCloseTo(a[3], 2);
      expect(r!.minY ?? 0, s.id).toBeCloseTo(s.storey, 6);
    }
    for (const r of W1.rooms.filter((p) => (p.minY ?? 0) < 4)) expect(r.maxY, r.id).toBe(4.4);
  });

  it('lists its deviations, and the map carries the rooms', () => {
    expect(W1.deviations.map((d) => d.space).sort()).toEqual(['w1-gallery', 'w1-tea-stall', 'w1-warden-office']);
    for (const id of Object.keys(OVERRIDE)) expect(W1.deviations.some((d) => d.space === id), id).toBe(true);
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
      // the climb-up off the lip has a standing body's room inside the face (AttachController.climbRoom)
      expect(climbRoom(solid, lip)).toEqual([]);
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
  const near = (a: number, b2: number, tol = 1e-6): boolean => Math.abs(a - b2) <= tol;

  /** LIGHT.md section 2 "Lamps": [group, x, y, z, r, i]. */
  const TABLE: readonly (readonly [number, number, number, number, number, number])[] = [
    ...[15.5, 20, 25.5, 31].map((x) => [60, x, 3.0, 18.5, 8, 0.6] as const),
    ...[13.5, 19, 24.5, 30].map((x) => [61, x, 3.0, 37, 8, 0.45] as const),
    ...[47.5, 54.5].flatMap((z) => [11, 19, 26, 33].map((x) => [62, x, 5.4, z, 8, 1.5] as const)),
    [62, 18, 3.6, 43.7, 6, 0.5],
    [62, 26, 3.6, 43.7, 6, 0.5],
    [63, 2.6, 5.7, 50.4, 3.5, 0.5],
    [64, 16, 2.4, 12, 6, 0.3],
    [65, 7, 3.5, 6.4, 6, 0.3],
    [66, 22, 7.5, 43.6, 6, 0.6],
    ...[10, 16, 22, 28, 34].map((x) => [67, x, 2.85, 60, 5, 1.0] as const),
    [67, 38, 2.6, 60, 5, 0.35],
  ];

  it('has the 28 lamps of LIGHT.md section 2, every one on, in groups 60-67 as [4, 4, 10, 1, 1, 1, 1, 6]', () => {
    expect(lamps).toHaveLength(28);
    expect(TABLE).toHaveLength(28);
    for (const l of lamps) {
      expect(l.on).toBe(true);
      expect(l.group).toBeGreaterThanOrEqual(60);
      expect(l.group).toBeLessThanOrEqual(67);
    }
    expect([60, 61, 62, 63, 64, 65, 66, 67].map((g) => lamps.filter((l) => l.group === g).length)).toEqual([4, 4, 10, 1, 1, 1, 1, 6]);
  });

  it('each lamp\'s position, r and i are the table\'s (the registry stores the photometric reach of r)', () => {
    for (const [g, x, y, z, r, i] of TABLE) {
      const l = lamps.find((p) => p.group === g && near(p.x, x) && near(p.y, y) && near(p.z, z));
      expect(l, `group ${g} at (${x}, ${y}, ${z})`).toBeDefined();
      expect(l!.radius).toBeCloseTo(lampReach(r), 9);
      expect(l!.intensity).toBeCloseTo(i, 9);
    }
  });

  it('the switched groups are exactly 60-64; 65, 66 and 67 have no switch; the flags of 64 and 66 follow the fitting', () => {
    expect(W1.switches.map((s) => s.group)).toEqual([60, 61, 62, 63, 64]);
    for (const g of [60, 61, 62, 63, 64]) expect(lamps.some((l) => l.group === g), `group ${g}`).toBe(true);
    for (const g of [65, 66, 67]) {
      expect(W1.switches.some((s) => s.group === g)).toBe(false);
      expect(lamps.some((l) => l.group === g)).toBe(true);
    }
    expect(layout.switches!.filter((s) => s.section === 0)).toHaveLength(W1.switches.length);
    for (const l of lamps.filter((p) => p.group === 64)) expect(l.electric).toBe(false);
    for (const l of lamps.filter((p) => p.group === 66)) {
      expect(l.destructible).toBe(false);
      expect(l.electric).toBe(false);
    }
  });

  it('the closed office has no ceiling fitting: no lamp of group 63 hangs over y 6.0 (M1)', () => {
    for (const l of lamps.filter((p) => p.group === 63)) expect(l.y).toBeLessThanOrEqual(6.0);
  });
});

describe('W1 switches (LIGHT.md rule 5)', () => {
  const sw = (g: number): { x: number; y: number; z: number; group: number } => {
    const s = W1.switches.find((p) => p.group === g)!;
    return { x: s.pos.x, y: s.pos.y, z: s.pos.z, group: g };
  };
  const plan = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);

  it('62 and 63 stand within 1.5 m (plan) of the nearest jamb of an opening of the space they light, on its floor', () => {
    const s62 = sw(62);
    expect(s62.y).toBe(0);
    expect(Math.min(plan(s62.x, s62.z, 20.25, 44), plan(s62.x, s62.z, 23.75, 44))).toBeLessThanOrEqual(1.5);
    const s63 = sw(63);
    expect(s63.y).toBe(4.5);
    expect(Math.min(plan(s63.x, s63.z, 3.4, 46), plan(s63.x, s63.z, 4.6, 46))).toBeLessThanOrEqual(1.5);
  });

  it('60 and 61 stand within 0.5 m of their row-end box points, 64 within 1.0 m (plan) of its lamp', () => {
    expect(plan(sw(60).x, sw(60).z, 12, 20.5)).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(plan(sw(61).x, sw(61).z, 12, 35.5)).toBeLessThanOrEqual(0.5 + 1e-9);
    const lamp64 = b.lights.lights.find((l) => l.group === 64 && inBox(l.x, l.z))!;
    expect(plan(sw(64).x, sw(64).z, lamp64.x, lamp64.z)).toBeLessThanOrEqual(1.0);
  });
});

describe('W1 conduits (LIGHT.md rule 6)', () => {
  const lampsOf = (g: number) => b.lights.lights.filter((l) => l.group === g && inBox(l.x, l.z));

  for (const g of [60, 61, 62, 63]) {
    it(`group ${g}: one run per fitting, from its switch, ending within 0.3 m of the fitting, every leg axis-aligned`, () => {
      const runs = W1_CONDUITS.filter((r) => r.group === g);
      const fittings = lampsOf(g);
      const sws = W1.switches.filter((s) => s.group === g);
      expect(runs).toHaveLength(fittings.length);
      for (const r of runs) {
        const first = r.pts[0]!;
        expect(sws.some((s) => Math.hypot(first[0] - s.pos.x, first[2] - s.pos.z) <= 0.3), 'starts at a switch').toBe(true);
        const last = r.pts[r.pts.length - 1]!;
        expect(fittings.some((l) => Math.hypot(last[0] - l.x, last[1] - l.y, last[2] - l.z) <= 0.3), 'ends at a fitting').toBe(true);
        for (let i = 0; i + 1 < r.pts.length; i++) {
          const d = [0, 1, 2].filter((k) => Math.abs(r.pts[i + 1]![k]! - r.pts[i]![k]!) > 1e-9);
          expect(d, `leg ${i} of a group ${g} run`).toHaveLength(1);
        }
      }
      // every fitting is some run's end
      for (const l of fittings) expect(runs.some((r) => Math.hypot(r.pts[r.pts.length - 1]![0] - l.x, r.pts[r.pts.length - 1]![1] - l.y, r.pts[r.pts.length - 1]![2] - l.z) <= 0.3), `fitting (${l.x}, ${l.y}, ${l.z})`).toBe(true);
    });
  }

  it('only groups 60-63 have runs, and each leg is built as a visual-only 0.05 x 0.05 box', () => {
    expect([...new Set(W1_CONDUITS.map((r) => r.group))].sort()).toEqual([60, 61, 62, 63]);
    const legs = W1_CONDUITS.reduce((n, r) => n + r.pts.length - 1, 0);
    const built = b.boxes.filter((p) => p.color === '#4f5459' && p.c[0] <= 40 && p.c[2] >= 6 && p.c[2] <= 62);
    expect(built).toHaveLength(legs);
    for (const p of built) {
      expect(p.collide).toBe(false);
      expect([...p.s].filter((v) => Math.abs(v - 0.05) < 1e-9).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('W1 light levels (LIGHT.md section 1 rule 3 and section 2 check points)', () => {
  /** Ambient + the brighter of the chest and head sums of `contribution` over `ls`, capped at 1. */
  const levelAt = (ls: readonly LightDef[], ambient: number, x: number, floorY: number, z: number): number => {
    let chest = 0;
    let head = 0;
    for (const l of ls) {
      chest += contribution(l, x, floorY + CHEST_Y, z);
      head += contribution(l, x, floorY + HEAD_Y, z);
    }
    return Math.min(1, ambient + Math.max(chest, head));
  };
  const all = b.lights.lights.filter((l) => inBox(l.x, l.z));
  const of = (...gs: number[]): LightDef[] => all.filter((l) => gs.includes(l.group));
  const AMB = 0.244;
  const IN = 0.14;

  const ge = (name: string, ls: LightDef[], amb: number, x: number, fy: number, z: number, min: number): void => {
    const v = levelAt(ls, amb, x, fy, z);
    // eslint-disable-next-line no-console
    console.info(`W1 level ${name}: ${v.toFixed(3)} (>= ${min})`);
    expect(v, name).toBeGreaterThanOrEqual(min);
  };
  const le = (name: string, ls: LightDef[], amb: number, x: number, fy: number, z: number, max: number): void => {
    const v = levelAt(ls, amb, x, fy, z);
    // eslint-disable-next-line no-console
    console.info(`W1 level ${name}: ${v.toFixed(3)} (<= ${max})`);
    expect(v, name).toBeLessThanOrEqual(max);
  };

  it('the market: lit lanes, the west strip and the stall-back aisle read dark, the side-door approach is the 0.38 gap', () => {
    ge('S lane between lamps (17, 17.5)', of(60), AMB, 17, 0, 17.5, 0.55);
    ge('S lane far edge (17, 14.5)', of(60), AMB, 17, 0, 14.5, 0.38);
    le('west strip (8, 18)', of(60, 61), AMB, 8, 0, 18, 0.28);
    ge('N lane (17, 40)', of(61, 62), AMB, 17, 0, 40, 0.55);
    ge('clock end (22, 42.5)', of(61, 62), AMB, 22, 0, 42.5, 0.6);
    le('stall-back aisle (22, 28)', of(60, 61), AMB, 22, 0, 28, 0.28);
    le('side-door approach (34, 40)', of(61, 62), AMB, 34, 0, 40, 0.45);
  });

  it('the canal start reads in its pathway band and the tea counter is lit', () => {
    const v = levelAt(of(65), AMB, 7, 0, 10);
    // eslint-disable-next-line no-console
    console.info(`W1 level canal start (7, 10): ${v.toFixed(3)} (0.26-0.45)`);
    expect(v).toBeGreaterThanOrEqual(0.26);
    expect(v).toBeLessThanOrEqual(0.45);
    ge('tea counter (16, 11)', of(64), AMB, 16, 0, 11, 0.6);
  });

  it('the fish hall is in the market-hall band, the desk pool is lit and the office at the hatch is dark', () => {
    ge('hall centre (22, 51)', of(62), IN, 22, 0, 51, 0.79);
    ge('hall west bay (9.5, 46)', of(62), IN, 9.5, 0, 46, 0.79);
    ge('hall shutter bay (22, 57)', of(62), IN, 22, 0, 57, 0.79);
    ge('office desk pool (2.5, 50.6)', of(63), IN, 2.5, 4.5, 50.6, 0.6);
    le('office at the hatch (7.4, 53.0)', of(63), IN, 7.4, 4.5, 53.0, 0.28);
  });

  it('the passage is in the corridor band at the shutter and keeps the lit band between fittings', () => {
    ge('passage at the shutter (22, 59)', of(67), IN, 22, 0, 59, 0.79);
    ge('passage between fittings (25, 58.5)', of(67), IN, 25, 0, 58.5, 0.6);
  });
});

describe('W1 desks (LIGHT.md rule 7)', () => {
  it('W1_DESKS is the rule\'s list, and each desk is a visual-only box with its top 0.75 over its floor', () => {
    expect(W1_DESKS).toEqual([[2.0, 50.1, 3.2, 50.7, 4.5]]);
    for (const [x0, z0, x1, z1, fy] of W1_DESKS) {
      const p = b.boxes.find((q) => Math.abs(q.c[0] - (x0 + x1) / 2) < 1e-9 && Math.abs(q.c[2] - (z0 + z1) / 2) < 1e-9 && Math.abs(q.s[0] - (x1 - x0)) < 1e-9 && Math.abs(q.s[2] - (z1 - z0)) < 1e-9 && Math.abs(q.s[1] - 0.75) < 1e-9);
      expect(p, `desk at (${x0}, ${z0})`).toBeDefined();
      expect(p!.collide).toBe(false);
      expect(p!.c[1] + p!.s[1] / 2).toBeCloseTo(fy + 0.75, 9);
      expect(p!.c[1] - p!.s[1] / 2).toBeCloseTo(fy, 9);
    }
    // the lamp stands over the desk, 0.75 m over its top (the tally book's board (2.5, 4.5, 50.6) lies on it)
    const lamp63 = b.lights.lights.find((l) => l.group === 63 && inBox(l.x, l.z))!;
    expect(lamp63.x).toBeGreaterThan(2.0);
    expect(lamp63.x).toBeLessThan(3.2);
    expect(lamp63.z).toBeGreaterThan(50.1);
    expect(lamp63.z).toBeLessThan(50.7);
    expect(lamp63.y - (4.5 + 0.75)).toBeCloseTo(0.45, 9);
  });

  it('no desk is within 1.2 m of a door gap\'s face across the gap\'s width, on either side (every door on its floor in the section box)', () => {
    const bad: string[] = [];
    for (const [x0, z0, x1, z1, fy] of W1_DESKS) {
      for (const d of b.anchors.doors) {
        if (Math.abs(d.hinge.y - fy) >= 1 || !inBox(d.hinge.x, d.hinge.z)) continue;
        const ex = d.hinge.x + Math.sin(d.yaw) * d.width;
        const ez = d.hinge.z + Math.cos(d.yaw) * d.width;
        const alongX = Math.abs(Math.sin(d.yaw)) > 0.5;
        // across the gap's width: the desk's extent along the wall overlaps the gap; its distance is then across the wall
        const [lo, hi] = alongX ? [Math.min(d.hinge.x, ex), Math.max(d.hinge.x, ex)] : [Math.min(d.hinge.z, ez), Math.max(d.hinge.z, ez)];
        const [d0, d1] = alongX ? [x0, x1] : [z0, z1];
        if (d1 <= lo || d0 >= hi) continue;
        const [n0, n1, at] = alongX ? [z0, z1, d.hinge.z] : [x0, x1, d.hinge.x];
        const gap = at < n0 ? n0 - at : at > n1 ? at - n1 : 0;
        if (gap < 1.2) bad.push(`desk (${x0}, ${z0}) is ${gap.toFixed(2)} m from the door at (${d.hinge.x}, ${d.hinge.z})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('no guard post or route leg on the desk\'s floor passes within 0.3 m of it (plan)', () => {
    const segDist = (ax: number, az: number, bx: number, bz: number, r: readonly [number, number, number, number]): number => {
      let best = Infinity;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.02));
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n;
        const z = az + ((bz - az) * i) / n;
        best = Math.min(best, Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3])));
      }
      return best;
    };
    const bad: string[] = [];
    for (const [x0, z0, x1, z1, fy] of W1_DESKS) {
      const rect = [x0, z0, x1, z1] as const;
      WHARF_SECTORS[0]!.guards.forEach((g, k) => {
        if (Math.abs((g.y ?? 0) - fy) >= 1) return;
        if (segDist(g.x, g.z, g.x, g.z, rect) < 0.3) bad.push(`guard ${k} post`);
        const route = g.route ?? [];
        const n = route.length;
        for (let i = 0; i + 1 < n + (n >= 3 ? 1 : 0); i++) {
          const a = route[i]!;
          const c = route[(i + 1) % n]!;
          if (segDist(a[0], a[1], c[0], c[1], rect) < 0.3) bad.push(`guard ${k} leg ${i}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });
});
