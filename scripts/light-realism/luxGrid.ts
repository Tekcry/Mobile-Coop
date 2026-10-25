/**
 * light-realism L0: any map's light field in lux, per space (read-only; the desktop half of the measurement; replaces
 * the S1-only `s1Grid.ts`). Bundled and run by `scripts/light-realism/lux-grid.mjs` (esbuild, node; no GPU, no browser).
 * It builds the map with the pure `LevelBuilder` as the unit tests do, bakes the lamps that reach the chosen spaces
 * (lamp visibility + bounce, `bakeLamps`), the moon and the ambient grid over a crop round them, and samples
 * `LightField.levelAt` - the function the light meter and the guards read - on a 1 m grid over each space at its
 * measurement plane (BRIEF A3) and at the meter's height (floor + 1.0). Each space gets its level and lux grids, the
 * band check (`bandCheck`, A4) and an SVG heat map. Lux adds the lamps in lux, each lamp read on its own (`LightField.lampAt`,
 * `sumLux`; L0 check note 1), not the summed level on the curve; the level grids are what the picture and meter show. Spaces, types, planes and bands come from
 * `docs/light-realism/spaces/<map>.json`. Never part of `npm test`; changes nothing in src/.
 */
import { LevelBuilder } from '../../src/world/levelBuilder';
import type { MapDef } from '../../src/world/mapDef';
import { bakeLamps, LAMP_STRIDE } from '../../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../../src/voxel/skyBake';
import type { LightBake } from '../../src/world/lightBake';
import { buildAmbientGrid } from '../../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../../src/world/lightField';
import { lampReach, moonLight } from '../../src/world/lampMath';
import { LIGHT, type LightDef } from '../../src/world/lights';
import { bandCheck, LUX_ANCHORS, sumLux, type BandResult, type LuxBand } from '../../src/world/lux';
import { S1_GROUPS } from '../../src/world/maps/campusS1';

/** One space of a spaces file. */
export interface SpaceDef {
  id: string;
  /** Sector Ops section (1-5); absent on a map without sections. */
  section?: number;
  name: string;
  /** The band table's space type (`research/bands.md` section 3). */
  type: string;
  /** The standard's category or source line. */
  category?: string;
  rect: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Floor height (m); the plane and the meter height are above it. */
  floor?: number;
  /** Measurement plane above the floor (A3): 0.1 (ground / floor) or 0.8 (task plane). */
  plane: number;
  /** The band; null where the space has no band (outside the lit site), with `why`. */
  band: LuxBand | null;
  /** True where a band value is still "to verify" (`research/bands.md` section 5). */
  verify?: boolean;
  why?: string;
}

export interface SpacesFile {
  map: string;
  spaces: SpaceDef[];
}

export interface SpaceOut {
  id: string;
  section: number | null;
  name: string;
  type: string;
  category: string | null;
  band: LuxBand | null;
  verify: boolean;
  why: string | null;
  /** The grid: x from `x0` east in `step`, z from `z0` (north) south in `step`. */
  grid: { x0: number; z0: number; step: number; cols: number; rows: number };
  /**
   * `lux`: per cell, the lamps added in lux (`sumLux`); the band check reads it. `check`: the mean over every open cell
   * (the standards average the whole area), the point minimum and U0 over open ground only (`minLuxAll`, `u0All`: every
   * cell, L1 step 2b).
   */
  plane: { y: number; stats: Stats; check: SpaceCheck | null; level: (number | null)[][]; lux: (number | null)[][] };
  /** (L1 step 2b) The cells near cover at the plane: within `COVER_MARGIN` of a solid that rises through it, [x, z, cause]. */
  cover: { n: number; byCause: Record<CoverCause, number>; cells: [number, number, CoverCause][] };
  /** (L1) Open-ground cells under the band's point minimum: [x, z, lux, cause]. */
  dark: [number, number, number, DarkCause][];
  meter: { y: number; stats: Stats; level: (number | null)[][] };
}

/** (L1 step 2b) What a near-cover cell stands beside: a parked car, a pole (any cylinder), another solid. */
export type CoverCause = 'car' | 'pole' | 'other';
/**
 * (L1) Why an open-ground cell reads under the point minimum: the nearest lamp in reach is hidden by a car / a pole /
 * another solid (`car`, `pole`, `other`), no lamp reaches it (`reach`), or its nearest lamp is in clear view and still too
 * dim there (`spacing`).
 */
