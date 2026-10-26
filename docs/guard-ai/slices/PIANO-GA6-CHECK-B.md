# Piano GA6 check B (head 89f13ef1c)
Owner: Night Shift | Guard AI Build. Status: current. Checker B (performance, allocation, robustness, test strength):
Opus 5.5, 2026-10-26. Scope: `git diff e772cb25d...HEAD` (GA6a + GA6b). Spec: `PIANO-GA6-PLAN.md`, section 8 over 2-5.

**PASS**

## Runs
- `npm run typecheck:fast`: clean.
- `npx vitest run` on pianoGuards, guardAiAllocManager, guardAiAlloc, patrolSweep, sceneSweep, guardSpacing and
  postsWiring: 7 files, 108 passed.
- `ALLOC_TRACE=1` on the three new alloc cases: run 3 times in sequence and 6 times in parallel (6x CPU load). Every run
  passed.
- Probes of my own (scratchpad only, nothing committed): `bytesPerCall` and the V8 sampling heap profiler
  (`HeapProfiler.startSampling` at 32-64 B, minor-GC objects included) on the real-class harness.

## 1. Allocation
| Path | Reading | Verdict |
| --- | --- | --- |
| 4 sweeping guards per step (walker sweep step, swPan / panYaw, steerFrom with skip, glimpseFollow at 5 Hz, one rejoin) | 161.5 B per step, about 40 B per guard (bound 192) | Boxed doubles. One 48 B object per step would read 209 B and fail the bound. |
| `steerFrom` with skip + `glimpseFollow` | 16 B (bound 16) | One boxed double. |
| `calmDecide` on the sweep, walking | `bytesPerCall` 48 B (off the scene 0 B); profiler 0 B | No object: the 48 B is call-boundary boxing in the harness. |
| `calmDecide` on the sweep, holding (pan) | `bytesPerCall` 64 B; profiler 16.3 B per call | One HeapNumber: `face` on the `number \| null` Goal field, as at a plain patrol stop. |
| `pairStep` with 2 watch-only pairs | 32 B per call; profiler: all of it in `PairMeet.step` | 1 HeapNumber per pair. This is existing PairMeet code and talking pairs pay it too. |
| `sweepify`, `sweepPlan`, `startSweep`, the `sceneDark` setter | Allocate (PairMeet, Float64Arrays, splice) | Placement and the EMP only, as specified. |
| `rejoinStop`, `nearestStop`, `wrapTime`, `wrapAng`, `panYaw`, `facePanYaw` | Number maths only | Clean. |

The GA6b-A7 claim (HeapNumber only, no object, closure or array per step) holds. The bounds sit within the repo's
existing ones: `guardAiAlloc`'s bite step allows 4 `HEAP_NUMBER`, and the sweep step boxes about 2.5 per guard against
1.5 off the scene.

## 2. Robustness (traced through the code)
- **Zero-length legs:** heading is NaN, so the leg is skipped. A one-spot face pan uses `from`.
- **NaN points:** every stop reads as "arrived". `rejoinStop` falls back to `nearestStop`, which picks 0. No hang.
- **No pan stop on the route:**
  - `sweepStep` passes every corner. Its loop is bounded at n + 1, so it cannot spin.
  - `rejoinStop` falls back to the nearest stop, with no catch-up hold (see Polish 5).
- **One-point route:** one stop, wait as authored, centre the post yaw, period = the wait. A wait of 0 gives period 1e-3:
  he stands on the point and the loop exits.
- **Period 0 and `wrapTime(t, 0)`:**
  - `period` is at least 1e-3.
  - `panYaw` and `facePanYaw` return early when D <= 0.
  - Holds happen only at stops with wait > 0, so `wrapTime` never sees p = 0.
- **Guards with no slot, dogs and revived guards:**
  - No slot: index -1, no partner, side +1.
  - Dog: not swept, and never anyone's partner.
  - Revive: `inherit` copies the plan, side and partner. `walker.tick(downFor)` keeps his clock in step, then he
    rejoins. `swapSlot` re-points the partner and the follow entry.
  - `Enemy.update` ticks the walker for every live guard, held ones included, so walker clocks track `sweepClock`.
- **`sceneDark = true` twice in one tick:** the clock restarts and the pairs are cleared and rebuilt. Each guard gets
  `startSweep` in its own loop pass, all on one clock. Covered by the restart test.
- **`sceneDark = false` mid-search:** `stopSweep` clears the sweep and `quietRise`, and the walker rejoins its route
  rules. The investigate pace falls back to the built pace because it is gated on `walker.sweeping`.
