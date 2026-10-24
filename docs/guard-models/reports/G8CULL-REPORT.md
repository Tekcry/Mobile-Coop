# G8CULL report: guard figures' lamp / torch shadow cost (feature/gm-g8cull)

Follow-up to the G8 budget run (STATE.md "G8 budget run", `run-g8/COMPARE.md`): verdict HOLD, sectorops 24 frame CPU
p95 +0.6 / +0.6 / +1.7 ms over figures-off (gate +0.5); `maplight-shadow` draws 23.8 -> 50.4 at 24 alert.

## What the code says (cause)

**Which maps.** sectorops has baked lamps (`World` -> `LightRig.setBaked`), so `maplight-shadow-*` are the guards'
flashlights only (`BAKED_SHADOWS` = 2 slots; `shadow pool / lit` 2 / 2 at alert, 2 / 0 in patrol). The baked lamps'
shadows are `charshadow-*` (`CharShadows`). `fillCasters` (lightRig.ts) keeps a caster whose world AABB is within
torch reach + 1.5 m of the torch (sphere vs box).

**Box sizes** (NullEngine probe with the bundled `guard-average` files, grunt, height 1.77 = refHeight, scale 1):

| | root-local box (min / max, m) | size x / y / z | world AABB at 45 deg yaw | bounding sphere r (world, 45 deg) |
| --- | --- | --- | --- | --- |
| S1 merged body (rig rest + PAD) | -1.26 -0.31 -1.26 / 1.26 2.07 1.21 | 2.52 / 2.38 / 2.47 | 3.53 x 3.53 | 3.01 |
| Figure (GLB bind + PAD), all 3 LODs | -1.60 -0.30 -1.14 / 1.60 2.11 1.34 | 3.20 / 2.41 / 2.48 | 4.02 x 4.01 | 3.33 |

The figure's bind pose is an A-pose: hands at +-0.60 m (GLB POSITION min / max x -0.601 / 0.603) against the rig rest's
+-0.26 m, so the box is 0.34 m wider each side in x (0.24 m in a rotated AABB); y and z are within 0.13 m.

**Lists entered.** guard-cap's placement (wedge, rings 1.5 m apart, 1.6 m spacing) with the 2 shadowed torches, through
`fillCasters`' rule (scratch simulation): at 24 guards OFF / ON guard entries over the 2 maps are 27 / 31 (reach 4 m),
41 / 41 (7 m), 47 / 47 (10 m), 48 / 48 (13 m); at 12 guards 14 / 16, 22 / 22, 24 / 24, 24 / 24. **The bigger box adds 0-4
entries, not the measured +26.6 draws.**

**Meshes per guard.** Each figure LOD is one primitive (bundled files: one mesh each). On a NullEngine shadow map with an
S1 guard and a figure guard in the list: one shadow draw each (`off-smooth` 1, `on-lod1-0` 1); the figure's other two
LODs and the disabled merged body are in the list but skipped (`ObjectRenderer`: `isEnabled()`); the S1 `lo` mesh is
skipped as an LOD level (`isBlocked`). The gun parts are part instances (batched per base). Warm meshes (`guardWarm.ts`)
are never casters. So a figure is never more than one draw per map (plus the planned shield, enforcers only).

