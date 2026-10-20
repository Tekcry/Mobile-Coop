/**
 * (anim-studio) The Anim Studio's pure state (Babylon-free, no DOM; a dev aid): the loop player's list (every keyed
 * clip in `clips/keyed` and the procedural states), the studio's switches, the phase maths (speed, scrub, step), the
 * synthesised input of the procedural states and the rigs the viewing aids draw. The stage itself is
 * `game/studioStage.ts`, the panel `ui/studioPanel.ts`, the overlay `ui/studioOverlay.ts`.
 *
 * Gameplay never reads any of this: only the studio stage (map `studio`, single player) writes the drive and reads the
 * input; leaving the studio resets it all (`studioReset`).
 */
import type { KeyedClip } from './keyed';
import { stickMagFor } from '../player/speedGears';
import { KEYED_CROUCH_IDLE } from './clips/keyed/crouch_idle';
import { KEYED_CROUCH_RUN } from './clips/keyed/crouch_run';
import { KEYED_CROUCH_WALK } from './clips/keyed/crouch_walk';
import { KEYED_GLIDE_BACK } from './clips/keyed/glide_back';
import { KEYED_GLIDE_FWD } from './clips/keyed/glide_fwd';
import { KEYED_GLIDE_STRAFE } from './clips/keyed/glide_strafe';
import { KEYED_GUARD_CHOKE_SAG } from './clips/keyed/guard_choke_sag';
import { KEYED_GUARD_HELD_HANDS } from './clips/keyed/guard_held_hands';
import { KEYED_GUARD_HELD_STUMBLE } from './clips/keyed/guard_held_stumble';
import { KEYED_GUARD_KNIFE_COLLAPSE } from './clips/keyed/guard_knife_collapse';
import { KEYED_HOLD_BACK } from './clips/keyed/hold_back';
import { KEYED_HOLD_CHOKE } from './clips/keyed/hold_choke';
import { KEYED_HOLD_FWD } from './clips/keyed/hold_fwd';
import { KEYED_HOLD_IDLE } from './clips/keyed/hold_idle';
import { KEYED_HOLD_KNIFE } from './clips/keyed/hold_knife';
import { KEYED_HOLD_SIDE } from './clips/keyed/hold_side';
import { KEYED_IDLE } from './clips/keyed/idle';
import { KEYED_JOG } from './clips/keyed/jog';
import { KEYED_READY_STANCE } from './clips/keyed/ready_stance';
import { KEYED_RUN } from './clips/keyed/run';
import { KEYED_SNEAK } from './clips/keyed/sneak';
import { KEYED_WALK } from './clips/keyed/walk';
import { KEYED_WALL_CROUCH_IDLE } from './clips/keyed/wall_crouch_idle';
import { KEYED_WALL_CROUCH_PEEK } from './clips/keyed/wall_crouch_peek';
import { KEYED_WALL_CROUCH_SLIDE } from './clips/keyed/wall_crouch_slide';
import { KEYED_WALL_IDLE } from './clips/keyed/wall_idle';
import { KEYED_WALL_PEEK } from './clips/keyed/wall_peek';
import { KEYED_WALL_SLIDE } from './clips/keyed/wall_slide';
import { wrap01 } from './studioDrive';

/** The studio map's id (`world/maps/studio.ts`; `?autostart=studio`). */
export const STUDIO_MAP_ID = 'studio';
/** The studio's speed range (the loop's time scale; above 1x only inside the studio). */
export const STUDIO_SPEED = { min: 0.1, max: 2, step: 0.05 } as const;
/** The circle the moving loops walk (m), and the turntable's rates (deg / s). */
export const STUDIO_RADIUS = 2;
export const TURN_RATES = [10, 20, 45, 90] as const;

/** Which way a clip travels in the body frame (the treadmill and the root-motion circle). */
export type StudioMove = 'none' | 'fwd' | 'back' | 'side';