export type DarkCause = CoverCause | 'reach' | 'spacing';

/** The band check of one space (L1 step 2b): `bandCheck` with the point minimum and U0 read on open ground. */
export type SpaceCheck = BandResult & { minLuxAll: number; u0All: number };

/** (L1 step 2b) A cell within this plan distance (m) of a solid's footprint is near cover, not open ground. */
export const COVER_MARGIN = 0.6;

export interface Stats {
  n: number;
  min: number;
  mean: number;
  max: number;
  /** min / mean (levels). */
  u0: number;
  darkShare: number;
  midShare: number;
  litShare: number;
  /** Lamps added in lux (`sumLux`). `minLux` and `u0Lux` (min / mean in lux) on open ground (L1 step 2b), `minLuxAll`
   *  and `u0LuxAll` on every cell; the mean is over every cell. */
  meanLux: number;
  minLux: number;
  minLuxAll: number;
  u0Lux: number;
  u0LuxAll: number;
}

export interface GridOut {
  meta: Record<string, unknown>;
  spaces: SpaceOut[];
  lamps: Record<string, unknown>[];
}

const r3 = (v: number): number => Math.round(v * 1000) / 1000;
const r2 = (v: number): number => Math.round(v * 100) / 100;

/** The maps this job measures, loaded lazily (a map's modules run only when it is asked for). */
const LOADERS: Record<string, () => Promise<MapDef>> = {
  campusOps: async () => (await import('../../src/world/maps/campusOps')).campusOps,
  warehouse: async () => (await import('../../src/world/maps/warehouse')).warehouse,
};
export const MAP_IDS = Object.keys(LOADERS);

export interface RunOpts {
  spacesFile: SpacesFile;
  section?: number | null;
  space?: string | null;
  step?: number;
  log?: (s: string) => void;
}

