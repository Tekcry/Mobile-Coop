/**
 * Locomotion and stance clips (authored in code). Cycles are keyed over the gait phase: left heel
 * strike at 0, right at 0.5. Values are root-space metres at 1.75 m and radians.
 *
 * The stealth operative: a compact, low, balanced carriage. Standing: a soft-kneed walk, a forward-
 * leaning jog and a full sprint. Crouched: a deep heel-to-toe sneak, a crouch walk and a low, driving
 * crouch run. The pelvis dips on each loading response and rises mid-stance, hips shift over the
 * support foot and turn with each step while the chest counter-rotates so the weapon stays square.
 */
import { makeClip, mirrorClip, type Clip } from '../clip';

/**
 * Movie-style exaggeration of every gait cycle (a stealth action film, not a documentary): the loading dip
 * (weight landing), the hip sway and the hip / chest twist are played this much bigger than life.
 */
export const GAIT_STYLE = { bob: 1.8, rise: 1.1, sway: 1.5, twist: 1.5 };
// (the jog and sprint keep a smaller dip: at speed a deeper one would let the planted foot slip)
/** Two-step periodic shape: value at heel strike, loading dip, mid-stance, per side. */
const bob = (base: number, dip: number, rise: number, k = GAIT_STYLE.bob): number[] => {
  const d = dip * k;
  // the rise stays near life size: a higher pelvis would overstretch the planted leg at speed
  const r = rise * GAIT_STYLE.rise;
  return [0, base, 0.08, base - d, 0.25, base + r, 0.5, base, 0.58, base - d, 0.75, base + r];
};
/** One-cycle sway (left support 0..0.5 -> negative). */
const sway = (amp: number): number[] => [0, 0, 0.25, -amp * GAIT_STYLE.sway, 0.5, 0, 0.75, amp * GAIT_STYLE.sway];
/** Hip twist: left hip forward at left heel strike. */
const twist = (amp: number): number[] => [0, amp * GAIT_STYLE.twist, 0.25, 0, 0.5, -amp * GAIT_STYLE.twist, 0.75, 0];

export const IDLE = makeClip({
  name: 'idle',
  duration: 4.8,
  loop: true,
  keys: {
    pelY: [0, -0.035, 1.2, -0.031, 2.4, -0.035, 3.6, -0.031],
    // slow weight shifts between the feet
    pelX: [0, 0.006, 2.4, -0.006],
    pelPitch: [0, 0.07, 2.4, 0.075],
    spPitch: [0, 0, 1.2, -0.012, 2.4, 0, 3.6, -0.012],
    hdYaw: [0, 0, 1.6, 0.03, 3.2, -0.025],
  },
});

export const CROUCH_IDLE = makeClip({
  name: 'crouchIdle',
  duration: 4.2,
  loop: true,
  keys: {
    pelY: [0, -0.36, 1.05, -0.355, 2.1, -0.36, 3.15, -0.355],
    pelPitch: [0, 0.28, 2.1, 0.29],
    pelX: [0, 0.004, 2.1, -0.004],
    spPitch: [0, 0, 1.05, -0.01, 2.1, 0, 3.15, -0.01],
    width: [0, 1.35],
  },
});

export const CREEP = makeClip({
  name: 'creep',
  cycle: true,
  duty: 0.7,
  liftH: 0.045,
  keys: {
    pelY: bob(-0.06, 0.008, 0.004),
    pelX: sway(0.02),
    pelRoll: sway(0.02),
    pelYaw: twist(0.04),
    spYaw: twist(-0.035),
    pelPitch: [0, 0.13, 0.5, 0.13],
    width: [0, 1.1],
  },
});

export const WALK = makeClip({
  name: 'walk',
  cycle: true,
  duty: 0.63,
  liftH: 0.065,
  keys: {
    pelY: bob(-0.045, 0.012, 0.006),
    pelX: sway(0.022),
    pelRoll: sway(0.03),
    pelYaw: twist(0.06),
    spYaw: twist(-0.05),
    pelPitch: [0, 0.1, 0.08, 0.11, 0.25, 0.095, 0.5, 0.1, 0.58, 0.11, 0.75, 0.095],
    hdPitch: bob(0, -0.01, -0.005),
  },
});

export const BRISK = makeClip({
  name: 'brisk',
  cycle: true,
  duty: 0.58,
  liftH: 0.08,
  keys: {
    pelY: bob(-0.05, 0.016, 0.008),
    pelX: sway(0.018),
    pelRoll: sway(0.035),
    pelYaw: twist(0.08),
    spYaw: twist(-0.07),
    pelPitch: [0, 0.14, 0.08, 0.155, 0.25, 0.13, 0.5, 0.14, 0.58, 0.155, 0.75, 0.13],
    hdPitch: bob(0, -0.014, -0.006),
  },
});

/** Forward-leaning jog: compact arms, the head steady, a longer flight phase. */
export const JOG = makeClip({
  name: 'jog',
  cycle: true,
  duty: 0.48,
  liftH: 0.12,
  keys: {
    pelY: bob(-0.07, 0.025, 0.012, 1.25),
    pelX: sway(0.014),
    pelRoll: sway(0.035),
    pelYaw: twist(0.1),
    spYaw: twist(-0.09),
    pelPitch: [0, 0.2, 0.08, 0.22, 0.25, 0.19, 0.5, 0.2, 0.58, 0.22, 0.75, 0.19],
    hdPitch: bob(-0.05, -0.015, -0.008),
  },
});

