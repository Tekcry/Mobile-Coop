# context-prompts STATE
Owner: Night Shift | Player Build. Status: P1 (S1 + S2) built on `feature/context-prompts-p1`; waits for the lead (PR, checker).

## Resume
- Job: replace the hold-A context box with world prompts, one button per action, tap / hold (BRIEF.md:6-11 Michael's
  words; BRIEF.md:13-18 his three picks; A1-A26 BRIEF.md:49-142). Plan: PLAN.md (sections 1-9).
- Worktree `C:/NightShift/Mobile-Coop-ctx-p1`, branch `feature/context-prompts-p1` from the plan on master. No PR yet.
- Flag: `contextPrompts` (`?ctxprompts=1` / `0`; on in `/preview/`), owner Night Shift | Player Build, switch-on at
  Michael's walk, target 2026-10-31 (BRIEF.md:114-118 A20, PLAN.md:289-296).
- P1 = S1 + S2 (PLAN.md:320-321): pure modules only, nothing wired into `gameState.ts`; no behaviour change with the
  flag on or off.
  - S2 flag: `src/core/flags.ts` (`contextPrompts: darkFlag(params.get('ctxprompts'), PREVIEW_ON)`) and its lines in
    `tests/previewFlags.test.ts`.
  - S1 core model: `src/game/contextPrompts.ts` (targets, fixed slots, focus pick / sticky / lock, tap vs hold
    resolver, `ctxOwnsA` / `ctxOwnsY`, `CTX_HOLD`, `CTX_FOCUS`, `CTX_SLOT_BUTTON`, `CtxPromptSink`) and
    `tests/contextPrompts.test.ts` (PLAN.md:203-227, :333-336).
  - S2 Y rule: `src/game/contextJump.ts` (pure: who takes the jump press) and `tests/contextJump.test.ts`, one test per
    row of the case table (PLAN.md:154-182, :337-342); `src/input/conflicts.ts` header comment only (PLAN.md:20-22).
- Checks per sub-step: `npx tsc --noEmit -p tsconfig.json`, `npx vitest run <files>`, `npx eslint <files>`. Never a
  full `npm run check`, never e2e from the agent.
- Gate for P1 (PLAN.md:330-332): `e2e-coop` + `e2e-netmove` green via the laptop queue before the checker passes (the
  lead requests them on the PR head).
- After P1: S3 (providers and wiring, P2) and S4 (prompt view, P3, in parallel from S1's types) per PLAN.md:322-323.
- Report: `C:/NightShift/scratch/ctcore/cp-p1-REPORT.md`.
- Next: the lead opens P1 (no PR yet), requests `e2e-coop` + `e2e-netmove` on its head and starts a fresh checker; then
  S3 (P2) and S4 (P3) briefs. S3 reads: `ContextPrompts` `begin` / `add` / row helpers / `step`, `run`, `ctxOwnsA` / `ctxOwnsY`,
  `ctxJumpTaker` (give `y.pressed` only for a press it calls `second`; `yLive` = its answer each step).

## Done
- 2026-10-27: BRIEF.md, PLAN.md (Opus planner; plan fix round 1 and recheck FIX A).
- 2026-10-27: STATE.md; S2 flag; S1 `contextPrompts.ts` (32 tests); S2 `contextJump.ts` (16 tests), conflicts.ts
  header (Opus builder, P1). Report: `C:/NightShift/scratch/ctcore/cp-p1-REPORT.md`.

## History
- 2026-10-27: branch `feature/context-prompts-p1` cut from the plan commit 256372623.
