/**
 * (guard-ai S9, protocol 38) What a co-op client's guard puppet wears and does with the host's gear bits (pure,
 * unit-tested): the helmet and armour placeholder parts follow `AL_HELMET` / `AL_ARMOUR`; a helmet bit falling 1 -> 0 on
 * a guard already shown drops his helmet here (`HelmetDrops`, `helmetArc` is deterministic) unless he jumped (a re-place:
 * a restart, a new slot) between the two states. The puppet also predicts a deflect from the bits for the client's own
 * round, as the host's `gearHit` does.
 */
import { AL_ARMOUR, AL_HELMET } from './protocol';

/** `puppetGear` result bits: the helmet shown, the armour shown, a helmet falls now. */
export const PG_HELMET = 1;
export const PG_ARMOUR = 2;
export const PG_DROP = 4;

/** Farther than this (m) between two shown states is a re-place, not a knock-off: no helmet falls. */
export const PG_JUMP = 1.5;

/**
 * The gear shown for wire `al` after `prev` (-1: his first state), and whether a helmet falls: `jumped` m he moved
 * between the two (a re-place moves him far). A dog or a heavy is the caller's business (the heavy's own plates rule).
 */
export function puppetGear(prev: number, al: number, jumped: number): number {
  let out = 0;
  if (al & AL_HELMET) out |= PG_HELMET;
  if (al & AL_ARMOUR) out |= PG_ARMOUR;
  if (prev >= 0 && prev & AL_HELMET && !(al & AL_HELMET) && jumped < PG_JUMP) out |= PG_DROP;
  return out;
}

/**
 * The client's own round on a puppet wearing gear bits `al`: true when the host's `gearHit` stops it (a lethal bullet,
 * head + helmet or body + armour; never a heavy, whose own plates rule, nor a sleep bolt).
 */
export function predictDeflect(al: number, head: boolean, bullet: boolean, nonLethal: boolean, heavy: boolean): boolean {
  if (!bullet || nonLethal || heavy) return false;
  return head ? (al & AL_HELMET) !== 0 : (al & AL_ARMOUR) !== 0;
}

/**
 * The client's deflect markers: the puppet's own prediction shows the marker at once (the host's `hitConfirm` deflect
 * for it then shows nothing more); a host deflect the client did not predict (the bit not there yet) shows it then.
 * A prediction the host does not confirm within `window` s is forgotten.
 */
export class DeflectLedger {
  private n = 0;
  private t = -1e9;

  constructor(readonly window = 1) {}

  /** The puppet predicted a deflect at time `now` (its marker is shown). */
  predict(now: number): void {
    if (now - this.t >= this.window) this.n = 0;
    this.n++;
    this.t = now;
  }

  /** The host confirmed a deflect at `now`: true = show the marker (it was not predicted). */
  confirm(now: number): boolean {
    if (this.n > 0 && now - this.t < this.window) {
      this.n--;
      return false;
    }
    this.n = 0;
    return true;
  }
}
