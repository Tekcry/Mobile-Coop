# laptop-queue-7 - brief
Owner: Test Runner. Status: current.

## Source (Test Runner queue audits, 2026-10-26, as given to the planner)
1. "Skip `affected` requests (automatic and filed) for PRs that GitHub reports as CONFLICTING (mergeable state): they
   cannot reach a train, so the run is waste."
2. "Among PR requests, run smallest-first (by expected wall time from times.json) among PRs whose CI `check` and
   `checker` statuses are already green (they are closest to train-ready); others keep requester arrival order."
3. "A train head that moves after its laptop run (e.g. a docs-only CI fix commit on the version commit; trains 111 and
   112 both lost ~1 h to a full JOBS=1 rerun, and train 112 #491 then sat open because auto-train did not see the
   moved head's run [...]). Fix: when the delta between the laptop-run sha and the new train head touches only docs /
   *.md / changes/ / CHANGELOG (same set as the G325 label rule), carry the green verdict to the new head [...] instead
   of a rerun; otherwise auto-train/the service must still detect and run the moved head." Posting statuses by hand
   was blocked by auto mode, so this must be in queue code.
4. "A train rerun (one slot, E2E_JOBS=1, service.mjs ~:1220) should shard across both slots when no other
   train-critical work waits."
5. "Verify (test, not new code unless broken) that laptop-queue-6's train ETA hold / fit rule holds claims across the
   next train."

## Michael said (binding; ROADMAP "Decided" on origin/feature/menu)
- 2026-10-26 ~00:15: "add all mixamo animations in game, i will fine tune as needed. make this priority overnight".
  The entry records that Mixamo PRs "go first in the laptop queue, desktop CPU and orchestrator attention all night".
- 2026-10-25 ~22:42: "confirming priority is mixamo animations in anim tuner and in game. note this for next session
  to continue".
- 2026-10-23 ~19:10 (auto-train, `docs/systems/auto-train.md`): "Yes, fully automatic".

## What planning found (facts, not assumptions)
- F1. The moved train head is missed by the laptop service, not by auto-train. `pendingTrains` (service.mjs:629) runs
  only a head whose own subject is "<v>: version at merge, train <n> (G183)", so a fix commit on top is never run or
  carried. `nextTrainNow` (service.mjs:576) uses the same subject test and reads such a head as "building" (a claim
  hold with ETA = now for up to `LQ_TRAIN_BUILD_MAX_MIN`). auto-train already finds the version commit under a fix
  commit (d7f6cd40, `withRecentSubjects`, auto-train.mjs:138) and releases with `--resume` (auto-train.mjs:978).
- F2. The doc-lint cause is gone: merge-train build leaves out a member that adds a doc-lint error (ba2b1888,
  17de9332; feature/train-doclint rode train 113, 7403d0dc). This job covers the other head-move cases.
- F3. Mixamo-first has no queue code today. It is done by hand: a request re-filed under an early id sorts first in
  `pick` (HANDOFF 2026-10-25 22:40, "Mixamo 000006"). `priority` only orders one requester's own requests.
- F4. The docs-only set of the G325 rule is `docsOnlyFiles` (scripts/watchdog.mjs:227): `docs/`, `changes/`,
  `CHANGELOG*`, `*.md`. watchdog.mjs imports lib.mjs, so lib cannot import it back.
- F5. testing-tools.md (720/720) and RULES.md (318/318) are at their doc-lint line budgets.
- F6. Not every `docs/` file is docs: src/world/maps/kestrel.ts:10 imports `docs/kestrel/kestrel.campus.blocks.json`
  into the game bundle, and scripts/e2e-kestrel.mjs:16 / e2e-editor.mjs read docs/kestrel JSON. The e2e suites'
  other `docs/` mentions are comments. The G325 label rule has the same gap (sent to the orchestrator, not fixed here).

