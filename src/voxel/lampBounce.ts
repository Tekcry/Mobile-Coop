/**
 * (LR16-1) One-bounce fill (pure; runs in the voxel workers beside the lamp bake, cached with it). Real rooms return
 * 1/5-2/5 of the direct light to their walls and ceiling (`docs/lighting-review/PROPOSAL.md:268-270`); before this the
 * walls took N.L of the direct term only and every ceiling over a downward lamp was black.
 *
 * Per lamp, from its own baked visibility (`bakeLamps`):
 * 1. Surface patches: every `LAMP_CELL` air cell the lamp sees (vis > 0) with an occupied 6-neighbour is a patch per
 *    occupied face (area `LAMP_CELL^2`, normal from the occupied neighbour to the air cell). Its irradiance per unit
 *    intensity: `photoTerm` (LR16b's feathered formula, the field's own) x vis x max(0, n . L).
 * 2. One virtual point light (VPL) per 1 m ambient cell: flux `albedo x sum(E x A)`, flux-weighted position and normal.
 * 3. Fixture uplight: a downward lamp (no cone) leaks `uplight` of its level upwards, so the ceiling over it is never
 *    black: one VPL at the lamp + 0.1 m, normal +y, flux `uplight x pi`.
 * 4. Splat to the 1 m receiver cells of the ambient grid within `reach`: `PHI x max(0, n . w) / (pi x (d^2 + near^2))`
 *    x the photometric window `(1 - (d / reach)^4)^2`, an omni receiver (the meter has no normal), when a march on the
 *    0.2 m occupancy reaches the cell's centre (LR16-1 fix round: the centre only, so a cell a wall crosses holds the
 *    light of the side its centre is on, never a share of the far side's; a room behind a wall nothing).
 * 5. Out: the receivers' integer box grown by a cell (ambient cells from the grid's origin), `Uint16` steps of
 *    `BOUNCE.q` per unit intensity, and the box's static wall bits (`bounceBits`). `world/bounceGrid.ts` sums the lit
 *    lamps' boxes at runtime (exact integers), so a shot or switched lamp takes its bounce with it; the meter, the
 *    guards and the picture read the same bytes and blend them only between cells no wall parts.
 */
import { rasterise } from './shapes';
import { LAMP_CONE_COS, LAMP_EXP, photoTerm, SPOT_EXP } from '../world/lampMath';
import { AMBIENT_CELL } from '../world/ambientGrid';

/**
 * The bounce's constants. Check of the numbers: a 3 m pool of level ~1 (28 m^2 lit at ~0.6 mean) returns
 * PHI ~ 0.35 x 17 ~ 5.9; a wall 2 m from the pool's middle reads ~ 5.9 x 0.5 / (pi x 4.25) ~ 0.22: inside the 1/5-2/5
 * of the direct light real rooms return. The cache key does not hash these: retuning any of them (LR16g: albedo) bumps
 * `LAMP_VERSION` (`lampJobs.ts`); so does retuning `BOUNCE_SUB`, `BOUNCE_T_STEP`, `BOUNCE_T_FAR` or `BOUNCE_T_SHIFT`
 * (the wall bits are baked with the bounce and cached under the same key), or any rule of `bounceBits`.
 */
export const BOUNCE = {
  /** Average indoor surface reflectance (concrete 0.3-0.4, painted plaster 0.5-0.7, dark floors 0.1-0.2). */
  albedo: 0.35,
  /** Metres a VPL reaches; at 4 m a patch's share is 1/17 of its share at 1 m, and the window closes it smoothly. */
  reach: 4,
  /** m: d^2 + near^2, so a receiver right at a patch has no hot spot. */
  near: 0.5,
  /** Share of a downward lamp's level its housing leaks upwards (a level-`uplight` cosine lobe at 1 m). */
  uplight: 0.06,
  /** The uplight lobe's origin sits this far under its VPL (m; one 1 m cell): a lamp hangs near its ceiling, so the
   *  receiver cell the ceiling sits in has its centre under the lamp and a lobe from the lamp itself would miss it.
   *  From a cell lower it lights the layer the lamp hangs in and up (the cosine there: 0.75 at 0.7 m to the side, as
   *  the ceiling over it sees the fixture), and nothing a cell under. Surface VPLs: 0 (their patch is the origin). */
  uplightBack: 1,
  /** Uint16 step: at most ~2.0 level per lamp per unit intensity. */
  q: 2 ** -15,
} as const;