**Conclusion.** The parent's suspected cause (box -> more lists) is real but small: it explains at most a few of the 26.6
extra draws. By the rule, OFF should already draw ~24-48 guard entries at sectorops 24 alert, yet its whole maplight
total (static included) is 23.8; ON's 50.4 is what the rule predicts for every figure. So the gap is more likely on the
OFF side (S1 bodies drawing into fewer torch maps than the rule says) or run-to-run torch placement (the 2 shadow slots
go to cut beams first, `torchShadowPass`; their static casters differ per run). Not provable without a GPU run. Two
further facts from the G8 tables:
- The patrol cells fail the gate too (+0.6 / +0.6 ms) with **no torch maps at all** (torches 0 of 4). patrol/facing
  draws are 260 vs 258 with render() CPU +0.6 ms: per-guard render CPU (pose / bone matrices: 23-33 bones per figure
  against S1's ~16, the skeleton upload), not shadows.
- patrol/away has ON 5 shadow passes vs OFF 4 (+15 draws): a `charshadow` slot that the figure's bigger bounding sphere
  pulled in (`CharShadows.gather`: lamp reach + sphere radius; 3.33 vs 3.01 m at 45 deg). The box fix removes that.
  It also explains `charshadow` 10.2 -> 5.0 at 24 alert: `fitCone` drops a lamp that sits inside a caster's sphere +
  0.3 m, and the bigger sphere does that more often (those guards lost their lamp silhouettes).

## Fix (render only, gameplay untouched)

1. **The figure is culled with the merged body's own box** (`GuardFigureOptions.box`, guardFigure.ts; `mergedBox(rig)`,
   guardBody.ts). `GuardBody` passes the S1 merged mesh's local box (the rig root's space), and the figure divides it by
   its scale. Camera, cascade, torch, lamp and character-shadow culling are then exactly the old body's at the same
   position: same lists, same `charshadow` slots and cone fits. The look is unchanged (culling only; the pose comes from
   the same rig, S1's margins cover lean / reach / arms up). A rig drawing its parts (`?guardmerge=0`) keeps the bind box.
2. **One mesh per guard in each torch / lamp list** (lightRig.ts): `fillCasters` skips disabled meshes (the figure's
   other LODs, the merged body it replaced: they draw nothing and their world boxes are stale). A caster's effective
   enabled change (`onEffectiveEnabledStateChangedObservable`, one closure per rig) marks the lists dirty and the placed
   shadow maps refill on the next frame, so a LOD switch casts at once instead of at the next 0.25 s pick. Per-frame
   cost: nothing unless an enabled state changed; no allocation unless a list changes.

## Tests (one at a time)

- New `tests/guardLampCasters.test.ts` (NullEngine, real `LightRig`, 124 OFF + 124 ON grunts at the same spots, rings
  1.5 m apart, mixed yaws; 15 torch probes at reach 1.5 / 3 / 5 m): the figure's box equals the merged body's for grunt
  and heavy (scaled); each probe's list holds the same guards ON as OFF; each figure is exactly one mesh in a list (the
  shown LOD); nothing disabled in a list; a LOD switch between picks swaps the old LOD's mesh for the new one without a
  pick. Before the fix 3 of 4 fail. 4 pass.
- `tests/guardFigure.test.ts` 14 pass, `tests/guardFigureWarm.test.ts` 7, `tests/guardAssets.test.ts` 34,
  `tests/guardBody.test.ts` 14, `tests/charShadowSet.test.ts` 11, `tests/shadowAccuracy.test.ts` 8,
  `tests/guardShieldShare.test.ts` 2, `tests/guardHelmetDrop.test.ts` 3 (no LightRig tests existed before).
- `npx tsc --noEmit -p .` clean; eslint on the 4 changed files clean. No e2e, no GPU run, no full vitest.

## Laptop rerun (Test Runner, GPU slot, heavy.lock)

At this branch's head, after `npm run build`, port 4189 freed before and after:

```
E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,campusops --counts=0,12,24 --cells=patrol,away,alert --query=guardmodels=1 --out=C:/NightShift/scratch/g8cull/on
E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,campusops --counts=0,12,24 --cells=patrol,away,alert --query=guardmodels=0 --out=C:/NightShift/scratch/g8cull/off
```

Read: sectorops 24 frame CPU p95 ON - OFF (gate +0.5) per cell; `maplight-shadow` and `charshadow` draws per pass and
shadow pass counts ON vs OFF (expected now equal within noise); campusops 24 alert draws <= 600. If the alert cell still
shows a large maplight gap, log the two shadowed torches' list lengths and owners ON / OFF (the gap is then torch
placement or the S1 side, not the figure). If the patrol cells still miss +0.5 with equal draws, the remaining cost is
per-guard render CPU (pose and bones), PLAN 6's data levers (LOD0 radius 8 -> 6 m) or the poser fallback.

## Files

- `src/operators/runtime/guardFigure.ts` (`box` option, culling box)
- `src/ai/guardBody.ts` (`mergedBox`, passed to the figure)
- `src/world/lightRig.ts` (disabled casters skipped, refill on enabled change)
- `tests/guardLampCasters.test.ts` (new)

Open: no changelog fragment line (the guard-models lead owns `changes/feature-guard-models.md`).
