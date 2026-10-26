# Piano GA4 check A (head d60ca5316)
Checker A (Opus, fresh): correctness and intent. Read-only review; this file is the only write.

**PASS**

The actor does what the 30-38 s intro needs: walks an (x, z) polyline at its own playback rate with the aimed upper
body (strafe-locked to `aimAt`), eases onto the end point and idles aimed, fires with kick and a rate-scaled flash on a
re-arm in its own time, exposes the drawn gun's muzzle for tracers, and disposes cleanly. It is not a guard. The one
shared-file change (`src/vfx/vfx.ts`) leaves every existing caller's behaviour unchanged. Nothing broken, unsafe or
off-intent found.

## Findings (verified, with refs)

**Rig and look match Enemy.**
- Build: `guardActor.ts:110` calls `buildEnemyRig(scene, world, def, name)` exactly as `enemy.ts:715`. That one call
  adds the rig and merged-gun shadow casters (`enemyRig.ts:30,36-37`), builds the `GuardBody` figure behind
  `flags.guardModels` (`enemyRig.ts:29`) and puts the gun in hand (`gun.hold(rig)`, `enemyRig.ts:39`). The figure is
  posed by its own `onBeforeRender` registry (`guardBody.ts:63-70`), so it follows the actor's rig without an
  `animTier`. `setLook` is called once (`guardActor.ts:114`); Enemy calls it every frame only because the manager sets
  the seed after building (`enemy.ts:4225`).
- Motion: `guardActor.ts:178-186` sets `mi.vx/vz` (path heading x pace), `mi.yaw` (aim point, else travel heading),
  `aiming = true`, `sprinting = false`, then calls `m.step(t, mi, ENEMY_MOTION)`. This matches `enemy.ts:3963-3970`
  with a face yaw and `aimedMotion`. The guard's separation, player push, `tryMove` and nav cell are rightly absent.
- Height with `nav`: the ease `(gh - y) * min(1, t * 12)` (`guardActor.ts:197-200`) matches `enemy.ts:4008-4009`.
- Pose: `guardActor.ts:245-283` matches `Enemy.frame` (`enemy.ts:4219-4271`) for a drawn, firing, uncovered,
  non-climbing guard:
  - speed and local axes from velocity;
  - `aim = GUARD_AIM.fire` (1, what `aimWeight()` gives in `attack`);
  - kick decay at 8/s (`enemy.ts:4220`), with `rp.kick` zero for melee;
  - phase, motion, motionT, accel and goalYaw from the driver;
  - `stride 'velocity'` (`enemy.ts:4256` gives it when aiming >= 0.5);
  - `ready = false`, `swap = -1` (a drawn `GuardCarry`; `carryRaise` passes aim through, `carryState.ts:65`).

  `rig.animate(t, rp, t)` (`characterRig.ts:1749`) solves every frame with no camera LOD. That is right for a few
  cinematic actors.
- Aim pitch: `guardActor.ts:205-208` uses the same formula as `enemy.ts:4012-4014`, with the horizontal distance to the
  aim point.
- Fire: `guardActor.ts:216-226` uses the same flash sizes (0.3 heavy / 0.2) and `kick = 1` as `Enemy.shoot`
  (`enemy.ts:3883-3884`). Re-arm is `60 / rpm` in actor time, decayed by `t` (`:209`), so it scales with rate. The
  flash comes from `gun.muzzleWorld` (`weaponModel.ts:754`), which is better for tracers than Enemy's formula muzzle.
  The no-gun fallback copies `Enemy.muzzle` (`enemy.ts:3840-3846`).
- Dispose: gun, figure, rig (`guardActor.ts:286-292`), the same order as `enemy.ts:4332-4334`. Casters leave
  `lightRig` and `charCasters` through their `onDisposeObservable` hooks (`lightRig.ts:476`, `world.ts:443`). The
  figure unregisters from the live list (`guardBody.ts:244`). The test confirms the mesh and node counts return to
  their earlier values.

**Not a guard.** Imports (`guardActor.ts:18-32`): babylon (through `core/babylon`), types, `enemyRig`, `guardStance`
(a constant), `perception` (only the `EYE_STAND` constant; perception imports only mathx/groups/lights), `motion`,
`movement`, `mathx`, the path module. None of these: `EnemyManager`, `Hitboxes` (built in the Enemy constructor,
`enemy.ts:725`, not in `buildEnemyRig`), registry, occupancy, nav cells, hearing, barks, score, `src/net`. The only
shared registry the actor joins is `liveGuardBodies`, which gameState reads only for the render-readiness gate
(`gameState.ts:2595, 2680`). That is render-side and harmless; it arguably helps, since the intro waits for the
actors' figures.

