# Campus S1-S5 - first validator run (V5f REPORT)

V5f, 2026-10-24. Branch `feature/level-validator-v5f` (job head d4f30413: V1 validator + V1a metrics + V5a-e graphs). The
validator is the same file the V1 checker passed (7c54018c on `feature/level-validator`). Full output:
`docs/level-validator/campus-run/run.txt`. Command (default metrics `docs/design/metrics.json`):

```
node scripts/level-validate.mjs docs/sector-redesign/graph/campusOps-S1.json ...-S2.json ...-S3.json ...-S4.json ...-S5.json
```

Latest rerun by the lead (after V1b: all 16 metrics keys, step band, no-softlock, safe drop 4.5; after the fix round: approaches count only entering links, dead ends count links out, new solo-twin check; after the V5 check: S2 facilities and S5 anteroom at clear size): **149 errors,
151 warnings, exit 1**; run.txt holds this rerun. The per-section tables below are from the first run (rerun deltas: the new solo-twin WARN on S5 CR7, s5-roof now ERR with 1 approach, s5-lowroof a dead end, s3-walkway and s2-l2-exec no longer dead ends, facilities under the 6.0 floor;
7 missing-key WARNs gone, safe-drop WARNs added). First run result: **147 errors, 150 warnings, exit 1.** The graphs describe the map AS BUILT (base c7784fc9; coop4's two
`minPlayers` S4 guards are not on that base and are not counted). Every shadow / vantage / LOS value is an estimate,
pending V6.

## For Michael

1. No campus section passes: 149 errors, 151 warnings (latest rerun; first run 147 / 150). The errors fall into four groups:
   - Sizes (43): rooms and corridors were built at real-world size, before the 1.4x room table.
   - Missing ways in (41).
   - Light and view targets (32, all estimates).
   - Dead-end rooms (27).
2. Worst find: S5's "co-op only" rope (CR7) works solo. A solo player can step off the archive sill (4.2 m, no rail,
   no fall damage) into the light well. That breaks G280 (co-op routes must not work solo).
3. Corridors are too narrow in S2-S5: 1.2-2.45 m against the 3.0 m floor (S2 balcony strips, S3 viewing corridor, S4
   service corridor, S5 vestibule and passage).
4. S3 needs a re-plan: one single chain of doors from the bridge to the dock, no second route, the L1 band on one
   1.25 m stair. S1, S2, S4 and S5 can be patched inside their current shells.
5. Light: 22 of 25 encounter spaces miss the 40-60% shadow target. Most are fully lit or fully dark (estimates, V6
   measures them).
6. Ways in: 19 of 25 encounter spaces lack a shadow, high or loud approach.
7. Co-op: co-op moves touch 6 of 25 encounter spaces (need half). No section has a split, so the 90 s / 20% / 15 s
   rules are not tested on campus yet.
8. Your complaints: hallways too small - found in S2-S5. Door swings - found in S3-S5, but only visual (an open door
   has no collision). Out of bounds - found in S1 and S3 (open ground inside the map edge). Poor flow - found in every
   section. Rooms placed randomly - only partly, in S1 and S3.
9. Guard counts: only 3 of 25 encounter spaces fall in the 3-6 / 6-10 bands. Campus and Marlow Yard run 1-3 guards per
   space. My advice: do not make the band a rule yet.

## Lead decisions applied (V5f-n)

- **V5f-1 Spine links.** One per connector, in the upstream section's file, from its exit space to the next entry space:
  - C1 `s1-forecourt -> s2-foyer` (S1 file): S1's guessed `s2-reception` renamed to S2's real entry (S2.md). Door 1.2 x
    2.1, length 19.5 kept.
  - C2 `s2-l1-landing -> s3-c2` (S2 file, added): S2.md's link, corridor 3.5 x 3.0 (the 3.7 clear bridge on the 0.5
    grid). Length 15 (landing middle to the far door 9 m, plus 6 m to the s3-c2 middle). Level change 0.1 (S3.md).
    S3.md names the 1.2 m far door as the narrowest point; that is in the link's note.
  - C3 `s3-dock -> s4-dock` (S3 file, added): S3.md's link, corridor 3.7 x 3.0. Length 27 (S3.md's 24 m to the far door,
    plus 3 m to the S4 dock middle).
  - C4 `s4-cc -> s5-lobby` (S4 file): kept as written.
