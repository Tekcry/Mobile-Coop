/**
 * (J9 S1) The shutter's world wiring, pure parts (no scene): the curtain slots from the level's specs, the guards' nav
 * closure over each opening (A15), and the always-shut light leaf the field and the screen test (A16). A level with no
 * shutter specs gets none of it.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { LightField } from '../src/world/lightField';
import { LightRegistry } from '../src/world/lights';
import { SHUTTER, shutterSpecsOf, type ShutterSpec } from '../src/game/kit/shutter';
import { SHUTTER_NAV, closeShutterNav, placeShutter, shutterLightLeaf, shutterLightLeaves, shutterNavRect, shutterSlotsOf, type ShutterNavRect } from '../src/world/shutterDoor';
import { runtimeNav } from './helpers/runtimeNav';
import type { NavGrid } from '../src/ai/navGrid';

/** A 20 x 20 room split by a wall with one 3 m opening, a shutter in it (yaw 0: the wall along x at z 10). */
const SPEC_Z: ShutterSpec = { id: 'sz', x: 10, y: 0, z: 10, yaw: 0, width: 3, height: 3 };
/** The same turned a quarter (yaw pi/2: the wall along z at x 10, its normal +x). */
const SPEC_X: ShutterSpec = { id: 'sx', x: 10, y: 0, z: 10, yaw: Math.PI / 2, width: 3, height: 3 };

function room(spec: ShutterSpec | null, alongX: boolean): LevelBuilder {
  const b = new LevelBuilder();
  b.perimeter(0, 20, 0, 20, 3, '#888');
  b.floor(10, 10, 20, 20, '#666');
  const gap = [[8.5, 11.5]] as const;
  if (alongX) b.wallX(10, 0, 20, gap, 3, '#777');
  else b.wallZ(10, 0, 20, gap, 3, '#777');
  if (spec) placeShutter(b, spec);
  return b;
}

function nav(b: LevelBuilder, seed: { x: number; z: number }): NavGrid {
  return runtimeNav(b, seed, 1, []);
}

/** The walkable cell at (x, z) (none = -1 or a shut cell). */
function walk(n: NavGrid, x: number, z: number): boolean {
  const c = n.cellOf(x, z);
  return c >= 0 && n.isWalkable(c);
}

describe('slots from specs (J9 S1)', () => {
  it('one slot per placed shutter, in order, shut, its hold gap within its height', () => {
    const b = new LevelBuilder();
    placeShutter(b, SPEC_Z);
    placeShutter(b, { ...SPEC_X, id: 'low', x: 4, height: 0.8 });
    const level = { anchors: b.anchors };
    const s = shutterSlotsOf(level);
    expect(s.map((x) => [x.spec.id, x.index, x.open, x.bottom])).toEqual([
      ['sz', 0, 0, 0],
      ['low', 1, 0, 0],
    ]);
    expect(s[0]!.holdGap).toBe(SHUTTER.holdGap);
    expect(s[1]!.holdGap).toBe(0.8);
    expect(shutterLightLeaves(level)).toHaveLength(2);
  });

  it('a level with no shutters: no slots, no light leaves (the world builds nothing)', () => {
    const b = new LevelBuilder();
    expect(shutterSlotsOf({ anchors: b.anchors })).toEqual([]);
    expect(shutterLightLeaves({ anchors: b.anchors })).toEqual([]);
    expect(shutterLightLeaves(null)).toEqual([]);
  });
});

