# S8 module: squad roles, cover grid, seeded combat RNG (guard-ai, 2026-10-23)

Pure modules only (no Babylon / DOM), not wired in yet. Files:
- `src/ai/squadRoles.ts` - roles, behaviour profiles, cover scoring, `assignRoles`, seeded RNG.
- `src/ai/coverGrid.ts` - `CoverSet` (cover points as typed arrays) and `CoverGrid` (4 m buckets).
- `tests/squadRoles.test.ts` - 22 tests.

## API
- `Role` = `'none' | 'point' | 'overwatch' | 'flank' | 'reporter' | 'search'`; codes `R_NONE`..`R_SEARCH` (0-5),
  `ROLES[code]`.
- `BehaviourProfile` / `BEHAVIOUR` (design 7) with codes `P_STANDARD` 0, `P_AGGRESSIVE` 1, `P_POST` 2, `profileOf(code)`:

| field | standard | aggressive | post |
| --- | --- | --- | --- |
| advanceHold (s) | 2.5 | 0.8 | 4 |
| coverFirst (weight) | 0.85 | 0.3 | 0.9 |
| runToContact | no | yes | no |
| pointWeight / flankWeight / overwatchWeight | 1 / 1 / 1 | 2 / 2 / 1 | 0 / 0 / 2 |
| suppress / knowsLkp / neverCautious | yes / no / no | yes / yes / yes | yes / no / no |

  Added beyond design 7: `pointWeight`, `overwatchWeight` (role fill order by weight, never dice) and the `post` row.
