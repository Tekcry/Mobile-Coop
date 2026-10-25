/**
 * (char-shadow-meter S3, J16) Cast-shadow cues: per player, the floor footprints of the shadow their capsule casts
 * from the strongest members of the gameplay light set at the chest (`LightField.sourcesInto`). Each footprint is
 * `CUE.points` floor points with a contrast, the source's registry id and the far point's speed. Data only (BRIEF Q14
 * "A faint cue"): Guard AI reads it and decides what is noticed; nothing here knows who looks.
 *
 * Pure: no Babylon, no graphics state, no allocation after construction. Filled at 10 Hz on the host and in solo
 * (S3b, right after the meter), from the same character contract and light set the meter reads.
 *
 *   footprint: the source's horizontal direction away from the feet; length = the capsule top projected from the
 *              source onto the feet plane (the moon: by its elevation), at least the capsule radius (an overhead lamp
 *              gives the shadow under the body), at most `CUE.maxLen` (a source at or below the top: `maxLen`)
 *   points:    `CUE_AT` of the length from the feet, `floorLift` above the feet plane
 *   contrast:  L_s(q) x (1 - CAPSULE.floor) / max(level(q), 0.02); 0 where the source does not reach q
 *              (level(q): `totalAt` with the contract, the player's own capsule skipped)
 *   sources:   the `CUE.sources` strongest set members at the chest giving at least `CUE.minLevel`, skipping a source
 *              at or below the feet plane (no floor shadow) and one the player holds (`CAPSULE.holder`, A5)
 */
import { hyp2, hyp3 } from '../core/mathx';
import { CAPSULE, OCC, type CharOccluders } from './charOccluders';
import type { Occluder } from './lights';

/** Slots (players), footprints per player, points per footprint; the chest level a source needs, the longest
 *  footprint (m) and the points' lift above the feet plane (m). */
export const CUE = { players: 4, sources: 3, points: 3, minLevel: 0.08, maxLen: 6, floorLift: 0.05 } as const;
/** Where the points sit along a footprint (fraction of its length from the feet). */
export const CUE_AT = [0.35, 0.65, 1] as const;
/** `source` of an unused footprint (registry ids are >= 0, the moon -1). */
export const CUE_NONE = -2;
/** Floor of the contrast's denominator (a source in the dark is not infinitely contrasted). */
export const CUE_LEVEL_FLOOR = 0.02;

/** Set members read from `sourcesInto` per player (strongest first; more than `CUE.sources` so a skipped one leaves
 *  room for the next). */
const SCAN = 8;
/** A lamp this close above the feet plane (m) or lower casts no floor shadow. */
const FLOOR_EPS = 0.05;
/** The moon this low (sine of its elevation) or lower: the footprint is `maxLen`. */
const MOON_LOW = 1e-3;
const PT = 4;
const SRC_STRIDE = CUE.points * PT;
const SLOT_STRIDE = CUE.sources * SRC_STRIDE;

/** What the cues read from the light field (`LightField` fits it): the set, one member's term, the level. */
export interface CueField {
  sourcesInto(x: number, y: number, z: number, ids: Int32Array, lv: Float32Array, max: number, occluded?: Occluder): number;
  sourceAt(id: number, x: number, y: number, z: number, occluded?: Occluder): number;
  totalAt(x: number, y: number, z: number, occluded?: Occluder, chars?: CharOccluders | null, skip?: number): number;
}

/** A registry light's position (`LightDef` fits it): rest position plus a swinging pendant's live offset. */
export interface CueLight {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly swx: number;
  readonly swy: number;
  readonly swz: number;
}

/** A player as the fill keys it (`PlayerRef` fits it). */
export interface CuePlayer {
  readonly id: string;
}

export class ShadowCues {
  /** [slot] footprints in use (0..CUE.sources). */
  readonly count = new Int8Array(CUE.players);
  /** [slot][source][point] x, y, z, contrast (stride 4); contrast 0 = no shadow there. */
  readonly pts = new Float32Array(CUE.players * SLOT_STRIDE);
  /** [slot][source] m/s of the footprint's far point since the last fill (0 for a new footprint). */
  readonly speed = new Float32Array(CUE.players * CUE.sources);
  /** [slot][source] registry light id, -1 the moon, `CUE_NONE` unused. */
  readonly source = new Int32Array(CUE.players * CUE.sources).fill(CUE_NONE);
  /** Bumped by each fill. */
  version = 0;
  /** Slots filled by the last fill. */
  n = 0;

