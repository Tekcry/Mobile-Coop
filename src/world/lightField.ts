/**
 * The light field (3.6, pure; bible 5.1, L1-L5): the one answer to "how lit is this point" for all gameplay - the
 * player's meter, guards' perception of players and bodies, the torch rule. It reads the canonical bake
 * (`lightBake.ts`: lamp visibility boxes, moon visibility, the ambient grid) and the registry's live state (on,
 * destroyed, EMP), with the formula the renderers use (`lampMath.ts`):
 *
 *   level = ambient grid + moon x moon visibility + sum over the lamps listed for the point's 2 m column (as the
 *           shaders list them) of `LAMP_LEVEL_GAIN` x intensity x falloff x cone x baked visibility, with closed
 *           doors cutting lamps
 *
 * Visibility is read trilinearly between cell centres and clamped to each box, as the GPU samples the atlas. Lights
 * that are not baked (flashlights) come from `dynamicAt` with the caller's ray test. Everything is allocation-free.
 */
import { AMBIENT_CELL } from './ambientGrid';
import { LAMP_CONE_COS, LAMP_EXP, LAMP_LEVEL_GAIN, lampTerm, SPOT_EXP } from './lampMath';
import type { LightBake } from './lightBake';
import type { LightRegistry, Occluder } from './lights';
import { BOX_STRIDE, LAMP_CELL, LAMP_GRID, LAMP_GRID_SLOTS, LAMP_STRIDE, lampGrid } from '../voxel/lampBake';

/** A door leaf as the field needs it (`Doors.list` entries fit): closed when `open` is below `DOOR_SHUT`. */
export interface FieldDoor {
  anchor: { hinge: { x: number; y: number; z: number }; yaw: number; width: number; height: number };
  open: number;
}

/** A door this far open or less stops light (its collision body is there until it starts to swing). */
export const DOOR_SHUT = 0.05;
/** Doors a baked lamp tests (the GPU's lamp data holds this many per lamp; the field tests the same list). */
export const DOORS_PER_LAMP = 4;

/**
 * Per baked lamp (`LAMP_STRIDE` lights), the doors whose leaf can come between it and what it lights - the leaf's
 * middle within the lamp's reach plus the leaf's width - nearest first, up to `DOORS_PER_LAMP` (-1: none). The
 * shaders and the field read this one list.
 */
export function lampDoorLists(lights: Float32Array, doors: readonly FieldDoor[]): Int16Array {
  const n = lights.length / LAMP_STRIDE;
  const out = new Int16Array(n * DOORS_PER_LAMP).fill(-1);
  const near: { k: number; d: number }[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * LAMP_STRIDE;
    near.length = 0;
    for (let k = 0; k < doors.length; k++) {
      const a = doors[k]!.anchor;
      const cx = a.hinge.x + Math.sin(a.yaw) * a.width * 0.5;
      const cz = a.hinge.z + Math.cos(a.yaw) * a.width * 0.5;
      const dx = cx - lights[o]!;
      const dy = a.hinge.y + a.height * 0.5 - lights[o + 1]!;
      const dz = cz - lights[o + 2]!;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < lights[o + 3]! + a.width) near.push({ k, d });
    }
    near.sort((p, q) => p.d - q.d);
    for (let j = 0; j < Math.min(DOORS_PER_LAMP, near.length); j++) out[i * DOORS_PER_LAMP + j] = near[j]!.k;
  }
  return out;
}

/** Per baked lamp, unpacked: x, y, z, reach, axis dx, dy, dz, cos cut, exponent, vis offset, box ox, oy, oz, nx, ny, nz. */
const LS = 16;

export class LightField {
  /** Registry ids of the baked lamps, in bake order. */
  private readonly ids: Int32Array;
  private readonly lamp: Float64Array;
  /** Registry id -> 1 when baked (the rest are dynamic). */
  private readonly isBaked: Uint8Array;
  private readonly grid: { data: Uint8Array; cols: number; rows: number } | null;
  private readonly gx: number;
  private readonly gz: number;
  /** `lampDoorLists` for the baked lamps. */
  private readonly lampDoors: Int16Array;

