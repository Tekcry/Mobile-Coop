# coop-kit STATE
Owner: Night Shift | Player Build. Status: current (job doc).

## Resume block
- Job: FOLDED-PLAN J24 co-op kit (R32 shoulder stand, R34 rope descent) plus the five moves Michael added at ~18:05
  (Deadweight, Drop Catch, Chimney Pair, Swing Pass, Plank Bridge). BRIEF `docs/coop-kit/BRIEF.md` (A1-A13, no
  questions for Michael), PLAN `docs/coop-kit/PLAN.md` (part 1 detailed: A1, A2, B1, B2, A3; part 2 slice briefs: K0,
  K1-K4, K5a, K5b).
- Location: worktree C:/NightShift/Mobile-Coop-coop-kit, branch feature/coop-kit from origin/master 2148ec969. Guard:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop-kit`.
- 2026-10-25 ~18:40: BRIEF + PLAN written by the Opus planner. No code yet.
- Gates: a fresh Opus plan checker (`docs/templates/plan-check.md`; `node scripts/claims-check.mjs --plan
  docs/coop-kit/PLAN.md --name feature/coop-kit`) -> PLAN-CHECK.md PASS; the orchestrator orders part 1 against
  Campaign's mission-engine kit branch (PLAN "Claims", shared files).
- Part 2 gate: Campaign's kit PR (KIT0 registry + NET kit kinds) on master; then a detailed part 2 PLAN section.
- Owed elsewhere (not this job): Marlow's pull-up and shutter poses (shared `src/anim/clips/team.ts`); scale-sheet line
  56 wording (Marlow Build, A5); mission-engine PLAN row 106 (orchestrator, A1).
- Next: plan checker on this head; on PASS start A1 (Opus) in C:/NightShift/Mobile-Coop-coop-kit-a1
  (`feature/coop-kit-a1` from origin/master) and write the A2 and B1 briefs.

## Done
- 2026-10-25: BRIEF, PLAN, STATE (planner).
