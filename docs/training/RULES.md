# Training run - rules (branch feature/training-bunker)

Condensed from BRIEF.md. The brief and DECISIONS.md win if they differ.

## Resume
1. Read CLAUDE.md, this file, then STATE.md. Read BRIEF.md after any resume or compaction.
2. Read only the current step file (`steps/<id>.md`) and the line ranges it lists. Never read docs/archive/.
3. Ignore the `feature/kestrel` line at the top of CLAUDE.md and its "Every session" steps 2-4.

## Authority
DECISIONS.md > docs/design-bible.md > SPEC.md (with exceptions E1-E10) > BAYS.md > docs/level-design.md > other docs > code.

## Where it runs
- **Local (Michael's PC):** everything, GPU items included (section "GPU on this PC").
- **Cloud mode** (the start message says "(cloud)", or `E2E_GPU` cannot work: no hardware GPU): software GL only. Never
  set `E2E_GPU=1`; never claim a perf or visual result; every GPU item at a block end is marked "pending PC run" in
  PC-PASS.md and STATE.md, and runs at the next local session's first block end (it reruns all pending rows). Use
  `E2E_JOBS=2` (cloud VMs have about 4 cores). The perf trend (no --budget) still runs: trend only. The branch is
  feature/training-bunker whatever branch the cloud session was given: check it out, commit and push only there.
- A run may move between cloud and local at any step boundary: STATE.md says where the last step ran.

## Course rules and BAYS v2 (walk 1, 2026-10-14)
SPEC "Course rules" R1-R8 bind every step from T5b on. After T5c, BAYS.md is v2 (v1 kept as BAYS-v1.md): line
ranges in later step files (T6-T10) point at v1; find the same section in v2 by its heading instead.

## Hand-offs (D39)
Every stop ends with the "Next for Michael" block (BRIEF section 6): exact actions and the exact next prompt in a fenced
block; he never has to look anything up. Keep STATE.md "Next for Michael" current.

## Context hygiene (orchestrator)
- Your context holds only STATE.md, the current step file and subagent conclusions (their returned summaries). Never
  read source, diffs or logs yourself beyond `git status`, `git log -1` and a check's summary line.
- After a compaction, re-read STATE.md before acting.
- Subagent prompts are the step file plus the BRIEF section 4 line; never paste large text into them.
- Subagents return at most about 40 lines: files changed, check summary lines, undone items, assumptions.

## Agents
- Every subagent uses opus. Only one code-changing agent at a time. Read-only Explore agents may run in parallel (up to
  4) when a step says so.
- Budget about 60 tool calls per subagent. Over budget: stop and return what is done and what is left; the orchestrator
  starts a fresh implementer with the remainder.
- The checker is always a fresh agent that did not implement.

## Hard rules (CLAUDE.md holds)
- Babylon only through src/core/babylon.ts; no hot-path allocation; hyp2 / hyp3, never Math.hypot.
- Gameplay never reads graphics state; light parity holds (the light field is the one source).
- Single player never imports src/net statically; co-op code stays behind the dynamic import and flags.coop.
- Saves only through src/save, never localStorage. A save-shape change bumps SAVE_VERSION with a migration and a test.
- No Splinter Cell IP, no real brands, no voice: text radio and subtitles only (story rules: British spelling, 90
  characters per radio message, dry humour, none while guards are alert).
- Never edit src/editor/**, src/world/maps/kestrel*, src/security/**, docs/kestrel/**, docs/locomotion/**. Use
  `MapLayout.security` data for the S1 cameras; do not change the security code.
- Map files: originality rule (SPEC). Never open other map builders (`src/world/maps/*.ts` other than index, listed,
  storey, stairs, mapDef and the bunker files).
- Tuning tables (src/config/movement.ts, enemies, weapons, PERCEPTION, LIGHT) never change for this map: change the
  geometry. The course framework's own numbers go in src/config/course.ts.
- No secrets, tokens or network dependencies in the game.
- Desktop only (D24): no phone checks, no touch work, no phone perf runs for this map.
- Every drill is mandatory (D30): no code path, setting, radio line or test helper completes a drill except a real
  performed verb (the dev solo flag only makes one player's ticks count for both).
- Planned stops: after Block B (D27, walk 1), after T5g (walk 2), at TM until locomotion step 20 has landed (D15), and
  at Block C end (walk 3, D50: locomotion, light, drills and guards in; same hand-off as walk 2).

## Checks
- Every step: `npm run check` (lint + tests + build) and the e2e suites the step file names. Steps touching src/net also
  run `e2e-coop` and `e2e-netmove`. The checker also runs `npm run e2e:quick`.
- Shell commands get a timeout (`timeout 900 npm run check`, `timeout 1500 npm run e2e:quick`). Run the full
  `npm run e2e` with run_in_background and wait for its notification; never poll with sleep loops.
- Never run `npm run dev`, `npm run editor`, preview servers or watch modes. Unit tests: `npm test` (single run).
- Read logs with tail -40 or grep; read source by grep, then line ranges.
- E2E jobs: `E2E_JOBS=4` on this PC; a timing failure that passes on a serial rerun is logged as flaky in
  REVIEW-NOTES.md, not fixed. Known-flaky suites (docs/backlog.md) print as KNOWN FLAKY.
- Pre-existing failures need no proof: anything failing identically on `origin/feature/kestrel` (e2e-editor,
  e2e-kestrel, e2e-camera-bounds level U were kestrel-owned on 2026-10-13). Log them in REVIEW-NOTES.md once.
- The same error twice with no progress: stop that line of work, log it, move on.

## GPU on this PC
- This run is local: GPU checks may run here with `E2E_GPU=1`, at block ends only (never inside a step), from the
  items in PC-PASS.md. Record each result (numbers, pass / fail against its limit, the screenshot path under
  `test-results/training/`, never committed) in PC-PASS.md.
- Visual judgement (does it look right) is Michael's: the run records the screenshots and the item stays "for Michael".
- Perf budgets with `E2E_GPU=1 node scripts/perf.mjs --desktop --budget` are real claims on this PC; software-GL numbers
  are trend only.
- Perf trend: `node scripts/perf.mjs` (no --budget) at T0 and each block end; a rise over 25% in sim or animation time
  against this run's T0 baseline: fix before moving on.

## Choices and limits
- A choice Michael would make: pick the option that best fits DECISIONS, the bible and BAYS; log it in DECISIONS.md as
  "A<n> ASSUMED - for review" with the alternatives; carry on.
- A BAYS change that only moves a number within its window: the implementer makes it and logs it. A change to a route,
  gate or guard job: log it under "Spec change requests" in LOG.md with the reason and apply it (D12: no approval
  needed), and list it in REVIEW-NOTES.md.
- Blocked after 3 fix rounds: evidence in STATE.md under Blocked; move to the next independent step; retry once at
  the block end.
- Scope guard: a step that needs more than twice its planned work stops; the rest goes to REVIEW-NOTES.md.
- Protocol version: T1b bumps `PROTOCOL_VERSION` once. When a later merge brings another bump, take the higher value
  plus one and log it.

## Commits
- Path-limited commits (`git commit -- <paths>`), never `git add -A`. Message `training TN: <summary>`, ending with the
  attribution lines from the session's system reminder. Push after every commit: `git push -u origin
  feature/training-bunker` (retry network failures up to 4 times: 2, 4, 8, 16 s).
