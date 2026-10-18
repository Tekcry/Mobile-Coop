# Audit (a): src/anim, the shared CharacterRig, remote posing

Explore agent report, step 1. Rig = `src/player/characterRig.ts` (1587 lines). Remotes use it via `src/net/remoteAvatar.ts`; guards via `src/net/enemyPuppet.ts:199` and the AI. Clips are code-authored keyframes (`makeClip`). All clips blend through `Inertializer` (`pose.ts:98`) plus a per-joint rate limiter (`characterRig.ts:1364`, `JOINT_RATE` `:153`).
Remotes get MoveState `mode` (`moveState.ts:12-45`) but NOT `motion`, `accelFwd/Side`, `intent`, `quickStop`, `holdSpeed`, `yawRate` (`remoteAvatar.ts:270-302`).

## 1. Inventory
| item | owner | trigger | duration | contacts | interrupts | net | file:line |
|---|---|---|---|---|---|---|---|
| AnimGraph lower states: locomotion, crouch, kneel, air, slide, cover, traverse | animGraph.ts | `pickLower` | fade 0.2 s (0.12 slide / traverse, 0.35 kneel) | feet via planner | `inert.trigger` | yes (mode drives traverse / cover) | animGraph.ts:43,261,418,490 |
| Gait blend standing: creep 0.7 / walk 1.4 / jog 2.8 / dash 5.0 m/s | clips/locomotion.ts | speed | phase-keyed | planner | blend | yes (speed) | locomotion.ts:271-277 |
| Gait blend crouch: sneak / crouchWalk 1.8 / crouchRun 2.6 | locomotion.ts | speed + crouch | cycle | planner | blend | yes | locomotion.ts:280-285 |
| walkBack, strafe R/L, crouchBack, crouchStrafe R/L | locomotion.ts | aim strafe lock | cycle | planner | blend | yes | locomotion.ts:138,154,168,186,199,212 |
| idle / crouchIdle / kneel | locomotion.ts | still > 2 s | 4.8 / 4.2 / 3.6 s loop | planner idle steps | stance blend | yes | locomotion.ts:30,44,251; animGraph.ts:438-441 |
| startShift | clips/actions.ts | motion=='start' | 0.7 s | hips over support foot | none | NO (needs `motion`) | actions.ts:188; animGraph.ts:543,549 |
| stopSettle | actions.ts | stop / pivot -> idle | 0.55 s | planner quick stop | none | NO | actions.ts:201; animGraph.ts:544,553 |
| pivot | actions.ts | motion=='pivot' | 0.3 s (enemy 0.6) | pivot foot | inert | NO | actions.ts:212; animGraph.ts:560; config/movement.ts:62 |
| land | actions.ts | landing > 0.5 | 0.6 s | both feet | none | yes (`landing`) | actions.ts:308; animGraph.ts:612 |
| slide, vault, mantle, stepUp, drop | actions.ts | traverse / slide | move progress | clip | inert | yes | actions.ts:289,223,243,265,277 |
| hang, climb, crawl, climbUp, ventDrop, windowVault, split, wallKick, pipeLegs, pipeInv, rappel, brace, roll | clips/traverse.ts | traverse kind | normalized / cadence | `AttachGrips` / `GripStepper` | inert | yes (zipline, fence: no dedicated clip) | traverse.ts:15,42,73,104,129,154,184,211,236,263,287,312,338 |
| coverEnter, coverEnterSide, coverExit, coverTurn | actions.ts | cover | 0.8 / 0.8 / 0.5 / 1 s | support hand to wall | inert | yes (`cover`) | actions.ts:135,146,159,174; animGraph.ts:566-596 |
| reloadTactical / reloadEmpty / swap / grenade | actions.ts | weapon state | owner-driven | off hand | `prevAction` | partial | actions.ts:15,35,71,112; animGraph.ts:661-665,785-800 |
| melee (procedural sin arc) | animGraph.ts | `i.melee >= 0` | owner-driven | right hand | none | yes (`mp.melee`) | animGraph.ts:803-808 |
| Hit flinch spring | animGraph.ts | hitReact | omega 9 | - | additive | local | animGraph.ts:394,811 |
| Heel-strike pelvis spring | animGraph.ts | planner `landed` | omega 15, kick -0.45*mass | feet | additive | runs on remotes | animGraph.ts:280,400,815; characterRig.ts:1008 |
| Accel / turn lean springs (pitch accelFwd*0.025 clamp 0.14, roll clamp 0.08) + intentLean (tau 0.05, 0.1 rad) | animGraph.ts | accel / intent | omega 14 / 12 | - | additive | NO | animGraph.ts:624-632 |
| leanHead / leanBody springs | animGraph.ts | `i.lean` | omega 34/18, 24 | - | - | yes | animGraph.ts:668-674 |
| yawLag spring | animGraph.ts | yawRate | omega 10/mass | - | - | yes (derived) | animGraph.ts:675 |
| recoil spring | animGraph.ts | kick | omega 26/sqrt(mass) | - | - | yes | animGraph.ts:708 |
| duckS / overS | animGraph.ts | cover | omega 16 / 20 | - | - | yes | animGraph.ts:635,642 |
| supportX spring (0.012 m) | animGraph.ts | planner support | omega 10 | one foot | - | local | animGraph.ts:817 |
| pelBase spring (80% bob removed from weapon) | animGraph.ts | always | omega 6 | - | - | local | animGraph.ts:384,821-823 |
| Breathing (idle) | animGraph.ts | always (sin) | ~3.9 s | - | - | local | animGraph.ts:664 |
| Weapon sway (idle) | animGraph.ts | always (2 sines) | 4.8 / 9 s | - | - | local | animGraph.ts:707 |
| MotionDriver (start / move / stop / turn / pivot, rootModulation) | motion.ts | stick | per MOVEMENT | - | quick stop committed | NO | motion.ts:91,81,23 |
| FootPlanner | footPlanner.ts | per frame | cycle = 2*stepLen/speed | planted, PIN_TOL 0.04 | init=false on air / traverse | same code on remotes | footPlanner.ts:121,109,112,167 |
| Pelvis-drop solver | characterRig.ts | per frame | tau 0.012 down / 0.08 up | both feet | - | yes | characterRig.ts:1225-1247 |
| Leg IK (2-bone, knee-floor, knee-gap) | characterRig.ts | per frame | - | feet | - | yes | characterRig.ts:1477,1268-1285 |
| Arm IK (grip / foregrip / mag / wall / reach) | characterRig.ts | per frame | - | hands < 2 cm | - | yes | characterRig.ts:1410 |
| Head look (aim + look, world-stabilised) | characterRig.ts | per frame | rate 12 rad/s | - | - | yes (`mv.ay`, scaled 0.5) | characterRig.ts:1298-1305; remoteAvatar.ts:283 |
| Weapon pivot slerp lag 0.035 s | characterRig.ts | per frame | - | - | - | yes | characterRig.ts:1331-1334 |
| Cheek weld / sightToEye / clearBody | characterRig.ts | raise | - | - | - | yes | characterRig.ts:1504,1069,1343 |
| AttachGrips + GripStepper | attachGrips.ts / gripStepper.ts | attached modes | cadence | hands + feet | - | yes | attachGrips.ts:45; gripStepper.ts:49; remoteAvatar.ts:20 |
| Remote traverse replay | remoteAvatar.ts | new `mv.c.n` | `c.dur` | path | - | yes | remoteAvatar.ts:157-178 |
| Anim LOD (every other frame > 22 m) | characterRig.ts | distance | - | - | - | yes | characterRig.ts:206,866-875 |
| Joint rate limiter (pelvis 8, spine 8, neck 10, head 12, shoulder 22, elbow 24, hip 26, knee 30 rad/s) | characterRig.ts | per joint | - | - | - | yes | characterRig.ts:153,1364 |

