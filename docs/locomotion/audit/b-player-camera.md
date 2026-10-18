# Audit (b): src/player movement, attach, traversal and camera

Explore agent report, step 1.

## 0. Key facts
- Fixed step 60 Hz: `FIXED_DT=1/60`, `MAX_STEPS_PER_FRAME=4` (src/core/loop.ts:4-5); camera in `frameUpdate` (:136) via `cam.update(dt, c.renderPos, ...)` (src/player/player.ts:264).
- Camera already follows the smoothed feet (`sFx/sFz` camFollow 16, `sFootY` 14: shoulderCamera.ts:279-298; config/movement.ts:75).
- Control is instant: CT table (config/movement.ts ~174-198); `stepCt` (anim/motion.ts:285-305); `CT_MAX_ACCEL = 600` (playerController.ts:70,484).
- Gear caps (m/s), config/movement.ts:159-160:

| Stance | G1 | G2 | G3 | G4 | G5 | G6 |
|---|---|---|---|---|---|---|
| stand | 0.8 | 1.3 | 2.0 | 2.8 | 3.8 | 5.0 |
| crouch | 0.5 | 0.9 | 1.3 | 1.8 | 2.3 | 2.8 |

  Spawn gear 3 (:157), dead zone 0.05 (:162), cover caps 2.8 / 1.8 (:167), ADS 1.4 (:16). Noise silent up to crouch 1.9 / stand 1.45 (:214-217).
- No analog gear snapping or hysteresis: gears step by button (`GearState.step` speedGears.ts:103; playerController.ts:369-370); target = cap x `stickCurve` (speedGears.ts:31-33).

## 1. Inventory
### Free movement
| item | owner | trigger | duration | contacts | interrupts | net | file:line |
|---|---|---|---|---|---|---|---|
| Stance type stand / crouch / ads / adsCrouch / cover / coverCrouch / sprint | movement.ts | aim, crouch, sprint | - | capsule | - | `ground` (crouch not on wire) | movement.ts:15 |
| Stand gears | playerController | stick x cap | start 95% in 0.08 s | capsule r 0.3 h 1.75 | override | `ground`, g | playerController.ts:456; config/movement.ts:160,176 |
| Crouch | playerController | crouch toggle / hold | 0.25 / 0.28 s; h 1.15 | `hasHeadroom` | sprint stands up | `ground` | playerController.ts:405-435,606-619; config/movement.ts:65-71 |
| Kneel | playerController | crouched still > 0.25 s | - | - | input | cover `kneel` only | playerController.ts:575-576 |
| Sprint (gear 6, no stamina) | movement.ts `SprintGate` | sprint, mag > 0.3 | grace 0.15 s | - | aim, override, air, crouch | `ground` g=6 | movement.ts:113-166; playerController.ts:415-430 |
| ADS strafe lock | movement.ts | aim | - | - | - | `ground` (+`r`, `ay`) | movement.ts:36-39 |
| Instant stop + stopHold | playerController / motion | stick release (`StickRelease` 0.15 s) | pose blend 0.12 s | - | input | `ground` | playerController.ts:118,490-496; speedGears.ts:45-84; motion.ts:285-293 |
| Travel turn 720 deg/s | motion.ts | stick | ~0.25 s reversal | - | - | local | motion.ts:346-356 |
| Planted pivot (2.x only, CT bypasses) | motion.ts | reversal > 1.5 m/s | 0.3 s | - | - | no | motion.ts:183-207; config/movement.ts:62,126 |
| Stepped turn on the spot | motion.ts | aim leads feet | 0.785 rad / 0.3 s | - | - | no | motion.ts:318-326 |
| Landing recovery `landT` | playerController | ground after fall | 0.15 + (fall-3)*0.08, max 0.7 s | floor | blocks weapon | `landing` | playerController.ts:458,535-538; localMoveState.ts:121-125 |
| Landing bands | movement.ts | < 0.6 none, < 2.5 soft, <= 4.5 roll, else heavy | - | - | - | roll / landing | movement.ts:204-212 |
| Jump / leap | traversal.ts | jump, nothing offered | vy 5.6, cooldown 0.3 s | anchors | double tap = split | `ground` (no air mode) | traversal.ts:451,462-470; config/movement.ts:368-380 |

