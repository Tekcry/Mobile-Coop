# anim-natural N2 - state

## Now (2026-10-22 ~16:00: merged master 4.54.1 at 14cbecc2)
Merged master 4.54.1 (#103 body base, #113 anim-n4, #117 flake fix) at 14cbecc2. Conflicts: CHANGELOG, e2e-anim crab
state rows (master's BODY_STATE ranges 5th, N2's turn pelvis-frame flag 6th), identity test header, the Wren identity
fixture. Proof: BODY_MOTION amounts 0 + master's run clip at run time = master's fixture on all 40 entries; with N2's
run clip keyed:run and partner:moves move (A1); the layer moves partner:moves. Both Wren fixtures re-captured; guard
fixture unchanged. The #103 body base composes with the layer (no shared field: the layer is not scaled by
trunkTwistMul / headTurnMul, the base sets neither). The base + layer knee-out (walk 3.6 cm) broke crabFacing's 3 cm:
fixed by A12 (BRIEF): crabFacing reads e2e-anim's own widened limits (BODY_GAIT / BODY_STATE / BODY_DRAWN, parsed from
the script), walk sway 0.98 -> 0.6. Headless facing knee-out / track max (cm, limit): walk 3.4 / 3.2 (3.5), walk 2.1
3.5 / 3.2 (3.7), jog 3.1 / 2.9 (3.4), low ready walk 3.3 / 3.2 (3.5), low ready jog 3.1 / 2.9 (3.4), idle 3.4 / 3.9
(9.3), crouch rows 2.3-2.4 (3); walk lateral 2.9 cm (e2e band now 2.5-3.5). Identity fixture re-captured (partner:moves
only). Unit set green (bodyMotion's allocation check failed once under the 12-file parallel run, 3.2 MB > 2 MB; green
solo twice). e2e-anim not run: its crab rows should read about the headless numbers. master has since moved to 4.55.0
(#121), not merged.

## Before (2026-10-22 ~14:50 save point, 5-hour pause)
Step 2 done: built (0004b057, REPORT-2.md), checker FAIL (CHECK-2.md: gated crab track / knee-out), the one fix round
(9756a8ee): A11 (the gated crab track and knee-out read in the facing frame, `src/anim/audit/crabFacing.ts`, e2e-anim
crabRow; turn and wall rows keep the pelvis frame), sway 0.7x (walk 0.98, jog / sneak / crouch rows 0.56, run 0.6 cm),
run headFollow 0.18, aim / aimCrouchMove headNod 0. Every gated crab row passes headless in the facing frame (walk
track 5.1 / knee-out 2.8, walk 2.1 4.9 / 2.9, crouch 2.15 5.8 / 2.3; tests/crabFacing.test.ts). A1 kept and merged
(d3c6f083); its run elbow flex fixed by run key 2 left elbow 73.5 -> 80, rebaked (13c3ddb6; keyedWalk green). Run now
(4 m/s): pelvis / shoulders 25.8 / 28.8 deg p2p, max step 3.1 / 3.6 deg per frame, wrist peak 12.1 m/s, knees 1.44x
hips, track 13.8 cm, knee bow 6.1 cm. Unit tests green (bodyMotion, crabFacing, keyedWalk, runKeyContinuity, both
identity tests; guard fixture never moved). No desktop e2e yet on this branch.

Body motion after the fix round (60 Hz; pelvis / shoulders deg p2p, corr, lateral cm, head yaw / pitch deg): walk
8.1/8.1, -1, 3.6, 2.83/1.2; jog 11.8/15.6, -1, 2.6, 5.48/1.2; run 25.8/28.8, -1, 2.2, ~5.2/1.2; sneak 5/5.4, 2.9,
2.17; crouch walk 8/8.8, 3.3, 3.16; crouch run 10/11.9, 2.5, 4.49; low ready walk 8.1/6.7, 3.6; aim fwd 3.8/4, -0.99,
head 0/0; aim side 3.2/4.2, -0.99; aim back 3.8/3.9; crouch aim moving 2.8/3.8, -1.

## Next
1. Step 2 verification under the lock (or the laptop for logic): npm run check, e2e-anim (the new body motion block's
   first desktop run: walk lateral 2.5-3.5 cm (A12), head yaw 2-6 incl. the run; bands may need review; the gated crab rows
   in the facing frame), e2e-studio, e2e-netmove, e2e-clip. Then the step's checker sign-off note in CHECK-2.md.
2. Master 4.54.1 merge: done (14cbecc2; crabFacing knee-out open, see Now). Still pending: after #110 merges, rebake
   run once more (#110 changed key_clip.py's half), then re-capture the Wren identity fixture; master 4.55.0 (#121,
   keyed clip and fixture changes) not merged yet.
3. Step 3 (arms): KEY_MOTION.armGain, the wrist speed cap (A8; the run wrist 12-14 m/s comes from Michael's retimed
   arm keys), PASS2 (docs/anim-natural/PASS2.md on feature/anim-natural) item 7 (low-ready gaits: arms and head locked
   to the gun) and item 9 (crouch run uses the jog's arm swing); AUDIT fix 35 (low-ready run pelvis +-25 deg with 20
   deg snaps per step: the same keyed run trunk, re-measure after A1). Step 4 (drawn stills) + PASS2 item 1 (hit flinch
   invisible: rig.hit 0.9 deg shoulders, animGraph.hitReact). Step 5 (tuner section + bake; studio in-place loops
   should show the layer). Each: implementer + fresh checker, one fix round.
4. e2e-anim RUN_TUNE tightening from the A1 numbers (A1-RUNKEY.md proposals, re-checked against #110's merged values);
   anim-audit `--compare` re-baseline on the PC (walk lateral 1.7 -> 3.6 cm is intended); GPU sheets before / after.
5. PR (minor) after N1's PR; the A1 before / after sheets (docs/anim-natural-n2/sheets/) in the PR body for Michael.

## Polish list (CHECK-2)
Head follow lags the chest in turns; pace scaling within a row (a 0.75 m/s creep gets the full swing); e2e band edges
(sneak head yaw 2.17 vs floor 2, run lateral 2.2 vs 2-3); cache bodyMotionStep's constant cos / sin.

## Done
- 2026-10-22 ~14:05: branch from master 4.53.0 (5220f79c); research, BRIEF / PLAN / STATE.
- 2026-10-22 ~14:20: A1 on feature/anim-n2-runkey (038e2519), kept.
- 2026-10-22 ~14:35: step 2 built, checked (FAIL), fixed (9756a8ee); A1 merged; run elbow key (13c3ddb6).

## Resume prompt
```
anim-natural N2: RESUME. Night Shift | CT Core Build, Opus, effort high. Folder C:/NightShift/Mobile-Coop-anim-natural-n2,
branch feature/anim-natural-n2. Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-natural-n2/BRIEF.md (A1-A11), PLAN.md,
CHECK-2.md, this STATE. Carry on from "Next": implementer + fresh checker per step (Opus subagents, no full vitest /
check / e2e inside them), heavy runs only under the atomic C:/NightShift/heavy.lock or on the laptop runner "Night
Shift | Character Build", message "Night Shift | Orchestrator" at each step and the PR.
```
