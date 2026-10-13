# Locomotion run - state

Current step: 0 (setup) -> 1 (audit) in progress
Last commit: see git log (locomotion 00)

## Baseline (step 0, this VM)
- npm run build: pass. smoke e2e: pass (9 s).
- npm run check: lint 0 errors / 38 warnings; tests 1015 / 1016 pass. Pre-existing failure, kestrel-owned:
  tests/kestrelMap.test.ts "the map copy equals docs/kestrel/kestrel.blocks.json".
- Perf trend baseline: pending (scripts/perf-trend.mjs).
- e2e-netmove pose errors: pending.

## Done
- 00 setup: branch, BRIEF, RULES, DECISIONS, BIBLE-PROPOSALS, bible 1.13 (Section 5.17), CLAUDE.md resume line, scripts/perf-trend.mjs.

## Blocked
(none)

## Pending PC
(see PC-PASS.md)

## Open ASSUMED decisions
- A0: the audit document lives in docs/locomotion/AUDIT.md (brief) rather than docs/animation-audit.md (bible 5.12.4); bible text left as is.

## Next action
Collect the 4 audit agents, spot-check, write AUDIT.md (step 1), then PLAN.md and step files (step 2).