- `CoverSet` (`x y z nx nz low`, plus run-time `owner: Int32Array` (-1 free, else the reserving guard's slot) and
  `block: Uint8Array`), `coverSetFrom(points)` (load time; `World.level.cover` fits `CoverPointLike` structurally;
  indices match `reserveCover`). `CoverGrid.fromSet(set)`: 4 m cells, `Int32Array` heads / next;
  `query(x, z, r, out: Int32Array): number` (inclusive radius, deterministic order, stops when `out` is full).
- `RoleInput(cap = 32)`: SoA `slot` (Int16, stable guard id `Enemy.num`), `x y z`, `seesTarget`, `inCover`, `profile`,
  `coverIdx` (cover held / heading for, -1); scalars `n`, `lkpX/Y/Z`, `targetCoverT`, `callerSlot`; refs `cover`, `grid`.
- `RoleOutput(cap = 32)`: `role`, `cover` (cover the role wants, -1), `moving` (may leave cover this tick), `run`;
  member indices `point`, `overwatch`, `flank`, `reporter`.
- `assignRoles(inp, out)`: no allocation, deterministic, member order irrelevant, ties to the lower slot.
- `scoreCover(cx, cy, cz, nx, nz, low, gx, gy, gz, lkpX, lkpY, lkpZ, role, reserved): number` (-Infinity unusable).
- `Rng` (mulberry32: `next()`, `range(a, b)`, `reseed(seed)`), `mulberry32(seed)`,
  `combatSeed(matchSeed, incidentId, guardKey)` = murmur3 fmix32 of `matchSeed ^ incidentId * 2654435761 ^ guardKey`.
- `SQUAD` constants, `FLANK_COS`, `roleReach(role)`, `squadScratch()` (tests).

## Rules and numbers (`SQUAD`)
- Order: reporter (= `callerSlot`), point, overwatch, flank, rest search. A group with an aggressive member fills
  reporter, point, flank, overwatch; inside each role the higher profile weight wins first (aggressive point / flank,
  post overwatch; post never point or flank).
- Point: nearest to the LKP (straight line) with a point cover; an aggressive guard may take point with none (runs).
- Overwatch: 1 per group (with or without cover), key: weight, has cover, sees target, cover score, slot.
- Flank: only in groups of >= 3 (`flankGroup`), needs a cover whose bearing from the LKP is >= 60 deg off the point's
  cover (or the point, or the group centre). No flank cover, no flanker.
- Cover score: unusable when reserved / blocked / taken this call, outside the band to the LKP (point 4-10, overwatch
  8-15, flank 5-14, reporter 10-20 m), normal . dirToLkp < 0.3, beyond reach from the guard (point 12, overwatch 15,
  flank 20, reporter 14 m), another storey (|dy| > 1.5 m from the guard; point and flank may also match the LKP's
  storey), or (point) not >= 2 m closer to the LKP than the guard. Score = 20 - dMe x 0.5 (reporter x 1) -
  |dT - band mid| x 0.5 + (dot - 0.3) x 2 (+0.5 low cover for overwatch); the cover he already holds +1.5 and skips the
  advance rule (a point in band holds).
- Moving mask: search always; reporter and overwatch until in their cover; point when it has a cover to bound to and
  the overwatch is set (in cover) or absent; flank when it has a cover to go to and the point holds; target in cover
  >= 4 s (`flankAfter`) -> flank first, point holds. Aggressive point / flank ignore these gates (both may move).
  `run` = moving and (heading for cover or `runToContact`).

## Tests (`npx vitest run tests/squadRoles.test.ts`: 22 passed; `npx tsc --noEmit`: clean; eslint on the 3 files: clean)
4-guard group with caller -> reporter / point / overwatch / flank on covers c3 / c0 / c1 / c2; 2-guard -> no flank;
3-guard -> flank; 5th searches; aggressive pair takes point and flank over a nearer standard guard; aggressive point
without cover runs, standard does not; post -> overwatch; flank bearing >= 60 deg and a closer 18 deg decoy refused;
overwatch band; reservations (other owner skipped, own kept, `block`); moving mask (point waits for overwatch, flank
goes while point holds, flank first after 4 s, aggressive both move, search walks); score bands, protect dot, storey,
reserved, advance gain; grid query = brute force over 600 points (6 queries, edge radius, full buffer, empty set);
determinism (repeat, reversed member order, tie to lower slot); seeded RNG repeatable, per guard, reseed, fixed
value; 10k calls on the same scratch and buffers.

## Integration (later step; nothing wired)
EnemyManager:
- Load: `coverSet = coverSetFrom(world.level.cover)`, `coverGrid = CoverGrid.fromSet(coverSet)`. Mirror
  `reserveCover` / `releaseCover` into `coverSet.owner[idx] = e.num` / `-1`.
- 2 Hz per engaged group (guards in combat / searching for one `contact` incident; the S2 board's incident): one
  reused `RoleInput` / `RoleOutput` pair per group (or one pair reused group by group), fill from the guards
  (`slot = e.num`, `coverIdx = e.coverIdx`, `inCover` = at his cover, `profile` from the S6 profile, `seesTarget = e.los`),
  `lkp*` = the group's shared LKP, `targetCoverT` = the target's `coverT`, `callerSlot` = the S5 radio caller (-1 none),
  then `assignRoles` and copy `role`, `cover`, `moving`, `run` onto each `Enemy`.
- Replaces `assignFlanker` (enemyManager.ts:840) and the `flanker` field / `isFlanker` (51, 202, 552, 1006); the
  `flankAfter` 4 s rule keeps e2e-wall 241-242 (flanker after 4 s) meaningful.
- Overwatch view: before acting on an overwatch cover, one LOS ray from it to the LKP (max 4 candidates per design);
  on a fail set `coverSet.block[idx] = 1` for a few seconds and re-run next tick.
Enemy.decide (combat branch, enemy.ts ~1400-1560):
- `pickCover` (1641) / `pickAdvance` (1606) become "go to `role.cover`" (still `reserveCover` + `findPath`; a failed
  path releases and blocks the cover). Point bounds with `profile.advanceHold` between bounds, only when `moving`.
  Flank uses the flank cover (the `flanks(t.cover, ...)` check can stay as an extra filter). Reporter stays crouched in
  cover while calling. Overwatch suppresses (`tryFire(..., 'suppress')`) while the point's `moving` is 1. Search keeps
  `searchSlot`. Speed: run only when `run` is 1 (else ADVANCE_PACE / walk). Peek-and-report (design 8: in cover, sees
  target > 12 m, not point -> peek 1-2 s, `reportSighting`, duck) is Enemy-side, not in this module.
- Per guard per incident: `this.rng.reseed(combatSeed(matchSeed, incidentId, this.num))` when he joins a contact
  incident (one `Rng` per Enemy, no allocation).
Math.random to replace with `this.rng` (enemy.ts, current line numbers):
- `rand()` helper 138, used at 190 (pauseT init), 283 (grenadeCd init), 1457 (attack <-> cover 2.5-4.5 s), 1462
  (strafeT), 1565 (grenadeCd), 1707 (burst length), 1713 (burst pause): make it `this.rng.range(a, b)`.
- 183 thinkT init, 196 strafe side, 877 hit -> seekCover 50%, 968 thinkT jitter, 1422 cover on contact
  (`< 0.85` -> `< profile.coverFirst`), 1463 strafe flip, 1522 blind fire 30%, 1735 `sampleSpread` (2 draws).
  (thinkT at 183 / 968 can be a fixed stagger by `num` instead: no randomness needed.)
enemyManager.ts (not combat, A7 says no randomness): 228 / 234 radio delays (S5 radio net replaces them with distance
order), 315 / 506 spawn / revive yaw (use a fixed yaw or the entry's), 894 radio-check jitter (fixed per section).

## Not done
Not wired into Enemy / EnemyManager; no e2e run (pure module). `post` profile numbers are a guess pending S6 / A10.