- **Section load:**
  - `placeSlot` clears `slotGuard` and the pairs (as built) and grows `followSeen` with `tagSquad`.
  - `glimpseFollow` reads up to `min(slotGuard, followSeen)`, so an index past the buffer is skipped, never read out of
    bounds.
  - sectorMode passes the section's `gs`, so G13-G16 extras are within `slots.length`.
- **Clock growth:** `sweepClock` and `walker.clock` are unwrapped doubles. At 24 h (86400 s) the ulp is about 1e-11 s,
  which does not matter.
- **`quietRise`:** a calm `sendTo` sets `heard`. The alert machine then takes him unaware, suspicious, investigating, and
  the flag clears on the first rise that is not to suspicious. Alert and contact lines are never hushed.

## 3. Test strength
Each of these would fail if its rule broke:
- **Pan order:** the side +1 / -1 index order in patrolSweep and pianoGuards.
- **Lap timing:** the legs are worked out by hand in sceneSweep, plus departures within one step of `leave` over 5 laps
  in patrolSweep.
- **Rejoin pick:** the "not the stop he just left" and the tie cases in sceneSweep.
- **Pair side:** the opposite-pans case checks both partners.
- **Partner skip:** non-partners must be pushed past 0.85 m, and the 0.65 m floor must hold.
- **Watch-only pair:** F1 alone, F1 within `DUAL_WINDOW`, and the window-never-opens assert.
- **GA7 one-line rule:** a single `checking`, no re-send, and his own later rise barks.
- **Off-scene equivalence:** off-scene placement and pace, and N4 step for step for 60 s against a twin.

The real-class harness (`tests/helpers/sweepGuard.ts`) runs the real `calmDecide`, `move` (MotionDriver, steering,
spacing), `onLevel`, `startSweep`, `followGlimpse` and `sendTo`. Only nav `goTo` is stubbed (a straight line).

## Polish (no change needed to merge)
1. **The calm-decision alloc case depends on test order** (`tests/guardAiAllocManager.test.ts:196-214`).
   - Run alone, it reads 48 B from round 0.
   - In file order it reads 192 B (calmDecide not yet at Turbofan) for rounds 0-26 or 0-27, then 48 B at round 27-28 of
     40. This is deterministic, including under 6x load.
   - Its bound (3 `HEAP_NUMBER` = 48 B) equals the reading, so there is no margin.
   - Fix: a longer `warm` (for example 30000), or measure `walker.step` directly. Without one, a case added above it, or
     a V8 bump, could push it past 40 rounds.
2. **`EnemyManager.clear()` keeps `darkOn` and `sweepClock`.**
   - On a restart that re-places guards before setting `sceneDark` again, they are swept on the old clock until the
     re-set fixes it.
   - The report's contract (set true at each restart, before the respawn) covers this. Campaign should hold to it, or
     `clear()` could reset the clock.
3. **GA7 "seen again -> alert" is tautological** (`tests/pianoGuards.test.ts`, the lit-sighting case). It steps a fresh
   `AlertMachine`, not the swept guard, so it tests the machine as built.
4. **The pianoGuards rejoin asserts compare `walker.idx` to `rejoinStop` itself.** Those cases are wiring-only; the pick
   is proven in sceneSweep.
5. **A route with no pan stop never resyncs after a rejoin.** A pair on such routes would drift apart for good. All
   scene routes have pan stops: GA5 should check this.
6. **`swPanE` advances per `step` call, not on the clock.**
   - When calm steps are skipped mid-hold (hearTurn, lure, pair hold), the pan phase lags.
   - The hold still ends at `leave`, but may not end on the far extreme.
   - Fix if wanted: derive the cycle from `swHoldEnd - now`.
7. **A NaN in `waits` makes `period` NaN**, because `Math.max(1e-3, NaN)` is NaN. He then walks without holds. This is a
   data error only.
8. **The `sweepClock` tick in `update` and the board-tick follow call are not driven through `em.update`** (the builder
   notes this). They are one line each; S4's e2e covers them.

## 4. Hard rules
- No `Math.hypot`, `Math.random`, `Date.now` or `performance.now` added.
- No `src/net` change.
- Babylon comes in only through `src/core/babylon` (the test helper).
- The `sceneSweep` / `patrol` cycle is type-only one way (`import type`).
- typecheck is clean under strict TS.

## Compared with the builder reports
- GA6b's alloc figures match mine: 160 B per 4-guard step, and boxed doubles only. So do its open items: early
  arrivals, the left extreme at 0.66-0.67, `pairStep` boxing, and the untested `update` path.
- The report does not mention Polish 1 (order-dependent tier-up), 2, 5 or 6.
