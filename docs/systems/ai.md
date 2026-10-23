# Stealth AI, enemy archetypes and modes
Purpose: perception, alert states, enemy behaviour, archetypes, difficulty, the navigation grid and the game-mode hooks.
Design authority: docs/DECISIONS.md (G40-G47, G49, G106), then docs/design-bible.md (Section 5.7).

## Decided direction
- Decided, not built yet (G41): guards close doors behind them on a calm patrol and notice any door open that should be
  shut; one 15% open threshold for light, sound and sight. Code: guards push doors open and leave them; the light cut is
  `DOOR_SHUT` 0.05 (`docs/systems/lighting.md`).
- Decided, built (G44, g44-above): guards see poorly above them. `pitchFactor` (`PERCEPTION.up*` / `down*`) scales the
  sight term by the chest's elevation from the eye line: 1 up to +22 deg, smoothstep to 0.15 by +48 deg; below, 1 to -40
  deg, easing to 0.6 by -75 deg. `instantDetect` needs the body within +22 deg. Not applied in combat (`alerted`) or to
  dogs; the close-range felt term (1.8 m, moving) is unchanged. The light meter is untouched (a view limit, not light).
  Numbers are Night Shift's own: the CT research is silent on looking up.
- Decided, not built yet (G45): clear glass passes light and sight; frosted glass and blinds pass light only.
- Decided, not built yet (G40): the two slowest standing and the three slowest crouched speeds are silent (code:
  `NOISE_QUIET`, `docs/systems/movement.md`); level rules and sensor rules are re-checked with it.
- Decided (G46): the 12-awake limit (`MAX_ALIVE`) is reviewed against desktop performance; how it is set is open (FU-11).
- Decided (G42, G49): every human guard can be palm-struck; dogs cannot; heavies, friendly fire and similar details follow
  the CT co-op research (`docs/systems/takedowns.md`).
- Decided (G106, built): CT's fixed difficulty levels; no sliders, no alarm-tolerance setting.
- Decided (G11): of the movement run's AI ideas (guards relight lamps, paired searches, eavesdropping and the rest) only
  those CT has survive, settled by the research.
- Decided (G47): the light parity test, long lamps and motion lights are sorted out when built.

## Stealth AI (2.0 phase 3a)
- `ai/perception.ts` (pure, `PERCEPTION`): `sightRate` = rate x (1 - d / range)^1.5 x field (55 deg focus, 25 m;
  peripheral 100 deg, 12 m, x0.35) x `lightFactor` (`visibilityFromLight`^2) x stance x `motionFactor` x exposure
  (fraction of chest / head / hips in line of sight) x state sensitivity, plus a close-range term (2.2 m, moving), capped at
  `maxRate`; `instantDetect` (point blank, lit, in focus); `stepMeter` (rises by what exceeds `leak`, holds `hold`, drains
  `decay`); `noiseSuspicion(dist, radius)`.
- `ai/alertState.ts` (pure): `AlertMachine` unaware -> suspicious -> investigating -> alert -> searching -> cooldown
  (`ALERT` times, `SENSITIVITY` per level). `Enemy.alerted` = level alert (combat).
- `Enemy`: perceives at ~4 Hz (rays to chest, head, hips; hips skipped in combat), integrates the meter per fixed step
  (`updateAwareness`), `calmDecide` drives patrol (`PatrolWalker`: `SquadSlot.route` / post with glances; per-point
  `waits`), looks at the stimulus, walks to it (`goTo`: straight or A*), search sweeps (`searchPoint`, `searchSlot`).
  Inputs: `hear(x, z, radius)`, `hearTurn`, `hearGunfire`, `radio(delay)`, `searchAt` (bodies), `alert()`; from the
  incident board (guard-ai S2): `sendTo`, `checkLight`, `pairSearch`, `ack`.
