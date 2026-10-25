# Modes, the course, parked modes and the parked economy
Owner: the orchestrator. Status: current.
Purpose: the game modes as built, the Fallow training course, what `?legacy=1` parks, and the parked arsenal / suit /
HQ economy and cosmetics.
Design authority: docs/DECISIONS.md (G2, G7, G8, G111, G116, G184, G290, G349, G353, G370, G371, G384, G385), then
docs/design-bible.md (Sections 5.8 and 6).

The decided modes (current rules: docs/DECISIONS.md, the newest entry wins):
- Campaign: exactly 2 players, cannot be completed solo, no bot (G2, G253); every section forces a co-op traversal move
  with no solo bypass (G292, G293). Campaign Mission 1 is Tallow Wharf, the new small campaign map, with the first
  prototypes Three Grey Coats and Two-Key Ledger (G293, G340, G402; the mission-framework job); Kestrel is
  paused (G53). Decided, not built yet: the campaign is entered from the co-op lobby, with Marlow Yard as its training
  prologue before Mission 1 (G371); campaign sections grant no rewards, optional objectives only raise the rating
  (G384); Mission 1 has no civilians (G373). The campaign mission framework is not built yet: today's missions run in
  Infiltration.
- Marlow Yard (`ctcourse`, Course mode): the 2-player co-op training course; guided and linear, it keeps its guidance
  marks and objective list (G292). Downed: the campaign rule (G349, G126). No strict rule, fail or send-back: every
  failure is a retry (G370).
- Sector Ops (`campusOps` Saltmarsh Park, five sections S1-S5; `warehouseOps` is the old map, frozen, G390): 1 to 4
  players, live when coop4 ships (G381), solo always possible (G280, G308).
- Campaign and Sector Ops: strict rules and section restart are owned by bible 5.8 (G290); no maps, markers or
  waypoints, and objectives that name what and where, by bible 5.10 (G336, G339, G343, G351). Marlow Yard is the
  guided exception (G292). Killing a civilian or a protected character restarts the section (G353, replaces G145's
  mission fail): decided, not built yet (no civilian or protected character exists in code).
Hunter is the one non-CT mode kept, parked (G7). Wave, team deathmatch, free-for-all, every player-versus-player mode
and the old solo Training mode are deleted (G8, G12, G116; deletion logs in docs/archive/consolidation/).

## Modes as built (`ModeId`)
| Id | Name | Where | Status |
| --- | --- | --- | --- |
| `infiltration` | Infiltration | Play screen (default), co-op lobby | Live; the campaign's mission runner until the mission framework job ("Campaign" is the player-facing name, kestrel 2026-10-11) |
| `sandbox` | Free Roam | Play screen, co-op lobby | Live; no guards (Proving Grounds adds training dummies) |
| `course` | Training course | Co-op only (two players) | Live on Marlow Yard (`ctcourse`, the co-op training course, G292; `?autostart=ctcourse&mode=course`); also on `courselab` and the Fallow bunker (older course maps) |
| `sector` | Sector Ops | Main menu, solo or co-op lobby | Live on `campusOps` (Saltmarsh Park) and `warehouseOps` (the old map); see below |
| `clear` | Hunter | `?legacy=1` | Parked (G7: comes back later) |
| `mission` | Mission | `?legacy=1` | Parked (the old mission mode; it does not return as team-versus-team, G8) |

- Decided, not built yet (G2, G111): the campaign needs two players; today Infiltration and Free Roam still start solo
  from the Play screen (solo stays as a dev and test path until the campaign job).
- `?autostart=<mapId>&mode=<mode>` starts any mode whatever the flag (tests, dev). An unknown or deleted mode id falls
  back to the autostart default (`sandbox`); an unknown map id to Proving Grounds.
- Infiltration: `game/missions.ts` (`MISSIONS` from `config/missions.json` on listed maps, `validateMissions`,
  `ObjectiveChain`, `DOWNLOAD`, `evaluateRules`, `missionRating`), `game/modes/infiltrationMode.ts` (insertion
  teleport, room squads up to `SQUAD_CAP` 9, per-objective interactables with `onUse`: kinds `terminal`, `charge`,
  `vip`, `intel`, `extract`; download progress within `DOWNLOAD.range`, `noticed()` -> `enemyMgr.hear`; `Vip`
  (`game/vip.ts`) follows by A*; as built a broken mission rule fails the mission at once (G290 replaces this: up to 2
  strict rules, breaking one restarts the section; the mission framework builds it); `finish` sets
  `stats.missionId / rating / bonuses`).
  `GameOptions.missionId / insertion`; `GameMode.onInteract`. The four Warehouse missions are listed; six missions on
  the parked 2.x maps stay in the data, unlisted. `window.__missions` for tests.
