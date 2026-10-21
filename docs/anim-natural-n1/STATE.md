# anim-natural N1 - state

## Now
Implementer A done (REPORT-A.md: the harness tests/footTurnHarness.ts + footTurn.test.ts, the master table, 10 causes,
the proposed rule, the job lead's decisions). Implementer B building (2026-10-22 ~11:05).

## Next
1. Implementer B: the turn step + ball pivot + per-state rules + 5 Stepping sliders that bake; harness limits; e2e-anim
   turn block. Fresh checker, one fix round.
2. check + e2e-anim / e2e-studio / e2e-netmove on the desktop; GPU sheets before / after; full e2e; PR.

## Carried for N2 (orchestrator, 2026-10-22 ~10:40)
Michael approved lifting SWAY_MAX to ~5 cm (realistic side sway; he fine-tunes in the tuner).
Test tier: PRs touching only the tuner / Anim Studio or tests merge on CI + the suites they touch (CLAUDE.md on feature/menu).

## Assumed decisions (job lead 2026-10-22 ~11:05; orchestrator: no objections ~11:20)
Undo for each: revert the named part of the N1 PR.
1. Turn metrics measure the contact point (min heel / ball travel, the audit's definition); existing ankle metrics stay
   on straight gaits; a turn-state metric that switches to the contact point is marked `(anim-natural-n1)` and the PR
   body lists every switched metric with old and new values (so it cannot read as a loosening).
2. The straight-gait heel-raise ball slip (cause 6, 2.8 cm) is N1's last step.
3. The run pelvis lag (keyed trunk) is N2's.
4. Guards get the turn rule (shared planner), with `PlannerInput.turnRule` to opt out only if their rows get worse.
