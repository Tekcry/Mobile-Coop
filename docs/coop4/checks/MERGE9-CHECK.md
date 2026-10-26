# coop4 check: merge 9 (90b73d267, origin/master train 135 = de237b275)

**FIX**

Checker: fresh Opus. Head 90b73d267 (parents d150ed1d5 coop4, de237b275 master; merge base f1cddbc2d). Scope: the
merge commit only. Files both sides touched since the base: `src/net/protocol.ts`, `src/game/sectors.ts`,
`src/game/modes/sectorMode.ts`, `src/game/teamMoves.ts`, `src/game/teamController.ts`, `src/game/gameState.ts`,
`src/world/maps/campusS5Data.ts`, `src/world/maps/campusV2/s5Data.ts`, `tests/sectorGuardTags.test.ts`,
`scripts/e2e-sectorops.mjs`, `TESTING.md`. Master did not touch `coopHost.ts`, `coopClient.ts` or `coopUi.ts`.

## FIX
1. The mission reads a player's team from his list index, not his coop4 slot
   (`src/game/mission/sectorMission.ts:661-667`, master's file, auto-merged unchanged).
   - Problem: `slotOf` returns the index in `g.playerRefsInto(refs)`. Under coop4 that list is in slot order but leaves
     out OUT operators and held (dropped) players, and slots can have gaps (`SlotTable`: a held or rejoining player keeps
     his slot). `teamForSlot` (`missionDef.ts:446`) splits teams by slot parity (0, 2 = A; 1, 3 = B).
   - Breaks at 3-4 players: three players on slots 0 / 1 / 2. Slot 1 goes OUT (`sectorMode.ts:1590`) or drops, and
     slot 2's player now reads index 1, so he moves to team B mid-section. His kills (`sectorMode.ts:1562` ->
     `mission.kill`), gadgets (`onRemoteGadget`, `sectorMode.ts:1650` <- `coopHost.ts:879`), interrogations and takes
     now count against B's rules. A B rule break then restarts B's mission state (`restartSection('b')` ->
     `restarted('b')`), not his team's. The same `onEnemyKilled` already reads his fixed slot for the rating sync
     (`slotOfId`, `sectorMode.ts:1572`), so the two disagree within one call.
   - `players()` (`:661`) also counts the same list. Two OUT out of three drops it to 1, so `teamForSlot` gives
     `'all'` and the one player left breaks both teams' rules.
   - Fix (smallest): `slotOf: (id) => slotOfId(g, refs, id, 1)` and `players: () => teamSizeOf(g, refs)`. Both are
     exported from `sectorMode.ts:210` / `:220`, and `slotOfId` maps '' to 'local'. Either import them (a runtime cycle
     sectorMode <-> sectorMission that only calls functions, so it is safe) or move the two helpers to
     `game/playerSlots.ts`. Add a unit test with a fake `SectorMissionHost` / refs on slots 0 / 2 / 3: slot 2 stays
     team A when slot 1 is OUT or held.
   - Left for the owner (not a merge issue): if slot 1 leaves for good and two stay on slots 0 / 2, fixed-slot parity
     puts both on team A. Today's list index splits them A / B, but only by letting teams shift as above. Pick one rule
     (fixed parity, or rank among the session's slots counting held players) and write it next to A9.
   - Dark today (`flags.missions` off; master's co-op mission start `sm` and the client mirror are not wired yet), but
     the switch-on is set for 2026-10-27, so fix it in this train rather than after.

## A. Conflicts the lead resolved

### protocol.ts
- `git diff de237b275 90b73d267`: only coop4's own delta (slot on `PlayerInfo`, `slotFromList`, `SECTOR_MAX` /
  `capacity`, `wireNum` / `snap*`, per-slot jammer lists, `bye.mode`, `ot`). `PROTOCOL_VERSION = 73` is master's.
  coop4's `MAX_PLAYERS` comment is kept.
- `sectorExtra` parses `ot` (1..15, dropped outside) and then master's `ms` (`parseMissionWire`). The two are
  independent keys, and both are optional.
- Master's `gused`, `sm` on `start`, `TMOVE_KINDS` / `TEAM_KINDS` and kit `lx` / `lz` / `l` are all present unchanged.

### sectors.ts `SectorNetExtra`
- `ot?: number` and `ms?: MissionWire` are both present. Master's `missions` on `SectorBolt`, `SectorBolts.fitted` /
  `unfit` / `rebolt` and `checkSectors(..., mode)` auto-merged next to coop4's hunks.

### sectorMode.ts
- Section load (`:838-846`): a slot spawns only on `guardForTeam(slot, teamSize) && (!mission || mission.spawns(i, k))`.
  Both gates are by guard index, and coop4's tags are appended, so a mission's `slots` lists keep master's base indices.
  A mission entry with no `slots` spawns the tags at 3-4 players as before. `slotEnemy[k]` indexing is unchanged.
- Response loop (`:1147-1153`): `campaign` is read once per alarm, and `campaignResponseKinds(this.teamKinds, nt)` runs
  after each team's `responseTeam`, before its kinds are read (`j < nt`). Every team is all armed in a campaign mission,
  which matches master's single-team intent. There is no allocation (a boolean and the in-place kinds).
- Net extra (`:1643-1646`): `rh`, `ot`, `ms`, each only when set. `onRemoteGadget` (`:1650`) is kept. coop4's
  `onRemoteJam` with its slot is kept.
- Every other master hunk landed: `bindSectorMission` / `applyMissionStart`, the campaign `maxAlive`, `deviceAt`,
  `team.build(mission id)`, `stageActions(.., live)` + `releaseDogs`, mission begin / banner / feed / `gate()` /
  `cameraAlarm` / `extracted` / `restarted(team)` / `tick` / `kill`, `!mission.holding` on `exitStep`, `skipped`,
  `campaignGrant`, debug, `objectiveLines`, dispose.
- `restartSection(team?)` keeps coop4's `clearOut()` after master's `restartT = -1`. A team-rule restart is a whole-world
  restart, so bringing everyone back from OUT is right.
- `complete()`: master's `mission.extracted()`, then coop4's `returnOut()`.

### tests
- `tests/teamMovesTaken.test.ts`: the table is typed on `BuiltinTeamKind`, which is right. `checkTeamRequest` returns
  `taken` on `bBusy` before the kit branch (`teamMoves.ts:89`), so kit kinds are covered by the same first line. Their
  own rules are tested in `tests/kit/*`.
- `tests/sectorGuardTags.test.ts:276`: campus s5 base hash `9abada6e`. Master's only S5 change is #19's
  `post: { leash: 1, lookout: true }` (base guard, index 18; both `campusS5Data.ts` and `v2/s5Data.ts`). The count is
  still 24, the tags are still appended, and the history comment is kept.

## B. Auto-merged hunks in coop4-touched files
- `teamMoves.ts`: master's `BuiltinTeamKind` / `KitKind` / `TEAM_KINDS`, `KIT_CHECKS`, `crouch`, throw sites, alongside
  coop4's `bBusy` / `taken` / `inOpenMove`. The order is right: `taken` comes before rate / dead / kit.
- `teamController.ts`: coop4's only hunk (the `taken` refusal line, `:1149`) sits in master's reworked controller. Kit
  denials go through the same `denied()`.
- `gameState.ts`: master's `TeamMoveKind`, `armDoors(nav)`, `team.resetKit()` on `checkpointReset`, `team.dispose()`.
  None of these assume a player count. coop4's `playerRefsInto` (slot order, OUT / held left out) and `teamSize()` are
  unchanged.
- `coopHost.ts` (coop4 only, now carrying master's wider `TeamKind`): typechecks. See Polish 1 for the kit kinds in
  coop4's busy map.
- Mission wire with 4 players: `MissionWire.st` is per team (a / b / all), not per player, so nothing is sized to 2
  slots. `ruleTracker` / `missionRunner` read only `players > 1` / `<= 1`. `viewer()` is slot 0 (the host). The only
  slot-0/1 assumption is `slotOf` (FIX 1).
- Per frame: nothing new allocates. The mission's `tick` / `slotOf` walk the reused refs array.

## Runs
- `npm run typecheck:fast`: clean.
- One `npx vitest run` of tests/mission (4 files), tests/kit (3 files), teamMoves, teamMovesTaken, sectorGuardTags,
  sectorOut, net, sectorTeamScale, protocolConst, responseWiring, alarmRepeat, dogRelease, sectorObjectives: 19 files,
  447 passed.

## Polish
1. Kit moves in coop4's busy map (`coopHost.ts:1225-1231`, `:1217`). `teamMark` gives `pull` / `shutter` an open-ended
   (`Infinity`) entry. `teamBusy` frees an open entry 1 s in unless `inOpenMove`, which knows only HANG_SUB / ROPE_SUB.
   So a held shutter or a pull-up partner reads free to a third player after 1 s, and `taken` does not protect it.
   This does not matter yet: master's host does not run kit moves at all (`onTeamMove` builds `land` only for
   throw / hang / rope, so `checkPullRequest` always returns `noTarget`; no `paired` / `teamPairs` for kits, no `crouch`
   in `teamSide`), the same as on master. When master wires the kit into the host, coop4 must make `inOpenMove` (or a
   kit-specific test) count `KIT_SUB_MASK` poses and set the kit pair so `hangEnd` clears it. Note that in the
   coop4 BRIEF / next merge's watch list.
2. Campaign player cap. G2's `campaignStartBlock` runs only on the solo autostart (`main.ts:478`). In co-op the cap
   came from `capacity('sector') = 2` on master; under coop4 it is 4. No campaign mission exists in the data yet, and
   master's co-op mission start (`sm`) is not wired. When it is, the lobby start must apply `campaignStartBlock` with
   the room's count (or `capacity` must take the mission), or a campaign mission runs with 3-4 players.
3. `gused` (frag / mine / sticky cam) parses but neither `coopClient` sends nor `coopHost` handles it (master's NET
   work, not this merge). When it lands, route it through the same slot-correct `remoteGadget` path as FIX 1.

## Lead fix round (FIX 1)
- `teamSizeOf`, `refSlot`, `slotOfId` moved to `src/game/playerSlots.ts` (pure; `import type` GameState), re-exported
  from `sectorMode.ts` (no runtime cycle sectorMode <-> sectorMission).
- `src/game/mission/sectorMission.ts` host: `players: () => teamSizeOf(g, refs)`, `slotOf: (id) => slotOfId(g, refs, id, 1)`.
- `tests/sectorTeamScale.test.ts` "the mission reads fixed slots": slots 0 / 2 listed with slot 1 OUT or held, team
  size 3: slot 2 stays team A; plus a source check on the two host lines.
- Runs: typecheck clean; sectorTeamScale, tests/mission (4), playerSlots, sectorOut, net, charMates: 10 files, 229 passed.
- Owner rule left open (check's note): two players left on slots 0 / 2 both read team A under fixed parity. Goes to the
  coop4 BRIEF watch list with Polish 1-3 (kit moves in the busy map, campaign cap at 3-4 in co-op, `gused` by slot).

## Re-check (head 196d303a0)

**FIX**

Checker: fresh Opus. Scope: commit 196d303a0 (the lead's FIX 1 round) only.

### FIX
1. `slotOf('local')` now reads team B when the host is OUT (`src/game/playerSlots.ts:203-208`, bound at
   `src/game/mission/sectorMission.ts:665`).
   - The old host returned 0 for 'local' / '' without looking at the list. `slotOfId` maps '' to 'local' and then
     looks it up in `playerRefsInto`, which leaves the local ref out while he is OUT (`gameState.ts:1181`). Not found,
     it returns `none` = 1, so the host's mission events read slot 1 = team B.
   - Reachable at 3-4 players: the host goes OUT while his own gadget is still live. Gas clouds, mines and frags all
     credit `attackerId: 'local'` (`gadgetSystem.ts:313`, `:588`). A KO or kill from them after he is OUT reaches
     `mission.kill(ko, 'local')` (`sectorMode.ts:1544`), and a no-kills / no-bodies rule breaks for team B, so
     `restartSection('b')` restarts the wrong team. The old code got this case right.
   - Fix (smallest): in `slotOfId`, return `g.localSlot` for 'local' / '' before the list walk (`localRef.slot`: 0 on
     the host, the client's own slot on a client). This is pure and allocates nothing. It also fixes the same read in
     the rating sync (`sectorMode.ts:1554`). `onPlayerOut`'s `slotOfId(.., id, -1)` (`:1574`) is unchanged for
     'local', because it already read `localRef.slot` while he was listed.
   - Test: in `tests/sectorTeamScale.test.ts`, list only `player('c', 2)` (local OUT) with team size 3, then
     `slotOfId(gs, [], 'local', 1)` and `slotOfId(gs, [], '', 1)` must be 0. The fake has no `localSlot`, so give it
     one, as `GameState` does.

### Checked, fine
- Remote ids: `refSlot` reads `TeamRef.slot`. `CoopHost` sets it at add (`coopHost.ts:434`) and on every table
  change (`:266`), so a listed remote reads his fixed slot, not his list place. An id that is not listed (OUT, held or
  unknown) still reads 1, as before. No remote event reaches the mission while he is unlisted: `gadget` is refused when
  `!r.alive` (`coopHost.ts:876`), and remote shots and takedowns need a live sender.
- `players`: `teamSizeOf` -> `g.teamSize()` -> `CoopHost.teamSize()` = 1 + remotes, held included. OUT players stay in
  `remotes`, so the team size no longer drops when someone goes OUT or is held, and `teamForSlot` keeps every
  connected player's team. The mission now agrees with the mode's own team size (`sectorMode.ts:431`, `:820`).
- Callers in src/game/mission: `kill` (`sectorMission.ts:434`), `remoteGadget` (`:444`) and `intel` (`:461`) use
  `slotOf`. `begin` / `tick` (`:347`, `:475`) use `players`, then `runner.players` / `tracker.players` (`> 1` /
  `<= 1` reads, `teamForSlot`). `viewer()` (`:339`) stays slot 0. The local `gadget` event uses `listen(.., () => 0)`
  (`:707`), the host's slot. None of them depended on list-index semantics apart from FIX 1 above.
- 2 players on slots 0 / 1, both connected: `slotOf` gives 0 / 1 and `players` gives 2, the same as before. Single
  player: `teamSize()` = 1 -> 'all', the same as before. One change: a 2-player client who drops and is held now
  keeps `players` at 2 (teams A / B kept) where it used to drop to 1 ('all'). This matches A10 (connected + held)
  and the mode's guard spawns. It reverts to 'all' once the hold is released. Not a fix.
- `playerSlots.ts`: imports are `import type` only (PlayerRef, GameState, MoveState), with no Babylon and no
  `src/net`. Runtime importers are sectorMode and sectorMission (one-way), and protocol / session as before. There is
  no new runtime cycle, and `gameState.ts` takes only types from it. The `export { refSlot, slotOfId, teamSizeOf }`
  in `sectorMode.ts:207` keeps the test's old import path working, and typecheck passes. No allocation: the per-tick
  `players()` is an optional call.
- New tests: "sectorMission binds players / slotOf ..." (the source regex) fails on the old code. "slot 1 OUT or
  held ..." calls only `slotOfId` / `teamForSlot`, which the fix did not change, so it passes on the old code too. The
  regex is the only guard on the binding. That is acceptable, but FIX 1's test should also go in.

### Note (not this fix, master's code)
- A client's gas / flash runs on the host through `remoteEffect` -> `detonate` -> `hit()` with `attackerId: 'local'`
  (`gadgetSystem.ts:351`, `:588`). Its knock-outs count as the host's (slot 0, team A) in `mission.kill` and in the
  rating sync. Add it to the coop4 BRIEF watch list with Polish 3 (`gused` by slot).

### Runs
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/sectorTeamScale.test.ts tests/mission tests/playerSlots.test.ts tests/sectorOut.test.ts`:
  8 files, 122 passed.

## Lead fix round 2 (re-check FIX 1)
- `slotOfId` (`src/game/playerSlots.ts`): 'local' / '' return `g.localSlot` (0 on the host, the client's own slot)
  before the list walk, so an OUT host's live gadget credits his own slot / team (also the rating sync,
  `sectorMode.ts:1554`). `onPlayerOut`'s lookup reads the same slot as before.
- Test (`tests/sectorTeamScale.test.ts`): local not listed (OUT), team 3: 'local' and '' read 0; with `localSlot` 3
  they read 3 (team B).
- Runs: typecheck clean; sectorTeamScale, tests/mission (4), playerSlots, sectorOut, charMates, net: 10 files, 230
  passed. Exactly the re-check's suggested fix and test; verified by the lead, no third round.
- Watch list for the coop4 BRIEF (next merge / switch-on): Polish 1-3 above; the two-left-on-slots-0/2 team rule; a
  client's gas / flash run on the host credits `attackerId: 'local'` (the host, team A).
