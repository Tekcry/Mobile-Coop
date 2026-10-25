# mixamo-retarget - state

## Resume (2026-10-25 ~21:10, new account; TOP PRIORITY, Michael ~20:10: "Top priority is getting new mixamo animations in so I can fine tune")
- Target: ONE PR (#452, big-pr), all 21 clips listed / tunable in Anim Studio's "Motion capture" group; in-game use
  later (I1-I3) behind `mixamo`. Menu path for Michael: Main menu > Anim Studio (dev) > Motion capture.
- Branch `feature/mixamo-retarget` = M1 + M2 (+ spine fix round) + M3 + M4 + M5 + M6 + changelog fragment, built in
  worktree `C:/NightShift/Mobile-Coop-mixamo-retarget-m4` (the -m4 branch is the same head). All slices merged.
- Regenerate (dumps in build/mocap/mixamo/raw, not in git; `node scripts/mocap/mixamo.mjs` makes them with Blender):
  keyed `node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/mixamoEmit.mjs`, traversal
  `node scripts/mocap/mixamoChannels.mjs`. Direction check `node scripts/mocap/mixamoTake.mjs` (0.01 deg on all 21).
- Checks: Opus checker PASS on bf89487f (all but M4); M4 checker RUNNING on 60aefbe5; laptop e2e-studio + e2e-anim
  request 20261025T100929-night-shift-player-b-60aefbe5-0875 (set mixamo). typecheck + 9 vitests green (98 + 1 skip).
- Then: post `checker` on the head, PR ready (gh pr ready 452), affected-e2e, message the orchestrator at train-ready.
- Polish (checker, later PR): (1) art-credits licence sentence still a placeholder: copy the Mixamo FAQ sentence by hand
  before switch-on (A11); (2) CLIPS.md "Dir err" / M3-REPORT use retargetDirErrDeg (0 by construction): show the
  mixamoDirCheck numbers; (3) studio.ts pulls ~0.54 MB of generated clips into the game bundle (imported by
  gameState.ts, world/maps/index.ts): dynamic import or smaller LOOP_FPS / trims; (4) no probe that tuner rows move the
  keyed captures on carry / crawl / ledge / crouchIdle body states; (5) M4: onTop dropped in the two hang climb-ups
  (foot tops before release, as the game clip), freehang_climb ~4x faster than the take (judge in I2 video),
  hanging_idle needs 1/4.7 per s in I2, ladder top-out stand keys unused past 0.654; neck pivot 15 vs 7 cm (WIP ea5f6965).
- Open questions: licence sentence (A11); walk-cap ruling (A1); 30 vs 60 fps (A3, 30 assumed).
- Next: M4 checker verdict -> checker status + PR ready.

## History
- 2026-10-25 ~19:00: job opened by the orchestrator (Michael's Mixamo decision, ROADMAP Decided).

## I2 at the save (22:35, head 7f3734fba on feature/mixamo-i2)
- Done: d07dafb4 capture path boxes no doubles (alloc test passes); MIXAMO_ON braced_hang_to_crouch and climbing_ladder
  off (palms 29 cm off the lip / soles 38 cm vs hand-made 32); mixamoTraverse 10/10, mocapGuards guard climb pin passes.
- Failing: climbHands with the flag on: release wrists 9.9 cm a frame (limit 3), trunk step 20 cm (limit 9.6) - the
  freehang_climb stand-up end fading in past CLIMB_UP_CROUCH_K; the flag-off run timed out at 120 s under CPU load.
- Left: fix or switch off freehang_climb, changes/feature-mixamo-i2.md, I2-REPORT.md, merge origin/feature/mixamo-retarget.

## I2 fix round at the save
- Done (28566cd0c): crawl capture off in MIXAMO_ON (M4 yaw wrap: joints 13.8 cm a frame vs 0.5), crawl check, report and changelog.
- Done (this commit, not yet full-suite run): capture <-> hand-made switch inside traverse inertialized (animGraph mxLast); switch-frame tests (graph and rig).
- Done (this commit): allocation test warmed and alternating over 5 rounds, medians; 3 runs in a row pass (hang moving 1664 vs 2368, still 1305 vs 1737, climb-up 1305 vs 1401-1417).
- Done in the fix round (1f1ad42b): I2-REPORT bytes and test list, PLAN Claims (studioStage.ts, climbHands.test.ts), full vitest list (41 pass). Checker Opus PASS on 1f1ad42b.
- Done (CI alloc fix): real, not noise. `mixamoTrav` alone allocated 32-160 B a frame (kept channels' `evalCurve` not inlined: boxed time and value); `evalCurveIO` (curves.ts) and the capture doubles in a Float64Array make it 0; the test reads `mixamoTrav` directly (the whole frame swung 1.4 KB between rounds). 3 runs pass.

## I2b (feature/mixamo-i2b)
- Rule (Michael 2026-10-26): the capture wins unless visibly broken; climbHands stays a hard gate on the lip climb-up.
- Done: M4 chest yaw from the right axis past 75 deg pitch (mixamoChannels.mjs `YAW_FROM_RIGHT`); crawl, freehang,
  braced re-emitted (other 5 clips byte-identical). MIXAMO_ON: crawl on (3.4 / 1.7 cm, was 13.8 / 24.9); ladder off
  (top-out first frame jumps 23.5 cm, capture to capture not inertialized); braced_hang_to_crouch off (palms 58 cm off the lip), freehang_climb off
  (stand-up hips turn 86 deg, trunk 19.7 cm a frame). Report: I2B-REPORT.md.
- At the save (00:40, fix round): animGraph inertializes capture -> capture across a move change (mxKind); ladder ON
  (top-out first frame 19.9 cm vs hand-made 15.7, was 23.5). mixamoTraverse 11/12 (allocation test: JIT swing, #477 fixer).
- Left: braced (hand pin on the lip) not started; freehang stand-up (re-centre its pelYaw turn, retime the x2.85 end) and braced (hands on the lip: anchor the
  palms to the lip through release) so climbHands passes with them on; the flag default unchanged (feature/mixamo-on).
- At the save (05:31): merged feature/mixamo-i2 (ec486d6b; 7 files 62/63 pass with --testTimeout 400000, typecheck, eslint). Braced hold built, row still OFF: mixamo.ts MIXAMO_HOLD / WREN_HOLD / HOLD_FEET_CH, animGraph climb-up branch (hand-made under to k0, capture blended in over the release, feet hand-made to the crouch, clip-time remap `from`, end `ease`, per-hold `stand` fade).
- Readings (braced on, scratch harness): palms 0.0, footOn 0.474, shoulders 0.49 m, knee 2.6 cm; best wrists pop 3.7 cm (cap 3.0) with k0 0.475 span 0.168 from 0.56 ease 0 stand 0.3 (trunk 6.8 / 3.1, groups ok). Defaults committed: from 0.475, stand 0.08, ease 0.
- Left: wrists pop under 3 cm (then braced on + climbHands/mixamoTraverse test), freehang stand-up (step 4), I2B-REPORT, changes fragment. Scratch tests/zz_scratch_* are untracked, not committed.
- At the save (08:55): scratch files deleted (harness now untracked under tests/_scratch/). Rows: hanging_idle,
  shimmies, ladder (top-out 19.9 cm vs 15.7), ladder top-out, crawl (3.4 / 1.7 cm) ON; braced_hang_to_crouch OFF (wrists
  3.5 cm a frame best, span 0.22 from 0.56 stand 0.3; cap 3.0); freehang_climb OFF (trunk 19.7 cm, wrists 11.1). Found:
  the clip's hand channels do nothing in the climb-up (the graph's ready hands overwrite hLX..hRZ, animGraph ~1701): the
  wrists follow the capture's trunk, so wrist smoothing must come from the trunk / timing, not the hand channels. Swept
  span, k0, from, ease, stand, per-channel keeps: none under 3.0 yet. Left: braced under 3.0, freehang end, report.
- At the save (10:05, usage cap): braced_hang_to_crouch ON (not yet committed-tested in full): hold k0 0.58 span 0.2
  from 0.56 stand 0.34 (the capture blends in after the grips are mostly off: its lower shoulders had put the grips out of
  reach over k 0.53-0.59). climbHands with it on: palms 0.0, shoulders 0.488 m, wrists 2.8 cm (cap 3.0), trunk 8.6 / 2.8
  (caps 9.6 / 3.1); climbHands + mocapGuards pass, mixamoTraverse 12/12 (allocation fixed: WREN_HOLD is a Float64Array,
  the capture weight in mx[MX_CW], no phi of typed reads and module constants; it boxed 16 B a frame since 80b37ab).
  Other rows unchanged: ladder ON (19.9 cm vs 15.7), crawl ON (3.4 / 1.7), freehang_climb OFF (trunk 19.7, wrists 11.1).
  Left: typecheck + eslint on this head, rerun climbHands, freehang_climb end, I2B-REPORT rewrite, changes fragment.
