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
 *
 * (slice i, provisional stand-ins until a better move or our own animation): up a vertical pipe the rope climb; legs up
 * or hanging inverted on a pipe the hang, the whole body turned over with the rig's tumble; the wall kick "Jump From
 * Wall" pinned to its progress; on a rappel rope the rope haul; braced in a split the falling pose (arms and legs out);
 * a holder's brace with no team move the lift's crouched offer.
 *
 * (walk-test fix B2) The draw and the holster play on the upper body only (`ActionOut.upper`: the legs keep walking),
 * pinned to the weapon swap's clock: the holster of the gun leaving the hands, then the draw of the next (Michael: the
 * pistol draw from the lower back plays though the holster stays on the thigh). Back to a wall, a change of slide
 * direction plays the cover turn once (`WallTurn`); a zipline plays its own hang; the rappel "Climbing Down Wall".
 */
import type { TraverseKind } from '../anim/animGraph';
import type { SwapReach } from '../anim/clips/actions';
import type { TeamPoseMove, TeamPoseRole } from '../anim/clips/team';

/** Every action clip (a glTF animation of that name in each packed model). */
export const ACTION_CLIPS = [
  'hang_idle', 'hang_shimmy_l', 'hang_shimmy_r', 'hang_climb_up', 'ladder', 'strike_elbow', 'strike_knife', 'throw',
  'vault', 'fall', 'hop', 'roll', 'crawl', 'wall_idle', 'wall_crouch_idle', 'wall_slide_l', 'wall_slide_r',
  // (slice f) a downed player lies breathing (set by the owner, `MixamoBody.downed`; not picked from the pose)
  'downed_lie',
  // (slice h) the team moves
  'team_lift', 'team_brace', 'team_rope', 'rope_climb',
  // (slice i)
  'wall_kick',
  // (walk-test fix B2)
  'cover_turn', 'cover_turn_crouch', 'zipline', 'rappel',
] as const;
export type ActionClip = (typeof ACTION_CLIPS)[number];

/** (walk-test fix B2) The upper-body clips (played over the legs' locomotion, `MixamoBody`'s upper layer). */
export const UPPER_CLIPS = [
  'rifle_draw', 'rifle_holster', 'pistol_draw', 'pistol_holster',
  // the guard grab: the holder's and the held guard's (Michael: the guard "walks normally when grabbed")
  'grab_take', 'grab_idle', 'grab_release', 'grabbed_take', 'grabbed_idle',
] as const;
export type UpperClip = (typeof UPPER_CLIPS)[number];

/** (walk-test fix B2) The weapon swap's holstered beat (share of the swap: the gun in its slot), as `playerWeapons`'
 *  SWAP_HOLSTER: before it the holster plays, after it the draw. */
export const SWAP_HOLSTERED = 0.38;

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
  /** (walk-test fix B2) Riding a zipline. */
  zip?: boolean;
  /** (walk-test fix B2) The weapon swap's clock (0..1, < 0 none) and the slots it takes the guns from and to. */
  swap?: number;
  swapFrom?: SwapReach;
  swapTo?: SwapReach;
  /** (walk-test fix B2) Holding a guard: < 0 none, 0..1 the pull-in, 1 holding, 1..2 the knockout (let go). */
  grab?: number;
  /** (walk-test fix B2) Held by a player (a guard): < 0 none, 0..1 pulled in, 1 held. */
  grabbed?: number;
}