/** One row of the loop player's list. */
export interface StudioEntry {
  /** `off`, `state:<name>` or `keyed:<clip name>`. */
  id: string;
  label: string;
  kind: 'off' | 'state' | 'keyed';
  /** Keyed: the clip. */
  clip: KeyedClip | null;
  /** Speed (m/s) of the loop: the treadmill and the root-motion circle (keyed), the circle (a state). */
  pace: number;
  /** Keyed: seconds per cycle (in place). */
  cycle: number;
  move: StudioMove;
  /** Crouched (a state: the stance; a keyed clip: its pelvis offset is from the standing rest, the body stands). */
  crouch: boolean;
  /** The gun drawn, and raised to aim. */
  drawn: boolean;
  aim: boolean;
  /** Keyed: it can walk the circle (root motion on); else in place only. */
  circle: boolean;
  /** Keyed: a guard's clip (played on the guard figure when it is on). */
  guard: boolean;
}

const off: StudioEntry = { id: 'off', label: 'off (you drive)', kind: 'off', clip: null, pace: 0, cycle: 1, move: 'none', crouch: false, drawn: false, aim: false, circle: false, guard: false };

function state(name: string, label: string, pace: number, move: StudioMove, crouch = false, drawn = false, aim = false): StudioEntry {
  return { id: `state:${name}`, label: `state: ${label}`, kind: 'state', clip: null, pace, cycle: 1, move, crouch, drawn, aim, circle: pace > 0, guard: false };
}

/**
 * A keyed clip. `step` (m) the step length the clip is keyed at: in place the cycle is two steps at `pace`
 * (`cycle` = 2 step / pace); still clips give their own `cycle` (s; the one-shots their keyed length).
 */
function keyed(clip: KeyedClip, o: { pace?: number; step?: number; cycle?: number; move?: StudioMove; crouch?: boolean; drawn?: boolean; aim?: boolean; circle?: boolean; guard?: boolean }): StudioEntry {
  const pace = o.pace ?? 0;
  const cycle = o.cycle ?? (pace > 0 && o.step ? (2 * o.step) / pace : 4);
  return {
    id: `keyed:${clip.name}`,
    label: `keyed: ${clip.name}`,
    kind: 'keyed',
    clip,
    pace,
    cycle,
    move: pace > 0 ? (o.move ?? 'fwd') : 'none',
    crouch: o.crouch ?? false,
    drawn: o.drawn ?? false,
    aim: o.aim ?? false,
    circle: o.circle ?? false,
    guard: o.guard ?? false,
  };
}

/**
 * The loop player's list: off, the procedural states (synthesised input, on the circle), then every keyed clip of
 * `clips/keyed` (sampled straight onto the rig). Paces and step lengths from the clips' notes (scripts/anim-keys/keys).
 */
