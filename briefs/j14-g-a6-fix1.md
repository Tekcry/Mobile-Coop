status: done feature/marlow-replan-g-a6-fix1 15c50fd28f8e0063897a16276a99ca8c0e64a899
# J14 Marlow re-plan, slice G-A6 fix round 1 (Opus): station 16 line names the ladder; A26-style trap retry for A6

Lead: Night Shift | Marlow Build. Checker (fresh Opus) verdict on the base head 00d90d254 (G-A6 merged): FIX, two items.
The summary below is complete for this fix (full report in the lead's scratch `j14-g-a6-check.md`).

- Base: `feature/marlow-replan-base` @ 00d90d2542c1504327cc4544746bf3eb9704716f. New branch
  `feature/marlow-replan-g-a6-fix1` from it; push there (the lead merges it into the base).
- Read first: `docs/systems/agent-preamble.md` (origin/master); `git show origin/cloud-queue:briefs/j14-g-a6.md` (the
  slice brief and its report); STATIONS A6 block (stations 14-16) and PLAN A26 on origin/feature/marlow-replan
  (`docs/marlow-replan/STATIONS.md`, `PLAN.md`); `src/game/course/replan/a1Ticks.ts` (the A26 pattern to copy) and
  `tests/ctcourse/replan/a8Ticks.test.ts` or `a5Ticks.test.ts` (the tick test fake).
- Michael's rule (Q5 / G370): every failure in Marlow Yard is a retry; the pair is never trapped.

## Only files to edit
- `src/game/course/replan/a6Ticks.ts` (a stub today)
- `tests/ctcourse/replan/a6Ticks.test.ts` (new)
- `src/world/maps/ctcourseSets/replan/a6PumpHouse.ts` (the `a6-drop` objective lines only, about :150-170)
- `tests/ctcourse/replan/a6PumpHouse.test.ts` (the text case only)
- `changes/feature-marlow-replan-g-a6.md` (one bullet each, same file, no new fragment)

## Fix 1: station 16's objective names the stand-in ladder
`a6-drop` says "One of you drops through the bridge opening into the drive pit; the other catches" and B: "Stand under
the opening in the drive pit and catch your partner." Until the `dropCatch` move ships, the way down is the cage
ladder (`standIn: 'g-a6-pit-ladder'`, :125) and no catch exists; A2 and A5 name their stand-ins in the objective. Done
looks like: `a6-drop` text / a / b name the ladder through the bridge opening into the drive pit (both go down it),
still what and where, under `COURSE_TEXT_MAX`, no word "fail"; a code comment that the lines go back to the drop and
catch when `dropCatch` ships; the unit text case updated. Leave `a6-dropcatch`'s retry line as it is unless it also
names the catch as the only way (then name the ladder the same way).

## Fix 2: no trap on the pump floor (A26 for A6)
Once `a6-gal1` is set (one player on the gallery) the stair is closed and the lip locked; from the pump floor the only
way to the gallery is the rope, which needs a holder on top. If the gallery player falls or drops back, or in 15 / 16
both end up on the floor (the hanger walks out of the pit and the holder jumps down; both drop early and leave by the
cage door), only the attendant's view or the pause menu's restart frees them. Done looks like, in `a6Ticks.ts` copying
`a1Ticks.ts`: while station 14, 15 or 16 is live and `a6-gal1` is set, at least one player stands on the pump floor
(feet about y 0; outside the drive pit, the culvert and the sump-bay kerb: take the zones from `replan/a6PumpHouse.ts`
and say which you used) and nobody is on the gallery, the bridge, the rope or climbing to them, for `A6_TRAP_GRACE`
= 5 s -> `h.retry(n, 'other')` (both on that station's marks; 14 reopens the lip as its retry already does). Reset the
clock on `epoch()` change and whenever the condition breaks; the retry counts only when `retry()` returns true.
Host only, allocation-free (module-level numbers, `TickZone` constants), same doc comment style as A1. Make sure any
`retry:<id>:other` line the retry shows exists for 14-16 (add to the A6 retry lines in `a6PumpHouse.ts` only if the
station retry path needs one; say so). Unit cases in `a6Ticks.test.ts`: per station 14 / 15 / 16 a trapped pair
retries once after 5 s (not before); no retry while a player is on the gallery / bridge / rope; no retry before
`a6-gal1`; the clock resets on an epoch change.

## Checks
`npx tsc --noEmit -p tsconfig.json`; `npx vitest run` on `tests/ctcourse/replan/a6Ticks.test.ts`,
`tests/ctcourse/replan/a6PumpHouse.test.ts`, `tests/ctcourse/replan/variant.test.ts`, `tests/courseStation.test.ts`.
No e2e, no `npm run check`.

## Done
Push, append a short report (commits, file:line, zones used, tests with counts), set
`status: done feature/marlow-replan-g-a6-fix1 <sha>`.

## Report (append below)

Night Shift | Cloud Builder 1, 2026-10-26. Branch `feature/marlow-replan-g-a6-fix1` from 00d90d254, pushed, head
`15c50fd28f8e0063897a16276a99ca8c0e64a899`.

### Commits
- e7d6b6f8c fix 1: station 16's objective names the stand-in ladder
- 15c50fd28 fix 2: no trap on the pump floor (A26 for A6)

### Fix 1 (`src/world/maps/ctcourseSets/replan/a6PumpHouse.ts:164-175`)
- text: "Both of you down the cage ladder through the bridge opening into the drive pit." (79 chars)
- a: "Climb down the cage ladder through the bridge opening into the drive pit."
- b: "Down the cage ladder through the bridge opening; wait at its foot in the drive pit." (B's retry mark is on the pit
  floor, so the line covers B starting there.)
- A code comment keeps the drop-and-catch lines to restore when `dropCatch` ships.
- Retry line changed (the brief's condition held: it named the catch as the only way): "Back to the bridge; catch your
  partner." -> "The attendant heard the landing. Back to the bridge; take the cage ladder down." (:134-136, comment gives the
  STATIONS original to restore).
- Text case (`tests/ctcourse/replan/a6PumpHouse.test.ts:320-334`): each `a6-drop` line names the cage ladder, the bridge
  opening and the drive pit; none says "catch" or "drop"; the retry line names the ladder.

### Fix 2 (`src/game/course/replan/a6Ticks.ts`, the `a1Ticks.ts` pattern)
- While station 14, 15 or 16 is live, `a6-gal1` is set, at least one player is on the pump floor and nobody is up or
  climbing, for `A6_TRAP_GRACE` = 5 s: `h.retry(n, 'other')` (:64-91). Clock resets on an `epoch()` change and whenever
  the condition breaks; only an accepted retry resets it (refused calls keep trying, as A1). Host only, allocation-free
  (two module-level numbers, `TickZone` constants).
- Zones (hard-coded as the other ticks; the test checks them against `A6_SHELL`, `A6_PIT`, `A6_HOUSING`,
  `A6_CULVERT_1/_2`, `A6_BRIDGE`, `A6_DECK`, `A6_STAIR_SCREEN`, `A6_DROP`, `A6_PLATE`, `A6_PIT_LADDER_AT`, `A6_PLINTH`,
  `A6_STEPS`, `A6_LANDING` in `replan/a6PumpHouse.ts`):
  - Pump floor, six boxes, feet y -0.5 to 1.0 (:37-47): the shell less the drive pit and less the culvert housing's outer
    footprint (z 62.3 / 60.9 to 63.9, jog at x 61.3); both culvert holes lie inside the housing. A 0.25 m grid test shows
    every point is in exactly one floor box, or none when in the pit or the housing.
  - Up (:50-59): gallery [40.25, 69.6, 56.0, 71.75] feet 3.4-6.5; bridge = `A6_BRIDGE` feet 3.4-6.5; gallery face strip
    [40.25, 68.6, 56.0, 69.6] feet 1.0-6.5 (lip, rope, boost); pit climb [50.9, 64.45, 53.1, 66.2] feet -0.7 to 3.4 (a
    hang through the gland plate or the drop opening, and the stand-in ladder; clear of the plinth, steps, landing).
- Reading for the lead to overrule: "outside ... the sump-bay kerb" read as "the kerb's top is off the floor", not "the
  sump bay is off the floor": the sump bay counts as pump floor (a pair stuck there is just as stuck). The kerb top and
  the pump plinth tops (1.2 m) fall outside the feet band, like A1's bollards.
- Retry lines: the 'other' path shows only a `retry:<id>:other` line and none existed (the retries would be silent).
  Added `A6_TRAP_LINES` (:140-146), pushed at `retryKey(id, 'other')` (:370):
  - a6-rope: "No one on the gallery to hold the line. Back to the sump bay, behind the kerb."
  - a6-hangdown: "No way back up from the pump floor. Back to the bridge's north end."
  - a6-dropcatch: "No way back up from the pump floor. Back to the bridge and the drive pit."

### Tests
- `npx tsc --noEmit -p tsconfig.json` clean; eslint clean on the four changed TS files.
- `tests/ctcourse/replan/a6Ticks.test.ts` (new) 17/17: fake hooks (14 / 15 / 16 each retry once after 5 s, not at
  4.8 s; no retry while a player is on the gallery, bridge, rope, lip, a plate hang, a boost or the ladder; none before
  `a6-gal1`, with nobody on the floor, or on stations 0, 13, 17; the clock resets on an epoch change, a climb, the
  station going to 0, or the flag dropping; a refused retry spends nothing); real re-plan `CourseState` (a 14 retry drops
  `a6-gal1` and reopens the lip; 15 keeps the flag and the lip locked; 16 keeps the stand-in ladder open; `retryOff`
  stops the retry; `retryLine` gives the new 'other' lines).
- `a6PumpHouse.test.ts` 30/30, `variant.test.ts` 15/15, `tests/courseStation.test.ts` 44/44. Total 106.

### Deviations
- The retry line change above (allowed by the brief on that condition).
- Three new 'other' retry lines: STATIONS section 6 lists 'other' lines for A1 only, so STATIONS needs these rows.
- `changes/feature-marlow-replan-g-a6.md`: one new bullet per fix.
- A move from station 15 straight to 16 does not reset the clock (the epoch only changes on a retry or restart); in play
  that move needs the holder on the bridge, which already stops the clock.

### Pending PC runs
None new. `scripts/e2e-ctcourse/replan/a6PumpHouse.mjs` is untouched and does not cover the trap retry.
