# Modes, the course and the campaign kit
Owner: the orchestrator. Status: current.
Purpose: the game modes as built, the training course, and the arsenal and gear (no XP, credits, unlocks, upgrades, suit,
HQ or cosmetics: clean-up I removed them).
Design authority: docs/DECISIONS.md (G2, G7, G8, G111, G116, G184, G290, G349, G353, G370, G371, G384, G385), then
docs/design-bible.md (Sections 5.8 and 6).

The decided modes (current rules: docs/DECISIONS.md, the newest entry wins):
- Campaign: exactly 2 players, cannot be completed solo, no bot (G2, G253); every section forces a co-op traversal move
  with no solo bypass (G292, G293). Campaign Mission 1 is Tallow Wharf, the new small campaign map, with the first
  prototypes Three Grey Coats and Two-Key Ledger (G293, G340, G402; the mission-framework job); Kestrel is
  paused (G53). Decided, not built yet: the campaign is entered from the co-op lobby, with Marlow Yard as its training
  prologue before Mission 1 (G371); campaign sections grant no rewards, optional objectives only raise the rating
  (G384); Mission 1 has no civilians (G373). The campaign runs on the mission framework (`game/mission/`).
- Marlow Yard (`ctcourse`, Course mode): the 2-player co-op training course; guided and linear, it keeps its guidance
  marks and objective list (G292). Downed: the campaign rule (G349, G126). No strict rule, fail or send-back: every
  failure is a retry (G370).
- Sector Ops (`campusOps` Saltmarsh Park, five sections S1-S5; `warehouseOps` is the old map, frozen, G390): 1 to 4
  players, live when coop4 ships (G381), solo always possible (G280, G308).
- Campaign and Sector Ops: strict rules and section restart are owned by bible 5.8 (G290); no maps, markers or
  waypoints, and objectives that name what and where, by bible 5.10 (G336, G339, G343, G351). Marlow Yard is the
  guided exception (G292). Killing a civilian or a protected character restarts the section (G353, replaces G145's
  mission fail): decided, not built yet (no civilian or protected character exists in code).
Hunter, Mission, Infiltration, Free Roam and the legacy switch were removed in clean-up stage H (2026-11-02). Wave, team
deathmatch, free-for-all, every player-versus-player mode and the old solo Training mode were deleted earlier (G8, G12,
G116; deletion logs in docs/archive/consolidation/).

