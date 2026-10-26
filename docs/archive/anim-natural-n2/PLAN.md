# anim-natural N2 - plan

From the research agent's survey (2026-10-22 ~14:00, read-only on master 5220f79c; harness
`C:/NightShift/scratch/n2-research/repo/tests/n2measure.test.ts`, results `n2measure.json`, not in git).

## Where things come from (master 5220f79c)
- Wren's holstered gaits are keyed (src/anim/clips/keyed/*.ts from scripts/anim-keys/keys/*.json): walk -> jog -> run
  by effort pace (animGraph.ts speedSet ~1741-1765, KEYED_GAITS ~2121), crouch set ~1635-1700, drawn set ~1775-1866
  (aiming uses the glide legs; keyed trunk off: keyTrunk = 1 - dS*raise ~1569).
- Trunk: keyed quaternions via CharacterRig.keyedTrunk (characterRig.ts ~2577-2604, called ~2263); key edits ~2266;
  procedural twist locomotion.ts twist() ~34 (GAIT_STYLE.twist 1.3), writeTargets animGraph ~1930-1933.
- Head: world-stabilised characterRig ~2391-2400 (keyed neck yaw undone).
- Arms: keyed points scaled by `amp * TUNE_CUR.armSwingK` (keyed.ts ~453, key edits ~502); keyedArm characterRig
  ~2611-2650; no wrist rate limit.
- Sway: keyed pel x into pex characterRig ~2147; walk keyed +-1.146 cm; SWAY_MAX 0.0115 (locomotion.ts:31) drives the
  procedural clips (mostly guards; pinned by tests/anim.test.ts:180).
- Bake: a rule in tuneBakeTable.ts into a `CONST.path` literal + BAKE_CATALOGUE_MODULES; coverage test fails otherwise.

## Measured now (headless operatorRig, 60 Hz, untuned)
| Row | Pelvis / shoulder p2p deg | Corr | Lateral cm | Head yaw / pitch | Wrist range cm | Wrist peak m/s |
| --- | --- | --- | --- | --- | --- | --- |
| walk 1.4 | 3.1 / 3.1 | -1 | 1.7 | 0 / 0 | 23 | 0.9 |
| jog 3.0 | 5 / 7 | -1 | 1.6 | 0 / 0 | 21.5 | 4.4 |
| run 4.0 / sprint 5.0 | 51 / 52 (key pop) | | 1.2 | 0 / 0 | 67 | 14.8 / 16.5 |
| sneak | 2 / 2.4 | | 1.8 | | 6.3 | |
| crouch walk | 4 / 4.8 | | 2.2 | | 16.8 | |
| crouch run | 5 / 5.9 | | 1.4 | | 21.9 | |
| low ready walk / jog | 3.1 / 2.7, 5 / 5.8 | | | | | |
| aim glide fwd / side / back | 1 / 4, 0.6 / 4.2, 0.9 / 3.9 | -0.86 / -0.47 / | 4.1 (side) | | | |
| crouch aim moving | 1.1 / 3.8 | -0.5 | 0.8 | | | |
| stills (low ready, aim, crouch aim) | 0-0.1 / 0-0.3 | | 0.1-1.2 | | | |

## Steps
1. **Run key fix + harness** (A1, waits for Michael): run.json key 0 continuous with his later keys, Blender rebake
   under the lock; tests/bodyMotion.test.ts from the scratch harness. Run pelvis 51 -> 18-25, shoulders 52 -> 25-35,
   wrist 14.8 -> < 6 m/s; re-measure e2e-anim RUN_TUNE limits (scripts/e2e-anim.mjs ~451-463) and tighten.
2. **Body layer core** (new pure src/anim/bodyMotion.ts, no allocation): BODY_MOTION per-row literals (selectBodyGroup
   ids), blended by the graph's continuous weights (effort pace, crouchK, dS, raiseS, moveW); hip yaw, chest counter,
   sway, head follow, nod, all phase-locked to o.gait.phase. animGraph: preallocated RigTargets.motion after
   studioDriveTargets (~1581), gated on wrenReady and on foot. characterRig: trunk after ~2266, pex ~2147-2170, head
   ~2394. Defaults (deg hip / chest, sway cm): walk 2.5 / 2.5 / +1.4, jog 3.5 / 4.5 / +0.8, run 3 / 4 / +0.6 (after
   A1), sneak 1.5 / 1.5, crouch walk 2 / 2, crouch run 2.5 / 3 (crouch rows +0.8), aim glide 1.5 / 0, crouch aim
   moving 1.2 / 0; head follow 0.35, nod 0.6 deg. Targets: walk ~8 / 8, jog 12 / 16, sneak 5 / 5, crouch walk 8 / 8,
   aim counterCorr < -0.8, walk lateral 3.2-4.2 cm (fix round, A11: the sway at 0.7x, walk 0.98 / jog, sneak, crouch
   0.56 cm, so the knee-out stays <= 2.9 cm in the facing frame; was 4-5), head yaw 2-6 moving (the run too, headFollow
   0.18 after A1) / 0 aiming, head pitch p2p <= 2.
   Tests: amounts 0 bit-identical first, then re-capture the Wren identity fixture; the guard fixture stays
   bit-identical; row-weight continuity; phase-locked 60 / 120 / 240 Hz; e2e-anim "body motion" block; remote parity
   (graph-internal inputs only, never owner-only RigPose fields).
3. **Arms**: KEY_MOTION.armGain next to armSwingK (walk 1.3, jog 1.6, run 1.0 after A1, crouch 1.0); keyedArm wrist /
   elbow speed cap 6 m/s in the chest frame (preallocated per rig, identity under the cap). Walk wrist range 23 -> ~30,
   jog 21.5 -> ~35; turn / strafe wrist 13-22 -> < 6 m/s.
4. **Drawn stills**: breathing (chest pitch 0.8 deg p2p ~0.25 Hz on idleT), weight shift (+-1 cm, roll 0.5 deg over
   ~7 s); the gun keeps its world aim; muzzle change < 0.05 deg. e2e-anim settle / drift / grip guards stay green.
5. **Tuner section + bake**: src/anim/tuneMotion.ts, section `motion` ("Body motion", Weight tab), groups
   `motion.<row>`; 13 sliders (hipTurn, hipTime, chestTurn, chestTime, sway, swayTime, headFollow, headNod, armSwing,
   armSpeed, breath, shift, shiftTime; plain labels < 30 chars); one rule block appended to tuneBakeTable.ts into
   BODY_MOTION.<row>.<field>; BAKE.md paragraph; tunerLayout / tunerTarget / tunerEffect entries; tuneV2Sections order pin.

## Clash map
- N1 (footPlanner, footGeom, tuneStep, turnFollow, tuneBakeTable Stepping block, BAKE.md Stepping, audit/metrics.ts,
  e2e-anim +174, characterRig heelLift / turnRule / pin ~1792, identity fixtures): N2 never edits those; appends one
  block at the end of tuneBakeTable / BAKE.md; a self-contained e2e-anim block after CRAB (RUN_TUNE edit coordinated).
- N3 (animGraph ~55 / 578 / 696, carriage ~1092-1110, swap overlay ~1386-1420; characterRig ~300, 819-845, arms and grip
  ~2410-2560, ~3121-3303, ~3426; drawTune.ts): none of N3's hunks; section order agreed with drawTune.
- Identity fixtures: whoever merges second re-captures after re-running the "amounts 0" proof.
