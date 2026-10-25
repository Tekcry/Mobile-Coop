/**
 * (tuner-clarity S3; Michael 2026-10-25: "I can't tell if my changes are working between motion capture or keyed. Must be
 * clear") What each tuner row reaches, the pure part (no DOM, no Babylon; `tests/tunerReach.test.ts`, the probe check
 * `tests/tunerReachProbe.test.ts`): the motion capture, the hand-made moves, both, or nothing on what is playing now, in
 * plain words (BRIEF A2), and the one-line warning for an edit that changes nothing on screen (A4). Every shown string
 * of the job's reach tags, notes and warnings is exported here for the panel (S4 wires them; `nowPlaying.ts` keeps its
 * own "Now playing" words).
 *
 * Code facts the table follows (docs/tuner-clarity/PLAN.md 1, 2(a)):
 * - The motion capture plays only the holstered standing walk / jog / run / sprint, its start, stop and turns, the
 *   crouched sneak and the aimed strafe (`LocoClipSet`'s clip slots, `MOCAP_STATE_OF`); every other move is hand-made
 *   (the hand-keyed clips or the graph's own code). Guards never play the keyed sets.
 * - The Keys tab edits only the hand-keyed clips (`clips/keyed/*`: their offset tables), never a capture.
 * - Joints, Hands & feet, Limb reach, Gun in hand, Gun hold and Speed apply after the blend: both.
 * - A Body slider whose `MOCAP_LAYERS` scale is 0 is taken off the capture's share (`BODY_LAYER`): hand-made only (A5:
 *   labelled, never hidden).
 * - Stepping and Weight (and every Body slider) as the motion-capture probe found them (`NO_EFFECT[state].mocap`, the
 *   sliders that change the hand-made set but not the capture): the probe wins over the layer table where they differ.
 */
import type { KeyedClip } from '../anim/keyed';
import { MOCAP_LAYERS, type LocoClipSet, type MocapLayers } from '../anim/mocap';
import type { BodyField, BodyGroup } from '../anim/tune';
import { CLIP_BODY } from '../anim/studio';
import { NO_EFFECT } from './tunerEffect';
import { BODY_GUN, BODY_STEP, BODY_WEIGHT, plainGroupWord } from './tunerLayout';

// ------------------------------------------------------------------------------------------
// The words (BRIEF A2: one table; colour plus words, never colour alone)
// ------------------------------------------------------------------------------------------

/** What a row reaches: the motion capture only, the hand-made moves only, both, or no tag (camera, gear, options). */
export type Reach = 'mocap' | 'keyed' | 'both' | 'none';
/** A row's tag now: its reach, or `off` (BRIEF A11: its own state plays, by the other way). */
export type ReachShown = Reach | 'off';

/** The tag words (BRIEF A2); `none` shows no tag. */
export const REACH_WORDS: Readonly<Record<ReachShown, string>> = {
  mocap: 'Motion capture',
  keyed: 'Hand-made',
  both: 'Both',
  off: 'Not playing now',
  none: '',
};

/** The tag's hover text: what it means in a sentence. */
export const REACH_TITLES: Readonly<Record<ReachShown, string>> = {
  mocap: 'Changes the motion-capture moves only',
  keyed: 'Changes the hand-made moves only: motion capture ignores it',
  both: 'Changes both the motion-capture and the hand-made moves',
  off: 'Changes nothing on what is playing now: the other kind of move is playing',
  none: '',
};

/** (BRIEF A1) The fixed note at the top of the Keys tab. */
export const KEYS_MOCAP_NOTE = 'Keys change the hand-made moves only. Motion-capture moves are changed in Body > Joints, Hands & feet and Limb reach.';
/** (BRIEF A12) The More > Panel "Mocap locomotion" box's label (behaviour unchanged). */
export const MOCAP_BOX_LABEL = 'Motion capture for walk, jog, run, sneak and aimed strafe (off = hand-made)';
/** (BRIEF A4, PLAN 2(c)) The More > Panel box that switches the warning off. */
export const CLARITY_WARN_LABEL = 'Warn when an edit changes nothing';
/** (PLAN 2(e)) Added to the Keys readout on a clip whose move the motion capture plays in the game. */
export const KEYS_CAPTURED_NOTE = '(motion capture plays this in the game)';
/** (BRIEF A5) A Body slider the capture ignores (a `.tt-note` line under it, with the Hand-made tag). */
export const HAND_MADE_ONLY_NOTE = 'Hand-made only: motion capture keeps its own.';

