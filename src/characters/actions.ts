/**
 * (mixamo-chars slice e, N53) The action moves: what the body does besides walking about, read from the rig's animate
 * inputs. Pure, no allocation (the result object is the caller's). An action fades over the locomotion in the Mixamo
 * body; a timed one (climb-up, strike, throw, vault, hop, roll) is pinned to the game's own progress, so the clip and
 * the gameplay end together; a looping one (hang, shimmy, ladder, fall, crawl, wall) runs on its own clock.
 *
 * (slice f) vault and window vault, mantle and step (the climb-up from its middle: provisional, no Mixamo mantle from a
 * stand yet), drop and vent drop (falling), hop, roll, crawl, back to the wall (standing or crouched, sliding left or
 * right). Not covered yet (the locomotion keeps playing): pipes, split, wall kick, rappel, brace, the team moves and the
 * downed state.
 */
import type { TraverseKind } from '../anim/animGraph';

/** Every action clip (a glTF animation of that name in each packed model). */
export const ACTION_CLIPS = [
  'hang_idle', 'hang_shimmy_l', 'hang_shimmy_r', 'hang_climb_up', 'ladder', 'strike_elbow', 'strike_knife', 'throw',
  'vault', 'fall', 'hop', 'roll', 'crawl', 'wall_idle', 'wall_crouch_idle', 'wall_slide_l', 'wall_slide_r',
] as const;
export type ActionClip = (typeof ACTION_CLIPS)[number];

/** What `pickAction` reads (a `RigPose` fits). */
export interface ActionIn {
  speed: number;
  localX: number;
  /** 0 standing .. 1 crouched. */
  crouch?: number;
  traverse?: TraverseKind;
  /** 0..1 through the traversal move. */
  traverseT?: number;
  /** 0..1 through the takedown strike, < 0 none. */
  melee?: number;
  /** 0..1 through the grenade throw, < 0 none. */
  grenade?: number;
  /** Back to a wall. */
  wall?: boolean;
}

export interface ActionOut {
  /** The clip, or null: no action (locomotion only). */
  clip: ActionClip | null;
  /** 0..1 through a timed clip; NaN for a looping one. */
  t: number;
}

/** Hanging (or on a wall) and moving sideways faster than this (m/s) shimmies (slides). */
const SHIMMY = 0.1;
/** (slice f) A mantle or step plays the climb-up from this point (its standing half: the hang start is skipped). */
const MANTLE_FROM = 0.45;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** A timed clip at progress `t`. */
function timed(out: ActionOut, clip: ActionClip, t: number | undefined): void {
  out.clip = clip;
  out.t = clamp01(t ?? 0);
}

/** The action for this frame into `out` (returned). `knife`: a knife is in the hands (the strike stabs). */
export function pickAction(i: ActionIn, knife: boolean, out: ActionOut): ActionOut {
  out.clip = null;
  out.t = NaN;
  const tr = i.traverse ?? 'none';
  switch (tr) {
    case 'climbUp':
      timed(out, 'hang_climb_up', i.traverseT);
      return out;
    case 'mantle':
    case 'step':
      timed(out, 'hang_climb_up', MANTLE_FROM + (1 - MANTLE_FROM) * clamp01(i.traverseT ?? 0));
      return out;
    case 'hang':
      out.clip = i.speed > SHIMMY ? (i.localX < 0 ? 'hang_shimmy_l' : 'hang_shimmy_r') : 'hang_idle';
      return out;
    case 'climb':
      out.clip = 'ladder';
      return out;
    case 'vault':
    case 'windowVault':
      timed(out, 'vault', i.traverseT);
      return out;
    case 'hop':
      timed(out, 'hop', i.traverseT);
      return out;
    case 'roll':
      timed(out, 'roll', i.traverseT);
      return out;
    case 'drop':
    case 'ventDrop':
      out.clip = 'fall';
      return out;
    case 'crawl':
    case 'crawlOut':
      out.clip = 'crawl';
      return out;
    default:
      break;
  }
  if ((i.melee ?? -1) >= 0) {
    timed(out, knife ? 'strike_knife' : 'strike_elbow', i.melee);
  } else if ((i.grenade ?? -1) >= 0) {
    timed(out, 'throw', i.grenade);
  } else if (i.wall) {
    if (i.speed > SHIMMY) out.clip = i.localX < 0 ? 'wall_slide_l' : 'wall_slide_r';
    else out.clip = (i.crouch ?? 0) > 0.5 ? 'wall_crouch_idle' : 'wall_idle';
  }
  return out;
}
