/**
 * (hang-down, A7) The host's side of a client's takedown from the co-op hang-down, with no wire data: the client hangs
 * head-first (its MoveState stays the team mode `boost` + `HANG_SUB`), so the host keeps the guard it seized (no
 * `TD_MAX` let-go) and holds him lifted under the client's hanging head, at the spot the client's own takedown uses
 * (`hangHoldPoint`), eased in from where he stood. The client's `td` done / abort ends it as any client takedown.
 */
import { hangHoldPoint } from '../game/takedown';
import { HANG_HEAD, HANG_SUB, ROPE_SUB } from '../game/teamMoves';
import type { MoveState } from '../player/moveState';

/** Where the seized guard stood and the way to him from the hang (set at the first hold step). */
export interface HangSpot {
  y: number;
  yaw: number;
}

/** What the host holds: a guard (`Enemy`) by id. */
export interface HangHeld {
  readonly id: string;
  readonly alive: boolean;
  readonly pos: { x: number; y: number; z: number };
  holdAt(x: number, y: number, z: number, yaw: number): void;
  setSolid(on: boolean): void;
}

/** A client's MoveState says it hangs head-first in a hang-down (lowered, hanging, pulled up or dropped). */
export function hangingMove(mv: MoveState | undefined): boolean {
  return !!mv && mv.m === 'boost' && (mv.sub & HANG_SUB) !== 0 && (mv.sub & ROPE_SUB) === 0;
}

const tmp = { x: 0, y: 0, z: 0 };

/** How fast the host brings the guard to the hold (1/s, eased: about the client's reach and lift). */
export const HANG_HOLD_RATE = 5;

/**
 * One host step of a guard (`id`, among `enemies`) held by a client hanging with its rig root at (`ax`, `ay`, `az`):
 * the spot is fixed at the first step (`s.hang`), the guard eased to the hold point. False: no such live guard.
 */
export function hangHoldStep(enemies: readonly HangHeld[] | undefined, id: string, s: { hang?: HangSpot }, ax: number, ay: number, az: number, dt: number): boolean {
  if (!enemies) return false;
  let e: HangHeld | null = null;
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i]!.id === id) {
      e = enemies[i]!;
      break;
    }
  }
  if (!e || !e.alive) return false;
  if (!s.hang) {
    s.hang = { y: e.pos.y, yaw: Math.atan2(e.pos.x - ax, e.pos.z - az) };
    e.setSolid(false);
  }
  const h = s.hang;
  hangHoldPoint(ax, az, ay - HANG_HEAD, h.yaw, h.y, tmp);
  const k = Math.min(1, dt * HANG_HOLD_RATE);
  e.holdAt(e.pos.x + (tmp.x - e.pos.x) * k, e.pos.y + (tmp.y - e.pos.y) * k, e.pos.z + (tmp.z - e.pos.z) * k, h.yaw);
  return true;
}
