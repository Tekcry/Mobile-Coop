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
  `GameMode.resync`, items, doors, bodies, lamps); places the client if its match (re)loaded (`joinNeedsPlacing`: no
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
