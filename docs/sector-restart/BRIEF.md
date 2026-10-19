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
- (none yet)
