# campus-greybox - PLAN

Opus plan, 2026-10-25 (J17 rewrite ~18:30; plan check 1 fix round ~20:00: claims block and overlaps 2a, A23 on five
files, TAG-4 / TAG-5 replace coop4's rows, E2E-2a / 2b, A26 sector-marks carry, A27 J15 PR1 first, A13 v2 graph path;
plan check 2 fix round ~20:40: a worktree per parallel branch, S3 PRs S3-a .. S3-f to master, SW-<N> re-measures all five
live graphs, one `s2Data.ts` editor per wave, A27 on every lane PR). Intent: BRIEF "Michael said" / "Michael picked". Approach: BRIEF A1 (dark merge
per section). Five section lanes build in parallel; no two lanes edit the same file. FOLDED-PLAN J17 (break 27; Sector
Ops C1-C16, Guard AI A1 A2 B14, Marlow V9, Test Runner T6 campusOps half).

## 0. Depends on, waits on

| Job | What this job needs from it | Blocks |
| --- | --- | --- |
| J4 Guard AI release (#317 coop4 ships on, Q16) | `SectorGuard.minPlayers`, `guardForTeam`, `capReinforce`, team size at section load, `tests/sectorGuardTags.test.ts` | the TAG slices (section 5) and every switch-on; nothing else |
| J15 guard-rules PR1 (Guard AI; orchestrator's order, BRIEF A27) | on master before any J17 edit to `campusS4Data.ts` / `campusS5Data.ts`; the S4 / S5 gear data (no section `'helmet'`, `'armour'` for `'both'`, `shieldTeams`) and `checkSectorGuards` | P0's PR (it edits both files), so every lane PR that still carries P0's commits |
| sector-marks (same lead, G355 rule fix; BRIEF A26) | merges first; its four objective labels and `campusS4Dress.ts` `hyp2` are carried into the split and v2 files at the next master take | nothing (a carry) |
| J12 V6 validator port (Marlow) | `scripts/level-measure.mjs` + `level-validate.mjs --require-measured` on master's mode profiles; a way to measure with `flags.campusV2` set (request: a `--flags campusV2=1,2,3,4,5` argument, else MEAS-0 below); accept `unavoidable` on a guarded exit connector (BRIEF A18). Its S10 owns the five live graph files and their drift test until SW-<N> (BRIEF A13) | greybox exit of every section |
| J13 route-runs (Marlow) | the harness that walks every declared route against live guards ("Never stuck") | greybox exit |
| J10 light-realism (Sector Ops) | the band table (scale sheet 9) and the lux calibration | final lamp values only: lanes build with provisional values (BRIEF A19) |
| J26 prototype support (Campaign, Guard AI) | the mission wiring over the devices in section 6 | the missions, not the greybox |
| J18 Sector Ops batch | Q20 downed rule, M17 solo-route data check | nothing here (BRIEF A22) |
| J21 perf | the campus frame / memory line (Q4 60 fps) | the perf line of LD 15 at exit |

## 1. How the map picks a section (P0, done)

- `src/core/flags.ts`: `flags.campusV2: readonly number[]`, default `CAMPUS_V2_ON = []`; `?campusv2=1,3` / `?campusv2=0`.
- `src/world/maps/campusParts.ts`: `CampusSectionParts` (every list present, empty when unused).
- Each section's data file exports `S<N>_PARTS`: live `campusS<N>Data.ts`, v2 `campusV2/s<N>Data.ts`.
- `src/world/maps/campusSections.ts`: `CAMPUS_PARTS[k]` = v2 parts when `flags.campusV2` names k + 1, else live.
- Combiners read only `CAMPUS_PARTS`: `campusSectors.ts`, `campusLips.ts`, `campusOps.ts` `buildCampus`, `campusDress.ts`.
- `tests/campusV2.test.ts`: flag off = live parts; flag on = v2; every section still marked `S<N>_V2_COPY` equals live.
- P0 PR: open it now; it trains dark once J15 guard-rules PR1 is on master (BRIEF A27: P0 edits `campusS4Data.ts` /
  `campusS5Data.ts`). At its master take the lead carries, into the live split files and every still-marked v2 copy:
  coop4's ten tag rows if #317 landed first (BRIEF A23: S1-S3 into `campusS1Data.ts` .. `campusS3Data.ts`, S4 / S5 kept in
  `campusS4Data.ts` / `campusS5Data.ts`, all ten into `campusV2/s1Data.ts` .. `s5Data.ts`), PR1's S4 / S5 gear data
  (A27), and sector-marks' labels and `hyp2` (A26). Lanes cut from P0's head (`c2f1f131` or its descendant on this branch), so their PRs share
  P0's commits and shrink to their own diff once P0 is on master.

## 2. File ownership (claims)

| Owner | Files (only these) |
| --- | --- |
| Lane S1 (`feature/campus-greybox-s1`) | `src/world/maps/campusV2/s1*.ts`, `tests/campusV2S1*.test.ts`, `docs/sector-redesign/graph/v2/campusOps-S1.json`, new `src/world/campusArt/assets/*-s1-v2.*` |
| Lane S2 (`feature/campus-greybox-s2`; G6a on `feature/campus-greybox-s2-g6a`, `briefs/S2.md` section 8) | `campusV2/s2*.ts`, `tests/campusV2S2*.test.ts`, `graph/v2/campusOps-S2.json`, new `*-s2-v2.*` assets |
| Lane S3 (sub-lanes `feature/campus-greybox-s3-r1` .. `-s3-r6`, `briefs/S3.md` section 2; one file owner each) | `campusV2/s3*.ts`, `tests/campusV2S3*.test.ts`, `graph/v2/campusOps-S3.json`, new `*-s3-v2.*` assets |
| Lane S4 | `campusV2/s4*.ts`, `tests/campusV2S4*.test.ts`, `graph/v2/campusOps-S4.json`, new `*-s4-v2.*` assets |
| Lane S5 | `campusV2/s5*.ts`, `tests/campusV2S5*.test.ts`, `graph/v2/campusOps-S5.json`, new `*-s5-v2.*` assets |
| TAG-<N> (one per section, after J4; branch `feature/campus-greybox-tag<N>` from origin/master) | the section's `campusV2/s<N>Data.ts` (append two rows), `tests/campusV2S<N>Tags.test.ts`, the section's `graph/v2/` file (keys "3" / "4") |
| E2E lane, Opus (`feature/campus-greybox-e2e`, `-e2e2a`, `-e2e2b`, each from origin/master) | `scripts/e2e-anchors.mjs` (a campusOps part, E2E-1), `scripts/e2e-sectorops.mjs` (new v2 parts 7 (E2E-2a) and 8 (E2E-2b) only; parts 1-6 untouched), `scripts/run-e2e.mjs` (`PARTS` row: add '7', '8'), `scripts/e2e-affected.mjs` (add `e2e-sectorops:7` / `:8` to the `src/world/maps/campus` DIRECT_COVERS row), `docs/systems/testing-tools.md` rows for them |
| Lead (`feature/campus-greybox`) | `src/core/flags.ts` (`campusV2`), `campusParts.ts`, `campusSections.ts`, `campusSectors.ts`, `campusLips.ts`, `campusOps.ts`, `campusDress.ts`, `campusBake.ts`, `tests/campusV2.test.ts`, `docs/sector-redesign/signoff/SYNC.md` (src lines), `docs/campus-greybox/**`, `changes/feature-campus-greybox.md`; V2-SEED (the five `graph/v2/` files, once); at switch-on also all five live `graph/campusOps-S{1..5}.json` (the section's file moved over, the `measured` values of all five re-written, section 9), `docs/level-validator/graph-sets.json` (the section's counts), `tests/campusS<N>*.test.ts`, `tests/sectorGuardTags.test.ts`, `tests/campusObjectivePlace.test.ts` (its room list, BRIEF A26), `scripts/e2e-sectorops.mjs` part 6 |
| Every other branch (lane, sub-lane, TAG, E2E, MEAS-0) | its own changelog fragment `changes/feature-campus-greybox-<suffix>.md` (`changes/README.md`) |
| Lead, master takes only (BRIEF A23, A26, A27) | the live `campusS1Data.ts` .. `campusS5Data.ts` (P0's split and `S<N>_PARTS`; carries of coop4's rows, PR1's gear data, sector-marks' labels) |
| Nobody until switch-on | the live `campusS<N>.ts`, `campusS<N>Dress.ts`, `tests/campusS<N>*.test.ts`, `docs/sector-redesign/graph/campusOps-S<N>.json` (J12 S10's until SW-<N>, BRIEF A13) |
| MEAS-0 (only if J12 ships no flag argument) | `scripts/level-measure.mjs` (a `--flags` argument) |
| EXIT-<N> (lead) | the section's `graph/v2/campusOps-S<N>.json` (`measured` values by `level-measure --write`), `docs/campus-greybox/exit/**` (route-run logs, walk card text) |

```claims
files:
  - src/core/flags.ts                                       # lead: campusV2 (P0)
  - src/world/maps/campusParts.ts                           # lead
  - src/world/maps/campusSections.ts                        # lead
  - src/world/maps/campusSectors.ts                         # lead: tables (P0 split; A23 / A26 carries)
  - src/world/maps/campusLips.ts                            # lead
  - src/world/maps/campusOps.ts                             # lead
  - src/world/maps/campusDress.ts                           # lead
  - src/world/maps/campusBake.ts                            # lead
  - src/world/maps/campusS{1,2,3,4,5}Data.ts                # lead: P0 split, S<N>_PARTS; master-take carries (A23, A26, A27)
  - src/world/maps/campusV2/**                              # lanes S1-S5 (s<N>*.ts), TAG-<N> (s<N>Data.ts), lead carries
  - src/world/campusArt/assets/*-s{1,2,3,4,5}-v2.*          # lanes: new assets only
  - tests/campusV2*.test.ts                                 # lead (campusV2.test.ts); lanes, TAG (campusV2S<N>*.test.ts)
  - tests/campusS{1,2,3,4,5}*.test.ts                       # lead at SW-<N> only
  - tests/sectorGuardTags.test.ts                           # lead at SW-<N> only
  - tests/campusObjectivePlace.test.ts                      # lead at SW-<N> only: room list to v2 (A26)
  - docs/sector-redesign/graph/v2/campusOps-S{1,2,3,4,5}.json   # V2-SEED, lanes, TAG-<N> (keys 3 / 4), EXIT-<N> (measured)
  - docs/sector-redesign/graph/campusOps-S{1,2,3,4,5}.json  # lead at SW-<N> only: moves the v2 file over its own, re-measures all five (section 9)
  - docs/level-validator/graph-sets.json                    # lead at SW-<N> only (the section's counts)
  - docs/sector-redesign/signoff/SYNC.md                    # lead: src lines
  - scripts/e2e-anchors.mjs                                 # E2E-1: a campusOps part
  - scripts/e2e-sectorops.mjs                               # E2E-2a part 7, E2E-2b part 8; lead at SW-<N>: part 6 numbers
  - scripts/run-e2e.mjs                                     # E2E-2a / 2b: PARTS row only
  - scripts/e2e-affected.mjs                                # E2E-2a / 2b: the campus DIRECT_COVERS row only
  - scripts/level-measure.mjs                               # MEAS-0, only if J12 ships no flag argument
  - docs/systems/testing-tools.md                           # E2E rows
  - docs/campus-greybox/**                                  # incl. exit/** (EXIT-<N> logs, walk card text)
  - changes/feature-campus-greybox*.md                      # lead (P0's fragment); each lane / sub-lane / TAG / E2E branch its own
maps: campusOps
wire: none
save: none
```

No `src/game`, `src/ai` or `src/net` file is claimed (BRIEF A8 replaced; J4 and J26 own those). No wire or save path:
the layout is not on the wire (every peer opens the same `?campusv2=` link), no save field changes, no `PROTOCOL_VERSION`
or `SAVE_VERSION` effect. Lighting group ids for new circuits: S2 100-139, S4 140-149, S5 150-159, S3 160-169 (the
campus uses 40-89; ids go to 4096 on the wire, `protocol.ts` course `lights.groups`).

Rules for every lane (unchanged from P0): a v2 file imports its own v2 files, `../campusParts` and, for joins only, the
live files of other sections (BRIEF A6); a new list goes in `S<N>_PARTS`, a new kind of field needs the lead; first
layout change sets `S<N>_V2_COPY = false`; S5 prefixes lip ids (`CR8-s5` ...). Builders read `LD:` / `SS:` line tags in
the S1-S3 briefs at 6c3f4a87 and confirm the value on master (section 11): a changed value goes to the lead.
Graph path: every lane, TAG and EXIT slice writes `docs/sector-redesign/graph/v2/campusOps-S<N>.json`, never the live
`graph/campusOps-S<N>.json` (BRIEF A13; a brief line that names the live path means the v2 one).
Worktrees (RULES "A job"): every branch except `feature/campus-greybox` is worked in its own folder
`C:/NightShift/Mobile-Coop-campus-greybox-<suffix>` on `feature/campus-greybox-<suffix>` (`-s1` .. `-s5`, `-s2-g6a`,
`-s3-r1` .. `-s3-r6`, `-tag<N>`, `-e2e`, `-e2e2a`, `-e2e2b`, `-meas0`). The lead cuts each one (`git worktree add <folder>
-b <branch> <base>`; base: this branch's head for the lanes, origin/master for TAG / E2E / MEAS-0, the brief's named commit
for sub-lanes) and puts the folder and branch in the agent's preamble guard. No agent checks out a branch, and no agent
works in the lead's folder `C:/NightShift/Mobile-Coop-campus-greybox`. Parallel agents never edit the same file; the lead
merges sibling branches (never master) where a brief says so. Every lane PR targets master.

### 2a. Claims overlaps and their order

`node scripts/claims-check.mjs --plan docs/campus-greybox/PLAN.md --name feature/campus-greybox` (rerun 2026-10-25 ~20:40
after the check 2 fixes, exit 1): 39 plans with claims, 37 overlaps, each in the table below (new since check 2:
hud-guidance-b2, guard-rules-s5, marlow-replan). Jobs with no claims block are not scanned by it; plan check 1's manual
scan lists them (second table). "No order" = different lines of a shared file; the train merges them and whichever
lands second takes master's file at its next master take.

| Branch(es) | Shared | Order / owner |
| --- | --- | --- |
| guard-rules, -s1, -s2, -s5 (J15, Guard AI) | `campusS4Data.ts`, `campusS5Data.ts`, `e2e-sectorops.mjs`, `flags.ts`, map campusOps | **PR1 first** (orchestrator, BRIEF A27): P0's PR and every J17 edit of the two files train after it, and every lane PR (S1-S5) while it still carries P0's commits trains after PR1; the lead carries PR1's S4 / S5 gear data into the v2 copies; S9 (PR4) roof-marksman post carried by S5-b or SW-5. `e2e-sectorops.mjs`: PR1's S13 warehouse block vs our parts 7 / 8: no order |
| sector-marks, sector-marks-b1 (same lead) | `campusSectors.ts`, `campusS4Data.ts`, `campusS5Data.ts`, `e2e-sectorops.mjs` (one assert after :91), `tests/campusObjectivePlace.test.ts` (-b1), map campusOps | **sector-marks first** (BRIEF A26); the lead carries its labels and `hyp2` into the split and v2 files; its `tests/campusObjectivePlace.test.ts` (on -b1) is ours only at SW-<N> (take master's file, point its rooms at v2) |
| test-runner-j20 (+ -pra, -prb, -prc, -s1, -s2, -s3a, -s3b, -s4, -s5, -s6a, -s6b, -s6c, -s7) (Test Runner) | `e2e-affected.mjs`, `run-e2e.mjs`, `e2e-sectorops.mjs`, `testing-tools.md` | **J20 first**: E2E-2a / 2b branch from master after J20's T5 (campus DIRECT_COVERS row) and S6c (part 6 alive-at-start block) are on master, then add `:7` / `:8` to that row and '7', '8' to `PARTS`; part 6 edits at SW-<N> take master's part 6 |
| light-realism, -l0 (J10, same lead) | `tests/campusS{1..5}.test.ts`, `campusS2Board`, `campusS4NocSight` tests (ours: SW-<N> only), map campusOps | **J10 first**; at SW-<N> the lead ports J10's lamp asserts into the v2 tests before retiring a live test. Not in the scan (we do not claim live `campusS<N>.ts`): J10's lamp edits there break the copy check of a still-marked v2 copy, so the lead carries them into it at the master take (as A23); a re-laid section takes J10's values in its PROVISIONAL `S<N>_LIGHTS` (A19) |
| map-ready (same lead) | `flags.ts`, `e2e-sectorops.mjs`, `testing-tools.md`, map campusOps (mode code, no map data) | no order (map-ready waits on its own re-plan) |
| sector-batch (J18, same lead) | `flags.ts` (`sectorOutWait`), `e2e-sectorops.mjs` (block after :983) | no order (its PLAN orders itself after sector-marks) |
| hud-guidance (+ -a1, -a2, -a3, -b, -b1, -b2) | `e2e-sectorops.mjs`, `testing-tools.md` | no order; E2E-2a / 2b append after their blocks |
| char-shadow-meter (J16) | `flags.ts`, `testing-tools.md` | no order |
| coop-kit, guard-ai-mission-hooks, player-batch-j19 | `flags.ts` | no order (each its own flag; ours `campusV2`, `flags.ts:71-79`, P0) |
| route-runs-2 (J13) | `testing-tools.md` | no order (rows) |
| marlow-replan (Marlow) | `flags.ts` (`marlowReplan`), `run-e2e.mjs` | no order (its own flag; our `run-e2e.mjs` edit is the `PARTS` row only) |

| Not in the scan (no claims block) | Shared | Order / owner |
| --- | --- | --- |
| validator-port (J12, Marlow; its source branches level-validator-v6, -v6c, -v6e, -v6e2, mission-validator, -dims) | the five live `graph/campusOps-S<N>.json` (its S10: `area`, `vantage.at`, measured values, drift test `tests/levelMeasureCampus.test.ts`), `scripts/level-measure.mjs` (its S2, new), `docs/level-validator/graph-sets.json` (its S5) | **J12 owns the live graph files until SW-<N>**: J17 writes `graph/v2/` (BRIEF A13), so the lanes and J12 never edit the same file; SW-<N> moves the v2 file over the live one and updates the section's `graph-sets.json` counts (validator-port PLAN "Sector Ops (J10, J17)"), then **SW-<N> re-writes the `measured` values of all five live files** in J12's set (`level-measure --write` under the new `CAMPUS_V2_ON`: V6's `geom` is one whole-map hash, so a switched section stales every campus graph; section 9) with the drift test green in the same PR. J12 told: the lead messages Marlow Build when each SW-<N> PR opens. `level-measure.mjs`: J12 first; MEAS-0 only after J12's S2 is on master and only if it has no flag argument |
| coop4 + -data, -doc, -e2eai, -pol, -ui2 (J4, #317, Guard AI) | `campusSectors.ts`, `campusS4Data.ts`, `campusS5Data.ts`, `tests/campusS{1..5}.test.ts`, `tests/sectorGuardTags.test.ts`, `e2e-sectorops.mjs`, `flags.ts` | **#317 first** (expected); whichever lands second carries the ten tag rows (BRIEF A23); the test files are ours only at SW-<N> |
| mission-engine, -flg, -gb*, -net*, -pol1 (J26, Campaign) and mission-framework (#372) | `campusOps.ts` (an import after `dressCampus`, `missions:` after `sectors: CAMPUS_SECTORS,`), `flags.ts`, `tests/campusS1.test.ts`, `tests/sectorGuardTags.test.ts` | no order: P0 left both `campusOps.ts` spots untouched (`git merge-file` clean); the two tests are ours only at SW-<N> (take master's file then) |
| sector-redesign-signoff | `docs/sector-redesign/signoff/SYNC.md` | **signoff first**; the lead adds only src lines after it merges |

## 3. Shared, one owner (the lead)

| Item | Where | Why shared |
| --- | --- | --- |
| `CAMPUS_SCREEN_CAP` 12 | `campusSectors.ts` | map-wide perf budget; each lane tests it with the tags on (4 players) |
| C3 / C4 stub connectors, `STUB_NAV_SEEDS` | `campusOps.ts` | between two sections; no plan moves them |
| `BOARD_ORDER`, section build order | `campusOps.ts` | live index order of boards / items |
| Bake rects per section, C1-C4 rects | `campusBake.ts` | one table; no plan changes a footprint |
| `ground` camera level | `campusSectors.ts` | every section's |
| Live hero / asset files | `src/world/campusArt/assets/` | read by v1 and the v2 copies (BRIEF A11) |
| `SYNC.md` src lines | sign-off docs | lanes report the file:line of every sync node; the lead writes them |

## 4. Rules every slice obeys

**Guards (C1, C2, C3; BRIEF A14, A15).** Base list = the signed-off count (S1 15, S2 18, S3 20, S4 25, S5 26), no
`minPlayers`. TAG-<N> appends one `minPlayers: 3` row then one `minPlayers: 4` row. Every lane test checks:
- base count; `base + SECTOR.alarmMax x perStage <= SECTOR.maxAlive` (S1 21, S2 24, S3 26, S4 31, S5 32);
- after TAG: `guardForTeam` spawns base at 1 and 2 players, base + 1 at 3, base + 2 at 4; every spawned list <= 32;
  the screen cap (`CAMPUS_SCREEN_CAP` 12) holds with the 4-player list; the coop4 tag rules (BRIEF A14).
- At 3-4 players the 3-4 player reinforcement extras are held to the room left by `capReinforce` (#317); S4 at 4
  players: 27 + 6 = 33, so one base reinforcement waits for room; S5: 28 + 6 = 34, two wait (Q10, A15).
- Helmets: lanes add no `gear` tags. J15 PR1 lands first (BRIEF A27): no section `gear: 'helmet'` on S4 / S5 and
  `'armour'` wherever a brief says `'both'`, so the v2 data passes PR1's `checkSectorGuards`.
- coop4's live tag rows (BRIEF A23) sit in a v2 copy only while its `S<N>_V2_COPY` holds. The lane's guard slice writes
  the signed base list with no `minPlayers` row (it deletes any carried coop4 row); TAG-<N> appends the v2 rows.

**Graph (C7, C8, C9, C10, C14, C15; BRIEF A13, A16-A18).** V2-SEED (lead, once, before the lanes' first graph step)
writes the five signed plan graphs (`origin/feature/sector-redesign-signoff` @9eb7b9c6
`docs/sector-redesign/graph/plan/campusOps-S<N>.json`) to `docs/sector-redesign/graph/v2/campusOps-S<N>.json`; each lane's
"replace the graph with the plan graph" step is then already done (it checks the file is byte-equal), and it edits only
its own v2 file (plus J12's `area` per space, `vantage.at` and link `at` where a shared edge has 2+ gaps, from the first
slice after validator-port S10 is on master). Then:
- `meta.players` `[1, 2, 3, 4]`; `meta.sections` the five ids on every file (checks-signoff "meta.sections").
- every guarded space carries keys "1", "2", "3", "4"; until TAG-<N>, "3" = "4" = "2"; TAG raises "3" / "4" where the
  tagged guard stands. Guards are counted in the space of their post or route start, chokes and connector / hub / utility
  / dormant guards included, so the section sums to the spawned count at every key (S1 15, S2 18, S3 20, S4 25, S5 26 at
  "1" and "2"). Today's plan sums: S1 15, S2 15, S3 10, S4 23, S5 17 (the rest sit in `note`).
- `unavoidable` on `s1-forecourt` (K1), `s2-l1-landing` (K2), `s4-cc` (K3), `s5-ante` (K4).
- splits, overwatch and assist as the plan graph declares them (`split:s1`, `split:s2-hack`, `split:s3-obj`, `split:s4r`,
  `split:s5-k4`); leg times and partner reach stay declared targets; V6 measures them at exit.
- notes: "PLAN" -> "BUILT <slice> (file:line)"; targets "DECLARED, measured in greybox (V6)"; never `measured` by hand.
- Validator at every lane PR head: the five v2 files together, 0 ERR naming the section; the WARN list equals the detail
  doc's justified list plus the A18 connector WARN (S2, S4). Command:
  `node scripts/level-validate.mjs docs/sector-redesign/graph/v2/campusOps-S{1,2,3,4,5}.json` (spelled out per file).

**Light (BRIEF A19, Q2 "Never", G329, SPEC "Lighting." on #433).** One `S<N>_LIGHTS` block per section, headed PROVISIONAL /
`TODO(light-realism)`, the only source of the section's lamps. No fitting built off or dead; no as-built fitting removed or
dimmed for a shadow target; every room with a fitting lit on a cuttable circuit with a switch by its door (or a board);
dark only where no fitting is (nobody works there) or behind an occluder. A lane test lists every lamp and asserts
`on`, `intensity > 0`, `destructible` and `electric` (photocell / emergency fittings excepted only where the plan names the
reason, LD 5.1). Light that lands on a planned dark spot is left alone and reported (J10 / lead decide), never dimmed.

**Mission devices (BRIEF A20)**: section 6.

## 5. Slices, PRs, sizes, models, rows closed

Sizes are changed lines without the P0 copies. Model: Sonnet builds from the strict Opus brief; Opus builds where marked;
every fix round is Opus (RULES "A job"). One Sonnet checker per lane PR (greybox / data); an Opus checker on the E2E PRs.

| PR | Slices (brief) | h | Lines | Model | Closes / advances |
| --- | --- | --- | --- | --- | --- |
| P0 | flag, parts, selector, data split, v2 copies, equality test; trains after J15 PR1 (A27) | done | ~5.5k (copies, A4) | Opus | - |
| V2-SEED | the five signed plan graphs into `graph/v2/` (section 4 "Graph"), before the lane worktrees are cut | 0.25 | graph copies | lead | - |
| S1-a | G1 + G2 (`briefs/S1.md`); PR after J15 PR1 while it carries P0's commits (A27) | 5 | ~800 | Sonnet | C1 (part) |
| S1-b | G3 + G4; PR after J15 PR1 while it carries P0's commits | 6 | ~800 | Sonnet | C1 (part), C7 |
| S1-c | G5 + G6 (graph keys, totals, K1 tag); PR after J15 PR1 while it carries P0's commits | 4.5 | ~750 | Sonnet | C1, C8 (1-2), C9, C10, C15 |
| S2-a | G1 + G2 (`briefs/S2.md`); PR after J15 PR1 while it carries P0's commits (A27) | 6.5 | ~900 | Sonnet | C7 |
| S2-b | G3 + G4; PR after J15 PR1 while it carries P0's commits | 7 | ~1000 | Sonnet | C7 |
| S2-c | G5a devices + G5c room lights (Split Shift devices, two-player team doors), plus G6a's 18 guards (built beside G2-G4 on `-s2-g6a`, merged into the lane before G5a; `briefs/S2.md` section 8); PR after J15 PR1 while it carries P0's commits | 7 | ~1050 | Sonnet | C1 (counts), C4 (Q21), Split Shift devices |
| S2-d | G6b (routes, graph keys, totals, K2 tag, LD 15 tests); PR after J15 PR1 while it carries P0's commits | 1.5 | ~400 | Sonnet | C1, C8, C9, C10, C15 |
| S3-a | R1a frame + R1 G re-lay (`briefs/S3.md`; sub-lane `-s3-r1`); PR after J15 PR1 while it carries P0's commits (A27), as every S3 PR | 5 | ~1200 | Sonnet | C6, C7 (geometry part) |
| S3-b | R2a + R2b L1 re-lay (`-s3-r2`) | 5 | ~1000 | Sonnet | C6, C7 (geometry part) |
| S3-c | R3 three fire stairs (`-s3-r3`) | 2 | ~500 | Sonnet | C6, C7 (geometry part) |
| S3-d | R4 lights, devices (`-s3-r4`) | 3 | ~900 | Sonnet | C7 (geometry part) |
| S3-e | R5 20 guards, routes, sector (`-s3-r5`; opened once S3-a .. S3-d are on master) | 3 | ~1200 | Sonnet | C1, C6, C7 (routes) |
| S3-f | R6 lips, coop tests, graph keys, totals + R7 dressing (`-s3-r6`; after S3-e) | 5 | ~1400 | Sonnet | C8, C9, C15 |
| S4-a | G4.1 + G4.2 (`briefs/S4.md`); PR trains after J15 PR1 (A27) | 6 | ~900 | Sonnet | C7 |
| S4-b | G4.3 + G4.4; PR after J15 PR1 | 5.5 | ~900 | Sonnet | C7 |
| S4-c | G4.5 + G4.6 (25 guards with PR1's gear rule, no `minPlayers` row, Code Relay devices, graph keys, totals, K3 tag); PR after J15 PR1 | 6 | ~1000 | Sonnet | C1, C8, C9, C10, C15, Code Relay devices |
| S5-a | P1 (`briefs/S5.md`); PR after J15 PR1 | 4 | ~800 | Sonnet | C7 |
| S5-b | P2 + P3 (pair bolt, lights, 26 guards with PR1's gear rule, no `minPlayers` row, PR4's roof-marksman post if on master); PR after J15 PR1 | 5 | ~900 | Sonnet | C1, C3 (2-player half), C5 |
| S5-c | P4 (+ graph keys, totals, K4 tag); PR after J15 PR1 | 3 | ~600 | Sonnet | C5, C8, C9, C10, C15 |
| TAG-1, TAG-2 | two tagged rows each, tests, graph keys 3 / 4 (each brief's TAG section) | 1 each | ~150 each | Sonnet | C2, C3, C8 (3-4), G A2 (data half) |
| TAG-4, TAG-5 | two tagged rows each on the re-laid section (`briefs/S4.md` TAG-4, `briefs/S5.md` TAG-5). coop4's live S4 rows (#21 cage keyholder's second, #22 second battery checker) and S5 rows (#25 second archive round, #26 second service round) are **replaced**, not carried: they stand on the v1 cage, battery and archive layout, S4-c / S5-b drop them from the v2 copy with the base re-lay, and TAG-4 / TAG-5 append the briefs' v2 rows. The live rows stay in `campusS4Data.ts` / `campusS5Data.ts` until SW-4 / SW-5 | 1 each | ~150 each | Sonnet | C2, C3, C8 (3-4), G A2 (data half) |
| TAG-3 | two tagged rows on the re-laid S3 | 1.5 | ~150 | **Opus** (placement on a re-laid block: no candidate survives the re-lay) | C2, C8 |
| E2E-1 | campusOps part in `e2e-anchors.mjs` with `?campusv2=1,2,3,4,5` | 2 | ~200 | Sonnet (strict brief, Opus writes it when P0 is on master) | C16 (anchors), T T6 campusOps half |
| E2E-2a | Branch `feature/campus-greybox-e2e2a` from origin/master. Files: `scripts/e2e-sectorops.mjs` (new part 7 block, `?campusv2=1,2,3`: S1, S2, S3), `scripts/run-e2e.mjs` (`PARTS` 'e2e-sectorops' + '7'), `scripts/e2e-affected.mjs` (`e2e-sectorops:7` in the campus DIRECT_COVERS row), `docs/systems/testing-tools.md` (the part 7 row). Probes per section: section 7 rows 8 (one vantage, one lit pool, one circuit cut with its lure), 9 (one loud floor), 11 (alive count at load at 2 and 4 players, read from `guardForTeam` on the section's data, never a literal; one ghost section clear with its rating bonuses; one body on a patrol route found), 12 (one co-op route host + client, one revive on a co-op surface). Checks: `node --check` on the three scripts, `npm run typecheck:fast`, laptop `e2e-sectorops:7` and `:6` (`E2E_GPU=1`). Done: part 7 green on the laptop with S1-S3 on, part 6 unchanged, row in testing-tools | 4 | ~600 | **Opus** | C16 (S1-S3) |
| E2E-2b | Branch `feature/campus-greybox-e2e2b` from origin/master after E2E-2a. Files: `scripts/e2e-sectorops.mjs` (new part 8 block, `?campusv2=4,5`: S4, S5; reuses part 7's helpers, edits none of its lines), `scripts/run-e2e.mjs` (+ '8'), `scripts/e2e-affected.mjs` (+ `e2e-sectorops:8`), `docs/systems/testing-tools.md` (the part 8 row). Probes: as E2E-2a for S4 and S5, plus the 4-player cap case (S4 27 + 6, S5 28 + 6: the spawned list stays <= 32, A15). Checks: as E2E-2a with `e2e-sectorops:8` and `:6`. Done: part 8 green with S4-S5 on, part 6 unchanged, row in testing-tools | 4 | ~600 | **Opus** | C16 (S4-S5) |
| MEAS-0 | only if J12 ships no way to set the flag: `--flags campusV2=...` on `level-measure.mjs` | 1 | ~50 | Sonnet | C11 enabler |
| EXIT-<N> | measured values written by `level-measure --write`, `--require-measured` pass, route-runs log, walk card text | 2 each | graph only | lead | C11, C14, C15 at exit |
| SW-<N> | switch-on (section 9) | 1 each | ~300 | lead | - |

About 120 h of lane work in all. Order (full burn, RULES "A job"): V2-SEED, then the five lanes run at once (S1, S2,
S3, S4, S5 G / P slices, each lane, sub-lane and parallel builder in its own worktree, section 2 "Worktrees"); inside a
lane, slices run in the brief's order (S2: G6a beside G2-G4; S3: six sub-lanes, `briefs/S3.md` section 2). Every lane
PR targets master. Cross-job orders (section 2a): J15 guard-rules PR1 lands on master before any J17 edit to
`campusS4Data.ts` / `campusS5Data.ts`, so P0's PR trains after PR1, and every lane PR (S1-S5) while it still carries P0's commits trains after PR1 (P0's commits edit both files; the lanes build now, only their PRs wait);
sector-marks lands first and its carries ride the next master take (A26); #317's rows per A23. TAG-<N> starts when #317
is on master and that section's guards and graph keys are (S1-c, S2-d, S3-f, S4-c, S5-c). E2E-1 starts when P0 is on master;
E2E-2a when S1-c, S2-d and S3-f are on master; E2E-2b when E2E-2a, S4-c and S5-c are (both also after J20's T5 and S6c,
section 2a). EXIT-<N> when J12 and J13 are on master. C13 (warehouseOps) is closed by Q26: no slice.

## 6. Mission devices and the hooks J26 must supply (BRIEF A20)

Placed by the lanes as greybox data and props, ids verbatim in `// sync-...` comments; no mission wiring.

| Mission | Device (id) | Greybox (lane, slice) | Engine already has | J26 / Guard AI must supply |
| --- | --- | --- | --- | --- |
| Split Shift | comms camera panel (sync-s2-comms) | `desk-comms2` E6 desk at (3.6, 4.4, -6.5), operator #8 (S2-c) | SecurityDesk loop | the mission step reading the loop |
| Split Shift | held east-wing cut (sync-s2-power) | board at (0.3, 0, -22), groups 55 + 56, no window (S2-c) | BoardDef without window | per-team "hold dark" step |
| Split Shift | facilities keypad (sync-s2-kpfac) | keypads on both doors (-4, -1), (-7.5, 3), code s2-fac-code (S2-c) | SectorKeypad (EW5) | Guard AI: guards pass keypad doors (#7 must walk out for the twist; S2 brief Q1) |
| Split Shift | leads (sync-s2-kitchen, sync-s2-plantlog) | overhear box (-31, -26) talkers #5-6; board in cage 3 (-41.5, 0, -18.5); post-room note prop on the sorting table (-35, 0.9, -26) (S2-c) | SectorIntel overhear / board | radio lines (Marlow text) |
| Split Shift | bridge pair door (sync-s2-pairdoor) | pg-brg two-player pair gate, keys (-3.1, -16.8) / (-1.9, -9.9), no `soloWindow` (Q21); solo line = the comms door facing K2 (S2-c) | SectorPairGate | only if Michael picks the solo window: ENG-1 (Needs Michael 1) |
| Split Shift | twist, per-team restart | - | - | Guard AI: #7 walks to the plant room via reception and collects #1; J26: per-team restart, team rules |
| Code Relay | dock board (sync-s4-dockboard) | built, kept at (16, 1.5, 21.85) (S4-c) | intel board | - |
| Code Relay | riser keypads (kp-deck riser side, kp-riser) | kp-deck at (30.5, 45): a keypad prop on the riser face (the item already works from either side); kp-riser door (34, 46.5) + keypad entry, code s4-codes (S4-c) | SectorKeypad | - |
| Code Relay | NOC release (sync-s4-noc) | console prop at Dunmore's west seat, id comment; #14 Dunmore posted, never dormant (S4-c) | - | named interrogation of #14 issues a release; **re-askable** after expiry (Michael's pick) |
| Code Relay | cage code prompt (sync-s4-cagekp) | the cage terminal = the download objective at (18, 0, 38.3), id comment (S4-c) | download objective | release prompt, 30 s (90 s solo) window, no hard countdown: an expired code is asked for again |
| Code Relay | roster (lead-s4-roster) | intel board at (-3.85, 1.5, 45.2), grants `s4-noc-duty` (S4-c) | intel board | the code flag read by the interrogation |
| Code Relay | deck radio line (lead-s4-deckradio) | overhear box at #13's stop (12, 7.3, 36), talkers [#13], grants `s4-noc-duty` (S4-c) | overhear | the radio line text |
| Code Relay | seat placard | visual prop on the west seat (1.0, 3.6, 43.0) (S4-c) | - | - |
| Code Relay | footage drive (optional) | id comment on `desk-sec4` (S4-c) | - | the second desk action (8 s) and its reward |
| Code Relay | bolt point (A11) | (28, 45.8) kept clear, id comment (S4-c) | - | Dunmore's spook respawn |
| Code Relay | twist | - | - | Guard AI: #20 walks to the cage front on the release (walk-to hook, J26 G D6-D9) |

## 7. Section 15 acceptance tests for campusOps (C16)

One row per LD 15 line; every row runs with the section's flag on. "Lane" = the section's final slice; "exit" = EXIT-<N>.

| # | LD 15 line | Test | Owner, when |
| --- | --- | --- | --- |
| 1 | Graph passes the validator, warnings justified, matches the built map | validator command (section 4); `tests/campusV2S<N>Graph.test.ts`: every graph space `area` holds a walkable nav cell on its storey, every door link has a door anchor within 0.6 m of its point, guard sums equal the spawned counts per key | lane, every PR; re-run at exit |
| 2 | Measured targets (light band, vantage, LOS, reach, split legs) | `level-measure --write` then `--require-measured` (V6) | exit, after J12 (light band after J10) |
| 3 | Every declared route passes its bot route-run | J13 harness, "Never stuck" (Q7), log saved under `docs/campus-greybox/exit/` | exit, after J13 |
| 4 | Every planned traversal element engages from its planned approach (pad) | E2E-1 (each ladder, rappel, hatch drop, co-op lip boost point from its planned side) | E2E-1 |
| 5 | `e2e-anchors.mjs` covers the map | E2E-1 (campusOps, all five v2) | E2E-1 |
| 6 | Split gaps exactly the planned ones | graph: no `split_jump` link planned; `tests/campusV2S<N>*.test.ts` unplanned-lip test (LD 11.8: every lip between 3.8 and 4.5 is a planned lip, on a solo-reached surface, or noLedge) | lane |
| 7 | Nav path insertion to extract passes the spaces in order | lane route-leg tests (`analyticNav` + `runtimeNav`); lead adds a whole-map case to `tests/campusV2.test.ts`: with all five on, `runtimeNav` from S1's start reaches S5's extract box through C1-C4 in order | lane; lead after the fifth guard PR |
| 8 | Darkness: vantage / dark spot stays under suspicious for a patrol cycle; a lit pool on a route is noticed; cutting its circuit makes it safe and lures | unit: `LightField` level at each graph vantage and hide spot (recorded; asserted dark only where there is no fitting or an occluder, A19); e2e: E2E-2a / 2b per section, one vantage, one lit pool, one circuit cut with its lure | lane (unit); E2E-2a / 2b |
| 9 | Noise: each planned loud floor draws the planned guard above silent speed, not at it | E2E-2a / 2b, one loud floor per section from the detail doc | E2E-2a / 2b |
| 10 | Patrols: on nav, cycles in scale sheet 10, every guard covers his route | lane guard tests (cycle formula of `tests/campusS1.test.ts:168-192`, 25-45 s) | lane |
| 11 | Every guard spawned at start alive; a ghost run earns every section-rating bonus; a body left on a route is found | TAG tests (spawned counts at 1-4); E2E-2a / 2b: alive count at section load per section (2 and 4 players), one ghost section clear with the rating bonuses, one body left on a patrol route found | TAG; E2E-2a / 2b |
| 12 | Co-op routes work host and client; lips out of solo reach; a downed player on each co-op surface is revived; solo completes past every team door | lane lip tests (`soloJumpThreats`, rules 1-5); lane solo-route test: an `analyticNav` path start to objective and exit avoiding every pair gate, far-side bolt and co-op link; E2E-2a / 2b co-op: one co-op route per section host + client, one revive on a co-op surface per section | lane; E2E-2a / 2b |
| 13 | Perf budgets on desktop | J21 line (Q4 60 fps) on the laptop, all five on | exit, after J21 |

## 8. Greybox exit per section (RULES Intake 5, G289, G330; BRIEF A3)

1. Lane PRs merged dark; validator 0 ERR (section 4).
2. MEAS: `node scripts/level-measure.mjs docs/sector-redesign/graph/v2/campusOps-S<N>.json --write` with the section's
   flag set (J12's flag argument or MEAS-0), then `node scripts/level-validate.mjs <the five v2 files> --require-measured`:
   0 ERR.
   A measured miss: the lead's fix round (Opus), never a target edited to pass.
3. Route-runs (J13) on every declared route of the section: no dead stop.
4. Section 7 rows green for the section.
5. Walk card line for the orchestrator: `?campusv2=<N>` on `/preview/`, what to try, risks; in co-op every player opens
   the same `?campusv2=<N>` link (BRIEF A9; the layout is not on the wire, `src/core/flags.ts:70`: a client on another
   link sees v1 walls under v2 guards). One card for S1-S5 (A10, Michael ~22:25), each line with the start-at-section
   link (A28). Light measured first (A29). Order and blockers: `EXIT.md`.

## 9. Switch-on (SW-<N>, lead, after Michael accepts the walk)

Preconditions (all on master or done): Michael accepted the section's walk (A10); EXIT-<N> done (section 8); **TAG-<N>
merged** (coop4's `tests/sectorGuardTags.test.ts` fails a live section with no tagged row, `origin/feature/coop4` :613,
so SW-<N> cannot ship a section before its TAG-<N>).

Add N to `CAMPUS_V2_ON`; retire `tests/campusS<N>*.test.ts` (the v2 tests become the section's); update
`tests/sectorGuardTags.test.ts` (base count and hash per section; cap assert to A15's form), `tests/campusObjectivePlace.test.ts`
(sector-marks; its room list reads the live `campusS<N>.ts` rooms: point section N at `CAMPUS_PARTS[N - 1].rooms`, BRIEF
A26) and `scripts/e2e-sectorops.mjs` part 6's v1 numbers (S1 8 guards, S2 per floor [3,6,3], S3 16, CR2 probes, walks) to
v2; laptop `e2e-sectorops:1` .. `:6` and part 7 or 8 with the section live. Move `graph/v2/campusOps-S<N>.json` over the
live `graph/campusOps-S<N>.json` and update the section's counts in `docs/level-validator/graph-sets.json` (BRIEF A13).
**Then re-measure all five live campus graphs** with the new `CAMPUS_V2_ON` (the default build now holds the section as
v2, so no flag argument): `node scripts/level-measure.mjs docs/sector-redesign/graph/campusOps-S1.json
docs/sector-redesign/graph/campusOps-S2.json docs/sector-redesign/graph/campusOps-S3.json
docs/sector-redesign/graph/campusOps-S4.json docs/sector-redesign/graph/campusOps-S5.json --write`. V6's `measureGraph`
stores one whole-map `geom` (light-set hash + nav hash, `origin/feature/level-validator-v6e2` `src/world/levelMeasure.ts:202-204`,
copied to every space at :261), so a switched section makes all five graphs stale, and EXIT-<N>'s values were taken under
another flag set. The same PR then runs J12's drift test `npx vitest run tests/levelMeasureCampus.test.ts` (it builds
the campus with the default flags, :48-53) green, and `node scripts/level-validate.mjs <the five live files>
--require-measured` with 0 ERR naming section N (the v1 sections keep J12's known misses). A measured miss after the move is the lead's fix round, never a target edit. Carry any
live-only change still missing from v2 (guard-rules S9's roof-marksman post, BRIEF A27; J10 lamp asserts, section 2a).

## 10. Checks

- Agent sub-steps: `npm run typecheck:fast` + `npx vitest run tests/campusV2.test.ts tests/campusV2S<N>*.test.ts
  --maxWorkers=2` plus the live campus tests the brief names.
- Laptop per lane PR (S1-S5, every S3 sub-lane PR included): `e2e-sectorops:1` .. `:6` (`E2E_GPU=1`): flag off, they
  prove the live map is unchanged. E2E PRs: their
  own part (E2E-2a `:7`, E2E-2b `:8`) plus `e2e-sectorops:6`. No lane touches `src/net`, `src/player` or `src/game`, so `e2e-coop` / `e2e-netmove` are
  not required.
- Checker verdict as the `checker` commit status on the PR head (RULES "A job").

## 11. Master moved under this plan's claims (branch @c2f1f131 is 393 commits behind; not merged in)

- `docs/level-design.md` (rewritten; sections renumbered inside 4-15): the S1-S3 briefs cite `LD:<line>` at 6c3f4a87 and
  `LD 16.x` numbers; read the cited line at 6c3f4a87 and confirm by content on master.
- `docs/design/scale-sheet.md` (+70 lines): `SS:<line>` tags are at 6c3f4a87; confirm each value on master.
- `scripts/level-validate.mjs` (+249: unavoidable, alive ceiling, mode profiles): the briefs' expected WARN counts were
  taken on the old script; the gate is "0 ERR naming the section and every WARN justified", not the count.
- `docs/level-validator/graph-schema.md`, `campus-run/CONVENTIONS.md`: guard keys and choke counting as section 4.
- `src/world/maps/campusSectors.ts` (a comment line) and `src/game/sectors.ts` (a comment): no effect on the plan.

## 12. Needs Michael (recommended first)

1. Split Shift's approved page lists "the bridge pair door's solo line" (one player turns both keys within 8 s), while Q21
   picked "No, two players" for the S2 team doors. Which holds?
   - Two players: the door stays a team door; solo uses the comms door past the bridge officer (Q21) (Recommended)
   - One-player window on the bridge door only (ENG-1, ~2 h Opus engine slice; level-design 11.10 and VISION 2 change)
2. Q10 named S5. With two tagged extras S4 also passes 32 at 4 players (27 + 6 reinforcements). Same rule there?
   - Yes, keep 32 and fill the rest, as S5 (BRIEF A15) (Recommended)
   - S4 gets one tagged extra only (26 + 6 = 32)
