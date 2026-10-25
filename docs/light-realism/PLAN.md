# light-realism - PLAN

Owner: Night Shift | Sector Ops Build. Status: revision 1 (plan check 1 FIX, 4 items), for a fresh Opus plan checker (RULES Intake 4). Read with
`BRIEF.md` (Michael's words, A1-A13) and `research/bands.md` (the band table and the lux curve). Citations are
origin/master 2148ec96 unless a branch is named.

## Order and sizes
| Slice | What | Size (changed lines) | Model | Runs after | Gate |
| --- | --- | --- | --- | --- | --- |
| L0 | One lux calibration: the curve module, the reference test against a real fitting (Q3), a per-map lux grid tool, the GPU shots tool, the write-up | ~1,150 | Opus | plan checker | Opus checker; GPU "before" shots |
| L1 | S1 car park: fix the light point, add the missing column row, tune to the band, re-bake, measure; the one-page `SIGNOFF.md` | ~450 code + ~350 docs | Opus | L0 | Opus checker + laptop suites; **Michael's click on SIGNOFF.md** before train-ready |
| L2 | S1's other spaces, then S2, S3, S4, S5 to their bands, with their dark pockets (one PR each) | ~300-700 each | Opus briefs, Sonnet builds | L1 click (L2-S1 also after L1 merges) | Opus checker per batch + laptop suites |
| L3 | Dark pockets on the other live maps: base warehouse (W); hand-offs to Marlow, Campaign and campus v2 (H) | W ~250; H ~150 docs | W Sonnet; H Opus | L1 click | W Opus checker + `--affected --wide` |
| L4 | Parity cards per map for the every-release check (Q27), handed to J11 | ~200 | Sonnet from an Opus brief | L2 measures | Opus checker |
| L5 | Docs: level-design 5.5, scale sheet 9, lighting.md, SPEC band lines | ~150 | Opus | L1 click | docs checker |

Parallel after the click: L2-S2..S5, L3-W, L3-H and L5 at once (no shared files); L2-S1 after L1 merges (same file);
L4 last. Whole job ~4,000 changed lines over ~10 PRs, each under ~1.5k.

## 0. What the S1 probe shows (the cause, measured)
CONFORMANCE L3: at y 1.0 the car park's mean is 0.282, 52% of the floor dark, 0% lit; the lamps add a mean 0.033 where
the formula without visibility gives 0.39-0.50. The cause, found for this plan:
- Each column lamp sits on the axis of its own pole, at the pole's top: `b.pillar(x, z, 0.15, 6.0)` then
  `lamp(b, x, 6.0, z, ...)` (`src/world/maps/campusS1.ts:232-233`, `:236-237`; the lane floodlight the same at
  `:222-223`).
- The bake grows every solid by half a cell (`occupancyShapes(job.shapes, c * 0.5)`, `src/voxel/lampBake.ts:163`;
  `LAMP_CELL` 0.2, `:16`), so the pole's occupancy is ~0.4 m across and reaches the light point. The visibility march
  from each cell to the light stops only `NEAR_LIGHT` 0.25 m short of it (`lampBake.ts:25`, the loop at `:263-275`), and
  each column has one sample point (fixture 0.6 m, `SAMPLE_SPACING` 0.5, `:22`, `lampSamples` `:113-128`). Every ray
  steeper than ~53 degrees from straight down is still inside the pole 0.25 m from the light: the pole hides its lamp
  from everything within ~6.7 m of its foot at y 1.0, which covers most of a 6 m x 9 m column grid.
- The test that would catch it exempts these lamps by name: `ON_ITS_POST` "floodlight at the top of its 6.0 m pole"
  (`tests/lampBoxAlign.test.ts:206-208`).
- Probe run for this plan (s1Grid.ts on master's src in a scratch copy, CPU only, bake 141 s): moving the 14 light
  points 0.8 m off the pole axis (an outreach arm) lifts the lamps' mean at y 1.0 from 0.033 to 0.196 and the field
  mean from 0.282 to 0.499 (dark 52% -> 31%, lit 0% -> 45%); under a column the lamps' share goes 0.079 -> 0.447 against
  0.502 on paper. Lifting them 0.6 m straight up only reaches 0.128 (the pole still hides its own foot).
- Second gap, not the bake: the two south bay rows (cars at z -73.75 and -69.25, `campusS1.ts:137`) have no column. The
  cone (1.15 rad, `:230`) on a 6 m pole reaches ~11 m, and the nearest row is at z -62: (-25, -68) gets 0.03 from the
  lamps, (-25, -75) none, in every variant. A third of the car park is unlit by layout, which G329 forbids.
- After the arm fix the mean (0.499) reads ~4.8 lx on the curve; the P11a band (A5) needs 14 lx (0.65). L1 adds the
  south row and tunes the columns to the band.

## Claims (whole job)
```claims
files:
  - src/world/lux.ts
  - src/world/maps/campusS{1,2,3,4,5}.ts
  - src/world/maps/warehouse.ts
  - tests/lux.test.ts
  - tests/campusS{1,2,3,4,5}.test.ts
  - tests/campusS2Board.test.ts
  - tests/campusS4NocSight.test.ts
  - tests/lampBoxAlign.test.ts
  - tests/warehouseLamps.test.ts
  - tests/parityCards.test.ts
  - scripts/light-realism/**
  - scripts/e2e-darkness.mjs
  - docs/light-realism/**
  - docs/level-design.md
  - docs/design/scale-sheet.md
  - docs/systems/lighting.md
  - docs/sector-redesign/SPEC.md
maps: campusOps, warehouse
protocol: none
save: none
```
The other light tests each PR runs (`sectionBakeCampus`, `lampGridLossless`, `lampAtlasFit`, `campusArtLight`,
`guardRelight`, `enemyLightsOut`) are run, not edited; a slice that has to edit one adds it to this block and reruns
claims-check before it starts.

**Overlaps and order** (2026-10-25: `node scripts/claims-check.mjs --plan docs/light-realism/PLAN.md --name
feature/light-realism` gives 4; branches with no claims block found by `git diff --name-only origin/master...<b>` over
origin/feature/* changed in 7 days). For the orchestrator to order; the proposal is the first named lands first:
- **feature/coop4** and its slice branches coop4-data, -doc, -e2eai, -pol, -ui2 (no claims block): edit
  `tests/campusS1.test.ts`-`campusS5.test.ts`, which L1 (S1) and L2-S1..S5 edit. Proposed: coop4 first; L1 and each
  L2-S<N> cut from master after coop4 merges, or rebase on it before train-ready.
- **The mission-engine branches** (mission-engine, -en4, -flg, -engine-flg-gb6, -gb1..-gb6, -net2..-net4, -pol1;
  tallow-design-docs; no claims block): edit `tests/campusS1.test.ts`. Proposed: whichever is on master first; L1's
  edits are its column tests (`:424-439`) and one new test, so a later L1 rebases.
- **feature/map-ready** (claims-check): `docs/systems/lighting.md` ("Per-section lamp bake") and maps campusOps,
  warehouse (load and warm-up, no lamp change). Proposed: map-ready first; L5's "Lux" section is a separate section;
  L2 and L3-W bake times are measured on top of it.
- **feature/guard-rules** (claims-check): map campusOps, through `campusS4Data.ts` / `campusS5Data.ts` (guard posts,
  not lamps). Proposed: guard-rules first; the L2-S4 and L2-S5 briefs read its posts for their route tables (brighter
  rooms change what those posts see).
- **feature/coop-kit** (claims-check: `docs/design/scale-sheet.md` band rows, `docs/level-design.md` 12.1),
  **feature/route-runs-2** (claims-check: `level-design.md` 14-15), and with no claims block doc-polish*, doc-level,
  level-validator-v6*, mission-validator*, level-standard-g157, fold-j2 (`level-design.md`, `scale-sheet.md`,
  `lighting.md`), gm-*, player-batch-25*, guard-cap-m2 (`lighting.md`): other sections. Proposed: all first; L5 (5.5,
  scale sheet 9, a new "Lux" section) is cut from master when it starts and rebases on whatever has landed.
- **feature/sector-ops-docs** / sector-ops-docfix (PR #433, J1): `docs/sector-redesign/SPEC.md`, `lighting.md`:
  already ordered, #433 first (Ownership below).

- **Maps**: campusOps v1 (all five sections), warehouse (base). Not touched: campusV2 files (J17), warehouseOps and its
  files (`warehouseOps.ts`, `warehouseS1.ts`-`warehouseS3.ts`; frozen, A1), ctcourse and its sets (Marlow Build),
  Tallow (Campaign). The base warehouse strips do not reach warehouseOps: it builds with `storageHall: false,
  assemblyHall: false` (`src/world/maps/warehouseOps.ts:64-71`), which skips every base strip
  (`src/world/maps/warehouse.ts:433-434`).
- **warehouseOps is frozen (Q26)**: touched only where Q2 "every light works" forces a light fix. Which: none. Its
  dead fittings (intensity 0, `warehouseS1.ts:62`, `warehouseS3.ts:124-131`) stay, because Q26 "Freeze it" (~16:50)
  is the later pick for that map (A1); no slice reaches it through shared code (L3-W's strips skip it, above). If
  Michael re-opens warehouseOps, its fix is those dead fittings and nothing else (A1's undo).
- **Train light-parity check (Test Runner J20)**: `e2e-darkness` (`scripts/e2e-darkness.mjs`, warehouse, Epic: cards
  at levels 0.12 / 0.27 / 0.40 / 0.70 against bible L5's pixel targets) is the train's light-parity check until
  J11's per-map parity cards (L4) replace it. Off switch: `config/train-parity.json` on the laptop-queue branch (J20
  adds it; not on origin/laptop-queue at this plan's check). Every L-slice that changes light keeps e2e-darkness
  green, or updates its cards in the same slice: in practice L3-W (the base warehouse is its map); campus slices list
  it in their e2e run as a guard.
- **Save paths**: none. **Wire paths**: none. Lamp ids are build-order indices (`LightRegistry`), the same on host and
  client for the same build; adding lamps shifts later ids within a build only. Tests keyed by id:
  `tests/lampBoxAlign.test.ts:206-218` (updated in L1 / L2-S1). `PROTOCOL_VERSION` untouched.
- **Flag**: none (BRIEF A11; G355 rule fix). PRs that change a shipped look stay off the train until Michael's click
  on the S1 sign-off (`SIGNOFF.md`).
- **Engine**: no change to `src/voxel/lampBake.ts`, `src/world/lightField.ts`, `lampMath.ts` or `darkCurve.ts`. The
  curve module (L0) is measurement only: imported by scripts and tests (and later the validator, J12), never by
  gameplay or rendering.
- **Ownership**: one file in one open slice at a time. `campusS1.ts`: L1 then L2-S1. `docs/sector-redesign/SPEC.md`:
  PR #433 (J1, feature/sector-ops-docs) rewrites its lighting rules and retires A23 (CONFORMANCE L12) first; L2 PRs
  only replace each section's band line after #433 is on master.
- **Machines**: probes run on the desktop CPU (node, no GPU; each S1 bake ~2.5 min single thread, `--cpu-max` gate in
  the tool). Every GPU shot, meter read and look video runs on the laptop queue alone slot:
  `node scripts/laptop-queue/request.mjs --sha <full sha> --set <name> --requester "Night Shift | Sector Ops Build" --alone --step "serve scripts/light-realism/<tool>.mjs <args>"`.
  Never a GPU run on the desktop.
- **Measure outputs**: compact JSON (one grid row per line) under `docs/light-realism/measure/`; PNGs and videos on
  `shots/light-realism-<name>` branches (pushed by the tools' `--push`, as `s1-shots.mjs` does), never in the PR.

## L0 - one lux calibration (Opus)
Goal: one curve from engine level to lux, a tool that reads any map's bake in lux per space, and the GPU check that the
picture shows the field it reads.
- `src/world/lux.ts` (new, ~70): `LUX_ANCHORS` (1 lx = 0.28, 10 lx = 0.60, BRIEF A2), `levelToLux`, `luxToLevel`,
  `bandCheck(values, band)` (mean, point min, U0 = min / mean, pass / fail per A4). Pure, Babylon-free.
- `tests/lux.test.ts` (new, ~80): anchors exact; round trip; the night floors read as `research/bands.md` section 2
  (0.104 -> 0.28 lx, 0.14 -> 0.37 lx); clamp at 0 and 1; `bandCheck` on a fixture grid. A grep test that no file under
  `src/game`, `src/ai`, `src/world/lightField.ts` or `src/vfx` imports `lux.ts` (measurement only).
- `scripts/light-realism/luxGrid.ts` + `lux-grid.mjs` (from `s1Grid.ts` / `s1-grid.mjs`, ~350 together, replacing
  them): any map id; space rectangles, space type, plane and band from `docs/light-realism/spaces/<map>.json`; bakes
  only the lamps that reach the spaces (as `s1Grid.ts:58-70` on this branch); samples `LightField.levelAt` at the plane and at y 1.0;
  per space writes level and lux grids, `bandCheck` and an SVG heat map; `--section N` limits to one section's spaces.
  Keeps the CPU wait (`s1-grid.mjs` `--cpu-max`).
- `docs/light-realism/spaces/campusOps.json` (S1 rows now, ~50): the S1 spaces of `S1_ROOMS` (`campusS1.ts:53-56` and
  neighbours) with their bands.
- `scripts/light-realism/shots.mjs` (from `s1-shots.mjs`, ~+150): views and meter points from the spaces file per
  section; Low and Epic; adds `--video <s>` (a scripted fly-through recorded headless, for each PR's look video).
- **The reference test (Q3: "one test that matches the game's brightness to real light units")**,
  `scripts/light-realism/calibrate.ts` (~120) with its result in `measure/calibration.md`:
  - One real fitting: a 6 m single-arm LED car-park column of the kind L1 builds (outreach arm, flat glass,
    roadway / area distribution). Its published photometric data (lumen output, mounting height, peak candela and the
    candela table or the iso-lux diagram) from a maker's datasheet page read by the lead; no file is downloaded or
    bought (A4). Real lux on the ground (horizontal, y 0) at 5 distances from the column's foot along the outreach
    axis, 0, 3, 6, 9 and 12 m: read off the iso-lux diagram, or E = I(theta) x cos^3(theta) / h^2 from the candela table.
  - The same fitting in the engine's lamp terms: one fixed lamp at y 6.0 on a 0.8 m arm, the cone and reach of the S1
    columns, `photoTerm` (`src/world/lampMath.ts:93`) x `LAMP_LEVEL_GAIN` 1.2 (`:41`) x intensity, plus the campus
    night floor (moon 0.104, standby fill 0.14). No bake: open ground, visibility 1. The field the meter reads is
    direction-free (no N.L), so the real side uses horizontal illuminance (the standards' plane, A3).
  - The fit: the one free number is the intensity that stands for the fitting's output (engine intensity per 1,000
    lm). Solve it by least squares on level, with the A2 curve fixed (real lux -> level by `luxToLevel`), then report
    per distance: real lux, engine level, engine lux (`levelToLux`), the error in level and in lux (%), and the RMS
    level error. Also report the free best-fit anchor pair (two anchors + intensity on the 5 points) beside A2.
  - Pass (the anchors are measured): RMS level error <= 0.03 (about 25% in lux on the A2 slope) and every point within
    0.05. Fail, or no published data usable without a download: the anchors stay A2 as a chosen mapping (A13), and
    calibration.md and the S1 sign-off page say so in one plain line with the measured fit error, if any.
  - `tests/lux.test.ts` pins the result: the 5 points as a fixture, the fitted intensity and RMS error within 0.005 of
    calibration.md, so a change to `lampMath.ts` or the anchors that moves the match fails a test.
- `docs/light-realism/measure/calibration.md` (~100): the curve, why log (bands.md 2), the night-floor check, the
  reference test (fitting, source page, the 5-point table, fit error, pass or "chosen, not measured"), the GPU check
  result. Replace `docs/light-realism/measure/s1-grid.json` (3,276 lines) with the compact format.
- GPU: the "before" run at the L0 head (S1, Low + Epic, `--push shots/light-realism-s1`): meter vs field at the named
  points and pixel luma per grid point against bible L5's display targets. A meter-field split over 0.02 or a band
  mismatch goes to J11 (it is their parity triage), not fixed here.
- Tests: `npx vitest run tests/lux.test.ts`; `npm run typecheck:fast`. e2e: none (no game change).
- Done looks like: `node scripts/light-realism/lux-grid.mjs --map campusOps --section 1` prints per-space lux, U0 and
  pass / fail, reproducing CONFORMANCE L3's levels (mean 0.282 at y 1.0); calibration.md has the reference test's
  5-point table with its RMS level error and a one-word verdict ("measured" or "chosen, not measured"), pinned by
  `tests/lux.test.ts`; shots pushed.

## L1 - S1 car park: light point, re-bake, band, sign-off (Opus)
- `src/world/maps/campusS1.ts` (column block `:228-238`, `PARK_COLUMNS_*` `:146-148`, the lane floodlight
  `:220-223`): each column becomes a single-arm column: the pole to 6.0 m, a 0.8 m arm box toward the bays, the light
  point at the arm's end at y 6.0 (BRIEF A6; `campusS1.test.ts:429` keeps y 6.0). A third row of columns on the island
  between the south bay rows (z ~-71.5), on the existing west / east circuits (no new switch; the feeder pillar board
  keeps cutting each half, `:125-133`). Intensity and reach tuned until the car park meets P11a (A5).
- Engine alternative, not taken (A6): skip a lamp's own mount in the march (`lampBake.ts:263`). It changes every map's
  bake and every visual-gate baseline, and loosens the LR16-L rule the test guards; the data fix is local and real.
- `tests/lampBoxAlign.test.ts:206-208`: the 15 `ON_ITS_POST` campusOps entries leave (the light points no longer sit
  over their posts); the bollard entries stay until L2-S1; ids re-keyed if the new row shifts them (`:216-218`).
- `tests/campusS1.test.ts:424-439`: column counts per circuit; a new test: every column's light point is at least
  0.5 m in plan from its own pole's axis and no occupancy cell lies between it and the floor straight below.
- `scripts/light-realism/shots.mjs` and `spaces/campusOps.json`: the new column list (the hand copy in
  `s1-shots.mjs:43` on this branch goes).
- Measure (desktop CPU): `lux-grid.mjs --map campusOps --section 1`. Pass: the car park's mean at the ground 14-35 lx
  (level 0.65-0.77); point minimum 3 lx (0.43) on open ground (cells 0.6 m or more from a car body or column; behind a
  car is a real gap, G329); the remaining dark cells listed with their cause (car, cut, shot) in
  `docs/light-realism/measure/S1-carpark.md`.
- GPU (laptop alone): `shots.mjs` "after" at the PR head, Low + Epic, plus a 90 s `--video`; e2e on the laptop queue:
  `e2e-sectorops e2e-lightbake e2e-levels e2e-anchors e2e-darkness` (the first four: `src/world/` row of `scripts/e2e-affected.mjs`).
- vitest: `tests/campusS1.test.ts tests/lampBoxAlign.test.ts tests/sectionBakeCampus.test.ts
  tests/lampGridLossless.test.ts tests/lampAtlasFit.test.ts tests/campusArtLight.test.ts tests/lux.test.ts` (new lamps
  must fit `LAMP_GRID_SLOTS` 24 per 2 m cell, `lampBake.ts:856-865`).
- **The sign-off: `docs/light-realism/SIGNOFF.md`** (gate 4, `docs/templates/signoff.md`; RULES Intake 5 for a big
  look change). One page, ONE question through the orchestrator as native multiple choice: "Approve the band table
  and the S1 light map?" / "Changes first". The anchors (A2) and the car-park category (A5) are not separate picks:
  the page shows them as what "Changes first" leads to. L1 makes what the page points at, under
  `docs/light-realism/signoff/`: the to-scale light map `s1-lightmap.svg` (scale bar, north arrow, columns, arms,
  circuits, the lux heat map and each remaining gap with its cause), the before / after heat maps, and the draft L5
  text `level-design-5.5.md`; Low and Epic shots and the 90 s video on `shots/light-realism-s1`. L1 fills the page's
  measured numbers and paths. Overnight the recommended answer is assumed and logged (G358); the PR still waits for
  the click before train-ready.
- Done looks like: S1-carpark.md shows the band met; SIGNOFF.md has no unfilled field and every linked file exists;
  the orchestrator has asked the question; Michael's pick is in SIGNOFF.md and ROADMAP "Decided"; then the PR goes
  train-ready and the visual-gate S1 views re-baseline with that click (Q28).

## L2 - the other campus sections (Opus briefs, Sonnet builds; one PR per section)
Per section, an Opus strict brief first (`docs/light-realism/briefs/S<N>.md`): every space with its type, plane and
band; every fitting added or changed; every "dark by reason" space decided by A9 with its reason in the SPEC element
register; for each stealth route that used a dark pocket, the real gap that replaces it (an occluder, a circuit with a
reachable board, a shootable lamp), so every lit chokepoint still has two ways to darken or a route around
(`docs/level-design.md` 5.2). Then Sonnet builds, `lux-grid.mjs --section N` measures, an Opus checker per batch.
| PR | File (lamp block) | Pockets to re-light (A9) | Tests to flip | Size |
| --- | --- | --- | --- | --- |
| L2-S1 | `campusS1.ts` (forecourt bollards `:264-270`, canopy `:152`, `:292`, gatehouse `:214`, yard `:314`, bin store, bike shelter `:249-254`) | bike shelter fitting tagged out (`:249-254`; `lampBoxAlign.test.ts:217`); boost point kept dark by canopy placement (A12; `campusS1.test.ts:473-476`, `:666-671`); bin store; bollard light points 0.05 m inside their posts (`lampBoxAlign.test.ts:208`) | `campusS1.test.ts:461-471` (verge and roofs stay dark: outside the work area), `:473-476`, `:666-671` become band tests | ~350 |
| L2-S2 | `campusS2.ts:568-588` | the cafe (`:194`), open plan, meeting rooms, stairs, comms (`:570`); corridor night lamps 0.25 to the corridor band | `tests/campusS2.test.ts`, `campusS2Board.test.ts` | ~600 |
| L2-S3 | `campusS3.ts:466-482` | lobby and landing, stairs, clean room, store, gas cage, east yard (`:468-470`); EMC room and chamber roof by A9 | `tests/campusS3.test.ts` | ~500 |
| L2-S4 | `campusS4.ts:488-507` | battery room, service and north corridors, riser, hot aisles, build-out area, the compound's north end (`:490-491`) | `tests/campusS4.test.ts`, `campusS4NocSight.test.ts` | ~550 |
| L2-S5 | `campusS5.ts:596-615` | the archive "aisle lights off", drawing room, passage, back corridor, service lobby, plant room, boathouse path, jetty (`:597-598`); lawn and roof by A9 | `tests/campusS5.test.ts` | ~550 |
- Ambient zones stay (A7; `campusS1.ts:318`, `campusS2.ts:586-588`, `campusS3.ts:480-482`, `campusS4.ts:507`,
  `campusS5.ts:614-615`).
- Each PR: `spaces/campusOps.json` rows for its section; `docs/light-realism/measure/campus-S<N>.md`; its SPEC band
  line (after #433); look video via `shots.mjs --video`; the shots "after".
- vitest: the section's tests above plus `lampBoxAlign`, `lampGridLossless`, `lampAtlasFit`, `sectionBakeCampus`,
  `campusArtLight`, `guardRelight`, `enemyLightsOut`. e2e: `e2e-sectorops e2e-lightbake e2e-levels e2e-anchors e2e-darkness`; the
  section bake time measured in `e2e-lightbake` against the S1 22 s line (CONFORMANCE V11).
- Risk: brighter sections make guards see further; the brief's route table is the check, and the checker blocks a
  section whose declared routes lose their last gap.
- Done looks like (each L2-S<N> PR): `node scripts/light-realism/lux-grid.mjs --map campusOps --section <N>` prints
  pass for every space in `spaces/campusOps.json`'s section N rows (mean in band, point minimum or U0 met);
  `measure/campus-S<N>.md` lists every remaining dark cell with its cause (cover, cut, shot, outside the lit site);
  every route in the brief's route table still has at least one gap (occluder, reachable board or shootable lamp),
  each named with its coordinates; the section's tests and e2e green (e2e-darkness included); the look video path in
  the PR body.

## L3 - dark pockets on the other live maps
- **L3-W, base warehouse (Sonnet from an Opus brief, ~250)**: only 14 strips are lights (`warehouse.ts:27-31`
  `LAMPS_ON`); the rest are plain boxes left dark on purpose (`:430`, `:437`; CONFORMANCE L4). Every strip becomes a
  live, shootable light on its room's circuit (`lampGroup`), lit to the warehouse band (100 lx floor, 0.92); stealth
  from racks, cut circuits and shot strips. Tests: `tests/warehouseLamps.test.ts`, `lampBoxAlign`, `lampGridLossless`.
  e2e: the warehouse is the default map of many suites, so `request.mjs --affected --wide` plus `e2e-darkness` (its
  cards pick points by level, `scripts/e2e-darkness.mjs:1-18`: confirm it still finds 0.12 and 0.27 points behind racks
  or under a cut circuit; move the cards in the same PR if not). Spaces file `spaces/warehouse.json`, measure
  `measure/warehouse.md`.
  - Done looks like: no plain `LAMP_OFF` strip box left in `warehouse.ts` (grep); every strip is a `b.light` on its
    room's `lampGroup` and shootable (`warehouseLamps.test.ts`); `lux-grid.mjs --map warehouse` passes every space at
    the 100 lx band; e2e-darkness green with 0.12 and 0.27 cards behind racks or under a cut circuit; the
    `--affected --wide` set green; warehouseOps's bake unchanged (its lamp list identical before and after, by test);
    the look video path in the PR body.
- **L3-H, hand-offs (Opus, docs only, ~150)** in `docs/light-realism/handoff/`:
  - `marlow.md` to Marlow Build: the band table and the curve for its sets (M M10, M V5), and the pockets to re-light
    with live fittings (M H4): A6 west end and sump on tagged-out circuit 69 (`src/world/maps/ctcourseSets/a6PumpHouse.ts:156`,
    `:303`), A8 vestibule and west bays with no fitting (`a8Strongroom.ts:30`), A4 back aisle on dead group 49
    (`a4GoodsShed.ts:365`), A2 coat corner (`a2CarriageShed.ts:15`); regenerate `tests/ctcourse/*.light.json`. Marlow
    stays "lit by default, the players cut it" (G279) on top of the band. Marlow Build re-lights; this job does not.
  - `campus-v2.md` to J17 (feature/campus-greybox): the fixture rule (no light point over its own post; arm heads),
    the band per space type, A9 for "dark by reason"; `campusV2/s1.ts:232-238` copies the v1 column block and has the
    same fault.
  - `tallow.md` to Campaign Build for J8 (C S10), after Michael's review of the 12 level rules (Q1).
  - warehouseOps: none (A1).
  - Done looks like: the three files in `handoff/`, each with the band rows, the curve, the fixture rule and the
    named pockets for its map; each sent to its lead (Marlow Build, J17 through Sector Ops, Campaign Build) and its
    acknowledgement (the lead's reply, or the hand-off named in that job's PLAN or STATE) recorded in this job's STATE.

## L4 - parity cards per map for every release (Sonnet from an Opus brief, ~200; Q27, handed to J11)
From L1-L3's lux grids, per map and section: at least 3 card points (one dark, one mid, one lit, plus 0.27 where a
space has one, CONFORMANCE V5), each away from flicker lamps (V8), at Low and Epic (V3).
`docs/light-realism/parity/<map>.json` + `docs/light-realism/parity/README.md` (how a card is read: field band vs pixel
band, bible L5 targets). J11 builds the required GPU suite from it (CONFORMANCE L8, V4, V6) and runs it every release.
Also to the visual-gate owner: floor and whole-mean minimums on campus lit spaces (CONFORMANCE V7) from the same
files. Tests: a JSON shape test `tests/parityCards.test.ts` (points inside the map's spaces, bands consistent with the
grid). e2e: none here.
- Done looks like: one `parity/<map>.json` for campusOps and warehouse, each section with at least a dark, a mid and a
  lit card at Low and Epic, none within a flicker lamp's reach; `npx vitest run tests/parityCards.test.ts` green; the
  hand-off to J11 recorded in STATE with J11's acknowledgement.

## L5 - docs (Opus; only with Michael's approval, given by his click on SIGNOFF.md)
`docs/level-design.md` 5.5 (`:166-173`): drop the interim rule, cite the curve and the band table, the planes (A3).
`docs/design/scale-sheet.md` section 9 (`:168-190`): fill Min / Max lux, add the level column and the curve, retire
"After-hours interior (lights off)" (A10). `docs/systems/lighting.md`: a short "Lux" section (the curve, the tool).
`docs/sector-redesign/SPEC.md` band lines not already done in L2. The level standard and the scale sheet change only
with Michael's approval (CLAUDE.md hard rule): L5 opens after the click, with SIGNOFF.md linked in its body. Engine
facts in level-design 12 are not changed (no engine change). The orchestrator folds his answers into DECISIONS.
- Done looks like: the docs PR body links SIGNOFF.md with Michael's pick and its time; level-design 5.5 and scale
  sheet 9 carry the band table's values and the curve with no "to verify" value that Michael's pick did not cover;
  the "After-hours interior (lights off)" row is gone; `lighting.md` has the "Lux" section; a grep of the SPEC finds
  no section without its band line.

## Checks per PR (summary)
| PR | vitest | e2e (laptop queue) | GPU alone |
| --- | --- | --- | --- |
| L0 | lux (+ the reference test fixture) | none | S1 before shots |
| L1 | campusS1, lampBoxAlign, sectionBakeCampus, lampGridLossless, lampAtlasFit, campusArtLight, lux | e2e-sectorops, e2e-lightbake, e2e-levels, e2e-anchors, e2e-darkness | S1 after shots + video |
| L2-S<N> | campusS<N> (+ board / sight files), lampBoxAlign, lampGridLossless, lampAtlasFit, sectionBakeCampus, campusArtLight, guardRelight, enemyLightsOut | as L1 | section shots + video |
| L3-W | warehouseLamps, lampBoxAlign, lampGridLossless | `--affected --wide`, e2e-darkness | warehouse shots + video |
| L4 | parityCards | none | none |
| L5 | none (docs) | none | none |

## Done (the job)
Every campusOps v1 space and the base warehouse measured in lux and inside its band, written per section under
`measure/`; no dead fitting and no "dark by reason" space left inside a lit site on those maps; scale sheet 9 and
level-design 5.5 filled with Michael's approval; parity cards handed to J11; Marlow, Campaign and v2 hand-offs sent.
The last PR carries `Job-done: light-realism`.
