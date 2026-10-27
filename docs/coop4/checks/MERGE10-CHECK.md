# coop4 check: merge 10 (85ef56df4 + b4343b7ec, origin/master 4.122.1 = 5e9f0947d)

**PASS**

Checker: fresh Opus. Head f3cb83463 (merge 85ef56df4: parents 36ca016c7 coop4, 5e9f0947d master; test fixes
b4343b7ec; build notes `merge10-build.md`). origin/master is fully contained (`merge-base --is-ancestor`). Conflict
hunks were read from `git show --remerge-diff 85ef56df4` and compared against both parents.

## FIX
None.

## 1. Conflict hunks: both sides kept

- `scripts/run-e2e.mjs`: master's `mission` part in `PARTS['e2e-sectorops']`, its comment row and `PART_SCRIPT` are
  kept. coop4's parts 10-12 comment row, the "named only" note, `PART_TIMEOUT` / `timeoutOf` (used at `:249` / `:254`)
  are kept. Parts 10-12 stay out of `PARTS`, and `e2e-sectorops:mission` keeps the 600 s default.
- `src/net/protocol.ts`: `PROTOCOL_VERSION = 74` (master's, `:25`). coop4's `MAX_PLAYERS` comment, `SECTOR_MAX`,
  `capacity`, `slot` / `wireSlot`, `snap*`, per-slot jammer lists, `bye.mode` and `ot` are all present
  (`git diff origin/master f3cb83463 -- src/net/protocol.ts` shows only coop4's delta).
- `src/net/session.ts`: every line master removed is a coop4 replacement (the slot-carrying `players.set`, the lobby
  message, the hello refusal with `bye.mode`). Master's `sectorMission` (constructor and `start`), `sm` on start,
  `campaign`, `cap`, `campaignBlock`, `startWhenUnblocked` / `autoOff` / `cancelAutoStart` (including on `setSettings`),
  `CAMPAIGN_ROOM`, and the `this.cap` reads in the tokenless-rejoin probe (`:218`) and the hello (`:244`) are present.
  The single `flags` import is master's line 2.
- `src/net/coopUi.ts`: the lobby status keeps master's campaign wording and `campaignBlock` line, plus coop4's
  "teammates" when `cap > 2`. The Start `blocked` is master's. `autoLocalCourse` combines `flags.players ?? 2` with
  `campaignBlock !== null`. `capacity` is imported again for coop4's "Room full" text.
- `src/net/coopClient.ts` `onSector`: coop4's OUT mask block closes before master's `ms` mirror block (the remerge
  adds the brace). The keys are independent. Master's `teamT0` / attempt keys, `gused` send, `missionRunning` /
  `viewer` / `missionObj` / `objectiveLines`, and `placeStart` with `sectorMission` are present. `viewer()` reads coop4's
  `selfSlot`.
- `src/net/coopHost.ts`: both imports are kept. `matchRevives` takes `players` (constructor: `s.players.size`).
  `kitPairs` / `pairT0` are kept next to coop4's `teamActive` / `teamBusy` / `teamMark` / `teamClear`. `hangEnd` / `end`
  keep master's `sameAttempt` + `unpair`, then coop4's `teamClear`. Master's `gused` handler (`:907`), `clientRead`
  (`:2059`), `endPairOf` on remote and local death (`:660`, `:2234`) and the campaign `addSyringes` guard (`:1005`) are
  present.

## 2. Builder's risky spots

(a) Kit busy rule (`coopHost.ts:1360`, `:1373`, `teamMark :1268-1274`). Both kit kinds are `paired`
(`pullUp.ts:270`, `shutter.ts:714`). `teamMark` gives them `t0 + PULL_PAIR_S / SHUTTER_PAIR_S + TEAM_BUSY_SLACK`,
which is never shorter than the kit pair's own `until` (`newKitPair`). A third player therefore cannot reach the
silent `unpairOf(partner)` while the pair lives. The entries are finite, so nothing can stay busy forever: at worst an
entry lapses in `teamBusy` (`:1260`), which also unpairs the stale pair through `teamClear`. Every end path:
- `kitHangEnd` over, `lapseKitPair`, `hangEnd`, `end`: all go through `unpair`, which drops both entries when they name
  each other.
- Down: `onRemoteDeath` / `onLocalDeath` -> `endPairOf` -> `end` with key 0 (`sameAttempt` accepts it) -> `unpair`.
- OUT: always passes through down first (`goOut` runs from the death paths).
- Drop: `hold` (`:577-578`) sends `end` and then `teamClear`.
- Leave: `removeRemote` (`:631`) calls `teamClear`.

A pull-up catch keeps the pair (`kitPairOver` false). The busy entry then runs to the pair's end too, and the partner's
late drop frees both.

(b) `unpair` freeing `teamActive` (`:1434-1437`) is guarded by the mutual mate check, so it never frees a third
player's entry. With `teamClear -> unpair` there is no recursion (`unpair` does not call back). The `teamClear(by)` after
`unpair` in `hangEnd` / `end` is now a no-op (Polish 2).

(c) `session.startMatch` (`:494-511`): the `overCapacity || campaignBlock` return comes before `phase` and before
`slots.compact`, so a refused campaign start (and the "Resume hosting" `startWhenUnblocked` retry, `coopUi.ts:834`)
leaves the slots and the phase untouched. coop4's old post-phase `overCapacity` return is gone (master's fix).

(d) `cap` = `min(roomCap, campaign ? 2 : capacity(mode))`. A campaign room is 2 whatever the `roomCap`. A 3-4 player
room switched to a campaign map shows `overCapacity` and the start is blocked. The hello refuses a new third player.

(e) `matchRevives(..., s.players.size)`: `campaignReviveCap` returns `CAMPAIGN.revives` (2) for a campaign mission
whatever the count. A non-campaign op gets `syringesFor(difficulty, players)`, as coop4 A4 had. The default `players = 2`
keeps master's callers and tests unchanged.

## 3. Other 2-player / list-index reads in master's new code
- `missionMirror.ts:13` `COOP_PLAYERS = 2` for the client's `MissionRunner`. The runner reads `players` only as
  `<= 1` (`missionRunner.ts:339`, `:403`), so 2 vs 3-4 gives the same result. Harmless, but the comment is stale
  (Polish 3).
- `CoopClient.viewer()` uses `missionViewerTeam(def, selfSlot, players.size)`, which is slot parity. Held / OUT
  players stay in the lobby list, which agrees with the host's `teamSizeOf`.
- `gused` -> `onRemoteGadget(r.id)` and `clientRead` -> `revealIntel(.., eid, by)` both pass the client id, which the
  mission maps through `slotOfId` (merge 9 fix). This closes merge 9 Polish 3 (`gused` by slot). Merge 9 Polish 1 (kit
  moves in the busy map) is closed by (a), and Polish 2 (campaign cap at 3-4) by master's `CAMPAIGN_ROOM` / `campaignBlock`.
- Master's other src changes in this window (guard AI, knife kill, lights, ctcourse sets) touch no player slot or
  player count. Their `slot` reads are guard slots (`blackoutSearchSlots`).

## 4. Protocol version
`PROTOCOL_VERSION = 74` on both origin/master and head. No test asserts the number: the tests read the constant, and
`coopCarry.test.ts:22` checks only that it is an integer.

## 5. Tests
- b4343b7ec adds fields to the fakes only (`teamActive`, `outMask: 0`, `selfSlot: 1`, a session `slotOf`). No
  `expect` line changed.
- The new kitNet case fails without the fix. Mutation 1 removed `bBusy` from `checkTeamRequest`: 1 failed / 20 passed.
  Mutation 2 removed the kit path's `teamMark` (`:1373`): 1 failed / 20 passed. The file was restored with
  `git checkout` after each run, and the tree is clean.

## Polish
1. `coopUi.ts:100`: the refused page's "Room full" text uses `capacity(session.mode)`, so a full campaign room reads
   "already has its 4 players". It was the same before the merge. When `bye` carries the mode, it could also carry the
   cap (or a campaign bit).
2. `coopHost.ts:1328`, `:1340`: `teamClear(by)` after `unpair(by, other)` is now a no-op (`unpair` clears the
   entries). Keep it or drop it; it does no harm.
3. `missionMirror.ts:12-13`: the comment "The co-op sector modes take two players" is stale under coop4. The value only
   gates `<= 1`, so a rename or a comment such as "any co-op count > 1" would be clearer.

## Commands and results
- `git show --remerge-diff --format= 85ef56df4 -- scripts/run-e2e.mjs src/net`: 6 conflicted files, all hunks read.
- `git diff origin/master f3cb83463 -- src/net scripts/run-e2e.mjs` and `git diff de237b275 5e9f0947d -- src/net src/game src/ai`:
  read.
- `npm run typecheck:fast`: clean.
- `npx vitest run` on every test matching `src/net/|playerSlots|game/mission/|game/kit/|kitNet|missionNet|teamMoves`:
  102 files, 2063 passed, 1 todo.
- Mutations on `tests/kitNet.test.ts`, as in item 5: each fails the new case only.
- Not run (brief): dev server, e2e, full `npm run check`.

## Merge 11 (lead, after this check)
Train 142 (4.123.0) landed while the check ran: one conflict, `PROTOCOL_VERSION` (master's 75 kept, coop4's
`MAX_PLAYERS` comment kept), the same pattern as merges 9-10. Auto-merged: coop-kit A1 rope descent in
src/game/teamMoves.ts / teamController.ts; it is a `rope` team move (not a kit kind, `isKitKind` coopHost.ts:1353), so it
goes through the existing team-move busy check. tsc clean; 73 net / playerSlots test files 1272 passed.