- Stealth rating hook: `game/playstyle.ts` `StealthRating` (`GameState.style`; counters alarms / kills / knock-outs /
  detections, no points). `SessionStats.detections / knockouts`. Scoring: `game/modes/score.ts` `killScore`.
- Hunter (`ClearMode`, `?mode=hunter`): `GameMode.onAlarm(at)` returns true when the mode brings its own
  reinforcements: Hunter adds `hostilesLeft` more pending slots (alerted) at the entry point. The benchmark flight runs
  in a Hunter match on the Warehouse (graphics-quality.md).
- Difficulty: CT's fixed levels only (G106): Rookie, Normal, Realistic, Perfectionist (`DifficultyPreset`,
  `ai/archetypes.ts`); no sliders, no alarm-tolerance setting. In co-op the host's level runs on both pages.

## Sector Ops (`sector`)
- Main menu entry, solo or co-op, 1 to 4 players (G308; coop4, PR #317, lifts the cap from 2; solo always has a route
  past team doors, G280). Guards, reinforcements and revive syringes scale with the player count ("Keep scaling",
  2026-10-25; coop4).
- The map is `campusOps`, Saltmarsh Park (`?autostart=campusOps&mode=sector`; `world/maps/campusOps.ts`, sections in
  `campusSectors.ts`, `campusS1.ts`..`campusS5.ts`): five sections, S1 gatehouse and car park, S2 HQ atrium, S3 labs,
  S4 data hall, S5 Old House (G295, G297). Guard counts signed off (G328): S1 15, S2 18, S3 20, S4 25,
  S5 26, for two players (G362); 32 alive is a ceiling, not a target (G187), and room to manoeuvre comes first (G190).