- Hearing (guard-ai S1, `ai/hearing.ts`, pure): a noise's reach becomes an effective reach per listener,
  `reach x 10^(-(walls x 6.9 + ambientDb) / 20)`: one wall (head-height ray, cast only where it could change the tier;
  low cover does not muffle) keeps 0.45 of it (the old `MUFFLE`), and a noisy thing near the guard (`NoisySource`,
  `EnemyManager.setNoisy`; no map sets any yet) masks it (6 dB halves, 12 dB quarters). Tiers (`HEARING`): inside the
  effective reach he turns to look (`Enemy.hearTurn`: stands facing it `hearLook`, meter floor `noiseSuspicion` capped
  at 0.45, no `heard`); inside half of it he may be sent; loud gunfire (`EnemyManager.noise`) is combat only inside a
  quarter of it. Coordinated managers (default): every hearer turns, the tier-2 hearers are reported to the incident
  board (below; `noise`, `shots`, or `distraction` for the noise maker and the sticky-cam ping), which sends one. A
  gunfire report with tier-2 hearers (or any tier-3 / already fighting hearer) sets the shared LKP; turning guards do
  not. Held guards (`Enemy.taken`: grabbed, hostage, interrogated) hear nothing. Melee kinds (dogs, runners) keep
  `Enemy.hear` anywhere in reach. Hunter and Mission (parked) set `coordinated = false`: everyone in reach hears and
  walks over (the exact old wall ray: beyond `MUFFLE` of the reach), gunfire sends everyone in reach to combat, the old
  lights-out rule and paces. `noiseSuspicion` rises with the square of closeness.
- Incident board (guard-ai S2, `ai/incidents.ts`, pure; `EnemyManager.board`, 5 Hz plus an immediate pass on each
  report): one incident per event (`INCIDENT`: pool 16; same kind within 6 m / 10 s of its last report merges; a light
  by its id or circuit; a plain noise under a light that just went out merges into it). Who goes: the guards who
  perceived it, else (noise kinds) a calm guard within 25 m; the 3 nearest by straight 3D distance get a path query
  (`PathLen`: straight when the nav line is clear, else A*), score = path x officer 1.6 x cooldown 0.8, ties to the lower
  index; never dogs / melee, held, busy (alarm run, passive), tasked, investigating, searching or alerted guards. One
  goes (`Enemy.sendTo`: bark `checking`, the `heard` path; a later noise never re-aims him); a light sends 2 when a
  second guard who saw it is within 15 m of it. The others who perceived it `ack` (look 3 s, keep their task; at most 2
  "Copy." lines). An investigator down (dead / KO) or held for 25 s turns it `missing`: the 2 nearest calm guards go as
  a pair (`pairSearch`: the lead to where he was last, bark `missing`; the cover searches 5 m short of it, G11).
  `Enemy.incident` holds the task; the board reads guards through `GuardView` (ids = `Enemy.num`) and writes `BoardOut`
  commands. `AlertInput.turning` (a sound he was not sent to) holds off the linger rule, so footsteps do not pull every
  turner over.
- Paces (A9, `PACE` in `enemy.ts`, x walkSpeed): patrol 1.1; coordinated investigate 0.85, search 0.75 (parked modes
  1.2 / 1.3); walking to wake a KO'd squadmate 1.3; cautious patrol 0.95 (guard-ai S4; not on a timed loop).
  Coordinated searching turns at the calm rate.
- Pace and patience: `PATROL.wait` 5.5 s, glances every 10 s, `searchLook` 3 s, `hearLook` 2.4 s; `ENEMY_CALM_MOTION` (60
  deg/s turns while not in combat; parked modes: not searching either). Combat: `ALERT.lostSight` 12 s, `searchTime` 60 s; after combat a guard
  never returns to unaware (`AlertMachine.fought`).