- **V5f-2 Start and exfil.** Checked, no change needed: one `start` (`s1-verge`, S1's first space) and `exfil` on
  `s5-lawn` (S5's exit). Merged meta comes from the S1 file (`mode: sector`, `players: [2]`). Sections are merged in
  file order: S1-S5.
- **V5f-3 One encounter rule** (from graph-schema `type` and level-design 3 / 3.8, with the lead's wording). An
  `encounter` is a play space whose guards the route must get past:
  1. A play space: a room class that can hold an encounter (sheet 7 "Encounter?" yes or conditional), or a yard, roof
     or deck. Never a corridor, stair, catwalk or mantrap (the validator calls those "no play space").
  2. On the route: one of the section's built routes (`S<n>_ROUTES`, the SPEC's stealth / loud / high) or a SPEC co-op
     route (CR1-CR7) passes through it, or it holds the objective. A side room no route enters does not count.
  3. It holds guards the route must get past. A single officer posted at a section connector door (a K choke, or the
     S3 C2 landing officer) does not count; the schema keeps chokes beside the spine link.

  Everything else is typed by its function. Its guards and former targets move to `note`. Retyped:
  - Encounter -> other (9):
    - `s2-l1-kitchen` -> utility (side room, dead end).
    - `s2-l1-landing` -> connector (only K2).
    - `s2-l2-plan` -> hub (no route walks L2).
    - `s3-view` -> connector (corridor).
    - `s4-nc` -> connector (corridor, off route).
    - `s4-sec` -> utility (off route).
    - `s4-noc` -> utility (off route, dead end).
    - `s4-cc` -> connector (corridor, only K3).
    - `s5-gal` -> connector (corridor, no route on L1).
  - Utility -> encounter (1): `s5-kitchen`. It is on the loud route ("out by the kitchen", `campusS5Data.ts`) and
    patrolled by #21. V5e wrote no targets for it, so it shows 3 "missing" ERRs until S5's follow-up declares them.

  Kept as encounters (25):
  - S1: gatehouse, carpark, dyard, forecourt.
  - S2: foyer, hall, l1-plan, l1-wing, l1-facilities.
  - S3: hall, dock.
  - S4: dock, lobby, batt, yard, deck, hall.
  - S5: ante, hall, garden, terrace, lawn, roof, arch, kitchen.

  S4 lobby stays an encounter: the mantrap officer is not at a section connector door.
- **V5f-4 Structural fixes the CLI demanded:** only one. `s2-reception` was an unknown space and stopped every check
  (fixed by V5f-1). No other graph change.
- **V5f-5** `s3-yard` stays unreachable (no door or link reaches it). That is a true finding. The open ground that
  does reach it (S3.md H8) is not in the graph.
- **V5f-6** The guard bands below are counted by hand: the metrics keys for them are missing, so the CLI printed no
  guard INFO. S3 counts as "early": A3 puts sections at index < 2.5 of 5 in the first half.

## Counts per section (ERR / WARN by rule)

Spine-link WARNs go to the upstream section. Map-wide lines are listed on their own.

| Section | ERR | ERR by rule | WARN | WARN by rule |
| --- | --- | --- | --- | --- |
| S1 Gatehouse | 13 | class min size 3, camera floor 2, rule of three 3, targets 3, dead end 2 | 18 | opening width 11, custom class 6, ceiling 1 |
| S2 HQ | 40 | dead end 16, class min size 11, targets 7, rule of three 6 | 37 | ceiling 20, off grid 8, opening width 4, class max 3, custom 2 |
| S3 Labs | 26 | class min size 9, rule of three 5, dead end 4, fire stair width 3, targets 3, redundancy 1, reach 1 | 31 | off grid 13 (C3 incl.), ceiling 9, class max 3, custom 3, opening width 3 |
| S4 Data hall | 28 | rule of three 14, targets 6, class min size 5, camera floor 1, fire stair width 1, dead end 1 | 26 | ceiling 11, off grid 7 (C4 incl.), class max 4, custom 2, pacing release 2, corridor width 1 (C4 5.7) |
| S5 Old House | 39 | targets 13 (3 missing on kitchen), rule of three 13, class min size 7, dead end 4, camera floor 1, pacing 1 | 30 | ceiling 14, off grid 7, custom 5, class max 2, open stair 1, pacing release 1 |
| Map-wide | 1 | co-op coverage (6 of 25 encounter spaces) | 8 | metrics keys missing 7, secret in 3 of 25 guarded spaces 1 |
| **Total** | **147** | | **150** | (+ 2 INFO: guard band keys missing) |

Rules that passed everywhere:
- Spine: the sections are joined in order and no route skips a section.
- Reach: no space is reached only by a co-op move (no softlock). Every objective has a way to exfil.
- Redundancy holds in S1, S2, S4 and S5.
- Routes cross in every section.
- The step band (0.40-0.45) is not hit by any link.
- Door, double-door and shared widths pass.

### Metrics keys missing (V1b adds them) and what they skipped

These keys are in no metrics file yet: `sizes.ceiling_min`, `sizes.door_h_min`, `sizes.door_h_max`, `sizes.coop_lip`,
`rules.safe_drop_m`, `rules.guards_max`, `rules.dead_end_max_m`, `rules.guards_early`, `rules.guards_late`.

What was skipped, and what the result would be by hand:

| Check skipped | Result by hand |
| --- | --- |
| Absolute ceiling ERR under 2.4 | Would pass: the lowest are `s5-core-r` and `s2-roof-plant` at 2.4. |
| Door height 2.0-2.2 | Would pass: every door is 2.1. |
| Co-op lip band 4.3-4.5 | Would pass: every lip is 4.4. |
| Safe drop WARN over 3.5 m | Would add 11 WARNs: 2 in S1 at 4.4, 2 in S4 at 4.4, 7 in S5 at 4.2-8.4. |
| Guard maximum ERR over 10 | Would pass: the top count is 6 (`s4-hall`). |
| Objective dead-end depth (15 m) | Would pass: `s2-l1-facilities` 7.5, `s5-strong` 7. |
| Guard band INFO | Done by hand below. |

Not reached in this run: split timing, partner reach, parity, overwatch and assist (no split is tagged anywhere), and
the duct / tunnel / roller-door / wall-jump / split-jump sizes (no such links).

## Every ERR by place

Boxes are map x, z in metres (y = floor height when it is not ground). They come from the `S<n>_ROOMS` / `S<n>_BOX` data
quoted in S1.md-S5.md and in each space's `note`.

### S1
| Space | Box | ERRs |
| --- | --- | --- |
| s1-gatehouse | x 14..20, z -79..-73 | 5.5 m short side, under the 6 m camera floor; no high approach; shadow 0.0; vantage 0.4 |
| s1-dyard | x -40..-26, z -45..-40 | 4.5 x 14 below yard 14 x 14; 4.5 m under the camera floor; no loud approach |
| s1-forecourt | x -26..6, z -46..-34 | 12 x 32 below yard 14 x 14 |
| s1-plantroom | x -40..-26, z -40..-34 (G) | 5.5 x 13.5 below plant_room 6 x 8.5; dead end (H1: the dock door opens into it) |
| s1-carpark | x -36..6, z -76..-52 | no high approach; shadow 0.2 |
| s1-bins | x -40..-30, z -52..-45 | dead end (H9) |

### S2
| Space | Box | ERRs |
| --- | --- | --- |
| s2-foyer | x -30..-8, z -30..-23 | 7 x 22 below lobby 14 x 17; no high approach; shadow 0.7 |
| s2-hall | x -30..-8, z -23..6 | shadow 0.65 |
| s2-l1-plan | x -44..-7.5, z -30..6, y 4.4 | shadow 0.8; vantage 0.3 |
| s2-l1-wing | x -7.5..4, z -23..0, y 4.4 | no high approach; shadow 0.95; vantage 0.2 |
| s2-l1-facilities | x -7.5..-0.2, z 0..6, y 4.4 | 1 approach, 1 kind, no high, no loud; shadow 0.05 |
| s2-l1-landing | x -2..4, z -16..-12, y 4.4 | 4 x 6 below security_room 5.5 x 7 (F7, K2's landing) |
| s2-l2-wing | x -7.5..4, z -30..6, y 8.4 | 11.5 x 36 below open_office 14 x 21 |
| s2-l1-kitchen | x -28.5..-21, z -30..-22.5, y 4.4 | 7.5 x 7.5 below break_room 7 x 8.5; dead end |
| s2-l1-meet4 / -mr1 / -mr2 / -mr3 | x -13..-7.5 z -30..-22.5 / x -44..-36 z -20..-14 / x -44..-34 z 2..6 / x -26..-16 z 2..6, y 4.4 | below meeting_room 5.5 x 8.5 (5.5 x 7.5, 6 x 8, 4 x 10, 4 x 10); dead ends |
| s2-l1-comms | x -2..4, z -9..-4, y 4.4 | 5 x 6 below server_room 8.5 x 11; dead end |
| s2-l2-board | x -7.5..-0.2, z 0..6, y 8.4 | 6 x 7.5 below meeting_room; dead end |
| s2-roof-plant | x -20..-12, z 0..4.5, y 12.3 | 4.5 x 8 below plant_room 6 x 8.5; dead end |
| dead ends only | lift-g x -44..-30 z -12..-4; store x -44..-30 z -4..6; plant-g x -8..4 z -30..-4; l1-print x -21..-13 z -30..-22.5; l1-se-meet x -7.5..4 z -30..-23; l2-exec x -44..-30 z -4..6; l2-offa x -28.5..-13 z -30..-22.5; l2-offb x -13..-7.5 z -30..-22.5 | dead end (one neighbour) |

### S3
| Space / link | Box | ERRs |
| --- | --- | --- |
| section S3 | entry s3-c2 -> exit s3-dock | 1 independent route (need 2): C2 door, SW stair, lobby, hall west door, all single |
| s3-c2 / s3-lobby | x 10..22, z -30..0 (y 4.5 / G) | 12 x 30 below lobby 14 x 17 |
| s3-hall | x 22..52, z -30..-8 | no loud approach; shadow 0.02; vantage 0.45 |
| s3-dock | x 22..40, z -8..0 | 8 x 18 below loading_dock 21 x 28; 2 approaches, 1 kind, no high, no loud; shadow 0.12 |
| s3-view | x 22..52, z -8..-6, y 4.5 | 2 x 30 below corridor 3 (clear 1.7) |
| s3-back | x 42.6..44.6, z -6..0, y 4.5 | 2 x 6 below corridor 3 (clear 1.55) |
| s3-strip | x 44.6..64, z -1.6..0, y 4.5 | 1.6 x 19.4 below corridor 3 (clear 1.3) |
| s3-gown | x 30..33, z -6..0, y 4.5 | 3 x 6 below storage 4 x 4 |
| s3-clean | x 33..40, z -6..0, y 4.5 | 6 x 7 below lab 7 x 8.5; dead end |
| s3-writeup / s3-sec | x 22..30 z -6..0 / x 52..64 z -8..-1.6, y 4.5 | dead ends |
| s3-walkway | x 23..51 at z about -29.25, y 6.0 | dead end (a loop of two ladders, see "validator notes" item 2) |
| s3-yard | x 64..70, z -30..0 | 6 x 30 below yard 14 x 14; unreachable from start (no link) |
| SW stair `s3-c2 -> s3-lobby` | core x 12..14.6, z -28..-22.4 | fire stair 1.25 below 1.3 |
| N stair `s3-nstair -> s3-view` / `-> s3-back` | core x 40..42.6, z -8..-0.15 | fire stair 1.25 below 1.3 (both flights) |

### S4
| Space / link | Box | ERRs |
| --- | --- | --- |
| s4-dock | x 14..34, z 16..22 | 6 x 20 below loading_dock 21 x 28; 2 approaches; no loud; shadow 0.0 |
| s4-lobby | x -4..9, z 18..22 | 4 x 13 below lobby 14 x 17; 4 m under the camera floor; 2 approaches, 1 kind, no shadow, no high; shadow 0.39 |
| s4-batt | x -10..-4, z 16..27.8 | 1 kind, no high, no loud; shadow 1.0 |
| s4-yard | x 34..40, z 16..48 | 6 x 32 below yard 14 x 14; no shadow approach; shadow 0.0 |
| s4-deck | x -10..34, z 16..48, y 7.3 | 2 approaches, 1 kind, no shadow, no loud; shadow 0.95 |
| s4-hall | x -4..34, z 22..42 | vantage 0.45 |
| s4-svc | x -4..14, z 16..18 | 2 x 18 below corridor 3 (clear 1.75) |
| s4-cc | x -10..-4, z 27.8..30.2 | 2.4 x 6 below corridor 3 (clear 2.2) |
| s4-noc | x -4..8, z 42..48, y 3.6 | dead end |
| NOC stair `s4-sec -> s4-noc` | flight centre (2.0, 47.2), 1.2 x 6.4 | fire stair 1.2 below 1.3 |

### S5
| Space | Box | ERRs |
| --- | --- | --- |
| s5-ante | x -46..-40, z 32..37 | 5 x 6 below meeting_room 5.5 x 8.5; 5 m under the camera floor (3 guards + the sync pair); no high; shadow 0.0; vantage 0.4 |
| s5-hall | x -50..-38, z 18..32 | 12 x 14 below lobby 14 x 17; shadow 0.0; vantage 0.25 |
| s5-garden | x -70..-56, z 18..44 | no loud approach; shadow 0.15 |
| s5-terrace | x -70..-26, z 44..50 | 6 x 44 below yard 14 x 14; shadow 0.25 |
| s5-lawn | x -70..-26, z 50..70 | 2 approaches; no high; shadow 0.9 |
| s5-arch | x -46..-38, z 32..44, y 4.2 | no high, no loud; shadow 1.0; vantage 0.2 |
| s5-roof | x -56..-32, z 18..44, y 8.4 | 1 kind, no shadow, no loud; shadow 0.95 |
| s5-kitchen | x -32..-26, z 32..44 | 6 x 12 below break_room 7 x 8.5; 2 approaches, 1 kind, no shadow, no high; shadow / LOS / vantage missing (V5f-3) |
| s5-vest | x -40..-38, z 32..35 | 2 x 3 below corridor 3 (clear 1.8) |
| s5-pass | x -50..-46, z 32..34 | 2 x 4 below corridor 3 (clear 1.8) |
| s5-plant | x -32..-26, z 18..26 | 6 x 8 below plant_room 6 x 8.5; dead end |
| s5-ctl / s5-board / s5-ceo | x -56..-50, z 18..30 (G) / z 18..30 (y 4.2) / z 30..44 (y 4.2) | dead ends |
| pacing | s5-ante, s5-strong, s5-hall (file order) | three high beats (4+) in a row |

Map-wide: co-op links reach 6 of 25 encounter spaces (`s1-forecourt` CR1, `s2-hall` and `s2-l1-plan` CR2,
`s3-hall` CR3, `s4-hall` CR4 / CR5, `s5-arch` CR6 / CR7).

## Hand findings S1-S5 merged, by severity

Deduplicated. "ERR" marks a finding the validator also prints. The source is the section file and finding number.
Ranking: a co-op-only move a solo player can use comes first. The lead framed this as G2 (the campaign must not be
completable solo). Campus is Sector Ops, where solo always completes (G185), but its co-op-only routes must still be
two-player only (G280). The finding breaks G280 either way.

**Blockers**
1. **S5 CR7 works solo** (S5 F6).
   - Where: the rope edge is the archive hoist-door sill (-46, 36, y 4.2) over the light well (x -50..-46, z 34..38).
   - Why solo works: the door is unlocked, there is no rail, the slab hole is open, the drop is 4.2 m and there is no
     fall damage. The only cost is landing noise near #9.
   - The graph already holds the solo twin of the rope (`s5-arch -> s5-well` drop), so no rule could catch it.
   - SPEC says "solo cannot: 6 m drop". As built it is "co-op quiet", not co-op only.
   - Fix: rail the sill and gate the hoist door with a partner action, or move the rope edge so the drop is beyond solo
     reach but within `TEAM.ropeMax` 6.0.
2. **S3 has a single chain from entry to exit** (ERR redundancy; S3 H9).
   - The way through: C2 door (10, -14), SW stair (1.25 m), lobby, hall west door. No loop.
   - The L1 north band (x 22..64, z -8..0) hangs off one 1.25 m stair.
   - 426 m2 is sealed: the east annex (x 52..64, z -30..-8) and the plant under L1.

**Major**
3. **S3 viewing corridor is blocked by its guards** (S3 H6; the corridor size is an ERR).
   - Where: x 30..44, z -8..-6, y 4.5, 1.7 m clear.
   - The guard pair (#2 / #3 at z -7.4 / -6.6) leaves a 0.2 m gap, and #5 at (47.8, -7.0) blocks the rest.
   - The loud route is forced past all three.
4. **S1 dock door E12 opens into a sealed room** (S1 H1; ERR dead end `s1-plantroom`). The door is at (-33, -40). It
   unlocks after C1 seals and opens onto a dead end. The SPEC says it leads into HQ.
5. **S2 CR2 top is a sliver** (S2 F2).
   - Where: x -10..-7.5, z -11..-5, y 4.4.
   - The planter leaves a 0.7 m strip on an unrailed 4.4 m edge, with a 0.45 m step: the top of the forbidden
     0.40-0.45 band.
6. **Out of bounds, inside the map edge** (S1 H4, H2; S3 H8).
   - S1: a cut panel at (24, -80) is 1 m from the spawn.
   - S1: fences are climbable solo (east x 26, west x -40, north z -34).
   - S1: the bin-store wall (x -40, z -52..-45, 3.0 m) is inside the wall-jump band.
   - S1: the pavilion top (x -44..4, z -34..-30, y 4.4) is a 48 m ledge with open edges and 4.4 m drops outside the
     fence.
   - S3: the east yard (x 64..70, z -30..0) is reachable over about 125 m of open ground from the start.
   - None of these skips a section (the spine check passes).
7. **Corridors under the 3.0 m floor** (ERR where the strip is its own space):
   - S2 F1: the L1 / L2 balcony strips are 2.45 m (z -22.4..-19.95 and x -10.05..-7.6, 69 m). The loud route and
     guard #4 use them.
   - S3 H2: view 1.7, back 1.55, strip 1.3, gallery and walkway 1.25, stair flights 1.25.
   - S4 F1: service corridor 1.75, colonnade 2.2, hot aisles 1.2 (route 1 runs through P2).
   - S5 F1: passage and vestibule 1.8 (both on stealth routes), L1 strip 1.4 at kp-arch (-38, 41), gallery 2.85 / 2.6,
     hall stair 2.0.
   - S3.md traces the cause: the SPEC's 1.8-2.4 m corridors predate the sheet's 3.5-4.0.
8. **Encounter rooms under the 6 m camera floor, with guards in them** (ERR):
   - `s1-gatehouse` (5.7 clear, two officers).
   - `s1-dyard` (4.7 clear, H5).
   - `s4-lobby` (4 m, the mantrap officer).
   - `s5-ante` (5 m, 3 guards and the sync pair).

   Choke rooms (connectors under V5f-3):
   - S2 landing: 3.8 x 5.75 with K2 (F7).
   - S4 colonnade: 2.2 m with K3.

   Level-design 3.8 says connectors have no guard.
9. **S5 routes skip L1** (S5 F7).
   - No built route has a point on L1, so 9 of 24 guards stand off every route.
   - The built stealth and loud routes are not the SPEC's (the SPEC loud route's front door is armoured and locked).
   - The stealth exit goes back through the anteroom and the hall: 4 doors in 22 m.
10. **S4 dock funnel and locks** (S4 F5, F9).
    - Both ground routes leave the dock by `dockWest` (14, 17). Alarm stage 2 locks it; stage 3 locks `hallBatt`.
    - C4 is locked until the download, but the graph reads it as open.
11. **Co-op coverage and splits** (ERR coverage).
    - Co-op moves touch 6 of 25 encounter spaces.
    - No section has a two-leg split, so the split rules cannot run on campus.
    - The CR6 / CR7 "one goes, one holds" moves have no schema form.
12. **S3 routes through guard posts** (S3 H5, H7).
    - The CR3 boost spot (29.2, -18) is 1.2 m from the hall patrol loop.
    - Stealth route 1 runs through #8's post (49.4, -20) in a 2.6 m aisle.
    - The CR3 payoff lands in the blocked viewing corridor.
13. **S1 ground in no room, and a dead-end bin store** (S1 H8, H9).
    - 35% of the footprint (1068 m2) is in no room.
    - The bin store (x -40..-30, z -52..-45) opens only south, so the SPEC route "bin store -> yard" cannot be walked.

**Minor**
14. **Door leaves swing into narrow space.** This is visual only: an open leaf has no collision body
    (`world/doors.ts` removeBody).
    - S3 H1: seven doors, three of them across the 1.7 m viewing corridor.
    - S4 F2: `scLobby` (4, 18) leaves 0.69 m; `ccUps` (-7, 30.2); pod and cage strips.
    - S5 F2: kp-arch (-38, 41) leaves 0.3 m; C4 far door (-26, 29) ends 0.68 m from officer #22; the anteroom side, drawing
      room and shaft doors.
    - S1 H10: dock door against the sentry stops (0.1 m clear).
15. **Door spacing (sheet 5):**
    - S1 H3: C1 doors in line, 4 m apart.
    - S3 H4: hall door and dock-side door 1.76 m apart.
    - S4 F3, F9: colonnade door pairs face each other.
    - S5 F3: facing lobby doors; doors within 1.5 m of corners.
    - S2 F5: core doors 0.6 / 1.1 m from corners.
16. **Stairs:**
    - S2 F4: feature stair of 24 risers with no landing and no side rails, open sides dropping up to 4.4 m.
    - S2 F5 / S5 F4: core near landings 1.2 m.
    - S3 H3: SW top landing west edge open 4.5 m above the stair foot (x 13.35, z -23.6..-22.4).
    - S4 F4: NOC stair, 20 risers, 1.2 m wide (ERR).
    - S5 F4: hall stair, 24 risers, 2.0 m wide (WARN).
17. **S5 jetty deck step 0.40** at (-45, 59.5): on the band edge (S5 F8).
18. **No cover on long straight runs:**
    - S5 back corridor: 20 m, with #24 patrolling it.
    - S3 view (30 m) and strip (19.4 m).
    - S4 service corridor: 18 m.
    - S1 forecourt: open ground (H7).
19. **SPEC items not built:**
    - S2 F9: the ceiling-void duct, so S2 has no secret route.
    - S4 F7: the NOC roof light.
    - S5 F9: the garden buttress, the audit glass and the low-roof hang-drop.
    - S3 H5: the gallery door into the stair.
20. **Leftovers:**
    - (S2 F8 withdrawn by the V5 checker: the C2 doors are in line.)
    - S2 F3: 266 m2 of L1 in no HUD room.
    - S2 F6: foyer lane 2.35 m.
    - S2 F10: the lift lobby has no purpose.
    - S4 F6: a 0.8 m lobby slot into a dead 2 x 4 pocket.
    - S4 F8: basket runs with no rails and 2.6 m headroom.

## Verdict per section

| Section | Verdict | Why | Main work | Rough effort |
| --- | --- | --- | --- | --- |
| S1 Gatehouse | **Patch** | Topology passes (2 routes, spine, crossing). The faults are sizes, edges and one dead door. | Deepen the delivery yard to 6 m+ (move the bin-store north wall). Gatehouse 6.6 m box. Forecourt +2 m. Give the dock door a real room or remove it. Rails on the pavilion. Anti-climb fence tops, or noLedge on the bin wall. High approaches for the gatehouse and car park. | 1 day greybox |
| S2 HQ | **Patch** | Routes and spine pass. The shell (48 x 36) holds a fix. | Widen the balcony strips to 3.0+ (balustrade into the void). Move the CR2 planter. Grow the K2 landing into its alcove. High approaches for the foyer, wing and facilities. Re-cut the L1 / L2 room bands (merge small meeting rooms) for the class minimums. Relight to 40-60%. | 2-3 days |
| S3 Labs | **Re-plan** | Topology fails: 1 route entry -> exit, L1 on one 1.25 m stair. Every L1 corridor is under 3.0, and the dock is far under its class. | Re-plan the entry chain and the L1 north band at sheet widths, with a second route (e.g. a door from the landing to L1, or a second hall-to-dock door). Stairs to 1.3. Grow or re-class the dock. Close or fence the east yard. The test hall can stay. | 3 days |
| S4 Data hall | **Patch** | Redundancy, spine and reach pass. The faults sit in the south service band (z 16..22) and the colonnade, inside the shell. | Re-cut the service band: corridor 3.0+, lobby 6 m, no leftover slot. Colonnade 3.0+. NOC stair as two 1.3 m flights. A loud way into the dock and a shadow way into the yard / deck. Model the C4 lock. | 1.5-2 days |
| S5 Old House | **Patch** | Routes and spine pass. CR7 and the anteroom are local fixes. | CR7 first (make it two-player only). Anteroom to 6 m (strongroom 1 m shorter). Vestibule and passage to 3.0. Route the stealth route through L1 as the SPEC says. Declare the kitchen targets. Break the ante / strongroom / hall peak. | 2 days |

## Michael's five complaints, per section

Source: `origin/feature/campus-audit:docs/campus-audit/BRIEF.md`.

| Complaint | S1 | S2 | S3 | S4 | S5 |
| --- | --- | --- | --- | --- | --- |
| Rooms randomly placed | Partly: H8 (35% of the ground in no room), H9 (bin store does not connect), H1 (dock door to a sealed room) | Not found as a pattern; F3 (HUD gap), F10 (lift lobby has no purpose) | Partly: proportions, not adjacency. 720 m2 of transit-only lobby, 426 m2 sealed, three dead-end rooms with no payoff | Not found as random; F6 (lobby leftovers), F5 (dock funnel) | Not found |
| Hallways too small | Not found (S1 has no corridor; the undersize is in rooms: H5, H6, H7) | Found: F1 (2.45 m strips), F2 (CR2 0.7 m), F6 (foyer lane 2.35) | Found: H2 (view 1.7, back 1.55, strip 1.3, stairs and catwalks 1.25) | Found: F1 (service 1.75, colonnade 2.2, hot aisles 1.2), F6 (0.8 m slot) | Found: F1 (passage and vestibule 1.8, L1 strip 1.4, gallery 2.6-2.85, hall stair 2.0) |
| No space when doors open | Not found: H10 is minor, H3 is spacing only | Not found: 31 leaves clear; only the 1.2 m landings (F5) | Found, visual: H1 (7 doors; 3 across the 1.7 m corridor) | Found, visual: F2 (service corridor 0.69 m left; colonnade; pods) | Found, visual: F2 (kp-arch 0.3 m left; C4 far door near #22), F3 |
| Out of bounds reachable | Found, inside the map edge: H4 (cut panel, climbable fences, bin wall), H2 (pavilion plateau) | Not found (the roof parapet mantle is an open question for V6 / e2e) | Found, exterior: H8 (east yard over 125 m of open ground) | Not found (the nav flood test passes; the east deck parapet is an open question) | Not found (F10; not run against nav) |
| Poor flow | Found: H1, H9, H3, H2 | In part: the F1 pinches and the 1.2 m landing doorways (F7); the atrium loop is by design | Found: single entry chain (ERR redundancy), L1 on one stair, CR3 payoff into the blocked corridor (H5, H6), revive reach over 15 s (estimate) | Found: dock funnel and alarm locks (F5), C4 locked until the download (F9) | Found: F7 (routes skip L1, the exit backtracks through the hall), F6 (CR7), F4, F9; ERR pacing (three peaks in a row) |

## Guard counts against the 3-6 / 6-10 bands (INFO only)

Encounter spaces only (V5f-3), key `"2"`. Early = S1-S3, late = S4-S5 (A3).

| Section | Band | Encounter counts | In band | Section total (all guards) |
| --- | --- | --- | --- | --- |
| S1 | early 3-6 | gatehouse 2, carpark 3, dyard 1, forecourt 2 | 1 of 4 | 8 (8 in encounter spaces) |
| S2 | early 3-6 | foyer 1, hall 1, l1-plan 1, wing 1, facilities 1 | 0 of 5 | 12 (5; kitchen 2, landing 1, L2 3, mail 1 in notes) |
| S3 | early 3-6 | hall 5, dock 2 | 1 of 2 | 16 (7) |
| S4 | late 6-10 | dock 2, lobby 1, batt 1, yard 3, deck 1, hall 6 | 1 of 6 | 20 (14) |
| S5 | late 6-10 | ante 3, hall 2, garden 2, terrace 2, lawn 2, roof 1, arch 1, kitchen 1 | 0 of 8 | 24 (14) |
| Marlow Yard (A1-A8 sets) | early 3-6 | 1, 2, 1, 3, 1, 1, 1, 3 | 2 of 8 | 13 |

**Recommendation: no per-space rule.** The band would fail 22 of 25 campus spaces and 6 of 8 Marlow sets. Both maps
are built on purpose to CT density: 1-3 guards per space, with a mixed patrol and clockwork cycles (level-design 4).
What does hold is the ramp: section totals rise 8 -> 12 -> 16 -> 20 -> 24 as the SPEC intends.

Suggested rules instead, for Michael to choose:
- Keep ERR over 10 per space.
- Keep the per-section caps (`CAMPUS_SCREEN_CAP` 12, spawn and alive caps).
- Add a rule that section totals never fall along the spine.
- Leave the 3-6 / 6-10 band as INFO.

## Estimates in the graphs (all pending V6)

Nothing below was measured on a running map. V6 (greybox measurement: the light bake, the nav grid) writes `measured`
beside each one.

**Declared targets on the 25 encounter spaces (72 values):**

| Section | Targets | shadow_pct | los_break_s | sees_pct |
| --- | --- | --- | --- | --- |
| S1 | 12 | gatehouse 0.0, carpark 0.2, dyard 0.4, forecourt 0.5 | 2, 3, 4, 5 | 0.4, 0.7, 0.8, 0.75 |
| S2 | 15 | foyer 0.70, hall 0.65, L1 0.80, wing 0.95, facilities 0.05 | - | - |
| S3 | 6 | hall 0.02, dock 0.12 | hall 2.5, dock 2.0 | hall 0.45, dock 0.75 |
| S4 | 18 | dock 0, lobby 0.39, batt 1.0, yard 0, deck 0.95, hall 0.46 | - | hall 0.45 |
| S5 | 21 (kitchen none) | ante 0, hall 0, garden 0.15, terrace 0.25, lawn 0.9, roof 0.95, arch 1.0 | - | - |

A dash means the section .md gives no per-space list here. The values are in each space's entry in the graph. The 27
targets of the 9 retyped spaces moved into their notes.

**Times:**
- `time_s` values: S1 3 (ladder 13, CR1 6 / 7), S4 8, S5 5 (core flights 7 / 7, shaft ladder 6, team rope 6, rappel
  16).
- Revive-reach estimates (not validator inputs, since there is no split):
  - S3 walkway: about 16 s.
  - S3 chamber roof: about 17.4 s. Both are over 15 s.
  - S5 light well: about 11 s.

**Designer values:**
- `tension` on every space (S1 12, S2 29, S3 17, S4 16, S5 27). The SPEC gives section tension only.
- Route labels on open-ground and dead-end links.
- Link lengths: measured middle to middle on the plan in S3, S4 and S5. Centre to centre over open ground in S1.
  Stairs and CR2 in S2.
- The three spine lengths V5f added: C1 19.5, C2 15, C3 27.
- `size[2]` 12.0 for open sky (schema convention).

**Inferred, not probed:**
- The S5 roof and gallery `drop` links (SLICE5 parapet rule).
- The S4 basket-edge drop.
- Guard-to-space assignment of edge guards: S1 #6 and #7, S3 #5 and #11.

## Validator notes for the V1 checker

What the validator got wrong or cannot see on this run (no change made here):

1. **Rule of three counts the wrong links as approaches.**
   - One-way links leaving a space count. `s5-roof` shows 6 approaches, but only the bulkhead door leads in (5 drops /
     rappel lead out), so its "< 3 approaches" ERR is hidden.
   - Doors to dead-end side rooms count too, which inflates hubs like `s2-l1-plan`.
   - Suggest: count a one-way link only at its `to` end, and leave out links to dead-end spaces.
2. **Dead end counts distinct neighbours, not links.**
   - `s3-walkway` has two ladders at its two ends, both to the hall. That is a loop, but it reports as a dead end
     (S3.md predicted this false positive).
   - Suggest: count links, or treat 2+ links to one neighbour as a loop.
3. **No check for a co-op link with a solo twin.** A co-op link whose two spaces are also joined by a solo link
   (CR7's `team_rope` beside the `drop`) passes silently. That is blocker 1 above. Suggest a WARN.
4. **Redundancy is edge-disjoint, as M3 says.** S2 passes only through two parallel doorways from one room (wing ->
   landing). A vertex-disjoint count would fail it. This is a spec point, not a bug.
5. **Pacing reads file order, side rooms included.** It warns "no release after s4-hall before s4-noc" (a side room)
   and reports the S5 peak in file order. This follows the schema, but builders need to know that file order is the
   beat chart.
6. **Openings under 2.5 m get two WARNs each** (off grid and outside 2.5-3.5). Examples: the 1.2 m glass-front gaps in
   S2 and the S3 hop. Minor noise.
7. **Nine metrics keys are missing** (listed above). The guard bands, guard maximum, dead-end depth, safe drop, lip band,
   door height and absolute ceiling checks were all skipped. This is the V1b follow-up.
8. **No result looked wrong against the section forecasts.** S2.md's forecast matches once its retypes are applied.
   S3.md's matches as well, including the redundancy ERR and the walkway false positive.
