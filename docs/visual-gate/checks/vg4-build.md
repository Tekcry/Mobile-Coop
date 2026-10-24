# visual-gate - VG4 build report (baseline store, pickBaseline, accept CLI)

Builder: Night Shift | Cloud Builder 1 (Opus 5.5), 2026-10-24, on `feature/visual-gate-vg4` cut from
`feature/visual-gate` @ 0b7f46f4. Cloud rules: unit tests only, no e2e, GPU, build or `npm run check`.

## Verdict: done

## Built
- `scripts/visual-gate/storeLib.mjs` (pure: no `node:` imports, no git, no fs). The brief's contract typedefs verbatim
  at the top. Exports `BRANCH`, `shotKey`, `cmpSemver`, `validateRun`, `runPaths`, `acceptRecord`, `acceptPath`,
  `pickBaseline`, `parseArgs` with the brief's signatures.
- `scripts/visual-gate/store.mjs` (git I/O, every function takes `{ cwd, remote }`): `fetchStore`, `readRecords`,
  `writeFiles`, `isAncestorFn`, `recordRun`, `recordAccept`. Plumbing copied from `scripts/laptop-queue/request.mjs`
  (temp index in `os.tmpdir()` removed in `finally`, `read-tree` parent or `--empty`, `hash-object -w --stdin`,
  `update-index --cacheinfo`, `write-tree`, `commit-tree` with the remote-tracking ref as parent or orphan, push with
  5 tries and a refetch + rebuild between, refetch after). Never touches HEAD, the worktree index or the working tree.
- `scripts/visual-gate/baseline.mjs` (CLI): `list | show <sha> | accept --sha <sha> --by <name> --why <text>
  [--only k,k] [--dry-run]`; fetches first; `main()` only when executed directly (also exports `main`, `findRun`).
- `tests/visualGateStore.test.ts` (vitest, node env).

## Deviations from the brief (all small; why)
1. `readRecords` reads every blob in ONE `git cat-file --batch` instead of one `git show` per file: same result, one
   process instead of hundreds once the branch holds many runs (process spawn is slow on Windows). An unparseable JSON
   file is skipped with a warning rather than failing the whole gate.
2. `isAncestorFn` returns false (not a throw) when the sha's commit is not in the local object store: such a commit
   cannot be an ancestor of the local `refs/remotes/<remote>/master`, and a recorded run from a train or PR branch that
   was never fetched must not crash `pickBaseline`. Exit 1 -> false, exit 0 -> true, any other exit still throws
   (e.g. a missing master ref).
3. `acceptRecord` also throws `--only is empty` for `only: []` (an accept covering nothing is a no-op record).
4. `validateRun` accepts a record with `rigs` absent (treated as `[]`); when present it must be an array of objects with
   string keys. It also reports a shot without a string key.
5. `parseArgs`: `show` without exactly one sha, a flag without a value, or an unknown flag -> 'help'. The CLI prints the
   usage and exits 0 for `help` / `--help` / `-h` / no args, 1 for anything unknown.
6. `pickBaseline` skips a stored run with a malformed version (instead of throwing) and throws only when the CURRENT
   `version` is malformed. It calls `isAncestor` at most once per run and only for green runs not covered by an
   accept. When a run has several accept records, the latest `at` gives the approver.
7. `findRun` (CLI): a prefix shorter than 7 or not hex finds nothing (`no recorded run for that sha`); an ambiguous
   prefix exits 1 naming the matches.

