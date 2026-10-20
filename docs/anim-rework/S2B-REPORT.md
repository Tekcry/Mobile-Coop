# Slice 2b report: the walk fix (robotic walk, a better default for the tuner)

Implementer (Opus), 2026-10-20 23:20 - 2026-10-21 04:00, uncommitted in `feature/anim-s2b` (base master b125599e).
Michael on slice 2: "There is animation issues, almost worse than before". The five causes a review found, applied as
named constants and key files only (the anim tuner's multipliers hook onto them; no planner code). Real-world operator
gait, keyed by hand, never traced. Where the review's number broke a slice 2 gate or a unit bound, the value below is the
nearest one that keeps it, with the reason; the review's value is in the "review" column.

## The five items (final values)
| # | item | old -> new (review) | where |
| --- | --- | --- | --- |
| 1 | arm swing grows with pace | `KEYED_WALK_BAND.ampMin` 0.5 -> 0.35 (as review): ~0.78 of the keyed swing at 1.4 m/s | `src/anim/animGraph.ts` |
| 1 | walk arm keys (as review) | phase 0: armR flex 14 -> 22, elbow 18 -> 40; armL -12 -> -24, elbow 8 -> 16. 0.125: armR 10 -> 18 / 16 -> 36; armL -7 -> -16 / 10 -> 18. 0.25: elbows 12 -> 26. 0.375: armL 9 -> 14 / 15 -> 32; armR -8 -> -18 / 9 -> 18 | `scripts/anim-keys/keys/walk.json` |
| 1 | jog / run back swing (hands pass the hip) | jog armL / armR flex at 0 / .125 / .25 / .375: -31 / -22 / -1 / 20 and 29 / 20 / -1 / -22 (-35 deg in the world in the 4 deg chest); run -27 / -15 / 13 / 41 and 53 / 41 / 13 / -15 (-45 deg in the world in the 18 deg chest); elbows unchanged | `keys/jog.json`, `keys/run.json` |
| 2 | trunk counter-rotation | walk pelvis yaw 2 -> 2.5 (5), spine 0.8 -> -3, chest -2 -> -5; jog pelvis 2.5 -> 3.5 (6), spine -2 (-3), chest -7; run pelvis 3 (7), spine -3 (-4), chest -8. 0.125 / 0.375 proportional, mirrored | the three key files |
| 3 | stance knee | new `SOFT_KNEE_WALK` 0.988 (~18 deg of knee at full reach, the loading response) eased in over `SOFT_KNEE_TAU` 0.2 s while the gait moves; `SOFT_KNEE_STAND` stays 0.997 for the still idle (review: 0.988 everywhere) | `src/player/characterRig.ts` |
| 4 | cadence | `stepLen0` 0.3 -> 0.36, `stepLenK` 0.24 -> 0.25 (as review), `stepLenMax` 1.3 (1.4); the walk's own line `WALK_STEP.l0` 0.42 + `k` 0.155 (review: 0.36 + 0.25); new `CROUCH_STEP.l0` 0.3 keeps the crouched steps exactly as before (slice 4 owns them) | `src/config/movement.ts`, `src/anim/motion.ts` |
| 5 | weight transfer | walk pelvis dx 0 / -1 / -1.5 / -1 (-2 at .25), roll 0 / -1.5 / -3 / -1.5 (-3 / -4 / -2), dy -7 / -7.2 / -4.2 / -5.2 cm at 0 / .125 / .25 / .375 (the review's -4 / -4.2 / -1.2 / -2.2 shape, 3 cm lower) | `keys/walk.json` |

Track kept: legs add walk 3 -> 2.8 (the turned pelvis turns the feet in); clip half-widths walk 4.83, jog 4.62, run 4.50
cm (slice 2: 4.66 / 4.88 / 4.50). The run's pitch does not accumulate: `key_clip.py` (`fk`) takes every trunk angle as
absolute in the body frame and exports local rotations, which the rig's pelvis -> spine -> chest chain composes back,
so the chest leans 18 deg at the run (as slice 2), not 45. Nothing to fix.

### Why the values differ from the review
- **Walk steps 0.64 m at 1.4 m/s (132 a minute), not 0.71 m (118).** With the review's line a 90 deg walk turn dipped the
  pelvis 12-14 cm (g1Locomotion head bob 0.13 m, bound 0.04) and the straight walk bobbed 6.8 cm. Traced in a NullEngine
  harness: after the 450 deg/s turn the turned foot lands only ~0.16 m ahead (a late, compressed clock swing), the next
  swing lands a normal 0.33 m ahead half a cycle later, so the feet spread 0.86 m and the legs' reach drop pulls the
  pelvis down; the drop grows steeply past ~0.6 m steps. That is planner work (open item 1). The walk's own line keeps
  0.64 m at 1.4 and 0.75 m at 2.1 m/s (0.36 + 0.2 v gave 0.78 m there and the 2.1 m/s walk's knees read 3.0-3.2 cm outside
  the ankles, e2e-anim speed 3 gate).
- **The run step cap 1.3 m (185 a minute at 4 m/s), not 1.4 (1.36 m, 176).** At 1.36 m the run's knees sat 3.2-3.5 cm
  outside the ankles (e2e-anim run gate <= 3), and from 1.38 m the 5.5 m/s dash swung its arms out of step with the legs
  (readyHands counter swing).
- **The walk pelvis 3 cm lower than the review's dy.** The rig adds its own reach drop at the double support (the pelvis
  drops until the longer leg reaches): 6.4 cm a step at the longer steps, on top of the keys. 3 cm lower (with the soft
  knee) brings that drop to ~0 and the keyed shape (low at the loading response, high at mid-stance) carries the bob.
- **Pelvis yaw 2.5 / 3.5 / 3 and the weight shift 1.5 cm / 3 deg, not 5 / 6 / 7 and 2 cm / 4 deg.** The anti-crab metrics
  are taken in the pelvis frame: a turned pelvis reads the forward foot off the line (walk track 7.3 cm at yaw 5, jog 8.0
  at 6; gate 7) and at 2.1 m/s the bigger sway put the knees 3 cm outside the ankles. Narrowing the feet to make room put
  the knees outside the ankles instead (jog 3.3, run 3.5). The chest carries the counter-rotation (-5 / -7 / -8, was -2 /
  -3.5 / -4.5): 7.5-11 deg between hips and shoulders at the heel strike, was 4-7.5.
- **`SOFT_KNEE_STAND` kept for the idle.** 0.988 standing still put 17.8 deg in the relaxed stand (g1 idle knee <= 13).

## Cadence and step length (standing, holstered)
| speed | before (slice 2) | after |
| --- | --- | --- |
| 1.4 m/s | 0.58 m, 145 steps / min | 0.637 m, 132 steps / min |
| 3.0 m/s | 1.02 m, 176 | 1.11 m, 162 |
| 4.0 m/s | 1.26 m, 190 | 1.30 m, 185 |

## Metrics after (e2e-anim `SOFT=1 CRAB_STATES=1 CRAB_JSON=1`, desktop, port 4192, holstered standing)
Before: S2-REPORT "After" (slice 2).
| gait / state | m/s | knees x hips mean (min-max) | track cm mean (min to max) | knee out cm | slide cm | elbow cm | out |
| --- | --- | --- | --- | --- | --- | --- | --- |
| walk | 1.45 | 0.75 (0.7-0.83) | 4.4 (3.4 to 6.2) | 2.4 | 0 | 2.6 | in |
| jog | 3 | 0.77 (0.63-0.92) | 4.3 (3.4 to 6.4) | 2.4 | 0 | 2.5 | in |
| run | 4 | 0.74 (0.61-0.9) | 4.1 (3.2 to 5.9) | 2.5 | 0 | 2.5 | in |
| speed 1 idle | 0 | 0.85 | 5.9 (5 to 6.8) | 1.9 | 0 | 2.3 | in |
| speed 1 start | 0.58 | 0.8 (0.78-0.85) | 5.7 (4.8 to 6.9) | 2.0 | 0 | 2.3 | in |
| speed 1 turn round | 0.39 | 0.8 (0.76-0.85) | 5.5 (5 to 6.4) | 1.8 | 0 | 2.3 | in |
| speed 2 idle | 0 | 0.95 (0.94-0.96) | 7.6 (6.8 to 8.4) | 1.1 | 0 | 3.7 | in |
| speed 2 start | 1.09 | 0.78 (0.72-0.85) | 5.1 (3.4 to 7.1) | 2.4 | 0 | 2.5 | in |
| speed 2 straight | 1.40 | 0.77 (0.7-0.83) | 4.4 (3.4 to 6.2) | 2.4 | 0 | 2.5 | in |
| speed 2 turn round | 0.39 | 0.8 (0.76-0.85) | 5.5 (5 to 6.6) | 1.8 | 0 | 2.3 | in |
| speed 3 idle | 0 | 0.95 (0.94-0.96) | 7.6 (6.7 to 8.5) | 1.1 | 0 | 3.5 | in |
| speed 3 start | 1.62 | 0.79 (0.72-0.88) | 5.1 (3 to 7.7) | 2.7 | 0 | 2.6 | in |
| speed 3 straight | 2.10 | 0.79 (0.71-0.88) | 4.4 (3 to 6.7) | 2.7 | 0 | 2.6 | in |
| speed 3 turn round | 0.39 | 0.8 (0.76-0.85) | 5.5 (5 to 6.7) | 1.8 | 0 | 2.3 | in |

All gates on (walk / jog / run, the state gates idle / start / straight / stop / turn round): 265 ok, 0 fail. Report-only
as before: 90 / 180 deg changes (speed 3 knee out 13-15 cm, slice 2 open item, unchanged in kind).
Unit harness (g1Locomotion, NullEngine, 1.4 m/s): walk head bob <= 5 cm, 90 deg walk turn <= 6 cm (2.7 / 5.3 cm measured
at an intermediate key set; the final run is inside both bounds).

## Tests changed
- `g1Locomotion.test.ts`: step lengths and cadence (0.637 m / 132 a minute at 1.4, 0.7455 m at 2.1, 0.36 + 0.25 v line);
  walk head bob 0.035 -> 0.05 (real walking bobs 3-5 cm); 90 deg turn head bob 0.04 -> 0.06 (the walk's bob plus the
  turn's one longer step); a 3 m/s start's first landing 0.35 -> 0.4 s (the 1.11 m step).
- `keyedWalk.test.ts`: the rig's arm compared with the pose it played (`t.keyed`, the pace-scaled swing) instead of the
  full-swing clip; elbow fore-aft 8 -> 13 cm, hand ahead 23 -> 35 cm and hand swing 0.35 -> 0.5 m at the full keyed swing
  (2 m/s; ~27 cm / ~0.39 m at 1.4 m/s); pelvis side sway 3 -> 4.5 cm; keyed bob 1.2 -> 3.5 cm.
- `motion.test.ts`: the walk step < 0.75 m; the sprint step <= `stepLenMax`.
- `turnFollow.test.ts`: the 7 rad/s slow-walk spin (planner harness): standing gaps 3 -> 1.5 cm (feet 1.8 cm apart in the
  pelvis frame, never crossed).
- `doorPeekParity.test.ts`: owner / copy ankles 2 -> 3 cm (the copy's last longer walk step, 2.6 cm).
- No script literal needed a change: `scripts/` reads the speeds through `GEARS`, no step / cadence / head-bob literal.

## Checks (desktop, `heavy.lock` held with noclobber for each run, E2E_JOBS=2)
| check | result | time |
| --- | --- | --- |
| Blender bakes walk / jog / run (`-b`, 5.2.2) | ok, every round | 5-13 s each |
| `npm run check` (lint 0 errors, 190 files / 2090 tests, build), final tree | pass | 107 s |
| e2e-anim `CRAB_STATES=1` (4192), all gates | pass, 265 ok | 30 s |
| e2e-move (4192) | pass | 178 s |
| e2e-pad | solo pass on the final tree (KNOWN FLAKY: killed past 600 s when run beside e2e-mouse) | 466 s |
| e2e-mouse | solo pass on the final tree; earlier runs failed at "remap ... play" (a load flake, open item 2) | 291 s |
| GPU sheets (4189, before = master b125599e build, after = this tree) | ok | ~30 s a set |

## Sheets (`docs/anim-rework/shots/s2b/`, before over after)
`walk-side.png`, `walk-ots.png` (the gameplay camera), `jog-side.png`, `run-side.png`. Before: a build of master
b125599e (slice 2); after: this tree, 12 frames at 0.1 s each.

What Michael should look at on /ct/ (holstered, standing): the walk's arms swing from the shoulder with the elbows bending
on the forward swing, the chest turning against the hips, the weight moving over each foot, fewer and longer steps; at
the jog and run the hands pass the hip on the back swing.

## Open items
1. Post-turn swing timing (planner): after a 450 deg/s walk turn the turned foot lands short and the next stride spreads
   the feet ~0.86 m. It blocks the review's 0.71 m / 118 a minute walk (the pelvis then dips 12 cm in a 90 deg turn) and
   is the same family as slice 2's 90 / 180 deg open item. Next: land the late, compressed clock swing ahead on the
   clock's spot (`FootPlanner`, the `FRESH_LATE` / `OFF_FADE` landing sets down where the foot is), then raise
   `WALK_STEP` to 0.36 + 0.25 v.
2. e2e-mouse "remap ... play": the suite opens a second page (`autostart=proving`) while its first browser still runs a
   match in software GL and waits 60 s for the player. Under load that load runs past 60 s on both builds: it failed 4 of 5 runs on this branch and 1 of 2 on a
   master b125599e build (same step, same timeout); a probe measured the second page's load beside a running match at
   168 s (this tree) and 212 s (master), 14 s without it. The final tree passed solo (291 s). Not caused by S2b; worth a
   longer wait or closing the first browser before the remap block (`scripts/e2e-mouse.mjs`), and the flaky list.
3. The pelvis-frame anti-crab metrics cap the pelvis yaw (5 deg read the forward foot 7.3 cm off the line): a hip-frame
   track that ignores the pelvis twist would let the hips turn as far as real walking does. Michael's eye first.
4. The run cap 1.3 m (185 a minute at 4 m/s, real 165-180): the run's knees read outside the ankles at 1.36 m; with a
   pole fix the cap could go to 1.36.
5. Not run here (the job lead sends them): e2e-ctcourse, e2e-coop, e2e-netmove (laptop). The step constants reach remotes
   through the same `stepLength`; no wire change (PROTOCOL_VERSION unchanged).

## Files changed
src: `anim/animGraph.ts` (`KEYED_WALK_BAND.ampMin`), `anim/motion.ts` (`WALK_STEP` l0 / k, `CROUCH_STEP.l0`),
`config/movement.ts` (`stepLen0`, `stepLenK`), `player/characterRig.ts` (`SOFT_KNEE_WALK`, `SOFT_KNEE_TAU`, the eased
`softMove`), `anim/clips/keyed/{walk,jog,run}.ts` (generated). Keys: `scripts/anim-keys/keys/{walk,jog,run}.json`. Tests:
listed above. Docs: this report, `CHANGELOG.md`.

## #67 parked (2026-10-21)
- Fixed and pushed (2b9904c0): the e2e-anim pop "holstered running: crouch -> stand" (wristR 9.2 cm a frame, limit 7.5).
  The crouch's speed cap sweeps the holstered keyed blend from the re-keyed jog arms to the walk arms in about 8 frames;
  `KEYED_GAITS.paceTau` 0.1 s eases the pace the blend reads (`anim/animGraph.ts`, `sPace` before `keyedSet`). After: 5.1
  cm; crouch 0.70x / 2.4 cm, sneak 0.68x / 1.8 cm, walk 0.75x / 2.6 cm (unchanged). e2e-anim, e2e-move, e2e-clip, check pass.
- Open: e2e-stealth-ai "a peek past the edge exposes the head alone to spots round the corner (null)". Master passes it
  on one spot only (cover segment 149, 1 head-only spot, the spawned guard at 0.25, -11.75). Cause, from
  `scripts/probe-wall-peek.mjs` (segment 149, master 1760cf36 vs this branch): S2b's step line, `stepLen0` 0.36 /
  `stepLenK` 0.25 (`src/config/movement.ts:51-52`) with `WALK_STEP` l0 0.42 / k 0.155 (`src/anim/motion.ts:99`), makes the
  0.39 m/s wall slide's steps 0.46 m instead of 0.38 m, so the slide stops on other feet (left ankle 9.2 cm past the
  edge, master -3.1). The peek's hip shift then leaves the head and chest 15.9 cm past the edge, master 13.8 cm. The
  spawned guard then sees the chest too. Putting the three values back to master's (0.3 / 0.24, WALK_STEP 0.3 / 0.2)
  gives master's pose exactly (head -18.0 -> 13.8 cm).
- Tried, no effect: SOFT_KNEE_WALK back to 0.997; the old step line for `lateral` > 0.9 in `stepLength`; the graph's
  gait clock on a wall with the crouched line (`i.wall ? 1 : crouch` at animGraph.ts:860 and :1959). The planner's
  steps follow the MotionDriver's clock (`motion.ts:491`, `gaitRate(..., i.crouch ...)`), which has no wall input.
- Next: give the MotionDriver input a wall flag (player -> driver) and, on a wall, use `CROUCH_STEP` (the pre-S2b line)
  in `gaitRate` at motion.ts:491, as the crouched gaits do; or make the stealth check less marginal (it rides on one
  spot). Then e2e-stealth-ai, e2e-wall, e2e-anim (CRAB_STATES=1), check. The master merge (4.27.0) and the tuneStep
  patch (`tests/tuneStep.test.ts` 6 -> 4 cm) wait for that.
