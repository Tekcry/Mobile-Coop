# coop4 release check A
Owner: Guard AI Build. Status: history.

VERDICT: PASS

PR #317 (feature/coop4), head checked: 3100d035856a6b110a595148783b34fbe9fd07ed (merge base with origin/master
d91d0e00d9ff5c22995c982e0758748c740ee3e2). Fresh Opus 5.5 checker A: correctness, `src/net` / `src/ai` safety, hot
paths, CLAUDE.md hard rules, test adequacy. Ships live, no flag (Q16). The earlier check A on 0837f147 (this file at
commit c9dc64a80) keeps its train merge notes for the protocol.ts / coopHost.ts conflict; they still hold (3100d035 adds
docs and run-e2e only on top of 0837f147).

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run --maxWorkers=2` on 62 files: every test importing `src/net/*` (50) plus the touched tests
  (beaconSlots, campusS1-S5, ctDevicesSlots, sectionRating, sectorGuardTags, sectorTeamScale, spawnSlots,
  teamMovesTaken): **62 files, 1052 / 1052 pass**.
- Diff read: all src/ hunks (net, game, player, ui, world maps), the test list, run-e2e.mjs; docs skimmed. No e2e
  (laptop already green on this head: coop4-full2 43/43 and the 4-player alone run).

## Findings
- Hard rules: no `Math.hypot`, `localStorage`, direct `@babylonjs` import or URL added. No file outside `src/net`
  imports `src/net` (`sectorOut.ts` is pure: sectors + playerSlots only; protocol.ts imports game/playerSlots, the
  allowed direction). `src/ai` has no diff (Guard AI hooks are read structurally and optional: `intruderLeft`,
  `setResponseShape`, `shapeResponse`; today's path when absent, never both scalings). `PROTOCOL_VERSION` not bumped by
  hand. Strict TS clean. Marlow Yard: empty diff in `src/game/course`, `courseMode.ts`, `src/world/maps/ctcourse*`.
- Wire safety: `wireSlot` clamps 0..3, lobby entries without a slot fall back to list order; `secWire` j / ch / cd
  padded to 2 and cut at MAX_PLAYERS (course still 2 entries); `ot` kept only in 1..15; `bye.mode` via `oneOf`. The host
  takes a client's jam slot from its own `r.ref.slot`, never from the wire; `onRemoteJam` drops slots outside 1..3.
  `snapPlayerState` rounds a copy (`packMoveState` copies `c`), so the host's live MoveState is untouched; rounding is
  Sector Ops only (`round`), course snapshots unchanged.
- Slots / rejoin / OUT: SlotTable (host 0, lowest free, hold on drop, release on leave, compact at start); a held OUT
  player is revived at the connector and its hold re-pointed (`rehold`), the round-check F1 is fixed; an OUT leaver
  leaves `outs` and the mask; the last one up dropping with the rest OUT restarts. 1-2 players: `outWaits` false, the
  old restart path.
- Hot paths: `playerRefsInto` insertion sort over <= 4 refs, no allocation; follow views use `Map.forEach` with a
  module function and a reused context; ctDevices per-slot arrays allocated once; SyncedDetector fixed array;
  `wire()` / `returnOut` / `bySlot` allocate only on sends, connector cycles or lobby changes.
- Tests: adequate. sectorOut (rules, mask, follow pick, held return), sectorTeamScale (syringes, reinforcements, cap,
  AI5 fallback vs hook), ctDevicesSlots (course wire byte-identical, 4 slots), sectionRating (any-pair sync),
  teamMovesTaken, coopRejoin, snapBudget (4 players x 32 guards), net (slots, refusal, `roomCap`).

## Fix list
None.

## Polish (non-blocking)
1. `src/game/gameState.ts:2129`: `localMoveState` now runs every fixed step in single player; while attached it hits
   the old `gp.some((v) => ...)` closure (`localMoveState.ts:126`). Already fixed on feature/coop4-pol (lazy `mv`);
   make sure that follow-up PR lands.
2. `src/game/modes/sectorMode.ts:1434`: a remote that goes OUT while held (dropped while down, revive clock runs out)
   is not in `playerRefsInto`, so its slot is recorded as -1 and its bit never reaches `ot`. `returnOut` still brings
   it back, but if it rejoins before the connector its page shows no OUT line or follow view. Take the slot from the
   host's remote (`RemotePlayer.ref.slot`) when the list lookup misses.
3. `src/net/coopHost.ts:244-245`: duplicated "(coop4 A4)" comment.
4. `src/ui/hud/minimap.ts:93`: ally dots now take the beacon colour in Marlow Yard too (partner red / host blue,
   was cyan). Intended by A15 / H1, but it is the one visible course change; put it in front of Michael with H1.
5. Still open from the 0837f147 check: tokenless newcomer takes the single held slot at cap (R2 rule, `session.ts:182`),
   `start` sent before the compacted `lobby`, `roomCap` has no setter yet (Campaign J7).