## Tests: `npx vitest run tests/visualGateStore.test.ts --maxWorkers=2`: 1 file, 17 / 17 pass (~0.7 s)
Pure: shotKey + BRANCH; cmpSemver (4.97.0 < 4.97.1 < 4.100.0, malformed throws); validateRun (good -> [], bad sha,
duplicate key, empty renderer, bad version, bad verdict, keyless shot, null); runPaths (result + raw-key webp);
acceptRecord (null run, blank why, blank by, unknown only key, good copies sha / version, acceptPath); pickBaseline
cases (1)-(8) from the brief plus rig keys and an unaccepted error run; parseArgs (each command, `--only a,b`,
`--dry-run`, unknown / incomplete -> help).
I/O (temp bare remote + work repo under `os.tmpdir()`, removed in `afterAll`, `commit.gpgsign false` per repo): dry run
returns a commit and the remote has no `visual-baselines`; first `recordRun` creates the orphan branch (no parent) with
the thumb blob byte-exact; second `recordRun`'s parent is the first; a bad record throws; `readRecords` returns both
runs; `recordAccept` parents on the second and reads back; `isAncestorFn` true for master, false for the orphan data
commit and for an unknown sha; `pickBaseline` over the read records; work repo `status --porcelain` empty, HEAD sha,
branch and `ls-files` unchanged. `readRecords` on a remote without the branch -> empty Records.

## Checks
- `npx tsc --noEmit -p tsconfig.json`: clean (exit 0). Used instead of `npm run typecheck:fast` because other builders
  share this checkout's `node_modules` by symlink.
- `npx eslint tests/visualGateStore.test.ts`: clean. (`scripts/**/*.mjs` is ignored by the eslint config.)
- `node --check` on the three scripts: ok. Extra: `tsc --checkJs --strict --noUncheckedIndexedAccess` over the three
  scripts: clean.

## CLI outputs
```
$ node scripts/visual-gate/baseline.mjs list            (worktree, origin has no visual-baselines)
no recorded runs (origin/visual-baselines absent or empty)      <- stderr; stdout empty
exit 0
$ node scripts/visual-gate/baseline.mjs accept --sha 0000000 --by x --why y --dry-run
no recorded run for that sha
exit 1
$ git ls-remote origin visual-baselines
(nothing)
```
Manual CLI run against a temp remote (two recorded runs, not committed as a test):
```
$ baseline.mjs list
4.96.0  76a1d847  green  R1  2026-10-24T10:00:00Z
4.97.0  ffffffff  flagged  R1  2026-10-24T11:00:00Z
$ baseline.mjs accept --sha fffffff --by Michael --why "new lamp" --only b@low
accepted/4.97.0-ffffffff.json
fc0738ab32c0599259eebd7498fa84218dd65c99
$ baseline.mjs accept --sha fffffff --by Michael --why x --only zz@low     -> unknown key zz@low, exit 1
$ baseline.mjs accept --sha fffffff --by Michael --why " " --dry-run      -> --why is empty, exit 1
$ baseline.mjs show ffffffff
run ffffffffffffffffffffffffffffffffffffffff  4.97.0  train/1  train 1  2026-10-24T11:00:00Z
renderer R1
verdict flagged  flags 1  shots 2  rigs 0
accepted by Michael at 2026-10-24T11:56:24.223Z (only b@low): new lamp
```

## Files touched
`scripts/visual-gate/storeLib.mjs`, `scripts/visual-gate/store.mjs`, `scripts/visual-gate/baseline.mjs`,
`tests/visualGateStore.test.ts`, `docs/visual-gate/checks/vg4-build.md` (all new). Nothing pushed; no
`visual-baselines` on origin.

## Open items
- VG5: a RunRecord must pass `validateRun` (40-hex lowercase sha, `x.y.z` version, verdict green / flagged / error,
  non-empty renderer, unique keys across `shots` + `rigs`); keys via `shotKey(id, preset, rigState)`. Thumbs go to
  `recordRun(rec, { [key]: Uint8Array })` only for flagged shots and their baselines (A11). The renderer string must be
  identical run to run for `pickBaseline` to match (normalise it, e.g. the unmasked GPU string).
- VG6: call `fetchStore()` then `readRecords()` and `pickBaseline(records, { isAncestor: isAncestorFn(), renderer,
  version })` where `version` is the train's version (runs at that version or above are excluded); keys absent from the
  result report `new`. `refs/remotes/origin/master` must be fetched first for `isAncestorFn`. Record with `recordRun`
  only on train runs (`--record`); thumbnail URLs must URL-encode the `@` in the key.
- VG7: the first `recordRun` creates the orphan `visual-baselines` on origin; then `baseline.mjs accept --sha <run>
  --by orchestrator --why initial`. A second accept of the same run overwrites `accepted/<version>-<sha8>.json` (one
  accept record per run; re-run accept with the full `--only` set if widening).
