status: open

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
