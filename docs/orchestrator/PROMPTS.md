# Boot lines (paste-in prompts)

One short line per session title. The lines carry no state and never change at a swap: each session reads the rules
(CLAUDE.md "Sessions" on origin/master) and its own entry in `docs/orchestrator/BOOT.md` (on origin/feature/menu),
which says where its resume block is. Change a line here only when a title is added or removed; change BOOT.md when a
session's resume location, model or effort changes. Old prompts: archive/PROMPTS-history.md.

At the ~92% save the old orchestrator prints ONLY line 1. In the new account the new orchestrator prints lines 2-7 in
one message (each with title, model, effort and machine, from the table), as the last thing in that message.

| # | Session title | Model | Effort | Where |
| --- | --- | --- | --- | --- |
| 1 | Night Shift \| Orchestrator | Opus 5.5 | high | desktop |
| 2 | Night Shift \| Player Build | Opus 5.5 | high | desktop |
| 3 | Night Shift \| Marlow Build | Opus 5.5 | high | desktop |
| 4 | Night Shift \| Sector Ops Build | Opus 5.5 | high | desktop |
| 5 | Night Shift \| Test Runner | Opus 5.5 | medium | laptop |
| 6 | Night Shift \| Guard AI Build | Opus 5.5 | high | laptop |
| 7 | Night Shift \| Cloud Builder \<k\> | as Michael starts it | - | cloud (claude.ai/code, Tekcry/Mobile-Coop) |

## 1. Orchestrator
```
Night Shift | Orchestrator (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Orchestrator" (ToolSearch if deferred). Work in C:/NightShift/Mobile-Coop-menu on feature/menu (git fetch; git pull). Then read origin/master CLAUDE.md "Sessions" (git show origin/master:CLAUDE.md) and follow docs/orchestrator/BOOT.md "Orchestrator" on origin/feature/menu: resume from HANDOFF "State at the switch" and STATE, check locks and old watchers, recreate the cron from STATE "Cron prompt", read auto-train-status.json, reopen cloud-queue briefs still claimed by an old builder, then print boot lines 2-7 from PROMPTS.md in ONE message (title, model, effort, machine each) as the last thing in that message. Short replies, native multiple choice only, hyphens not em dashes.
```

## 2. Player Build
```
Night Shift | Player Build (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Player Build" (ToolSearch if deferred). Then read origin/master CLAUDE.md "Sessions" (git fetch; git show origin/master:CLAUDE.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Player Build.
```

## 3. Marlow Build
```
Night Shift | Marlow Build (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Marlow Build" (ToolSearch if deferred). Then read origin/master CLAUDE.md "Sessions" (git fetch; git show origin/master:CLAUDE.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Marlow Build.
```

## 4. Sector Ops Build
```
Night Shift | Sector Ops Build (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Sector Ops Build" (ToolSearch if deferred). Then read origin/master CLAUDE.md "Sessions" (git fetch; git show origin/master:CLAUDE.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Sector Ops Build.
```

## 5. Test Runner (laptop)
```
Night Shift | Test Runner (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Test Runner" (ToolSearch if deferred). Then read origin/master CLAUDE.md "Sessions" (git fetch; git show origin/master:CLAUDE.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Test Runner.
```

## 6. Guard AI Build (laptop)
```
Night Shift | Guard AI Build (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Guard AI Build" (ToolSearch if deferred). Then read origin/master CLAUDE.md "Sessions" (git fetch; git show origin/master:CLAUDE.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Guard AI Build.
```

## 7. Cloud Builder (cloud, one or more)
```
Night Shift | Cloud Builder <k> (boot). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Cloud Builder <k>" (ToolSearch if deferred). Then read origin/master CLAUDE.md "Sessions" (git fetch; git show origin/master:CLAUDE.md) and follow docs/orchestrator/BOOT.md on origin/feature/menu for Cloud Builder.
```
