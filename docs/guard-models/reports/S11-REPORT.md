# S11 report: guard figure CPU cost (feature/gm-s11)

Toward the G8 gate (sectorops 24: frame CPU p95 within +0.5 ms of figures-off; patrol cells missed by +0.6 ms with equal
draws, so per-guard render CPU). Test Runner's PLAN2 S11 a-c (`origin/feature/guard-render-2:docs/guard-render/PLAN2.md`).
All render-only: gameplay reads none of it; no allocation per frame.

## What was built

**(a) Frozen guards skip the figure.** `GuardBody.frame` (guardBody.ts ~:225-238) now runs `figure.update` only when
the tier did not skip (`skip`) AND the rig root is enabled (`rig.root.isEnabled(false)`), first show excepted.
- The root check is the render freeze's own signal: master's FROZEN tier is exactly `!rig.root.isEnabled(false)`
  (`GuardAnimTier.animate`, animTierView.ts on master ~:106). It is read inside `GuardBody`, so it holds whatever order
  `Enemy.frame` sets `skip` in, and even if the merge drops the `gb.skip` line. A disabled root draws nothing of the
  figure (its root is a child of `rig.root`), and the rig is not solved while frozen, so nothing is lost. Train 51's
  thermal door ghosts (`doorGhosts.ts`) draw from the rig's joints (`Silhouettes`), not the figure, so a ghosted frozen
  rig still needs no figure pose.
- The tier skip is now the tier's own state: `GuardAnimTier.skipped` (animTierView.ts, `lastDt < 0`, written in `dt()`),
  and `Enemy.frame` sets `gb.skip = this.animTier.skipped` (enemy.ts ~:3283). On master `animate()` calls `dt()` before
  its frozen return and `animTierStep` returns -1 for `ANIM_TIER_FROZEN`, so `skipped` is true for frozen guards there
  too.
- This branch has no render freeze (it is master's #226), so today (a) changes nothing measurable here; it pays after
  the master merge, for every guard the freeze holds (PLAN2 1: off-screen guards still cost +0.18 ms each).

**(b) LOD1 / LOD2 fold bones, LOD2 poses at half rate.** (guardFigure.ts `buildGuardLod` ~:107-121, `update` ~:617-660)
- At load each LOD drops its folded joints from the skeleton (`poserSetup` on the kept joints); a folded joint's
  vertices are remapped to its nearest kept ancestor. Rule (`guardFolds`, guardLod.ts): fingers from LOD1, plus
  `toeL toeR clavL clavR` at LOD2. Bones posed and uploaded: LOD0 33, LOD1 23, LOD2 19 (was 33 / 23 / 23).
  The bundled bake already leaves the fingers out of LOD1 / LOD2 (`lodBones`, G1 / G4; checked in the GLBs: 33 / 23 /
  23 joints, 0 fingers at LOD1 / LOD2), so with our files LOD1 is unchanged; the runtime fold keeps any file that still
  has fingers at the same count (Wren's stand-in LOD1 has 57 joints, 30 of them fingers -> 27).
- LOD2 poses every other render frame (`guardPosesNow`): slot parity alternates (`GuardFigureOptions.slot`, default
  spawn order: odd and even guards on alternate frames). A LOD switch, the first frame and a ragdoll (world path) pose
  at once. A figure that missed the frame before always poses, so the anim tier's own half rate (far tier, > 22 m,
  staggered by guard number) is never halved again, whatever its phase. A skipped frame does not mark the skeleton:
  Babylon recomputes and uploads nothing.

**(c) Data levers, one table.** `src/operators/runtime/guardLod.ts` `GUARD_LOD`: `edges` [6, 25] (LOD0 -> LOD1 at 6 m,
was Wren's 8), the folds, `halfRateFrom`. `pickLod` / `bandLod` take the edges as an optional argument (default Wren's
`LOD_EDGES`, unchanged 8 / 25: Wren keeps her bands). Hysteresis unchanged (10 %): LOD0 -> LOD1 past 6.6 m, back under
5.4 m.

**Not built: shadow cascades from LOD1.** It is not a data lever in this code: the figure shows one LOD mesh in every
pass (the others are disabled), and the moon's cascade lists are filled in `world.ts` (Render's file for S9 this
window). Drawing LOD1 in the cascades while the camera draws LOD0 needs a second mesh per LOD0 guard kept out of the
camera and lamp passes, and either a second posed skeleton (more CPU, the opposite of this slice) or LOD1 geometry
skinned on LOD0's skeleton (a remapped bone-index buffer per base, a new shader variant to warm). It saves GPU vertex
work only (GPU already passes G8: +0.5 ms at 24 alert, far under 15 ms) for the few guards now inside 6 m. Design if
wanted later (S9 owner + Player Build): the CSM shadow map's `cameraForLOD` (or a cascade-list hook in `world.ts`) +
a per-guard LOD1 proxy on LOD0's skeleton; `GUARD_LOD` gets a `cascadeLod` entry then.

## Expected savings (estimates; the laptop A/B decides)
- guard-cap places guards on rings 5, 6.5, 8, 9.5 ... m in front of the camera (1.6 m apart, +-60 deg): at 24 about
  6 / 8 / 10 guards on the first three. Before, every one of them was LOD0 (all under 8.8 m). Now the 8 m ring (~10
  guards) is LOD1: 23 instead of 33 bones, no finger pose, ~8 k instead of ~26 k skinned vertices in every pass. The
  6.5 m ring sits inside the hysteresis band and stays LOD0 when it is first seen from close.
- Per figure pose (poser solve + bone compose + skeleton prepare / upload) is roughly linear in bones: ~30 % less per
  guard moved to LOD1, plus the finger rebuild. Order of -0.1 to -0.3 ms CPU at sectorops 24 facing, GPU -0.1 to
  -0.3 ms. The patrol / alert cells have no guard beyond 25 m, so the LOD2 half rate and fold show only on bigger maps
  (campusops) and with a partner near a far guard (tier full rate).