// ------------------------------------------------------------------------------------------
// The motion capture's states
// ------------------------------------------------------------------------------------------

/** The clip slots of a locomotion set (its `KeyedClip | null` fields; `mocap.ts` LocoClipSet). */
export type LocoSlot = { [K in keyof LocoClipSet]-?: [NonNullable<LocoClipSet[K]>] extends [KeyedClip] ? K : never }[keyof LocoClipSet];

/** The body state each motion-capture slot plays (a new slot fails `tsc` until it is placed). */
export const MOCAP_STATE_OF: Readonly<Record<LocoSlot, BodyGroup>> = {
  walk: 'walk',
  jog: 'jog',
  run: 'run',
  sprint: 'run',
  turnInPlace: 'idle',
  turnMoveL: 'walk',
  turnMoveR: 'walk',
  start: 'walk',
  stop: 'walk',
  crouchWalk: 'sneak',
  strafeL: 'aim',
  strafeR: 'aim',
};
const CAPTURED: ReadonlySet<string> = new Set<string>(Object.values(MOCAP_STATE_OF));

/** Whether the motion capture plays any of `state` (holstered; the aimed strafe with a gun). */
export function hasCapture(state: string): boolean {
  return CAPTURED.has(state);
}

/** (PLAN 2(e)) The Keys clips whose move the motion capture plays in the game (the readout's note). */
export const KEYS_CAPTURED_CLIPS: readonly string[] = ['walk', 'jog', 'run', 'sneak', 'glide_strafe'];

/** Whether the Keys readout of `clip` adds `KEYS_CAPTURED_NOTE`. */
export function keysClipCaptured(clip: string): boolean {
  return KEYS_CAPTURED_CLIPS.includes(clip);
}

/** The `MOCAP_LAYERS` scale that takes each Body slider off the capture's share (null: none; the slider applies to both). */
export const BODY_LAYER: Readonly<Record<BodyField, keyof MocapLayers | null>> = {
  kneeFlexAdd: null,
  trunkTwistMul: 'trunkTwist',
  trackMul: null,
  kneeOutMul: null,
  kneeLiftMul: null,
  strideMul: null,
  pelvisYAdd: null,
  leanAdd: 'keyLean',
  armSwingMul: 'armSwing',
  armSwingGrow: 'armSwing',
  elbowOutAdd: 'elbowOut',
  elbowPoleMul: null,
  headTurnMul: null,
  peekLeanMul: null,
  wallGapAdd: null,
  bodyFwdAdd: null,
  bodyUpAdd: null,
  handUpAdd: null,
  handFwdAdd: null,
  handOutAdd: null,
  footUpAdd: null,
  footFwdAdd: null,
  footOutAdd: null,
  guardGapAdd: null,
  guardSideAdd: null,
};

// ------------------------------------------------------------------------------------------
// The rule per section
// ------------------------------------------------------------------------------------------

/** How a section's rows reach: no tag, hand-made only, after the blend (both), the Body layer table, the probe. */
export type ReachRule = 'none' | 'keyed' | 'after' | 'layer' | 'probe';

/** Every registered section's rule (the Co-op `team_*` and the guards' sections by prefix, `sectionRule`). */
export const SECTION_RULE: Readonly<Record<string, ReachRule>> = {
  keys: 'keyed',
  cam: 'none',
  gear: 'none',
  // moves with no capture (climbs, holds, the elbow strike, the clip speeds, the draw)
  trav: 'keyed',
  cq: 'keyed',
  strike: 'keyed',
  clip: 'keyed',
  draw: 'keyed',
  joint: 'after',
  ik: 'after',
  hand: 'after',
  weapon: 'after',
  gun: 'after',
  speed: 'after',
  body: 'layer',
  step: 'probe',
  weight: 'probe',
};

