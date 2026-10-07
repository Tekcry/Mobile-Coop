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
  coverSpeed: 2.3,
  coverCrouchSpeed: 1.25,
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
  rootDip: 0.025,
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
 * at their own speeds from `config/enemies.json`. 3.2.0: a standalone literal (the values `...MOVEMENT` resolved
 * to before the Chaos Theory movement), so player tuning never reaches the enemies (`tests/motion.test.ts` pins it).
 */
export const ENEMY_MOTION: typeof MOVEMENT = {
  sneakSpeed: 0.8,
  crouchWalkSpeed: 1.8,
  crouchRunSpeed: 2.6,
  walkSpeed: 1.4,
  jogSpeed: 2.8,
  sprintSpeed: 5.0,
  adsSpeed: 1.4,
  adsCrouchSpeed: 1.0,
  coverSpeed: 2.3,
  coverCrouchSpeed: 1.25,
  coverRunSpeed: 3.6,
  reloadMult: 0.75,
  sneakBand: 0.4,
  crouchWalkBand: 0.85,
  walkBand: 0.5,
  strafeMult: 0.9,
  backMult: 0.75,
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
  turnTravelSlow: (540 * Math.PI) / 180,
  turnTravelFast: (300 * Math.PI) / 180,
  turnAim: (110 * Math.PI) / 180,
  turnAccel: 12,
  turnSprint: 1.2,
  turnMoving: 2.4,
  turnChunk: 0.785,
  turnChunkTime: 0.3,
  turnThreshold: 0.45,
  twistMax: 1.3,
  pivotTime: 0.6,
  pivotMinSpeed: 0.45,
  crouchTime: 0.25,
  kneelTime: 0.3,
  standTime: 0.28,
  airControl: 0.05,
  standHeight: 1.75,
  crouchHeight: 1.15,
  radius: 0.3,
  maxStep: 0.42,
  camFollow: 16,
  camShoulder: 15.5,
  camAds: 19,
  recentreDelay: 1.5,
  recentreRate: 1.6,
};

/** Calm guards (not in combat) turn slowly: glances and looks at a sound are unhurried, not twitchy. Standalone too. */
export const ENEMY_CALM_MOTION: typeof MOVEMENT = {
  ...ENEMY_MOTION,
  turnAim: (60 * Math.PI) / 180,
  turnAccel: 6,
};

/**
 * Chaos Theory speed gears (3.2.0, player only; `player/speedGears.ts`): six gears stepped with `speedUp` /
 * `speedDown`, kept through stance changes, `spawn` at spawn and respawn. Target speed = the gear's cap x the stick
 * curve (0 inside `deadZone`, linear to 1 at the rim). The sprint is gear 6 standing while it lasts.
 */
export const GEARS = {
  count: 6,
  spawn: 3,
  /** Gear caps (m/s), gear 1..6. */
  crouch: [0.5, 0.9, 1.3, 1.8, 2.3, 2.8],
  stand: [0.8, 1.3, 2.0, 2.8, 3.8, 5.0],
  /** Stick magnitude below which the operator stands still. */
  deadZone: 0.05,
  /** HUD gear pips stay this long after a change (s), then fade. */
  pipsShow: 1.5,
} as const;

/**
 * Chaos Theory locomotion feel (3.2.0, player free movement only; `MotionInput.ct`): instant stops, near-instant
 * starts, no planted pivots, quick travel turns, the committed forward roll.
 */
export const CT = {
  /** Release the stick: velocity is zero by the next fixed step; the pose blends to idle over this (s). */
  stopBlend: 0.12,
  /** 95% of the target speed within this (s) from a standstill, after a direction or gear change too. */
  startTime: 0.08,
  /** Travel-facing turn rate (rad/s, 720 deg/s) and its angular acceleration (rad/s^2). */
  turnRate: (720 * Math.PI) / 180,
  turnAccel: 240,
  /** Forward roll: crouch tapped standing at gear >= `rollGear` while moving: duration (s), length (m), noise (m). */
  rollGear: 5,
  rollTime: 0.7,
  rollLength: 3.0,
  rollNoise: 2,
  /** Least moving speed (m/s) for the crouch tap to roll. */
  rollMinSpeed: 1.5,
};

/** Debug Tune panel ranges for the `CT` feel values. */
export const CT_RANGES: Partial<Record<keyof typeof CT, [number, number, number]>> = {
  stopBlend: [0.03, 0.4, 0.01],
  startTime: [0.02, 0.3, 0.01],
  turnRate: [4, 20, 0.1],
  turnAccel: [40, 600, 10],
  rollTime: [0.4, 1.2, 0.02],
  rollLength: [1.5, 4.5, 0.05],
};

/**
 * Footstep noise (`noiseRadius`, 3.2.0): the fastest pace that is still silent. Crouched gears 1-4 (<= 1.8 m/s) and
 * standing gears 1-2 (<= 1.3 m/s) are silent, with room for the stride's speed swell (`rootDip`).
 */
export const NOISE_QUIET = {
  crouch: 1.9,
  stand: 1.45,
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
  coverSpeed: [0.4, 3.5, 0.05],
  coverCrouchSpeed: [0.4, 3, 0.05],
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
