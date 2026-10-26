# Tallow Wharf D0: wave-0 graph, validator runs
Owner: Campaign Build. Status: current.

J8 tallow-fixes slice D0 (Night Shift | Cloud Builder 3, 2026-10-26; brief `briefs/campaign-tallow-d0.md` on
`cloud-queue`). The graph edit follows `docs/tallow-fixes/EGRESS.md` section 1 where it differs from the plan.
Two ERRs the plan did not expect came out of D0 (section 5). **ERR 1 is cleared** by the W2 roof slice (branch
`feature/tallow-d0-w2roof`, 2026-10-26: the west downpipe, EGRESS E11, lead ruling ~10:10). **ERR 2 stays open**: it
waits on Marlow Build's validator ruling.

## 1. Refs
- Base: `feature/tallow-fixes` d286ecd89. Branch `feature/tallow-d0`; the graph commit is d24187e7.
- Validators, extracted with `git archive` into a scratch folder, plain node:
  - master 2a937eb6b
  - `feature/mission-validator` 0c62a921f
  - `feature/validator-port-train` fede9015e (contains S7b ebb58a113: `git merge-base --is-ancestor` holds)
- Every extract already had `docs/design/metrics.json`, so `metrics-gen` was not run.

## 2. The changes (`graph.json`; link numbers 0-based on the base)
| Step | Plan id / EGRESS row | Change |
| --- | --- | --- |
| 1 | A5, E1 | New `door` `w2-pawn-loft>w2-reading-room`, 1.2 x 2.1, length 12.4, `bolted`, at [44.75, 4.5, 70.55] |
| 1 | A5, E2 | New `door` `w2-lane-window>w2-clock-loft`, 1.2 x 2.1, length 9.8, `bolted`, at [69.25, 4.5, 71.75] |
| 2 | A25, E3 | Link 21 `w2-arcade>w2-reading-room` (`open_stair`): `bolted: true`, reason: the stair-head push bar |
| 3 | A6, E4 | New `drop` `w4-jetty>w4-canal-ledge`, shadow, level_change 4.4, length 6.0, time_s 3, at [74.0, 0, 6.0] |
| 4 | M2, A22, A24 | Links 28 and 33 (`team_throw`): width 4.9, `exception: "long_throw"`, reason rewritten |
| 4 | M2, G403 | Link 29 `w2-pie-loft>w2-clock-loft`: width 2.5 kept, no exception, `note` "not yet forced ..." |
| 5 | A29 | Link 30 `w2-reading-room>w2-clock-loft` deleted; the `w2-clock-loft` note says why (PB, G403) |
| 6 | A30, E10 | Link 36 `w3-roof>w3-east-wing`: unbolted, `bolted_in: ["twoKeyLedger"]`, a `note` citing A30 |
| 6 | E9 | Link 35 `w3-roof>w3-east-yard`: length 31, at [108.65, 8.4, 52], reason adds the move 1.7 m east (G3) |
| 7 | A7, E6 | Link 31 `hatch` -> `ladder`: width 1.2, length 16, level_change 3.9, time_s 5, at [72, 4.5, 66.15] |
| 7 | E6 | Link 32 (the dormer `window`) deleted |
| 8 | E7 | Link 22 `w2-arcade>w2-pawn-loft` (`fire_stair`, bolted): width 1.3, length 14.5, time_s 8, at [53, 0, 62] |
| 8 | E8 | Link 25 `w2-walkway>w2-pawn-loft` (`door`): length 6.5, at [45, 4.5, 62]; the door moved from x 49 to x 45 |
| 9 | A11, E5 | TGC split tags and assist; a new `ladder` `w1-canal-steps>w1-gallery`, bolted, at [6.6, 0, 14.4] |
| 9 | A11 | TKL split tags and assist; time_s on the four TKL leg links (section 4) |
| 10 | - | One sentence added to `meta.note` (D0, the date, "EGRESS section 1") |
| 11 | E11 (W2 roof slice, lead ruling ~10:10) | New `pipe` `w2-walkway>w2-arcade-roof` (the west downpipe), route `high`, level_change 3.9, length 36, time_s 6, at [47.5, 4.5, 61.6] (clears ERR 1) |

