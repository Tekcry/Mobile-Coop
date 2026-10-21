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
import type { BodyGroup } from './tune';
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
import { keyClip, keyCount, keyIdCount, keyNearest, keyPhase, keyStep as keyStep_ } from './keyTimeline';
import { TEAM_MOVE_LABEL, TEAM_MOVES, TEAM_ROLE_LABEL, type TeamMoveId } from './moveTune';
import { pairCycle } from './studioPairs';
import { travCycle, TRAV_ENTRIES, type TravEntry } from './studioTraversal';

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
  /** `off`, `state:<name>`, `keyed:<clip name>`, `pair:<move>` (anim-studio-2: both roles of a co-op move, or a hold with the guard) or `trav:<move>` (a traversal loop on a prop). */
  id: string;
  label: string;
  kind: 'off' | 'state' | 'keyed' | 'pair' | 'trav' | 'guard';
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
  /** (anim-studio-2) A co-op pair: the team move (both roles posed by `studioPairs.ts`), else null. */
  team: TeamMoveId | null;
  /** (anim-studio-2) A hold pair: the guard's clip played with `clip` (Wren's hold) on one clock, else null. */
  guardClip: KeyedClip | null;
  /** (anim-studio-2) A traversal loop (`studioTraversal.ts`), else null. */
  trav: TravEntry | null;
  /** (marlow-bays item 24, track A) A guard puppet's loop (`guard:<name>`: a real guard rig, no AI), else null. */
  gloop: GuardLoop | null;
}

/**
 * (item 24, track A) What a guard puppet's loop feeds the guard rig, as `Enemy.frame` would: the pace (m/s, on the spot:
 * a treadmill), the aim raise (0.2 unaware .. 0.7 alert .. 1 attacking), crouched, back to a wall, the dash.
 */
export interface GuardLoop {
  speed: number;
  aim: number;
  crouch: boolean;
  wall: boolean;
  dash: boolean;
}

const off: StudioEntry = { id: 'off', label: 'off (you drive)', kind: 'off', clip: null, pace: 0, cycle: 1, move: 'none', crouch: false, drawn: false, aim: false, circle: false, guard: false, team: null, guardClip: null, trav: null, gloop: null };

function state(name: string, label: string, pace: number, move: StudioMove, crouch = false, drawn = false, aim = false): StudioEntry {
  return { id: `state:${name}`, label: `state: ${label}`, kind: 'state', clip: null, pace, cycle: 1, move, crouch, drawn, aim, circle: pace > 0, guard: false, team: null, guardClip: null, trav: null, gloop: null };
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
    team: null,
    guardClip: null,
    trav: null,
    gloop: null,
  };
}

/** (anim-studio-2) A co-op pair: both roles of a team move on one clock (`studioPairs.ts`). */
function teamPair(m: TeamMoveId): StudioEntry {
  return { id: `pair:${m}`, label: `pair: ${TEAM_MOVE_LABEL[m].replace('Co-op: ', '')} (${TEAM_ROLE_LABEL[m][0]}, ${TEAM_ROLE_LABEL[m][1]})`, kind: 'pair', clip: null, pace: 0, cycle: pairCycle(m), move: 'none', crouch: false, drawn: false, aim: false, circle: false, guard: false, team: m, guardClip: null, trav: null, gloop: null };
}

/** (anim-studio-2) A hold pair: Wren's hold clip and the guard's clip in place on one clock (Wren's keyed cycle). */
function holdPair(name: string, wren: StudioEntry, guard: StudioEntry): StudioEntry {
  return { ...wren, id: `pair:${name}`, label: `pair: ${wren.clip!.name} + ${guard.clip!.name}`, kind: 'pair', circle: false, guard: false, team: null, guardClip: guard.clip, trav: null, gloop: null };
}

/** (anim-studio-2) A traversal loop on a prop. */
function travel(t: TravEntry): StudioEntry {
  return { id: t.id, label: t.label, kind: 'trav', clip: null, pace: 0, cycle: travCycle(t), move: 'none', crouch: false, drawn: false, aim: false, circle: false, guard: false, team: null, guardClip: null, trav: t, gloop: null };
}

/**
 * The loop player's list: off, the procedural states (synthesised input, on the circle), then every keyed clip of
 * `clips/keyed` (sampled straight onto the rig). Paces and step lengths from the clips' notes (scripts/anim-keys/keys).
 */
