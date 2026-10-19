# Sector Restart - checker report (2026-10-19)

Fresh checker, commit 92ccfec6 (`git diff origin/master...HEAD`). Light checks only: `npx tsc --noEmit` clean; ESLint on
every changed file clean; `npx vitest run tests/sectorRestart.test.ts` 7/7. The suites (check, smoke, e2e-sectorops,
e2e-coop, e2e-netmove, e2e-combat, e2e-ctcourse, e2e-score) run on the remote runner and are not judged here.

## Verdict: FAIL - 1 blocking item (a one-line-sized fix), 5 polish items

## What holds
1. **Cause (A2).** Confirmed by reading master: `loadoutEntries` gave Sector Ops the save's loadout as is (no
   `CAMPAIGN_ISSUED` suppressor), so the rifle was noise 1 > `SUPPRESSED_NOISE` 0.6 and took the loud path
   (`gameState.ts:485` `enemyMgr.noise` -> `hearGunfire` -> combat within 28 m). Now `mode === 'sector'` issues the
   campaign kit: rifle suppressed, pistolSd integral (0.35). Solo, host and client all build their kit through
   `startGame` -> `loadoutEntries(sv, 'sector', ...)` (co-op passes no `loadout`, `coopUi.ts:91`); the client's
   `PF.quiet` (`netShared.ts:15`) follows its own stats, so the host hears a client's shot as suspicion only. Other
   modes: sandbox, course (Marlow Yard) and `?legacy=1` are unchanged (the condition is mode-specific and still gated by
   `campaignOpen`). The match ids now match the co-op lobby ids (`main.ts:208` already sent the campaign ids), which
   also removes a host weapon-check mismatch.
2. **Guards.** `restartSection` -> `unloadSection` (despawn, pending cleared) -> `EnemyManager.resetMemory` (lkp, flow
   field, clocks, alarm runner, squads, `spotted` on host and remote refs) -> `checkpointReset` -> `loadSection` (fresh
   guards, unaware, alarm panels re-armed). Noise is applied immediately (`hear` / `noise`, no queue), so nothing is
   in flight in the AI. Grenades in flight (player and enemy) and world gadgets (noisemakers incl. ones the host made
   for a client, gas, mines, sticky cams) are cleared; door memory cleared. `resetMemory` / `checkpointReset` are only
   called from Sector Ops (and the client's Sector Ops banner), so no other mode is affected.
3. **Music.** `checkpointRestart` is emitted only by `checkpointReset`; `GameMusic.calm` fades every mission voice and
   resets the director to Calm, then the director climbs again (unit test). No effect outside a mission.
4. **Loadout.** Snapshot at the run start (`start` -> `beginSection`, after the gadget preset is applied) and at each
   far-door unlock; restore puts back each gun's mag and reserve then tops the mag up from its own reserve (no free
   ammo), restores gadget counts and selection, cuts a running reload (the pending reload would otherwise resume after
   the respawn since `fixedUpdate` returns early while dead). Attachments are in `stats`, set once at construction, so
   the suppressor stays. Infinite ammo: full mag, reserve untouched. Slots never change in a match (no drop / pick-up).
5. **A1.** The host's banner wrapper forwards every banner but DOWN / ELIMINATED; `SECTOR_RESTART_TITLE` is used by
   exactly one banner (`restartSection`), so the client runs `checkpointReset` once per restart; events go once each
   in `ev` messages. No wire change; protocol stays 24.
6. **Rules.** No static `src/net` import from single player; no per-tick allocation added (the `onSector` check is two
   compares; the new methods run once per restart / section).

## Items