### Committed traversals (src/player/traversal.ts; contextual jump :433-457; no interrupts, kinematic; `MoveCommit` once per `n`)
| item | selection | duration base / min | net | file:line |
|---|---|---|---|---|
| step | 0.2-0.65 m | 0.4 / 0.22 | `step` | movement.ts:182-188; traversal.ts:18,21 |
| vault | <= 1.25 m, depth <= 1.0 | 0.7 / 0.42 | `vault` | same |
| mantle | <= 1.8 m | 1.0 / 0.75 | `mantle` | same |
| windowVault | window anchor | vault x0.9 | `windowVault` | traversal.ts:115-130,433-437 |
| drop | ledge | 0.35 / 0.25 | `drop` | traversal.ts:18,21 |
| hop | gap | 0.5 / 0.38 | `hop` | same |
| roll (landing 2.5-4.5 m) | band | 0.62 / 0.55, 1.6 m | `roll` | traversal.ts:23,345-349 |
| CT forward roll | crouch tap at gear >= 5, >= 1.5 m/s | 0.7 s, 3 m | `roll` | traversal.ts:398-401,485,497 |
| `traverseDuration` = clamp(len/speed*1.15, min, base) | - | - | - | traversal.ts:27-31 (D5.11 base) |
| sprint carry | `resumeSprint`, `traversePath` momentum | - | - | playerController.ts:583; traversePath.ts:29-45 |

### Attached (`ATTACH` spec src/player/attach.ts:69-82; attachController.ts; `ATTACHED_MODES` with `a`, `s`, `sub`, `gp`)
| item | speed | enter / exit s | camera | net | file:line |
|---|---|---|---|---|---|
| ladder | 0.9; sprint 5 rungs/s; slide 4.5 | 0.35 / 0.45 | ladder | `ladder` | attach.ts:55-56,60,70 |
| pipeV | 0.9; sprint 1.35; slide 3.2 | 0.35 / 0.45 | pipe | `pipeV` | attach.ts:58,62,71 |
| pipeH (hands, legsUp, inverted) | 1.0 | 0.3 / 0.35 | pipeH | `pipeH` | attach.ts:72; moveState.ts:127 |
| ledge | 1.2 | 0.3 / 0.4 | hang | `ledge` | attach.ts:73 |
| duct | 0.9 | 0.45 / 0.45 | duct | `duct` | attach.ts:74 |
| zipline | top 6, accel 2.4 | 0.3 / 0.3 | zipline | `zipline` | attach.ts:64-65,75 |
| split | - | jumpTime / 0.3 | split | `split` | attach.ts:77; splitJump.ts |
| rappel | up 1.0, down 1.6, sprint 3.0 | hookTime / 0.35 | rappel | `rappel` (+`u`) | attach.ts:79; config/movement.ts:318-322 |
| fence | climb 0.9, shimmy 0.6, flip 0.9 s | 0.3 / 0.35 | fence | `fence` (+`u`) | attach.ts:81; config/movement.ts:345-350 |

Exit poses (moveState.ts:125); `CLIMB_UP_TIME` 0.85, `UNSCREW_TIME` 1.2, `LOWER_HOLD` 0.3 (attachController.ts:60-70).

