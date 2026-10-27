# guard-ai mill-hunt: PR 1 check A
Owner: Guard AI Build. Status: current.

Checker A of two (Opus 5.5), 2026-10-27. Scope `git diff 597df8bce 8993d6a75 -- src tests` (H1 data, H2 board, the
real-map sims), against BRIEF, PLAN revision 2, PLAN-CHECK checks 1-2, H1-REPORT, H2-REPORT.

Verdict: **FIX** (one item: three guards within 3 m across a room boundary; the room-box cap does not see it).

## Own view
- Intent: the board does what Michael asked in the no-trigger run: every guard `searching`-ready, slow (0.45 m/s),
  room by room along a fixed, readable order (six phase rows, `phaseMin` 60 / `phaseMax` 120, no player position read,
  no randomness), corners cleared from authored aims, units of 1-2, gallery stays upstairs (A5). One hole against
  "not bunch up into groups bigger than 2": FIX 1.
- PLAN rev 2 item 1 (in-room units rank first): met. `rankLine` (`src/ai/millHunt.ts:500`) classes loop / in room /
  out; `gapFree` (`:469`) counts only higher ranks. Test "check 2 item 1" (`tests/millHunt.test.ts:141`) is real (below).
- Item 2 (built empty, `admit` for spawn, late spawn, rejoin, with the start spread): met. Constructor allocates and
  admits nobody; `admit` (`:548`) pairs by map data, places, spreads at once (`:603-605`); rejoin keeps the index and
  partner link. Sims start empty, plus late G1 / G3 and fight rejoins G8 / G5 on the real sets: all checks pass.
- Item 3 (H2's side of the cue hook): ready as hooks: `H_CHECK` (`:71`), skipped by `lowestIn` (`:629`) and
  `pairable` (`:730`), hook comments in `advanceUnit` (`:982`) and `decide` (`:1045`), `setTarget` (`:814`) public.
  What H4 must add is in Polish 5.
- Deadlock / cap: blocking only runs down the ranks, walking legs end, spread and regroup walkers reserve or wait for
  rooms being emptied; the sims' no-hold check reads "wanted stop free of higher ranks and its room has space" every
  step: 0 fails on test and real data, 12 and 16, with late joiners and rejoins. Cap by room-box positions holds in
  spread, regroup, move, clear, hold, loop and on admission (the start's 3 in `startBay` / `stairHead` falls to 2 in
  1.0 s / 10.6 s).
- Reversals: at most 1 per member (sim metric on move legs). Order: `orderStep` (`:781`) reads only `done[]` (the board's
  own members finishing aim cycles) and the clock.
- Takedowns: pairs on `pt` / `pt2` 1.0-1.5 m apart; outside the target room only aims within `aimSide` of the line
  towards the target (`aimMask` `:843`), in it plus one look back; legs face along the line (face NaN). End state: the
  ground queue faces L1 with its back to the west (the from-behind window), the gallery holds face the hall.
- Data: stops in their room boxes, 0.5 m clear, on the runtime nav grid, adjacent legs walkable (H1 tests). The two
  real-map fixes are sound: craneWest x 13.6 makes it G8's nearest stop by 0.38 m and G9's by 0.50 m (stair head 1.94 /
  1.60 m vs 1.56 / 1.10 m); aisle east x 17.9 keeps spacing 2.55 / 3.9 m. Every gallery stop's usable aim set has a
  hall-facing aim in both directions, in and out of the target room (real-map test).
- Hard rules: pure (no Babylon), `hyp2` only, no `Math.hypot` / `Math.random`, strict TS clean, zero allocation in
  `tick` (`bytesPerCall` over 2000 ticks, 16 guards), two runs identical.

## FIX
1. **Three guards stand within 3 m of each other for minutes; the cap only counts room boxes.**
   `loopNext` (`src/ai/millHunt.ts:1083-1093`) refuses only a higher rank's gap (`gapFree`) and the very same stop
   (`stopTaken`), so the looper (rank 0) walks onto a stop 2.7 m from a lower-ranked unit standing in the next room; the
   lower unit, already inside the gap, "just holds" there. The sims count the cap by room boxes only
   (`tests/helpers/millHuntSim.ts:282-319`), and gallery rooms are x-strips whose stops sit 2.7 m apart across a
   boundary, so they pass. Concrete, real `THORNBECK_HUNT`, default 12 set, no trigger (scratch probe on `runHunt`'s
   `onStep`): G10 loops `stairHead` 7.9 -> 10.9 and stands 2.7 m behind G8 + G9 at `craneWest` 13.6, facing east at
   their backs: 3 guards within 3 m at t 21-33, 54-57, 61-117 and 126-214 s (~170 s). Phase 2 adds G7, walking to the
   `craneEast` target at 17.5, 3.9-4.05 m ahead of the pair (4 guards over 6.6 m). On the ground: G1 + G2 looping the
   start bay with G3 in the aisle, 3 within 3 m at 12-19, 57-61, 117-126 s, on the players' start route. Test def:
   G6 looping the lobby within 3 m of G4 + G5 holding the office, ~15 s of every ~34 s from 380 s to 700 s. A co-op
   pair taking G8 + G9 has G10 watching from 2.7 m: Michael's "not bunch up into groups bigger than 2 at a time, so
   coop gameplay allows stealth takedowns". H4's `setTarget` jumps will put loopers next to queued units wherever the
   players are.
   Done looks like: the sims (test and real data) assert, by member positions every step after the start's 15 s, that
   no guard has guards of another unit within 3 m that make 3 or more; a board rule keeps it. Trial in my working tree
   (reverted, not committed): in `loopNext` also refuse a stop within 4 m of any other unit's `mTo` on the line (unless
   the looper already stands that close). Real 12 / 16 sims then pass every existing check with no 3-within-3 m after
   the start spread; one unit test ("a fighter rejoins and pairs again", `tests/millHunt.test.ts:270`) changes timing and
   needs a look. Lead's call on the exact rule (and whether the far-side approach at 3.9 m needs one too).

