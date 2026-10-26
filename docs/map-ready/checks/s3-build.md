# map-ready S3 - build report
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Sector Ops Build's desktop Opus builder (Opus 5.5), 2026-10-26, on the desktop instead of a cloud
builder. Brief `briefs/map-ready-S3.md` on `origin/cloud-queue` (read in full; not edited: the lead marks it). Branch
`feature/map-ready-s3` from `origin/feature/map-ready-s14` 763fc7bfb (W0 + S1 fix1 + S2 fix1 + S14), worktree
`C:/NightShift/Mobile-Coop-map-ready-s3`. Steps 1-5 built and pushed. Checks: tsc and the brief's vitest files only, at
below-normal priority; no e2e, no GPU, no dev server, no `npm run check`. Code head: 0c8589ea0 (step 4); this report
and the fragment are the step 5 commit on top.

Files: only the brief's list. No `src/net` edit or import; nothing in the never-touch list changed. Diff against
763fc7bfb: 13 files, +1011 / -37 (src +342 / -32, tests +661 / -5, the fragment +8).

## Step 1 - `src/ai/guardWarm.ts`, `tests/guardWarmSets.test.ts` (new) - 98ea62611
- `guardKindsFor(mapId, mode)`: `[]` for the sandbox, else a copy of `ENEMY_KINDS` (8 kinds, the dog too, A22). `mapId`
  is unused today (`void mapId`; S11 passes it).
- `warmGuardSets(scene, world, kinds)` (flag `mapReady`; off: resolves 0, builds nothing): per kind not yet warmed in
  the scene, one `TransformNode` `guard-warm-set-<kind>` at y = -1000, disabled, holding what `Enemy` builds
  (`enemy.ts:649-683`) through the same builders on a view `{ parts, map, addShadowCaster: no-op }`:
  `buildEnemyRig(scene, view as World, ENEMIES[k], 'guard-warm-set-' + k)` (one cast, comment citing
  `enemyRig.ts:21-41`), the dog's `DogModel` (its gun disposed as `Enemy` does), the enforcer's `buildShieldPart`, the
  sniper's `laser` / `glint` instances, and for every human kind `buildHelmetPart` / `buildArmourParts` with
  `gearColour`'s colours. Every mesh under the root `setEnabled(false)` and `isPickable = false`; the rig is a
  `standIn` (render passes walking `LIVE_RIGS` skip it). No `Enemy`, brain, hit volumes, audio, `enemyMgr` entry or
  caster list. With `flags.guardModels`: the dog's model and the sniper's parts only (no rig, no `GuardBody`; A23).
- The compile: the sets' own meshes (the merged bodies, hi and low) with no instances, and for every instance in a set
  its source mesh and the source's LOD meshes with instances (`engine.getCaps().instancedArrays`, as `Mesh.isReady`
  decides it): part bases, the merged gun source. Each is checked against every light of `scene.lights` (so the
  character and torch shadow tiles, which reach no mesh by light, are included), every shadow generator, every
  `renderPassId` of its map, every sub-mesh. Polled every 16 ms like `untilWarm`, 20 s give-up, one warn; never
  rejects; a second call builds nothing and waits for the first's compile. Measured: 8 sets, 547 meshes (55-77 per
  set, of them 53-75 instances), 260 nodes, 8 skeletons; sources covered: part capsule, cyl, dome, helmet, limbA,
  limbL, pill, rbox, rcyl, sphere, torso, torus and the merged rifle / pistolSd guns.
- `warmReady` generalised (no copy): `warmReady(m, lights, inst)` asks every sub-mesh and passes
  `needAlphaBlendingForMesh` as the depth pass's transparency (as `Mesh.isReady`); `untilWarm(scene, ready, warn)`
  takes the check. `warmGuardModels` passes each mesh's own `lightSources` and no instances, one sub-mesh per mesh;
  no generator in the game sets `enableSoftTransparentShadow` (the one depth define the transparency flag changes),
  so it compiles what it did. `tests/guardFigureWarm.test.ts` 7 / 7.
