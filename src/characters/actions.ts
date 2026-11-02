/**
 * (mixamo-chars slice e, N53) The action moves: what the body does besides walking about, read from the rig's animate
 * inputs. Pure, no allocation (the result object is the caller's). An action fades over the locomotion in the Mixamo
 * body; a timed one (climb-up, strike, throw) is pinned to the game's own progress, so the clip and the gameplay end
 * together; a looping one (hang, shimmy, ladder) runs on its own clock.
 *
 * Not covered yet (the locomotion keeps playing): vault, mantle, step, drop, hop, roll, crawl, vent, pipe, window,
 * split, wall kick, rappel, brace, the team moves, back to wall and the downed state.
 */
import type { TraverseKind } from '../anim/animGraph';

/** Every action clip (a glTF animation of that name in each packed model). */
export const ACTION_CLIPS = ['hang_idle', 'hang_shimmy_l', 'hang_shimmy_r', 'hang_climb_up', 'ladder', 'strike_elbow', 'strike_knife', 'throw'] as const;
export type ActionClip = (typeof ACTION_CLIPS)[number];

/** What `pickAction` reads (a `RigPose` fits). */
export interface ActionIn {
  speed: number;
  localX: number;
  traverse?: TraverseKind;
  /** 0..1 through the traversal move. */
  traverseT?: number;
  /** 0..1 through the takedown strike, < 0 none. */
  melee?: number;
  /** 0..1 through the grenade throw, < 0 none. */
  grenade?: number;
}

export interface ActionOut {
  /** The clip, or null: no action (locomotion only). */
  clip: ActionClip | null;
  /** 0..1 through a timed clip; NaN for a looping one. */
  t: number;
}

/** Hanging and moving sideways faster than this (m/s) shimmies. */
const SHIMMY = 0.1;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** The action for this frame into `out` (returned). `knife`: a knife is in the hands (the strike stabs). */
export function pickAction(i: ActionIn, knife: boolean, out: ActionOut): ActionOut {
  out.clip = null;
  out.t = NaN;
  const tr = i.traverse ?? 'none';
  if (tr === 'climbUp') {
    out.clip = 'hang_climb_up';
    out.t = clamp01(i.traverseT ?? 0);
  } else if (tr === 'hang') {
    out.clip = i.speed > SHIMMY ? (i.localX < 0 ? 'hang_shimmy_l' : 'hang_shimmy_r') : 'hang_idle';
  } else if (tr === 'climb') {
    out.clip = 'ladder';
  } else if ((i.melee ?? -1) >= 0) {
    out.clip = knife ? 'strike_knife' : 'strike_elbow';
    out.t = clamp01(i.melee as number);
  } else if ((i.grenade ?? -1) >= 0) {
    out.clip = 'throw';
    out.t = clamp01(i.grenade as number);
  }
  return out;
}
