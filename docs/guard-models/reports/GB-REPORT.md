# GB report: guard bake driver

## What
`scripts/operators/guard-bake.mjs` (CLI) + `scripts/operators/guardBakePlan.mjs` (pure) + `tests/guardBakePlan.test.ts`
+ `npm run operators:guard-bake`. No Blender was run (the desktop has 5.2.2, `--probe` finds it; no stage was run).

## CLI
- `--probe`: Blender (findBlender, version), toktx (KTX_BIN, existence), MPFB2 zip (`MPFB2_ZIP`, else the C:/NightShift/downloads
  default), cores, default par, kit file present or not. Exit 1 if Blender, toktx or the zip is missing.
- `--stage <name> [--only a,b] [--par N] [--out dir] [--kit file] [--dry-run] [--push [--remote name]]`.
  Default `--par`: 6 when the machine has >= 20 cores (laptop), else 2 (desktop fallback; run it under heavy.lock yourself);
  `GUARD_BAKE_PAR` overrides. Default out `C:/NightShift/scratch/guard-bake`.
- Per job: input hash vs `<out>/<job>.hash` (and every declared output present) -> skip; else `blender -b --factory-startup -noaudio
  --python-exit-code 1 --python py/<script> -- --seed S <args> --kit <guards.json> --out <out>`, windowsHide, BelowNormal via
  `os.setPriority`, log `<out>/logs/<job>.log`, hash written only on success (the old hash is deleted when the job starts).
  A job that exits 0 but did not write a declared output fails. Per-stage summary `<out>/logs/stage-<stage>.json`. Exit 1 if any job fails.
- Missing script, or an upstream job with no stored hash, fails that job with a clear message (other jobs go on). `--dry-run` prints
  status per job (run / skip / blocked + reason) and the wave schedule; it runs nothing and, if guards.json is absent, plans from the id
  contract (`contractKit()`) with a warning. A real run without guards.json fails.
- `--only` matches a job id, the id without its stage prefix, or a tag (base, head variant, garment, piece); a name that matches nothing is an error.
- `--push`: after a successful stage, the stage's `*.glb *.ktx2 *.png *.report.json` under `<out>/<stage>/` go to `bake/guard-models`
  by plumbing (temp index, hash-object, update-index, write-tree, commit-tree; base origin/bake/guard-models else orphan; accumulates
  across stages; no commit when the tree is unchanged; push retried 3x with refetch). Working tree, index and HEAD untouched.
  Verified against a scratch bare repo (orphan, accumulate, no-op repeat, working tree clean); the real branch was not pushed to.

## Job contract (what the py slices must follow)
Id / script / args (the driver appends `--kit <file> --out <dir>`; outputs relative to `--out`):
| stage | job id | script | args | needs | outputs |
| --- | --- | --- | --- | --- | --- |
| bodies | `bodies-<base>` | `build_body.py` | `--stage bodies --job <id> --base <b>` | - | `bodies/guard-<b>-body.{blend,json}` |
| heads (gpu) | `heads-<variant>` | `build_head.py` | `--base <b> --head <v>` | - | `heads/guard-<v>-head.{blend,json}` |
| garments | `garments-<b>-<g>` | `garments/<g>.py` (default list below) | `--base <b> --garment <g>` | `bodies-<b>` | `garments/guard-<b>-<g>.{blend,json}` |
| gear | `gear-<b>-<piece>`; `gear-shield_riot` once | `rigid_skin.py` unless the kit piece has `script` | `--base <b> --piece <p>` (shield: `--piece` only) | - | `gear/guard-<b>-<p>.{blend,json}` |
| lods (gpu) | `lods-<b>`; `lods-shield_riot` | `bake_lods.py` | `--guard --base <b>` / `--guard --piece shield_riot` | bodies, that base's heads, garments, gear (shield: its gear) | `lods/guard-<b>-lod{0,1,2}.glb`, `lods/guard-<b>.report.json` |
| check | `check-<b>`; `check-shield_riot` | `check_guard.py` | `--base <b>` | `lods-<b>` | `check/guard-<b>.check.report.json` |
| sheet (gpu) | `sheet` | node `scripts/operator-sheet.mjs` (env `E2E_GPU=1 E2E_PORT=4189`) | `--guards` (driver adds `--kit --out`; run with `--import ts-resolve.mjs`) | all checks | `sheet/guard-sheet.png` |
Every job also gets `--stage <s> --job <id>` first. Argparse scripts must accept `--kit` and `--out`.
Hashes also cover: the script file, shared libs per stage (`LIBS` in guardBakePlan.mjs), the job's kit slice (its entry + every non-entity kit section such as budgets, so a shared change rebakes all and one base's change rebakes only that base), args, env, upstream jobs' stored hashes.

## Decisions I assumed
- guards.json shape is unknown (G0 in parallel): `normalizeKit` reads `bases`, `heads` (each with `base`, else id prefix), `garments` (optional; default shirt `garments/combat_shirt.py`, trousers, boots, gloves, jacket `garments/field_jacket.py` on `average`), `pieces` (list, keyed object, or groups like `{headwear:[..], gear:[..]}`; `gear` accepted as the key), each entry a string or object with `id`, optional `script`, `perBase:false`. A piece with its own GLB (`shield_riot`, or `perBase:false`) is one gear job, one lods job and one check job, not one per base. Everything else in the kit is "shared". If G0's file differs, change `normalizeKit` only.
- Fixture counts: bodies 3, heads 9, garments 13, gear 16 x 3 + 1 = 49, lods 4, check 4, sheet 1.
- `ktx2.mjs` does not export `KTX_BIN`; the driver repeats its default and `KTX_BIN` override. Not edited (not my file).
- Kinds / ids: contract ids used as given; I did not check `src/config/enemies.json` (no kind strings in the driver).

## Tests
`npx vitest run tests/guardBakePlan.test.ts`: 27 passed. `tsc --noEmit -p .`: clean. eslint: test file clean (`scripts/**/*.mjs` is in eslint's ignore list).
Also ran `--probe` (exit 0 on the desktop: Blender 5.2.2, toktx, MPFB2 zip all present) and `--stage heads --dry-run` (9 jobs, all blocked: `build_head.py` absent). `runAll` was exercised with throwaway node jobs (caps, logs, hashes, failure exit).

## Open items
- No KTX2 step: bake_lods.py writes PNG sets; G4 must either encode KTX2 inside the lods job or add a post-step (toktx + `repackGlb` from ktx2.mjs) to the driver. `*.ktx2` is already on the shippable list.
- bodies needs `joints.json` (export-joints.mjs, needs `--import ts-resolve.mjs`); G1 should read joints another way or add a pre-step to the driver.
- `rigid_skin.py` is a library, not an entry script: G3 should give each gear piece its `script` in the kit, or a `build_gear.py` and change the default in `jobsFor`.
- `check_guard.py` and the sheet's `--guards` mode do not exist yet (G4).
- A job's py script imports (beyond `LIBS`) do not invalidate its hash; extend `LIBS` when a slice adds a shared module.
- Desktop fallback does not take `heavy.lock` itself.