export const STUDIO_ENTRIES: readonly StudioEntry[] = [
  off,
  state('idle', 'idle', 0, 'none'),
  state('walk', 'walk', 1.4, 'fwd'),
  state('jog', 'jog', 3.0, 'fwd'),
  state('run', 'run', 4.0, 'fwd'),
  state('crouchIdle', 'crouch idle', 0, 'none', true),
  state('sneak', 'sneak', 1.0, 'fwd', true),
  state('crouchWalk', 'crouch walk', 1.7, 'fwd', true),
  state('lowReady', 'low ready', 0, 'none', false, true),
  state('aimFwd', 'aim glide fwd', 1.0, 'fwd', false, true, true),
  state('aimStrafe', 'aim glide strafe', 1.0, 'side', false, true, true),
  state('aimBack', 'aim glide back', 0.9, 'back', false, true, true),
  keyed(KEYED_IDLE, { cycle: 12 }),
  keyed(KEYED_WALK, { pace: 1.4, step: 0.7, circle: true }),
  keyed(KEYED_JOG, { pace: 3.0, step: 1.1, circle: true }),
  keyed(KEYED_RUN, { pace: 4.0, step: 1.4, circle: true }),
  keyed(KEYED_READY_STANCE, { cycle: 8, drawn: true }),
  keyed(KEYED_GLIDE_FWD, { pace: 1.2, step: 0.36, drawn: true, aim: true, circle: true }),
  keyed(KEYED_GLIDE_STRAFE, { pace: 1.0, step: 0.3, move: 'side', drawn: true, aim: true, circle: true }),
  keyed(KEYED_GLIDE_BACK, { pace: 0.9, step: 0.32, move: 'back', drawn: true, aim: true, circle: true }),
  keyed(KEYED_CROUCH_IDLE, { cycle: 12, crouch: true }),
  keyed(KEYED_SNEAK, { pace: 1.0, step: 0.4, crouch: true, circle: true }),
  keyed(KEYED_CROUCH_WALK, { pace: 1.3, step: 0.42, crouch: true, circle: true }),
  keyed(KEYED_CROUCH_RUN, { pace: 2.6, step: 0.65, crouch: true, circle: true }),
  keyed(KEYED_WALL_IDLE, { cycle: 8 }),
  keyed(KEYED_WALL_SLIDE, { pace: 1.0, step: 0.3, move: 'side' }),
  keyed(KEYED_WALL_PEEK, { cycle: 4 }),
  keyed(KEYED_WALL_CROUCH_IDLE, { cycle: 12, crouch: true }),
  keyed(KEYED_WALL_CROUCH_SLIDE, { pace: 0.8, step: 0.3, crouch: true }),
  keyed(KEYED_WALL_CROUCH_PEEK, { cycle: 4, crouch: true }),
  keyed(KEYED_HOLD_IDLE, { cycle: 4 }),
  keyed(KEYED_HOLD_FWD, { pace: 0.8, step: 0.26 }),
  keyed(KEYED_HOLD_BACK, { pace: 1.0, step: 0.28, move: 'back' }),
  keyed(KEYED_HOLD_SIDE, { pace: 0.4, step: 0.12, move: 'side' }),
  keyed(KEYED_HOLD_CHOKE, { cycle: 5.5 }),
  keyed(KEYED_HOLD_KNIFE, { cycle: 3 }),
  keyed(KEYED_GUARD_HELD_HANDS, { cycle: 4, guard: true }),
  keyed(KEYED_GUARD_HELD_STUMBLE, { pace: 0.8, step: 0.26, move: 'back', guard: true }),
  keyed(KEYED_GUARD_CHOKE_SAG, { cycle: 5.5, guard: true }),
  keyed(KEYED_GUARD_KNIFE_COLLAPSE, { cycle: 3, guard: true }),
];

export function studioEntry(id: string): StudioEntry {
  // a plain loop: called every fixed step and frame (no closure allocation)
  for (let i = 0; i < STUDIO_ENTRIES.length; i++) if (STUDIO_ENTRIES[i]!.id === id) return STUDIO_ENTRIES[i]!;
  return off;
}

/** Front / side / top / back camera snaps (free-view orbit presets). */
export type StudioSnap = 'front' | 'side' | 'back' | 'top';

/**
 * The studio's switches (written by the panel, read by the stage each frame). `seek` (NaN: none) and `step` (0: none)
 * are requests the stage takes once. `phase` / `frames` are written back by the stage for the readout.
 */
export const STUDIO = {
  active: false,
  entry: 'state:idle',
  mirror: false,
  rootMotion: false,
  turntable: false,
  turnRate: 20 as number,
  guard: false,
  skeleton: true,
  feet: true,
  onion: false,
  seek: Number.NaN,
  step: 0,
  /** Readout: the phase the pose shows (0..1) and the clip's key count (0: a procedural state). */
  phase: 0,
  frames: 0,
  /** Bumped by the panel on every tuner change (the onion skin's cached keys are stale then). */
  poseVer: 0,
};

const DEFAULTS = { ...STUDIO };

/** Leaving the studio: every switch back to its default (inactive). */
export function studioReset(): void {
  Object.assign(STUDIO, DEFAULTS);
  STUDIO_RIGS.length = 0;
  STUDIO_TARGET.rig = null;
  STUDIO_TARGET.clip = null;
  STUDIO_TARGET.drive = null;
}