/** Per lamp: box origin x, y, z (ambient cells from the grid origin) and counts nx, ny, nz (0 counts: no bounce). */
export const BOUNCE_BOX_STRIDE = 6;

/**
 * Every lamp's bounce: `BOUNCE_BOX_STRIDE` ints a lamp and their cells (x fastest) one after another, steps of `BOUNCE.q`.
 * (LR16-1 fix round) `bits`: per cell of the same boxes (same order), the static walls around it (`bounceBits`); absent
 * only on hand-made test results (no walls).
 */
export interface LampBounce {
  boxes: Int32Array;
  data: Uint16Array;
  bits?: Uint16Array;
}

/**
 * (LR16-1 fix round) The walls a 1 m bounce cell knows, so the meter, the guards and the picture never blend the bounce
 * across a wall (`BounceGrid.sampleInto`, the shader's `nsGrid2`: the same arithmetic). Sixteen bits per cell, from the
 * bake's own conservative occupancy (`occupancyShapes`, grown by half a 0.2 m cell) on `BOUNCE_SUB` sub-cells a cell,
 * aligned so the centre is a sub-cell's (one answer per cell, whichever lamp computed it):
 * - bits 0-2 (1 / 2 / 4, the corner bit of the axis): a solid lies between this cell's centre and its +x / +y / +z
 *   neighbour's (either centre's sub-cell included);
 * - 2 bits per direction at `BOUNCE_T_SHIFT` (+x, -x, +y, -y, +z, -z), a code k (0: none): a point of the cell that far
 *   or farther from the centre (k x `BOUNCE_T_STEP` m) is past a wall from the centre and reads the neighbour on its
 *   side instead. The code is the wall's middle (the middle of the first solid run that starts in this half of the
 *   cell), rounded to a step; from a centre inside a solid, the step of its first air sub-cell that way (none while the
 *   solid runs on through the half cell); a wall whose middle is past `BOUNCE_T_FAR` m none. A point 0.15 m or more from a 0.2 m wall's face reads its own side wherever the wall sits.
 *   (LR16-POLISH F, the LR16-1 recheck's face-glow strips) The middle is of the run's first two sub-cells at most (a
 *   0.2 m wall grown): a wall and the hull of an object close behind it merge into one run, whose middle lay inside the
 *   object. From a centre inside a solid whose run has both ends in the cell and its middle this way (a thin wall the
 *   centre's sub-cell falls in), the code is at that middle, not at the run's grown end. From a centre inside a solid
 *   otherwise (an object's hull), no code when a second solid run lies between the run's end and the neighbour's centre
 *   (a crate's hull and the wall past it: the neighbour is the next room). Rotated walls stay out of scope.
 */
export const BOUNCE_SUB = 5;
export const BOUNCE_T_SHIFT = [3, 5, 8, 10, 12, 14] as const;
/** m a code step (3 steps: 0.15, 0.3, 0.45 from the centre). */
export const BOUNCE_T_STEP = 0.15;
/** A wall whose middle is farther than this from the centre (m) parts no point of the cell from it. */
const BOUNCE_T_FAR = 0.6;

/** The ambient grid's origin and counts over a bake box (`buildAmbientGrid`'s alignment: whole cells from floor(lo)). */
export function bounceGridDims(lo: readonly number[], hi: readonly number[]): { origin: [number, number, number]; n: [number, number, number] } {
  const A = AMBIENT_CELL;
  const origin: [number, number, number] = [Math.floor(lo[0]!), Math.floor(lo[1]!), Math.floor(lo[2]!)];
  const n: [number, number, number] = [Math.max(1, Math.ceil((hi[0]! - origin[0]) / A)), Math.max(1, Math.ceil((hi[1]! - origin[1]) / A)), Math.max(1, Math.ceil((hi[2]! - origin[2]) / A))];
  return { origin, n };
}

/** The march leaves a surface VPL this far out (m, a cell and a half's half: past its own patch's cell). */
const START_SURF = 0.15;
/** ... and the uplight VPL past the fixture's own housing and mount (`lampBake` NEAR_LIGHT). */
const START_UP = 0.25;
/** A VPL under this flux is dropped (it could not move a cell by a step). */
const PHI_MIN = 1e-6;
/** A receiver term under this is not marched (a thousandth of a step). */
const VAL_MIN = BOUNCE.q * 1e-3;

