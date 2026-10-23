# S23 Every player is seen - fresh checker A (correctness and solo parity)

Verdict: PASS

Checked: branch `feature/guard-ai-s23` at a87ef34c (base 41204e30), `git diff 41204e30..HEAD -- src tests`, against the
brief `docs/guard-ai/slices/S23.md` (read from `C:/NightShift/Mobile-Coop-guard-ai`; it is not in this worktree) and
the build report `S23-build.md`. Lens: brief compliance, solo parity, `mayBeSeen` exactness, hot path, co-op targeting.

## Blocking findings
None.

## Brief compliance
- Goal: calm pick = highest rate (`src/ai/targetPick.ts:54`), combat sticky on `cur` while `los[cur]`, then the nearest
  with los, then `hunt` / `cur` / the nearest. Dead players `Infinity`, never picked. `MAX_INTRUDERS` 4 bounds the loop
  (`src/ai/enemy.ts:1908`); `MAX_PLAYERS` is also 4. `cur` is an identity scan; the host's remote refs are stable
  objects (`src/net/coopHost.ts:108`, `:186`), so sticky really works in co-op.
- Files: only `targetPick.ts` (new), `enemy.ts` (perceive, `seesIndex`, `targetDist`), `enemyManager.ts`
  `assignFlanker` (`:2668`), the one `gameState.ts` line (`:2585`), tests and docs. No `src/net`, `src/security`, perception
  numbers, protocol or save change.
- Allocation: module-level typed scratch (`enemy.ts:69-81`), one reused `P_SIGHT`, `mayBeSeen` uses a module
  `rangeOut`, index `for` loops only (the old `for..of` iterator is gone), `players()` is the reused `aiRefs` array.
  `hyp2` in the new code, no `Math.hypot` in any changed file. `import type` respected; tsc and eslint clean.
- Deviations from the brief, all justified: `Float64Array` instead of `Float32Array` (exact solo numbers); `seesIndex`
  bit = exposure > 0 (same test as `inSight`, so solo arcs keep their rule); `mayBeSeen` mirrors the behind factor
  (exact rather than merely conservative); `nearestTarget` added; pitch recomputed in the tail (same value).
- Tests a-e present and meaningful (see below).

## `mayBeSeen` vs `sightRate > 0`
Exact on geometry, conservative on everything else. `sightRate` (`src/ai/perception.ts:157`) is > 0 only if
`exposure > 0` and either the field term (`field > 0 && dist < range`; `df`, stance and the pitch floor are all > 0) or the
close term (`dist < closeRange && speed > 0.15 && behind > 0`, `behind > 0` iff `field > 0 || motion > 0.8`).
`mayBeSeen` (`targetPick.ts:26`) is exactly that disjunction with the same `d`, `angle`, `speed` the guard then feeds to
`sightRate`. It ignores light, exposure and sensitivity, so it can only say "yes" too often (rays cast, rate 0), never
"no" too often. Alerted guards and dogs always pass. Instant detect needs `|angle| <= focusHalf` and `dist < 1.6`, so it
is inside `mayBeSeen` too. No false negatives.

## Solo parity
With one player `pickTarget` and `near` both return 0, so target, dist, rate, meter, smelled, stimulus, instant detect
and `reportSighting` are identical. The only change is the brief's own ray skip: for a calm guard (unaware, suspicious,
investigating, searching, cooldown) and a player outside his field and not felt close by, `los`, `losHead`,
`lastKnown`, `lastSeenT`, `losT` and `sight.exposure` are no longer set from a line he could not perceive. Every reader
traced:
- Host arcs (`gameState.ts:2585`): a calm guard turned away (or a player past 25 m / 12 m) with a draining meter no
  longer shows an arc unless within `ARC_NEAR` 2.5 m. Arguably matches the comment's own rule ("only enemies that can see
  the player"). e2e-stealth-ai `light` / `walls` arc assertions are in view or through walls: unaffected.
- `entryStep` (`enemy.ts:1407`, searching responder): no longer drops his run-in route on a line to a player behind him.
- `spotted` (`enemy.ts:1663`, `:1668`): only on an alert with no sighting (sight alerts imply `mayBeSeen` on that
  think); old code could credit `spotted` from a line behind the guard.
