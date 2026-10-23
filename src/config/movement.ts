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
  /** Cover-to-cover run (low, fast). */
  coverRunSpeed: 3.6,
  /** Moving while reloading / swapping. */
  reloadMult: 0.75,
  /** Stick bands: crouched sneak ends / crouch walk ends; standing walk ends. */
  sneakBand: 0.4,
  crouchWalkBand: 0.85,
  walkBand: 0.5,
  /** Strafe / backstep penalties (only while aiming: otherwise the body faces where it goes). (anim-rework S3, BRIEF 3 "the
   *  glide") strafe 0.9 -> 0.5: the aimed side-step is a short shuffle that never crosses the feet (GLIDE_STEP); at
   *  1.26 m/s it spread the feet up to 1 m (the crab); 0.7 m/s at full stick keeps a quick 6-steps-a-second shuffle. */
  strafeMult: 0.5,
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
  /**
   * Step length (m) = stepLen0 + stepLenK * speed; a gait cycle is two steps. (anim-rework S2, M6 Michael 2026-10-20: "the
   * leg strides should be further apart with less steps, it's too many steps") stepLenK 0.2 -> 0.24 and the cap
   * `stepLenMax` 0.95 -> 1.3 m: the real-world steps, 0.64 m at 1.4 m/s (2.2 steps a second), 1.02 m at the 3 m/s jog
   * (2.9), 1.26 m at the 4 m/s run (3.2; the CT cap had the run at 4.7 steps a second).
   */
  stepLen0: 0.3,
  stepLenK: 0.24,
  stepLenMax: 1.3,
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
  crouchTime: 0.22,
  kneelTime: 0.3,
  standTime: 0.22,
  /** Fraction of ground control kept in the air (drops / vault exits only). */
  airControl: 0.05,
  standHeight: 1.75,
  crouchHeight: 1.15,
  radius: 0.3,
  maxStep: 0.42,
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
  /** (G1) No step cap for guards (their 3.1.0 strides). */
  stepLenMax: 9,
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
  standTime: 0.3,
  airControl: 0.05,
  standHeight: 1.75,
  crouchHeight: 1.15,
  radius: 0.3,
  maxStep: 0.42,
};

/** Calm guards (not in combat) turn slowly: glances and looks at a sound are unhurried, not twitchy. Standalone too. */
export const ENEMY_CALM_MOTION: typeof MOVEMENT = {
  ...ENEMY_MOTION,
  turnAim: (60 * Math.PI) / 180,
  turnAccel: 6,
};

/**
 * The speed anchors (player only; `player/speedGears.ts`). (anim-rework S1, Michael 2026-10-20: "remove the speed
 * toggle, and allow full speed control via the analogue stick depending on how far you push the stick") There are no
 * gear buttons: the stick's deflection sets the speed continuously (`STICK_SPEED`); these five speeds are the curve's
 * named points (creep, sneak, walk, jog, run), and the integer "gear" the rest of the game reads (the roll, the fence
 * rattle, the wire's pace band) is the nearest of them. `spawn` is the internal speed cap at spawn (5 = none): no
 * player control sets it; tests cap it with `?gear=N` or `controller.gears`. Starting values (G10).
 */
export const GEARS = {
  count: 5,
  spawn: 5,
  /**
   * Standing creep / sneak / walk / jog / run 0.75 / 1.4 / 2.1 / 3.0 / 4.0, crouched 0.85 / 1.3 / 1.7 / 2.15 / 2.6 m/s
   * (the five CT prototype speeds; playtest 2 re-spaced them; G1 audit row 14 the run 4.5). (anim-rework S2, M6 Michael
   * 2026-10-20: "full speed is too quick") the run 4.5 -> 4.0 m/s, a controlled operator run.
   */
  crouch: [0.85, 1.3, 1.7, 2.15, 2.6],
  stand: [0.75, 1.4, 2.1, 3.0, 4.0],
  /** Stick magnitude below which the operator stands still. */
  deadZone: 0.05,
} as const;

