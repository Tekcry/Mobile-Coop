# laptop-queue-10 - plan
Owner: Test Runner. Status: current.

Lead: Night Shift | Test Runner. Planner: Opus 5.5, on origin/feature/laptop-queue-8 e714c6e38 (master 99fbd37fd).
Brief: `BRIEF.md` (Michael ~14:00: "prioritise getting the fixes done and out to prevent repeat issues"; F9, F10, F11,
F14, F15, F22, F24, F26, F27; A1-A13). One PR (feature/laptop-queue-10), seven slices, all Opus, in order: every
slice edits lib.mjs, service.mjs and tests/laptop-queue.test.ts. Line pointers are e714c6e38; a builder finds each
place by name. Re-based (plan check 1): laptop-queue-8 is now PR #552, branch feature/laptop-queue-8b 2fbfbd303 (a
squash of A-G plus a checker fix round, on a newer master). On 2fbfbd303 lib shifts +2..+18 (cutShort :825,
finishedSuites :893, prBoard :1072, fitsBeforeTrain :1142, assertKey :1175, median :1463, vanishedRequests :1609),
service +2..+66 (CLAIM_BEATS :176, listRequests :285, prBoardNow :721, pendingTrains :951, e2e :1222, sectionOf :1234,
updateBudget :1279, runTrain :1380, runRequest :1528, cutEnd :1621, incomplete branch :1759-1767, BG_CPU_PS :1868,
desktopTrains :2035, pass :2083, desktop too-long filter :2136-2140, order wallS :2200), tests +2..+38 (cutShort :1477,
fitsBeforeTrain :1250, flake budget :948). 2fbfbd303 has 301 unit tests.

## Start (the lead)
- Branch made from origin/feature/laptop-queue-8 e714c6e38 (pushed, upstream set; node_modules junction to the
  laptop-queue-8 worktree). Before S1: `git fetch -q origin && git rebase --onto origin/feature/laptop-queue-8b
  e714c6e38` (moves the one plan commit onto the squash; a merge of the old A-G branch would double laptop-queue-8),
  force-push once. Before each slice: `git fetch -q origin`; when laptop-queue-8b has new commits, `git rebase --onto
  origin/feature/laptop-queue-8b <its old head>` while only docs commits sit on top, else `git merge --no-edit
  origin/feature/laptop-queue-8b`. Once #552 is on master: `git rebase --onto origin/master <laptop-queue-8b head this
  branch sits on>`, force-push once, open the PR (draft until then, never `train-ready` before it).
- Guard before every write: `cd /c/NightShift/Mobile-Coop-laptop-queue-10 && test "$(git rev-parse --abbrev-ref HEAD)"
  = feature/laptop-queue-10 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-laptop-queue-10"`.

## Claims
```claims
files:
  - scripts/laptop-queue/lib.mjs
  - scripts/laptop-queue/service.mjs
  - tests/laptop-queue.test.ts
  - docs/systems/testing-tools.md
  - docs/RULES.md
  - changes/feature-laptop-queue-10.md
  - docs/laptop-queue-10/**
  - docs/laptop-queue/STATE.md
maps: none
protocol: none
save: none
```
Not touched: request.mjs (F15 needs no flag), run-e2e.mjs (the queue reads its existing lines; F14 calls its `--list`),
install-task.ps1, auto-train.mjs, merge-train.mjs, watchdog.mjs, e2e-affected.mjs, tests/autoTrain.test.ts.

## Env knobs (service env block, after `CLAIM_BEATS` :174)
| Knob | Default | Off / undo | Fix |
| --- | --- | --- | --- |
| `LQ_SUITE_IDLE_MIN` | 15 (17 in effect: never under the 900 s suite timeout + 2 min) | 0 = no hung cut | F10 (A3) |
| `LQ_DESKTOP_FAIL_FAST` | 1 | 0 = hand off at the end of the run, as today | F11 (A5) |
| `LQ_DESKTOP_MAX_MIN` (exists) | 15 | 0 = no cap | F14 (A6) |
| `LQ_MOVED` | 1 | 0 = a renamed request is a withdrawal, as today | F15 (A7) |
| `LQ_STACKED_LAST` | 1 | 0 = stacked PRs queue as master-based ones | F22 (A8) |
| `LQ_DESKTOP_TRAIN_SOON` | 1 | 0 = the desktop waits for the build marker only | F9 (A1) |
| `LQ_CPU_COUNT_E2E` | 1 | 0 = Idle e2e browsers are subtracted again | F24 (A9) |
| `LQ_QUARANTINE_KEYS` | 1 | 0 = an entry forgives any failure, as today | F26 (A10) |
| `LQ_KEYLESS_QUARANTINE_H` | 48 | 0 = a keyless entry forgives until its own expiry | F26 (A11) |
| `LQ_FRONT_BEFORE_ALONE` | 1 | 0 = an aged alone request goes before the fix and front tiers, as before | F39 (S6b) |

