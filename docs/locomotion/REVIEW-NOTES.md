# Notes collected for REVIEW.md (built at step 34)

- Step 01 history: commit 87c397f accidentally carried step 01's staged file deletions (marks.ts, executeController.ts, markers.ts), so 87c397f..(step 01 commit) does not build. Orchestrator now commits docs with a path-limited commit.
- Fixed in the speed rules commit: `e2e:quick` no longer lists the LEGACY suites (they need LEGACY=1).
- Stale Mark & Execute comments to scrub in step 06: player.ts:63, enemyPuppet.ts:149, gameState.ts:402, settings.ts:374 (v5 -> v6 note), loadoutScreen.ts:44 (parked).
- Flaky under E2E_JOBS=2 (pass serially): e2e-stealth (look input), e2e-levels (rack ladder runner). Add to docs/backlog.md flaky list at step 34 if they recur.
- e2e-mouse ('losing the capture (Esc) pauses the match') flaked once under E2E_JOBS=2 at step 05; passes serially.
- e2e-netmove new flake mode under 2 jobs: 'fence: joints within 10 cm' with wrists 30-36 cm (passes serially, 0 cm). Add to docs/backlog.md flaky entry at step 34 if it recurs.
- Stale cover comments in src/game/takedownController.ts (~90, ~111): scrub in step 12 (corner takedown remap).
- Kestrel-owned, pre-existing (fail identically on origin/feature/kestrel 6a403c5): e2e-editor "X undoes the wall"; e2e-kestrel "camera rays along the tour: 133 inside the tight places go to P04" (before the merge it also failed the zone teleports and tour / critical path walks, identically on 93c6ee8).
- Block A perf A/B (same VM, back to back): anim per character baseline 0.0568 / 0.0564 ms vs after Block A 0.0498 / 0.0622 ms; sim p95 2.3 / 2.35 vs 2.3 / 2.75 ms. No regression; the VM's calibration swings 2x, so single runs are not comparable.
