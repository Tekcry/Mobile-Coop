# coop-rejoin - fix round re-check (fresh Opus)

PR #269, branch feature/coop-rejoin, head 327e73f4; fix round diff 961e3a81..327e73f4. Read-only review against
CHECK-A.md (B1, P1, P2), CHECK-B.md (polish 1, 3, 6), REPORT.md "Fix round", the preamble and the CLAUDE.md hard rules.
Runs (single files, desktop): joinWatch 11/11, spawnSlots 19/19, coopRejoin 12/12, rejoin 12/12, net 71/71, ctcourse
27/27; `npx tsc --noEmit -p .` clean. No e2e.

## Verdict: PASS

B1 is closed on the reported path (page left open while waiting for the host). Nothing found is broken; the one real
residual route back into item 7 needs a host restart or hallway `back` inside a 2-3 s window and goes on the polish list
with a one-line fix.

## B1 trace (page open, Sector Ops, host in section 3)
1. Client `hostLost` -> `waiting` (coopUi.ts:167); old match and CoopClient keep running. On the host's lobby
   `hostId` is set (session.ts:231) and `toHost` pstates flow. States before the hello are dropped by the host
   (session.ts:203: unknown or `away` sender).
2. Hello -> `rejoin` -> `unhold` (rejoining), `start` sent with `lateBay`, then `late` -> `JoinWatch.late` with
   `startSlotPoints(g, lateBay)` (coopHost.ts:380): Sector Ops section 1 start / start2; Course the lateBay airlock (same
   value the `start` carried, same synchronous turn).
3. Old-match first state (coopHost.ts:633-641): `resume` sets the held restore's `until`; `joinStep` -> `state`:
   RESYNC, `until` = now + 30, `joinIsReload(prev = held feet, ~held spot)` false (< 3 m). After `accept`,
   `restoreStep` meets the held restore and deletes it; `placed` is false, so the watch stays open (joinWatch.ts:161).
   Further old-match states are continuous (< 3 m), never placed, never close the watch.
4. `start` reaches the client; `startGame` releases the old match synchronously (main.ts:396). Any `restore` the host
   sent in reply to an old-match state was sent after `start` on the same ordered channel, so the old match can never
   apply (meet) it.
5. Reload's first state after the load gap: `until` restarts (joinWatch.ts:128) before the expiry check, so a 10-20 s
   (or longer) load cannot expire the watch: nothing deletes `pending` without a state arriving. Jump >= 3 m from the
   last old-match feet, within 4 m of a start point (client's `placeStart` lands on its map point or a ring <= 2.3 m
   from points[0]), no restore within 1.5 m -> JOIN_PLACE. `joinSpawn` (sectioned) -> section 3 checkpoint slot when
   `canWalk` to the host, else beside the host; `allowTeleport(3)` before `accept`, so the jump is not clamped. The
   restore repeats; the state landing on it is excluded (`JOIN_RESTORE_M`, checked before `restoreStep` deletes it),
   then met -> watch ends.
- Old-match first state that moved >= 3 m while waiting (not into the start area): not a reload; the held restore it
  triggers arrives after `start` (lost); the reload is then placed and `place` overwrites the held restore. Correct.
