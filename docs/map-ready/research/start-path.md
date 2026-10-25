# map-ready: the start-of-map path today
Owner: Night Shift | Sector Ops Build (job map-ready). Status: current (research, master 2148ec96; src unchanged to
b81c4945).

What happens from "Start" to the first playable frame on campusOps (Saltmarsh Park, Sector Ops), ctcourse (Marlow
Yard, course mode, co-op) and warehouse (the benchmark / perf map, full light bake), every piece that still builds
after the player has control (section 3, rows 1-13), and what every load pays again that a kept or shipped part
would save (section 3b, rows 14-15). All paths are `src/` unless they start with `scripts/`, `docs/` or name Babylon
9.29 (`node_modules/@babylonjs/core/`). Line numbers are master 2148ec96.

## 1. The path (all maps)
1. Start: `main.ts:368` `startGame` clears the screens, shows the boot screen at 50 % "Loading map..." (`main.ts:389`),
   frees the last state (`app.releaseState`), then `GameState.create` (`main.ts:397`).
   - `?autostart=<map>&mode=<mode>` (solo) calls `startGame` directly (`main.ts:458-461`). `?net=local&autostart=...`
     (course / sector) goes through the co-op lobby (`main.ts:449-457`, `net/coopUi.ts:853-880` auto-starts once
     everyone is lobby-ready, no load check).
