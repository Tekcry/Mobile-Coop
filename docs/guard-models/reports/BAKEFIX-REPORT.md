# BAKEFIX: the first full guard bake's check steps (Opus builder, 2026-10-24)

Branch `feature/gm-bakefix` off feature/guard-models f5c57270 (same code as the bake commit a8ff2d45 for these files).
The full bake (a8ff2d45, "4/8 steps ok") failed steps 2, 3 and 4. All three were check-step faults. The bake outputs
are good: nothing needs a rebake.

## Causes and fixes

### Step 2 `guardBodyCheck.mjs`: ERR_MODULE_NOT_FOUND `src\player\proportions`
- Cause: the script statically imports `guardJoints.mjs`, which imports `src/operators/operatorBody.ts`, which imports
  `'../player/proportions'` with no extension. Node's type stripping loads `.ts` files but does not resolve
  extensionless paths. That needs `scripts/operators/ts-resolve.mjs` (`node --import ./scripts/operators/ts-resolve.mjs`,
  as the script's header and package.json's `operators:*` scripts say). The laptop step ran plain `node`. No file is
  missing or renamed. Reproduced on the desktop with the old file: same error.
- Fix: the script registers the hook itself (`import './ts-resolve.mjs'`). Everything that reaches the TypeScript
  (`guardJoints.mjs`, `src/anim/fingers.ts`) now loads by dynamic `await import()` after the hook is registered.
  check-guards.mjs uses the same pattern. A static import is not enough, because Node resolves the whole static
  graph before any module body runs. Running with the `--import` flag still works (the hook just registers twice).

### Step 4 `guardGarmentCheck.mjs`: ENOENT `...garments\guard-*.json`
- Cause: the step runs through cmd.exe (Node `child_process` `shell: true` on Windows), and cmd.exe passes `*`
  through literally. The CLI then read the pattern as a file name.
- Fix: new `scripts/operators/cliFiles.mjs` `expandFileArgs`. A `*` / `?` in the last path part is matched against
  the folder's entries with node:fs, sorted (no new dependency). A folder argument means every `guard-*.json` in it.
  Plain paths pass through, and duplicates are dropped. A pattern or folder that matches nothing, a missing folder, or
  a wildcard in a folder part exits 2, so a step never passes on zero reports.
- Same check on the other CLIs: `guardBodyCheck.mjs` takes files too. It now uses the same expansion (folder =
  `guard-*-body.json`) and exits 2 when no report is given. Before, it exited 0 with nothing checked.
  `guardHeadCheck.mjs` takes `--out <dir>` and walks `<out>/heads/` itself, so it never had a glob problem.

### Step 3 `guardHeadCheck.mjs`: average-3 / lean-3 albedo 0.546 tile, ~0.50 face island (band 0.55-0.9)
- Cause: by design, not a bug. Variant 3 of both builds is the kit's only `facialHair: "beard"` head (SPEC 7 face
  table: "short beard"). In `guard_skin.py` FACIAL_HAIR, a beard is the stubble shadow plus a strand cover (`cover`
  0.8, dark neutral 0.07) over the `m_beard` area (jaw, chin, upper lip, sideburns, under the jaw). Stubble heads use
  the same area but have no cover, and they pass at 0.643-0.697. Measured on the pushed tiles (bake/guard-models
  ee569eb1, `heads/guard-*-face-albedo.png`, linear):

  | Head | Tile mean | Texels darker than 0.3 |
  | --- | --- | --- |
  | average-1 (clean) | 0.692 | 0.7 % |
  | average-2 (stubble) | 0.653 | 0.7 % |
  | average-3 (beard) | 0.547 | 22.8 % |
  | lean-3 (beard) | 0.546 | 23.1 % |

  The dark quarter of the tile is the beard strands. The skin around them keeps the same 0.75 neutral as every other
  head. The band exists to catch a wrong skin neutral, because the tone tints divide by 0.75. A beard does not change
  that neutral. No other layer darkens: same base skin, no shadow bake, and tone is applied later through the tint.
- Fix (check only, no recipe change): `guardHeadCheck.mjs` `SKIN_ALBEDO_BY_FACIAL_HAIR = { beard: [0.45, 0.9] }`.
  `skinAlbedoBand(kit, report)` picks the band from the kit head's `facialHair`, else the report's `facialHair`, else
  0.55-0.9. Both the tile and the face-island means use it. The beard heads now have a margin of about 0.045.