- Alerts and the radio (guard-ai S3, design 5, M5; `ai/radioNet.ts` pure, `EnemyManager.radioNet`, coordinated modes):
  a guard who goes to combat on his own (a sighting, a hit, gunfire close by, the end of a flashbang, spawned alerted)
  first shouts: every calm guard who hears it at the investigate tier of a `RADIO.voice` 12 m reach (6 m in the open,
  ~2.7 m through one wall, less by a noisy machine; one wall ray only where it decides it; any section) joins
  `RADIO.voiceDelay` 0.3 s later. He then holds his radio for a `contact` call, `RADIO.callIn` 2.5 s x reaction (x the
  officer factor near an officer). When it completes (bark `callIn`, e.g. "Control, I have contact.") every other live
  guard of the SAME section is queued nearest first at `min(4.5, 0.6 + rank x 0.5 + d x 0.02)` s x his reaction
  (`staggerDelay`), joins on the next step (bark `joining`) and chases the shared LKP; no relay, no `Math.random`, other
  sections untouched. A call is a timer the caller must survive: `cut` from `Enemy.die` (kill, knockout), `beginTakedown`
  (grab, choke, hostage, interrogation), `blind` and `EnemyManager.despawn` (and a held caller at completion) loses it,
  so only the voice hearers know; a blinded or released guard still in combat calls again. Reports are calls of their
  kind: `checkLight` -> `light`, the pair lead -> `missing`, a board task ending calm -> `standDown`; their first receiver
  says "Copy." (bark only). `command` calls (S6) raise the alarm through `raiseAlarm` only with `RADIO_ALARM` (false).
  One net: Sector Ops loads one section at a time, so the live section is the whole cast (cleared by `despawnAll` /
  `resetMemory` via `clear`); other maps are one section (A6). Ticked at 10 Hz from `update` with the board's
  `GuardView` and a reaction lane (no allocation). `EnemyManager.radioLeft(e)` reads a pending call (e2e).
  Parked modes (`coordinated = false`): the old window: a sighting shouted within `ALERT.shout` 8 m (0.3-0.6 s) and
  radioed after `ALERT.callIn` (`Enemy.radioT`, bark `callIn`) to everyone within `RADIO` 22 m (0.4 + 0.03 d + random
  0.3 s); gunfire / a hit / a flashbang (`loudAlert`) calls in at once. `PlayerRef.spotted`: set when a guard in combat
  sees that player, cleared when nobody is in combat.
