/**
 * light-realism L0: any map's light field in lux, per space (read-only; the desktop half of the measurement; replaces
 * the S1-only `s1Grid.ts`). Bundled and run by `scripts/light-realism/lux-grid.mjs` (esbuild, node; no GPU, no browser).
 * It builds the map with the pure `LevelBuilder` as the unit tests do, bakes the lamps that reach the chosen spaces
 * (lamp visibility + bounce, `bakeLamps`), the moon and the ambient grid over a crop round them, and samples
 * `LightField.levelAt` - the function the light meter and the guards read - on a 1 m grid over each space at its
 * measurement plane (BRIEF A3) and at the meter's height (floor + 1.0). Each space gets its level and lux grids, the
 * band check (`bandCheck`, A4) and an SVG heat map. Spaces, types, planes and bands come from
 * `docs/light-realism/spaces/<map>.json`. Never part of `npm test`; changes nothing in src/.
 */
import { LevelBuilder } from '../../src/world/levelBuilder';
import type { MapDef } from '../../src/world/mapDef';
import { bakeLamps, LAMP_STRIDE } from '../../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../../src/voxel/skyBake';
import type { LightBake } from '../../src/world/lightBake';
import { buildAmbientGrid } from '../../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../../src/world/lightField';
import { moonLight } from '../../src/world/lampMath';
import { LIGHT, type LightDef } from '../../src/world/lights';
import { bandCheck, levelToLux, LUX_ANCHORS, type BandResult, type LuxBand } from '../../src/world/lux';

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
  plane: { y: number; stats: Stats; check: BandResult | null; level: (number | null)[][]; lux: (number | null)[][] };
  meter: { y: number; stats: Stats; level: (number | null)[][] };
}

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
  meanLux: number;
  minLux: number;
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

  // the crop: the spaces grown by 20 m (the longest reach: 12 x 1.6 = 19.2 m), clamped to the map's light bounds
  const R = 20;
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

  const sample = (sp: SpaceDef, y: number): { level: (number | null)[][]; vals: number[] } => {
    const level: (number | null)[][] = [];
    const vals: number[] = [];
    for (let z = sp.rect.maxZ; z >= sp.rect.minZ - 1e-9; z -= step) {
      const row: (number | null)[] = [];
      for (let x = sp.rect.minX; x <= sp.rect.maxX + 1e-9; x += step) {
        if (solidAt(x, y, z)) {
          row.push(null);
          continue;
        }
        const v = field.levelAt(x, y, z);
        row.push(r3(v));
        vals.push(v);
      }
      level.push(row);
    }
    return { level, vals };
  };

  const out: SpaceOut[] = [];
  for (const sp of spaces) {
    const floor = sp.floor ?? 0;
    const py = floor + sp.plane;
    const my = floor + 1.0;
    const p = sample(sp, py);
    const mtr = sample(sp, my);
    const check = sp.band ? bandCheck(p.vals, sp.band) : null;
    const cols = p.level[0]?.length ?? 0;
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
      plane: { y: r3(py), stats: stats(p.vals), check: check ? roundCheck(check) : null, level: p.level, lux: p.level.map((row) => row.map((v) => (v === null ? null : r2(levelToLux(v))))) },
      meter: { y: r3(my), stats: stats(mtr.vals), level: mtr.level },
    });
    log(`sampled ${sp.id} (${cols} x ${p.level.length})`);
  }
  const lampsOut = ids.map((id) => {
    const l = reg.lights[id]!;
    return { id, kind: l.kind, x: l.x, y: l.y, z: l.z, reach: r3(l.radius), i: l.intensity, group: l.group, on: l.on, coneOuterRad: l.cone ? r3(Math.acos(l.cone.cosOuter)) : null };
  });
  return {
    meta: {
      map: map.id,
      section: opts.section ?? null,
      space: opts.space ?? null,
      crop: { lo, hi },
      step,
      lamps: ids.length,
      moonLight: r3(mL),
      thresholds: { shadow: LIGHT.shadow, lit: LIGHT.lit },
      curve: `level = ${LUX_ANCHORS.lo.level} + ${r3(LUX_ANCHORS.hi.level - LUX_ANCHORS.lo.level)} x log10(lux)`,
      ms: Date.now() - t0,
    },
    spaces: out,
    lamps: lampsOut,
  };
}

