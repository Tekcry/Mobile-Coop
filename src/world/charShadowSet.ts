/**
 * (LR14, sector-redesign charshadow) Character silhouette shadows from the lamps nearest the player - the pure part:
 * presets, which lamps hold a shadow-map slot (with hysteresis, so the set does not flicker), each slot's cone fit
 * around the characters in its reach, and the shared atlas's tiles. Babylon-free and allocation-free per frame
 * (fixed typed arrays); `world/charShadows.ts` renders it. Rendering only: the light meter and guard perception never
 * read any of it (they keep the light field, which has no character shadows at all).
 */
import type { ShadowQuality } from '../core/quality';
import { hyp2, hyp3 } from '../core/mathx';
import { LAMP_LEVEL_GAIN, photoFalloff } from './lampMath';

/**
 * (LR16-P F2) A lamp's character shadow reach (m): the distance where its level on the axis, `LAMP_LEVEL_GAIN` x
 * `intensity` x `photoFalloff(d, reach)`, falls to `minLevel` (bisection; at most `reach`); 0 when the lamp never gives
 * that much. Load time: intensity is map data (switches, jams and flicker scale the colour, not it). The slot picker,
 * the casters a slot's map draws and its doors and props read it (`BakedLamps.spheres` w); the light field never does.
 */
export function charShadowReach(intensity: number, reach: number, minLevel: number = CHAR_SHADOW.minLevel): number {
  const k = LAMP_LEVEL_GAIN * intensity;
  if (!(reach > 0) || !(k > 0)) return 0;
  if (!(minLevel > 0)) return reach;
  if (k * photoFalloff(0, reach) < minLevel) return 0;
  let lo = 0;
  let hi = reach;
  for (let i = 0; i < 48; i++) {
    const m = (lo + hi) * 0.5;
    if (k * photoFalloff(m, reach) >= minLevel) lo = m;
    else hi = m;
  }
  return lo;
}

/** The settings override: the preset's choice, or always on / off. */
export type CharShadowMode = 'auto' | 'on' | 'off';
export const CHAR_SHADOW_MODES: readonly CharShadowMode[] = ['auto', 'on', 'off'];

/** Lamps given a character shadow map, and each one's tile (px) in the shared atlas. 0 lamps: capsules only. */
export interface CharShadowSpec {
  lamps: number;
  tile: number;
}

/** Per shadow tier (Graphics > Shadows; the presets fill it). (LR16-7) Low and Medium get one slot - the nearest lamp
 *  only, its map refreshed every 2nd frame (`charShadowEvery`) - so a guard under it throws his shape on every tier;
 *  the characters outside that slot keep the capsules. Off: capsules only. */
export const CHAR_SHADOW_PRESET: Readonly<Record<ShadowQuality, Readonly<CharShadowSpec>>> = {
  off: { lamps: 0, tile: 0 },
  low: { lamps: 1, tile: 256 },
  medium: { lamps: 1, tile: 512 },
  high: { lamps: 2, tile: 512 },
  ultra: { lamps: 3, tile: 1024 },
  epic: { lamps: 4, tile: 1024 },
};
/** The override 'on' on a tier without maps (Off): High's set. */
export const CHAR_SHADOW_FORCED: Readonly<CharShadowSpec> = CHAR_SHADOW_PRESET.high;

/** The spec a shadow tier and the override give. */
export function charShadowSpec(q: ShadowQuality, mode: CharShadowMode = 'auto'): CharShadowSpec {
  const p = CHAR_SHADOW_PRESET[q];
  if (mode === 'off') return { lamps: 0, tile: 0 };
  if (mode === 'on' && p.lamps === 0) return { ...CHAR_SHADOW_FORCED };
  return { lamps: p.lamps, tile: p.tile };
}

