# coop4 e2eai build: the guard-AI asserts for the 3-4 page harness

Slice E2E-AI, base `feature/coop4` 3f1c946f, spec `docs/coop4/briefs/AI6-E2E-SPEC.md` (feature/guard-ai-coop4, PR #319).
Files: `scripts/e2e-coop.mjs` (new 4-page block before 'offline state'), `scripts/e2e-sectorops.mjs` (legs appended to part 8;
`waitHostSim` added to its import). No src/ change, `node --check` clean on both, not run (the laptop runs it on the train head).

Every read of a #319 hook is guarded; an absent hook prints `SKIP: guard-ai #319 hook <name> missing`. On feature/coop4 alone
the e2e-coop block starts the Ledger mission on 4 pages and asserts 4 players in the guards' list, then skips (1)-(3).

## Where each spec assert lives

| Spec | File / block | Hooks read | On our branch | Only on #319 |
|---|---|---|---|---|
| (1) each pair hunts its own player | e2e-coop 'AI6 (1)' | `em.intruders.find`, `valid/x/z`, `e.hunt`, `e.knownPt`, `em.raysThisStep`, `e.raysThink`, `em.coop4` | `e.hunt`, `knownPt`, `valid/x/z`, `em.spawn`, `net.remotes`, `hitDistance` | `find`, `coop4`, `raysThisStep`, `raysThink` |
| (1) D never seen | same, `find(D) === -1` every step | `intruders.find` | - | `find` |
| (2) leave + rejoin same slot, LKP kept | e2e-coop 'AI6 (2)' | `find`, `gone`, `valid`, `em.players()`, `em.noise(.., id)`, `em.ghostOf`, `net.remotes.held`, `__coop.leave` + Rejoin | held remote, Rejoin, `em.players`, `noise` | `find`, `gone`, `ghostOf`, `coop4` |
| (2) removeRemote marks slot gone | e2e-coop 'AI6 (2c)' via `session.expireAway` | `gone[s]`, `net.remotes` | `expireAway`, `removeRemote` -> `intruderLeft?.()` call | `intruderLeft`, `gone` |
| (3) crouch-walk silent, run heard, noisy hold | e2e-coop 'AI6 (3)' | `find`, `valid`, `locT`, `seenT`, `idOf`, `e.meter`, `e.level`, `seesIndex`, `em.hear(.., id)` | `meter`, `level`, `hear`, `seesIndex`, `locT/seenT`, pad drive | `find`, `idOf` |
| (4) stage brings shapeResponse's teams | sectorops part 8, leg 'AI6 setup, (6) ..., (4)' | `em.shapeResponse`, `em.teams[].section`, `members`, `em.alive/maxAlive`, `debug().pending`, `onAlarm` | Sector Ops wiring (`raised()` calls the hooks if present), `teams`, `alive` | `shapeResponse` |
| (4) refused at the cap | part 8, leg 'AI6 (4): refused at the cap' | `maxAlive`, `alive`, `pending` | all (the cap path is ours, `capReinforce`) | - |
| (5) two teams, two players, no dwell | part 8, leg 'AI6 (5)' | `SweepTeam.hunt`, `busySkips`, `pts`, `point`, `sweeping`, `count`, `em.lkpOf` | `pts/point/sweeping/count`, `lkpOf` | `hunt`, `busySkips`, the dedupe itself |
| (6) draw on alarm, every page | part 8, same first leg | host `e.carry.on/phase`, client `net.puppets[*].carry.c.phase` | all (S27 is on master) | - |
| 2-player control | unchanged, not edited | | | |
| Laptop measure (Test Runner) | not built (outside these two files) | | | |

## Deviations from the spec (reasons)

1. **Drop is a hold on our net layer.** `__coop.leave()` makes the host `hold()` B (`r.held`, kept in `net.remotes`, out of
   `remotePlayers()`); `removeRemote` (-> `intruderLeft`) runs only when the hold ends or in the lobby. (2) therefore asserts the
   held state (slot kept, valid, LKP unchanged, 3 players, coop4 on) and checks `gone === 1` only if the remote was removed;
   (2c) then drops B again and calls `session.expireAway(now + 1 h)` to run the real `removeRemote` and asserts `gone[sB] === 1`.
   **Open item:** `hold()` does not call `intruderLeft`, so under a hold the slot is never marked gone (spec read of `gone[sB] === 1`
   after "close B's page" cannot hold). Decide: call it from `hold()` too, or keep the spec as "hold ends".
2. **Run distance 2.6 m, not 4-6 m.** CT has no sprint; a standing run is a jog with a ~3 m reach (S26 notes), so a 4-6 m
   run is never heard. C runs a 3 m leg 2.6 m behind the guard (past the 1.8 m close range), chosen with `tierOf` as S26 does.
   The noisy-hold step calls `em.hear(item, 8, 'noise', null, idC)` on the host (what `coopHost.onHoldPulse` calls); no map item
   has a noisy hold here, the client-side hold is covered by the net unit tests.
3. **Sector Ops legs are on part 8, not a new part**, so `run-e2e.mjs` needs no new part entry (the part list is not ours to edit).
   They reuse part 8's four pages and section 1 (perStage 2), `delete em.update` to let the AI run, cameras still held.
4. **Alarm path is `onAlarm()`** (the mode's own `raised()`, as part 1's response-team check), not the alarm panel race.
5. **(5) window is up to 180 s, not 60 s:** the sweep starts after the search (`ALERT.searchTime` 60 s). Slots are seeded with
   `intruders.slotFor` + `report(.., seen)` for the host and page 1 at two far guards in the same host call as the shape read and
   the stage (an unhunted slot is forgotten after 2 s), so the guards stay calm and holstered until the alarm (needed by (6)).
6. **(6) 2 s** is read at 2 s of host sim with a 1.5 s grace for the snapshot.
7. **(1) rooms:** host and B use S24's proven rooms; room 3 is picked from workshop / dock / mezzanine by `hitDistance` between
   every body point of two rooms and asserted to have 0 open lines (the coordinates are untested in a run).

## Risks (written blind)

Room-3 coordinates, the yard-lane hide spots for C and D, the section-2/3 hide spots in part 8, pad steering of C (`cam.yaw`
+ stick forward) and `Enemy.seesIndex` indexing (slot vs list index) are first-run risks; each prints its numbers on failure.
