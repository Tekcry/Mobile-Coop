# visual-gate - VG4 check (baseline store, pickBaseline, accept CLI) @ ebe376eb

## Verdict: FIX

## Must-fix
1. `scripts/visual-gate/baseline.mjs:79` (accept) and `scripts/visual-gate/store.mjs:~89` (`update-index --add`): a second
   `accept` for the same run writes the same `accepted/<version>-<sha8>.json` and silently replaces the earlier record
   (narrows or drops a prior `--only` set, changes `by` / `why`). The builder lists this as an open item; it breaks
   "accept cannot overwrite silently". Fix: in `main()` before `recordAccept`, if `acceptsOf(run.sha)` is non-empty, exit 1
   with `already accepted by <by> at <at>; pass --replace to overwrite` and add a `--replace` flag to `parseArgs` (or merge
   the `only` sets); add a unit test for the refusal. `recordRun` has the same replace-on-same-sha behaviour (lower
   risk: VG7 may legitimately re-record); consider refusing an existing `runs/<sha>/result.json` unless a flag is passed.

## Verified
- Contract typedefs verbatim; exports and signatures match the brief; pickBaseline rules (renderer, version < current,
  accepted via `only`, green + ancestor, flagged/error only if accepted, tie: accepted over green then later `at`) match A8.
- `git diff 0b7f46f4 HEAD --stat -- src` empty; only the 5 brief files touched.
- storeLib has no node: imports. Plumbing: temp index in os.tmpdir removed in `finally`, never touches HEAD, index or
  working tree; push is `<commit>:refs/heads/visual-baselines` only (non-force, one ref); `--dry-run` pushes nothing. The
  only refs written locally are `refs/remotes/<remote>/visual-baselines`. No network beyond git fetch / push.
- Tests: 17 / 17 pass (`--maxWorkers=2`); `npx tsc --noEmit -p .` clean.
- Mutations (all restored with `git checkout --`, worktree clean): `>= 0` -> `> 0` on the version cutoff fails test 6;
  `if (ancestor)` -> `if (true)` fails tests 4 and 7; flipping the accepted-over-green tie-break fails test 8.

## Polish
- `acceptPath` / `isAncestorFn` use `run.sha` / `run.version` from records read off the branch without `validateRun`; run
  `validateRun` on the found run in `accept` so a corrupt record cannot produce an odd path or a `-`-leading git arg.
- `validateRun` allows `/` and `..` in shot keys (thumb path `thumbs/<key>.webp`); git rejects `..` paths, but reject
  keys containing `/` or `..` in `validateRun` for a clear error.
- `parseArgs`: `--why --dry-run` consumes the flag as the value; reject a value starting with `--`.
- On a non-race push failure (auth, no remote) `writeFiles` retries 5 times with no delay; harmless, but slow to fail.
