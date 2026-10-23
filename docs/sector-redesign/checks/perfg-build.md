# perfg build: guard-side campus perf (2026-10-23, Opus, branch feature/sector-redesign-perfg off -artpol 1d34c348)

Answers `campus-perf-fix.md` "Proposals for guard-ai / guard-render" 1-3. Render / anim only: no AI, sim, hit volume,
`src/net`, PROTOCOL or save change. Baseline (laptop, Epic, 24 guards, freeze on, 1d34c348): start 13.4, S4-worst 12.1,
S5-worst 13.1, S3-worst 10.6 ms CPU p95; guard-cap campus alert 18.1 ms, 583 draws.

## Changes
1. FROZEN anim tier (proposal 1).
   - Branch fact: `src/ai/animTier.ts` (guard-render S4) is on master, not on this branch (the -artpol line is 311
     commits behind master; merging master here conflicts in 5 files, none ours). So the rule is its own pure module,
     written to fold into `animTier.ts` at the merge: `src/ai/animFrozen.ts` (`animFrozenStep` :24,
     `ANIM_FROZEN_CARRY_MAX` = 0.1 s :11).
   - `src/ai/enemy.ts:2803` (`Enemy.frame`): while the rig root is disabled (`!root.isEnabled(false)`: the render
     freeze's flag, `sectorGuardFreezeView.ts`), `CharacterRig.animate` is skipped entirely (clip graph, foot planner,
     IK, weapon glide); the time is carried (capped 0.1 s) into the first solve after the thaw. State `:218`, import `:47`.
   - Merge note for master: master's line is `this.rig.animate(dt, rp, this.animTier.dt(...))`; resolve as
     `if (sd >= 0) this.rig.animate(sd, rp, this.animTier.dt(sd, ...))` (or give `GuardAnimTier` a frozen input that
     returns the skip), so a frozen guard neither solves nor ticks the tier.
2. Merged guard gun (proposal 2). The gun parts drew with `partMat` (`partLibrary.ts:103,115`); the merged gun moves
   them to `partSkinMat` (the same `make()` settings plus the voxel / smooth plugins), as the merged body does. The
   no-look-change claim rests on the GPU look shot, not on code.
   - `src/ai/enemyGunMerge.ts` `mergeGun` (:25): the gun's part instances (rifle 18, pistol fewer) are merged once per
     (part library, gun type, part placements and instance values) with the merged body's own pure `mergeParts`
     (`smoothBodyMerge.ts`): per-vertex colour, `pattern`, `color2`, `ppos` / `pnrm` = the instance values, on the same
     `partSkinMat` the merged body uses (its `SmoothBodyPlugin` restores the pattern / surface space). Hi and low LOD as
     the part bases (`lib.trackLod`). Each guard gets ONE `InstancedMesh` of that source, parented to `gun.node`, so it
     follows the hand / holster / travel and `setVisible` exactly as the parts did; the parts stay, disabled (as
     `WeaponModel.useMesh` does for the baked mesh). The ENEMY_GUN colours are kept bit for bit (read back from the
     instances, not re-derived). Sources go with the library (`skinMaterial` dispose).
   - `src/ai/enemyRig.ts:26`: `mergeGun` after the gun is built; the merged instance is the shadow caster (the 18 parts
     are no longer registered, so the light rig and sun caster lists shrink too). Off with `?guardmerge=0` (the body
     merge's flag: one A/B for both), and skipped when the gun renders a voxel model or a baked mesh.
   - Not taken: the baked `WeaponModel` mesh (look change, needs the look owner) - the proposal's other option.
3. Dog rig (proposal 3): no change needed. `Enemy.frame` already calls `CharacterRig.animate` only in the non-dog
   branch (`enemy.ts:2797-2805`; same on master), and the dog's humanoid root is disabled at spawn (`:396`). The
   proposal's "a dog's hidden humanoid rig still animates every frame" does not hold on this branch or master.

## Expected saving (estimate, not measured on a GPU)
- FROZEN tier: the anim of a frozen guard, ~0.054 ms each (`campus-perf-fix.md` "Cause" 3: bench 59 us, laptop
  `ai.anim` 54 us). S5-worst 16 frozen: ~-0.85 ms; S4 16: ~-0.85; S3 13: ~-0.7. Start / views with few frozen: little.
- Merged gun: ~70 us per VISIBLE guard in the bench (18 instances evaluated, bounded and instanced per pass; 6.2 -> 4.0
  ms at 24 facing with the gun parts off); frozen guards already skip it. Helps the facing cells most: guard-cap 24
  facing / alert ~-1.5 ms CPU; S5-worst (8 drawn) ~-0.5 ms. Draws: all guards' guns of one type are one instanced draw
  per pass (hi or low LOD), against the shared part-base draws before: equal or fewer.
- Together, on top of the freeze: S5-worst ~13.1 -> ~11.7, S4 ~12.1 -> ~10.9, S3 ~10.6 -> ~9.6, guard-cap alert
  ~18.1 -> ~16.5 (CPU p95, rough: the bench ratios on the laptop's numbers).

## Tests (desktop, single files under sr-slot-1)
- `npx tsc --noEmit -p .` clean; eslint on the changed files clean.
- New `tests/animFrozen.test.ts` 4/4: drawn solves every frame; frozen skips and carries, thaw gets dt + carry and
  clears it; long freeze capped at 0.1 s; one big frozen frame capped.
- New `tests/enemyGunMerge.test.ts` 3/3 (NullEngine, real `PartLibrary` / `WeaponModel`): one instance on the gun node,
  parts disabled, every merged vertex at its part instance's world place (< 1e-4 m) with its instance colour, hi and
  low LOD, `pattern` / `color2` / `ppos` / `pnrm` present; two rifles share one source, the pistol its own;
  `setVisible` hides it, dispose takes it and keeps the shared source; `?guardmerge=0` keeps the parts.
- Kept green: sectorGuardFreeze, sectorGuardFreezeView, sectorGuardFreezeSeeThrough, smoothBody, smoothBodyMerge,
  guardHeadParity, enemyManagerDespawn (9 files, 210 tests with the new ones). No test builds an `Enemy` frame directly.
- Not run (as ordered): e2e, perf.mjs, guard-cap, dev server.

## What the laptop perf rerun must check (4189, GPU slot alone, `npm run build` on this head)
- The `campus-perf-fix.md` laptop rerun commands (S3 / S4 / S5 views, perf.mjs on campusOps, guard-cap campus 0 / 24
  patrol / away / alert), A/B: as is, `&guardmerge=0` (gun parts back; also the body merge, so compare against the
  1d34c348 numbers too), `&guardfreeze=0` (no freeze: the FROZEN tier never triggers).
- Pass: S5-worst and S4-worst CPU p95 < 12 ms at 24 guards, S3 stays < 12, start < 12 if it moves; guard-cap alert CPU
  below 18.1, draws <= 583; GPU p95 unchanged or lower.
- Look (one shot each, near and at 16 m+ for the LOD): a guard's rifle and pistol look the same as on 1d34c348 (colours,
  pattern / surface, lighting), cast a shadow, sit in the hands in aim / low ready, holstered and through a draw.
- Thaw: turn the camera fast onto a frozen guard group and step past a corner: no visible pose pop beyond the
  freeze's own known edges (a guard thawed in the evaluation he becomes visible shows his pre-freeze pose for that one
  frame, then the capped catch-up solve; the freeze's frustum pad and FREEZE_SIDE margin usually thaw him earlier).
- e2e that should cover it (Test Runner queue): sectorops, smoke, stealth-ai.
