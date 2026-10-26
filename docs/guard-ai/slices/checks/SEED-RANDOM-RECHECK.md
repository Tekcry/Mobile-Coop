# guard-ai seed-random: fix re-check
Owner: Guard AI Build. Status: current.

Re-checker (Opus 5.5), head e0c238825, diff 9fac601ad..e0c238825 (the vision-detect pin from check B finding 1, and the
fragment wording from check A P2). Read-only review; `node --check scripts/e2e-stealth-ai.mjs` OK,
`npx vitest run tests/changesFragments.test.ts` 1/1 passed. No e2e run.

Verdict: PASS

## Findings

1. The pin makes the three runs think on the same frames. `scripts/e2e-stealth-ai.mjs:228-229` reseeds `senseRng` to
   12345 and sets `thinkT = 0` right after `t.spawn` (`em.spawn`, `src/ai/enemyManager.ts:2017-2031`, never steps the
   guard), so no think has run yet. `Rng` (`src/ai/squadRoles.ts:652-671`) is pure state in `s`: `reseed` fully resets
   it. The first `update` thinks at once (`src/ai/enemy.ts:2404-2407`, `thinkT` <= 0), then every interval is
   `0.22 + senseRng.next() * 0.08` from the same stream in all three runs. `senseRng` is the only draw the think
   cadence makes (`src/ai/enemy.ts:386, 428, 2406`).

2. Nothing else in the detection path differs between the runs before first detection. `t.reset` calls `em.clear()`
   (`scripts/e2e-stealth-ai.mjs:68`), so the spawned grunt is the only guard (no other guard's cadence or radio jitter
   can reach him). The other `num`-keyed state is unchanged by this slice and was already per-run at master:
   - combat `rng` (`src/ai/enemy.ts:382`): its draws before detection are field initialisers only (`pauseT`, `strafe`,
     `grenadeCd`, :443, :449, :638), read in combat; `rng.next` at :2277 / :2298 / :3327 is gated on attack or alert.
   - `look` comes from the spawn position (`posLook`, `enemyManager.ts:2023`), not `num`; `key` from `freeKey` after
     a clear, the same each run.
   - `PatrolWalker` glance timer (`src/ai/patrol.ts:72`, `PATROL.glanceEvery` 14): the first glance is at least 4.2 s
     after spawn. The window is 0.4 s + at most 4.0 s, so only a detection after ~3.8 s of the loop could see a
     `num`-dependent glance; the light scenario next door detects in under 3 s. Not blocking (pre-existing).
   - `GuardAnimTier`, `BarkVoice` (`enemy.ts:697, 700`): render / voice only.
   - `EnemyManager` `num` uses (`enemyManager.ts:605-1837`) are identity keys (calls, cover owner, ordering ties),
     irrelevant with one guard. Radio jitter and the combat reseed (`enemy.ts:2157`) fire only after detection.
   - Math.random is still reseeded before `t.reset()` each run (`:219-220`), covering anything left on it.

3. Private fields are reachable from page JS. The e2e targets `vite preview` (`scripts/e2e-stealth-ai.mjs:10`, port
   4173); `vite.config.ts:38-53` sets no `minify` / `terserOptions` / mangle props (default esbuild minify keeps
   property names), and `senseRng` / `thinkT` are TS `private`, not `#` fields. The same file already reads
   `e['lastSeenT']` and `e['eye']` (:842, :701); `e2e-coop.mjs` and `e2e-enemies.mjs` read `e['stagger']`,
   `e['pauseT']` etc. `tsconfig.json:22` does not include `scripts/`, so no type check trips on the access.

4. No other scenario in `e2e-stealth-ai.mjs`, `e2e-sectorops.mjs` or `e2e-enemies.mjs` compares runs across freshly
   spawned guards with a frame-exact assert. The other seeded blocks (stealth-ai :531 lkp, :612 report then engage,
   :688 search area, :1026 heard in a search, :1500 breaker, :2407 helmet, :2445 armour, :2490 missed check, :2568
   loud shot, :2648 squad roles, :2968 / :3025 / :3196 coop4 rays / four / two; sectorops :562, :3322, :3558, :3679)
   seed a single run for stability and assert bands (within N s, counts, levels), not equality between runs.
   e2e-enemies has no Math.random seeding. Their think phase now depends on the spawn order (`num`) instead of the
   Math.random seed: still deterministic from a fresh page for a fixed script order, so no flake is added.
   - Note (non-blocking): stale comments still say the think cadence draws on Math.random:
     `scripts/e2e-stealth-ai.mjs:527` ('lkp': "think ticks"), `scripts/e2e-sectorops.mjs:557` ("the think cadence
     and the reaction draw on it"), `scripts/e2e-sectorops.mjs:3555` ("the think cadence and the shout / radio delays
     still draw on it"). Fix when next touched: drop "think cadence" / "radio delays" from those three comments.

5. The fragment `changes/feature-guard-ai-seed-random.md` passes `tests/changesFragments.test.ts` (1/1). "Fixed
   seeds" and "from a fresh load" are accurate: `senseRng` and the drone angle use the `0x5eed` default, not the live
   match seed, and both key on the session-global `num`.
