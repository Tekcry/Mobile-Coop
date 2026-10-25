# mixamo-retarget - state

## Resume (2026-10-25 ~19:55, after the account swap)
- Branch `feature/mixamo-retarget`, worktree `C:/NightShift/Mobile-Coop-mixamo-retarget`, base origin/master b81c4945b.
  Slice branches in their own worktrees (node_modules junctions to Mobile-Coop-player-hygiene-s1), cut from 18aaff8d:
  `feature/mixamo-retarget-m2`, `feature/mixamo-retarget-m5`.
- Done: CLIP-LIST, BRIEF (A1-A11), PLAN (plan check PASS WITH FIXES, fixes 1-9), M6 credits (0b82b0fb), the dump format
  (PLAN "Dump format", 18aaff8d), M1 code (b1b0e1e5: `scripts/mocap/py/mixamo_dump.py`, `scripts/mocap/mixamo.mjs`,
  `tests/mixamoDriver.test.ts` 5/5; `--dry` lists all 21 real files with the Clip map slugs).
- Downloads in: 21 FBX in `C:/NightShift/scratch/mixamo/clips/` (Mixamo's auto-rig of Wren's mesh: BRIEF A5).
- Running (Opus builders, 19:50): M2 (report `docs/mixamo-retarget/M2-REPORT.md` on its branch), M5 (`M5-REPORT.md`).
  Cut off: relaunch from the branch head + the PLAN slice text.
- Waiting: the orchestrator's Blender OK (asked 19:52) for the M1 run, under heavy.lock in one shell command:
  `node scripts/heavy-lock.mjs take C:/NightShift/heavy.lock "Night Shift | Player Build | mixamo M1" --pid "$(cat /proc/$$/winpid)" && node scripts/mocap/mixamo.mjs; node scripts/heavy-lock.mjs release C:/NightShift/heavy.lock "Night Shift | Player Build | mixamo M1"`
  -> `build/mocap/mixamo/raw/*.json` (not committed). The walk-cap ruling (A1).
- Key pointers: CMU pipeline `scripts/mocap/retarget.mjs:26` (MAP), `:112` (retargetTake), `:338` (buildSlot, 120 fps
  constants), `emit.mjs:209` / `:314` / `:383`; loader shape `asfamc.mjs:156`; format `docs/mocap-trial/CLIP-FORMAT.md`;
  runtime sets `src/anim/mocap.ts:127-191`; traversal table `src/anim/animGraph.ts:680`, `:1258`; idle `:2141`; label
  `src/anim/nowPlaying.ts:150`, `:176`; studio list `src/anim/studio.ts:154-198`; guard gate `characterRig.ts:1841`.
- Open questions: (1) Mixamo licence sentence to copy by hand (A11, FAQ page refuses automated reads); (2) the
  walk-cap ruling for the Mixamo set (A1; the lead asked the orchestrator); (3) 30 vs 60 fps downloads (A3, 30 assumed).
- Next: checkers on M2 / M5, merge them into the job branch; the M1 run; then M3 + M4 (Opus, parallel); PR 1 = M1 + M2.

## History
- 2026-10-25 ~19:00: job opened by the orchestrator (Michael's Mixamo decision, ROADMAP Decided).
