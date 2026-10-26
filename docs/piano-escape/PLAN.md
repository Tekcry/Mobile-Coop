# piano-escape: plan
Owner: Night Shift | Campaign Build. Status: current.

Lead: Night Shift | Campaign Build. Planner: Opus 5.5, master 1b58989ed. Brief: `docs/piano-escape/BRIEF.md` (A1-A17,
Michael ~19:20 / ~19:28 / ~19:40 / ~19:55 / ~20:05 / ~20:10 / ~20:15 / ~20:16). Prototype mode: small, no tuning, one
test set.

**Redraw 2: Thornbeck Mill in a storm (Michael ~20:15, "Storm grain mill"; ~20:16: "Must be very cinematic, Not meant
to be open world or explored. Must force stealth, stalking, kills, coop kills. I want it to showcase a tense, coop
gameplay").** The map is a linear, directed path through a tall timber grain mill: ten stretches in a fixed order, each
forcing one thing. The piano-works approval of ~20:15 (M2) stands for the opening, the EMP and the knife-kill rules;
the ~20:10 rules hold (knife and night vision only, 12 guards up to 16, torches, slow fixed sweeps, pairs for co-op
kills, the music experiment). The scene key stays `scene: 'piano'`; map id `thornbeckMill`.

## 1. What runs, from what exists (found in code)
- **Runtime: `SectorMode` with one section** (`src/game/modes/sectorMode.ts`; campaign missions run on it too,
  level-design "Campaign profile"). It already gives: guards spawned per section from `SectorDef.guards`
  (`src/game/sectors.ts:108`; guard ids `<section>:<k>`), host authority in co-op, everyone-down restarts the section at
  its checkpoint (`restartSection`, sectorMode.ts:1213), the exit zone (`exitStep`, :852, every living player inside),
  no exit beacon (`drawsExitBeacon` is false for `sector`, `src/game/interactables.ts:34`), a section's `noisy` list
  applied to the guards (`em.setNoisy`, sectorMode.ts:737). Co-op hosts reach it from the lobby's Sector Ops map list
  with no lobby code (`lobbyMaps` filters `MAPS` by mode, `src/net/coopUi.ts`).
- **New seams (small):** `SectorObjectiveKind` gains `'clear'` (every guard of the section down, none pending; no
  interactable), `MapDef.scene?: 'piano'` (`src/world/mapDef.ts`), and in a scene map `complete()` writes no star,
  record or rating (as a practice run, sectorMode.ts:1063 / :1119) and ends on a fade out to the menu, not the results
  screen (A9). The scene's own logic sits in new files (`src/game/piano*.ts`), called from SectorMode at named seams.
- **Flag:** `pianoEscape: darkFlag(params.get('piano'), PREVIEW_ON)` in `src/core/flags.ts` (A1; `darkFlag` :140).
  The map joins `MAPS` only when it is on (`src/world/maps/index.ts`, like `bunker` behind `flags.legacy`). Reached by:
  a main-menu entry "Piano Escape" (`MainMenuScreen.entries`, `src/main.ts` :253, solo start), the co-op lobby (Sector
  Ops, map "Thornbeck Mill"), and `?piano=1&autostart=thornbeckMill&mode=sector` (dev, e2e). `sectorOps()`
  (`src/ui/screens/missionsScreen.ts:51`) skips scene maps.
- **Takedowns:** `src/game/takedown.ts` (kinds `behind`, `corner`, `drop`, ...), `TakedownController`
  (`src/game/takedownController.ts`); co-op double through `DualClock` (`src/game/dualTakedown.ts`, `DUAL_WINDOW`
  1.5 s): two ordinary takedowns timed together, no dedicated dual move (G180). Knife kills come from the knife job
  (Player Build asks below).
- **Camera:** the render-only override `cam.free` (`src/player/shoulderCamera.ts:129`, `src/player/freeView.ts`);
  per-area framing from camera spaces (`MapDef.camSpaces`, `src/world/camSpaces.ts`: `open` / `tight` boxes).
  Letterbox and post: `GameState.letterbox` (gameState.ts:3827), `src/vfx/cinematicPost.ts`. Tracers: `Vfx.tracer`
  (`src/vfx/vfx.ts:167`). `loop.timeScale` is NOT used (it slows gameplay).
- **Music:** bundled MP3s by `?url` import, decoded with `decodeAudioData` (`src/audio/score/game/gameMusic.ts`); the
  offline orchestral renderer with CC0 piano samples (`src/audio/score/orch/`, `npm run music:orch`,
  `scripts/music/samples.json` ids `pianoC2`, `pianoG2`, `pianoC3`, ...). Precache lists: `src/pwa/precacheGlobs.ts`.
  No rain or thunder sound exists in `src/audio` yet (S6).
- **Lights:** one registry (`LightRegistry`, `src/world/lights.ts:149`). **SO1 is built (PR #602, open):**
  `world.level.lights.mainsOff(x, y, z, over = 0.8): number` cuts every electric light nearest first, the last at
  0.8 s, for good (no switch, jam end, EMP timer or section restart brings one back; guards never reset it);
  `mainsCut(id)` says when the ripple reached a lamp; torches stay on; the client gets it in the existing `lamps`
  snapshot. `LightField` (`src/world/lightField.ts`) gives the meter and guard sight from the bake plus the registry's
  live state plus torches as dynamic lights (parity). Torches: `FLASHLIGHTS = 4` slots and 4 shadow tiles today
  (`src/world/torches.ts:15`, `shadowAccuracy.ts:83`); SO3 raises them. Light kinds include `window`. Players see the
  dark by night vision (`src/vfx/nightVision.ts`, picture only). **SO5 is built (PR #604, open):** a map's
  `lightning: { flashes: [{ t, peak, len }], period? }` (a double strike is two entries; `period` loops the list), on
  the shared sim clock minus `world.lightning.t0`; light enters only through the map's real openings (windows, board
  gaps); the look check is `?lightning=1`.
- **Guards in the blackout (Guard AI, PR #603: both Opus checks passed; not on master yet):** `em.sceneDark = true` keeps every guard's
  torch on in every state and sends nobody on a lights-out incident (GA1; set it back to `false` when the scene ends);
  `em.blackoutSearchSlots(slots, x, z)` takes the live section's guard-list indices (there are no `mill:*` ids in code)
  and `em.blackoutSearch(enemies, x, z)` takes Enemy objects; either sends those guards into the existing search in a
  6 m ring round a point (its first point is the point itself), then back to their rounds, while the rest hold (GA3).
  Torch slots exist only on a dark map (map ambient below 0.5); `mainsOff` does not change that, so the mill's ambient
  must be dark in the map data. SectorMode will not spawn a non-alerted guard within 7 m of a player
  (sectorMode.ts:921).
  Rain masking: `mapWideNoise('rain', 6)` (`src/ai/hearing.ts`, same PR; that branch's comment calls it "GA7", which
  here is the flash reaction): 6 dB halves every guard's hearing reach. The guard freeze (`src/game/sectorGuardFreeze.ts`) only hides off-screen guards from rendering, so slow-motion
  intro actors need Guard AI's coming `GuardActor` (GA4).
- **Downed:** campaign rule `REVIVE_WINDOW` 30 s, `REVIVES_PER_MISSION` 2 (`src/game/reviveClock.ts`); the co-op host
  swaps in syringes for `sector` (`src/net/coopHost.ts:205`); the scene keeps the campaign cap.
- **Track:** `leberch-investigation-piano-611639.mp3`, ffprobe **134.03 s**, 44.1 kHz stereo, 256 kb/s, 4.29 MB.
  Loudness (RMS per 2 s): quiet 0-28 s, first swell 30-52 s (peak ~40 s), settle 54-76 s, swells begin ~78, ~92,
  ~106 and ~122 s, fade 128-134 s.

## 2. Scene flow
**Intro (render only, A3).** Input off, no guard AI, the section's guards not spawned yet. The intro has its own
clock; slow motion is the intro actors' and tracers' playback rate (0.3x). Each page frames its own operator (co-op: the
partner beside him, revealed by the pull-back). Rain on the roof from the first frame (S6). Music from intro 0 s.

| Track time | Shot | What is seen and heard |
| --- | --- | --- |
| 0.0-3.0 s | Black | Piano and rain. |
| 3.0-9.0 s | Fade in (6 s) | Upper chest, close (about 22 deg vertical field, 0.6 m off the chest). Pistol low-ready, slide locked back (empty). Slow breathing. |
| 9.0-16.0 s | Hold | Breathing; muzzle flashes flicker on the bins and face from two directions; rounds thud into the timber. About 14 s: one dry trigger click (no ammo). |
| 16.0-30.0 s | Pull back (14 s) | A diagonal pull-back inside the start bay: from 0.6 m off the chest (about (3.4, 5.3), 1.4 m up) back to the south-west and up, towards (0.8, 1.2), reaching about 5 m up by 30 s: the grain bins W1 at their backs, the partner beside; tracers at 0.3x from two sides (from the east along the south aisle, from the north-east off the main stair), splinters and grain dust. |
| 30.0-38.0 s | Wide reveal, on the first swell | The camera keeps rising to about 7.5 m at (0.8, 1.2) (roof ridge 12 m) and looks north-east over the 2.8 m bins: surrounded, four guards closing in slow motion from two sides, rifles up and firing, the lamps on: two down the main stair (north-east), two along the south aisle (east). They stop on their stop spots, 4-6 m from the players. |
| 38.0 s on | EMP prompt | One button prompt (interact: pad A / keyboard E, "Set off the EMP"); either player in co-op. The shot holds and the actors idle until pressed (no timer). |
| press + 0-0.8 s | EMP | Blue spark burst at the operator's belt, the existing EMP sound; the lamps die nearest first (`mainsOff`, all dead by 0.8 s). |
| press + 0.8-2.5 s | Black-out beat | Black, rain loud on the roof; the first torches click on. |
| press + 2.5 s | Cut to play | The shoulder camera; input on; subtitle (radio, voiceable, G82): "Lights are dead. They'll come with torches." Then the objective line (G343): "Take down every guard. The hoist door, top floor, west end." |

- **EMP beat, in order (S2, host):** `world.level.lights.mainsOff(opX, opY, opZ, 0.8)` at the pressing operator; set
  `world.lightning.t0` to the press time on the shared sim clock (solo: set locally; co-op: the host sends its press
  time to the client in the sector state, S4); the music
  cross-fades (about 2 s) from the intro's "Investigation Piano" into the mission track "Suspense Thriller" from 0
  (Michael ~21:50; so the track and the lightning start together on every page; S2's `seek(41)` lands on S5b's switch); `em.sceneDark = true`;
  the section's guards spawn (the opening four on the actors' spots); the opening four spawn 4-6 m from the players through a scene exception to the 7 m spawn rule (S2); then,
  once SectorMode's `fill()` has spawned the four (a slot's guard is null until then, sectorMode.ts:911-930, so the
  call never goes in the spawn step itself), `em.blackoutSearchSlots([0, 1], 5.5, 5.25)` (guard-list slots 0 and 1 = G1 + G2): only the pair you take together
  searches round W1 (Q2's recommended answer; with "All four" it is `[0, 1, 2, 3]`); G3 and G4 walk straight to their
  sweeps; input on. `mainsOff` holds through a restart (#602), so no start-state retake is needed: a restart re-runs
  `sceneDark`, the spawn and the search (S2 checks the lamps stay off). When the scene ends: `em.sceneDark = false`.
- Skip: hold Back / Esc for 1 s jumps to the 38 s beat (the music seeks to 38 s); the EMP still needs its press. A
  restart (everyone down) never replays the intro; the music plays on (the scene's mute survives `checkpointReset`'s
  calm, sectorMode.ts:1234) and the lightning keeps its t0.
- The mission track (162.04 s) loops whole, from 0, with a 2 s cross-fade end into start: one loop is
  `missionLoopPeriod()` = 162.04 - 2 = 160.04 s (S5b), the lightning period. A restart keeps the mission track playing.
- **End (A9):** the last guard down unlocks the hoist door (a heavy bolt sound; the objective line: "The hoist door is
  open."); both players on the hoist platform: 2 s fade to black, the piano fades out, back to the menu or the lobby.
  No score, rating, results screen, section rating banner or card ("SECTORS CLEAR", sectorMode.ts:1064, skipped).
  Before that the door shows once: "Locked. Not while any of them are still up."

### 2b. The storm: lightning timetable and rain (A16)
- **Lightning** is a light, not an effect: SO5's `window` lights at the mill's real openings (the windows and board
  gaps, built in S1b), off between flashes, in the one registry, so a flash lights players and guards alike and the
  meter and guard sight read it (parity). Peak about 5-20 lux on floors within about 6 m of an opening; behind tall
  cover from it, and deeper inside, it stays under the meter's 1 lux dark band (the flash shadows, drawn on the plan).
  The pre-EMP electric lamps stay in the map (SO5's window-pool path needs at least one fixed lamp). Look check:
  `?lightning=1`.
- **Clock:** `t` = the shared sim clock minus `world.lightning.t0`, with t0 = the EMP press (S2 sets it on the host
  and in solo; S4 sends the host's press `simTime` to the client as one optional field of the existing sector state). The prompt waits with no timer, so the track clock cannot drive the flashes; instead the
  mission track starts at 0 at the press, so `t` = mission track time on every page and the doubles land on its section
  changes.
  Thunder (S6) and any music cue are driven from SO5's `flashAt`, never from a machine's own music time. No flash in
  the intro (the lightning starts with the EMP).
- **Timetable** (the map's `lightning` data, S1b; `period: 160.04` = one mission-track loop, `missionLoopPeriod()`;
  a single is `{ t, peak: 1, len: 0.6 }`, a double adds `{ t + 0.45, peak: 0.8, len: 0.5 }`; 18 times, 24 entries;
  re-timed to Michael's ~21:50 music pick, assumed and logged in ROADMAP Decided, undo by his word):

| t after the EMP = mission track time (s) | 6 | 18 | 28 | 36.68 | 43 | 49.48 | 58 | 64 | 71.88 | 80 | 89 | 97.48 | 104 | 110.28 | 116 | 123.08 | 131 | 148 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Flash | single | single | single | **double** | single | **double** | single | single | **double** | single | single | **double** | single | **double** | single | **double** | single | single |

  Read as: singles every 6-15 s, a double flash on each of the track's six section changes (36.68 / 49.48 / 71.88 /
  97.48 / 110.28 / 123.08 s; outro from 139.08 s); then it repeats every 160.04 s (the gap over the seam, 148 -> 166.04,
  is 18 s, the outro's calm). Fixed and the same every run (VISION rule 8). Thunder 2.0 s after each flash (sound only).
- **Rain masks sound through the existing model:** the mill's SectorDef has `noisy: [mapWideNoise('rain', 6)]`
  (`src/ai/hearing.ts`; SectorMode applies it, sectorMode.ts:737): 6 dB halves every guard's hearing reach. Needs
  #603 on master. No other noise work.

## 3. The map: Thornbeck Mill, Hollowmere (map id `thornbeckMill`, `scene: 'piano'`)
A tall timber grain mill (1890s, timber frame on a brick plinth), now a seed merchant's store; tonight a security
contractor's night crew holds it in a thunderstorm. One connected hall, 32 x 18 m, roof ridge about 12 m; a ground
floor and one upper gallery (+4.2 m) along the north wall. North up, x east, z north, origin the hall's south-west
corner; the hoist platform sits outside the west gable. Plan: `docs/piano-escape/map-plan.svg` (1 m = 24 px).

**A directed path, not a space to explore.** Tall bin rows and sack walls (2.4-2.8 m) fence the path; the hall's middle
(the machinery floor, with the roller mills, the sifter and the open crane well) is off the path, seen from it and from
the gallery but not walked. The main stair's foot has a sprung safety gate that latches behind the guards who come
down it (it opens only from the gallery side). Every stretch below has to be passed in order; the hoist door is locked
until every guard is down.

| # | Stretch (where) | Forces | Guards | How |
| --- | --- | --- | --- | --- |
| 1 | The bins (start bay, SW ground, x 0-9.4, z 0-10.4) | Paired co-op kill | G1 + G2 | The pair that came down the stair searches round W1's north end side by side; both players take them at once at K1 (6.0, 8.4). |
| 2 | South aisle (x 9.4-20, z 0-4) | Stalking to a kill spot | G3 | G3 walks east down the aisle under the south windows; follow in the flash shadows of the sack stacks to his stop in the roller mill's shadow; kill at K2 (22.8, 7.0). |
| 3 | Sack bay (x 16-26, z 8-13) | Stealth past a sweep | G4, G5 | Their sweeps cross the bay; slip from the mill bay (across its open z 8 edge) to the office door (x 26, z 11.6-12.8) between torch passes. No kill here. |
| 4 | Office (x 26-32, z 6-13) | Solo knife kill | G6 | At the desk, torch on the east window; from behind at K4 (28.2, 9.9). |
| 5 | Office door | Paired co-op kill | G4 + G5 | Every lap their sweeps meet at the office door to check it; both players inside, one each side of the frame, take them at once at K5 (25.4, 12.2). |
| 6 | East gallery (up the lobby ladder, x 22-32, z 15-18) | Stalking to a kill spot | G7 | From the deck hatch, follow G7 west to his stop by sack stack GS2; kill at K6 (22.8, 16.2). |
| 7 | Crane bay (gallery, x 12-20, and its east end by GS2) | Stealth past a sweep | G8 + G9 | The pair sweeps east to the crane bay's end; hide behind GS2 while they turn 1.2 m away, between flashes through the north windows. |
| 8 | Long gallery (back along the crane bay, x 12-20) | Paired co-op kill | G8 + G9 | Follow the pair west; take them at once at their west turn, K8 (12.8, 16.1). |
| 9 | Stair head (x 7-12) | Solo knife kill | G10 | Post at the stair head, torch panning down into the hall; from behind (the north side) at K9 (8.8, 16.9). |
| 10 | Hoist landing (x 0-7) | Paired co-op kill | G11 + G12 | The exit pair paces the landing; take them at once at their west turn by the hoist door, K10 (1.6, 16.5). The door unlocks. |

- **Spaces, levels and lamps (all lamps caged industrial fittings, `electric: true`, no switch `group`):**

| Space | Box (x, z, m) | Level | What is in it | Lamps |
| --- | --- | --- | --- | --- |
| Start bay | 0-9.4, 0-10.4 | ground | Grain bins W1 (4.5-6.5, 3-7.5, 2.8 m: the intro wall); low sacks (1.5-3.9, 1-2.2); sack wall north (0-8.2, 9.2-10.4); bin row east (9.4-10.6, 5.2-10.4); the stair foot gate (8.2-9.4, z 10.4) | 2 |
| South aisle | 9.4-20, 0-4 | ground | Low sack stacks Sb1 (13-14.2, 0.2-1.2), Sb2 (16.5-17.7, 2.6-3.8); sack wall north (10.6-20, 4-5.2) | 2 |
| Mill bay | 20-26, 0-8 | ground | Roller mill M1 (21.5-24, 3.5-6, 2.2 m); bin row west (18.8-20, 5.2-8); the sealed bin bank east (26-32, 0-6) | 1 |
| Sack bay | 16-26, 8-13 | ground | Low sacks Sd1 (17.5-19.9, 11.2-12.4), Sd2 (17.6-18.8, 8.8-9.6), Sd3 (23.6-24.8, 8.6-9.4); sack wall south (16-18.8, 7.4-8.6); bin row west (14.8-16, 5.2-14.2); sack wall north (14.8-26, 13-14.2) | 2 |
| Office | 26-32, 6-13 | ground | Desk (28-30.4, 10.6-11.4); window east (z 8.5-10); doors west (z 11.6-12.8) and north (x 29-30.2) | 1 |
| Ladder lobby | 26-32, 13-18 | ground | Timber partition west (x 26); ladder L1 at (31.2, 15.6) up through a deck hatch | 1 |
| Upper gallery | 0-32, 15-18 | +4.2 m | Timber deck with a rail; sack stacks GS1 (3-5.4, 17.6-18), GS2 (20-22.4, 17.1-18), GS3 (26-28.4, 17.1-18); the crane bay (x 12-20: the rail open over the crane well, closed to players by a drop bar and hoist chain they cannot cross); the main stair head (x 8.2-9.4); the hoist door (west gable, z 15.8-17.4) | 5 + hoist lamp + exit sign |
| Machinery floor (off the path) | rest of the ground floor | ground | Roller mills, sifter, crane well; seen, not walked | 1 |

  16 lamps plus the exit sign. Map ambient 0: a dark map (below 0.5), so the torch slots exist. Windows (lightning only): south wall x 2-4, 11-13, 21-23; west gable z
  3-5; office east z 8.5-10; north wall at gallery level x 4-6, 13-15, 17-19, 25-27; board gaps east z 2-3.
- **Floors:** timber boards upstairs (they creak: loud), boards and spilt grain below (grain is quiet), the sack bay's
  sacking quiet (level-design 5.3).
- **Camera framing (camera-framed beats):** camera spaces per stretch (`camSpaces`): `tight` in the start bay, aisle,
  office, lobby and on the landing; `open` over the crane bay. Two short framed reveals (render-only, 1.5 s, input
  held, placed where no guard is within 10 m): at the top of the ladder (the long gallery ahead) and when the hoist door
  unlocks.
- **Start / checkpoint:** behind W1, players at (4.0, 4.6) and (4.0, 6.0), backs to the bins, facing west. One
  checkpoint (the start).
- **Hide spots (bodies, searches):** behind the low sacks in the start bay, behind Sb2, in the bin-row niche of the mill
  bay (19.0, 7.4), beside the office desk, behind GS2, behind GS1.

**Guards: 12 (1 or 2 players; same count for one player, A2), up to 16, at least 8.** All armed guards (no heavies,
dogs or shields, G155); every one with a lit torch after the EMP (`sceneDark`). Slow, methodical, fixed sweeps: the
routes are fixed patrol points in the map data; GA6 adds the pace and the torch aim. Pairs walk side by side. Every
start and route point is at least 0.5 m clear of a collider.

| Guard | Start (at the EMP) | Fixed sweep (patrol points) | Stretch / kill spot |
| --- | --- | --- | --- |
| G1 + G2 (pair; guard-list slots 0, 1) | (7.5, 8.7), (8.3, 8.0): came down the stair; the only ones searching round W1 (Q2) | After the search: side by side north of W1, lanes z 8.0 and 8.7, x 3.5 - 8.6 and back | 1, K1 |
| G3 (slot 2) | (9.0, 2.0): came along the aisle; straight to his sweep | (9.5, 2.0) - (20.5, 2.0) - (20.5, 7.0) - (22.8, 7.0), 6 s pan stop, back | 2, K2 |
| G4 (slot 3) | (10.0, 3.4): came along the aisle; straight back to the sack bay | (17, 10.2) - (25.2, 10.2) - (25.2, 12.2), 4 s door check, back | 3 and 5, K5 |
| G5 | (20.8, 9.0) | (20.8, 8.6) - (20.8, 12.2) - (24.0, 12.2), 4 s door check, back; a 50 s lap like G4 (`sweepPeriod`; 40 s does not fit G4), so they stand 1.2 m apart at the door every 50 s | 3 and 5, K5 |
| G6 | (29.0, 9.9) | Post at the desk, torch panning the east window and the west door, 8 s each way | 4, K4 |
| G7 | (28.8, 16.2), gallery | (28.8, 16.2) - (22.6, 16.2), 6 s pan stop, back (his east end 2.5 m from the hatch) | 6, K6 |
| G8 + G9 (pair) | (12.5, 15.7), (12.5, 16.5), gallery | Side by side (12.5, 16.1) - (21.4, 16.1), torches panning down into the crane well, back | 7 and 8, K8 |
| G10 | (8.8, 16.2), gallery | Post at the stair head, facing south, torch panning the hall below | 9, K9 |
| G11 + G12 (pair) | (1.5, 16.1), (1.5, 16.9), gallery | Side by side on the landing, (1.5, 16.5) - (5.5, 16.5), 5 s at each end (east turn 3.3 m from K9) | 10, K10 |

- **The opening four (G1-G4, guard-list slots 0-3)** are the intro's actors: two down the stair (G1, G2), two along the
  aisle (G3, G4). Only G1 + G2 search W1 (Q2 recommended); G3 and G4 walk to their sweeps.
- **Up to 16 (if SO3's check allows):** G13 a second office post (stretch 4 becomes two solo kills), G14 a second
  stalked guard behind G7 (stretch 6), G15 + G16 a pair at the stair head (stretch 9 becomes a co-op kill).
- **At least 8 (if the check allows fewer than 12):** keep G1 + G2, G3, G6, G7, G8 + G9, G10; stretches 3, 5 and 10
  then have no guards (the hoist door unlocks at the last of these down). Never a guard without a lit torch.
- **Solo (A2, testing only; Q3 recommended):** one player cannot take a pair at once; the pairs stay as they are.

## Claims
```claims
files:
  - src/core/flags.ts
  - src/world/mapDef.ts
  - src/world/maps/index.ts
  - src/world/maps/thornbeckMill.ts
  - src/game/sectors.ts
  - src/game/modes/sectorMode.ts
  - src/game/piano*.ts
  - src/ui/screens/missionsScreen.ts
  - src/main.ts
  - src/game/gameState.ts
  - src/audio/music/music.ts
  - src/audio/music/scenePiano.ts
  - src/audio/music/sceneTracks.ts
  - src/audio/music/musicLab.ts
  - src/audio/sceneStorm.ts
  - scripts/music/piano.mjs
  - src/assets/music/scene/*
  - src/pwa/precacheGlobs.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - src/net/protocol.ts
  - scripts/e2e-piano.mjs
  - scripts/run-e2e.mjs
  - scripts/e2e-affected.mjs
  - tests/piano*.test.ts
  - tests/thornbeckMill.test.ts
  - tests/scenePiano.test.ts
  - tests/sceneTracks.test.ts
  - tests/sceneStorm.test.ts
  - tests/precacheGlobs.test.ts
  - docs/audio-credits.md
  - docs/piano-escape/**
  - changes/feature-piano-escape*.md
maps: thornbeckMill
protocol: one optional field in the existing `sector` message (S4: the host's EMP-press simTime, `SectorNetExtra` in
  sectors.ts, parsed in `sectorExtra`, protocol.ts); no PROTOCOL_VERSION bump (the train does it)
save: none
```
Notes: `sectorMode.ts`, `sectors.ts`, `gameState.ts`, `coopHost.ts` and `main.ts` are shared files: each slice touches
them at named seams only. Protocol: the EMP press is an interactable use (host-checked) and the blackout reaches the
client in the existing `lamps` snapshot; the press time is known only to the host, so S4 adds one optional field to
the existing `sector` message (the host's press `simTime`, Opus-built, no `PROTOCOL_VERSION` bump: the train bumps it)
and the client sets `world.lightning.t0` and ends its intro from it. Other teams' asks are claimed on their
branches.

## Slices
At most 2 builders at a time. S1 and S3 are building now; S1b and S6 after Michael's click on the mill sign-off; S2 on
the stubs named below; S5 any time (audio only); S4 last. S4 waits for the knife job's S1 and S3, GA6, GA7, SO2-SO5.

**S1 Scene shell on a stub map (Sonnet; building now).** The flag; a stub `thornbeckMill.ts` (MapDef with
`scene: 'piano'`, `modes: ['sector']`, one SectorDef `mill` with the `clear` objective, a start, an exit zone, a few
guards, lamps `electric: true` with no switch group, ambient 0); the flagged `MAPS` entry; `MapDef.scene`; the `clear`
objective in `sectors.ts` / SectorMode; `src/game/pianoScene.ts` (knife and night vision only: no pistol use, no
gadgets (A13); the objective line, the locked-door line, the end fade, `em.sceneDark = false` on leave, no save /
rating); the menu entry; `sectorOps()` skip. If S1 started on the bunker's id, it renames `underhollow` to
`thornbeckMill`.
- Files: flags.ts, mapDef.ts, maps/index.ts, maps/thornbeckMill.ts (stub), sectors.ts, sectorMode.ts (seams),
  pianoScene.ts, missionsScreen.ts, main.ts, tests/thornbeckMill.test.ts, tests/pianoScene.test.ts. Est. ~700 lines.
- Checks: typecheck; vitest thornbeckMill / pianoScene (flag default off; `clear` done only when every guard is down;
  the exit zone ends the run only then; no record written; the menu entry only with the flag); e2e: `affected-e2e` +
  `e2e-coop` + `e2e-netmove`.
- Done looks like: `?piano=1&autostart=thornbeckMill&mode=sector` loads the stub, knife and night vision only, the exit
  ends the run only with every guard down.
- Flag: `pianoEscape`.

**S1b Greybox: Thornbeck Mill (Sonnet; after Michael's click).** `thornbeckMill.ts` gets section 3: the hall, the
gallery deck and rail, the crane-bay drop bar and hoist chain across the open rail (x 12-20; a player collider, torch
light still passes), the stair (its foot gate latched from the gallery side), the ladder and deck hatch, the bin rows
and sack walls that fence the path, the cover, the windows and board gaps as real openings (SO5's light comes through
them), the hoist door (locked; the scene opens it), the hoist platform exit zone; 16 lamps + the exit sign
(`electric: true`, no group), ambient 0; the `lightning` data of section 2b (`period: 160.04`, 24 entries); the 12 guards
as `SectorGuard` data (starts, sweep routes as fixed patrol points, pairs, takedown spots), tagged extras G13-G16; the
section's `noisy: [mapWideNoise('rain', 6)]` (needs #603); the camera spaces; `docs/piano-escape/ELEMENTS.md` (16.9
element register). Sector Ops runs SO2 (bake), SO4 (lux check) and the `?lightning=1` look check on top of it; Guard
AI plans GA6 on its data.
- Files: maps/thornbeckMill.ts, tests/thornbeckMill.test.ts, docs/piano-escape/ELEMENTS.md. Est. ~800 lines.
- Checks: vitest thornbeckMill (12 guards + 4 tagged, each with a takedown spot and a fixed route; every start and
  route point 0.5 m clear of colliders; the lightning `period` is 160.04 (the mission track's loop); every lamp electric, no group; ambient 0 (a dark map: torch slots present);
  the rain source present and `validateGuardAi` clean; the
  `lightning` entries match section 2b; the path walkable start to hoist door in stretch order; no walkable cell, drop
  or ledge from the path into the machinery floor (the crane-bay bar holds); the stair gate one-way); e2e:
  `affected-e2e` (e2e-levels).
- Done looks like: the mill as drawn, guards on their routes, the path walkable in order and nowhere else.
- Flag: `pianoEscape`.

**S2 Intro and EMP (Opus: camera, engine).** `src/game/pianoIntro.ts` (pure: the shot table as data, the diagonal
camera path rising to about 7.5 m, fades, skip, prompt state; no allocation per frame); `src/game/pianoIntroView.ts`
(Babylon via `src/core/babylon.ts`: the render-only camera override, the fade, the letterbox, the four intro actors,
tracers and grain-dust sparks at 0.3x with reused scratch vectors, the EMP burst, the two framed reveals in play); the
EMP as an interactable on each operator (host-checked, either player); the EMP beat exactly as section 2 (`mainsOff`,
`world.lightning.t0`, the switch to the mission track (`seek(41)`), `sceneDark`, spawn, `em.blackoutSearchSlots([0, 1], 5.5, 5.25)`,
input on); `introPose(true/false)` (knife job S4b). **The 7 m spawn rule (sectorMode.ts:921):** a scene seam lets the
scene's start spawns place the opening four on their stop spots 4-6 m from the players (only in a `scene` map, only at
the EMP spawn; every other spawn keeps the rule); vitest pianoScene: the four spawn on their spots with players 4 m
away in the scene map, and the 7 m rule still holds for a normal Sector Ops spawn.
`pianoScene.ts` never imports `src/net`. New suite `scripts/e2e-piano.mjs` (solo): intro, skip to the prompt, the
press kills every lamp and sets t0, the meter reads dark, input on, restart without intro and with the lamps still off.
- Stubs until the others land: static posed guard stand-ins for the intro actors until Guard AI's `GuardActor` (GA4;
  then swapped in); `wall_idle` with the pistol stance until `introPose`; `mainsOff`, `sceneDark` and the lightning
  once #602, #603 and #604 are on master (until then a whole-map `disrupt`, today's torch rule, no flashes).
- Files: pianoIntro.ts, pianoIntroView.ts, pianoScene.ts, gameState.ts (one render-override seam), sectorMode.ts
  (spawn-after-EMP and start-spawn exception seams), scripts/e2e-piano.mjs, run-e2e.mjs, e2e-affected.mjs (a DIRECT_COVERS row for
  `src/game/piano*` and `src/world/maps/thornbeckMill.ts`), tests/pianoIntro.test.ts. Est. ~1100 lines.
- Checks: typecheck; vitest pianoIntro (timeline at 0 / 3 / 9 / 16 / 30 / 38 s; camera path continuous and inside the
  start bay; skip; no timeScale writes); vitest pianoScene: `blackoutSearchSlots` called after the spawn returns 2
  (4 with Q2 "All four"); e2e: e2e-piano + `e2e-coop` + `e2e-netmove`; one GPU look video of the intro
  (laptop queue): the 30-38 s reveal frames all four guards over the bins.
- Done looks like: the shot list plays, the EMP blacks out the mill, torches come on, play begins.
- Flag: `pianoEscape`.

**S3 Piano music (Sonnet; built, PR #606; its 41 s loop is now only the `?pianomusic=pixabay` A/B, S5b).** The MP3 at `src/assets/music/scene/piano-escape.mp3`;
`src/audio/music/scenePiano.ts` (decoded on scene start only; plays from 0, `seek(38)` for the skip, `seek(41)` at the
EMP press, loop 41.0 s - end with a 2 s cross-fade, fade out, stop on leave); `Music.scene(on)` mutes the director; out
of the precache (`PRECACHE_IGNORES` covers `src/assets/music/scene/*`); `docs/audio-credits.md` row. The one seam S5
needs: scenePiano.ts takes its track URL from `sceneTracks.ts` (S5b: intro and mission slot rows); the
lead passes this line to S3 now, else S5 adds it after S3 merges.
- Files: the asset, scenePiano.ts, music.ts, precacheGlobs.ts, tests/scenePiano.test.ts, tests/precacheGlobs.test.ts,
  docs/audio-credits.md. Est. ~300 lines.
- Checks: typecheck; vitest scenePiano and precacheGlobs; e2e: e2e-music (affected).
- Flag: `pianoEscape` (only the scene starts it).

**S4 Knife kills, co-op and the full run (Opus: src/net, animation wiring).** `pianoScene.ts` calls
`takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, true))` after the EMP and `setKnifeScene(false)` on
leave (knife job S1, PB5); the co-op host keeps the campaign revive cap for a scene map (`coopHost.ts:205`); the
client's intro ends on the host's EMP and takes the same t0 from the new optional `sector` field (the host's press
`simTime`), so its flashes and thunder follow the shared sim clock;
its music switches to the mission track at the same moment (a small drift between a page's music and the flashes is a walk note).
Extend `e2e-piano` with a two-tab `?net=local` run: the client presses the EMP, both pages go dark, a flash lights both
pages at the same `t` (within 100 ms), a co-op kill on G1 + G2, a solo kill each, both on the hoist platform end it on
both pages; a restart keeps the lamps off; and the start is survivable: at the cut G1 + G2 walk their search from W1 itself with lit torches 5-7 m away (the
first point lies inside W1's footprint, so the nav snap picks the face); pass line: both players reach the low sacks
within 4 s with no guard past suspicious. Both pages need the flag (a client without it falls back to
`provingGrounds`, `getMap`). If SO3 is not in yet, S4 runs on the 8-guard set.
- Files: pianoScene.ts, coopHost.ts, coopClient.ts, protocol.ts + sectors.ts (the one optional field),
  scripts/e2e-piano.mjs. Est. ~450 lines.
- Checks: typecheck; vitest pianoScene; e2e: exactly `e2e-coop` + `e2e-netmove` + `e2e-ctcourse` (src/net) +
  e2e-piano; two independent Opus checkers.
- Waits for: knife job S1 (`setKnifeScene`, PB5, placeholder clips) and S3 (co-op wire, PB4); GA6, GA7; SO2-SO4 and
  #604 (SO5) on master.
- Flag: `pianoEscape`.

**S5 Music experiment (Sonnet; A15; built, PR #618; its picker and form note superseded by S5b).** Starts from the orchestrator's original sketches in
`C:/NightShift/scratch/music/proto/` (made by `piano.mjs`, an offline Node synth: original notes, no samples, no
downloads): "Held Breath" (D minor, 54 bpm, 83.8 s), "Thornbeck" (A minor, 48 bpm, 93.5 s), "Last Round" (C minor,
60 bpm, 78.0 s); plus "Pulse" (sketch 4, made by `pulse.mjs` in the same folder: dark electronic tension, not piano;
96.4 s, 160 kb/s, 1.9 MB) and a second Pixabay track Michael supplied, "Suspense Thriller" by Alex Grohl (id 552495,
Pixabay Content License, `C:/NightShift/scratch/music/alexgrohl-suspense-thriller-552495.mp3`, 162.0 s, 256 kb/s,
5.2 MB). It bundles the four sketch MP3s and the Grohl track (all under `src/assets/music/scene/`, so out of the
precache like the first track), adds `piano.mjs` and `pulse.mjs` as the in-repo sources (`scripts/music/`), and keeps
the dev A/B picker: `?pianomusic=pixabay|grohl|1|2|3|4` read in `sceneTracks.ts`, and a "Scene" list in the Music Lab
(`?musiclab=1`, `musicLab.ts`) to play all six side by side. Touches audio files only, never S3's files (the one seam
above). **Form check, flagged, not re-composed:** the lightning loops every 91.03 s with its doubles on the Leberch
track's swells (t 37 / 51 / 65 / 81). Sketch 2 (93.5 s) is close to the period; sketch 4 (96.4 s) is further off;
sketches 1 (83.8 s) and 3 (78.0 s) and the Grohl track (162.0 s) do not; none was written to those swells. With any
of them playing, the flashes keep the same timetable (they never follow the music), so the doubles will not land on
its swells: a listening note for Michael's A/B. Each one loops whole (from 0) unless its length allows the 41 s point.
- Files: src/assets/music/scene/sketch-1-held-breath.mp3, sketch-2-thornbeck.mp3, sketch-3-last-round.mp3,
  sketch-4-pulse.mp3 (1.6-1.9 MB each), alexgrohl-suspense-thriller-552495.mp3 (5.2 MB), scripts/music/piano.mjs,
  scripts/music/pulse.mjs, src/audio/music/sceneTracks.ts, src/audio/music/musicLab.ts (the Scene list),
  tests/sceneTracks.test.ts, docs/audio-credits.md (two rows: the original sketches made in-repo; the Grohl track
  with its Pixabay page, licence and SHA-256). Est. ~300 lines plus 12.3 MB of audio.
- Checks: typecheck; vitest sceneTracks (picker parse for all six; each track's length as measured; the form note above
  as test data) and precacheGlobs (none of the six precached); e2e: e2e-music.
- Done looks like: in the scene `?pianomusic=4` plays "Pulse" and `?pianomusic=grohl` the Grohl track, the lightning
  on its own clock; the Music Lab plays all six for comparison.
- Flag: `pianoEscape` (dev picker only).

**S5b Michael's music pick (Opus; Michael ~21:50, BRIEF "Michael said"; on PR #618).** The intro always plays
"Investigation Piano" from 0 (skip: `seek(38)`); the EMP press (`seek(s)`, s >= 41, S2's `EMP_SEEK`) cross-fades about 2 s
into the mission track "Suspense Thriller" from 0, looping whole (`missionLoopPeriod` = length - 2 s). Dev picker: two slots,
`?pianointro=` (default the Leberch track) and `?pianomusic=grohl|1|pixabay` (default grohl; `1` = Held Breath as the mission track, the one alternative Michael
liked; `pixabay` = the old Leberch loop from 41 s, for A/B); Michael ~21:55 wants more realistic versions of both,
so four more rows (intro-1/2, mission-1/2, from the orchestrator) drop in when they land. Sketches 2-4 and the six Grohl-form prototypes leave the
bundle, scripts and credits (Michael: A-C "none. they all dont sound realistic, like they are part of a 2 bit game or
something"; D-F "none"); they stay in C:/NightShift/scratch. Files: scenePiano.ts, sceneTracks.ts, musicLab.ts,
audio-credits.md, their tests, the deletions. Brief scratch/campaign/piano/S5b-brief.md.

**S6 The storm: rain and thunder sound (Sonnet; after S1b, with #604 on master).** The lightning itself is SO5's: the
map's `lightning` data (S1b) on `world.lightning.t0` (S2). S6 adds `src/audio/sceneStorm.ts` (WebAudio synthesis: a
rain-on-roof bed from the first intro frame, louder on the gallery, and a thunder roll 2.0 s after each flash, driven
from SO5's `flashAt` on the shared sim clock, never from a page's music time; no downloads), called once from
`pianoScene.ts`.
- Files: sceneStorm.ts, pianoScene.ts (one call), tests/sceneStorm.test.ts. Est. ~250 lines.
- Checks: typecheck; vitest sceneStorm (thunder times from the timetable, the loop seam, doubles 0.45 s apart; schedules
  only, no audio context in tests); e2e: e2e-piano (a flash raises the meter under a window and not in a flash shadow;
  `?lightning=1`).
- Waits for: #604 (SO5). Flag: `pianoEscape`.
- Status: built, synthesised; a real recording is a walk-card question.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `?piano=1` (`flags.pianoEscape`; on in /preview/) | off | Night Shift \| Campaign Build | on Michael's word after his walk; review 2026-11-02 | S1-S6 passed + Michael's walk accepted + his word to ship it |

## Player Build asks (knife kills and the intro pose; mocap only, retargeted, G406)
**Built by the knife job: origin/feature/piano-knife, `docs/piano-knife/PLAN.md` (head 2b690b417), slices S1-S5.**
Answers to its "Needs from Campaign" (section 6, from the lead), updated for the mill:
- Q-C1 Map id `thornbeckMill`; the knife gate `knifeSceneOn` (`src/game/knifeKill.ts`) is true only for a map with
  `scene: 'piano'`; `src/game/pianoScene.ts` calls `setKnifeScene` after the EMP.
- Q-C2 Flag `pianoEscape`, added by Campaign (S1).
- Q-C3 12 standard armed human guards (16 at most); no dogs, heavies, enforcers or shields.
- Q-C4 Approaches: `behind` (posts G6, G10; the pairs), `behindLow` (from the low sacks: K2, K6), `corner` (bin rows
  and door frames: K1, K5), `front` as their S1 builds it. The gallery is 4.2 m up over the machinery floor, but the
  path never puts a guard below a drop point, so knife S5's drop row is not needed.
- Q-C5 Both operators appear in the intro at W1 (4.0, 4.6) and (4.0, 6.0); intro 38 s then the prompt; close-up
  3-16 s (hero LOD); S2 calls `introPose(true)` at the start and `introPose(false)` at the cut.
- Q-C6 In play the pistol is never used (A13); the knife shows only during a kill.
- Q-C7 The hoist door counts every guard down (the `clear` objective plus the exit zone); bodies may be carried and
  hidden as built.

| Ask | What | Where used | Size | Blocks |
| --- | --- | --- | --- | --- |
| PB1 | **Knife S1 (placeholder) + S2 (clips), row `behind`.** Knife kill from behind, standing; contact about 0.7 s, attacker free by 2.0 s; weighty, blood only what the game already draws. | Every guard; the default | M | S4 |
| PB2 | **Knife S1 + S2, row `behindLow`.** From a crouch, rising into it; contact about 0.8 s, free by 2.2 s. | K2, K6 | S | none (falls back to PB1) |
| PB3 | **Knife S1 + S2, row `corner`.** Round a corner, the body left out of sight; contact about 0.9 s, free by 2.4 s. | K1, K5 | S-M | none (falls back to PB1) |
| PB4 | **Knife S3 (co-op wire, remote pose).** Co-op kills: two kills started inside `DUAL_WINDOW` 1.5 s on guards side by side (1-1.5 m apart) read cleanly together, and each page shows the partner's kill. | K1, K5, K8, K10 | S | S4 |
| PB5 | **Knife S1, `takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, true))`.** Every takedown offer in the scene is the lethal knife kill on one press; off the scene nothing changes. | All takedowns | S | S4 |
| PB6 | **Knife S4a (slide lock) + S4b (`introPose(on)`).** Back to the bins, empty pistol low-ready, slide locked back, slow breathing readable at chest close-up. | Intro 3-38 s | S | none (S2 placeholder) |

Measured (knife S2, PR #620 on #614, Player Build ~22:40), the same for all four rows, from the press: approach 0.22 s,
contact 1.05 s (later than the rows above: the bible's 1.0-1.5 s move wins), guard limp 1.57 s, operator free 1.87 s.
With the switch on every kill is 1.2 m quiet and the player is busy (no weapon, no climb) until 1.87 s. S4's e2e waits
use these numbers.

Files both plans touch: `gameState.ts` (knife: menu rows :1518-1525; here: S2's render-override seam), `coopHost.ts`
(knife S3: the wire; here: S4's revive cap line), `coopClient.ts` (knife S3; here S4 only if needed), `flags.ts` (here
S1 adds `pianoEscape`; knife reads it), `takedownController.ts` (knife only), `pianoScene.ts` (here only).

## Guard AI Build asks (BRIEF A11 / A14 / A16 / A17: scene-only, gated on `sceneDark`; nothing changes off the scene)
Guard sight stays pure light parity: a guard sees a player only where the meter would read him lit (torch cones, a
lightning flash); no extra sight rule.
| Ask | What | Where used | Size | Blocks |
| --- | --- | --- | --- | --- |
| GA1 | **Built (PR #603, open):** `em.sceneDark`: torches on in every state, no lights-out incident; the scene sets it back to `false` when it ends. | Whole escape | done | none |
| GA3 | **Built (PR #603, checks passed):** `em.blackoutSearchSlots(slots, x, z)` / `em.blackoutSearch(enemies, x, z)`: the given guards search a 6 m ring round the point (first point: the point itself), the rest hold. S2 calls `blackoutSearchSlots([0, 1], 5.5, 5.25)` once `fill()` has spawned the four (not in the spawn step). | The EMP | done | none |
| GA4 | **GuardActor (Guard AI builds next):** a guard rig driven along a path at a set rate with the aimed walk and fire poses, no AI, not in the enemy lists; Guard AI sends the API. | Intro 30-38 s | S | none (S2 uses static posed stand-ins, then swaps) |
| GA5 | Review the guards' routes, pairs and posts in `thornbeckMill.ts` (data; `validatePosts`; pairs as guard pairs, G335). | S1b data | XS | none |
| GA6 | **The slow methodical sweep (scene-only; the scene's main guard behaviour).** While `sceneDark`, each guard walks his fixed patrol points from the map at a slow pace (about 0.7 m/s) and at each stop pans his torch left, centre, right over about 3 s, the same order every lap; pairs walk side by side and pan to opposite sides; after any search or investigation he rejoins his route at its nearest point. The routes stay map data; GA6 adds only the pace and the torch aim. Planned by Guard AI once S1b's data lands. | Every stretch | M (two Opus checkers) | S4 |
| GA7 | **A player seen in a flash (scene-only).** A sighting in a lightning flash is an ordinary sighting through parity; the guard (and his pair partner) reacts as to a glimpse: torch onto the spot, walks there at sweep pace to investigate; seen again, alert as built; otherwise back to his route. | Stretches 2, 6, 7 | S | S4 |

## Sector Ops Build asks (lighting: one system, parity)
Spec for the mill: map ambient 0; lamps `electric: true`, no switch `group` (kept for the intro); after the EMP only guard torches and
lightning light anything.
| Ask | What | Where used | Size | Blocks |
| --- | --- | --- | --- | --- |
| SO1 | **Built (PR #602, open):** `mainsOff(x, y, z, 0.8)` and `mainsCut(id)`. | The EMP | done | none |
| SO2 | The map's pre-built lamp bake (as #582); after the EMP the baked lamps read as off. On top of S1b. | Intro and escape | S | S2 look, S4 |
| SO3 | Torch count: 12-16 torch slots and shadow tiles (`FLASHLIGHTS` 4, `TORCH_DRAW_SLOTS` 4 today) and the Low graphics check whose verdict sets the guard count (16, 12, or at least 8). Building on feature/piano-lights-so3. | Whole escape | S-M + the check | S4 |
| SO4 | Ambient 0 and the light-meter check (#518 lux tools): black outside torch cones and flashes; flash bands lit and flash shadows dark at a flash's peak. On top of S1b. | S1b data | S | none |
| SO5 | **Built (PR #604, open):** the map's `lightning: { flashes: [{ t, peak, len }], period? }` on the shared sim clock minus `world.lightning.t0` (S2 sets t0 at the EMP press; S4 sends it to the client in the sector state); light only through the map's real openings (S1b builds them); the pre-EMP electric lamps stay (its window-pool path needs a fixed lamp); meter, guard sight and picture read the flashes at once (parity); look check `?lightning=1`. | Every stretch | done | S6, S4 (until #604 is on master) |

## Level-design rules for this scene
The scene is not a campaign mission or a Sector Ops op; it borrows the SectorMode runtime. It follows: 2.1-2.6 real
building (a working grain mill: bins, sack walls, a sprung stair gate, a hoist door, real proportions), 3.1 a dark
vantage at the start, 3.6 height (the gallery over the hall), 3.10 designed exit (both players), 4.1 jobs, 4.3
clockwork (fixed sweeps, a fixed storm), 4.4 isolation moments (each solo guard alone at his kill spot; pairs taken
together, the rule's own exception), 4.5 overlap (the sack bay, the gallery), 4.7 bodies and hide spots, 4.8
survivable searches, 4.10 armed guards only, 5.1 every light has a source and the darkness a real cause (the EMP; the
lightning through real windows), 5.3 floors (creaking boards up, quiet grain and sacking down), 5.6 weather that
changes light and sound (the storm), 6.3 soft windows only (the flash timetable is a readable rhythm, never a
countdown), 6.4 guide without markers, 9.1-9.2 failure, 9.4 downed (campaign rule), 16.9 element register (S1b,
`docs/piano-escape/ELEMENTS.md`).
It skips, with reasons (each is a plain line on the SIGNOFF page):
1. 14 phases and RULES "Intake" step 5: no level-validator graph, gate or measured pass, no bot route-runs (G289,
   G330), so its checks 11.2, 11.7-11.9 are not run either; the walk replaces them; this PLAN is the map's only spec.
2. 3.2 three routes plus a secret, 3.4 loops, 3.3 / 3.5 / 3.7 route choices: one directed path, by Michael's ~20:16
   "Not meant to be open world or explored".
3. 3.9 a checkpoint per encounter: one checkpoint (the start).
4. 4.2 patrol mix and 4.9 guard count bands: nearly every guard runs the same slow sweep; counts not graded.
5. 4.6 lure destinations, 6.1 / 6.2 teach-test-twist and pacing targets, 7.1 / 7.2 / 7.4 toys and gadgets: no lures,
   switches, lamps or gadgets after the EMP (knife and night vision only).
6. 4.11 security devices and register: none.
7. 7.3 ghost and non-lethal play: knife kills only, and the exit needs every guard down (Michael's ~19:28 pick).
8. 11.1 exactly two players: one player may play it for testing (A2).
9. 11.3-11.6 splits, 11.10 forced co-op traversal, 11.11 teamwork minimums: the co-op beats are the four paired kills.
10. 16.3.6 escape doors open from inside: the hoist door stays locked until every guard is down (A5, A14).
11. 5.2 lit chokepoints, 10 exploration and reward, 13 deliverables beyond this plan, 15 acceptance tests beyond the
    walk.
**Question for Michael (rides on the sign-off):** these loosen `docs/level-design.md` for this scene only; the SIGNOFF
lists them in plain words and his click approves them in writing (`CLAUDE.md`: never loosen without his written
approval). G127 / G146 are already his pick for this scene; G367 holds (the EMP is a real cause).

## Walk items
- Main menu > Piano Escape (`?piano=1`, or /preview/): the intro, the pull-back on the swell, the EMP - accept when it
  feels like the scene Michael described.
- The cut to play: G1 + G2's lit torches walk straight at the wall from 5-7 m (their search starts at W1 itself) - accept when both players can slip off the wall unseen; if not, a walk note.
- Same, co-op (both players with the flag; Co-op > host > Sector Ops > Thornbeck Mill): the ten stretches in order,
  the lightning on the music, the four paired kills - accept when it is tense, cinematic and never feels like
  exploring.
- The end: the hoist door unlocks on the last kill; both on the platform; fade out - accept when it ends cleanly.

## Risks and open questions
- S4 waits on three teams (knife S1 + S3, GA6 / GA7, SO2-SO5); S1, S1b, S3, S5 and S6 build first.
- 12-16 torches are over today's 4 (SO3): the guard count follows the check, never below 8, never an unlit guard.
- Start pressure: two searching torches round W1 (Q2 recommended) and the first flash 6 s after the EMP: the low sacks and
  the bins' west face are the cover; a walk note, not tuning now.
- Co-op kills need exact timing; if the pairs are too hard to take at once, that is a walk note (prototype).
- Solo cannot take pairs: testing only, pairs stay (Q3 recommended; if Michael picks "Split each pair", S1b staggers each pair by 3 s for one player).
- A body left on the path is found by the next sweep: hide spots sit by every kill spot.
- Audio size: the 4.29 MB scene track plus 12.3 MB for the A/B set (four sketches, the Grohl track): all out of the precache, fetched only in the scene.
