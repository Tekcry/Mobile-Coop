# mixamo-retarget - state

## Resume (2026-10-25 ~19:15)
- Branch `feature/mixamo-retarget`, worktree `C:/NightShift/Mobile-Coop-mixamo-retarget`, base origin/master b81c4945b.
- Done: `CLIP-LIST.md` (87c1cdf8, sent to the orchestrator for the downloads), `BRIEF.md` (Michael's three entries,
  A1-A11), `PLAN.md` (slices M1-M6, I1-I3, G1; claims; hand-offs). Plan check PASS WITH FIXES on 81ec5261; fixes 1-9
  applied (bone end points, W·R·W⁻¹, loader pass-through, in-place loops, emit kinds, climb-up path warp, Wren-only
  traversal swap, traversal source tag and tunable rows, marker blocks, A1 flag default OFF at the walk cap, tests /
  videos, hand-off owners).
- Downloads in: 21 FBX in `C:/NightShift/scratch/mixamo/clips/` (19:00-19:12, all sha256-distinct, on Mixamo's
  auto-rig of Wren's mesh: BRIEF A5); file -> slug -> emit kind in PLAN "Clip map".
- Waiting: the desktop CPU cap (no Blender until the orchestrator lifts it); the orchestrator's walk-cap ruling (A1).
- Key pointers: CMU pipeline `scripts/mocap/retarget.mjs:26` (MAP), `:112` (retargetTake), `:338` (buildSlot, 120 fps
  constants), `emit.mjs:209` / `:314` / `:383`; loader shape `asfamc.mjs:156`; format `docs/mocap-trial/CLIP-FORMAT.md`;
  runtime sets `src/anim/mocap.ts:127-191`; traversal table `src/anim/animGraph.ts:680`, `:1258`; idle `:2141`; label
  `src/anim/nowPlaying.ts:150`, `:176`; studio list `src/anim/studio.ts:154-198`; guard gate `characterRig.ts:1841`.
- Open questions: (1) Mixamo licence sentence to copy by hand (A11, FAQ page refuses automated reads); (2) the
  walk-cap ruling for the Mixamo set (A1; the lead asked the orchestrator); (3) 30 vs 60 fps downloads (A3, 30 assumed).
- Next: M2 + M5 + M6 builders (parallel; M5 lands mocapSources.ts and its markers first); M1 code too, its Blender run
  waits for the CPU cap (heavy.lock, BelowNormal).

## History
- 2026-10-25 ~19:00: job opened by the orchestrator (Michael's Mixamo decision, ROADMAP Decided).
