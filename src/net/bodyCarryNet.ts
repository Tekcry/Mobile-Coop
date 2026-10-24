/**
 * (coop-carry) Co-op body carry, the pure parts (no Babylon, no DOM), unit-tested in `tests/coopCarry.test.ts`.
 * Bodies ride the item mirror as kind `body` (`NetItem.e` the enemy id, `by` the carrier); a client asks the host
 * through `use` (`body-<id>` pick up, `drop-body` put down, `hide-<i>` hide) and the host decides.
 */
import { hyp2 } from '../core/mathx';
import type { NetItem } from './protocol';

/** The host's use slack over an item's reach (m) and the floor gap allowed (m), as `holdPulse.inUseReach`. */
export const CARRY_USE_SLACK = 0.75;
export const CARRY_USE_DY = 2;

/** Why the host refuses a client's pick up ('' = taken). */
export type PickupDeny = '' | 'dead' | 'held' | 'carrying' | 'busy' | 'taken' | 'far';

/** What the host knows when a client asks to pick body up. */
export interface PickupCheck {
  /** The client is alive, not held for a rejoin, not carrying already. */
  alive: boolean;
  held: boolean;
  carrying: boolean;
  /** The client holds a guard (a takedown or a hostage running). */
  seizing: boolean;
  /** The client's MoveState mode ('ground' or none: free on its feet; the host's own rule is "no traversal"). */
  mode: string | undefined;
  /** The body lies there (`Body.present`) and nobody has it (the host's own lift included). */
  present: boolean;
  taken: boolean;
  /** The body (host's), the client's feet (host's copy), the item's reach. */
  bx: number;
  by: number;
  bz: number;
  fx: number;
  fy: number;
  fz: number;
  reach: number;
}

/** In the host's use reach of a point: within `reach` + `CARRY_USE_SLACK` across, `CARRY_USE_DY` up or down. */
export function inCarryReach(x: number, y: number, z: number, fx: number, fy: number, fz: number, reach: number): boolean {
  return hyp2(x - fx, z - fz) <= reach + CARRY_USE_SLACK && Math.abs(y - fy) <= CARRY_USE_DY;
}

/** The host's rule for a client's pick up (the host's own carry rules: not carrying, the body present, no traversal),
 *  plus alive, not held, no guard held and the use reach. */
export function pickupDenied(c: PickupCheck): PickupDeny {
  if (!c.alive) return 'dead';
  if (c.held) return 'held';
  if (c.carrying) return 'carrying';
  if (c.seizing || (c.mode !== undefined && c.mode !== 'ground')) return 'busy';
  if (!c.present || c.taken) return 'taken';
  if (!inCarryReach(c.bx, c.by, c.bz, c.fx, c.fy, c.fz, c.reach)) return 'far';
  return '';
}

/** The host's rule for a client's hide: carrying a body, alive and in the hide spot's use reach. */
export function hideOk(alive: boolean, carrying: boolean, inReach: boolean): boolean {
  return alive && carrying && inReach;
}

/** (coop-carry fix round) A client's carry that ends before the body reached its shoulder (a crouch let-go, a lift the
 *  client could not start) lays it back where it lay, quiet, as the host's own let-go (`BodyCarry.liftStep`, no noise);
 *  only a put down from the shoulder is heard (`DROP_NOISE`). */
export function letGoHeard(onShoulder: boolean): boolean {
  return onShoulder;
}

/** (coop-carry fix round) The client's "Pick up body" prompt: the host's lying state, and only for a body this page has
 *  lying itself (it saw him fall: a late joiner has none to lift). */
export function clientBodyPrompt(hostOn: boolean, localPresent: boolean): boolean {
  return hostOn && localPresent;
}

/** The mirrored item of one body (host -> client): lying (`on`) when present and nobody's; `by` the carrier. */
export function bodyItem(bodyId: string, enemyId: string, x: number, y: number, z: number, present: boolean, by: string, reach: number): NetItem {
  const n: NetItem = { id: `body-${bodyId}`, k: 'body', x, y, z, yaw: 0, label: 'Pick up body', hold: 0, reach, on: present && by === '', e: enemyId };
  if (by) n.by = by;
  return n;
}

/** What changed for one body between two mirrors: picked up (`take`), put down (`drop`), hidden (`hide`: carried and
 *  then gone from the list), carried by someone else at once (`retake`: a drop then a take), else `none`. */
export type CarryChange = 'none' | 'take' | 'drop' | 'hide' | 'retake';

export function carryChange(prevBy: string, listed: boolean, nowBy: string): CarryChange {
  if (!listed) return prevBy ? 'hide' : 'none';
  if (prevBy === nowBy) return 'none';
  if (!prevBy) return 'take';
  if (!nowBy) return 'drop';
  return 'retake';
}
