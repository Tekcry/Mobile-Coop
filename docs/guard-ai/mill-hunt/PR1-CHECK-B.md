# guard-ai mill-hunt: PR 1 check B
Owner: Guard AI Build. Status: current.

Checker B of two (Opus 5.5, independent of check A), 2026-10-27. Scope `git diff 597df8bce ed5bc1b27 -- src tests`
(H1 data, H2 board, real-map sims, the check-A fix round), against BRIEF (Michael ~10:00, ~10:05 "fixed readble path is
good", ~10:12 "Stay upstairs (Recommended)"), PLAN rev 2, PLAN-CHECK checks 1-2, H1-REPORT, H2-REPORT.

Verdict: **PASS** (dark, no runtime caller; nothing broken; one must-carry for H4 below).

## Own view
- Intent: every unit walks one fixed line at 0.45 m/s, clears authored corners, holds and re-clears, and follows six
  fixed phase rows (`phaseMin` 60 / `phaseMax` 120); `orderStep` / `stepPhase` / `setTarget`
  (`src/ai/millHunt.ts:865-918`) read only `done[]`, the clock and stop data, never a player. No randomness; two runs
  identical (tests). Gallery stays upstairs (A5). Matches "cautious and searching ... slowly and methodically ...
  checking all corners ... heading towards the players" and the readable order.
- Rank / gap / cap / admission / spread / regroup: `gapFree` (`:517`) counts only higher ranks; `rankLine` (`:548`) puts
  every in-room unit above every outsider; `roomSpace` (`:512`) counts positions in the box plus walkers in; spread
  and regroup walk stop by stop and wait for, or reserve, room space. No cycle can form down the ranks. Sims (test and
  real data, 12 / 16, late joiners, rejoins): no cap, growth, deadlock or 3-within-3 m fail; at most one move reversal.
- Loop rule (`loopNext` `:1209`, `crowds` `:1231`): right and readable. A looper never steps to a stop whose 4 m
  neighbourhood would hold more than 2, or next to a guard who already has a guard near him; all blocked, it holds.
- Side effect fix (`onCycleDone` `:1141-1151`): a standing unit outside the target room that finishes an aim cycle marks
  the target room's stops within `apart` done. It is not a skip of clearing by the unit itself (it still runs its own
  cycle) and it only feeds the phase-step test; `phaseMax` stays the backstop. Readable as "the stop next door was
  covered from next door". See Polish 1 for the one place it reaches through a wall.
- New rules:
  - `stuckT` 8 s (`watch` `:1053`): resets on every new goal (`leg` clears `mSkip`), counts him as arrived, goal = where
    he stands, his unit still runs its aim cycle from there. Explainable, no stale state.
  - Woken re-pair (`admit` `:596-628`, `free` `:810`): the slot takeover drops the old object first and keeps the
    partner link; once freed, the partner's link is cleared and the map's pair data pairs again.
  - Freed indices (`tick` `:1026-1031`): dead / taken leave and free; a fighter keeps his index for the rejoin.
  - Goal arrays (`gx` / `gz` / `gface` / `gspeed`, written by `emit` `:1293` for every on-board member each tick;
    `out` optional): correct; stale values only for `mOn` 0 members, which the reader skips.
- Takedowns: pairs on `pt` / `pt2` 1.0-1.5 m (H1 test); legs face NaN (walk direction); outside the target room only
  aims within 100 deg of the line forward and no look back; in it one look back per stop visit (`uBack`, `:957`).
- Data: stops in their boxes, 0.5 m clear, on the nav grid, adjacent legs walkable (H1 tests). Both data fixes hold
  (G8 1.56 m to craneWest `:279` vs 1.94 m to the stair head; G9 1.10 vs 1.60; aisle `:242` spacing 2.55 / 3.9 m).
  Every gallery stop's usable aim set has a hall-facing aim both ways (real-map test).
- Hard rules: pure, `hyp2` only, no `Math.hypot` / `Math.random` / clock reads; all typed arrays and the `ms` array are
  allocated in the constructor; `tick` plus the goal hand-off measure 0 B per tick (test); strict TS clean.

## Groups of at most 2 (the asked questions)
- `HUNT.apart` group-of-3 rule in `crowds`: sound for the loop. `CLUSTER` check: the 15 s `SPREAD_WIN` is honest. I
  re-ran every sim recording groups with no window after t = 15 s: the only group it hides is the late G3 spreading out
  of the start bay (G1 + G2 + G3, 20.2-27.4 s, real 12 / 16). No rejoin group is hidden.
- The 3 m radius is looser than the board's own `apart` 4 m and than the stop spacing across room edges (2.4-3.9 m).
  At 4 m, no-trigger runs:
  - real 12: G7 (solo) walks into the craneEast target 3.9 m from G8 + G9 holding at craneWest, 127-180 s.
  - real 16 (not wired: the section runs `THORNBECK_GUARDS`): G15 + G16 move onto the stair head target 3.3 m from
    G11 + G12 on the landing and both pairs stand there the whole run (4 guards in about 3.5 m); G10 (spread to
    craneWest) 3.9 m from G8 + G9 (spread to craneEast) the whole run. Six gallery units on a 28.7 m line cannot keep
    `gap` 6 apart anyway (the cordon risk).