## S1 (Opus) - hung runs are killed (F10) and each attempt keeps its logs (F27)
Highest repeat cost first: #317 held 4192 for 65 min; train 118's first-run logs are gone.
- lib (new, after `finishedSuites` :890-897):
  - `suiteEvents(text)`: the number of suite events in a run-e2e log: `finishedSuites` lines plus streamed start headers
    `/^=== \S+( \(REPORT ONLY: never fails the run\))? ===\s*$/` (run-e2e.mjs :202). The times table is not an event.
  - `idleLimitMs(idleMin, suiteTimeoutS)`: 0 when `!(idleMin > 0)`, else max(idleMin x 60 000, (suiteTimeoutS + 120) x
    1000) (A3).
  - `idleStep(prev, count, now, limitMs)` -> `{ count, at, hung }`: `at` moves to now when count grows (prev null: at =
    now); hung = limitMs > 0 and now - at >= limitMs. Pure.
  - `unfinishedParts(parts, rows)`: the parts with no `finishedSuites` row, in order.
  - `hungTrainDesc(rows, parts, wallS, min)`: "<ok>/<parts> pass, <wall> s; hung <min> min; FAIL: <failed +
    unfinished>", 140 chars max with "..." (auto-train `failSuites` reads the list; a cut list is untrusted there).
  - `attemptDir(base, exists)`: base when `!exists(base)`, else the first free `base-2`, `base-3`, ... (F27, A12).
  - `cutShort` (:823-836): option `hung = false`; returns 'hung' after 'withdrawn' and 'superseded', before the
    spare / train rules.
- service:
  - env (after :174) `SUITE_TIMEOUT_S = 900` (used in `e2e` :1184 instead of the literal '900'), `SUITE_IDLE_MS =
    idleLimitMs(Number(process.env.LQ_SUITE_IDLE_MIN ?? 15), SUITE_TIMEOUT_S)`; logged once at start when > 0.
  - `attemptEvents(runDir)` (new, after `sectionOf` :1194-1201): sums `suiteEvents` and collects `finishedSuites` rows
    over every `*.log` in the attempt folder except `prepare*.log`, re-read at most every 15 s (memo by file size).
    S2 reuses its rows.
  - runRequest: `runDir` (:1473) = `attemptDir(path.join(STATE_DIR, 'runs', r.id), fs.existsSync)`; mkdir at once. The
    watch (:1514-1527): when `started` and kind is not alone, `idle = idleStep(idle, attemptEvents(runDir).count,
    Date.now(), SUITE_IDLE_MS)` (idle starts at `started = true` :1688) and `cutShort(..., hung: idle?.hung)`.
    cutEnd (:1565-1591) new branch `ctl.why === 'hung'`: laptop -> `verdict('failure', 'no suite finished in <m> min
    (hung), run stopped')`, a PR comment with the newest slot log's tail (capTail 8000, as the incomplete path :1699),
    `state.done[r.id] = { result: 'hung', ... }`; desktop -> the same failure with the "desktop: " prefix in S1, replaced
    by the S2 hand-off. The finally (:1734-1745) pushes the done claim as today; the tree dies through `cut` (taskkill /T
    /F) and `freePort`.
  - runTrain: `runDir` (:1336) = `attemptDir(...)`. A second `setInterval` (15 s, beside the void watch :1344-1351)
    runs `idleStep` over `attemptEvents(runDir)` once the e2e call starts (:1403); hung -> `cut` every ctl 'hung'.
    After `settleAll` (:1404) and after `rerunFlakes` (:1421): when hung, `trainVerdict(train, 'failure',
    hungTrainDesc(...), { result: 'hung' })`, `bumpTrainEnd`, a PR comment, return (the finally pushes done).
- Tests: new describe "hung runs and attempt folders (laptop-queue-10 S1)" beside "cutShort" (:1464); lib import line
  :3 gains the new names.
  - suiteEvents: two parallel result lines -> 2; a streamed start header plus its result line -> 2; the REPORT ONLY
    start header counts; the "times (" table rows and a "KILLED:" line do not; '' -> 0.
  - idleLimitMs(15, 900) -> 1 020 000; (20, 900) -> 1 200 000; (0, 900) -> 0.
  - idleStep: count 0 -> 1 at t moves `at` to t; count unchanged at t + 1 019 999 -> hung false, at t + 1 020 000 ->
    true; limit 0 never hung; prev null starts the clock.
  - cutShort: `{ hung: true }` -> 'hung' at any stage; withdrawn + hung -> 'withdrawn'; superseded + hung ->
    'superseded'; hung beats a pending train ('train').
  - unfinishedParts(['a', 'b:1', 'b:2'], [{ s: 'a', ok: true }, { s: 'b:1', ok: false }]) -> ['b:2'].
  - hungTrainDesc: 3 ok of 5, wall 1100, 17 -> "3/5 pass, 1100 s; hung 17 min; FAIL: d,e" (one failed row d, one
    unfinished e); a 40-suite list is cut to 140 chars ending "...".
  - attemptDir: exists(base) false -> base; base and base-2 exist -> base-3.
