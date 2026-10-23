/**
 * E2 glass (EW6, DEC G45; docs/sector-redesign/checks/e2-glass.md): a `LevelBuilder.glass` pane, clear or frosted, is out
 * of the canonical light shapes (lamp light passes it in the bake, so the picture, the meter and the guards read one
 * field), out of the voxels, cover and ledges, a body blocker with a fence panel's nav footprint, and its collision bits
 * say: bodies stop, bullets and the camera pass, frosted blocks guard sight, clear does not, hearing hears a wall.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, GLASS_THICK, type BoxPiece } from '../src/world/levelBuilder';
import { canonicalLightSet, canonicalLightShapes } from '../src/voxel/lightShapes';
import { buildCoverSegments } from '../src/cover/coverData';
import { generateLedges } from '../src/world/anchors';
import { detailPieces } from '../src/world/detailPass';
import { G, MASK } from '../src/physics/groups';
import { SightWorld } from '../src/game/sectorCheck';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField } from '../src/world/lightField';
import { losClear } from '../src/ai/perception';
import { runtimeNav } from './helpers/runtimeNav';

type Mid = 'clear' | 'frosted' | 'gap' | 'wall';

/** A 16 x 16 room floor, a 3 m wall at x 0 whose middle (z -2..2) is `mid`, a lamp at (-1.5, 2.6, 0). */
function room(mid: Mid): LevelBuilder {
  const b = new LevelBuilder();
  b.bounds = { minX: -8, maxX: 8, minZ: -8, maxZ: 8 };
  b.box(0, -0.25, 0, 16, 0.5, 16, '#777777');
  b.box(0, 1.5, -5, 0.2, 3, 6, '#888888');
  b.box(0, 1.5, 5, 0.2, 3, 6, '#888888');
  if (mid === 'clear' || mid === 'frosted') b.glass(0, -2, 0, 2, 3, 0, mid);
  if (mid === 'wall') b.box(0, 1.5, 0, 0.2, 3, 4, '#888888');
  b.light({ x: -1.5, y: 2.6, z: 0, radius: 10, intensity: 1 });
  return b;
}

/** The bake as `World.create` + `bakeLevelLight` make it (lamps, moon straight down, ambient 0.05), and its field. */
function field(b: LevelBuilder): { hash: string; f: LightField } {
  const set = canonicalLightSet(b.boxes, b.cylinders, 'glassTest', false);
  const reg = b.lights;
  reg.ambient = 0.05;
  const ambient = buildAmbientGrid({ ambientAt: () => 0.05 }, set.lo, set.hi);
  const dir: [number, number, number] = [0, 1, 0];
  const n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k]! - set.lo[k]!) / MOON_CELL))) as [number, number, number];
  const m = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const bake: LightBake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: 0, ms: 0 };
  return { hash: set.hash, f: new LightField(bake, reg) };
}

describe('E2 glass: the light shapes', () => {
  it('canonicalLightShapes skips glass panes, clear and frosted, even a visible one', () => {
    const b = new LevelBuilder();
    b.box(0, 1.5, 0, 0.2, 3, 4, '#888888');
    b.glass(2, -2, 2, 2, 3, 0, 'clear');
    b.glass(4, -2, 4, 2, 3, 0, 'frosted');
    // a hand-made visible glass box (not the builder's helper) is skipped too
    b.boxes.push({ c: [6, 1.5, 0], s: [0.1, 3, 4], yaw: 0, pitch: 0, color: '#9fb8c4', collide: true, glass: 'clear' });
    const shapes = canonicalLightShapes(b.boxes, b.cylinders, 'glassTest', false);
    expect(shapes.length).toBe(1);
    expect(shapes[0]!.c).toEqual([0, 1.5, 0]);
  });

  it('a pane bakes as the open gap: same shapes and hash, clear or frosted; a solid wall differs', () => {
    const gap = canonicalLightSet(room('gap').boxes, [], 'glassTest', false).hash;
    expect(canonicalLightSet(room('clear').boxes, [], 'glassTest', false).hash).toBe(gap);
    expect(canonicalLightSet(room('frosted').boxes, [], 'glassTest', false).hash).toBe(gap);
    expect(canonicalLightSet(room('wall').boxes, [], 'glassTest', false).hash).not.toBe(gap);
  });

  it('the meter (bodyLevel) and the guards (totalAt) read the same light through a pane as through the gap', () => {
    const gap = field(room('gap'));
    const clear = field(room('clear'));
    const frosted = field(room('frosted'));
    const wall = field(room('wall'));
    // behind the pane, a standing body and a point at chest height, and a body to the side
    for (const [x, z] of [[1.2, 0], [2, 0.8], [2.5, -0.8]] as const) {
      const ref = gap.f.bodyLevel(x, 0, z, 1.7);
      const refT = gap.f.totalAt(x, 1.2, z);
      for (const g of [clear, frosted]) {
        expect(g.f.bodyLevel(x, 0, z, 1.7), `meter ${x} ${z}`).toBe(ref);
        expect(g.f.totalAt(x, 1.2, z), `guard ${x} ${z}`).toBe(refT);
      }
      // the solid wall puts the same spot in the dark: the reading above is the lamp through the glass
      expect(ref, `lit ${x} ${z}`).toBeGreaterThan(0.25);
      expect(wall.f.bodyLevel(x, 0, z, 1.7), `wall ${x} ${z}`).toBeLessThan(ref - 0.1);
    }
  });
});

