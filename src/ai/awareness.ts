/**
 * Awareness and caution (guard-ai S4, design section 4; pure: no Babylon / DOM), unit-tested.
 *
 * One `Awareness` per section. Guards are named by a stable **guard key** 0-31 (the squad-slot index within the
 * section, `MAX_KEYS`), which survives a revive; masks over keys are u32. Caution per key:
 * - 0 none.
 * - 1 timed (a knockout was found, M3 / A4): the woken guard and the one who woke him search `koSearch` s round the
 *   spot, then stay cautious `koCautious` s, then normal (`startKo`).
 * - 2 held (a death, a witnessed kill, a contact, a missing guard): held while the key is in the `aware` mask of an open
 *   hold. A hold clears **only when every guard aware of it is eliminated** (M1): dead, or knocked out and not yet woken
 *   (A3). A knocked-out aware guard moves to the hold's `downAware`; woken (`onRevived`) he moves back to `aware` and the
 *   hold holds again. Held beats timed: a key in both reads 2 while his timer runs on underneath (`isSearching` still
 *   reports the search phase).
 *
 * - (guard-ai S14) a timed section alert, also caution 1: a radio call got through that a guard of the section is not
 *   answering (`MISSING.cautious`, 180 s) or that shots were heard (`SHOTS.cautious`, 120 s). `timedHold(k, s, kind)`
 *   per receiver as the call reaches him; a later call refreshes it (the longer of the two runs on); it ends on its
 *   own, or when the key goes down. Independent of the knockout phases above and of holds: held beats it (a missing
 *   guard then found dead: the S4 held caution takes over), and it never counts as searching.
 *
 * The module does not own incidents: a hold is a small record (`kind`, `aware`, `downAware`, the incident id it came from)
 * that the integration opens from the incident board (`holdKindFor`) and feeds (`addAware`, `onDown`, `onRevived`).
 *
 * Holds live in a fixed pool of `CAUTION.holds`. A hold whose `aware` is 0 holds nobody (its caution is cleared) but
 * stays in the pool while it has `downAware` keys, so a woken guard can bring it back; it frees when both are 0.
 * Pool exhaustion (every slot in use): a new hold first takes the oldest dormant slot (aware 0; its KO'd keys then
 * forget it, so waking them brings no hold back), else its keys are merged into the oldest active hold (`merges`
 * counts it). A merge never clears caution early: the merged hold clears only when every key of both is eliminated.
 *
 * No allocation per call or tick; no randomness; the same calls in the same order give the same state.
 */
import type { IncidentKind } from './incidents';

/** 0 none | 1 timed (knockout) | 2 held (death / intruder). */
export type Caution = 0 | 1 | 2;

export const CAUTION = {
  /** The woken guard and the waker search round the spot (s). */
  koSearch: 60,
  /** Then cautious this long (s; M3 "a few minutes"), then normal. */
  koCautious: 180,
  /** Sight-rate multiplier while cautious (caution >= 1; = `SENSITIVITY.cooldown`). */
  sens: 1.3,
  /** Patrol pauses x this while cautious (shorter waits, glances every 6 s). */
  waitMul: 0.6,
  /** Fixed hold pool per section. */
  holds: 8,
} as const;

/** Guard keys per section (u32 masks; `MAX_ENEMIES` 32). Reinforcements take free keys 24-31 (design 4). */
export const MAX_KEYS = 32;

export type HoldKind = 'dead' | 'witness' | 'contact' | 'missing';
export const HOLD_KIND: readonly HoldKind[] = ['dead', 'witness', 'contact', 'missing'];

/** (guard-ai S14) Timed section alert kinds (`Awareness.alertKind`): none, a missing guard, shots heard. */
export const ALERT_NONE = 0;
export const ALERT_MISSING = 1;
export const ALERT_SHOTS = 2;

/** Timed caution phases (`Awareness.phase`). */
export const PHASE_NONE = 0;
export const PHASE_SEARCH = 1;
export const PHASE_CAUTIOUS = 2;

/** The hold an incident kind opens, or null (noise, shots, a light, a lure, a knockout and a camera sighting hold
 *  nobody: a camera body sighting sends guards, whose finding opens the hold). */
export function holdKindFor(kind: IncidentKind): HoldKind | null {
  switch (kind) {
    case 'bodyDead':
      return 'dead';
    case 'witnessKill':
      return 'witness';
    case 'contact':
      return 'contact';
    case 'missing':
      return 'missing';
    default:
      return null;
  }
}

const H = CAUTION.holds;

