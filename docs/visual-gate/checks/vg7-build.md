# VG7 build report (noise + bootstrap)

Builder: cloud builder (Opus 5.5), branch `feature/visual-gate-vg7` cut from `feature/visual-gate` @ d1e45ddc (VG5 and
VG1 polish merged there). Brief: `docs/visual-gate/briefs/VG7.md`; BRIEF A13, A24-A30. Phase 2 appends below.

## Phase 1 (tools)

### Built
- `scripts/visual-gate/noiseLib.mjs` (pure; imports only `./metrics.mjs` and `./gate.mjs`): `STATS`, `K_SIGMA` (4),
  `sd`, `spreadOf`, `tolerancesFrom`, `selfCompare`, `noisy`, `renderTolerances`, `PROOF_TARGETS`, `proofRows`,
  `parityFor`, `renderProof`, plus `expandTargets` and `idOfKey` (deviation 3).
- `scripts/visual-gate/noise.mjs` (CLI, `main()` only when run directly): `spread <runs...> [--out] [--md]` and
  `proof --fn <Fn> --bad <json> [--fixed <json>] [--bad-label] [--fixed-label]`. Spread refuses (exit 1) fewer than 2
  runs and runs whose sha or renderer differ; proof exits 0 (a report), usage errors 2.
- `scripts/visual-gate/push-results.mjs` (CLI + exported `pushFolder`): git plumbing copied from store.mjs
  `writeFiles` (soft fetch into `refs/remotes/<remote>/<branch>`, temp index in `os.tmpdir()` removed in `finally`,
  `read-tree` of the tracking ref or `--empty`, `hash-object -w --stdin` per file, `update-index --add --cacheinfo`,
  `write-tree`, `commit-tree` parented or orphan, push with 5 tries and refetch + rebuild between). Refuses a branch not
  matching `^shots/visual-gate-[a-z0-9.-]+$`, a bad prefix, a missing or empty folder, a file over 50 MB, a total over
  150 MB. Returns `{ commit, files, bytes }`; CLI prints `pushed <files> files (<MB> MB) to <branch> <commit8> under <prefix>/`.
- `tests/visualGateNoise.test.ts`: 12 tests (fixtures of 3 runs built in the test; viewpoints.mjs imported only for the
  PROOF_TARGETS check; push tests on a bare remote + work repo under `os.tmpdir()`, removed in `afterAll`).

