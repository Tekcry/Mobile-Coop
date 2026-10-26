# guard-rules S6 check B
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker B: Opus 5.5 (fresh, independent of checker A), 2026-10-25. Head 69664ef8e (feature/guard-rules-s6), diff
`452e23035..69664ef8e` (5 files: `src/ai/pairs.ts`, `src/ai/enemyManager.ts`, `tests/pairs.test.ts`,
`tests/pairsWiring.test.ts`, `scripts/e2e-sectorops.mjs`, all owned by the brief). Focus: the e2e script, test integrity,
determinism, co-op. Read: S6-BRIEF, the full diff, and the code it leans on (`PairMeet`, `buildPair` / `placeSlot` /
`pairStep` / `pairMissing` / `missingCall`, `Enemy.pairCalm` / `knockOut` / the calm-branch pair hold / `postPoint`,
`PatrolWalker.post`, `bodies.ts`, `perception.fieldFactor`, the e2e `run` helper).

Ran: `node --check scripts/e2e-sectorops.mjs` OK; `npx vitest run tests/pairs.test.ts tests/pairsWiring.test.ts
tests/squadWiring.test.ts tests/responseWiring.test.ts tests/gearWiring.test.ts` 5 files, 112 tests green;
`npm run typecheck:fast` clean. e2e not run (laptop queue).

## What I verified
- (a)/(b) unchanged: the only edit is the lane finder moved verbatim into module-level `pairLanes(G, o)`; the call
  passes the same `S[0].obj`. The block still runs on `PARAMS` (flag off). Flag off in `src`: the skip branch tests
  `flags.guardPairs` first (no `postDef` / `postPoint` read, same message), and timed-loop defs get `watch: false`, so
  `PairMeet.step` skips `watch()`: today's path.
- Timing claims, checked in code: `bodyNotice` returns 1 for `dist < BODY.close` (2.5 m) before any field-of-view test
  (`src/ai/bodies.ts:34`), so at the brief's 1.2 m a knocked-out partner is found by the body path, not the pair check.
  3.4 m is out of that and inside `togetherR` 4; both knock-outs are behind the other's back (angle about 2.8 rad and
  pi, `periphHalf` 100 deg; a post glance adds at most 0.6 rad). The manager steps pairs with a fixed `PAIRS.tick`
  (`enemyManager.ts:3804-3808`), and `watch()` adds a whole 0.2 s on the first step that sees the partner gone however
  soon after the knock-out that step comes; 15 steps reach 3.0 in floating point (0.2 x 15 = 3.0000000000000004), so
  the request lands 2.8-3.0 s after the knock-out, read at the end of the 0.1 s chunk. 2.75-4.0 s is right and has
  slack for a frame of pair-step jitter.
- Determinism: each part runs knock-out, stepping and reads inside one `page.evaluate` (synchronous, so the
  `bgTick` wall-clock driver cannot step between them); every loop is bounded (500, 300, 80 steps); every assert prints
  its values. No `Math.random`, `Date` or `performance` in the new `src` (G143); `Math.hypot` only in page code.
- Separate pages: `run` launches a fresh browser per call and closes it, so `&guardpairs=1` and part (c)'s section
  caution (`missingCall` -> alert log) cannot leak into (d) or later blocks. The second page (brief: one) is justified by
  that caution: a cautious guard is not `pairCalm` and would not talk.
- Suite cost: two extra launches plus about 10 s (c) and 12 s (d) of headless sim on two guards: acceptable.
- `placeSlot` with a new slot list clears `pairs` (`enemyManager.ts:2155`), so `em.pairs[0]` is the stand-in pair even
  if map pairs were built at load with the flag on; skips and misses are read as deltas.
- (d) post yaw: a guard with no route stands his post through `PatrolWalker.post` (`patrol.ts:160-172`), so after the
  talk he turns back to the spawn yaw; the 0.7 rad tolerance covers the 0.6 rad glance.
- `tests/pairsWiring.test.ts` live-map case: two timed loops still go through `pickMeet` exactly as before; the only
  newly accepted shape is two route-less guards within `meetMax` (their spawn point is the post point, `enemy.ts:651`);
  every other shape fails with the ids. Not weakened. New cases fail on plausible bugs: `watch` not passed (case 6: no
  request, the window is closed), posted path not built or wrong clock (case 2: no lines in 12 s), flag leaking into the
  flag-off path (cases 1, 5). Flag restored in `afterEach`.
- Co-op / wire: nothing in `src/net` references pairs (`protocol.ts:617` is unrelated scanner pairs); pairs are built in
  host `placeSlot` and stepped in host `EnemyManager.update`; lines go out through `sayLine -> onBark` as today; posted
  guards' hold and turn are ordinary guard motion in existing snapshots. No `PROTOCOL_VERSION` need.

## Blocking
None.

## Polish
1. `scripts/e2e-sectorops.mjs:3028`: "calm throughout the talk" reads the levels once, at `backT`. Sample the worst level
   in the loop (as the text says), or reword to "calm after the talk".
2. `scripts/e2e-sectorops.mjs:3029`: when `backT < 0` the message does not say why; add the pair state at the end
   (`interrupted` vs never `done`) so a failure is diagnosable from the log alone.
3. `tests/pairsWiring.test.ts:273`: runtime also accepts a post with an untimed route as one side of a posted pair
   (S6-a), the live-map case fails it. Fine for today's data; name that shape in the message or accept it with the same
   `meetMax` check when map data first uses it.
4. Brief / ai.md: the brief's 1.2 m posted spacing for (d) cannot show the pair check (body path under 2.5 m). Worth one
   ai.md line: a posted pair under `BODY.close` apart finds a downed partner as a body at once; 2.5-4 m it is the 3 s
   pair check; 4-6 m the window's `grace` (S6-b).
5. `tests/pairsWiring.test.ts:703`: the `notice - 0.05` lower bound holds because the test's `sim` calls `each` right
   before the pair step (the take and the first counting step coincide). Deterministic, but `notice - PAIRS.tick` would
   say what the code guarantees.
