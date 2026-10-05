/**
 * Tactical (SWAT-style) movement and camera feel, in one tunable table (live-editable from the debug
 * overlay's Tune panel). Normal movement is slow, weapon-led and precise; the only fast movement is the
 * committed bounding dash.
 */
export const MOVEMENT = {
  /** Analog speed range (m/s): light stick creeps, full stick is a tactical walk; holding full stick
   *  forward for `briskDelay` s eases up to the brisk move. */
  creepSpeed: 0.45,
  walkSpeed: 0.9,
  briskSpeed: 1.4,
  briskDelay: 0.8,
  adsSpeed: 0.7,
  crouchSpeed: 0.55,
  coverSpeed: 0.5,
  /** Moving while reloading drops to creep speed. */
  reloadSpeed: 0.45,
  /** Direction penalties relative to the aim (body faces the aim; legs sidestep/backstep). */
  strafeMult: 0.9,
  backMult: 0.7,
  /** Stick magnitude where creep ends and walk begins. */
  creepBand: 0.5,
  /** Root motion limits: acceleration, braking (m/s^2) and jerk (m/s^3). Nothing changes instantly. */
  accelMax: 1.5,
  decelMax: 2.0,
  jerkMax: 9,
  /** Velocity error gain (1/s) feeding the jerk-limited acceleration. */
  velGain: 6,
  /** Weight shift onto the support foot before the first step from standstill (s). */
  startShift: 0.3,
  /** Step length (m) = stepLen0 + stepLenK * speed; a gait cycle is two steps. */
  stepLen0: 0.27,
  stepLenK: 0.22,
  /** Speed dip at each heel strike (fraction), mean 1 over the stride: the root follows the steps. */
  rootDip: 0.05,
  /** Body turn rates (rad/s): moving, aiming (110 deg/s), dashing; angular acceleration (rad/s^2). */
  turnMoving: 2.4,
  turnAim: (110 * Math.PI) / 180,
  turnDash: 1.2,
  turnAccel: 12,
  /** Turning on the spot is stepped: chunks of up to `turnChunk` rad over `turnChunkTime` s each,
   *  started when the aim leads the feet by more than `turnThreshold` rad. */
  turnChunk: 0.785,
  turnChunkTime: 0.3,
  turnThreshold: 0.45,
  /** Reversing the move direction at speed: planted pivot (s). */
  pivotTime: 0.6,
  /** Upper body twist limit (rad): the view may lead the feet by this much at most. */
  twistMax: 1.3,
  /** Camera look-rate caps (rad/s). */
  lookStand: 5,
  lookAim: 2.8,
  lookDash: 1.6,
  /** Bounding dash: wind-up, committed rush, braking recovery; stamina-limited. */
  dashSpeed: 3.8,
  dashWindup: 0.3,
  dashMax: 1.5,
  dashRecovery: 0.45,
  dashAccel: 4.5,
  /** Stamina (0..1): one full dash costs `dashCost`; regenerates per second; empty = cooldown. */
  dashCost: 0.45,
  staminaRegen: 0.18,
  staminaCooldown: 1.8,
  /** Stance transition times (s): stand -> crouch, crouch -> kneel, kneel/crouch -> stand. */
  crouchTime: 0.45,
  kneelTime: 0.5,
  standTime: 0.6,
  /** Fraction of ground control kept in the air (drops/vault exits only; there is no free jump). */
  airControl: 0.05,
  standHeight: 1.75,
  crouchHeight: 1.15,
  radius: 0.3,
  maxStep: 0.42,
  /** Camera spring frequencies (rad/s). */
  camFollow: 18,
  camShoulder: 10,
  camAds: 11,
};

export type MovementKey = keyof typeof MOVEMENT;

/** Ranges for the debug tuning panel. */
export const MOVEMENT_RANGES: Partial<Record<MovementKey, [number, number, number]>> = {
  creepSpeed: [0.2, 1.2, 0.05],
  walkSpeed: [0.5, 2, 0.05],
  briskSpeed: [0.8, 3, 0.05],
  adsSpeed: [0.3, 1.5, 0.05],
  crouchSpeed: [0.2, 1.5, 0.05],
  coverSpeed: [0.2, 1.5, 0.05],
  strafeMult: [0.5, 1, 0.01],
  backMult: [0.4, 1, 0.01],
  accelMax: [0.5, 6, 0.1],
  decelMax: [0.5, 8, 0.1],
  jerkMax: [1, 30, 0.5],
  velGain: [1, 10, 0.1],
  startShift: [0, 0.6, 0.01],
  rootDip: [0, 0.15, 0.005],
  turnMoving: [0.5, 6, 0.1],
  turnAim: [0.5, 4, 0.05],
  turnChunkTime: [0.15, 0.6, 0.01],
  lookStand: [1, 10, 0.25],
  lookAim: [0.5, 6, 0.1],
  dashSpeed: [2, 6, 0.1],
  dashMax: [0.5, 3, 0.1],
  dashCost: [0.1, 1, 0.05],
  crouchTime: [0.15, 1, 0.01],
  standTime: [0.15, 1.2, 0.01],
  camFollow: [4, 40, 1],
  camShoulder: [3, 30, 0.5],
  camAds: [4, 30, 0.5],
};