**vfx.ts change.**
- The `life` default of 0.05 equals the old hard-coded `f.max`.
- `FLASH_COLOR` holds the same values as the old per-shot `Color4`.
- Nothing mutates a flash's `instancedBuffers.color` in place (grep of `src/vfx`), so the shared reference is safe.
- All four existing callers (`enemy.ts:3883`, `playerWeapons.ts:1082`, `remoteAvatar.ts:864`, `coopClient.ts:804`)
  pass at most two arguments and see no change.

**Edge cases (traced).**
- **Rate 0:** `step` returns early (`:165`), so the pose, re-arm and kick are held. `fire()` can still return true
  once, with a 1 s flash (life floored at rate 0.05), and the kick shows on the next step at a positive rate. This is
  harmless and the intro never uses rate 0.
- **`setRate` mid-walk:** only scales `t`; the driver state is in actor time, so the switch is seamless (tested).
  `NaN` and negative values map to 0.
- **`dispose` twice:** guarded (`:287`). `step`, `fire` and `muzzle` after dispose are a no-op, return false and use
  the formula fallback respectively (tested).
- **One-point path:** `done` at build, holds the given yaw (tested). The path heading is 0 (`guardActorPath.ts:78-82`).
- **Very short path (<= 3 cm):** `done` at build and he stands on the first point, at most 3 cm off the end.
  Negligible.
- **Short path (> 3 cm):** the eased pace and the clamp at `length` (`:190`) keep him on the end point.
- **Repeated points:** no NaN heading (`guardActorPath.ts:55-66`, tested).
- **Corner:** sampled onto the next leg exactly at the corner point (`guardActorPath.ts:99`).
- **Hot path:** `step`, `fire`, `muzzle` and `sample` allocate nothing: scratch fields, `hyp2`, indexed loops, and
  `muzzleFlash` no longer allocates. No `Math.hypot`.

## Assumptions A1-A7
- **A1 (fixed y default 0, optional `nav`):** acceptable. Consumer note: two of the four intro guards come "down the
  main stair" (PLAN section 2, 30-38 s row). Campaign must pass `nav` for those actors, or the fixed y floats them
  over the steps. Put this in the hand-over to Campaign.
- **A2 (extra opts):** fine; `vfx` and `nav` are needed, and `look` / `name` are cheap.
- **A3 (30 settle frames at build):** fine; it only advances the rig's clip clock, at build time.
- **A4 (`muzzleFlash` life parameter):** fine; verified above.
- **A5 (1.0 m/s^2 ease, 3 cm arrive band):** fine. `ENEMY_MOTION.decelMax` is 2.0 (`movement.ts:103`), so the ease
  is half the cap as stated. The test lands within 5 cm.
- **A6 (extra getters):** fine.
- **A7 (dog throws, melee never fires):** fine; the intro uses rifle guards.

## Runs
- `npm run typecheck:fast`: clean (exit 0).
- `npx vitest run tests/guardActorPath.test.ts tests/guardActor.test.ts tests/levelLitMaterial.test.ts`: 3 files,
  20 tests passed (8 path + 9 actor + 3 levelLit).
- `src/ai/enemy.ts` is unchanged against origin/master.

## Polish (non-blocking)
1. `guardActor.ts:101`: `Math.max(0, opts.rate ?? 1)` gives NaN for `rate: NaN`. A NaN rate freezes the actor and
   makes the flash life NaN, which never expires in `vfx.ts:350`. Use the same guard as `setRate` (`r > 0 ? r : 0`).
2. `guardActor.ts:189-194`: once `s` is clamped at `length`, `vx/vz` still carry the driver's residual speed until
   `m.speed < 0.02`. That is a brief step-in-place, about 0.1 s of his time. Zeroing `vx/vz` when the clamp bites
   would plant the feet at once. It is only visible on the GPU.
3. `step` does not cap `dt`, so a long render hitch (tab switch) jumps him along the path. For a timeline-synced intro
   this is arguably correct; a cap such as 0.1 s is a Campaign choice.
4. Consumer arithmetic, for Campaign: 8 s real at 0.3x is 2.4 s of actor time, about 2 m at the grunt's 0.9 m/s
   (less the weighted start). Either start points about 2 m behind the stop spots, or a larger `speed`.
5. `muzzle()` with a gun reads `gun.muzzleWorld`, which recomputes the gun node's world matrix from its parents' cached
   matrices. Called right after `step` in the same frame, it may lag the new pose by a frame. This is invisible at
   0.3x.
