# marlow-bunker - state

## Now
Built and unit-tested (2026-10-21): all eight shortlist items (BRIEF.md). PR to master with the e2e results; GPU look
pending a PC run.

## Next
- The orchestrator reviews and merges; the GPU look on Michael's PC (`npm run e2e:gpu`, a ctcourse contact sheet with
  `scripts/shots-ctcourse.mjs`, port 4189): the ceilings, the fittings, the floor between the pools under the slabs
  (LIGHT.md parity risk), the camera under the 3.2 m airlock lids and the 4.5 m low cells.

## Open
- Render parity under the slabs (LIGHT.md): voxel surfaces take the sky bake's fill, near 0 under a ceiling. Measure on
  the PC; if the floor between the pools reads darker than its 0.30 meter value, the fix is in the renderer (the ambient
  grid as the voxels' fill under a roof), not this map.

## Polish list (not built: outside the approved shortlist, or cosmetic)
- The audit's station extras: S1 sentry desk behind the guard (z 1-2, keep x 2-10.5, z 2.5-5 clear) and a blast-door
  frame round the lift lobby; S3 monitor wall; plant rooms (louvres, trunking) in the south pockets and instructor
  booths (A3 / A4, `glass()`) in the north pockets; S5 plywood faces and painted window outlines; S6 pilaster-and-lintel
  scanner frames and server racks; S7 return stair as coloured training blocks; S8 6 m coffer with an LED ring over the
  exit; a frame on the S4 red release.
- Hazard stripes on the door frames (A1: kept off yellow).

## Done
- 2026-10-21: map (`src/world/maps/ctcourse.ts`, dressing `ctcourseBunker.ts`), unit tests (`tests/ctcourse.test.ts`
  bunker block, `tests/ctcourseLight.test.ts` fill and tuned-levels tests with `ctcourseLight.tuned.json`), spec fiction
  and element register (`docs/ct-prototype/CTCOURSE-SPEC.md`), walkthrough text, LIGHT.md.

## Resume prompt
```
Job marlow-bunker (Night Shift). Folder C:/NightShift/Mobile-Coop-marlow-bunker, branch feature/marlow-bunker, PR to
master. Read CLAUDE.md, docs/ROADMAP.md, docs/marlow-bunker/BRIEF.md, STATE.md and LIGHT.md. The build is done; what is
left is in STATE.md "Next" and "Open". Light changes are proved by tests/ctcourseLight.test.ts (CTLIGHT_PRINT=1).
```
