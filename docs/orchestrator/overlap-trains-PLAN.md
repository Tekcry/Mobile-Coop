# Overlapping merge trains (depth 2) - plan

Michael 2026-10-24 ~21:00 (native multiple choice, ROADMAP Decided "Train speed-ups"). Opus plan, read at origin/master
bd54dfcd (4.95.3). The repo has no branch protection or rulesets.

## 1. Branch and version mechanics
- Build N+1 on train/N's version head V_N (the head being tested). Members = train-ready PRs with a green check, minus
  N's members (by branch). After N merges as M_N = merge(master_prev, V_N), tree(M_N) = tree(V_N), so GitHub's merge of
  N+1's head T into M_N yields tree(T): zero delta between tested and merged. No CI rerun (waitCi merge-train.mjs:412
  finds T's green run). Rebasing onto master after N merges is rejected (new sha, ~15 min CI).
- Version: N+1 = bumpVersion(N's version, kind); plan() reads master's package.json today (auto-train.mjs:738), must use
  the base train's version. versionRace (merge-train.mjs:561, 702) still holds.
- CHANGELOG: no change in changelog-assemble.mjs; V_N already consumed N's fragments; assembleDir (:144) only sees N+1's,
  `known` dedupes (:107-113).
- merge-train.mjs bugs for stacking: membersFromLog (:126-133) matches any `into train/\d+` and trainMembers (:494) logs
  origin/master..head, so N's members would leak into N+1's PR body, CHANGELOG heading, closeMembers and wire
  candidates: filter by n like auto-train's membersFromSubjects (auto-train.mjs:136-144). planWire takes master's
  PROTOCOL_VERSION (:549) and bumpProtocol sets master+1 (:213-216): use the base head's value. Build always starts at
  origin/master (:577): add `build ... --on <sha>` (sha = origin/train/<m> head, contains origin/master, carries train
  m's version commit) and a PR body marker `<!-- auto-train:base train/<m> <sha> -->`.
- Release order, one tick under the tick lock: N merge, tag vN, push dev (mergeAndTag :459-474); re-read; N+1 merge
  pinned to T, tag, push dev (fast-forward). Check tag vN exists on origin before N+1. Retry `gh pr merge` (:461) up to
  ~2 min on "not mergeable / base modified".
- Release re-checks (replace merge-train.mjs:698-701), all mandatory:
  (a) foreign-version guard, always on: first-parent subjects of origin/master..head contain another train's version
      commit -> STOP (exit 4 "base train not merged"). The key master-safety guard; must not depend on auto-train.
  (b) stacked case (master not in head): accept only if the base head is an ancestor of origin/master, the tree of
      `git merge-tree --write-tree origin/master T` equals tree(T), and the base sha recorded at build equals it; else
      exit 3.
  (c) post-merge assert tree(merge) == tree(T): log loudly, state error.

## 2. Failure handling
| Case | Action |
| --- | --- |
| N desktop fail, laptop rerun pending (auto-train.mjs:444-480) | N+1 stays valid; wait |
| N final fail (CI, e2e, rerun) | void N+1 (close PR with comment, members keep label, queue cancels its run); auto-drop rebuilds N; next tick builds N+1 on the new N |
| N release exit 3 / train/N head moved | void N+1; N rebuilt as today (:875-886) |
| N+1 fails while N testing | state next-failed-waiting; do not drop yet (may be N's fault) |
| N+1 fails, N passes | release N; auto-drop picks the culprit among N+1's own members only (membersFromSubjects(..., n)), rebuild N+1 from master |
| N+1 green, N testing | next-green-waiting; never release before N |
Each train its own laptop rerun (rerunSet(n)); move the per-head rerun record into next.rerun.

## 3. Queue service (scripts/laptop-queue/)
- Second train to the desktop: desktopTrainGate (lib.mjs:483-489, service.mjs:934) takes trains only when the laptop is
  silent. workerActivity (lib.mjs:463-475) also returns openTrain (laptop's last "claim train n" with no later done /
  release); the gate passes for another head when set. The claim push (service.mjs:997) stays the guard.
- Priority: pendingTrains is ls-remote (lexicographic) order (service.mjs:404-427): sort ascending by number; pick takes
  trains[0] (lib.mjs:111). In pick (lib.mjs:108-114) a lower train's rerun goes before a higher pending train.
- Build marker (service.mjs:982 trainBuilding) blocks every desktop start while N+1 builds: let trains below
  marker.train through.
- Void-train cancel: each pass runTrain (:618) checks its head is still an open train PR head; if not, kill, post error
  "train closed", release the claim.
- One full run per machine kept (CLAUDE.md), no sharding change.

## 4. Status, depth, flag
Top-level status fields stay the front train. Add `overlap: {on, maxDepth}`, `next: {state: testing | building |
green-waiting | failed-waiting | void, train, version, head, pr, base: {train, head}, members, reason, rerun}`,
`released` as a list. Log prefix `train 65 (next, on 64 @abcd1234):`. Add next-* to FAST_POLL_STATES
(auto-train.mjs:492). MAX_DEPTH 2 (env AUTO_TRAIN_MAX_DEPTH clamped 1..2). Flag `tick --overlap on|off`, env
AUTO_TRAIN_OVERLAP, kill file C:/NightShift/scratch/auto-train-overlap.off read each tick. Default OFF until one watched
pair; off stops new N+1 builds only. N+1 bypasses pacing() (:302-312, :826); the check-hold (:830) still applies.

## 5. Slices
1. merge-train.mjs: --on build, members by n (:126, :494), base protocol (:549), body marker (:93), release guards
   a / b / c (:698), tag-exists check, mergeable retry (:461). Tests tests/mergeTrain.test.ts. Parallel.
2. tests/changelogAssemble.test.ts: CHANGELOG with N's section + N+1's fragments -> one new section, no repeats. Parallel.
3. laptop-queue lib.mjs / service.mjs (section 3), tests/laptop-queue.test.ts. Parallel; inert without stacked trains.
4. auto-train.mjs (after auto-drop merges and after slice 1): openTrains front + next (:657-699), decideNext,
   candidates exclude front members (:706), build with base / plan with base version (:732-740, :791-820), release next
   after front (:869-874), void next on front fail / rebuild / auto-drop, status next (:974-979), flag, pacing bypass.
   Tests tests/autoTrain.test.ts.
5. docs/systems/auto-train.md (state machine, laptop queue, rules); ships with 4. Enable with `-TickArgs "--overlap on"`
   in scripts/auto-train-task.ps1 after one watched pair.

## Minutes saved
Labelled while N is in flight: today ~14-25 min for N then 14-25 for its own (median label -> master ~43 min); with
overlap ~22-27 min: ~16-20 min saved per such PR. No change on an idle train.

## Risks to master
1. N+1 merging before N or while N fails (pulls N in unreleased): guard (a). 2. GitHub merge tree differing from
merge-tree: assert (c). 3. Duplicate version / PROTOCOL_VERSION from master reads: slices 1 and 4. 4. Wrong members in
the permanent CHANGELOG heading: slice 1 n-filter. 5. N's rerun stuck behind N+1's full run: slice 3 pick priority.
