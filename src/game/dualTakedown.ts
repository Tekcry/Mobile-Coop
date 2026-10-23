/** Two takedowns by different players this close together (s) make a dual takedown (moved from coopHost.ts). */
export const DUAL_WINDOW = 1.5;

/** (spare 12) The co-op dual takedown clock (host): pure, no allocation. */
export class DualClock {
  private by = '';
  private t = 0;
  private has = false;

  /** A takedown by `by` finished at host time `t` (s): the partner's id when it pairs with the last one (the clock
   *  clears), else null (this one becomes the last). Same player twice: the newer replaces the older. */
  note(by: string, t: number): string | null {
    if (this.has && this.by !== by && t - this.t <= DUAL_WINDOW) {
      const p = this.by;
      this.has = false;
      this.by = '';
      return p;
    }
    this.has = true;
    this.by = by;
    this.t = t;
    return null;
  }

  reset(): void {
    this.has = false;
    this.by = '';
  }
}
