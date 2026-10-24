# campus-greybox - PLAN

Opus plan, 2026-10-25. Intent: BRIEF "Michael said" (the five picks). Approach: BRIEF A1 (dark merge per section). Five
section lanes build in parallel; no two lanes edit the same file.

## How the map picks a section (P0, done)

- `src/core/flags.ts`: `flags.campusV2: readonly number[]` (sections 1-5 on v2), default `CAMPUS_V2_ON = []`;
  `?campusv2=1,3` / `?campusv2=0`. Owner Sector Ops Build; switch-on per section when Michael accepts its walk.
- `src/world/maps/campusParts.ts`: `CampusSectionParts`, everything one section gives the map (build, spawns, pickups,
  hide spots, switches, rooms, nav seeds, lasers, panels, boards, sector def, cameras, desks, camera levels, alarms, co-op
  lips, dresser, art tags, hero set, chimneys). Every list is present, empty when unused.
- Each section's data file exports `S<N>_PARTS`: live `src/world/maps/campusS<N>Data.ts`, v2 `campusV2/s<N>Data.ts`.
- `src/world/maps/campusSections.ts`: `CAMPUS_PARTS[k]` = v2 parts when `flags.campusV2` names k + 1, else live.
- Combiners (read only `CAMPUS_PARTS`): `campusSectors.ts` (`CAMPUS_SECTORS`, `CAMPUS_SECURITY`, `CAMPUS_ALARMS`),
  `campusLips.ts` (`CAMPUS_COOP_LIPS`), `campusOps.ts` `buildCampus`, `campusDress.ts`. Order is section order, except
  boards (`BOARD_ORDER` S4, S5, S2, S1, S3: the live index order; a new board appends).
- `tests/campusV2.test.ts`: flag off = live parts; flag on = v2 parts; every section still marked `S<N>_V2_COPY` equals
  live, and the whole campus (tables, greybox, layout, art) built with the copies on equals all off.

## File ownership

| Owner | Files (only these) |
| --- | --- |
| Lane S1 (`feature/campus-greybox-s1`) | `src/world/maps/campusV2/s1*.ts`, `tests/campusV2S1*.test.ts`, `docs/sector-redesign/graph/campusOps-S1.json`, new `src/world/campusArt/assets/*-s1-v2.*` |
| Lane S2 (`feature/campus-greybox-s2`) | `campusV2/s2*.ts`, `tests/campusV2S2*.test.ts`, `graph/campusOps-S2.json`, new `*-s2-v2.*` assets |
| Lane S3 (`feature/campus-greybox-s3`) | `campusV2/s3*.ts`, `tests/campusV2S3*.test.ts`, `graph/campusOps-S3.json`, new `*-s3-v2.*` assets |
| Lane S4 (`feature/campus-greybox-s4`) | `campusV2/s4*.ts`, `tests/campusV2S4*.test.ts`, `graph/campusOps-S4.json`, new `*-s4-v2.*` assets |
| Lane S5 (`feature/campus-greybox-s5`) | `campusV2/s5*.ts`, `tests/campusV2S5*.test.ts`, `graph/campusOps-S5.json`, new `*-s5-v2.*` assets |
| Engine lane, Opus (`feature/campus-greybox-engine`) | `src/game/sectors.ts` (pair-gate solo window, S2 C18) and its tests; rebased after Marlow's mission-framework merge |
| Lead (`feature/campus-greybox`) | `src/core/flags.ts` (`campusV2`), `campusParts.ts`, `campusSections.ts`, `campusSectors.ts`, `campusLips.ts`, `campusOps.ts`, `campusDress.ts`, `campusBake.ts`, `tests/campusV2.test.ts`, `docs/campus-greybox/*.md` (not `briefs/`), `changes/feature-campus-greybox.md` |
| Nobody until switch-on | the live section files `campusS<N>.ts`, `campusS<N>Dress.ts`, `campusS<N>Data.ts` and `tests/campusS<N>*.test.ts` |

Rules for every lane:
- A v2 file imports its own section's v2 files (`./s<N>`, `./s<N>Dress`), shared types (`../campusParts`) and, for
  joins only, the live files of other sections (`../campusS1` `C1_GAP` / `CoopLip`, `../campusS2` `C2_FLOOR`,
  `../campusS4Data` `ArmourPiece`). Never another lane's `campusV2` file (BRIEF A6).
- Any new list the plan needs (S1 boards and desk-gate, S3 boards and desks, S5 co-op lips CR8-CR10) goes in the section's
  own `S<N>_PARTS`; the combiners already read every field. A new kind of field needs the lead (`campusParts.ts`).
- First layout change: set `S<N>_V2_COPY = false` in `campusV2/s<N>Data.ts` (the shared equality test then skips it).
- Lip ids: S4 and S5 both plan a "CR8" / "CR9" / "CR10"; S5 prefixes its ids (`CR8-s5` ...) so `CAMPUS_COOP_LIPS` ids stay unique.
- v2 tests: import the `campusV2/s<N>*` modules directly, or load the map with the flag on (`loadCampus` in
  `tests/campusV2.test.ts`: `vi.resetModules()`, set `flags.campusV2`, dynamic import).