export async function run(opts: RunOpts): Promise<GridOut> {
  const log = opts.log ?? (() => {});
  const step = opts.step ?? 1;
  const file = opts.spacesFile;
  const load = LOADERS[file.map];
  if (!load) throw new Error(`no loader for map ${file.map} (known: ${MAP_IDS.join(', ')})`);
  const spaces = file.spaces.filter((s) => (opts.section == null || s.section === opts.section) && (!opts.space || s.id === opts.space));
  if (!spaces.length) throw new Error(`no spaces in ${file.map} for section ${opts.section ?? 'any'} / space ${opts.space ?? 'any'}`);
  const map = await load();
  const t0 = Date.now();
  const b = new LevelBuilder();
  map.build(b, 0);
  const { light: set } = b.prepare(map.id, {});
  log(`built ${map.id}: ${b.boxes.length} boxes, ${b.lights.lights.length} lights, ${Date.now() - t0} ms`);
  const reg = b.lights;
  reg.ambient = map.theme.lightLevel ?? 0.75;
  const mL = moonLight(map.theme);

  // the crop: the spaces grown by the longest fixed-lamp reach on the map, rounded up, plus 1 m (L1 step 2a), clamped to
  // the map's light bounds. A fixed lamp's registry `radius` is already its reach (`lampReach` of the authored radius,
  // `LightRegistry.add`), the distance the bake and the field use.
  const fixed = reg.lights.filter((l) => l.kind !== 'flashlight');
  const R = Math.ceil(Math.max(0, ...fixed.map((l) => l.radius))) + 1;
  const minX = Math.min(...spaces.map((s) => s.rect.minX));
  const maxX = Math.max(...spaces.map((s) => s.rect.maxX));
  const minZ = Math.min(...spaces.map((s) => s.rect.minZ));
  const maxZ = Math.max(...spaces.map((s) => s.rect.maxZ));
  const topY = Math.max(...spaces.map((s) => s.floor ?? 0)) + 16;
  const lo: [number, number, number] = [Math.floor(Math.max(set.lo[0], minX - R)), Math.floor(set.lo[1]), Math.floor(Math.max(set.lo[2], minZ - R))];
  const hi: [number, number, number] = [Math.ceil(Math.min(set.hi[0], maxX + R)), Math.ceil(Math.min(set.hi[1], topY)), Math.ceil(Math.min(set.hi[2], maxZ + R))];

  // the fixed lights whose reach touches any of the spaces (plan distance to its rectangle < reach)
  const touches = (l: LightDef): boolean => {
    if (l.kind === 'flashlight') return false;
    if (l.x < lo[0] || l.x > hi[0] || l.z < lo[2] || l.z > hi[2] || l.y > hi[1]) return false;
    return spaces.some((s) => {
      const dx = Math.max(s.rect.minX - l.x, 0, l.x - s.rect.maxX);
      const dz = Math.max(s.rect.minZ - l.z, 0, l.z - s.rect.maxZ);
      return Math.sqrt(dx * dx + dz * dz) < l.radius;
    });
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
  log(`baked ${ids.length} lamps over (${lo.join(', ')})..(${hi.join(', ')}) in ${Date.now() - t1} ms`);
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, lo, hi);
  const s = map.theme.sunDir;
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
  const solids = b.boxes.filter((bx) => bx.collide);
  const solidAt = (x: number, y: number, z: number): boolean => {
    for (const bx of solids) {
      if (y < bx.c[1] - bx.s[1] / 2 || y > bx.c[1] + bx.s[1] / 2) continue;
      const c = Math.cos(-bx.yaw), sn = Math.sin(-bx.yaw);
      const dx = x - bx.c[0], dz = z - bx.c[2];
      const lx = dx * c + dz * sn, lz = -dx * sn + dz * c;
      if (Math.abs(lx) <= bx.s[0] / 2 && Math.abs(lz) <= bx.s[2] / 2) return true;
    }
    return false;
  };

  // (L1 step 2b) near cover: a solid that rises through the plane (bottom at or under it, top over it); its footprint in
  // plan (a box's rotated rectangle, a cylinder's circle) within COVER_MARGIN of the cell. Cars by their size (the S1
  // car body 1.8 x 1.5 x 4.2), poles = every cylinder.
  const isCar = (bx: (typeof solids)[number]): boolean => Math.abs(bx.s[1] - 1.5) < 0.05 && Math.abs(Math.min(bx.s[0], bx.s[2]) - 1.8) < 0.05 && Math.abs(Math.max(bx.s[0], bx.s[2]) - 4.2) < 0.05;
  const cyls = b.cylinders.filter((c) => c.collide);
  const boxPlan = (bx: (typeof solids)[number], x: number, z: number): number => {
    const c = Math.cos(-bx.yaw), sn = Math.sin(-bx.yaw);
    const dx = x - bx.c[0], dz = z - bx.c[2];
    const lx = Math.abs(dx * c + dz * sn) - bx.s[0] / 2, lz = Math.abs(-dx * sn + dz * c) - bx.s[2] / 2;
    const ox = Math.max(lx, 0), oz = Math.max(lz, 0);
    return Math.sqrt(ox * ox + oz * oz);
  };
  const coverAt = (x: number, y: number, z: number): CoverCause | null => {
    let best = Infinity;
    let cause: CoverCause | null = null;
    for (const bx of solids) {
      if (bx.c[1] - bx.s[1] / 2 > y + 1e-6 || bx.c[1] + bx.s[1] / 2 <= y) continue;
      const d = boxPlan(bx, x, z);
      if (d <= COVER_MARGIN && d < best) {
        best = d;
        cause = isCar(bx) ? 'car' : 'other';
      }
    }
    for (const c of cyls) {
      if (c.c[1] - c.h / 2 > y + 1e-6 || c.c[1] + c.h / 2 <= y) continue;
      const d = Math.max(0, Math.sqrt((x - c.c[0]) ** 2 + (z - c.c[2]) ** 2) - c.r);
      if (d <= COVER_MARGIN && d < best) {
        best = d;
        cause = 'pole';
      }
    }
    return cause;
  };
  // (L1) what hides a lamp from a cell: the first solid (box or cylinder) the segment crosses, by its kind
  const segBox = (bx: (typeof solids)[number], p: readonly number[], q: readonly number[]): boolean => {
    const c = Math.cos(-bx.yaw), sn = Math.sin(-bx.yaw);
    const loc = (v: readonly number[]): [number, number, number] => {
      const dx = v[0]! - bx.c[0], dz = v[2]! - bx.c[2];
      return [dx * c + dz * sn, v[1]! - bx.c[1], -dx * sn + dz * c];
    };
    const a = loc(p), e = loc(q);
    const h = [bx.s[0] / 2, bx.s[1] / 2, bx.s[2] / 2];
    let t0 = 0, t1 = 1;
    for (let k = 0; k < 3; k++) {
      const d = e[k]! - a[k]!;
      if (Math.abs(d) < 1e-12) {
        if (Math.abs(a[k]!) > h[k]!) return false;
        continue;
      }
      let u = (-h[k]! - a[k]!) / d, w = (h[k]! - a[k]!) / d;
      if (u > w) [u, w] = [w, u];
      t0 = Math.max(t0, u);
      t1 = Math.min(t1, w);
      if (t0 > t1) return false;
    }
    return t1 > 1e-4 && t0 < 1 - 1e-4;
  };
  const segCyl = (cy: (typeof cyls)[number], p: readonly number[], q: readonly number[]): boolean => {
    const dx = q[0]! - p[0]!, dz = q[2]! - p[2]!;
    const fx = p[0]! - cy.c[0], fz = p[2]! - cy.c[2];
    const A = dx * dx + dz * dz;
    if (A < 1e-12) return false;
    const B = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - cy.r * cy.r;
    const disc = B * B - 4 * A * C;
    if (disc < 0) return false;
    const sq = Math.sqrt(disc);
    const lo2 = Math.max(0.0001, (-B - sq) / (2 * A)), hi2 = Math.min(0.9999, (-B + sq) / (2 * A));
    if (lo2 > hi2) return false;
    const yb = cy.c[1] - cy.h / 2, yt = cy.c[1] + cy.h / 2;
    const ya = p[1]! + (q[1]! - p[1]!) * lo2, yc = p[1]! + (q[1]! - p[1]!) * hi2;
    return Math.max(ya, yc) >= yb && Math.min(ya, yc) <= yt;
  };
  const darkCause = (x: number, y: number, z: number): DarkCause => {
    let best = Infinity;
    let lamp: LightDef | null = null;
    for (const id of ids) {
      const l = reg.lights[id]!;
      if (!l.on || l.intensity <= 0) continue;
      const d = Math.sqrt((l.x - x) ** 2 + (l.y - y) ** 2 + (l.z - z) ** 2);
      if (d < l.radius && d < best) {
        best = d;
        lamp = l;
      }
    }
    if (!lamp) return 'reach';
    // the segment stops 0.5 m short of the light point: the fixture's own pole or arm is not what hides it
    const p = [x, y, z];
    const sh = Math.max(0, 1 - 0.5 / Math.max(best, 1e-6));
    const q = [x + (lamp.x - x) * sh, y + (lamp.y - y) * sh, z + (lamp.z - z) * sh];
    let hit: CoverCause | null = null;
    let tBest = Infinity;
    for (const bx of solids) {
      if (!segBox(bx, p, q)) continue;
      const t = Math.sqrt((bx.c[0] - x) ** 2 + (bx.c[2] - z) ** 2);
      if (t < tBest) {
        tBest = t;
        hit = isCar(bx) ? 'car' : 'other';
      }
    }
    for (const cy of cyls) {
      if (!segCyl(cy, p, q)) continue;
      const t = Math.sqrt((cy.c[0] - x) ** 2 + (cy.c[2] - z) ** 2);
      if (t < tBest) {
        tBest = t;
        hit = 'pole';
      }
    }
    return hit ?? 'spacing';
  };

  // a cell's lux with the lamps added in lux: each baked lamp read on its own; the rest (ambient, moon, bounce) is the
  // level minus the lamps, or, where the level is clamped at 1, rebuilt from its parts (the ambient's source unsmoothed)
  const contrib = new Float64Array(ids.length);
  const luxAt = (x: number, y: number, z: number, v: number): number => {
    let sum = 0;
    for (let i = 0; i < ids.length; i++) {
      const c = field.lampAt(i, x, y, z);
      contrib[i] = c;
      sum += c;
    }
    let base: number;
    if (v < 1 - 1e-9) base = v - sum;
    else {
      const zv = reg.zoneAt(x, y, z);
      base = (zv === zv ? zv : sky) + field.bounceAt(x, y, z) + mL * field.moonAt(x, y, z);
    }
    return sumLux(base < 0 ? 0 : base > 1 ? 1 : base, contrib);
  };

  const sample = (sp: SpaceDef, y: number): { level: (number | null)[][]; lux: (number | null)[][]; vals: number[]; luxVals: number[]; open: boolean[]; xz: [number, number][]; cover: [number, number, CoverCause][] } => {
    const level: (number | null)[][] = [];
    const lux: (number | null)[][] = [];
    const vals: number[] = [];
    const luxVals: number[] = [];
    const open: boolean[] = [];
    const xz: [number, number][] = [];
    const cover: [number, number, CoverCause][] = [];
    for (let z = sp.rect.maxZ; z >= sp.rect.minZ - 1e-9; z -= step) {
      const row: (number | null)[] = [];
      const lrow: (number | null)[] = [];
      for (let x = sp.rect.minX; x <= sp.rect.maxX + 1e-9; x += step) {
        if (solidAt(x, y, z)) {
          row.push(null);
          lrow.push(null);
          continue;
        }
        const v = field.levelAt(x, y, z);
        const e = luxAt(x, y, z, v);
        row.push(r3(v));
        lrow.push(r2(e));
        vals.push(v);
        luxVals.push(e);
        const cv = coverAt(x, y, z);
        open.push(cv === null);
        xz.push([r2(x), r2(z)]);
        if (cv) cover.push([r2(x), r2(z), cv]);
      }
      level.push(row);
      lux.push(lrow);
    }
    return { level, lux, vals, luxVals, open, xz, cover };
  };

  const out: SpaceOut[] = [];
  for (const sp of spaces) {
    const floor = sp.floor ?? 0;
    const py = floor + sp.plane;
    const my = floor + 1.0;
    const p = sample(sp, py);
    const mtr = sample(sp, my);
    const check = sp.band ? spaceCheck(p.vals, sp.band, p.luxVals, p.open) : null;
    const cols = p.level[0]?.length ?? 0;
    const byCause: Record<CoverCause, number> = { car: 0, pole: 0, other: 0 };
    for (const c of p.cover) byCause[c[2]]++;
    const dark: [number, number, number, DarkCause][] = [];
    if (sp.band?.min !== undefined) {
      for (let i = 0; i < p.luxVals.length; i++) {
        if (!p.open[i] || p.luxVals[i]! >= sp.band.min) continue;
        const [x, z] = p.xz[i]!;
        dark.push([x, z, r2(p.luxVals[i]!), darkCause(x, py, z)]);
      }
    }
    out.push({
      id: sp.id,
      section: sp.section ?? null,
      name: sp.name,
      type: sp.type,
      category: sp.category ?? null,
      band: sp.band,
      verify: !!sp.verify,
      why: sp.why ?? null,
      grid: { x0: sp.rect.minX, z0: sp.rect.maxZ, step, cols, rows: p.level.length },
      plane: { y: r3(py), stats: stats(p.vals, p.luxVals, p.open), check: check ? roundCheck(check) : null, level: p.level, lux: p.lux },
      cover: { n: p.cover.length, byCause, cells: p.cover },
      dark,
      meter: { y: r3(my), stats: stats(mtr.vals, mtr.luxVals), level: mtr.level },
    });
    log(`sampled ${sp.id} (${cols} x ${p.level.length})`);
  }
  const lampsOut = ids.map((id) => {
    const l = reg.lights[id]!;
    // (L1) its pole: the nearest cylinder within 1.2 m in plan whose top is at or over the light point less 0.5 m
    let pole: [number, number] | null = null;
    let pd = 1.2;
    for (const c of cyls) {
      const d = Math.sqrt((c.c[0] - l.x) ** 2 + (c.c[2] - l.z) ** 2);
      if (d <= pd && c.c[1] + c.h / 2 >= l.y - 0.5) {
        pd = d;
        pole = [r3(c.c[0]), r3(c.c[2])];
      }
    }
    return { id, kind: l.kind, x: l.x, y: l.y, z: l.z, radius: r3(l.radius / lampReach(1)), reach: r3(l.radius), i: l.intensity, group: l.group, circuit: circuitName(map.id, l.group), on: l.on, coneOuterRad: l.cone ? r3(Math.acos(l.cone.cosOuter)) : null, pole };
  });
  return {
    meta: {
      map: map.id,
      section: opts.section ?? null,
      space: opts.space ?? null,
      crop: { lo, hi, margin: R },
      coverMargin: COVER_MARGIN,
      step,
      lamps: ids.length,
      moonLight: r3(mL),
      thresholds: { shadow: LIGHT.shadow, lit: LIGHT.lit },
      curve: `level = ${LUX_ANCHORS.lo.level} + ${r3(LUX_ANCHORS.hi.level - LUX_ANCHORS.lo.level)} x log10(lux)`,
      luxSum: 'lamps added in lux, each read alone over the reference floor (sumLux, L0 check note 1)',
      ms: Date.now() - t0,
    },
    spaces: out,
    lamps: lampsOut,
  };
}

