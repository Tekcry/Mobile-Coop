# coop-rejoin - report (Player Build, Opus)
Branch feature/coop-rejoin, off master 33fff449 (4.82.0); continues the WIP d9fcb6be. Michael's walk of 4.82.0 items 7
(rejoin at the start, game broken) and 4 / Marlow X4 (players spawn on top of each other).

Wire change: NO (no new message or field; PROTOCOL_VERSION untouched; reuses `restore` and `start.bay`). Behaviour
change: in Course mode a `start` sent to one client mid-match carries the current bay (docs/systems/coop.md).

## What was built
Item 7 (the host decides where a client goes):
- `NetSession` emits `late` whenever the running match is sent to one client (late join, rejoin, or a reconnect the
  host never saw drop).
- Course mode: that `start` carries the current bay (`NetSession.lateBay`, set by CoopHost from `resumeBay()`), so a
  client whose match reloads lands in the current bay's entry airlock, not the yard start.
- On that client's first `pstate`, CoopHost sends the whole state at once (course / sector message via new
  `GameMode.resync`, items, doors, bodies, lamps); places the client if its match (re)loaded (fix round: `JoinWatch` / `joinIsReload`; was `joinNeedsPlacing`: no
  state before, or a jump of 3 m or more); leaves it where it is if it kept its match up.
- Placement (`joinSpawn`): Course and Sector Ops = the current checkpoint (`GameMode.checkpointSpawns`) on the client's
  slot if a player there can walk to the host (`canWalk`: nav path crossing no locked closed door leaf), else beside
  the host; other modes = where the slot was held, else beside the host. Sent through the existing `restore` repeat
  (every 0.5 s until the client stands there, 30 s max); in Course and Sector Ops this replaces "back where held".

Item 4 / X4 (two spawn slots per area; slot 0 host, slot 1 partner):
- Cause (Marlow): every page builds the player at playerSpawns[0] and `courseStartPos` returned null at bay 1.
- `CoopClient.placeStart` puts the client on its slot of the start area (`startSlotPoints`): bay-1 course start
  (playerSpawns[0] / [1] = (2,10) / (2,12) on ctcourse), a bay-N start's airlock, Sector Ops section 1, else the map spawns.
- `CoopHost.onRespawn` puts each partner on its checkpoint slot (was a fixed 1.2 m offset that could land in a wall).
- A rejoin goes to a free slot.
- Slot 1 from map data when given (`AirlockDef.spawns`: at most 2, inside the box, 0.9 m apart; Sector Ops `start2`,
  `checkpoint2` / `SectorRun.checkpoint2`; placing them is Marlow Build's), else computed (`slotSpawn`: rings of
  1.2 / 1.7 / 2.3 / 0.9 m in 8 directions, slot side first; clear of level pieces, on a floor, open line from slot 0 at
  0.5 m and 1.3 m, >= 0.9 m from any player on the same storey; a last try without floor / line checks covers physics
  not up yet at load). A map's own point is never moved.
- `courseStartPos` removed (now `courseSlotPoints` / `courseStartCheckpoint`). `fixedUpdate` and `BayDef` untouched
  (Marlow S2 on feature/marlow-walk482 edits those).

## Files
- New: src/game/spawnSlots.ts (pure), src/game/spawnPlace.ts (probe, reach check, start points),
  tests/spawnSlots.test.ts, tests/coopRejoin.test.ts, changes/feature-coop-rejoin.md.
- Changed: src/net/session.ts, src/net/coopHost.ts, src/net/coopClient.ts, src/game/modes/gameMode.ts,
  src/game/modes/courseMode.ts, src/game/modes/sectorMode.ts, src/game/sectors.ts, src/game/course/courseDef.ts,
  docs/systems/coop.md, TESTING.md.

## Tests
- spawnSlots.test.ts 18/18: slot choice and fallback; walls, floor, open line; bodies and storeys; loose last try;
  joinSpawn per mode; placing rule; locked-door walks; real map data (every Marlow airlock, every warehouse Sector Ops
  start / connector checkpoint gets a clear slot 1).
