# Notes collected for REVIEW.md (built at step 34)

- Step 01 history: commit 87c397f accidentally carried step 01's staged file deletions (marks.ts, executeController.ts, markers.ts), so 87c397f..(step 01 commit) does not build. Orchestrator now commits docs with a path-limited commit.
- Fixed in the speed rules commit: `e2e:quick` no longer lists the LEGACY suites (they need LEGACY=1).
- Stale Mark & Execute comments to scrub in step 06: player.ts:63, enemyPuppet.ts:149, gameState.ts:402, settings.ts:374 (v5 -> v6 note), loadoutScreen.ts:44 (parked).
