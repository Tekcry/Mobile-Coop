# LR16-6 check B (Opus, engine safety and perf)

Branch `feature/sector-redesign-lr16-6` @ 543cb6da (base 6e53e036), read-only in a detached worktree. Focus: per-frame
cost and allocation, mesh / material lifetime, Babylon imports, depth and render order, `Silhouettes.add`, the
`standIn` flag, the enemy / puppet one-liners.

## Verdict: PASS

No must-fix. Nothing broken, no parity leak, no perf leak.

## Checks run
- `npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors (42 warnings, none in changed files).
- `vitest --maxWorkers=2` (slot lock sr-slot-2): thermalThroughDoor, doorGhosts, vision, nightVision, visionIsolation,
  rig, animRig, enemyGunMerge, enemyLightsOut, enemyManagerDespawn: 10 files, 80 passed. No `silhouettes*` test file
  exists.
- No e2e, build or GPU (as briefed).

## Findings
- Per-frame loop (`doorGhosts.ts` `update` / `consider` / `warp`): indexed `for`, no closures or iterators, scratch
  `a` / `b` / `x` reused, `Vector3.Distance` static, `Math.sqrt` inline (no `Math.hypot`). Early gates: thermal off or no
  doors -> nothing; per rig: self / stand-in / cold, then range, then the door loop, and only then the 2 rays. Upload
  (`end`) only on frames with a figure or the frame they go.
- `Silhouettes.add`: the hoisted joint list has the same 22 joints in the same order as the old literal; without a warp
  `sc` is 1, so the limb radius `RADII * hk * (1 + 1) * 0.5` and the head (`hp` copy, same position) are unchanged. LKP
  ghost behaviour unchanged. The warp is applied to copies (`pts`, `hp`), never to the rig's cached positions.
- Lifetime: `DoorGhosts` is created lazily once per `GameState` (as at the base) on `this.world.doors` (`world` is
  `readonly`, one per match). Its 2 meshes and material belong to `world.scene`, which `World.dispose` (world.ts:576)
  disposes with the match; a sector restart (`restartCheckpoint`) keeps the world and the same doors list, so nothing
  is rebuilt or leaked. Thermal off: meshes disabled, alpha 0. `setGrey` / `setAlpha` are no-ops when unchanged.
- Depth and order: alpha 1 -> StandardMaterial opaque queue, depth write on, normal depth test, rendering group 0 (the
  old blob drew in group 1 over everything; this fixes the "over the player's own body" bug). The figure axis sits
  `doorFront` 0.06 from the leaf centre line = 0.035 m in front of the leaf face (`DOOR.thickness` 0.05). Depth
  resolution at 14 m with near 0.05 (24-bit) is ~0.25 mm (near 0.02: ~0.6 mm), so no z-fight. Limb cylinders and the
  head cross the leaf plane (an intersection, not coplanar faces); the outline is at the axis, in front of the face, so
  the silhouette shape is intact.
- Babylon: `doorGhosts.ts` / `silhouettes.ts` import only from `src/core/babylon.ts`; `thermalGhost.ts` is
  Babylon-free. Thin instances were already used by the LKP ghost, so no new side-effect import is needed. The test
  imports `NullEngine` directly (test only, as other tests do).
- `standIn`: read only in `doorGhosts.ts:67`; not in any snapshot or gameplay path; set in the constructor of
  `Enemy` (enemy.ts:444) and `EnemyPuppet` (enemyPuppet.ts:120) for quadrupeds only, next to the existing hide. Host
  and client both set it; no wire change.
- `gameState.renderVision`: `LIVE_RIGS` + `this.player.rig` as self works on host and client alike (one
  `operatorRig` per player, so no duplicate figure per partner). The `visionShown` label flash is render-only.

## Polish (not blocking)
1. The 2 rays allocate. `ballistics.ray` (ballistics.ts:112-134) builds a result object, clones the point and makes
   `Vector3.Up()` on a miss, plus a registry / props lookup on a hit: ~6-8 short-lived objects per candidate per thermal
   frame. Bounded (only rigs in range behind a shut leaf, usually 0-3) and the same as the base, but the build report's
   "No per-frame allocation" is not quite true. Fix: gameState.ts:2566 pass
   `(a, b, m) => this.ballistics.hitDistance(a, b, m)` (no allocation, ballistics.ts:83); in doorGhosts.ts type `ray`
   as `(from, to, mask) => number` and use `if (this.ray(this.a, this.b, GHOST_BLOCK) < Vector3.Distance(this.a, this.b) - 1e-4) return true;`
   (line 96) and `if (this.ray(this.a, this.b, GHOST_BLOCK) < Vector3.Distance(this.a, this.b) - BODY_SLACK) return true;`
   (lines 99-100); the test stub returns `wall ? 0 : 99`.
2. The leaf's collision body is 0.1 m thick (doors.ts:182, `DOOR.thickness * 2`) while `LEAF_GAP` is 0.2 m along the
   sight line, so at a grazing angle under ~14 degrees to the leaf the first or second ray clips the leaf's own body and
   no figure shows. Safe failure; if seen, step `LEAF_GAP / sin(angle)` or skip the leaf body by distance.
3. Co-op client body heat: `paintHeat` cools bodies only from `enemyMgr.bodies`, which the client lacks, so a client
   puppet lying as a body likely stays at full `bodyEmit` and now also ghosts through a shut door indefinitely, while the
   host stops after ~30 s. Render-only per peer (vision is not sent), not a gameplay parity break; verify in a co-op
   thermal look.
4. Photo mode skips `renderVision`, so the figure stays warped toward the gameplay camera; orbiting the photo camera
   shows it as a flattened figure in front of the leaf. If seen, `setAlpha(0)` on photo-mode entry.
5. Rigs hidden until their first snapshot (`EnemyPuppet` / `RemoteAvatar` `setEnabled(false)`) are still candidates
   for a frame or two at their spawn pose. Cannot gate on `isEnabled()` (the render freeze disables frozen guards'
   roots, which are meant to count); harmless.
6. `Silhouettes.jn` keeps the last captured rig's nodes referenced until the next `add` (one rig, tiny).
