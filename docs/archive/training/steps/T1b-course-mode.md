# Step T1b - course mode, co-op sync, courselab (Block A)

Model: implementer opus, checker opus (src/net). Deps: T1a. Runs e2e-coop and e2e-netmove (touches src/net).

## Read
- CLAUDE.md hard rules (src/net only through the dynamic import behind flags.coop); docs/systems/coop.md (whole: 49 lines)
- docs/training/T0-facts.md reuse list (it supersedes the line numbers below where they differ)
- src/game/course/* (T1a); src/config/course.ts
- src/game/modes/gameMode.ts 1-82; src/game/gameState.ts 455-520 (mode switch :508-517), 865-880 (onPlayerDeath), 723 and 1236-1250 (respawn)
- src/game/interactables.ts 59-157; src/world/doors.ts 100-235; src/world/lights.ts (grep `setGroup`, `destroy`)
- src/net/protocol.ts 10-35 (version, NetMode, capacity), 145-200 (Msg), 412-470 (parseMessage), 490-497 (start mode check); tests/net.test.ts (grep `parseMessage`)
- src/net/coopHost.ts 290-330 (all down), 440-500 (use), 805-870 (items, doors, snapshot), 1040-1070 (onLocalDeath, onRespawn)
- src/net/coopClient.ts 200-270 (syncItems, doors), 180-235 (onSnap)
- src/net/coopUi.ts 245-270 (MODE_OPTS, lobbyModes); src/world/maps/index.ts (registration only); src/world/mapDef.ts 44-100
- scripts/run-e2e.mjs 20-60 (REQUIRED, COVERS); scripts/e2e-lib.mjs 83-110 (launch, openPage); scripts/e2e-coop.mjs (grep `net=local` for the two-page pattern)

## Task (decisions)
1. `ModeId` gains 'course'; `MapDef.modes` gains 'course'; gameState's mode switch builds `CourseMode` for it.
2. `src/game/modes/courseMode.ts` (GameMode): reads the map's course definition (an optional `MapLayout.course` field:
   `CourseDef` plus the squad slots by id); runs `CourseState` on the host (single player too, for tests); creates the
   interactables each gate needs (existing kinds `switch`, `door`, `terminal`, with labels and hold times); spawns a bay's
   squad when `bayStarted` fires; on everyone down (onPlayerDeath / the host's all-down path) calls `restart()`: respawns
   both players in the checkpoint airlock, respawns the bay's squad, resets the bay's light groups and breakables;
   shows radio lines through the barks path as LANTERN (radio bark), holding them while any guard is at level alert; records verbs into the per-player log from existing
   events (takedown, gadget, traverse attach kinds, team moves) and exposes it as `window.__course` for tests.
3. Door locks and anchor locks at run time: `Doors.setLocked(d, on)` (new, pure state on the door anchor) and an
   `AttachController` disabled-anchor set (one check in its probes), if T0 found them missing.
4. Co-op: `NetMode` 'course' with `capacity('course') = 2`; coopUi lists it (label "Training course") only for maps
   that list the mode; a third player is refused by the existing overCapacity rule. Message `course` (host -> all):
   `{ t: 'course', s: packed CourseState, locks: doorIndex[], anchors: id[], lights: { groups: [g, on][], dead: id[] } }`
   when changed or every COURSE_SEND; parseMessage case with clamps; a tests/net.test.ts case. Clients apply door locks,
   anchor locks and light state (groups on / off, destroyed lamps) to their own world. Client presses and holds go
   through the existing `use` message (the host checks reach). Drill ticks (DECISIONS C10): message `ctick` (client ->
   host, `{ t: 'ctick', verb }`, rate-limited to 4 per second) for local-only verbs (gear, stance, vision, ping, aim,
   reload, swap); the host ticks MoveState-visible and host-side verbs itself (traversal modes, team moves, takedowns,
   gadgets, gates). parseMessage cases and tests for both. PROTOCOL_VERSION +1.
5. `src/world/maps/courselab.ts`: a debug map (MAPS only, modes ['course'], not listed) of two rooms 8 x 8 joined by a
   6 x 6 airlock, then a strip with one example of each gate kind in a row (lever, bolt, hold, timedHold, pair, egress,
   mains with a lamp group, flag via a pickup, anchorLock on a ladder), each behind its own door; a short course def.
   Register in src/world/maps/index.ts after seclab.
6. `scripts/e2e-course.mjs`: two pages `?net=local&autostart=courselab&mode=course` (host and client): the airlock
   refuses one player, cycles with both, the near door stays locked; each gate kind works when the host acts and when
   the client acts; the client sees door locks and the lamp group change within 0.5 s; a forced both-down (damage) restarts
   the bay and both respawn in the airlock.
7. Dev solo flag (D21): `?course=solo` and a debug-menu toggle (F3 overlay, dev builds only): one player may cycle
   airlocks, work both halves of a pair gate, and his ticks count for both players. Never in the normal menus.
8. Friendly fire (D38): course mode turns team damage on for both players through the existing host-validated hit
   paths (the PvP `friendly` flags, `Hitboxes` on avatars, `PvpTarget`, blast checks) with co-op rules otherwise (a
   partner hit to zero is downed and revivable, never a PvP frag); e2e-course: a host shot and a client grenade down the
   partner, who is revived.
9. The course is offered only in the co-op lobby (D22): coopUi lists "Training course" for maps whose modes include
   'course'; not on the solo Play screen. Add to run-e2e REQUIRED and COVERS for src/game/course,
   src/game/modes/courseMode.ts and src/world/maps/courselab.ts.

## Checks
`timeout 900 npm run check`; `timeout 900 npm run build`; `node scripts/run-e2e.mjs e2e-course e2e-coop e2e-netmove`;
the checker adds `timeout 1500 npm run e2e:quick`. Grep proof: `grep -rn "from '../net\|from '../../net" src/game` is empty.

## Commit
"training T1b: course mode, co-op sync, courselab". Docs: docs/systems/coop.md (the course message and light state),
docs/systems/modes-and-progression.md (Course mode, two lines), CLAUDE.md module map (`game/` row: course), LOG, STATE.
