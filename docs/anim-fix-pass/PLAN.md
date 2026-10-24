# anim-fix-pass - PLAN

Causes below were traced in code at 191c3565 (read-only planner pass, four parallel probes); line numbers are that
commit's. Each slice: an Opus implementer, a fresh Opus checker, at most 1 fix round (current goal). Every slice ends
with its own Vitest file(s), `npx tsc --noEmit -p .`, eslint on its files, its after sheets (same commands as
`before/`, see "Before" below) and the slice's e2e (one suite, lane lock, `E2E_GPU=1`).
Walk 4.72 (docs/orchestrator/WALK-4.72-REPORT.md, Player): P1 = AF1 + AF2, P2 = AF3, P3 = AF5, P4 = AF4a + AF4b, P5 = AF6 (this
PLAN); P6 co-op hostage team takedown and P7 partner shots doubled / unsuppressed = PR #231 (feature/coop-walk-fixes).


## Slices
| id | title | files (only these) | model | group |
| --- | --- | --- | --- | --- |
| AF0 | Measurement harness and before numbers | tests/helpers/afpMeasure.ts (new), tests/animFixPass.test.ts (new, report-only `it`s that print the bars), tests/helpers/mocapStrafe.ts (crouch / pistol / wall plans, polish 7), scripts/anim-audit.mjs:478 (crouch gears) | Sonnet | 0 |
| AF1 | Fast-gait feet: no crossing, no sticking | src/anim/animGraph.ts (clip feet 2540-2660 only), src/anim/footPlanner.ts, scripts/mocap/emit.mjs, src/anim/clips/mocap/{walk,jog,run,sprint}.ts (regenerated), tests/mocapRunFeet.test.ts (new) | Opus | 1 |
| AF2 | Run carriage and steady hands | src/player/characterRig.ts (pel y 2400-2416, keyedTrunk 2996-3020, keyedArm 3118-3160, keepElbowOut 2924-2925 / 3565-3587), src/anim/mocap.ts (MOCAP_LAYERS), tests/mocapRunPose.test.ts (new) | Opus | 1 |
| AF5 | P3: mocap the only player path | src/ui/screens/settingsScreen.ts:156 / :212, src/core/app.ts:137-141, tests/mocapDefault.test.ts | Opus | 1 |
| AF6 | Co-op partner matches its owner, no jumps | src/net/remoteAvatar.ts, src/net/interp.ts, src/net/coopHost.ts, src/net/coopClient.ts, src/anim/motionDerive.ts, tests/net.test.ts, tests/netSim.test.ts, tests/partnerAnim.test.ts (new); wire only per A5: src/net/protocol.ts, src/player/moveState.ts, src/net/validate.ts | Opus | 1 |
| AF3 | Balanced crouch, consistent crouch walk | src/anim/animGraph.ts (crouch tables 2799-2823, crouchSet 2074-2158), src/anim/motion.ts (CROUCH_STEP 97 / 137), tests/mocapCrouch.test.ts (:109 bar moves), tests/keyedCrouch.test.ts | Opus | 2 |
| AF4a | Crouched strafe: hips steady, kneel holds its side | src/player/characterRig.ts (GLIDE_HIP 2442-2446 + const 397), src/player/playerController.ts (KNEEL_STILL 32, 652-654), tests/crouchStrafe.test.ts (new) | Opus | 2 |
| AF4b | Crouched strafe / wall slide: gun clear, pistol on one knee | src/anim/animGraph.ts (kneel side 1159-1162, crouched strafe mix 2302 / 2375, wall tuck 1485 / 1558, 1209), tests/crouchStrafe.test.ts (extends AF4a's) | Opus | 3 |

Groups run in order 0, 1, 2, 3; slices inside a group run in parallel and no two share a file. AF0 lands first
because every slice's acceptance reads its helper. AF4b waits for AF3 (both edit animGraph.ts) and AF4a (shares its
test file). Merge: one PR at the end (all groups), or per group if the lead wants a preview earlier.

