# coop4 master merge check B - gameplay parity (merge 1b04e5bd = afc616f0 + origin/master d91d0e00, 4.95.0)

Checker B (fresh, read-only). Code walk of master's new co-op features at 3-4 players, plus coop4's flow with them.
No e2e, no dev server. Ran: `npm run typecheck:fast` (clean), vitest `--maxWorkers=2` BelowNormal on coopCarry,
jointInterrogation, opticCoop, remoteKneelTense, sectorOut, coopRejoin, spawnSlots, joinWatch, fourIntruders,
sectorTeamScale, playerSlots, net: 12 files, 297 pass.

## Verdict: PASS (no blocker)

Every new master feature is keyed by player id (or by guard / body id), never by "the one client" or a slot index, so
slots 2-3 take the same paths as master's slot 1. The merge's three ports (held bluff, OUT bluff, rounded body items)
are correct.

## Walk

| Item | Result | Where |
| --- | --- | --- |
| Slot 2/3 pick up: host accept | PASS | `src/net/coopHost.ts:1654` `remotePickUp`: `carries` keyed by `r.id`, `pickupDenied` reads that remote's alive / held / mv / feet; `taken` checks the host's own carry and every client's (`carrierOf`, :1647) |
| CarryView on every other page | PASS | Host: `coopHost.ts:1678` `CarryView(b, r.avatar)`. Items carry `by` = carrier id (`bodyItems` :1632, in pass 1 :1613); `isig` includes `by` (:1767), so a take / drop goes out at once. Clients: `coopClient.ts:1251` `carryMirror` -> `takeUp` (:1282) builds `CarryView` on `avatars.get(by)` for any carrier, host included |
| Hide | PASS | `coopHost.ts:1699` `remoteHide` per `r.id`; client: body gone from the list -> `views.hide()` / `carry.hostHide` (`coopClient.ts:1271-1278`) |
| Guards never find carried / hidden | PASS | Host-only `Body` state (`beginHoist`, `hide`); unchanged by coop4; snapshot `bodies` skips `hidden` / `carried` (`coopHost.ts:1765`) |
| Put down findable where drawn | PASS | `remoteDrop` (:1683) drops at the carrier's avatar side + `DROP_NOISE`; every client's `letGo` (`coopClient.ts:1298`) drops its view at the same avatar |
| Carrier held mid-carry | PASS | `hold` (:523) -> `remoteDrop(id)` at the frozen spot, then `bluffs.delete(id)` (merge A2); `carryStep` (:1712) also drops for `r.held` |
| Carrier down / OUT mid-carry | PASS | `onRemoteDeath` (:617) -> `remoteDrop` before `goOut`; `goOut` (:635) drops the bluff (merge A1); `carryStep` drops any carrier not alive. Host's own carry drops on death (`src/game/bodyCarry.ts:304`) |
| Carrier leaves | PASS | `removeRemote` (:582) -> `remoteDrop`; other pages' `dropAvatar` (`coopClient.ts:454`) drops the view; a later `by`-cleared item finds no view (no double drop) |
| No stuck carried flag | PASS | `CarryView.drop/letGo/hide` all `clear()` (`src/net/carryView.ts:58-89`); a body removed by restart / cap: `carryStep` `v.clear()`, client `dropBody` (`coopClient.ts:1332`) -> `carry.lost` |
| Bluff by a third player while another holds | PASS | `onBluff` (:1051): `holderOf` -> `assistHolder` (any holder: host hostage or any client's `seized`, bluffer != holder); `bluffs` keyed by bluffer id, so two hostages / two bluffers coexist; `jointFor` (:1084) never counts the holder; `bluffDist` Infinity for dead / gone. Client BLUFF row from `EnemyPuppet.partnerHeld` (guard state, not slot) |
| Optic kneel + cable per remote | PASS | `remoteAvatar.ts:175` rope key per avatar instance, `:443-458` cable from each avatar's own `mv`; host validates gap index per remote (`remotePlayer.ts:117`), client per snap player (`coopClient.ts:486`); OPEN TRAP per remote (`coopHost.ts` `onPanel`, `hostTrapKey` on its feet) |
| Client kill bodies at the host sim lie, all pages | PASS | `coopClient.ts:824-857`: lie from the puppet's last host state, fall away from `avatars.get(e.by)` (any slot's avatar), else own position |
| Rejoin to the checkpoint on its slot | PASS | Master changed none of `joinWatch.ts`, `spawnSlots.ts`, `spawnPlace.ts`; `joinSpawn` (`src/game/spawnSlots.ts:227`) sectioned -> checkpoint at slot; spawnSlots / coopRejoin / joinWatch tests pass (afc616f0 fix holds) |
| Rejoin does not resurrect a stale carry / bluff | PASS | Hold clears carry + bluff + seized; the reloaded page starts with an empty `ClientCarry` / `carriers`; a reconnect the host never saw drop: host's `by` = rejoiner with no kept body -> `takeUp` sends `drop-body` (`coopClient.ts:1286-1289`) |
| Marlow Yard stays 2 | PASS | `capacity` (`src/net/protocol.ts:44`) course = `COURSE_MAX` 2; `git diff d91d0e00 1b04e5bd -- src/game/course src/game/modes/courseMode.ts src/world/maps/ctcourse*` empty; course `goOut` path unchanged |
| Guard AI hooks after the merge | PASS | `sectorMode.ts:749` `setResponseShape` every load / restart; `:763` `guardForTeam` filter keeps master's `look: em?.lookOfSlot(s.id, k)` on the authored index; `:1002` `shapeResponse` at the alarm; `coopHost.ts:592` `intruderLeft` on leave; `ghostOf` (`enemyManager.ts:2890`) is a read for e2e / tests only, as on master |

## Polish list (not blockers)
1. No 3-4 player unit or e2e leg for carry, bluff or optic (the walk shows them id-keyed; master's tests are 2-player). A part 7 leg "slot 2 carries, slot 3 sees it on its shoulder, slot 2 goes down, the body lies on all 4 pages" would pin it.
2. A late joiner / rejoiner never draws a body that fell before its load (`coopClient.ts:1286` / `:624`): the host's guards can still find it, the page shows nothing there. Master's gap, more likely with 4 players joining in turn.
3. The bluff line (`JOINT_BLUFF_FEED`, `coopHost.ts:1064-1065`) and its doc say "both players see"; at 3-4 every page sees it (fine, wording only, A23).
4. `coopHost.ts:592` still casts `enemyMgr` for `intruderLeft` ("optional until feature/guard-ai-coop4 lands"); the method is now on `EnemyManager`, so the cast and comment can go.
5. `sectorMode.ts:201-204` `teamSizeOf` keeps its "TODO(coop4 N1)" though `g.teamSize()` exists.
