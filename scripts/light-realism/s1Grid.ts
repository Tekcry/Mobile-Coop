/**
 * light-realism: the S1 staff car park's light field on a 1 m grid (read-only; the desktop half of the measurement).
 * Bundled and run by `scripts/light-realism/s1-grid.mjs` (esbuild, node; no GPU, no browser). It builds `campusOps` with
 * the pure `LevelBuilder` as the unit tests do, bakes the lamps that reach the car park (lamp visibility + bounce,
 * `bakeLamps`), the moon and the ambient grid over a crop round S1, and samples `LightField` - the function the light
 * meter and the guards read (`GameState.updateLight`, `bodyLevel`) - at y 0.1 and 1.0 over the car park footprint.
 * Also prints the paper terms (the formula without visibility) at named points and the darkness curve's weight
 * (rendering only) for each level. Never part of `npm test`.
 */
import { LevelBuilder } from '../../src/world/levelBuilder';
import { campusOps } from '../../src/world/maps/campusOps';
import { PARK_COLUMNS_E, PARK_COLUMNS_W } from '../../src/world/maps/campusS1';
import { bakeLamps, LAMP_STRIDE } from '../../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../../src/voxel/skyBake';
import { type LightBake } from '../../src/world/lightBake';
import { buildAmbientGrid } from '../../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../../src/world/lightField';
import { LAMP_LEVEL_GAIN, LIGHT_GAIN, moonLight, photoFalloff, lampCone, PHOTO } from '../../src/world/lampMath';
import { darkCurve, darkWeight, DARK_DESKTOP, LEVEL_TO_RENDER } from '../../src/world/darkCurve';
import { LIGHT, type LightDef } from '../../src/world/lights';

/** The car park footprint (`S1_ROOMS` 'park'). */
export const PARK = { minX: -36, maxX: 6, minZ: -76, maxZ: -52 } as const;

export interface GridOut {
  meta: Record<string, unknown>;
  heights: Record<string, { stats: Record<string, number>; rows: { z: number; v: (number | null)[] }[] }>;
  points: Record<string, unknown>[];
  lamps: Record<string, unknown>[];
  curve: [number, number, number][];
}

const r3 = (v: number): number => Math.round(v * 1000) / 1000;

