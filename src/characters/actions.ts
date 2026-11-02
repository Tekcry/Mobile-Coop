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
 *
 * (slice h) The team moves (provisional picks, tune by eye): the holder (role b) of a leg-up, a partner throw and the
 * lifting kit moves plays "Lifting Object", crouched with the hands low while offering, rising with the move's clock;
 * the hang-down and pull-up holder "Pull Heavy Object" (a braced lean back); the rope holder and the swing "Pulling A
 * Rope"; the rope climber (role a) "Climbing A Rope". The procedural hand reach to the partner is not on the Mixamo body.
 */
import type { TraverseKind } from '../anim/animGraph';
import type { TeamPoseMove, TeamPoseRole } from '../anim/clips/team';

/** Every action clip (a glTF animation of that name in each packed model). */
export const ACTION_CLIPS = [
  'hang_idle', 'hang_shimmy_l', 'hang_shimmy_r', 'hang_climb_up', 'ladder', 'strike_elbow', 'strike_knife', 'throw',
  'vault', 'fall', 'hop', 'roll', 'crawl', 'wall_idle', 'wall_crouch_idle', 'wall_slide_l', 'wall_slide_r',
  // (slice f) a downed player lies breathing (set by the owner, `MixamoBody.downed`; not picked from the pose)
  'downed_lie',
  // (slice h) the team moves
  'team_lift', 'team_brace', 'team_rope', 'rope_climb',
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
  /** (slice h) The team move, role and clock (< 0 offering / waiting; 0..1 through it). */
  teamMove?: TeamPoseMove | '';
  teamRole?: TeamPoseRole | '';
  teamK?: number;
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

/** (slice h) "Lifting Object" (346 frames) as shares of the clip, measured in the game 2026-11-03 (provisional): 0.2
 *  the deep squat, hands at the shins (the offer); 0.2 to 0.45 the rise to a half squat; 0.72 to 0.85 the stand up.
 *  The move's first half plays the rise, its second the stand (the put-down between is skipped). */
export const LIFT_OFFER = 0.2;
export const LIFT_RISE = [0.2, 0.45] as const;
export const LIFT_STAND = [0.72, 0.85] as const;

/** (slice h) The lift's clip share at the move's clock `k` (0..1). */
export function liftAt(k: number): number {
  const c = clamp01(k);
  return c < 0.5 ? LIFT_RISE[0] + (LIFT_RISE[1] - LIFT_RISE[0]) * c * 2 : LIFT_STAND[0] + (LIFT_STAND[1] - LIFT_STAND[0]) * (c - 0.5) * 2;
}

/** (slice h) The holder's (role b) move for each team move; null: the body's own (a traverse or the locomotion). */
const HOLDER: Record<TeamPoseMove, ActionClip | null> = {
  boost: 'team_lift',
  throw: 'team_lift',
  shutter: 'team_lift',
  dropCatch: 'team_lift',
  plankBridge: 'team_lift',
  chimneyPair: 'team_lift',
  hang: 'team_brace',
  pull: 'team_brace',
  rope: 'team_rope',
  swingPass: 'team_rope',
  deadweight: null,
};

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
  const tm = i.teamMove ?? '';
  if (tm !== '') {
    if (i.teamRole === 'b') {
      const c = HOLDER[tm];
      if (c === 'team_lift') {
        const k = i.teamK ?? -1;
        timed(out, c, k < 0 ? LIFT_OFFER : liftAt(k));
        return out;
      }
      if (c !== null) {
        out.clip = c;
        return out;
      }
    } else if (tm === 'rope' && i.teamRole === 'a') {
      out.clip = 'rope_climb';
      return out;
    }
  }
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
