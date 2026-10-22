# Stealth AI, enemy archetypes and modes
Purpose: perception, alert states, enemy behaviour, archetypes, difficulty, the navigation grid and the game-mode hooks.
Design authority: docs/DECISIONS.md (G40-G47, G49, G106), then docs/design-bible.md (Section 5.7).

## Decided direction
- Decided, not built yet (G41): guards close doors behind them on a calm patrol and notice any door open that should be
  shut; one 15% open threshold for light, sound and sight. Code: guards push doors open and leave them; the light cut is
  `DOOR_SHUT` 0.05 (`docs/systems/lighting.md`).
- Decided, not built yet (G44): guards see poorly above them, as in CT. Code: the sight field is a horizontal cone only (a
  player 4 m above a guard is seen as well as one at his height).
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
  Inputs: `hear(x, z, radius)`, `hearGunfire`, `radio(delay)`, `searchAt` (bodies / lights), `alert()`.
- Hearing: `EnemyManager.hear` muffles a noise to `MUFFLE` (0.45) of its reach when a wall is between it and the listener
  (one ray at head height; low cover does not muffle). `noiseSuspicion` rises with the square of closeness.
- Pace and patience: `PATROL.wait` 5.5 s, glances every 10 s, `searchLook` 3 s, `hearLook` 2.4 s; `ENEMY_CALM_MOTION` (60
  deg/s turns while not in combat / searching). Combat: `ALERT.lostSight` 12 s, `searchTime` 60 s; after combat a guard
  never returns to unaware (`AlertMachine.fought`).
- Radio window: a sighting is shouted to guards within `ALERT.shout` 8 m at once and radioed after `ALERT.callIn` 2.5 s (x
  reaction; bark `callIn`); a spotter taken out first tells nobody; gunfire / a hit / a flashbang (`loudAlert`) calls in at
  once. `PlayerRef.spotted`: set when a guard in combat sees that player, cleared when nobody is in combat.
- Tactics: from sight into cover first (85%), attack -> cover after 2.5-4.5 s, peek cycles (4.2 s, up to 5); out of sight
  an `advancing` bound to cover closer to the believed position (`pickAdvance`), a 2.5 s hold, then the next; the last
  stretch is walked (`ADVANCE_PACE`); cover is picked against `knownPt` (never the real position out of sight). One bullet
  to the head kills any guard but a heavy (`Enemy.applyDamage`). The close-range sense from behind ignores a sneak /
  crouched approach.
- `EnemyManager.stealth` (on in Hunter, Mission and Infiltration; off in Free Roam): shared `lkp` (sightings by alerted
  enemies, located gunfire), a flow field to the LKP (never the real position), arriving with nothing there starts the
  search; `callAlert` radios within `RADIO` 22 m (a radioed alert does not relay); `sightT`, `hunting`.
- HUD: `ui/hud/awareness.ts` arcs round the crosshair (only for enemies `inSight` or within `ARC_NEAR` 2.5 m),
  `Hud.setLight` meter; `vfx/lkpGhost.ts` (thin-instanced silhouette) shown at the LKP while hunted unseen
  (`GameState.updateStealthHud`).
- Light: perception reads `World.lightField` (`docs/systems/lighting.md`); zones from `LevelBuilder.ambientZone`. Light
  fixtures: `LightDef.fixture` (box size + offset) is the shot target (`rayBox`), drawn by the light rig as a box that
  goes dark with the light.
- Bodies: `Enemy.die` / `knockOut` hand the rig to `EnemyManager.addBody` -> `ai/body.ts` `Body` (a settled `Ragdoll`, or
  laid flat when out of budget; `BODY.max` kept). Enemies not in combat look for bodies each think (`bodyNoticed`: field x
  `lightFactor(body.light)` x distance; one ray) -> `bodyFound`: the finder searches, the squad within `RADIO` searches; a
  non-lethal body is revived (`BODY.reviveTime`). Carry (`game/stealthSystems.ts`): an unarmed rig over the shoulder, the
  player's `reachL/R` hold its knees, weapon stowed, `speedCap` `BODY.carrySpeed`, no sprint / cover / traversal; drop = a
  short `Ragdoll`; hide spots (`MapLayout.hideSpots`) remove it.
- Lights: `PlayerWeapons.onRay` -> `StealthSystems.shotRay` -> `lightOnRay` + `LightRegistry.destroy`; `MapLayout.switches`
  toggle a `group`; both call `EnemyManager.lightsOut` (nearest calm enemy investigates, others `notice`). Flashlights:
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
