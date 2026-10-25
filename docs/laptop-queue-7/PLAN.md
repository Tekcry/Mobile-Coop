# laptop-queue-7 - plan
Owner: Test Runner. Status: current.

Problem, sources and assumptions: `BRIEF.md`. One PR (feature/laptop-queue-7), six slices built in order on the
branch (they share lib.mjs, service.mjs and the test file, so never in parallel). Builders: slices A, B, E Sonnet 5.5
from this plan; slices C, D, F Opus (train path, two concurrent child runs, hold logic). One Opus checker for the
PR (queue code).
file:line below is origin/master 2a937eb6.

## Shared: the PR board (slice A builds it, B uses it)
- service.mjs new `prBoardNow()` beside `readyNow` (:561): one `gh pr list -R <repo> --state open --limit 200 --json
  number,headRefOid,mergeable,statusCheckRollup` per `LQ_PR_BOARD_S` (60) s on both workers (the desktop reads it too:
  it runs pr requests). Result in a module `board` = lib `prBoard(rows)`; on a gh error `board` = empty Map (nothing is
  skipped and nothing is green: never act on a GitHub error).
- lib.mjs `prBoard(rows)` (new, pure, near `readyHeads` :684): Map pr -> { head, conflicting: mergeable ===
  'CONFLICTING', green: check run `check` conclusion SUCCESS and status context `checker` state SUCCESS }. UNKNOWN /
  MERGEABLE / missing = not conflicting.
- affectedPass (:435) keeps its own listing (it needs isDraft / labels / headRefName) but adds `mergeable` to its
  `--json` fields (:438), so it does not wait for the board.

## Slice A - skip conflicting affected requests (BRIEF item 1, A1, A2)
- lib.mjs `affectedNeeds` (:997): rows with `mergeable === 'CONFLICTING'` come back as { ..., conflicting: true }
  (not dropped: the service posts the error once). A head with a final affected-e2e status is skipped as today, so the
  error is posted once per head.
- service.mjs affectedPass (:446 loop): after the zero-suite case (a conflicting docs / unit-only head keeps today's
  "no browser suites" success), `n.conflicting` and `LQ_SKIP_CONFLICTING` on -> `postStatus(sha, 'error',
  AFFECTED_CTX, 'not run: PR #n conflicts with master (a new head runs again)')`, `affectedSeen.add`, log once
  "affected: #n <sha8>: CONFLICTING, not run"; no request pushed.
- lib.mjs `conflictRetire(requests, board)` (new): ids of open requests with `set === 'affected'` whose `pr` is on the
  board, conflicting, and whose board head equals `r.sha`. Pure.
- service.mjs pass() (:1453, after `applyDuplicates` :1461, both workers): for each id from `conflictRetire`: a done
  claim like a duplicate (one push for all, reuse the duplicate path in `applyDuplicates` :1394: `state.done[id] =
  { result: 'conflict', ... }`), statuses from new lib `conflictStatuses(r)` = [[`laptop-e2e/affected`, error,
  text], and for requester `affected-e2e` or set `affected`: [`affected-e2e`, error, text]], log "<id>: not run, PR #n
  conflicts with master". The request leaves `queue.requests` before pick and `realOpen` (spare work) is computed
  after it, so a retired request never keeps a spare back.
- Tests (tests/laptop-queue.test.ts, extend "affected e2e on every PR head" :1135): affectedNeeds marks CONFLICTING,
  keeps MERGEABLE / UNKNOWN plain; prBoard parses the three mergeable values, check + checker green, a failed or
  pending checker not green, a missing rollup; conflictRetire: affected request on the current conflicting head ->
  retired; older sha (a newer head exists) -> not (superseded handles it); UNKNOWN -> not; a lead's named-suite request
  (set not `affected`) -> not (A2); empty board (gh error) -> nothing; conflictStatuses for automatic vs filed.
- Size ~45 lib, ~35 service, ~70 tests.

