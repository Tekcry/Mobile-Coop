# Process: changelog fragments and a merge-train script
kind: patch
- Changelog fragments: each PR adds one `changes/<branch>.md` (`# title`, optional `kind: minor|patch`, the entries)
  instead of a "## Unreleased - <job>" block in `CHANGELOG.md`, so merges stop conflicting there.
  `scripts/changelog-assemble.mjs <version> <title> <date> <PR> [members...]` writes them as one released section at
  the version step, folds any legacy "Unreleased" blocks on top (dropping ones already released) and deletes the
  fragments. Format: `changes/README.md`.
- `scripts/merge-train.mjs`: `build <n> <branch>...` makes `train/<n>` from origin/master and the branches (CHANGELOG /
  fragment conflicts resolved keeping both sides; a branch with any other conflict is left out and listed);
  `release <n> <version> "<title>"` and `single <branch> <version> "<title>"` merge master in, open the train PR,
  assemble the changelog, set the version, push and wait for CI on that exact commit, and only on a pass merge, tag and
  move `dev` (exit 2 on red CI with the failing log tail, 3 on a source conflict). `--dry-run` moves nothing.
- Tests: `tests/changelogAssemble.test.ts`, `tests/mergeTrain.test.ts` (tool only, no game change).
