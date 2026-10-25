status: done feature/marlow-replan-g-a5 3db4a2a4b08ff912989666fa5fb81af4fc440d23
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
Night Shift | Cloud Builder 4, 2026-10-25 ~23:55Z. Head 3db4a2a4b08ff912989666fa5fb81af4fc440d23 on `feature/marlow-replan-g-a5` (from 676a11e4f).
- Fix 1, b2d35f6e6: `src/game/course/replan/a5Ticks.ts:20-62`. New module state `floodWas` (-1 not yet in this attempt, 0
  dark, 1 lit), reset with the epoch and while 13 is not live. The window arms only when the flood goes lit -> dark within
  the attempt (`:51-57`), so a jam running on past a retry never arms the new attempt. `calledIn` is set only when
  `retry()` returns true (`:48` seen, `:61` timer). A refused seen call is asked again next step while the trip stands;
  a refused timer call disarms that window and spends nothing. Allocation-free (numbers only).
  Tests `tests/ctcourse/replan/a5Ticks.test.ts`: 3 new cases on a fake with the real hold (a taken retry bumps the epoch,
  clears the trip and holds 90 steps; inside the hold `retry()` refuses): (a) flood still jammed after a seen retry, back
  after the hold: no second retry; (b) flood back inside the hold calls nothing, a refused timer call spends nothing, a
  later beam trip in the attempt is taken; a fresh jam after the retry times out once. All 3 fail on 676a11e4f's tick
  (checked), pass now; the 12 existing cases unchanged and green (15 / 15).
- Fix 2, 3db4a2a4b. DEVIATION: the moved switch is re-plan only (`a5Substation.ts:355` keeps the built yard's switch at
  69.7 under `if (!opts.replan)`, and `replan/a5Substation.test.ts:330` pins it). So the built row at :173 stays as
  it is and `MARLOW_CIRCUITS_REPLAN` gets a group 50 row (`src/world/lighting/marlowCircuits.ts:210`; the brief's
  `ctcourseSets/marlowCircuits.ts` path does not exist) with `a5-sw-apron` at (67.8, 36.0), "on the perimeter wall's
  inside face, by the apron's east bulkheads". Pinned in `replan/a5Substation.test.ts` (the switch spot and the re-plan
  row agree; the built row keeps 69.7 at the L4 door). Undo: edit the built row instead (then the built table no longer
  matches the built yard).
- Checks: `npx tsc --noEmit -p tsconfig.json` clean; eslint clean. vitest: a5Substation 45, a5Ticks 15, courseStation 43,
  marlowLightingCircuits 9, variant 14 passed / 1 FAILED.
- The variant failure: `variant.test.ts:180` "the built table and pockets are untouched" requires every re-plan row
  except 22, 49 and 69 to be the built object; group 50 is a re-plan row now. Fix in the lead's variant rewrite: add 50
  to that list (with A2's 20 from G-A2: `[20, 22, 49, 50, 69]`). Not in this brief's file list, so not edited.
