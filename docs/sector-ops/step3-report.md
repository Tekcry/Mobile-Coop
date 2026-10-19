# Slice 2 step 3 - report (implementer, 2026-10-19)

Stars, syringes and the co-op client for Sector Ops (M7, A9, A10). The first half was committed as 2fa5a154 (paused for
step 2), the rest built after step 2 went green (9b0a254c). Code done; `tsc`, ESLint and the targeted Vitest files
pass. **Not run** (the desktop heavy.lock is another job's): `npm run check`, build, every e2e. They go to the remote
runner.

## Built
### Difficulty stars (M7, A11)
- The extraction writes `markCompleted(map.id, difficulty, time)` (`SectorMode.complete`, solo and co-op host). The co-op
  client writes its own star on a won `end`, with no best time (A23).
- `SectorOpsScreen` (`src/ui/screens/missionsScreen.ts`, the `FreeRoamScreen` pattern): every map with `sectors` and the
  `sector` mode (the Warehouse now). Each op has four stars (`★` / `☆`, DIFFICULTIES order) as its counter. The context
  panel shows the description, the section count and, per difficulty, its star and best time (`fmtTime`).
  `data-op` and `data-stars` (e.g. `0100`) are there for tests. The record loads after the screen is built, then fills
  the counters and context and refreshes the focused panel. Confirm opens the existing briefing (difficulty choice there).
- The main menu's Sector Ops entry opens the op list. Its counter (was the section count) is the Warehouse's stars,
  read each time the menu opens (`starsFor`, then `setCounter`).
- Lobby: the host's Map row in Sector Ops shows each op's stars beside the name (`LobbyScreen.mapLabel`, the `courseRec`
  load pattern; the client's locked row shows the name only).
- `starsText(boolean[])` in `src/save/sectorRecord.ts`.

### Co-op revive syringes (M7, A10)
- `ReviveClock.cap` is writable. In Sector Ops `CoopHost` sets it to `syringesFor(difficulty)`: Rookie 3, Normal 2,
  Realistic 1, Perfectionist 1. Other modes are unchanged (2). The count is per op: `checkpoint()` keeps the used count.
- `CoopHost.revivesLeft()`. The host's HUD mode info (`sectorInfoHtml`) shows "Syringes n" in co-op only. The client
  gets the line through the snapshot's `info` mirror.
- An operator out (no syringe left, or the 30 s window over) calls the new optional `GameMode.onPlayerOut()` (from
  `CoopHost.goOut`, outside the course). Sector Ops then restarts the section after the 2.5 s beat. Both down still goes
  through `onPlayerDeath`.
- On the restart's respawn, `CoopHost.onRespawn` in Sector Ops also brings a partner who is still up to the checkpoint
  (`revive` event: teleport, full health) (A22).
- **A20:** the connector cycle and the extraction count every player, downed ones too. A partner down outside holds the
  cycle until revived. If the window runs out, they are out and the section restarts. Nobody can be left in an unloaded
  section.

### Co-op client (A9)
- **Protocol 24:** the `sector` message also carries:
  - `ls`: the live section, -1..63
  - `lk`: locked door indices
  - `dn`: shot-out camera ids, max 64
  - `sy`: syringes left, 0..9

  Defined as `SectorNetExtra` in `game/sectors.ts`, parsed and clamped by `sectorExtra` in `protocol.ts`. The host
  builds new arrays each send (every 0.5 s or on a change, not per tick).
- `CoopClient.onSector`:
  - runs `CtDevices.setLive(ls)` when it changes (other sections' cameras off, lasers dark, no jam targets)
  - breaks or repairs cameras from `dn` with `applyDestroyed`; before this the client never saw a shot-out camera
  - applies `apply(sec)`
  - sets door locks from `lk` (`Doors.setLocked`; the snapshot's `setOpen` ignores locks)
- **Client holds:** `CoopHost.releaseHolds()` handles every `seized` guard: it sends `tdDenied` to the holder (aborting
  their takedown or grab), then releases the guard. `SectorMode.unloadSection` calls it before `despawnAll`, on the
  unload and on a restart.
- **Despawned guards on the client:** verified by reading `coopClient.onSnap`. A puppet the host stops reporting is
  disposed after about 0.5 s (the stale sweep), with no kill event.

### Restart
- A shot camera of the restarted section comes back: `CameraUnit.repair()` and `CtDevices.repair(section)` in
  `restartSection`. `SecurityView` resets the tilt when it is repaired. No A21 needed.

## Assumed decisions (in BRIEF.md)
- **A20:** the connector and the extraction count downed players too. Undo: skip players that are not alive in
  `SectorMode.exitStep`.
- **A22:** a section restart also brings a partner still up to the checkpoint at full health. Undo: the `sector` branch
  in `CoopHost.onRespawn`.
- **A23:** the co-op client saves its own star (no time). Undo: the line in `CoopClient.onEndMsg`.

## Tests written
- **`tests/sectorStep3.test.ts` (new, 6):**
  - syringes per difficulty
  - the revive clock with the op's cap (a checkpoint keeps the count used)
  - the HUD line with and without syringes
  - `starsText`
  - the protocol 24 `sector` round-trip, clamps and junk, and the old shape still parsing
  - `CameraUnit.repair`
- **Protocol bump (in 2fa5a154):** `tests/net.test.ts` and `tests/moveState.test.ts` expect 24; version 23 is now refused.
- **`scripts/e2e-sectorops.mjs` (written, not run):**
  - After the solo Ghost run: the kv `sector:ops` record has the run's difficulty with a best time. Then Main menu, then
    Sector Ops: the op list's `data-stars`, counter and context show that star filled and `best m:ss`.
  - **New two-page `?net=local` check** (`hostAndJoin` and `startMode` from e2e-net-lib, the host page pumped headless as
    in e2e-ctcourse, `sectorGuards=4` on the host):
    - the client builds its device mirror and knows section 1 is live; only section 1's devices work
    - the client mirrors the locked doors
    - Normal gives 2 syringes, and the client HUD shows "Syringes 2"
    - section 1 is told done and both players are teleported into C2; the host cycles into section 2
    - the client then has section 2's devices live (section 1's off) and the unlocked far door
- **The menu now has an op list between the main menu and the briefing**, so three suites were updated:
  - `e2e-menus`: Enter goes to the op list (focus `op-warehouseOps`, four stars), Enter goes to the briefing, B goes back
    to the op list, B goes back to the main menu.
  - `e2e-pad`: A goes to the op list, A goes to the briefing, then B and B back.
  - `e2e-park`: click goes to the op list, click the op, then two pops.
- `scripts/e2e-coop.mjs` is not touched.

## Light checks run
- `npx tsc --noEmit`: clean.
- ESLint on the changed TS files: clean. Scripts are ESLint-ignored; `node --check` passes on all four changed suites.
- `npx vitest run` on `sectorStep3`, `sectorRecord`, `net`, `reviveClock`, `sectors` and `securityCamera`: 128 passed.
  Earlier, with `moveState`: 117 passed.

## To run remotely
```
npm run check
npm run build
E2E_PORT=4191 E2E_JOBS=2 node scripts/run-e2e.mjs smoke e2e-sectorops e2e-menus e2e-pad e2e-park e2e-coop e2e-netmove e2e-ctcourse
```
- `src/net` and `src/game` changed, so e2e-coop and e2e-netmove are in the list.
- e2e-ctcourse covers the course revive cap (2) and `goOut` staying on the course path.

## Untested
- Everything in-browser:
  - the op list
  - the menu counter refresh after a run
  - the lobby stars
  - the two-page check: first run; timing on software GL is the main risk
  - the syringe and out restart flows on two pages; the out restart and the partner-up teleport have no e2e
  - `releaseHolds` with a real client takedown; no e2e
  - camera repair in a running match; Vitest covers the unit only
- The kv read in the e2e assumes the DB name `shoulder-strike` (a non-preview build, as e2e-desktop does).

## Polish list (cosmetic)
- A partner who was still up also sees the "BACK IN" banner at a section restart.
- The lobby Map row for the client shows no stars.
- The context panel's star rows are plain text.

## Open items
- `perf.mjs` with the full guard counts: pending PC run (M6).
- Co-op Sector Ops through a room-code join in e2e-coop: after feature/coop-tests merges, and only with the
  orchestrator's say (the two-page `?net=local` check above covers the mirror for now).
