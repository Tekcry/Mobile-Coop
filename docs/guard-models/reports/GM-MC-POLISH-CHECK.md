# GM-MC-POLISH check (fresh Opus checker, 2026-10-24)

Branch `feature/gm-mc-polish`, reviewed `git diff 979a02b3..e233b20f` (base `origin/feature/gm-flip`).

## Verdict: PASS

No blockers.

## What was checked

1. **lightRig flag gate** (`src/world/lightRig.ts:477`, `:713`)
   - `flags.guardModels` is a page constant (`src/core/flags.ts:132`, URL `?guardmodels=1`); nothing in `src/` writes it,
     only tests. It is read at call time (per `addCaster`, once per `fillCasters` call, outside the caster loop), so a
     later default flip (e.g. `!== '0'`) needs no change here.
   - Flag off: no `onEffectiveEnabledStateChangedObservable` observer, so `castersDirty` is never set, `refillCasters`
     never runs, and `fillCasters` keeps disabled meshes. That matches the pre-G8 code (`4ecb26b9^`). The only
     remaining G8 code on that path is `removeCaster`'s `removeCallback` on an empty observable, which is cold and costs
     nothing worth counting.
   - Flag on: the code path is the same as G8, so nothing regresses. `tests/guardLampCasters.test.ts` (sets the flag
     before building the figures) still passes.
2. **`GuardFigure.poseNow`** (`src/operators/runtime/guardFigure.ts:685`)
   - It returns early on `disposed`. `dispose` nulls `lods` and sets `current = -1`, so it can never reach a disposed
     skeleton.
   - It cannot pose twice. It runs only while `l.pending` is set, and `posePending` clears that flag. `prepare(true)`
     leaves `_currentRenderId` alone and clears `_isDirty`, so the render's own `prepare()` finds a clean skeleton and
     skips both the pose and the matrix compute. The unit test checks this (`p0 + 1`, then `p0 + 2` after a render).
   - It allocates nothing in steady state. Babylon allocates the transform buffer once, the first time a skeleton
     computes, which is outside the hot path.
3. **`Enemy.thawPose` / `Enemy.die`** (`src/ai/enemy.ts:3846`, `:2091-2105`)
   - die ordering: `solveNow` runs first, then `addBody`. The `Body` constructor builds the `Ragdoll` and does the
     joint re-parenting synchronously. After that, `figure.update` sees `loose` and sets `alwaysSelectAsActiveMesh`,
     and `poseNow` runs `poseWorld` from the ragdoll joints. The order is right.
   - If the body cap in `EnemyManager.addBody` removes the new body at once, the figure is disposed and both calls
     return early.
   - Carried and hidden bodies are `Body` paths (`pickUp` builds a fresh rig and figure) and never reach `Enemy.die`,
     so they are not affected.
   - The new code gates only render work on `frozen`. Gameplay reads no graphics state here: `Body.pos` comes from the
     sim lie.
4. **Co-op puppets** (`src/net/enemyPuppet.ts`): puppets do not need the fix. `SectorGuardFreeze` runs over the host
   `EnemyManager` list only (`src/game/modes/sectorMode.ts:337`). A puppet's rig is enabled once at its first placement
   (`:446`) before `rig.animate`, so its figure poses lazily in the same frame. `die()` hands the rig on unfrozen.
5. **Hot paths**: the changed code allocates nothing (`const gb`, `const cull`, boolean reads).

## Runs

- `npx tsc --noEmit -p .`: exit 0.
- vitest, 9 files, 66 tests, all pass: `guardFrozenPose`, `guardFigure`, `guardFigureWarm`, `guardLampCasters`,
  `lightRigCasterFlag`, `lightRigFlicker`, `shadowAccuracy`, `torchOcclusion`, `torchShadowsBright`.
- vitest, 6 more files, 64 tests, all pass: `guardBody`, `guardBodyCheck`, `sectorGuardFreeze`,
  `sectorGuardFreezeSeeThrough`, `sectorGuardFreezeView`, `visionIsolation`.
- No e2e and no `npm run check` were run (per the brief).

## Polish (not blocking)

- P1. **`poseNow` in `thawPose` adds nothing inside a render.** Babylon's `_renderForCamera` bumps `_renderId` just
  before `_evaluateActiveMeshes` fires `onBeforeActiveMeshesEvaluationObservable`, where the thaw runs. The figure's
  skeleton therefore cannot already have computed in that render id, and the lazy `pending` pose would compute at the
  camera's `prepare()` anyway. `poseNow` is harmless here: one compute instead of one, on a rare event. It only matters
  for a thaw outside a render (`SectorGuardFreeze.dispose`).
  - The `guardFrozenPose` thaw test calls `thawPose` between renders, so it proves the call poses at once, not that a
    real thaw would draw a frame late.
  - Keep it or drop it; drop the "frame late" comment if dropped.
- P2. **`poseNow` in `die` poses slightly earlier than the lazy path would.** `figure.update` alone fixes S11-CHECK P2:
  `pending` and the dirty skeleton survive until the first draw after the thaw, and they then pose from the ragdoll as
  it is at that point.
  - With `poseNow`, the figure keeps the die-time pose through any ragdoll sim steps that run before that frame's render.
    The freeze thaws the dead guard at the next evaluation, and `thawPose` skips a dead guard. So the figure is up to a
    few 60 Hz steps stale for one frame.
  - Option: keep `update` and drop `poseNow` in `die`. Or let `thawPose` call `update` + `poseNow` for a dead guard
    whose figure still exists.
- P3. **The flag is read separately for the observer and the cull.** They agree only because the flag is page-constant.
  A comment near `markCasters` saying "flag is page-constant; a runtime toggle would need re-subscribing" would guard
  against a future settings toggle.
- P4. **Thin test coverage on two points.** No test runs `poseNow` on a disposed figure (trivially safe), and no test
  asserts that the drawn bone matrices match the current rig after a thaw. The current tests count poses only.
