# How a job is run

Michael's method for every multi-step job (code, maps, audio, art, research, helper and cloud sessions): a quick
prototype first when the job needs a feel or look decision, then the orchestrator method (G87). Proven on the
locomotion run (`docs/locomotion/RULES.md`, "Step loop") and the consolidation (`docs/consolidation/`). The bible's old
Opus-writes / Sonnet-builds loop and Kestrel's planner / stage method are history. Branch, folder, port and finish
rules: `CLAUDE.md`, "Running a job".

## Prototype first (G4, G87)
- Build only the basics needed to make the feature work and test it: no hours of tuning on things that may not be used.
- Michael plays or looks at it and decides; numbers are starting values until then (G10). Refinement comes after,
  through the orchestrator loop.

## The orchestrator loop
- **One orchestrator session** (Opus, High effort) per job. It keeps the overview, plans, decides and commits. It
  reads reports, STATE and LOG headings - not source files or renders - so its context stays small for a long run.
- **Subagents do the work** in focused, fresh contexts (Agent tool), each started with a short shared preamble file
  (branch guard, rules, no-hang limits, budget, report format), its role, its step and the previous step's handover:
  1. **Implementer:** builds, runs the checks, drafts LOG / STATE; never commits.
  2. **Checker** (a fresh Opus agent): re-runs the checks, reads the diff and every render, returns PASS or a numbered
     fix list written to a file, ranked by impact, with "done looks like" for each item.
  3. **Fixer** rounds (up to 3), each followed by a fresh checker. Still failing: the step is OPEN with the evidence
     logged, and the job moves on. Block ends retry OPEN steps once.
  4. **Orchestrator finish:** branch guard, LOG status line, STATE next step, path-limited commit, push, send Michael
     the renders or screenshots, start the next step at once.
- **Models (G88):** Opus builds and checks; a lighter model only for mechanical chores (renames, data files, closed edits).
- **Read-only work runs in parallel** (survey / explore agents, option renders in scratch); **one code-changing agent
  at a time** per branch, or several on disjoint files when the plan says so.
- **Multi-phase jobs** (survey, design, build, independent review, handover) use the same pattern: parallel read-only
  survey agents, one design agent reviewed by the orchestrator, build agents, a fresh reviewer, then the orchestrator
  writes the handover.

## The docs every job keeps in git (knowledge is never only in chat or memory: Michael swaps accounts)
In `docs/<job>/`: `BRIEF.md` (the original ask), `RULES.md` (how the job runs: folder, branch, guard, ports), `PLAN.md`
(steps, models, effort), `STATE.md` (the resume point), `DECISIONS.md` (Michael's words quoted; assumed decisions A1,
A2, ... with how to undo; cite them with the job name outside the job), `LOG.md` (per step: built, numbers, open items,
status line), `OWNER-NOTES.md` (setup, prompts Michael uses), one file per step, and a subagent preamble.
At the merge Michael's answers move to `docs/DECISIONS.md` with the next free G numbers (G89); the job's own files stay
as history and point there.

## Prompts
- A **start prompt** and a one-line **resume prompt** ("<job>: RESUME"), both in OWNER-NOTES.md and given to Michael
  inline in one fenced block, self-contained, with the model, effort and when to clear.
- Location and branch guard first (folder, branch, upstream), then what to read, then the loop, then the finish.
- Never a scripted Workflow unless Michael asks for one.

## Working with Michael during a job
- Unattended by default: assumed decisions are recorded and the job carries on; ask (native multiple choice) only
  before installing or downloading, or when a hard rule blocks the goal.
- Progress renders are sent as they are made, and when a checker starts reviewing them.
- For a look decision, render options in scratch first and let Michael pick, then build the pick.
- Helper sessions run in their own folder and branch, new files only; the orchestrator merges them between steps.
  Cloud sessions do no GPU work: unit tests, logic e2e and design only, every visual check "pending PC run".