Step 7's ladder keeps no `height` (no ladder link in the file has one). **No other stair is added** (EGRESS section 3,
LP picks 2-4). The shutters' `"gap": 0.9`, the Q19 text and every other link and space are unchanged.

## 3. Renumbering
Links 30 and 32 are deleted. Link 31 (the tank-room ladder) becomes 30, and every link after 32 moves down two:
- the C5 throw `w2-arcade-roof>w3-roof` 33 -> **31**
- the fire escape `w3-roof>w3-east-yard` 35 -> **33**
- the bulkhead `w3-roof>w3-east-wing` 36 -> **34**

The base had 72 links; D0 left 74, and step 11 (E11) appends one: the file now has 75. Final 0-based index of every link
D0 touched or added:

| Link | Kind | Index |
| --- | --- | --- |
| `w1-market>w1-gallery` (assist) | coop_boost | 4 |
| `w2-arcade>w2-reading-room` | open_stair | 21 |
| `w2-arcade>w2-pawn-loft` | fire_stair | 22 |
| `w2-walkway>w2-pawn-loft` | door | 25 |
| `w2-pawn-loft>w2-reading-room` | team_throw | 28 |
| `w2-pie-loft>w2-clock-loft` | team_throw | 29 |
| `w2-lane-window>w2-arcade-roof` | ladder | 30 |
| `w2-arcade-roof>w3-roof` | team_throw | 31 |
| `w3-roof>w3-east-yard` | fire_stair | 33 |
| `w3-roof>w3-east-wing` | fire_stair | 34 |
| `w3-roof>w3-west-wing` | drop | 35 |
| `w3-east-yard>w3-east-wing` | door | 36 |
| `w3-east-wing>w3-passage` | door | 43 |
| `w3-west-wing>w3-passage` | door | 46 |
| `w2-pawn-loft>w2-reading-room` (E1, new) | door | 70 |
| `w2-lane-window>w2-clock-loft` (E2, new) | door | 71 |
| `w4-jetty>w4-canal-ledge` (E4, new) | drop | 72 |
| `w1-canal-steps>w1-gallery` (E5, new) | ladder | 73 |
| `w2-walkway>w2-arcade-roof` (E11, new) | pipe | 74 |

J12 matches the long-throw spots by `tallowWharf:<from>><to>`, not by number. The lead tells Marlow the C5 throw is
now 31.

## 4. Splits
Speeds and limits come from master's metrics: legs at 1.3 m/s, reach at 3.0 m/s, parity 20%, reach 15 s, a leg 90 s.

**TGC `tgc-leads`** (the ~21:40 ruled default):
- Tags: leg a = `w1-gallery` and `w1-warden-office`; leg b = `w1-tea-stall`; overwatch = `w1-gallery`.
- Assist: on `w1-market>w1-gallery` (`coop_boost`).
- Plan numbers: leg a = ladder 3 + gallery -> office 15.4 + the warden's stair down 8 = 26.4 s; leg b = 6.9 + 15.0 =
  21.9 s; 17%.
- Master cannot time the legs: see ERR 2 (section 5).
- Worst reach on the real bolts is 12.7 s, from the office: office -> gallery `door` 6.7 s, then down the ladder 3.0 s,
  then canal steps -> tea stall 3.0 s.
  - Bolt on that path: the ladder's foot door. It is bolted on the cage side (E5). A, boosted up, climbs down inside
    the cage and unbolts it for B, and then it stays open (level-design 11.6).
  - The first time, A's climb down to open it adds about 3 s, so about 15.7 s on that first trip (LP pick 1).
  - From the gallery: 6.0 s.
- From the tea stall there is no solo path up until A opens the ladder foot. The warden's stair foot (link 7) opens
  from the stair side only.

