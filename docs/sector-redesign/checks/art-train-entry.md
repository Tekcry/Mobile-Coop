# #226 train entry - master merge, animFrozen -> animTier fold, artnext C7-C9

Integrator: Opus 5.5, 2026-10-24. Branch `feature/sector-redesign-art` (PR #226).

## Steps
1. Fast-forward 2276483a -> 477a3390 (`feature/sector-redesign-lr16pol-d`: artpol b5e93548 + docs-only polish D).
   Laptop GPU verdict on b5e93548: e2e-sectorops:6 + e2e-coop PASS.
2. `git merge origin/master` (cd229330, train 36) -> merge commit ab121ece. The fold and C7-C9 are in that commit
   (they rewrite the same `Enemy.frame` lines the conflict was in).
3. This report and the changelog line (`changes/feature-sector-redesign-artnext.md`, C7-C9).

Note: CLAUDE.md on master (Michael 2026-10-23 ~18:25) now says "Never merge master into a job branch" and resolves
conflicts in the train branch. The job lead asked for this merge before that rule reached the branch; the resolution
below can be reused as-is if the orchestrator re-merges #226 in `train/<n>`.

## Conflicts (10 files) and how each was resolved
| File | Ours (#226) | Master | Resolution |
| --- | --- | --- | --- |
| `docs/sector-redesign/BRIEF.md` | A-D-1..3 gear / sweep, A99 (A64 cap lift) | A100 (LR13 host falloff) | both, ours first |
| `src/core/flags.ts` (2 hunks) | `guardFreeze` | `photoLamps` (`?falloff=photo`) | both fields, both inits |
| `src/game/modes/sectorMode.ts` | freeze imports (`SectorGuardFreeze`, `inSheet`, `G`) | `responseTeam`, `SweepTeam`, `EnemyKind` imports | union of the imports |
| `src/game/stealthSystems.ts` | `lampReachProbe` import (polish2) | `groupBaseOn`, `BreakerHost` | one merged `lights` import + the `BreakerHost` type import |
| `src/weapons/ballistics.ts` | `cast()` (render-only freeze ray) | `armouredFirst()` (guard-ai S16) | both methods |
| `src/world/levelBuilder.ts` | `door()` opts order `armoured, leaf` | `leaf, armoured` + the slide-leaf line moved up | master's signature; our now-duplicate slide-leaf line dropped (master's line kept) |
| `src/world/mapDef.ts` | `campusArt?` | `kit?`, `facilityProps?` (marlow-final M5) | all three fields |
| `src/world/props/facilityProps.ts` (add/add) | `mark()` flags include `art` | without `art` | ours (a superset; `LevelBuilder.mark` takes `art`) |
| `src/world/world.ts` (2 hunks) | `campusArt` field + its load after the lamps | `kit`, `facilityProps` fields; master removed the 3.0 voxel GI (`giSlotOf`) | all fields; our campus-art load kept, our `voxels?.giGroups` line dropped (voxels gone on master) |
| `src/ai/enemy.ts` | perfg FROZEN tier (`animFrozenStep`, `rig.animate(sd, rp)`) | guard-render S4 `rig.animate(dt, rp, animTier.dt(...))` | folded (below) |

Auto-merge fix-ups found by `tsc`: `src/world/anchors.ts` had `Door.leaf` twice (both sides added the marlow-final
kit field); our copy removed. The marlow-final kit / props files our branch already carried (`facilityKit.ts`,
`kitRender.ts`, `staticMerge.ts`, `propRender.ts`, the two kit JSON / GLB pairs) merged identical to master's.

`src/net/protocol.ts` and `PROTOCOL_VERSION` are master's (43): this PR makes no wire change. The branch's
`src/net/coopClient.ts` / `coopHost.ts` / `lampSync.ts` polish2 lamp-reach checks (host-side validation, no message
change) merged cleanly over master's.

## animFrozen -> animTier fold (LR16-POLISH perf 3, perf-batch-check2 polish 3)
- `src/ai/animFrozen.ts` and `tests/animFrozen.test.ts` deleted; the FROZEN tier now lives in `src/ai/animTier.ts`:
  `AnimTierIn.frozen` (rig root disabled by the render freeze), `ANIM_TIER_FROZEN = 0` (the period), 
  `ANIM_TIER_FROZEN_CARRY_MAX = 0.1` (the old cap, kept for the frozen case only; off-screen / far carries stay
  uncapped), `AnimTierState.thaw`, `animTierThaw()`.
- Rule order: FROZEN is the first rule, above `on` (`?animtier=0`), pinned and the near-player rule (render only:
  nothing of a frozen guard is drawn; the freeze has its own `?guardfreeze=0`). The first update after a freeze always
  solves, so the far tier (period 2) or the off-screen tier (4) never skips the thaw frame.
- `GuardAnimTier` (`animTierView.ts`) gains `animate(rig, dt, rp, players, pinned)` - the whole `Enemy.frame` call:
  a frozen rig is not animated at all (no solve and no weapon glide, as on the branch before); else
  `rig.animate(dt, rp, tierDt)` as on master - and `solveNow(rig, dt, rp)` for the forced solves below.
- No clash between the two systems: master's tier system owns the job; ours became its first rule. Nothing of ours was
  dropped; the only behaviour change vs the branch is that an unfrozen guard now follows master's tiers instead of the
  rig's own camera LOD (master's intent).

