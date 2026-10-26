/**
 * Tallow Wharf GB0: the shell (`tallowWharf` MapDef, the kit, the stubs) and the shared helpers' own cases. The map is
 * registered but not listed; its bounds and section boxes are the graph's; the shell's masses and lane clip no graph space;
 * every stub section has an entry and an exit inside its box; the kit's duct, stand-in and screen build what they say; the
 * throw / pull / rope replicas pass a level layout and fail a bad one.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { MOVEMENT } from '../../src/config/movement';
import { getMap } from '../../src/world/maps';
import { isListedMap } from '../../src/world/maps/listed';
import { buildShell, tallowWharf } from '../../src/world/maps/tallowWharf';
import { campusOps } from '../../src/world/maps/campusOps';
import { W1 } from '../../src/world/maps/tallowWharfW1';
import { W2 } from '../../src/world/maps/tallowWharfW2';
import { W3 } from '../../src/world/maps/tallowWharfW3';
import { W4 } from '../../src/world/maps/tallowWharfW4';
import { duct, DUCT, SECTION_BOX, SECTION_IDS, STANDIN_TAGS, standIn, screen, WHARF_BOUNDS } from '../../src/world/maps/tallowWharfKit';
import { builtWharf, downHit, GRAPH, linksOf, pullCheck, ropeCheck, solidOf, space, spacesIn, throwCheck } from './helpers';

const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;

describe('tallowWharf: the map', () => {
  it('is registered, sector only, not listed, with missions and sectors defined', () => {
    expect(getMap('tallowWharf').id).toBe('tallowWharf');
    expect(getMap('tallowWharf')).toBe(tallowWharf);
    expect(isListedMap('tallowWharf')).toBe(false);
    expect(tallowWharf.modes).toEqual(['sector']);
    expect(tallowWharf.missions).toBeDefined();
    expect(tallowWharf.sectors).toBeDefined();
    expect(tallowWharf.theme.faction).toBe('maritime');
    expect(tallowWharf.theme.fogEnd).toBe(120);
    expect(tallowWharf.navLayers).toBe(4);
    expect(tallowWharf.detail).toBe(false);
  });

  it('(A24, M2) throwSites lists exactly two, the pawn and lane throws (5.8 m along runner -> thrower); each build returns a new array', () => {
    const sites = builtWharf().layout.throwSites;
    expect(sites).toEqual([
      { x: 51.2, z: 67.2, dx: 0, dz: 1, dist: 5.8 },
      { x: 76.7, z: 66, dx: 1, dz: 0, dist: 5.8 },
    ]);
    const a = tallowWharf.build(new LevelBuilder(), 0).throwSites;
    const b = tallowWharf.build(new LevelBuilder(), 0).throwSites;
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('WHARF_BOUNDS, SECTION_BOX and SECTION_IDS are the graph\'s', () => {
    const [x0, z0, x1, z1] = GRAPH.meta.bounds;
    expect([WHARF_BOUNDS.minX, WHARF_BOUNDS.minZ, WHARF_BOUNDS.maxX, WHARF_BOUNDS.maxZ]).toEqual([x0, z0, x1, z1]);
    for (const id of SECTION_IDS) expect([...SECTION_BOX[id]], id).toEqual(GRAPH.meta.section_info[id]!.box);
    expect([...SECTION_IDS]).toEqual(GRAPH.meta.sections);
  });

  it('builds without throwing; the perimeter spans 0-120 x 0-80; the first spawn is on the canal steps', () => {
    const { b, layout } = builtWharf();
    expect(b.bounds).toEqual({ minX: 0, maxX: 120, minZ: 0, maxZ: 80 });
    const shell = new LevelBuilder();
    buildShell(shell);
    const wallsOf = shell.boxes.slice(1, 5);
    expect(Math.min(...wallsOf.map((p) => p.c[0] - p.s[0] / 2))).toBeLessThanOrEqual(-1 + 1e-9);
    expect(Math.max(...wallsOf.map((p) => p.c[0] + p.s[0] / 2))).toBeGreaterThanOrEqual(121 - 1e-9);
    expect(Math.min(...wallsOf.map((p) => p.c[2] - p.s[2] / 2))).toBeLessThanOrEqual(-1 + 1e-9);
    expect(Math.max(...wallsOf.map((p) => p.c[2] + p.s[2] / 2))).toBeGreaterThanOrEqual(81 - 1e-9);
    // the inner faces sit on the bounds
    expect(wallsOf.map((p) => [p.c[0] - p.s[0] / 2, p.c[0] + p.s[0] / 2, p.c[2] - p.s[2] / 2, p.c[2] + p.s[2] / 2]).some((r) => r[3] === 0)).toBe(true);
    expect(layout.playerSpawns).toHaveLength(2);
    const sp = layout.playerSpawns[0]!.pos;
    const [ax0, az0, ax1, az1] = space('w1-canal-steps').area[0]!;
    expect(sp.x > ax0 && sp.x < ax1 && sp.z > az0 && sp.z < az1).toBe(true);
    expect(layout.enemySpawns).toEqual([]);
    expect(layout.alarms).toEqual([]);
    expect(layout.pickups).toEqual([]);
  });

  it('the shell\'s masses, lane wall and canal barrier clip no graph space at a storey where it is', () => {
    const b = new LevelBuilder();
    buildShell(b);
    // 0 ground, 1-4 perimeter, 5 water (no collision); then the barrier, three masses and the lane wall
    expect(b.boxes[5]!.collide).toBe(false);
    const own = b.boxes.slice(6);
    expect(own).toHaveLength(5);
    expect(own.every((p) => p.collide && p.noLedge)).toBe(true);
    const bad: string[] = [];
    for (const p of own) {
      const px0 = p.c[0] - p.s[0] / 2;
      const px1 = p.c[0] + p.s[0] / 2;
      const pz0 = p.c[2] - p.s[2] / 2;
      const pz1 = p.c[2] + p.s[2] / 2;
      for (const s of GRAPH.spaces) {
        // a walker at the storey's feet height is inside a piece that spans it
        if (s.storey < bottom(p) - 1e-6 || s.storey >= top(p)) continue;
        for (const [x0, z0, x1, z1] of s.area) {
          const ox = Math.min(px1, x1) - Math.max(px0, x0);
          const oz = Math.min(pz1, z1) - Math.max(pz0, z0);
          if (ox > 1e-6 && oz > 1e-6) bad.push(`box (${p.c.join(', ')}) over ${s.id}`);
        }
      }
    }
    expect(bad).toEqual([]);
    // the lane's only box at z 48 stands on x 76-82
    const lane = own.filter((p) => Math.abs(p.c[2] - 48) < 0.2 && p.s[2] < 1);
    expect(lane).toHaveLength(1);
    expect(lane[0]!.c[0] - lane[0]!.s[0] / 2).toBeCloseTo(76, 9);
    expect(lane[0]!.c[0] + lane[0]!.s[0] / 2).toBeCloseTo(82, 9);
  });

  it('every graph space of a section lies inside that section\'s box', () => {
    for (const id of SECTION_IDS) {
      const [bx0, bz0, bx1, bz1] = SECTION_BOX[id];
      for (const s of spacesIn(id))
        for (const [x0, z0, x1, z1] of s.area) expect(x0 >= bx0 && z0 >= bz0 && x1 <= bx1 && z1 <= bz1, `${s.id} in ${id}`).toBe(true);
    }
  });
});

describe('tallowWharf: the night floor and the medkits (J8 G0)', () => {
  it('the theme\'s sun, ambient and light level are the campus\'s (the night floor sits in the ambient zone, not the theme)', () => {
    expect(tallowWharf.theme.sunIntensity).toBe(campusOps.theme.sunIntensity);
    expect(tallowWharf.theme.ambient).toBe(campusOps.theme.ambient);
    expect(tallowWharf.theme.lightLevel).toBe(campusOps.theme.lightLevel);
  });

  it('the map-wide standby fill reads 0.14 at every section box\'s centre and on the canal steps (a cut circuit reads dark)', () => {
    const { b, layout } = builtWharf();
    for (const id of SECTION_IDS) {
      const [x0, z0, x1, z1] = SECTION_BOX[id];
      expect(b.lights.zoneAt((x0 + x1) / 2, 1, (z0 + z1) / 2), id).toBe(0.14);
    }
    const sp = layout.playerSpawns[0]!.pos;
    expect(b.lights.zoneAt(sp.x, 1, sp.z)).toBe(0.14);
  });

  it('the layout\'s medkit walls are the sections\' medkits in section order', () => {
    expect(builtWharf().layout.medkitWalls).toEqual([W1, W2, W3, W4].flatMap((s) => s.medkits ?? []));
  });
});

describe('tallowWharf: the ladders', () => {
  it('every ladder tops out on a floor: within 0.05 of top.y at top + 0.4 along its facing (the climb\'s LADDER_TOPOUT_IN)', () => {
    const { b } = builtWharf();
    const solid = solidOf(b);
    const ladders = b.anchors.ladders;
    expect(ladders.length).toBeGreaterThanOrEqual(4);
    const bad: string[] = [];
    for (const l of ladders) {
      const x = l.top.x + Math.sin(l.facing) * 0.4;
      const z = l.top.z + Math.cos(l.facing) * 0.4;
      const f = downHit(solid, x, l.top.y + 1, z, l.top.y - 1);
      if (!(Math.abs(f - l.top.y) <= 0.05)) bad.push(`ladder (${l.base.x}, ${l.base.z}) top ${l.top.y}: floor ${f} at (${x.toFixed(2)}, ${z.toFixed(2)})`);
    }
    expect(bad).toEqual([]);
  });
});

describe('tallowWharf: the stub sections', () => {
  const stubs = [W1, W2, W3, W4];
  it('export their id, an entry and an exit inside their section box', () => {
    expect(stubs.map((s) => s.id)).toEqual([...SECTION_IDS]);
    for (const s of stubs) {
      const [x0, z0, x1, z1] = SECTION_BOX[s.id];
      for (const e of [s.entry, s.exit]) expect(e[0] >= x0 && e[0] <= x1 && e[2] >= z0 && e[2] <= z1, `${s.id} ${e.join(',')}`).toBe(true);
    }
    expect(stubs.map((s) => [s.entry, s.exit])).toEqual([
      [[7, 0, 10], [38, 0, 60]],
      [[42, 0, 55], [60, 8.4, 66]],
      [[100, 8.4, 70], [90, 0, 36]],
      [[90, 0, 32], [90, -1, 3]],
    ]);
  });

  it('the sector data is the GB5 data: four sections starting on the canal steps, and the two missions (tests/tallowWharf/sectors.test.ts)', () => {
    expect(tallowWharf.sectors!.map((x) => x.id)).toEqual(['W1', 'W2', 'W3', 'W4']);
    expect(tallowWharf.sectors![0]!.start).toEqual({ x: 7, y: 0, z: 10, yaw: 0 });
    expect(tallowWharf.missions!.map((m) => m.id)).toEqual(['threeGreyCoats', 'twoKeyLedger']);
  });

  it('the graph has the links the sections build (a smoke read of the helper)', () => {
    expect(linksOf('coop_boost').length).toBeGreaterThan(0);
    expect(() => space('no-such-space')).toThrow();
  });
});

describe('the kit', () => {
  it('a duct with a turn leaves a 1.2 x 1.5 interior clear to a crouching body and closes its sides', () => {
    const b = new LevelBuilder();
    const pts: [number, number][] = [[10, 10], [14, 10], [14, 14], [18, 14]];
    duct(b, pts, 2);
    expect(b.boxes.every((p) => p.noLedge)).toBe(true);
    const solid = solidOf(b);
    const hit = (x: number, y: number, z: number, r = 0): boolean => solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 + r && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2 + r);
    // walk the centre line: a body (radius 0.5 across a 1.2 interior, crouched 1.15 high) fits all the way
    const blocked: string[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i]!;
      const [bx, bz] = pts[i + 1]!;
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1);
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n;
        const z = az + ((bz - az) * k) / n;
        for (let y = 2.1; y <= 2 + MOVEMENT.crouchHeight; y += 0.1) if (hit(x, y, z, 0.5)) blocked.push(`(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
      }
    }
    expect(blocked).toEqual([]);
    expect(DUCT.h).toBeGreaterThan(MOVEMENT.crouchHeight);
    // floor under it, lid over it, a wall on each side, closed on the turns' outsides
    expect(hit(12, 1.9, 10)).toBe(true);
    expect(hit(12, 2 + DUCT.h + 0.1, 10)).toBe(true);
    expect(hit(12, 2.7, 10.7)).toBe(true);
    expect(hit(12, 2.7, 9.3)).toBe(true);
    expect(hit(14.7, 2.7, 10.0)).toBe(true);
    expect(hit(13.3, 2.7, 14.0)).toBe(true);
    // the inside of the first turn is open (the way on), the ends are open
    expect(hit(13.9, 2.7, 10.9)).toBe(false);
    expect(hit(9.7, 2.7, 10)).toBe(false);
    expect(hit(18.3, 2.7, 14)).toBe(false);
    expect(() => duct(new LevelBuilder(), [[0, 0], [3, 3]], 0)).toThrow();
  });

  it('a stand-in fills the shutter opening, records its tag, and is a plain box', () => {
    const b = new LevelBuilder();
    const a = standIn(b, { id: 'c2', x: 20, y: 0, z: 50, yaw: 0, width: 3, height: 3 });
    const c = standIn(b, { id: 'c8', x: 90, y: 0, z: 20, yaw: Math.PI / 2, width: 3, height: 3 });
    const tags = STANDIN_TAGS.get(b)!;
    expect(tags.get(a)).toBe('shutter-standin:c2');
    expect(tags.get(c)).toBe('shutter-standin:c8');
    expect(b.boxes[a]!.s).toEqual([3, 3, 0.1]);
    expect(b.boxes[a]!.c).toEqual([20, 1.5, 50]);
    expect(b.boxes[c]!.s).toEqual([0.1, 3, 3]);
    expect(b.boxes[a]!.collide && b.boxes[a]!.noLedge).toBe(true);
    expect(solidOf(b)).toHaveLength(2);
  });

  it('a drop guard is a noLedge screen 2.2 high over the mantle, with no lip', () => {
    const b = new LevelBuilder();
    screen(b, { id: 'g', a: { x: 5, z: 5 }, b: { x: 5, z: 9 }, y: 8.4, h: 2.2 });
    const p = b.boxes[0]!;
    expect(p.s).toEqual([0.1, 2.2, 4]);
    expect(bottom(p)).toBeCloseTo(8.4, 9);
    expect(top(p)).toBeCloseTo(10.6, 9);
    expect(p.noLedge && p.collide).toBe(true);
  });
});

describe('the throw, pull and rope replicas', () => {
  /** Two level decks at 4.5 with a 2.5 m gap (x 4 -> 6.5). */
  const decks = (): LevelBuilder => {
    const b = new LevelBuilder();
    b.box(2, 4.25, 2, 4, 0.5, 8, '#777');
    b.box(8.25, 4.25, 2, 3.5, 0.5, 8, '#777');
    return b;
  };
  const throwOf = { id: 't', link: 'l', thrower: { x: 3.5, y: 4.5, z: 2 }, runner: { x: 1, y: 4.5, z: 2 }, stage: [0, 0, 4, 4] as [number, number, number, number] };

  it('a level 2.5 m gap throw lands, clears the arc and has room', () => {
    const r = throwCheck(solidOf(decks()), throwOf);
    expect(r.land.x).toBeCloseTo(6.7, 9);
    expect(r.ok).toBe(true);
    expect(r.floorY).toBeCloseTo(4.5, 9);
    expect(r.arcClear).toBe(true);
    expect(r.upClear).toBe(true);
    expect(r.head).toBeCloseTo(1.8, 9);
    expect(r.room).toBe('ok');
  });

  it('a throw into thin air has no floor; a low lid blocks the arc and the thrower\'s headroom', () => {
    const b = new LevelBuilder();
    b.box(2, 4.25, 2, 4, 0.5, 8, '#777');
    const air = throwCheck(solidOf(b), throwOf);
    expect(air.ok).toBe(false);
    expect(air.room).toBe('arc');
    const lidded = decks();
    lidded.box(5, 7.2, 2, 12, 0.4, 8, '#777');
    const r = throwCheck(solidOf(lidded), throwOf);
    expect(r.upClear).toBe(false);
    expect(r.arcClear).toBe(false);
  });

  it('a 4.5 m pull-up and rope from a deck edge pass; a 2 m one is a low lip', () => {
    const b = new LevelBuilder();
    b.box(2.5, 4.25, 2, 5, 0.5, 8, '#777');
    b.floor(10, 2, 20, 8, '#444', 0, 1);
    const solid = solidOf(b);
    const pull = { id: 'p', link: 'l', holder: { x: 4.4, y: 4.5, z: 2 }, yaw: Math.PI / 2, partner: { x: 5.3, y: 0, z: 2 } };
    const p = pullCheck(solid, pull);
    expect(p.band).toBe('ok');
    expect(p.hang).not.toBeNull();
    expect(p.ok).toBe(true);
    const rope = { id: 'r', link: 'l', holder: pull.holder, yaw: pull.yaw, foot: { x: 5.3, y: 0, z: 2 } };
    expect(ropeCheck(solid, rope).ok).toBe(true);
    expect(ropeCheck(solid, { ...rope, foot: { x: 5.3, y: 3, z: 2 } }).room).toBe('short');
    expect(pullCheck(solid, { ...pull, partner: { x: 5.3, y: 2.5, z: 2 } }).band).toBe('low');
    // a holder facing along the deck finds no drop in reach
    expect(pullCheck(solid, { ...pull, yaw: 0 }).hang).toBeNull();
  });
});
