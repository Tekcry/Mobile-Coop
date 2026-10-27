# CLOUD-PERF-POLISH check - feature/gm-perf-polish dae7ab0f

Checker: Night Shift | fresh Opus checker, 2026-10-24. Brief: `origin/cloud-queue:briefs/player-gm-perf-polish.md`.
Base `origin/feature/gm-flip` 979a02b3. Reviewed in a detached checker worktree with `feature/gm-look-seeds` merged in
(no conflicts), never pushed.

## Verdict: PASS

No blockers. No wire change (`src/net` untouched). Diff = the 3 brief files only.

## Correctness
- `localTo(node, ancestor, out)` (`src/ai/guardGearMerge.ts:47`): child local first, then each parent's local up to
  `ancestor` (`out x local(p)`, Babylon row vectors), preallocated `tmpL` / `tmpC`, false when the chain leaves the
  TransformNode tree (null / a Bone): `mergeStaticParts` and `mergeRigGear` then return null and the parts stay, as the
  brief asks. No pivot / billboard on these parts (`grep setPivot|billboardMode` in `src/ai`, `src/player`,
  `partLibrary.ts`: none), so the local compose equals the world chain.
- Shield (`gearParts.ts:74-84`): shield local, visor = visor local x shield local. Root position / yaw no longer enter
  the key, so the key is stable; genuinely different layouts still split (scale 1 vs 1.1 -> own source, test case 3).
- `mergeRigGear`: one-step chain (`part.parent === joint`, zero loop iterations) = the old `Matrix.Compose`: behaviour
  unchanged.
- Each part gets its own `new Matrix()` (kept in `vals.m`): no shared temp leaks into the merge input.
- `receiveShadows = true` in `source()` (:126) and `own()` (:179); `like` / `src0` still read for `layerMask`. Render
  only; gameplay reads none of it.

## Hot path
Build time only (first gear build per guard). No per-frame code, no new observers, no closures in loops.

## Tests
- Key test fails on base 979a02b3 (checker re-ran it with the base `guardGearMerge.ts` swapped in, then restored):
  case 1 `expected [1..7] to deeply equal []`, case 3 sources differ, case 4 `[false, false]`; case 2 (geometry within
  1 mm) passes on both, as expected. Meaningful.
- Merged worktree (both branches): `npx tsc --noEmit -p .` clean; eslint clean on the changed files; vitest 46 files /
  585 tests pass (the 35 files importing enemyManager / guardLook / guardGearMerge, plus guardGearMergeKey,
  guardActiveMeshes, guardShieldShare, enemyGunMerge, smoothBodyMerge, courseConsole, marlowN4Hold, coopGuardAi,
  sectorDesk, sectorKeypad, changesFragments). No e2e run (unit-only brief).

## Polish (optional)
1. `patScale` (`partInput`) still comes from the world matrix row norms. Float noise there is ~1e-7 relative, so a key
   split needs a value within ~5e-8 of a `toFixed(4)` boundary: negligible, left as the brief said. If it ever shows,
   take the row norms of the local-chain matrix instead.
2. Test case 4 checks armour `receiveShadows` on a stub world whose `addShadowCaster` only records; in game the armour
   already received via `world.addShadowCaster`, so the visible change is the shield only (the changelog's armour
   mention is accurate but not a player-visible change).