const BASE_ENTRIES: readonly StudioEntry[] = [
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
  // (marlow-bays T1a, item 19) the aim stances: standing still, crouched still and crouched moving
  state('aimStill', 'aim standing', 0, 'none', false, true, true),
  state('crouchAim', 'crouch aim standing', 0, 'none', true, true, true),
  state('crouchAimFwd', 'crouch aim moving', 0.9, 'fwd', true, true, true),
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

function base(id: string): StudioEntry {
  return BASE_ENTRIES.find((e) => e.id === id)!;
}

/** (item 24, track A) The guard puppet's paces (m/s): the grunt's walk x the patrol / investigate paces, its run. */
export const GUARD_PACE = { patrol: 0.99, alert: 1.08, run: 3.2 } as const;

/**
 * The loop player's list: off, the procedural states, every keyed clip, then (anim-studio-2) the pairs (each co-op team
 * move with both operators, the holds with the guard) and the traversal loops on the props.
 */
export const STUDIO_ENTRIES: readonly StudioEntry[] = [
  ...BASE_ENTRIES,
  ...TEAM_MOVES.map(teamPair),
  holdPair('hold_idle', base('keyed:hold_idle'), base('keyed:guard_held_hands')),
  holdPair('hold_back', base('keyed:hold_back'), base('keyed:guard_held_stumble')),
  holdPair('hold_choke', base('keyed:hold_choke'), base('keyed:guard_choke_sag')),
  holdPair('hold_knife', base('keyed:hold_knife'), base('keyed:guard_knife_collapse')),
  ...TRAV_ENTRIES.map(travel),
  // (marlow-bays item 24, track A) the guard puppet's loops (a real guard rig on the spot; Wren stands by, hidden)
  guardLoop('idle', 'idle', { speed: 0, aim: 0.2, crouch: false, wall: false, dash: false }),
  guardLoop('patrol', 'patrol walk', { speed: GUARD_PACE.patrol, aim: 0.2, crouch: false, wall: false, dash: false }),
  guardLoop('alert', 'alert walk', { speed: GUARD_PACE.alert, aim: 0.7, crouch: false, wall: false, dash: false }),
  guardLoop('run', 'run', { speed: GUARD_PACE.run, aim: 0.2, crouch: false, wall: false, dash: true }),
  guardLoop('aim', 'aim', { speed: 0, aim: 1, crouch: false, wall: false, dash: false }),
  guardLoop('crouchAim', 'crouched aim', { speed: 0, aim: 1, crouch: true, wall: false, dash: false }),
  guardLoop('cover', 'wall cover', { speed: 0, aim: 1, crouch: false, wall: true, dash: false }),
];

/** (item 24, track A) A guard puppet's loop: on the guard rig, on the spot (no key table: frames 0). Wren gets no input
 *  (she stands by, hidden): the loop's own stance is in `gloop`. */
function guardLoop(name: string, label: string, g: GuardLoop): StudioEntry {
  return { id: `guard:${name}`, label: `guard: ${label}`, kind: 'guard', clip: null, pace: 0, cycle: 1, move: 'none', crouch: false, drawn: false, aim: false, circle: false, guard: false, team: null, guardClip: null, trav: null, gloop: g };
}

export function studioEntry(id: string): StudioEntry {
  // a plain loop: called every fixed step and frame (no closure allocation)
  for (let i = 0; i < STUDIO_ENTRIES.length; i++) if (STUDIO_ENTRIES[i]!.id === id) return STUDIO_ENTRIES[i]!;
  return off;
}

/** (marlow-bays T1a, item 19) The studio's gun pick for every armed loop. */
export type StudioWeapon = 'rifle' | 'pistol';
export const STUDIO_WEAPONS: readonly StudioWeapon[] = ['rifle', 'pistol'];

/** The tuner's body state of each keyed clip of Wren (the Keyed box's clip, a hold pair's clip). */
export const CLIP_BODY: Readonly<Record<string, BodyGroup>> = {
  idle: 'idle',
  walk: 'walk',
  jog: 'jog',
  run: 'run',
  ready_stance: 'lowReady',
  glide_fwd: 'aim',
  glide_strafe: 'aim',
  glide_back: 'aim',
  crouch_idle: 'crouchIdle',
  sneak: 'sneak',
  crouch_walk: 'crouchWalk',
  crouch_run: 'crouchRun',
  wall_idle: 'wallIdle',
  wall_slide: 'wallSlide',
  wall_peek: 'wallPeek',
  wall_crouch_idle: 'wallCrouchIdle',
  wall_crouch_slide: 'wallCrouchSlide',
  wall_crouch_peek: 'wallCrouchPeek',
  hold_idle: 'hold',
  hold_fwd: 'hold',
  hold_back: 'hold',
  hold_side: 'hold',
  hold_choke: 'hold',
  hold_knife: 'hold',
};

/**
 * (marlow-bays item 29) The body state Wren's rig tunes with while a loop plays ('' : chosen from her pose): a keyed clip
 * of hers (and a hold pair) its own state, so the panel's sliders for that state reach the clip (on the spot the pose
 * has no speed and alone would pick `idle`). A guard clip ('' : Wren stands by) and the procedural states are not pinned.
 */
export function studioBodyPin(e: StudioEntry): BodyGroup | '' {
  if (e.guard || !e.clip || e.team || (e.kind !== 'keyed' && e.kind !== 'pair')) return '';
  return CLIP_BODY[e.clip.name] ?? '';
}

/** (T1a) The weapon class a loop wants in hand ('' : holstered loops keep whatever is selected). */
export function studioWeaponFor(e: StudioEntry, weapon: StudioWeapon): string {
  return e.drawn ? weapon : '';
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
  /** (tuner-ui) A moving state loops on the spot (a treadmill: the gait runs, the root is held where it started)
   *  instead of walking the circle. The panel's "Loop on the spot" sets it with `rootMotion` off (a keyed clip in place). */
  spot: true,
  turntable: false,
  turnRate: 20 as number,
  guard: false,
  /** (marlow-bays item 29 phase 2) The viewing aids start off (Michael: the green skeleton over her "is too distracting
   *  and blocks the animation"); More > View aids turns them on. */
  skeleton: false,
  feet: false,
  onion: false,
  seek: Number.NaN,
  step: 0,
  /** (marlow-bays T1a, item 15) Requests: go to key `seekKey` (-1 none) of the keyed clip, or one key back / forward
   *  (`keyStep` -1 / 1; 0 none), in place. Pairs step by frame (`step`). */
  seekKey: -1,
  keyStep: 0,
  /** (T1a, item 19) The gun every armed loop plays with ('rifle' or 'pistol'). */
  weapon: 'rifle' as StudioWeapon,
  /** Readout: the phase the pose shows (0..1) and the clip's frame count (0: a procedural state). */
  phase: 0,
  frames: 0,
  /** (T1a) Readout: the keyed clip's key count (0: no keys) and the key nearest the phase, and whether the phase is on it. */
  keys: 0,
  key: -1,
  onKey: false,
  /** Bumped by the panel on every tuner change (the onion skin's cached keys are stale then). */
  poseVer: 0,
};

const DEFAULTS = { ...STUDIO };

/**
 * (anim-studio-2) What a pair or a traversal loop is doing (written by the stage; the panel's readout and the test hooks):
 * each role's team state and tuner group, the contact weight, the clock each rig was posed at; the loop's phase, step,
 * count and the attach state Wren is in.
 */
export const STUDIO_PAIR = { aState: 'none', bState: 'none', aGroup: '', bGroup: '', k: 0, tA: 0, tB: 0, cycle: 0, ay: 0, by: 0, rigs: 0, travPhase: '', travStep: 0, travLoops: 0, attach: '', traverse: '' };
const PAIR_DEFAULTS = { ...STUDIO_PAIR };

/** Leaving the studio: every switch back to its default (inactive). */
export function studioReset(): void {
  // (T1a) the gun pick is kept across studio visits, as the stage light
  const weapon = STUDIO.weapon;
  Object.assign(STUDIO, DEFAULTS);
  STUDIO.weapon = weapon;
  Object.assign(STUDIO_PAIR, PAIR_DEFAULTS);
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

/**
 * (marlow-bays T1a, item 15) A keyed clip's key request: the phase of key `seekKey` (>= 0), else of the next key back /
 * forward (`keyStep` -1 / 1) from `phase`; NaN when there is nothing to do (no request, or a clip with no key table).
 */
export function studioKeyPhase(clip: string, phase: number, seekKey: number, keyStep: number): number {
  const c = keyClip(clip);
  if (!c) return Number.NaN;
  if (seekKey >= 0) return keyPhase(c, Math.min(seekKey, keyIdCount(c) - 1)); // (item 25) a key id (added keys after the originals)
  if (keyStep !== 0) return keyPhase(c, keyStep_(c, phase, keyStep));
  return Number.NaN;
}

/** (T1a) The readout's key fields for a keyed clip at `phase` (no key table: 0 keys, key -1). No allocation. */
export function studioKeyInfo(clip: string, phase: number, out: { keys: number; key: number; onKey: boolean }): void {
  const c = clip ? keyClip(clip) : null;
  if (!c) {
    out.keys = 0;
    out.key = -1;
    out.onKey = false;
    return;
  }
  out.keys = keyCount(c);
  out.key = keyNearest(c, phase);
  let d = Math.abs(keyPhase(c, out.key) - wrap01(phase));
  if (d > 0.5) d = 1 - d;
  out.onKey = d < 1e-4;
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
 * stands. (tuner-ui) `spot`: a state loops on the spot, the stick in a straight line with no camera turn (the stage
 * holds the root, `studioSpot`). No allocation.
 */
export function studioInput(e: StudioEntry, rootMotion: boolean, out: StudioInputOut, spot = false): StudioInputOut {
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
  out.turn = spot && e.kind === 'state' ? 0 : e.pace / STUDIO_RADIUS;
  return out;
}

/** (tuner-ui) A state that loops on the spot (a moving state with `spot` on): the stage holds its root. */
export function studioSpot(e: StudioEntry, spot: boolean): boolean {
  return spot && e.kind === 'state' && e.pace > 0;
}

/** (tuner-ui) The treadmill's shift for one step: how far (x, z) the root went from where it is held. */
export function spotShift(px: number, pz: number, ax: number, az: number, out: { x: number; z: number }): { x: number; z: number } {
  out.x = px - ax;
  out.z = pz - az;
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

/**
 * (marlow-bays slice T, item 14) The studio's stage lights: a three-point rig (key, fill, rim) and a soft top light for
 * ambient that follow Wren (her root and her facing), so she stays lit as she moves. Rendering only, the studio only:
 * the game's light registry, the light field and the bake never see them. `STUDIO_LIGHT.scale` is the View tab's "Stage
 * light" slider (0 off .. 2; 1 the default, bright), kept across studio visits (not reset with the switches) and saved
 * with the tuner's own settings.
 */
export const STUDIO_LIGHT = { scale: 1 };
export const STAGE_LIGHT_RANGE = { min: 0, max: 2, step: 0.05, def: 1 } as const;

export interface StageLightDef {
  readonly name: string;
  /** Offset from her root in her own frame (m): forward, right, up. */
  readonly fwd: number;
  readonly right: number;
  readonly up: number;
  /** Intensity at a scale of 1 (range falloff, as the game's lamps), and its range (m). */
  readonly intensity: number;
  readonly range: number;
  readonly color: readonly [number, number, number];
}

export const STAGE_LIGHTS: readonly StageLightDef[] = [
  { name: 'key', fwd: 2.0, right: 1.6, up: 2.3, intensity: 2.4, range: 7, color: [1, 0.95, 0.88] },
  { name: 'fill', fwd: 2.2, right: -1.8, up: 1.2, intensity: 1.4, range: 7, color: [0.82, 0.88, 1] },
  { name: 'rim', fwd: -2.0, right: -0.6, up: 2.5, intensity: 1.5, range: 7, color: [0.92, 0.96, 1] },
  { name: 'ambient', fwd: 0.3, right: 0, up: 3.6, intensity: 1.5, range: 9, color: [1, 1, 1] },
];

/** A stage light's world place for her root (x, y, z) facing `yaw` (Babylon: forward (sin, cos), right (cos, -sin)). */
export function stageLightPlace(l: StageLightDef, x: number, y: number, z: number, yaw: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  out.x = x + s * l.fwd + c * l.right;
  out.y = y + l.up;
  out.z = z + c * l.fwd - s * l.right;
  return out;
}

/** The slider's value clamped (anything not finite: the default). */
export function stageLightScale(v: number): number {
  if (!Number.isFinite(v)) return STAGE_LIGHT_RANGE.def;
  return Math.max(STAGE_LIGHT_RANGE.min, Math.min(STAGE_LIGHT_RANGE.max, v));
}

/**
 * (marlow-bays T2) The frame the stage lights take: "forward" from her root toward the camera (Babylon yaw: forward
 * (sin, cos)), so the key and the fill sit on the camera's side and the rim on the far side, whatever side she is seen
 * from (the game's view from behind, the orbit, a snap). The camera on her root (or none): her own facing `fallback`.
 */
export function stageViewYaw(rx: number, rz: number, cx: number, cz: number, fallback: number): number {
  const dx = cx - rx;
  const dz = cz - rz;
  if (dx * dx + dz * dz < 1e-6) return fallback;
  return Math.atan2(dx, dz);
}
