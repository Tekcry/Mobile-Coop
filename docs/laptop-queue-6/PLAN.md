# laptop-queue-6 - plan
Owner: Test Runner. Status: current.

Problem and evidence: `BRIEF.md`. One Sonnet slice from this plan, Opus checker (queue code).

## Design
Replace the fixed gap with a predicted next-train time (ETA) and let only runs that fit before it start.
- Candidates = train-ready PRs whose head is in no open train head and not in `origin/master`. green = `check`
  success; running = `check` not completed; a failed or missing check counts for nothing. Each green head has a
  first-seen-green time (persisted, `state.trainReady`).
- Hold is on (laptop only, no train pending) when one of:
  - building: an open train PR without its version head, younger than `LQ_TRAIN_BUILD_MAX_MIN` (20): ETA = now
    (nothing fits; unchanged behaviour).
  - releasing (open train, laptop-e2e success) or released (no open train, newest merged train), with green or
    running candidates > 0: merge = `mergedAt`, or laptop-e2e `updated_at` + `LQ_TRAIN_MERGE_LAG_MIN` (2) while
    releasing; ETA = max(merge + `LQ_TRAIN_GAP_MIN` (6.5), newest first-seen-green + `LQ_TRAIN_READY_LAG_MIN` (3)).
    Running heads keep this hold on but are left out of the max: they never set or extend the ETA.
  - green candidates > 0 and no open train, merge long past: ETA = newest first-seen-green + 3 min. Running heads alone
    never start a hold (auto-train builds only on green and holds at most 3 min per running head, auto-train.md:80).
  - Any other open train (running its e2e, failed) -> no hold from this rule.
  The hold lasts until ETA + `LQ_TRAIN_LATE_MIN` (5), then lifts.
- Pacing assumption (written in the doc bullet): auto-train builds right after the release in the same tick
  (auto-train.md:74); when its pacing waits, each release costs at most 11.5 min of held slots (the late bound).
- Under the hold a request starts only when it is a train rerun (as today) or `fitsBeforeTrain`: kind `pr`, not
  alone / full, expected wall known, and now + `LQ_FIT_PREP_S` (120) + 1.2 x wall <= ETA. A fitted run caught by an
  early train falls to `cutShort`'s 80% rule (train 105 came at merge + 6.58 min against the 6.5 gap).
- Numbers: merge to next train head seen 6.6 / 9.2 / 6.6 / 7.2 / 7.0 min (trains 102-106, deploy 4.4-5.5 min +
  build 1-3.7 min); label to head 3.0 min (train 102); laptop success to merge 0.5-2.6 min; prep 74-111 s.
- Cut side unchanged (`cutShort`). Expected: 5 of 6 cuts held (~15.5 slot-min), ~11.6 slot-min idle, net ~+4 per 5
  trains plus 5 fewer reruns (BRIEF A9).

## Code (file:line on origin/master eaf699d0f)
lib.mjs (pure, exported):
- `readyHeads(prs, inTrain)` (new, beside `readyOrPending` :686): returns { green: [heads], running: [heads] } with
  the same filter; `readyOrPending` becomes green + running count (its tests stay).
- `seenSince(prev, greenHeads, now)` (new): plain object head -> first-seen-green ms; keeps prev times for heads still
  green, adds new ones at now, drops the rest. New object (state.json-safe).
- `nextTrain({ building, releasing, lastMerge, green, running, now }, lim)` (replaces `trainSoon` :705):
  building = { n, ageMs }, releasing = { n, laptopAtMs }, lastMerge = { n, atMs }, green = [first-seen-green ms],
  running = count; lim = { buildMaxMs, gapMs, readyLagMs, mergeLagMs, lateMs }. Returns null or { why, etaMs, untilMs };
  why keeps today's texts ("train N building", "train N releasing, K train-ready PR(s) next", "train N released, K
  train-ready PR(s) waiting") plus "K train-ready PR(s) waiting for a train" for the ready-lag case.
- `fitsBeforeTrain(r, { now, etaMs, times, prepS })` (new): see Design; jobs = `r.jobs ?? 2`; uses `expectedWallS`
  (:352). `FIT_SLACK = 1.2` exported.
- Remove `trainSoon` and `RELEASE_HOLD_MS` (:679). `releasingTrain` (:668) stays; its doc (:664) says nextTrain.

service.mjs:
- :45-50 header: replace the "Train soon" paragraph with two lines pointing at testing-tools.md "Laptop queue".
- :132-134 env: `LQ_TRAIN_GAP_MIN` default 3 -> 6.5 (now merge to next train); new `LQ_TRAIN_READY_LAG_MIN` (3),
  `LQ_TRAIN_MERGE_LAG_MIN` (2), `LQ_TRAIN_LATE_MIN` (5), `LQ_FIT_PREP_S` (120); drop `LQ_RELEASE_HOLD_MIN`.
