# Orchestrator - state (current only)

Rules: docs/RULES.md on origin/master; the game: docs/VISION.md. Start: docs/orchestrator/BOOT.md "Orchestrator". Cross-session state at a
swap: HANDOFF.md (newest block). History (old Master lines, Pacing, Sessions, merge procedure, Now log, resume prompt):
archive/STATE-history.md. Keep this file current, not appended: replace a line when it changes.

## Now (2026-10-25 ~12:45)
Detail: ROADMAP "Now" (rewritten ~12:35) and HANDOFF "State at the switch"; this list is the standing frame only.
- Master 4.101.1 (train 86 #406); train 87 (#409, 4.101.2 = #384) running.
- Docs first (G346, G355): no new game work until Michael signs off the folded plan (ROADMAP Now row 6); finished PRs
  ship. Pace each 5-hour window to ~100% near its reset, not before (Michael 2026-10-26 ~23:45).
- Phase 0: land #407 (feature/doc-final) and #400 (feature/doc-guard, stacked on #407) together; #408 laptop-queue-5
  (Test Runner). Phase 1: each lead's conformance review (review-briefs/<lead>.md), then fold the five gap lists.
- Auto-train: scheduled task "NightShift auto-train" every 1 min from C:/NightShift/Mobile-Coop-autotrain (a master
  checkout that self-updates); status C:/NightShift/scratch/auto-train-status.json, log scratch/runs/auto-train.log.
- Laptop queue: task NightShift-laptop-queue (laptop) and NightShift-desktop-queue (desktop overflow), both following
  origin/master; log C:/NightShift/scratch/laptop-queue/. Watchdog task installed ~12:25 (-Fix labels,prs).
- Cloud: Cloud Builder 1 on the orphan branch cloud-queue; leads keep 1-2 briefs open.
- Worktrees: this session C:/NightShift/Mobile-Coop-menu (feature/menu); trains C:/NightShift/Mobile-Coop-train.

## Known
- Train-ready and who labels: RULES "Getting to master". At every ~92% save Test Runner queues ~3 h of session-free
  laptop / desktop work before the cap and leads keep Cloud Builder at 3+ open briefs (04:31 waste audit; full text in
  archive/STATE-history.md).
- At each swap: stop tail / grep watchers older than the swap:
  `Get-CimInstance Win32_Process -Filter "Name='tail.exe' OR Name='grep.exe'" | Where-Object { $_.CreationDate -lt (Get-Date '<swap time>') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`.
- Locks: RULES "Machines".
- If a laptop session is missing from ListAgents (Remote Control bridge drop), tell Michael in one line to reopen it;
  the queue service keeps running without it.
- Once Test Runner's J20 PR-B releases: each cron run also reads `alerts/*-fixjob-*.json` on the laptop-queue branch
  (a suite auto-quarantined twice in 14 days turns blocking and needs an owner fix job); start that fix job with its
  owner the same run. J20 release order: #445 PR-C, then PR-A, then PR-B (Job-done).
- Over Remote Control the app refuses start_session and proposal cards (2026-10-25 18:30): Michael types "start the
  leads" in the desktop app, or pastes PROMPTS.md lines 2-5 there.
- Posting `checker` (or `train-ready`): run `gh api repos/Tekcry/Mobile-Coop/statuses/<sha> ...` as a lone command;
  the user settings allow rule matches it, while a command chained with `;` / `&&` goes to the auto-mode filter and is
  blocked as self-approval (2026-10-25 ~20:12). Tell leads the same.
- Laptop SSH link (2026-10-25 ~20:00, Michael picked "Yes, guide me"): desktop key ~/.ssh/id_ed25519 (MICHAEL-PC);
  laptop ALIENWARE-X16 user Micha, 192.168.1.249. Key login from the desktop works (tested 2026-10-25 ~20:47); the
  desktop app has the SSH connection "AME Laptop" (folder C:\NightShift). start_session refuses Windows SSH hosts
  ("cannot place a session there yet", 20:58), so at each swap print the two laptop boot lines; Michael starts them
  from the desktop app (New session -> AME Laptop -> C:\NightShift) or on the laptop. Retry start_session at each swap (target ssh, host "AME Laptop", cwd C:\NightShift, permission_mode bypassPermissions) BEFORE printing lines 6-7; a session started that way runs in bypass. If refused, the laptop sessions start in the laptop default mode and hold peer messages for approval (2026-10-26 ~17:55, twice): print with the lines "switch each to Bypass permissions in the mode picker", or Michael sets the laptop default (Claude app on the laptop, his own security setting; the orchestrator never edits it).
- Cloud Builder: start_session target cloud works when the call names `repository: "Tekcry/Mobile-Coop"` (2026-10-26
  13:25); without it the app refuses (C:/NightShift is not a git checkout).
- On Windows a "stopped" background runner can survive: `taskkill /T /F` on its PID and confirm the tree is gone.
- After a release CI failure: fix on train/<n>, wait for CI, then
  `node scripts/merge-train.mjs release <n> <version> "<title>" --resume`.
- Never hold leads "until X" without an explicit resume message when X ends; check isRunning of every session each
  cron run.
- Every save prints the orchestrator prompt (PROMPTS.md section 1), even when no swap is planned (Michael ~23:20).
- List running orchestrator checkers / fix agents in each save block; the next orchestrator relaunches them first
  (23:05 rule).
- Open fixes (audit findings, flakes, tooling): `docs/orchestrator/FIXES.md`, the one tracker; the cron reads it every
  run. Label only PRs that merge cleanly with master (a docs conflict: hand-merge it in the train).
- A conflict only in docs/** or *.md never keeps a PR out of a train: resolve it in the train worktree (keep both sides).
- Stacked PRs (base = another feature branch) stay open after their train merges: close every member whose head is in
  master with a comment naming the train PR.

## How Michael works with the orchestrator
- Short, plain replies. Native multiple-choice questions only. Hyphens, not em dashes.
- He is not technical (Michael 2026-10-25 13:31): every update in plain English, brief dot points, straight to the point; no hashes, tool names or jargon; say what a PR is, not just its number.
- Never send him to a file for a prompt (Michael 2026-10-25 ~21:55: "always show me the prompt directly"): print the full text in chat.
- Every prompt he pastes names the session title, model and effort; a paste-in prompt is the turn's LAST message, never
  paired with a question dialog.
- He tests through the menus, never direct links: give menu paths and the version label to expect.
- Merge green, checked work without asking; ask in chat when auto mode blocks a step only he can approve.
- Bypass permissions (Michael 2026-10-26 ~14:00: "i just want you to proceed unintererrupted unless you desperately need me", then "i approve it"): at boot switch this session and every desktop lead to bypassPermissions (set_session_permission_mode; sessions started from a bypass session inherit it); leads post their own checker statuses. The laptop sessions are switched on the laptop (mode picker by the message box). Ask Michael only for downloads, purchases, account settings and his own sign-offs.
- Start new sessions only from his own words in the desktop app; when the app refuses a start, propose a card
  (own_initiative) and tell him to click it.
- Recording passes (Michael 2026-10-25 ~18:15, native multiple choice: "Yes, keep doing it (Recommended)"; replaces ~14:10 docs-only): when auto mode blocks a lead from posting `checker` and an independent checker passed the head (read its report: VERDICT PASS on that sha), the orchestrator posts the status, docs or code PRs alike, without asking.
- Mixamo downloads (Michael 2026-10-25 ~19:05): "i will approve any animation downloaded as requested by player build. just approve, download, and implement. make sure i can fine tune in anim dev just in case i have to." The orchestrator downloads every clip Player Build requests in Michael's signed-in browser pane without asking him (into C:/NightShift/scratch/mixamo/clips/), and every imported clip must be tunable in Anim Studio like the CMU clips.
- When auto mode on the laptop blocks a lead's train-ready label, verify it by RULES "Getting to master" and add it from
  the desktop without asking ("Always label for them"). `gh pr close` is
  allowed on the desktop for failed train PRs and stale PRs whose content is on master.
- Bottlenecks are the orchestrator's standing job: every cron run names the biggest wait, its cause and a fix; fix what
  is in your authority at once, bring the rest to him with a measurement and a proposal. Question the rules themselves:
  which rule makes the slowest step slow, when it was last measured, what a cheaper one would cost.
- Fix patterns yourself (rules, routing, tooling, fix jobs); ask him only by day and only when his answer changes the
  outcome; overnight, decide, log the assumption, carry on. Never leave a question dialog open overnight.
- Pacing (Michael 2026-10-26 ~23:45, "Ensure these sessions hit the 5 hour 100% limit, but don't rush to get there."): each window reaches ~100% close to its reset, on a straight line; replaces the 10-25 "ignore usage limits" and the 10-26 ~19:22 "don't burn 100%". Saves still run at ~92%.
- At a swap, say "Safe to log out of the desktop and laptop" only at 100% with every session saved and runs queued.
- Never trace CT animation frame by frame (IP).

## Cron prompt
```
Night Shift | Orchestrator check (every 10 min, 7 / 17 / 27 / 37 / 47 / 57). Rules: docs/RULES.md and docs/VISION.md on origin/master. Routine checks stay short (one line if nothing changed); pace each 5-hour window to reach ~100% close to its reset, not before (Michael 2026-10-26 ~23:45): compare get_usage with the straight line from the window start to 100% at the reset; ahead: tell leads to trim builders; behind: tell leads with independent slices to add one (at most 2 each). EVERY run: get_usage and project when ~92% and 100% land (the 5-hour or the weekly meter, whichever caps first; 1% weekly is about 6% of a 5-hour window); desktop CPU (under ~60%: tell leads with independent slices left to start more builders; over 90%: trim the heaviest session); answer pending session messages; check isRunning of every session (list_sessions) and never hold leads "until X" without an explicit resume message when X ends; triage the ROADMAP Inbox; act on anything stuck (idle session with work left, empty queue slot, green PR without the train-ready label (check + checker + affected-e2e), affected-e2e pending with no open request (re-request it), CONFLICTING train-ready PR: resolve it in the train). Read docs/orchestrator/FIXES.md (no PR or branch 24 h after Opened: ask the owner for a date; 48 h: reassign or start an Opus fix agent; a shipped fix whose problem returns: reopen it; every new finding becomes a row the same turn). Read C:/NightShift/scratch/auto-train-status.json (failed / stale / error / laptop-missing: act now) and run `bash docs/orchestrator/queue-audit.sh`, acting on every flag at once (STALE / DUP: the owner withdraws, or withdraw it yourself when the owner is idle; BIG: the owner trims to 1-2 area suites; CLAIM: tell Test Runner). Check the walk cap per area and each release's walk card. Name the biggest current wait, its cause and a fix; do fixes within your authority at once, bring the rest to Michael with native multiple choice. Only on a real trigger (at most one per 15 min: a train fails, a train or request has waited over 20 min, or a session is stuck; Michael ~19:22), start one Opus audit agent on measured data (gh PR / CI / tag timings, scratch/runs logs incl. auto-train.log, laptop-queue claims / done times, job STATE files) with the brief "find time wasted in the last 30 min and its fix", and act on its ranked fixes the same run. Context per session only at :27 (over ~50%: note it in HANDOFF for a clear). At ~92% (every save, even when no swap is planned): refresh HANDOFF "State at the switch" (listing the running orchestrator checkers / fix agents), give Michael ONLY the orchestrator boot line from docs/orchestrator/PROMPTS.md section 1 (title, Opus 5.5, high) as the last thing in the message, and tell every lead to commit and push each agent worktree as WIP, queue its next long runs and keep its resume block current; agents keep working to 100%. At 100% with all saved: "Safe to log out of the desktop and laptop". After a swap: list_sessions and ListAgents first, then start only the titles not already live among Player Build, Marlow Build, Sector Ops Build, Campaign Build and one Cloud Builder yourself (start_session, user_asked: Michael ~12:50) and give Michael only the laptop boot lines (Guard AI, Test Runner) of sessions not already live; after a same-account reset: message every live session to resume (the titles ListAgents shows). No question dialogs unless Michael is active; log assumptions. Hyphens, not em dashes.
```
