# G327 check B
Owner: Guard AI Build. Status: history.

Fresh Opus checker B (intent, player-visible result, docs, tests) on PR #438, head 1ebdda52. Read only.

VERDICT: FIX (docs only; no on-screen defect in the code)

## Fix list (all applied in the fix round)
1. `docs/systems/performance.md:94` linked `docs/guard-ai/slices/T1-SHADOW-REPORT.md`, which does not exist yet:
   doc-lint ERROR, CI `lint` / `check` red. Fixed: the path is dropped until the report lands.
2. A195 cited in 7 places but defined nowhere; `BRIEF.md` A183 still said HELD. Fixed: A195 added (own section), A183
   rewritten as closed by G327 (same text as J1 #435).
3. `changes/feature-guard-ai-g327.md`: "animates at full rate" is false past 22 m (a shadow-seen guard gets the
   on-screen period, every 2nd past 22 m: Q17 "Like on screen"). Fixed.
4. Checker gate (RULES "Test tiers"): the PR touches `src/game/sectorGuardFreezeView.ts`, so e2e-coop + e2e-netmove
   are requested by the lead and must be green. Low risk: a pure extraction; co-op `EnemyPuppet`s solve every frame
   with no tier (`src/net/enemyPuppet.ts:513`).

## Merge gates
- The laptop alone measure (T1-SHADOW-REPORT) and the GPU look rerun (#414 script) before train-ready; J4 / Q4 / J21
  wait on the measure.

## Edge cases checked (summary)
Moon / CSM, long low moon (refinery dir.y ~ -0.38; the 54 m cap only short below ~2 degrees), caster behind the camera,
lamp / torch / character atlas slots, baked-lamp capsule and blob shadows (sim position, never the rig), frustum
edge, a lamp switching on (one stale frame, polish 1), two local views, co-op client (puppets every frame), far tier
(1/2 like on screen, matches Q17), takedowns / holds / climbs (pinned, every frame), render-frozen guards, light parity
(render only). e2e: the affected list (11 suites) asserts no guard cadence; the rule's logic is in
`tests/animTierShadow.test.ts` (NullEngine, real lights and frustum).

## Polish
1. First visible frame after a guard or shadow enters view shows a pose up to 7 frames old (same as check A polish 1);
   a catch-up solve like `thawPose` would close it.
2. `TESTING.md:193` "old 1/8 rate" -> "camera-only 1/8 rate" (applied).
3. `performance.md` tier order: pinned / near first (applied).
4. `FREEZE.minSunY` 0.2 caps the moon capsule at ~54 m (pre-existing).
5. Fragment `kind: minor` (applied).
6. Orchestrator: VISION 4 rule 10 and G327 say "full rate"; Q17 "Like on screen" is the finer answer (next fold).
7. PR body counts (84 / 84) and the red lint (updated).