/** A section's rule; undefined for a section with none (a test fails for any registered one). */
export function sectionRule(section: string): ReachRule | undefined {
  const r = SECTION_RULE[section];
  if (r) return r;
  // the co-op moves (no capture) and the guards (they never play the keyed sets: `keyedOk` off)
  if (section.startsWith('team_') || section.startsWith('guard')) return 'keyed';
  return undefined;
}

/** The body states by name (`STATE_DOING`'s keys are every `BodyGroup`). */
function isBodyGroup(s: string): s is BodyGroup {
  return s in STATE_DOING;
}

/** The body states a gait or group name stands for (`BODY_STEP` / `BODY_WEIGHT` / `BODY_GUN` read backwards). */
function statesOf(map: Readonly<Record<string, string>>, v: string): BodyGroup[] {
  const out: BodyGroup[] = [];
  for (const k in map) if (map[k] === v && isBodyGroup(k)) out.push(k);
  return out;
}

/** The Speed section's stances (`spd.<stance>`) as the body states they pace. */
const SPEED_STATES: Readonly<Record<string, readonly BodyGroup[]>> = {
  stand: ['idle', 'walk', 'jog', 'run'],
  crouch: ['crouchIdle', 'sneak', 'crouchWalk', 'crouchRun'],
  aim: ['aim', 'aimCrouchMove'],
  wall: ['wallSlide', 'wallCrouchSlide'],
  climb: ['ladder', 'pipe', 'ledge', 'hang', 'crawl', 'vent'],
};

/** The weapon level of a group with one (`hand.rifle.walk`, `weapon.none.idle`, `joint.rifle.aim`, `rifle.aim`), else ''. */
function weaponOf(section: string, group: string): string {
  const s = group.split('.');
  if (section === 'hand' || section === 'weapon') return s[1] ?? '';
  if (section === 'joint') return s.length === 3 ? s[1]! : '';
  if (section === 'gun') return s[0] ?? '';
  return '';
}

/**
 * The body states a row is tied to (PLAN 2(a) step 2): the group's last segment for a state section, a Stepping /
 * Weight gait and a Speed stance through the states that use them (many to one), a Keys clip through its body state
 * (`CLIP_BODY`). [] for a row tied to no body state (a move row, the camera, the co-op, the guards).
 */
export function rowStates(section: string, group: string): BodyGroup[] {
  const last = group.slice(group.lastIndexOf('.') + 1);
  switch (section) {
    case 'body':
    case 'joint':
    case 'ik':
    case 'hand':
    case 'weapon':
      return isBodyGroup(last) ? [last] : [];
    case 'gun':
      return statesOf(BODY_GUN, last);
    case 'step':
      return statesOf(BODY_STEP, last);
    case 'weight':
      return statesOf(BODY_WEIGHT, last);
    case 'speed':
      return [...(SPEED_STATES[last] ?? [])];
    case 'keys': {
      const m = /^key\.([a-z0-9_]+)\./.exec(group);
      const b = m ? CLIP_BODY[m[1]!] : undefined;
      return b ? [b] : [];
    }
    default:
      return [];
  }
}

/** Whether a row is for her with a gun in hand (the hand-keyed drawn set; only its aimed strafe is captured). */
function rowDrawn(section: string, group: string): boolean {
  if (section === 'gun') return true;
  const w = weaponOf(section, group);
  return w !== '' && w !== 'none';
}

/** Whether a row is for her with no gun out only (the "none" weapon level of a Hands & feet, Gun in hand or Joints group). */
function rowHolstered(section: string, group: string): boolean {
  return weaponOf(section, group) === 'none';
}

