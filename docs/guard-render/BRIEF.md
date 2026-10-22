# Guard render: brief

## The ask (orchestrator, for Michael's Sector Ops ask)
24 awake guards per section playable at Epic, and Marlow Yard (ctcourse) with headroom.

## Goal
Cut the per-guard render cost (frame CPU, then GPU) so 24 awake guards on screen fit at Epic 1920x1080 on the laptop
(RTX 4090). Working target until Michael says otherwise (open question 1): 24 facing guards at 60 Hz, frame CPU p95
<= 12 ms and GPU p95 <= 15 ms (the 60 Hz GPU line in `docs/systems/performance.md`), and Marlow Yard at 24 with at
least 25% headroom on both.

## Where we start (measured, 4.64.0, `docs/guard-cap/` on `origin/feature/guard-cap` d610c609)
- Per awake guard: ~2.0-2.3 ms frame CPU, ~1.1 ms GPU; sim +0.3-0.4 ms, of which AI 0.02-0.06 ms.
- Sector Ops, 24 patrol/facing: frame CPU 57.1 ms, render() 40.2 ms (1.5 at 0 guards), active-mesh evaluation
  17.4 ms (0.6 at 0), GPU 32.1 ms (3.5 at 0), active meshes 1429 (123 at 0), draws 142 (104 at 0), sim `ai.anim`
  4.24 ms (0.17 ms a guard). 24 patrol/away: render() 23.8, evaluation 14.3 with 20 active meshes.
- So: render-bound, by mesh count, not draw submission and not AI.

## Limits
- CLAUDE.md hard rules hold: gameplay reads collision and perception only, never graphics state; light parity;
  hot paths do not allocate; Babylon only through `src/core/babylon.ts`.
- Same look: the merged guard must render the same pixels as the parts it replaces (colour, pattern, surface, LOD
  swap), and the same in every pass (G-buffer, sun cascades, lamp and flashlight shadows, thermal / night vision).
- No AI behaviour change. Perception, hearing, the light field, hit volumes keep their inputs (see PLAN, constraints).
- Measured only with `scripts/guard-cap.mjs` on the laptop GPU, same cells, alone (nothing else on the GPU).

## Assumed decision A1 (logged; undoable)
The no-perf-tuning rule ("Definition of done": performance work waits until Michael lifts the no-refining rule) is
lifted for guard render cost only, because the 24-guard ask needs it. Nothing else is tuned under it.
Undo: revert the job (revert the merge commit(s) of `feature/guard-render` on master, or close the PR unmerged);
no save, wire or map data depends on it.

## Orchestrator answers (2026-10-23 ~08:15, relayed by Character Build; these close PLAN / STATE open questions 1-5)
- M1 (open 1): target 60 Hz at Epic on the laptop 4090: frame CPU p95 <= 12 ms, GPU p95 <= 15 ms at 24 facing guards;
  also report the desktop default preset.
- M2 (open 2): S3a, a sim-side head hit volume (no rig-pose read for gameplay).
- M3 (open 3): Marlow Yard headroom is at its 12 alive guards; the alive cap is per map (Marlow 12, campusOps 24).
- M4 (open 4): guard-cap #180 merges first (train 19, done: 4.68.0); `scripts/guard-cap.mjs` comes from master.
- M5 (open 5): `src/world/partLibrary.ts` is this job's; `src/world/world.ts` hunks go to Menu Notes.
- M6: CT Core agreed the characterRig hook: a private method of its own (build at rig creation + one per-frame skin
  update after the final pose), outside lines ~1850-2010 and ~2600-2700, no per-frame allocation, nothing in
  `src/anim`; whichever PR is ready first merges first; send CT Core the hook's line range + diff.
