# Piano GA5 - Thornbeck Mill guard data review
Owner: Night Shift | Guard AI Build. Status: current.

Reviewed: `src/world/maps/thornbeckMill.ts` on origin/feature/piano-escape-s1b (PR #617, head 9b2c71b8c),
`THORNBECK_GUARDS` (G1-G12, slots 0-11) and the G13-G16 extras, against Campaign's PLAN section 3 and Guard AI's GA6
plan (`docs/guard-ai/slices/PIANO-GA6-PLAN.md` on feature/guard-ai-piano-sweep, section 8 "To Campaign").

**Verdict: good base; six data deltas so GA6's sweep runs as planned.** Routes, posts, waits, faces and kill spots match
the PLAN table; G3's out-and-back with 0-wait corners, the posts (G6, G10) as two points on one spot with `faces`, and
G7's ends are already in the form GA6 reads.

## Deltas for S1b (or a follow-up commit; none blocks the greybox)
1. **Pairs both ways** (`pair` = the partner's index): G1 `pair: 1`, G2 `pair: 0`; G8 `pair: 8`, G9 `pair: 7`; G11
   `pair: 11`, G12 `pair: 10` (G4 / G5 already 3 <-> 4). On the scene a pair gets the shared sweep schedule, opposite
   pans and G335's missing-partner watch (one taken alone: the other notices in 3 s), which is what makes them co-op
   kills.
2. **G4 / G5 without `loop` and `wait`.** The scene derives every schedule at 0.7 m/s and ignores `loop` (GA6-A3). Give
   per-point `waits`: G4 `[X, 0, 4, 0]` (door stop (25.2, 12.2)), G5 `[Y, 0, 4, 0]` (door stop (24.0, 12.2)); keep
   their `faces`. X / Y tune both laps to 40 s: assert `sweepPeriod(route, waits) === 40` (from `src/ai/sceneSweep.ts`,
   GA6a, coming) in your S1b test. Rough guide: G4 walks 20.4 m (29 s at 0.7 m/s) plus turns, so X is small (0-2 s);
   G5 walks 13.6 m (19 s), so Y is about 8-10 s. If G4 cannot fit 40 s, lengthen both laps together (say 45 s).
3. **`start` on G4 / G5** so their door stops' `leave` coincide (they meet 1.2 m apart every 40 s). Every other route
   may omit `start` (the default phase: arriving at point 0 at the EMP); partners keep identical starts.
4. **Lanes:** G8 / G9 at z 15.5 / 16.6 (today 15.7 / 16.5), G11 / G12 at z 15.9 / 17.0 (today 16.1 / 16.9); move their
   spawn `x, z` with the lanes. 0.8 m is too close for two guards abreast (soft spacing 1.05 m pushes them apart).
5. **G1 / G2 at 0.7 m** (z 8.0 / 8.7) is your PLAN's own conflict with PB4 (1-1.5 m for the paired kill): W1's north
   face (z 7.5) and the sack wall (z 9.2) leave 1.7 m, so the 0.5 m clearance allows at most 0.7 m. Pick: relax the
   clearance on that wall (about 0.35 m gives 1.0 m) or amend PB4 for K1. Guard AI is fine either way (the hard floor
   is 0.65 m; their soft push is skipped between sweep partners).
6. **Extras G15 / G16** (stair-head pair, tagged): `pair` both ways once they are appended (their indices in the list).

## Notes
- A restart resets the guards' sweep clock but not `world.lightning.t0` (the storm plays on), so guards vs flashes
  differ from run 1 (still deterministic per input). Stretch 7 says "between flashes": judge it on the walk.
- Gallery torches (G8 / G9 into the crane well, G10 over the hall) pan in yaw at the fixed torch pitch; their cones reach
  the hall floor only about 10 m out. Players below are seen mainly by flashes.