export const CHAR_SHADOW = {
  /** Slots in the atlas (2 x 2 tiles). */
  maxSlots: 4,
  /** (LR16-P F2) A slot's shadow reach (`charShadowReach`): where the lamp's level (`LAMP_LEVEL_GAIN` x intensity x
   *  `photoFalloff`, on its axis) falls to this. Past it a character keeps his capsule from that lamp. Picture only. */
  minLevel: 0.04,
  /** A lamp is a candidate while the nearest focus point is within its shadow reach + this (m). */
  reachMargin: 3,
  /** A held lamp stays a candidate this much further (m). */
  keepMargin: 1,
  /** A held lamp competes at its distance x this: a newcomer must be 25% nearer to take its slot. */
  hold: 0.75,
  /** A lamp holds its slot at least this long (s) unless it goes dark or out of reach. */
  minHold: 0.5,
  /** Re-pick interval (s); a lamp going dark is released on the next frame. */
  pickEvery: 0.1,
  /** A slot whose lamp is further than this from the focus (m) refreshes every 2nd frame. */
  near: 8,
  /** The cone fit: the widest half-angle (rad) a slot's map covers (wider: a partial fit), the narrowest, and the pad. */
  maxHalf: 1.25,
  minHalf: 0.08,
  pad: 0.02,
  /** Added to every caster's bounding sphere (m): skinned bodies keep bind-pose bounds, and bounds lag a frame. */
  sphereMargin: 0.3,
  /** The near plane: this share of the nearest caster's front (m), at least `minNear`. */
  nearFrac: 0.9,
  minNear: 0.05,
  /** Shadowed: the lamp's term x this (the capsules' floor, so a preset change alters the shape, not the darkness). */
  floor: 0.15,
  /** Depth bias (m) and the normal offset of the tested point (m, + per metre from the lamp). */
  bias: 0.03,
  normalOffset: 0.02,
  normalPerM: 0.004,
  /** (LR16f) Contact-hardening softness (PCSS): the lamp fixture's radius (m) - the penumbra radius on a receiver is
   *  `lightRadius x (receiver - blocker) / blocker` - capped at `maxPenumbra` (m), and the filter radius in shadow-map
   *  texels kept within [`minTexels`, `maxTexels`] (the floor keeps a 2-texel disc at contact, as the old 2 x 2 PCF). */
  lightRadius: 0.12,
  maxPenumbra: 0.3,
  minTexels: 1,
  maxTexels: 24,
} as const;

/** (LR16f) Filter taps per shadow tier (the blocker search takes half as many): picture only, never the meter.
 *  (LR16-7) Low / Medium: 4 filter + 2 search - 2 fetches where no blocker is near (most pixels; the old 2 x 2 PCF
 *  took 4 everywhere), 6 in or near a shadow; the kernel's first point sits near its centre, so the 2-tap search
 *  still finds the umbra and only the outermost fringe of a wide penumbra reads a little harder. */
export const CHAR_SHADOW_TAPS: Readonly<Record<ShadowQuality, number>> = { off: 0, low: 4, medium: 4, high: 8, ultra: 12, epic: 16 };
/** The kernel's size (the most taps any tier takes). */
export const CHAR_SHADOW_KERNEL = 16;

/** Filter taps for a configured spec (`CharShadows.configure` gets lamps and tile, not the tier): a single slot at
 *  Medium's tile or smaller (Low / Medium) 4, High's 512 tile 8, Ultra's 1024 tile 12, Epic's 4 lamps 16; the override
 *  'on' on Off takes High's. */
export function charShadowTaps(lamps: number, tile: number): number {
  if (lamps <= 0 || tile <= 0) return 0;
  if (lamps < CHAR_SHADOW_PRESET.high.lamps && tile <= CHAR_SHADOW_PRESET.medium.tile) return CHAR_SHADOW_TAPS.medium;
  if (tile < CHAR_SHADOW_PRESET.ultra.tile) return CHAR_SHADOW_TAPS.high;
  return lamps >= CHAR_SHADOW_PRESET.epic.lamps ? CHAR_SHADOW_TAPS.epic : CHAR_SHADOW_TAPS.ultra;
}

/** (LR16-7) The least frames between a slot's map refreshes per tier: Low / Medium every 2nd frame (half the caster
 *  draws), High up every frame (far slots still every 2nd, `LampSlotPicker.refreshEvery`). */