/** Is the segment (a -> b) clear on the occupancy grid, from `t0` m along it up to and including `b`'s cell? */
function clearPath(occ: Uint8Array, gx: number, gy: number, gz: number, GX: number, GY: number, GZ: number, c: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, t0: number): boolean {
  let dx = bx - ax;
  let dy = by - ay;
  let dz = bz - az;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d <= t0) return true;
  dx /= d;
  dy /= d;
  dz /= d;
  const inv = 1 / c;
  const step = c * 0.5;
  let lastX = -1;
  let lastY = -1;
  let lastZ = -1;
  for (let t = t0; ; t += step) {
    const end = t >= d;
    const s = end ? d : t;
    const qx = Math.floor((ax + dx * s - gx) * inv);
    const qy = Math.floor((ay + dy * s - gy) * inv);
    const qz = Math.floor((az + dz * s - gz) * inv);
    if (qx !== lastX || qy !== lastY || qz !== lastZ) {
      lastX = qx;
      lastY = qy;
      lastZ = qz;
      // (outside the grown box, only past the map's edge: nothing there to block)
      if (qx >= 0 && qy >= 0 && qz >= 0 && qx < GX && qy < GY && qz < GZ && occ[qx + GX * (qy + GY * qz)]) return false;
    }
    if (end) return true;
  }
}

/**
 * (LR16-1 fix round) The wall bits (`BOUNCE_SUB`) of the ambient cells in `box` (x, y, z, nx, ny, nz: cells from the
 * grid origin `A0`; `N` the grid's counts), from the bake's conservative occupancy (`occShapes` / `sb`) rasterised on
 * sub-cells aligned to the grid: every lamp computes the same bits for a cell. x fastest.
 */
