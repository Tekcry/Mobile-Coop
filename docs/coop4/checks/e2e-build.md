# coop4 E2E build - 4-page harness and `e2e-sectorops` parts 7-8

Branch `feature/coop4-e2e` off `feature/coop4` 54eb4f26 (N0). Builder: Sonnet. Files: `scripts/e2e-net-lib.mjs`, `scripts/e2e-sectorops.mjs`, `scripts/run-e2e.mjs`. No src edits. Not run (the laptop runs it after integration); `node --check` clean on all three, and a `no-undef` / `no-unused-vars` lint pass over the two big files is clean (the one `indexedDB` hit is old code).

## Built
- `e2e-net-lib.mjs`: `LOAD_MS_4` (`E2E_LOAD_MS`, default 240000; `startMode` uses it when there are 3+ pages); `slotsOf(pages)` (each page's own slot: `GameState.localSlot` or `session.selfSlot`, null when absent); `eachPage(pages, fn)`; `slotTable(P)` (own id, each player's id / slot / host / away); `pumpPages(getPages)` (every page, a page whose rAF did not run steps headless; takes a function so a late page joins the pump); `joinLate(ctx, url, code)` (a late join of a running room). `hostAndJoin(url, 3|4)` now hosts the room in the 4-seat `sandbox` mode first (a new room is Campaign, cap 2: the 3rd page was refused, as e2e-coop's lobby caps block found) and waits 30 s for a joiner; two-page calls are unchanged. `startMode` message only reads "every page".
- `run-e2e.mjs`: `PARTS['e2e-sectorops']` adds `'7'` and `'8'`; `PART_TIMEOUT` gives those two parts 1800 s (default stays 600 s; `E2E_SUITE_TIMEOUT` still overrides). Note: a full `npm run e2e` expands `e2e-sectorops` and so now includes both 4-page parts; they are laptop-GPU, run-alone parts.
- `e2e-sectorops.mjs`: new runner `coop4(title, {n, map, params}, fn)` (host + joiners, `startMode('sector', map)`, host AI frozen, all pages pumped, `leg()` = a failed leg is reported with every page's `teamLog` and the next still runs, `skip(hook)` prints `SKIP: <hook> missing` and lists it at the end of the part). Parts 1-6 and `coop()` are untouched.

## Part 7 - campusOps, 4 pages (`--part=7`)
Chronological, one match. Legs; each check, the hook it reads, and whether the hook exists on the branches read (origin/feature/coop4 + -d1, -sm, -tm, -ui; N1 has not been pushed).

| Check | Hook read | Exists now |
| --- | --- | --- |
| all 4 pages load Sector Ops with a device mirror; one host, three clients | `__app.current.opts.mode`, `net`, `__ctdev.debug().role` | yes |
| slots 0-3 distinct across the pages, host is 0 | `GameState.localSlot` / `NetSession.selfSlot` | NO (N1) |
| every page's room list holds slots 0-3 once, own entry carries own slot, all pages agree | `PlayerInfo.slot` via `session.players` | NO (N1; N0 has only `SlotTable`) |
| each page sees 3 avatars | host `net.remotes`, client `net.avatars` (private map, read at runtime) | yes |
| beacon slot per page: own rig and each avatar's beacon index == slot, all four different | `CharacterRig.beacon` (private field; a `beaconSlot()` getter is used if one appears) | field yes (H1: 0-3); N1 must pass `slot + 1` (needs slots too) |
| spawns >= 0.9 m apart at the start and after a checkpoint restart; host's copy of each joiner within 1.2 m | `player.controller.pos`, `net.remotes.get(id).feet`, `__sector.restartCheckpoint()`, `debug().restarts / restarting` | yes (placement by slot is N1) |
| guards at team 4 = list less `minPlayers` above 4 (alive + pending), at the start, after the restart, and in the pair-gate section; tagged guards present | `__sector.run.teamSize`, `SquadSlot.minPlayers` on `world.map.sectors[i].guards`, `enemyMgr.alive`, `debug().pending` | `teamSize` and `minPlayers` field: SM branch (not integrated); the tags: NO (DATA) - prints SKIP, the count check still runs |
| slot 2 presses a wall switch: its circuit's lamps go dark on all 4 pages; the light under it agrees on all 4; pressed again, back on | `world.layout.switches`, item `switch-<k>`, `world.level.lights.lights[id].on`, `world.lightField.levelAt` | yes (needs 4-seat room: N1) |
| slot 3 jams a camera (claim forced on its page, sent as a real `jam` message): host `SecWire` has 4 entries and `j[3]` = the camera (read on the host step); every client's `apply` latched `s.j[3]` | `__ctdev.wire()`, `.apply`, `.localStep`, `.sentId / .sentT`, `net.sendJam`, `onHostStep` | yes on D1 branch (arrays of 4); N1 must accept 4 entries in `protocol.secWire` and pass the sender's slot to `onRemoteJam` (SM already forwards it) |
| crate: each slot uses it once (guns topped up; clients' prompt spent), a second use after a drain does nothing, host ledger lists all 4 | `__sector.debug().crates[].used`, items `crate`, `weapons.atLoadout()` | yes |
| slot 1 downed (host `applyDamage`), slot 3 revives it via `revive-<id>`; syringe pool = preset + 2 at 4 players (Normal 4), one used (3), slot 3 HUD shows it | `net.revivesLeft()`, `.hud-mode` "Syringes N", `opts.difficulty` | hook yes; the scaled value needs N1 to pass the team at `coopHost.ts:193` (SM noted it) |
| connector: objective done, 3 inside for 6 s sim does not cycle, the 4th inside cycles; host door locks changed and mirrored on all 4; all know the live section | `__sector.debug().index / phase`, `world.doors.list[].anchor.locked`, `__ctdev.debug().live` | yes (4-seat room: N1) |
| pair device by slots 2 + 3 while 0 + 1 stand > 3 m away: the campus pair gate (S4, reached by cycling S2 and S3 with all 4), both keys pressed in the same breath, gate opens on all 4 pages | `__sector.pairGateInfo()`, `debug().pairGates`, items `c-spg-<s>-<k>-a/b` | yes. No campus section has a `pair: true` bolt (the Warehouse bolts are plain); the pair gate is the pair device present |

## Part 8 - warehouseOps, 3 pages then a late 4th (`--part=8`, `sectorGuards=4`)
| Check | Hook read | Exists now |
| --- | --- | --- |
| slot 2 drops (`__coop.leave()`) and rejoins from "Rejoin <code>": same player id, slot 2 again (page and host list), same beacon colour (host's avatar and its own rig), put back within 1.5 m of where it stood, host has it back in play | `session.players.get(id).away / .slot`, `selfSlot`, `rig.beacon`, `net.remotes.get(id).held` | away / held: yes; slot, beacon: NO (N1) |
| a 4th page late-joins the running op: loads, host has 3 remotes, slot 3, lobby lists slots 0-3, it stands within 3.2 m of `debug().checkpoint`, has a loadout, wears beacon 3, every page sees 3 avatars | `joinLate`, `__sector.debug().checkpoint`, slots as above | join/checkpoint: yes (late join of a 4th: N1); slot / beacon: NO (N1) |
| pairs 0+1 (leg-up on the S1 C1 sill) and 2+3 (partner throw) both approved with no denials; slot 0 on the 4.4 m lip; all four back to `none`. A dry-run throw first picks an open-floor spot (host nav + upward ray) | `team.state / offer / count.boosts / count.throws / count.denied`, `enemyMgr.nav`, `ballistics.hitDistance` | yes. "At once" is logged (state overlap, host `teamActive` peak) but not asserted; |
| host active-move map | `CoopHost.teamActive` (Map id -> until, size 4 when both pairs run) | NO (N1 plans it; prints SKIP) |
| second climber on a busy brace: slots 0 and 2 both press RB on slot 1's leg-up; one is served, the other denied `taken` | `team.lastDenied === 'taken'`, `team.count.denied` | `'taken'` text and `checkTeamRequest` (TM branch); the host must pass `bBusy` (N1) |

## Missing hooks (for the lead: N1 / D1 / DATA add or confirm)
1. `GameState.localSlot` and `NetSession.selfSlot` (N1) - read by `slotsOf`.
2. `PlayerInfo.slot` on every page's `session.players` (N1).
3. N1 passes `slot + 1` to `setBeacon` for the own rig and each avatar, so `CharacterRig.beacon` equals the slot (the field exists; a public `beaconSlot()` getter would be tidier, the test uses it if present).
4. `CoopHost.teamActive` (Map, size 4 while two pairs run) - optional; only used to log the overlap.
5. N1 side effects the checks need: `capacity('sector')` 4 and a late join of a 4th into a playing room; `protocol.secWire` keeping 4 `j / ch / cd` entries (D1 builds them, N1 parses them); the sender's slot reaching `CtDevices.onRemoteJam` (D1 `slot` argument, SM already passes it); `coopHost.ts:193` `syringesFor(difficulty, team)`; `bBusy` passed so a busy brace is denied `taken`; held slot kept across a drop and given back with the token.
6. DATA: `minPlayers` tags in the campus / Warehouse guard lists (the check prints SKIP until one exists; the alive + pending == list-less-above-4 count check runs regardless).
7. SM (`__sector.run.teamSize`) is on `feature/coop4-sm`, not yet in `feature/coop4`; the check prints SKIP until it is.

## Notes for the laptop run
- Run alone: `E2E_GPU=1 E2E_LOAD_MS=240000 E2E_PORT=<port> node scripts/run-e2e.mjs e2e-sectorops:7` (and `:8`); no `--jobs` above 1.
- Rejoin uses `__coop.leave()` plus the main menu's "Rejoin <code>" (e2e-coop's path): the rejoin token lives in the tab's `sessionStorage`, so a closed tab would lose it; a page reload keeps it but the host only drops a silent page after 60 s.
- Known soft spots for the fix round: the jam claim is forced by wrapping the client's `localStep` (the aim / pistol path is e2e-ctcourse station 4's); the throw spot is searched, not fixed; the `taken` test races two real presses (either may win, the other must be denied).
