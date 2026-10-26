status: open
# map-ready S3 (cloud): warm later arrivals - guard sets per kind, helmet / shield at load, the `audio` step (code + unit tests)

Lead: Night Shift | Sector Ops Build. Job map-ready (FOLDED-PLAN J21, ROADMAP Now row 17; Michael's fix (1) of his
2026-10-25 ~18:50 pick: "warm characters, guards and weapons behind the loading screen"; his 20 s cap, ~20:05 Q1).
PLAN S3 (`docs/map-ready/PLAN.md` on `origin/feature/map-ready` @ eae83afc9a2b527a2e0c76dba3326db5acd8508f, lines
190-203) and section 2 (the gate table, :97-124); BRIEF A3, A8, A9 (same commit). S1 and S2 are checker PASS; S2 is
PR #513 (it carries S1 #511). This brief is the whole strict brief: there is no `briefs/S3.md` on the job branch.
Opus work (AI warm, gate code); the lead runs two independent Opus checkers, Guard AI reviews the `src/ai` part.

## Base, branch, guard
- Base: `origin/feature/map-ready-s2` @ `a85f3db930e6a00aa3fa5f6f93c210e91cd46527` (W0 + S1 fix1 + S2 fix1).
  New branch: `feature/map-ready-s3` (create it from that commit and push it; never push to `feature/map-ready`,
  `feature/map-ready-s2`, another lane or master; never merge or rebase anything into it).
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/map-ready-s3`.
- Read first (from the base): `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions"),
  `git show origin/master:CLAUDE.md` (hard rules), then BRIEF.md / PLAN.md from eae83afc9 as above.
- Commit and push each numbered step, path-limited (`git add <files>`, never `-A` or `.`). Commit trailer:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Model hint: Opus 5.5.

## Co-op and #317
- No `src/net` file is edited and nothing new imports from `src/net`. The co-op client gets the warm with no net code:
  its `GameState.create` and S2's gate run the same `flags.mapReady` path, and its guard puppets are built by the same
  builders (`src/net/enemyPuppet.ts:136-150`: `buildEnemyRig`, `DogModel`, `buildShieldPart`). So the hard rule
  (`src/net` only via the dynamic import behind `flags.coop`) is untouched.
- No dependency on #317 `feature/coop4` (open, not on master or the base). It edits `gameState.ts` (+69 / -8) in
  other functions; whichever lands second rebases (PLAN section 7). Nothing here counts players.

## Files (only these)
- `src/ai/guardWarm.ts` - `guardKindsFor`, `warmGuardSets`, a scene-wide depth check (below).
- `src/ai/guardHelmet.ts` - `helmetDropReady`.
- `src/ai/guardShield.ts` - `preloadShield`.
- `src/audio/weapons/weaponAudio.ts` - `whenLoaded`.
- `src/audio/score/game/gameMusic.ts` - `firstCue`.
- `src/audio/music/music.ts` - one passthrough `firstCue` (A21).
- `src/audio/gameAudio.ts` - `gameAudioReady` (a new export; `attachGameAudio` unchanged).
- `src/game/mapGate.ts` - `STEPS` gains `'audio'` before `'warm'` and its doc line (A21).
- `src/game/gameState.ts` - S2's gate members and the `flags.mapReady` block of `create` only (A21).
- `tests/guardWarmSets.test.ts` (new), `tests/mapReadyAudio.test.ts` (new, A21), `tests/mapGate.test.ts` (the S2
  `STEPS` test only, :45-51).
- `changes/feature-map-ready-s3.md` (new, `kind: patch`, the `changes/feature-map-ready-s2.md` format, plain words).
- `docs/map-ready/checks/s3-build.md` (new, the report).

## Never touch
`src/net/**`, `src/game/modes/**` (no `courseMode.ts` edit: A22), `src/ai/enemy.ts`, `src/ai/enemyRig.ts`,
`src/ai/enemyManager.ts`, `src/ai/helmetDrops.ts`, `src/ai/gearParts.ts`, `src/ai/dogModel.ts`, `src/player/**`,
`src/world/**`, `src/core/**` (`flags.ts`: `mapReady` exists, W0), `src/operators/**`, `scripts/**`, every other test.

