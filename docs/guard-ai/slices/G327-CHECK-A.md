# G327 check A
Owner: Guard AI Build. Status: history.

Fresh Opus checker A (code correctness and performance) on PR #438, head 1ebdda529. Read only.

VERDICT: PASS

## Fix list
None.

## Evidence (summary)
- Intent ("Like on screen", Q17 / G327): a shadow-seen guard sets `t.frame = fid` (`src/ai/animTierView.ts:105-106`),
  the same field the camera pass sets (:78), so `i.seen` is true (:196) and `animTierPeriod` never takes the
  `offPeriod` branch (`src/ai/animTier.ts:68`): rate 1 within `ANIM_TIER_FAR`, 2 beyond (as an on-screen guard). No
  in-between tier. The figure LOD half rate is distance only.
- Shadow sources: the freeze's own `guardFrustum` (`src/game/sectorGuardFreeze.ts:143-195`) and the shared
  `readFreezeLights` (`src/game/sectorGuardFreezeView.ts:439-512`): moon capsule, every lit spot / point shadow map,
  torch atlas slots (holder excluded), character atlas slot lamps; overflow, a lamp at his body or near the camera =
  `FREEZE_DRAW` = seen. Atlases read live from `World` each frame, placed before `scene.render`.
- Per camera: `markSeen` runs on `onAfterActiveMeshesEvaluationObservable`, after Babylon sets the active camera and
  its frustum (scene.pure.js:4100-4130); shadow render targets render after it; with `activeCameras` each camera tests
  its own frustum; lights read once per frame id; render id vs frame id handled correctly.
- Freeze and disposal: render-frozen guards stay in the FROZEN tier; disposed meshes swap-removed; `LIVE` entries
  deleted on scene dispose.
- Allocation: `markSeen`, `readFreezeLights`, `addSpotLight`, `guardFrustum`, `GuardAnimTier.dt` allocate nothing per
  frame; scratch once per scene.
- Gameplay vs render: the rule only gates the rig solve and figure pose; no gameplay path reads `GuardAnimTier`; Babylon
  only via `src/core/babylon.ts`.
- Flags (`src/core/flags.ts:140-141`): `animShadow` defaults on; `animOff` 0 falls back to 8; junk falls back safely.
- Merge e56e5f5ef: the branch-side patch and the post-merge patch over src / scripts / tests are identical; nothing
  lost.
- Tests: 8 files 84 / 84 (animTier, animTierShadow, guardLod, sectorGuardFreeze*); tsc clean.

## Polish
1. One stale frame when a shadow first enters view (pose up to 7 frames old for that one render; same class as T1
   polish 1). A catch-up solve at the first shadow mark after a skip (like `thawPose`) would remove it.
2. Test gaps in `tests/animTierShadow.test.ts`: two `activeCameras` (one with his shadow, one without); a torch atlas
   slot with the holder exclusion; a shadow-seen guard beyond `ANIM_TIER_FAR` gets period 2; a disposed tracked mesh.
3. Add `body(..., 'function markSeen(')` to the ALLOC check in `tests/sectorGuardFreezeAtlas.test.ts:218-220`.
4. Dead guards still run `guardFrustum` each camera evaluation (microseconds, no visible effect); `t.h = 0` on death
   would skip it.
5. `?animoff=1` is ignored (`flags.animOff > 1`, `animTierView.ts:188`): use `>= 1` or document "N >= 2".
6. Inherited moon bound: the capsule reaches `FREEZE.shadowDrop` (9 m) below the feet; a moon shadow landing further
   below a guard on a high roof would be missed (the freeze has the same bound).
7. Pre-existing: a track removed after its mesh is disposed is never re-added; on a figure LOD switch `watch` lags one
   render.