2. `GameState.create` (`game/gameState.ts:916-979`):
   - `World.create` (`world/world.ts:167-255`): scene, Havok, level build (`LevelBuilder`, dressing pass), the light bake
     (`bakeLevelLight`, awaited, `world.ts:192`), facility kit and props (`KitRender` / `PropRender`, GLB fetch, awaited,
     `world.ts:196-212`), baked lamps (`BakedLamps`, `world.ts:215-243`), campus art (`CampusArtRender.create`, GLB
     fetch, awaited, `world.ts:243-250`).
   - `new GameState` (`gameState.ts:542`): the player (`:551`, starts Wren's LOD fetch, see 3.3), weapons, post stack
     (`:605`, built but not applied), nav grid (`:704`, eager), enemy manager, cover grid, the mode object (`:731`).
   - `opts.net.attach(g)` (`:932`).
   - The warm-up (`:970-975`): `Promise.race([scene.whenReadyAsync() (+ warmGuardModels with ?guardmodels=1), 6 s])`
     beside `sections.whenReady(live)` (campusOps on a cold bake cache only). `WARMUP_MAX_MS = 6000` (`:337`).
     `sb.markPlaying()` (`:977`).
3. `main.ts:398-412`: `app.setState(st)` then, in `.finally`, the boot screen gets `done` (fades). `App.setState`
   (`core/app.ts:379-389`): `enter()`, the loop attaches, then `quality.setTarget(state)` which runs the FIRST
   `applyQuality` / `applyAdaptive` (`core/qualityManager.ts:185-199`).
4. `GameState.enter` (`gameState.ts:1164-1167`): game audio attaches (`attachGameAudio`), input goes live, `mode.start()`.
   - Sector Ops (`game/modes/sectorMode.ts:312-368`): CtDevices, guard freeze, doors, team, keypads, desks, crates, the
     teleport to the section start, the 2.8 s letterbox, `loadSection(0)` (`:679-707`) which queues the section's guards
     and `fill()`s them (`:871-900`): guards are spawned here, after the boot screen has gone.
   - Course (`game/modes/courseMode.ts:221-...`): course state, gates, consoles, doors; each bay's squad spawns when the
     bay starts (`spawnSquad`, `:935-950`).
   - Warehouse (`clear` / `sandbox`): `ClearMode` spawns room by room (`clearMode.ts:92`).

The boot screen therefore drops as soon as `create` resolves, and the scene's first frames, the first quality apply,
the guards, the post stack and the shadow maps all happen in front of the player.

## 2. Co-op start (ctcourse, campusOps in co-op)
- Host "Start mission" (`net/coopUi.ts:629`) -> `NetSession.startMatch` (`net/session.ts:349-358`): phase `playing`,
  broadcast `start` (`net/protocol.ts:285`, `time` always 0), then the local `start` event. Clients take `start` from
  the host only (`session.ts:250-255`). Both peers: `CoopController.start` (`coopUi.ts:188-215`) -> `startGame` with
  `CoopHost` / `CoopClient` attach.
- No load handshake exists. `ready` (`protocol.ts:284`, `session.ts:199-203`) is the lobby flag only (`allReady`,
  `session.ts:339`).
- The host's clock starts in its own first fixed step (`net/coopHost.ts:1701-1702`) and it sends snapshots at 15 Hz
  (`coopHost.ts:71`, `:1786-1798`) whatever the client is doing. Its guards start in its own `enter()`.
- A message reaching a client before `attach` (`gameState.ts:932`) has no listener and is dropped (`core/events.ts:17-20`).
  Snapshots and `sector` (every 0.5 s, `sectorMode.ts:170`, `:1255-1259`) recover; one-shot `ev`, `tstart` and `end`
  do not.
- The client builds its guard puppets (`coopClient.ts:461`) and the partner's avatar (`coopClient.ts:373`, which
  starts the partner's LOD load, `net/remoteAvatar.ts:223`) when the first snapshot arrives: after its own boot screen
  has gone. The host builds a remote's avatar in `addRemote` (`coopHost.ts:378`).
- `course` and `sector` are capped at 2 players (`protocol.ts:39-41`) on master; #317 coop4 (ships live, Q16) raises `sector` to `SECTOR_MAX` 4 on the same path (BRIEF A5).
- Late join / rejoin: the host sends `start` to that player alone and keeps playing (`session.ts:191-195`,
  `coopHost.ts:237`, `net/joinWatch.ts`).
- `PROTOCOL_VERSION = 62` (`protocol.ts:21`); a new message needs the `Msg` union (`:278-342`), a `parseMessage` case
  (`:796-1046`) and, client to host, the host whitelist (`session.ts:205`).

## 3. What still builds after the first playable frame
Ranked by how visible it is. "Seen" is what the player notices.

| # | What | Where | Why it is late | Seen |
| --- | --- | --- | --- | --- |
| 1 | The warm-up compiles the wrong shaders: the first quality apply comes after it | `gameState.ts:970-975` vs `core/app.ts:386` -> `world/world.ts:452-497` (`lightRig.configure` `:478`, char / torch shadow defines, `setSunShadows` `:493`, `refreshMaterials`), `GameState.applyQuality` `:981-999` (`stack.apply`, the post stack) | Shadow generators, the real-light pool, the `LAMP_CSHADOW` / `LAMP_TSHADOW` defines and the post stack's image processing all change material defines after `whenReadyAsync` resolved, so every lit material compiles again in play | Hitches and missing / black meshes in the first seconds; matches V12 (compiles end 23-37 s into play, `docs/conformance-sector-ops/CONFORMANCE.md:150`) |
| 2 | Character shaders compile in play (cold: 29-44 s) | Wren's body arrives after `create` (3.3); guards spawn in `enter()` (1.4); `player/bodyEffectRecovery.ts:3-27` (an unready body is not drawn; `STUCK_MS` 90 s) | Nothing that uses the body variants exists during the warm-up (only with `?guardmodels=1`, default off, `core/flags.ts:131`, does `ai/guardWarm.ts` warm guard bodies) | The player or guards invisible or popping in; long first-seconds hitches |
| 3 | Wren LOD0 / LOD1 (18 MB) and their KTX2 transcode | `player/player.ts:196` -> `operators/runtime/playerFigure.ts:77-81` -> `figure.ts:509-512` (LOD2 first, then LOD0 + LOD1) | Not awaited by `create`; `scripts/e2e-lib.mjs:245-257` says so ("transcode after the match starts") | The player's body swaps from the far LOD to the close one in front of the camera |
| 4 | Weapon baked meshes | `weapons/weaponModel.ts:171`, `:186-192` (`useMesh`), `weapons/weaponMesh.ts:80-95` | The proxy parts draw until the GLB loads; the match never waits (the menu does: `world/menuScene.ts:362`) | The gun swaps from boxes to the real model |
| 5 | Guards built after the boot screen | `sectorMode.ts:366` `loadSection` -> `fill` (`:871-900`) -> `ai/enemyManager.ts:1971-1985` `spawn`; guards within `SPAWN_MIN_DIST` 7 m wait (`sectorMode.ts:127`) | `mode.start()` runs in `enter()` | Rig and body build plus first draws in the first frames (a CPU spike); body shader as row 2 |
| 6 | Other campus sections' lamps | `world/sectionBake.ts:39-41` (campusOps only), `voxel/sectionJobs.ts` (one lamp per job, live section first), `world/bakedLamps.ts:71-73` (`LAND_FADE_MS` 1.5 s fade, `TILE_BUDGET` 4 MB of `texSubImage3D` a frame, `:831-870`) | Cold bake cache: only the live section is awaited; S1 alone waits 22.2 s at 4 workers (`docs/conformance-sector-ops/CONFORMANCE.md:149`); a dead worker can hold a job 60 + 20 s (`sectionJobs.ts:30-35`) | Lights in neighbouring sections coming on one by one while playing; tile uploads each frame. Michael's "the level slowly builds" fits this on a first load |
| 7 | The surface atlas is drawn at its real size only at the first quality apply | `world/world.ts:183` (made small), `:453-463` ("the atlas made while the map loads came out empty") | `applyQuality` runs at `setState` | Floors and walls change texture after the reveal |
| 8 | The environment probe captures on the first frame | `world/world.ts:145-157` (`refreshRate = 0`, `scene.environmentTexture` set after the capture) | First render is after the reveal | A first-frame hitch (6 faces of the level) and the reflections changing; whether it recompiles the PBR materials is to be measured (S1) |
| 9 | Materials made after load get the lamp plugin a frame later | `world/bakedLamps.ts:427-436`, `:488-495` (`frame` re-scans on a new material) | Guards, puppets, the partner, weapon meshes add materials in play | One more compile per new material |
| 10 | The co-op client's guard puppets and partner | `net/coopClient.ts:373`, `:461`; `net/remoteAvatar.ts:223` | Built on the first snapshot, after the client's reveal | Guards and the partner appear a moment after the client's view does |
| 11 | Guard extras | `ai/guardHelmet.ts:47-60` (helmet drop mesh, first call), `ai/guardShield.ts:95-108` (shield GLB per guard) | Loaded on first use | A box stands in until the mesh arrives |
| 12 | Section-bake cache write | `voxel/sectionJobs.ts:192` (`markPlaying`), SB14 (`docs/systems/lighting.md` "Per-section lamp bake") | The joined result is cloned and cached at the next section change or match end | A hitch at the first section door after a cold load |
| 13 | Audio | `audio/gameAudio.ts:33` (weapon sprite: "the synth until it has decoded"), `audio/score/game/gameMusic.ts:240-252` (fetch + decode) | Attached in `enter()` | The first shots use the synth; decode cost in the first seconds |

Not late (built before the reveal and needing no change): the level geometry and dressing, the nav grid and cover grid
(`gameState.ts:704`, `enemyManager.ts:574`), the light field and the full light bake on every map but campusOps
(`world/lightBake.ts:82-120`, awaited in `World.create`), the kit, props and campus art GLBs (awaited). Not late, but
paid again on every load: rows 14-15.

## 3b. What every load pays again (Michael's fixes 2 and 4, 2026-10-25 ~18:50)
| # | What | Where | Why it repeats | Cost |
| --- | --- | --- | --- | --- |
| 14 | Shared parts rebuilt from scratch each match | Compiled shaders: `core/app.ts:364-377` `releaseState` ends with `engine.releaseEffects()` (3.1.7: a kept effect held its material, so the old match). Its comment says the keys never repeat; in Babylon 9.29 they do: a plugin's main define is per class name (`Materials/materialPluginManager.pure.js:43-44`), the cache key is shader name + defines (`Engines/thinEngine.pure.js:1683`); scene dispose also releases effects by reference count (`Materials/material.pure.js:1529-1534`); an effect holds closures in `onCompiled`, `onError`, `_fallbacks`, `_processCodeAfterIncludes`, `_processFinalCode` (`Materials/effect.pure.js:148-163`). Textures: `operators/runtime/figure.ts:230` makes a fresh blob URL per image per scene, so the engine texture cache (`Texture` asks `_getFromCache(url)` first, `Materials/Textures/texture.pure.js:308`, `baseTexture.pure.js:580-597`) never hits and every match transcodes KTX2 again. Files: operator / weapon / shield GLBs are parsed once per URL (`figure.ts:131-172` `loadModel`), but kit, props and campus art fetch and parse on every load (`world/kit/kitRender.ts:68`, `world/props/propRender.ts:89`, `world/campusArt/campusArtRender.ts:132`) | Each match is a new `Scene` (`world/world.ts:171`) and the last one is freed first (`main.ts:394-396`) | Every load compiles, transcodes and parses what the last one had (V12 cold compiles 29-44 s; the second load in a session is cheaper only through the browser's own GPU program cache, to be measured, S1) |
| 15 | Bake cache keys carry the match seed | `world/lightBake.ts:91` (`moon:${mapId}:${seed}:...`), `:95` (`lamps:${mapId}:${seed}:...`); the baked bytes depend only on the shapes and lights (`bakedLights`, `:17-27`: position, reach, cone, fixture; no flicker, no seed), which the key already hashes | A co-op match draws a random seed at each start (`net/session.ts:353`, passed to `startGame` at `net/coopUi.ts:202`); a solo restart uses seed + 1 (`main.ts:397`) | Every co-op start and every solo restart misses the IndexedDB cache and bakes again: campus sections (row 6), and the full lamp bake on Marlow Yard and warehouse; e2e always uses seed 1, so suites never see it |