Takedown, grab, boost, stacked: modes exist (`moveState.ts:34-44`); only `brace` has a dedicated clip (`traverse.ts:338`). No separate fence, rappel or drag clip.

## 2. Bob sources
Pelvis gait bob `bob(base, dip, rise, k)` (`locomotion.ts:18-23`): dip*0.55 at heel strike, rise*0.5 mid-stance. `GAIT_STYLE = {bob:0.55, rise:0.5, sway:1.2, twist:1.3}` (`locomotion.ts:16`). One low and one high per step.

| clip | dip / rise | p2p (m, arithmetic) | line |
|---|---|---|---|
| creep | 0.008 / 0.004 | 0.0064 | locomotion.ts:63 |
| walk | 0.012 / 0.006 | 0.0096 | :79 |
| brisk | 0.016 / 0.008 | 0.0128 | :95 |
| jog | 0.025 / 0.012 (k 0.5) | 0.0185 (checker: was 0.0125) | :112 |
| dash | 0.03 / 0.02 (k 0.45) | 0.0235 | :128 |
| crouchWalk | 0.012 / 0.004 | 0.0086 | :176 |
| sneak | 0.008 / 0.003 | 0.0059 | :221 |
| crouchRun | 0.02 / 0.01 | 0.016 | :239 |

