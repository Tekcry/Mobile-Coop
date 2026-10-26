# coop4 merge 3, check B (networking and wire)
Owner: Guard AI Build. Status: current.

Head checked: a51c951b78af0eb5f13aec59d7ef608daad56592 (merge of origin/master 78c241933, 4.112.1, into ed34b4005).
Checker: fresh Opus 5.5, read-only. Merge note read: `docs/guard-ai/checks/COOP4-MERGE3.md`.

Verdict: PASS

## Method
- `git show --remerge-diff a51c951b7` for every conflicted net file, plus diffs against both parents.
- Carry check by sorted changed lines: master's own `src/net` changes (merge base 29f03b6c0 to 78c241933) equal the
  merge's changes over ed34b4005, and coop4's own `src/net` changes (merge base to ed34b4005) equal the merge's changes
  over 78c241933. Both identical: nothing from either side was dropped or altered in `src/net`. Same check on
  `src/game/sectorStart.ts`, `spawnPlace.ts`, `gameState.ts`: identical; `sectors.ts` differs only by the noted
  `nextAlarmSends(..., this.teamSize)` line and its comment (checker A's area).

## Findings
- `src/net/protocol.ts`: `PROTOCOL_VERSION = 67`, equal to master (also unchanged at the newer master b80d00d8d). Merge
  vs ed34b4005 is that one line only. `MAX_PLAYERS`, `SECTOR_MAX`, `capacity(mode)`, the `slotFromList` import and the
  lobby slot parse are coop4's, unchanged. No message field order or key changed by the merge; master added no wire key
  in `src/net` (its 66 / 67 bumps were train bumps for behaviour on existing fields, e.g. `rh` read as practice).
- `src/net/coopHost.ts`: imports `OutFollow` and `offSection` both present. `follow` / `followScan` / `followStep()` and
  `earlyPlaced` / `placeEarly()` / `firstPlace()` all intact; `fixedUpdate` runs `followStep()` then
  `if (!this.earlyPlaced) this.placeEarly()`.
  - Order: independent. `followStep` reads `g.player.alive` and `g.outIds` and writes only `pl.followFeet` and the
    `OutFollow`; on the first steps `outIds` is empty (cleared at the sector start), so it returns at once.
    `placeEarly` reads remotes, `joins` and the mode; it never reads `followFeet` or the follow state.
  - Slots before `placeEarly`: `Session` assigns a slot at each hello (`slots.assign`) and compacts at match start
    (`slots.compact`), before `enter`; the host's first `fixedUpdate` runs after `mode.start()`. So `slotOf` for slots
    2-3 is known when `placeEarly` calls `firstPlace` -> `joinSpot`. A remote whose first state arrives later takes the
    `receive` path (`!r.state && !restoring` -> `firstPlace`), also slot-aware.
  - 2 players: `joinSpot` is byte-identical to master's; coop4's `slotOf` (slot table, 0/-1 -> 1) gives 1 for the one
    client, as master's list-order `slotOf` did. `firstPlace` returns at once outside Sector Ops or for a body in the
    section. Behaviour unchanged from master.
  - Allocation: `followStep` none (module function + reused context, unchanged). `placeEarly` runs once per match (its
    `values()` iterator and `joinSpot`'s arrays / closure only on that step or on a placement, as on master); the
    per-step cost after that is one boolean test.
- `src/net/coopClient.ts`: master's `practiceFromRh` import, `practice` field, the `rh` read and the `markCompleted` /
  `stats.practice` gate auto-merged cleanly beside coop4's slot code; no overlap.
- `tests/sectorStartCoop.test.ts` stubs: `g.outIds` is a `GameState` field initializer (`readonly outIds = new Set()`,
  gameState.ts:503) and `slotOf` is a `Session` method; a real host always has both from construction, so the stubs
  mirror the real shape and mask no crash path. `slotOf: () => 1` is what the slot table gives the one client.
- `scripts/e2e-sectorops.mjs`: import union; every name is exported by `e2e-net-lib.mjs`; `LOAD_MS` used by master's
  start-at-section legs. `node --check` ok.
- No static `src/net` import from game code added.

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run` on coopCarry, coopFix, coopGuardAi, coopGuardCarry, coopPerception, coopRejoin, coopTorches,
  coopWalkFixes, net, netSim, playerSlots, protocolConst, rejoin, sectorStart, sectorStartCoop: 15 files, 265 tests,
  all pass.
- `node --check scripts/e2e-sectorops.mjs`: ok. No e2e run (laptop queue).

## Polish
1. `placeEarly` with 3-4 remotes off-section (`?sectorStart=N` only): each `joinSpot` sees the other remotes'
   pre-placement feet (still at section 1), not the spots already handed out in the same pass. Slot 1 gets the map's
   partner point; slot 3 tries `besideSpot(checkpoint, 3)` (same side as slot 1) and could land on or near that point.
   The partner blocker parts the bodies, so not a blocker. Done looks like: `placeEarly` passes the spots it placed as
   `others` for the next one, or a 4-page `?sectorStart=N` leg in e2e-sectorops part 7 shows four clear spots.
2. origin/master is now b80d00d8d (4.112.2, look-video: scripts, a test, package.json; no `src/net`, still protocol
   67). The next master merge or the train picks it up; nothing for the wire.
