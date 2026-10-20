/**
 * Animation audit limits (bible 5.12.2 realism standard, 5.17 D2 no-bobble and D5 modern layer).
 * engine-free (no renderer imports): the anim-audit harness (`scripts/anim-audit.mjs`) bundles this for node.
 * Line numbers are `docs/design-bible.md`. Step 32 moves the final values to `src/config/animLimits.ts`.
 * Lengths in metres, angles in degrees, times in seconds.
 */
import { GEARS } from '../../config/movement';

/** :794 - no joint rotates more than 25 deg between two 60 Hz frames (scaled by the frame time); hit / impact exempt. */
export const JOINT_DEG_PER_60HZ_FRAME = 25;
/** :794 - the same as a rate (deg/s): 25 deg at 60 Hz, 12.5 deg at 120 Hz. */
export const JOINT_DEG_PER_S = JOINT_DEG_PER_60HZ_FRAME * 60;

/** :795 - pelvis moves no more than speed x dt + 2 cm per frame. */
export const PELVIS_JUMP_SLACK = 0.02;
/** :795 - per-frame pelvis jump limit at gear cap `speed` (m/s) and render rate `hz`. */
export function pelvisJumpLimit(speed: number, hz: number): number {
  return speed / hz + PELVIS_JUMP_SLACK;
}
/** :795 with movement.ts gear caps: pelvis jump limits per gear 1..6 (index 0 = gear 1). */
export function pelvisJumpByGear(stance: 'stand' | 'crouch', hz: number): number[] {
  return GEARS[stance].map((v) => pelvisJumpLimit(v, hz));
}

/** :796 - no teleports outside spawn, respawn and checkpoint load (a frame-to-frame root move above this counts). */
export const TELEPORT_DIST = 0.5;
export const TELEPORTS_MAX = 0;
/** :797 - every transition blends through the Inertializer in 0.1-0.25 s. */
export const BLEND_MIN = 0.1;
export const BLEND_MAX = 0.25;

/** :801 - planted foot: slide < 1 cm, float <= 2 cm, sink <= 1 cm. */
export const FOOT_SLIDE = 0.01;
export const FOOT_FLOAT = 0.02;
export const FOOT_SINK = 0.01;
/** Float / sink comparison tolerance (float32 recording): an exactly-2 cm float passes ("never more than 2 cm"). */
export const FOOT_TOL = 1e-4;
/** :802 - hands: contact < 1 cm, weapon grip <= 2 cm (absolute wrist-to-grip-target distance). */
export const HAND_CONTACT = 0.01;
export const HAND_GRIP = 0.02;
/** :802 - the grip check runs on frames whose grip IK weight is above this (characterRig solveArm: hand on the gun). */
export const GRIP_IK_ON = 0.5;
/** :802 - wrist-behind-palm offsets in weapon space (characterRig WRIST_TRIGGER / WRIST_SUPPORT, e2e-weapons-carry): x is mirrored by hand side. */
export const WRIST_ON_GRIP = [0.01, -0.015, -0.065] as const;
export const WRIST_ON_FOREGRIP = [0.015, -0.055, -0.035] as const;

/** :806-808 - clipping: body <= 3 cm, weapon <= 2 cm, self <= 2 cm, character vs character <= 3 cm. */
export const CLIP_BODY = 0.03;
export const CLIP_WEAPON = 0.02;
export const CLIP_SELF = 0.02;
export const CLIP_CHARACTER = 0.03;
/**
 * :807 - capsule radii used for self-intersection, metres (audit estimates). torso = hips -> neck, its half depth
 * (the chest is deeper than the torso is wide at the flank); weapon = the held weapon's grip -> muzzle segment.
 */
export const LIMB_RADIUS = { thigh: 0.075, shank: 0.05, upperArm: 0.045, forearm: 0.04, torso: 0.11, weapon: 0.02 } as const;
/** :807 - the upper arm vs torso test starts this fraction down the arm (the shoulder joint itself sits in the torso capsule). */
export const ARM_TORSO_SKIP = 0.35;

