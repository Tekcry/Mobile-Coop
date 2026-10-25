# Animation and controls rework - brief

Written by the orchestrator, 2026-10-20, from Michael's words. This is the job lead's prompt and the job's BRIEF.

## Michael's words (verbatim, 2026-10-20 13:30)
- "the ct movement is getting worse. Can you ignore CT movement references."
- "remove the speed toggle, and allow full speed control via the analogue stick depending on how far you push the stick"
- "i want to make LT the aim, held, not toggled. There should be 3 character states. Holstered, low ready, aiming. There
  should be a button to holster the gun which enables traversal."
- "all movement animations need rework. Can you create a detailed prompt to create realistic and believable
  stances/movement animations that dont look like crabbing, move naturally, blend together well, allow for freedom of
  movement without clipping or looking awkward. Take into consideration how a person would actually achieve these
  stances, how they would support and balance themselves with or without weapons, how they would stafe across a wall
  standing or crouched, how would they look around a corner. I want the avatar to move like a senior trained SWAT officer
  or stealth operative with calculated moves."

His answers (13:35):
- M1 Holster / draw button: "X tap" (holstered <-> low ready).
- M2 LT from holstered: "draws straight to aim, but slower if the gun isnt already out as the character wiill need to draw
  the gun first. Have it own animation for this also. Consider how CT pulled the gun underneath like a sling"
- M3 Close-quarters strikes: "RT tap / hold" (tap = knockout, hold = kill; holstered, and while holding a guard).
- M4 Traversal with a gun out: "Auto-holster, then return to the same state once climbed".

- M5 Grabbing a guard (13:40): "when grabbing guards, movement must be similar to speed 1 when moving backwards, the
  player shouldnt turn around where the camera is going as they are holding someone and cant turn quickly. Consider how
  someone would realistically be able to move if they grabbed someone from behind. The player should also have a knife
  to the persons throat when grabbed, non lethal chokes them, lethal kills them with knife."

- M6 Movement feedback on /preview/ 4.15.x (slice 1 + walk round 3b, via the orchestrator 18:55), for slice 2:
  "- full speed is too quick, and the leg strides should be further apart with less steps, it's too many steps
  - walking forward on all gears leans too much, it shouldn't lean at all until full speed which should be similar to the
  lean it has now
  - the legs when walking are too far apart, bring knees and legs in line with the body, I would say almost completely
  vertical.
  - arms go out in front of body when moving, it looks weird like a zombie. Arms should stay parallel the body and swing
  naturally increase slightly more each time you speed up.
  - none of the movement feel weighted, but we will focus on these animations first.
  - prototype quick passes only, must be believable, not perfect."
  Reading: top speed down, longer run stride and lower cadence; no forward lean below full speed (today's lean at full
  speed only); knees and feet under the hips, legs near vertical; arms hang along the body, swing grows a little with
  speed, no forward reach; weight later.

## What changes in the rules
- Movement and animation no longer follow the CT footage. G1 (pure CT) still holds for the rest of the game (mechanics,
  stealth, light, HUD, co-op design) unless Michael says otherwise. The footage audit, the keyed-clip pipeline (G8) and
  the matched-camera sheets stay as tools; the CT targets in AUDIT.md and G8-WALK.md stop being the goal.
- The reference is real-world: how a senior SWAT officer or a trained stealth operative actually stands, moves, carries
  and aims. Use public training and biomechanics knowledge, never another game's animation.
- The no-refining rule is lifted for movement, animation and these controls (Michael asked for this work).

## Goal
Wren moves like a senior trained operator: calculated, balanced, quiet, economical. Every pose is one a real person can
hold, every movement is supported by the feet, and every state blends into the next without pops, slides or clipping.
Full freedom of movement in any direction at any speed the stick asks for, in every state.

## 1. Controls (pad first; KBM equivalents)
- Speed: the left stick's deflection sets the speed continuously, from a slow creep to a run. No gears, no D-pad speed
  buttons, no mouse-wheel speed. A dead zone, then a curve (most of the stick's travel goes to the stealth range: creep,
  sneak, walk; the last ~20 % to the jog and run). KBM: WASD at a walk; hold Left Shift to run; hold Left Alt to creep
  (assumed A1, logged). Noise and the light meter follow the actual speed.
- Three weapon states:
  - Holstered: the rifle slung, hands free. Traversal, palm strikes, grabs, gadgets and doors all work.
  - Low ready: the gun out, carried ready but pointed down and in, moving freely. The camera stays the explore camera.
  - Aiming: LT held. The over-the-shoulder aim camera; release LT to drop to low ready. No toggle.
- X tap: holstered <-> low ready. Reload moves to X hold while drawn (assumed A2; A while drawn also reloads, as today).
- LT from holstered: one continuous draw-to-aim, slower than LT from low ready because the gun comes off the sling first.
  Its own animation. The rifle hangs from a sling under the arm and swings up into the shoulder (M2: "like a sling").
