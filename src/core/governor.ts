/**
 * Frame governor (3.1, pure): in a match, steps detail down when frames are missed and back up when there is room,
 * so a preset holds its frame rate on any device (a phone getting hot included). Visual only - nothing it touches
 * changes what can be seen or hit (fog, the structure voxels and every gameplay rule stay as they are; crossplay
 * fairness). Each step is cheap to apply at run time (no shader recompiles):
 *
 *   1-3  render scale (TAAU / the canvas) 0.92, 0.84, 0.76 of the preset's
 *   4    shadows refresh every other frame
 *   5    volumetric light: half the lights
 *   6    voxel levels of detail 25% nearer
 *   7    effects at 60%
 *   8    real-time lights x0.75
 *   9    character / part levels of detail and animation rate 25% nearer
 *   10   render scale 0.68
 *
 * Down: the 90th percentile frame interval over `window` s above the budget x `missSlack` (after `cooldown` s since
 * the last change). Up (vsync hides spare time): after `probeAfter` s on a level, one step up on trial; a miss within
 * `probeTime` s goes back down and doubles the wait (up to `probeMax`). Thermal: frames getting slower at the same
 * level for minutes or three missed tries back up in a row (`thermal`); Low Power Mode: the display rate dropping to ~30 Hz on a phone (`lowPower`).
 */
export const GOVERNOR = {
  window: 1,
  missSlack: 1.08,
  cooldown: 1,
  probeAfter: 6,
  probeTime: 2.5,
  probeMax: 96,
  /** Thermal: average interval at one level this much above the first minute's. */
  thermalDrift: 0.12,
  thermalAfter: 120,
};

export interface Adaptive {
  /** Multiplies the render scale. */
  scale: number;
  /** Shadow maps re-rendered every N frames. */
  shadowEvery: number;
  /** Multiplies the volumetric light count. */
  volLights: number;
  /** Multiplies the voxel level-of-detail distances. */
  voxelLod: number;
  /** Multiplies the effects density. */
  effects: number;
  /** Multiplies the real-time light count. */
  lights: number;
  /** Multiplies the part / animation level-of-detail distances. */
  partLod: number;
}

export const FULL: Readonly<Adaptive> = { scale: 1, shadowEvery: 1, volLights: 1, voxelLod: 1, effects: 1, lights: 1, partLod: 1 };

/** The detail at a governor level (0 = the preset as set). */
export function adaptiveAt(level: number, out: Adaptive = { ...FULL }): Adaptive {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  out.scale = l >= 10 ? 0.68 : l >= 3 ? 0.76 : l >= 2 ? 0.84 : l >= 1 ? 0.92 : 1;
  out.shadowEvery = l >= 4 ? 2 : 1;
  out.volLights = l >= 5 ? 0.5 : 1;
  out.voxelLod = l >= 6 ? 0.75 : 1;
  out.effects = l >= 7 ? 0.6 : 1;
  out.lights = l >= 8 ? 0.75 : 1;
  out.partLod = l >= 9 ? 0.75 : 1;
  return out;
}

export const MAX_LEVEL = 10;

/**
 * 3.3 phones: the ladder is the render resolution only - `scales` (x native, from the top) relative to the match's
 * `base`, then one more level that holds 30 fps (`capped`). Everything else stays as built.
 */
export function phoneAdaptiveAt(level: number, scales: readonly number[], base: number, out: Adaptive = { ...FULL }): Adaptive {
  Object.assign(out, FULL);
  const l = Math.max(0, Math.min(scales.length - 1, Math.round(level)));
  out.scale = scales[l]! / base;
  return out;
}

export class Governor {
  level = 0;
  /** The top level (the cheapest): 10, or a phone's ladder length (3.3). */
  max = MAX_LEVEL;
  /** Frames are slowing at a steady level (a hot device). */
  thermal = false;
  /** The display rate fell to ~30 Hz on a phone (iOS Low Power Mode). */
  lowPower = false;
  private buf = new Float32Array(256);
  private n = 0;
  private head = 0;
  private sinceChange = 0;
  private probing = false;
  private probeT = 0;
  private wait = GOVERNOR.probeAfter;
  private sum = 0;
  private count = 0;
  private t = 0;
  private firstAvg = 0;
  private levelT = 0;
  private failed = 0;
  private readonly tmp = new Float32Array(256);

