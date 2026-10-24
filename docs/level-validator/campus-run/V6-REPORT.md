# V6 report - campus greybox measurement (level-validator V6e-2)

Built 2026-10-24 by a cloud builder from `origin/feature/level-validator-v6` 220596bc (V6a-d, the `level-measure` CLI,
V6e-1 areas). The five campus graphs were measured with `node scripts/level-measure.mjs
docs/sector-redesign/graph/campusOps-S{1..5}.json --write` (doors open, `docs/design/metrics.json` rules: shadow
0.40-0.60, vantage >= 0.70, LOS break <= 5 s, reach <= 15 s, walk 1.3 m/s, run 3.0 m/s). The campus is AS BUILT: the
misses below are the greybox's, not the tool's (V6-PLAN "Campus will fail"). No fix to the campus is part of V6.

## Run

| Step | Time |
| --- | --- |
| Build campusOps | 1.2-1.5 s |
| Runtime nav | 0.6-0.8 s |
| Light bake (one for all five sections, doors open) | 110-115 s |
| Measure S1 / S2 / S3 / S4 / S5 | 2.3 s / 0.6 s / 0.3 s / 19.5-21.3 s / 2.9-3.2 s |
| Whole CLI run | 2 min 22-25 s (< 4 min target) |

(S1's logged "measured" time includes the shared bake. Cloud container, 4 cores, the VG3 builder running beside it.)
The bake is per map, not per section: the brief's "~150 s per section" is the one bake plus S1. A second `--write`
after pinning two link points left S1-S3 byte-identical (deterministic).

Graph edits by hand: link `at` on the two drops the lead named that reported 2+ gaps: S4 `s4-baskets -> s4-hall`
(5 gaps) at `[14, 4.4, 41.3]` (B-N centre line near x 14, the graph's reason; `S4_BOX.bN` campusS4.ts:104) and S5
`s5-gal -> s5-hall` (2 gaps) at `[-47.5, 4.2, 23.5]` (west arm beside the void rail, campusS5.ts:546). S5
`s5-roof -> s5-terrace` reported no gap ERR, so it is not pinned. Every `measured` / `meta.measured` member is the
CLI's output.

## Verdict

25 encounter spaces: **3 PASS** (`s1-dyard`, `s2-foyer`, `s4-lobby`), 22 FAIL. Splits: none of the five graphs tags a
split leg (`split:<id>:a|b`), so `meta.measured.splits` is `{}` in each file and no revive reach was measured, alone or
merged. The pattern: lit interiors read far too bright (shadow 0.00-0.05 in the gatehouse, test hall, dock, kitchen,
facilities), the exterior and L1 office floors read far too dark (0.77-0.98), and vantages from the pinned points see
much less than declared (best-cell vantage is not searched where `vantage.at` is pinned).

Worst offenders (score = band distance / 0.1 per fraction + seconds over the LOS limit):

1. `s5-garden` (S5, score 10.3): shadow 0.93 > 0.6; sees 0.00 < 0.7
2. `s3-hall` (S3, score 7.5): shadow 0.05 < 0.4; sees 0.30 < 0.7
3. `s5-terrace` (S5, score 7.3): shadow 0.67 > 0.6; sees 0.04 < 0.7
4. `s2-l1-wing` (S2, score 7.0): shadow 0.87 > 0.6; sees 0.27 < 0.7
5. `s2-l1-plan` (S2, score 5.9): shadow 0.77 > 0.6; sees 0.28 < 0.7
6. `s5-lawn` (S5, score 5.6): shadow 0.80 > 0.6; sees 0.34 < 0.7
7. `s5-arch` (S5, score 5.5): shadow 0.98 > 0.6; sees 0.53 < 0.7
8. `s1-carpark` (S1, score 4.6): shadow 0.39 < 0.4; sees 0.25 < 0.7
9. `s1-gatehouse` (S1, score 4.0): shadow 0.00 < 0.4
10. `s2-l1-facilities` (S2, score 4.0): shadow 0.00 < 0.4
11. `s5-kitchen` (S5, score 4.0): shadow 0.00 < 0.4
12. `s4-dock` (S4, score 3.9): shadow 0.01 < 0.4

Three worst spaces: `s5-garden` (dark 0.93, vantage 0.00 from the terrace: nothing seen), `s3-hall` (lit 0.05, the
landing sees 0.30 through the glass, declared 0.45), `s5-terrace` (dark 0.67, vantage 0.04).

## Measure-step errors (reported, not fixed)
- `s5-well`: 0 floor cells (its sill 0.5 is over the 0.45 nav step; V6e-1 note). Not measured.
- Small rooms (< 20 cells, "area suspect" by the rule, real small rooms per V6e-1): `s5-vest` 11, `s5-pass` 16,
  `s5-shaft` 6, `s5-core-r` 16 (`s4-mantrap` 20, at the limit).
- 21 links have 2+ gaps on the shared edge and no `at` (the tool picks the gap nearest both centres): S1 #12 dyard ->
  plantroof ladder, #20 pavilion -> forecourt drop; S2 #0 foyer -> hall opening, #11-16 the six core fire stairs; S3 #0
  c2 -> lobby, #5, #6 nstair, #8 back -> store door; S4 #16 sec -> noc, #17 yard -> deck, #18 riser -> baskets, #19
  baskets -> deck, #22 baskets -> cage drop; S5 #8, #9 core stairs, #29 arch -> cage pair gate. The brief allowed `at`
  pins only on the three named drops; the rest need the lead's points.
- Drops are not nav edges: the guard nav links only 1.0-2.2 m drops (navBuild.ts:11-12), so every campus `drop` was
  measured as the walk round by stairs or ladders (S1 canopy -> forecourt 43 s for a 12.5 m drop; S4 baskets -> hall
  49 s; S5 gal -> hall 22 s). **Fixed in the V6 fix round:** a `drop` (or `ladder`) whose nav path takes no nav link of
  its own kind now measures `{ time_s: null, why: 'drop not on the guard nav (1.0-2.2 m only)' }` and the declared
  `time_s` stays; all seven campus drops re-measured to null (tables below). The ladders keep their times (each path
  takes its ladder link).

## Checks
After the V6 fix round (checker FIX on 425c4e20; re-measured with `--write` on c9e520ed: bake 150-162 s, whole run
~2 min 50 s in the cloud container; only the seven drop links changed in the graphs):
- The target ERRs (shadow band, vantage minimum, LOS-break maximum) now apply to `encounter` spaces only, as
  graph-schema scopes them; connectors, stair cores, utility, exterior, objective and hub spaces keep only the drift
  WARN where they declare a target. Partner reach re-times a measured link from `path_m` at 3.0 m/s (it read the
  1.3 m/s `time_s`). Neither moves the campus reach counts (no split legs are tagged).
- `node scripts/level-measure.mjs <five graphs> --check`: exit 1, **58 FAIL** lines (was 128; encounter target misses
  only), 0 DRIFT (tolerance now 0.05 for fractions, 1.5 s for seconds). `--check` fails on a target crossed by design,
  so it cannot exit 0 on the AS-BUILT campus. The drift gate is `tests/levelMeasureCampus.test.ts` (5/5 green).
- `node scripts/level-validate.mjs <one section> --require-measured`: each section alone stops at the structure check
  (cross-section links name spaces of another file, and only S1 holds the `start` tag). The validator merges files
  ("one file per section"), so the real counts are the merged run below.
- `node scripts/level-validate.mjs docs/sector-redesign/graph/campusOps-S{1..5}.json --require-measured`: **180 ERR,
  209 WARN** (was 250 / 211; before V6e-2: 149 ERR / 173 WARN plain). Measured ERRs 31 (was 101: the 70 on
  non-encounter spaces are gone). Lines naming a space of each section (a cross-section link counts in both; 1 ERR is
  map-wide: co-op links reach 6 of 25 encounters):

| Section | ERR | of which measured | WARN | of which measured vs declared |
| --- | --- | --- | --- | --- |
| S1 | 18 | 4 | 30 | 9 |
| S2 | 47 | 6 | 46 | 2 |
| S3 | 28 | 3 | 35 | 3 |
| S4 | 34 | 6 | 43 | 11 |
| S5 | 53 | 12 | 57 | 11 |

What remains, by kind (180): routes, reach and pacing 73 (26 dead ends not tagged reward / objective, 12 no high
approach, 10 no loud, 5 no shadow, 9 too few approaches, 7 too few route kinds, 1 unreachable `s5-yard`, 1 section
with too few independent routes, the co-op reach line, one run of three high beats); declared targets 32 (21 declared
`shadow_pct` outside 0.4-0.6, 8 declared vantage below 0.7, 3 missing); measured targets 31 (18 shadow, 12 sees, 1
shadow on an encounter with no declared target); sizes 44 (35 room class minimums, 5 encounter short sides under the
6.0 camera floor, 4 opening widths). None is a tool error: they are the AS-BUILT campus's.

## S1 (campusOps-S1.json)

Encounter spaces, worst first (declared / measured; PASS = inside every target).

| Space | Cells | Shadow % | Vantage % (from) | LOS break s | Verdict |
| --- | --- | --- | --- | --- | --- |
| `s1-carpark` | 3363 | 0.20 / 0.39 | 0.70 / 0.25 (s1-canopy) | 3.00 / 1.30 | FAIL: shadow 0.39 < 0.4; sees 0.25 < 0.7 |
| `s1-gatehouse` | 82 | 0.00 / 0.00 | 0.40 / 0.94 (s1-verge) | 2.00 / 2.51 | FAIL: shadow 0.00 < 0.4 |
| `s1-forecourt` | 1369 | 0.50 / 0.58 | 0.75 / 0.56 (s1-canopy) | 5.00 / 2.24 | FAIL: sees 0.56 < 0.7 |
| `s1-dyard` | 217 | 0.40 / 0.43 | 0.80 / 0.99 (s1-plantroof) | 4.00 / 1.33 | PASS |

Splits: none (no space carries a `split:<id>:a|b` tag; `meta.measured.splits` is `{}`).

Links on the nav (declared / measured; 8 more are off-nav kinds with `time_s: null`, the validator keeps the declared time):

| # | Link | Kind | Time s | Length m / path m |
| --- | --- | --- | --- | --- |
| 1 | `s1-lane` -> `s1-gatehouse` | door | - / 8.28 | 8.50 / 10.76 |
| 4 | `s1-verge` -> `s1-lawn` | opening | - / 18.24 | 24.00 / 23.71 |
| 6 | `s1-lawn` -> `s1-carpark` | opening | - / 29.97 | 36.50 / 38.96 |
| 7 | `s1-lawn` -> `s1-forecourt` | opening | - / 19.99 | 26.50 / 25.99 |
| 9 | `s1-carpark` -> `s1-bins` | opening | - / 19.19 | 25.50 / 24.95 |
| 11 | `s1-dyard` -> `s1-forecourt` | opening | - / 17.76 | 23.00 / 23.09 |
| 12 | `s1-dyard` -> `s1-plantroof` | ladder | 13.00 / 14.77 | 15.50 / 19.20 |
| 13 | `s1-dyard` -> `s1-plantroom` | door | - / 3.88 | 5.50 / 5.04 |
| 14 | `s1-plantroof` -> `s1-canopy` | opening | - / 10.01 | 13.00 / 13.02 |
| 15 | `s1-plantroof` -> `s1-pavilion` | opening | - / 10.22 | 14.00 / 13.29 |
| 16 | `s1-canopy` -> `s1-pavilion` | opening | - / 4.09 | 5.00 / 5.32 |
| 19 | `s1-canopy` -> `s1-forecourt` | drop | - / null | 12.50 / - |
| 20 | `s1-pavilion` -> `s1-forecourt` | drop | - / null | 17.50 / - |

## S2 (campusOps-S2.json)

Encounter spaces, worst first (declared / measured; PASS = inside every target).

| Space | Cells | Shadow % | Vantage % (from) | LOS break s | Verdict |
| --- | --- | --- | --- | --- | --- |
| `s2-l1-wing` | 673 | 0.95 / 0.87 | 0.20 / 0.27 (s2-core-ne) | 1.20 / 1.07 | FAIL: shadow 0.87 > 0.6; sees 0.27 < 0.7 |
| `s2-l1-plan` | 2404 | 0.80 / 0.77 | 0.30 / 0.28 (s2-core-sw) | 3.60 / 2.30 | FAIL: shadow 0.77 > 0.6; sees 0.28 < 0.7 |
| `s2-l1-facilities` | 111 | 0.05 / 0.00 | 0.70 / 0.70 (s2-l1-wing) | 0.90 / 3.78 | FAIL: shadow 0.00 < 0.4 |
| `s2-hall` | 2619 | 0.65 / 0.60 | 0.70 / 0.66 (s2-l1-plan) | 3.40 / 2.00 | FAIL: sees 0.66 < 0.7 |
| `s2-foyer` | 428 | 0.70 / 0.56 | 0.95 / 0.93 (s2-post) | 2.00 / 1.67 | PASS |

Splits: none (no space carries a `split:<id>:a|b` tag; `meta.measured.splits` is `{}`).

Links on the nav (declared / measured; 1 more are off-nav kinds with `time_s: null`, the validator keeps the declared time):

| # | Link | Kind | Time s | Length m / path m |
| --- | --- | --- | --- | --- |
| 0 | `s2-foyer` -> `s2-hall` | opening | - / 15.04 | - / 19.56 |
| 1 | `s2-foyer` -> `s2-post` | door | - / 13.92 | - / 18.09 |
| 2 | `s2-foyer` -> `s2-plant-g` | door | - / 17.08 | - / 22.21 |
| 3 | `s2-post` -> `s2-mail` | door | - / 6.56 | - / 8.52 |
| 4 | `s2-post` -> `s2-core-sw` | door | - / 3.72 | - / 4.83 |
| 5 | `s2-mail` -> `s2-hall` | door | - / 16.95 | - / 22.04 |
| 6 | `s2-lift-g` -> `s2-hall` | door | - / 14.24 | - / 18.51 |
| 7 | `s2-store` -> `s2-hall` | door | - / 17.84 | - / 23.19 |
| 8 | `s2-hall` -> `s2-core-ne` | door | - / 17.99 | - / 23.38 |
| 9 | `s2-hall` -> `s2-l1-plan` | open_stair | - / 24.85 | 10.00 / 32.30 |
| 11 | `s2-core-sw` -> `s2-l1-plan` | fire_stair | - / 22.22 | 10.00 / 28.88 |
| 12 | `s2-core-sw` -> `s2-l2-plan` | fire_stair | - / 27.36 | 20.00 / 35.57 |
| 13 | `s2-core-sw` -> `s2-roof` | fire_stair | - / 30.42 | 29.50 / 39.55 |
| 14 | `s2-core-ne` -> `s2-l1-wing` | fire_stair | - / 42.57 | 10.00 / 55.34 |
| 15 | `s2-core-ne` -> `s2-l2-wing` | fire_stair | - / 81.83 | 20.00 / 106.38 |
| 16 | `s2-core-ne` -> `s2-roof` | fire_stair | - / 68.99 | 29.50 / 89.69 |
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

Encounter spaces, worst first (declared / measured; PASS = inside every target).

| Space | Cells | Shadow % | Vantage % (from) | LOS break s | Verdict |
| --- | --- | --- | --- | --- | --- |
| `s3-hall` | 1771 | 0.02 / 0.05 | 0.45 / 0.30 (s3-c2) | 2.50 / 4.90 | FAIL: shadow 0.05 < 0.4; sees 0.30 < 0.7 |
| `s3-dock` | 410 | 0.12 / 0.19 | 0.75 / 0.91 (s3-nstair) | 2.00 / 1.28 | FAIL: shadow 0.19 < 0.4 |

Splits: none (no space carries a `split:<id>:a|b` tag; `meta.measured.splits` is `{}`).

Links on the nav (declared / measured; 2 more are off-nav kinds with `time_s: null`, the validator keeps the declared time):

| # | Link | Kind | Time s | Length m / path m |
| --- | --- | --- | --- | --- |
| 0 | `s3-c2` -> `s3-lobby` | fire_stair | - / 21.70 | 28.50 / 28.21 |
| 1 | `s3-lobby` -> `s3-hall` | door | - / 20.81 | 21.50 / 27.06 |
| 2 | `s3-hall` -> `s3-dock` | door | - / 18.10 | 22.00 / 23.53 |
| 3 | `s3-hall` -> `s3-nstair` | door | - / 12.25 | 16.00 / 15.92 |
| 4 | `s3-dock` -> `s3-nstair` | door | - / 10.73 | 12.50 / 13.95 |
| 5 | `s3-nstair` -> `s3-view` | fire_stair | - / 13.52 | 16.50 / 17.58 |
| 6 | `s3-nstair` -> `s3-back` | fire_stair | - / 11.83 | 14.00 / 15.38 |
| 7 | `s3-view` -> `s3-store` | door | - / 9.80 | 12.50 / 12.74 |
| 8 | `s3-back` -> `s3-store` | door | - / 4.26 | 5.50 / 5.54 |
| 9 | `s3-view` -> `s3-writeup` | door | - / 10.31 | 12.50 / 13.41 |
| 10 | `s3-view` -> `s3-gown` | door | - / 7.35 | 9.00 / 9.55 |
| 11 | `s3-gown` -> `s3-clean` | opening | - / 3.46 | 5.00 / 4.50 |
| 12 | `s3-back` -> `s3-strip` | opening | - / 9.39 | 12.50 / 12.21 |
| 13 | `s3-strip` -> `s3-sec` | door | - / 5.12 | 6.00 / 6.66 |
| 14 | `s3-hall` -> `s3-walkway` | ladder | - / 30.96 | 30.50 / 40.25 |
| 15 | `s3-hall` -> `s3-walkway` | ladder | - / 31.44 | 30.50 / 40.87 |
| 18 | `s3-gallery` -> `s3-view` | door | - / 10.79 | 10.00 / 14.03 |

## S4 (campusOps-S4.json)

Encounter spaces, worst first (declared / measured; PASS = inside every target).

| Space | Cells | Shadow % | Vantage % (from) | LOS break s | Verdict |
| --- | --- | --- | --- | --- | --- |
| `s4-dock` | 362 | 0.00 / 0.01 | 0.90 / 0.84 (s4-dock) | 2.00 / 3.89 | FAIL: shadow 0.01 < 0.4 |
| `s4-deck` | 5078 | 0.95 / 0.92 | 0.85 / 0.68 (s4-deck) | 3.00 / 1.33 | FAIL: shadow 0.92 > 0.6; sees 0.68 < 0.7 |
| `s4-batt` | 130 | 1.00 / 0.92 | 0.80 / 0.95 (s4-batt) | 0.50 / 0.33 | FAIL: shadow 0.92 > 0.6 |
| `s4-yard` | 434 | 0.00 / 0.18 | 0.80 / 0.70 (s4-yard) | 2.00 / 2.82 | FAIL: shadow 0.18 < 0.4 |
| `s4-hall` | 1838 | 0.46 / 0.58 | 0.45 / 0.58 (s4-baskets) | 2.00 / 1.80 | FAIL: sees 0.58 < 0.7 |
| `s4-lobby` | 136 | 0.39 / 0.59 | 0.85 / 1.00 (s4-lobby) | 1.00 / 0.90 | PASS |

Splits: none (no space carries a `split:<id>:a|b` tag; `meta.measured.splits` is `{}`).

Links on the nav (declared / measured; 3 more are off-nav kinds with `time_s: null`, the validator keeps the declared time):

| # | Link | Kind | Time s | Length m / path m |
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
| 17 | `s4-yard` -> `s4-deck` | ladder | 33.00 / 34.49 | 41.00 / 44.84 |
| 18 | `s4-riser` -> `s4-baskets` | ladder | 16.00 / 23.02 | 20.00 / 29.92 |
| 19 | `s4-baskets` -> `s4-deck` | ladder | 33.00 / 39.52 | 42.00 / 51.38 |
| 22 | `s4-baskets` -> `s4-cage` | drop | 7.00 / null | 12.00 / - |
| 23 | `s4-baskets` -> `s4-hall` | drop | 12.00 / null | 18.00 / - |
| 24 | `s4-hall` -> `s4-cage` | door | - / 5.16 | 6.50 / 6.71 |
| 25 | `s4-hall` -> `s4-cage` | pair_gate | - / 11.73 | 11.50 / 15.24 |

## S5 (campusOps-S5.json)

Encounter spaces, worst first (declared / measured; PASS = inside every target).

| Space | Cells | Shadow % | Vantage % (from) | LOS break s | Verdict |
| --- | --- | --- | --- | --- | --- |
| `s5-garden` | 1040 | 0.15 / 0.93 | 0.85 / 0.00 (s5-roof) | 2.00 / 0.47 | FAIL: shadow 0.93 > 0.6; sees 0.00 < 0.7 |
| `s5-terrace` | 868 | 0.25 / 0.67 | 0.80 / 0.04 (s5-roof) | 2.00 / 1.00 | FAIL: shadow 0.67 > 0.6; sees 0.04 < 0.7 |
| `s5-lawn` | 2984 | 0.90 / 0.80 | 0.75 / 0.34 (s5-roof) | 3.00 / 1.17 | FAIL: shadow 0.80 > 0.6; sees 0.34 < 0.7 |
| `s5-arch` | 207 | 1.00 / 0.98 | 0.20 / 0.53 (s5-landing) | 1.50 / 0.17 | FAIL: shadow 0.98 > 0.6; sees 0.53 < 0.7 |
| `s5-kitchen` | 204 | - / 0.00 | - / - | - / 2.28 | FAIL: shadow 0.00 < 0.4 |
| `s5-ante` | 87 | 0.00 / 0.02 | 0.40 / 0.93 (s5-well) | 1.50 / 1.71 | FAIL: shadow 0.02 < 0.4 |
| `s5-roof` | 2038 | 0.95 / 0.95 | 0.75 / 0.71 (s5-core-r) | 3.50 / 1.37 | FAIL: shadow 0.95 > 0.6 |
| `s5-hall` | 569 | 0.00 / 0.08 | 0.25 / 0.98 (s5-back) | 2.00 / 2.47 | FAIL: shadow 0.08 < 0.4 |

Other spaces flagged: `s5-vest` (connector) 11 cells, area suspect; `s5-pass` (connector) 16 cells, area suspect; `s5-shaft` (utility) 6 cells, area suspect; `s5-well` (exterior) 0 cells, not measured; `s5-core-r` (stair_core) 16 cells, area suspect.

Splits: none (no space carries a `split:<id>:a|b` tag; `meta.measured.splits` is `{}`).

Links on the nav (declared / measured; 7 more are off-nav kinds with `time_s: null`, the validator keeps the declared time):

| # | Link | Kind | Time s | Length m / path m |
| --- | --- | --- | --- | --- |
| 0 | `s5-lobby` -> `s5-back` | door | - / 4.64 | 6.50 / 6.04 |
| 1 | `s5-lobby` -> `s5-kitchen` | door | - / 7.32 | 9.00 / 9.52 |
| 2 | `s5-lobby` -> `s5-plant` | door | - / 5.02 | 7.00 / 6.53 |
| 3 | `s5-kitchen` -> `s5-terrace` | door | - / 19.71 | 9.00 / 25.63 |
| 4 | `s5-back` -> `s5-hall` | door | - / 10.45 | 9.50 / 13.59 |
| 5 | `s5-back` -> `s5-vest` | door | - / 5.30 | 7.00 / 6.89 |
| 6 | `s5-vest` -> `s5-ante` | door | - / 3.44 | 4.00 / 4.48 |
| 7 | `s5-back` -> `s5-core-g` | door | - / 9.62 | 13.00 / 12.51 |
| 8 | `s5-core-g` -> `s5-core-1` | fire_stair | 7.00 / 6.54 | 8.50 / 8.50 |
| 9 | `s5-core-1` -> `s5-core-r` | fire_stair | 7.00 / 6.40 | 8.50 / 8.33 |
| 10 | `s5-core-1` -> `s5-landing` | door | - / 3.08 | 6.00 / 4.00 |
| 11 | `s5-core-r` -> `s5-roof` | door | - / 10.07 | 13.50 / 13.10 |
| 12 | `s5-landing` -> `s5-arch` | door | - / 9.27 | 12.50 / 12.05 |
| 13 | `s5-arch` -> `s5-gal` | door | - / 9.22 | 10.00 / 11.99 |
| 14 | `s5-gal` -> `s5-board` | door | - / 8.28 | 11.00 / 10.77 |
| 15 | `s5-gal` -> `s5-ceo` | door | - / 9.74 | 11.00 / 12.67 |
| 16 | `s5-hall` -> `s5-gal` | open_stair | - / 9.28 | 12.50 / 12.06 |
| 17 | `s5-gal` -> `s5-hall` | drop | - / null | 6.00 / - |
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
| 29 | `s5-arch` -> `s5-cage` | pair_gate | - / 2.46 | 3.00 / 3.20 |
| 32 | `s5-ctl` -> `s5-hall` | door | - / 7.60 | 9.00 / 9.89 |
| 33 | `s5-roof` -> `s5-garden` | drop | - / null | 19.00 / - |
| 34 | `s5-roof` -> `s5-terrace` | drop | - / null | 16.50 / - |
