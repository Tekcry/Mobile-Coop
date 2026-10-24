# coop4 AI check A (fresh Opus checker, 2026-10-24)

Scope: `git diff a10382bc f1d517b2 -- src tests` (AI1-AI5), excluding `src/game/playerSlots.ts` and its test (N0).
Focus: correctness and hot paths. Read-only; nothing committed.

## Verdict: FAIL (one wrong-behaviour finding, small fix)

## Tests run
`npx vitest run tests/fourIntruders.test.ts tests/perceive4.test.ts tests/targetPick.test.ts tests/twoIntruders.test.ts`:
4 files, 64 tests passed (2.3 s). `tests/twoIntruders.test.ts` and `tests/coopPerception.test.ts` are unedited in the
range. `src/ai` imports nothing from `src/net`; no `Math.hypot` in the touched files.

## Findings

### F1 (FAIL): a slot reuse leaves stale tells pointing at the new player (G139)
`EnemyManager.releaseSlot` (enemyManager.ts:2829-2846) drops only `e.hunt === s`. Two other paths still carry slot `s`
past the reuse, and both now resolve to the NEW player:
1. `Enemy.pendingHunt` (enemy.ts:388, private). A calm or searching guard told of the old player (a contact call via
   `radio(0, inc)` -> `tell`, or a coordinated reinforcement walking in via `joinAsReinforcement(route, h)` -> `radio`)
   keeps `pendingHunt = s`. When he goes to combat, enemy.ts:1863 sets `hunt = pendingHunt`, so he hunts the joiner's
   last known position. Before the reuse the same tell went to a forgotten slot (A148: no position, no walk).
   `huntingOf` (the idle-first pick) ignores `pendingHunt`, so even the "gone and idle" slot can have these tells.
2. Contact calls already in the radio queue (`RADIO.staggerMax` 4.5 s) deliver `inc = s` after the reuse
   (`radioDeliver`, enemyManager.ts:2391-2394 -> `e.radio(0, inc)`): the receivers learn of a player nobody reported.
This is exactly the brief's "no stale hunts after a reuse" (A171, focus 2). The FakeGuard harness of
`tests/fourIntruders.test.ts` has no `pendingHunt`, so the reuse test cannot see it.
Fix (gated by construction, reuse only runs at 3+ players): an `Enemy.dropHunt(s)` (`if (hunt === s) hunt = -1; if
(pendingHunt === s) pendingHunt = -1`) called from `releaseSlot` in place of the direct write; and drop queued contact
deliveries for `s` (e.g. a radioNet `cancelInc('contact', s)`, or a per-slot generation checked in `radioDeliver`).
Test: a calm guard told of slot 3, d leaves, e reuses slot 3, the guard goes alert -> `hunt` -1; a queued contact for
slot 3 delivered after the reuse tells nobody. Reachable only once `intruderLeft` is wired (N1) and a 5th distinct id
joins.

### Checked and correct
1. 2-player identity. Every new rule is behind `players().length >= COOP4.from`: `slotForId` passes `reuse` false
   (the only 2-player change in `slotFor` is clearing `gone` on a match, read only by gated code); `nextAlarmHunt`
   returns `alarmHunt` without moving `alarmK`, so `drawE` stays null and `joinTeam` does nothing new; `sendIn` keeps
   `commandHunt`; `perceive` keeps index order, uncapped, `perRR` frozen; `rolesStep` starts at slot 0 in the old
   order; `targetCoverT` keeps the max; `teamsStep` passes `peers` null and the mirror LKP; `spottedStep` keeps the
   all-calm rule; `sweepStart(.., 3)` is today's thirds, and the handover's `SECTOR.alarmMax (3) x teams (1)` = 3 at
   2 players. Only A172 (net line, not in this diff) and A173 (`RADIO.queue` 128) change 2-player play.
2. Ids vs slots. Board, hunts, `spottedStep` (`find(p.id)` vs `1 << e.hunt`), `targetCoverT` (`idOf(slot)` -> id),
   perceive's `hi` (`intruderId(hunt)` -> `p.id`) are keyed by id / board slot; only `seenMask` uses `slotOf` (team
   slot), and its only reader is gameState `seesIndex(0)` (host, 0 either way). Plan, caller, chase field, heard
   throttle, alarm / contact hunt and team hunt are released on reuse (apart from F1).
3. perceiveOrder budget. Alerted: 4 x 2 = 8 <= 9, never capped, so a fighting guard sees his target every think. Calm:
   `cur` first (cost <= 3), always started; `hunt` second; the tail rotates by `perRR` (wraps at 12, a multiple of
   1-4). A skipped player only loses this think's rate / los / sight bit; the target's sighting is never dropped.
4. Alarm round robin. `alarmHunts` skips gone slots (the alarm's too); `alarmK` resets on `raiseAlarm`, `resetAlarm`,
   `clear`; a cap refusal never draws. `joinTeam` gives back exactly the last increment (`drawE === e` means no other
   `joinReinforcement` since). Teams never split across two intruders.
5. Response shape: extras clamped to `headroom - perStage`, base never cut (documented deviation, defensible);
   `responseTeamSize` even split. Sweep: `pointBusy` same section, sweeping, not self; `next()` restores the plain next
   point when all are held; `begin()` moves a held start. Cover: rotation per roles tick, shared `coverSet.owner`
   unchanged, role caps per group.
6. Allocation: `perceiveOrder` (insertion + three reversals into `P_ORDER`), `alarmHunts` into `alarmList`, `pointBusy`,
   `teamsStep`, `spottedStep`, `rolesStep` rotation, `targetCoverT(slot)`, `responseShape` (`?.` / `??`, no objects):
   no closures, arrays, iterators or temp vectors. `huntedFn` is bound once per manager; `Array.from` runs at
   construction only.

## Notes (not blocking)
- N1: `perceiveOrder` re-sorts the tail by distance each think before rotating; two tail players at near-equal
  distance whose order flips in phase with `perRR` could wait several thinks in a row. Not starvation in practice.
- N2: `coop4()` calls `players()` (gameState `playerRefsInto` refills the same array) several times per update and per
  roles group. No allocation, and callers holding `ps` see the same array and contents; a little repeated work only.
- N3: a team whose first member drew nothing (no intruder known) takes its hunt from the first later member who draws;
  the earlier members keep `alarmHunt` (-1). Not a split across two intruders.
