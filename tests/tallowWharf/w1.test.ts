/**
 * Tallow Wharf W1, the night market (mission-framework GB1, `docs/missions/slices/GB-briefs.md` "GB1"): the sizes against the
 * graph, the two C1 boost lips, no solo jump onto them, only planned lips, no solo bypass of the bolted doors and the shutter
 * (shut on the guards' nav, A15), the placed shutter (J9 S3), and the lights.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEAM, WALL_JUMP } from '../../src/config/movement';
import { W1, W1_CONDUITS, W1_DESKS } from '../../src/world/maps/tallowWharfW1';
import { WHARF_SECTORS } from '../../src/world/maps/tallowWharfSectors';
import { contribution, type LightDef } from '../../src/world/lights';
import type { CoopTop } from '../helpers/soloJumpReach';
import { CHEST_Y, HEAD_Y } from '../../src/world/lighting/levels';
import { lampReach } from '../../src/world/lampMath';
import { MASS_TOP } from '../../src/world/maps/tallowWharfKit';
import { closeShutterNav, SHUTTER_PIECE } from '../../src/world/shutterDoor';
import { shutterSpecsOf } from '../../src/game/kit/shutter';
import {
  anchorsOf,
  blockedAt,
  builtWharf,
  climbRoom,
  COOP_BAND,
  downHit,
  GRAPH,
  legUpTarget,
  onPlannedLip,
  roomForBoost,
  soloJumpThreats,
  soloLevelThreats,
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

  it("the way from the start to the passage end is shut with the bolted doors shut and the shutter shut on the guards' nav (A15)", () => {
    const { nav, restore } = soloNav(b, 4, W1.navSeeds, shut);
    try {
      closeShutterNav(nav, shutterSpecsOf({ anchors: b.anchors }));
      expect(nav.findPath([7, 10], [38, 60], 1e6, 0, 0)).toBeNull();
      // the start reaches the market and the hall (the nav is not simply empty)
      expect(nav.findPath([7, 10], [20, 28], 1e6, 0, 0)).not.toBeNull();
      expect(nav.findPath([7, 10], [20, 51], 1e6, 0, 0)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('control: with the bolted doors shut and no shutter closure the opening is open floor; the closure is what blocks it', () => {
    const open = soloNav(b, 4, W1.navSeeds, shut);
    try {
      expect(open.nav.findPath([20, 51], [22, 60], 1e6, 0, 0)).not.toBeNull();
    } finally {
      open.restore();
    }
    const closed = soloNav(b, 4, W1.navSeeds, shut);
    try {
      closeShutterNav(closed.nav, shutterSpecsOf({ anchors: b.anchors }));
      expect(closed.nav.findPath([20, 51], [22, 60], 1e6, 0, 0)).toBeNull();
    } finally {
      closed.restore();
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
    expect(Object.keys(W1.doors).sort()).toEqual(['w1-conn-near', 'w1-gallery-ladder', 'w1-hall-back', 'w1-hall-side', 'w1-warden-stair']);
    for (const c of Object.values(W1.doors)) {
      // a door's hinge is at one jamb: the centre is half its width along the wall (yaw PI / 2: along x; yaw 0: along z)
      const near = b.anchors.doors.some((d) => Math.abs(d.hinge.x + (d.yaw === 0 ? 0 : d.width / 2) - c[0]) < 0.01 && Math.abs(d.hinge.z + (d.yaw === 0 ? d.width / 2 : 0) - c[2]) < 0.01 && Math.abs(d.hinge.y - c[1]) < 0.01);
      expect(near, `door at ${c.join(', ')}`).toBe(true);
    }
    // the gallery door into the office
    expect(b.anchors.doors.some((d) => Math.abs(d.hinge.x - 3.4) < 0.01 && Math.abs(d.hinge.y - 4.5) < 0.01 && Math.abs(d.hinge.z - 46) < 0.01)).toBe(true);
  });
});

describe('W1 shutter (C2, J9 S3)', () => {
  // the three pieces placeShutter adds around the opening: the head box and the two guides (colour SHUTTER_PIECE.frame)
  const frame = b.boxes.filter((p) => p.color === SHUTTER_PIECE.frame && Math.hypot(p.c[0] - 22, p.c[2] - 58) <= 2);

  it('places the one shutter spec the section declares', () => {
    expect(W1.shutters).toEqual([{ id: 'w1-shutter', x: 22, y: 0, z: 58, yaw: 0, width: 3, height: 3 }]);
    expect(shutterSpecsOf({ anchors: b.anchors })).toEqual(expect.arrayContaining(W1.shutters));
  });

  it('calls placeShutter and no stand-in', () => {
    const src = readFileSync(new URL('../../src/world/maps/tallowWharfW1.ts', import.meta.url), 'utf8');
    expect(src.includes('placeShutter(b, SHUTTER)')).toBe(true);
    expect(src.includes('standIn(')).toBe(false);
  });

  it('leaves the opening clear: no collide box in x 20.5-23.5, z 57.85-58.15, y 0.05-2.95', () => {
    const stray = b.boxes.filter((p) => {
      if (!p.collide) return false;
      const y0 = p.c[1] - p.s[1] / 2;
      const y1 = p.c[1] + p.s[1] / 2;
      if (y1 <= 0.05 || y0 >= 2.95) return false;
      return p.c[0] + p.s[0] / 2 > 20.5 && p.c[0] - p.s[0] / 2 < 23.5 && p.c[2] + p.s[2] / 2 > 57.85 && p.c[2] - p.s[2] / 2 < 58.15;
    });
    expect(stray.map((p) => `${p.c.join(',')} ${p.s.join(',')}`)).toEqual([]);
  });

  it('puts three frame pieces round the opening, every one noLedge', () => {
    expect(frame).toHaveLength(3);
    for (const p of frame) expect(p.noLedge).toBe(true);
  });

  it('keeps the crawl space clear: nothing but the wall and the frame below 3.0 m within z 57-59 at x 20.5-23.5', () => {
    const stray = b.boxes.filter((p) => {
      // (the ground slab, top 0, is not in the way)
      if (!p.collide || frame.includes(p) || p.c[1] + p.s[1] / 2 <= 0.05) return false;
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
    console.info(`W1 level ${name}: ${v.toFixed(3)} (>= ${min})`);
    expect(v, name).toBeGreaterThanOrEqual(min);
  };
  const le = (name: string, ls: LightDef[], amb: number, x: number, fy: number, z: number, max: number): void => {
    const v = levelAt(ls, amb, x, fy, z);
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

describe('W1 hide spots, the medkit and the vantages (J8 G1)', () => {
  const guards = WHARF_SECTORS[0]!.guards;
  const plan = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);
  /** Every W1 guard's post and route points: [x, z, floor y]. */
  const guardPoints = (): [number, number, number][] => guards.flatMap((g) => [[g.x, g.z, g.y ?? 0] as [number, number, number], ...(g.route ?? []).map((r) => [r[0], r[1], g.y ?? 0] as [number, number, number])]);

  it('has six hide spots, and each W1 takedown spot has one within 8 m on its floor', () => {
    expect(W1.hideSpots).toHaveLength(6);
    expect(guards).toHaveLength(9);
    guards.forEach((g, k) => {
      const [tx, tz] = g.takedownSpot;
      const d = W1.hideSpots.filter((h) => Math.abs(h.pos.y - (g.y ?? 0)) < 1).map((h) => plan(h.pos.x, h.pos.z, tx, tz));
      const best = Math.min(...d);
      console.info(`W1 guard ${k} takedown spot (${tx}, ${tz}): nearest hide spot ${best.toFixed(1)} m`);
      expect(best, `guard ${k}`).toBeLessThanOrEqual(8);
    });
  });

  it('every hide spot stands clear of the solid and in a W1 room', () => {
    for (const h of W1.hideSpots) {
      expect(blockedAt(solid, h.pos.x, h.pos.z, 0.3, h.pos.y), `hide spot (${h.pos.x}, ${h.pos.z})`).toEqual([]);
      expect(W1.rooms.some((r) => h.pos.x >= r.minX && h.pos.x <= r.maxX && h.pos.z >= r.minZ && h.pos.z <= r.maxZ), `room of (${h.pos.x}, ${h.pos.z})`).toBe(true);
    }
  });

  it('has one wall medkit, inside a W1 room, at least 10 m (plan) from every guard post and route point', () => {
    expect(W1.medkits).toHaveLength(1);
    const m = W1.medkits![0]!;
    expect(W1.rooms.some((r) => m.pos.x >= r.minX && m.pos.x <= r.maxX && m.pos.z >= r.minZ && m.pos.z <= r.maxZ && m.pos.y >= (r.minY ?? 0) - 0.1 && m.pos.y <= (r.maxY ?? 99))).toBe(true);
    expect(W1.rooms.find((r) => m.pos.x >= r.minX && m.pos.x <= r.maxX && m.pos.z >= r.minZ && m.pos.z <= r.maxZ)!.id).toBe('w1-canal-steps');
    for (const [x, z] of guardPoints()) expect(plan(m.pos.x, m.pos.z, x, z)).toBeGreaterThanOrEqual(10);
  });

  const VANTAGES = [
    { id: 'w1-vantage-market-a', eye: 1.6, target: [20, 1.0, 18] },
    { id: 'w1-vantage-market-b', eye: 1.6, target: [22, 1.0, 41] },
    { id: 'w1-vantage-hall-a', eye: 1.0, target: [22, 1.0, 56.5] },
    { id: 'w1-vantage-hall-b', eye: 1.0, target: [16, 1.0, 50] },
  ] as const;
  const point = (id: string): { x: number; y: number; z: number } => W1.debugPoints.find((d) => d.id === id)!.pos;

  it('has four vantage points, two per encounter, each on a floor and at least 1.0 m from its pair', () => {
    for (const v of VANTAGES) {
      const p = point(v.id);
      expect(downHit(solid, p.x, p.y + 1, p.z, p.y - 1), v.id).toBeCloseTo(p.y, 2);
    }
    for (const [a, c] of [['w1-vantage-market-a', 'w1-vantage-market-b'], ['w1-vantage-hall-a', 'w1-vantage-hall-b']] as const) {
      expect(plan(point(a).x, point(a).z, point(c).x, point(c).z)).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('every vantage reads at most 0.45 over all W1 lamps, and no guard post or route point is within 6 m of it on its floor band', () => {
    const all = b.lights.lights.filter((l) => inBox(l.x, l.z));
    for (const v of VANTAGES) {
      const p = point(v.id);
      const amb = p.y > 4 && p.z > 46 ? 0.14 : 0.244;
      let chest = 0;
      let head = 0;
      for (const l of all) {
        chest += contribution(l, p.x, p.y + CHEST_Y, p.z);
        head += contribution(l, p.x, p.y + HEAD_Y, p.z);
      }
      const level = Math.min(1, amb + Math.max(chest, head));
      console.info(`W1 vantage ${v.id}: level ${level.toFixed(3)}`);
      expect(level, v.id).toBeLessThanOrEqual(0.45);
      for (const [x, z, y] of guardPoints()) if (Math.abs(y - p.y) < 2) expect(plan(p.x, p.z, x, z), `${v.id} to guard point (${x}, ${z})`).toBeGreaterThan(6);
    }
  });

  /** The segment from an eye to a target, sampled every 0.05 m and stopped 0.3 m short, hits no collide piece (a start inside a piece is not a hit of that piece). */
  const clear = (ex: number, ey: number, ez: number, tx: number, ty: number, tz: number): boolean => {
    const len = Math.hypot(tx - ex, ty - ey, tz - ez) - 0.3;
    const n = Math.max(1, Math.floor(len / 0.05));
    for (let i = 0; i <= n; i++) {
      const f = (i * 0.05) / (len + 0.3);
      const x = ex + (tx - ex) * f;
      const y = ey + (ty - ey) * f;
      const z = ez + (tz - ez) * f;
      if (solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2)) return false;
    }
    return true;
  };

  for (const v of VANTAGES) {
    it(`${v.id}: the eye (floor + ${v.eye}) sees its target ${v.target.join(', ')} with no collide piece between`, () => {
      const p = point(v.id);
      expect(clear(p.x, p.y + v.eye, p.z, v.target[0], v.target[1], v.target[2])).toBe(true);
    });
  }

  it('control: from the old point (3.0, 6.1, 44.4) the shutter bay is blocked (the sightline check bites)', () => {
    expect(clear(3.0, 6.1, 44.4, 22, 1.0, 56.5)).toBe(false);
  });
});

