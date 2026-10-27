/**
 * Tallow Wharf GB3: W3, the counting house (`tallowWharfW3.ts`). Every graph space has a room of the graph's size (the chute and the
 * cartway listed), the C7 chute boost lip is in the co-op band with room and no solo jump onto it and no other lip, the lantern drop
 * lands on the iron gallery, no solo route runs from the roof to the cartway with the bolted doors shut (and the controls show the
 * routes the shut doors cut), the roof's coal-yard edge is a drop guard, the key posts are 21 m apart behind solid mass, and the
 * lamp circuits are 80-90. J8 G3 adds the re-light to LIGHT.md section 4 (every lamp on, levels at the check points, the mounted
 * flood and head lamp, the crane lamp line, switches and conduits), the moved fire escape, the A30 bulkhead stair cases, the C5
 * landing side, cover, hide spots, desks, the medkit and the encounter vantages.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEAM, WALL_JUMP, MOVEMENT } from '../../src/config/movement';
import { hyp2 } from '../../src/core/mathx';
import type { Ledge } from '../../src/world/anchors';
import type { BoxPiece } from '../../src/world/levelBuilder';
import { contribution, type LightDef } from '../../src/world/lights';
import { lampReach } from '../../src/world/lampMath';
import { CHEST_Y, HEAD_Y } from '../../src/world/lighting/levels';
import { W3, W3_CONDUITS, W3_DESKS, W3_KEY_POSTS } from '../../src/world/maps/tallowWharfW3';
import { WHARF_SECTORS } from '../../src/world/maps/tallowWharfSectors';
import { SECTION_BOX } from '../../src/world/maps/tallowWharfKit';
import {
  anchorsOf,
  builtWharf,
  climbRoom,
  COOP_BAND,
  downHit,
  GREY_KEEP_CLEAR,
  legUpTarget,
  onPlannedLip,
  roomForBoost,
  soloJumpThreats,
  soloNav,
  solidOf,
  spacesIn,
  type ShutDoor,
} from './helpers';

const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const lip = W3.lips[0]!;
const ROOF = 8.4;
const legUp = W3.legUps[0]!;
const [BX0, BZ0, BX1, BZ1] = SECTION_BOX.W3;
const inBox = (x: number, z: number): boolean => x >= BX0 && x <= BX1 && z >= BZ0 && z <= BZ1;

/** The doors a solo run cannot pass (the bolted ones): the chute hatch, the coal-yard door, the strongroom, the east gate (keypad), the bridge door, the cart gate. */
const SHUT = {
  hatch: { at: [W3.doors['w3-chute-hatch']![0], W3.doors['w3-chute-hatch']![2]], y: 4.4, w: 1.2, alongX: true },
  coalYard: { at: [W3.doors['w3-coalyard-door']![0], W3.doors['w3-coalyard-door']![2]], y: 0, w: 1.2, alongX: true },
  strongroom: { at: [W3.doors['w3-strongroom']![0], W3.doors['w3-strongroom']![2]], y: 0, w: 1.2, alongX: true },
  eastGate: { at: [W3.doors['w3-east-gate']![0], W3.doors['w3-east-gate']![2]], y: 0, w: 1.2, alongX: true },
  bridge: { at: [W3.doors['w3-bridge']![0], W3.doors['w3-bridge']![2]], y: 8.4, w: 1.2, alongX: false },
  // the cart gate is a roller leaf (x 88.5-90.3) and a wicket (x 90.3-91.5): the whole 3 m gap is shut
  cartGate: { at: [90, 38], y: 0, w: 3.0, alongX: true },
} satisfies Record<string, ShutDoor>;
const ALL_SHUT: ShutDoor[] = Object.values(SHUT);
/** TKL (A30): the bulkhead stair's foot leaf, bolted on the wing side by G2. Outside `ALL_SHUT`, so the other tests keep today's set. */
const BULKHEAD_FOOT: ShutDoor = { at: [W3.doors['w3-bulkhead-foot']![0], W3.doors['w3-bulkhead-foot']![2]], y: 0, w: 1.2, alongX: false };
/** The lodge's two doors, shut in the TKL case to isolate the stair (the yard door, the inner door). */
const LODGE_DOORS: ShutDoor[] = [
  { at: [114, 48], y: 0, w: 1.2, alongX: false },
  { at: [117, 52], y: 0, w: 1.2, alongX: true },
];

/** A W3 guard's floor, and its post and route points as [x, z, floor]: the post, then every route point. */
const W3G = WHARF_SECTORS[2]!.guards;
const guardPoints = (): { x: number; z: number; y: number; who: string }[] =>
  W3G.flatMap((g, i) => [{ x: g.x, z: g.z, y: g.y ?? 0, who: `guard ${i} post` }, ...(g.route ?? []).map(([x, z], k) => ({ x, z, y: g.y ?? 0, who: `guard ${i} route ${k}` }))]);

