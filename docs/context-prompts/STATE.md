# context-prompts STATE
Owner: Night Shift | Player Build. Status: P1-P4 built (S1-S6); P1 merged, P2-P4 open in a stack; S7 waits for Michael's walk.

## Resume
- Job: replace the hold-A context box with world prompts, one button per action, tap / hold (BRIEF.md:6-11 Michael's
  words; BRIEF.md:13-18 his three picks; A1-A26 BRIEF.md:49-143). Plan: PLAN.md sections 1-9; slices PLAN.md:318-328.
- Flag `contextPrompts` (`?ctxprompts=1` / `0`, on in /preview/; `src/core/flags.ts`), owner Night Shift | Player
  Build, switch-on at Michael's walk, target 2026-10-31 (BRIEF A20, PLAN section 7).
- PRs (each carries P2 / P3's triage e2e fixes, `C:/NightShift/scratch/ctcore/cp-triage-REPORT.md`):
  - P1 #699 (S1 core model, S2 Y rule + flag): merged to master (train 167).
  - P2 #700 (S3 providers + wiring), base master, head ce07e76d2, laptop set cp-p2 (e2e-coop, e2e-netmove,
    e2e-takedown, e2e-stealth-ai). Worktree `C:/NightShift/Mobile-Coop-ctx-p2`.
  - P3 #703 (S4 prompt view), base P2, head 0e5b530db, laptop set cp-p3 (e2e-pad, e2e-coop, e2e-netmove).
  - P4 #705 (S5 co-op, hang-down, carry, knife, team states + S6 docs), base P3, head 5dd46f38b before S6, laptop set
    cp-p4 (e2e-coop, e2e-netmove, e2e-ctcourse, e2e-piano). Worktree `C:/NightShift/Mobile-Coop-ctx-p4`.
  - Verdicts: the `laptop-e2e/<set>` commit status on each head; checker PASS posted on all three.
- Code: `src/game/contextPrompts.ts` (focus, tap / hold, `CTX_HOLD`, `CTX_FOCUS`), `src/game/contextJump.ts` (Y rule),
  `src/game/contextProviders.ts` (rows per target), `src/game/gameState.ts` `contextPromptStep` / `ctxListOpen`,
  `src/ui/hud/contextPromptView.ts`, `src/ui/hud/promptLayout.ts`. Reports: `C:/NightShift/scratch/ctcore/cp-p*-REPORT.md`.
- Docs (S6): `docs/systems/input-and-loop.md` "Context prompts" (the model and the Y rule), `ui.md` (the view),
  `takedowns.md` (tap A knock out / hold A kill, knife scene), `movement.md` (Y = jump except the rule), `ct-toolkit.md`
  (optic cable on Y, interrogate on A), `TESTING.md` "Context prompts (preview only)". Binding table unchanged until P6.
- Walk card: PLAN.md:357-371 (walk items 1-6), on /preview/ (pad first). S7 = P5 (flag on, old-menu asserts moved) and
  P6 (old box deleted, jump row "Jump / traverse / peek") only after Michael accepts it (PLAN.md:326).
- Polish list (checkers, not blocking; fold into S7 or a small fix if the walk asks):
  1. P4: "Drop body" anchors on the camera's yaw, the body lands by the controller's yaw (add `bodyYaw()` to `CtxHost`).
  2. P4: `[RT] Knife takedown` shows with a gun drawn or aiming; gate it on `rt` like the other RT rows.
  3. P4: `.wp-sub` (the waiting line) has no style of its own.
  4. P2: a faced closed door's own item stays in `interactTarget` (harmless); `itemDoor` with no door near falls back
     to the item's label.
  5. Triage: during the door's open move, a camera turned away shows `[A] Open` on the door's own item (a second A
     re-opens an opening door, harmless); hide the item while `doorOpen.active`.
  6. PLAN 8 e2e-coop items not added (team takedown and bluff on the hostage, hang-down grab): unit tests only.
- Next: land P2, P3, P4 in order once cp-p2 / cp-p3 / cp-p4 are green; then Michael's /preview/ walk; S7 on his yes.

## Done
- 2026-10-27: BRIEF.md, PLAN.md (Opus planner; plan fix round 1 and recheck FIX A).
- 2026-10-27: P1 (S1 + S2, Opus builder) -> #699, merged. Report `cp-p1-REPORT.md`.
- 2026-10-27: P2 (S3, Opus) -> #700, checker PASS; P3 (S4, Sonnet) -> #703, checker PASS (the `.ctxp.off` opacity
  hardening applied); P4 (S5, Opus) -> #705, checker PASS. Triage (Opus): two e2e test-geometry fixes, b684debd7 (P2),
  c2900736a (P3), carried up the stack.
- 2026-10-27: S6 docs and walk prep on P4 (this file, the systems docs, TESTING.md, the P4 changelog fragment).

## History
- 2026-10-27: branch `feature/context-prompts-p1` cut from the plan commit 256372623; P2-P4 stacked on it, each
  re-merged with master after #699 landed.