describe('guards\' nav: the opening is shut (A15)', () => {
  it('the closure rect: the width + the pad along the shutter, the door depth across, on its floor', () => {
    const r = shutterNavRect(SPEC_Z, { cx: 0, cz: 0, hx: 0, hz: 0, yaw: 0, y: 0 } as ShutterNavRect);
    expect(r).toEqual({ cx: 10, cz: 10, hx: (3 + SHUTTER_NAV.alongPad) / 2, hz: SHUTTER_NAV.across, yaw: 0, y: 0 });
  });

  for (const [name, spec, alongX] of [
    ['wall along x (yaw 0)', SPEC_Z, true],
    ['wall along z (yaw pi/2)', SPEC_X, false],
  ] as const) {
    it(`${name}: walkable before, shut after; both sides kept; each side's look point stays on its side`, () => {
      const b = room(spec, alongX);
      const a = alongX ? ([10, 5] as const) : ([5, 10] as const);
      const c = alongX ? ([10, 15] as const) : ([15, 10] as const);
      const n = nav(b, { x: a[0], z: a[1] });
      // as the map builds it: the opening is walked (the grid is built before the curtain body, `Doors` as well)
      expect(n.findPath([a[0], a[1]], [c[0], c[1]])).not.toBeNull();
      expect(walk(n, spec.x, spec.z)).toBe(true);
      const v = n.version;
      const ids = closeShutterNav(n, [spec]);
      expect(ids).toHaveLength(1);
      expect(n.isClosed(ids[0]!)).toBe(true);
      expect(n.closureSize(ids[0]!)).toBeGreaterThan(0);
      expect(n.version).toBeGreaterThan(v);
      // no way through for a guard; the far side is still on the grid (shut after the build, never pruned)
      expect(n.findPath([a[0], a[1]], [c[0], c[1]])).toBeNull();
      expect(walk(n, c[0], c[1])).toBe(true);
      expect(walk(n, spec.x, spec.z)).toBe(false);
      // (S2 forward note) a look point 0.6 m off the plane on a guard's side snaps to a cell on that side, so a
      // notice heard there brings him to his own side. The plane point itself (S2's hear spot today) snaps to one
      // fixed side whoever hears it: on a plane along a cell edge (this room's x / z 10, Tallow's z 58 and z 28 with
      // 0.5 m cells from 0) the shut rows are the two either side, and the nearest open cell is the +normal side's
      // (`nearestWalkable` from the cell the point falls in). S4's e2e asserts the noticing guard ends on his side.
      const nx = Math.sin(spec.yaw);
      const nz = Math.cos(spec.yaw);
      const k0 = n.nearestWalkable(spec.x, spec.z, 4);
      const [ox, oz] = n.center(k0);
      expect((ox - spec.x) * nx + (oz - spec.z) * nz).toBeGreaterThan(0);
      for (const side of [-1, 1]) {
        const px = spec.x + side * 0.6 * nx;
        const pz = spec.z + side * 0.6 * nz;
        const k = n.nearestWalkable(px, pz, 4);
        expect(k).toBeGreaterThanOrEqual(0);
        const [qx, qz] = n.center(k);
        expect(((qx - spec.x) * nx + (qz - spec.z) * nz) * side).toBeGreaterThan(0);
      }
    });
  }

  it('beside the opening nothing changes (the closure stays in the opening)', () => {
    const b = room(SPEC_Z, true);
    const n = nav(b, { x: 10, z: 5 });
    const before = [walk(n, 5, 9), walk(n, 15, 11), walk(n, 10, 8.8), walk(n, 10, 11.2)];
    closeShutterNav(n, [SPEC_Z]);
    expect([walk(n, 5, 9), walk(n, 15, 11), walk(n, 10, 8.8), walk(n, 10, 11.2)]).toEqual(before);
    expect(before).toEqual([true, true, true, true]);
  });
});

describe('light: the curtain is an always-shut leaf (A16)', () => {
  it('the leaf covers the opening in the door convention', () => {
    const l = shutterLightLeaf(SPEC_Z);
    expect(l.open).toBe(0);
    expect(l.anchor.width).toBe(3);
    expect(l.anchor.height).toBe(3);
    // hinge at one end, the leaf along (sin yaw, cos yaw) to the other end
    const a = l.anchor;
    expect(a.hinge.x).toBeCloseTo(8.5);
    expect(a.hinge.z).toBeCloseTo(10);
    expect(a.hinge.x + Math.sin(a.yaw) * a.width).toBeCloseTo(11.5);
    expect(a.hinge.z + Math.cos(a.yaw) * a.width).toBeCloseTo(10);
    const q = shutterLightLeaf(SPEC_X).anchor;
    expect(q.hinge.x).toBeCloseTo(10);
    expect(q.hinge.x + Math.sin(q.yaw) * q.width).toBeCloseTo(10);
    expect([q.hinge.z, q.hinge.z + Math.cos(q.yaw) * q.width].sort((u, w) => u - w).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([8.5, 11.5]);
  });

  for (const spec of [SPEC_Z, SPEC_X]) {
    it(`the field reports the opening closed (yaw ${spec.yaw.toFixed(2)}): a lamp across it gives no light; beside it, as before`, () => {
      const reg = new LightRegistry();
      reg.ambient = 0;
      const nx = Math.sin(spec.yaw);
      const nz = Math.cos(spec.yaw);
      // a lamp 2 m off the plane on one side, a point 2 m off on the other, both through the opening
      reg.add({ x: spec.x - 2 * nx, y: 1.5, z: spec.z - 2 * nz, radius: 8, intensity: 1 });
      const open = new LightField(null, reg);
      const shut = new LightField(null, reg, [shutterLightLeaf(spec)]);
      const px = spec.x + 2 * nx;
      const pz = spec.z + 2 * nz;
      expect(open.totalAt(px, 1, pz)).toBeGreaterThan(0.05);
      expect(shut.totalAt(px, 1, pz)).toBe(0);
      expect(shut.doorBlocks(spec.x - 2 * nx, 1.5, spec.z - 2 * nz, px, 1, pz)).toBe(true);
      // through the held gap too (A16: the gap passes no lamp light)
      expect(shut.doorBlocks(spec.x - 2 * nx, 0.4, spec.z - 2 * nz, px, 0.4, pz)).toBe(true);
      // the lamp's own side: unchanged
      const sx = spec.x - 1 * nx;
      const sz = spec.z - 1 * nz;
      expect(shut.totalAt(sx, 1, sz)).toBeCloseTo(open.totalAt(sx, 1, sz), 6);
      // over the head box (above the opening) the leaf does not reach
      expect(shut.doorBlocks(spec.x - 2 * nx, 3.4, spec.z - 2 * nz, px, 3.4, pz)).toBe(false);
    });
  }

  it('placed through the builder, the specs and the leaves agree', () => {
    const b = room(SPEC_Z, true);
    const specs = shutterSpecsOf({ anchors: b.anchors });
    expect(specs.map((s) => s.id)).toEqual(['sz']);
    expect(shutterLightLeaves({ anchors: b.anchors })).toEqual([shutterLightLeaf(SPEC_Z)]);
  });
});
