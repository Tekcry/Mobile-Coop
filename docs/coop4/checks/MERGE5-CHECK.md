# coop4 merge check 5 (head 63636bd2d, origin/master 4.114.1 = 65411ea65)

**PASS**

1. `src/net/protocol.ts` vs origin/master: no PROTOCOL_VERSION change (70 both sides). coop4's wire changes intact:
   `SECTOR_MAX` 4 and `capacity(mode)` (course 2, sector 4), `PlayerInfo.slot` + `wireSlot` + `slotFromList` fallback,
   `wireNum`/`snapPlayerState`/`snapEnemyState`/`snapItem`, `bye.mode`, 4-slot `secWire` jammer lists, `ot` mask.
2. Master ee1abab6b..65411ea65 (train 126: F7/F28 `&autojoin=1`, e2e-lib boot wait 120 s, ctcourse A5/A8 arc). Overlap
   with coop4: `src/core/flags.ts` (master adds `autojoin`, coop4 adds `players`; both present, separate lines) and
   `src/net/coopUi.ts` (`autoLocalCourse` autojoin branch merged ahead of coop4's probe/host path, which still waits for
   `flags.players ?? 2` and `overCapacity`). No clash with 4-player slots, `capacity(mode)`, `SECTOR_MAX` or the
   renumbered e2e-sectorops parts 10-12: master did not touch e2e-sectorops; the autojoin path is opt-in (tests only)
   and bypasses only the probe. Note (not blocking): an autojoin tab skips the probe's "Room full" dialog, so a 5th
   autojoin tab gets the host's `bye` instead; no current e2e does that.
3. `npm run typecheck:fast` clean. `npx vitest run` on the 21 tests coop4 touches: 21 files, 571 tests passed.
