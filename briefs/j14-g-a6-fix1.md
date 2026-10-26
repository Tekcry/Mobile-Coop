status: open
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
