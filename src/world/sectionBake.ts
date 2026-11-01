/**
 * (section-bake) Per-section lamp bake, the pure part (no Babylon, no workers; `docs/sector-redesign/briefs/SECTION-BAKE.md`).
 * A Sector Ops map plays one section at a time, so its first load waits only for the lamps whose light can reach the
 * live section; the others bake in the background (`voxel/sectionJobs.ts`) and land before the players get there.
 *
 * - Membership (SB3): a lamp counts for every section whose region (plan rects, full height, grown by
 *   `SECTION_MARGIN`) its influence square touches: half-size = its reach (the direct term is 0 past it) +
 *   `BOUNCE.reach` (a VPL's reach from a lit cell) + 2 ambient cells (the receivers' grown box and a read's blend) + a
 *   lamp cell. A lamp on a border or in a connector counts for both sections.
 * - The layout (`lampLayout`): every lamp's visibility box from `lampBox` (pure geometry), so the full buffer, the atlas
 *   and the field's offsets exist before a lamp is baked; a lamp not landed reads 0.
 * - `SectionPlan`: which lamp bakes next (the live section first, then live + 1 ... last, then the earlier ones; within a
 *   section the biggest box first), which have landed, which sections are ready.
 * - `joinBounce`: the landed lamps' bounce in light order, the shape `bakeLevelLamps` joins (a lamp without bounce or
 *   not landed: a zero box), so the joined result of a finished bake is byte-identical to the full bake.
 * Allocation: load time and landing only; nothing here runs per frame.
 */
import { AMBIENT_CELL } from './ambientGrid';
import { BOX_STRIDE, LAMP_CELL, LAMP_STRIDE, lampBox } from '../voxel/lampBake';
import { BOUNCE, BOUNCE_BOX_STRIDE, type LampBounce } from '../voxel/lampBounce';

/** Plan rect [x0, z0, x1, z1] (world m, x0 < x1, z0 < z1). */
export type PlanRect = readonly [number, number, number, number];

/** A map's bake regions: per section (its `SectorDef` order) the plan rects where gameplay reads light while it is live. */
export interface SectionBakeDef {
  readonly regions: readonly (readonly PlanRect[])[];
}

/** Every region rect is grown by this much (m): a guard or a player at a footprint's edge stays inside. */
export const SECTION_MARGIN = 2;
/** Added to a lamp's reach for its influence square (m): the bounce's reach, its receivers' grown cell, a read's blend. */
export const LAMP_INFLUENCE_PAD = BOUNCE.reach + 2 * AMBIENT_CELL + LAMP_CELL;
/** Sections a bitmask holds (a Smi: 30 bits). */
export const MAX_BAKE_SECTIONS = 30;

/** (SB1) The maps that bake per section, by map id. Every other map (and `?fullbright`'s own id) bakes in full. */
export const SECTION_BAKE_MAPS: Readonly<Record<string, SectionBakeDef>> = {
};

export function sectionBakeFor(mapId: string): SectionBakeDef | null {
  const d = Object.prototype.hasOwnProperty.call(SECTION_BAKE_MAPS, mapId) ? SECTION_BAKE_MAPS[mapId] : undefined;
  return d && d.regions.length > 0 && d.regions.length <= MAX_BAKE_SECTIONS ? d : null;
}

/** Is the plan point inside section `k`'s region (rects grown by `SECTION_MARGIN`)? */
export function inSectionRegion(def: SectionBakeDef, k: number, x: number, z: number): boolean {
  const rs = def.regions[k];
  if (!rs) return false;
  const m = SECTION_MARGIN;
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i]!;
    if (x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m) return true;
  }
  return false;
}

/** Lamp `i`'s influence half-size (m, plan): its reach + `LAMP_INFLUENCE_PAD`. */
export function lampInfluence(L: Float32Array, i: number): number {
  return L[i * LAMP_STRIDE + 3]! + LAMP_INFLUENCE_PAD;
}

/** Per lamp (`LAMP_STRIDE` packed lights) the sections it counts for (bit k: section k). */
export function lampSectionMasks(L: Float32Array, def: SectionBakeDef): Int32Array {
  const n = L.length / LAMP_STRIDE;
  const out = new Int32Array(n);
  const m = SECTION_MARGIN;
  for (let i = 0; i < n; i++) {
    const x = L[i * LAMP_STRIDE]!;
    const z = L[i * LAMP_STRIDE + 2]!;
    const h = lampInfluence(L, i);
    let mask = 0;
    for (let k = 0; k < def.regions.length && k < MAX_BAKE_SECTIONS; k++) {
      for (const r of def.regions[k]!) {
        if (x + h >= r[0] - m && x - h <= r[2] + m && z + h >= r[1] - m && z - h <= r[3] + m) {
          mask |= 1 << k;
          break;
        }
      }
    }
    out[i] = mask;
  }
  return out;
}

/** The lamps' visibility boxes (`BOX_STRIDE` each, `lampBox`), where each one's cells start in the joined buffer, and
 *  the total cells: the layout the full bake joins to. */
