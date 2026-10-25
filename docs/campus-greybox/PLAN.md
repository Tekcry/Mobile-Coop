# campus-greybox - PLAN

Opus plan, 2026-10-25 (J17 rewrite ~18:30). Intent: BRIEF "Michael said" / "Michael picked". Approach: BRIEF A1 (dark merge
per section). Five section lanes build in parallel; no two lanes edit the same file. FOLDED-PLAN J17 (break 27; Sector
Ops C1-C16, Guard AI A1 A2 B14, Marlow V9, Test Runner T6 campusOps half).

## 0. Depends on, waits on

| Job | What this job needs from it | Blocks |
| --- | --- | --- |
| J4 Guard AI release (#317 coop4 ships on, Q16) | `SectorGuard.minPlayers`, `guardForTeam`, `capReinforce`, team size at section load, `tests/sectorGuardTags.test.ts` | the TAG slices (section 5) and every switch-on; nothing else |
| J12 V6 validator port (Marlow) | `scripts/level-measure.mjs` + `level-validate.mjs --require-measured` on master's mode profiles; a way to measure with `flags.campusV2` set (request: a `--flags campusV2=1,2,3,4,5` argument, else MEAS-0 below); accept `unavoidable` on a guarded exit connector (BRIEF A18) | greybox exit of every section |
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
- P0 PR: open it now; it trains dark. If #317 lands first, BRIEF A23 (the lead carries coop4's tag rows into the split
  files and the v2 copies). Lanes cut from P0's head (`c2f1f131` or its descendant on this branch), so their PRs share
  P0's commits and shrink to their own diff once P0 is on master.

## 2. File ownership (claims)

| Owner | Files (only these) |
| --- | --- |
| Lane S1 (`feature/campus-greybox-s1`) | `src/world/maps/campusV2/s1*.ts`, `tests/campusV2S1*.test.ts`, `docs/sector-redesign/graph/campusOps-S1.json`, new `src/world/campusArt/assets/*-s1-v2.*` |
| Lane S2 | `campusV2/s2*.ts`, `tests/campusV2S2*.test.ts`, `graph/campusOps-S2.json`, new `*-s2-v2.*` assets |
| Lane S3 | `campusV2/s3*.ts`, `tests/campusV2S3*.test.ts`, `graph/campusOps-S3.json`, new `*-s3-v2.*` assets |
| Lane S4 | `campusV2/s4*.ts`, `tests/campusV2S4*.test.ts`, `graph/campusOps-S4.json`, new `*-s4-v2.*` assets |
| Lane S5 | `campusV2/s5*.ts`, `tests/campusV2S5*.test.ts`, `graph/campusOps-S5.json`, new `*-s5-v2.*` assets |
| TAG-<N> (one per section, after J4; branch `feature/campus-greybox-tag<N>` from origin/master) | the section's `campusV2/s<N>Data.ts` (append two rows), `tests/campusV2S<N>Tags.test.ts`, the section's graph (keys "3" / "4") |
| E2E lane, Opus (`feature/campus-greybox-e2e`, from origin/master after P0) | `scripts/e2e-anchors.mjs` (a campusOps part), `scripts/e2e-sectorops.mjs` (a new v2 part 7 only; parts 1-6 untouched), `docs/systems/testing-tools.md` rows for both |
| Lead (`feature/campus-greybox`) | `src/core/flags.ts` (`campusV2`), `campusParts.ts`, `campusSections.ts`, `campusSectors.ts`, `campusLips.ts`, `campusOps.ts`, `campusDress.ts`, `campusBake.ts`, `tests/campusV2.test.ts`, `docs/sector-redesign/signoff/SYNC.md` (src lines), `docs/campus-greybox/*.md`, `changes/feature-campus-greybox.md`; at switch-on also `tests/campusS<N>*.test.ts`, `tests/sectorGuardTags.test.ts`, `scripts/e2e-sectorops.mjs` part 6 |
| Nobody until switch-on | the live `campusS<N>.ts`, `campusS<N>Dress.ts`, `campusS<N>Data.ts`, `tests/campusS<N>*.test.ts` |

No `src/game`, `src/ai` or `src/net` file is claimed (BRIEF A8 replaced; J4 and J26 own those). No wire or save path:
the layout is not on the wire (every peer opens the same `?campusv2=` link), no save field changes, no `PROTOCOL_VERSION`
or `SAVE_VERSION` effect. Lighting group ids for new circuits: S2 100-119, S4 120-129, S5 130-139, S3 140-149 (the
campus uses 40-89; ids go to 4096 on the wire, `protocol.ts` course `lights.groups`).

