# piano-escape: plan
Owner: Night Shift | Campaign Build. Status: current.

Lead: Night Shift | Campaign Build. Planner: Opus 5.5, master 1b58989ed. Brief: `docs/piano-escape/BRIEF.md` (A1-A10,
Michael ~19:20 / ~19:28 / ~19:40 / ~19:55). Prototype mode: small, no tuning, one test set.

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
  The map joins `MAPS` only when it is on (`src/world/maps/index.ts`, like `ctcourseReplan`), so map-wide checks and
  menus never see it otherwise. Reached by: a main-menu entry "Piano Escape" (`MainMenuScreen.entries`, `src/main.ts`
  :253, solo start), the co-op lobby (Sector Ops, map "Aldgrave Piano Works"), and
  `?piano=1&autostart=pianoWorks&mode=sector` (dev, e2e). `sectorOps()` (`src/ui/screens/missionsScreen.ts:51`) skips
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
  `src/world/lights.ts:149`; `setGroup` :361, `destroy` :378, `disrupt` :436 is the EMP gadget's timed cut, called at
  `src/game/gadgetSystem.ts:402`). `LightField` (`src/world/lightField.ts`) gives the meter and guard sight from the bake
  plus the registry's live state plus torches as dynamic lights, so a lamp that goes off leaves the picture, the meter
  and guard sight together. Guard torches are `electric: false` (`src/world/torches.ts:38`): an EMP never kills them.
  `FLASHLIGHTS = 4` slots on a dark map (torches.ts:15) and a 4-tile torch shadow atlas (`TORCH_DRAW_SLOTS`,
  `src/world/shadowAccuracy.ts:82`): **at most 4 lit torches at once today.** Torches are lit only while investigating
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
| 9.0-16.0 s | Hold | Breathing; off-screen muzzle flashes flicker on the wall and face; wall impacts heard, dull. |
| 16.0-30.0 s | Pull back (14 s) | Dolly back and up, 0.6 m to about 5 m, widening; back to the brick wall; the partner beside; tracers crossing past both ends of the wall at 0.3x, dust and sparks on the brick. |
| 30.0-38.0 s | Wide reveal, on the first swell | Camera rises over the wall top: four guards advancing in slow motion (0.3x) from the hall door, rifles up, the lamps on. They stop on their stop line 3-6 m from the wall. |
| 38.0 s on | EMP prompt | One button prompt (the interact button: pad X / keyboard E, "Set off the EMP"); either player in co-op. The shot holds and the actors idle at the stop line until pressed (no timer). |
| press + 0-0.8 s | EMP | Blue spark burst at the operator's belt, the existing EMP sound; every lamp dies in a ripple outward from him (all dead by 0.8 s). |
| press + 0.8-2.5 s | Black-out beat | Near black; the moon pools fade up through the high windows; the first torches click on. |
| press + 2.5 s | Cut to play | The shoulder camera; input on; subtitle (radio, voiceable, G82): "Lights are dead. They'll come with torches." Then the objective line (G343): "Take down every guard. Then out the showroom front door." |

- Skip: hold the pause-menu Back / Esc for 1 s jumps to the 38 s beat (the music seeks to 38 s); the EMP still needs
  its press. A restart (everyone down) never replays the intro: the lights stay dead and the music plays on.
- After the track ends (134 s), it loops from 41.0 s to the end with a 2 s cross-fade, until the scene ends.
- At the press, the intro actors are swapped (hidden by the flash) for the four real guards on the same spots (G1-G4
  below), spawned in the searching state with torches on (Guard AI asks GA1, GA3). The other four spawn on their posts.
- **End (A9):** both players on the front porch with every guard down: 2 s fade to black, the piano fades out, back to
  the menu (solo) or the lobby (co-op). No score, no rating, no results screen. The porch with guards still up shows
  once: "Not yet. Nobody walks away from this." (no lock: the door opens from inside, level-design 16.3.6).

