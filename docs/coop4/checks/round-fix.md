# coop4 round fix (Opus): checks A and B on f685cb21..aabc5a31

One fix round after `round-check-A.md` and `round-check-B.md` (both FIX, the same must-fix). The checker reports are
left as written.

## Fixed

1. **MUST (A F1 / B 1): a held OUT player at the connector return** - `src/net/coopHost.ts:644-664`.
   `CoopHost.returnOut` now returns held (dropped) OUT remotes too: every remote that exists is pushed into `back`.
   For a held one, its hold is re-pointed at the new checkpoint spot instead of `joins.respawned`, then `reviveOne`
   brings it back to full health. On its rejoin it comes back alive at the new checkpoint.
   - The hold is re-pointed with a new `JoinWatch.rehold(id, at)` (`src/net/joinWatch.ts:73-81`), not `hold`.
   - `hold` also ends an open watch. A rejoin already loading when the connector cycles would then lose its first-state
     section resync (`JOIN_RESYNC`).
   - `rehold` moves the held restore and an open watch's held spot, and leaves the watch open. Before a rejoin it acts
     like `hold`.
2. **Polish A P1 / B: an OUT leaver** - `GameMode.onPlayerLeft?(id)` (`src/game/modes/gameMode.ts:75-77`) is called
   from `CoopHost.removeRemote` (`coopHost.ts:586-587`, a lobby leave or the end of a hold).
   `SectorMode.onPlayerLeft` (`src/game/modes/sectorMode.ts:1465-1471`) removes the id from `outs` and `g.outIds`
   and sets `secT = 0`, so the next `sector` message, with the new `ot`, goes out at once. A late joiner on that slot
   never reads itself OUT.
3. **Polish A P2: the last one up drops** - at the end of `CoopHost.hold` (`coopHost.ts:530-533`), the section restarts
   at once when `g.outIds.size > 0` and nobody connected is up (`onPlayerDeath`). `outIds` is empty at 1-2 players and
   in the course, so they are unchanged.
4. **Polish B: no allocation while out** - both follow loops now call `Map.forEach` with a module-level function and a
   reused context object, set each step.
   - Host: `followSetRemote` / `followScan`, `coopHost.ts:136-144`, `:1652`, `:1669-1670`.
   - Client: `followSetAvatar` / `followScan`, `coopClient.ts:69-79`, `:129-130`, `:1060-1063`.
   - The entry arrays and the values iterator are gone.
5. **`ot` parse bounds (B)** - `src/net/protocol.ts:720-723`.
   - A value outside 1..15 is now dropped, not clamped, so a junk 16 or 1e9 no longer reads as every slot OUT.
   - The value is still rounded (2.6 reads as 3). A non-number, NaN or Infinity is dropped.
   - The host only sends 1..15, so nothing changes on the wire. `PROTOCOL_VERSION` is untouched.

Not taken (not in this round's list): A P3-P6, B's `+ this.outs.size` rating note, B's `playerRefsInto` stub-only
coverage, the crouch-0 follow height.

## Tests
- `tests/sectorOut.test.ts` +7:
  - the held OUT return: revived on its slot, its restore re-pointed there, `respawned` only for the connected one, and
    the rejoin's `late` / `resume` send it to the new spot;
  - `onPlayerLeft` (the list, `outIds`, `secT`, the mask);
  - `restartSection` clears OUT before the respawn;
  - `removeRemote` calls `onPlayerLeft`;
  - `hold`: the restart when everyone else is OUT or down, none with nobody OUT (1-2 players), none with someone up.
- `tests/net.test.ts` +1: the `ot` parse bounds (4, 15, 2.6, 0, -1, 16, 1e9, NaN, Infinity, '3', missing).
- `tests/joinWatch.test.ts` +1: `rehold` keeps an open watch (its first state still resyncs) and moves the restore.

## Checks
- `npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors (42 warnings, as before).
- vitest `--maxWorkers=2` under `sr-slot-1.lock`: 29 files, **920 pass, 1 skipped, 0 fail**. Files: sectorOut,
  teamMovesTaken, sectorTeamScale, net, coopRejoin, coop* (Fix, GuardAi, GuardCarry, Perception, Torches,
  WalkFixes), netSim, visionIsolation, sectorRestart, courseMarks, ctcourse (dir + 3 files), joinWatch.
- Not run: e2e, build, GPU.
- Marlow guard: no edit in `src/game/course`, `courseMode.ts`, `src/world/maps/ctcourse*` or `src/ai`.