## Slice B - front, green smallest-first, then arrival (BRIEF item 2, A3-A6)
- lib.mjs `pickFrom` (:260): only the choice of `next` among non-alone requests (:276-282) changes; trains, early and
  plain train reruns, the aged / front alone rule (:272-275), the alone-when-idle fallback and the slot rules stay.
  New order when `queue.order` is given (the service passes it; absent = today's code path, so every old test holds):
  1. front: `isFront(r, frontBranches)` (new, exported): branch contains a `LQ_FRONT_BRANCHES` entry
     (case-insensitive) or `idTime(r.id)` is NaN or before 2020-01-01 (an early-id re-file). Oldest id first.
  2. green: `queue.order.green` (Set of ids) - smallest `queue.order.wallS[id]` first, unknown wall after known, ties
     by id. Skipped for this pick when `queue.order.maxWaitMs > 0` and the oldest non-front request, green or not, is
     older than that (A5); tier 1 still goes first.
  3. else today's rule over the non-front requests: the requester who waited longest, its highest `priority`, then
     oldest.
  `pick` (:253) passes `order` through; spare-only picks ignore it.
- service.mjs pass(): before the pick loop (:1543) build `queue.order` = { green: ids of kind `pr` (not trainRerun,
  not laptopRerun, not spare) whose `board.get(r.pr)` has `head === r.sha` and green; wallS: `expectedWallS(r.suites,
  times, r.jobs ?? (DESKTOP ? 1 : 2))` per id; frontBranches; maxWaitMs } when `LQ_GREEN_FIRST` is on. Log once per
  change "order: front <k>, green <k> (smallest first)". The desktop filter (:1489) runs before, so the desktop orders
  only what it may take; `fitsBeforeTrain` (:1517 filter) runs before too, so under a train hold only fitting runs are
  ordered.
- Tests (new describe "pick: front, green smallest first" beside :56): green 3-suite 12 s request beats an older plain
  request; two green: the smaller wall first, unknown wall last; a `feature/mixamo-x` request (not green) beats a
  green one; an early-id (`000006...`) request beats green; trains, train reruns and an aged alone request still go
  first (reuse the :1064 and agedAlone setups); max-wait: plain request 31 min old -> arrival order this pick; a
  green 206 s request 31 min old beats a newer green 12 s one; a front request still beats both under max-wait; no
  `order` -> identical results to the existing :18 / :56 cases (run them once with `order` empty too); green request
  on a stale sha is not green (service-side helper `greenIds(requests, board)` exported from lib and tested).
- Size ~50 lib, ~25 service, ~90 tests.

## Slice C - a train head that moves (BRIEF item 3, A7-A9)
- lib.mjs (pure, new):
  - `docsOnlyFiles(files)`: moved here from scripts/watchdog.mjs:227 (same regex); watchdog.mjs re-exports it
    (`export const docsOnlyFiles = lq.docsOnlyFiles;`, it already imports lib as `lq`), so G325 and the carry share
    one definition.
  - `versionAt(lines, n)`: `git log --first-parent -n <depth> --format=%H%x09%s <head>` lines -> { versionSha, index }
    of train n's newest "<v>: version at merge, train <n> (G183)" commit, or null. `isVersionHead(subject, n)` for the
    two existing regex tests.
  - `carryFiles(files)`: `docsOnlyFiles(files)` and no file under `docs/` that does not end `.md` (BRIEF F6: docs/
    JSON is read by the game and by suites).
  - `carryFrom(chain, filesBetween)`: chain = [{ sha, laptop }] from H's parent back to V (newest first). C = the
    newest with a final verdict (success, failure or error). Returns { from: C } when C's verdict is success and
    `carryFiles(filesBetween(C))` holds; { wait: P } when a commit newer than C (or any, with no C) is `pending` and
    `carryFiles(filesBetween(P))` holds (its run is going: A7, A8); else null.
  - `carryDesc(sha)`: "carried from <sha8>, docs-only delta" (under 140 chars).
- service.mjs:
  - `pendingTrains` (:629): replace the subject test with: H's subject is the version (as today), else `versionAt`
    finds V within `LQ_TRAIN_CARRY_DEPTH` (20) and H has no `laptop-e2e` status -> moved head. For a moved head with
    `LQ_TRAIN_CARRY` on: read `laptop-e2e` on each chain commit (gh status calls, at most depth, once per head per
    process: a `carryChecked` Map), `git diff --name-only C H`; carry -> `postStatus(H, 'success', 'laptop-e2e',
    carryDesc(C))`, `state.trains[H] = { result: 'carried', from: C }`, log "train <n> <H8>: carried from <C8>,
    docs-only delta"; `wait` -> H is not pushed this pass on either worker (log once "train <n> <H8>: waits for
    <P8>, docs-only delta"; the carryChecked entry is dropped so the next pass reads again); else push H like any
    pending train (sharded full run). A gh error skips H this pass (as today).
  - `nextTrainNow` `isVersion` (:576): true also when `versionAt` finds V (a moved head is not "building").
  - `runTrain` void watch (:954-961): `openTrainHeads()` (:652) is read as a Map n -> head; when train n's open head is
    not train.sha but a descendant whose `git diff --name-only <train.sha> <head>` is docs-only, the miss does not count
    (A8). On a pass (finish, :1037) the run also posts `carryDesc(train.sha)` on train n's current head when that
    head is such a descendant and has no `laptop-e2e` status.
- auto-train.mjs: no code change (F1). tests/autoTrain.test.ts: one case beside :796: `decide` with a train whose head
  has `laptop-e2e` success "carried from 546a2286, docs-only delta", CI success, `resume: true` -> state releasing and
  `releaseArgs` includes `--resume` and `--head <H>`.
- Tests (tests/laptop-queue.test.ts, new describe "train head moves (trains 111 / 112)"): versionAt finds V under a
  fix commit, not past depth, not another train's version; isVersionHead; carryFrom: docs-only delta (docs/x.md,
  changes/f.md, CHANGELOG.md, src/a/README.md) -> carried; `src/x.ts`, `package.json` or
  `docs/kestrel/kestrel.blocks.json` in the delta -> null; newest success wins over an older one; a failure (or
  error) after a success -> null (V pass, D1 fail, H = D2: not carried); failure / no status on every chain commit ->
  null; a pending docs-only ancestor -> { wait }; a pending ancestor with a code delta -> null; docsOnlyFiles([])
  false and the watchdog re-export is the same function; carryDesc length.
