/**
 * smooth-world fix round 2 (desktop GPU shots: smooth walls read brighter than voxel walls under the same light): a
 * Babylon-free model of the level's per-pixel light terms on both renderers at Marlow Yard wall and floor points.
 *
 * Modelled (from the code's own constants, `world/levelFill.ts`, shared by `VoxelPlugin` and `LampPlugin` LAMP_SKY):
 * - the fill: voxels - the hemisphere's colours x (floor + open x sky visibility) from the voxel shapes' sky bake;
 *   smooth now - the same formula from the canonical shapes' sky bake; smooth before the fix - the flat gameplay ambient
 *   grid x `LEVEL_TO_RENDER` (the cause: about 4x the voxel fill on open walls, 10x and more under the annex roof);
 * - the image-based light's scale (voxels: by sky visibility; smooth before: 1).
 * Equal by construction (the same code on both paths, not modelled): the baked lamps, the baked moon, the darkness
 * curve (it reads the gameplay level on both), directIntensity, environmentIntensity. Albedo: the same piece colours
 * linearised; the atlas detail (0.5 vs 0.45 strength, cavity 0.35 vs 0.3) and the voxel tone hash / AO average out
 * within a few percent. Not modelled (GPU only, desktop shots): the probe's captured cube itself (it renders whichever
 * level is drawn), the atlas textures' values, per-voxel AO in corners.
 * (marlow-bunker) Marlow Yard is an underground bunker now: every cell and airlock has a ceiling, so every point is roofed
 * (the old open-yard points are under the hall ceilings), and the smooth fill must still match the voxel fill there.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { ctcourse } from '../src/world/maps/ctcourse';
import { dressingOn } from '../src/world/detailPass';
import { VOXEL_TIER } from '../src/core/quality';
import { bakeSky } from '../src/voxel/skyBake';
import { packShapes, SHAPE_STRIDE, shapeBounds } from '../src/voxel/shapes';
import { BRICK } from '../src/voxel/brickmap';
import { CHUNK, MIN_VOXELS } from '../src/voxel/levelVoxels';
import { SKY_CELL } from '../src/voxel/voxelWorld';
import { envScale, levelFill, levelFillColors, sampleSky, skyGridFor, skyShapes, SKY_OFFSET, type Rgb } from '../src/world/levelFill';
import { LEVEL_TO_RENDER } from '../src/world/darkCurve';
import { moonLight } from '../src/world/lampMath';

const th = ctcourse.theme;
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
const lum = (c: Rgb): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

function grids() {
  const vb = new LevelBuilder();
  ctcourse.build(vb, 0);
  const t = VOXEL_TIER.epic;
  const lv = vb.prepare('ctcourse', { floor: th.floor ?? 'concrete', dressing: dressingOn(ctcourse), art: ctcourse.art ?? null, detail: 'epic', voxelSize: t.size, fineSize: t.fine }).voxels!;
  const vn = [0, 1, 2].map((a) => Math.ceil((lv.dims[a]! * lv.size) / SKY_CELL)) as [number, number, number];
  const vox = { origin: lv.origin, cell: SKY_CELL, n: vn, vis: bakeSky({ kind: 'sky', id: 0, origin: [...lv.origin], cell: SKY_CELL, n: vn, shapes: packShapes(lv.shapes) }).vis };
  const sb = new LevelBuilder();
  ctcourse.build(sb, 0);
  const l = sb.prepare('ctcourse', { floor: th.floor ?? 'concrete', dressing: dressingOn(ctcourse), art: ctcourse.art ?? null, detail: 'epic' }).light;
  // (as `World.create`'s `smoothSky`: the canonical shapes on the voxel path's grid)
  const ss = skyShapes(l.shapes, SHAPE_STRIDE, t.size * MIN_VOXELS);
  const sg = skyGridFor(ss.length / SHAPE_STRIDE, (i, out) => shapeBounds(ss, i, out), () => true, BRICK * t.size, CHUNK * t.size, SKY_CELL);
  const smooth = { origin: sg.origin, cell: SKY_CELL, n: sg.n, vis: bakeSky({ kind: 'sky', id: 0, origin: sg.origin, cell: SKY_CELL, n: sg.n, shapes: ss }).vis };
  return { vox, smooth, reg: sb.lights };
}

/** Wall and floor points (on the face, with its outward normal). */
/** `roofed` null: a face on a sky cell its own wall touches (conservative occupancy reads it nearly hidden on both paths). */
const POINTS: { name: string; p: Rgb; n: Rgb; roofed: boolean | null }[] = [
  { name: 'annex front wall, inside', p: [97.5, 1.2, 10.5], n: [1, 0, 0], roofed: true },
  { name: 'annex grid wall, front room', p: [100.3, 1.5, 3], n: [-1, 0, 0], roofed: true },
  { name: 'annex floor, front room', p: [99, 0, 10], n: [0, 1, 0], roofed: true },
  { name: 'annex front wall, outside (the S5 hall, under its 7.5 m ceiling)', p: [96.5, 1.2, 10.5], n: [-1, 0, 0], roofed: true },
  { name: 'S8 obstacle wall by the exit (lamp-lit, under the 4.5 m ceiling)', p: [162.5, 1.2, 7], n: [-1, 0, 0], roofed: true },
  { name: 'S2 obstacle wall (under the hall ceiling)', p: [30.5, 1.2, 3], n: [-1, 0, 0], roofed: true },
  { name: 'S2 hall floor (under the 7.5 m ceiling)', p: [26, 0, 7], n: [0, 1, 0], roofed: true },
];

