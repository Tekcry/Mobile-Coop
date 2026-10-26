# laptop-queue-11 - plan
Owner: Test Runner. Status: current.

One Opus planner+builder, one step (queue code, unit tests only; CI `check`).

1. lib.mjs: `suiteParts(suites, times, table)`: with a table (a head's run-e2e PARTS) a suite expands to its parts
   only, no times keys; without one, as before (expectedWallS's estimate). New pure helpers at the end: `partsTable`
   (reads the one-line `const PARTS = {...}` of a run-e2e source), `slowLines`, `slowNote`, `slowRecord`,
   `slowSummary`; `describe` appends `slowNote(result.slow)` before its 140 cut.
2. service.mjs:
   - `runParts` (run time, slot checked out at the head): `node scripts/run-e2e.mjs --list <suites>` in the slot, the
     exact expansion; empty list -> []; no output -> `planParts`. Used by the request shard (`bins`).
   - `planParts(sha)` (planning: the two-slot decision in runRequest and `queue.shardRerun` in pass): the head's PARTS
     via `git show <sha>:scripts/run-e2e.mjs` (memo per sha), else this checkout's run-e2e PARTS, else `{}` (no
     expansion: a whole suite counts as one part, so it never shards into parts the head lacks; the run-time shard then
     still expands from the head).
   - Unknown parts with no time: lib `shard` already weighs them at the median of the known times in the list.
   - `noteSlow` at the top of `finish`: SLOW lines from the last run-e2e block of each run log (worst per suite) ->
     `result.slow` (status: "; slow: e2e-sectorops:6 684/900s") and `state.slow` (7-day window) -> a Slow table under
     the flake rates in `flake-budget.md`. The status is where the requester looks; flake-budget.md is the queue's one
     per-suite health file (Test Runner's review reads it).
3. Tests: one describe in tests/laptop-queue.test.ts (before `pruneDone`). Docs: a line in testing-tools.md (flake
   budget paragraph, line-neutral), fragment `changes/feature-laptop-queue-11.md`.
