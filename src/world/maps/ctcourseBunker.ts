import type { LevelBuilder } from '../levelBuilder';

/**
 * Marlow Yard as an underground bunker (job marlow-bunker, `docs/marlow-bunker/BRIEF.md`; the approved plan is the
 * orchestrator's Marlow Yard audit): the dressing that carries no gameplay. Every piece here is `collide = false` (no
 * ledge, no step, no nav surface, no camera stop). Pieces thinner than the bake's 5 cm (`CANON_MIN_THICK`: paint, seams,
 * strips, rods, frames, doors) never change the light; the ribs and haunches are thicker and sit in the bake (only near
 * the ceiling, at least 2 m from any lamp at the ceiling). The colours keep yellow, green and blue-grey for the floor
 * marks. Prototype greybox (G4): no new art assets.
 */

const STEEL = '#8d949b';
const RIB = '#373b40';
const SEAM = '#2c3034';
const LED = '#dfe8f0';
const LIFT = '#5d646b';
const SIGNAL = '#cfe6ff';
const PAINT = '#d6dadf';
const HAZARD = '#1d1f22';

/** Paint and plates: this thin, so the light bake never sees them. */
const THIN = 0.02;

/** A cell's colour band (at 1.2 m on the long walls, the station's wayfinding colour), by station 1-8. */
export const CELL_BANDS: readonly string[] = ['#9b4f3f', '#7d5aa0', '#b54a2e', '#a83434', '#8a6a4a', '#4a3fae', '#a04a7a', '#e2e4e6'];

/**
 * A bay's ceiling dressing: ribs 0.3 deep across the span every ~4 m (none within 2 m of a lamp at the ceiling), a 1 m
 * chamfered haunch along each long wall (a pitched box: never a ledge), two LED strips along the hall.
 * `x0` .. `x1`: the bay; `ceil`: the ceiling's underside; `w`: the hall's width (z 0 .. w).
 */
export function bayCeiling(b: LevelBuilder, x0: number, x1: number, ceil: number, w: number, ceilingLampXs: readonly number[]): void {
  for (const dx of [2, 6.5, 10.5, 14.5]) {
    const x = x0 + dx;
    if (x >= x1 || ceilingLampXs.some((lx) => Math.abs(lx - x) < 2)) continue;
    b.box(x, ceil - 0.15, w / 2, 0.3, 0.3, w - 0.3, RIB, 0, 0, false);
  }
  // the haunches: a 1.41 m square bar on the corner, turned 45 deg: 1 m down the wall, 1 m along the ceiling
  const s = Math.SQRT2;
  for (const z of [0.15, w - 0.15]) b.box((x0 + x1) / 2, ceil, z, x1 - x0, s, s, RIB, 0, Math.PI / 4, false);
  for (const z of [w / 2 - 3.5, w / 2 + 3.5]) b.box((x0 + x1) / 2, ceil - THIN / 2, z, x1 - x0 - 0.4, THIN, 0.06, LED, 0, 0, false);
}

/** Panel seams every 2 m on both long walls (floor to the haunch) and the cell's colour band at 1.2 m. */
export function bayWalls(b: LevelBuilder, x0: number, x1: number, ceil: number, w: number, band: string): void {
  const top = ceil - 1;
  for (const z of [0.15 + THIN / 2, w - 0.15 - THIN / 2]) {
    for (let x = x0 + 2; x < x1 - 0.5; x += 2) b.box(x, top / 2, z, 0.03, top, THIN, SEAM, 0, 0, false);
    b.box((x0 + x1) / 2, 1.2, z, x1 - x0, 0.3, THIN, band, 0, 0, false);
  }
}

/**
 * A hazard frame and a status lamp (visual) round a 1.2 m door in a cross wall at x (both faces); door z0 .. z0 + w.
 * (marlow-variety) The jambs are black with white diagonal stripes (hazard, kept off yellow), the head steel.
 */
export function doorFrame(b: LevelBuilder, x: number, thick: number, z0: number, w: number, h = 2.1): void {
  for (const sx of [-1, 1]) {
    const fx = x + sx * (thick / 2 + THIN / 2);
    for (const jz of [z0 - 0.06, z0 + w + 0.06]) {
      b.box(fx, h / 2, jz, THIN, h, 0.12, HAZARD, 0, 0, false);
      // each stripe, tilted 45 deg, spans the 0.12 m jamb and no more
      for (let y = 0.25; y < h - 0.1; y += 0.42) b.box(fx + sx * (THIN / 2 + 0.003), y, jz, 0.005, 0.035, 0.12 * Math.SQRT2 - 0.035, PAINT, 0, Math.PI / 4, false);
    }
    b.box(fx, h + 0.06, z0 + w / 2, THIN, 0.12, w + 0.24, STEEL, 0, 0, false);
    b.box(fx, h + 0.3, z0 + w / 2, THIN, 0.1, 0.3, SIGNAL, 0, 0, false);
  }
}