## artnext C7-C9 (campus-art-next lane C)
| # | Item | Done |
| --- | --- | --- |
| C7 | thaw drew the pre-freeze limb pose for one frame | `SectorGuardFreeze.thaw` calls `Enemy.thawPose()` after re-enabling the root: one `solveNow` with the carried time inside that camera evaluation, so the first frame drawn is current (dead / disposed / dog: nothing) |
| C8 | foot stretch after a short freeze | `CharacterRig.replantIfMoved(d)`: root moved > `THAW_REPLANT` (0.3 m) since the last solve -> both planner feet re-init + motion derive reset + measured velocity restarted (the 2 m jump rule's reset); called on every thaw solve (`solveNow`, and the frame path when no freeze thaw ran) |
| C9 | ragdoll seeded from the freeze pose | `Enemy.die()`: if the rig root is disabled, `solveNow(rig, ANIM_TIER_FROZEN_CARRY_MAX, rp)` before `addBody` (re-plant included) |

Files: `src/ai/animTier.ts`, `src/ai/animTierView.ts`, `src/ai/enemy.ts`, `src/player/characterRig.ts` (the one new
method), `src/game/sectorGuardFreezeView.ts`; no per-frame allocation; render only, gameplay reads none of it.

## Tests
- `npx tsc --noEmit -p .`: clean.
- `npm run lint`: 0 errors, 42 warnings (all `no-console` and similar warnings in files this merge does not touch, e.g. `docs/menu-ui/prototype/parity-test.mjs`).
- New / changed: `tests/animTier.test.ts` (+6: FROZEN first rule, carry and thaw, cap, thaw never skipped by far /
  off-screen at any stagger, `animTierThaw`; the 4 old `animFrozen` cases ported), `tests/sectorGuardFreezeView.test.ts`
  (+3 NullEngine, artnext 8: the frozen tier driven through `GuardAnimTier` - no animate while frozen, the thaw solve in
  the freeze evaluation with the capped carry and re-planted feet, a short move keeps the feet, the death solve;
  the fake guards get `thawPose`), `tests/sectorGuardFreezeSeeThrough.test.ts` (fakes get `thawPose`).
- vitest `--maxWorkers=2` under `sr-slot` locks: 175 files - every test file importing a conflict file (`ai/enemy`, `core/flags`, `modes/sectorMode`, `game/stealthSystems`, `weapons/ballistics`, `world/levelBuilder`, `world/mapDef`, `props/facilityProps`, `world/world`, `world/anchors`) or `ai/animTier*` / `player/characterRig`, every `campus*` / `sector*` / guard-freeze test, and the 5 PROTOCOL_VERSION assert files: **174 passed, 1 skipped (file); 2239 tests passed, 5 skipped, 0 failed** (337 s). Earlier focused run (animTier, sectorGuardFreeze, -View, -SeeThrough): 4 files, 53 / 53.

## Risks for the laptop suites
- The thaw solve now runs inside `onBeforeActiveMeshesEvaluationObservable` (C7): a guard's rig animates mid-render
  for one frame. Logic-safe (render only), but watch for a pose pop or exception in `e2e-sectorops`.
- Master's anim tiers now also apply to the campus guards (off-screen every 4th frame, far every 2nd) on top of the
  freeze: the GPU perf rerun numbers on this head differ from the b5e93548 ones.
- `world.ts`: master removed the voxel GI; the campus art load is unchanged otherwise. A campus scene load in
  `e2e-sectorops` covers it.
- Co-op: no wire change; `e2e-coop` covers the merged host / client lamp checks.
