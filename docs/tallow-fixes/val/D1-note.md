# Tallow Wharf D1: the graph matches the build, validator runs
Owner: Campaign Build. Status: current.

J8 tallow-fixes slice D1 (Night Shift | Cloud Builder 4, 2026-10-26; brief `briefs/campaign-tallow-d1.md` on
`cloud-queue`; plan `docs/missions/slices/J8-J9-PLAN.md` on the engine: A10, A22, A29, A30, section 6 row D1, "D1 graph
matches the build", section 10). D0 set the design numbers (`D0-note.md`); D1 measured the built map (section 13, the
appendix) and wrote a number into the graph only where it is the same as D0's or better. Every worse number is listed
in section 8 as a section fix; none is written. Links are named `from>to` (A22).

**Two things D1 cannot clear (section 6):** the TGC split `tgc-leads` stays 2 ERR on J12's S11 validator (parity and
partner reach) and 1 ERR on master (`leg a: no solo link leads into w1-gallery`). Measured from the build, the legs are
further apart than D0's numbers, and there is no built solo way from the floor into leg a. Both need geometry, or a
J12 / J7 ruling.

## 1. Refs
- Base: `feature/tallow-fixes-2` 2de5701c0 (G1 + G2 + G3 + G4 merged). Branch `feature/tallow-d1`.
- Validators, extracted with `git archive` into a scratch folder and run with plain node:
  - master 78c241933
  - `feature/mission-validator` 0c62a921f
  - `<J12 ref>` = `feature/validator-port-c2` 8078660d6, extracted with `src/world/levelMeasure.ts`. It contains S7b
    (`git merge-base --is-ancestor origin/feature/validator-port-s7b` holds), S11 b2d2a2554 and A28. These outputs are
    saved as `D1-s11-*`, the LEAD NOTE's names.
  - `feature/validator-port-train` fede9015e: D0's J12 ref, rerun for the D0 -> D1 comparison.
- Every extract already had `docs/design/metrics.json`, so `metrics-gen` was not run.
- The TKL-state copy is the map graph with `w3-roof>w3-east-wing` set to `bolted: true`. It is scratch only and not
  committed.
- `D1-graph.diff` is `git diff 2de5701c0 -- docs/missions/prototypes/campaign-map/graph.json`.

## 2. Gate checks (brief step 1)
- `D0-note.md` exists.
- The log has `tallow G[1-4]:` commits: G1 3, G2 1, G3 4, G4 6 (14 in all).
- `dogs: 0` in all four sections (`tallowWharfSectors.ts`, lines 341, 363, 385 and 409 on the base).
- `npx vitest run tests/tallowWharf/ --maxWorkers=2` on the base: 7 files, 298 tests passed.

## 3. Validator runs (`docs/tallow-fixes/val/D1-*.txt`)
| File | Validator | Graphs | D0 ERR / WARN | D1 ERR / WARN |
| --- | --- | --- | --- | --- |
| `D1-master-map.txt` | master | map | 3 / 8 | 3 / 10 |
| `D1-master-map-tgc.txt` | master | map + TGC | 3 / 8 | 3 / 10 |
| `D1-master-map-tkl.txt` | master | map + TKL | 3 / 8 | 3 / 10 |
| `D1-master-tklstate.txt` | master | map, bulkhead `bolted: true` | 3 / 8 | 3 / 10 |
| `D1-master-tklstate-tkl.txt` | master | map (bulkhead bolted) + TKL | 3 / 8 | 3 / 10 |
| `D1-mission-validator-map.txt` | mission-validator | map | 2 / 8 | 2 / 10 |
| `D1-s11-map.txt` | validator-port-c2 (S11) | map | - (not run by D0) | 2 / 10 |
| `D1-s11-map-tgc.txt` | validator-port-c2 (S11) | map + TGC | - | 2 / 10 |
| `D1-s11-map-tkl.txt` | validator-port-c2 (S11) | map + TKL | - | 2 / 10 |
| `D1-s11-tklstate-tkl.txt` | validator-port-c2 (S11) | map (bulkhead bolted) + TKL | - | 2 / 10 |
| `D1-validator-port-train-map.txt` | validator-port-train | map | 3 / 9 | 3 / 11 |
| `D1-validator-port-train-map-tgc.txt` | validator-port-train | map + TGC | 3 / 9 | 3 / 11 |
| `D1-validator-port-train-map-tkl.txt` | validator-port-train | map + TKL | 3 / 9 | 3 / 11 |

Each validator prints the same ERR and WARN lines on all of its runs. On master, the TKL-state runs match the plain runs.

**ERR lines.**
- Master and train: the two named A22 lines, plus D0's ERR 2. The A22 lines are
  `link w2-pawn-loft -> w2-reading-room (team_throw): gap 4.9 m above the 2.7 m throw` and
  `link w2-arcade-roof -> w3-roof (team_throw): gap 4.9 m above the 2.7 m throw`. ERR 2 is
  `split tgc-leads leg a: no solo link leads into w1-gallery`; S11 is not on master yet.
- The pie link `w2-pie-loft>w2-clock-loft` has no exception and no ERR.
- Mission-validator: the two named throw lines only. Its text adds "(kit.throwDist 3.2 less the 0.5 m landing
  margin)". This is the known J12 item: its throw row has no long-throw exception. Named here, not fixed.