- coopRejoin.test.ts 12/12: `late` on late join and rejoin; late start carries the bay; rejoiner's checkpoint; airlock
  slot validation; SectorRun slot 1; X4 (a) bay-1 client on slot 1 (2,12); bay-N slot 1 clear; X4 (b) rejoin to a free slot.
- Existing related: 42 files, 881/881 (single files). tsc and eslint clean. No e2e run (lead sends them to the laptop).

## e2e for the laptop
e2e-coop, e2e-netmove, e2e-ctcourse, plus the Sector Ops co-op / rejoin suites. Watch asserts on the client's start
position (now slot 1, not playerSpawns[0]) and the partner's spot after a restart.

## Manual test (in TESTING.md)
Co-op Marlow Yard, two pages: at the start, after a set restart and after "Start at A3", the players stand apart. Play
into A3, close the joiner's tab and rejoin (or toggle its network): it returns in the A3 entry airlock (or beside the
host) with A1-A2 done, A3 doors as on the host, HUD on A3; never the yard start. Same in Sector Ops section 2 or 3.

## Open items
- No e2e yet.
- A rejoin from a new tab before the host drops the old connection is refused "Room full" until the drop (existing
  rule: a live slot is never taken, even with its token); after the drop it rejoins and is placed as above.
- Marlow Build places slot 1 in map data (airlock `spawns`, `start2` / `checkpoint2`); until then the computed slot is
  used (tests show it clear in every current area).
- Changelog: "Co-op rejoin at the checkpoint, two spawn slots".

## Fix round (Opus, after CHECK-A FAIL / CHECK-B PASS)
Items (no wire change, PROTOCOL_VERSION untouched; `courseMode.ts` fixedUpdate and `BayDef` untouched):
1. **B1 (blocking): a rejoiner placed on its reload, not on its old match.** New pure `src/net/joinWatch.ts`
   (`JoinWatch`), which now also holds the R2 restore map (was `CoopHost.restoreFor` / `joinPending`). After `late` the
   watch stays open (30 s from the client's last load gap of 1 s+, so a slow load is still caught; a repeated `late`
   keeps it). It resyncs once on the first state as before, and places the client on the first state that is its
   reload (`spawnSlots.joinIsReload`): no state before, or a jump of `JOIN_SAME_M` 3 m+ from the previous accepted
   state (`r.feet` before `accept`) that lands in the client's start area (`startSlotPoints(g, lateBay)`, within
   `JOIN_START_M` 4 m) and not within `JOIN_RESTORE_M` 1.5 m of a restore the host sent it. No check while a host
   teleport is in flight: `sendBack` (`HALL_BACK_HOLD` 3 s) and a revive to a spot (`JOIN_REVIVE_QUIET_S` 2 s). The watch
   ends when its placement's restore is met or runs out. Old-match states at the held spot now only meet the held
   restore; the reload jump that follows is placed (`joinSpawn`: checkpoint slot or beside the host).
   **P1 verified fixed, with one addition:** comparing consecutive states alone does not fix P1, because a kept-up
   client's first state after `late` is still compared with the stale pre-gap state (its hello reaches the host before
   its next state). The start-area condition does: a kept-up client that moved 3 m+ in the gap is placed only if it
   now stands in its own start area, where the placement is the checkpoint anyway (Course: the current airlock) or
   wanted (Sector Ops section 1 while the host is further on).
2. **P2:** `onRespawn` calls `JoinWatch.respawned` for each partner it moves (revived, or alive in Course / Sector Ops):
   the repeating restore (join or held spot) stops, and the revive teleport counts as in flight.
3. **CHECK-B polish 1:** `slotSpawn` uses `besideLoose` only when the probe finds no floor under the area's first point
   (physics not up), not on any strict-search failure.