- Lateral sway `pelX = sway(amp)*1.2`: walk 0.022 -> 2.6 cm peak, 5.3 cm p2p (`locomotion.ts:80`): over D2's 3 cm if p2p.
- `pelRoll`: walk 0.03 rad (`:81`); brisk / jog / crouchRun 0.035 rad (2 deg).
- `pelYaw` 0.04-0.12 rad (`:66,82,98,115,131`).
- Head pitch bob 0.005-0.02 rad (`:85,101,118,134`).
- `rootModulation` horizontal speed ripple (`motion.ts:81-83`, rootDip 0.025, `config/movement.ts:46`).
- Idle pelY +-2 mm (`locomotion.ts:34`); crouchIdle 5 mm (`:49`).
- Breathing `sin(idleT*1.6)*0.008` rad on spine in all states (`animGraph.ts:664,676`).
- Weapon sway (0.005 sin 1.3t + 0.003 sin 0.7t)*mass, 8 mm peak, never decays after a stop (`animGraph.ts:707,735,738`).
- Heel-strike spring: kick -0.45*mass, omega 15, every heel strike (`animGraph.ts:280,400`; `characterRig.ts:1008`): adds 1.5-3 cm dip per the comment. Main D2 risk.
- startShift pelY -1.2 cm / pelX -3.5 cm (`actions.ts:192-195`); stopSettle -1.6 cm (`:204`); pivot -3 cm (`:216`); land -16 then -5 cm (`:311`).
- Head position follows pelvis / spine (neck parented to torso).

## 3. D5 / D2 hooks
| item | exists | hook |
|---|---|---|
| D5.1 speed-scaled gait | partial: stride via `stepLength` (`motion.ts:73`), clip blend by speed; bob / pelvis height per clip, fixed unarmed swing 0.1 (`animGraph.ts:770`) | `animGraph.ts:435-471`, before `:826` |
| D5.2 accel / turn lean | exists locally (`animGraph.ts:624-632`); not on remotes | derive accel on remotes in `characterRig.animate` after `:942` (it measures velX/Z and yawRate) |
| D5.3 compression / settle | partial: land, stopSettle, heel spring | `animGraph.ts:553`, `:612`; exit settle where traverse -> none |
| D5.4 pivot + stride warping | pivot local only; no stride warping | `footPlanner.ts:150-300`; `motion.ts:300-310` |
| D5.5 exertion breathing | no | after `animGraph.ts:664`; drive from `dashS` (`:514`) / traverse |
| D5.6 trained posture, heel-to-toe | partial: HUNCH (`animGraph.ts:286`), soft knees `legLen*0.97` (`characterRig.ts:1229`), toe / heel pitch (`footPlanner.ts:442`) | `footPlanner.ts:420-454` |
| D5.7 weapon discipline | partial: `clearBody`, READY_POSES (`animGraph.ts:288`) | `characterRig.ts:1343`; carry weights `remoteAvatar.ts:194-201` |
| D5.8 look-at | partial: lookYaw / lookPitch (`player.ts:298`, `remoteAvatar.ts:283`) | `characterRig.ts:1298-1305` |
| D5.9 hand contact IK | partial: cover hand (`characterRig.ts:1443`), attach grips | `solveArm` `characterRig.ts:1410-1470` (reach `:1451`) |
| D5.10 stairs / slopes | partial: ground probe (`characterRig.ts:390`), pelvis drop only (`:1225-1247`) | same |
| D5.11 momentum traversal | not in rig | traversal.ts; `MoveCommit.dur` (`remoteAvatar.ts:157`) |
| D8 remotes | rig input omits motion / accel | `remoteAvatar.ts:270-302`: compute locally from speed and yaw delta |

## 4. Cost
- No `Math.hypot` in src/anim or the rig; `hyp2` (`core/mathx.ts:5`).
- `activeClips()` slice (`animGraph.ts:909`) debug only.
- `locomotion` runs twice during crouch blends (`animGraph.ts:524-525`).
- Leg IK up to 3 solves (`characterRig.ts:1268-1285`); `limitJoint` acos per joint (`:1371-1378`).
- Anim LOD is the only budget lever (`characterRig.ts:866`).
