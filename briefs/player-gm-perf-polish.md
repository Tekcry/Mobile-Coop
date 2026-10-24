status: open

# Brief: gm-perf polish - origin-independent shield merge key, merged shield receives shadows (Player Build)

Lead: Night Shift | Player Build, 2026-10-24. Small render-only fix from `docs/guard-models/reports/GM-PERF-CHECK.md`
polish list (items 1, 3, 4 checked against the code at 979a02b3). No wire change, no gameplay change, unit tests only.

## What the check found, verified
- **Item 1 KEPT.** `src/ai/guardGearMerge.ts:179-187` (`mergeStaticParts`): each part's matrix in the root's space is
  `part.getWorldMatrix().multiply(parent.getWorldMatrix().clone().invert())`, in float32 (no `useHighPrecisionMatrix`
  anywhere in `src`). For an enforcer far from the origin, or at another yaw, the float error in that product moves a
  `toFixed(4)` digit of the cache key (`partInput`, `:60`), so he builds his own shield source (2 more meshes and a
  geometry each) and his shield is off by about 10 µm. Caller: `buildShieldPart`, `src/ai/gearParts.ts:74-84` (shield on
  `root`, visor parented to the shield). `mergeRigGear` already does it right: it composes the part's local matrix
  (`:126-127`, `Matrix.Compose(part.scaling, q, part.position)`).
