# Piano GA6 plan check (head 1e6bf8077)
**FIX**

Checker: Opus 5.5 (fresh), 2026-10-26. Read: the plan in full; Campaign's PLAN on origin/feature/piano-escape (section 2
EMP beat, section 3 stretches and guards tables, PB4, GA3-GA7 rows, risks); origin/master CLAUDE.md hard rules; the code
in src/ai (patrol.ts, enemy.ts, enemyManager.ts, separation.ts, pairs.ts, response.ts), world/torches.ts,
net/torchMirror.ts, game/modes/sectorMode.ts `fill`; S2's `pianoScene.ts` (origin/feature/piano-escape-s2) and S1b's
`thornbeckMill.ts` (PR #617, origin/feature/piano-escape-s1b).

The design is sound in most places. The file:line claims I spot-checked hold. The seams are real: `walker.lookYaw`
becomes the goal face (enemy.ts:2838-2842), and body yaw drives both sight (`P_ANGLE` uses `this.yaw`, enemy.ts:2519)
and the torch, so parity holds. The client's torch is derived from the guard's snapshot yaw (`torchMirror.ts` calls
`placeTorch` on `o.yaw`), so there is no wire change. No save change is needed. Both slices are under 600 lines.

The `sceneDark` accessor works with S2. `spawnBeat` calls `sceneDark(true)` on the EMP and again on every restart
(pianoScene.ts:430), while `sceneDark` is still true. This is safe as long as the setter acts on every set to true,
not only on a change. The plan says so, and its "same clock after a re-set" test covers it.

The rejoin-by-schedule is sound: a guard is never stuck past one lap, and two guards on one schedule end up abreast
again.

Using `sendTo(x, z, -1, true)` for the partner is safe:
- `incident` -1 makes `calmEnd` false (enemy.ts:2715). The partner goes through cooldown, then rejoins (enemy.ts:2257-2260).
- The partner's own rise is `RISE_SOUND`, because `sendTo` sets `heard`. So the follow cannot echo back to the guard
  who saw.
- `urgentKind('noise')` is false, so the walk is not a rush.

## FIX
1. **Skipping `buildPair` while dark also drops G335's "paired patrols that check on each other".** The walking-together
   watch (`PairMeet.watch`, pairs.ts:388-420) is the rule where one partner is gone and the other notices after
   `PAIRS.notice` 3 s. It only exists on a pair that `buildPair` built. Plan section 2 ("`buildPair` is skipped") and
   A6 remove it on the one scene built around co-op kills. Campaign's GA5 row asks for "pairs as guard pairs, G335",
   and Michael asked to "force ... coop kills". Without the watch, one player can knife one partner, then the other.

   Fix: keep the missing-partner watch for sweep partners while dark. Use a watch-only pair (no meet points, no lines,
   no `pairWhyNot` timed-loop requirement), or call the watch from the sweep-pair data. Log one assumed decision on its
   gate: follow `flags.guardPairs` (dark until walk item 5), or always on, on the scene.

   Tests (pianoGuards):
   - One of a sweep pair taken alone: the other is `missing` after 3 s.
   - Both taken within `DUAL_WINDOW`: nothing.
   - Off the scene: unchanged.
2. **`tests/sweep.test.ts` already exists.** It is the response team's sweep test (206 lines, imports `SWEEP` from
   `src/ai/gear.ts`). The plan lists it as new in section 3, Claims and section 5. A literal build overwrites existing
   coverage, and the claims are wrong. `src/ai/gear.ts:56` also already exports a `SWEEP`.

   Fix: name the new test `tests/sceneSweep.test.ts`. Preferably also name the module `src/ai/sceneSweep.ts` with
   `SCENE_SWEEP`, so `enemyManager.ts` never has two `SWEEP`s in reach. Update the claims to match.

## Notes for the builder
- **S1b's data has landed (PR #617, open).** The plan's "No scene data yet" is stale. Send the asks to #617 (or GA5)
  as concrete deltas:
  - `pair` both ways on G1/G2, G8/G9 and G11/G12. Today only `squad` is set.
  - G4/G5: drop `loop` and `wait: 4`. Use per-point `waits` (0 at corners, 4 at the door) and tune both laps to 40 s
    at 0.7 m/s with the end waits. Today the four points give laps of about 48 s and 39 s.
  - Lanes and spawn points for G8/G9 and G11/G12, which are 0.8 m apart today.
  - `start` on every route. None is set.