**TKL `tkl-wings`** (the BEAT legs, timed door to door):
- Tags: leg a = `w3-west-wing`; leg b = `w3-east-yard` and `w3-east-wing`; overwatch = `w3-roof`.
- Assist: on the `w2-arcade-roof>w3-roof` throw. The split rejoins at `w3-passage`.
- Leg a = `w3-roof>w3-west-wing` drop 10 s (lantern drop 3 + gallery 2.3 + its stair 4.6, G1's gallery and W3 route 2's
  points) + `w3-west-wing>w3-passage` 12.7 s (the stacks to the west door, ~16.5 m) = **22.7 s**.
- Leg b = the fire escape 14 s + `w3-east-yard>w3-east-wing` 1.5 s (the moved foot (110.6, 0, 49.75) to the east gate,
  ~2 m, G3 / E9) + `w3-east-wing>w3-passage` 5 s (the gate to the east door, ~6.5 m) = **20.5 s**. Parity 10%.
- Master raises no split ERR or WARN for tkl-wings on any run, the TKL-state runs included.
- Worst reach on the graph is 9.5 s, from the east yard: the east gate 1.5 s, then the wing double door 8.0 s.
  - The plan's 14.3 s goes through the front hall, a geometry route the graph does not hold.
  - Bolts on that path: none in the graph. The east gate is the keypad, opened with the code B holds; the double door
    is open.
  - In TKL the bulkhead foot opens from the wing side only (A30), so no reach path uses the bulkhead.

**BEAT lines J7 needs:**
- TGC: "A climbs down inside the ladder cage and unbolts its foot door for B".
- TKL: none (the fire-escape line is G3's).

## 5. Validator runs (`docs/tallow-fixes/val/D0-*.txt`)
The saved files are the W2 roof slice's reruns (same validator refs, same commands, the graph with E11). Before = D0's
runs (799364de9); the only line that changed in every file is ERR 1's, gone. WARN and INFO lines are identical.

| File | Validator | Graphs | ERR before -> now | WARN before -> now |
| --- | --- | --- | --- | --- |
| `D0-master-map.txt` | master | map | 4 -> 3 | 8 -> 8 |
| `D0-master-map-tgc.txt` | master | map + TGC | 4 -> 3 | 8 -> 8 |
| `D0-master-map-tkl.txt` | master | map + TKL | 4 -> 3 | 8 -> 8 |
| `D0-master-tklstate.txt` | master | map, bulkhead `bolted: true` | 4 -> 3 | 8 -> 8 |
| `D0-master-tklstate-tkl.txt` | master | map (bulkhead bolted) + TKL | 4 -> 3 | 8 -> 8 |
| `D0-mission-validator-map.txt` | mission-validator | map | 3 -> 2 | 8 -> 8 |
| `D0-validator-port-train-map.txt` | validator-port-train | map | 4 -> 3 | 9 -> 9 |
| `D0-validator-port-train-map-tgc.txt` | validator-port-train | map + TGC | 4 -> 3 | 9 -> 9 |
| `D0-validator-port-train-map-tkl.txt` | validator-port-train | map + TKL | 4 -> 3 | 9 -> 9 |

The scratch TKL-state copy is not committed. `D0-graph.diff` is `git diff d286ecd89 -- graph.json` (now with E11).
Today's master (34b96b9c, not saved) prints the same lines as 2a937eb6b on all five master runs, before and after E11.

Remaining ERRs now: the two named long-throw lines (master and train; expected, A22) and ERR 2 (master and train).
mission-validator: the two throw lines only.

**The expected ERRs (A22).** Every run has exactly the two named lines:
- `link w2-pawn-loft -> w2-reading-room (team_throw): gap 4.9 m above the 2.7 m throw`
- `link w2-arcade-roof -> w3-roof (team_throw): gap 4.9 m above the 2.7 m throw`

The mission-validator adds "(kit.throwDist 3.2 less the 0.5 m landing margin)" to the same two lines.

**The long throws on J12's train do not pass as INFO yet.** The train validator has the S7b check, but the train's
`docs/design/metrics.json` has no `sizes.throw_long` row. So it prints
`WARN: metrics: sizes.throw_long is missing from the metrics; the long-throw check (falls back to the throw gap row)
skipped` (its ninth WARN) and keeps the two gap ERRs. The row comes with the scale sheet's "Long throw (named spots
only)" row, which is not on the train yet: J12's item.

