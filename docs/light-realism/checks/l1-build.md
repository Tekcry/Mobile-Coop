# light-realism L1 - build report
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 2 (Opus, cloud), 2026-10-25, resuming the old account's Cloud Builder 2 (steps
1-3, reopened at the 23:52 swap) from the branch head. Branch `feature/light-realism-l1`, cut from
`feature/light-realism-l0` 1cefe25e (no "Answer:" fix commit named). Brief `docs/light-realism/briefs/L1.md`; the
cloud changes from `cloud-queue` `briefs/light-realism-L1.md`. Bakes, measures and vitest ran on the cloud CPU.

## Verdict on the done lines
- `lux-grid.mjs --map campusOps --space park` (and `--section 1`): **PASS**, mean **27.93 lx** (14-35), open-ground
  minimum **3.38 lx** (3 or more), U0 0.121 (reported; 0.25 to verify). 0 open-ground cells under 3 lx; near cover 131
  (car 108, pole 15, other 8), every-cell minimum 0.70 lx. Lane (P2): **PASS**, 8.30 / 0.83 lx. Met.
- No bay row unlit by layout: the new `it` checks every 3 m grid point of the car park is within reach of two column
  light points. Met.
- No campusOps column or lane light point over its own pole: `ON_ITS_POST` has no campusOps column or lane entry; the
  new `it` passes. Circuits and switches unchanged in kind (two breakers, west / east); ambient zones, moon, engine,
  flags and `lux.ts` untouched (`git diff --stat 1cefe25e`: only owned files). Met.
- `SIGNOFF.md`: no "L1:" field left but the PR number; every linked file exists; the question word for word;
  calibration.md section 4 filled. Met.
- Step 4 / 5 vitest list green; the two laptop requests below. Met.

## Files and commits
- 8f920b69 step 1 (before files): `signoff/s1-heat-before.svg` (re-measured on the base: the fold's `park.svg` is outside
  the repo; mean 0.98 lx, min 0.37 lx, as the fold run); `measure/calibration.md` section 4 from
  `shots/light-realism-s1` `before-campusOps-s1-2026-10-25-10-18/` (1 meter-field split over 0.02: Low "far east"
  +0.021, to J11; the L5 targets table, advisory).
- a54f7a7b step 2 (`luxGrid.ts`, `lux-grid.mjs`): crop margin from the longest fixed-lamp reach + 1; open ground (cells
  within 0.6 m of a solid rising through the plane are near cover, cause car / pole / other; `min` open ground and
  `minAll`); dark-spot causes; `--lightmap`.
- d1c09d1c step 3: single-arm columns (6.2 m pole, 0.6 m arm at y 6.10-6.20, light point 0.8 m out at y 6.0), the lane
  floodlight the same (+x); `ON_ITS_POST` drops `campusOps:1..15`; the new `it`.
- 54ec0c1c step 4: 13 twin-head columns (26 heads) tuned to P11a; lane floodlight 0.8 -> 0.5; tests and the two meter
  points ("south row column" (-24, -71.5), "south island" (-19.2, -71.5)).
- ebcc1b43 step 5: `measure/campusOps-s1-after.json` + `campusOps-s1-after/*.svg`, `signoff/s1-lightmap.svg`,
  `signoff/s1-heat-after.svg`, `measure/S1-carpark.md`; `lux-grid.mjs` SVG folder follows `--out`; light-map legend
  wraps.
- 86fb41f8 step 6: `SIGNOFF.md`, `signoff/level-design-5.5.md`. Then this report.

## Probes (park, plane y 0.1, lux sum; layout chosen first on a scratch no-bake model with car and pole shadows)
| Probe | Layout | Mean / open min (lx) | U0 |
| --- | --- | --- | --- |
| Step 3 | 14 single heads on arms, i 0.9, r 12, outer 1.15 | 3.53 / 0.47 | 0.132 |
| 4a | 18 single heads, rows -53 / -62 / -71.5, i 1.6 / 2.4 / 2.0, r 12, outer 1.3 | 25.76 / 1.04 | 0.040 |
| 4b | 13 twins, north row -30.4 / -19.2 / -8 / 3.2, i 2.0, r 10, tilt 0.2, outer 1.3 | 29.65 / 3.38 | 0.114 |
| 4c | 4b, lane floodlight i 0.5 (4b lane 9.02 lx, over its 8.75 ceiling) | 29.63 / 3.38 | 0.114 |
| 4d | 4c, north row -33.2 / -24.8 / -13.6 / 0.4 (clear of a route point) | 27.93 / 3.38 | 0.121 |
Step 3 probe meter mean 0.524 at y 1.0 (PLAN section 0: about 0.50). Four tuning bakes (cap 6).