/**
 * (anim-rework S1, BRIEF section 1) The analogue speed curve: the stick's travel past the dead zone (0..1,
 * `stickCurve`) to a speed, piecewise linear through `at`: the dead-zone edge gives the slowest creep (`minStand` /
 * `minCrouch`), then the five `GEARS` speeds in order. Most of the travel (to 0.8) is the stealth range (creep, sneak,
 * walk); the last fifth is the jog and the run, reached a little short of the rim (0.97) so a stick that never quite
 * hits its rim still runs. Crouched uses the same points with the crouched speeds. The keyboard (A1): WASD at the walk
 * point, Left Shift held the run, Left Alt held the creep (`KBM_PACE`). Starting values.
 */
export const STICK_SPEED = {
  /** Travel at: the dead-zone edge, creep, sneak, walk, jog, run. */
  at: [0, 0.15, 0.45, 0.8, 0.9, 0.97],
  /** The slowest creep (m/s) at the dead-zone edge, standing / crouched. */
  minStand: 0.4,
  minCrouch: 0.4,
} as const;

/** (A1) The keyboard's move magnitudes: the stick magnitude of the creep, walk and run points (`STICK_SPEED.at`). */
export const KBM_PACE = {
  creep: GEARS.deadZone + (1 - GEARS.deadZone) * STICK_SPEED.at[1],
  walk: GEARS.deadZone + (1 - GEARS.deadZone) * STICK_SPEED.at[3],
  run: 1,
} as const;

/**
 * (locomotion step 22, D5.1, A88) The effort curve's reference: the gear caps the gait clips were authored at (the
 * 3.2.0 caps). A pace is read as an effort by its place between the stance's `GEARS` caps and posed at the same place
 * between these (`effortSpeed`), so every gear keeps its gait (clip mix, arm swing) at the slower M14 speeds; the
 * stride length and the gait clock stay on the real pace (no foot slide).
 */
export const GAIT_REF = {
  crouch: [0.5, 0.9, 1.4, 1.9, 2.5],
  stand: [0.5, 1.1, 2.0, 3.0, 4.0],
} as const;

/**
 * Chaos Theory locomotion feel (3.2.0, player free movement only; `MotionInput.ct`): quick travel turns, the
 * committed forward roll. (locomotion step 22, M14 N6, A88) moderate momentum on the pace only: it eases up and down
 * through a critically damped spring (never overshoots), the travel direction swings toward the stick at speed, and
 * a reversal at pace brakes into a planted pivot before pushing off the new way. Aim, draw, strike, crouch and jump
 * stay instant.
 */