**WARNs.** The 6 known ones (`room_class custom` x5, `w3-chute` off the grid), plus 2 new ones from EGRESS's numbers:
- `link w2-pawn-loft -> w2-reading-room (door): length 12.4 is off the 0.5 m grid` (E1, link 70)
- `link w2-lane-window -> w2-clock-loft (door): length 9.8 is off the 0.5 m grid` (E2, link 71)

**mission-validator.** Not 0 ERR: the two named throw lines (ERR 1 is cleared). It prints no optional-reward line and
no split check.

**ERR 1, cleared (W2 roof slice, step 11):** `section W2: 1 independent route(s) from entry 'w2-arcade' to exit
'w2-arcade-roof' (need 2 edge-disjoint)` was in all 9 runs. The lead ruled (~10:10) option (b) below: keep E6, no gate
exception, a real second way up. EGRESS E11 (design in EGRESS section 5; geometry in the G2 brief's step 6b): the west
downpipe from the walkway, at C3's west landing, up the loft row's south facade to the eaves, `pipe`
`w2-walkway>w2-arcade-roof` (link 74). W2's two edge-disjoint routes are now arcade -> walkway -> lane-window loft ->
tank-room ladder -> roof, and arcade -> walkway (by another C3 link) -> downpipe -> roof. It opens no solo bypass (its
foot is behind C3, 4.5 m over the arcade floor), joins no pair a co-op link joins (no solo twin), and the forced-gate
check stays clean. The text below is D0's record.
- Cause: E6 deletes the dormer `window` (link 32). Before D0, W2's two routes to the arcade roof were the hatch and the
  window, two links through one opening in the corner loft. Every other inner W2 path to the roof goes through the
  lane-window loft's one ladder. The C5 links are `spine` and the validator leaves them out of the count.
- Neither the plan nor EGRESS names a data fix, and LP's section 3 adds no stair. Options for the lead:
  - (a) Keep the window link: this undoes E6, and the sash is inside the tank room.
  - (b) A second roof access from another W2 space: geometry for G2, from a new LP row.
  - (c) A gate exception through the orchestrator.

**ERR 2, not cleared:** `split tgc-leads leg a: no solo link leads into w1-gallery` (master and train, all runs).
- Cause: the plan's split defaults were modelled at master 4e5e9959, whose split check walked `arcsOf(links, solo)`
  (bolt direction ignored, `level-validate.mjs:958`). Master's validator-port S0 fix round 2d9ad6f7 ("split legs walk
  solo arcs") now times legs on `soloArcsOf`, so a `bolted` link is walked alone only from its `to` end.
- The E5 ladder is bolted at its foot, and the boosts into the gallery are co-op, so on the real bolts no solo link
  leads into leg a's first space. This is the "validator's bolt blind spot" the plan describes, now closed in the
  validator.
- Diagnostic (scratch copy, not committed): with the ladder unbolted, the split check is clean (parity and reach pass).
  But it adds `link w1-canal-steps -> w1-gallery (coop_boost) has a solo twin: ... (ladder)`. So no data-only setting
  passes both.
- Options for the lead:
  - (a) The split check counts a co-op link from the fork into the first leg space as the leg's entry (a validator
    change: J12 / Marlow Build).
  - (b) Legs re-chosen so that leg a starts in a space with a solo entry (a BEAT change: J7).
  - (c) A gate exception through the orchestrator.

**`checkCoop` on the splits:** clean for `tkl-wings`. Not clean for `tgc-leads` (ERR 2).

## 6. Tests
`npx vitest run tests/tallowWharf/ --maxWorkers=2`: 7 files, 143 passed, 0 failed. The graph change breaks no Tallow
test. Rerun with E11 (W2 roof slice, below-normal priority): 7 files, 143 passed, 0 failed. The downpipe's own tests
come with its geometry in G2 (brief step 13); no test reads the graph's link count.
