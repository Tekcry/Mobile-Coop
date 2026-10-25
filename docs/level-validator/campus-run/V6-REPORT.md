# V6 report - campus greybox measurement (level-validator V6e-2)
Owner: Marlow Build. Status: current.

Re-measured on master by validator-port S10 on 2026-10-25, base `17871b9fe` (branch `feature/validator-port-s10`). The
five campus graphs carry V6's positions (`area`, `vantage.at`, link `at`) and were measured with
`node scripts/level-measure.mjs docs/sector-redesign/graph/campusOps-S1.json ... campusOps-S5.json --write`
(doors open,
`docs/design/metrics.json` rules: shadow 0.40-0.60, vantage >= 0.70, LOS break <= 5 s, reach <= 15 s, walk 1.3 m/s, run
3.0 m/s). The shadow share is INFO, never an ERR (G329; validator-port BRIEF A4; Sector Ops conformance L13,
`docs/conformance-sector-ops/CONFORMANCE.md:135`). The campus is AS BUILT: the misses below are the greybox's, not the
tool's, and no fix to the campus is part of this report. After this PR every campus re-measure belongs to J17's SW-<N>
PRs (validator-port PLAN section 7).

## Run

| Step | Time |
| --- | --- |
| Build campusOps | 1.1-2.0 s |
| Runtime nav | 0.8-1.1 s |
| Light bake (one for the whole map, doors open) | 114-121 s |
| Measure, all five files merged and measured once (includes the bake) | 144-150 s |
| Whole CLI run | 2 min 28 s - 2 min 35 s |
| Drift test (`tests/levelMeasureCampus.test.ts`) | 144 s |

Cloud container, 4 CPUs shared with another builder. The CLI merges the five files (`mergeGraphs`, file order), builds
and bakes once, and writes each file only its own spaces and links, so the measure has no per-section time. A second
`--write` left all five files byte-identical (deterministic).

Hand edits to the graphs (kept from V6): link `at` on two drops that reported several gaps. S4 `s4-baskets -> s4-hall`
at `[14, 4.4, 41.3]` (B-N centre line near x 14) and S5 `s5-gal -> s5-hall` at `[-47.5, 4.2, 23.5]` (west arm beside
the void rail). Both drops still measure `time_s: null`: a drop of that height is not a guard nav link. Every
`measured` and `meta.measured` member is the CLI's output. None of the five graphs is `campaign` mode, so there are no
`ways_back`.

## Verdict

25 encounter spaces. Against the two targets that are errors (vantage at least 0.70, LOS break at most 5 s): 12 miss
the vantage target, 13 pass, and none misses the LOS break. The shadow share is information: 19 spaces sit outside
0.40-0.60 and 6 inside; only `s1-dyard`, `s2-foyer` and `s4-lobby` are inside the band and meet the vantage and LOS
targets as well. `s4-yard` measures a vantage of 0.70 after rounding (just under it before), so the validator, which
reads the stored value, does not flag it and `level-measure --check` does. Splits: none of the five graphs tags a split
leg (`split:<id>:a|b`), so `meta.measured.splits` is `{}` in each file and no revive reach was measured.

The pattern: lit interiors read far too bright (shadow 0.00-0.05 in the gatehouse, test hall, dock, kitchen,
facilities, ante), the exterior, roofs and L1 office floors read far too dark (0.77-0.98), and the vantages from the
pinned points see much less than declared.

Worst offenders (score = vantage shortfall x 10 + seconds over the LOS limit; shadow is not scored):

1. `s5-garden` (S5, score 7.0): sees 0.00 < 0.7; shadow 0.93 (INFO)
2. `s5-terrace` (S5, score 6.6): sees 0.04 < 0.7; shadow 0.67 (INFO)
3. `s1-carpark` (S1, score 4.5): sees 0.25 < 0.7; shadow 0.39 (INFO)
4. `s2-l1-wing` (S2, score 4.3): sees 0.27 < 0.7; shadow 0.87 (INFO)
5. `s2-l1-plan` (S2, score 4.2): sees 0.28 < 0.7; shadow 0.77 (INFO)
6. `s3-hall` (S3, score 4.0): sees 0.30 < 0.7; shadow 0.05 (INFO)
7. `s5-lawn` (S5, score 3.6): sees 0.34 < 0.7; shadow 0.80 (INFO)
8. `s5-arch` (S5, score 1.7): sees 0.53 < 0.7; shadow 0.98 (INFO)
9. `s1-forecourt` (S1, score 1.4): sees 0.56 < 0.7
10. `s4-hall` (S4, score 1.2): sees 0.58 < 0.7
11. `s2-hall` (S2, score 0.4): sees 0.66 < 0.7
12. `s4-deck` (S4, score 0.2): sees 0.68 < 0.7; shadow 0.92 (INFO)

