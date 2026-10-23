/**
 * (coop-walk-fixes P7) A partner's rounds from its `PlayerState.sc` (rounds fired mod 256; protocol 37). Michael 4.72:
 * "coop player shooting doubles audio and doesnt sound suppressed." The remote used to fire a round every fire interval
 * while `PF.firing` (fired within the last 0.2 s) was set, so one shot played twice (and a burst ran long). Now each
 * step of the counter is one round, played no faster than the weapon fires. Pure, no allocation.
 */

/** Rounds queued at most (a late burst plays out at the fire rate, never a pile-up). */
export const SHOTS_QUEUE_MAX = 8;
/** A jump of the counter larger than this is a resync (a rejoin restarted it, a long gap): no rounds played. */
export const SHOTS_RESYNC = 16;

export class RemoteShots {
  /** Last counter seen (-1: none yet). */
  private last = -1;
  /** Rounds still to play, and seconds until the next may. */
  pending = 0;
  private wait = 0;

  /** A state's counter (`undefined`: the state has none). The first one seen only syncs. */
  observe(sc: number | undefined): void {
    if (sc === undefined) return;
    if (this.last < 0) {
      this.last = sc;
      return;
    }
    const d = (sc - this.last) & 255;
    this.last = sc;
    if (d > 0 && d <= SHOTS_RESYNC) this.pending = Math.min(SHOTS_QUEUE_MAX, this.pending + d);
  }

  /** Render step: true when a round plays now (then the next waits `interval` s). */
  step(dt: number, interval: number): boolean {
    this.wait = Math.max(0, this.wait - dt);
    if (this.pending <= 0 || this.wait > 0) return false;
    this.pending--;
    this.wait = interval;
    return true;
  }

  /** Downed or gone: nothing queued plays (the counter stays synced). */
  clear(): void {
    this.pending = 0;
  }
}
