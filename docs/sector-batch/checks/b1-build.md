# sector-batch B1 - build report

Owner: Night Shift | Sector Ops Build. Status: current. Cloud builder (Opus), branch `feature/sector-batch-b1`, base
31e9f22e.

## Built (per step, per file)
1. Stars fill lower (G331): `src/save/sectorRecord.ts` `starsOf` fills every tier up to the hardest in `done`
   (derived on read; `done` and best times unchanged; header comment notes G331). `tests/sectorRecord.test.ts`: the
   stars test now expects the fill (normal + perfectionist -> 4; realistic -> 3; rookie -> 1), new kv round-trip test
   (Perfectionist clear alone -> 4 stars, best time on Perfectionist only).
2. Perfect (G146): `src/game/sectors.ts` `SectorRun.alarmsRaised` (counted in `raiseAlarm`, a restart keeps it),
   `SectorTally.alarms?`, `sectorResult` returns `perfect` and adds `PERFECT` before `GHOST`, new `resultBadge`.
   `src/game/modes/sectorMode.ts`: banner subtitle `resultBadge(this.result())`, `result()` passes
   `alarms: this.run.alarmsRaised`, import and comment. `tests/sectors.test.ts` (expected object, restart test
   `alarmsRaised` 3), new `tests/sectorPerfect.test.ts` (4 tests). a0 check done: the stage rises only in
   `raiseAlarm` (callers `onAlarm` :915, `cameraAlarm` :926); other writes are restart, section start and `ct.alarm`
   copies.
3. Menu and briefing: `src/main.ts` counter reads `campusOps` (comment G328), Sector Ops line names Saltmarsh Park and
   the fill; `src/ui/screens/briefingScreen.ts` adds "No kills and no alarm: Perfect."
4. `scripts/e2e-sectorops.mjs`: ghost run line must contain PERFECT; op list asserts every star up to the run's tier;
   alarm run asserts `perfect === false`. `node --check` ok.
5. Docs: `TESTING.md` (stars item reworded, new Perfect item), `docs/systems/modes-and-progression.md` (stars bullet),
   `changes/feature-sector-batch.md` (fragment as briefed; its last bullet names B2's solo-route test).

Commits (all pushed): f16351fb (1), 49e81cc2 (2), 12b8ce1b (3), 417a30b3 (4), 1932dff8 (5), then this report.

## Checks (cloud)
- `npm run typecheck:fast`: clean (after steps 2 and 3).
- `npx vitest run --maxWorkers=2`: sectorRecord + sectorStep3 12/12 (step 1); sectorPerfect + sectors +
  sectorRatingHost 34/34 (step 2); changesFragments 1/1; all six brief files together 47/47.
- `node --check scripts/e2e-sectorops.mjs`: ok.
- `git diff origin/feature/sector-batch --stat`: only the brief's files (plus this report).
- `grep -n warehouseOps src/main.ts`: one hit, a comment at :447 (`autostart=warehouseOps` test hook note), no
  `starsFor('warehouseOps')`.

## Deviations
- The brief's last check says the grep prints nothing; the one remaining hit is an existing comment (line 447) in a
  block the brief does not list, left as is.
- Existing stars test keeps `warehouseOps` ids (as in the file); the new lines use `campusOps` as briefed.

## Pending PC run
- `scripts/e2e-sectorops.mjs` (GPU, laptop queue): the ghost run's PERFECT line, the star fill up to the run's tier,
  the alarm run's `perfect === false`.
- Walk: finish Saltmarsh Park on Realistic with no kill and no alarm; the result reads PERFECT, and the main menu and
  op list show three stars.
