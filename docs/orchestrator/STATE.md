# Orchestrator - state (current only)

Rules: CLAUDE.md "Sessions" on origin/master. Start: docs/orchestrator/BOOT.md "Orchestrator". Cross-session state at a
swap: HANDOFF.md (newest block). History (old Master lines, Pacing, Sessions, merge procedure, Now log, resume prompt):
archive/STATE-history.md. Keep this file current, not appended: replace a line when it changes.

## Now (2026-10-24 ~23:30)
- OVERNIGHT on one account (Michael ~23:30): no swap; full burn to the cap each 5-hour window, save at ~92%, resume at
  each reset (5-hour resets 2026-10-25 04:10: one-shot cron 04:13 + the 10-min cron). Weekly 17% (resets 2026-10-28).
- Master 4.98.1 (train 68 #354). Train 69 #358 (4.98.2 = #357 fog2) and train 70 #359 (4.98.3 = #353 release path):
  CI + laptop pending. #317 coop4 fix3 52e3dc13 on the laptop.
- Process audit packages (PROCESS-AUDIT-2026-10-24.md, approved ~21:50) are PRs: #347 rulebook + docs/lean-orchestrator
  (fix round 3; merge lean into feature/menu after #347 releases), #349 swap tools and #351 intake gates (fix round 2),
  #350 watchdog (status check), #353 release path (train 70). Running orchestrator agents: HANDOFF newest block.
- mission-framework (Marlow lead, PLAN d80cb783, wave 1; ROADMAP Now 3); campus S1-S5 planned against it (Sector Ops).
- Disk: C: hit 0 GB ~22:40; free-disk.ps1 in the orchestrator scratchpad removes idle clean worktrees (Michael ~22:55);
  scratch copies wait for Michael.
- Walk cap: every area is at the cap (ROADMAP "Waiting on Michael"); leads at the cap take tests / fixes / automation.
  Next walk card goes out with the next release.
- Auto-train: scheduled task "NightShift auto-train" every 1 min from C:/NightShift/Mobile-Coop-autotrain (a master
  checkout that self-updates); status C:/NightShift/scratch/auto-train-status.json, log scratch/runs/auto-train.log.
- Laptop queue: task NightShift-laptop-queue (laptop) and NightShift-desktop-queue (desktop overflow, CPU 80 gates),
  both following origin/master; log C:/NightShift/scratch/laptop-queue/.
- Cloud: Cloud Builder 1 on the orphan branch cloud-queue; leads keep 1-2 briefs open.
- Worktrees: this session C:/NightShift/Mobile-Coop-menu (feature/menu); trains C:/NightShift/Mobile-Coop-train.

## Known
- 2026-10-25 04:31 waste audit (capped gap 00:20-04:10): ~170 min of pipeline lost because 4 PRs green by 00:34 / laptop-done by 01:24 were labelled only at 04:16, and the laptop (171 min) and desktop 4192 (159 min) idled with 0 requests queued. RULE at every ~92% save: (1) the orchestrator runs its independent Opus re-check on every PR whose lead checker passed and labels train-ready on CI `check` + `checker` alone (the train's laptop run covers the rest; leads cannot self-post `checker`, auto mode blocks it); (2) Test Runner queues ~3 h of session-free laptop / desktop work (full master e2e, soaks, alone A/B, guard-cap repeats) before the cap; (3) leads restart Cloud Builder briefs so it has 3+ open.
- At each swap: stop tail / grep watchers older than the swap:
  `Get-CimInstance Win32_Process -Filter "Name='tail.exe' OR Name='grep.exe'" | Where-Object { $_.CreationDate -lt (Get-Date '<swap time>') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`.
- A lock with no live node process (or a dead pid) is stale: ask Michael before deleting another session's lock.
- If a laptop session is missing from ListAgents (Remote Control bridge drop), tell Michael in one line to reopen it;
  the queue service keeps running without it.
- On Windows a "stopped" background runner can survive: `taskkill /T /F` on its PID and confirm the tree is gone.
- After a release CI failure: fix on train/<n>, wait for CI, then
  `node scripts/merge-train.mjs release <n> <version> "<title>" --resume`.
- Never hold leads "until X" without an explicit resume message when X ends; check isRunning of every session each
  cron run.
- Every save prints the orchestrator prompt (PROMPTS.md section 1), even when no swap is planned (Michael ~23:20).
- List running orchestrator checkers / fix agents in each save block; the next orchestrator relaunches them first
  (23:05 rule).
- A conflict only in docs/** or *.md never keeps a PR out of a train: resolve it in the train worktree (keep both sides).
- Stacked PRs (base = another feature branch) stay open after their train merges: close every member whose head is in
  master with a comment naming the train PR.

## How Michael works with the orchestrator
- Short, plain replies. Native multiple-choice questions only. Hyphens, not em dashes.
- Every prompt he pastes names the session title, model and effort; a paste-in prompt is the turn's LAST message, never
  paired with a question dialog.
- He tests through the menus, never direct links: give menu paths and the version label to expect.
- Merge green, checked work without asking; ask in chat when auto mode blocks a step only he can approve.
- Start new sessions only from his own words in the desktop app; when the app refuses a start, propose a card
  (own_initiative) and tell him to click it.
- When auto mode on the laptop blocks a lead's `gh pr edit <n> --add-label train-ready`, check `gh pr checks <n>` and the
  `checker` status, then add the label from the desktop without asking ("Always label for them"). `gh pr close` is
  allowed on the desktop for failed train PRs and stale PRs whose content is on master.
- Bottlenecks are the orchestrator's standing job: every cron run names the biggest wait, its cause and a fix; fix what
  is in your authority at once, bring the rest to him with a measurement and a proposal. Question the rules themselves:
  which rule makes the slowest step slow, when it was last measured, what a cheaper one would cost.
- Fix patterns yourself (rules, routing, tooling, fix jobs); ask him only by day and only when his answer changes the
  outcome; overnight, decide, log the assumption, carry on. Never leave a question dialog open overnight.
- Tokens are no constraint in a full burn; spend them on progress, not overhead.
- At a swap, say "Safe to log out of the desktop and laptop" only at 100% with every session saved and runs queued.
- Never trace CT animation frame by frame (IP).

## Cron prompt
```
Night Shift | Orchestrator check (every 10 min, 7 / 17 / 27 / 37 / 47 / 57). Rules: CLAUDE.md "Sessions" on origin/master. Routine checks stay short (one line if nothing changed); tokens are no constraint in a full burn. EVERY run: get_usage and project when ~92% and 100% land (the 5-hour or the weekly meter, whichever caps first; 1% weekly is about 6% of a 5-hour window); desktop CPU (under ~60%: tell leads with independent slices left to start more builders; over 80%: trim the heaviest session); answer pending session messages; check isRunning of every session (list_sessions) and never hold leads "until X" without an explicit resume message when X ends; triage the ROADMAP Inbox; act on anything stuck (idle session with work left, empty queue slot, green PR without the train-ready label, CONFLICTING train-ready PR: resolve it in the train). Read C:/NightShift/scratch/auto-train-status.json (failed / stale / error / laptop-missing: act now) and run `bash docs/orchestrator/queue-audit.sh`, acting on every flag at once (STALE / DUP: the owner withdraws, or withdraw it yourself when the owner is idle; BIG: the owner trims to 1-2 area suites; CLAIM: tell Test Runner). Check the walk cap per area and each release's walk card. Name the biggest current wait, its cause and a fix; do fixes within your authority at once, bring the rest to Michael with native multiple choice. Every half hour (:27, :57), and at once (at most one per 15 min) when a train fails, a train or request has waited over 20 min, or a session is stuck, start one Opus audit agent on measured data (gh PR / CI / tag timings, scratch/runs logs incl. auto-train.log, laptop-queue claims / done times, job STATE files) with the brief "find time wasted in the last 30 min and its fix", and act on its ranked fixes the same run. Context per session only at :27 (over ~50%: note it in HANDOFF for a clear). At ~92% (every save, even when no swap is planned): refresh HANDOFF "State at the switch" (listing the running orchestrator checkers / fix agents), give Michael ONLY the orchestrator boot line from docs/orchestrator/PROMPTS.md section 1 (title, Opus 5.5, high) as the last thing in the message, and tell every lead to commit and push each agent worktree as WIP, queue its next long runs and keep its resume block current; agents keep working to 100%. At 100% with all saved: "Safe to log out of the desktop and laptop". After a reset or swap: message every session to resume (Player Build, Marlow Build, Sector Ops Build, Guard AI Build, Test Runner; the titles ListAgents shows). No question dialogs unless Michael is active; log assumptions. Hyphens, not em dashes.
```