## 3. The map: Aldgrave Piano Works, Hollowmere (map id `pianoWorks`)
A 1920s brick piano works on one storey, now a private storage and restoration shop; tonight a security contractor's
night crew holds it. 40 x 19 m (plus a 2.5 m porch), north up, x east, z north, origin the south-west corner. Plan:
`docs/piano-escape/map-plan.svg` (1 m = 20 px).

| Space | Box (x, z, m) | Height | What is in it | Electric lamps (all die at the EMP) | Honest night light after the EMP |
| --- | --- | --- | --- | --- | --- |
| Loading Dock | 0-12, 0-16.4 | 6 m | Brick crate-bay wall W1 (x 6, z 3-7, 3 m high: the intro wall); piano crates C1-C3 (1.8 m); a low pallet stack (1.0 m); dock office (0-4, 12-16.4, a hide spot); roller shutter (south, chained) | 6 high-bays | none (no windows): darkest space, start vantage |
| Assembly Hall | 12-30, 0-14 | 7 m | 3 rows of 4 cast-iron piano frames on trestles (1.6 x 1.4 m, 1.0 m high); timber rack (2.4 m) along the south wall; workbench along the east aisle | 6 high-bays | moonlight through 3 north clerestory windows (over the corridor roof) |
| Corridor + tea room | 12-30, 14-16.4; tea room 18-22, 16.4-19 | 3 m | Plain corridor; tea room alcove (hide spot) | 3 panels + 1 | none |
| Varnish Room | 30-40, 0-7 | 4 m | Spray booth (35-39, 1-5, 2.5 m, open front: a hide spot behind it); drum stack (1.2 m) | 2 bulkheads | faint city glow, one small east window |
| Showroom | 30-40, 7-19 | 4.5 m | Three grand pianos on display (2.7 x 1.5 m, 1.0 m); reception desk; front door (east wall, z 17.2-18.4) to the porch (40-42.5, 16.5-19) | 4 panels + exit sign | city glow through 2 tall street windows (east wall) |

- **Night light levels (A10, level-design 5.5):** after the EMP only the sky lights the inside, and only faintly: moon
  through the clerestory up to about 0.1 lux on the hall floor (full moon on open ground is about 0.1-0.3 lux; through
  glass and depth, less), city skyglow by the showroom and varnish windows about 0.02-0.05 lux, everywhere else near
  0 (map ambient near 0). All of it sits under the meter's 1 lux edge-of-dark band, so in play the meter and the guards
  read the whole works as dark and only torch cones light a player; the window glow shows only through night vision.
  These are `window` lights (not electric, outside the EMP), set through the light-realism calibration (G368); the
  street lamps are off the map, 30+ m away. Before the EMP (intro only) the lamps light the works like a real site at
  night (interim rule, scale sheet 9). Sector Ops owns the ambient, the window values and the lux check (SO4).
- **Doors:** dock-hall (x 12, z 4-6), dock-corridor (x 12, z 14.6-15.8), dock office (x 4, z 13-14), hall-corridor
  (z 14, x 26-27.2), corridor-tea room, corridor-showroom (x 30, z 14.6-15.8), hall-varnish (x 30, z 2-3.2),
  varnish-showroom (z 7, x 37-38.2), front door (x 40, z 17.2-18.4).
- **Routes to the exit (two, they rejoin in the showroom):** north, dock -> corridor -> showroom (past the pair); south,
  dock -> hall -> varnish room -> showroom. The hall-corridor door makes a loop.
- **Start / checkpoint:** behind W1, players at (5.6, 4.2) and (5.6, 5.6) facing west; dark vantage (no lamp left, no
  window; the guards are on the far side of the wall).

**Guards: 8 (1 or 2 players; same count for one player, A2).** All armed guards (no heavies, dogs or shields, G155).
Fixed patrols, starting values, no tuning (prototype).

