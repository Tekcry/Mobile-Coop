/**
 * (piano SO5) Lightning: a fixed flash timeline, the sky's light for a storm scene. Pure and allocation-free.
 *
 * A flash is sky light, so it enters where the moon does: `LightField` adds `moon visibility x level` to its moon term
 * (`setFlash`), the picture adds the same level to the baked-lamp curve's moon term (`BakedLamps.skyFlash`) and to the
 * sun / moon directional light (`World.setFlash`). A window or a gap in the boards lets it in, a closed room stays
 * dark, and the bake's static shadows come free. The meter, guard sight and the picture read one value per sim step.
 *
 * The data is fixed (map or scene data, never random): `{ t, peak, len }` per strike, a double strike is two entries.
 * The clock is the shared sim clock (co-op: the host's, `net.simTime`) less `t0`, the sim time the scene's clock
 * reads 0 (Campaign sets it when the scene starts); host and client read the same data and clock, so nothing goes on
 * the wire.
 *
 * (piano SO5b) The sky ray alone gives an opening in a wall a thin slice of one direction (SO4 measured 0.13-0.23 lux in
 * the mill at a peak). A strike lights the whole sky, so each of a map's `openings` also gets one baked flash light
 * (`addOpeningLights`): its level is intensity x the flash, set with the field's once per sim step (`World.setFlash` ->
 * `LightRegistry.setSkyFlash`).
 */
import { hyp2 } from '../core/mathx';
import { makeCone, type LightRegistry } from './lights';

/** One strike: `t` s on the scene clock, `peak` 0..1 (its share of `FLASH_GAIN`), `len` s of decay after the rise. */
export interface Flash {
  t: number;
  peak: number;
  len: number;
}

/** (piano SO5b) An opening the flash comes through: its centre (on the wall's inner face), width, height (m) and the
 *  inward unit normal on the floor plane. The shape agreed with Campaign (`ThornbeckOpening` assigns to it). */
export interface LightningOpening {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  nx: number;
  nz: number;
}

/** A map's or scene's lightning: the strikes and, for a looping demo, the period they repeat on (0: once). */
export interface LightningData {
  flashes: readonly Flash[];
  period?: number;
  /** (piano SO5b) The windows and gaps the flash lights the inside through: one flash light each
   *  (`addOpeningLights`). Absent: no extra light, today's cost. */
  openings?: readonly LightningOpening[];
  /** (piano SO5b) The openings' light at a full strike (the lights' intensity); default `OPENING_LIGHT.gain`. */
  openingGain?: number;
}

/**
 * (piano SO5b) An opening's flash light: a point `inset` m inside the opening, `up` x its height above its centre (near
 * the head), aimed inward and `tilt` rad down, a feathered spot cone of half-angle `cone` rad, authored radius `radius`
 * (reach x `PHOTO.reach`: 8 m), intensity `gain`. One tuning pass (SO5b) against PLAN 2b's "5-20 lux within about 6 m":
 * under the 20 lux cap one point light keeps 5 lux from 1 m to 3 m on a 2.4 m window's centre line (17.7 lux at 2 m)
 * and falls to 1.5 lux at 4 m, 0.3 lux at 6 m (inverse square; `tests/lightningOpenings.test.ts`). The opening's own
 * frame and everything inside cast its shadows (it is baked as any lamp).
 */
export const OPENING_LIGHT = { inset: 0.3, up: 0.4, tilt: 0.4, cone: 1.4, radius: 5, gain: 0.65 } as const;
/** (piano SO5b) The flash's colour on screen (rendering only): a cold blue-white. */
export const OPENING_COLOR: readonly [number, number, number] = [0.82, 0.88, 1];

/**
 * (piano SO5b) Register one flash light per opening of `data` (map load, before the bake): kind `window`, not electric
 * (`mainsOff` and the EMP never touch it), not destructible, `flash` (dark until `LightRegistry.setSkyFlash`). Baked
 * with the map's own visibility like any lamp. Returns how many it added (0 without openings: nothing changes).
 */
