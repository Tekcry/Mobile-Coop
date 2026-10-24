# Restart after the usage reset (2026-10-20)

The orchestrator shows Michael these one at a time, each with its session title, model and effort stated next to it, in order, and waits for "done" after each (native choice). For
each: clear that session's chat (`/clear` or the session menu), paste the prompt, keep the session's title, Opus high,
Remote Control on. Do not touch "Night Shift | Character Build" (laptop) or "Night Shift | Menu Notes Build": they are
fresh and only paused; the orchestrator messages them to resume.

## 1. Night Shift | CT Core Build (model: Opus, effort: high)
```
CT Core Build: RESUME anim-rework. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/anim-rework/BRIEF.md, PLAN.md and STATE.md (this file), then carry on from STATE "Now". CT Core has first claim on the desktop lock; before any heavy run check C:/NightShift/heavy.lock, write your line while you run, delete it after; send long logic suites (e2e-ctcourse, e2e-coop, e2e-netmove, full e2e) with the exact commit to "Night Shift | Character Build" (laptop). Each slice: Opus implementer from the brief, Opus independent check, one fix round, npm run check, desktop e2e:quick + laptop co-op suites solo, a contact sheet for Michael, /ct/, a small PR to master the orchestrator merges. Report to "Night Shift | Orchestrator". No em dashes.
```

## 2. Night Shift | Sector Ops Build (model: Opus, effort: high)
```
Night Shift | Warehouse S2-S3. You are the job lead for the warehouse-s23 job (Sector Ops Warehouse sections 2 and 3 rebuilt to docs/warehouse-redesign/SPEC.md 2.2 / 2.3, plus section 1's lamp pass; lowest priority). Work only in C:\NightShift\Mobile-Coop-warehouse-s23 on branch feature/warehouse-s23 (git pull --ff-only first; node_modules is a junction, never npm ci). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, then docs/warehouse-s23/STATE.md and BRIEF.md, and only the parts of docs/warehouse-redesign/BRIEF.md and SPEC.md, BUILD-S3.md and check-s2.md that STATE "Next" names. Carry on from STATE "Now / Next": the lamp fix round (wip-lamp-fix.patch or fresh), then the section 3 greybox, with a Sonnet implementer and a fresh Opus checker, at most one fix round (docs/systems/session-method.md). Heavy runs only under C:/NightShift/heavy.lock when it is absent and CT Core is not waiting, one step at a time, released straight after; otherwise light commands only and suites to the laptop through "Night Shift | Orchestrator". Keep STATE current. When done: walk guide, push, the PR to master (a minor step), message the orchestrator.
```

## 3. Night Shift | Course Ready Build (model: Opus, effort: high)
```
You are "Night Shift | Course Ready Build", job lead for anim-rig (the MPFB2 rebake). Folder C:/NightShift/Mobile-Coop-anim-rig, branch feature/anim-rig (PR base feature/ct-prototype). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-anim-rig && test "$(git rev-parse --abbrev-ref HEAD)" = feature/anim-rig && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-anim-rig"
Read CLAUDE.md, docs/anim-rig/BRIEF.md and docs/anim-rig/STATE.md; carry on from "Next". Blender -b only, under C:/NightShift/heavy.lock (CT Core first); never leave a Blender or server process running when you stop. Opus for checks, Sonnet for chores. Then PR to feature/ct-prototype, message "Night Shift | Orchestrator", STOP.
```
