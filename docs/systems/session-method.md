# How a job is run (the job lead's loop)

The rules for sessions, jobs, machines, merges and the test tiers are in CLAUDE.md "Sessions" (process audit,
2026-10-19). This page is the detail of the loop a **job lead** (the session running one job) follows (G87). Proven on
the locomotion, operators and weapons runs; the bible's old Opus-writes / Sonnet-builds loop and Kestrel's planner /
stage method are history.

## Prototype first (G4, G87)
- Build only the basics needed to make the feature work and test it: no hours of tuning on things that may not be used.
- Michael plays or looks at it and decides; numbers are starting values until then (G10).
- For a look decision, render options in scratch first and let Michael pick, then build the pick.

## The loop
- The job lead keeps the overview, plans, decides and commits. It reads reports, STATE and LOG headings, not source
  files or renders, so its context stays small for a long run.
- Subagents do the work in fresh contexts (Agent tool), each started from `docs/systems/agent-preamble.md`, its role,
  its step and the previous step's handover:
  1. **Implementer:** builds, runs the step's checks (the test tiers), drafts the STATE update; never commits.
  2. **Checker** (a fresh Opus agent): re-runs the checks, reads the diff and every render, returns PASS or a numbered
     fix list ranked by impact, with "done looks like" for each item. While the current goal holds it blocks only on
     broken or unplayable work; cosmetic notes go on the job's polish list.
  3. **One fix round** per slice while the current goal holds (CLAUDE.md), followed by a fresh checker. Still failing:
     the step is OPEN with the evidence written down, and the job moves on.
  4. **Job lead finish:** branch guard, STATE (now, next, done list), path-limited commit, push, renders or
     screenshots to Michael, a message to the orchestrator, then the next step.
- Read-only work runs in parallel (survey agents, option renders in scratch); one code-changing agent at a time per
  branch, or several on disjoint files when the plan says so.
- Multi-phase jobs (survey, design, build, independent review, handover) use the same pattern.
- Never a scripted Workflow unless Michael asks for one (ops D18).

## Prompts
- A start prompt and a one-line resume prompt ("<job>: RESUME"), both in the job's `STATE.md` and given to Michael
  inline in one fenced block, self-contained, with the model, effort and when to clear.
- Location and branch guard first (folder, branch, upstream), then what to read, then the loop, then the finish.

## Working with Michael during a job
- Unattended by default (CLAUDE.md "A job").
- Progress renders are sent as they are made, and when a checker starts reviewing them.
- Helper sessions run in their own folder and branch, new files only; the job lead merges them between steps.