- **Item 3 DROPPED.** "Never trimmed while the world lives" is true, but (a) the dispose half already exists: the
  sources go when the part library's skin material is disposed (`guardGearMerge.ts:75-79`), which `PartLibrary.dispose`
  does (`src/world/partLibrary.ts:249`) from `World.dispose` (`src/world/world.ts:575`); (b) the cache is bounded per
  world: every key input is per guard kind (rig build `def.build` / `def.height` via `src/ai/enemyRig.ts:23-24`, colour
  `gearColour` = faction x kind, `gearParts.ts:20-23`, shield colours fixed and `def.scale`), so a handful of entries.
  The only unbounded growth is item 1's float key, fixed here. A refcount trim would instead rebuild merges mid-play
  (alarm stage 2 armour, polish item 2's hitch) each time the last guard of a kind goes. Not built.
- **Item 4 KEPT for the shield only.** `source()` copies the part base's `receiveShadows` (`:101`) and `own()` copies
  `src0.receiveShadows` (`:152`); the S1 body hard-sets true (`src/player/smoothBody.ts:251`). Armour is fine already:
  `buildArmourParts` passes the merged mesh and its low LOD to `world.addShadowCaster` (`gearParts.ts:63-65`), which sets
  `receiveShadows = true` (`world.ts:411-413`). The shield is never passed to `addShadowCaster` (`src/ai/enemy.ts:569`,
  `src/net/enemyPuppet.ts:147`), so the merged shield source keeps the `rbox` base's value at the moment it was built
  (frozen there; the old unmerged instance followed the base live). Fix: receive like the body.

## Base and branch
- Base `origin/feature/gm-flip` at `979a02b3`. New branch `feature/gm-perf-polish`; push there only. No master merge,
  no rebase. `npm ci` once if needed.

## Files (only these)
- `src/ai/guardGearMerge.ts`
- `tests/guardGearMergeKey.test.ts` (new)
- `changes/feature-gm-perf-polish.md` (new fragment, see `changes/README.md`)
Not yours (another builder owns them, do not touch): `scripts/operators/**`, `src/operators/assets/**`,
`src/lab/guardSheet.ts`, `scripts/guard*.mjs`, guards.json kit data. Also leave `src/ai/enemyGunMerge.ts` (perfg's gun
merge) and `gearParts.ts` alone.

## Build
1. Local-chain matrix (item 1). Add a small module-private helper, e.g. `localTo(node, ancestor, out: Matrix): boolean`:
   start from the node's local matrix (`Matrix.ComposeToRef(node.scaling, q, node.position, out)`, `q` =
   `node.rotationQuaternion ?? Quaternion.FromEulerVectorToRef(node.rotation, tmpQ)`, as `:126`), then walk
   `p = node.parent` up to `ancestor`, each step `out = out x local(p)` (Babylon row vectors: child local first, then the
   parent's; use preallocated module temps and `multiplyToRef`). Return false when the chain does not reach `ancestor`
   (then `mergeStaticParts` returns null: the parts stay, as today for a part that does not fit). Use it in
   `mergeStaticParts` in place of `:179-180` and the `multiply(inv)` at `:187` (the visor: visor local x shield local;
   the shield: shield local). Pass a copy of the matrix values to `partInput` (`m` is kept in `vals`, so do not hand it
   a shared temp: `Float32Array.from(out.m)` or a new `Matrix` per part; build time only, allocation is fine there).
   Optionally use the same helper for `mergeRigGear :126-127` (one-step chain) so there is one way; behaviour unchanged.
   Leave `patScale` (`:48`, row norms of the world matrix: rotation / translation independent) as it is.
2. Receive shadows (item 4): `source()` `:101` `mesh.receiveShadows = true;` and `own()` `:152`
   `m.receiveShadows = true;` (the body's rule, one rule for all merged gear). Drop the then unused `like` uses only if
   nothing else reads them (`layerMask` still does). Update the file's header comment (one line: key from the local
   chain, receives shadows like the body).
3. Nothing per frame changes; no new observers.

## Tests (new `tests/guardGearMergeKey.test.ts`)
Reuse the NullEngine harness of `tests/guardActiveMeshes.test.ts:53-63` (`PartLibrary` on a `NullEngine` scene, a stub
world whose `addShadowCaster` only records). Cases:
- Same source wherever he stands: build the shield (`buildShieldPart(world, root, 1)`) on 8 roots, each a fresh
  `TransformNode` at a different far place and yaw (e.g. x / z in +-500..+-5000 m, yaw 0..6, plus one at the origin),
  `computeWorldMatrix(true)` first; all 8 instances share one `sourceMesh` (and `scene.meshes` grows by 2 sources only
  once). Pick the roots so the test FAILS on base 979a02b3 (run it there first and say so in the report; if no root
  makes it fail on base, report that and keep the test).
- Geometry unchanged: the merged shield's world box (as `guardActiveMeshes.test.ts:236-247`) equals the unmerged
  parts' box within 1 mm for the far root too, full and low LOD.
- A different `scale` (1 vs 1.1) still gets its own source.
- Receive: with the `rbox` base's `receiveShadows` false (fresh library, nothing registered), the merged shield's source
  and its low LOD have `receiveShadows === true`; the merged armour hi / lo too (on a `buildEnemyRig` rig).

## Run (unit tests only: no e2e, no GPU, no `npm run check`)
`npx tsc --noEmit -p .`; `npx eslint src/ai/guardGearMerge.ts tests/guardGearMergeKey.test.ts`;
`npx vitest run tests/guardGearMergeKey.test.ts tests/guardActiveMeshes.test.ts tests/guardShieldShare.test.ts tests/enemyGunMerge.test.ts tests/gearWiring.test.ts tests/smoothBodyMerge.test.ts tests/changesFragments.test.ts`
(single files; add `--maxWorkers=2` if the box is small). Never the full suite.

## Rules
- No hot-path allocation (all of this is gear build time; nothing new per frame). `hyp2` / `hyp3`, never `Math.hypot`.
- Babylon only through `src/core/babylon.ts` (tests may import `@babylonjs/core/Engines/nullEngine` as the harness does).
- Strict TS, no `any`, no non-null on values that can be null at run time.
- Changelog: new `changes/feature-gm-perf-polish.md`: line 1 `# Guard gear merge polish`, line 2 `kind: patch`, then
  `- ` bullets as for `CHANGELOG.md` (one or two: enforcers anywhere on a map share one merged shield; the merged
  shield receives shadows like the guard's body). Never edit `CHANGELOG.md`, `changes/feature-gm-flip.md` or
  `package.json`'s version.

## Done when
tsc / eslint clean, the 7 vitest files pass, `git diff --stat 979a02b3` = only the 3 files above. Report at the end of
this brief (what changed, whether the key test failed on base, test counts, deviations), commit trailer
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, then `status: done feature/gm-perf-polish <sha>`.