describe('W1 gallery ladder (D0 TGC default, EGRESS E5)', () => {
  const ladder = b.anchors.ladders.find((l) => Math.abs(l.base.x - 6.45) < 1e-6 && Math.abs(l.base.z - 15.0) < 1e-6);

  it('stands at (6.45, 15.0) from y 0 to 4.5 and tops out on the gallery deck', () => {
    expect(ladder).toBeDefined();
    expect(ladder!.base.y).toBe(0);
    expect(ladder!.top.y).toBe(4.5);
    const x = ladder!.top.x + Math.sin(ladder!.facing) * 0.4;
    const z = ladder!.top.z + Math.cos(ladder!.facing) * 0.4;
    expect(x).toBeCloseTo(5.6, 6);
    expect(downHit(solid, x, 5.5, z, 3.5)).toBeCloseTo(4.5, 6);
  });

  it('the bottom step-off (base - facing x 0.7) is (7.15, 15.0), clear of the solid and inside the cage 0.5 m from each side\'s centre line', () => {
    const l = ladder!;
    const x = l.base.x - Math.sin(l.facing) * 0.7;
    const z = l.base.z - Math.cos(l.facing) * 0.7;
    expect(x).toBeCloseTo(7.15, 2);
    expect(z).toBeCloseTo(15.0, 2);
    expect(blockedAt(solid, 7.15, 15.0, 0.3, 0)).toEqual([]);
    expect(x).toBeGreaterThan(6.0);
    expect(x).toBeLessThan(7.75);
    expect(z).toBeGreaterThan(14.4);
    expect(z).toBeLessThan(15.6);
    for (const d of [Math.abs(x - 7.75), Math.abs(z - 15.6), Math.abs(z - 14.4), Math.abs(x - 6.0)]) expect(d).toBeGreaterThanOrEqual(0.5);
  });

  it('the cage door is a 1.0 m door at (6.6, 14.4) whose leaf opens toward -z, the canal steps (swing +1)', () => {
    const d = b.anchors.doors.find((q) => Math.abs(q.hinge.x - 6.1) < 1e-6 && Math.abs(q.hinge.z - 14.4) < 1e-6 && q.hinge.y === 0)!;
    expect(d).toBeDefined();
    expect(d.width).toBeCloseTo(1.0, 9);
    expect(d.height).toBeCloseTo(2.1, 9);
    expect(W1.doors['w1-gallery-ladder']).toEqual([6.6, 0, 14.4]);
    // the open leaf's direction: yaw + swing x openAngle (1.53 rad): (sin, cos) of it points -z
    const open = d.yaw + d.swing * 1.53;
    expect(Math.cos(open)).toBeLessThan(-0.9);
  });

  const cage: ShutDoor = { at: [6.6, 14.4], y: 0, w: 1.0, alongX: true };
  const stair: ShutDoor = { at: [W1.doors['w1-warden-stair']![0], W1.doors['w1-warden-stair']![2]], y: 0, w: 1.2, alongX: true };

  it('gate: with the cage door and the warden-stair foot door shut, the gallery is not reachable alone from either side of the market', () => {
    const { nav, restore } = soloNav(b, 4, W1.navSeeds, [cage, stair]);
    try {
      expect(nav.findPath([7, 10], [4, 20], 1e6, 0, 4.5)).toBeNull();
      expect(nav.findPath([16, 10], [4, 20], 1e6, 0, 4.5)).toBeNull();
    } finally {
      restore();
    }
  });

  it('control: with only the warden-stair door shut the ladder through the open cage door is the way up', () => {
    const { nav, restore } = soloNav(b, 4, W1.navSeeds, [stair]);
    try {
      expect(nav.findPath([7, 10], [4, 20], 1e6, 0, 4.5)).not.toBeNull();
      expect(nav.findPath([16, 10], [4, 20], 1e6, 0, 4.5)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('C1 stays forced: no solo jump or level run reaches either lip or the deck edge from the ladder\'s top, cage pieces included', () => {
    // skipped: the gallery deck's own blocks, and the solid building mass (top MASS_TOP, no way up: nobody stands on it, so no take-off)
    const deck = (p: { c: number[]; s: number[] }): boolean =>
      (p.c[0]! - p.s[0]! / 2 >= 2 - 1e-6 && p.c[0]! + p.s[0]! / 2 <= 6 + 1e-6 && p.c[2]! - p.s[2]! / 2 >= 14 - 1e-6 && p.c[2]! + p.s[2]! / 2 <= 46 + 1e-6 && p.c[1]! + p.s[1]! / 2 > 4.45) || p.c[1]! + p.s[1]! / 2 >= MASS_TOP - 1e-6;
    const tops: Record<string, CoopTop> = {
      'w1-lip-steps': { x0: 2.25, x1: 5.75, z0: 14, z1: 15.5, top: 4.5 },
      'w1-lip-market': { x0: 4.5, x1: 6, z0: 26.5, z1: 31.5, top: 4.5 },
      ladder: { x0: 3.6, x1: 6, z0: 14, z1: 16, top: 4.5 },
    };
    for (const lip of W1.lips) {
      expect(soloJumpThreats(solid, lip), lip.id).toEqual([]);
      expect(soloLevelThreats(solid, tops[lip.id]!, deck, 0.2), lip.id).toEqual([]);
    }
    expect(soloLevelThreats(solid, tops.ladder!, deck, 0.2)).toEqual([]);
    // control: a solid, standable top over the cage (a block, not the thin iron) at the deck's height is reported
    const block = { c: [6.875, 2.25, 15.0] as [number, number, number], s: [1.75, 4.5, 1.2] as [number, number, number], yaw: 0, pitch: 0, color: '#000', collide: true, visible: true, noLedge: true };
    expect(soloLevelThreats([...solid, block], tops.ladder!, deck, 0.2).length).toBeGreaterThan(0);
  });
});
