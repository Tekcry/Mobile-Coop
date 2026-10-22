# anim-natural N2 - state

## 2026-10-22 ~20:50: PR #138 open (head edabdc2c, contains N1), for train 8
- CHECK-5 PASS (fresh checker on c0f6f9f9); fragment brought up to date; PR #138 opened (minor).
- Desktop suites on c3a10b41 (software GL, JOBS=2): e2e-anim / move / studio / clip ok; e2e-coop / e2e-netmove killed at
  600 s beside the checker at 100% CPU (orchestrator: no rerun, train 8's full run covers them).
- N1 #135 merged master 4.58.0 (08023227; #123's bake table: N1's step manuals dropped, generic table). N1 and N2
  conflicted (e2e-anim.mjs, identity header, Wren fixture): N1 merged into N2 (9e2a5c2c), fixtures re-captured on the
  combined code (edabdc2c): N2 off = N1's fixture 40 / 40, turnRule 0 = N2's 40 / 40; moved partner:moves (+ keyed:run vs
  N1). Clean merges with master and N1.
- New rule (orchestrator ~20:35): desktop e2e with E2E_GPU=1 under the lock; a GPU-only failure reruns in software.
- Next: nothing unless train 8 fails; then steps 4-5 (PLAN) in a new PR; polish list in CHECK-5.

## 2026-10-22 ~19:55: pre-PR round built (15921223, c0f6f9f9); fresh checker running (CHECK-5)
- 15921223: CHECK-4 should-fix 1 (armCap via armCapO, 208 B a frame gone), 2 (no cap under the studio drive), and the
  alloc test on #128's allocPerCall (0.00 B). c0f6f9f9: run arm pop fixed (arm keys retimed, Blender -b rebake 19:49 under
  the lock; wrist step per clip frame 23.5 -> 6.5 cm; run wrist peak 17.6 -> 5.5 m/s); identity fixtures unchanged, no
  re-capture. REPORT-3 has both sections. Single files green, tsc / eslint clean.
- Next: CHECK-5.md from the checker; on PASS open the PR (minor; no pre-run), message the orchestrator, send the
  laptop area suites (e2e-anim e2e-studio e2e-clip) to Character Build, copy the orchestrator. Then steps 4-5 (PLAN) and
  the #128 alloc follow-up (done here: the helper is used).

## 2026-10-22 ~19:45 (new account): master 4.57.0 merged (02187841), pre-PR round running
- Merge of master 4.57.0 (train 6): CHANGELOG.md is master's; N2's entries moved into
  `changes/feature-anim-natural-n2.md` (fragments, G183). Master's #122 removed `AnimInput.slide`, which switched the body
  motion gate off (walk pelvis 3.1 deg); the gate drops it. Both identity fixtures unchanged; bodyMotion, crabFacing,
  keyedWalk, runKeyContinuity green; the full unit run (accidental, unlocked) 2812 passed, 1 failed: bodyMotion's alloc
  check (3.2 MB, CHECK-3 should-fix 1).
- Running (two Opus implementers, same folder, disjoint files): (A) CHECK-4 should-fix 1 (armCap boxing) + 2 (no cap
  under the studio drive) + the alloc test on #128's allocPerCall helper; (B) the run arm pop: run.json arm keys only,
  Blender -b rebake under the desktop lock, runKeyContinuity arm pin (n2-pop-wip.patch). Then: the job lead re-captures
  both Wren fixtures (expect keyed:run + partner:moves), writes "Run arm pop fix" + the should-fix notes into REPORT-3,
  a fresh checker, the PR (minor; no pre-run), laptop area suites e2e-anim e2e-studio e2e-clip via Character Build.

