# Swap prompts (stable; Michael 2026-10-23 ~19:10, "Fixed swap prompts")

At a swap Michael pastes all six at once, in any order, without waiting for the orchestrator. The prompts never carry
state: each session reads its own resume block, and cross-job state (trains, versions, protocol) lives in
`docs/orchestrator/HANDOFF.md` "State at the switch" (newest block first). Change a prompt here only when a rule or
a session's job changes, not at each swap. Rules common to all five job sessions are in CLAUDE.md "Sessions".

| Session title | Model | Effort | Where |
| --- | --- | --- | --- |
| Night Shift \| Orchestrator | Opus 5.5 | high | desktop |
| Night Shift \| Player Build | Opus 5.5 | medium | desktop |
| Night Shift \| Marlow Build | Opus 5.5 | medium | desktop |
| Night Shift \| Sector Ops Build | Opus 5.5 | medium | desktop |
| Night Shift \| Test Runner | Opus 5.5 | medium | laptop |
| Night Shift \| Guard AI Build | Opus 5.5 | high | laptop |

## Common tail (every job prompt ends with it)
Rules: CLAUDE.md "Sessions" and "Heavy-usage throughput" incl. "Token rules", and the newest ROADMAP "Decided" entries
for the pipeline (grep "Pipeline speed-ups", "Release speed-ups"). Message the orchestrator only at PR open /
train-ready (also add the `train-ready` label) / blocked / needs Michael; progress in your STATE. Resume block lean
(~40 lines, exact file:line pointers). No mid-window clears. Gmail / Google Drive / Fergus connectors off. One checker
per batch, run in parallel with the laptop request on the same commit. No e2e on the desktop: every suite through Test
Runner's laptop queue, E2E_GPU=1. No polling turns. Never merge master into your branch (the train does). Burn fast:
every independent slice of your PLAN in parallel up to CPU ~80%, nothing speculative, never two agents on the same
files. Opus plans / checks / AI and anim code, Sonnet 5.5 builds from strict briefs, Haiku 5.5 chores. At the
orchestrator's save message (~92%) commit every agent worktree as WIP and push (the orchestrator checks the branches
exist on origin), keep working to 100%.

## 1. Orchestrator
```
Night Shift | Orchestrator (account swap). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Orchestrator" (load it with ToolSearch if deferred). Work in C:/NightShift/Mobile-Coop-menu on feature/menu (git fetch; git pull). Resume from docs/orchestrator/HANDOFF.md "State at the switch" (newest block first) and docs/orchestrator/STATE.md ("Master" incl. the protocol registry, "Known", "Cron prompt"). Read CLAUDE.md "Sessions" and only the newest docs/ROADMAP.md "Decided" entries (grep). First: check C:/NightShift/heavy.lock and heavy2.lock (no live node / dead pid = stale: ask Michael before deleting) and stop tail / grep watchers older than the swap (STATE "Known"). Recreate the cron with STATE "Cron prompt", check get_usage, read C:/NightShift/scratch/auto-train-status.json if it exists. The other five sessions are pasted at the same time from docs/orchestrator/PROMPTS.md: check ListAgents that all five are up under their titles. Bottlenecks are your standing job (every cron run names the biggest wait and a fix; the :27 run starts an Opus audit; docs/orchestrator/BOTTLENECKS.md). At ~92% refresh HANDOFF, tell every session to save, verify each claimed WIP branch exists on origin; at 100% with all saved say "Safe to log out of the desktop and laptop". Short replies, native multiple choice only, hyphens not em dashes.
```

## 2. Player Build
```
Night Shift | Player Build (account swap). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Player Build" (load it with ToolSearch if deferred). Read CLAUDE.md, then follow the resume prompt in the last fenced block of docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md); cross-job state (trains, versions, PROTOCOL) in docs/orchestrator/HANDOFF.md "State at the switch" newest block. Job: Player Build lead (movement, mocap, takedowns, the anim-fix-pass, AF6, co-op spare jobs; Michael's walk report P1-P7 in your PLAN). Then the common tail in docs/orchestrator/PROMPTS.md "Common tail" (read it).
```

## 3. Marlow Build
```
Night Shift | Marlow Build (account swap). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Marlow Build" (load it with ToolSearch if deferred). Read CLAUDE.md, then follow the resume prompt in the last fenced block of docs/marlow-final/STATE.md on origin/feature/marlow-final (git fetch; worktree C:/NightShift/Mobile-Coop-marlow-final); cross-job state (trains, versions, PROTOCOL) in docs/orchestrator/HANDOFF.md "State at the switch" newest block on origin/feature/menu. Job: Marlow Build lead (marlow-final, then section-rating; Michael's walk report M1-M5 in your PLAN). Then the common tail in docs/orchestrator/PROMPTS.md "Common tail" on origin/feature/menu (read it).
```

## 4. Sector Ops Build
```
Night Shift | Sector Ops Build (account swap). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Sector Ops Build" (load it with ToolSearch if deferred). Read CLAUDE.md, then follow the resume prompt in the last fenced block of docs/sector-redesign/STATE.md on origin/feature/sector-redesign-polish (git fetch); cross-job state (trains, versions, PROTOCOL) in docs/orchestrator/HANDOFF.md "State at the switch" newest block on origin/feature/menu. Job: Sector Ops Build lead (sector-redesign / campusOps, campus detail art, lighting LR15 / LR16 on every map; Michael's walk report S1-S3 in your PLAN). Then the common tail in docs/orchestrator/PROMPTS.md "Common tail" on origin/feature/menu (read it).
```

## 5. Test Runner (laptop)
```
Night Shift | Test Runner (account swap, laptop). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Test Runner" (load it with ToolSearch if deferred). Read CLAUDE.md "Sessions" ("Main test machine: the laptop"), then follow the resume prompt in the last fenced block of docs/flake-fix/STATE.md on origin/feature/flake-fix (git fetch). Check the laptop queue service / scheduled tasks, C:/NightShift/scratch/runs and the laptop heavy.lock for runs left from the old account (no live node = stale). If two Test Runner sessions show in ListAgents, close the older one. Job: the laptop test runner for every session (trains first and alone, then PR suites, then alone-measurements right after each release), the laptop-queue job, Guard AI shares this laptop (keep CPU under ~80% between you). Verdicts go to GitHub statuses / PR comments; message "Night Shift | Orchestrator" only on a train failure or when blocked. Then the common tail in docs/orchestrator/PROMPTS.md "Common tail" on origin/feature/menu (read it).
```

## 6. Guard AI Build (laptop)
```
Night Shift | Guard AI Build (account swap, laptop). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Guard AI Build" (load it with ToolSearch if deferred). Read CLAUDE.md, then follow the resume prompt in the last fenced block of docs/guard-ai/STATE.md on origin/feature/guard-ai (git fetch; worktree C:/NightShift/Mobile-Coop-guard-ai on the laptop: create it with git worktree add if missing, npm ci once). Cross-job state (trains, versions, PROTOCOL) in docs/orchestrator/HANDOFF.md "State at the switch" newest block on origin/feature/menu. Job: guard-ai lead (src/ai/*, all maps). Laptop agents share the machine with Test Runner: e2e only through its queue; tsc / vitest agents keep laptop CPU under ~80%. AI code and checkers stay Opus. Then the common tail in docs/orchestrator/PROMPTS.md "Common tail" on origin/feature/menu (read it).
```
