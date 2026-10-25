# coop4 release check B
Owner: Guard AI Build. Status: history.

VERDICT: PASS

PR #317 "coop4", feature/coop4 head 3100d035856a6b110a595148783b34fbe9fd07ed (merge base d91d0e00, master 4.95.0).
Checker B (Opus 5.5), independent of Checker A. Read-only in C:/NightShift/Mobile-Coop-coop4.

## Fix round items (3100d035)
1. Parts 7-9 named only - DONE. `scripts/run-e2e.mjs:49` `PARTS['e2e-sectorops']` is now `1`-`6`; `PART_TIMEOUT`
   (:26) keeps 1800 s for `:7`-`:9`. Checked with `--list`: a full run and `--list e2e-sectorops` give `:1`-`:6` only;
   `--list e2e-sectorops:7 e2e-sectorops:9` names them. Quick / affected go through the same `expand`, so they never
   pick 7-9. testing-tools.md:47-48 says the same.
2. OUT documented - DONE. coop.md now has the OUT bullet under "Four-player Sector Ops" (`outWaitsMin` 3, `outIds`,
   `playerRefsInto`, `OutFollow`, `ot` mask, `returnOut`, restart when nobody is up), the team-scale bullet and the
   `goOut` line both separate 1-2 players (restart) from 3-4 (OUT). These match `sectorOut.ts`, `SectorMode.onPlayerOut`
   / `returnOut` / `clearOut` / `onPlayerLeft` and `CoopHost.goOut` / `returnOut`. testing-tools still has no bullet for
   part 9 (polish 1).
3. Rejoin place - DONE. Changelog and testing-tools part 8 now say a rejoin gets its slot and colour back and is placed
   at the checkpoint on its slot (3.2 m). That is the code: `joinSpawn` (`src/game/spawnSlots.ts:227`) sends a sectioned
   run to the checkpoint and never reads `held`. coop.md:186 says the same.
4. D4 as a hook - DONE. `NetSession.roomCap` defaults to 0 and nothing in `src` sets it (only `tests/net.test.ts:981-993`
   does). `cap` is `capacity(mode)` until something sets it, so join, start, the listing and the lobby work as before.
   The changelog ("Groundwork ... nothing sets it yet") and coop.md:33 now say it is a hook. G2 still holds: the
   campaign is `course` (`coopUi.ts` `MODE_OPTS`), `COURSE_MAX` 2, and master has no campaign mission in Sector Ops.

## Checks run
- `git diff --stat d91d0e00..origin/feature/coop4`: 78 files, +7235 / -287. No change in `src/game/course/`,
  `courseMode.ts`, `ctcourse*` or `src/ai` (BRIEF limits, A27).
- vitest (`--maxWorkers=2`): sectorOut, sectorTeamScale, net, coopRejoin, sectorGuardTags, spawnSlots, snapBudget,
  joinWatch, ctDevicesSlots, teamMovesTaken, sectionRating, beaconSlots: 12 files, 338 pass. campusS1-S5, sectors:
  6 files, 220 pass.
- `node scripts/run-e2e.mjs --list` (full, `e2e-sectorops`, `:7` / `:9`), as above.
- `git merge-tree origin/master origin/feature/coop4` (master 4e5e9959, 4.103.5): conflicts in 4 files (see Findings).
- Read BRIEF (Michael said / picked, A1-A27, M1), PLAN slices, VISION table (G2, G48, G308, G328, G331, G332, G362),
  the bible lines (54, 636, 663, 982), coop.md "Four-player Sector Ops", the changelog fragment, the TESTING.md 4-tab
  item and e2e-sectorops part 9.