## AF0 - Measurement harness (Sonnet, strict data / test)
- `afpMeasure.ts`: headless 30 / 60 Hz runs of the player rig (reusing tests/helpers/mocapPlayer.ts / mocapMeasure.ts)
  that return per run: planted-ankle signed lateral offset in the facing frame (metrics.ts `footTrack`; < -0.5 cm =
  crossed), body-frame foot gap at passing, plant duration in turns, contact slide, wrist second difference in the
  root frame (cm / frame), keepElbowOut activations / s, trunk pitch (hips -> neck vs vertical, `carriage()` as in
  tests/mocapCrouch.test.ts:41-53), pelvis height below standing, bank roll in turns, CoM fore-aft offset from the
  support midpoint (metrics.ts:261 / 622), pelvis lateral p2p, gun-vs-leg / gun-vs-trunk capsule clearance, grip-hand
  lateral position vs pelvis.
- Scenarios: jog 3.0 / run 4.0 / sprint 5.0 m/s straight and turning 1.5 / 2.5 / 4.0 rad/s both ways; walk 1.4 turns
  (control); crouch idle, gears 1-3 crouch walk and the gear 1 -> 3 ramp; crouched aimed strafe L / R at 0.4 / 0.7,
  stick flips and 10 stop-go cycles, rifle and pistol; drawn crouched wall slide both ways with a reversal.
- tests/animFixPass.test.ts records these as the before numbers into docs/anim-fix-pass/before/numbers.md (report-only,
  never failing), so each later slice asserts against fixed bars in its own test file.
- Fix anim-audit.mjs:478 crouch caps to GEARS.crouch; add a drawn crouched wall-slide sheet scenario (rifle + pistol)
  to scripts/anim-sheet.mjs; find why `--remote` with `E2E_NETSIM=typical` times out "waiting for everyone ready"
  (before/README.md) and give it a longer ready wait so AF6 can measure on a jittery network.

## AF1 - P1 legs sticking / overlapping at speed (Opus)
Causes:
1. Clip feet stay on through steering: `turnMax = twistMax / stance` (animGraph.ts:2657-2658) lets the jog keep clip
   feet to ~2.5 rad/s, run ~3.6, sprint ~4.3 (walk 1.0). In that range `clipFoot` pre-empts `holdOrStep`
   (footPlanner.ts:936), planted feet stay pinned (1550-1564) and swing targets are the clip ankle rotated by the
   current yaw (1585-1592): the body yaws over a pinned foot and the outside foot swings across the midline. `CF.on`
   (2659) has no hysteresis, so ownership flips frame to frame near turnMax. Walk turns go to N1's turn rules above
   1 rad/s, which is why they are fine.
2. The clips' planted track is narrow and off-centre (run planted ankle x L -6.3 / R +1.6 cm, sprint -1.4..-2.4 /
   +5.0): emit.mjs:254-260 measures `half` over the whole cycle including the swing arc and never re-centres. The
   ~8 cm stance gap sits at uncross minGapAny 0.08 and below KEYED_KNEE_GAP 0.11 (characterRig.ts:366, 2668-2681).
3. Planner steps at speed land near the midline: Body `trackMul 0.05` (animBase.ts:54-58, Michael's row, not edited
   here) scales the half at animGraph.ts:2545 to ~0.35 cm; gapNeed ~0.6 cm (footPlanner.ts:1774-1785); the rule steps
   (1623, 1631-1646) never fire at jog / run because windowLeft < idleStepTime * 0.75.
4. Pinned too long: CLIP_PIN_NEED 10 cm (footPlanner.ts:369, 1537-1548).
Fix: a yaw-rate cap on clip feet at jog+ like the walk's (hand to the planner from ~1.0-1.5 rad/s) with hysteresis;
re-centre and stance-measure the clip track in emit.mjs and regenerate; under clip feet / at speed floor the planner
half and gapNeed at the clip's stance half instead of trackMul's (in animGraph.ts at 2545, not in animBase.ts); let the
crossed rule step fire on a clip-planted foot.
Acceptance (AF0 runs, 60 Hz, both turn directions):
- no planted foot crossed (signed track >= +2 cm each side) at jog / run / sprint straight and at 1.5 / 2.5 / 4 rad/s;
- passing gap >= 7 cm; no plant longer than stance time + 0.1 s while turning > 1 rad/s;
- contact slide <= 1.5 cm per plant; no ownership flip more than once per 0.25 s;
- walk-turn numbers unchanged (+-10 %) and OFF dumps untouched where OFF does not use clip feet;
- tests: mocapRunTurn, mocapSwitch, mocapPlayer, footPlanner, footTurn + the new mocapRunFeet; e2e-anim (turn feet).

