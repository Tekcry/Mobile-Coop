# coop4 net + devices + rules batch - Opus check

Head checked: `origin/feature/coop4` 77bbdd6f (N0 + TM + H1 / L1 + D1 + N1 + SM + integration + E2E parts 7-8), in a
detached worktree. Read only. Later commits (DATA tags, docs) are not part of this check.

## Verdict: FIX

One must-fix (a stuck "taken" state after a hang-down / rope that ends without a host message). Everything else
passes: Marlow Yard has zero diff and keeps its 2-slot outputs, the wire parse is bounded, no hot-path allocation was
added, and single player imports no `src/net` statically.

## Runs (slot lock `sr-slot-1`, CPU checked first)
- `npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors (42 warnings, all old, none in coop4 files).
- vitest `--maxWorkers=2`: 35 files, 1000 passed, 1 skipped (an old skip). The files: net, coopRejoin, snapBudget,
  playerSlots, ctDevicesSlots, teamMovesTaken, beaconSlots, sectorTeamScale, sectionRating, courseMarks, jammer,
  jammerFixes, ctcourse, ctcourseGreybox, ctcourseLight, tests/ctcourse/*, every coop*, netSim, protocolConst,
  visionIsolation, sectors.
- No e2e, build or GPU (as briefed).

## Must-fix

**M1. A hang-down or rope that ends without a host message leaves both players "taken" for good** (`src/net/coopHost.ts:1025-1049`).
`teamMark` gives `hang` / `rope` `until = Infinity`. That entry is cleared only by `hangEnd` / `end` through
`onTeamMove`, a hold, or a leave. Several client ends send nothing to the host:
- a downed or dead player: `TeamController.fixedUpdate` calls `end(true)` (teamController.ts:190-192);
- "hang: holder let go" (`dropNow`, :612-615);
- "hang: partner gone" and "rope: partner gone" (:328-331, :561-564);
- "no end reply" (:340-343, :573-576);
- the e2e `leg` cleanup (`g.team.end(true)`).

After any of these, each of the two players keeps an entry naming the other. A third or fourth player who asks
either of them for a team move is denied `taken` until those same two team up again. At 2 players this does no harm
(the mate always matches). At 3-4 it breaks a teammate's team moves after an ordinary event, such as the hanger being
shot while hanging.

Exact fix, all in `coopHost.ts`:
1. Import `HANG_SUB` and `ROPE_SUB` from `'../game/teamMoves'` (line 41).
2. The entry records its climber: `teamActive: Map<string, { mate: string; until: number; climber: string }>`. In
   `teamMark` (:1036), set `climber: a` on both entries (`a` = `by`, the one hanging or climbing).
3. In `teamBusy` (:1025), treat an open-ended entry as over once its climber is no longer in the move:
   ```ts
   private teamBusy(b: string, a: string): boolean {
     const e = this.teamActive.get(b);
     if (!e) return false;
     if (e.until <= this.time || (e.until === Infinity && !this.inOpenMove(e.climber))) {
       this.teamClear(b);
       return false;
     }
     return e.mate !== a;
   }
   /** (coop4 A20) A hang-down / rope still runs while its climber is alive and posed in it (`boost` + HANG_SUB / ROPE_SUB). */
   private inOpenMove(id: string): boolean {
     const s = this.teamSide(id);
     return !!s && s.alive && s.mode === 'boost' && ((s.sub ?? 0) & (HANG_SUB | ROPE_SUB)) !== 0;
   }
   ```
   It runs only on a request, so nothing is added per step. The climber's wire state is `boost` + `HANG_SUB` /
   `ROPE_SUB` for the whole move (hangHold.ts:28, validate.ts:240, remoteAvatar.ts:617).
4. Optional, same hunk: in `teamClear`, also delete the pair's `teamPairs` entries when they point at each other. A
   stale `teamPairs` entry (old behaviour) can send a stray `tend` later.

Test: export the check as a pure helper, for example `openMoveLive(climber: TeamSide | null)` in `teamMoves.ts`, and
add cases to `tests/teamMovesTaken.test.ts`: the climber still `boost` + HANG_SUB keeps the holder busy; dead, ground,
or a missing climber frees it.

## Findings by check item

### 1. Marlow Yard unchanged (A27): PASS
- `git diff --stat origin/master...77bbdd6f -- src/game/course src/game/modes/courseMode.ts src/world/maps/ctcourse* src/ai`
  is empty.
- `capacity('course')` is `COURSE_MAX` 2 (protocol.ts). Sector is 4. Legacy modes stay `COOP_MAX` 4.
- Course `SecWire`: `wireLen()` is `max(2, highest slot in use + 1)`. A course has refs on slots 0 and 1 only, so it
  always sends 2. D1's recorded A27 test (`ctDevicesSlots`, 21 samples recorded against master) passes. The course's
  `onRemoteJam(tgt, eye)` takes `slot = 1` by default, the same ref as master's `[1]`.
- `SyncedDetector`: with players 0 and 1 only it is the master rule. courseMode passes only 0 or 1
  (courseMode.ts:1098). `sectionRating` and `courseMarks` tests pass.
- Snapshot rounding is gated by `this.round = mode === 'sector'` (coopHost constructor) at all three call sites (items,
  enemies, players). The course and legacy snapshots are unchanged.
- Course glow: `glowBySlot` gives host 0 = null (asset green) and remote slot 1 = cyan, the same as master's
  `setPlayerGlow` / `goggleSlot`. Beacons: host 1 and client 2, as before (setLocalSlot(1) gives 2).
- Lobby for 2: Campaign still shows 2 rows (`capacity`). The text changes are polish only (see P3).
- `playerRefsInto` is now slot-sorted. On a course host the order is [local 0, remote 1], the same as before. On a
  client the list is only [local] (`remotePlayers` is solo there).

### 2. Slot model under churn: PASS (no remaining list-order slot reads on the Sector path)
- Host: `slots.host(selfId)` at construction. `compact` never moves slot 0. Only the host calls `startMatch` from the
  lobby (coopUi.ts:629, 806, 880), so slots never move mid-match.
- Join: `assign` gives the lowest free slot after the `capacity(mode)` gate. A lobby leave or a hold's end calls
  `drop` -> `release`. A mid-match drop calls `hold` (the player stays in `players` with `away`, so the room counts
  it). A token rejoin goes `heldFor(tok)` -> `assign` (its own slot) -> `unhold`. The fresh connection's transient
  slot is released (session.ts:192-196).
- Tokenless hello: 1 held in a full room takes that slot (A18, as before). 2 or more held in a full room: the first
  gets the lobby once (`probed`), the next is refused. 2 or more held in a room that is not full: a new slot. A
  rejoiner's token hello then replaces it (existing R2 path; coopRejoin covers it).
- Late join: lowest free slot. A slot freed by a hold's end can be reused, which is correct.
- Every peer reads `PlayerInfo.slot`: `session.slotOf` / `selfSlot`, `CoopHost.slotOf`, `CoopClient.slot()`,
  `RemoteAvatar` beacon, glow, blips, spawns (`spawnPoint(slot)`, `onRespawn` slot order, `reviveAll`, `joinSpot`),
  `onRemoteJam` slot, and SM's `slotOfId`. Grep for `goggleSlot`, `setPlayerGlow`, `indexOf(id) + 1`,
  `remotes.size + 1`, `refs[1]`, `host ? 1 : 2`, `values().next()` and `[...keys()][0]` over src/net and the Sector
  path: only `courseRecordRevive` (course only) and the `remoteAvatar` fallback for an entry without a slot remain.
- The N1 rejoin fix is safe:
  - It never assigns or steals a slot (it only sends `lobbyMsg` to that connection).
  - It answers once per connection (`probed`, cleared on `peerLeft`).
  - A stranger's follow-up hello carries `tok: ''` and is refused. A wrong token is refused at once, with no probe.
  - A probed connection is not a member, so the host drops its gameplay messages (`players.has(from)`).
  - It does not flood: one lobby per connection.

### 3. Wire: PASS
- `secWire`: `j / ch / cd` are `Array.isArray`-guarded. The length is `max(2, min(MAX_PLAYERS, longest))`, and only
  up to 4 entries are read. Each entry goes through `id()` / `num(0, 10)`, and junk reads as idle. A huge or sparse
  array costs nothing.
- `PlayerInfo.slot`: `wireSlot` rounds and clamps a finite number to 0..3. Missing or junk is -1, then `slotFromList`.
  `bye.mode` is `oneOf(MODES)`.
- Rounding (1 mm / 1 mrad, `wireHp` keeps a living body above 0) applies only to the broadcast snapshot. The host's
  lag compensation, aim checks and nav use its own unrounded state. Clients use the snapshot for puppets, avatars,
  torches and interpolation:
  - `t` is the sender clock, and 20 Hz states are 50 ms apart, so 1 ms is fine.
  - `gph`, `mt`, `ax` and `az` at 1e-3 are fine.
  - The rating is host-side.
  - `packMoveState` copies `c` before `snapPlayerState` rounds it, so the source is never mutated.
  - No consumer needs more precision.
- Host-authoritative rules hold:
  - Clients send through `toHost`.
  - The host takes gameplay only from present, non-away members (session.ts:225).
  - Clients take authoritative messages only from `hostId`.

### 4. Team-move arbitration: FIX (M1)
- Set at `tstart` for both players (timed moves: their length + 0.5 s; hang / rope: open-ended).
- Cleared on `tend` / `hangEnd` (`teamClear`), on a hold (`removeRemote` path :515) and on a leave (:560).
- Timed entries expire lazily in `teamBusy`.
- A denial sets nothing, so there is nothing to clear. The claimant side is covered by `checkTeamRequest`'s
  `a.mode !== 'ground'` -> `busy`.
- `taken` is checked before `rate`, so a racing second claimant always reads `taken`. `tdeny.reason` parses
  `str(20)`.
- Open-ended entries can stick: see M1.

### 5. Devices per slot (D1): PASS
- `jam`, `jamId`, `want`, `wantAt` and `cool` are `PLAYER_SLOTS` arrays, allocated once.
- `fixedUpdate` steps each ref on its own slot with a bitmask. Duplicate or out-of-range slots are skipped. Slots with
  no ref, held ones included, idle.
- Laser touches run per slot.
- `onRemoteJam` drops a slot outside 1..3 and finds the ref by slot with no allocation.
- Pass zones, the hallway rule and scanners still take `n = min(2, refs.length)`. Sector Ops does not use them:
  `passZones` / `scanners` appear only in `ctcourse*` map data and `courseMode` (grep over src: no campus or
  warehouse hit). This is not a 3-4 player bug.

### 6. SM: PASS
- `syringesFor(preset, players)`: the preset + 1 per player beyond 2.
- `CoopHost` sets `reviveClock.cap` from `s.players.size` at construction. `SectorMode.opTeam` reads `g.teamSize()` in
  `start()`, which runs after `g.net` attaches (gameState.ts:923, then `enter()` :1164; remotes are added in the
  CoopHost constructor). Both read the same team.
- Reinforcements: `alarmStep` adds the extras. `raised` holds them to `em.maxAlive - alive - pending` through
  `capReinforce`; the section's own `perStage` still goes, pending as at 2 players. Cap 32 = `MAX_ENEMIES`.
- `minPlayers` is filtered in `loadSection` (start, connector, restart). The list index `k` is kept for desks and
  overhear.
- `teamSize` = 1 + `remotes.size` on the host (held included) and `players.size` on a client (connected + away).

### 7. Hot paths: PASS
- `playerRefsInto`: insertion sort, no allocation. `sortBySlot` runs on join, lobby and resume only.
- `onRespawn` uses a scratch array.
- ctDevices: bitmasks and no new arrays. `wire()` / `debug()` allocate per call, as on master.
- `refOfSlot` and `slotOfId` do not allocate.
- `localRef.mv` uses a reused buffer.
- The snapshot copies per player as before.
- The only `src/net` import from game code is `import type`. `visionIsolation` and `netSim` pass.
- `playerSlots.ts` imports types only.

### 8. E2E parts 7-8 hooks: no mismatch
Every hook the parts read exists on this head under that name:
- `GameState.localSlot` (getter) and `NetSession.selfSlot`.
- `PlayerInfo.slot` in `session.players` on host and clients.
- `CharacterRig.beacon` (private field, 0-3 = slot; the host's own is 0 from `setBeacon(1)`, a client's is set by
  `setLocalSlot`).
- `CoopHost.teamActive` (a Map; its size counts players, so 4 while two pairs run; lazy expiry, logged only).
- `SectorRun.teamSize` via `__sector.run`.
- `SquadSlot.minPlayers`.
- `net.revivesLeft()` and `net.sendJam`.
- CtDevices `sentId`, `sentT`, `localStep`, `wire`, `apply`.
- `__sector.restartCheckpoint`, `pairGateInfo`, and the `debug()` keys `index`, `phase`, `restarts`, `restarting`,
  `checkpoint`, `pending`, `crates`, `pairGates`, `live`.
- `team.lastDenied`, `team.count`.
- `__coop.leave`.
- e2e-net-lib's `setSimPages`, `onHostStep` and `hostStepResult`.

The scaled syringe count (Normal 2 + 2 = 4 at 4 players) matches `reviveClock.cap`. No fix is needed. The race and
timing risks are the ones the E2E report already names (forced jam claim, searched throw spot, the `taken` race).

## Polish (not blocking)
- P1 `coopHost.ts:225-226`: two near-duplicate `(coop4 A4)` comment lines; keep one.
- P2 `session.ts:426`: `startMatch` sends `start` before the lobby that carries the compacted slots. It is safe today
  because `GameState.create` is async, so the lobby lands before `CoopClient` reads `selfSlot`. Sending
  `broadcastLobby()` first would remove that dependence on timing.
- P3 Lobby strings shared with Campaign:
  - "Share the code to invite your teammates." and "its 2 players" (was "two") now show in the Marlow lobby too.
    This follows A23; flag it to Michael if Marlow's text must stay word for word.
  - Minimap ally dots in the course take the beacon colours (host blue, partner red) instead of `#3fc1ff`. This is
    H1 by design, but it is visible in Marlow Yard.
- P4 `coopUi.ts:483`: `renderPlayers` still sorts by host only. The session list is already in slot order, so sort by
  `p.slot` or drop the sort.
- P5 `gameState.ts:2041`: `localMoveState` now runs every fixed step in single player and on course hosts, where
  nothing reads `localRef.mv` until Guard AI lands. It does no per-step allocation, but its `delete out.gp` / `out.c`
  churn the object shape. Consider gating it on the AI reading `mv`.
- P6 `setPlayerGlow` (operators/runtime/playerFigure.ts) and `goggleSlot` have no callers left in src/net. Remove them
  or mark them as kept for later.
- P7 `run-e2e.mjs`: a full `npm run e2e` now expands `e2e-sectorops` to the 4-page parts 7-8 (1800 s each).
  Consider keeping them out of the default full run on the PC, or documenting that.
- P8 A stranger's tokenless hello in a full room with exactly one slot held takes that slot, its colour and its spot
  (A18 as written, unchanged from R2). At 4 players this is likelier than at 2. Worth a line in the playtest notes.