## Findings
- Intent: matches. Sector Ops (both maps) takes 1-4 players (`SECTOR_MAX` 4) and Marlow Yard / the campaign stays
  exactly 2 (G2, G48, G308). M1 (b) "Wait for connector" works as Michael picked: at 3-4 players an operator who is out
  follows a teammate, with the switch-target input (`swapNext`) to change who, and the line "Out - you rejoin at the next
  connector". Guards and the connector ignore him. He comes back at the next connector or the extraction, on his slot,
  with full health and the section loadout. The section restarts only when nobody is up. 1-2 players are unchanged
  (`outWaits`). Part 9 checks each of these steps.
- Guard counts (G331 "keep scaling", G362): the base lists are untouched (a team of 1-2 faces master's guards; the
  campus tests pin each base list). Each section has two tags, `minPlayers` 3 and 4 (16 in all), and the alarm extras
  are capped at `SECTOR.maxAlive` 32 (G332). Master is still on the pre-G328 campus counts (S1 has 8 guards), so the 15 /
  18 / 20 / 25 / 26 re-greybox is a later job. It will need to keep or redo these tags (note for that job, not coop4).
- Docs against code: changelog, coop.md (slots, `SecWire` arrays, `taken`, bandwidth table, beacons, lobby, team
  scale, OUT) and TESTING.md match the code I read. The strings exist as written ("Your partner is busy with someone
  else", "Room is full" / "Room full", `OUT_LINE`), and so do Normal 2 / 3 / 4 syringes and the late-join placement
  (checkpoint, else beside the host).
- Release note (not a branch fix): #317 no longer conflicts only in `src/net/protocol.ts`. Against master 4.103.5 it
  conflicts in four files:
  - `src/net/coopHost.ts`: the import line, and the guard snapshot line at the merge's :1782, where master's
    `markIntel(es, hasInfo(e))` (client intel) must be kept inside the rounding. `snapEnemyState` rounds in place and
    keeps `in`, so `this.round ? snapEnemyState(markIntel(es, hasInfo(e))) : markIntel(es, hasInfo(e))` works.
  - `src/net/protocol.ts`: master `PROTOCOL_VERSION` is now 63, not 55 as guard-ai STATE says.
  - `docs/systems/coop.md`: 3 hunks; keep coop4's text.
  - `docs/systems/testing-tools.md`: 1 hunk; keep master's six parallel parts and add coop4's "`:7`-`:9` named only".
  Master has also changed about 150 lines of `src/net` since d91d0e00 (client intel, lamp-round fixes, section bake).
  Parts 7-9 are now outside every full or affected run, so the train's own e2e will not cover 3-4 players. Before the
  release counts as green, run `e2e-sectorops:7`, `:8` and `:9` alone on the train merge head.

## Polish (non-blocking)
1. docs/systems/testing-tools.md:229-232 lists "Parts 7 and 8" and "`:7` (or `:8`)" only. Add a part 9 bullet (3 pages,
   campusOps: slot 2 out, the connector cycles with 0 + 1, slot 2 back beside the host at full health, then everyone
   down or out restarts) and `:9` in the run line.
2. src/main.ts:332: the Co-op menu entry still says "Two players with a room code" (A23 wording; Sector Ops takes 4).
   A new room is Campaign (cap 2), so a 3rd friend gets "Room full ... its 2 players" until the host picks Sector Ops.
   The text could say so.
3. TESTING.md: there is no manual OUT item for Michael's 3-tab walk (one player out at 3, follow view, back at the
   connector).
4. docs/systems/coop.md:251 says "(OUT below)", but the OUT bullet is above (:175). coop.md:237 says the lobby shows
   `capacity(mode)` seats; the code uses `NetSession.cap` (the same value until `roomCap` is set).
5. src/net/coopUi.ts:87: the client's "Room full" text reads `capacity(session.mode)`. Once something sets `roomCap`,
   this text will name the mode's cap, not the room's. Fix it when the hook gets a user.
6. scripts/e2e-sectorops.mjs:21: run directly with no `--part`, it still runs parts 7-9 with the others. run-e2e always
   passes `--part`, so this only affects a direct run.
