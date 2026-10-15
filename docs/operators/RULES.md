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

## Step loop (workflow, Michael 2026-10-16; overrides each step file's "Finish" and the Chaining text below)
Modelled on the locomotion run (docs/locomotion/RULES.md "Step loop"). Script: `docs/operators/run.workflow.js`.
1. Implement: the step's agent (PLAN.md model and effort) builds, renders on the GPU, runs `npm run operators:check`
   and `npm run check`, drafts the LOG.md record and STATE.md, and returns. It never commits, pushes or sends files.
2. Check: a fresh Opus High checker re-runs `npm run operators:check` and `npm run check`, reads the diff, and reads
   every render PNG with the Read tool against the step file's Checks, the ART-DIRECTION.md render check and SPEC
   Section 1, citing file and view for each verdict. It edits nothing except its fix list
   (`steps/NN-fixes-rN.md`) and returns PASS or a numbered fix list.
3. Up to 3 fix rounds (implement the fix list, check again). Still failing: the step is OPEN (LOG.md, with the last
   fix list as evidence) and the run moves on.
4. Finish (Sonnet): branch guard, LOG.md status line, STATE.md, commit "operators: step NN - <title>" (add "(OPEN)"
   when open), `git push -u origin feature/operators`, confirm clean and not ahead, send Michael the renders and a
   three-line note (SendUserFile, proactive, render).

No hangs, low tokens (every agent):
- Branch guard before any git command that writes: `cd /c/NightShift/Mobile-Coop-operators && test "$(git rev-parse
  --abbrev-ref HEAD)" = feature/operators && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-operators"`.
- Every shell command has a timeout. Anything that may pass 10 minutes (`operators:build --render`, `npm run check`,
  sheets) runs in the background; wait for its notification, never sleep-poll. No dev server, no watch mode.
- A Blender run with no new output for 15 minutes: kill that process by its PID (never every blender.exe; Michael's
  Blender GUI may be open), log it, change approach.
- Same error twice with no progress: stop and return done / left. Logs: tail -40 or grep, never whole.
- Budget: implementers about 100 tool calls, fix rounds and checkers about 60. Over budget: return done / left.
- Port 4191 (the Lab and `operators:sheet` serve their own on E2E_PORT; never start a server for them):
  1. Free it before any Lab, sheet or preview run and before you finish:
     `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4191 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
  2. Check it is free: `netstat -ano | grep ":4191 .*LISTENING"` prints nothing.
  3. "Port 4191 is already in use" means step 1 was skipped: run it and retry once.

## Chaining
**Superseded 2026-10-16:** a session cannot start another session, so steps 05-18 run as one workflow
(`WORKFLOW-PROMPT.md`, "Step loop" above). The workflow chains; step agents start nothing. The text below is history.

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