The campus bake today: 134 lamps, 133 M cells, 103 s single thread (vis 98 s, bounce 5 s), S1 the long pole at
88.6 s (`docs/sector-redesign/checks/section-bake-build.md:62-63`); the cache holds the full `LampResult` in IndexedDB
(`voxel/lampJobs.ts:42-53`, `:111-121`, newest 2 kept). The bake runs in Node through vitest configs today
(`tests/sectionBakeCampus.test.ts` with `SECTION_BAKE_FULL=1`, `scripts/light-measure/vitest.probe.config.ts`), so a
build-time prebake needs no new package. Builds: `npm run build` = typecheck + `vite build` (`package.json:10`); the
e2e serves that `dist/` (`scripts/run-e2e.mjs:162`); CI builds in `.github/workflows/deploy.yml` (build-check `:97`,
the Pages slots `:189`, `:211`). The PWA precache takes files up to 16 MB (`vite.config.ts:84`) and leaves the guard
GLBs to a runtime rule (`src/pwa/precacheGlobs.ts:21`, `src/pwa/runtimeCaching.ts:44`).

Where a map is picked before Start (fix 3): solo, every route opens `ui/screens/briefingScreen.ts` for its map
(Sector Ops `ui/screens/missionsScreen.ts:76-84`, Free Roam `:112-118`, Missions); co-op, the host's lobby settings
(`net/coopUi.ts:513-560`, `setSettings`) reach every peer as the `lobby` event (`coopUi.ts:88`, `:448`), well before
`startMatch` (`session.ts:349-358`). The menu stage already parses Wren's LOD0 / LOD1 ahead of a match
(`operators/runtime/playerFigure.ts:84-110`).