function stats(vals: number[]): Stats {
  const nn = vals.length;
  if (!nn) return { n: 0, min: 0, mean: 0, max: 0, u0: 0, darkShare: 0, midShare: 0, litShare: 0, meanLux: 0, minLux: 0 };
  let sum = 0, min = Infinity, max = -Infinity, dark = 0, mid = 0, lit = 0, lux = 0;
  for (const v of vals) {
    sum += v;
    lux += levelToLux(v);
    if (v < min) min = v;
    if (v > max) max = v;
    if (v < LIGHT.shadow) dark++;
    else if (v < LIGHT.lit) mid++;
    else lit++;
  }
  const mean = sum / nn;
  return { n: nn, min: r3(min), mean: r3(mean), max: r3(max), u0: r3(min / mean), darkShare: r3(dark / nn), midShare: r3(mid / nn), litShare: r3(lit / nn), meanLux: r2(lux / nn), minLux: r2(levelToLux(min)) };
}

function roundCheck(c: BandResult): BandResult {
  return { ...c, meanLevel: r3(c.meanLevel), meanLux: r2(c.meanLux), minLux: r2(c.minLux), maxLux: r2(c.maxLux), u0: r3(c.u0), floorLux: r2(c.floorLux), ceilLux: r2(c.ceilLux) };
}

/**
 * A space's heat map as SVG at 1 m = 10 px (the sign-off scale): one cell per grid point coloured by level (the
 * meter's bands: dark under 0.28, lit from 0.6), solids hatched grey, north up, a 10 m scale bar, the band verdict.
 */
export function heatSvg(sp: SpaceOut, which: 'plane' | 'meter' = 'plane'): string {
  const PX = 10;
  const g = sp.grid;
  const grid = which === 'plane' ? sp.plane.level : sp.meter.level;
  const w = g.cols * g.step * PX;
  const h = g.rows * g.step * PX;
  const top = 34;
  const W = Math.max(w, 260) + 20;
  const H = top + h + 40;
  const c = which === 'plane' ? sp.plane.check : null;
  const s = which === 'plane' ? sp.plane.stats : sp.meter.stats;
  const verdict = sp.band ? (c?.pass ? 'PASS' : 'FAIL') : 'no band';
  const bandTxt = sp.band ? `band ${sp.band.avg} lx${sp.band.min !== undefined ? `, min ${sp.band.min} lx` : ''}${sp.band.u0 !== undefined ? `, U0 ${sp.band.u0}` : ''}` : (sp.why ?? 'no band');
  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif" font-size="11">`);
  lines.push(`<rect width="${W}" height="${H}" fill="#111"/>`);
  lines.push(`<text x="10" y="14" fill="#eee">${esc(sp.name)} (${sp.id}) y ${which === 'plane' ? sp.plane.y : sp.meter.y}: mean ${s.meanLux} lx (level ${s.mean}), min ${s.minLux} lx, ${verdict}</text>`);
  lines.push(`<text x="10" y="28" fill="#aaa">${esc(sp.type)}${sp.category ? ` ${esc(sp.category)}` : ''}; ${esc(bandTxt)}${sp.verify ? ' (to verify)' : ''}</text>`);
  grid.forEach((row, j) => {
    let line = '';
    row.forEach((v, i) => {
      const x = 10 + i * g.step * PX;
      const y = top + j * g.step * PX;
      line += `<rect x="${x}" y="${y}" width="${g.step * PX}" height="${g.step * PX}" fill="${v === null ? '#555' : colour(v)}"/>`;
    });
    lines.push(line);
  });
  // scale bar (10 m) and north arrow
  const sy = top + h + 14;
  lines.push(`<rect x="10" y="${sy}" width="${10 * PX}" height="4" fill="#eee"/><text x="${14 + 10 * PX}" y="${sy + 6}" fill="#eee">10 m</text>`);
  lines.push(`<text x="${W - 30}" y="${top + 14}" fill="#eee">N</text><path d="M ${W - 26} ${top + 18} l 0 14 M ${W - 30} ${top + 22} l 4 -4 l 4 4" stroke="#eee" fill="none"/>`);
  lines.push(`<text x="10" y="${sy + 22}" fill="#aaa">x ${g.x0}..${g.x0 + (g.cols - 1) * g.step}, z ${g.z0}..${g.z0 - (g.rows - 1) * g.step}; dark &lt; ${LIGHT.shadow} (1 lx), lit &gt;= ${LIGHT.lit} (10 lx); grey = solid</text>`);
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