/** The airlock lid's 45 deg haunches along both side walls (faces at z `zs`), x0 .. x1, under a lid at y `lid`. */
export function lidHaunches(b: LevelBuilder, x0: number, x1: number, lid: number, zs: readonly number[]): void {
  const s = 0.3 * Math.SQRT2;
  for (const z of zs) b.box((x0 + x1) / 2, lid, z, x1 - x0, s, s, RIB, 0, Math.PI / 4, false);
}

/** A pendant's two 0.04 m rods from the fitting's top (y) up to the ceiling. */
export function pendantRods(b: LevelBuilder, x: number, y: number, z: number, ceil: number, spread = 0.5): void {
  const h = ceil - y;
  if (h <= 0.01) return;
  for (const dx of [-spread, spread]) b.box(x + dx, y + h / 2, z, 0.04, h, 0.04, STEEL, 0, 0, false);
}

/** A caged bulkhead's guard: four thin bars round the fitting (x, z) from y0 down to y1. */
export function bulkheadCage(b: LevelBuilder, x: number, z: number, top: number, bottom: number): void {
  const h = top - bottom;
  for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]] as const) b.box(x + dx, bottom + h / 2, z + dz, THIN, h, THIN, STEEL, 0, 0, false);
  b.box(x, bottom, z, 0.36, THIN, THIN, STEEL, 0, 0, false);
  b.box(x, bottom, z, THIN, THIN, 0.36, STEEL, 0, 0, false);
}

/**
 * Closed lift doors on an end wall (face at x, the hall on the `into` side, +1 or -1): two leaves with a centre line, a
 * steel frame, a call panel and an indicator. Visual only (the course starts and ends in the hall).
 */
export function liftDoors(b: LevelBuilder, x: number, into: number, zc: number, w: number, h: number): void {
  const fx = x + (into * THIN) / 2;
  b.box(fx, h / 2, zc, THIN, h, w, LIFT, 0, 0, false);
  b.box(fx + into * THIN, h / 2, zc, THIN, h, 0.03, SEAM, 0, 0, false);
  b.box(fx + into * THIN, h + 0.08, zc, THIN, 0.16, w + 0.32, STEEL, 0, 0, false);
  for (const s of [-1, 1]) b.box(fx + into * THIN, h / 2, zc + s * (w / 2 + 0.08), THIN, h + 0.16, 0.16, STEEL, 0, 0, false);
  b.box(fx + into * THIN, h + 0.4, zc, THIN, 0.18, 0.6, SIGNAL, 0, 0, false);
  b.box(fx + into * THIN, 1.2, zc + w / 2 + 0.5, THIN, 0.3, 0.16, STEEL, 0, 0, false);
}

/** Floor paint: a line from (ax, az) to (bx, bz), `wd` wide. */
export function floorLine(b: LevelBuilder, ax: number, az: number, bx: number, bz: number, wd: number, color = PAINT): void {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.sqrt(dx * dx + dz * dz);
  b.box((ax + bx) / 2, 0.012, (az + bz) / 2, wd, THIN, len, color, Math.atan2(dx, dz), 0, false);
}

/** Station 4: an emitter plate on a wall end (face at z, the gap on the `into` side): the three beam heads. */
export function emitter(b: LevelBuilder, x: number, z: number, into: number, ys: readonly number[]): void {
  const fz = z + (into * THIN) / 2;
  b.box(x, 0.9, fz, 0.22, 1.5, THIN, '#26292d', 0, 0, false);
  for (const y of ys) b.box(x, y, fz + into * THIN, 0.08, 0.08, THIN, '#e04040', 0, 0, false);
}

/** A flat plate (a hatch cover, an anchor plate): `sx` x `sz`, lying on y. */
export function plate(b: LevelBuilder, x: number, y: number, z: number, sx: number, sz: number, color = STEEL, t = 0.04): void {
  b.box(x, y + t / 2, z, sx, t, sz, color, 0, 0, false);
}

/** Paint on a vertical face along x (face at z, the paint on the `into` side): a band x0 .. x1 between y0 and y1. */
export function wallPaintX(b: LevelBuilder, x0: number, x1: number, z: number, into: number, y0: number, y1: number, color: string): void {
  b.box((x0 + x1) / 2, (y0 + y1) / 2, z + (into * THIN) / 2, x1 - x0, y1 - y0, THIN, color, 0, 0, false);
}

/** Paint on a vertical face along z (face at x, the paint on the `into` side): a band z0 .. z1 between y0 and y1. */
export function wallPaintZ(b: LevelBuilder, x: number, into: number, z0: number, z1: number, y0: number, y1: number, color: string): void {
  b.box(x + (into * THIN) / 2, (y0 + y1) / 2, (z0 + z1) / 2, THIN, y1 - y0, z1 - z0, color, 0, 0, false);
}