## Assumed decisions (each with its undo)
- A1. Conflicts retire, not hold. An affected request (set `affected`, automatic or filed) whose PR head is reported
  CONFLICTING is marked done unrun at pick time with `affected-e2e` and `laptop-e2e/affected` error "not run: PR #n
  conflicts with master (a new head runs again)"; a conflicting head gets no automatic request at all (same error
  posted at once). Why not hold: a held request counts as queue work for auto-train's pacing (`laptopQueueState`) and
  for spare work, and a conflict only clears with a new head (master only moves forward), which gets its own run.
  UNKNOWN mergeable never skips. Undo: `LQ_SKIP_CONFLICTING=0`.
- A2. Only affected requests are skipped; a lead's named-suite requests on a conflicting head still run (debugging
  runs, the coop checker gate). Undo: widen the lib filter to every kind `pr` request with a `pr` number.
- A3. "Green" = the request's sha is its PR's current head and that head has CI `check` success and `checker` success.
  A request on an older sha, a stacked parent or with no `pr` is never green. Undo: `LQ_GREEN_FIRST=0`.
- A4. Mixamo-first goes into code as a front tier above the green tier: requests whose branch contains one of
  `LQ_FRONT_BRANCHES` (default `mixamo`, case-insensitive, comma list) and requests re-filed under an early id (id time
  before 2020 or no time) keep arrival order ahead of everything else among PR work. Without it the green tier would
  push a Mixamo PR whose checker is still running behind other PRs, against "go first in the laptop queue". Undo:
  `LQ_FRONT_BRANCHES=` (empty) - the early-id re-file still works as before.
- A5. Starvation bound: when the oldest non-front PR request, green or not, has waited over `LQ_GREEN_MAX_WAIT_MIN`
  (30) min, the green tier is skipped for that pick: the front tier still goes first, then arrival order among the
  non-front requests (so a big green request is never pushed back for good by a stream of smaller greens). Undo:
  `LQ_GREEN_MAX_WAIT_MIN=0` (no bound).
- A6. Green requests with no known wall (a suite missing from times.json) go after the known ones in the green tier,
  oldest first. Undo: n/a (order only).
- A7. Carry rule: a moved train head H (open train PR head, train n's version commit V found within
  `LQ_TRAIN_CARRY_DEPTH` (20) first-parent commits) with no `laptop-e2e` status gets `laptop-e2e` success "carried
  from <C8>, docs-only delta" when C = the newest commit from H's parent back to V with a final `laptop-e2e` verdict
  (success, failure or error) has success, and C differs from H only in docs-only files: the G325 set (F4) minus any
  non-`.md` file under `docs/` (F6), so a JSON the game or a suite reads never carries. A newer failure is never
  skipped to reach an older success. Otherwise H runs as a normal pending train (sharded, `LQ_TRAIN_JOBS`), not a
  JOBS=1 rerun. While a docs-only ancestor between V and H still has `laptop-e2e` pending (its run going, A8), H waits:
  neither worker starts it, and the carry is posted when that run passes. Undo: `LQ_TRAIN_CARRY=0` (moved heads still
  run as trains).
- A8. A train run on C whose head moves mid-run to a docs-only descendant is not voided: the void watch counts H as
  C's head, and on a pass the carried success is posted on the then-current head too. A code delta voids as today.
  Undo: `LQ_TRAIN_CARRY=0`.
- A9. visual-gate is not carried (auto-train does not read it yet, auto-train.md "visual-gate"). Undo: n/a.
- A10. Rerun sharding: a train rerun shards across 4189 + 4192 at `E2E_JOBS=1` per slot (2 browsers in all, under a
  PR run's 2 + 2) when both laptop slots are free at pick time, no train head is pending, no other train rerun is open
  and its suites expand to 2+ parts. With one slot busy it starts on one slot at once, as today (no waiting for the
  second). Undo: `LQ_RERUN_SHARD=0`.
- A11. The RULES.md "Machines" order sentence is the orchestrator's: the PR carries the net-zero rewrite (PLAN "Docs")
  for the orchestrator to accept in review. Undo: revert those lines.
