# Deleted game modes - log (integrate/consolidate, 2026-10-17)

Michael's decision: Wave (survival), Team Deathmatch (`tdm`), Free-for-all (`ffa`) and all player-versus-player code are deleted. Kept: Hunter (`clear`, parked behind `?legacy=1`), Mission (`mission`, parked), Infiltration, Training (solo), the training course (`course`), Free Roam (`sandbox`). No docs (*.md) were edited; nothing committed.

The old Mission 8 traitor / Confrontation versus content does not exist as code (no hits for traitor / confrontation / versus in `src`, `tests`, `scripts`); docs only.

## Files deleted
- `src/game/modes/waveMode.ts` (WaveMode)
- `src/game/modes/waveLogic.ts` (waveComposition, waveMaxAlive, waveClearBonus, killScore - killScore moved, see below)
- `src/net/pvp.ts` (PvpMode, PVP rules table, TEAM_NAMES, TEAM_COLORS, balanceTeam, canJoinTeam, pickSpawn, V2, playersHostile(score, ...), PvpScore, pvpInfo)
- `src/net/pvpVictim.ts` (PvpVictim, PVP_TAKEDOWNS)
- `tests/pvp.test.ts` (whole file)
- `src/net/pvpTarget.ts` renamed to `src/net/partnerTarget.ts` (class `PvpTarget` -> `PartnerTarget`): course friendly fire (D38) still uses it on the client.

## Files added
- `src/game/modes/score.ts`: `killScore(kind, headshot, tier)` (moved from waveLogic; Mission and Infiltration score at tier 2).

## Modes / ids / settings / flags removed
- `ModeId`: `'wave' | 'tdm' | 'ffa'` removed. `MapDef.modes` union likewise; map `modes` lists cleaned (dustDepot is now `['mission']`; embassy, mansion, port, refinery `['infiltration', 'clear']`; warehouse `['clear', 'sandbox', 'mission', 'infiltration']`).
- `flags.mode` no longer accepts `wave` (`?mode=wave` now falls back to the autostart default, `sandbox`).
- `core/legacy.ts`: `PARKED_MODES` is now `['mission', 'clear']`; `defaultMode(true)` is `'clear'` (Hunter) instead of `'wave'`.
- Play screen: the "Wave Survival" entry. Co-op lobby: "Wave Survival", "Team Deathmatch", "Free-for-all" entries, the "Join <team>" button, team colours / names in the player list, the PvP fairness note, PvP wording in the full-room messages.
- `NetSession`: default `mode` is now `'clear'` (was `'wave'`; a non-legacy host still switches a new room to Infiltration); `setTeam`, `requestTeam`, team balancing on join and on switching into TDM removed.
- `GameState.pvp` field; the PvP branch (no AI, pickups only); `pvpLoadout` (weapons/playerWeapons.ts) and the "no suit / HQ bonuses in PvP" rule; ping / grab-label PvP exceptions.
- `TakedownVictim.pvp`, `TakedownController.grabAllowed`, the PvP takedown filter; `StrikeController`'s `e.pvp` skip.
- `TeamSide.team` (teamMoves.ts) and its 'notMates' team check (same-id 'notMates' stays).
- `RemoteAvatar.markTeam` and its marker mesh; CSS `.hud-mode .pvp-team.t0/.t1`.
- `PlayerTarget.lastHit`, `RemotePlayer.lastHit` (PvP kill credit only), `RemotePlayer.history` (lag-compensated PvP shots; never written outside PvP).
- `CoopHost`: `score` (PvpScore), `spawnFor`, `eliminated`, `showFrag`, `updatePvpHud`, `pvpStep`, `ended`, `infoT`, `pvpVictims` / `pvpVictimList`, `onPvpTakedown`, `PTD_REACH` / `PTD_HEIGHT`, `selfHist`, PvP history recording, PvP respawn / spawn protection. `pvpBoxes` renamed `partnerBoxes` (course friendly fire).
- `CoopClient`: `pvp`, `score`, `deaths`, `hostile`, `pvpVictims` / `pvpVictimList`, the `frag` event handler, PvP result / HUD paths.
- `GameEvents`: `wave`, `waveCleared` (and their audio hooks in `gameAudio.ts`; `sfx.horn` stays, the alarm uses it).
- `SessionStats.waves`, `SessionStats.deaths`; rewards: PvP block and "Waves survived" line; results screen: PvP grid and "Waves survived" row.
- `validate.ts`: `maxHitDamage`'s `upgraded` parameter (PvP base-damage cap); `clampEnd` no longer clamps waves or adds wave bonuses (score cap = kills x the best tier-2 kill score); `coopSessionStats` no longer copies waves. New pure helper `playersHostile(friendlyFire, a, b)` (course friendly fire; was in pvp.ts with a PvP score argument).