Rules for every lane (unchanged from P0): a v2 file imports its own v2 files, `../campusParts` and, for joins only, the
live files of other sections (BRIEF A6); a new list goes in `S<N>_PARTS`, a new kind of field needs the lead; first
layout change sets `S<N>_V2_COPY = false`; S5 prefixes lip ids (`CR8-s5` ...). Builders read `LD:` / `SS:` line tags in
the S1-S3 briefs at 6c3f4a87 and confirm the value on master (section 11): a changed value goes to the lead.

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
- Helmets: lanes add no `gear` tags; J15 (helmets by difficulty) removes the section `gear: 'helmet'` defaults later.

**Graph (C7, C8, C9, C10, C14, C15; BRIEF A13, A16-A18).** Each lane replaces its section graph with the signed plan graph
(`origin/feature/sector-redesign-signoff` @9eb7b9c6 `docs/sector-redesign/graph/plan/campusOps-S<N>.json`), then:
- `meta.players` `[1, 2, 3, 4]`; `meta.sections` the five ids on every file (checks-signoff "meta.sections").
- every guarded space carries keys "1", "2", "3", "4"; until TAG-<N>, "3" = "4" = "2"; TAG raises "3" / "4" where the
  tagged guard stands. Guards are counted in the space of their post or route start, chokes and connector / hub / utility
  / dormant guards included, so the section sums to the spawned count at every key (S1 15, S2 18, S3 20, S4 25, S5 26 at
  "1" and "2"). Today's plan sums: S1 15, S2 15, S3 10, S4 23, S5 17 (the rest sit in `note`).
- `unavoidable` on `s1-forecourt` (K1), `s2-l1-landing` (K2), `s4-cc` (K3), `s5-ante` (K4).
- splits, overwatch and assist as the plan graph declares them (`split:s1`, `split:s2-hack`, `split:s3-obj`, `split:s4r`,
  `split:s5-k4`); leg times and partner reach stay declared targets; V6 measures them at exit.
- notes: "PLAN" -> "BUILT <slice> (file:line)"; targets "DECLARED, measured in greybox (V6)"; never `measured` by hand.
- Validator at every lane PR head: the five files together, 0 ERR naming the section; the WARN list equals the detail
  doc's justified list plus the A18 connector WARN (S2, S4). Command:
  `node scripts/level-validate.mjs docs/sector-redesign/graph/campusOps-S{1,2,3,4,5}.json` (spelled out per file).

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
| P0 | flag, parts, selector, data split, v2 copies, equality test | done | ~5.5k (copies, A4) | Opus | - |
| S1-a | G1 + G2 (`briefs/S1.md`) | 5 | ~800 | Sonnet | C1 (part) |
| S1-b | G3 + G4 | 6 | ~800 | Sonnet | C1 (part), C7 |
| S1-c | G5 + G6 (graph keys, totals, K1 tag) | 4.5 | ~750 | Sonnet | C1, C8 (1-2), C9, C10, C15 |
| S2-a | G1 + G2 (`briefs/S2.md`) | 6.5 | ~900 | Sonnet | C7 |
| S2-b | G3 + G4 | 7 | ~1000 | Sonnet | C7 |
| S2-c | G5a devices + G5c room lights (Split Shift devices, two-player team doors) | 5.5 | ~700 | Sonnet | C4 (Q21), Split Shift devices |
| S2-d | G6 (18 guards, routes, graph keys, totals, K2 tag) | 3 | ~700 | Sonnet | C1, C8, C9, C10, C15 |
| S3-a .. S3-e | R1 / R2 / R3 + R4 / R5 + R6 / R7 (`briefs/S3.md`) | 5 / 5 / 5 / 6 / 2 | ~600-1200 each | Sonnet | C1, C6, C7, C8, C9, C15 |
| S4-a | G4.1 + G4.2 (`briefs/S4.md`) | 6 | ~900 | Sonnet | C7 |
| S4-b | G4.3 + G4.4 | 5.5 | ~900 | Sonnet | C7 |
| S4-c | G4.5 + G4.6 (25 guards, Code Relay devices, graph keys, totals, K3 tag) | 6 | ~1000 | Sonnet | C1, C8, C9, C10, C15, Code Relay devices |
| S5-a | P1 (`briefs/S5.md`) | 4 | ~800 | Sonnet | C7 |
| S5-b | P2 + P3 (pair bolt, lights, 26 guards) | 5 | ~900 | Sonnet | C1, C3 (2-player half), C5 |
| S5-c | P4 (+ graph keys, totals, K4 tag) | 3 | ~600 | Sonnet | C5, C8, C9, C10, C15 |
| TAG-1, TAG-2, TAG-4, TAG-5 | two tagged rows each, tests, graph keys 3 / 4 (each brief's TAG section) | 1 each | ~150 each | Sonnet | C2, C3, C8 (3-4), G A2 (data half) |
| TAG-3 | two tagged rows on the re-laid S3 | 1.5 | ~150 | **Opus** (placement on a re-laid block: no candidate survives the re-lay) | C2, C8 |
| E2E-1 | campusOps part in `e2e-anchors.mjs` with `?campusv2=1,2,3,4,5` | 2 | ~200 | Sonnet (strict brief, Opus writes it when P0 is on master) | C16 (anchors), T T6 campusOps half |
| E2E-2 | `e2e-sectorops.mjs` part 7 (v2 on): section 15 probes, section 7 rows 8, 9, 11, 12 | 8 | ~1200, split in two PRs at a section boundary if over | **Opus** | C16 |
| MEAS-0 | only if J12 ships no way to set the flag: `--flags campusV2=...` on `level-measure.mjs` | 1 | ~50 | Sonnet | C11 enabler |
| EXIT-<N> | measured values written by `level-measure --write`, `--require-measured` pass, route-runs log, walk card text | 2 each | graph only | lead | C11, C14, C15 at exit |
| SW-<N> | switch-on (section 9) | 1 each | ~300 | lead | - |

About 120 h of lane work in all. Order (full burn, RULES "A job"): the five lanes run at once now (S1, S2, S3, S4, S5 G /
P slices); inside a lane, slices run in the brief's order. TAG-<N> starts when #317 is on master and that section's guard
slice is merged. E2E-1 starts when P0 is on master; E2E-2 when two sections' guard PRs are on master (it grows per
section). EXIT-<N> when J12 and J13 are on master. C13 (warehouseOps) is closed by Q26: no slice.

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
| 8 | Darkness: vantage / dark spot stays under suspicious for a patrol cycle; a lit pool on a route is noticed; cutting its circuit makes it safe and lures | unit: `LightField` level at each graph vantage and hide spot (recorded; asserted dark only where there is no fitting or an occluder, A19); e2e: E2E-2 per section, one vantage, one lit pool, one circuit cut with its lure | lane (unit); E2E-2 |
| 9 | Noise: each planned loud floor draws the planned guard above silent speed, not at it | E2E-2, one loud floor per section from the detail doc | E2E-2 |
| 10 | Patrols: on nav, cycles in scale sheet 10, every guard covers his route | lane guard tests (cycle formula of `tests/campusS1.test.ts:168-192`, 25-45 s) | lane |
| 11 | Every guard spawned at start alive; a ghost run earns every section-rating bonus; a body left on a route is found | TAG tests (spawned counts at 1-4); E2E-2: alive count at section load per section (2 and 4 players), one ghost section clear with the rating bonuses, one body left on a patrol route found | TAG; E2E-2 |
| 12 | Co-op routes work host and client; lips out of solo reach; a downed player on each co-op surface is revived; solo completes past every team door | lane lip tests (`soloJumpThreats`, rules 1-5); lane solo-route test: an `analyticNav` path start to objective and exit avoiding every pair gate, far-side bolt and co-op link; E2E-2 co-op: one co-op route per section host + client, one revive on a co-op surface per section | lane; E2E-2 |
| 13 | Perf budgets on desktop | J21 line (Q4 60 fps) on the laptop, all five on | exit, after J21 |

