# laptop-queue-6 - plan
Owner: Test Runner. Status: current.

Problem and evidence: `BRIEF.md`. One Sonnet slice from this plan, Opus checker (queue code).

## Design
Replace the fixed gap with a predicted next-train time (ETA) and let only runs that fit before it start.
- Hold is on (laptop only, no train pending) when one of:
  - building: an open train PR without its version head, younger than `LQ_TRAIN_BUILD_MAX_MIN` (20): ETA = now
    (nothing fits; unchanged behaviour).
  - candidates > 0 (train-ready PRs, check green or running, head in no open train head and not in `origin/master`) and
    no open train PR other than a releasing one, with
    ETA = max(anchor + `LQ_TRAIN_GAP_MIN` (6.5), newest candidate first-seen + `LQ_TRAIN_READY_LAG_MIN` (3)), where
    anchor = the newest merged train's `mergedAt`, or for a releasing train (open, laptop-e2e success) its laptop-e2e
    `updated_at` + `LQ_TRAIN_MERGE_LAG_MIN` (2).
    The hold lasts until ETA + `LQ_TRAIN_LATE_MIN` (5), then lifts (auto-train is paced or blocked).
- Under the hold a request starts only when it is a train rerun (as today) or `fitsBeforeTrain`: kind `pr`, not
  alone / full, expected wall known, and now + `LQ_FIT_PREP_S` (120) + 1.2 x wall <= ETA.
- Numbers: merge to next train head seen 6.6 / 9.2 / 6.6 / 7.2 / 7.0 min (trains 102-106, deploy 4.4-5.5 min +
  build 1-3.7 min); label to head 3.0 min (train 102); laptop success to merge 0.5-2.6 min; prep 74-111 s.
- Cut side unchanged (`cutShort`).

## Code (file:line on origin/master eaf699d0f)
lib.mjs (pure, exported):
- `readyHeads(prs, inTrain)` (new, beside `readyOrPending` :686): the same filter, returns the heads;
  `readyOrPending` becomes `readyHeads(...).length` (its tests stay).
- `seenSince(prev, heads, now)` (new): Map head -> first-seen ms; keeps prev times for heads still listed, adds new
  heads at now, drops the rest. New Map.
