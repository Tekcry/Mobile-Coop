# marlow-bunker - state

## Now
Resumed (orchestrator, 2026-10-21 ~07:30, Michael chose "Marlow variety"). The variety pass (the polish list below,
`docs/marlow-variety/`) is folded into this PR: feature/marlow-bunker is fast-forwarded to the marlow-variety head.
Character Build runs check + the full e2e on the new head; GPU look pending a PC run.

## Next
- The orchestrator reviews and merges; the GPU look on Michael's PC (`npm run e2e:gpu`, a ctcourse contact sheet with
  `scripts/shots-ctcourse.mjs`, port 4189): the ceilings, the fittings, the floor between the pools under the slabs
  (LIGHT.md parity risk), the camera under the 3.2 m airlock lids and the 4.5 m low cells.

## Open
- Render parity under the slabs (LIGHT.md): voxel surfaces take the sky bake's fill, near 0 under a ceiling. Measure on
  the PC; if the floor between the pools reads darker than its 0.30 meter value, the fix is in the renderer (the ambient
  grid as the voxels' fill under a roof), not this map.

## Test results (desktop, software GL, port 4191, 2026-10-21)
- `npm run check` at 54fa3dbf: lint 0 errors, 190 files / 2096 unit tests pass, build ok. After the master merge (b0023d44, CHANGELOG only): typecheck and the ctcourse / light / guard tests pass.
- `E2E_JOBS=2`: smoke ok (40 s), e2e-levels ok, e2e-anchors ok, e2e-lightbake ok (157 s). e2e-ctcourse named whole: stations 1-5 passed, then killed by the 600 s suite limit; as its three parts at `E2E_JOBS=2`: part 3 ok (346 s), parts 1 and 2 killed at 600 s with no failed assert.
- `E2E_JOBS=1`: e2e-ctcourse:1 ok 343 s (master 6a4fb07f on the same machine: 310 s, +11%; likely the ceilings: the upper screen is now geometry through the lamp shader, not sky, in software GL), e2e-ctcourse:2 ok 389 s. The times file says 110-130 s per part: this machine ran slower tonight on master too.
- Risk for the full run: the ctcourse parts at `E2E_JOBS=2` can reach the 600 s limit here; the orchestrator's full run decides (laptop or a quiet desktop).

## Polish list (built by marlow-variety, folded into this PR; what is left: `docs/marlow-variety/STATE.md`)
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