- RT: fire while aiming (no fire from low ready: assumed A3, a choice for Michael). Holstered or holding a guard:
  RT tap = knockout, RT hold = kill (M3). While holding a guard, LT = aim the pistol (human shield).
- Traversal (Y) with a gun out: auto-holster, traverse, then return to the state you were in (low ready or aiming) when
  the move ends (M4). Each needs a quick holster and a quick re-draw that fits the move.
- Update `docs/systems/input-and-loop.md`'s table, the controls screen text, the in-game prompts, the settings migration
  (old saves with speed gears or the old LT / X layout move to the new defaults) and `tests/input.test.ts`.

## 2. The animation set
Locomotion, each a continuous blend by speed (creep to run) and direction (forward, back, strafe left / right and the
diagonals), for each state:
- Holstered: standing, crouched; plus the stealth sneak (see 4).
- Low ready, rifle and pistol: standing, crouched.
- Aiming, rifle and pistol: standing, crouched; moving while aiming is the "glide" (see 3).
- Starts, stops, turns on the spot and in motion (pivot on the balls of the feet), direction changes, plants.
- Idles for each state and stance: alive (breathing, small weight shifts, a scan with the head), never frozen, never fast.
- Transitions: holstered <-> low ready (rifle, pistol), low ready <-> aiming, holstered -> aiming (the sling draw, slower),
  stand <-> crouch in every state, the auto-holster before a traversal and the re-draw after.
- Wall: back to the wall standing and crouched, sliding along it left and right, the corner peek standing and crouched,
  aiming out from a corner (see 5).
- Close quarters: approach, grab, hold and walk with a guard, human shield aim, knockout, kill, carry, drop.

## 3. How a trained operator actually moves (the realism standard)
Balance and support
- The centre of mass is always over the base of support; a step moves the body over the new foot before the old one
  lifts. No pose is held on a heel or with the weight outside the feet.
- Feet about hip width when standing, a narrow track when walking (the feet land close to a line under the hips, a few
  cm either side). Knees track over the toes; they never bow out. This is the fix for the crabbing.
- Knees soft (slightly bent) when ready; the stance lowers as the threat rises: relaxed upright when holstered and
  walking, a little lower at low ready, lower again when aiming, lowest in the sneak and crouch.
- Heel-to-toe roll on every step at walk speeds; toe-first or flat and rolling in the sneak; feet lock to the ground
  while planted (no sliding).
- The upper body counter-rotates against the hips when walking unarmed; with a gun it stays square to the gun and the
  hips do the turning.

Weapon carry and aiming
- Rifle low ready: stock in the shoulder pocket or just below it, muzzle pointed down about 30-45 degrees in front of
  the feet, support hand forward on the handguard, elbows down and close to the ribs (not winged). Ready to come up
  in one movement.
- Rifle aiming: the gun comes up to the eye, the head stays upright (bring the gun to the eye, not the eye to the gun),
  elbows down, torso squared or slightly bladed, feet staggered, weight a little forward, knees soft.
- Pistol low ready: both hands on the gun, close to the chest and pointed down and forward (compressed ready), elbows in.
- Pistol aiming: two hands, arms extended but not locked, isosceles or a slight Weaver, head upright, shoulders relaxed.
- Moving while aiming: the glide. Short steps, knees bent to absorb each step, rolling feet, the upper body a stable
  platform that keeps the sights steady; the legs do all the movement. Strafing while aiming steps without crossing the
  feet at low speed (a shuffle step), crossing over only at speed; walking backwards checks the ground with the toes first.
- Holstered: the rifle hangs from its sling, muzzle down, and never swings into the legs or clips the body. The hands
  are free and natural, close to the body; near a guard one hand moves near the knife (Michael, 2026-10-19).

Stealth
- The sneak: knees deeper, centre of mass low and quiet, slow deliberate steps placed toe-then-heel or flat and rolled,
  arms close, the head level and scanning. Calculated, not exaggerated: a professional, not a cartoon.
- Crouch walk: weight between the feet, short steps, knees over toes, no duck-waddle; the crouch run leans forward and
  stays low without the knee dragging.
- The crouched idle: one knee down or a deep balanced squat, a hand resting on top of the knee (palm down, fingers
  forward), slow breathing.

Walls and corners
- Back to the wall standing: shoulder blades and the back of the head near the wall (a small gap, not pressed flat),
  knees soft, the weapon held close and down along the body, the head turned to the open side.
- Sliding along a wall: a side step that never crosses the feet, the body staying in contact height, the lead foot
  first; crouched, the same on bent knees with the weight low.
- Looking round a corner: lean from the hips and the outside knee (not the neck alone), the head and one eye past the
  edge only as far as needed, the weapon leading if drawn; slicing the pie: small steps outward from the corner to see
  more of the room, never stepping into the open in one go. Crouched, the same from a lower height with a hand on the
  wall or the knee for balance.