export function bounceBits(occShapes: Float32Array, sb: readonly (readonly number[])[], A0: readonly number[], N: readonly number[], box: readonly number[]): Uint16Array {
  const S = BOUNCE_SUB;
  const sub = AMBIENT_CELL / S;
  const bx = box[0]!;
  const by = box[1]!;
  const bz = box[2]!;
  const tx = box[3]!;
  const ty = box[4]!;
  const tz = box[5]!;
  const out = new Uint16Array(tx * ty * tz);
  if (out.length === 0) return out;
  // sub-cells over the box and a cell past it each way (the neighbours' centres, the runs that start in this cell)
  const OX = (tx + 2) * S;
  const OY = (ty + 2) * S;
  const OZ = (tz + 2) * S;
  const o: [number, number, number] = [A0[0]! + (bx - 1) * AMBIENT_CELL, A0[1]! + (by - 1) * AMBIENT_CELL, A0[2]! + (bz - 1) * AMBIENT_CELL];
  const ex = o[0] + OX * sub;
  const ey = o[1] + OY * sub;
  const ez = o[2] + OZ * sub;
  const pick: number[] = [];
  for (let i = 0; i < sb.length; i++) {
    const b = sb[i]!;
    if (b[3]! < o[0] || b[0]! > ex || b[4]! < o[1] || b[1]! > ey || b[5]! < o[2] || b[2]! > ez) continue;
    pick.push(i);
  }
  const occ = new Uint8Array(OX * OY * OZ);
  rasterise(occShapes, occ, o, sub, OX, OY, OZ, pick);
  const stride = [1, OX, OX * OY];
  const half = (S - 1) / 2;
  const gi = [0, 0, 0];
  for (let z = 0; z < tz; z++) {
    for (let y = 0; y < ty; y++) {
      for (let x = 0; x < tx; x++) {
        const c = (x + 1) * S + half + OX * ((y + 1) * S + half + OY * ((z + 1) * S + half));
        const solid = occ[c]! !== 0;
        gi[0] = bx + x;
        gi[1] = by + y;
        gi[2] = bz + z;
        let v = 0;
        for (let a = 0; a < 3; a++) {
          const st = stride[a]!;
          // the edge to the + neighbour (inside the grid): any solid sub-cell from this centre to its centre
          if (gi[a]! + 1 < N[a]!) {
            for (let m = 0; m <= S; m++) {
              if (occ[c + m * st]) {
                v |= 1 << a;
                break;
              }
            }
          }
          // each way: the step past which a point is beyond the wall from the centre
          for (let sgn = 0; sgn < 2; sgn++) {
            const step = sgn === 0 ? st : -st;
            let code = 0;
            // (LR16-POLISH F) the first sub-cell past the run the code crosses, when the way on from there to the
            // neighbour's centre must be clear (0: not checked)
            let after = 0;
            if (solid) {
              // inside a solid: the run's ends this way and the other (the first air sub-cell; half + 1 when the run
              // runs on through the half cell)
              let ea = half + 1;
              for (let m = 1; m <= half; m++) {
                if (!occ[c + m * step]) {
                  ea = m;
                  break;
                }
              }
              let eb = half + 1;
              for (let m = 1; m <= half; m++) {
                if (!occ[c - m * step]) {
                  eb = m;
                  break;
                }
              }
              // (LR16-POLISH F) the run's middle lies this way (both ends in the cell): the centre is on the wall's near
              // side, and a point past the middle is past the wall (a thin wall's far face is nearer than the run's
              // grown end). A run that runs on past the half cell has no known middle: the old rule
              const mid = ((ea - eb) * sub) / 2;
              if (mid > 0 && ea <= half) code = Math.max(1, Math.min(3, Math.round(mid / BOUNCE_T_STEP)));
              else if (ea <= half) {
                // past its end (else it runs on and no point leaves it this way)
                code = ea;
                after = ea;
              }
            } else {
              let js = 0;
              for (let m = 1; m <= half; m++) {
                if (occ[c + m * step]) {
                  js = m;
                  break;
                }
              }
              if (js > 0) {
                let je = js;
                while (je < 2 * half && occ[c + (je + 1) * step]) je++;
                // the run's middle: its sub-cells' ends (js - 0.5, je + 0.5) halved (past `BOUNCE_T_FAR`: a floor or a
                // thick wall the cell's points never cross); (LR16-POLISH F) the step at the middle of its first two
                // sub-cells at most (a 0.2 m wall grown), so a wall and the hull of an object close behind it are not
                // one wide wall
                const mid = ((js + je) * sub) / 2;
                const near = ((js + Math.min(je, js + 1)) * sub) / 2;
                code = mid > BOUNCE_T_FAR ? 0 : Math.max(1, Math.min(3, Math.round(near / BOUNCE_T_STEP)));
              }
            }
            // (LR16-POLISH F) from inside a hull (an object's: the centre on its far side from the run's middle), past
            // a second solid run the neighbour is not on the point's side: the point keeps its home. Not from an air
            // centre: there the first run is as likely the wall and the second an object behind it, whose pocket is
            // the neighbour's side (the fixture sweeps: checks/lr16pol-f-build.md)
            if (code > 0 && after > 0) {
              for (let m = after; m <= S; m++) {
                if (occ[c + m * step]) {
                  code = 0;
                  break;
                }
              }
            }
            v |= code << BOUNCE_T_SHIFT[a * 2 + sgn]!;
          }
        }
        out[x + tx * (y + ty * z)] = v;
      }
    }
  }
  return out;
}

/**
 * One lamp's bounce. `L`: the job's lights, `o` this lamp's offset in it (`LAMP_STRIDE`); `box`: its visibility box
 * (`lampBox`: origin, counts in `c` cells) and `vis` its cells; `occShapes` / `sb`: the bake's conservative occupancy
 * shapes and their bounds; `lo` / `hi`: the map's bounds (the ambient grid's). Returns the receivers' box (ambient
 * cells, grown by one so every cell a read blends with a lit one knows its walls), their steps and their wall bits.
 */
