# coop4 master merge, check A (wire / authority)

Merge 1b04e5bd = afc616f0 (coop4) + d91d0e00 (master 4.95.0). Merge base a10382bc. Read-only check (Opus), 2026-10-24.

## Verdict: PASS (polish list only)

Nothing broken or unplayable found on the wire or the host's authority.

## How it was checked
- Lost lines: every line either side added since the merge base (src/net/*, sectorMode.ts, net.test.ts,
  sectorOut.test.ts, sectorTeamScale.test.ts) looked up in the merged file. Only 6 "missing", all intentional
  combinations (coopHost.ts protocol import, `bodyItems` push through `snapItem`, sectorMode `guardForTeam` + `look`,
  one comment rewording). Files only master touched (bodyCarryNet, carryView, clientCarry, shotHistory, puppetHead,
  enemyPuppet, keptBodies, lampSync, partnerTarget, remoteAvatar) are byte-identical to master.
- Resurrected lines: no line either side deleted (25+ chars) is back in the merge (old `interface Hist`, `hipY`,
  remote capsule, `ref.head = null` all gone as on master).
- `git show --cc 1b04e5bd`: the hand-resolved hunks are exactly the 7 in the commit message.
- vitest (named, --maxWorkers=2): net, coopCarry, coopRejoin, jointInterrogation, opticCoop, protocolConst, sectorOut,
  sectorTeamScale, shotOrigin, snapBudget, fourIntruders, bodyPos: 12 files, 268 tests pass. `typecheck:fast` clean.

## Master features, survived
- coopHost: carries map + `remotePickUp` / `remoteDrop` / `remoteHide` / `carryStep` / `bodyItems` / `carrierOf`
  (coopHost.ts:1632-1730); `use` routing for `drop-body`, `body-*`, `hide-*` (:817-830); `panel` -> `onPanel`
  (:827, :973); `td` kind `bluff` -> `onBluff` (:995), `jointBluff` / `jointLive` / `jointFor` / `bluffDist`
  (:183-193, :1048-1095); shot history via shotHistory.ts (`rewindHist` :1446, `recordHistory`); `trp` in the snap
  (:1769); `alertCode` passes `e.look` (G6n).
- coopClient: `ClientCarry` (:200), `carryMirror` / `takeUp` / `letGo` and the `dropAvatar` carry hand-off
  (:453-461, :1251-1310), kept-body heat (`keptAt`, `stampKeptBodies` :115, :1329), `dropBadOpticMove` (:486),
  `applyOpenTraps` (:528), `jointBluff` (:710).
- protocol: `DROP_BODY_ID`, `body` item kind with `e` / `by`, `panel`, `trp`, `AL_LOOK`, `OPTIC_POINT_MAX` parsing.
- remotePlayer: `PlayerHitVolumes` split, S1 sim body input (`wireBodyIn`, tense / kneel), alongside coop4's
  `TeamRef` with `slot` and `mv` (remotePlayer.ts:409, :420).

## Coop4 features, survived
Slots on the lobby wire, `capacity()`, `ot` OUT mask, `bye.mode`, j / ch / cd per slot, `snapEnemyState` /
`snapItem` / `snapPlayerState` rounding, `teamActive` / `teamClear`, `OutFollow`, `sortBySlot` / `glowBySlot`,
`intruderLeft`, `onPlayerLeft`, the 3-4 player restart on hold (coopHost.ts:543).

## Specific checks
- PROTOCOL_VERSION = 54 (master's), protocol.ts:362 region; coop4's wire fields kept; no test asserts a number
  (protocolConst.test.ts guards it). PASS.
- Requests from any slot 1-3: every host handler keys by the sender id / `r.ref.slot`, never slot 1 or "the
  partner" (only `courseRecordRevive` :693 maps to 0/1, course only, cap 2). PASS.
  Denials: held -> `pickupDenied` (held), carries dropped in `hold` / `carryStep`; OUT / down -> `r.alive` false in
  `remotePickUp`, `remoteHide`, `onBluff`, `onPanel`, `onTakedown`; leaving -> `removeRemote` drops all. PASS.
- Per-slot clear: `hold` (:523) teamClear, remoteDrop, bluffs.delete, seized released; `removeRemote` (:582)
  teamClear, intruderLeft, bluffs.delete, seized, remoteDrop before `r.dispose`; `goOut` (:635) bluffs.delete, carry
  already dropped in `onRemoteDeath` (:613). Client: `dropAvatar` drops views for the leaver. Optic pose lives in
  the remote's MoveState (goes with the remote). PASS.
- Snapshot size: snapBudget passes, steady 5953 B / 6144, worst 29381 B / 32768. PASS (see polish 1).
- snapItem on body items (merge A3): `snapItem` (protocol.ts:173) rounds x / y / z / yaw / hold / reach / hn in
  place, `e` / `by` untouched; 1 mm steps change nothing for the client's kept body. PASS.
- No static import of src/net outside src/net (only `import('./net/coopUi')` in main.ts). PASS.
- Hot path: the merge adds no allocation (`snapItem` mutates, `bluffs.delete` in hold / goOut only). PASS.

## Merge assumptions
- A1 goOut drops the bluff (coopHost.ts:639): correct. Redundant for remotes (`bluffDist` already returns Infinity
  for a dead remote) but also covers the host's own OUT entry; harmless.
- A2 hold drops the bluff (coopHost.ts:540): correct and needed: a held remote stays `alive`, so `bluffDist` would
  count its frozen feet and a held player's stale bluff could be spent at the next read.
- A3 body items through snapItem (coopHost.ts:1641): correct, keeps `e` / `by`.
- A4 test doubles: sectorOut.test.ts:412-414 only adds the `carries` / `bluffs` maps `hold` / `removeRemote` now
  touch; the four tests still assert what they claim. sectorTeamScale.test.ts:136 turns master's real
  `EnemyManager.shapeResponse` off so the "fallback (no shapeResponse)" test is the fallback again; the hooked tests
  set a stub. Still valid.

## Polish (non-blocking)
1. snapBudget.test.ts:70 `packAlert(...)` passes no look seed: with master's G6n look (al up to 65535, +2 chars a
   guard) steady is ~6017 B, 127 B under 6144. Pass `look = 127` so the test measures the real worst `al`; add a few
   `body` items (`e` / `by` set) and `trp` to the worst case.
2. No unit test asserts A1 / A2 (a held or OUT player's bluff is gone). A one-line `expect(h.bluffs.has('b'))` in the
   sectorOut.test.ts hold test would pin A2.
3. `onBluff`, `onTakedown` start, `onPanel`, `onUse` gate on `r.alive` but not `r.held` (a rejoining client before
   its first `pstate`). Pre-existing master pattern, a tiny window; `remotePickUp` already checks `held`.
4. coopHost.ts:589 comment "optional until feature/guard-ai-coop4 lands": it has landed (master's EnemyManager has
   `intruderLeft` and `shapeResponse`); the optional casts can go, and sectorMode's AI5 fallback path is now dead in
   production (only tests reach it).
5. Real `shapeResponse` counts live `players()` (held excluded) while `run.teamSize` is fixed at section load; a
   drop between load and alarm sizes the response smaller than the guards. Game-side, not wire; check B's call.
6. Per-id maps not cleared on leave (`assists`, `pingAt`, `gadgetAt`, `holdPulseAt`, `sendClocks`, `ctickLim`):
   pre-existing, bounded by player ids, harmless.
