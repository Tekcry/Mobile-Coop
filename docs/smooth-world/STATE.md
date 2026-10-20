# Smooth world - state

Updated 2026-10-20. Branch `feature/smooth-world` (folder `C:/NightShift/Mobile-Coop-smooth-world`), from master
4.19.1 (b125599e). Brief: `BRIEF.md`.

## Resume
New local session on the laptop, Opus. Paste:
```
Night Shift | Character Build: RESUME smooth-world. Work only in C:\NightShift\Mobile-Coop-smooth-world on feature/smooth-world (git pull --ff-only). Read CLAUDE.md ("Sessions", "Hard rules", "Definition of done"), docs/ROADMAP.md, docs/smooth-world/BRIEF.md and STATE.md, then carry on from STATE "Now". Laptop rules: headless only, no GPU or visual checks, E2E_PORT=4191, one heavy job at a time under C:/NightShift/heavy.lock (the test runner session has priority; wait if held). Loop: one Opus implementer, one fresh Opus checker, at most one fix round; then npm run check and the full npm run e2e (E2E_JOBS=2) on the pushed head. Finish: push, one PR to master (minor; the orchestrator sets the version), message "Night Shift | Orchestrator" with the PR, checks, open items and the commit for desktop GPU before / after shots. No em dashes.
```

## Now
- Desktop GPU shots at 1de3b40b: night vision OK; BLOCKING smooth walls brighter than voxel walls. Fix round 2
  (9e90750c): the level fill and probe light follow the voxel sky formula (render-only sky bake); re-check 2 PASS.
  Master 4.20.1 merged. lint 0 errors, 2101 unit tests, build pass (before the merge).
- Laptop runner on 67e4ccd8: PASS. check 2128 tests + build; full e2e all required suites pass (1297 s at
  E2E_JOBS=2; e2e-lightbake with the new smooth Epic asserts ok; e2e-desktop :1 :2 :4 ok; only e2e-pad, known flaky).
- Waiting on: the desktop GPU re-shoot (annex and rain-roof walls,
  default vs `?voxels=1`) and e2e-desktop's 16-texture count at Epic (about 14 estimated on the smooth level).
- Perf: not measured (the draw counter is cumulative, frame time sat at the vsync cap).

## Next
1. Runner and re-shoot green -> tell the orchestrator; a failure -> fix, push, re-request.

## Open
- Desktop GPU before / after shots (`?voxels=1` vs default) and perf numbers: the orchestrator or Menu Notes.

## Decision drafts (for the orchestrator to number at the merge)
- (pending) Smooth world by default: the world, characters and weapons draw smooth; voxels only behind `?voxels=1`.
  Replaces G68's "voxels only as the way the world is drawn" (Michael, 2026-10-20: "there still looks to be voxel
  graphics in the map which is no longer the goal"; he chose "Turn voxels off by default").

## Done
- 2026-10-20: worktree, BRIEF, STATE.
- 2026-10-20: implementer (scope 1-6), checkpoint commit 7ac815ef.
- 2026-10-20: check, fix round 12a602dd (night vision fill on the level, two-bake test, roof-grid moon cull), re-check PASS.
- 2026-10-20: CHANGELOG, PR #58.
- 2026-10-21: GPU shots fix round 2 (9e90750c), re-check 2 PASS, master 4.20.1 merged.
- 2026-10-21: laptop check + full e2e PASS on 67e4ccd8.
