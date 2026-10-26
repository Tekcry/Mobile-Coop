# test-runner-j20: plan

Lead: Night Shift | Test Runner. Planner: Opus 5.5, master 2148ec969. Brief: `docs/archive/test-runner-j20/BRIEF.md`.
Every file:line below is on 2148ec969. Slice branches: `feature/test-runner-j20-<slice>` (own worktree each), merged
by the lead into `feature/test-runner-j20-pr<A|B|C>` for the PRs.

## Claims
```claims
files:
  - scripts/e2e-affected.mjs
  - scripts/merge-train.mjs
  - scripts/run-e2e.mjs
  - scripts/e2e-verdict.mjs
  - scripts/perf.mjs
  - scripts/laptop-queue/lib.mjs
  - scripts/laptop-queue/service.mjs
  - scripts/laptop-queue/request.mjs
  - scripts/e2e-quarantine.json
  - scripts/e2e-sectorops.mjs
  - scripts/e2e-ctcourse.mjs
  - tests/e2eAffected.test.ts
  - tests/e2eVerdict.test.ts
  - tests/laptop-queue.test.ts
  - tests/e2eQuarantine.test.ts
  - tests/noRouteTimer.test.ts
  - tests/importBoundary.test.ts
  - tests/replayDeterminism.test.ts
  - docs/systems/testing-tools.md
  - docs/backlog.md
  - docs/archive/test-runner-j20/**
maps: none
protocol: none
save: none
```

