# Locomotion run - state

Current step: 10 elbow-strike (next)
Last commit: see git log (locomotion 00)

## Baseline (step 0, this VM)
- npm run build: pass. smoke e2e: pass (9 s).
- npm run check: lint 0 errors / 38 warnings; tests 1015 / 1016 pass. Pre-existing failure, kestrel-owned:
  tests/kestrelMap.test.ts "the map copy equals docs/kestrel/kestrel.blocks.json".
- Perf trend baseline (node scripts/perf-trend.mjs, calib 9.9 ms): sim p95 2.65 ms, anim 0.0504 ms/char, alloc 11245 KB/s, draws 42, tris 0.14 M. +25% trip: sim 3.31, anim 0.063.
- e2e-netmove baseline (limit 10 cm, 121 s): worst joint errors cm: low cover 0.5, low peek 3.7, high cover 1.9, high edge peek 3.5, ladder 0.3, pipeV 0.2, pipeH 0.2, ledge 0, duct 0.2, split 0, split aim 1.1, wall-jump hang 0.2, pipe legs 0.4, inverted 0.1, rappel 0.2, fence 0.8.

## Done
- 00 setup: branch, BRIEF, RULES, DECISIONS, BIBLE-PROPOSALS, bible 1.13 (Section 5.17), CLAUDE.md resume line, scripts/perf-trend.mjs.

- 01 audit: AUDIT.md + audit/*.
- 02 plan: PLAN.md, steps/01-34, A1-A32.
- step 01 remove-mark-execute.
- steps 02-04 sonar, shield, style (SAVE_VERSION 8).
- step 05 remove-cover-player (1 fix round).
- step 06 remove-cover-rig-net (1 fix round). Block A done.
- step 07 harness-local (3 fix rounds).
- step 08 harness-remote (3 fix rounds + A40). Block B done.
- step 09 holster-draw (1 fix round).

## Blocked
(none)

## Pending PC
(see PC-PASS.md)

## Open ASSUMED decisions
- A1-A32 in DECISIONS.md (all open for review).
- A0: the audit document lives in docs/locomotion/AUDIT.md (brief) rather than docs/animation-audit.md (bible 5.12.4); bible text left as is.

## Next action
Loop: implement -> check -> commit for steps 01..34 (PLAN.md). Step numbering in commits: 'locomotion NN'.
