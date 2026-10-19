# Sector Ops - state

**Priority (Michael, 2026-10-19 16:30):** low, behind the co-op training course. The desktop heavy.lock and the laptop
runner serve CT Core first; while CT Core holds the lock, the desktop runs light commands only (tsc, eslint on files,
targeted vitest) and the suites go to the laptop runner ("Night Shift | Character Build": branch, commit, suites).

**Now:** slice 2 (M7: 3 sections, A12 cut; M8 routes and takedown spots). Step 1 (pure run, connectors, despawn,
per-mode cap, stars record) and step 2 (geometry, 3 sections, connectors, checkpoint restart) are green on the laptop
(9b0a254c). Step 3 (stars UI, co-op syringes, the client's live section; protocol 24) is half committed (2fa5a154) and
being finished.
**Next:** finish step 3, laptop run, a fresh checker for the slice (one fix round), shots, then the PR to master.
**Open:**
- Perf with each section's full guard count (10 / 10 / 11, A13; the 32 cap is a ceiling, not a target): pending PC
  run (`perf.mjs`, PLAN section 6). The counts come from it (M6).
- Shots of the 3 sections: pending (no software-GL shots on the laptop; the desktop when the lock is free).
- e2e-menus slider check: #18's condition wait is merged in (4.6.6).
- e2e-coop: runs and passes on protocol 24; any edit to it goes through the orchestrator first.

## Done
- 2026-10-19: npm ci; master 4.6.4 merged in; research notes; slice 1 (menus, the Sector Ops briefing); slice 2 first
  cut (mode, sectors, Warehouse copy, Vitest, e2e-sectorops); slice 3 (lobby Campaign / Sector Ops, a new room on Marlow
  Yard, the `sector` message, protocol 23); `npm run check` green; smoke, e2e-park, e2e-pad, e2e-sectorops pass;
  e2e-menus passes on a rerun (see Open). RESEARCH.md and the comprehensive PLAN.md.
- 2026-10-19: M7 (3 sections, no lives, stars), M8 (routes, room to manoeuvre), A10-A19. Step 1 (ca7fcfd2,
  `step1-report.md`); step 2 (878b304a, fixes 7bbd3222 and 9b0a254c, `step2-report.md`): C2 doorways widened for nav,
  the seal check blocks the connector cells (no leak), three guard pinch points widened. Master 4.6.8 merged in
  (e20c3f30). Laptop: check, smoke, e2e-sectorops, e2e-park, e2e-coop, e2e-netmove, e2e-ctcourse, e2e-levels,
  e2e-anchors, e2e-lightbake, e2e-menus pass.

## Resume prompt
```
Night Shift | Sector Ops. You are the job lead for the Sector Ops job (low priority, behind the co-op training course).
Work only in C:\NightShift\Mobile-Coop-sector-ops on branch feature/sector-ops (git pull --ff-only first). Read
CLAUDE.md ("Sessions"), docs/ROADMAP.md, then docs/sector-ops/STATE.md, BRIEF.md (M7, M8, A10 onward) and PLAN.md, and
the step reports in docs/sector-ops/. Finish slice 2 from STATE "Next", one step at a time with an implementer and a
fresh checker (docs/systems/session-method.md). Heavy runs only under C:/NightShift/heavy.lock and only when CT Core is
not waiting; otherwise light commands only and send suites to "Night Shift | Character Build" (branch, commit, suites).
Prototype effort only. Report to "Night Shift | Orchestrator" after each step that changes what Michael sees, and when
the PR is open; ask it before editing e2e-coop.
```
