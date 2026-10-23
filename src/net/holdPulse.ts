/**
 * (marlow-final Q12, SPEC N4) A client's noisy hold is heard by the host's guards. Pure, Babylon-free.
 *
 * The host's own hold sounds at its first moment and then every `HOLD_NOISE_PULSE` s (`gameState.ts` interact and
 * context menu steps, `holdNoisePulse`). A client has no `EnemyManager`, so its mirrored item (which carries the
 * radius as `NetItem.hn`) is watched here and each pulse goes to the host as a `use` with `pulse: true`; the host checks
 * the sender is alive, the item live, noisy and in reach, and not pulsing faster than the hold does, then calls
 * `enemyMgr.hear(item, holdNoise)` exactly as for its own player.
 */
import { HOLD_NOISE_PULSE, holdNoisePulse } from '../config/noise';
import { hyp2 } from '../core/mathx';

/** What the pulse watch and the host check read of an item (an `Interactable` fits). */
export interface PulseItem {
  id: string;
  progress: number;
  enabled: boolean;
  done: boolean;
  holdTime: number;
  holdNoise?: number;
  reach?: number;
  pos: { x: number; y: number; z: number };
}

/** Least gap (s) between two pulses the host takes from one client: under the 0.5 s pulse, with room for jitter. */
export const HOLD_PULSE_MIN_GAP = HOLD_NOISE_PULSE * 0.6;

/** The host's reach check for a client's `use` (from the feet, the item's reach plus a lag margin, 2 m of height). */
export function inUseReach(it: PulseItem, fx: number, fy: number, fz: number): boolean {
  return hyp2(it.pos.x - fx, it.pos.z - fz) <= (it.reach ?? 1.8) + 0.75 && Math.abs(it.pos.y - fy) <= 2;
}

/** Host: does a client's hold pulse on `it` sound? `last` is that client's last accepted pulse time (-Infinity: none). */
export function hostHoldPulse(it: PulseItem | undefined, alive: boolean, fx: number, fy: number, fz: number, now: number, last: number): boolean {
  if (!alive || !it || !it.enabled || it.done || it.holdTime <= 0 || !it.holdNoise) return false;
  if (!inUseReach(it, fx, fy, fz)) return false;
  return now - last >= HOLD_PULSE_MIN_GAP;
}

/** Client: the mirrored noisy holds and their progress last step; `step` reports each first moment and pulse. */
export class HoldPulseWatch {
  private readonly list: PulseItem[] = [];
  private readonly prev: number[] = [];

  /** Watch a mirrored item (only a noisy hold is kept). */
  add(it: PulseItem): void {
    if (!it.holdNoise || it.holdTime <= 0 || this.list.includes(it)) return;
    this.list.push(it);
    this.prev.push(it.progress);
  }

  remove(it: PulseItem): void {
    const i = this.list.indexOf(it);
    if (i < 0) return;
    this.list.splice(i, 1);
    this.prev.splice(i, 1);
  }

  clear(): void {
    this.list.length = 0;
    this.prev.length = 0;
  }

  get size(): number {
    return this.list.length;
  }

  /** Once per fixed step, after the local hold moved the progress: `send(id)` for each item whose hold sounds now. */
  step(send: (id: string) => void): void {
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const it = list[i]!;
      const prev = this.prev[i]!;
      this.prev[i] = it.progress;
      if (it.enabled && !it.done && holdNoisePulse(prev, it.progress)) send(it.id);
    }
  }
}
