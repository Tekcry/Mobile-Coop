/**
 * (guard-ai mill-hunt H2) The storm mill's hunt board (pure: no Babylon / DOM; docs/guard-ai/mill-hunt/PLAN.md "Logic").
 * Michael 2026-10-27 ~10:00: "maximum alert level ... cautious and searching ... not bunch up into groups bigger than 2
 * ... searching for you very slowly and methodically ... they will all be heading towards the players ... checking all
 * corners"; ~10:05 "fixed readble path is good".
 *
 * Each storey has one fixed line of stops (`HuntLine`). Every unit (a pair or a solo) walks its line stop by stop
 * towards its line's target at `HUNT.pace`, clears each stop's authored aims, and holds (re-clearing, slower) when the
 * rules below stop it. The targets follow the fixed phase rows (`HuntDef.phases`); no live player position is read.
 * No randomness: the same admissions and ticks give the same goals. Everything after the constructor allocates nothing.
 *
 * Yaw: 0 = +z, grows towards +x (`atan2(dx, dz)`), as `sceneSweep.ts`.
 */
import type { AlertLevel } from './alertState';
import type { HuntDef } from '../game/sectors';
import { hyp2 } from '../core/mathx';
import { sweepTurnTime, wrapAng } from './sceneSweep';

export const HUNT = {
  /** Walking pace between stops (m/s; BRIEF A3; the GA6 sweep 0.7, the plain search 0.68). */
  pace: 0.45,
  /** Hold on each aim while clearing a stop (s, after the calm turn onto it; A8). */
  aimHold: 1.5,
  /** Hold on each aim while held by the rules (s; A9: the same order, slower). */
  holdAim: 2.5,
  /** A unit never steps to a stop within this (m, straight, same line) of a higher-ranked unit's stop (A6). */
  gap: 6,
  /** Guards in a room, or walking into it, never above this (A6). */
  roomCap: 2,
  /** A phase steps on after this at the latest (s; A4). */
  phaseMax: 120,
  /**
   * (plan check 2 fold-in 2) A phase never steps on before this (s), even when every target room is cleared. 60: about
   * what a pair takes to walk into a room of 2-3 stops and clear it (a ~3.5 m leg is ~8 s at 0.45 m/s plus the calm turn;
   * 2-3 aims at 1.5 s plus turns is ~6-9 s a stop), so the front never runs ahead of a careful pair; the six rows reach
   * the last one no sooner than 5 min (no later than 10 min, `phaseMax`).
   */
  phaseMin: 60,
  /** (H4) A check's look at the spot (s) and its pan half width (rad). */
  checkLook: 4,
  checkPan: 0.7,
  /** A member within this of his spot has arrived (m). */
  arrive: 0.5,
  /** Outside the target room only aims within this of the line towards the target are used (rad, 100 deg; A9). */
  aimSide: 1.75,
} as const;

/** A guard on the board: an `Enemy` fits it structurally. */
export interface HuntMember {
  readonly alive: boolean;
  readonly taken: boolean;
  readonly pos: { readonly x: number; readonly y: number; readonly z: number };
  readonly level: AlertLevel;
  /** His slot's index in the section's guard list (-1: none). */
  readonly slotIdx: number;
  /** His pair partner's slot index (-1: none); a pair is either member naming the other. */
  readonly pairSlot: number;
}

/** The board's goal for a member: his spot, the yaw to face there (NaN while walking) and the pace. */
export type HuntOut<M> = (m: M, x: number, z: number, face: number, speed: number) => void;

/** Unit states (`HuntBoard.uState`). */
export const H_SPREAD = 0;
export const H_REGROUP = 1;
export const H_MOVE = 2;
export const H_CLEAR = 3;
export const H_HOLD = 4;
export const H_LOOP = 5;
/** (H4) A check of a glimpse or a sound: not built in H2 (the hook is `HuntBoard.tick`'s `H_CHECK` branches). */
export const H_CHECK = 6;
export const HUNT_STATES: readonly string[] = ['spread', 'regroup', 'move', 'clear', 'hold', 'loop', 'check'];

// WIP: HuntBoard follows (admission, rank, step, states, tick).
export type { HuntDef };
export const _wip = { hyp2, sweepTurnTime, wrapAng };