/** Is (x, y, z) inside a piece of `solid`? */
const inside = (solid: readonly BoxPiece[], x: number, y: number, z: number): BoxPiece | undefined =>
  solid.find((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
/** The first piece a segment crosses, sampled every 0.05 m and stopped `stop` m short of its end. */
function segmentBlock(solid: readonly BoxPiece[], a: readonly [number, number, number], e: readonly [number, number, number], stop: number): string | null {
  const len = Math.hypot(e[0] - a[0], e[1] - a[1], e[2] - a[2]);
  for (let d = 0; d <= len - stop; d += 0.05) {
    const t = d / len;
    const x = a[0] + (e[0] - a[0]) * t;
    const y = a[1] + (e[1] - a[1]) * t;
    const z = a[2] + (e[2] - a[2]) * t;
    const p = inside(solid, x, y, z);
    if (p) return `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) in box (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')})`;
  }
  return null;
}
/** The plan distance from a point to a rectangle [x0, z0, x1, z1]. */
const distRect = (x: number, z: number, r: readonly number[]): number => hyp2(Math.max(r[0]! - x, 0, x - r[2]!), Math.max(r[1]! - z, 0, z - r[3]!));
/** A piece's plan footprint [x0, z0, x1, z1], and the plan distance between two rectangles. */
const footprint = (p: BoxPiece): number[] => [p.c[0] - p.s[0] / 2, p.c[2] - p.s[2] / 2, p.c[0] + p.s[0] / 2, p.c[2] + p.s[2] / 2];
const gapRects = (a: readonly number[], c: readonly number[]): number => hyp2(Math.max(a[0]! - c[2]!, c[0]! - a[2]!, 0), Math.max(a[1]! - c[3]!, c[1]! - a[3]!, 0));
/** The plan distance from a segment to a rectangle (sampled every 0.02 m: error under 0.01). */
function distSegRect(a: readonly [number, number], e: readonly [number, number], r: readonly number[]): number {
  const len = hyp2(e[0] - a[0], e[1] - a[1]);
  let best = Infinity;
  const n = Math.max(1, Math.ceil(len / 0.02));
  for (let i = 0; i <= n; i++) best = Math.min(best, distRect(a[0] + ((e[0] - a[0]) * i) / n, a[1] + ((e[1] - a[1]) * i) / n, r));
  return best;
}

/**
 * LIGHT.md section 1 rule 3: ambient + the brighter of chest (floor + CHEST_Y) and head (floor + HEAD_Y) of the summed
 * `contribution` over the given lamps, capped at 1, visibility 1. A cone lamp is read through its cone (`bodyEstimate` is wrong for a flood).
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

describe('W3: sizes against the graph', () => {
  const OVERRIDE: Record<string, [number, number, number, number]> = {
    'w3-chute': [96.5, 50.0, 97.7, 52.0],
    'w3-cartway': [88, 34, 92, 38],
  };

  it('every graph space has a room of the graph\'s area (the chute and the cartway are the listed deviations); 13 graph rooms plus the front hall', () => {
    const graph = spacesIn('W3');
    expect(graph).toHaveLength(13);
    expect(W3.rooms).toHaveLength(14);
    for (const s of graph) {
      const r = W3.rooms.find((q) => q.id === s.id);
      expect(r, s.id).toBeDefined();
      const want = OVERRIDE[s.id] ?? s.area[0]!;
      expect([r!.minX, r!.minZ, r!.maxX, r!.maxZ].map((v) => Math.round(v * 100) / 100), s.id).toEqual(want);
      expect(r!.minY ?? 0, `${s.id} storey`).toBeCloseTo(s.storey, 6);
    }
    expect(W3.rooms.find((q) => q.id === 'w3-front-hall')).toBeDefined();
    expect(graph.some((s) => s.id === 'w3-front-hall')).toBe(false);
    // the deviation list names the two (and the non-graph hall and the roof's marker note)
    for (const id of Object.keys(OVERRIDE)) expect(W3.deviations.some((d) => d.space === id), id).toBe(true);
    expect(W3.deviations.some((d) => d.space === 'w3-front-hall')).toBe(true);
  });

  it('the rooms are in the built map\'s layout and every room lies inside the W3 section box', () => {
    const { layout } = builtWharf();
    for (const r of W3.rooms) {
      expect(layout.rooms!.some((q) => q.id === r.id), r.id).toBe(true);
      expect(inBox(r.minX, r.minZ) && inBox(r.maxX, r.maxZ), r.id).toBe(true);
    }
  });
});

describe('W3: C7, the chute boost', () => {
  const { b } = builtWharf();
  const solid = solidOf(b);

  it('the lip is 4.4 over the passage floor, inside the co-op band, with a leg-up spot at the wall face + WALL_STANDOFF', () => {
    expect(lip.y - lip.floor).toBeCloseTo(4.4, 9);
    expect(lip.y - lip.floor).toBeGreaterThanOrEqual(COOP_BAND.min - 1e-6);
    expect(lip.y - lip.floor).toBeLessThanOrEqual(COOP_BAND.max + 1e-6);
    expect(legUp.lip).toBe(lip.id);
    expect(legUp.z - 52.3).toBeCloseTo(0.9, 6);
    expect(legUp.facing).toEqual({ x: 0, z: -1 });
  });

  it('the leg-up from the spot finds the lip (canClimbUp, top 4.4, nz > 0.99) and the booster has room; the climb depth is over LEDGE.climbDepth', () => {
    const anchors = anchorsOf(b);
    const t = legUpTarget(anchors, legUp, legUp.facing);
    expect(t).not.toBeNull();
    const l = t!.anchor as Ledge;
    expect(l.kind).toBe('ledge');
    expect(l.canClimbUp).toBe(true);
    expect(l.top).toBeCloseTo(4.4, 6);
    expect(l.nz).toBeGreaterThan(0.99);
    expect(onPlannedLip(l, W3.lips)).toBe(true);
    expect(roomForBoost(solid, legUp, legUp.facing)).toBe(true);
    // the sill the lip climbs onto: the wall top 0.6 deep at 4.4, the duct floor continuing behind it
    const sill = solid.filter((p) => Math.abs(top(p) - 4.4) < 1e-6 && Math.abs(97.1 - p.c[0]) < p.s[0] / 2 && Math.abs(52.0 - p.c[2]) < p.s[2] / 2);
    expect(sill.length).toBeGreaterThan(0);
    expect(Math.min(...sill.map((p) => p.s[2]))).toBeGreaterThanOrEqual(0.6 - 1e-6);
    // wall -> chute floor: continuous top at 4.4 from the wall face (z 52.3) to the hatch (z 50.0)
    for (const z of [52.1, 51.5, 50.8, 50.2]) expect(downHit(solid, 97.1, 5.0, z, 3.0), `z ${z}`).toBeCloseTo(4.4, 6);
    // the climb-up off the lip has a standing body's room inside the face (AttachController.climbRoom): the 1.9 opening and hood
    expect(climbRoom(solid, lip)).toEqual([]);
  });

  it('the chute interior is at least 1.5 high (a crouch, 1.15, fits) and 1.2 wide; the duct is walled and lidded', () => {
    const lids = solid.filter((p) => bottom(p) > 4.5 && Math.abs(97.1 - p.c[0]) < p.s[0] / 2 && Math.abs(51.0 - p.c[2]) < p.s[2] / 2);
    expect(lids.length).toBeGreaterThan(0);
    const clear = Math.min(...lids.map(bottom)) - 4.4;
    expect(clear).toBeGreaterThanOrEqual(1.5 - 1e-6);
    expect(clear).toBeGreaterThan(MOVEMENT.crouchHeight);
    const room = W3.rooms.find((r) => r.id === 'w3-chute')!;
    expect(room.maxX - room.minX).toBeCloseTo(1.2, 6);
    expect(room.minY).toBe(4.4);
    // side walls both sides, over the full interior height
    for (const x of [96.4, 97.8]) expect(solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(51.0 - p.c[2]) < p.s[2] / 2 && bottom(p) <= 4.4 + 1e-6 && top(p) >= 5.9 - 1e-6), `wall x ${x}`).toBe(true);
  });

  it('no solo jump reaches the lip (soloJumpThreats is empty); the keep-clear radius is the greybox\'s 4.7', () => {
    expect(GREY_KEEP_CLEAR).toBe(4.7);
    expect(soloJumpThreats(solid, { y: lip.y, a: lip.a, b: lip.b, n: lip.n })).toEqual([]);
  });

  it('only planned lips in the W3 box at band height: the chute lip alone', () => {
    const anchors = anchorsOf(b);
    const band = anchors.ledges.filter((l) => l.canHang && l.top >= WALL_JUMP.maxUp - 1e-3 && l.top <= TEAM.boostMax + 0.05 && l.drop >= 1.9 && inBox(l.a.x, l.a.z) && inBox(l.b.x, l.b.z));
    const bad = band.filter((l) => !onPlannedLip(l, W3.lips)).map((l) => `(${l.a.x}, ${l.a.z}) -> (${l.b.x}, ${l.b.z}) top ${l.top}`);
    expect(bad).toEqual([]);
    expect(band.length).toBeGreaterThanOrEqual(1);
    // and every ledge in the box under the shell perimeter (top 12, GB0's) is that lip (every piece is noLedge)
    const all = anchors.ledges.filter((l) => inBox(l.a.x, l.a.z) && inBox(l.b.x, l.b.z) && l.top < 12);
    expect(all).toHaveLength(1);
  });

  it('every collide box W3 adds is noLedge (the lip is a manual ledge on noLedge pieces)', () => {
    const mine = b.boxes.filter((p) => p.collide && p.pitch === 0 && p.c[0] > BX0 && p.c[0] < BX1 && p.c[2] > BZ0 && p.c[2] < BZ1);
    expect(mine.length).toBeGreaterThan(100);
    expect(mine.filter((p) => !p.noLedge)).toHaveLength(0);
  });
});

describe('W3: the lantern drop', () => {
  const { b } = builtWharf();
  const solid = solidOf(b);

  it('a down-cast through the sash lands on the gallery ring at 4.2; the sash is the south upstand\'s only gap', () => {
    // (the brief gives z 60.8: the roof opening's south edge is z 61, so the cast is at z 61.2, inside the opening and over the ring's south strip z 60-61.5)
    expect(downHit(solid, 89, 8.5, 61.2, 0)).toBeCloseTo(4.2, 2);
    expect(downHit(solid, 89, 10, 60.9, 0)).toBeCloseTo(8.4, 6);
    expect(downHit(solid, 87.5, 10, 60.9, 0)).toBeCloseTo(9.4, 6);
    // the hole in the ring: a fall through it lands on the hall floor (8.4 free fall: the game has no fall damage)
    expect(downHit(solid, 89, 8.5, 63, 0)).toBeCloseTo(0, 6);
  });

  it('the ring connects to the hall floor on the nav grid (the link slab and the stair)', () => {
    const { nav, restore } = soloNav(b, 4, W3.navSeeds, []);
    try {
      expect(nav.findPath([89, 60.6], [88, 58], 1e6, 4.2, 0)).not.toBeNull();
    } finally {
      restore();
    }
  });
});

describe('W3: no solo bypass', () => {
  const { b } = builtWharf();

  it('with the six bolted doors shut, nothing joins the roof to the cartway; the cuts are the bolts, not the geometry', () => {
    const { nav, restore } = soloNav(b, 4, W3.navSeeds, ALL_SHUT);
    try {
      expect(nav.findPath([100, 70], [90, 36], 1e6, 8.4, 0)).toBeNull();
      // the roof reaches the passage (by the bulkhead stair or the fire escape and the lodge) with every bolt shut: the geometry is a route
      expect(nav.findPath([100, 70], [101, 53.75], 1e6, 8.4, 0)).not.toBeNull();
      // and the passage reaches nothing past the coal-yard door
      expect(nav.findPath([101, 53.75], [90, 46], 1e6, 0, 0)).toBeNull();
    } finally {
      restore();
    }
  });

  it('control: the coal yard reaches the cartway once the connector\'s near door is dropped from the shut list', () => {
    const shut = ALL_SHUT.filter((d) => d !== SHUT.cartGate);
    const { nav, restore } = soloNav(b, 4, W3.navSeeds, shut);
    try {
      expect(nav.findPath([90, 46], [90, 36], 1e6, 0, 0)).not.toBeNull();
      // the roof still does not (the coal-yard door is shut)
      expect(nav.findPath([100, 70], [90, 36], 1e6, 8.4, 0)).toBeNull();
    } finally {
      restore();
    }
  });

  it('control: with the coal-yard door and the cart gate open the roof reaches the cartway (the route C7 and the bolts gate)', () => {
    const shut = ALL_SHUT.filter((d) => d !== SHUT.cartGate && d !== SHUT.coalYard);
    const { nav, restore } = soloNav(b, 4, W3.navSeeds, shut);
    try {
      expect(nav.findPath([100, 70], [90, 36], 1e6, 8.4, 0)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('TGC, no bulkhead bolt: the roof reaches the east wing by the bulkhead stair and the east yard by the fire escape', () => {
    const { nav, restore } = soloNav(b, 4, W3.navSeeds, ALL_SHUT);
    try {
      expect(nav.findPath([111, 68], [110, 62], 1e6, 8.4, 0)).not.toBeNull();
      expect(nav.findPath([108.65, 51.2], [108, 45], 1e6, 8.4, 0)).not.toBeNull();
      // the east yard reaches the east wing through the lodge (unlocked doors), not through the shut gate
      expect(nav.findPath([108, 45], [110, 62], 1e6, 0, 0)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('TKL, the bulkhead foot bolted: a lone player on the roof does not reach the east wing; without the bolt (TGC) the stair is the way in', () => {
    // the lodge's two doors are shut to isolate the stair (otherwise the fire escape and the lodge lead into the wing); the latched sash is not walked by the nav, so it needs no entry
    const shut = [...ALL_SHUT, ...LODGE_DOORS];
    const { nav, restore } = soloNav(b, 4, W3.navSeeds, [...shut, BULKHEAD_FOOT]);
    try {
      expect(nav.findPath([111, 68], [110, 62], 1e6, 8.4, 0)).toBeNull();
    } finally {
      restore();
    }
    const open = soloNav(b, 4, W3.navSeeds, shut);
    try {
      expect(open.nav.findPath([111, 68], [110, 62], 1e6, 8.4, 0)).not.toBeNull();
    } finally {
      open.restore();
    }
  });
});

describe('W3: drops cannot skip C7', () => {
  const { b } = builtWharf();
  const solid = solidOf(b);

  it('the coal-yard drop guard is a collide noLedge screen over x 82-100 at z 52, y 8.4-10.6 (over the vestibule too)', () => {
    const g = W3.dropGuards.find((d) => d.id === 'w3-dg-coalyard')!;
    expect(g).toBeDefined();
    expect(g.y).toBeCloseTo(8.4, 9);
    expect(g.h).toBeCloseTo(2.2, 9);
    const boxes = b.boxes.filter((p) => p.collide && p.noLedge && Math.abs(bottom(p) - 8.4) < 1e-6 && Math.abs(top(p) - 10.6) < 1e-6 && Math.abs(p.c[2] - 52) < 0.2 && p.s[2] < 0.2);
    expect(boxes.length).toBeGreaterThan(0);
    const x0 = Math.min(...boxes.map((p) => p.c[0] - p.s[0] / 2));
    const x1 = Math.max(...boxes.map((p) => p.c[0] + p.s[0] / 2));
    expect(x0).toBeLessThanOrEqual(82 + 1e-6);
    expect(x1).toBeGreaterThanOrEqual(100 - 1e-6);
    // taller than the 1.8 m mantle: nothing to climb it by
    expect(g.h).toBeGreaterThan(1.8);
  });

  it('a drop off the roof\'s south edge at x 82-100 never lands on a floor linked to the coal yard: each down-cast from y 9 at z 51.5 is behind an unmantleable screen or reaches no yard floor', () => {
    const MANTLE = 1.8;
    // a piece across the roof edge (z 51.4-52.6) from the roof surface to over the mantle: the step off is shut there
    const screened = (x: number): boolean =>
      solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && p.c[2] - p.s[2] / 2 < 52.6 && p.c[2] + p.s[2] / 2 > 51.4 && bottom(p) <= ROOF + 0.05 && top(p) > ROOF + MANTLE);
    const { nav, restore } = soloNav(b, 4, W3.navSeeds, ALL_SHUT);
    try {
      const bad: string[] = [];
      for (let x = 82.05; x < 100; x += 0.1) {
        if (screened(x)) continue;
        const f = downHit(solid, x, 9, 51.5, -1);
        if (Number.isFinite(f) && nav.findPath([x, 51.5], [90, 46], 1e6, f, 0) !== null) bad.push(`x ${x.toFixed(2)} lands at ${f.toFixed(2)}`);
      }
      expect(bad).toEqual([]);
      // control: the casts themselves do reach the yard (the vestibule x 98-99.85 included), so it is the screen that holds
      expect(downHit(solid, 98.9, 9, 51.5, -1)).toBeCloseTo(0, 6);
      expect(nav.findPath([98.9, 51.5], [90, 46], 1e6, 0, 0)).not.toBeNull();
    } finally {
      restore();
    }
    // the mantle way round: the fire escape's half landing (top 4.2, x 101.9-103.2) is over the mantle under the dividing wall x 100
    const wallPieces = (z: number): BoxPiece[] => solid.filter((p) => Math.abs(100 - p.c[0]) < p.s[0] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2 && bottom(p) < 4.2);
    let wallTop = Infinity;
    let wallFace = Infinity;
    for (let z = 49.2; z < 51.7; z += 0.1) {
      const ps = wallPieces(z);
      wallTop = Math.min(wallTop, Math.max(...ps.map(top)));
      wallFace = Math.min(wallFace, ...ps.map((p) => p.c[0] + p.s[0] / 2));
    }
    expect(downHit(solid, 102.55, 5, 50.4, 3)).toBeCloseTo(4.2, 6);
    expect(wallTop - 4.2).toBeGreaterThan(MANTLE);
    expect(101.9 - wallFace).toBeGreaterThanOrEqual(1.5);
    // nothing to step up on toward the coal yard: no collide piece with a top 0.38 m deep or more between y 4.62 and 6.0 within 2.0 m (plan) of the landing
    const landing = [101.9, 49.1, 103.2, 51.7];
    const steps = solid.filter((p) => Math.min(p.s[0], p.s[2]) >= 0.38 && top(p) > 4.62 && top(p) < 6.0 && gapRects(footprint(p), landing) < 2.0);
    expect(steps.map((p) => `top ${top(p).toFixed(2)} at (${p.c.join(', ')})`)).toEqual([]);
  });

  it('nothing standable floats over the coal yard above 1.5 m except the chute duct (its only exit is the bolted hatch)', () => {
    const [ax0, az0, ax1, az1] = spacesIn('W3').find((s) => s.id === 'w3-coal-yard')!.area[0]!;
    const duct = { x0: 96.3, z0: 49.8, x1: 97.9, z1: 52.3 };
    const ps = solid.filter((p) => {
      const ox = Math.min(p.c[0] + p.s[0] / 2, ax1) - Math.max(p.c[0] - p.s[0] / 2, ax0);
      const oz = Math.min(p.c[2] + p.s[2] / 2, az1) - Math.max(p.c[2] - p.s[2] / 2, az0);
      return ox > 1e-6 && oz > 1e-6 && bottom(p) > 1.5 && Math.min(p.s[0], p.s[2]) >= 0.38;
    });
    // a top is walkable when no solid sits on it (nothing over its footprint within the body's height)
    const covered = (p: BoxPiece): boolean =>
      solid.some((o) => o !== p && bottom(o) >= top(p) - 1e-6 && bottom(o) < top(p) + 1.7 && Math.abs(o.c[0] - p.c[0]) < (o.s[0] + p.s[0]) / 2 - 1e-6 && Math.abs(o.c[2] - p.c[2]) < (o.s[2] + p.s[2]) / 2 - 1e-6);
    const stray = ps.filter((p) => !covered(p)).filter((p) => !(p.c[0] >= duct.x0 && p.c[0] <= duct.x1 && p.c[2] >= duct.z0 && p.c[2] <= duct.z1));
    expect(stray.map((p) => `top ${top(p).toFixed(2)} at (${p.c.join(', ')})`)).toEqual([]);
    // the duct's own end is the hatch: a 1.5 m door at z 50.0, on the floor's height
    expect(W3.doors['w3-chute-hatch']).toEqual([97.1, 4.4, 50.0]);
  });
});

describe('W3: the pair gate', () => {
  const { b } = builtWharf();
  const solid = solidOf(b);

  it('the key posts are 21 m apart (+-0.5) and a plan segment between them crosses a collide box taller than 2 m', () => {
    const [ex, , ez] = W3_KEY_POSTS.east;
    const [wx, , wz] = W3_KEY_POSTS.west;
    expect(Math.hypot(ex - wx, ez - wz)).toBeGreaterThan(20.5);
    expect(Math.hypot(ex - wx, ez - wz)).toBeLessThan(21.5);
    const tall = solid.filter((p) => p.s[1] > 2);
    // sample the segment: it enters a tall box
    let hit = 0;
    for (let i = 0; i <= 210; i++) {
      const x = wx + ((ex - wx) * i) / 210;
      const z = wz + ((ez - wz) * i) / 210;
      if (tall.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2 && bottom(p) < 1.5 && top(p) > 2)) hit++;
    }
    expect(hit).toBeGreaterThan(20);
    // each post is inside its alcove
    expect(ex >= 106 && ex <= 112 && ez >= 74 && ez <= 78).toBe(true);
    expect(wx >= 85 && wx <= 91 && wz >= 74 && wz <= 78).toBe(true);
  });
});

describe('W3: doors, ducts and data', () => {
  const { b, layout } = builtWharf();

  it('the named doors are door anchors on the right floors; the cart gate has a sliding leaf and a wicket', () => {
    const doors = b.anchors.doors;
    const at = (x: number, y: number, z: number): boolean => doors.some((d) => Math.abs(d.hinge.y - y) < 1e-6 && Math.abs(d.hinge.z - z) < 1.3 && Math.abs(d.hinge.x - x) < 1.3 + 0.01);
    for (const [name, [x, y, z]] of Object.entries(W3.doors)) expect(at(x, y, z), name).toBe(true);
    const roller = doors.find((d) => d.leaf === 'slide' && Math.abs(d.hinge.z - 38) < 1e-6);
    expect(roller).toBeDefined();
    expect(roller!.width).toBeCloseTo(1.8, 6);
    // none of W3's doors is locked by the greybox (GB5 bolts them)
    expect(doors.filter((d) => d.hinge.x >= BX0 && d.hinge.z >= BZ0 && d.locked)).toHaveLength(0);
    // unlocked, in the W3 box: passage x2, strongroom, front hall double, bridge, east gate, lodge x2, office, cart gate x2, stair x2, hatch, coal-yard door
    expect(doors.filter((d) => d.hinge.x >= BX0 && d.hinge.z >= BZ0).length).toBeGreaterThanOrEqual(15);
  });

  it('the two secret ducts are 1.2 x 1.5 crouch ducts through the walls', () => {
    const solid = solidOf(b);
    const hit = (x: number, y: number, z: number): boolean => solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
    // the heating duct, x 96-106 at z 73.2: clear down the middle at crouch height, closed at its sides, open at both mouths
    for (let x = 96.2; x <= 105.8; x += 0.2) for (let y = 0.1; y <= 1.3; y += 0.2) expect(hit(x, y, 73.2), `heating ${x.toFixed(1)}, ${y.toFixed(1)}`).toBe(false);
    expect(hit(101, 0.7, 72.5)).toBe(true);
    expect(hit(101, 0.7, 73.9)).toBe(true);
    expect(hit(95.5, 0.7, 73.2)).toBe(false);
    expect(hit(106.5, 0.7, 73.2)).toBe(false);
    // the old coal hole, x 104.5 from z 52.3 to 49.2, through the 0.6 wall
    for (let z = 49.4; z <= 52.2; z += 0.2) for (let y = 0.1; y <= 1.3; y += 0.2) expect(hit(104.5, y, z), `coal hole z ${z.toFixed(1)}, ${y.toFixed(1)}`).toBe(false);
    expect(hit(103.8, 0.7, 51.0)).toBe(true);
    expect(hit(105.2, 0.7, 51.0)).toBe(true);
  });

  it('the exports: nav seeds, hide spots, debug points, lips, leg-ups, no shutters, no throws; the file never calls placeShutter', () => {
    expect(W3.navSeeds).toHaveLength(14);
    expect(W3.hideSpots).toHaveLength(9);
    expect(W3.debugPoints.map((d) => d.id)).toEqual([
      'w3-bulkhead-head',
      'w3-corner-bay',
      'w3-chute-spot',
      'w3-coal-yard',
      'w3-cartway',
      'w3-fire-escape-head',
      'w3-fire-escape-foot',
      'w3-vantage-yard-a',
      'w3-vantage-yard-b',
      'w3-vantage-east-a',
      'w3-vantage-east-b',
      'w3-vantage-west-a',
      'w3-vantage-west-b',
    ]);
    // A30: the bulkhead stair's foot leaf is named (not the top leaf, which shares its x / z)
    expect(W3.doors['w3-bulkhead-foot']).toEqual([112.5, 0, 68]);
    expect(Object.values(W3.doors).filter((d) => d[0] === 112.5 && d[2] === 68)).toHaveLength(1);
    expect(W3.lips.map((l) => l.id)).toEqual(['w3-lip-chute']);
    expect(W3.legUps).toHaveLength(1);
    expect(W3.shutters).toEqual([]);
    expect(W3.throws).toEqual([]);
    expect(W3.pulls).toEqual([]);
    expect(W3.ropes).toEqual([]);
    expect(W3.dropGuards.map((d) => d.id)).toEqual(['w3-dg-coalyard']);
    expect(W3.entry).toEqual([100, 8.4, 70]);
    expect(W3.exit).toEqual([90, 0, 36]);
    expect(readFileSync(new URL('../../src/world/maps/tallowWharfW3.ts', import.meta.url), 'utf8')).not.toContain('placeShutter(');
    // the seeds are inside the box; the W3 doors in the layout carry the section index (2)
    for (const s of W3.navSeeds) expect(inBox(s.x, s.z), `${s.x}, ${s.z}`).toBe(true);
    expect(b.anchors.doors.filter((d) => d.hinge.x >= BX0 && d.hinge.z >= BZ0).every((d) => d.section === 2)).toBe(true);
    expect(layout.switches!.filter((s) => s.section === 2).length).toBe(W3.switches.length);
  });
});


describe('W3: lights (LIGHT.md section 4)', () => {
  const { b } = builtWharf();
  const lamps = b.lights.lights.filter((l) => inBox(l.x, l.z));
  const group = (...g: number[]): LightDef[] => lamps.filter((l) => g.includes(l.group));

  /** LIGHT.md section 4's table: group, x, y, z, r, i. */
  const TABLE: readonly (readonly [number, number, number, number, number, number])[] = [
    [80, 112, 3.0, 51.6, 4, 0.5],
    [80, 113.7, 2.9, 46.0, 14, 2.5],
    [80, 109.0, 10.0, 52.15, 5, 0.5],
    [81, 117, 2.6, 48, 5, 0.6],
    [82, 110, 1.2, 58, 4, 0.35],
    [83, 116, 1.2, 58, 4, 0.35],
    [84, 101, 2.9, 68, 8, 0.8],
    [84, 107.5, 2.9, 68, 8, 0.8],
    [84, 113.8, 3.0, 55.3, 7, 0.8],
    [84, 109.2, 3.0, 59, 7, 0.8],
    [84, 109.2, 3.0, 66, 7, 0.8],
    [84, 117.6, 3.0, 59, 7, 0.8],
    [84, 117.6, 3.0, 66, 7, 0.8],
    [84, 113.8, 3.0, 71.7, 7, 0.8],
    [85, 90, 1.2, 56, 4, 0.35],
    [85, 85, 3.8, 55.5, 8, 0.9],
    [85, 93, 3.8, 55.5, 8, 0.9],
    [85, 85, 3.8, 70.5, 8, 0.9],
    [85, 93, 3.8, 70.5, 8, 0.9],
    [85, 83.6, 3.8, 63, 8, 0.9],
    [85, 94.4, 3.8, 63, 8, 0.9],
    [86, 89, 7.8, 63, 8, 0.4],
    [87, 117, 1.2, 76.5, 3.5, 0.5],
    [88, 101, 2.7, 53.75, 5, 0.5],
    [88, 101, 3.0, 62.5, 4, 0.25],
    [88, 113.2, 2.9, 68.6, 4, 0.5],
    [88, 113.8, 6.8, 59.4, 4, 0.5],
    [88, 113.2, 10.3, 68.6, 4, 0.5],
    [89, 90, 3.6, 38.6, 6, 0.2],
    [89, 90, 2.6, 34.6, 6, 0.15],
    [90, 101, 11, 66, 6, 0.5],
  ];

  it('31 lamps in groups 80-90, every one on (no light left off), counts [3, 1, 1, 1, 8, 7, 1, 1, 5, 2, 1]', () => {
    expect(lamps).toHaveLength(31);
    for (const l of lamps) expect(l.on, `group ${l.group} at (${l.x}, ${l.z})`).toBe(true);
    expect([...new Set(lamps.map((l) => l.group))].sort((p, q) => p - q)).toEqual([80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90]);
    expect([80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90].map((g) => lamps.filter((l) => l.group === g).length)).toEqual([3, 1, 1, 1, 8, 7, 1, 1, 5, 2, 1]);
    expect(readFileSync(new URL('../../src/world/maps/tallowWharfW3.ts', import.meta.url), 'utf8')).not.toContain('on: false');
  });

  it('each lamp\'s position, r and i are LIGHT.md section 4\'s (the registry holds the reach, lampReach(r))', () => {
    expect(TABLE).toHaveLength(31);
    for (const [g, x, y, z, r, i] of TABLE) {
      const l = lamps.find((q) => q.group === g && Math.abs(q.x - x) < 1e-6 && Math.abs(q.y - y) < 1e-6 && Math.abs(q.z - z) < 1e-6);
      expect(l, `group ${g} at (${x}, ${y}, ${z})`).toBeDefined();
      expect(l!.radius, `r of ${g} at (${x}, ${z})`).toBeCloseTo(lampReach(r), 9);
      expect(l!.intensity, `i of ${g} at (${x}, ${z})`).toBeCloseTo(i, 9);
    }
    // the flood is the one cone lamp (aimed west-south-west and down)
    const cones = lamps.filter((l) => l.cone);
    expect(cones).toHaveLength(1);
    expect(cones[0]!.group).toBe(80);
    expect(cones[0]!.cone!.dx).toBeLessThan(-0.5);
    expect(cones[0]!.cone!.dy).toBeLessThan(0);
  });

  it('switched groups are exactly 80-85 and 87; 86, 88, 89 and 90 have no switch', () => {
    expect(W3.switches.map((s) => s.group).sort((p, q) => p - q)).toEqual([80, 81, 82, 83, 84, 85, 87]);
    for (const g of [86, 88, 89, 90]) expect(W3.switches.some((s) => s.group === g), `no switch on ${g}`).toBe(false);
    for (const s of W3.switches) expect(group(s.group).length, `switch group ${s.group}`).toBeGreaterThan(0);
  });

  it('86 and 90 are neither destructible nor electric; the passage bulkhead (101, 2.7, 53.75) is not destructible; every other lamp is destructible and electric', () => {
    for (const l of lamps) {
      const passage = l.group === 88 && l.x === 101 && l.y === 2.7;
      const own = l.group === 86 || l.group === 90;
      expect(l.destructible, `destructible, group ${l.group} at (${l.x}, ${l.y}, ${l.z})`).toBe(!(passage || own));
      expect(l.electric, `electric, group ${l.group} at (${l.x}, ${l.y}, ${l.z})`).toBe(!own);
    }
  });

  it('colours: WARM for 81, 82, 83, 87 and the copying-desk lamp; the lantern keeps the moon colour; the rest the kit white', () => {
    const WARM = [1, 0.82, 0.55];
    const white = lamps.find((l) => l.group === 84)!.color;
    for (const l of lamps) {
      const warm = [81, 82, 83, 87].includes(l.group) || (l.group === 85 && l.y === 1.2);
      if (warm) expect(l.color, `group ${l.group}`).toEqual(WARM);
      else if (l.group === 86) expect(l.color).toEqual([0.7, 0.8, 1]);
      else expect(l.color, `group ${l.group} at (${l.x}, ${l.y})`).toEqual(white);
    }
  });
});

