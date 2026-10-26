# Marlow Yard (ctcourse) - training validator run (validator-port S9)

Owner: Marlow Build. Status: current.

Job J12 validator-port, slice S9, 2026-10-25. Branch `feature/validator-port-s9`, cut from `feature/validator-port-c2`
(17871b9fe: PR C with PR B2). The graph is `docs/marlow-final/graph/ctcourse.json`; the saved run is `run.txt` in this
folder. Both validator runs and the measure ran headless in the cloud container (no browser, no GPU). The lead reruns
the `--check` on the desktop (see "Deviations and pending PC run").

## What the graph is

- v7's as-built graph (`origin/feature/level-validator-v7` 97873079): 55 spaces, 85 links, game version 4.103. It was
  written from `src/world/maps/ctcourse.ts` and `src/world/maps/ctcourseSets/*.ts`; where the code and
  `docs/marlow-final/SPEC.md` differ, the code wins (v7's list of differences stays on that branch).
- Moved here with three changes and nothing else:
  - `meta.mode` is `training` (v7 had `campaign`).
  - `meta.taught_by` is `A7`: A7 Data Hall is the last set that teaches a move on its own (SPEC.md:632 and the route
    summary at :754-765, where A8 is "Graduation").
  - Eight teach elements (table below), each citing its SPEC line in its `note`.
- No `requires_kill` and no `mark` anywhere: the course as built has none.
- J14's re-plan will rewrite this graph (BRIEF A16): this is "as built 4.103", the baseline the re-plan is measured
  against. `docs/level-validator/graph-sets.json` is not touched (the set joins the manifest in I-C).

### Teach elements (the eight)

| Section | Element | Value | SPEC line |
| --- | --- | --- | --- |
| A1 | link `a1-apron -> a1-walltop` (`coop_boost`) | `"teach":"leg-up"` | :371 (the handshake; E1 leg-up :379) |
| A2 | space `a2-neck`, tag | `teach:light-isolation` | :402 (timed light isolation) |
| A3 | space `a3-corridor`, tag | `teach:jam-relay` | :443 (the timed jam relay) |
| A4 | space `a4-secroom`, tag | `teach:camera-loop` | :487 (the security room's camera loop) |
| A5 | link `a5-apron -> a5-inner` (`coop_boost`) | `"teach":"partner-throw"` | :535 (partner throw with release) |
| A6 | link `a6-bridge -> a6-cage` (`drop`) | `"teach":"hang-down"` | :581 (the hang-down, gland plate) |
| A6 | link `a6-floor -> a6-gallery` (`team_rope`) | `"teach":"rope"` | :581 (the rope once, untimed) |
| A7 | link `a7-pod -> a7-hold-l7` (`pair_gate`) | `"teach":"synced-hack"` | :632 (split paths and a synced hack) |

A4's dual takedown is optional (SPEC P10 :976) and gets no element. A8 needs none (it is after `taught_by`).

## Commands and results

Default metrics `docs/design/metrics.json`. Times are this container's (4 CPUs shared with another build).
`<graph>` is `docs/marlow-final/graph/ctcourse.json`.

| Step | Command | Result |
| --- | --- | --- |
| Before the measure | `node scripts/level-validate.mjs <graph>` | 25 error(s), 73 warning(s) |
| Before the measure | the same with `--require-measured` | 36 error(s), 73 warning(s) |
| Route counts | `sectionRoutes` (A26) per section | A1 2, A2 2, A3 3, A4 3, A5 2, A6 1, A7 1, A8 1 |
| Measure, print only | `node scripts/level-measure.mjs <graph>` | exit 0; build 28 ms, nav 361 ms, bake 39.9 s |
| Measure `--write` | the same with `--write` | exit 0; build 42 ms, nav 379 ms, bake 38.7 s |
| Measure `--write` again | the same | exit 0; bake 38.8 s; file byte-identical |
| Measure `--check` | the same with `--check` | exit 1: 13 failure lines (below) |
| After the measure | `node scripts/level-validate.mjs <graph>` | **34 error(s), 83 warning(s)** |
| Saved run | `... --require-measured <graph> > run.txt` | **37 error(s), 83 warning(s)**, exit 1 |

- Each measure run took about 40 s end to end, almost all of it the light bake.
- The light bake is `doors open`; the graph's `meta.measured.geom` is `v83j27-1jwh0b5`, date 2026-10-25.
- The step 4 numbers (25 / 73, 36 / 73, route counts) matched the plan exactly, so the build went on.
- INFO lines in `run.txt`: 23 (16 light band, G329; 7 guard band).

### The measure tool's own ERR lines (graph findings, not stops)

- `ERR a1-walltop: area has no walkable floor cell within 1 m of storey 4.4`. The wall top is a co-op-only standing
  surface (v7 finding 3), so the nav grid has no floor there. Its links are untimed ("no area / floor cells").
- `ERR a1-cabin: only 10 floor cells (< 20): is the area right?`. The cabin is a 2.5 m box, as built.

### The `--check` failures (13; target misses are expected, A16)

- a2-neck: shadow 0.00 outside 0.40-0.60; sees 0.22 below 0.70.
- a4-secroom: shadow 0.00 outside 0.40-0.60; sees 0.00 below 0.70.
- a4-dock: shadow 0.31 outside 0.40-0.60.
- a5-inner: sees 0.50 below 0.70. a6-floor: sees 0.59 below 0.70. a7-hall: sees 0.10 below 0.70.
- a8-hall: sees 0.64 below 0.70. a8-office: shadow 0.02 outside 0.40-0.60.
- split a8: partner reach 16.54 s above 15.00 s.
- The two measure ERR lines above (a1-walltop, a1-cabin), counted as failures by `--check`.
- No LOS-break maximum is crossed (the largest is a8-office, 2.05 s, against 5 s). No drift: nothing was stored before.
- `--check` treats the shadow band as a failure; the validator treats it as INFO (G329). Both are reported here.

## Training result (A8, A9, A23, A26)

12 of the 37 ERRs are training checks. A8 counts only up to and including `taught_by` A7; A8 Strongroom is after it
and has 1 route, so A9's campaign route rules do not run on it.

| Section | Routes (A26) | Training ERRs |
| --- | --- | --- |
| A1 Gate | 2 | 2 routes (door to the yard, or over the wall top); `leg-up` avoided by the door route |
| A2 Carriage Shed | 2 | 2 routes (the neck, or the staging); `light-isolation` avoided by the staging |
| A3 Office Range | 3 | 3 routes (corridor, or through the offices, two ways); `jam-relay` is forced |
| A4 Goods Shed | 3 | 3 routes (aisle 2, straight to the dock, or the mezzanine); split `a4` before `taught_by` |
| A5 Substation | 2 | 2 routes (inner to trench direct, or the switchroom); `partner-throw` avoided |
| A6 Pump House | 1 | `rope` and `hang-down` both avoided (the stair and the walk-around reach the exit) |
| A7 Data Hall | 1 | split `a7` up to `taught_by` (the split is allowed only after it) |
| A8 Strongroom | 1 | none (split `a8` holds hall, gallery and office; one node) |

A4's `camera-loop` and A7's `synced-hack` are forced (no "avoided" ERR); no section lacks a teach element.

## ERR / WARN / INFO counts by rule, and what fixes each ERR

J14 rows are from `origin/feature/marlow-replan:docs/marlow-replan/PLAN.md` "Slices and PRs": G0 :254, G1 :440,
G-A1A7 :426, G-A2 :427, G-A3 :428, G-A4 :429, G-A5 :430, G-A6 :431, G-A8 :432. The same validator run on J14's
planned graph (`docs/marlow-replan/graph.json`) gives 4 ERR, all A8 office approaches (campaign route rules after
`taught_by` A6), and none of the 37 below. "Fixed by" names the slice that rebuilds that set or graph, not a promise.

| Rule | ERR | WARN | INFO | Fixed by (J14) |
| --- | --- | --- | --- | --- |
| Dimensions: class min, fire stair | 2 | 70 | | a4-secroom: none, graph modelling (J14 types it custom) |
| | | | | a8 fire stair: G-A8 :432 (stair 2.4 m; J14's graph has 1.3 m) |
| Level change missing (throws) | | 2 | | none: graph modelling (J14 swaps to the A25 kinds, G1 :440) |
| Declared vantage `sees_pct` < 0.7 | 6 | | | the bay's set slice, one each: A2 G-A2 :427, A4 G-A4 :429 |
| | | | | A5 G-A5 :430, A6 G-A6 :431, A7 G-A1A7 :426, A8 G-A8 :432 |
| Dead ends | 2 | | | a1-cabin: none, graph modelling (J14's graph tags it `reward`) |
| | | | | a4-dispatch: G-A4 :429 (J14's A4 has no dispatch space) |
| Splits (declared reading) | 3 | | | a4 legs: G-A4 :429 (one floor route, no split) |
| | | | | a7 rejoin: G-A1A7 :426 (J14's graph types the cage doors `door`) |
| | | | | a8 leg a: G-A8 :432 (J14's graph adds a solo gallery-west opening) |
| Pacing | 1 | 1 | | G-A8 :432 (a8 three high beats; J14's graph has no pacing ERR) |
| Measured `sees_pct` < 0.7 | 6 | | | the bay's set slice (as the declared vantage row), then G1 :440 |
| Measured vs declared (sees, LOS, time) | | 10 | | G1 :440 (re-declare from the built geometry) |
| Measured splits | 5 | | | a4 legs: G-A4 :429; a8 reach: G-A8 :432 |
| | | | | a7 and a8 no measured leg: validator reading: lead |
| Training: 2+ routes (A8) | 5 | | | A1 G-A1A7 :426, A2 G-A2 :427, A3 G-A3 :428, A4 G-A4 :429 |
| | | | | A5 G-A5 :430 |
| Training: teach avoided (A8) | 5 | | | A1 G-A1A7 :426, A2 G-A2 :427, A5 G-A5 :430, A6 (2) G-A6 :431 |
| Training: split before `taught_by` | 2 | | | a4 G-A4 :429; a7 G-A1A7 :426 (J14 sets `taught_by` A6) |
| Light band (G329) | | | 16 | none: INFO only (the lit-by-default rule, SPEC 7 / P4) |
| Guard band | | | 7 | none: INFO only (a set holds at most 3 guards) |
| **Total** | **37** | **83** | **23** | |

## Every ERR of the `--require-measured` run (37, as in `run.txt`)

- **Dimensions (2):** `a4-secroom` 6 x 6 below the security_room minimum 5.5 x 7; link `a8-office -> a8-lobby-outer`
  (fire_stair) 1.2 m below 1.3 m.
- **Declared vantage (6):** `a2-neck` 0.3, `a4-secroom` 0.4, `a5-inner` 0.35, `a6-floor` 0.6, `a7-hall` 0.3,
  `a8-office` 0.5, each below 0.7 (v7's hand estimates).
- **Dead ends (2):** `a1-cabin`, `a4-dispatch` (one way out, not tagged reward or objective).
- **Splits (3):** `a4` legs 37.5 s vs 20.7 s differ by 45% (max 20%); `a7` legs never rejoin; `a8` leg a has no solo
  link into `a8-gallery`.
- **Pacing (1):** three high beats in a row: `a8-hall`, `a8-gallery`, `a8-office`.
- **Measured `sees_pct` (6):** `a2-neck` 0.22, `a4-secroom` 0, `a5-inner` 0.5, `a6-floor` 0.59, `a7-hall` 0.1,
  `a8-hall` 0.64, each below 0.7.
- **Measured splits (5):** `a4` legs 37.5 s vs 20.7 s differ by 45%; `a7` has no measured `a_s` and no `b_s`;
  `a8` has no measured `a_s`; `a8` reach 16.5 s above 15 s. (The three "no measured" lines exist only under
  `--require-measured`: without it the validator says 34 errors.)
- **Training, 2+ routes (5):** A1 (2), A2 (2), A3 (3), A4 (3), A5 (2).
- **Training, teach avoided (5):** A1 `leg-up`, A2 `light-isolation`, A5 `partner-throw`, A6 `rope`, A6 `hang-down`.
- **Training, split before `taught_by` (2):** `a4`, `a7`.

Gone since v7 (the training profile does not run them): approaches and route kinds, routes cross, entry-to-exit
redundancy, co-op coverage, the "reached only through co-op links" ERRs, and the hard shadow band (now INFO, G329).

## Measured table (encounter spaces)

Declared is v7's hand estimate (still marked "ESTIMATE ... pending V6" in each note); measured is this run. Targets:
`vantage_min_frac` 0.7, `los_break_max_s` 5, shadow band 0.4-0.6 (INFO, G329). Each cell is declared / measured.

| Space | `shadow_pct` (INFO) | `sees_pct` (min 0.7) | `los_break_s` (max 5) |
| --- | --- | --- | --- |
| a2-neck | 0.05 / 0.00 | 0.30 / 0.22 below | 2.00 / 0.74 ok |
| a4-secroom | 0.00 / 0.00 | 0.40 / 0.00 below | 1.00 / 0.00 ok |
| a4-dock | 0.10 / 0.31 | 0.70 / 0.84 ok | 2.50 / 1.40 ok |
| a5-inner | 0.30 / 0.48 | 0.35 / 0.50 below | 3.00 / 0.83 ok |
| a6-floor | 0.40 / 0.59 | 0.60 / 0.59 below | 2.00 / 1.68 ok |
| a7-hall | 0.20 / 0.47 | 0.30 / 0.10 below | 1.50 / 1.17 ok |
| a8-hall | 0.30 / 0.58 | 0.80 / 0.64 below | 2.50 / 2.04 ok |
| a8-office | 0.00 / 0.02 | 0.50 / 0.86 ok | 2.00 / 2.05 ok |

- `a4-secroom` measures 0 for sight and LOS break: its vantage is L3's glass slot, a point in the previous section
  (modelling choice 7). Look at it on the desktop before trusting the 0.

### Splits (numbers from the graph's `meta.measured.splits`; reach limit 15 s)

| Split | Leg a, hand (v7) / measured | Leg b, hand (v7) / measured | Reach measured | Verdict |
| --- | --- | --- | --- | --- |
| a4 | 17 s / 37.53 s | 20 s / 20.73 s | 8.81 s | legs 45% apart (max 20%); reach ok |
| a7 | 16.5 s / not measured | 36.9 s / not measured | 9.62 s | no solo leg path through the team doors |
| a8 | 40.6 s / not measured | about 22 s plus a wait / 28.61 s | 16.54 s | leg a starts with the leg-up; reach FAIL |

- a4 leg a is 17 s by hand because v7 timed it at run pace (3.0 m/s, modelling choice 6). The measure walks every
  link at guard pace (about 1.3 m/s): the three leg-a links measure 11.95, 11.31 and 14.27 s against declared 5, 5.5
  and 6.5 s (the three measured-vs-declared time WARNs).
- a7 and a8 leg a have no measured time: a leg through a co-op link (`pair_gate`, `coop_boost`) is not on the nav grid.

## Modelling choices (deviations from the brief and the schema, each reversible)

1. **Holding rooms are spaces**, each the `exit` and `checkpoint` of the set before it.
   - The spine link is the holding room's far door into the next set's first space, so `a1-hold-l1` sits in A1.
   - SPEC 12 calls each holding room the next set's checkpoint. The tag is info only.
   - On the training profile the section route count (A26) is on the section's interior, so the one airlock door
     per section no longer caps the count at 1 (the entry-to-exit redundancy check is not run).
   - Undo: write the holding rooms as spine links (graph-schema lead decision 3, the campus convention).
2. **Service corridors and the plant room are not spaces.** `facility.ts:694-698` builds them as a closed void (SPEC 5:
   closed to players, behind locked doors that never open). The instructor gallery is out of bounds (sight only).
3. **Encounter = a play space with guards on the route** (the campus rule V5f-3, `campus-run/REPORT.md`).
   - Camera-only spaces are typed connector, with the camera in `note`: the A3 corridor, the A4 main aisle and the A8
     vault lobby.
   - A3 office 2 is typed connector: a private_office, a "no" class, 5.7 m wide.
   - A1 has no encounter: its checker is passive (`a1Gate.ts:218`; `rated` false, `ctcourse.ts:107`).
4. **Co-op moves with no schema kind (v7's stand-ins; the graph keeps them as built, and J14 swaps to the A25 kinds):**
   - Partner throw (A5, A8 beam curtains): written `coop_boost` with no `level_change` (2 WARN).
   - Hang-down (A6): written `drop` (lead decision 2).
   - Synced-hack doors (the A7 cage doors, the L7 near door, the A8 vault door): written `pair_gate`.
   - No link at all: the jam relay (A3), alternating isolation (A2), the console loop and the dual takedown (A4),
     and jam-and-pass (A5 / A8 beam panels). They are now named by `teach:` tags (A2, A3, A4); where one helps a
     split, it is named in an `assist` reason.
5. **Heights use collision, not dressing.** The hall roof is 10 m (`HALL_H`, `types.ts:110`). The A2 roof ties (7 m)
   and the A4 eaves (7.5 m) are visual skins, left out.
6. **Leg pace (A4).** Leg a's three links carry `time_s` at run pace (3.0 m/s), per SPEC a4-floor "Main aisle: move
   fast while the cameras are looped" (`a4GoodsShed.ts:401`). Leg b's links carry length / 1.3. The measure uses
   guard pace for both, which is why leg a measures 37.5 s (see Splits).
7. **`a4-secroom.vantage.from` names `a3-hold-l3`**, a space in the previous section: the vantage is L3's glass slot.
8. **Rounding** (campus convention): sizes and opening widths are rounded down to the 0.5 m grid, with the clear value
   in `note`. Lengths are the polyline from the space middle through the cited door point to the next middle, rounded
   to 0.5 (computed by a scratch generator, not committed).
9. **Measured (was "not run" in v7).** `level-measure --write` ran on this graph (see Commands and results): every
   encounter space, every walkable space and every walkable link has a `measured` block, plus `meta.measured` with the
   split numbers. Declared values were left as v7's estimates; the measure does not edit them (BRIEF A16: the course is
   as built). The two measure ERR lines are listed above.

## Deviations and pending PC run

- None from the brief's edits. The graph was edited only in the named members (`mode`, `taught_by`, eight teach
  elements) and by `--write`. No script, test, manifest or schema doc changed.
- `tests/levelGraphs.test.ts` has 2 failures (campus set) that are the same on the base 17871b9fe, so not from S9.
- Pending PC run: `node scripts/level-measure.mjs docs/marlow-final/graph/ctcourse.json --check` on the desktop (drift
  between this container's light bake and the desktop's, if any). Its expected failures are the 13 listed above.