## Polish
1. Two solos admitted to one stop get the same leader spot: real 16 set G6 + G13 at office stop 13 (0.2-10.2 s), G7 +
   G14 at eastEnd stop 26 (0.2-6.8 s, 0.00 m apart in the sim), G10 vs G15 + G16 at stair head stop 20 (4-8 s). Short,
   but two capsules on one goal will shove. `admit` (`:577-583`) could give the second solo the stop's free spot or
   the next free stop.
2. The 16-set end-state margin is 0.1 m (10.4 of `gap` + 4.5 = 10.5; aisle stop x 17.9): any later stop nudge in the
   aisle or start bay can flip `tests/millHuntThornbeck.test.ts`. Say so beside the stop in the data.
3. Start detection (for H3's e2e "no detection at the start", fold-in 3): aims at the first stops point away from the run
   (H1 test), but the calm turns between aims do not. Sim, real 12: G1 arriving at start bay stop 1 (8.0, 6.6) heading
   south turns onto aim -0.6 the short way through west and faces the players' start (4.0, 6.0) at 6-7 s; G2 at
   (8.0, 5.4) faces towards Sa at 4.8 s; G1 loops to stop 2 (7.6, 3.2) and aims at Sa at ~16 s; G3 in the aisle
   (11.4, 2.6) faces west (-1.57 / -0.49) towards the start from ~7.6 s through phase 0 (intended: heading towards the
   players). Occlusion by W1 is not modelled here; if the e2e fails, reorder stop 1's aims or the arrival yaw.
4. A unit holding inside the target room repeats its one look back every hold cycle (`aimMask` full set, `:858`), so
   "at most one look back per stop" holds per cycle, not per stop visit. Fine for the from-behind window in practice
   (target-room holds are short); name it if Michael sees a guard glancing back often.
5. H4 needs from the board: an entry point (e.g. `cue(m, x, z)`), an off-stop goal (`emit` / `spotX` always send a stop
   spot, `:402-410`; `roomLoad` counts `mTo` stops), and the `H_CHECK` branches in `advanceUnit` / `decide`. Nothing in
   H2 blocks it.
6. A member who never reaches his spot (nav failure) never finishes an aim cycle: his target room is not cleared (phase
   waits for `phaseMax`) and lower ranks queue behind him (H2 report says so); H3's manager run should watch for it.

## Risks for the walk card
- Cordon: the landing pair (G11 + G12) holds the landing the whole run (866 s real 12, 882 s real 16), on the gap to the
  stair head unit; with the hoist door opening only when every guard is down, climbing players meet a gallery queue of
  4 (12) or 6 (16) units between the hatch and the hoist door, facing them and the hall.
- Straight-leg sim vs real paths: I ran every adjacent-stop leg (`pt` and `pt2`) on the runtime nav grid: no path enters
  a third room's box; two detour (sack bay -> office `pt2` 2.9 m vs 2.0 straight; office stop 13 -> 14 `pt` 5.7 vs 4.0).
  Left to H3's e2e: crowd avoidance, replans, the 0.5 m arrive, and "no room above 2 over 60 s" on real positions.
- Ground queue faces L1 with its back to players coming from the west (plan check 2 fold-in 3; intended).

## Spot-check (tests are real)
- `rankLine`: `inRoom` forced false -> 4 fail (the three rank tests incl. "check 2 item 1", and the rejoin test).
- `spreadStep`: room check removed -> 4 fail (test-def and real-map 16 sims, plain and with late / rejoin).
- Restored with `git checkout src/ai/millHunt.ts` each time; scratch tests deleted; tree clean before this commit.

## Commands and results (worktree C:/NightShift/Mobile-Coop-guard-ai-mill-hunt, head 8993d6a75)
- `npm run typecheck:fast`: exit 0.
- `npx vitest run tests/millHunt.test.ts` + every test importing `game/sectors` or `maps/thornbeckMill` (63 files,
  incl. `millHuntThornbeck`, `thornbeckMill`, `pianoScene`, `pianoNet`, `sectors`, `campus*`, `sector*`): 64 files
  passed, 1308 passed, 2 expected fail, 1 skipped, 1 todo; exit 0 (22 s).
- Scratch probes (deleted): cluster / stacked-stop / facing / hold probes on `runHunt`'s `onStep` (real and test data,
  12 / 16, with and without late joiners and rejoins); the start-run facing probe; the nav-path probe on the runtime
  grid; the trial `loopNext` rule (FIX 1).
- Not run: `npm run dev`, e2e, full `npm run check`.