export function lampLayout(L: Float32Array, lo: readonly number[], hi: readonly number[]): { boxes: Float32Array; at: Float64Array; cells: number } {
  const n = L.length / LAMP_STRIDE;
  const boxes = new Float32Array(n * BOX_STRIDE);
  const at = new Float64Array(n);
  const bx = [0, 0, 0, 0, 0, 0];
  let s = 0;
  for (let i = 0; i < n; i++) {
    lampBox(L, i, lo, hi, bx);
    boxes.set(bx, i * BOX_STRIDE);
    at[i] = s;
    s += bx[3]! * bx[4]! * bx[5]!;
  }
  return { boxes, at, cells: s };
}

/** One lamp's bounce as its bake gave it (`bounceLamp`: a zero box and no cells when it has none). */
export interface BouncePart {
  box: ArrayLike<number>;
  data: Uint16Array;
  bits: Uint16Array;
}

/** The lamps' bounce joined in light order (`bakeLevelLamps`' shape): a missing part is a zero box with no cells. */
export function joinBounce(parts: readonly (BouncePart | null)[]): LampBounce {
  const n = parts.length;
  const boxes = new Int32Array(n * BOUNCE_BOX_STRIDE);
  let len = 0;
  for (let i = 0; i < n; i++) len += parts[i]?.data.length ?? 0;
  const data = new Uint16Array(len);
  const bits = new Uint16Array(len);
  let at = 0;
  for (let i = 0; i < n; i++) {
    const p = parts[i];
    if (!p) continue;
    for (let k = 0; k < BOUNCE_BOX_STRIDE; k++) boxes[i * BOUNCE_BOX_STRIDE + k] = p.box[k]!;
    data.set(p.data, at);
    if (p.bits.length === p.data.length) bits.set(p.bits, at);
    at += p.data.length;
  }
  return { boxes, data, bits };
}

/** Sections in bake order from the live one: live, live + 1, ..., last, then 0 .. live - 1. */
export function sectionOrder(live: number, count: number, out: Int32Array = new Int32Array(count)): Int32Array {
  const l = live >= 0 && live < count ? live : 0;
  let j = 0;
  for (let k = l; k < count; k++) out[j++] = k;
  for (let k = 0; k < l; k++) out[j++] = k;
  return out;
}

/**
 * Which lamp bakes next, what has landed, which sections are ready. `cost`: per lamp its cells (the biggest first
 * within a section: the pool's slowest job starts first). Lamps of no section bake last (the full cache needs them).
 */
export class SectionPlan {
  readonly n: number;
  /** 1 once the lamp's bake has landed in the shared result. */
  readonly landed: Uint8Array;
  /** 1 while the lamp's job runs. */
  readonly busy: Uint8Array;
  /** The live section (the first in the bake order). */
  live = 0;
  private readonly order: Int32Array;
  /** Lamp indices by cost, biggest first (ties: light order). */
  private readonly byCost: Int32Array;
  private left: number;

  constructor(
    readonly masks: Int32Array,
    readonly cost: ArrayLike<number>,
    readonly sections: number,
  ) {
    this.n = masks.length;
    this.landed = new Uint8Array(this.n);
    this.busy = new Uint8Array(this.n);
    this.left = this.n;
    this.order = sectionOrder(0, sections);
    this.byCost = Int32Array.from({ length: this.n }, (_, i) => i).sort((a, b) => (cost[b] ?? 0) - (cost[a] ?? 0) || a - b);
  }

  /** Section `k` goes first (an out-of-range `k` changes nothing). */
  setLive(k: number): void {
    if (k < 0 || k >= this.sections || k === this.live) return;
    this.live = k;
    sectionOrder(k, this.sections, this.order);
  }

  /** The next lamp to bake (marked busy), or -1 when none is left to start. */
  next(): number {
    for (let j = 0; j <= this.sections; j++) {
      const bit = j < this.sections ? 1 << this.order[j]! : 0;
      for (let q = 0; q < this.n; q++) {
        const i = this.byCost[q]!;
        if (this.landed[i] || this.busy[i]) continue;
        if (bit ? (this.masks[i]! & bit) === 0 : this.masks[i] !== 0) continue;
        this.busy[i] = 1;
        return i;
      }
    }
    return -1;
  }

  /** Lamp `i`'s job failed or was dropped: it may start again. */
  release(i: number): void {
    this.busy[i] = 0;
  }

  /** Lamp `i` landed. */
  land(i: number): void {
    if (this.landed[i]) return;
    this.landed[i] = 1;
    this.busy[i] = 0;
    this.left--;
  }

  /** Every lamp of section `k` has landed (true for a `k` past the sections: nothing to wait for). */
  ready(k: number): boolean {
    if (k < 0 || k >= this.sections) return true;
    const bit = 1 << k;
    for (let i = 0; i < this.n; i++) if (this.masks[i]! & bit && !this.landed[i]) return false;
    return true;
  }

  /** Lamp `i` counts for the live section. */
  liveMember(i: number): boolean {
    return (this.masks[i]! & (1 << this.live)) !== 0;
  }

  get done(): boolean {
    return this.left === 0;
  }

  get remaining(): number {
    return this.left;
  }
}

/** (SB8, render only) Atlas z slices of a lamp tile per upload so one upload stays within `budget` bytes (at least one). */
export function slabDepth(nx: number, ny: number, budget: number): number {
  const s = nx * ny;
  return s > 0 ? Math.max(1, Math.floor(budget / s)) : 1;
}