## Wire / protocol (PROTOCOL_VERSION 11 -> 12)
- `NetMode` / `NET_MODES`: `'wave' | 'tdm' | 'ffa'` removed (now `sandbox | clear | infiltration | course`).
- `isPvp`, `TEAM_MAX`, `ScoreLine` removed; `MAX_PLAYERS` 8 -> 4 (room cap; `capacity()` is course 2, else 4).
- `PlayerInfo.team` removed.
- Messages removed: `team` (client asks for a TDM side), `ptd` (PvP takedown).
- Event removed: `frag`.
- `snap` fields removed: `score`, `tl`.
- `EndStats` fields removed: `waves`, `winner`.
- Tests asserting 11 now assert 12; the join test refuses v11 and admits v12.

## Save shape
Unchanged; no SAVE_VERSION bump. `profile.stats.bestWave` stays in the schema, readable and sanitized, but nothing writes it now (test asserts it stays 0). Emote id `'wave'` (the hand-wave gesture) is a cosmetic, not the mode: kept.

## Unit tests changed
- `tests/pvp.test.ts` deleted. `tests/net.test.ts`: PvP takedown block removed; friendly-fire test uses the new `playersHostile`; end-stats tests drop waves / winner; lobby / start parse tests use `clear` and assert `wave`, `tdm`, `team`, `ptd` are now rejected.
- `tests/nav.test.ts`: wave composition tests removed (kill score test kept, now from `score.ts`). `tests/archetypes.test.ts`: "later waves bring the archetypes in" removed.
- `tests/progression.test.ts`, `tests/arsenal.test.ts`: `wave` stats -> `mission` (objectives instead of waves). `tests/legacy.test.ts`, `tests/rooms.test.ts`, `tests/teamMoves.test.ts`, `tests/moveState.test.ts`: updated to the new lists / version.

## E2E suites
No suite file deleted (none was only about the removed modes); none removed from `scripts/run-e2e.mjs` REQUIRED / LEGACY / COVERS / KNOWN_FLAKY (only its legacy comment). Content changes:
- `e2e-modes`: the Wave block (wave clear, ragdolls, death -> DEFEAT -> Play again) replaced by a ragdoll check on Mission; enemy types now on `proving&mode=mission` with the squads cleared and stealth off. Lost: the solo "death -> DEFEAT results -> Play again" check (only Wave ended a solo run on one death).
- `e2e-coop`: first match is Hunter (the legacy lobby default); "wave info" -> "Enemies left"; the team-wipe check sets Hunter's last life; the TDM / FFA block deleted (the third page still joins for the door-peek check).
- `e2e-netmove`: the TDM "shot at a hanging client hits the posed head" check deleted (posed hit volumes on partners are still exercised by e2e-course's friendly fire).
- `e2e-course`: the "no PvP score" assertion removed; `pvpBoxes` -> `partnerBoxes`. `e2e-bunker`: comment.
- `e2e-tactics`: `proving&mode=mission`, squads cleared, five alerted grunts spawned (what Wave did). `e2e-levels`, `e2e-offline`: `mode=mission`.
- `e2e-clear` (legacy): Wave HUD check deleted; doorway check on Mission; play-screen default-map assertion without Wave. `e2e-park`: legacy Play list is 5 modes, default Hunter. `e2e-progression` (legacy): plays Hunter, sets the last life before dying.
- Helper scripts: `perf.mjs` non-stealth scenario `wave` -> `mission`; `soak.mjs` default mode `clear`, no wave column.

## Kept on purpose
- Hunter (`clear`), Mission, the economy / progression / cosmetics (Hunter and `?legacy=1` still use them). `sfx.horn` (alarm). Emote `wave`. `profile.stats.bestWave` (save shape).
- Course friendly fire (D38) machinery: `PartnerTarget`, `CoopHost.partnerBoxes`, `onPlayerShot`, `friendly` hooks, `RemotePlayer.shootable`. Course partner shots are judged at the target's current place, as before (the rewind history was only ever recorded in PvP).
- Comments that say "co-op / PvP remote" in pure movement / anim modules (footPlanner, attachGrips, gripStepper, moveState, traversePath, localMoveState) were left: the code is the co-op remote path; wording is for the docs job.
- `HitInfo.takedown` stays (takedowns and the elbow strike set it).
