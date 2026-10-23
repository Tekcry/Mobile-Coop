# S10 check - talking pairs (fresh checker, 2026-10-23)

Scope: `git diff 6c214068..b8104ecf` (S10 on S5b), read against `slices/S10.md`, `slices/S10-module.md`, PLAN row S10,
BRIEF A32-A34, `research/tactics-design.md` (pair notes).

## Verdict: PASS (one fix made, below)

The wiring does what the slice says in play. One definite bug was found on a path the game does not hit today but the
new e2e block does (a pair slot placed again kept its stale meeting clock). Fixed in this round, with a unit test. Without
the fix the e2e block's part (b) would fail on every run.

## Findings

1. **Fixed - a re-placed pair kept its old clock** (`src/ai/enemyManager.ts:1003` `buildPair`, old dedupe loop). When
   both slots of a built pair were placed again with new guards from the same slot list (`placeSlot`, `slots ===
   tagSlots`), `buildPair` returned on "pair exists" and kept the old `PairMeet`, whose clock had run on the guards
   that went. New walkers start at their own loop time, so the window opened at the wrong loop time. The game does not
   hit it today (section unload and checkpoint restart go through `despawnAll -> clear`, which empties `pairs`). The
   e2e block does: it calls `em.despawn` per guard between (a) and (b) and places (b) on the same `slots` array. (b)
   reused the (a) pair with its clock ~25 s ahead, so the missing request came ~15 s late and the timing assert failed.
   Fix: the old pair is dropped and built afresh from the walkers as they stand now (`enemyManager.ts:1018-1029`). Also
   no hold is left on a guard who is out of a pair: `placeSlot` clears `pairFace` on the guard a slot held before
   (`:974`), and on every guard of the old list when a new section list comes in (`:962-966`). Without that, a guard
   left holding a stale `pairFace` would stand at his meet point for good (`Enemy.calmDecide`, `enemy.ts:1578`). Test:
   `tests/pairsWiring.test.ts` "(S10 check fix) both slots placed again with new guards (same list): the pair is built
   afresh on their clocks". It fails on the old code (`not.toBe(old)`, and no lines in the first window).
2. **Fixed - e2e timing bound too tight** (`scripts/e2e-sectorops.mjs:2179`). The pair clock steps 0.2 s at a time
   and can lead the walkers by up to one step (the first `pairStep` after the build adds a full tick). The grace also
   counts from the step the window opens. So the request lands 5.6 to 6.0 s after `open`, read at 0.1 s steps. The old
   lower bound (`open + 6 - 0.15`) failed about half the phases. It is now `- 0.45` (upper bound unchanged).
3. Correctness, checked and OK:
   - Meet and clocks: `pickMeet` + `pairWindow`, with the walkers' `loopTime()` read at the second placement. The walker
     clock ticks every step whatever the guard does (`Enemy.update` -> `walker.tick`, also while held), and over a
     knockout (`inherit` -> `walker.tick(downFor)`). So the pair clock and the walkers stay in step through
     investigations, holds and wakes. The sim is fixed at 60 Hz, so the 0.2 s accumulator does not drift.
   - Face, lines, split: faces from `PairMeet.face`. The hold branch keeps stepping the walker and returns a reused goal
     object. Two lines go through `Enemy.sayLine` -> `onBark(e, line, false)`. The talk ends on the linger timer
     (6.7 s), so it is always bounded.
   - Disturbance: noise (`turnT`), lure, sight above leak, alert or caution, a camera body, an incident (a body, a light
     check). Each sets `!pairCalm` or `disturbed`, and the next pair step (<= 0.2 s) goes to `interrupted` and writes
     NaN to both `pairFace`. Their normal reactions run because the hold is only inside the calm patrol branch.
   - Partner who never comes (down, held, despawned): `present` is false, so after `grace` a single `requested` edge
     sends one `missing` incident and the state stays `missing`, so it never repeats. When both are present again (a
     woken guard in his slot via `swapSlot`, or a held guard let go), `reset()` runs. A dead partner leaves the pair
     `missing` for good, with no hold on the survivor.
   - Nothing freezes for good. The hold is bounded by the talk timer or an interrupt. The walker's timed pause is bounded
     by `leave`. The grace is 6 s. With fix 1, no guard can keep a `pairFace` once out of a pair. Section unload and
     restart clear everything (`clear`).
   - Revive / inherit: `inherit` keeps `pairSlot` and the walker (the same clock). `swapSlot` puts the new guard in the
     slot. The new `Enemy` starts with `pairFace` NaN. Despawn nulls the slot.
   - Co-op: every bit of pair state lives in `EnemyManager` on the host. The client sees the facing through pose sync.
     No wire change. Barks are not sent to the client (an existing gap, noted in the slice).