export const CHAR_SHADOW_EVERY: Readonly<Record<ShadowQuality, number>> = { off: 1, low: 2, medium: 2, high: 1, ultra: 1, epic: 1 };
/** That floor for a configured spec (the same rule as `charShadowTaps`). */
export function charShadowEvery(lamps: number, tile: number): number {
  return lamps > 0 && lamps < CHAR_SHADOW_PRESET.high.lamps && tile <= CHAR_SHADOW_PRESET.medium.tile ? CHAR_SHADOW_EVERY.medium : 1;
}

/**
 * (LR16f) The fixed Poisson kernel: `CHAR_SHADOW_KERNEL` points in the unit disc (x, y interleaved) by Mitchell's best
 * candidate from a fixed seed, so every prefix (the blocker search's half, each tier's count) is itself well spread.
 * Built once at load; the same every run and every frame (no per-frame jitter, no shimmer).
 */
export const CHAR_SHADOW_DISK: Float32Array = (() => {
  const n = CHAR_SHADOW_KERNEL;
  const out = new Float32Array(n * 2);
  let seed = 0x1f2e3d4c;
  const rnd = (): number => {
    // mulberry32
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < n; i++) {
    let bx = 0;
    let by = 0;
    let best = -1;
    for (let c = 0; c < 64; c++) {
      // uniform in the disc
      const r = Math.sqrt(rnd());
      const a = rnd() * Math.PI * 2;
      const x = r * Math.cos(a);
      const y = r * Math.sin(a);
      let d = i === 0 ? 1 - r : Infinity;
      for (let j = 0; j < i; j++) {
        const dx = x - out[j * 2]!;
        const dy = y - out[j * 2 + 1]!;
        d = Math.min(d, dx * dx + dy * dy);
      }
      if (d > best) {
        best = d;
        bx = x;
        by = y;
      }
    }
    out[i * 2] = bx;
    out[i * 2 + 1] = by;
  }
  return out;
})();

/** (LR16f) The penumbra radius (m) on a receiver `dr` from the lamp behind a blocker `db` from it: 0 at contact,
 *  growing with the gap, capped. The GLSL (`charShadows.ts`) computes the same from the same constants. */
export function charPenumbra(dr: number, db: number): number {
  const gap = Math.max(0, dr - db);
  return Math.min(CHAR_SHADOW.maxPenumbra, (CHAR_SHADOW.lightRadius * gap) / Math.max(db, CHAR_SHADOW.minNear));
}

/** (LR16f) That radius in shadow-map texels: the map spans `2 dr / sx` metres over `tile` texels at the receiver
 *  (`sx` = 1 / tan(half angle)), clamped to [`minTexels`, `maxTexels`]. */
export function charFilterTexels(penumbra: number, dr: number, sx: number, tile: number): number {
  const t = (penumbra * 0.5 * tile * sx) / Math.max(dr, CHAR_SHADOW.minNear);
  return Math.min(CHAR_SHADOW.maxTexels, Math.max(CHAR_SHADOW.minTexels, t));
}

/**
 * Which lamps hold the shadow-map slots. Candidates are lit lamps whose radius (+ `reachMargin`) reaches the nearest
 * focus point; the nearest win. Hysteresis: a held lamp competes at `hold` x its distance, keeps its slot `minHold`
 * at least and stays a candidate `keepMargin` further; a lamp that stays keeps its slot index (its atlas tile).
 * Allocation-free.
 */
export class LampSlotPicker {
  /** Lamp index per slot (-1: idle). */
  readonly slotLamp: Int32Array;
  /** The slot's lamp's distance to the nearest focus point (m), at the last pick. */
  readonly slotDist: Float32Array;
  /** How long each slot has held its lamp (s). */
  private readonly heldFor: Float32Array;
  /** Bumped on every change of assignment. */
  version = 0;
  /** (LR16-5b) The last `update`'s swinging lamps (null: none). */
  private mv: Uint8Array | null = null;
  private slots = 0;
  private t = Infinity;
  private readonly candLamp: Int32Array;
  private readonly candScore: Float32Array;
  private readonly candDist: Float32Array;