/** :812-815 - range of motion. */
export const ROM = {
  /** knee / elbow flexion 0-150 deg */
  flexMax: 150,
  /** hyperextension <= 5 deg */
  hyperMax: 5,
  /** wrist flex-extension 70, side (radial / ulnar) 25 */
  wristFlex: 70,
  wristSide: 25,
  /** neck twist 80, spine twist 60 */
  neckTwist: 80,
  spineTwist: 60,
} as const;

/** :818 - foot sole: fraction of the foot length behind the ankle (characterRig boot: centred 0.28 x len ahead of the ankle). */
export const FOOT_BACK = 0.22;
/** :818 - centre of mass over the support polygon + 10 cm (starts, stops, jumps, rolls, falls, pushes exempt). */
export const BALANCE_MARGIN = 0.1;
/**
 * :818 - segment mass fractions (Winter 2009, Table 4.1) and the segment COM as a fraction from the proximal joint.
 * Trunk = hips -> neck; head at the head node; hand / foot at the wrist / ankle.
 */
export const SEGMENT_MASS = {
  headNeck: 0.081,
  trunk: 0.497,
  upperArm: 0.028,
  forearm: 0.016,
  hand: 0.006,
  thigh: 0.1,
  shank: 0.0465,
  foot: 0.0145,
} as const;
export const SEGMENT_COM = { trunk: 0.5, upperArm: 0.436, forearm: 0.43, thigh: 0.433, shank: 0.433 } as const;

/** :824-834 - minimum action durations (s). */
export const MIN_DURATION = {
  crouch: 0.25,
  stand: 0.3,
  turn180: 0.25,
  mantle: 0.6,
  vault: 0.5,
  rung: 0.3,
  raise: 0.2,
  swap: 0.6,
  grab: 0.5,
  lift: 1.0,
  takedown: 1.0,
} as const;

/** :824-825 - stance change done: crouchBlend within this of its target. */
export const STANCE_DONE_TOL = 1e-4;
/**
 * :830 - weapon raise done: carry raise >= 0.95 (the raise eases in exponentially toward 1; the last 5% is the
 * settle, not the raise, and 1.0 itself is reached only asymptotically).
 */
export const RAISE_DONE = 0.95;

/** :854 - frame-rate parity (e2e-anim.mjs:491-493): root 2 cm, yaw 0.02 rad, feet 4 cm, camera 3 cm horizontal / 2 cm vertical. */
export const PARITY = { root: 0.02, yaw: 0.02, feet: 0.04, camH: 0.03, camV: 0.02 } as const;

/** :1253 - D2 pelvis peak-to-peak per stride; exactly one low and one high per step (2 mm hysteresis). */
export const PELVIS_P2P = { crouch: 0.025, walk: 0.04, run: 0.06, sprint: 0.08 } as const;
export const PELVIS_HYST = 0.002;
export type GaitBand = keyof typeof PELVIS_P2P;
/** D2 gear mapping (A7, ASSUMED - for review): stand 1-3 walk, 4-5 run, 6 sprint; crouch 1-6 crouch. */
export function gaitBand(stance: 'stand' | 'crouch', gear: number): GaitBand {
  if (stance === 'crouch') return 'crouch';
  return gear <= 3 ? 'walk' : gear <= 5 ? 'run' : 'sprint';
}
/** :1254 - head travel <= pelvis p2p; head pitch / roll p2p <= 2 deg. */
export const HEAD_ANGLE_P2P = 2;
/** :1255 - walk (stand gears 1-3) lateral pelvis sway <= 3 cm. */
export const WALK_SWAY = 0.03;
/** :1256 - camera vertical oscillation p2p <= 0.5 cm steady; landing: one dip, rebound <= 2 mm. */
export const CAMERA_P2P = 0.005;
export const LANDING_REBOUND = 0.002;
export const LANDING_DIPS = 1;
/** :1257 - weapon + kit sway settles <= 0.2 s, no second excursion > 2 mm; idle breathing <= 1 cm. */
export const SETTLE_TIME = 0.2;
export const SETTLE_EPS = 0.002;
/** Weapon rebound window: a rise > SETTLE_EPS within this time after a decline is a rebound (breathing rises slower). */
export const SETTLE_REBOUND_S = 0.25;
/** :1257 - breathing filter for the second-excursion check: moving average over this (s), subtracted. */
export const BREATH_FILTER_S = 1.0;
export const IDLE_BREATH = 0.01;
/**
 * (locomotion step 21, D5.6 / M14) Holstered arms: elbow flexion stays in these bands (deg) over the steady gait. M14
 * replaced A42's ready hands in front (60-90 deg, first cut of this gate) with arms relaxed at the sides: a slight bend
 * standing, walking and jogging (~10-25), softly bent crouched (never straight: PC1 measured 5.1), pumping at the sprint
 * (A76). The forearms also stay clear of the thighs (CLIP_SELF, LIMB_RADIUS forearm + thigh).
 */
