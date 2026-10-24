# coop-rejoin-2: check A (polish 1, the load-gap bypass)

Fresh Opus checker A. Diff `f13b91e7..8c4c650b` (feature/coop-rejoin-2). Read: agent preamble, RECHECK.md ("The two
items left open", polish 1, 2, 5), REPORT.md "Follow-up batch (coop-rejoin-2)", `src/net/joinWatch.ts`, the callers in
`src/net/coopHost.ts` (`joinStep`, `restoreStep`, `resume`, `hold`, `reviveOne`, `onRespawn`, `sendBack`, `receive`
pstate), `src/net/remotePlayer.ts` (`accept`, `revive`, `moveTo`), `src/net/session.ts` (`away` / `late`),
`src/net/coopClient.ts` (`fixedUpdate` send, `revive` / `back` / `restore` handlers), `src/core/bgTick.ts`.

## Verdict: PASS

No blocker. The bypass widens one rare window (below, polish A1); in Course and Sector Ops (the modes of walk item 7)
its outcome is a second placement on the same checkpoint slot the revive used, so nothing is put wrongly there. In
the other modes it can, rarely, restore a revived client to its held spot. Non-blocking by the brief's bar (needs a
1-2 s state gap inside a ~50 ms window, during a 2-3 s teleport window, within 30 s of a rejoin).

Tests: `tests/joinWatch.test.ts` 13/13, `tests/coopRejoin.test.ts` 12/12, `tests/spawnSlots.test.ts` 19/19,
`npx tsc --noEmit -p .` clean. No e2e (desktop rule).

No allocation on the per-state path (`joinWatch.ts:132` one `const` boolean; nothing else changed in `state`). No wire
change (`src/net/joinWatch.ts` is the only `src` file in the diff; `protocol.ts`, message shapes and
`PROTOCOL_VERSION` untouched). Polish 2
(`hold` ends the watch, `joinWatch.ts:67`) is sound: `session.ts:196-199` emits `late` on every hello while playing, so
a rejoin after `away` always opens a fresh watch.

## Normal-play paths checked (gap > `JOIN_GAP_S` while a teleport is in flight)

- **Revive at a checkpoint restart, the client stalls 1-2 s right after its last pre-revive state (path X).** The
  client sends stale state S at O just before the `revive` reaches it; the host gets S inside the revive's teleport
  grace (`remotePlayer.ts:272`, 1.5 s), so `r.feet` = O. A client long task or a client->host stall of 1-2 s then falls
  between S and the first post-revive state at p. That state is a gap state, so it skips the in-flight check, and
  `joinIsReload(O, p)` is true when p is in the start area, 3 m+ from O, and no restore is near (`respawned` deleted it):
  `JOIN_PLACE`. Before coop-rejoin-2 the quiet window (2 s) skipped it.
  - Course / Sector Ops: p in the start area means the checkpoint is the start; `joinSpot` gives the checkpoint slot
    (same area, same slot index as `onRespawn`), so the restore is met on the next state. Harmless double place; the
    watch then closes (placed + met), also harmless (a running match, its reload already done).
  - Other modes (mission, infiltration, clear; their first checkpoint is usually the map spawn = start area):
    `joinSpot` returns the HELD spot (`spawnSlots.ts:231-233`) for a client held before its rejoin. The restore then
    pulls the revived client from the respawn back to where it stood before its drop, for up to 30 s. Wrong placement,
    but needs: rejoined within the watch, died, a team wipe, and the 1-2 s stall landing exactly between S and the next
    state (one 50 ms send interval). Stalls over 2 s did this before the change too.
  - Camera hallway `back` (`HALL_BACK_HOLD` 3 s, `moveTo` grace 3 s): the same shape, only if the entry lobby's send-back
    spot lies within 4 m of a start point. Not checked against map data; the lobby is mid-level on the marlow maps.
- **A stale post-gap state (path Y):** the client hitches 1 s+, the `revive` arrives during it, and Chrome runs the
  starved frame before the queued message task, so the first post-gap state is pre-revive at O. `prev` is p (the host
  moved its copy at once), so it places only if O itself is in the start area and 3 m+ from p. Same outcome split as
  above; indistinguishable from the intended case (a restart during the load), so accept.
- **Revive carry / partner revive:** `reviveOne` with `at = null` calls no `moved` (no in-flight window) and leaves the
  copy where it lies; no jump. Not affected.
- **Down / out client:** it keeps sending at `SEND_HZ` 20 (`coopClient.ts:946-951`), so a down or revived client makes
  no 1 s gap by itself.
- **Hidden tab:** `bgTick.ts` worker ticks at 30 Hz with a 0.1 s step cap, so states keep flowing; no periodic 1 s gaps.
- **Host hitch:** `this.time` is sim time (capped steps), and a burst of queued states lands at one host time: only
  the first can be a gap state, the rest are `now - lastT = 0` and stay in-flight-skipped.
- **Section load:** a restart's events and the `revive` come in one snapshot, handled in one `receive` task before the
  next `fixedUpdate` send, so the first post-restart state is post-teleport (no jump from p): safe even after a long
  restart task.

## The test step change (`tests/joinWatch.test.ts:154`)

Not a hidden regression of real play: a real revive does not make a 1.5 s state gap (the client sends at 20 Hz while
down and after the revive; the old 1.5 s step only placed the state inside the 2 s quiet window). But the edit removed
the only coverage of a 1-2 s gap inside the in-flight window, which is exactly path X above, and the current code
places in that case (the stale S accepted, then a gap state into the start area). See polish A1.

## Polish (non-blocking)

A1. `src/net/joinWatch.ts:132-141`: bypass only when the gap began before the teleport went out (the client was silent
    when the host moved it, i.e. loading), not when a state arrived after the teleport and the gap followed. One number
    on `Pending` (no allocation): set `p.movedT = now` in `moved` (`:107-110`), then
    `if (now < p.quietUntil && !(gap && lastT < p.movedT)) return out;` with `lastT` the value before `p.lastT = now`
    (`lastT < 0` counts as before). The restart-during-load test (`:97`) still places (last state 4 s before
    `respawned`); add a test for path X: `respawned`, stale `send(8, 10)` after it, `c.t += 1.1`, `send(2, 12)` -> 0.
    Closes the other-mode held-spot yank and the hallway variant.
A2. `docs/systems/coop.md:84-85`: "then placed at the checkpoint" holds for Course and Sector Ops only; other modes
    place at the held spot, else beside the host. Suggest "(then placed as on its reload)".
