# Modes, the course, parked modes and the parked economy
Purpose: the game modes as built, the Fallow training course, what `?legacy=1` parks, and the parked arsenal / suit /
HQ economy and cosmetics.
Design authority: docs/DECISIONS.md (G2, G7, G8, G78, G111, G116), then docs/design-bible.md (Sections 5.8 and 6).

The decided game is a 2-player co-op campaign that cannot be completed solo (G2), with the Fallow bunker as the co-op
tutorial (G78). Hunter is the one non-CT mode kept, parked (G7). Wave, team deathmatch, free-for-all, every
player-versus-player mode and the old solo Training mode are deleted (G8, G12, G116; deletion logs in
docs/consolidation/). The campaign mission framework is not built yet: today's missions run in Infiltration.

## Modes as built (`ModeId`)
| Id | Name | Where | Status |
| --- | --- | --- | --- |
| `infiltration` | Infiltration | Play screen (default), co-op lobby | Live; the campaign's mission runner until the mission framework job ("Campaign" is the player-facing name, kestrel 2026-10-11) |
| `sandbox` | Free Roam | Play screen, co-op lobby | Live; no guards (Proving Grounds adds training dummies) |
| `course` | Training course | Co-op only (two players) | Live on `courselab` and the Fallow bunker; reached by `?autostart=bunker&mode=course` until a listed map offers it (the lobby shows it only then) |
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
  (`game/vip.ts`) follows by A*; mission rules fail at once; `finish` sets `stats.missionId / rating / bonuses`).
  `GameOptions.missionId / insertion`; `GameMode.onInteract`. The four Warehouse missions are listed; six missions on
  the parked 2.x maps stay in the data, unlisted. `window.__missions` for tests.
- Stealth rating hook: `game/playstyle.ts` `StealthRating` (`GameState.style`; counters alarms / kills / knock-outs /
  detections, no points). `SessionStats.detections / knockouts`. Scoring: `game/modes/score.ts` `killScore`.
- Hunter (`ClearMode`, `?mode=hunter`): `GameMode.onAlarm(at)` returns true when the mode brings its own
  reinforcements: Hunter adds `hostilesLeft` more pending slots (alerted) at the entry point. The benchmark flight runs
  in a Hunter match on the Warehouse (graphics-quality.md).
- Difficulty: CT's fixed levels only (G106): Rookie, Normal, Realistic, Perfectionist (`DifficultyPreset`,
  `ai/archetypes.ts`); no sliders, no alarm-tolerance setting. In co-op the host's level runs on both pages.

## Sector Ops (`sector`, feature/sector-ops)
- Main menu entry, solo or co-op (`?autostart=warehouseOps&mode=sector`). Map `warehouseOps` (`world/maps/warehouseOps.ts`:
  `buildWarehouse(b, opts)` with the openings between sections walled, the connector rooms and the M8 pieces; the plain
  Warehouse calls it with no options and is unchanged). Data in `world/maps/warehouseSectors.ts` (sections, guards with
  their `takedownSpot`, routes, reinforcement points, `perStage`, devices tagged `section`).
- Pure: `game/sectors.ts` (`SectorRun`, `ConnectorMachine`: locked, open, cycling, sealed; `restartSection`),
  `game/sectorCheck.ts` (`SightWorld`: eye-height sight lines through the level's pieces, the M8 takedown check;
  tests only). Mode: `game/modes/sectorMode.ts` (doors by position, `loadSection` / `unloadSection`, `CtDevices.setLive`,
  alarm stage from the run, restart after `RESTART_DELAY` 2.5 s with everyone down, extraction and result). The live
  guard cap is `SECTOR.maxAlive` (32) for this mode only; `?sectorGuards=N` caps the guards per section.
- Difficulty stars (M7, A11): `save/sectorRecord.ts`, kv key `sector:ops` (per op id: the presets completed and the best
  time per preset; no profile change, no SAVE_VERSION bump). The extraction calls `markCompleted(map.id, difficulty,
  time)` (solo and co-op host; the co-op client on a won `end`, no time). The menu entry opens `SectorOpsScreen`
  (`ui/screens/missionsScreen.ts`: maps with `sectors` and the `sector` mode; `starsText` in DIFFICULTIES order, best
  times in the context panel), then the briefing. The main menu counter and the host's lobby Map row show the stars.
- Revive syringes (M7, A10): co-op only. The host's `ReviveClock.cap` is `syringesFor(difficulty)` (Rookie 3, Normal 2,
  Realistic 1, Perfectionist 1), per op (a restart keeps the count used); the HUD line shows "Syringes n"
  (`sectorInfoHtml`; solo shows none). An operator out (no syringe left, or the window over) calls
  `GameMode.onPlayerOut` and the section restarts; on its respawn a partner still up also comes back to the checkpoint
  (A22). Everyone down restarts as before. The connector and the extraction count every player, downed too (A20).
  A restart repairs the section's shot-out cameras (`CtDevices.repair`).

## The Fallow training course (`course`)
- `game/modes/courseMode.ts` runs the pure `game/course/CourseState` (gates, airlocks, drills, restart) from a map's
  `MapLayout.course`; co-op only (host P1, client P2; `?autostart=courselab&mode=course` single player for tests); radio
  as LANTERN barks. Wire and drill ticks: coop.md. HUD: ui.md.
- Everyone down restarts the bay at the checkpoint airlock (squad, gates, light groups, shot-out lamps). The dev solo
  flag (`?course=solo`, F3) lets one player work both halves (G48: the testing route, no bot). Anti-stuck resets stay
  (G80); boosts only at marked spots (G81).
- Friendly fire is on in the course today (training D38); G49 replaces that decision with the CT co-op research's
  answer, not made yet.
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
  guns are deleted (docs/consolidation/deleted-guns.md). The rifle keeps the legacy attachments (red dot, 4x scope,
  suppressor, compensator, grip, laser, magazines); CT's attachment set (sniper, shotgun, launcher) and the knife come
  from the research (G76): decided, not built yet. `withAttachments(def, ids)` (progression/attachments.ts, pure);
  `PlayerWeapons` builds from `LoadoutEntry.attachments`; `penetrate()` casts back from beyond a hit to find the exit
  face. Weapons in detail: combat.md.
- `progression/suit.ts` (pure): `SUIT` tiers, `suitStats`, `suitLook`, `HQ` + `hqStats`, `CHALLENGES` +
  `challengeProgress`, presets (Stealth / Assault / Recommended is the decided naming, G105; not built yet). Profile ops
  `buySuit / wearSuit / buyHq / savePreset / applyPreset`; `applySession` pays challenges.
- `cosmetics/catalog.ts`: avatar options, camos, titles, emblems; it registers unlock items at import. Patterns:
  `PatternPlugin` reads per-instance `pattern` and `color2`; `avatarFactory` and `WeaponModel` apply them. Emotes are
  deleted (G24).
- The 2.x maps (Embassy, Mansion, Port, Refinery, Dust Depot) are parked in `world/maps/parked.ts` (not imported, not in
  the bundle); their notes are in the git log.