| Guard | Start (at the EMP) | Job and patrol | Isolation moment / takedown spot |
| --- | --- | --- | --- |
| G1 | (9, 4), searching | Dock watch: back-and-forth along the shutter, (2, 1.8) - (10, 1.8), 6 s stop each end | West end stop, beside crate C1's shadow (2.5, 2.6) |
| G2 | (9.5, 6.5), searching | Dock rounds: loop round crate C2, (5.5, 8) - (9, 8) - (9, 11) - (5.5, 11) | North-west corner (5.5, 11), out of G1's sight |
| G3 | (11, 3), searching | Hall rounds: loop round the west frames, (13.2, 1.9) - (20.2, 1.9) - (20.2, 8.4) - (13.2, 8.4) | (13.2, 8.4) by the frame row, facing away from G4 |
| G4 | (11, 7), searching | Hall aisle: back-and-forth on the east aisle, x 27, z 2 - 12.5 | North end turn (27, 12.5) by the corridor door |
| G5 + G6 | corridor west end | Paired patrol, side by side: (13, 15.2) - (29, 15.2) (guard pairs, G335) | Taken together by a co-op double (two takedowns inside 1.5 s, G180) at the west turn (13.5, 15.2); solo: split them with a noise first |
| G7 | (34, 6) | Varnish post: static, sweeps between the hall door and the showroom door every 8 s | Behind the spray booth (36, 5.6) while he faces the hall door |
| G8 | (31.2, 8.2) | Showroom rounds: loop (31.2, 8.2) - (36, 8.2) - (38.5, 11.5) - (38.5, 15.8) - (35, 18.2) - (31.2, 18.2) | Behind the north grand piano (34, 17) |

- Overlap (4.5): G1 / G2 cover each other in the dock, G3 / G4 in the hall, G7 sees into the showroom door. Bodies
  (4.7): hide spots by each space's takedown spots (dock office, tea room, behind the booth, behind the desk); G1, G4
  and G8's routes cross open floor where a body would be found. Alarm, search and reinforcements: as built (A5).
- Torches: every guard's torch lit after the EMP (GA1), so 8 lit at the start: needs 8 torch slots (SO3, one laptop
  GPU check). **Fallback if the GPU check fails: 4 guards (G1, G4, G5 + G6), 4 torches, the same map** (Michael's
  sign-off covers both; never a guard without a lit torch).

