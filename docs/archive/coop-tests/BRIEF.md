# Co-op test fix - brief

Set by the orchestrator, 2026-10-19: the process audit's section 2 fix plan (`docs/process-audit/REPORT.md`), approved
by Michael. Branch `feature/coop-tests` (off `feature/process-audit` 7a01b254; rebased onto master once PR #15
merges), folder `C:/NightShift/Mobile-Coop-coop-tests`. Runs on the laptop.

## Michael's words
- On the flaky suites (2026-10-19, relayed): "fix the co-op ones, move the rest out of the way (park them, don't fix
  them)".
- Laptop as a second heavy slot (2026-10-19, relayed, confirmed by Michael in this session: "Yes, run e2e here"): one
  heavy job at a time with the laptop's own `C:/NightShift/heavy.lock`, `E2E_JOBS=1`, BelowNormal priority inherited by
  the runner's children, everything headless and invisible (no headed browser, no new windows, no pointer capture,
  nothing that takes focus), no GPU or visual checks.

## Goal
e2e-coop, e2e-netmove and e2e-ctcourse pass alone and in a full run, then leave KNOWN_FLAKY. One PR to master.

## Plan (report section 2)
1. `e2e-net-lib.mjs`: waits on the pages' own sim clocks (`__app.current.time`) instead of wall time, a wall cap as the
   hang guard; used by e2e-coop, e2e-netmove, e2e-ctcourse and e2e-course for every wait on a game action.
2. Two-page suites at 960 x 480.
3. Every two-page timeout prints both sims' clocks, sim rate and fps.
4. e2e-netmove's walk-off: clear the crouch toggle before walking off.
5. e2e-coop: its match in Free Roam or Course instead of Hunter (`?legacy=1`).
6. e2e-coop and e2e-netmove leave KNOWN_FLAKY after 3 solo and 2 full runs (laptop full runs count).

## Limits
- Test scripts only. A failure that is a game bug: stop and tell the orchestrator; never fix game code here.
- e2e-ctcourse: CT Core owns its course content; this job owns its waits. Anything else in that file: ask the
  orchestrator first.
- CT Core's wall-entry placement (0.75 m from the face, slice A) wins any conflict in e2e-netmove, e2e-mouse,
  e2e-stealth-ai, anim-audit and anim-sheet.

## Decisions
Michael: M1 the laptop runs this job's e2e (above).

Assumed:
- **A1 e2e-coop's matches are Infiltration (the Ledger) and Free Roam, not Course.** The hit, kill-credit, takedown,
  grab and revive checks need guards; Free Roam and Marlow Yard have none. Infiltration is not parked: it is the
  legacy-off default mode (`src/core/legacy.ts:22`, `defaultMode(false)` = `'infiltration'`; the co-op lobby lists it
  without `?legacy=1`), and it reads the mission data in `src/game/missions.ts`, not the parked Mission mode
  (`missionMode.ts`). The Ledger only gives bonuses for staying undetected, so the shots never end the match. The
  orchestrator's condition (2026-10-19): keep Infiltration only if it runs legacy-off and is not gated by the parked
  Mission framework; it does both. Undo: run the lobby, revive, leave, malformed and offline checks in Course on
  `ctcourse`, and move the guard checks into an `e2e-coop:legacy` part.