## Final numbers
- Columns (x, z, arms, circuit; every head i 2.0, r 10 (reach 16), tilt 0.2, outer 1.3): north z -53 at -33.2, -24.8,
  -13.6 (west), 0.4 (east); aisle z -62 at -33, -21 (west), -9, 3 (east); south z -71.5 at -36, -24.8, -13.6 (west),
  -2.4, 6 (east); arms west and east on each pole. West 16 heads, east 10. Worst 2 m lamp-grid column 18 of 24.
- Car park at y 1.0: mean level 0.282 -> 0.960, dark 52% -> 1%, lit 0% -> 97%.
- Other S1 spaces: none darker. Bins 0.83 -> 18.55 lx (now over its 4.4 lx ceiling), bikes +12%, smoke +60%, the rest
  within 1% (L2-S1's). Table: `measure/S1-carpark.md`.

## Tests
- `npm run typecheck:fast` clean (every code step).
- Steps 4 / 5 list (`campusS1`, `lampBoxAlign`, `sectionBakeCampus`, `lampGridLossless`, `lampAtlasFit`,
  `campusArtLight`, `campusS1Dress`, `campusDressRules`, `guardRelight`, `enemyLightsOut`, `lux`), `--maxWorkers=2`:
  11 files, 149 passed, 1 skipped. `tests/lux.test.ts` 17 / 17 after step 5.
- `luxGrid.ts` standalone strict (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, types node, vite/client,
  vite-plugin-pwa/client, `src/env.d.ts`): clean.
- `node scripts/doc-lint.mjs`: 0 errors.
- Pending PC run: every e2e and GPU leg (requests below).

## Deviations
1. **Twin-head columns.** Single-arm heads leave each pole's own shadow wedge at 1-2.5 lx (probe 4a 1.04 lx at best;
   a column 8-9 m away adds 0.2-1.5 lx in this engine). Each pole carries two heads on opposite arms (two entries at one
   x, z; one pillar drawn). Arms run along x (west and east). Undo: one entry per pole and accept the open-ground
   minimum near 1 lx, or move to P11b.
2. **Radius 10, not 12.** 26 heads at reach 19.2 m push the worst lamp-grid column past 24; reach 16 m keeps it at 18.
3. **North row moved off a route point.** Probe 4c's pole (-30.4, -53) put the S1 route point (-31, -53) off the nav
   grid (`campusS1.test.ts` routes test); poles now -33.2 / -24.8 / -13.6 / 0.4. The car-park patrol box (x -29..-21,
   z -66.2..-62.8) keeps 0.8 m from the aisle pole at (-21, -62), as the old (-22, -62) / (-28, -62) did.
4. **Lane floodlight 0.8 -> 0.5**, its own lamp only (fix 4): the east twin's spill took the lane over its ceiling.
5. **The overlap line on SIGNOFF.md** reads "brighter ... (most of the car park shows as fully lit)", not "a little
   brighter": 750 of 974 car-park cells show level 1.0 at 6.6-104 lx (`S1-carpark.md`, A14 overlap read). The picture,
   meter and guards see the car park as fully lit; the lead may want this on the page Michael reads.
6. **Fix 5 premise.** A fixed lamp's registry radius is already its reach (`LightRegistry.add` applies `lampReach`),
   so the crop margin and `touches` read `l.radius`, not `lampReach(l.radius)` again (step 2 commit).
7. **`lux-grid.mjs` SVG folder** follows `--out` (the step 5 run first wrote the after SVGs over the committed before
   set; restored).
8. Not touched (not owned): `calibration.md` line 13 still says the GPU before run "is still pending" (section 4 now has
   it); `SIGNOFF.md` Picture line 8 says "its 0.8 m arm" (twin arms now); the shots hand copy in `s1-shots.mjs` (PLAN
   L1, not in the brief). For the lead.

## Laptop requests for the lead (at the final head; the report commit on top of 86fb41f8 is docs only, so use the
branch head at the PR)
- GPU, alone slot: `node scripts/laptop-queue/request.mjs --sha 86fb41f8ce35ff8fb200efbb3d014451a4eef481 --set
  light-realism-l1 --requester "Night Shift | Sector Ops Build" --alone --step "serve scripts/light-realism/shots.mjs
  --map campusOps --section 1 --label after --presets low,epic --video 90 --push shots/light-realism-s1" --step "node
  scripts/run-e2e.mjs e2e-darkness --gpu"`
- e2e: `node scripts/laptop-queue/request.mjs --sha 86fb41f8ce35ff8fb200efbb3d014451a4eef481 --pr <n> --set
  light-realism-l1-e2e --requester "Night Shift | Sector Ops Build" --suites "e2e-sectorops e2e-lightbake e2e-levels
  e2e-anchors"` (part 6 runs the campusOps S1-S3 routes past the brighter car park; the patrol box and route points are
  checked by unit tests only).