- Done looks like: a run with no suite event for 17 min is killed, posts failure "hung" and frees its slot; a train posts
  its unfinished suites as FAIL; a second attempt of the same id logs to `runs/<id>-2/`. The builder also lists train
  118's folder on the laptop (`C:/NightShift/scratch/laptop-queue/runs/train-118-7605094d*`) and writes in STATE what
  it holds (A12 finding).
- Size: ~45 lib, ~70 service, ~80 tests.

## S2 (Opus) - desktop caps by parts and time (F14); a desktop failure hands off at once (F11)
- lib:
  - `desktopWallS(parts, times, jobs = 1)` (new, after `desktopTooLong` :258-262): weights = `times[p]` when finite,
    else the median (lib `median` :1445) of every finite value in times, 60 when none; heaviest of `jobs` bins (lib
    `shard` over a weights map that holds every part); 0 for no parts. Never NaN (A6).
  - `desktopTooLong(r, times, maxS, parts = suiteParts(keptPlan(r, r?.sha, times).rest, times))` (:258-262): `maxS > 0
    && desktopWallS(parts, times, 1) > maxS`. On 2fbfbd303 it already weighs only `keptPlan(...).rest` (laptop-queue-8
    A10 kept suites): keep that; the service passes `partsOf(keptPlan(r, r.sha, times).rest)`, never `r.suites`.
    Docstring updated (unknown no longer taken).
  - `failFast(rows, parts, isQuarantined)` (new, after `unfinishedParts`): null unless some row is `!ok && !report &&
    !isQuarantined(s)`; then `{ failed: [those], rerun: [failed + unfinishedParts(parts, rows)] }`.
- service:
  - `partsOf(suites)` (new, after `trainBuilding` :1984-1996): `node scripts/run-e2e.mjs --list <suites>` in HERE (the
    service checkout), memo by the sorted suite list, error or empty -> lib `suiteParts(suites, times)`.
  - Desktop filter (:2070-2074): `desktopTooLong(r, times, DESKTOP_MAX_S, partsOf(keptPlan(r, r.sha, times).rest))`;
    the log says
    "~N min over P parts". Order block (:2134): on the desktop `wallS[r.id] = desktopWallS(partsOf(r.suites), times,
    1)`; the laptop keeps `expectedWallS`.
  - `quarantineNow()` (new, after `attemptEvents`): the committed `scripts/e2e-quarantine.json` quarantine plus this
    worker's `quarantine.json`, live entries only (the reads `updateBudget` :1244-1249 makes), memo 60 s. S5 reuses it.
  - runRequest watch: when DESKTOP, `LQ_DESKTOP_FAIL_FAST`, kind pr, not trainRerun / laptopRerun, `started`, no
    `ctl.why` and no hand-off in flight: `ff = failFast(attemptEvents(runDir).rows, partsOf(list), (s) =>
    Boolean(quarantined(quarantineNow(), s, Date.now())))`. On ff: build `laptopRerunRequest(r, ff.rerun, ...)`, push it
    as the end-of-run path does (:1716-1724; DRY logs only), then `ctl.handOff = { desc: desktopFailDesc(ff.failed,
    median(cpuSamples)), rerunId }` and `cut` every ctl 'handed-off'. A failed push logs and the run goes on.
  - cutEnd: `ctl.why === 'handed-off'`: `postStatus` pending `ctl.handOff.desc` on every verdict context (affected-e2e
    too), `state.done[r.id] = { result: 'laptop-rerun', rerun, date }`, log "<id>: <desc> as <rerun> (fail fast)". The
    S1 desktop 'hung' branch uses the same hand-off with failed [] and desc "desktop hung <m> min (cpu N%), laptop rerun
    queued" and rerun = the unfinished parts.
  - Incomplete runs (tracker F11, 10-26 ~15:00: tallow-prg1 c648c5d8 timed out on 4191 at 60 min, 0/7 suites, final
    red, no laptop rerun): on the desktop (kind pr, not trainRerun / laptopRerun) the incomplete branch (:1696-1702,
    2fbfbd303 :1759-1767) no longer posts failure: it pushes `laptopRerunRequest(r, every suite of r.suites)` and posts
    pending "desktop: slot <p> gave no result (cpu N%), laptop rerun queued" on every verdict context, `state.done[r.id]
    = { result: 'laptop-rerun', rerun }`, no PR comment. A failed push keeps today's failure. Under
    `LQ_DESKTOP_FAIL_FAST` (0 = today). The laptop's incomplete path is unchanged.