LOD: the campus art's far cull (`world/campusArt/campusArtRender.ts:161`) and the parts' LOD scale only switch
visibility of meshes already built and compiled (`Scene.isReady` checks disabled meshes too: Babylon 9.29
`scene.pure.js` `isReady`), so they are not load work. Character LODs are rows 2-3.

## 4. Per map
- **campusOps** (Sector Ops, solo or co-op): rows 1-9 and 11-15; row 6 on a cold bake cache (the first load after a
  `LAMP_VERSION` or level change, and today every co-op start and solo restart, row 15); row 10 in co-op. The biggest
  map, the biggest gap.
- **ctcourse** (Marlow Yard, co-op course, also solo with `&course=solo`): rows 1-5, 7-11, 13-15; full light bake
  before play (no row 6; in co-op it bakes again at every start, row 15); each bay's squad spawns at the bay start
  (gameplay pacing, but the guard shader still first compiles at the first bay unless warmed: row 2).
- **warehouse** (benchmark, `perf.mjs` default, the only written load line: "Warehouse load <= 4 s cold, <= 1.5 s
  cached", pending a PC run, `docs/systems/performance.md:25-26`; this job keeps it, BRIEF A14): rows 1-5, 7-9, 13-14
  (row 15 on a restart); full bake before play.

## 5. How to measure it
Today's counters (no "map ready" event exists; `scripts/e2e-lib.mjs:223-236` waits for `current.player`, then for the
section bake to finish, 240 s cap, warning only):
- Shader programs: `GameState.shaderCount()` (`gameState.ts:2346-2350`, `engine._compiledEffects` keys); the spike log
  tags a frame `shaders` when the count changed (`core/spikes.ts`, `gameState.ts:2286-2306`; the `lod` bit is never
  set).
- Section bake: `SectionBaker.done` / `failed` / retries (`voxel/sectionJobs.ts:90-99`), `whenReady(k)` (`:214`),
  `SectionPlan.landed` (`world/sectionBake.ts:148`).
- Uploads: `BakedLamps.fullUploads` / `rowUploads` / `tileUploads` / `atlasReuploads` (`world/bakedLamps.ts:186-187`,
  `:266-267`).
- Bodies: `OperatorFigure.loaded` bits (`operators/runtime/figure.ts:520`), `WeaponModel.meshPending`
  (`weapons/weaponModel.ts:182`).
- The menu already has the pattern this job needs: `world/menuGate.ts` (pure gate: steps, stall / cap limits,
  `WARM_FRAMES` 5 frames behind the boot screen, `?bootCap=`) and `MenuState.drawReady` (`world/menuScene.ts:319-330`:
  every enabled visible mesh `isReady(true)`, no waiting textures, every post process ready).

Proposed (PLAN S1): one `mapReady` record per match (`window.__mapReady`): the time of each step, the cap hit or not,
then for the first 10 s after the reveal: shader programs created, frames tagged `shaders`, bake landings and tile
uploads, body LOD and mesh swaps in view ("pop-ins"), materials added, frame time p50 / p95 / max; and for the load
itself the bake source, effects and textures reused vs made, and the heap (rows 14-15). Software GL (CI and
the default e2e) reads the counts; seconds and frame times are GPU numbers from the laptop queue, alone runs only
(`docs/RULES.md` "Machines").