## Shared, one owner (the lead)

| Item | Where | Why shared |
| --- | --- | --- |
| `CAMPUS_SCREEN_CAP` 12 | `campusSectors.ts` | map-wide perf budget; S5's pick keeps the 32 live cap |
| C3 / C4 stub connectors, `STUB_NAV_SEEDS` (one seed, (24, 0, -14), is inside S3's footprint) | `campusOps.ts` | between two sections; no plan moves them |
| `BOARD_ORDER`, section build order (S1, S2, stubs, S3, S4, S5) | `campusOps.ts` | the live index order of boards / items |
| Bake rects per section and the C1-C4 rects | `campusBake.ts` | one table; no plan changes a footprint |
| `ground` camera level | `campusSectors.ts` | every section's |
| Hero / asset files of the live map | `src/world/campusArt/assets/` | read by v1 and the v2 copies (BRIEF A11) |

## Slices (from the five detail docs, section "Greybox build cost")

S1 (15.5 h; `S1-detail.md` 11):
| Slice | Content | h |
| --- | --- | --- |
| G1 Perimeter | Palisade lines, gate leaf, re-hung panel, 4 roof screens, bin W wall removed; nav-flood out-of-bounds unit test | 2.5 |
| G2 Gatehouse | Box rebuild, glazing band, two-lamp light, roof ledge corner and glazed hatch, desk-gate data, #9, door / alarm / switch moves | 2.5 |
| G3 Car park | Row and column shift, carport with posts, van, bike shelter move, lockers, #11, pair loop moved, hide spot | 3.0 |
| G4 Yard + plant room | Merge, bin screen, trolley / cage, plant room carve with hatch and ladder, goods door, board + canopy breaker, CR1-yard lip, #7 / #8 / #12 | 3.0 |
| G5 Forecourt + lawn | Box re-cut, grit bins, trees, shelter lamp, CR1-east lip, #13 / #14 / #15 / #16, pavilion ledge segment | 2.5 |
| G6 Data + tests | S1_ROOMS, routes, campusS1 tests (cycles, screen cap 12, coop lips CR1-east / CR1-yard), V6 measured graph pass | 2.0 |

S2 (~21 h; `S2-detail.md` 11):
| Slice | Work | h |
| --- | --- | --- |
| S2-G1 G floor | Lobby RoomDef merge, feature stair (2 flights, landing, rails), plant-room north door + switchgear board, C6 doors, mail-lift shaft + ladder | 3.5 |
| S2-G2 Void and rings | Void 14.5 on L1 / L2, balustrades moved, CR2 lip re-cut (planter out, `S2_COOP_LIPS`), roof-light rim, pendants checked | 3 |
| S2-G3 L1 rooms | Kitchen, project room, MR1-MR3, east wing re-cut (facilities, comms, landing), sunshade ledge, core landings 1.3 + vision panels | 4 |
| S2-G4 L2 + roof | Office doors, board room, pg-exec, roof plant room + hatch + cat ladder, davit + rappel window | 3 |
| S2-G5 Devices + engine | sync-s2-kpfac (EW5 keypad), patch panel (E6 desk), switchgear (E4), pg-brg, intel (overhear, plant log), pair-gate solo window (C18: engine lane), light groups 55 / 56 | 4.5 |
| S2-G6 Guards + tests | 18 guards (`S2_GUARDS`), K2 move, routes, hide spots; campusS2 tests (cycles, screen cap 12, CR2 lip, pair gates); V6 measured graph pass | 3 |

S3 (~23 h; `S3-detail.md` 11):
| Slice | Work | h |
| --- | --- | --- |
| S3-R1 | Shell and G re-lay: hall to x 10, north wall z -11, dock, control room, plant, switch room / riser, yard walls, roller door, trench | 5 |
| S3-R2 | L1 re-lay: landing, corridor + east lobby, 7 rooms, security room, gallery move, walkway widen + access, hoist hatch, void, ceilings | 5 |
| S3-R3 | Three fire stairs at 1.4 (`S3_FLIGHTS`, nav ramp checks), door anchors and swings | 2 |
| S3-R4 | Lights (5 high bays / 3 circuits, rooms), switches, isolator board, E6 desk, kp-store / kp-sec, lasers + panels moved, cameras re-aimed | 3 |
| S3-R5 | Section data (`s3Data.ts`): 20 guards, choke post block, `S3_ROUTES` / `S3_EXIT` / `S3_ENTRY`, hide spots, nav seeds, reinforce points | 3 |
| S3-R6 | Co-op lips (CR3 retest, CR3b new, `S3_COOP_LIPS`), panel near-side tests, nav reach test (three stairs, hatch drop) | 3 |
| S3-R7 | Dressing re-run (`s3Dress.ts`) + checker fix round | 2 |

S4 (~16 h; `S4-detail.md` 9):
| Slice | Content | h |
| --- | --- | --- |
| G4.1 South band | C1-C8: walls, slab, mantrap, desk, cages, doors, lights, switches, cam move, dock relight, S4_ROOMS | 2.5 |
| G4.2 Plenum | C9-C11: grilles, B1 / B2 run-on, hatch, CR8 lips in `S4_COOP_LIPS` with the lip unit tests, racks 2.0 | 3.0 |
| G4.3 West strip | C12-C15: colonnade, slab, door moves, hallCC infill, UPS-security door, battery lamp, ess board | 2.0 |
| G4.4 NOC block | C16-C20: dog-leg stair, slab hole and rails, roof hatch and ladder, rooflight, escape door / platform / ladder, lights | 3.0 |
| G4.5 Compound, riser, deck | C21-C25: flood, riser door and keypads (both kp-deck sides), shield and CR10 lip test, partition, deck floods | 2.5 |
| G4.6 Data and tests | Guards #21-#25 and moves, CR9 pair gate data, routes, sync data hooks, campusS4 / NOC sight / nav flood tests | 3.0 |

S5 (~14 h; `S5-detail.md` 11):
| Slice | Content | h |
| --- | --- | --- |
| S5-P1 shell re-cut | G1-G13, L1-L3, L5-L6, L9, R1-R3 boxes, doors, ladders, slabs, nav seeds | 4 |
| S5-P2 devices and light | L4 pair bolt, L7 board, garden board, beams / panel / pair gate moves, cam-hall, G14 / L8 / R4 lamps, S5_ROUTES rewrite | 3 |
| S5-P3 guards | 2 new, 8 moved, routes / cycles 25-45 s, takedown spots, the cap assert (26 + 6 <= 32) | 2 |
| S5-P4 tests | CR7 solo-cannot (bolt shut, no sill), rope room ok, lips 4.4 with no solo stand-on, nav flood, routes walk, door swings | 3 |
| S5-P5 V6 | measure shadow / vantage / LOS / reach, write `measured` | 2 |

Total ~89.5 h of lane work. Tests named "campusS<N>.test.ts" in the detail docs mean the lane's `tests/campusV2S<N>*.test.ts`
(BRIEF A12). Every "V6 measured graph pass" waits for `--require-measured` on master (BRIEF A3).

## PR grouping (each PR under ~1.5k changed lines; one checker per PR)

| PR | Slices | h |
| --- | --- | --- |
| P0 (this branch) | flag, parts, selector, data split, v2 copies, equality test, job docs | done |
| S1-a / S1-b / S1-c | G1+G2 / G3+G4 / G5+G6 | 5 / 6 / 4.5 |
| S2-a / S2-b / S2-c / S2-d | G1+G2 / G3+G4 / G5 (data part) / G6 | 6.5 / 7 / 4.5 / 3 |
| ENG-1 (engine lane) | S2 C18 pair-gate solo window (+ any engine check a lane trips) | ~2 |
| S3-a / S3-b / S3-c / S3-d / S3-e | R1 / R2 / R3+R4 / R5+R6 / R7 | 5 / 5 / 5 / 6 / 2 |
| S4-a / S4-b / S4-c | G4.1+G4.2 / G4.3+G4.4 / G4.5+G4.6 | 5.5 / 5 / 5.5 |
| S5-a / S5-b / S5-c | P1 / P2+P3 / P4 (+ P5 when V6 lands) | 4 / 5 / 3-5 |
| SW-<N> (lead, per section) | switch-on: add N to `CAMPUS_V2_ON`, retire the live S<N> tests | after Michael's yes |

A lane PR that would pass ~1.5k lines splits at a slice boundary. Lanes never merge each other: each PR goes to master by
the train; the lane rebases only through the train (no master merges into a lane).

## Switch-on order

No fixed order: a section switches on when Michael accepts its walk (`?campusv2=<N>` link on the walk card, then the SW
PR). At most 3 unwalked campus sections offered at a time (BRIEF A10). Suggested offer order by Marlow's needs and size:
S2 (Split Shift) and S4 (Code Relay) first, then S1, S5, S3 (largest, last). A section's walk is offered only after its
greybox exit (V6 measured pass, BRIEF A3).

## Checks

- Checkers: one Sonnet checker per section PR (greybox, data, dressing), one fix round per slice, Opus fix round on a
  fail; an Opus checker for the engine lane and for any change under `src/ai`, `src/game` or `src/net`. Verdict as the
  `checker` commit status on the PR head.
- Agent sub-steps: `npm run typecheck:fast` + `npx vitest run tests/campusV2.test.ts tests/campusV2S<N>*.test.ts` (and the
  live campus tests a change could touch), `--maxWorkers=2`.
- Laptop queue per PR: `e2e-sectorops` parts 1-6 (`e2e-sectorops:1` .. `:6`), `E2E_GPU=1`; the engine lane adds
  `e2e-coop` + `e2e-netmove` (src/game). With the flag off these prove the live map is unchanged; the v2 sections are
  covered by unit tests until switch-on, when the SW PR runs the same parts with the section live.