4. **CHECK-B polish 3:** `validateCourse` refuses an airlock `spawns` point under 0.3 m (a body radius) inside the box.
   **Polish 6:** the stale `courseStartPos` comment in spawnSlots.ts is gone.

Files: new `src/net/joinWatch.ts`, `tests/joinWatch.test.ts`; changed `src/net/coopHost.ts`, `src/game/spawnSlots.ts`
(`joinNeedsPlacing` -> `joinIsReload`, `JOIN_START_M`, `JOIN_RESTORE_M`, the loose-try gate), `src/game/spawnPlace.ts`
(`startSlotPoints` takes a bay), `src/game/course/courseDef.ts` (inset), `tests/spawnSlots.test.ts`,
`tests/coopRejoin.test.ts`, `docs/systems/coop.md`.

Tests (single files, desktop): joinWatch 11/11 (old-match states then the reload jump -> placed once, resynced once;
slow load past the watch time -> placed; new-tab rejoin and late join -> placed on the first state; repeated `late`;
a kept-up client walking -> never placed, watch ends; P1 gap move -> not placed; `back` / revive in flight -> not a
reload; a jump onto the held restore -> not a reload; the restore repeat; P2 restart stops the repeat; drop),
spawnSlots 19/19 (+ `joinIsReload` cases, + loose try gated with the physics up), coopRejoin 12/12 (+ the 0.3 m inset),
rejoin 12/12, sectors 27/27, ctcourse 27/27, net 71/71, netSim 7/7: 8 files, 188/188. `npx tsc --noEmit -p .` clean;
eslint clean on the touched files. No e2e (desktop rule; e2e-coop / e2e-netmove / e2e-ctcourse go to the laptop).

Left open: a rejoin through the start area's 3 m (P5) keeps the held-spot restore (written in coop.md); a host restart
or `back` landing in the reload's 2-3 s window would skip that reload (the watch then sees no later jump). Rare.

## Follow-up batch (coop-rejoin-2)
Branch feature/coop-rejoin-2, stacked on feature/coop-rejoin (PR #269, f13b91e7). RECHECK.md polish 1, 2 and 5; no wire
change (PROTOCOL_VERSION and message shapes untouched); no new allocation on the per-state path (one boolean).
1. **Polish 1 (closes "restart / `back` in the reload's 2-3 s window"):** a state after a load gap (no state for
   `JOIN_GAP_S` 1 s, or the watch's first state) bypasses the in-flight skip (`src/net/joinWatch.ts:132`, `:141`). A
   running match never goes 1 s+ without a state, so a post-gap state is never a stale pre-teleport one.
2. **Polish 2:** `hold` ends an open watch (`src/net/joinWatch.ts:67`), so a placement restore still unmet at a second
   drop can no longer close the next rejoin's watch when the old match meets the new held restore.
3. **Polish 5:** `docs/systems/coop.md:84-85` adds "unless it now stands in its start area (then placed at the
   checkpoint)"; `:76-78` notes the post-gap exception and the drop ending the watch.
4. Changelog fragment `changes/feature-coop-rejoin-2.md` (kind: patch).
5. **Polish A1 / A2 / B3 done:** gap bypass only if quiet before the teleport (`joinWatch.ts:115`, `:150`; test `:162`); coop.md `:76`, `:85`; header `:13`.
6. **Left on the polish list:** CHECK2-B polish 1 (a drop in the round trip after a placement) and 2 (a checkpoint restart during a hold moves the held host copy).

Tests: `tests/joinWatch.test.ts` 13/13 (+2: `:97` `respawned`, then the reload 1 s later after a 5 s gap -> placed;
`:201` an unmet placement restore, `hold`, rejoin -> the new watch places on the reload; both fail on the old code).
The existing revive in-flight case (`:154`) now steps 0.8 s, under `JOIN_GAP_S`, so it still tests the skip.
coopRejoin 12/12; `npx tsc --noEmit -p .` clean; eslint clean on the two files. No e2e (desktop rule).
