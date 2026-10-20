# Slice 3 report: drawn locomotion, low ready and aiming, the glide, the sling draw

Implementer (Opus), 2026-10-20 20:24-21:40, uncommitted in `feature/ct-prototype` (base eb5125d2). Scope: PLAN slice 3,
standing drawn (crouched drawn kept on the old path for slice 4), rifle and pistol, real-world operator technique (BRIEF
section 3), never traced.

## What was built
- **The drawn keyed set** (`AnimGraph.keyedDrawnSet`, `AnimInput.keyedDrawn`: a carrier, the player or a remote player,
  with the gun in hand, standing on foot, not on a wall, a door settle or holding a guard). It replaces the old walk band
  for drawn states and mixes in by its share (`RigTargets.keyDrawn`, eased with the keyed weight, `KEYED_WALK_BAND.tau`):
  - still: `ready_stance` (8 s cycle, `READY_STANCE`), the support foot 9 cm ahead and the strong foot 9 cm behind (an
    18 cm stagger), hip width;
  - low ready moving: the S2 speed set's legs and trunk (`speedSet`, split out of `keyedSet`): walk, jog, run, no lean
    below the run (M6);
  - aiming (by the eased raise): the glide by the smoothed local direction, `glide_fwd` / `glide_back` mixed with
    `glide_strafe` (right as keyed, the left mirrored half a cycle on: `keyed.mirrorKeyed`), `ready_stance` still.
    Its pelvis offsets ride on the procedural pose (the clip's swing about its mean, `dynPel`); its trunk is not
    applied (`RigTargets.keyTrunk` = 1 - drawn x raise), so the upper body stays the procedural gun platform. Arms
    stay procedural (hand IK on the gun) in every drawn state (`keyArmW` 0).
  - leg values for the planner: the clips' duty and lift; track `GLIDE.halfK` 0.8 (fwd / back) and `halfKSide` 0.9
    (strafe) of the clips' half-widths; knee pole `GLIDE.kneeOut` -0.05 / `kneeOutSide` -0.08 (a little in).
- **The glide shuffle** (fixes the crab): `motion.GLIDE_STEP`, aimed and standing only (`stepLength` / `gaitRate`
  `glide`: the driver's `aiming`, the graph's raise for remotes): a side-step `0.075 + 0.05 x speed` m (each foot
  travels two steps a cycle: the feet open by that much past the close), back-steps 35 % shorter, every aimed step at
  most `0.25 + 0.15 x speed` m. `footPlanner.GLIDE_GAP` 9 cm: the closing foot comes in to it (`PlannerInput.glide`;
  13 cm `minGap` elsewhere); the feet never cross. The hips ride over the feet across the body (`characterRig.GLIDE_HIP`,
  share 1, max 9 cm, 0.08 s) and the stepping pelvis twist is cut (`GLIDE.yawCut` 0.85).
- **Aimed strafe speed** `MOVEMENT.strafeMult` 0.9 -> 0.5: 0.7 m/s at full stick (was 1.26). A short-step shuffle that
  never crosses cannot cover 1.26 m/s at a believable cadence (it spread the feet up to 1 m). Now 4 steps a second at a
  slow stick, 6.4 at full stick. Assumed decision for Michael (see open items). ENEMY_MOTION unchanged.
- **Upper body** (procedural targets adjusted, nothing rebuilt):
  - rifle low ready `READY_POSES.low` pitch 0.8 -> 0.68, yaw -0.6 -> -0.22, roll 0.2 -> 0.08: muzzle 39 deg down, 13 deg
    inboard (was 46 deg and 34 deg across the body);
  - pistol low ready `PISTOL_READY` (by the light gun's weight): a compressed ready close to the lower chest, muzzle
    40 deg down, 3 deg off the facing (it used the rifle's low ready);
  - elbows: `AIM_ELBOW_TUCK` 0.6 -> 0.85, new `READY_ELBOW_TUCK` 0.5 with a gun in the hands: rifle elbows 4 cm out
    (were 6.6-8.4);
  - rifle aim and pistol isosceles: unchanged (head tilt 6 / 3 deg, arms extended, not locked).
- **The sling draw (M2)**: LT from holstered with the rifle runs its own path: `STANCE.slingDrawLong` 2.5 x the 0.3 s draw =
  0.75 s (pistol keeps `slingDrawMult` 1.6); `WeaponModel.beginTravel(..., sling)`, the grip via `TRAVEL_VIA.sling`
  (low beside the right hip, under the arm) and `backDiag.diagTurnSling` (the holster's turn backwards: round the right
  side in the back's plane to muzzle down, top forward, then the muzzle swings up onto the line into the shoulder; never
  muzzle up over the shoulder). Smoothstep on the travel as every draw.
- **Transitions**: holstered <-> low ready and low ready <-> aim keep their existing times and curves (draw 0.3 s,
  raise / lower 0.3 s, smoothstep); the drawn keyed share and the ready stagger ease (0.08 s / 0.25 s); stand <-> crouch
  drawn fades the set out with the crouch blend. e2e-anim's pose continuity now runs aimed crouch / stand, aim release
  to low ready, low ready to aim and the low ready walk strictly: max 0.084 (limit 1).
- **Co-op**: no wire change (PROTOCOL_VERSION 24). A remote copy runs the same set from its own `dw` (gun in hand) and
  aim; its glide steps come from the graph's raise. The sling draw path is local only: a remote's draw poses from `dw`
  as before.
- Hot paths allocate nothing (scratch poses `kC` / `kD` / `kE`, `pLow`; `hyp2` only).

## Numbers used
| constant | value | where |
| --- | --- | --- |
| READY_STANCE | period 8 s, lead 0.09 m, tau 0.25 s | animGraph.ts |
| GLIDE | ampMin 0.4, full 1.0 m/s, halfK 0.8, halfKSide 0.9, kneeOut -0.05, kneeOutSide -0.08, yawCut 0.85 | animGraph.ts |
| GLIDE_STEP | lat0 0.075, latK 0.05, back 0.35, fwd0 0.25, fwdK 0.15 | motion.ts |
| GLIDE_GAP | 0.09 m | footPlanner.ts |
| GLIDE_HIP | share 1, max 0.09 m, tau 0.08 s | characterRig.ts |
| strafeMult | 0.9 -> 0.5 | config/movement.ts |
| READY_POSES.low | pitch 0.68, yaw -0.22, roll 0.08 | animGraph.ts |
| PISTOL_READY | x -0.08, y -0.05, z -0.1, pitch 0.7, yaw -0.05 | animGraph.ts |
| AIM_ELBOW_TUCK / READY_ELBOW_TUCK | 0.85 / 0.5 | animGraph.ts / characterRig.ts |
| slingDrawLong | 2.5 (0.75 s) | weaponStance.ts |
| TRAVEL_VIA.sling | [0.3, -0.22, 0.14] (chest frame) | weaponModel.ts |
| CRAB_STRAFE | knees 0.5-1.5, track 0.2 m (written reason in limits.ts) | audit/limits.ts |
| DRAWN_POSE | rifle 28-47 deg down, pistol 20-50, readyYaw 25, headTilt 14 | audit/limits.ts |

## Metrics (e2e-anim, `CRAB_STATES=1 CRAB_JSON=1`, desktop, port 4191)
Before: the HEAD build (eb5125d2) measured with this slice's e2e-anim (the drawn rows are new), aimed rows after 0.6 s of
moving. After: this tree, aimed moving rows after 1.2 s (the steady glide: a slow back-step needs that long to re-step the
ready stance's feet). Ranges: knees 0.5-1.1 (strafe 1.5), track <= 7 cm (idles 10.5, strafe 20), knee out <= 3,
slide < 1, elbows <= 6.

### Before
| state | m/s | knees x hips mean (min-max) | track cm mean (min to max) | knee out cm | slide cm | elbow cm |
| --- | --- | --- | --- | --- | --- | --- |
| rifle aimed idle | 0 | 1.12 (1.12-1.12) | 8.3 (7.7 to 8.9) | 1.7 | 0 | 6.7 |
| rifle aimed strafe right speed 1 | 0.65 | 1.77 (1.07-2.52) | 19.3 (-6.5 to 46.4) | 10.3 | 0 | 7.2 |
| rifle aimed strafe right speed 2 | 1.22 | 2.08 (1.15-2.91) | 23 (-9.6 to 55.3) | 12.5 | 0 | 7.1 |
| rifle aimed strafe left speed 1 | 0.65 | 1.86 (1.11-2.6) | 18.5 (-5.9 to 47.5) | 10 | 0 | 7 |
| rifle aimed strafe left speed 2 | 1.22 | 1.95 (1.14-2.86) | 19.5 (-9.7 to 51.9) | 12.3 | 0 | 7.1 |
| rifle aimed backwards speed 1 | 0.55 | 1.23 (1.19-1.27) | 8.1 (6.9 to 10.4) | 3.2 | 0 | 6.9 |
| rifle aimed backwards speed 2 | 1.02 | 1.24 (1.2-1.27) | 8.2 (6.9 to 10) | 3.4 | 0 | 6.9 |
| rifle aimed forward speed 1 | 0.73 | 1.17 (1.12-1.22) | 7.1 (6.8 to 7.6) | 3.9 | 0 | 6.8 |
| rifle aimed forward speed 2 | 1.36 | 1.16 (1.06-1.22) | 7.3 (6.7 to 9.4) | 3.7 | 0 | 7.1 |
| rifle low ready idle | 0 | 1.12 (1.12-1.12) | 8.3 (7.7 to 8.9) | 1.7 | 0 | 8.4 |
| rifle low ready walk speed 4 | 1.4 | 0.76 (0.71-0.81) | 4.4 (3.5 to 5.7) | 2.4 | 0 | 6.6 |
| rifle low ready jog speed 4 | 2.91 | 1.28 (1.18-1.42) | 8.4 (6.6 to 12.1) | 3.2 | 0 | 11.6 |
| pistol aimed idle | 0 | 1.11 (1.11-1.11) | 8.1 (7.7 to 8.6) | 1.7 | 0 | -1.6 |
| pistol aimed strafe right speed 1 | 0.67 | 1.79 (1.07-2.53) | 19 (-6.5 to 46.1) | 10.2 | 0 | -1 |
| pistol aimed strafe right speed 2 | 1.26 | 2.08 (1.15-2.93) | 22.5 (-9.2 to 55.6) | 12.6 | 0 | -1 |
| pistol aimed strafe left speed 1 | 0.67 | 1.85 (1.11-2.6) | 18.9 (-5.6 to 47.7) | 10.1 | 0 | -1 |
| pistol aimed strafe left speed 2 | 1.26 | 1.96 (1.13-2.89) | 20.2 (-10 to 52.7) | 12.5 | 0 | -1 |
| pistol aimed backwards speed 1 | 0.56 | 1.23 (1.2-1.27) | 8.1 (6.9 to 10.4) | 3.2 | 0 | -1.3 |
| pistol aimed backwards speed 2 | 1.05 | 1.25 (1.2-1.28) | 8.2 (6.9 to 10.1) | 3.4 | 0 | -1.3 |
| pistol aimed forward speed 1 | 0.75 | 1.17 (1.12-1.22) | 7 (6.8 to 7.5) | 3.9 | 0 | -0.9 |
| pistol aimed forward speed 2 | 1.4 | 1.16 (1.06-1.22) | 7.4 (6.6 to 10.1) | 3.7 | 0 | -0.6 |
| pistol low ready idle | 0 | 1.12 (1.12-1.12) | 8.3 (7.7 to 8.9) | 1.7 | 0 | 8 |
| pistol low ready walk speed 4 | 1.45 | 0.76 (0.71-0.81) | 4.4 (3.5 to 5.7) | 2.4 | 0 | 6.7 |
| pistol low ready jog speed 4 | 3 | 1.29 (1.18-1.43) | 8.4 (6.5 to 12.3) | 3.3 | 0 | 11.2 |

### After
| state | m/s | knees x hips mean (min-max) | track cm mean (min to max) | knee out cm | slide cm | elbow cm |
| --- | --- | --- | --- | --- | --- | --- |
| rifle aimed idle | 0 | 0.94 (0.94-0.94) | 7.5 (7.4 to 7.6) | 0.7 | 0 | 3.6 |
| rifle aimed strafe right speed 1 | 0.36 | 0.89 (0.63-1.15) | 9.1 (3.6 to 16) | 1.6 | 0 | 4.2 |
| rifle aimed strafe right speed 2 | 0.68 | 0.91 (0.63-1.23) | 9.3 (3.3 to 17.9) | 1.8 | 0 | 4.1 |
| rifle aimed strafe left speed 1 | 0.36 | 0.88 (0.63-1.15) | 8.9 (3.3 to 16) | 1.7 | 0 | 4.1 |
| rifle aimed strafe left speed 2 | 0.68 | 0.94 (0.63-1.23) | 10 (3.3 to 18) | 1.8 | 0 | 4.1 |
| rifle aimed backwards speed 1 | 0.55 | 0.7 (0.68-0.71) | 4.5 (3.6 to 5.5) | 1.9 | 0 | 4.1 |
| rifle aimed backwards speed 2 | 1.02 | 0.69 (0.68-0.71) | 4.4 (3.1 to 6) | 2.1 | 0 | 4.1 |
| rifle aimed forward speed 1 | 0.73 | 0.69 (0.67-0.7) | 4.5 (3.6 to 5.3) | 2.2 | 0 | 4 |
| rifle aimed forward speed 2 | 1.36 | 0.7 (0.66-0.76) | 4.8 (3.3 to 6.9) | 2.4 | 0 | 4.2 |
| rifle low ready idle | 0 | 1 (1-1) | 8.5 (8 to 8.9) | 1.8 | 0 | 4.4 |
| rifle low ready walk speed 4 | 1.4 | 0.76 (0.71-0.81) | 4.4 (3.5 to 5.7) | 2.4 | 0 | 3.5 |
| rifle low ready jog speed 4 | 2.91 | 0.76 (0.64-0.88) | 4.4 (3.7 to 5.9) | 2.2 | 0 | 4.7 |
| pistol aimed idle | 0 | 0.94 (0.94-0.94) | 7.6 (7.4 to 7.7) | 0.6 | 0 | -4.5 |
| pistol aimed strafe right speed 1 | 0.37 | 0.88 (0.63-1.15) | 9.1 (3.8 to 16.1) | 1.6 | 0 | -3.8 |
| pistol aimed strafe right speed 2 | 0.7 | 0.92 (0.63-1.24) | 9.5 (3.4 to 17.8) | 1.8 | 0 | -3.9 |
| pistol aimed strafe left speed 1 | 0.37 | 0.88 (0.63-1.15) | 9.1 (3.7 to 16.1) | 1.7 | 0 | -3.8 |
| pistol aimed strafe left speed 2 | 0.7 | 0.94 (0.63-1.24) | 10 (3.3 to 18.2) | 1.8 | 0 | -3.9 |
| pistol aimed backwards speed 1 | 0.56 | 0.7 (0.68-0.71) | 4.5 (3.5 to 5.5) | 1.9 | 0 | -4 |
| pistol aimed backwards speed 2 | 1.05 | 0.69 (0.68-0.71) | 4.4 (3.1 to 6) | 2.1 | 0 | -4 |
| pistol aimed forward speed 1 | 0.75 | 0.69 (0.67-0.7) | 4.5 (3.6 to 5.3) | 2.2 | 0 | -3.7 |
| pistol aimed forward speed 2 | 1.4 | 0.7 (0.67-0.76) | 4.8 (3.3 to 7) | 2.5 | 0 | -3.4 |
| pistol low ready idle | 0 | 1 (1-1) | 8.5 (7.5 to 9.5) | 2.1 | 0 | 3 |
| pistol low ready walk speed 4 | 1.45 | 0.76 (0.71-0.81) | 4.4 (3.5 to 5.7) | 2.4 | 0 | 2.4 |
| pistol low ready jog speed 4 | 3 | 0.76 (0.64-0.89) | 4.4 (3.7 to 6) | 2.2 | 0 | 3.3 |

Upper body (e2e-anim drawn pose, asserted):

| | rifle before | rifle after | pistol before | pistol after |
| --- | --- | --- | --- | --- |
| low ready muzzle down (deg) | 45.8 | 39.0 | 45.8 (the rifle's pose) | 40.1 |
| low ready muzzle off the facing (deg) | -34.4 | -12.6 | -34.4 | -2.9 |
| aiming head tilt (deg) | 6.0 | 6.0 | 3.1 | 3.1 |

The holstered rows (walk / jog / run, S2's gated sub-states) are unchanged (walk 1.45 m/s knees 0.75, track 4.4 max 5.7).

## Gates
- New `CRAB_DRAWN_GATES` (all on), `CRAB_DRAWN_CHECKS`, `crabDrawnRanges`, `CRAB_STRAFE`, `DRAWN_POSE` in `limits.ts`.
  Every drawn state asserts every metric except the aimed forward's track (report-only: 6.9-7.0 cm at the aim's
  1.4 m/s top, the trailing foot 25 cm behind at toe-off in the pelvis' few degrees of stepping twist; mean 4.8). The
  aimed strafe also asserts the feet never cross (track min > -0.5 cm; min 3.3 cm).
- The old walk table's "strafe / backwards (aiming)" rows stay report-only against the walk's ranges.


## Tests changed
| file | change |
| --- | --- |
| tests/keyedDrawn.test.ts (new) | mirrorKeyed; the glide steps aimed only; the graph's drawn share, trunk share, ready stagger, strafe knee pole, the left mirror without a jump, crouched / holstered off |
| tests/backDiag.test.ts | the sling draw turn: never through 'up', through 'down', ends at the pocket |
| tests/footPlanner.test.ts | `simulate(..., glide)`; new aimed glide strafe test (close >= GLIDE_GAP - 1 cm, open < 42 cm, no slide) |
| tests/tactical.test.ts | strafe mult 0.9 -> 0.5 |
| scripts/e2e-anim.mjs | drawn crab states (rifle, pistol), the drawn pose asserts, drawn pose-continuity segments; `crabRecord` weapon and drawn options (the holstered recordings keep their gun) |
| scripts/e2e-clip.mjs | new "sling draw + glide" (the sling draw, strafe both ways, back, low ready, crouch and stand drawn) |
| scripts/e2e-move.mjs | aimed strafe 1.1-1.35 -> 0.6-0.78 m/s |
| scripts/anim-sheet.mjs | scenarios lowreadywalk, aimback, aimstrafep, readytoaim |

## Results
| check | result | time |
| --- | --- | --- |
| e2e-anim before (HEAD, CRAB_STATES) | pass (old gates) | 18 s |
| e2e-anim after, hard (gated) | pass, 265 ok | 23 s |
| `npm run check` | pass (0 errors, 187 files / 2058 tests, build) | 84 s |
| `E2E_PORT=4191 E2E_JOBS=2 npm run e2e:quick` | 11 ok; e2e-stealth FAIL ("view follows every bit of look input", wall-clock, known in STATE) | 340 s |
| e2e-stealth solo | pass | 28 s |
| e2e-pad + e2e-mouse (JOBS 2) | e2e-mouse ok; e2e-pad KNOWN FLAKY (a 30 s waitForFunction) | 130 s |
| e2e-pad solo | pass (sling draw 0.78 s vs X 0.48 s) | 195 s |
| e2e-clip (in quick; and solo) | pass; sling draw + glide: gun clear of the legs 2.5 cm, head 1.5, trunk 0.5; knees 11.1, feet 9.0 apart | 8 s |
| GPU sheets (4189, before + after) | ok | ~1.5 min a set |

Not run (the job lead sends them): e2e-ctcourse, e2e-coop, e2e-netmove. `src/player`, `src/anim` and `src/weapons`
changed: e2e-netmove's pose parity (a remote's glide steps come from its graph's raise) is the one to watch.

## Files
src: `anim/animGraph.ts` (keyedDrawnSet, speedSet, dynPel, glideK, backShare, READY_STANCE, GLIDE, PISTOL_READY,
READY_POSES.low, AIM_ELBOW_TUCK), `anim/keyed.ts` (mirrorKeyed), `anim/motion.ts` (GLIDE_STEP, stepLength / gaitRate
back and glide), `anim/footPlanner.ts` (GLIDE_GAP, PlannerInput.glide), `anim/audit/limits.ts` (drawn gates, CRAB_STRAFE,
DRAWN_POSE), `player/characterRig.ts` (keyedDrawn, the drawn keyed weight, keyTrunk, GLIDE_HIP, READY_ELBOW_TUCK,
pin.glide), `player/weaponStance.ts` (slingDrawLong), `weapons/backDiag.ts` (diagTurnSling), `weapons/weaponModel.ts`
(the sling travel), `weapons/playerWeapons.ts` (the sling draw's time and travel), `config/movement.ts` (strafeMult).
Docs: this report, `METRICS.md` (slice 3 section), `CHANGELOG.md` (Unreleased - anim-rework), `TESTING.md`,
`docs/systems/{movement,combat,world-and-characters,testing-tools}.md`.

## Sheets (`docs/anim-rework/shots/s3/`, before over after)
`lowreadywalk-ots/-side`, `aimstrafe-front` (rifle), `aimstrafep-front` (pistol), `aimback-front/-side`,
`aimpistol-ots/-side`, `draw-ots/-side` (the sling draw), `readytoaim-ots/-side`. The strafes are shown from the front
(the side and gameplay views hide the legs).

## What Michael should try on /ct/
- X to low ready, stand still (the staggered ready stance, knees soft), walk and run (upright, the muzzle down in front
  of the feet).
- Hold LT and strafe both ways at a slow and a full stick: short side-steps, the feet never cross or splay, the gun
  steady. Then back up and walk forward aiming.
- From holstered, pull LT: the rifle comes off the back round the right side, muzzle down under the arm, up into the
  shoulder (0.75 s). The pistol (switch to it) still draws as before, a little slower.
- The pistol at low ready (close to the chest, muzzle down) and aimed.
- Crouch and stand while aiming: no pop (crouched drawn is still the old pose, slice 4).

## Open items / not done
- Assumed: the aimed strafe is 0.7 m/s at full stick (was 1.26). Undo: raise `MOVEMENT.strafeMult` (with longer
  `GLIDE_STEP.lat0 / latK` steps the feet then open wider). At full stick it is a quick shuffle (6.4 steps a second):
  Michael's eye.
- No crossover step at speed (BRIEF: "crossing over only at speed"): the cap keeps every aimed strafe a shuffle.
- The pistol aim leans the chest forward over the gun (PISTOL_REACH.lean, from G2): it reads hunched in
  `aimpistol-side`. Not changed (head upright, arms extended); polish.
- The sling draw's last swing up (muzzle down to the line) is quick, about the last 0.15 s; the rifle sits a little high
  for a frame or two before it settles on the line (`draw-side`).
- The aimed forward at 1.4 m/s reads 6.9-7.0 cm track (report-only).
- Crouched drawn unchanged (slice 4); the crouched aimed strafe is slower by the strafe mult.
- The sling draw path is local only (a remote draws from `dw`), as before.
- Not measured: the GPU look beyond the sheets, the perf budgets (the drawn set adds a few keyed samples per carrier per
  frame, no allocation).

## STATE draft (for "Now")
- Slice 3 implemented (uncommitted, `S3-REPORT.md`): standing drawn plays keyed legs (the ready stance still, the S2 set
  at low ready, the glide aiming: forward / back / strafe, the left mirrored); the aimed strafe crab fixed with a short
  shuffle that never crosses (`GLIDE_STEP`, `GLIDE_GAP`, `GLIDE_HIP`; strafe 0.7 m/s, assumed); rifle low ready 39 deg
  down and forward, the pistol's compressed ready, elbows in; the M2 sling draw (0.75 s, under the arm, up into the
  shoulder). CRAB_DRAWN_GATES all on (the aimed forward's track report-only); the CRAB_STRAFE range with a written
  reason.
- Checks: npm run check pass (2058); e2e-anim pass; e2e:quick pass except e2e-stealth (solo pass); e2e-pad flaky in a
  pair, solo pass; e2e-mouse pass. Next: the independent check, laptop e2e-ctcourse / e2e-coop / e2e-netmove, Michael
  on /ct/ with `shots/s3/`.
