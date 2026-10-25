# Locomotion audit (bible 5.12.4 step 1)

Purpose: the inventory, scoring and hook map that Blocks A-D build on. Every row is scored against bible 5.12.2 (`docs/design-bible.md:786-887`) and D2 / D5 / D8 (Section 5.17, `:1251-1318`). Location per ASSUMED A0 (this file, not `docs/animation-audit.md`). Cover clips are scored `remove` and not audited further (5.12.4).

Detail files (file:line evidence, removal maps): [a - anim and rig](audit/a-anim-rig.md), [b - player and camera](audit/b-player-camera.md), [c - removals](audit/c-removals.md), [d - vision, weapons, input, net](audit/d-vision-weapons-input-net.md).

## Baselines (STATE.md, step 0, this VM, software GL)
- Perf trend (`node scripts/perf-trend.mjs`, calib 9.9 ms): sim p95 2.65 ms, anim 0.0504 ms/char, alloc 11245 KB/s, draws 42, tris 0.14 M. +25% trip: sim 3.31 ms, anim 0.063 ms. Note: anim is already over the 0.04 ms D4 budget on this VM; the D4 verdict is a PC-PASS item.
- e2e-netmove (limit 10 cm, 121 s), worst joint error cm: low cover 0.5, low peek 3.7, high cover 1.9, high edge peek 3.5, ladder 0.3, pipeV 0.2, pipeH 0.2, ledge 0, duct 0.2, split 0, split aim 1.1, wall-jump hang 0.2, pipe legs 0.4, inverted 0.1, rappel 0.2, fence 0.8. (The four cover cases go with Block A.)
- Animation harness baseline (step 08 + fix round 3, `docs/locomotion/audit/anim-baseline.json`, two full runs, `--band`): local 554 fails (45 s; 690 before r1: the frozen camera's anim LOD halved the rig rate far from spawn), remote 100 / 101 fails (92-93 s incl. 9 s lobby; 13 remote scenarios, 120 Hz pump p95 jitter 0.9-1.4 ms; r1: 139 / 131 before the r3 placement settle), total 137-138 s (< 240 s). Local identical across the two runs (0 flips); remote is real time (17 remote flips between the runs); `--compare` gates remote `poseError` (gating part), `pops` at 60 Hz, `pairAlign` and `lodSkip` against the two runs' noise band; `lowerBody`, 120 Hz `pops` and the other remote metrics are report-only (A39). Values below: worst local 60 / 120 Hz (scenario); R = remote 60 / 120 Hz (step 08 r1 baseline; the r3 poseError numbers are in Section 4).

## 1. Inventory
Owner: `both` = shared `CharacterRig` / `AnimGraph` (guards via `enemyRig` / `enemyPuppet`). Net: the MoveState mode (or snapshot field) remotes pose from. Batch: 1-7 per 5.12.4, A = Block A removal, C = Block C build.

### 1a. Locomotion and stance (batch 1)
| ID | owner | trigger | duration | contacts | interrupt paths | net | status | batch | source |
|---|---|---|---|---|---|---|---|---|---|
| L01 lower-state graph (locomotion / crouch / kneel / air / slide / traverse) | both | `pickLower` | fade 0.2 s (slide / traverse 0.12, kneel 0.35) | feet via planner | `inert.trigger` | mode + speed | fix: kneel fade 0.35 s > 0.25 s (5.12.2.1) | 1 | animGraph.ts:43,261 |
| L02 standing gait blend creep / walk / jog / dash (0.7 / 1.4 / 2.8 / 5.0) | both | speed | phase-keyed | planner | blend | `ground` + speed | rework: D5.1 effort scaling (pelvis height, arm swing, lean by speed) | 1 | locomotion.ts:271-277 |
| L03 crouch gait blend sneak / crouchWalk / crouchRun | both | speed + crouch | cycle | planner | blend | `ground`; crouch not on wire | fix: crouch stance must be sent (D8) | 1 | locomotion.ts:280-285 |
| L04 walkBack, strafe L/R, crouchBack, crouchStrafe L/R | both | aim strafe lock | cycle | planner | blend | `ground` + `ay` | pass (harness to confirm) | 1 | locomotion.ts:138-212 |
| L05 idle / crouchIdle / kneel loops | both | still > 2 s | 4.8 / 4.2 / 3.6 s | planner idle steps | stance blend | `ground` | pass (5.12.2.8 breathe + shift) | 1 | locomotion.ts:30,44,251 |
| L06 startShift | both | motion = start | 0.7 s | hips over support | none | none (`motion` not sent) | fix: derive on remotes (D8) | 1 | actions.ts:188 |
| L07 stopSettle | both | stop / pivot -> idle | 0.55 s | quick stop | none | none | fix: D8 remote derive; D5.3 single damped settle | 1 | actions.ts:201 |
| L08 pivot clip | both | motion = pivot | 0.3 s (guard 0.6) | pivot foot | inert | none | fix: D8 + D5.4 (CT path bypasses it) | 1 | actions.ts:212; motion.ts:183-207 |
| L09 MotionDriver (start / move / stop / turn / pivot, rootModulation) | both | stick | per MOVEMENT | - | quick stop committed | none | fix: D8 remote derive from MoveState + velocity | 1 | motion.ts:23,81,91 |
| L10 travel turn 720 deg/s | player | stick | 180 deg in 0.25 s | - | - | yaw | pass (equals Quick 180 minimum, borderline) | 1 | motion.ts:346-356 |
| L11 stepped turn on the spot | both | aim leads feet | 0.785 rad / 0.3 s | feet | - | none | fix: D8 | 1 | motion.ts:318-326 |
| L12 Quick 180 (dedicated) | player | - | min 0.25 s | - | - | none | rework: missing (5.12.2 coverage) | 1 | - |
| L13 stand gears G1-G6 + instant start | player | stick x cap | 95% in 0.08 s | capsule | override | `ground` g | pass (5.12.1 instant control) | 1 | config/movement.ts:159-160; playerController.ts:70 |
| L14 analog speed, gear by button | player | stick | - | - | - | g | fix: D5.12 snapping + hysteresis | C | speedGears.ts:31-33,103 |
| L15 sprint (gear 6, no stamina) | player | sprint, mag > 0.3 | grace 0.15 s | - | aim, air, crouch | `ground` g=6 | pass | 1 | movement.ts:113-166 |
| L16 instant stop + stopHold | player | stick release 0.15 s | pose blend 0.12 s | - | input | `ground` | fix: stop-hold not on wire (D8) | 1 | playerController.ts:490-496; speedGears.ts:45-84 |
| L17 crouch / stand | player | crouch toggle / hold | 0.25 / 0.28 s | `hasHeadroom` | sprint stands | `ground` | fix: crouch-to-stand 0.28 s < 0.3 s; crouch not sent | 1 | playerController.ts:405-435; config/movement.ts:65-71 |
| L18 kneel (crouched still > 0.25 s) | both | stillness | - | - | input | cover `kneel` only | fix: D8 (ground kneel not sent) | 1 | playerController.ts:575-576 |
| L19 ADS strafe lock | player | aim | - | - | - | `ground` + `r`, `ay` | pass | 2 | movement.ts:36-39 |
| L20 FootPlanner (steps, PIN_TOL 0.04) | both | per frame | 2 x stepLen / speed | planted feet | reset on air / traverse | same code on remotes | fix: no stride warping (D5.4); 4 cm pin tolerance vs 1 cm slide | 1 | footPlanner.ts:109,121,167 |
| L21 pelvis-drop solver (stairs / wide steps) | both | per frame | tau 0.012 / 0.08 | feet | - | yes | rework: D5.10 feet on treads + spine | 1 | characterRig.ts:1225-1247 |
| L22 leg IK (2-bone, knee floor, knee gap) | both | per frame | - | feet | - | yes | pass (harness: ROM) | 1 | characterRig.ts:1268-1285,1477 |
| L23 head look (aim + look, world-stabilised) | both | per frame | 12 rad/s | - | - | `mv.ay` x 0.5 | fix: D5.8 targets (noise, guards, mates) | 1 | characterRig.ts:1298-1305; remoteAvatar.ts:283 |
| L24 joint rate limiter | both | per joint | knee 30, hip 26 rad/s | - | - | yes | fix: knee 30 rad/s = 28.6 deg / frame > 25 (5.12.2.1) | 1 | characterRig.ts:153,1364 |
| L25 anim LOD (> 22 m every other frame) | both | distance | - | - | - | yes | pass | 1 | characterRig.ts:206,866-875 |
| L26 heel-strike pelvis spring | both | planner `landed` | omega 15, kick -0.45 x mass | feet | additive | runs on remotes | rework: D2 (see Bob sources) | 1 | animGraph.ts:280,400,815; characterRig.ts:1008 |
| L27 accel / turn lean + intentLean | both | accel / intent | omega 14 / 12 | - | additive | none | fix: D5.2 on remotes (D8) | 1 | animGraph.ts:624-632 |
| L28 yawLag spring | both | yawRate | omega 10 / mass | - | - | derived | pass | 1 | animGraph.ts:675 |
| L29 supportX + pelBase springs | both | planner support | omega 10 / 6 | one foot | - | local | pass (harness: balance) | 1 | animGraph.ts:384,817-823 |
| L30 breathing | both | always | ~3.9 s | - | - | local | fix: D5.5 exertion; amplitude cap D2 | 1 | animGraph.ts:664,676 |
| L31 hit flinch spring | both | hitReact | omega 9 | - | additive | local | pass (5.12.2.1 exempt) | 1 | animGraph.ts:394,811 |

### 1b. Camera (batch 1, D5.13; all local per D8)
| ID | owner | trigger | duration | contacts | interrupt paths | net | status | batch | source |
|---|---|---|---|---|---|---|---|---|---|
| K01 spring follow of smoothed feet | player | always | camFollow 16, footY 14 | - | - | local | pass (D2: follows capsule) | 1 | shoulderCamera.ts:279-298 |
| K02 footstep `sBob` kick | player | every planner `landed` | omega 16 | - | - | local | remove (D2 no camera bob) | 1 | shoulderCamera.ts:100,229-232; player.ts:371-373 |
| K03 impact dip / landing | player | `impact()` | omega 16 | - | - | local | fix: one damped landing dip, no rebound (D2) | 1 | shoulderCamera.ts:222-227 |
| K04 look-ahead | player | velocity | gain 0.14 s, clamp 0.3 m | - | - | local | pass | 1 | shoulderCamera.ts:292-294 |
| K05 manual shoulder swap | player | button | spring 15.5 | - | - | local | fix: D5.13 auto swap at corners | 1 | shoulderCamera.ts:197,253,338 |
| K06 ADS framing | player | aim | boom 2.2 -> 1.5, FOV x0.75 | - | - | local | pass | 2 | shoulderCamera.ts:254,372 |
| K07 crouch pivot, dash framing, pace framing | player | stance / speed | rate 10 | - | - | local | fix: D5.13 FOV by gear and stance | 1 | shoulderCamera.ts:256,276,329,340-341,373 |
| K08 attach presets | player | attach | blend 0.25-0.3 s | - | - | local | pass | 3 | shoulderCamera.ts:265-274 |
| K09 wall pull-in + safety casts | player | collision | boomIn 40, boomOut 7 | - | - | local | pass (CT solver review in Block D) | 1 | shoulderCamera.ts:364-367 |
| K10 low-space adaptation | player | ceiling | lowIn 10, lowOut 2.5 | - | - | local | pass | 1 | shoulderCamera.ts:309-316 |
| K11 recoil, trauma shake, handheld drift | player | events | recover 9/s | - | - | local | pass (rotation only) | 2 | shoulderCamera.ts:206-231,327-329,356-371 |
| K12 cover boom / lean shift | player | cover | - | - | - | local | remove | A | shoulderCamera.ts:255,257,341,346 |

### 1c. Weapon handling (batch 2)
| ID | owner | trigger | duration | contacts | interrupt paths | net | status | batch | source |
|---|---|---|---|---|---|---|---|---|---|
| W01 reloadTactical / reloadEmpty | both | weapon state | owner-driven | off hand | `prevAction` | partial | pass (harness: hands < 2 cm) | 2 | actions.ts:15,35 |
| W02 swap (0.38 s holster beat) | both | swap | owner-driven | off hand | `prevAction` | partial | fix: verify >= 0.6 s total (5.12.2.6); weapon in hand host-auth (D8) | 2 | actions.ts:71; playerWeapons.ts:67-81 |
| W03 grenade throw | both | gadget | owner-driven | hand | `prevAction` | partial | fix: D8 net mode for the throw | 2 | actions.ts:112 |
| W04 melee (procedural sin arc) | both | `i.melee` | owner-driven | right hand | none | `mp.melee` | rework: becomes the elbow strike (C), host-approved start | C | animGraph.ts:803-808 |
| W05 recoil spring | both | kick | omega 26 / sqrt(mass) | - | - | yes | pass | 2 | animGraph.ts:708 |
| W06 weapon sway | both | always | 4.8 / 9 s | - | - | local | fix: never settles (D2 0.2 s) | 2 | animGraph.ts:707,734,747 |
| W07 weapon pivot slerp lag 0.035 s | both | per frame | - | - | - | yes | pass | 2 | characterRig.ts:1331-1334 |
| W08 cheek weld / sightToEye / clearBody | both | raise | - | - | - | yes | fix: D5.7 low-ready in tight spaces, muzzle vs mates | 2 | characterRig.ts:1069,1343,1504 |
| W09 arm IK (grip / foregrip / mag / wall / reach) | both | per frame | - | hands < 2 cm | - | yes | pass; D5.9 hook | 2 | characterRig.ts:1410-1470 |
| W10 holstered unless aiming / draw | player | aim | swap beat only | - | - | none | rework: drawn state host-auth (D8, bible 1.11) | C | playerWeapons.ts:190-213,283-289 |
| W11 hip fire and ADS spread | player | fire | - | - | - | - | fix: no hip fire (bible 1.11) | C | weapons.json:19-24; playerWeapons.ts:310,511 |
| W12 real-brand names (13 of 16 weapons) | - | - | - | - | - | - | done step 16: original names (ids kept, A28) | C | weapons.json, config/arsenal.ts |

### 1d. Common traversal (batch 3; committed, kinematic, `MoveCommit` once per `n`)
| ID | owner | trigger | duration base / min | contacts | interrupt paths | net | status | batch | source |
|---|---|---|---|---|---|---|---|---|---|
| T01 step | player | 0.2-0.65 m | 0.4 / 0.22 | clip | none | `step` | fix: no interrupted exit (5.12.2.9) | 3 | traversal.ts:18-31 |
| T02 vault | player | <= 1.25 m | 0.7 / 0.42 | hands | none | `vault` | fix: min 0.42 s < 0.5 s; D5.11 | 3 | traversal.ts:18-31; actions.ts:223 |
| T03 mantle | player | <= 1.8 m | 1.0 / 0.75 | hands | none | `mantle` | pass (>= 0.6 s); D5.3 exit settle | 3 | actions.ts:243 |
| T04 windowVault | player | window anchor | vault x 0.9 | hands | none | `windowVault` | fix: inherits vault minimum | 3 | traversal.ts:115-130; traverse.ts |
| T05 drop | player | ledge | 0.35 / 0.25 | feet | none | `drop` | fix: D5.3 compression | 3 | actions.ts:277 |
| T06 hop | player | gap | 0.5 / 0.38 | feet | none | `hop` | pass (harness) | 3 | traversal.ts:18-21 |
| T07 stepUp clip | player | step | progress | feet | inert | `step` | pass | 3 | actions.ts:265 |
| T08 jump / leap | player | jump | vy 5.6, cooldown 0.3 s | anchors | - | `ground` (no air mode) | fix: D8 airborne mode; anticipation (5.12.2.7) | 3 | traversal.ts:451,462-470 |
| T09 landing recovery `landT` + land clip | both | ground after fall | 0.15-0.7 s; clip 0.6 s | both feet | blocks weapon | `landing` | fix: D5.3 single settle; land clip -16 cm then -5 cm | 3 | playerController.ts:535-538; actions.ts:308 |
| T10 landing bands | player | fall height | < 0.6 / 2.5 / 4.5 m | - | - | `landing` / `roll` | pass | 3 | movement.ts:204-212 |
| T11 roll (landing) and CT forward roll | player | band / crouch tap at gear >= 5 | 0.62 / 0.55; 0.7 s, 3 m | body | none | `roll` | pass; rumble hook D5.12 | 3 | traversal.ts:23,345-349,398-401 |
| T12 traverseDuration scaling | player | speed | clamp(len / speed x 1.15) | - | - | `MoveCommit.dur` | fix: D5.11 pose also scales (fast low vault) | 3 | traversal.ts:27-31 |
| T13 slide | player | slide | progress | feet | inert | `ground` | fix: D8 mode | 3 | actions.ts:289 |
| T14 ladder | player | attach | 0.35 / 0.45; sprint 5 rungs/s | hands + feet | exit poses | `ladder` | fix: sprint rung 0.2 s < 0.3 s (5.12.2.6) | 3 | attach.ts:55-56,70; traverse.ts |
| T15 pipeV (drainpipe) | player | attach | 0.35 / 0.45 | grips | exit poses | `pipeV` | pass (netmove 0.2 cm) | 3 | attach.ts:71 |
| T16 ledge hang / climbUp | player | attach | 0.3 / 0.4; climb 0.85 | grips | exit poses | `ledge` | pass; D5.9 hand IK on lips | 3 | attach.ts:73; attachController.ts:60-70 |

### 1e. Stealth contact (batch 4)
| ID | owner | trigger | duration | contacts | interrupt paths | net | status | batch | source |
|---|---|---|---|---|---|---|---|---|---|
| S01 takedowns (behind / front / side / above / below / window / drop / inverted) | both | action; tap KO, hold lethal | approach 0.22 + strike 0.7 s | reach 1.8 m | damage aborts | `takedown`, `td` | fix: 0.92 s < 1.0 s; no shared start time (D8) | 4 | takedown.ts:10,15-50; takedownController.ts:272-278; coopHost.ts:502-533 |
| S02 overCover / corner takedown | both | high cover | as S01 | edge | - | `td` | rework: remap to back-to-wall | 4 | takedown.ts:13,141 |
| S03 grab / human shield / shove | both | tap on behind | hesitate 1.5 s | hostage 0.42 m | - | `grab` | fix: shared start time; char-char 3 cm | 4 | takedown.ts:53-66 |
| S04 back-to-wall (slide, peek, lean-out, SWAT turn) | player | `cover` press | - | wall | - | none | rework: missing; new mode + clips | C/4 | coverData.ts:58 (HIGH_MIN); corners.ts |
| S05 door peek | player | context | - | door | - | none | rework: missing | C/4 | - |
| S06 drag / carry / put down | player | - | lift >= 1.0 s | body | - | none | rework: missing (Phase 5 hook: any target) | 4 | - |
| S07 elbow strike | player | fire while holstered | - | - | - | none | rework: missing; host-approved | C | - |
| S08 medkit use | player | item | 40 HP over 1.5 s | - | damage | MoveState medkit (28), cmove | done step 15 | C | game/medkit.ts |
| S09 snap cover, glide, cover-to-cover, blind fire | player | `cover` | 0.35 s; 0.25-0.42 s | faces | stumble | `cover` | remove | A | coverController.ts:50-52; coverState.ts:13 |
| S10 coverEnter / Side / Exit / Turn clips, duckS / overS | both | cover | 0.8 / 0.8 / 0.5 / 1 s | wall hand | inert | `cover` | remove | A | actions.ts:135-174; animGraph.ts:635,642 |
| S11 corner controller (doorway lean / check) | player | aim near corner | 0.25 / 0.9 s | corners | off | none | remove (logic may seed door peek) | A | cornerController.ts:10-11 |
| S12 Mark & Execute | player | mark / execute | scripted | - | - | `ex`, `execCharges` | remove | A | executeController.ts; takedownController.ts:431 |

### 1f. Guards (batch 5)
| ID | owner | trigger | duration | contacts | interrupt paths | net | status | batch | source |
|---|---|---|---|---|---|---|---|---|---|
| G01 guard locomotion (shared clips L02-L31) | guard | AI | as player | planner | - | puppet | fix: inherits batch 1 | 5 | enemyPuppet.ts:199 |
| G02 guard states, reactions, ragdoll hand-offs | guard | AI | - | - | - | puppet | not audited (Known gaps) | 5 | src/ai/enemyRig.ts, ragdoll.ts |

### 1g. Rare traversal (batch 6)
| ID | owner | trigger | duration | contacts | interrupt paths | net | status | batch | source |
|---|---|---|---|---|---|---|---|---|---|
| R01 pipeH (hands, legsUp, inverted) | player | attach | 0.3 / 0.35 | grips | exit poses | `pipeH` + sub | pass (netmove <= 0.4 cm) | 6 | attach.ts:72; traverse.ts |
| R02 duct crawl / ventDrop | player | attach | 0.45 / 0.45 | hands + knees | exit poses | `duct` | pass | 6 | attach.ts:74 |
| R03 zipline | player | attach | top 6 m/s | hands | exit | `zipline` | fix: no dedicated clip | 6 | attach.ts:64-65,75 |
| R04 split / wallKick | player | double tap | jumpTime / 0.3 | feet on walls | exit | `split`, `wallJump` | pass | 6 | attach.ts:77; traverse.ts |
| R05 rappel | player | attach | hookTime / 0.35 | rope | exit | `rappel` + `u` | rework: dedicated clip (5.12.2 coverage) | 6 | attach.ts:79 |
| R06 fence | player | attach | flip 0.9 s | grips | exit | `fence` + `u` | rework: dedicated clip | 6 | attach.ts:81 |

### 1h. Co-op (batch 7)
| ID | owner | trigger | duration | contacts | interrupt paths | net | status | batch | source |
|---|---|---|---|---|---|---|---|---|---|
| N01 team brace | player | hold Y 0.4 s | until used | wall | - | `brace` | rework: dedicated clip (stand-in today) | 7 | traverse.ts:338; teamController.ts:335-345 |
| N02 team boost | player | `tmove` | 0.9 s | hands / feet | host deny list | `boost`, `tstart {t0}` | fix: D5 + contact IK (D8) | 7 | teamMoves.ts:36-52 |
| N03 human ladder | player | `tmove` | climb 0.8 s | feet 1.45 m | `tend` | `stacked` | fix: D5 + contact IK | 7 | movement.ts:396-399 |
| N04 dual takedown | player | 2 within 1.5 s | banner 1.8 s | - | - | host banner | fix: shared start (D8) | 7 | coopHost.ts:225-240 |
| N05 remote posing from MoveState | both | snapshot | `rd` eased 0.15 s | grips | - | `PlayerState.mv` | fix: no motion / accel / intent on remotes (D8 D5 layer) | 7 | remoteAvatar.ts:196-215,270-302 |
| N06 remote traverse replay | player | new `mv.c.n` | `c.dur` | path | - | yes | pass | 7 | remoteAvatar.ts:157-178 |
| N07 AttachGrips + GripStepper | player | attached modes | cadence | hands + feet | - | yes | pass | 7 | attachGrips.ts:45; gripStepper.ts:49 |
| N08 capsule separation, shoulder turn, mate look-at, wall stacking | player | proximity | - | bodies | - | none | rework: missing (D8) | 7 | enemy only: enemy.ts:1515 |
| N09 missing team moves (split boost, back-to-back, pull-up, rappel anchor) | player | - | - | - | - | none | rework (D5 + IK when built; Phase 5 owns new moves) | 7 | teamMoves.ts:9 |
| N10 PvP takedown `ptd` | player | - | - | - | - | `ptd` | remove with PvP (parked) | A | coopHost.ts:624-663 |

### 1i. Vision, health and other removals (Block A / C)
| ID | owner | trigger | duration | contacts | interrupt paths | net | status | batch | source |
|---|---|---|---|---|---|---|---|---|---|
| V01 sonar (pulse, marks, ring) and hooks | player | vision 2nd press | 6 / 2.5 / 18 / 12 s | - | cooldown | local, `events 'sonar'` | remove | A | vision.ts:11-19 |
| V02 night vision (lighting gain) | player | vision | flip | - | - | local | pass (bible 1.10) | C | gameState.ts:1700-1711 |
| V03 thermal / electro | player | vision | - | - | - | local | rework: missing (post passes) | C | cinematicPost.ts:156 |
| V04 regenerating shield | both | 4 s delay | continuous | - | damage | `sh` | remove | A | health.ts:1-12; playerTarget.ts:34 |
| V05 health pickup | player | walk over | instant | - | - | host `onPickup` | done step 15: gives a kit | C | game/pickups.ts |
| V06 style tracker + cash | - | events | - | - | - | indirect | remove (stub, SAVE_VERSION 7 -> 8) | A | playstyle.ts:7; schema.ts:28-37 |
| V07 D7 remap / hold-toggle / difficulty sliders | player | settings | - | - | - | local (host difficulty) | rework: pad remap missing, no alarm tolerance | C | gamepadMapping.ts:58-75; archetypes.ts:166-171 |

Counts: 108 rows. pass 35, fix 43, rework 19, remove 10, not audited 1 (G02).

## 2. Bob sources
| source | amplitude | D2 limit | verdict |
|---|---|---|---|
| Pelvis gait bob per clip (locomotion.ts:18-23, `bob` dip x k, rise x 0.5) | p2p walk 0.96 cm, jog 1.85, dash 2.35, crouchRun 1.6, sneak 0.59 cm; one low / one high per step | crouch 2.5, walk 4, run 6, sprint 8 cm | pass on its own; harness must measure the sum with the heel spring and pelvis drop |
| Heel-strike pelvis spring (animGraph.ts:280,400,815; characterRig.ts:1008) | kick -0.45 x mass at omega 15, adds ~1.5-3 cm dip per step (code comment) | as above; one low per step | rework: a second dip on top of the clip dip risks a double bounce; main D2 risk |
| Walk lateral sway `sway(0.022) x 1.2` (locomotion.ts:80) | 2.64 cm peak, 5.3 cm p2p (creep 4.8, brisk 4.3, jog 3.4) | 3 cm at walk | fix: over the limit |
| Camera footstep `sBob` kick (shoulderCamera.ts:229-232; player.ts:371-373) | ~1.6 mm per step | no camera bob; <= 0.5 cm | remove (bob by design, even if under 0.5 cm) |
| Camera `sFootY` on stairs (`stepAssist` playerController.ts:501) | unmeasured | <= 0.5 cm steady | measure in Block B |
| Camera impact dip (shoulderCamera.ts:222-227) | ~1.6 cm, critically damped | one damped dip, no rebound | fix: drive from landing, not only impacts |
| Weapon sway (animGraph.ts:707) | (0.005 sin 1.3t + 0.003 sin 0.7t) x mass, 8 mm peak | settle <= 0.2 s after a stop, no wobble | fix: runs forever, never settles |
| Breathing (animGraph.ts:664,676) | 0.008 rad spine pitch, all states incl. moving and aiming | idle breathing <= 1 cm | fix: gate to idle / exertion (D5.5), measure head travel |
| Idle pelY (locomotion.ts:34,49) | +-2 mm; crouchIdle 5 mm | 1 cm | pass |
| Head pitch bob in gait clips (locomotion.ts:85-134) | 0.005-0.02 rad (<= 1.15 deg) | <= 2 deg | pass (harness confirms head travel <= pelvis) |
| pelRoll (locomotion.ts:81) | 0.03-0.035 rad (1.7-2.0 deg) | pelvis, not head | pass; check head roll |
| `rootModulation` speed ripple (motion.ts:81-83, rootDip 0.025) | 2.5% horizontal | D5.2 no root overshoot | measure |
| startShift / stopSettle / pivot / land offsets (actions.ts:192-216,311) | -1.2 / -1.6 / -3 / -16 then -5 cm | one damped settle | fix: land has two dips |
| `dashBob: 0.02` (config/camera.ts:73) | unused | - | remove dead config |

## 3. D2 / D5 / D7 / D8 hook map
| item | exists | hook (file:line) | block / batch |
|---|---|---|---|
| D2 pelvis p2p, one low / one high | clip bob + heel spring | locomotion.ts:18-23; animGraph.ts:400,815 | B measure, D1 |
| D2 head travel, pitch / roll | neck parented to torso | characterRig.ts:1253-1254,1298-1305 | B, D1 |
| D2 walk sway | over limit | locomotion.ts:26,80 | D1 |
| D2 camera | follow yes; sBob kick | shoulderCamera.ts:229-232,279-298 | D1 |
| D2 sway settle, breathing | never settle | animGraph.ts:664,707 | D1-2 |
| D2 frozen config + unit tests | no | new limits table in src/config | D (metrics freeze) |
| D5.1 speed-scaled gait | partial: stride via `stepLength`, clip blend | motion.ts:73; animGraph.ts:435-471,770 | D1 |
| D5.2 accel / turn lean | local only | animGraph.ts:624-632; remote derive after characterRig.ts:942 | D1 |
| D5.3 compression / settle | partial: land, stopSettle, heel spring | animGraph.ts:553,612 | D1, D3 |
| D5.4 plant-pivot, stride warping | pivot local, no warping | footPlanner.ts:150-300; motion.ts:300-310 | D1 |
| D5.5 exertion breathing | no | after animGraph.ts:664, from `dashS` (:514) | D1 |
| D5.6 trained posture, heel-to-toe | partial: HUNCH, soft knees, toe / heel pitch | animGraph.ts:286; characterRig.ts:1229; footPlanner.ts:420-454 | D1 |
| D5.7 weapon discipline | partial: clearBody, READY_POSES | characterRig.ts:1343; animGraph.ts:288 | D2 |
| D5.8 look-at | aim / look only | characterRig.ts:1298-1305; player.ts:298 | D1 (guards D5) |
| D5.9 hand contact IK | cover hand, grips | characterRig.ts:1410-1470 | D3-4 |
| D5.10 stairs / slopes | ground probe, pelvis drop | characterRig.ts:390,1225-1247 | D1 |
| D5.11 momentum traversal | duration only | traversal.ts:27-31; traversePath.ts:17-45 | D3 |
| D5.12 pad analog, snapping, rumble | analog yes; rumble API used twice | speedGears.ts:31; gamepadSource.ts:155-161; gameState.ts:335,437 | C (input) |
| D5.13 camera | follow, look-ahead, pull-in | shoulderCamera.ts:248-374 | D (camera) |
| D7 full remap | KBM only | settings.ts:91; gamepadMapping.ts:58-75 | C |
| D7 hold / toggle | adsToggle, crouchToggle, sprintHold | settings.ts:145 | C (add back-to-wall, grab) |
| D7 difficulty sliders | 4 presets, no alarm tolerance | archetypes.ts:166-171; coopUi.ts:365-389 | C |
| D7 persistence via src/save | settings in IndexedDB kv | settings.ts:491-510; app.ts:79 | C |
| D8 MoveState mode per state | 25 modes; missing back-to-wall, door peek, holster, elbow, medkit, drag, air, stop-hold, crouch | moveState.ts:12-45; localMoveState.ts:15-60 | A-D each step |
| D8 committed moves shared start | team moves only (`tstart {t0}`) | teamMoves.ts:39; coopHost.ts:502-533 | C, D4, D7 |
| D8 host-auth health / medkit / drawn / weapon | health yes; rest no | protocol.ts:55-75; coopHost.ts:128 | C |
| D8 local-only vision, camera, rumble, remap | yes | - | pass |
| D8 D5 on remotes | rig input omits motion / accel | remoteAvatar.ts:270-302 | D1, D7 |
| D8 capsule separation, shoulder turn, mate look-at, muzzle, stacking | no | new in src/net + rig | D7 |
| D8 team moves D5 + contact IK | no | teamMoves.ts; attachGrips.ts | D7 |
| D8 e2e-netmove case per state | 16 cases | scripts/e2e-netmove.mjs:43 | every step |

## 4. Harness metrics (Block B)
| metric | limit | source | baseline |
|---|---|---|---|
| joint rotation per frame | <= 25 deg at 60 Hz (scaled) | bible :794 | 179.3 swap / 178.2 drop09 deg; R 90.0 stand6 / 111.5 crouch3 |
| pelvis jump per frame | <= speed x dt + 2 cm | :795 | 24.3 cm stand6 / 9.2 drop09; R 10.6 stand6 / 6.9 stand4 |
| teleports | none outside spawn / respawn / checkpoint | :796 | 0 / 0; R 0 / 0 |
| transition blend | Inertializer 0.1-0.25 s | :797 | 0.317 s stance (both); R 0.184 stance |
| planted foot slide / float / sink | < 1 cm / <= 2 cm / <= 1 cm | :801 | slide 8.3 stand6 / 17.5 slope35-stand6; float 24.3 drop09 / 24.1 drop24; sink 9.0 ramp-stand2 / 20.6 slope35-stand6 cm; R slide 19.7 / 14.2, float 3.2 / 16.9, sink 26.6 ramp / 0 cm |
| hand contact | < 1 cm (grip < 2 cm) | :802 | grip 31.9 drop09 / 48.9 slope35-crouch2 cm; R 14.7 braceboost / 14.3 stand6 |
| world clip / weapon | <= 3 cm / <= 2 cm | :806 | not measured (e2e-clip) |
| self-intersection | <= 2 cm | :807 | forearmR 14.9 drop09 / 14.4 swap, thighs 14.8 turn180, weapon 7.4 ramp-crouch4 cm; R 14.8 braceboost / 1.0 |
| character vs character | <= 3 cm | :808 | R brace + boost bodies 7.7 cm (pairPenetration) |
| ROM (knee / elbow, wrist, neck, spine) | 0-150 deg +5; 70 / 25 deg; 80 deg; 60 deg | :812-816 | knee 151.8 drop09 / 156.9 ladder, elbow 172.5 swap / 179.4 drop09, wrist side 93.5 / 104.9, neck 31.3, spine 20.3 deg; R knee 147.9, elbow 132.9, wrist side 54.6, neck 6.8, spine 15.7 |
| balance (COM over support) | 10 cm margin | :818 | 4.0 stand6 / 3.3 stairs-stand6 cm; R 10.8 stopidle |
| action durations | table (crouch 0.25 / 0.3, 180 0.25, vault 0.5, rung 0.3, swap 0.6, takedown 1.0 s ...) | :824-834 | crouch 0.25, stand 0.283!, 180 0.25, raise 0.20 / 0.225, swap 0.9, vault 0.7, mantle 1.0, rung 0.35 s; R crouch 0.80, stand 0.85 (remote stance blend) |
| frame-rate parity | same poses 60 / 120 Hz | :854 | feet 11.2 cm stand6, cam 0.2 cm, root 0 |
| remote paired-move alignment | <= 3 cm | :859 | R 16.7 cm (climber sole vs braced hands at contact) |
| pelvis p2p per gear | crouch 2.5, walk 4, run 6, sprint 8 cm | :1253 | 39.0 stand6 / 26.4 slope35-stand4 cm; R 22.5 ramp-stand3 / 2.9 stand6 |
| one low / one high per step | exactly one each | :1253 | pending Block B |
| head travel vs pelvis | head <= pelvis | :1254 | 42.3 stand6 / 25.0 slope35-stand4 cm; R 26.4 stairs-stand3 / 3.7 stand6 |
| head pitch / roll oscillation | <= 2 deg | :1254 | 0.64 / 0.00 deg; R 0.42 / 0.00 |
| lateral pelvis sway (walk) | <= 3 cm | :1255 | 5.6 stairs-stand2 / 5.6 slope35-stand2 cm; R 5.7 / 5.6 |
| camera vertical oscillation | <= 0.5 cm steady | :1256 | 1.57 tunnel / 1.58 tunnel cm; R not measured (host camera) |
| landing dip | one damped dip, no rebound | :1256 | pelvis 1 dip, camera 0 dips, no rebound |
| weapon / kit sway settle | <= 0.2 s, no secondary wobble | :1257 | 0.58 crouch4 / 0.63 slope35-crouch6 s; R 1.18 stand4 / 0.77 stand6 |
| idle breathing | <= 1 cm | :1257 | 0.35 / 0.35 cm; R 0.40 stopidle (from the settle + 0.2 s, 1.5 s tail) |
| D5 foot slide (stride warping) | < 1 cm vs capsule | :1273 | as planted foot slide |
| D5 root overshoot | none | :1271 | 0.994 / 1.025 tunnel (ratio of cap); R 0.986 / 0.989 |
| D5 head stability | level head | :1275 | as head pitch / roll |
| D5 stairs pelvis drop | feet on treads, smooth drop | :1279 | 11.3 ramp-stand6 / 6.6 slope35-stand4 cm; R 7.3 ramp |

All metrics run at 60 and 120 Hz, both stances, flat / stairs / slopes, local and remote (`:1258`, D8 `:1317`). Line numbers are `docs/design-bible.md`.

Remote-only (step 08 fix round 3, host's copy of the client, real time; A's player 3.5 m behind B's start, anim LOD skips 0 on both rigs in every row, camera distance <= 15.9 m; lag fitted on moving frames: 0.1 s, or INTERP_DELAY 0.1 s when a row has fewer than 20 moving frames: stance, braceboost). Each scenario starts once the copy has settled after placement (r3: speed < 0.05 and head, wrists, ankles within 1 cm for 0.3 s, e2e-netmove's rule; took 0.32-2.96 s, ~3 s timeout with a warning, none fired); settled ankles use the same 0.3 s still window on B's track. Split per A38.
- `poseError` gating part (root, head, wrists, ankles on settled frames; limit 10 cm), runs 1 / 2 @60: stand2 12.0 / 11.1, stand4 47.8 / 47.9 (ankleR, settled after the stop), stand6 23.9 / 28.8, crouch3 12.5 / 14.9, stairs 27.4 / 28.3, ramp 28.0 / 39.7, stopidle 27.9 / 22.2, stance 16.4 / 29.7, braceboost 64.4 / 67.0 cm; @120: stand2 19.3 / 20.1, stand4 33.0 / 48.1, stand6 20.6 / 20.6, crouch3 30.8 / 36.9 cm. Every row fails. No row's worst frame is the placement transient any more (r1 / r2: stance@60, stand6@60 and stand6@120 peaked at frame 0; r3 worst frames 77, 228-243 and 462-491).
- `gaitPhase` (reported) worst / median offset, cycles: @60 0.06-0.25 / 0.05-0.18 (stairs and ramp the largest); @120 0.49-0.50 / 0.21-0.24 (the pump's copy runs its own stride at up to half a cycle from the owner).
- `lowerBody` (phase-aligned, root-relative, limit 10 cm): @60 13-140 cm, @120 46-147 cm (worst at stops and crouch: the copy's planner lands steps up to 0.8 m ahead of the root while the owner is mid-stride).
- `pops` (rubber-banding only): @60 0-7 frames per row (root steps 0-1), @120 1-48 (crouch3 the worst; joint steps the owner's track does not have).
- `pairAlign` 16.6 / 16.7 cm, `pairPenetration` 7.7 cm (brace + boost).
- Gate (A39; A40 makes `poseError` report-only until step 22): `--compare` gates remote `poseError` (gating part), `pops` at 60 Hz, `pairAlign` and `lodSkip` against the baseline's two-run noise band (worse than the worse run by more than max(2x spread, 10%, 2 mm, 2 counts); `lodSkip` any rise). `lowerBody` and 120 Hz `pops` are report-only (both vary up to 2x between identical runs because of the page-side 120 Hz pump), as are `gaitPhase` and the other remote rows; the compare output names both lists.

Step 09 fix round 1 (item 4): four local rows had worsened against the step-08 baseline (turn180@120 pelvisJump 3.37 -> 3.71 cm, tunnel@60 headPitch 0.0138 -> 0.0150, tunnel@60 cameraOsc 1.56 -> 1.70 cm, idle@60 idleCamera 0.63 -> 0.79 mm). Causes: a weapon selection made while holstered (the audit's swap scenario) left the controller's `speedMul` and zoom on the last drawn gun, so every later scenario moved at another speed (fixed: the holstered selection applies its move speed at once); and the drawn `-aim` gaits ran among the holstered rows, shifting the page's carried clocks (breathing phase) for every later scenario (fixed: the drawn subset runs last). All four rows are back to the step-08 values (3.37 cm, 0.0138, 1.56 cm, 0.63 mm).

Step 09 re-cut (A42; re-cut again after fix round 1 with two full runs, `--band`; local 354 fails, remote 80; remote 120 Hz rows present, pump p95 jitter 1.0-1.3 ms): the arm metrics changed because the gaits now run holstered with the ready hands (A42) and a drawn `-aim` subset (flat stand2 / stand4 / crouch3 at 60 Hz, run last) was added; that change is from A42, not a regression. Against the step-08 baseline, local pelvis / head rows that are still worse when holstered (they disappear when forced drawn; carried to step 21 / 22): `raise@120 pelvisJump` 0 -> 0.69 cm (limit 2, pass; swap overlay no longer inertialized at its start), `drop09@120 neckTwist` 9.26 -> 13.95 deg, crouch balance flat-crouch4@120 3.1 -> 3.5 cm and stairs / ramp crouch3 0 -> 0.04 cm. Smaller holstered-only rises (already failing or within noise): vault@60 pelvisJump 10.86 -> 11.05 cm, vault@120 5.57 -> 5.61 cm, mantle pelvisJump +0.006 cm, drop09 landingDipPelvis +0.002 cm, stairs / tunnel headRoll ~1e-5. Remote ramp / stairs stand3 pelvis rose ~1.5 cm (report-only).

Step 11 (back-to-wall, A45-A48): new `wall` scenario rows at 60 / 120 Hz local and 60 Hz remote, with the new metrics `wallGap` (back's largest gap to the face, limit 3 cm) and `wallClip` (deepest the back goes behind the face, limit 3 cm). Fixed in step 11: overshoot, feet behind the face, the back gap (local @60 14.5 -> 1.5 cm), the upper arm through the torso, foot skate. Still failing and carried to step 27 (the dedicated back-to-wall clip, A47), entered in the baseline as wall rows: entry-turn `jointRate` 44-49 deg per frame, `selfShanks` 8.8-10 cm and `selfThighs` 3.5-5.9 cm (entry turn), `selfForearmL` / `selfForearmR` 8.8-9.5 cm, exit `pelvisJump` 6.5-8.4 cm, `footSlideR` 1.1-1.3 cm, `wallGap` @120 4.4 cm, remote `wallClip` 3.8 cm in the settle, remote `poseError` 21 cm / `lowerBody` 44 cm / `pops` 2. Re-cut after fix round 2 with two full runs (`--band`; local 371 fails both runs, remote 93 / 94; pump p95 jitter 1.3 / 0.6 ms): every local regression against the step-10 baseline was a wall row; no gated remote regression.

Step 12 (wall edge verbs, A50): new `walledge` scenario rows at 60 / 120 Hz local and 60 Hz remote (the Proving doorway's high wall: enter, slide to the edge, peek, lean-out aim, step toward, SWAT turn across the 1.1 m gap, settle). Their fails enter the baseline as new rows and are carried to step 27 with the back-to-wall / SWAT pose polish (A47): `jointRate` 135-178 deg per frame, knees 125-138 deg, wrists 45-169 deg, `neckTwist` 121 deg, `selfForearmR` 15 cm, `wallClip` 13-14 cm and `wallGap` 5.1 cm (lean-out past the edge and the SWAT crossing), grips 17-30 cm, exit `pelvisJump` 9-34 cm, remote `poseError` 66 cm / `lowerBody` 111 cm / `pops` 16-18. The plain `wall` remote row is unchanged by step 12 (pops 2 / 1 / 2 / 3 over four runs against baseline 2; the earlier 7 / 7 were measured before the copy turned with the aim only on the WALL_SUB lean bit and before the SWAT stance change in gameState). Re-cut with two full runs (`--band`; local 413 fails both runs, remote 114 / 111): no local regression outside the new walledge rows, no gated remote regression (two `--compare` runs against the step 11 baseline).

Real remote findings (not fixed; harness code only): the owner holds its stopped stride (CT stop hold, ankle 0.2 m forward, head 0.1 m lower) while the copy settles to the idle stance, so settled ankles and the head miss by 25-50 cm after every stop; during the accel the copy's head dips ~14 cm below the owner's; the copy needs more than 1.2 s to recover from a placement teleport (whole body, at 60 and 120 Hz: the fixed 800 ms wait left the whole body off at frame 0, arms ~45 cm low; the cause is placement, not the 120 Hz pump; r3 waits for the settle instead); the copy's brace pose holds a constant 31 cm head / 36 cm wrist offset from the owner's for the whole braceboost row (the brace stand-in clip, N01); the stance blend on the copy is the eased binary crouch flag (carried to step 20 / 30).

Real rig findings carried from step 07 (not fixed; harness verified them):
- Stairs / ramp / slope pelvis dips 12-25 cm per step; 30 Hz pelvis-height update on the ramp at 60 Hz; sprint pelvis deeper at 60 Hz than 120 Hz (12 cm flight-phase dip; flat stand 5-6); remote sprint pelvis p2p 39 cm at 60 Hz vs 2.8 at 120.
- standTime 0.283 s < 0.30 s; raise ~0.19-0.2 s at the limit (raiseTime 0.225 s at 120 Hz may need the F4 sim-step rounding); stance blend 0.317 s > 0.25 s.
- Head travel > pelvis travel; walk sway 4.7-5.6 cm (limit 3); camera oscillation 0.5-1.7 cm on slopes / stairs.
- 35 deg slope sprint foot slide ~17-30 cm; foot planner resets to the capsule height, not the probed ground (2 cm at spawn, 13 cm after a 0.9 m drop, 16-19 cm after 2.4 m, ~6 cm after mantle, ~2.2 cm after vault, until the first step).
- Toe-off foot pitch snap 25.5 deg per frame; quick 180 foot swing 53 deg per frame; drop24 hips 35 deg in one frame and a 30 Hz pose cadence walking off.
- Right-arm IK unstable crouched on stairs / ramp / slope (elbow 25-37 deg per frame, wrist up to 100, gripR up to 49 cm); wrist pop when grip weight crosses 0.5 (swap, ladder, drops, vault); sprint foregrip out of reach (~2.5 cm); crouch wrist 22-27 deg sideways from the standing grip (PC-PASS 12).
- Weapon settle 0.2-0.7 s with ~4 mm rebound; arms / weapon through the body in swap, vault, mantle, drops; tunnel 120 Hz stride modulation 2.5% over cap (minor).
- Planted feet are not pitched to slopes (footPlanner.ts ~140, ~453 set pitch 0): toe sink 7.8 cm at 20.4 deg, 14.75 cm at 35 deg; slope35 sinks are toe sinks. The corner sole model overstates steep toe-down sinks by ~1.5 cm (rounded boot, partLibrary.ts ~157).
- Stairs: the step boxes are collide=false; collision is a 20.4 deg slab through the back corner of each tread (levelBuilder.ts ~181-193), so feet-on-treads (D5.10) is measured against the visual tread tops computed from the stairs geometry (A36), not the collision ray.
- Step 07 wall-clock leak: the engine render loop kept running `scene.render()` between page.evaluate calls with the loop manual; the local harness now stops it, and two full runs give identical local results (0 flips, including vault / mantle / drops / turn180).
- Step 12b (D9 / D10): new rows `wallopenL-rifle`, `wallopenR-rifle`, `wallopenL-pistol`, `wallopenR-pistol`, `walllowL`, `walllowR` (local, 60 Hz; a free wall end found at run time, the weapon swapped locally for the run) and remote `wallopenL`, `wallopenR`, `walllowL` (the client's weapon in hand: the host validates the loadout, so no remote swap). They enter the baseline failing, like `walledge` (A47, pose work in step 27): grips 17-70 cm (worst in the peek / hand-switch window on the left-edge and pistol rows), jointRate 137-177 deg per frame, wallClip 13-22 cm. The D9 check 'grips < 2 cm at both edges, both weapons' and the switch 'no pop' are NOT met in the cloud harness; the right-edge rows (no mirror) fail about as `walledge` does, so most of it is the pre-existing wall pose debt, with the left-edge / pistol rows worse. `--compare` against the previous baseline: no regression in two full runs; baseline re-cut (two runs, `--band`).
- Step 12b fix round 1 disabled aim assist in the local harness (its magnetism turned the camera toward the map's guards, whose positions carry the real-time frames before the harness takes the loop). That moved non-wall local rows too, not only the open-side wall rows: e.g. `stairs-stand1@60` jointRate 24.80 -> 25.06 deg per frame (now failing) and `turn180@120` footSinkL (now passing). The baseline re-cut absorbs both.
- Step 12b fix round 2 (camera rows): the gait runs did not reset the camera's own clock (handheld drift, shake: it runs from page load on real time and turns the view), so `cameraOsc`, `idleCamera` and the 60 / 120 Hz `parityCamH` / `parityCamV` rows read a different drift phase each run (one full `--compare` showed 7 local parityCam regressions, e.g. 0.124 -> 0.149 cm). The harness's teleport now zeroes it with the idle clock (as the wall runs already did, A49). Four full runs: every camera row identical; the flat parity camera rows fell from 0.02-0.23 cm to 0.003-0.005 cm (H) and 0 (V); the only local differences between runs are the A49-banded wall rows and last-bit (1e-14 deg) wrist angles on the raise / aim rows. No band extension (no new ASSUMED entry). Baseline re-cut (two full runs, `--band`; local 538 fails both runs, remote 171 / 168); two fresh full `--compare` runs: 0 local regressions; one gated remote row each (`wallopenR@60` pops 7 -> 11, then 9; `walledge@60` pops 13 -> 20, not in the other run), neither reproduced across the two runs (A39 noise).

## 5. Spot check (checker, step 1)
62 rows checked across the four files (a 21, b 19, c 12, d 10) by opening each cited file:line. Passed 54, fixed 8, dropped 0.
- a: lower states, gait nodes (both), startShift, stopSettle, pivot, land, brace, accel lean, breathing, weapon sway, joint rate, anim LOD, PIN_TOL, remote rig input, knee-floor IK, head look, pivot slerp: pass. Fixed: pelvis-drop solver 1251-1265 -> 1225-1247 (inventory and D5.10); soft knees 1250 -> 1229; heel-strike caller characterRig.ts:983 -> 1008 (two places); clearBody use 1327 -> 1343 (two places); jog p2p arithmetic 0.0125 -> 0.0185 (k = 0.5).
- b: FIXED_DT, gear caps, GearState.step, CT_MAX_ACCEL, sBob, footstep, dashBob, attach table, traverseDuration, MOVE_MODES / ATTACHED / COMMITTED, landing bands, travel turn, rootModulation, stepped turn, landT, kneel, camera follow, wall pull-in, SprintGate, forward roll: pass.
- c: SNAP_REACH / GLIDE, corner LEAN / CHECK, TakedownKind, corner takedown, `marks.earn`, Health shield, `Health(100, 50, 4, 30)` (file is src/game/playerTarget.ts), SAVE_VERSION 7, MissionRecord, PLAY_STYLES, health pickup, STYLE_PAY: pass.
- d: VISION constants, TeamKind, weapons.json names (MP5 / AK-74 / M249), settings toggles, onTakedown, rumble, netmove tolerance, suite line counts: pass. Fixed: archetypes path is src/ai/archetypes.ts, DIFFICULTY at :166-171 (not :162); pad mapping is `GAME_BINDINGS` gamepadMapping.ts:58-75 (54-56 is a comment; two places).

## 6. Known gaps (not read by the audit agents)
- Guard animation: src/ai/enemyRig.ts, body.ts, ragdoll.ts, guard states and ragdoll hand-offs (batch 5). Owner `both` for rig rows is from audit (a), not verified per guard path.
- The fire path (is firing blocked when not aiming), controlsScreen.ts rebind flow, NightAutoGain / nightBloom / cinematicPost internals.
- Actual swap, reload and throw durations per weapon (W02, W03) and real-handling reload references.
- Interrupted exits per state (5.12.2.9) beyond committed traversals having none.
- attachments.ts and loadoutScreen.ts strings for real brands.
- Clip-level ROM and balance: no numbers until Block B.
- Audit (c) cites ASSUMED A1 (cornerController) and audit (d) ASSUMED A3 (settings persistence); DECISIONS.md holds only A0. Log them in step 2.
