# S11 check: guard figure CPU cost (fresh Opus checker)

Diff checked: `8868830f..0fd85e2b` (gm-s11 4178c1de merged into feature/guard-models). Read against master's
`src/ai/animTierView.ts`, `src/ai/animTier.ts`, `src/ai/enemy.ts` (`frame`, death ~:2000, `thawPose` ~:3706),
`src/game/sectorGuardFreezeView.ts` (freeze / thaw) and `src/vfx/doorGhosts.ts`.

## Verdict: PASS

No blocker: nothing broken or unplayable, no visible render break introduced, no per-frame allocation, nothing the
master merge would silently lose that the report does not list.

## Tests (one at a time)
- guardLod 3/3, guardFigure 17/17, guardBody 16/16, guardFigureWarm 7/7, guardLampCasters 4/4, guardAssets 34/34,
  guardSheetPlan 21/21, animTier 14/14.
- `npx tsc --noEmit -p .` clean.

## Findings per question

**1. (a) Frozen guards skip `figure.update`** (guardBody.ts:236). Correct.
- `rig.root.isEnabled(false)` is the freeze's own flag (master sectorGuardFreezeView.ts ~:237-241 disables the rig root
  itself), read without allocation, independent of the `skip` order. `skipped` (animTierView.ts:51-57, :106) matches
  master: `animTierStep` returns -1 for `ANIM_TIER_FROZEN` and master's `animate` calls `dt()` before its frozen
  return, so `skipped` is true for frozen guards there too.
- Thermal door ghosts on master draw `Silhouettes` from the rig's joints, not the figure: a ghosted frozen rig needs no
  figure pose. Confirmed.
- Helmet knock-off / gear / tint / flash / heat while frozen: `setPieces` / `setTints` / `setFlash` / `setHeat` write
  the shown LOD at once, outside `update` (guardFigure.ts:544-600; `setHeat` / `setFlash` run before the gate in
  `GuardBody.frame`). Not affected.
- First show while frozen: `f.current < 0` still forces the update, posing from the rig's last solve (the rig always
  solves at least once before the first freeze evaluation): never a T-pose.
- Unfreeze: `GuardBody.frame` runs in `onBeforeRender`, the freeze thaws in `onBeforeActiveMeshesEvaluation`, so the
  thaw frame shows the pre-freeze pose and LOD for one frame (report item 4). The pre-S11 code did the same (`skip` was
  true on that frame), so not a regression; half rate does not add to it (`frame - posedAt >= 2` poses the next frame).
  See polish P1.
- Ragdoll: a dead guard runs no tier (`skip` stays false), and his root is thawed in the same frame's evaluation
  (master's sweep thaws dead guards first), so the world path poses from the next frame. See P2 for the death frame.
- Report "what the merge must keep" items 1-3 are complete and correct against master (`lastDt` / `skipped` / the
  `lastDt =` return in `dt()`, `watch()`; `gb.skip = this.animTier.skipped` after master's `animate`, dropping
  `tierDt` / `rig.animate`; the guardBody condition). Item 4 should be done at the merge, not optional (P1).

**2. (b) Bone folds 33 / 23 / 19 and LOD2 half rate.** Correct.
- Skinning stays right: `buildGuardLod` (guardFigure.ts:110-121, :136) maps every skin joint to its nearest kept
  ancestor's slot, and the bones are built from `poserSetup`'s `bindLocal` on the kept set (bind world relative to the
  nearest kept parent, guardFigure.ts:435-441; pose.ts:123-136), so Babylon's inverse bind is the ancestor's: folded
  vertices move rigidly with the ankle / chest / wrist, never left at bind pose. The bake's LOD2 weights still name toes
  and clavicles; the runtime remap is what makes them valid, which is fine. Tests cover every skin index inside its
  skeleton and LOD2 bones at their LOD0 positions < 1e-4 m after a walk.
- Clavicles are animated rig joints (`RIG_T3`), so at LOD2 shoulder-top vertices ride the chest: a few cm at most on
  a shrug / aim, under a pixel beyond 25 m. Acceptable (P5 for the look pass).
- Half rate (guardLod.ts:44-47, guardFigure.ts:651-657): `((frame + slot) & 1) === 0 || frame - posedAt >= 2`, so a
  figure never goes two frames without a pose; an anim tier that skips calls nothing, leaves `posedAt` old, and its next
  call always poses: no double halving at any tier period or phase. A LOD switch (`switched`) and the world path
  (`loose`) pose at once; a disabled figure resumes with a pose. Skipped frames do not mark the skeleton.

**3. (c) GUARD_LOD.** Correct: guards 6 / 25 m through `pickLod(..., GUARD_LOD.edges)` (guardFigure.ts:625); Wren's
callers use the default `LOD_EDGES` 8 / 25 (lodPick.ts:16, :27; test pins it). The sheet's night line-up forces
`lod: 0` (guardSheetPlan.mjs:282), consumed by lab/guardSheet.ts:218-219. No e2e asserts a guard LOD distance.
Cascades from LOD1: agree with skipping. The figure shows one LOD in every pass; drawing LOD1 into the moon cascades
only needs `world.ts` (Test Runner's S9 file) plus a second mesh per near guard, and it saves GPU vertex work only,
where G8 already passes. Not a CPU lever for this gate.

**4. Allocation.** None per frame in the new paths: `isEnabled(false)`, `getFrameId()`, `guardPosesNow` (pure integer
math), `posedAt` / `poses` numbers, `pickLod` with a constant edges tuple (default parameter is a constant reference).
The `filter` / `map` / closures in `buildGuardLod` and `guardFolds`' `includes` run at load only.

## Polish (none blocks)
- **P1 (do at the master merge).** Thaw frame: master's C7 (`thawPose`, "this render draws the current pose") is lost
  with figures on: the figure shows the pre-freeze pose and LOD for one visible frame (the guard is being thawed because
  he is coming into view). Fix: master enemy.ts `thawPose` (~:3706), after `solveNow`, add
  `this.gbody?.figure.update(this.ctx.scene.activeCamera);` (thaw runs in `onBeforeActiveMeshesEvaluation`, before the
  skeleton prepare; the half-rate gate passes since `frame - posedAt >= 2`). Move report item 4 from "optional" to the
  must-keep list.
- **P2.** Death while frozen (master enemy.ts ~:2000 `solveNow`): the root stays disabled until the freeze's sweep in
  that frame's evaluation, `GuardBody.frame` skips, and `thawPose` returns early (`!alive`), so the ragdoll's first frame
  shows the pre-freeze figure pose (pre-S11 merged code would have posed it). Almost always off-screen (he was frozen
  because unseen). Fix if wanted: in master's `SectorGuardFreeze.thaw` (sectorGuardFreezeView.ts ~:332-339), update the
  rig's figure (`guardBodyOf(e.bodyRig)?.figure.update(...)`) for dead guards too, or do P1's update before the
  `alive` check.
- **P3.** guardSheetPlan.mjs:278, the LOD strip caption still says "in play: LOD0 under 8 m": 6 m now (the sheet hash
  changes with S11 anyway).
- **P4.** PLAN 5's table header still says LOD0 < 8 m (lead's file, report noted it); no changelog fragment line yet.
- **P5.** G10 look check: glance at a guard aiming across the 25 m LOD1 -> LOD2 switch for a shoulder-top pop (folded
  clavicle). Expected sub-pixel.
- **P6.** The default `slot` is a module-wide spawn counter (guardFigure.ts:287, :345): parity is spread by spawn order,
  not by screen position, so two neighbours can share a frame. Load is still about half per frame on average; fine.
