# Guard models: state

## Resume
- Now (2026-10-23 ~21:10, lead Player Build): P1 G0 / GB / G6 DONE and merged here (a63e82ca; tsc 0, vitest 3 files 65);
  P1 checker (Opus) running on a63e82ca. G6n done on feature/gm-g6n f9ce1015 (look seed: src/ai/guardLook.ts, al bits 9-15,
  AL_MAX 65535); two independent Opus checkers running; merge after both PASS. G5 GuardFigure (Opus) running in
  Mobile-Coop-gm-g5. P2/P3 started early on GB's driver: G1 bodies (gm-g1), G1h heads (gm-g1h), G3 gear (gm-g3), Opus,
  worktrees off feature/gm-gb 5da3600c; rules C:/NightShift/scratch/ctcore/briefs/gm-common.md + gm-blender.md (desktop
  smoke runs of ONE job under heavy.lock until L0 lands; full stages = laptop alone requests).
  Lead rulings: enforcer shows plate_heavy (plated); helmets drawn only with the gameplay helmet bit (strict A5, G0 open
  item); droneOp headwear2 cap; one cranium / hair cap / head envelope per base (G0).
  L0 probe queued: request 20261023T094854-...-7d0b, status laptop-e2e/alone-guard-bake-probe on bbd49206 (the desktop
  has all three tools: GB --probe).
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
