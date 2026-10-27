# coop4 merge 10 build (85ef56df4 + b4343b7ec, origin/master 5e9f0947d = 4.122.1)

Builder: Opus. Merge commit 85ef56df4 (parents 36ca016c7 coop4, 5e9f0947d master; base de237b275, train 135).
Master moved to 4.122.1 (trains 139-141) after the brief was written; the side that met coop4's net files is train 139's
mission (c) co-op net (88ca9ba04, 395576d8e, 638ef5620). Follow-up b4343b7ec: test fakes (merge fallout) and one test.

## Conflict hunks

### scripts/run-e2e.mjs (1 hunk)
- coop4: the `e2e-sectorops` comment row extended with parts 10-12 (named only, never expanded) and the "named only"
  note. Master: the `mission` part in `PARTS['e2e-sectorops']`, its comment row and `PART_SCRIPT`.
- Kept: both comment rows, master's `PARTS` (with `mission`) and `PART_SCRIPT`, coop4's note. coop4's `PART_TIMEOUT` /
  `timeoutOf` and master's `runOne` PART_SCRIPT spawn auto-merged side by side. Parts 10-12 stay out of `PARTS`.

### src/net/protocol.ts (1 hunk)
- `PROTOCOL_VERSION = 74` (master's), with coop4's `MAX_PLAYERS` comment (= `PLAYER_SLOTS`, `capacity(mode)`).

### src/net/session.ts (6 hunks)
1. Imports: coop4's `playerSlots` import + master's `MAPS` / `MissionDef` / campaign imports and `CAMPAIGN_ROOM`.
   coop4's second `flags` import dropped (master moved it to line 2).
2. Fields: coop4's `slots` (SlotTable) and `probed` + master's `autoOff`.
3. Constructor: master's `sectorMission` init, then coop4's `slot` on our PlayerInfo and `slots.host`.
4. Host hello: coop4's (slot assign, A18 probe, `bye.mode`). Master's only change there was `capacity(mode)` ->
   `this.cap`, which coop4 already had.
5. `cap` / `campaign` / `campaignBlock` / `overCapacity`: master's, with `cap` = `min(roomCap, campaign ?
   CAMPAIGN_ROOM : capacity(mode))` (coop4 D4 roomCap kept; both cap a campaign to 2).
6. `startMatch`: master's early return on `overCapacity || campaignBlock` before the phase change, then coop4's slot
   `compact`, then master's start with `sm`.

### src/net/coopUi.ts (3 hunks)
1. Lobby status: master's (campaign text, `campaignBlock` line), coop4's "teammates" when `cap > 2`.
2. Start button `blocked`: master's (campaign wording, `s.campaignBlock`).
3. `autoLocalCourse`: coop4's `flags.players ?? 2` + master's `campaignBlock !== null`.
- Non-conflict fallout: master removed `capacity` from the protocol import; coop4's "Room full" text uses it, so it is
  imported again.

### src/net/coopClient.ts (1 hunk)
- `onSector`: coop4's OUT mask block first (its comment says first: the loadout restore before the grant), then
  master's mission mirror block. Independent keys (`ot`, `ms`).

### src/net/coopHost.ts (6 hunks)
1. Protocol import: coop4's `snap*` + master's `type UseOnlyGadget`.
2. teamMoves import: union (`inOpenMove`, `isKitKind`, `OPEN_MOVE_GRACE`, `TeamKind`, `TeamMoveKind`), master's
   `kitMove` and kitNet imports, plus `PULL_PAIR_S` / `SHUTTER_PAIR_S`.
3. Revives: master's `matchRevives(...)` with coop4's player count (below).
4. Fields: master's `kitPairs` / `pairT0` + coop4's `teamActive` / `teamBusy` / `teamMark` / `teamClear`.
5. `hangEnd`: master's `sameAttempt` check and `unpair`, then coop4's `teamClear(by)`.
6. `end`: same, with master's kit-or-pair attempt key.

## Master's code adapted to fixed slots / 3-4 players
1. `coopHost.matchRevives` (master's new export) read `syringesFor(difficulty)` = the 2-player pool. It takes an
   optional `players` (default 2, so master's callers are unchanged) and the constructor passes `s.players.size`,
   as coop4's A4 line did. A campaign mission still gets `CAMPAIGN.revives` (2).
2. `coopHost.onTeamMove` kit path (`pull` / `shutter`, master's new branch) had no busy check and ran
   `unpairOf(partner)`: with 3-4 players a third player's kit request on a holder already paired would end that pair
   silently. It now passes `bBusy: this.teamBusy(partner, by)` (denied `taken`, as every other move) and calls
   `teamMark` after the pair is made. `teamMark` gives kit moves their pair's life (`PULL_PAIR_S`, `SHUTTER_PAIR_S`)
   + `TEAM_BUSY_SLACK`, so the busy entry ends with the kit pair's lapse.
3. `unpair` (master) also deletes the two players' `teamActive` entries when they name each other, and `teamClear`
   (coop4) ends a pair through `unpair` (so `pairT0` / `kitPairs` go too). Effect: master's `unpairOf` on a new move
   frees the old mate at once instead of leaving him busy until his entry expires.
4. No change needed, checked: `CoopClient.viewer()` (`missionViewerTeam(def, this.slot(), s.players.size)`) reads
   coop4's `selfSlot` and a players count that includes held / OUT players (the host's lobby keeps them), the same
   rule as the host's `slotOfId` / `teamSizeOf`. `CoopHost.firstPlace` (master) goes through coop4's `joinSpot` /
   `slotOf` (session slot table). `clientRead` / `gused` pass the client id to the mode, which maps it by
   `slotOfId`. `heldFor`'s `this.cap` was already coop4's.

## Test fallout (b4343b7ec)
- 16 failures after the merge, all master's `Object.create` fakes missing coop4 state: kitNet host (`teamActive`),
  missionNet `onSector` clients (`outMask: 0`), missionNet R6 client and missionNet3 client (`selfSlot: 1`),
  missionNet3 host (session `slotOf`, c1 on slot 1). No assertion changed.
- New: kitNet "(coop4 A20, merge 10) a third player cannot take a holder in a kit pair (taken); once the pair lapses he
  can".

## Runs
- `npm run typecheck:fast`: clean (after the merge and after the fix).
- `npx vitest run` on every test importing `src/net/` or `playerSlots`, plus `tests/mission/*`, `tests/missionNet*`,
  `tests/kitNet`, `tests/kit/*`, `tests/sectorTeamScale`: 81 files. Merge commit: 16 failed / 1389 passed; after
  b4343b7ec: 1406 passed.
- Not run (brief): dev server, e2e, full `npm run check`.

## For the checker
- Kit busy (adaptation 2-3): kit moves now count as busy for the pair's whole life (a pull-up ~ the haul, the shutter
  crawl + push + 3 s). The two partners re-pairing with each other is unaffected (`teamBusy` allows the same mate).
- `session.startMatch` order: block check (now before the phase change, master's fix), then compact, then the start.
  A campaign-blocked start never compacts.
- Two caps on a campaign room: master's `campaign` cap and coop4's `roomCap` (min of both). A client's "Room full"
  text still shows `capacity(mode)` (4 for Sector Ops) even for a campaign room: unchanged from before the merge.
- `matchRevives` reads `s.players.size` at attach (connected + held), as coop4 did.