## AF2 - P1 hands wander and the weird run pose (Opus)
Causes:
1. Pelvis too low: the clip's absolute pel y is added onto the procedural pelY (characterRig.ts:2400-2416,
   `pey = pe.y + kpy` at 2405): run ~13 cm and sprint ~20 cm below the keyed run, so the knees bend (mocap pel y mean
   jog -3.1 / run -6.9 / sprint -12.5 cm over FORWARD_NODES jog -4.5 / dash -8).
2. keyedTrunk slerps the trunk fully to the clip (characterRig.ts:2568, 2996-3020): the POSTURE runLean 0.37 rad and
   BANK (animGraph.ts:1318-1330, 1350-1358) are wiped; the capture adds a constant pelvis roll -4.5 deg / yaw -2.1 deg
   and the sprint (other performer, 127_07) pelvis 24.6 / neck -42 deg.
3. Arms: armSwing and motionArmGain are 0 (MOCAP_LAYERS), arms ride the capture's trunk yaw (22 deg p2p); jog / run /
   sprint arm phase differs ~0.2 cycle from the walk so the 2.0-2.6 and 4.2-5.0 blends mix out-of-phase arms
   (animGraph.ts:2197-2236); keepElbowOut (characterRig.ts:2924-2925, 3565-3587) toggles on the tucked capture elbows
   (the likely "random" mover); the Joints `jog` row toggles at 3.7 m/s with no `run` row.