## Modes as built (`ModeId`)
| Id | Name | Where | Status |
| --- | --- | --- | --- |
| `sandbox` | (no menu) | `?autostart=<map>&mode=sandbox` and the Kestrel editor's walk test | Live; no guards, infinite ammo, the practice loadout. Not on the wire (`NetMode` has no `sandbox`) |
| `test` | Test Chamber | Main menu row (solo), co-op lobby Mode row | Live; `TestMode`: guards by test, revives, practice (nothing saved) |
| `course` | Training course | Co-op only (two players) | Live on Marlow Yard (`ctcourse`, the co-op training course, G292; `?autostart=ctcourse&mode=course`); also on `courselab` (an older course map) |
| `sector` | Sector Ops | Co-op lobby (the campaign's missions) | Live on Tallow Wharf (`tallowWharf`, `?autostart=tallowWharf&mode=sector&mission=<id>`); see below |

- The campaign needs two players (G2, G111); the only solo starts left are the Test Chamber row and the dev / test URLs.
- `?autostart=<mapId>&mode=<mode>` starts any mode (tests, dev). An unknown or removed mode id (`hunter`, `clear`,
  `mission`, `infiltration`) falls back to the autostart default (`sandbox`); an unknown map id to Marlow Yard (`getMap`).
- Stealth rating hook: `game/playstyle.ts` `StealthRating` (`GameState.style`; counters alarms / kills / knock-outs /
  detections, no points). `SessionStats.detections / knockouts`. Scoring: `game/modes/score.ts` `killScore`.
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
  `?sectorStart=N` (campus-greybox A28, `game/sectorStart.ts`) starts every run on the page at section N as its
  connectors leave it: a practice run (results line "PRACTICE from section N"; no star, no best rating, no progression);
  in co-op the host's link wins and the host puts the client at its checkpoint (`firstPlace`, the `restore` event).
- No exit beacon (G290, sector-marks): a connector or the extraction is a zone only; its `extract` item draws nothing
  in Sector Ops (`drawsExitBeacon`, `game/interactables.ts`; the co-op client's mirror too). Each objective line names
  the room it stands in, within 50 characters (Saltmarsh Park only; the map and its test were removed in clean-up F).
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
  time). (The Sector Ops menu entry and its screen, `SectorOpsScreen`, went in clean-up F and H; the host's lobby Map row
  showed each op's stars.) The result line and the
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
  campaign kit: the rifle comes suppressed (A2, `loadoutEntries`). Doors and shot-out lamps stay as
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

## The training course (`course`: Marlow Yard)
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

## The campaign kit
- Nothing is bought or unlocked: every weapon and attachment is open, and the save keeps only the gear (the loadout, each
  weapon's attachments, the three presets whose gadget a match starts with; saves.md). The main menu's Loadout row is the
  read-only Kit screen. There is no XP, level, credits, upgrade, suit, HQ, challenge, badge or reward panel anywhere, and
  the kill feed has no "+XP" (clean-up I; the per-mission best results of the old Infiltration went too). Per-mission
  ratings, campaign / course / sector records stay (saves.md). `?legacy=1` and `core/legacy.ts` are gone (clean-up H).

## Arsenal and gear
- Arsenal: the CT kit only (G76): `rifle` (Heron Carbine, issued suppressed) and `pistolSd` (Hush 9 SD); the other 14
  guns are deleted (docs/archive/consolidation/deleted-guns.md). The rifle keeps the legacy attachments (red dot, 4x
  scope, suppressor, compensator, grip, laser, magazines); CT's attachment set (sniper, shotgun, launcher) and the knife
  come from the research (G76): decided, not built yet. `withAttachments(def, ids)` (weapons/attachments.ts, pure);
  `PlayerWeapons` builds from `LoadoutEntry.attachments`; `penetrate()` casts back from beyond a hit to find the exit
  face. Weapons in detail: combat.md.
- `weapons/loadout.ts` (pure): `loadoutEntries(save, mode, campaignOpen)` and `lobbyLoadout` turn the save's loadout and
  attachments into the match's weapons (the campaign maps them onto the arsenal, `config/arsenal.ts`). The saved presets
  (`LoadoutPreset`, `PRESETS`, `save/schema.ts`: Silent / Flash / Loud) are read only for the gadget a match starts with
  (`main.ts` startGame, the Kit screen). Decided, not built yet: kits fixed per mission (G153), then gear chosen before each
  mission (the vision). Nothing changes damage, noise, hands or gadget carry any more: the suit, HQ and weapon upgrades
  are gone.
- Looks: every player is Wren in `defaultLook()` (`player/avatarLook.ts`, the part set `CharacterRig` builds from; the
  operator suit, headset, charcoal); the main menu shows the same Wren holding the issued rifle in the factory colours
  (`ui/screens/menuOperator.ts`). Nothing is chosen or saved, and the wire carries no look. A guard kind reads its own
  look from `config/enemies.json` (`sanitizeLook`). A player's ping / lobby colour is the fixed `PLAYER_COLOUR`
  (`net/protocol.ts`); per-operator colours are future work. `PatternPlugin` (`world/patternPlugin.ts`) stays as render
  plumbing (the per-instance `pattern` surface id and the thermal / electro vision glow `pattern.w`, `color2`); only the
  solid pattern is used now. Emotes are deleted (G24).
- The 2.x maps (Embassy, Mansion, Port, Refinery, Dust Depot), the Warehouse and Proving Grounds were deleted in clean-up
  stage H; their notes are in the git log.