/** Bit for key `k` (0-31), 0 when out of range. */
function bit(k: number): number {
  return k >= 0 && k < MAX_KEYS && (k | 0) === k ? (1 << k) >>> 0 : 0;
}

export class Awareness {
  /** Section this table serves (Sector Ops: the live section; elsewhere 0). */
  section = 0;

  // ----- per key -----
  /** Effective caution (0 / 1 / 2), kept current after every call. */
  readonly caution = new Uint8Array(MAX_KEYS);
  /** Seconds left in the timed phase. */
  readonly cautionT = new Float32Array(MAX_KEYS);
  /** Timed phase: `PHASE_NONE`, `PHASE_SEARCH`, `PHASE_CAUTIOUS`. */
  readonly phase = new Uint8Array(MAX_KEYS);
  /** (guard-ai S14) Seconds left on each key's timed section alert (0 none), and its kind (`ALERT_*`, the last to set
   *  the longer time). */
  readonly alertT = new Float32Array(MAX_KEYS);
  readonly alertKind = new Uint8Array(MAX_KEYS);

  // ----- the hold pool (struct of arrays) -----
  readonly holdOpen = new Uint8Array(H);
  readonly holdKind = new Uint8Array(H);
  /** Monotonic hold id per slot (stale ids from a reused slot match nothing). */
  readonly holdId = new Int32Array(H);
  /** The incident id it came from (-1 none). */
  readonly holdInc = new Int32Array(H);
  /** Keys aware of it and on their feet. */
  readonly aware = new Uint32Array(H);
  /** Keys aware of it, knocked out (eliminated until woken). */
  readonly downAware = new Uint32Array(H);
  /** Open order (oldest first on exhaustion). */
  readonly holdSeq = new Float64Array(H);

  /** Keys knocked out / dead now. */
  ko = 0;
  dead = 0;
  /** Keys held by any open hold (OR of `aware`). */
  held = 0;
  /** Holds merged into another on pool exhaustion (debug / tests). */
  merges = 0;

  private nextId = 1;
  private seq = 0;

  /** Drop everything (a section load, a restart). */
  clear(): void {
    this.caution.fill(0);
    this.cautionT.fill(0);
    this.phase.fill(0);
    this.alertT.fill(0);
    this.alertKind.fill(0);
    this.holdOpen.fill(0);
    this.aware.fill(0);
    this.downAware.fill(0);
    this.holdInc.fill(-1);
    this.ko = 0;
    this.dead = 0;
    this.held = 0;
  }

  /** A new guard takes key `k` (a reinforcement on a free key, a respawn): clean slate, in no hold. */
  resetKey(k: number): void {
    const b = bit(k);
    if (!b) return;
    this.ko = (this.ko & ~b) >>> 0;
    this.dead = (this.dead & ~b) >>> 0;
    this.phase[k] = PHASE_NONE;
    this.cautionT[k] = 0;
    this.alertT[k] = 0;
    this.alertKind[k] = ALERT_NONE;
    for (let s = 0; s < H; s++) {
      this.aware[s] = this.aware[s]! & ~b;
      this.downAware[s] = this.downAware[s]! & ~b;
    }
    this.settle();
  }

  // ----- (guard-ai S14) the timed section alert -----

  /** Key `k` hears that the section is on alert (`kind` `ALERT_MISSING` / `ALERT_SHOTS`): cautious `seconds` s (a key
   *  already timed keeps the longer of the two: a later call refreshes it). False when the key is out of range or down
   *  (dead, or knocked out and not woken). */
  timedHold(k: number, seconds: number, kind: number): boolean {
    const b = bit(k);
    if (!b || (this.dead | this.ko) & b || !(seconds > 0)) return false;
    if (seconds >= this.alertT[k]!) {
      this.alertT[k] = seconds;
      this.alertKind[k] = kind;
    }
    this.settle();
    return true;
  }

  /** Seconds left on key `k`'s timed section alert (0 none). */
  alertLeft(k: number): number {
    return bit(k) ? this.alertT[k]! : 0;
  }

  /** The kind of key `k`'s timed section alert (`ALERT_*`; `ALERT_NONE` when it has none). */
  alertOf(k: number): number {
    return bit(k) && this.alertT[k]! > 0 ? this.alertKind[k]! : ALERT_NONE;
  }

  // ----- holds -----

