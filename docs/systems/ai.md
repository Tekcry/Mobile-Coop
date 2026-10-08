# Stealth AI, enemy archetypes, AI and modes
Purpose: perception, alert states, enemy behaviour, archetypes, the navigation grid and the game-mode hooks.
Design authority: docs/design-bible.md (Section 5.7)

## Stealth AI (2.0 phase 3a)
- `ai/perception.ts` (pure, `PERCEPTION`): `sightRate` = rate x (1 - d / range)^1.5 x field (55 deg focus, 25 m;
  peripheral 100 deg, 12 m, x0.35) x `lightFactor` (`visibilityFromLight`^2) x stance x `motionFactor` x exposure
  (fraction of chest / head / hips in line of sight) x state sensitivity, plus a close-range term (2.2 m, moving),
  capped at `maxRate`; `instantDetect` (point blank, lit, in focus); `stepMeter` (rises by what exceeds `leak`,
  holds `hold`, drains `decay`); `noiseSuspicion(dist, radius)`.
- `ai/alertState.ts` (pure): `AlertMachine` unaware -> suspicious -> investigating -> alert -> searching ->
  cooldown (`ALERT` times, `SENSITIVITY` per level). `Enemy.alerted` = level alert (combat).
- `Enemy`: perceives at ~4 Hz (rays to chest, head, hips; hips skipped in combat), integrates the meter per fixed
  step (`updateAwareness`), `calmDecide` drives patrol (`PatrolWalker`: `SquadSlot.route` / post with glances),
  look at the stimulus, walk to it (`goTo`: straight or A*), search sweeps (`searchPoint`, `searchSlot`). Inputs:
  `hear(x, z, radius)`, `hearGunfire`, `radio(delay)`, `searchAt` (bodies / lights, phase 3b), `alert()`.
- 2.3: `EnemyManager.hear` muffles a noise to `MUFFLE` (0.45) of its reach when a wall is between it and the
  listener (one ray at head height; low cover does not muffle). Guards hold longer (`PATROL.wait` 9 s, glances every
  14 s, `searchLook` 3 s, `hearLook` 2.4 s, slower patrol / investigate / search paces). Combat: `ALERT.lostSight` 12 s,
  `searchTime` 60 s, and after combat a guard never returns to unaware (`AlertMachine.fought`: cooldown for good).
  Radio window: a sighting (not a loud alert) is shouted to guards within `ALERT.shout` 8 m at once (`ctx.shout`)
  and radioed after `ALERT.callIn` 2.5 s (x reaction; `Enemy.radioT`, bark `callIn`); a spotter taken out first
  tells nobody; gunfire / a hit / a flashbang (`alert()`, `loudAlert`) calls in at once. `PlayerRef.spotted`: set
  when a guard in combat sees that player (`reportSighting`, a sighting alert), cleared when nobody is in combat;
  takedowns skip a guard at level alert while the attacker is spotted (`GameState.spottedLocal`, host check on
  client `td`, `PF.spotted` in snapshots). Tactics: from sight into cover first (85%), attack -> cover after 2.5-4.5 s,
  longer peek cycles (4.2 s, up to 5), slower strafes; out of sight (stealth) an `advancing` bound to cover closer to
  the believed position (`pickAdvance`, 3+ m closer, <= 12 m away), a 2.5 s hold, then the next; the last stretch is
  walked (`ADVANCE_PACE`); cover is picked against `knownPt` (never the real position out of sight). One bullet to the
  head kills any guard but a heavy (`Enemy.applyDamage`).
- 2.0.1 tuning (guards calmer): `PATROL.wait` 5.5 s, glances every 10 s; `ENEMY_CALM_MOTION` (60 deg/s turns while
  not in combat / searching); `noiseSuspicion` rises with the square of closeness (edge noises < suspicious);
  `noiseRadius` walk 1 + 1.3 v; the close-range sense from behind ignores a sneak / crouched approach;
  `TAKEDOWN.reach` 1.8, `behindCone` 0.56 pi.
- `EnemyManager.stealth` (Clear, Mission): shared `lkp` (sightings by alerted enemies, located gunfire), flow field
  to the LKP (never the real position), chase / face the LKP out of sight, arriving with nothing there starts the
  search; `callAlert` radios within `RADIO` 22 m (a radioed alert does not relay); `sightT`, `hunting`. Off (Wave),
  enemies are sent at the players and combat never cools into a search.
- HUD: `ui/hud/awareness.ts` arcs round the crosshair (canvas, drawn only while showing; `shown / maxFill /
  anyRed`; only for enemies `inSight` or within `ARC_NEAR` 2.5 m), `Hud.setLight` meter; `vfx/lkpGhost.ts` (thin-instanced silhouette, 2 draw calls) captured from the rig
  while seen, shown at the LKP while hunted unseen (`GameState.updateStealthHud`).
- Light fixtures: `LightDef.fixture` (box size + offset) is the shot target (`rayBox`) and is drawn by the light rig
  as a box that goes dark with the light (Warehouse lamp strips, flood housings).