- Tests: new describe "desktop wall by parts and fail fast (laptop-queue-10 S2)" beside "desktop order and long-run
  skip" (:759).
  - desktopWallS(['a', 'b'], { a: 100, b: 50 }) -> 150; (['a', 'zz'], { a: 100, b: 50, c: 300 }) -> 200 (median 100);
    (['x', 'y'], {}) -> 120; jobs 2 over [300, 100, 100] -> 300; [] -> 0.
  - tallow-prg1 replay: times with `e2e-sectorops:1..5` 200 s, `e2e-ctcourse:1..4` 180 s, `e2e-desktop:1..4` 150 s,
    smoke 40 s; the request names 7 suites (e2e-sectorops, e2e-ctcourse, e2e-desktop and four Campaign suites with no
    time); parts as run-e2e lists them = sectorops:1-6, ctcourse:1-4, desktop:1, :2, :4 and the four = 17 ->
    `desktopTooLong(r, times, 900, parts)` true (~3 300 s); `expectedWallS(r.suites, times, 1)` is NaN (why it was
    taken before); maxS 0 -> false.
  - The existing desktopTooLong case (:770) `{ suites: ['nope'] }` stays false, comment "median 400 s" instead of "NaN:
    taken"; new: `['nope', 'nope2', 'nope3']` -> true (1 200 s).
  - failFast: rows [a ok, b FAIL], parts [a, b, c, d] -> { failed: [b], rerun: [b, c, d] }; a REPORT ONLY fail ->
    null; b quarantined -> null; no fail -> null; two fails -> both in failed, in log order.
- Done looks like: a tallow-prg1-like request logs "left to the laptop"; a desktop run whose first suite fails posts
  "desktop FAIL x (cpu N%), laptop rerun queued" within a watch tick and frees the slot; a desktop run that ends
  incomplete (timeout, no summary) posts pending and queues a laptop rerun of every suite instead of a final red.
- Size: ~35 lib, ~70 service, ~60 tests.

## S3 (Opus) - the desktop holds for a due train (F9); the CPU gate reads the real load (F24)
- lib:
  - `fitsBeforeTrain(r, { now, etaMs, times, prepS, jobs })` (:1139-1143): `expectedWallS(r.suites, times, jobs ??
    r.jobs ?? 2)`; the laptop passes no `jobs` (unchanged).
  - `backgroundCpuMs(text, { countE2e = true } = {})` (:217-233): lines may carry a 4th token, the process name or
    `e2e` (old 3-token lines parse as before, name ''); with countE2e the `e2e` rows stay out of bgMs (they are load);
    returns `{ bgMs, elapsedMs, e2eMs, top }` (top = the 3 heaviest subtracted names by ms).
  - `cpuNote(c, mode)` (new, after `gateCpu` :251): "cpu <gated>% gated / <total>% total (<mode>)" plus "; subtracted:
    <name> <pct>%, ..." when total - gated >= 20 (pct = ms / (elapsedMs x cores) x 100, rounded).