  /** Reset (a new match, a new preset): back to the preset's full detail (or `start`: a phone starts at its floor). */
  reset(start = 0): void {
    this.level = Math.max(0, Math.min(this.max, start));
    this.n = 0;
    this.head = 0;
    this.sinceChange = 0;
    this.probing = false;
    this.wait = GOVERNOR.probeAfter;
    this.sum = this.count = this.t = this.firstAvg = this.levelT = this.failed = 0;
    this.thermal = false;
  }

  /** The display's rate (Hz) and whether it is a phone: iOS Low Power Mode caps the page at 30. */
  display(hz: number, mobile: boolean): void {
    this.lowPower = mobile && hz > 0 && hz < 40;
  }

  /**
   * One rendered frame: its interval and the budget (ms). Returns true when the level changed. Allocation-free.
   */
  frame(intervalMs: number, budgetMs: number): boolean {
    const dt = Math.min(0.25, intervalMs / 1000);
    this.buf[this.head] = intervalMs;
    this.head = (this.head + 1) % this.buf.length;
    if (this.n < this.buf.length) this.n++;
    this.sinceChange += dt;
    this.t += dt;
    this.levelT += dt;
    // thermal: each minute's average at this level against the first one's
    this.sum += intervalMs;
    this.count++;
    if (this.t >= 60) {
      const avg = this.sum / this.count;
      if (this.firstAvg === 0) this.firstAvg = avg;
      else if (this.levelT > GOVERNOR.thermalAfter && avg > this.firstAvg * (1 + GOVERNOR.thermalDrift)) this.thermal = true;
      this.sum = this.count = this.t = 0;
    }
    // (or the device keeps failing to get back what it held: three missed tries in a row)
    if (this.failed >= 3) this.thermal = true;
    const p90 = this.p90(budgetMs, GOVERNOR.window);
    const miss = p90 > budgetMs * GOVERNOR.missSlack;
    if (this.probing) {
      this.probeT += dt;
      if (miss && this.sinceChange > 0.4) {
        // the step up did not hold: back down, wait longer before the next try
        this.probing = false;
        this.failed++;
        this.wait = Math.min(GOVERNOR.probeMax, this.wait * 2);
        return this.set(this.level + 1);
      }
      if (this.probeT > GOVERNOR.probeTime) {
        this.probing = false;
        this.failed = 0;
        this.wait = GOVERNOR.probeAfter;
      }
      return false;
    }
    if (miss && this.sinceChange > GOVERNOR.cooldown && this.level < this.max) return this.set(this.level + 1);
    if (!miss && this.level > 0 && this.sinceChange > this.wait) {
      this.probing = true;
      this.probeT = 0;
      return this.set(this.level - 1);
    }
    return false;
  }

  private set(l: number): boolean {
    const v = Math.max(0, Math.min(this.max, l));
    if (v === this.level) return false;
    this.level = v;
    this.sinceChange = 0;
    this.n = 0;
    this.levelT = 0;
    this.firstAvg = 0;
    this.sum = this.count = this.t = 0;
    return true;
  }

  /** 90th percentile of the intervals in the last `seconds` (the budget until there are a few). */
  private p90(budgetMs: number, seconds: number): number {
    let k = 0;
    let acc = 0;
    // (at least 8 frames, however long they take: a very slow device still gets a verdict)
    for (let i = 0; i < this.n && (acc < seconds * 1000 || k < 8); i++) {
      const v = this.buf[(this.head - 1 - i + this.buf.length) % this.buf.length]!;
      this.tmp[k++] = v;
      acc += v;
    }
    if (k < 8) return budgetMs;
    const a = this.tmp.subarray(0, k).sort();
    return a[Math.min(k - 1, Math.floor(0.9 * k))]!;
  }
}
