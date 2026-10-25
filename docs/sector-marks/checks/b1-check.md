# sector-marks B1 - check

Owner: Night Shift | Sector Ops Build. Status: current.

Checker: fresh Opus. Checked head `402ccf6457a0114dad4876075e26124bf4f7ed27` (origin/feature/sector-marks-b1), diff
`583f4c436..402ccf645` against `docs/sector-marks/BRIEF.md`, `PLAN.md` and `briefs/B1.md`.

## Verdict: PASS

## What was checked
- Intent (VISION 4 rule 5, G290 / G336 / G343 / G351): Sector Ops no longer draws the green disc and pole; the exit
  item and its zone stay (`sectorMode.ts:771` still adds `<id>-exit`, `nearest` still skips `extract`). Infiltration,
  the old Mission mode and free roam keep the beacon. The four new lines name what and where in short plain English
  (44-49 characters): gatehouse, prototype store, server cage, strongroom; S2 and every connector / extract label
  untouched.
- File list: exactly the brief's 10 edits and 4 new files; nothing from the never-touch list (`ctcourseSets/*`,
  `courseHud.ts`, `tests/ctcourse/*`, `warehouse*`, `protocol.ts`, `CHANGELOG.md`, `package.json`).
- Code matches the brief's text line for line: `drawsExitBeacon` (false for `sector` only), the constructor's
  `exitBeacon = true`, the empty `extract` branch before the beacon `else`, both builders (`gameState.ts:728`,
  `coopClient.ts:247`; free roam `gameState.ts:839` left on). The empty branch is safe: `setEnabled`, `setIndicator`,
  `update`, `remove` and `dispose` all handle `light === null` and an empty `parts`. The co-op client knows its mode
  (`g.opts.mode === 'sector'` is already used at `coopClient.ts:188`), so its mirror loses the beacon too; no wire change.
- Hot paths: nothing added to a per-frame loop. `campusS4Dress.ts:177` now uses `hyp2`; `grep Math.hypot` on the file
  prints nothing. The builder's S4 hero-log comparison was byte-identical (run with `--silent=false`, which a plain run
  needed to print the log at all); `campusS4Dress.test.ts` passes.
- Tests are meaningful: `campusObjectivePlace` ties each line to the room tag that holds the objective point (with its
  height), so reverting any of the four labels fails it; `exitBeacon` checks the per-mode switch and, on a NullEngine
  scene, that an `extract` item draws 2 parts by default and 0 with the switch off while a terminal still draws 3.
- The e2e assertion reads `window.__app.current.interactables`, the same path the suite already uses.

## Runs (this checker, worktree `C:/NightShift/Mobile-Coop-sector-marks-b1`)
- `npm run typecheck:fast`: pass.
- `npx vitest run --maxWorkers=2` on the brief's 13 files plus `tests/sectorBolt.test.ts` (it builds `Interactables`
  with two arguments): 14 files, 299 tests passed.
- `node --check scripts/e2e-sectorops.mjs`: pass.
- e2e: pending (laptop queue): `e2e-sectorops` (the new no-beacon assertion) and the PR's affected set, including the
  co-op group for the `src/net` line. The PR touches `src/net`, so a second Opus checker is still needed (PLAN 3).

## Fix list
None.

## Polish list
1. Stale copies of the old lines in older job docs (not in B1's file list, so left alone):
   `docs/sector-redesign/SPEC.md`, `docs/sector-redesign/briefs/SLICE4.md`, `docs/sector-redesign/research/CONCEPT.md`,
   `docs/sector-redesign/graph/campusOps-S4.json`. Update them the next time a job owns those files.
2. `src/world/maps/campusS4Dress.ts:22`: the `hyp2` import sits after the map import rather than with the other
   `../../core` imports (as the brief said; cosmetic).
3. `src/game/interactables.ts:78` class comment still lists the "extraction beacon" without saying Sector Ops has none;
   one clause would help the next reader.
