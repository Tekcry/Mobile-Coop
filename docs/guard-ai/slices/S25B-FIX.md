# S25b fix round (Opus implementer, 2026-10-23)

Branch feature/guard-ai-s25, from 73038a40. Inputs: S25B-CHECK-A.md (PASS, polish), S25B-CHECK-B.md (FAIL B1, e2e
retune, drafted 'search area' scenario), S25.md (origin/feature/guard-ai).

## Merge
- `0ee5f812` the two check reports committed.
- `702d60d7` merge of origin/feature/guard-ai-s24 (7fe4f6a2, S24 fix round + re-checks). `enemy.ts` auto-merged; 2
  trivial conflicts in `src/ai/enemyManager.ts`, both sides kept: the field block after `alarmHunt` (S25 plan fields +
  S24 `contactHunt`) and `clear()` (S25 plan reset loop + `this.contactHunt = -1`). tsc clean.

## Blocker B1: the cover query dropped the north side
- `src/ai/coverGrid.ts:146` new `CoverGrid.queryNearest(x, z, r, out, d2)`: the up to `out.length` NEAREST points in
  `r`, a max-heap on squared distance in the caller's `Float64Array` scratch. No allocation; `query` unchanged (squad
  roles still use it).
- `src/ai/enemyManager.ts:114` `PLAN_COVER` 128 -> 1024 (campus max 913 within 20 m, all storeys; Marlow max 252),
  `:186` the distance scratch made once, `:2806` `buildPlan` uses `queryNearest`. So every map today gets all cover in
  R, and a denser one keeps the nearest, never one side. `PLAN_CAND` follows (1024 + 441).
- Cost: up to ~1000 x (`nearestWalkable` ring 2 + `levelAt`) per build, at most once per intruder per 2 s while
  someone searches for him (check B estimate +0.3 ms per build).

## Polish done (each a real wrong-behaviour case)
- A1 stale plan centre (`enemyManager.ts:2724`): `searchPointFor` hands out plan points only when the plan's centre is
  within `PLAN_MOVE` (1 m) of his intruder's current last known position; else false (the ring round the new one).
  With it (`:2781`), a moved centre rebuilds at once even with claims live (check A polish 1 / check B polish 3): the
  claims are found by guard (`finishBy`), so an old holder's `searchDone` finds nothing and his next ask gets the new
  plan. Round the same centre the "no rebuild under a live claim" rule stays.
- A2 response team (`:2753`): `planSweep` frees the claim of a member whose team is sweeping (`e.crew?.sweeping`).
- A3 `resetMemory`: already covered: `resetMemory` -> `despawnAll` -> `clear`, whose S25 loop resets every plan
  (check A missed that path). Comment at `:1726`, now tested.
- S24 recheck A polish 1 (`:753`): an alarm raised by a guard with no intruder takes `contactHunt` only while
  `intruders.valid[contactHunt]`; a forgotten one gives -1 (bind on the next contact).
- Check A/B polish 8: `plans` built from `MAX_INTRUDERS` (`:178`), not a 4-entry literal.
- `:377` `readonly searchAreaTable = SEARCH_AREA` (as `missingTable`): the e2e reads the plan's numbers from the game.

## Tests
`tests/searchAreaWiring.test.ts` +7 (10 -> 17; the manager helper takes options: other cover, open floor, other light):
- `:473` `queryNearest` = brute-force nearest (Float32 positions), every point when there is room.
- `:494` 1662 cover points, > 1024 within R, both sides of the LKP; the old `query` with 128 misses the dark cover 6 m
  north (asserted), the plan hands it out first; plan points both north and south.
- `:513` A1: LKP moved 5.4 m, field stale -> null (ring), plan centre unchanged; field rebuilt -> plan round the new
  position though a claim was live; the old claimant's `searchDone` is harmless, his next point is the new plan's.
- `:537` A2, `:552` A3 (`resetMemory` empties every plan), `:563` plans length = `MAX_INTRUDERS`, `:569` contactHunt
  validity (valid -> alarmHunt 0, forgotten -> -1).

Run: `npx tsc --noEmit -p .` exit 0; eslint on `src/ai/coverGrid.ts`, `src/ai/enemyManager.ts`,
`tests/searchAreaWiring.test.ts` clean; vitest searchArea, searchAreaWiring, bodySearch, urgency, sweep, twoIntruders,
responseWiring, squadWiring, radioWiring, alarmCall, intruders, squadRoles: 12 files, 163 / 163 pass. No full suite,
no e2e (laptop shared).

## e2e (scripts/e2e-stealth-ai.mjs, `node --check` ok, NOT run)
- 'lkp' (`:496-521`): hide spot (-2, -15) -> (0, -20) (35 m by path behind the z = -18 wall row, per check B), the
  wallhack probe follows, the asserts print where he hid and where the guard ended.
- New 'search area' (`:551`), three runs, each seeded, sim-time steps, the spot picked in the browser from the game's
  data (`flowOf(hunt)`, `lightField.levelAt`, `coverSet`, `em.searchAreaTable`):
  - near: the plan-best dark spot (cover or dark cell) 5-7.5 m by path and >= 3 m straight from the LKP; crouched,
    light 0. Asserts: detected + hunting, own chase field, plan built, a plan point within 3 m, a searcher within
    1.5 m (or finds him) within 20 s of the search start, no homing before the search.
  - wall: a cell 4-9 m straight (nearest 6 m) and > `max` + 3 m by path (finite). Asserts: no plan point within 3 m,
    no searcher within 4 m in 20 s, no searcher farther than R + 1 m by path.
  - three: grunts at (0, 5), (+-1.5, 5); player hidden at (0, -20). Asserts: one intruder, plan >= 3 points, each
    takes a plan point, first points >= 3 m apart.
  Failure messages print the hide spot, the LKP, every plan built (centre, R, points with scores), each guard's
  claims, levels and positions.
- `docs/systems/testing-tools.md` lists the scenario; `docs/systems/ai.md` S25 paragraph updated.

## Risk to watch on the laptop
- 'near' 20 s: a dark spot ranked below the first 2-3 plan points may need longer (point 0 look 3 s + walk + look per
  point). Check B's note stands: dark cover up to ~15 m outranks a dark non-cover cell at 6 m. The pick prefers what
  the plan itself ranks best, so it should be point 1 or 2; if the assert fails, the printed plan shows the rank.
- 'wall' needs such a room within 9 m of (-0.5, 0) on the warehouse (check B measured the pocket west of the x = -4
  wall, ~(-9, 1), path ~26 m); if none, it fails with "no spot ...".

## Polish left (not done)
- Check B P2: a rebuild at R cap re-offers the same top 12, so a search gets 12 plan points then the ring.
- Check B P4: plan points carry no height (`nearestWalkable` without y in `Enemy.decide`): storeys on campus.
- Check B P5/P6: every searcher still looks 3 s at the LKP; a dark cell at the LKP can become point 1.
- Check A 5 / B 7: a clamped point (hold room, high-security leash) is finished as searched.
- Check B P2 (radius wording): R is 20 m for every combat search (lostSight 12 s); docs still say "time since seen".
- Check A 8/9, B 9: doc lines and a per-point claimant ref.
