# Guard models: state

## Resume
- Now: plan only (BRIEF.md, PLAN.md) on `feature/guard-models` off master 41204e30 (4.80.0). No code. Michael's
  answers M1-M3 are in BRIEF (2026-10-23 ~19:45) and PLAN is re-budgeted for them: mid-detail faces (G1h), the look
  seed on the wire (G6n, two Opus checkers, the train build bumps `PROTOCOL_VERSION`), the look fix pass (G10), and
  Blender on the laptop queue (GB driver, L0 tools; no desktop Blender).
- Starts: after sector-redesign incl. campus detail art (ROADMAP "Next: guard-models"); the orchestrator starts it.
- Next: P1 in parallel: G0 spec + kit data (Opus SPEC incl. face spec and seed rule, Sonnet data), GB bake driver
  (Sonnet, Opus checker), L0 laptop probe request (Test Runner), G5 GuardFigure on Wren's LODs (Opus), G6 variation
  (Sonnet), G6n look seed (Opus). Then G1 bodies + G1h heads as laptop bakes.
- Open: L0 needs Michael's yes only if the probe finds Blender 5.2.2 / MPFB2 zip / KTX-Software missing on the laptop
  (orchestrator asks, native multiple choice). Until then the desktop fallback (`--par 2`, heavy.lock) applies.
- Key refs: PLAN sections 5 (budgets: LOD0 20 k shown / 45 k buffer tris, 4096 x 2048 atlas), 6 (24-guard fit vs
  guard-render S1), 7 (groups, ~14.5 h wall, ~33 agent-hours). Gear gameplay: `src/ai/enemy.ts:580-640`,
  `src/ai/gear.ts:28-37`, `src/net/enemyPuppet.ts:144-170`, `src/ai/gearParts.ts`, `src/ai/helmetDrops.ts:40`. Wire:
  `src/net/protocol.ts:110-127` (`al` bits, `AL_MAX` :122, `packAlert` :127, parse :337), `src/ai/enemy.ts:196`
  (`num`). Rig hook: `src/ai/enemyRig.ts:14-30`. Runtime base: `src/operators/runtime/figure.ts:338`
  (`OperatorLibrary`), `:425` (`OperatorFigure`), `:565` (always-active, to replace with S1's box). Pipeline:
  `scripts/operators/README.md`. Laptop queue: origin/feature/laptop-queue `scripts/laptop-queue/request.mjs`
  (`--alone --step`), `docs/systems/testing-tools.md` "Laptop queue" there.

```
Night Shift job guard-models (lead). Worktree C:/NightShift/Mobile-Coop-guard-models, branch feature/guard-models.
Guard: cd /c/NightShift/Mobile-Coop-guard-models && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-models
Read CLAUDE.md, docs/guard-models/STATE.md, BRIEF.md, PLAN.md; ROADMAP only "Next: guard-models".
Run PLAN section 7 from the next open group; subagents start from docs/systems/agent-preamble.md.
Opus for Blender, rig, anim, render and src/net code; Sonnet for data, tests, docs. One fresh checker per group;
two independent Opus checkers on G6n (src/net). Never set PROTOCOL_VERSION; tests read the constant.
No Blender on the desktop: bakes are laptop-queue --alone requests (GB driver, parallel blender -b jobs);
desktop fallback (--par 2, heavy.lock) only until L0 is done. GPU sheets and guard-cap on the laptop queue.
G4's sheet goes to Michael without a stop; his notes go into G10.
Update this STATE.md at every stop; commit and push WIP before 92%; queue the next bake before a swap.
```

## Done
- 2026-10-23: BRIEF.md (ask, goal, limits, A1-A11) and PLAN.md (G0-G9, budgets, fit, estimate) written.
- 2026-10-23 ~20:00: Michael's M1-M3 into BRIEF (A1, A4, A9 retired; A12-A15 added); PLAN re-budget: mid-detail faces
  (LOD0 20 k shown / 45 k buffer, 4096 x 2048 atlas, ~112 MB VRAM, <= 75 MB download, still 1 draw per guard),
  slices L0, GB, G1h, G6n, G10; laptop bakes; ~14.5 h critical path.
