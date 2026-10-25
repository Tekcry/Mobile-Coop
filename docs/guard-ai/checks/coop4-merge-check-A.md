# coop4 merge check A
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker A (Opus 5.5, fresh), #317 `feature/coop4` head acce9707b: the master-merge conflict fix 6206c9434 and
follow-ups 8e8d611cd, 8094af038, acce9707b (parents 3100d0358 / 38e92f5d3, base d91d0e00d). Focus: src/net. 603f23a43
on top is docs only (check B's fixes).

## Checks run
- `npm run typecheck:fast`, `npx eslint src/net`: clean.
- vitest on 209 files (every test touching coopHost, coopClient, protocol, coopUi, roomCap, sectorOut, playerSlots,
  snapBudget, intel, lamp, sectorTeamScale, coopCarry): 3325 pass, 6 skip. snapBudget: steady 5953 B of 6144.
- Line survival over both sides' added / removed lines in the 4 conflicted net files and the auto-merged src files:
  only moved lines, merged imports, the deliberate lobby wording and the dropped `blips()`. No conflict markers.

## Per file
- protocol.ts: merge vs master = coop4's own hunks (SECTOR_MAX 4, `capacity()`, slots, snap helpers, per-slot secWire,
  bye.mode); PROTOCOL_VERSION 64 = master, no bump; master's markIntel / `in?: 1` kept.
- coopHost.ts: all master fixes kept (6 `interPh.delete`, addSyringes sector guard, lamp shots / stale / restart,
  repeat-lamp return); coop4's syringes and rounding kept; snapshot builds `es`, `markIntel`, then `snapEnemyState`
  (in place, `in` survives, no new allocation); `enemyMgr?.intruderLeft(id)` direct.
- coopClient.ts: master's lamp shots, `setIntel`, section-bake `setLive` kept; blips removed.
- coopUi.ts: master's Course prefix and Start block plus coop4's `s.cap`; "partner" at cap 2 matches e2e-coop.
- minimap.ts deleted (G339); no game src or test reference left.
- src/net reached only via `import('./net/coopUi')` behind `flags.coop` (main.ts:326).

## Fix list
None.

## Polish
1. tests/snapBudget.test.ts:62-73 fake guards lack master's `in: 1` (7 B each; 191 B headroom): set it on a realistic
   share (e.g. `i % 4 === 0`).
2. Duplicated "(coop4 A4)" comment in coopHost; main.ts:332 Co-op card "Two players with a room code" could say up to
   four in Sector Ops.