describe('W3: switches and conduits (LIGHT.md rules 5-6)', () => {
  const { b } = builtWharf();
  const lamps = b.lights.lights.filter((l) => inBox(l.x, l.z));
  const sw = (g: number) => W3.switches.find((s) => s.group === g)!;
  const plan = (s: { pos: { x: number; z: number } }, x: number, z: number): number => hyp2(s.pos.x - x, s.pos.z - z);

  it('each room switch is within 1.5 m (plan) of the nearer jamb of its space\'s door, on floor 0; the desk lamps switch at the lamp (1.0 m)', () => {
    const near = (g: number, jambs: readonly [number, number][]): number => Math.min(...jambs.map(([x, z]) => plan(sw(g), x, z)));
    expect(near(80, [[116.4, 52], [117.6, 52]]), 'lodge inner door').toBeLessThanOrEqual(1.5);
    expect(near(81, [[114, 47.4], [114, 48.6]]), 'lodge yard door').toBeLessThanOrEqual(1.5);
    expect(near(84, [[106, 66.5], [106, 69.5]]), 'front-hall opening').toBeLessThanOrEqual(1.5);
    expect(near(85, [[96, 67], [96, 69]]), 'double doors').toBeLessThanOrEqual(1.5);
    expect(near(87, [[115.9, 74], [117.1, 74]]), "partners' office door").toBeLessThanOrEqual(1.5);
    for (const s of W3.switches) expect(s.pos.y, `group ${s.group} floor`).toBe(0);
    const lampOf = (g: number): LightDef => lamps.find((l) => l.group === g)!;
    expect(plan(sw(82), lampOf(82).x, lampOf(82).z)).toBeLessThanOrEqual(1.0);
    expect(plan(sw(83), lampOf(83).x, lampOf(83).z)).toBeLessThanOrEqual(1.0);
  });

  it('conduits: one run per lamp of 80, 81, 84 and 85; each starts at a switch of its group at y 1.2, ends within 0.3 m of a lamp, every leg axis-aligned; none for 82, 83, 87', () => {
    expect([...new Set(W3_CONDUITS.map((c) => c.group))].sort((p, q) => p - q)).toEqual([80, 81, 84, 85]);
    for (const g of [80, 81, 84, 85]) {
      const runs = W3_CONDUITS.filter((c) => c.group === g);
      const gl = lamps.filter((l) => l.group === g);
      expect(runs.length, `runs of ${g}`).toBe(gl.length);
      for (const r of runs) {
        const [x0, y0, z0] = r.pts[0]!;
        const s = W3.switches.filter((q) => q.group === g).find((q) => hyp2(q.pos.x - x0, q.pos.z - z0) <= 0.3);
        expect(s, `run of ${g} starts at a switch`).toBeDefined();
        expect(y0, `run of ${g} starts at 1.2 over the switch's floor`).toBeCloseTo(s!.pos.y + 1.2, 6);
        for (let i = 0; i + 1 < r.pts.length; i++) {
          const d = [0, 1, 2].filter((k) => Math.abs(r.pts[i + 1]![k]! - r.pts[i]![k]!) > 1e-9).length;
          expect(d, `a leg of ${g} is axis-aligned`).toBeLessThanOrEqual(1);
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
    for (const g of [82, 83, 87]) expect(W3_CONDUITS.some((c) => c.group === g)).toBe(false);
  });

  it('the conduits are built: visual-only 0.05 boxes in #4f5459', () => {
    const cond = b.boxes.filter((p) => p.color === '#4f5459');
    expect(cond.length).toBeGreaterThan(50);
    for (const p of cond) {
      expect(p.collide).toBe(false);
      expect(Math.min(...p.s)).toBeCloseTo(0.05, 6);
    }
  });
});

describe('W3: levels at the check points (LIGHT.md section 4)', () => {
  const { b } = builtWharf();
  const lamps = b.lights.lights.filter((l) => inBox(l.x, l.z));
  const of = (...g: number[]): LightDef[] => lamps.filter((l) => g.includes(l.group));
  const rows: { name: string; g: number[]; amb: number; at: [number, number, number]; ok: (v: number) => boolean; want: string }[] = [
    { name: 'yard centre', g: [80], amb: 0.244, at: [107, 0, 45], ok: (v) => v >= 0.7, want: '>= 0.70' },
    { name: 'yard wall line', g: [80], amb: 0.244, at: [106.6, 0, 51.1], ok: (v) => v <= 0.3, want: '<= 0.30' },
    { name: 'east wing W strip', g: [82, 83, 84], amb: 0.14, at: [109, 0, 62.5], ok: (v) => v >= 0.65, want: '>= 0.65' },
    { name: 'east wing E strip', g: [82, 83, 84], amb: 0.14, at: [117.5, 0, 62.5], ok: (v) => v >= 0.65, want: '>= 0.65' },
    { name: 'west wing NW', g: [85, 86], amb: 0.14, at: [83, 0, 72], ok: (v) => v >= 0.65, want: '>= 0.65' },
    { name: 'passage centre', g: [88], amb: 0.14, at: [101, 0, 53.75], ok: (v) => v >= 0.79, want: '>= 0.79' },
    { name: 'chute boost spot', g: [88], amb: 0.14, at: [97.1, 0, 53.2], ok: (v) => v <= 0.28, want: '<= 0.28' },
    { name: 'coal yard centre', g: [89], amb: 0.244, at: [90, 0, 46], ok: (v) => v <= 0.3, want: '<= 0.30' },
    { name: 'roof corner bay', g: [], amb: 0.244, at: [84, 8.4, 66], ok: (v) => v <= 0.28, want: '<= 0.28' },
  ];

  for (const r of rows)
    it(`${r.name} (${r.at.join(', ')}) reads ${r.want} over groups ${r.g.join(', ') || 'none'}`, () => {
      const v = levelAt(of(...r.g), r.amb, r.at[0], r.at[1], r.at[2]);
      console.info(`W3 level ${r.name}: ${v.toFixed(3)}`);
      expect(r.ok(v), `${r.name} ${v}`).toBe(true);
    });

  it('the flood and the head lamp are mounted (VISION rule 2): the flood hangs under the lodge eaves on its west wall face, the head lamp on a collide noLedge post on the parapet', () => {
    const solid = solidOf(b);
    const flood = of(80).find((l) => l.cone)!;
    expect(Math.abs(flood.x - 113.85), 'flood within 0.35 m of the lodge west wall face').toBeLessThanOrEqual(0.35);
    expect(flood.y, 'under the wall top').toBeLessThan(3.0);
    // the lodge's west wall (x 114, 0.3 thick) tops at 3.0 over the flood's span
    expect(solid.some((p) => Math.abs(p.c[0] - 114) < 1e-6 && Math.abs(p.s[0] - 0.3) < 1e-6 && Math.abs(top(p) - 3.0) < 1e-6 && flood.z > p.c[2] - p.s[2] / 2 && flood.z < p.c[2] + p.s[2] / 2)).toBe(true);
    const head = of(80).find((l) => l.y === 10.0)!;
    const post = b.boxes.find((p) => p.collide && p.noLedge && Math.abs(bottom(p) - 9.5) < 1e-6 && Math.abs(p.c[0] - 109.36) < 1e-6 && Math.abs(p.s[0] - 0.12) < 1e-6);
    expect(post, 'the lamp post').toBeDefined();
    // it stands on the parapet (top 9.5) and is no standable top (0.12 m square)
    expect(solid.some((p) => Math.abs(top(p) - 9.5) < 1e-6 && Math.abs(post!.c[0] - p.c[0]) < p.s[0] / 2 && Math.abs(post!.c[2] - p.c[2]) < p.s[2] / 2)).toBe(true);
    expect(Math.min(post!.s[0], post!.s[2])).toBeLessThan(0.38);
    expect(distRect(head.x, head.z, footprint(post!)), 'head lamp within 0.4 m of the post').toBeLessThanOrEqual(0.4);
    expect(head.y).toBeGreaterThan(top(post!) - 0.2);
  });

  it('O20: the crane\'s red lamp (88, 14, 5) is seen from a standing eye (90, 10.0, 66) on the roof: no collide piece on the line, over the coal-yard drop guard by at least 0.25 m', () => {
    const solid = solidOf(b);
    const eye = [90, 10.0, 66] as const;
    const lampPt = [88, 14, 5] as const;
    expect(segmentBlock(solid, eye, lampPt, 0.4)).toBeNull();
    const t = (66 - 52) / (66 - 5);
    const yAtGuard = eye[1] + (lampPt[1] - eye[1]) * t;
    const guard = Math.max(...solid.filter((p) => Math.abs(p.c[2] - 52) < 0.2 && p.s[2] < 0.2 && top(p) > 10 && Math.abs(90 - p.c[0]) < p.s[0] / 2).map(top));
    console.info(`W3 crane line clearance over the drop guard: ${(yAtGuard - guard).toFixed(3)} (guard top ${guard})`);
    expect(guard).toBeCloseTo(10.6, 6);
    expect(yAtGuard - guard).toBeGreaterThanOrEqual(0.25);
  });
});

describe('W3: the fire escape (moved east, D0 TKL default)', () => {
  const { b } = builtWharf();
  const solid = solidOf(b);

  it('the head landing is 8.4, the half landing 4.2, the foot 0; the roof reaches the foot and the gate approach with every bolt shut', () => {
    expect(downHit(solid, 108.65, 8.5, 51.2, 0)).toBeCloseTo(8.4, 6);
    expect(downHit(solid, 102.55, 5, 50.4, 0)).toBeCloseTo(4.2, 6);
    expect(downHit(solid, 110.6, 1, 49.75, -1)).toBeCloseTo(0, 6);
    const { nav, restore } = soloNav(b, 4, W3.navSeeds, ALL_SHUT);
    try {
      expect(nav.findPath([108.65, 51.2], [110.6, 49.75], 1e6, 8.4, 0)).not.toBeNull();
      expect(nav.findPath([108.65, 51.2], [112, 51.2], 1e6, 8.4, 0)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('the foot is under 3 m (plan) from the east gate centre', () => {
    const foot = W3.debugPoints.find((d) => d.id === 'w3-fire-escape-foot')!.pos;
    const d = hyp2(foot.x - W3.doors['w3-east-gate']![0], foot.z - W3.doors['w3-east-gate']![2]);
    console.info(`W3 fire escape foot to the gate centre: ${d.toFixed(3)} m plan`);
    expect(d).toBeLessThan(3);
    expect(foot.x).toBeCloseTo(110.6, 6);
    expect(foot.z).toBeCloseTo(49.75, 6);
    const head = W3.debugPoints.find((d2) => d2.id === 'w3-fire-escape-head')!.pos;
    expect([head.x, head.y, head.z]).toEqual([108.65, 8.4, 51.2]);
  });
});

describe('W3: the C5 landing side (the W3 half; the cross-gap check is G2\'s)', () => {
  const { b } = builtWharf();
  const solid = solidOf(b);

  it('the corner bay is 8.4 across x 82.1-86.4, z 64.6-67.4', () => {
    for (const x of [82.1, 82.5, 84, 86.4]) for (const z of [64.6, 66, 67.4]) expect(downHit(solid, x, 9, z, 0), `(${x}, ${z})`).toBeCloseTo(8.4, 6);
  });

  it('no ledge near the stage edge (x 82, z 64.5-67.5, within 0.6 m, any height under 12); every collide piece reaching into the bay above 8.0 is noLedge', () => {
    const near = anchorsOf(b).ledges.filter((l) => l.top < 12 && [l.a, l.b].some((q) => hyp2(q.x - 82, Math.max(64.5 - q.z, 0, q.z - 67.5)) <= 0.6));
    expect(near.map((l) => `(${l.a.x}, ${l.a.z}) -> (${l.b.x}, ${l.b.z}) top ${l.top}`)).toEqual([]);
    const reach = b.boxes.filter((p) => p.collide && top(p) > 8.0 && p.c[0] + p.s[0] / 2 > 81.7 && p.c[0] - p.s[0] / 2 < 86.5 && p.c[2] + p.s[2] / 2 > 64.2 && p.c[2] - p.s[2] / 2 < 67.8);
    expect(reach.length).toBeGreaterThan(0);
    expect(reach.filter((p) => !p.noLedge)).toHaveLength(0);
  });

  it('the bridge door frame: collide noLedge pieces on x 82.0-82.3 cover z 68.3-70.1 from 8.4 to 11.0 except the door gap z 68.6-69.8 under 10.5', () => {
    for (let z = 68.325; z < 70.1; z += 0.05) {
      for (let y = 8.45; y < 11.0; y += 0.1) {
        const inGap = z > 68.6 + 0.03 && z < 69.8 - 0.03 && y < 10.5;
        const nearEdge = Math.abs(z - 68.6) < 0.03 || Math.abs(z - 69.8) < 0.03 || Math.abs(y - 10.5) < 0.06;
        const p = b.boxes.find((q) => q.collide && Math.abs(82.15 - q.c[0]) < q.s[0] / 2 && Math.abs(y - q.c[1]) < q.s[1] / 2 && Math.abs(z - q.c[2]) < q.s[2] / 2);
        if (nearEdge && (!p || inGap)) continue;
        if (inGap) expect(p, `gap (${z.toFixed(3)}, ${y.toFixed(2)})`).toBeUndefined();
        else {
          expect(p, `frame (${z.toFixed(3)}, ${y.toFixed(2)})`).toBeDefined();
          expect(p!.noLedge).toBe(true);
        }
      }
    }
  });
});

describe('W3: cover, hide spots, desks and the medkit', () => {
  const { b } = builtWharf();
  const solid = solidOf(b);

  /** The cover boxes: [x0, z0, x1, z1, y0, y1]. */
  const COVER: readonly (readonly [number, number, number, number, number, number])[] = [
    [104.0, 42.6, 105.4, 43.6, 0, 1.1],
    [119.2, 50.0, 120, 51.4, 0, 2.0],
    [106, 59.2, 106.7, 60.8, 0, 2.4],
    [106, 61.8, 106.7, 63.4, 0, 2.4],
    [119.3, 59.2, 120, 60.8, 0, 2.4],
    [92.4, 56.5, 93.0, 62.5, 0, 2.2],
    [94.0, 56.5, 94.6, 62.5, 0, 2.2],
    [91.5, 56.6, 92.3, 57.4, 0, 0.9],
    [102.6, 70.8, 103.4, 71.6, 0, 1.1],
  ];

  it('nine hide spots; every takedown spot has one within 8 m (plan) on its floor', () => {
    expect(W3.hideSpots).toHaveLength(9);
    for (const [i, g] of W3G.entries()) {
      const [tx, tz] = g.takedownSpot;
      const floor = g.y ?? 0;
      const d = Math.min(...W3.hideSpots.filter((h) => Math.abs(h.pos.y - floor) < 1).map((h) => hyp2(h.pos.x - tx, h.pos.z - tz)));
      console.info(`W3 guard ${i} takedown spot (${tx}, ${tz}): nearest hide spot ${d.toFixed(2)} m`);
      expect(d, `guard ${i}`).toBeLessThanOrEqual(8);
    }
  });

  it('each cover box exists, collide and noLedge', () => {
    for (const [x0, z0, x1, z1, y0, y1] of COVER) {
      const p = b.boxes.find((q) => q.collide && Math.abs(q.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(q.c[1] - (y0 + y1) / 2) < 1e-6 && Math.abs(q.c[2] - (z0 + z1) / 2) < 1e-6 && Math.abs(q.s[0] - (x1 - x0)) < 1e-6 && Math.abs(q.s[1] - (y1 - y0)) < 1e-6 && Math.abs(q.s[2] - (z1 - z0)) < 1e-6);
      expect(p, `cover (${x0}, ${z0})`).toBeDefined();
      expect(p!.noLedge, `cover (${x0}, ${z0}) noLedge`).toBe(true);
    }
    // each hide spot is beside a cover box (within 1.0 m of its footprint) except the two old ones
    for (const h of W3.hideSpots.slice(2)) expect(Math.min(...COVER.map((c) => distRect(h.pos.x, h.pos.z, [c[0], c[1], c[2], c[3]]))), `hide spot (${h.pos.x}, ${h.pos.z})`).toBeLessThanOrEqual(1.0);
  });

  it('desks: W3_DESKS is LIGHT.md rule 7\'s list, built visual-only with top 0.75', () => {
    expect(W3_DESKS).toEqual([
      [109.4, 57.9, 110.6, 58.5, 0],
      [115.4, 57.9, 116.6, 58.5, 0],
      [89.4, 55.9, 90.6, 56.5, 0],
      [116.4, 76.2, 117.6, 76.8, 0],
    ]);
    for (const [x0, z0, x1, z1, fy] of W3_DESKS) {
      const p = b.boxes.find((q) => !q.collide && Math.abs(q.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(q.c[2] - (z0 + z1) / 2) < 1e-6 && Math.abs(q.s[0] - (x1 - x0)) < 1e-6 && Math.abs(q.s[2] - (z1 - z0)) < 1e-6);
      expect(p, `desk (${x0}, ${z0})`).toBeDefined();
      expect(top(p!)).toBeCloseTo(fy + 0.75, 6);
      expect(bottom(p!)).toBeCloseTo(fy, 6);
    }
    // each desk lamp stands over a desk (within its extents, plan)
    for (const [x, z] of [[110, 58], [116, 58], [90, 56], [117, 76.5]] as const) expect(W3_DESKS.some((d) => x >= d[0] && x <= d[2] && z >= d[1] - 0.6 && z <= d[3] + 0.6), `lamp (${x}, ${z})`).toBe(true);
  });

  it('desks: none within 1.2 m of a door gap\'s face (across its width, either side); none within 0.3 m of a guard post or route leg on its floor', () => {
    const FACE = 0.3; // the thickest wall's half (OUTER 0.6)
    const bad: string[] = [];
    for (const d of b.anchors.doors) {
      if (d.hinge.x < BX0 || d.hinge.x > BX1 || d.hinge.z < BZ0 || d.hinge.z > BZ1) continue;
      const alongX = Math.abs(Math.sin(d.yaw)) > 0.5;
      // the gap: along x at z = hinge.z from hinge.x to + width (a wall along x), else along z at x = hinge.x
      const gap = alongX ? [d.hinge.x, d.hinge.z - FACE - 1.2, d.hinge.x + d.width, d.hinge.z + FACE + 1.2] : [d.hinge.x - FACE - 1.2, d.hinge.z, d.hinge.x + FACE + 1.2, d.hinge.z + d.width];
      for (const w of W3_DESKS) if (Math.abs(w[4] - d.hinge.y) < 1 && gapRects([w[0], w[1], w[2], w[3]], gap) <= 0) bad.push(`desk (${w[0]}, ${w[1]}) by door (${d.hinge.x}, ${d.hinge.z})`);
    }
    expect(bad).toEqual([]);
    for (const w of W3_DESKS) {
      for (const [i, g] of W3G.entries()) {
        if (Math.abs((g.y ?? 0) - w[4]) >= 1) continue;
        const pts: [number, number][] = g.route && g.route.length > 0 ? g.route : [[g.x, g.z]];
        expect(distRect(g.x, g.z, w), `guard ${i} post to desk (${w[0]}, ${w[1]})`).toBeGreaterThanOrEqual(0.3);
        for (let k = 0; k < pts.length; k++) {
          const a = pts[k]!;
          const e = pts[(k + 1) % pts.length]!;
          // a closed loop for 3+ points; a back-and-forth for 2 (one leg)
          if (pts.length === 2 && k === 1) break;
          expect(distSegRect(a, e, w), `guard ${i} leg ${k} to desk (${w[0]}, ${w[1]})`).toBeGreaterThanOrEqual(0.3);
        }
      }
    }
  });

  it('medkit: one, in the bulkhead core on its top landing, within 8 m of the W3 restart point, over 4 m above every guard post and route point', () => {
    expect(W3.medkits).toHaveLength(1);
    const m = W3.medkits![0]!;
    expect(m.pos.x > 112.4 && m.pos.x < 115.2 && m.pos.z > 58.6 && m.pos.z < 69.4).toBe(true);
    expect(downHit(solid, m.pos.x, m.pos.y + 0.6, m.pos.z, 0)).toBeCloseTo(8.4, 6);
    expect(m.pos.y).toBeCloseTo(8.4, 6);
    const r = W3.debugPoints.find((d) => d.id === 'w3-bulkhead-head')!.pos;
    expect(Math.hypot(m.pos.x - r.x, m.pos.y - r.y, m.pos.z - r.z)).toBeLessThanOrEqual(8);
    const low = guardPoints().filter((p) => m.pos.y - p.y <= 4);
    expect(low.map((p) => p.who)).toEqual([]);
    expect(Math.abs(m.yaw)).toBeCloseTo(Math.PI, 6);
  });
});

describe('W3: vantages (G157 6)', () => {
  const { b } = builtWharf();
  const solid = solidOf(b);
  const lamps = b.lights.lights.filter((l) => inBox(l.x, l.z));
  const ids = ['yard-a', 'yard-b', 'east-a', 'east-b', 'west-a', 'west-b'] as const;
  const point = (id: string) => W3.debugPoints.find((d) => d.id === `w3-vantage-${id}`)!.pos;
  const amb = (id: string): number => (id.startsWith('yard') ? 0.244 : 0.14);
  /** Eye (floor + 1.6) -> target (a standing chest over the encounter's floor). */
  const SIGHT: Record<string, readonly [number, number, number]> = {
    'yard-a': [107, 1.0, 45],
    'yard-b': [107, 1.0, 45],
    'east-a': [107, 1.0, 66],
    'east-b': [108, 1.0, 60],
    'west-a': [89, 1.0, 53.5],
    'west-b': [89, 1.0, 53.5],
  };

  it('six points, two per encounter, each on a floor, each pair at least 1.0 m apart', () => {
    for (const id of ids) {
      const p = point(id);
      expect(Math.abs(downHit(solid, p.x, p.y + 0.5, p.z, p.y - 0.5) - p.y), `${id} floor`).toBeLessThan(0.01);
    }
    for (const [a, c] of [['yard-a', 'yard-b'], ['east-a', 'east-b'], ['west-a', 'west-b']] as const) expect(hyp2(point(a).x - point(c).x, point(a).z - point(c).z), `${a} / ${c}`).toBeGreaterThanOrEqual(1.0);
  });

  it('levelAt (all W3 lamps) at most 0.45; no W3 guard post or route point within 6 m (plan) on the same floor band (|dy| < 2)', () => {
    for (const id of ids) {
      const p = point(id);
      const v = levelAt(lamps, amb(id), p.x, p.y, p.z);
      console.info(`W3 vantage ${id} level: ${v.toFixed(3)}`);
      expect(v, id).toBeLessThanOrEqual(0.45);
      const near = guardPoints().filter((g) => Math.abs(g.y - p.y) < 2 && hyp2(g.x - p.x, g.z - p.z) < 6);
      expect(near.map((g) => g.who), id).toEqual([]);
    }
  });

  it('sightlines: from the eye (floor + 1.6) to the encounter, sampled every 0.05 m and stopped 0.3 m short, no collide piece', () => {
    for (const id of ids) {
      const p = point(id);
      expect(segmentBlock(solid, [p.x, p.y + 1.6, p.z], SIGHT[id]!, 0.3), id).toBeNull();
    }
  });
});
