# marlow-variety - state

## Now
Built and unit-tested (2026-10-21): all nine items (BRIEF.md) at 0f06c17a; a fresh checker is reviewing it.

## Next
1. The checker's findings: one fix round.
2. When #62 (marlow-bunker) merges: merge master into this branch, `npm run check`, open the PR to master.
3. Ask Character Build ("Night Shift | Character Build") for the full e2e on the PR head; copy the orchestrator.
4. Message the orchestrator when the PR is open.

## Open
- GPU look pending a PC run (with #62's: the ceilings, fittings and the floor between the pools under the slabs).

## Light
`tests/ctcourseLight.test.ts` (`CTLIGHT_PRINT=1`): all 196 points within 0.005 of marlow-bunker (80d49dd3) after the
racks moved (A4); the tuned-levels test (within 0.08 of course-ready) passes.

## Done
- 2026-10-21: `src/world/maps/ctcourseVariety.ts` (all items but the hazard stripes), hazard stripes in
  `ctcourseBunker.ts` `doorFrame`, the call in `ctcourse.ts`; `tests/ctcourse.test.ts` marlow-variety block (only the
  racks are solid: lip-free, over 1.8 m; the S1 grab area clear); element register rows in `CTCOURSE-SPEC.md`.

## Resume prompt
```
Job marlow-variety (Night Shift). Folder C:/NightShift/Mobile-Coop-marlow-variety, branch feature/marlow-variety (from
feature/marlow-bunker @ 80d49dd3). Read CLAUDE.md, docs/ROADMAP.md, docs/marlow-variety/BRIEF.md and STATE.md; carry on
from STATE "Next". Do not push to feature/marlow-bunker (#62 is under test).
```