  /**
   * Open a hold of `kind` (`HoldKind`) with the keys in `awareMask` aware (dead keys are dropped, knocked-out keys go to
   * `downAware`). `inc`: the incident id it came from (`holdFor`). Returns the hold id; on pool exhaustion see the
   * header (the id of the merged hold).
   */
  openHold(kind: HoldKind, awareMask: number, inc = -1): number {
    let s = this.alloc();
    if (s < 0) {
      // every slot holds someone: merge into the oldest active hold (never clears caution early)
      s = this.oldest(true);
      this.merges++;
      this.addMask(s, awareMask);
      this.settle();
      return this.holdId[s]!;
    }
    this.holdOpen[s] = 1;
    this.holdKind[s] = HOLD_KIND.indexOf(kind);
    this.holdId[s] = this.nextId++;
    this.holdInc[s] = inc;
    this.holdSeq[s] = this.seq++;
    this.aware[s] = 0;
    this.downAware[s] = 0;
    this.addMask(s, awareMask);
    this.settle();
    return this.holdId[s]!;
  }

  /** Key `k` learns of hold `holdId` (a voice shout, the radio report got through, he found the body). False when the
   *  hold is gone or the key is out of range / dead. */
  addAware(holdId: number, k: number): boolean {
    const s = this.slotOf(holdId);
    const b = bit(k);
    if (s < 0 || !b || this.dead & b) return false;
    this.addMask(s, b);
    this.settle();
    return true;
  }

  /** Every key in `mask` learns of hold `holdId` (the section once a report gets through). */
  addAwareMask(holdId: number, mask: number): boolean {
    const s = this.slotOf(holdId);
    if (s < 0) return false;
    this.addMask(s, mask);
    this.settle();
    return true;
  }

  /** Key `k` went down: dead (`lethal`) leaves every hold; knocked out moves to each hold's `downAware` (A3). Either
   *  way his timed caution ends (a woken guard gets a fresh one from `startKo`). */
  onDown(k: number, lethal: boolean): void {
    const b = bit(k);
    if (!b || this.dead & b) return;
    this.phase[k] = PHASE_NONE;
    this.cautionT[k] = 0;
    // (S14) and his timed section alert (a woken guard is told again, or gets the knockout caution)
    this.alertT[k] = 0;
    this.alertKind[k] = ALERT_NONE;
    if (lethal) {
      this.dead = (this.dead | b) >>> 0;
      this.ko = (this.ko & ~b) >>> 0;
      for (let s = 0; s < H; s++) {
        this.aware[s] = this.aware[s]! & ~b;
        this.downAware[s] = this.downAware[s]! & ~b;
      }
    } else {
      this.ko = (this.ko | b) >>> 0;
      for (let s = 0; s < H; s++) {
        if (!(this.aware[s]! & b)) continue;
        this.aware[s] = this.aware[s]! & ~b;
        this.downAware[s] = this.downAware[s]! | b;
      }
    }
    this.settle();
  }

  /** Key `k` was woken: he remembers, so each hold he was aware of holds again. */
  onRevived(k: number): void {
    const b = bit(k);
    if (!b || !(this.ko & b)) return;
    this.ko = (this.ko & ~b) >>> 0;
    for (let s = 0; s < H; s++) {
      if (!(this.downAware[s]! & b)) continue;
      this.downAware[s] = this.downAware[s]! & ~b;
      this.aware[s] = this.aware[s]! | b;
    }
    this.settle();
  }

  /** A knockout was found: `waker` woke `woken` (also revives `woken` when he is still down). Both search `koSearch`,
   *  then stay cautious `koCautious`, then 0 (a key already timed restarts at the search). */
  startKo(waker: number, woken: number): void {
    this.onRevived(woken);
    this.startTimed(waker);
    this.startTimed(woken);
    this.settle();
  }

  /** Advance (5 Hz with the board): timed caution counts down; holds with nobody aware clear. */
  tick(dt: number): void {
    for (let k = 0; k < MAX_KEYS; k++) {
      // (S14) the timed section alert
      const a = this.alertT[k]!;
      if (a > 0) {
        const r = a - dt;
        this.alertT[k] = r > 0 ? r : 0;
        if (r <= 0) this.alertKind[k] = ALERT_NONE;
      }
      const p = this.phase[k]!;
      if (p === PHASE_NONE) continue;
      const t = this.cautionT[k]! - dt;
      if (t > 0) {
        this.cautionT[k] = t;
      } else if (p === PHASE_SEARCH) {
        // the search is over: cautious (the overshoot carries, so the total is exact)
        this.phase[k] = PHASE_CAUTIOUS;
        this.cautionT[k] = t + CAUTION.koCautious;
      } else {
        this.phase[k] = PHASE_NONE;
        this.cautionT[k] = 0;
      }
    }
    this.settle();
  }

  // ----- queries -----