Fix: a mocap pelvis-height layer (the clip's height relative to its own mean, not absolute); a run lean / bank layer
after keyedTrunk, and the clip's constant roll / yaw removed; keepElbowOut with hysteresis / a rate limit on the
capture; arm phase aligned across the gait blend (phase-shift the jog / run / sprint arm sample to the walk's, or
cross-fade the arms over the leg phase). Not in mocap.ts's crouch rows (AF3) and not animBase.ts (crouch-pops).
Acceptance:
- pelvis at run 4.0 within 5 cm of the keyed run's height, sprint within 8 cm; knee flex at mid-stance <= 35 deg;
- trunk pitch at run 10-20 deg forward (CT run), sprint <= 25 deg; mean pelvis roll |x| <= 1 deg straight;
- bank into turns at 2.5 rad/s: roll into the turn >= 3 deg both directions (sign checked both ways, not left only);
- wrist second difference <= 1.0 cm / frame at 60 Hz through the 2.0-2.6 and 4.2-5.0 blends; keepElbowOut changes
  state <= 2 / s; no bone step > max(25 deg, OFF + 1);
- tests: mocapSwitch, mocapPlayer, mocapSprint, posture + mocapRunPose; e2e-anim ("leans into turns") and e2e-clip.

## AF5 - P3 mocap off (Opus) - per BRIEF A1
Hide the Settings > Gameplay "Mocap locomotion" row (settingsScreen.ts:156) and drop its reset (:212); app.ts
applyMocapSwitch (:137 / :141) ignores a stored `mocapLoco: false` (only `?mocap=0` or the tuner box turn it off).
No save-shape change (the field stays; no SAVE_VERSION bump). The setting text claim "your partner's view follows
their own setting" is wrong (characterRig.ts:1765-1766: the partner follows THIS machine's switch); it goes with the row.
Acceptance: a save with `mocapLoco: false` boots ON; `?mocap=0` still OFF (OFF md5 dump unchanged); the Settings
screen has no Mocap row; tests mocapDefault, settings, e2e-menus (one suite).

## AF6 - P5 co-op partner (Opus)
Causes, "doesnt match": no gait phase on the wire, so the partner runs its own clock from eased speed and yaw rate
(animGraph.ts:1058 `i.phase = -1`; owner uses renderPhase, player.ts:501); quickStop / holdSpeed / goalYaw / faceGoal /
rest / velocity never reach the partner's RigPose (remoteAvatar.ts:502-547 vs player.ts:501-536), so the CT stop hold
and stop placement are lost; MotionDerive on measured velocity (characterRig.ts:1860-1868, motionDerive.ts) fires the
mocap start / stop / turn slots (animGraph.ts:1857) at other moments than the owner; off a wall the yaw snaps in one
frame (remoteAvatar.ts:286, no post-wall turn limit as player.ts:383-388).
"Jumpy": `st.speed` from the older snapshot steps at 15-20 Hz and is only eased at 10 / s (remoteAvatar.ts:352-353,
interp.ts:143); the host stamps the client's states with arrival time (coopHost.ts:528), so jitter enters the spans;
INTERP_DELAY 0.10 / 0.12 s vs 50 / 67 ms send intervals leaves ~1 interval of margin under netsim typical, then
extrapolates up to 0.25 s and snaps back (interp.ts:126-134, remoteAvatar.ts:73); aimed `localX / Z` from per-frame
position deltas (remoteAvatar.ts:507-508); per-snapshot linear yaw with a 0.05 s yawRate tau (characterRig.ts:1870-1877).
Fix (receiving side first, A5): speed / yaw rate interpolated between snapshots, not stepped; sender time + ClockSync
on the host; delay at >= 2 send intervals + jitter; blend back from extrapolation; velocity-derived localX / Z
smoothed over the span; the post-wall yaw limit; derived motion fed from the smoothed values (motionDerive.ts). Wire
fields (phase, quickStop, holdSpeed) only if gaitPhase still fails, with PROTOCOL_VERSION and its tests. characterRig.ts
is not edited here (AF2 owns it in this group); the yawRate tau change, if needed, moves to a group-2 follow-up.
Acceptance (`E2E_GPU=1 E2E_NETSIM=typical node scripts/anim-audit.mjs <url> --remote`, flat set + stopidle + wall rows):
- poseError <= 10 cm on stand 2 / 4 / 6, crouch 3, stopidle; wall rows <= 20 cm;
- pops = 0 at 60 Hz on every row (before, clean net: stand4 13, crouch3 5; pose 25.9 / 31.95 cm, lowerBody 53.7 /
  45.1 cm, gaitPhase 0.23 / 0.30 cycle: before/README.md);
- gaitPhase worst < 0.1 cycle, median < 0.05; lodSkip 0; lowerBody <= 10 cm on flat rows;
- partner wrist second difference (DUMP=1, offline) <= owner's + 1 cm / frame;
- tests: the net unit tests touched; laptop: e2e-coop + e2e-netmove on the pushed commit (A6).

## AF3 - P2 crouch lean and crouch walk (Opus)
Causes:
1. The gear-1 sneak band is the CMU 136_09 capture (animGraph.ts:2083, 2105) with MOCAP_CROUCH_POSE 0 / 0 (2822-2823,
   applied 2088): pelvis 11 / spine 45.3 / chest -5.2 deg, sum 51 deg, world trunk 43 deg, hips 68.6 cm and NOT back
   (pelZ -0.1 cm; the keyed idle that balances has -10.4 cm). CoM ends ahead of the feet: "hard to balance".
2. The crouch changes shape across the stick: gear 1 capture (43 deg, hips 68.6 cm, sway 8.8 cm), gear 2 ~50 / 50
   (band edges sneakTo 0.7 / walkFrom 1.1, 2799; effort.ts:26), gear 3 keyed (~28 deg, hips ~27 cm lower, sway 2.3 cm).
3. Steps too long for a low gait: CROUCH_STEP 0.3 + 0.2 v, cap 0.95 (motion.ts:97, 137) = 0.47-0.82 m at gears 1-5
   (S4-REPORT.md:155, keyed ~42 cm); the capture body sits over the keyed sneak's feet (duty 0.66, lift 0.045,
   2149-2157) so its 8.8 cm sway is not matched by the feet (over PELVIS_P2P.crouch 2.5 cm, limits.ts:121 / 136).
Fix: MOCAP_CROUCH_POSE gives the capture a negative spine lean and hips-back offset so its trunk matches 30-38 deg
and its hips sit over the feet; KEYED_CROUCH_POSE (2817-2821) evened so gears 1-3 keep one carriage; the capture's
sway scaled to the keyed feet; CROUCH_STEP k ~0.12 (shorter steps, higher cadence). If the corrected capture still
misses, drop it from the sneak band (A3b).
Acceptance: crouch idle unchanged (trunk ~32 deg, +-2); trunk 30-38 deg at gears 1-3 and <= 6 deg change across the
gear 1 -> 3 ramp; hips height change <= 5 cm across gears 1-3; CoM fore-aft within 5 cm of the support midpoint in
crouched double support; pelvis sway <= 5 cm p2p; step length 0.40-0.50 m at 1.3-1.7 m/s; foot slide <= 1 cm;
tests: mocapCrouch (:109 `on.trunk > 35` and "hips > 8 cm above OFF" move to the new bars), keyedCrouch,
mocapCrouchShift, crouchEntryRig, posture, footPlanner; e2e-anim (crouch twist rows 1362-1365) and e2e-clip.

