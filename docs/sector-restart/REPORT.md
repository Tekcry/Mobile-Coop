# Sector Restart - implementer report (2026-10-19)

M9: "Silenced gun seems to alert guards if failing attempt on sector ops and trying from checkpoint. Alert music should
also fade out as its starting from checkpoint. It should run a fresh start with reloaded gun etc."

Built with light checks only (`tsc`, ESLint on changed files, Vitest on 9 files: 147 passed). `npm run check`, build and
e2e run on the laptop runner.

## The cause (found by reading, master ce1da1a3)
No guard memory survived the solo restart that could turn a suppressed shot into an alert (`restartSection` despawned
every guard; a heard noise alone stays below a full meter, `ai/perception.ts:196`). What went wrong:
1. **The Sector Ops rifle had no suppressor** (the "silenced gun" that alerts). `src/progression/profile.ts:239`
   (`const campaign = mode === 'infiltration' && campaignOpen;`) gave Sector Ops the save's loadout as is, without the
   issued suppressor (A62, `CAMPAIGN_ISSUED`, `config/arsenal.ts:71`), while the Kit screen and the lobby showed it
   suppressed. Noise 1 > `SUPPRESSED_NOISE` 0.6 (`game/gameState.ts:230`): the loud path (`gameState.ts:485`,
   `Enemy.hearGunfire` `ai/enemy.ts:550`, `ai/alertState.ts:116`) put every guard within 28 m into combat. The default
   save has the pistol in hand, so the first attempt could be quiet and the retry loud once the rifle came out.
2. **The restart never reset the music:** the director (`audio/score/director.ts:32-34`) held Alert 10 s, Evasion 12 s,
   Cautious 8 s into the retry.
3. **Leftovers drew the new guards:** the respawn (`gameState.ts:1550-1572`) left noisemakers pulsing
   (`gadgetSystem.ts:442`), gas, mines, sticky cams, grenades in flight, and the noticed-door set
   (`stealthSystems.ts:52`).
4. **No fresh kit:** ammo and gadget counts stayed as at the down.
5. Harmless manager leftovers (flow field to the old last-known position, clocks, `spotted` flags), now cleared too.

## Built
- `EnemyManager.resetMemory()`: the one call the restart uses (despawnAll, resetAlarm, lkp, flow field, clocks, radio
  period, players' `spotted`). Tallies kept.
- `StealthSystems.resetForRestart()`: door memory, a carried body.
- `src/weapons/loadoutSnapshot.ts` (pure) and `PlayerWeapons.markCheckpoint()` / `restoreCheckpoint()`; recorded at the
  run start and at each far-door unlock; a restore cuts a running reload, fills every magazine from its own reserve,
  restores gadget counts and the selection. Health full through the existing respawn.
- `GameState.checkpointReset()`: the restore, `Grenades.clear()`, `GadgetSystem.clearWorld()`, the stealth reset,
  suppression and the noise meter rested; emits `checkpointRestart`.
- Music: `GameMusic.calm()` / `Music.calm()` fade the mission voices over 2.5 s and reset the director to Calm, called on
  `checkpointRestart`.
- A2: Sector Ops issues the campaign kit (the rifle suppressed).
- Co-op (A1): the client runs its own `checkpointReset` on the host's restart banner (`SECTOR_RESTART_TITLE`) and
  records its loadout when the live section moves on; no wire change (protocol 24).
- Decisions A1-A4 with undo: `BRIEF.md`.

## Files
New: `src/weapons/loadoutSnapshot.ts`, `tests/sectorRestart.test.ts`. Changed: `src/weapons/playerWeapons.ts`,
`src/weapons/grenades.ts`, `src/ai/enemyManager.ts`, `src/game/stealthSystems.ts`, `src/game/gameState.ts`,
`src/game/gameEvents.ts`, `src/game/modes/sectorMode.ts`, `src/game/sectors.ts`, `src/net/coopClient.ts`,
`src/progression/profile.ts`, `src/audio/score/game/gameMusic.ts`, `src/audio/music/music.ts`, `src/audio/gameAudio.ts`,
`scripts/e2e-sectorops.mjs`, CHANGELOG, TESTING.md, `docs/systems/modes-and-progression.md`, `docs/systems/audio.md`.

## Tests
- `tests/sectorRestart.test.ts` (7): the snapshot (no-op before one; restore repeatable; top-up from reserve only;
  infinite ammo), `EnemyManager.resetMemory`, `GameMusic.calm`, the Sector Ops kit suppressed (legacy unchanged), the
  run's restart.
- e2e-sectorops, a new scenario (`?sectorGuards=4`, cameras held, AI on): break the section (guards alerted, stage 1,
  music Alert, ammo low, gadgets 0, downed); after the restart 4 guards unaware, no lkp / alarm / bodies, stage 0;
  after the respawn health full, magazines full, gun suppressed, gadgets back, music calm; then one shot from a nav cell
  >= 18 m from every guard and route point and out of sight: no guard alerted, stage unchanged, music not Alert.

## Open items
- Doors and shot-out lamps stay as they were at a restart (polish).
- The co-op client cue is the restart banner (A1); a restart counter in the `sector` message would be sturdier (a wire
  change). No two-page e2e for the client restore.
- First-run risks: the shot-spot search finds no cell (lower the 18 m margin); `weapons.shoot()` with the gun holstered;
  the music check forces the director (headless audio).

## Polish list
- The 2.5 s restart fade; a bar-aligned or shorter fade may sound better.
- An optional "kit restored" feed line at the respawn.

## Fix round (checker CHECK.md, 2026-10-19)
- 1 (blocking): `PlayerWeapons.restoreCheckpoint` ends a throw still in hand at the down (grenadeT -1, grenadeThrown
  false, grenadeCd 0, player.grenadeT -1, aimLockTimer 0): nothing leaves the hand after the respawn and the restored
  count holds the gadget. Vitest: tests/sectorRestart.test.ts "PlayerWeapons.restoreCheckpoint (check fix 1)".
- 2, 3: the e2e shot spot discriminates and avoids sight flakes. Reaches from `GameState.NOISE` (new static table:
  shot 28, suppressed 0.6): every guard's whole path (route segments or post, plus its current position) >= 18 m
  (16.8 + 1.2); the nearest guard's whole path <= 26 m (28 - 2); no line of sight from any path point (sampled every
  1 m, eye 1.6 m) to the spot. Control in the same scenario: the same shot with the gun's noise forced to 1 alerts
  the nearest guard (and sets the last known position).
- Light checks: tsc clean; ESLint clean on the changed files; vitest sectorRestart 8 passed; node --check passes.
- Risk: if no cell fits the band, the suite says so; widen the band or allow upper storeys.

## Open items (added)
- 4: in a restart during a running connector cycle, the client's kit snapshot can differ from the host's (the client
  marks at CONN_LOAD via `ls`, the host at the far-door unlock). Needs every player down inside a sealed connector. A
  restart counter in the `sector` message would settle it (wire change, PROTOCOL_VERSION 25).
- 5: a client's frag / noisemaker sent in the latency window around the host's restart can still land on the fresh
  guards (the host could drop client blast / gadget messages for a short window after a restart).
- 6 (pre-existing on master, not this job): the co-op client never hears alert music (`gameAudio.ts:115` reads
  `awareness(g.enemyMgr?.enemies)` and a client has no EnemyManager). Backlog line.