- The aim out of a corner: the gun and the head come out together, the body stays behind the edge.

Holding a guard (M5)
- The hold: from behind, Wren's support arm across the guard's chest or shoulder, her body tight against his back, the
  knife in her other hand at his throat. Both bodies move as one unit with Wren's weight low and behind his.
- Movement while holding: slow, about the old speed 1 (a creep), whatever the stick deflection. Backwards is the natural
  direction (dragging him), with short shuffle steps that never cross the feet; sideways is a slow side step; forward
  is a slow push. No quick moves.
- Turning while holding: limited. The pair does not snap to the camera; it rotates slowly (a measured cap, e.g. well
  under 90 degrees a second) by stepping round, and the camera can look further than the bodies face.
- The knockout (RT tap): a choke from the hold: the forearm across the throat, the guard sags and is lowered to the floor
  under control. The kill (RT hold): the knife at the throat; keep it short and not gratuitous (the game's tone; no gore
  beyond a quick, cut-away moment).
- The human shield (LT while holding): the pistol comes up past the guard's shoulder or side, the knife hand switching to
  holding him; the pair still moves slowly.
- The guard's own animation matches: feet dragging or stumbling backwards, hands up at Wren's arm, no clipping between
  the two bodies at any speed or turn.

## 4. Blending and freedom of movement
- Continuous blend spaces: speed from the stick, direction relative to the facing, and the state. No popping between
  gears; a speed change of the stick changes the gait smoothly (step length and cadence both scale).
- Foot locking and foot IK on slopes and steps; the pelvis adjusts to the lower foot; stride matched to the actual
  ground speed so feet never slide.
- Turning: small turns rotate the upper body first, then the feet step round; large turns pivot on the balls of the feet
  with a step. Direction changes plant the outside foot.
- Every transition has a defined length and curve (no linear snaps); the state machine never leaves a pose half-blended.
- Upper and lower body layered: the legs run the locomotion while the arms run the weapon state, masked at the spine
  with a weight that keeps the gun steady when aiming.

## 5. Quality gates (what "done" means)
- No clipping: the weapon, the sling, the arms and the legs never pass through the body or each other, in any state,
  speed or direction, including the transitions (extend e2e-clip; contact sheets at the hard frames).
- No sliding: planted feet move less than 1 cm over the ground while planted (e2e-anim).
- No crabbing: the knee separation and foot track stay within human ranges at every speed and stance (measure; add the
  checks to e2e-anim).
- Natural: before / after contact sheets per animation group at the gameplay camera and a side view, sent to Michael;
  his eye decides.
- Co-op parity: the remote character plays the same clips from MoveState (e2e-netmove within its limits); a wire change
  bumps the protocol.
- Performance: the anim hot path does not allocate; blend evaluation within the frame budget (docs/systems/performance.md).

## 6. How to build it
- Keyed clips authored headless in Blender (the G8 pipeline: scripts/anim-keys, baked into src/anim/clips/keyed), keyed by
  hand from the realism standard above, never traced from any game. Extend the rig where it blocks believable motion
  (toe joints, a wrist frame for the knee hand, a sling attachment), and say what it costs.
- The procedural layer keeps foot IK, foot locking, speed matching, aim offsets and look-at.
- Order (each a slice with an implementer, an independent check, the test tier, a sheet for Michael, /ct/):
  1. Controls: analogue speed, the three states, LT hold, X holster, RT tap / hold, auto-holster traversal.
  2. Holstered locomotion standing and crouched, idles, starts / stops / turns (the base everything else builds on).
  3. Low ready and aiming, rifle and pistol, standing and crouched, the glide, and all weapon transitions incl. the sling
     draw to aim.
  4. Sneak, crouch walk and run, the crouched idle with the knee hand.
  5. Walls and corners, standing and crouched.
  6. Close quarters: grab, hold, shield, knockout, kill, carry.
- Small PRs to master as each slice is green; the orchestrator merges.

## Assumed decisions (A-numbers; Michael can change any)
- A1 KBM speed: WASD walks, Left Shift held runs, Left Alt held creeps.
- A2 Reload: X hold while drawn (and A while drawn, as today).
- A3 No firing from low ready; RT fires only while aiming.
- A5 Aimed strafe speed (slice 3, CT Core 2026-10-20): `strafeMult` 0.9 -> 0.5, so the aimed strafe is 0.7 m/s at full
  stick (was 1.26). At 1.26 m/s a believable shuffle step that never crosses the feet is not possible. Undo: set
  `strafeMult` back in `src/config/movement.ts` (a crossover step at speed would then be needed).
- A6 Crouched holstered idle (slice 4, CT Core 2026-10-21): holstered and still while crouched, Wren holds a balanced
  squat with both palms on top of the knees (the keyed `crouch_idle`) instead of the one-knee kneel; with a gun out she
  still kneels. Undo: `KEYED_CROUCH.squat = false`.
