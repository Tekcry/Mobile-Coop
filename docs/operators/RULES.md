# Operators run - rules

Branch `feature/operators`, worktree `C:\NightShift\Mobile-Coop-operators` (cut from `origin/ct-movement`, see DECISIONS S1).
Pre-production only: design, a dev-only viewer, an offline asset pipeline and mockup renders. No game integration.

## Every session
1. Read `CLAUDE.md`, then this file, then `STATE.md` (the resume point), then `DECISIONS.md`.
2. Read `SPEC.md` sections the current stage needs (grep, line ranges). `BRIEF.md` is the original prompt; read it when a
   rule here is unclear.
3. Skip `docs/progress.md` and the phase specs: this run is not a roadmap phase.
4. Authority: Michael (DECISIONS.md, quoted) > BRIEF.md > the bible > SPEC.md > other docs > code.

## Hard rules for this run
- Work only in this worktree. `E2E_PORT=4191`. GPU renders on Michael's PC use `E2E_GPU=1`. Never claim a visual
  result that was not rendered on the hardware GPU.
- Do not edit `src/player/characterRig.ts`, `src/anim/*`, or anything `feature/ct-locomotion` touches
  (`git diff --stat origin/ct-movement...origin/feature/ct-locomotion` lists them). Everything here lives in new files.
- `src/player/proportions.ts` is not edited in this run; corrections are proposals in SPEC.md, applied at integration.
- Original design only: no Splinter Cell IP, no three-lens goggle, no real brands, logos, patches or copied products.
  Splinter Cell inspired in feel (D5), original in every shape.
- Every external file (CC0 texture, CC0 base body) is listed with source and licence in `docs/art-credits.md`.
- Phones never download hero or desktop-only assets. No runtime network.
- Babylon only through `src/core/babylon.ts`. Strict TS. Pure logic in Babylon-free modules with Vitest tests. Hot paths
  do not allocate.
- The detail standard (SPEC.md Section 1) is checked against every render before it goes to Michael.
- Decisions go in `DECISIONS.md` (numbered, Michael's words quoted). Never in memory only.
- Questions to Michael use the native multiple-choice UI, recommendation first. Ask only what the docs and decisions do
  not answer. If a hard constraint blocks the realism goal, raise it as a decision; never decide it.

## Stops
- Commit and push `feature/operators` after each stage and at every stop (`git push -u origin feature/operators`).
- Update `STATE.md` at every stop: stage, what is done, what is next, open questions.
- Report in plain English, short: numbered next steps, when to clear, and the full next-session prompt inline in one
  fenced code block.
- The next prompt always comes from `RUNBOOK.md` (the next step's block, given inline with its model). If a step changes the plan, update RUNBOOK.md in the same commit.
- Never merge into `ct-movement`, `dev` or `master`.
