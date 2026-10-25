# Boot (per session title)

Every boot line in PROMPTS.md ends here. Read the common start, then only your own title's section. Owner: the
orchestrator; a lead whose resume location changes tells it in its next message.

## Common start (every job session)
1. You already set your title. `git fetch` in your worktree.
2. Read docs/RULES.md and docs/VISION.md from origin/master (`git show origin/master:docs/RULES.md`,
   `git show origin/master:docs/VISION.md`), never a branch copy.
3. Read your resume block (your section says where; at most ~40 lines; follow its file:line pointers only), your row
   in ROADMAP "Now" and your area's walk-cap count in "Waiting on Michael"
   (`git show origin/feature/menu:docs/ROADMAP.md | grep ...`).
4. Until Michael signs off the folded plan (ROADMAP Now row 6), your first job is your conformance review
   (`docs/orchestrator/review-briefs/<lead>.md` on origin/feature/menu: `player`, `marlow`, `campaign`, `sector-ops`,
   `guard-ai`, `test-runner`); no new game work (G346, G355); finished PRs may ship. The review is plan only: no src, test, map,
   script or config change; output a docs PR with `docs/conformance-<lead>/CONFORMANCE.md` and a checker (ROADMAP Now
   phase 1).
5. Refresh your resume block to <= 40 lines with the docs-first hold and fix its pointers (`CLAUDE.md "Sessions"` ->
   docs/RULES.md), and commit `git checkout origin/master -- CLAUDE.md` on your branch so its auto-loaded CLAUDE.md is
   the current stub.
6. Walk cap, train-ready and locks: RULES "Walk pacing" (the cap limits switch-on only, G355), "Getting to master",
   "Machines"; never restate them in a resume block. Turn off unused connectors (Gmail, Google Drive, Fergus).

Message "Night Shift | Orchestrator" only at PR open / train-ready / blocked / needs Michael.