## What the base has (anchors checked on a85f3db93)
- Guards spawn after the release: Course mode's bay squads (`courseMode.ts:934-957`, `em.spawn(s.kind, ...)`), the
  alarm's reinforcements and response team (`game/stealthSystems.ts:567-571`, `:598`; `enemyManager.ts:897-899`,
  `:1104-1110`), Sector Ops slots inside `SPAWN_MIN_DIST` (A8, `sectorMode.ts:127`, `:882-888`), revivals. Course mode starts
  with no guard placed (`courseMode.ts:221-232`), so S2's gate compiles no guard program there: the first bay's squad
  compiles in play.
- What `Enemy` builds per guard (`ai/enemy.ts:649-683`): `buildEnemyRig` (`enemyRig.ts:21-41`: the rig with its
  merged smooth body, `merge: true`, and the merged gun instance, `mergeGun`; casters through `world.addShadowCaster`);
  the dog: the humanoid rig hidden plus `new DogModel(scene, parts, torso, accent)` (:663-670); the enforcer:
  `buildShieldPart` (:673-677) unless the figure's shield exists; the sniper: `parts.instance('cyl', '#ff2a1a',
  'laser')` and `parts.instance('sphere', '#ffffff', 'glint')` (:678-683); gear later: `buildHelmetPart` /
  `buildArmourParts` (`enemy.ts:872-889`, `gearParts.ts`). With `flags.guardModels` the rig also gets a live
  `GuardBody` (`enemyRig.ts:29`) and the enforcer the figure shield (`guardShield.ts:211-216`).
- `gearParts.ts:13`: `GearWorld = Pick<World, 'parts' | 'addShadowCaster' | 'map'>`. With `flags.guardModels` off,
  `buildEnemyRig` reads only `world.parts`, `world.map.theme.faction` and `world.addShadowCaster`.
- The figure warm (`guardWarm.ts:132-174`, `?guardmodels=1` only): hidden disabled meshes per base (LOD2), kept for
  the scene's life so their sub-meshes hold the effects (`:12-16`); `warmReady` (:83-105) compiles the main pass and
  every shadow generator of `m.lightSources` under each map's `renderPassIds`; `untilWarm` (:107-124) polls with a
  `WARM_GIVE_UP_MS` 20 s give-up (:29). In S2's gated `create` it is started and not awaited (`gameState.ts:995`).
- Shadow lists: `World.addShadowCaster` (`world.ts:413-433`) puts a mesh into `charCasters` (:85, read every frame by
  `charShadows.ts`) and `sunMoving` (walked every 0.25 s, `world.ts:345-370`, which skips disabled meshes). Every
  shadow map is a Babylon `ShadowGenerator` (sun / moon in `lightRig.ts:513`, character tiles `charShadows.ts:317`,
  torch tiles `torchShadows.ts:226`). Babylon 9.29 `Mesh.isReady(true)` checks a generator only when the mesh is in
  its render list, so a disabled mesh outside the lists never gets its depth variants from S2's sweep.
- S2's gate (`gameState.ts`): `create`'s gated block :987-998; `enter` :1203-1243; members :2409-2431; `runGate`
  :2439-2461; `gateRead` :2465-2489 (`bodies` :2471-2478, `shaders` :2481, `audio` / `peers` placeholders :2484-2486);
  `gateCompileAll` :2530-2559 (the guards group starts at `this.gateCompile = 3`, :2543); `gateDrawReady` :2494-2510;
  `gateDescribe` :2575-2579; `release` :2603-2634. `mapGate.ts:12-13` `STEPS` (S3 inserts `'audio'` before `'warm'`),
  `TEXT.audio` 'Loading sound' (:66), `MapGateInput.audio` (:39-40).
- Helmet drop: `helmetDropSource(scene)` (`guardHelmet.ts:47-65`) starts the load on its first call (the first drop),
  null until built; `HelmetDrops.make` (`helmetDrops.ts:115-121`) uses the placeholder box while it is null; the source
  is drawn only through instances with a per-instance `color` (`guardHelmet.ts:150-156`). Shield: `GuardShield`
  fetches its GLB in its constructor (`guardShield.ts:102-110`, `loadModel`, `figure.ts:164`, cached per url).
- Audio: `WeaponAudio` decodes its sprite once the audio context exists (`weaponAudio.ts:56-79`: `whenReady` ->
  `load`; `stats.loaded` / `stats.failed`); `AudioEngine.whenReady` runs at once when `ctx` exists, else on its
  creation (`audioEngine.ts:112-115`; the context is made on the first input). `GameMusic.mission()` decodes
  'caution', 'alert', 'spotted', 'evade' in turn inside `whenReady` (`gameMusic.ts:114-126`); `load` dedupes per name
  (:231-238) and `decode` uses an `OfflineAudioContext` (:240-257: no user gesture needed). `app.music` is the `Music`
  wrapper, which holds `GameMusic` privately (`music.ts:11-16`).
- Test patterns: NullEngine + `PartLibrary` + `buildEnemyRig` (`tests/guardFigureWarm.test.ts:115-128`); a real
  `EnemyManager.spawn` of ctcourse squads on the built level (`tests/consoleNoticeA4.test.ts:48-111`); the program
  cache read `engine._compiledEffects` (`tests/bodyEffectRecovery.test.ts:36`, `gameState.ts:2352`).

## Interfaces (write them as given; doc comments in the files' style)
```ts
// src/ai/guardWarm.ts
/** (map-ready S3, A22) The guard kinds a run of `mode` can spawn: none in the sandbox, else every kind (ENEMY_KINDS,
 *  the dog too). S11's lobby preload reads it. */
