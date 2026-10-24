status: done feature/guard-cap-m2 15e596f9

# guard-cap M2: guard-cap.mjs light buckets, `near` cell, alive count (Marlow Build, job guard-cap)

Lead: Night Shift | Marlow Build (desktop). Scripts only: no src change, no e2e, no GPU, no npm run check.

## Base and branch
- Base: `origin/feature/gm-flip` at 979a02b3. It is guard-models #318 + gm-perf already merged, and its
  `scripts/guard-cap.mjs` is byte-identical to gm-perf's, the gate this slice waits for. Building on it now means the
  lead only has to cherry-pick ONE commit onto master once gm-perf lands.
- New branch: `feature/guard-cap-m2` off 979a02b3. Exactly ONE commit, touching ONLY `scripts/guard-cap.mjs`. Do not
  merge or rebase anything else into it.

## The full brief
`docs/guard-cap/briefs/M2.md` on `origin/feature/guard-cap` (git show origin/feature/guard-cap:docs/guard-cap/briefs/M2.md).
Its file:line pointers are on gm-perf d729e490 = gm-flip 979a02b3, so they match your base. Build "Change" items 1-5
exactly as written there, and follow its "Must not". Summary:
1. Light buckets `light.body` (bodyLevel), `light.level` (levelAt), `light.dynamic` (dynamicAt), kept beside
   `light.totalAt`: same `wrap` on `g.world.lightField` (:241), and add each key to KEYS (:202), the CSV bucket list
   (:841) and the sim table (:973-980).
2. `near` cell (`--cells=...,near`, run last on the page): the K = min(N, 8) nearest guards are respawned 1.6-3.8 m from
   the player with pageSpawn's rules, facing him; record `nearIn4` (< 4 m, the literal commented as
   ANIM_TIER_NEAR_PLAYER, src/ai/animTier.ts:26); then measure(true). Skip the cell at N 0.
3. A header usage note: `--query=animtier=0` is the all-rigs-solve worst case (no code).
4. `alive` in each cell record; RESULTS rows show "N (alive M)" when M < N, plus a cell flag. Do NOT widen the spawn ring.
5. Header comment (:1-40) for all of the above.
Keep the existing cells, columns and their order; new columns go at the end of their group. Do not edit
scripts/guard-cap-coop.mjs.

## Checks you run
- `node --check scripts/guard-cap.mjs`.
- Grep that every page field / method you call exists on the base (lightField bodyLevel / levelAt / dynamicAt,
  em.spawn, em.despawn, the enemy fields you read). Name each with file:line in your report.
- No vitest, tsc, build or e2e: no unit test covers this script. The GPU smoke runs on the laptop after the gate.

## Done
Push `feature/guard-cap-m2`. Then add a report at the end of this file (what changed per item, hooks with file:line,
deviations) and set `status: done feature/guard-cap-m2 <sha>`. Marlow Build then runs a Sonnet checker and the laptop
smoke, and cherry-picks the commit onto `feature/guard-cap` after gm-perf merges.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
Branch `feature/guard-cap-m2`, ONE commit 15e596f9 off 979a02b3, touching only `scripts/guard-cap.mjs` (+132 / -12).

What changed, per item:
1. Light buckets: `light.body` (bodyLevel), `light.level` (levelAt), `light.dynamic` (dynamicAt), wrapped on
   `g.world.lightField` beside `light.totalAt`; added to KEYS, the CSV bucket list and the end of the RESULTS sim table
   (header, separator, row; the bucket footnote names the four). Not nested: bodyLevel and totalAt call the private
   `totalInto`, levelAt `levelInto`, dynamicAt `dynamicInto` (lightField.ts:176-243), so no read counts twice.
2. `near` cell (`pageNear`): runs after alert (last), only when `--cells` names it and N > 0. Despawns the K =
   min(alive, 8) guards nearest the player (horizontal), respawns them on walkable cells 1.6-3.8 m from him (rings at
   0.4 m steps, nav sight first then any; same storey within 1.5 m; 1.6 m from each other and from the guards that
   stay), `em.spawn(kind, pos, false, face)` facing him, `passive`, no patrol. Records `near: { k, despawned,
   candidates, respawned, inSight, nearIn4, alive }`; the literal 4 is commented as ANIM_TIER_NEAR_PLAYER
   (animTier.ts:26). Then `measure(true)`. Flag when respawned < K.
3. Header usage: `--query=animtier=0` = the all-rigs-solve worst case (`flags.animTier`, src/core/flags.ts:61,133). No code.
4. `alive` on every cell record (read with `pageAlive` at the cell's end, 10 s timeout, also after a failed cell);
   RESULTS sim / render / guard-render rows show "N (alive M)" when M < N; the cell gets the flag "alive M of N asked"
   (rec.flags, results.flags, logged). Spawn ring not widened.
5. Header comment: the near cell under the cell list, the light buckets, the alive note, the cells / `--query` usage.

Hooks on the base (gm-flip 979a02b3): `LightField.levelAt` src/world/lightField.ts:176, `dynamicAt` :207, `totalAt` :213,
`bodyLevel` :224 (seven parameters); `World.lightField` readonly src/world/world.ts:88; `EnemyManager.enemies`
src/ai/enemyManager.ts:125, `maxAlive` :127, `get alive` :1693, `despawn(e)` :1705, `spawn(kind, pos, alerted, yaw)`
:1864; `Enemy.pos` src/ai/enemy.ts:269, `get alive` :603, `passive` :921; `NavGrid.height` src/ai/navGrid.ts:158,
`center` :405, `nearestWalkable(x, z, maxRing, y)` :528, `lineClear(a, b, ya, yb)` :566; `ANIM_TIER_NEAR_PLAYER = 4`
src/ai/animTier.ts:26.

Deviations (all small, undo by deleting the lines):
- The shared `wrap` now forwards seven arguments, not five: `bodyLevel(x, feetY, z, height, occluded, hx, hz)` would
  otherwise lose the head offset while measuring (a light parity change under the wrapper). Extra trailing undefined
  arguments are a no-op for the other wrapped methods.
- Extra fields: `nearIn4End` (guards within 4 m at the near cell's end), and CSV columns at the end of the spawn group
  after `mean_dist_m`: `cell_alive`, `near_k`, `near_respawned`, `near_in_4`, `near_in_4_end` (the existing `alive`
  column stays the spawn-time count). RESULTS gets one "Near cell, N ..." line per near cell before the pass list.
- The near cell restores nothing (as briefed): after an alert cell the N - K guards that stay remain alerted.
- REPORT.md's table keeps plain N (the brief named RESULTS rows); its flag count includes the alive flag.

Checks: `node --check scripts/guard-cap.mjs` OK. Not linted (eslint ignores `scripts/**/*.mjs`). A node harness ran
`resultsMd` / `resultsCsv` on a mock near cell (alive 10 of 12): sim table 23 header / 23 row columns, CSV 134 / 134,
"12 (alive 10)" labels, the near line and the new columns filled. No vitest / tsc / e2e (script only); the GPU smoke is
pending the laptop.