- Light: `LightRegistry.zones` / `ambientAt` (`LevelBuilder.ambientZone`); Warehouse is a night map (yard 0.3,
  interior 0.12, `LAMPS_ON`, lamp `group` per room).
- Bodies (3b): `Enemy.die` / `knockOut` hand the rig to `EnemyManager.addBody` -> `ai/body.ts` `Body` (a `Ragdoll`
  with `keep` that stays settled, or laid flat when `canRagdoll` is out of budget; `BODY.max` kept). Enemies not in
  combat look for bodies each think (`bodyNoticed`: field x `lightFactor(body.light)` x distance, close range
  always; one ray) -> `bodyFound`: finder `searchAt(x, z, revive?)`, squad within `RADIO` searches; a non-lethal
  body is revived (`BODY.reviveTime`, `onRevived` -> mode `onEnemyJoined`). Carry (`game/stealthSystems.ts`): a
  fresh unarmed rig (`buildBodyRig`) parented to the player's chest in a fixed over-the-shoulder pose; the player's
  `reachL/R` hold its knees; weapon stowed, `speedCap` `BODY.carrySpeed`, no sprint / cover / traversal; drop = a
  short `Ragdoll` (settle 2.2 s); hide spots (`MapLayout.hideSpots`) remove it.
- Lights (3b): `PlayerWeapons.onRay` -> `StealthSystems.shotRay` -> `lightOnRay` (pure) + `LightRegistry.destroy`;
  `MapLayout.switches` toggle a `group`; both call `EnemyManager.lightsOut` (nearest calm enemy investigates, others
  `notice`). Flashlights: `World` adds `FLASHLIGHTS` (4) `kind 'flashlight'` lights on dark maps; the manager gives
  them to enemies with `torchWanted` (investigating / searching / hunting unseen where `ambientAt` < 0.35) and
  `placeTorch` moves them each step; `LightRig` re-places pooled flashlights every frame (no bulb). The beam stops at
  geometry: `EnemyManager.beamReach` (centre + four edge rays, round robin, 15 Hz per torch) sets `LightDef.reach`,
  the pool light's `range`.
- Alarms (3b): `ai/alarm.ts` (pure) panels from `MapLayout.alarms`; `assignAlarm` (2 Hz) sends the nearest alerted
  enemy (`runAlarm`, run speed) to work it `ALARM.holdTime` -> `onAlarm` -> reinforcements (`reinforce`, at the
  `MapLayout.reinforce` point furthest from the player). The player disables a panel with a hold.
- Sound (3c): `world/surfaces.ts` (pure) `surfaceAt(level.surfaces, ...)` (`LevelBuilder.surface`, default
  `MapTheme.floor`) scales footstep noise (`SURFACE_NOISE`) and picks the footstep voice (`GameState.surface`).
  Shots: `SHOT_NOISE` x weapon noise; at or below `SUPPRESSED_NOISE` it is `hear` (suspicion), else `noise`
  (combat); `onRay` hits are heard within `IMPACT_NOISE`.
- Doors (3c): `world/doors.ts` `Doors` (from `Door` anchors via `LevelBuilder.door`): one thin-instanced leaf mesh,
  a static body only while closed, created by `arm()` after the nav grid is built (co-op clients `openAll()`);
  `open(d, quiet | bash | enemy)` drops the body and swings the leaf, `close` refuses an occupied doorway;
  `pushOpen` (enemies, each step), sprint bash and the interact (`door` kind) live in `StealthSystems`; `onSound`
  -> `door` event (audio) + noise (quiet 2 m, bash 10 m).
- Goggles (3d): `game/vision.ts` (pure) `VisionState` (action `vision` cycles off / night / sonar; `VISION` pulse
  period, reveal, range, max run, recharge). Night vision is the `nv` uniform of `CinematicPost`
  (`setNightVision`); sonar pulses capture enemies in range into `GameState.sonarMarks` (`vfx/silhouettes.ts`,
  overlay = depth ALWAYS), plus a torus ring; `Hud.setVision` on the tactical strip. The LKP ghost uses the same
  `Silhouettes`.
- Interactables: kinds `switch`, `alarm`, `hide`, `body`, `door` with per-item `reach` and `onUse`; `nearest(feet, reach,
  only)` (hide spots only with `only`); `GameState.updateInteract` calls `onUse` (else Mission).

## Enemy archetypes (2.0 phase 6)
- `ai/archetypes.ts` (pure, `ARCHETYPE`): `heavyMult` (by `fromFront`), `shieldBlocks`, `grabRule` (heavy frontal =
  lethal only, enforcer frontal = none; `TakedownController` offers `lethalOnly`), `sniperRelocate`, `glint`,
  `smellRate`, `radioCheck`, `DIFFICULTY` tiers (`rookie | normal | realistic | perfectionist`: perception, damage,
  accuracy, hp, reaction, reward, `execute`, `sonar`; `parseDifficulty` reads easy / hard). `enemyDefs.ts` re-exports
  them; `ENEMY_KINDS` adds `sniper | enforcer | dog | droneOp | officer` (`emptyKinds()` for tallies; `quadruped`).
