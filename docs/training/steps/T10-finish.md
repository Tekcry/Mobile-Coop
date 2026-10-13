# Step T10 - readability, light showcase, docs, REVIEW.md (Block D end)

Model: implementer opus, checker opus; the orchestrator writes REVIEW.md. Deps: T9b.

## Read
- BAYS.md each bay's "Real purpose" and element register (736-791); section 14 (self-critique), 15 (playtest checklist)
- docs/story.md 28-58 (tone); SPEC.md (Future recommendations, Report format); REVIEW-NOTES.md; PC-PASS.md; LOG.md
- docs/level-design.md 16.10 (the 14 review questions)

## Task (decisions)
1. Light and dark showcase (D23): walk each bay at Epic on this PC (`E2E_GPU=1` shots from each vantage and each lit
   chokepoint) and tune lamp placement, intensity and colour within each bay's plan so lit pools read as lit, dark
   pockets read as dark and the meter agrees (light parity); log every change; no tuning table changes.
2. Readability: every gate's device and every lit chokepoint is visible from where the player stands when it matters
   (the course radio line names it; the device has an emissive status LED: red locked, green open, from the course state).
3. `TESTING.md` "Fallow" section (desktop only, D24): per bay one line to try with the pad and one with mouse and
   keyboard; how to test alone (D21): the dev solo flag in the debug menu, and two tabs `?net=local`; then two PCs over
   the co-op lobby.
4. Self-critique: re-run BAYS section 14 against what was built; fix what is cheap; list the rest.
5. Future recommendations (SPEC): one paragraph each.

## Orchestrator: REVIEW.md (BRIEF section 5)
Plain English, at most about 200 lines, organised by the four goals (D23): fun (pacing, variety, co-op moments, the
questions for the playtest), co-op sync (every verb seen from the partner, the sync results), coverage (the per-player
report from T8b), light and dark (the shots and the light checks); then what was built per block; the now / final state of every gate (table); every
assumption A1.. as a question with the recommended answer first; exceptions E5-E10 for confirmation; level-design 16.10
answered (14 lines); the two-player checklist (numbered, pad first); PC-PASS results with the items still for Michael;
blocked, deferred and flaky items; the switch-on sessions in the order features are expected (PLAN section 3).

## Checks
`timeout 900 npm run check`; full `npm run e2e` in the background; the perf trend; PC-PASS rows 4 and 5 re-shot after the
dressing (`E2E_GPU=1`).

## Commit
"training T10: light showcase, readability, testing notes, REVIEW.md". STATE.md "Run complete". Final message per BRIEF 5.