export function run(opts: { step?: number; log?: (s: string) => void } = {}): GridOut {
  const log = opts.log ?? (() => {});
  const step = opts.step ?? 1;
  const t0 = Date.now();
  const b = new LevelBuilder();
  campusOps.build(b, 0);
  const { light: set } = b.prepare(campusOps.id, {});
  log(`built campusOps: ${b.boxes.length} boxes, ${b.lights.lights.length} lights, ${Date.now() - t0} ms`);
  const reg = b.lights;
  reg.ambient = campusOps.theme.lightLevel ?? 0.75;
  const mL = moonLight(campusOps.theme);

  // the crop: the car park grown by the longest reach (columns: 12 x 1.6 = 19.2 m), clamped to the map's light bounds
  const lo: [number, number, number] = [Math.max(set.lo[0], PARK.minX - 20), set.lo[1], Math.max(set.lo[2], PARK.minZ - 20)];
  const hi: [number, number, number] = [Math.min(set.hi[0], PARK.maxX + 20), Math.min(set.hi[1], 16), Math.min(set.hi[2], PARK.maxZ + 20)];
  lo[0] = Math.floor(lo[0]);
  lo[1] = Math.floor(lo[1]);
  lo[2] = Math.floor(lo[2]);
  hi[0] = Math.ceil(hi[0]);
  hi[1] = Math.ceil(hi[1]);
  hi[2] = Math.ceil(hi[2]);

  // the fixed lights whose reach touches the car park (plan distance to the rectangle < reach)
  const touches = (l: LightDef): boolean => {
    if (l.kind === 'flashlight') return false;
    const dx = Math.max(PARK.minX - l.x, 0, l.x - PARK.maxX);
    const dz = Math.max(PARK.minZ - l.z, 0, l.z - PARK.maxZ);
    return Math.sqrt(dx * dx + dz * dz) < l.radius && l.x >= lo[0] && l.x <= hi[0] && l.z >= lo[2] && l.z <= hi[2] && l.y <= hi[1];
  };
  const ids = reg.lights.filter(touches).map((l) => l.id);
  const lights = new Float32Array(ids.length * LAMP_STRIDE);
  ids.forEach((id, i) => {
    const l = reg.lights[id]!;
    const f = l.fixture;
    lights.set([l.x, l.y, l.z, l.radius, l.cone?.dx ?? 0, l.cone?.dy ?? -1, l.cone?.dz ?? 0, l.cone ? l.cone.cosOuter : -2, f?.sx ?? 0, f?.sz ?? 0], i * LAMP_STRIDE);
  });
  const t1 = Date.now();
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights, lo, hi });
  log(`baked ${ids.length} lamps in ${Date.now() - t1} ms`);
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, lo, hi);
  const s = campusOps.theme.sunDir;
  const sl = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
  const dir: [number, number, number] = [-s[0] / sl, -s[1] / sl, -s[2] / sl];
  const n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k]! - lo[k]!) / MOON_CELL))) as [number, number, number];
  const t2 = Date.now();
  const m = bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes: set.shapes, dir });
  log(`baked the moon in ${Date.now() - t2} ms`);
  const bake: LightBake = { lo, hi, lampKey: 'probe', moonKey: 'probe', lamps: { baked: { lights, ids }, r }, moon: { origin: lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
  const doors: FieldDoor[] = b.anchors.doors.map((anchor) => ({ anchor, open: 0 }));
  const field = new LightField(bake, reg, doors);

  // solids at a height: a car body, a column, a wall (marked, not sampled as open floor)
  const solidAt = (x: number, y: number, z: number): boolean => {
    for (const bx of b.boxes) {
      if (!bx.collide) continue;
      if (y < bx.c[1] - bx.s[1] / 2 || y > bx.c[1] + bx.s[1] / 2) continue;
      const c = Math.cos(-bx.yaw), sn = Math.sin(-bx.yaw);
      const dx = x - bx.c[0], dz = z - bx.c[2];
      const lx = dx * c + dz * sn, lz = -dx * sn + dz * c;
      if (Math.abs(lx) <= bx.s[0] / 2 && Math.abs(lz) <= bx.s[2] / 2) return true;
    }
    return false;
  };

  const heights: GridOut['heights'] = {};
  for (const y of [0.1, 1.0]) {
    const rows: { z: number; v: (number | null)[] }[] = [];
    const vals: number[] = [];
    const lampOnly: number[] = [];
    let dark = 0, mid = 0, lit = 0;
    for (let z = PARK.maxZ; z >= PARK.minZ; z -= step) {
      const row: (number | null)[] = [];
      for (let x = PARK.minX; x <= PARK.maxX; x += step) {
        if (solidAt(x, y, z)) {
          row.push(null);
          continue;
        }
        const v = field.levelAt(x, y, z);
        row.push(r3(v));
        vals.push(v);
        const base = field.bounceAt(x, y, z) + mL * field.moonAt(x, y, z) + ambientAt(ambient, x, y, z);
        lampOnly.push(Math.max(0, v - base));
        if (v < LIGHT.shadow) dark++;
        else if (v < LIGHT.lit) mid++;
        else lit++;
      }
      rows.push({ z, v: row });
    }
    const mean = vals.reduce((p, q) => p + q, 0) / vals.length;
    const lmean = lampOnly.reduce((p, q) => p + q, 0) / lampOnly.length;
    const lmin = Math.min(...lampOnly);
    heights[y.toFixed(1)] = {
      stats: {
        n: vals.length,
        min: r3(Math.min(...vals)),
        mean: r3(mean),
        max: r3(Math.max(...vals)),
        u0: r3(Math.min(...vals) / mean),
        ud: r3(Math.min(...vals) / Math.max(...vals)),
        darkShare: r3(dark / vals.length),
        midShare: r3(mid / vals.length),
        litShare: r3(lit / vals.length),
        lampOnlyMin: r3(lmin),
        lampOnlyMean: r3(lmean),
        lampOnlyMax: r3(Math.max(...lampOnly)),
        lampOnlyU0: r3(lmin / lmean),
        renderWeightAtMean: r3(darkWeight(mean, DARK_DESKTOP)),
      },
      rows,
    };
  }

  // named points: under a column, between two columns along a row, between the two rows, the middle of four, the edges
  const points: Record<string, unknown>[] = [];
  const named: [string, number, number][] = [
    ['under column (-28, -62)', -28, -62],
    ['between 2 columns, same row (-25, -62)', -25, -62],
    ['between rows, under-column x (-28, -57.5)', -28, -57.5],
    ['middle of 4 columns (-25, -57.5)', -25, -57.5],
    ['circuit seam (-13, -57.5)', -13, -57.5],
    ['south aisle (-25, -68)', -25, -68],
    ['south edge (-25, -75)', -25, -75],
    ['carport z -53, under column (-22, -53)', -22, -53],
    ['north edge (-25, -52)', -25, -52],
    ['far east (5, -60)', 5, -60],
  ];
  const cols = [...PARK_COLUMNS_W, ...PARK_COLUMNS_E];
  for (const [name, x, z] of named) {
    for (const y of [0.1, 1.0]) {
      // the formula alone (no visibility): every column, as `photoTerm` x intensity x gain
      let paper = 0;
      let nearest = 0;
      for (const [cx, cz] of cols) {
        const vx = x - cx, vy = y - 6.0, vz = z - cz;
        const d = Math.sqrt(vx * vx + vy * vy + vz * vz);
        const t = photoFalloff(d, 12 * PHOTO.reach) * lampCone(-vy / d, Math.cos(1.15), 2);
        const lv = LAMP_LEVEL_GAIN * 0.9 * t;
        paper += lv;
        nearest = Math.max(nearest, lv);
      }
      const level = field.levelAt(x, y, z);
      const amb = ambientAt(ambient, x, y, z);
      const moon = mL * field.moonAt(x, y, z);
      const bounce = field.bounceAt(x, y, z);
      points.push({
        name,
        x,
        y,
        z,
        solid: solidAt(x, y, z),
        paperColumnsNoVis: r3(paper),
        paperNearestColumn: r3(nearest),
        field: r3(level),
        fieldLamps: r3(level - amb - moon - bounce),
        ambient: r3(amb),
        moon: r3(moon),
        bounce: r3(bounce),
        band: level < LIGHT.shadow ? 'dark' : level < LIGHT.lit ? 'mid' : 'lit',
        renderWeight: r3(darkWeight(level, DARK_DESKTOP)),
        renderLevel: r3(darkCurve(level, DARK_DESKTOP) * LEVEL_TO_RENDER),
      });
    }
  }
  const lampsOut = ids.map((id) => {
    const l = reg.lights[id]!;
    return { id, kind: l.kind, x: l.x, y: l.y, z: l.z, reach: r3(l.radius), i: l.intensity, group: l.group, coneOuterRad: l.cone ? r3(Math.acos(l.cone.cosOuter)) : null, colour: l.color, colourLuma: r3(0.2126 * l.color[0] + 0.7152 * l.color[1] + 0.0722 * l.color[2]) };
  });
  const curve: [number, number, number][] = [0.1, 0.14, 0.2, 0.244, 0.28, 0.3, 0.33, 0.37, 0.4, 0.45, 0.5, 0.6, 0.8, 1].map((v) => [v, r3(darkWeight(v, DARK_DESKTOP)), r3(darkCurve(v, DARK_DESKTOP) * LEVEL_TO_RENDER)]);
  return {
    meta: { map: campusOps.id, crop: { lo, hi }, step, moonLight: r3(mL), zoneFill: reg.zoneAt(-25, 1, -60), lightGain: LIGHT_GAIN, levelGain: LAMP_LEVEL_GAIN, thresholds: LIGHT, ms: Date.now() - t0 },
    heights,
    points,
    lamps: lampsOut,
    curve,
  };
}

function ambientAt(g: { origin: number[]; n: number[]; data: Uint8Array }, x: number, y: number, z: number): number {
  // the nearest cell (the field reads it trilinearly; inside one zone the two agree)
  const cx = Math.min(g.n[0]! - 1, Math.max(0, Math.floor(x - g.origin[0]!)));
  const cy = Math.min(g.n[1]! - 1, Math.max(0, Math.floor(y - g.origin[1]!)));
  const cz = Math.min(g.n[2]! - 1, Math.max(0, Math.floor(z - g.origin[2]!)));
  return g.data[cx + g.n[0]! * (cy + g.n[1]! * cz)]! / 255;
}
