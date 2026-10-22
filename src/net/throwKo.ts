/**
 * (throw-ko, spare job 3) The host's watch over partner throws (CT: the thrown partner landing on a guard knocks him
 * out; `docs/ct-research/levels-digest.md`, the co-op move table's "Partner throw" row). Babylon-free.
 *
 * Host-authoritative: at each throw's start (`tstart`) the host records the flight the thrown player plays (`throwArc`
 * from where the host has them to the bounded landing, from the host's start time); every fixed step it replays the
 * arc and, on the way down, the first guard the falling body comes down on (`throwKoHit`) is handed to `onHit`, which
 * knocks him out through the game's own path. The client sees the guard go down through the guard state sync.
 */
import { TEAM } from '../config/movement';
import { throwArc, throwArcVy, throwKoHit } from '../game/teamMoves';

/** What the watch reads of a guard (an `Enemy` fits). */
export interface ThrowKoGuard {
  readonly id: string;
  readonly pos: { readonly x: number; readonly y: number; readonly z: number };
  readonly alive: boolean;
  /** Seized by a takedown (his own or a partner's): not a target. */
  readonly taken: boolean;
}

interface Flight {
  on: boolean;
  by: string;
  t0: number;
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

export class ThrowKo<G extends ThrowKoGuard = ThrowKoGuard> {
  private flights: Flight[] = [];
  private pt = { x: 0, y: 0, z: 0 };
  /** Guards knocked out by throws (tests). */
  ko = 0;

  constructor(
    /** The thrown player `by` is still up (a downed flier takes nobody down). */
    private alive: (by: string) => boolean,
    /** Knock `g` out: thrown player `by`, feet at `at` (reused: copy it to keep it). */
    private onHit: (by: string, g: G, at: { readonly x: number; readonly y: number; readonly z: number }) => void,
  ) {}

  /** A throw started at host time `t0`: `by` flies from (`x0`, `y0`, `z0`) to the landing (`x1`, `y1`, `z1`). */
  start(by: string, t0: number, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
    // the flier's own slot (a new throw replaces its old one), else a free one
    let f: Flight | undefined;
    for (let i = 0; i < this.flights.length; i++) {
      const c = this.flights[i]!;
      if (c.by === by) {
        f = c;
        break;
      }
      if (!c.on && !f) f = c;
    }
    if (!f) {
      f = { on: false, by, t0, x0, y0, z0, x1, y1, z1 };
      this.flights.push(f);
    }
    f.on = true;
    f.by = by;
    f.t0 = t0;
    f.x0 = x0;
    f.y0 = y0;
    f.z0 = z0;
    f.x1 = x1;
    f.y1 = y1;
    f.z1 = z1;
  }

  /** Any throw in flight. */
  get active(): boolean {
    for (let i = 0; i < this.flights.length; i++) if (this.flights[i]!.on) return true;
    return false;
  }

  /** One host fixed step at host time `now`: each flight's feet against the guards (one guard per throw). */
  step(now: number, guards: readonly G[]): void {
    for (let i = 0; i < this.flights.length; i++) {
      const f = this.flights[i]!;
      if (!f.on) continue;
      if (!this.alive(f.by)) {
        f.on = false;
        continue;
      }
      const t = Math.min(now - f.t0, TEAM.throwTime);
      const p = throwArc(t, f.x0, f.y0, f.z0, f.x1, f.y1, f.z1, this.pt);
      const vy = throwArcVy(t, f.y0, f.y1);
      for (let j = 0; j < guards.length; j++) {
        const g = guards[j]!;
        if (!g.alive || g.taken || !throwKoHit(p.x, p.y, p.z, vy, g.pos.x, g.pos.y, g.pos.z)) continue;
        f.on = false;
        this.ko++;
        this.onHit(f.by, g, p);
        break;
      }
      // the landing step is the last one checked
      if (t >= TEAM.throwTime) f.on = false;
    }
  }

  clear(): void {
    for (let i = 0; i < this.flights.length; i++) this.flights[i]!.on = false;
  }
}
