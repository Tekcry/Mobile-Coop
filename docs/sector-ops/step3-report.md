# Slice 2 step 3 - report (implementer, PAUSED 2026-10-19)

Paused by the job lead (the orchestrator wants step 2 green first). The tree typechecks and the touched tests pass;
step 3 is about half built. Nothing committed (the job lead commits).

## Done so far (code, typechecked)
- **Wire (protocol 24):** the `sector` message gains optional `ls` (live section, -1..63), `lk` (locked door indices),
  `dn` (camera ids shot out, max 64), `sy` (syringes left, 0..9); `SectorNetExtra` in `src/game/sectors.ts`, parsed by
  `sectorExtra` in `protocol.ts`. `PROTOCOL_VERSION` 23 -> 24; the asserts in `tests/net.test.ts` (incl. the
  old-version refusal: 23 refused, 24 joins) and `tests/moveState.test.ts` updated.
- **Host send:** `NetAttachment.sector(sec, extra)`; `SectorMode.netExtra` builds the extras each send (new arrays, every
  0.5 s or on a change, not per tick). `CoopHost.sector` spreads them into the message.
- **Client mirror:** `CoopClient.onSector`: `setLive(ls)` when it changes (other sections' devices off), `applyDestroyed(dn)`,
  `apply(sec)`, door locks set from `lk` (`Doors.setLocked`; `setOpen` from the snapshot ignores locks). The HUD line is
  not built on the client: the snapshot's `info` already mirrors the host's mode info (section, alarm, syringes).
- **Syringes (M7, A10):** `ReviveClock.cap` is now writable; `CoopHost` sets it to `syringesFor(difficulty)` in Sector Ops
  (other modes unchanged, 2). `CoopHost.revivesLeft()`; the host's mode info shows "Syringes n" in co-op only
  (`sectorInfoHtml`, solo shows none). Syringes are per op (a restart keeps the count used, `ReviveClock.checkpoint`).
- **Out -> restart:** new optional `GameMode.onPlayerOut()`; `CoopHost.goOut` calls it outside the course; `SectorMode`
  restarts the section after the 2.5 s beat. Both down still goes through `onPlayerDeath`. On the restart's respawn
  `CoopHost.onRespawn` also brings a partner who is still up to the checkpoint in Sector Ops (`revive` event: teleport,
  full health), so the restart is a clean retry.
- **A20 (connector and downed players):** the connector and the extraction count every player, downed too (was: living
  only, A19). A downed partner outside holds the cycle until revived (or the window runs out -> out -> restart), so nobody
  is left in an unloaded section. A body in the near doorway also holds it. Undo: skip `!r.target.alive` refs again in
  `SectorMode.exitStep`.
- **Client holds:** `CoopHost.releaseHolds()` (every `seized` guard: `tdDenied` to the holder, which aborts its takedown /
  grab, then `release`), called by `SectorMode.unloadSection` (unload and restart) before `despawnAll`. Despawned guards
  vanish on the client by the snapshot's stale sweep (verified by reading `coopClient.onSnap`: about 0.5 s).
- **Shot cameras restored on a restart:** `CameraUnit.repair()`, `CtDevices.repair(section)` (called in
  `restartSection`), `destroyedIds`, client `applyDestroyed`; `SecurityView` resets the tilt when a camera is repaired.
  (Before this the client never saw a shot-out camera; `dn` fixes that too.)
- **Stars write:** `SectorMode.complete()` calls `markCompleted(map.id, difficulty, time)` (solo and co-op host); the
  co-op client writes its own star on a won `end` (time 0: no best time on the client).

## Left to do
1. **Op list UI:** a `SectorOpsScreen` (pattern: `FreeRoamScreen` in `src/ui/screens/missionsScreen.ts`): maps with
   `sectors` and mode `sector`; counter = 4 stars (`★`/`☆`, DIFFICULTIES order) loaded async from `loadSectorRecord`,
   ctx with per-difficulty stars and best times (`fmtTime`), `data-stars` for tests; confirm opens the existing
   `BriefingScreen` kind `sector`. Main menu entry -> the op list; its counter shows the Warehouse stars (cache in
   `main.ts`, `menu.setCounter('sectorops', ...)` after the load, like the feedback count). A pure `starsText(boolean[])`
   in `sectorRecord.ts`.
2. **Lobby stars (if cheap):** `coopUi.ts` host Map row label with the stars in Sector Ops (the `courseRec` load
   pattern). Else note it.
3. **Vitest:** `syringesFor` per difficulty, `sectorInfoHtml` (syringes shown / hidden), `starsText`, `parseMessage` of
   the `sector` extras (round-trip, clamps, junk dropped), `ReviveClock` with a custom cap, `CameraUnit.repair`.
4. **e2e (written, not run):** `scripts/e2e-sectorops.mjs`: after the walk's extraction, read kv `sector:ops` (or the op
   list's `data-stars` back on the menu) and check the star for the run's difficulty. Two-page `?net=local` check only
   if cheap (see how e2e-ctcourse / e2e-park pair pages); else pending. Do not touch `scripts/e2e-coop.mjs`.
5. **Docs:** CHANGELOG ("Unreleased - Sector Ops"), TESTING.md (stars and syringes line), `docs/systems/coop.md`
   (protocol 24, the `sector` extras, `releaseHolds`, `onPlayerOut`, A20), `docs/systems/modes-and-progression.md`
   (Sector Ops stars and syringes); BRIEF A20 line (the job lead's file).
6. Finish this report (numbers, tests, results).

## Assumed decisions so far
- **A20:** see above (every player, downed too, counts for the connector and the extraction).
- **A21 (not needed):** shot cameras are restored on a restart (the simpler clean retry), so no A21.
- **A22:** a section restart in co-op also brings a partner who is still up back to the checkpoint at full health. Undo:
  the `sector` branch in `CoopHost.onRespawn`.
- **A23:** the co-op client writes its own star on a won run (no best time). Undo: the line in `CoopClient.onEndMsg`.

## Light checks run
- `npx tsc --noEmit`: clean.
- ESLint on the changed files (`coopClient`, `coopHost`, `protocol`, `sectorMode`, `sectors`, `ctDevices`, `reviveClock`,
  `gameMode`, `gameState`, `camera`, `securityView`): clean.
- `npx vitest run tests/net.test.ts tests/moveState.test.ts tests/sectors.test.ts tests/reviveClock.test.ts
  tests/sectorRecord.test.ts`: 117 passed.
- Not run (machine rule): `npm run check`, build, any e2e.

## Files touched so far
`src/game/sectors.ts`, `src/net/protocol.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/game/gameState.ts`
(NetAttachment), `src/game/modes/gameMode.ts`, `src/game/modes/sectorMode.ts`, `src/game/ctDevices.ts`,
`src/game/reviveClock.ts`, `src/security/camera.ts`, `src/security/securityView.ts`, `tests/net.test.ts`,
`tests/moveState.test.ts`.

## Note for step 2's verification
These step 3 edits are in the same working tree. If step 2 is verified from this tree, they ride along (protocol 24,
syringe cap, A20). They typecheck and the touched suites pass; `e2e-sectorops` (solo) should be unaffected except that
the extraction now writes the kv star.

## Polish list
- The client's "BACK IN" banner also shows for a partner who was up when the section restarts.