- `writeFiles` sets a fallback git identity (`visual-gate`) only when `user.email` is unset, and honours the repo's
  `commit.gpgsign` (the laptop does not sign).

## Fix round (Opus 5.5, 2026-10-24, after `checks/vg4-check.md` FIX @ ebe376eb)

### Must-fix: no silent replace
- `baseline.mjs accept`: after `acceptRecord`, if `acceptsOf(run.sha)` is non-empty and `--replace` is absent, exit 1 with
  `already accepted by <by> at <at>; pass --replace to overwrite` (the latest prior accept); `--dry-run` is refused the
  same way. With `--replace` it prints `replacing the accept by <by> at <at>` to stderr and overwrites.
  `parseArgs` gains `--replace` (`replace: boolean` in its result, default false). `main(argv, opts)` takes optional
  `{ cwd, remote }` so the test drives the CLI against the temp repo.
- Defence in depth in `store.mjs`: `writeFiles` takes `noReplace: string[]`, paths that must not exist on the parent; it
  is checked (`git ls-tree` on the parent) on every build and rebuild, so a record pushed by another machine between push
  tries is refused rather than overwritten. `recordAccept(a, { replace })` passes its accept path, throwing
  `accepted/<v>-<sha8>.json already exists; pass --replace to overwrite`.
- `recordRun(rec, thumbs, { replace })` refuses an existing `runs/<sha>/result.json`: `run <sha8> is already recorded;
  pass replace: true to overwrite`. Its own option, not a CLI flag: `recordRun` has no CLI (VG6 / VG7 call it), and the
  name matches `recordAccept`'s so callers learn one word. VG7 passes `replace: true` only when it deliberately re-records
  the same train commit.

### Polish taken
- `acceptRecord` runs `validateRun` on the found run (`recorded run is invalid: ...`), so a corrupt record read off the
  branch cannot produce an odd accept path or a `-`-leading git argument.
- `validateRun` reports a shot / rig key containing `/`, `\` or `..` (`\` added beside the check's `/` and `..`: on
  Windows it is a separator too); `runPaths` throws on such a thumb key.
- `parseArgs` refuses a flag value starting with `--` (`--why --dry-run` -> help); a single `-x` value stays legal.
- Not taken: the 5 undelayed push retries on a non-race failure (polish 4, slow to fail, harmless).

### Tests: `npx vitest run tests/visualGateStore.test.ts --maxWorkers=2`: 1 file, 20 / 20 pass (15.6 s with desktop CPU ~85-95%)
New: key safety (`/`, `\`, `..` in shots and rigs, `a.b@low` still fine, runPaths thumb keys); acceptRecord on a corrupt
run (version `-p`, bad sha, `../` key); parseArgs `--replace` and `--`-prefixed values; I/O: a second `recordRun` of the
same sha throws (also in dry run) and leaves the remote head, `replace: true` overwrites; CLI accept, then a second
accept (plain and `--dry-run`) exits 1 with the exact message and leaves the first record (`only`, `by`, `why`) and the
remote head unchanged, `--replace` overwrites; library `recordAccept` on an existing path throws; CLI accept of a
corrupt run written to the branch exits 1 and writes nothing; work repo stays clean.

### Checks
- `npx tsc --noEmit -p .`: clean (exit 0).
- `tsc --ignoreConfig --checkJs --strict --noUncheckedIndexedAccess` over the three scripts: clean.
- `npx eslint tests/visualGateStore.test.ts`: clean. `node --check` on the three scripts: ok.

### Files touched
`scripts/visual-gate/storeLib.mjs`, `scripts/visual-gate/store.mjs`, `scripts/visual-gate/baseline.mjs`,
`tests/visualGateStore.test.ts`, this report. Zero `src/` diff. Nothing pushed to `visual-baselines`.

### Open items (update)
- VG7: the earlier note "a second accept of the same run overwrites" no longer holds: it is refused; widen an accept with
  `accept ... --only <full set> --replace` (or no `--only`). Re-recording a run needs `recordRun(..., { replace: true })`.
