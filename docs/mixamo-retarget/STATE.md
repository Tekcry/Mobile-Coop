# mixamo-retarget - state

## Resume (2026-10-25 ~19:15)
- Branch `feature/mixamo-retarget`, worktree `C:/NightShift/Mobile-Coop-mixamo-retarget`, base origin/master b81c4945b.
- Done: `CLIP-LIST.md` (87c1cdf8, sent to the orchestrator for the downloads), `BRIEF.md` (Michael's three entries,
  A1-A11), `PLAN.md` (slices M1-M6, I1-I3, G1; claims; hand-offs).
- Waiting: a fresh Opus plan checker on BRIEF + PLAN (RULES Intake step 4); the downloads in
  `C:/NightShift/scratch/mixamo/clips/` (empty at 19:10); the desktop CPU cap (no Blender until the orchestrator lifts it).
- Key pointers: CMU pipeline `scripts/mocap/retarget.mjs:26` (MAP), `:112` (retargetTake), `:338` (buildSlot, 120 fps
  constants), `emit.mjs:209` / `:314` / `:383`; loader shape `asfamc.mjs:156`; format `docs/mocap-trial/CLIP-FORMAT.md`;
  runtime sets `src/anim/mocap.ts:127-191`; traversal table `src/anim/animGraph.ts:680`, `:1258`; idle `:2141`; label
  `src/anim/nowPlaying.ts:150`, `:176`; studio list `src/anim/studio.ts:154-198`; guard gate `characterRig.ts:1841`.
- Open questions: (1) Mixamo licence sentence to copy by hand (A11, FAQ page refuses automated reads); (2) whether the
  orchestrator counts Michael's ~19:05 approval against the walk cap (A1); (3) 30 vs 60 fps downloads (A3, 30 assumed).
- Next: plan checker -> brief M1, M2, M5, M6 (parallel; M1's Blender run under heavy.lock when the cap lifts).

## History
- 2026-10-25 ~19:00: job opened by the orchestrator (Michael's Mixamo decision, ROADMAP Decided).
