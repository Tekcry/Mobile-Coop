/**
 * Converts a held direction into discrete UI navigation steps with an initial
 * delay then auto-repeat (like a keyboard). Pure: driven by explicit time.
 */
export class NavRepeater {
  private heldSince = -1;
  private lastFire = -1;
  constructor(
    private delay = 0.4,
    private interval = 0.11,
  ) {}

  /** @returns true when a navigation step should fire this tick. */
  update(held: boolean, now: number): boolean {
    if (!held) {
      this.heldSince = -1;
      return false;
    }
    if (this.heldSince < 0) {
      this.heldSince = now;
      this.lastFire = now;
      return true;
    }
    if (now - this.heldSince >= this.delay && now - this.lastFire >= this.interval) {
      this.lastFire = now;
      return true;
    }
    return false;
  }
}
