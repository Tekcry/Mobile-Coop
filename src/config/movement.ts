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
  /** Cover strafe (3.2.0, approved change): the gear's pace, no faster than these along a wall (m/s). Gear 3 is about
   *  the 2.x cover pace (2.3 / 1.25). */
  coverMax: { stand: 2.8, crouch: 1.8 },
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
  /**
   * Stick release: a stick dropping faster than `releaseRate` (magnitude per second) from at least `releaseFrom` keeps
   * its last deflection for up to `releaseWindow` s; reaching the dead zone in that time is a release (an instant
   * stop at full pace), settling higher is a deliberate slow-down. A pad stick springing back passes through small
   * values for a frame or two, which would otherwise slow the operator before the stop.
   */
  releaseRate: 4,
  releaseFrom: 0.2,
  releaseWindow: 0.15,
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

// --- 3.2.0 phase 2: split jump, wall jump, horizontal pipe sub-states (`player/splitJump.ts`)

export const SPLIT = {
  /** Faces this close to opposed (normal dot) count as the two sides of a gap. */
  opposed: -0.95,
  /** Gap between the faces (m). */
  minWidth: 0.9,
  maxWidth: 1.7,
  /** Both walls at least this tall over the floor (m). */
  minHeight: 2.6,
  /** Shortest usable stretch of corridor (m) and the margin kept from its ends. */
  minLen: 0.8,
  endMargin: 0.3,
  /** The two faces' bases within this of each other (m): the same floor. */
  floorTol: 0.3,
  /** The player faces within this of the corridor axis (rad, either way along it). */
  facing: (40 * Math.PI) / 180,
  /** Feet planted on the walls this high over the floor (m). */
  feetHeight: 1.9,
  /** The committed jump into the split (s). */
  jumpTime: 0.45,
  /** Aiming from the split: body yaw within this of the corridor axis, pitch band (rad). */
  aimYaw: (100 * Math.PI) / 180,
  pitchMin: (-85 * Math.PI) / 180,
  pitchMax: (30 * Math.PI) / 180,
} as const;

export const WALL_JUMP = {
  /** Lip height over the feet (m): above a standing grab (`REACH.grabMax` 2.7 in `world/anchors.ts`). */
  minUp: 2.7,
  maxUp: 3.8,
  /** Facing a wall within this (m). */
  wallReach: 1.0,
  /** Facing the lip's wall: cos of the angle between the facing and into the wall. */
  faceCos: 0.7,
  /** Inside corner: facing the adjoining wall, the lip's face then side-on (|cos| under this). */
  cornerCos: 0.4,
  /** Lip within this (m, horizontal from the feet) for a corner kick. */
  cornerReach: 1.4,
  /** The committed run-up kick (s). */
  time: 0.6,
} as const;

/** The horizontal pipe's sub-states and their timing. */
export const PIPE = {
  /** Shimmy speed with the legs crossed over the pipe (m/s). */
  legsUpSpeed: 0.5,
  /** Transitions (s). */
  toLegsUp: 0.5,
  toInverted: 0.55,
  toHands: 0.45,
  /** Inverted: aim band (rad) round the body facing, spread multiplier. */
  aimYaw: (120 * Math.PI) / 180,
  pitchMin: (-80 * Math.PI) / 180,
  pitchMax: (30 * Math.PI) / 180,
  spreadMul: 1.3,
  /** Legs up: the feet ride this much higher than hanging by the hands (m). */
  legsUpLift: 0.6,
} as const;

// --- 3.2.0 phase 3: rappel and fences (`player/attachController.ts`)

export const RAPPEL = {
  /** Rope speeds (m/s): up, down, down with sprint held. */
  ascend: 1.0,
  descend: 1.6,
  descendSprint: 3.0,
  /** Kick out from the wall: how far out the swing goes (m), how long it takes (s), how far sideways the stick takes
   *  it per kick and in all (m). */
  swingOut: 1.2,
  swingTime: 1.0,
  lateralStep: 0.75,
  lateralMax: 1.5,
  /** B unhooks only this close to the floor (m, feet height). */
  unhookHeight: 2.0,
  /** Feet off the wall face (m) and the rope out where the body is just over the edge (m). */
  standoff: 0.5,
  minOut: 1.0,
  /** Hooking on and stepping over the edge (s); reach to the rappel point from the roof (m). */
  hookTime: 0.8,
  reach: 0.9,
  /** Sidearm from the rope: yaw round the wall's outward normal, pitch band (rad). */
  aimYaw: (110 * Math.PI) / 180,
  pitchMin: (-80 * Math.PI) / 180,
  pitchMax: (40 * Math.PI) / 180,
  /** A window beside the rope is kicked through when it is this close sideways (m). */
  windowReach: 0.9,
} as const;

export const FENCE = {
  /** Climb up / down and shimmy (m/s). */
  climb: 0.9,
  shimmy: 0.6,
  /** The committed flip over the top (s). */
  flipTime: 0.9,
  /** Rattle noise radius while moving on it above `quietGear` (m); quiet at gears 1-3. */
  rattle: 4,
  quietGear: 3,
  /** Reach to grab it from the floor (m) and the body's standoff while on it (m). */
  reach: 0.85,
  standoff: 0.3,
  /** The hands reach over the top this far above the feet (m at 1.75 m): the climb's top. */
  handReach: 1.85,
} as const;

// --- 3.2.0 phase 5: co-op team moves (`game/teamMoves.ts`)

export const TEAM = {
  /** Hold Y this long (s) to brace; a team-mate within `mateRange` (m) and a wall within `wallBehind` (m) behind. */
  braceHold: 0.4,
  mateRange: 3,
  wallBehind: 1.0,
  /** The partner within this of the braced player's hands to start a move (m). */
  partnerReach: 1.2,
  /** Boost: the toss reaches a lip / pipe / split up to this high over the floor (m); the committed step-up and toss
   *  (s). */
  boostMax: 4.5,
  boostTime: 0.9,
  /** Human ladder: the top player's feet on the shoulders (m); a lip they can grab from there (m over the floor); the
   *  climb up (s). */
  ladderFeet: 1.45,
  ladderGrab: 4.1,
  ladderClimb: 0.8,
  /** Top of the human ladder: the aim band (rad). */
  ladderPitch: (60 * Math.PI) / 180,
  /** Requests a player may make (host rate limit, per second). */
  rate: 1,
} as const;