/** The probe's word on `key` (`section:id`) in `state`: false when it changes the hand-made set but not the capture;
 *  true otherwise (it changes the capture, or the state was not probed, or the probe could not see it). */
function probeReaches(state: string, key: string): boolean {
  const dead = NO_EFFECT[state]?.mocap;
  return !dead || !dead.includes(key);
}

/** The states of a row the motion capture plays (a gun's rows: the aimed strafe only). */
function capturedStates(section: string, group: string): BodyGroup[] {
  const drawn = rowDrawn(section, group);
  return rowStates(section, group).filter((s) => hasCapture(s) && (!drawn || s === 'aim'));
}

/** What slider `id` of `group` in `section` reaches (PLAN 2(a); code facts and the probe, nothing live). */
export function rowReach(section: string, group: string, id: string): Reach {
  const rule = sectionRule(section);
  if (!rule || rule === 'none') return 'none';
  if (rule === 'keyed') return 'keyed';
  // the Joints options (the mirror lock) are a setting, not a pose
  if (group.endsWith('.options')) return 'none';
  const cap = capturedStates(section, group);
  if (!cap.length) return 'keyed';
  if (rule === 'after') return 'both';
  if (rule === 'layer') {
    const layer = (BODY_LAYER as Readonly<Record<string, keyof MocapLayers | null>>)[id] ?? null;
    if (layer !== null && MOCAP_LAYERS[layer] === 0) return 'keyed';
  }
  // the probe: both when any captured state of the row shows the slider on the capture
  const key = `${section}:${id}`;
  return cap.some((s) => probeReaches(s, key)) ? 'both' : 'keyed';
}

// ------------------------------------------------------------------------------------------
// Now (S4 fills `ReachNow` from the graph's `NOW_PLAYING` every frame the panel is open)
// ------------------------------------------------------------------------------------------

/** What plays now, as this file needs it: the body state (null: none), the capture's share of the body (0..1), the
 *  More > Panel motion-capture switch, a gun drawn (in her hands now: the game's gun group, or a studio loop with one). */
export interface ReachNow {
  state: BodyGroup | null;
  mocapShare: number;
  switchOn: boolean;
  drawn: boolean;
}

/** The capture's share at or over which a hand-made-only row is "Not playing now", at or under which a capture-only one. */
export const REACH_NOW_BANDS = { capture: 0.9, handMade: 0.1 } as const;

/** The live band's hysteresis: leave the 0.9 band only under 0.88, leave the 0.1 band only over 0.12 (the panel's `syncReach`). */
export const REACH_NOW_HYST = 0.02;

function shareOf(now: ReachNow): number {
  return now.switchOn ? now.mocapShare : 0;
}

/**
 * A row's tag now (PLAN 2(a), BRIEF A11): `off` when the row's own state plays by the other way (a hand-made-only row
 * while the capture plays 90 % or more of it, a capture-only row at 10 % or less); every other row keeps its reach (a
 * row of a state not playing: the edit warning says so, not a tag). `rowState` the row's states (`rowStates`).
 */
export function rowNow(reach: Reach, rowState: string | readonly string[], now: ReachNow): ReachShown {
  if (reach === 'none' || reach === 'both' || now.state === null) return reach;
  const mine = typeof rowState === 'string' ? rowState === now.state : rowState.includes(now.state);
  if (!mine) return reach;
  const share = shareOf(now);
  if (reach === 'keyed' && share >= REACH_NOW_BANDS.capture) return 'off';
  if (reach === 'mocap' && share <= REACH_NOW_BANDS.handMade) return 'off';
  return reach;
}

/** `rowNow` of a row by its section, group and id (the panel's one call per row). */
export function rowShown(section: string, group: string, id: string, now: ReachNow): ReachShown {
  return rowNow(rowReach(section, group, id), rowStates(section, group), now);
}

/** (BRIEF A5) The note under a row ('' none): a Body slider the capture's layer scale takes off it, on a captured state. */
export function rowNote(section: string, group: string, id: string): string {
  if (section !== 'body' || !hasCapture(group)) return '';
  const layer = (BODY_LAYER as Readonly<Record<string, keyof MocapLayers | null>>)[id] ?? null;
  return layer !== null && MOCAP_LAYERS[layer] === 0 ? HAND_MADE_ONLY_NOTE : '';
}