describe('smooth level light response matches the voxel walls (fix round 2)', () => {
  const g = grids();
  const c = levelFillColors(th.ambient, hex(th.ground));
  // (gameplay's ambient grid: Marlow Yard has no zones, so the open-sky level less the moon's share everywhere)
  const grid = (th.lightLevel ?? 0.75) - moonLight(th);
  const rows = POINTS.map((pt) => {
    const q = (k: number): number => pt.p[k]! + pt.n[k]! * SKY_CELL * SKY_OFFSET;
    const vV = sampleSky(g.vox, q(0), q(1), q(2));
    const vS = sampleSky(g.smooth, q(0), q(1), q(2));
    return { ...pt, vV, vS, fillV: lum(levelFill(c, pt.n[1], vV)), fillS: lum(levelFill(c, pt.n[1], vS)), fillOld: grid * LEVEL_TO_RENDER, envV: envScale(vV), envS: envScale(vS) };
  });
  if (process.env.FILL_PRINT) for (const r of rows) console.info(r.name, r.vV.toFixed(2), r.vS.toFixed(2), r.fillV.toFixed(3), r.fillS.toFixed(3), r.fillOld.toFixed(3));

  it('the roofed points see little sky, the open ones much (the voxel bake; marlow-bunker: all roofed)', () => {
    for (const r of rows) {
      if (r.roofed === true) expect(r.vV, r.name).toBeLessThan(0.35);
      else if (r.roofed === false) expect(r.vV, r.name).toBeGreaterThan(0.35);
    }
  });

  it('the smooth fill and image-based light are within 10% of the voxel walls at every point', () => {
    for (const r of rows) {
      expect(Math.abs(r.fillS / r.fillV - 1), `${r.name}: fill ${r.fillS} vs ${r.fillV}`).toBeLessThan(0.1);
      expect(Math.abs(r.envS / r.envV - 1), `${r.name}: env ${r.envS} vs ${r.envV}`).toBeLessThan(0.1);
    }
  });

  it('the cause: the old flat grid fill oversold the walls (open yard 2x, roofed several times more)', () => {
    for (const r of rows) expect(r.fillOld / r.fillV, r.name).toBeGreaterThan(r.roofed === false ? 1.5 : 4);
  });
});