function stats(vals: number[], luxVals: number[], open?: readonly boolean[]): Stats {
  const nn = vals.length;
  if (!nn) return { n: 0, min: 0, mean: 0, max: 0, u0: 0, darkShare: 0, midShare: 0, litShare: 0, meanLux: 0, minLux: 0, minLuxAll: 0, u0Lux: 0, u0LuxAll: 0 };
  let sum = 0, min = Infinity, max = -Infinity, dark = 0, mid = 0, lit = 0, lux = 0, minLux = Infinity, minLuxAll = Infinity;
  for (let i = 0; i < nn; i++) {
    const v = vals[i]!;
    const e = luxVals[i]!;
    sum += v;
    lux += e;
    if (e < minLuxAll) minLuxAll = e;
    if ((!open || open[i]) && e < minLux) minLux = e;
    if (v < min) min = v;
    if (v > max) max = v;
    if (v < LIGHT.shadow) dark++;
    else if (v < LIGHT.lit) mid++;
    else lit++;
  }
  const mean = sum / nn;
  if (minLux === Infinity) minLux = minLuxAll;
  const meanLux = lux / nn;
  return { n: nn, min: r3(min), mean: r3(mean), max: r3(max), u0: r3(min / mean), darkShare: r3(dark / nn), midShare: r3(mid / nn), litShare: r3(lit / nn), meanLux: r2(meanLux), minLux: r2(minLux), minLuxAll: r2(minLuxAll), u0Lux: r3(meanLux > 0 ? minLux / meanLux : 0), u0LuxAll: r3(meanLux > 0 ? minLuxAll / meanLux : 0) };
}