- Size ~60 lib, ~70 service, ~1 watchdog, ~25 autoTrain tests, ~70 tests.

## Slice D - a train rerun shards when the laptop is free (BRIEF item 4, A10)
- lib.mjs: `suiteParts(suites, times)` (new; the part expansion now inside `expectedWallS` :352, which then calls
  it). `pickFrom` train-rerun branch (:270-271): returns { kind: 'request', request, slot: idle[0].port, ports: [both]
  } when both slots are idle, no other open train rerun, and `queue.shardRerun?.has(r.id)`; else as today. The early
  rerun under a pending train (:266-267) never shards.
- service.mjs:
  - pass(): `queue.shardRerun` = ids of open train reruns with `suiteParts(...).length >= 2`, laptop only, when
    `LQ_RERUN_SHARD` on.
  - `dispatch` (:1275): a request pick with `ports` marks both slots busy (as alone does) and passes the ports to
    `runRequest`.
  - `runRequest` (:1081): with two ports and `r.trainRerun`: locks and `prepare` on both (as alone / runTrain do), the
    parts split by `shard(parts, times, 2)` (:541), `e2e(port, bin, 1, ...)` on both at once, each with its own ctl
    (the watch's withdrawn cut kills both), results merged, `runComplete` per bin, `rerunFlakes` with the slot map
    (:838), one verdict through `finish` (:900) and the `laptop-e2e` success on a pass (:1257) as today. Status pending
    "rerun sharded on 4189+4192". `jobs` stays 1 per slot (:1220 comment updated).
  - A lock or `prepare` that fails on one of the two slots: release that slot (lock, busy, port) and run every part
    on the slot that prepared, as today's one-slot rerun (log "<id>: <port> <why>, rerun on <other> alone"); both
    fail: as today's one-slot failure path.
- Tests (extend "train reruns" :1064): both idle, one rerun with 2+ parts -> ports both; one slot busy -> one slot;
  two open reruns -> one slot each (no shard); a pending train -> the train (or the early rerun on one slot);
  shardRerun absent -> today's results; a rerun's two-slot run with one slot's prepare failing -> the checker reads the
  fallback (service code, no unit test); suiteParts expands `e2e-desktop` into its times parts and keeps unknown names.
- Size ~20 lib, ~90 service, ~50 tests.

## Slice E - verify laptop-queue-6 across the next train (BRIEF item 5), docs, fragment
- Test only (new describe "train hold across the next train" after :851): one timeline on nextTrain + fitsBeforeTrain
  + pick: train N laptop success with a green candidate -> hold, ETA = success + 2 + 6.5 min; a 12 s fit starts, a
  206 s run does not; train N+1 building -> ETA = now, nothing fits; N+1 head pending -> pick returns the train (trains
  first); N+1 laptop success with another green candidate -> a new hold with N+1's ETA; no candidates left -> null.
  If any step fails, the fix goes in this slice (budget ~80 lines) and the BRIEF gets an F entry.
- Live read (Test Runner, no code): laptop log since 4.105.1: every `preempted by train` on a pr run claimed after a
  "next train ~" line, and the idle gap per release vs ETA + 5 min. Result one line in STATE.
- Docs below; changelog fragment; service.mjs header comments (:22-24 reruns, :45-46, :74-94 affected) one line each.

## Slice F - an aged alone gets the gap after the coming train (BRIEF item 6, A12; built before E's docs)
- Cause (service.mjs): the train-soon filter (:1527) keeps only train reruns and fitting pr runs, so an alone (never
  fits) is dropped even when aged; the aloneSoon filter (:1471-1475) keeps an aged alone, but the train-soon filter
  after it drops it again; with train-ready PRs arriving the hold re-arms after every release.
- lib.mjs (pure, new, beside `agedAlone` :292):
  - `aloneDue(prev, { requests, front, now, held })`: plain object id -> first-held ms for open alone requests that are
    aged (`agedAlone` rule) or in `front`, stamped at `now` when `held` (a hold dropped them this pass); keeps old
    stamps, drops ids no longer open. New object (state.json-safe, `state.aloneDue`).
  - `aloneGapOpen(due, id, lastTrainEndMs)`: true when `due[id]` exists and `lastTrainEndMs > due[id]`.
  - `cutShort` (:525): new option `due = false`; a due alone is not cut by `youngAlone` (yields between steps stay).
- service.mjs:
  - `lastTrainEnd` (module, ms; also `state.lastTrainEnd`): set when `runTrain` posts its final `laptop-e2e`
    (success / failure, :1037-1038) and when slice C posts a carry; never on a cut, error or yield.
  - pass(): compute `state.aloneDue` after the aloneHold / aloneSoon / train-soon filters (held = an aged or front alone
    was filtered out). The aloneSoon filter (:1475) and the train-soon filter (:1527) keep an alone r when
    `LQ_ALONE_GAP` is on and `aloneGapOpen(state.aloneDue, r.id, lastTrainEnd)`. `pick` then needs no change: aged /
    front alone goes ahead of PR work with both slots idle (:272-275), trains still first (:264-268). The aloneHold
    filter (:1463, an open train without its laptop success) is unchanged: the gap starts after that run ends anyway.
  - runRequest watch (:1113): `cutShort(r, { ..., due: aloneGapOpen(state.aloneDue, r.id, lastTrainEnd) })`; the
    due entry is deleted when the alone finishes (done) or is withdrawn.
  - Log once per id: "<id>: aged alone due after the next train" and "<id>: gap after train <n>: alone goes first".
- Tests (new describe "aged alone after the coming train"): aloneDue stamps an aged alone only when held, keeps the
  stamp, drops a done id, ignores a young alone and spare work; aloneGapOpen false before a train ends, true after;
  pick with the due alone in the list and both slots idle -> the alone (both slots) ahead of a green pr request; a
  pending train -> the train first; cutShort: a due alone 3 min in is not cut by a pending train, a non-due alone is;
  timeline: hold on (green candidate), aged alone held at t0, train N runs and ends at t1 > t0, next hold re-armed by a
  new candidate -> the alone still passes the filter (lib filter helper `holdKeeps(r, { next, due, lastTrainEnd,
  fits })` exported so the filter is unit-tested, not only the service).
- Size ~35 lib, ~40 service, ~70 tests.

## Env knobs (service.mjs env block :119-141)
| Knob | Default | Off / undo |
| --- | --- | --- |
| `LQ_PR_BOARD_S` | 60 | - (read interval of the PR board) |
| `LQ_SKIP_CONFLICTING` | 1 | 0 = conflicting heads run (A1) |
| `LQ_GREEN_FIRST` | 1 | 0 = arrival order only (A3) |
| `LQ_FRONT_BRANCHES` | `mixamo` | empty = no branch front tier (A4) |
| `LQ_GREEN_MAX_WAIT_MIN` | 30 | 0 = no starvation bound (A5) |
| `LQ_TRAIN_CARRY` | 1 | 0 = a moved head always runs (A7, A8) |
| `LQ_TRAIN_CARRY_DEPTH` | 20 | commits walked back to the version commit |
| `LQ_RERUN_SHARD` | 1 | 0 = one slot (A10) |
| `LQ_ALONE_GAP` | 1 | 0 = today's holds keep an aged alone back (A12) |

## Risks
- GitHub's `mergeable` is computed lazily: a fresh push reads UNKNOWN for a pass or two; UNKNOWN runs (never skipped).
  A wrong CONFLICTING costs one head its auto run; the lead re-requests (RULES "Getting to master" fallback command).
- A docs delta the game or a suite reads would carry a stale verdict: docs/kestrel JSON is imported by
  src/world/maps/kestrel.ts and read by e2e-kestrel / e2e-editor (BRIEF F6), so `carryFiles` carries only `.md` under
  `docs/`. The builder greps `src/` and `scripts/` for other `docs/` reads of `.md` files and lists any hit in the PR
  body. CI `check` still runs on H, and auto-train still needs it green.
- Green-first can delay a non-green request; bounded by A5 and the front tier.
- Two concurrent child runs in runRequest: a cut must kill both trees; slice D's checker reads the ctl handling.
- PR board call: one extra gh call per minute per worker (rollup included, 200 PRs); within the rate budget of today's
  affected pass. The desktop adds one call per minute.
- The RULES.md order line is orchestrator-owned and at budget (A11).
- Slice F delays the next train by up to one alone run, once per aged request (A12); the train-soon ETA does not know
  about it, so the hold may lift (ETA + 5 min) while the alone still runs; PR work then waits on both slots anyway.

## Test tier and verify
- Tier: queue and train scripts = CI `check` (unit tests; `affected-e2e` passes at once as docs / unit only). A live
  run only when the lead says.
- Builder per slice: `npx vitest run tests/laptop-queue.test.ts tests/autoTrain.test.ts`, `npm run typecheck:fast`,
  `node scripts/doc-lint.mjs` (slice E).
- Dry run in the worktree: `node scripts/laptop-queue/service.mjs --once --dry-run`: the "order:" line, conflicting
  affected heads logged as not run, no state.json written.
- Live (after the train merges and the laptop fast-forwards): the next train head that moves shows "carried from" or a
  sharded train run (not a JOBS=1 rerun); the next train rerun logs "rerun sharded on 4189+4192"; no affected run on
  a CONFLICTING PR head.

## Docs (one home per rule; budgets net-zero)
- docs/systems/testing-tools.md "Laptop queue" (720/720, net change <= 0, `wc -l` checked):
  - "Order" bullet (:568): + conflict retire (A1), + front / green smallest-first / arrival with the knobs.
  - "Train reruns" bullet (:571): "on one laptop slot ... (no sharding" -> sharded across both slots when free
    (`LQ_RERUN_SHARD`), else one slot.
  - "Train soon" bullet (:595): one sentence, an aged alone gets the gap after the coming train (A12, `LQ_ALONE_GAP`).
  - One line pointer: "A train head that moves: `docs/systems/auto-train.md` 'What the laptop queue service provides'".
  - Lines freed: the stale sentence at :625-626 ("a legacy or GPU suite in the list gates the head today ... another
    PR"; the same bullet already says GPU / LEGACY are dropped), the undo sentence at :607-608 ("Old 3-min gap: ...";
    kept in docs/laptop-queue-6/BRIEF.md A1), and :651-652 joined into one line. More only by rewording in place
    (slice F's sentence needs one more line: reword the "Train soon" bullet in place).
- docs/systems/auto-train.md "What the laptop queue service provides" (:167; no budget): one bullet, the carry rule
  (A7, A8) and that any other moved head runs as a normal train.
- docs/RULES.md "Machines" (:167-169, orchestrator-owned, 318/318): the same line count, proposed text:
  "trains first, sharded across 4189 + 4192 at `E2E_JOBS=3` per slot (`LQ_TRAIN_JOBS`); then train reruns
  (`E2E_JOBS=1`, both slots when free); then an alone request that has waited over 30 min (`ALONE_AGE_MIN`; it goes
  ahead of PR work and takes both slots once they drain); then PR requests (one slot, `E2E_JOBS=2`; full runs 3):
  front branches (`LQ_FRONT_BRANCHES`) first, then green PRs smallest first, then requesters in arrival order;
  then" - rewrapped to 120 columns.
- docs/laptop-queue/STATE.md: one dated entry on top (Haiku chore at the end).
- docs/laptop-queue-7/STATE.md: resume block kept current per slice.
- changes/feature-laptop-queue-7.md:
  `# Laptop queue: skip conflicting PRs, green PRs smallest first, carry train verdicts over docs-only fixes`,
  `kind: patch`, five bullets (conflicting affected heads not run; front / green smallest-first order; a moved train
  head carries a docs-only verdict or runs as a train; a train rerun shards across both laptop slots when free; an
  aged alone gets the gap after the coming train).

## Claims and size
scripts/laptop-queue/lib.mjs, scripts/laptop-queue/service.mjs, scripts/watchdog.mjs (one line),
tests/laptop-queue.test.ts, tests/autoTrain.test.ts, docs/systems/testing-tools.md, docs/systems/auto-train.md,
docs/RULES.md (A11), docs/laptop-queue/STATE.md, docs/laptop-queue-7/**, changes/feature-laptop-queue-7.md.
Not touched: scripts/auto-train.mjs, scripts/laptop-queue/request.mjs, merge-train.mjs.
Estimate ~1,050 changed lines (lib ~210, service ~290, watchdog 1, tests ~450, autoTrain test ~25, docs ~75), plus
~250 lines of job docs: under the ~1.5k cap.
