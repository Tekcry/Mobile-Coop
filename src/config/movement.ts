/**
 * Tactical (SWAT-style) movement and camera feel, in one tunable table (live-editable from the debug
 * overlay's Tune panel). Normal movement is slow, weapon-led and precise; the only fast movement is the
 * committed bounding dash.
 */
export const MOVEMENT = {
  /** Analog speed range (m/s): light stick creeps, full stick is a tactical walk; holding full stick
   *  for `briskDelay` s eases up to the brisk tactical move. */
  creepSpeed: 0.6,
  walkSpeed: 1.2,
  briskSpeed: 2.0,
  briskDelay: 0.6,
  adsSpeed: 1.0,
  crouchSpeed: 0.9,
  coverSpeed: 1.0,
  /** Moving while reloading drops to creep speed. */
  reloadSpeed: 0.6,
  /** Direction penalties relative to the aim (body faces the aim; legs sidestep/backstep). */
  strafeMult: 0.9,
  backMult: 0.7,
  /** Stick magnitude where creep ends and walk begins. */
  creepBand: 0.5,
  /** Velocity spring frequencies (rad/s): critically damped = eased starts and stops, no overshoot. */
  accel: 8,
  decel: 10,
  /** Body turn rates (rad/s) by stance; the head and weapon lead, the torso follows. */
  turnStand: 6,
  turnMoving: 4.5,
  turnAim: 3,
  turnDash: 1.6,
  /** Reversals larger than this (rad) at more than walk speed play a controlled pivot. */
  pivotAngle: 2.1,
  pivotTime: 0.5,
  /** Camera look-rate caps (rad/s): the view never turns faster than the body can follow. */
  lookStand: 7,
  lookAim: 3.6,
  lookDash: 2.2,
  /** Bounding dash: wind-up, committed rush, braking recovery; stamina-limited. */
  dashSpeed: 5.5,
  dashWindup: 0.15,
  dashMax: 1.5,
  dashRecovery: 0.3,
  /** Stamina (0..1): one full dash costs `dashCost`; regenerates per second; empty = cooldown. */
  dashCost: 0.45,
  staminaRegen: 0.22,
  staminaCooldown: 1.6,
  /** Stance transition times (s). */
  crouchTime: 0.3,
  kneelTime: 0.4,
  /** Fraction of ground control kept in the air (drops/vault exits only; there is no free jump). */
  airControl: 0.05,
  standHeight: 1.75,
  crouchHeight: 1.15,
  radius: 0.3,
  maxStep: 0.42,
  /** Camera spring frequencies (rad/s). */
  camFollow: 24,
  camShoulder: 11,
  camAds: 14,
};

export type MovementKey = keyof typeof MOVEMENT;

/** Ranges for the debug tuning panel. */
export const MOVEMENT_RANGES: Partial<Record<MovementKey, [number, number, number]>> = {
  creepSpeed: [0.2, 1.5, 0.05],
  walkSpeed: [0.6, 2.5, 0.05],
  briskSpeed: [1.2, 3.5, 0.05],
  adsSpeed: [0.4, 2, 0.05],
  crouchSpeed: [0.3, 2, 0.05],
  coverSpeed: [0.4, 2, 0.05],
  strafeMult: [0.5, 1, 0.01],
  backMult: [0.4, 1, 0.01],
  accel: [2, 30, 0.5],
  decel: [2, 30, 0.5],
  turnStand: [1, 15, 0.25],
  turnMoving: [1, 12, 0.25],
  turnAim: [0.5, 8, 0.25],
  lookStand: [2, 15, 0.25],
  lookAim: [1, 10, 0.25],
  dashSpeed: [3, 8, 0.1],
  dashMax: [0.5, 3, 0.1],
  dashCost: [0.1, 1, 0.05],
  staminaRegen: [0.05, 1, 0.01],
  camFollow: [4, 60, 1],
  camShoulder: [3, 30, 0.5],
  camAds: [4, 40, 0.5],
};
