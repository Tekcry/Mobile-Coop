# S25b check B (behaviour vs CT, co-op, cost, e2e) - fresh Opus checker, 2026-10-23

Verdict: FAIL (one blocker, small fix: the cover cap in `buildPlan`)

Scope: `git diff 96d565e5..73038a40 -- src tests docs TESTING.md changes` on feature/guard-ai-s25 (head 73038a40),
against `docs/guard-ai/slices/S25.md` (origin/feature/guard-ai), the builder report in briefs/guard-ai-S25b.md
(origin/cloud-queue) and `docs/guard-ai/research/ct-behaviour.md` rule 9 / goal 8. Checker A covers claims and plan
correctness; this check covers behaviour, co-op, cost and e2e.

## Blocker

**B1. The cover candidates come only from the south part of the area on both co-op maps** -
`src/ai/enemyManager.ts:113` (`PLAN_COVER = 128`) with `:2775` (`this.coverGrid.query(cx, cz, r, this.planCover)`).
`CoverGrid.query` (`src/ai/coverGrid.ts:117-136`) walks cells row by row from the lowest z and stops when `out` is full.
Cover points are every 1.7 m along every collidable face (`coverPointsFromSegments`, `src/cover/coverData.ts:223-240`),
so R = 20 m holds far more than 128. And R is always the cap at the first build: a combat search starts only after
`ALERT.lostSight` = 12 s (`src/ai/alertState.ts:27`), so `areaRadius` is 6 + 1.5 x 12 = 24 m, capped to 20.

Measured on the built maps (scratch vitest: `LevelBuilder` + `buildCoverSegments` + the real `CoverGrid`, R 20, the
128 cap):

| Map | Cover points within 20 m: median / p90 / max | Centres where the query is full | Cover 4-8 m north (+z) of a full centre that is kept |
| --- | --- | --- | --- |
| Marlow Yard `ctcourse` | 207 / 225 / 252 | 127 of 137 | 44% |
| Sector Ops `campusOps` | 460 / 734 / 913 | 630 of 771 | **3%** |
| warehouse (e2e-stealth-ai) | 250 / 332 / 362 | 98% | - |

The cover bonus (`wCover` 0.6) is worth 15 m of path at R 20 (`wNear` 0.8 / R). So dark cover to the south, up to about
15 m away, outranks every dark spot to the north that is not cover. A player who hides in a dark corner 6 m north of
where he was seen is not "checked early". It is checked only after the southern cover runs out, and because the query
is deterministic, the 12-point plan never reaches it (see P2). Hiding north of your last seen spot is always safer, which
breaks the slice's "done looks like" and can be exploited. The unit test misses it because its stub has 3 cover points.

Fix (small, no new design): size the scratch for the worst case, e.g. `PLAN_COVER = 1024` (campus max 913 at R 20, all
storeys counted) with `PLAN_CAND` following, and add a wiring test with more than 128 cover points on both sides of the
LKP: the north dark cover 6 m away is still in the plan. Cost: up to ~1000 x (`nearestWalkable` ring 2 + `levelAt`) per
build, at most once per intruder per 2 s, only while someone searches for him. That is fine. If the lead wants it
cheaper, use a nearest-first query instead (r / 2, then r, keeping the remainder of the cap), or keep only the best cover
per lattice cell. Either way, no query may silently drop one side of the area.

## Behaviour vs CT and the brief (otherwise as asked)
- Calm searches (body, device, call, pair, lure) never ask the plan: the gate at `src/ai/enemy.ts:2375`
  (`combatSearch && !searchOwn && hunt >= 0`). Unit test (e) confirms it. With `enabled = false` the ring is exactly
  today's (g).
- No search behind a wall first: candidates need flow `<= R` by path (`:2783`, `:2798`); a wall cell is Infinity. Holds
  on the real nav (the warehouse path grid below shows the 8.5 m straight / 26 m path pocket west of the LKP).
- Three searchers, three spots: `take` claims one point per guard; `planSweep` (`:2717-2728`) frees the claims of guards
  who are gone, down, out of the search or switched intruder. This is correct.
