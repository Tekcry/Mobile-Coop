# Piano GA6b (sweep wiring + the PLAN's GA7) - report
Owner: Night Shift | Guard AI Build. Status: current. Builder: Opus 5.5, 2026-10-26.

Branch `feature/guard-ai-piano-sweep`. Code head `b4294fe45`; this report is the commit after it. Spec:
`PIANO-GA6-PLAN.md` section 4 GA6b, with section 8 (F1, N2, N4, N5, N6) over sections 2-5. GA6a is in
`PIANO-GA6A-REPORT.md`. Done.

## Commits
- `61ae16dd7` pan lead on a long hold. An early arrival looks at the centre until `leave - D`, then does one full cycle.
  A rejoin hold pans whole cycles. This is GA6a open item 1.
- `f622ae8b8` wiring: the `sceneDark` accessor, sweep clock, `sweepify`, watch-only sweep pairs, sweep pace, body-yaw
  gate, partner skip and the GA7 glimpse follow.
- `94bdf9075` WIP tests (the lead's account-save checkpoint; green).
- `b4294fe45` final tests, the `ai.md` "Scene sweep" section and the changelog fragment.

## Files (lines added / removed against 6634a71b0)
| File | +/- |
| --- | --- |
| `src/ai/enemy.ts` | +83 / -7 |
| `src/ai/enemyManager.ts` | +141 / -6 |
| `src/ai/patrol.ts` | +27 / -12 |
| `docs/systems/ai.md` | +26 |
| `changes/feature-guard-ai-piano-sweep.md` (new) | +5 |
| `tests/pianoGuards.test.ts` | +489 |
| `tests/guardAiAllocManager.test.ts` | +140 / -1 |
| `tests/patrolSweep.test.ts` | +43 / -2 |
| `tests/helpers/sweepGuard.ts` (new) | +178 |

Totals: code about 250 lines, tests about 850. The plan estimated ~420; the extra is the real-class harness and the
section 8 cases. Changelog: `changes/feature-guard-ai-piano.md` (#603) is on this branch. This PR carries both files
until #603 merges; this slice has its own file.

## What was built
- **`EnemyManager.sceneDark`** is now a get / set accessor with the same API.
  - **Set true acts on every set**, not only on a change: the EMP and each restart.
    - The sweep clock (`sweepClock`) goes to 0. It ticks in `update` while dark.
    - Talking pairs are cleared, along with their holds.
    - Every guard in `enemies` is put on his sweep (`sweepify`).
  - **Set false (N4):**
    - Every guard is taken off his sweep: `Enemy.stopSweep`, which calls `clearSweep` and then `rejoin` as built.
    - The partner skip is cleared.
    - The watch-only pairs and the follow buffer are cleared.
- **`placeSlot`:** while dark, `sweepify` runs instead of `buildPair`. Off the scene `buildPair` runs as before.
- **`sweepify(e, index)`:**
  - The partner comes from the `pair` tag, either way round (as `buildPair` finds it).
  - The lower slot pans left first (+1) and the partner right first (-1).
  - **N5:** `sweepMate` and the side are set on both guards. An earlier-placed partner whose side changes is swept
    again at the same clock.
  - **F1:** the pair gets a watch-only `PairMeet`, with a window that never opens (open = close = 0) and `watch: true`.
    `TalkPair.watchOnly` marks it.
  - Dogs are not swept.
  - The follow buffer entry is set to his `riseN`.
- **GA7 `glimpseFollow`** runs at the board tick while dark.
  - Trigger: a guard whose `riseN` moved with `RISE_SIGHT`, and who is suspicious or investigating.
  - It sends his partner if the partner is up, unaware or cooldown, and within `PAIRS.togetherR` (4 m). The send is
    `Enemy.followGlimpse(stimX, stimZ)`: a calm `sendTo(x, z, -1, true)`.
  - **N6:** the partner's following suspicious / investigating rise does not bark (`quietRise`). His one line is
    `checking`.
  - `followSeen` is an `Int32Array` per slot, sized in `placeSlot` at section load.
- **`Enemy`:**
  - `startSweep(clock, side)` builds the plan once (cached; `setPatrol` drops the cache). It calls `setSweep` with
    `plan.phase + clock`, and calls `rejoin` if he is not on the start stop.
  - Other new members: `stopSweep`, `sweeping`, `followGlimpse`, `sweepMate`, `sweepSide`.
  - **Calm pace:** on the sweep he walks at `min(SCENE_SWEEP.pace, walkSpeed)`. A calm investigation on the sweep uses
    the same pace; a rush and the search pace stay as built.
  - **Body yaw:** on the sweep `walker.step` gets the body yaw (`motion.yaw`, the N2 gate). Off the sweep the
    three-argument call is unchanged.
  - **Partner skip:** `steerFrom(..., sweepMate)` while he sweeps calm (unaware or cooldown).
  - **Revive:** a woken guard keeps the plan, side and partner (`inherit`). `swapSlot` points the partner at him.
- **Walker (`patrol.ts` `swPan`):** a hold longer than D now looks at the pan start first.
  - Schedule stop: the centre until `leave - D`, then one full left-centre-right cycle ending at `leave`.
  - Rejoin catch-up hold: only until whole cycles end at `leave`. He keeps panning while he waits.
  - A shorter hold is still cut at `leave`.

## How the scene uses it (what Campaign must call)
1. `em.sceneDark = true` at the EMP, before the spawn. S2's `spawnBeat` already does this: dark, then `w.spawn()`, then
   the search. Guards placed later in `fill` are swept as they are placed.
2. `em.sceneDark = true` again at each restart, before the respawn. The sweep clock restarts at 0, so every run has the
   same lap timing. Guards still standing are re-swept. The setter acts on every set, so leaving it true in between is
   fine.
3. `em.blackoutSearchSlots(slots, x, z)` as before. When the search ends, each guard rejoins his sweep on his own (the
   calm return calls `rejoin`).
4. `em.sceneDark = false` when the scene ends. Everyone goes off the sweep and back to his authored route rules.
   Talking pairs come back at the next section load (A3).
5. Nothing else in code. The data asks stand as plan section 8 "To Campaign" lists them:
   - `pair` both ways on G1/G2, G4/G5, G8/G9 and G11/G12.
   - Per-point `waits` (0 at corners); `faces` for off-heading centres; `start` on every route.
   - No `loop`.
   - Two points on one spot for posts.
   - Tune lap lengths with `sweepPeriod`.

## Tests
- `tests/pianoGuards.test.ts`: 22 cases. The 7 existing ones still pass; their stand-ins gained a walker and post,
  because set true now sweeps them. 15 are new, on the real class (calm decision, motion driver walk, spacing, level
  side effects):
  - **Off the scene:** placement is not swept, the pace is as built, and a timed-loop pair stays a talking pair.
  - **Pace:** 0.7 m/s capped at his walk. A calm investigation also walks at 0.7; a rush and the search pace are as
    built; off the sweep the investigate pace is as built.
  - **Pan stops drive the face:** left, then right.
  - **N2, 5 laps on a 6 m lane:**
    - The body yaw reaches both extremes at every hold: right +0.70; left -0.66 to -0.67, tolerance 0.05.
    - Every departure is within 2 steps of `leave`.
  - **Post:** it face-pans 8 s each way and never walks.
  - **Set true:** the clock goes to 0, everyone is swept, the talking pair is cleared, and partners and sides are set
    both ways.
  - **N5:** both placement orders give the same partners and sides; no talking pair, no skip.
  - **Restart:** a re-set gives the same clock.
  - **F1:**
    - One of a pair taken alone: `missing` is reported after 3 s (not at 2.8 s), and the partner makes the call.
    - Both taken 1.3 s apart: nothing.
    - Off the scene: no pair, so nothing.
  - **N4:** set true then false matches a never-swept walker step for step for 60 s, and the watch pairs are gone.
  - **Blackout search then calm:** `blackoutSearchSlots`, then a calm return. The guard rejoins at `rejoinStop` and
    after 2 laps is within 0.3 m of an undisturbed twin.
  - **Opposite pans:** a pair pans opposite ways.
  - **Partner skip:**
    - Partners on lanes 0.7 m apart keep the gap: it stays under 0.75 m, whereas non-partners are pushed past 0.85 m.
    - They are never under 0.65 m, including on a converging lane.
  - **GA7, one guard:** he faces the spot when suspicious, investigates at 0.7, goes alert when seen again (the machine
    as built), and when not seen goes cooldown and rejoins the sweep.
  - **GA7, the partner:**
    - Within 4 m the partner follows with exactly one line (N6). He is not sent twice for the same rise, and a later rise
      of his own barks as built.
    - 6 m away, a sound rise, or a busy partner: nobody is sent.
- `tests/guardAiAllocManager.test.ts`: 7 cases (3 new):
  - **600 steps of 4 sweeping guards** (pans, walk, partner skip, a follow, a rejoin) per round: at most
    4 x 3 `HEAP_NUMBER` per step. The reading is 160 B; the walker off the scene reads 96 B in the same harness.
  - **The partner skip plus the follow:** at most one `HEAP_NUMBER`.
  - **The sweep calm decision:** at most 3 `HEAP_NUMBER`.
  - No objects anywhere (A7).
- `tests/patrolSweep.test.ts`: 18 cases (1 new).
  - The pan case now also checks that each finished hold ends on the far extreme. An early hold looks at the centre
    until `leave - D`, then does one cycle.
  - New: a rejoin hold longer than 2 D pans more than once and ends on the far extreme.
- **Runs:**
  - `npm run typecheck:fast` is clean.
  - `npx vitest run` on pianoGuards, guardAiAllocManager, sceneSweep, patrolSweep, pairs, pairsWiring, sweep,
    replayDeterminism, awarenessWiring, guardAiAlloc, guardSpacing and postsWiring: 12 files, 205 passed, 1 todo.
  - docLint and changesFragments: 27 passed.
  - eslint on the changed files is clean.
  - No e2e: the scene end to end is Campaign's `e2e-piano` (S4).

## Assumptions (GA6b-A entries)
- **GA6b-A1 Long holds.** A schedule hold over D does one cycle after looking at the centre (the brief). A rejoin hold
  pans whole cycles ending at `leave`, keeping plan section 2's "hold there, panning". Undo: in `swPan` use `rem - D`
  for both (one cycle), or the wrap for both.
- **GA6b-A2 Investigate pace gate.** The pace is gated on `walker.sweeping` (= dark and swept) rather than a read of
  `ctx.sceneDark`. This is the same on the scene; a dog is never swept. Undo: read `ctx.sceneDark` in the
  investigating branch.
- **GA6b-A3 Talking pairs after set false.** Set false does not rebuild the talking pairs that set true cleared; the
  next section load builds them as built. Undo: call `buildPair` for each placed slot in `sceneDarkOff`.
- **GA6b-A4 Who is swept.** A dog is not swept (it heels its handler). A guard outside the slot list is swept with no
  partner, side +1. Undo: drop the `dog` check in `sweepify`.
- **GA6b-A5 Partner "calm".** The follow requires the partner up, unaware or cooldown, and not held. A cautious partner
  still follows; this is not `pairCalm`. Undo: use `pairCalm`.
- **GA6b-A6 Follow tick.** The glimpse follow runs in the coordinated board tick only. The scene is coordinated (Sector
  Ops). Undo: move the call out of the `coordinated` block.
- **GA6b-A7 Allocation.** Boxed doubles (V8 HeapNumbers across calls it does not inline) are allowed, as
  `guardAiAlloc`'s `HEAP_NUMBER` bounds allow. No object, closure or array is made per step. The GA6a walker's sweep
  step boxes about 2.5 doubles per guard step against 1.5 for the walker off the scene. Undo: inline `swNow` and the
  pan math in `sweepStep` (GA6a code) if a strict 0 is wanted.
- **GA6b-A8 N5 side change.** When a partner placed earlier must change side, he is swept again (`startSweep` at the
  same clock, then the soonest-stop rejoin) rather than given a side setter. This keeps GA6a's walker API. Undo: add
  `PatrolWalker.setSide`.
- **GA6b-A9 Watch pair id.** The watch pair's id is section x 100 + the lower slot (as `buildPair`), period 1, with a
  window that never opens. Undo: n/a, internal.
- **GA6b-A10 Revive.** A woken guard keeps his sweep plan, side and partner, and his partner's skip points at him.
  Undo: drop the three lines in `inherit` and the one in `swapSlot`.
- **GA6b-A11 Test helper.** The real-class tests share `tests/helpers/sweepGuard.ts`, a new file outside the plan's
  claims, used by both test files. Undo: inline it.

## Open items
- **Early arrivals: the guard stands looking ahead.**
  - The real turn is faster than the N2 turn time. On a 6 m lane he arrives about 3.65 s early at each end: the hold is
    6.65 s for D = 3. He looks at the centre for about 3.65 s, then pans once.
  - This is deterministic and the same every lap. If it reads as stuck on the walk, calibrate `sweepTurnTime` to the
    motion driver's stepped turn (`sceneSweep.ts`, GA6a code). Lap lengths then shrink, so Campaign re-tunes waits with
    `sweepPeriod`.
- **Left extreme.** The body reaches 0.66-0.67 of the 0.70 rad left extreme: it lags at the D/4 reversal. The right
  extreme is held at 0.70.
- **`update` path not driven by tests.** The sweep clock tick in `update` and the follow call at the board tick are not
  driven through `em.update`; the tests call the parts. Campaign's S4 e2e runs them end to end.
- **`pairStep` boxing.** `pairStep` boxes 2 doubles per call: existing `fillPair` / `PairMeet` code, also on the watch
  pairs.
- **`MotionDriver.step` allocation.** It reads 80 B per call in the stand-in harness. This is outside GA6 and is not in
  the new bounds, but is worth a look by the allocation job.
- **Shared files.** `enemy.ts` and `enemyManager.ts` are shared with GA4 (GuardActor): rebase before merge.
- **Plan section 8 notes to Campaign still stand:**
  - G1/G2 at 0.7 m vs PB4.
  - The restart resets the sweep clock but not `world.lightning.t0`.
  - The gallery torches reach the hall floor only about 10 m out.
