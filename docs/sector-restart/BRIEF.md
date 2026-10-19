# Sector Ops checkpoint restart - brief

Set by the orchestrator, 2026-10-19. Branch `feature/sector-restart` (off master 4.7.2, ce1da1a3), folder
`C:/NightShift/Mobile-Coop-sector-restart`. Job lead: "Night Shift | Sector Ops Build". One PR to master (a patch).
Priority: spare capacity, after CT Core and Menu Notes on the desktop heavy.lock and the laptop runner (G191).
Prototype effort only (CLAUDE.md "Current goal").

## Michael's words
- **M9** (2026-10-19, playing 4.7.0, via the orchestrator): "Silenced gun seems to alert guards if failing attempt on
  sector ops and trying from checkpoint. Alert music should also fade out as its starting from checkpoint. It should run
  a fresh start with reloaded gun etc."

## Goal: a checkpoint restart is a clean start of the section
1. **Guards:** back to their initial unalerted state: alert stages, the alarm, heard-noise memory, suspicion, search
   targets and last-known positions cleared; no noise event carried over from before the restart. Find why a silenced
   shot alerts after a restart (stale noise, a leftover alert stage or squad memory, or a weapon state such as the
   suppressor not re-applied after the respawn) and fix the cause.
2. **Music:** the alert / combat music fades out at the restart; the section starts in calm music.
3. **Player:** respawns with the loadout as it was at the checkpoint: magazines full, gun reloaded, suppressor on,
   gadgets restored, health full. Co-op: both players.

## Tests
- Vitest on the restart reset (whatever is pure: the run's reset, the loadout snapshot and restore, the guard and
  manager reset if testable without Babylon).
- e2e-sectorops: fail a section, restart, fire a silenced shot away from the guards: the guards stay unalerted; the
  gun is full and suppressed, health full, the music state calm.
- Test tiers (CLAUDE.md): `npm run check` + e2e-sectorops (and e2e-coop / e2e-netmove if `src/net` changes), then the
  full `npm run e2e` on the PR head. While the desktop lock is held by a higher priority job, the suites go to the
  laptop runner ("Night Shift | Character Build": branch, commit, suites).

## Assumed decisions (job lead; each with how to undo)
- **A1 (co-op client restart cue, no wire change):** the client runs its side of the clean start (its own loadout
  back, gadgets and grenades cleared, music calmed: `GameState.checkpointReset`) when the host's restart banner
  arrives (`banner` event with `SECTOR_RESTART_TITLE`, `game/sectors.ts`), and records its loadout when the `sector`
  message's live section `ls` moves on (and at the match start). Ammo and gadgets are the client's own, so the host
  cannot restore them; health is the host's (full with the existing `revive` event). Undo: the two lines in
  `CoopClient` (`case 'banner'`, `onSector`); a sturdier cue would be a restart counter in the `sector` message (a wire
  change: PROTOCOL_VERSION 25).
- **A2 (Sector Ops issues the campaign kit):** `loadoutEntries` maps the loadout onto the curated arsenal for `sector`
  as for `infiltration`, so the rifle is issued with its suppressor (A62, bible 5.6), as the Kit screen and the co-op
  lobby loadout already showed it. Before this the Sector Ops rifle was loud (noise 1 > 0.6): every guard within 28 m
  went straight to combat. Undo: `mode === 'sector'` in `progression/profile.ts` `loadoutEntries`.
- **A3 (the checkpoint loadout):** recorded when a section begins (the run start, then each time the far door
  unlocks); a restart gives back each gun's magazine and reserve as recorded, then fills every magazine from its own
  reserve (the rounds the section began with, no free ammo), and the gadget counts and selection. A restart while a
  connector cycle was running (the next section loads) gives back the previous section's kit (the players are down;
  their kit at that moment is the emptied one). Undo: `beginSection(kit)` in `sectorMode.ts`; full reserves instead:
  `LoadoutSnapshot.restore`.
- **A4 (what else a restart clears):** grenades in flight, gadgets in the world (`GadgetSystem.clearWorld`: noisemakers,
  gas, mines, sticky cams), the stealth door memory (`StealthSystems.resetForRestart`), the noise meter and suppression.
  Doors stay as they are and shot-out lamps stay out (polish list). Undo: lines in `GameState.checkpointReset`.