  constructor(
    readonly bake: LightBake | null,
    private readonly reg: LightRegistry,
    private readonly doors: readonly FieldDoor[] = [],
  ) {
    const lamps = bake?.lamps ?? null;
    const n = lamps ? lamps.baked.ids.length : 0;
    this.ids = new Int32Array(n);
    this.lamp = new Float64Array(n * LS);
    this.isBaked = new Uint8Array(Math.max(1, reg.lights.length + 64));
    let at = 0;
    for (let i = 0; i < n; i++) {
      const L = lamps!.baked.lights;
      const B = lamps!.r.boxes;
      const li = i * LAMP_STRIDE;
      const bi = i * BOX_STRIDE;
      const o = i * LS;
      const id = lamps!.baked.ids[i]!;
      this.ids[i] = id;
      this.isBaked[id] = 1;
      const spot = L[li + 7]! > -1.5;
      this.lamp[o] = L[li]!;
      this.lamp[o + 1] = L[li + 1]!;
      this.lamp[o + 2] = L[li + 2]!;
      this.lamp[o + 3] = L[li + 3]!;
      this.lamp[o + 4] = L[li + 4]!;
      this.lamp[o + 5] = L[li + 5]!;
      this.lamp[o + 6] = L[li + 6]!;
      this.lamp[o + 7] = spot ? L[li + 7]! : LAMP_CONE_COS;
      this.lamp[o + 8] = spot ? SPOT_EXP : LAMP_EXP;
      this.lamp[o + 9] = at;
      for (let k = 0; k < 6; k++) this.lamp[o + 10 + k] = B[bi + k]!;
      at += B[bi + 3]! * B[bi + 4]! * B[bi + 5]!;
    }
    this.grid = lamps && bake ? lampGrid(lamps.baked.lights, bake.lo, bake.hi) : null;
    this.lampDoors = lamps ? lampDoorLists(lamps.baked.lights, doors) : new Int16Array(0);
    this.gx = bake?.lo[0] ?? 0;
    this.gz = bake?.lo[2] ?? 0;
  }

  /**
   * Scratch result of the private `*Into` steps. (They write here rather than return: V8 boxes a double returned from
   * a call it does not inline, 16 bytes each; a number field is updated in place. Only the public calls return one.)
   */
  private res = 0;

  /** Static light at a point: ambient + moon + the baked lamps (closed doors applied). 0..1. */
  levelAt(x: number, y: number, z: number): number {
    this.levelInto(x, y, z);
    return this.res;
  }

  /** One baked lamp's gameplay light at a point (intensity x falloff x cone x visibility, doors applied). */
  lampAt(i: number, x: number, y: number, z: number): number {
    this.lampInto(i, x, y, z);
    return this.res;
  }

  /** Baked visibility of lamp `i` at a point (0..1): trilinear between cell centres, clamped to its box. */
  visAt(i: number, x: number, y: number, z: number): number {
    this.visInto(i, x, y, z);
    return this.res;
  }

  /** Moon visibility at a point (0..1); outside the grid the sky is open. */
  moonAt(x: number, y: number, z: number): number {
    this.moonInto(x, y, z);
    return this.res;
  }

  /** Lights that are not baked (flashlights, anything added after the bake), each tested with `occluded`. 0..1. */
  dynamicAt(x: number, y: number, z: number, occluded?: Occluder): number {
    this.dynamicInto(x, y, z, occluded);
    return this.res;
  }

  /** Everything at a point: `levelAt` + `dynamicAt`, clamped. */
  totalAt(x: number, y: number, z: number, occluded?: Occluder): number {
    this.totalInto(x, y, z, occluded);
    return this.res;
  }