export const DASH = makeClip({
  name: 'dash',
  cycle: true,
  duty: 0.42,
  liftH: 0.16,
  keys: {
    pelY: bob(-0.13, 0.03, 0.02, 1),
    pelX: sway(0.012),
    pelRoll: sway(0.03),
    pelYaw: twist(0.12),
    spYaw: twist(-0.1),
    pelPitch: [0, 0.34, 0.1, 0.36, 0.25, 0.32, 0.5, 0.34, 0.6, 0.36, 0.75, 0.32],
    hdPitch: bob(-0.1, -0.02, -0.01),
  },
});

export const WALK_BACK = makeClip({
  name: 'walkBack',
  cycle: true,
  duty: 0.66,
  liftH: 0.05,
  keys: {
    pelY: bob(-0.05, 0.01, 0.004),
    pelX: sway(0.02),
    pelRoll: sway(0.025),
    pelYaw: twist(-0.04),
    spYaw: twist(0.035),
    pelPitch: [0, 0.05, 0.5, 0.05],
  },
});

/** Sidestep to the right: lead (right) foot steps out, trail foot closes; feet never cross. */
export const WALK_STRAFE_R = makeClip({
  name: 'strafeR',
  cycle: true,
  duty: 0.64,
  liftH: 0.05,
  keys: {
    pelY: bob(-0.05, 0.01, 0.005),
    pelX: sway(0.016),
    pelRoll: sway(0.035),
    pelYaw: [0, 0.02, 0.5, -0.02],
    pelPitch: [0, 0.08, 0.5, 0.08],
    width: [0, 1.05],
  },
});
export const WALK_STRAFE_L = mirrorClip(WALK_STRAFE_R, 'strafeL');

export const CROUCH_WALK = makeClip({
  name: 'crouchWalk',
  cycle: true,
  duty: 0.68,
  liftH: 0.045,
  keys: {
    pelY: bob(-0.36, 0.012, 0.004),
    pelX: sway(0.02),
    pelRoll: sway(0.025),
    pelYaw: twist(0.05),
    spYaw: twist(-0.045),
    pelPitch: [0, 0.3, 0.5, 0.3],
    width: [0, 1.35],
  },
});

export const CROUCH_BACK = makeClip({
  name: 'crouchBack',
  cycle: true,
  duty: 0.7,
  liftH: 0.04,
  keys: {
    pelY: bob(-0.37, 0.01, 0.003),
    pelX: sway(0.018),
    pelPitch: [0, 0.24, 0.5, 0.24],
    width: [0, 1.35],
  },
});

export const CROUCH_STRAFE_R = makeClip({
  name: 'crouchStrafeR',
  cycle: true,
  duty: 0.7,
  liftH: 0.04,
  keys: {
    pelY: bob(-0.37, 0.01, 0.004),
    pelX: sway(0.014),
    pelRoll: sway(0.03),
    pelPitch: [0, 0.27, 0.5, 0.27],
    width: [0, 1.4],
  },
});
export const CROUCH_STRAFE_L = mirrorClip(CROUCH_STRAFE_R, 'crouchStrafeL');

/** Crouched sneak: deep and slow, heel-to-toe, the body barely rising between steps. */
export const SNEAK = makeClip({
  name: 'sneak',
  cycle: true,
  duty: 0.74,
  liftH: 0.04,
  keys: {
    pelY: bob(-0.4, 0.008, 0.003),
    pelX: sway(0.022),
    pelRoll: sway(0.02),
    pelYaw: twist(0.035),
    spYaw: twist(-0.03),
    pelPitch: [0, 0.33, 0.5, 0.33],
    hdPitch: [0, -0.06, 0.5, -0.06],
    width: [0, 1.3],
  },
});

/** Crouch run: low and driving, forward lean, quick steps, the weapon held in tight. */
export const CROUCH_RUN = makeClip({
  name: 'crouchRun',
  cycle: true,
  duty: 0.52,
  liftH: 0.085,
  keys: {
    pelY: bob(-0.32, 0.02, 0.01),
    pelX: sway(0.014),
    pelRoll: sway(0.03),
    pelYaw: twist(0.08),
    spYaw: twist(-0.07),
    pelPitch: [0, 0.44, 0.1, 0.46, 0.25, 0.42, 0.5, 0.44, 0.6, 0.46, 0.75, 0.42],
    hdPitch: [0, -0.18, 0.5, -0.18],
    width: [0, 1.2],
  },
});

/** One-knee kneel: left foot planted forward, right knee down (heel up, toes tucked). */
export const KNEEL = makeClip({
  name: 'kneel',
  duration: 3.6,
  loop: true,
  keys: {
    pelY: [0, -0.43, 1.8, -0.425],
    pelPitch: [0, 0.1, 1.8, 0.11],
    pelX: [0, 0.03],
    fLX: [0, 0.02],
    fLZ: [0, 0.3],
    fRX: [0, -0.02],
    fRZ: [0, -0.36],
    fRY: [0, 0.07],
    fRPitch: [0, 1.2],
    spPitch: [0, 0, 0.9, -0.01, 1.8, 0, 2.7, -0.01],
    width: [0, 0.95],
  },
});

/** Speed nodes of the standing forward blend (m/s): walk, jog, sprint. */
export const FORWARD_NODES: readonly { speed: number; clip: Clip }[] = [
  { speed: 0, clip: CREEP },
  { speed: 0.7, clip: CREEP },
  { speed: 1.4, clip: WALK },
  { speed: 2.8, clip: JOG },
  { speed: 5.0, clip: DASH },
];

/** Speed nodes of the crouched forward blend (m/s): sneak, crouch walk, crouch run. */
export const CROUCH_NODES: readonly { speed: number; clip: Clip }[] = [
  { speed: 0, clip: SNEAK },
  { speed: 0.8, clip: SNEAK },
  { speed: 1.8, clip: CROUCH_WALK },
  { speed: 2.6, clip: CROUCH_RUN },
];