export function guardKindsFor(mapId: string, mode: ModeId): EnemyKind[];   // `import type { ModeId }` from '../game/modes/gameMode'
/** (map-ready S3) With `flags.mapReady`: per kind in `kinds`, one hidden copy of what a later spawn builds (below),
 *  disabled, never pickable, never drawn, kept for the scene's life; its main pass and its depth pass for every shadow
 *  generator in the scene compiled. Resolves with the number of kinds warmed once all are compiled (or after
 *  WARM_GIVE_UP_MS with one warn); never rejects; a second call in the same scene builds nothing. Nothing with the flag off. */
export function warmGuardSets(scene: Scene, world: GearWorld, kinds: readonly EnemyKind[]): Promise<number>;
/** (tests) The warm sets' root nodes in `scene`. */
export function guardWarmSets(scene: Scene): TransformNode[];
// src/ai/guardHelmet.ts
/** (map-ready S3) Starts the helmet_std drop mesh's load now (as the first drop would) and resolves true once it is built
 *  with one disabled warm instance (the drop's instanced variant compiles in the gate), false when the build has no
 *  helmet_std file or the load failed. Never rejects. */
export function helmetDropReady(scene: Scene): Promise<boolean>;
// src/ai/guardShield.ts
/** (map-ready S3) The shield's LOD1 file fetched and parsed now (the enforcer's later `GuardShield` gets it from the
 *  model cache); false when the build has none or it failed. Never rejects. */
export function preloadShield(): Promise<boolean>;
// src/audio/weapons/weaponAudio.ts  (class WeaponAudio)
/** (map-ready S3) Settles when the sprite is decoded (true) or failed (false). */
whenLoaded(): Promise<boolean>;
// src/audio/score/game/gameMusic.ts (class GameMusic) and src/audio/music/music.ts (class Music, passthrough)
/** (map-ready S3, A24) The first cue a mission plays ('caution') decoded now (shared with `mission()`'s load). */
firstCue(): Promise<boolean>;
// src/audio/gameAudio.ts
/** (map-ready S3, A9 / A24) The gate's `audio` step: the first music cue and, when the audio context exists, the weapon
 *  sprite, settled (decoded or failed). Never rejects. */
