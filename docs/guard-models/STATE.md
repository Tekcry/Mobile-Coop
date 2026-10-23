# Guard models: state

## Resume
- Now: plan written (BRIEF.md, PLAN.md) on `feature/guard-models` off master 41204e30 (4.80.0). No code.
- Starts: after sector-redesign incl. campus detail art (ROADMAP "Next: guard-models"); the orchestrator starts it.
- Next: P1 in parallel: G0 spec + kit data (Opus SPEC, Sonnet data), G5 GuardFigure on Wren's LODs as stand-in (Opus),
  G6 variation (Sonnet). Then G1 base bodies (desktop Blender, heavy.lock).
- Open for Michael: PLAN section 9 (faces A1, review gate A9, stable looks across restarts A4). Work proceeds on the
  assumptions.
- Key refs: PLAN sections 5 (budgets), 6 (fit vs guard-render M1 / S1), 7 (groups, models, ~16 h wall).
  Gear gameplay: `src/ai/enemy.ts:580-640`, `src/ai/gear.ts:28-37`, `src/net/enemyPuppet.ts:144-170`,
  `src/ai/gearParts.ts`, `src/ai/helmetDrops.ts:40`. Rig hook: `src/ai/enemyRig.ts:14-30`. Runtime base:
  `src/operators/runtime/figure.ts:338` (`OperatorLibrary`), `:425` (`OperatorFigure`), `:565` (always-active, to
  replace with S1's box). Pipeline: `scripts/operators/README.md`.

```
Night Shift job guard-models (lead). Worktree C:/NightShift/Mobile-Coop-guard-models, branch feature/guard-models.
Guard: cd /c/NightShift/Mobile-Coop-guard-models && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-models
Read CLAUDE.md, docs/guard-models/STATE.md, BRIEF.md, PLAN.md; ROADMAP only "Next: guard-models".
Run PLAN section 7 from the next open group; subagents start from docs/systems/agent-preamble.md.
Opus for Blender, rig, anim and render code; Sonnet for data, tests, docs. One fresh checker per group.
Blender only on the desktop with -b under heavy.lock; GPU sheets and guard-cap on the laptop (Test Runner).
Update this STATE.md at every stop; commit and push WIP before 92%.
```

## Done
- 2026-10-23: BRIEF.md (ask, goal, limits, A1-A11) and PLAN.md (G0-G9, budgets, fit, estimate) written.
