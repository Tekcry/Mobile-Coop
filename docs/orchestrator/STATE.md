# Orchestrator - state (current only)

Rules: CLAUDE.md "Sessions" on origin/master. Start: docs/orchestrator/BOOT.md "Orchestrator". Cross-session state at a
swap: HANDOFF.md (newest block). History (old Master lines, Pacing, Sessions, merge procedure, Now log, resume prompt):
archive/STATE-history.md. Keep this file current, not appended: replace a line when it changes.

## Now (2026-10-24 ~22:15)
- Master 4.96.0 (train 64 #341, guard-render-2). Train 65 #345 open (4.97.0: #344, #339, #333, #251): CI + laptop full
  e2e pending. Train 66 candidates: #342 (train-ready), #343 auto-drop (after #251). #317 coop4 waits on its laptop sets.
- Process audit 2026-10-24 (PROCESS-AUDIT-2026-10-24.md): all four fix packages approved ~21:50. Rulebook PR #347
  (master) and branch docs/lean-orchestrator (these docs): merge docs/lean-orchestrator into feature/menu, then the
  rulebook PR rides a train. Watchdog + release path, cheap swaps, intake tooling: to plan and assign (ROADMAP Now 4-6).
- Walk cap: every area is at the cap (ROADMAP "Waiting on Michael"); leads at the cap take tests / fixes / automation.
  Next walk card goes out with the next release.
- Auto-train: scheduled task "NightShift auto-train" every 1 min from C:/NightShift/Mobile-Coop-autotrain (a master
  checkout that self-updates); status C:/NightShift/scratch/auto-train-status.json, log scratch/runs/auto-train.log.
- Laptop queue: task NightShift-laptop-queue (laptop) and NightShift-desktop-queue (desktop overflow, CPU 80 gates),
  both following origin/master; log C:/NightShift/scratch/laptop-queue/.
- Cloud: Cloud Builder 1 on the orphan branch cloud-queue; leads keep 1-2 briefs open.
- Worktrees: this session C:/NightShift/Mobile-Coop-menu (feature/menu); trains C:/NightShift/Mobile-Coop-train.

## Known
- At each swap: stop tail / grep watchers older than the swap:
  `Get-CimInstance Win32_Process -Filter "Name='tail.exe' OR Name='grep.exe'" | Where-Object { $_.CreationDate -lt (Get-Date '<swap time>') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`.
- A lock with no live node process (or a dead pid) is stale: ask Michael before deleting another session's lock.
- If a laptop session is missing from ListAgents (Remote Control bridge drop), tell Michael in one line to reopen it;
  the queue service keeps running without it.
- On Windows a "stopped" background runner can survive: `taskkill /T /F` on its PID and confirm the tree is gone.
- merge-train cannot re-release after a release CI failure: fix on train/<n>, wait for CI, then `gh pr merge`,
  `git tag`, push the tag, push the merge to dev, as separate commands.
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
Night Shift | Orchestrator check (every 10 min, 7 / 17 / 27 / 37 / 47 / 57). Rules: CLAUDE.md "Sessions" on origin/master. Routine checks stay short (one line if nothing changed); tokens are no constraint in a full burn. EVERY run: get_usage and project when ~92% and 100% land (the 5-hour or the weekly meter, whichever caps first; 1% weekly is about 6% of a 5-hour window); desktop CPU (under ~60%: tell leads with independent slices left to start more builders; over 80%: trim the heaviest session); answer pending session messages; triage the ROADMAP Inbox; act on anything stuck (idle session with work left, empty queue slot, green PR without the train-ready label, CONFLICTING train-ready PR: resolve it in the train). Read C:/NightShift/scratch/auto-train-status.json (failed / stale / error / laptop-missing: act now) and run `bash docs/orchestrator/queue-audit.sh`, acting on every flag at once (STALE / DUP: the owner withdraws, or withdraw it yourself when the owner is idle; BIG: the owner trims to 1-2 area suites; CLAIM: tell Test Runner). Check the walk cap per area and each release's walk card. Name the biggest current wait, its cause and a fix; do fixes within your authority at once, bring the rest to Michael with native multiple choice. Every half hour (:27, :57), and at once (at most one per 15 min) when a train fails, a train or request has waited over 20 min, or a session is stuck, start one Opus audit agent on measured data (gh PR / CI / tag timings, scratch/runs logs incl. auto-train.log, laptop-queue claims / done times, job STATE files) with the brief "find time wasted in the last 30 min and its fix", and act on its ranked fixes the same run. Context per session only at :27 (over ~50%: note it in HANDOFF for a clear). At ~92%: refresh HANDOFF "State at the switch", give Michael ONLY the orchestrator boot line from docs/orchestrator/PROMPTS.md section 1 (title, Opus 5.5, high) as the last thing in the message, and tell every lead to queue its next long runs and keep its resume block current; agents keep working to 100%. At 100% with all saved: "Safe to log out of the desktop and laptop". After a reset or swap: message every session to resume (Player Build, Marlow Build, Sector Ops Build, Guard AI Build, Test Runner; the titles ListAgents shows). No question dialogs unless Michael is active; log assumptions. Hyphens, not em dashes.
```