  cautionOf(k: number): Caution {
    return bit(k) ? (this.caution[k]! as Caution) : 0;
  }

  /** In the timed search phase (searching round the knockout's spot; true even while a hold also holds him). */
  isSearching(k: number): boolean {
    return bit(k) !== 0 && this.phase[k] === PHASE_SEARCH;
  }

  /** Dead, or knocked out and not woken (A3). */
  isEliminated(k: number): boolean {
    return ((this.dead | this.ko) & bit(k)) !== 0;
  }

  /** Sight-rate multiplier for key `k` (`CAUTION.sens` while cautious, else 1). */
  sightMul(k: number): number {
    return this.cautionOf(k) >= 1 ? CAUTION.sens : 1;
  }

  /** Patrol-pause multiplier for key `k` (`CAUTION.waitMul` while cautious, else 1). */
  waitMul(k: number): number {
    return this.cautionOf(k) >= 1 ? CAUTION.waitMul : 1;
  }

  /** Holds that hold someone (aware != 0). Dormant holds (only KO'd keys aware) do not count. */
  holdCount(): number {
    let n = 0;
    for (let s = 0; s < H; s++) if (this.holdOpen[s] && this.aware[s]) n++;
    return n;
  }

  /** Slots in use (active + dormant; tests / debug). */
  slotsUsed(): number {
    let n = 0;
    for (let s = 0; s < H; s++) if (this.holdOpen[s]) n++;
    return n;
  }

  /** Is hold `holdId` still in the pool (active or dormant)? */
  isOpen(holdId: number): boolean {
    return this.slotOf(holdId) >= 0;
  }

  /** The aware / downAware mask of hold `holdId` (0 when gone). */
  awareOf(holdId: number): number {
    const s = this.slotOf(holdId);
    return s < 0 ? 0 : this.aware[s]!;
  }

  downAwareOf(holdId: number): number {
    const s = this.slotOf(holdId);
    return s < 0 ? 0 : this.downAware[s]!;
  }

  /** The hold opened from incident `inc`, -1. */
  holdFor(inc: number): number {
    if (inc < 0) return -1;
    for (let s = 0; s < H; s++) if (this.holdOpen[s] && this.holdInc[s] === inc) return this.holdId[s]!;
    return -1;
  }

  /** The kind of hold `holdId`, null when gone. */
  kindOf(holdId: number): HoldKind | null {
    const s = this.slotOf(holdId);
    return s < 0 ? null : HOLD_KIND[this.holdKind[s]!]!;
  }

  // ----- internals -----

  private slotOf(holdId: number): number {
    for (let s = 0; s < H; s++) if (this.holdOpen[s] && this.holdId[s] === holdId) return s;
    return -1;
  }

  /** Add the keys of `mask` to slot `s`: dead keys dropped, knocked-out keys to `downAware`. */
  private addMask(s: number, mask: number): void {
    const m = (mask & ~this.dead) >>> 0;
    this.aware[s] = this.aware[s]! | (m & ~this.ko);
    this.downAware[s] = this.downAware[s]! | (m & this.ko);
  }

  private startTimed(k: number): void {
    const b = bit(k);
    if (!b || (this.dead | this.ko) & b) return;
    this.phase[k] = PHASE_SEARCH;
    this.cautionT[k] = CAUTION.koSearch;
  }

  /** A free slot, else the oldest dormant one (aware 0), else -1. */
  private alloc(): number {
    for (let s = 0; s < H; s++) if (!this.holdOpen[s]) return s;
    return this.oldest(false);
  }

  /** The oldest open slot that is active (`active`) or dormant; -1. */
  private oldest(active: boolean): number {
    let o = -1;
    for (let s = 0; s < H; s++) {
      if (!this.holdOpen[s] || (this.aware[s]! !== 0) !== active) continue;
      if (o < 0 || this.holdSeq[s]! < this.holdSeq[o]!) o = s;
    }
    return o;
  }

  /** Free empty holds and recompute `held` and each key's caution. */
  private settle(): void {
    let held = 0;
    for (let s = 0; s < H; s++) {
      if (!this.holdOpen[s]) continue;
      const a = this.aware[s]!;
      if (a === 0 && this.downAware[s] === 0) {
        this.holdOpen[s] = 0;
        this.holdInc[s] = -1;
        continue;
      }
      held |= a;
    }
    this.held = held >>> 0;
    for (let k = 0; k < MAX_KEYS; k++) {
      this.caution[k] = (held >>> k) & 1 ? 2 : this.phase[k] !== PHASE_NONE || this.alertT[k]! > 0 ? 1 : 0;
    }
  }
}
