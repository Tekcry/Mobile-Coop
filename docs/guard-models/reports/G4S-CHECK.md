# G4s check: the guard variety sheet

Fresh Opus checker, 2026-10-24. Branch `feature/gm-g4s` at 98a85e1f, base feature/guard-models 95288c09. Read: the
preamble, PLAN G4 (sheet bullet), G4S-REPORT, the full diff, Wren's `scripts/operator-sheet.mjs`, the G4 bake
(`guard-lods.mjs`, `guardLodReport.mjs`, `guard-bake.mjs`, `guardBakePlan.mjs`) and the game runtime
(`guardAssets.ts`, `guardFigure.ts`, `gearMask.ts`, `guardVariant.ts`, `ai/guardBody.ts`, `ai/guardShield.ts`,
`ai/guardHelmet.ts`, `ai/helmetDrops.ts`, `lab/ktx2.ts`).

## Verdict: PASS

No blockers. Six polish items below. P1 (the sheet hash) should go in before or with the laptop framing pass.

## 1. Will it run on the laptop
- Driver wiring holds. `guard-bake.mjs:106-108` runs node jobs as `--import ts-resolve.mjs <script> ...job.args --kit <kit>
  --out <outDir>`. The sheet job's args are `--stage sheet --job sheet`. `sheetArgs` accepts and drops `--stage` and
  `--job`, and treats a non-`.png` `--out` as the bake dir. The PNG goes to `<out>/sheet/guard-sheet.png`, the job's
  declared output. The driver form parses: the dry run with exactly those args prints the plan.
- The inputs match the G4 bake exactly. These paths are the same as `guardBakePlan.mjs:329,335` outputs and
  `guardLodReport.mjs:13,15`:
  - `lods/guard-<base>-lod0..2.glb`, `lods/guard-<base>.json`, `lods/guard-<base>.report.json`;
  - `lods/guard-shield_riot-lod0..2.glb` and its report.

  `lodCaption` reads `report.lods[n].bufferTris` / `.shownTris[kind]`, and that is the report shape (`guardLodReport.mjs`
  around lines 88-112). The page-side names match `resolveGuardAsset` / `resolveShieldUrls`, which match by basename.
- Headless only, through `e2e-lib` `launchOptions()` (headless unless `E2E_HEADED`, which the runner refuses). It is
  `E2E_GPU`-aware and warns on software GL. The page has no pointer-lock or input code. Port: `--port`, else
  `E2E_PORT`, else 4189, and the job env sets `E2E_GPU=1 E2E_PORT=4189`. Vite runs through the JS API (build, then
  `preview` with strictPort), and `finally` closes the browser and server. Unlike Wren's sheet, it leaves no `npx`
  child behind.
- KTX2: the runtime's `loadModel` / `figure.ts:229` calls `ktx2Setup` itself, so the page needs no extra decoder setup.
  All URLs are same-origin `/__guards/`.
- Build defines and virtual modules: every define in `src` (`__APP_VERSION__`, `__BUILD_TIME__`, `__BUILD_SHA__`,
  `__PREVIEW__`, `__PREVIEW_ID__`) is in `vite.operators.config.ts`. `virtual:pwa-register` is stubbed.
- `vite.config.ts` is untouched, and the game build has no `guards.html` input, so the game bundle does not change.
  Wren's Lab build does change: see P2. The change is additive, not a break.

## 2. Same runtime as the game
Yes, not a parallel loader. `guardSheet.ts` does what `ai/guardBody.ts` does, step for step:
- `resolveGuardAsset` on the bake files (`guardAsset` uses the same function on the build glob);
- `new GuardFigure(guardLibrary(scene), rig, m, name, { scale: def.height / m.refHeight })`;
- `guardVariant`, then `guardTints(v, kind, faction, {torso, helmet}, tints)`, then `applyGear`, then `setPieces`;
- `loadGameLods()`, and `figure.update(camera)` plus `shield.follow()` every frame;
- the shield's LOD1 URL into `GuardShield`, as `guardShieldFor` does;
- the drop mesh from `buildHelmetDropMesh`, with `helmetDropInstance`, the `guardHelmetDrop` box, `rest = h * 0.45` and
  yaw `atan2(dx, dz)`, as `HelmetDrops.drop` does.

The one gap: `setHeat` and `setFlash` are not called, so the defaults are used. That is right for a review sheet.

## 3. Coverage against PLAN
Everything is planned:
- the 3 bases (1 tile);
- 8 open heads x 4 tones x 1.5 / 3 m (64 crops);
- each open base's hair caps plus the 4 colours (16);
- the 7 kinds with gear off and gear on (7 + 7);
- helmet on / knocked off for each base (6);
- the LOD strip with buffer / shown tris (9), plus shield counts in the note;
- a Hollowmere night line-up and an NV line-up (2).

