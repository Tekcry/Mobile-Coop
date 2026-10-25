# coop-rejoin - check A (fresh Opus, network and host authority)

PR #269, branch feature/coop-rejoin, head 28d4e4c1 vs master 33fff449. Read-only review of the diff, REPORT.md, the
preamble and the CLAUDE.md hard rules. Runs: `tests/coopRejoin.test.ts` + `tests/spawnSlots.test.ts` 30/30 pass;
`npx tsc --noEmit -p .` clean. No e2e (desktop CPU).

## Verdict: FAIL (1 blocking item)

## Blocking

**B1. The first `pstate` after `late` can come from the client's old match, so the reload is never placed.**
`src/net/coopHost.ts:642` (`placeJoiner` on the first state) with `src/game/spawnSlots.ts:265` (`joinNeedsPlacing`),
`src/net/coopHost.ts:406-417`, `src/net/coopHost.ts:488-493` (`restoreStep`).

The path the TESTING.md manual test names ("toggle its network") and the likely path of item 7 (the page stayed open):
1. The client loses the host: `hostLost` sets `waiting` (`src/net/coopUi.ts:167`); its old match and `CoopClient` keep
   running. The host holds it (`away`).
2. The transport finds the host again (trystero: same peer id). The client gets the host's lobby, sets `hostId`
   (`src/net/session.ts:231`), and from that moment its old `CoopClient` sends `pstate` at 20 Hz (`toHost`,
   `session.ts:136`); nothing stops it while waiting.
3. The host takes the client's hello: `rejoin`, `start`, `late` (`session.ts:194-200`), `joinPending` = the held spot.
4. Old-match states sent during the next half to full round trip (before the `start` reaches the client and
   `startGame` releases the old match, `src/main.ts:394`) arrive after `late`. The first one stands at the held spot
   (a hidden or idle client did not move), so `joinNeedsPlacing` is false and `joinPending` is deleted. `resume` then
   sets the held restore, and `restoreStep` deletes it at once (state under 1 m from the held spot).
5. The reloaded match starts at the client's `placeStart` spot and nothing places it: in Sector Ops that is section 1's
   start while the host is in section 2 / 3 behind sealed connectors (exactly item 7: "No way to return, game
   broken"); in Course the current bay's entry airlock (mostly fine, but the `canWalk` fallback to "beside the host"
   is skipped).

The same happens without `away` (the host never saw the drop but the client did: it reloads, the host saw a
continuous old state first). The existing R2 restore has the same race, so this is not new breakage, but it defeats
the fix for the reported case, so it blocks.

Suggested fix (no wire change): keep `joinPending` open after the first state instead of settling it there. While it
is pending (e.g. up to 30 s from the `late`, or until the restore it set is met), place on the first state that jumps
`JOIN_SAME_M` or more from the previous accepted state (`r.feet` before `accept`): that jump is the reload. Skip the
check while the host itself has a teleport in flight for that client (a `restore` / `back` it sent). Resync the mode
state once, on the first state, as now. A unit test: first state at the held spot (old match), then a state at the
reload spot -> placed at the checkpoint; a kept-up client's continuous states -> never placed. Comparing consecutive
states also fixes polish item P1.

## Checked and fine
- Wire: no new message or field; `start.bay` already exists and parses 1..64 (`protocol.ts:847`); `PROTOCOL_VERSION`
  untouched (43). `late` and `lateBay` are local to `NetSession`. Behaviour change (a late `start` carries the current
  bay) is documented in `docs/systems/coop.md`.
- Single player: no new static import of `src/net` outside `src/net`. `courseMode.ts` imports `spawnSlots` (pure,
  `src/game`); `gameMode.ts` / `sectorMode.ts` import types only; `spawnPlace.ts` is imported only from `src/net`.
- Section state on a rejoin: the client is a puppet (no `CourseMode`, no nav); `courseBay` on the client only moves
  its start spot. Course / sector messages, items, doors, bodies and lamps are full periodic snapshots already
  (`COURSE_SEND` 2 s, `SEC_SEND` 0.5 s, `ITEMS_EVERY` 2 s); `resync` / `itemsT = 0` / `lampForce` only send them at
  once. Completed bays, current bay, door locks (`lk`) and bodies come from the host, so a rejoin mid-section cannot
  desync them.
- A client that kept its match up ignores the second `start` (`coopUi.ts:193`); continuous states stay under 3 m from
  the last host state, so it is not placed (see P1 for the gap case).
- Host restart (R3): the new `CoopHost` starts with empty maps, `late` fires on the client's hello, `r.state` is null,
  so it is placed; `dispose` clears `lateBay`.
- Two rejoins in a row: `hold` overwrites `restoreFor`, the next `late` overwrites `joinPending`; `removeRemote`
  clears all three maps.
- The 30 s cap: `until = time + 30` from the first state of the loaded match; `restoreStep` runs per state, stops
  within 1 m or at the cap. `resume` runs before `placeJoiner`, so the join spot replaces the held one.
- Hot paths: the per-state cost is one `Map.has`; `placeJoiner`, `joinSpot`, `canWalk` (nav search, 40000 expansions),
  `onRespawn` and `placeStart` allocate, but run once per join / respawn / start.
- Graphics state: the probe reads level boxes (`SightWorld`), static physics rays and the nav grid; facing reads
  `player.cam.yaw` (the player's heading, not a preset, LOD or governor).
- Item 4: `placeStart` puts the client on slot 1 of the start area (bay 1: `playerSpawns[1]`), `onRespawn` uses
  `slotSpawn` against the checkpoint (or `at` when the checkpoint's slot 0 is over 1 m from it). Map slot points are
  validated (at most 2, inside the box, 0.9 m apart).

## Polish (non-blocking)
- P1. A kept-up client that moved 3 m or more during a gap the host did not see as a drop is placed (yanked):
  `joinNeedsPlacing` compares with the last host state, not the previous client state. Rare (no `away` means a short
  gap); the B1 fix removes it.
- P2. `onRespawn` (`coopHost.ts:1609`) does not clear `restoreFor`: a checkpoint restart inside the restore repeat
  (normally under 1 s) can pull the partner back to the join spot afterwards. Clear the entries there.
- P3. `late` fires once per hello (a connecting client sends 2-3), so `joinPending` and the resync repeat; harmless.
- P4. `CoopClient.slot()` reads lobby order, `CoopHost.slotOf()` the remotes' insertion order; equal in a 2-player room,
  would need one source if capacity grows.
- P5. A rejoin whose reloaded start lies within 3 m of its held spot (it dropped in the entry airlock) keeps the old
  held-spot restore instead of the checkpoint slot; fine in play, worth a line in coop.md.
