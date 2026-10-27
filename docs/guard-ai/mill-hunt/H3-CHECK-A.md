# guard-ai mill-hunt: H3 check A
Checker: Opus 5.5 (checker A of two), 2026-10-27. Scope: `git diff 5a13cc893 5336f4735` (the glue only).

Verdict: PARTIAL (check in progress; this file is a save point and will be replaced)

## Checked so far
- Read: origin/master CLAUDE.md, BRIEF A1-A16, PLAN rev 2 "Glue (H3)", PLAN-CHECK fold-ins, H3-REPORT, the full src
  diff, the e2e / docs diff, `tests/millHuntGlue.test.ts`, the board's `admit` / `tick` / `drop` / `emit`.
- Flag off (first pass): every new branch is gated on `mhOn` (false) or `millHunt` (null without the flag): `i.hunting`,
  the searching branch, `aimedMotion`, `placeSlot`, `sceneDarkOn`, `revive`, `clear`, the board tick fall through to the
  code as built. No difference found yet.

## Still to check
- Flag on paths (incident task, light check, body search, blackout slots), the four additions, the co-op pin hook vs
  `mhTick`, the 192 B per tick, the e2e changes, co-op host-only; test / typecheck runs (running).