### Camera (src/player/shoulderCamera.ts)
| behaviour | rate | file:line |
|---|---|---|
| Spring follow of capsule | camFollow 16, footY 14 | :279-298 |
| Look-ahead | gain 0.14 s, clamp 0.3 m, spring 5 | :292-294 |
| Manual shoulder swap | spring 15.5 | :197,253,338; player.ts:178 |
| ADS | boom 2.2 -> 1.5, FOV x0.75 | :254,372; config/camera.ts:9-10 |
| Crouch pivot 1.62 -> 1.18 | rate 10 | :276; config/camera.ts:15-16 |
| Dash framing | boom +0.3, FOV +4 deg | :256,329,373 |
| Cover boom / low-cover eye / lean shift | - | :257,341; :33,275; :255,346 |
| Attach presets | blend 0.25-0.3 s | :265-274; config/camera.ts:99-110 |
| Pace framing | speed/2.8 | :340-341 |
| Low-space adaptation | lowIn 10, lowOut 2.5 | :309-316,342-347 |
| Wall pull-in | boomIn 40, boomOut 7, castRadius 0.12 | :364-367; config/camera.ts:32-41 |
| Safety casts, near plane, body fade | - | :307-308,350-351,369,385-398 |
| Recoil, shake | recover 9/s, trauma 1.6/s | :206-231,258-261,356-371 |

## 2. Bob sources (camera)
1. `sBob` spring (shoulderCamera.ts:100, applied :297-298, omega 16 critically damped) kicked by `footstep()` (:229-232, called every foot `landed` from player.ts:371-373: about 1.6 mm peak) and `impact()` (:222-227, ~1.6 cm). Footstep dip violates D2 "no camera bob" in principle: remove.
2. No camera landing dip exists; `rp.landing` goes to the rig only (player.ts:305).
3. Trauma shake (:356-371).
4. Handheld drift 0.0018 rad (:327-329), rotation only.
5. `dashBob: 0.02` dead config (config/camera.ts:73).
6. All camera springs are critically damped (`Spring.step` anim/rigMath.ts:122-129).
- Caveat: `sFootY` follows capsule height; stair steps (`stepAssist` playerController.ts:501) can show as camera vertical oscillation. Unmeasured.

## 3. Hooks
| feature | hook | exists |
|---|---|---|
| Quick 180 | motion.ts:346-356 or pivot :183-207 | no dedicated 180; 720 deg/s turn |
| Momentum carry | motion.ts:134; playerController.ts:583; config/movement.ts:371-373; landing keeps 30% (playerController.ts:542) | partial |
| Spring layer | animGraph.ts:811-818; characterRig.ts:908 | partial |
| Drag | new mode | none |
| Back-to-wall | coverController.ts | `cover` nearest |
| Door peek | none | missing |
| D5.11 | traversal.ts:27; traversePath.ts:17 | partial |
| D5.12 | speedGears.ts:31; gamepadSource.ts:155-161 (`vibrationActuator`); inputManager.ts:119 | analog yes, snapping no; rumble API yes, only used at gameState.ts:335,437 |
| D5.13 | shoulderCamera.ts:248-374 | follow, look-ahead, pull-in yes; auto shoulder swap and FOV by gear no |
| Collision solver | shoulderCamera.ts:171-195; cameraBounds.ts:11-63; config/camera.ts:29-66 | exists |

## 4. MoveState (src/player/moveState.ts)
`MOVE_MODES` :12-45 (u8 index, append only, :11): 0 ground, 1 cover, 2 ladder, 3 pipeV, 4 pipeH, 5 ledge, 6 duct, 7 zipline, 8 step, 9 vault, 10 mantle, 11 drop, 12 hop, 13 roll, 14 windowVault, 15 landing, 16 takedown, 17 split, 18 wallJump, 19 rappel, 20 fence, 21 grab, 22 brace, 23 boost, 24 stacked. `ATTACHED_MODES` :48, `COMMITTED_MODES` :49, interface :71-107, `COVER_SUB` :114, `ATTACH_SUB` :121, `EXIT_POSES` :125, `PIPE_MODES` :127, pack :215, sanitize :169-170. Builder `localMoveState` (src/game/localMoveState.ts; precedence team, grab, takedown, attached, committed, cover, landing, ground). Consumers: coopHost.ts:22,568,782,975; coopClient.ts:456; remoteAvatar.ts:207; validate.ts:13,162-175; protocol.ts:66-73,238.
Gaps: crouch stance not on wire; no modes for back-to-wall, door peek, holster / draw, elbow strike, medkit, drag, airborne, stop-hold.