- service:
  - `BG_CPU_PS` (:1802-1809): each line prints `e2e` for a process whose Path is under `\ms-playwright\`, else its
    ProcessName (spaces removed). `cpuGated` (:1816-1823) passes `{ countE2e: CPU_COUNT_E2E }` and returns `{ gated,
    total, top, elapsedMs, cores }`.
  - Logs (A9): the desktop "queue:" line (:2103) and the train line (:2084) add `cpuNote(cpu(), CPU_MODE)` whenever
    the lazy reading was taken this pass; a desktop start (pass loop after the claim, :2155) logs "<id>: desktop start
    on <port>, <cpuNote>". `lazyCpu` stays per pass (built at :2080 / :2093, read by the gate and the start in the same
    pass): checked, no cache across passes.
  - F9: `trainSoonNow(read)` (new, split out of pendingTrains :929: `readyNow(read.openPrs); next =
    nextTrainNow(read.openPrs, read.heads)`); pendingTrains calls it on the laptop as today. pass(): a per-pass
    `headsOnce()` memo of `trainHeadsNow()`; `desktopTrains` (:1969-1978) passes it to pendingTrains when its gate is
    open. Desktop block (:2057-2105), after the pr and too-long filters: when `LQ_DESKTOP_TRAIN_SOON`, requests remain
    and a port is free: `const read = headsOnce(); if (read) trainSoonNow(read); else next = null;` (a GitHub error
    never holds). The train-soon filter (:2108-2118) drops its `!DESKTOP` and passes `jobs: DESKTOP ? 1 : undefined`
    to `fitsBeforeTrain`; the build marker check (:2060-2065) stays as the backstop.
- Tests: new describe "desktop train soon and CPU reading (laptop-queue-10 S3)" beside "fitsBeforeTrain" (:1237).
  - fitsBeforeTrain, times { a: 60, b: 60 }, eta now + 200 s: no jobs -> true (120 + 72 s); `jobs: 1` -> false (120 +
    144 s); `jobs: 1` with r.jobs 3 -> false; the existing cases unchanged.
  - holdKeeps with the desktop's fits (jobs 1): next set, fits false -> dropped; next null -> kept.
  - backgroundCpuMs: "a 10 1000 blender", "b 10 1600 blender", "a 20 500 e2e", "b 20 1500 e2e", "el 1000" -> bgMs 600,
    e2eMs 1000, top [{ name: 'blender', ms: 600 }]; `countE2e: false` -> bgMs 1600; 3-token lines -> as the existing
    test (:722-758).
  - gatedCpu replay (8 Idle Playwright chromium, A9): total 100, cores 16, elapsed 1000: e2e counted (bgMs 600) -> 96;
    subtracted (bgMs 1600) -> 90.
  - cpuNote: { gated 42, total 97, top [{ name: 'chrome', ms: 4000 }], elapsedMs 1000, cores 8 }, 'normal' -> "cpu 42%
    gated / 97% total (normal); subtracted: chrome 50%"; gap under 20 -> no "subtracted"; 'total' mode named.
- Done looks like: with a green train-ready PR due in 3 min the desktop log reads "<why>, next train ~HH:MMZ: only runs
  that fit start" and starts nothing longer; every desktop start and CPU refusal names gated and total CPU.
- Size: ~25 lib, ~45 service, ~55 tests.

## S4 (Opus) - master-based PRs before stacked ones (F22)
- lib `prBoard` (:1069-1085): each row gains `base: String(p.baseRefName ?? '')` and `stacked: base !== '' && base !==
  'master'`.
- lib `pickFrom` order block (:356-378): after the fix tier and the front pick (`early`), when `order.stacked?.size`:
  `const main = rest.filter((r) => !order.stacked.has(r.id)); const tier = main.length ? main : rest;` and the
  starvation check, the green tier and `arrivalNext` run over `tier` (fix and front tiers unchanged). Desktop smallest
  (:360-364): sort by stacked (0 / 1) first, then wall, then place. `pick` docstring (:315-324) gains one sentence.
- service: `prBoardNow` (:688) `--json` adds `baseRefName` (no new gh call). Order block (:2130-2140): build
  `queue.order` when `DESKTOP || GREEN_FIRST || FIX_FIRST || STACKED_LAST`; `order.stacked = STACKED_LAST ? Set of ids
  whose board row is stacked : new Set()`; the "order:" log adds "stacked <k>".
- Tests: new describe "pick: master-based before stacked (laptop-queue-10 S4)" beside "pick: fixes first" (:157).
  - prBoard: baseRefName 'master' -> stacked false; 'feature/laptop-queue-8' -> true; missing -> false.
  - a stacked request 60 min old and a master-based one 5 min old -> the master-based one (arrival tier).
  - green: a stacked green 60 s and a master green 300 s -> the master one.
  - only stacked requests -> the arrival / green rules among them (older stacked first).
  - a stacked fix still goes first; a stacked mixamo branch still goes front.
  - `order.stacked` absent or empty -> the laptop-queue-8 results (the existing describes stay green).
  - desktop smallest: stacked 60 s vs master 300 s -> master first.
  - the 14:00 replay: 7 stacked requests (51 suites) older than 2 master-based green PRs -> both master PRs go first.
- Done looks like: the "order:" line counts stacked requests and a trainable PR's request starts before older stacked
  ones.
- Size: ~20 lib, ~8 service, ~60 tests.

## S5 (Opus) - a quarantine forgives only its own failure (F26)
- lib (new, after `assertKey` :1172-1174, before the flake budget block so J20's flakeBudget / autoQuarantine hunks
  stay apart):
  - `quarantineKeys(flakes, suite, since = '')`: the unique `key`s of `flakes` for that exact suite (a part name stays a
    part) dated at or after `since`, in first-seen order.
  - `quarantineForgives(entry, key, { now, keylessUntil = Infinity })`: false for no entry; an entry with a non-empty
    `keys` array forgives only a key in it; a keyless entry forgives while `now < keylessUntil`.
- service:
  - `updateBudget` (:1252), one line before the `quarantineStarts` loop: `for (const q of added) q.keys =
    quarantineKeys(state.flakes, q.suite, state.quarantineStarts[q.suite] ?? '');` (the flakes that tripped the budget;
    flakeBudget counts only flakes after the last start).
  - `checkQuarantine(result, runDir)` (new, after `quarantineNow`): for each suite `!ok && flaky`: entry =
    `quarantined(quarantineNow(), s, now)`; key = `assertKey(failureExcerpt(sectionOf(runDir, s)).assert)`; a keyless
    entry gets `state.keylessSeen[entry.suite] ??= now` (saved; warning logged once per suite: "quarantine of <s> has no
    keys: forgives any failure until <iso>"), keylessUntil = seen + `LQ_KEYLESS_QUARANTINE_H` h (Infinity at 0); not
    forgiven -> `x.flaky = false`, log "<s>: quarantined for <keys>, this failure is \"<key>\": counts". Called when
    `LQ_QUARANTINE_KEYS` before `rerunFlakes` in runTrain (:1421) and runRequest (:1708), so the reclassified failure
    gets the solo rerun and then fails the run like any failure (describe lists it under FAIL).
  - `state.keylessSeen ??= {}` with the other state defaults (:207-212).
- Tests: new describe "quarantine keys (laptop-queue-10 S5)" beside "flake budget and quarantine" (:935).
  - quarantineKeys: e2e-pad flakes k1 (t1), k1 (t2), k2 (t3), e2e-move k3: since '' -> [k1, k2]; since t3 -> [k2];
    another suite -> [].
  - quarantineForgives: keys [k1] with k1 -> true, k9 -> false; keys [] -> treated as keyless; keyless now <
    keylessUntil -> true, at it -> false; null entry -> false.
  - e2e-pad replay (trains 112-118): the committed keyless entry first seen at T forgives a remap failure at T + 47 h,
    not at T + 49 h; an auto entry with keys of a netmove timeout does not forgive an e2e-pad "expected" assert.
  - assertKey: the same assert line with other numbers and a bracketed dump gives one key (ties keys across runs).
- Done looks like: a KNOWN FLAKY failure with a new assert logs "counts", gets its solo rerun and fails the verdict;
  the auto quarantine.json entries carry `keys`.
- Size: ~20 lib, ~35 service, ~45 tests.

## S6 (Opus) - a renamed request is a move (F15)
- lib `movedRequests(gone, candidates)` (new, before the `vanishedRequests` docstring :1585, not at the end of the file
  where J20 appends): Map goneId -> candidate id. Pairs when kind, sha, set (empty = none), `queueRequester` and the
  sorted suites match and the ids differ; candidates sorted by id, each used once, the earliest first. Pure.
- service listRequests (:283-329): keep `prevIds` (the ids of the last non-empty listing). After the parse loop, when
  `LQ_MOVED`: candidates = listed files not in prevIds (parsed even when claimed: one `git show` each), gone = the
  running requests here missing from the listing plus (laptop) the tracked open ones missing; `moved =
  movedRequests(gone, candidates)`. For a running pair: `missing.delete(old)`, `withdrawnIds.delete(old)`,
  `movedTo.set(old, new)`, drop new from `out` (so applyDuplicates never retires it against the run), one
  `writeClaims([new], 'claim', 'moved <old> -> <new>')`, log "<old>: moved to <new>, run goes on". For a tracked open
  pair: `openTracked.delete(old)`, `openMisses.delete(old)` (no withdrawn status). The `closeWithdrawn` call (:298)
  moves after this step. Same code on both workers (the desktop has no tracked open list).
- service heartbeat (:1312-1319): ids add `movedTo.get(id)` for running ids. runRequest finally (:1734-1745): when
  `movedTo.has(r.id)`, `state.done[new] = { ...state.done[r.id], movedFrom: r.id }` and the done push covers both ids;
  on a release path (yield, train preempt, fetch failure) the old id is marked done (`result: 'moved', by: new`) and
  the new id's claim released, so the new request queues normally.
- Tests: new describe "moved requests (laptop-queue-10 S6)" beside "affected-e2e never stuck pending" (:1998).
  - the Mixamo replay: running `20261026T120000-mixamo-...` and a new `T000001-mixamo-...` (an early-id re-file,
    isFront true), same sha, requester and suites in another order -> paired.
  - another sha, requester, suite list, set or kind -> no pair.
  - affected requests pair per branch (queueRequester): same branch yes, other branch no.
  - two candidates -> the earliest id; two gone, one candidate -> one pair; a candidate with the gone id -> none; empty
    inputs -> empty Map.
- Done looks like: renaming a running request file logs "moved to <new>, run goes on", the run posts its verdict on
  the same context and both ids end with done claims.
- Size: ~25 lib, ~45 service, ~45 tests.

## S7 (Opus) - docs, fragment, STATE
- `docs/systems/testing-tools.md` "Laptop queue" (720 lines, budget 720, net <= 0, `wc -l` checked):
  - Order bullet (:568-574): "... front branches, then master-based PRs (green smallest first, then arrival), then
    stacked PRs (base not master; `LQ_STACKED_LAST`) ...".
  - Yield bullet (:592-598): "+ a started run with no suite event for 17 min (`LQ_SUITE_IDLE_MIN` 15, never under the
    900 s suite timeout + 2 min) is killed: failure 'hung' (a train posts its unfinished suites as FAIL; the desktop
    hands off)".
  - Statuses bullet (:612-614): logs `runs/<id>/`, a later attempt `runs/<id>-2/`.
  - Desktop bullet (:633-644): smallest and the 15 min cap by the parts run-e2e lists (no time = the median);
    the train-soon hold at one job (`LQ_DESKTOP_TRAIN_SOON`; the build marker stays); fail fast (`LQ_DESKTOP_FAIL_FAST`);
    the e2e browsers always count in the CPU gate (`LQ_CPU_COUNT_E2E`), each start and refusal logs gated / total.
  - Claims bullet (:645-646): a request file renamed with the same sha, requester and suites is a move (`LQ_MOVED`).
  - "Flakes and quarantine" (:673-690): entries carry `keys` (assert keys); auto entries get them from their flakes; a
    failure with another key counts; a keyless entry forgives 48 h after a worker first sees it
    (`LQ_KEYLESS_QUARANTINE_H`).
  - Lines freed: the build-marker detail (:641-644) to two lines, the "Scheduled tasks" history parenthetical
    (:654-655), the stale "Commits cut before this change ... hardcoded e2e-pad" sentence (:689-690), the archive
    pointer (:561-562).
- `docs/RULES.md` "Machines" (318 lines kept, rewritten in place): the pick order (:169-171) "then green PRs smallest
  first, then arrival order" -> "then master-based PRs (green smallest first, then arrival), then stacked PRs"; the
  desktop bullet (:177-185): "nothing new while auto-train builds" -> "nothing new that would not end before a due train
  or while auto-train builds", "CPU of Normal or higher priority processes (the e2e browsers always count)", "A desktop
  failure posts pending and queues a laptop rerun at its first failed suite". Paid for by trimming "(installed backlog
  gate 0; `LQ_DESKTOP_BACKLOG`)" to "(`LQ_DESKTOP_BACKLOG`)" and rewrapping.
- `changes/feature-laptop-queue-10.md`: `# Laptop queue: no hung runs, fairer desktop and order`, `kind: patch`, bullets
  (plain English): a run with no suite finishing for 17 minutes is stopped; a desktop failure goes to the laptop at once;
  the desktop counts a request's real parts and time; the desktop leaves room for a due train; ready PRs go before
  stacked ones; a renamed request keeps its run; a quarantine only hides its own flake; each run attempt keeps its logs;
  the desktop logs its CPU reading and counts the test browsers.
