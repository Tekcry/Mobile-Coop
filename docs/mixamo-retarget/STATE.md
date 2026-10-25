# mixamo-retarget - state

## Resume (2026-10-25 ~20:30 SAVE; TOP PRIORITY, Michael ~20:10: "Top priority is getting new mixamo animations in so I can fine tune")
- Target (orchestrator approved): ONE PR, all 21 clips generated and listed / tunable in Anim Studio's "motion capture"
  group; in-game use dark behind `mixamo` (I1-I3 later). PR body: a one-line menu path for Michael (Main menu > Anim
  Studio (dev) > the motion capture group). Message the orchestrator the moment the PR checker passes.
- Branch `feature/mixamo-retarget` (worktree `C:/NightShift/Mobile-Coop-mixamo-retarget`, head 635ae4b9, base origin/master
  b81c4945b) holds M1 + M2 (merged 55b45b82) + M6. Slice branches, own worktrees `C:/NightShift/Mobile-Coop-mixamo-retarget-<s>`
  (node_modules junctions to Mobile-Coop-player-hygiene-s1): m2 (spine fix round), m3 + m4 (cut from m5 98091bc2), m5.
- M1 RUN DONE 20:20 (no lock, below normal, 2 min 14 s): 21 dumps, 30 fps, 65 bones in `build/mocap/mixamo/raw/` (NOT in git;
  a fresh worktree reruns `node scripts/mocap/mixamo.mjs`, or copies the folder from this worktree). M2 adapter: 21/21 OK,
  leg scale 0.993, FK 0.03 mm (`node scripts/mocap/mixamoTake.mjs`).
- Checker on M1 + M2 (55b45b82): FIX 1 item: spine one bone off (Wren spine = Mixamo Spine, chest = Spine1->Neck) and the
  A6 direction gate is 0 by construction; up to 40 deg spine / 24.5 deg lean on lift, crouch, kneel. Fix round RUNNING on
  m2 (mixamoMap / mixamoTake only, real direction check < 8 deg on all 21, bent-spine test). Polish 1 done 635ae4b9.
- RUNNING (Opus, ~20:20): M3 (12 keyed clips, `scripts/mocap/mixamoEmit.mjs`, report M3-REPORT.md), M4 (8 traversal channel
  clips, `mixamoChannels.mjs`, CHANNELS.md / M4-REPORT.md), M5 (Studio group + source labels, M5-REPORT.md). Told: their
  generators must regenerate in one command after the spine fix merges. Cut off: relaunch from the branch head + PLAN slice.
- Then: merge m2 fix, m5, m3, m4 into the job branch; rerun both generators; typecheck + the mixamo / studio / nowPlaying
  vitests; fresh Opus checker on the PR head; PR to master; laptop e2e-studio + e2e-anim + anim-audit (Test Runner runs it
  next). ETA told ~20:30: PR ~21:40, train-ready ~22:40. The walk-cap ruling (A1).
- Key pointers: CMU pipeline `scripts/mocap/retarget.mjs:26` (MAP), `:112` (retargetTake), `:338` (buildSlot, 120 fps
  constants), `emit.mjs:209` / `:314` / `:383`; loader shape `asfamc.mjs:156`; format `docs/mocap-trial/CLIP-FORMAT.md`;
  runtime sets `src/anim/mocap.ts:127-191`; traversal table `src/anim/animGraph.ts:680`, `:1258`; idle `:2141`; label
  `src/anim/nowPlaying.ts:150`, `:176`; studio list `src/anim/studio.ts:154-198`; guard gate `characterRig.ts:1841`.
- Open questions: (1) Mixamo licence sentence to copy by hand (A11, FAQ page refuses automated reads); (2) the
  walk-cap ruling for the Mixamo set (A1; the lead asked the orchestrator); (3) 30 vs 60 fps downloads (A3, 30 assumed).
- Next: see "Then" above.

## History
- 2026-10-25 ~19:00: job opened by the orchestrator (Michael's Mixamo decision, ROADMAP Decided).