### Deviations (and why)
1. Rounding up: `Math.ceil(x * 1e4 - 1e-6) / 1e4` instead of the bare `Math.ceil(x * 1e4) / 1e4`. The 1e-6 slack (in
   1e-4 units, i.e. 1e-10 in value) absorbs float residue, so 4 x an sd of 0.02 that computes as 0.0800000000000001
   stays 0.08 (the brief's own "sd 0.02 -> meanAbs 0.08" case); 0.08000001 still goes to 0.0801 (tested).
2. `sd` is computed shifted by the first value, so equal values give exactly 0 (the plain two-pass formula left
   8.5e-18 on three equal 0.05s). Same maths otherwise (sample sd, n - 1; 0 for n < 2).
3. Additive exports: `expandTargets(fn, items)` and `idOfKey(key)` in noiseLib (F6's view list must come from
   viewpoints.mjs at call time, so `PROOF_TARGETS.F6` holds wildcard entries `m-*@epic` / `m-*@low` that
   `expandTargets` turns into the `m-*` view ids; `proofRows` uses it). noise.mjs also exports `parseArgs`,
   `spreadReport`, `main`; push-results.mjs exports `listFiles`, `parseArgs`, `main`, `MAX_FILE_BYTES`, `MAX_TOTAL_BYTES`.
4. Target notes: the F5b `so-door-on` control entries carry `note: 'control: expected green'` and F7's
   `m-a3-lobby@epic` entries `note: 'reference'`; `proofRows` appends the note to the row's `note` (ProofRow shape unchanged).
5. `spreadOf`: rig `off` keys are measured like views (the gate's drift compares them too); `leak.*` only on keys
   whose metrics carry `leak` (the on keys). A named region absent from a run (the gate skipped it behind / small) is
   listed `thin` like an n < 1500 region. Missing reasons: `<key>: not in run <i>`, `<key>: error in run <i>: <error>`,
   `<key> <region>: thin`, `<id>: skipped (<skip>) in run <i>`, `<id>: not in run <i>`. Meter rows also need
   `skip === null` in every run (the brief's "a row skipped ... in any run -> missing").
6. `proofRows`: `drift` is null for `leak.*` rows (compare never compares leak: absolute rules only) and when either
   side has no metrics. With a fixed run, missing-value notes are prefixed `bad: ` / `fixed: ` (`bad: region skipped:
   small`); with `fixed` null (F5b) the bad reason is plain. `no sd` is appended when SPREAD has no entry. `spread`
   accepts either tolerances.mjs `SPREAD` (sd numbers) or a `spreadOf()` result (cells with `.sd`).
7. `renderProof(rows, parity, o)`: `parity` is `{ bad?: ParityRow[], fixed?: ParityRow[] }`; the run column shows
   the labels. Columns: dir `ok` / `wrong`, separates and drift `yes` / `no`, `-` for null; summary counts are plain
   (`rule red on bad 1, green on fixed 2`).
8. `pushFolder` refuses more than the brief lists (conservative): `..` anywhere in the branch (git refuses it anyway);
   a prefix that is empty, contains `\`, starts with a drive letter, or has an empty or `.` segment (a trailing `/` is
   trimmed). The anonymous identity (`visual-gate (laptop)` / `visual-gate@localhost`) is used when `user.name` OR
   `user.email` is empty (the brief says user.name; commit-tree also fails without an email). Symbolic links are not
   followed. `update-index --cacheinfo` runs in batches of 100 files (keeps a cmd.exe command line far under 32k chars).
9. `noise.mjs proof`: a `--bad` / `--fixed` file that does not exist is a usage error (exit 2); the WARN for an absent
   tolerances.mjs (`WARN tolerances.mjs absent (VG7 phase 2 not run): floors used, sd null`) goes to stdout above the
   report. `spread --md` writes each printout section as `### <section>` with one bullet per line. The runs line's wall
   is `summary.wallS` (else `ms / 1000`) and errors `summary.errors` (else `runErrors` length).
10. The test file imports more than the brief's template: `pathToFileURL`, `expandTargets`, `idOfKey`, push-results
    `main`, and viewpoints `VIEWS` / `RIGS` (named by the brief for the PROOF_TARGETS check). The module check of the
    rendered tolerances runs `node --check` and a plain `node --input-type=module` import of the temp file.

### Tests and acceptance (cloud: unit tests only; no e2e, GPU, build or `npm run check`)
- `npx vitest run tests/visualGateNoise.test.ts --maxWorkers=2`: 1 file, 12 passed (1.25 s).
- `npx vitest run tests/visualGateGate.test.ts --maxWorkers=2`: 1 file, 29 passed.
- `npx vitest run tests/visualGateMetrics.test.ts --maxWorkers=2`: 1 file, 43 passed.
- `npm run typecheck:fast`: exit 0. `npx eslint tests/visualGateNoise.test.ts`: exit 0.
- `node --check` noiseLib.mjs, noise.mjs, push-results.mjs: ok.
- `node scripts/visual-gate/noise.mjs proof --fn F9 --bad x`: `noise proof: --fn must be one of F1, F2, F4, F5, F5b,
  F6, F7, F8` + usage, exit 2. `proof --fn F1` (no --bad): exit 2. `spread a.json` (1 run): exit 1.
- `node scripts/visual-gate/push-results.mjs --dir <tmp with one.json> --branch shots/visual-gate-dry --prefix t --dry-run`:
  `dry-run: would push 25c15ab7... to origin shots/visual-gate-dry`, `  t/one.json`, `dry-run: 1 files (0.00 MB) for
  shots/visual-gate-dry 25c15ab7 under t/, nothing pushed`, exit 0; `git ls-remote origin shots/visual-gate-dry`: empty.
- CLI smoke on 3 synthetic runs in scratch (outside the repo): `spread --out <scratch>/tolerances.mjs --md
  <scratch>/spread.md` exit 0, `node --check` on the output ok, self-compare `6 ordered pairs: floors 4 flags,
  tolerances 0 flags`; `proof --fn F1 --bad run3 --fixed run1` printed the table, parity rows and `F1: 0/6 rows
  separate, 2 drift, ...` (sd null: no tolerances.mjs in the repo yet), exit 0.
- `git diff --stat origin/feature/visual-gate -- src`: empty. `package.json` / lockfile unchanged.

### Files touched (phase 1)
- `scripts/visual-gate/noiseLib.mjs` (new), `scripts/visual-gate/noise.mjs` (new), `scripts/visual-gate/push-results.mjs`
  (new), `tests/visualGateNoise.test.ts` (new), `docs/visual-gate/checks/vg7-build.md` (this report).

### Open items
- For the lead: phase 1 is on `feature/visual-gate-vg7` (cloud); the laptop request copies `scripts/visual-gate` from
  `feature/visual-gate`, so this branch must be merged there and pushed before the request goes out.
- For VG8: `tolerances.mjs` exports `SPREAD = { keys: { '<key>': { '<region>.<metric>': sd } }, emd: { '<key>':
  { '<region>': sigma } }, parity: { '<id>': sd } }` (every sd, 5 decimals; an sd under 5e-6 prints 0, and the proof sep
  uses max(sd, 1e-4)). The `noisy` lines (phase 2, in VG7.md) list fields over 2 x floor and the leak (0.004 / 0.02)
  and parity (0.02) rules that 4 sd says are too tight.
- For P1-P7: `node scripts/visual-gate/noise.mjs proof --fn F8 --bad <v4.96.0 result.json> --fixed <v4.97.0 result.json>
  --bad-label v4.96.0 --fixed-label v4.97.0` (P7: `--fn F5b --bad <master run1 result.json>`, no `--fixed`). Before
  phase 2 there is no tolerances.mjs: sd is null, so `sep` / `separates` are `-`; rerun the command after phase 2 for
  the A30 verdict.