- Where the value lives: in the check, not in guards.json as the brief suggested. Every guards.json section other than
  bases / heads / garments / pieces joins every job's kit hash (`guardBakePlan.mjs` normalizeKit `shared`). A head
  entry joins its head, lods and check hashes. Editing `guardBakePlan.mjs` to exclude a new section would rehash
  lods / check / sheet, because the file is in G4_JS. So a check-only number in the kit would rebake about 55 min of
  outputs for no output change. The band still follows the kit data: the kit's `facialHair` picks it, and a test
  pins that the shipped kit's beard heads are exactly average-3 and lean-3.
- Open item for the G10 look pass (not a check matter): the beard is baked into the skin tile, so it takes the skin
  tint, not the hair colour.

## Files
- `scripts/operators/guardBodyCheck.mjs`: self-registers ts-resolve, dynamic imports, file expansion, exit 2 on no
  reports.
- `scripts/operators/guardGarmentCheck.mjs`: file expansion.
- `scripts/operators/guardHeadCheck.mjs`: `SKIN_ALBEDO_BY_FACIAL_HAIR`, `skinAlbedoBand`.
- `scripts/operators/cliFiles.mjs` (new): `expandFileArgs`, `globToRegExp`.
- `scripts/operators/README.md`: "Guard bake check steps" (the exact commands).
- `tests/guardGarmentCheck.test.ts`, `tests/guardHeadCheck.test.ts`.
- None of these files is in a bake job hash (guardBakePlan LIBS / file lists), and guards.json is unchanged, so every
  stored job hash stays valid.

## Tests (desktop, one at a time)
- `npx vitest run tests/guardGarmentCheck.test.ts`: 10 passed (5 new: pattern / `?` / plain paths; folder + dedupe +
  dirMatch; no-match / missing folder / wildcard folder errors; the garment CLI spawned with a literal `guard-*.json`
  checks 3 reports and exits 0, or 2 on no match; the body CLI spawned without a loader flag loads the TypeScript and
  exits 2 with "no file matches", not ERR_MODULE_NOT_FOUND).
- `npx vitest run tests/guardHeadCheck.test.ts`: 17 passed (2 new: the beard band passes the a8ff2d45 means while the
  same means fail on stubble / clean heads, a beard floor of 0.45 holds, kit facialHair wins over the report's; the
  shipped kit's beard heads = average-3, lean-3).
- `npx vitest run tests/guardBodyCheck.test.ts`: 11 passed. `npx vitest run tests/guardBakePlan.test.ts`: 38 passed.
- `npx tsc --noEmit -p .`: clean. `npx eslint` on both edited tests: clean.
- CLIs run through cmd.exe (`spawnSync(cmd, { shell: true })`, ComSpec cmd.exe), exactly the laptop's way:
  - body: `guardBodyCheck.mjs --kit scripts/operators/data/guards.json C:/NightShift/scratch/guard-bake-g4smoke/bodies/guard-average-body.json`:
    ok, exit 0 (the old file: ERR_MODULE_NOT_FOUND). The `guard-*-body.json` pattern and the folder form: same.
  - head: `guardHeadCheck.mjs --out C:/NightShift/scratch/guard-bake-g4smoke --kit ... --partial`: all pass, exit 0.
    No variant-3 report exists on the desktop (the bake pushed only PNGs), so a fixture (g4smoke's average-1 report as
    average-3 with the laptop's 0.546 / 0.498) shows: new = all pass. The old file prints the laptop's two FAIL lines.
  - garments: `guardGarmentCheck.mjs C:/NightShift/scratch/guard-bake-g4smoke/garments/guard-*.json`: 2 ok, exit 0.
    `C:/NightShift/scratch/guard-bake-g2/garments` (folder): 4 reports read. Boots / jacket FAIL there, which is
    expected: these are the pre-fix G2 outputs STATE already flags.
- No Blender run: no recipe or bake script changed.

## Laptop: rerun the three steps (repo root, plain node, cmd.exe is fine; out dir as in the bake)
```
node scripts/operators/guardBodyCheck.mjs --kit scripts/operators/data/guards.json C:/NightShift/scratch/guard-bake/bodies/guard-*-body.json
node scripts/operators/guardHeadCheck.mjs --out C:/NightShift/scratch/guard-bake --kit scripts/operators/data/guards.json
node scripts/operators/guardGarmentCheck.mjs C:/NightShift/scratch/guard-bake/garments/guard-*.json
```
Step 2's existing form with named files (`.../bodies/guard-average-body.json .../guard-lean-body.json
.../guard-broad-body.json`) works unchanged. These are check steps only: rerun them on this branch's head against the
existing a8ff2d45 outputs. No bake stage needs to rerun.
