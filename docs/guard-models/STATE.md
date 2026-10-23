# Guard models: state

## Resume
- Now (2026-10-23 ~21:00, lead: Night Shift | Player Build, taken over from Marlow Build): P1 running. Slice worktrees
  C:/NightShift/Mobile-Coop-gm-<s> on branches feature/gm-<s> off 6b5c4319 (node_modules junction to
  Mobile-Coop-anim-fix-pass): g0 (Opus SPEC + kit data + validateGuardKit), gb (Sonnet bake driver), g5 (Opus
  GuardFigure on the Wren stand-in), g6 (Sonnet guardVariant), g6n (Opus look seed on the wire). Shared rules and the id
  contract: C:/NightShift/scratch/ctcore/briefs/gm-common.md. L0 probe queued on the laptop: request
  20261023T094854-...-7d0b, set guard-bake-probe (step 1 Blender, 2 toktx, 3 MPFB2 zip; status laptop-e2e/alone-guard-bake-probe).
- Started 2026-10-23 ~20:45 on the orchestrator's word (Michael gave Player the build).
- Next: as each P1 slice lands: merge feature/gm-<s> into feature/guard-models; one fresh Opus checker for P1 (G0, GB, G5,
  G6) and two independent Opus checkers on G6n; then P2 (G1 bodies + G1h heads as laptop alone bakes via GB).
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
