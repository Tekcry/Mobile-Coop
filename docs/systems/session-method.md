# How sessions are run (Michael's preferred method)

Michael, 2026-10-16: the orchestrator method is the preferred way to prompt and set up every multi-step job
(runs, phases, map projects, helper sessions, cloud jobs). Proven on the locomotion run (`docs/locomotion/RULES.md`,
"Step loop") and the operators run (`docs/operators/RULES.md`, "Step loop"; `docs/operators/steps/AGENT-PREAMBLE.md`).

## The shape
- **One orchestrator session** (Opus, High effort) per job. It keeps the overview, plans, decides and commits. It
  reads reports, STATE and LOG headings - not source files or renders - so its context stays small for a long run.
- **Subagents do the work** in focused, fresh contexts (Agent tool), each started with a short shared preamble file
  (rules, no-hang limits, budget, report format), its role, its step and the previous step's handover:
  1. **Implementer** (the step's model and effort): builds, runs the checks, drafts LOG / STATE; never commits.
  2. **Checker** (a fresh Opus High agent): re-runs the checks, reads the diff and every render, returns PASS or a
     numbered fix list written to a file, ranked by impact, with "done looks like" for each item.
  3. **Fixer** rounds (up to 3), each followed by a fresh checker. Still failing: the step is OPEN with the evidence
     logged, and the run moves on. Block ends retry OPEN steps once.
  4. **Orchestrator finish:** branch guard, LOG status line, STATE next step, path-limited commit, push, send Michael
     the renders or screenshots, start the next step at once.
- **Read-only work runs in parallel** (survey / explore agents, option renders in scratch); **one code-changing agent
  at a time** per branch.
- **Multi-phase jobs** (survey, design, build, independent review, handover) use the same pattern: parallel read-only
  survey agents, one design agent reviewed by the orchestrator, build agents, a fresh reviewer, then the orchestrator
  writes the handover.

## The docs every job keeps in git (knowledge is never only in chat or memory: Michael swaps accounts)
`BRIEF.md` (the original ask), `RULES.md` (how the job runs), `PLAN.md` (steps, models, effort), `STATE.md` (the
resume point), `DECISIONS.md` (Michael's words quoted; assumed decisions A1, A2, ... with how to undo), `LOG.md`
(per step: built, numbers, open items, status line), `OWNER-NOTES.md` (setup, prompts Michael uses), one file per step,
and a subagent preamble.

## Prompts
- A **start prompt** and a one-line **resume prompt** ("<job>: RESUME"), both in OWNER-NOTES.md and given to Michael
  inline in one fenced block, self-contained, with the model, effort and when to clear.
- Location and branch guard first (worktree path, branch, upstream), then what to read, then the loop, then the finish.
- Never a scripted Workflow unless Michael asks for one (the operators run tried one and moved back to an
  orchestrator session, D18).

## Working with Michael during a run
- Unattended by default: assumed decisions are recorded and the run carries on; ask (native multiple-choice) only
  before installing or downloading, or when a hard constraint blocks the goal.
- Progress renders are sent as they are made, and when a checker starts reviewing them.
- For a look decision, render options in scratch first and let Michael pick, then build the pick.
- Helper sessions run in their own worktree and branch, new files only; the orchestrator merges them between steps.
  Cloud sessions do no GPU work: unit tests, logic e2e and design only, every visual check "pending PC run".