Three worst spaces: `s5-garden` (dark 0.93, vantage 0.00 from the roof: nothing seen), `s5-terrace` (dark 0.67,
vantage 0.04), `s1-carpark` (vantage 0.25 from the canopy; shadow 0.39 just under the band).

## Measure-step errors (reported, not fixed)
- `s5-well`: 0 floor cells (its sill 0.5 is over the 0.45 nav step; V6e-1 note). Not measured.
- Small rooms (under 20 cells, "area suspect" by the rule, real small rooms per V6e-1): `s5-vest` 11, `s5-pass` 16,
  `s5-shaft` 6, `s5-core-r` 16.
- 21 links have 2+ gaps on the shared edge and no `at` (the tool picks the gap nearest both centres): S1 dyard ->
  plantroof ladder, pavilion -> forecourt drop; S2 foyer -> hall opening and the six core fire stairs (core-sw to
  l1-plan, l2-plan, roof; core-ne to l1-wing, l2-wing, roof); S3 c2 -> lobby, nstair -> view, nstair -> back, back ->
  store door; S4 sec -> noc, yard -> deck, riser -> baskets, baskets -> deck, baskets -> cage drop; S5 core-g ->
  core-1, core-1 -> core-r, arch -> cage pair gate. They need the lead's points (`at`).
- 10 more links have no walkable cell on the shared edge of their two areas, 3 touch `s5-well` or have no nav path
  (`s5-lowroof`), and 16 are kinds the nav grid does not model (window, coop_boost, five drops: S1 canopy -> forecourt,
  S4 baskets -> hall, S5 gal -> hall, roof -> garden, roof -> terrace). All keep their declared time. Of the 147
  links, 97 have a measured time.
- Drops are not nav edges: the guard nav links only 1.0-2.2 m drops, so a campus `drop` (or `ladder`) whose path takes
  no nav link of its own kind measures `time_s: null` and the declared `time_s` stays. The ladders that take their
  ladder link keep their times (tables below).

## Checks
- `node scripts/level-measure.mjs <five graphs> --check`: exit 1, **58 FAIL** lines, 0 DRIFT (tolerance 0.05 for
  fractions, 1.5 s for seconds): 19 shadow shares outside 0.40-0.60, 13 vantages below 0.70 (the 12 above and
  `s4-yard`), 26 measure-step errors (the 21 gap links, `s5-well`, and the four small rooms). `--check` fails on a
  target crossed by design, so it cannot exit 0 on the AS-BUILT campus (it counts the shadow band, which the validator
  prints as INFO). The drift gate is `tests/levelMeasureCampus.test.ts` (6 of 6 green, 144 s).
- `node scripts/level-validate.mjs docs/sector-redesign/graph/campusOps-S{1..5}.json` (the saved `run.txt`, the CLI's
  exact output) and the same with `--require-measured` print the same text: **139 ERR, 200 WARN**, 47 INFO (every
  space that needs `measured` has it, so the presence gate adds nothing). V6 measured on its own base and rules read
  180 ERR / 209 WARN. Each section file alone stops at the structure check (cross-section links name spaces of another
  file, and only S1 holds the `start` tag), so the real counts are the merged run. Lines naming a space of each section
  (a line naming two sections counts in both; 1 ERR and 2 WARN are map-wide: co-op links reach 6 of 25 encounters, the
  secret-approach share, no space tagged unavoidable):