/** A part's or tab's line from its rows' reaches ('' when no row has a tag). */
export function reachSummary(rows: readonly Reach[]): string {
  let k = 0;
  let b = 0;
  let m = 0;
  for (const r of rows) {
    if (r === 'keyed') k++;
    else if (r === 'both') b++;
    else if (r === 'mocap') m++;
  }
  const n = k + b + m;
  if (!n) return '';
  const head = 'This part changes: ';
  if (b === n) return `${head}Both`;
  if (k === n) return `${head}Hand-made only`;
  if (m === n) return `${head}Motion capture only`;
  const count = (c: number, what: string): string => `${c} slider${c === 1 ? '' : 's'} ${what}`;
  const rest: string[] = [];
  if (b >= k && b >= m) {
    if (k) rest.push(count(k, 'hand-made only'));
    if (m) rest.push(count(m, 'motion capture only'));
    return `${head}Mostly both; ${rest.join(', ')}`;
  }
  if (k >= m) {
    if (b) rest.push(count(b, 'both'));
    if (m) rest.push(count(m, 'motion capture only'));
    return `${head}Mostly hand-made only; ${rest.join(', ')}`;
  }
  if (b) rest.push(count(b, 'both'));
  if (k) rest.push(count(k, 'hand-made only'));
  return `${head}Mostly motion capture only; ${rest.join(', ')}`;
}

// ------------------------------------------------------------------------------------------
// The edit warning (BRIEF A4, A8; PLAN 2(c))
// ------------------------------------------------------------------------------------------

/** What she is doing in each body state ("she is walking"); its keys are every `BodyGroup` (tsc checks the list). */
const STATE_DOING: Readonly<Record<BodyGroup, string>> = {
  idle: 'standing still',
  walk: 'walking',
  jog: 'jogging',
  run: 'running',
  crouchIdle: 'crouched still',
  sneak: 'sneaking',
  crouchWalk: 'walking crouched',
  lowReady: 'standing with a gun at low ready',
  aim: 'aiming on the move',
  aimCrouch: 'aiming crouched, still',
  wallIdle: 'with her back to a wall',
  wallSlide: 'sliding along a wall',
  wallPeek: 'peeking out from a wall',
  ladder: 'on a ladder',
  pipe: 'on a pipe',
  ledge: 'hanging from a ledge',
  vent: 'in a vent',
  crawl: 'crawling',
  hang: 'hanging',
  hold: 'holding a guard',
  crouchRun: 'running crouched',
  aimStill: 'aiming, standing still',
  aimCrouchMove: 'aiming crouched on the move',
  wallCrouchIdle: 'crouched against a wall',
  wallCrouchSlide: 'sliding crouched along a wall',
  wallCrouchPeek: 'peeking out crouched from a wall',
  carry: 'carrying a body',
};

/** The captured moves by name ("motion capture is playing the walk"). */
const CAPTURE_MOVE: Readonly<Record<string, string>> = { idle: 'turn on the spot', walk: 'walk', jog: 'jog', run: 'run', sneak: 'sneak', aim: 'aimed strafe' };

/** A Stepping / Weight gait or a Speed stance by name ("You are editing Crouch walk"). */
const GAIT_NAME: Readonly<Record<string, string>> = {
  idle: 'Standing still',
  walk: 'Walk',
  jog: 'Jog',
  run: 'Run',
  crouchWalk: 'Crouch walk',
  crouchRun: 'Crouch run',
  crouch: 'Crouched',
  drawn: 'Gun drawn',
  stand: 'Standing',
  aim: 'Aiming',
  wall: 'Wall',
  climb: 'Climbing',
};