- Light: `lightField.levelAt` at floor + 0.9 m against `LIGHT.shadow` (the meter's threshold). It reads the static field
  with lamps on / off / destroyed and doors (`src/world/lightField.ts:233-281`), the same field perception's `totalAt`
  builds on. No preset, LOD or governor read. Torches are excluded by A153 (accepted). Light parity holds.
- CT rule 9 ("searching guards ... flashlights and flares, sometimes thrown into dark areas"): dark spots first matches
  it. The arrival facing is the walk's, so the look and the torch go into the spot. Flares stay Michael's question.

## Co-op
- One plan per intruder slot (`plans[slot]`), centre = `intruders.x/z[slot]`, field = that slot's chase field, checked
  current (`:2751-2753`). The host runs the AI, the client poses from snapshots. No `src/net`, `PROTOCOL_VERSION` or
  save change in the diff. This is correct.
- Joiners with `hunt = -1` (S24 check A FAIL, still open) fall to the ring. When S24's fix lands they get plans with no
  S25 change.

## Cost (Marlow Yard / Sector Ops, ~24 guards)
- Per update: `planSweep` = 4 plans x n (<= 12) x one linear `byNum` (<= ~32) per claimed point. Worst ~1.5k compares;
  typically 2-3 claims x 24. No allocation.
- `buildPlan` is not per frame. It is called only from `searchPointFor`, when a guard picks his next point (at most every
  `searchLook` 3 s per guard). It returns early when the plan is not due, a claim is live, or the field is stale. A full
  build: 1 cover query (<= 128 today) x (`nearestWalkable` ring 2 + `levelAt`), <= 441 lattice cells x (`cellOf` + flow
  read + `levelAt`), a shell sort of <= 569, <= 569 offers x <= 12 `hyp2`. That is about 0.1-0.3 ms (estimate). Worst
  case per frame: one build per intruder slot (2 in co-op) if both come due on the same frame. No round robin is needed
  at this size. With B1's 1024 cap, add about +0.3 ms per build (estimate). Still fine at <= 1 per intruder per 2 s.
- Allocation: all scratch (`planCover`, `cand*`, `candOrder`, `done*`) is made once. `orderByScore` sorts in place.
  Index loops only, `hyp2` / `hyp3` only, no closures in the hot path. This is correct.

## Polish (not blocking)
1. **P2 - a rebuild never adds new points while R is at its cap (always, see B1).** `buildPlan` re-offers the same
   candidates with the same scores, so the same top 12 come back and are all re-marked done (`:2812-2820`). The plan
   gives exactly 12 points per sighting, then the ring for the rest of the 60 s. Fix: skip candidates within `spacing`
   of a done point before `offer` (not after), so a rebuild brings the next 12.
2. **The area radius never varies for a combat search.** `seenT` is >= 12 s (`lostSight`) at the first build, so R = 20
   every time. The "time since seen" wording in `changes/feature-guard-ai-s25.md`, `TESTING.md:58-60` and ai.md does not
   happen in play. Either measure from the start of the search, or say "within 20 m by path".
3. A moved centre (> 1 m, a new noise or location report) waits for every claim to end before the plan follows
   (`:2747`). Meanwhile point 0 and the ring follow the new LKP. A centre move could reset regardless of claims; the
   searchers' `finishBy` then finds nothing, which is harmless.
4. Plan points carry no height. `Enemy.decide` snaps with `nearestWalkable(x, z, 4)` and no y (`src/ai/enemy.ts:2380`),
   which picks the lowest storey. On campus storeys a point on the LKP's floor can send the searcher to the floor below.
   This existed before with the ring, but the plan now measures its path on the LKP's storey. Carry `y` and pass it.
5. Every searcher still walks to the LKP and looks 3 s (point 0) before taking plan points. Three searchers spend about
   10 s on one spot. Only the first one there needs to.
6. A dark lattice cell right at the LKP (seen at the edge of a shadow) scores ~1.0 and becomes point 1, which re-looks at
   point 0. Pre-mark candidates within `spacing` of the centre as done.
7. A `hold` room or high-security leash clamp (`src/ai/enemy.ts:2389-2395`) moves the spot, yet the plan point is
   finished as `reached`. Harmless, but such a guard could skip `searchPoint` entirely.
8. `plans` is a 4-element literal (`:176`), not built from `MAX_INTRUDERS` (= 4 today).
9. `planSweep` could keep the claimant's `Enemy` ref per point instead of the `byNum` scan.

## e2e: what changes by design (with the retune)
- **e2e-stealth-ai 'lkp'** (`scripts/e2e-stealth-ai.mjs:473-536`): the hide spot `t.tp(-2, -15, 0)` (`:498`) is in the
  plan's reach. Measured with `tests/helpers/runtimeNav.ts` on the warehouse (doors open, cell 0.5) from the LKP
  (-0.5, 0): (-2, -16) 19 m, (-2, -14) 18 m. The builder measured 19.5 m. That is under `SEARCH_AREA.max` + 3 = 23 m,
  and from 25 s on the 50 x `t.step(1)` let the plan send a searcher there: an end in `alert` fails
  `r.end === 'cooldown'` (`:535`).
  Retune: hide at **(0, -20)** (path 35 m, behind the wall row at z = -18, straight 20 m), or (-8, -20) (path 27 m).
  Update the wallhack probe `Math.hypot(e.pos.x + 2, e.pos.z + 15)` (`:517`) to the new spot and the comment (`:496`).
  Check in the browser once that the spot is out of the guard's view.
- **e2e-sectorops 'every section, ghost' (`:57-155`) and 'alarm and no ghost' (`:158-170`)**: no change. The Ghost run
  is never seen, so there is no combat search, and the alarm block asserts hunting / kills only.
- **e2e-sectorops S6 (`~:3236-3327`) and S13 (`:3335-3425`)**: no change expected. Both set `em.lkp` / `em.lkpValid`
  directly (`:3270-3271`, `:3360-3361`), which makes no intruder slot, so `hunt` stays -1 and the plan is never asked.
  The player sits 40 m off in light 0 anyway (> R). Their asserts are on levels and the sweep timer (60 s), and the plan
  does not change either.
- **e2e-tactics** (Proving Grounds: crouch volumes, suppression, footstep investigation) and **e2e-stealth** (movement /
  camera): no combat search is asserted. No change. The builder's mention is a precaution only.
- e2e-coop / e2e-ctcourse: no assert reads intruders or search points (grep), so a regression run is enough.

## Drafted scenario for the lead: e2e-stealth-ai 'search area (guard-ai S25)'
Warehouse, Clear mode, `em.coordinated = true`, sim-time steps, `Math.random` seeded (4242) as in 'lkp'. The spots are
picked in the browser from the game's own data, so the scenario does not depend on hand-measured light. From the
warehouse path grid (LKP (-0.5, 0)): the 6 m band includes the west bay through the gap at z = -5, e.g. (-6, -1) /
(-5, -1) (path 6-7 m, straight 5.5 m), and open floor (1, -5) (path 6 m). The behind-the-wall pocket west of the x = -4
wall, e.g. (-9, 1), has path ~26 m and straight 8.5 m.

Run A, the near dark spot:
1. `t.reset()`, `t.light(1)`, `em.alarmRaised = true`. Spawn a grunt at (0, 5, PI) and `t.tp(-0.5, 0, 0)`. Step 1/60
   until `e.alerted && em.sightT < 0.1` (as 'lkp'). Read the LKP `L = em.lkpOf(0)`. Step a few frames so the slot field
   is built (`em.flowOf(0)` is not the shared field).
2. Pick the hide spot: over the walkable nav cells, path `p = em.flowOf(0)[c] * nav.cell` in [5, 7.5] m, baked light
   `g.world.lightField.levelAt(x, nav.cellHeight(c) + 0.9, z) < 0.28`, the darkest first (tie: the nearer path). Assert
   one exists ("no dark spot 5-7.5 m by path from the LKP").
3. `t.light(0)`, `t.crouch(true)`, `t.tp(hx, hz, 0)`. The other guards are passive. Step 0.05 s up to 60 s of sim
   time. Record `tS` (first frame `e.level === 'searching'`), the closest approach to (hx, hz) after `tS` with its time,
   and whether `e.level` returns to `alert` with `e.sinceSeen < 1` (found: allowed).
4. Asserts:
   - `em.stealth && e.hunt === 0`, and `em.plans[0].builtAt >= 0 && em.plans[0].n > 0` once he searches (the wiring is
     live in play).
   - A plan point is within 3 m of (hx, hz) (this needs B1's fix to hold for spots north of the LKP).
   - The searcher comes within 1.5 m of (hx, hz), or finds him, within 20 s of `tS`. The brief's 20 s counts from the
     search start: `lostSight` alone is 12 s before searching.
   - Before `tS` he never homes in on the hidden player: no frame in `alert` with `sinceSeen > 1` within 2 m of the
     spot (the 'lkp' wallhack check).

Run B, behind the wall:
1. Same sighting.
2. Pick a cell with straight distance <= 9 m from L and path > `SEARCH_AREA.max` + 3 m (in the warehouse, the pocket
   west of the x = -4 wall, ~(-9, 1)). It may be dark or lit. Assert one exists.
3. Hide there crouched, light 0, and step 20 s past `tS`.
4. Asserts: no plan point within 3 m of the spot (every `em.plans[0]` point has path <= R); the searcher never comes
   within 4 m of the spot; his own path from L (`flowOf(0)` at his cell) never exceeds R + 1 m. That is "no searcher
   goes past the wall's doorway" without hard-coding the doorway.

Optional run C, three searchers: spawn 3 grunts at (0, 5), (1.5, 5), (-1.5, 5) and make the same sighting. Hide the
player 30 m away. Once all three are `onPlan`, assert `em.plans[0].claimOf(num)` gives three different indices, and the
three spots are >= 3 m apart.

## What I ran
- `npx tsc --noEmit -p .`: exit 0.
- `npx vitest run tests/searchArea.test.ts tests/searchAreaWiring.test.ts`: 2 files, 28 / 28 pass.
- Scratch measurements (outside the repo, `C:\Users\Micha\AppData\Local\Temp\claude\C--NightShift\5ef06bb0-a28c-4191-be52-1b6d8adca36c\scratchpad\cov\`, vitest
  with its own config, nothing added to the repo): cover density per map (`cov.test.ts`), the 128-cap truncation and
  north-side loss (`bias.test.ts`), warehouse path distances from the 'lkp' LKP on the runtime nav (`wh.test.ts`).
- No full suite, no e2e (the laptop is shared). No src or tests edited, nothing committed.