  /**
   * How lit a standing or crouched body is: the brighter of the chest and head samples, so a head poking out of a
   * shadow into a lamp's pool shows. `height` is the head height above the feet (crouch lowers it).
   */
  bodyLevel(x: number, feetY: number, z: number, height: number, occluded?: Occluder): number {
    this.totalInto(x, feetY + height * 0.6, z, occluded);
    const chest = this.res;
    if (chest >= 1) return 1;
    this.totalInto(x, feetY + height * 0.95, z, occluded);
    const head = this.res;
    return chest > head ? chest : head;
  }

  private totalInto(x: number, y: number, z: number, occluded: Occluder | undefined): void {
    this.levelInto(x, y, z);
    const s = this.res;
    if (s >= 1) {
      this.res = 1;
      return;
    }
    this.dynamicInto(x, y, z, occluded);
    const v = s + this.res;
    this.res = v > 1 ? 1 : v;
  }

  private levelInto(x: number, y: number, z: number): void {
    const b = this.bake;
    // (no bake: the registry's ambient; every light is dynamic)
    if (!b) {
      this.res = this.reg.ambientAt(x, y, z);
      return;
    }
    const ag = b.ambient;
    const ax = ag.n[0];
    const ay = ag.n[1];
    const cx = Math.min(ax - 1, Math.max(0, Math.floor((x - ag.origin[0]) / AMBIENT_CELL)));
    const cy = Math.min(ay - 1, Math.max(0, Math.floor((y - ag.origin[1]) / AMBIENT_CELL)));
    const cz = Math.min(ag.n[2] - 1, Math.max(0, Math.floor((z - ag.origin[2]) / AMBIENT_CELL)));
    let v = ag.data[cx + ax * (cy + ay * cz)]! / 255;
    if (b.moonLight > 0) {
      this.moonInto(x, y, z);
      v += b.moonLight * this.res;
    }
    const g = this.grid;
    if (g) {
      const q = Math.floor((x - this.gx) / LAMP_GRID);
      const r = Math.floor((z - this.gz) / LAMP_GRID);
      if (q >= 0 && r >= 0 && q < g.cols && r < g.rows) {
        const base = (r * g.cols * 2 + q * 2) * 4;
        for (let s = 0; s < LAMP_GRID_SLOTS; s++) {
          const fid = g.data[base + s]!;
          if (fid === 0) break;
          this.lampInto(fid - 1, x, y, z);
          v += this.res;
          if (v >= 1) {
            this.res = 1;
            return;
          }
        }
      }
    }
    this.res = v < 0 ? 0 : v > 1 ? 1 : v;
  }

  private lampInto(i: number, x: number, y: number, z: number): void {
    this.res = 0;
    const l = this.reg.lights[this.ids[i]!];
    if (!l || !l.on || l.destroyed || l.intensity <= 0) return;
    const o = i * LS;
    const P = this.lamp;
    const lx = P[o]!;
    const ly = P[o + 1]!;
    const lz = P[o + 2]!;
    // falloff x cone: `lampMath.lampTerm` written out (this path must not box a returned double; change both together -
    // the brute-force test in `tests/lightField.test.ts` compares them)
    const vx = x - lx;
    const vy = y - ly;
    const vz = z - lz;
    const rr = P[o + 3]!;
    if (vx > rr || vx < -rr || vy > rr || vy < -rr || vz > rr || vz < -rr) return;
    const d = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (d >= rr) return;
    let t = 1 - d / rr;
    if (d >= 1e-4) {
      const ca = (vx * P[o + 4]! + vy * P[o + 5]! + vz * P[o + 6]!) / d;
      if (ca < P[o + 7]!) return;
      const c = ca > 1e-4 ? ca : 1e-4;
      const e = P[o + 8]!;
      t *= e === 1 ? c : e === 2 ? c * c : Math.pow(c, e);
    }
    this.visInto(i, x, y, z);
    const vis = this.res;
    this.res = 0;
    if (vis <= 0) return;
    // (the lamp's own door list, as the shaders test it)
    for (let j = 0; j < DOORS_PER_LAMP; j++) {
      const k = this.lampDoors[i * DOORS_PER_LAMP + j]!;
      if (k < 0) break;
      if (this.doorBlocksOne(k, lx, ly, lz, x, y, z)) return;
    }
    this.res = LAMP_LEVEL_GAIN * l.intensity * t * vis;
  }

