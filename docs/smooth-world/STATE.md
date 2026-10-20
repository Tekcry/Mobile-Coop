# Smooth world - state

Updated 2026-10-20. Branch `feature/smooth-world` (folder `C:/NightShift/Mobile-Coop-smooth-world`), from master
4.19.1 (b125599e). Brief: `BRIEF.md`.

## Resume
New local session on the laptop, Opus. Paste:
```
Night Shift | Character Build: RESUME smooth-world. Work only in C:\NightShift\Mobile-Coop-smooth-world on feature/smooth-world (git pull --ff-only). Read CLAUDE.md ("Sessions", "Hard rules", "Definition of done"), docs/ROADMAP.md, docs/smooth-world/BRIEF.md and STATE.md, then carry on from STATE "Now". Laptop rules: headless only, no GPU or visual checks, E2E_PORT=4191, one heavy job at a time under C:/NightShift/heavy.lock (the test runner session has priority; wait if held). Loop: one Opus implementer, one fresh Opus checker, at most one fix round; then npm run check and the full npm run e2e (E2E_JOBS=2) on the pushed head. Finish: push, one PR to master (minor; the orchestrator sets the version), message "Night Shift | Orchestrator" with the PR, checks, open items and the commit for desktop GPU before / after shots. No em dashes.
```

## Now
- Implementer done (IMPL-REPORT.md): voxels off by default, baked lamps on the smooth path, roof grid for rain,
  parity test tests/smoothWorldLight.test.ts. lint / unit (2096) / build pass. e2e not run yet (laptop lock held).
  Next: fresh checker.

## Next
1. Implementer: scope 1-6 of BRIEF.
2. Fresh checker, at most one fix round.
3. npm run check, full e2e under the laptop heavy.lock.
4. Docs (graphics-quality.md, lighting.md, CHANGELOG "Unreleased - smooth-world"), push, PR, orchestrator.

## Open
- Desktop GPU before / after shots (`?voxels=1` vs default) and perf numbers: the orchestrator or Menu Notes.

## Decision drafts (for the orchestrator to number at the merge)
- (pending) Smooth world by default: the world, characters and weapons draw smooth; voxels only behind `?voxels=1`.
  Replaces G68's "voxels only as the way the world is drawn" (Michael, 2026-10-20: "there still looks to be voxel
  graphics in the map which is no longer the goal"; he chose "Turn voxels off by default").

## Done
- 2026-10-20: worktree, BRIEF, STATE.
- 2026-10-20: implementer (scope 1-6), checkpoint commit.