  /** [slot] player id ('' unused). */
  private readonly ids: string[] = new Array<string>(CUE.players).fill('');
  private readonly prevIds: string[] = new Array<string>(CUE.players).fill('');
  private readonly prevCount = new Int8Array(CUE.players);
  private readonly prevSource = new Int32Array(CUE.players * CUE.sources);
  /** [slot][source] far point x, z of this fill and the last. */
  private readonly far = new Float32Array(CUE.players * CUE.sources * 2);
  private readonly prevFar = new Float32Array(CUE.players * CUE.sources * 2);
  private readonly sid = new Int32Array(SCAN);
  private readonly slv = new Float32Array(SCAN);
  // `footprint`'s result (fields, not a returned object: no allocation, no boxed double)
  private dx = 1;
  private dz = 0;
  private len = 0;

  /**
   * @param field the light field (`LightField`)
   * @param lights registry lights by id (`LightRegistry.lights`)
   * @param moonDir unit vector from the ground towards the moon (`LightBake.moon.dir`); null without a moon
   */
  constructor(
    private readonly field: CueField,
    private readonly lights: ArrayLike<CueLight | undefined>,
    private readonly moonDir: ArrayLike<number> | null,
  ) {}

  /** The slot of a player id (the last fill's), -1 when absent. Linear scan, no allocation. */
  slotOf(id: string): number {
    for (let s = 0; s < this.n; s++) if (this.ids[s] === id) return s;
    return -1;
  }

  /**
   * One 10 Hz fill. Slot s is `players[s]` (the host's `playerRefsInto` order), whose capsule in `occ` has the owner
   * key `keys[s]` (a player without a capsule gets no footprints). `dt`: seconds since the last fill (speeds 0 when
   * not positive). `occluded`: the ray test the meter passes the field (flashlights). At most `CUE.players` slots.
   */
  fill(occ: CharOccluders, players: ArrayLike<CuePlayer>, keys: ArrayLike<number>, n: number, dt: number, occluded?: Occluder): void {
    const P = CUE.players;
    for (let s = 0; s < P; s++) {
      this.prevIds[s] = this.ids[s]!;
      this.prevCount[s] = this.count[s]!;
    }
    this.prevSource.set(this.source);
    this.prevFar.set(this.far);
    const m = n < P ? n : P;
    for (let s = 0; s < P; s++) {
      this.clearSlot(s);
      if (s < m) {
        this.ids[s] = players[s]!.id;
        this.fillSlot(s, occ, keys[s]!, dt, occluded);
      } else this.ids[s] = '';
    }
    this.n = m;
    this.version++;
  }

  private clearSlot(s: number): void {
    this.count[s] = 0;
    const p0 = s * SLOT_STRIDE;
    for (let i = p0; i < p0 + SLOT_STRIDE; i++) this.pts[i] = 0;
    const f0 = s * CUE.sources;
    for (let c = f0; c < f0 + CUE.sources; c++) {
      this.speed[c] = 0;
      this.source[c] = CUE_NONE;
    }
  }