- R3 host restart (`prev` null): the old-match first state is placed, its restore never reaches the old match (step
  4), the reload jumps off it and is placed again. Correct. (Even a coincidental old-match meet is harmless today:
  Sector Ops has no `resumeBay`, so an R3 restart is section 1; Course restarts in the client's start airlock.)
- New-tab rejoin / late join: placed on the first state (prev = held feet >= 3 m away, or null). Correct.
- In-flight skips: `sendBack` -> `moved(HALL_BACK_HOLD 3 s)` (coopHost.ts:1600), `reviveOne` with a spot -> 2 s
  (coopHost.ts:602), `onRespawn` -> `respawned` (2 s). These are the only host-sent teleports (`revive`, `back`,
  `restore`); `restore` is covered by `JOIN_RESTORE_M`.
- P1: fixed by the start-area condition (a kept-up client is placed only when it now stands in its start area, where
  the placement is the checkpoint or wanted). P2: `onRespawn` calls `respawned` for each partner it moves
  (coopHost.ts:1622): the join / held restore stops and cannot pull the partner back. A held (away) remote in a
  sectioned mode also loses its stale held restore at a restart, which is right (its rejoin goes to the checkpoint).

## Rules
- Wire: protocol.ts untouched, `PROTOCOL_VERSION` 43 before and after; no new message or field.
- Single player: no file outside `src/net` imports `src/net`; `joinWatch.ts` is in `src/net` and imports only
  `core/mathx` and `game/spawnSlots`; `spawnSlots.ts` imports only `core/mathx`.
- Hot path: per pstate the new code is `Map.get` plus scalar maths (`JoinWatch.state`, `joinIsReload` loop,
  `restoreStep`); no allocation. `late`, `place`, `joinSpot` allocate once per hello / placement. `hyp2` only.
- No graphics state read (slot yaw from `cam.yaw` is the player's heading, pre-existing, check B polish 2).

## CHECK-B polish
- 1: `slotSpawn` runs `besideLoose` only when `probe.floor` finds nothing under the area's first point
  (spawnSlots.ts:121). With physics down `ballistics.clear` is true, so floor is false and the loose try runs; with it
  up a failed strict search falls to the first point (blocker parts the bodies). Right.
- 3: `validateCourse` insets airlock `spawns` by 0.3 m (courseDef.ts:344-347); ctcourse data still validates (27/27).
- 6: the stale `courseStartPos` comment is gone (spawnSlots.ts:53).

## The two items left open
- **P5 (reload within 3 m of the held spot): not a way into item 7.** The reload then lands where the client was held
  (its own start area), which is where it stood before the drop; the held restore (if not already met) brings it to
  that same spot.
- **Restart / `back` in the reload's 2-3 s window: a real but rare way back into item 7 (Sector Ops).** While the
  client loads, its host copy is unheld, alive and static. A host restart (`onRespawn`, e.g. everyone down after guards
  shoot the static copy) moves the copy to the checkpoint and sends `revive`, which the loading client never gets (old
  CoopClient released, new one not built). If the reload's first state arrives within 2 s (3 s for a hallway `back`
  on a copy left in the camera hallway), it is skipped as in flight; later states are continuous, so it is never
  placed: section 1 while the host is in section 3. Needs a restart in that window during a load: rare, so non-blocking.
  One-line fix, polish item 1 below.

## Polish (non-blocking)
1. joinWatch.ts:128/134: let a state after a load gap bypass the in-flight skip (a running match does not go 1 s+
   without a state, so a post-gap state is never a stale pre-teleport one):
   `const gap = p.lastT < 0 || now - p.lastT > JOIN_GAP_S;` ... `if (now < p.quietUntil && !gap) return out;`.
   Closes the open item above. A joinWatch test: `respawned` then the reload 1 s later after a 5 s gap -> placed.
2. joinWatch.ts:62: `hold` does not end an open watch. A second drop while a placement restore is still unmet keeps
   `placed` true; on the next rejoin the old match meets the new held restore and closes the watch (joinWatch.ts:161),
   so that reload is unwatched. Needs an unmet placement restore at the second drop (normally met in ~0.5 s): rare.
   Fix: `this.pending.delete(id)` in `hold`.
3. A laggy kept-up client keeps its watch open indefinitely (every 1 s+ gap restarts the 30 s). Harmless (placement
   only into its start area); optionally cap the watch at e.g. 120 s from `late`.
4. The first-state resync goes out on the old match's first state, after `start`, so a page-open client loses it while
   loading; periodic snapshots (2 s at most) cover it. Optionally resync again on JOIN_PLACE.
5. docs/systems/coop.md:83: "plays on where it is, even when it moved 3 m or more in a gap" - add "unless it now stands
   in its start area (then placed at the checkpoint)", as REPORT.md says.
