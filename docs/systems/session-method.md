# How a job is run (the job lead's loop)

The rules for sessions, jobs, intake, walk pacing, machines, merges and the test tiers are in `docs/RULES.md` (read it
from origin/master). This page is the how-to of the loop a **job lead** (the session running one job) follows (G87):
templates, commands and roles. Where it seems to disagree with `docs/RULES.md`, RULES.md wins and this page is fixed.

## Prototype first (G4, G87)
- Build only the basics needed to make the feature work and test it: no hours of tuning on things that may not be used.
- Michael plays or looks at it and decides; numbers are starting values until then (G10).
- For a look decision, render options in scratch first and let Michael pick, then build the pick.

## Intake detail (the gates: `docs/RULES.md` "Intake")
Every new job, and every new phase of a job, goes through the gates in order; the templates are in `docs/templates/`.
1. **BRIEF**: `docs/<job>/BRIEF.md` from `docs/templates/brief.md`. "Michael said" is his words verbatim with the time
   and where (chat, walk note), never the orchestrator's paraphrase; "Michael picked" is the exact option text he
   clicked. Then goal, limits and assumptions A1, A2, ... with how to undo each. A question that loosens a Michael-only
   rule goes to him through the orchestrator by day; at night the rule as written stands and that part waits.
2. **PLAN**: `docs/<job>/PLAN.md` from `docs/templates/plan.md`: slices, each with files, checks and "done looks like",
   and a **claims block** (fenced ` ```claims `): the files / globs, maps, PROTOCOL (wire) messages and save shape the
   job changes. The lead commits BRIEF + PLAN and pushes before the checker starts.
3. **Plan checker**: a fresh Opus agent with `docs/templates/plan-check.md`; claims against every other open branch:
   `node scripts/claims-check.mjs --plan docs/<job>/PLAN.md --name feature/<job>`. Verdict PASS or FIX in
   `docs/<job>/PLAN-CHECK.md`. FIX: one revision of the PLAN, then a fresh checker; still FIX goes to the orchestrator.
   A claims overlap is settled by the orchestrator (order the jobs, split the files or hand one job the files) before
   build. Slice branches of one job never overlap each other, and shared files (changelog fragments, package files,
   STATE / HANDOFF, ROADMAP) never overlap.
4. **Sign-off for maps and looks**: a one-page `docs/<job>/SIGNOFF.md` from `docs/templates/signoff.md`, with a
   to-scale plan image (or the look render), a 5-line intent check and ONE decision for Michael to click.
5. **Build**: the loop below, slice by slice.

**Slice size.** The cap is in `docs/RULES.md` "A job" (generated assets, baked data, snapshots, lockfiles and docs not
counted). CI enforces the line cap (`scripts/pr-size.mjs`, the `pr-size` job inside `check`): over it, the PR fails
unless the orchestrator adds the `big-pr` label (train PRs and docs-only PRs are exempt). Each flag is listed in the
PLAN with an owner and a switch-on date.

**Walk card** (the cap: `docs/RULES.md` "Walk pacing"). `docs/walks/<version>.md` from `docs/templates/walk-card.md`:
<= 10 minutes, items ranked by risk, each with its menu path, what to look for, the look video or shot path and the
acceptance line, plus the unwalked-features count per area (Player / animation, Marlow Yard, Sector Ops, Guard AI,
lighting). An item Michael accepts switches its flag on; a rejection becomes a fix slice.

## The loop
- The job lead keeps the overview, plans and decides. It reads reports, STATE and LOG headings, not source files or
  renders, so its context stays small for a long run.
- Subagents do the work in fresh contexts (Agent tool), each started from `docs/systems/agent-preamble.md`, its role,
  its step and the previous step's handover:
  1. **Implementer:** builds, runs the step's checks (the test tiers), commits and pushes each finished sub-step on its
     branch (path-limited), and drafts the STATE update.
  2. **Checker** (a fresh agent, model per `docs/RULES.md` "A job"): re-runs the checks, reads the diff and every
     render, returns PASS or a numbered fix list ranked by impact, with "done looks like" for each item. It blocks on
     broken, unplayable or off-intent work; cosmetic notes go on the job's polish list. It posts its verdict as the
     `checker` commit status on the head it reviewed, with the command in `docs/RULES.md` "A job". A new commit has no
     verdict until its checker posts again.
  3. **At most one fix round** per slice unless the work is broken, then a fresh checker. Still failing: the slice is
     marked OPEN in STATE with the evidence written down (its status stays `failure`), and the lead moves on.
  4. **Job lead finish:** branch guard, STATE (now, next, done list), path-limited commit, push, renders or screenshots
     to Michael, then the next step. Message the orchestrator only when a PR opens or is train-ready, when blocked, or
     when Michael is needed (G305).
- Independent slices run in parallel, each agent in its own worktree and branch (`feature/<job>-<slice>`), never on the
  same files; the lead merges them. Read-only work (survey agents, option renders in scratch) runs in parallel too.
- Multi-phase jobs (survey, design, build, independent review, handover) use the same pattern.
- Never a scripted Workflow unless Michael asks for one (ops D18).

## Prompts and resuming
- Boot lines live in `docs/orchestrator/PROMPTS.md` and the per-title start in `docs/orchestrator/BOOT.md` (both on
  origin/feature/menu, the orchestrator's); a lead never hands Michael its own resume prompt.
- A session resumes from its job's `STATE.md` resume block on origin: location and branch guard first (folder, branch,
  upstream), then what to read, then the loop, then the finish.

## Working with Michael during a job
- Unattended by default (`docs/RULES.md` "A job").
- Progress renders are sent as they are made, and when a checker starts reviewing them.
- Helper sessions run in their own folder and branch, new files only; the job lead merges them between steps.