- The old map `warehouseOps` stays selectable (G298; `?autostart=warehouseOps&mode=sector`;
  `world/maps/warehouseOps.ts`: `buildWarehouse(b, opts)` with the openings between sections walled, the connector
  rooms and the M8 pieces; data in `world/maps/warehouseSectors.ts`: sections, guards with their `takedownSpot`, routes,
  reinforcement points, `perStage`, devices tagged `section`). Its three sections are not the Sector Ops layout rule
  (G295 replaced G186's three sections).
- Pure: `game/sectors.ts` (`SectorRun`, `ConnectorMachine`: locked, open, cycling, sealed; `restartSection`),
  `game/sectorCheck.ts` (`SightWorld`: eye-height sight lines through the level's pieces, the M8 takedown check;
  tests only). Mode: `game/modes/sectorMode.ts` (doors by position, `loadSection` / `unloadSection`, `CtDevices.setLive`,
  alarm stage from the run, restart after `RESTART_DELAY` 2.5 s with everyone down, extraction and result). The live
  guard cap is `SECTOR.maxAlive` (32) for this mode only; `?sectorGuards=N` caps the guards per section.
- Team doors (sector-fixes-r RT, the course's B2 bolt): `SectorDef.bolts` (`S1_BOLTS`..`S3_BOLTS` from the section
  files: door centre `at`, unbolting `side`). The door stays locked (guards treat it as any locked door; no guard route
  uses one, `tests/sectorBolt.test.ts`); a player with the feet past the door plane on `side` within 1.6 m gets
  "Unbolt" (`Interactable.side`); using it unlocks the door for both. A section restart bolts its doors again.
  Pure: `SectorBolts`, `onBoltSide`, `boltItemId` / `boltById`. Test hooks: `__sector.boltInfo()`,
  `__sector.useBolt(sec, k)`, `debug().bolts`.
- Difficulty stars (M7, A11, G189): fixed difficulty levels per op, one star each. A clear on tier N fills
  every star below N too (G331; Michael: "Completing a higher difficulty also considers the lower tiers completed
  also"): `starsOf` derives the fill from the hardest tier cleared, so old saves get it; `done` and the best times stay
  as cleared. `save/sectorRecord.ts`, kv key `sector:ops`
  (per op id: the presets completed and the best time per preset; no profile change, no SAVE_VERSION bump). The
  extraction calls `markCompleted(map.id, difficulty, time)` (solo and co-op host; the co-op client on a won `end`, no
  time). The menu entry opens `SectorOpsScreen` (`ui/screens/missionsScreen.ts`: maps with `sectors` and the `sector`
  mode; `starsText` in DIFFICULTIES order, best times in the context panel), then the briefing. The main menu counter
  shows Saltmarsh Park's stars (`campusOps`); the host's lobby Map row shows each op's. The result line and the
  extraction banner add PERFECT (no kills and no alarm raised all op, restarts included: `SectorRun.alarmsRaised`,
  G146; `sectorResult`, `resultBadge`) before GHOST.
- Revive syringes (M7, A10): co-op only. The host's `ReviveClock.cap` is `syringesFor(difficulty)` (Rookie 3, Normal 2,
  Realistic 1, Perfectionist 1), per op (a restart keeps the count used); the HUD line shows "Syringes n"
  (`sectorInfoHtml`; solo shows none). An operator out (no syringe left, or the window over) calls
  `GameMode.onPlayerOut` and the section restarts; on its respawn a partner still up also comes back to the checkpoint
  (A22). Decided, not built yet (G385): a downed player nobody revives within 30 s dies and waits out of play until the
  team reaches the next section door, where he comes back; the section no longer restarts for him. Everyone down restarts as before. The connector and the extraction count every player, downed too (A20).
  A restart repairs the section's shot-out cameras and clears their meters (`CtDevices.repair`).
- Alarm panels (fix round): tagged by section (`WAREHOUSE_OPS_ALARMS`, `MapLayout.alarms[].section`). On every section
  load and restart `StealthSystems.setLiveAlarms(i)` leaves only that section's panel working (and re-arms one the
  player disabled) and `EnemyManager.resetAlarm()` lets a panel alarm be raised again (once per section load). The
  far door opens silently (`Doors.setOpen`, no door noise for the new section's guards).
- A checkpoint restart is a clean start of the section (sector-restart, M9). `SectorMode.restartSection` runs
  `EnemyManager.resetMemory()` (every guard, body and drone gone; the alarm, last known position and its chase field,
  sighting flags, flanker, squads and the AI clocks back at their match-start state; the section's guards then load
  unaware on their routes) and `GameState.checkpointReset()`: the loadout recorded when the section began
  (`PlayerWeapons.markCheckpoint` in `beginSection`; pure `weapons/loadoutSnapshot.ts`) comes back with every gun
  reloaded from its reserve and the gadgets as they were; grenades in flight and gadgets out in the world go; the
  stealth leftovers go (`StealthSystems.resetForRestart`: doors the player opened are no longer noticed); the
  `checkpointRestart` event fades the alert / caution music to Calm (`Music.calm`). Health is full with the respawn.
  Co-op: the client records its loadout as each section goes live (the `sector` message's `ls`) and runs its own
  `checkpointReset` on the host's restart banner (`SECTOR_RESTART_TITLE`; no wire change, A1). Sector Ops issues the
  campaign kit like Infiltration: the rifle comes suppressed (A2, `loadoutEntries`). Doors and shot-out lamps stay as
  they were (polish).
- Section rating (section-rating): each section is rated once as its connector unloads it (the last at the
  extraction) on four marks (`game/rating/sectionRating.ts`): Undetected (no guard detection, no camera alarm), No kills
  (knock-outs are not kills), No alarms (any alarm stage rise: panel, camera or laser, A10), Bodies hidden (no body
  found; earned with none made). Rewards top up the kit for the next section, given as it begins (a restart keeps them
  and never re-rates): Undetected and Bodies hidden +1 gadget charge each (A9: Bodies hidden waits for an alarm-stage skip), No alarms +1
  syringe (solo +1 medkit), No kills +1 medkit; a synced takedown (two players' knock-outs within 1.5 s, at most 2 paid)
  +1 gadget and +1 syringe. Gadget charges cap at the starting carry, syringes at the preset + 2. The rating card
  (`ui/hud/ratingCard.ts`) shows the marks and only the rewards that land; the results list one line per section.
  Co-op: the `sector` message's `rt` carries it; the client tops up its own gadgets.
- Marlow Yard rated sets (section-rating S6, `game/course/courseMarks.ts`): every set with a guard who can see
  (`BayDef.rated`, A5: A2-A8; A1's passive checker and the drill bays stay unrated) is rated on the same four marks as
  its exit airlock seals (the last set at the finish, no grant), from the rise of its bay's stats since the set began;
  a restart starts the set's rating stats again and never re-rates (the bay's results stats stay cumulative). The grant
  lands at once (the next set is beginning): host gadgets, co-op syringes (the revive cap), medkits as station heals.
  Synced takedowns count in `BayStats.synced`. The best per set goes to `rating:sections` under `ctcourse`. The
  finale keeps its Ghost / Silent / Loud tier; its marks are a results line beside it.

## The training course (`course`: Marlow Yard, the Fallow bunker)
- `game/modes/courseMode.ts` runs the pure `game/course/CourseState` (gates, airlocks, drills, restart) from a map's
  `MapLayout.course`; co-op only (host P1, client P2; `?autostart=courselab&mode=course` single player for tests); radio
  as LANTERN barks. Wire and drill ticks: coop.md. HUD: ui.md.
- Downed (G349: the campaign rule, G126; built): a downed player can be revived within `REVIVE_WINDOW` 30 s, at most
  `REVIVES_PER_MISSION` 2 times (`game/reviveClock.ts`; rated sets can grant more); a player past the window or the cap
  is out, and in the course that restarts the bay (`CoopHost.goOut`). Everyone down restarts the bay at the checkpoint
  airlock (squad, gates, light groups, shot-out lamps). The dev solo
  flag (`?course=solo`, F3) lets one player work both halves (G48: the testing route, no bot). Anti-stuck resets stay
  (G80). Team moves work anywhere with room (G151 replaced G81's marked spots).
- Friendly fire: a host option, on by default (G141, settles G49). As built it is on in Course mode only, with no host
  option yet (`CoopHost.ff`).
- Decided, not built yet (G79): the bunker's drills are rebuilt on the CT moves after the prototype.

## Parked content (`?legacy=1`)
- `flags.legacy` (`?legacy=1`, URL only, never saved) and `core/legacy.ts` (pure, `tests/legacy.test.ts`):
  `PARKED_MODES` = `['mission', 'clear']`, `visibleModes(all, legacy)`, `defaultMode(legacy)` (Infiltration, or Hunter
  with legacy), `campaignUnlocked(legacy)` (true when legacy is off), `showEconomy(legacy)`.
- Legacy off (default): the Play screen offers Infiltration and Free Roam; the co-op lobby Infiltration and Free Roam (a
  new room starts on Infiltration); the Loadout screen shows weapons, attachments, gadget and presets only (no suit,
  appearance, tag, HQ or challenges; no upgrade or camo rows; the top bar says NIGHT SHIFT without level or credits);
  the results screen has no rewards panel (progression is still recorded) and no style bars; the kill feed has no "+XP".
- The campaign opens every weapon and attachment without buying (`profile.ts` `campaignOpens` / `ownsOrOpen`;
  `SaveManager.openLoadout` keeps any known weapon as the loadout). Nothing is written to `unlocks` or credits.

## Parked economy and cosmetics (2.0 phase 8; `?legacy=1` only)
- Arsenal: the CT kit only (G76): `rifle` (Heron Carbine, issued suppressed) and `pistolSd` (Hush 9 SD); the other 14
  guns are deleted (docs/archive/consolidation/deleted-guns.md). The rifle keeps the legacy attachments (red dot, 4x
  scope, suppressor, compensator, grip, laser, magazines); CT's attachment set (sniper, shotgun, launcher) and the knife
  come from the research (G76): decided, not built yet. `withAttachments(def, ids)` (progression/attachments.ts, pure);
  `PlayerWeapons` builds from `LoadoutEntry.attachments`; `penetrate()` casts back from beyond a hit to find the exit
  face. Weapons in detail: combat.md.
- `progression/suit.ts` (pure): `SUIT` tiers, `suitStats`, `suitLook`, `HQ` + `hqStats`, `CHALLENGES` +
  `challengeProgress`, presets (decided, not built yet: G153 replaces G105's presets with kits fixed per mission, so
  players do not choose a loadout). Profile ops
  `buySuit / wearSuit / buyHq / savePreset / applyPreset`; `applySession` pays challenges.
- `cosmetics/catalog.ts`: avatar options, camos, titles, emblems; it registers unlock items at import. Patterns:
  `PatternPlugin` reads per-instance `pattern` and `color2`; `avatarFactory` and `WeaponModel` apply them. Emotes are
  deleted (G24).
- The 2.x maps (Embassy, Mansion, Port, Refinery, Dust Depot) are parked in `world/maps/parked.ts` (not imported, not in
  the bundle); their notes are in the git log.
