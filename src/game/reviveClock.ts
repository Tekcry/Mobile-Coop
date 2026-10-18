/**
 * (CT prototype B8, G126) The co-op revive rules, pure and Babylon-free: a downed player can be revived within
 * `REVIVE_WINDOW` seconds, at most `REVIVES_PER_MISSION` times per mission; past the window or the cap the player is
 * out until the next checkpoint. The host owns one clock per match.
 */

/** Seconds a downed player can wait for a revive (G126). */
export const REVIVE_WINDOW = 30;
/** Revives per mission (team total, G126). */
export const REVIVES_PER_MISSION = 2;

export class ReviveClock {
  /** Revives used this mission. */
  used = 0;
  private readonly ids: string[] = [];
  private readonly left: number[] = [];

  constructor(
    readonly window = REVIVE_WINDOW,
    readonly cap = REVIVES_PER_MISSION,
  ) {}

  /** Can one more revive happen this mission? */
  get canRevive(): boolean {
    return this.used < this.cap;
  }

  /** `id` went down: starts its window and returns true, or false when the cap is spent (out at once). */
  down(id: string): boolean {
    if (!this.canRevive) return false;
    const i = this.ids.indexOf(id);
    if (i >= 0) this.left[i] = this.window;
    else {
      this.ids.push(id);
      this.left.push(this.window);
    }
    return true;
  }

  /** Seconds left for `id`, or -1 when it has no running window. */
  remaining(id: string): number {
    const i = this.ids.indexOf(id);
    return i >= 0 ? this.left[i]! : -1;
  }

  /** A partner revived `id` (counts against the cap). False when it had no window or the cap is spent. */
  revive(id: string): boolean {
    const i = this.ids.indexOf(id);
    if (i < 0 || !this.canRevive) return false;
    this.drop(i);
    this.used++;
    return true;
  }

  /** `id` is back by other means (a checkpoint, a leaver): no count. */
  clear(id: string): void {
    const i = this.ids.indexOf(id);
    if (i >= 0) this.drop(i);
  }

  /** Advance the windows; ids whose window ran out are pushed onto `out` (and dropped). Returns `out`. */
  step(dt: number, out: string[]): string[] {
    for (let i = this.ids.length - 1; i >= 0; i--) {
      const t = this.left[i]! - dt;
      if (t > 1e-9) this.left[i] = t;
      else {
        out.push(this.ids[i]!);
        this.drop(i);
      }
    }
    return out;
  }

  /** A checkpoint reload: every window stops; revives used stay (per mission). */
  checkpoint(): void {
    this.ids.length = 0;
    this.left.length = 0;
  }

  /** A new mission: everything back. */
  reset(): void {
    this.checkpoint();
    this.used = 0;
  }

  private drop(i: number): void {
    this.ids.splice(i, 1);
    this.left.splice(i, 1);
  }
}