## Slices at a glance
| Id | Title | Model | Files | Est. lines | Group |
| --- | --- | --- | --- | --- | --- |
| S1 | Affected map: wire, campus, audio split (T1, T4, T5) | Sonnet | e2e-affected.mjs, merge-train.mjs, tests/e2eAffected.test.ts | 180 | A (now) |
| S3b | Flake file, known-flaky counts, repeat quarantine (T10, T11, Q30) | Opus | lib.mjs, service.mjs, tests/laptop-queue.test.ts | 380 | A (now) |
| S4 | Owners, quarantine test, backlog (T12, T13, item b) | Sonnet | e2e-quarantine.json, tests/e2eQuarantine.test.ts, docs/backlog.md | 120 | A (now) |
| S5 | perf.mjs prints the real map (T14 S) | Sonnet | scripts/perf.mjs | 25 | A (now) |
| S6a | No route timer + import boundary (H5, H9) | Sonnet | tests/noRouteTimer.test.ts, tests/importBoundary.test.ts | 220 | A (now) |
| S6b | Replay determinism (H7) | Sonnet | tests/replayDeterminism.test.ts | 200 | A (now) |
| S6c | Alive at start: campus S2-S5, Marlow sets (H8) | Sonnet | scripts/e2e-sectorops.mjs, scripts/e2e-ctcourse.mjs | 120 | A (now) |
| S2 | Runner: timeouts fail, E2E_REPORT, local wire (T8, T4, T1) | Opus | run-e2e.mjs, scripts/e2e-verdict.mjs, tests/e2eVerdict.test.ts | 200 | B (after S1) |
| S3a | Queue: report-only affected, wire at sha, rerun filter, perf --budget (T4, T1, item a, T14 S) | Opus | lib.mjs, service.mjs, request.mjs, tests/laptop-queue.test.ts | 380 | B (after S1 + S3b) |
| S7 | Light parity on every train (Q27) | Opus | lib.mjs, service.mjs, tests/laptop-queue.test.ts | 90 | C (after S3a) |
| D-A / D-B / D-C | Docs per PR | Sonnet | docs/systems/testing-tools.md (+ STATE, the PR's fragment) | docs | each on the previous PR's merge |

Parallel now (group A, no shared file): S1, S3b, S4, S5, S6a, S6b, S6c. S2 and S3a start once S1 is pushed (S3a also
after S3b: both edit lib.mjs / service.mjs / tests/laptop-queue.test.ts). S7 after S3a. Docs slices are sequential (one
file).

## PR grouping (each under ~1.5k changed lines, docs not counted)
- **PR-A "affected and runner"**: S1 + S2 + S5 + D-A (~405 lines). affected-e2e: CORE (run-e2e.mjs) + smoke.
- **PR-B "queue"**: S3b + S3a + S7 + D-B (~850). No browser suites (scripts/laptop-queue only); live on the laptop once
  master has it (the service fast-forwards and restarts, `service.mjs:1567-1574`). S7 waits for the e2e-darkness
  precheck (S7 brief).
- **PR-C "quarantine and hard-rule checks"**: S4 + S6a + S6b + S6c + D-C (~660). affected-e2e: e2e-sectorops (all
  parts) and e2e-ctcourse (scripts named), plus smoke.
- PR-C can open first (all group A). Order of release: PR-C, PR-A, PR-B. **PR-B is the last to release and carries
  `Job-done: test-runner-j20`** in its body (the train archives `docs/archive/test-runner-j20/` then).
- One changelog fragment per PR branch (`changes/README.md`: named after the branch): PR branches
  `feature/test-runner-j20-prc`, `-pra`, `-prb` with `changes/feature-test-runner-j20-prc.md`, `-pra.md`, `-prb.md`
  (kind: patch). The job branch's placeholder is `changes/feature-test-runner-j20-prc.md` (PR-C is cut first); D-A and
  D-B write theirs.

## Checks per slice (agent machine)
`npm run typecheck:fast` + `npx vitest run <the slice's test files>` (each brief names them). e2e only through the
laptop queue: `node scripts/laptop-queue/request.mjs --sha <head> --suites "<suites>" --set j20-<slice> --requester
"Night Shift | Test Runner"`. No `npm run check` on the desktop (CI runs it).

---

## S1 Affected map: wire, campus, audio split (Sonnet)
**Goal.** In the pure selection module: wire files pull the co-op group (T1), campus map files pull the campus suite
(T5), AUDIO joins LEGACY as report-only and a report list can be derived (T4).
**Files.** `scripts/e2e-affected.mjs`, `scripts/merge-train.mjs`, `tests/e2eAffected.test.ts`. Nothing else.
**Do.**
1. Move `wirePaths` and `touchesWire` (`scripts/merge-train.mjs:325-339`, bodies unchanged) into
   `scripts/e2e-affected.mjs` as exports. In merge-train.mjs replace them with
   `import { wirePaths, touchesWire } from './e2e-affected.mjs';` plus `export { wirePaths, touchesWire };` (callers at
   `merge-train.mjs:1095,1101` and `tests/mergeTrain.test.ts:12` keep working).
2. Export `COOP` (`e2e-affected.mjs:229`, today a const) and add
   `export function withWireSuites(suites, files, protocolTs)`: when `protocolTs` is a non-empty string and
   `touchesWire(files, wirePaths(protocolTs))`, return `suites` plus COOP (sorted unique; a whole suite absorbs its
   parts, as `selectSuites` does at `:375-386`); else `suites` unchanged. Pure.
3. Move the AUDIO list (`scripts/run-e2e.mjs:39`, `['e2e-music', 'e2e-score', 'e2e-foley', 'e2e-weapon-audio']`) into
   e2e-affected.mjs as `export const AUDIO` (do NOT edit run-e2e.mjs: S2 switches its import).
4. `affectedGateSuites` (`:29-32`): also drop AUDIO. Add `export function affectedReportSuites(suites)`: the entries of
   `suites` that are LEGACY or AUDIO (whole or part token, same rule as the gate), GPU never (GPU stays out entirely,
   BRIEF A1). Update the doc comment at `:21-28`.
5. T5: DIRECT_COVERS, after `'src/world/maps/warehouseDress'` (`:308`): `'src/world/maps/campus': ['e2e-sectorops:6',
   'e2e-levels', 'e2e-anchors'],` with a comment `// (J20 T5) Saltmarsh Park: its suite is e2e-sectorops part 6`.
   WIDE_COVERS after `:192`: `'src/world/maps/campus': ['e2e-sectorops', 'e2e-lightbake', 'e2e-guard-carry',
   'e2e-levels', 'e2e-anchors', 'e2e-ctcourse'],`. Never touch QUICK_COVERS (`:39-112`, frozen, the test holds a copy).
**Acceptance (tests/e2eAffected.test.ts, new `describe('J20')`).** `withWireSuites` adds e2e-coop / e2e-netmove /
e2e-ctcourse for each of `src/player/moveState.ts`, `src/game/sectors.ts`, `src/weapons/weaponDefs.ts`,
`src/world/lampSway.ts`, `src/anim/motion.ts` against the real `src/net/protocol.ts` (read with fs), and nothing for
`src/world/other.ts` or an empty protocol text; `selectSuites(['src/world/maps/campusS4.ts'])` contains
`e2e-sectorops:6`, `e2e-levels`, `e2e-anchors`; `campusBake.ts` too (prefix, not the lamp row); WIDE gives
`e2e-sectorops`; `affectedGateSuites` drops `e2e-foley`, keeps `e2e-coop`; `affectedReportSuites(['smoke',
'e2e-security', 'e2e-foley', 'e2e-darkness', 'e2e-wall:flanker'])` = `['e2e-security', 'e2e-foley',
'e2e-wall:flanker']`. Existing rows stay green.
**Run.** `npm run typecheck:fast`; `npx vitest run tests/e2eAffected.test.ts tests/mergeTrain.test.ts`.
**Not.** run-e2e.mjs, lib.mjs, QUICK_COVERS, the REQUIRED / LEGACY / GPU lists' contents.

## S2 Runner: timeouts fail, E2E_REPORT, local wire (Opus) - after S1
**Goal.** A quarantined suite's timeout or crash fails the run (T8); a named run honours `E2E_REPORT` so the queue's
report suites print REPORT ONLY (T4); `--affected` locally adds the co-op group for wire files (T1).
**Files.** `scripts/run-e2e.mjs`, new `scripts/e2e-verdict.mjs` (pure), new `tests/e2eVerdict.test.ts`.
**Do.**
1. `scripts/e2e-verdict.mjs`: `export function classify(results, { report, quarantined })` -> `{ failed, flakyFailed }`
   where results = `[{ s, code, sec }]`; a non-report failure is KNOWN FLAKY only when `quarantined(s)` and `code === 1`;
   code 124 (timeout), `null` (signal) or any other code is `failed` (BRIEF A3). `export function reportSet(env)` parses
   `E2E_REPORT` (space or comma list) into a Set; `export const isReport = (s, set) => set.has(s) ||
   set.has(s.split(':')[0])`.
2. run-e2e.mjs: import AUDIO from `./e2e-affected.mjs` and delete the local `:39`; `report` (`:151`) also true for
   `isReport(s, reportSet(process.env.E2E_REPORT))`; replace `:248-250` with `classify`; in the times line (`:253`)
   a quarantined suite that timed out prints `FAIL` (not `FAIL (KNOWN FLAKY)`), keeping the line format `parseRun`
   reads (`lib.mjs:561-579`). Keep the KILLED line (`:221-228`).
3. `affectedSuites()` (`:131-144`): read `git show HEAD:src/net/protocol.ts` (execFileSync, as `:134`; failure -> '' and
   a stderr note) and pass `withWireSuites(suites, files, text)` to `orderPicked`.
**Acceptance (tests/e2eVerdict.test.ts).** classify: a quarantined code-1 failure -> flakyFailed; a quarantined 124 ->
failed; null -> failed; a report suite never fails; an unquarantined code-1 -> failed. reportSet parses "a b,c".
isReport matches a part by its whole suite. By hand: `node scripts/run-e2e.mjs --affected origin/master --list` on a
scratch commit touching `src/player/moveState.ts` lists e2e-coop, e2e-netmove, e2e-ctcourse:1-4.
**Run.** `npm run typecheck:fast`; `npx vitest run tests/e2eVerdict.test.ts tests/e2eAffected.test.ts`; queue:
`--suites "smoke e2e-move"` on the PR-A head.
**Not.** REQUIRED / LEGACY / GPU / PARTS contents (`:35`, `:47`; Campaign's branch edits PARTS), the quarantine file
reader (`:55-64`), e2e-affected.mjs.

## S3a Queue: report-only affected, wire at sha, rerun filter, perf --budget (Opus) - after S1 and S3b
**Goal.** Affected requests gate on REQUIRED-side suites only and still run LEGACY / AUDIO ones as report (T4); the
wire rule uses protocol.ts at the tested sha (T1); a desktop rerun never gates on LEGACY / GPU / AUDIO (item a); perf
alone steps enforce budgets (T14 S).
**Files.** `scripts/laptop-queue/lib.mjs`, `scripts/laptop-queue/service.mjs`, `scripts/laptop-queue/request.mjs`,
`tests/laptop-queue.test.ts`.
**Do.**
1. lib `affectedSuites` (`lib.mjs:935-945`): after the diff, `run(['show', `${sha}:src/net/protocol.ts`])` (a throw ->
   return null, like the diff); `picked = withWireSuites(selectSuites(...), files, text)`; return
   `{ base, files, suites: affectedGateSuites(picked), report: affectedReportSuites(picked) }`. Import from
   `../e2e-affected.mjs` (`:4`).
2. lib `affectedRequest` (`:978-980`): optional `report` param; writes `report: [...]` only when non-empty. `dupKey`
   (`:432-439`): append the sorted report list only when present (older keys stay comparable, as `laptopRerun` does).
3. lib `export function markReport(r, suites)`: for an affected request (`r.requester === AFFECTED_REQUESTER`), sets
   `report: true, ok: true` on result rows whose suite is in `r.report` or is not in `affectedGateSuites([s])` (old
   requests without `report`; BRIEF A2). Pure, returns new rows.
4. lib `laptopRerunRequest` (`:1016-1018`): for an affected request, `suites = affectedGateSuites(suites)`; return null
   when none are left.
5. lib `export function perfStep(step)`: a step whose command runs `scripts/perf.mjs` without `--budget` and without
   `--no-budget` gets ` --budget` appended; other steps unchanged.
6. service: `affectedPass` (`service.mjs:451-468`) passes `got.report` to `affectedRequest`. `e2e()` (`:807-813`) takes
   an optional report list: appends it to the suites and sets `E2E_REPORT`. `runRequest` pr branch (`:1215-1220`): pass
   `r.report`; after the run (`:1230`), `result.suites = markReport(r, run.suites)` (before `rerunFlakes`). Desktop rerun (`:1237-1248`):
   handle a null `rr` (no handoff: the remaining failures were report-only, so `bad` is recomputed after markReport and
   is empty). Alone steps (`:1200`): `const line = perfStep(...)`, logging when it changed the step.
7. request.mjs `prSuites` (`request.mjs:56-64`) returns `{ suites, report }`; `:87` writes `req.report` when non-empty.
**Acceptance (tests/laptop-queue.test.ts, new `describe('J20 affected report and wire')`).** affectedSuites with a fake
`run`: a `src/player/moveState.ts` diff with the real protocol text gives the co-op group; a `src/progression/x.ts`
diff gives suites `['smoke', 'e2e-park']`, report `['e2e-progression']`; `show` throwing -> null. affectedRequest
writes report only when non-empty; dupKey differs with / without report and is unchanged for a request without it.
markReport turns a failed e2e-security row of an old affected request into report and leaves a lead's request alone.
laptopRerunRequest: affected + `['e2e-camera-bounds', 'e2e-coop']` -> suites `['e2e-coop']`; affected +
`['e2e-darkness']` -> null; a lead's request keeps `e2e-kestrel`. perfStep: adds once, keeps `--budget`, keeps
`--no-budget`, ignores `node scripts/run-e2e.mjs`. Existing describes green.
**Run.** `npm run typecheck:fast`; `npx vitest run tests/laptop-queue.test.ts tests/e2eAffected.test.ts`;
`node scripts/laptop-queue/service.mjs --once --dry-run` prints no error.
**Not.** the flake functions (S3b's), `pick` / shard / claims / yield logic, visual.mjs, the train path (S7's).

## S3b Flake file, known-flaky counts, repeat quarantine (Opus) - now
**Goal.** `flake-budget.md` lists every suite that flaked, is quarantined or failed KNOWN FLAKY in the window, with
owners escaped (T10) and a denominator note (T11); a second auto quarantine within 14 days makes the suite blocking and
flags an owner fix job (Q30, BRIEF M1 / A4).
**Files.** `scripts/laptop-queue/lib.mjs`, `scripts/laptop-queue/service.mjs`, `tests/laptop-queue.test.ts`.
**Do.**
1. lib: `export const REPEAT_DAYS = 14`. `autoQuarantine(rows, lists, owners, now, ttlMs, starts = {})`
   (`lib.mjs:802-809`, doc comment `:798-801`) returns `{ added, blocking }`: an over-budget row whose `starts[suite]` is within REPEAT_DAYS of
   now gives a `blocking` entry `{ suite, owner, last: starts[suite], reason }` and no quarantine entry. Update its one
   caller (`service.mjs:877`).
2. lib `flakeBudget` (`:781-799`): new optional `known` (`[{ suite, date }]` KNOWN FLAKY failures) and `quarantine`
   list: rows for every suite with flakes, a KNOWN FLAKY failure or a live quarantine in the window; add `known: n`
   (not in `over`). `flakeSummary` (`:812-820`, doc comment `:811`): escape `|` as `\|` in every cell (owner "Night Shift | Marlow Build"
   splits rows today); a column "Known flaky"; a BLOCKING marker for suites in `state.blocking`; a first-line note
   when the oldest `suiteRuns` day is inside the window: "runs counted since <day>: rates read high until <day + 7>"
   (T11).
3. service `updateBudget` (`service.mjs:860-889`): record `state.knownFlaky.push({ suite, sha, date })` for each
   `!ok && flaky` row (prune to the window like `state.flakes`, `:868`); pass `state.quarantineStarts` to
   autoQuarantine; for each `blocking`: when `state.blocking[suite]` is absent or older than REPEAT_DAYS, set it
   `{ since, owner, last }`, log, push `alerts/<ts>-<WORKER>-fixjob-<suite>.json` (`{ suite, owner, last, since, reason,
   worker }`, same path pattern and push as the task guard, `service.mjs:411`), and add "BLOCKING: <suite> needs a fix job (owner
   <owner>)" to the PR comment summary. `alerts/*-fixjob-*.json` is a NEW alert kind (today only `*-tasks.json`): the
   lead tells the orchestrator in the PR body so its cron reads it and opens the owner's fix job. Init `state.knownFlaky ??= []; state.blocking ??= {}` next to `:174`.
**Acceptance (tests/laptop-queue.test.ts, extend `describe('flake budget and quarantine')` at `:589`).** autoQuarantine:
first over-budget -> added; again with a start 5 days ago -> blocking, no added; start 15 days ago -> added. flakeBudget
lists a quarantined suite with no flakes and a KNOWN FLAKY-only suite, `known` never sets `over`. flakeSummary: an
owner with `|` keeps 6 cells per row; BLOCKING shows; the T11 note appears when suiteRuns starts inside the window and
not otherwise. Existing rows green (update their call shapes only).
**Run.** `npm run typecheck:fast`; `npx vitest run tests/laptop-queue.test.ts`; `service.mjs --once --dry-run`.
**Not.** affected / rerun / perf code (S3a's), FLAKE_BUDGET / FLAKE_BUDGET_DAYS / QUARANTINE_TTL_MS values (`:746-750`),
the committed quarantine file.

## S4 Owners, quarantine test, backlog (Sonnet) - now
**Goal.** Every REQUIRED suite has an owner (T12); a vitest holds the committed quarantine file (T13); the backlog
camera-bounds entry is current (coordinator item b).
**Files.** `scripts/e2e-quarantine.json`, new `tests/e2eQuarantine.test.ts`, `docs/backlog.md` ("Flaky e2e suites"
only).
**Do.**
1. `scripts/e2e-quarantine.json` owners (`:3-22`): add the 15 from BRIEF A6. `_doc` (`:2`): "'Flake budget and
   quarantine'" -> "'Flakes and quarantine'".
2. `tests/e2eQuarantine.test.ts`: parse the JSON; REQUIRED parsed from `scripts/run-e2e.mjs` source text
   (`/const REQUIRED = (\[[^\]]*\])/`, `:35`; do not import run-e2e, it runs suites on import); assert every REQUIRED
   suite has an owner string starting "Night Shift | "; each quarantine entry has a suite, an owner, a reason and
   `Number.isFinite(Date.parse(expiry))` with an ISO `T...Z` shape; each entry's suite (whole name) appears in the text
   of `docs/backlog.md` between "## Flaky e2e suites" and the next "## "; `_doc` names "Flakes and quarantine" and that
   heading exists in `docs/systems/testing-tools.md`.
3. `docs/backlog.md:145-148`: split camera-bounds out of the kestrel bullet: "**e2e-camera-bounds (LEGACY, parked with
   Kestrel; known failure)** - fails at level U (U-Z4V): the operator falls through the floor (head y -33 to -35), so
   the camera check reads below the floor. Known legacy failure: REPORT ONLY in affected runs once J20 T4 lands (S3a);
   for the camera tuning or the test fixes job." Keep the kestrel half as is.
**Acceptance.** `npx vitest run tests/e2eQuarantine.test.ts` green; flipping one owner off makes it red (check by hand,
then restore).
**Run.** `npm run typecheck:fast`; `npx vitest run tests/e2eQuarantine.test.ts`.
**Not.** quarantine entries or expiries (e2e-pad `:24` stays), run-e2e.mjs, other backlog sections.

## S5 perf.mjs prints the real map (Sonnet) - now
**Goal.** perf output names the map it measured (T14 S part; budgets unchanged).
**Files.** `scripts/perf.mjs` only.
**Do.** `:292` `map: 'warehouse'` -> `map: MAP` and add `mode: MODE ?? null`; `:308` "Warehouse, " -> the map id (and
mode when set). Header comment `:1` "on Warehouse" -> "on Warehouse by default (MAP=...)". No budget, threshold or exit
change.
**Acceptance.** `node --check scripts/perf.mjs`; queue alone run: `request.mjs --sha <head> --alone --step "node
scripts/perf.mjs --json --budget" --env MAP=campusOps --env MODE=sector --set j20-perf` prints `"map":"campusOps"`
(its pass / fail is information for J21, not this slice's gate).
**Run.** `node --check scripts/perf.mjs`.
**Not.** BUDGET tables (`:27-60`, Michael-only), the measure code.

## S6a No route timer + import boundary (Sonnet) - now
**Goal.** Unit checks for hard rule 6 (H5: no countdown closes a route in Sector Ops / campaign) and hard rule 10 (H9:
gameplay never imports graphics settings).
**Files.** new `tests/noRouteTimer.test.ts`, new `tests/importBoundary.test.ts`. Reads only: `src/game/sectors.ts`
(`SectorDef` `:104-153`, `SECTOR` `:486-516`), `src/game/sectorStage.ts` (`SectorStageAction` `:18-39`),
`src/world/maps/campusSectors.ts` (`CAMPUS_SECTORS` `:304`), `src/world/maps/warehouseSectors.ts` (`WAREHOUSE_SECTORS`
`:22`).
**Do.**
1. noRouteTimer: walk every SectorDef of CAMPUS_SECTORS and WAREHOUSE_SECTORS recursively; fail on any key matching
   `/time(out|limit|r)|countdown|deadline|expire|closeAfter|closesAt/i` except an allowlist with a reason each:
   `pairGates[].window` (two players turn within a window; a miss never closes the route, the gate stays openable).
   Assert `SectorStageAction` lock doors only come with an alarm stage (`stage` 1-3) and no time key. Assert the
   `SECTOR` table's time keys are holds (hackTime, downloadTime, connectorHold, connectorCycle, connectorLoadAt,
   extractHold): a hold never closes anything (a fixed list; a new time key fails until reviewed). A comment names
   G334 and that Marlow drills (G342) are out of scope; the campaign has no map yet (Tallow Wharf adds its own rows).
2. importBoundary: scan `src/ai`, `src/game`, `src/player`, `src/net` (`.ts`, recursive, fs); fail on a non-type
   import of `core/quality`, `core/qualityManager` or `core/governor`. `import type` and `import { type X }` only are
   allowed (they erase: `src/game/gameState.ts:63-64`). Allowlist with reason: `src/game/benchmark.ts:9` (the graphics
   benchmark is render-side; Guard AI / Player never import it). A second row lists the `core/display` readers
   (`src/player/shoulderCamera.ts:8` vfovFor, `src/game/gameState.ts:9` shownResolution, `src/game/benchmark.ts:1`) and
   fails on a new one.
**Acceptance.** Both files green on 2148ec969; adding a fake `import { PRESET_IDS } from '../core/quality'` line to a
scratch copy of a `src/ai` file makes importBoundary red (check by hand, then remove).
**Run.** `npm run typecheck:fast`; `npx vitest run tests/noRouteTimer.test.ts tests/importBoundary.test.ts`.
**Not.** any src file (a real violation found = a fix request to the owner, the row allowlisted with the request named).

## S6b Replay determinism (Sonnet) - now
**Goal.** Hard rule 8 (H7): the same seed and inputs give the same patrol positions and detections.
**Files.** new `tests/replayDeterminism.test.ts`. Reads only: `src/ai/patrol.ts` (`PatrolWalker` `:51`, `tick` `:87`,
`step` `:108`), `src/ai/perception.ts` (`sightRate` `:168`, `stepMeter` `:208`), the two sector sets, `SquadSlot`
(`src/world/rooms.ts:22-38`).
**Do.**
1. For every guard with a `route` in CAMPUS_SECTORS and WAREHOUSE_SECTORS: build two PatrolWalkers from the slot
   (route, wait, waits, faces, start, loop; seed = guard index), step 180 s at 1/60 with a simple mover (walk speed 1.4
   m/s toward each `step` target); `Math.random` poisoned with `vi.spyOn` returning a different sequence per run; the
   two traces are equal to 1e-9.
2. Detections: a scripted intruder path past each section's first guard, fixed light levels; `sightRate` + `stepMeter`
   per step from the replayed traces: the meter traces and the first-detection step equal across both runs.
3. Static count: `Math.random(` outside comments in `src/ai/**/*.ts` equals the allowlist {`enemy.ts`: 2 (`:389`,
   `:2336`, think cadence), `enemyManager.ts`: 2 (`:650`, `:661`, radio delays), `reconDrone.ts`: 1 (`:34`)}; a new one
   fails. `it.todo('full guard replay once Guard AI seeds the think cadence and radio delays (fix request: J20 S6b)')`.
4. The lead sends Guard AI the fix request (the five sites, G143, `src/ai/squadRoles.ts:29-32` says patrols are free of
   it); the allowlist shrinks as they land.
**Acceptance.** Green on 2148ec969; removing the poison or changing a seed between runs makes the trace row red (by
hand). Runs under 5 s.
**Run.** `npm run typecheck:fast`; `npx vitest run tests/replayDeterminism.test.ts`.
**Not.** any `src/ai` edit (Guard AI's).

## S6c Alive at start: campus S2-S5, Marlow sets (Sonnet) - now
**Goal.** Hard rule 9 (H8, `level-design.md` "every guard the mode spawns is alive"): checked for every campus section
and every Marlow Yard set, not S1 only (`scripts/e2e-sectorops.mjs:1953-1954`).
**Files.** `scripts/e2e-sectorops.mjs`, `scripts/e2e-ctcourse.mjs` (tests only; owners Sector Ops / Marlow, BRIEF).
**Do.**
1. e2e-sectorops: a new `if (want(6)) { ... }` block after `:2443` (fresh page, `run(CAMPUS, ...)`, `:20` helper): for
   sections i = 1..4, teleport the player to section i's start, in page `const m = window.__sector;
   m.unloadSection(); m.loadSection(i);` (`src/game/modes/sectorMode.ts:679` / `:710`, TS-private, callable; BRIEF
   A10), `sim(3)`, then assert `enemyMgr.alive === guards of section i` (from `sections(G)`, as `:1956-1957`) and every
   alive guard's `pos.y` within 2 m of its slot's `y ?? floor` (none fell through). Log one line per section.
2. e2e-ctcourse: in the set loop after `:364` (`the course is at set n`): `enemyMgr.enemies` all `alive`, none with
   `pos.y < -5`, count logged; an empty set passes (Q11: Marlow has guards only where a mechanic needs one).
3. Time budget: part 6 has no entry in `scripts/e2e-times.json` (it sorts at the median) and runs under the 900 s queue
   kill (`service.mjs:810`). The new block prints its own wall (`H8 block: <n> s`); the slice's queue run reads part 6's
   total from the times line. Budget: the block <= 90 s and part 6 total <= 450 s (half the kill). Over either: move
   the block to a new `if (want(7))` and have part '7' added to `PARTS` (`run-e2e.mjs:47`) by S2 or a follow-up on
   PR-A, coordinated with Campaign's PARTS edit on feature/mission-engine-flg-gb6; until then it stays out of part 6.
**Acceptance.** Queue: `--suites "e2e-sectorops:6 e2e-ctcourse"` green on the slice head (E2E_GPU=1, the laptop), part 6
inside the budget above. `node --check` both files.
**Run.** `node --check scripts/e2e-sectorops.mjs scripts/e2e-ctcourse.mjs`; the queue request above.
**Not.** any src file, other parts' blocks, PARTS in run-e2e.mjs.

## S7 Light parity on every train (Opus) - after S3a
**Goal.** Q27: the light-meter-vs-picture check runs in every train run and a failure holds the release; other picture
flags stay advisory (visual-gate unchanged, `docs/laptop-queue/visual-gate.md:39`).
**Files.** `scripts/laptop-queue/lib.mjs`, `scripts/laptop-queue/service.mjs`, `tests/laptop-queue.test.ts`.
**Before build (lead).** Ask Sector Ops Build (owner of lighting and the visual gate) to confirm `e2e-darkness` is the
check until their per-map parity cards (J11) replace it. Run `request.mjs --sha <master> --suites "e2e-darkness"
--set j20-parity-pre` 3 times; all green -> ship with the switch on; any red -> ship with the run-time switch off
(below), fix request to Sector Ops, STATE notes it (BRIEF A7).
**Do.**
1. lib `export const TRAIN_PARITY = ['e2e-darkness']`; `export function trainParity(text, env = '', base =
   TRAIN_PARITY)`, pure: `env` = `LQ_TRAIN_PARITY` (`off` -> none, wins over the file); `text` = the switch file:
   missing, empty or bad JSON -> `base`; `{ "off": true, "why": "...", "by": "..." }` -> none; `{ "suites": [...] }` ->
   that list (a non-array -> `base`). Returns `{ suites, off, why }`. `export function trainList(list, suites)`: list
   plus those suites not already in it.
2. Run-time off switch, no release needed: `config/train-parity.json` on the `laptop-queue` branch (one push reaches
   both workers; the service already reads that branch, `service.mjs:247-277`, `QREF` `:298`). Each train, after its
   fetch, the service reads `git(['show', 'origin/laptop-queue:config/train-parity.json'], { soft: true })`, calls
   `trainParity(text, process.env.LQ_TRAIN_PARITY)`, logs "train parity: <suites> | off (<why>)" once per change and
   adds "; parity off" to the train's pending `laptop-e2e` description while off.
3. service: the train list (`service.mjs:1003`) and the dry-run plan (`:1305`) go through `trainList(list,
   parity.suites)` (both workers run `E2E_GPU=1`, `:810`). The shard (`lib shard`) and train reruns take it as a
   normal suite.
**Acceptance.** tests: trainParity: no file -> base; `{off:true}` -> none; `{suites:[]}` -> none; `{suites:['x']}` ->
['x']; bad JSON -> base; env `off` beats a file that says on. trainList appends once, keeps order, no duplicate, empty
= unchanged. `LQ_TRAIN_PARITY=off node scripts/laptop-queue/service.mjs --once --dry-run`: no e2e-darkness in the bins.
`service.mjs --once --dry-run` bins include e2e-darkness. After merge: the next train's laptop-e2e description counts
one more suite; a darkness failure fails `laptop-e2e` (auto-drop finds a culprit through the lamp rows of DIRECT, else
the train reruns per auto-train).
**Run.** `npm run typecheck:fast`; `npx vitest run tests/laptop-queue.test.ts`.
**Way out (D-B documents it in testing-tools.md "Laptop queue").** A red or flaky parity check holding every release:
push `config/train-parity.json` = `{ "off": true, "why": "<reason>", "by": "<session>" }` to the `laptop-queue` branch
(read on the next train, no release) and tell Sector Ops; delete the file (or `{ "off": false }`) to turn it back on.
`LQ_TRAIN_PARITY=off` is the per-worker override.
**Not.** run-e2e.mjs `--list` (REQUIRED stays Michael's list), visual.mjs, auto-train.

## D-A / D-B / D-C Docs (Sonnet, sequential, after each PR's slices)
Each docs slice is cut from the branch that already holds the previous PR's merge (D-C on PR-C's branch first; D-A
based on the merge of PR-C into master; D-B based on the merge of PR-A), so the three never conflict in
testing-tools.md. `docs/systems/testing-tools.md` only (plus that PR's fragment and STATE): D-A: "The runner" timeout line (`:45-46`), "Choosing
suites" DIRECT rules (`:94-114`: campus row, wire rule, AUDIO report-only), the `--affected` local wire note. D-B:
"Laptop queue" affected bullet (`:554-569`: report list, the stale "gates the head today" sentence at `:567-568`), the
rerun filter, perf `--budget`; "Flakes and quarantine" (`:607-627`): KNOWN FLAKY only for exit 1, repeat quarantine
blocking (Q30), knownFlaky counts, the T11 note, the `alerts/*-fixjob-*.json` kind; train run + e2e-darkness (Q27)
and its run-time off switch (`config/train-parity.json`, `LQ_TRAIN_PARITY`). D-C: the owners and the quarantine test
in "Flakes and quarantine"; hard-rule checks listed where the suites are named. RULES.md "Test tiers" (the train row
now names e2e-darkness) is the orchestrator's: D-B sends it the one-line change.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `config/train-parity.json` on `laptop-queue` (S7 run-time switch; `LQ_TRAIN_PARITY=off` per worker) | on after a green precheck | Night Shift \| Test Runner | PR-B release | the 3-run precheck is green |

## Walk items
- None (no player-facing change).

## Risks and open questions
- Claims overlap: `origin/feature/mission-engine-flg-gb6` (Campaign) edits `scripts/e2e-affected.mjs` DIRECT rows at
  `:242,:288` and `scripts/run-e2e.mjs` PARTS `:47`; `origin/feature/tallow-design-docs` edits run-e2e.mjs. S1 puts its
  rows after `:308` (separate hunk); S2 leaves PARTS alone. Orchestrator orders the merges.
- e2e-darkness on trains may be red on master today or flaky on the Warehouse Clear page (legacy page, warehouseOps
  frozen, Q26): the 3-run precheck before switch-on, then the run-time switch (`config/train-parity.json`
  `{ "off": true }` on the `laptop-queue` branch, no release needed) is the way out; the hold must not block every release.
- H8 uses TS-private `loadSection` / `unloadSection`: a rename in sectorMode breaks the test, not the game; Sector Ops
  told in the PR.
- H7 full replay needs Guard AI's `Math.random` fixes; until then the test proves the pure layer only.
- T4 turns report suites from dropped to running: affected runs get longer when LEGACY / AUDIO areas are touched (rare).
- Q30 makes e2e-coop / e2e-netmove blocking if they go over budget again before 2026-11-07: a fix job lands on Player
  Build.
- Q31 load time is out of scope (Sector Ops, J21).
