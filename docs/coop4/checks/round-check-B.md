# coop4 round check B - engine safety (f685cb21..aabc5a31)

Checker B (fresh Opus, independent of checker A). Range read in full: f685cb21 (open team-move fix), fa9e7de9 (AI5
wiring), bf3a8441 (sweepSourceOf), b9d3a5f1 (OUT), aab8f4f0 / aabc5a31 (STATE, e2e helper). Read only, detached
worktree at aabc5a31.

## Verdict: FIX (one must-fix, behaviour; engine safety itself passes)

### Must-fix

1. **A held OUT player is left dead and unrevivable after the return - `src/net/coopHost.ts:629`.**
   `returnOut` skips a held (dropped) remote (`if (r && !r.held)`), but `SectorMode.returnOut` has already cleared it
   from `outs` / `g.outIds`. On `resume` (coopHost.ts ~531) the remote goes back into `remoteRefs` still dead
   (`RemotePlayer.alive` is host health). It is no longer OUT, so `playerRefsInto` lists it, and `goOut` already dropped
   its revive point and clock. Result: a downed body nobody can revive. It counts in `exitStep` (sectorMode.ts ~869,
   "a downed one too"), so it blocks the next connector until the team restarts the section.
   Exact fix: in `returnOut`, return held OUT players too, and point their hold at the new spot instead of clearing it:
   ```ts
   const r = this.remotes.get(id);
   if (r) back.push({ id, slot: r.ref.slot });
   ...
   } else {
     const r = this.remotes.get(b.id)!;
     if (r.held) this.joins.hold(b.id, { x: p.x, y: p.y, z: p.z, yaw: o.yaw }); // resume restores them here
     else this.joins.respawned(b.id, this.time);
     this.reviveOne(b.id, p);
   }
   ```
   Alternative: in `resume`, revive a dead remote that has no revive point at its slot spot (Sector Ops only). Add a
   case to `tests/sectorOut.test.ts` "OUT return placement": a held id comes back alive with its hold re-pointed.

### Engine safety - passes

- **(1) Per-step allocation.** None in a hot path.
  - `GameState.playerRefsInto`: `isOutRef` is a size check plus `Set.has` per ref, with no allocation.
  - `OutFollow`: fixed `PLAYER_SLOTS` arrays. `followPick` is a plain loop. `Player.followAt` is one reused
    `Vector3`. Follow points are the avatars' persistent `pos` vectors, read live.
  - Both `followStep`s return early unless this player is dead and OUT. The idle cost is one `Set.has` / mask test per
    step.
  - `teamBusy` / `inOpenMove` / `teamSide` run on a team-move request only (object per request, as before).
  - `SHAPE` is a module scratch. `sh` is read only before the team loop (`ask`, `teams`), so a re-entrant write cannot
    change it.
  - `sweepSourceOf` is built once per (section, team size) and cached.
  - The only new allocations are at events: `returnOut`, the `[...keys]` copies in `returnOut` / `debug`, `outMask` in
    the 0.5 s `sector` extra (which already allocates), and the alarm's sweep-source destructure.
  - No `Math.hypot` in src.
- **(2) `Player.followFeet` (player.ts:355, :372).** The hunk is small and isolated: one field, one reused vector, and
  the camera-target branch in `frameUpdate`. It changes only `cam.update`'s target and `world.frame`'s focus.
  - Render-only: `World.frame` is sun / character / torch shadows. The camera-distance readers (`animTierView`,
    `sectorGuardFreezeView`) are render tiers.
  - No fight with the controller. Dead input is already zeroed (`pi.moveX/Y = 0`). `faceTravel` keeps the body yaw
    when not moving. `PlayerWeapons.fixedUpdate` returns when dead, so the `swapNext` used to cycle targets cannot swap
    guns.
  - Clean return: `fol` is null the frame the player is alive again, even before the next step clears `followFeet`.
    The host sets `cam.yaw` to the slot yaw on return.