## Claims
```claims
files:
  - src/core/flags.ts
  - src/world/mapDef.ts
  - src/world/maps/index.ts
  - src/world/maps/pianoWorks.ts
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
maps: pianoWorks
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
At most 2 builders at a time: wave 1 S1 + S3, wave 2 S2, wave 3 S4. Nothing starts before Michael's G288 click (Q1).

**S1 Scene shell and greybox map (Sonnet).** The flag; `pianoWorks.ts` (MapDef with `scene: 'piano'`, `modes:
['sector']`, one SectorDef with the `clear` objective, start / start2 at W1, extract = the porch, the 8 guards as
`SectorGuard` data with takedown spots, routes, hide spots, 22 lamps + exit sign as electric registry lights, the 6
`window` lights, greybox walls and cover from `LevelBuilder` / `storey.ts`); the flagged `MAPS` entry; `MapDef.scene`;
the `clear` objective in `sectors.ts` / SectorMode; `src/game/pianoScene.ts` (empty pistol: mag and reserve 0 at start,
no gadgets, the objective line, the porch line, the end fade, no save / rating); the menu entry; `sectorOps()` skip.
Until S2 lands the scene starts in play with lamps on (dev only).
- Files: flags.ts, mapDef.ts, maps/index.ts, maps/pianoWorks.ts, sectors.ts, sectorMode.ts (seams), pianoScene.ts,
  missionsScreen.ts, main.ts, tests/pianoWorks.test.ts, tests/pianoScene.test.ts. Est. lines: ~900.
- Checks: `npm run typecheck:fast`; vitest pianoWorks / pianoScene (map builds; 8 guards each with a takedown spot and
  a fixed route; every lamp `electric`; window light levels under the bands above; flag default off; `clear` objective
  done only when every guard is down; scene end writes no record); e2e: `affected-e2e` (expect e2e-modes / e2e-levels)
  + `e2e-coop` + `e2e-netmove` (game files).
- Done looks like: `?piano=1&autostart=pianoWorks&mode=sector` loads the works, 8 guards on their rounds, the pistol
  empty, the porch ends the run only with every guard down, back to the menu.
- Flag: `pianoEscape`.

**S2 Intro and EMP (Opus: camera, engine).** `src/game/pianoIntro.ts` (pure: the shot table above as data, the camera
path and fade curves, skip to 38 s, prompt state; no allocation per frame); `src/game/pianoIntroView.ts` (Babylon:
drives the render-only camera override, the black fade (post or a DOM layer), the letterbox, the four intro actors
(GA4), tracers and wall sparks at 0.3x, the EMP burst); the EMP as an interactable on each operator (host-checked use,
either player); the blackout: every electric registry light cut in distance order over 0.8 s (SO1), then the
section's guards spawn (G1-G4 on the actors' spots, searching) and input comes on; restart skips the intro. Input lock
during the intro uses the existing pause / cutscene input path (no new binding). New suite `scripts/e2e-piano.mjs`
(solo): intro runs, skip lands on the prompt, the press kills every lamp, the meter reads dark at the start, play
input works, restart has no intro.
- Files: pianoIntro.ts, pianoIntroView.ts, pianoScene.ts, gameState.ts (one render-override seam), sectorMode.ts
  (spawn-after-EMP seam), scripts/e2e-piano.mjs, run-e2e.mjs, e2e-affected.mjs (a DIRECT_COVERS row for
  `src/game/piano*` and `src/world/maps/pianoWorks.ts`), tests/pianoIntro.test.ts. Est. lines: ~1100.
- Checks: typecheck; vitest pianoIntro (timeline at 0 / 3 / 9 / 16 / 30 / 38 s; camera path continuous; skip; no
  timeScale writes); e2e: e2e-piano + `e2e-coop` + `e2e-netmove`; one GPU look video of the intro (laptop queue).
- Done looks like: the shot list above plays, the EMP press blacks out the works, torches come on, play begins.
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
knife kill (one press, lethal, knife shown), through Player Build's switch (PB5); the co-op host keeps the campaign
revive cap for a scene map (`coopHost.ts:205`); the client's intro ends on the host's EMP (interactable state and the
`lamps` snapshot); either player's press works. Extend `e2e-piano` with a two-tab `?net=local` run: both pages see
the blackout, the client presses the EMP once, a knife kill by each player, the co-op double on G5 / G6, both on the
porch ends the scene on both pages.
- Files: pianoScene.ts, coopHost.ts, coopClient.ts (if needed), scripts/e2e-piano.mjs. Est. lines: ~400.
- Checks: typecheck; vitest pianoScene; e2e: exactly `e2e-coop` + `e2e-netmove` + `e2e-ctcourse` (src/net) +
  e2e-piano; two independent Opus checkers (src/net).
- Done looks like: two players play the scene start to end with knife kills in the dark.
- Flag: `pianoEscape`.
- Waits for: PB1, PB5 (Player Build), GA1-GA3 (Guard AI), SO1-SO3 (Sector Ops). S1-S3 do not wait.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `?piano=1` (`flags.pianoEscape`; on in /preview/) | off | Night Shift \| Campaign Build | none set: an experiment; live only if Michael asks after his walk | S1-S4 passed + Michael's walk accepted + his word to ship it |

## Player Build asks (knife kills and the intro pose; mocap only, retargeted, G406)
| Ask | What | Where used | Size | Blocks |
| --- | --- | --- | --- | --- |
| PB1 | Knife kill from behind, standing: attacker (knife in the right hand, the `KnifeModel`) and victim, one pair. Targets: approach 0.22 s (as `TAKEDOWN.approach`), contact about 0.7 s, guard on the floor by 1.6 s, attacker free by 2.0 s. Weighty, visible; blood only what the game already draws. | Every guard; the default for any kind without its own clip | M (~1 day: source take, retarget, wire into the lethal takedown on the `behind` kind) | S4 |
| PB2 | Knife kill from behind, attacker starting crouched (rises into it). Targets: contact about 0.8 s, attacker free by 2.2 s. | G1, G3, G8 takes from the frames and pianos | S | none (falls back to PB1) |
| PB3 | Knife kill around a corner (`corner` kind: attacker at a wall end pulls the guard round and kills out of sight). Targets: contact about 0.9 s, the body left lying round the corner, free by 2.4 s. | G2 at the dock corner, G4 at the corridor door, G7 at the booth | S-M | none (falls back to PB1) |
| PB4 | Co-op double: no dedicated dual move (G180). Two PB1 kills started inside `DUAL_WINDOW` 1.5 s on guards 1-2 m apart must read side by side (victims fall clear of each other), and the remote pose shows the knife kill (remotes pose from `MoveState`). | G5 + G6 | S (check and fix) | S4 |
| PB5 | A scene switch (set by `pianoScene.ts`): every takedown offer is the lethal knife kill on one press (no tap / hold), the knife shown in hand from the press to the free; off the scene nothing changes. | All takedowns in the scene | S (~100 lines in `takedownController.ts`) | S4 |
| PB6 | Intro pose: standing back flat to a wall, the empty pistol low-ready in both hands with the slide locked back (the weapon model's slide held back), slow calm breathing readable at chest close-up (about a 4 s cycle). The partner: the same pose, a mirror or a crouch, beside him. | Intro shots 3-38 s | S | none (S2 uses `wall_idle` + the pistol stance until it lands) |

## Guard AI Build asks (no new patrol AI: these are the blackout and the intro, scene-only switches)
Already on master: guards carry torches, dogs do not, on only while investigating / searching in the dark (`torchRule`,
`src/ai/archetypes.ts:164`); guards know per circuit when lights are cut (`src/ai/breaker.ts`).
| Ask | What | Where used | Size | Blocks |
| --- | --- | --- | --- | --- |
| GA1 | Torch on in every state (calm included) during a scene blackout, for every human guard, while he is up. | The whole escape | S (~60 lines + tests) | S4 |
| GA2 | Sight limited to the beam cone in a blackout: a guard sees a player only where that player is lit (his own or another guard's torch cone, a moon pool), plus a short touch range; hearing as built. Every detection stays explainable (P5). | The whole escape | M (~150 lines + tests) | S4 |
| GA3 | One blackout reaction for all circuits at once: at the EMP, one shared event puts every guard into the existing search state round the last known point (the intro wall, about 6 m search), then they settle back to their fixed patrols as built; no per-fixture breaker resets or witness reactions for lamps the EMP destroyed. | The EMP moment, G1-G4 | S-M (~80 lines + tests) | S2 handover (S2 calls it; a stub until it lands), S4 |
| GA4 | Intro actors: a guard figure (mesh, rifle) the intro can place and drive along a path at a set playback rate (0.3x) with the existing aimed walk and fire poses, no AI, no perception, not in the enemy lists; or confirm the guard freeze (`sectorGuardFreeze.ts`) plus an anim rate does it. | Intro 30-38 s | S | S2 |
| GA5 | Review the 8 guards' posts and patrols in `pianoWorks.ts` (data only; `validatePosts`), the G5 / G6 pair as a guard pair (G335). | S1 data | XS (review) | none |

## Sector Ops Build asks (lighting: one system, parity)
| Ask | What | Where used | Size | Blocks |
| --- | --- | --- | --- | --- |
| SO1 | The blackout trigger in the one lighting system: a "mains off" cut of every electric light that never times out (Sector Ops' pick over a whole-map `disrupt`), with no reachable switch so no guard walks to reset it, in a given order over 0.8 s; host-side, reaching the client in the existing `lamps` snapshot; meter, guard sight and picture agree at once. | The EMP | S (data + one call) | S2 |
| SO2 | The map's pre-built lamp bake (as #582, so it loads warm); after the EMP the baked lamps read as off. | The intro and the escape | S | S2 look, S4 |
| SO3 | Torch count: 8 torch slots and shadow tiles for this map (`FLASHLIGHTS` 4, `TORCH_DRAW_SLOTS` 4 today: a shader loop and shadow atlas cost), one laptop GPU check at Low; if it fails, the 4-guard fallback above. | The whole escape | S-M + GPU check | S4 |
| SO4 | Near-zero map ambient, the window values (moon up to ~0.1 lux, city glow ~0.02-0.05 lux, all under the 1 lux dark band), and a light-meter check (#518 lux tools): dark everywhere except inside torch cones. | S1 data | S (data + check) | none |

## Level-design rules for a test scene
The scene is not a campaign mission or a Sector Ops op; it borrows the SectorMode runtime. It follows:
- 2.1-2.6 real building (purpose, why-is-it-here, real proportions, real locks), 3.1 entry vantage, 3.3 routes rejoin,
  3.4 a loop (hall-corridor door), 3.9 one checkpoint (the start), 3.10 designed exit (both players), 4.1 jobs, 4.3
  clockwork, 4.4 isolation moment per guard, 4.5 overlap, 4.7 bodies and hide spots, 4.8 survivable searches, 4.10
  archetypes (armed guards only), 5.1 and 5.5 every light has a source and the darkness has a real cause (the EMP),
  real night levels, 5.3 floors from real materials, 6.4 guide without markers (the objective names what and where),
  9.1-9.2 failure, 9.4 downed (campaign rule), 16.3.6 the exit door opens from inside.
It skips, with reasons:
- 14 phases: the level-validator graph and its gate, measured validator pass at greybox exit, bot route-runs (G289,
  G330): a one-off five-room scene; the walk replaces them.
- 3.2 three routes plus a secret per guarded space: two routes to the exit and one loop (small map).
- 4.9 guard count bands per space and 4.2 patrol mix across adjacent spaces: 8 guards in 5 spaces, mixed but not
  graded.
- 5.2 lit chokepoints: none exist after the EMP.
- 6.1 / 6.2 teach-test-twist, pacing in minutes, beat chart; 7.2 two toys per space (no switches or lamps left after
  the EMP); 10 exploration and reward.
- 11.1 exactly two players (one player allowed, A2), 11.10 forced co-op gate, 11.11 teamwork minimums (the co-op double
  is the scene's one co-op beat); 11.3-11.6 splits.
- 13 deliverables (space sheets, guard sheets, security register) beyond this plan; 15 acceptance tests beyond the walk.
**Question for Michael (rides on Q1):** `CLAUDE.md` says a new map follows `docs/level-design.md` and may never loosen
it without his written approval. These skips loosen it for this scene only, so his Q1 click ("Approve, build it")
approves the skip list above in writing; "Change it first" holds the build. A2 (one player may run it) is in the same
list; no other Michael rule is loosened (G127 / G146 are already his pick for this scene; G367 holds because the EMP is
a real cause, A10).

## Walk items
- Main menu > Piano Escape (`?piano=1`, or /preview/): the intro plays to the piano, the camera pulls back on the
  swell, the EMP press kills the lights - accept when it feels like the scene Michael described.
- Same, co-op (Co-op > host > Sector Ops > Aldgrave Piano Works): the escape in the dark with torches and knife kills,
  the double on the corridor pair - accept when it is tense and quiet and every guard can be taken in the shadows.
- The end: both on the porch, fade out, no score - accept when it ends cleanly.

## Risks and open questions
- Three teams' asks gate S4: S1-S3 build first; S4 starts when PB1 / PB5, GA1-GA3 and SO1-SO3 are on master (the
  lead tracks them on the ROADMAP row).
- Pure darkness and readability: the players see by their night vision; if the picture is unreadable at Low, that is a
  walk note, not tuning now (prototype).
- 8 torches are over today's 4-torch limit (SO3): the fallback is the named 4-guard cut, never unlit guards.
- `sectorMode.ts` is busy on other branches: S1 / S2 keep to small named seams so the train's merges stay easy.
- 4.29 MB MP3: kept out of the precache and fetched only when the scene runs; re-encoding to 128 kb/s would halve it
  (a later choice, not now).
- G180 says no dedicated dual move, so the brief's "co-op double" is two knife kills timed together (PB4), not a new
  paired clip.