| Section | ERR | of which measured | WARN | of which measured vs declared |
| --- | --- | --- | --- | --- |
| S1 | 14 | 2 | 28 | 7 |
| S2 | 39 | 3 | 45 | 1 |
| S3 | 24 | 1 | 35 | 3 |
| S4 | 25 | 2 | 38 | 6 |
| S5 | 37 | 4 | 55 | 9 |

What remains, by kind (139): routes, reach and pacing 73 (26 dead ends not tagged reward / objective, 12 no high
approach, 10 no loud, 5 no shadow, 9 too few approaches, 7 too few route kinds, 1 unreachable `s3-yard`, 1 section
with too few independent routes, the co-op reach line, one run of three high beats); declared targets 10 (8 declared
vantage below 0.7, 2 missing on `s5-kitchen`); measured targets 12 (all measured vantage below 0.7, the 12 above, no
other kind); sizes 44 (35 room class minimums, 5 encounter short sides under the 6.0 camera floor, 4 opening
widths). None is a tool error: they are the AS-BUILT campus's. The 47 INFO lines are 21 declared and 26 measured
shadow shares outside the band or apart from the declared value; the 26 measured-vs-declared WARN are 16 vantage and
10 LOS-break values more than 0.1 / 1.5 s from the declared target.

## S1 (campusOps-S1.json)

Encounter spaces, worst first (declared / measured). Verdict lists the ERR targets only (vantage, LOS break);
"INFO" marks a shadow share outside 0.40-0.60, which is information, not an error.

| Space | Cells | Shadow % | Vantage % (from) | LOS break s | Verdict |
| --- | --- | --- | --- | --- | --- |
| `s1-carpark` | 3363 | 0.20 / 0.39 INFO | 0.70 / 0.25 (s1-canopy) | 3.00 / 1.30 | ERR: sees 0.25 < 0.7 |
| `s1-forecourt` | 1369 | 0.50 / 0.58 | 0.75 / 0.56 (s1-canopy) | 5.00 / 2.24 | ERR: sees 0.56 < 0.7 |
| `s1-gatehouse` | 82 | 0.00 / 0.00 INFO | 0.40 / 0.94 (s1-verge) | 2.00 / 2.51 | PASS |
| `s1-dyard` | 217 | 0.40 / 0.43 | 0.80 / 0.99 (s1-plantroof) | 4.00 / 1.33 | PASS |

Splits: none (no space carries a `split:<id>:a|b` tag; `meta.measured.splits` is `{}`).

Links with a measured time (10 of 22). The rest have `time_s: null` and keep their
declared time. Not measured: 2 2+ gaps; 5 no gap on the shared edge; 5 off the nav grid.

| # | Link | Kind | Time s (declared / measured) | Length m / path m |
| --- | --- | --- | --- | --- |
| 1 | `s1-lane` -> `s1-gatehouse` | door | - / 8.28 | 8.50 / 10.76 |
| 4 | `s1-verge` -> `s1-lawn` | opening | - / 18.24 | 24.00 / 23.71 |
| 6 | `s1-lawn` -> `s1-carpark` | opening | - / 29.97 | 36.50 / 38.96 |
| 7 | `s1-lawn` -> `s1-forecourt` | opening | - / 19.99 | 26.50 / 25.99 |
| 9 | `s1-carpark` -> `s1-bins` | opening | - / 19.19 | 25.50 / 24.95 |
| 11 | `s1-dyard` -> `s1-forecourt` | opening | - / 17.76 | 23.00 / 23.09 |
| 13 | `s1-dyard` -> `s1-plantroom` | door | - / 3.88 | 5.50 / 5.04 |
| 14 | `s1-plantroof` -> `s1-canopy` | opening | - / 10.01 | 13.00 / 13.02 |
| 15 | `s1-plantroof` -> `s1-pavilion` | opening | - / 10.22 | 14.00 / 13.29 |
| 16 | `s1-canopy` -> `s1-pavilion` | opening | - / 4.09 | 5.00 / 5.32 |

## S2 (campusOps-S2.json)

Encounter spaces, worst first (declared / measured). Verdict lists the ERR targets only (vantage, LOS break);
"INFO" marks a shadow share outside 0.40-0.60, which is information, not an error.

