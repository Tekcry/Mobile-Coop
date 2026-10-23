# voxel-retire - state

## Now
Built c8d1b5da (Sonnet 5.5): tsc, eslint, 20 vitest files, PLAN grep, build clean. Fresh Opus checker PASS
(2026-10-23 ~17:10; bake hashes unchanged, SKY_GRID / dropCpuCopy identical, saved 'rt' -> SSR, no net / save change;
the skipped ctcourseLight / warehouseS1Light tests are print-only `it.runIf`, same on master).
Laptop batch GREEN 21/21 on c8d1b5da (GPU 4191, 1245 s): desktop:1/2/4, lightbake, smoke, ctcourse:1-3, levels,
anchors, combat, weapons-carry, enemies, gadgets, sectorops:1-6, menus. Master 4.76.0 merged in (2e00ea6b, clean;
tsc 0, no voxel refs back). PR open; train-ready (the train's full run covers the merge).

## Next
1. Laptop batch result (e2e-desktop, e2e-lightbake, smoke, e2e-ctcourse, e2e-levels, e2e-anchors, e2e-combat,
   e2e-weapons-carry, e2e-enemies, e2e-gadgets, e2e-sectorops, e2e-menus; `E2E_GPU=1`).
2. On green: merge origin/master, add the guard-render M1 result to docs/guard-render/STATE.md (rides in this batch PR),
   open the PR, tell the orchestrator train-ready.

## Polish list (checker, not blocking)
- smoothWorldLight now compares Epic vs Low smooth (two dressing tiers), not voxels on / off.
- `rtRes`, the RtRes type and the `gi` flag are dead (quality.ts:30, 53-57); Settings may still show them (A3).
- Stale voxel comments: perf.mjs:9, :248; e2e-desktop.mjs:358, :433; bakedLamps.ts:855, :901; quality.ts:41.
- e2e-desktop part 3 collects `wp.hidden` with no assert; governor `voxelLod` unused (A4).

## Open
- Not touched by design: `src/net`, `PROTOCOL_VERSION`, save shape, settings shape (A3).
- Follow-ups for Michael / a later sweep: hide Settings "Ray traced", "Ray-traced reflections rate", "Global
  illumination" (A3); governor step 6 no-op (A4); dead `lightRig` `micro`, `onWorldHit`, `Vfx.chips`, skyBake GI (A5);
  optional rename of `src/voxel/` (A1) and `CharacterRig.voxel` (A2).
- #226 also deletes `tests/voxelFit.test.ts`; whichever merges second resolves trivially.
- At the merge: the orchestrator records Michael's "Retire it" in DECISIONS (replaces G68's voxel clause and G223's
  comparison flag).

## Done
- 2026-10-23: inventory (every importer of each removed file checked), BRIEF, PLAN, STATE.
- 2026-10-23: implementation (PLAN steps 1-7); changelog fragment `changes/feature-voxel-retire.md`.

## Resume prompt
```
You are the job lead for Night Shift "voxel-retire" (repo Tekcry Mobile-Coop). Read CLAUDE.md ("Hard rules",
"Sessions" -> "A job"), docs/systems/agent-preamble.md, then docs/voxel-retire/STATE.md, BRIEF.md and PLAN.md in
C:/NightShift/Mobile-Coop-voxel-retire (branch feature/voxel-retire; branch guard before every write; never write in
C:/NightShift/Mobile-Coop). Next: start a Sonnet 5.5 implementer on PLAN.md steps 1-7 with the agent preamble, run
the PLAN verification, commit "voxel-retire: remove the voxel look" with the Co-Authored-By line, push, send the e2e
list in STATE "Next" to Test Runner, run a fresh Opus checker, then open the PR to master and message the orchestrator.
Never touch src/net, PROTOCOL_VERSION or the save shape.
```