export const READY_ELBOW = { stand: { min: 8, max: 30 }, crouch: { min: 15, max: 50 }, sprint: { min: 55, max: 95 } } as const;
export function readyElbowBand(stance: string, gear: number): { min: number; max: number } {
  return stance === 'crouch' ? READY_ELBOW.crouch : gear >= 6 ? READY_ELBOW.sprint : READY_ELBOW.stand;
}
/** (locomotion step 11) Back to a wall: the back and shoulder blades within this of the face, and no deeper behind it (m). */
export const WALL_GAP = 0.03;
/** (locomotion step 13) Door peek: the palm of the hand away from the hinge within this of the handle (m), and no body
 *  joint deeper than this past the cracked leaf's face (m). */
export const DOOR_HAND = 0.02;
export const DOOR_CLIP = 0;

/** :1271 - D5 root overshoot 0: speed <= target x 1.01, no backward step after a stop (1 mm). */
export const OVERSHOOT_RATIO = 1.01;
export const BACKSTEP = 0.001;
/** :1273 - D5 foot slide vs capsule < 1 cm (as :801). :1275 head level (as D2 head). :1279 stairs: no pelvis step over the continuity limit. */
export const D5_FOOT_SLIDE = FOOT_SLIDE;
/** movement.ts gear caps (m/s), for the harness: target speeds and the :795 pelvis limits. */
export const GEAR_CAPS = { stand: GEARS.stand, crouch: GEARS.crouch } as const;

/**
 * (anim-metrics, anim-rework BRIEF 5 "no crabbing") Human ranges for the legs and arms at every speed and stance, measured
 * in the pelvis frame (the horizontal axis from the left hip joint to the right one; `metrics.ts` crab metrics):
 * - kneeSep: the knees' lateral distance over the hip joints' (ratio). Knees about hip width or narrower, over the feet:
 *   at most 1.1 standing; a crouch opens them a little (1.25), never a duck-waddle. Under 0.5 they knock.
 * - trackHalf: a planted foot's centre (ankle) from the line under the hips (m). Normal walking step width is about
 *   5-13 cm between the heel centres (mean 8-10), so each foot 2.5-6.5 cm off the line: 7 cm standing allows the widest
 *   normal step; a run lands closer to the line, a crouch walk a little wider (8 cm).
 * - kneeBow: a knee outside its own ankle (m): knees track over the toes, at most 3 cm out.
 * - slide: a planted foot's travel over the ground while planted (m; FOOT_SLIDE, < 1 cm).
 * - elbowWing: an elbow outside its own shoulder joint (m): elbows down and close to the ribs, at most 6 cm out.
 * (anim-metrics-2, 2026-10-20: tightened from the first cut 0.6-1.3 / 9 cm / 5 cm / 8 cm after Michael saw a wide stance
 * in the walk; docs/anim-rework/METRICS.md.)
 * Report-only until each gait's slice lands (CT Core's anim-rework slices 2-4): `CRAB_GATES[gait]` turns that gait's
 * hard asserts on in e2e-anim.
 */