| Space | Cells | Shadow % | Vantage % (from) | LOS break s | Verdict |
| --- | --- | --- | --- | --- | --- |
| `s2-l1-wing` | 673 | 0.95 / 0.87 INFO | 0.20 / 0.27 (s2-core-ne) | 1.20 / 1.07 | ERR: sees 0.27 < 0.7 |
| `s2-l1-plan` | 2404 | 0.80 / 0.77 INFO | 0.30 / 0.28 (s2-core-sw) | 3.60 / 2.30 | ERR: sees 0.28 < 0.7 |
| `s2-hall` | 2619 | 0.65 / 0.60 | 0.70 / 0.66 (s2-l1-plan) | 3.40 / 2.00 | ERR: sees 0.66 < 0.7 |
| `s2-foyer` | 428 | 0.70 / 0.56 | 0.95 / 0.93 (s2-post) | 2.00 / 1.67 | PASS |
| `s2-l1-facilities` | 111 | 0.05 / 0.00 INFO | 0.70 / 0.70 (s2-l1-wing) | 0.90 / 3.78 | PASS |

Splits: none (no space carries a `split:<id>:a|b` tag; `meta.measured.splits` is `{}`).

Links with a measured time (30 of 39). The rest have `time_s: null` and keep their
declared time. Not measured: 7 2+ gaps; 1 no gap on the shared edge; 1 off the nav grid.

| # | Link | Kind | Time s (declared / measured) | Length m / path m |
| --- | --- | --- | --- | --- |
| 1 | `s2-foyer` -> `s2-post` | door | - / 13.92 | - / 18.09 |
| 2 | `s2-foyer` -> `s2-plant-g` | door | - / 17.08 | - / 22.21 |
| 3 | `s2-post` -> `s2-mail` | door | - / 6.56 | - / 8.52 |
| 4 | `s2-post` -> `s2-core-sw` | door | - / 3.72 | - / 4.83 |
| 5 | `s2-mail` -> `s2-hall` | door | - / 16.95 | - / 22.04 |
| 6 | `s2-lift-g` -> `s2-hall` | door | - / 14.24 | - / 18.51 |
| 7 | `s2-store` -> `s2-hall` | door | - / 17.84 | - / 23.19 |
| 8 | `s2-hall` -> `s2-core-ne` | door | - / 17.99 | - / 23.38 |
| 9 | `s2-hall` -> `s2-l1-plan` | open_stair | - / 24.85 | 10.00 / 32.30 |
| 17 | `s2-l1-plan` -> `s2-l1-kitchen` | door | - / 15.44 | - / 20.07 |
| 18 | `s2-l1-plan` -> `s2-l1-print` | door | - / 18.97 | - / 24.66 |
| 19 | `s2-l1-plan` -> `s2-l1-meet4` | door | - / 24.34 | - / 31.64 |
| 20 | `s2-l1-plan` -> `s2-l1-mr1` | opening | - / 10.71 | - / 13.92 |
| 21 | `s2-l1-plan` -> `s2-l1-mr2` | opening | - / 13.80 | - / 17.95 |
| 22 | `s2-l1-plan` -> `s2-l1-mr3` | opening | - / 12.83 | - / 16.67 |
| 23 | `s2-l1-plan` -> `s2-l1-wing` | door | - / 31.21 | - / 40.58 |
| 24 | `s2-l1-plan` -> `s2-l1-wing` | door | - / 28.94 | - / 37.63 |
| 25 | `s2-l1-wing` -> `s2-l1-facilities` | door | - / 11.57 | - / 15.04 |
| 26 | `s2-l1-wing` -> `s2-l1-comms` | door | - / 6.92 | - / 9.00 |
| 27 | `s2-l1-wing` -> `s2-l1-se-meet` | door | - / 11.55 | - / 15.02 |
| 28 | `s2-l1-wing` -> `s2-l1-landing` | door | - / 3.89 | - / 5.05 |
| 29 | `s2-l1-wing` -> `s2-l1-landing` | door | - / 5.43 | - / 7.06 |
| 30 | `s2-l2-plan` -> `s2-l2-wing` | door | - / 28.69 | - / 37.30 |
| 31 | `s2-l2-plan` -> `s2-l2-wing` | door | - / 31.25 | - / 40.62 |
| 32 | `s2-l2-plan` -> `s2-l2-exec` | door | - / 11.79 | - / 15.33 |
| 33 | `s2-l2-plan` -> `s2-l2-exec` | door | - / 15.90 | - / 20.67 |
| 34 | `s2-l2-plan` -> `s2-l2-offa` | door | - / 15.90 | - / 20.66 |
| 35 | `s2-l2-plan` -> `s2-l2-offb` | door | - / 23.53 | - / 30.58 |
| 36 | `s2-l2-wing` -> `s2-l2-board` | door | - / 13.56 | - / 17.63 |
| 37 | `s2-roof` -> `s2-roof-plant` | door | - / 17.92 | - / 23.29 |