  private visInto(i: number, x: number, y: number, z: number): void {
    const o = i * LS;
    const P = this.lamp;
    this.triInto(this.bake!.lamps!.r.vis, P[o + 9]!, P[o + 10]!, P[o + 11]!, P[o + 12]!, P[o + 13]!, P[o + 14]!, P[o + 15]!, LAMP_CELL, x, y, z);
  }

  private moonInto(x: number, y: number, z: number): void {
    const m = this.bake?.moon;
    const c = m ? m.cell : 1;
    if (!m || x < m.origin[0] || z < m.origin[2] || x > m.origin[0] + m.n[0] * c || z > m.origin[2] + m.n[2] * c || y > m.origin[1] + m.n[1] * c) {
      this.res = 1;
      return;
    }
    this.triInto(m.vis, 0, m.origin[0], m.origin[1], m.origin[2], m.n[0], m.n[1], m.n[2], c, x, y, z);
  }

  /** `trilinear` into `res`. */
  private triInto(v: Uint8Array, at: number, ox: number, oy: number, oz: number, nx: number, ny: number, nz: number, c: number, x: number, y: number, z: number): void {
    let u = (x - ox) / c - 0.5;
    let w = (y - oy) / c - 0.5;
    let s = (z - oz) / c - 0.5;
    u = u < 0 ? 0 : u > nx - 1 ? nx - 1 : u;
    w = w < 0 ? 0 : w > ny - 1 ? ny - 1 : w;
    s = s < 0 ? 0 : s > nz - 1 ? nz - 1 : s;
    const x0 = Math.floor(u);
    const y0 = Math.floor(w);
    const z0 = Math.floor(s);
    const x1 = x0 + 1 < nx ? x0 + 1 : x0;
    const y1 = y0 + 1 < ny ? y0 + 1 : y0;
    const z1 = z0 + 1 < nz ? z0 + 1 : z0;
    const fx = u - x0;
    const fy = w - y0;
    const fz = s - z0;
    const r0 = at + nx * (y0 + ny * z0);
    const r1 = at + nx * (y1 + ny * z0);
    const r2 = at + nx * (y0 + ny * z1);
    const r3 = at + nx * (y1 + ny * z1);
    const a = v[r0 + x0]! + (v[r0 + x1]! - v[r0 + x0]!) * fx;
    const b = v[r1 + x0]! + (v[r1 + x1]! - v[r1 + x0]!) * fx;
    const e = v[r2 + x0]! + (v[r2 + x1]! - v[r2 + x0]!) * fx;
    const f = v[r3 + x0]! + (v[r3 + x1]! - v[r3 + x0]!) * fx;
    const ab = a + (b - a) * fy;
    const ef = e + (f - e) * fy;
    this.res = (ab + (ef - ab) * fz) / 255;
  }