  constructor(readonly maxSlots: number = CHAR_SHADOW.maxSlots) {
    this.slotLamp = new Int32Array(maxSlots).fill(-1);
    this.slotDist = new Float32Array(maxSlots);
    this.heldFor = new Float32Array(maxSlots);
    this.candLamp = new Int32Array(maxSlots);
    this.candScore = new Float32Array(maxSlots);
    this.candDist = new Float32Array(maxSlots);
  }

  /** Slots in use (the preset's lamp count); slots past it are released. */
  get count(): number {
    return this.slots;
  }
  setSlots(n: number): void {
    n = Math.max(0, Math.min(this.maxSlots, n | 0));
    if (n === this.slots) return;
    this.slots = n;
    for (let s = n; s < this.maxSlots; s++) this.release(s);
    this.t = Infinity;
    this.version++;
  }

  /** The slot holding lamp `i`, or -1. */
  slotOf(i: number): number {
    for (let s = 0; s < this.slots; s++) if (this.slotLamp[s] === i) return s;
    return -1;
  }

  private release(s: number): void {
    this.slotLamp[s] = -1;
    this.slotDist[s] = 0;
    this.heldFor[s] = 0;
  }

  /**
   * Per frame. `lamps`: per lamp x, y, z, radius (stride 4; (LR16-P F2) the shadow reach, 0: never a slot), `n` of
   * them; `lit`: non-zero while the lamp gives light; `focus`: x, y, z per point (the local player, the camera), `nf` of them. Returns true when the assignment changed.
   */
  update(lamps: Float32Array, lit: Uint8Array, n: number, focus: Float32Array, nf: number, dt: number, moving: Uint8Array | null = null): boolean {
    const v0 = this.version;
    // (LR16-5b) the swinging lamps (`refreshEvery` reads them too): a held one keeps its slot while it moves
    this.mv = moving;
    for (let s = 0; s < this.slots; s++) {
      const i = this.slotLamp[s]!;
      if (i < 0) continue;
      this.heldFor[s] = this.heldFor[s]! + dt;
      // (a lamp switched off, shot or jammed lets go at once: it throws no shadow)
      if (i >= n || !lit[i]) {
        this.release(s);
        this.version++;
      }
    }
    this.t += dt;
    if (this.t < CHAR_SHADOW.pickEvery || this.slots === 0) return this.version !== v0;
    this.t = 0;
    const k = this.slots;
    let nc = 0;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      // ((LR16-P F2) a lamp whose shadow reach is 0 never gives minLevel: no slot)
      if (!lit[i] || !(lamps[o + 3]! > 0)) continue;
      const lx = lamps[o]!;
      const ly = lamps[o + 1]!;
      const lz = lamps[o + 2]!;
      let d = Infinity;
      for (let f = 0; f < nf; f++) {
        const e = hyp3(focus[f * 3]! - lx, focus[f * 3 + 1]! - ly, focus[f * 3 + 2]! - lz);
        if (e < d) d = e;
      }
      const s = this.slotOf(i);
      const limit = lamps[o + 3]! + CHAR_SHADOW.reachMargin + (s >= 0 ? CHAR_SHADOW.keepMargin : 0);
      if (!(d < limit)) continue;
      // (a lamp inside its minimum hold outranks every newcomer; (LR16-5b) so does a held lamp while it swings, and a
      // swinging newcomer competes as if held)
      const swings = moving !== null && moving[i]! !== 0;
      const score = s < 0 ? (swings ? d * CHAR_SHADOW.hold : d) : this.heldFor[s]! < CHAR_SHADOW.minHold || swings ? -1 : d * CHAR_SHADOW.hold;
      // insert into the k best (ascending score)
      let j = nc < k ? nc++ : k;
      if (j === k && !(score < this.candScore[k - 1]!)) continue;
      if (j === k) j = k - 1;
      while (j > 0 && this.candScore[j - 1]! > score) {
        this.candScore[j] = this.candScore[j - 1]!;
        this.candLamp[j] = this.candLamp[j - 1]!;
        this.candDist[j] = this.candDist[j - 1]!;
        j--;
      }
      this.candScore[j] = score;
      this.candLamp[j] = i;
      this.candDist[j] = d;
    }
    // held lamps that stay keep their slot; the rest of the slots free up
    for (let s = 0; s < k; s++) {
      const i = this.slotLamp[s]!;
      if (i < 0) continue;
      let c = -1;
      for (let j = 0; j < nc; j++) if (this.candLamp[j] === i) c = j;
      if (c < 0) {
        this.release(s);
        this.version++;
      } else this.slotDist[s] = this.candDist[c]!;
    }
    // newcomers take the free slots (lowest first)
    for (let j = 0; j < nc; j++) {
      const i = this.candLamp[j]!;
      if (this.slotOf(i) >= 0) continue;
      for (let s = 0; s < k; s++) {
        if (this.slotLamp[s]! >= 0) continue;
        this.slotLamp[s] = i;
        this.slotDist[s] = this.candDist[j]!;
        this.heldFor[s] = 0;
        this.version++;
        break;
      }
    }
    return this.version !== v0;
  }

  /** Frames between a slot's map refreshes: every frame near the focus, every 2nd further, at least the tier's
   *  `base` (LR16-7: Low / Medium 2), x the governor's. */
  refreshEvery(s: number, governorEvery = 1, base = 1): number {
    // (LR16-5b) a swinging lamp's map follows it every frame (the tier's base and the governor still hold)
    const i = this.slotLamp[s]!;
    const mv = this.mv;
    if (mv !== null && i >= 0 && mv[i]! !== 0) return Math.max(base | 0, 1) * Math.max(1, governorEvery | 0);
    return Math.max(base | 0, this.slotDist[s]! <= CHAR_SHADOW.near ? 1 : 2) * Math.max(1, governorEvery | 0);
  }
}