## AF4a - P4 crouched strafe: wander and the kneel side flip (Opus)
Causes:
1. Wander: GLIDE_HIP moves the hips all the way to the feet midpoint (share 1, up to +-9 cm, tau 0.08) on every short
   crouched shuffle (characterRig.ts:2442-2446, const 397); the STRAFE_HIP_RATE limiter (2452-2472) is keyStrafe-only,
   so crouched it is unlimited: up to ~18 cm p2p.
2. A kneel starts after the stick is idle for `KNEEL_STILL` 0.05 s (playerController.ts:32, 652-654), including at
   every L <-> R stick flip through centre, so the crouched strafe drops into a kneel and back on each flip.
Fix: GLIDE_HIP crouched with a share < 1 and a rate cap like STRAFE_HIP_RATE; KNEEL_STILL crouched-aimed hysteresis
(~0.35 s still, ignored through a stick flip).
Acceptance (AF0 crouched strafe runs, rifle + pistol): pelvis lateral offset from root <= 4 cm p2p steady and pelvis
beyond pace * dt <= 2 cm a frame; no kneel during an L <-> R flip; grip-hand jitter <= 1.0 cm / frame steady, <= 2 cm
on flips and stops; tests: keyedCrouch, crouchEntryRig, mocapStrafe (OFF / standing unchanged) + crouchStrafe.

## AF4b - P4 rifle clips, pistol between knees (Opus)
Causes:
1. The knee is picked once per kneel from the planner's fore-aft lead: `this.lead < -0.05 ? -1 : 1`
   (animGraph.ts:1159); crouched the stance lead is zeroed (2554), so after a sideways stop the lead is arbitrary and
   KNEEL vs KNEEL_M flips between stops (1162); WREN_PISTOL_READY y -0.34 / pitch 1.16 (582) holds the pistol at knee
   height, so it lands against the other knee each time.
2. Crouched sideways travel plays the FORWARD sneak / crouch-walk body (crouchSet 2074-2158, mixed at 2375); only the
   capture is re-centred (`-meanPel[0]`, 2106-2107), so a forward pelvis sway plays on a sideways step.
3. Drawn at a crouched wall: no keyed set (`dOn` needs `!i.wall`, 1873); the WALL_READY tuck skips the crouch muzzle
   raise (`bendK * nw`, 1558) while WALL_SIDE_POSE.spine leans ~45 deg over the knees (1209), so the muzzle points
   into the thighs; each reversal flips `awayYaw` (1485) and turns the body 180 deg through square (sideK, 1126).
Fix: the kneel side from the aim side / last kneel side (sticky), not the lead; the crouched strafe re-centres the
keyed pelvis sway; the crouch muzzle raise applies at the wall and the reversal keeps the gun on the wall-away side.
Acceptance: same kneel side over 10 stop-go cycles; pistol-hand lateral position vs pelvis varies <= 3 cm across them;
gun vs leg capsules >= 0 cm and gun vs trunk >= -1 cm on every frame (rifle and pistol, strafe and wall slide incl.
reversal); tests: keyedCrouch, wall* tests, crouchStrafe; e2e-anim (crouched aimed strafe) and e2e-clip.

## Before (docs/anim-fix-pass/before/, 191c3565 + the aimcrouchstrafep scenario)
See before/README.md for the commands, the sheets and the quick-audit numbers.

## Polish list (not slices; current goal)
- Hand-keyed states seen in both modes: drawn low-ready legs, aimed glide fwd / back, standing idle ("even the normal
  ones arent good"): candidates for the next pass once Michael has walked this one.
- MT2-STRAFE polish 1-6 (#221's list, standing aimed strafe only).
- The audit only measures the host's copy of the client; the client's view of the host is unaudited.
- Sprint take 127_07 (other performer, still accelerating, seam 14.4 cm): a better take needs a download (Michael).
