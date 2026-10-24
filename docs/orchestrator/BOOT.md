# Boot (per session title)

Every boot line in PROMPTS.md ends here. Read the common start, then only your own title's section. Rules are
CLAUDE.md "Sessions" on origin/master (`git show origin/master:CLAUDE.md`), never a branch copy. Owner of this file:
the orchestrator; a lead whose resume location changes tells it in its next message.

## Common start (every job session)
1. You already set your title. `git fetch` in your worktree.
2. Read your resume block (the place your section names). It is at most ~40 lines; follow its file:line pointers only.
3. Read only the ROADMAP entries your resume block names (`git show origin/feature/menu:docs/ROADMAP.md | grep ...`),
   plus your row in ROADMAP "Now" and your area's walk-cap count in "Waiting on Michael".
4. Locks: a `heavy.lock` / `heavy2.lock` naming you with no live process of yours is stale: release it. Never delete
   another session's lock.
5. Turn off unused connectors (Gmail, Google Drive, Fergus) and plugins.
6. Carry on from the resume block's "Now", top down.

Rules pointers (CLAUDE.md "Sessions"): Intake (plan checker, visual sign-off, level validator); Walk pacing (cap 3);
A job (model split, agents commit each sub-step, PRs under ~1.5k lines / ~4 h, flags with owner + switch-on date,
`checker` commit status, never merge master); Getting to master (train-ready label); Test tiers; Machines (laptop
queue requests, locks); Swaps and context; Talking to Michael. Message "Night Shift | Orchestrator" only at PR open /
train-ready / blocked / needs Michael.

## Orchestrator
- Opus 5.5, high, desktop. Worktree C:/NightShift/Mobile-Coop-menu, branch feature/menu (`git pull`).
- Resume: HANDOFF.md "State at the switch", then STATE.md ("Now", "Known", "How Michael works").
- First: check `C:/NightShift/heavy.lock` / `heavy2.lock` (no live node / dead pid = stale: ask Michael before deleting
  another session's lock); stop tail / grep watchers older than the swap (STATE "Known"); recreate the cron with STATE
  "Cron prompt"; `get_usage`; read `C:/NightShift/scratch/auto-train-status.json` and act on failed / stale / error;
  reopen any cloud-queue brief still claimed by an old Cloud Builder.
- Then print boot lines 2-7 from PROMPTS.md in one message (title, model, effort, machine each), as the last thing in
  that message, and check ListAgents that all come up under their titles.
- Standing work: ROADMAP (Inbox triage, Now ranking, Waiting with ages, walk-cap counts, Decided today only), walk card
  per release, bottleneck audits (cron), daily fold of Decided into docs/DECISIONS.md (docs PR to master), the four
  process-audit packages (ROADMAP Now 3-6).

## Player Build
- Opus 5.5, medium, desktop.
- Resume: the "Resume prompt" block of `docs/orchestrator/resume-ct-core.md` on origin/feature/menu
  (`git show origin/feature/menu:docs/orchestrator/resume-ct-core.md`; working copy C:/NightShift/scratch/ctcore/,
  pushed with scratch/ctcore/push-resume.sh), then its "Now" table.
- Area: movement, mocap, animation, takedowns, guard models, co-op player work (coop-real). Animation is at the walk
  cap: no new animation features until Michael walks AF0-AF6; every animation PR carries a 1-2 min look video path.

## Marlow Build
- Opus 5.5, medium, desktop.
- Resume: the last fenced block of `docs/marlow-final/STATE.md` on origin/feature/marlow-final; it names the current
  job's resume block (level-validator: `docs/level-validator/STATE.md` on origin/feature/level-validator; guard-cap:
  `docs/guard-cap/STATE.md` on origin/feature/guard-cap).
- Area: Marlow Yard, section rating, level validator, guard cap. campus-audit stays paused unless Michael asks.

## Sector Ops Build
- Opus 5.5, high, desktop.
- Resume: the last fenced block of `docs/sector-redesign/STATE.md` on origin/feature/sector-redesign-polish (worktree
  C:/NightShift/Mobile-Coop-sector-redesign-polish); visual-gate keeps its own STATE once planned.
- Area: Sector Ops (Saltmarsh Park, map campusOps), lighting on every map, visual gate. No campus S1-S3 layout change
  until the level validator lands, Michael's campus walk notes are in, and he signs off the to-scale plan.

## Test Runner
- Opus 5.5, medium, laptop.
- Resume: the newest "Test Runner SAVE" block at the top of `docs/flake-fix/STATE.md` on origin/feature/flake-fix
  (the last fenced block there points to it).
- First: check the laptop queue service (task NightShift-laptop-queue, log C:/NightShift/scratch/laptop-queue/), the
  laptop locks and runs left from the old account. If two Test Runner sessions show in ListAgents, close the older one.
- Area: the laptop queue (trains first and alone, then PR requests, then slot-alone measures right after a release),
  flakes (owner fixes, flake budget job next), guard render. Guard AI shares the laptop: keep CPU under ~80%. Verdicts
  are GitHub statuses / PR comments; message the orchestrator only on a train failure or when blocked.

## Guard AI Build
- Opus 5.5, high, laptop.
- Resume: the last fenced block of `docs/guard-ai/STATE.md` on origin/feature/guard-ai (worktree
  C:/NightShift/Mobile-Coop-guard-ai on the laptop: create it with git worktree add if missing, npm ci once).
- Area: `src/ai` on every map, coop4 (#317, worktree C:/NightShift/Mobile-Coop-coop4). e2e only through the laptop
  queue; tsc / vitest agents keep laptop CPU under ~80%. AI code and its two checkers stay Opus. Laptop auto mode
  blocks the train-ready label: tell the orchestrator at train-ready.

## Cloud Builder
- Model as Michael starts it; cloud (claude.ai/code on Tekcry/Mobile-Coop). Cannot message other sessions: git is the
  output.
- Read `docs/systems/agent-preamble.md` (origin/master), then README.md on the orphan branch cloud-queue
  (`git fetch origin cloud-queue; git show origin/cloud-queue:README.md`) and run its "Cloud builders" loop until the
  session ends: claim the oldest open brief, build it (independent briefs in parallel with your own agents), unit tests
  only, commit and push each sub-step on the brief's branch, mark it done or blocked. A reopened brief may have WIP on
  its branch from the previous builder: resume from that head if it is ahead of the brief base. Every GPU check is
  "pending PC run".
