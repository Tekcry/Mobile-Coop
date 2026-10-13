# Notes collected for REVIEW.md (built at step 34)

- Step 01 history: commit 87c397f accidentally carried step 01's staged file deletions (marks.ts, executeController.ts, markers.ts), so 87c397f..(step 01 commit) does not build. Orchestrator now commits docs with a path-limited commit.
- `npm run e2e:quick` lists the legacy suite e2e-progression without LEGACY=1, so it always fails there (fails on pre-run code too; passes with --legacy). Fix the quick map or note it.
- Stale Mark & Execute comments to scrub in step 06: player.ts:63, enemyPuppet.ts:149, gameState.ts:402, settings.ts:374 (v5 -> v6 note), loadoutScreen.ts:44 (parked).