- (a): nothing on this branch (no freeze); after the master merge it removes the figure pose of every frozen guard
  (the away cell and campus worst views).
- Honest read: S11's planned -0.3 to -0.6 ms may need S9 / S10 / S12 too; if sectorops 24 patrol still misses +0.5 ms,
  the next CPU lever is the poser fallback (PLAN 6: bind the bases in the rig's rest pose, no retarget).

## What the master merge must keep (train 51 changed `animTierView.ts`; line numbers move)
1. `src/ai/animTierView.ts`: master's `dt(dt, pos, players, pinned, frozen = false, shown = false)` with this branch's
   `private lastDt = 0;`, `get skipped()` and `this.lastDt = animTierStep(this.st, animTierPeriod(i), dt); return
   this.lastDt;`; plus guard-models' `watch()`. Keep master's `animate`, `thawing`, `solveNow` as they are.
2. `src/ai/enemy.ts` `Enemy.frame`, non-dog branch: `if (gb) this.animTier.watch(gb.viewMesh);` then master's
   `this.animTier.animate(this.rig, dt, rp, this.ctx.players(), pinned);` then `if (gb) gb.skip = this.animTier.skipped;`
   (drop this branch's `tierDt` / `this.rig.animate(dt, rp, tierDt)` lines: `animate` does both).
3. `src/ai/guardBody.ts` `frame()`: keep `(!this.skip && this.rig.root.isEnabled(false)) || f.current < 0`.
4. Thaw frame (known, not a regression): master's `thawPose` solves the rig during the camera evaluation, after
   `GuardBody.frame` ran, so the figure shows the pre-freeze pose for one frame (the pre-S11 code posed from the
   still-frozen rig at that point: same result). Optional at the merge: `thawPose` ends with
   `this.gbody?.figure.update(this.ctx.scene.activeCamera)` to pose it in the same frame.

## Files
- `src/operators/runtime/guardLod.ts` (new: `GUARD_LOD`, `guardFolds`, `guardPosesNow`)
- `src/operators/runtime/guardFigure.ts` (folds at load, guard edges, half-rate pose, `slot`, `poses`, `lodBoneCount`)
- `src/operators/runtime/lodPick.ts` (optional `edges` on `bandLod` / `pickLod`)
- `src/ai/guardBody.ts` (frozen skip), `src/ai/animTierView.ts` (`skipped`), `src/ai/enemy.ts` (one line)
- `scripts/operators/guardSheetPlan.mjs` (the Hollowmere / night-vision line-up at ~7 m forces LOD0: it promised "LOD0
  as in play", which ends at 6 m now; the sheet's hash changes, so the next sheet bake redraws it)
- Tests: `tests/guardLod.test.ts` (new, 3), `tests/guardFigure.test.ts` (+3), `tests/guardBody.test.ts` (+2),
  `tests/guardSheetPlan.test.ts` (asserts against `GUARD_LOD.edges`)

## Tests (one at a time)
- `tests/guardLod.test.ts` 3 pass: bands 6 / 25 with hysteresis, Wren still 8 / 25; folds (bake LOD1 23, LOD2 19);
  half-rate parity per slot, out-of-phase and every-4th callers pose on every call.
- `tests/guardFigure.test.ts` 17 pass (+3): LOD1 / LOD2 bone counts on the fixture (23 / 22 / 20: one finger, two toes,
  no clavicles in it), every skin index inside its skeleton, each LOD2 bone at its LOD0 position < 1e-4 m after a walk;
  LOD distances on the figure (3 / 6.5 / 6.7 / 5.5 / 5.3 / 27 / 28 m); LOD2 half rate (slots 0 / 1 alternate, switch
  poses, odd-frame caller every call, skipped frame leaves the skeleton unmarked, LOD1 every frame). The stand-in test
  on Wren's real LOD2 (toes and clavicles folded now) still matches Wren's own figure < 1e-4.
- `tests/guardBody.test.ts` 16 pass (+2): rig root disabled -> no `figure.update` without any `skip` (first show still,
  thaw resumes); `GuardAnimTier.skipped` equals `dt() < 0` on the far tier.
- `tests/guardFigureWarm.test.ts` 7, `tests/guardLampCasters.test.ts` 4, `tests/guardAssets.test.ts` 34,
  `tests/guardSheetPlan.test.ts` 21 (failed on the 8 m line-up before the plan fix), `tests/operatorsRuntime.test.ts`
  18 (+1 skipped), `tests/animTier.test.ts` 14.
- `npx tsc --noEmit -p .` clean; eslint on the changed files clean. No e2e, no GPU run, no full vitest.

## Laptop A/B (Test Runner, GPU slot alone, heavy.lock)
At this branch's head, `npm run build`, port 4189 freed before and after:

```
E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,campusops --counts=0,12,24 --cells=patrol,away,alert --query=guardmodels=1 --out=C:/NightShift/scratch/gm-s11/on
E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,campusops --counts=0,12,24 --cells=patrol,away,alert --query=guardmodels=0 --out=C:/NightShift/scratch/gm-s11/off
```

Read: sectorops 24 frame CPU p95 ON - OFF per cell (gate +0.5) against the G8 cull rerun (c76cf326); render() CPU per
cell; campusops 24 alert draws <= 600 and GPU p95. If patrol still misses +0.5 with equal draws, log the LOD histogram
per cell (how many figures at LOD0 / 1 / 2) before the next lever.

Open: no changelog fragment line (the guard-models lead owns `changes/feature-guard-models.md`); PLAN 5's table header
still says LOD0 < 8 m (lead's file).