## S3 (campusOps-S3.json)

Encounter spaces, worst first (declared / measured). Verdict lists the ERR targets only (vantage, LOS break);
"INFO" marks a shadow share outside 0.40-0.60, which is information, not an error.

| Space | Cells | Shadow % | Vantage % (from) | LOS break s | Verdict |
| --- | --- | --- | --- | --- | --- |
| `s3-hall` | 1771 | 0.02 / 0.05 INFO | 0.45 / 0.30 (s3-c2) | 2.50 / 4.90 | ERR: sees 0.30 < 0.7 |
| `s3-dock` | 410 | 0.12 / 0.19 INFO | 0.75 / 0.91 (s3-nstair) | 2.00 / 1.28 | PASS |

Splits: none (no space carries a `split:<id>:a|b` tag; `meta.measured.splits` is `{}`).

Links with a measured time (13 of 20). The rest have `time_s: null` and keep their
declared time. Not measured: 4 2+ gaps; 2 no gap on the shared edge; 1 off the nav grid.

| # | Link | Kind | Time s (declared / measured) | Length m / path m |
| --- | --- | --- | --- | --- |
| 1 | `s3-lobby` -> `s3-hall` | door | - / 20.81 | 21.50 / 27.06 |
| 2 | `s3-hall` -> `s3-dock` | door | - / 18.10 | 22.00 / 23.53 |
| 3 | `s3-hall` -> `s3-nstair` | door | - / 12.25 | 16.00 / 15.92 |
| 4 | `s3-dock` -> `s3-nstair` | door | - / 10.73 | 12.50 / 13.95 |
| 7 | `s3-view` -> `s3-store` | door | - / 9.80 | 12.50 / 12.74 |
| 9 | `s3-view` -> `s3-writeup` | door | - / 10.31 | 12.50 / 13.41 |
| 10 | `s3-view` -> `s3-gown` | door | - / 7.35 | 9.00 / 9.55 |
| 11 | `s3-gown` -> `s3-clean` | opening | - / 3.46 | 5.00 / 4.50 |
| 12 | `s3-back` -> `s3-strip` | opening | - / 9.39 | 12.50 / 12.21 |
| 13 | `s3-strip` -> `s3-sec` | door | - / 5.12 | 6.00 / 6.66 |
| 14 | `s3-hall` -> `s3-walkway` | ladder | - / 30.96 | 30.50 / 40.25 |
| 15 | `s3-hall` -> `s3-walkway` | ladder | - / 31.44 | 30.50 / 40.87 |
| 18 | `s3-gallery` -> `s3-view` | door | - / 10.79 | 10.00 / 14.03 |

## S4 (campusOps-S4.json)

Encounter spaces, worst first (declared / measured). Verdict lists the ERR targets only (vantage, LOS break);
"INFO" marks a shadow share outside 0.40-0.60, which is information, not an error.