- **(3) Wire.**
  - `ot`: `num(raw.ot, 0, 15)` then rounded; non-number / NaN / Infinity is dropped, and <= 0 is dropped.
  - Client: `slotOut` bounds-checks the slot (-1 / >= 4 is false). A junk mask can only change the client's own view or
    HUD line, and only while it is dead.
  - Host trust: no client message carries OUT. `outs` / `outIds` are written only by `SectorMode.onPlayerOut` from the
    host's own `goOut`, and the host never reads `ot`.
  - The 1-2 player message has no `ot` field. `PROTOCOL_VERSION` is untouched.
- **(4) Single player.** `sectorOut.ts` imports only `sectors` / `playerSlots`, and the new src code has no static
  src/net import. Solo Sector Ops is unchanged: `onPlayerOut()` with no id restarts (tested). netSim and
  visionIsolation pass.
- **(5) Leaks.**
  - `outs` / `outIds` are cleared by `restartSection` (`clearOut`), the connector return and `complete()`.
  - `GameState`, `SectorMode` and the net attachment are rebuilt per game, so nothing crosses a map change.
  - The client mask resets on the next `sector` message (`secT = 0` forces one), and the follow view switches off once
    the player is alive or the mask bit is gone.
  - `teamActive` open entries now end once the climber is no longer posed in the move. Stale timed entries are bounded
    by the player count and overwritten by the next `teamMark`.
- **(6) Tests.** `sectorOut` drives the real `SectorMode.onPlayerOut` / `connEvents` / `netExtra` and
  `CoopHost.returnOut`. It would fail on these regressions:
  - the 1-2 player restart
  - the session team size (connected plus held)
  - return before the grant
  - an empty mask after the return
  - restart when nobody is up
  - slot placement

  `sectorTeamScale` covers the AI5 rule "never both scalings", the cap, the team split and the per-load hook.
  `sectorGuardTags` compares the sweep source with master's.

## Polish (not blocking)

- The `playerRefsInto` exclusion in `GameState` is only covered by a stub that copies it (`sectorOut` `host()`). A
  one-line removal in gameState.ts:1051 would still pass the unit tests; only e2e part 9 would catch it.
- No unit test for:
  - the `ot` parse bounds (-1, 16, 1e9, '3', 2.6)
  - the client's `onSector` (`restoreCheckpoint` once on going out)
  - `restartSection` clearing OUT
  - `teamBusy` (the 1 s grace, `teamClear` dropping `teamPairs`); `inOpenMove` is tested on its own
- coopClient.ts:1046 `for (const [id, a] of this.avatars)` allocates an entry array per avatar per step while OUT, and
  coopHost.ts:1646 a values iterator. Both only run while out, and the same functions already loop this way, so this is
  not a must-fix. `for (const a of this.avatars.values())` with the id kept on the avatar would remove the entry arrays.
- sectorMode.ts:1126 `+ this.outs.size` is always 0: `complete()` runs `returnOut()` first, and the count is still
  right because the returned players are alive and listed. Drop it, or move the rating count before the return.
- An OUT remote that leaves for good (`removeRemote`, coopHost.ts:554) keeps its id and slot in `outs` / the mask until
  the next connector. A late joiner given that slot would read itself OUT on its client while dead. Clear the id through
  a mode hook on leave.
- `cam.update(dt, followAt, 0)` uses crouch 0, so a crouched teammate is framed at standing height. On the return the
  camera may sweep from the teammate back to the body. Snap it if the eased move shows through walls on the laptop.
- `Player.followFeet` and the camera frame are not covered by any player* / camera* test (render path; e2e part 9 only).

## Checks run (aabc5a31)

- `npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors (42 warnings, none new).
- vitest `--maxWorkers=2`, under slot lock sr-slot-2: 16 files, 356 tests pass. Files: sectorOut, teamMovesTaken,
  sectorTeamScale, netSim, visionIsolation, net, coopRejoin, player, playerSlots, cameraBounds, cameraCue, cameraReach,
  cameraRigid, sectorGuardTags, sectorRestart, responseWiring.
- Not run: e2e, build, GPU.
- Marlow guard: empty diff in src/game/course, courseMode.ts, ctcourse maps and src/ai.
