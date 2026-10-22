# e2e-sectorops part 2 fix (team doors on the nav grid) - 2026-10-23

## Root cause
Not a src regression, and not slice 0. The failing assert (`scripts/e2e-sectorops.mjs`, the team-door block, then
line 1189) is the `line` probe added by `33087408` (sector-fixes-r2 nav, its commit message: "not run here"). That
commit is not on feature/camera-range, so camera-range never runs these asserts: that is why part 2 passes there.

The probe was `nav.lineClear(at - side*1.2, at + side*1.2)`. A straight grid walk is no measure of "a guard can go
through" at these doors:
- Door 0 (mess back door, 8,-10): the door centre z -10 is a cell boundary (grid origin z -26, cell 0.5), so the line
  runs along the z -9.75 cell row; on the mess side that row is blocked from x 7.4 west by the mess worktop
  (`warehouseS1.ts:381`, x 2..7, z -9.55..-8.95, plus the 0.32 agent radius). Its start cell (6.75,-9.75) is blocked.
- Door 2 (S3 lobby door, 23.2,-5.6): the 1.2 m point on the near side (z -4.4) is a blocked cell.
- Sections 2 and 3 "live and has a team door" failed only because door 0's failure skipped the section advance.

Measured in the built game (probe on port 4192): the closures open and shut correctly. Unbolted, the guards' own
`findPath` from 1.2 m in front to 1.2 m behind is 2.48 / 2.40 / 2.40 m (straight through) for doors 0 / 1 / 2;
bolted it is 13.9 m (detour) / 12.5 m (detour) / no path. The centre cell flips walkable as asserted.

## Fix
`scripts/e2e-sectorops.mjs` `navThrough`: `line` is now the guards' path through the doorway
(`findPath(front 1.2 m, behind 1.2 m)` no longer than 3.4 m = the straight 2.4 m + 1 m), and `len` is printed. The
three asserts are unchanged (`!open && !line` bolted, `open && line` unbolted, shut again after the restart). This is
the same rule measured the way guards use the grid, not a looser one: a bolted door must still force a detour or no
path. No src change was needed; slice 0 (A46-A51) and the Warehouse (M11) are untouched.

## Files
- `scripts/e2e-sectorops.mjs` (navThrough, the comment above it)
- `tests/navClosure.test.ts` (new case: the mess door geometry at the origin - open: centre walkable, the straight
  lineClear false, the path through <= 3.4 m; shut: no short path; reopened: short again)

## Unit test note
The new case reproduces the old probe's false result (`lineClear` false with the doorway open) and pins the new
measure. It does not fail before and pass after a src change, because there is no src change: the bug was the probe.

## Checks
- `npx tsc --noEmit -p .`: clean.
- vitest tests/navClosure, sectors, sectorRestart, sectorBolt, sectorSlice0, campusS1: 102 passed.
- e2e (desktop, heavy2.lock, port 4192, E2E_JOBS=1): first run killed at the runner's 600 s suite timeout while still in
  the jump checks (desktop under load, before the team doors); rerun with `E2E_SUITE_TIMEOUT=1700`: **PASS** in 910 s, every part-2 check ok, all three team doors (len bolted 13.92 / 12.52 / none, unbolted 2.48 / 2.40 / 2.40). The default 600 s suite timeout is too short for part 2 on the loaded desktop; it fits on the laptop.