| Space | Cells | Shadow % | Vantage % (from) | LOS break s | Verdict |
| --- | --- | --- | --- | --- | --- |
| `s4-hall` | 1838 | 0.46 / 0.58 | 0.45 / 0.58 (s4-baskets) | 2.00 / 1.80 | ERR: sees 0.58 < 0.7 |
| `s4-deck` | 5078 | 0.95 / 0.92 INFO | 0.85 / 0.68 (s4-deck) | 3.00 / 1.33 | ERR: sees 0.68 < 0.7 |
| `s4-dock` | 362 | 0.00 / 0.01 INFO | 0.90 / 0.84 (s4-dock) | 2.00 / 3.89 | PASS |
| `s4-lobby` | 136 | 0.39 / 0.59 | 0.85 / 1.00 (s4-lobby) | 1.00 / 0.90 | PASS |
| `s4-batt` | 130 | 1.00 / 0.92 INFO | 0.80 / 0.95 (s4-batt) | 0.50 / 0.33 | PASS |
| `s4-yard` | 434 | 0.00 / 0.18 INFO | 0.80 / 0.70 (s4-yard) | 2.00 / 2.82 | PASS |

Splits: none (no space carries a `split:<id>:a|b` tag; `meta.measured.splits` is `{}`).

Links with a measured time (18 of 27). The rest have `time_s: null` and keep their
declared time. Not measured: 5 2+ gaps; 1 no gap on the shared edge; 3 off the nav grid.

| # | Link | Kind | Time s (declared / measured) | Length m / path m |
| --- | --- | --- | --- | --- |
| 0 | `s4-dock` -> `s4-svc` | door | - / 15.08 | 19.00 / 19.61 |
| 1 | `s4-dock` -> `s4-yard` | door | - / 18.16 | 23.50 / 23.61 |
| 2 | `s4-svc` -> `s4-lobby` | door | - / 2.72 | 4.00 / 3.54 |
| 3 | `s4-svc` -> `s4-batt` | door | - / 12.33 | 14.50 / 16.02 |
| 4 | `s4-lobby` -> `s4-mantrap` | door | - / 6.21 | 8.00 / 8.07 |
| 5 | `s4-mantrap` -> `s4-hall` | door | - / 11.08 | 12.50 / 14.40 |
| 6 | `s4-batt` -> `s4-hall` | door | - / 22.59 | 24.50 / 29.37 |
| 7 | `s4-batt` -> `s4-cc` | door | - / 5.02 | 7.00 / 6.52 |
| 8 | `s4-cc` -> `s4-hall` | door | - / 18.84 | 22.00 / 24.49 |
| 9 | `s4-cc` -> `s4-ups` | door | - / 7.70 | 10.00 / 10.01 |
| 10 | `s4-ups` -> `s4-hall` | door | - / 17.77 | 23.00 / 23.10 |
| 11 | `s4-hall` -> `s4-sec` | door | - / 14.42 | 19.50 / 18.75 |
| 12 | `s4-hall` -> `s4-nc` | door | - / 12.62 | 14.50 / 16.41 |
| 13 | `s4-sec` -> `s4-nc` | door | - / 13.46 | 17.50 / 17.50 |
| 14 | `s4-nc` -> `s4-riser` | door | - / 10.00 | 13.00 / 13.00 |
| 15 | `s4-yard` -> `s4-hall` | door | - / 17.86 | 22.50 / 23.22 |
| 24 | `s4-hall` -> `s4-cage` | door | - / 5.16 | 6.50 / 6.71 |
| 25 | `s4-hall` -> `s4-cage` | pair_gate | - / 11.73 | 11.50 / 15.24 |

## S5 (campusOps-S5.json)

Encounter spaces, worst first (declared / measured). Verdict lists the ERR targets only (vantage, LOS break);
"INFO" marks a shadow share outside 0.40-0.60, which is information, not an error.

| Space | Cells | Shadow % | Vantage % (from) | LOS break s | Verdict |
| --- | --- | --- | --- | --- | --- |
| `s5-garden` | 1040 | 0.15 / 0.93 INFO | 0.85 / 0.00 (s5-roof) | 2.00 / 0.47 | ERR: sees 0.00 < 0.7 |
| `s5-terrace` | 868 | 0.25 / 0.67 INFO | 0.80 / 0.04 (s5-roof) | 2.00 / 1.00 | ERR: sees 0.04 < 0.7 |
| `s5-lawn` | 2984 | 0.90 / 0.80 INFO | 0.75 / 0.34 (s5-roof) | 3.00 / 1.17 | ERR: sees 0.34 < 0.7 |
| `s5-arch` | 207 | 1.00 / 0.98 INFO | 0.20 / 0.53 (s5-landing) | 1.50 / 0.17 | ERR: sees 0.53 < 0.7 |
| `s5-ante` | 87 | 0.00 / 0.02 INFO | 0.40 / 0.93 (s5-well) | 1.50 / 1.71 | PASS |
| `s5-hall` | 569 | 0.00 / 0.08 INFO | 0.25 / 0.98 (s5-back) | 2.00 / 2.47 | PASS |
| `s5-kitchen` | 204 | - / 0.00 INFO | - / - (None) | - / 2.28 | PASS |
| `s5-roof` | 2038 | 0.95 / 0.95 INFO | 0.75 / 0.71 (s5-core-r) | 3.50 / 1.37 | PASS |

