# anim-weight - the tuner's Weight section

Michael (via the orchestrator): add "weight" to the character's movement and animations, tunable. A tool job: every
slider defaults to identity (today's output, bit for bit); Michael tunes, exports, and a later bake folds the values in.

## The section
- Registered from `src/player/weightTune.ts` (after Speed); the pure layers, the slider list and the camera signal are
  in `src/anim/weight.ts` (Babylon-free). Label "Weight", ease `tau` 0.1 s, save / export / import / pad for free.
- Groups (`weightGroupFor`, written to `TUNE_STATE_BAG.weight` each frame; follow picks it): `weight.walk`,
  `weight.jog`, `weight.run` (holstered, by speed: the tuner's bands, walk < 2.2 m/s <= jog < 3.7 m/s <= run),
  `weight.crouch` (crouched, any weapon state), `weight.drawn` (standing with a weapon in hand or aiming). Every slider
  shows in every group.
- Momentum reads the group's values directly (owner side, `PlayerController`, speed = max(wanted pace, current
  pace)); the visual layers read the section's eased `cur` (player.ts, before the local rig's animate).

## Sliders
`mul` identity 1, `add` identity 0. "Reader" is the code that applies it.

| Slider | Range | Does | Reader |
| --- | --- | --- | --- |
| startMul (time to speed, gameplay) | 0.3-3 x | `CT.startTime` x: the pace spring speeding up | `motion.ts stepCt` |
| stopMul (stop time / distance, gameplay) | 0.3-3 x | `CT.stopTime` x: the stop and its slide (~0.3 m from a run today) | `motion.ts stepCt`, `ctStopDistance` |
| turnMul (turn rate slow, gameplay) | 0.3-2 x | `CT.turnRate` x (the cap up to a jog) | `motion.ts updateYaw` |
| turnRunMul (turn rate at a run, gameplay) | 0.3-2 x | `CT.turnRateRun` x (the cap at the full run) | `motion.ts updateYaw` |
| stopSettle (overshoot and settle, gameplay) | 0-0.6 | the stop spring's damping ratio 1 - this: the pace goes back past 0 and settles | `motion.ts stepCt` |
| accelLean | 0-3 deg/(m/s2) | spine pitch forward x the (filtered) speeding-up acceleration | `animGraph writeTargets` |
| stopLean (counter-lean on stops) | 0-3 deg/(m/s2) | spine pitch back x the braking | `animGraph writeTargets` |
| bank | 0-2 deg/(m/s2) | spine roll into the turn x speed x yaw rate | `animGraph writeTargets` |
| plantDrop | 0-0.05 m | pelvis drop pulse at each foot plant (the planted knee compresses through the IK) | `animGraph writeTargets` |
| plantTimeMul | 0.3-3 x | the plant pulse time (0.18 s) | `weight.ts` |
| landDepth | 0-0.1 m/m | pelvis drop on a landing x the fall height (to 6 m, capped 0.3 m) | `animGraph writeTargets` |
| landTimeMul | 0.3-3 x | the landing pulse time (0.2 s + 0.12 s per metre fallen) | `weight.ts` |
| chestLag / chestHzMul / chestDampMul | 0-15 deg/(m/s); 0.3-3 x (2.2 Hz); 0.2-2 x (zeta 1) | chest spring: spine pitch / roll x the lag of a damped spring chasing the body velocity | `animGraph writeTargets` |
| headLag / headHzMul / headDampMul | 0-15 deg/(m/s); 0.3-3 x (3 Hz); 0.2-2 x | head spring: head pitch / roll | `animGraph writeTargets` |
| armLag / armHzMul / armDampMul | 0-0.06 m/(m/s); 0.3-3 x (2.6 Hz); 0.2-2 x | arm spring: both hand targets and the held weapon | `animGraph writeTargets` |
| gearLag / gearHzMul / gearDampMul | 0-0.06 m/(m/s); 0.3-3 x (1.8 Hz); 0.2-2 x | carried gear spring: the guns on the back and the sling, in their slot | `WeaponModel.weightGear` (via `PlayerWeapons`) |
| antStart | 0-0.05 m | anticipation: pelvis dip + spine pitch (4 rad/m) as a start from rest begins | `animGraph writeTargets` |
| antJump | 0-0.08 m | the same as a vault / mantle / hop / window vault / wall kick / climb-up begins | `animGraph writeTargets` |
| antTimeMul | 0.3-3 x | the wind-up pulse time (0.12 s) | `weight.ts` |
| camLag | 0-0.5 s | camera signal: follow lag time constant | `WEIGHT_CAM` (nothing reads it yet) |
| camDip | 0-2 x | camera signal: share of the plant / landing pelvis drop | `WEIGHT_CAM` (nothing reads it yet) |

