# coop4 AI1-AI5: fresh check B (integration and gameplay)

Opus checker B, 2026-10-24. Read only. Diff `a10382bc..f1d517b2` (N0's `src/game/playerSlots.ts` + test ignored),
brief `docs/coop4/briefs/AI.md`, logs AI2-AI5-BUILT, Sector Ops' PLAN, STATE and code on `origin/feature/coop4`
(e330e092).

**Verdict: PASS.** The AI code is correct and gated. No broken behaviour found. One integration hazard sits in Sector
Ops' AI5 wiring, which is not built yet (finding 1). It must be settled before that wiring lands.

Tests: `npx vitest run tests/fourIntruders.test.ts tests/sweep.test.ts tests/gear.test.ts`: 3 files, 59 passed (1.7 s).
`tests/twoIntruders.test.ts` is not in the diff (unedited). `origin/feature/coop4` has master's `src/ai`, and its
`playerSlots.ts` is identical to this branch's, so the train merge does not conflict.

## 1. Hook contract with Sector Ops (the exact list)

| # | Call | Where (coop4 branch) | State | Order / notes |
| --- | --- | --- | --- | --- |
| 1 | `enemyMgr.intruderLeft(id)` | `coopHost.removeRemote` :563 (optional cast) | DONE | Called on a lobby leave or a removed id (:240, :247). It is not called on `away` / hold (correct: a held player keeps his slot). The optional cast can become a direct call after the merge. |
| 2 | `em.hear(it.pos, it.holdNoise, 'noise', null, r.ref.id)` (A172) | `coopHost` hold pulse :824 | DONE | Matches the brief. |
| 3 | `TeamRef.slot` filled (the `slotOf` seam) | `remotePlayer.ts:80` (`slot: 1` at creation), `coopHost` :242 / :408, `gameState` localRef `slot: 0` / `setLocalSlot`, `playerRefsInto` sorted by slot | DONE | `seesIndex(0)` (host arcs, gameState) stays right. A 3rd remote reads slot 1 until :408 sets it: one frame of shared sight bit, cosmetic. |
| 4 | Host ghost `em.intruders.slotFor(localRef.id)` | `gameState` :2738 | Kept (correct) | The default `reuse = false`, so it never takes a slot unreleased. If it is ever switched to `ghostOf` / `find`, keep one `slotFor(localRef.id)` at stealth start (AI1 note). |
| 5 | `ghostOf(id, out)` | none yet | Not owed now | For the future per-client ghost on the wire. N1 does not send one. |
| 6 | `em.setResponseShape(s.responseShape ?? null)` + `SectorDef.responseShape?: ResponseShapeOverride` | sectorMode section load :718-734 (the `TODO(coop4 AI5)` at :734) | OWED | Call it on every load and restart, with `null` when the section has no override: the manager keeps the last value (`clear()` does not reset `shapeOver`). |
| 7 | `em.shapeResponse(stage, base, out)` in `raised()` | sectorMode :959-1004 | OWED | See finding 1: pass `base` (= `perStage`), never the SM-scaled `want`. Return early first when `want === 0` (a stage already at its cap still shapes to > 0). |
| 8 | Per team `k`: `responseTeam(stage, responseTeamSize(k, size, teams), kinds)` and `em.newTeam(idx, s.sweep ?? null, ...sweepSource(s), SECTOR.alarmMax * teams)` | sectorMode :983-998 | OWED | Today it makes one `newTeam` with no spread (spread 3 = today). |
| 9 | Push each team's members consecutively into `pending` | sectorMode `raised()` | OWED | In `fill`, `joinReinforcement(e)` must be followed directly by `joinTeam(e, team)` for the same guard, with no other `joinReinforcement` / `sendIn` in between. `fill` :926-928 already does this, and reinforcements are `alerted` (never skipped by `SPAWN_MIN_DIST`), so the order holds. A cap refusal `break`s and keeps the order. |

Nothing is misnamed. Every signature in AI5-BUILT matches the code (`enemyManager.ts` `setResponseShape`,
`shapeResponse`, `newTeam(.., spread = 3)`, `nextAlarmHunt`, `intruderLeft`, `ghostOf`).

## 2. Findings

1. **Double scaling of the extras (wiring hazard, must be settled in SM's AI5 wiring).** SM already scales the alarm:
   `alarmStep(stage, perStage, teamSize)` sends `perStage + SECTOR.reinforcePerExtra x (teamSize - 2)` (coop4 A9,
   sectors.ts:869-871), then `capReinforce(want, base, maxAlive - alive - pending)` (sectorMode :966). `responseShape`
   adds `RESPONSE_N.extraPerPlayer x (players - 2)` on top of whatever `perStage` it is given. AI5-BUILT's sketch
   writes `em.shapeResponse(stage, send, ...)`. In coop4's `raised()`, `send` is the scaled count, so at 4 players
   perStage 2 becomes 4, then 6. Required wiring:
   - Pass `base`.
   - Treat `want` only as "0 = no send".
   - Then `send = capReinforce(sh.size, base, maxAlive - alive - pending.length)`. `shapeResponse`'s headroom is
     `maxAlive - alive` and does not subtract `pending`, so it is looser than SM's cap.
   - Keep one owner of the "+1 per extra player" number. Either pass SM's number through the override
     (`setResponseShape({ extraPerPlayer: SECTOR.reinforcePerExtra, ... })`), or set one of the two to 0. With
     `extraPerPlayer: 0`, `size` stays at perStage, below `splitAt` 4, so it never splits.

   The two counts also differ: SM's `teamSize` is connected + held, while AI's `players().length` leaves held players
   out. With one held player, AI shapes for one player fewer (acceptable, but know it).
2. **9-ray budget is fair in CT terms.** Players outside a calm guard's field cost 0, `cur` is always started first,
   and alerted guards never cap (4 x 2 = 8). Worst case: 4 calm players in one field, or the target plus 3 others.
   Each waiting player is then skipped about 1 think in 3-4 (~0.25 s at 4 Hz). That only slows the switch to a
   better-seen player. Nobody stays hidden in plain view.

   The rest of the gameplay:
   - **Reinforcements:** the split (alarm intruder first, then the freshest, round robin, leavers skipped) is sensible.
   - **Team hunt:** the share-and-give-back is safe across frames. `alarmK` cannot go negative, because the give-back
     always follows its own draw.
   - **Own-LKP sweep and `pointBusy`:** an empty or refused team never sweeps.
   - **`spotted` per slot:** a guard who sees another player switches `hunt` (`takeSighting`), so the seen player stays
     spotted.

   Nothing here makes 4 players trivial or impossible.
3. **Guard cap (32): refusals handled.**
   - A spawn refused at `maxAlive` never reaches `joinReinforcement`: no draw, the order is kept, and the next member
     that spawns sets the team hunt.
   - `responseShape` never cuts the base.
   - A team whose members never spawn stays non-sweeping (`tick`: no leader).
   - Nothing assumes the asked count spawned.
   - Note: extras that `shapeResponse` allows but the cap refuses wait in `pending` until room. SM's `capReinforce`
     drops them instead, which is why finding 1's cap step matters.
4. **Docs: minor gaps (polish list, not blocking).**
   - Brief section 5 logs AI1 and AI5 only. AI2-AI4 are in their BUILT files and in `ai.md`, but not in section 5.
   - Brief A177 still reads `max(3, spread)`; the code keeps today's thirds at spread <= 3 (documented in AI5-BUILT).
   - `ai.md` types `ghostOf` as `0 | 1 | 2`; the code returns `number`.

   The changelog fragment (5 lines, `kind: minor`) and the `ai.md` coop4 notes match the code. A170-A181 are in brief
   section 4 with their undos. There is no collision: `ai.md` on master ends at A164.

## 3. Existing suites at 1-2 players

Every AI2 / AI4 / AI5 rule is gated on `players().length >= 3`:
- `nextAlarmHunt` returns `alarmHunt` and `drawE` stays null.
- `rolesStep` starts at slot 0.
- `teamsStep` passes `peers` null and keeps today's tick.
- `spottedStep` keeps the old branch.
- `perceive` keeps index order with no cap.
- `sweepStart(.., 3)` gives today's thirds.

These are the only 1-2 player changes:
- **A172 (coop4's coopHost line):** a guest's noisy hold now locates him. Watch the e2e-coop holds and e2e-ctcourse
  a6PumpHouse (client hold, calm attendant). Calm guards take today's path, so a change is unlikely.
- **A173 (`RADIO.queue` 128):** this only matters on an overflow. `tests/radioNet.test.ts` overflow test was edited to
  read the constant (legitimate).

Asserts that could move only through the wiring, not this branch:
- `e2e-sectorops` S6 :3566 (`sent === perStage`, 1 player).
- `e2e-sectorops` S13 :3656 (`teams.length === 3`, each `perStage` strong, 1 player). This stays green only if the
  wiring keeps 1 team of `perStage` below 3 players, which `responseShape` guarantees.
- `tests/sectorTeamScale.test.ts:42` (`alarmStep` sends per+1 / per+2): it stays true if SM keeps `alarmStep` but
  stops using its extras in `raised()`.

The `e2e-stealth-ai` :1012 and `e2e-coop` :1258 / :1440 `slotFor(id)` reads are unchanged (one-argument form, no reuse).
