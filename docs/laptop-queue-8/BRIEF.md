# laptop-queue-8 - brief
Owner: Test Runner. Status: current.

Seed scope collected while laptop-queue-7 built; the plan is `PLAN.md`. Branch feature/laptop-queue-8, worktree
C:/NightShift/Mobile-Coop-laptop-queue-8, cut from origin/master 34b96b9c. Builds on laptop-queue-7 (PR #507, open).

## Michael said
- 2026-10-26 ~10:12 (ROADMAP "Decided" on origin/feature/menu, "Fixes go first in the test queue"): "if bugs/error are
  found in the process, are the fixes prioritied for implementation first, or do they wait at the back of the line?"

## Michael picked
- 2026-10-26 ~10:12, native multiple choice: "Fixes go first (Recommended)": a fixed change keeps its old place, and
  fixes to failed or released work are tested before new features.

## Orchestrator calls (not Michael)
- 09:48 audit: a new head keeps its place; the desktop worker takes the smallest request, skips long runs, keeps
  finished suites when a train preempts. ~10:00: the CPU mode knob, default normal (the Blender case wins). ~10:20: A1.
- ~13:45 (top priority, train 118 stall): retry a lost train verdict post and done push; a claim whose heartbeat
  stopped is stale; the alone hold needs a live claim or a train that can still run (scope 7-9, A15-A19).

## Scope
1. Fixes first (Michael ~10:12): a request is a fix when its PR carries the `fix` label or request.mjs gets a new
   `--fix` flag (automatic affected requests read the PR label). Fix requests rank ahead of new-feature PR requests,
   behind trains and train reruns. A fix = a train failure fix, a red affected-e2e or checker fix round, a fix to a
   shipped feature or a backlog bug. Create the `fix` label if missing. Same PR updates the RULES "Machines" pick
   order line.
2. A request for a new head of the same PR keeps the old request's queue place (Orchestrator 09:48 audit; Michael
   ~10:12 item 1).
3. A running request is stopped when its PR gets a new head (same branch, new head contains the old one, suites
   overlap): today service.mjs:1363 (master; :1615 on laptop-queue-7) never supersedes runs or open claims.
4. Desktop worker (Orchestrator 09:48 audit): takes the smallest waiting request; skips runs estimated over ~15 min;
   keeps finished suites when a train preempts a run.
5. Docs-only verdict carry for PR heads (laptop-queue-7 carries train heads only): a new PR head whose delta from a
   green head is *.md / changes/ / CHANGELOG only (no non-.md file under docs/) carries the verdict.
6. Knob `LQ_DESKTOP_CPU_MODE=total|normal`, default normal (Orchestrator ~10:00: the Blender case wins).
7. A train verdict post or train done claim push that fails is retried on later passes until both land (Orchestrator
   ~13:45; train 118, 2026-10-26: both lost in the 00:57-01:00Z swap outage, the laptop ran nothing for 1.5 h).
8. A claim whose heartbeat stopped is stale after a few heartbeat intervals, not 3 h from `at` (Orchestrator ~13:45).
9. The alone hold needs a live train claim or a train that can still run: a head this worker finished, or one with a
   done claim, never holds because its laptop-e2e status was lost (Orchestrator ~13:45).

## Assumptions (each with its undo)
- A1: PR work order is fixes, then the laptop-queue-7 front tier (`LQ_FRONT_BRANCHES`, Mixamo), then green
  smallest-first, then arrival (Orchestrator ~10:20: Michael's ~10:12 choice is newer than Mixamo-first, ~00:15; a
  Mixamo fix is a fix anyway). Undo: swap the fix and front tiers.
- A2: How the service learns the label. The PR board laptop-queue-7 already reads (one `gh pr list` per
  `LQ_PR_BOARD_S` 60 s, both workers) adds `labels` to its `--json` fields: no extra gh call, no other cache. A request
  is a fix when its JSON has `"fix": true` (request.mjs `--fix`) or its `pr` is on the board with the `fix` label. Read
  live each pass, so a label added later counts and a label removed stops counting. A gh error empties the board for
  that pass: only `--fix` requests count then. Undo: stamp `fix` into the request at request time only.
- A3: Inside the fix tier: oldest queue place first (A4), no wait bound (fixes are few; like the front tier).
  `LQ_FIX_FIRST` (1; 0 = off) on both workers. An alone request waiting over 30 min (`ALONE_AGE_MIN`) still goes
  ahead of PR work, fixes included, as RULES "Machines" says (trains, train reruns, aged alone, then fixes). Undo:
  apply `LQ_GREEN_MAX_WAIT_MIN` to fixes too.
- A4: "Keeps its queue place" = an optional `place` field (a request id string) on the newer request. When the service
  supersedes R by N (R open, or R running: A6; N still open) it rewrites N's request file once (skipped if the file
  is gone), same id, with `place` = the smaller of
  (R.place ?? R.id) and (N.place ?? N.id). pick sorts by `place ?? id` wherever it sorts by id today (arrival, ties,
  the starvation check, the fix tier). Not "reuse the old id": the id is the file name and the claim key, and the old
  id already has a done claim. In the file, so both workers see it; affected-cap's re-file spreads the request and keeps
  it. Undo: ignore `place` (arrival by id).
- A5: Only a supersede passes the place on (lib `superseded` rules: same requester, or the per-branch affected rule).
  Another requester's fresh request for the same PR queues by its own id. A lead's request for a rebased head does not
  keep its place either: `superseded` needs ancestry for named-suite requests (only the per-branch affected rule skips
  it). Undo: any request of the same PR inherits.