- `docs/laptop-queue/STATE.md`: one dated entry on top (as laptop-queue-8's :4-7). Job STATE per slice. PR body ends
  `Job-done: laptop-queue-10`.
- Checks: `node scripts/doc-lint.mjs`, `wc -l docs/RULES.md docs/systems/testing-tools.md` (318, <= 720).

## Order and builders
S1 -> S2 -> S3 -> S4 -> S5 -> S6 -> S7 on the one branch, each by a fresh Opus builder from `docs/systems/agent-preamble.md`
(G302: queue code is Opus), never in parallel (shared lib, service and test files). Each builder: guard, build, the
checks below, path-limited commit and push, a STATE draft. One Opus checker for the PR head after S7 (queue code), one
fix round. Order = repeat cost: hangs and lost logs, desktop slot holds, desktop gates, queue order, hidden failures,
renames.

## Tests and verify (per slice)
- `npm run typecheck:fast`; `npx vitest run tests/laptop-queue.test.ts tests/autoTrain.test.ts` (Babylon-free; 301 pass
  at 2fbfbd303); S5 also `npx vitest run tests/e2eQuarantine.test.ts`; S7 `node scripts/doc-lint.mjs`.
- Dry runs fetch origin into the shared `C:/NightShift/Mobile-Coop/.git` (laptop-queue-8 STATE): run them only where
  that is allowed: `node scripts/laptop-queue/service.mjs --once --dry-run` (laptop: "order: ... stacked <k>");
  `LQ_WORKER=desktop` (the cpu note on the "queue:" line, "left to the laptop ... parts").
- Tier: queue scripts = CI `check`; the PR's own affected-e2e (none expected: no game file). Live after release: the
  next hung run logs "hung" within 17 min; the next desktop failure posts "laptop rerun queued" mid-run; a stacked
  request waits behind a master-based one; flake-budget entries carry keys.

## Size and PRs
Counted by pr-size (code and tests, cap 1500), against master once laptop-queue-8 has merged:
| Slice | lib | service | tests | Total |
| --- | --- | --- | --- | --- |
| S1 F10, F27 | 45 | 70 | 80 | 195 |
| S2 F14, F11 | 35 | 70 | 60 | 165 |
| S3 F9, F24 | 25 | 45 | 55 | 125 |
| S4 F22 | 20 | 8 | 60 | 88 |
| S5 F26 | 20 | 35 | 45 | 100 |
| S6 F15 | 25 | 45 | 45 | 115 |
| Total | 170 | 273 | 345 | ~790 |
Docs (~200 lines of job docs, ~40 changed in testing-tools / RULES) are not counted. One PR. Before laptop-queue-8
merges, a diff against master also counts its ~900 lines (~1 675): the PR stays draft until the rebase. Past 1 500 after
the rebase: split at S3 (PR 1 = S1-S3, PR 2 = S4-S7).

## Overlap with other branches (keep hunks apart)
- laptop-queue-9 (feature/laptop-queue-9, plan only at f5b2db8b0; F12, F16, F18, F19, F20, F23): owns auto-train.mjs,
  merge-train.mjs, watchdog.mjs and tests/autoTrain.test.ts. This job edits none of them. Links: F9 keeps reading the
  build marker auto-train writes and the `train-ready` label through readyNow (if F16 drops the label wait, the queue
  follows in laptop-queue-9: A2); F10's hung train posts "FAIL: <list>" in the form auto-train `failSuites` already
  reads; F15's early-id re-files are the ids F20 teaches the watchdog. Both jobs run `tests/autoTrain.test.ts`; this job
  never edits it. claims-check (plan check 1): docs/RULES.md is claimed by both; laptop-queue-9 edits only :134-135
  ("Getting to master", line-neutral), this job only "Machines" (:164-185, 318 kept): no shared hunk; whichever
  merges second re-checks `wc -l` = 318.
- map-ready and route-runs-2 also claim docs/systems/testing-tools.md (`__mapReady` notes; a new "Route-runs"
  section): other sections; this job stays net <= 0.
- J20 PR-B (feature/test-runner-j20-prb2, cut from an older master; touches service, lib, request and tests):
  - lib: J20 edits NOT_SUITE_SCRIPTS, dupKey, flakeBudget / autoQuarantine / flakeSummary, queueRequester,
    affectedNeeds / affectedRequest, after desktopFailDesc (perfStep) and appends after vanishedRequests (train
    parity). This job's lib code sits after finishedSuites, desktopTooLong, gateCpu, assertKey, prBoard, pickFrom,
    fitsBeforeTrain, backgroundCpuMs and before vanishedRequests: no shared hunk.
  - service: J20 edits the import line, state defaults, after realOpenNow (readParity), affectedPass, prepare / e2e's
    signature, failureComment and updateBudget, finish's updateBudget call, runTrain's bins, runRequest's alone steps
    and list / jobs, dispatch. Shared: the import line, the state defaults (one line each, S5), `e2e` (S1 changes only
    the '900' literal), and updateBudget (S5 adds one line next to the `added` line J20 rewrites: a trivial rebase
    conflict for whichever merges second).
  - tests: both add describes and import names; the lib import line :3 conflicts textually, resolved by union.
  - request.mjs: not touched here.
- laptop-queue-8 (this job's base): the PR rebases onto master after it merges; no laptop-queue-8 line is rewritten
  except the desktop filter and order block lines S2 / S4 extend.

## Risks
- The hung cut kills a legal run whose single suite runs past 17 min with no other event: run-e2e's own 900 s suite
  timeout makes that impossible at the queue's settings.
- Fail fast hands a load-related desktop failure to the laptop sooner: by design the laptop's verdict is final.
- `partsOf` adds one `node run-e2e --list` call per new suite list on the desktop (memoised).
- The keyless 48 h expiry turns e2e-pad's committed entry into real failures two days after release: Player Build adds
  `keys` or fixes the suite (the orchestrator tells them at the merge).
- Counting the e2e browsers raises the gated reading: the desktop starts fewer runs while one is going (the point of
  the 80% target).
- F15: a lead who renames a request on purpose to change it (other suites) is not paired and withdraws as before.