- S11 (J12's ref):
  - The two throws read as long-throw INFO ("long throw at an approved spot ... gap up to 4.9 m").
  - `split tgc-leads leg a: entered by link w1-canal-steps -> w1-gallery (coop_boost)` is INFO (A28).
  - Two ERRs stay: `split tgc-leads: legs 28.4 s vs 21.9 s differ by 23% (max 20%)` and
    `split tgc-leads: a downed partner at w1-tea-stall cannot be reached from the other leg`. See section 6.
- `checkCoop` is clean for `tkl-wings` on every run, the TKL-state runs included. It is not clean for `tgc-leads`.

**WARN lines (each with its reason, for P1's SPEC):**
- `room_class custom` x5: `w1-canal-steps`, `w2-arcade-roof`, `w3-roof`, `w3-chute`, `w4-boat`. Each note says why
  (no sheet class).
- `w3-chute: size 1.2 is off the 0.5 m grid`: the scale sheet's 1.2 x 1.5 crouch duct.
- Two lengths off the grid, both A5 door-to-door lengths kept at D0's values:
  - `link w2-pawn-loft -> w2-reading-room (door): length 12.4`, measured 12.35.
  - `link w2-lane-window -> w2-clock-loft (door): length 9.8`, measured 9.75.
- **New** `w2-pawn-loft: size 5.6 is off the 0.5 m grid`: the A28 cut-back. The loft is built z 62-67.6.
- **New** `w3-east-yard: 2 guards (2 players) below the early band 3-6`. Under A10 the yard holds two spawned guards.
  The lodge porter's post is in the lodge, so he counts in `w3-lodge`. D0's third was the former running-line guard
  (J7 R3).
- Train only: `metrics: sizes.throw_long is missing` (the J12 item D0 named).

## 4. Guard counts (step 3, A10)
Each guard counts in the graph space whose `area` holds his post on his storey (within 1 m). Every post lies in a
space but one: the front-hall watchman (W3:9, post (99, 68), the front hall). He counts in `w3-west-wing`, where 7.0 m
of his 9.0 m route lie.

| Section | Space | D0 | D1 | Guards (build index: role) |
| --- | --- | --- | --- | --- |
| W1 | w1-market | 4 | 4 | 0, 1 patrol; 2 lamp; 3 posted |
| W1 | w1-fish-hall | 3 | 3 | 4, 5 pair; 6 patrol |
| W1 | w1-tea-stall | - | 2 | 7, 8 pair (tgc-tea) |
| W2 | w2-arcade | 3 | 3 | 0 patrol; 1 posted; 2 patrol |
| W2 | w2-reading-room | 3 | 4 | 3 posted; 4 keeper; 5 reader; 6 courier (TGC only) |
| W2 | w2-pawn-loft | - | 1 | 7 decoy Fenn (TGC only) |
| W2 | w2-pie-shop | - | 1 | 8 decoy Garrow (TGC only) |
| W2 | w2-pie-loft | - | 1 | 9 clerk (TKL only) |
| W3 | w3-east-yard | 3 | 2 | 0, 1 patrol |
| W3 | w3-lodge | - | 1 | 2 porter |
| W3 | w3-east-wing | 4 | 4 | 3, 4 clerk; 5 patrol; 6 messenger |
| W3 | w3-west-wing | 3 | 3 | 7 clerk; 8 porter; 9 watchman |
| W4 | w4-shed-yard | 6 | 6 | 0, 1, 2 patrol; 3 posted; 4, 5 pair (TGC only) |
| W4 | w4-shed-three | 6 | 6 | 6 clerk; 7 posted; 8, 9 pair; 10 hand-truck; 11 foreman |

Section sums are W1 9, W2 10, W3 10, W4 12: the spawned counts. W1 runs in TGC only and W3 in TKL only
(`WHARF_GUARD_MISSIONS`). Every guards sentence uses the build's roles and `reason` text and marks "(TGC only)" or
"(TKL only)". `grep -ni "dog" graph.json` finds nothing.

`WHARF_GUARD_EXTRAS` is now `[]`. Its doc comment reads "none since J8 D1: the graph counts every spawned guard, A10".
The counts test title is now `counts: W1 9, W2 10, W3 10, W4 12; the graph's sums`, and its logic is unchanged.

## 5. Checkpoints (step 4)
- The build restarts W3 at the roof bulkhead stair's head: `W3_START` = `BULKHEAD_HEAD` (111.4, 8.4, 68), in
  `w3-roof`. `checkpoint` moves from `w3-east-yard`'s tags to `w3-roof`'s. The east yard's note drops
  "W3 checkpoint (TKL)", and the roof's note names the restart point.
- The other three match their `*_START` (no mismatch):
  - W1 `w1-canal-steps` (7, 0, 10)
  - W2 `w2-arcade` (42, 0, 55)
  - W4 `w4-back-lane` (90, 0, 32)

## 6. The TGC split `tgc-leads` (the LEAD NOTE)
**Parity.** "Door to door" follows D0's TKL convention: a leg starts at its first move off the fork and ends at its door
into the rejoin space.

| Legs | Leg a (Eyes: boost, gallery, office, the warden's stair) | Leg b (Ears: the tea stall) | Apart |
| --- | --- | --- | --- |
| Graph, unchanged (S11's sums) | 5 + 15.4 + 8 = 28.4 s | 6.9 + 15.0 = 21.9 s | 23% |
| Measured, door to door | 2.6 (boost) + 24.2 (31.4 m of gallery) + 15.3 (desk, stair, foot door) = 42.0 s | 0 + 16.0 (the tea stall's listening spot, out to the market) = 16.0 s | 62% |
| Measured, both legs from the start (7, 0, 10) to a meeting point under the clock (22, 0, 41, the coats) | 6.2 + 24.2 + 26.9 = 57.2 s | 3.9 + 38.6 = 42.5 s | 26% |

- Both measured pairs are more than 20% apart, so no TGC leg number was written (the brief's rule).
- The cause is in the geometry: leg a's 31.4 m gallery walk from the steps' boost lip to the office door takes 24.2 s
  by itself, and leg b's tea stall is 5 m from the start.
- G3's ~22.7 s / ~21.0 s (LEAD NOTE) cannot be reproduced from the built points. The lead can compare its method.

**Reach: no built link, so the ERR is real.**
- From the build, `soloNav` with the cage door and the warden's stair foot shut finds no path from the tea stall to
  the gallery or the office.
- S11 runs Dijkstra from the named space (`level-validate.mjs` `nearest(soloAdj, src, ...)`), so it walks from the tea
  stall up to leg a. Its message calls the named space the downed partner's. That is the wrong end.
- A scratch copy that walks from the other leg to the named space reports
  `a downed partner at w1-gallery cannot be reached from the other leg`. So the finding is real: B on the floor cannot
  reach A downed on the gallery or in the office while the cage door is bolted.
- The leg-a player does reach the tea stall: down the caged ladder (`w1-canal-steps>w1-gallery`), already in the graph.
  Its numbers are confirmed (section 7), so there is no link to add.
- Measured reach from the warden's desk to the tea stall at 3.0 m/s:
  - by the gallery and the caged ladder (slid down): **16.1 s**
  - by the warden's stair: **16.5 s**
  - Both are over 15 s (D0: 12.7 s on the graph's lengths). From the gallery's boost landing it is 4.6 s.
- Options for the lead (no geometry is changed in D1):
  - (a) J12, Marlow: S11 walks reach from the other leg to the downed partner, and fixes the message. The ERR then names
    `w1-gallery` (correct).
  - (b) J7, the BEAT: leg a opens the cage door on arrival ("A climbs down inside the ladder cage and unbolts its foot
    door for B", D0's line). The validator would need a state for "opened by the leg" (J12). Today the graph can only
    say `bolted`.
  - Geometry option 1 (G1): leave the warden's stair foot (7, 0, 44) on the latch. Remove `W1_BOLTS` slot 0 and unbolt
    `w1-market>w1-warden-office`. No new geometry. It fits LP pick 13 (the warden is out on his rounds, so nobody shot
    the bolt behind him). EGRESS row W1 0's "bolts it behind him" disagrees with that pick today.
    - It is a solo way up on route `loud`, so it is not a twin of the `high` boosts.
    - On the graph it gives 6.5 + 8 = 14.5 s from the tea stall. Measured, it is about 16.5 s, still over 15.
    - It is a solo way into the office and the gallery: the C1 boost stops being the only way up, which the lead or
      Michael must accept (G2, G292).
  - Geometry option 2 (G1): the cage door plain (unbolted) at (6.6, 0, 14.4). No new geometry. It is a solo twin of the
    canal-steps boost (route `high`, 6 m against 24.5 m), an ERR on a campaign map, so it only works if the BEAT drops
    C1 there.

## 7. Links, D0 -> D1 (step 5; lengths on the 0.5 m grid, exact values beside them)
"Same" means equal on the graph's grid. A worse value is not written; see section 8. Every touched link's `note` gains
"measured from the build (J8 D1, 2026-10-26)" with the numbers.

| Link (`from>to`, index) | Field | D0 | Measured | Graph now |
| --- | --- | --- | --- | --- |
| `w2-pawn-loft>w2-reading-room` door, E1 (70) | length / width | 12.4 / 1.2 | 12.35 (gate face z 67.6; 12.5 from the wall's centre line) / 1.2 | 12.4 / 1.2 (same) |
| `w2-lane-window>w2-clock-loft` door, E2 (71) | length / width | 9.8 / 1.2 | 9.75 / 1.2 | 9.8 / 1.2 (same) |
| `w2-arcade>w2-reading-room` open_stair, E3 (21) | length / time_s / width / level_change | 27 / 12 / 2.4 / 4.5 | 11.98 / 9.2 / **1.69** / 4.5 | 12 / 9.2 / 2.4 (kept: worse) / 4.5 |
| `w4-jetty>w4-canal-ledge` drop, E4 (72) | length / time_s / level_change | 6 / 3 / 4.4 | 3.05 / 3.0 (fall 0.7) / 4.4 (jetty top 0, bed -4.4) | 3 / 3 / 4.4 |
| `w1-canal-steps>w1-gallery` ladder, E5 (73) | length / time_s / level_change | 6 / 3 / 4.5 | 6.16 / up **10.0**, down 1.8 slid (7.6 climbed) / 4.5 (foot 0, top 4.5) | 6 (same) / 3 (kept: up worse) / 4.5 |
| `w2-lane-window>w2-arcade-roof` ladder, E6, the plant ladder (30) | length / time_s / width / level_change | 16 / 5 / 1.2 / 3.9 | 11.96 / **15.1** door to door (the climb alone 8.9) / 1.2 (hatch) / 3.9 | 12 / 5 (kept: worse) / 1.2 / 3.9 |
| `w2-arcade>w2-pawn-loft` fire_stair, E7 (22) | length / time_s / width | 14.5 / 8 / 1.3 | 10.29 / 7.9 / 1.3 | 10.5 / 7.9 / 1.3 |
| `w2-walkway>w2-pawn-loft` door, E8 (25) | length | 6.5 | 4.56 (C3's west landing to the loft door) | 4.5 |
| `w3-roof>w3-east-yard` fire_stair, E9 (33) | length / time_s / level_change | 31 / 14 / 8.4 | 16.83 / 12.9 / 8.4 | 17 / 12.9 / 8.4 |
| `w3-roof>w3-east-wing` fire_stair, E10 (34) | length / time_s / width | 21 / 14 / 1.3 | 19.2 / **14.8** / **1.2** | 19 / 14 (kept) / 1.3 (kept); unbolted, `bolted_in: ["twoKeyLedger"]` (A30) |
| `w2-walkway>w2-arcade-roof` pipe, E11 (74) | length / time_s / level_change | 36 / 6 / 3.9 | 35.58 / 5.98 / 3.9 | 35.5 / 6 / 3.9 |
| `w2-pawn-loft>w2-reading-room` team_throw (28) | width (gap) / time_s | 4.9 / 5 | 4.9 (edge z 67.6, stage z 72.5) / 2.8 | 4.9 / 2.8 |
| `w2-pie-loft>w2-clock-loft` team_throw (29) | width (gap) / time_s | 2.5 / 5 | 2.5 (edge z 70.0, stage z 72.5) / 2.9 | 2.5 / 2.9 |
| `w2-arcade-roof>w3-roof` team_throw (31) | width (gap) / time_s | 4.9 / 5 | 4.9 (edge x 77.1, the corner bay from x 82) / 2.6 | 4.9 / 2.6 |
| `w3-roof>w3-west-wing` drop, TKL leg a (35) | length / time_s / level_change | 21 / 10 / 4.2 | 17.2 / **13.9** / 4.2 | 17 / 10 (kept: worse) / 4.2 |
| `w3-west-wing>w3-passage` door, TKL leg a (46) | length / time_s | 15 / 12.7 | 12.46 / 9.6 | 12.5 / 9.6 |
| `w3-east-yard>w3-east-wing` door, TKL leg b (36) | length / time_s | 19 / 1.5 | 2.65 / **2.0** | 2.5 / 1.5 (kept: worse) |
| `w3-east-wing>w3-passage` door, TKL leg b (43) | length / time_s | 15 / 5 | 6.15 / 4.7 | 6 / 4.7 |

Notes on the measurements:
- Pie throw: the standard 3.2 m throw lands at (63, 72.8).
- Lane throw: the site throw lands at (82.5, 66).
- The throw lengths are not re-measured. A co-op move has no door-to-door ends (the length is inert in every check).
- E1 reach: from the pawn throw's landing (51.2, 73.0) to the gate, the nav path is 14.55 m (EGRESS: 12.9), 4.9 s at
  3.0 m/s. A5's length test is the 12.4 door to door.
- E9 is the route points' polyline (W3_ROUTES route 2). The guards' nav does not walk the steep upper flight (a 4.8 m
  run for 4.2 m) and detours 55 m. J13 / GBM should know this.

**Final 0-based link numbers** (75 links, as D0 left them; D1 adds and deletes none):
- the C5 throw `w2-arcade-roof>w3-roof` is **31** and the bulkhead `w3-roof>w3-east-wing` is **34**: EGRESS
  section 1's numbers. The plan text's 32 / 35 are stale.
- the fire escape `w3-roof>w3-east-yard` is 33.
- the plant ladder is 30.
- E1 70, E2 71, E4 72, E5 73, E11 74.

**TKL `tkl-wings`, measured from W3_ROUTES' points at 1.3 m/s:**
- Leg a = 13.9 (the drop: 0.7 s fall, then 17.2 m over the gallery ring and down its stair) + 9.6 (to the west door)
  = **23.5 s**.
- Leg b = 12.9 (fire escape) + 2.0 (foot to gate) + 4.7 (gate to the east door) = **19.7 s**. 16%: within 20%.
- The graph's sums (the worse numbers kept) are a = 10 + 9.6 = 19.6 and b = 12.9 + 1.5 + 4.7 = 19.1 s, 3% apart.
- Worst reach at 3.0 m/s, all under 15 s:
  - the yard (fire escape foot) to the west wing by the gate and the front hall: 10.1 s
  - the west wing's gallery to the east wing: 13.3 s
  - the gallery stair's foot to the east wing: 8.4 s
- For the lead: the legs start where D0 started them (the sash, the fire escape head). From the C5 landing (the
  corner bay) the roof walk is 8.9 m to the sash and 29.7 m to the fire escape head, which makes the legs 30.4 s against
  42.6 s (29% apart). The validator cannot see this, because the roof is the fork.

## 8. Section fixes found (worse than D0, not written; the lead routes them)
1. `w3-roof>w3-west-wing` (TKL leg a), **G3**: 13.9 s against D0's 10 s. The gallery ring round the light-well hole
   (about 8.5 m) and its stair (about 7.6 m) take longer than D0's 2.3 + 4.6 s. TKL parity still holds (16%).
2. `w3-east-yard>w3-east-wing` (TKL leg b), **G3**: the fire escape's foot is 2.65 m from the gate, 2.0 s against
   D0's 1.5 s (EGRESS E9 planned about 2 m).
3. `w3-roof>w3-east-wing` (E10), **G3 / G2** (A30's core): 14.8 s against 14 s, and the flights are 1.2 m wide against
   the declared 1.3 m.
4. `w2-arcade>w2-reading-room` (E3), **G2**: the built public stair is 1.7 m wide (the hall's walls x 54.15-55.85)
   against the declared 2.4 m.
5. `w1-canal-steps>w1-gallery` (E5) and `w2-lane-window>w2-arcade-roof` (E6): the engine climbs a ladder at 0.51 m/s
   plus entry and top-out, so the climbs take 10.0 s (4.5 m) and 8.9 s (3.9 m), against `time_s` 3 and 5. This is an
   engine fact, not geometry: should `time_s` carry the climb (the lead's ruling)?
6. TGC `tgc-leads`, **G1 / J7**: the legs are 62% apart door to door, 26% with a meeting point under the clock, against
   20% (section 6).
7. TGC reach, **G1**: 16.1 s from the warden's desk against 15 s, and no solo way from the floor into leg a (section 6).

## 9. Rooms (step 6)
`size` is [short side, long side, height]. Two unchanged spaces were checked first: `w1-market` [30, 30, 12] for
30 x 30, and `w2-reading-room` [6.5, 16, 3] for 16 x 6.5.

| Space | Built room | Graph before | Graph now | Room class check |
| --- | --- | --- | --- | --- |
| `w2-pawn-loft` | [44, 62, 54, 67.6] | [44, 62, 54, 70], [8, 10, 3] | [44, 62, 54, 67.6], [5.6, 10, 3] | storage 4 x 4 minimum: passes; WARN 5.6 off the grid |
| `w3-chute` | [96.5, 50, 97.7, 52] | [96.5, 50, 97.7, 56], [1.2000000000000028, 6, 1.5] | [96.5, 50, 97.7, 52], [1.2, 2, 1.5] | custom: the existing WARNs only |
| `w3-cartway` | [88, 34, 92, 38] | [88, 34, 92, 40], [4, 6, 3] | [88, 34, 92, 38], [4, 4, 3] | corridor 3 x 3 minimum: passes |
| `w1-tea-stall` | [12, 6, 20, 14] | [12, 6, 20, 14.5], [8, 8.5, 12] | **not written** | the built 8 x 8 gives `ERROR: w1-tea-stall: 8 x 8 m below break_room minimum 7 x 8.5` (scratch run). The room stops at z 14 only because rooms may not overlap; the stall's counter and posts reach z 14.2-14.3. Open item: G1 deepens the stall 0.5 m, or the class becomes `custom` (a WARN) |

`w3-front-hall` is a built room but no graph space (a deviation in W3). The section files still list the pawn loft,
the chute and the cartway as deviations, and the tests' `OVERRIDE` maps still carry them. Both are now redundant: G2 /
G3 can clean them up (not D1's files).

## 10. Vantages (step 7)
Each `at` is the midpoint of the built `w<n>-vantage-*` pair, and each `from` is the space they stand in. `sees_pct`
is unchanged.

| Encounter | `from` before -> now | `at` before -> now | Note |
| --- | --- | --- | --- |
| `w1-market` | w1-gallery -> w1-gallery | [4, 4.5, 30] -> [3, 4.5, 30.1] | |
| `w1-fish-hall` | w1-gallery -> **w1-warden-office** | [4, 4.5, 45] -> [7.4, 4.5, 53.1] | crouched at the inspection hatch, about 61% of the hall floor each (LP fix round 1) |
| `w2-arcade` | w2-arcade-roof -> w2-arcade-roof | [60, 8.4, 62.5] -> [59.7, 8.4, 62.6] | |
| `w2-reading-room` | w2-arcade-roof -> w2-arcade-roof | [52, 8.4, 69.5] -> [51.8, 8.4, 66.8] | sees the pawn stage and the stage door only (LP pick 19, a walk item) |
| `w3-east-yard` | w3-roof -> **w3-east-yard** | [107, 8.4, 52.5] -> [102.55, 4.2, 50.4] | the fire escape's half landing over the yard |
| `w3-east-wing` | w3-east-yard -> **w3-east-post** | [108, 0, 51.5] -> [110.95, 0, 77.3] | the east key post's alcove |
| `w3-west-wing` | w3-roof -> **w3-west-wing** | [89, 8.4, 63] -> [87.3, 4.2, 60.6] | the iron gallery's south strip |
| `w4-shed-three` | w4-gantry -> **w4-shed-two** | [79, 10, 17] -> [87.6, 0, 19] | through the party wall's fire door |
| `w4-shed-yard` | w4-gantry -> w4-gantry | [58, 10, 17] -> [52, 10, 18.6] | 0.85 kept (lead ruling ~09:05); the look-out bay sees north of z ~21.7 only (LP pick 15): a walk item |

The validators accept a vantage whose `from` is its own space (the W3 east yard and west wing): they print no line for it.

## 11. Lighting text (step 8)
- Every one of the 37 space notes has one light sentence from its LIGHT.md row, in the brief's form
  ("Light (LP, LIGHT.md section N): <type>, band <band> (provisional, A2); tonight ...; fittings ...; dark at ...;
  <cut or shot>"). Closed rooms are named by their M1 night fittings. The old "Dark by ..." and "mixed zone" sentences
  are gone.
- `meta.note`'s lighting sentence is the brief's text.
- `grep -niE "lit by default|dark by default|LR1|G279" graph.json` finds nothing.
- `meta.section_info.W2.forced_coop` names the forced throws:
  - "team_throw (pawn loft -> reading room: a 5.8 m site throw over a 4.9 m gap, forced, M2; pie loft -> clock loft: a
    standard 2.5 m throw, not yet forced, the plank bridge later, M2 / G403)"
  - "team_throw (arcade roof -> counting house roof: a 5.8 m site throw over 4.9 m, forced, M2)"
- Facts the light text corrects:
  - The gallery's ladder is the caged, bolted ladder, not "taken home".
  - The lodge lamp is on all night (O5).
  - The crane lamp is at 14 m (O20).

## 12. The designed exit (step 9, G157 9; level-design 3.10)
| Mission | From -> to | Length | At 1.3 m/s | At 3.0 m/s | Result |
| --- | --- | --- | --- | --- | --- |
| Three Grey Coats | shed three's candle chest (tgc-4, (75.5, 0, 15)) -> the launch, the W4 extraction box (88, -1, 3) | 19.6 m (nav; route points 20.5) | 15.1 s | 6.5 s | under 2 min |
| Two-Key Ledger | the coal-yard overhear box (tkl-4, (90, 0, 46)) -> the launch | 45.5 m: 17.1 to the shed two shutter, 2.4 crawl, 26.1 on | 36.4 s (the shutter's grip, lift and crawl 3.2 s included) | 17.6 s | under 2 min; it leaves forward through the cartway into W4, and 74% of the way (all after the cartway mouth) is new ground |

Both lines are in `meta.note`.

## 13. Tests
- `npx vitest run tests/tallowWharf/ --maxWorkers=2` after the change: 7 files, 298 passed, 0 failed (the same as the
  base). The graph-reading tests (`shell.test.ts`, `sectors.test.ts`, `w1.test.ts` to `w4.test.ts`) pass with the new
  areas: their `OVERRIDE` maps already held the built boxes.
- `npm run typecheck:fast` and `npx eslint src/world/maps/tallowWharfSectors.ts tests/tallowWharf/sectors.test.ts`
  are clean.
- No e2e or GPU check is in D1's scope.

## 14. Appendix: the measuring test and its output
The test was `tests/tallowWharf/_d1measure.test.ts`, run with
`D1_OUT=<scratch>/d1measure.json npx vitest run tests/tallowWharf/_d1measure.test.ts --maxWorkers=2` and deleted
before the first commit (never committed). To rerun, paste it back at that path. The output is below, one top-level
key per line (the same numbers as the run's JSON).

```ts
/**
 * J8 D1 temporary measuring test (never committed): prints the built Tallow Wharf's numbers the campaign graph takes.
 * Walks are nav paths over the runtime nav grid (`soloNav` with no door shut: every door open, as the build's own nav), 3D
 * along stairs; climbs, drops and co-op moves are timed from the engine's own constants.
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { hyp2 } from '../../src/core/mathx';
import { TEAM } from '../../src/config/movement';
import { GRAVITY } from '../../src/physics/havok';
import { ATTACH, LADDER_DOWN_RATE, LADDER_SLIDE } from '../../src/player/attach';
import { CLIMB_UP_STAND, CLIMB_UP_TIME, LADDER_TOPOUT_IN, LADDER_TOPOUT_TIME } from '../../src/player/attachController';
import { SHUTTER } from '../../src/game/kit/shutter';
import { tallowWharf } from '../../src/world/maps/tallowWharf';
import { W1 } from '../../src/world/maps/tallowWharfW1';
import { W2 } from '../../src/world/maps/tallowWharfW2';
import { W3 } from '../../src/world/maps/tallowWharfW3';
import { W4 } from '../../src/world/maps/tallowWharfW4';
import type { WharfSection } from '../../src/world/maps/tallowWharfKit';
import { WHARF_GUARD_MISSIONS, WHARF_SECTORS } from '../../src/world/maps/tallowWharfSectors';
import type { ThrowSite } from '../../src/world/mapDef';
import { builtWharf, downHit, GRAPH, soloNav, solidOf, throwCheck, type ShutDoor } from './helpers';

type P = [number, number, number]; // x, y, z
const SPLIT = 1.3;
const REACH = 3.0;
const G = -GRAVITY.y;
const r2 = (v: number): number => Math.round(v * 100) / 100;
const SECS: Record<string, WharfSection> = { W1, W2, W3, W4 };
const dbg = (s: WharfSection, id: string): P => {
  const p = s.debugPoints.find((d) => d.id === id)!.pos;
  return [p.x, p.y, p.z];
};
const door = (s: WharfSection, id: string): P => [...s.doors[id]!] as P;

// ---- engine move times (s) ----
const ladderUp = (h: number): number => ATTACH.ladder.enter + h / ATTACH.ladder.speed + LADDER_TOPOUT_TIME;
const ladderDownClimb = (h: number): number => ATTACH.ladder.enter + h / (LADDER_DOWN_RATE * 0.3) + ATTACH.ladder.exit;
const ladderSlide = (h: number): number => ATTACH.ladder.enter + h / LADDER_SLIDE + ATTACH.ladder.exit;
const pipeUp = (h: number): number => ATTACH.pipeV.enter + h / ATTACH.pipeV.speed + CLIMB_UP_TIME + CLIMB_UP_STAND;
const fall = (h: number): number => Math.sqrt((2 * h) / G);
const BOOST = TEAM.braceHold + TEAM.boostTime + CLIMB_UP_TIME + CLIMB_UP_STAND;
const THROW = TEAM.braceHold + TEAM.throwTime;

describe('J8 D1 measure (temporary)', () => {
  it('prints the built numbers', () => {
    const { b, layout } = builtWharf();
    const solid = solidOf(b);
    const sites = ((layout as { throwSites?: readonly ThrowSite[] }).throwSites ?? null) as readonly ThrowSite[] | null;
    const seeds = [layout.playerSpawns[0]!.pos, ...(layout.navSeeds ?? []), new Vector3(73.5, -4.4, 5.0), new Vector3(70, -4.4, 4.5)];
    const { nav } = soloNav(b, tallowWharf.navLayers ?? 3, seeds, []);

    /** Nav path length a -> b (3D along stairs), or null. */
    const navLen = (a: P, c: P): number | null => {
      const p = nav.findPath([a[0], a[2]], [c[0], c[2]], 1e6, a[1], c[1]);
      if (!p) return null;
      let len = 0;
      let px = a[0];
      let pz = a[2];
      let py = a[1];
      // step 0.1 m along each leg; the height follows the walked surface (the storey nearest the last step's, a step of
      // at most 0.5 m), so a stair under a landing is never mistaken for the landing
      for (let i = 0; i < p.length; i++) {
        const w = p[i]!;
        const d = hyp2(w[0] - px, w[1] - pz);
        const n = Math.max(1, Math.ceil(d / 0.1));
        const y0 = py;
        for (let s = 1; s <= n; s++) {
          const x = px + ((w[0] - px) * s) / n;
          const z = pz + ((w[1] - pz) * s) / n;
          let y = nav.heightAt(x, z, py);
          if (!Number.isFinite(y) || Math.abs(y - py) > 0.5) y = py;
          py = y;
        }
        // the last leg ends on the target's floor; each leg is one straight slope (the cells' heights are stepped)
        if (i === p.length - 1) py = c[1];
        len += hyp2(d, py - y0);
        px = w[0];
        pz = w[1];
      }
      return r2(len);
    };
    const need = (v: number | null, what: string): number => {
      expect(v, what).not.toBeNull();
      return v!;
    };
    /** A polyline's 3D length. */
    const poly = (pts: readonly P[]): number => {
      let l = 0;
      for (let i = 1; i < pts.length; i++) l += hyp2(hyp2(pts[i]![0] - pts[i - 1]![0], pts[i]![2] - pts[i - 1]![2]), pts[i]![1] - pts[i - 1]![1]);
      return r2(l);
    };
    const out: Record<string, unknown> = {};

    // ---- engine constants used ----
    out.engine = {
      ladderUp_mps: ATTACH.ladder.speed,
      ladderDown_mps: r2(LADDER_DOWN_RATE * 0.3),
      ladderSlide_mps: LADDER_SLIDE,
      ladderEnter_s: ATTACH.ladder.enter,
      ladderExit_s: ATTACH.ladder.exit,
      ladderTopout_s: LADDER_TOPOUT_TIME,
      ladderTopoutIn_m: LADDER_TOPOUT_IN,
      pipeUp_mps: ATTACH.pipeV.speed,
      climbUp_s: r2(CLIMB_UP_TIME + CLIMB_UP_STAND),
      boostMove_s: r2(BOOST),
      throwMove_s: r2(THROW),
      gravity: G,
      shutter: { grip: SHUTTER.grip, lift: SHUTTER.liftTime, crawl: SHUTTER.crawlTime },
    };

    // ---- rooms against the graph ----
    const rooms: unknown[] = [];
    for (const [id, s] of Object.entries(SECS)) {
      for (const r of s.rooms) {
        const g = GRAPH.spaces.find((p) => p.id === r.id);
        const box = [r.minX, r.minZ, r.maxX, r.maxZ].map(r2);
        const area = g?.area[0] ?? null;
        rooms.push({ sec: id, id: r.id, box, minY: r.minY ?? null, maxY: r.maxY ?? null, graphArea: area, graphSize: g?.size ?? null, differs: area ? box.some((v, i) => Math.abs(v - area[i]!) > 1e-6) : null });
      }
    }
    out.rooms = rooms;

    // ---- guards: the graph space holding each post (its storey, plan within 1 m), the missions that spawn him ----
    const spaceAt = (x: number, y: number, z: number): { id: string; d: number } | null => {
      let best: { id: string; d: number } | null = null;
      for (const s of GRAPH.spaces) {
        if (Math.abs(s.storey - y) > 1.0) continue;
        for (const [x0, z0, x1, z1] of s.area) {
          const d = hyp2(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
          if (d <= 1.0 && (!best || d < best.d)) best = { id: s.id, d: r2(d) };
        }
      }
      return best;
    };
    const guards: unknown[] = [];
    WHARF_SECTORS.forEach((sec) => {
      sec.guards.forEach((g, k) => {
        const y = g.y ?? 0;
        const post = spaceAt(g.x, y, g.z);
        // a route's share of length per space (for a post in no space)
        let routeShare: Record<string, number> | undefined;
        if (g.route && g.route.length > 1) {
          routeShare = {};
          const pts = g.route.length > 2 ? [...g.route, g.route[0]!] : g.route;
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1]!;
            const c = pts[i]!;
            const n = 100;
            const seg = hyp2(c[0] - a[0], c[1] - a[1]) / n;
            for (let t = 0; t < n; t++) {
              const f = (t + 0.5) / n;
              const sp = spaceAt(a[0] + (c[0] - a[0]) * f, y, a[1] + (c[1] - a[1]) * f);
              const key = sp ? sp.id : '(none)';
              routeShare[key] = r2((routeShare[key] ?? 0) + seg);
            }
          }
        }
        const missions = (['threeGreyCoats', 'twoKeyLedger'] as const).filter((m) => {
          const w = WHARF_GUARD_MISSIONS[m][sec.id];
          return w === 'all' || (Array.isArray(w) && w.includes(k));
        });
        guards.push({ sec: sec.id, k, x: g.x, z: g.z, y, role: g.role, zone: g.zone, reason: g.reason, route: g.route ?? null, post: post?.id ?? null, postD: post?.d ?? null, routeShare: routeShare ?? null, missions });
      });
    });
    out.guards = guards;
    const counts: Record<string, Record<string, number>> = {};
    for (const g of guards as { sec: string; post: string | null; routeShare: Record<string, number> | null }[]) {
      let id = g.post;
      if (!id && g.routeShare) id = Object.entries(g.routeShare).filter(([k]) => k !== '(none)').sort((p, q) => q[1] - p[1])[0]![0];
      (counts[g.sec] ??= {})[id ?? '(none)'] = ((counts[g.sec] ?? {})[id ?? '(none)'] ?? 0) + 1;
    }
    out.guardCounts = counts;

    // ---- starts and checkpoints: the graph space each stands in ----
    out.starts = WHARF_SECTORS.map((s) => ({ sec: s.id, start: [s.start.x, s.start.y, s.start.z], space: spaceAt(s.start.x, s.start.y, s.start.z)?.id ?? null, checkpointTag: GRAPH.spaces.filter((p) => p.section === s.id && p.tags.includes('checkpoint')).map((p) => p.id) }));

    // ---- vantages: the midpoint of each built pair and the space it stands in (plan, any storey if none on its storey) ----
    const vant: unknown[] = [];
    for (const s of Object.values(SECS)) {
      const ids = s.debugPoints.filter((d) => /-vantage-.*-a$/.test(d.id)).map((d) => d.id.slice(0, -2));
      for (const base of ids) {
        const a = dbg(s, `${base}-a`);
        const c = dbg(s, `${base}-b`);
        const m: P = [r2((a[0] + c[0]) / 2), r2((a[1] + c[1]) / 2), r2((a[2] + c[2]) / 2)];
        const onStorey = spaceAt(m[0], m[1], m[2]);
        const inPlan = GRAPH.spaces.filter((p) => p.area.some(([x0, z0, x1, z1]) => m[0] >= x0 && m[0] <= x1 && m[2] >= z0 && m[2] <= z1)).map((p) => `${p.id}@${p.storey}`);
        vant.push({ pair: base, a, b: c, mid: m, spaceOnStorey: onStorey?.id ?? null, inPlan });
      }
    }
    out.vantages = vant;

    // ---- throws: take-off edge, stage, gap, the landing ----
    const throwsOut: unknown[] = [];
    for (const t of W2.throws) {
      const dx0 = t.thrower.x - t.runner.x;
      const dz0 = t.thrower.z - t.runner.z;
      const n = hyp2(dx0, dz0);
      const dx = dx0 / n;
      const dz = dz0 / n;
      const y = t.thrower.y;
      const onFloor = (s: number): boolean => {
        const h = downHit(solid, t.thrower.x + dx * s, y + 0.5, t.thrower.z + dz * s, y - 0.5);
        return Number.isFinite(h) && Math.abs(h - y) < 0.06;
      };
      let s = 0;
      while (onFloor(s) && s < 10) s += 0.005;
      const edge = s;
      while (!onFloor(s) && s < 15) s += 0.005;
      const far = s;
      const rep = throwCheck(solid, t, sites);
      throwsOut.push({
        id: t.id,
        link: t.link,
        thrower: t.thrower,
        runner: t.runner,
        stage: t.stage,
        dist: rep.dist,
        edge: [r2(t.thrower.x + dx * edge), r2(t.thrower.z + dz * edge)],
        farEdge: [r2(t.thrower.x + dx * far), r2(t.thrower.z + dz * far)],
        gap: r2(far - edge),
        land: [r2(rep.land.x), r2(rep.land.z)],
        landFloor: r2(rep.floorY),
        ok: rep.ok,
        room: rep.room,
      });
    }
    out.throws = throwsOut;

    // ---- anchors: the ladders and the downpipe the graph names ----
    const lad = (x: number, z: number) => {
      const l = b.anchors.ladders.find((a) => Math.abs(a.base.x - x) < 0.01 && Math.abs(a.base.z - z) < 0.01)!;
      const fx = Math.sin(l.facing);
      const fz = Math.cos(l.facing);
      return { base: l.base, top: l.top, facing: r2(l.facing), footStepOff: [r2(l.base.x - fx * 0.7), l.base.y, r2(l.base.z - fz * 0.7)] as P, topOut: [r2(l.top.x + fx * LADDER_TOPOUT_IN), l.top.y, r2(l.top.z + fz * LADDER_TOPOUT_IN)] as P, h: r2(l.top.y - l.base.y) };
    };
    const galleryLadder = lad(6.45, 15.0);
    const plantLadder = lad(72, 66.15);
    const pipe = b.anchors.pipesV.find((a) => Math.abs(a.base.x - 47.5) < 0.01)!;
    out.anchors = { galleryLadder, plantLadder, downpipe: { base: pipe.base, top: pipe.top } };

    // ---- the jetty drop: the jetty top, the canal bed under the take-off, the walk round the fence foot to the ledge ----
    const jettyDrop = dbg(W4, 'w4-jetty-drop');
    const jettyTop = downHit(solid, jettyDrop[0], 2, jettyDrop[2], -10);
    const bedY = downHit(solid, 74, -1, 5.4, -10);
    // the canal bed is not in the guards' nav: round the fence foot's south end (wall x 71.85-72.15, z 5-10) with a body's
    // 0.3 m clearance, to the ledge's east edge x 72
    const bedWalk = r2(hyp2(74 - 72.45, 5.4 - 4.7) + 0.45);

    // ---- EGRESS rows, door to door ----
    const w2 = (id: string): P => door(W2, id);
    const bridgeW = w2('w2-bridge-west');
    const stageDoor = w2('w2-reading-stage');
    const bridgeE = w2('w2-bridge-east');
    const e1face = r2(73.5 - 67.6 + Math.abs(stageDoor[0] - bridgeW[0]));
    const e1centre = r2(73.5 - bridgeW[2] + Math.abs(stageDoor[0] - bridgeW[0]));
    const e1nav = navLen([bridgeW[0], 4.5, bridgeW[2] + 0.3], [stageDoor[0], 4.5, stageDoor[2] + 0.3]);
    const pawnLand = (throwsOut[0] as { land: [number, number] }).land;
    const e1reach = navLen([pawnLand[0], 4.5, pawnLand[1]], [bridgeW[0], 4.5, bridgeW[2]]);
    const e2 = r2(73.5 - bridgeE[2] + Math.abs(bridgeE[0] - 63));
    const e2nav = navLen([bridgeE[0], 4.5, bridgeE[2] + 0.2], [63, 4.5, 73.8]);
    // E3: the stair hall door (55, 0, 62) to the stair-head door, and its clear width (the hall walls at y 6, z 66)
    const e3 = navLen([55, 0, 62.2], [55, 4.5, 73.3]);
    let wx0 = 55;
    let wx1 = 55;
    const hit = (x: number): boolean => solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(66 - p.c[2]) < p.s[2] / 2 && Math.abs(6 - p.c[1]) < p.s[1] / 2);
    while (!hit(wx0 - 0.005)) wx0 -= 0.005;
    while (!hit(wx1 + 0.005)) wx1 += 0.005;
    // E6: the walkway door to the tank-room ladder, the climb, the roof to the C5 thrower's mark
    const lane = W2.throws.find((t) => t.id === 'w2-throw-lane')!;
    const e6walk = need(navLen([72, 4.5, 62.2], plantLadder.footStepOff), 'E6 walk');
    const e6roof = need(navLen(plantLadder.topOut, [lane.thrower.x, 8.4, lane.thrower.z]), 'E6 roof');
    // E7: the pawn stair foot door to the loft door; E8: C3's west landing (the rope holder) to the loft door
    const e7 = navLen([53, 0, 62.2], [45, 4.5, 63.8]);
    const rope = W2.ropes[0]!;
    const e8 = navLen([rope.holder.x, 4.5, rope.holder.z], [45, 4.5, 63.8]);
    // E9: the fire escape head to its foot; E10: the bulkhead's roof door to its foot door
    const feHead: P = [108.65, 8.4, 52.6];
    const feFoot = dbg(W3, 'w3-fire-escape-foot');
    const e9nav = navLen(feHead, feFoot);
    const e9poly = poly([feHead, [102.55, 4.2, 50.4], [feFoot[0], 0, feFoot[2]]]);
    const e10 = navLen([112.8, 8.4, 68], [112.8, 0, 68]);

    // E11: C3's west landing to the pipe foot, the climb, the top-out to the C5 thrower's mark
    const pipeFoot = dbg(W2, 'w2-downpipe');
    const e11a = need(navLen([rope.holder.x, 4.5, rope.holder.z], pipeFoot), 'E11 foot');
    const e11top: P = [47.5, 8.4, 62.15];
    const e11b = need(navLen(e11top, [lane.thrower.x, 8.4, lane.thrower.z]), 'E11 roof');
    // E5: the foot door to the step-off, the climb, the top-out
    const cage = door(W1, 'w1-gallery-ladder');
    const e5plan = r2(hyp2(galleryLadder.footStepOff[0] - cage[0], galleryLadder.footStepOff[2] - cage[2]));
    out.egress = {
      E1: { faceConvention: e1face, centreConvention: e1centre, nav: e1nav, reachLandingToGate: e1reach },
      E2: { doorToDoor: e2, nav: e2nav },
      E3: { doorToDoor: e3, clearWidth: r2(wx1 - wx0), walls: [r2(wx0), r2(wx1)], t13: e3 && r2(e3 / SPLIT) },
      E4: { jettyTop, bedY, levelChange: r2(jettyTop - bedY), takeOff: jettyDrop, dropPlan: r2(hyp2(74 - jettyDrop[0], 5.4 - jettyDrop[2])), bedWalkToLedge: bedWalk, length: bedWalk === null ? null : r2(hyp2(74 - jettyDrop[0], 5.4 - jettyDrop[2]) + bedWalk), t13: bedWalk === null ? null : r2(fall(jettyTop - bedY) + (0.9 + bedWalk) / SPLIT), t30: bedWalk === null ? null : r2(fall(jettyTop - bedY) + (0.9 + bedWalk) / REACH) },
      E5: { cageDoor: cage, footStepOff: galleryLadder.footStepOff, topOut: galleryLadder.topOut, h: galleryLadder.h, length: r2(e5plan + galleryLadder.h + LADDER_TOPOUT_IN + 0.45), up_s: r2(ladderUp(galleryLadder.h)), downClimb_s: r2(ladderDownClimb(galleryLadder.h)), downSlide_s: r2(ladderSlide(galleryLadder.h)) },
      E6: { walk: e6walk, h: plantLadder.h, roof: e6roof, length: r2(e6walk + plantLadder.h + e6roof), up_s: r2(ladderUp(plantLadder.h)), t13: r2((e6walk + e6roof) / SPLIT + ladderUp(plantLadder.h)) },
      E7: { doorToDoor: e7, t13: e7 && r2(e7 / SPLIT), width: 1.3 },
      E8: { c3LandingToLoftDoor: e8 },
      E9: { navDetour: e9nav, poly: e9poly, t13: r2(e9poly / SPLIT) },
      E10: { nav: e10, t13: e10 && r2(e10 / SPLIT) },
      E11: { toFoot: e11a, climb: r2(pipe.top.y - pipe.base.y), roof: e11b, length: r2(e11a + pipe.top.y - pipe.base.y + e11b), climb_s: r2(pipeUp(pipe.top.y - pipe.base.y)) },
    };

    // ---- throws as links: the loft entry to the thrower, the throw, the landing to the stage door ----
    const pawn = W2.throws[0]!;
    const pie = W2.throws[1]!;
    const pawnRep = throwsOut[0] as { land: [number, number] };
    const pieRep = throwsOut[1] as { land: [number, number] };
    const laneRep = throwsOut[2] as { land: [number, number] };
    const tPawnIn = need(navLen([45, 4.5, 63.8], [pawn.runner.x, 4.5, pawn.runner.z]), 'pawn in');
    const tPieIn = need(navLen([61, 4.5, 62.2], [pie.runner.x, 4.5, pie.runner.z]), 'pie in');
    const tLaneIn = need(navLen(plantLadder.topOut, [lane.runner.x, 8.4, lane.runner.z]), 'lane in');
    out.throwLinks = {
      pawn: { walkIn: tPawnIn, run: r2(hyp2(pawn.thrower.x - pawn.runner.x, pawn.thrower.z - pawn.runner.z)), fly: r2(hyp2(pawnRep.land[0] - pawn.thrower.x, pawnRep.land[1] - pawn.thrower.z)), toDoor: r2(73.5 - pawnRep.land[1]) },
      pie: { walkIn: tPieIn, run: r2(hyp2(pie.thrower.x - pie.runner.x, pie.thrower.z - pie.runner.z)), fly: r2(hyp2(pieRep.land[0] - pie.thrower.x, pieRep.land[1] - pie.thrower.z)), toDoor: r2(73.5 - pieRep.land[1]) },
      lane: { walkInFromTankLadder: tLaneIn, run: r2(hyp2(lane.thrower.x - lane.runner.x, lane.thrower.z - lane.runner.z)), fly: r2(hyp2(laneRep.land[0] - lane.thrower.x, laneRep.land[1] - lane.thrower.z)) },
    };
    for (const k of ['pawn', 'pie'] as const) {
      const o = (out.throwLinks as Record<string, { walkIn: number; run: number; fly: number; toDoor: number; length?: number; t13?: number; move_s?: number }>)[k]!;
      o.length = r2(o.walkIn + o.run + o.fly + o.toDoor);
      o.t13 = r2((o.walkIn + o.run + o.toDoor) / SPLIT + THROW);
      // the move itself: the run-in, the brace, the flight, the landing to the stage door
      o.move_s = r2((o.run + o.toDoor) / SPLIT + THROW);
    }
    const laneO = (out.throwLinks as Record<string, { run: number; move_s?: number }>).lane!;
    laneO.move_s = r2(laneO.run / SPLIT + THROW);

    // ---- TGC split tgc-leads (W1) ----
    const F: P = [W1.entry[0], 0, W1.entry[2]];
    const spot: P = [W1.legUps[0]!.x, 0, W1.legUps[0]!.z];
    const land: P = [4, 4.5, 14.6];
    const officeDoor = door(W1, 'w1-warden-stair'); // the stair foot (7, 0, 44)
    const galleryDoor: P = [4, 4.5, 46];
    const desk: P = [3, 4.5, 50];
    const stairHead: P = [7, 4.5, 51.5];
    const stairFootIn: P = [7, 0, 44.6];
    const out1: P = [7, 0, 43.4];
    const teaIn: P = [12, 0, 10];
    const listen: P = [18.8, 0, 8.6];
    const clock: P = [22, 0, 41];
    const mkt: P = [16, 0, 15];
    const a = {
      forkToSpot: need(navLen(F, spot), 'F spot'),
      boost_s: r2(BOOST),
      landToGalleryDoor: need(navLen(land, galleryDoor), 'gallery'),
      galleryDoorToDesk: need(navLen(galleryDoor, desk), 'desk'),
      deskToStairHead: need(navLen(desk, stairHead), 'stair head'),
      stairHeadToFoot: need(navLen(stairHead, stairFootIn), 'stair'),
      footToOut: r2(hyp2(stairFootIn[0] - out1[0], stairFootIn[2] - out1[2])),
      outToClock: need(navLen(out1, clock), 'clock a'),
    };
    const bb = {
      forkToTea: need(navLen(F, teaIn), 'F tea'),
      teaToListen: need(navLen(teaIn, listen), 'listen'),
      listenToMarket: need(navLen(listen, mkt), 'market'),
      listenToClock: need(navLen(listen, clock), 'clock b'),
    };
    // door to door, D0's TKL convention (the leg starts at its first move off the fork and ends at its door into the rejoin)
    const aDoor = { boost: r2(BOOST), galleryToOffice: r2(a.landToGalleryDoor / SPLIT), officeToMarket: r2((a.galleryDoorToDesk + a.deskToStairHead + a.stairHeadToFoot + a.footToOut) / SPLIT) };
    const bDoor = { canalToTea: 0, teaToMarket: r2((bb.teaToListen + bb.listenToMarket) / SPLIT) };
    // a common meeting point under the clock (the coats; the tgc-1 box centre), both legs from the start
    const aMeet = { boost: r2(a.forkToSpot / SPLIT + BOOST), galleryToOffice: r2(a.landToGalleryDoor / SPLIT), officeToMarket: r2((a.galleryDoorToDesk + a.deskToStairHead + a.stairHeadToFoot + a.footToOut + a.outToClock) / SPLIT) };
    const bMeet = { canalToTea: r2(bb.forkToTea / SPLIT), teaToMarket: r2((bb.teaToListen + bb.listenToClock) / SPLIT) };
    const sum = (o: Record<string, number>): number => r2(Object.values(o).reduce((p, q) => p + q, 0));
    const pct = (x: number, y: number): number => r2((Math.abs(x - y) / Math.max(x, y)) * 100);
    // reach: from the warden's desk (the far end of leg a) to the tea stall, by the gallery and the ladder (slid), or by the stair
    const reachLadder = r2(a.galleryDoorToDesk / REACH + need(navLen(galleryDoor, galleryLadder.topOut), 'to ladder') / REACH + ladderSlide(galleryLadder.h) + r2(hyp2(galleryLadder.footStepOff[0] - cage[0], galleryLadder.footStepOff[2] - cage[2])) / REACH + need(navLen([cage[0], 0, cage[2] - 0.3], teaIn), 'cage to tea') / REACH);
    const reachStair = r2((a.deskToStairHead + a.stairHeadToFoot + a.footToOut + need(navLen(out1, teaIn), 'out to tea')) / REACH);
    const reachGallery = r2(need(navLen(land, galleryLadder.topOut), 'gal to ladder') / REACH + ladderSlide(galleryLadder.h) + need(navLen([cage[0], 0, cage[2] - 0.3], teaIn), 'cage to tea2') / REACH);
    // from the tea stall up, on the real bolts (the cage door and the stair foot shut): no solo way
    const shut: ShutDoor[] = [
      { at: [cage[0], cage[2]], y: 0, w: 1.0, alongX: true },
      { at: [officeDoor[0], officeDoor[2]], y: 0, w: 1.2, alongX: true },
    ];
    const solo = soloNav(b, tallowWharf.navLayers ?? 3, seeds, shut);
    const upFromTea = solo.nav.findPath([listen[0], listen[2]], [4, 30], 1e6, 0, 4.5) !== null;
    const upFromTeaOffice = solo.nav.findPath([listen[0], listen[2]], [3, 50], 1e6, 0, 4.5) !== null;
    solo.restore();
    out.tgc = { points: { F, spot, land, galleryDoor, desk, stairHead, stairFootIn, out1, teaIn, listen, clock, mkt }, a, b: bb, door: { a: aDoor, b: bDoor, sumA: sum(aDoor), sumB: sum(bDoor), pct: pct(sum(aDoor), sum(bDoor)) }, meet: { a: aMeet, b: bMeet, sumA: sum(aMeet), sumB: sum(bMeet), pct: pct(sum(aMeet), sum(bMeet)) }, reach: { deskByLadder: reachLadder, deskByStair: reachStair, galleryLandingByLadder: reachGallery }, soloUpFromTeaStall: { toGallery: upFromTea, toOffice: upFromTeaOffice } };

    // ---- TKL split tkl-wings (W3), from W3_ROUTES' points ----
    const sash: P = [89, 8.4, 60.4];
    const galLand: P = [89, 4.2, 61.2];
    const wStairFoot: P = [85, 0, 58.4];
    const westDoor: P = [96, 0, 52.95];
    const gate: P = [112, 0, 52];
    const eastDoor: P = [106, 0, 53.75];
    const corner = dbg(W3, 'w3-corner-bay');
    const bulk = dbg(W3, 'w3-bulkhead-head');
    const k = {
      dropPlan: r2(hyp2(galLand[0] - sash[0], galLand[2] - sash[2])),
      drop_s: r2(fall(sash[1] - galLand[1])),
      galleryAndStair: need(navLen(galLand, wStairFoot), 'gallery stair'),
      stairFootToWestDoor: need(navLen(wStairFoot, westDoor), 'west door'),
      fireEscapeNav: e9nav,
      fireEscapePoly: e9poly,
      footToGate: need(navLen(feFoot, gate), 'foot gate'),
      gateToEastDoor: need(navLen([112, 0, 52.4], eastDoor), 'gate east door'),
      roofCornerToSash: need(navLen(corner, sash), 'corner sash'),
      roofCornerToFireEscape: need(navLen(corner, feHead), 'corner fe'),
      roofBulkToSash: need(navLen(bulk, sash), 'bulk sash'),
      roofBulkToFireEscape: need(navLen(bulk, feHead), 'bulk fe'),
    };
    // the guards' nav does not walk flight A (a 4.8 m run for 4.2 m): it detours; the route points' polyline is the walk
    const fe = k.fireEscapePoly;
    const tklA = { drop: r2(k.drop_s + (k.dropPlan + k.galleryAndStair) / SPLIT), westWingToPassage: r2(k.stairFootToWestDoor / SPLIT) };
    const tklB = { fireEscape: r2(fe / SPLIT), yardToEastWing: r2(k.footToGate / SPLIT), eastWingToPassage: r2(k.gateToEastDoor / SPLIT) };
    // reach at 3.0: the yard (the fire escape foot) to the west wing by the gate, the east wing and the front hall's double doors; the west wing (stair foot) to the east wing
    const reachYard = r2((k.footToGate + need(navLen(gate, [95.4, 0, 68]), 'gate to west wing')) / REACH);
    const reachWest = r2(need(navLen(wStairFoot, [106.6, 0, 68]), 'west to east wing') / REACH);
    const reachGalleryWest = r2(need(navLen(galLand, [106.6, 0, 68]), 'gallery to east wing') / REACH);
    out.tkl = { points: { sash, galLand, wStairFoot, westDoor, feHead, feFoot, gate, eastDoor, corner, bulk }, k, a: tklA, b: tklB, sumA: sum(tklA), sumB: sum(tklB), pct: pct(sum(tklA), sum(tklB)), withRoofFromCorner: { a: r2(sum(tklA) + k.roofCornerToSash / SPLIT), b: r2(sum(tklB) + k.roofCornerToFireEscape / SPLIT) }, reach: { yardToWestWing: reachYard, westStairFootToEastWing: reachWest, westGalleryToEastWing: reachGalleryWest } };

    // ---- the designed exit (G157 9): TGC from shed three's chest, TKL from the coal-yard overhear box, to the W4 extraction ----
    const chest: P = [75.5, 0, 15];
    const boatIn: P = [88, -1, 3];
    const tgcExit = need(navLen(chest, boatIn), 'tgc exit');
    const tgcExitPoly = poly([chest, [79, 0, 11], [79, 0, 9], [86.5, 0, 8], [88, 0, 5.6], boatIn]);
    const yardBox = dbg(W3, 'w3-coal-yard');
    const shutterOut: P = [92, 0, 29.2];
    const shutterIn: P = [92, 0, 26.8];
    const tklExitA = need(navLen(yardBox, shutterOut), 'tkl exit a');
    const tklExitB = need(navLen(shutterIn, boatIn), 'tkl exit b');
    const crawl = r2(shutterOut[2] - shutterIn[2]);
    const shutterMove = SHUTTER.grip + SHUTTER.liftTime + SHUTTER.crawlTime;
    const tklLen = r2(tklExitA + crawl + tklExitB);
    // the first W4 metre of TKL's run: where it leaves W3 (the cartway mouth, z 34)
    const tklInW3 = need(navLen(yardBox, [90, 0, 34]), 'tkl w3 part');
    out.exit = {
      tgc: { from: chest, to: boatIn, nav: tgcExit, poly: tgcExitPoly, t13: r2(tgcExit / SPLIT), t30: r2(tgcExit / REACH) },
      tkl: { from: yardBox, to: boatIn, toShutter: tklExitA, crawl, fromShutter: tklExitB, length: tklLen, shutter_s: r2(shutterMove), t13: r2((tklLen - crawl) / SPLIT + shutterMove), t30: r2((tklLen - crawl) / REACH + shutterMove), inW3: tklInW3, newGroundPct: r2(((tklLen - tklInW3) / tklLen) * 100) },
    };

    const json = JSON.stringify(out, null, 1);
    writeFileSync(process.env.D1_OUT ?? '/dev/null', json);
    console.log(json);
  }, 120000);
});
```

Output:

```
"engine": {"ladderUp_mps":0.51,"ladderDown_mps":0.66,"ladderSlide_mps":4.5,"ladderEnter_s":0.35,"ladderExit_s":0.45,"ladderTopout_s":0.85,"ladderTopoutIn_m":0.4,"pipeUp_mps":0.9,"climbUp_s":1.3,"boostMove_s":2.6,"throwMove_s":1.4,"gravity":18,"shutter":{"grip":0.4,"lift":1.2,"crawl":1.6}}
"rooms": [
  {"sec":"W1","id":"w1-canal-steps","box":[2,6,12,14],"minY":0,"maxY":4.4,"graphArea":[2,6,12,14],"graphSize":[8,10,12],"differs":false},
  {"sec":"W1","id":"w1-tea-stall","box":[12,6,20,14],"minY":0,"maxY":4.4,"graphArea":[12,6,20,14.5],"graphSize":[8,8.5,12],"differs":true},
  {"sec":"W1","id":"w1-market","box":[6,14,36,44],"minY":0,"maxY":4.4,"graphArea":[6,14,36,44],"graphSize":[30,30,12],"differs":false},
  {"sec":"W1","id":"w1-gallery","box":[2,14,6,46],"minY":4.5,"maxY":null,"graphArea":[2,14,6,46],"graphSize":[4,32,12],"differs":false},
  {"sec":"W1","id":"w1-warden-office","box":[0,46,8,54],"minY":4.5,"maxY":null,"graphArea":[0,46,8,54],"graphSize":[8,8,3],"differs":false},
  {"sec":"W1","id":"w1-fish-hall","box":[8,44,36,58],"minY":0,"maxY":4.4,"graphArea":[8,44,36,58],"graphSize":[14,28,6],"differs":false},
  {"sec":"W1","id":"w1-service-passage","box":[6,58,40,62],"minY":0,"maxY":4.4,"graphArea":[6,58,40,62],"graphSize":[4,34,3],"differs":false},
  {"sec":"W2","id":"w2-arcade","box":[40,48,76,62],"minY":0,"maxY":4.4,"graphArea":[40,48,76,62],"graphSize":[14,36,7.5],"differs":false},
  {"sec":"W2","id":"w2-pie-shop","box":[56,62,66,70],"minY":0,"maxY":4.4,"graphArea":[56,62,66,70],"graphSize":[8,10,3],"differs":false},
  {"sec":"W2","id":"w2-walkway","box":[44,59,76,62],"minY":4.5,"maxY":8.3,"graphArea":[44,59,76,62],"graphSize":[3,32,3],"differs":false},
  {"sec":"W2","id":"w2-pie-loft","box":[56,62,66,70],"minY":4.5,"maxY":8.3,"graphArea":[56,62,66,70],"graphSize":[8,10,3],"differs":false},
  {"sec":"W2","id":"w2-pawn-loft","box":[44,62,54,67.6],"minY":4.5,"maxY":8.3,"graphArea":[44,62,54,70],"graphSize":[8,10,3],"differs":true},
  {"sec":"W2","id":"w2-reading-room","box":[44,73.5,60,80],"minY":4.5,"maxY":8.3,"graphArea":[44,73.5,60,80],"graphSize":[6.5,16,3],"differs":false},
  {"sec":"W2","id":"w2-clock-loft","box":[60,73.5,70,80],"minY":4.5,"maxY":8.3,"graphArea":[60,73.5,70,80],"graphSize":[6.5,10,3],"differs":false},
  {"sec":"W2","id":"w2-lane-window","box":[68,62,76,70],"minY":4.5,"maxY":8.3,"graphArea":[68,62,76,70],"graphSize":[8,8,3],"differs":false},
  {"sec":"W2","id":"w2-arcade-roof","box":[44,62,76,70],"minY":8.4,"maxY":null,"graphArea":[44,62,76,70],"graphSize":[8,32,12],"differs":false},
  {"sec":"W3","id":"w3-roof","box":[82,52,120,80],"minY":8.4,"maxY":null,"graphArea":[82,52,120,80],"graphSize":[28,38,12],"differs":false},
  {"sec":"W3","id":"w3-chute","box":[96.5,50,97.7,52],"minY":4.4,"maxY":null,"graphArea":[96.5,50,97.7,56],"graphSize":[1.2000000000000028,6,1.5],"differs":true},
  {"sec":"W3","id":"w3-east-yard","box":[100,38,114,52],"minY":null,"maxY":4,"graphArea":[100,38,114,52],"graphSize":[14,14,12],"differs":false},
  {"sec":"W3","id":"w3-lodge","box":[114,44,120,52],"minY":null,"maxY":4,"graphArea":[114,44,120,52],"graphSize":[6,8,3],"differs":false},
  {"sec":"W3","id":"w3-east-wing","box":[106,52,120,74],"minY":null,"maxY":8,"graphArea":[106,52,120,74],"graphSize":[14,22,3.3],"differs":false},
  {"sec":"W3","id":"w3-partners-office","box":[113,74,120,78],"minY":null,"maxY":4,"graphArea":[113,74,120,78],"graphSize":[4,7,3],"differs":false},
  {"sec":"W3","id":"w3-east-post","box":[106,74,112,78],"minY":null,"maxY":4,"graphArea":[106,74,112,78],"graphSize":[4,6,3],"differs":false},
  {"sec":"W3","id":"w3-passage","box":[96,52,106,55.5],"minY":null,"maxY":8,"graphArea":[96,52,106,55.5],"graphSize":[3.5,10,3],"differs":false},
  {"sec":"W3","id":"w3-strongroom","box":[98,56,104,64],"minY":null,"maxY":4,"graphArea":[98,56,104,64],"graphSize":[6,8,3],"differs":false},
  {"sec":"W3","id":"w3-west-wing","box":[82,52,96,74],"minY":null,"maxY":8,"graphArea":[82,52,96,74],"graphSize":[14,22,3.3],"differs":false},
  {"sec":"W3","id":"w3-west-post","box":[85,74,91,78],"minY":null,"maxY":4,"graphArea":[85,74,91,78],"graphSize":[4,6,3],"differs":false},
  {"sec":"W3","id":"w3-coal-yard","box":[82,38,98,52],"minY":null,"maxY":4,"graphArea":[82,38,98,52],"graphSize":[14,16,12],"differs":false},
  {"sec":"W3","id":"w3-cartway","box":[88,34,92,38],"minY":null,"maxY":4,"graphArea":[88,34,92,40],"graphSize":[4,6,3],"differs":true},
  {"sec":"W3","id":"w3-front-hall","box":[96,64,106,72],"minY":null,"maxY":4,"graphArea":null,"graphSize":null,"differs":null},
  {"sec":"W4","id":"w4-back-lane","box":[44,30,120,34],"minY":0,"maxY":9.5,"graphArea":[44,30,120,34],"graphSize":[4,76,12],"differs":false},
  {"sec":"W4","id":"w4-gantry","box":[48,15,84,19],"minY":10,"maxY":null,"graphArea":[48,15,84,19],"graphSize":[4,36,12],"differs":false},
  {"sec":"W4","id":"w4-shed-three","box":[72,10,86,28],"minY":0,"maxY":9.5,"graphArea":[72,10,86,28],"graphSize":[14,18,6],"differs":false},
  {"sec":"W4","id":"w4-shed-two","box":[86,10,100,28],"minY":0,"maxY":9.5,"graphArea":[86,10,100,28],"graphSize":[14,18,6],"differs":false},
  {"sec":"W4","id":"w4-shed-yard","box":[44,6,72,28],"minY":0,"maxY":9.5,"graphArea":[44,6,72,28],"graphSize":[22,28,12],"differs":false},
  {"sec":"W4","id":"w4-canal-ledge","box":[44,3,72,6],"minY":-4.4,"maxY":-0.5,"graphArea":[44,3,72,6],"graphSize":[3,28,12],"differs":false},
  {"sec":"W4","id":"w4-jetty","box":[72,6,100,10],"minY":0,"maxY":9.5,"graphArea":[72,6,100,10],"graphSize":[4,28,12],"differs":false},
  {"sec":"W4","id":"w4-boat","box":[84,1,96,5],"minY":-1,"maxY":4,"graphArea":[84,1,96,5],"graphSize":[4,12,12],"differs":false},
]
"guards": [
  {"sec":"W1","k":0,"x":14,"z":17,"y":0,"role":"patrol","zone":"market","reason":"Market warden on his rounds: the stall rows and the clock end","route":[[14,17],[34,17],[34,28],[14,28]],"post":"w1-market","postD":0,"routeShare":{"w1-market":62},"missions":["threeGreyCoats"]},
  {"sec":"W1","k":1,"x":34,"z":40,"y":0,"role":"patrol","zone":"market","reason":"Market warden on the opposite round, covering the fish hall side","route":[[34,40],[12,40],[12,31],[34,31]],"post":"w1-market","postD":0,"routeShare":{"w1-market":62},"missions":["threeGreyCoats"]},
  {"sec":"W1","k":2,"x":11,"z":18,"y":0,"role":"lamp","zone":"market","reason":"Trims the stall lamps down the west side","route":[[11,18],[11,42]],"post":"w1-market","postD":0,"routeShare":{"w1-market":24},"missions":["threeGreyCoats"]},
  {"sec":"W1","k":3,"x":22,"z":42.5,"y":0,"role":"posted","zone":"clock","reason":"Minds the clock and the three couriers waiting under it","route":null,"post":"w1-market","postD":0,"routeShare":null,"missions":["threeGreyCoats"]},
  {"sec":"W1","k":4,"x":16,"z":50,"y":0,"role":"pair","zone":"scales","reason":"Porter at the scales: gossips with his mate while the hall is quiet","route":null,"post":"w1-fish-hall","postD":0,"routeShare":null,"missions":["threeGreyCoats"]},
  {"sec":"W1","k":5,"x":17.2,"z":50,"y":0,"role":"pair","zone":"scales","reason":"Porter at the scales: gossips with his mate while the hall is quiet","route":null,"post":"w1-fish-hall","postD":0,"routeShare":null,"missions":["threeGreyCoats"]},
  {"sec":"W1","k":6,"x":12,"z":47,"y":0,"role":"patrol","zone":"fish-hall","reason":"Hall watchman: checks the back door and the scales","route":[[12,47],[33,47],[33,56.5],[12,56.5]],"post":"w1-fish-hall","postD":0,"routeShare":{"w1-fish-hall":61.97},"missions":["threeGreyCoats"]},
  {"sec":"W1","k":7,"x":15,"z":10,"y":0,"role":"pair","zone":"tea-stall","reason":"Porter on his tea break by the canal steps: talks about everyone","route":null,"post":"w1-tea-stall","postD":0,"routeShare":null,"missions":["threeGreyCoats"]},
  {"sec":"W1","k":8,"x":16.2,"z":10.6,"y":0,"role":"pair","zone":"tea-stall","reason":"Porter on his tea break by the canal steps: talks about everyone","route":null,"post":"w1-tea-stall","postD":0,"routeShare":null,"missions":["threeGreyCoats"]},
  {"sec":"W2","k":0,"x":42,"z":50,"y":0,"role":"patrol","zone":"arcade","reason":"The arcade beadle: end to end, then back along the shop fronts","route":[[42,50],[74,50],[74,57],[42,57]],"post":"w2-arcade","postD":0,"routeShare":{"w2-arcade":78},"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W2","k":1,"x":55,"z":60.8,"y":0,"role":"posted","zone":"stair-foot","reason":"Pell's man: keeps the reading-room stair","route":null,"post":"w2-arcade","postD":0,"routeShare":null,"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W2","k":2,"x":44,"z":54,"y":0,"role":"patrol","zone":"arcade","reason":"Pell's man walking the arcade between the two ends","route":[[44,54],[70,54]],"post":"w2-arcade","postD":0,"routeShare":{"w2-arcade":26},"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W2","k":3,"x":55.5,"z":75,"y":4.5,"role":"posted","zone":"stair-head","reason":"Pell's minder: waits at the head of the stair for the courier","route":null,"post":"w2-reading-room","postD":0,"routeShare":null,"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W2","k":4,"x":46,"z":76,"y":4.5,"role":"keeper","zone":"reading-room","reason":"Keeper of the reading room: puts out the books and checks the shelves","route":[[46,76],[58,76],[58,79],[46,79]],"post":"w2-reading-room","postD":0,"routeShare":{"w2-reading-room":30},"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W2","k":5,"x":47,"z":78.2,"y":4.5,"role":"reader","zone":"reading-room","reason":"Night reader at his desk, nobody he wants to see","route":null,"post":"w2-reading-room","postD":0,"routeShare":null,"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W2","k":6,"x":51,"z":75.4,"y":4.5,"role":"courier","zone":"tgc-teale","reason":"Pell's courier: waits at the reading-room table for the hand-off","route":null,"post":"w2-reading-room","postD":0,"routeShare":null,"missions":["threeGreyCoats"]},
  {"sec":"W2","k":7,"x":46,"z":66,"y":4.5,"role":"decoy","zone":"tgc-fenn","reason":"Hired to walk in the same grey coat; knows nothing but his fee","route":null,"post":"w2-pawn-loft","postD":0,"routeShare":null,"missions":["threeGreyCoats"]},
  {"sec":"W2","k":8,"x":60,"z":66,"y":0,"role":"decoy","zone":"tgc-garrow","reason":"Hired to walk in the same grey coat; waits in the pie shop for his fee","route":null,"post":"w2-pie-shop","postD":0,"routeShare":null,"missions":["threeGreyCoats"]},
  {"sec":"W2","k":9,"x":60,"z":66.8,"y":4.5,"role":"clerk","zone":"pie-loft","reason":"Night clerk on his supper break: on the telephone with the founding year","route":null,"post":"w2-pie-loft","postD":0,"routeShare":null,"missions":["twoKeyLedger"]},
  {"sec":"W3","k":0,"x":102,"z":40,"y":0,"role":"patrol","zone":"yard","reason":"Yard watchman: the east yard and the gate lodge","route":[[102,40],[112,40],[112,47],[102,47]],"post":"w3-east-yard","postD":0,"routeShare":{"w3-east-yard":34},"missions":["twoKeyLedger"]},
  {"sec":"W3","k":1,"x":111,"z":48.6,"y":0,"role":"patrol","zone":"yard","reason":"Yard watchman's mate: walks the gate side, the lodge door and the fire escape foot","route":[[111,48.6],[112,50.9],[113.4,49.5],[113.4,45],[109,45]],"post":"w3-east-yard","postD":0,"routeShare":{"w3-east-yard":17.88},"missions":["twoKeyLedger"]},
  {"sec":"W3","k":2,"x":117,"z":48,"y":0,"role":"porter","zone":"w3-lodge-porter","reason":"Lodge porter: sleeps in the gate lodge until the bell rings","route":null,"post":"w3-lodge","postD":0,"routeShare":null,"missions":["twoKeyLedger"]},
  {"sec":"W3","k":3,"x":110,"z":57.4,"y":0,"role":"clerk","zone":"east-wing","reason":"Night clerk at his ledger desk in the east wing","route":null,"post":"w3-east-wing","postD":0,"routeShare":null,"missions":["twoKeyLedger"]},
  {"sec":"W3","k":4,"x":116,"z":57.4,"y":0,"role":"clerk","zone":"east-wing","reason":"Night clerk at his ledger desk in the east wing","route":null,"post":"w3-east-wing","postD":0,"routeShare":null,"missions":["twoKeyLedger"]},
  {"sec":"W3","k":5,"x":108,"z":56,"y":0,"role":"patrol","zone":"east-wing","reason":"Porter on rounds: the east wing and the key post","route":[[108,56],[118,56],[118,72],[108,72]],"post":"w3-east-wing","postD":0,"routeShare":{"w3-east-wing":52},"missions":["twoKeyLedger"]},
  {"sec":"W3","k":6,"x":108,"z":68,"y":0,"role":"messenger","zone":"front-hall","reason":"Runs messages between the wings","route":[[108,68],[100,68]],"post":"w3-east-wing","postD":0,"routeShare":{"w3-east-wing":3.04,"(none)":4.96},"missions":["twoKeyLedger"]},
  {"sec":"W3","k":7,"x":90,"z":55.4,"y":0,"role":"clerk","zone":"west-wing","reason":"Night clerk at the west wing desk","route":null,"post":"w3-west-wing","postD":0,"routeShare":null,"missions":["twoKeyLedger"]},
  {"sec":"W3","k":8,"x":83,"z":68,"y":0,"role":"porter","zone":"west-wing","reason":"Stacks porter: carries the day books between the shelves","route":[[83,68],[85.5,58],[83,58]],"post":"w3-west-wing","postD":0,"routeShare":{"w3-west-wing":23},"missions":["twoKeyLedger"]},
  {"sec":"W3","k":9,"x":99,"z":68,"y":0,"role":"watchman","zone":"front-hall","reason":"Front-hall watchman between the wings","route":[[99,68],[90,66]],"post":null,"postD":null,"routeShare":{"(none)":1.98,"w3-west-wing":7.02},"missions":["twoKeyLedger"]},
  {"sec":"W4","k":0,"x":46,"z":26,"y":0,"role":"patrol","zone":"shed-yard","reason":"Yard watchman: the wharf apron and the shed doors","route":[[46,26],[70,26],[70,9],[46,9]],"post":"w4-shed-yard","postD":0,"routeShare":{"w4-shed-yard":82},"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W4","k":1,"x":50,"z":20,"y":0,"role":"patrol","zone":"shed-yard","reason":"Yard patrol: walks the shed doors end to end","route":[[50,20],[66,20]],"post":"w4-shed-yard","postD":0,"routeShare":{"w4-shed-yard":16},"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W4","k":2,"x":51.5,"z":20.5,"y":0,"role":"patrol","zone":"shed-yard","reason":"Yard patrol on the canal side of the yard, a pace off his mate","route":[[51.5,20.5],[67.5,20.5]],"post":"w4-shed-yard","postD":0,"routeShare":{"w4-shed-yard":16},"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W4","k":3,"x":60,"z":13.6,"y":0,"role":"posted","zone":"crane","reason":"Crane watchman: keeps the yard leg of the crane","route":null,"post":"w4-shed-yard","postD":0,"routeShare":null,"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W4","k":4,"x":48,"z":26,"y":0,"role":"pair","zone":"tgc-minders","reason":"Pell's minder, off the launch: waits at the yard end until the twist","route":null,"post":"w4-shed-yard","postD":0,"routeShare":null,"missions":["threeGreyCoats"]},
  {"sec":"W4","k":5,"x":49.2,"z":26,"y":0,"role":"pair","zone":"tgc-minders","reason":"Pell's minder, off the launch: waits at the yard end until the twist","route":null,"post":"w4-shed-yard","postD":0,"routeShare":null,"missions":["threeGreyCoats"]},
  {"sec":"W4","k":6,"x":74,"z":24,"y":0,"role":"clerk","zone":"shed-three","reason":"Tally clerk counting the night shipment","route":null,"post":"w4-shed-three","postD":0,"routeShare":null,"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W4","k":7,"x":80.8,"z":11.2,"y":0,"role":"posted","zone":"shed-three","reason":"Guards the customs locker at the loading door","route":null,"post":"w4-shed-three","postD":0,"routeShare":null,"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W4","k":8,"x":76,"z":16,"y":0,"role":"pair","zone":"shed-three","reason":"Docker on a smoke between loads: talks to his mate","route":null,"post":"w4-shed-three","postD":0,"routeShare":null,"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W4","k":9,"x":77.2,"z":16,"y":0,"role":"pair","zone":"shed-three","reason":"Docker on a smoke between loads: talks to his mate","route":null,"post":"w4-shed-three","postD":0,"routeShare":null,"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W4","k":10,"x":78,"z":24,"y":0,"role":"hand-truck","zone":"shed-three","reason":"Wheels the hand truck between the loading door and the tally desk","route":[[78,24],[78,12]],"post":"w4-shed-three","postD":0,"routeShare":{"w4-shed-three":12},"missions":["threeGreyCoats","twoKeyLedger"]},
  {"sec":"W4","k":11,"x":74,"z":12,"y":0,"role":"foreman","zone":"shed-three","reason":"Foreman on his round of the shed, the dark side aisle included","route":[[74,12],[85,12],[85,26],[74,26]],"post":"w4-shed-three","postD":0,"routeShare":{"w4-shed-three":50},"missions":["threeGreyCoats","twoKeyLedger"]},
]
"guardCounts": {"W1":{"w1-market":4,"w1-fish-hall":3,"w1-tea-stall":2},"W2":{"w2-arcade":3,"w2-reading-room":4,"w2-pawn-loft":1,"w2-pie-shop":1,"w2-pie-loft":1},"W3":{"w3-east-yard":2,"w3-lodge":1,"w3-east-wing":4,"w3-west-wing":3},"W4":{"w4-shed-yard":6,"w4-shed-three":6}}
"starts": [
  {"sec":"W1","start":[7,0,10],"space":"w1-canal-steps","checkpointTag":["w1-canal-steps"]},
  {"sec":"W2","start":[42,0,55],"space":"w2-arcade","checkpointTag":["w2-arcade"]},
  {"sec":"W3","start":[111.4,8.4,68],"space":"w3-roof","checkpointTag":["w3-east-yard"]},
  {"sec":"W4","start":[90,0,32],"space":"w4-back-lane","checkpointTag":["w4-back-lane"]},
]
"vantages": [
  {"pair":"w1-vantage-market","a":[3,4.5,29.4],"b":[3,4.5,30.8],"mid":[3,4.5,30.1],"spaceOnStorey":"w1-gallery","inPlan":["w1-gallery@4.5"]},
  {"pair":"w1-vantage-hall","a":[7.4,4.5,52.6],"b":[7.4,4.5,53.6],"mid":[7.4,4.5,53.1],"spaceOnStorey":"w1-warden-office","inPlan":["w1-warden-office@4.5"]},
  {"pair":"w2-vantage-arcade","a":[58.8,8.4,62.6],"b":[60.6,8.4,62.6],"mid":[59.7,8.4,62.6],"spaceOnStorey":"w2-arcade-roof","inPlan":["w2-pie-shop@0","w2-pie-loft@4.5","w2-arcade-roof@8.4"]},
  {"pair":"w2-vantage-reading","a":[51,8.4,66.8],"b":[52.6,8.4,66.8],"mid":[51.8,8.4,66.8],"spaceOnStorey":"w2-arcade-roof","inPlan":["w2-pawn-loft@4.5","w2-arcade-roof@8.4"]},
  {"pair":"w3-vantage-yard","a":[102.55,4.2,49.6],"b":[102.55,4.2,51.2],"mid":[102.55,4.2,50.4],"spaceOnStorey":null,"inPlan":["w3-east-yard@0"]},
  {"pair":"w3-vantage-east","a":[111.5,0,77],"b":[110.4,0,77.6],"mid":[110.95,0,77.3],"spaceOnStorey":"w3-east-post","inPlan":["w3-roof@8.4","w3-east-post@0"]},
  {"pair":"w3-vantage-west","a":[86.7,4.2,60.6],"b":[87.9,4.2,60.6],"mid":[87.3,4.2,60.6],"spaceOnStorey":null,"inPlan":["w3-roof@8.4","w3-west-wing@0"]},
  {"pair":"w4-vantage-yard","a":[51,10,18.6],"b":[53,10,18.6],"mid":[52,10,18.6],"spaceOnStorey":"w4-gantry","inPlan":["w4-gantry@10","w4-shed-yard@0"]},
  {"pair":"w4-vantage-shed","a":[87.6,0,18.2],"b":[87.6,0,19.8],"mid":[87.6,0,19],"spaceOnStorey":"w4-shed-two","inPlan":["w4-shed-two@0"]},
]
"throws": [
  {"id":"w2-throw-pawn","link":"w2-pawn-loft -> w2-reading-room","thrower":{"x":51.2,"y":4.5,"z":67.2},"runner":{"x":51.2,"y":4.5,"z":65.9},"stage":[50.2,72.5,52.2,73.5],"dist":5.8,"edge":[51.2,67.6],"farEdge":[51.2,72.5],"gap":4.9,"land":[51.2,73],"landFloor":4.5,"ok":true,"room":"ok"},
  {"id":"w2-throw-pie","link":"w2-pie-loft -> w2-clock-loft","thrower":{"x":63,"y":4.5,"z":69.6},"runner":{"x":63,"y":4.5,"z":68.3},"stage":[61.5,72.5,64.5,73.5],"dist":3.2,"edge":[63,70],"farEdge":[63,72.5],"gap":2.5,"land":[63,72.8],"landFloor":4.5,"ok":true,"room":"ok"},
  {"id":"w2-throw-lane","link":"w2-arcade-roof -> w3-roof","thrower":{"x":76.7,"y":8.4,"z":66},"runner":{"x":75.1,"y":8.4,"z":66},"stage":[82,64.5,86.5,67.5],"dist":5.8,"edge":[77.1,66],"farEdge":[82,66],"gap":4.9,"land":[82.5,66],"landFloor":8.4,"ok":true,"room":"ok"},
]
"anchors": {"galleryLadder":{"base":{"x":6.45,"y":0,"z":15},"top":{"x":6,"y":4.5,"z":15},"facing":-1.57,"footStepOff":[7.15,0,15],"topOut":[5.6,4.5,15],"h":4.5},"plantLadder":{"base":{"x":72,"y":4.5,"z":66.15},"top":{"x":72,"y":8.4,"z":66.60000000000001},"facing":0,"footStepOff":[72,4.5,65.45],"topOut":[72,8.4,67],"h":3.9},"downpipe":{"base":{"x":47.5,"y":4.5,"z":61.6},"top":{"x":47.5,"y":8.4,"z":61.6}}}
"egress": {"E1":{"faceConvention":12.35,"centreConvention":12.5,"nav":13.45,"reachLandingToGate":14.55},"E2":{"doorToDoor":9.75,"nav":10.56},"E3":{"doorToDoor":11.98,"clearWidth":1.69,"walls":[54.15,55.85],"t13":9.22},"E4":{"jettyTop":0,"bedY":-4.4,"levelChange":4.4,"takeOff":[74,0,6.3],"dropPlan":0.9,"bedWalkToLedge":2.15,"length":3.05,"t13":3.05,"t30":1.72},"E5":{"cageDoor":[6.6,0,14.4],"footStepOff":[7.15,0,15],"topOut":[5.6,4.5,15],"h":4.5,"length":6.16,"up_s":10.02,"downClimb_s":7.59,"downSlide_s":1.8},"E6":{"walk":3.25,"h":3.9,"roof":4.81,"length":11.96,"up_s":8.85,"t13":15.05},"E7":{"doorToDoor":10.29,"t13":7.92,"width":1.3},"E8":{"c3LandingToLoftDoor":4.56},"E9":{"navDetour":55.2,"poly":16.83,"t13":12.95},"E10":{"nav":19.2,"t13":14.77},"E11":{"toFoot":2.23,"climb":3.9,"roof":29.45,"length":35.58,"climb_s":5.98}}
"throwLinks": {"pawn":{"walkIn":6.55,"run":1.3,"fly":5.8,"toDoor":0.5,"length":14.15,"t13":7.82,"move_s":2.78},"pie":{"walkIn":6.42,"run":1.3,"fly":3.2,"toDoor":0.7,"length":11.62,"t13":7.88,"move_s":2.94},"lane":{"walkInFromTankLadder":3.26,"run":1.6,"fly":5.8,"move_s":2.63}}
"tgc": {"points":{"F":[7,0,10],"spot":[4,0,13.5],"land":[4,4.5,14.6],"galleryDoor":[4,4.5,46],"desk":[3,4.5,50],"stairHead":[7,4.5,51.5],"stairFootIn":[7,0,44.6],"out1":[7,0,43.4],"teaIn":[12,0,10],"listen":[18.8,0,8.6],"clock":[22,0,41],"mkt":[16,0,15]},"a":{"forkToSpot":4.61,"boost_s":2.6,"landToGalleryDoor":31.4,"galleryDoorToDesk":4.12,"deskToStairHead":6.26,"stairHeadToFoot":8.24,"footToOut":1.2,"outToClock":15.19},"b":{"forkToTea":5,"teaToListen":6.94,"listenToMarket":13.87,"listenToClock":43.25},"door":{"a":{"boost":2.6,"galleryToOffice":24.15,"officeToMarket":15.25},"b":{"canalToTea":0,"teaToMarket":16.01},"sumA":42,"sumB":16.01,"pct":61.88},"meet":{"a":{"boost":6.15,"galleryToOffice":24.15,"officeToMarket":26.93},"b":{"canalToTea":3.85,"teaToMarket":38.61},"sumA":57.23,"sumB":42.46,"pct":25.81},"reach":{"deskByLadder":16.05,"deskByStair":16.49,"galleryLandingByLadder":4.61},"soloUpFromTeaStall":{"toGallery":false,"toOffice":false}}
"tkl": {"points":{"sash":[89,8.4,60.4],"galLand":[89,4.2,61.2],"wStairFoot":[85,0,58.4],"westDoor":[96,0,52.95],"feHead":[108.65,8.4,52.6],"feFoot":[110.6,0,49.75],"gate":[112,0,52],"eastDoor":[106,0,53.75],"corner":[84,8.4,66],"bulk":[111.4,8.4,68]},"k":{"dropPlan":0.8,"drop_s":0.68,"galleryAndStair":16.41,"stairFootToWestDoor":12.46,"fireEscapeNav":55.2,"fireEscapePoly":16.83,"footToGate":2.65,"gateToEastDoor":6.15,"roofCornerToSash":8.93,"roofCornerToFireEscape":29.7,"roofBulkToSash":24.45,"roofBulkToFireEscape":15.64},"a":{"drop":13.92,"westWingToPassage":9.58},"b":{"fireEscape":12.95,"yardToEastWing":2.04,"eastWingToPassage":4.73},"sumA":23.5,"sumB":19.72,"pct":16.09,"withRoofFromCorner":{"a":30.37,"b":42.57},"reach":{"yardToWestWing":10.09,"westStairFootToEastWing":8.44,"westGalleryToEastWing":13.3}}
"exit": {"tgc":{"from":[75.5,0,15],"to":[88,-1,3],"nav":19.61,"poly":20.5,"t13":15.08,"t30":6.54},"tkl":{"from":[90,0,46],"to":[88,-1,3],"toShutter":17.09,"crawl":2.4,"fromShutter":26.05,"length":45.54,"shutter_s":3.2,"t13":36.38,"t30":17.58,"inW3":12,"newGroundPct":73.65}}
```
