status: open
# J14 Marlow re-plan, slice G-A5 fix round 1 (Opus): station 13 floodlight timer after a retry

Lead: Night Shift | Marlow Build. Checker (fresh Opus) verdict on G-A5 676a11e4f: FIX, one blocking item. Full report:
the lead's scratch `j14-a3a5-check.md` (summary below is complete for this fix).

- Base: `feature/marlow-replan-g-a5` @ 676a11e4f0cac277f3fd0cf845f83bcf6b20e8cc. Push on the same branch.
- Read first: `docs/systems/agent-preamble.md` (origin/master); `git show origin/cloud-queue:briefs/j14-g-a5.md` (the
  slice brief and your report); STATIONS A5 block on origin/feature/marlow-replan `docs/marlow-replan/STATIONS.md`.

## Only files to edit
- `src/game/course/replan/a5Ticks.ts`
- `tests/ctcourse/replan/a5Substation.test.ts` (or the A5 ticks test file the slice added)
- `src/world/maps/ctcourseSets/marlowCircuits.ts` (one row, fix 2)

## Fix 1 (blocking): the floodlight timer re-arms after a retry while the light is still dark
`a5Ticks.ts:33-52`. A retry does not reset the floodlight jam, so the light stays off for its remaining off-time. A
beam trip or a seen retry while the light is jammed then gives either (a) a second "The floodlight came back" retry
once the light returns after the 1.5 s hold, with both players already on their marks, or (b) if the light returns
during the hold, the refused `retry()` still spends the attempt's one timer retry, so every later beam trip or timer
failure in that attempt is ignored. Done looks like: the timer arms only on a lit-to-dark change seen within the
current attempt (reset its state on `epoch()` change), and the attempt's retry counts as used only when `retry()`
returns true. Allocation-free as now. Two unit cases, one per fault (a) and (b), plus a case that a fresh jam after
the retry still times out once.

## Fix 2 (data): circuit table row
`marlowCircuits.ts:173` still lists the apron switch at (69.7, 36.0); the slice moved it to (67.8, 36.0). Update the
row's position and text.

## Checks
`npx tsc --noEmit -p tsconfig.json`; `npx vitest run` on the A5 test file(s), `tests/ctcourse/replan/variant.test.ts`,
`tests/marlowLightingCircuits.test.ts` (if present), `tests/courseStation.test.ts`. No e2e, no `npm run check`.

## Done
Push, append a short report (commits, file:line, tests with counts), set `status: done feature/marlow-replan-g-a5 <sha>`.

## Report (append below)