Springs: each is a damped spring (exact closed form, `springStep`) chasing the body's world velocity; the output is
its lag (spring minus body) in the body frame, so it is 0 at a steady pace, shows during starts, stops and turns, and
settles. A spring with lag 0 stays seeded on the body and is not stepped, so it contributes exactly 0.
Anticipation never delays input: the dip plays while the move starts (0 s added at any value).
Clamps: spine / head offsets 0.6 rad, hand / gear offsets 0.15 m, pelvis drop 0.3 m.

## Camera hook
`WEIGHT_CAM` in `src/anim/weight.ts`, world metres, written every frame by the local player's layers:
`lagX / lagY / lagZ` (a position lagged by `camLag` minus the body: add it to a follow target to trail the body) and
`dip` (`camDip` x the current plant + landing pelvis drop, positive = down). Both 0 at identity. The camera is not
changed; the camera section can read it.

## Identity and co-op
- Gameplay: momentum only, through `WEIGHT_MOVE` (identity outside `weightSim` / `weightSimEnd`, set around the local
  player's `MotionDriver.step` in `PlayerController.fixedUpdate`); guards, the VIP and tests read identity. Like Speed:
  this machine and the local player; remotes pose from MoveState; no wire change.
- Visual: `WEIGHT_POSE.on` is set only while a layer is non-zero, between `weightBegin` and `weightEnd` around the
  local rig's animate, so no other rig sees it; at identity the graph code path is unchanged.
- The bypass (R3 / Backquote) reads identity for both.

## Tests
`tests/animWeight.test.ts`: the section and groups, identity writes exactly 0 through a full sequence, each layer
moves off identity, spring settles (critically, under-, over-damped), no allocation, the graph is moved only while the
pose is on, the motion driver bit for bit identical at identity, a slower start and a stop overshoot off identity.
`scripts/e2e-menus.mjs`: the Weight section is listed by the tuner.

## Results
2026-10-21, desktop, software GL, port 4192:
- `npm run check`: pass (0 lint errors, 199 files / 2175 tests, build), 118 s.
- `CRAB_STATES=1 e2e-anim`: pass, 30 s. `e2e-move`: pass, 561 s. `e2e-clip`: pass, 59 s (E2E_JOBS=2).
- `e2e-menus`: every assert passes (the Weight one too), but the suite takes 840 s solo, over the runner's 600 s cap:
  killed at 600 s twice (with e2e-move beside it, and solo), passed with `E2E_SUITE_TIMEOUT=1500`. No master baseline
  was timed here; the Weight change adds one assert and a few hundred flops per frame.

## Open items
- (check) The sling offset is re-applied after each pose; on frames the animation detail cutoff skips posing (a rig far
  from the camera, free view) it doubles. Visual only, off identity only.
- (check) The arm spring moves the weapon and so the muzzle used as the fire origin, by up to 0.15 m off identity
  (as the Gun section's offsets do): bake it with care.
- (check) While the stop settle overshoots, `ctStopDistance` still assumes a forward slide (tuning only).
- e2e-menus runs past the 600 s suite cap on the desktop (840 s solo): time it on master to see whether it is new.
- Pouches and other kit on the body mesh have no spring (only the carried guns); the thigh holster is left alone.
- Small landings (`landingKind` 'none') do not move the landing counter, so they get no landing load.
- `weight.drawn` uses the weapon stance's draw wanted (or aiming), a frame behind for momentum.
- The camera section does not read `WEIGHT_CAM` yet.
- The visual layers have had no GPU look check (pending PC run): the signs (lean forward, bank into the turn) follow
  the rig's axes, worth one look when Michael tunes.
