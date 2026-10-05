/**
 * Movement and camera feel, in one tunable table (live-editable from the debug overlay's tuning
 * panel). Speeds are realistic: walk 1.4, jog 3.5, sprint 5.5, crouch 1.2, ADS 1.0 m/s.
 */
export const MOVEMENT = {
  walkSpeed: 1.4,
  jogSpeed: 3.5,
  sprintSpeed: 5.5,
  crouchSpeed: 1.2,
  adsSpeed: 1.0,
  coverSpeed: 1.3,
  /** Stick magnitude where walking ends and the jog band begins. */
  walkBand: 0.55,
  /** Velocity spring frequencies (rad/s): higher = snappier. Critically damped = ease in and out. */
  accel: 9,
  decel: 11,
  /** Fraction of ground control kept in the air. */
  airControl: 0.08,
  jumpHeight: 0.45,
  rollSpeed: 4.4,
  rollTime: 0.6,
  rollCooldown: 0.9,
  /** After a roll: no fire/ADS for this long. */
  rollRecovery: 0.2,
  /** Sprint ramps in over the wind-up and blocks fire/ADS until the recovery after it ends. */
  sprintWindup: 0.18,
  sprintRecovery: 0.25,
  turnSpeed: 10,
  standHeight: 1.75,
  crouchHeight: 1.15,
  radius: 0.3,
  maxStep: 0.42,
  /** Camera: follow spring (rad/s), shoulder swap and ADS spring frequencies. */
  camFollow: 22,
  camShoulder: 11,
  camAds: 16,
};

export type MovementKey = keyof typeof MOVEMENT;

/** Ranges for the debug tuning panel. */
export const MOVEMENT_RANGES: Partial<Record<MovementKey, [number, number, number]>> = {
  walkSpeed: [0.5, 3, 0.1],
  jogSpeed: [2, 6, 0.1],
  sprintSpeed: [3, 9, 0.1],
  crouchSpeed: [0.5, 3, 0.1],
  adsSpeed: [0.5, 3, 0.1],
  accel: [2, 30, 0.5],
  decel: [2, 30, 0.5],
  airControl: [0, 0.5, 0.01],
  jumpHeight: [0.2, 1.2, 0.05],
  sprintWindup: [0, 0.6, 0.02],
  sprintRecovery: [0, 0.6, 0.02],
  turnSpeed: [3, 25, 0.5],
  camFollow: [4, 60, 1],
  camShoulder: [3, 30, 0.5],
  camAds: [4, 40, 0.5],
};
