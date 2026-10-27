# Piano GA4 check B (head d60ca5316)

**PASS**

Checker B (Opus, fresh): performance, resources and test strength. Read-only review of `git diff origin/master...HEAD`
against the brief (`PIANO-GA4.md`), `CLAUDE.md` hard rules and `docs/systems/conventions.md` hot paths. The builder's
report was read only after this view was formed; it agrees on every point below except the wording of the allocation
claim (finding 2).

## Findings

1. **Per-frame allocation in the actor's own code: none beyond V8 double boxing.** Measured with the repo's
   `tests/helpers/allocPerCall.ts` (`bytesPerCall`, scratch probe outside the repo, guardModels off, NullEngine):
   | Call | Bytes / call |
   | --- | --- |
   | `step` walking, rig stubbed out | 112 |
   | `step` idle at the end, rig stubbed out | 32 |
   | `MotionDriver.step` alone (walking / idle, `ENEMY_MOTION`) | 80 / 16 |
   | `muzzle(out)` | 16 |
   So `GuardActor.step` minus the driver reads 16-32 B: HeapNumbers only (no object, vector, closure, string), the
   standard `playerStepAlloc.test.ts` accepts. `fire` (via `muzzle` + `Vfx.muzzleFlash`) adds nothing: the per-shot
   `new Color4` is gone (`src/vfx/vfx.ts:198`). No closures, iterators or `for...of` in `step` / `fire` / `muzzle` /
   `pose` / `sample` (`src/ai/guardActor.ts:173-296`, `src/ai/guardActorPath.ts:76-106`); string literals for
   `rp.stride` / `rp.traverse` are constants, not built.
2. **`rig.animate` allocates 1.4 KB (idle) to 2.8 KB (walking) per call** (`src/ai/guardActor.ts:284`; measured on the
   actor's own rig and pose). This is `CharacterRig.animate`, the same call every real guard makes through its anim
   tier, so it is pre-existing and outside this slice; the report's "`step`, `fire`, `muzzle` allocate nothing"
   (`src/ai/guardActor.ts:16`) is true of the actor's code, not of the full frame. Not a fix for this PR; worth a
   line for whoever owns rig hygiene (four actors at 60 fps: about 0.5-0.7 MB/s of young garbage for the ~8 s intro).
3. **Rig solve per frame for four actors is acceptable.** `rig.animate(t, rp, t)` passes `solveDt`, which bypasses the
   rig's camera anim LOD (`src/player/characterRig.ts:1753-1765`): every actor solves every frame. Measured 0.20 ms per
   frame for four walking actors (node, NullEngine, guardModels off). Real guards near the player solve every frame
   too; four extra rigs during a render-only intro with no AI running is well inside budget. The 30 settle frames at
   build (`src/ai/guardActor.ts:116`) are a one-off.
4. **Dispose leaves nothing behind.** `dispose` (`src/ai/guardActor.ts:288-294`) mirrors `Enemy.dispose`
   (`src/ai/enemy.ts:4332-4334`: gun, figure, rig). Scratch probe over four build / walk / fire / dispose cycles:
   meshes, transform nodes, materials, textures, geometries, skeletons and `onAfterRender` / `onBeforeAnimations`
   observers all return to the baseline. `onBeforeRenderObservable` grows by one `() => container.dispose()` per actor:
   that is Babylon's own deferred `_executeActiveContainerCleanup` (`scene.pure.js:3871`, `addOnce`), which runs on the
   next render (the NullEngine test never renders), not a leak. Shadow casters: `World.addShadowCaster` and
   `LightRig.addCaster` remove each mesh on its `onDisposeObservable` (`src/world/world.ts:443-463`,
   `src/world/lightRig.ts:476-480`), so disposing the meshes is the unregister. The guard figure (flag on) unregisters
   from the per-scene `GuardBody` list in its own `dispose` and is also freed by the rig root's dispose
   (`src/ai/guardBody.ts:151`, `241-249`); its casters go the same way. The actor registers no observer of its own.
5. **Shared flash `Color4` is safe.** Babylon copies each instance's `instancedBuffers.color` into the instance data
   with `toArray` on every render (`instancedMesh.pure.js:671-693`); the reference is never kept. The flash pool is
   private to `Vfx`, and nothing in `src/` mutates an `instancedBuffers.color` in place (grep), so no later caller can
   change it today.
6. **Hard rules:** Babylon only via `../core/babylon` (`guardActor.ts:18`), type-only imports use `import type` /
   inline `type`, no `Math.hypot` (`hyp2` throughout), no `src/net`, no `EnemyManager`. The test's direct
   `@babylonjs/core/Engines/nullEngine` import is the established test pattern (112 test files).
7. **Test strength** (would they fail if broken?):
   - Rate scaling: yes. Ignoring the rate makes `ds / df` about 1 (bound 0.28-0.32); a driver stepped with real `dt`
     instead of `t` shifts the from-rest comparison (3% bound) as well.
   - Stop: yes. `done` never set, an overshoot, or drift after arrival each fail (end within 5 cm, position held
     exactly over 10 s, facing the aim within 0.1 rad).
   - Re-arm: yes. No gate fails the second `fire`; re-arm on real time instead of actor time fails the 0.3x case
     (`gap * 1.1` real seconds must still be false). Margins checked for grunt rpm 420 (gap 0.143 s): 7 vs 10 frames at
     rate 1, 30 frames = 0.150 actor s vs 0.143 at 0.3x. Deterministic: fixed `DT`, no wall clock, no tautologies.
   - Flash life: yes, against the real `Vfx` (a dropped `life` argument hides the flash at the 0.1 s update).
   - Dispose: yes for meshes, nodes and casters (a skipped gun or rig dispose leaves meshes).

## Runs
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/guardActorPath.test.ts tests/guardActor.test.ts tests/levelLitMaterial.test.ts`: 3 files,
  20 tests passed (8 path, 9 actor, 3 levelLitMaterial).
- Scratch probes (in the session scratchpad, not committed): leak counts over four create / dispose cycles, 4-actor
  frame time, `bytesPerCall` on `step` / `fire` / `muzzle` / `rig.animate` / `MotionDriver.step` (numbers above).

## Polish
- The pose clock at the rate is not asserted: passing `dt` instead of `t` to `pose` / `rig.animate`
  (`guardActor.ts:221`, `284`) or to the kick decay (`:219`) fails no test. A cheap check: the rig's gait phase (or
  `m.phase`) after N steps at 0.3x equals that after 0.3N steps at 1.
- The flash life is fixed at `fire` time (`guardActor.ts:235`): a `setRate(1)` at the EMP press leaves an in-flight
  0.3x flash up to ~0.17 s. Harmless.
- `FLASH_COLOR` (`vfx.ts:47`) is shared by reference: if anyone later fades a flash by writing
  `instancedBuffers.color.a`, every flash changes. A one-line comment saying "never mutate" would guard it.
- Dispose test does not check `scene.materials` / `scene.geometries` (they do return to baseline today) and runs with
  `flags.guardModels = false` only (the report already lists the figure path as open).
- Source check regex `/\/net\//` (`tests/guardActor.test.ts:204`) would miss a bare `'../net'` index import.
- `pos` is typed `Readonly<Vector3>`, which still exposes `set` / `copyFrom`; a caller could move the actor's feet.