export function addOpeningLights(reg: LightRegistry, data: LightningData | null | undefined): number {
  const os = data?.openings;
  if (!os?.length) return 0;
  const P = OPENING_LIGHT;
  const gain = data!.openingGain ?? P.gain;
  const c = Math.cos(P.tilt);
  const s = Math.sin(P.tilt);
  for (const o of os) {
    const n = hyp2(o.nx, o.nz) || 1;
    const nx = o.nx / n;
    const nz = o.nz / n;
    reg.add({
      kind: 'window',
      flash: true,
      electric: false,
      destructible: false,
      x: o.x + nx * P.inset,
      y: o.y + o.h * P.up,
      z: o.z + nz * P.inset,
      radius: P.radius,
      intensity: gain,
      color: [OPENING_COLOR[0], OPENING_COLOR[1], OPENING_COLOR[2]],
      cone: makeCone(nx * c, -s, nz * c, P.cone),
    });
  }
  return os.length;
}

/** Seconds from dark to a strike's peak (linear: a fast rise). */
export const FLASH_RISE = 0.03;
/** The gameplay level a full strike (`peak` 1) adds where the sky is fully visible (the moon term's scale). */
export const FLASH_GAIN = 0.6;

/** The dev demo (`?lightning=1` on any baked map with windows): a 12 s loop, a double strike, a faint one, a big one. */
export const DEMO_LIGHTNING: LightningData = {
  period: 12,
  flashes: [
    { t: 2, peak: 1, len: 0.22 },
    { t: 2.2, peak: 0.75, len: 0.3 },
    { t: 6.5, peak: 0.45, len: 0.15 },
    { t: 9.6, peak: 1, len: 0.2 },
    { t: 9.85, peak: 0.6, len: 0.28 },
  ],
};

export class Lightning {
  /** Strike times, peaks and decay lengths, sorted by time (fixed at construction). */
  private readonly ft: Float64Array;
  private readonly fp: Float64Array;
  private readonly fl: Float64Array;
  readonly count: number;
  readonly period: number;
  /** The sim time at which the scene clock reads 0 (Campaign: the scene's start, the same on host and client). */
  t0 = 0;

  constructor(data: LightningData) {
    const fs = data.flashes.filter((f) => f.len > 0 && f.peak > 0 && Number.isFinite(f.t)).sort((a, b) => a.t - b.t);
    this.count = fs.length;
    this.ft = new Float64Array(fs.length);
    this.fp = new Float64Array(fs.length);
    this.fl = new Float64Array(fs.length);
    fs.forEach((f, i) => {
      this.ft[i] = f.t;
      this.fp[i] = f.peak > 1 ? 1 : f.peak;
      this.fl[i] = f.len;
    });
    this.period = data.period && data.period > 0 ? data.period : 0;
  }

  /**
   * The flash at scene time `time` (0..peak): each strike rises linearly over `FLASH_RISE`, then falls as (1 - u)^2
   * over its `len`; overlapping strikes take the brighter. Before the first strike and between strikes, 0.
   */
  flashAt(time: number): number {
    let s = time;
    const P = this.period;
    if (P > 0) {
      s = s % P;
      if (s < 0) s += P;
    }
    let v = 0;
    const T = this.ft;
    for (let i = 0; i < this.count; i++) {
      const d = s - T[i]!;
      if (d < 0) break;
      let w: number;
      if (d < FLASH_RISE) w = (this.fp[i]! * d) / FLASH_RISE;
      else {
        const u = (d - FLASH_RISE) / this.fl[i]!;
        if (u >= 1) continue;
        w = this.fp[i]! * (1 - u) * (1 - u);
      }
      if (w > v) v = w;
    }
    return v;
  }

  /** The gameplay level the flash adds at full sky visibility at sim time `clock` (scene time `clock - t0`). */
  levelAt(clock: number): number {
    return this.flashAt(clock - this.t0) * FLASH_GAIN;
  }
}