- `Enemy`: `perceptionMul` (tier x officer buff), dog smell (`smelled` keeps an alerted dog on the target),
  `applyDamage` plates / shield (`shieldBlocks`), sniper `shotsHere` / `relocations` (`relocating` picks a post
  5-22 m away), `glintFor(viewer)`, laser + glint meshes (`sniperFx`), enforcer push in `attack`, dog heel
  (`findLeader` in its squad), `DogModel` (`ai/dogModel.ts`) instead of the rig (rig root disabled; dead dogs kept
  in `EnemyManager.dogCorpses`), `bark(ev)` -> `ctx.onBark`, `squad`, `buff`.
- `EnemyManager`: `ReconDrone`s (`ai/reconDrone.ts`, Damageable + ANIMATED sphere, orbit, camera cone, `onDroneSpot`,
  `empAt`), officer buffs (2 Hz), alarm runner weighted to officers, `joinSquad` + `radioCheckNow` (period
  `ARCHETYPE.radio`, stealth only), radio delays x tier reaction x officer.
- Barks: `ai/barks.ts` (`BARKS`, `RADIO_BARKS`, `BarkVoice` cooldowns); `ui/hud/barks.ts` `BarkView` (pool, placed by
  `GameState.placeBark`); `bark` event -> `sfx.radio()` for radio lines.
- `GameState.difficultyDef`; Perfectionist turns off `ExecuteController` and `VisionState.sonarAllowed`.

## AI and modes
- `buildNavGrid` (load time) -> `NavGrid` (pure). Enemies chase via the shared flow field, use A* only
  for cover moves, and are constrained to nav cells (no physics character controller per enemy).
- Multi-level (2.1): the grid is layered - up to 3 standing surfaces per column (`sampleLayers`: rays cast on from
  under each piece hit, a surface needs `HEADROOM` 1.7 m), cell = `layer * cols + column`; columns join by height
  (`stepTo`), never by layer number. Links (`navLinks`): ladders both ways (`kind 'ladder'`, route foot -> rungs ->
  top), ledge drops 1-2.2 m one way; A* / Dijkstra take them (`fillPredecessors` for the flow field), paths split
  at them (`Waypoint.link`), `flowNext` returns a link's start. Every query takes an optional height (`cellOf`,
  `heightAt`, `nearestWalkable` (soft: the storey nearest it), `lineClear(a, b, ya, yb)`, `findPath(.., fromY,
  toY)`, `flowField(goals, out, ys)`, `flowNext(.., y)`); NaN = the lowest surface. Enemies: `cellNear` keeps
  their storey, `goTo` defaults to their own height, `beginLink` / `runLink` (walk 1.5, climb 1.1 up / 1.4 down,
  drop 6 m/s; `climbing` -> `traverse 'climb'` pose; dogs wait at the foot), `linksTaken`. `SquadSlot.y` spawns on
  an upper storey.
- Enemy brains (`ai/enemy.ts`) think at ~4 Hz (LOS raycasts staggered) and act every fixed step. Tactics: walk
  when they can see the target, run only to contact/between covers; suppressive fire at the last known
  position, blind fire in some hide phases; cover choice weighted by `coverQuality`; `EnemyManager` assigns one
  flanker against a player holding cover (> 4 s) and allows one grenade in the air at a time (player camping
  the same cover > 6 s); `hear()` makes unalerted enemies investigate footsteps (`PlayerRef.cover/coverT/
  suppress` carry the player side).
- `EnemyManager` caps alive enemies (10) and ragdolls (`BUDGET.maxRagdolls`).
- Modes implement `GameMode` (`game/modes/`; `ModeId` also has `tdm | ffa`, run by the net host, not a mode); `GameState` owns world, player, combat, AI, pickups,
  interactables and calls mode hooks. `GameState.endSession` shows results; `GameState.rewardHook` lets
  progression add rewards.
- Clear mode (`game/modes/clearMode.ts`): each tagged room's squad spawns unalerted holding it (`Enemy.hold`: fights
  from inside, takes cover inside, never chases out, falls back to its post); squads beyond the alive cap spawn
  later, nearest rooms first, never within 7 m. The HUD shows only "Enemies left N" (`enemiesLeft` =
  `RoomClearTracker.hostilesLeft`: alive + still to spawn): no room tag (`hud.setRoom` is skipped in Clear; other
  modes keep it on tagged maps), room counts, lives, score, objective or enemy blips (`GameState.enemyBlips`), and
  nothing happens when a room empties (it silently becomes the respawn checkpoint). Going down shows "DOWN" (three
  tries, not shown). The last hostile down completes the operation: `operationComplete` event (audio stinger),
  OPERATION COMPLETE banner, slow beat, letterbox; results have no rooms row; `computeRewards` pays one
  "Operation complete" line instead of per-room rewards.
  Chasing enemies entering a new room unseen pause 0.7 s at the threshold (doorway check).
- `?autostart=<mapId>&mode=<sandbox|wave|mission|clear>` boots straight into a match (dev/tests).