/** A clamped studio speed (anything not finite: 1). */
export function studioSpeed(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.max(STUDIO_SPEED.min, Math.min(STUDIO_SPEED.max, v));
}

/** The phase after `dt` s at `speed` x over a `cycle` s loop (wrapped 0..1). */
export function studioAdvance(phase: number, dt: number, cycle: number, speed = 1): number {
  if (!(cycle > 0) || !(dt > 0)) return wrap01(phase);
  return wrap01(phase + (dt * speed) / cycle);
}

/** One key back (-1) or forward (+1): onto the next key of `frames`, wrapping (between keys: to the nearer one first). */
export function studioStepPhase(phase: number, frames: number, dir: number): number {
  if (!(frames > 0)) return wrap01(phase);
  const f = wrap01(phase) * frames;
  const at = Math.abs(f - Math.round(f)) < 1e-6 ? Math.round(f) : dir > 0 ? Math.floor(f) : Math.ceil(f);
  const k = (((at + Math.sign(dir)) % frames) + frames) % frames;
  return k / frames;
}

/** A scrub position (any number) as a phase 0..1 (1 stays the last instant before the wrap). */
export function studioScrub(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(0.9999, v));
}

/** The key nearest a phase (0..frames-1). */
export function studioKey(phase: number, frames: number): number {
  if (!(frames > 0)) return 0;
  return Math.round(wrap01(phase) * frames) % frames;
}

/** The synthesised input of a loop (per fixed step). */
export interface StudioInputOut {
  /** Stick in the game camera's frame (x right, y forward). */
  x: number;
  y: number;
  /** The game camera's turn (rad / s; the circle: the heading turns at pace / radius). */
  turn: number;
  ads: boolean;
  crouch: boolean;
  drawn: boolean;
}

/**
 * What a loop wants: a procedural state walks the circle at its pace (a constant stick along its direction while the
 * camera turns at pace / radius, so the heading follows the circle; aimed, the body keeps facing the view); a keyed
 * clip with root motion walks the circle at its pace standing (its own pelvis offset gives the crouch), in place it
 * stands. No allocation.
 */
export function studioInput(e: StudioEntry, rootMotion: boolean, out: StudioInputOut): StudioInputOut {
  out.x = out.y = out.turn = 0;
  out.ads = e.aim;
  out.drawn = e.drawn;
  out.crouch = e.kind === 'state' && e.crouch;
  const moving = e.pace > 0 && (e.kind === 'state' || (rootMotion && e.circle));
  if (!moving) return out;
  const crouched = e.kind === 'state' && e.crouch;
  const mag = stickMagFor(e.pace, crouched);
  if (e.move === 'side') out.x = mag;
  else out.y = e.move === 'back' ? -mag : mag;
  out.turn = e.pace / STUDIO_RADIUS;
  return out;
}

/** A joint the overlay reads (a Babylon TransformNode, loosely typed). */
export interface StudioJoint {
  getAbsolutePosition(): { x: number; y: number; z: number };
}
/** A rig the viewing aids draw (a CharacterRig, loosely typed: no Babylon here). */
export interface StudioRigView {
  bones(): [StudioJoint, StudioJoint][];
  readonly root: { position: { x: number; y: number; z: number }; rotation: { y: number } };
  readonly planner: { L: { x: number; y: number; z: number; contact: boolean }; R: { x: number; y: number; z: number; contact: boolean } };
}
/** The rigs on the stage (Wren first, then the guard figure when on). Written by the stage. */
export const STUDIO_RIGS: StudioRigView[] = [];
/** The rig the loop player drives now, its clip and its drive (null: none), for the onion skin: `drive.live` is the
 *  phase the rig was posed at this frame. Written by the stage. */
export const STUDIO_TARGET: { rig: StudioRigView | null; clip: KeyedClip | null; drive: { readonly live: number } | null } = { rig: null, clip: null, drive: null };
