# G4s report: the guard variety sheet (plan, page, CLI)

Branch `feature/gm-g4s` (off feature/guard-models 95288c09). Opus builder, 2026-10-24. Built and unit-tested. No sheet
has been rendered yet: no full bake exists, and the desktop runs no browser or GPU jobs.

## What
- The `sheet` stage of the guard bake (PLAN G4) writes one PNG, `sheet/guard-sheet.png`. Sections, in order:
  - the three bases side by side;
  - the eight open faces in four tones at 1.5 m and 3 m (64 crops);
  - every hair cap on each open base, plus the four hair colours;
  - every kind's outfit with gear off, then the same looks with gear on;
  - helmet on, then knocked off, with the dropped helmet on the floor;
  - the LOD strip, with triangle counts from the bake reports;
  - a Hollowmere night line-up and a night-vision line-up.
  That is 112 tiles on a 2136 x 7766 px sheet.
- Every tile is drawn by the game's own guard runtime, so the sheet shows what the game will draw:
  - `resolveGuardAsset` turns each base's files into a manifest and refuses what the game would refuse;
  - `GuardFigure` sits over a `CharacterRig` at the kind's height (from `ENEMIES`), with the idle pose;
  - `guardVariant`, then the tile's look overrides, then `applyGear` and `guardTints`;
  - the enforcer's `GuardShield`;
  - the knocked-off helmet uses `buildHelmetDropMesh` and is placed by `helmetArc` at rest, in `gearColour`'s helmet hex;
  - LOD is picked by camera distance (`pickLod`), unless the tile forces one by loading only that LOD.
- Light rigs and presets are the Operator Lab's (`labData`). Night vision uses the game's phosphor ramp (`NV_GLSL`,
  with the tube's `postLift`).
- Crops use the game's pixels. A 256 px crop of a 1080p frame at the game camera's FOV (86 deg horizontal at 16:9,
  55.36 deg vertical) is drawn 1:1. The render FOV is `cropFovDeg`, which keeps the same pixels per radian. Body tiles
  use a 50 mm lens, render at 2x and are drawn at half size.

## Files
- `scripts/operators/guardSheetPlan.mjs` (pure). It holds `SHEET` (constants), `kitInfo`, `bakeInputs` / `inputStatus`,
  `sheetPlan`, `lodCaption`, `pickSections`, `layoutSheet`, `sheetArgs`, and the FOV helpers.
- `scripts/operators/guard-sheet.mjs` is the CLI: `--in <bake out dir> --out <png>`, plus `--kit`, `--port`, `--only`,
  `--dry-run`, `--no-build` and `--allow-missing`. It:
  - builds `guards.html` alone through Vite's JS API (no shell, nothing left running);
  - serves the page with the bake dir at `/__guards/`;
  - runs headless Chromium (`e2e-lib` `launchOptions`, `E2E_GPU`-aware, with a warning when software GL);
  - composes the tiles on a canvas and writes the PNG.
  Missing inputs stop it before any browser starts, with exit 1 and the list. A base that the runtime refuses also fails
  the run. Console errors give exit 1, as in Wren's sheet.
- `src/operators/lab/guardSheet.ts` is the page module. It exposes `window.__guards` (`init`, `render(tile)`) and
  `window.__guardsReady`.
- `guards.html` is the page entry.
- `vite.operators.config.ts` (one extra file, needed for the page entry):
  - `guards.html` is the second entry beside `operators.html`;
  - `GUARD_SHEET_ONLY=1` builds the guards page alone into `build/guards-lab/`, so the Lab's build is untouched;
  - `/__guards` is served from `GUARD_SHEET_IN`;
  - `__BUILD_SHA__` is defined.
  The game build (`vite.config.ts`) is unchanged, so neither page is in the game bundle.
- `scripts/operators/guardBakePlan.mjs` changes:
  - the `sheet` job now runs `SHEET_SCRIPT` (`guard-sheet.mjs`) with `--stage sheet --job sheet`;
  - the driver appends `--kit <kit> --out <bake dir>`, and an `--out` that is not a `.png` is the bake dir, so the PNG
    goes to `<out>/sheet/guard-sheet.png`, the job's declared output.
- `tests/guardSheetPlan.test.ts` is new. `tests/guardBakePlan.test.ts`: the sheet job's args contain its id (it used to
  expect `--guards`).

## Decisions assumed (with undo)
- Look context: map `ctcourse` and faction `urban`. Undo: `SHEET.mapId` / `SHEET.faction`.
- Crops are drawn at the game's 1080p pixel density, 1:1, which is honest but small. Undo: raise `SHEET.cropPx` (the FOV
  follows) or draw larger.
- Face crops use one fixed hair (`crop`, `darkbrown`) and no headwear or eyewear, so only head and tone vary. Undo:
  `SHEET.faceHair`.
