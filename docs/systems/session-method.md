# How a job is run (the job lead's loop)

The rules for sessions, jobs, machines, merges and the test tiers are in CLAUDE.md "Sessions" (process audit,
2026-10-19). This page is the detail of the loop a **job lead** (the session running one job) follows (G87). Proven on
the locomotion, operators and weapons runs; the bible's old Opus-writes / Sonnet-builds loop and Kestrel's planner /
stage method are history.

## Prototype first (G4, G87)
- Build only the basics needed to make the feature work and test it: no hours of tuning on things that may not be used.
- Michael plays or looks at it and decides; numbers are starting values until then (G10).
- For a look decision, render options in scratch first and let Michael pick, then build the pick.

## Intake: Michael's words to a build (Michael 2026-10-24 ~21:50, "Intake gates + small PRs")
Process audit 2026-10-24 findings 2, 3 and 10: intent was checked too late, work outran Michael's walks, and big-bang
branches could not be reviewed. Every new job, and every new phase of a job, goes through these gates in order; the
templates are in `docs/templates/`.

1. **BRIEF** (`docs/<job>/BRIEF.md` from `docs/templates/brief.md`):
   - **Michael said**: his words verbatim, with the time and where (chat, walk note). Never the orchestrator's paraphrase.
   - **Michael picked**: the exact option text of each multiple-choice answer he clicked, apart from what he said.
   - Goal, limits (what is out of scope, which rules hold), and assumptions A1, A2, ..., each with how to undo it.
   - An assumption that touches a rule only Michael may change (CLAUDE.md "Current goal" and hard rules, the level
     standard, DECISIONS, scope he set) is not assumed: it becomes a one-click question to Michael by day (native
     multiple choice, through the orchestrator). At night the rule as written stands and that part of the job waits.
2. **PLAN** (`docs/<job>/PLAN.md` from `docs/templates/plan.md`): slices, each with files, checks and "done looks like",
   and a **claims block** (fenced ` ```claims `): the files / globs, maps, PROTOCOL (wire) messages and save shape the
   job changes. The lead commits BRIEF + PLAN and pushes before the checker starts.
3. **Plan checker**: a fresh Opus agent with `docs/templates/plan-check.md`. It checks intent against Michael's words
   (said and picked, not the lead's summary), the gates (current goal, hard rules, Michael-only rules, flags), the claims
   against every other open branch (`node scripts/claims-check.mjs --plan docs/<job>/PLAN.md --name feature/<job>`), and
   slice sizes. Verdict PASS or FIX in `docs/<job>/PLAN-CHECK.md`. FIX: one revision of the PLAN, then a fresh checker;
   still FIX goes to the orchestrator. A claims overlap is settled by the orchestrator (order the jobs, split the files
   or hand one job the files) before build.
4. **Sign-off for maps and looks** (a new map or section, a layout change, a new look: lighting, art direction, a
   character, HUD art): a one-page `docs/<job>/SIGNOFF.md` from `docs/templates/signoff.md`, with a to-scale plan image
   (or the look render), a 5-line intent check and ONE decision for Michael to click. No greybox, detail art or look
   build starts until he clicks it. Other jobs skip this gate.
5. **Build**: the loop below, slice by slice.

**Slice size.** Each PR is at most ~1.5k changed lines (generated assets, snapshots, lockfiles and docs not counted) or
~4 h of work, whichever comes first. CI enforces the line cap (`scripts/pr-size.mjs`, the `pr-size` job inside `check`):
over it, the PR fails unless the orchestrator adds the `big-pr` label (train PRs and docs-only PRs are exempt).
Unfinished work ships dark behind a flag (a URL query or a config switch, off by default), each flag listed in the PLAN
with an owner and a switch-on date; the lead switches it on once its slices pass and Michael's walk accepts it.

**Walk pacing (cap 3 + walk card).** At most 3 unwalked features per area (Marlow, Sector Ops, AI, player / anim,
co-op, UI, ...). An area at 3 starts no new feature until Michael walks it; its leads work on fixes, tests or another
area. Each release gets a walk card (`docs/walks/<version>.md` from `docs/templates/walk-card.md`): <= 10 minutes,
items ranked by risk, each with its menu path, what to look for, the look video or shot path and the acceptance line,
plus the unwalked-features count per area. An item Michael accepts switches its flag on; a rejection becomes a fix
slice.

## The loop
- The job lead keeps the overview, plans, decides and commits. It reads reports, STATE and LOG headings, not source
  files or renders, so its context stays small for a long run.
- Subagents do the work in fresh contexts (Agent tool), each started from `docs/systems/agent-preamble.md`, its role,
  its step and the previous step's handover:
  1. **Implementer:** builds, runs the step's checks (the test tiers), drafts the STATE update; never commits.
  2. **Checker** (a fresh Opus agent): re-runs the checks, reads the diff and every render, returns PASS or a numbered
     fix list ranked by impact, with "done looks like" for each item. While the current goal holds it blocks only on
     broken or unplayable work; cosmetic notes go on the job's polish list.
     The checker posts its verdict as a `checker` commit status on the commit it reviewed (the PR head):
     `gh api repos/{owner}/{repo}/statuses/<sha> -f state=success|failure -f context=checker -f description="<model> PASS|FIX"`
     (e.g. `description="Opus 5.5 PASS"`). The status is what labels and trains read; a new commit has none until its
     checker posts again.
  3. **One fix round** per slice while the current goal holds (CLAUDE.md), followed by a fresh checker. Still failing:
     the slice is marked OPEN in STATE with the evidence written down (its status stays `failure`), and the lead moves
     on to the next slice.
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
