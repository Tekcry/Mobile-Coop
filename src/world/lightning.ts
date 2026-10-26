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
 */

/** One strike: `t` s on the scene clock, `peak` 0..1 (its share of `FLASH_GAIN`), `len` s of decay after the rise. */
export interface Flash {
  t: number;
  peak: number;
  len: number;
}

/** A map's or scene's lightning: the strikes and, for a looping demo, the period they repeat on (0: once). */
export interface LightningData {
  flashes: readonly Flash[];
  period?: number;
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
