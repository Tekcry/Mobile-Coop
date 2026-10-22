# lightField heap check under load - state

**Now (2026-10-23 ~00:35, round 2, branch off master 4.60.0 d01300d3):** fix committed and pushed; unloaded checks pass.
The loaded proof is NOT run here (Michael ~00:25: no CPU-burner load on the desktop while agents run). Next: the
orchestrator sends the loaded proof below to Character Build on the laptop, then the PR merges on a pass.

## Cause (round 2)
The rounds read whatever V8 tier the code had reached, and tier-up ran on a background compiler thread. Per-round
trace (`ALLOC_TRACE=1`, 4.60.0 helper, desktop, a CPU burner alongside, test at Normal and BelowNormal):
- bodyLevel in Sparkplug (status 0x8001) read 100-127.3 B against its 128 B limit and was accepted as the result in
  most runs (the loop stops at round 4 once a round meets the goal). Turbofan reads 64.8. A Sparkplug round over 128
  in every round, with the compiler thread starved, fails the check.
- levelAt read 48-109 B in Sparkplug and 112 B in the round Maglev installed, against 64; 32.0 once optimized.
- The control (272.0 B) and the scavenge guard were fine in every run: no low control, no scavenge in a round.
- No assertion failure reproduced in about 40 loaded runs (8 and 24 burner threads, test at BelowNormal); two cold
  starts at BelowNormal hit the shell timeout (vitest startup, not the heap check).

## Fix
`tests/helpers/allocPerCall.ts` sets `--no-concurrent-recompilation` and `--no-concurrent-osr` when it loads: tier-up
happens on the main thread when the call budget trips, so the warm-up always ends in optimized code (every round
status 0x51, Turbofan), whatever the CPU load. Same rounds, limits and asserts; the 25 ms yield is now `setImmediate`
(it only waited for the compiler). `ALLOC_TRACE=1` logs every round with its tier. Tests only.

## Unloaded evidence (desktop, 2026-10-23)
- lightField "allocation-free" 20 runs: 20/20 pass; levelAt 32.0 every run; control 272.0 every run; bodyLevel 64.8
  (17), 79.6 (1), 113.2 (2), all Turbofan, stable across rounds (limit 128). The 79.6 / 113.2 outcomes are a
  different Turbofan inlining result (rare, about 1 in 15), not tier timing; open item if it ever reads over 128.
- Negative control (a scratch copy of the test with the levelAt query swapped): an escaping `{x,y,z}` 112 B, a
  `Float64Array(3)` 272 B, a closure 152 B (escaping or not) all FAIL, the same as the old helper. A non-escaping
  `{x,y,z}` that Turbofan scalar-replaces reads 32 B and passes, the same as the old helper (no allocation in
  optimized code).
- All 8 allocPerCall test files: 99/99 pass, 3 runs. tsc and eslint clean.

## Loaded proof to run (Character Build, laptop)
At the branch head, with load from `E2E_JOBS=5 node scripts/run-e2e.mjs <5 suites>` running alongside:
`for i in $(seq 1 20); do ALLOC_TRACE=1 npx vitest run tests/lightField.test.ts --silent=false 2>&1 | grep -E "bytes per query|Tests "; done`
Pass: 20/20 "15 passed", levelAt 32.0, control 272.0, bodyLevel at most 113.2 (limit 128).

## Resume prompt
```
lightField heap fix round 2: RESUME. Folder C:/NightShift/Mobile-Coop-lightfield-heap, branch feature/lightfield-heap
(pushed). Read CLAUDE.md, then docs/lightfield-heap/STATE.md. Tests only. If the laptop loaded proof passed, add its
table to the PR body; if it failed, read the ALLOC_TRACE lines (tier per round) and report.
```

## Done
- 2026-10-23: synchronous tier-up in allocPerCall; unloaded 20/20, negative control, all 8 importers, tsc, eslint.
- 2026-10-19 (round 1, #26, 4.7.5): small rounds, smallest round kept, escaping control.
