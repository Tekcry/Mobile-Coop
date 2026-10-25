status: open
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