export interface ActionOut {
  /** The clip, or null: no action (locomotion only). */
  clip: ActionClip | null;
  /** 0..1 through a timed clip; NaN for a looping one. */
  t: number;
  /** (walk-test fix B2) The upper-body clip over the legs (null: none) and how far through it (0..1; NaN: looping on the
   *  body's own clock). */
  upper?: UpperClip | null;
  upperT?: number;
  /** (slice i) The body turns over with the rig's tumble (legs up / inverted on a pipe). */
  turn?: boolean;
  /** (walk-test fix A) A climb that plays only while the body moves and, stopped, runs on to its next grip (hands and
   *  feet on) and holds there (Michael: "only stop when all hands/feet are on the pipe"). */
  grip?: boolean;
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

/** The swap reach's gun class (the thigh holds the pistol; the back and the sling a long gun). */
function pistolSlot(r: SwapReach | undefined): boolean {
  return r === 'thigh';
}

/** The action for this frame into `out` (returned). `knife`: a knife is in the hands (the strike stabs). (walk-test
 *  fix B2) With no whole-body action the upper body plays, first found: held by a player (pulled in, then held), holding
 *  a guard (the pull-in, the hold, the knockout's let-go), a weapon swap (its holster, then its draw). */
export function pickAction(i: ActionIn, knife: boolean, out: ActionOut): ActionOut {
  pickBody(i, knife, out);
  out.upper = null;
  out.upperT = 0;
  if (out.clip !== null) return out;
  const gd = i.grabbed ?? -1, gr = i.grab ?? -1;
  if (gd >= 0) {
    out.upper = gd < 1 ? 'grabbed_take' : 'grabbed_idle';
    out.upperT = gd < 1 ? gd : NaN;
    return out;
  }
  if (gr >= 0) {
    out.upper = gr < 1 ? 'grab_take' : gr === 1 ? 'grab_idle' : 'grab_release';
    out.upperT = gr < 1 ? gr : gr === 1 ? NaN : clamp01(gr - 1);
    return out;
  }
  const sw = i.swap ?? -1;
  if (sw < 0) return out;
  if (sw < SWAP_HOLSTERED) {
    out.upper = pistolSlot(i.swapFrom) ? 'pistol_holster' : 'rifle_holster';
    out.upperT = sw / SWAP_HOLSTERED;
  } else {
    out.upper = pistolSlot(i.swapTo) ? 'pistol_draw' : 'rifle_draw';
    out.upperT = clamp01((sw - SWAP_HOLSTERED) / (1 - SWAP_HOLSTERED));
  }
  return out;
}

function pickBody(i: ActionIn, knife: boolean, out: ActionOut): ActionOut {
  out.clip = null;
  out.t = NaN;
  out.turn = false;
  out.grip = false;
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
      // (walk-test fix B2) a zipline's hang is its own (the hands on the cable, swaying)
      if (i.zip) out.clip = 'zipline';
      else out.clip = i.speed > SHIMMY ? (i.localX < 0 ? 'hang_shimmy_l' : 'hang_shimmy_r') : 'hang_idle';
      return out;
    case 'climb':
      out.clip = 'ladder';
      out.grip = true;
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
    // (slice i)
    case 'pipeClimb':
      out.clip = 'rope_climb';
      out.grip = true;
      return out;
    case 'pipeLegs':
    case 'pipeInv':
      out.clip = 'hang_idle';
      out.turn = true;
      return out;
    case 'wallKick':
      timed(out, 'wall_kick', i.traverseT);
      return out;
    case 'rappel':
      // (walk-test fix B2) "Climbing Down Wall", a grip climb (it plays while the body moves)
      out.clip = 'rappel';
      out.grip = true;
      return out;
    case 'split':
      out.clip = 'fall';
      return out;
    case 'brace':
      timed(out, 'team_lift', LIFT_OFFER);
      return out;
    default:
      break;
  }
  if ((i.melee ?? -1) >= 0) {
    timed(out, knife ? 'strike_knife' : 'strike_elbow', i.melee);
  } else if ((i.grenade ?? -1) >= 0) {
    timed(out, 'throw', i.grenade);
  } else if (i.wall) {
    // (walk-test fix A) the pack's "left cover sneak" steps to the character's right (named from the viewer's side,
    // measured in the game: its planted foot slides to the body's left), so moving left plays `wall_slide_r`.
    // Crouched and moving, the locomotion's crouched sidestep plays (the body stays back to the wall; the sneaks stand)
    const crouched = (i.crouch ?? 0) > 0.5;
    if (i.speed > SHIMMY) out.clip = crouched ? null : i.localX < 0 ? 'wall_slide_r' : 'wall_slide_l';
    else out.clip = crouched ? 'wall_crouch_idle' : 'wall_idle';
  }
  return out;
}

/** (walk-test fix B2) A clip's length (s; 0 unknown): the Mixamo body. */
export interface ClipSeconds {
  seconds(name: string): number;
}

/**
 * (walk-test fix B2) Back to a wall, a change of slide direction plays the cover turn once (standing or crouched, as at
 * its start) on its own clock, then the slide goes on; leaving the wall (or a traverse, a strike, a throw) ends it. One
 * per body; no allocation.
 */
export class WallTurn {
  /** The last slide direction on this wall (-1 left, 1 right, 0 none yet). */
  private dir = 0;
  /** Seconds into the turn (< 0: none) and its clip. */
  private t = -1;
  private clip: ActionClip = 'cover_turn';

  /** Over `out` (after `pickAction`): the turn while it runs. */
  step(i: ActionIn, dt: number, clips: ClipSeconds, out: ActionOut): void {
    if (!i.wall || (i.traverse ?? 'none') !== 'none' || (i.melee ?? -1) >= 0 || (i.grenade ?? -1) >= 0) {
      this.dir = 0;
      this.t = -1;
      return;
    }
    if (i.speed > SHIMMY) {
      const d = i.localX < 0 ? -1 : 1;
      if (this.dir !== 0 && d !== this.dir && this.t < 0) {
        this.t = 0;
        this.clip = (i.crouch ?? 0) > 0.5 ? 'cover_turn_crouch' : 'cover_turn';
      } else if (this.t >= 0) this.t += dt;
      this.dir = d;
    } else if (this.t >= 0) this.t += dt;
    if (this.t < 0) return;
    const len = clips.seconds(this.clip);
    if (len <= 0 || this.t >= len) {
      this.t = -1;
      return;
    }
    out.clip = this.clip;
    out.t = this.t / len;
    out.upper = null;
  }
}
