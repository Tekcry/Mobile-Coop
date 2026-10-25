# Boot lines (paste-in prompts)

One short line per session title. The lines carry no state and never change at a swap: each session reads the rules
(docs/RULES.md and docs/VISION.md on origin/master) and its own entry in `docs/orchestrator/BOOT.md` (on origin/feature/menu),
which says where its resume block is and its first job (the conformance review brief). Change a line here only when a title is added or removed; change BOOT.md when a
session's resume location, model or effort changes. Old prompts: archive/PROMPTS-history.md.

Swaps (Michael ~12:50: "automate as much as possible"): at the ~92% save the old orchestrator prints ONLY line 1, and
every save prints it even when no swap is planned (Michael 2026-10-24 ~23:20); Michael pastes line 1. In the new
account the new orchestrator STARTS lines 2-5 and one line 8 itself (start_session, user_asked) and prints only the
laptop lines 6-7 in one message (each with title, model, effort and machine, from the table), as the last thing in that
message; Michael pastes those on the laptop.

| # | Session title | Model | Effort | Where | Started by |
| --- | --- | --- | --- | --- | --- |
| 1 | Night Shift \| Orchestrator | Opus 5.5 | high | desktop | Michael pastes it |
| 2 | Night Shift \| Player Build | Opus 5.5 | high | desktop | the orchestrator |
| 3 | Night Shift \| Marlow Build | Opus 5.5 | high | desktop | the orchestrator |
| 4 | Night Shift \| Sector Ops Build | Opus 5.5 | high | desktop | the orchestrator |
| 5 | Night Shift \| Campaign Build | Opus 5.5 | high | desktop | the orchestrator |
| 6 | Night Shift \| Test Runner | Opus 5.5 | medium | laptop | Michael pastes it |
| 7 | Night Shift \| Guard AI Build | Opus 5.5 | high | laptop | Michael pastes it |
| 8 | Night Shift \| Cloud Builder \<k\> | as started | - | cloud (claude.ai/code, Tekcry/Mobile-Coop); briefs from the cloud-queue README | the orchestrator (one) |

## 1. Orchestrator
```
Night Shift | Orchestrator (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Orchestrator" (ToolSearch if deferred). Work in C:/NightShift/Mobile-Coop-menu on feature/menu (git fetch; git pull). Then read origin/master docs/RULES.md and docs/VISION.md (git show origin/master:docs/RULES.md; git show origin/master:docs/VISION.md) and follow docs/orchestrator/BOOT.md "Orchestrator" on origin/feature/menu: resume from HANDOFF "State at the switch" and STATE, check locks and old watchers, recreate the cron from STATE "Cron prompt", read auto-train-status.json, reopen cloud-queue briefs still claimed by an old builder, start boot lines 2-5 and one line 8 from PROMPTS.md yourself (start_session), then print only the laptop lines 6-7 in ONE message (title, model, effort, machine each) as the last thing in that message. Short replies, native multiple choice only, hyphens not em dashes.
```

## 2. Player Build (started by the orchestrator)
```
Night Shift | Player Build (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Player Build" (ToolSearch if deferred). Then read origin/master docs/RULES.md and docs/VISION.md (git fetch; git show origin/master:docs/RULES.md; git show origin/master:docs/VISION.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Player Build.
```

## 3. Marlow Build (started by the orchestrator)
```
Night Shift | Marlow Build (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Marlow Build" (ToolSearch if deferred). Then read origin/master docs/RULES.md and docs/VISION.md (git fetch; git show origin/master:docs/RULES.md; git show origin/master:docs/VISION.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Marlow Build.
```

## 4. Sector Ops Build (started by the orchestrator)
```
Night Shift | Sector Ops Build (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Sector Ops Build" (ToolSearch if deferred). Then read origin/master docs/RULES.md and docs/VISION.md (git fetch; git show origin/master:docs/RULES.md; git show origin/master:docs/VISION.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Sector Ops Build.
```

## 5. Campaign Build (started by the orchestrator)
```
Night Shift | Campaign Build (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Campaign Build" (ToolSearch if deferred). Then read origin/master docs/RULES.md and docs/VISION.md (git fetch; git show origin/master:docs/RULES.md; git show origin/master:docs/VISION.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Campaign Build.
```

## 6. Test Runner (laptop; Michael pastes it)
```
Night Shift | Test Runner (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Test Runner" (ToolSearch if deferred). Then read origin/master docs/RULES.md and docs/VISION.md (git fetch; git show origin/master:docs/RULES.md; git show origin/master:docs/VISION.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Test Runner.
```

## 7. Guard AI Build (laptop; Michael pastes it)
```
Night Shift | Guard AI Build (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Guard AI Build" (ToolSearch if deferred). Then read origin/master docs/RULES.md and docs/VISION.md (git fetch; git show origin/master:docs/RULES.md; git show origin/master:docs/VISION.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Guard AI Build.
```

## 8. Cloud Builder (cloud; one started by the orchestrator)
```
Night Shift | Cloud Builder <k> (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Cloud Builder <k>" (ToolSearch if deferred). Then read origin/master docs/RULES.md and docs/VISION.md (git fetch; git show origin/master:docs/RULES.md; git show origin/master:docs/VISION.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Cloud Builder. Your briefs come only from README.md on the orphan branch cloud-queue (git fetch origin cloud-queue; git show origin/cloud-queue:README.md).
```
