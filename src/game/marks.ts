/**
 * Mark & Execute (pure), unit-tested. A melee takedown earns an Execute charge (max 1). Marks (up to 3, 4 with
 * the upgrade) are toggled on enemies while aiming. Execute is ready when there is a charge and every live mark is
 * in weapon range and line of sight; it then runs a short slowed sequence that turns to each mark in order and
 * fires (`EXECUTE.perTarget` simulated seconds each).
 */

export const MARK = {
  max: 3,
  maxUpgraded: 4,
  charges: 1,
} as const;

export const EXECUTE = {
  /** Simulated seconds per target (turn + shot), and the time scale it plays at (single player). */
  perTarget: 0.14,
  slowScale: 0.5,
  /** Readiness checks per second (line-of-sight rays). */
  checkHz: 4,
} as const;

export class MarkSet {
  readonly ids: string[] = [];
  charges = 0;
  /** Executions so far (stats). */
  executed = 0;

  constructor(public max: number = MARK.max) {}

  has(id: string): boolean {
    return this.ids.includes(id);
  }

  /** Mark or unmark; false when full (nothing changed). */
  toggle(id: string): boolean {
    const k = this.ids.indexOf(id);
    if (k >= 0) {
      this.ids.splice(k, 1);
      return true;
    }
    if (this.ids.length >= this.max) return false;
    this.ids.push(id);
    return true;
  }

  /** Drop marks on targets that are gone. */
  prune(alive: (id: string) => boolean): void {
    for (let i = this.ids.length - 1; i >= 0; i--) if (!alive(this.ids[i]!)) this.ids.splice(i, 1);
  }

  /** A melee takedown: one charge (capped). */
  earn(): void {
    this.charges = Math.min(MARK.charges, this.charges + 1);
  }

  /** Ready when charged, something is marked and every mark passes `clear` (in range and in sight). */
  ready(clear: (id: string) => boolean): boolean {
    if (this.charges <= 0 || this.ids.length === 0) return false;
    for (const id of this.ids) if (!clear(id)) return false;
    return true;
  }

  /** Spend the charge and hand back the targets in order. */
  consume(): string[] {
    const out = this.ids.slice();
    this.ids.length = 0;
    this.charges = Math.max(0, this.charges - 1);
    this.executed++;
    return out;
  }

  clear(): void {
    this.ids.length = 0;
  }
}

/** Execute timeline: which target (index) and how far into its turn (0..1) at sequence time `t`; -1 when done. */
export function executeStep(n: number, t: number): { index: number; k: number } {
  if (n <= 0) return { index: -1, k: 1 };
  const i = Math.floor(t / EXECUTE.perTarget);
  if (i >= n) return { index: -1, k: 1 };
  return { index: i, k: (t - i * EXECUTE.perTarget) / EXECUTE.perTarget };
}