describe('E2 glass: the pane piece', () => {
  it('LevelBuilder.glass: a 0.1 collision piece, invisible as a box, no ledge, the kind set', () => {
    const b = new LevelBuilder();
    const p = b.glass(-3, 2, 5, 2, 2.4, 4.4, 'frosted');
    expect(p.s).toEqual([GLASS_THICK, 2.4, 8]);
    expect(p.c).toEqual([1, 4.4 + 1.2, 2]);
    expect(p.yaw).toBeCloseTo(Math.PI / 2, 12);
    expect(p).toMatchObject({ collide: true, visible: false, noLedge: true, glass: 'frosted' });
  });

  it('no cover, no ledges, no dressing from a pane (a visible glass box included)', () => {
    const vis: BoxPiece = { c: [0, 1.5, 0], s: [0.3, 3, 4], yaw: 0, pitch: 0, color: '#9fb8c4', collide: true, glass: 'clear' };
    const b = new LevelBuilder();
    b.glass(3, -2, 3, 2, 3, 0, 'clear');
    b.boxes.push(vis);
    expect(buildCoverSegments(b.boxes)).toEqual([]);
    expect(generateLedges(b.boxes).ledges).toEqual([]);
    expect(detailPieces(b.boxes, 'glassTest', 'epic')).toEqual([]);
    // the same box without the flag is cover and has ledges
    const solid = { ...vis, glass: undefined };
    expect(buildCoverSegments([solid]).length).toBeGreaterThan(0);
    expect(generateLedges([solid]).ledges.length).toBeGreaterThan(0);
  });

  it('a pane on a fence line gives the guards the same nav grid as the fence panel', () => {
    const make = (glass: boolean): LevelBuilder => {
      const b = new LevelBuilder();
      b.bounds = { minX: -8, maxX: 8, minZ: -8, maxZ: 8 };
      b.box(0, -0.25, 0, 16, 0.5, 16, '#777777');
      if (glass) {
        b.glass(-6, 0.3, 4, 0.3, 2.4, 0, 'clear');
        b.glass(1.3, -6, 1.3, -1, 2.4, 0, 'frosted');
      } else {
        b.fence(-6, 0.3, 4, 0.3, 2.4);
        b.fence(1.3, -6, 1.3, -1, 2.4);
      }
      return b;
    };
    const a = runtimeNav(make(false), { x: -5, z: -5 }, 2, []);
    const g = runtimeNav(make(true), { x: -5, z: -5 }, 2, []);
    expect(Array.from(g.walk)).toEqual(Array.from(a.walk));
    expect(Array.from(g.surf)).toEqual(Array.from(a.surf));
    expect(Array.from(g.height)).toEqual(Array.from(a.height));
    // and it is a real blocker: the pane's cell is shut, a path goes round its end
    expect(g.isWalkable(g.cellOf(-2, 0.3, 0))).toBe(false);
    expect(g.findPath([-2, -1], [-2, 2], 20000, 0, 0)).toBeTruthy();
  });
});

describe('E2 glass: sight, bullets, hearing (G45)', () => {
  it('the collision bits: bodies stop, bullets and the camera pass, frosted blocks sight, hearing hears a wall', () => {
    const clear = G.GLASS;
    const frosted = G.GLASS | G.GLASS_FROSTED;
    for (const m of [clear, frosted]) {
      expect(MASK.PLAYER_COLLIDE & m, 'player body').not.toBe(0);
      expect(MASK.PROP_COLLIDE & m, 'props').not.toBe(0);
      expect(MASK.RAGDOLL_COLLIDE & m, 'ragdolls').not.toBe(0);
      expect(MASK.PROJECTILE_COLLIDE & m, 'grenades').not.toBe(0);
      expect(MASK.HEARING & m, 'hearing').not.toBe(0);
      expect(MASK.PLAYER_SHOT & m, 'player bullets').toBe(0);
      expect(MASK.ENEMY_SHOT & m, 'enemy bullets').toBe(0);
      expect(MASK.WORLD & m, 'camera boom').toBe(0);
      expect(G.STATIC & m, 'level probes / light occluder / nav down-cast').toBe(0);
    }
    expect(MASK.SIGHT & clear, 'clear glass: sight passes').toBe(0);
    expect(MASK.SIGHT & frosted, 'frosted glass: sight blocked').not.toBe(0);
    expect(MASK.SIGHT & G.STATIC).not.toBe(0);
  });

  it('losClear casts with the sight mask (a frosted pane hides, a clear one does not)', () => {
    // a stand-in ray: the pane at x 0 is hit when the mask asks for its bits
    const pane = (bits: number) => ({ ray: (_a: unknown, _b: unknown, mask: number) => ({ hit: (mask & bits) !== 0, distance: 2 }) });
    const eye = { x: -2, y: 1.55, z: 0 };
    const to = { x: 2, y: 1.2, z: 0 };
    expect(losClear(pane(G.GLASS), eye, to, 0.1)).toBe(true);
    expect(losClear(pane(G.GLASS | G.GLASS_FROSTED), eye, to, 0.1)).toBe(false);
    expect(losClear(pane(G.STATIC), eye, to, 0.1)).toBe(false);
  });

  it('SightWorld (the sector checks): clear glass sees, frosted is solid, both stop a body', () => {
    const b = new LevelBuilder();
    b.glass(0, -2, 0, 2, 3, 0, 'clear');
    b.glass(5, -2, 5, 2, 3, 0, 'frosted');
    const w = new SightWorld(b.boxes, []);
    expect(w.clear(-1, 1.55, 0, 1, 1.55, 0)).toBe(true);
    expect(w.clear(4, 1.55, 0, 6, 1.55, 0)).toBe(false);
    expect(w.blocked(0.1, 0, 0)).toBe(true);
    expect(w.blocked(5.1, 0, 0)).toBe(true);
    expect(w.blocked(2.5, 0, 0)).toBe(false);
  });
});