- Tests (NullEngine; a `DirectionalLight` + `ShadowGenerator` and a `SpotLight` + `ShadowGenerator` built like
  `charShadows.ts:317`; `mapReady` on, `guardModels` off; flags restored after each): 9 tests in step 1:
  (a) `guardKindsFor`; (b) one set per kind, every mesh disabled (own and inherited) and not pickable, the world's
  caster spy never called, no warm mesh in either cast list, the set rigs stand-ins; (c) after the warm, one guard of
  every kind built the way `Enemy` does (rig on a world whose `addShadowCaster` pushes into both lists, the dog /
  shield / sniper parts, helmet and armour), every new mesh made ready (main via `isReady(true)`, both generators'
  depth via `isReady(subMesh, useInstances, false)` under their render pass ids): `_compiledEffects` key count
  unchanged; plus a control: the same guards with no warm do add programs; (d) one real `EnemyManager.spawn` per
  ctcourse squad kind on the built ctcourse level (the `consoleNoticeA4` setup, hit volumes stubbed) after the warm:
  0 new keys; (e) flag off: 0, nothing built; (f) second call builds nothing; (g) a never-ready material (fake
  timers): resolves 8 after `WARM_GIVE_UP_MS` with one warn, never rejects; (h) `guardModels` on: no rig, no
  `GuardBody`, no fetch, only the dog's parts and the sniper's two.
- No STOP: (c) and (d) reach 0 new keys with the warm (see deviation 1 for the one scene-wide key the brief's setup
  made).