/** `fitCone`'s output layout. */
export const FIT = { dx: 0, dy: 1, dz: 2, half: 3, near: 4, partial: 5, count: 6, size: 8 } as const;

/**
 * The cone from a lamp at (lx, ly, lz) around the casters' bounding spheres (x, y, z, r; stride 4, `n` of them, each
 * grown by `sphereMargin`): the axis (the mean direction to the centres), the half-angle that covers every sphere
 * (+ `pad`, at least `minHalf`, capped at `maxHalf`: then `partial` is 1), the near plane. Into `out` (`FIT`); false
 * when there is nothing to fit (no sphere, or the lamp inside every one).
 */
export function fitCone(lx: number, ly: number, lz: number, spheres: Float32Array, n: number, out: Float32Array): boolean {
  let ax = 0;
  let ay = 0;
  let az = 0;
  let cnt = 0;
  let near = Infinity;
  for (let c = 0; c < n; c++) {
    const o = c * 4;
    const x = spheres[o]! - lx;
    const y = spheres[o + 1]! - ly;
    const z = spheres[o + 2]! - lz;
    const d = hyp3(x, y, z);
    const r = spheres[o + 3]! + CHAR_SHADOW.sphereMargin;
    // (the lamp inside a caster's sphere: no cone can hold it; it is left to the capsules)
    if (d <= r) continue;
    ax += x / d;
    ay += y / d;
    az += z / d;
    cnt++;
    if (d - r < near) near = d - r;
  }
  out[FIT.count] = cnt;
  if (cnt === 0) return false;
  let al = hyp3(ax, ay, az);
  if (al < 1e-6) {
    ax = 0;
    ay = -1;
    az = 0;
    al = 1;
  }
  ax /= al;
  ay /= al;
  az /= al;
  let half = 0;
  for (let c = 0; c < n; c++) {
    const o = c * 4;
    const x = spheres[o]! - lx;
    const y = spheres[o + 1]! - ly;
    const z = spheres[o + 2]! - lz;
    const d = hyp3(x, y, z);
    const r = spheres[o + 3]! + CHAR_SHADOW.sphereMargin;
    if (d <= r) continue;
    const a = Math.acos(Math.max(-1, Math.min(1, (x * ax + y * ay + z * az) / d))) + Math.asin(r / d);
    if (a > half) half = a;
  }
  half += CHAR_SHADOW.pad;
  out[FIT.dx] = ax;
  out[FIT.dy] = ay;
  out[FIT.dz] = az;
  out[FIT.partial] = half > CHAR_SHADOW.maxHalf ? 1 : 0;
  out[FIT.half] = Math.max(CHAR_SHADOW.minHalf, Math.min(CHAR_SHADOW.maxHalf, half));
  out[FIT.near] = Math.max(CHAR_SHADOW.minNear, near * CHAR_SHADOW.nearFrac);
  return true;
}