export function bounceLamp(L: Float32Array, o: number, box: readonly number[], c: number, vis: Uint8Array, occShapes: Float32Array, sb: readonly (readonly number[])[], lo: readonly number[], hi: readonly number[]): { box: number[]; data: Uint16Array; bits: Uint16Array } {
  const ox = box[0]!;
  const oy = box[1]!;
  const oz = box[2]!;
  const nx = box[3]!;
  const ny = box[4]!;
  const nz = box[5]!;
  const reach = BOUNCE.reach;
  // 1. occupancy over the lamp box grown by the reach, whole cells (clipped to the map), so cell (x, y, z) of the lamp
  // box is cell (x + kx0, y + ky0, z + kz0) here
  const K = Math.ceil(reach / c);
  const grow = (from: number, to: number): number => Math.min(K, Math.max(0, Math.floor((to - from) / c + 1e-6)));
  const kx0 = grow(lo[0]!, ox);
  const ky0 = grow(lo[1]!, oy);
  const kz0 = grow(lo[2]!, oz);
  const kx1 = grow(ox + nx * c, hi[0]!);
  const ky1 = grow(oy + ny * c, hi[1]!);
  const kz1 = grow(oz + nz * c, hi[2]!);
  const gx = ox - kx0 * c;
  const gy = oy - ky0 * c;
  const gz = oz - kz0 * c;
  const GX = nx + kx0 + kx1;
  const GY = ny + ky0 + ky1;
  const GZ = nz + kz0 + kz1;
  const ex = gx + GX * c;
  const ey = gy + GY * c;
  const ez = gz + GZ * c;
  const pick: number[] = [];
  for (let i = 0; i < sb.length; i++) {
    const b = sb[i]!;
    if (b[3]! < gx || b[0]! > ex || b[4]! < gy || b[1]! > ey || b[5]! < gz || b[2]! > ez) continue;
    pick.push(i);
  }
  const occ = new Uint8Array(GX * GY * GZ);
  rasterise(occShapes, occ, [gx, gy, gz], c, GX, GY, GZ, pick);

  // the lamp
  const lx = L[o]!;
  const ly = L[o + 1]!;
  const lz = L[o + 2]!;
  const r = L[o + 3]!;
  const spot = L[o + 7]! > -1.5;
  const adx = L[o + 4]!;
  const ady = L[o + 5]!;
  const adz = L[o + 6]!;
  const cut = spot ? L[o + 7]! : LAMP_CONE_COS;
  const ex2 = spot ? SPOT_EXP : LAMP_EXP;

  // 2. patches -> one VPL per ambient cell over the lamp box (sums: E x A, x E x A x position, x E x A x normal)
  const A = AMBIENT_CELL;
  const dims = bounceGridDims(lo, hi);
  const A0x = dims.origin[0];
  const A0y = dims.origin[1];
  const A0z = dims.origin[2];
  const vx0 = Math.floor((ox - A0x) / A);
  const vy0 = Math.floor((oy - A0y) / A);
  const vz0 = Math.floor((oz - A0z) / A);
  const VX = Math.floor((ox + nx * c - A0x) / A) - vx0 + 1;
  const VY = Math.floor((oy + ny * c - A0y) / A) - vy0 + 1;
  const VZ = Math.floor((oz + nz * c - A0z) / A) - vz0 + 1;
  const acc = new Float64Array(VX * VY * VZ * 7);
  const area = c * c;
  for (let z = 0; z < nz; z++) {
    const pz = oz + (z + 0.5) * c;
    for (let y = 0; y < ny; y++) {
      const py = oy + (y + 0.5) * c;
      for (let x = 0; x < nx; x++) {
        const v = vis[x + nx * (y + ny * z)]!;
        if (v === 0) continue;
        const qx = x + kx0;
        const qy = y + ky0;
        const qz = z + kz0;
        const gi = qx + GX * (qy + GY * qz);
        if (occ[gi]) continue;
        const px = ox + (x + 0.5) * c;
        const t = photoTerm(px - lx, py - ly, pz - lz, r, adx, ady, adz, cut, ex2);
        if (t <= 0) continue;
        const e0 = (t * v) / 255;
        let Lx = lx - px;
        let Ly = ly - py;
        let Lz = lz - pz;
        const dl = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz);
        if (dl < 1e-6) continue;
        Lx /= dl;
        Ly /= dl;
        Lz /= dl;
        const ai = Math.floor((px - A0x) / A) - vx0 + VX * (Math.floor((py - A0y) / A) - vy0 + VY * (Math.floor((pz - A0z) / A) - vz0));
        // each occupied face: its normal points from the neighbour into this cell
        for (let f = 0; f < 6; f++) {
          const ax = f === 0 ? -1 : f === 1 ? 1 : 0;
          const ay = f === 2 ? -1 : f === 3 ? 1 : 0;
          const az = f === 4 ? -1 : f === 5 ? 1 : 0;
          const sx = qx + ax;
          const sy = qy + ay;
          const sz = qz + az;
          if (sx < 0 || sy < 0 || sz < 0 || sx >= GX || sy >= GY || sz >= GZ || !occ[sx + GX * (sy + GY * sz)]) continue;
          const ndl = -(ax * Lx + ay * Ly + az * Lz);
          if (ndl <= 0) continue;
          const ea = e0 * ndl * area;
          const k = ai * 7;
          acc[k] = acc[k]! + ea;
          acc[k + 1] = acc[k + 1]! + ea * px;
          acc[k + 2] = acc[k + 2]! + ea * py;
          acc[k + 3] = acc[k + 3]! + ea * pz;
          acc[k + 4] = acc[k + 4]! - ea * ax;
          acc[k + 5] = acc[k + 5]! - ea * ay;
          acc[k + 6] = acc[k + 6]! - ea * az;
        }
      }
    }
  }
  // VPLs: x, y, z, normal x, y, z, flux, lobe back offset, march start
  const VS = 9;
  const vpl = new Float64Array((VX * VY * VZ + 1) * VS);
  let nv = 0;
  for (let i = 0; i < VX * VY * VZ; i++) {
    const k = i * 7;
    const s = acc[k]!;
    const phi = BOUNCE.albedo * s;
    if (phi < PHI_MIN) continue;
    let mx = acc[k + 4]!;
    let my = acc[k + 5]!;
    let mz = acc[k + 6]!;
    const ml = Math.sqrt(mx * mx + my * my + mz * mz);
    if (ml < 1e-9) continue;
    mx /= ml;
    my /= ml;
    mz /= ml;
    const w = nv * VS;
    vpl[w] = acc[k + 1]! / s;
    vpl[w + 1] = acc[k + 2]! / s;
    vpl[w + 2] = acc[k + 3]! / s;
    vpl[w + 3] = mx;
    vpl[w + 4] = my;
    vpl[w + 5] = mz;
    vpl[w + 6] = phi;
    vpl[w + 7] = 0;
    vpl[w + 8] = START_SURF;
    nv++;
  }
  // 3. the fixture's uplight (downward lamps only)
  if (!spot) {
    const w = nv * VS;
    vpl[w] = lx;
    vpl[w + 1] = ly + 0.1;
    vpl[w + 2] = lz;
    vpl[w + 3] = 0;
    vpl[w + 4] = 1;
    vpl[w + 5] = 0;
    vpl[w + 6] = BOUNCE.uplight * Math.PI;
    vpl[w + 7] = BOUNCE.uplightBack;
    vpl[w + 8] = START_UP;
    nv++;
  }

  // 4. splat to the receiver cells (the lamp box's ambient cells grown by the reach, clipped to the grid)
  const R = Math.ceil(reach / A) + 1;
  const rx0 = Math.max(0, vx0 - R);
  const ry0 = Math.max(0, vy0 - R);
  const rz0 = Math.max(0, vz0 - R);
  const rx1 = Math.min(dims.n[0] - 1, vx0 + VX - 1 + R);
  const ry1 = Math.min(dims.n[1] - 1, vy0 + VY - 1 + R);
  const rz1 = Math.min(dims.n[2] - 1, vz0 + VZ - 1 + R);
  const RX = Math.max(0, rx1 - rx0 + 1);
  const RY = Math.max(0, ry1 - ry0 + 1);
  const RZ = Math.max(0, rz1 - rz0 + 1);
  const B = new Float64Array(RX * RY * RZ);
  const near2 = BOUNCE.near * BOUNCE.near;
  const reach2 = reach * reach;
  for (let j = 0; j < nv; j++) {
    const w = j * VS;
    const px = vpl[w]!;
    const py = vpl[w + 1]!;
    const pz = vpl[w + 2]!;
    const nX = vpl[w + 3]!;
    const nY = vpl[w + 4]!;
    const nZ = vpl[w + 5]!;
    const phi = vpl[w + 6]!;
    const back = vpl[w + 7]!;
    const t0 = vpl[w + 8]!;
    // the lobe's origin (the VPL itself for surfaces)
    const bx = px - nX * back;
    const by = py - nY * back;
    const bz = pz - nZ * back;
    const i0 = Math.max(rx0, Math.ceil((px - reach - A0x) / A - 0.5));
    const i1 = Math.min(rx1, Math.floor((px + reach - A0x) / A - 0.5));
    const j0 = Math.max(ry0, Math.ceil((py - reach - A0y) / A - 0.5));
    const j1 = Math.min(ry1, Math.floor((py + reach - A0y) / A - 0.5));
    const k0 = Math.max(rz0, Math.ceil((pz - reach - A0z) / A - 0.5));
    const k1 = Math.min(rz1, Math.floor((pz + reach - A0z) / A - 0.5));
    for (let kz = k0; kz <= k1; kz++) {
      const cz = A0z + (kz + 0.5) * A;
      for (let ky = j0; ky <= j1; ky++) {
        const cy = A0y + (ky + 0.5) * A;
        for (let kx = i0; kx <= i1; kx++) {
          const cx = A0x + (kx + 0.5) * A;
          const wx = cx - px;
          const wy = cy - py;
          const wz = cz - pz;
          const d2 = wx * wx + wy * wy + wz * wz;
          if (d2 >= reach2) continue;
          const ux = cx - bx;
          const uy = cy - by;
          const uz = cz - bz;
          const ul = Math.sqrt(ux * ux + uy * uy + uz * uz);
          const cos = ul > 1e-6 ? (ux * nX + uy * nY + uz * nZ) / ul : 1;
          if (cos <= 0) continue;
          const qd = d2 / reach2;
          const win = (1 - qd * qd) * (1 - qd * qd);
          const val = (phi * cos * win) / (Math.PI * (d2 + near2));
          if (val < VAL_MIN) continue;
          // (fix round) the centre only: a cell a wall crosses holds its centre's side, never a share of the far side
          // (the reads cross to the neighbour on a point's own side: `bounceBits`)
          if (!clearPath(occ, gx, gy, gz, GX, GY, GZ, c, px, py, pz, cx, cy, cz, t0)) continue;
          const bi = kx - rx0 + RX * (ky - ry0 + RY * (kz - rz0));
          B[bi] = B[bi]! + val;
        }
      }
    }
  }

  // 5. steps and the tight box of the cells that hold any
  let bx0 = RX;
  let by0 = RY;
  let bz0 = RZ;
  let bx1 = -1;
  let by1 = -1;
  let bz1 = -1;
  const Q = new Uint16Array(B.length);
  for (let z = 0; z < RZ; z++) {
    for (let y = 0; y < RY; y++) {
      for (let x = 0; x < RX; x++) {
        const i = x + RX * (y + RY * z);
        const q = Math.min(65535, Math.round(B[i]! / BOUNCE.q));
        if (q === 0) continue;
        Q[i] = q;
        if (x < bx0) bx0 = x;
        if (y < by0) by0 = y;
        if (z < bz0) bz0 = z;
        if (x > bx1) bx1 = x;
        if (y > by1) by1 = y;
        if (z > bz1) bz1 = z;
      }
    }
  }
  if (bx1 < 0) return { box: [0, 0, 0, 0, 0, 0], data: new Uint16Array(0), bits: new Uint16Array(0) };
  // (fix round) the tight box grown by a cell (clipped to the grid): a read that blends a lit cell takes its other
  // corners from here, so they carry their walls
  const gx0 = Math.max(0, rx0 + bx0 - 1);
  const gy0 = Math.max(0, ry0 + by0 - 1);
  const gz0 = Math.max(0, rz0 + bz0 - 1);
  const tx = Math.min(dims.n[0] - 1, rx0 + bx1 + 1) - gx0 + 1;
  const ty = Math.min(dims.n[1] - 1, ry0 + by1 + 1) - gy0 + 1;
  const tz = Math.min(dims.n[2] - 1, rz0 + bz1 + 1) - gz0 + 1;
  const data = new Uint16Array(tx * ty * tz);
  for (let z = 0; z < tz; z++) {
    const qz = gz0 + z - rz0;
    if (qz < 0 || qz >= RZ) continue;
    for (let y = 0; y < ty; y++) {
      const qy = gy0 + y - ry0;
      if (qy < 0 || qy >= RY) continue;
      for (let x = 0; x < tx; x++) {
        const qx = gx0 + x - rx0;
        if (qx < 0 || qx >= RX) continue;
        data[x + tx * (y + ty * z)] = Q[qx + RX * (qy + RY * qz)]!;
      }
    }
  }
  const out = [gx0, gy0, gz0, tx, ty, tz];
  return { box: out, data, bits: bounceBits(occShapes, sb, dims.origin, dims.n, out) };
}