1. **BLOCKING - a throw in hand at the down resumes after the restart.** `src/weapons/playerWeapons.ts:410-418`
   (`restoreCheckpoint`). `useGadget` takes the gadget and starts `grenadeT`; the release comes 0.82 s later
   (`GRENADE_TIME 1.2 x GRENADE_RELEASE 0.68`). `fixedUpdate` returns at `if (!this.player.alive) return;` (line 441)
   before the throw block (line 583), and nothing resets `grenadeT` on death, respawn or restore (only
   `player.ts:100` / `playerWeapons.ts:109` initialise it). Scenario: the player is shot down mid-throw (a frag at
   alerted guards; the last player down), the section restarts, the player respawns at the checkpoint and the throw
   finishes on its own: a frag / flashbang / gas / noisemaker leaves the hand at the checkpoint, and the restored
   count already includes it (a free gadget). A frag's blast is a loud noise: the fresh guards go to combat, which is
   M9's symptom. The same happens to a co-op host still up on an OPERATOR OUT restart (the throw releases in the
   reloaded section before the teleport) and to a client. Done looks like: `restoreCheckpoint` also ends a throw
   (`grenadeT = -1; grenadeThrown = false;` plus `this.player.grenadeT = -1` so the pose clears), and the unit or e2e
   check covers it (start a throw, kill, restart: no grenade in `g.grenades.live` / no flier after the respawn, the
   count back at the snapshot).

2. **POLISH - the e2e shot does not discriminate.** `scripts/e2e-sectorops.mjs:340-388`. The spot is the first nav cell
   with every guard >= 18 m away; a suppressed shot is heard to 16.8 m (`SHOT_NOISE 28 x 0.6`), so no guard hears it
   at all, and a loud shot (28 m) would also alert nobody if the first such cell is > 28 m from every guard. The
   "no guard alerted" assert therefore cannot catch a regression where a heard suppressed shot alerts after a restart;
   the A2 cause is carried by the `noise <= 0.6` asserts on every slot and the gun in hand (those are real). Done
   looks like: pick a cell whose nearest guard is 18-26 m (inside the loud radius, outside the suppressed one) and
   assert it, so a loud gun would fail the test; optionally a second shot 10-14 m out of sight asserting no guard
   reaches `alert` (suspicion allowed).

3. **POLISH - possible flake in the same scenario.** Same lines. Only route points are kept 18 m away, not the route
   segments, and the guards walk for 4.5 s after the teleport; a guard passing in sight could raise awareness and fail
   "no guard is alerted" for a reason that is not the shot. If the runner shows it, hold the guards' patrol (or check
   segments) for this read.

4. **POLISH - client snapshot timing vs A3 in a mid-cycle restart.** `src/net/coopClient.ts:531-536`. The client marks
   when `ls` rises (the connector's CONN_LOAD), the host at the far-door unlock. For a restart while a cycle runs: if
   CONN_LOAD had already fired the client restores its connector-time kit while the host restores the previous
   section's start kit (A3); if it had not, the `sector` message with the new `ls` can arrive before the banner `ev`
   and the client re-marks its current (emptied) kit just before restoring it. Needs every player down inside a sealed
   connector, so very rare; the restart counter in `sector` (A1's sturdier option) would settle it.

5. **POLISH - a client's frag or noisemaker in flight can land after the host's restart.** The client clears its own
   grenades only when the banner arrives; a `blast` / `gadget` it sends in that latency window (an OPERATOR OUT restart
   with the client still up) is applied by the host to the fresh guards. Rare; the host could drop client
   `blast` / `gadget` messages for a short window after a restart.

6. **POLISH (pre-existing, not this job) - the co-op client never hears alert music.** `gameAudio.ts:115` reads
   `awareness(g.enemyMgr?.enemies)` and a client has no `EnemyManager` (`gameState.ts:522`), so the client's score
   stays Calm all match; the client's `calm()` at a restart is therefore a no-op. Worth a backlog line.

Also noted, harmless: `resetForRestart`'s carry release never runs (a down drops the body, `stealthSystems.ts:371`,
and `despawnAll` nulls `carry` first); `resetMemory`'s `resetAlarm` repeats `loadSection`'s.