/**
 * (L1 step 2b) `bandCheck` over every open cell (the mean: the standards average the whole area), with the point minimum
 * and U0 read on open ground only (`open[i]`: not within `COVER_MARGIN` of a solid); `minLuxAll` / `u0All` keep every cell.
 */
export function spaceCheck(levels: readonly number[], band: LuxBand, lux: readonly number[], open: readonly boolean[]): SpaceCheck {
  const all = bandCheck(levels, band, lux);
  const ol: number[] = [];
  const ox: number[] = [];
  for (let i = 0; i < levels.length; i++) if (open[i]) {
    ol.push(levels[i]!);
    ox.push(lux[i]!);
  }
  const og = ol.length ? bandCheck(ol, band, ox) : all;
  const minLux = og.minLux;
  const u0 = all.meanLux > 0 ? minLux / all.meanLux : 0;
  const passMin = band.min === undefined || (all.n > 0 && minLux >= band.min);
  const passU0 = band.u0 === undefined || (all.n > 0 && u0 >= band.u0);
  return { ...all, minLux, u0, passMin, passU0, pass: all.passMean && all.passMax && passMin && passU0, minLuxAll: all.minLux, u0All: all.u0 };
}

function roundCheck(c: SpaceCheck): SpaceCheck {
  return { ...c, meanLevel: r3(c.meanLevel), meanLux: r2(c.meanLux), minLux: r2(c.minLux), maxLux: r2(c.maxLux), u0: r3(c.u0), floorLux: r2(c.floorLux), ceilLux: r2(c.ceilLux), minLuxAll: r2(c.minLuxAll), u0All: r3(c.u0All) };
}

