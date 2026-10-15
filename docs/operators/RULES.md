# Operators run - rules

Branch `feature/operators`, worktree `C:\NightShift\Mobile-Coop-operators` (cut from `origin/ct-movement`, see DECISIONS S1).
Pre-production only: design, a dev-only viewer, an offline asset pipeline and mockup renders. No game integration.

## Every session
1. Read `CLAUDE.md`, then this file, then `STATE.md` (the resume point), `PLAN.md` and the current step's file in
   `steps/`. Read the `DECISIONS.md` entries the step needs (grep).
2. Read only the files the step file lists (grep, line ranges). `ART-DIRECTION.md` is the look standard beside SPEC 1.
   `BRIEF.md` is the original prompt; read it when a rule here is unclear. History is in `LOG.md`; do not read it
   whole.
3. Skip `docs/progress.md` and the phase specs: this run is not a roadmap phase.
4. Authority: Michael (DECISIONS.md, quoted) > ART-DIRECTION.md > BRIEF.md > the bible > SPEC.md > other docs > code.
5. Stay inside the step: its objective, its files, its checks. Anything else goes into LOG.md as a follow-up.

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

## Unattended run (DECISIONS D15)
- Michael is not watching. Decide within the step file, ART-DIRECTION.md and SPEC; record a judgement call in
  DECISIONS.md as an assumed decision (A1, A2, ...: what, why, how to undo) and carry on.
- Ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint
  blocks the step. Then wait for the answer; do not chain on.
- A check that cannot pass after real effort: write it into LOG.md as open with the evidence, keep the best result and
  carry on (the final review sees the open list). Never weaken a check to pass it.

## Chaining
When the step's checks pass and the work is pushed:
- Progress for Michael (he wants to see every step): send the step's renders, or screenshots for tooling steps, with
  SendUserFile (status proactive, display render) and a three-line note (built, passed, open). It does not wait for
  an answer.
- Then start the next step's session, then end the turn:
- Tool `mcp__ccd_session__start_session` with `initiation: "user_asked"` (Michael asked for the chained run, D15),
  `context: "fresh"`, `cwd: "C:\NightShift\Mobile-Coop-operators"`, `use_worktree: false`, `model` and `effort` from
  PLAN.md for that step (`claude-opus-5-5` or `claude-sonnet-5-5`; `high` or `medium`), `title: "Operators step NN: ..."`,
  `prompt`: that step's block from RUNBOOK.md, verbatim; `background`: one paragraph (the run, the step, D15).
- Never start a step while another session of this run is working: one writer on `feature/operators` at a time.
- If the start is refused or the tool is missing: STOP and give Michael the next prompt inline (model, effort, when to
  clear), as below.
- Step 18 starts nothing: the run ends.

## Stops
- Commit and push `feature/operators` after each stage and at every stop (`git push -u origin feature/operators`).
- Update `STATE.md` at every stop (short: current step, next step, open questions) and append the step's record to
  `LOG.md` (what was built, numbers, open items).
- Report in plain English, short: numbered next steps, when to clear, and the full next-session prompt inline in one
  fenced code block.
- The next prompt always comes from `RUNBOOK.md` (the next step's block, with its model and effort). If a step changes
  the plan, update PLAN.md, the step files and RUNBOOK.md in the same commit.
- Never merge into `ct-movement`, `dev` or `master`.