## 8. Greybox exit per section (RULES Intake 5, G289, G330; BRIEF A3)

1. Lane PRs merged dark; validator 0 ERR (section 4).
2. MEAS: `node scripts/level-measure.mjs docs/sector-redesign/graph/campusOps-S<N>.json --write` with the section's flag set
   (J12's flag argument or MEAS-0), then `node scripts/level-validate.mjs <the five files> --require-measured`: 0 ERR.
   A measured miss: the lead's fix round (Opus), never a target edited to pass.
3. Route-runs (J13) on every declared route of the section: no dead stop.
4. Section 7 rows green for the section.
5. Walk card line for the orchestrator: `?campusv2=<N>` on `/preview/`, what to try, risks. Offered within the walk cap
   (A10). Suggested offer order: S2 and S4 (the missions), then S1, S5, S3.

## 9. Switch-on (SW-<N>, lead, after Michael accepts the walk)

Add N to `CAMPUS_V2_ON`; retire `tests/campusS<N>*.test.ts` (the v2 tests become the section's); update
`tests/sectorGuardTags.test.ts` (base count and hash per section; cap assert to A15's form) and `scripts/e2e-sectorops.mjs`
part 6's v1 numbers (S1 8 guards, S2 per floor [3,6,3], S3 16, CR2 probes, walks) to v2; laptop `e2e-sectorops:1` .. `:6`
and part 7 with the section live.

## 10. Checks

- Agent sub-steps: `npm run typecheck:fast` + `npx vitest run tests/campusV2.test.ts tests/campusV2S<N>*.test.ts
  --maxWorkers=2` plus the live campus tests the brief names.
- Laptop per lane PR: `e2e-sectorops:1` .. `:6` (`E2E_GPU=1`): flag off, they prove the live map is unchanged. E2E PRs: their
  own part plus `e2e-sectorops:6`. No lane touches `src/net`, `src/player` or `src/game`, so `e2e-coop` / `e2e-netmove` are
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