- Awareness and caution (guard-ai S4, design 4, M1 / M3; `ai/awareness.ts` pure, `EnemyManager.awareness`, coordinated
  modes; A3, A4, A14-A16):
  - Guard keys: `Enemy.key` (0-31, u32 masks), the lowest free key at `spawn` (not held by a guard on the list or a
    knocked-out body), kept by a woken guard (`Body.guardKey` / `Body.guard`; `revive` builds the new `Enemy` and
    `inherit`s key, squad roster place, held room, passive, `info`, sniper post and the patrol walker, its clock moved on
    by the time down, back on the route at the nearest point; facing as he fell, no random yaw). A dead guard's key is
    reused with `resetKey`.
  - A body found dead (`bodyFound`): the finder barks `body`, searches the spot; the guards who hear his shout (the S3
    voice model) know too and the nearest calm one searches with him; all are held (`openHold('dead')`). He radios a
    `body` call (2.5 s x reaction, `deadReport` "Man down. Stay sharp." when it completes); each receiver of the section
    is added to the hold on delivery (staggered, one "Copy."). Cut him first (`radioCut`: down, grabbed, blinded) and
    only he and his voice hearers knew. A2: no alarm from it.
  - A kill seen (`witnessKill`, on `onKilled`): every calm guard (not in combat, held, passive, a dog or melee kind) who
    would notice the body there (`bodyNoticed`: field, the light on it, `BODY.range` 20 m) with one line-of-sight ray is
    a witness; the nearest finds the body at once (`bodyFound`, every witness held). A knockout seen: he goes to wake him
    (A14). A dead dog (no body): the witnesses are held, the nearest searches and radios it.
  - Held caution clears only when every aware guard is eliminated: dead, or knocked out and not woken (A3; woken, the
    holds he knew come back). Time never clears it. `despawn` counts as dead; `clear` (Sector unload / restart) drops
    every hold and caution.
  - A knockout found: the finder (`koFound` "Hey. Hey! Wake up.") wakes him after `BODY.reviveTime`; `woke`:
    `startKo` (both search `CAUTION.koSearch` 60 s round the spot, then cautious `koCautious` 180 s, then normal),
    the waker's search restarts (`Enemy.koSearch`) and he radios a `ko` call (`koReport`, one "Copy."; nobody else
    turns cautious).
  - Caution per guard (`Enemy.caution`, synced at 5 Hz with the board and after each change; `EnemyManager.cautionOf`):
    `AlertInput.cautious` keeps a calm guard in `cooldown` (sight x1.3, the board picks him first) and never unaware
    while it lasts; patrol `PACE.cautious` 0.95; route pauses and post glances x `CAUTION.waitMul` 0.6
    (`PatrolWalker.waitMul`; timed loops keep their schedule); the torch rule of a searching guard. Music does not
    follow it (A8). Contact and missing holds are not wired (`fought` stays each guard's combat caution; A16).
- Noise investigations (guard-ai S3, S2 check polish 2): a guard the board sent to a plain noise or a lure who finds
  nothing goes back to unaware (`AlertInput.calmEnd`); gunfire keeps the 45 s cooldown, and so does a guard who has
  fought.
- Posts and high security (guard-ai S5, design 6, goal 7, M1, A10, A12, A17-A19; `ai/posts.ts` and `ai/guardAiData.ts`
  pure): `SquadSlot.post?: PostDef` (`leash` m round the guard's spawn point, `highSecurity?`, `guards?` text) and
  `profile?`; map modes call `EnemyManager.placeSlot(e, slot, section?)` after `spawn` / `setPatrol` (Sector Ops passes
  the `SectorDef` index; Course and Infiltration let it pick the `MapLayout.guardAi` zone, else 0) -> `Enemy.setPost`,
  `Enemy.section`, `Enemy.profile`. A normal post is sent like any guard. A high-security post (`Enemy.secure`,
  `mayLeave` false): the board never sends him (`GV_POSTED` in the view: no investigation, light check, missing pair);
  a noise or gunfire at his investigate tier, or a light he sees go out, lures him instead (`Enemy.lureTo` ->
  `PostLure`): he walks to the point of his leash nearest it (investigate pace), looks toward it `POST.lureLook` 5 s
  sweeping +-`POST.lureSweep` 0.6 rad, walks back and faces his post yaw (`returnFace` 0.8 s, then the walker); a second
  lure at the same leash point does not restart him; the lure counts as `turning` (the linger rule never walks him off)
  and gives only a turn's meter floor. A search (a body, a radio check, after combat) and his investigate spot are
  clamped into the leash; he wakes no knocked-out guard outside it; in combat `chasePoint` / strafe points are clamped,
  cover outside the leash is skipped, and a target outside it (+1.5 m) is held from the post (the `hold` rule); he
  never runs to an alarm panel outside it. A revived guard keeps his post (`Enemy.inherit`). Not yet: squads / handler /
  zone / role tags (S5b). Map data: `MapLayout.guardAi` (zones, `noisy`, entries, squads) and `SectorDef.noisy` /
  `entries`; `EnemyManager.mapNoisy` loads the map's noisy things as the masking, Sector Ops swaps in the live
  section's (`setNoisy` on load). Checks: `validateGuardAi` / `validatePosts` run on load in dev (console warnings via
  `reportGuardAi`, never a throw) and in `tests/postsWiring.test.ts` over every live map's sectors.
- Tactics: from sight into cover first (85%), attack -> cover after 2.5-4.5 s, peek cycles (4.2 s, up to 5); out of sight
  an `advancing` bound to cover closer to the believed position (`pickAdvance`), a 2.5 s hold, then the next; the last
  stretch is walked (`ADVANCE_PACE`); cover is picked against `knownPt` (never the real position out of sight). One bullet
  to the head kills any guard but a heavy (`Enemy.applyDamage`). The close-range sense from behind ignores a sneak /
  crouched approach.
- `EnemyManager.stealth` (on in Hunter, Mission and Infiltration; off in Free Roam): shared `lkp` (sightings by alerted
  enemies, located gunfire), a flow field to the LKP (never the real position), arriving with nothing there starts the
  search; `callAlert` radios within `RADIO` 22 m in the parked modes (a radioed alert does not relay; the live modes use
  the radio net above); `sightT`, `hunting`.
- HUD: `ui/hud/awareness.ts` arcs round the crosshair (only for enemies `inSight` or within `ARC_NEAR` 2.5 m),
  `Hud.setLight` meter; `vfx/lkpGhost.ts` (thin-instanced silhouette) shown at the LKP while hunted unseen
  (`GameState.updateStealthHud`).
- Light: perception reads `World.lightField` (`docs/systems/lighting.md`); zones from `LevelBuilder.ambientZone`. Light
  fixtures: `LightDef.fixture` (box size + offset) is the shot target (`rayBox`), drawn by the light rig as a box that
  goes dark with the light.
- Bodies: `Enemy.die` / `knockOut` hand the rig to `EnemyManager.addBody` -> `ai/body.ts` `Body` (a settled `Ragdoll`, or
  laid flat when out of budget; `BODY.max` kept). Enemies not in combat look for bodies each think (`bodyNoticed`: field x
  `lightFactor(body.light)` x distance; one ray) -> `bodyFound`: the finder searches; a non-lethal body is revived
  (`BODY.reviveTime`; the woken guard is the same guard: `Enemy.inherit`); coordinated modes: awareness and caution
  below; parked modes: the squad within `RADIO` searches. Cameras see bodies (guard-ai S7, design 9, M6; host only, coordinated
  modes): `SecuritySystem`'s body pass (2 Hz per online camera, IR: no light term, G240; looped / off / jammed /
  destroyed cameras see nothing) reads `EnemyManager.bodies` (`setBodySource`, wired in `GameState` beside the
  security system) and its `onBody` (separate from `onEvent`, which `CtDevices` owns) calls
  `EnemyManager.cameraReport(ev, "Camera N")`: a body already found, carried, hidden or gone is ignored; else one
  `camBody` incident per body (`IncidentBoard.reportBody`; a second camera's report merges while it is open) sends the
  nearest 1 (KO) or 2 (dead) calm guards within `INCIDENT.callR` 25 m by path (never dogs / melee); nobody in range:
  the report waits `camWait` 30 s for one, then lapses (section caution is S4's). A new incident gets the desk's radio
  line (`camBodyLine`, e.g. "Camera 2 has a man down, Delivery Yard. Nearest unit, check on him."; `onCameraLine` ->
  the HUD bark over that camera, `cam:<id>`). The sent guard (`Enemy.checkBody`, `MODE_BODY`) goes straight to
  investigating at the investigate pace (no 2.4 s look first), held by the task (`AlertInput.hold`, `bodyWalk` 45 s);
  within `BODY.close` with a clear line the body-found path takes over (`bodyFound`: a KO'd guard is woken, the area
  searched). The body gone or found first, or the walk timing out: the usual investigation end; a glimpse drops it.
  `SectorMode.unloadSection` calls `clearBodyReports` (section load / restart). Carry (`game/stealthSystems.ts`): an unarmed rig over the shoulder, the
  player's `reachL/R` hold its knees, weapon stowed, `speedCap` `BODY.carrySpeed`, no sprint / cover / traversal; drop = a
  short `Ragdoll`; hide spots (`MapLayout.hideSpots`) remove it.
- Lights: `PlayerWeapons.onRay` -> `StealthSystems.shotRay` -> `lightOnRay` + `LightRegistry.destroy`; `MapLayout.switches`
  toggle a `group`; both call `EnemyManager.lightsOut(x, z, y, lightId, group)` (every lights-out path goes through it;
  the EMP passes its point). Coordinated (guard-ai S2, M1 goal 4): a `light` incident whose perceivers are the calm
  guards who SAW it go (the fixture in the focused cone to 25 m or the peripheral field to 12 m with one line-of-sight
  ray, or a fixture of the circuit in the room they stand in: `roomAt`); one goes, two when a second witness is within
  15 m. The bulb's pop and the round's impact merge into it (`shotRay` reports the light first). `Enemy.checkLight`: bark
  `lightOut`, walk at the investigate pace (a pair's second stops 2.2 m short), look at the fixture 2 s, a 4-point ring
  2-6 m round it (1.5 s at each; unreachable points skipped), bark `standDown`, back to the route unaware (no
  cooldown; cooldown only if he has fought); a glimpse (meter >= `investigate`) drops the check. Parked modes: the old
  rule (nearest calm enemy within 25 m investigates, others within 14 m `notice`). Flashlights:
  `World` adds `FLASHLIGHTS` (4) on dark maps; human guards (`carriesTorch`: not dogs) get them while investigating / searching / hunting unseen where the
  static light is < `TORCH_DARK` 0.35 (kept to `TORCH_KEEP` 0.45; pure `torchRule` in `archetypes.ts`); `EnemyManager.beamReach` (centre + four edge rays, 15 Hz
  per torch) stops the beam at geometry.
- Alarms: `ai/alarm.ts` (pure) panels from `MapLayout.alarms`; `assignAlarm` (2 Hz) sends the nearest alerted enemy to work
  it `ALARM.holdTime` -> `onAlarm` -> reinforcements (`reinforce`, at the `MapLayout.reinforce` point furthest from the
  player). The player disables a panel with a hold.
- Sound: `world/surfaces.ts` (pure) `surfaceAt` scales footstep noise (`SURFACE_NOISE`) and picks the footstep voice. Shots:
  `SHOT_NOISE` x weapon noise; at or below `SUPPRESSED_NOISE` it is `hear` (suspicion), else `noise` (combat); `onRay` hits
  are heard within `IMPACT_NOISE`.
- Doors: `world/doors.ts` `Doors` (from `Door` anchors): one thin-instanced leaf mesh, a static body only while closed,
  created by `arm()` after the nav grid is built (co-op clients `openAll()`); `open(d, quiet | bash | enemy)` drops the body
  and swings the leaf, `close` refuses an occupied doorway; `pushOpen` (enemies), the bash at a sprint and the interact
  (`door` kind) live in `StealthSystems`; `onSound` -> `door` event + noise (quiet 2 m, bash 10 m). The sprint bash goes
  with the sprint (G31); a bash becomes a door-menu choice that can knock out a guard behind the door (G97).
- Goggles: `game/vision.ts`, render only (`docs/systems/gadgets.md`). The LKP ghost uses `vfx/silhouettes.ts`.
- Interactables: kinds `switch`, `alarm`, `hide`, `body`, `door`, `medkitWall` with per-item `reach` and `onUse`;
  `nearest(feet, reach, only)`; `GameState.updateInteract` calls `onUse`.

## Enemy archetypes (2.0 phase 6)
- `ai/archetypes.ts` (pure, `ARCHETYPE`): `heavyMult` (by `fromFront`), `shieldBlocks`, `grabRule` (heavy frontal = lethal
  only, enforcer frontal = none; `TakedownController` offers `lethalOnly`), `sniperRelocate`, `glint`, `smellRate`,
  `radioCheck`. `enemyDefs.ts` re-exports them; `ENEMY_KINDS` = `grunt | runner | heavy | sniper | enforcer | dog | droneOp
  | officer` (`emptyKinds()` for tallies; `quadruped`).
- `Enemy`: `perceptionMul` (difficulty x officer buff), dog smell (`smelled` keeps an alerted dog on the target),
  `applyDamage` plates / shield, sniper `shotsHere` / `relocations` (a new post 5-22 m away), `glintFor(viewer)`, laser and
  glint meshes (`sniperFx`), enforcer push in `attack`, dog heel (`findLeader`), `DogModel` (`ai/dogModel.ts`; dead dogs in
  `EnemyManager.dogCorpses`), `bark(ev)` -> `ctx.onBark`, `squad`, `buff`.
- `EnemyManager`: `ReconDrone`s (`ai/reconDrone.ts`: the `droneOp` guard's own drone; Damageable sphere, orbit, camera
  cone, `onDroneSpot`, `empAt`), officer buffs (2 Hz), the alarm runner weighted to officers, `joinSquad` +
  `radioCheckNow` (period `ARCHETYPE.radio`, stealth only), radio delays x reaction x officer.
- Which archetypes stay is settled by the CT co-op research (G1, G49).
- (marlow-bays item 24) Every guard rig (`buildEnemyRig`: the host's guards and the co-op client's puppets) reads its
  tuned base table (`anim/animBaseGuard.ts`) plus the tuner's guard rows (`anim/tuneGuard.ts`; `rig.guardRows`), never
  Wren's; the brain reads only the posed rig (the head is the eye), as before. Untuned: bit-identical.
- Barks: `ai/barks.ts` (`BARKS`, `RADIO_BARKS`, `BarkVoice` cooldowns); `ui/hud/barks.ts` `BarkView`; `bark` event ->
  `sfx.radio()` for radio lines.

## Difficulty (G106)
- `DIFFICULTY` (`ai/archetypes.ts`): `rookie | normal | realistic | perfectionist` (`DifficultyPreset`; `Difficulty` is the
  same type): perception, damage, accuracy, hp, reaction, reward. `parseDifficulty` reads easy / hard, and an old `custom`
  or unknown name as Normal. `resolveDifficulty(d)` returns the level's def.
- `GameState` resolves it once at match start (`GameState.diff` = `difficultyDef`) and hands it to `EnemyManager.diff` /
  `AiContext.diff`: every AI read goes through it. `reaction` scales the radio call-in (`callInDelay`), squad radio delays,
  the first-shot settle and the panel raise (`ALARM.holdTime` x reaction). In co-op the host's level runs (the AI is
  host-only) and shows read-only in the client's lobby.
- Tests: `tests/difficulty.test.ts`; e2e-mouse, e2e-pad, e2e-coop pick or check a level.

## Player cover reference (locomotion step 11)
- `PlayerRef.cover` / `coverT`: the local player's back-to-wall segment (`WallCore.spot`) and seconds on it; the host sets
  each client's from its `wall` MoveState. `EnemyManager.assignFlanker` picks a flanker once a player has held cover > 4 s,
  and `Enemy.tactics` lobs a grenade to flush one held > 6 s (one grenade in the air at a time; e2e-wall checks both).

## Navigation
- `buildNavGrid` (load time) -> `NavGrid` (pure). Enemies chase via the shared flow field, use A* only for cover moves,
  and are constrained to nav cells (no physics character controller per enemy).
- Runtime closures (sector-fixes-r2): `addClosure(cx, cz, hx, hz, yaw, y)` collects a rect's walkable cells near height y
  once; `setClosed(id, on)` toggles `walk` through a per-cell count (overlaps stay shut until all open) and bumps
  `version`, which makes `goTo` routes and the manager's flow field replan. Sector Ops shuts each bolted team door's
  doorway this way (`sectorMode.findBolts` / `unbolt` / `rebolt`; host and solo only, the client has no grid).
- Multi-level: the grid is layered - up to 3 standing surfaces per column by default (`sampleLayers`; a surface needs
  `HEADROOM` 1.7 m; a map may raise `navLayers`), cell = `layer * cols + column`; columns join by height (`stepTo`). Links
  (`navLinks`): ladders both ways (`kind 'ladder'`), ledge drops 1-2.2 m one way; A* / Dijkstra take them, paths split at
  them (`Waypoint.link`), `flowNext` returns a link's start. Every query takes an optional height (`cellOf`, `heightAt`,
  `nearestWalkable`, `lineClear`, `findPath`, `flowField`, `flowNext`); NaN = the lowest surface. Enemies: `cellNear` keeps
  their storey, `beginLink` / `runLink` (walk 1.5, climb 1.1 up / 1.4 down, drop 6 m/s; dogs wait at the foot).
- Brains (`ai/enemy.ts`) think at ~4 Hz (line of sight rays staggered) and act every fixed step: walk when they can see
  the target, run only to contact / between covers; suppressive fire at the last known position, blind fire in some hide
  phases; cover choice weighted by `coverQuality`. Chasing enemies entering a new room unseen pause 0.7 s at the threshold.
- `EnemyManager` caps awake enemies (12, `MAX_ALIVE` in `src/ai/enemyManager.ts`) and ragdolls (`BUDGET.maxRagdolls`).

## Modes
- Modes implement `GameMode` (`game/modes/`; `ModeId` = `sandbox | mission | clear | infiltration | course`); `GameState`
  owns world, player, combat, AI, pickups and interactables and calls mode hooks. `GameState.endSession` shows results;
  `GameState.rewardHook` lets progression add rewards. Modes and the campaign: `docs/systems/modes-and-progression.md`.
- Hunter (`clear`, `game/modes/clearMode.ts`; parked behind `?legacy=1`, G7): each tagged room's squad spawns unalerted
  holding it (`Enemy.hold`: fights from inside, never chases out, falls back to its post); squads beyond the awake cap spawn
  later, nearest rooms first, never within 7 m. The HUD shows only "Enemies left N" (`RoomClearTracker.hostilesLeft`).
  Going down shows "DOWN" (three tries). The last hostile down completes the operation (`operationComplete` event,
  banner, slow beat, letterbox; one "Operation complete" reward line).
- `?autostart=<mapId>&mode=<sandbox|mission|clear|infiltration|course>` boots straight into a match (`mode=hunter` is an
  alias of `clear`; dev and tests).
- Sector Ops guard rules (sector-redesign slice 0): `checkSectorGuards` (`game/sectors.ts`, run by `checkSectors`)
  fails a human guard with no gun (no runners, M1), a heavy (G155), more dogs than the section's `dogs` (default 0, M10)
  and a dog without a `handler` (an armed human guard of the section). Alarm reinforcements spawn as
  `SECTOR_REINFORCE_KIND` (grunt), `perStage` per stage. `SectorGuard` also carries optional `squad`, `zone`, `role`,
  `reason`, `pair` for guard-ai (not read yet; `docs/sector-redesign/research/ENGINE.md` section 7). Sector Ops still
  joins no squads, so radio checks do not run there.
- Palm strike (G42): `strikeTargetable` (`game/elbowStrike.ts`) keeps dogs out of the strike's pick and its contact
  (solo, host and a client's strike on the host). Dogs carry no flashlight (G201, `carriesTorch`).
- Sector restart (G22): `SectionStartState` (`game/sectorReset.ts`) records the fixed lights (switched, shot, the base of
  a jammed lamp; not torches) and the unlocked doors when a section begins, and a section restart puts them back
  (`LightRegistry.resetTo`, `StealthSystems.syncSwitches` for the switch labels). Host / solo; Sector co-op does not
  mirror lamps yet.
- Camera cap (G1): `validateSecurity` caps cameras live at once (12 per Sector section, untagged ones counting in each)
  and the map at 16 (`WIRE_CAMERAS`, the co-op `sec.ck` list).