export const CT = {
  /** A swing left over when the feet stop stepping sets down over this (s). */
  stopBlend: 0.12,
  /** 95% of the target pace within this (s) from a standstill (loco M20: full run in ~0.4-0.5 s). */
  startTime: 0.45,
  /** Stick released: 98% of the pace is gone within this (s); ~0.29 m of slide from a 4.2 m/s run (G26: <= 0.3 m). */
  stopTime: 0.2,
  /** (G27) The frozen stance holds this long (s) after a stop, then eases to a feet-together idle over `stopEase`. */
  stopHoldTime: 1.7,
  stopEase: 0.35,
  /** Travel-facing turn rate (rad/s, ~450 deg/s at walk and crouch pace: a 180 in ~0.4 s, G25 / G33) and its angular acceleration (rad/s^2). */
  turnRate: 7.85,
  /** (A1.1) The cap falls to `turnRateRun` (~350 deg/s) as the pace goes from `turnSlowFrom` to `turnSlowTo` (m/s). */
  turnRateRun: 6.1,
  turnSlowFrom: 3.0,
  turnSlowTo: 4.0,
  turnAccel: 300,
  /** A turn dips the pace (fraction lost at a full 180): the run reversal slows and recovers (~0.3 s). */
  turnDip: 0.55,
  /** Slowest speed only: the stick behind the body by more than this (rad, 135 deg) walks backwards at `backSpeed`
   *  (m/s) instead of turning round; it releases again under `backExit` (rad, 120 deg). */
  backAngle: (135 * Math.PI) / 180,
  backExit: (120 * Math.PI) / 180,
  backSpeed: 0.5,
  /** Roll (G32): a HELD crouch (`rollHold` s) standing at speed `rollGear`: duration (s), length (m), noise (m). */
  rollGear: 5,
  rollHold: 0.15,
  rollTime: 0.75,
  rollLength: 2.3,
  rollNoise: 2,
  /** Least moving speed (m/s) for the held crouch to roll. */
  rollMinSpeed: 2.5,
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

/**
 * (CT prototype G1, audit row 26, G160) The tense sneak: crouched, at no more than `maxSpeed` (m/s, crouched gear 2), with
 * an unaware guard within `radius` (m; the footage shows it on at a 3-4 m gap, its start radius is unmeasured: a guess),
 * the operator sneaks with long deliberate steps of `step` m (1.3 steps/s at ~1.1 m/s, 112331 @ 12-15) and the tense
 * carriage, blended in and out with time constant `tau` (s, ~0.3 s). Still near the guard it holds the pose (no kneel).
 * Silent: the crouched gears 1-2 are under the noise band.
 */
export const TENSE = { radius: 5, maxSpeed: 1.4, step: 0.85, tau: 0.1 } as const;

/** Debug Tune panel ranges for the `CT` feel values. */
export const CT_RANGES: Partial<Record<keyof typeof CT, [number, number, number]>> = {
  stopBlend: [0.03, 0.4, 0.01],
  startTime: [0.05, 0.8, 0.01],
  stopTime: [0.05, 0.6, 0.01],
  turnRate: [4, 20, 0.1],
  turnAccel: [40, 600, 10],
  rollTime: [0.4, 1.2, 0.02],
  rollLength: [1.5, 4.5, 0.05],
};

/**
 * Footstep noise (`noiseRadius`, CT prototype M1, G40): the fastest pace that is still silent. Crouched speeds 1-3 (<= 1.7 m/s)
 * and standing speeds 1-2 (<= 1.4 m/s) are silent, with room for the stride's speed swell (`rootDip`); the rest rise.
 */
export const NOISE_QUIET = {
  crouch: 1.9,
  stand: 1.65,
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
};

// --- 3.2.0 phase 2: split jump, wall jump, horizontal pipe sub-states (`player/splitJump.ts`)

export const SPLIT = {
  /** Faces this close to opposed (normal dot) count as the two sides of a gap. */
  opposed: -0.95,
  /** Gap between the faces (m): the legs reach straight out to both walls (a hallway, not a slot). */
  minWidth: 1.2,
  maxWidth: 1.95,
  /** Both walls at least this tall over the floor (m): the feet line plus the body braced above it. */
  minHeight: 3.6,
  /** Shortest usable stretch of corridor (m) and the margin kept from its ends. */
  minLen: 0.8,
  endMargin: 0.3,
  /** The two faces' bases within this of each other (m): the same floor. */
  floorTol: 0.3,
  /** The player faces within this of the corridor axis (rad, either way along it). */
  facing: (40 * Math.PI) / 180,
  /** Feet planted on the walls this high over the floor (m; the walls stand `minHeight` - well over the head). */
  feetHeight: 2.5,
  /** The body's root this far under the feet line (m at 1.75 m): with the split pose's pelvis drop the hips sit just
   *  over the feet, the legs almost horizontal out to the walls. */
  rootDrop: 0.37,
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
  /** Rope speeds (m/s): up, down, down with sprint held. (ct-prototype G4, AUDIT-TRAVERSAL #14, CT 111731 6.0-11.6: a slow
   *  steady walk down, 0.45-0.75 m/s) down 1.6 -> 0.6, with sprint 3.0 -> 1.2 (estimates; G31 removed the sprint hold). */
  ascend: 1.0,
  descend: 0.6,
  descendSprint: 1.2,
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
  /** Hooking on and stepping over the edge (s); reach to the rappel point from the roof (m). (G4, AUDIT-TRAVERSAL #13, CT
   *  111731 2.0-4.2: steps over the edge and sits into the rope in about 2 s) 0.8 -> 1.8 s (estimate). */
  hookTime: 1.8,
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

/**
 * (3.2.0) The manual jump (Y / E with nothing else on offer): a hop straight up keeping the run's
 * pace, the hands grabbing what passes within reach (lips, drainpipes, ladders, pipes); a second press in the air over a
 * split gap braces in it.
 */
export const LEAP = {
  /** Take-off speed (m/s, up): an apex ~0.8 m over the floor (the airborne controller falls at about twice g). */
  vy: 5.6,
  /** Horizontal pace carried into the jump (x the ground speed), capped (m/s). */
  carry: 1.0,
  maxSpeed: 5.0,
  /** A second press within this (s) of the take-off is the double tap (split). */
  doubleTap: 0.4,
  /** Grabs wait this long after the take-off when a split gap is under the jump (room for the double tap) (s). */
  splitWait: 0.22,
  /** Pause between jumps (s). */
  cooldown: 0.3,
  /** A drainpipe / ladder this close (m, horizontal from the feet) is grabbed in the air. */
  climbReach: 0.75,
} as const;

/**
 * (sector-fixes-r fix) Falling past a lip or a horizontal pipe (`AttachController.fallProbe`): it is in the hands' path
 * when it sits `minAbove`-`maxAbove` m over the falling feet, within `plan` m (horizontal) of the body. After a manual
 * jump (`LEAP`) the hands take it on their own; otherwise the traverse button does. The co-op tests' solo-reach check
 * (`tests/helpers/soloJumpReach.ts`) reads these.
 */
export const FALL_GRAB = {
  minAbove: 1.5,
  maxAbove: 2.35,
  plan: 0.7,
} as const;

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
  /** Leg-up (CT): the lowest ledge it serves (m over the floor; lower is a jump's), free air over the crouched booster,
   *  a side to run in from, how long an offer waits (s). Relay: the climber's reach under the hanger, the highest hang it
   *  serves, the climb (s), the slot beside the hanger (m). All starting values (G10). */
  legUpMin: 2.4,
  roomUp: 2.6,
  roomSide: 1.0,
  offerTime: 20,
  relayReach: 1.6,
  relayMax: 4.6,
  relayClimb: 1.4,
  relaySlide: 0.8,
  /** (CT prototype B4) Partner throw (CT 1.3): the runner's reach to the standing thrower (m), how far past the thrower
   *  the runner lands (m, along runner -> thrower), the arc's apex over the straight line (m), the flight (s), the most a
   *  landing may sit above / below the thrower's floor (m), the free air over the standing thrower (m). Starting values. */
  throwReach: 1.6,
  throwDist: 3.2,
  throwApex: 1.7,
  throwTime: 1.0,
  throwDrop: 1.0,
  throwUp: 2.2,
  /** (throw-ko, CT levels-digest row "Partner throw": landing on a guard knocks him out) The thrown player's descending
   *  feet take a guard down within `throwKoReach` m across of him and `throwKoLow`..`throwKoHigh` m over his feet (his
   *  hips to the top of his head: the falling body lands on his head / shoulders). Starting values. */
  throwKoReach: 0.7,
  throwKoLow: 0.3,
  throwKoHigh: 1.7,
  /** (CT prototype B5) Hang-down (CT 1.5 Drop Line): the partner's reach to the crouched holder at the edge (m); the
   *  drop the edge must have under it (m below the holder's floor); how far ahead of the holder the drop is looked for
   *  (m); the hanging head's depth under the edge: least, most, at the start (m); how fast the holder's stick moves it
   *  (m/s); the lowering and the pull-up (s); a hanging player whose holder stopped holding is let go after (s). */
  hangReach: 1.6,
  hangDrop: 2.2,
  hangProbe: 1.0,
  hangMin: 1.0,
  hangMax: 2.5,
  hangStart: 1.5,
  hangRate: 0.8,
  hangLower: 0.8,
  hangPull: 0.9,
  hangLost: 1.5,
  /** (CT prototype B7) Two-person rope (CT 1.4 Belay Line): the climber's reach to the holder at the top (m, across);
   *  the shortest and longest drop the rope serves (m, edge over the floor under it); climbing up and down (m/s, the
   *  climber's stick); the top-out over the edge (s); the slide down when let go (m/s); a climber whose holder stopped
   *  holding slides down after (s). Starting values (G10). */
  ropeReach: 2.0,
  ropeMin: 2.2,
  ropeMax: 6.0,
  ropeUp: 1.0,
  ropeDown: 1.6,
  ropeTop: 1.1, // (team-climb) was 0.9: the eased path (teamMoves `ROPE_TOP_PATH`) needs 1.1 s to keep the root from popping
  ropeSlide: 3.0,
  ropeLost: 1.5,
  /** Requests a player may make (host rate limit, per second). */
  rate: 1,
} as const;
