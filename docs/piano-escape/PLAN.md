# piano-escape: plan
Owner: Night Shift | Campaign Build. Status: current.

Lead: Night Shift | Campaign Build. Planner: Opus 5.5, master 1b58989ed. Brief: `docs/piano-escape/BRIEF.md` (A1-A11,
Michael ~19:20 / ~19:28 / ~19:40 / ~19:55 / ~20:05). Prototype mode: small, no tuning, one test set.
Redraw 1 (Michael ~20:05: "Not a piano factory, it's an underground bunker storage room with timber boxes providing
cover. The piano is the music theme only."): the map is now Underhollow Store (`underhollow`); the scene key stays
`scene: 'piano'`. The plan Michael approved ~20:15 (the opening, the EMP, 8 guards or 4, knife kills only, the corridor
pair, two routes and a loop, the rule skips) is unchanged apart from the setting.

## 1. What runs, from what exists (found in code)
- **Runtime: `SectorMode` with one section** (`src/game/modes/sectorMode.ts`; campaign missions run on it too,
  level-design "Campaign profile"). It already gives: guards spawned per section from `SectorDef.guards`
  (`src/game/sectors.ts:108`), host authority in co-op, everyone-down restarts the section at its checkpoint
  (`restartSection`, sectorMode.ts:1213), the exit zone (`exitStep`, :852, every living player inside), no exit beacon
  (`drawsExitBeacon` is false for `sector`, `src/game/interactables.ts:34`). Co-op hosts reach it from the lobby's
  Sector Ops map list with no lobby code (`lobbyMaps` filters `MAPS` by mode, `src/net/coopUi.ts`).
- **New seams (small):** `SectorObjectiveKind` gains `'clear'` (every guard of the section down: dead or knocked out,
  none pending; no interactable), `MapDef.scene?: 'piano'` (`src/world/mapDef.ts`), and in a scene map `complete()`
  writes no star, record or rating (as a practice run, sectorMode.ts:1063 / :1119) and ends on a fade out to the menu,
  not the results screen (A9). The scene's own logic sits in new files (`src/game/piano*.ts`), called from SectorMode
  at those three seams only.
- **Flag:** `pianoEscape: darkFlag(params.get('piano'), PREVIEW_ON)` in `src/core/flags.ts` (A1; `darkFlag` :140).
  The map joins `MAPS` only when it is on (`src/world/maps/index.ts`, like `bunker` behind `flags.legacy`), so map-wide checks and
  menus never see it otherwise. Reached by: a main-menu entry "Piano Escape" (`MainMenuScreen.entries`, `src/main.ts`
  :253, solo start), the co-op lobby (Sector Ops, map "Underhollow Store"), and
  `?piano=1&autostart=underhollow&mode=sector` (dev, e2e). `sectorOps()` (`src/ui/screens/missionsScreen.ts:51`) skips
  scene maps so the scene stays out of the Sector Ops op list.
- **Takedowns:** `src/game/takedown.ts` (kinds `behind`, `corner`, `overCover`, ...; tap = knockout, hold = lethal,
  `TAKEDOWN.lethalHold` 0.3 s), `TakedownController` (`src/game/takedownController.ts`, `lethalOnly` offers :93, lethal
  blow on the procedural `melee` arc via `killWarp`, `src/anim/strikeBody.ts:148`). Co-op double: `DualClock`
  (`src/game/dualTakedown.ts`, `DUAL_WINDOW` 1.5 s): two ordinary takedowns timed together, no dedicated dual move
  (G180). Knife: `KnifeModel` (`src/weapons/knifeModel.ts`: "The game has no knife verb yet"); hand-keyed studio pair
  `hold_knife` / `guard_knife_collapse` (`src/anim/clips/keyed/`, 48 frames, Anim Studio only, not mocap, not in play).
- **Camera:** the follow camera's render-only override `cam.free` (`src/player/shoulderCamera.ts:129`; "the free view
  only overrides what is rendered", `src/player/freeView.ts`); gameplay keeps reading `gamePos`. Letterbox and post:
  `GameState.letterbox` (gameState.ts:3827), `src/vfx/cinematicPost.ts`. Tracers and sparks: `Vfx.tracer`
  (`src/vfx/vfx.ts:167`), `vfx.sparks`. `loop.timeScale` (`src/core/loop.ts:31`) is NOT used: it slows gameplay.
- **Music:** bundled MP3s by `?url` import, decoded with `decodeAudioData` (`src/audio/score/game/gameMusic.ts`,
  `src/audio/foley/foley.ts`); the in-match director (`Music.mission/update/calm`, `src/audio/music/music.ts`).
  Precache lists: `src/pwa/precacheGlobs.ts`.
- **Lights (Sector Ops Build's facts, ~20:05, pointers checked):** one registry (`LightRegistry`,
  `src/world/lights.ts:149`; `setGroup` :361, `destroy` :378, `disrupt` :437 is the EMP gadget's timed cut, called at
  `src/game/gadgetSystem.ts:402`). `LightField` (`src/world/lightField.ts`) gives the meter and guard sight from the bake
  plus the registry's live state plus torches as dynamic lights, so a lamp that goes off leaves the picture, the meter
  and guard sight together. Guard torches are `electric: false` (`src/world/torches.ts:38`): an EMP never kills them.
  `FLASHLIGHTS = 4` slots on a dark map (torches.ts:15) and a 4-tile torch shadow atlas (`TORCH_DRAW_SLOTS`,
  `src/world/shadowAccuracy.ts:83`): **at most 4 lit torches at once today.** Torches are lit only while investigating
  / searching / alert without sight in the dark (`torchRule`, `src/ai/archetypes.ts:164`). Guards know per circuit
  when a light is cut (`src/ai/breaker.ts`). Co-op: torches mirror to the client (`src/net/torchMirror.ts`); lamp on /
  off rides the `lamps` snapshot (`src/net/lampSync.ts`), wired for Sector Ops: **the scene runs on the Sector Ops
  runtime, so that sync applies as is.** Players see the dark through their night vision (`src/vfx/nightVision.ts`,
  picture only).
- **Downed:** campaign rule `REVIVE_WINDOW` 30 s, `REVIVES_PER_MISSION` 2 (`src/game/reviveClock.ts`); the co-op host
  swaps the cap for syringes when the mode is `sector` (`src/net/coopHost.ts:205`). The scene keeps the campaign cap.
- **Track:** `leberch-investigation-piano-611639.mp3`, ffprobe: **134.03 s**, 44.1 kHz stereo, 256 kb/s, 4.29 MB.
  Loudness (RMS per 2 s): quiet open 0-28 s (-26 dB), first swell 30-52 s (peak -19 dB at ~40 s), settle 54-76 s,
  swells ~78-84, ~92-96, ~106-110 s, fade 128-134 s.

## 2. Scene flow
**Intro (render only, A3).** Players' input is off, no guard AI runs, the section's guards are not spawned yet. The
intro has its own clock; the slow motion is the intro actors' and tracers' playback rate (0.3x), never `loop.timeScale`.
Each page frames its own operator (co-op: the partner stands beside him and is revealed by the pull-back). Music starts
at intro 0 s and plays on into play without a cut.

| Track time | Shot | What is seen and heard |
| --- | --- | --- |
| 0.0-3.0 s | Black | Piano alone. |
| 3.0-9.0 s | Fade in (6 s) | Upper chest, close (about 22 deg vertical field, 0.6 m off the chest, chest height). Pistol held low-ready, slide locked back (empty). Slow breathing. |
| 9.0-16.0 s | Hold | Breathing; off-screen muzzle flashes flicker on the crates and face from two directions; rounds thud into the timber, dull. About 14 s: one dry trigger click (no ammo). |
| 16.0-30.0 s | Pull back (14 s) | Dolly back and up, 0.6 m to about 5 m, widening; back to the crate wall W1; the partner beside; tracers at 0.3x from two sides (from the east, past the wall's south end; from the north, past its north end), splinters and dust off the crates. |
| 30.0-38.0 s | Wide reveal, on the first swell | Camera rises over the crate wall (about 3.4 m up, under the 4.5 m store ceiling, over the 2.4 m crates): surrounded, four guards closing in slow motion (0.3x) from two sides, rifles up and firing, the caged lamps on: two through the east door (from the side store, x 24, z 3-4.6), two through the north door (from the plant room, z 14, x 6-7.6). They stop on their stop spots (the G1-G4 EMP starts below), 5-7 m from the players. |
| 38.0 s on | EMP prompt | One button prompt (the interact button: pad A / keyboard E, "Set off the EMP"); either player in co-op. The shot holds and the actors idle at the stop line until pressed (no timer). |
| press + 0-0.8 s | EMP | Blue spark burst at the operator's belt, the existing EMP sound; every lamp dies in a ripple outward from him (all dead by 0.8 s). |
| press + 0.8-2.5 s | Black-out beat | Total black (underground: no windows, no sky); the first torches click on. |
| press + 2.5 s | Cut to play | The shoulder camera; input on; subtitle (radio, voiceable, G82): "Lights are dead. They'll come with torches." Then the objective line (G343): "Take down every guard. Then up the east stair, through the blast door." |

- Skip: hold the pause-menu Back / Esc for 1 s jumps to the 38 s beat (the music seeks to 38 s); the EMP still needs
  its press. A restart (everyone down) never replays the intro: the lights stay dead (S2 retakes the section start
  state after the blackout) and the music plays on (the scene's music mute survives `checkpointReset`'s calm,
  sectorMode.ts:1234).
- After the track ends (134 s), it loops from 41.0 s to the end with a 2 s cross-fade, until the scene ends.
- At the press, the intro actors are swapped (hidden by the flash) for the four real guards on the same spots (G1-G4
  below), spawned in the existing search state round the intro wall with torches on (GA1, GA3); they return to their
  fixed rounds as built. The other four (G5-G8) spawn on their posts with torches on and hold their rounds.
- **End (A9):** both players on the stair up (the exit zone) with every guard down: 2 s fade to black, the piano fades out, back to
  the menu (solo) or the lobby (co-op). No score, no rating, no results screen, no section rating banner or card (the
  "SECTORS CLEAR" banner, sectorMode.ts:1064, and the section rating view are skipped in a scene map). The stair with
  guards still up shows once: "Not yet. Nobody walks away from this." (no lock: both stair doors open from inside,
  level-design 16.3.6).

## 3. The map: Underhollow Store, Hollowmere (map id `underhollow`, `scene: 'piano'`)
A 1950s civil-defence store dug under Hollowmere: cast concrete, one level underground, now leased as a private bonded
store; tonight a security contractor's night crew holds it. Timber shipping crates are the cover. 38 x 19 m, north up,
x east, z north, origin the south-west corner. Plan: `docs/piano-escape/map-plan.svg` (1 m = 20 px). No windows: after
the EMP only the guards' torches give light.

| Space | Box (x, z, m) | Ceiling | What is in it | Lamps (caged bulkheads, all electric, all die at the EMP) |
| --- | --- | --- | --- | --- |
| Store Hall | 0-24, 0-14 | 4.5 m | Timber crates: the crate wall W1 (x 8-9.2, z 3-7, 2.4 m: the intro wall); tall stacks T1 (2-4.4, 9-10.2), T2 (13-15.4, 9.5-10.7), T3 (18-19.2, 2-4.4), all 2.4 m; low crates L1 (12-13.2, 3.5-4.7), L2 (4-5.2, 2-3.2), L3 (19-21.4, 7-8.2), L4 (8.5-9.7, 11.5-12.7), all 1.2 m | 6 |
| Plant Room | 0-10, 14-19 | 3.5 m | Standby generator (1-5, 15-17.5, 1.8 m); ventilation fan housing (6.5-9, 17-18.6, 2.2 m); steel grating floor | 2 |
| Service Corridor | 10-34, 14-16.4 | 2.6 m | Bare concrete corridor, cable trays | 3 |
| Side Store | 24-34, 0-8 | 3.2 m | Two caged steel racks R1 (26-32, 2.5-3.3) and R2 (26-32, 5-5.8), 2.4 m, an aisle between them | 2 |
| Guard Room | 24-34, 8-14 | 2.8 m | The night crew's room: lockers (24.2-25, 9-12, 2 m), desk (30-32.5, 12.4-13.4, 1.0 m) | 2 |
| East Stair | 34-38, 9-16.4 | rising | The stair up to the surface; blast door from the guard room (x 34, z 10.6-12.2) and a steel service door from the corridor (x 34, z 14.6-15.8); exit zone = the upper flight (34.5-38, 12.5-16) | 1 + exit sign |

- **Light (A10, Sector Ops' spec ~20:15):** map ambient 0 (the near-zero floor); no window lights; 16 lamps, every one
  `electric: true` with no switch `group` (no switch, so no guard walks to reset one), plus the exit sign. Before the
  EMP (intro only) the lamps light the store like a real site at night (interim rule, scale sheet 9). After the EMP the
  only light is the guards' torches: the meter, guard sight and the picture all read the store as black outside the
  cones (light parity); the players see by their night vision (picture only).
- **Doors:** east door store-side store (x 24, z 3-4.6), north door store-plant room (z 14, x 6-7.6), plant
  room-corridor (x 10, z 14.6-15.8), corridor-guard room (z 14, x 28-29.2), side store-guard room (z 8, x 30-31.2),
  blast door guard room-stair (x 34, z 10.6-12.2), service door corridor-stair (x 34, z 14.6-15.8).
- **Routes to the exit (two, they rejoin in the stair well):** north, store -> plant room -> corridor (past the pair)
  -> service door; south, store -> side store -> guard room -> blast door. The corridor-guard room door makes a loop.
- **Start / checkpoint:** behind W1, players at (7.6, 4.2) and (7.6, 5.6), backs to the crates, facing west; dark
  vantage (after the EMP no lamp is left; the guards are on the far side of the crates or past its north end).
- **Hide spots (4.7, 4.8):** the gap behind T1 (x 0-2, z 9-10.2), behind the generator (x 0-1, z 15-17.5), the rack
  aisle in the side store (x 26-32, z 3.3-5), behind the desk (x 32.5-34, z 12.4-14).

**Guards: 8 (1 or 2 players; same count for one player, A2).** All armed guards (no heavies, dogs or shields, G155).
Fixed patrols, starting values, no tuning (prototype). Every start and route point is at least 0.5 m clear of a
collider.

| Guard | Start (at the EMP) | Job and patrol | Isolation moment / takedown approach |
| --- | --- | --- | --- |
| G1 | (12.5, 2.2), searching (came in by the east door) | Store watch: back-and-forth along the south wall, (2, 1.4) - (16, 1.4), 6 s stop each end | West end stop (2.4, 1.4), from crouch behind low crate L2 (`behindLow`) |
| G2 | (6.8, 12.6), searching (came in by the north door) | Store west rounds: loop round stack T1, (1.2, 8.2) - (5.2, 8.2) - (5.2, 11.2) - (1.2, 11.2) | T1's north-east corner as he turns at (5.2, 11.2) (`corner`), out of G1's sight |
| G3 | (14, 6.5), searching (east door) | Store centre rounds: loop round stack T2, (12.2, 8.6) - (17, 8.6) - (17, 11.6) - (12.2, 11.6) | North-west turn (12.2, 11.6), from crouch behind low crate L4 (`behindLow`), facing away from G4 |
| G4 | (10.5, 10.5), searching (north door) | Store east aisle: back-and-forth on x 22.5, z 1.5 - 12.5 | As he passes the east door (22.5, 3.8), from its door frame (`corner`) |
| G5 + G6 | corridor west end (11, 14.8) and (11, 15.6) | Paired patrol, side by side: (11, 15.2) - (33, 15.2) (guard pairs, G335) | Taken together by a co-op double (two takedowns inside 1.5 s, G180) at the west turn (11.5, 15.2), the attackers waiting behind the fan housing in the plant room; solo: how one player parts them (no gadgets, empty pistol) is a walk note |
| G7 | (27.5, 11) | Guard room post: static, sweeps between the corridor door and the side-store door every 8 s | From behind the lockers while he faces the side-store door (`behind`) |
| G8 | (25, 1.4) | Side store rounds: loop (25, 1.4) - (33, 1.4) - (33, 6.8) - (25, 6.8) round the racks | Rack R2's east end as he walks the east leg north (`corner`), from the rack aisle |

- Overlap (4.5): G1, G3 and G4 cover each other across the store, G2 covers the store's west side, G7 sees into the
  corridor and side-store doors, G8 passes the east door. Bodies (4.7): the hide spots above sit by the takedown spots;
  G1, G4 and G8's routes cross open floor where a body would be found. Alarm, search and reinforcements: as built (A5).
- Torches: every guard's torch lit after the EMP (GA1), so 8 lit at the start: needs 8 torch slots (SO3, the Low
  graphics check). **Fallback if the check fails: 4 guards (G1, G4, G5 + G6), 4 torches, the same map** (Michael's
  sign-off covers both; never a guard without a lit torch).

## Claims
```claims
files:
  - src/core/flags.ts
  - src/world/mapDef.ts
  - src/world/maps/index.ts
  - src/world/maps/underhollow.ts
  - src/game/sectors.ts
  - src/game/modes/sectorMode.ts
  - src/game/piano*.ts
  - src/ui/screens/missionsScreen.ts
  - src/main.ts
  - src/game/gameState.ts
  - src/audio/music/music.ts
  - src/audio/music/scenePiano.ts
  - src/assets/music/scene/*
  - src/pwa/precacheGlobs.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - scripts/e2e-piano.mjs
  - scripts/run-e2e.mjs
  - scripts/e2e-affected.mjs
  - tests/piano*.test.ts
  - tests/scenePiano.test.ts
  - tests/precacheGlobs.test.ts
  - docs/audio-credits.md
  - docs/piano-escape/**
  - changes/feature-piano-escape*.md
maps: underhollow
protocol: none
save: none
```
Notes: `sectorMode.ts`, `sectors.ts`, `gameState.ts`, `coopHost.ts` and `main.ts` are shared files: each slice touches
them at named seams only (a few lines each) and rebases nothing (the train merges). Protocol is none: the EMP press is
an interactable use (the existing host-checked path) and the blackout reaches the client in the existing `lamps`
snapshot; if S4 finds the client cannot tell the intro is over from those, it adds one optional field to the existing
sector state, Opus-built, still no `PROTOCOL_VERSION` bump (the train does it), and this block is updated first.
Other teams' asks (below) are built on their own branches and claimed there.

## Slices
At most 2 builders at a time: wave 1 S1 + S3 (building now), then S1b after Michael's re-approval of the bunker, then
S2, then S4. S1, S1b and S3 need nothing from other teams. S2 builds on named stubs (below) and swaps each for the real
piece when it lands. S4 waits for the knife job's S1 and S3 and for GA1, GA3, SO1-SO3.

**S1 Scene shell on a stub map (Sonnet; building now).** The flag; a stub `underhollow.ts` (MapDef with
`scene: 'piano'`, `modes: ['sector']`, one SectorDef with the `clear` objective, a start, an exit zone, a few guards,
lamps `electric: true` with no switch group, map ambient 0: enough to run the shell, not the layout); the flagged
`MAPS` entry; `MapDef.scene`; the `clear` objective in `sectors.ts` / SectorMode; `src/game/pianoScene.ts` (empty
pistol: mag and reserve 0 at start, no gadgets, the objective line, the exit-zone "Not yet" line, the end fade, no
save / rating); the menu entry; `sectorOps()` skip. Until S2 lands the scene starts in play with lamps on (dev only).
- Files: flags.ts, mapDef.ts, maps/index.ts, maps/underhollow.ts (stub), sectors.ts, sectorMode.ts (seams),
  pianoScene.ts, missionsScreen.ts, main.ts, tests/underhollow.test.ts, tests/pianoScene.test.ts. Est. lines: ~700.
- Checks: `npm run typecheck:fast`; vitest underhollow / pianoScene (the stub builds; flag default off; `clear`
  objective done only when every guard is down; scene end writes no record; the main-menu entry shows only with the
  flag on); e2e: `affected-e2e` (expect e2e-modes / e2e-levels) + `e2e-coop` + `e2e-netmove` (game files).
- Done looks like: `?piano=1&autostart=underhollow&mode=sector` loads the stub, its guards on their rounds, the pistol
  empty, the exit ends the run only with every guard down, back to the menu.
- Flag: `pianoEscape`.

**S1b Greybox: Underhollow Store (Sonnet; after Michael's click on the bunker sign-off).** `underhollow.ts` gets the
section 3 layout: concrete walls, ceilings and doors of the six spaces, the timber crates (W1, T1-T3, L1-L4), the
plant, racks, lockers and desk, 16 caged bulkheads + the exit sign (every one `electric: true`, no switch `group`), map
ambient 0, no window lights; the SectorDef: start / start2 at W1, the exit zone on the stair's upper flight, the 8
guards as `SectorGuard` data (starts, routes, takedown spots), routes, hide spots; `docs/piano-escape/ELEMENTS.md`
(16.9 element register: every wall, crate, lamp and door with its real reason). Sector Ops runs SO2 (lamp bake) and
SO4 (ambient and lux check) on top of it.
- Files: maps/underhollow.ts, tests/underhollow.test.ts, docs/piano-escape/ELEMENTS.md. Est. lines: ~500.
- Checks: typecheck; vitest underhollow (the map builds; 8 guards each with a takedown spot and a fixed route; every
  lamp `electric` with no group; no `window` light; ambient 0; no guard start or route point inside or within 0.5 m of
  a collider; both routes and the loop open (nav)); e2e: `affected-e2e` (e2e-levels).
- Done looks like: the store as drawn, 8 guards on their rounds, both routes walkable to the stair.
- Flag: `pianoEscape`.

**S2 Intro and EMP (Opus: camera, engine).** `src/game/pianoIntro.ts` (pure: the shot table above as data, the camera
path and fade curves, skip to 38 s, prompt state; no allocation per frame); `src/game/pianoIntroView.ts` (Babylon:
drives the render-only camera override, the black fade (post or a DOM layer), the letterbox, the four intro actors
(GA4), tracers and wall sparks at 0.3x, the EMP burst); the EMP as an interactable on each operator (host-checked use,
either player); the blackout: every electric registry light cut in distance order over 0.8 s (SO1), then **retake the
section start state after the blackout** (`startState.take(lights, doors)`, the same call as sectorMode.ts:786), so a
restart (`restartSection` applies it, :1252) keeps the store dark; then the section's guards spawn (G1-G4 on the
actors' spots, searching, GA3) and input comes on; restart skips the intro. Both operators get `introPose(true)` for
the intro and `introPose(false)` at the cut (knife job S4b). Input lock during the intro uses the existing pause /
cutscene input path (no new binding). Babylon only through `src/core/babylon.ts`; tracers through `Vfx.tracer` with
reused scratch vectors (no per-frame allocation); `pianoScene.ts` never imports `src/net`. New suite
`scripts/e2e-piano.mjs` (solo): intro runs, skip lands on the prompt, the press kills every lamp, the meter reads dark
at the start, play input works, restart has no intro and every electric lamp stays off.
- Stubs until the other teams land (each swapped in place when it does): the blackout through the registry's existing
  `disrupt` over the whole map for longer than the scene (lights.ts:437; the lamps have no switch group) until SO1; the intro actors through the
  guard freeze (`src/game/sectorGuardFreeze.ts`) plus an animation rate until GA4; the operators in `wall_idle` with the
  pistol stance until `introPose` (PB6, knife S4b); G1-G4's search start through the existing search entry until GA3.
- Files: pianoIntro.ts, pianoIntroView.ts, pianoScene.ts, gameState.ts (one render-override seam), sectorMode.ts
  (spawn-after-EMP and start-state retake seams), scripts/e2e-piano.mjs, run-e2e.mjs, e2e-affected.mjs (a
  DIRECT_COVERS row for `src/game/piano*` and `src/world/maps/underhollow.ts`), tests/pianoIntro.test.ts,
  tests/pianoScene.test.ts. Est. lines: ~1100.
- Checks: typecheck; vitest pianoIntro (timeline at 0 / 3 / 9 / 16 / 30 / 38 s; camera path continuous; skip; no
  timeScale writes) and pianoScene (a restart after the blackout keeps every electric lamp off); e2e: e2e-piano +
  `e2e-coop` + `e2e-netmove`; one GPU look video of the intro (laptop queue; check the camera rise shows the guards
  over W1).
- Done looks like: the shot list above plays, the EMP press blacks out the store, torches come on, play begins.
- Flag: `pianoEscape`.

**S3 Piano music (Sonnet).** Copy the MP3 to `src/assets/music/scene/piano-escape.mp3` (as is, 4.29 MB; Pixabay
Content License allows it); `src/audio/music/scenePiano.ts` (decoded on scene start only, from the same origin: no
CDN; plays from 0, `seek(38)` for the skip, loop 41.0 s - end with a 2 s cross-fade, fade out at the end, stop on
leave); `Music.scene(on)` mutes the director's calm / caution / alert while the scene plays (the piano is the only
score); keep the file out of the precache (`PRECACHE_IGNORES`) so nobody downloads it unless the scene runs;
`docs/audio-credits.md` row (Pixabay page, licence, SHA-256, "Investigation Piano" by leberch, id 611639).
- Files: the asset, scenePiano.ts, music.ts, precacheGlobs.ts, tests/scenePiano.test.ts, tests/precacheGlobs.test.ts,
  docs/audio-credits.md. Est. lines: ~300 (plus the asset).
- Checks: typecheck; vitest scenePiano (loop and seek maths) and precacheGlobs; e2e: e2e-music (affected).
- Done looks like: the piano plays from the black screen to the end, nothing else plays, offline cache unchanged.
- Flag: `pianoEscape` (only the scene starts it).

**S4 Knife kills, co-op and the full run (Opus: src/net, animation wiring).** In the scene every takedown offer is the
knife kill (one press, lethal, knife shown only during the kill): `pianoScene.ts` calls
`takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, true))` after the EMP and `setKnifeScene(false)` on leave
(knife job S1, PB5); the co-op host keeps the campaign
revive cap for a scene map (`coopHost.ts:205`); the client's intro ends on the host's EMP (interactable state and the
`lamps` snapshot); either player's press works. Extend `e2e-piano` with a two-tab `?net=local` run: both pages see
the blackout, the client presses the EMP once, a knife kill by each player, the co-op double on G5 / G6, both on the
stair ends the scene on both pages; a restart keeps the client's lamps off. Both pages run with the flag (/preview/
or `?piano=1`): a client without it falls back to `provingGrounds` (`getMap`, maps/index.ts:30). If SO3 is not in
yet, S4 runs on the 4-guard set (G1, G4, G5 + G6) and the other four join when SO3 passes.
- Files: pianoScene.ts, coopHost.ts, coopClient.ts (if needed), scripts/e2e-piano.mjs. Est. lines: ~400.
- Checks: typecheck; vitest pianoScene; e2e: exactly `e2e-coop` + `e2e-netmove` + `e2e-ctcourse` (src/net) +
  e2e-piano; two independent Opus checkers (src/net).
- Done looks like: two players play the scene start to end with knife kills in the dark.
- Flag: `pianoEscape`.
- Waits for: knife job S1 (`setKnifeScene`, PB1 placeholder clips, PB5) and S3 (co-op knife wire, PB4) on
  feature/piano-knife; GA1 and GA3 (Guard AI); SO1-SO3 (Sector Ops). Knife S2 (mocap clips) and S4b (`introPose`)
  improve the look but do not block S4.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `?piano=1` (`flags.pianoEscape`; on in /preview/) | off | Night Shift \| Campaign Build | on Michael's word after his walk; review 2026-11-02 | S1-S4 passed + Michael's walk accepted + his word to ship it |

## Player Build asks (knife kills and the intro pose; mocap only, retargeted, G406)
**Built by the knife job: origin/feature/piano-knife, `docs/piano-knife/PLAN.md` (head 494779256), slices S1-S5.**
Each ask below names the knife slice and hook that delivers it. Knife S5 (above / drop / hang-down / window kills, RT
slash) is not needed by this map: it has no drops, ledges or windows to kill from.

Answers to the knife plan's "Needs from Campaign" (section 6; the lead gave them, recorded here):
- Q-C1 Map id `underhollow` (knife gate `knifeSceneOn` in `src/game/knifeKill.ts`: true only for a map with `scene: 'piano'`); `src/game/pianoScene.ts` calls `setKnifeScene` after the EMP.
- Q-C2 Flag `pianoEscape`, added by Campaign (S1 here).
- Q-C3 8 standard armed human guards; no dogs, heavies, enforcers or shields.
- Q-C4 Approaches as section 3: `behind`, `behindLow` (from crouch behind the low crates), `corner` (crate stack ends, rack ends
  and door frames), and `front` as their S1 builds it; no drops, ledges, hang-down lips or windows.
- Q-C5 Both operators appear in the intro, at W1 (7.6, 4.2) and (7.6, 5.6); intro 38 s then the prompt (open-ended);
  the close-up runs 3-16 s (hero LOD); S2 calls `introPose(true)` at the intro start and `introPose(false)` at the cut.
- Q-C6 Pistol holstered in play; the knife shows only during a kill.
- Q-C7 The exit counts every guard down (the `clear` objective plus the exit zone); bodies are carried and hidden as
  built.

Files both plans touch, and who owns each change:
| File | Knife job (Player Build) | This job (Campaign Build) |
| --- | --- | --- |
| `src/game/gameState.ts` | menu rows :1518-1525 only | S2: one render-override seam |
| `src/net/coopHost.ts` | S3: the knife wire | S4: the scene's revive cap (one line at :205) |
| `src/net/coopClient.ts` | S3: the knife wire | S4: intro end on the host's EMP, only if needed |
| `src/core/flags.ts` | reads `pianoEscape` only | S1: adds `pianoEscape` |
| `src/game/takedownController.ts` | S1: `setKnifeScene`, the knife kill | not touched (calls `setKnifeScene` from `pianoScene.ts`) |
| `src/game/pianoScene.ts` | not touched | S1 / S2 / S4: owner |
Each side keeps to its named lines; the train merges both.

| Ask | What | Where used | Size | Blocks |
| --- | --- | --- | --- | --- |
| PB1 | **Knife S1 (placeholder) + S2 (clips), row `behind`.** Knife kill from behind, standing: attacker (knife in the right hand, the `KnifeModel`) and victim, one pair. Targets: approach 0.22 s (as `TAKEDOWN.approach`), contact about 0.7 s, guard on the floor by 1.6 s, attacker free by 2.0 s. Weighty, visible; blood only what the game already draws. | Every guard; the default for any kind without its own clip | M (~1 day: source take, retarget, wire into the lethal takedown on the `behind` kind) | S4 |
| PB2 | **Knife S1 + S2, row `behindLow`.** Knife kill from behind, attacker starting crouched (rises into it). Targets: contact about 0.8 s, attacker free by 2.2 s. | G1 from behind L2, G3 from behind L4 | S | none (falls back to PB1) |
| PB3 | **Knife S1 + S2, row `corner`.** Knife kill around a corner (`corner` kind: attacker at a wall end pulls the guard round and kills out of sight). Targets: contact about 0.9 s, the body left lying round the corner, free by 2.4 s. | G2 at stack T1, G4 at the east door frame, G8 at rack R2 | S-M | none (falls back to PB1) |
| PB4 | **Knife S3 (co-op wire, remote pose).** Co-op double: no dedicated dual move (G180). Two PB1 kills started inside `DUAL_WINDOW` 1.5 s on guards 1-2 m apart must read side by side (victims fall clear of each other), and the remote pose shows the knife kill (remotes pose from `MoveState`). | G5 + G6 | S (check and fix) | S4 |
| PB5 | **Knife S1, `takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, true))`.** A scene switch (set by `pianoScene.ts` after the EMP, S4): every takedown offer is the lethal knife kill on one press (no tap / hold), the knife shown in hand from the press to the free; off the scene nothing changes. | All takedowns in the scene | S (~100 lines in `takedownController.ts`) | S4 |
| PB6 | **Knife S4a (slide lock) + S4b (`introPose(on)`).** Intro pose: standing back flat to a wall, the empty pistol low-ready in both hands with the slide locked back (the weapon model's slide held back), slow calm breathing readable at chest close-up (about a 4 s cycle). The partner: the same pose, a mirror or a crouch, beside him. | Intro shots 3-38 s | S | none (S2 uses `wall_idle` + the pistol stance until it lands) |

## Guard AI Build asks (BRIEF A11: scene-only, gated on the scene's blackout; nothing changes off the scene)
Already on master: guards carry torches, dogs do not, on only while investigating / searching in the dark (`torchRule`,
`src/ai/archetypes.ts:164`); guards know per circuit when lights are cut (`src/ai/breaker.ts`), and a cut with no
switch reads as `DARK_NONE` (breaker.ts:46-51: no breaker walk, no late discovery). **Guard sight stays pure light
parity** (sight scales with the light on the body, `src/ai/perception.ts:115` `lightFactor`): only light the meter
reads, torch cones included, can show a player; no extra sight rule (the first plan's GA2 is dropped).
| Ask | What | Where used | Size | Blocks |
| --- | --- | --- | --- | --- |
| GA1 | Torch on in every state (calm included) during the scene blackout, for every human guard, while he is up. | The whole escape | S (~60 lines + tests; two Opus checkers, an AI rule) | S4 |
| GA3 | One blackout reaction: at the EMP, G1-G4 (the four PLAN section 2 brings in during the intro) start in the existing search state round the intro wall (about 6 m), then return to their fixed rounds as built; G5-G8 hold their posts and rounds. | The EMP moment | S (~50 lines + tests) | S4 (S2 uses the existing search entry as a stub) |
| GA4 | Intro actors: a guard figure (mesh, rifle) the intro can place and drive along a path at a set playback rate (0.3x) with the existing aimed walk and fire poses, no AI, no perception, not in the enemy lists; or confirm the guard freeze (`sectorGuardFreeze.ts`) plus an anim rate does it. | Intro 30-38 s | S | none (S2 stub: the guard freeze plus an anim rate) |
| GA5 | Review the 8 guards' posts and patrols in `underhollow.ts` (data only; `validatePosts`), the G5 / G6 pair as a guard pair (G335). | S1 data | XS (review) | none |

## Sector Ops Build asks (lighting: one system, parity)
Sector Ops' lighting spec for the bunker (~20:15): map ambient 0 (the near-zero floor); no window lights; every lamp
`electric: true` with no switch `group`; after the EMP only the guards' torches light anything.
| Ask | What | Where used | Size | Blocks |
| --- | --- | --- | --- | --- |
| SO1 | The blackout call in the one lighting system: every electric light cut and never back (no timeout, no switch for a guard to reset), in a given order over 0.8 s; host-side, reaching the client in the existing `lamps` snapshot; meter, guard sight and picture agree at once. **Building now on feature/piano-lights-so1.** | The EMP | S (data + one call) | S4 (S2 stub: a whole-map `disrupt` longer than the scene, lights.ts:437) |
| SO2 | The map's pre-built lamp bake (as #582, so it loads warm); after the EMP the baked lamps read as off. Runs on top of S1b. | The intro and the escape | S | S2 look, S4 |
| SO3 | Torch count: 8 torch slots and shadow tiles (`FLASHLIGHTS` 4, `TORCH_DRAW_SLOTS` 4 today: a shader loop and shadow atlas cost) and the Low graphics check that gives the 8-or-4 verdict (4: the fallback guard set above). **Building now on feature/piano-lights-so3.** | The whole escape | S-M + the check | S4 |
| SO4 | Map ambient 0 and the light-meter check (#518 lux tools): black everywhere except inside torch cones. Runs on top of S1b. | S1b data | S (data + check) | none |

## Level-design rules for a test scene
The scene is not a campaign mission or a Sector Ops op; it borrows the SectorMode runtime. It follows:
- 2.1-2.6 real building (purpose, why-is-it-here, real proportions, real locks), 3.1 entry vantage, 3.3 routes rejoin,
  3.4 a loop (corridor-guard room door), 3.9 one checkpoint (the start), 3.10 designed exit (both players), 4.1 jobs, 4.3
  clockwork, 4.4 isolation moment per guard, 4.5 overlap, 4.7 bodies and hide spots, 4.8 survivable searches, 4.10
  archetypes (armed guards only), 5.1 and 5.5 every light has a source and the darkness has a real cause (the EMP),
  ambient 0 underground with no windows, 5.3 floors from real materials (concrete, plant-room grating), 6.4 guide without markers (the objective names what and where),
  9.1-9.2 failure, 9.4 downed (campaign rule), 16.3.6 the exit door opens from inside, 16.9 element register (S1
  writes it as one table, `docs/piano-escape/ELEMENTS.md`: every wall, crate, lamp and door with its
  real reason).
It skips, with reasons (each is the plain line on the SIGNOFF page):
- 14 phases and RULES "Intake" step 5: the level-validator graph and its gate before greybox, the measured validator
  pass at greybox exit, bot route-runs (G289, G330); with no validator, its checks 11.2 (two routes per section),
  11.7 (room for two), 11.8 (co-op reach) and 11.9 (co-op kit coverage) are not run either: a one-off six-space scene;
  the walk replaces them. The `docs/templates/map-spec.md` spec is not written: this PLAN is the spec.
- 3.2 three routes plus a secret per guarded space: two routes to the exit and one loop (small map).
- 4.9 guard count bands per space and 4.2 patrol mix across adjacent spaces: 8 guards in 6 spaces, mixed but not
  graded.
- 4.11 security devices and the security register: the scene has none (no cameras, lasers, keypads or alarm panels).
- 5.2 lit chokepoints: none exist after the EMP.
- 6.1 / 6.2 teach-test-twist, pacing in minutes, beat chart; 7.2 two toys per space (no switches or lamps left after
  the EMP); 10 exploration and reward.
- 11.1 exactly two players (one player allowed, A2); 11.3 short even splits, 11.4 an assist per split, 11.5 an
  overwatch spot per split, 11.6 a downed partner reachable across a split (the scene has no designed splits); 11.10
  forced co-op gate; 11.11 teamwork minimums (the corridor pair's double is the scene's one must-do co-op beat).
- 13 deliverables (space sheets, guard sheets, security register) beyond this plan; 15 acceptance tests beyond the walk.
**Question for Michael (rides on Q1):** `CLAUDE.md` says a new map follows `docs/level-design.md` and may never loosen
it without his written approval. These skips loosen it for this scene only, so the SIGNOFF page lists them in plain
words and his Q1 click ("Approve, build it") approves them in writing, for this scene only; "Change it first" holds
the build. A2 (one player may run it) is in the same
list; no other Michael rule is loosened (G127 / G146 are already his pick for this scene; G367 holds because the EMP is
a real cause, A10).

## Walk items
- Main menu > Piano Escape (`?piano=1`, or /preview/): the intro plays to the piano, the camera pulls back on the
  swell, the EMP press kills the lights - accept when it feels like the scene Michael described.
- Same, co-op (both players on /preview/ or `?piano=1`; Co-op > host > Sector Ops > Underhollow Store): the escape in the dark with torches and knife kills,
  the double on the corridor pair - accept when it is tense and quiet and every guard can be taken in the shadows.
- The end: both on the stair up, fade out, no score - accept when it ends cleanly.

## Risks and open questions
- Three teams' asks gate S4: S1-S3 build first; S4 starts when knife S1 + S3, GA1, GA3 and SO1-SO3 are on master (the
  lead tracks them on the ROADMAP row).
- Pure darkness and readability: the players see by their night vision; if the picture is unreadable at Low, that is a
  walk note, not tuning now (prototype).
- 8 torches are over today's 4-torch limit (SO3): the fallback is the named 4-guard cut, never unlit guards.
- `sectorMode.ts` is busy on other branches: S1 / S2 keep to small named seams so the train's merges stay easy.
- 4.29 MB MP3: kept out of the precache and fetched only when the scene runs; re-encoding to 128 kb/s would halve it
  (a later choice, not now).
- G180 says no dedicated dual move, so the brief's "co-op double" is two knife kills timed together (PB4), not a new
  paired clip.
- Start pressure: G1-G4 search round W1 with lit torches from the first second of play (4.8 survivable searches): the
  the gap behind T1, the plant room and the dark west side are the escapes; a walk note, not tuning now.