/** True when a sphere (x, y, z, r) seen from the lamp lies wholly inside a fit's cone (its map holds that caster). */
export function coneCovers(fit: Float32Array, lx: number, ly: number, lz: number, x: number, y: number, z: number, r: number): boolean {
  const dx = x - lx;
  const dy = y - ly;
  const dz = z - lz;
  const d = hyp3(dx, dy, dz);
  if (d <= r) return false;
  const a = Math.acos(Math.max(-1, Math.min(1, (dx * fit[FIT.dx]! + dy * fit[FIT.dy]! + dz * fit[FIT.dz]!) / d))) + Math.asin(r / d);
  return a <= fit[FIT.half]!;
}

/**
 * (lrpolish) The spheres `fitCone` fitted (the lamp outside sphere + `sphereMargin`), copied from `src` (`n`, stride 4)
 * into `dst`; returns their count. What a copied map holds, for `spheresHold`.
 */
export function fittedSpheres(lx: number, ly: number, lz: number, src: Float32Array, n: number, dst: Float32Array): number {
  let k = 0;
  for (let c = 0; c < n; c++) {
    const o = c * 4;
    const r = src[o + 3]!;
    if (hyp3(src[o]! - lx, src[o + 1]! - ly, src[o + 2]! - lz) <= r + CHAR_SHADOW.sphereMargin) continue;
    dst[k * 4] = src[o]!;
    dst[k * 4 + 1] = src[o + 1]!;
    dst[k * 4 + 2] = src[o + 2]!;
    dst[k * 4 + 3] = r;
    k++;
  }
  return k;
}

/** (lrpolish) True when (x, y, z) - a capsule's midpoint - lies in one of `n` spheres (+ `sphereMargin`). */
export function spheresHold(spheres: Float32Array, n: number, x: number, y: number, z: number): boolean {
  for (let c = 0; c < n; c++) {
    const o = c * 4;
    const r = spheres[o + 3]! + CHAR_SHADOW.sphereMargin;
    const dx = x - spheres[o]!;
    const dy = y - spheres[o + 1]!;
    const dz = z - spheres[o + 2]!;
    if (dx * dx + dy * dy + dz * dz <= r * r) return true;
  }
  return false;
}

/** The atlas (2 x 2 tiles): its side (px) and a slot's tile origin (px). (LR16-7) One slot (Low / Medium): the atlas is
 *  that one tile (slot 0's origin is 0, so the shader reads it unchanged), a quarter of the memory. */
export function atlasSize(tile: number, slots: number = CHAR_SHADOW.maxSlots): number {
  return slots > 1 ? tile * 2 : tile;
}
export function tileX(slot: number, tile: number): number {
  return (slot & 1) * tile;
}
export function tileY(slot: number, tile: number): number {
  return (slot >> 1) * tile;
}

/** (LR16-3) A door leaf or prop at (x, y, z) with bounding radius r can reach a lamp's slot when within its range. */
export function casterInReach(lx: number, ly: number, lz: number, reach: number, x: number, y: number, z: number, r: number): boolean {
  return hyp3(x - lx, y - ly, z - lz) <= reach + r;
}

/**
 * (LR16 fix, LR16-3) A door leaf's bounding sphere at any swing, into `out` (x, y, z, r): centred on the hinge line at
 * mid height, radius = the leaf's far edge from there (hyp(width, height / 2)). The slot's cone fit takes it, so the
 * leaf's shadow is never cut at the frustum. Allocation-free.
 */
export function doorSphere(a: { hinge: { x: number; y: number; z: number }; width: number; height: number }, out: Float32Array): void {
  out[0] = a.hinge.x;
  out[1] = a.hinge.y + a.height * 0.5;
  out[2] = a.hinge.z;
  out[3] = hyp2(a.width, a.height * 0.5);
}