That makes 112 tiles. **Hollowmere is not a break.** In this repo it is the campaign city and a lighting identity
(design-bible: sodium against moonlight). No map has that id (nothing in `src/world`). PLAN's "Hollowmere night" is
the Lab light rig `labData` `hollowmere` ("Hollowmere night (sodium vs moon)"), the same one Wren's sheet uses, and the
night tile uses it (`guardSheetPlan.mjs:47,284`). `mapId: 'ctcourse'` only salts the look hash in `guardVariant`.
`ctcourse` sets no faction, so the game also falls back to `urban`. The two agree.

## 4. The sheet hash (`SHEET_FILES`)
Polish, not a blocker (P1). Today nothing is wrong: the first laptop run has no `sheet.hash`, and any bake change
re-runs the sheet through `needs` (the check jobs). The risk is a later rerun after a runtime-only change. The driver
would report the sheet as up to date and keep a PNG that no longer shows what the game draws. The fix is one line, and
the report documents a workaround (delete `sheet.hash`), so it does not stop the slice.

## Tests run (one at a time, desktop)
- `npx vitest run tests/guardSheetPlan.test.ts`: 21 passed.
- `npx vitest run tests/guardBakePlan.test.ts`: 38 passed.
- `npx vitest run tests/guardAssets.test.ts`: 4 passed, 3 skipped.
- `npx tsc --noEmit -p .`: clean (exit 0).
- `node scripts/operators/guard-sheet.mjs --in C:/NightShift/scratch/guard-bake-g4smoke --out C:/NightShift/scratch/g4s-check.png --dry-run`:
  - plan: 8 sections, 112 tiles, 2136 x 7766;
  - "4 of 19 inputs present", with the 15 missing ones listed (`guard-average.json`, lean, broad, the shield);
  - exit 1, no PNG written;
  - the driver-form arguments (`--stage sheet --job sheet --kit ... --out <dir> --dry-run`) parse too.

No browser, Vite build, Blender, e2e or full vitest was run.

## Polish
- P1-P3 done (this commit).
- **P1 (do with the framing pass): the sheet hash misses the code the page runs.** `guardBakePlan.mjs:385`
  `SHEET_FILES` covers only the sheet's own four files. Extend it with:
  - `vite.operators.config.ts`;
  - `src/operators/runtime/{guardFigure,guardFigurePlugin,figure,lodPick,manifest,pose}.ts`;
  - `src/operators/guards/{guardAssets,gearMask,guardVariant,guardTints}.ts`;
  - `src/ai/{guardShield,guardHelmet,helmetDrops,enemyDefs,factions}.ts`;
  - `src/player/characterRig.ts`, `src/vfx/nightVision.ts`, `src/operators/lab/labData.ts`.

  `guards.json` is already in through `KIT_FILE`. The existing `arrayContaining` test still holds. Optionally add a test
  that every `SHEET_FILES` entry exists.
- **P2: Wren's Lab build now also builds `guards.html`.** In plain mode, `vite.operators.config.ts:44` gives two entries.
  `npm run operators` and `operators:sheet` now build the guard page too. That changes chunking and build time, and a
  guards-entry build error would fail Wren's sheet. Fix: add the guards entry only when `GUARD_SHEET_ONLY` or
  `GUARD_SHEET_IN` is set, e.g. `input: guardsOnly ? {guards} : guardsRoot ? {operators, guards} : page('operators.html')`.
  The interactive `GUARD_SHEET_IN=<dir> npm run operators` path keeps working.
- **P3: there is no per-tile timeout.** `guard-sheet.mjs:119` `page.evaluate(... render(tile))` and `:101` `__guardsReady`
  have no timeout. A texture that never readies (`scene.whenReadyAsync`) would hang the alone request with the GPU
  held. Wrap each in a `Promise.race` with about 60 s, and record a note or an error on timeout.
- **P4: the night line-up sits on the LOD0 band edge.** The camera is about 7.3 m from the centre, so the outer
  figures are about 7.8 m away, against LOD0 under 8 m. On the laptop run, confirm that the end figures show LOD0, or
  pull in `lineupSpacing`.
- **P5: framing, expected on the first GPU run:**
  - the head target (`rig.headNode` plus no offset may frame the neck);
  - drop orientation;
  - the NV look (no `VISION_GAIN`, already captioned);
  - whether the 5 s shield settle is long enough;
  - the PNG size for the bake push.
- **P6 (minor): `serveDir` containment uses `file.startsWith(dir)`** (`vite.operators.config.ts:22`). A sibling dir with
  the same prefix would pass. Use `path.relative(dir, file)`, rejecting a result that starts with `..` or is absolute.
  This is dev-only, so it is not a real exposure.