/** (L1) A lamp's circuit name for the light map's legend (the map's named groups; others `group <n>`). */
export function circuitName(map: string, group: number): string {
  if (map === 'campusOps') {
    if (group === S1_GROUPS.parkW) return 's1-park-w';
    if (group === S1_GROUPS.parkE) return 's1-park-e';
    if (group === S1_GROUPS.lane) return 'lane';
  }
  return `group ${group}`;
}

/**
 * A space's heat map as SVG at 1 m = 10 px (the sign-off scale): one cell per grid point coloured by level (the
 * meter's bands: dark under 0.28, lit from 0.6), solids hatched grey, north up, a 10 m scale bar, the band verdict.
 */
export function heatSvg(sp: SpaceOut, which: 'plane' | 'meter' = 'plane'): string {
  return drawSvg(sp, which, 0, null);
}

/** A lamp as the light map draws it (the `lamps` rows of `run`'s output). */
export interface MapLamp {
  x: number;
  y: number;
  z: number;
  circuit: string;
  on: boolean;
  pole: readonly [number, number] | null;
}

/** The light map's circuit colours (legend order); any other circuit is grey. */
const CIRCUIT_COLOURS: [string, string][] = [
  ['s1-park-w', '#4fc3f7'],
  ['s1-park-e', '#f06292'],
  ['lane', '#aed581'],
];

