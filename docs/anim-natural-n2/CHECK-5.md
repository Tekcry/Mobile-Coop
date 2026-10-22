# anim-natural N2 - pre-PR round check (fresh checker, c0f6f9f9)

2026-10-22 ~20:25, written by the job lead from the checker's hand-back. Verdict: PASS (no blocker). Scratch in
C:/NightShift/scratch/n2-check5/ (git archive copies of 703b5063, 02187841, 15921223, c0f6f9f9; two mutants; harnesses).

## Checked
1. Merge 02187841 (master 4.57.0): faithful. Every N2-owned file's diff is identical before and after the merge except
   animGraph.ts (the `i.slide < 0` term and the word in its doc) and CHANGELOG.md (moved to the fragment). Master also
   removed `AnimInput.check`, `RigPose.slide / check`, `weights.slide` and the SLIDE clip; none is referenced by N2.
2. 15921223:
   - armCap boxing gone: per-frame new_space 3588.16 (pre) -> 3396.16 / 3380.16 B (16 B run noise); poses bit-identical
     on 20 rig scenarios.
   - Studio loops cap on = cap off: keyed:run 7.743 -> 0, hold_knife 27.487 -> 0, hold_choke 1.95 -> 0 cm.
   - Alloc test 0 B per call (5 / 5 rounds) and it can fail: a `{ g }` mutant reads 32 B, a closure mutant 104 B (limit 8).
   - Drive end: the cap history is written every frame, so leaving the studio eases the arms over 3-6 frames (master,
     with no cap, jumps 25-53 cm there).
3. c0f6f9f9 (run arm pop): only armL / armR of keys 1-3 in run.json, only `arm` / `fore` (and their means) in run.ts;
   pel, q, head, half, duty, liftH, kneeOut identical. Reproduced: wrist step 23.52 -> 6.50 cm, elbow 9.16 -> 3.41 cm;
   run wrist peak 17.57 (17.29) -> 5.53 (4.75) m/s; sprint 18.92 (18.56) -> 6.66 (5.70); range 75.6 -> 75.0 cm; elbow
   61.45..93.37 -> 61.59..93.49 deg. No new pop on any of the 32 frames; hands never cross the midline. The palm flick
   (twist 0 -> -26 -> 7) is now 0 -> 3 -> 7.
4. Single files green: bodyMotion (3x), runKeyContinuity, keyedWalk, crabFacing, both identity tests, animAudit,
   keyedDrawn, readyHands, animStudio, animStudio2, animTuneBake, tuneKeys, keyedExactPreview, animCrabMetrics; tsc and
   eslint clean. One runKeyContinuity rig test timed out (64 s vs its 60 s) under the e2e run's 100% CPU; 3 s unloaded.
5. Co-op parity: `graph.drive` is set only by src/game/studioStage.ts; no drive = no change (bit-identical, partner:moves
   unchanged). The run clip is data, the same for local and remote rigs.

## Should-fix (done)
1. Stale changelog fragment (the A1 hip pop "waiting on Michael", "run cap keeps Michael's run keys as tuned", no run
   pop entry): rewritten in the PR commit.

## Polish
- Stale doc comment on `KEY_MOTION` (src/anim/bodyMotion.ts ~107-111: "11-17 m/s"); the run now peaks at 4.75 m/s chest
  (sprint 5.70), so `KEY_MOTION.run.armSpeed` 18 could drop to 6 like the other rows (left: a src change after the
  e2e run; step 5's tuner rows).
- runKeyContinuity's rig test ("the wrist slower") asserts nothing on the wrist: pin `wristPeak < 8 m/s` at 4 and 5 m/s;
  its 60 s timeout is below the repo's 120 s guard.
- The identity helper's keyed scenarios never set stride 'facing', so they never pose holstered keyed arms or trunk:
  "identity unchanged" does not cover clip arm data (note it in the helper).
- Run forearm / hand roll ~70 deg per 60 Hz frame at 4 m/s (02187841: 100; master: 147): the clip's twist channel at the
  front reversal (REPORT-3 open item).
- Wrists 10-19 cm outside the shoulder line through the run (Michael's abd 19; unchanged).
- tests/bodyMotion.test.ts import spacing and the run comment: fixed.
