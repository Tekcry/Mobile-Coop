/**
 * Stealth-operative movement and camera feel (Blacklist-style), in one tunable table (live-editable from
 * the debug overlay's Tune panel). Input acts at once; the weight comes from the animation (momentum,
 * lean, foot plants), never from input lag. Crouched and standing are both full movement stances.
 */
export const MOVEMENT = {
  /** Crouched (analog on stick magnitude, m/s): sneak -> crouch walk -> crouch run. */
  sneakSpeed: 0.8,
  crouchWalkSpeed: 1.8,
  crouchRunSpeed: 2.6,
  /** Standing: walk -> jog; sprint (button) stands you up and is loud. */
  walkSpeed: 1.4,
  jogSpeed: 2.8,
  sprintSpeed: 5.0,
  /** Aiming (strafe-locked to the aim). */
  adsSpeed: 1.4,
  adsCrouchSpeed: 1.0,
  /** Shuffling along cover (standing / crouched). */
  coverSpeed: 1.2,
  coverCrouchSpeed: 0.9,
  /** Cover-to-cover run (low, fast). */
  coverRunSpeed: 3.6,
  /** Moving while reloading / swapping. */
  reloadMult: 0.75,
  /** Stick bands: crouched sneak ends / crouch walk ends; standing walk ends. */
  sneakBand: 0.4,
  crouchWalkBand: 0.85,
  walkBand: 0.5,
  /** Strafe / backstep penalties (only while aiming: otherwise the body faces where it goes). */
  strafeMult: 0.9,
  backMult: 0.75,
  /** Root motion limits: acceleration, braking (m/s^2), jerk (m/s^3). Snappy, never instant. */
  accelMax: 11,
  decelMax: 12,
  jerkMax: 120,
  sprintAccel: 13,
  /** Velocity error gain (1/s) feeding the jerk-limited acceleration; braking uses `brakeGain`. */
  velGain: 12,
  brakeGain: 30,
  /** Weight shift before the first step (s): none - it overlaps the motion in the animation. */
  startShift: 0,
  /** Step length (m) = stepLen0 + stepLenK * speed; a gait cycle is two steps. */
  stepLen0: 0.3,
  stepLenK: 0.2,
  /** Speed dip at each heel strike (fraction), mean 1 over the stride: each step lands and pushes off. */
  rootDip: 0.08,
  /** Facing the travel direction (not aiming): turn rate at sneak pace and at sprint (rad/s). */
  turnTravelSlow: (540 * Math.PI) / 180,
  turnTravelFast: (300 * Math.PI) / 180,
  /** Aiming: strafe-locked turn rate (360 deg/s) and angular acceleration (rad/s^2). */
  turnAim: (360 * Math.PI) / 180,
  turnAccel: 60,
  /** Sprint steering (rad/s). */
  turnSprint: (300 * Math.PI) / 180,
  /** Legacy facing for drivers that face an explicit yaw (enemies): moving rate, stepped turns on the spot. */
  turnMoving: 2.4,
  turnChunk: 0.785,
  turnChunkTime: 0.3,
  turnThreshold: 0.45,
  twistMax: 1.3,
  /** Reversing (135-180 deg) above this speed is a planted pivot of `pivotTime` s. */
  pivotTime: 0.3,
  pivotMinSpeed: 1.5,
  /** Stance transition times (s): stand -> crouch, crouch -> kneel, crouch -> stand. */
  crouchTime: 0.25,
  kneelTime: 0.3,
  standTime: 0.28,
  /** Fraction of ground control kept in the air (drops / vault exits only). */
  airControl: 0.05,
  standHeight: 1.75,
  crouchHeight: 1.15,
  radius: 0.3,
  maxStep: 0.42,
  /** Camera springs (rad/s): follow (~125 ms lag), shoulder swap (~250 ms), ADS framing (~200 ms). */
  camFollow: 16,
  camShoulder: 15.5,
  camAds: 19,
  /** Auto-recentre behind the travel direction after this long without look input while moving (s). */
  recentreDelay: 1.5,
  recentreRate: 1.6,
};

/**
 * Enemy root motion: guards keep the slower, weighted 1.2.0-era tuning (weight shift, stepped turns),
 * at their own speeds from `config/enemies.json`.
 */
export const ENEMY_MOTION = {
  ...MOVEMENT,
  accelMax: 1.5,
  decelMax: 2.0,
  jerkMax: 9,
  sprintAccel: 4.5,
  velGain: 6,
  brakeGain: 6,
  startShift: 0.3,
  stepLen0: 0.27,
  stepLenK: 0.22,
  rootDip: 0.05,
  turnAim: (110 * Math.PI) / 180,
  turnAccel: 12,
  turnSprint: 1.2,
  pivotTime: 0.6,
  pivotMinSpeed: 0.45,
};

export type MovementKey = keyof typeof MOVEMENT;

/** Ranges for the debug tuning panel. */
export const MOVEMENT_RANGES: Partial<Record<MovementKey, [number, number, number]>> = {
  sneakSpeed: [0.3, 1.5, 0.05],
  crouchWalkSpeed: [0.8, 3, 0.05],
  crouchRunSpeed: [1.5, 4, 0.05],
  walkSpeed: [0.6, 2.5, 0.05],
  jogSpeed: [1.5, 4.5, 0.05],
  sprintSpeed: [3, 7, 0.1],
  adsSpeed: [0.5, 2.5, 0.05],
  adsCrouchSpeed: [0.4, 2, 0.05],
  coverSpeed: [0.4, 2, 0.05],
  strafeMult: [0.5, 1, 0.01],
  backMult: [0.4, 1, 0.01],
  accelMax: [2, 25, 0.5],
  decelMax: [2, 25, 0.5],
  jerkMax: [10, 300, 5],
  velGain: [2, 30, 0.5],
  rootDip: [0, 0.15, 0.005],
  turnTravelSlow: [3, 15, 0.1],
  turnTravelFast: [2, 10, 0.1],
  turnAim: [2, 12, 0.1],
  pivotTime: [0.15, 0.6, 0.01],
  crouchTime: [0.1, 0.6, 0.01],
  standTime: [0.1, 0.6, 0.01],
  camFollow: [6, 40, 1],
  camShoulder: [5, 30, 0.5],
  camAds: [6, 40, 0.5],
  recentreDelay: [0.5, 4, 0.1],
  recentreRate: [0.3, 4, 0.1],
};