4. Hot paths: `pairStep`, `fillPair`, `pairHold`, the hold branch in `calmDecide`, `disturbed` and `pairCalm` allocate
   nothing (no closures, iterators or temporary vectors). They use `hyp2`. `Math.hypot` appears only in the e2e page
   code. The allocations in `buildPair` (route spreads, `new PairMeet`) and `pickMeet` run at load time only.

## Polish list (not blocking)

- `pickMeet` tie rule (`pairs.ts:188`): a candidate up to `meetTie` farther but longer replaces the best, and
  `out.d` moves up with it. Chained near-ties can drift past the nearest pair by more than 0.05 m. This is harmless
  with the current data. Keep the nearest `d` separately if it matters.
- The window is worked out from straight-line distance at `walkSpeed`. A guard whose A* path is longer arrives later,
  which shortens the window in play (`meetR` 1.5 m gives some slack). Fine for the car-park pair.
- `pairMissing` adds a held (alive) partner to `silent` (`enemyManager.ts:1138`). If he is let go and knocked out
  later, radio checks never miss him (silent is cleared only on wake or despawn). Only add him when `!gone.alive`, or
  delete him from `silent` on `reset()`.
- `pairMissing` reports at `goer.pos.y`. A partner's route point on another storey would get the wrong floor.
  Harmless on flat routes.
- Disturbance while `waiting` cancels the whole window (by design). A guard who glances at a sound before the meeting
  skips that loop's talk.
- Known open items, confirmed still open and not broken: pair lines have no earshot range (the bark layer has none),
  `PairDef.lines` has no `SectorGuard` field yet (agree with Course Ready), and a later merge renames S5b's
  `Enemy.role` to `job` (S10 does not read `role`).

## e2e flake risks ("talking pairs (guard-ai S10)", part 1; never run)

- (Fixed) (b) reused the stale (a) pair, which failed deterministically: finding 1.
- (Fixed) Request timing lower bound: finding 2.
- Site search (`:2078`) takes the nearest cell to section 1's objective with three clear nav lines. Nav-clear does not
  rule out props, doors or a slope at the far end. If it finds none, `site.at` is null and the assert fails with a
  message, not a crash.
- (b) needs A2 not to witness or hear B2's knockout. B2 is 3.4 m behind A2 (about 159 degrees off his facing, outside
  the body field), so this is low risk. If A2 noticed, `misses` would be 0 and the check would fail. `lastWitnesses`
  is logged but not asserted. Asserting it is 0 would make that failure obvious.
- The two lanes are 1.2 m apart. Guard separation, if it pushes, can move a guard off his stop. `atA` takes the minimum
  over samples, so this is tolerant.
- `Enemy.thinkT` starts at `Math.random() * 0.25` (not seeded), so arrival and turn timing jitter by about 0.3 s.
  The asserts have more slack than that (`met < 18`, `face < 0.35` as a minimum over samples).
- Sim time, not wall time: every wait is `stepHeadless` inside one `page.evaluate`, about 75 s of sim (about 4500 fixed
  steps). On a loaded desktop that one call can take tens of seconds, so watch for a protocol timeout.
- The radio check is disabled with `em.radioT = 1e9` and not restored. Each `run` opens a fresh browser, so it does not
  leak into the next block.

## Checks run

- `npx tsc --noEmit -p .`: clean, before and after the fix.
- `npx eslint src/ai/enemy.ts src/ai/enemyManager.ts src/ai/pairs.ts src/ai/patrol.ts tests/pairsWiring.test.ts`:
  clean. The e2e script is ignored by the eslint config, so it got `node --check` instead: OK.
- `npx vitest run tests/pairs.test.ts tests/pairsWiring.test.ts tests/sectorGuardTags.test.ts`: before the fix 3 files,
  48 passed. After the fix 3 files, 49 passed (the new test). There is no `tests/patrol*.test.ts` file. The walker is
  covered through `pairs.test` and `pairsWiring.test`.
- Not run (per the lead's order): full `npm run check`, full vitest, any e2e.
