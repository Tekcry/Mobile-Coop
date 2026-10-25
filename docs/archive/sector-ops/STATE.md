# Sector Ops - state

**Priority (Michael, 2026-10-19 16:30):** low, behind the co-op training course. The desktop heavy.lock and the laptop
runner serve CT Core first; while CT Core holds the lock, the desktop runs light commands only (tsc, eslint on files,
targeted vitest) and the suites go to the laptop runner ("Night Shift | Character Build": branch, commit, suites).

**Now:** slice 2 built (M7: 3 sections, A12 cut; M8 routes and takedown spots; stars; syringes; protocol 24). Checker
FAIL on 2079cb14 (alarm panels across sections), one fix round (c1f93ed7, A24), fresh checker PASS
(`check-slice2-fix.md`). Laptop at c1f93ed7: check, smoke, e2e-sectorops, e2e-stealth-ai, e2e-coop pass. The full
`npm run e2e` (laptop, 7a263ecc, E2E_JOBS=1): 30 of 31 pass; e2e-traverse failed once ("a tap kicks the grate in",
noise 0, on proving grounds, no code of this job on that path) and passed a solo rerun on the desktop (noise 10). PR to
master open.
**Next:** the orchestrator reviews and merges (a minor version); Michael sees it on /preview/. Then his playtest of the
3 sections; the courtyard, annex and roof wait for it (M7).
**Polish list (after Michael plays it):** `step2-report.md` and `step3-report.md` "Polish list", `check-slice2.md`
items 5 (a restart resets guards, devices, panels and camera meters, not doors or lamps), `check-slice2-fix.md`.
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