- The known gap is wider than "after a `setTarget` jump": the same mechanism (a top-ranked `move` in
  `stepOrHold` `:1192-1198` checks only higher ranks, so it may walk up to a lower-ranked unit across a room edge)
  shows in the plain phase order above. With jumps every 70 s the 3 m check fails on all four data / set runs, e.g.
  real 12 G7 + G8 + G9 within 3 m from 835 s to the end of the run (65 s and still on).
- Fix now or in H4: acceptable for this dark PR 1. Nothing calls `setTarget` until H4, the 12-set no-trigger case is
  3.9 m (outside 3 m) for 53 s on the gallery while the players are on the ground, and the fix touches the rank
  promise (check A's fixer showed blocking the move breaks "check 2 item 1"). It is a must-carry, below.

## Must-carry for H4 (before `setTarget` gets a caller)
1. Close the move case: a top-ranked unit's `move` must not make a group above 2 with a lower-ranked unit across a room
   edge (e.g. an in-room unit whose next stop `crowds` starts its loop from where it stands, and the sims' no-deadlock
   check learns that hold). Then raise the sims' `CLUSTER` (`tests/helpers/millHuntSim.ts:243`) to `HUNT.apart`, or
   state on the walk card why 3 m is the group line. Real 16 needs a decision on gallery density (fewer gallery units
   or more stops) before it can pass at 4 m.

## Agreement / differences with check A
- Agree: own-view points on intent, rank classes, empty build and `admit`, deadlock-freedom, data fixes, hard rules;
  FIX 1's diagnosis; Polish 1, 4 and 6 are closed by the fix round (second solo takes `pt2`, `uBack` per visit, the
  stuck watch); Polish 5 is H4's.
- Differ: check A's done-looks-like used 3 m, which the fix round meets; I read Michael's "not bunch up into groups
  bigger than 2 ... so coop gameplay allows stealth takedowns" against the board's own 4 m (`apart`'s comment: "not
  watched from 3 m"), which the move case still breaks (above). Not a block for PR 1, a must-carry for H4.
- Check A Polish 2 (the 0.1 m end-state margin beside the aisle stop) was not written into the data; still open.
- Check A Polish 1 is not fully closed: in the 16 set G10's spread walks onto stop 20's `pt`, which G15 holds (three
  guards, two spots, 0.2-8 s, inside the start window). In the game G10 cannot reach a spot G15 stands on: the stuck
  watch frees him after 8 s; on the 1.9 m gallery band he must also sidestep the pair standing abreast. 16 set only.

## Polish
1. The side effect (`:1146-1147`) and `crowds` use straight stop distance, through walls. Office stop 12 (west door,
   `thornbeckMill.ts:252`) is 3.4 m from lobby stops 15 / 16 across the office's north wall, and the office line
   doubles back, so a unit at stop 12 facing its target side looks only south at the desk (aim -3.03) yet marks the
   lobby stops done. Today harmless (the lobby is the last row, where `done` is not read); after an H4 jump with the
   office as target, a unit in the lobby can mark office stop 12 done through the wall. Consider limiting the side
   effect to the target-room stop next to the unit on its line (`s ± 1`), with `crowds` to match.
2. A cycle started before a phase step or `setTarget` and finished after it uses the old `uFull` / aim set
   (`onCycleDone` `:1141`): one cycle may mark the new target room from aims chosen for the old one. One cycle; note it.
3. At a line end the spread has no "away" room (`spreadUnit` `:725` returns false; a nested full room's false is
   ignored at `:728`): G7 rejoining the full landing in phase 5 (real 12, scratch) left 3 in the landing for 19.6 s
   (over the 15 s window) until he stepped east. H3 / H4 rejoins: fall back to spreading towards the target.
4. H2-REPORT says the stuck watch "never fires in the sims"; true for straight legs. H3's e2e should log `mSkip`.

## Spot-check (tests are real)
Each mutation in the working tree, run `tests/millHunt.test.ts` + `tests/millHuntThornbeck.test.ts`, restored with
`git checkout src/ai/millHunt.ts`; tree clean after:
- `crowds` removed from `loopNext`: 9 fail (the group unit test, all 8 sims).
- Side effect off: 3 fail (the group test, the rejoin unit test, real 12 with late / rejoin).
- Look back every hold cycle: 1 fail (the one-look-back test).
- Stuck watch never fires: 1 fail (the stuck test).
- `free` never called: 1 fail (30 kill / revive cycles).
- Slot takeover off: 1 fail (the woken guard test).

## Commands and results (worktree C:/NightShift/Mobile-Coop-guard-ai-mill-hunt, head ed5bc1b27)
- `npm run typecheck:fast`: exit 0.
- `npx vitest run tests/millHunt.test.ts` + every test importing `game/sectors` or `maps/thornbeckMill` (66 files incl.
  `millHuntThornbeck`, `thornbeckMill`): 67 files passed, 1397 passed, 2 expected fail, 1 skipped, 1 todo (18 s).
- Scratch probes (deleted): groups at 3 m and 4 m with no window, plain / late + rejoin / `setTarget` every 70 s, test
  and real data, 12 and 16; per-unit traces at 20-899 s; cross-room stop pairs within `apart`; rejoins into full end
  rooms.
- Not run: `npm run dev`, e2e, full `npm run check`.