- `nextTrain({ building, releasing, lastMerge, candidates, now }, lim)` (replaces `trainSoon` :705):
  building = { n, ageMs }, releasing = { n, laptopAtMs }, lastMerge = { n, atMs }, candidates = [first-seen ms];
  lim = { buildMaxMs, gapMs, readyLagMs, mergeLagMs, lateMs }. Returns null or { why, etaMs, untilMs }; why keeps today's
  texts ("train N building", "train N releasing, K train-ready PR(s) next", "train N released, K train-ready PR(s)
  waiting", new "K train-ready PR(s) waiting for a train" when only the ready lag holds).
- `fitsBeforeTrain(r, { now, etaMs, times, prepS })` (new): see Design; jobs = `r.jobs ?? 2`; uses `expectedWallS`
  (:352). `FIT_SLACK = 1.2` exported.
- Remove `trainSoon` and `RELEASE_HOLD_MS` (:679); `releasingTrain` (:668) stays (its ageMs gives laptopAtMs).

service.mjs:
- :45-50 header: replace the "Train soon" paragraph with two lines pointing at testing-tools.md "Laptop queue".
- :132-134 env: `LQ_TRAIN_GAP_MIN` default 3 -> 6.5 (now merge to next train); new `LQ_TRAIN_READY_LAG_MIN` (3),
  `LQ_TRAIN_MERGE_LAG_MIN` (2), `LQ_TRAIN_LATE_MIN` (5), `LQ_FIT_PREP_S` (120); drop `LQ_RELEASE_HOLD_MIN`.
- :546 `soon` becomes `next` (null or nextTrain's object); `sparePass` (:485) tests `next` the same way.
- :563 `readyOrPendingCandidates` -> `readyNow(openPrs)`: the same gh call, `readyHeads` with inTrain = ancestor of an
  open train head or of `origin/master` (fetched each pass, :246); updates a module Map via `seenSince`; returns the
  first-seen list. On a gh error: [] (never hold on a GitHub error).
- :571 `trainSoonNow` -> `nextTrainNow(openPrs, heads)`: building as today; candidates = `readyNow`; none -> null (no
  merged-PR call); releasing from `releasingTrain`; else, with no open train, the newest merged train (the existing
  gh call, :580) as lastMerge; any other open train -> null.
- :619 `soon = trainSoonNow(...)` -> `next = nextTrainNow(...)`; :600 error path `next = null`.
- :1517-1521 claim filter: keep `r.trainRerun || fitsBeforeTrain(r, { now, etaMs: next.etaMs, times, prepS })`; log
  once per why: "<why>, next train ~HH:MMZ: only runs that fit start"; when a request starts under the hold also log
  "<id>: fits before the next train (~N s)".

## Tests (tests/laptop-queue.test.ts, replace the `trainSoon` block :792-834)
- nextTrain: building < max -> etaMs = now; building >= max falls through; no candidates -> null (releasing and
  released); releasing laptop success 1 min ago -> etaMs = +7.5 min, untilMs = +12.5; released 3 min ago -> etaMs =
  merge + 6.5; now past merge + 11.5 -> null; late candidate (merge 20 min ago, seen 1 min ago) -> seen + 3; ETA is the
  max of both anchors; env-style lim with lateMs 0 ends at ETA.
- Replays from the log: train 103 (merge 10:40:34, now 10:46:02, candidates seen 10:27) -> held, ETA 10:47:04; train 102
  (merge 10:13:42, candidate seen 10:24:00, now 10:25:11) -> held, ETA 10:27:00; train 104 (merge 11:00:24, now
  11:08:41) -> held (late window), nothing fits.
- fitsBeforeTrain: 3-suite 12 s affected run, 3.25 min left -> true; the 7-suite 206 s run (eab8c758) -> false;
  `e2e-coop-real:1` (no time) -> false; alone, full -> false; etaMs = now (building) -> false; jobs 1 vs 2 changes it.
- readyHeads: excludes inTrain heads and failed / missing checks; readyOrPending still counts.
- seenSince: keeps old time, adds new at now, drops gone heads, does not mutate prev.

## Docs (one home per rule)
- docs/systems/testing-tools.md "Laptop queue" (:523): a new bullet "Train soon" after "Yield" (:552) holding the rule
  (hold cases, ETA, the fit rule, the five env knobs with defaults). This is its only home; today it lives only in
  the service.mjs header.
- docs/systems/auto-train.md: no rule change; :177 already says spare work waits while a train is building or releasing.
- docs/laptop-queue/STATE.md: one dated entry on top (Haiku chore at the end).
- changes/feature-laptop-queue-6.md: `# Laptop queue: hold PR runs until the next train`, `kind: patch`, two bullets
  (ETA hold from the release's deploy wait / a newly ready PR; only runs that fit before it start).

## Claims and size
scripts/laptop-queue/lib.mjs, scripts/laptop-queue/service.mjs, tests/laptop-queue.test.ts,
docs/systems/testing-tools.md, docs/laptop-queue/STATE.md, changes/feature-laptop-queue-6.md, docs/laptop-queue-6/**.
Estimate ~300 changed lines (lib ~70, service ~60, tests ~130, docs ~40).

## Verify
- Gate: CI `check` (queue code tier: unit tests; `affected-e2e` passes at once).
- Builder: `npx vitest run tests/laptop-queue.test.ts`, `npm run typecheck:fast`.
- Dry run in the worktree: `node scripts/laptop-queue/service.mjs --once --dry-run` prints the hold line with an ETA
  when a train-ready PR waits (or nothing when none); no claims are pushed.
- Live, after the train merges and the laptop fast-forwards: over the next 3 releases grep the log for
  `preempted by train` on pr runs (expect none claimed after a "next train ~" line), `only runs that fit start` lines,
  and that the slots sit idle no longer than ETA + 5 min after each merge.