  /** The non-baked lights (every light, without a bake), into `res`. */
  private dynamicInto(x: number, y: number, z: number, occluded: Occluder | undefined): void {
    let v = 0;
    const ls = this.reg.lights;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      if (i < this.isBaked.length && this.isBaked[i]) continue;
      if (!l.on || l.destroyed || l.intensity <= 0) continue;
      const c = l.cone;
      const t = LAMP_LEVEL_GAIN * l.intensity * lampTerm(x - l.x, y - l.y, z - l.z, l.radius, c ? c.dx : 0, c ? c.dy : -1, c ? c.dz : 0, c ? c.cosOuter : LAMP_CONE_COS, c ? SPOT_EXP : LAMP_EXP);
      if (t <= 0.01) continue;
      if (occluded && occluded(l, x, y, z)) continue;
      if (this.doors.length && this.doorBlocks(l.x, l.y, l.z, x, y, z)) continue;
      v += t;
      if (v >= 1) {
        this.res = 1;
        return;
      }
    }
    this.res = v < 0 ? 0 : v;
  }

  /** A closed door leaf between (ax, ay, az) and (bx, by, bz)? */
  doorBlocks(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    for (let i = 0; i < this.doors.length; i++) if (this.doorBlocksOne(i, ax, ay, az, bx, by, bz)) return true;
    return false;
  }

  /** Door `i`'s leaf, if closed, between the two points (the same test as `nsDoorBlocks` in the shaders). */
  private doorBlocksOne(i: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    const d = this.doors[i]!;
    if (d.open > DOOR_SHUT) return false;
    const a = d.anchor;
    const ux = Math.sin(a.yaw);
    const uz = Math.cos(a.yaw);
    // the leaf's plane: through the hinge, along u; its normal is (uz, -ux)
    const sa = (ax - a.hinge.x) * uz - (az - a.hinge.z) * ux;
    const sb = (bx - a.hinge.x) * uz - (bz - a.hinge.z) * ux;
    if ((sa > 0 && sb > 0) || (sa < 0 && sb < 0) || sa === sb) return false;
    const t = sa / (sa - sb);
    const px = ax + (bx - ax) * t - a.hinge.x;
    const py = ay + (by - ay) * t;
    const pz = az + (bz - az) * t - a.hinge.z;
    const s = px * ux + pz * uz;
    return s >= 0 && s <= a.width && py >= a.hinge.y && py <= a.hinge.y + a.height;
  }
}

/**
 * Trilinear read of a byte grid (x fastest) starting at `at`, minimum corner (ox, oy, oz), counts (nx, ny, nz),
 * cell `c`: between cell centres, clamped to the grid as a clamped linear texture is. 0..1.
 */
export function trilinear(v: Uint8Array, at: number, ox: number, oy: number, oz: number, nx: number, ny: number, nz: number, c: number, x: number, y: number, z: number): number {
  let u = (x - ox) / c - 0.5;
  let w = (y - oy) / c - 0.5;
  let s = (z - oz) / c - 0.5;
  u = u < 0 ? 0 : u > nx - 1 ? nx - 1 : u;
  w = w < 0 ? 0 : w > ny - 1 ? ny - 1 : w;
  s = s < 0 ? 0 : s > nz - 1 ? nz - 1 : s;
  const x0 = Math.floor(u);
  const y0 = Math.floor(w);
  const z0 = Math.floor(s);
  const x1 = x0 + 1 < nx ? x0 + 1 : x0;
  const y1 = y0 + 1 < ny ? y0 + 1 : y0;
  const z1 = z0 + 1 < nz ? z0 + 1 : z0;
  const fx = u - x0;
  const fy = w - y0;
  const fz = s - z0;
  const r0 = at + nx * (y0 + ny * z0);
  const r1 = at + nx * (y1 + ny * z0);
  const r2 = at + nx * (y0 + ny * z1);
  const r3 = at + nx * (y1 + ny * z1);
  const a = v[r0 + x0]! + (v[r0 + x1]! - v[r0 + x0]!) * fx;
  const b = v[r1 + x0]! + (v[r1 + x1]! - v[r1 + x0]!) * fx;
  const e = v[r2 + x0]! + (v[r2 + x1]! - v[r2 + x0]!) * fx;
  const f = v[r3 + x0]! + (v[r3 + x1]! - v[r3 + x0]!) * fx;
  const ab = a + (b - a) * fy;
  const ef = e + (f - e) * fy;
  return (ab + (ef - ab) * fz) / 255;
}
