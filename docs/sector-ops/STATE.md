# Sector Ops - state

**Now:** slice 1 (menus) and slice 3 (co-op mode switch) built and tested; slice 2 has a first cut (4 sectors on the
Warehouse copy, A1). Research (`RESEARCH.md`) and the five-section plan (`PLAN.md`, M5, M6) are written and **wait for
Michael's approval** (M5b).
**Next:** after approval, slice 2 in the plan's build order (PLAN section 5): the pure connector run, `despawn` and the
per-mode cap, then the geometry section by section, the data, the mode, co-op, tests.
**Open:**
- e2e-menus: the settings slider "holding right repeats and accelerates" check failed 2 of 3 solo runs on this branch
  under software GL (22 frames in 3.2 s when it fails); master passed 1 of 1. Nothing in this job touches the settings
  screen or the nav repeat; watch it in the PR's full run.
- e2e-coop for co-op Sector Ops: only after feature/coop-tests merges and the orchestrator agrees.
- Perf with 20-25 guards a section: pending PC run (PLAN section 6).

## Done
- 2026-10-19: npm ci; master 4.6.4 merged in; research notes; slice 1 (menus, the Sector Ops briefing); slice 2 first
  cut (mode, sectors, Warehouse copy, Vitest, e2e-sectorops); slice 3 (lobby Campaign / Sector Ops, a new room on Marlow
  Yard, the `sector` message, protocol 23); `npm run check` green; smoke, e2e-park, e2e-pad, e2e-sectorops pass;
  e2e-menus passes on a rerun (see Open). RESEARCH.md and the comprehensive PLAN.md.

## Resume prompt
```
Night Shift | Sector Ops. You are the job lead for the Sector Ops job. Work only in C:\NightShift\Mobile-Coop-sector-ops
on branch feature/sector-ops. Read CLAUDE.md, docs/ROADMAP.md, then docs/sector-ops/STATE.md, BRIEF.md and PLAN.md.
If Michael has approved PLAN.md (ask the orchestrator), build slice 2 in the plan's build order, one step at a time,
each with npm run check and its suites; heavy runs only under C:/NightShift/heavy.lock, headless, port 4191. Prototype
effort only. Report to the orchestrator ("Night Shift | Orchestrator") after each step that changes what Michael sees,
and when the PR is open; ask it before touching e2e-coop.
```