Splits: none (no space carries a `split:<id>:a|b` tag; `meta.measured.splits` is `{}`).

Links with a measured time (26 of 39). The rest have `time_s: null` and keep their
declared time. Not measured: 3 2+ gaps; 2 s5-well has no floor; 1 no gap on the shared edge; 1 no
nav path from s5-lowroof; 6 off the nav grid.

| # | Link | Kind | Time s (declared / measured) | Length m / path m |
| --- | --- | --- | --- | --- |
| 0 | `s5-lobby` -> `s5-back` | door | - / 4.64 | 6.50 / 6.04 |
| 1 | `s5-lobby` -> `s5-kitchen` | door | - / 7.32 | 9.00 / 9.52 |
| 2 | `s5-lobby` -> `s5-plant` | door | - / 5.02 | 7.00 / 6.53 |
| 3 | `s5-kitchen` -> `s5-terrace` | door | - / 19.71 | 9.00 / 25.63 |
| 4 | `s5-back` -> `s5-hall` | door | - / 10.45 | 9.50 / 13.59 |
| 5 | `s5-back` -> `s5-vest` | door | - / 5.30 | 7.00 / 6.89 |
| 6 | `s5-vest` -> `s5-ante` | door | - / 3.44 | 4.00 / 4.48 |
| 7 | `s5-back` -> `s5-core-g` | door | - / 9.62 | 13.00 / 12.51 |
| 10 | `s5-core-1` -> `s5-landing` | door | - / 3.08 | 6.00 / 4.00 |
| 11 | `s5-core-r` -> `s5-roof` | door | - / 10.07 | 13.50 / 13.10 |
| 12 | `s5-landing` -> `s5-arch` | door | - / 9.27 | 12.50 / 12.05 |
| 13 | `s5-arch` -> `s5-gal` | door | - / 9.22 | 10.00 / 11.99 |
| 14 | `s5-gal` -> `s5-board` | door | - / 8.28 | 11.00 / 10.77 |
| 15 | `s5-gal` -> `s5-ceo` | door | - / 9.74 | 11.00 / 12.67 |
| 16 | `s5-hall` -> `s5-gal` | open_stair | - / 9.28 | 12.50 / 12.06 |
| 18 | `s5-hall` -> `s5-pass` | door | - / 6.73 | 9.00 / 8.75 |
| 19 | `s5-pass` -> `s5-draw` | door | - / 5.36 | 6.50 / 6.97 |
| 20 | `s5-draw` -> `s5-garden` | door | - / 13.29 | 15.50 / 17.28 |
| 21 | `s5-garden` -> `s5-terrace` | door | - / 26.07 | 16.00 / 33.89 |
| 22 | `s5-terrace` -> `s5-lawn` | door | - / 12.65 | 16.00 / 16.45 |
| 23 | `s5-terrace` -> `s5-lawn` | door | - / 28.38 | 33.00 / 36.90 |
| 24 | `s5-hall` -> `s5-ante` | door | - / 7.35 | 9.50 / 9.56 |
| 25 | `s5-ante` -> `s5-strong` | door | - / 4.26 | 6.00 / 5.54 |
| 27 | `s5-ante` -> `s5-shaft` | door | - / 2.82 | 4.50 / 3.66 |
| 28 | `s5-shaft` -> `s5-cage` | ladder | 6.00 / 5.23 | 5.00 / 6.79 |
| 32 | `s5-ctl` -> `s5-hall` | door | - / 7.60 | 9.00 / 9.89 |

