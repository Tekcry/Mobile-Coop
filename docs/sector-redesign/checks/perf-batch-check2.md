# Perf batch check 2: src/ai part (perfg), independent second Opus checker (2026-10-23)

Scope: `git diff 1d34c348..4f66a5f8 -- src/ai tests` (perfg: `src/ai/animFrozen.ts`, `src/ai/enemy.ts:2802-2804`,
`src/ai/enemyGunMerge.ts`, `src/ai/enemyRig.ts:25-28`, `tests/animFrozen.test.ts`, `tests/enemyGunMerge.test.ts`).
Written before reading the first checker's verdict (`perf-batch-check.md`).

## Verdict: PASS (no blocking items)

Nothing gameplay reads depends on the frozen skip or the merged gun. Every issue found is cosmetic or a merge note:
polish list below.

## Checks run (desktop, sr-slot-1, `--maxWorkers=2`)
- `npx tsc --noEmit -p .`: clean.
- vitest: animFrozen, enemyGunMerge, sectorGuardFreezeView, smoothBodyMerge, enemyManagerDespawn: 5 files, 22/22 pass.
- No e2e, no src edits (as ordered).

## What was checked and holds
- Gameplay reads of the guard pose (`enemy.ts`): perception eye, shot origin (`shoot` :2502, from `eye()` + yaw
  offsets, never `muzzleWorld`), hit volumes (`hitboxes.sync(pos, head)`, sim `guardHead`), torch (`placeTorch` :1288,
  sim pos / yaw / crouch), sniper laser and glint (`eye()`): none read a bone. The only `this.rig.*` reads besides
  `animate` are root, emote writes, `heldWeapon`, `setFlash`, dispose.
- Takedown / grab / interrogate (`takedownController.ts:547-600` reads the victim's neck, shoulders, head):
  `beginTakedown` sets `taken` at the press (`enemy.ts:460`), the freeze drops taken guards at its next evaluation
  (`sectorGuardFreezeView.ts:163,195`), so at most one frame of stale neck. Carry / hoist use the Body's own rig.
- Dead / KO: `frame` returns before the anim when `!alive`; the freeze thaws them. Dog: unchanged branch; the dog's
  humanoid root is disabled at spawn and the freeze never touches dogs.
- Root disabled only by the freeze and the dog (grep): the skip cannot trigger for any other reason.
- Co-op client: puppets (`src/net/enemyPuppet.ts`) are not `Enemy`, never call `animFrozenStep`, and are not in the
  freeze's list (`em.enemies`), so client poses are unchanged. They do get the merged gun via `buildEnemyRig`;
  `setVisible` (node), `die` (rig handed to the ragdoll with the gun under it), `dispose` (rig root recursive) all
  work on the single instance under `gun.node`.
- Thaw: order is `Enemy.frame` (skip, root still disabled) -> render evaluation thaws -> one frame drawn with the
  pre-freeze local pose at the current root; the next frame solves `dt + carry` (cap 0.1 s). Root moves > 2 m while
  frozen reset the foot planner (`characterRig.ts:1833-1841`), the glide skips stale matrices (`GLIDE_FAR`).
- Merged gun: same `metadata.library` path as the merged body; `isVisible = false` source with drawn instances, as
  the part bases (`partLibrary.ts:126`); LOD via `trackLod` follows the Detail setting (`setLodScale`); sources die
  with `skinMaterial`; instances die with `gun.node` / rig root; shadow caster lists drop disposed meshes. Voxel or
  baked-mesh guns are left alone (`renderMeshes !== parts`). Helmet, armour, shield are rig parts or own meshes, not
  touched. Thermal `setHeat` touches body parts only (guns were never warm); electro never lists guard guns.
- Allocation: `animFrozenStep` and the `isEnabled(false)` read allocate nothing. `mergeGun` allocates at spawn only.

## Polish (non-blocking)
1. Foot stretch after a short freeze. The planner keeps feet locked in world space; a guard frozen while walking
   0.3-2 m (under the 2 m jump reset) thaws with planted feet up to 2 m behind the root, so the legs stretch / drag
   for a step (~0.3 s), not one frame. Fix idea: in `Enemy.frame`, when `animFrozenStep` returns a thaw solve after a
   skip and the root moved more than ~0.3 m since the freeze, reset the planner (as the jump rule does). Add to the
   laptop thaw look check (perfg-build "Thaw").
2. Ragdoll seed after an off-screen kill. A guard killed while frozen (co-op partner's shot, a grenade out of the
   host's view) seeds his ragdoll (`ragdoll.ts:41-47`) from the pose at freeze time, and `Body.pos` (hips, read by
   body discovery and carry) follows that ragdoll. Offsets are small (both are upright poses at the current root;
   worst case a stale climb or high-cover pose), but strictly the host's body position now depends on whether the
   host's camera saw him. Fix idea: in `die()`, if the root is disabled, run one `rig.animate(0.1, rp)` before
   `addBody`.
3. Master merge (`animTier.ts`). Master's `animate(dt, rp, tierDt)` runs the weapon glide every frame and the tier
   carries its own skipped time. Resolve as the build doc says (`if (sd >= 0) this.rig.animate(sd, rp,
   this.animTier.dt(sd, ...))`) so a frozen guard ticks neither; or fold FROZEN into `animTierPeriod` as a first rule
   returning "skip, carry capped". Check that the thaw frame is not then skipped by the far tier (period 2): the
   off-screen tier is fine, since the thaw render marks the body seen. Keep the near-player rule below FROZEN (render
   only, safe). `animFrozen.ts`'s cap (0.1 s) differs from the tier's uncapped carry: keep the cap for the frozen case.
4. Doc fix in `enemyGunMerge.ts` header and `perfg-build.md`: the gun parts drew with `partMat`, not `partSkinMat`
   (`partLibrary.ts:103,115`); the merged gun moves them to `partSkinMat` (same `make()` settings plus the voxel /
   smooth plugins), like the merged body. The no-look-change claim rests on the GPU look shot already listed.
5. The baked pattern space (`patScale`) is read once at spawn; if anything scales a guard rig later, the gun's
   surface / pattern scale would not follow (guns have no body pattern, so only the surface term). Cosmetic.
6. `?guardmerge=0` turns off both the body and gun merges, so the perf A/B cannot isolate the gun's share; a separate
   flag (or reading the 1d34c348 numbers, as the build doc says) is enough.
7. The 18 disabled parts per gun stay in `scene.meshes` (cheap disabled skips); disposing them would need
   `WeaponModel.dispose` to tolerate it. Leave unless the mesh count shows in a profile.
