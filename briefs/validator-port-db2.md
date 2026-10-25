status: done feature/validator-port-measure-cli 1fb4fa18
# J12 validator-port, docs slice D-B2 (Sonnet): docs for PR B2 (measure CLI + sheet rows)

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3).

- Base: origin/feature/validator-port-measure-cli at 258e8cd3b (S2 + S7a merged, both checker PASS). Work ON that
  branch (no new branch): `git checkout feature/validator-port-measure-cli` tracking origin; push each sub-step there.
- Read first: `docs/systems/agent-preamble.md` (origin/master); PLAN `git show origin/feature/validator-port:docs/validator-port/PLAN.md`
  row D-B2 (line ~117), slices S2 (~:181) and S7a (~:197); the S2 checker's polish
  (`C:/NightShift/scratch/marlow/j12-s2-check.md` is on the desktop, not available to you: its points are below).
- Only files to edit: `docs/systems/testing-tools.md` (a short section on the measure CLI `scripts/level-measure.mjs`:
  what it measures, `--write`, `--check`, `--points` (one map per call; works with `--check`, not `--write`),
  `--flags key=value` (typed by the key's current value, repeatable, unknown key exits 2), merged per-map files and
  `ways_back`; keep it plain English, hyphens not em dashes, point to the PLAN rather than restating rules), and ONE
  changelog fragment `changes/feature-validator-port-measure-cli.md` (kind: patch): fold the text of
  `changes/feature-validator-port-s7a.md` into it and delete that file (one fragment per PR, `changes/README.md`).
- S2 checker polish to mention in the doc where true: `--points` takes one map per call; `--flags` on a text key such
  as `mode` does not check allowed values.
- Checks: `node scripts/doc-lint.mjs` (0 errors on your files), `npx vitest run tests/changesFragments.test.ts`.
- Report: append what changed; set `status: done feature/validator-port-measure-cli <sha>`.

## Report (Night Shift | Cloud Builder 3, Sonnet builder, 2026-10-26 ~00:05)
Pushed on `feature/validator-port-measure-cli` (fast-forward 258e8cd3 -> 1fb4fa18), 3 files, +53 / -9.
- `docs/systems/testing-tools.md` :519-553, new section "Measure CLI (`scripts/level-measure.mjs`)" between "Helper
  scripts" and "Laptop queue": what it measures; `ways_back` (campaign graphs only, co-op link kinds); the default run
  and `--doors shut`; per-map merge (`--write` patches only each file's own `measured` members, a second `--write`
  changes no byte); `--write`; `--check` (target misses, drift tolerances 0.05 and 1.5 s, "no stored measured" only a
  note); `--points` (one map per call; with `--check`, not `--write`); `--flags` (typed by the key's current type,
  repeatable, unknown key exits 2, a text key such as `mode` (or `net`) does not check allowed values); exit codes and
  the two test files. Points to "the validator-port PLAN" (sections 7 and 8) by name: a backticked path to
  `docs/validator-port/PLAN.md` fails doc lint's link check on this branch (the file is not on it). Notes the CLI is not
  in `package.json` yet (S5 owns that).
- `changes/feature-validator-port-measure-cli.md` (kind: patch): one bullet for the measure CLI + the three S7a bullets
  verbatim; `changes/feature-validator-port-s7a.md` removed (`git rm`).
- Checks: `node scripts/doc-lint.mjs` 0 errors, 19 warnings (one on testing-tools.md :614, pre-existing, the Laptop
  queue section's port line); `tests/changesFragments.test.ts` 1 passed. CLI spot checks: `--points` with `--write`
  exits 2 ("combines with --check, not with --write"), `--points` over 2+ maps exits 2, `--flags nosuch=1` exits 2.
- Code vs brief: `mode` defaults to `null` in `src/core/flags.ts` (not a string), so `--flags mode=...` takes the text
  as is (a lone true / false or number-like value is read as such); string keys such as `net` also take text unchecked;
  the doc says so. Stale line left for D-C: the `level-validate.mjs` bullet in testing-tools.md still says the measure
  step "(V6, later) will write `measured` values".
