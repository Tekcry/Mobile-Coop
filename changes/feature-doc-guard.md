# Doc guard
kind: patch
- `npm run lint` also runs the doc lint (`scripts/doc-lint.mjs`, so CI's `lint` and `check` run it): stale terms
  (`docs/stale-terms.json`), G citations (missing or replaced entries cited as current), broken links and repo paths,
  key rules restated outside their owner file (`docs/doc-owners.json`), size budgets, and appended "Note 2026-" lines
  in the design bible. Errors fail CI; warnings print.
- A job's final PR carries a `Job-done: <job>` line; the train's version commit then moves `docs/<job>/` to
  `docs/archive/<job>/` and fixes the links to it.
- `scripts/prune-merged.mjs` lists (and with `--apply` removes) idle merged worktrees and merged branches older than
  7 days; `scripts/prune-task.ps1` registers it as a weekly task.
- `docs/RULES.md` "Docs": the doc map, one home per rule, folds rewrite in place, the drift audit, doc lint, the weekly
  prune and `Job-done:`.