- :545-546 `let soon` becomes `let next` (null or nextTrain's object), comment names nextTrain; `sparePass` (:485)
  tests `next`; its doc (:477-481) says nextTrain.
- :563 `readyOrPendingCandidates` -> `readyNow(openPrs)`, called once per pass from pendingTrains: the same gh call,
  `readyHeads` with inTrain = ancestor of an open train head or of `origin/master` (fetched each pass, :246);
  `state.trainReady = seenSince(...)`, saveState only when it changed. Result kept in a module `ready` ({ green,
  running, firstSeen }). On a gh error: `ready` = empty (never hold on a GitHub error).
- `aloneSoon` (:1467) and sparePass (:494) read `ready.green.length` instead of `readyCandidates()`; remove
  `readyCandidates` (:552) and its gh call.
- :571 `trainSoonNow` -> `nextTrainNow(openPrs, heads)`: building as today; no green and no running -> null (no
  merged-PR call); releasing from `releasingTrain`; else, with no open train, the newest merged train (the existing
  gh call, :580) as lastMerge; any other open train -> null.
- :619 `soon = trainSoonNow(...)` -> `next = nextTrainNow(...)`; :600 error path `next = null`.
- :1517-1521 claim filter: keep `r.trainRerun || fitsBeforeTrain(r, { now, etaMs: next.etaMs, times, prepS })`; log
  once per why: "<why>, next train ~HH:MMZ: only runs that fit start"; a request started under the hold logs
  "<id>: fits before the next train (~N s)".

## Tests (tests/laptop-queue.test.ts, replace the `trainSoon` block :792-834)
- nextTrain: building < max -> etaMs = now; building >= max falls through; no candidates -> null (releasing and
  released); releasing, laptop success 1 min ago -> etaMs = +7.5 min, untilMs = +12.5; released 3 min ago -> merge +
  6.5; now past merge + 11.5 -> null; late green candidate (merge 20 min ago, seen 1 min ago) -> seen + 3; ETA is the
  max of both anchors; lateMs 0 ends at ETA; open non-releasing train (no lastMerge, no releasing) -> null.
- Running / failed checks: released 3 min ago with only a running candidate -> held, ETA = merge + 6.5 (not
  extended); merge 20 min ago with only a running candidate -> null; a running head seen later than the green one
  does not move the ETA; a failed-check candidate (readyHeads) counts for nothing -> null.
- Replays from the log: train 103 (merge 10:40:34, now 10:46:02, green seen 10:27) -> held, ETA 10:47:04; train 102
  (merge 10:13:42, green seen 10:24:00, now 10:25:11) -> held, ETA 10:27:00; train 104 (merge 11:00:24, now 11:08:41)
  -> held (late window), nothing fits; train 106 (merge 11:43:07, green seen 11:44:55, now 11:47:00) -> held, ETA
  11:49:37. Not replayed as held: train 105 / 10dc0a9e (no candidate visible at 11:24:01, BRIEF A8).
- fitsBeforeTrain: 3-suite 12 s affected run, 3.25 min left -> true; the 7-suite 206 s run (eab8c758) -> false;
  `e2e-coop-real:1` (no time) -> false; alone, full -> false; etaMs = now (building) -> false; jobs 1 vs 2 changes it.
- readyHeads: green / running split; failed and missing checks dropped; inTrain (injected) drops a head already in
  an open train or in origin/master; readyOrPending still counts green + running.
- seenSince: keeps old time, adds new at now, drops gone heads, does not mutate prev; a restart-style call with the
  persisted object keeps the old times.
- GitHub error: `readyHeads` on unreadable input (undefined / bad JSON parsed to []) -> empty, and nextTrain with
  empty green / running -> null.

## Docs (one home per rule)
- docs/systems/testing-tools.md "Laptop queue" (:523): a new bullet "Train soon" after "Yield" (:552): the hold cases,
  green vs running, the ETA, the fit rule (and its reliance on cutShort's 80% rule), the pacing assumption and its
  11.5-min bound, the five env knobs with defaults. Its only home; today it lives only in the service.mjs header.
- docs/systems/auto-train.md: no rule change; :177 already says spare work waits while a train is building or releasing.
- docs/laptop-queue/STATE.md: one dated entry on top (Haiku chore at the end).
- changes/feature-laptop-queue-6.md: `# Laptop queue: hold PR runs until the next train`, `kind: patch`, two bullets
  (ETA hold from the release's deploy wait / a newly green PR; only runs that fit before it start).

## Claims and size
scripts/laptop-queue/lib.mjs, scripts/laptop-queue/service.mjs, tests/laptop-queue.test.ts,
docs/systems/testing-tools.md, docs/laptop-queue/STATE.md, changes/feature-laptop-queue-6.md, docs/laptop-queue-6/**.
Estimate ~350 changed lines (lib ~80, service ~70, tests ~160, docs ~40).

## Verify
- Gate: CI `check` (queue code tier: unit tests; `affected-e2e` passes at once).
- Builder: `npx vitest run tests/laptop-queue.test.ts`, `npm run typecheck:fast`.
- Dry run in the worktree: `node scripts/laptop-queue/service.mjs --once --dry-run` prints the hold line with an ETA
  when a green train-ready PR waits (nothing when none); no claims are pushed; state.json is not written in dry run.
- Live, after the train merges and the laptop fast-forwards: over the next 3 releases grep the log for
  `preempted by train` on pr runs (expect none claimed after a "next train ~" line), `only runs that fit start` lines,
  and that the slots sit idle no longer than ETA + 5 min after each merge.
