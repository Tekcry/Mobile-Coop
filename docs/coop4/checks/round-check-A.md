# coop4 round check A (Opus, fresh): f685cb21..aabc5a31

Range: f685cb21 (net-check M1 open-move fix, reviewed as part of the round) through aabc5a31: fa9e7de9 (AI5 wiring),
bf3a8441 (sweep source by team size), b9d3a5f1 (OUT, M1 b), aab8f4f0 (STATE / changelog), aabc5a31 (e2e `sections()`).
Read in a detached worktree at aabc5a31. Focus A: behaviour and rules.

## Verdict: FIX (1 must-fix, one line)

Everything else passes. 1-2 players: no change found (rules, wire, fallback path, sweep source). Marlow Yard: empty diff.

## Checks run
- `npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors (42 warnings, all already there).
- vitest `--maxWorkers=2` under slot lock 1: sectorOut, teamMovesTaken, sectorTeamScale, sectorGuardTags, sectors, net,
  netSim, coopRejoin, coop* (Fix, GuardAi, GuardCarry, Perception, Torches, WalkFixes), courseMarks, ctcourse* (dir +
  3 files), responseWiring: **29 files, 987 pass, 1 skipped, 0 fail**.
- `node --check scripts/e2e-sectorops.mjs`: OK. No e2e, build or GPU run.

## Must-fix

**F1. An OUT player who is held (dropped) when the connector cycles comes back as a downed body nobody can revive, and
the next connector never cycles** (`src/net/coopHost.ts:629`).
`SectorMode.returnOut` clears every id from `outs` / `g.outIds`, then `CoopHost.returnOut` skips held remotes
(`if (r && !r.held)`). The held player stays `alive = false`, but it is no longer OUT. When it rejoins, `resume()` puts
its ref back in `remoteRefs`, so it counts as a downed player in `playerRefsInto`. Its revive point and revive clock
were dropped at `goOut`. A7 needs every listed player inside the connector, and its `restore` puts it back at the held
spot in the previous, unloaded section. The team is stuck until everyone dies or the host restarts from the pause menu.
This is easy to trigger: a player reloads the tab while out, and the team cycles the connector during the reload.
Exact fix: on line 629, revive held ones too, as `onRespawn` already does for held remotes at a restart:
```ts
if (r) back.push({ id, slot: r.ref.slot });
```
The loop below already calls `joins.respawned(id)`, which drops the held restore, so the rejoin is placed at the
checkpoint by the late-join path. It then calls `reviveOne(id, p)`, which gives full health and puts the body on the
slot point. Add a sectorOut case: a held OUT remote at `returnOut` is revived and its restore is dropped.

## Focus results

### 1. OUT (M1 b): PASS apart from F1
- Rule: `onPlayerOut(id)` waits only when `outWaits(teamSizeOf(g))` is true. That uses `g.teamSize()`, which is
  1 + `remotes.size` on the host, so held players count (A10). The threshold is `SECTOR.outWaitsMin` 3.
  - With 1-2 players, or a call without an id, the code reaches the old banner and `restartT` unchanged.
  - The goOut HUD line is unchanged at 1-2. `g.outIds` stays empty, so `playerRefsInto` is unchanged.
  - The station heal loop now goes by id and skips 'local'. That is the same as the old loop from index 1, because
    the host on slot 0 always sorts first.
- Restart only when nobody is up. I traced each path:
  - `onPlayerOut` returns while `anyPlayerAlive()`. Held players are not in the list.
  - `onRemoteDeath` and `onLocalDeath` fall to `onPlayerDeath` once `anyoneUp` is false. OUT and downed players are
    dead, and held ones are excluded.
  - Team 3 with one OUT and one downed: the last player going down restarts the section.
  - One OUT and the downed player's window expires: that player goes OUT and the last one plays on alone.
- Return: it runs in `connEvents` on `CONN_UNLOCK_FAR`, after `run.advance()`, so `checkpointSpawns` is the new
  checkpoint. Each player goes to its own slot through `slotSpawn`, clear of the players up and of each other.
  - Health: `reviveOne` resets health on the remote and on the host's own target. The client's `revive` event calls
    `target.revive()`.
  - The extraction calls `returnOut` first in `complete()`.
- Loadout and grant ordering:
  - Host: `restoreCheckpoint` runs at the moment of going out. At the connector the order is `returnOut`, then
    `giveGrant`, then `beginSection` (the record).
  - Client: `onSector` handles `ot` first and restores on the 0 to 1 edge while dead. The rating and grant come next,
    then the `ls` record (`markCheckpoint`, no alive condition).
- Restart clears OUT: `clearOut()` runs at the top of `restartSection` (pause-menu restart included), and `onRespawn`
  revives every remote that is down.
- Host out: 'local' is marked. `isOutRef` uses `localRef.id` 'local'. The host gets the OUT line, the loadout restore,
  `followStep` on the remotes that are up, and `reviveOne(selfId)` at the return.
- Leave and rejoin:
  - Rejoin before the connector: the player stays OUT. It is dead and marked, so it stays out of the list.
  - Rejoin after the connector while held: F1.
  - A leaver (`removeRemote`) stays in `outs` until the next return. See polish P1.
- Wire: `ot` is spread only when `outs.size > 0`, which never happens at 1-2, so that message is unchanged. The parse
  (`protocol.ts:721`) reads a 0..15 mask and keeps it only when > 0. A missing `ot` reads as 0 on the client and clears
  the mask.
- Client: the `outSelf` getter is `slotOut(outMask, slot())`. The HUD line shows at `coopClient.ts:604`, after the
  downed and course branches.
  - `followStep` runs in `fixedUpdate`, skips avatars that are dead or OUT, and reads `swapNext` (Next weapon).
  - It clears `followFeet` and the follow state as soon as the player is alive again or not OUT.
  - `Player.frameUpdate` (`player.ts:355-383`) points the camera and `world.frame` at the followed feet. Look input
    turns the camera, and there is no free camera.
- Rating: `coopRating(net, refs + outs.size)` at the rating (`CONN_UNLOAD`, before the return): OUT counts like a down.
- Guards: an OUT player is out of `playerRefsInto`, so it is not a target and `fill` skips its face. `GameState` is
  built per match, so `outIds` cannot leak into a later Course match.

### 2. Open-move fix (f685cb21): PASS
- The climber is `a` (the requester, `by`) for both hang and rope. `checkTeamRequest` requires `b` to be the one
  offering (brace + HANG_SUB / ROPE_SUB).
- Every climber state (`hangDown`, `hanging`, `hangPull`, `hangDrop`, `ropeClimb`, `ropeTop`, `ropeSlide`) is wire
  `boost` with the HANG / ROPE sub (`teamController.ts:1153-1172`). So `inOpenMove` stays true for a live move.
- Each client-side end leaves the open entry within the 1 s grace:
  - downed or dead: `alive` false;
  - let go: `hangDrop`, then ground;
  - partner gone and no reply: the climber's controller ends, so the pose leaves `boost`;
  - the e2e `leg` cleanup;
  - a held climber: `hold()` already runs `teamClear`.
- The check runs lazily on a request (`coopHost.ts:1067`). Timed moves are unchanged.
- `teamClear` now also drops the pair's `teamPairs`. The `end` / `hangEnd` handlers read `other` before they call it,
  so the `tend` relay is kept.

### 3. AI5 wiring vs Guard AI's final sketch and the real API (421509bb): PASS
- The real `EnemyManager` signatures match the structural `ResponseHooks`:
  - `setResponseShape(over | null)`;
  - `shapeResponse(stage, perStage, out): ResponseShape {teams, size}`;
  - `newTeam(section, override, routes, posts, spread = 3)`.
- `ResponseShapeOverride {extraPerPlayer?, splitAt?}` matches `SectorResponseShape`. `responseTeamSize` is an exact
  copy.
- `raised()`:
  - It passes the UNSCALED `base` to `shapeResponse`. `want` is only the gate.
  - There is one cap: `capReinforce(sh.size, base, maxAlive - alive - pending)`.
  - It makes one `newTeam` per team with spread `alarmMax * teams`, where `teams = max(1, min(sh.teams, send))`. That
    equals `sh.teams` except when the cap leaves 1 guard.
  - Each team's members are queued together. `fill` calls `joinReinforcement` then `joinTeam` per guard.
- The two scalings never both apply. With the hook, `send` comes from `sh.size`. Without it, `send` comes from `want`.
- `setResponseShape(s?.responseShape ?? null)` is in `loadSection`, before any early return. It runs at the start, at
  the connector (`CONN_LOAD`) and at a restart (`:1279`).
- Fallback path: identical to f685cb21 (one team, `size = send`, `newTeam` without a spread, the same slot and kind
  indexes; `want` 0 still sends 0).
- Hook at 1-2 players: `responseShape` gives `size = floor(perStage)` and 1 team, `want` is `perStage`, and the spread
  is 3 (the default), so the result equals the fallback.
- The size-0 return comes after the banner and stage gear (noted in STATE). The effect is the same: nobody is sent and
  no team is made.

### 4. sweepSource: PASS
`sweepSourceOf(guards, players)` skips dogs and guards with `!guardForTeam`. At 1-2 the tagged guards (`minPlayers`
3 / 4) are left out, so the list is master's untagged list with master's iteration. It is cached per `run.teamSize`.

### 5. Marlow Yard: PASS
`git diff --stat` over `src/game/course`, `src/game/modes/courseMode.ts` and `src/world/maps/ctcourse*` is empty, both
for the range and from the merge-base with master. `COURSE_MAX` is 2. The course paths in `goOut` and the client HUD
are unchanged.

### 6. e2e part 9: PASS (logic only, not run)
- Syntax is OK.
- Every hook it reads exists:
  - `__sector.debug().out`, `.restarts`, `.restarting`, `.index`, `.phase`;
  - `net.outSelf` (getter), `net.follow.slot`, `player.followFeet`;
  - `net.reviveClock.cap` / `.used`, `g.isEnded`, `playerRefsInto`;
  - the `coop4` helper's `leg`, `skip`, `idxOf`, `ids`, `moveTo`, `posOf`, `allowAll`, `boxSpot`.
- The legs follow the paths traced above: out with no restart, refs 2, then the follow cycle; the connector with
  slots 0 and 1, then the return beside the host at full health; all down or out, then the restart that clears OUT.
- `run-e2e` adds part 9 to `PARTS` with an 1800 s part timeout.

## Polish (no block)
- P1. An OUT player who leaves for good (`removeRemote`) stays in `outs` / `g.outIds` until the next return. Its slot
  bit stays in `ot`, and `outs.size` still counts in the rating. A late joiner on that slot reads `outSelf` true. If it
  goes down revivable, it gets the follow view while it waits for its revive. Fix: tell the mode on a leave, or drop
  the id from `outs` in `returnOut` / on `onPlayerLeft`.
- P2. Every connected operator OUT, and the last one up drops (held): nothing restarts until it rejoins (it plays on)
  or the 10 min hold ends (`removeRemote` restarts). Arguably fine. To restart at once, add
  `if (this.g.outIds.size && this.g.mode && !this.g.anyPlayerAlive()) this.g.mode.onPlayerDeath();` after
  `coopHost.ts:509`. `outIds` is always empty at 1-2 and in the course.
- P3. Stale holder: if a climber's open move ends with no message and it at once starts another hang or rope with a
  different holder, the first holder stays `taken` until that second move ends. `inOpenMove` reads the climber, not the
  pair. Fix: also treat the entry as over when `teamActive.get(e.climber)?.mate !== b` (for `b !== e.climber`).
- P4. With the hook present, Guard AI scales by `players().length` (the players up and listed). It does not use A10's
  session size. So a held player or an OUT player gives no extra, and a mid-section late joiner adds one at once. This
  is Guard AI's rule; note it in A9 / A10.
- P5. A rejoining OUT client whose first `sector` message arrives before its down state skips the
  `restoreCheckpoint`. The HUD line and follow still work. Rare.
- P6. While OUT, the host's and client's `swapNext` press also reaches `PlayerWeapons` if it steps while dead (not
  checked). Cosmetic.