export function gameAudioReady(app: App): Promise<void>;
```

## Steps
1. `guardWarm.ts` + `tests/guardWarmSets.test.ts` (the warm sets).
   - `guardKindsFor`: `[]` for `'sandbox'`, else `[...ENEMY_KINDS]` (each once, kind order).
   - `warmGuardSets`, flag on, `flags.guardModels` off: per kind, the spawn's own builders on a caster-free view of
     `world` (`{ parts, map, addShadowCaster: no-op }`; `buildEnemyRig` takes it through one cast with a comment
     citing `enemyRig.ts:21-41`): `buildEnemyRig(scene, view, ENEMIES[k], 'guard-warm-set-' + k)`; for the dog its
     `DogModel`; for the enforcer `buildShieldPart`; for the sniper the two `parts.instance` calls `enemy.ts:678-683`
     makes; for every human kind `buildHelmetPart` and `buildArmourParts` (the gear a guard can be given later), with
     the colours `gearColour` gives. Each set under one root node, disabled, placed where no gameplay reads it (no
     `Enemy`, not in `enemyMgr`, no hit volumes, no audio, no brain). With `flags.guardModels` on: the dog's model and
     the sniper's parts only (no rig: `buildEnemyRig` would make a live `GuardBody`; the figure's programs stay
     `warmGuardModels`', A23).
   - The compile: one hidden-mesh readiness check for the warm sets' meshes (and the source mesh of each instance,
     with instances), polled like `untilWarm` (same 20 s give-up, one warn): the main pass, and the depth pass for
     every `ShadowGenerator` of every light in `scene.lights` (not only `m.lightSources`, not only render lists), under
     each map's `renderPassIds`, with `useInstances` true for a source drawn through instances. Generalise
     `warmReady` (:83-105) rather than copy it; `warmGuardModels` keeps its behaviour (its own test stays green).
   - No allocation per frame: everything runs at load. The warm sets stay in the scene, disabled, until it is
     disposed (their sub-meshes hold the effects: course mode despawns every guard between sets, `courseMode.ts:917-931`,
     and a released effect would compile again at the next bay). In the report, list each per-frame hook a warm set
     joins through the builders (the smooth body's live list `player/smoothBody.ts:162-169`, its LOD level
     `world/partLibrary.ts:201-209`, anything else you find) and show each is O(1) per set with no allocation.
   - Test (NullEngine; scene with a `DirectionalLight` + `ShadowGenerator` and a `SpotLight` + `ShadowGenerator` built
     like `charShadows.ts:317`, both render lists empty; `flags.mapReady` on, `guardModels` off; restore flags after):
     (a) `guardKindsFor`; (b) one set per kind, every mesh disabled and not pickable, the view's `addShadowCaster`
     never called, nothing added to the test world's caster spy; (c) the key test: after `warmGuardSets` resolves,
     build one guard of every kind the way `Enemy` does (`buildEnemyRig` on a world whose `addShadowCaster` pushes into
     both render lists, plus the dog / shield / sniper parts and the helmet and armour parts), make every new mesh
     ready (main pass via `isReady(true)`, both generators' depth via `isReady(subMesh, useInstances, false)` under
     their render pass ids, as `guardFigureWarm.test.ts:203-209` does): `Object.keys(engine._compiledEffects).length`
     is unchanged from right after the warm; (d) one real spawn per ctcourse squad kind through `EnemyManager.spawn` on
     the built ctcourse level (the `consoleNoticeA4.test.ts:48-111` setup) after the warm: 0 new keys once its meshes
     are ready; (e) flag off: resolves 0 at once, nothing built; (f) a second call builds nothing more; (g) a material
     that never reports ready: with fake timers it resolves after `WARM_GIVE_UP_MS` with one `console.warn`, never
     rejects; (h) `guardModels` on: no rig built, only the dog's model and the sniper's parts.
   - If (c) or (d) shows a key the warm cannot make without editing a never-touch file (a builder that varies its
     defines per guard, say), STOP: `status: blocked <the key and its builder>`.
   - Run: `npx vitest run tests/guardWarmSets.test.ts tests/guardFigureWarm.test.ts --maxWorkers=2`.
2. Helmet drop and shield at load (`guardHelmet.ts`, `guardShield.ts`; tests in `tests/guardWarmSets.test.ts`).
   - `helmetDropReady(scene)`: through `helmetDropSource`'s own entry (one load per scene; a later first drop reuses
     it), resolves true once built (with one disabled instance made by `helmetDropInstance(src, '#808080',
     'helmet-drop-warm')` kept for the scene's life), false when `helmetManifest()` is null or the load fails.
   - `preloadShield()`: `shieldUrls()?.[LOD_1]` through `loadModel` (the same cache `GuardShield` reads); false when
     null or failed.
   - Tests (the `guardHelmetDrop.test.ts` / `guardShieldShare.test.ts` mocks: `guardAssets` mocked, `fetch` stubbed):
     `helmetDropReady` true with the warm instance disabled, then `helmetDropSource(scene)` returns the same source with
     no second fetch; false with no helmet file; `preloadShield` then `guardShieldFor` fetches the shield url once in
     total; false with `shieldUrls` null.
   - Run: `npx vitest run tests/guardWarmSets.test.ts tests/guardHelmetDrop.test.ts tests/guardShieldShare.test.ts
     tests/guardBody.test.ts --maxWorkers=2`.
3. Audio ready (`weaponAudio.ts`, `gameMusic.ts`, `music.ts`, `gameAudio.ts`; `tests/mapReadyAudio.test.ts`).
   - `WeaponAudio.whenLoaded()`: one promise settled by `load` (true decoded, false failed); a call after it settled
     resolves at once. `load`'s own behaviour is unchanged.
   - `GameMusic.firstCue()`: `this.load('caution')` mapped to `d !== null`; `mission()` later reuses the same decode
     (`load` dedupes). `Music.firstCue()` passes through.
   - `gameAudioReady(app)`: waits for `app.music.firstCue()` and, only when `app.audio.ctx` exists at the call,
     `app.weaponAudio.whenLoaded()`; resolves (never rejects) when both settled. With no context yet it does not wait
     for the sprite (it decodes on the first input, as today; A24).
   - Tests (mock `fetch`, `OfflineAudioContext` and the engine's `ctx.decodeAudioData`): `whenLoaded` true after a
     decode, false after a failed fetch; `firstCue` true, decodes 'caution' once even when `mission()` runs after it,
     false when the track is missing; `gameAudioReady` settles with no context without waiting for the sprite, and waits
     for it when the context exists.
   - Run: `npx vitest run tests/mapReadyAudio.test.ts tests/weapons-audio.test.ts tests/music.test.ts --maxWorkers=2`.
4. The gate (`mapGate.ts`, `gameState.ts`, `tests/mapGate.test.ts`). Everything here is inside `flags.mapReady` /
   the `holding` path; with the flag off the code path is today's, byte for byte.
   - `mapGate.ts`: `STEPS` = S2's with `'audio'` before `'warm'`; its doc line says S3 inserted it (S5 appends
     `'peers'`). `tests/mapGate.test.ts:45-51`: the test now expects the audio step (rename it to say so); the rest of
     the file unchanged.
   - `gameState.ts` new private members next to S2's (:2409-2431): `gateWarm` (0 not started, 1 compiling, 2 settled),
     `gateGear` (true when not needed or settled), `gateAudio` (false until settled), and the `warmGuardModels` promise
     from `create`.
   - `create`'s gated block (:987-998): keep the `warmGuardModels` promise (still not awaited there).
   - `runGate` (:2439), before `runMapGate`: start `gameAudioReady(this.app)` (sets `gateAudio` when settled); with
     `flags.guardModels`, start `helmetDropReady(this.scene)` and, when the kinds include the enforcer,
     `preloadShield()` (sets `gateGear` when both settled).
   - `gateCompileAll` (:2530), where the guards group starts (`this.gateCompile = 3`, :2543): ONE line,
     `this.gateWarmGuards();`, a new private method that builds and compiles the warm sets
     (`warmGuardSets(this.scene, this.world, guardKindsFor(this.world.map.id, this.opts.mode))`) and, with
     `flags.guardModels`, waits for the kept `warmGuardModels` promise too; `gateWarm` = 2 when both settled. Started
     there so the player's body and the level compile first (S2's Q1 order).
   - `gateRead` (:2465): `bodies` also needs `gateGear`; `shaders` (:2481) also needs `gateWarm === 2`; `g.audio =
     this.gateAudio` (:2485; `peers` stays true for S5). No allocation in `gateRead`.
   - `gateDescribe` (:2575): append the warm and audio states for the cap's log line.
   - Run: `npm run typecheck:fast`; `npx vitest run tests/mapGate.test.ts tests/menuGate.test.ts
     tests/mapReadyStats.test.ts --maxWorkers=2`.
5. Fragment and report: `changes/feature-map-ready-s3.md` (`kind: patch`; e.g. "Behind the map-ready loading screen
   (off by default): every guard type's look is prepared on the loading screen, so a guard arriving later (a training
   bay's squad, a reinforcement) no longer stutters the game; the weapon sounds and the first music are ready before
   play"); `docs/map-ready/checks/s3-build.md` (per step: files, commits, tests with counts, deviations each with its
   undo, the per-frame hook list from step 1, the pending PC runs below). Run `npx vitest run
   tests/changesFragments.test.ts --maxWorkers=2`.

## Tests to run (only these; no e2e, no GPU, no `npm run check`)
`npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and
`npx vitest run tests/guardWarmSets.test.ts tests/mapReadyAudio.test.ts tests/mapGate.test.ts tests/guardFigureWarm.test.ts
tests/guardHelmetDrop.test.ts tests/guardShieldShare.test.ts tests/guardBody.test.ts tests/weapons-audio.test.ts
tests/music.test.ts tests/menuGate.test.ts tests/mapReadyStats.test.ts tests/changesFragments.test.ts --maxWorkers=2`.