export const CRAB = {
  kneeSep: { min: 0.5, max: 1.1 },
  trackHalf: 0.07,
  kneeBow: 0.03,
  slide: FOOT_SLIDE,
  elbowWing: 0.06,
} as const;
/** Crouched (crouch walk, sneak, the crouched idle): the knees and the track may open a little. */
export const CRAB_CROUCH = { ...CRAB, kneeSep: { min: 0.5, max: 1.25 }, trackHalf: 0.08 } as const;
export type CrabRanges = typeof CRAB | typeof CRAB_CROUCH;
export function crabRanges(crouched: boolean): CrabRanges {
  return crouched ? CRAB_CROUCH : CRAB;
}
export type CrabGait = 'walk' | 'jog' | 'run' | 'crouch' | 'sneak';
// (anim-rework S2) walk, jog and run on: the standing holstered keyed set (S2-REPORT.md)
export const CRAB_GATES: Record<CrabGait, boolean> = { walk: true, jog: true, run: true, crouch: false, sneak: false };

/**
 * (anim-rework S2) A standstill (the idle) reads against the brief's stance, feet about hip width (BRIEF 3): Wren's hip
 * joints are ~17 cm apart, so a foot's centre up to `trackHalf` 10.5 cm from the line under the hips (the hip joint plus
 * a little splay; the walk's 7 cm is a step width, not a stance). The other ranges are the standing ones. A start
 * leaves from that stance and a stop settles into it, so their track reads against it too (`CRAB_IDLE_TRACK`).
 */
export const CRAB_IDLE = { ...CRAB, trackHalf: 0.105 } as const;
/** (anim-rework S2) The standing holstered sub-states e2e-anim samples at speeds 1-3 (CRAB_STATES). */
export type CrabState = 'idle' | 'start' | 'straight' | 'stop' | 'turn' | 'change90' | 'change180';
/** (anim-rework S2) Which sub-states assert on every e2e-anim run (switched on as each passes). */
// (anim-rework S2) the 90 / 180 deg direction changes stay report-only: at 1.4-2.1 m/s the knees still open to 1.4 x and
// a knee reads 5-13 cm outside its ankle for a few frames (S2-REPORT.md, open items)
export const CRAB_STATE_GATES: Record<CrabState, boolean> = { idle: true, start: true, straight: true, stop: true, turn: true, change90: false, change180: false };
/** (anim-rework S2) The sub-states whose track reads against the idle stance (CRAB_IDLE): a start leaves it, a stop settles into it. */
export const CRAB_IDLE_TRACK: readonly CrabState[] = ['idle', 'start', 'stop'];
/**
 * (anim-rework S2) The metrics each gated sub-state asserts. A turn (round from a standstill, a 90 or 180 deg change)
 * leaves the planted-foot track report-only: the pelvis frame turns under a planted foot, so the track there reads the
 * turn itself (METRICS.md); its slide, knees and elbows do not depend on it and assert.
 */
export const CRAB_STATE_CHECKS: Record<CrabState, readonly string[]> = {
  idle: ['knees', 'track', 'knee-out', 'slide', 'elbows'],
  start: ['knees', 'track', 'knee-out', 'slide', 'elbows'],
  straight: ['knees', 'track', 'knee-out', 'slide', 'elbows'],
  stop: ['knees', 'track', 'knee-out', 'slide', 'elbows'],
  turn: ['knees', 'knee-out', 'slide', 'elbows'],
  change90: ['knees', 'knee-out', 'slide', 'elbows'],
  change180: ['knees', 'knee-out', 'slide', 'elbows'],
};