- A6: A running request R is stopped when a newer request N pairs with it exactly as lib `superseded` pairs two open
  requests (same requester per `queueRequester`, same kind, compatible set, R not pinned, R's requester known), with
  three changes: suite bases overlap (not cover), N.sha contains R.sha (`git merge-base --is-ancestor`; required for
  affected requests too) and R is under 80% of its expected wall (the train preempt rule, `PREEMPT_MAX_PROGRESS`).
  So an affected request never stops a lead's run, nor the reverse. N may be open, claimed or running on either worker
  (checker FIX 2). Each worker stops its own runs (claimed and running here, lock wait and prepare included). A rebased
  head (old not an ancestor) is not stopped. Undo: stop at any progress, or `LQ_STOP_SUPERSEDED=0`.
- A7: The stopped run posts error "stopped: new head <sha8> queued (<new id>)" on its own contexts (and on
  `affected-e2e` for an automatic request), result `superseded-run`, done claim pushed; N gets R's place (A4). The old
  head's error never blocks anything: train-ready reads the current head. Undo: post nothing, like an open supersede.
- A8: The desktop orders what it may take as: fixes first, then smallest expected wall at `E2E_JOBS=1` (lib
  `expectedWallS`), unknown wall last, ties by place. The laptop tiers (front, green, arrival) do not apply there: the
  laptop already takes them in that order. Undo: the desktop uses the laptop order.
- A9: The ~15 min skip: `expectedWallS(r.suites, times, 1) > LQ_DESKTOP_MAX_MIN (15) * 60` and the desktop leaves the
  request to the laptop (log once per id). `times` = `scripts/e2e-times.json` (the seed) merged with the desktop's own
  `times.json` (its runs refresh it), as the service builds today; an unknown suite counts at the median; a request with
  no known suite (NaN) is taken. The backlog gate still counts skipped requests. 0 = no limit. Undo: 0.
- A10: Keep finished suites: on both workers (the same code), a pr request cut for a train keeps its passed suites
  (ok, not a known-flaky fail) in its request file as `kept: { sha, suites: [{ s, sec }] }` (one push, same id). The
  next run, on either worker, runs the other suites only; the verdict counts the kept passes and its description adds
  "; K kept". Failures rerun. At `E2E_JOBS=1` run-e2e streams and prints no per-suite result line, so run-e2e.mjs gains
  one (same format as the parallel one); a head cut before that line ships keeps nothing at `E2E_JOBS=1` (logged).
  `LQ_KEEP_FINISHED` (1). Undo: 0.
- A11: `LQ_DESKTOP_CPU_MODE`: `normal` (default) = today's gated load (lib `gatedCpu`: Normal or higher priority
  processes; a BelowNormal Blender bake does not count); `total` = the whole machine (`cpuTotalPct`). Both desktop
  slots and the desktop train gate use it; the log reason names the mode. `install-task.ps1` gains `-DesktopCpuMode` so
  a re-register keeps it. Undo: remove the knob (normal).
- A12: The PR carry covers the automatic `affected-e2e` only (not the leads' `laptop-e2e/<set>`, not `checker`). The
  affected pass walks H's first-parent chain back to the merge-base with origin/master (at most
  `LQ_TRAIN_CARRY_DEPTH` 20) and reuses laptop-queue-7's lib `carryFrom` / `carryFiles` / `carryDesc`: success on the
  newest commit with a final verdict and a docs-only delta -> H gets `affected-e2e` success "carried from <sha8>,
  docs-only delta"; an older commit pending with an open, claimed or running affected request and a docs-only delta ->
  H waits; else H runs as today. Status reads once per head per process. `LQ_PR_CARRY` (1). Undo: 0.
- A13: The `fix` label: the builder creates it once (`gh label create fix`, red, "tested before new features"); leads
  mark fix PRs and the orchestrator checks the marks each cron run (ROADMAP). No watchdog change: the label is not part
  of the train-ready rule.
- A14: Build base: laptop-queue-7 first (see PLAN "Start"). Undo: none needed.
- A15: Retry (item 7): each state.trains entry records the posted state, desc and `posted` / `doneSynced` flags. Each
  pass (both workers), for an open train head whose laptop-e2e reads '' or pending while state holds a final verdict
  and no other worker's live claim is on it, the verdict is posted again; a missing done claim is pushed again (one
  commit, apart from syncDone so a failed train push never stops request claims). No extra gh read: pendingTrains
  already reads each open head's status. Never posted over another final verdict (a train rerun's success stands).
  `LQ_TRAIN_RETRY` (1). Undo: 0.
- A16: Entries written before the change (no `state`) are repaired from `result`: success / carried -> success,
  failure / build / incomplete -> failure, nosha -> error; desc "<result> (re-posted)". Undo: skip entries without
  `state`.
- A17: Heartbeat bound (item 8): a claim written by a worker that heartbeats carries `beat` (ms); another worker's open
  claim blocks while younger than min(LQ_CLAIM_MAX_H, `LQ_CLAIM_BEATS` (4) x beat) = 20 min at the 5 min beat. The
  desktop heartbeats too (it did not), so its claims carry `beat`. A claim without `beat` keeps the 3 h rule. Undo:
  `LQ_CLAIM_BEATS=0` (and `LQ_HEARTBEAT_MIN=0` on the desktop).
- A18: Hold (item 9): an open train head whose laptop-e2e is '' or pending does not hold alone requests when this
  worker's state holds a final verdict for it or its claim is done (any worker): the verdict was lost, the retry posts
  it. A failed or errored head still holds as today (the train-46 rule). A pending head with a dead claim is run by this
  pass (stale pending rule, trains first in pick), so it holds only while it runs. Undo: `LQ_TRAIN_RETRY=0`.
- A19: The "alone requests held" log line repeats every 15 min while an aged alone stops pr claims (STATE carry-in),
  so a stuck hold shows in the log tail. Undo: log once per key.
