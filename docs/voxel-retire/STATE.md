# voxel-retire - state

## Now
PLAN steps 1-7 built by the Sonnet 5.5 implementer (2026-10-23) and committed on `feature/voxel-retire`: tsc, eslint,
the 20 named vitest files, the PLAN grep and `npm run build` all clean. Not yet run: any e2e.

## Next
1. Test Runner (laptop, `E2E_GPU=1`, the pushed commit): e2e-desktop (all 4 parts), e2e-lightbake (must), then smoke,
   e2e-ctcourse, e2e-levels, e2e-anchors, e2e-combat, e2e-weapons-carry, e2e-enemies, e2e-gadgets, e2e-sectorops,
   e2e-menus. The e2e-desktop / e2e-lightbake edits were never run (script-only changes).
2. Fresh Opus checker (render / world code), then the PR to master; the next train's full run covers the rest.

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