## Done criteria (a checker tests each)
1. Branch `feature/map-ready-s3` from a85f3db93, steps 1-5 pushed; `git diff --name-only a85f3db93` lists only the
   files above.
2. tsc clean; every vitest file above green; counts in the report.
3. `tests/guardWarmSets.test.ts` (c) and (d): spawning a guard of every kind (with helmet, armour, shield, sniper
   parts, the dog) after the warm, and a real `EnemyManager.spawn` of each ctcourse squad kind, add 0 keys to
   `engine._compiledEffects`, main pass and both generators' depth pass.
4. The warm sets are disabled, never pickable, outside `enemyMgr`, never in a caster list (`charCasters`,
   `sunMoving`); flag off builds nothing and nothing new runs (every S3 line in `gameState.ts` sits inside the
   `flags.mapReady` block or a method only the gate calls).
5. `STEPS` is `['bake-live', 'quality', 'content', 'bodies', 'shaders', 'probe', 'bake-all', 'audio', 'warm']`;
   `gateRead` sets `audio` from `gameAudioReady`, `shaders` waits for the warm sets (and `warmGuardModels` with
   `?guardmodels=1`), `bodies` for the helmet drop and shield with `?guardmodels=1`.
6. No `src/net` edit or import; no per-frame allocation (the report's hook list); no `Math.hypot`; Babylon imported
   only through `src/core/babylon.ts`; `import type` for types.
7. Report `docs/map-ready/checks/s3-build.md` pushed; then the "Report" section below and `status: done
   feature/map-ready-s3 <sha>` on line 1 here.

## Pending PC run (the lead requests on the laptop queue after taking the branch; write these into the report)
- affected on the PR head (automatic), plus `e2e-coop` + `e2e-netmove` by hand (guard bodies drawn on the client;
  `src/game` checker gate, RULES "Test tiers"): `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --suites
  "e2e-coop e2e-netmove" --set map-ready-s3-coop --requester "Night Shift | Sector Ops Build"`.
- Flag on (`mapready=1`): `node scripts/laptop-queue/request.mjs --sha <head> --alone --env E2E_PARAMS=mapready=1
  --env E2E_GPU=1 --step "npm run build" --step "node scripts/run-e2e.mjs e2e-ctcourse e2e-sectorops e2e-coop
  e2e-netmove" --set map-ready-s3-on --requester "Night Shift | Sector Ops Build"`; the lead reads the program count
  (`_compiledEffects`) before and after the first bay squad's spawn in ctcourse: 0 new (S6 makes it an assert).
- Same alone run with `E2E_PARAMS=mapready=1&guardmodels=1` (helmet drop and shield in at the reveal, no box).

## Assumed decisions (the lead logs them in BRIEF.md; A20 is S16's proposed line, so these start at A21)
- A21 (files beyond PLAN S3's list): + `src/game/mapGate.ts` and `tests/mapGate.test.ts` (S2 left the `audio` step
  for S3, `mapGate.ts:12`), + `src/game/gameState.ts` (S2's gate members: the warm start, the `audio` / `bodies` /
  `shaders` reads; PLAN S14 says "none claims gameState.ts" for S3, so the lead merges S3 and S14 by hand: S14
  rewrites `gateCompileAll`, `gateRead`'s `shaders` line and `gateDescribe`, and S3 keeps one line in each), +
  `src/audio/music/music.ts` (one passthrough; not in PLAN's claims block), + `tests/mapReadyAudio.test.ts`; -
  `src/game/modes/courseMode.ts` (A22). Undo: n/a (a file list).
- A22 (narrows nothing, widens PLAN S3's "course mode lists its bays' kinds"): the warm covers every kind in every
  guard mode, because the alarm and the response team bring kinds beyond a course's squads
  (`stealthSystems.ts:567`, `:598`); about 8 hidden sets per match. Undo: in `guardKindsFor`, return a course's
  squad kinds plus the alarm's kinds.
- A23 (narrows PLAN S3's done line "a guard spawning mid-match adds no shader program" to the default guard path):
  the 0-new-programs proof covers `?guardmodels=0` (today's default: merged body, parts, gear, the dog). With
  `?guardmodels=1` S3 loads the helmet drop and the shield file at load, warms the drop's instanced variant and makes
  the gate wait for `warmGuardModels`; the figure's LOD0 / LOD1 and shield programs are not warmed here (the
  guard-models switch-on, G8, owns that path; S1's after-window measures it). Undo: extend `warmGuardSets` to the
  figure path then.
- A24 (reads A9): "the first music cue" is 'caution', the first track a mission plays (`gameMusic.ts:123`); it decodes
  in the gate without a user gesture. The weapon sprite is waited for only when the audio context exists (no input
  since page load: it decodes on the first input, as today). Undo: `gameAudioReady` waits for the music only, or drop
  the `audio` step (A9).

## Report (builder: write below this line, then set line 1)