### Per-frame hooks a warm set joins through the builders (all O(1) per set, no allocation)
1. `SmoothBody` live list (`player/smoothBody.ts:162-169`, walked by `SmoothBody.frame`, `:306-322`): per set one body:
   `bones[0].markAsDirty()` (a flag; the skeleton is only prepared for active meshes, and the set's never is),
   `watchBodyEffect` for its two meshes (returns at `effect.isReady()` once the warm compiled it), and the
   re-parent check over its ~20 nodes (pointer compares, no allocation). `pose()` (the skeleton's
   `onBeforeCompute`) never runs: the skeleton is never prepared.
2. Its LOD levels (`world/partLibrary.ts:201-209`, `trackLod`): one [hi, low] pair per set in `tracked`, walked only
   by `setLodScale` (the Detail setting), never per frame; Babylon picks a LOD only for active meshes.
3. `LIVE_RIGS` (`characterRig.ts:1382`): one rig per set. Thermal's paint (`gameState.ts` `paintHeat`) calls
   `setHeat(k)`, which returns at once while `k` is unchanged (a vertex upload of the hidden body only when thermal
   toggles); `DoorGhosts.update` skips it at `r.standIn`.
4. `LIVE_DOGS` (`dogModel.ts:80`): the dog set's model; thermal's `setHeat(k)` (`paintHeat`), same on-change rule.
5. Electro's part list (`gameState.ts` `paintElectro`): the sniper set's instance named `laser` joins the list on a
   switch to electro (gathered then, not per frame); its `pattern.w` is written only when `k` changes.
6. Babylon's active-mesh pass: the 547 disabled meshes are entries in `scene.meshes`, each skipped at its
   `isEnabled()` / `isReady()` check per frame (55-77 per set, the same as one real guard of that kind). Not
   allocation; it is the one cost that scales with the set size. A possible follow-up (not done, it changes "kept for
   the scene's life"): dispose the parts the merged body and merged gun disabled once the compile settled (they hold
   no effect: an instance draws through its source's sub-mesh), about 400 of the 547.
- Not joined: `World.charCasters`, `sunMoving`, any shadow map list, `enemyMgr`, hit volumes, physics, audio, the
  anim tier (`GuardAnimTier` is `Enemy`'s), `liveGuardBodies` (no `GuardBody`). No new scene observer beyond the
  one the first smooth body of a scene adds anyway.
- The droneOp's drone (`ReconDrone`, built by `EnemyManager.spawn`, needs physics) is not in a set; its parts are part
  instances of pill, sphere, capsule and torus, whose sources (and so the sub-meshes the drone's instances draw
  through) the sets warm.

## Step 2 - `src/ai/guardHelmet.ts`, `src/ai/guardShield.ts`, tests in `tests/guardWarmSets.test.ts` - 11ab548f6
- `helmetDropSource`'s per-scene entry also keeps its load's promise (`ready`: true once the mesh is built, false with
  no helmet_std file, a disposed scene or a failed load; the failure warns as before) and the warm instance.
  `helmetDropReady(scene)` goes through `helmetDropSource` (one load per scene; a later first drop gets the same
  source), then makes one instance `helmetDropInstance(src, '#808080', 'helmet-drop-warm')`, disabled and not
  pickable, kept; with it the source has an instance, so the gate's sweep (`Mesh.isReady(true)`) compiles its
  instanced variant. A second call makes nothing more. Never rejects.
- `preloadShield()`: `shieldUrls()?.[LOD_1]` through `loadModel` (the cache `GuardShield` reads); false with no url or a
  failed fetch. Never rejects.
- Tests (4, the `guardHelmetDrop` / `guardShieldShare` mocks: `guardAssets` mocked, `fetch` stubbed): ready true with
  the warm instance disabled, the LOD1 file fetched once, `helmetDropSource` then the same source and no new fetch,
  a second ready makes no second instance; false with no helmet_std (nothing fetched) and false on a missing file
  (warns, source null); `preloadShield` then the enforcer's `guardShieldFor`: `/shield-lod1.glb` fetched once in
  total; false with `shieldUrls` null, nothing fetched.

## Step 3 - `weaponAudio.ts`, `gameMusic.ts`, `music.ts`, `gameAudio.ts`, `tests/mapReadyAudio.test.ts` (new) - ec2b334a1
- `WeaponAudio.whenLoaded()`: one promise made with the object, settled by `load` (true after `stats.loaded`, false in
  its catch); a later call returns the settled promise. `load` otherwise unchanged.
- `GameMusic.firstCue()`: `this.load('caution').then((d) => d !== null)` (`load` dedupes: `mission()` reuses the
  decode); `Music.firstCue()` passes through.
- `gameAudioReady(app)`: waits for `app.music.firstCue()` and, only when `app.audio.ctx` exists at the call,
  `app.weaponAudio.whenLoaded()`; resolves when both settled, never rejects (a sync throw logs one info line).
  `attachGameAudio` unchanged.
- Tests (9): `whenLoaded` true after a decode (one decode, a later call at once), false after a failed fetch, waits
  with no context and settles when the context comes; `firstCue` true, 'caution' (head + loop) fetched once even with
  `mission()` after it and a second `firstCue`, false when its file does not load; `Music.firstCue` passes through
  with no audio context (an `OfflineAudioContext`); `gameAudioReady` settles with no context without asking for the
  sprite, waits for the sprite with a context, never rejects.

## Step 4 - `mapGate.ts`, `gameState.ts`, `tests/mapGate.test.ts` - 0c8589ea0
- `STEPS` = `['bake-live', 'quality', 'content', 'bodies', 'shaders', 'probe', 'bake-all', 'audio', 'warm']`; the doc
  line says S3 inserted it (S5 appends 'peers').
- `gameState.ts`, every line inside the `flags.mapReady` block of `create` or a method only the gate calls:
  members `gateWarm` (0 / 1 / 2), `gateGear` (true when not needed or settled), `gateAudio`, `gateFigureWarm` (the
  `warmGuardModels` promise `create` keeps, still not awaited there). `runGate`, before `runMapGate`: starts
  `gameAudioReady(this.app)` (sets `gateAudio`); with `flags.guardModels`, `helmetDropReady` when the run has guard
  kinds and `preloadShield` when they include the enforcer (`gateGear` false until both settled).
  `gateGroup(GROUP_GUARDS)`: parallel order pushes `gateWarmGuards()` into the `Promise.all` with the guards; serial
  awaits it after the last guard; so `GROUP_GUARDS` settles only after the warm in both orders, the serial rest group
  waits for it and S14's compile log lists its programs under the guards group. `gateWarmGuards()`:
  `warmGuardSets(this.scene, this.world, guardKindsFor(this.world.map.id, this.opts.mode))` and, with
  `flags.guardModels`, the kept figure warm; `gateWarm` = 2 when both settled. `gateRead`: `bodies` also needs
  `gateGear` (set before the `gateDue` copy); `shaders` = the sweep (still asked every read) and `gateWarm === 2`;
  `g.audio = this.gateAudio`; `peers` stays true for S5. No allocation added to `gateRead`. `gateDescribe` appends the
  guard warm, gear and audio states. `compileOrder.ts` and the other groups unchanged.
- Tests: `tests/mapGate.test.ts` 15 / 15 (the STEPS test renamed and now expects the audio step; see deviation 2).

## Step 5 - `changes/feature-map-ready-s3.md` (new, `kind: patch`), this report
- `tests/changesFragments.test.ts` 1 / 1.

## Results
- `npx tsc --noEmit -p .` and `npm run typecheck:fast`: clean.
- The brief's 14 vitest files, one run (`--maxWorkers=2`, below-normal priority): 14 files, 120 tests, all green:
  guardWarmSets 13, mapReadyAudio 9, mapGate 15, guardFigureWarm 7, guardHelmetDrop 3, guardShieldShare 2,
  guardBody 16, weapons-audio 16, music 4, menuGate 10, mapReadyStats 7, compileOrder 8, compileLog 9,
  changesFragments 1.

## Deviations (each with its undo)
1. Test setup, (c) / (d): the sun's cast list holds one level static (`level-static`) from the start; the tile's list
   is empty and no warm mesh is in either. With both lists empty the run showed one new key: the merged body's main
   pass with `SHADOW0` / `SHADOWS`, because Babylon's `PrepareDefinesForLight` (9.29) turns a generator's shadow
   defines off for every receiver while its `renderList` is empty, and the first real caster turns them on: a
   scene-wide variant, not one a guard builder makes (no STOP). In play `World.sunCasters` always holds the level
   statics and the player. Undo: empty the list again (the key test then fails by that one key). Related risk for the
   PC run: a lamp shadow-pool slot whose list goes from empty to filled in play flips the same define scene-wide,
   guards or not; the flag-on run's before / after count is the real check.
2. `tests/mapGate.test.ts` beyond :45-51: with the step inserted, three other spots failed, so each sets or checks the
   audio step (the ordered walk checks 'Loading sound' then sets `audio`; the progress walk sets `audio`; the
   `runMapGate` ready test's fake probe sets `audio`). Undo: none (needed for green).
3. `warmReady` asks every sub-mesh and passes `needAlphaBlendingForMesh` (was sub-mesh 0 and `false`); `untilWarm`
   rejects when its check throws (a throw in a later tick was uncaught before; the figure warm's own catch logs it).
   Undo: back to sub-mesh 0, `false` and no try.
4. `WARM_GIVE_UP_MS` exported (test g reads it). Undo: unexport, the test uses 20000.
5. The set roots sit at y = -1000 and their rigs are `standIn` (not asked; keeps them out of the door-figure pass).
   Undo: drop both lines.
6. `runGate` starts the helmet drop only when the run has guard kinds (none in the sandbox: PLAN's "when the run's
   guards can carry them"); the brief starts it with `flags.guardModels` alone. Undo: drop the `kinds.length` test.
7. `gateDescribe` also names the gear state. Undo: drop that part.
8. With `flags.guardModels` the human kinds' sets are empty roots (so a second call builds nothing); the count still
   counts them. Undo: count only sets with meshes.

## Pending PC runs (the lead requests them on the laptop queue)
- Affected on the PR head (automatic), plus by hand (guard bodies drawn on the co-op client; `src/game` checker gate):
  `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --suites "e2e-coop e2e-netmove" --set map-ready-s3-coop --requester "Night Shift | Sector Ops Build"`
- Flag on:
  `node scripts/laptop-queue/request.mjs --sha <head> --alone --env E2E_PARAMS=mapready=1 --env E2E_GPU=1 --step "npm run build" --step "node scripts/run-e2e.mjs e2e-ctcourse e2e-sectorops e2e-coop e2e-netmove" --set map-ready-s3-on --requester "Night Shift | Sector Ops Build"`;
  the lead reads `_compiledEffects` before and after the first bay squad's spawn in ctcourse: 0 new (S6 makes it an
  assert).
- The same alone run with `--env "E2E_PARAMS=mapready=1&guardmodels=1"` (helmet drop and shield in at the reveal, no
  box), set `map-ready-s3-on-gm`.
- GPU look: none needed for the warm itself (the sets are never drawn); the e2e runs above cover the loading screen.
