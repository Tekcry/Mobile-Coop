/**
 * Tallow Wharf GB3: W3, the counting house (`tallowWharfW3.ts`). Every graph space has a room of the graph's size (the chute and the
 * cartway listed), the C7 chute boost lip is in the co-op band with room and no solo jump onto it and no other lip, the lantern drop
 * lands on the iron gallery, no solo route runs from the roof to the cartway with the bolted doors shut (and the controls show the
 * routes the shut doors cut), the roof's coal-yard edge is a drop guard, the key posts are 21 m apart behind solid mass, and the
 * lamp circuits are 80-90.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEAM, WALL_JUMP, MOVEMENT } from '../../src/config/movement';
import type { Ledge } from '../../src/world/anchors';
import type { BoxPiece } from '../../src/world/levelBuilder';
import { W3, W3_KEY_POSTS } from '../../src/world/maps/tallowWharfW3';
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

  it('the roof reaches the east wing by the bulkhead stair and the east yard by the fire escape', () => {
    const { nav, restore } = soloNav(b, 4, W3.navSeeds, ALL_SHUT);
    try {
      expect(nav.findPath([111, 68], [110, 62], 1e6, 8.4, 0)).not.toBeNull();
      expect(nav.findPath([107, 51.2], [108, 45], 1e6, 8.4, 0)).not.toBeNull();
      // the east yard reaches the east wing through the lodge (unlocked doors), not through the shut gate
      expect(nav.findPath([108, 45], [110, 62], 1e6, 0, 0)).not.toBeNull();
    } finally {
      restore();
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
    // the mantle way round: the fire escape's half landing (top 4.2, x 100.2-101.5) is over the mantle under the dividing wall x 100
    let wallTop = Infinity;
    for (let z = 49.2; z < 51.7; z += 0.1) wallTop = Math.min(wallTop, Math.max(...solid.filter((p) => Math.abs(100 - p.c[0]) < p.s[0] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2 && bottom(p) < 4.2).map(top)));
    expect(downHit(solid, 100.8, 5, 50.4, 3)).toBeCloseTo(4.2, 6);
    expect(wallTop - 4.2).toBeGreaterThan(MANTLE);
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
    expect(W3.hideSpots).toHaveLength(2);
    expect(W3.debugPoints.map((d) => d.id)).toEqual(['w3-bulkhead-head', 'w3-corner-bay', 'w3-chute-spot', 'w3-coal-yard', 'w3-cartway']);
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

describe('W3: lights', () => {
  const { b } = builtWharf();
  const lamps = b.lights.lights.filter((l) => inBox(l.x, l.z));

  it('every switch\'s group has a lamp; groups 86, 88, 89 and 90 have no switch; every W3 lamp is in 80-90', () => {
    const groups = new Set(lamps.map((l) => l.group));
    for (const s of W3.switches) expect(groups.has(s.group), `switch group ${s.group}`).toBe(true);
    for (const g of [86, 88, 89, 90]) {
      expect(groups.has(g), `lamp group ${g}`).toBe(true);
      expect(W3.switches.some((s) => s.group === g), `no switch on ${g}`).toBe(false);
    }
    for (const l of lamps) expect(l.group, `lamp at (${l.x}, ${l.z})`).toBeGreaterThanOrEqual(80);
    for (const l of lamps) expect(l.group).toBeLessThanOrEqual(90);
    expect([...groups].sort()).toEqual([80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90]);
    // the switched groups are 80-85 and 87 (the lodge lamp, 81, has a switch too)
    expect(W3.switches.map((s) => s.group).sort()).toEqual([80, 81, 82, 83, 84, 85, 87]);
  });

  it('group 81 (the lodge lamp) starts off; every other lamp starts on', () => {
    for (const l of lamps) expect(l.on, `group ${l.group}`).toBe(l.group !== 81);
  });

  it('the lantern moonlight (86), the passage bulkhead (88) and the turret clock (90) cannot be shot out; 86 and 90 are not electric either', () => {
    for (const l of lamps.filter((q) => [86, 88, 90].includes(q.group))) expect(l.destructible, `group ${l.group}`).toBe(false);
    for (const l of lamps.filter((q) => [86, 90].includes(q.group))) expect(l.electric, `group ${l.group}`).toBe(false);
    expect(lamps.filter((l) => l.group === 84)).toHaveLength(2);
    expect(lamps.filter((l) => l.group === 89)).toHaveLength(2);
  });
});
