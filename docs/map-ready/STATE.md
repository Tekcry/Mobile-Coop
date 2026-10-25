# map-ready: state
Owner: Night Shift | Sector Ops Build. Status: current.

## Resume
- Folder `C:/NightShift/Mobile-Coop-map-ready`, branch `feature/map-ready` (from master 2148ec96). Guard before every
  write: `cd /c/NightShift/Mobile-Coop-map-ready && test "$(git rev-parse --abbrev-ref HEAD)" = feature/map-ready &&
  test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-map-ready"`.
- Docs: `BRIEF.md` (Q31 words, Q32 pick, A1-A13, Q1 cap question), `PLAN.md` (gate table section 2, slices S1-S8,
  claims, overlaps), `research/start-path.md` (the start path and the 13 late-build rows with file:line).
- Phase: plan written, plan checker not run yet. No code on the branch.
- Key facts:
  - The warm-up (`src/game/gameState.ts:970-975`, cap `WARMUP_MAX_MS` 6 s `:337`) runs BEFORE the first `applyQuality`
    (`src/core/app.ts:386`), so lit materials compile again in play.
  - Guards spawn in `enter()` (`gameState.ts:1167` -> `src/game/modes/sectorMode.ts:366`), after the boot screen drops
    (`src/main.ts:412`).
  - Wren LOD0 / LOD1 and the weapon meshes load after the reveal (`src/operators/runtime/figure.ts:509-512`,
    `src/weapons/weaponModel.ts:171`).
  - Campus sections other than the live one bake and fade in during play (`src/world/bakedLamps.ts:71-73`).
  - Co-op has no load handshake: the host clock starts at once (`src/net/coopHost.ts:1701`).
  - The menu's gate (`src/world/menuGate.ts`, `src/world/menuScene.ts:319-386`) is the pattern for `game/mapGate.ts`.
- Open for Michael: Q1 the cap (default 45 s, A2, logged overnight; blocks only S7 and switch-on).
- Overlaps: S5 with `feature/coop-kit` / `feature/player-hygiene` / `feature/guard-rules` (rebase, no shared lines),
  S6 / S7 with `feature/test-runner-j20` and `feature/route-runs-2` (start after they merge).

Next: a fresh Opus plan checker on BRIEF + PLAN (`docs/templates/plan-check.md`), verdict in `docs/map-ready/PLAN-CHECK.md`; on PASS brief S1 (Sonnet builder) and S2 (Opus).

## Done
- 2026-10-25: worktree and branch; research `research/start-path.md` (93c63a70); BRIEF (adaa8274); PLAN (cd4eb116).

## History
- 2026-10-25: job opened by Night Shift | Sector Ops Build from ROADMAP row 17 (J21: Q31, Q32).