- `nextCaller` (`enemyManager.ts:709`, searching guards after a fight): a guard facing away now counts as out of sight
  ("hide and report"), as intended.
- `losT` (`enemy.ts:1877`) feeds the aim settle (`:2982`): a guard alerted without seeing the player (radio, shout) who
  had a clear line behind him no longer starts with a settled aim; he settles over `reaction` like any first sighting.
- `lastSeenT` / `lastKnown`: read only in combat (suppress, grenade, overwatch, face); the first alerted think casts rays
  again, so the difference is at most one think (~0.25 s) after a non-sight alert.
- `torchRule` reads `los` only at level `alert` (`archetypes.ts:158`): unaffected. `targetLight` is recomputed in the
  tail when skipped: unchanged.
All of these remove "eyes in the back of the head" cases and favour the player slightly; none is a regression a player
would notice as wrong. Listed under Polish for the lead to accept as part of A143.

`assignFlanker` now reads the distance from the last think instead of a live distance: same metric in solo, up to
~0.3 s stale; only a near-tie between two guards could pick a different flanker. Not noticeable.

Case (d) is a real parity test: `oldPerceive` in `tests/coopPerception.test.ts` is an independent copy of the pre-S23
perceive built from the unchanged helpers (`losClear`, `sightRate`, `smellRate`, `instantDetect`), not from the new
code. 280 cases (alerted, dog, turned, light-field read; hidden chest / head / all; close and far spots). It uses the
new `mayBeSeen` only to decide when los / lastKnown are not compared (the documented skip); target, dist, rate, meter,
smelled and stimulus are compared for every case.

## Co-op
- Two players: (a) hidden nearer A, lit B at 9 m: target B, `seesIndex(1)` only. (b) combat on B, A walks in hidden to
  1.5 m: B kept, los true, only B reported; B hides and A shows: switches to A. (c) both visible: B's rate, not a sum.
  (e) calm guard: 0 rays for the player 15 m behind, 3 for B; alerted: 2.
- Dead players skipped (`P_DIST` Infinity, `live()`), all dead -> null target, `dist` Infinity, as before.
- `seesIndex(0)` is the host's own player (`playerRefsInto` pushes `localRef` first); the client (`puppet`) draws no arcs.

## Polish (non-blocking)
1. The solo deltas above (arc for a turned-away calm guard, responder route end, `spotted` on a non-sight alert,
   caller pick, first-shot settle after a non-sight alert): record them in A143 so a later "solo changed" report is not
   a surprise; watch e2e-stealth-ai / e2e-stealth arcs in the regression run.
2. `docs/guard-ai/slices/S23.md` is cited by `docs/systems/ai.md` but missing from this worktree; the brief's
   `docs/systems/coop.md` and `TESTING.md` lines are not written (the other agent's docs work may cover them).
3. `losT` is not reset when a combat guard switches target (B lost, A seen): the first shots at A use B's settle. It
   was the same before with the nearest switch; with sticky targeting it can now happen mid-fight in co-op.
4. `pickTarget`'s signature takes `Float64Array` where the brief said `Float32Array`; S24's brief should say Float64.
5. `TARGETS` is `as const`, but the tests mutate it through a cast; fine for an undo switch, but an S24 test that forgets
   `afterEach` would leak state.

## What I ran (laptop, one at a time)
- Waited for `C:/NightShift/scratch/s23-npmci.log`: `exit 0` already present.
- `timeout 600 npx tsc --noEmit -p .`: exit 0.
- `timeout 600 npx vitest run tests/targetPick.test.ts tests/coopPerception.test.ts tests/perception.test.ts
  tests/awarenessWiring.test.ts tests/squadWiring.test.ts tests/coopGuardAi.test.ts tests/hearing.test.ts`: 7 files,
  114 tests passed.
- `timeout 600 npx eslint src/ai/targetPick.ts src/ai/enemy.ts src/ai/enemyManager.ts src/game/gameState.ts
  tests/targetPick.test.ts tests/coopPerception.test.ts`: exit 0, no findings.
- Not run: e2e, `npm run check` (as instructed).