/** Where a working setting lives, per family of rows (PLAN 2(c) WORKS_INSTEAD; A8: the legs name both of his fixes). */
export const WORKS_INSTEAD = {
  /** Keys trunk (pelvis, spine, chest, neck, head). */
  trunk: 'Body > Joints: Hips, Spine, Chest, Neck and Head',
  /** Keys arms (shoulders, collarbones, elbows, wrists). */
  arms: 'Body > Joints: the shoulder, elbow and wrist rows, or Hands & feet: hand forward / up / out',
  /** Keys fingers. */
  fingers: 'Weapon > Gun in hand, No weapon: the finger rows',
  /** Keys legs (A8). */
  legs: 'Body > Joints, Left / Right ankle turn (or the thigh and knee rows), or Hands & feet, foot forward / out',
  /** Stepping on the capture. */
  steps: 'Hands & feet, foot forward / up / out',
  /** Body knee lift and foot track: the Joints leg rows do reach the capture. */
  legLift: 'Body > Joints: the thigh and knee rows',
  /** Body arm swing, shoulder twist, lean, elbows out; Weight hip drop: nothing changes them on the capture. */
  none: 'Nothing changes this on motion capture: turn Motion capture off in More > Panel to see it',
} as const;
export type WorksFamily = keyof typeof WORKS_INSTEAD;

/** The family of a Keys row by its field id. */
function keysFamily(id: string): WorksFamily {
  if (id.startsWith('leg')) return 'legs';
  if (id.startsWith('hand')) return 'fingers';
  if (id.startsWith('arm')) return 'arms';
  return 'trunk';
}

/** The row's name in the warning: a gait / stance by its own name, else its first state's. */
function rowName(section: string, group: string, states: readonly BodyGroup[]): string {
  if (section === 'step' || section === 'weight' || section === 'speed') {
    const g = group.slice(group.lastIndexOf('.') + 1);
    const w = GAIT_NAME[g];
    if (w) return w;
  }
  return plainGroupWord('body', 0, states[0]!);
}

/**
 * The one-line warning for an edit of slider `id` that changes nothing on what plays now ('' : the edit shows, or
 * nothing is known). Cases (PLAN 2(c)): the row's state is not playing; a row for her with no gun out while she has a
 * gun drawn; a hand-made-only row while the capture plays its state (naming where the working setting lives,
 * `WORKS_INSTEAD`); a gun row while the capture plays with no gun.
 * The guards' rows and rows tied to no body state get none.
 */
export function editWarning(section: string, group: string, id: string, now: ReachNow): string {
  if (now.state === null || section.startsWith('guard')) return '';
  const reach = rowReach(section, group, id);
  if (reach === 'none') return '';
  const states = rowStates(section, group);
  if (!states.length) return '';
  if (!states.includes(now.state)) {
    const name = rowName(section, group, states);
    return `You are editing ${name}; she is ${STATE_DOING[now.state]}. Pick ${name} in the Anim Studio to see it.`;
  }
  if (now.drawn && rowHolstered(section, group)) return 'Not on screen: this row is for her with no gun out. Holster to see it.';
  if (reach !== 'keyed' || shareOf(now) < REACH_NOW_BANDS.capture) return '';
  const move = CAPTURE_MOVE[now.state] ?? plainGroupWord('body', 0, now.state).toLowerCase();
  const head = `Not on screen: motion capture is playing the ${move}.`;
  if (section === 'keys') return `${head} Keys change the hand-made ${move} only. To change it now: ${WORKS_INSTEAD[keysFamily(id)]}.`;
  if (rowDrawn(section, group)) return `${head} This row is for her with a gun in hand. Draw a gun to see it.`;
  if (section === 'step') return `${head} Motion capture places the steps now. To move her feet on it: ${WORKS_INSTEAD.steps}.`;
  if (id === 'kneeLiftMul' || id === 'trackMul') {
    return `${head} This slider changes the hand-made ${move} only. To change it now: ${WORKS_INSTEAD.legLift}.`;
  }
  return `${head} This slider changes the hand-made ${move} only. ${WORKS_INSTEAD.none}.`;
}
