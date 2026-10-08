# Modes, arsenal, suit, HQ, economy and cosmetics
> Status: Hunter, Wave, Mission, PvP, credits, unlocks, suit, HQ and cosmetics are parked behind ?legacy=1 (bible 6). Infiltration becomes the campaign mission framework in Phase 4.
Purpose: Hunter and Infiltration, the Blacklist-era arsenal / suit / HQ economy and the cosmetics catalogue.
Design authority: docs/design-bible.md (Sections 5.6, 5.8 and 6)

## Modes 2.0: Hunter and Infiltration (phase 7)
- Hunter = `ClearMode` (`id 'clear'`, labelled Hunter; `?mode=hunter`); `GameMode.onAlarm(at)` (from
  `StealthSystems.onAlarm`) returns true when the mode brings its own reinforcements: Hunter adds `hostilesLeft`
  more pending slots (alerted, not holding) at the entry point (`alarmAdded`).
- Play styles: `game/playstyle.ts` `StyleTracker` (`GameState.style`; `GameState.detected` flips record
  `detected`); kills / knock-outs / takedowns / executes from `enemyMgr.onKilled` (`Enemy.ko`), alarms and hidden
  bodies from `StealthSystems`; `SessionStats.style / detections / knockouts`; results bars (`style-bars`).
- Infiltration: `game/missions.ts` (`MISSIONS` from `config/missions.json`, `validateMissions`, `ObjectiveChain`,
  `DOWNLOAD`, `evaluateRules`, `missionRating`), `game/modes/infiltrationMode.ts` (insertion teleport, room squads
  with a fill like Hunter, per-objective interactables with `onUse`: kinds `terminal`, `charge`, `vip`, `intel`,
  `extract`; download progress while within `DOWNLOAD.range`, `noticed()` -> `enemyMgr.hear`; `Vip`
  (`game/vip.ts`) follows by A*; rules fail at once; `finish` sets `stats.missionId / rating / bonuses`).
  `GameOptions.missionId / insertion`; `GameMode.onInteract`. Save v5 `missions` (`MissionRecord`, best run;
  `applySession`). Play screen: Infiltration shows the mission board. `window.__missions` for tests.
- Embassy (`world/maps/embassy.ts`): `slabWithHoles` (roof with vent holes, overhead), `roofDuct`; rooms with
  squads (sniper on the tower at 3.2 m). Gap lists for `wallX / wallZ` must be sorted (an unsorted list bridges a
  doorway).
- 2.1 maps (multi-storey; `maps/storey.ts`: `wallXAt / wallZAt` walls on any storey, `windowX / windowZ` vaultable
  windows, `glassX / glassZ` fixed panes where nothing stands outside): Mansion (night, urban; a two-storey house -
  grand staircase through a stairwell in the upper slab, balcony + ladder, flat roof with a duct into the vault
  office, rooms on both storeys via `minY / maxY`), Port (night, maritime; container stacks with ladders, a
  customs shed with a mezzanine office, a moored ship: gangway, deck, bridge + lookout, bosun's store, a pier hut),
  Refinery (dusk, desert; tank tops joined by catwalks, a pipe-rack walkway, a unit platform, a two-storey control
  building with an outside stair, shelters / huts). One Infiltration mission each (`mansion-vault`,
  `port-manifest`, `refinery-flare`). Landings must overlap a stair top (else the nav sees the ramp's end cap: a
  seam); squads on raised floors set `SquadSlot.y`.
- 2.3 detail pass: every map gained set dressing (mostly visual-only `box(..., false)` / overhead pieces; solid pieces
  only where they are meant as cover) and darker side lanes (`ambientZone`) with extra routes (ladders, breakable
  windows, doors). Dust Depot dressing uses its own random stream so the procedural layout per seed is unchanged.
  `e2e-anchors` tests ladders in creation order: a ladder-bottom test right after a 2.5-3 m ladder-top one can start
  in a landing roll, so new ladders go after the existing ones.

## Arsenal, suit, HQ, economy (2.0 phase 8)
- 16 weapons (`WEAPON_IDS`; the 1.x five keep ids). Optional `WeaponDef.noise` (x the stat), `nonLethal` (crossbow;
  `HitInfo.nonLethal` -> `Enemy.knockOut`). `withAttachments(def, ids)` (progression/attachments.ts, pure) returns
  the def with attachment parts and the moved muzzle; `LoadoutEntry.attachments`; `PlayerWeapons` builds from it
  (slots carry `nonLethal`, `pen` = `PENETRATION[class]`, `scoped`). `penetrate()` casts back from beyond the hit
  to find the exit face. Back carry: a centre gun stands off `CENTRE_CLEAR` minus its top-to-bore depth.
- `progression/suit.ts` (pure): `SUIT` tiers, `suitStats` (damage, noise, hands, sonar, gadgets), `suitLook`, `HQ`
  + `hqStats` (radar, sonarRange, extraMarks, restock, reviveSpeed), `canBuySuit / canBuyHq`, `CHALLENGES` +
  `challengeProgress`, `styleLines` (`STYLE_PAY`), presets. Profile ops `buySuit / wearSuit / buyHq / savePreset /
  applyPreset`; `applySession` pays challenges (`SessionStats.takedownsByKind / executes / gadgetKos / alarms`).
- `GameOptions.suit / hq / gadget` (single player from the save in `main.ts`; the look via `suitLook`); GameState
  applies `target.armorMul`, `weapons.handsMul`, `takedown.handsMul`, gadget counts, `marks.max`, footstep noise
  x `suit.noise`, `sonarMul`, radar blips, restock on respawn. `ui/screens/loadoutScreen.ts` (Gear / HQ tabs;
  root page presets); Play screen Loadout row. Save v6; v7 (2.3) issues the 9mm SD (`STARTER_UNLOCKS`) as the
  default primary with the 552 secondary (a loadout / preset still on 552 + P45 moves to it). `?loadout=a,b` for
  autostart (tests).

## Cosmetics
- `cosmetics/catalog.ts` is the single list of avatar options, camos, emotes, titles, emblems; it registers
  unlock items at import (imported first in `main.ts`, before `autoGrant`).
- Patterns: `PatternPlugin` (StandardMaterial plugin) reads per-instance `pattern` (id, scale) and
  `color2`; ids in `cosmetics/patterns.ts`, GLSL there too. `PartLibrary.instance(..., pattern)` sets them.
- `avatarFactory` puts the look's pattern on torso/legs slots; `WeaponModel` puts the camo pattern on
  `body` parts. Emotes are pose overrides (`cosmetics/emotes.ts`) run via `CharacterRig.emote`.
