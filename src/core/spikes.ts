/**
 * Spike log (3.3, pure): every frame that takes over 1.5x the frame budget, tagged with what happened around it -
 * shaders compiled, voxel levels of detail swapped, lamps re-mixed (the phone light volume), the frame governor
 * stepping - else the main thread (its CPU time near the budget) or the GPU. The benchmark prints it per run; a
 * feedback note carries the match's.
 */
export const SPIKE = {
  /** A spike: an interval over this x the budget or the typical frame, whichever is longer (3.3.1: an uncapped
   *  benchmark run on a 120 Hz phone measured every 14 ms frame against 8.3 ms - nearly all of them "spikes"). */
  over: 1.5,
  /** How fast the typical frame follows (exponential average per frame). */
  typical: 0.05,
  /** Its CPU time over this x the budget: the main thread. */
  cpu: 0.8,
};

export const SPIKE_CAUSES = ['shaders', 'lod', 'lamps', 'governor', 'cpu', 'gpu'] as const;
export type SpikeCause = (typeof SPIKE_CAUSES)[number];
/** Event bits a frame reports (the causes that are events, not inferred). */
export const SPIKE_EVENT = { shaders: 1, lod: 2, lamps: 4, governor: 8 } as const;

export class SpikeLog {
  readonly counts: Record<SpikeCause, number> = { shaders: 0, lod: 0, lamps: 0, governor: 0, cpu: 0, gpu: 0 };
  total = 0;
  frames = 0;
  worstMs = 0;
  /** The last frame's events (a spike shows a frame after its work: both are looked at). */
  private prev = 0;
  /** The typical frame interval (an exponential average; 0 until the first frame). */
  typicalMs = 0;

  reset(): void {
    for (const k of SPIKE_CAUSES) this.counts[k] = 0;
    this.total = this.frames = this.worstMs = this.prev = this.typicalMs = 0;
  }

  /** One frame: its interval, the budget, its main-thread time (ms) and the events seen during it. */
  frame(intervalMs: number, budgetMs: number, cpuMs: number, events: number): SpikeCause | null {
    this.frames++;
    const ev = events | this.prev;
    this.prev = events;
    const typ = this.typicalMs || intervalMs;
    const over = intervalMs > SPIKE.over * Math.max(budgetMs, typ);
    // (a spike does not drag the typical frame up after it)
    this.typicalMs = typ + (Math.min(intervalMs, typ * 2) - typ) * SPIKE.typical;
    if (!over) return null;
    this.total++;
    this.worstMs = Math.max(this.worstMs, intervalMs);
    const c: SpikeCause =
      ev & SPIKE_EVENT.shaders ? 'shaders' : ev & SPIKE_EVENT.lamps ? 'lamps' : ev & SPIKE_EVENT.lod ? 'lod' : ev & SPIKE_EVENT.governor ? 'governor' : cpuMs > budgetMs * SPIKE.cpu ? 'cpu' : 'gpu';
    this.counts[c]++;
    return c;
  }

  /** "N spikes (worst W ms): gpu a, shaders b, ..." - only the causes seen. */
  summary(): string {
    if (!this.total) return `no spikes in ${this.frames} frames`;
    const parts = SPIKE_CAUSES.filter((k) => this.counts[k] > 0).map((k) => `${k} ${this.counts[k]}`);
    return `${this.total} spikes in ${this.frames} frames (worst ${Math.round(this.worstMs)} ms): ${parts.join(', ')}`;
  }
}