- Each base's reference kind is its first kind in kit order: average is grunt, lean is runner, broad is heavy. Faces,
  hair, helmet and LOD tiles use it.
- "Every kind's outfit" and "gear on" use look seed 0, one figure per kind. A multi-seed variety line-up is G8's job.
- Preset `high` (MSAA 4, bloom, no SSAO), pose `idle`. The `figure` rig is used for all daylight tiles, and there is no
  studio environment map (the game uses its own probe). Undo: `SHEET.preset`, `SHEET.rig`.
- The LOD strip forces each LOD at the same 4.5 m framing. Each label gives buffer tris and the reference kind's shown
  tris. The shield's three counts go in the section note, because the game draws shield LOD1 at every distance.
- Night vision is an approximation: the game's phosphor ramp over the tone-mapped image, with `postLift`, and without the
  lighting's `VISION_GAIN`. The tile caption says so.
- Every input is required: the base GLBs, `guard-<base>.json`, the reports, and the shield GLBs and report.
  `--allow-missing` draws what exists. A missing report alone only blanks that base's LOD counts.

## Tests (run one at a time, desktop)
- `npx vitest run tests/guardSheetPlan.test.ts`: 21 passed. Covered:
  - camera maths (the game FOV against `CAMERA.fov` / `vfovFor`, crop pixel density, body and line-up framing, every
    non-forced figure inside LOD0);
  - kit reading;
  - every section's tiles, looks, gear, drops and forced LODs;
  - every kind and look id checked against `ENEMIES` and gearMask's contract lists;
  - LOD captions from a report;
  - partial-bake skips;
  - layout (inside the sheet, no overlaps, one head per row, a base's three LODs on one row);
  - `--only`, the input list, the CLI args, and the bake job wiring (its PNG lands on the job's declared output).
- `npx vitest run tests/guardBakePlan.test.ts`: 38 passed. `tests/guardAssets.test.ts`: 4 passed, 3 skipped.
- `npx tsc --noEmit -p .` is clean. `npx eslint` is clean on `guardSheet.ts` and both test files. The eslint config
  ignores `scripts/**/*.mjs` and `vite.operators.config.ts`, so `node --check` stands in for `guard-sheet.mjs`, and it
  passes.
- `vite.operators.config.ts` loads in both modes (`loadConfigFromFile`):
  - plain: `build/operators-lab`, both entries;
  - `GUARD_SHEET_ONLY=1`: `build/guards-lab`, guards only.
- Dry run on the desktop smoke (`C:/NightShift/scratch/guard-bake-g4smoke`): prints all 112 tiles in 8 sections, then
  "4 of 19 inputs present". Missing:
  - `guard-average.json` (the smoke predates the B1 fix);
  - lean and broad (GLBs, JSON, report);
  - the shield (GLBs, report).
  It exits 1. The average LOD captions read 7,078 / 2,791 / 1,021 buffer tris from the smoke report. A non-dry run on the
  same dir exits 1 before any build or browser starts.

## How the laptop runs it
- As the bake's last step (Test Runner, alone request, after `check` passes):
  `node scripts/operators/guard-bake.mjs --stage sheet --out <bake dir>`. The job sets `E2E_GPU=1` and `E2E_PORT=4189`.
- Standalone:
  `E2E_GPU=1 node scripts/operators/guard-sheet.mjs --in <bake dir> --out <png> [--port 4189] [--only faces,hair]`.
  Free port 4189 before and after (CLAUDE.md "Commands").
- Interactive look (Michael):
  - `GUARD_SHEET_IN=<bake dir> npm run operators`, then open `/guards.html`. The page loads the bake and shows its status
    line;
  - tiles are drawn from the console with `__guards.render(tile)`.

## Open items
- Never rendered: the first laptop run is also the first Vite build of `guards.html` and the first draw of every tile.
  Expect one fix round for things only a GPU run shows:
  - camera framing;
  - the face target (the rig's head node);
  - whether the shield loads in time (5 s settle);
  - the drop orientation;
  - the night-vision look.
- `guardAssets.ts` and `guardShield.ts` reach `runtime/assets.ts`, whose eager glob lists Wren's play LODs. Vite may copy
  those files into `build/guards-lab/`, which costs build time, not correctness.
- Sheet size: a 2136 x ~7800 PNG, likely 10-20 MB. If that is too heavy for the `bake/guard-models` push, split it per
  section (`--only`) or add a WebP copy.
- G8's look check (thermal, the 24-guard line-up, before / after a restart) is not on this sheet, by PLAN.
- `SHEET_FILES` (the sheet hash) does not cover `vite.operators.config.ts` or the runtime files the page imports, so a
  runtime-only change does not re-run the sheet stage. After a figure change, delete the bake dir's `sheet.hash`, or
  extend `SHEET_FILES` in G9.
