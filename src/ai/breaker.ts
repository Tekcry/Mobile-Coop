/**
 * (guard-ai S15, stealth over shooting item 8) Breaker faults and late discovery (pure: no Babylon / DOM), unit-tested.
 *
 * A wall switch turned off is a fault, not an attack: one guard who saw it go walks to the switch at patrol pace and
 * turns the circuit back on (`Enemy.resetBreaker`, `EnemyManager.lightsOut`). The switches themselves belong to
 * `StealthSystems`; the manager reaches them through a `BreakerHost`, so the guard's flip runs the player's own toggle
 * (lights, the light field and the meter, and the co-op light sync all follow the registry). Late discovery: a calm guard
 * who later has a dead fixture in view reacts as a witness would, once per fixture / circuit state change; `DarkList` keeps
 * the short list of dark fixtures no guard has reacted to yet, rebuilt only when the light registry changes.
 */
import type { LightDef, LightRegistry } from '../world/lights';

/** The wall switches of a match, as the guards may use them (`StealthSystems` implements it; tests fake it). */
export interface BreakerHost {
  /** The switch of circuit `group` nearest (x, z) into `out` (x, y, z: the switch itself); false: the circuit has none. */
  switchOf(group: number, x: number, z: number, out: Float32Array): boolean;
  /** Circuit `group` is switched off at its switches (false: on, or no switch). */
  isOff(group: number): boolean;
  /** Turn circuit `group` back on through the switch (the player's toggle path); false when it was not off. */
  reset(group: number): boolean;
}

/** The reset walk's limits: he gives up the walk after `giveUp` s; he works the switch within `reach` m of his stand
 *  point (the walkable cell next to the switch). Starting values (G4). */
export const BREAKER_WALK = { giveUp: 30, reach: 0.7 } as const;

/** Late discovery's scan: one pass every `tick` s over a share of the guards, so each guard is looked at about
 *  `perGuardHz` times a second (a round robin, no allocation). Starting values. */
export const LATE_SCAN = { tick: 0.1, perGuardHz: 3 } as const;

/** Dark states of a fixture: lit (or dark for another reason: an EMP, a jam, no switch), switched off at its circuit's
 *  switch, shot out. */
export const DARK_NONE = 0;
export const DARK_CUT = 1;
export const DARK_SHOT = 2;

/** Board key of a circuit's incident (`EnemyManager.lightsOut`: a light by its id, a circuit by 100000 + its group). */
export const CIRCUIT_KEY = 100000;

/** The dark state of light `l` now. A torch (flashlight) is never a fixture. A circuit's lamp counts as cut only while it
 *  is really dark at its base (a jam's flicker left out) and its switch is off. */
export function darkState(reg: LightRegistry, l: LightDef, host: BreakerHost | null): number {
  if (l.kind === 'flashlight') return DARK_NONE;
  if (l.destroyed) return DARK_SHOT;
  if (l.group >= 0 && host && !reg.baseOn(l) && host.isOff(l.group)) return DARK_CUT;
  return DARK_NONE;
}

/**
 * The dark fixtures no guard has reacted to (late discovery's candidates). `known[id]` is the dark state the guards
 * last reacted to (a witness at the time, or a late find); a fixture back to lit forgets it, so the next cut counts
 * again. `refresh` rebuilds the list only when the registry's version moved or a mark changed; the arrays grow only
 * when the registry has more lights.
 */
export class DarkList {
  known = new Uint8Array(64);
  ids = new Int32Array(64);
  n = 0;
  private ver = -1;
  private dirty = true;

  /** Forget everything (a section load, a restart). */
  clear(): void {
    this.known.fill(0);
    this.n = 0;
    this.ver = -1;
    this.dirty = true;
  }

  private ensure(n: number): void {
    if (n <= this.known.length) return;
    let c = this.known.length;
    while (c < n) c *= 2;
    const k = new Uint8Array(c);
    k.set(this.known);
    this.known = k;
    this.ids = new Int32Array(c);
  }

  /** Rebuild the list if the registry changed since the last call (or a mark did). */
  refresh(reg: LightRegistry, host: BreakerHost | null): void {
    if (!this.dirty && reg.version === this.ver) return;
    const ls = reg.lights;
    this.ensure(ls.length);
    let n = 0;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      const d = darkState(reg, l, host);
      if (d === DARK_NONE) {
        this.known[l.id] = DARK_NONE;
        continue;
      }
      if (this.known[l.id] !== d) this.ids[n++] = l.id;
    }
    this.n = n;
    this.ver = reg.version;
    this.dirty = false;
  }

  /** The guards know light `id` is dark as `state`. */
  markLight(id: number, state: number): void {
    if (id < 0) return;
    this.ensure(id + 1);
    this.known[id] = state;
    this.dirty = true;
  }

  /** The guards know circuit `group` is off: every unbroken lamp on it. */
  markGroup(reg: LightRegistry, group: number): void {
    const ls = reg.lights;
    this.ensure(ls.length);
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      if (l.group === group && !l.destroyed && l.kind !== 'flashlight') this.known[l.id] = DARK_CUT;
    }
    this.dirty = true;
  }

  /** The guards react to the incident of board key `key` (a light id, or `CIRCUIT_KEY` + a circuit): mark it known. */
  markKey(reg: LightRegistry, key: number): void {
    if (key < 0) return;
    if (key >= CIRCUIT_KEY) this.markGroup(reg, key - CIRCUIT_KEY);
    else if (reg.lights[key]?.destroyed) this.markLight(key, DARK_SHOT);
  }
}