## Orchestrator
- Opus 5.5, high, desktop. Worktree C:/NightShift/Mobile-Coop-menu, branch feature/menu (`git pull`).
- Resume: HANDOFF.md "State at the switch", then STATE.md ("Now", "Known", "How Michael works"); the plan:
  ROADMAP "Now" (FORWARD-PLAN.md: what to close, open PRs, Michael's walks and questions).
- First: check `C:/NightShift/heavy.lock` / `heavy2.lock` (RULES "Machines"); stop tail / grep watchers older than the swap (STATE
  "Known"); recreate the cron from STATE "Cron prompt"; `get_usage`; read `C:/NightShift/scratch/auto-train-status.json`
  and act on failed / stale / error; reopen any cloud-queue brief still claimed by an old Cloud Builder.
- Then START the four desktop leads (Player, Marlow, Sector Ops, Campaign; PROMPTS.md lines 2-5) and one Cloud Builder
  (line 8) yourself with start_session (initiation user_asked: Michael ~12:50, "automate as much as possible"), each
  with its boot line as the prompt; give Michael only the two laptop boot lines (Guard AI, Test Runner; lines 6-7) in
  one message (title, model, effort, machine each), as the last thing in that message. Check ListAgents that all come
  up under their titles.
- Standing work: ROADMAP phase 0 (land #407, #400, #408; ship finished PRs), fold the six gap lists (row 6), walk card
  per release, bottleneck audits (cron), daily fold of Decided into docs/DECISIONS.md.

## Player Build
- Opus 5.5, high, desktop.
- Resume: the "Resume prompt" block of `docs/orchestrator/resume-ct-core.md` on origin/feature/menu (working copy
  C:/NightShift/scratch/ctcore/, pushed with scratch/ctcore/push-resume.sh). Jobs: `docs/coop-real/STATE.md` on
  origin/feature/coop-real; `docs/guard-models/STATE.md` on origin/feature/gm-flip (#375).
- Worktrees: C:/NightShift/Mobile-Coop-<job> per job (coop-real, coop-real-c2, gm-flip, gm-look, gm-polish,
  client-intel, player-batch-25); the conformance review in its own (C:/NightShift/Mobile-Coop-conformance-player).
- First job: review-briefs/player.md. Area: movement, mocap, animation, takedowns, guard models, co-op player.

## Marlow Build
- Opus 5.5, high, desktop.
- Resume: the last fenced block of `docs/marlow-final/STATE.md` on origin/feature/marlow-final. Other jobs:
  level-validator `docs/level-validator/STATE.md` on origin/feature/level-validator (on master after #407:
  `docs/archive/level-validator/STATE.md`); V6 on origin/feature/level-validator-v6 (same path); route-runs
  `docs/route-runs/STATE.md` on origin/feature/route-runs; guard-cap `docs/guard-cap/STATE.md` on origin/feature/guard-cap.
- Worktrees: C:/NightShift/Mobile-Coop-<job> per job (marlow-final, level-validator, level-validator-v6, route-runs,
  guard-cap); the conformance review in its own (C:/NightShift/Mobile-Coop-conformance-marlow).
- First job: review-briefs/marlow.md. Area: Marlow Yard, level validator, route-runs, guard cap.

## Campaign Build
- Opus 5.5, high, desktop (new 2026-10-25 ~12:50; takes the campaign work from Marlow Build).
- Resume: `docs/missions/STATE.md` on origin/feature/mission-framework (newest SAVE; engine WIP on
  origin/feature/mission-engine, same path).
- Worktrees: C:/NightShift/Mobile-Coop-<job> per job (mission-framework, mission-engine); the conformance review in its
  own (C:/NightShift/Mobile-Coop-conformance-campaign).
- First job: review-briefs/campaign.md. Area: Tallow Wharf, mission framework / engine (`docs/missions/`), campaign
  rules (strict rules, objective popup on View / O, compass / blip / maps removal: G336, G339, G343, G351).

## Sector Ops Build
- Opus 5.5, high, desktop.
- Resume: the last fenced block of `docs/sector-redesign/STATE.md` on origin/feature/sector-redesign-polish; campus
  greybox `docs/campus-greybox/STATE.md` on origin/feature/campus-greybox; visual-gate `docs/visual-gate/STATE.md` on
  origin/feature/visual-gate; light-realism has no STATE yet (scripts/light-realism/ on origin/feature/light-realism).
- Jobs: campus-greybox (S1-S5 lanes, ROADMAP Now 9), light-realism (lux bands, Now 10), visual-gate; worktrees
  C:/NightShift/Mobile-Coop-campus-greybox, -light-realism, -visual-gate, -sector-redesign-polish; the conformance review in
  C:/NightShift/Mobile-Coop-conformance-sector-ops.
- First job: review-briefs/sector-ops.md. Area: Sector Ops (Saltmarsh Park, campusOps), lighting on every map, visual
  gate.

## Test Runner
- Opus 5.5, medium, laptop.
- Resume: the newest "Test Runner SAVE" block near the top of `docs/flake-fix/STATE.md` on origin/feature/flake-fix;
  laptop-queue-5 (#408): `docs/laptop-queue/STATE.md` on origin/feature/laptop-queue-5.
- First: check the laptop queue service (task NightShift-laptop-queue, log C:/NightShift/scratch/laptop-queue/), the
  laptop locks and runs left from the old account; if two Test Runner sessions show in ListAgents, close the older.
- First job: review-briefs/test-runner.md. Area: the laptop queue, flakes and the flake budget, guard render. Keep
  laptop CPU under ~80% (shared with Guard AI); message the orchestrator only on a train failure or when blocked.

## Guard AI Build
- Opus 5.5, high, laptop.
- Resume: the last fenced block of `docs/guard-ai/STATE.md` on origin/feature/guard-ai (worktree
  C:/NightShift/Mobile-Coop-guard-ai on the laptop: create it with git worktree add if missing, npm ci once).
- First job: review-briefs/guard-ai.md. Area: `src/ai` on every map, coop4 (#317, worktree
  C:/NightShift/Mobile-Coop-coop4). e2e only through the laptop queue; AI code and its two checkers stay Opus. At
  train-ready tell the orchestrator (RULES "Getting to master").

## Cloud Builder
- Model as the orchestrator starts it (one per swap; PROMPTS.md line 8); cloud (claude.ai/code on
  Tekcry/Mobile-Coop). Cannot message other sessions: git is the output. No conformance review: its briefs come only from the cloud-queue README.
- Read `docs/systems/agent-preamble.md` (origin/master), then README.md on the orphan branch cloud-queue
  (`git fetch origin cloud-queue; git show origin/cloud-queue:README.md`) and run its "Cloud builders" loop until the
  session ends: claim the oldest open brief, build it, unit tests only, commit and push each sub-step on the brief's
  branch, mark it done or blocked. Resume a reopened brief from its branch head if ahead of the brief base. Every GPU
  check is "pending PC run".