  private fillSlot(s: number, occ: CharOccluders, key: number, dt: number, occluded: Occluder | undefined): void {
    let j = -1;
    for (let i = 0; i < occ.n; i++) {
      if (occ.owner[i] === key) {
        j = i;
        break;
      }
    }
    if (j < 0) return;
    const C = occ.cap;
    const o = j * OCC.stride;
    const ax = C[o]!;
    const ay = C[o + 1]!;
    const az = C[o + 2]!;
    const bx = C[o + 3]!;
    const by = C[o + 4]!;
    const bz = C[o + 5]!;
    const r = C[o + 6]!;
    // feet: the low end's ground point; top: the high end's top
    const lowA = ay <= by;
    const fx = lowA ? ax : bx;
    const fz = lowA ? az : bz;
    const tx = lowA ? bx : ax;
    const tz = lowA ? bz : az;
    const feetY = (lowA ? ay : by) - r;
    const topY = (lowA ? by : ay) + r;
    const h = topY - feetY;
    // the chest, as `LightField.bodyLevel` samples it (0.6 of the height)
    const k = this.field.sourcesInto(fx + (tx - fx) * 0.6, feetY + h * 0.6, fz + (tz - fz) * 0.6, this.sid, this.slv, SCAN, occluded);
    const field = this.field;
    const lift = feetY + CUE.floorLift;
    const same = this.prevIds[s] === this.ids[s];
    let c = 0;
    for (let i = 0; i < k && i < SCAN && c < CUE.sources; i++) {
      if (this.slv[i]! < CUE.minLevel) break;
      const id = this.sid[i]!;
      if (!this.footprint(id, ax, ay, az, bx, by, bz, r, fx, fz, tx, tz, feetY, topY)) continue;
      const f = s * CUE.sources + c;
      const p0 = f * SRC_STRIDE;
      const dx = this.dx;
      const dz = this.dz;
      const len = this.len;
      let qx = fx;
      let qz = fz;
      for (let p = 0; p < CUE.points; p++) {
        const d = len * CUE_AT[p]!;
        qx = fx + dx * d;
        qz = fz + dz * d;
        const ls = field.sourceAt(id, qx, lift, qz, occluded);
        let con = 0;
        if (ls > 0) {
          const lv = field.totalAt(qx, lift, qz, occluded, occ, key);
          con = (ls * (1 - CAPSULE.floor)) / (lv > CUE_LEVEL_FLOOR ? lv : CUE_LEVEL_FLOOR);
          if (con > 1 - CAPSULE.floor) con = 1 - CAPSULE.floor;
        }
        const q = p0 + p * PT;
        this.pts[q] = qx;
        this.pts[q + 1] = lift;
        this.pts[q + 2] = qz;
        this.pts[q + 3] = con;
      }
      this.source[f] = id;
      this.far[f * 2] = qx;
      this.far[f * 2 + 1] = qz;
      // speed: the same player's footprint from the same source last fill
      let v = 0;
      if (same && dt > 0) {
        const u0 = s * CUE.sources;
        const pc = this.prevCount[s]!;
        for (let u = u0; u < u0 + pc; u++) {
          if (this.prevSource[u] === id) {
            v = hyp2(qx - this.prevFar[u * 2]!, qz - this.prevFar[u * 2 + 1]!) / dt;
            break;
          }
        }
      }
      this.speed[f] = v;
      c++;
    }
    this.count[s] = c;
  }

  /** Direction (`dx`, `dz`) and length (`len`) of the footprint from source `id`; false when it casts none. */
  private footprint(id: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, fx: number, fz: number, tx: number, tz: number, feetY: number, topY: number): boolean {
    const h = topY - feetY;
    let vx: number;
    let vz: number;
    let away = false;
    if (id === -1) {
      const md = this.moonDir;
      if (!md) return false;
      const mx = md[0]!;
      const my = md[1]!;
      const mz = md[2]!;
      if (my <= MOON_LOW) {
        away = true;
        vx = -mx;
        vz = -mz;
      } else {
        // the top, carried away from the moon down to the feet plane
        const t = h / my;
        vx = tx - mx * t - fx;
        vz = tz - mz * t - fz;
      }
    } else {
      const L = this.lights[id];
      if (!L) return false;
      const sx = L.x + L.swx;
      const sy = L.y + L.swy;
      const sz = L.z + L.swz;
      if (sy - feetY <= FLOOR_EPS) return false;
      // (A5) the holder's own light: within r + holder of the capsule axis
      const abx = bx - ax;
      const aby = by - ay;
      const abz = bz - az;
      const ab2 = abx * abx + aby * aby + abz * abz;
      let w = ab2 > 1e-12 ? ((sx - ax) * abx + (sy - ay) * aby + (sz - az) * abz) / ab2 : 0;
      w = w < 0 ? 0 : w > 1 ? 1 : w;
      if (hyp3(sx - ax - abx * w, sy - ay - aby * w, sz - az - abz * w) <= r + CAPSULE.holder) return false;
      if (sy <= topY + 1e-3) {
        away = true;
        vx = fx - sx;
        vz = fz - sz;
      } else {
        // the top, projected from the source onto the feet plane
        const t = (sy - feetY) / (sy - topY);
        vx = sx + (tx - sx) * t - fx;
        vz = sz + (tz - sz) * t - fz;
      }
    }
    const d = hyp2(vx, vz);
    if (d > 1e-6) {
      this.dx = vx / d;
      this.dz = vz / d;
    } else {
      this.dx = 1;
      this.dz = 0;
    }
    this.len = away || d > CUE.maxLen ? CUE.maxLen : d < r ? r : d;
    return true;
  }
}
