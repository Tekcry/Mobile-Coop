# Step T9 - dressing, readability, docs, REVIEW.md (Block D end)

Model: implementer opus, checker opus; the orchestrator writes REVIEW.md. Deps: T8.

## Read
- BAYS.md each bay's "Real purpose" and element register (736-791); section 14 (self-critique), 15 (playtest checklist)
- docs/story.md 28-58 (tone); SPEC.md (Future recommendations, Report format); REVIEW-NOTES.md; PC-PASS.md; LOG.md
- docs/level-design.md 16.10 (the 14 review questions)

## Task (decisions)
1. Dressing that tells the building's story, visual only (`box(..., collide false)` or `mark` overhead / noLedge): Cresset
   signage boards (lane numbers, "Bay 3 - Intake", hazard stripes on the drop pads), cable trays and conduit, the fan
   blades in B3, valve wheels and pipework in B4, genset detail in B5, desks and monitors in B6, the kill house's office
   clutter in B7, range flags and target stands in B8, the plot table's map and the cabin desks in B9, the airlocks'
   decontamination showers and status lamps. Nothing new collides; no lip appears (re-run the lip test).
2. Readability: every gate's device and every lit chokepoint is visible from where the player stands when it matters
   (the course radio line names it; the device has an emissive status LED: red locked, green open, from the course state).
3. `TESTING.md` "Fallow" section: per bay one line to try on desktop with the pad and one with mouse and keyboard; a
   two-player line (two tabs `?net=local`, then two PCs over the lobby).
4. Self-critique: re-run BAYS section 14 against what was built; fix what is cheap; list the rest.
5. Future recommendations (SPEC): one paragraph each.

## Orchestrator: REVIEW.md (BRIEF section 5)
Plain English, at most about 200 lines: what was built per block; the now / final state of every gate (table); every
assumption A1.. as a question with the recommended answer first; exceptions E5-E10 for confirmation; level-design 16.10
answered (14 lines); the two-player checklist (numbered, pad first); PC-PASS results with the items still for Michael;
blocked, deferred and flaky items; the switch-on sessions in the order features are expected (PLAN section 3).

## Checks
`timeout 900 npm run check`; full `npm run e2e` in the background; the perf trend; PC-PASS rows 4 and 5 re-shot after the
dressing (`E2E_GPU=1`).

## Commit
"training T9: dressing, readability, testing notes, REVIEW.md". STATE.md "Run complete". Final message per BRIEF 5.
