# marlow-final - STATE

## Now (2026-10-23 ~01:10, SAVED at the account swap, usage 94%)
In, committed: AUDIT.md, COOP-INVENTORY.md, CONSTRAINTS.md, ROUTE-DRAFT.md (all 4 step-1 reports), BRIEF M1-M6.
WIP, committed partial (the agents may have been mid-work at the swap; check each file's last section):
- SPEC.md (spec writer): partial; rerun the spec writer to finish SPEC.md and write PLAN.md (Next 1).
- KIT.md + scripts/facility-kit/ + src/world/kit/ + tests/facilityKit.test.ts + hooks in levelBuilder / doors /
  anchors / mapDef / world.ts + package.json (architecture kit agent, commit 93d1eab1): UNCHECKED. First run
  `npx tsc --noEmit` and `npx vitest run tests/facilityKit.test.ts`; if broken, fix or revert the hooks.
- LIGHTING-PLAN.md (lighting agent): partial.
- PROPS.md + scripts/facility-props/ + src/world/props/ (props agent): may be missing or partial.
Any of these missing or cut short: rerun that agent from "Agent briefs" (the props and lighting briefs are in the
RESUME of the session, summarised here: props = Blender headless props per set + placement helper + PROPS.md;
lighting = M6 rule review, per-set lit default / light groups / timed breakers / dark pockets, code and tests).
Course Ready's prep notes: origin/feature/marlow-bays docs/marlow-final-prep/ (MAP-AUDIT, DEVICE-INVENTORY, SCENARIOS).

## Next
1. Spec writer (one Opus agent): merges AUDIT, COOP-INVENTORY, ROUTE-DRAFT, CONSTRAINTS AND Course Ready's independent
   second opinions in `C:/NightShift/scratch/course-ready/marlow-final/` (MAP-AUDIT.md, DEVICE-INVENTORY.md with
   placement APIs / wire hooks, SCENARIOS.md; committed on origin/feature/marlow-bays docs/marlow-final-prep/,
   489d7c04 or newer: SCENARIOS has a 37-entry CT set-piece catalogue, an 8-area route proposal and the rule clashes for
   Michael - bible 5.8 no timers in stealth, G240 cameras see in the dark, G110 no rope climb) into `SPEC.md` (from `docs/templates/map-spec.md`) and `PLAN.md`
   (slices; whole slices marked for Course Ready, separate files). The spec must carry:
   - M4: no explainer pads; the objective list updates per area and guides both players (per-player lines on splits).
   - M5 + A5-A7: a facility look section (luxury training facility, instructor gallery behind glass, LED coves, sliding
     doors) and a lighting section (sufficient light to read the space; review the darkness rules; any loosening is a
     proposal for Michael, never applied).
   - Every standard item in CONSTRAINTS.md, with any loosening listed for Michael.
   Commit, push, message the orchestrator.
2. Build slices: greybox, lights baked, guards, one e2e route per slice; then dressing with the kit as each greybox
   passes (M5); checker + 1 fix round per slice; GPU suites (e2e-ctcourse :1-:3, course, coop, netmove), perf budgets
   and GPU shots per area via Character Build. Desktop e2e only when CPU < ~60% at the start.
3. Course Ready joins as the second builder (whole slices from PLAN.md).

## Open
- Merge master once train 12 (4.62.0) lands (branch is on af56ab43).

## Done
- 2026-10-23 ~00:20 job started: BRIEF.md (Michael's words, M1-M5, A1-A7), STATE.md; npm ci done in the worktree.
- ~00:30 step 1 agents and the art-kit agent started (max burn, 6 Opus agents allowed).

## Agent briefs (for a rerun)
- AUDIT: read-only; the current ctcourse map as built (areas in route order with coordinates, props, lights, guards,
  cameras, doors, anchors, ASCII plan), per area KEEP / REWORK / CUT with file:line, flow problems against
  docs/level-design.md, co-op actions used and unused, timings, ids the e2e suites and code rely on.
- COOP-INVENTORY: read-only; co-op mechanics in code (team moves, lights / breakers, cameras + security room, locks /
  hacks, jammer, laser panels, scanners, sync windows) with file:line and net sync; gaps vs Michael's list with the
  smallest prototype; 10-15 CT co-op scenarios from docs/ct-research; 8-12 proposed exercises (A / B jobs, sync, fail
  and retry, observe-then-plan, light parity, time).
- ROUTE-DRAFT: read-only; fiction frame (original names), 7-10 areas each a mock-up of a real site with its co-op
  exercises, escalation to a graduation area, connections without backtracking, ASCII plan, timing table 15-20 min.
- CONSTRAINTS: read-only; the level-design / template MUST and SHOULD checklist with sources, engine limits with
  numbers, the template section list, clashes with Michael's ask (solo-first vs G2 etc.), current map compliance.
- KIT: implementer; in-repo Blender (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, `-b` only, CC0
  textures only) generator for reusable luxury pieces (wall panel with LED cove, gallery glazing, double sliding door
  leaf + frame on the existing door logic, LED strip cove, floor trim, column cladding, handrail), a placement helper
  with a Vitest test, KIT.md; visual over the level builder's collision.

## Resume prompt
```
Night Shift | Menu Notes Build: resume marlow-final (top priority). Read CLAUDE.md, docs/ROADMAP.md (feature/menu),
then C:/NightShift/Mobile-Coop-marlow-final/docs/marlow-final/BRIEF.md and STATE.md (git pull first). Check which
step-1 files exist (AUDIT, COOP-INVENTORY, ROUTE-DRAFT, CONSTRAINTS, KIT); rerun any missing agent from "Agent briefs",
then run "Next" 1 (the spec writer), commit, push, message "Night Shift | Orchestrator", and build the slices.
Max burn: parallel Opus agents. Message the orchestrator at the spec and each slice.
```