/**
 * (L1 step 2c) The sign-off light map: `heatSvg`'s plane map with a 6 m margin, every fixed lamp of the crop inside the
 * drawing (its pole dot, its arm line, its light point in its circuit's colour; legend), and a ring round each open-ground
 * cell under the band's point minimum, labelled with its cause (`DarkCause`). 1 m = 10 px, 10 m scale bar, north arrow.
 */
export function lightMapSvg(sp: SpaceOut, lamps: readonly MapLamp[]): string {
  return drawSvg(sp, 'plane', 6, lamps);
}

function drawSvg(sp: SpaceOut, which: 'plane' | 'meter', pad: number, lamps: readonly MapLamp[] | null): string {
  const PX = 10;
  const g = sp.grid;
  const grid = which === 'plane' ? sp.plane.level : sp.meter.level;
  const w = g.cols * g.step * PX;
  const h = g.rows * g.step * PX;
  const P = pad * PX;
  const top = 34 + P;
  const W = Math.max(w + 2 * P, 260) + 20;
  const legend = lamps ? 4 : 0;
  const H = top + h + P + 40 + legend * 14;
  const c = which === 'plane' ? sp.plane.check : null;
  const s = which === 'plane' ? sp.plane.stats : sp.meter.stats;
  const verdict = sp.band ? (c?.pass ? 'PASS' : 'FAIL') : 'no band';
  const bandTxt = sp.band ? `band ${sp.band.avg} lx${sp.band.min !== undefined ? `, min ${sp.band.min} lx` : ''}${sp.band.u0 !== undefined ? `, U0 ${sp.band.u0}` : ''}` : (sp.why ?? 'no band');
  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif" font-size="11">`);
  lines.push(`<rect width="${W}" height="${H}" fill="#111"/>`);
  lines.push(`<text x="10" y="14" fill="#eee">${esc(sp.name)} (${sp.id}) y ${which === 'plane' ? sp.plane.y : sp.meter.y}: mean ${s.meanLux} lx (level ${s.mean}), min ${s.minLux} lx${lamps ? ` open ground (${s.minLuxAll} lx every cell)` : ''}, ${verdict}</text>`);
  lines.push(`<text x="10" y="28" fill="#aaa">${esc(sp.type)}${sp.category ? ` ${esc(sp.category)}` : ''}; ${esc(bandTxt)}${sp.verify ? ' (to verify)' : ''}</text>`);
  const left = 10 + P;
  grid.forEach((row, j) => {
    let line = '';
    row.forEach((v, i) => {
      const x = left + i * g.step * PX;
      const y = top + j * g.step * PX;
      line += `<rect x="${x}" y="${y}" width="${g.step * PX}" height="${g.step * PX}" fill="${v === null ? '#555' : colour(v)}"/>`;
    });
    lines.push(line);
  });
  if (lamps) {
    // world (x, z) to the centre of its cell's square
    const px = (x: number): number => Math.round((left + (x - g.x0) * PX + (g.step * PX) / 2) * 10) / 10;
    const py = (z: number): number => Math.round((top + (g.z0 - z) * PX + (g.step * PX) / 2) * 10) / 10;
    const x0 = g.x0 - pad, x1 = g.x0 + g.cols * g.step + pad - 1, z1 = g.z0 + pad, z0 = g.z0 - g.rows * g.step - pad + 1;
    const inDraw = (x: number, z: number): boolean => x >= x0 && x <= x1 && z >= z0 && z <= z1;
    for (const [x, z, , cause] of sp.dark) {
      lines.push(`<circle cx="${px(x)}" cy="${py(z)}" r="6" fill="none" stroke="#ff5252" stroke-width="1.5"/><text x="${px(x) + 7}" y="${py(z) - 4}" fill="#ff8a80" font-size="8">${cause}</text>`);
    }
    for (const l of lamps) {
      if (!inDraw(l.x, l.z)) continue;
      const col = CIRCUIT_COLOURS.find(([n]) => n === l.circuit)?.[1] ?? '#bbb';
      if (l.pole) {
        lines.push(`<line x1="${px(l.pole[0])}" y1="${py(l.pole[1])}" x2="${px(l.x)}" y2="${py(l.z)}" stroke="#ddd" stroke-width="2"/>`);
        lines.push(`<circle cx="${px(l.pole[0])}" cy="${py(l.pole[1])}" r="2.5" fill="#222" stroke="#ddd"/>`);
      }
      lines.push(`<circle cx="${px(l.x)}" cy="${py(l.z)}" r="4" fill="${col}" stroke="#111"${l.on ? '' : ' fill-opacity="0.3"'}/>`);
    }
  }
  // scale bar (10 m) and north arrow
  const sy = top + h + P + 14;
  lines.push(`<rect x="10" y="${sy}" width="${10 * PX}" height="4" fill="#eee"/><text x="${14 + 10 * PX}" y="${sy + 6}" fill="#eee">10 m</text>`);
  lines.push(`<text x="${W - 30}" y="${top + 14}" fill="#eee">N</text><path d="M ${W - 26} ${top + 18} l 0 14 M ${W - 30} ${top + 22} l 4 -4 l 4 4" stroke="#eee" fill="none"/>`);
  lines.push(`<text x="10" y="${sy + 22}" fill="#aaa">x ${g.x0}..${g.x0 + (g.cols - 1) * g.step}, z ${g.z0}..${g.z0 - (g.rows - 1) * g.step}; dark &lt; ${LIGHT.shadow} (1 lx), lit &gt;= ${LIGHT.lit} (10 lx); grey = solid</text>`);
  if (lamps) {
    const ly = sy + 36;
    let lx = 10;
    for (const [n, col] of CIRCUIT_COLOURS) {
      lines.push(`<circle cx="${lx + 4}" cy="${ly - 4}" r="4" fill="${col}"/><text x="${lx + 12}" y="${ly}" fill="#eee">${n}</text>`);
      lx += 90;
    }
    lines.push(`<text x="10" y="${ly + 14}" fill="#aaa">grey dot = pole, white line = arm, coloured dot = light point (its circuit);</text>`);
    lines.push(`<text x="10" y="${ly + 28}" fill="#aaa">red ring = open ground under ${sp.band?.min ?? '-'} lx, with its cause</text>`);
    const st = sp.plane.stats;
    lines.push(`<text x="10" y="${ly + 42}" fill="#eee">average ${st.meanLux} lux (target ${sp.band?.avg ?? '-'} or more), darkest open spot ${st.minLux} lux (target ${sp.band?.min ?? '-'} or more), ${sp.dark.length} dark spots left</text>`);
  }
  lines.push('</svg>');
  return lines.join('\n') + '\n';
}

/** Level to a colour: navy (0) through the dark line (0.28, 1 lx) to amber at lit (0.6, 10 lx) and white at 1. */
function colour(v: number): string {
  const stops: [number, [number, number, number]][] = [
    [0, [10, 12, 40]],
    [0.28, [40, 60, 140]],
    [0.6, [230, 170, 40]],
    [1, [255, 255, 235]],
  ];
  let k = 0;
  while (k < stops.length - 2 && v > stops[k + 1]![0]) k++;
  const [a, ca] = stops[k]!;
  const [bb, cb] = stops[k + 1]!;
  const t = Math.max(0, Math.min(1, (v - a) / (bb - a)));
  const ch = (i: number): string => Math.round(ca[i]! + (cb[i]! - ca[i]!) * t).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