## 2026-10-22 ~20:15: step 3 + master 4.56.0 merged (b69e1a26)
- fd9a9c1a: merge of feature/anim-natural-n2-s3 (step 3 arms, 4e974ea1, REPORT-3), clean. b69e1a26: merge of master
  4.56.0 (train 5: #118 N3 draws, #120 idle-shins, #125, #126); only CHANGELOG conflicted. keyedArm: N3's call site is
  master's (`kaw = kw > 0 && gripW <= 0 && kneeHandW === 0 ? keyArmW : 0`): gripped or travelling, kaw 0 and keyedArm
  returns before armCap, so drawn arms stay on N3's grip IK, never capped; KEY_MOTION gain only in speedSet / crouchSet.
- Proof: amounts 0 + KEY_MOTION identity + master's run clip = master 4.56.0's Wren fixture 40 / 40; motion-off vs master
  keyed:run + partner:moves; layer-on vs motion-off partner:moves. No re-capture needed; guard fixture = master's.
- Single files green (both identity, bodyMotion, crabFacing, keyedWalk, runKeyContinuity, animAudit, n3DrawMotion,
  idleShins, keyedDrawn, readyHands, animTuneBake, tuneV2Sections); tsc, eslint clean. crabFacing gated elbows low ready
  walk / jog 4.89 / 5.69 (6).
- Step 3 fresh checker: running (CHECK-4). Next: the run arm pop (orchestrator 19:45: right wrist 22 cm in one clip frame
  at the half wrap, run frames 16 -> 17): retime / smooth the key, Blender rebake, before / after in REPORT-3; then the PR
  once the checker passes (no pre-run: no src/net / protocol / save; the train's full run covers it).

## 2026-10-22 ~19:10: step 2 verified on the laptop (53e6dc03, JOBS=1, port 4192)
check PASS (2714 passed, 8 skipped; bodyMotion alloc passed this time), e2e-anim PASS (no ASSERT), e2e-studio PASS,
e2e-clip PASS. Rifle low ready jog elbows 5.7 / 6.0, knee-out 3.2 / 3.4; walk knee-out 3.4 / 3.5, elbows 7.5 / 8.3;
rifle low ready walk knee-out 3.4 / 3.5, elbows 4.9; crouched low ready walk knee-out 2.1 / 3, elbows 5.9 / 6.0; run
knee-out 8.4 / 10.7, track 2 / 18, elbows 9.5 / 11. Body motion (pelvis / shoulders deg p2p, corr, lateral cm, head
yaw / pitch): walk 8.06 / 8.06, -1.00, 2.9, 2.82 / 1.20; jog 11.80 / 15.65, -1.00, 2.6, 5.48 / 1.27; run 25.79 / 28.78,
-1.00, 2.2, 5.22 / 1.29; sneak 4.99 / 5.39, -0.99, 2.9; crouch walk 7.99 / 8.78, -0.99, 3.3; aim glide fwd 3.99 / 5.71,
2.3; aim side 3.26 / 5.00, 3.8. All 8 body-motion asserts ok. Step 2 DONE. Master is now 4.56.0 (train 5): merge it
with step 3.

## 2026-10-22 ~18:45: master 4.55.1 merged, A13, run rebaked (head 53e6dc03)
- Master 4.55.1 merged by an agent in the temp worktree (70953f1c): CHANGELOG both kept; run.ts `half` took master's
  0.05042 (#110's measure), N2's A1 keys kept; e2e-anim crabRow (ranges 5th, pelvisFrame 6th, flag only on turn rows).
  Proof: amounts 0 + master's run clip = master's fixture 40 / 40; motion-off vs master and layer-on vs motion-off differ
  only on partner:moves. Guard fixture unchanged.
- A13 (416184da): the drawn chest yaw x (1 - drawn); headless low ready jog elbows 6.01 -> 5.69 cm (limit 6), low ready
  walk 5.17 -> 4.89; crabFacing now gates the elbow wing on the low ready rows. bodyMotion: low ready walk head yaw <= 2.
- Run rebake (Blender -b, /c/NightShift/ctb10.out): half 0.05042 -> 0.04997; both Wren fixtures re-captured (53e6dc03):
  keyed:run and partner:moves only. Headless crab rows (agent, pre-rebake): walk 3.4 / 3.5, walk 2.1 3.5 / 3.7, jog
  3.1 / 3.4, low ready walk 3.3 / 3.5, low ready jog 3.1 / 3.4, crouch rows 1.7-2.2 / 3 (#110's crouch halves), run
  pelvis-frame knee-out 6.1 -> 6.9 cm (within RUN_TUNE kneeBow 0.107).
- Laptop asked (18:45): check + e2e-anim e2e-studio e2e-clip on 53e6dc03.
- Step 3 (arms): implementer agent in feature/anim-natural-n2-s3 (C:/NightShift/Mobile-Coop-anim-natural-n2-merge,
  from 4028d386); merge it here after (re-capture the fixture again then).

## 2026-10-22 ~17:55: bodyMotion allocation test (Course Ready, PR #128 feature/heap-asserts)
The deterministic helper is `tests/helpers/allocPerCall.ts` (#128: gc() + new space per round, rounds with a scavenge
discarded; `inputs()` into a Float64Array; typed `sink`; HEAP_NUMBER 16). When #128 is on master (or copy the helper),
replace tests/bodyMotion.test.ts:126-149 with Course Ready's version: `import { bytesPerCall, HEAP_NUMBER, inputs, sink }
from './helpers/allocPerCall'`; N = 2000 precomputed inputs PH / MV / CR / AM / DR (phase, move, crouch, aim, drawn) and
TA / TB (band times: `((k * 3) % 6000) / 1000`, `((k * 3) % 3000) / 1000`); per call: set the inputs,
`bodyMotionBands(i, TA[k], TB[k], KEYED_GAITS, KEYED_CROUCH)`, `bodyMotionStep(i, o)`, `sink[0] += o.hipYaw + o.chestYaw +
o.pelX + o.headPitch`; `bytesPerCall(fn, HEAP_NUMBER / 2)`; expect finite sink and per <= HEAP_NUMBER / 2. If it reads
16-32 B (the two band times boxed at a non-inlined call), the limit may go to 3 * HEAP_NUMBER (still under one object).
Field names to check against the test.

## 2026-10-22 ~16:55: step 2 desktop verification (ctb9 on 21106003, /c/NightShift/ctb9.out, ctb9.log)
- check ok (2696 tests); e2e-netmove ok, e2e-studio ok, e2e-clip ok.
- e2e-anim FAIL, one assert: "rifle low ready jog speed 4: elbows in (6 cm outside the shoulder)", limit 6.0
  (ctb9.log:245 / :250; master's base #110 read 5.7, ctb-d.log:245; pre-#103 4.5). Every crab knee-out passes in-browser
  (low ready walk 3.4 / 3.5, low ready jog 3.2 / 3.4, walk rows about the headless numbers), so CHECK-3 should-fix 2 is
  answered: no further walk sway cut needed.
- Step 2 checker: PASS (CHECK-3.md). The bodyMotion allocation check goes to Course Ready's heap-asserts job
  (orchestrator 16:50).
- Master 4.55.1 merge: an agent in the temp worktree feature/anim-natural-n2-merge
  (C:/NightShift/Mobile-Coop-anim-natural-n2-merge), then the low ready jog elbow fix there (layer, never the limit);
  then fast-forward this branch to it and rerun e2e-anim on the desktop.

## Before (2026-10-22 ~16:00: merged master 4.54.1 at 14cbecc2)
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
