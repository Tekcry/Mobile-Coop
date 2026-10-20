# marlow-variety - state

## Now
Built, checked and fixed (2026-10-21). The orchestrator folded this job into #62: feature/marlow-bunker is fast-forwarded
to this branch's head, the CHANGELOG lines sit under #62's "Unreleased - marlow-bunker", and Character Build runs check +
the full e2e on the new #62 head. Nothing left on this branch; follow #62 (`docs/marlow-bunker/STATE.md`).

## Checker (fresh Opus, 2026-10-21): FIX, one round done
- Blocking, fixed: the lift's blast frame buried the lift's call panel and indicator; the frame now stands clear
  (jambs z 4.5-5.1 / 8.9-9.5, head from y 3.15).
- Polish, fixed: window paint in front of the plywood seams; no plywood behind the yellow leg-up band; trunking up to the
  ceiling; the desk screen on a stand; chevrons and rack LEDs on their faces; the booth door the comment promised; hazard
  stripes inside the jamb; the booth sill named in the baked-pieces comment.
- Polish, left: no plywood over the S5 door lintel (a concrete strip shows); `CT_W` / `bayX` / the S5 face and stair
  numbers are copied from `ctcourse.ts` (importing them would be circular; pass them in when this file grows).

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