- **Define the phase when `start` is absent.** For example, `{idx 0, wait waits[0]}`.
- **Write the lane ask without ambiguity.** "G8 + G9 and G11 + G12 1.1 m apart (z 15.5-16.6 by GS2; 15.9 / 17.0)"
  reads as one band. It should say:
  - G8/G9 at z 15.5 / 16.6. The band left by GS2 at z 17.1 and the 0.5 m rule.
  - G11/G12 at z 15.9 / 17.0.
  - Move their spawn points with the lanes.
- **G1 + G2 at 0.7 m vs PB4's "1-1.5 m apart".** The conflict is inside Campaign's own PLAN: the guards table gives
  lanes z 8.0 / 8.7, and PB4 asks for 1-1.5 m. The geometry forces it. W1's north face (z 7.5) and the sack wall
  (z 9.2) leave a 1.7 m corridor, so the 0.5 m clearance rule allows at most 0.7 m. Campaign has two choices:
  - Relax the clearance on that wall (about 0.35 m gives 1.0 m).
  - Amend PB4 for K1.

  0.7 m is only 5 cm over the 0.65 m hard floor. Check the pair never trips the stall / squeeze (`SEPARATION.stall`).
- **Pan truncation from the turn rate.** At a lane end a guard leaves on a 140-180 deg turn: about 2.5-3 s at the
  60 deg/s calm rate, plus `turnAccel`. The 0.8 s slack does not cover that. He reaches the next pan stop about 2 s
  late, and the hold (cut at `leave`) cuts the right-hand sweep of a 3-4 s pan. A stop whose `faces` centre is 90 deg
  off the arrival heading (G4 at the door, G8/G9 at both ends) also starts with the body behind the pan.

  The order is the same every lap, but the "left, centre, right" is not always seen. Fix it in one of two ways:
  - Add a deterministic turn time per leg in `sweepPlan` (the angle from the last pan yaw to the leg heading, divided
    by the calm turn rate).
  - Start the pan cycle once the body is within a small angle of the centre.

  The walker tests use a stand-in with no turn rate, so they cannot see this. Add a real-class case in pianoGuards
  that asserts body yaw reaches both extremes at a lane end, lap after lap.
- **A short glimpse mid-leg can send a guard back to the stop behind him.** Rejoin goes to the nearest stop, so in the
  first half of a leg that is the stop he just left. Its next `leave` is almost a lap away (G3: about 70 s standing).
  It is explainable and deterministic, but may read as stuck.

  Consider choosing the stop with the smallest `wrap(leave[k] - now - dist_k / pace)`, ties the nearest: the soonest
  he can be back in step. That still "rejoins at the nearest point" in effect.
- **Rejoin should target pan stops only, or define a corner hold.** `panYaw` with cycle D = 0 (a corner) is undefined.
- **Set false.** Say what `sceneDark = false` does to sweeping walkers: off the sweep, or rely on the section unload.
  "Nothing changes off the scene" has to hold after S2 sets it false.
- **Assign the partner from both sides.** When the second partner of a pair is placed later (a far slot spawns
  late in `fill`), set `sweepMate` and the side on both guards.
- **Clocks on restart.** A restart resets the sweep clock, but not `world.lightning.t0`: the music and storm play on.
  The guards' relation to the flashes therefore differs from run 1. It is deterministic per input, but tell Campaign,
  since stretch 7 is "between flashes".
- **Torch pitch risk (section 6).** The cone's lower edge (0.16 + 0.34 rad) from a gallery eye height of about 5.65 m
  reaches the hall floor about 10 m out, inside the 13 m radius. So "do not reach the floor" is not quite right: they
  reach it far out, not below.
- **Two lines from the partner.** `sendTo` barks `checking`, then his rise to investigating barks `heard`. Keep one.
- **Line refs.** `flags.guardPairs` is at flags.ts:89, not :86. Others checked are right.
