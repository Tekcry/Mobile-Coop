# Warehouse sections 2 and 3 - brief

Set by the orchestrator, 2026-10-20 (after #37 merged as 4.14.0). Branch `feature/warehouse-s23` from master cf73f8b5,
folder `C:/NightShift/Mobile-Coop-warehouse-s23`. Job lead: "Night Shift | Sector Ops Build". Lowest priority (M5): heavy
work only when `C:/NightShift/heavy.lock` is absent and CT Core is not waiting; logic suites to the laptop through the
orchestrator. One PR to master (a minor step). Prototype effort only (CLAUDE.md "Current goal").

## Michael's words
The warehouse-redesign job's M1-M6 (`docs/warehouse-redesign/BRIEF.md`) carry over: realistic building logic, a
free-flowing sandbox, several stealth routes per section, guard routes with a reason; "Loosen where needed"; lowest
priority. His notes from walking section 1 on /preview/ (4.14.0) come through the orchestrator and are added here as
M1 onward when they arrive.
- **M1** (2026-10-20 15:00, walking section 1, verbatim): "section 1 is ok, better than before at least but not perfect. Its
  hard to tell, the night vision is so poor. I cant see properly at night, and the bodies are very bright." The
  orchestrator: the direction holds; build section 2 the same way. Night vision is a separate job: no NV change here.
  A small follow-up in this PR: section 1's key routes and objective areas get enough lamp light to read without NV,
  with a light-field test of must-see points, as course-ready S2 did for Marlow Yard (`tests/ctcourseLight.test.ts`,
  `docs/course-ready/LIGHT.md`).

## Goal
Rebuild sections 2 (storage hall) and 3 (assembly hall, mezzanine, rear offices) as greybox prototypes to
`docs/warehouse-redesign/SPEC.md` 2.2 and 2.3, the way section 1 was built (SPEC 5): a build sheet per section first,
then the greybox, a fresh checker, at most one fix round, `npm run check` + e2e-sectorops (+ e2e-coop / e2e-netmove if
`src/game` or `src/net` change), then the full `npm run e2e` on the PR head. G155: no heavies or dogs (replaces
warehouse-redesign A5 once built).

## Level-standard loosenings
L1-L15 from `docs/warehouse-redesign/BRIEF.md` apply; any new one is logged here (what, why, how to undo).

## Assumed decisions (job lead; each with how to undo)
- **A1 (node_modules):** a junction to `C:/NightShift/Mobile-Coop-sector-restart`'s (dependencies identical to master's;
  `npm ci` is heavy). Undo: delete the junction and `npm ci` under the lock.
- **A2 (order):** the section 2 build sheet first; code for section 2 starts after Michael's section 1 notes are read (M1: go ahead), so
  a direction change costs a sheet, not a build. Undo: build without waiting.
